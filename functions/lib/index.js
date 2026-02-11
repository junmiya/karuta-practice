"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEvent = exports.createEvent = exports.leaveGroup = exports.removeMember = exports.changeRole = exports.getGroupMembers = exports.getInviteInfo = exports.joinGroup = exports.getInviteCode = exports.revokeInviteCode = exports.regenerateInviteCode = exports.deleteGroup = exports.updateGroup = exports.getMyGroups = exports.getGroup = exports.createGroup = exports.aggregateGroupStats = exports.checkSeasonBoundary = exports.adminSetUserRole = exports.adminGetUsers = exports.adminGetAllGroups = exports.adminGetGroupAuditLogs = exports.adminDeleteGroup = exports.adminResumeGroup = exports.adminSuspendGroup = exports.adminGetSnapshotStatus = exports.adminGetCurrentSeasonInfo = exports.adminGetJobRuns = exports.adminPublishSeasonV2 = exports.adminFinalizeSeasonV2 = exports.adminFreezeSeasonV2 = exports.adminSeedDefaultCalendar = exports.adminSaveSeasonCalendar = exports.adminGetSeasonCalendar = exports.adminSeedDefaultRuleset = exports.adminSaveRuleset = exports.adminGetRuleset = exports.submitKyuiExam = exports.analyzeStats = exports.getPoemExplanation = exports.costGuardCleanup = exports.updateTitles = exports.checkSeasonTransition = exports.generateDailyReflections = exports.expireStaleSession = exports.updateSeasonStatus = exports.dailyRankingSnapshot = exports.submitOfficialRecord = exports.submitOfficialSession = exports.db = void 0;
exports.joinTebikiInvite = exports.getTebikiInviteInfo = exports.createTebikiInvite = exports.getEventParticipants = exports.leaveEvent = exports.joinEvent = exports.getGroupEvents = exports.rejectEvent = exports.closeEvent = exports.unpublishEvent = exports.publishEvent = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
console.log('=== index.ts loaded, Firebase initialized ===');
// Export Firestore instance for use in other modules
exports.db = admin.firestore();
// Re-export callable functions
var submitOfficialSession_1 = require("./submitOfficialSession");
Object.defineProperty(exports, "submitOfficialSession", { enumerable: true, get: function () { return submitOfficialSession_1.submitOfficialSession; } });
var submitOfficialRecord_1 = require("./submitOfficialRecord");
Object.defineProperty(exports, "submitOfficialRecord", { enumerable: true, get: function () { return submitOfficialRecord_1.submitOfficialRecord; } });
// Re-export scheduled functions (Stage 0)
var scheduledFunctions_1 = require("./scheduledFunctions");
Object.defineProperty(exports, "dailyRankingSnapshot", { enumerable: true, get: function () { return scheduledFunctions_1.dailyRankingSnapshot; } });
Object.defineProperty(exports, "updateSeasonStatus", { enumerable: true, get: function () { return scheduledFunctions_1.updateSeasonStatus; } });
Object.defineProperty(exports, "expireStaleSession", { enumerable: true, get: function () { return scheduledFunctions_1.expireStaleSession; } });
// Re-export scheduled functions (Stage 1)
// Note: updateRankingsCache removed - using realtime updateRanking instead
var scheduledFunctionsStage1_1 = require("./scheduledFunctionsStage1");
Object.defineProperty(exports, "generateDailyReflections", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.generateDailyReflections; } });
// updateRankingsCache,  // Disabled: realtime updateRanking handles this
Object.defineProperty(exports, "checkSeasonTransition", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.checkSeasonTransition; } });
Object.defineProperty(exports, "updateTitles", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.updateTitles; } });
Object.defineProperty(exports, "costGuardCleanup", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.costGuardCleanup; } });
// Export AI Tutor functions
var getPoemExplanation_1 = require("./getPoemExplanation");
Object.defineProperty(exports, "getPoemExplanation", { enumerable: true, get: function () { return getPoemExplanation_1.getPoemExplanation; } });
// Export AI Stats Analysis
var analyzeStats_1 = require("./analyzeStats");
Object.defineProperty(exports, "analyzeStats", { enumerable: true, get: function () { return analyzeStats_1.analyzeStats; } });
// Note: V1 admin functions (adminFunctions.ts) have been deprecated
// All admin operations now use V2 functions from adminFunctionsV2.ts
// Export kyui exam function (102)
var kyuiExamFunction_1 = require("./kyuiExamFunction");
Object.defineProperty(exports, "submitKyuiExam", { enumerable: true, get: function () { return kyuiExamFunction_1.submitKyuiExam; } });
// Export admin functions (102: 歌合・節気別歌位確定)
var adminFunctionsV2_1 = require("./adminFunctionsV2");
Object.defineProperty(exports, "adminGetRuleset", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetRuleset; } });
Object.defineProperty(exports, "adminSaveRuleset", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSaveRuleset; } });
Object.defineProperty(exports, "adminSeedDefaultRuleset", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSeedDefaultRuleset; } });
Object.defineProperty(exports, "adminGetSeasonCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetSeasonCalendar; } });
Object.defineProperty(exports, "adminSaveSeasonCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSaveSeasonCalendar; } });
Object.defineProperty(exports, "adminSeedDefaultCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSeedDefaultCalendar; } });
Object.defineProperty(exports, "adminFreezeSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminFreezeSeasonV2; } });
Object.defineProperty(exports, "adminFinalizeSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminFinalizeSeasonV2; } });
Object.defineProperty(exports, "adminPublishSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminPublishSeasonV2; } });
Object.defineProperty(exports, "adminGetJobRuns", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetJobRuns; } });
Object.defineProperty(exports, "adminGetCurrentSeasonInfo", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetCurrentSeasonInfo; } });
Object.defineProperty(exports, "adminGetSnapshotStatus", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetSnapshotStatus; } });
// 103: 団体管理（プラットフォーム管理者用）
Object.defineProperty(exports, "adminSuspendGroup", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSuspendGroup; } });
Object.defineProperty(exports, "adminResumeGroup", { enumerable: true, get: function () { return adminFunctionsV2_1.adminResumeGroup; } });
Object.defineProperty(exports, "adminDeleteGroup", { enumerable: true, get: function () { return adminFunctionsV2_1.adminDeleteGroup; } });
Object.defineProperty(exports, "adminGetGroupAuditLogs", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetGroupAuditLogs; } });
Object.defineProperty(exports, "adminGetAllGroups", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetAllGroups; } });
// 106: ユーザー管理
Object.defineProperty(exports, "adminGetUsers", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetUsers; } });
Object.defineProperty(exports, "adminSetUserRole", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSetUserRole; } });
// Export scheduled functions (102)
var scheduledFunctionsV2_1 = require("./scheduledFunctionsV2");
Object.defineProperty(exports, "checkSeasonBoundary", { enumerable: true, get: function () { return scheduledFunctionsV2_1.checkSeasonBoundary; } });
Object.defineProperty(exports, "aggregateGroupStats", { enumerable: true, get: function () { return scheduledFunctionsV2_1.aggregateGroupStats; } });
// Export group functions (103: 団体機能)
var groupFunctions_1 = require("./groupFunctions");
Object.defineProperty(exports, "createGroup", { enumerable: true, get: function () { return groupFunctions_1.createGroup; } });
Object.defineProperty(exports, "getGroup", { enumerable: true, get: function () { return groupFunctions_1.getGroupInfo; } });
Object.defineProperty(exports, "getMyGroups", { enumerable: true, get: function () { return groupFunctions_1.getMyGroups; } });
Object.defineProperty(exports, "updateGroup", { enumerable: true, get: function () { return groupFunctions_1.updateGroup; } });
Object.defineProperty(exports, "deleteGroup", { enumerable: true, get: function () { return groupFunctions_1.deleteGroup; } });
Object.defineProperty(exports, "regenerateInviteCode", { enumerable: true, get: function () { return groupFunctions_1.regenerateInviteCode; } });
Object.defineProperty(exports, "revokeInviteCode", { enumerable: true, get: function () { return groupFunctions_1.revokeInviteCode; } });
Object.defineProperty(exports, "getInviteCode", { enumerable: true, get: function () { return groupFunctions_1.getInviteCode; } });
Object.defineProperty(exports, "joinGroup", { enumerable: true, get: function () { return groupFunctions_1.joinGroup; } });
Object.defineProperty(exports, "getInviteInfo", { enumerable: true, get: function () { return groupFunctions_1.getInviteInfo; } });
Object.defineProperty(exports, "getGroupMembers", { enumerable: true, get: function () { return groupFunctions_1.getGroupMembers; } });
Object.defineProperty(exports, "changeRole", { enumerable: true, get: function () { return groupFunctions_1.changeRole; } });
Object.defineProperty(exports, "removeMember", { enumerable: true, get: function () { return groupFunctions_1.removeMember; } });
Object.defineProperty(exports, "leaveGroup", { enumerable: true, get: function () { return groupFunctions_1.leaveGroup; } });
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return groupFunctions_1.createEvent; } });
Object.defineProperty(exports, "updateEvent", { enumerable: true, get: function () { return groupFunctions_1.updateEvent; } });
Object.defineProperty(exports, "publishEvent", { enumerable: true, get: function () { return groupFunctions_1.publishEvent; } });
Object.defineProperty(exports, "unpublishEvent", { enumerable: true, get: function () { return groupFunctions_1.unpublishEvent; } });
Object.defineProperty(exports, "closeEvent", { enumerable: true, get: function () { return groupFunctions_1.closeEvent; } });
Object.defineProperty(exports, "rejectEvent", { enumerable: true, get: function () { return groupFunctions_1.rejectEvent; } });
Object.defineProperty(exports, "getGroupEvents", { enumerable: true, get: function () { return groupFunctions_1.getGroupEvents; } });
Object.defineProperty(exports, "joinEvent", { enumerable: true, get: function () { return groupFunctions_1.joinEvent; } });
Object.defineProperty(exports, "leaveEvent", { enumerable: true, get: function () { return groupFunctions_1.leaveEvent; } });
Object.defineProperty(exports, "getEventParticipants", { enumerable: true, get: function () { return groupFunctions_1.getEventParticipants; } });
// Export invite functions (105: 手引招待機能)
var inviteFunctions_1 = require("./inviteFunctions");
Object.defineProperty(exports, "createTebikiInvite", { enumerable: true, get: function () { return inviteFunctions_1.createTebikiInvite; } });
Object.defineProperty(exports, "getTebikiInviteInfo", { enumerable: true, get: function () { return inviteFunctions_1.getTebikiInviteInfo; } });
Object.defineProperty(exports, "joinTebikiInvite", { enumerable: true, get: function () { return inviteFunctions_1.joinTebikiInvite; } });
//# sourceMappingURL=index.js.map