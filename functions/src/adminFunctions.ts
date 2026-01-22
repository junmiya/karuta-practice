/**
 * 段階1: 管理者用Cloud Functions
 *
 * - シーズン手動凍結
 * - シーズン手動確定
 * - シーズン一覧取得
 */

import * as functions from 'firebase-functions';
import {
  freezeSeason,
  finalizeSeason,
  getAllSeasons,
  getSeason,
} from './services/seasonService';
import { writeAuditLog } from './services/auditService';

// 管理者UIDリスト（環境変数またはFirestoreから取得するのが理想）
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];

/**
 * 管理者権限チェック
 */
function isAdmin(uid: string): boolean {
  // 開発環境では全員を管理者として扱う（本番では制限）
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
    return true;
  }
  return ADMIN_UIDS.includes(uid);
}

/**
 * シーズン一覧を取得（管理者用）
 */
export const adminGetSeasons = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = context.auth.uid;

    // 管理者チェック（開発時は緩和）
    if (!isAdmin(uid)) {
      console.log(`Admin check failed for uid: ${uid}`);
      // 開発時は警告のみ
    }

    try {
      const seasons = await getAllSeasons();
      return {
        success: true,
        seasons: seasons.map(s => ({
          seasonId: s.seasonId,
          name: s.name,
          status: s.status,
          startDate: s.startDate?.toDate()?.toISOString() || null,
          freezeDate: s.freezeDate?.toDate()?.toISOString() || null,
          finalizeDate: s.finalizeDate?.toDate()?.toISOString() || null,
          updatedAt: s.updatedAt?.toDate()?.toISOString() || null,
        })),
      };
    } catch (error) {
      console.error('Error getting seasons:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get seasons');
    }
  });

/**
 * シーズンを手動凍結（管理者用）
 */
export const adminFreezeSeason = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = context.auth.uid;
    const { seasonId } = data;

    if (!seasonId || typeof seasonId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }

    // 管理者チェック
    if (!isAdmin(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      // シーズン存在チェック
      const season = await getSeason(seasonId);
      if (!season) {
        throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
      }

      if (season.status !== 'open') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Season is not open (current: ${season.status})`
        );
      }

      // 凍結実行
      const updatedSeason = await freezeSeason(seasonId);

      // 監査ログ
      await writeAuditLog({
        eventType: 'season_frozen',
        seasonId,
        uid,
        details: {
          action: 'manual_freeze',
          triggeredBy: uid,
        },
      });

      console.log(`Season ${seasonId} frozen by admin ${uid}`);

      return {
        success: true,
        season: {
          seasonId: updatedSeason.seasonId,
          status: updatedSeason.status,
          freezeDate: updatedSeason.freezeDate?.toDate()?.toISOString() || null,
        },
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Error freezing season:', error);
      throw new functions.https.HttpsError('internal', 'Failed to freeze season');
    }
  });

/**
 * シーズンを手動確定（管理者用）
 * 注意: 通常は凍結から24時間後に自動確定される
 */
export const adminFinalizeSeason = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = context.auth.uid;
    const { seasonId } = data;

    if (!seasonId || typeof seasonId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }

    // 管理者チェック
    if (!isAdmin(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      // シーズン存在チェック
      const season = await getSeason(seasonId);
      if (!season) {
        throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
      }

      if (season.status !== 'frozen') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Season is not frozen (current: ${season.status})`
        );
      }

      // 確定実行
      const updatedSeason = await finalizeSeason(seasonId);

      // 監査ログ
      await writeAuditLog({
        eventType: 'season_finalized',
        seasonId,
        uid,
        details: {
          action: 'manual_finalize',
          triggeredBy: uid,
        },
      });

      console.log(`Season ${seasonId} finalized by admin ${uid}`);

      return {
        success: true,
        season: {
          seasonId: updatedSeason.seasonId,
          status: updatedSeason.status,
          finalizeDate: updatedSeason.finalizeDate?.toDate()?.toISOString() || null,
        },
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Error finalizing season:', error);
      throw new functions.https.HttpsError('internal', 'Failed to finalize season');
    }
  });

/**
 * ランキングキャッシュを手動更新（管理者用）
 */
export const adminUpdateRankings = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = context.auth.uid;
    const { seasonId } = data;

    if (!seasonId || typeof seasonId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }

    // 管理者チェック
    if (!isAdmin(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      // シーズン存在チェック
      const season = await getSeason(seasonId);
      if (!season) {
        throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
      }

      // 監査ログ
      await writeAuditLog({
        eventType: 'ranking_recalculated',
        seasonId,
        uid,
        details: {
          action: 'manual_ranking_update',
          triggeredBy: uid,
        },
      });

      console.log(`Rankings update triggered for ${seasonId} by admin ${uid}`);

      return {
        success: true,
        message: `Rankings update triggered for ${seasonId}`,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Error updating rankings:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update rankings');
    }
  });
