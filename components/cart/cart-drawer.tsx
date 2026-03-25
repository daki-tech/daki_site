"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useCart, useCartDrawer } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export function CartDrawer() {
  const { t } = useLanguage();
  const { items, totalItems, totalAmount, removeFromCart, updateCartItemSize, clearCart } = useCart();
  const { open, closeCartDrawer } = useCartDrawer();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Animate: mounted controls DOM presence, visible controls CSS transition
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
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

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] transition-all duration-300"
        style={{
          backgroundColor: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
          backdropFilter: visible ? "blur(2px)" : "blur(0px)",
        }}
        onClick={closeCartDrawer}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-semibold tracking-wide">
            {t("cart.title").toUpperCase()} ({totalItems})
          </h2>
          <button
            onClick={closeCartDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-neutral-200" />
            <p className="mt-3 text-sm text-neutral-400">{t("cart.empty")}</p>
            <button
              onClick={closeCartDrawer}
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

                  return (
                    <div key={item.modelId} className="flex gap-3 py-4">
                      {/* Image */}
                      <Link
                        href={`/catalog/${item.modelId}`}
                        onClick={closeCartDrawer}
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
                onClick={() => {
                  closeCartDrawer();
                  setCheckoutOpen(true);
                }}
                className="w-full rounded-xl bg-black py-3.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                {t("cart.submitOrder").toUpperCase()}
              </button>

              <button
                onClick={closeCartDrawer}
                className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                {t("cart.continueShopping").toUpperCase()}
              </button>
            </div>
          </>
        )}
      </div>

      <CheckoutForm
        open={checkoutOpen || orderSuccess}
        onClose={() => { setCheckoutOpen(false); setOrderSuccess(false); }}
        onSuccess={() => setOrderSuccess(true)}
      />
    </>
  );
}
