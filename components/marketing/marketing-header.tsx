"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { MODEL_SEASONS, NAV_LINKS, CONTACTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCart, openCartDrawer } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { createClient } from "@/lib/supabase/client";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const SEASON_LABELS: Record<string, string> = {
  "Осінньо-весняна": "Осінньо-весняна колекція",
  "Зимова": "Зимова колекція",
  "Літо": "Літня колекція",
};

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

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const catalogTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCatalogEnter = useCallback(() => {
    if (catalogTimeout.current) clearTimeout(catalogTimeout.current);
    setCatalogOpen(true);
  }, []);

  const handleCatalogLeave = useCallback(() => {
    catalogTimeout.current = setTimeout(() => setCatalogOpen(false), 150);
  }, []);

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
            className="font-logo absolute left-1/2 -translate-x-1/2 text-[34px] tracking-[0.01em] uppercase lg:static lg:translate-x-0"
          >
            DAKI
          </Link>

          {/* Desktop navigation — centered */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-5 xl:gap-6 lg:flex">
            {NAV_LINKS.marketing.map((item) => {
              const baseHref = item.href.split("?")[0];
              const isActive = baseHref === "/" ? pathname === "/" : pathname.startsWith(baseHref);
              const isCatalog = item.href === "/catalog";

              if (isCatalog) {
                return (
                  <div
                    key={item.href}
                    className="static"
                    onMouseEnter={handleCatalogEnter}
                    onMouseLeave={handleCatalogLeave}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "relative text-[13px] font-semibold text-black transition-colors duration-200",
                        "after:absolute after:bottom-[-2px] after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full",
                        isActive && "after:w-full",
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative text-[13px] font-semibold text-black transition-colors duration-200",
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
          <div className="flex items-center gap-4">
            {/* Instagram */}
            <a
              href={CONTACTS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 px-3.5 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90 lg:inline-flex"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              наш інстаграм
            </a>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="group relative hidden h-10 w-10 items-center justify-center lg:inline-flex"
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
              <div className="relative hidden lg:block" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="group relative inline-flex h-10 w-10 items-center justify-center"
                  aria-label="Account"
                >
                  <User className="h-5 w-5 text-black transition-transform duration-200 group-hover:scale-110" />
                  <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-neutral-200/60 bg-white/95 backdrop-blur-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 text-xs text-neutral-400 truncate">
                      {userEmail}
                    </div>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-neutral-50 transition border-t border-neutral-100"
                      >
                        <User className="h-3.5 w-3.5 text-neutral-400" /> Адмін-панель
                      </Link>
                    ) : (
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-neutral-50 transition border-t border-neutral-100"
                      >
                        <User className="h-3.5 w-3.5 text-neutral-400" /> Мій профіль
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 border-t border-neutral-100 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Вийти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="group relative hidden h-10 w-10 items-center justify-center lg:inline-flex"
                aria-label="Account"
              >
                <User className="h-5 w-5 transition-colors" />
                <span className="absolute bottom-0 left-1/2 h-[1.5px] w-0 -translate-x-1/2 bg-black transition-all duration-300 group-hover:w-5" />
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={openCartDrawer}
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
            </button>
          </div>
        </div>

        {/* Full-width catalog mega-menu */}
        <div
          className={cn(
            "absolute left-0 right-0 top-full border-t border-neutral-100 bg-white shadow-lg transition-all duration-200 z-40",
            catalogOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none",
          )}
          onMouseEnter={handleCatalogEnter}
          onMouseLeave={handleCatalogLeave}
        >
          <div className="mx-auto max-w-[1800px] px-6 py-6">
            <div className="flex items-center justify-center gap-8">
              <Link href="/catalog" className="text-sm font-semibold text-neutral-900 transition hover:underline">
                Всі моделі
              </Link>
              {MODEL_SEASONS.map((season) => (
                <Link key={season} href={`/catalog?season=${encodeURIComponent(season)}`} className="text-sm text-neutral-600 transition hover:text-neutral-900 hover:underline">
                  {SEASON_LABELS[season] || season}
                </Link>
              ))}
              <Link href="/catalog?category=Розпродаж" className="text-sm font-semibold text-red-600 transition hover:text-red-700 hover:underline">
                Розпродаж
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[300px] bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-logo text-2xl tracking-[0.01em] uppercase">DAKI</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col py-4">
              {NAV_LINKS.marketing.map((item) => {
                const isCatalog = item.href === "/catalog";

                if (isCatalog) {
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setMobileCatalogOpen(!mobileCatalogOpen)}
                        className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium transition hover:bg-muted"
                      >
                        {t(item.labelKey)}
                        <span className={cn("text-xs transition-transform duration-200 inline-block", mobileCatalogOpen && "rotate-180")}>▾</span>
                      </button>
                      <div className={cn("overflow-hidden transition-all duration-200", mobileCatalogOpen ? "max-h-60" : "max-h-0")}>
                        <Link
                          href="/catalog"
                          onClick={() => setMobileOpen(false)}
                          className="block px-10 py-2.5 text-sm text-neutral-600 transition hover:bg-muted"
                        >
                          Всі моделі
                        </Link>
                        {MODEL_SEASONS.map((season) => (
                          <Link
                            key={season}
                            href={`/catalog?season=${encodeURIComponent(season)}`}
                            onClick={() => setMobileOpen(false)}
                            className="block px-10 py-2.5 text-sm text-neutral-600 transition hover:bg-muted"
                          >
                            {SEASON_LABELS[season] || season}
                          </Link>
                        ))}
                        <Link
                          href="/catalog?category=Розпродаж"
                          onClick={() => setMobileOpen(false)}
                          className="block px-10 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-muted"
                        >
                          Розпродаж
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-6 py-3 text-sm font-medium transition hover:bg-muted"
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border px-6 py-4">
              <a
                href={CONTACTS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white"
              >
                <InstagramIcon className="h-4 w-4" />
                Наш інстаграм
              </a>
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
