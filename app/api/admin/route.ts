import { NextResponse } from "next/server";

import { getAdminStats } from "@/lib/data";
import { requireApiAdmin } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const stats = await getAdminStats();

  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  let users: { id: string; email: string | null; full_name: string | null; subscription_tier: string; is_admin: boolean }[] = [];

  if (query) {
    const { data } = await auth.supabase
      .from("profiles")
      .select("id, email, full_name, subscription_tier, is_admin")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(30);

    users = (data ?? []) as typeof users;
  }

  return NextResponse.json({ stats, users });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    userId?: string;
    subscription_tier?: "free" | "pro" | "enterprise";
    is_admin?: boolean;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.subscription_tier) updates.subscription_tier = body.subscription_tier;
  if (typeof body.is_admin === "boolean") updates.is_admin = body.is_admin;

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(updates)
    .eq("id", body.userId)
    .select("id, email, full_name, subscription_tier, is_admin")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
