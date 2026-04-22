import { useEffect, useState, useMemo } from "react";
import { TrendingDown, TrendingUp, BarChart3, Calendar, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { format, startOfWeek, endOfWeek, subWeeks, subDays, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SkinScan {
  id: string;
  score: number | null;
  inflammation: string | null;
  acne_type: string | null;
  recommendation: string | null;
  created_at: string;
  zones: string[] | null;
}

type PeriodType = "day" | "week" | "month";

interface PeriodData {
  start: Date;
  end: Date;
  label: string;
  scans: SkinScan[];
  avg: number;
}

function groupByPeriods(scans: SkinScan[], period: PeriodType, count: number, lang: string): PeriodData[] {
  const now = new Date();
  const locale = lang === "ru" ? ruLocale : undefined;
  const periods: PeriodData[] = [];

  for (let i = 0; i < count; i++) {
    let start: Date, end: Date, label: string;

    if (period === "day") {
      const day = subDays(now, i);
      start = startOfDay(day);
      end = endOfDay(day);
      label = format(day, "d MMM", { locale });
    } else if (period === "week") {
      start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      end = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      label = `${format(start, "d MMM", { locale })}–${format(end, "d MMM", { locale })}`;
    } else {
      const month = subMonths(now, i);
      start = startOfMonth(month);
      end = endOfMonth(month);
      label = format(month, "LLLL yyyy", { locale });
    }

    const periodScans = scans.filter((s) =>
      isWithinInterval(new Date(s.created_at), { start, end })
    );
    const scores = periodScans.filter((s) => s.score !== null).map((s) => s.score!);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    periods.push({ start, end, label, scans: periodScans, avg });
  }

  return periods;
}

export default function WeeklyReport() {
  const { user } = useAuth();
  const { activeProfile, loading: profileLoading } = useProfile();
  const { t, i18n } = useTranslation();
  const [scans, setScans] = useState<SkinScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("week");

  const lang = i18n.language;

  useEffect(() => {
    if (!user || !activeProfile) return;
    setLoading(true);
    supabase
      .from("skin_scans")
      .select("*")
      .eq("profile_id", activeProfile.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setScans(data ?? []);
        setLoading(false);
      });
  }, [user, activeProfile]);

  const periodCount = period === "day" ? 14 : period === "week" ? 8 : 6;
  const periods = useMemo(() => groupByPeriods(scans, period, periodCount, lang), [scans, period, periodCount, lang]);
  const currentPeriod = periods[0];
  const prevPeriod = periods[1];

  const chartData = useMemo(
    () =>
      [...periods]
        .reverse()
        .map((p, i) => ({
          label: period === "day" ? p.label : period === "week" ? `W${i + 1}` : p.label,
          avg: p.avg,
          scans: p.scans.length,
        })),
    [periods, period]
  );

  // AI summary based on language
  const aiSummary = useMemo(() => {
    const periodLabel = period === "day" ? t("report_periodDay").toLowerCase() : period === "week" ? t("report_periodWeek").toLowerCase() : t("report_periodMonth").toLowerCase();
    const score = currentPeriod?.avg ?? 0;

    if (!prevPeriod || !prevPeriod.scans.length || !currentPeriod?.scans.length) {
      return t("report_aiSummaryFirst", { period: periodLabel, score });
    }

    const diff = currentPeriod.avg - prevPeriod.avg;
    if (diff < 0) return t("report_aiSummaryBetter", { period: periodLabel, score });
    if (diff > 0) return t("report_aiSummaryWorse", { period: periodLabel, score });
    return t("report_aiSummarySame", { period: periodLabel, score });
  }, [currentPeriod, prevPeriod, period, t]);

  // Inflammation distribution for current period
  const inflammationDist = useMemo(() => {
    const s = currentPeriod?.scans ?? [];
    if (!s.length) return { low: 0, medium: 0, high: 0 };
    const counts = { low: 0, medium: 0, high: 0 };
    s.forEach((scan) => {
      const inf = (scan.inflammation ?? "").toLowerCase();
      if (inf.includes("high") || inf.includes("severe")) counts.high++;
      else if (inf.includes("medium") || inf.includes("moderate")) counts.medium++;
      else counts.low++;
    });
    const total = s.length;
    return {
      low: Math.round((counts.low / total) * 100),
      medium: Math.round((counts.medium / total) * 100),
      high: Math.round((counts.high / total) * 100),
    };
  }, [currentPeriod]);

  // Acne type breakdown
  const typeBreakdown = useMemo(() => {
    const s = currentPeriod?.scans ?? [];
    if (!s.length) return [];
    const map: Record<string, number> = {};
    s.forEach((scan) => {
      const tp = scan.acne_type ?? "Unknown";
      map[tp] = (map[tp] || 0) + 1;
    });
    const total = s.length;
    return Object.entries(map).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }));
  }, [currentPeriod]);

  // Best day
  const bestDay = useMemo(() => {
    const s = (currentPeriod?.scans ?? []).filter((x) => x.score !== null);
    if (!s.length) return "—";
    const best = s.reduce((a, b) => (a.score! < b.score! ? a : b));
    const locale = lang === "ru" ? ruLocale : undefined;
    return format(new Date(best.created_at), "d MMM", { locale });
  }, [currentPeriod, lang]);

  const change = currentPeriod && prevPeriod ? currentPeriod.avg - prevPeriod.avg : 0;

  const overallTrend = useMemo(() => {
    const withScans = periods.filter((p) => p.scans.length > 0);
    if (withScans.length < 2) return t("report_trendNew");
    return withScans[0].avg <= withScans[withScans.length - 1].avg
      ? t("report_trendImproving")
      : t("report_trendWorsening");
  }, [periods, t]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const noData = scans.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("report_title")}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {activeProfile?.profile_name} · {currentPeriod?.label ?? "—"}
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("report_periodLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("report_periodDay")}</SelectItem>
              <SelectItem value="week">{t("report_periodWeek")}</SelectItem>
              <SelectItem value="month">{t("report_periodMonth")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {noData ? (
          <div className="glass-card p-12 text-center animate-fade-in">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("report_noData")}</h2>
            <p className="text-muted-foreground text-sm">{t("report_noDataSub", { name: activeProfile?.profile_name })}</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: t("report_avgSeverity"),
                  value: currentPeriod.avg || "—",
                  sub: prevPeriod && prevPeriod.scans.length && currentPeriod.scans.length
                    ? `${change <= 0 ? "↓" : "↑"} ${Math.abs(change)}`
                    : t("report_firstPeriod"),
                  text: "text-primary",
                },
                {
                  label: t("report_totalScans"),
                  value: currentPeriod.scans.length,
                  sub: t("report_photosAnalyzed"),
                  text: "text-foreground",
                },
                {
                  label: t("report_bestDay"),
                  value: bestDay,
                  sub: t("report_lowestScore"),
                  text: "text-foreground",
                },
                {
                  label: t("report_overall"),
                  value: overallTrend,
                  sub: `${periods.filter((p) => p.scans.length > 0).length}-${t("report_periodTrend")}`,
                  text: "text-accent",
                },
              ].map(({ label, value, sub, text }, i) => (
                <div
                  key={label}
                  className="glass-card p-5 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-2xl font-bold ${text}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            <div className="glass-card p-5 mb-6 border border-primary/20 animate-fade-in delay-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <h3 className="font-semibold">{t("report_avgScore")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="glass-card p-6 animate-fade-in delay-200">
                <h2 className="font-semibold mb-1">{t("report_trend8w")}</h2>
                <p className="text-sm text-muted-foreground mb-5">{t("report_avgPerWeek")}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`${t("report_avgScore")}: ${v}`, ""]}
                      />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill="hsl(172,60%,38%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 animate-fade-in delay-300">
                <h2 className="font-semibold mb-1">{t("report_inflammation")}</h2>
                <p className="text-sm text-muted-foreground mb-5">{t("report_thisWeek")}</p>
                <div className="space-y-4">
                  {[
                    { label: t("report_inflLow"), pct: inflammationDist.low, color: "bg-severity-low" },
                    { label: t("report_inflMedium"), pct: inflammationDist.medium, color: "bg-severity-medium" },
                    { label: t("report_inflHigh"), pct: inflammationDist.high, color: "bg-severity-high" },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-1000`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {typeBreakdown.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    <p className="text-sm font-semibold mb-3">{t("report_acneType")}</p>
                    <div className="space-y-2">
                      {typeBreakdown.map(({ name, value }) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-semibold">{value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Previous periods */}
            {periods.filter((p) => p.scans.length > 0).length > 1 && (
              <div className="glass-card p-6 animate-fade-in delay-500">
                <h2 className="font-semibold mb-4">{t("report_prevWeeks")}</h2>
                <div className="space-y-2">
                  {periods.slice(1).filter((p) => p.scans.length > 0).map((p, idx) => {
                    const next = periods.slice(idx + 2).find((x) => x.scans.length > 0);
                    const pChange = next ? p.avg - next.avg : 0;
                    return (
                      <div key={p.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-xl px-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{p.label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {pChange !== 0 && (
                            <div className={`flex items-center gap-1 text-xs font-semibold ${pChange <= 0 ? "text-severity-low" : "text-severity-high"}`}>
                              {pChange <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                              {pChange > 0 ? "+" : ""}{pChange}
                            </div>
                          )}
                          <div className="w-10 h-8 bg-primary-light text-primary rounded-lg flex items-center justify-center text-sm font-bold">
                            {p.avg}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
