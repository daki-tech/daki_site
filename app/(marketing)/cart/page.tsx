"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { TelegramIcon } from "@/components/icons/telegram";
import { ViberIcon } from "@/components/icons/viber";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { CONTACTS } from "@/lib/constants";
import { useCart, updateCartItemColor, replaceCartItemSizes } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { createClient } from "@/lib/supabase/client";

interface ModelMeta {
  colors: { id: string; name: string; hex: string; image_urls: string[] }[];
  sizes: { size_label: string; available: number }[];
}

export default function CartPage() {
  const { t } = useLanguage();
  const { items, totalItems, totalAmount, removeFromCart, updateCartItemSize, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [modelMeta, setModelMeta] = useState<Record<string, ModelMeta>>({});
  // Track which items originally needed color/size selection
  const [itemsNeedingSelection, setItemsNeedingSelection] = useState<Set<string>>(new Set());

  // Fetch model colors/sizes for items that don't have a color set
  useEffect(() => {
    const needsMeta = items.filter((item) => !item.color);
    if (needsMeta.length === 0) return;
    setItemsNeedingSelection((prev) => {
      const next = new Set(prev);
      needsMeta.forEach((item) => next.add(item.modelId));
      return next;
    });

    const supabase = createClient();
    const ids = needsMeta.map((i) => i.modelId);

    (async () => {
      const { data: models } = await supabase
        .from("catalog_models")
        .select("id, model_colors(id, name, hex, image_urls), model_sizes(size_label, total_stock, sold_stock, reserved_stock)")
        .in("id", ids);

      if (!models) return;

      const meta: Record<string, ModelMeta> = {};
      for (const m of models) {
        meta[m.id] = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          colors: (m.model_colors ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            hex: c.hex,
            image_urls: c.image_urls ?? [],
          })),
          sizes: (m.model_sizes ?? []).map((s: { size_label: string; total_stock: number; sold_stock: number; reserved_stock: number }) => ({
            size_label: s.size_label,
            available: s.total_stock - s.sold_stock - s.reserved_stock,
          })),
        };
      }
      setModelMeta(meta);
    })();
  }, [items]);

  if (items.length === 0 && !checkoutOpen && !orderSuccess) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-4 text-xl font-light uppercase tracking-[0.15em]">{t("cart.empty")}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t("cart.emptySub")}</p>
        <Link
          href="/catalog"
          className="mt-6 rounded-xl bg-black px-8 py-3 text-xs font-medium uppercase tracking-[0.1em] text-white transition hover:bg-neutral-800"
        >
          {t("cart.continueShopping")}
        </Link>
      </div>
    );
  }

  const orderLines = items.map((item) => {
    const price = item.basePrice * (1 - item.discountPercent / 100);
    const qty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
    const sizesStr = item.sizes.map((s) => `${s.sizeLabel}×${s.quantity}`).join(", ");
    return `${item.modelName} (${item.sku})${item.color ? ` [${item.color}]` : ""} — ${sizesStr} = ${qty} шт. × ${formatCurrency(price)}`;
  });
  const orderMessage = `Доброго дня! Замовлення:\n${orderLines.join("\n")}\n\nРазом: ${totalItems} од. на ${formatCurrency(totalAmount)}`;

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-8 lg:px-4 lg:py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light uppercase tracking-[0.15em] md:text-2xl">
          {t("cart.title")}
        </h1>
        <button
          onClick={clearCart}
          className="text-xs text-neutral-400 transition hover:text-neutral-700"
        >
          {t("cart.clearCart")}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Items */}
        <div className="divide-y divide-border">
          {items.map((item) => {
            const finalPrice = item.basePrice * (1 - item.discountPercent / 100);
            const itemQty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
            const meta = modelMeta[item.modelId];
            const showSelector = itemsNeedingSelection.has(item.modelId) && !!meta;
            const needsSelection = !item.color;

            return (
              <div key={item.modelId} className="flex gap-4 py-6 first:pt-0">
                {/* Image */}
                <Link
                  href={`/catalog/${item.modelId}`}
                  className="relative h-28 w-20 shrink-0 overflow-hidden bg-muted md:h-36 md:w-24"
                >
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.modelName} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground/40">Photo</div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                      <Link href={`/catalog/${item.modelId}`} className="text-sm font-medium transition hover:text-muted-foreground">
                        {item.modelName}
                      </Link>
                      {item.color && (
                        <p className="text-[11px] text-muted-foreground">Колір: {item.color}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.modelId)}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-medium">{formatCurrency(finalPrice)}</span>
                    {item.discountPercent > 0 && (
                      <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.basePrice)}</span>
                    )}
                  </div>

                  {/* Color/Size selection card for quick-added items */}
                  {showSelector && (
                    <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 shadow-sm">
                      {needsSelection && (
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-4">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Оберіть колір та розмір
                        </div>
                      )}
                      {!needsSelection && (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-4">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white text-[10px]">✓</span>
                          Колір обрано: {item.color}
                        </div>
                      )}

                      {/* Color selector */}
                      {meta.colors.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">Колір</p>
                          <div className="flex flex-wrap gap-2">
                            {meta.colors.map((color) => {
                              const isActive = item.color === color.name;
                              return (
                                <button
                                  key={color.id}
                                  onClick={() => {
                                    updateCartItemColor(
                                      item.modelId,
                                      color.name,
                                      color.image_urls[0] || item.imageUrl
                                    );
                                  }}
                                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                                    isActive
                                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                                      : "border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm"
                                  }`}
                                >
                                  <span className="h-4 w-4 rounded-full border border-neutral-200" style={{ backgroundColor: color.hex }} />
                                  <span className={`text-xs font-medium ${isActive ? "text-white" : "text-neutral-700"}`}>{color.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size selector */}
                      {meta.sizes.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">Розмір</p>
                          <div className="flex flex-wrap gap-2">
                            {meta.sizes.map((size) => {
                              const isSelected = item.sizes.some((s) => s.sizeLabel === size.size_label);
                              const isAvailable = size.available > 0;
                              return (
                                <button
                                  key={size.size_label}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (isSelected) {
                                      const newSizes = item.sizes.filter((s) => s.sizeLabel !== size.size_label);
                                      if (newSizes.length === 0) newSizes.push({ sizeLabel: size.size_label, quantity: 1 });
                                      replaceCartItemSizes(item.modelId, newSizes);
                                    } else {
                                      const newSizes = [...item.sizes.filter((s) => s.sizeLabel !== "ONE" && s.sizeLabel !== ""), { sizeLabel: size.size_label, quantity: 1 }];
                                      replaceCartItemSizes(item.modelId, newSizes);
                                    }
                                  }}
                                  className={`flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition ${
                                    isSelected
                                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                                      : isAvailable
                                        ? "border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm"
                                        : "border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed"
                                  }`}
                                >
                                  {size.size_label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Size quantities with +/- controls */}
                  {!showSelector && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.sizes.map((sz) => (
                        <div key={sz.sizeLabel} className="flex items-center gap-1.5 border border-border px-2 py-1">
                          <span className="text-xs font-medium">{sz.sizeLabel}</span>
                          <button
                            type="button"
                            onClick={() => updateCartItemSize(item.modelId, sz.sizeLabel, sz.quantity - 1)}
                            className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs">{sz.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartItemSize(item.modelId, sz.sizeLabel, sz.quantity + 1)}
                            className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {itemQty} {t("cart.units")} = {formatCurrency(itemQty * finalPrice)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary sidebar */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-2xl bg-neutral-50/80 p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("product.totalUnits")}</span>
                <span>{totalItems} {t("cart.units")}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between text-sm font-medium">
                <span>{t("cart.total")}</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {(() => {
              const incomplete = items.some((item) => !item.color || item.sizes.some((s) => !s.sizeLabel || s.sizeLabel === "ONE"));
              return (
                <button
                  onClick={() => !incomplete && setCheckoutOpen(true)}
                  disabled={incomplete}
                  className={`mt-6 w-full rounded-xl py-3 text-xs font-medium uppercase tracking-[0.15em] transition ${
                    incomplete
                      ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                  title={incomplete ? "Оберіть колір та розмір для всіх товарів" : undefined}
                >
                  {incomplete ? "Оберіть колір та розмір" : t("cart.submitOrder")}
                </button>
              );
            })()}

            {(() => {
              const supportId = (CONTACTS as unknown as Record<string, string>).telegram_support_id;
              const encoded = encodeURIComponent(orderMessage);
              const links = [
                (supportId || CONTACTS.telegram) && { Icon: TelegramIcon, href: supportId ? `https://t.me/${supportId}?text=${encoded}` : `${CONTACTS.telegram}?text=${encoded}`, label: "Telegram" },
                CONTACTS.viber && { Icon: ViberIcon, href: `${CONTACTS.viber}&text=${encoded}`, label: "Viber" },
                CONTACTS.whatsapp && { Icon: WhatsAppIcon, href: `${CONTACTS.whatsapp}?text=${encoded}`, label: "WhatsApp" },
              ].filter(Boolean) as { Icon: React.ComponentType<{ className?: string }>; href: string; label: string }[];
              if (links.length === 0) return null;
              return (
                <div className="mt-4">
                  <p className="mb-3 text-center text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {t("cart.orderVia")}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {links.map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                        aria-label={label}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 text-center">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-neutral-700"
              >
                <ArrowLeft className="h-3 w-3" />
                {t("cart.continueShopping")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CheckoutForm
        open={checkoutOpen || orderSuccess}
        onClose={() => { setCheckoutOpen(false); setOrderSuccess(false); }}
        onSuccess={() => setOrderSuccess(true)}
      />
    </div>
  );
}
