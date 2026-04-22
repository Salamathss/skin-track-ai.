import { useState } from "react";
import { CheckCircle2, Circle, Plus, Loader2, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { localizeReminderTask } from "@/lib/taskTranslations";

interface SkincareStep {
  step: string;
  category: string;
}

interface ReminderRow {
  id: string;
  task_name: string;
  is_completed: boolean;
  category: string;
  is_manual: boolean;
}

interface Props {
  scanId: string;
  steps: SkincareStep[];
}

export default function RoutineChecklist({ scanId, steps }: Props) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [items, setItems] = useState<ReminderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  // Initialize items from AI steps on first render
  useState(() => {
    if (!user || !scanId) return;
    // Check if reminders already exist for this scan
    supabase
      .from("skin_reminders")
      .select("*")
      .eq("scan_id", scanId)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (data && data.length > 0) {
          setItems(data as unknown as ReminderRow[]);
        } else {
          // Insert AI-generated steps
          const rows = steps.map((s) => ({
            user_id: user.id,
            profile_id: activeProfile?.id ?? null,
            scan_id: scanId,
            task_name: s.step,
            category: s.category || "General",
            is_completed: false,
            is_manual: false,
          }));
          supabase
            .from("skin_reminders")
            .insert(rows as any)
            .select()
            .then(({ data: inserted, error: insertErr }) => {
              if (insertErr) console.error(insertErr);
              else setItems((inserted ?? []) as unknown as ReminderRow[]);
            });
        }
        setLoaded(true);
      });
  });

  const toggleItem = async (id: string, current: boolean) => {
    const next = !current;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: next } : i)));
    const { error } = await supabase
      .from("skin_reminders")
      .update({ is_completed: next } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: current } : i)));
    }
  };

  const addManualTask = async () => {
    if (!newTask.trim() || !user) return;
    setAddingManual(true);
    const { data, error } = await supabase
      .from("skin_reminders")
      .insert({
        user_id: user.id,
        profile_id: activeProfile?.id ?? null,
        scan_id: scanId,
        task_name: newTask.trim(),
        category: "Custom",
        is_completed: false,
        is_manual: true,
      } as any)
      .select()
      .single();
    if (error) toast.error("Failed to add task");
    else {
      setItems((prev) => [...prev, data as unknown as ReminderRow]);
      setNewTask("");
    }
    setAddingManual(false);
  };

  const completed = items.filter((i) => i.is_completed).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const morningItems = items.filter((i) => i.category === "Morning");
  const eveningItems = items.filter((i) => i.category === "Evening");
  const otherItems = items.filter((i) => i.category !== "Morning" && i.category !== "Evening");

  const renderItem = (item: ReminderRow) => (
    <button
      key={item.id}
      onClick={() => toggleItem(item.id, item.is_completed)}
      className="flex items-start gap-3 w-full text-left p-3 min-h-[44px] rounded-xl hover:bg-muted/50 transition-colors group"
    >
      {item.is_completed ? (
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 flex-shrink-0 mt-0.5 transition-colors" />
      )}
      <span
        className={`text-sm transition-all duration-300 flex-1 min-w-0 break-words ${
          item.is_completed ? "line-through text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {localizeReminderTask(item.task_name, lang)}
      </span>
    </button>
  );

  const renderSection = (title: string, icon: React.ReactNode, sectionItems: ReminderRow[]) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="space-y-1 mt-6 first:mt-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2.5 px-3 pt-3 pb-1">
          <span className="flex-shrink-0">{icon}</span>
          {title}
        </p>
        {sectionItems.map(renderItem)}
      </div>
    );
  };

  if (!loaded) {
    return (
      <div className="glass-card p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("routine_loading")}</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-primary font-semibold uppercase tracking-wide">{t("routine_title")}</p>
        <span className="text-xs text-muted-foreground font-medium">
          {t("rem_done", { completed, total })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3">
        {renderSection(t("rem_morning"), <Sun className="w-3 h-3" />, morningItems)}
        {renderSection(t("rem_evening"), <Moon className="w-3 h-3" />, eveningItems)}
        {otherItems.length > 0 && (
          <div className="space-y-1">
            {otherItems.map(renderItem)}
          </div>
        )}
      </div>

      {/* Add manual note */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManualTask()}
            placeholder={t("routine_addNote")}
            className="flex-1 text-sm bg-muted/50 border border-border rounded-xl px-3 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={addManualTask}
            disabled={!newTask.trim() || addingManual}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {addingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("rem_add")}
          </button>
        </div>
      </div>
    </div>
  );
}
