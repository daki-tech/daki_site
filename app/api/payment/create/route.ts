import { NextResponse } from "next/server";
import { createInvoice, isCheckboxConfigured } from "@/lib/checkbox";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    if (!isCheckboxConfigured()) {
      return NextResponse.json(
        { error: "Онлайн-оплата тимчасово недоступна" },
        { status: 503 }
      );
    }

    const { orderId, prepayment } = (await req.json()) as {
      orderId: string;
      prepayment?: boolean;
    };

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select("id, order_number, total_amount, currency, status, customer_name, customer_email, customer_phone")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });
    }

    if (order.status !== "draft") {
      return NextResponse.json({ error: "Замовлення вже оброблено" }, { status: 400 });
    }

    const PREPAYMENT_AMOUNT = 200;
    const amount = prepayment ? PREPAYMENT_AMOUNT : Number(order.total_amount);
    const description = prepayment
      ? `DaKi передплата за замовлення #${order.order_number}`
      : `DaKi замовлення #${order.order_number}`;

    const { invoiceId, pageUrl } = await createInvoice({
      orderId: order.id,
      orderNumber: String(order.order_number),
      amount,
      customerEmail: order.customer_email || undefined,
      customerPhone: order.customer_phone || undefined,
      description,
      isPrepayment: prepayment,
    });

    // Store invoice ID on the order for webhook matching
    await admin
      .from("orders")
      .update({
        notes: prepayment
          ? `Checkbox prepayment invoice: ${invoiceId}`
          : `Checkbox invoice: ${invoiceId}`,
      })
      .eq("id", orderId);

    return NextResponse.json({ pageUrl, invoiceId });
  } catch (err) {
    console.error("[Payment Create] Error:", err);
    return NextResponse.json({ error: "Помилка створення платежу" }, { status: 500 });
  }
}
