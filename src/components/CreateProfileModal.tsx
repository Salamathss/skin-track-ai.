import { useState } from "react";
import { X, Plus, Loader2, User } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GENDERS = [
  { value: "female", labelEn: "Female", labelRu: "Женский", icon: "👩" },
  { value: "male", labelEn: "Male", labelRu: "Мужской", icon: "👨" },
  { value: "other", labelEn: "Other", labelRu: "Другой", icon: "🧑" },
];

export default function CreateProfileModal({ open, onClose }: Props) {
  const { createProfile, setActiveProfile } = useProfile();
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("other");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const profile = await createProfile(trimmed, gender);
    setSaving(false);
    if (profile) {
      setActiveProfile(profile);
      toast.success(`Profile "${trimmed}" created`);
      setName("");
      setGender("other");
      onClose();
    } else {
      toast.error("Failed to create profile");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t("profile_new")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("profile_name")}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("profile_namePlaceholder")}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-4"
        />

        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("profile_gender")}
        </label>
        <div className="flex gap-2 mb-5">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                gender === g.value
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span className="text-2xl">{g.icon}</span>
              <span className={`text-xs font-medium ${gender === g.value ? "text-primary" : "text-muted-foreground"}`}>
                {i18n.language === "ru" ? g.labelRu : g.labelEn}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("profile_cancel")}
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("profile_create")}
          </button>
        </div>
      </div>
    </div>
  );
}
