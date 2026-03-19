import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

// POST /api/admin/wholesale-orders — create a wholesale order from admin panel
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, buyerName, modelId, modelSku, modelName, colors, totalAmount } = body as {
      date: string;
      buyerName: string;
      modelId: string;
      modelSku: string;
      modelName: string;
      colors: {
        colorName: string;
        rostovokCount: number;
        pricePerUnit: number;
        sizesCount: number;
        colorTotal: number;
      }[];
      totalAmount: number;
    };

    if (!buyerName || !modelId || !colors || colors.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create order in Supabase
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        status: "confirmed",
        total_amount: totalAmount,
        currency: "UAH",
        customer_name: buyerName,
        order_type: "wholesale",
        source: "Опт (админ)",
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Wholesale order insert error:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 2. Get model sizes to know which sizes exist
    const { data: modelSizes } = await admin
      .from("model_sizes")
      .select("id, size_label, total_stock")
      .eq("model_id", modelId)
      .order("size_label");

    const sizeLabels = (modelSizes ?? []).map(s => s.size_label);

    // 3. For each color, create order items and decrement stock
    for (const colorEntry of colors) {
      // Create one order_item per size in the ростовка
      for (const sizeLabel of sizeLabels) {
        await admin.from("order_items").insert({
          order_id: order.id,
          model_id: modelId,
          size_label: sizeLabel,
          quantity: colorEntry.rostovokCount,
          unit_price: colorEntry.pricePerUnit,
          discount_percent: 0,
          color: colorEntry.colorName || null,
        });
      }

      // Decrement stock for this color: all sizes × rostovokCount
      const { data: colorRows } = await admin
        .from("model_colors")
        .select("id, stock_per_size")
        .eq("model_id", modelId)
        .eq("name", colorEntry.colorName);

      if (colorRows && colorRows.length > 0) {
        const colorRow = colorRows[0];
        const stockPerSize = (colorRow.stock_per_size as Record<string, number>) || {};
        for (const sizeLabel of sizeLabels) {
          const current = stockPerSize[sizeLabel] || 0;
          stockPerSize[sizeLabel] = Math.max(0, current - colorEntry.rostovokCount);
        }
        await admin.from("model_colors").update({ stock_per_size: stockPerSize }).eq("id", colorRow.id);
      }

      // Decrement model_sizes.total_stock
      for (const sizeLabel of sizeLabels) {
        const sizeRow = (modelSizes ?? []).find(s => s.size_label === sizeLabel);
        if (sizeRow) {
          await admin.from("model_sizes").update({
            total_stock: Math.max(0, sizeRow.total_stock - colorEntry.rostovokCount),
          }).eq("id", sizeRow.id);
          // Update local copy for next iteration
          sizeRow.total_stock = Math.max(0, sizeRow.total_stock - colorEntry.rostovokCount);
        }
      }
    }

    // 4. Append to wholesale Google Sheet
    const wholesaleWebhookUrl = process.env.GOOGLE_WHOLESALE_WEBHOOK_URL;
    if (wholesaleWebhookUrl) {
      const rows = colors.map((c, i) => ({
        orderNumber: order.order_number || order.id.slice(0, 8),
        date: date || new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" }),
        buyer: buyerName,
        model: modelSku,
        modelName: modelName || "",
        color: c.colorName,
        rostovokCount: c.rostovokCount,
        sizesCount: c.sizesCount,
        pricePerUnit: c.pricePerUnit,
        colorTotal: c.colorTotal,
        totalAmount: i === 0 ? totalAmount : "", // Only show total on first row of group
      }));

      try {
        await fetch(wholesaleWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "appendWholesaleOrder", rows }),
        });
      } catch (err) {
        console.error("[Google Sheets] Wholesale order append failed:", err);
      }
    }

    // 5. Sync stock
    try {
      await syncStockToGoogleSheets();
    } catch (err) {
      console.error("[Stock Sync] Failed after wholesale order:", err);
    }

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.order_number });
  } catch (err) {
    console.error("Wholesale order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
