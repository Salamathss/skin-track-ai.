import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubProfile {
  id: string;
  user_id: string;
  profile_name: string;
  avatar_url: string | null;
  gender: string | null;
  city_name: string | null;
  city_lat: number | null;
  city_lon: number | null;
  is_premium: boolean;
  created_at: string;
}

interface ProfileContextType {
  profiles: SubProfile[];
  activeProfile: SubProfile | null;
  setActiveProfile: (profile: SubProfile) => void;
  loading: boolean;
  createProfile: (name: string, gender?: string) => Promise<SubProfile | null>;
  deleteProfile: (id: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profiles: [],
  activeProfile: null,
  setActiveProfile: () => {},
  loading: true,
  createProfile: async () => null,
  deleteProfile: async () => {},
  refreshProfiles: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<SubProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SubProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sub_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        // Silently handle table not found or schema errors
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.status === 404) {
          console.warn("Profiles table not found or inaccessible (Guest Mode):", error.message);
          setProfiles([]);
          setActiveProfile(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      let rawList = (data as any[]) ?? [];
      let list: SubProfile[] = rawList.map(p => ({
        ...p,
        is_premium: !!p.is_premium // Force boolean, default to false if null/undefined
      }));

      if (list.length === 0) {
        try {
          const { data: newProfile, error: insertError } = await supabase
            .from("sub_profiles")
            .insert({ user_id: user.id, profile_name: "My Skin", is_premium: false })
            .select()
            .single();
          
          if (!insertError && newProfile) {
            const sanitized = { 
              ...(newProfile as any), 
              is_premium: !!(newProfile as any).is_premium 
            } as SubProfile;
            list = [sanitized];
          }
        } catch (insertErr) {
          console.warn("Failed to auto-create profile (Guest Mode):", insertErr);
        }
      }

      setProfiles(list);

      const savedId = localStorage.getItem(`active_profile_${user.id}`);
      const saved = list.find((p) => p.id === savedId);
      setActiveProfile(saved ?? list[0] ?? null);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      // Fallback: don't block the app
      setProfiles([]);
      setActiveProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSetActive = (profile: SubProfile) => {
    setActiveProfile(profile);
    if (user) localStorage.setItem(`active_profile_${user.id}`, profile.id);
  };

  const createProfile = async (name: string, gender?: string): Promise<SubProfile | null> => {
    if (!user) return null;
    console.log("Creating profile for user:", user.id, { name, gender });
    const { data, error } = await supabase
      .from("sub_profiles")
      .insert({ user_id: user.id, profile_name: name, gender: gender || null, is_premium: false })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }
    
    if (!data) {
      console.error("No data returned from profile creation");
      return null;
    }

    const profile = data as SubProfile;
    setProfiles((prev) => [...prev, profile]);
    return profile;
  };

  const deleteProfile = async (id: string) => {
    try {
      await supabase.from("sub_profiles").delete().eq("id", id);
      setProfiles((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        if (activeProfile?.id === id) {
          const next = updated[0] ?? null;
          setActiveProfile(next);
          if (user && next) localStorage.setItem(`active_profile_${user.id}`, next.id);
        }
        return updated;
      });
    } catch (err) {
      console.error("Error deleting profile:", err);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile: handleSetActive,
        loading,
        createProfile,
        deleteProfile,
        refreshProfiles: fetchProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
