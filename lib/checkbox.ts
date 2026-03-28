import crypto from "crypto";

/**
 * Checkbox.ua Payment Integration
 *
 * API docs: https://wiki.checkbox.ua/uk/api
 * Swagger:  https://api.checkbox.in.ua/api/docs
 *
 * Env vars required:
 *   CHECKBOX_API_URL        — https://api.checkbox.in.ua/api/v1 (prod) or https://dev-api.checkbox.in.ua/api/v1 (dev)
 *   CHECKBOX_LICENSE_KEY    — cash register license key
 *   CHECKBOX_CASHIER_LOGIN  — cashier login
 *   CHECKBOX_CASHIER_PASSWORD — cashier password
 *   CHECKBOX_WEBHOOK_SECRET — webhook secret (set after calling POST /webhook)
 */

const API_URL = process.env.CHECKBOX_API_URL || "https://api.checkbox.in.ua/api/v1";
const LICENSE_KEY = process.env.CHECKBOX_LICENSE_KEY || "";
const CASHIER_LOGIN = process.env.CHECKBOX_CASHIER_LOGIN || "";
const CASHIER_PASSWORD = process.env.CHECKBOX_CASHIER_PASSWORD || "";
const WEBHOOK_SECRET = process.env.CHECKBOX_WEBHOOK_SECRET || "";

export function isCheckboxConfigured(): boolean {
  return !!(LICENSE_KEY && CASHIER_LOGIN && CASHIER_PASSWORD);
}

/** Sign in as cashier and return JWT token */
async function getCashierToken(): Promise<string> {
  const res = await fetch(`${API_URL}/cashier/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-License-Key": LICENSE_KEY,
    },
    body: JSON.stringify({
      login: CASHIER_LOGIN,
      password: CASHIER_PASSWORD,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkbox auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/** Common headers for authenticated requests */
function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-License-Key": LICENSE_KEY,
    "X-Client-Name": "DaKi Shop",
    "X-Client-Version": "1.0",
  };
}

export interface CheckboxInvoiceParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in UAH (e.g. 200.00)
  customerEmail?: string;
  customerPhone?: string;
  description: string;
  isPrepayment?: boolean;
}

/**
 * Create an invoice via Checkbox API.
 * Returns the payment page URL where the customer should be redirected.
 */
export async function createInvoice(params: CheckboxInvoiceParams): Promise<{
  invoiceId: string;
  pageUrl: string;
}> {
  const token = await getCashierToken();

  // Checkbox uses kopiykas (1 UAH = 100 kopiykas) represented as integers
  // Amount is in kopiykas * 100 for some endpoints, but for invoices it's kopiykas
  const amountInKopiykas = Math.round(params.amount * 100);

  const delivery: Record<string, string[]> = {};
  if (params.customerEmail) delivery.emails = [params.customerEmail];

  const body = {
    goods: [
      {
        good: {
          code: params.orderId.slice(0, 20),
          name: params.description,
          price: amountInKopiykas,
        },
        quantity: 1000, // 1 item = 1000 in Checkbox units
      },
    ],
    delivery: Object.keys(delivery).length > 0 ? delivery : undefined,
    payments: [
      {
        type: "CASHLESS",
        value: amountInKopiykas,
      },
    ],
    rounding: false,
    header: params.isPrepayment ? "Передплата за замовлення" : undefined,
    footer: `Замовлення #${params.orderNumber}`,
    validity: 86400, // 24 hours
  };

  const res = await fetch(`${API_URL}/invoices/fiscalize`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkbox invoice creation failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    invoiceId: data.id,
    pageUrl: data.page_url,
  };
}

/**
 * Verify Checkbox webhook signature.
 * Signature = base64(HMAC-SHA256(secret_key, utf8_bytes(body)))
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
