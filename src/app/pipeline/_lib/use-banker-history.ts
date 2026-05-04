"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export interface DraftHistoryRow {
  id: string;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  type: string;
}

export interface SignalHistoryRow {
  signal_type: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export function useBankerHistory(bankerId: string) {
  const [drafts, setDrafts] = useState<DraftHistoryRow[]>([]);
  const [signals, setSignals] = useState<SignalHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const [draftsRes, signalsRes] = await Promise.all([
        supabase
          .from("drafts")
          .select("id, subject, body, status, sent_at, created_at, type")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("signals")
          .select("signal_type, metadata, occurred_at")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("occurred_at", { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;
      const errors = [draftsRes.error?.message, signalsRes.error?.message].filter(Boolean);
      if (errors.length > 0) setError(errors.join("; "));
      setDrafts((draftsRes.data ?? []) as unknown as DraftHistoryRow[]);
      setSignals((signalsRes.data ?? []) as unknown as SignalHistoryRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankerId]);

  return { drafts, signals, loading, error };
}
