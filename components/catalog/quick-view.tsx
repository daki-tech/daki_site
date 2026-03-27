"use client";

import { useState, useMemo } from "react";
import { X, Heart, ShoppingBag, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { CatalogModel, ModelColor } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";

interface QuickViewProps {
  model: CatalogModel;
  open: boolean;
  onClose: () => void;
}

export function QuickView({ model, open, onClose }: QuickViewProps) {
  const colors = model.model_colors ?? [];
  const defaultColor = colors.find((c) => c.is_default) ?? colors[0] ?? null;

  const [selectedColor, setSelectedColor] = useState<ModelColor | null>(defaultColor);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [mainImageIdx, setMainImageIdx] = useState(0);

  const { toggle, has } = useWishlist();
  const { addToCart } = useCart();
  const isFav = has(model.id);

  const currentImages = selectedColor?.image_urls?.length
    ? selectedColor.image_urls
    : model.image_urls;

  const finalPrice = model.base_price * (1 - model.discount_percent / 100);

  const sizes = useMemo(() => {
    return (model.model_sizes ?? []).map((s) => {
      let available = s.total_stock - s.sold_stock - s.reserved_stock;
      // Per-color stock
      if (selectedColor) {
        const colorStock = (selectedColor as unknown as { stock_per_size?: Record<string, number> }).stock_per_size;
        if (colorStock && colorStock[s.size_label] !== undefined) {
          available = colorStock[s.size_label];
        }
      }
      return { ...s, available };
    });
  }, [model.model_sizes, selectedColor]);

  const totalQty = Object.values(selectedSizes).reduce((a, b) => a + b, 0);

  const handleSizeToggle = (label: string, available: number) => {
    if (available <= 0) return;
    setSelectedSizes((prev) => {
      if (prev[label]) {
        const next = { ...prev };
        delete next[label];
        return next;
      }
      return { ...prev, [label]: 1 };
    });
  };

  const handleQty = (label: string, delta: number, available: number) => {
    setSelectedSizes((prev) => {
      const current = prev[label] || 0;
      const next = Math.max(0, Math.min(current + delta, available));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[label];
        return copy;
      }
      return { ...prev, [label]: next };
    });
  };

  const handleAddToCart = () => {
    if (totalQty === 0) {
      toast.error("Оберіть розмір");
      return;
    }
    addToCart({
      modelId: model.id,
      modelName: model.name,
      sku: model.sku,
      imageUrl: currentImages[0] ?? "",
      basePrice: model.base_price,
      discountPercent: model.discount_percent,
      color: selectedColor?.name,
      sizes: Object.entries(selectedSizes).map(([sizeLabel, quantity]) => ({ sizeLabel, quantity })),
    });
    toast.success("Додано в кошик");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-500 shadow transition hover:bg-white hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[3/4] bg-muted">
            {currentImages.length > 0 && (
              <SmartImage
                src={currentImages[mainImageIdx] || currentImages[0]}
                alt={model.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
            {/* Image dots */}
            {currentImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {currentImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImageIdx(idx)}
                    className={`h-1.5 w-1.5 rounded-full transition ${idx === mainImageIdx ? "bg-black" : "bg-black/30"}`}
                  />
                ))}
              </div>
            )}
            {/* Discount badge */}
            {model.discount_percent > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                -{model.discount_percent}%
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-6">
            <p className="text-[11px] text-muted-foreground">{model.sku}</p>
            <h2 className="mt-1 text-lg font-light uppercase tracking-wider">{model.name}</h2>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-semibold">{formatCurrency(finalPrice)}</span>
              {model.discount_percent > 0 && (
                <span className="text-sm text-muted-foreground line-through">{formatCurrency(model.base_price)}</span>
              )}
            </div>

            {/* Colors */}
            {colors.length > 1 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Колір: {selectedColor?.name || ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedColor(c);
                        setMainImageIdx(0);
                        setSelectedSizes({});
                      }}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        selectedColor?.id === c.id ? "border-black scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex || "#ccc" }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Розмір</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const isSelected = !!selectedSizes[s.size_label];
                  const isOut = s.available <= 0;
                  return (
                    <button
                      key={s.size_label}
                      onClick={() => handleSizeToggle(s.size_label, s.available)}
                      disabled={isOut}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-black bg-black text-white"
                          : isOut
                            ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                            : "border-neutral-200 hover:border-black"
                      }`}
                    >
                      {s.size_label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected sizes with quantity controls */}
            {Object.keys(selectedSizes).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(selectedSizes).map(([label, qty]) => {
                  const sizeInfo = sizes.find((s) => s.size_label === label);
                  const avail = sizeInfo?.available ?? 0;
                  return (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="text-sm font-medium">Розмір {label}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleQty(label, -1, avail)} className="flex h-6 w-6 items-center justify-center rounded-full border text-xs hover:bg-neutral-100">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button onClick={() => handleQty(label, 1, avail)} className="flex h-6 w-6 items-center justify-center rounded-full border text-xs hover:bg-neutral-100">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-5">
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800"
                >
                  <ShoppingBag className="h-4 w-4" />
                  В кошик {totalQty > 0 && `(${totalQty})`}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(model.id); }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 transition hover:bg-neutral-50"
                >
                  <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <Link
                href={`/catalog/${model.id}`}
                onClick={onClose}
                className="mt-3 block text-center text-xs text-muted-foreground underline transition hover:text-foreground"
              >
                Детальніше про товар
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
