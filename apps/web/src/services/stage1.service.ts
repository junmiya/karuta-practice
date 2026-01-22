/**
 * 段階1: 公式競技運用サービス
 *
 * - 番付スナップショット（公式結果）の取得
 * - 暫定ランキングキャッシュの取得
 * - 称号情報の取得
 * - 日次反映記録の取得
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Division, Season, SeasonStatus } from '@/types/entry';
import type {
  Ranking,
  RankingEntry,
  BanzukeSnapshot,
  BanzukeEntry,
  Title,
  DailyReflection,
} from '@/types/ranking';

// =============================================================================
// コレクション名
// =============================================================================

const COLLECTIONS = {
  SEASONS: 'seasons',
  RANKINGS: 'rankings',
  BANZUKE_SNAPSHOTS: 'banzukeSnapshots',
  DAILY_REFLECTIONS: 'dailyReflections',
  TITLES: 'titles',
} as const;

// =============================================================================
// ドキュメントID生成
// =============================================================================

function rankingDocId(seasonId: string, division: Division): string {
  return `${seasonId}_${division}`;
}

function banzukeDocId(seasonId: string, division: Division): string {
  return `${seasonId}_${division}`;
}

// =============================================================================
// シーズン
// =============================================================================

/**
 * シーズンを取得
 */
export async function getSeason(seasonId: string): Promise<Season | null> {
  const docRef = doc(db, COLLECTIONS.SEASONS, seasonId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    seasonId: data.seasonId,
    name: data.name,
    status: data.status as SeasonStatus,
    startDate: data.startDate?.toDate() || new Date(),
    freezeDate: data.freezeDate?.toDate(),
    finalizeDate: data.finalizeDate?.toDate(),
    archiveDate: data.archiveDate?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * 現在アクティブなシーズン（open状態）を取得
 */
export async function getActiveSeasonStage1(): Promise<Season | null> {
  const q = query(
    collection(db, COLLECTIONS.SEASONS),
    where('status', '==', 'open'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return {
    seasonId: data.seasonId,
    name: data.name,
    status: data.status as SeasonStatus,
    startDate: data.startDate?.toDate() || new Date(),
    freezeDate: data.freezeDate?.toDate(),
    finalizeDate: data.finalizeDate?.toDate(),
    archiveDate: data.archiveDate?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * 最新のfinalizedシーズンを取得
 */
export async function getLatestFinalizedSeason(): Promise<Season | null> {
  const q = query(
    collection(db, COLLECTIONS.SEASONS),
    where('status', '==', 'finalized'),
    orderBy('finalizeDate', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return {
    seasonId: data.seasonId,
    name: data.name,
    status: data.status as SeasonStatus,
    startDate: data.startDate?.toDate() || new Date(),
    freezeDate: data.freezeDate?.toDate(),
    finalizeDate: data.finalizeDate?.toDate(),
    archiveDate: data.archiveDate?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * 全シーズンを取得
 */
export async function getAllSeasons(): Promise<Season[]> {
  const q = query(
    collection(db, COLLECTIONS.SEASONS),
    orderBy('startDate', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      seasonId: data.seasonId,
      name: data.name,
      status: data.status as SeasonStatus,
      startDate: data.startDate?.toDate() || new Date(),
      freezeDate: data.freezeDate?.toDate(),
      finalizeDate: data.finalizeDate?.toDate(),
      archiveDate: data.archiveDate?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

// =============================================================================
// 暫定ランキング（open中）
// =============================================================================

/**
 * 暫定ランキングキャッシュを取得
 */
export async function getRankingCache(
  seasonId: string,
  division: Division
): Promise<Ranking | null> {
  const docId = rankingDocId(seasonId, division);
  const docRef = doc(db, COLLECTIONS.RANKINGS, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  const entries: RankingEntry[] = (data.entries || []).map((e: Record<string, unknown>) => ({
    uid: e.uid as string,
    nickname: e.nickname as string,
    rank: e.rank as number,
    score: e.score as number,
    confirmedSessions: e.sessionCount as number,
    sessionCount: e.sessionCount as number,
    lastReflectedSubmittedAt: (e.lastReflectedSubmittedAt as Timestamp)?.toDate(),
  }));

  return {
    seasonId: data.seasonId,
    division: data.division,
    entries,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    totalParticipants: data.totalParticipants,
  };
}

// =============================================================================
// 番付スナップショット（公式結果）
// =============================================================================

/**
 * 番付スナップショットを取得
 */
export async function getBanzukeSnapshot(
  seasonId: string,
  division: Division
): Promise<BanzukeSnapshot | null> {
  const docId = banzukeDocId(seasonId, division);
  const docRef = doc(db, COLLECTIONS.BANZUKE_SNAPSHOTS, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  const entries: BanzukeEntry[] = (data.entries || []).map((e: Record<string, unknown>) => ({
    uid: e.uid as string,
    nickname: e.nickname as string,
    rank: e.rank as number,
    score: e.score as number,
    sessionCount: e.sessionCount as number,
    lastReflectedSubmittedAt: (e.lastReflectedSubmittedAt as Timestamp)?.toDate(),
    isChampion: e.isChampion as boolean | undefined,
  }));

  return {
    seasonId: data.seasonId,
    division: data.division,
    status: 'finalized',
    entries,
    totalParticipants: data.totalParticipants,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * 番付スナップショットをRanking形式で取得（互換性用）
 */
export async function getBanzukeAsRanking(
  seasonId: string,
  division: Division
): Promise<Ranking | null> {
  const snapshot = await getBanzukeSnapshot(seasonId, division);
  if (!snapshot) {
    return null;
  }

  const entries: RankingEntry[] = snapshot.entries.map((e) => ({
    uid: e.uid,
    nickname: e.nickname,
    rank: e.rank,
    score: e.score,
    confirmedSessions: e.sessionCount,
    sessionCount: e.sessionCount,
    lastReflectedSubmittedAt: e.lastReflectedSubmittedAt,
  }));

  return {
    seasonId: snapshot.seasonId,
    division: snapshot.division,
    entries,
    updatedAt: snapshot.createdAt,
    totalParticipants: snapshot.totalParticipants,
  };
}

// =============================================================================
// 称号
// =============================================================================

/**
 * ユーザーの称号を取得
 */
export async function getUserTitle(uid: string): Promise<Title | null> {
  const docRef = doc(db, COLLECTIONS.TITLES, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid: data.uid,
    nickname: data.nickname,
    meijinCount: data.meijinCount || 0,
    eiseiCount: data.eiseiCount || 0,
    isMeijin: data.isMeijin || false,
    isEisei: data.isEisei || false,
    history: (data.history || []).map((h: Record<string, unknown>) => ({
      seasonId: h.seasonId as string,
      division: 'dan' as const,
      rank: h.rank as number,
      totalParticipants: h.totalParticipants as number,
      awardedAt: (h.awardedAt as Timestamp)?.toDate() || new Date(),
    })),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * 称号保持者一覧を取得
 */
export async function getTitleHolders(): Promise<Title[]> {
  // isMeijin または isEisei が true のユーザーを取得
  // Firestoreの制約で複合クエリが難しいため、全件取得してフィルタ
  const snapshot = await getDocs(collection(db, COLLECTIONS.TITLES));

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid,
        nickname: data.nickname,
        meijinCount: data.meijinCount || 0,
        eiseiCount: data.eiseiCount || 0,
        isMeijin: data.isMeijin || false,
        isEisei: data.isEisei || false,
        history: (data.history || []).map((h: Record<string, unknown>) => ({
          seasonId: h.seasonId as string,
          division: 'dan' as const,
          rank: h.rank as number,
          totalParticipants: h.totalParticipants as number,
          awardedAt: (h.awardedAt as Timestamp)?.toDate() || new Date(),
        })),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    })
    .filter((t) => t.isMeijin || t.isEisei)
    .sort((a, b) => b.meijinCount - a.meijinCount);
}

// =============================================================================
// 日次反映記録
// =============================================================================

/**
 * 日次反映記録を取得
 */
export async function getDailyReflection(
  seasonId: string,
  division: Division,
  dayKeyJst: string
): Promise<DailyReflection | null> {
  const yyyymmdd = dayKeyJst.replace(/-/g, '');
  const docId = `${seasonId}_${division}_${yyyymmdd}`;
  const docRef = doc(db, COLLECTIONS.DAILY_REFLECTIONS, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    seasonId: data.seasonId,
    division: data.division,
    dayKeyJst: data.dayKeyJst,
    topSessions: (data.topSessions || []).map((s: Record<string, unknown>) => ({
      sessionId: s.sessionId as string,
      uid: s.uid as string,
      nickname: s.nickname as string,
      score: s.score as number,
      correctCount: s.correctCount as number,
      totalElapsedMs: s.totalElapsedMs as number,
      submittedAt: (s.submittedAt as Timestamp)?.toDate() || new Date(),
    })),
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * 最近の日次反映記録を取得
 */
export async function getRecentDailyReflections(
  seasonId: string,
  division: Division,
  limitCount: number = 7
): Promise<DailyReflection[]> {
  const q = query(
    collection(db, COLLECTIONS.DAILY_REFLECTIONS),
    where('seasonId', '==', seasonId),
    where('division', '==', division),
    orderBy('dayKeyJst', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      seasonId: data.seasonId,
      division: data.division,
      dayKeyJst: data.dayKeyJst,
      topSessions: (data.topSessions || []).map((s: Record<string, unknown>) => ({
        sessionId: s.sessionId as string,
        uid: s.uid as string,
        nickname: s.nickname as string,
        score: s.score as number,
        correctCount: s.correctCount as number,
        totalElapsedMs: s.totalElapsedMs as number,
        submittedAt: (s.submittedAt as Timestamp)?.toDate() || new Date(),
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}
