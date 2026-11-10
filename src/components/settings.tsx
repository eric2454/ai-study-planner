"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Trash2, ShieldCheck, Sun, Moon } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Field, Busy } from "./ui/common";
import { Modal } from "./ui/dialog";
import { format } from "date-fns";
import { dateLocales } from "./providers";
export function Settings({ studyOnly = false }: { studyOnly?: boolean }) {
  const { t, lang, setLang, dark, setDark, setTimezone } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const s = data.user.settings!;
  const [deleteOpen, setDeleteOpen] = useState(false),
    [days, setDays] = useState(s.studyDays),
    [reminders, setReminders] = useState(s.reminders),
    [browser, setBrowser] = useState(s.browserNotifications);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const settings = {
      ...s,
      ...f,
      language: lang,
      theme: dark ? "dark" : "light",
      studyDays: days,
      reminders,
      browserNotifications: browser,
      reminderHours: String(f.reminderHours ?? s.reminderHours.join(","))
        .split(",")
        .filter(Boolean)
        .map(Number),
    };
    try {
      await mutate({ action: "settings", data: settings });
      setTimezone(settings.timezone);
    } catch {}
  };
  return (
    <>
      {!studyOnly && (
        <div className="page-heading">
          <div>
            <span className="eyebrow">{t("account")}</span>
            <h1>{t("settings")}</h1>
            <p>{t("plannerSub")}</p>
          </div>
        </div>
      )}
      <div className={studyOnly ? "" : "settings-layout"}>
        <form className="card settings-card" onSubmit={submit}>
          {!studyOnly && (
            <>
              <div className="settings-section">
                <h2>{t("general")}</h2>
                <div className="form-grid">
                  <Field label={t("language")}>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as typeof lang)}
                    >
                      <option value="kk">Қазақша</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label={t("theme")}>
                    <button
                      type="button"
                      className="theme-choice"
                      onClick={() => setDark(!dark)}
                    >
                      {dark ? <Moon size={17} /> : <Sun size={17} />}{" "}
                      {t(dark ? "dark" : "light")}
                    </button>
                  </Field>
                </div>
                <Field label={t("timezone")}>
                  <input
                    name="timezone"
                    defaultValue={s.timezone}
                    list="timezones"
                    required
                  />
                  <datalist id="timezones">
                    {[
                      "Asia/Almaty",
                      "Asia/Oral",
                      "Europe/Moscow",
                      "Europe/London",
                      "America/New_York",
                      "UTC",
                    ].map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </>
          )}
          <div className="settings-section">
            <h2>{t("preferences")}</h2>
            <div className="form-grid">
              {(
                ["dailyMinutes", "sessionMinutes", "breakMinutes"] as const
              ).map((k) => (
                <Field key={k} label={t(k)}>
                  <input
                    name={k}
                    type="number"
                    defaultValue={s[k]}
                    min={k === "breakMinutes" ? 0 : 15}
                    max={
                      k === "dailyMinutes"
                        ? 720
                        : k === "sessionMinutes"
                          ? 180
                          : 60
                    }
                    required
                  />
                </Field>
              ))}
              {(["startTime", "endTime"] as const).map((k) => (
                <Field key={k} label={t(k)}>
                  <input type="time" name={k} defaultValue={s[k]} required />
                </Field>
              ))}
            </div>
            <Field label={t("studyDays")}>
              <div className="day-selector">
                {[1, 2, 3, 4, 5, 6, 0].map((day, i) => (
                  <button
                    type="button"
                    aria-pressed={days.includes(day)}
                    key={day}
                    className={days.includes(day) ? "selected" : ""}
                    onClick={() =>
                      setDays(
                        days.includes(day)
                          ? days.filter((d) => d !== day)
                          : [...days, day],
                      )
                    }
                  >
                    {format(new Date(2026, 0, 5 + i), "EEE", {
                      locale: dateLocales[lang],
                    })}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          {!studyOnly && (
            <div className="settings-section">
              <h2>{t("notifications")}</h2>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={reminders}
                  onChange={(e) => setReminders(e.target.checked)}
                />
                {t("reminders")}
              </label>
              <Field label={t("reminderHours")}>
                <input
                  name="reminderHours"
                  defaultValue={s.reminderHours.join(",")}
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={browser}
                  onChange={async (e) => {
                    if (
                      e.target.checked &&
                      typeof Notification !== "undefined"
                    ) {
                      const result = await Notification.requestPermission();
                      setBrowser(result === "granted");
                    } else setBrowser(false);
                  }}
                />
                {t("enableNotifications")}
              </label>
            </div>
          )}
          <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
        </form>
        {!studyOnly && (
          <aside>
            <PasswordForm />
            <section className="card settings-card danger-zone">
              <h2>{t("account")}</h2>
              <p>{t("privacyText")}</p>
              <Button variant="outline" asChild>
                <a href="/api/export" download>
                  <Download size={16} />
                  {t("exportData")}
                </a>
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} />
                {t("deleteAccount")}
              </Button>
            </section>
          </aside>
        )}
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("deleteAccount")}
      >
        <p>{t("deleteAccountHint")}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await mutate(
                { action: "deleteAccount", password: f.get("password") },
                true,
              );
              await signOut({ callbackUrl: "/" });
            } catch {}
          }}
        >
          <Field label={t("password")}>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <Button variant="destructive" disabled={busy}>
            {t("deleteAccount")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function PasswordForm() {
  const { t } = useI18n(),
    { mutate, busy } = useWorkspace();
  return (
    <form
      className="card settings-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = Object.fromEntries(new FormData(form));
        try {
          await mutate({ action: "password", data: f });
          await signOut({ callbackUrl: "/login" });
        } catch {}
      }}
    >
      <h2>
        <ShieldCheck size={20} />
        {t("changePassword")}
      </h2>
      <Field label={t("currentPassword")}>
        <input
          type="password"
          name="current"
          required
          autoComplete="current-password"
        />
      </Field>
      <Field label={t("newPassword")}>
        <input
          type="password"
          name="password"
          minLength={10}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </Field>
      <p className="muted">{t("passwordHint")}</p>
      <Button variant="outline" disabled={busy}>
        {t("changePassword")}
      </Button>
    </form>
  );
}
