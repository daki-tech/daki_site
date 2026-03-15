"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [customerType, setCustomerType] = useState<"retail" | "wholesale">("retail");
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/profile`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Google OAuth is not configured.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            newsletter_subscribed: newsletter,
            customer_type: customerType,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Перевірте email для підтвердження");
      router.push(`/verify?email=${encodeURIComponent(email)}&type=signup`);
    } catch {
      toast.error("Auth is not configured. Add Supabase keys to .env.local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.signupTitle")} subtitle={t("auth.signupSubtitle")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("auth.fullName")}</Label>
          <Input
            id="fullName"
            value={fullName}
            required
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
            {capsLock ? <p className="text-xs text-amber-600">{t("auth.capsLock")}</p> : null}
        </div>

        {/* Customer type selector */}
        <div className="space-y-2">
          <Label>Тип покупця</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCustomerType("retail")}
              className={`flex-1 border py-2.5 text-sm font-medium transition ${
                customerType === "retail"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/50"
              }`}
            >
              Роздріб
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("wholesale")}
              className={`flex-1 border py-2.5 text-sm font-medium transition ${
                customerType === "wholesale"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/50"
              }`}
            >
              Опт
            </button>
          </div>
          {customerType === "wholesale" && (
            <p className="text-xs text-muted-foreground">
              Оптовим покупцям доступні спеціальні ціни та замовлення ростовками
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-0.5 h-4 w-4 border border-border accent-foreground"
          />
          <span className="text-sm text-muted-foreground">
            Підписатися на розсилку новинок та спецпропозицій
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("common.signup")}
        </Button>

        <Button type="button" className="w-full" variant="outline" onClick={handleGoogle}>
          Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("common.login")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
