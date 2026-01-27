import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

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
export {
  generateDailyReflections,
  updateRankingsCache,
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
} from './adminFunctions';
