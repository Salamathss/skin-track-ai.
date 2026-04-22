import { useEffect, useState, useMemo, useCallback } from "react";
import { Camera, TrendingUp, TrendingDown, Bell, ArrowRight, Loader2, Droplets, Sun, Zap, Package, Sparkles, CheckCircle2, AlertTriangle, GitCompareArrows, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { format } from "date-fns";
import { calculateExpiration, getStatusColor, getStatusBg } from "@/lib/shelfUtils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import EnvironmentalShield from "@/components/EnvironmentalShield";
import CreateProfileModal from "@/components/CreateProfileModal";

interface SkinScan {
  id: string;
  score: number | null;
  skin_type: string | null;
  primary_concern: string | null;
  oiliness: number | null;
  hydration: number | null;
  sensitivity: number | null;
  created_at: string;
}

interface SkinReminder {
  id: string;
  task_name: string;
  is_completed: boolean;
  category: string;
  created_at: string;
}

interface ShelfProduct {
  id: string;
  product_name: string;
  brand: string | null;
  category: string;
  opened_at: string | null;
  shelf_life_months: number | null;
  is_active: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profiles, activeProfile, setActiveProfile, loading: profileLoading } = useProfile();
  const { t } = useTranslation();
  const [scans, setScans] = useState<SkinScan[]>([]);
  const [reminders, setReminders] = useState<SkinReminder[]>([]);
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);

  const getGenderAvatar = (gender: string | null) => {
    switch (gender) {
      case "female":
        return "👩";
      case "male":
        return "👨";
      default:
        return "🧑";
    }
  };

  const loadData = useCallback(async () => {
    if (!user || !activeProfile) return;
    const [scansRes, remindersRes, productsRes] = await Promise.all([
      supabase
        .from("skin_scans")
        .select("id, score, skin_type, primary_concern, oiliness, hydration, sensitivity, created_at")
        .eq("profile_id", activeProfile.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("skin_reminders")
        .select("id, task_name, is_completed, category, created_at")
        .eq("profile_id", activeProfile.id)
        .order("is_completed", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(10),
      supabase
        .from("cosmetic_shelf")
        .select("id, product_name, brand, category, opened_at, shelf_life_months, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setScans((scansRes.data as SkinScan[]) || []);
    setReminders((remindersRes.data as SkinReminder[]) || []);
    setProducts((productsRes.data as ShelfProduct[]) || []);
  }, [user, activeProfile]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleCompleteReminder = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic update
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, is_completed: nextStatus } : r));
    await supabase.from("skin_reminders").update({ is_completed: nextStatus }).eq("id", id);
    // Explicit reload to ensure sync
    loadData();
  };

  const addTipToRoutine = async () => {
    if (!user || !activeProfile || !aiTip) return;
    try {
      // Duplicate check
      const { data: existing } = await supabase
        .from("skin_reminders")
        .select("id")
        .eq("profile_id", activeProfile.id)
        .eq("task_name", aiTip)
        .eq("is_completed", false)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info(t("already_in_plan") || "Already in plan");
        return;
      }

      const { error } = await supabase.from("skin_reminders").insert({
        user_id: user.id,
        profile_id: activeProfile.id,
        task_name: aiTip,
        category: "Custom",
        is_completed: false,
        is_manual: true
      })
        .select()
        .single();
      if (error) throw error;
      toast.success(t("scan_addedToReminders"));
      loadData();
    } catch (err) {
      toast.error("Failed to add to routine");
    }
  };

  const latest = scans.length > 0 ? scans[0] : null;
  const previous = scans.length > 1 ? scans[1] : null;
  const currentScore = latest?.score ?? 0;
  const change = previous?.score != null ? currentScore - previous.score : 0;
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;
  const scoreLabel = currentScore <= 30 ? t("dash_good") : currentScore <= 60 ? t("dash_moderate") : t("dash_needsAttention");

  // Shelf highlight: find nearest expiring product
  const expiringProduct = useMemo(() => {
    let nearest: { product: ShelfProduct; daysLeft: number | null; status: string } | null = null;
    for (const p of products) {
      if (!p.opened_at || !p.shelf_life_months) continue;
      const { daysLeft, status } = calculateExpiration(p.opened_at, p.shelf_life_months);

      if (!nearest || (daysLeft !== null && (nearest.daysLeft === null || daysLeft < nearest.daysLeft))) {
        nearest = { product: p, daysLeft, status };
      }
    }
    return nearest;
  }, [products]);

  // AI tip based on skin type
  const aiTip = useMemo(() => {
    if (!latest) return t("dash_aiTipDefault");
    const hydration = latest.hydration ?? 50;
    const oiliness = latest.oiliness ?? 50;
    const sensitivity = latest.sensitivity ?? 50;
    if (hydration < 35) return t("dash_aiTipDry");
    if (oiliness > 65) return t("dash_aiTipOily");
    if (sensitivity > 65) return t("dash_aiTipSensitive");
    return t("dash_aiTipDefault");
  }, [latest, t]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = scans.length > 0;
  const nextReminder = reminders.length > 0 ? reminders[0] : null;

  const widgetClass = "bg-card/70 backdrop-blur-sm border border-border/40 rounded-3xl shadow-card p-6 transition-all duration-300 hover:shadow-elevated";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl py-6">
        <div className="md:hidden mb-4 animate-fade-in">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {profiles.map((profile) => {
              const isActive = activeProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full whitespace-nowrap min-h-[44px] transition-all border ${isActive
                      ? "gradient-primary text-primary-foreground border-primary/40"
                      : "bg-card text-foreground border-border/60"
                    }`}
                >
                  <span className="text-base">{getGenderAvatar(profile.gender)}</span>
                  <span className="text-sm font-medium max-w-[120px] truncate">{profile.profile_name}</span>
                </button>
              );
            })}
            <button
              onClick={() => setCreateProfileOpen(true)}
              className="flex items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-11 h-11 min-h-[44px] min-w-[44px]"
              aria-label={t("profile_new")}
            >
              +
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground font-medium">{activeProfile?.profile_name ?? "Profile"} 👋</p>
              {activeProfile?.is_premium && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  <Crown className="w-2.5 h-2.5 fill-amber-500" />
                  Pro
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("dash_title")}</h1>
          </div>
          <Link to="/upload" className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-2xl shadow-soft hover:opacity-90 transition-opacity">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{t("dash_newScan")}</span>
          </Link>
        </div>

        {!hasData ? (
          <div className={`${widgetClass} p-12 text-center animate-fade-in`}>
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("dash_noScans")}</h2>
            <p className="text-muted-foreground mb-6">{t("dash_noScansDesc", { name: activeProfile?.profile_name })}</p>
            <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-2xl shadow-soft hover:opacity-90 transition-opacity">
              <Camera className="w-4 h-4" />
              {t("dash_firstScan")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Widget A: Skin Status */}
            <div className={`${widgetClass} animate-fade-in`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                  <Sun className="w-4 h-4 text-primary-foreground" />
                </div>
                <h2 className="font-semibold text-base">{t("dash_skinStatus")}</h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 1s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{currentScore}</span>
                    <span className="text-[10px] text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-bold ${currentScore <= 30 ? "text-severity-low" : currentScore <= 60 ? "text-severity-medium" : "text-severity-high"}`}>{scoreLabel}</p>
                  {change !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {change < 0 ? <TrendingDown className="w-4 h-4 text-severity-low" /> : <TrendingUp className="w-4 h-4 text-severity-high" />}
                      <span className={`text-sm font-semibold ${change < 0 ? "text-severity-low" : "text-severity-high"}`}>{change > 0 ? "+" : ""}{change} pts</span>
                    </div>
                  )}
                  {/* Mini metrics */}
                  <div className="mt-3 space-y-2">
                    {[
                      { label: t("dash_hydration"), value: latest?.hydration, icon: <Droplets className="w-3 h-3" />, color: "bg-blue-400" },
                      { label: t("dash_oiliness"), value: latest?.oiliness, icon: <Sun className="w-3 h-3" />, color: "bg-amber-400" },
                      { label: t("dash_sensitivity"), value: latest?.sensitivity, icon: <Zap className="w-3 h-3" />, color: "bg-red-400" },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-2">
                        <span className="text-muted-foreground">{m.icon}</span>
                        <span className="text-[11px] text-muted-foreground w-16 truncate">{m.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value ?? 0}%`, transition: "width 1s ease" }} />
                        </div>
                        <span className="text-[11px] font-bold w-5 text-right">{m.value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/upload" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                    <Camera className="w-3 h-3" />
                    {t("dash_quickScan")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Widget B: Next Step / Reminder */}
            <div className={`${widgetClass} animate-fade-in delay-100`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-semibold text-base">{t("dash_nextStep")}</h2>
              </div>
              {nextReminder ? (
                <div className="space-y-3">
                  {reminders.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 group">
                      <button
                        onClick={() => handleCompleteReminder(r.id, r.is_completed)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${r.is_completed
                            ? "bg-primary border-primary shadow-soft"
                            : "border-primary/50 hover:bg-primary/10 hover:border-primary group-hover:border-primary text-transparent"
                          }`}
                      >
                        <CheckCircle2 className={`w-3 h-3 text-primary-foreground transition-opacity duration-300 ${r.is_completed ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug transition-all duration-300 ${r.is_completed ? "line-through opacity-50 text-muted-foreground" : ""}`}>{r.task_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.category}</p>
                      </div>
                    </div>
                  ))}
                  <Link to="/reminders" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-1">
                    {t("dash_manage")} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Sparkles className="w-8 h-8 text-accent/60 mb-2" />
                  <p className="text-[11px] text-muted-foreground mb-3 px-2 italic">
                    {aiTip}
                  </p>
                  <button
                    onClick={addTipToRoutine}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 text-accent text-sm font-bold rounded-2xl hover:bg-accent/20 transition-all border border-accent/20 group"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {t("rem_add") || "Add to plan"}
                  </button>
                </div>
              )}
            </div>

            {/* Widget C: Shelf Highlight */}
            <div className={`${widgetClass} animate-fade-in delay-200`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <Package className="w-4 h-4 text-secondary-foreground" />
                </div>
                <h2 className="font-semibold text-base">{t("dash_shelfHighlight")}</h2>
              </div>
              {expiringProduct ? (
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border ${getStatusBg(expiringProduct.status as any)} ${getStatusColor(expiringProduct.status as any)}`}>
                    {expiringProduct.status === 'expired' || expiringProduct.status === 'critical' ? "!" : expiringProduct.daysLeft}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{expiringProduct.product.product_name}</p>
                    <p className="text-xs text-muted-foreground">{expiringProduct.product.brand ?? expiringProduct.product.category}</p>
                    <p className={`text-xs font-semibold mt-1 ${getStatusColor(expiringProduct.status as any)}`}>
                      {expiringProduct.status === 'expired' ? t("shelf_expired") : t("dash_expiresIn", { days: expiringProduct.daysLeft })}
                    </p>
                  </div>
                  {(expiringProduct.status === 'critical' || expiringProduct.status === 'expired') && (
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${expiringProduct.status === 'expired' ? 'text-destructive' : 'text-severity-medium'}`} />
                  )}
                </div>
              ) : products.length > 0 ? (
                <div className="flex items-center gap-3 py-4">
                  <CheckCircle2 className="w-8 h-8 text-severity-low" />
                  <p className="text-sm text-muted-foreground">{t("dash_allFresh")}</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">{t("shelf_empty")}</p>
                  <Link to="/shelf" className="text-xs font-semibold text-primary hover:underline">{t("shelf_addFirst")}</Link>
                </div>
              )}
              {products.length > 0 && (
                <Link to="/shelf" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-3">
                  {t("nav_shelf")} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Widget D: Environmental Shield */}
            <EnvironmentalShield />

            {/* Widget E: AI Insight */}
            <div className={`${widgetClass} animate-fade-in delay-300`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                </div>
                <h2 className="font-semibold text-base">{t("dash_aiInsight")}</h2>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{aiTip}</p>

              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={addTipToRoutine}
                  className="w-fit flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent text-xs font-bold rounded-xl hover:bg-accent/20 transition-all border border-accent/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("rem_add") || "Add to plan"}
                </button>

                {latest && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                    <div className="text-xs text-muted-foreground">
                      {t("dash_skinType")}: <span className="font-semibold text-foreground">{latest.skin_type ?? "—"}</span>
                    </div>
                    {latest.primary_concern && (
                      <div className="text-xs text-muted-foreground">
                        ⚠️ {latest.primary_concern}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compare Progress CTA */}
        {hasData && scans.length >= 2 && (
          <Link
            to="/progress"
            className={`${widgetClass} mt-5 flex items-center gap-4 hover:shadow-elevated animate-fade-in delay-400`}
          >
            <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center flex-shrink-0">
              <GitCompareArrows className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{t("progress_compareBtn")}</p>
              <p className="text-xs text-muted-foreground">{t("progress_needMoreDesc")}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </Link>
        )}

        {/* CTA */}
        {hasData && (
          <div className="mt-5 gradient-primary rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-elevated animate-fade-in delay-400">
            <div className="text-primary-foreground">
              <p className="font-semibold text-lg">{t("dash_readyNext")}</p>
              <p className="text-primary-foreground/80 text-sm mt-1">{t("dash_readyNextSub")}</p>
            </div>
            <Link to="/upload" className="flex items-center gap-2 px-6 py-3 bg-card text-primary font-semibold rounded-2xl shadow-soft hover:bg-muted transition-colors flex-shrink-0">
              <Camera className="w-4 h-4" />
              {t("dash_uploadPhoto")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <CreateProfileModal open={createProfileOpen} onClose={() => setCreateProfileOpen(false)} />
      </div>
    </div>
  );
}
