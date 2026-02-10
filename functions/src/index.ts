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

// Note: V1 admin functions (adminFunctions.ts) have been deprecated
// All admin operations now use V2 functions from adminFunctionsV2.ts

// Export kyui exam function (102)
export { submitKyuiExam } from './kyuiExamFunction';

// Export admin functions (102: 歌合・節気別歌位確定)
export {
  adminGetRuleset,
  adminSaveRuleset,
  adminSeedDefaultRuleset,
  adminGetSeasonCalendar,
  adminSaveSeasonCalendar,
  adminSeedDefaultCalendar,
  adminFreezeSeasonV2,
  adminFinalizeSeasonV2,
  adminPublishSeasonV2,
  adminGetJobRuns,
  adminGetCurrentSeasonInfo,
  adminGetSnapshotStatus,
  // 103: 団体管理（プラットフォーム管理者用）
  adminSuspendGroup,
  adminResumeGroup,
  adminDeleteGroup,
  adminGetGroupAuditLogs,
  adminGetAllGroups,
} from './adminFunctionsV2';

// Export scheduled functions (102)
export { checkSeasonBoundary, aggregateGroupStats } from './scheduledFunctionsV2';

// Export group functions (103: 団体機能)
export {
  createGroup,
  getGroupInfo as getGroup,
  getMyGroups,
  updateGroup,
  deleteGroup,
  regenerateInviteCode,
  revokeInviteCode,
  getInviteCode,
  joinGroup,
  getInviteInfo,
  getGroupMembers,
  changeRole,
  removeMember,
  leaveGroup,
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  closeEvent,
  rejectEvent,
  getGroupEvents,
  joinEvent,
  leaveEvent,
  getEventParticipants,
} from './groupFunctions';

// Export invite functions (105: 手引招待機能)
export {
  createTebikiInvite,
  getTebikiInviteInfo,
  joinTebikiInvite,
} from './inviteFunctions';
