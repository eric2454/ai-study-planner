"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { Button } from "./ui/button";
import { Profile } from "./profile";
import { Subjects } from "./subjects";
import { Settings } from "./settings";
import { Tasks } from "./tasks";
export function Onboarding() {
  const { t } = useI18n(),
    { mutate } = useWorkspace(),
    router = useRouter();
  const [step, setStep] = useState(1);
  const done = async () => {
    try {
      await mutate({ action: "onboarded" }, true);
      router.push("/dashboard");
    } catch {}
  };
  return (
    <>
      <div className="onboarding-header">
        <span className="icon-tile purple">
          <Sparkles />
        </span>
        <h1>{t("onboarding")}</h1>
        <p>{t("onboardingSub")}</p>
        <div className="onboarding-steps">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setStep(n)}
              className={step >= n ? "selected" : ""}
            >
              {step > n ? <Check size={15} /> : n}
              <span>{t(`step${n}`)}</span>
            </button>
          ))}
        </div>
      </div>
      {step === 1 ? (
        <Profile />
      ) : step === 2 ? (
        <Subjects />
      ) : step === 3 ? (
        <Settings studyOnly />
      ) : step === 4 ? (
        <Tasks />
      ) : (
        <div className="card onboarding-ready">
          <Sparkles size={40} />
          <h2>{t("step5")}</h2>
          <p>{t("plannerSub")}</p>
          <Button asChild>
            <Link href="/ai-planner">
              {t("generate")}
              <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      )}
      <div className="onboarding-actions">
        <Button variant="ghost" onClick={() => void done()}>
          {t("skipOnboarding")}
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t("continue")}
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button onClick={() => void done()}>{t("finish")}</Button>
        )}
      </div>
    </>
  );
}
