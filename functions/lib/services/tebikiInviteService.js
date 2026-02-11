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
exports.generateShortCode = generateShortCode;
exports.createInvite = createInvite;
exports.getInviteByIdOrCode = getInviteByIdOrCode;
exports.validateInvite = validateInvite;
exports.buildRedirectUrl = buildRedirectUrl;
exports.joinInvite = joinInvite;
/**
 * 105: 手引招待機能 - 招待ビジネスロジック
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const crypto = __importStar(require("crypto"));
const invite_1 = require("../types/invite");
const db = admin.firestore();
/**
 * 6文字の招待コードを生成（32文字セット、衝突チェック付き）
 */
async function generateShortCode() {
    const charset = invite_1.INVITE_DEFAULTS.CODE_CHARSET;
    const length = invite_1.INVITE_DEFAULTS.CODE_LENGTH;
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const bytes = crypto.randomBytes(length);
        let code = '';
        for (let i = 0; i < length; i++) {
            code += charset[bytes[i] % charset.length];
        }
        // 衝突チェック
        const existing = await db
            .collection(invite_1.INVITE_COLLECTIONS.INVITES)
            .where('inviteCode', '==', code)
            .limit(1)
            .get();
        if (existing.empty) {
            return code;
        }
    }
    throw new Error('招待コードの生成に失敗しました（衝突回避上限）');
}
/**
 * 招待を作成
 */
async function createInvite(uid, targetMode) {
    const inviteCode = await generateShortCode();
    const docRef = db.collection(invite_1.INVITE_COLLECTIONS.INVITES).doc();
    const inviteId = docRef.id;
    const now = firestore_1.Timestamp.now();
    const expiresAt = firestore_1.Timestamp.fromDate(new Date(now.toDate().getTime() + invite_1.INVITE_DEFAULTS.EXPIRY_HOURS * 60 * 60 * 1000));
    const inviteDoc = {
        inviteId,
        inviteCode,
        createdByUserId: uid,
        createdAt: now,
        expiresAt,
        status: 'active',
        targetMode,
        settings: { ...invite_1.INVITE_DEFAULTS.DEFAULT_SETTINGS },
        usageCount: 0,
    };
    await docRef.set(inviteDoc);
    return { inviteId, inviteCode, expiresAt };
}
/**
 * 招待をIDまたはコードで取得
 */
async function getInviteByIdOrCode(inviteId, inviteCode) {
    if (inviteId) {
        const doc = await db.collection(invite_1.INVITE_COLLECTIONS.INVITES).doc(inviteId).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    if (inviteCode) {
        const snap = await db
            .collection(invite_1.INVITE_COLLECTIONS.INVITES)
            .where('inviteCode', '==', inviteCode.toUpperCase())
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        return snap.docs[0].data();
    }
    return null;
}
/**
 * 招待の有効性を検証
 */
function validateInvite(invite) {
    if (invite.status === 'revoked') {
        return { valid: false, status: 'not_found' };
    }
    const now = new Date();
    if (invite.expiresAt.toDate() < now) {
        return { valid: false, status: 'expired' };
    }
    if (invite.status !== 'active') {
        return { valid: false, status: 'expired' };
    }
    return { valid: true, status: 'active' };
}
/**
 * 設定からURLパラメータを構築
 */
function buildRedirectUrl(targetMode, settings) {
    const config = invite_1.TARGET_MODE_CONFIG[targetMode];
    const params = new URLSearchParams();
    if (settings.yomiKana) {
        params.set('yomiKana', '1');
    }
    if (settings.toriKana) {
        params.set('toriKana', '1');
    }
    if (settings.kimarijiShow) {
        params.set('kimariji_show', '1');
    }
    if (settings.kimarijiFilter.length > 0) {
        params.set('kimariji', settings.kimarijiFilter.join(','));
    }
    if (settings.poemRange !== '') {
        params.set('range', settings.poemRange);
    }
    const queryString = params.toString();
    return queryString ? `${config.startUrl}?${queryString}` : config.startUrl;
}
/**
 * 招待に参加（使用回数インクリメント + リダイレクトURL構築）
 */
async function joinInvite(invite) {
    // 使用回数をインクリメント
    await db.collection(invite_1.INVITE_COLLECTIONS.INVITES).doc(invite.inviteId).update({
        usageCount: firestore_1.FieldValue.increment(1),
        lastUsedAt: firestore_1.Timestamp.now(),
    });
    const redirectUrl = buildRedirectUrl(invite.targetMode, invite.settings);
    const config = invite_1.TARGET_MODE_CONFIG[invite.targetMode];
    return {
        redirectUrl,
        targetMode: invite.targetMode,
        targetModeLabel: config.label,
    };
}
//# sourceMappingURL=tebikiInviteService.js.map