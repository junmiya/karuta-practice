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
exports.adminGetUserDetails = exports.adminSetUserRole = exports.adminGetUsers = void 0;
/**
 * 管理者用ユーザー管理 Cloud Functions
 */
const functions = __importStar(require("firebase-functions"));
const userRoleService_1 = require("./services/userRoleService");
/**
 * ユーザー一覧を取得（管理者用）
 */
exports.adminGetUsers = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    try {
        const result = await (0, userRoleService_1.getUsers)(uid, {
            limit: data?.limit,
            startAfterUid: data?.startAfterUid,
            roleFilter: data?.roleFilter,
        });
        return {
            success: true,
            users: result.users.map((u) => ({
                uid: u.uid,
                nickname: u.nickname,
                siteRole: u.siteRole,
                createdAt: u.createdAt?.toDate()?.toISOString() || null,
            })),
            hasMore: result.hasMore,
        };
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Permission denied')) {
            throw new functions.https.HttpsError('permission-denied', error.message);
        }
        console.error('Error getting users:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get users');
    }
});
/**
 * ユーザーの権限を変更（管理者用）
 */
exports.adminSetUserRole = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const actorUid = context.auth.uid;
    const { targetUid, newRole } = data;
    if (!targetUid || typeof targetUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid is required');
    }
    if (!newRole || typeof newRole !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'newRole is required');
    }
    const validRoles = ['admin', 'moderator', 'user', 'banned'];
    if (!validRoles.includes(newRole)) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
    }
    try {
        await (0, userRoleService_1.setSiteRole)(actorUid, targetUid, newRole);
        return {
            success: true,
            message: `User role updated to ${newRole}`,
        };
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Permission denied')) {
                throw new functions.https.HttpsError('permission-denied', error.message);
            }
            if (error.message.includes('Cannot demote yourself')) {
                throw new functions.https.HttpsError('failed-precondition', error.message);
            }
            if (error.message.includes('User not found')) {
                throw new functions.https.HttpsError('not-found', error.message);
            }
        }
        console.error('Error setting user role:', error);
        throw new functions.https.HttpsError('internal', 'Failed to set user role');
    }
});
/**
 * ユーザー詳細を取得（管理者用）
 */
exports.adminGetUserDetails = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const actorUid = context.auth.uid;
    const { targetUid } = data;
    if (!targetUid || typeof targetUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid is required');
    }
    // 管理者チェック
    const actorIsAdmin = await (0, userRoleService_1.isAdmin)(actorUid);
    if (!actorIsAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const admin = await Promise.resolve().then(() => __importStar(require('firebase-admin')));
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(targetUid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        const siteRole = await (0, userRoleService_1.getSiteRole)(targetUid);
        // ユーザー統計を取得
        const statsDoc = await db.collection('userStats').doc(targetUid).get();
        const statsData = statsDoc.exists ? statsDoc.data() : null;
        // 最近のセッション数を取得
        const sessionsSnap = await db
            .collection('sessions')
            .where('uid', '==', targetUid)
            .where('status', '==', 'confirmed')
            .orderBy('confirmedAt', 'desc')
            .limit(10)
            .get();
        return {
            success: true,
            user: {
                uid: targetUid,
                nickname: userData.nickname || '名無し',
                siteRole,
                rank: userData.rank || '未設定',
                banzukeConsent: userData.banzukeConsent || false,
                createdAt: userData.createdAt?.toDate()?.toISOString() || null,
                updatedAt: userData.updatedAt?.toDate()?.toISOString() || null,
            },
            stats: statsData
                ? {
                    totalSessions: statsData.totalSessions || 0,
                    confirmedSessions: statsData.confirmedSessions || 0,
                    bestScore: statsData.bestScore || 0,
                    currentRank: statsData.currentRank || '未設定',
                }
                : null,
            recentSessions: sessionsSnap.docs.map((doc) => {
                const s = doc.data();
                return {
                    sessionId: doc.id,
                    score: s.score || 0,
                    confirmedAt: s.confirmedAt?.toDate()?.toISOString() || null,
                };
            }),
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error getting user details:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get user details');
    }
});
//# sourceMappingURL=adminUserFunctions.js.map