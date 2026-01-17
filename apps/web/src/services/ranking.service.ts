/**
 * Ranking service for fetching rankings
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Ranking, RankingEntry, UserStats } from '@/types/ranking';
import type { Division } from '@/types/entry';

const RANKINGS_COLLECTION = 'rankings';
const USER_STATS_COLLECTION = 'userStats';

/**
 * Get ranking for a season and division
 */
export async function getRanking(
  seasonId: string,
  division: Division
): Promise<Ranking | null> {
  const rankingId = `${seasonId}_${division}`;
  const rankingRef = doc(db, RANKINGS_COLLECTION, rankingId);
  const rankingDoc = await getDoc(rankingRef);

  if (!rankingDoc.exists()) {
    return null;
  }

  const data = rankingDoc.data();
  return {
    seasonId: data.seasonId,
    division: data.division as Division,
    entries: data.entries || [],
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get user's rank in a ranking
 */
export function getUserRank(
  ranking: Ranking,
  uid: string
): RankingEntry | null {
  return ranking.entries.find((e) => e.uid === uid) || null;
}

/**
 * Get user stats
 */
export async function getUserStats(uid: string): Promise<UserStats | null> {
  const statsRef = doc(db, USER_STATS_COLLECTION, uid);
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) {
    return null;
  }

  const data = statsDoc.data();
  return {
    totalSessions: data.totalSessions || 0,
    confirmedSessions: data.confirmedSessions || 0,
    bestScore: data.bestScore || 0,
    currentRank: data.currentRank,
  };
}
