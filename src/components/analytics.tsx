"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { records, studyStreak } from "@/lib/metrics";
import { dayKey } from "@/lib/scheduling";
import { fromZonedTime } from "date-fns-tz";
import { Field } from "./ui/common";
const ActivityChart = dynamic(
    () => import("./charts").then((m) => m.ActivityChart),
    { ssr: false },
  ),
  Donut = dynamic(() => import("./charts").then((m) => m.Donut), {
    ssr: false,
  }),
  TrendChart = dynamic(() => import("./charts").then((m) => m.TrendChart), {
    ssr: false,
  });
export function Analytics() {
  const { t, date, timezone } = useI18n(),
    { data } = useWorkspace();
  const now = new Date(),
    today = dayKey(now, timezone);
  const [period, setPeriod] = useState("week"),
    [from, setFrom] = useState(today),
    [to, setTo] = useState(today);
  const length = period === "today" ? 1 : period === "week" ? 7 : 30,
    start =
      period === "custom"
        ? fromZonedTime(`${from}T00:00`, timezone)
        : fromZonedTime(
            `${dayKey(new Date(+now - (length - 1) * 86400000), timezone)}T00:00`,
            timezone,
          ),
    end = period === "custom" ? fromZonedTime(`${to}T23:59:59`, timezone) : now,
    days = Math.max(1, Math.min(93, Math.ceil((+end - +start) / 86400000)));
  const inRange = (v: string) => new Date(v) >= start && new Date(v) <= end;
  const rec = records(data).filter((r) => inRange(r.date)),
    completed = data.tasks.filter(
      (x) => x.completedAt && inRange(x.completedAt),
    ),
    total = rec.reduce((n, r) => n + r.minutes, 0),
    pending = data.tasks.filter((x) => x.status !== "COMPLETED"),
    overdue = pending.filter((x) => new Date(x.deadline) < now);
  const points = Array.from({ length: days }, (_, i) => {
    const d = new Date(+start + i * 86400000),
      key = dayKey(d, timezone);
    return {
      name: date(d, { day: "numeric", month: "short" }),
      value: Math.round(
        rec
          .filter((r) => dayKey(new Date(r.date), timezone) === key)
          .reduce((n, r) => n + r.minutes, 0),
      ),
    };
  });
  const dist = [
    ...data.subjects.map((s) => ({
      name: s.name,
      color: s.color,
      value: Math.round(
        rec
          .filter(
            (r) =>
              data.tasks.find((t) => t.id === r.taskId)?.subjectId === s.id,
          )
          .reduce((n, r) => n + r.minutes, 0),
      ),
    })),
    {
      name: t("none"),
      color: "#94a3b8",
      value: Math.round(
        rec
          .filter((r) => !data.tasks.find((t) => t.id === r.taskId)?.subjectId)
          .reduce((n, r) => n + r.minutes, 0),
      ),
    },
  ];
  const trend = points.map((p, i) => ({
    ...p,
    value: completed.filter(
      (t) =>
        dayKey(new Date(t.completedAt!), timezone) ===
        dayKey(new Date(+start + i * 86400000), timezone),
    ).length,
  }));
  const stats = [
    ["allTasks", data.tasks.length],
    ["completed", completed.length],
    ["pending", pending.length],
    ["overdue", overdue.length],
    ["studyTime", `${(total / 60).toFixed(1)} ${t("hours")}`],
    ["average", `${Math.round(total / days)} ${t("minutes")}`],
    [
      "productivity",
      `${data.tasks.length ? Math.round((data.tasks.filter((t) => t.status === "COMPLETED").length / data.tasks.length) * 100) : 0}%`,
    ],
    ["streak", `${studyStreak(data)} ${t("days")}`],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("summary")}</span>
          <h1>{t("analytics")}</h1>
          <p>{t("analyticsSub")}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label={t("custom")}
        >
          {["today", "week", "month", "custom"].map((p) => (
            <option key={p} value={p}>
              {t(p)}
            </option>
          ))}
        </select>
      </div>
      {period === "custom" && (
        <div className="form-grid period-range">
          <Field label={t("from")}>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label={t("to")}>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>
      )}
      <div className="analytics-stats">
        {stats.map(([k, v]) => (
          <div className="card stat-card" key={k}>
            <span>{t(String(k))}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="card chart-card">
          <h2>{t("dailyActivity")}</h2>
          <ActivityChart points={points} />
        </section>
        <section className="card chart-card">
          <h2>{t("completion")}</h2>
          <Donut
            points={[
              {
                name: t("completed"),
                value: completed.length,
                color: "#6366f1",
              },
              { name: t("pending"), value: pending.length, color: "#e2e8f0" },
            ]}
          />
        </section>
        <section className="card chart-card">
          <h2>{t("trend")}</h2>
          <TrendChart points={trend} />
        </section>
        <section className="card chart-card">
          <h2>
            {t("distribution")} · {t("minutes")}
          </h2>
          <Donut points={dist} />
        </section>
      </div>
      <section className="card chart-card">
        <h2>{t("upcoming")}</h2>
        {pending.slice(0, 6).map((x) => (
          <div className="summary-line" key={x.id}>
            <span>{x.title}</span>
            <time className={new Date(x.deadline) < now ? "danger" : ""}>
              {date(x.deadline)}
            </time>
          </div>
        ))}
        {!pending.length && <p className="muted">{t("noEvents")}</p>}
      </section>
    </>
  );
}
