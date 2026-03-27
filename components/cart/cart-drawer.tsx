"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCart, useCartDrawer, updateCartItemColor, replaceCartItemSizes } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { createClient } from "@/lib/supabase/client";

interface ModelMeta {
  colors: { id: string; name: string; hex: string; image_urls: string[] }[];
  sizes: { size_label: string; available: number }[];
}

type DrawerView = "cart" | "checkout";

interface OrderSuccess {
  orderNumber: number;
  orderId: string;
  contactMe: boolean;
}

export function CartDrawer() {
  const { t } = useLanguage();
  const { items, totalItems, totalAmount, removeFromCart, updateCartItemSize, clearCart } = useCart();
  const { open, closeCartDrawer } = useCartDrawer();
  const [view, setView] = useState<DrawerView>("cart");
  const [successData, setSuccessData] = useState<OrderSuccess | null>(null);

  // Animation states
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Double-rAF ensures the browser has painted the initial (off-screen) state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
        setView("cart"); // reset view when fully closed
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCartDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeCartDrawer]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const hasIncompleteItems = useMemo(
    () => items.some((item) => !item.color || item.sizes.length === 0),
    [items],
  );

  // Fetch color/size metadata for items without color
  const [modelMeta, setModelMeta] = useState<Record<string, ModelMeta>>({});

  useEffect(() => {
    const needsMeta = items.filter((item) => !item.color && !modelMeta[item.modelId]);
    if (needsMeta.length === 0) return;

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
      setModelMeta((prev) => ({ ...prev, ...meta }));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (!mounted) return null;

  const handleClose = () => {
    closeCartDrawer();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backgroundColor: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
          transition: "background-color 350ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[570px] flex-col bg-white shadow-2xl"
        style={{
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {view === "checkout" && (
              <button
                onClick={() => setView("cart")}
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold tracking-wide">
              {view === "cart"
                ? `${t("cart.title").toUpperCase()} (${totalItems})`
                : "ОФОРМЛЕННЯ"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart view */}
        {view === "cart" && (
          <>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingBag className="h-10 w-10 text-neutral-200" />
                <p className="mt-3 text-sm text-neutral-400">{t("cart.empty")}</p>
                <button
                  onClick={handleClose}
                  className="mt-4 text-xs font-medium text-neutral-500 underline underline-offset-4 hover:text-neutral-800"
                >
                  {t("cart.continueShopping")}
                </button>
              </div>
            ) : (
              <>
                {/* Clear all */}
                <div className="flex justify-end px-5 py-2">
                  <button
                    onClick={clearCart}
                    className="flex items-center gap-1 text-[11px] text-red-400 transition hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("cart.clearCart")}
                  </button>
                </div>

                {/* Scrollable items */}
                <div className="flex-1 overflow-y-auto px-5">
                  <div className="divide-y divide-neutral-100">
                    {items.map((item) => {
                      const finalPrice = item.basePrice * (1 - item.discountPercent / 100);
                      const itemQty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
                      const itemIncomplete = !item.color || item.sizes.length === 0;
                      const meta = modelMeta[item.modelId];

                      return (
                        <div key={item.modelId} className={`py-4 ${itemIncomplete ? "rounded-lg border border-red-200 bg-red-50/50 px-3 -mx-1" : ""}`}>
                          <div className="flex gap-3">
                            {/* Image */}
                            <Link
                              href={`/catalog/${item.modelId}`}
                              onClick={handleClose}
                              className="relative h-24 w-[68px] shrink-0 overflow-hidden bg-neutral-50"
                            >
                              {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.modelName} fill unoptimized className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[9px] text-neutral-300">
                                  Фото
                                </div>
                              )}
                            </Link>

                            {/* Info */}
                            <div className="flex flex-1 flex-col justify-between min-w-0">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-neutral-400">Артикул: {item.sku}</p>
                                    <p className="truncate text-sm font-medium">{item.modelName}</p>
                                    {item.color && (
                                      <p className="text-[11px] text-neutral-400">Колір: {item.color}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeFromCart(item.modelId)}
                                    className="shrink-0 p-0.5 text-neutral-300 transition hover:text-neutral-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Sizes with quantity controls */}
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.sizes.map((sz) => (
                                  <div
                                    key={sz.sizeLabel}
                                    className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5"
                                  >
                                    <span className="text-[11px] font-medium text-neutral-600">
                                      {sz.sizeLabel}
                                    </span>
                                    <button
                                      onClick={() => updateCartItemSize(item.modelId, sz.sizeLabel, sz.quantity - 1)}
                                      className="flex h-4 w-4 items-center justify-center text-neutral-400 hover:text-neutral-700"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-4 text-center text-[11px] font-semibold">
                                      {sz.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateCartItemSize(item.modelId, sz.sizeLabel, sz.quantity + 1)}
                                      className="flex h-4 w-4 items-center justify-center text-neutral-400 hover:text-neutral-700"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Price */}
                              <div className="mt-1 flex items-baseline gap-2">
                                {item.discountPercent > 0 && (
                                  <span className="text-[11px] text-neutral-300 line-through">
                                    {formatCurrency(item.basePrice)}
                                  </span>
                                )}
                                <span className="text-sm font-semibold">
                                  {formatCurrency(finalPrice * itemQty)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inline color/size selector for incomplete items */}
                          {itemIncomplete && meta && (
                            <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-[11px] font-medium text-neutral-600">Оберіть колір та розмір</span>
                              </div>

                              {/* Color selector */}
                              {meta.colors.length > 0 && (
                                <div className="mb-2.5">
                                  <p className="text-[10px] font-medium text-neutral-400 mb-1.5">Колір</p>
                                  <div className="flex flex-wrap gap-1.5">
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
                                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                                            isActive
                                              ? "border-neutral-900 bg-neutral-900 text-white"
                                              : "border-neutral-200 bg-white hover:border-neutral-400"
                                          }`}
                                        >
                                          <span className="h-3 w-3 rounded-full border border-neutral-200" style={{ backgroundColor: color.hex }} />
                                          <span className={`text-[11px] font-medium ${isActive ? "text-white" : "text-neutral-700"}`}>{color.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Size selector */}
                              {meta.sizes.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-neutral-400 mb-1.5">Розмір</p>
                                  <div className="flex flex-wrap gap-1.5">
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
                                          className={`flex h-8 min-w-[36px] items-center justify-center rounded-lg border px-2 text-[11px] font-medium transition ${
                                            isSelected
                                              ? "border-neutral-900 bg-neutral-900 text-white"
                                              : isAvailable
                                                ? "border-neutral-200 bg-white hover:border-neutral-400"
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="border-t border-neutral-100 px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">{t("cart.subtotal")}</span>
                    <span className="text-xs">{totalItems} {t("cart.units")}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t("cart.total")}</span>
                    <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
                  </div>

                  <button
                    onClick={() => !hasIncompleteItems && setView("checkout")}
                    disabled={hasIncompleteItems}
                    className={`w-full rounded-xl py-3.5 text-sm font-medium transition ${
                      hasIncompleteItems
                        ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                        : "bg-black text-white hover:bg-neutral-800 active:scale-[0.98]"
                    }`}
                  >
                    {hasIncompleteItems ? "Оберіть колір та розмір" : t("cart.submitOrder").toUpperCase()}
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
                  >
                    {t("cart.continueShopping").toUpperCase()}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Checkout view — form rendered inline inside the drawer */}
        {view === "checkout" && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {hasIncompleteItems && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm font-medium text-red-600">
                  Оберіть колір та розмір для кожного товару в кошику
                </p>
              </div>
            )}
            <CheckoutForm
              open={true}
              inline
              onBack={() => setView("cart")}
              onClose={handleClose}
              onSuccess={(data) => {
                setSuccessData(data ?? null);
                closeCartDrawer();
              }}
            />
          </div>
        )}
      </div>

      {/* Success popup — centered overlay after drawer closes */}
      {successData && <SuccessPopup data={successData} onClose={() => setSuccessData(null)} />}
    </>
  );
}

function SuccessPopup({ data, onClose }: { data: OrderSuccess; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay appearance so drawer has time to slide out
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backgroundColor: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
          transition: "background-color 300ms ease",
        }}
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto relative mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
            transition: "opacity 300ms ease, transform 300ms ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-700 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold">Замовлення оформлено!</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Номер замовлення: <span className="font-bold text-neutral-900">#{data.orderNumber}</span>
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              {data.contactMe
                ? "Менеджер зв\u2019яжеться з вами найближчим часом для уточнення замовлення."
                : "Ми зв\u2019яжемося з вами найближчим часом для підтвердження."}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Підтвердження надіслано на вашу пошту.
            </p>
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
