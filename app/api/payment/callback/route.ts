import { NextResponse } from "next/server";
import { verifySignature, decodeData } from "@/lib/liqpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data = formData.get("data") as string;
    const signature = formData.get("signature") as string;

    if (!data || !signature) {
      return NextResponse.json({ error: "Missing data or signature" }, { status: 400 });
    }

    if (!verifySignature(data, signature)) {
      console.error("[LiqPay Callback] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payload = decodeData(data) as {
      order_id: string;
      status: string;
      amount: number;
      currency: string;
      payment_id: number;
      transaction_id: number;
      err_code?: string;
      err_description?: string;
    };

    console.log(`[LiqPay Callback] Order: ${payload.order_id}, Status: ${payload.status}, Amount: ${payload.amount} ${payload.currency}`);

    const admin = createAdminClient();

    // LiqPay statuses: success, failure, error, reversed, sandbox, subscribed, unsubscribed
    if (payload.status === "success" || payload.status === "sandbox") {
      // Payment successful — confirm order
      await admin
        .from("orders")
        .update({
          status: "confirmed",
          payment_method: "liqpay",
          notes: `LiqPay payment #${payload.payment_id} confirmed`,
        })
        .eq("id", payload.order_id)
        .eq("status", "draft"); // Only update if still draft

      console.log(`[LiqPay] Order ${payload.order_id} confirmed`);
    } else if (payload.status === "failure" || payload.status === "error") {
      console.log(`[LiqPay] Payment failed for order ${payload.order_id}: ${payload.err_description || payload.status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LiqPay Callback] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
