import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

// POST /api/admin/cancel-order — cancel order and return stock (batched)
export async function POST(req: Request) {
  try {
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Get order
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, order_type, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Order already cancelled" }, { status: 400 });
    }

    // 2. Get order items
    const { data: items } = await admin
      .from("order_items")
      .select("id, model_id, size_label, quantity, color")
      .eq("order_id", orderId);

    // 3. Return stock using batched reads + parallel writes
    if (items && items.length > 0) {
      await returnStockBatched(admin, items);
    }

    // 4. Mark order as cancelled
    await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId);

    // 5. Delete from Google Sheets
    const orderNumber = order.order_number || orderId.slice(0, 8);
    deleteOrderFromGoogleSheets(order.order_type, orderNumber);

    // 6. Sync stock to Google Sheets
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

/**
 * Return stock for order items using batched reads and parallel writes.
 * Instead of 4 sequential queries per item, we:
 * 1. Read all needed model_sizes in one query per model
 * 2. Read all needed model_colors in one query per model
 * 3. Compute updates in memory
 * 4. Write back with parallel updates
 */
async function returnStockBatched(
  admin: ReturnType<typeof createAdminClient>,
  items: Array<{ model_id: string; size_label: string; quantity: number; color: string | null }>
) {
  // Group items by model_id
  const byModel = new Map<string, typeof items>();
  for (const item of items) {
    const arr = byModel.get(item.model_id) || [];
    arr.push(item);
    byModel.set(item.model_id, arr);
  }

  // Process each model (usually just 1 model per order)
  for (const [modelId, modelItems] of byModel) {
    // Batch read: get all sizes and colors for this model in 2 queries
    const [{ data: sizeRows }, { data: colorRows }] = await Promise.all([
      admin.from("model_sizes").select("id, size_label, total_stock").eq("model_id", modelId),
      admin.from("model_colors").select("id, name, stock_per_size").eq("model_id", modelId),
    ]);

    // Build lookup maps
    const sizeMap = new Map<string, { id: string; total_stock: number }>();
    for (const row of sizeRows ?? []) {
      sizeMap.set(row.size_label, { id: row.id, total_stock: row.total_stock });
    }

    const colorMap = new Map<string, { id: string; stock_per_size: Record<string, number> }>();
    for (const row of colorRows ?? []) {
      colorMap.set(row.name, { id: row.id, stock_per_size: (row.stock_per_size as Record<string, number>) || {} });
    }

    // Accumulate stock changes in memory
    for (const item of modelItems) {
      // Update size total
      const sizeEntry = sizeMap.get(item.size_label);
      if (sizeEntry) {
        sizeEntry.total_stock += item.quantity;
      }

      // Update color stock
      if (item.color) {
        const colorEntry = colorMap.get(item.color);
        if (colorEntry) {
          colorEntry.stock_per_size[item.size_label] = (colorEntry.stock_per_size[item.size_label] || 0) + item.quantity;
        }
      }
    }

    // Parallel writes: update all sizes and colors at once
    await Promise.all([
      ...Array.from(sizeMap.values()).map((sizeEntry) =>
        admin.from("model_sizes").update({ total_stock: sizeEntry.total_stock }).eq("id", sizeEntry.id).then()
      ),
      ...Array.from(colorMap.values()).map((colorEntry) =>
        admin.from("model_colors").update({ stock_per_size: colorEntry.stock_per_size }).eq("id", colorEntry.id).then()
      ),
    ]);
  }
}

/**
 * Delete order rows from Google Sheets (fire-and-forget)
 */
function deleteOrderFromGoogleSheets(orderType: string | null, orderNumber: string) {
  const isWholesale = orderType === "wholesale";
  const webhookUrl = isWholesale
    ? process.env.GOOGLE_WHOLESALE_WEBHOOK_URL
    : process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) return;

  const action = isWholesale ? "deleteWholesaleOrder" : "deleteOrder";

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, orderNumber }),
  }).catch((err) => {
    console.error(`[Google Sheets] Failed to delete order ${orderNumber}:`, err);
  });
}
