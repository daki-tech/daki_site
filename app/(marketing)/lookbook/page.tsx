"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { SectionContainer } from "@/components/shared/section-container";

const MOCK_PHOTOS = Array.from({ length: 9 }, (_, i) => ({
  id: String(i + 1),
  alt: `Lookbook photo ${i + 1}`,
}));

export default function LookbookPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[30vh] items-center bg-gradient-to-br from-[hsl(350,30%,18%)] to-[hsl(350,25%,28%)]">
        <SectionContainer className="py-16 text-center md:py-24">
          <ScrollReveal>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
              {t("lookbook.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
              {t("lookbook.subtitle")}
            </p>
          </ScrollReveal>
        </SectionContainer>
      </section>

      {/* Gallery grid */}
      <section className="py-16 md:py-24">
        <SectionContainer>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {MOCK_PHOTOS.map((photo, i) => {
              const heights = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square"];
              const h = heights[i % 3];
              return (
                <ScrollReveal key={photo.id} variant="fade-up" delay={(i % 3) * 0.1}>
                  <div className={`mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/60 ${h}`}>
                    <div className="flex h-full items-center justify-center text-muted-foreground/20">
                      <span className="text-xs tracking-wide">Photo {photo.id}</span>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
