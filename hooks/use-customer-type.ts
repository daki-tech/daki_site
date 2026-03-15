"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CustomerType = "retail" | "wholesale";

export function useCustomerType(): { customerType: CustomerType; loading: boolean } {
  const [customerType, setCustomerType] = useState<CustomerType>("retail");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("customer_type")
          .eq("id", user.id)
          .single();

        if (profile?.customer_type && !cancelled) {
          setCustomerType(profile.customer_type as CustomerType);
        }
      } catch {
        // Not logged in or error — default to retail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { customerType, loading };
}
