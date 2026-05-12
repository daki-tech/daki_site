import { type NextRequest, NextResponse } from "next/server";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";
import { requireCronAuth, type CronSource } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const JOB_NAME = "stock-sync";

export async function GET(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth instanceof NextResponse) return auth;

  const startedAt = new Date();
  const t0 = Date.now();

  try {
    await syncStockToGoogleSheets();
    const durationMs = Date.now() - t0;
    await logCronRun({ source: auth.source, ok: true, durationMs, startedAt });
    return NextResponse.json({
      ok: true,
      job: JOB_NAME,
      source: auth.source,
      durationMs,
      synced: startedAt.toISOString(),
    });
  } catch (err) {
    const durationMs = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron Stock Sync] Error:", err);
    await logCronRun({ source: auth.source, ok: false, durationMs, startedAt, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function logCronRun(params: {
  source: CronSource;
  ok: boolean;
  durationMs: number;
  startedAt: Date;
  error?: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("cron_runs").insert({
      job_name: JOB_NAME,
      source: params.source,
      ok: params.ok,
      duration_ms: params.durationMs,
      started_at: params.startedAt.toISOString(),
      error: params.error ?? null,
    });
  } catch (e) {
    console.error("[Cron Stock Sync] Failed to log run:", e);
  }
}
