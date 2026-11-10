import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
let currentUser = "";
vi.mock("../src/lib/auth", () => ({
  requireUser: async () => {
    if (!currentUser) throw new Error("unauthorized");
    return currentUser;
  },
}));
vi.mock("../src/lib/ai", () => ({
  askAI: async () => {
    throw new Error("aiUnavailable");
  },
}));
const enabled = process.env.RUN_DB_TESTS === "true";
describe.skipIf(!enabled)("real PostgreSQL API integration", () => {
  const prisma = new PrismaClient();
  let extra = "";
  let first = "",
    second = "",
    subject = "",
    task = "",
    event = "";
  let handler: typeof import("../src/app/api/workspace/route");
  const post = async (body: unknown) => {
    const res = await handler.POST(
      new Request("http://localhost:3000/api/workspace", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, data: await res.json() };
  };
  beforeAll(async () => {
    handler = await import("../src/app/api/workspace/route");
    const stamp = Date.now();
    first = (
      await prisma.user.create({
        data: {
          name: "Test A",
          email: `test-a-${stamp}@example.com`,
          passwordHash: "test-only",
          settings: { create: { studyDays: [0, 1, 2, 3, 4, 5, 6] } },
        },
      })
    ).id;
    second = (
      await prisma.user.create({
        data: {
          name: "Test B",
          email: `test-b-${stamp}@example.com`,
          passwordHash: "test-only",
          settings: { create: {} },
        },
      })
    ).id;
    currentUser = first;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [first, second, extra] } },
    });
    await prisma.$disconnect();
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  });
  it("creates a subject and task and persists both", async () => {
    expect(
      (
        await post({
          action: "saveSubject",
          data: { name: "Mathematics", color: "#6366f1" },
        })
      ).status,
    ).toBe(200);
    subject = (
      await prisma.subject.findFirstOrThrow({ where: { userId: first } })
    ).id;
    expect(
      (
        await post({
          action: "saveTask",
          data: {
            title: "Problem set",
            subjectId: subject,
            deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
            estimatedMinutes: 90,
          },
        })
      ).status,
    ).toBe(200);
    task = (await prisma.task.findFirstOrThrow({ where: { userId: first } }))
      .id;
  });
  it("rejects foreign task edits, deletes and subject references", async () => {
    currentUser = second;
    expect(
      (await post({ action: "taskStatus", id: task, status: "COMPLETED" }))
        .status,
    ).toBe(404);
    expect((await post({ action: "deleteTask", id: task })).status).toBe(404);
    expect(
      (
        await post({
          action: "saveTask",
          data: {
            title: "Foreign",
            subjectId: subject,
            deadline: new Date(Date.now() + 86400000).toISOString(),
            estimatedMinutes: 30,
          },
        })
      ).status,
    ).toBe(404);
    currentUser = first;
  });
  it("updates task and safely detaches it when a subject is deleted", async () => {
    expect(
      (await post({ action: "taskStatus", id: task, status: "IN_PROGRESS" }))
        .status,
    ).toBe(200);
    expect((await post({ action: "deleteSubject", id: subject })).status).toBe(
      200,
    );
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task } })).subjectId,
    ).toBeNull();
  });
  it("creates a real plan without duplicated planned work", async () => {
    const start = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Almaty",
      }).format(new Date()),
      end = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Almaty",
      }).format(new Date(Date.now() + 3 * 86400000));
    const r = await post({ action: "generatePlan", data: { start, end } });
    expect(r.status).toBe(200);
    expect(r.data.result.totalMinutes).toBe(90);
    expect(
      (await post({ action: "generatePlan", data: { start, end } })).data.result
        .totalMinutes,
    ).toBe(0);
    expect(
      await prisma.studySession.count({
        where: { userId: first, kind: "study" },
      }),
    ).toBeGreaterThan(0);
  });
  it("rejects overlapping events and early session completion", async () => {
    const s = await prisma.studySession.findFirstOrThrow({
      where: { userId: first, kind: "study" },
    });
    expect(
      (
        await post({
          action: "saveEvent",
          data: {
            title: "Overlap",
            start: s.start.toISOString(),
            end: s.end.toISOString(),
          },
        })
      ).data.error,
    ).toBe("overlap");
    expect(
      (
        await post({
          action: "saveSession",
          id: s.id,
          data: {
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            completed: true,
          },
        })
      ).data.error,
    ).toBe("notFinished");
  });
  it("creates, updates and deletes personal events", async () => {
    const start = new Date(Date.now() + 10 * 86400000),
      end = new Date(+start + 3600000);
    expect(
      (
        await post({
          action: "saveEvent",
          data: {
            title: "Test event",
            start: start.toISOString(),
            end: end.toISOString(),
          },
        })
      ).status,
    ).toBe(200);
    event = (
      await prisma.calendarEvent.findFirstOrThrow({ where: { userId: first } })
    ).id;
    expect(
      (
        await post({
          action: "saveEvent",
          id: event,
          data: {
            title: "Updated event",
            start: start.toISOString(),
            end: end.toISOString(),
          },
        })
      ).status,
    ).toBe(200);
    expect((await post({ action: "deleteEvent", id: event })).status).toBe(200);
  });
  it("does not count skipped or unfinished focus sessions", async () => {
    const r = await post({ action: "startFocus", duration: 25, taskId: task });
    expect(r.status).toBe(200);
    expect(
      (
        await post({
          action: "finishFocus",
          id: r.data.focus.id,
          complete: true,
        })
      ).data.error,
    ).toBe("notFinished");
    expect(
      (
        await post({
          action: "finishFocus",
          id: r.data.focus.id,
          complete: false,
        })
      ).status,
    ).toBe(200);
    expect(
      await prisma.focusSession.count({
        where: { userId: first, completed: true },
      }),
    ).toBe(0);
  });
  it("completes and reopens tasks with correct timestamps", async () => {
    await post({ action: "taskStatus", id: task, status: "COMPLETED" });
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task } }))
        .completedAt,
    ).not.toBeNull();
    await post({ action: "taskStatus", id: task, status: "TODO" });
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task } }))
        .completedAt,
    ).toBeNull();
  });
  it("rejects unauthenticated and cross-origin writes", async () => {
    currentUser = "";
    expect((await post({ action: "deleteTask", id: task })).status).toBe(401);
    currentUser = first;
    const res = await handler.POST(
      new Request("http://localhost:3000/api/workspace", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: JSON.stringify({ action: "deleteTask", id: task }),
      }),
    );
    expect(res.status).toBe(401);
  });
  it("registers securely, rejects duplicates and consumes reset links once", async () => {
    const { POST } = await import("../src/app/api/public/route");
    const request = (body: unknown) =>
      POST(
        new Request("http://localhost:3000/api/public", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
      );
    const input = {
      action: "register",
      name: "Reset Test",
      email: `reset-${Date.now()}@example.com`,
      password: "OriginalPassword123",
      confirmPassword: "OriginalPassword123",
      year: 1,
    };
    expect((await request(input)).status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: input.email },
    });
    extra = user.id;
    expect(user.passwordHash).not.toBe(input.password);
    expect(await compare(input.password, user.passwordHash)).toBe(true);
    expect((await (await request(input)).json()).error).toBe("emailTaken");
    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        userId: extra,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expires: new Date(Date.now() + 60000),
      },
    });
    const reset = { action: "reset", token, password: "NewPasswordSecure123" };
    expect((await request(reset)).status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: extra },
    });
    expect(updated.sessionVersion).toBe(1);
    expect(await compare(reset.password, updated.passwordHash)).toBe(true);
    expect((await (await request(reset)).json()).error).toBe("invalidToken");
  });
  it("preserves notification tombstones to deduplicate dismissed reminders", async () => {
    const notice = await prisma.notification.create({
      data: {
        userId: first,
        key: `test:${first}`,
        title: "Reminder",
        type: "deadline",
      },
    });
    expect(
      (await post({ action: "deleteNotification", id: notice.id })).status,
    ).toBe(200);
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: notice.id },
        })
      ).dismissed,
    ).toBe(true);
  });
  it("password-confirmed deletion cascades only the requested account", async () => {
    currentUser = extra;
    expect(
      (await post({ action: "deleteAccount", password: "WrongPassword123" }))
        .data.error,
    ).toBe("invalidPassword");
    expect(
      (
        await post({
          action: "deleteAccount",
          password: "NewPasswordSecure123",
        })
      ).status,
    ).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: extra } })).toBeNull();
    expect(
      await prisma.user.findUnique({ where: { id: first } }),
    ).not.toBeNull();
    currentUser = first;
  });
  it("returns the latest 100 chat messages in chronological order", async () => {
    const chat = await prisma.aIChat.create({ data: { userId: first } });
    const base = Date.now() - 200000;
    await prisma.aIMessage.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        chatId: chat.id,
        role: "user",
        source: "user",
        content: `message-${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    });
    const { getData } = await import("../src/lib/data");
    const result = await getData(first);
    expect(result.messages).toHaveLength(100);
    expect(result.messages[0].content).toBe("message-5");
    expect(result.messages[99].content).toBe("message-104");
    expect(typeof result.aiConfigured).toBe("boolean");
  });
});
