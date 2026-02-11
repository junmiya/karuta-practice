/**
 * Ranking updater service with Firestore transaction
 * Updates rankings/{seasonId}_{division} document
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export interface RankingEntry {
  uid: string;
  nickname: string;
  score: number;
  rank: number;
  confirmedSessions: number;
  sessionCount: number; // Alias for client compatibility
}

export interface RankingDocument {
  seasonId: string;
  division: 'kyu' | 'dan';
  entries: RankingEntry[];
  updatedAt: admin.firestore.Timestamp;
}

export interface UpdateRankingInput {
  seasonId: string;
  division: 'kyu' | 'dan';
  uid: string;
  nickname: string;
  newScore: number;
}

/**
 * Update ranking document in a transaction
 * - Adds or updates user's entry
 * - Keeps best score
 * - Increments confirmedSessions
 * - Re-sorts and re-ranks all entries
 */
export async function updateRanking(input: UpdateRankingInput): Promise<void> {
  const { seasonId, division, uid, nickname, newScore } = input;
  const rankingId = `${seasonId}_${division}`;
  const rankingRef = db.collection('rankings').doc(rankingId);

  await db.runTransaction(async (transaction) => {
    const rankingDoc = await transaction.get(rankingRef);

    let entries: RankingEntry[] = [];

    if (rankingDoc.exists) {
      const data = rankingDoc.data() as RankingDocument;
      entries = data.entries || [];
    }

    // Find existing entry for this user
    const existingIndex = entries.findIndex((e) => e.uid === uid);

    if (existingIndex >= 0) {
      // Update existing entry
      const existing = entries[existingIndex];
      const newSessionCount = existing.confirmedSessions + 1;
      entries[existingIndex] = {
        ...existing,
        nickname, // Update nickname in case it changed
        score: Math.max(existing.score, newScore), // Keep best score
        confirmedSessions: newSessionCount,
        sessionCount: newSessionCount, // Client compatibility
        rank: 0, // Will be recalculated
      };
    } else {
      // Add new entry
      entries.push({
        uid,
        nickname,
        score: newScore,
        confirmedSessions: 1,
        sessionCount: 1, // Client compatibility
        rank: 0, // Will be recalculated
      });
    }

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks (handle ties by giving same rank)
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].score < entries[i - 1].score) {
        currentRank = i + 1;
      }
      entries[i].rank = currentRank;
    }

    // Write updated ranking
    const updatedData: RankingDocument = {
      seasonId,
      division,
      entries,
      updatedAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    transaction.set(rankingRef, updatedData);
  });
}

/**
 * Update user stats after session confirmation
 */
export async function updateUserStats(
  uid: string,
  newScore: number
): Promise<void> {
  const userStatsRef = db.collection('userStats').doc(uid);

  await db.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(userStatsRef);

    if (statsDoc.exists) {
      const data = statsDoc.data()!;
      transaction.update(userStatsRef, {
        confirmedSessions: FieldValue.increment(1),
        bestScore: Math.max(data.bestScore || 0, newScore),
      });
    } else {
      transaction.set(userStatsRef, {
        totalSessions: 1,
        confirmedSessions: 1,
        bestScore: newScore,
      });
    }
  });
}
