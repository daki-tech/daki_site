import crypto from "crypto";

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || "";
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || "";

export interface LiqPayParams {
  action: "pay" | "hold";
  amount: number;
  currency: "UAH" | "USD" | "EUR";
  description: string;
  order_id: string;
  result_url?: string;
  server_url?: string;
  language?: "uk" | "ru" | "en";
}

/**
 * Generate LiqPay data + signature for checkout form
 */
export function createPaymentData(params: LiqPayParams) {
  const payload = {
    public_key: LIQPAY_PUBLIC_KEY,
    version: 3,
    action: params.action,
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    order_id: params.order_id,
    result_url: params.result_url || `${process.env.NEXT_PUBLIC_APP_URL || "https://dakifashion.com"}/payment/result`,
    server_url: params.server_url || `${process.env.NEXT_PUBLIC_APP_URL || "https://dakifashion.com"}/api/payment/callback`,
    language: params.language || "uk",
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = createSignature(data);

  return { data, signature };
}

/**
 * Verify LiqPay callback signature
 */
export function verifySignature(data: string, signature: string): boolean {
  return createSignature(data) === signature;
}

/**
 * Decode LiqPay callback data
 */
export function decodeData(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
}

function createSignature(data: string): string {
  const str = LIQPAY_PRIVATE_KEY + data + LIQPAY_PRIVATE_KEY;
  return crypto.createHash("sha1").update(str).digest("base64");
}

/**
 * Check if LiqPay is configured
 */
export function isLiqPayConfigured(): boolean {
  return !!(LIQPAY_PUBLIC_KEY && LIQPAY_PRIVATE_KEY);
}
