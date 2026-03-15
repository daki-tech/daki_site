import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/server-auth";
import { profileSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error || !auth.user) return auth.error;

  const url = new URL(request.url);
  const includeOrders = url.searchParams.get("include") === "orders";

  const [{ data: profile, error: profileError }, ordersResult] = await Promise.all([
    auth.supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
    includeOrders
      ? auth.supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id)
      : Promise.resolve({ count: 0, error: null } as { count: number | null; error: unknown }),
  ]);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ ...profile, ordersCount: ordersResult.count ?? 0 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", auth.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
