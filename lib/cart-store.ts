"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";

export interface CartSizeEntry {
  sizeLabel: string;
  quantity: number;
}

export interface CartItem {
  modelId: string;
  modelName: string;
  sku: string;
  imageUrl: string;
  basePrice: number;
  discountPercent: number;
  color?: string;
  sizes: CartSizeEntry[];
}

interface CartState {
  items: CartItem[];
}

const STORAGE_KEY = "daki-cart";

let state: CartState = { items: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
    }
  } catch {}
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartState {
  return state;
}

const emptyState: CartState = { items: [] };

function getServerSnapshot(): CartState {
  return emptyState;
}

export function addToCart(item: CartItem) {
  const existing = state.items.find((i) => i.modelId === item.modelId);
  if (existing) {
    for (const newSize of item.sizes) {
      const es = existing.sizes.find((s) => s.sizeLabel === newSize.sizeLabel);
      if (es) {
        es.quantity += newSize.quantity;
      } else {
        existing.sizes.push({ ...newSize });
      }
    }
    existing.sizes = existing.sizes.filter((s) => s.quantity > 0);
  } else {
    state.items.push({ ...item });
  }
  state = { ...state, items: [...state.items] };
  persist();
  emit();
}

export function removeFromCart(modelId: string) {
  state = { ...state, items: state.items.filter((i) => i.modelId !== modelId) };
  persist();
  emit();
}

export function updateCartItemSize(modelId: string, sizeLabel: string, quantity: number) {
  const item = state.items.find((i) => i.modelId === modelId);
  if (!item) return;
  const size = item.sizes.find((s) => s.sizeLabel === sizeLabel);
  if (size) {
    size.quantity = Math.max(0, quantity);
  }
  item.sizes = item.sizes.filter((s) => s.quantity > 0);
  if (item.sizes.length === 0) {
    state = { ...state, items: state.items.filter((i) => i.modelId !== modelId) };
  } else {
    state = { ...state, items: [...state.items] };
  }
  persist();
  emit();
}

export function updateCartItemColor(modelId: string, color: string, imageUrl?: string) {
  const item = state.items.find((i) => i.modelId === modelId);
  if (!item) return;
  item.color = color;
  if (imageUrl) item.imageUrl = imageUrl;
  state = { ...state, items: [...state.items] };
  persist();
  emit();
}

export function replaceCartItemSizes(modelId: string, sizes: CartSizeEntry[]) {
  const item = state.items.find((i) => i.modelId === modelId);
  if (!item) return;
  item.sizes = sizes.filter((s) => s.quantity > 0);
  if (item.sizes.length === 0) {
    state = { ...state, items: state.items.filter((i) => i.modelId !== modelId) };
  } else {
    state = { ...state, items: [...state.items] };
  }
  persist();
  emit();
}

export function clearCart() {
  state = { items: [] };
  persist();
  emit();
}

export function getCartTotalItems(cart: CartState): number {
  return cart.items.reduce((sum, item) => sum + item.sizes.reduce((s, sz) => s + sz.quantity, 0), 0);
}

export function getCartTotalAmount(cart: CartState): number {
  return cart.items.reduce((sum, item) => {
    const price = item.basePrice * (1 - item.discountPercent / 100);
    const qty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
    return sum + price * qty;
  }, 0);
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
      emit();
    }
  }, []);

  return {
    items: cart.items,
    totalItems: getCartTotalItems(cart),
    totalAmount: getCartTotalAmount(cart),
    addToCart: useCallback(addToCart, []),
    removeFromCart: useCallback(removeFromCart, []),
    updateCartItemSize: useCallback(updateCartItemSize, []),
    updateCartItemColor: useCallback(updateCartItemColor, []),
    replaceCartItemSizes: useCallback(replaceCartItemSizes, []),
    clearCart: useCallback(clearCart, []),
  };
}
