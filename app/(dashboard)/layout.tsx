"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { DashboardHeader } from "@/components/dashboard/header";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import type { Locale, Profile } from "@/lib/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [locale, setLocale] = useState<Locale>("uk");
  const [isReady, setIsReady] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const rememberMe = localStorage.getItem("remember-me");
      const sessionActive = sessionStorage.getItem("session-active");
      if (rememberMe === "false" && !sessionActive) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }
      sessionStorage.setItem("session-active", "true");

      const ensureRes = await fetch("/api/ensure-profile", { method: "POST" });
      if (ensureRes.ok) {
        const ensured = (await ensureRes.json()) as Profile;
        setProfile(ensured);
        setLocale(ensured.interface_language ?? "uk");
        setTheme(ensured.theme ?? "light");

        // Redirect admin to /admin
        if (ensured.is_admin && pathname === "/profile") {
          router.replace("/admin");
        }

        setIsReady(true);
        return;
      }

      setProfile({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        subscription_tier: "free",
        interface_language: "uk",
        theme: "light",
        is_admin: false,
        newsletter_subscribed: false,
        customer_type: "retail",
        phone: null,
        company_name: null,
        delivery_city: null,
        delivery_branch: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsReady(true);
    } catch {
      router.push("/login");
    }
  }, [router, pathname, setTheme]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface_language: nextLocale }),
      });
    } catch {
      // no-op
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <LanguageProvider locale={locale} onLocaleChange={handleLocaleChange} persistKey="dashboard-locale">
      <ProfileProvider profile={profile} refresh={loadProfile}>
        <div className="flex h-[100dvh] flex-col overflow-hidden">
          <DashboardHeader profile={profile} />
          <main className="flex-1 overflow-y-auto">
            <div className="container py-6">{children}</div>
          </main>
        </div>
      </ProfileProvider>
    </LanguageProvider>
  );
}
