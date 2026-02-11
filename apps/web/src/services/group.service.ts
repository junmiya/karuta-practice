/**
 * 103: 団体機能 - フロントエンドサービス
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  Group,
  GroupWithMembership,
  GroupMember,
  GroupEvent,
  EventParticipant,
  InviteInfo,
  InviteCodeResponse,
  CreateGroupResponse,
  JoinGroupResponse,
  JoinGroupError,
  GroupRole,
} from '@/types/group';

// === 団体管理 ===

/**
 * 団体を作成
 */
export async function createGroup(params: {
  name: string;
  description?: string;
}): Promise<CreateGroupResponse> {
  const fn = httpsCallable<typeof params, CreateGroupResponse>(functions, 'createGroup');
  const result = await fn(params);
  return result.data;
}

/**
 * 団体情報を取得
 */
export async function getGroup(groupId: string): Promise<Group> {
  const fn = httpsCallable<{ groupId: string }, { success: boolean; group: Group }>(
    functions,
    'getGroup'
  );
  const result = await fn({ groupId });
  return result.data.group;
}

/**
 * 自分の所属団体一覧を取得
 */
export async function getMyGroups(): Promise<GroupWithMembership[]> {
  const fn = httpsCallable<void, { success: boolean; groups: GroupWithMembership[] }>(
    functions,
    'getMyGroups'
  );
  const result = await fn();
  return result.data.groups;
}

/**
 * 団体情報を更新
 */
export async function updateGroup(params: {
  groupId: string;
  name?: string;
  description?: string;
}): Promise<void> {
  const fn = httpsCallable<typeof params, { success: boolean }>(functions, 'updateGroup');
  await fn(params);
}

/**
 * 団体を削除
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const fn = httpsCallable<{ groupId: string }, { success: boolean }>(functions, 'deleteGroup');
  await fn({ groupId });
}

// === 招待コード ===

/**
 * 招待コードで団体に参加
 */
export async function joinGroup(params: {
  groupId: string;
  inviteCode: string;
}): Promise<JoinGroupResponse | JoinGroupError> {
  const fn = httpsCallable<typeof params, JoinGroupResponse | JoinGroupError>(
    functions,
    'joinGroup'
  );
  const result = await fn(params);
  return result.data;
}

/**
 * 招待コード情報を取得（公開情報）
 */
export async function getInviteInfo(groupId: string): Promise<InviteInfo> {
  const fn = httpsCallable<{ groupId: string }, InviteInfo>(functions, 'getInviteInfo');
  const result = await fn({ groupId });
  return result.data;
}

/**
 * 招待コードを取得（管理者用）
 */
export async function getInviteCode(groupId: string): Promise<InviteCodeResponse> {
  const fn = httpsCallable<{ groupId: string }, InviteCodeResponse>(functions, 'getInviteCode');
  const result = await fn({ groupId });
  return result.data;
}

/**
 * 招待コードを再生成
 */
export async function regenerateInviteCode(params: {
  groupId: string;
  expiresInDays?: number;
  maxJoins?: number;
}): Promise<InviteCodeResponse> {
  const fn = httpsCallable<typeof params, InviteCodeResponse>(functions, 'regenerateInviteCode');
  const result = await fn(params);
  return result.data;
}

/**
 * 招待コードを無効化
 */
export async function revokeInviteCode(groupId: string): Promise<void> {
  const fn = httpsCallable<{ groupId: string }, { success: boolean }>(
    functions,
    'revokeInviteCode'
  );
  await fn({ groupId });
}

// === メンバー管理 ===

/**
 * 団体メンバー一覧を取得
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const fn = httpsCallable<{ groupId: string }, { success: boolean; members: GroupMember[] }>(
    functions,
    'getGroupMembers'
  );
  const result = await fn({ groupId });
  return result.data.members;
}

/**
 * メンバーのロールを変更
 */
export async function changeRole(params: {
  groupId: string;
  targetUserId: string;
  newRole: GroupRole;
}): Promise<void> {
  const fn = httpsCallable<typeof params, { success: boolean }>(functions, 'changeRole');
  await fn(params);
}

/**
 * メンバーを除名
 */
export async function removeMember(params: {
  groupId: string;
  targetUserId: string;
}): Promise<void> {
  const fn = httpsCallable<typeof params, { success: boolean }>(functions, 'removeMember');
  await fn(params);
}

/**
 * 団体から退会
 */
export async function leaveGroup(groupId: string): Promise<void> {
  const fn = httpsCallable<{ groupId: string }, { success: boolean }>(functions, 'leaveGroup');
  await fn({ groupId });
}

// === イベント管理 ===

/**
 * イベントを作成
 */
export async function createEvent(params: {
  groupId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  visibility?: 'group_only' | 'public';
}): Promise<{ eventId: string }> {
  const fn = httpsCallable<typeof params, { success: boolean; eventId: string }>(
    functions,
    'createEvent'
  );
  const result = await fn(params);
  return { eventId: result.data.eventId };
}

/**
 * イベントを更新
 */
export async function updateEvent(params: {
  eventId: string;
  title?: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  visibility?: 'group_only' | 'public';
}): Promise<void> {
  const fn = httpsCallable<typeof params, { success: boolean }>(functions, 'updateEvent');
  await fn(params);
}

/**
 * イベントを公開
 */
export async function publishEvent(eventId: string): Promise<void> {
  const fn = httpsCallable<{ eventId: string }, { success: boolean }>(functions, 'publishEvent');
  await fn({ eventId });
}

/**
 * イベントを非公開に戻す
 */
export async function unpublishEvent(eventId: string): Promise<void> {
  const fn = httpsCallable<{ eventId: string }, { success: boolean }>(functions, 'unpublishEvent');
  await fn({ eventId });
}

/**
 * イベントを終了
 */
export async function closeEvent(eventId: string): Promise<void> {
  const fn = httpsCallable<{ eventId: string }, { success: boolean }>(functions, 'closeEvent');
  await fn({ eventId });
}

/**
 * 集いを却下（主宰者のみ）
 */
export async function rejectEvent(params: {
  eventId: string;
  groupId: string;
}): Promise<void> {
  const fn = httpsCallable<typeof params, { success: boolean }>(functions, 'rejectEvent');
  await fn(params);
}

/**
 * 団体のイベント一覧を取得
 */
export async function getGroupEvents(params: {
  groupId: string;
  status?: 'draft' | 'published' | 'closed' | 'all';
}): Promise<GroupEvent[]> {
  const fn = httpsCallable<typeof params, { success: boolean; events: GroupEvent[] }>(
    functions,
    'getGroupEvents'
  );
  const result = await fn(params);
  return result.data.events;
}

/**
 * イベントに参加
 */
export async function joinEvent(eventId: string): Promise<void> {
  const fn = httpsCallable<{ eventId: string }, { success: boolean }>(functions, 'joinEvent');
  await fn({ eventId });
}

/**
 * イベント参加をキャンセル
 */
export async function leaveEvent(eventId: string): Promise<void> {
  const fn = httpsCallable<{ eventId: string }, { success: boolean }>(functions, 'leaveEvent');
  await fn({ eventId });
}

/**
 * イベント参加者一覧を取得
 */
export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const fn = httpsCallable<
    { eventId: string },
    { success: boolean; participants: EventParticipant[] }
  >(functions, 'getEventParticipants');
  const result = await fn({ eventId });
  return result.data.participants;
}
