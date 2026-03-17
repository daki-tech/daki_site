"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogModel } from "@/lib/types";
import type { CustomerType } from "@/hooks/use-customer-type";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";

interface ProductCardProps {
  model: CatalogModel;
  customerType?: CustomerType;
}

export function ProductCard({ model, customerType = "retail" }: ProductCardProps) {
  const { toggle, has } = useWishlist();
  const { addToCart } = useCart();
  const isFav = has(model.id);
  const finalPrice = model.base_price * (1 - model.discount_percent / 100);
  const isWholesale = customerType === "wholesale";
  const wholesalePrice = model.wholesale_price || 0;
  const displayPrice = isWholesale && wholesalePrice > 0 ? wholesalePrice : finalPrice;
  const images = model.image_urls?.length ? model.image_urls : [];
  const hasMultipleImages = images.length > 1;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCarousel = useCallback(() => {
    if (!hasMultipleImages) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 1500);
  }, [hasMultipleImages, images.length]);

  const stopCarousel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentIdx(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

  return (
    <div
      className="group relative"
      onMouseEnter={() => {
        setIsHovering(true);
        startCarousel();
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        stopCarousel();
      }}
    >
      <Link href={`/catalog/${model.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {images.length > 0 ? (
            <>
              {images.map((url, idx) => (
                <SmartImage
                  key={idx}
                  src={url}
                  alt={idx === 0 ? model.name : ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={`object-cover transition-opacity duration-500 ease-in-out ${
                    idx === currentIdx ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <span className="text-xs uppercase tracking-widest">Photo</span>
            </div>
          )}

          {/* Discount badge */}
          {model.discount_percent > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              -{model.discount_percent}%
            </span>
          )}

          {/* Out of stock overlay */}
          {model.is_out_of_stock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                Немає в наявності
              </span>
            </div>
          )}

          {/* Action buttons - top right, outline style without background */}
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
            {!model.is_out_of_stock && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-white"
                onClick={handleQuickAdd}
                aria-label="Додати в кошик"
              >
                <ShoppingBag className="h-4 w-4 text-black transition hover:scale-110" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Carousel dots removed per design */}
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          <p className="text-[11px] text-muted-foreground">{model.sku}</p>
          <h3 className="text-sm font-normal text-foreground">{model.name}</h3>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{formatCurrency(displayPrice)}</span>
            {model.discount_percent > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(model.base_price)}
              </span>
            )}
            {isWholesale && wholesalePrice > 0 && (
              <span className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Опт</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
