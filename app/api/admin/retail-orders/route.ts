import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

// POST /api/admin/retail-orders — create a retail order from admin panel
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, buyerName, modelId, modelSku, color, sizeLabel, quantity, city, source, unitPrice } = body as {
      date: string;
      buyerName: string;
      modelId: string;
      modelSku: string;
      color: string;
      sizeLabel: string;
      quantity: number;
      city: string;
      source: string;
      unitPrice: number;
    };

    if (!buyerName || !modelId || !sizeLabel || !quantity || !source) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const totalAmount = unitPrice * quantity;
    const admin = createAdminClient();

    // 1. Create order in Supabase
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        status: "confirmed",
        total_amount: totalAmount,
        currency: "UAH",
        customer_name: buyerName,
        customer_phone: null,
        customer_email: null,
        delivery_city: city || null,
        order_type: "retail",
        source,
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Retail order insert error:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 2. Create order item
    await admin.from("order_items").insert({
      order_id: order.id,
      model_id: modelId,
      size_label: sizeLabel,
      quantity,
      unit_price: unitPrice,
      discount_percent: 0,
      color: color || null,
    });

    // 3. Decrement stock in model_colors.stock_per_size
    const { data: colorRows } = await admin
      .from("model_colors")
      .select("id, stock_per_size")
      .eq("model_id", modelId)
      .eq("name", color);

    if (colorRows && colorRows.length > 0) {
      const colorRow = colorRows[0];
      const stockPerSize = (colorRow.stock_per_size as Record<string, number>) || {};
      const currentStock = stockPerSize[sizeLabel] || 0;
      stockPerSize[sizeLabel] = Math.max(0, currentStock - quantity);
      await admin.from("model_colors").update({ stock_per_size: stockPerSize }).eq("id", colorRow.id);
    }

    // 4. Decrement model_sizes.total_stock
    const { data: sizeRows } = await admin
      .from("model_sizes")
      .select("id, total_stock")
      .eq("model_id", modelId)
      .eq("size_label", sizeLabel);

    if (sizeRows && sizeRows.length > 0) {
      const sizeRow = sizeRows[0];
      await admin.from("model_sizes").update({
        total_stock: Math.max(0, sizeRow.total_stock - quantity),
      }).eq("id", sizeRow.id);
    }

    // 5. Append to Google Sheets (orders)
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (webhookUrl) {
      const nameParts = buyerName.trim().split(/\s+/);
      const lastName = nameParts[0] || "";
      const firstName = nameParts.slice(1).join(" ") || "";

      const rows = [{
        orderId: order.order_number || order.id.slice(0, 8),
        date: date || new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" }),
        lastName,
        firstName,
        phone: "",
        email: "",
        model: modelSku,
        size: sizeLabel,
        color: color || "",
        quantity,
        amount: Math.round(totalAmount),
        oblast: "",
        city: city || "",
        branch: "",
        payment: "",
        contactMe: "",
        notes: "",
        source,
      }];

      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "appendOrder", rows }),
        });
      } catch (err) {
        console.error("[Google Sheets] Retail order append failed:", err);
      }
    }

    // 6. Sync stock to Google Sheets
    try {
      await syncStockToGoogleSheets();
    } catch (err) {
      console.error("[Stock Sync] Failed after retail order:", err);
    }

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.order_number });
  } catch (err) {
    console.error("Retail order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
