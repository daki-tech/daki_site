import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Telegram Bot Webhook — registers anyone who messages the bot as an order subscriber.
 * When someone sends /start or any message to the bot, their chat_id is saved.
 * All saved chat_ids receive order notifications.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
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
