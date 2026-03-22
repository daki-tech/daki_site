"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Паролі не збігаються");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("different from the old")) {
          toast.error("Новий пароль має відрізнятися від попереднього");
        } else if (msg.includes("at least")) {
          toast.error("Пароль занадто короткий");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Пароль оновлено");
      router.push("/success");
    } catch {
      toast.error("Не вдалося оновити пароль. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.newPasswordTitle")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>{t("auth.password")}</Label>
          <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Підтвердіть пароль</Label>
          <Input
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("common.save")}
        </Button>
      </form>
    </AuthShell>
  );
}
