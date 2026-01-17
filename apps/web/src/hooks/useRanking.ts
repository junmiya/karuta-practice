/**
 * Hook for fetching and managing rankings
 */

import { useState, useEffect, useCallback } from 'react';
import type { Ranking } from '@/types/ranking';
import type { Division } from '@/types/entry';
import { getRanking } from '@/services/ranking.service';

interface UseRankingOptions {
  seasonId: string;
  division: Division;
}

interface UseRankingResult {
  ranking: Ranking | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRanking(options: UseRankingOptions): UseRankingResult {
  const { seasonId, division } = options;

  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    if (!seasonId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getRanking(seasonId, division);
      setRanking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '番付の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [seasonId, division]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return {
    ranking,
    loading,
    error,
    refresh: fetchRanking,
  };
}
