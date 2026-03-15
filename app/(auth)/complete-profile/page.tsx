"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { createClient } from "@/lib/supabase/client";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      // If profile already complete, redirect
      if (user.user_metadata?.phone) {
        router.push("/catalog");
        return;
      }
      // Pre-fill from Google data if available
      setFirstName(user.user_metadata?.full_name?.split(" ")[0] || "");
      setLastName(user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "");
      setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("Заповніть усі поля");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Профіль збережено!");
      router.push("/catalog");
    } catch {
      toast.error("Помилка збереження профілю");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <AuthShell title="Завершіть реєстрацію" subtitle="Вкажіть свої дані для оформлення замовлень">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">Ім&apos;я *</Label>
            <Input
              id="firstName"
              value={firstName}
              required
              placeholder="Ім'я"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Прізвище *</Label>
            <Input
              id="lastName"
              value={lastName}
              required
              placeholder="Прізвище"
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон *</Label>
          <PhoneInput
            id="phone"
            value={phone}
            required
            onChange={(v) => setPhone(v)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Збереження..." : "Зберегти та продовжити"}
        </Button>
      </form>
    </AuthShell>
  );
}
