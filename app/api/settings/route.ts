import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public (no auth) — read-only settings for frontend rendering
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("admin_settings").select("key, value").order("key");
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.key] = row.value;
    }
    return NextResponse.json(map, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({});
  }
}
