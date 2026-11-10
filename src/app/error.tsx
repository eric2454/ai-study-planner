"use client";
import { useI18n } from "@/components/providers";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="error-page">
      <h1>{t("serverError")}</h1>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
