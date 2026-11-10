"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Code2,
  FlaskConical,
  Calculator,
  Globe,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Field, Empty, Busy } from "./ui/common";
const icons = {
  book: BookOpen,
  code: Code2,
  flask: FlaskConical,
  calculator: Calculator,
  globe: Globe,
};
export function Subjects() {
  const { t, date } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const [editing, setEditing] = useState<string | null>(null);
  const s = data.subjects.find((x) => x.id === editing);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("workspace")}</span>
          <h1>{t("subjects")}</h1>
          <p>{t("feature2sub")}</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus size={17} />
          {t("newSubject")}
        </Button>
      </div>
      {!data.subjects.length ? (
        <div className="card">
          <Empty title={t("step2")} description={t("feature2sub")}>
            <Button onClick={() => setEditing("new")}>{t("newSubject")}</Button>
          </Empty>
        </div>
      ) : (
        <div className="subject-grid">
          {data.subjects.map((s) => {
            const tasks = data.tasks.filter((t) => t.subjectId === s.id),
              done = tasks.filter((t) => t.status === "COMPLETED").length,
              upcoming = tasks.find((t) => t.status !== "COMPLETED");
            const Icon = icons[s.icon as keyof typeof icons] ?? BookOpen;
            return (
              <article className="card subject-card" key={s.id}>
                <div className="subject-top">
                  <span
                    className="subject-icon"
                    style={{ color: s.color, background: `${s.color}15` }}
                  >
                    <Icon size={25} />
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setEditing(s.id)}
                    aria-label={t("edit")}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <h2>{s.name}</h2>
                <p>
                  {s.teacher || s.description || s.semester || t("subject")}
                </p>
                <div className="subject-stats">
                  <span>
                    {tasks.length} {t("tasks")}
                  </span>
                  <b>
                    {done}/{tasks.length}
                  </b>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                      background: s.color,
                    }}
                  />
                </div>
                <div className="subject-deadline">
                  {upcoming ? (
                    <>
                      <span>{t("upcoming")}</span>
                      <b>{date(upcoming.deadline)}</b>
                    </>
                  ) : (
                    <span>{t("noEvents")}</span>
                  )}
                </div>
                <Link href={`/tasks?subject=${s.id}`}>
                  {t("relatedTasks")}
                  <ArrowUpRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        key={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t(s ? "edit" : "newSubject")}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await mutate({ action: "saveSubject", id: s?.id, data: fields });
              setEditing(null);
            } catch {}
          }}
        >
          <Field label={t("title")}>
            <input
              name="name"
              defaultValue={s?.name}
              required
              maxLength={100}
            />
          </Field>
          <Field label={t("teacher")}>
            <input name="teacher" defaultValue={s?.teacher} />
          </Field>
          <Field label={t("description")}>
            <textarea name="description" defaultValue={s?.description} />
          </Field>
          <Field label={t("semester")}>
            <input name="semester" defaultValue={s?.semester} />
          </Field>
          <div className="form-grid">
            <Field label={t("color")}>
              <input
                name="color"
                type="color"
                defaultValue={s?.color ?? "#6366f1"}
              />
            </Field>
            <Field label={t("icon")}>
              <select name="icon" defaultValue={s?.icon ?? "book"}>
                {Object.keys(icons).map((k) => (
                  <option value={k} key={k}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="modal-actions">
            {s && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (confirm(t("subjectDelete")))
                    try {
                      await mutate({ action: "deleteSubject", id: s.id });
                      setEditing(null);
                    } catch {}
                }}
              >
                {t("delete")}
              </Button>
            )}
            <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
