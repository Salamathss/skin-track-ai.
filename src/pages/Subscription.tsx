import { useState, useEffect } from "react";
import { Check, Crown, ShieldCheck, Sparkles, Zap, Loader2, ArrowLeft, Star, Heart, CheckCircle2 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { paymentService } from "@/services/payment";
import confetti from "canvas-confetti";

export default function Subscription() {
  const { activeProfile, refreshProfiles } = useProfile();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const plans = [
    {
      id: "free",
      name: t("sub_plan_standard"),
      price: "0",
      features: [
        t("sub_feature_scan_free"),
        t("sub_feature_shelf_free"),
        t("sub_feature_reminders_free"),
        t("sub_feature_dash_free")
      ],
      highlight: false,
      theme: "bg-card/40 border-border/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300"
    },
    {
      id: "pro",
      name: t("sub_plan_pro"),
      price: "5",
      features: [
        t("sub_feature_scan_pro"),
        t("sub_feature_deep_dive_pro"),
        t("sub_feature_support_pro"),
        t("sub_feature_sync_pro"),
        t("sub_feature_analytics_pro")
      ],
      highlight: true,
      theme: "bg-gradient-to-br from-[#2e1065] via-[#4c1d95] to-[#78350f] border-[#f59e0b]/50 shadow-[0_0_50px_-12px_rgba(245,158,11,0.5)] backdrop-blur-3xl ring-1 ring-white/20"
    }
  ];

  const handleSubscribe = async () => {
    if (!activeProfile) return;
    
    setLoading(true);
    try {
      // 1. Initiate payment (Mock)
      const initRes = await paymentService.initiateFreedomPay(activeProfile.id, 5);
      
      if (initRes.success) {
        // 2. Mock payment completion
        const isSuccess = await paymentService.verifyPayment(initRes.orderId, activeProfile.id);
        
        if (isSuccess) {
          setSuccess(true);
          
          // Enhanced multi-burst confetti
          const duration = 5 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);

          await refreshProfiles();
          
          setTimeout(() => {
            navigate("/dashboard");
          }, 5000);
        }
      }
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-scale-in">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto ring-2 ring-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              <Crown className="w-12 h-12 text-amber-500 fill-amber-500/20" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              {t("sub_welcome_pro", { name: activeProfile?.profile_name })}
            </h1>
            <p className="text-amber-200/60 font-medium">
              {t("sub_success_subtitle")}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-500 uppercase tracking-widest">{t("sub_premium_active")}</span>
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">
              {t("sub_redirecting")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -z-10" />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="text-center space-y-8 animate-scale-in">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-t-2 border-amber-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-b-2 border-indigo-500 animate-spin-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Crown className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-black text-white tracking-tight">
                {t("sub_processing")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">
                  {t("sub_secure_conn")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <button 
          onClick={() => navigate(-1)}
          className="self-start flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t("sub_back")}
        </button>

        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <Star className="w-3 h-3 fill-amber-500" />
            {t("sub_premium_access")}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            {t("sub_your_skin_deserves")}
            <span className="block bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
              {t("sub_the_best")}
            </span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-lg md:text-xl font-medium leading-relaxed">
            {t("sub_tagline")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl animate-scale-in">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative overflow-hidden rounded-[2.5rem] border p-10 transition-all duration-500 flex flex-col ${plan.theme} ${
                plan.highlight 
                  ? "scale-105 z-10" 
                  : "hover:bg-card/60"
              }`}
            >
              {plan.highlight && (
                <>
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-600 text-black px-6 py-1.5 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg z-20">
                    <Crown className="w-3 h-3" />
                    PRO
                  </div>
                  <div className="absolute top-8 right-0 bg-white/10 backdrop-blur-md text-white px-4 py-1 rounded-l-full text-[9px] font-bold uppercase tracking-[0.15em] border-l border-t border-b border-white/20 z-10">
                    {t("sub_best_value")}
                  </div>
                  <div className="absolute top-10 right-10 flex flex-col items-center gap-1 opacity-20 group-hover:opacity-30 transition-opacity">
                    <Sparkles className="w-12 h-12 text-amber-400" />
                  </div>
                </>
              )}

              <div className="mb-10">
                <h3 className="text-2xl font-black mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">/ mo</span>
                </div>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4 group/item">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      plan.highlight 
                        ? "bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                        : "bg-slate-800/50 text-slate-500"
                    }`}>
                      {plan.highlight ? (
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />
                      ) : (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      plan.highlight ? "text-slate-100 group-hover/item:text-white" : "text-slate-400"
                    }`}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={loading || (plan.id === "free") || activeProfile?.is_premium}
                onClick={handleSubscribe}
                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                  plan.highlight 
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:scale-[1.02] active:scale-[0.98] hover:shadow-amber-500/20" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {activeProfile?.is_premium && plan.id === "pro" ? (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    {t("sub_active")}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    {t("sub_activate_pro")}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center space-y-4 animate-fade-in delay-500">
          <div className="flex items-center justify-center gap-6 opacity-30 grayscale invert">
            <ShieldCheck className="w-8 h-8" />
            <Heart className="w-8 h-8" />
            <Crown className="w-8 h-8" />
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">
            {t("sub_secure_payment_info")}
          </p>
        </div>
      </div>
    </div>
  );
}
