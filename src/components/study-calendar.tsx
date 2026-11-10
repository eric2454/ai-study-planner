"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Field, Empty, Busy } from "./ui/common";
import { dayKey } from "@/lib/scheduling";
export function SessionModal({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { t, timezone } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const s = data.sessions.find((s) => s.id === id);
  return (
    <Modal key={id} open={!!s} onClose={onClose} title={t("reschedule")}>
      {s && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await mutate({
                action: "saveSession",
                id: s.id,
                data: {
                  start: fromZonedTime(
                    String(f.get("start")),
                    timezone,
                  ).toISOString(),
                  end: fromZonedTime(
                    String(f.get("end")),
                    timezone,
                  ).toISOString(),
                  completed: f.get("completed") === "on",
                },
              });
              onClose();
            } catch {}
          }}
        >
          <h3>{s.kind === "break" ? t("break") : s.title}</h3>
          <p className="muted">
            {t(s.reason)} · {timezone}
          </p>
          {(["start", "end"] as const).map((k) => (
            <Field label={t(k)} key={k}>
              <input
                name={k}
                type="datetime-local"
                required
                defaultValue={formatInTimeZone(
                  new Date(s[k]),
                  timezone,
                  "yyyy-MM-dd'T'HH:mm",
                )}
              />
            </Field>
          ))}
          {s.kind === "study" && (
            <label className="checkbox">
              <input
                type="checkbox"
                name="completed"
                defaultChecked={s.completed}
              />
              {t("completed")}
            </label>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (confirm(t("confirmDelete")))
                  try {
                    await mutate({ action: "deleteSession", id: s.id });
                    onClose();
                  } catch {}
              }}
            >
              {t("delete")}
            </Button>
            <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
type DisplayEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  type: "task" | "session" | "event";
  completed: boolean;
};
export function StudyCalendar() {
  const { t, date, timezone } = useI18n(),
    { data, mutate, setTaskModal } = useWorkspace(),
    params = useSearchParams();
  const [cursor, setCursor] = useState(
      new Date(
        `${params.get("date") ?? dayKey(new Date(), timezone)}T12:00:00`,
      ),
    ),
    [view, setView] = useState("month"),
    [event, setEvent] = useState<string | null>(null),
    [createDate, setCreateDate] = useState(""),
    [session, setSession] = useState<string | null>(null);
  const editing = data.events.find((e) => e.id === event);
  const items: DisplayEvent[] = [
    ...data.tasks.map((x) => ({
      id: x.id,
      title: x.title,
      start: x.deadline,
      end: x.deadline,
      color:
        data.subjects.find((s) => s.id === x.subjectId)?.color ?? "#ef4444",
      type: "task" as const,
      completed: x.status === "COMPLETED",
    })),
    ...data.sessions
      .filter((x) => x.kind === "study")
      .map((x) => ({
        id: x.id,
        title: x.title,
        start: x.start,
        end: x.end,
        color: "#6366f1",
        type: "session" as const,
        completed: x.completed,
      })),
    ...data.events.map((x) => ({
      ...x,
      type: "event" as const,
      completed: false,
    })),
  ];
  const first =
    view === "month"
      ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
      : view === "week"
        ? startOfWeek(cursor, { weekStartsOn: 1 })
        : cursor;
  const last =
    view === "month"
      ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
      : view === "week"
        ? addDays(first, 6)
        : cursor;
  const dates: Date[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) dates.push(d);
  const open = (e: DisplayEvent) =>
    e.type === "task"
      ? setTaskModal(e.id)
      : e.type === "session"
        ? setSession(e.id)
        : setEvent(e.id);
  const create = (d: Date) => {
    setCreateDate(`${format(d, "yyyy-MM-dd")}T09:00`);
    setEvent("new");
  };
  const move = async (e: React.DragEvent, key: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain"),
      s = data.sessions.find((s) => s.id === id);
    if (!s) return;
    const time = formatInTimeZone(new Date(s.start), timezone, "HH:mm");
    const start = fromZonedTime(`${key}T${time}`, timezone);
    try {
      await mutate({
        action: "saveSession",
        id: s.id,
        data: {
          start: start.toISOString(),
          end: new Date(
            +start + (+new Date(s.end) - +new Date(s.start)),
          ).toISOString(),
          completed: s.completed,
        },
      });
    } catch {}
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("workspace")}</span>
          <h1>{t("calendar")}</h1>
          <p>
            {t("feature3sub")} · {timezone}
          </p>
        </div>
        <Button onClick={() => create(cursor)}>
          <Plus size={17} />
          {t("newEvent")}
        </Button>
      </div>
      <div className="card calendar-card">
        <div className="calendar-toolbar">
          <div className="inline">
            <h2>
              {date(
                fromZonedTime(
                  `${format(cursor, "yyyy-MM-dd")}T12:00`,
                  timezone,
                ),
                { month: "long", year: "numeric" },
              )}
            </h2>
            <button
              className="icon-button"
              aria-label={t("previous")}
              onClick={() =>
                setCursor(
                  view === "month"
                    ? addMonths(cursor, -1)
                    : addDays(cursor, view === "week" ? -7 : -1),
                )
              }
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label={t("next")}
              onClick={() =>
                setCursor(
                  view === "month"
                    ? addMonths(cursor, 1)
                    : addDays(cursor, view === "week" ? 7 : 1),
                )
              }
            >
              <ChevronRight size={18} />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCursor(new Date(`${dayKey(new Date(), timezone)}T12:00`))
              }
            >
              {t("today")}
            </Button>
          </div>
          <div className="segmented">
            {["month", "week", "day"].map((v) => (
              <button
                key={v}
                className={view === v ? "selected" : ""}
                onClick={() => setView(v)}
              >
                {t(v)}
              </button>
            ))}
          </div>
        </div>
        <div className={`calendar-grid ${view === "day" ? "day-view" : ""}`}>
          {view !== "day" &&
            Array.from({ length: 7 }, (_, i) => (
              <div className="calendar-weekday" key={i}>
                {date(
                  fromZonedTime(
                    `${format(addDays(startOfWeek(cursor, { weekStartsOn: 1 }), i), "yyyy-MM-dd")}T12:00`,
                    timezone,
                  ),
                  { weekday: "short" },
                )}
              </div>
            ))}
          {dates.map((d) => {
            const key = format(d, "yyyy-MM-dd"),
              entries = items.filter(
                (e) => dayKey(new Date(e.start), timezone) === key,
              );
            return (
              <div
                key={key}
                className={`calendar-cell ${!isSameMonth(d, cursor) ? "muted-day" : ""} ${view === "week" ? "week-cell" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void move(e, key)}
              >
                <button
                  className={`calendar-date ${key === dayKey(new Date(), timezone) ? "is-today" : ""}`}
                  onClick={() => create(d)}
                  aria-label={`${t("newEvent")} ${key}`}
                >
                  {d.getDate()}
                </button>
                {entries.map((e) => (
                  <button
                    title={`${t(e.type === "task" ? "deadline" : e.type === "session" ? "session" : "personal")}: ${e.title}`}
                    key={`${e.type}-${e.id}`}
                    className={`calendar-event ${e.completed ? "done" : ""}`}
                    style={{
                      borderColor: e.color,
                      background: `${e.color}13`,
                      color: e.color,
                    }}
                    draggable={e.type === "session"}
                    onDragStart={(ev) =>
                      ev.dataTransfer.setData("text/plain", e.id)
                    }
                    onClick={() => open(e)}
                  >
                    {e.completed && <Check size={11} />}
                    <time>
                      {date(e.start, { hour: "2-digit", minute: "2-digit" })}
                    </time>
                    <span>{e.title}</span>
                  </button>
                ))}
                {view === "day" && !entries.length && (
                  <Empty title={t("noEvents")} />
                )}
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span>
            <i style={{ background: "#ef4444" }} />
            {t("deadline")}
          </span>
          <span>
            <i style={{ background: "#6366f1" }} />
            {t("session")}
          </span>
          <span>
            <i style={{ background: "#2563eb" }} />
            {t("personal")}
          </span>
        </div>
      </div>
      <SessionModal id={session} onClose={() => setSession(null)} />
      <Modal
        key={event}
        open={event !== null}
        onClose={() => setEvent(null)}
        title={t(editing ? "edit" : "newEvent")}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await mutate({
                action: "saveEvent",
                id: editing?.id,
                data: {
                  ...f,
                  start: fromZonedTime(String(f.start), timezone).toISOString(),
                  end: fromZonedTime(String(f.end), timezone).toISOString(),
                },
              });
              setEvent(null);
            } catch {}
          }}
        >
          <Field label={t("title")}>
            <input name="title" required defaultValue={editing?.title} />
          </Field>
          {(["start", "end"] as const).map((k) => (
            <Field label={`${t(k)} · ${timezone}`} key={k}>
              <input
                type="datetime-local"
                name={k}
                required
                defaultValue={
                  editing
                    ? formatInTimeZone(
                        new Date(editing[k]),
                        timezone,
                        "yyyy-MM-dd'T'HH:mm",
                      )
                    : k === "start"
                      ? createDate
                      : createDate.replace("09:00", "10:00")
                }
              />
            </Field>
          ))}
          <div className="form-grid">
            <Field label={t("eventType")}>
              <select name="type" defaultValue={editing?.type ?? "personal"}>
                <option value="personal">{t("personal")}</option>
                <option value="exam">{t("exam")}</option>
              </select>
            </Field>
            <Field label={t("color")}>
              <input
                type="color"
                name="color"
                defaultValue={editing?.color ?? "#2563eb"}
              />
            </Field>
          </div>
          <div className="modal-actions">
            {editing && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (confirm(t("confirmDelete")))
                    try {
                      await mutate({ action: "deleteEvent", id: editing.id });
                      setEvent(null);
                    } catch {}
                }}
              >
                {t("delete")}
              </Button>
            )}
            <Button>{t("save")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
