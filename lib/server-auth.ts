import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ApiAuthSuccess = {
  error: null;
  supabase: SupabaseServerClient;
  user: User;
};

type ApiAuthFailure = {
  error: NextResponse;
  supabase: null;
  user: null;
};

type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

export async function requireApiUser(): Promise<ApiAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        supabase: null,
        user: null,
      };
    }

    return { error: null, supabase, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase is not configured";
    return {
      error: NextResponse.json({ error: message }, { status: 500 }),
      supabase: null,
      user: null,
    };
  }
}

export async function requireApiAdmin(): Promise<ApiAuthResult> {
  const auth = await requireApiUser();
  if (auth.error || !auth.user || !auth.supabase) return auth;

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabase: null,
      user: null,
    };
  }

  return auth;
}
