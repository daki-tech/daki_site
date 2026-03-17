import { Instagram, Mail, MessageCircle, Phone } from "lucide-react";
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
    <div className="mx-auto max-w-[1600px] px-4 py-12 lg:px-6 lg:py-20">
      {/* Header */}
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Зв&apos;яжіться з нами
        </p>
        <h1 className="mt-3 text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Контакти
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Ми завжди на зв&apos;язку. Оберіть зручний спосіб комунікації.
        </p>
      </div>

      {/* Four sections: Phones, Email, Messengers, Social Networks */}
      <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
        {/* Phones */}
        {phones.length > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-8 transition-all hover:border-neutral-400 hover:shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Phone className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
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

        {/* Email */}
        {email && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-8 transition-all hover:border-neutral-400 hover:shadow-sm">
            <a
              href={`mailto:${email}`}
              className="flex flex-col items-center gap-3 transition hover:opacity-80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium">{email}</p>
            </a>
          </div>
        )}

        {/* Messengers */}
        {messengers.length > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-8 transition-all hover:border-neutral-400 hover:shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Месенджери
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {messengers.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-1.5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-all group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social Networks */}
        {socialNetworks.length > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-8 transition-all hover:border-neutral-400 hover:shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Instagram className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Соцмережі
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {socialNetworks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-1.5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-all group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
