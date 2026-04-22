import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useDailySync() {
  const { activeProfile } = useProfile();
  const { t } = useTranslation();

  useEffect(() => {
    if (!activeProfile) return;
    
    const sync = async () => {
      try {
        const lastSync = localStorage.getItem(`last_sync_${activeProfile.id}`);
        const today = new Date().toDateString();
        
        if (lastSync === today) return;

        // 1. Fetch active products to identify daily routine items
        const { data: products, error: prodError } = await supabase
          .from("cosmetic_shelf")
          .select("product_name, category")
          .eq("profile_id", activeProfile.id)
          .eq("is_active", true);

        if (prodError) throw prodError;

        if (!products || products.length === 0) {
          localStorage.setItem(`last_sync_${activeProfile.id}`, today);
          return;
        }

        // Daily categories heuristic
        const dailyCategories = ["Cleanser", "SPF", "Moisturizer", "Serum", "Toner"];
        const dailyProducts = products.filter(p => dailyCategories.includes(p.category));

        // 2. Fetch completed reminders to reset
        const { data: reminders, error: remError } = await supabase
          .from("skin_reminders")
          .select("id, task_name")
          .eq("profile_id", activeProfile.id)
          .eq("is_completed", true);

        if (remError) throw remError;

        if (reminders && reminders.length > 0) {
          const toReset = reminders.filter(r => 
            dailyProducts.some(p => 
              r.task_name.toLowerCase().includes(p.product_name.toLowerCase()) || 
              r.task_name.toLowerCase().includes(p.category.toLowerCase())
            )
          );

          if (toReset.length > 0) {
            const { error: updateError } = await supabase
              .from("skin_reminders")
              .update({ is_completed: false } as any)
              .in("id", toReset.map(r => r.id));
            
            if (updateError) throw updateError;
            
            toast.info(t("rem_dailySync") || "Daily routine updated!");
          }
        }

        localStorage.setItem(`last_sync_${activeProfile.id}`, today);
      } catch (err) {
        console.error("Daily sync failed:", err);
      }
    };

    sync();
  }, [activeProfile, t]);
}
