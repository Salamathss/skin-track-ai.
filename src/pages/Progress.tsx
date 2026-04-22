import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePremium } from "@/contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Loader2, Share2, ChevronDown, Sparkles, TrendingUp, TrendingDown, Minus, Camera, FileText, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import ImageComparisonSlider from "@/components/ImageComparisonSlider";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";

interface ScanOption {
  id: string;
  photo_url: string | null;
  score: number | null;
  hydration: number | null;
  oiliness: number | null;
  sensitivity: number | null;
  skin_type: string | null;
  primary_concern: string | null;
  created_at: string;
}

export default function Progress() {
  const { user } = useAuth();
  const { activeProfile, loading: profileLoading } = useProfile();
  const { isPremium, setShowPremiumModal } = usePremium();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // DIAGNOSTIC CHECK
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    console.log("%c [Supabase Config]", "color: #ff9900; font-weight: bold;", {
      urlLoaded: !!supabaseUrl,
      keyLoaded: !!supabaseKey,
      urlSuffix: supabaseUrl ? `...${supabaseUrl.substring(supabaseUrl.length - 8)}` : "missing"
    });

    if (!user || !activeProfile) return;
    setLoading(true);
    const fetchScans = async () => {
      const { data } = await supabase
        .from("skin_scans")
        .select("id, photo_url, score, hydration, oiliness, sensitivity, skin_type, primary_concern, created_at")
        .eq("profile_id", activeProfile.id)
        .order("created_at", { ascending: true });

      const withResolvedUrls = await Promise.all(
        ((data as ScanOption[]) || []).map(async (scan) => {
          if (!scan.photo_url) return null;
          if (/^https?:\/\//i.test(scan.photo_url)) return scan;

          const { data: signedData, error: signedError } = await supabase.storage
            .from("skin-photos")
            .createSignedUrl(scan.photo_url, 60 * 60 * 24 * 7);

          if (signedError || !signedData?.signedUrl) return null;
          return { ...scan, photo_url: signedData.signedUrl };
        })
      );

      const hydratedScans = ((data as ScanOption[]) || []).map((scan, idx) => withResolvedUrls[idx] ?? scan);
      setScans(hydratedScans);
      if (hydratedScans.length >= 2) {
        setBeforeId(hydratedScans[0].id);
        setAfterId(hydratedScans[hydratedScans.length - 1].id);
      } else if (hydratedScans.length === 1) {
        setBeforeId(hydratedScans[0].id);
      }
      setLoading(false);
    };
    fetchScans();
  }, [user, activeProfile]);

  const beforeScan = useMemo(() => scans.find((s) => s.id === beforeId) ?? null, [scans, beforeId]);
  const afterScan = useMemo(() => scans.find((s) => s.id === afterId) ?? null, [scans, afterId]);

  // Generate AI comparison when both are selected
  useEffect(() => {
    if (!beforeScan || !afterScan || beforeScan.id === afterScan.id) {
      setAiSummary(null);
      return;
    }
    const generate = async () => {
      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("compare-progress", {
          body: {
            before: {
              score: beforeScan.score,
              hydration: beforeScan.hydration,
              oiliness: beforeScan.oiliness,
              sensitivity: beforeScan.sensitivity,
              skin_type: beforeScan.skin_type,
              primary_concern: beforeScan.primary_concern,
              date: beforeScan.created_at,
            },
            after: {
              score: afterScan.score,
              hydration: afterScan.hydration,
              oiliness: afterScan.oiliness,
              sensitivity: afterScan.sensitivity,
              skin_type: afterScan.skin_type,
              primary_concern: afterScan.primary_concern,
              date: afterScan.created_at,
            },
            language: i18n.language,
          },
        });
        
        if (error) {
          console.warn("AI Comparison failed silently:", error);
          setAiSummary(null);
          return;
        }
        
        setAiSummary(data?.summary || null);
      } catch (e: any) {
        console.warn("AI Comparison error caught silently:", e);
        setAiSummary(null);
      } finally {
        setAiLoading(false);
      }
    };
    generate();
  }, [beforeScan, afterScan, i18n.language]);

  const handleShare = async () => {
    if (!shareRef.current) return;
    try {
      const dataUrl = await toPng(shareRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `skintrack-progress-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const widgetClass = "bg-card/70 backdrop-blur-sm border border-border/40 rounded-3xl shadow-card p-6";

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (scans.length < 2) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-10">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl py-12">
          <div className={`${widgetClass} text-center p-12 animate-fade-in`}>
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">{scans.length === 0 ? t("empty_historyTitle") : t("progress_needMore")}</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {scans.length === 0 ? t("empty_historyDesc") : t("progress_needMoreDesc")}
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-2xl shadow-soft hover:opacity-90 transition-opacity animate-pulse"
            >
              <Camera className="w-4 h-4" />
              {scans.length === 0 ? t("empty_getStarted") : t("dash_newScan")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scoreDiff = beforeScan && afterScan && beforeScan.score != null && afterScan.score != null
    ? afterScan.score - beforeScan.score
    : null;

  return (
    <div className="min-h-screen bg-background pb-[150px] md:pb-10">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 animate-fade-in">{t("progress_title")}</h1>

        {/* Scan selectors */}
        <div className="grid grid-cols-2 gap-3 mb-5 animate-fade-in">
          <ScanSelector
            label={t("progress_before")}
            scans={scans}
            selectedId={beforeId}
            onChange={setBeforeId}
          />
          <ScanSelector
            label={t("progress_after")}
            scans={scans}
            selectedId={afterId}
            onChange={setAfterId}
          />
        </div>

        {/* Comparison slider */}
        {beforeScan && afterScan && beforeScan.id !== afterScan.id && (
          <div className="animate-fade-in">
            <div ref={shareRef} className="bg-card rounded-3xl overflow-hidden">
              <ImageComparisonSlider
                beforeImage={beforeScan.photo_url}
                afterImage={afterScan.photo_url}
                beforeLabel={format(new Date(beforeScan.created_at), "MMM d")}
                afterLabel={format(new Date(afterScan.created_at), "MMM d")}
              />

              {/* Score comparison bar */}
              <div className="flex items-center justify-between p-4">
                <ScoreChip label={t("progress_before")} score={beforeScan.score} date={beforeScan.created_at} />
                {scoreDiff !== null && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-sm font-bold">
                    {scoreDiff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-severity-low" />
                    ) : scoreDiff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-severity-high" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={scoreDiff < 0 ? "text-severity-low" : scoreDiff > 0 ? "text-severity-high" : "text-muted-foreground"}>
                      {scoreDiff > 0 ? "+" : ""}{scoreDiff}
                    </span>
                  </div>
                )}
                <ScoreChip label={t("progress_after")} score={afterScan.score} date={afterScan.created_at} />
              </div>
            </div>

            {/* AI Summary */}
            <div className={`${widgetClass} mt-5`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                </div>
                <h2 className="font-semibold text-base">{t("progress_aiAnalysis")}</h2>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t("progress_analyzing")}</span>
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("progress_selectTwo")}</p>
              )}
            </div>

            {/* Share button */}
            <Button
              onClick={handleShare}
              className="w-full mt-5 gap-2 rounded-2xl h-12 gradient-primary text-primary-foreground font-semibold shadow-soft hover:opacity-90"
            >
              <Share2 className="w-4 h-4" />
              {t("progress_share")}
            </Button>
          </div>
        )}

        {/* PDF Export */}
        <div className="mt-6 animate-fade-in">
          <Button
            variant="outline"
            onClick={async () => {
              if (isPremium) {
                const { generateSkinReport } = await import("@/lib/generateReport");
                console.log("DATA FOR PDF:", scans);
                await generateSkinReport({
                  profileName: activeProfile?.profile_name || "Patient",
                  cityName: activeProfile?.city_name,
                  scans: scans,
                  language: i18n.language,
                });
              } else {
                setShowPremiumModal(true);
              }
            }}
            className="w-full gap-2 rounded-2xl h-12 font-semibold"
          >
            {isPremium ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {t("report_export")}
            {!isPremium && <span className="text-[10px] ml-1 opacity-70">Premium</span>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            {t("report_disclaimer")}
          </p>
        </div>

        {/* Hidden printable report */}
        <div id="print-report" className="hidden print:!block">
          <h1>SkinTrack AI</h1>
          <h2>{isRu ? "Отчёт о состоянии кожи" : "Skin Condition Report"}</h2>
          <p><strong>{isRu ? "Пациент:" : "Patient:"}</strong> {activeProfile?.profile_name || "—"}</p>
          {activeProfile?.city_name && <p><strong>{isRu ? "Город:" : "City:"}</strong> {activeProfile.city_name}</p>}
          <p><strong>{isRu ? "Дата:" : "Date:"}</strong> {format(new Date(), "dd.MM.yyyy")}</p>
          <p><strong>{isRu ? "Всего сканов:" : "Total scans:"}</strong> {scans.length}</p>

          <table>
            <thead>
              <tr>
                <th>{isRu ? "Дата" : "Date"}</th>
                <th>{isRu ? "Балл" : "Score"}</th>
                <th>{isRu ? "Тип кожи" : "Skin Type"}</th>
                <th>{isRu ? "Проблема" : "Concern"}</th>
                <th>{isRu ? "Увлажн." : "Hydration"}</th>
                <th>{isRu ? "Жирность" : "Oiliness"}</th>
                <th>{isRu ? "Чувств." : "Sensitivity"}</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>{format(new Date(s.created_at), "dd.MM.yy")}</td>
                  <td>{s.score ?? "—"}</td>
                  <td>{s.skin_type || "—"}</td>
                  <td>{s.primary_concern || "—"}</td>
                  <td>{s.hydration ?? "—"}</td>
                  <td>{s.oiliness ?? "—"}</td>
                  <td>{s.sensitivity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="disclaimer">
            {isRu
              ? "Этот отчёт носит информационный характер и не является медицинским диагнозом."
              : "This report is for informational purposes only and does not constitute a medical diagnosis."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScanSelector({
  label,
  scans,
  selectedId,
  onChange,
}: {
  label: string;
  scans: ScanOption[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <select
          className="w-full appearance-none bg-card border border-border/50 rounded-2xl px-4 py-2.5 text-sm font-medium pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={selectedId ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Select scan…</option>
          {scans.map((s) => (
            <option key={s.id} value={s.id}>
              {format(new Date(s.created_at), "MMM d, yyyy")} — {s.score ?? "—"} pts
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function ScoreChip({ label, score, date }: { label: string; score: number | null; date: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{score ?? "—"}</p>
      <p className="text-[10px] text-muted-foreground">{format(new Date(date), "MMM d, yyyy")}</p>
    </div>
  );
}
