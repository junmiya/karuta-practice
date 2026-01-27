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
exports.adminGetJobRuns = exports.adminPublishSeasonV2 = exports.adminFinalizeSeasonV2 = exports.adminFreezeSeasonV2 = exports.adminSeedDefaultCalendar = exports.adminSaveSeasonCalendar = exports.adminGetSeasonCalendar = exports.adminSaveRuleset = exports.adminGetRuleset = void 0;
/**
 * 102: 歌合・節気別歌位確定 - 管理者用Cloud Functions V2
 */
const functions = __importStar(require("firebase-functions"));
const rulesetService_1 = require("./services/rulesetService");
const seasonCalendarService_1 = require("./services/seasonCalendarService");
const auditService_1 = require("./services/auditService");
const pipelineService_1 = require("./services/pipelineService");
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];
function isAdmin(uid) {
    if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
        return true;
    }
    return ADMIN_UIDS.includes(uid);
}
function requireAdmin(context) {
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
exports.adminGetRuleset = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    requireAdmin(context);
    try {
        const ruleset = await (0, rulesetService_1.getRuleset)();
        return { success: true, ruleset };
    }
    catch (error) {
        console.error('Error getting ruleset:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get ruleset');
    }
});
exports.adminSaveRuleset = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    try {
        const saved = await (0, rulesetService_1.saveRuleset)(data.ruleset);
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            uid,
            details: { action: 'save_ruleset', version: data.ruleset?.version },
        });
        return { success: true, ruleset: saved };
    }
    catch (error) {
        console.error('Error saving ruleset:', error);
        throw new functions.https.HttpsError('invalid-argument', error.message || 'Failed to save ruleset');
    }
});
// =============================================================================
// 節気カレンダー管理
// =============================================================================
exports.adminGetSeasonCalendar = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { year } = data;
    if (!year || typeof year !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'year is required (number)');
    }
    try {
        const calendar = await (0, seasonCalendarService_1.getSeasonCalendar)(year);
        return { success: true, calendar };
    }
    catch (error) {
        console.error('Error getting calendar:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get calendar');
    }
});
exports.adminSaveSeasonCalendar = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    try {
        const saved = await (0, seasonCalendarService_1.saveSeasonCalendar)(data.calendar);
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            uid,
            details: { action: 'save_season_calendar', year: data.calendar?.year },
        });
        return { success: true, calendar: saved };
    }
    catch (error) {
        console.error('Error saving calendar:', error);
        throw new functions.https.HttpsError('invalid-argument', error.message || 'Failed to save calendar');
    }
});
exports.adminSeedDefaultCalendar = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    const uid = requireAdmin(context);
    try {
        const defaultCalendar = (0, seasonCalendarService_1.generate2026DefaultCalendar)();
        const saved = await (0, seasonCalendarService_1.saveSeasonCalendar)(defaultCalendar);
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            uid,
            details: { action: 'seed_default_calendar', year: 2026 },
        });
        return { success: true, calendar: saved };
    }
    catch (error) {
        console.error('Error seeding calendar:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to seed calendar');
    }
});
// =============================================================================
// 確定パイプライン管理
// =============================================================================
exports.adminFreezeSeasonV2 = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
        await (0, pipelineService_1.freezeSeason)(seasonKey, uid);
        return { success: true };
    }
    catch (error) {
        console.error('Error freezing season V2:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to freeze');
    }
});
exports.adminFinalizeSeasonV2 = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
        await (0, pipelineService_1.finalizeSeason)(seasonKey, uid);
        return { success: true };
    }
    catch (error) {
        console.error('Error finalizing season V2:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to finalize');
    }
});
exports.adminPublishSeasonV2 = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
        await (0, pipelineService_1.publishSeason)(seasonKey, uid);
        return { success: true };
    }
    catch (error) {
        console.error('Error publishing season V2:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to publish');
    }
});
exports.adminGetJobRuns = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    requireAdmin(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
        const jobRuns = await (0, pipelineService_1.getJobRuns)(seasonKey);
        return { success: true, jobRuns };
    }
    catch (error) {
        console.error('Error getting job runs:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get job runs');
    }
});
//# sourceMappingURL=adminFunctionsV2.js.map