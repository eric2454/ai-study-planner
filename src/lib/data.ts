import { db } from "./db";
export async function getData(userId: string) {
  const [
    user,
    subjects,
    tasks,
    plans,
    sessions,
    events,
    focus,
    notifications,
    chat,
  ] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        university: true,
        faculty: true,
        specialty: true,
        year: true,
        onboarded: true,
        settings: true,
      },
    }),
    db.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.task.findMany({ where: { userId }, orderBy: { deadline: "asc" } }),
    db.studyPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.studySession.findMany({ where: { userId }, orderBy: { start: "asc" } }),
    db.calendarEvent.findMany({ where: { userId }, orderBy: { start: "asc" } }),
    db.focusSession.findMany({ where: { userId }, orderBy: { start: "desc" } }),
    db.notification.findMany({
      where: { userId, dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.aIChat.findUnique({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
    }),
  ]);
  return {
    user,
    subjects,
    tasks,
    plans,
    sessions,
    events,
    focus,
    notifications,
    messages: chat?.messages ?? [],
  };
}
export type AppData = Awaited<ReturnType<typeof getData>>;
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
export type ClientData = Serialized<AppData>;
