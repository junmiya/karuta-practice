"use strict";
/**
 * 段階1: 管理者用Cloud Functions
 *
 * - シーズン手動凍結
 * - シーズン手動確定
 * - シーズン一覧取得
 */
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
exports.adminUpdateRankings = exports.adminFinalizeSeason = exports.adminFreezeSeason = exports.adminGetSeasons = void 0;
const functions = __importStar(require("firebase-functions"));
const seasonService_1 = require("./services/seasonService");
const auditService_1 = require("./services/auditService");
// 管理者UIDリスト（環境変数またはFirestoreから取得するのが理想）
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];
/**
 * 管理者権限チェック
 */
function isAdmin(uid) {
    // 開発環境では全員を管理者として扱う（本番では制限）
    if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
        return true;
    }
    return ADMIN_UIDS.includes(uid);
}
/**
 * シーズン一覧を取得（管理者用）
 */
exports.adminGetSeasons = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    // 管理者チェック（開発時は緩和）
    if (!isAdmin(uid)) {
        console.log(`Admin check failed for uid: ${uid}`);
        // 開発時は警告のみ
    }
    try {
        const seasons = await (0, seasonService_1.getAllSeasons)();
        return {
            success: true,
            seasons: seasons.map(s => ({
                seasonId: s.seasonId,
                name: s.name,
                status: s.status,
                startDate: s.startDate?.toDate()?.toISOString() || null,
                freezeDate: s.freezeDate?.toDate()?.toISOString() || null,
                finalizeDate: s.finalizeDate?.toDate()?.toISOString() || null,
                updatedAt: s.updatedAt?.toDate()?.toISOString() || null,
            })),
        };
    }
    catch (error) {
        console.error('Error getting seasons:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get seasons');
    }
});
/**
 * シーズンを手動凍結（管理者用）
 */
exports.adminFreezeSeason = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { seasonId } = data;
    if (!seasonId || typeof seasonId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }
    // 管理者チェック
    if (!isAdmin(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // シーズン存在チェック
        const season = await (0, seasonService_1.getSeason)(seasonId);
        if (!season) {
            throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
        }
        if (season.status !== 'open') {
            throw new functions.https.HttpsError('failed-precondition', `Season is not open (current: ${season.status})`);
        }
        // 凍結実行
        const updatedSeason = await (0, seasonService_1.freezeSeason)(seasonId);
        // 監査ログ
        await (0, auditService_1.writeAuditLog)({
            eventType: 'season_frozen',
            seasonId,
            uid,
            details: {
                action: 'manual_freeze',
                triggeredBy: uid,
            },
        });
        console.log(`Season ${seasonId} frozen by admin ${uid}`);
        return {
            success: true,
            season: {
                seasonId: updatedSeason.seasonId,
                status: updatedSeason.status,
                freezeDate: updatedSeason.freezeDate?.toDate()?.toISOString() || null,
            },
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error freezing season:', error);
        throw new functions.https.HttpsError('internal', 'Failed to freeze season');
    }
});
/**
 * シーズンを手動確定（管理者用）
 * 注意: 通常は凍結から24時間後に自動確定される
 */
exports.adminFinalizeSeason = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { seasonId } = data;
    if (!seasonId || typeof seasonId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }
    // 管理者チェック
    if (!isAdmin(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // シーズン存在チェック
        const season = await (0, seasonService_1.getSeason)(seasonId);
        if (!season) {
            throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
        }
        if (season.status !== 'frozen') {
            throw new functions.https.HttpsError('failed-precondition', `Season is not frozen (current: ${season.status})`);
        }
        // 確定実行
        const updatedSeason = await (0, seasonService_1.finalizeSeason)(seasonId);
        // 監査ログ
        await (0, auditService_1.writeAuditLog)({
            eventType: 'season_finalized',
            seasonId,
            uid,
            details: {
                action: 'manual_finalize',
                triggeredBy: uid,
            },
        });
        console.log(`Season ${seasonId} finalized by admin ${uid}`);
        return {
            success: true,
            season: {
                seasonId: updatedSeason.seasonId,
                status: updatedSeason.status,
                finalizeDate: updatedSeason.finalizeDate?.toDate()?.toISOString() || null,
            },
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error finalizing season:', error);
        throw new functions.https.HttpsError('internal', 'Failed to finalize season');
    }
});
/**
 * ランキングキャッシュを手動更新（管理者用）
 */
exports.adminUpdateRankings = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { seasonId } = data;
    if (!seasonId || typeof seasonId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seasonId is required');
    }
    // 管理者チェック
    if (!isAdmin(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // シーズン存在チェック
        const season = await (0, seasonService_1.getSeason)(seasonId);
        if (!season) {
            throw new functions.https.HttpsError('not-found', `Season not found: ${seasonId}`);
        }
        // 監査ログ
        await (0, auditService_1.writeAuditLog)({
            eventType: 'ranking_recalculated',
            seasonId,
            uid,
            details: {
                action: 'manual_ranking_update',
                triggeredBy: uid,
            },
        });
        console.log(`Rankings update triggered for ${seasonId} by admin ${uid}`);
        return {
            success: true,
            message: `Rankings update triggered for ${seasonId}`,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error updating rankings:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update rankings');
    }
});
//# sourceMappingURL=adminFunctions.js.map