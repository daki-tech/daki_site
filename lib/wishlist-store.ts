"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";

interface WishlistState {
  ids: string[];
}

const STORAGE_KEY = "daki-wishlist";

let state: WishlistState = { ids: [] };
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

function getSnapshot(): WishlistState {
  return state;
}

const emptyState: WishlistState = { ids: [] };

function getServerSnapshot(): WishlistState {
  return emptyState;
}

export function toggleWishlist(modelId: string) {
  const has = state.ids.includes(modelId);
  state = {
    ids: has ? state.ids.filter((id) => id !== modelId) : [...state.ids, modelId],
  };
  persist();
  emit();
}

export function isInWishlist(ids: string[], modelId: string): boolean {
  return ids.includes(modelId);
}

export function useWishlist() {
  const wishlist = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
      emit();
    }
  }, []);

  return {
    ids: wishlist.ids,
    count: wishlist.ids.length,
    toggle: useCallback(toggleWishlist, []),
    has: useCallback((modelId: string) => isInWishlist(wishlist.ids, modelId), [wishlist.ids]),
  };
}
