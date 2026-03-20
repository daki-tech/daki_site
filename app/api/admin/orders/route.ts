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
    .select("id, status")
    .eq("id", body.orderId)
    .single();

  if (order && order.status !== "cancelled") {
    // 2. Get order items before deletion
    const { data: items } = await admin
      .from("order_items")
      .select("id, model_id, size_label, quantity, color")
      .eq("order_id", body.orderId);

    // 3. Return stock for each item
    if (items && items.length > 0) {
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
  }

  // 4. Delete order items and order
  await admin.from("order_items").delete().eq("order_id", body.orderId);
  const { error } = await admin.from("orders").delete().eq("id", body.orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 5. Sync stock to Google Sheets in background
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
