import { describe, it, expect } from "vitest";
import {
  schedule,
  priorityScore,
  deadlineRisk,
  dayKey,
  overlaps,
  type Work,
  type Preferences,
} from "../src/lib/scheduling";
import { formatInTimeZone } from "date-fns-tz";
const now = new Date("2026-11-09T03:00:00Z");
const prefs: Preferences = {
  timezone: "Asia/Almaty",
  startTime: "09:00",
  endTime: "18:00",
  dailyMinutes: 180,
  sessionMinutes: 50,
  breakMinutes: 10,
  studyDays: [1, 2, 3, 4, 5],
};
const task = (overrides: Partial<Work> = {}): Work => ({
  id: "a",
  title: "Assignment",
  deadline: new Date("2026-11-13T13:00:00Z"),
  priority: "MEDIUM",
  difficulty: "MEDIUM",
  estimatedMinutes: 120,
  ...overrides,
});
describe("intelligent scheduling", () => {
  it("counts completed study against the daily budget without counting personal events as study", () => {
    const existing = [
      {
        start: new Date("2026-11-09T04:00Z"),
        end: new Date("2026-11-09T05:00Z"),
        kind: "study",
        completed: true,
      },
      {
        start: new Date("2026-11-09T06:00Z"),
        end: new Date("2026-11-09T07:00Z"),
      },
    ];
    const r = schedule(
      [task({ estimatedMinutes: 200 })],
      { ...prefs, dailyMinutes: 90 },
      existing,
      "2026-11-09",
      "2026-11-09",
      new Date("2026-11-09T05:00Z"),
    );
    expect(r.totalMinutes).toBe(30);
    expect(r.unscheduled[0].minutes).toBe(170);
  });
  it("prioritizes urgent and important tasks", () => {
    expect(
      priorityScore(
        task({ deadline: new Date(+now + 3600000), priority: "HIGH" }),
        now,
      ),
    ).toBeGreaterThan(priorityScore(task(), now));
  });
  it("splits work, inserts breaks and balances daily workload", () => {
    const r = schedule(
      [task({ estimatedMinutes: 300 })],
      prefs,
      [],
      "2026-11-09",
      "2026-11-13",
      now,
    );
    const study = r.sessions.filter((s) => s.kind === "study");
    expect(r.totalMinutes).toBe(300);
    expect(r.unscheduled).toEqual([]);
    expect(study.every((s) => (+s.end - +s.start) / 60000 <= 50)).toBe(true);
    expect(r.sessions.some((s) => s.kind === "break")).toBe(true);
    const days = new Set(study.map((s) => dayKey(s.start, prefs.timezone)));
    expect(days.size).toBeGreaterThan(1);
  });
  it("never overlaps commitments or inserts sessions in the past", () => {
    const fixed = {
      start: new Date("2026-11-09T04:00Z"),
      end: new Date("2026-11-09T06:00Z"),
    };
    const r = schedule(
      [task()],
      prefs,
      [fixed],
      "2026-11-09",
      "2026-11-09",
      now,
    );
    for (const s of r.sessions) {
      expect(s.start >= now).toBe(true);
      expect(overlaps(s, fixed)).toBe(false);
    }
    for (let i = 1; i < r.sessions.length; i++)
      expect(overlaps(r.sessions[i - 1], r.sessions[i])).toBe(false);
  });
  it("enforces timezones, available weekdays, hours and daily caps", () => {
    const r = schedule(
      [task({ estimatedMinutes: 900 })],
      prefs,
      [],
      "2026-11-09",
      "2026-11-15",
      now,
    );
    const used = new Map<string, number>();
    for (const s of r.sessions) {
      expect(
        formatInTimeZone(s.start, prefs.timezone, "HH:mm") >= "09:00",
      ).toBe(true);
      expect(formatInTimeZone(s.end, prefs.timezone, "HH:mm") <= "18:00").toBe(
        true,
      );
      expect(
        Number(formatInTimeZone(s.start, prefs.timezone, "i")),
      ).toBeLessThan(6);
      if (s.kind === "study") {
        const key = dayKey(s.start, prefs.timezone);
        used.set(key, (used.get(key) ?? 0) + (+s.end - +s.start) / 60000);
      }
    }
    expect([...used.values()].every((v) => v <= 180)).toBe(true);
  });
  it("reports impossible and overdue work honestly", () => {
    const t = task({
      deadline: new Date("2026-11-09T04:30Z"),
      estimatedMinutes: 400,
    });
    const r = schedule([t], prefs, [], "2026-11-09", "2026-11-13", now);
    expect(r.unscheduled[0].minutes).toBeGreaterThan(0);
    expect(r.sessions.every((s) => s.end <= t.deadline)).toBe(true);
    const expired = schedule(
      [task({ deadline: new Date(+now - 1) })],
      prefs,
      [],
      "2026-11-09",
      "2026-11-09",
      now,
    );
    expect(expired.totalMinutes).toBe(0);
  });
  it("subtracts already recorded and already scheduled study time", () => {
    const t = task({ recordedMinutes: 40 });
    const r = schedule(
      [t],
      prefs,
      [
        {
          start: new Date("2026-11-09T07:00Z"),
          end: new Date("2026-11-09T07:30Z"),
          taskId: t.id,
          kind: "study",
          completed: false,
        },
      ],
      "2026-11-09",
      "2026-11-13",
      now,
    );
    expect(r.totalMinutes).toBe(50);
  });
  it("has deterministic results and handles zero-minute tasks", () => {
    expect(
      schedule([task()], prefs, [], "2026-11-09", "2026-11-13", now),
    ).toEqual(schedule([task()], prefs, [], "2026-11-09", "2026-11-13", now));
    expect(
      schedule(
        [task({ estimatedMinutes: 0 })],
        prefs,
        [],
        "2026-11-09",
        "2026-11-13",
        now,
      ).sessions,
    ).toEqual([]);
  });
  it("detects high deadline risk based on real capacity", () => {
    expect(
      deadlineRisk(task({ estimatedMinutes: 2000 }), prefs, [], now).level,
    ).toBe("HIGH");
    expect(
      deadlineRisk(task({ estimatedMinutes: 30 }), prefs, [], now).level,
    ).toBe("LOW");
  });
  it("keeps correct local dates around midnight and DST", () => {
    expect(dayKey(new Date("2026-11-09T21:00Z"), "Asia/Almaty")).toBe(
      "2026-11-10",
    );
    const r = schedule(
      [task({ deadline: new Date("2026-11-04T23:00Z") })],
      {
        ...prefs,
        timezone: "America/New_York",
        studyDays: [0, 1, 2, 3, 4, 5, 6],
      },
      [],
      "2026-11-01",
      "2026-11-02",
      new Date("2026-11-01T10:00Z"),
    );
    expect(
      r.sessions.every(
        (s) =>
          formatInTimeZone(s.start, "America/New_York", "HH:mm") >= "09:00",
      ),
    ).toBe(true);
  });
  it("rejects invalid ranges and excessive periods", () => {
    expect(() =>
      schedule([], prefs, [], "2026-11-10", "2026-11-09", now),
    ).toThrow();
    expect(() =>
      schedule([], prefs, [], "2026-01-01", "2026-12-31", now),
    ).toThrow();
  });
  it("preserves invariants over a realistic mixed workload", () => {
    const tasks = Array.from({ length: 24 }, (_, i) =>
      task({
        id: String(i),
        estimatedMinutes: 30 + (i % 6) * 25,
        deadline: new Date(+now + (1 + (i % 5)) * 86400000),
        priority: ["HIGH", "MEDIUM", "LOW"][i % 3],
      }),
    );
    const r = schedule(tasks, prefs, [], "2026-11-09", "2026-11-13", now);
    for (let i = 1; i < r.sessions.length; i++)
      expect(overlaps(r.sessions[i - 1], r.sessions[i])).toBe(false);
    for (const s of r.sessions.filter((s) => s.taskId))
      expect(s.end <= tasks.find((t) => t.id === s.taskId)!.deadline).toBe(
        true,
      );
    expect(
      r.totalMinutes + r.unscheduled.reduce((n, t) => n + t.minutes, 0),
    ).toBe(tasks.reduce((n, t) => n + t.estimatedMinutes, 0));
  });
});
