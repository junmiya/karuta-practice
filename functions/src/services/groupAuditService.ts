/**
 * 103: 団体機能 - 監査ログサービス
 */
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateAuditEventId } from '../lib/crypto';
import { GroupAuditEventType, GroupAuditLogDoc } from '../types/group';

const db = admin.firestore();

/**
 * 団体関連の監査ログを書き込む
 */
export async function writeGroupAuditLog(params: {
  eventType: GroupAuditEventType;
  actorId: string;
  groupId: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<string> {
  const eventId = generateAuditEventId('group');

  const logDoc: Record<string, unknown> = {
    eventId,
    eventType: params.eventType,
    actorId: params.actorId,
    groupId: params.groupId,
    timestamp: FieldValue.serverTimestamp(),
  };

  // Optional fields - only include if defined
  if (params.targetId !== undefined) {
    logDoc.targetId = params.targetId;
  }
  if (params.details && Object.keys(params.details).length > 0) {
    logDoc.details = params.details;
  }

  await db.collection('audit_logs').doc(eventId).set(logDoc);

  return eventId;
}

/**
 * 団体作成ログ
 */
export async function logGroupCreate(
  actorId: string,
  groupId: string,
  groupName: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'group_create',
    actorId,
    groupId,
    details: { groupName },
  });
}

/**
 * 団体更新ログ
 */
export async function logGroupUpdate(
  actorId: string,
  groupId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'group_update',
    actorId,
    groupId,
    details: { changes },
  });
}

/**
 * 団体削除ログ
 */
export async function logGroupDelete(
  actorId: string,
  groupId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'group_delete',
    actorId,
    groupId,
  });
}

/**
 * 団体停止ログ
 */
export async function logGroupSuspend(
  actorId: string,
  groupId: string,
  reason?: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'group_suspend',
    actorId,
    groupId,
    details: { reason },
  });
}

/**
 * 団体再開ログ
 */
export async function logGroupResume(
  actorId: string,
  groupId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'group_resume',
    actorId,
    groupId,
  });
}

/**
 * メンバー参加ログ
 */
export async function logMemberJoin(
  actorId: string,
  groupId: string,
  inviteCodeHash?: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'member_join',
    actorId,
    groupId,
    targetId: actorId, // 参加者自身
    details: { inviteCodeHash },
  });
}

/**
 * メンバー退会ログ
 */
export async function logMemberLeave(
  actorId: string,
  groupId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'member_leave',
    actorId,
    groupId,
    targetId: actorId,
  });
}

/**
 * メンバー除名ログ
 */
export async function logMemberRemove(
  actorId: string,
  groupId: string,
  targetId: string,
  reason?: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'member_remove',
    actorId,
    groupId,
    targetId,
    details: { reason },
  });
}

/**
 * ロール変更ログ
 */
export async function logRoleChange(
  actorId: string,
  groupId: string,
  targetId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'role_change',
    actorId,
    groupId,
    targetId,
    details: { oldRole, newRole },
  });
}

/**
 * 招待コード作成ログ
 */
export async function logInviteCreate(
  actorId: string,
  groupId: string,
  inviteId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'invite_create',
    actorId,
    groupId,
    details: { inviteId },
  });
}

/**
 * 招待コード再生成ログ
 */
export async function logInviteRegenerate(
  actorId: string,
  groupId: string,
  oldInviteId?: string,
  newInviteId?: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'invite_regenerate',
    actorId,
    groupId,
    details: { oldInviteId, newInviteId },
  });
}

/**
 * 招待コード無効化ログ
 */
export async function logInviteRevoke(
  actorId: string,
  groupId: string,
  inviteId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'invite_revoke',
    actorId,
    groupId,
    details: { inviteId },
  });
}

/**
 * イベント作成ログ
 */
export async function logEventCreate(
  actorId: string,
  groupId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_create',
    actorId,
    groupId,
    details: { eventId, eventTitle },
  });
}

/**
 * イベント更新ログ
 */
export async function logEventUpdate(
  actorId: string,
  groupId: string,
  eventId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_update',
    actorId,
    groupId,
    details: { eventId, changes },
  });
}

/**
 * イベント公開ログ
 */
export async function logEventPublish(
  actorId: string,
  groupId: string,
  eventId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_publish',
    actorId,
    groupId,
    details: { eventId },
  });
}

/**
 * イベント終了ログ
 */
export async function logEventClose(
  actorId: string,
  groupId: string,
  eventId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_close',
    actorId,
    groupId,
    details: { eventId },
  });
}

/**
 * イベント参加ログ
 */
export async function logEventJoin(
  actorId: string,
  groupId: string,
  eventId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_join',
    actorId,
    groupId,
    targetId: actorId,
    details: { eventId },
  });
}

/**
 * イベント退会ログ
 */
export async function logEventLeave(
  actorId: string,
  groupId: string,
  eventId: string
): Promise<void> {
  await writeGroupAuditLog({
    eventType: 'event_leave',
    actorId,
    groupId,
    targetId: actorId,
    details: { eventId },
  });
}

/**
 * 団体関連の監査ログを取得
 */
export async function getGroupAuditLogs(
  groupId: string,
  limit: number = 50
): Promise<GroupAuditLogDoc[]> {
  const snap = await db
    .collection('audit_logs')
    .where('groupId', '==', groupId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(doc => doc.data() as GroupAuditLogDoc);
}
