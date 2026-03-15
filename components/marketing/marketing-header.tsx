"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { createClient } from "@/lib/supabase/client";

export function MarketingHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!cancelled) {
          setUserEmail(user?.email ?? null);
          if (user) {
            supabase.from("profiles").select("is_admin").eq("id", user.id).single().then(({ data }) => {
              if (!cancelled && data) setIsAdmin(!!data.is_admin);
            });
          }
        }
      });
    } catch {
      // Supabase not configured
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserEmail(null);
      setDropdownOpen(false);
      window.location.href = "/";
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background">
        <div className="mx-auto relative flex h-16 max-w-[1800px] items-center justify-between px-2 lg:px-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="font-logo absolute left-1/2 -translate-x-1/2 text-[28px] tracking-[0.2em] uppercase lg:static lg:translate-x-0"
          >
            DAKI
          </Link>

          {/* Desktop navigation — centered */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-7 lg:flex">
            {NAV_LINKS.marketing.map((item) => {
              const baseHref = item.href.split("?")[0];
              const isActive = baseHref === "/" ? pathname === "/" : pathname.startsWith(baseHref);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative text-[13px] font-semibold uppercase tracking-[0.12em] text-black transition-colors duration-200",
                    "after:absolute after:bottom-[-2px] after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full",
                    isActive && "after:w-full",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-6">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="group relative hidden h-10 w-10 items-center justify-center sm:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5 text-black transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Account */}
            {userEmail ? (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="group relative inline-flex h-10 w-10 items-center justify-center"
                  aria-label="Account"
                >
                  <User className="h-5 w-5 text-black transition-transform duration-200 group-hover:scale-110" />
                  <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 border border-border bg-background shadow-lg z-50">
                    <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground truncate">
                      {userEmail}
                    </div>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition"
                      >
                        <User className="h-3.5 w-3.5" /> Адмін-панель
                      </Link>
                    ) : (
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition"
                      >
                        <User className="h-3.5 w-3.5" /> Мій профіль
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm hover:bg-muted transition"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Вийти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="group relative hidden h-10 w-10 items-center justify-center sm:inline-flex"
                aria-label="Account"
              >
                <User className="h-5 w-5 transition-colors" />
                <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
              </Link>
            )}

            {/* Cart */}
            <Link
              href="/cart"
              className="group relative inline-flex h-10 w-10 items-center justify-center"
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="h-5 w-5 text-black transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
              {totalItems > 0 && (
                <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[300px] bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-logo text-xl tracking-[0.2em] uppercase">DAKI</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col py-4">
              {NAV_LINKS.marketing.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] transition hover:bg-muted"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border px-6 py-4">
              <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm">
                <Heart className="h-4 w-4" /> Список бажань
              </Link>
              {userEmail ? (
                <>
                  {isAdmin ? (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm">
                      <User className="h-4 w-4" /> Адмін-панель
                    </Link>
                  ) : (
                    <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm">
                      <User className="h-4 w-4" /> Мій профіль
                    </Link>
                  )}
                  <button onClick={() => { setMobileOpen(false); void handleLogout(); }} className="flex items-center gap-3 py-2 text-sm">
                    <LogOut className="h-4 w-4" /> Вийти
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm">
                  <User className="h-4 w-4" /> Увійти
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
