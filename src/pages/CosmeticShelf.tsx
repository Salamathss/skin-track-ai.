import { useEffect, useState, useRef } from "react";
import { Package, Plus, Camera, Loader2, Trash2, Search, Filter, AlertTriangle, Clock, CheckCircle2, X, Upload, FlaskConical, ShieldCheck, ShieldAlert, ShieldX, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { calculateExpiration, getStatusColor, getStatusBg } from "@/lib/shelfUtils";

interface Product {
  id: string;
  product_name: string;
  brand: string | null;
  category: string;
  ingredients_list: string | null;
  active_ingredients: string[];
  skin_fit?: {
    rating: string;
    reason: string;
  };
  opened_at: string | null;
  shelf_life_months: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF", "Mask", "Exfoliant", "Eye Cream", "Oil", "Treatment", "Other"];

function SafetyBadge({ rating }: { rating: string }) {
  if (rating === "Safe") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-severity-low/15 text-severity-low rounded-full text-xs font-semibold">
        <ShieldCheck className="w-3.5 h-3.5" />
        Safe
      </div>
    );
  }
  if (rating === "Caution") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-severity-medium/15 text-severity-medium rounded-full text-xs font-semibold">
        <ShieldAlert className="w-3.5 h-3.5" />
        Caution
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/15 text-destructive rounded-full text-xs font-semibold">
      <ShieldX className="w-3.5 h-3.5" />
      Warning
    </div>
  );
}

export default function CosmeticShelf() {
  const { user } = useAuth();
  const { profiles, activeProfile } = useProfile();
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "ai" | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Manual form state
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [formOpenedAt, setFormOpenedAt] = useState("");
  const [formShelfLife, setFormShelfLife] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  // AI scan state
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ingredient analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const analysisFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !activeProfile) return;
    loadProducts();
  }, [user, activeProfile]);

  const loadProducts = async () => {
    if (!activeProfile) return;
    setLoading(true);
    
    // Attempt with profile_id filter
    let res = await supabase
      .from("cosmetic_shelf")
      .select("*")
      .eq("profile_id", activeProfile.id)
      .order("created_at", { ascending: false });

    // Fallback: if column is missing, load all user's products
    if (res.error && (res.error as any).code === "42703") {
      console.warn("profile_id column missing on cosmetic_shelf, falling back to per-user fetch");
      res = await supabase
        .from("cosmetic_shelf")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
    }

    if (!res.error && res.data) setProducts(res.data as unknown as Product[]);
    setLoading(false);
  };

  const handleManualAdd = async () => {
    if (!user || !formName.trim()) return;
    setSubmitting(true);
    let payload = {
      user_id: user.id,
      profile_id: activeProfile?.id,
      product_name: formName.trim(),
      brand: formBrand.trim() || null,
      category: formCategory,
      opened_at: formOpenedAt || null,
      shelf_life_months: formShelfLife,
    };

    let { error } = await supabase.from("cosmetic_shelf").insert(payload as any);
    
    // Fallback for missing column
    if (error && (error as any).code === "42703") {
      const { profile_id, ...fallbackPayload } = payload as any;
      const res = await supabase.from("cosmetic_shelf").insert(fallbackPayload);
      error = res.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("shelf_productAdded"));
      resetForm();
      loadProducts();
    }
    setSubmitting(false);
  };

  const handleAiScan = async () => {
    if (!scanFile || !user) return;
    setScanning(true);
    try {
      const ext = scanFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/products/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("skin-photos").upload(path, scanFile);
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("skin-photos")
        .createSignedUrl(path, 3600);
      if (signedError || !signedData?.signedUrl) throw signedError || new Error("Failed to get signed URL");

      const { data: result, error: fnError } = await supabase.functions.invoke("scan-product", {
        body: { photoUrl: signedData.signedUrl, language: i18n.language },
      });
      if (fnError) throw fnError;

      if (result.error) {
        toast.error(result.error);
        setScanning(false);
        return;
      }

      setScanResult({ ...result, image_url: path });
      setFormName(result.product_name || "");
      setFormBrand(result.brand || "");
      setFormCategory(result.category || "Other");
      setFormShelfLife(result.shelf_life_months || 12);
      setAddMode("manual");
      toast.success(t("shelf_aiScanned"));
    } catch (err: any) {
      toast.error(err.message || "Scan failed");
    }
    setScanning(false);
  };

  const handleSaveAiResult = async () => {
    if (!user || !formName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("cosmetic_shelf").insert({
      user_id: user.id,
      profile_id: activeProfile?.id,
      product_name: formName.trim(),
      brand: formBrand.trim() || null,
      category: formCategory,
      ingredients_list: scanResult?.ingredients_list || null,
      active_ingredients: scanResult?.active_ingredients || [],
      skin_fit: scanResult?.skin_fit || null,
      opened_at: formOpenedAt || null,
      shelf_life_months: formShelfLife,
      image_url: scanResult?.image_url || null,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("shelf_productAdded"));
      resetForm();
      loadProducts();
    }
    setSubmitting(false);
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("cosmetic_shelf").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success(t("shelf_productDeleted"));
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setAddMode(null);
    setFormName("");
    setFormBrand("");
    setFormCategory("Other");
    setFormOpenedAt("");
    setFormShelfLife(12);
    setScanFile(null);
    setScanPreview(null);
    setScanResult(null);
  };

  // Ingredient analysis handlers
  const handleAnalyze = async () => {
    if (!analysisFile || !user) return;
    setAnalyzing(true);
    try {
      const ext = analysisFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/ingredients/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("skin-photos").upload(path, analysisFile);
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("skin-photos")
        .createSignedUrl(path, 3600);
      if (signedError || !signedData?.signedUrl) throw signedError || new Error("Failed to get signed URL");

      // Fetch last scan for comparison
      const { data: lastScan } = await supabase
        .from("skin_scans")
        .select("skin_type, primary_concern")
        .eq("profile_id", activeProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: result, error: fnError } = await supabase.functions.invoke("scan-product", {
        body: { 
          photoUrl: signedData.signedUrl, 
          language: i18n.language,
          userSkinType: lastScan?.skin_type || "Normal",
          primaryConcern: lastScan?.primary_concern || "General maintenance"
        },
      });
      if (fnError) throw fnError;

      if (result.error) {
        toast.error(result.error);
        setAnalyzing(false);
        return;
      }

      setAnalysisResult({ ...result, image_url: path });
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    }
    setAnalyzing(false);
  };

  const handleAddAnalyzedToShelf = async () => {
    if (!user || !formName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("cosmetic_shelf").insert({
      user_id: user.id,
      profile_id: activeProfile?.id,
      product_name: formName.trim(),
      brand: formBrand.trim() || null,
      category: formCategory,
      ingredients_list: analysisResult?.ingredients_list || null,
      active_ingredients: analysisResult?.active_ingredients || [],
      skin_fit: analysisResult?.skin_fit || null,
      opened_at: formOpenedAt || null,
      shelf_life_months: formShelfLife,
      image_url: analysisResult?.image_url || null,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("shelf_productAdded"));
      resetAnalysis();
      loadProducts();
    }
    setSubmitting(false);
  };

  const resetAnalysis = () => {
    setShowAnalysis(false);
    setAnalysisFile(null);
    setAnalysisPreview(null);
    setAnalysisResult(null);
    setShowAnalysisForm(false);
    setFormName("");
    setFormBrand("");
    setFormCategory("Other");
    setFormOpenedAt("");
    setFormShelfLife(12);
  };

  const transitionToShelfForm = () => {
    setFormName(analysisResult?.product_name || "");
    setFormBrand(analysisResult?.brand || "");
    setFormCategory(analysisResult?.category || "Other");
    setFormShelfLife(analysisResult?.shelf_life_months || 12);
    setShowAnalysisForm(true);
  };

  const filtered = products.filter((p) => {
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchSearch = !searchQuery || p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.brand?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const expiringProducts = products.filter((p) => {
    const days = getDaysLeft(p.opened_at, p.shelf_life_months);
    return days !== null && days <= 14 && days > 0;
  });

  const addTestProduct = async () => {
    if (!user || !activeProfile) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("cosmetic_shelf").insert({
        user_id: user.id,
        profile_id: activeProfile.id,
        product_name: "CeraVe Hydrating Cleanser",
        brand: "CeraVe",
        category: "Cleanser",
        active_ingredients: ["Ceramides", "Hyaluronic Acid", "Niacinamide"],
        ingredients_list: "Aqua/Water, Glycerin, Cetearyl Alcohol, Peg-40 Stearate, Stearyl Alcohol, Potassium Phosphate, Ceramide Ap, Ceramide Eop, Ceramide Np, Carbomer, Niacinamide...",
        shelf_life_months: 12,
        opened_at: new Date().toISOString().split('T')[0],
        is_active: true
      });
      if (error) throw error;
      toast.success("Test product added!");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-10 pt-16 md:pt-0">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("shelf_title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("shelf_subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalysis(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground text-sm font-semibold rounded-xl border border-border hover:bg-accent/80 transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="hidden sm:inline">{i18n.language === "ru" ? "Анализ состава" : "Analyze Ingredients"}</span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("shelf_addProduct")}</span>
            </button>
          </div>
        </div>

        {/* Expiry Alerts */}
        {products.filter(p => {
          const { status } = calculateExpiration(p.opened_at, p.shelf_life_months);
          return status === 'critical' || status === 'expired';
        }).length > 0 && (
          <div className="mb-6 space-y-2 animate-fade-in">
            {products.filter(p => {
              const { status } = calculateExpiration(p.opened_at, p.shelf_life_months);
              return status === 'critical' || status === 'expired';
            }).map((p) => {
              const { daysLeft, status } = calculateExpiration(p.opened_at, p.shelf_life_months);
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl text-sm border ${getStatusBg(status)}`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${status === 'expired' ? 'text-destructive' : 'text-severity-medium'}`} />
                  <div className="flex-1">
                    <span className="font-bold">{p.product_name}</span>: {status === 'expired' ? t("shelf_expired") : t("shelf_expiryWarning", { name: "", days: daysLeft })}
                  </div>
                  {status === 'critical' && (
                    <div className="px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full uppercase animate-pulse">
                      Critical
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        {products.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("shelf_search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t("shelf_allCategories")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`shelf_cat_${c}`)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ingredient Analysis Modal */}
        {showAnalysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={resetAnalysis}>
            <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">{i18n.language === "ru" ? "Анализ состава" : "Ingredient Analysis"}</h2>
                </div>
                <button onClick={resetAnalysis} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Upload */}
              {!analysisResult && !showAnalysisForm && (
                <div className="space-y-4">
                  {!analysisPreview ? (
                    <div
                      onClick={() => analysisFileRef.current?.click()}
                      className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
                    >
                      <FlaskConical className="w-10 h-10 text-primary mx-auto mb-3" />
                      <p className="text-sm font-medium">{i18n.language === "ru" ? "Загрузите фото состава" : "Upload ingredient list photo"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{i18n.language === "ru" ? "Сфотографируйте этикетку с составом" : "Take a photo of the ingredient label"}</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={analysisPreview} alt="Ingredients" className="w-full rounded-xl object-cover max-h-64" />
                      {analyzing && (
                        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <div className="text-center text-card">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm font-medium">{i18n.language === "ru" ? "Анализируем состав..." : "Analyzing ingredients..."}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={analysisFileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAnalysisFile(f);
                        setAnalysisPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <button onClick={resetAnalysis} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {t("rem_cancel")}
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={!analysisFile || analyzing}
                      className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {analyzing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (i18n.language === "ru" ? "Анализировать" : "Analyze")}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Analysis Results */}
              {analysisResult && !showAnalysisForm && (
                <div className="space-y-4">
                  {/* Safety Badge */}
                  <div className="flex items-center justify-between">
                    <SafetyBadge rating={analysisResult.safety_rating || "Safe"} />
                    <span className="text-xs text-muted-foreground">
                      {i18n.language === "ru" ? "Уверенность" : "Confidence"}: {analysisResult.confidence || "medium"}
                    </span>
                  </div>

                  {/* Product Info */}
                  {analysisResult.product_name && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <p className="text-sm font-semibold">{analysisResult.product_name}</p>
                      {analysisResult.brand && <p className="text-xs text-muted-foreground">{analysisResult.brand}</p>}
                    </div>
                  )}

                  {/* Safety Summary */}
                  {analysisResult.safety_summary && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{i18n.language === "ru" ? "Общая оценка" : "Safety Summary"}</p>
                      <p className="text-sm">{analysisResult.safety_summary}</p>
                    </div>
                  )}

                  {/* Warnings */}
                  {analysisResult.warnings?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{i18n.language === "ru" ? "Предупреждения" : "Warnings"}</p>
                      {analysisResult.warnings.map((w: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-severity-medium/10 border border-severity-medium/20 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5 text-severity-medium flex-shrink-0 mt-0.5" />
                          <span className="text-xs">{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Ingredients */}
                  {analysisResult.active_ingredients?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{i18n.language === "ru" ? "Активные компоненты" : "Active Ingredients"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.active_ingredients.map((ing: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={resetAnalysis} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {t("rem_cancel")}
                    </button>
                    <button
                      onClick={transitionToShelfForm}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      {i18n.language === "ru" ? "На полку" : "Add to Shelf"}
                    </button>
                  </div>

                  {/* Skin Fit (New) */}
                  {analysisResult.skin_fit && (
                    <div className={`mt-4 p-4 rounded-xl border ${
                      analysisResult.skin_fit.rating === "Perfect" ? "bg-severity-low/10 border-severity-low/20" : 
                      analysisResult.skin_fit.rating === "Risky" ? "bg-destructive/10 border-destructive/20" : 
                      "bg-muted border-border"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {analysisResult.skin_fit.rating === "Perfect" ? <ShieldCheck className="w-5 h-5 text-severity-low" /> : <ShieldAlert className="w-5 h-5 text-severity-medium" />}
                        <h3 className="font-bold text-sm">
                          {i18n.language === "ru" ? "Подходит вашей коже" : "Skin Fit"}: {analysisResult.skin_fit.rating}
                        </h3>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">{analysisResult.skin_fit.reason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Add to Shelf Form */}
              {showAnalysisForm && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-severity-low/10 border border-severity-low/30 rounded-lg text-xs text-severity-low">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {i18n.language === "ru" ? "Данные заполнены из анализа" : "Pre-filled from analysis"}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_productName")}</label>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_brand")}</label>
                    <input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_category")}</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{t(`shelf_cat_${c}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_openedAt")}</label>
                      <input type="date" value={formOpenedAt} onChange={(e) => setFormOpenedAt(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_shelfLife")}</label>
                      <input type="number" min={1} max={60} value={formShelfLife} onChange={(e) => setFormShelfLife(Number(e.target.value))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowAnalysisForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {i18n.language === "ru" ? "Назад" : "Back"}
                    </button>
                    <button
                      onClick={handleAddAnalyzedToShelf}
                      disabled={!formName.trim() || submitting}
                      className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("shelf_save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => resetForm()}>
            <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">{t("shelf_addProduct")}</h2>
                <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!addMode && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAddMode("manual")}
                    className="flex flex-col items-center gap-3 p-6 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <Package className="w-8 h-8 text-primary" />
                    <span className="text-sm font-semibold">{t("shelf_manual")}</span>
                    <span className="text-xs text-muted-foreground text-center">{t("shelf_manualDesc")}</span>
                  </button>
                  <button
                    onClick={() => setAddMode("ai")}
                    className="flex flex-col items-center gap-3 p-6 border border-primary/30 rounded-xl bg-primary-light/30 hover:bg-primary-light/50 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-primary" />
                    <span className="text-sm font-semibold">{t("shelf_aiScan")}</span>
                    <span className="text-xs text-muted-foreground text-center">{t("shelf_aiScanDesc")}</span>
                  </button>
                </div>
              )}

              {addMode === "ai" && !scanResult && (
                <div className="space-y-4">
                  {!scanPreview ? (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
                    >
                      <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
                      <p className="text-sm font-medium">{t("shelf_uploadProduct")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("shelf_uploadProductDesc")}</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={scanPreview} alt="Product" className="w-full rounded-xl object-cover max-h-64" />
                      {scanning && (
                        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <div className="text-center text-card">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm font-medium">{t("shelf_scanning")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setScanFile(f);
                        setScanPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setAddMode(null); setScanFile(null); setScanPreview(null); }} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {t("rem_cancel")}
                    </button>
                    <button
                      onClick={handleAiScan}
                      disabled={!scanFile || scanning}
                      className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {scanning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("shelf_scanNow")}
                    </button>
                  </div>
                </div>
              )}

              {addMode === "manual" && (
                <div className="space-y-4">
                  {scanResult && (
                    <div className="flex items-center gap-2 p-2 bg-severity-low/10 border border-severity-low/30 rounded-lg text-xs text-severity-low">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      {t("shelf_aiPrefilled")}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_productName")}</label>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_brand")}</label>
                    <input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_category")}</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{t(`shelf_cat_${c}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_openedAt")}</label>
                      <input type="date" value={formOpenedAt} onChange={(e) => setFormOpenedAt(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_shelfLife")}</label>
                      <input type="number" min={1} max={60} value={formShelfLife} onChange={(e) => setFormShelfLife(Number(e.target.value))} className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  {scanResult?.active_ingredients?.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("shelf_activeIngredients")}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.active_ingredients.map((ing: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={resetForm} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {t("rem_cancel")}
                    </button>
                    <button
                      onClick={scanResult ? handleSaveAiResult : handleManualAdd}
                      disabled={!formName.trim() || submitting}
                      className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("shelf_save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center animate-fade-in">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("shelf_empty")}</h2>
            <p className="text-muted-foreground mb-6">{t("shelf_emptyDesc")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity justify-center"
              >
                <Plus className="w-4 h-4" />
                {t("shelf_addFirst")}
              </button>
              <button
                onClick={addTestProduct}
                className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground font-semibold rounded-xl hover:bg-muted/80 transition-all justify-center text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                {i18n.language === "ru" ? "Добавить демо-продукт" : "Add Test Product"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map((product) => {
              const { daysLeft, status } = calculateExpiration(product.opened_at, product.shelf_life_months);
              
              return (
                <div
                  key={product.id}
                  className={`glass-card p-5 relative group transition-all hover-lift ${getStatusBg(status)}`}
                >
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{product.product_name}</h3>
                      {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
                      {t(`shelf_cat_${product.category}`)}
                    </span>
                  </div>

                  {product.active_ingredients && product.active_ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.active_ingredients.slice(0, 3).map((ing, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{ing}</span>
                      ))}
                      {product.active_ingredients.length > 3 && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full">+{product.active_ingredients.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 text-xs font-medium ${getStatusColor(status)}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {status === 'not_opened'
                      ? t("shelf_notOpened")
                      : status === 'expired'
                        ? t("shelf_expired")
                        : t("shelf_daysLeft", { count: daysLeft })}
                    {status === 'critical' && (
                      <span className="ml-auto px-1.5 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded border border-destructive/20">
                        7d left
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
