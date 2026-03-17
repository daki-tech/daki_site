"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls `onUpdate` whenever an INSERT, UPDATE, or DELETE happens.
 *
 * @param table — Supabase table name (e.g. "orders")
 * @param onUpdate — callback to invoke on any change
 * @param options — optional filter (column + value) to narrow the subscription
 */
export function useRealtimeTable(
  table: string,
  onUpdate: () => void,
  options?: { filterColumn?: string; filterValue?: string; enabled?: boolean },
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const channelName = `realtime-${table}-${options?.filterColumn || "all"}-${options?.filterValue || "all"}-${Date.now()}`;

    if (options?.filterColumn && options?.filterValue) {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${options.filterColumn}=eq.${options.filterValue}`,
          },
          () => callbackRef.current(),
        )
        .subscribe();
    } else {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => callbackRef.current(),
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, options?.filterColumn, options?.filterValue, enabled]);
}
