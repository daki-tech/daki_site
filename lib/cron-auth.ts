/**
 * Shared Bearer-token validator for /api/cron/* endpoints.
 *
 * Accepts `Authorization: Bearer ${CRON_SECRET}` — the same shape Vercel cron
 * sends automatically when CRON_SECRET is set in project env vars. The same
 * header is supplied manually by pg_cron (via pg_net) and cron-job.org, so a
 * single helper validates all three redundancy layers.
 *
 * Returns null on success, or a NextResponse to short-circuit on failure.
 */
import { NextResponse, type NextRequest } from "next/server";

const BEARER_PREFIX = "Bearer ";

export type CronSource = "vercel" | "pg_cron" | "external" | "unknown";

export interface CronAuthSuccess {
  ok: true;
  source: CronSource;
}

export function requireCronAuth(req: NextRequest): NextResponse | CronAuthSuccess {
  const secret = (process.env.CRON_SECRET || "").trim();

  if (!secret) {
    console.error("[cron-auth] CRON_SECRET is not configured");
    return NextResponse.json({ ok: false, error: "cron_secret_unset" }, { status: 500 });
  }

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith(BEARER_PREFIX) || !timingSafeEqual(header.slice(BEARER_PREFIX.length), secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return { ok: true, source: detectSource(req) };
}

function detectSource(req: NextRequest): CronSource {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (ua.includes("vercel-cron")) return "vercel";
  if (ua.includes("pg_net") || ua.includes("postgres")) return "pg_cron";
  if (ua.includes("cron-job.org")) return "external";
  return "unknown";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
