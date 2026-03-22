"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") || "/profile";

  // Autofill email and password from localStorage if "remember me" was previously checked
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem("remember-me");
      if (savedRemember === "true") {
        const savedEmail = localStorage.getItem("remember-email");
        const savedPwd = localStorage.getItem("remember-pwd");
        if (savedEmail) setEmail(savedEmail);
        if (savedPwd) {
          try { setPassword(atob(savedPwd)); } catch { /* invalid base64 */ }
        }
        setRememberMe(true);
      }
    } catch {}
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }

      localStorage.setItem("remember-me", String(rememberMe));
      if (rememberMe) {
        localStorage.setItem("remember-email", email);
        localStorage.setItem("remember-pwd", btoa(password));
      } else {
        localStorage.removeItem("remember-email");
        localStorage.removeItem("remember-pwd");
      }
      sessionStorage.setItem("session-active", "true");

      // Check if user is admin and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Link guest orders to this user by email
        if (user.email) {
          fetch("/api/auth/link-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
          }).catch(() => {});
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.is_admin) {
          router.push("/admin");
          router.refresh();
          return;
        }
      }

      router.push(next);
      router.refresh();
    } catch {
      toast.error("Auth is not configured. Add Supabase keys to .env.local.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Google OAuth is not configured.");
    }
  };

  const inputCls = "w-full rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3 text-sm transition-colors focus:bg-white focus:border-neutral-400 focus:outline-none focus:ring-0";

  return (
    <AuthShell title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{t("auth.email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{t("auth.password")}</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLock ? <p className="text-xs text-amber-600">{t("auth.capsLock")}</p> : null}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer ${rememberMe ? "bg-black" : "bg-neutral-300"}`}
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${rememberMe ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-neutral-600">{t("auth.remember")}</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-neutral-500 hover:text-black transition">
            {t("auth.forgot")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("common.login")}
        </button>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Google
        </button>

        <p className="text-center text-sm text-neutral-500">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="text-black font-medium hover:underline">
            {t("common.signup")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
