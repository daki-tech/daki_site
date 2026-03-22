"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const email = searchParams.get("email") ?? "";
  const type = (searchParams.get("type") ?? "signup") as "signup" | "recovery";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token, type });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid")) {
          toast.error("Невірний або прострочений код");
        } else if (msg.includes("rate") || msg.includes("security")) {
          toast.error("Зачекайте перед повторною спробою");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (type === "recovery") {
        router.push("/new-password");
        return;
      }

      router.push("/success");
    } catch {
      toast.error(t("auth.verifyError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const supabase = createClient();
      if (type === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/new-password`,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      toast.success(t("auth.codeSent"));
    } catch {
      toast.error(t("auth.codeFailed"));
    }
  };

  return (
    <AuthShell title={t("auth.verifyTitle")} subtitle={t("auth.verifyHint")}>
      <form className="space-y-4" onSubmit={handleVerify}>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label>Код підтвердження</Label>
          <Input
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]*"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("auth.verify")}
        </Button>
        <Button type="button" className="w-full" variant="outline" onClick={handleResend}>
          {t("auth.resendCode")}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
