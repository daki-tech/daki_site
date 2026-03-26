import { Instagram, Mail, Clock, Phone } from "lucide-react";
import { getHomepageSettings } from "@/lib/data";
import { CONTACTS, buildViberUrl } from "@/lib/constants";
import { TelegramIcon } from "@/components/icons/telegram";
import { ViberIcon } from "@/components/icons/viber";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { TikTokIcon } from "@/components/icons/tiktok";

export const revalidate = 60;

export default async function ContactPage() {
  const settings = await getHomepageSettings();

  let phones: string[] = [];
  try {
    phones = JSON.parse(settings.contact_phones || "[]");
  } catch {
    if (settings.contact_phone) phones = [settings.contact_phone];
  }
  if (phones.length === 0) phones = CONTACTS.phones;

  const email = settings.contact_email || CONTACTS.email;
  const telegram = settings.contact_telegram || CONTACTS.telegram;
  const instagram = settings.contact_instagram || CONTACTS.instagram;
  const viber = settings.contact_viber || CONTACTS.viber;
  const whatsapp = settings.contact_whatsapp || CONTACTS.whatsapp;
  const tiktok = settings.contact_tiktok || "";

  const allLinks = [
    telegram && { href: telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`, icon: TelegramIcon, label: "Telegram", color: "#229ED9" },
    viber && { href: buildViberUrl(viber), icon: ViberIcon, label: "Viber", color: "#7360F2", note: "з мобільного" },
    whatsapp && { href: whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/[^+\d]/g, "")}`, icon: WhatsAppIcon, label: "WhatsApp", color: "#25D366" },
    instagram && { href: instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram}`, icon: Instagram, label: "Instagram", color: "#E4405F" },
    tiktok && { href: tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok}`, icon: TikTokIcon, label: "TikTok", color: "#000000" },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<{ className?: string }>; label: string; color: string; note?: string }[];

  return (
    <div>
      {/* Header */}
      <div className="pt-12 pb-12 text-center px-4">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Контакти
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground md:text-base">
          Ми завжди на зв&apos;язку. Оберіть зручний спосіб комунікації.
        </p>
      </div>

      {/* Messengers — main CTA */}
      <section className="bg-neutral-50 py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <div className="text-center">
            <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
              Напишіть нам
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Оберіть зручний спосіб зв&apos;язку
            </p>
          </div>
          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-4">
            {allLinks.map(({ href, icon: Icon, label, color, note }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={note ? `${label} (${note})` : label}
                className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-6 py-4 transition-all hover:border-neutral-400 hover:shadow-md"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  {note && (
                    <p className="text-[10px] text-muted-foreground">{note}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact details grid */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Phones */}
            {phones.length > 0 && (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200">
                  <Phone className="h-5 w-5 text-neutral-400" />
                </div>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">
                  Телефон
                </h3>
                <div className="mt-3 flex flex-col gap-1">
                  {phones.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Email */}
            {email && (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200">
                  <Mail className="h-5 w-5 text-neutral-400" />
                </div>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">
                  Email
                </h3>
                <a
                  href={`mailto:${email}`}
                  className="mt-3 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {email}
                </a>
              </div>
            )}

            {/* Schedule */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200">
                <Clock className="h-5 w-5 text-neutral-400" />
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">
                Графік роботи
              </h3>
              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                <p>Пн — Пт: 09:00 — 18:00</p>
                <p>Сб — Нд: вихідний</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
