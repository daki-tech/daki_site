"use client";

import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  const { t } = useLanguage();

  return (
    <AuthShell title={t("auth.successTitle")} subtitle={t("auth.successMessage")}>
      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href="/profile">Перейти в кабинет</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/catalog">Открыть каталог</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
