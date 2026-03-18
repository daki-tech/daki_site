import { NextResponse } from "next/server";

/**
 * GET /api/telegram/setup-webhook
 * One-time call to register the Telegram webhook.
 * After calling this once, delete or protect this endpoint.
 */
export async function GET(req: Request) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );

  const json = await res.json();

  // Set bot commands (creates the "/" menu button in Telegram)
  const commandsRes = await fetch(
    `https://api.telegram.org/bot${botToken}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Главное меню" },
          { command: "finance", description: "💼 Финансовый учет" },
          { command: "cancel", description: "Отменить текущую операцию" },
        ],
      }),
    }
  );
  const commandsJson = await commandsRes.json();

  return NextResponse.json({ webhookUrl, telegram: json, commands: commandsJson });
}
