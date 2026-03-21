"use client";

import Image from "next/image";

import { useLanguage } from "@/components/providers/language-provider";

export default function AboutPage() {
  const { t } = useLanguage();

  const values = [
    { title: t("about.value1"), desc: t("about.value1desc") },
    { title: t("about.value2"), desc: t("about.value2desc") },
    { title: t("about.value3"), desc: t("about.value3desc") },
    { title: t("about.value4"), desc: t("about.value4desc") },
  ];

  return (
    <>
      {/* Hero — full-width banner, рекомендований розмір: 1920×700 px */}
      <section className="relative flex min-h-[50vh] items-center justify-center bg-neutral-100">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=80"
          alt="DaKi Factory"
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-4 text-center text-white">
          <h1 className="text-3xl font-light tracking-wide md:text-5xl">
            {t("about.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/70 md:text-base">
            {t("about.heroSub")}
          </p>
        </div>
      </section>

      {/* Story — рекомендований розмір фото: 800×600 px (4:3) */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-3 lg:px-4">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
              <Image
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
                alt="Production"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-light tracking-wide md:text-2xl">
                {t("about.storyTitle")}
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground md:text-base">
                {t("about.story")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-3 lg:px-4">
          <h2 className="text-center text-xl font-light tracking-wide md:text-2xl">
            {t("about.valuesTitle")}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <div key={i} className="text-center">
                <h3 className="text-sm font-medium">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
