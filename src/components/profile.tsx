"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, GraduationCap } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Field, Busy } from "./ui/common";
import { Button } from "./ui/button";
import { PasswordForm } from "./settings";
export function Profile() {
  const { t } = useI18n(),
    { data, mutate, busy } = useWorkspace();
  const u = data.user;
  const [image, setImage] = useState(u.image ?? "");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("account")}</span>
          <h1>{t("profile")}</h1>
          <p>{t("authSub")}</p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="card profile-summary">
          <div
            className="profile-avatar"
            style={
              image
                ? {
                    backgroundImage: `url("${image}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!image && u.name.slice(0, 1)}
          </div>
          <h2>{u.name}</h2>
          <p>{u.email}</p>
          <span className="university">
            <GraduationCap size={18} />
            {u.university || t("university")}
          </span>
          <label className="btn btn-outline">
            <Camera size={17} />
            {t("avatar")}
            <input
              className="sr-only"
              aria-label={t("avatar")}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 280000) {
                  toast.error(t("invalidInput"));
                  return;
                }
                const r = new FileReader();
                r.onload = () => setImage(String(r.result));
                r.readAsDataURL(f);
              }}
            />
          </label>
        </section>
        <div>
          <form
            className="card settings-card"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await mutate({ action: "profile", data: { ...f, image } });
              } catch {}
            }}
          >
            <h2>{t("profile")}</h2>
            <Field label={t("email")}>
              <input value={u.email} disabled type="email" />
            </Field>
            <div className="form-grid">
              {(["name", "university", "faculty", "specialty"] as const).map(
                (k) => (
                  <Field label={t(k === "name" ? "fullName" : k)} key={k}>
                    <input
                      name={k}
                      defaultValue={u[k]}
                      required={k === "name"}
                    />
                  </Field>
                ),
              )}
              <Field label={t("year")}>
                <input
                  name="year"
                  type="number"
                  min={1}
                  max={8}
                  defaultValue={u.year}
                  required
                />
              </Field>
            </div>
            <Button disabled={busy}>{busy ? <Busy /> : t("save")}</Button>
          </form>
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
