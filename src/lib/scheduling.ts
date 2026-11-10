import { addDays, format, parseISO } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
export type Work = {
  id: string;
  title: string;
  deadline: Date;
  priority: string;
  difficulty: string;
  estimatedMinutes: number;
  recordedMinutes?: number;
};
export type Commitment = {
  start: Date;
  end: Date;
  taskId?: string | null;
  kind?: string;
  completed?: boolean;
};
export type Preferences = {
  timezone: string;
  startTime: string;
  endTime: string;
  dailyMinutes: number;
  sessionMinutes: number;
  breakMinutes: number;
  studyDays: number[];
};
export type Slot = {
  taskId: string | null;
  title: string;
  start: Date;
  end: Date;
  kind: "study" | "break";
  reason: string;
};
const minute = 60000;
export function priorityScore(t: Work, now: Date) {
  const hours = Math.max(1, (t.deadline.getTime() - now.getTime()) / 3600000);
  return (
    1000 / hours +
    ({ HIGH: 30, MEDIUM: 15, LOW: 5 }[t.priority] ?? 0) +
    ({ HARD: 8, MEDIUM: 4, EASY: 1 }[t.difficulty] ?? 0)
  );
}
export function dayKey(date: Date, tz: string) {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}
export function overlaps(a: Commitment, b: Commitment) {
  return a.start < b.end && a.end > b.start;
}
export function schedule(
  tasks: Work[],
  prefs: Preferences,
  existing: Commitment[],
  startDate: string,
  endDate: string,
  now = new Date(),
) {
  if (
    endDate < startDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  )
    throw new Error("timeRange");
  if (
    prefs.endTime <= prefs.startTime ||
    prefs.sessionMinutes < 1 ||
    prefs.dailyMinutes < 1 ||
    prefs.breakMinutes < 0
  )
    throw new Error("timeRange");
  const days: string[] = [];
  for (
    let d = parseISO(startDate);
    format(d, "yyyy-MM-dd") <= endDate;
    d = addDays(d, 1)
  ) {
    if (days.length >= 93) throw new Error("periodTooLong");
    days.push(format(d, "yyyy-MM-dd"));
  }
  const slots: Slot[] = [];
  const blocked = [...existing];
  const work = tasks
    .map((t) => ({
      ...t,
      remaining: Math.max(
        0,
        t.estimatedMinutes -
          (t.recordedMinutes ?? 0) -
          existing
            .filter(
              (s) =>
                s.taskId === t.id &&
                s.kind !== "break" &&
                !s.completed &&
                s.end > now,
            )
            .reduce(
              (n, s) => n + (s.end.getTime() - s.start.getTime()) / minute,
              0,
            ),
      ),
    }))
    .sort(
      (a, b) =>
        priorityScore(b, now) - priorityScore(a, now) ||
        a.deadline.getTime() - b.deadline.getTime() ||
        a.id.localeCompare(b.id),
    );
  const used = new Map<string, number>();
  for (const d of days) {
    const a = fromZonedTime(`${d}T${prefs.startTime}`, prefs.timezone),
      b = fromZonedTime(`${d}T${prefs.endTime}`, prefs.timezone);
    used.set(
      d,
      existing
        .filter((s) => s.kind === "study")
        .reduce(
          (n, s) =>
            n +
            Math.max(
              0,
              Math.min(b.getTime(), s.end.getTime()) -
                Math.max(a.getTime(), s.start.getTime()),
            ) /
              minute,
          0,
        ),
    );
  }
  for (const task of work) {
    while (task.remaining > 0) {
      const candidates: {
        d: string;
        start: Date;
        end: Date;
        breakEnd: Date;
        minutes: number;
      }[] = [];
      for (const d of days) {
        if (!prefs.studyDays.includes(parseISO(d).getDay())) continue;
        const windowStart = fromZonedTime(
          `${d}T${prefs.startTime}`,
          prefs.timezone,
        );
        const windowEnd = fromZonedTime(
          `${d}T${prefs.endTime}`,
          prefs.timezone,
        );
        const cap = Math.floor(prefs.dailyMinutes - (used.get(d) ?? 0));
        if (cap < 1) continue;
        let cursor = new Date(
          Math.ceil(Math.max(now.getTime(), windowStart.getTime()) / minute) *
            minute,
        );
        const endLimit = Math.min(windowEnd.getTime(), task.deadline.getTime());
        const conflicts = blocked
          .filter((s) => s.end > cursor && s.start.getTime() < endLimit)
          .sort((a, b) => a.start.getTime() - b.start.getTime());
        for (let i = 0; i <= conflicts.length; i++) {
          const next = conflicts[i];
          const gapEnd = Math.min(endLimit, next?.start.getTime() ?? endLimit);
          const free = Math.floor((gapEnd - cursor.getTime()) / minute);
          const length = Math.min(
            task.remaining,
            prefs.sessionMinutes,
            cap,
            Math.max(0, free - prefs.breakMinutes),
          );
          if (length >= Math.min(15, task.remaining)) {
            const end = new Date(cursor.getTime() + length * minute);
            candidates.push({
              d,
              start: cursor,
              end,
              breakEnd: new Date(end.getTime() + prefs.breakMinutes * minute),
              minutes: length,
            });
            break;
          }
          if (next)
            cursor = new Date(Math.max(cursor.getTime(), next.end.getTime()));
        }
      }
      // Balance days only while there is enough slack before this task's deadline.
      candidates.sort(
        (a, b) =>
          (used.get(a.d) ?? 0) - (used.get(b.d) ?? 0) ||
          a.start.getTime() - b.start.getTime(),
      );
      const chosen = candidates[0];
      if (!chosen) break;
      const slot: Slot = {
        taskId: task.id,
        title: task.title,
        start: chosen.start,
        end: chosen.end,
        kind: "study",
        reason:
          task.deadline.getTime() - now.getTime() < 86400000
            ? "urgent"
            : task.priority === "HIGH"
              ? "important"
              : task.difficulty === "HARD"
                ? "difficult"
                : "balanced",
      };
      slots.push(slot);
      blocked.push(slot);
      task.remaining -= chosen.minutes;
      used.set(chosen.d, (used.get(chosen.d) ?? 0) + chosen.minutes);
      if (prefs.breakMinutes) {
        const rest: Slot = {
          taskId: null,
          title: "break",
          start: chosen.end,
          end: chosen.breakEnd,
          kind: "break",
          reason: "recovery",
        };
        slots.push(rest);
        blocked.push(rest);
      }
    }
  }
  return {
    sessions: slots.sort((a, b) => a.start.getTime() - b.start.getTime()),
    unscheduled: work
      .filter((t) => t.remaining > 0)
      .map((t) => ({ taskId: t.id, title: t.title, minutes: t.remaining })),
    totalMinutes: slots
      .filter((s) => s.kind === "study")
      .reduce((n, s) => n + (s.end.getTime() - s.start.getTime()) / minute, 0),
  };
}
export function deadlineRisk(
  task: Work,
  prefs: Preferences,
  commitments: Commitment[],
  now = new Date(),
) {
  const result = schedule(
    [task],
    prefs,
    commitments,
    dayKey(now, prefs.timezone),
    dayKey(
      new Date(
        Math.max(
          now.getTime(),
          Math.min(task.deadline.getTime(), now.getTime() + 90 * 86400000),
        ),
      ),
      prefs.timezone,
    ),
    now,
  );
  const missing = result.unscheduled[0]?.minutes ?? 0;
  return {
    level:
      missing > 0
        ? "HIGH"
        : task.deadline.getTime() - now.getTime() < 86400000
          ? "MEDIUM"
          : "LOW",
    missingMinutes: missing,
  };
}
