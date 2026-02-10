/**
 * 105: 手引招待機能 - Cloud Functions
 */
import * as functions from 'firebase-functions';
import {
  TargetMode,
  VALID_TARGET_MODES,
  TARGET_MODE_CONFIG,
} from './types/invite';
import {
  createInvite as createInviteService,
  getInviteByIdOrCode,
  validateInvite,
  joinInvite as joinInviteService,
} from './services/tebikiInviteService';

// === 認証ヘルパー ===

function requireAuth(context: functions.https.CallableContext): string {
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
export const createTebikiInvite = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { targetMode: string }, context) => {
    const uid = requireAuth(context);

    // targetMode バリデーション
    const targetMode = data.targetMode as TargetMode;
    if (!VALID_TARGET_MODES.includes(targetMode)) {
      throw new functions.https.HttpsError('invalid-argument', '無効な対象モードです');
    }

    const result = await createInviteService(uid, targetMode);

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
export const getTebikiInviteInfo = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { inviteId?: string; inviteCode?: string }) => {
    if (!data.inviteId && !data.inviteCode) {
      throw new functions.https.HttpsError('invalid-argument', 'inviteId または inviteCode が必要です');
    }

    const invite = await getInviteByIdOrCode(data.inviteId, data.inviteCode);

    if (!invite) {
      return {
        found: false,
        status: 'not_found' as const,
      };
    }

    const validation = validateInvite(invite);

    if (!validation.valid) {
      return {
        found: true,
        status: validation.status,
      };
    }

    const config = TARGET_MODE_CONFIG[invite.targetMode];

    return {
      found: true,
      status: 'active' as const,
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
export const joinTebikiInvite = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { inviteId?: string; inviteCode?: string }, context) => {
    if (!data.inviteId && !data.inviteCode) {
      throw new functions.https.HttpsError('invalid-argument', 'inviteId または inviteCode が必要です');
    }

    const invite = await getInviteByIdOrCode(data.inviteId, data.inviteCode);

    if (!invite) {
      throw new functions.https.HttpsError('not-found', '招待が見つかりません');
    }

    const validation = validateInvite(invite);

    if (!validation.valid) {
      if (validation.status === 'expired') {
        throw new functions.https.HttpsError('failed-precondition', '期限切れです');
      }
      throw new functions.https.HttpsError('not-found', '招待が見つかりません');
    }

    // 認証チェック（keiko/utaawase は必須）
    const config = TARGET_MODE_CONFIG[invite.targetMode];
    if (config.requiresAuth && !context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'このモードにはログインが必要です');
    }

    const result = await joinInviteService(invite);

    return {
      success: true,
      redirectUrl: result.redirectUrl,
      targetMode: result.targetMode,
      targetModeLabel: result.targetModeLabel,
    };
  });
