import { z } from "zod";
import { hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { registration, password } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return Response.json({ error: "unauthorized" }, { status: 403 });
    const body = await readJson(req, 10000);
    // Do not trust arbitrary forwarded IP headers. Configure trusted ingress rate limits too.
    if (body.action === "register") {
      const data = registration.parse(body);
      await rateLimit(`register:${data.email}`, 4, 3600);
      const exists = await db.user.findUnique({ where: { email: data.email } });
      if (exists) throw new Error("emailTaken");
      await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await hash(data.password, 12),
          university: data.university,
          year: data.year,
          settings: { create: {} },
        },
      });
      return Response.json({ ok: true });
    }
    if (body.action === "forgot") {
      const email = z.email().toLowerCase().parse(body.email);
      await rateLimit(`reset:${email}`, 3, 3600);
      if (!process.env.SMTP_HOST) throw new Error("mailUnavailable");
      const user = await db.user.findUnique({ where: { email } });
      if (user) {
        const token = randomBytes(32).toString("hex");
        await db.$transaction([
          db.passwordReset.deleteMany({ where: { userId: user.id } }),
          db.passwordReset.create({
            data: {
              userId: user.id,
              tokenHash: createHash("sha256").update(token).digest("hex"),
              expires: new Date(Date.now() + 30 * 60000),
            },
          }),
        ]);
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === "465",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
        });
        const link = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject:
            "AI Study Planner — password reset / Құпиясөзді қалпына келтіру / Сброс пароля",
          text: `${link}\n30 min / 30 минут. Ignore if not requested.`,
        });
      }
      return Response.json({ ok: true });
    }
    if (body.action === "reset") {
      const data = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
        .parse(body);
      const tokenHash = createHash("sha256").update(data.token).digest("hex");
      await rateLimit(`reset-token:${tokenHash}`, 5);
      const encoded = await hash(data.password, 12);
      await db.$transaction(async (tx) => {
        const reset = await tx.passwordReset.findUnique({
          where: { tokenHash },
        });
        if (!reset || reset.expires < new Date())
          throw new Error("invalidToken");
        const claimed = await tx.passwordReset.deleteMany({
          where: { id: reset.id },
        });
        if (!claimed.count) throw new Error("invalidToken");
        await tx.user.update({
          where: { id: reset.userId },
          data: { passwordHash: encoded, sessionVersion: { increment: 1 } },
        });
      });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "invalidInput" }, { status: 400 });
  } catch (error) {
    const known = [
      "emailTaken",
      "rateLimited",
      "mailUnavailable",
      "invalidToken",
    ];
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "invalidInput"
            : error instanceof Error && known.includes(error.message)
              ? error.message
              : "serverError",
      },
      { status: 400 },
    );
  }
}
