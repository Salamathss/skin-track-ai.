import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggle = () => {
    const next = i18n.language === "en" ? "ru" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("skintrack-lang", next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={i18n.language === "en" ? t("lang_ru") : t("lang_en")}
    >
      <Globe className="w-3.5 h-3.5" />
      {i18n.language === "en" ? "RU" : "EN"}
    </button>
  );
}
