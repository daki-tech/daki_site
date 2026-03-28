import { NextResponse } from "next/server";
import { after } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

const STATUS_LABELS: Record<string, string> = {
  draft: "🆕 Новий",
  confirmed: "✅ Підтверджено",
  shipped: "📦 Відправлено",
  completed: "🏠 Доставлено",
  cancelled: "❌ Скасовано",
};

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  // Use admin client to bypass RLS — admin needs to see ALL orders
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*, catalog_models(name, sku, image_urls))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json()) as { orderId: string; status: string };
  if (!body.orderId || !body.status) {
    return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: body.status })
    .eq("id", body.orderId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync Telegram inline buttons after status change
  after(async () => {
    await syncTelegramOrderButtons(body.orderId, body.status);
  });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json()) as { orderId: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Check order status — return stock if not already cancelled
  const { data: order } = await admin
    .from("orders")
    .select("id, status, order_number")
    .eq("id", body.orderId)
    .single();

  if (order && order.status !== "cancelled") {
    // 2. Get order items before deletion
    const { data: items } = await admin
      .from("order_items")
      .select("id, model_id, size_label, quantity, color")
      .eq("order_id", body.orderId);

    // 3. Return stock using batched reads + parallel writes
    if (items && items.length > 0) {
      await returnStockBatched(admin, items);
    }
  }

  // 4. Delete order items and order
  await admin.from("order_items").delete().eq("order_id", body.orderId);
  const { error } = await admin.from("orders").delete().eq("id", body.orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 5. Delete from Google Sheets + sync stock in background
  if (order) {
    const orderNumber = order.order_number || body.orderId.slice(0, 8);
    deleteOrderFromGoogleSheets(orderNumber);
  }

  if (order && order.status !== "cancelled") {
    after(async () => {
      try { await syncStockToGoogleSheets(); } catch (err) {
        console.error("[Stock Sync] Failed after order delete:", err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Update Telegram inline keyboard buttons when order status changes from admin panel
 */
async function syncTelegramOrderButtons(orderId: string, newStatus: string) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!botToken) return;

  try {
    const admin = createAdminClient();
    const { data: messages } = await admin
      .from("telegram_order_messages")
      .select("chat_id, message_id")
      .eq("order_id", orderId);

    if (!messages || messages.length === 0) return;

    const isConfirmed = ["confirmed", "shipped", "completed"].includes(newStatus);
    const isShipped = ["shipped", "completed"].includes(newStatus);
    const isDelivered = newStatus === "completed";

    const updatedKeyboard = {
      inline_keyboard: [
        [
          {
            text: `${isConfirmed ? "✅" : "⬜"} Підтверджено`,
            callback_data: `order_status:${orderId}:confirmed`,
          },
          {
            text: `${isShipped ? "📦" : "⬜"} Відправлено`,
            callback_data: `order_status:${orderId}:shipped`,
          },
          {
            text: `${isDelivered ? "🏠" : "⬜"} Доставлено`,
            callback_data: `order_status:${orderId}:completed`,
          },
        ],
      ],
    };

    await Promise.allSettled(
      messages.map(async (msg: { chat_id: number; message_id: number }) => {
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msg.chat_id,
            message_id: msg.message_id,
            reply_markup: updatedKeyboard,
          }),
        });
      })
    );

    console.log(`[Telegram] Synced ${messages.length} message(s) for order ${orderId} → ${STATUS_LABELS[newStatus] || newStatus}`);
  } catch (err) {
    console.error("[Telegram] Sync buttons error:", err);
  }
}

/**
 * Return stock for order items using batched reads and parallel writes.
 */
async function returnStockBatched(
  admin: ReturnType<typeof createAdminClient>,
  items: Array<{ model_id: string; size_label: string; quantity: number; color: string | null }>
) {
  const byModel = new Map<string, typeof items>();
  for (const item of items) {
    const arr = byModel.get(item.model_id) || [];
    arr.push(item);
    byModel.set(item.model_id, arr);
  }

  for (const [modelId, modelItems] of byModel) {
    const [{ data: sizeRows }, { data: colorRows }] = await Promise.all([
      admin.from("model_sizes").select("id, size_label, total_stock").eq("model_id", modelId),
      admin.from("model_colors").select("id, name, stock_per_size").eq("model_id", modelId),
    ]);

    const sizeMap = new Map<string, { id: string; total_stock: number }>();
    for (const row of sizeRows ?? []) {
      sizeMap.set(row.size_label, { id: row.id, total_stock: row.total_stock });
    }

    const colorMap = new Map<string, { id: string; stock_per_size: Record<string, number> }>();
    for (const row of colorRows ?? []) {
      colorMap.set(row.name, { id: row.id, stock_per_size: (row.stock_per_size as Record<string, number>) || {} });
    }

    for (const item of modelItems) {
      const sizeEntry = sizeMap.get(item.size_label);
      if (sizeEntry) sizeEntry.total_stock += item.quantity;

      if (item.color) {
        const colorEntry = colorMap.get(item.color);
        if (colorEntry) {
          colorEntry.stock_per_size[item.size_label] = (colorEntry.stock_per_size[item.size_label] || 0) + item.quantity;
        }
      }
    }

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
function deleteOrderFromGoogleSheets(orderNumber: string) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteOrder", orderNumber }),
  }).catch((err) => {
    console.error(`[Google Sheets] Failed to delete order ${orderNumber}:`, err);
  });
}
