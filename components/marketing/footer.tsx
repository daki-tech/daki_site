"use client";

import Link from "next/link";
import { Instagram, Mail, Phone } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { TelegramIcon } from "@/components/icons/telegram";
import { ViberIcon } from "@/components/icons/viber";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { TikTokIcon } from "@/components/icons/tiktok";
import { CONTACTS, NAV_LINKS, APP_NAME } from "@/lib/constants";

interface FooterContacts {
  phones: string[];
  email: string;
  telegram: string;
  viber: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
}

interface FooterProps {
  contacts?: FooterContacts;
}

export function Footer({ contacts }: FooterProps) {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const phones = contacts?.phones?.length ? contacts.phones : CONTACTS.phones;
  const email = contacts?.email || CONTACTS.email;
  const telegram = contacts?.telegram || CONTACTS.telegram;
  const viber = contacts?.viber || CONTACTS.viber;
  const whatsapp = contacts?.whatsapp || CONTACTS.whatsapp;
  const instagram = contacts?.instagram || CONTACTS.instagram;
  const tiktok = contacts?.tiktok || "";

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-0 lg:justify-items-center">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="font-logo text-xl tracking-[0.2em] uppercase">
              {APP_NAME}
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium">
              {t("footer.navigation")}
            </h3>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.marketing.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium">
              {t("footer.account")}
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/login" className="text-xs text-muted-foreground transition hover:text-foreground">
                {t("common.login")}
              </Link>
              <Link href="/signup" className="text-xs text-muted-foreground transition hover:text-foreground">
                {t("common.signup")}
              </Link>
              <Link href="/profile" className="text-xs text-muted-foreground transition hover:text-foreground">
                {t("nav.orders")}
              </Link>
            </nav>
          </div>

          {/* Contacts + Social */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium">
              {t("footer.contacts")}
            </h3>
            <div className="flex flex-col gap-2">
              {phones.map((phone, idx) => (
                <a
                  key={`${phone}-${idx}`}
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  {phone}
                </a>
              ))}
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Mail className="h-3 w-3 shrink-0" />
                {email}
              </a>
            </div>
            <div className="flex items-center gap-3 pt-1">
              {telegram && (
                <a href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition hover:text-foreground" aria-label="Telegram">
                  <TelegramIcon className="h-4 w-4" />
                </a>
              )}
              {viber && (
                <a href={viber.startsWith("viber") ? viber : `viber://chat?number=${viber.replace(/[^+\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition hover:text-foreground" aria-label="Viber">
                  <ViberIcon className="h-4 w-4" />
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/[^+\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition hover:text-foreground" aria-label="WhatsApp">
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              )}
              {instagram && (
                <a href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition hover:text-foreground" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {tiktok && (
                <a href={tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition hover:text-foreground" aria-label="TikTok">
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-center text-[11px] text-muted-foreground" suppressHydrationWarning>
            &copy; {year} {APP_NAME}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
