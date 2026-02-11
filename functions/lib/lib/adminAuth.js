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
exports.getSiteRole = getSiteRole;
exports.isAdmin = isAdmin;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.isValidSiteRole = isValidSiteRole;
/**
 * 106: 権限チェック共通ユーティリティ
 */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const VALID_SITE_ROLES = ['admin', 'tester', 'user', 'banned'];
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];
/**
 * Firestore から siteRole を取得（未設定は 'user'）
 */
async function getSiteRole(uid) {
    const db = admin.firestore();
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists)
        return 'user';
    const role = doc.data()?.siteRole;
    if (role && VALID_SITE_ROLES.includes(role))
        return role;
    return 'user';
}
/**
 * uid が admin かどうか判定
 * - エミュレータ環境: 常に true
 * - ADMIN_UIDS 環境変数: 移行期間互換
 * - Firestore siteRole: 正式判定
 */
async function isAdmin(uid) {
    if (process.env.FUNCTIONS_EMULATOR)
        return true;
    if (ADMIN_UIDS.includes(uid))
        return true;
    return (await getSiteRole(uid)) === 'admin';
}
/**
 * 認証チェック — uid を返す
 */
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    return context.auth.uid;
}
/**
 * 管理者チェック — uid を返す
 */
async function requireAdmin(context) {
    const uid = requireAuth(context);
    if (!(await isAdmin(uid))) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    return uid;
}
function isValidSiteRole(role) {
    return VALID_SITE_ROLES.includes(role);
}
//# sourceMappingURL=adminAuth.js.map