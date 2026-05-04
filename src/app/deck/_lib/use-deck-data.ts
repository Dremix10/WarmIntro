"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDeckBankers } from "./load-deck-bankers";
import type { DeckBanker, UserContext } from "./types";

export function useDeckData(userId: string | undefined) {
  const [bankers, setBankers] = useState<DeckBanker[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadDeckBankers(userId);
      setBankers(result.bankers);
      setUserContext(result.userContext);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void reload();
  }, [reload, userId]);

  return { bankers, userContext, loading, error, reload };
}

