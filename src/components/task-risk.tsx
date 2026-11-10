"use client";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { deadlineRisk } from "@/lib/scheduling";
import type { ClientData } from "@/lib/data";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
export function TaskRisk({ task }: { task: ClientData["tasks"][number] }) {
  const { t } = useI18n(),
    { data } = useWorkspace();
  const p = data.user.settings;
  if (!p || task.status === "COMPLETED") return null;
  const recorded =
    data.focus
      .filter((f) => f.taskId === task.id && f.completed)
      .reduce((n, f) => n + f.duration, 0) +
    data.sessions
      .filter((s) => s.taskId === task.id && s.completed && s.kind === "study")
      .reduce((n, s) => n + (+new Date(s.end) - +new Date(s.start)) / 60000, 0);
  const commitments = [...data.sessions, ...data.events].map((s) => ({
    ...s,
    start: new Date(s.start),
    end: new Date(s.end),
  }));
  const risk = deadlineRisk(
    { ...task, deadline: new Date(task.deadline), recordedMinutes: recorded },
    p,
    commitments,
  );
  return (
    <div className={`task-risk ${risk.level.toLowerCase()}`}>
      {risk.level === "HIGH" ? (
        <AlertTriangle size={18} />
      ) : (
        <ShieldCheck size={18} />
      )}
      <div>
        <b>
          {t("risk")}: {t(risk.level)}
        </b>
        <small>
          {t("riskHelp")}: {risk.missingMinutes} {t("minutes")}
        </small>
      </div>
    </div>
  );
}
