"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  profile: Profile | null;
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = profile?.is_admin;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem("session-active");
    router.push("/login");
  };

  const links = isAdmin
    ? [
        { href: "/admin", label: "Панель" },
        { href: "/", label: "На сайт" },
        { href: "/catalog", label: "Каталог" },
      ]
    : [
        { href: "/profile", label: "Кабінет" },
        { href: "/orders", label: "Замовлення" },
        { href: "/settings", label: "Налаштування" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="font-logo text-[28px] tracking-[0.2em] uppercase">
          DAKI
        </Link>
        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="inline-flex h-9 items-center gap-0.5 rounded-2xl bg-neutral-100 p-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-4 py-1.5 text-xs font-medium text-muted-foreground transition-all",
                  pathname === item.href && "bg-white text-foreground shadow-sm",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:inline">
            {profile?.full_name ?? profile?.email ?? ""}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground"
            title="Вийти"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Вийти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
