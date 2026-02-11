/**
 * 105: 手引招待機能 - 招待ビジネスロジック
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import {
  InviteDoc,
  InviteSettings,
  TargetMode,
  INVITE_COLLECTIONS,
  INVITE_DEFAULTS,
  TARGET_MODE_CONFIG,
} from '../types/invite';

const db = admin.firestore();

/**
 * 6文字の招待コードを生成（32文字セット、衝突チェック付き）
 */
export async function generateShortCode(): Promise<string> {
  const charset = INVITE_DEFAULTS.CODE_CHARSET;
  const length = INVITE_DEFAULTS.CODE_LENGTH;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += charset[bytes[i] % charset.length];
    }

    // 衝突チェック
    const existing = await db
      .collection(INVITE_COLLECTIONS.INVITES)
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
export async function createInvite(
  uid: string,
  targetMode: TargetMode
): Promise<{ inviteId: string; inviteCode: string; expiresAt: Timestamp }> {
  const inviteCode = await generateShortCode();
  const docRef = db.collection(INVITE_COLLECTIONS.INVITES).doc();
  const inviteId = docRef.id;
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(now.toDate().getTime() + INVITE_DEFAULTS.EXPIRY_HOURS * 60 * 60 * 1000)
  );

  const inviteDoc: InviteDoc = {
    inviteId,
    inviteCode,
    createdByUserId: uid,
    createdAt: now,
    expiresAt,
    status: 'active',
    targetMode,
    settings: { ...INVITE_DEFAULTS.DEFAULT_SETTINGS },
    usageCount: 0,
  };

  await docRef.set(inviteDoc);

  return { inviteId, inviteCode, expiresAt };
}

/**
 * 招待をIDまたはコードで取得
 */
export async function getInviteByIdOrCode(
  inviteId?: string,
  inviteCode?: string
): Promise<InviteDoc | null> {
  if (inviteId) {
    const doc = await db.collection(INVITE_COLLECTIONS.INVITES).doc(inviteId).get();
    if (!doc.exists) return null;
    return doc.data() as InviteDoc;
  }

  if (inviteCode) {
    const snap = await db
      .collection(INVITE_COLLECTIONS.INVITES)
      .where('inviteCode', '==', inviteCode.toUpperCase())
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as InviteDoc;
  }

  return null;
}

/**
 * 招待の有効性を検証
 */
export function validateInvite(invite: InviteDoc): {
  valid: boolean;
  status: 'active' | 'expired' | 'not_found';
} {
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
export function buildRedirectUrl(targetMode: TargetMode, settings: InviteSettings): string {
  const config = TARGET_MODE_CONFIG[targetMode];
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
export async function joinInvite(
  invite: InviteDoc
): Promise<{ redirectUrl: string; targetMode: TargetMode; targetModeLabel: string }> {
  // 使用回数をインクリメント
  await db.collection(INVITE_COLLECTIONS.INVITES).doc(invite.inviteId).update({
    usageCount: FieldValue.increment(1),
    lastUsedAt: Timestamp.now(),
  });

  const redirectUrl = buildRedirectUrl(invite.targetMode, invite.settings);
  const config = TARGET_MODE_CONFIG[invite.targetMode];

  return {
    redirectUrl,
    targetMode: invite.targetMode,
    targetModeLabel: config.label,
  };
}
