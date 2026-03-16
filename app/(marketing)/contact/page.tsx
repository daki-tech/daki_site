import { Instagram, Mail, Phone } from "lucide-react";
import { getHomepageSettings } from "@/lib/data";
import { CONTACTS } from "@/lib/constants";
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

  const messengers = [
    telegram && { href: telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`, icon: TelegramIcon, label: "Telegram" },
    viber && { href: viber.startsWith("viber") ? viber : `viber://chat?number=${viber.replace(/[^+\d]/g, "")}`, icon: ViberIcon, label: "Viber" },
    whatsapp && { href: whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/[^+\d]/g, "")}`, icon: WhatsAppIcon, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];

  const socialNetworks = [
    instagram && { href: instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram}`, icon: Instagram, label: "Instagram" },
    tiktok && { href: tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok}`, icon: TikTokIcon, label: "TikTok" },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];

  return (
    <div className="mx-auto max-w-[900px] px-4 py-12 lg:px-6 lg:py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400">
          Зв&apos;яжіться з нами
        </p>
        <h1 className="mt-3 text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Контакти
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-neutral-500">
          Ми завжди на зв&apos;язку. Оберіть зручний спосіб комунікації.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-8 sm:grid-cols-2">
        {/* Left: Phone + Messengers */}
        <div className="rounded-2xl bg-neutral-50/80 p-8 space-y-6">
          {phones.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
                <Phone className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                Телефон
              </p>
              <div className="flex flex-col items-center gap-1.5">
                {phones.map((phone, idx) => (
                  <a
                    key={idx}
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="text-sm font-medium transition hover:text-neutral-600"
                  >
                    {phone}
                  </a>
                ))}
              </div>
            </div>
          )}

          {messengers.length > 0 && (
            <div className="border-t border-neutral-200 pt-6">
              <p className="text-center text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400 mb-4">
                Месенджери
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {messengers.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-all group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Email + Social Networks */}
        <div className="rounded-2xl bg-neutral-50/80 p-8 space-y-6">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex flex-col items-center gap-3 transition hover:opacity-80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                Email
              </p>
              <p className="text-sm font-medium">{email}</p>
            </a>
          )}

          {socialNetworks.length > 0 && (
            <div className="border-t border-neutral-200 pt-6">
              <p className="text-center text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400 mb-4">
                Соцмережі
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {socialNetworks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-all group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
