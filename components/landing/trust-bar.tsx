"use client";

import { Award, Factory, Truck, Users } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { SectionContainer } from "@/components/shared/section-container";

export function TrustBar() {
  const { t } = useLanguage();

  const stats = [
    { icon: Users, text: t("trust.partners") },
    { icon: Award, text: t("trust.experience") },
    { icon: Factory, text: t("trust.manufacturer") },
    { icon: Truck, text: t("trust.shipping") },
  ];

  return (
    <section className="border-y bg-muted/40 py-8 md:py-10">
      <SectionContainer>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={i} variant="fade-up" delay={i * 0.1}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{stat.text}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
