import { z } from "zod";
export const password = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);
export const registration = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().toLowerCase(),
    password,
    confirmPassword: z.string(),
    university: z.string().max(200).default(""),
    year: z.coerce.number().int().min(1).max(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });
export const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  notes: z.string().max(5000).default(""),
  subjectId: z
    .string()
    .nullish()
    .transform((v) => v || null),
  deadline: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).default("TODO"),
  estimatedMinutes: z.coerce.number().int().min(5).max(6000),
});
export const subjectInput = z.object({
  name: z.string().trim().min(1).max(100),
  teacher: z.string().max(100).default(""),
  description: z.string().max(2000).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z
    .enum(["book", "code", "flask", "calculator", "globe"])
    .default("book"),
  semester: z.string().max(50).default(""),
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const settingsInput = z
  .object({
    language: z.enum(["kk", "ru", "en"]),
    theme: z.enum(["light", "dark"]),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
    dailyMinutes: z.coerce.number().int().min(15).max(720),
    startTime: time,
    endTime: time,
    studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    sessionMinutes: z.coerce.number().int().min(15).max(180),
    breakMinutes: z.coerce.number().int().min(0).max(60),
    reminders: z.boolean(),
    reminderHours: z.array(z.number().int().min(1).max(168)).max(10),
    browserNotifications: z.boolean(),
  })
  .refine((v) => v.endTime > v.startTime, { message: "timeRange" });
export const eventInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    start: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    end: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#6366f1"),
    type: z.enum(["personal", "exam"]).default("personal"),
  })
  .refine((v) => v.end > v.start, { message: "timeRange" });
export const profileInput = z.object({
  name: z.string().trim().min(2).max(100),
  university: z.string().max(200),
  faculty: z.string().max(200),
  specialty: z.string().max(200),
  year: z.coerce.number().int().min(1).max(8),
  image: z
    .string()
    .max(400000)
    .refine(
      (v) =>
        !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
    )
    .nullish(),
});
