"use client";

import { Search, Ruler, ShoppingBag, Truck } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { SectionContainer } from "@/components/shared/section-container";

export function ProcessSteps() {
  const { t } = useLanguage();

  const steps = [
    { icon: Search, title: t("landing.step1"), desc: t("landing.step1desc") },
    { icon: Ruler, title: t("landing.step2"), desc: t("landing.step2desc") },
    { icon: ShoppingBag, title: t("landing.step3"), desc: t("landing.step3desc") },
    { icon: Truck, title: t("landing.step4"), desc: t("landing.step4desc") },
  ];

  return (
    <section className="border-y bg-muted/20 py-16 md:py-24">
      <SectionContainer>
        <ScrollReveal>
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {t("landing.process")}
            </h2>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <ScrollReveal key={i} variant="fade-up" delay={i * 0.12}>
              <div className="relative rounded-2xl border bg-card p-6 text-center">
                {/* Step number */}
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
