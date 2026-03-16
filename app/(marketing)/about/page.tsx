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
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:py-12">
      {/* Hero */}
      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-neutral-100">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=80"
          alt="DaKi Factory"
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 rounded-2xl" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="text-2xl font-light uppercase tracking-[0.2em] md:text-4xl">
            {t("about.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/70">
            {t("about.heroSub")}
          </p>
        </div>
      </div>
      {/* Recommended photo: 1400×612 px (16:7) */}

      {/* Story */}
      <div className="mt-10 rounded-2xl bg-neutral-50/80 p-6 sm:p-8">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
            <Image
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
              alt="Production"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          {/* Recommended photo: 800×600 px (4:3) */}
          <div>
            <h2 className="text-xl font-light uppercase tracking-[0.15em] md:text-2xl">
              {t("about.storyTitle")}
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-neutral-500 md:text-base">
              {t("about.story")}
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mt-10">
        <h2 className="text-center text-xl font-light uppercase tracking-[0.15em] md:text-2xl">
          {t("about.valuesTitle")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div key={i} className="rounded-2xl bg-neutral-50/80 p-6 text-center">
              <h3 className="text-sm font-medium uppercase tracking-[0.1em]">{v.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
