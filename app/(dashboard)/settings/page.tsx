"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useLanguage } from "@/components/providers/language-provider";
import { useProfile } from "@/components/providers/profile-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { profile, setProfile, refresh } = useProfile();
  const { locale, setLocale, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [companyName, setCompanyName] = useState(profile?.company_name ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      full_name: fullName,
      company_name: companyName,
      interface_language: locale,
      theme: (theme ?? "light") as "light" | "dark",
    };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Save failed" }));
      toast.error(data.error ?? "Не удалось сохранить");
      setLoading(false);
      return;
    }

    const updated = await res.json();
    setProfile(updated);
    await refresh();
    toast.success("Профиль обновлен");
    setLoading(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
          <CardDescription>{t("settings.profile")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("auth.fullName")}</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          {profile?.customer_type === "wholesale" && (
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="ООО Ваша компания" />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("auth.email")}</Label>
            <Input value={profile?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select value={locale} onValueChange={(value: "ru" | "uk" | "en") => setLocale(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="uk">Українська</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <Select value={(theme as "light" | "dark") ?? "light"} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? t("common.loading") : t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.subscription")}</CardTitle>
          <CardDescription>Текущий оптовый пакет вашей компании</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border/60 p-4">
            <p className="text-sm text-muted-foreground">Текущий тариф</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{profile?.subscription_tier ?? "free"}</p>
          </div>
          <Button variant="outline">Управление подпиской</Button>
        </CardContent>
      </Card>
    </div>
  );
}
