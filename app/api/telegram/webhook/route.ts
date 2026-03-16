import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_LABELS: Record<string, string> = {
  draft: "🆕 Новий",
  confirmed: "✅ Підтверджено",
  shipped: "📦 Відправлено",
  completed: "🏠 Доставлено",
  cancelled: "❌ Скасовано",
};

/**
 * Telegram Bot Webhook
 * Handles:
 * 1. /start — registers subscriber
 * 2. callback_query — inline button presses for order status management
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();

    // Handle inline button callback (order status changes)
    if (body.callback_query) {
      return handleCallbackQuery(body.callback_query, botToken);
    }

    // Handle regular messages (subscriber registration)
    const message = body.message;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const username = message.from?.username || null;
    const firstName = message.from?.first_name || null;

    const admin = createAdminClient();

    // Save subscriber
    await admin.from("telegram_subscribers").upsert(
      {
        chat_id: chatId,
        username,
        first_name: firstName,
        is_active: true,
      },
      { onConflict: "chat_id" }
    );

    // Send welcome/confirmation message
    if (botToken) {
      const text = message.text?.startsWith("/start")
        ? `Вітаю, ${firstName || "друже"}! Ви підписані на сповіщення про нові замовлення DaKi. Кожне нове замовлення буде приходити вам у цей чат.`
        : `Ви підписані на сповіщення про замовлення DaKi.`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function handleCallbackQuery(
  callbackQuery: {
    id: string;
    from: { id: number; first_name?: string };
    message?: { chat: { id: number }; message_id: number; text?: string };
    data?: string;
  },
  botToken: string
) {
  const data = callbackQuery.data || "";

  // Parse callback data: "order_status:{orderId}:{newStatus}"
  if (!data.startsWith("order_status:")) {
    await answerCallback(botToken, callbackQuery.id, "Невідома дія");
    return NextResponse.json({ ok: true });
  }

  const parts = data.split(":");
  const orderId = parts[1];
  const newStatus = parts[2];

  if (!orderId || !newStatus) {
    await answerCallback(botToken, callbackQuery.id, "Помилка даних");
    return NextResponse.json({ ok: true });
  }

  try {
    const admin = createAdminClient();

    // Get current order status
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, order_number, customer_name")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      await answerCallback(botToken, callbackQuery.id, "Замовлення не знайдено");
      return NextResponse.json({ ok: true });
    }

    // Toggle logic: if already at this status, go back
    const statusFlow = ["draft", "confirmed", "shipped", "completed"];
    const currentIdx = statusFlow.indexOf(order.status);
    const finalStatus = order.status === newStatus
      ? (currentIdx > 0 ? statusFlow[currentIdx - 1] : "draft")
      : newStatus;

    // Update order status in DB
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: finalStatus })
      .eq("id", orderId);

    if (updateErr) {
      await answerCallback(botToken, callbackQuery.id, "Помилка оновлення");
      return NextResponse.json({ ok: true });
    }

    // Build updated inline keyboard with status indicators
    const isConfirmed = ["confirmed", "shipped", "completed"].includes(finalStatus);
    const isShipped = ["shipped", "completed"].includes(finalStatus);
    const isDelivered = finalStatus === "completed";

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

    // Update the message inline keyboard for THIS chat
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;

    if (chatId && messageId && botToken) {
      // Update the message text to show current status
      const originalText = callbackQuery.message?.text || "";
      const statusLine = `\n\n📋 Статус: ${STATUS_LABELS[finalStatus] || finalStatus}`;
      // Remove old status line if present
      const cleanText = originalText.replace(/\n\n📋 Статус:.*$/, "");
      const newText = cleanText + statusLine;

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          reply_markup: updatedKeyboard,
        }),
      });

      // Also update all other subscribers' messages for this order
      try {
        const { data: otherMessages } = await admin
          .from("telegram_order_messages")
          .select("chat_id, message_id")
          .eq("order_id", orderId)
          .neq("chat_id", chatId);

        if (otherMessages && otherMessages.length > 0) {
          await Promise.allSettled(
            otherMessages.map(async (msg: { chat_id: number; message_id: number }) => {
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
        }
      } catch { /* table may not exist */ }
    }

    const orderLabel = order.order_number ? `#${order.order_number}` : orderId.slice(0, 8);
    await answerCallback(
      botToken,
      callbackQuery.id,
      `Замовлення ${orderLabel}: ${STATUS_LABELS[finalStatus] || finalStatus}`
    );
  } catch (err) {
    console.error("[Telegram] Callback error:", err);
    await answerCallback(botToken, callbackQuery.id, "Помилка сервера");
  }

  return NextResponse.json({ ok: true });
}

async function answerCallback(botToken: string, callbackQueryId: string, text: string) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}
