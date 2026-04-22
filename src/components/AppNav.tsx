import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, Camera, BarChart3, Bell, Home, Menu, X, LogOut, Package, GitCompareArrows, ShoppingBag, MessageCircle, MoreHorizontal, Crown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useProfile } from "@/contexts/ProfileContext";

const navItems = [
  { to: "/dashboard", labelKey: "nav_dashboard", icon: Home },
  { to: "/upload", labelKey: "nav_scan", icon: Camera },
  { to: "/progress", labelKey: "nav_progress", icon: GitCompareArrows },
  { to: "/shelf", labelKey: "nav_shelf", icon: Package },
  { to: "/shopping", labelKey: "nav_shopping", icon: ShoppingBag },
  { to: "/report", labelKey: "nav_report", icon: BarChart3 },
  { to: "/reminders", labelKey: "nav_reminders", icon: Bell },
];

const mobileMainItems = navItems.slice(0, 4); // Home, Scan, Progress, Shelf
const mobileMoreItems = navItems.slice(4); // Shopping, Report, Reminders

export default function AppNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isPremium: globalPremium, setShowPremiumModal } = usePremium();
  const { activeProfile } = useProfile();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isPremium = globalPremium || activeProfile?.is_premium;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-soft">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-gradient-primary">SkinTrack AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, labelKey, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {user && !isPremium && (
              <button
                onClick={() => navigate("/subscription")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
              >
                <Crown className="w-3.5 h-3.5" />
                Premium
              </button>
            )}
            {user && isPremium && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Crown className="w-3.5 h-3.5" />
                PRO
              </span>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("nav_signOut")}
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav_signIn")}
                </Link>
                <Link to="/signup" className="px-4 py-2 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity">
                  {t("nav_getStarted")}
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-md animate-fade-in">
            <div className="container mx-auto px-6 py-4 flex flex-col gap-2">
              {navItems.map(({ to, labelKey, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(labelKey)}
                  </Link>
                );
              })}
              <div className="border-t border-border/50 pt-2 mt-1 space-y-1">
                {user && !isPremium && (
                  <button
                    onClick={() => { navigate("/subscription"); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white w-full min-h-[44px] transition-opacity hover:opacity-90"
                  >
                    <Crown className="w-5 h-5" />
                    Premium
                  </button>
                )}
                {user && isPremium && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white min-h-[44px]">
                    <Crown className="w-5 h-5" />
                    PRO
                  </div>
                )}
                <a
                  href="https://t.me/Jukizavr"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-all min-h-[44px]"
                >
                  <MessageCircle className="w-5 h-5" />
                  {t("feedback_contact")}
                </a>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <LanguageSwitcher />
                <div className="flex gap-3">
                  {user ? (
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="flex-1 text-center py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {t("nav_signOut")}
                    </button>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                        {t("nav_signIn")}
                      </Link>
                      <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold">
                        {t("nav_getStarted")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <MobileBottomNav />
    </>
  );
}

function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isMoreActive = mobileMoreItems.some(item => location.pathname === item.to);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [moreOpen]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-md border-t border-border/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {moreOpen && (
        <div ref={moreRef} className="absolute bottom-full right-2 mb-2 bg-card border border-border/50 rounded-2xl shadow-elevated p-2 min-w-[160px] animate-scale-in">
          {mobileMoreItems.map(({ to, labelKey, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      )}
      <div className="flex">
        {mobileMainItems.map(({ to, labelKey, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 ${
            isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 transition-transform duration-200 ${isMoreActive ? "scale-110" : ""}`} />
          <span className="text-[10px] font-medium">{t("nav_more")}</span>
        </button>
      </div>
    </div>
  );
}
