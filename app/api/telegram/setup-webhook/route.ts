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

  // Remove bot commands menu — we use reply keyboard instead
  const deleteCommandsRes = await fetch(
    `https://api.telegram.org/bot${botToken}/deleteMyCommands`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
  );
  const deleteCommandsJson = await deleteCommandsRes.json();

  // Set chat menu button to default (removes "Меню" button)
  const menuRes = await fetch(
    `https://api.telegram.org/bot${botToken}/setChatMenuButton`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_button: { type: "default" } }),
    }
  );
  const menuJson = await menuRes.json();

  return NextResponse.json({ webhookUrl, telegram: json, deletedCommands: deleteCommandsJson, menuButton: menuJson });
}
