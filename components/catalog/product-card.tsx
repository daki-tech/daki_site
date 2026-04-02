"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { CatalogModel } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";
// import { QuickView } from "@/components/catalog/quick-view";

interface ProductCardProps {
  model: CatalogModel;
}

export function ProductCard({ model }: ProductCardProps) {
  const { toggle, has } = useWishlist();
  const { addToCart } = useCart();
  const isFav = has(model.id);
  const finalPrice = model.base_price * (1 - model.discount_percent / 100);
  const displayPrice = finalPrice;
  const images = model.image_urls?.length ? model.image_urls : [];

  const [hovered, setHovered] = useState(false);
  // const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);

  // Colors with at least one image
  const colors = (model.model_colors ?? []).filter((c) => c.image_urls?.length > 0);
  // When a color is selected, use its images; otherwise collect first image of each color for carousel preview
  const activeImages = selectedColorIdx !== null && colors[selectedColorIdx]
    ? colors[selectedColorIdx].image_urls
    : colors.length > 1
      ? colors.map((c) => c.image_urls[0])
      : images;

  // On hover show next image, on leave show first
  const currentIdx = hovered && activeImages.length > 1 ? 1 : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (model.is_out_of_stock) return;

    // Add 1 unit of first available size
    const sizes = model.model_sizes ?? [];
    const availableSize = sizes.find((s) => s.total_stock - s.sold_stock - s.reserved_stock > 0);
    const sizeLabel = availableSize?.size_label || sizes[0]?.size_label || "Один розмір";

    addToCart({
      modelId: model.id,
      modelName: model.name,
      sku: model.sku,
      imageUrl: images[0] ?? "",
      basePrice: model.base_price,
      discountPercent: model.discount_percent,
      sizes: [{ sizeLabel, quantity: 1 }],
    });
  };

  const outOfStock = model.is_out_of_stock;
  const Wrapper = Link;
  const wrapperProps = { href: `/catalog/${model.id}`, className: "block" };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Wrapper {...wrapperProps}>
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {activeImages.length > 0 ? (
            <SmartImage
              key={`${selectedColorIdx}-${currentIdx}`}
              src={activeImages[currentIdx] || activeImages[0]}
              alt={model.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <span className="text-xs tracking-wide">Photo</span>
            </div>
          )}

          {/* Discount badge */}
          {model.discount_percent > 0 && !outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              -{model.discount_percent}%
            </span>
          )}

          {/* Out of stock label */}
          {outOfStock && (
            <div className="absolute inset-x-0 bottom-[5px] flex justify-center">
              <span className="rounded-full bg-neutral-900/70 px-4 py-1.5 text-xs font-medium text-white">
                Немає в наявності
              </span>
            </div>
          )}

          {/* Action buttons - only when in stock */}
          {!outOfStock && (
            <div className="absolute right-3 top-3 flex flex-row gap-2">
              {/* Wishlist */}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(model.id);
                }}
                aria-label="Додати в список бажань"
              >
                <Heart className={`h-4 w-4 transition ${isFav ? "fill-red-500 text-red-500" : "text-black hover:scale-110"}`} strokeWidth={1.5} />
              </button>

              {/* Quick add to cart */}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-white"
                onClick={handleQuickAdd}
                aria-label="Додати в кошик"
              >
                <ShoppingBag className="h-4 w-4 text-black transition hover:scale-110" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          <p className="text-[11px] text-muted-foreground">{model.sku}</p>
          <h3 className="text-sm font-normal text-foreground">{model.name}</h3>

          {outOfStock ? (
            <p className="text-xs text-muted-foreground">Немає в наявності</p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`font-medium ${model.discount_percent > 0 ? "text-base text-red-600" : "text-sm"}`}>{formatCurrency(displayPrice)}</span>
              {model.discount_percent > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(model.base_price)}
                </span>
              )}
            </div>
          )}

          {/* Color swatches */}
          {colors.length > 1 && (
            <div className="mt-2 flex items-center gap-1.5">
              {colors.map((color, idx) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColorIdx(idx === selectedColorIdx ? null : idx);
                  }}
                  className={`h-4 w-4 rounded-full border transition-all ${
                    idx === selectedColorIdx
                      ? "ring-1 ring-offset-1 ring-black scale-110"
                      : "border-neutral-300 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color.hex || "#ccc" }}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
      </Wrapper>

      {/* Quick View Modal — disabled
      {quickViewOpen && (
        <QuickView model={model} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
      )}
      */}
    </div>
  );
}
