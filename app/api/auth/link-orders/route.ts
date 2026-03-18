import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({ user_id: user.id })
      .is("user_id", null)
      .ilike("customer_email", user.email);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
