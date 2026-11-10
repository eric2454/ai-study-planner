import { describe, it, expect } from "vitest";
import {
  registration,
  taskInput,
  settingsInput,
  profileInput,
} from "../src/lib/validation";
import { dictionaries } from "../src/i18n";
describe("input validation and localization", () => {
  it("requires a strong matching password and a valid email", () => {
    const input = {
      name: "Student",
      email: "A@EXAMPLE.COM",
      password: "StrongPass123",
      confirmPassword: "StrongPass123",
      year: 2,
    };
    expect(registration.parse(input).email).toBe("a@example.com");
    for (const patch of [
      { password: "weak" },
      { email: "invalid" },
      { confirmPassword: "Wrong" },
      { year: 0 },
    ])
      expect(registration.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects invalid task dates, empty titles and negative work estimates", () => {
    const t = {
      title: "Essay",
      deadline: "2026-11-12T10:00:00+05:00",
      estimatedMinutes: 90,
    };
    expect(taskInput.parse(t).deadline.toISOString()).toBe(
      "2026-11-12T05:00:00.000Z",
    );
    for (const patch of [
      { title: " " },
      { estimatedMinutes: -1 },
      { deadline: "tomorrow" },
      { priority: "URGENT" },
    ])
      expect(taskInput.safeParse({ ...t, ...patch }).success).toBe(false);
  });
  it("validates timezones, study days and window order", () => {
    const s = {
      language: "kk",
      theme: "light",
      timezone: "Asia/Almaty",
      dailyMinutes: 180,
      startTime: "09:00",
      endTime: "18:00",
      studyDays: [1, 2],
      sessionMinutes: 50,
      breakMinutes: 10,
      reminders: true,
      reminderHours: [24, 3, 1],
      browserNotifications: false,
    };
    expect(settingsInput.safeParse(s).success).toBe(true);
    for (const patch of [
      { timezone: "Mars/City" },
      { studyDays: [] },
      { startTime: "22:00" },
      { sessionMinutes: 0 },
    ])
      expect(settingsInput.safeParse({ ...s, ...patch }).success).toBe(false);
  });
  it("prevents non-image avatar sources", () => {
    expect(
      profileInput.safeParse({
        name: "Student",
        university: "",
        faculty: "",
        specialty: "",
        year: 1,
        image: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
  it("includes a nonempty translation for every language key", () => {
    for (const dictionary of Object.values(dictionaries)) {
      expect(Object.keys(dictionary).sort()).toEqual(
        Object.keys(dictionaries.en).sort(),
      );
      expect(Object.values(dictionary).every((v) => v.trim().length > 0)).toBe(
        true,
      );
    }
  });
});
