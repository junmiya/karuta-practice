/**
 * 102: 歌合・節気別歌位確定 - 管理者用Cloud Functions V2
 */
import * as functions from 'firebase-functions';
import { getRuleset, saveRuleset } from './services/rulesetService';
import {
  getSeasonCalendar,
  saveSeasonCalendar,
  generate2026DefaultCalendar,
} from './services/seasonCalendarService';
import { writeAuditLog } from './services/auditService';
import {
  freezeSeason as freezeSeasonPipeline,
  finalizeSeason as finalizeSeasonPipeline,
  publishSeason as publishSeasonPipeline,
  getJobRuns,
} from './services/pipelineService';

const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];

function isAdmin(uid: string): boolean {
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
    return true;
  }
  return ADMIN_UIDS.includes(uid);
}

function requireAdmin(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  const uid = context.auth.uid;
  if (!isAdmin(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  return uid;
}

// =============================================================================
// ルールセット管理
// =============================================================================

export const adminGetRuleset = functions
  .region('asia-northeast1')
  .https.onCall(async (_data, context) => {
    requireAdmin(context);
    try {
      const ruleset = await getRuleset();
      return { success: true, ruleset };
    } catch (error) {
      console.error('Error getting ruleset:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get ruleset');
    }
  });

export const adminSaveRuleset = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    try {
      const saved = await saveRuleset(data.ruleset);
      await writeAuditLog({
        eventType: 'ranking_recalculated',
        uid,
        details: { action: 'save_ruleset', version: data.ruleset?.version },
      });
      return { success: true, ruleset: saved };
    } catch (error: any) {
      console.error('Error saving ruleset:', error);
      throw new functions.https.HttpsError('invalid-argument', error.message || 'Failed to save ruleset');
    }
  });

export const adminSeedDefaultRuleset = functions
  .region('asia-northeast1')
  .https.onCall(async (_data, context) => {
    const uid = requireAdmin(context);
    try {
      const defaultRuleset = {
        version: '1.0.0',
        yamlContent: '# Default Ruleset v1.0.0',
        kyuiRequirements: [
          { level: 'minarai' as const, label: '見習', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
          { level: 'shokkyu' as const, label: '初級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
          { level: 'nikyu' as const, label: '二級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
          { level: 'sankyu' as const, label: '三級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
          { level: 'yonkyu' as const, label: '四級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
          { level: 'gokyu' as const, label: '五級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
          { level: 'rokkyu' as const, label: '六級', kimarijiFuda: null, questionCount: 50, passRate: 90, allCards: true },
        ],
        danRequirements: [
          { level: 'shodan' as const, label: '初段', topRatio: 0.5, allCardsRequired: true },
          { level: 'nidan' as const, label: '二段', topRatio: 0.4, allCardsRequired: true },
          { level: 'sandan' as const, label: '三段', topRatio: 0.3, allCardsRequired: true },
          { level: 'yondan' as const, label: '四段', topRatio: 0.2, allCardsRequired: true },
          { level: 'godan' as const, label: '五段', topRatio: 0.1, allCardsRequired: true },
          { level: 'rokudan' as const, label: '六段', topRatio: 0.05, allCardsRequired: true },
        ],
        denRequirements: [
          { level: 'shoden' as const, label: '初伝', officialWinCount: 1 },
          { level: 'chuden' as const, label: '中伝', officialWinCount: 3 },
          { level: 'okuden' as const, label: '奥伝', officialWinCount: 5 },
          { level: 'kaiden' as const, label: '皆伝', officialWinCount: 10 },
        ],
        utakuraiRequirements: [
          { level: 'meijin' as const, label: '名人', championCount: 3 },
          { level: 'eisei_meijin' as const, label: '永世名人', championCount: 10 },
        ],
        officialMinParticipants: 3,
        isActive: true,
      };

      const saved = await saveRuleset(defaultRuleset);
      await writeAuditLog({
        eventType: 'ranking_recalculated',
        uid,
        details: { action: 'seed_default_ruleset', version: '1.0.0' },
      });
      return { success: true, ruleset: saved };
    } catch (error: any) {
      console.error('Error seeding default ruleset:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to seed ruleset');
    }
  });

// =============================================================================
// 節気カレンダー管理
// =============================================================================

export const adminGetSeasonCalendar = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { year } = data;
    if (!year || typeof year !== 'number') {
      throw new functions.https.HttpsError('invalid-argument', 'year is required (number)');
    }
    try {
      const calendar = await getSeasonCalendar(year);
      return { success: true, calendar };
    } catch (error) {
      console.error('Error getting calendar:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get calendar');
    }
  });

export const adminSaveSeasonCalendar = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    try {
      const saved = await saveSeasonCalendar(data.calendar);
      await writeAuditLog({
        eventType: 'ranking_recalculated',
        uid,
        details: { action: 'save_season_calendar', year: data.calendar?.year },
      });
      return { success: true, calendar: saved };
    } catch (error: any) {
      console.error('Error saving calendar:', error);
      throw new functions.https.HttpsError('invalid-argument', error.message || 'Failed to save calendar');
    }
  });

export const adminSeedDefaultCalendar = functions
  .region('asia-northeast1')
  .https.onCall(async (_data, context) => {
    const uid = requireAdmin(context);
    try {
      const defaultCalendar = generate2026DefaultCalendar();
      const saved = await saveSeasonCalendar(defaultCalendar);
      await writeAuditLog({
        eventType: 'ranking_recalculated',
        uid,
        details: { action: 'seed_default_calendar', year: 2026 },
      });
      return { success: true, calendar: saved };
    } catch (error: any) {
      console.error('Error seeding calendar:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to seed calendar');
    }
  });

// =============================================================================
// 確定パイプライン管理
// =============================================================================

export const adminFreezeSeasonV2 = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
      await freezeSeasonPipeline(seasonKey, uid);
      return { success: true };
    } catch (error: any) {
      console.error('Error freezing season V2:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to freeze');
    }
  });

export const adminFinalizeSeasonV2 = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
      await finalizeSeasonPipeline(seasonKey, uid);
      return { success: true };
    } catch (error: any) {
      console.error('Error finalizing season V2:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to finalize');
    }
  });

export const adminPublishSeasonV2 = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
      await publishSeasonPipeline(seasonKey, uid);
      return { success: true };
    } catch (error: any) {
      console.error('Error publishing season V2:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to publish');
    }
  });

export const adminGetJobRuns = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
      const jobRuns = await getJobRuns(seasonKey);
      return { success: true, jobRuns };
    } catch (error: any) {
      console.error('Error getting job runs:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get job runs');
    }
  });

// =============================================================================
// 現在シーズン情報・スナップショット状態
// =============================================================================

import { getCurrentSeasonInfo } from './services/seasonCalendarService';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { UTAAWASE_COLLECTIONS, SeasonSnapshot } from './types/utaawase';
import { GROUP_COLLECTIONS } from './types/group';
import { logGroupSuspend, logGroupResume, getGroupAuditLogs } from './services/groupAuditService';

const db = admin.firestore();

/**
 * 現在のシーズン情報を取得
 */
export const adminGetCurrentSeasonInfo = functions
  .region('asia-northeast1')
  .https.onCall(async (_data, context) => {
    requireAdmin(context);
    try {
      const now = new Date();
      const info = await getCurrentSeasonInfo(now);

      if (!info) {
        return { success: true, currentSeason: null, previousSeason: null };
      }

      // Calculate previous season
      const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
      const currentIndex = seasonOrder.indexOf(info.seasonId);
      let prevYear = info.seasonYear;
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = 3;
        prevYear -= 1;
      }
      const prevSeasonKey = `${prevYear}_${seasonOrder[prevIndex]}`;

      return {
        success: true,
        currentSeason: {
          seasonKey: info.seasonKey,
          seasonId: info.seasonId,
          year: info.seasonYear,
        },
        previousSeason: {
          seasonKey: prevSeasonKey,
          seasonId: seasonOrder[prevIndex],
          year: prevYear,
        },
      };
    } catch (error: any) {
      console.error('Error getting current season info:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get season info');
    }
  });

/**
 * シーズンスナップショットの状態を取得
 */
export const adminGetSnapshotStatus = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
      const doc = await db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey).get();

      if (!doc.exists) {
        return { success: true, exists: false, status: 'not_created' };
      }

      const snapshot = doc.data() as SeasonSnapshot;
      return {
        success: true,
        exists: true,
        status: snapshot.pipeline?.status || 'draft',
        frozenAt: snapshot.pipeline?.frozenAt?.toDate?.()?.toISOString() || null,
        finalizedAt: snapshot.pipeline?.finalizedAt?.toDate?.()?.toISOString() || null,
        publishedAt: snapshot.pipeline?.publishedAt?.toDate?.()?.toISOString() || null,
        totalParticipants: snapshot.totalParticipants || 0,
        totalEvents: snapshot.totalEvents || 0,
      };
    } catch (error: any) {
      console.error('Error getting snapshot status:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get snapshot status');
    }
  });

// =============================================================================
// 103: 団体管理（プラットフォーム管理者用）
// =============================================================================

/**
 * T064: 団体を停止
 */
export const adminSuspendGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { groupId, reason } = data;

    if (!groupId || typeof groupId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    try {
      const groupRef = db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        throw new functions.https.HttpsError('not-found', '団体が見つかりません');
      }

      const currentStatus = groupDoc.data()?.status;
      if (currentStatus === 'suspended') {
        throw new functions.https.HttpsError('failed-precondition', 'すでに停止中です');
      }
      if (currentStatus === 'deleted') {
        throw new functions.https.HttpsError('failed-precondition', '削除済みの団体です');
      }

      await groupRef.update({
        status: 'suspended',
        suspendedAt: FieldValue.serverTimestamp(),
        suspendedBy: uid,
        suspendReason: reason || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logGroupSuspend(uid, groupId, reason);

      return { success: true };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error suspending group:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to suspend group');
    }
  });

/**
 * T065: 団体を再開
 */
export const adminResumeGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { groupId } = data;

    if (!groupId || typeof groupId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    try {
      const groupRef = db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        throw new functions.https.HttpsError('not-found', '団体が見つかりません');
      }

      const currentStatus = groupDoc.data()?.status;
      if (currentStatus !== 'suspended') {
        throw new functions.https.HttpsError('failed-precondition', '停止中の団体のみ再開できます');
      }

      await groupRef.update({
        status: 'active',
        suspendedAt: FieldValue.delete(),
        suspendedBy: FieldValue.delete(),
        suspendReason: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logGroupResume(uid, groupId);

      return { success: true };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error resuming group:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to resume group');
    }
  });

/**
 * T066: 団体を削除（論理削除）
 */
export const adminDeleteGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { groupId, reason } = data;

    if (!groupId || typeof groupId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    try {
      const groupRef = db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        throw new functions.https.HttpsError('not-found', '団体が見つかりません');
      }

      const currentStatus = groupDoc.data()?.status;
      if (currentStatus === 'deleted') {
        throw new functions.https.HttpsError('failed-precondition', 'すでに削除済みです');
      }

      await groupRef.update({
        status: 'deleted',
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: uid,
        deleteReason: reason || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 監査ログには専用の関数がないため、writeGroupAuditLogを使用
      const { writeGroupAuditLog } = await import('./services/groupAuditService');
      await writeGroupAuditLog({
        eventType: 'group_delete',
        actorId: uid,
        groupId,
        details: { reason, adminAction: true },
      });

      return { success: true };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error deleting group:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to delete group');
    }
  });

/**
 * T067: 団体の監査ログを取得
 */
export const adminGetGroupAuditLogs = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { groupId, limit } = data;

    if (!groupId || typeof groupId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    try {
      const logs = await getGroupAuditLogs(groupId, limit || 50);

      return {
        success: true,
        logs: logs.map((log) => ({
          eventId: log.eventId,
          eventType: log.eventType,
          actorId: log.actorId,
          targetId: log.targetId,
          details: log.details,
          timestamp: log.timestamp?.toDate?.()?.toISOString() || null,
        })),
      };
    } catch (error: any) {
      console.error('Error getting group audit logs:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get audit logs');
    }
  });

/**
 * 全団体の一覧を取得（管理者用）
 */
export const adminGetAllGroups = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { status, limit: limitParam } = data;

    try {
      let query = db.collection(GROUP_COLLECTIONS.GROUPS).orderBy('createdAt', 'desc');

      if (status && ['active', 'suspended', 'deleted'].includes(status)) {
        query = query.where('status', '==', status);
      }

      const snap = await query.limit(limitParam || 100).get();

      return {
        success: true,
        groups: snap.docs.map((doc) => {
          const d = doc.data();
          return {
            groupId: d.groupId,
            name: d.name,
            description: d.description,
            status: d.status,
            memberCount: d.memberCount,
            ownerUserId: d.ownerUserId,
            createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
            suspendedAt: d.suspendedAt?.toDate?.()?.toISOString() || null,
            suspendReason: d.suspendReason || null,
          };
        }),
      };
    } catch (error: any) {
      console.error('Error getting all groups:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get groups');
    }
  });

