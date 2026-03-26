"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/components/providers/language-provider";
import { NAV_LINKS, CONTACTS, buildViberUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { TelegramIcon } from "@/components/icons/telegram";
import { ViberIcon } from "@/components/icons/viber";
import { WhatsAppIcon } from "@/components/icons/whatsapp";

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { totalItems } = useCart();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground md:hidden"
        aria-label={t("common.open")}
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* drawer */}
          <div className="absolute inset-y-0 right-0 flex w-[300px] max-w-[85vw] flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
            {/* header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="font-display text-xl font-semibold tracking-tight"
              >
                DaKi
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition hover:bg-foreground/5"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* nav links */}
            <nav className="flex-1 overflow-y-auto px-5 py-6">
              <div className="space-y-1">
                {NAV_LINKS.marketing.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-[15px] font-medium transition",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>

              <div className="my-6 border-t" />

              {/* cart & account */}
              <div className="space-y-1">
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground/70 transition hover:bg-muted hover:text-foreground"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("nav.cart")}
                  {totalItems > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground/70 transition hover:bg-muted hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  {t("common.login")}
                </Link>
              </div>

              <div className="my-6 border-t" />

              {/* language */}
              <div className="px-3">
                <LanguageSwitcher />
              </div>
            </nav>

            {/* footer socials */}
            <div className="border-t px-5 py-4">
              <div className="flex items-center justify-center gap-3">
                <a
                  href={CONTACTS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-[#229ED9]/10 hover:text-[#229ED9]"
                >
                  <TelegramIcon className="h-4 w-4" />
                </a>
                <a
                  href={buildViberUrl(CONTACTS.viber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-[#7360F2]/10 hover:text-[#7360F2]"
                >
                  <ViberIcon className="h-4 w-4" />
                </a>
                <a
                  href={CONTACTS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-[#25D366]/10 hover:text-[#25D366]"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
