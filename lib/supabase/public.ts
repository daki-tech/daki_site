import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public data fetching.
 * Use this in server components that need ISR/static rendering
 * (calling cookies() would force dynamic rendering).
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Supabase public env vars are missing");
  }

  return createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
