import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    // Link guest orders to this user by email
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const admin = createAdminClient();
        await admin
          .from("orders")
          .update({ user_id: user.id })
          .is("user_id", null)
          .ilike("customer_email", user.email);
      }
    } catch {
      // Non-critical — don't block login
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
