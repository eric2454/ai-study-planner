import { db } from "./db";
export async function createReminders(userId?: string) {
  const now = new Date();
  const users = await db.user.findMany({
    where: { ...(userId ? { id: userId } : {}), settings: { reminders: true } },
    select: {
      id: true,
      settings: true,
      tasks: {
        where: {
          status: { not: "COMPLETED" },
          deadline: { lte: new Date(now.getTime() + 168 * 3600000) },
        },
      },
      studySessions: {
        where: {
          completed: false,
          kind: "study",
          start: { gte: now, lte: new Date(now.getTime() + 3600000) },
        },
      },
    },
  });
  for (const u of users) {
    const entries: { key: string; title: string; type: string }[] = [];
    for (const t of u.tasks) {
      const hours = (t.deadline.getTime() - now.getTime()) / 3600000;
      if (hours < 0)
        entries.push({
          key: `overdue:${t.id}:${t.deadline.toISOString()}`,
          title: t.title,
          type: "overdue",
        });
      else
        for (const h of u.settings?.reminderHours ?? [])
          if (hours <= h)
            entries.push({
              key: `deadline:${t.id}:${t.deadline.toISOString()}:${h}`,
              title: t.title,
              type: "deadline",
            });
    }
    for (const s of u.studySessions)
      entries.push({
        key: `session:${s.id}:${s.start.toISOString()}`,
        title: s.title,
        type: "sessionReminder",
      });
    if (entries.length)
      await db.notification.createMany({
        data: entries.map((e) => ({ ...e, userId: u.id })),
        skipDuplicates: true,
      });
  }
  await db.rateLimit.deleteMany({ where: { expires: { lt: now } } });
  await db.passwordReset.deleteMany({ where: { expires: { lt: now } } });
}
