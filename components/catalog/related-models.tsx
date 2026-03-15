"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogModel } from "@/lib/types";

interface RelatedModelsProps {
  models: CatalogModel[];
}

export function RelatedModels({ models }: RelatedModelsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-light tracking-wide">Інші моделі</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-900 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {models.map((model) => (
          <div key={model.id} className="w-[220px] flex-shrink-0 snap-start lg:w-[260px]">
            <ProductCard model={model} />
          </div>
        ))}
      </div>
    </div>
  );
}
