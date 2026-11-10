"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Columns3,
  Clock3,
  CalendarDays,
  MoreHorizontal,
  Check,
  Trash2,
  BookOpen,
} from "lucide-react";
import { dayKey } from "@/lib/scheduling";
import { TaskRisk } from "./task-risk";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Field, Badge, Empty, Busy } from "./ui/common";
import type { ClientData } from "@/lib/data";
type Task = ClientData["tasks"][number];
type Form = {
  title: string;
  description: string;
  notes: string;
  subjectId: string;
  deadline: string;
  priority: string;
  difficulty: string;
  status: string;
  estimatedMinutes: number;
};
export function TaskModal({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { t, timezone } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const task = data.tasks.find((x) => x.id === id);
  const { register, handleSubmit, reset } = useForm<Form>();
  useEffect(() => {
    reset(
      task
        ? {
            ...task,
            subjectId: task.subjectId ?? "",
            deadline: formatInTimeZone(
              new Date(task.deadline),
              timezone,
              "yyyy-MM-dd'T'HH:mm",
            ),
          }
        : {
            title: "",
            description: "",
            notes: "",
            subjectId: "",
            deadline: formatInTimeZone(
              new Date(Date.now() + 86400000),
              timezone,
              "yyyy-MM-dd'T'18:00",
            ),
            priority: "MEDIUM",
            difficulty: "MEDIUM",
            status: "TODO",
            estimatedMinutes: 60,
          },
    );
  }, [id, task, reset, timezone]);
  const submit = handleSubmit(async (v) => {
    try {
      await mutate({
        action: "saveTask",
        id: task?.id,
        data: {
          ...v,
          deadline: fromZonedTime(v.deadline, timezone).toISOString(),
        },
      });
      onClose();
    } catch {}
  });
  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title={t(task ? "edit" : "newTask")}
    >
      {task && <TaskRisk task={task} />}
      <form onSubmit={submit}>
        <Field label={t("title")}>
          <input {...register("title")} required maxLength={200} autoFocus />
        </Field>
        <Field label={t("description")}>
          <textarea {...register("description")} rows={3} />
        </Field>
        <div className="form-grid">
          <Field label={t("subject")}>
            <select {...register("subjectId")}>
              <option value="">{t("none")}</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${t("deadline")} · ${timezone}`}>
            <input type="datetime-local" {...register("deadline")} required />
          </Field>
          <Field label={t("priority")}>
            <select {...register("priority")}>
              {["HIGH", "MEDIUM", "LOW"]
                .map((k) => <option key={k}>{t(k)}</option>)
                .map((e, i) => (
                  <option value={["HIGH", "MEDIUM", "LOW"][i]} key={i}>
                    {e.props.children}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t("difficulty")}>
            <select {...register("difficulty")}>
              {["EASY", "MEDIUM", "HARD"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("status")}>
            <select {...register("status")}>
              {["TODO", "IN_PROGRESS", "COMPLETED"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${t("duration")} (${t("minutes")})`}>
            <input
              type="number"
              min={5}
              max={6000}
              {...register("estimatedMinutes")}
              required
            />
          </Field>
        </div>
        <Field label={t("notes")}>
          <textarea {...register("notes")} rows={2} />
        </Field>
        <div className="modal-actions">
          {task && (
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (confirm(t("confirmDelete")))
                  try {
                    await mutate({ action: "deleteTask", id: task.id });
                    onClose();
                  } catch {}
              }}
            >
              <Trash2 size={16} />
              {t("delete")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
export function TaskRow({
  task,
  compact = false,
}: {
  task: Task;
  compact?: boolean;
}) {
  const { t, date } = useI18n(),
    { data, mutate, setTaskModal } = useWorkspace();
  const subject = data.subjects.find((s) => s.id === task.subjectId);
  const overdue =
    task.status !== "COMPLETED" && new Date(task.deadline) < new Date();
  return (
    <div
      className={`task-row ${task.status === "COMPLETED" ? "is-completed" : ""}`}
    >
      <button
        className={`task-check ${task.status === "COMPLETED" ? "checked" : ""}`}
        aria-label={t(task.status === "COMPLETED" ? "TODO" : "COMPLETED")}
        onClick={() =>
          void mutate(
            {
              action: "taskStatus",
              id: task.id,
              status: task.status === "COMPLETED" ? "TODO" : "COMPLETED",
            },
            true,
          ).catch(() => {})
        }
      >
        {task.status === "COMPLETED" && <Check size={13} />}
      </button>
      <button className="task-main" onClick={() => setTaskModal(task.id)}>
        <strong>{task.title}</strong>
        <span>
          <i style={{ background: subject?.color ?? "#94a3b8" }} />
          {subject?.name ?? t("none")}
          {!compact && task.description && (
            <small>· {task.description.slice(0, 65)}</small>
          )}
        </span>
      </button>
      <div className="task-meta">
        <Badge value={task.priority} />
        <span className={overdue ? "danger" : ""}>
          <CalendarDays size={13} />
          {date(task.deadline)}
        </span>
        <span>
          <Clock3 size={13} />
          {task.estimatedMinutes} {t("minutes")}
        </span>
      </div>
      <button
        className="icon-button"
        aria-label={t("edit")}
        onClick={() => setTaskModal(task.id)}
      >
        <MoreHorizontal size={19} />
      </button>
    </div>
  );
}
export function Tasks() {
  const { t, timezone } = useI18n(),
    { data, setTaskModal, mutate } = useWorkspace(),
    params = useSearchParams();
  const [view, setView] = useState("list"),
    [query, setQuery] = useState(""),
    [subject, setSubject] = useState(params.get("subject") ?? ""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [deadline, setDeadline] = useState(""),
    [sort, setSort] = useState("nearest"),
    [group, setGroup] = useState(false),
    [page, setPage] = useState(1);
  const tasks = data.tasks
    .filter(
      (x) =>
        (!query ||
          `${x.title} ${x.description}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!subject || x.subjectId === subject) &&
        (!status || x.status === status) &&
        (!priority || x.priority === priority) &&
        (!difficulty || x.difficulty === difficulty) &&
        (!deadline ||
          (deadline === "overdue" &&
            new Date(x.deadline) < new Date() &&
            x.status !== "COMPLETED") ||
          (deadline === "today" &&
            dayKey(new Date(x.deadline), timezone) ===
              dayKey(new Date(), timezone))),
    )
    .sort((a, b) =>
      sort === "highest"
        ? ["HIGH", "MEDIUM", "LOW"].indexOf(a.priority) -
          ["HIGH", "MEDIUM", "LOW"].indexOf(b.priority)
        : sort === "newest"
          ? +new Date(b.createdAt) - +new Date(a.createdAt)
          : sort === "shortest"
            ? a.estimatedMinutes - b.estimatedMinutes
            : +new Date(a.deadline) - +new Date(b.deadline),
    );
  const visible = tasks.slice(0, page * 30);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("workspace")}</span>
          <h1>
            {t("tasks")}
            <span className="count">{data.tasks.length}</span>
          </h1>
          <p>{t("feature2sub")}</p>
        </div>
        <Button onClick={() => setTaskModal("new")}>
          <Plus size={17} />
          {t("newTask")}
        </Button>
      </div>
      <div className="card tasks-panel">
        <div className="task-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchTasks")}
              aria-label={t("searchTasks")}
            />
          </div>
          <div className="view-switch">
            {[
              [List, "list"],
              [LayoutGrid, "grid"],
              [Columns3, "board"],
            ].map(([Icon, v]) => {
              const I = Icon as typeof List;
              return (
                <button
                  key={String(v)}
                  className={view === v ? "selected" : ""}
                  onClick={() => setView(String(v))}
                  aria-label={t(String(v))}
                >
                  <I size={17} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="filters">
          <select
            aria-label={t("subject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">
              {t("subject")}: {t("all")}
            </option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {[
            [status, setStatus, "status", ["TODO", "IN_PROGRESS", "COMPLETED"]],
            [priority, setPriority, "priority", ["HIGH", "MEDIUM", "LOW"]],
            [
              difficulty,
              setDifficulty,
              "difficulty",
              ["EASY", "MEDIUM", "HARD"],
            ],
            [deadline, setDeadline, "deadline", ["today", "overdue"]],
          ].map(([value, setter, label, opts]) => (
            <select
              key={String(label)}
              aria-label={t(String(label))}
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            >
              <option value="">
                {t(String(label))}: {t("all")}
              </option>
              {(opts as string[]).map((v) => (
                <option value={v} key={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          ))}
          <select
            aria-label={t("sort")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {["nearest", "highest", "newest", "shortest"].map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={group}
              onChange={(e) => setGroup(e.target.checked)}
            />
            {t("group")}
          </label>
        </div>
        {!tasks.length ? (
          <Empty
            title={t(data.tasks.length ? "emptySearch" : "noTasks")}
            description={t("noTasksSub")}
          >
            <Button onClick={() => setTaskModal("new")}>
              <Plus size={16} />
              {t("newTask")}
            </Button>
          </Empty>
        ) : view === "board" ? (
          <div className="kanban">
            {["TODO", "IN_PROGRESS", "COMPLETED"].map((s) => (
              <div
                key={s}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (data.tasks.some((x) => x.id === id))
                    void mutate(
                      { action: "taskStatus", id, status: s },
                      true,
                    ).catch(() => {});
                }}
              >
                <h3>
                  <span className={`status-dot ${s.toLowerCase()}`} />
                  {t(s)}
                  <small>{tasks.filter((x) => x.status === s).length}</small>
                </h3>
                {tasks
                  .filter((x) => x.status === s)
                  .map((task) => (
                    <div
                      className="kanban-card"
                      key={task.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", task.id)
                      }
                    >
                      <TaskRow task={task} compact />
                      <select
                        aria-label={t("status")}
                        value={task.status}
                        onChange={(e) =>
                          void mutate(
                            {
                              action: "taskStatus",
                              id: task.id,
                              status: e.target.value,
                            },
                            true,
                          ).catch(() => {})
                        }
                      >
                        {["TODO", "IN_PROGRESS", "COMPLETED"].map((s) => (
                          <option value={s} key={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : group ? (
          <div>
            {[null, ...data.subjects.map((s) => s.id)].map((id) => {
              const list = visible.filter((x) => x.subjectId === id);
              return (
                !!list.length && (
                  <section key={id ?? "none"} className="task-group">
                    <h3>
                      <BookOpen size={17} />
                      {data.subjects.find((s) => s.id === id)?.name ??
                        t("none")}
                      <small>{list.length}</small>
                    </h3>
                    <div className={view === "grid" ? "task-grid" : ""}>
                      {list.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </section>
                )
              );
            })}
          </div>
        ) : (
          <div className={view === "grid" ? "task-grid" : ""}>
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
        {tasks.length > visible.length && view !== "board" && (
          <Button variant="ghost" onClick={() => setPage(page + 1)}>
            {t("viewAll")}
          </Button>
        )}
      </div>
    </>
  );
}
