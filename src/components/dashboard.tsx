"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ListTodo,
  CalendarDays,
  CheckCheck,
  Clock3,
  TrendingUp,
  AlarmClock,
  Flame,
  BookOpen,
} from "lucide-react";
import { Button } from "./ui/button";
import { Empty } from "./ui/common";
import { TaskRow } from "./tasks";
import { dayKey } from "@/lib/scheduling";
import { records, studyStreak } from "@/lib/metrics";
import { formatInTimeZone } from "date-fns-tz";
const ActivityChart = dynamic(
  () => import("./charts").then((m) => m.ActivityChart),
  { ssr: false },
);
export function Dashboard() {
  const { t, date, timezone } = useI18n(),
    { data, setTaskModal } = useWorkspace();
  const now = new Date(),
    today = dayKey(now, timezone),
    done = data.tasks.filter((t) => t.status === "COMPLETED").length,
    remaining = data.tasks.filter((t) => t.status !== "COMPLETED"),
    dueToday = remaining.filter(
      (t) => dayKey(new Date(t.deadline), timezone) === today,
    ),
    upcoming = remaining.filter(
      (t) => +new Date(t.deadline) - +now <= 7 * 86400000,
    ),
    rec = remaining[0],
    study = records(data),
    total = study.reduce((n, r) => n + r.minutes, 0),
    sessions = data.sessions.filter(
      (s) =>
        s.kind === "study" && dayKey(new Date(s.start), timezone) === today,
    );
  const hour = Number(formatInTimeZone(now, timezone, "H"));
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const points = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(+now - (6 - i) * 86400000),
      key = dayKey(d, timezone);
    return {
      name: date(d, { weekday: "short" }),
      value: Math.round(
        study
          .filter((r) => dayKey(new Date(r.date), timezone) === key)
          .reduce((n, r) => n + r.minutes, 0),
      ),
      color: i === 6 ? "#6366f1" : "#c7d2fe",
    };
  });
  const stats = [
    ["allTasks", data.tasks.length, ListTodo, "blue"],
    ["todayTasks", dueToday.length, CalendarDays, "purple"],
    ["completed", done, CheckCheck, "green"],
    ["upcoming", upcoming.length, AlarmClock, "orange"],
    ["studyTime", `${(total / 60).toFixed(1)} ${t("hours")}`, Clock3, "blue"],
    [
      "productivity",
      `${data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0}%`,
      TrendingUp,
      "green",
    ],
  ] as const;
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="date-label">
            <CalendarDays size={14} />
            {date(now, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <h1>
            {t(greeting)}, {data.user.name.split(" ")[0]}
            <span className="wave">✦</span>
          </h1>
          <p>{t("welcomeSub")}</p>
        </div>
        <Button onClick={() => setTaskModal("new")}>
          <Plus size={17} />
          {t("newTask")}
        </Button>
      </div>
      {!data.user.onboarded && (
        <Link href="/onboarding" className="onboarding-banner">
          <span className="icon-tile purple">
            <GraduationIcon />
          </span>
          <div>
            <strong>{t("onboarding")}</strong>
            <small>{t("onboardingSub")}</small>
          </div>
          <ArrowRight size={20} />
        </Link>
      )}
      <section className="stats-grid">
        {stats.map(([label, value, Icon, color]) => (
          <article className="card stat-card" key={label}>
            <div>
              <span>{t(label)}</span>
              <Icon size={17} className={`text-${color}`} />
            </div>
            <strong>{value}</strong>
            <small>
              {t(
                label === "studyTime"
                  ? "recorded"
                  : label === "productivity"
                    ? "progress"
                    : "workspace",
              )}
            </small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-left">
          <div className="card">
            <div className="card-heading">
              <div>
                <h2>
                  {t("todayTasks")}
                  <span className="count">{dueToday.length}</span>
                </h2>
                <p>{t("tagline")}</p>
              </div>
              <Link href="/tasks">
                {t("viewAll")}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            {dueToday.length ? (
              dueToday
                .slice(0, 5)
                .map((task) => <TaskRow key={task.id} task={task} compact />)
            ) : (
              <Empty title={t("noTasks")} description={t("noTasksSub")}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTaskModal("new")}
                >
                  <Plus size={15} />
                  {t("newTask")}
                </Button>
              </Empty>
            )}
          </div>
          <div className="card activity-card">
            <div className="card-heading">
              <div>
                <h2>{t("weeklyProgress")}</h2>
                <p>{t("weeklySub")}</p>
              </div>
              <span className="chart-period">{t("week")}</span>
            </div>
            <ActivityChart points={points} />
            <div className="activity-footer">
              <span>
                <i />
                {t("studyTime")}
              </span>
              <b>
                {t("streak")}: {studyStreak(data)} {t("days")}{" "}
                <Flame size={14} />
              </b>
            </div>
          </div>
          <div className="card">
            <div className="card-heading">
              <h2>{t("todayPlan")}</h2>
              <Link href="/calendar">
                {t("calendar")}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            {sessions.length ? (
              <div className="mini-timeline">
                {sessions.map((s) => (
                  <div key={s.id}>
                    <time>
                      {date(s.start, { hour: "2-digit", minute: "2-digit" })}
                    </time>
                    <span />
                    <div>
                      <b>{s.title}</b>
                      <small>
                        {date(s.start, { hour: "2-digit", minute: "2-digit" })}{" "}
                        — {date(s.end, { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    </div>
                    {s.completed && <CheckCheck size={18} />}
                  </div>
                ))}
              </div>
            ) : (
              <Empty title={t("noSessions")} description={t("noSessionsSub")}>
                <Button asChild variant="outline" size="sm">
                  <Link href="/ai-planner">
                    <Sparkles size={15} />
                    {t("generate")}
                  </Link>
                </Button>
              </Empty>
            )}
          </div>
        </div>
        <aside className="dashboard-right">
          <div className="ai-insight">
            <div className="ai-insight-top">
              <span>
                <Sparkles size={15} />
                {t("aiBadge")}
              </span>
              <Sparkles size={32} />
            </div>
            <h2>{t("aiRecommendation")}</h2>
            <p>{t(rec ? "recommendation" : "noRecommendation")}</p>
            {rec && (
              <div className="recommendation-task">
                <BookOpen size={17} />
                <strong>{rec.title}</strong>
                <small>
                  {rec.estimatedMinutes} {t("minutes")} · {date(rec.deadline)}
                </small>
              </div>
            )}
            <Button asChild>
              <Link href="/ai-planner">
                {t("generate")}
                <ArrowRight size={16} />
              </Link>
            </Button>
            <div className="insight-orbit" />
          </div>
          <div className="card deadlines-card">
            <div className="card-heading">
              <h2>{t("upcoming")}</h2>
              <AlarmClock size={18} />
            </div>
            {remaining.slice(0, 4).map((task) => {
              const diff = (+new Date(task.deadline) - +now) / 86400000,
                s = data.subjects.find((s) => s.id === task.subjectId);
              return (
                <button
                  key={task.id}
                  className="deadline-item"
                  onClick={() => setTaskModal(task.id)}
                >
                  <span
                    className={`deadline-icon ${diff < 1 ? "red" : diff < 3 ? "orange" : "green"}`}
                  >
                    <CalendarDays size={17} />
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{s?.name ?? t("none")}</small>
                  </div>
                  <time className={diff < 1 ? "danger" : ""}>
                    {date(task.deadline)}
                  </time>
                </button>
              );
            })}
            {!remaining.length && (
              <p className="empty-small">{t("noEvents")}</p>
            )}
          </div>
          <div className="card subjects-progress">
            <div className="card-heading">
              <h2>{t("subjects")}</h2>
              <Link href="/subjects">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            {data.subjects.slice(0, 4).map((s) => {
              const tasks = data.tasks.filter((x) => x.subjectId === s.id),
                pct = tasks.length
                  ? Math.round(
                      (tasks.filter((x) => x.status === "COMPLETED").length /
                        tasks.length) *
                        100,
                    )
                  : 0;
              return (
                <div key={s.id}>
                  <p>
                    <span>
                      <i style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <b>{pct}%</b>
                  </p>
                  <div className="progress-track">
                    <span style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
            {!data.subjects.length && (
              <Link className="empty-small" href="/subjects">
                {t("step2")} →
              </Link>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
function GraduationIcon() {
  return <BookOpen size={22} />;
}
