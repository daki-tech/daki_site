import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  // Use admin client to bypass RLS — admin needs to see ALL orders
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*, catalog_models(name, sku, image_urls))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json()) as { orderId: string; status: string };
  if (!body.orderId || !body.status) {
    return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: body.status })
    .eq("id", body.orderId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json()) as { orderId: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("order_items").delete().eq("order_id", body.orderId);
  const { error } = await admin.from("orders").delete().eq("id", body.orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
