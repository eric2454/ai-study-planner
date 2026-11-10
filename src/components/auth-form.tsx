"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "./providers";
import { Logo } from "./landing";
import { LanguageSwitch } from "./language-switch";
import { Button } from "./ui/button";
import { Field, Busy } from "./ui/common";
type Fields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  year: number;
  remember: boolean;
};
export function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
}) {
  const { t } = useI18n(),
    router = useRouter(),
    params = useSearchParams();
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  const { register, handleSubmit } = useForm<Fields>({
    defaultValues: { year: 1, remember: true },
  });
  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          email: values.email,
          password: values.password,
          remember: String(values.remember),
          redirect: false,
        });
        if (result?.error) throw new Error("invalidPassword");
        router.push("/dashboard");
        router.refresh();
      } else {
        if (mode === "register" && values.password !== values.confirmPassword)
          throw new Error("passwordMismatch");
        const res = await fetch("/api/public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            action:
              mode === "register"
                ? "register"
                : mode === "forgot-password"
                  ? "forgot"
                  : "reset",
            token: params.get("token"),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (mode === "forgot-password") setSent(true);
        else {
          toast.success(t("saved"));
          router.push("/login");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "serverError");
    } finally {
      setBusy(false);
    }
  });
  const heading =
    mode === "register"
      ? "register"
      : mode === "login"
        ? "login"
        : "resetPassword";
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Logo />
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> AI STUDY PLANNER
          </span>
          <h1>{t("authTitle")}</h1>
          <p>{t("authSub")}</p>
          <div className="auth-orbit">
            <span />
            <span />
            <span />
            <Sparkles size={56} />
          </div>
          <h3>{t("authQuote")}</h3>
        </div>
        <small>{t("tagline")}</small>
      </aside>
      <main className="auth-main">
        <div className="auth-top">
          <Link href="/">← {t("back")}</Link>
          <LanguageSwitch />
        </div>
        <div className="auth-box">
          <span className="eyebrow">AI STUDY PLANNER</span>
          <h2>{t(heading)}</h2>
          <p>{t("welcomeSub")}</p>
          {sent ? (
            <div className="notice">{t("resetSent")}</div>
          ) : (
            <form onSubmit={submit}>
              {mode === "register" && (
                <Field label={t("fullName")}>
                  <input
                    {...register("name")}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </Field>
              )}
              {mode !== "reset-password" && (
                <Field label={t("email")}>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
              )}
              {mode !== "forgot-password" && (
                <Field label={t("password")}>
                  <div className="password-field">
                    <input
                      aria-label={t("password")}
                      {...register("password")}
                      type={show ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "login" ? 1 : 10}
                    />
                    <button
                      type="button"
                      aria-label={t("password")}
                      aria-pressed={show}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              )}
              {(mode === "register" || mode === "reset-password") && (
                <small className="muted">{t("passwordHint")}</small>
              )}
              {mode === "register" && (
                <>
                  <Field label={t("confirmPassword")}>
                    <input
                      {...register("confirmPassword")}
                      type="password"
                      required
                      autoComplete="new-password"
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label={t("university")}>
                      <input
                        {...register("university")}
                        autoComplete="organization"
                      />
                    </Field>
                    <Field label={t("year")}>
                      <input
                        {...register("year")}
                        type="number"
                        min={1}
                        max={8}
                        required
                      />
                    </Field>
                  </div>
                </>
              )}
              {mode === "login" && (
                <div className="form-between">
                  <label className="checkbox">
                    <input type="checkbox" {...register("remember")} />
                    {t("remember")}
                  </label>
                  <Link href="/forgot-password">{t("forgot")}</Link>
                </div>
              )}
              {error && (
                <p role="alert" className="error-text">
                  {t(error)}
                </p>
              )}
              <Button className="full" disabled={busy}>
                {busy ? (
                  <Busy />
                ) : (
                  <>
                    {t(heading)}
                    <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </form>
          )}
          <p className="auth-bottom">
            {mode === "login" ? (
              <>
                {t("noAccount")} <Link href="/register">{t("register")}</Link>
              </>
            ) : mode === "register" ? (
              <>
                {t("haveAccount")} <Link href="/login">{t("login")}</Link>
              </>
            ) : (
              <Link href="/login">{t("backLogin")}</Link>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
