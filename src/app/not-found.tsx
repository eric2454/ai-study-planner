"use client";
import Link from "next/link";
import { useI18n } from "@/components/providers";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="error-page">
      <span className="eyebrow">404</span>
      <h1>{t("notFound")}</h1>
      <Button asChild>
        <Link href="/dashboard">{t("dashboard")}</Link>
      </Button>
    </main>
  );
}
