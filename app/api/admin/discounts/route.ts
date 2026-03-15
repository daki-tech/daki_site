import { NextResponse } from "next/server";

import { mockDiscounts } from "@/lib/mock-data";
import { requireApiAdmin } from "@/lib/server-auth";
import { discountSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) {
    return NextResponse.json(mockDiscounts);
  }

  const { data, error } = await auth.supabase.from("discounts").select("*").order("created_at", { ascending: false });

  if (error) return NextResponse.json(mockDiscounts);

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("discounts")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as { id?: string } & Record<string, unknown>;
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...updates } = body;

  const { data, error } = await auth.supabase.from("discounts").update(updates).eq("id", id).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("discounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
