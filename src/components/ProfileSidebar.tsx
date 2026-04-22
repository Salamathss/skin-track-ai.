import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, MessageCircle, Crown } from "lucide-react";
import { useProfile, SubProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import CreateProfileModal from "./CreateProfileModal";

function getGenderAvatar(profile: SubProfile) {
  switch (profile.gender) {
    case "female": return "👩";
    case "male": return "👨";
    default: return "🧑";
  }
}

export default function ProfileSidebar() {
  const { profiles, activeProfile, setActiveProfile, deleteProfile } = useProfile();
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const showMobileProfileBar = location.pathname !== "/dashboard";

  return (
    <>
      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 bg-card/95 backdrop-blur-md border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-56"
        } md:flex hidden`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          {!collapsed && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Profiles
            </span>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {profiles.map((profile) => {
            const isActive = activeProfile?.id === profile.id;
            return (
              <button
                key={profile.id}
                onClick={() => setActiveProfile(profile)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 border border-primary/30 shadow-soft"
                    : "hover:bg-muted/60 border border-transparent"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-200 ${
                    isActive ? "gradient-primary shadow-soft scale-105" : "bg-muted"
                  }`}
                >
                  {getGenderAvatar(profile)}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {profile.profile_name}
                      </p>
                      {profile?.is_premium && (
                        <div className="flex-shrink-0 bg-amber-500/10 text-amber-500 rounded px-1 py-0.5 animate-pulse">
                          <Crown className="w-2.5 h-2.5 fill-current" />
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <p className="text-[10px] text-primary font-medium mt-0.5">Active</p>
                    )}
                  </div>
                )}
                {!collapsed && profiles.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${profile?.profile_name}"? All scan data for this profile will be lost.`)) {
                        deleteProfile(profile.id);
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (confirm(`Delete "${profile?.profile_name}"? All scan data for this profile will be lost.`)) {
                        deleteProfile(profile.id);
                      }
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-destructive/10 active:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t border-border/50 space-y-1">
          <button
            onClick={() => setModalOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Add Profile</span>}
          </button>
          <a
            href="https://t.me/Jukizavr"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{t("feedback_contact")}</span>}
          </a>
        </div>
      </aside>

      {showMobileProfileBar && <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {profiles.map((profile) => {
          if (!profile) return null;
          const isActive = activeProfile?.id === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => setActiveProfile(profile)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 min-h-[40px] ${
                isActive
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className="text-base">{getGenderAvatar(profile)}</span>
              <span className="max-w-[70px] truncate">{profile.profile_name}</span>
              {profile?.is_premium && <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />}
            </button>
          );
        })}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-dashed border-border text-muted-foreground hover:bg-muted transition-colors flex-shrink-0 min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">{t("add")}</span>
        </button>
      </div>}

      <CreateProfileModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
