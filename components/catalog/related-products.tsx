"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatCurrency } from "@/lib/utils";
import type { CatalogModel } from "@/lib/types";

interface RelatedProductsProps {
  currentModelId: string;
  category?: string;
}

export function RelatedProducts({ currentModelId, category }: RelatedProductsProps) {
  const [products, setProducts] = useState<CatalogModel[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    params.set("limit", "8");
    params.set("exclude", currentModelId);

    fetch(`/api/catalog?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
        else if (data.models) setProducts(data.models);
      })
      .catch(() => {});
  }, [currentModelId, category]);

  if (products.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14">
        <h2 className="text-lg font-medium tracking-wide mb-8">Інші товари</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {products.slice(0, 8).map((p) => {
            const finalPrice = p.base_price * (1 - p.discount_percent / 100);
            const firstImage = p.model_colors?.[0]?.image_urls?.[0] || p.image_urls?.[0];
            return (
              <Link
                key={p.id}
                href={`/catalog/${p.id}`}
                className="group block"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                  {firstImage && (
                    <SmartImage
                      src={firstImage}
                      alt={p.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )}
                  {p.discount_percent > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      -{p.discount_percent}%
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="text-xs text-neutral-400">{p.sku}</p>
                  <p className="mt-0.5 text-sm font-medium line-clamp-1">{p.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={`font-medium ${p.discount_percent > 0 ? "text-base text-red-600" : "text-sm"}`}>{formatCurrency(finalPrice)}</span>
                    {p.discount_percent > 0 && (
                      <span className="text-xs text-neutral-400 line-through">
                        {formatCurrency(p.base_price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
