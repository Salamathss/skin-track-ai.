import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Loader2, Copy, Check, Sparkles, Share2, ExternalLink, AlertCircle, Trash2, X, PlusCircle, BellPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { generateShoppingList, type ShoppingItem } from "@/lib/shopping_ai";

const STORAGE_KEY = "skin-recommendations";

function getStoredItems(profileId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${profileId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function storeItems(profileId: string, items: ShoppingItem[]) {
  localStorage.setItem(`${STORAGE_KEY}-${profileId}`, JSON.stringify(items));
}

export default function ShoppingList() {
  const { user } = useAuth();
  const { activeProfile, loading: profileLoading } = useProfile();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted items
  useEffect(() => {
    if (activeProfile?.id) {
      const stored = getStoredItems(activeProfile.id);
      if (stored.length > 0) {
        setItems(stored);
        setGenerated(true);
      } else {
        setGenerated(false);
        setItems([]);
      }
    }
  }, [activeProfile?.id]);

  const generateList = async () => {
    if (!user || !activeProfile) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Context Data
      const [scanRes, shelfRes, factsRes, weatherRes] = await Promise.all([
        supabase
          .from("skin_scans")
          .select("*")
          .eq("profile_id", activeProfile.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("cosmetic_shelf")
          .select("product_name, category")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("user_facts")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("weather_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
      ]);

      const scan = scanRes.data?.[0] || null;
      const shelf = shelfRes.data || [];
      const facts = factsRes.data || [];
      const weather = weatherRes.data?.[0] || null;

      // 2. Call AI Service
      const recommendations = await generateShoppingList({
        profile: activeProfile,
        facts,
        scan,
        weather,
        shelf,
        language: i18n.language
      });

      setItems(recommendations);
      setGenerated(true);
      storeItems(activeProfile.id, recommendations);
      toast.success(t("shop_saved") || "Personalized list generated!");
    } catch (err: any) {
      console.error("Shopping list generation failed. Check your API key and network connection:", err);
      // Fallback message if translation key is missing
      const errorMessage = t("shop_error");
      setError(errorMessage === "shop_error" ? "Failed to generate recommendations. Please check your API key and try again." : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShelf = async (item: ShoppingItem) => {
    if (!user || !activeProfile) return;
    try {
      const { error } = await supabase.from("cosmetic_shelf").insert({
        user_id: user.id,
        product_name: item.name,
        category: item.category,
        brand: item.name.split(" ")[0] || "Unknown",
        is_active: true
      });
      if (error) throw error;
      toast.success(t("shelf_productAdded") || "Added to your shelf!");
    } catch (err) {
      toast.error("Failed to add to shelf");
    }
  };

  const handleAddToReminders = async (item: ShoppingItem) => {
    if (!user || !activeProfile) return;
    try {
      const taskName = `Use ${item.name}`;
      // Duplicate check
      const { data: existing } = await supabase
        .from("skin_reminders")
        .select("id")
        .eq("profile_id", activeProfile.id)
        .eq("task_name", taskName)
        .eq("is_completed", false)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info(t("already_in_plan") || "Already in plan");
        return;
      }

      const { error } = await supabase.from("skin_reminders").insert({
        user_id: user.id,
        profile_id: activeProfile.id,
        task_name: taskName,
        category: item.category,
        is_manual: true
      });
      if (error) throw error;
      toast.success(t("scan_addedToReminders") || "Added to reminders!");
    } catch (err) {
      toast.error("Failed to add reminder");
    }
  };

  const getBuyUrl = (productName: string) =>
    `https://kaspi.kz/shop/search/?text=${encodeURIComponent(productName)}`;

  const getGoldAppleUrl = (productName: string) =>
    `https://goldapple.kz/catalogsearch/result?q=${encodeURIComponent(productName)}`;

  const getShareText = () =>
    items.map((item, i) => `${i + 1}. ${item.name} (${item.category})\n   ${item.reason}`).join("\n\n");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareList = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: t("shop_title"), text });
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const handleRegenerate = () => {
    setGenerated(false);
    setItems([]);
    setError(null);
    if (activeProfile?.id) {
      localStorage.removeItem(`${STORAGE_KEY}-${activeProfile.id}`);
    }
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    if (activeProfile?.id) {
      if (updated.length === 0) {
        localStorage.removeItem(`${STORAGE_KEY}-${activeProfile.id}`);
        setGenerated(false);
      } else {
        storeItems(activeProfile.id, updated);
      }
    }
    toast("Item removed");
  };

  const clearAll = () => {
    setItems([]);
    setGenerated(false);
    setError(null);
    if (activeProfile?.id) {
      localStorage.removeItem(`${STORAGE_KEY}-${activeProfile.id}`);
    }
    toast("Shopping list cleared");
  };

  const widgetClass = "bg-card/70 backdrop-blur-sm border border-border/40 rounded-3xl shadow-card p-6 transition-all duration-300";

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl py-6">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("shop_title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("shop_subtitle")}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <ShoppingBag className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>

        {error && (
          <div className={`${widgetClass} mb-4 flex items-start gap-3 animate-fade-in border-destructive/20 bg-destructive/5`}>
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-medium">{error}</p>
              <button 
                onClick={generateList}
                className="text-xs text-primary underline mt-1 text-left"
              >
                {t("shop_regenerate") || "Try again"}
              </button>
            </div>
          </div>
        )}

        {!generated ? (
          <div className={`${widgetClass} text-center py-12 animate-fade-in`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="w-8 h-8 text-primary absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {i18n.language === "ru" ? "Создаем ваш список..." : "Crafting your list..."}
                  </h2>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {i18n.language === "ru" 
                      ? "Анализируем вашу кожу, погоду в Алматы и текущую полку" 
                      : "Analyzing your skin, Almaty weather, and current shelf..."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t("shop_emptyTitle")}</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {t("shop_emptyDesc")}
                </p>
                <button
                  onClick={generateList}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-2xl shadow-soft hover:opacity-90 transition-all duration-300 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {t("shop_generate")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <p className="text-sm text-muted-foreground">
                {t("shop_resultCount", { count: items.length })}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 bg-card border border-border/50 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  title={t("shop_copy")}
                >
                  {copied ? <Check className="w-4.5 h-4.5 text-severity-low" /> : <Copy className="w-4.5 h-4.5" />}
                </button>
                <button
                  onClick={clearAll}
                  className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
                  title={t("shop_clearAll")}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-all shadow-soft"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("shop_regenerate")}
                </button>
              </div>
            </div>

            {items.map((item, i) => (
              <div
                key={i}
                className={`${widgetClass} hover:shadow-elevated relative overflow-hidden group`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-base leading-tight">{item.name}</p>
                      <button
                        onClick={() => removeItem(i)}
                        className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-primary/5 text-[10px] font-bold text-primary uppercase tracking-wider">
                        {item.category}
                      </span>
                      {item.badge_text && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-[10px] font-bold text-accent uppercase tracking-wider border border-accent/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          {item.badge_text}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed font-medium">{item.reason}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                   <a
                    href={getBuyUrl(item.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[hsl(0,72%,51%)]/10 text-[hsl(0,72%,51%)] text-[11px] font-bold rounded-xl hover:bg-[hsl(0,72%,51%)]/20 border border-[hsl(0,72%,51%)]/20 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Kaspi.kz
                  </a>
                   <a
                    href={getGoldAppleUrl(item.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[hsl(145,63%,42%)]/10 text-[hsl(145,63%,32%)] text-[11px] font-bold rounded-xl hover:bg-[hsl(145,63%,42%)]/20 border border-[hsl(145,63%,42%)]/20 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Gold Apple
                  </a>
                  <button
                    onClick={() => handleAddToShelf(item)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary text-[11px] font-bold rounded-xl hover:bg-primary/20 border border-primary/20 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {t("shop_addToShelf") || "Shelf"}
                  </button>
                  <button
                    onClick={() => handleAddToReminders(item)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-accent/10 text-accent text-[11px] font-bold rounded-xl hover:bg-accent/20 border border-accent/20 transition-colors"
                  >
                    <BellPlus className="w-3.5 h-3.5" />
                    {t("shop_addToReminders") || "Remind"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
