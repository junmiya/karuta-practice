"use strict";
/**
 * 監査ログサービス
 *
 * 以下のイベントを記録:
 * - session_confirmed: セッション確定
 * - session_invalidated: セッション無効化
 * - season_frozen: シーズン凍結
 * - season_finalized: シーズン確定
 * - ranking_recalculated: ランキング再計算
 * - title_awarded: 称号付与
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
exports.logSessionConfirmed = logSessionConfirmed;
exports.logSessionInvalidated = logSessionInvalidated;
exports.logSeasonFrozen = logSeasonFrozen;
exports.logSeasonFinalized = logSeasonFinalized;
exports.logRankingRecalculated = logRankingRecalculated;
exports.logTitleAwarded = logTitleAwarded;
exports.getSessionAuditLogs = getSessionAuditLogs;
exports.getSeasonAuditLogs = getSeasonAuditLogs;
exports.getUserAuditLogs = getUserAuditLogs;
exports.getAuditLogsByType = getAuditLogsByType;
exports.getRecentAuditLogs = getRecentAuditLogs;
const firestore_1 = require("firebase-admin/firestore");
const stage1_1 = require("../types/stage1");
const db = (0, firestore_1.getFirestore)();
/**
 * 監査ログを記録
 */
async function writeAuditLog(input) {
    const eventId = generateEventId(input.eventType);
    const auditLog = {
        eventId,
        eventType: input.eventType,
        ...(input.seasonId && { seasonId: input.seasonId }),
        ...(input.uid && { uid: input.uid }),
        ...(input.sessionId && { sessionId: input.sessionId }),
        details: input.details || {},
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdBy: input.createdBy || 'system',
    };
    await db.collection(stage1_1.COLLECTIONS.AUDIT_LOGS).doc(eventId).set(auditLog);
    console.log(`[AuditLog] ${input.eventType}: ${eventId}`);
    return eventId;
}
/**
 * イベントID生成
 */
function generateEventId(eventType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${eventType}_${timestamp}_${random}`;
}
// =============================================================================
// 特定イベント用ヘルパー
// =============================================================================
/**
 * セッション確定ログ
 */
async function logSessionConfirmed(sessionId, uid, seasonId, score, correctCount, ruleVersion) {
    return writeAuditLog({
        eventType: 'session_confirmed',
        seasonId,
        uid,
        sessionId,
        details: {
            score,
            correctCount,
            ruleVersion,
            confirmedAt: new Date().toISOString(),
        },
    });
}
/**
 * セッション無効化ログ
 */
async function logSessionInvalidated(sessionId, uid, seasonId, reasons, reasonCodes, ruleVersion) {
    return writeAuditLog({
        eventType: 'session_invalidated',
        seasonId,
        uid,
        sessionId,
        details: {
            reasons,
            reasonCodes,
            ruleVersion,
            invalidatedAt: new Date().toISOString(),
        },
    });
}
/**
 * シーズン凍結ログ
 */
async function logSeasonFrozen(seasonId, totalSessions, createdBy = 'system') {
    return writeAuditLog({
        eventType: 'season_frozen',
        seasonId,
        details: {
            totalSessions,
            frozenAt: new Date().toISOString(),
        },
        createdBy,
    });
}
/**
 * シーズン確定ログ
 */
async function logSeasonFinalized(seasonId, kyuParticipants, danParticipants, createdBy = 'system') {
    return writeAuditLog({
        eventType: 'season_finalized',
        seasonId,
        details: {
            kyuParticipants,
            danParticipants,
            finalizedAt: new Date().toISOString(),
        },
        createdBy,
    });
}
/**
 * ランキング再計算ログ
 */
async function logRankingRecalculated(seasonId, division, totalParticipants, reason, createdBy = 'system') {
    return writeAuditLog({
        eventType: 'ranking_recalculated',
        seasonId,
        details: {
            division,
            totalParticipants,
            reason,
            recalculatedAt: new Date().toISOString(),
        },
        createdBy,
    });
}
/**
 * 称号付与ログ
 */
async function logTitleAwarded(uid, seasonId, titleType, newCount, totalParticipants) {
    return writeAuditLog({
        eventType: 'title_awarded',
        seasonId,
        uid,
        details: {
            titleType,
            newCount,
            totalParticipants,
            awardedAt: new Date().toISOString(),
        },
    });
}
// =============================================================================
// 監査ログ取得
// =============================================================================
/**
 * 特定セッションの監査ログを取得
 */
async function getSessionAuditLogs(sessionId) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.AUDIT_LOGS)
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * 特定シーズンの監査ログを取得
 */
async function getSeasonAuditLogs(seasonId, limitCount = 100) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.AUDIT_LOGS)
        .where('seasonId', '==', seasonId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * 特定ユーザーの監査ログを取得
 */
async function getUserAuditLogs(uid, limitCount = 50) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.AUDIT_LOGS)
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * イベントタイプ別の監査ログを取得
 */
async function getAuditLogsByType(eventType, limitCount = 100) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.AUDIT_LOGS)
        .where('eventType', '==', eventType)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * 直近の監査ログを取得
 */
async function getRecentAuditLogs(limitCount = 50) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.AUDIT_LOGS)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
//# sourceMappingURL=auditService.js.map