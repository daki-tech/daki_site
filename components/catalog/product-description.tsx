"use client";

import { Droplets, Wind, Sun, Scissors, Sparkles } from "lucide-react";

import type { CatalogModel, ModelColor } from "@/lib/types";
import { SmartMedia } from "@/components/ui/smart-image";

const CARE_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  "НЕ ПРАТИ": { icon: <Droplets className="h-4 w-4" />, label: "Не прати" },
  "НЕ ВІДБІЛЮВАТИ": { icon: <Sparkles className="h-4 w-4" />, label: "Не відбілювати" },
  "НЕ СУШИТИ В СУШАРЦІ БАРАБАННОГО ТИПУ": {
    icon: <Wind className="h-4 w-4" />,
    label: "Не сушити в барабані",
  },
  "НЕ ПРАСУВАТИ": { icon: <Sun className="h-4 w-4" />, label: "Не прасувати" },
  "НЕ ЧИСТИТИ ХІМІЧНО": {
    icon: <Scissors className="h-4 w-4" />,
    label: "Не чистити хімічно",
  },
};

interface ProductDescriptionProps {
  model: CatalogModel;
  selectedColor?: ModelColor | null;
}

export function ProductDescription({ model, selectedColor }: ProductDescriptionProps) {
  const isHtml = (text: string | null | undefined): boolean =>
    !!text && /<[a-z][\s\S]*>/i.test(text);

  const descriptionIsHtml = isHtml(model.description);
  const descriptionItems = !descriptionIsHtml && model.description
    ? model.description
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^[-•]\s*/, ""))
    : [];

  const careIsHtml = isHtml(model.care_instructions);
  const careItems = !careIsHtml && model.care_instructions
    ? model.care_instructions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const fabricLines = model.fabric
    ? model.fabric.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  const rawDescMedia =
    selectedColor?.description_image ?? model.detail_images?.[0] ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-stretch">
      {/* LEFT: Photo / Video */}
      {rawDescMedia ? (
        <div className="relative overflow-hidden rounded-xl bg-neutral-100 min-h-[300px]">
          <SmartMedia
            src={rawDescMedia}
            alt={`${model.name} — деталь`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="bg-neutral-100 rounded-xl min-h-[300px]" />
      )}

      {/* RIGHT: Description + Composition & Care */}
      <div className="flex flex-col justify-start">
        {/* Опис */}
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-400 mb-5">
          Опис
        </p>
        {descriptionIsHtml ? (
          <div
            className="text-sm text-neutral-700 leading-relaxed tracking-wide prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: model.description! }}
          />
        ) : descriptionItems.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {descriptionItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-4 py-3">
                <span className="mt-0.5 text-neutral-300 font-thin text-base leading-none select-none">
                  —
                </span>
                <span className="text-sm text-neutral-700 leading-relaxed tracking-wide">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Опис відсутній</p>
        )}

        <div className="my-8 border-t border-neutral-100" />

        {/* Склад і догляд */}
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-400 mb-5">
          Склад і догляд
        </p>

        {careIsHtml ? (
          <div
            className="text-sm text-neutral-600 leading-relaxed prose prose-sm max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: model.care_instructions! }}
          />
        ) : (
          <>
            {fabricLines.length > 0 && (
              <div className="space-y-2.5 mb-6">
                {fabricLines.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="mt-2 h-px w-4 flex-shrink-0 bg-neutral-300" />
                    <span className="text-sm text-neutral-600 leading-relaxed">{line}</span>
                  </div>
                ))}
              </div>
            )}

            {model.filling && (
              <div className="flex items-start gap-3 mb-6">
                <span className="mt-2 h-px w-4 flex-shrink-0 bg-neutral-300" />
                <span className="text-sm text-neutral-600 leading-relaxed">{model.filling}</span>
              </div>
            )}

            {careItems.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
                {careItems.map((item, idx) => {
                  const match = Object.entries(CARE_ICONS).find(([key]) =>
                    item.toUpperCase().includes(key)
                  );
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                        {match ? match[1].icon : <Sparkles className="h-4 w-4" />}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.08em] text-neutral-500 leading-tight">
                        {match ? match[1].label : item}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
