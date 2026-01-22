/**
 * 監査ログサービス
 *
 * 以下のイベントを記録:
 * - session_confirmed: セッション確定
 * - session_invalidated: セッション無効化
 * - season_frozen: シーズン凍結
 * - season_finalized: シーズン確定
 * - ranking_recalculated: ランキング再計算
 * - title_awarded: 称号付与
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  AuditLog,
  AuditEventType,
  COLLECTIONS,
} from '../types/stage1';

const db = getFirestore();

// =============================================================================
// 監査ログ記録
// =============================================================================

interface AuditLogInput {
  eventType: AuditEventType;
  seasonId?: string;
  uid?: string;
  sessionId?: string;
  details?: Record<string, unknown>;
  createdBy?: string;
}

/**
 * 監査ログを記録
 */
export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  const eventId = generateEventId(input.eventType);

  const auditLog: Omit<AuditLog, 'createdAt'> & { createdAt: FieldValue } = {
    eventId,
    eventType: input.eventType,
    ...(input.seasonId && { seasonId: input.seasonId }),
    ...(input.uid && { uid: input.uid }),
    ...(input.sessionId && { sessionId: input.sessionId }),
    details: input.details || {},
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.createdBy || 'system',
  };

  await db.collection(COLLECTIONS.AUDIT_LOGS).doc(eventId).set(auditLog);

  console.log(`[AuditLog] ${input.eventType}: ${eventId}`);
  return eventId;
}

/**
 * イベントID生成
 */
function generateEventId(eventType: AuditEventType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${eventType}_${timestamp}_${random}`;
}

// =============================================================================
// 特定イベント用ヘルパー
// =============================================================================

/**
 * セッション確定ログ
 */
export async function logSessionConfirmed(
  sessionId: string,
  uid: string,
  seasonId: string,
  score: number,
  correctCount: number,
  ruleVersion: string
): Promise<string> {
  return writeAuditLog({
    eventType: 'session_confirmed',
    seasonId,
    uid,
    sessionId,
    details: {
      score,
      correctCount,
      ruleVersion,
      confirmedAt: new Date().toISOString(),
    },
  });
}

/**
 * セッション無効化ログ
 */
export async function logSessionInvalidated(
  sessionId: string,
  uid: string,
  seasonId: string,
  reasons: string[],
  reasonCodes: string[],
  ruleVersion: string
): Promise<string> {
  return writeAuditLog({
    eventType: 'session_invalidated',
    seasonId,
    uid,
    sessionId,
    details: {
      reasons,
      reasonCodes,
      ruleVersion,
      invalidatedAt: new Date().toISOString(),
    },
  });
}

/**
 * シーズン凍結ログ
 */
export async function logSeasonFrozen(
  seasonId: string,
  totalSessions: number,
  createdBy: string = 'system'
): Promise<string> {
  return writeAuditLog({
    eventType: 'season_frozen',
    seasonId,
    details: {
      totalSessions,
      frozenAt: new Date().toISOString(),
    },
    createdBy,
  });
}

/**
 * シーズン確定ログ
 */
export async function logSeasonFinalized(
  seasonId: string,
  kyuParticipants: number,
  danParticipants: number,
  createdBy: string = 'system'
): Promise<string> {
  return writeAuditLog({
    eventType: 'season_finalized',
    seasonId,
    details: {
      kyuParticipants,
      danParticipants,
      finalizedAt: new Date().toISOString(),
    },
    createdBy,
  });
}

/**
 * ランキング再計算ログ
 */
export async function logRankingRecalculated(
  seasonId: string,
  division: 'kyu' | 'dan',
  totalParticipants: number,
  reason: string,
  createdBy: string = 'system'
): Promise<string> {
  return writeAuditLog({
    eventType: 'ranking_recalculated',
    seasonId,
    details: {
      division,
      totalParticipants,
      reason,
      recalculatedAt: new Date().toISOString(),
    },
    createdBy,
  });
}

/**
 * 称号付与ログ
 */
export async function logTitleAwarded(
  uid: string,
  seasonId: string,
  titleType: 'meijin' | 'eisei',
  newCount: number,
  totalParticipants: number
): Promise<string> {
  return writeAuditLog({
    eventType: 'title_awarded',
    seasonId,
    uid,
    details: {
      titleType,
      newCount,
      totalParticipants,
      awardedAt: new Date().toISOString(),
    },
  });
}

// =============================================================================
// 監査ログ取得
// =============================================================================

/**
 * 特定セッションの監査ログを取得
 */
export async function getSessionAuditLogs(
  sessionId: string
): Promise<AuditLog[]> {
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .where('sessionId', '==', sessionId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}

/**
 * 特定シーズンの監査ログを取得
 */
export async function getSeasonAuditLogs(
  seasonId: string,
  limitCount: number = 100
): Promise<AuditLog[]> {
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .where('seasonId', '==', seasonId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}

/**
 * 特定ユーザーの監査ログを取得
 */
export async function getUserAuditLogs(
  uid: string,
  limitCount: number = 50
): Promise<AuditLog[]> {
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}

/**
 * イベントタイプ別の監査ログを取得
 */
export async function getAuditLogsByType(
  eventType: AuditEventType,
  limitCount: number = 100
): Promise<AuditLog[]> {
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .where('eventType', '==', eventType)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}

/**
 * 直近の監査ログを取得
 */
export async function getRecentAuditLogs(
  limitCount: number = 50
): Promise<AuditLog[]> {
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOGS)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}
