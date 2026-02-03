/**
 * 103: 団体機能 - 招待コードサービス
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { generateInviteCode, verifyInviteCode } from '../lib/crypto';
import {
  GroupInviteDoc,
  GROUP_COLLECTIONS,
  GROUP_DEFAULTS,
  JoinGroupErrorCode,
} from '../types/group';

const db = admin.firestore();

/**
 * 招待コードの検証結果
 */
export interface InviteValidationResult {
  valid: boolean;
  errorCode?: JoinGroupErrorCode;
  message?: string;
  inviteDoc?: GroupInviteDoc;
}

/**
 * 招待コードを作成
 */
export async function createInvite(
  groupId: string,
  createdBy: string,
  expiresInDays: number = GROUP_DEFAULTS.INVITE_EXPIRES_DAYS,
  maxJoins: number = GROUP_DEFAULTS.INVITE_MAX_JOINS
): Promise<{ inviteCode: string; inviteId: string }> {
  const { code, hash } = generateInviteCode();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const inviteRef = db.collection(GROUP_COLLECTIONS.INVITES).doc();
  const inviteDoc: GroupInviteDoc = {
    inviteId: inviteRef.id,
    groupId,
    inviteCodeHash: hash,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
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
export async function getActiveInvite(groupId: string): Promise<GroupInviteDoc | null> {
  const now = Timestamp.now();

  const snap = await db
    .collection(GROUP_COLLECTIONS.INVITES)
    .where('groupId', '==', groupId)
    .where('revokedAt', '==', null)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) {
    // revokedAtがnullのドキュメントがない場合、revokedAtフィールドがないドキュメントを探す
    const snap2 = await db
      .collection(GROUP_COLLECTIONS.INVITES)
      .where('groupId', '==', groupId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    for (const doc of snap2.docs) {
      const invite = doc.data() as GroupInviteDoc;
      if (!invite.revokedAt && invite.expiresAt.toMillis() > now.toMillis()) {
        return invite;
      }
    }
    return null;
  }

  const invite = snap.docs[0].data() as GroupInviteDoc;

  // 期限切れチェック
  if (invite.expiresAt.toMillis() <= now.toMillis()) {
    return null;
  }

  return invite;
}

/**
 * 招待コードを検証
 */
export async function validateInviteCode(
  groupId: string,
  inputCode: string,
  userId: string
): Promise<InviteValidationResult> {
  // 既にメンバーかチェック
  const membershipId = `${groupId}_${userId}`;
  const membershipDoc = await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();
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
  const now = Timestamp.now();
  const invitesSnap = await db
    .collection(GROUP_COLLECTIONS.INVITES)
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
    const invite = doc.data() as GroupInviteDoc;

    // ハッシュ検証
    if (!verifyInviteCode(inputCode, invite.inviteCodeHash)) {
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
export async function incrementJoinCount(inviteId: string): Promise<void> {
  await db.collection(GROUP_COLLECTIONS.INVITES).doc(inviteId).update({
    joinCount: FieldValue.increment(1),
  });
}

/**
 * 招待コードを無効化
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  await db.collection(GROUP_COLLECTIONS.INVITES).doc(inviteId).update({
    revokedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 団体の全招待コードを無効化
 */
export async function revokeAllInvites(groupId: string): Promise<void> {
  const snap = await db
    .collection(GROUP_COLLECTIONS.INVITES)
    .where('groupId', '==', groupId)
    .get();

  const batch = db.batch();
  for (const doc of snap.docs) {
    const invite = doc.data() as GroupInviteDoc;
    if (!invite.revokedAt) {
      batch.update(doc.ref, { revokedAt: FieldValue.serverTimestamp() });
    }
  }
  await batch.commit();
}

/**
 * 招待URLを生成
 */
export function generateInviteUrl(groupId: string, inviteCode: string): string {
  // 本番環境のURL
  const baseUrl = process.env.HOSTING_URL || 'https://karuta-banzuke.web.app';
  return `${baseUrl}/join?groupId=${encodeURIComponent(groupId)}&code=${encodeURIComponent(inviteCode)}`;
}

/**
 * 招待コード情報を取得（公開情報のみ）
 */
export async function getInviteInfo(groupId: string): Promise<{
  hasValidInvite: boolean;
  expiresAt?: Date;
  maxJoins?: number;
  joinCount?: number;
  isExpired?: boolean;
  isRevoked?: boolean;
  isMaxed?: boolean;
}> {
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
