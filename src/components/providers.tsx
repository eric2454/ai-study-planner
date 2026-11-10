"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Toaster } from "sonner";
import { dictionaries, type Language, type Key } from "@/i18n";
import { kk, ru, enGB } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
export const dateLocales = { kk, ru, en: enGB };
type Context = {
  lang: Language;
  setLang: (v: Language) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  t: (k: Key | string) => string;
  date: (v: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  timezone: string;
  setTimezone: (v: string) => void;
};
const C = createContext<Context>(null!);
export function Providers({
  children,
  initialLang = "kk",
  initialDark = false,
}: {
  children: React.ReactNode;
  initialLang?: Language;
  initialDark?: boolean;
}) {
  const [lang, setLanguage] = useState<Language>(initialLang),
    [dark, setDarkMode] = useState(initialDark),
    [timezone, setTimezone] = useState("Asia/Almaty");
  useEffect(() => {
    const load = () => {
      const l = localStorage.getItem("language");
      if (l === "en" || l === "ru" || l === "kk") setLanguage(l);
      setDarkMode(localStorage.getItem("theme") === "dark");
    };
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.ready = "true";
    });
    window.addEventListener("storage", load);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", load);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("dark", dark);
  }, [lang, dark]);
  const setLang = useCallback((v: Language) => {
    setLanguage(v);
    localStorage.setItem("language", v);
    document.cookie = `language=${v}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);
  const setDark = useCallback((v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("theme", v ? "dark" : "light");
    document.cookie = `theme=${v ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);
  const t = (key: Key | string) => dictionaries[lang][key as Key] ?? key;
  const date = (
    v: string | Date,
    o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
  ) => {
    const pattern = o.hour
      ? `HH${o.minute ? ":mm" : ""}`
      : [
          o.weekday ? (o.weekday === "long" ? "EEEE," : "EEE,") : "",
          o.day ? "d" : "",
          o.month
            ? o.month === "long"
              ? "MMMM"
              : o.month === "short"
                ? "MMM"
                : "MM"
            : "",
          o.year ? "yyyy" : "",
        ]
          .filter(Boolean)
          .join(" ");
    return formatInTimeZone(new Date(v), timezone, pattern || "d MMM", {
      locale: dateLocales[lang],
    });
  };
  return (
    <C.Provider
      value={{ lang, setLang, dark, setDark, t, date, timezone, setTimezone }}
    >
      {children}
      <Toaster
        richColors
        position="bottom-right"
        theme={dark ? "dark" : "light"}
      />
    </C.Provider>
  );
}
export const useI18n = () => useContext(C);
