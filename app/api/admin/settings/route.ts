import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { adminSettingsSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase.from("admin_settings").select("*").order("key");

  if (error) {
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = adminSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("admin_settings")
    .upsert(parsed.data, { onConflict: "key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revalidate all pages that use settings (homepage, footer, etc.)
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}
