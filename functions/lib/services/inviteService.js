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
exports.createInvite = createInvite;
exports.getActiveInvite = getActiveInvite;
exports.validateInviteCode = validateInviteCode;
exports.incrementJoinCount = incrementJoinCount;
exports.revokeInvite = revokeInvite;
exports.revokeAllInvites = revokeAllInvites;
exports.generateInviteUrl = generateInviteUrl;
exports.getInviteInfo = getInviteInfo;
/**
 * 103: 団体機能 - 招待コードサービス
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("../lib/crypto");
const group_1 = require("../types/group");
const db = admin.firestore();
/**
 * 招待コードを作成
 */
async function createInvite(groupId, createdBy, expiresInDays = group_1.GROUP_DEFAULTS.INVITE_EXPIRES_DAYS, maxJoins = group_1.GROUP_DEFAULTS.INVITE_MAX_JOINS) {
    const { code, hash } = (0, crypto_1.generateInviteCode)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const inviteRef = db.collection(group_1.GROUP_COLLECTIONS.INVITES).doc();
    const inviteDoc = {
        inviteId: inviteRef.id,
        groupId,
        inviteCodeHash: hash,
        createdAt: firestore_1.Timestamp.now(),
        expiresAt: firestore_1.Timestamp.fromDate(expiresAt),
        maxJoins,
        joinCount: 0,
        createdBy,
    };
    await inviteRef.set(inviteDoc);
    return { inviteCode: code, inviteId: inviteRef.id };
}
/**
 * 団体の有効な招待コードを取得
 */
async function getActiveInvite(groupId) {
    const now = firestore_1.Timestamp.now();
    const snap = await db
        .collection(group_1.GROUP_COLLECTIONS.INVITES)
        .where('groupId', '==', groupId)
        .where('revokedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (snap.empty) {
        // revokedAtがnullのドキュメントがない場合、revokedAtフィールドがないドキュメントを探す
        const snap2 = await db
            .collection(group_1.GROUP_COLLECTIONS.INVITES)
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        for (const doc of snap2.docs) {
            const invite = doc.data();
            if (!invite.revokedAt && invite.expiresAt.toMillis() > now.toMillis()) {
                return invite;
            }
        }
        return null;
    }
    const invite = snap.docs[0].data();
    // 期限切れチェック
    if (invite.expiresAt.toMillis() <= now.toMillis()) {
        return null;
    }
    return invite;
}
/**
 * 招待コードを検証
 */
async function validateInviteCode(groupId, inputCode, userId) {
    // 既にメンバーかチェック
    const membershipId = `${groupId}_${userId}`;
    const membershipDoc = await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();
    if (membershipDoc.exists) {
        const data = membershipDoc.data();
        if (data?.status === 'active') {
            return {
                valid: false,
                errorCode: 'ALREADY_MEMBER',
                message: 'すでにこの団体のメンバーです',
            };
        }
    }
    // 有効な招待コードを取得
    const now = firestore_1.Timestamp.now();
    const invitesSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.INVITES)
        .where('groupId', '==', groupId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    if (invitesSnap.empty) {
        return {
            valid: false,
            errorCode: 'INVALID_CODE',
            message: '有効な招待コードがありません',
        };
    }
    // 各招待コードを検証
    for (const doc of invitesSnap.docs) {
        const invite = doc.data();
        // ハッシュ検証
        if (!(0, crypto_1.verifyInviteCode)(inputCode, invite.inviteCodeHash)) {
            continue;
        }
        // 無効化チェック
        if (invite.revokedAt) {
            return {
                valid: false,
                errorCode: 'REVOKED',
                message: 'この招待コードは無効化されています',
            };
        }
        // 期限チェック
        if (invite.expiresAt.toMillis() <= now.toMillis()) {
            return {
                valid: false,
                errorCode: 'EXPIRED',
                message: 'この招待コードは期限切れです',
            };
        }
        // 上限チェック
        if (invite.joinCount >= invite.maxJoins) {
            return {
                valid: false,
                errorCode: 'MAX_JOINS_REACHED',
                message: '招待コードの使用上限に達しています',
            };
        }
        // 全ての検証をパス
        return {
            valid: true,
            inviteDoc: invite,
        };
    }
    return {
        valid: false,
        errorCode: 'INVALID_CODE',
        message: '招待コードが正しくありません',
    };
}
/**
 * 招待コードの使用回数をインクリメント（トランザクション内で使用）
 */
async function incrementJoinCount(inviteId) {
    await db.collection(group_1.GROUP_COLLECTIONS.INVITES).doc(inviteId).update({
        joinCount: firestore_1.FieldValue.increment(1),
    });
}
/**
 * 招待コードを無効化
 */
async function revokeInvite(inviteId) {
    await db.collection(group_1.GROUP_COLLECTIONS.INVITES).doc(inviteId).update({
        revokedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
/**
 * 団体の全招待コードを無効化
 */
async function revokeAllInvites(groupId) {
    const snap = await db
        .collection(group_1.GROUP_COLLECTIONS.INVITES)
        .where('groupId', '==', groupId)
        .get();
    const batch = db.batch();
    for (const doc of snap.docs) {
        const invite = doc.data();
        if (!invite.revokedAt) {
            batch.update(doc.ref, { revokedAt: firestore_1.FieldValue.serverTimestamp() });
        }
    }
    await batch.commit();
}
/**
 * 招待URLを生成
 */
function generateInviteUrl(groupId, inviteCode) {
    // 本番環境のURL
    const baseUrl = process.env.HOSTING_URL || 'https://karuta-banzuke.web.app';
    return `${baseUrl}/musubi/join?groupId=${encodeURIComponent(groupId)}&code=${encodeURIComponent(inviteCode)}`;
}
/**
 * 招待コード情報を取得（公開情報のみ）
 */
async function getInviteInfo(groupId) {
    const invite = await getActiveInvite(groupId);
    if (!invite) {
        return { hasValidInvite: false };
    }
    const now = new Date();
    const expiresAt = invite.expiresAt.toDate();
    const isExpired = expiresAt <= now;
    const isMaxed = invite.joinCount >= invite.maxJoins;
    return {
        hasValidInvite: !isExpired && !isMaxed,
        expiresAt,
        maxJoins: invite.maxJoins,
        joinCount: invite.joinCount,
        isExpired,
        isRevoked: false,
        isMaxed,
    };
}
//# sourceMappingURL=inviteService.js.map