import { NextResponse } from "next/server";
import { createPaymentData, isLiqPayConfigured } from "@/lib/liqpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    if (!isLiqPayConfigured()) {
      return NextResponse.json(
        { error: "Онлайн-оплата тимчасово недоступна" },
        { status: 503 }
      );
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select("id, order_number, total_amount, currency, status, customer_name")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });
    }

    if (order.status !== "draft") {
      return NextResponse.json({ error: "Замовлення вже оброблено" }, { status: 400 });
    }

    const { data, signature } = createPaymentData({
      action: "pay",
      amount: Number(order.total_amount),
      currency: (order.currency || "UAH") as "UAH",
      description: `DaKi замовлення #${order.order_number}`,
      order_id: order.id,
    });

    return NextResponse.json({ data, signature });
  } catch (err) {
    console.error("[Payment Create] Error:", err);
    return NextResponse.json({ error: "Помилка створення платежу" }, { status: 500 });
  }
}
