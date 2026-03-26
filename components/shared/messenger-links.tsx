"use client";

import { Phone } from "lucide-react";

import { TelegramIcon } from "@/components/icons/telegram";
import { ViberIcon } from "@/components/icons/viber";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { CONTACTS, buildViberUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MessengerLinksProps {
  message?: string;
  className?: string;
  size?: "sm" | "md";
  showLabels?: boolean;
}

export function MessengerLinks({
  message,
  className,
  size = "md",
  showLabels = false,
}: MessengerLinksProps) {
  const encoded = message ? encodeURIComponent(message) : "";

  const links = [
    {
      label: "Telegram",
      href: encoded ? `${CONTACTS.telegram}?text=${encoded}` : CONTACTS.telegram,
      icon: TelegramIcon,
      color: "hover:bg-[#229ED9]/10 hover:text-[#229ED9]",
    },
    {
      label: "Viber",
      href: buildViberUrl(CONTACTS.viber, message),
      icon: ViberIcon,
      color: "hover:bg-[#7360F2]/10 hover:text-[#7360F2]",
    },
    {
      label: "WhatsApp",
      href: encoded ? `${CONTACTS.whatsapp}?text=${encoded}` : CONTACTS.whatsapp,
      icon: WhatsAppIcon,
      color: "hover:bg-[#25D366]/10 hover:text-[#25D366]",
    },
    {
      label: "Phone",
      href: `tel:${CONTACTS.phones[0]?.replace(/\s/g, "")}`,
      icon: Phone,
      color: "hover:bg-primary/10 hover:text-primary",
    },
  ];

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-9 min-w-9 px-2.5" : "h-10 min-w-10 px-3";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card text-muted-foreground transition",
            link.color,
            btnSize,
          )}
        >
          <link.icon className={iconSize} />
          {showLabels && (
            <span className="text-sm font-medium">
              {link.label}
              {link.label === "Viber" && <span className="ml-1 text-[10px] text-muted-foreground font-normal">(з мобільного)</span>}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
