/**
 * 103: 団体機能 - グループサービス
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  GroupDoc,
  GroupMembershipDoc,
  GroupRole,
  GROUP_COLLECTIONS,
  GROUP_DEFAULTS,
} from '../types/group';

const db = admin.firestore();

/**
 * 権限チェック：指定ロールを持つか確認
 */
export async function checkGroupPermission(
  uid: string,
  groupId: string,
  requiredRoles: GroupRole[]
): Promise<boolean> {
  const membershipId = `${groupId}_${uid}`;
  const doc = await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();

  if (!doc.exists) return false;

  const data = doc.data() as GroupMembershipDoc;
  return data.status === 'active' && requiredRoles.includes(data.role);
}

/**
 * 団体オーナーか確認
 */
export async function isGroupOwner(uid: string, groupId: string): Promise<boolean> {
  return checkGroupPermission(uid, groupId, ['owner']);
}

/**
 * 団体オーナーまたは運営か確認
 */
export async function isGroupOwnerOrOrganizer(uid: string, groupId: string): Promise<boolean> {
  return checkGroupPermission(uid, groupId, ['owner', 'organizer']);
}

/**
 * 団体メンバーか確認
 */
export async function isGroupMember(uid: string, groupId: string): Promise<boolean> {
  return checkGroupPermission(uid, groupId, ['owner', 'organizer', 'member']);
}

/**
 * メンバーシップを取得
 */
export async function getMembership(
  uid: string,
  groupId: string
): Promise<GroupMembershipDoc | null> {
  const membershipId = `${groupId}_${uid}`;
  const doc = await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();

  if (!doc.exists) return null;
  return doc.data() as GroupMembershipDoc;
}

/**
 * 団体を取得
 */
export async function getGroup(groupId: string): Promise<GroupDoc | null> {
  const doc = await db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId).get();

  if (!doc.exists) return null;
  return doc.data() as GroupDoc;
}

/**
 * ユーザーの所属団体一覧を取得
 */
export async function getUserGroups(uid: string): Promise<(GroupDoc & { myRole: GroupRole; joinedAt: Timestamp })[]> {
  const membershipsSnap = await db
    .collection(GROUP_COLLECTIONS.MEMBERSHIPS)
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .get();

  if (membershipsSnap.empty) return [];

  const results: (GroupDoc & { myRole: GroupRole; joinedAt: Timestamp })[] = [];

  for (const memberDoc of membershipsSnap.docs) {
    const membership = memberDoc.data() as GroupMembershipDoc;
    const groupDoc = await db.collection(GROUP_COLLECTIONS.GROUPS).doc(membership.groupId).get();

    if (groupDoc.exists) {
      const group = groupDoc.data() as GroupDoc;
      if (group.status === 'active') {
        results.push({
          ...group,
          myRole: membership.role,
          joinedAt: membership.joinedAt,
        });
      }
    }
  }

  return results;
}

/**
 * 団体のメンバー一覧を取得
 */
export async function getGroupMembers(
  groupId: string
): Promise<{ userId: string; role: GroupRole; joinedAt: Timestamp; nickname: string }[]> {
  const membershipsSnap = await db
    .collection(GROUP_COLLECTIONS.MEMBERSHIPS)
    .where('groupId', '==', groupId)
    .where('status', '==', 'active')
    .get();

  if (membershipsSnap.empty) return [];

  const results: { userId: string; role: GroupRole; joinedAt: Timestamp; nickname: string }[] = [];

  for (const doc of membershipsSnap.docs) {
    const membership = doc.data() as GroupMembershipDoc;
    // ユーザー情報を取得
    const userDoc = await db.collection('users').doc(membership.userId).get();
    const nickname = userDoc.exists ? (userDoc.data()?.nickname || '名無し') : '名無し';

    results.push({
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.joinedAt,
      nickname,
    });
  }

  // ownerを先頭、その後organizer、memberの順
  const roleOrder: Record<GroupRole, number> = { owner: 0, organizer: 1, member: 2 };
  results.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  return results;
}

/**
 * 団体名のバリデーション
 */
export function validateGroupName(name: string): { valid: boolean; message?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: '団体名は必須です' };
  }
  const trimmed = name.trim();
  if (trimmed.length < GROUP_DEFAULTS.NAME_MIN_LENGTH) {
    return { valid: false, message: '団体名を入力してください' };
  }
  if (trimmed.length > GROUP_DEFAULTS.NAME_MAX_LENGTH) {
    return { valid: false, message: `団体名は${GROUP_DEFAULTS.NAME_MAX_LENGTH}文字以内で入力してください` };
  }
  return { valid: true };
}

/**
 * 団体説明のバリデーション
 */
export function validateGroupDescription(description?: string): { valid: boolean; message?: string } {
  if (!description) return { valid: true };
  if (description.length > GROUP_DEFAULTS.DESCRIPTION_MAX_LENGTH) {
    return { valid: false, message: `説明は${GROUP_DEFAULTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください` };
  }
  return { valid: true };
}

/**
 * メンバー数をインクリメント
 */
export async function incrementMemberCount(groupId: string): Promise<void> {
  await db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
    memberCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * メンバー数をデクリメント
 */
export async function decrementMemberCount(groupId: string): Promise<void> {
  await db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
    memberCount: FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
