import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAILS = ["seitbaevs.2008@gmail.com"];

interface PremiumContextType {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  showPremiumModal: boolean;
  setShowPremiumModal: (v: boolean) => void;
  isAdmin: boolean;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  setPremium: () => {},
  showPremiumModal: false,
  setShowPremiumModal: () => {},
  isAdmin: false,
});

export const usePremium = () => useContext(PremiumContext);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const [manualPremium, setManualPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const isPremium = isAdmin || manualPremium;

  return (
    <PremiumContext.Provider value={{ isPremium, setPremium: setManualPremium, showPremiumModal, setShowPremiumModal, isAdmin }}>
      {children}
    </PremiumContext.Provider>
  );
}
