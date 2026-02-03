/**
 * 103: 団体機能 - Cloud Functions
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  GroupDoc,
  GroupMembershipDoc,
  GroupEventDoc,
  GroupEventParticipantDoc,
  GROUP_COLLECTIONS,
  GROUP_DEFAULTS,
  CreateGroupInput,
  UpdateGroupInput,
  JoinGroupInput,
  RegenerateInviteCodeInput,
  ChangeRoleInput,
  CreateEventInput,
  UpdateEventInput,
  CreateGroupResult,
  JoinGroupResult,
  JoinGroupError,
  InviteCodeResult,
  InviteInfoResult,
} from './types/group';
import {
  isGroupOwner,
  isGroupOwnerOrOrganizer,
  isGroupMember,
  getGroup,
  getUserGroups,
  getGroupMembers as fetchGroupMembers,
  validateGroupName,
  validateGroupDescription,
  incrementMemberCount,
  decrementMemberCount,
  getMembership,
} from './services/groupService';
import {
  createInvite,
  getActiveInvite,
  validateInviteCode,
  incrementJoinCount,
  revokeInvite,
  generateInviteUrl,
  getInviteInfo as fetchInviteInfo,
} from './services/inviteService';
import {
  logGroupCreate,
  logGroupUpdate,
  logMemberJoin,
  logMemberLeave,
  logMemberRemove,
  logRoleChange,
  logInviteCreate,
  logInviteRegenerate,
  logInviteRevoke,
  logEventCreate,
  logEventUpdate,
  logEventPublish,
  logEventClose,
  logEventJoin,
  logEventLeave,
} from './services/groupAuditService';

const db = admin.firestore();

// =============================================================================
// 認証ヘルパー
// =============================================================================

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
  }
  return context.auth.uid;
}

// =============================================================================
// 団体管理 (User Story 1)
// =============================================================================

/**
 * T014: 団体を作成
 */
export const createGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data: CreateGroupInput, context): Promise<CreateGroupResult> => {
    const uid = requireAuth(context);

    // バリデーション
    const nameValidation = validateGroupName(data.name);
    if (!nameValidation.valid) {
      throw new functions.https.HttpsError('invalid-argument', nameValidation.message!);
    }
    const descValidation = validateGroupDescription(data.description);
    if (!descValidation.valid) {
      throw new functions.https.HttpsError('invalid-argument', descValidation.message!);
    }

    // 団体名の重複チェック
    const trimmedName = data.name.trim();
    const existingGroups = await db
      .collection(GROUP_COLLECTIONS.GROUPS)
      .where('name', '==', trimmedName)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existingGroups.empty) {
      throw new functions.https.HttpsError('already-exists', 'この団体名は既に使用されています');
    }

    const groupRef = db.collection(GROUP_COLLECTIONS.GROUPS).doc();
    const groupId = groupRef.id;
    const now = Timestamp.now();

    // 団体ドキュメント作成
    const trimmedDescription = data.description?.trim();
    const groupDoc: GroupDoc = {
      groupId,
      name: trimmedName,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      ownerUserId: uid,
      status: 'active',
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    // メンバーシップドキュメント作成（作成者をオーナーに）
    const membershipId = `${groupId}_${uid}`;
    const membershipDoc: GroupMembershipDoc = {
      membershipId,
      groupId,
      userId: uid,
      role: 'owner',
      status: 'active',
      joinedAt: now,
    };

    // 招待コード作成
    const { inviteCode, inviteId } = await createInvite(groupId, uid);

    // バッチ書き込み
    const batch = db.batch();
    batch.set(groupRef, groupDoc);
    batch.set(db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId), membershipDoc);
    await batch.commit();

    // 監査ログ
    await logGroupCreate(uid, groupId, data.name.trim());
    await logInviteCreate(uid, groupId, inviteId);

    return {
      success: true,
      groupId,
      inviteCode,
    };
  });

/**
 * T015: 団体情報を取得
 */
export const getGroupInfo = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    const group = await getGroup(groupId);
    if (!group) {
      throw new functions.https.HttpsError('not-found', '団体が見つかりません');
    }

    // メンバーでない場合は基本情報のみ
    const isMember = await isGroupMember(uid, groupId);
    if (!isMember) {
      return {
        success: true,
        group: {
          groupId: group.groupId,
          name: group.name,
          memberCount: group.memberCount,
        },
      };
    }

    return {
      success: true,
      group,
    };
  });

/**
 * T016: 自分の所属団体一覧を取得
 */
export const getMyGroups = functions
  .region('asia-northeast1')
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);

    const groups = await getUserGroups(uid);

    return {
      success: true,
      groups: groups.map((g) => ({
        groupId: g.groupId,
        name: g.name,
        description: g.description,
        memberCount: g.memberCount,
        myRole: g.myRole,
        joinedAt: g.joinedAt.toDate(),
      })),
    };
  });

/**
 * 団体情報を更新
 */
export const updateGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data: UpdateGroupInput, context) => {
    const uid = requireAuth(context);
    const { groupId, name, description } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // 権限チェック
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', '団体オーナーのみが編集できます');
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      const nameValidation = validateGroupName(name);
      if (!nameValidation.valid) {
        throw new functions.https.HttpsError('invalid-argument', nameValidation.message!);
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      const descValidation = validateGroupDescription(description);
      if (!descValidation.valid) {
        throw new functions.https.HttpsError('invalid-argument', descValidation.message!);
      }
      updates.description = description?.trim() || null;
    }

    await db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId).update(updates);
    await logGroupUpdate(uid, groupId, updates);

    return { success: true };
  });

/**
 * 団体を削除（オーナーのみ）
 */
export const deleteGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // 権限チェック
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', '団体オーナーのみが削除できます');
    }

    // 論理削除
    await db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
      status: 'deleted',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

// =============================================================================
// 招待コード管理 (User Story 1)
// =============================================================================

/**
 * T017: 招待コードを再生成
 */
export const regenerateInviteCode = functions
  .region('asia-northeast1')
  .https.onCall(async (data: RegenerateInviteCodeInput, context): Promise<InviteCodeResult> => {
    const uid = requireAuth(context);
    const { groupId, expiresInDays, maxJoins } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // 権限チェック（オーナーのみ）
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', '招待コードの管理は団体オーナーのみが行えます');
    }

    // 既存の有効な招待を無効化
    const existingInvite = await getActiveInvite(groupId);
    const oldInviteId = existingInvite?.inviteId;
    if (existingInvite) {
      await revokeInvite(existingInvite.inviteId);
    }

    // 新しい招待コードを作成
    const finalExpiresInDays = Math.min(
      expiresInDays || GROUP_DEFAULTS.INVITE_EXPIRES_DAYS,
      GROUP_DEFAULTS.INVITE_MAX_EXPIRES_DAYS
    );
    const finalMaxJoins = Math.min(
      maxJoins || GROUP_DEFAULTS.INVITE_MAX_JOINS,
      GROUP_DEFAULTS.INVITE_MAX_MAX_JOINS
    );

    const { inviteCode, inviteId } = await createInvite(groupId, uid, finalExpiresInDays, finalMaxJoins);
    const inviteUrl = generateInviteUrl(groupId, inviteCode);

    // 監査ログ
    await logInviteRegenerate(uid, groupId, oldInviteId, inviteId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + finalExpiresInDays);

    return {
      inviteCode,
      inviteUrl,
      expiresAt,
    };
  });

/**
 * T018: 招待コードを無効化
 */
export const revokeInviteCode = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // 権限チェック（オーナーのみ）
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', '招待コードの管理は団体オーナーのみが行えます');
    }

    const existingInvite = await getActiveInvite(groupId);
    if (existingInvite) {
      await revokeInvite(existingInvite.inviteId);
      await logInviteRevoke(uid, groupId, existingInvite.inviteId);
    }

    return { success: true };
  });

/**
 * T019: 招待コードを取得（管理者用）
 */
export const getInviteCode = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context): Promise<InviteCodeResult | null> => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // 権限チェック（オーナーまたは運営）
    const canManage = await isGroupOwnerOrOrganizer(uid, groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', '招待コードの取得は団体オーナー/運営のみが行えます');
    }

    // 有効な招待コードがない場合は新規作成
    let invite = await getActiveInvite(groupId);
    let inviteCode: string;

    if (!invite) {
      const result = await createInvite(groupId, uid);
      inviteCode = result.inviteCode;
      invite = await getActiveInvite(groupId);
      await logInviteCreate(uid, groupId, result.inviteId);
    } else {
      // 注意: 既存の招待コードのplaintextは取得できない（セキュリティ上）
      // 新しいコードを生成する必要がある
      const result = await createInvite(groupId, uid);
      inviteCode = result.inviteCode;
      // 古い招待コードを無効化
      await revokeInvite(invite.inviteId);
      invite = await getActiveInvite(groupId);
    }

    if (!invite) {
      throw new functions.https.HttpsError('internal', '招待コードの作成に失敗しました');
    }

    return {
      inviteCode,
      inviteUrl: generateInviteUrl(groupId, inviteCode),
      expiresAt: invite.expiresAt.toDate(),
    };
  });

// =============================================================================
// 団体参加 (User Story 2)
// =============================================================================

/**
 * T028: 招待コードで団体に参加
 */
export const joinGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data: JoinGroupInput, context): Promise<JoinGroupResult | JoinGroupError> => {
    const uid = requireAuth(context);
    const { groupId, inviteCode } = data;

    if (!groupId || !inviteCode) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdとinviteCodeは必須です');
    }

    // 団体存在チェック
    const group = await getGroup(groupId);
    if (!group || group.status !== 'active') {
      return {
        success: false,
        errorCode: 'INVALID_CODE',
        message: '団体が見つからないか、無効です',
      };
    }

    // 招待コード検証
    const validation = await validateInviteCode(groupId, inviteCode, uid);
    if (!validation.valid) {
      return {
        success: false,
        errorCode: validation.errorCode!,
        message: validation.message!,
      };
    }

    // メンバーシップ作成
    const membershipId = `${groupId}_${uid}`;
    const membershipDoc: GroupMembershipDoc = {
      membershipId,
      groupId,
      userId: uid,
      role: 'member',
      status: 'active',
      joinedAt: Timestamp.now(),
      inviteCodeUsed: validation.inviteDoc!.inviteCodeHash,
    };

    const batch = db.batch();
    batch.set(db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId), membershipDoc);
    await batch.commit();

    // カウンター更新
    await incrementMemberCount(groupId);
    await incrementJoinCount(validation.inviteDoc!.inviteId);

    // 監査ログ
    await logMemberJoin(uid, groupId, validation.inviteDoc!.inviteCodeHash);

    return {
      success: true,
      groupId,
      groupName: group.name,
    };
  });

/**
 * T029: 招待コード情報を取得（公開）
 */
export const getInviteInfo = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context): Promise<InviteInfoResult> => {
    requireAuth(context); // 認証必須
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    const group = await getGroup(groupId);
    if (!group || group.status !== 'active') {
      return { hasValidInvite: false };
    }

    return fetchInviteInfo(groupId);
  });

// =============================================================================
// メンバー管理 (User Story 5)
// =============================================================================

/**
 * T056: 団体メンバー一覧を取得
 */
export const getGroupMembers = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // メンバーのみ閲覧可能
    const isMember = await isGroupMember(uid, groupId);
    if (!isMember) {
      throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }

    const members = await fetchGroupMembers(groupId);

    return {
      success: true,
      members: members.map((m) => ({
        userId: m.userId,
        nickname: m.nickname,
        role: m.role,
        joinedAt: m.joinedAt.toDate(),
      })),
    };
  });

/**
 * T057: メンバーのロールを変更
 */
export const changeRole = functions
  .region('asia-northeast1')
  .https.onCall(async (data: ChangeRoleInput, context) => {
    const uid = requireAuth(context);
    const { groupId, targetUserId, newRole } = data;

    if (!groupId || !targetUserId || !newRole) {
      throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }

    // 権限チェック（オーナーのみ）
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', 'ロール変更は団体オーナーのみが行えます');
    }

    // 自分自身のロールは変更不可
    if (targetUserId === uid) {
      throw new functions.https.HttpsError('invalid-argument', '自分自身のロールは変更できません');
    }

    // オーナーに変更する場合、現オーナーをorganizerに降格
    if (newRole === 'owner') {
      const batch = db.batch();

      // 新オーナーをownerに
      const targetMembershipId = `${groupId}_${targetUserId}`;
      batch.update(db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId), {
        role: 'owner',
      });

      // 現オーナーをorganizerに
      const currentMembershipId = `${groupId}_${uid}`;
      batch.update(db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(currentMembershipId), {
        role: 'organizer',
      });

      // 団体ドキュメントも更新
      batch.update(db.collection(GROUP_COLLECTIONS.GROUPS).doc(groupId), {
        ownerUserId: targetUserId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      await logRoleChange(uid, groupId, targetUserId, 'member/organizer', 'owner');
      await logRoleChange(uid, groupId, uid, 'owner', 'organizer');
    } else {
      // 通常のロール変更
      const targetMembership = await getMembership(targetUserId, groupId);
      if (!targetMembership || targetMembership.status !== 'active') {
        throw new functions.https.HttpsError('not-found', '対象メンバーが見つかりません');
      }

      // オーナーは他のロールに変更できない（オーナー譲渡以外）
      if (targetMembership.role === 'owner') {
        throw new functions.https.HttpsError('invalid-argument', 'オーナーのロールは直接変更できません。オーナー譲渡を使用してください');
      }

      const targetMembershipId = `${groupId}_${targetUserId}`;
      await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId).update({
        role: newRole,
      });

      await logRoleChange(uid, groupId, targetUserId, targetMembership.role, newRole);
    }

    return { success: true };
  });

/**
 * T058: メンバーを除名
 */
export const removeMember = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string; targetUserId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId, targetUserId } = data;

    if (!groupId || !targetUserId) {
      throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }

    // 権限チェック（オーナーのみ）
    const isOwner = await isGroupOwner(uid, groupId);
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', '除名は団体オーナーのみが行えます');
    }

    // 自分自身は除名不可
    if (targetUserId === uid) {
      throw new functions.https.HttpsError('invalid-argument', '自分自身を除名することはできません');
    }

    const targetMembership = await getMembership(targetUserId, groupId);
    if (!targetMembership || targetMembership.status !== 'active') {
      throw new functions.https.HttpsError('not-found', '対象メンバーが見つかりません');
    }

    // オーナーは除名できない
    if (targetMembership.role === 'owner') {
      throw new functions.https.HttpsError('invalid-argument', 'オーナーは除名できません');
    }

    const targetMembershipId = `${groupId}_${targetUserId}`;
    await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId).update({
      status: 'left',
      leftAt: FieldValue.serverTimestamp(),
    });

    await decrementMemberCount(groupId);
    await logMemberRemove(uid, groupId, targetUserId);

    return { success: true };
  });

/**
 * T059: 団体から退会
 */
export const leaveGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string }, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    const membership = await getMembership(uid, groupId);
    if (!membership || membership.status !== 'active') {
      throw new functions.https.HttpsError('not-found', 'メンバーシップが見つかりません');
    }

    // オーナーは退会不可（先に譲渡が必要）
    if (membership.role === 'owner') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'オーナーは退会できません。先にオーナー権限を譲渡してください'
      );
    }

    const membershipId = `${groupId}_${uid}`;
    await db.collection(GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).update({
      status: 'left',
      leftAt: FieldValue.serverTimestamp(),
    });

    await decrementMemberCount(groupId);
    await logMemberLeave(uid, groupId);

    return { success: true };
  });

// =============================================================================
// イベント管理 (User Story 3)
// =============================================================================

/**
 * T034: イベントを作成
 */
export const createEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: CreateEventInput, context) => {
    const uid = requireAuth(context);
    const { groupId, title, description, startAt, endAt, visibility } = data;

    if (!groupId || !title || !startAt || !endAt) {
      throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }

    // 権限チェック（オーナーまたは運営）
    const canManage = await isGroupOwnerOrOrganizer(uid, groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', 'イベント作成は団体オーナー/運営のみが行えます');
    }

    // タイトルバリデーション
    if (title.length < GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH || title.length > GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH) {
      throw new functions.https.HttpsError('invalid-argument', `タイトルは${GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH}〜${GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH}文字で入力してください`);
    }

    if (description && description.length > GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH) {
      throw new functions.https.HttpsError('invalid-argument', `説明は${GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
    }

    const eventRef = db.collection(GROUP_COLLECTIONS.EVENTS).doc();
    const eventId = eventRef.id;
    const now = Timestamp.now();

    const eventDoc: GroupEventDoc = {
      eventId,
      groupId,
      title: title.trim(),
      description: description?.trim(),
      startAt: Timestamp.fromDate(new Date(startAt)),
      endAt: Timestamp.fromDate(new Date(endAt)),
      isOfficial: false, // デフォルトは非公式
      visibility: visibility || 'group_only',
      status: 'draft',
      participantCount: 0,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await eventRef.set(eventDoc);
    await logEventCreate(uid, groupId, eventId, title.trim());

    return {
      success: true,
      eventId,
    };
  });

/**
 * T035: イベントを更新
 */
export const updateEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: UpdateEventInput, context) => {
    const uid = requireAuth(context);
    const { eventId, title, description, startAt, endAt, visibility } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // 権限チェック
    const canManage = await isGroupOwnerOrOrganizer(uid, event.groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', 'イベント編集は団体オーナー/運営のみが行えます');
    }

    // 終了済みイベントは編集不可
    if (event.status === 'closed') {
      throw new functions.https.HttpsError('failed-precondition', '終了したイベントは編集できません');
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) {
      if (title.length < GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH || title.length > GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH) {
        throw new functions.https.HttpsError('invalid-argument', `タイトルは${GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH}〜${GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH}文字で入力してください`);
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (description && description.length > GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH) {
        throw new functions.https.HttpsError('invalid-argument', `説明は${GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
      }
      updates.description = description?.trim() || null;
    }

    if (startAt !== undefined) {
      updates.startAt = Timestamp.fromDate(new Date(startAt));
    }

    if (endAt !== undefined) {
      updates.endAt = Timestamp.fromDate(new Date(endAt));
    }

    if (visibility !== undefined) {
      updates.visibility = visibility;
    }

    await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).update(updates);
    await logEventUpdate(uid, event.groupId, eventId, updates);

    return { success: true };
  });

/**
 * T036: イベントを公開
 */
export const publishEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // 権限チェック
    const canManage = await isGroupOwnerOrOrganizer(uid, event.groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', 'イベント公開は団体オーナー/運営のみが行えます');
    }

    if (event.status !== 'draft') {
      throw new functions.https.HttpsError('failed-precondition', 'ドラフト状態のイベントのみ公開できます');
    }

    await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
      status: 'published',
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logEventPublish(uid, event.groupId, eventId);

    return { success: true };
  });

/**
 * イベントを非公開に戻す
 */
export const unpublishEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // 権限チェック
    const canManage = await isGroupOwnerOrOrganizer(uid, event.groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', 'イベント管理は団体オーナー/運営のみが行えます');
    }

    if (event.status !== 'published') {
      throw new functions.https.HttpsError('failed-precondition', '公開中のイベントのみ非公開にできます');
    }

    await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
      status: 'draft',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

/**
 * T037: イベントを終了
 */
export const closeEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // 権限チェック
    const canManage = await isGroupOwnerOrOrganizer(uid, event.groupId);
    if (!canManage) {
      throw new functions.https.HttpsError('permission-denied', 'イベント終了は団体オーナー/運営のみが行えます');
    }

    if (event.status === 'closed') {
      throw new functions.https.HttpsError('failed-precondition', 'すでに終了しています');
    }

    await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
      status: 'closed',
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logEventClose(uid, event.groupId, eventId);

    return { success: true };
  });

/**
 * T038: 団体のイベント一覧を取得
 */
export const getGroupEvents = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { groupId: string; status?: 'draft' | 'published' | 'closed' | 'all' }, context) => {
    const uid = requireAuth(context);
    const { groupId, status } = data;

    if (!groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }

    // メンバーのみ閲覧可能
    const isMember = await isGroupMember(uid, groupId);
    if (!isMember) {
      throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }

    let query = db
      .collection(GROUP_COLLECTIONS.EVENTS)
      .where('groupId', '==', groupId)
      .orderBy('startAt', 'desc');

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.limit(50).get();

    return {
      success: true,
      events: snap.docs.map((doc) => {
        const e = doc.data() as GroupEventDoc;
        return {
          eventId: e.eventId,
          groupId: e.groupId,
          title: e.title,
          description: e.description,
          startAt: e.startAt.toDate(),
          endAt: e.endAt.toDate(),
          isOfficial: e.isOfficial,
          visibility: e.visibility,
          status: e.status,
          participantCount: e.participantCount,
          createdBy: e.createdBy,
        };
      }),
    };
  });

/**
 * T039: イベントに参加
 */
export const joinEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // メンバーのみ参加可能
    const isMember = await isGroupMember(uid, event.groupId);
    if (!isMember) {
      throw new functions.https.HttpsError('permission-denied', '団体メンバーのみが参加できます');
    }

    // 公開中のイベントのみ参加可能
    if (event.status !== 'published') {
      throw new functions.https.HttpsError('failed-precondition', '公開中のイベントのみ参加できます');
    }

    // 既に参加済みかチェック
    const participantId = `${eventId}_${uid}`;
    const existingDoc = await db.collection(GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId).get();
    if (existingDoc.exists) {
      throw new functions.https.HttpsError('already-exists', 'すでに参加しています');
    }

    const participantDoc: GroupEventParticipantDoc = {
      participantId,
      eventId,
      groupId: event.groupId,
      userId: uid,
      joinedAt: Timestamp.now(),
    };

    const batch = db.batch();
    batch.set(db.collection(GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId), participantDoc);
    batch.update(db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId), {
      participantCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await logEventJoin(uid, event.groupId, eventId);

    return { success: true };
  });

/**
 * T040: イベント参加をキャンセル
 */
export const leaveEvent = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // 終了済みイベントは退出不可
    if (event.status === 'closed') {
      throw new functions.https.HttpsError('failed-precondition', '終了したイベントからは退出できません');
    }

    const participantId = `${eventId}_${uid}`;
    const participantDoc = await db.collection(GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId).get();
    if (!participantDoc.exists) {
      throw new functions.https.HttpsError('not-found', '参加していません');
    }

    const batch = db.batch();
    batch.delete(db.collection(GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId));
    batch.update(db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId), {
      participantCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await logEventLeave(uid, event.groupId, eventId);

    return { success: true };
  });

/**
 * T041: イベント参加者一覧を取得
 */
export const getEventParticipants = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { eventId: string }, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }

    const eventDoc = await db.collection(GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }

    const event = eventDoc.data() as GroupEventDoc;

    // メンバーのみ閲覧可能
    const isMember = await isGroupMember(uid, event.groupId);
    if (!isMember) {
      throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }

    const snap = await db
      .collection(GROUP_COLLECTIONS.EVENT_PARTICIPANTS)
      .where('eventId', '==', eventId)
      .orderBy('joinedAt', 'asc')
      .get();

    const participants: { userId: string; nickname: string; joinedAt: Date }[] = [];

    for (const doc of snap.docs) {
      const p = doc.data() as GroupEventParticipantDoc;
      const userDoc = await db.collection('users').doc(p.userId).get();
      const nickname = userDoc.exists ? (userDoc.data()?.nickname || '名無し') : '名無し';

      participants.push({
        userId: p.userId,
        nickname,
        joinedAt: p.joinedAt.toDate(),
      });
    }

    return {
      success: true,
      participants,
    };
  });
