import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Clock, Sun, Moon, Droplets, Loader2, CheckCircle2, Circle, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { localizeReminderTask, translateDay, normalizeToEnglish, normalizeCategoryToEnglish } from "@/lib/taskTranslations";

type Reminder = {
  id: string;
  time: string;
  label: string;
  icon: string;
  enabled: boolean;
  days: string[];
};

interface SkinReminder {
  id: string;
  task_name: string;
  is_completed: boolean;
  category: string;
  is_manual: boolean;
  created_at: string;
}

const daysList: string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iconMap: Record<string, { icon: typeof Sun; bg: string; text: string }> = {
  sun:  { icon: Sun,      bg: "bg-amber-100",    text: "text-amber-600" },
  moon: { icon: Moon,     bg: "bg-indigo-100",   text: "text-indigo-600" },
  drop: { icon: Droplets, bg: "bg-primary-light", text: "text-primary" },
};

export default function Reminders() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [skinReminders, setSkinReminders] = useState<SkinReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("08:00");

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [remRes, skinRes] = await Promise.all([
        supabase.from("reminders").select("*").order("time", { ascending: true }),
        supabase
          .from("skin_reminders")
          .select("*")
          .eq("profile_id", activeProfile?.id ?? "")
          .order("created_at", { ascending: false }),
      ]);
      if (remRes.error) console.error(remRes.error);
      if (skinRes.error) console.error(skinRes.error);
      setReminders(remRes.data || []);
      const skinData = (skinRes.data ?? []) as unknown as SkinReminder[];
      setSkinReminders(skinData);
      setLoading(false);

      // Retroactive cleanup: normalize mixed-language entries to English
      for (const item of skinData) {
        const normalizedName = normalizeToEnglish(item.task_name);
        const normalizedCat = normalizeCategoryToEnglish(item.category);
        if (
          (normalizedName && normalizedName !== item.task_name) ||
          normalizedCat !== item.category
        ) {
          const updates: Record<string, string> = {};
          if (normalizedName && normalizedName !== item.task_name) updates.task_name = normalizedName;
          if (normalizedCat !== item.category) updates.category = normalizedCat;
          
          supabase
            .from("skin_reminders")
            .update(updates as any)
            .eq("id", item.id)
            .then(() => {
              setSkinReminders((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, task_name: normalizedName || i.task_name, category: normalizedCat }
                    : i
                )
              );
            });
        }
      }
    };
    fetchAll();
  }, [user, activeProfile]);

  const toggle = async (id: string, currentEnabled: boolean) => {
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    const { error } = await supabase.from("reminders").update({ enabled: !currentEnabled }).eq("id", id);
    if (error) {
      toast.error("Failed to update reminder");
      setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: currentEnabled } : r)));
    }
  };

  const remove = async (id: string) => {
    const prev = reminders;
    setReminders((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete reminder");
      setReminders(prev);
    }
  };

  const toggleDay = async (id: string, day: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;
    const newDays = reminder.days.includes(day) ? reminder.days.filter((d) => d !== day) : [...reminder.days, day];
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, days: newDays } : r)));
    const { error } = await supabase.from("reminders").update({ days: newDays }).eq("id", id);
    if (error) {
      toast.error("Failed to update days");
      setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, days: reminder.days } : r)));
    }
  };

  const addReminder = async () => {
    if (!newLabel.trim() || !user) return;
    const newReminder = { user_id: user.id, time: newTime, label: newLabel.trim(), icon: "drop", enabled: true, days: daysList };
    const { data, error } = await supabase.from("reminders").insert(newReminder).select().single();
    if (error) toast.error("Failed to add reminder");
    else {
      setReminders((rs) => [...rs, data]);
      setNewLabel("");
      setShowAdd(false);
    }
  };

  const toggleSkinReminder = async (id: string, current: boolean) => {
    const next = !current;
    setSkinReminders((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: next } : i)));
    const { error } = await supabase.from("skin_reminders").update({ is_completed: next } as any).eq("id", id);
    if (error) {
      toast.error("Failed to update");
      setSkinReminders((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: current } : i)));
    }
  };

  const clearAllSkinReminders = async () => {
    if (!activeProfile) return;
    const prev = skinReminders;
    setSkinReminders([]);
    const { error } = await supabase.from("skin_reminders").delete().eq("profile_id", activeProfile.id);
    if (error) {
      toast.error("Failed to clear");
      setSkinReminders(prev);
    }
  };

  const enabled = reminders.filter((r) => r.enabled).length;
  const completedSkin = skinReminders.filter((s) => s.is_completed).length;
  const totalSkin = skinReminders.length;
  const skinProgress = totalSkin > 0 ? (completedSkin / totalSkin) * 100 : 0;

  const morningItems = skinReminders.filter((i) => i.category === "Morning");
  const eveningItems = skinReminders.filter((i) => i.category === "Evening");
  const otherItems = skinReminders.filter((i) => i.category !== "Morning" && i.category !== "Evening");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSkinItem = (item: SkinReminder) => (
    <button
      key={item.id}
      onClick={() => toggleSkinReminder(item.id, item.is_completed)}
      className="flex items-start gap-3 w-full text-left p-3 min-h-[44px] rounded-xl hover:bg-muted/50 transition-colors group"
    >
      {item.is_completed ? (
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 flex-shrink-0 mt-0.5 transition-colors" />
      )}
      <span className={`text-sm transition-all duration-300 flex-1 min-w-0 break-words ${item.is_completed ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
        {localizeReminderTask(item.task_name, lang)}
      </span>
    </button>
  );

  const renderSection = (title: string, icon: React.ReactNode, items: SkinReminder[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1 mt-6 first:mt-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2.5 px-3 pt-3 pb-1">
          <span className="flex-shrink-0">{icon}</span> {title}
        </p>
        {items.map(renderSkinItem)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-[200px] md:pb-10 pt-16 md:pt-0">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl py-8 pb-32">
        {/* Skin Routine Checklist */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">{t("rem_skinRoutine")}</h2>
            </div>
            {totalSkin > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">
                  {t("rem_done", { completed: completedSkin, total: totalSkin })}
                </span>
                <button
                  onClick={clearAllSkinReminders}
                  className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                >
                  {t("rem_clearAll")}
                </button>
              </div>
            )}
          </div>

          {totalSkin > 0 ? (
            <div className="glass-card p-5 border border-primary/20">
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${skinProgress}%` }}
                />
              </div>
              <div className="space-y-2">
                {renderSection(t("rem_morning"), <Sun className="w-3 h-3" />, morningItems)}
                {renderSection(t("rem_evening"), <Moon className="w-3 h-3" />, eveningItems)}
                {otherItems.length > 0 && <div className="space-y-1">{otherItems.map(renderSkinItem)}</div>}
              </div>
            </div>
          ) : (
            <div className="glass-card p-10 text-center">
              <ListChecks className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold mb-1">{t("rem_noRoutine")}</p>
              <p className="text-muted-foreground text-sm">{t("rem_noRoutineSub")}</p>
            </div>
          )}
        </div>

        {/* Daily Reminders */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold">{t("rem_title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t("rem_activeReminders", { count: enabled })}</p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("rem_add")}
          </button>
        </div>

        {showAdd && (
          <div className="glass-card p-5 mb-6 border border-primary/20 animate-scale-in">
            <h3 className="font-semibold mb-4">{t("rem_newReminder")}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t("rem_placeholder")}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                  {t("rem_cancel")}
                </button>
                <button onClick={addReminder} className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity">
                  {t("rem_addReminder")}
                </button>
              </div>
            </div>
          </div>
        )}

        {reminders.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold text-lg mb-1">{t("rem_noReminders")}</p>
            <p className="text-muted-foreground text-sm">{t("rem_noRemindersSub")}</p>
          </div>
        )}

        <div className="space-y-3">
          {reminders.map((r, i) => {
            const { icon: Icon, bg, text } = iconMap[r.icon] || iconMap.drop;
            return (
              <div key={r.id} className={`glass-card p-5 transition-all duration-300 animate-fade-in ${!r.enabled ? "opacity-60" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${!r.enabled ? "line-through text-muted-foreground" : ""}`}>{r.label}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {r.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggle(r.id, r.enabled)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${r.enabled ? "gradient-primary" : "bg-muted"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-card rounded-full shadow transition-all duration-300 ${r.enabled ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {daysList.map((day) => {
                    const active = r.days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(r.id, day)}
                        className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary-light hover:text-primary"}`}
                      >
                        {translateDay(day, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted rounded-2xl mt-6 animate-fade-in delay-500">
          <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{t("rem_tip")}</p>
        </div>
      </div>
    </div>
  );
}
