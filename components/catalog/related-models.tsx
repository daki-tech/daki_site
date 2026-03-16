"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogModel } from "@/lib/types";

interface RelatedModelsProps {
  models: CatalogModel[];
}

const VISIBLE = 4;

export function RelatedModels({ models }: RelatedModelsProps) {
  const [offset, setOffset] = useState(0);
  const maxOffset = Math.max(0, models.length - VISIBLE);

  const prev = useCallback(() => setOffset((o) => Math.max(0, o - VISIBLE)), []);
  const next = useCallback(() => setOffset((o) => Math.min(maxOffset, o + VISIBLE)), [maxOffset]);

  const visible = models.slice(offset, offset + VISIBLE);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-light tracking-wide">Інші моделі</h2>
        {models.length > VISIBLE && (
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={offset === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-900 transition-colors disabled:opacity-30 disabled:hover:border-neutral-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              disabled={offset >= maxOffset}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-900 transition-colors disabled:opacity-30 disabled:hover:border-neutral-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((model) => (
          <div key={model.id}>
            <ProductCard model={model} />
          </div>
        ))}
      </div>
    </div>
  );
}
