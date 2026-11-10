import type { ClientData } from "./data";
import { dayKey } from "./scheduling";
export function records(data: ClientData) {
  return [
    ...data.focus
      .filter((f) => f.completed && f.end)
      .map((f) => ({ date: f.end!, minutes: f.duration, taskId: f.taskId })),
    ...data.sessions
      .filter((s) => s.completed && s.kind === "study")
      .map((s) => ({
        date: s.completedAt ?? s.end,
        minutes: (+new Date(s.end) - +new Date(s.start)) / 60000,
        taskId: s.taskId,
      })),
  ];
}
export function studyStreak(data: ClientData, now = new Date()) {
  const tz = data.user.settings?.timezone ?? "Asia/Almaty";
  const keys = new Set(records(data).map((r) => dayKey(new Date(r.date), tz)));
  let cursor = new Date(now),
    count = 0;
  if (!keys.has(dayKey(cursor, tz)))
    cursor = new Date(cursor.getTime() - 86400000);
  while (keys.has(dayKey(cursor, tz))) {
    count++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return count;
}
