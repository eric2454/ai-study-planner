"use client";
import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  Flame,
  Clock3,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Field } from "./ui/common";
import { dayKey } from "@/lib/scheduling";
export function Focus() {
  const { t, timezone } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const [mode, setMode] = useState("focusMode"),
    [duration, setDuration] = useState(25),
    [taskId, setTaskId] = useState(""),
    [sound, setSound] = useState(true),
    [now, setNow] = useState(() => Date.now()),
    [breakEnd, setBreakEnd] = useState<number | null>(null),
    [breakLeft, setBreakLeft] = useState(300);
  const completing = useRef(false);
  const active = data.focus.find((f) => !f.end && !f.completed),
    isFocus = mode === "focusMode";
  const elapsed = active
    ? active.elapsedSeconds +
      (active.resumedAt
        ? Math.max(0, Math.floor((now - +new Date(active.resumedAt)) / 1000))
        : 0)
    : 0;
  const remaining = isFocus
    ? Math.max(0, (active ? active.duration : duration) * 60 - elapsed)
    : breakEnd
      ? Math.max(0, Math.ceil((breakEnd - now) / 1000))
      : breakLeft;
  const running = isFocus ? !!active?.resumedAt : !!breakEnd;
  const today = data.focus.filter(
    (f) =>
      f.completed &&
      f.end &&
      dayKey(new Date(f.end), timezone) === dayKey(new Date(), timezone),
  );
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (active && remaining === 0 && isFocus && !completing.current) {
      completing.current = true;
      void mutate(
        { action: "finishFocus", id: active.id, complete: true },
        true,
      )
        .then(() => {
          toast.success(t("focusComplete"));
          if (sound) {
            const context = new AudioContext(),
              osc = context.createOscillator(),
              gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            gain.gain.value = 0.12;
            osc.frequency.value = 660;
            osc.start();
            osc.stop(context.currentTime + 0.3);
            osc.onended = () => void context.close();
          }
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            data.user.settings?.browserNotifications
          )
            new Notification("AI Study Planner", { body: t("focusComplete") });
          setMode("shortBreak");
          setBreakLeft(300);
        })
        .catch(() => {})
        .finally(() => {
          completing.current = false;
        });
    }
  }, [
    active,
    remaining,
    isFocus,
    mutate,
    t,
    sound,
    data.user.settings?.browserNotifications,
  ]);
  const changeMode = (m: string) => {
    if (active) return;
    setMode(m);
    setBreakEnd(null);
    setBreakLeft(m === "longBreak" ? 900 : 300);
  };
  const toggle = async () => {
    try {
      if (isFocus) {
        if (!active)
          await mutate(
            { action: "startFocus", duration, taskId: taskId || null },
            true,
          );
        else
          await mutate(
            {
              action: active.resumedAt ? "pauseFocus" : "resumeFocus",
              id: active.id,
            },
            true,
          );
      } else if (breakEnd) {
        setBreakLeft(remaining);
        setBreakEnd(null);
      } else setBreakEnd(Date.now() + breakLeft * 1000);
    } catch {}
  };
  const reset = async () => {
    if (active)
      try {
        await mutate(
          { action: "finishFocus", id: active.id, complete: false },
          true,
        );
      } catch {}
    setBreakEnd(null);
    setBreakLeft(mode === "longBreak" ? 900 : 300);
  };
  const max = (active?.duration ?? duration) * 60,
    percent = isFocus ? (max - remaining) / max : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("focus")}</span>
          <h1>{t("focusSub")}</h1>
          <p>{t("tagline")}</p>
        </div>
      </div>
      <div className="focus-layout">
        <section className="card focus-card">
          <div className="segmented focus-tabs">
            {["focusMode", "shortBreak", "longBreak"].map((m) => (
              <button
                key={m}
                disabled={!!active && m !== "focusMode"}
                className={mode === m ? "selected" : ""}
                onClick={() => changeMode(m)}
              >
                {t(m)}
              </button>
            ))}
          </div>
          <div
            className="timer-orbit"
            style={
              {
                "--progress": `${Math.max(0, Math.min(1, percent)) * 360}deg`,
              } as React.CSSProperties
            }
          >
            <div>
              <span>{t(mode)}</span>
              <strong>
                {String(Math.floor(remaining / 60)).padStart(2, "0")}
                <b>:</b>
                {String(remaining % 60).padStart(2, "0")}
              </strong>
              <small>{t("focusSub")}</small>
            </div>
          </div>
          <div className="focus-task">
            <Field label={t("selectTask")}>
              <select
                value={active?.taskId ?? taskId}
                disabled={!!active}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">{t("none")}</option>
                {data.tasks
                  .filter((x) => x.status !== "COMPLETED")
                  .map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.title}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <div className="timer-controls">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("reset")}
              disabled={busy}
              onClick={() => void reset()}
            >
              <RotateCcw size={19} />
            </Button>
            <Button
              className="timer-start"
              disabled={busy || (!isFocus && remaining === 0)}
              onClick={() => void toggle()}
            >
              {running ? <Pause size={18} /> : <Play size={18} />}{" "}
              {t(running ? "pause" : active ? "resume" : "startTimer")}
            </Button>
            {!isFocus && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t("skip")}
                onClick={() => {
                  setMode("focusMode");
                  setBreakEnd(null);
                }}
              >
                <SkipForward size={20} />
              </Button>
            )}
          </div>
          <div className="focus-options">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => setSound(e.target.checked)}
              />
              <Volume2 size={15} />
              {t("sound")}
            </label>
            <Field label={`${t("duration")} (${t("minutes")})`}>
              <input
                type="number"
                min={1}
                max={180}
                value={isFocus ? duration : Math.round(breakLeft / 60)}
                disabled={!!active || !!breakEnd}
                onChange={(e) => {
                  const value = Math.max(
                    1,
                    Math.min(180, Number(e.target.value)),
                  );
                  if (isFocus) setDuration(value);
                  else setBreakLeft(value * 60);
                }}
              />
            </Field>
          </div>
          <button
            className="text-link"
            onClick={async () => {
              if (typeof Notification !== "undefined") {
                const permission = await Notification.requestPermission();
                if (permission === "granted" && data.user.settings)
                  await mutate(
                    {
                      action: "settings",
                      data: {
                        ...data.user.settings,
                        browserNotifications: true,
                      },
                    },
                    true,
                  ).catch(() => {});
              }
            }}
          >
            {t("enableNotifications")}
          </button>
        </section>
        <aside className="focus-aside">
          <div className="card">
            <h2>{t("today")}</h2>
            {[
              [CheckCheck, today.length, "sessions"],
              [Clock3, today.reduce((n, f) => n + f.duration, 0), "minutes"],
              [
                Flame,
                data.focus.filter((f) => f.completed).length,
                "completed",
              ],
            ].map(([Icon, value, key]) => {
              const I = Icon as typeof Clock3;
              return (
                <div className="focus-stat" key={String(key)}>
                  <span className="icon-tile purple">
                    <I size={20} />
                  </span>
                  <strong>{String(value)}</strong>
                  <span>{t(String(key))}</span>
                </div>
              );
            })}
          </div>
          <div className="focus-tip">
            <span>✦</span>
            <h3>{t("feature6")}</h3>
            <p>{t("feature6sub")}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
