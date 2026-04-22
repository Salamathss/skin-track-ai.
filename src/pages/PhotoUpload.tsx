import { useState, useRef } from "react";
import { Camera, Upload, Shield, CheckCircle2, Loader2, AlertCircle, ArrowRight, RotateCcw, Droplets, Sun, Zap, Activity, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { analyzeSkinDirectly, type AnalysisResult } from "@/lib/gemini";
type Stage = "idle" | "preview" | "analyzing" | "result";

export default function PhotoUpload() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { t, i18n } = useTranslation();

  // GUEST MODE FALLBACK
  const guestProfile = { id: 'guest', profile_name: 'Guest User' };
  const currentProfile = activeProfile || (user ? null : guestProfile);
  const effectiveProfileName = activeProfile?.profile_name || (user ? "profile" : "Guest");

  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [addingToReminders, setAddingToReminders] = useState(false);
  const [addedToReminders, setAddedToReminders] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStage("preview");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const analyze = async () => {
    if (!file) {
      toast.error("Please select a photo first");
      return;
    }
    setStage("analyzing");
    try {
      // Convert file to base64 for direct Gemini analysis (Independent of server)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Image = await base64Promise;

      // Fetch user's routine state to decide if we need a full plan
      let isRoutineEmpty = false;
      let shelfData = [];
      
      if (user && activeProfile) {
        const remindersPromise = supabase
          .from("skin_reminders")
          .select("*", { count: 'exact', head: true })
          .eq("profile_id", activeProfile.id)
          .eq("is_completed", false);
          
        let shelfQuery = supabase
          .from("cosmetic_shelf")
          .select("product_name, brand, category, active_ingredients")
          .eq("profile_id", activeProfile.id)
          .eq("is_active", true);

        const [remindersRes, shelfRes] = await Promise.all([
          remindersPromise,
          shelfQuery
        ]);
        
        // Fallback for shelf if profile_id column is missing
        if (shelfRes.error && (shelfRes.error as any).code === "42703") {
          console.warn("profile_id missing on cosmetic_shelf, falling back to per-user fetch in PhotoUpload");
          const fallbackRes = await supabase
            .from("cosmetic_shelf")
            .select("product_name, brand, category, active_ingredients")
            .eq("user_id", user.id)
            .eq("is_active", true);
          shelfData = fallbackRes.data || [];
        } else {
          shelfData = shelfRes.data || [];
        }
        
        isRoutineEmpty = (remindersRes.count === 0);
      }

      // 1. Direct Gemini analysis - ALWAYS SHOW THIS
      const analysis = await analyzeSkinDirectly(base64Image, i18n.language, shelfData, isRoutineEmpty);

      // 2. Task: Save to history (if possible)
      const saveToHistory = async () => {
        try {
          const userId = user?.id || "guest-user";
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${userId}/${Date.now()}.${ext}`;

          // Try storage upload
          const { error: uploadError } = await supabase.storage.from("skin-photos").upload(path, file);
          if (uploadError) {
            console.warn("Storage upload failed (expected for guests):", uploadError);
            return;
          }

          const { data: insertedScan, error: insertError } = await supabase.from("skin_scans").insert({
            user_id: user?.id || null,
            profile_id: activeProfile?.id || null,
            photo_url: path,
            score: analysis.summary?.overall_score ?? analysis.score ?? 0,
            inflammation: analysis.metrics ? `${analysis.metrics.sensitivity}` : (analysis.inflammation ?? null),
            acne_type: analysis.summary?.type ?? (analysis.acne_type ?? null),
            zones: analysis.detailed_findings ?? (analysis.zones ?? null),
            recommendation: analysis.routine_adjustments?.join(" | ") ?? (analysis.recommendation ?? null),
            oiliness: analysis.metrics?.oiliness ?? null,
            hydration: analysis.metrics?.hydration ?? null,
            sensitivity: analysis.metrics?.sensitivity ?? null,
            skin_type: analysis.summary?.type ?? null,
            primary_concern: analysis.summary?.primary_concern ?? null,
            detailed_findings: analysis.detailed_findings ?? null,
            routine_adjustments: analysis.routine_adjustments ?? null,
          } as any).select().single();

          if (insertError) {
            console.error("Failed to save scan history:", insertError);
          } else {
            setScanId(insertedScan?.id ?? null);
          }
        } catch (bgErr) {
          console.error("Background save task failed:", bgErr);
        }
      };

      // We await the save task to ensure we have a scanId when the result screen appears
      await saveToHistory();

      setResult(analysis);
      setStage("result");

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      toast.error(err.message || "Analysis failed. Please try again.");
      setStage("preview");
    }
  };

  const addToReminders = async () => {
    if (!result?.skincare_steps || !scanId) {
      if (!scanId) {
        toast.error("Scan results not fully saved yet. Please wait a moment.");
      }
      return;
    }
    setAddingToReminders(true);
    try {
      // 1. Fetch existing tasks to avoid duplicates
      const { data: existingTasks } = await supabase
        .from("skin_reminders")
        .select("task_name, category")
        .eq("profile_id", activeProfile.id)
        .eq("is_completed", false);

      const existingSet = new Set(existingTasks?.map(t => `${t.task_name}|${t.category}`) || []);

      const rows = result.skincare_steps?.filter(s => {
        const key = `${s.step}|${s.category}`;
        return !existingSet.has(key);
      }).map((s) => ({
        user_id: user?.id || "guest",
        profile_id: activeProfile?.id || null,
        scan_id: scanId,
        task_name: s.step,
        category: s.category || "General",
        is_completed: false,
        is_manual: false,
      }));

      if (!rows || rows.length === 0) {
        toast.info("All recommended steps are already in your plan.");
        setAddedToReminders(true);
        return;
      }

      const { error } = await supabase.from("skin_reminders").insert(rows as any);
      if (error) throw error;
      setAddedToReminders(true);
      toast.success(t("scan_addedToReminders"));
    } catch (err: any) {
      console.error("Failed to add reminders:", err);
      toast.error(err.message || "Failed to add to your plan");
    } finally {
      setAddingToReminders(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setScanId(null);
    setAddedToReminders(false);
    setStage("idle");
  };

  const score = result?.summary?.overall_score ?? 0;
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const metricBar = (label: string, value: number, icon: React.ReactNode, color: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  const analyzeSteps = [t("scan_tZone"), t("scan_poreDetection"), t("scan_hydrationCheck"), t("scan_sensitivityScan")];
  const tips = [t("scan_goodLight"), t("scan_faceCentered"), t("scan_noFilter")];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("scan_title")}</h1>
          <p className="text-muted-foreground">
            {t("scan_scanningFor")} <strong>{effectiveProfileName}</strong>
          </p>
        </div>

        <div className="flex items-start gap-3 p-4 bg-primary-light border border-primary/20 rounded-2xl mb-6 animate-fade-in">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("scan_privacy")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("scan_privacyDesc")}</p>
          </div>
        </div>

        {stage === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="glass-card border-2 border-dashed border-primary/30 rounded-3xl p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-primary-light/30 transition-all duration-300 animate-scale-in"
          >
            <div className="w-16 h-16 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-soft animate-float">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("scan_upload")}</h2>
            <p className="text-muted-foreground text-sm mb-5">{t("scan_dragDrop")}</p>
            <div className="inline-flex items-center gap-2 px-6 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft">
              <Upload className="w-4 h-4" />
              {t("scan_choosePhoto")}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              {tips.map((tip) => (
                <div key={tip} className="flex items-center gap-1.5 justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {(stage === "preview" || stage === "analyzing") && preview && (
          <div className="glass-card overflow-hidden rounded-3xl animate-scale-in">
            <div className="relative">
              <img src={preview} alt="Uploaded scan" className="w-full aspect-square object-cover" />
              {stage === "analyzing" && (
                <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4 overflow-hidden">
                  {/* Scanning laser line */}
                  <div
                    className="absolute left-0 right-0 h-1 z-10 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.8) 20%, hsl(40 80% 65% / 0.9) 50%, hsl(var(--primary) / 0.8) 80%, transparent 100%)',
                      boxShadow: '0 0 20px 6px hsl(40 80% 65% / 0.4)',
                      animation: 'scanLine 2.2s ease-in-out infinite',
                    }}
                  />
                  <div className="w-16 h-16 gradient-primary rounded-3xl flex items-center justify-center shadow-elevated animate-pulse">
                    <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                  </div>
                  <div className="text-center text-card">
                    <p className="font-semibold text-lg">{t("scan_analyzing")}</p>
                    <p className="text-sm opacity-80 mt-1">{t("scan_analyzingSub")}</p>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap justify-center">
                    {analyzeSteps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1.5 bg-card/20 rounded-full px-3 py-1">
                        <Loader2 className="w-3 h-3 animate-spin" style={{ animationDelay: `${i * 200}ms` }} />
                        <span className="text-xs text-card">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {stage === "preview" && (
              <div className="p-5 flex gap-3">
                <button type="button" onClick={reset} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                  <RotateCcw className="w-4 h-4" />
                  {t("scan_retake")}
                </button>
                <button type="button" onClick={analyze} className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity">
                  {t("scan_analyze")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "result" && result && (
          <div className="space-y-4 animate-scale-in">
            {/* Score + Summary */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-5 mb-5">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 1s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{score}</span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-severity-low" />
                    <span className="font-semibold text-severity-low">{t("scan_complete")}</span>
                  </div>
                  <p className="text-xl font-bold">{result.summary?.type || "Skin Analysis"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.summary?.primary_concern || "Processing findings..."}</p>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {t("scan_skinMetrics")}
              </h3>
              <div className="space-y-4">
                {metricBar(t("dash_oiliness"), result.metrics?.oiliness ?? 0, <Sun className="w-3.5 h-3.5" />, "bg-amber-400")}
                {metricBar(t("dash_hydration"), result.metrics?.hydration ?? 0, <Droplets className="w-3.5 h-3.5" />, "bg-blue-400")}
                {metricBar(t("dash_sensitivity"), result.metrics?.sensitivity ?? 0, <Zap className="w-3.5 h-3.5" />, "bg-red-400")}
                {metricBar(t("scan_acneSeverity"), result.metrics?.acne_severity ?? 0, <AlertCircle className="w-3.5 h-3.5" />, "bg-primary")}
              </div>
            </div>

            {/* Detailed Findings */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-severity-medium" />
                {t("scan_clinicalFindings")}
              </h3>
              <div className="space-y-2">
                {result.detailed_findings?.map((finding, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">{i + 1}</div>
                    {finding}
                  </div>
                ))}
              </div>
            </div>

            {/* Routine Adjustments */}
            <div className="glass-card p-6 border border-primary/20">
              <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">{t("scan_routineAdj")}</p>
              <div className="space-y-2">
                {result.routine_adjustments?.map((adj, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-severity-low flex-shrink-0 mt-0.5" />
                    {adj}
                  </div>
                ))}
              </div>
            </div>

            {/* Add to Reminders Button */}
            {result.skincare_steps && result.skincare_steps.length > 0 && (
              <button
                onClick={addToReminders}
                disabled={addingToReminders || addedToReminders}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${addedToReminders
                    ? "bg-severity-low/10 text-severity-low border border-severity-low/20"
                    : "gradient-primary text-primary-foreground shadow-soft hover:opacity-90"
                  } disabled:opacity-70`}
              >
                {addingToReminders ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : addedToReminders ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {addedToReminders ? "✓ " + t("scan_addedToReminders") : t("scan_addToReminders")}
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={reset} className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                <Camera className="w-4 h-4" />
                {t("scan_newScan")}
              </button>
              <Link to="/dashboard" className="flex-1 flex items-center justify-center gap-2 py-3 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity">
                {t("scan_viewDash")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
    </div>
  );
}
