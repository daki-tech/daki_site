import { createCheckout, lemonSqueezySetup, type NewCheckout } from "@lemonsqueezy/lemonsqueezy.js";

let isLemonReady = false;

function ensureLemonSetup() {
  if (isLemonReady) return;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  }
  lemonSqueezySetup({ apiKey });
  isLemonReady = true;
}

export async function createLemonCheckout(variantId: number | string, checkout?: NewCheckout) {
  ensureLemonSetup();

  const storeId = Number(process.env.LEMONSQUEEZY_STORE_ID);
  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID is not configured");
  }

  return createCheckout(storeId, variantId, checkout);
}
