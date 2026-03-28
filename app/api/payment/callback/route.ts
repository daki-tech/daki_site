import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/checkbox";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Checkbox.ua webhook callback
 *
 * Receives notifications when invoices are paid and receipts fiscalized.
 * Must return HTTP 200, otherwise Checkbox retries with exponential backoff.
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verify signature if secret is configured
    if (process.env.CHECKBOX_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(body, signature)) {
        console.error("[Checkbox Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const payload = JSON.parse(body);
    console.log("[Checkbox Webhook] Event:", JSON.stringify(payload).slice(0, 500));

    // Checkbox sends different event types — we care about receipt/invoice events
    // The payload structure varies; look for receipt with status DONE
    const receiptStatus = payload?.status;
    const invoiceId = payload?.id || payload?.invoice_id;

    if (!invoiceId) {
      // Not an invoice event — acknowledge and ignore
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();

    if (receiptStatus === "DONE" || receiptStatus === "CREATED") {
      // Find the order by matching the invoice ID stored in notes
      const { data: orders } = await admin
        .from("orders")
        .select("id, status, notes, payment_method")
        .or(`notes.ilike.%${invoiceId}%`)
        .eq("status", "draft");

      if (orders && orders.length > 0) {
        const order = orders[0];
        const isPrepayment = order.notes?.includes("prepayment");

        await admin
          .from("orders")
          .update({
            status: "confirmed",
            payment_method: isPrepayment ? "cod_prepaid" : "online",
            notes: isPrepayment
              ? `${order.notes} | Передплата 200 UAH сплачена`
              : `${order.notes} | Оплата підтверджена`,
          })
          .eq("id", order.id);

        console.log(`[Checkbox] Order ${order.id} confirmed (${isPrepayment ? "prepayment" : "full payment"})`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Checkbox Webhook] Error:", err);
    // Return 200 to prevent retries on parse errors
    return NextResponse.json({ ok: true });
  }
}
