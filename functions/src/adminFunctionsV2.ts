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
