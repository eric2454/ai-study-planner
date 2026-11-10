"use client";
import { Inbox, Loader2 } from "lucide-react";
import { useI18n } from "../providers";
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={25} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Busy() {
  const { t } = useI18n();
  return (
    <span className="inline">
      <Loader2 size={17} className="spin" />
      {t("working")}
    </span>
  );
}
export function Badge({ value }: { value: string }) {
  const { t } = useI18n();
  return <span className={`badge ${value.toLowerCase()}`}>{t(value)}</span>;
}
