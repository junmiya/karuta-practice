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
exports.checkSeasonBoundary = exports.adminGetJobRuns = exports.adminPublishSeasonV2 = exports.adminFinalizeSeasonV2 = exports.adminFreezeSeasonV2 = exports.adminSeedDefaultCalendar = exports.adminSaveSeasonCalendar = exports.adminGetSeasonCalendar = exports.adminSaveRuleset = exports.adminGetRuleset = exports.submitKyuiExam = exports.adminUpdateRankings = exports.adminFinalizeSeason = exports.adminFreezeSeason = exports.adminGetSeasons = exports.analyzeStats = exports.getPoemExplanation = exports.costGuardCleanup = exports.updateTitles = exports.checkSeasonTransition = exports.updateRankingsCache = exports.generateDailyReflections = exports.expireStaleSession = exports.updateSeasonStatus = exports.dailyRankingSnapshot = exports.submitOfficialRecord = exports.submitOfficialSession = exports.db = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
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
var scheduledFunctionsStage1_1 = require("./scheduledFunctionsStage1");
Object.defineProperty(exports, "generateDailyReflections", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.generateDailyReflections; } });
Object.defineProperty(exports, "updateRankingsCache", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.updateRankingsCache; } });
Object.defineProperty(exports, "checkSeasonTransition", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.checkSeasonTransition; } });
Object.defineProperty(exports, "updateTitles", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.updateTitles; } });
Object.defineProperty(exports, "costGuardCleanup", { enumerable: true, get: function () { return scheduledFunctionsStage1_1.costGuardCleanup; } });
// Export AI Tutor functions
var getPoemExplanation_1 = require("./getPoemExplanation");
Object.defineProperty(exports, "getPoemExplanation", { enumerable: true, get: function () { return getPoemExplanation_1.getPoemExplanation; } });
// Export AI Stats Analysis
var analyzeStats_1 = require("./analyzeStats");
Object.defineProperty(exports, "analyzeStats", { enumerable: true, get: function () { return analyzeStats_1.analyzeStats; } });
// Export admin functions (Stage 1)
var adminFunctions_1 = require("./adminFunctions");
Object.defineProperty(exports, "adminGetSeasons", { enumerable: true, get: function () { return adminFunctions_1.adminGetSeasons; } });
Object.defineProperty(exports, "adminFreezeSeason", { enumerable: true, get: function () { return adminFunctions_1.adminFreezeSeason; } });
Object.defineProperty(exports, "adminFinalizeSeason", { enumerable: true, get: function () { return adminFunctions_1.adminFinalizeSeason; } });
Object.defineProperty(exports, "adminUpdateRankings", { enumerable: true, get: function () { return adminFunctions_1.adminUpdateRankings; } });
// Export kyui exam function (102)
var kyuiExamFunction_1 = require("./kyuiExamFunction");
Object.defineProperty(exports, "submitKyuiExam", { enumerable: true, get: function () { return kyuiExamFunction_1.submitKyuiExam; } });
// Export admin functions (102: 歌合・節気別歌位確定)
var adminFunctionsV2_1 = require("./adminFunctionsV2");
Object.defineProperty(exports, "adminGetRuleset", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetRuleset; } });
Object.defineProperty(exports, "adminSaveRuleset", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSaveRuleset; } });
Object.defineProperty(exports, "adminGetSeasonCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetSeasonCalendar; } });
Object.defineProperty(exports, "adminSaveSeasonCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSaveSeasonCalendar; } });
Object.defineProperty(exports, "adminSeedDefaultCalendar", { enumerable: true, get: function () { return adminFunctionsV2_1.adminSeedDefaultCalendar; } });
Object.defineProperty(exports, "adminFreezeSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminFreezeSeasonV2; } });
Object.defineProperty(exports, "adminFinalizeSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminFinalizeSeasonV2; } });
Object.defineProperty(exports, "adminPublishSeasonV2", { enumerable: true, get: function () { return adminFunctionsV2_1.adminPublishSeasonV2; } });
Object.defineProperty(exports, "adminGetJobRuns", { enumerable: true, get: function () { return adminFunctionsV2_1.adminGetJobRuns; } });
// Export scheduled functions (102)
var scheduledFunctionsV2_1 = require("./scheduledFunctionsV2");
Object.defineProperty(exports, "checkSeasonBoundary", { enumerable: true, get: function () { return scheduledFunctionsV2_1.checkSeasonBoundary; } });
//# sourceMappingURL=index.js.map