"use client";

import { useState } from "react";

import type { CatalogModel, ModelColor } from "@/lib/types";
import { ProductHero } from "@/components/catalog/product-hero";
import { ProductDescription } from "@/components/catalog/product-description";
import { ProductSizeChart } from "@/components/catalog/product-size-chart";

interface ProductPageClientProps {
  model: CatalogModel;
  contacts?: Record<string, string>;
}

export function ProductPageClient({ model, contacts }: ProductPageClientProps) {
  const colors = model.model_colors ?? [];
  const defaultColor = colors.find((c) => c.is_default) ?? colors[0] ?? null;
  const [selectedColor, setSelectedColor] = useState<ModelColor | null>(defaultColor);

  return (
    <>
      {/* BLOCK 1: Hero — Info left + Gallery right */}
      <section>
        <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-8 lg:py-6">
          <ProductHero model={model} onColorChange={setSelectedColor} contacts={contacts} />
        </div>
      </section>

      {/* BLOCK 2: Description + Composition & Care */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8 lg:py-10">
          <ProductDescription model={model} selectedColor={selectedColor} />
        </div>
      </section>

      {/* BLOCK 3: Size chart */}
      {model.size_chart && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8 lg:py-10">
            <ProductSizeChart sizeChart={model.size_chart} />
          </div>
        </section>
      )}
    </>
  );
}
