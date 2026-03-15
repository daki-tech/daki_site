"use client";

import * as React from "react";

import type { Profile } from "@/lib/types";

interface ProfileContextValue {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  refresh: () => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextValue>({
  profile: null,
  setProfile: () => undefined,
  refresh: async () => undefined,
});

interface ProfileProviderProps {
  children: React.ReactNode;
  profile: Profile | null;
  refresh: () => Promise<void>;
}

export function ProfileProvider({ children, profile: initialProfile, refresh }: ProfileProviderProps) {
  const [profile, setProfile] = React.useState<Profile | null>(initialProfile);

  React.useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const value = React.useMemo(
    () => ({
      profile,
      setProfile,
      refresh,
    }),
    [profile, refresh],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return React.useContext(ProfileContext);
}
