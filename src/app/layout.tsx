import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "@fontsource-variable/inter";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "AI Study Planner", template: "%s · AI Study Planner" },
  description:
    "Студенттің оқу тапсырмаларын интеллектуалды жоспарлау жүйесі — intelligent academic planning.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const saved = jar.get("language")?.value;
  const lang = saved === "en" || saved === "ru" ? saved : "kk";
  const dark = jar.get("theme")?.value === "dark";
  return (
    <html
      lang={lang}
      className={dark ? "dark" : ""}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <Providers initialLang={lang} initialDark={dark}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
