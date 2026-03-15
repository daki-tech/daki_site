"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { ParallaxCard } from "@/components/shared/parallax-card";
import { SectionContainer } from "@/components/shared/section-container";
import { PriceDisplay } from "@/components/shared/price-display";

const MOCK_NEW = [
  { id: "5", name: "Пуховик Sophia", sku: "DK-S500", price: 5800 },
  { id: "6", name: "Пальто Venezia", sku: "DK-V600", price: 4500 },
  { id: "7", name: "Куртка Berlin", sku: "DK-B700", price: 3200 },
];

export function NewArrivals() {
  const { t } = useLanguage();

  return (
    <section className="border-y bg-muted/20 py-16 md:py-24">
      <SectionContainer>
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {t("landing.newArrivals")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("landing.newArrivalsSub")}
              </p>
            </div>
            <Link
              href="/catalog"
              className="hidden items-center gap-1 text-sm font-medium text-primary transition hover:gap-2 md:flex"
            >
              {t("common.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Grid */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_NEW.map((item, i) => (
            <ScrollReveal key={item.id} variant="fade-up" delay={i * 0.12}>
              <Link href={`/catalog/${item.id}`} className="group block">
                <ParallaxCard className="overflow-hidden rounded-2xl border bg-card transition group-hover:shadow-lg">
                  {/* Image placeholder */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-muted to-muted/60">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                      <span className="text-xs uppercase tracking-widest">Photo</span>
                    </div>
                    {/* New badge */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      <Sparkles className="h-3 w-3" />
                      New
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                    <h3 className="mt-1 font-medium text-foreground group-hover:text-primary transition">
                      {item.name}
                    </h3>
                    <PriceDisplay price={item.price} size="sm" className="mt-2" />
                  </div>
                </ParallaxCard>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            {t("common.viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionContainer>
    </section>
  );
}
