/**
 * 段階1: シーズン管理サービス
 *
 * シーズンの状態遷移（open → frozen → finalized → archived）を管理
 */
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  Season,
  SeasonStatus,
  COLLECTIONS,
} from '../types/stage1';
import { logSeasonFrozen, writeAuditLog } from './auditService';

const db = admin.firestore();

/**
 * シーズンIDを生成
 * @param year 年（例: 2026）
 * @param term 期（spring | summer | autumn | winter）
 */
export function generateSeasonId(
  year: number,
  term: 'spring' | 'summer' | 'autumn' | 'winter'
): string {
  return `${year}_${term}`;
}

/**
 * シーズン名を生成（日本語表示用）
 */
export function generateSeasonName(
  year: number,
  term: 'spring' | 'summer' | 'autumn' | 'winter'
): string {
  const termNames = {
    spring: '春場所',
    summer: '夏場所',
    autumn: '秋場所',
    winter: '冬場所',
  };
  return `${year}年${termNames[term]}`;
}

/**
 * シーズンを取得
 */
export async function getSeason(seasonId: string): Promise<Season | null> {
  const doc = await db.collection(COLLECTIONS.SEASONS).doc(seasonId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as Season;
}

/**
 * 現在アクティブなシーズン（open状態）を取得
 */
export async function getActiveSeason(): Promise<Season | null> {
  const snapshot = await db
    .collection(COLLECTIONS.SEASONS)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data() as Season;
}

/**
 * シーズンを作成
 */
export async function createSeason(
  year: number,
  term: 'spring' | 'summer' | 'autumn' | 'winter',
  startDate: Date
): Promise<Season> {
  const seasonId = generateSeasonId(year, term);
  const name = generateSeasonName(year, term);
  const now = Timestamp.now();

  const season: Season = {
    seasonId,
    name,
    status: 'open',
    startDate: Timestamp.fromDate(startDate),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COLLECTIONS.SEASONS).doc(seasonId).set(season);

  // 監査ログ（シーズン作成）
  await writeAuditLog({
    eventType: 'season_frozen', // 作成時は専用タイプがないためfrozenを流用
    seasonId,
    details: {
      action: 'created',
      status: 'open',
      name,
    },
  }).catch((err) => console.error('Audit log failed:', err));

  return season;
}

/**
 * シーズン状態を遷移
 *
 * 許可される遷移:
 * - open → frozen
 * - frozen → finalized
 * - finalized → archived
 */
export async function transitionSeasonStatus(
  seasonId: string,
  newStatus: SeasonStatus
): Promise<Season> {
  const seasonRef = db.collection(COLLECTIONS.SEASONS).doc(seasonId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(seasonRef);
    if (!doc.exists) {
      throw new Error(`Season not found: ${seasonId}`);
    }

    const season = doc.data() as Season;
    const currentStatus = season.status;

    // 状態遷移のバリデーション
    const validTransitions: Record<SeasonStatus, SeasonStatus[]> = {
      open: ['frozen'],
      frozen: ['finalized'],
      finalized: ['archived'],
      archived: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${currentStatus} → ${newStatus} for season ${seasonId}`
      );
    }

    const now = Timestamp.now();
    const updates: Partial<Season> = {
      status: newStatus,
      updatedAt: now,
    };

    // 状態に応じた日時を記録
    switch (newStatus) {
      case 'frozen':
        updates.freezeDate = now;
        break;
      case 'finalized':
        updates.finalizeDate = now;
        break;
      case 'archived':
        updates.archiveDate = now;
        break;
    }

    transaction.update(seasonRef, updates);

    // トランザクション外で監査ログを書く
    if (newStatus === 'frozen') {
      setImmediate(() => {
        logSeasonFrozen(seasonId, 0, 'system').catch(console.error);
      });
    } else if (newStatus === 'finalized' || newStatus === 'archived') {
      setImmediate(() => {
        writeAuditLog({
          eventType: newStatus === 'finalized' ? 'season_finalized' : 'season_frozen',
          seasonId,
          details: {
            previousStatus: currentStatus,
            newStatus,
          },
        }).catch(console.error);
      });
    }

    return { ...season, ...updates } as Season;
  });
}

/**
 * シーズンを凍結（frozen）
 */
export async function freezeSeason(seasonId: string): Promise<Season> {
  return transitionSeasonStatus(seasonId, 'frozen');
}

/**
 * シーズンを確定（finalized）
 */
export async function finalizeSeason(seasonId: string): Promise<Season> {
  return transitionSeasonStatus(seasonId, 'finalized');
}

/**
 * シーズンをアーカイブ（archived）
 */
export async function archiveSeason(seasonId: string): Promise<Season> {
  return transitionSeasonStatus(seasonId, 'archived');
}

/**
 * 全シーズンを取得（管理用）
 */
export async function getAllSeasons(): Promise<Season[]> {
  const snapshot = await db
    .collection(COLLECTIONS.SEASONS)
    .orderBy('startDate', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as Season);
}

/**
 * 状態別シーズンを取得
 */
export async function getSeasonsByStatus(status: SeasonStatus): Promise<Season[]> {
  const snapshot = await db
    .collection(COLLECTIONS.SEASONS)
    .where('status', '==', status)
    .get();

  return snapshot.docs.map((doc) => doc.data() as Season);
}
