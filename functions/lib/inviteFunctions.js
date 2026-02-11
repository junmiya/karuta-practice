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
exports.joinTebikiInvite = exports.getTebikiInviteInfo = exports.createTebikiInvite = void 0;
/**
 * 105: 手引招待機能 - Cloud Functions
 */
const functions = __importStar(require("firebase-functions"));
const invite_1 = require("./types/invite");
const tebikiInviteService_1 = require("./services/tebikiInviteService");
// === 認証ヘルパー ===
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }
    return context.auth.uid;
}
// === T105-01: createInvite ===
/**
 * 招待を作成し、リンクとコードを返す
 * auth: required
 */
exports.createTebikiInvite = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    // targetMode バリデーション
    const targetMode = data.targetMode;
    if (!invite_1.VALID_TARGET_MODES.includes(targetMode)) {
        throw new functions.https.HttpsError('invalid-argument', '無効な対象モードです');
    }
    const result = await (0, tebikiInviteService_1.createInvite)(uid, targetMode);
    // 招待URLを構築
    const inviteUrl = `https://karuta-banzuke.web.app/invite/join?id=${result.inviteId}`;
    return {
        success: true,
        inviteId: result.inviteId,
        inviteCode: result.inviteCode,
        inviteUrl,
        expiresAt: result.expiresAt.toDate().toISOString(),
        targetMode,
    };
});
// === T105-02: getInviteInfo ===
/**
 * 招待情報を取得する（リンク経由 or コード経由）
 * auth: not required
 */
exports.getTebikiInviteInfo = functions
    .region('asia-northeast1')
    .https.onCall(async (data) => {
    if (!data.inviteId && !data.inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'inviteId または inviteCode が必要です');
    }
    const invite = await (0, tebikiInviteService_1.getInviteByIdOrCode)(data.inviteId, data.inviteCode);
    if (!invite) {
        return {
            found: false,
            status: 'not_found',
        };
    }
    const validation = (0, tebikiInviteService_1.validateInvite)(invite);
    if (!validation.valid) {
        return {
            found: true,
            status: validation.status,
        };
    }
    const config = invite_1.TARGET_MODE_CONFIG[invite.targetMode];
    return {
        found: true,
        status: 'active',
        targetMode: invite.targetMode,
        targetModeLabel: config.label,
        requiresAuth: config.requiresAuth,
        settings: invite.settings,
    };
});
// === T105-03: joinInvite ===
/**
 * 招待に参加し、リダイレクト先URLを返す
 * auth: optional (tenarai は不要、keiko/utaawase は必須)
 */
exports.joinTebikiInvite = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    if (!data.inviteId && !data.inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'inviteId または inviteCode が必要です');
    }
    const invite = await (0, tebikiInviteService_1.getInviteByIdOrCode)(data.inviteId, data.inviteCode);
    if (!invite) {
        throw new functions.https.HttpsError('not-found', '招待が見つかりません');
    }
    const validation = (0, tebikiInviteService_1.validateInvite)(invite);
    if (!validation.valid) {
        if (validation.status === 'expired') {
            throw new functions.https.HttpsError('failed-precondition', '期限切れです');
        }
        throw new functions.https.HttpsError('not-found', '招待が見つかりません');
    }
    // 認証チェック（keiko/utaawase は必須）
    const config = invite_1.TARGET_MODE_CONFIG[invite.targetMode];
    if (config.requiresAuth && !context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'このモードにはログインが必要です');
    }
    const result = await (0, tebikiInviteService_1.joinInvite)(invite);
    return {
        success: true,
        redirectUrl: result.redirectUrl,
        targetMode: result.targetMode,
        targetModeLabel: result.targetModeLabel,
    };
});
//# sourceMappingURL=inviteFunctions.js.map