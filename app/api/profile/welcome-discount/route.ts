import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWelcomeDiscount } from "@/lib/data";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ discount: 0 });
    }

    const discount = await getWelcomeDiscount(user.id);
    return NextResponse.json({ discount });
  } catch {
    return NextResponse.json({ discount: 0 });
  }
}
