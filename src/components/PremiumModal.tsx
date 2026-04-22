import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/contexts/PremiumContext";
import { Loader2, CheckCircle2, Crown, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

type Stage = "info" | "processing" | "success";

export default function PremiumModal() {
  const { showPremiumModal, setShowPremiumModal, setPremium } = usePremium();
  const [stage, setStage] = useState<Stage>("info");
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const handleSubscribe = () => {
    setStage("processing");
    setTimeout(() => {
      setStage("success");
      setPremium(true);
    }, 2000);
  };

  const handleClose = () => {
    setShowPremiumModal(false);
    setTimeout(() => setStage("info"), 300);
  };

  const features = isRu
    ? ["PDF-отчёт для врача", "AI-анализ без ограничений", "Умный список покупок", "Приоритетная поддержка"]
    : ["PDF Report for Doctor", "Unlimited AI Analysis", "Smart Shopping List", "Priority Support"];

  return (
    <Dialog open={showPremiumModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {stage === "info" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Crown className="w-5 h-5 text-primary" />
                {isRu ? "Premium Plan" : "Premium Plan"}
              </DialogTitle>
              <DialogDescription>
                {isRu ? "Разблокируйте все возможности SkinTrack AI" : "Unlock all SkinTrack AI features"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-4">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-foreground">$4.99</span>
              <span className="text-sm text-muted-foreground">/ {isRu ? "мес" : "mo"}</span>
            </div>
            <Button onClick={handleSubscribe} className="w-full gap-2 rounded-xl h-12 text-base">
              <Zap className="w-4 h-4" />
              {isRu ? "Подписаться" : "Subscribe"}
            </Button>
          </>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-base font-medium text-foreground">
              {isRu ? "Обработка платежа..." : "Processing payment..."}
            </p>
          </div>
        )}

        {stage === "success" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {isRu ? "Успешно!" : "Success!"}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {isRu ? "Вы теперь Premium-пользователь. Все функции разблокированы!" : "You are now a Premium member. All features unlocked!"}
            </p>
            <Button onClick={handleClose} variant="outline" className="rounded-xl mt-2">
              {isRu ? "Готово" : "Done"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
