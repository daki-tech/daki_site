import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

// POST /api/admin/cancel-order — cancel order and return stock
export async function POST(req: Request) {
  try {
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Get order and its items
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, order_type")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Order already cancelled" }, { status: 400 });
    }

    const { data: items } = await admin
      .from("order_items")
      .select("id, model_id, size_label, quantity, color")
      .eq("order_id", orderId);

    // 2. Return stock for each item
    if (items && items.length > 0) {
      // Group items by model_id + color + size_label to batch updates
      for (const item of items) {
        // Return to model_sizes.total_stock
        const { data: sizeRows } = await admin
          .from("model_sizes")
          .select("id, total_stock")
          .eq("model_id", item.model_id)
          .eq("size_label", item.size_label);

        if (sizeRows && sizeRows.length > 0) {
          const sizeRow = sizeRows[0];
          await admin.from("model_sizes").update({
            total_stock: sizeRow.total_stock + item.quantity,
          }).eq("id", sizeRow.id);
        }

        // Return to model_colors.stock_per_size (if color is known)
        if (item.color) {
          const { data: colorRows } = await admin
            .from("model_colors")
            .select("id, stock_per_size")
            .eq("model_id", item.model_id)
            .eq("name", item.color);

          if (colorRows && colorRows.length > 0) {
            const colorRow = colorRows[0];
            const stockPerSize = (colorRow.stock_per_size as Record<string, number>) || {};
            stockPerSize[item.size_label] = (stockPerSize[item.size_label] || 0) + item.quantity;
            await admin.from("model_colors").update({ stock_per_size: stockPerSize }).eq("id", colorRow.id);
          }
        }
      }
    }

    // 3. Mark order as cancelled
    await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId);

    // 4. Sync stock to Google Sheets
    try {
      await syncStockToGoogleSheets();
    } catch (err) {
      console.error("[Stock Sync] Failed after order cancel:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel order error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
