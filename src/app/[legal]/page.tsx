"use client";
import { use } from "react";
import Link from "next/link";
import { useI18n } from "@/components/providers";
import { Logo } from "@/components/landing";
import { LanguageSwitch } from "@/components/language-switch";
import { notFound } from "next/navigation";
export default function Legal({
  params,
}: {
  params: Promise<{ legal: string }>;
}) {
  const { legal } = use(params);
  const { t } = useI18n();
  if (!["privacy", "terms"].includes(legal)) notFound();
  return (
    <main className="legal">
      <header>
        <Logo />
        <LanguageSwitch />
      </header>
      <h1>{t(legal)}</h1>
      <p>{t(`${legal}Text`)}</p>
      <Link href="/">← {t("back")}</Link>
    </main>
  );
}
