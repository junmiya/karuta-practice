import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
console.log('=== index.ts loaded, Firebase initialized ===');

// Export Firestore instance for use in other modules
export const db = admin.firestore();

// Re-export callable functions
export { submitOfficialSession } from './submitOfficialSession';
export { submitOfficialRecord } from './submitOfficialRecord';

// Re-export scheduled functions (Stage 0)
export {
  dailyRankingSnapshot,
  updateSeasonStatus,
  expireStaleSession,
} from './scheduledFunctions';

// Re-export scheduled functions (Stage 1)
// Note: updateRankingsCache removed - using realtime updateRanking instead
export {
  generateDailyReflections,
  // updateRankingsCache,  // Disabled: realtime updateRanking handles this
  checkSeasonTransition,
  updateTitles,
  costGuardCleanup,
} from './scheduledFunctionsStage1';

// Export AI Tutor functions
export { getPoemExplanation } from './getPoemExplanation';

// Export AI Stats Analysis
export { analyzeStats } from './analyzeStats';

// Export admin functions (Stage 1)
export {
  adminGetSeasons,
  adminFreezeSeason,
  adminFinalizeSeason,
  adminUpdateRankings,
  adminCreateSeason,
} from './adminFunctions';

// Export kyui exam function (102)
export { submitKyuiExam } from './kyuiExamFunction';

// Export admin functions (102: 歌合・節気別歌位確定)
export {
  adminGetRuleset,
  adminSaveRuleset,
  adminGetSeasonCalendar,
  adminSaveSeasonCalendar,
  adminSeedDefaultCalendar,
  adminFreezeSeasonV2,
  adminFinalizeSeasonV2,
  adminPublishSeasonV2,
  adminGetJobRuns,
} from './adminFunctionsV2';

// Export scheduled functions (102)
export { checkSeasonBoundary } from './scheduledFunctionsV2';
