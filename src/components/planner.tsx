"use client";
import { useState } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  Sparkles,
  ArrowRight,
  Clock3,
  CalendarDays,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Empty, Field } from "./ui/common";
import { SessionModal } from "./study-calendar";
import { dayKey } from "@/lib/scheduling";
type Result = {
  unscheduled: { taskId: string; title: string; minutes: number }[];
  totalMinutes: number;
  planId: string | null;
};
export function Planner() {
  const { t, timezone, date } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const today = dayKey(new Date(), timezone);
  const [start, setStart] = useState(today),
    [end, setEnd] = useState(
      format(addDays(new Date(`${today}T12:00:00`), 6), "yyyy-MM-dd"),
    ),
    [result, setResult] = useState<Result | null>(null),
    [selected, setSelected] = useState(data.plans[0]?.id ?? ""),
    [session, setSession] = useState<string | null>(null);
  const plan = data.plans.find((p) => p.id === selected) ?? data.plans[0],
    sessions = data.sessions.filter((s) => s.planId === plan?.id),
    p = data.user.settings;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> {t("planner")}
          </span>
          <h1>{t("plannerTitle")}</h1>
          <p>{t("plannerSub")}</p>
        </div>
      </div>
      <div className="planner-layout">
        <aside>
          <div className="card planner-controls">
            <span className="icon-tile purple">
              <Sparkles size={25} />
            </span>
            <h2>{t("generate")}</h2>
            <p>{t("plannerSub")}</p>
            <div className="period-buttons">
              {[
                ["today", 0],
                ["threeDays", 2],
                ["week", 6],
              ].map(([key, days]) => (
                <button
                  key={key}
                  onClick={() => {
                    setStart(today);
                    setEnd(
                      format(
                        addDays(new Date(`${today}T12:00:00`), Number(days)),
                        "yyyy-MM-dd",
                      ),
                    );
                  }}
                >
                  {t(String(key))}
                </button>
              ))}
            </div>
            <Field label={t("from")}>
              <input
                type="date"
                min={today}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label={t("to")}>
              <input
                type="date"
                min={start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
            <Button
              disabled={busy}
              className="full"
              onClick={async () => {
                try {
                  const r = await mutate(
                    { action: "generatePlan", data: { start, end } },
                    true,
                  );
                  const output = r.result as Result;
                  setResult(output);
                  if (output.planId) setSelected(output.planId);
                } catch {}
              }}
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" />
                  {t("planning")}
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  {t("generate")}
                </>
              )}
            </Button>
            <small className="muted">{t("savedPlan")}</small>
          </div>
          <div className="card preference-summary">
            <h3>{t("preferences")}</h3>
            <p>
              <Clock3 size={16} />
              {p?.startTime} — {p?.endTime}
            </p>
            <p>
              {p?.dailyMinutes} {t("minutes")} / {t("day")}
            </p>
            <p>
              {t("session")}: {p?.sessionMinutes} {t("minutes")}
            </p>
            <p>
              {t("break")}: {p?.breakMinutes} {t("minutes")}
            </p>
            <small>{timezone}</small>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">
                {t("edit")}
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </aside>
        <div>
          {result?.unscheduled.length ? (
            <div className="warning-box">
              <AlertTriangle size={22} />
              <div>
                <h3>{t("unscheduled")}</h3>
                <p>{t("unscheduledSub")}</p>
                {result.unscheduled.map((u) => (
                  <p key={u.taskId}>
                    <b>{u.title}</b> · {u.minutes} {t("minutes")}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {!plan ? (
            <div className="card">
              <Empty title={t("noPlan")} description={t("noPlanSub")} />
            </div>
          ) : (
            <div className="card plan-output">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">{t("todayPlan")}</span>
                  <h2>
                    {date(plan.start)} — {date(plan.end)}
                  </h2>
                  <span className="source-badge">
                    <Sparkles size={12} />
                    {t(
                      plan.source === "algorithm+openai"
                        ? "openai"
                        : "algorithm",
                    )}
                  </span>
                </div>
                <div className="plan-total">
                  <strong>
                    {(
                      sessions
                        .filter((s) => s.kind === "study")
                        .reduce(
                          (n, s) =>
                            n + (+new Date(s.end) - +new Date(s.start)) / 60000,
                          0,
                        ) / 60
                    ).toFixed(1)}
                  </strong>
                  <span>{t("hours")}</span>
                </div>
              </div>
              {plan.explanation && (
                <div className="ai-explanation">{plan.explanation}</div>
              )}
              <div className="plan-timeline">
                {sessions.map((s, i) => {
                  const newDay =
                    i === 0 ||
                    dayKey(new Date(s.start), timezone) !==
                      dayKey(new Date(sessions[i - 1].start), timezone);
                  return (
                    <div key={s.id}>
                      {newDay && (
                        <h3 className="timeline-day">
                          <CalendarDays size={16} />
                          {date(s.start, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h3>
                      )}
                      <button
                        className={`timeline-slot ${s.kind === "break" ? "rest" : ""}`}
                        onClick={() => setSession(s.id)}
                      >
                        <time>
                          {date(s.start, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <small>
                            {date(s.end, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </time>
                        <span className="timeline-line">
                          <i />
                        </span>
                        <div>
                          <h3>{s.kind === "break" ? t("break") : s.title}</h3>
                          <p>{t(s.reason)}</p>
                          <small>
                            {Math.round(
                              (+new Date(s.end) - +new Date(s.start)) / 60000,
                            )}{" "}
                            {t("minutes")}
                          </small>
                        </div>
                        {s.completed ? (
                          <Check size={18} />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card history">
            <h2>{t("planHistory")}</h2>
            {data.plans.map((p) => (
              <div key={p.id}>
                <button onClick={() => setSelected(p.id)}>
                  <CalendarDays size={16} />
                  <span>
                    {date(p.start)} — {date(p.end)}
                    <small>
                      {t(
                        p.source === "algorithm+openai"
                          ? "openai"
                          : "algorithm",
                      )}
                    </small>
                  </span>
                </button>
                <button
                  className="icon-button"
                  aria-label={t("delete")}
                  onClick={() => {
                    if (confirm(t("confirmDelete")))
                      void mutate({ action: "deletePlan", id: p.id }).catch(
                        () => {},
                      );
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SessionModal id={session} onClose={() => setSession(null)} />
    </>
  );
}
