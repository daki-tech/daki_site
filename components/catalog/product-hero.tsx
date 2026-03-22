"use client";

import { useState, useMemo, useCallback } from "react";
import { Heart, ShoppingBag } from "lucide-react";

import type { CatalogModel, ModelColor } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";
import { addToCart } from "@/lib/cart-store";
import { useWishlist, toggleWishlist } from "@/lib/wishlist-store";
import { CONTACTS } from "@/lib/constants";
import { ProductAccordion } from "@/components/catalog/product-accordion";
import { ProductShare } from "@/components/catalog/product-share";

interface ProductHeroProps {
  model: CatalogModel;
  onColorChange?: (color: ModelColor | null) => void;
  contacts?: Record<string, string>;
}

const TelegramIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.283c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.6l-2.95-.924c-.642-.203-.654-.642.136-.952l11.526-4.443c.535-.194 1.003.131.83.967z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ViberIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.693 6.698.623 9.82c-.07 3.121-.154 8.972 5.48 10.574H6.1l-.003 2.43s-.04.985.618 1.184c.79.243 1.253-.502 2.007-1.308.413-.443.981-1.098 1.412-1.588 3.89.326 6.885-.42 7.23-.53.787-.254 5.237-.823 5.961-6.719.747-6.078-.363-9.912-2.343-11.644-.516-.451-2.59-1.825-7.43-1.84l-.154.002v-.359zm.096 1.93c4.071.012 6.386 1.196 6.792 1.553 1.663 1.442 2.526 4.872 1.883 9.92-.598 4.89-4.195 5.2-4.856 5.41-.29.093-2.967.76-6.32.551 0 0-2.506 3.015-3.288 3.8-.124.126-.271.174-.371.149-.14-.037-.178-.197-.177-.435l.021-3.788c-4.757-1.32-4.499-6.283-4.44-8.948.06-2.665.543-4.777 1.996-6.221 1.926-1.77 5.574-2.003 8.76-1.991zM11.9 5.19c-.373 0-.373.578 0 .583 2.82.02 5.133 2.368 5.116 5.266 0 .378.58.378.58 0C17.62 7.84 15.03 5.211 11.9 5.19zm-3.362.97c-.339-.025-.657.067-.943.286l-.036.03c-.644.541-.956 1.176-1.016 1.873-.092 1.08.38 2.188 1.074 3.126l.015.02c1.288 1.743 3.019 3.053 5.03 3.677l.022.007c.406.131.823.21 1.222.213.395.002.787-.07 1.13-.255.36-.193.62-.503.737-.879l.015-.05c.103-.346.017-.74-.225-.986-.56-.572-1.254-.977-1.864-1.258-.407-.187-.786-.059-1.04.235l-.308.36-.027.033c-.147.172-.306.228-.455.152-.85-.427-1.615-.98-2.257-1.65-.508-.531-.921-1.147-1.197-1.826-.041-.115-.018-.25.045-.352l.022-.032c.13-.187.279-.35.419-.52.14-.172.264-.356.326-.544.097-.292.05-.633-.112-.918-.26-.456-.617-.857-.975-1.19-.185-.168-.373-.268-.568-.323l-.05-.011c-.043-.007-.086-.012-.129-.018l-.062-.006-.118-.003z" />
  </svg>
);

export function ProductHero({ model, onColorChange, contacts }: ProductHeroProps) {
  const colors = model.model_colors ?? [];
  const defaultColor = colors.find((c) => c.is_default) ?? colors[0] ?? null;

  const [selectedColor, setSelectedColor] = useState<ModelColor | null>(defaultColor);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const currentImages = (selectedColor?.image_urls?.length
    ? selectedColor.image_urls
    : model.image_urls
  );

  const finalPrice = model.base_price * (1 - model.discount_percent / 100);

  const sizes = useMemo(() => {
    return (model.model_sizes ?? []).map((s) => ({
      ...s,
      available: s.total_stock - s.sold_stock - s.reserved_stock,
    }));
  }, [model.model_sizes]);

  const totalUnits = Object.values(selectedSizes).reduce((a, b) => a + b, 0);

  const wishlist = useWishlist();
  const isWished = wishlist.ids.includes(model.id);

  const messengerLinks = useMemo(() => {
    const productUrl = `https://dakifashion.com/catalog/${model.id}`;
    const message = `Доброго дня! Мене цікавить модель: ${model.name} (арт. ${model.sku})\n${productUrl}`;
    const encoded = encodeURIComponent(message);

    // Messenger links — always show Telegram (@daki_support), plus WhatsApp/Viber if configured
    const tgSupport = CONTACTS.telegram_support || "daki_support";
    const wa = contacts?.contact_whatsapp || CONTACTS.whatsapp;
    const vb = contacts?.contact_viber || CONTACTS.viber;

    const links = [];
    links.push({ name: "Telegram", href: `https://t.me/${tgSupport}?text=${encoded}`, icon: <TelegramIcon />, color: "#0088cc" });
    if (wa) {
      const waPhone = wa.replace(/[^+\d]/g, "");
      links.push({ name: "WhatsApp", href: `https://wa.me/${waPhone}?text=${encoded}`, icon: <WhatsAppIcon />, color: "#25D366" });
    }
    if (vb) {
      const viberNum = vb.replace(/[^+\d]/g, "");
      links.push({ name: "Viber", href: `viber://chat?number=${viberNum}&text=${encoded}`, icon: <ViberIcon />, color: "#7360F2" });
    }
    return links;
  }, [model.id, model.name, model.sku, contacts]);

  function handleColorChange(color: ModelColor) {
    setSelectedColor(color);
    setMainImageIdx(0);
    onColorChange?.(color);
  }

  function toggleSize(label: string) {
    setSelectedSizes((prev) => {
      const copy = { ...prev };
      if (copy[label]) {
        delete copy[label];
      } else {
        copy[label] = 1;
      }
      return copy;
    });
  }

  function handleAddToCart() {
    if (totalUnits === 0) return;
    addToCart({
      modelId: model.id,
      modelName: model.name,
      sku: model.sku,
      imageUrl: currentImages[0] ?? "",
      basePrice: model.base_price,
      discountPercent: model.discount_percent,
      color: selectedColor?.name,
      sizes: Object.entries(selectedSizes)
        .filter(([, q]) => q > 0)
        .map(([label, quantity]) => ({ sizeLabel: label, quantity })),
    });
    setSelectedSizes({});
  }

  const handleZoomMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-12 items-start">
      {/* LEFT: Product info */}
      <div className="flex flex-col justify-start pt-0 lg:pt-4">
        {/* SKU */}
        <p className="text-xs tracking-widest text-neutral-400">{model.sku}</p>

        {/* Name */}
        <h1 className="mt-1 text-2xl font-light tracking-wide lg:text-3xl">{model.name}</h1>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-xl font-normal">{formatCurrency(finalPrice)}</span>
          {model.discount_percent > 0 && (
            <span className="text-sm text-neutral-400 line-through">
              {formatCurrency(model.base_price)}
            </span>
          )}
        </div>

        {/* Color selector */}
        {colors.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-neutral-500 mb-2">
              Колір — {selectedColor?.name ?? "оберіть"}
            </p>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorChange(color)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    selectedColor?.id === color.id
                      ? "border-neutral-900 scale-110"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size selector */}
        <div className="mt-6">
          <p className="text-xs text-neutral-500 mb-2">Розмір — Обрати розмір</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSelected = selectedSizes[size.size_label] !== undefined;
              const isAvailable = size.available > 0;
              return (
                <button
                  key={size.id}
                  disabled={!isAvailable}
                  onClick={() => toggleSize(size.size_label)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-all ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : isAvailable
                        ? "border-neutral-300 hover:border-neutral-900"
                        : "border-neutral-200 text-neutral-300 cursor-not-allowed"
                  }`}
                >
                  {size.size_label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add to cart + Wishlist — full width, aligned with sizes */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleAddToCart}
            disabled={totalUnits === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-900 py-3.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <ShoppingBag className="h-4 w-4" />
            Додати у кошик
            {totalUnits > 0 && (
              <span className="ml-1 opacity-60">({totalUnits})</span>
            )}
          </button>

          <button
            onClick={() => toggleWishlist(model.id)}
            className={`group flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
              isWished
                ? "border-red-200 bg-red-50"
                : "border-neutral-200 hover:border-neutral-900"
            }`}
          >
            <Heart
              className={`h-5 w-5 transition-all ${
                isWished
                  ? "fill-red-500 text-red-500"
                  : "text-neutral-500 group-hover:text-neutral-900"
              }`}
            />
          </button>
        </div>

        {/* Messenger order links */}
        {messengerLinks.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-[10px] tracking-[0.15em] text-neutral-400">
              або замовити через
            </p>
            <div className="flex gap-2">
              {messengerLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2.5 text-xs text-neutral-600 transition-all hover:border-neutral-700 hover:text-neutral-900"
                >
                  <span style={{ color: link.color }}>{link.icon}</span>
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Accordion sections */}
        <ProductAccordion model={model} />

        {/* Share */}
        <ProductShare model={model} />
      </div>

      {/* RIGHT: Gallery */}
      <div className="flex gap-3">
        {/* Main image */}
        <div
          className="relative aspect-[3/4] max-h-[calc(100vh-140px)] overflow-hidden bg-neutral-100 rounded-xl"
          style={{ cursor: isZooming ? "zoom-in" : undefined }}
          onMouseMove={handleZoomMove}
          onMouseEnter={() => setIsZooming(true)}
          onMouseLeave={() => setIsZooming(false)}
        >
          {currentImages[mainImageIdx] && (
            <>
              <SmartImage
                src={currentImages[mainImageIdx]}
                alt={`${model.name}${selectedColor ? ` — ${selectedColor.name}` : ""}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 55vw"
                priority
              />
              {isZooming && (
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    backgroundImage: `url(${currentImages[mainImageIdx]})`,
                    backgroundSize: "250%",
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Thumbnails column */}
        {currentImages.length > 1 && (
          <div className="flex flex-col gap-2 w-20 lg:w-24 overflow-y-auto">
            {currentImages.slice(0, 6).map((url, idx) => (
              <button
                key={idx}
                onClick={() => setMainImageIdx(idx)}
                className={`relative aspect-[4/5] flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  idx === mainImageIdx
                    ? "border-neutral-900"
                    : "border-transparent hover:border-neutral-400"
                }`}
              >
                <SmartImage
                  src={url}
                  alt={`${model.name} фото ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="100px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
