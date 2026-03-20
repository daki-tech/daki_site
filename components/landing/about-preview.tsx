"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { SmartImage } from "@/components/ui/smart-image";

const DEFAULT_IMAGE = "";

interface AboutPreviewProps {
  title?: string;
  subtitle?: string;
  text?: string;
  mediaUrl?: string;
  /** Aspect ratio string like "4:5", "1:1", "16:9" */
  aspect?: string;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function AboutPreview({ title, subtitle, text, mediaUrl, aspect }: AboutPreviewProps) {
  const { t } = useLanguage();
  const mediaSrc = mediaUrl || DEFAULT_IMAGE;
  const showVideo = isVideo(mediaSrc);

  // Parse aspect ratio string ("4:5") to CSS value ("4/5")
  const cssAspect = aspect?.includes(":") ? aspect.replace(":", "/") : "4/3";

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
          {/* Media */}
          <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: cssAspect }}>
            {showVideo ? (
              <video
                src={mediaSrc}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : mediaSrc.endsWith(".svg") ? (
              <Image
                src={mediaSrc}
                alt="Про компанію DaKi"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <SmartImage src={mediaSrc} alt="Про компанію DaKi" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            )}
          </div>

          {/* Text */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {subtitle || "Наша історія"}
            </p>
            <h2 className="mt-3 text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
              {title || t("landing.aboutPreview")}
            </h2>
            {text ? (
              <p className="mt-8 text-sm leading-[1.8] text-muted-foreground md:text-base whitespace-pre-line">
                {text}
              </p>
            ) : (
              <>
                <p className="mt-8 text-sm leading-[1.8] text-muted-foreground md:text-base">
                  {t("landing.aboutText")}
                </p>
                <p className="mt-4 text-sm leading-[1.8] text-muted-foreground md:text-base">
                  {t("about.story")}
                </p>
              </>
            )}
            <Link
              href="/about"
              className="mt-10 inline-flex items-center gap-2 border-b border-foreground pb-1 text-[11px] font-medium uppercase tracking-[0.15em] transition hover:opacity-60"
            >
              {t("common.learnMore")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
