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
          { level: 'beginner' as const, label: '見習', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
          { level: 'jyukkyu' as const, label: '初級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
          { level: 'kyukyu' as const, label: '二級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
          { level: 'hachikyu' as const, label: '三級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
          { level: 'nanakyu' as const, label: '四級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
          { level: 'rokkyu' as const, label: '五級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
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
