"use client";

import Link from "next/link";
import { ArrowRight, Heart, ShoppingBag } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";
import type { CatalogModel } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";

interface FeaturedCollectionProps {
  models: CatalogModel[];
}

export function FeaturedCollection({ models }: FeaturedCollectionProps) {
  const { t } = useLanguage();
  const { toggle, has } = useWishlist();
  const { addToCart } = useCart();

  if (models.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Каталог
            </p>
            <h2 className="mt-2 text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
              {t("landing.featured")}
            </h2>
          </div>
          <Link
            href="/catalog"
            className="hidden items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition hover:text-foreground md:flex"
          >
            {t("common.viewAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {models.slice(0, 4).map((model) => {
            const finalPrice = model.base_price * (1 - model.discount_percent / 100);
            const firstImage = model.image_urls?.[0] || model.model_colors?.[0]?.image_urls?.[0];

            return (
              <Link key={model.id} href={`/catalog/${model.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  {firstImage ? (
                    <SmartImage
                      src={firstImage}
                      alt={model.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  {model.discount_percent > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                      -{model.discount_percent}%
                    </span>
                  )}

                  {/* Action buttons */}
                  <div className={`absolute right-3 top-3 flex flex-row gap-2 transition-opacity duration-300 ${has(model.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(model.id);
                      }}
                      aria-label="Додати в список бажань"
                    >
                      <Heart className={`h-4 w-4 transition ${has(model.id) ? "fill-red-500 text-red-500" : "text-black"}`} strokeWidth={1.5} />
                    </button>
                    {!model.is_out_of_stock && (
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-white"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const sizes = model.model_sizes ?? [];
                          const availableSize = sizes.find((s) => s.total_stock - s.sold_stock - s.reserved_stock > 0);
                          const sizeLabel = availableSize?.size_label || sizes[0]?.size_label || "";
                          if (!sizeLabel) return;
                          addToCart({
                            modelId: model.id,
                            modelName: model.name,
                            sku: model.sku,
                            imageUrl: model.image_urls?.[0] ?? "",
                            basePrice: model.base_price,
                            discountPercent: model.discount_percent,
                            sizes: [{ sizeLabel, quantity: 1 }],
                          });
                        }}
                        aria-label="Додати в кошик"
                      >
                        <ShoppingBag className="h-4 w-4 text-black" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    {model.sku}
                  </p>
                  <h3 className="text-sm font-normal leading-tight">{model.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{formatCurrency(finalPrice)}</span>
                    {model.discount_percent > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(model.base_price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile view all */}
        <div className="mt-10 text-center md:hidden">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground"
          >
            {t("common.viewAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
