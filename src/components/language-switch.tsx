"use client";
import { Languages } from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n(),
    workspace = useWorkspace();
  return (
    <label className="language-switch">
      <Languages size={16} />
      <select
        aria-label={t("language")}
        value={lang}
        onChange={(e) => {
          const language = e.target.value as typeof lang;
          setLang(language);
          if (workspace?.data.user.settings)
            void workspace
              .mutate(
                {
                  action: "settings",
                  data: { ...workspace.data.user.settings, language },
                },
                true,
              )
              .catch(() => {});
        }}
      >
        <option value="kk">Қазақша</option>
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
