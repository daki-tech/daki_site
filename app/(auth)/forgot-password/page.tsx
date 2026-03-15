"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/new-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Код отправлен на вашу почту");
      // Redirect to verify page with recovery type (same flow as registration)
      router.push(`/verify?email=${encodeURIComponent(email)}&type=recovery`);
    } catch {
      toast.error("Recovery flow is not configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.resetTitle")} subtitle="Введіть email для відновлення пароля">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>{t("auth.email")}</Label>
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : "Відправити код"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            {t("common.login")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
