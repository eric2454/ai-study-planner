"use client";
import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, Trash2, User, Loader2 } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
export function Assistant() {
  const { t, date } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const [message, setMessage] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data.messages.length]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> AI STUDY PLANNER
          </span>
          <h1>{t("assistant")}</h1>
          <p>{t("assistantSub")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm(t("confirmDelete")))
              void mutate({ action: "clearChat" }, true).catch(() => {});
          }}
        >
          <Trash2 size={16} />
          {t("clearChat")}
        </Button>
      </div>
      <section className="card chat-card">
        <div className="chat-messages">
          {!data.messages.length && (
            <div className="chat-welcome">
              <span className="chat-spark">
                <Sparkles size={33} />
              </span>
              <h2>{t("assistantTitle")}</h2>
              <p>{t("assistantSub")}</p>
              <div>
                {["recommendation", "plannerSub", "analyticsSub"].map((k) => (
                  <button key={k} onClick={() => setMessage(t(k))}>
                    {t(k)}
                    <ArrowUp size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {data.messages.map((m) => (
            <article key={m.id} className={`chat-message ${m.role}`}>
              <span
                className={`icon-tile ${m.role === "user" ? "blue" : "purple"}`}
              >
                {m.role === "user" ? (
                  <User size={19} />
                ) : (
                  <Sparkles size={19} />
                )}
              </span>
              <div>
                <small>
                  {m.role === "user" ? data.user.name : t("assistant")}{" "}
                  <time>
                    {date(m.createdAt, { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </small>
                <p>
                  {m.source === "unavailable" ? t("aiUnavailable") : m.content}
                </p>
              </div>
            </article>
          ))}
          {busy && (
            <div className="chat-message">
              <Loader2 className="spin" size={19} />
              <p>{t("working")}</p>
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form
          className="chat-input"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!message.trim()) return;
            const text = message;
            setMessage("");
            try {
              await mutate({ action: "chat", message: text }, true);
            } catch {
              setMessage(text);
            }
          }}
        >
          <textarea
            aria-label={t("chatPlaceholder")}
            placeholder={t("chatPlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={3000}
          />
          <Button
            size="icon"
            aria-label={t("send")}
            disabled={busy || !message.trim()}
          >
            <ArrowUp size={20} />
          </Button>
        </form>
        <p className="chat-disclaimer">{t("assistantHint")}</p>
      </section>
    </>
  );
}
