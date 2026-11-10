"use client";
import { useState } from "react";
import {
  Database,
  Search,
  Download,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Badge, Empty, Field, Busy } from "./ui/common";
import { Modal } from "./ui/dialog";
import { SessionModal } from "./study-calendar";
import { toCsv } from "@/lib/csv";
type Tab = "tasks" | "subjects" | "sessions";
export function DataManager() {
  const { t, date } = useI18n(),
    { data, mutate, busy, setTaskModal } = useWorkspace();
  const [tab, setTab] = useState<Tab>("tasks"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("nearest"),
    [page, setPage] = useState(1),
    [subjectId, setSubjectId] = useState<string | null>(null),
    [sessionId, setSessionId] = useState<string | null>(null);
  const subject = data.subjects.find((s) => s.id === subjectId);
  const rows = [...data[tab]]
    .filter((row) => {
      const content =
        "title" in row ? row.title : "name" in row ? row.name : "";
      const detail = "description" in row ? row.description : "";
      return (
        `${content} ${detail}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()) &&
        (!status ||
          ("status" in row
            ? row.status === status
            : "completed" in row
              ? (row.completed ? "COMPLETED" : "TODO") === status
              : true))
      );
    })
    .sort((a, b) => {
      if (sort === "title")
        return ("title" in a ? a.title : a.name).localeCompare(
          "title" in b ? b.title : b.name,
        );
      if (sort === "newest")
        return (
          +new Date("createdAt" in b ? b.createdAt : b.start) -
          +new Date("createdAt" in a ? a.createdAt : a.start)
        );
      const av =
          "deadline" in a ? a.deadline : "start" in a ? a.start : a.createdAt,
        bv =
          "deadline" in b ? b.deadline : "start" in b ? b.start : b.createdAt;
      return +new Date(av) - +new Date(bv);
    });
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    current = Math.min(page, pages),
    visible = rows.slice((current - 1) * 20, current * 20);
  const edit = (id: string) =>
    tab === "tasks"
      ? setTaskModal(id)
      : tab === "subjects"
        ? setSubjectId(id)
        : setSessionId(id);
  const remove = async (id: string) => {
    if (!confirm(t(tab === "subjects" ? "subjectDelete" : "confirmDelete")))
      return;
    try {
      await mutate({
        action:
          tab === "tasks"
            ? "deleteTask"
            : tab === "subjects"
              ? "deleteSubject"
              : "deleteSession",
        id,
      });
    } catch {}
  };
  const csv = () => {
    const values: unknown[][] = [
      [t("title"), t("subject"), t("status"), t("deadline"), t("duration")],
      ...rows.map((row) => {
        if ("deadline" in row)
          return [
            row.title,
            data.subjects.find((s) => s.id === row.subjectId)?.name ??
              t("none"),
            t(row.status),
            row.deadline,
            row.estimatedMinutes,
          ];
        if ("start" in row)
          return [
            row.kind === "break" ? t("break") : row.title,
            "",
            t(row.completed ? "COMPLETED" : "TODO"),
            row.start,
            Math.round((+new Date(row.end) - +new Date(row.start)) / 60000),
          ];
        return [row.name, row.teacher, row.semester, "", ""];
      }),
    ];
    if (tab === "subjects")
      values[0] = [t("title"), t("teacher"), t("semester"), "", ""];
    const url = URL.createObjectURL(
      new Blob([toCsv(values)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-planner-${tab}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Database size={14} />
            {t("workspace")}
          </span>
          <h1>{t("dataManager")}</h1>
          <p>{t("dataManagerSub")}</p>
        </div>
        <Button variant="outline" onClick={csv}>
          <Download size={16} />
          {t("exportCsv")}
        </Button>
      </div>
      <div className="data-summary">
        {(["tasks", "subjects", "sessions"] as const).map((k) => (
          <button
            key={k}
            className={`card data-summary-card ${tab === k ? "selected" : ""}`}
            onClick={() => {
              setTab(k);
              setQuery("");
              setStatus("");
              setPage(1);
            }}
          >
            <span>{t(k)}</span>
            <strong>{data[k].length}</strong>
            <small>{t("records")}</small>
          </button>
        ))}
      </div>
      <section className="card data-panel">
        <div className="data-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label={t("search")}
              placeholder={t("search")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="inline">
            {tab !== "subjects" && (
              <select
                value={status}
                aria-label={t("status")}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("all")}</option>
                {(tab === "tasks"
                  ? ["TODO", "IN_PROGRESS", "COMPLETED"]
                  : ["TODO", "COMPLETED"]
                ).map((k) => (
                  <option key={k} value={k}>
                    {t(k)}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label={t("sort")}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="nearest">{t("nearest")}</option>
              <option value="newest">{t("newest")}</option>
              <option value="title">{t("title")}</option>
            </select>
            {tab !== "sessions" && (
              <Button
                onClick={() =>
                  tab === "tasks" ? setTaskModal("new") : setSubjectId("new")
                }
              >
                <Plus size={15} />
                {t(tab === "tasks" ? "newTask" : "newSubject")}
              </Button>
            )}
          </div>
        </div>
        {!rows.length ? (
          <Empty title={t("emptySearch")} description={t("dataManagerSub")} />
        ) : (
          <>
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("title")}</th>
                    <th>{t(tab === "subjects" ? "teacher" : "subject")}</th>
                    <th>{t(tab === "subjects" ? "progress" : "status")}</th>
                    <th>
                      {t(
                        tab === "subjects"
                          ? "semester"
                          : tab === "sessions"
                            ? "start"
                            : "deadline",
                      )}
                    </th>
                    <th>{t(tab === "subjects" ? "tasks" : "duration")}</th>
                    <th>{t("edit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const task = "deadline" in row ? row : null,
                      session = "start" in row ? row : null,
                      subject = "teacher" in row ? row : null;
                    const linkedSubject = task
                      ? data.subjects.find((s) => s.id === task.subjectId)
                      : session
                        ? data.subjects.find(
                            (s) =>
                              s.id ===
                              data.tasks.find((t) => t.id === session.taskId)
                                ?.subjectId,
                          )
                        : null;
                    const related = subject
                      ? data.tasks.filter((t) => t.subjectId === subject.id)
                      : [];
                    return (
                      <tr key={row.id}>
                        <td>
                          <button
                            className="data-title"
                            onClick={() => edit(row.id)}
                          >
                            {subject
                              ? subject.name
                              : session?.kind === "break"
                                ? t("break")
                                : (task?.title ?? session?.title)}
                          </button>
                          <small>
                            {task?.description || subject?.description}
                          </small>
                        </td>
                        <td>
                          {subject ? (
                            subject.teacher || "—"
                          ) : (
                            <span className="inline">
                              <i
                                className="data-color"
                                style={{
                                  background: linkedSubject?.color ?? "#94a3b8",
                                }}
                              />
                              {linkedSubject?.name ?? t("none")}
                            </span>
                          )}
                        </td>
                        <td>
                          {subject ? (
                            `${related.filter((t) => t.status === "COMPLETED").length}/${related.length}`
                          ) : (
                            <Badge
                              value={
                                task?.status ??
                                (session?.completed ? "COMPLETED" : "TODO")
                              }
                            />
                          )}
                        </td>
                        <td>
                          {subject
                            ? subject.semester || "—"
                            : date(task?.deadline ?? session!.start, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                        </td>
                        <td>
                          {subject
                            ? related.length
                            : `${task?.estimatedMinutes ?? Math.round((+new Date(session!.end) - +new Date(session!.start)) / 60000)} ${t("minutes")}`}
                        </td>
                        <td>
                          <div className="inline">
                            <button
                              className="icon-button"
                              aria-label={`${t("edit")} ${subject?.name ?? task?.title ?? session?.title}`}
                              onClick={() => edit(row.id)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button danger"
                              disabled={busy}
                              aria-label={`${t("delete")} ${subject?.name ?? task?.title ?? session?.title}`}
                              onClick={() => void remove(row.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="data-pagination">
              <span>
                {rows.length} {t("records")} · {current}/{pages}
              </span>
              <div className="inline">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current <= 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft size={15} />
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pages}
                  onClick={() => setPage(current + 1)}
                >
                  {t("next")}
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <SessionModal id={sessionId} onClose={() => setSessionId(null)} />
      <Modal
        key={subjectId}
        open={subjectId !== null}
        onClose={() => setSubjectId(null)}
        title={t(subject ? "edit" : "newSubject")}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await mutate({
                action: "saveSubject",
                id: subject?.id,
                data: {
                  ...subject,
                  ...fields,
                  color: subject?.color ?? "#6366f1",
                  icon: subject?.icon ?? "book",
                },
              });
              setSubjectId(null);
            } catch {}
          }}
        >
          {(["name", "teacher", "description", "semester"] as const).map(
            (k) => (
              <Field key={k} label={t(k === "name" ? "title" : k)}>
                <input
                  name={k}
                  defaultValue={subject?.[k]}
                  required={k === "name"}
                  maxLength={k === "description" ? 2000 : 100}
                />
              </Field>
            ),
          )}
          <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
        </form>
      </Modal>
    </>
  );
}
