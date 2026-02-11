/**
 * 段階1: 成績分析サービス
 *
 * - 決まり字別正答率
 * - 日別反映回数
 * - 分散計算
 * - 苦手札分析
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Division } from '@/types/entry';

// =============================================================================
// 型定義
// =============================================================================

export interface SessionStats {
  sessionId: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  dayKeyJst: string;
  confirmedAt: Date;
}

export interface KimarijiStats {
  kimarijiCount: number; // 1-6
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // 0-100
  avgResponseMs: number;
}

export interface DailyStats {
  dayKeyJst: string;
  sessionCount: number;
  bestScore: number;
  avgScore: number;
  totalCorrect: number;
  totalQuestions: number;
}

export interface PoemStats {
  poemId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgResponseMs: number;
}

export interface OverallStats {
  totalSessions: number;
  confirmedSessions: number;
  bestScore: number;
  avgScore: number;
  totalCorrect: number;
  totalQuestions: number;
  avgResponseMs: number;
  scoreVariance: number;
  scoreStdDev: number;
}

export interface UserStatsAnalysis {
  overall: OverallStats;
  byKimariji: KimarijiStats[];
  byDay: DailyStats[];
  weakPoems: PoemStats[];
  recentSessions: SessionStats[];
}

// =============================================================================
// セッション取得
// =============================================================================

/**
 * ユーザーの確定セッション一覧を取得
 */
export async function getUserConfirmedSessions(
  uid: string,
  seasonId?: string,
  limitCount: number = 100
): Promise<SessionStats[]> {
  let q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid),
    where('status', '==', 'confirmed'),
    orderBy('confirmedAt', 'desc'),
    limit(limitCount)
  );

  if (seasonId) {
    q = query(
      collection(db, 'sessions'),
      where('uid', '==', uid),
      where('seasonId', '==', seasonId),
      where('status', '==', 'confirmed'),
      orderBy('confirmedAt', 'desc'),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const totalElapsedMs = data.totalElapsedMs || 0;
    const correctCount = data.correctCount || 0;
    return {
      sessionId: doc.id,
      score: data.score || 0,
      correctCount,
      totalElapsedMs,
      avgMs: correctCount > 0 ? Math.round(totalElapsedMs / 50) : 0,
      dayKeyJst: data.dayKeyJst || '',
      confirmedAt: data.confirmedAt?.toDate() || new Date(),
    };
  });
}

/**
 * セッションのラウンドデータを取得
 */
export async function getSessionRounds(
  sessionId: string
): Promise<Array<{
  roundIndex: number;
  correctPoemId: string;
  selectedPoemId: string;
  isCorrect: boolean;
  clientElapsedMs: number;
}>> {
  const roundsRef = collection(db, 'sessions', sessionId, 'rounds');
  const snapshot = await getDocs(roundsRef);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      roundIndex: data.roundIndex,
      correctPoemId: data.correctPoemId,
      selectedPoemId: data.selectedPoemId,
      isCorrect: data.isCorrect,
      clientElapsedMs: data.clientElapsedMs,
    };
  });
}

// =============================================================================
// 統計計算
// =============================================================================

/**
 * 全体統計を計算
 */
export function calculateOverallStats(sessions: SessionStats[]): OverallStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      confirmedSessions: 0,
      bestScore: 0,
      avgScore: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      avgResponseMs: 0,
      scoreVariance: 0,
      scoreStdDev: 0,
    };
  }

  const scores = sessions.map((s) => s.score);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalQuestions = sessions.length * 50;
  const totalElapsedMs = sessions.reduce((sum, s) => sum + s.totalElapsedMs, 0);

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) /
    scores.length;

  return {
    totalSessions: sessions.length,
    confirmedSessions: sessions.length,
    bestScore: Math.max(...scores),
    avgScore: Math.round(avgScore),
    totalCorrect,
    totalQuestions,
    avgResponseMs: Math.round(totalElapsedMs / totalQuestions),
    scoreVariance: Math.round(variance),
    scoreStdDev: Math.round(Math.sqrt(variance)),
  };
}

/**
 * 日別統計を計算
 */
export function calculateDailyStats(sessions: SessionStats[]): DailyStats[] {
  const byDay = new Map<string, SessionStats[]>();

  for (const session of sessions) {
    const day = session.dayKeyJst;
    if (!byDay.has(day)) {
      byDay.set(day, []);
    }
    byDay.get(day)!.push(session);
  }

  const dailyStats: DailyStats[] = [];
  for (const [dayKeyJst, daySessions] of byDay) {
    const scores = daySessions.map((s) => s.score);
    const totalCorrect = daySessions.reduce((sum, s) => sum + s.correctCount, 0);

    dailyStats.push({
      dayKeyJst,
      sessionCount: daySessions.length,
      bestScore: Math.max(...scores),
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      totalCorrect,
      totalQuestions: daySessions.length * 50,
    });
  }

  // 日付の新しい順にソート
  return dailyStats.sort((a, b) => b.dayKeyJst.localeCompare(a.dayKeyJst));
}

/**
 * 決まり字別統計を計算（ラウンドデータが必要）
 */
export async function calculateKimarijiStats(
  sessionIds: string[],
  poemsData: Map<string, { kimarijiCount: number }>
): Promise<KimarijiStats[]> {
  const statsByKimariji = new Map<
    number,
    { total: number; correct: number; totalMs: number }
  >();

  // 1-6の決まり字を初期化
  for (let i = 1; i <= 6; i++) {
    statsByKimariji.set(i, { total: 0, correct: 0, totalMs: 0 });
  }

  // 各セッションのラウンドデータを取得
  for (const sessionId of sessionIds.slice(0, 20)) {
    // 最大20セッション
    try {
      const rounds = await getSessionRounds(sessionId);
      for (const round of rounds) {
        const poemData = poemsData.get(round.correctPoemId);
        if (!poemData) continue;

        const kimarijiCount = poemData.kimarijiCount;
        const stats = statsByKimariji.get(kimarijiCount);
        if (!stats) continue;

        stats.total++;
        if (round.isCorrect) {
          stats.correct++;
        }
        stats.totalMs += round.clientElapsedMs;
      }
    } catch (err) {
      console.error(`Failed to get rounds for session ${sessionId}:`, err);
    }
  }

  const result: KimarijiStats[] = [];
  for (let i = 1; i <= 6; i++) {
    const stats = statsByKimariji.get(i)!;
    result.push({
      kimarijiCount: i,
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      avgResponseMs: stats.total > 0 ? Math.round(stats.totalMs / stats.total) : 0,
    });
  }

  return result;
}

/**
 * 苦手札を分析（ラウンドデータが必要）
 */
export async function calculateWeakPoems(
  sessionIds: string[],
  minAttempts: number = 3
): Promise<PoemStats[]> {
  const poemStats = new Map<
    string,
    { total: number; correct: number; totalMs: number }
  >();

  // 各セッションのラウンドデータを取得
  for (const sessionId of sessionIds.slice(0, 20)) {
    try {
      const rounds = await getSessionRounds(sessionId);
      for (const round of rounds) {
        const poemId = round.correctPoemId;
        if (!poemStats.has(poemId)) {
          poemStats.set(poemId, { total: 0, correct: 0, totalMs: 0 });
        }
        const stats = poemStats.get(poemId)!;
        stats.total++;
        if (round.isCorrect) {
          stats.correct++;
        }
        stats.totalMs += round.clientElapsedMs;
      }
    } catch (err) {
      console.error(`Failed to get rounds for session ${sessionId}:`, err);
    }
  }

  const result: PoemStats[] = [];
  for (const [poemId, stats] of poemStats) {
    if (stats.total < minAttempts) continue;

    const accuracy = Math.round((stats.correct / stats.total) * 100);
    result.push({
      poemId,
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      accuracy,
      avgResponseMs: Math.round(stats.totalMs / stats.total),
    });
  }

  // 正答率の低い順にソート
  return result.sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
}

// =============================================================================
// 総合分析
// =============================================================================

/**
 * ユーザーの総合成績分析を取得
 */
export async function getUserStatsAnalysis(
  uid: string,
  poemsData: Map<string, { kimarijiCount: number }>,
  seasonId?: string
): Promise<UserStatsAnalysis> {
  // 確定セッションを取得
  const sessions = await getUserConfirmedSessions(uid, seasonId);

  // 各統計を計算
  const overall = calculateOverallStats(sessions);
  const byDay = calculateDailyStats(sessions);

  // セッションIDリスト
  const sessionIds = sessions.map((s) => s.sessionId);

  // 決まり字別統計（非同期）
  const byKimariji = await calculateKimarijiStats(sessionIds, poemsData);

  // 苦手札（非同期）
  const weakPoems = await calculateWeakPoems(sessionIds);

  return {
    overall,
    byKimariji,
    byDay: byDay.slice(0, 14), // 直近14日
    weakPoems,
    recentSessions: sessions.slice(0, 10), // 直近10セッション
  };
}

// =============================================================================
// 日次反映回数
// =============================================================================

/**
 * ユーザーの日次反映回数（上位3入りした回数）を取得
 */
export async function getDailyReflectionCount(
  uid: string,
  seasonId: string,
  division: Division
): Promise<number> {
  const q = query(
    collection(db, 'dailyReflections'),
    where('seasonId', '==', seasonId),
    where('division', '==', division)
  );

  const snapshot = await getDocs(q);
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const topSessions = data.topSessions || [];
    if (topSessions.some((s: { uid: string }) => s.uid === uid)) {
      count++;
    }
  }

  return count;
}
