import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "GOOGLE_SHEETS_WEBHOOK_URL not configured" },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing webhook: ${webhookUrl}`);
    console.log("📤 Sending test data:", body);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || { test: true, timestamp: new Date().toISOString() }),
    });

    const responseText = await response.text();

    console.log(`📊 Webhook response: ${response.status} ${response.statusText}`);
    console.log(`📝 Response body: ${responseText}`);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseBody: responseText,
      message: response.ok ? "✓ Webhook accepted" : "❌ Webhook rejected",
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Webhook test error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
