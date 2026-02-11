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
exports.adminSetUserRole = exports.adminGetUsers = exports.adminGetAllGroups = exports.adminGetGroupAuditLogs = exports.adminDeleteGroup = exports.adminResumeGroup = exports.adminSuspendGroup = exports.adminGetSnapshotStatus = exports.adminGetCurrentSeasonInfo = exports.adminGetJobRuns = exports.adminPublishSeasonV2 = exports.adminFinalizeSeasonV2 = exports.adminFreezeSeasonV2 = exports.adminSeedDefaultCalendar = exports.adminSaveSeasonCalendar = exports.adminGetSeasonCalendar = exports.adminSeedDefaultRuleset = exports.adminSaveRuleset = exports.adminGetRuleset = void 0;
/**
 * 102: 歌合・節気別歌位確定 - 管理者用Cloud Functions V2
 */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const adminAuth_1 = require("./lib/adminAuth");
const rulesetService_1 = require("./services/rulesetService");
const seasonCalendarService_1 = require("./services/seasonCalendarService");
const auditService_1 = require("./services/auditService");
const pipelineService_1 = require("./services/pipelineService");
const db = admin.firestore();
// =============================================================================
// ルールセット管理
// =============================================================================
exports.adminGetRuleset = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
exports.adminSeedDefaultRuleset = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    const uid = await (0, adminAuth_1.requireAdmin)(context);
    try {
        const defaultRuleset = {
            version: '1.0.0',
            yamlContent: '# Default Ruleset v1.0.0',
            kyuiRequirements: [
                { level: 'minarai', label: '見習', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
                { level: 'shokkyu', label: '初級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
                { level: 'nikyu', label: '二級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
                { level: 'sankyu', label: '三級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
                { level: 'yonkyu', label: '四級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
                { level: 'gokyu', label: '五級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
                { level: 'rokkyu', label: '六級', kimarijiFuda: null, questionCount: 50, passRate: 90, allCards: true },
            ],
            danRequirements: [
                { level: 'shodan', label: '初段', topRatio: 0.5, allCardsRequired: true },
                { level: 'nidan', label: '二段', topRatio: 0.4, allCardsRequired: true },
                { level: 'sandan', label: '三段', topRatio: 0.3, allCardsRequired: true },
                { level: 'yondan', label: '四段', topRatio: 0.2, allCardsRequired: true },
                { level: 'godan', label: '五段', topRatio: 0.1, allCardsRequired: true },
                { level: 'rokudan', label: '六段', topRatio: 0.05, allCardsRequired: true },
            ],
            denRequirements: [
                { level: 'shoden', label: '初伝', officialWinCount: 1 },
                { level: 'chuden', label: '中伝', officialWinCount: 3 },
                { level: 'okuden', label: '奥伝', officialWinCount: 5 },
                { level: 'kaiden', label: '皆伝', officialWinCount: 10 },
            ],
            utakuraiRequirements: [
                { level: 'meijin', label: '名人', championCount: 3 },
                { level: 'eisei_meijin', label: '永世名人', championCount: 10 },
            ],
            officialMinParticipants: 3,
            isActive: true,
        };
        const saved = await (0, rulesetService_1.saveRuleset)(defaultRuleset);
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            uid,
            details: { action: 'seed_default_ruleset', version: '1.0.0' },
        });
        return { success: true, ruleset: saved };
    }
    catch (error) {
        console.error('Error seeding default ruleset:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to seed ruleset');
    }
});
// =============================================================================
// 節気カレンダー管理
// =============================================================================
exports.adminGetSeasonCalendar = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
    const uid = await (0, adminAuth_1.requireAdmin)(context);
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
    await (0, adminAuth_1.requireAdmin)(context);
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
// =============================================================================
// 現在シーズン情報・スナップショット状態
// =============================================================================
const seasonCalendarService_2 = require("./services/seasonCalendarService");
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("./types/utaawase");
const group_1 = require("./types/group");
const groupAuditService_1 = require("./services/groupAuditService");
/**
 * 現在のシーズン情報を取得
 */
exports.adminGetCurrentSeasonInfo = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    try {
        const now = new Date();
        const info = await (0, seasonCalendarService_2.getCurrentSeasonInfo)(now);
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
    }
    catch (error) {
        console.error('Error getting current season info:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get season info');
    }
});
/**
 * シーズンスナップショットの状態を取得
 */
exports.adminGetSnapshotStatus = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { seasonKey } = data;
    if (!seasonKey || typeof seasonKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonKey is required');
    }
    try {
        const doc = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey).get();
        if (!doc.exists) {
            return { success: true, exists: false, status: 'not_created' };
        }
        const snapshot = doc.data();
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
    }
    catch (error) {
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
exports.adminSuspendGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = await (0, adminAuth_1.requireAdmin)(context);
    const { groupId, reason } = data;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    try {
        const groupRef = db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId);
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
            suspendedAt: firestore_1.FieldValue.serverTimestamp(),
            suspendedBy: uid,
            suspendReason: reason || null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, groupAuditService_1.logGroupSuspend)(uid, groupId, reason);
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error suspending group:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to suspend group');
    }
});
/**
 * T065: 団体を再開
 */
exports.adminResumeGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = await (0, adminAuth_1.requireAdmin)(context);
    const { groupId } = data;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    try {
        const groupRef = db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId);
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
            suspendedAt: firestore_1.FieldValue.delete(),
            suspendedBy: firestore_1.FieldValue.delete(),
            suspendReason: firestore_1.FieldValue.delete(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, groupAuditService_1.logGroupResume)(uid, groupId);
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error resuming group:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to resume group');
    }
});
/**
 * T066: 団体を削除（論理削除）
 */
exports.adminDeleteGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = await (0, adminAuth_1.requireAdmin)(context);
    const { groupId, reason } = data;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    try {
        const groupRef = db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId);
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
            deletedAt: firestore_1.FieldValue.serverTimestamp(),
            deletedBy: uid,
            deleteReason: reason || null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // 監査ログには専用の関数がないため、writeGroupAuditLogを使用
        const { writeGroupAuditLog } = await Promise.resolve().then(() => __importStar(require('./services/groupAuditService')));
        await writeGroupAuditLog({
            eventType: 'group_delete',
            actorId: uid,
            groupId,
            details: { reason, adminAction: true },
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error deleting group:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to delete group');
    }
});
/**
 * T067: 団体の監査ログを取得
 */
exports.adminGetGroupAuditLogs = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { groupId, limit } = data;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    try {
        const logs = await (0, groupAuditService_1.getGroupAuditLogs)(groupId, limit || 50);
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
    }
    catch (error) {
        console.error('Error getting group audit logs:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get audit logs');
    }
});
/**
 * 全団体の一覧を取得（管理者用）
 */
exports.adminGetAllGroups = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { status, limit: limitParam } = data;
    try {
        let query = db.collection(group_1.GROUP_COLLECTIONS.GROUPS).orderBy('createdAt', 'desc');
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
    }
    catch (error) {
        console.error('Error getting all groups:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get groups');
    }
});
// =============================================================================
// 106: ユーザー管理
// =============================================================================
/**
 * ユーザー一覧取得（siteRole・ニックネームでフィルタ可）
 */
exports.adminGetUsers = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { siteRole, nickname, limit: limitParam } = data || {};
    try {
        let query = db.collection('users').orderBy('createdAt', 'desc');
        if (siteRole && typeof siteRole === 'string' && (0, adminAuth_1.isValidSiteRole)(siteRole)) {
            query = query.where('siteRole', '==', siteRole);
        }
        const snap = await query.limit(limitParam || 50).get();
        let users = snap.docs.map((doc) => {
            const d = doc.data();
            return {
                uid: doc.id,
                nickname: d.nickname || '',
                siteRole: d.siteRole || 'user',
                createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
            };
        });
        // ニックネーム検索（クライアント側フィルタ）
        if (nickname && typeof nickname === 'string') {
            const lower = nickname.toLowerCase();
            users = users.filter((u) => u.nickname.toLowerCase().includes(lower));
        }
        return { success: true, users };
    }
    catch (error) {
        console.error('Error getting users:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get users');
    }
});
/**
 * ユーザーの siteRole を変更（自己変更禁止、監査ログ記録）
 */
exports.adminSetUserRole = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const adminUid = await (0, adminAuth_1.requireAdmin)(context);
    const { targetUid, newRole } = data || {};
    if (!targetUid || typeof targetUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid は必須です');
    }
    if (!newRole || !(0, adminAuth_1.isValidSiteRole)(newRole)) {
        throw new functions.https.HttpsError('invalid-argument', '無効な siteRole です');
    }
    if (targetUid === adminUid) {
        throw new functions.https.HttpsError('failed-precondition', '自分自身の権限は変更できません');
    }
    try {
        const userRef = db.collection('users').doc(targetUid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'ユーザーが見つかりません');
        }
        const oldRole = userDoc.data()?.siteRole || 'user';
        await userRef.update({
            siteRole: newRole,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // 監査ログ
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            uid: adminUid,
            details: {
                action: 'set_user_role',
                targetUid,
                oldRole,
                newRole,
            },
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error setting user role:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to set user role');
    }
});
//# sourceMappingURL=adminFunctionsV2.js.map