import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile, fetchProfile } from "@/services/profile.service";
import type { ProfileRow } from "@/types/database";

interface ProfileContextValue {
  profile: ProfileRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInitial = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const row = await ensureProfile(user);
    setProfile(row);
    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const row = await fetchProfile(user.id);
    setProfile(row);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading,
      refresh,
    }),
    [profile, loading, refresh]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile должен вызываться внутри ProfileProvider");
  }
  return ctx;
}
