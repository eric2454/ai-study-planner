import { timingSafeEqual } from "node:crypto";
import { createReminders } from "@/lib/reminders";
export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`,
    actual = req.headers.get("authorization") ?? "";
  if (
    !process.env.CRON_SECRET ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return Response.json({ error: "unauthorized" }, { status: 401 });
  await createReminders();
  return Response.json({ processed: true });
}
