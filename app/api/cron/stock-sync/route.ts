import { NextResponse } from "next/server";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncStockToGoogleSheets();
    return NextResponse.json({ ok: true, synced: new Date().toISOString() });
  } catch (err) {
    console.error("[Cron Stock Sync] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
