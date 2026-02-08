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
exports.DEFAULT_SITE_ROLE = void 0;
exports.getSiteRole = getSiteRole;
exports.isAdmin = isAdmin;
exports.isModerator = isModerator;
exports.isBanned = isBanned;
exports.isActiveUser = isActiveUser;
exports.setSiteRole = setSiteRole;
exports.getUsers = getUsers;
/**
 * ユーザー権限（サイトロール）サービス
 *
 * サイト全体のユーザー権限を管理する中央サービス
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
// デフォルトロール
exports.DEFAULT_SITE_ROLE = 'user';
// 環境変数フォールバック（移行期間用）
const LEGACY_ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',').filter(Boolean) || [];
/**
 * ユーザーのサイトロールを取得
 * @param uid ユーザーID
 * @returns サイトロール（未設定の場合は 'user'）
 */
async function getSiteRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            // ユーザードキュメントが存在しない場合
            // 環境変数フォールバックをチェック
            if (LEGACY_ADMIN_UIDS.includes(uid)) {
                return 'admin';
            }
            return exports.DEFAULT_SITE_ROLE;
        }
        const data = userDoc.data();
        const siteRole = data?.siteRole;
        // siteRole が設定されていない場合
        if (!siteRole) {
            // 環境変数フォールバックをチェック
            if (LEGACY_ADMIN_UIDS.includes(uid)) {
                return 'admin';
            }
            return exports.DEFAULT_SITE_ROLE;
        }
        return siteRole;
    }
    catch (error) {
        console.error(`Error getting site role for ${uid}:`, error);
        // エラー時は環境変数フォールバック
        if (LEGACY_ADMIN_UIDS.includes(uid)) {
            return 'admin';
        }
        return exports.DEFAULT_SITE_ROLE;
    }
}
/**
 * ユーザーが管理者かどうかを確認
 * @param uid ユーザーID
 * @returns 管理者の場合 true
 */
async function isAdmin(uid) {
    // 開発/エミュレーター環境では全員を管理者として扱う
    if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
        return true;
    }
    const role = await getSiteRole(uid);
    return role === 'admin';
}
/**
 * ユーザーがモデレーターかどうかを確認
 * @param uid ユーザーID
 * @returns モデレーター（または管理者）の場合 true
 */
async function isModerator(uid) {
    const role = await getSiteRole(uid);
    return role === 'admin' || role === 'moderator';
}
/**
 * ユーザーが禁止されているかどうかを確認
 * @param uid ユーザーID
 * @returns 禁止されている場合 true
 */
async function isBanned(uid) {
    const role = await getSiteRole(uid);
    return role === 'banned';
}
/**
 * ユーザーがアクティブ（禁止されていない）かどうかを確認
 * @param uid ユーザーID
 * @returns アクティブな場合 true
 */
async function isActiveUser(uid) {
    return !(await isBanned(uid));
}
/**
 * ユーザーのサイトロールを設定
 * @param actorUid 操作を行う管理者のUID
 * @param targetUid 対象ユーザーのUID
 * @param newRole 新しいロール
 * @throws 権限エラーまたは無効な操作の場合
 */
async function setSiteRole(actorUid, targetUid, newRole) {
    // 操作者が管理者かどうか確認
    const actorIsAdmin = await isAdmin(actorUid);
    if (!actorIsAdmin) {
        throw new Error('Permission denied: Only admins can change site roles');
    }
    // 自分自身のロールを変更しようとしている場合
    if (actorUid === targetUid && newRole !== 'admin') {
        throw new Error('Cannot demote yourself');
    }
    // ロールの検証
    const validRoles = ['admin', 'moderator', 'user', 'banned'];
    if (!validRoles.includes(newRole)) {
        throw new Error(`Invalid role: ${newRole}`);
    }
    // 対象ユーザーのドキュメントを更新
    const userRef = db.collection('users').doc(targetUid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new Error(`User not found: ${targetUid}`);
    }
    const previousRole = userDoc.data()?.siteRole || exports.DEFAULT_SITE_ROLE;
    // ロール変更
    await userRef.update({
        siteRole: newRole,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 監査ログ
    await logRoleChange(actorUid, targetUid, previousRole, newRole);
    console.log(`Site role changed: ${targetUid} from ${previousRole} to ${newRole} by ${actorUid}`);
}
/**
 * ロール変更の監査ログを記録
 */
async function logRoleChange(actorUid, targetUid, previousRole, newRole) {
    try {
        await db.collection('auditLogs').add({
            eventType: 'site_role_change',
            actorId: actorUid,
            targetId: targetUid,
            details: {
                previousRole,
                newRole,
            },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
        // 監査ログの失敗はロール変更を妨げない
    }
}
/**
 * ユーザー一覧を取得（管理者用）
 * @param actorUid 操作を行う管理者のUID
 * @param options オプション（limit, startAfter, roleFilter）
 * @returns ユーザー一覧
 */
async function getUsers(actorUid, options = {}) {
    // 操作者が管理者かどうか確認
    const actorIsAdmin = await isAdmin(actorUid);
    if (!actorIsAdmin) {
        throw new Error('Permission denied: Only admins can list users');
    }
    const limit = Math.min(options.limit || 50, 100);
    let query = db.collection('users');
    // ロールフィルター
    if (options.roleFilter) {
        query = query.where('siteRole', '==', options.roleFilter);
    }
    // ページネーション
    if (options.startAfterUid) {
        const startDoc = await db.collection('users').doc(options.startAfterUid).get();
        if (startDoc.exists) {
            query = query.startAfter(startDoc);
        }
    }
    query = query.limit(limit + 1);
    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
    const users = docs.map((doc) => {
        const data = doc.data();
        return {
            uid: doc.id,
            nickname: data.nickname || '名無し',
            siteRole: data.siteRole || exports.DEFAULT_SITE_ROLE,
            createdAt: data.createdAt || null,
        };
    });
    return { users, hasMore };
}
//# sourceMappingURL=userRoleService.js.map