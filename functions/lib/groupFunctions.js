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
exports.getEventParticipants = exports.leaveEvent = exports.joinEvent = exports.getGroupEvents = exports.rejectEvent = exports.closeEvent = exports.unpublishEvent = exports.publishEvent = exports.updateEvent = exports.createEvent = exports.leaveGroup = exports.removeMember = exports.changeRole = exports.getGroupMembers = exports.getInviteInfo = exports.joinGroup = exports.getInviteCode = exports.revokeInviteCode = exports.regenerateInviteCode = exports.deleteGroup = exports.updateGroup = exports.getMyGroups = exports.getGroupInfo = exports.createGroup = void 0;
/**
 * 103: 団体機能 - Cloud Functions
 */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const group_1 = require("./types/group");
const groupService_1 = require("./services/groupService");
const inviteService_1 = require("./services/inviteService");
const groupAuditService_1 = require("./services/groupAuditService");
const db = admin.firestore();
// =============================================================================
// 認証ヘルパー
// =============================================================================
function requireAuth(context) {
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
exports.createGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    // バリデーション
    const nameValidation = (0, groupService_1.validateGroupName)(data.name);
    if (!nameValidation.valid) {
        throw new functions.https.HttpsError('invalid-argument', nameValidation.message);
    }
    const descValidation = (0, groupService_1.validateGroupDescription)(data.description);
    if (!descValidation.valid) {
        throw new functions.https.HttpsError('invalid-argument', descValidation.message);
    }
    // 団体名の重複チェック
    const trimmedName = data.name.trim();
    const existingGroups = await db
        .collection(group_1.GROUP_COLLECTIONS.GROUPS)
        .where('name', '==', trimmedName)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    if (!existingGroups.empty) {
        throw new functions.https.HttpsError('already-exists', 'この団体名は既に使用されています');
    }
    const groupRef = db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc();
    const groupId = groupRef.id;
    const now = firestore_1.Timestamp.now();
    // 団体ドキュメント作成
    const trimmedDescription = data.description?.trim();
    const groupDoc = {
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
    const membershipDoc = {
        membershipId,
        groupId,
        userId: uid,
        role: 'owner',
        status: 'active',
        joinedAt: now,
    };
    // 招待コード作成
    const { inviteCode, inviteId } = await (0, inviteService_1.createInvite)(groupId, uid);
    // バッチ書き込み
    const batch = db.batch();
    batch.set(groupRef, groupDoc);
    batch.set(db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId), membershipDoc);
    await batch.commit();
    // 監査ログ
    await (0, groupAuditService_1.logGroupCreate)(uid, groupId, data.name.trim());
    await (0, groupAuditService_1.logInviteCreate)(uid, groupId, inviteId);
    return {
        success: true,
        groupId,
        inviteCode,
    };
});
/**
 * T015: 団体情報を取得
 */
exports.getGroupInfo = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    const group = await (0, groupService_1.getGroup)(groupId);
    if (!group) {
        throw new functions.https.HttpsError('not-found', '団体が見つかりません');
    }
    // メンバーでない場合は基本情報のみ
    const isMember = await (0, groupService_1.isGroupMember)(uid, groupId);
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
exports.getMyGroups = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const groups = await (0, groupService_1.getUserGroups)(uid);
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
exports.updateGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, name, description } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // 権限チェック
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '団体オーナーのみが編集できます');
    }
    const updates = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (name !== undefined) {
        const nameValidation = (0, groupService_1.validateGroupName)(name);
        if (!nameValidation.valid) {
            throw new functions.https.HttpsError('invalid-argument', nameValidation.message);
        }
        updates.name = name.trim();
    }
    if (description !== undefined) {
        const descValidation = (0, groupService_1.validateGroupDescription)(description);
        if (!descValidation.valid) {
            throw new functions.https.HttpsError('invalid-argument', descValidation.message);
        }
        updates.description = description?.trim() || null;
    }
    await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId).update(updates);
    await (0, groupAuditService_1.logGroupUpdate)(uid, groupId, updates);
    return { success: true };
});
/**
 * 団体を削除（オーナーのみ）
 */
exports.deleteGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // 権限チェック
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '団体オーナーのみが削除できます');
    }
    // 論理削除
    await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
        status: 'deleted',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// =============================================================================
// 招待コード管理 (User Story 1)
// =============================================================================
/**
 * T017: 招待コードを再生成
 */
exports.regenerateInviteCode = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, expiresInDays, maxJoins } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // 権限チェック（オーナーのみ）
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '招待コードの管理は団体オーナーのみが行えます');
    }
    // 既存の有効な招待を無効化
    const existingInvite = await (0, inviteService_1.getActiveInvite)(groupId);
    const oldInviteId = existingInvite?.inviteId;
    if (existingInvite) {
        await (0, inviteService_1.revokeInvite)(existingInvite.inviteId);
    }
    // 新しい招待コードを作成
    const finalExpiresInDays = Math.min(expiresInDays || group_1.GROUP_DEFAULTS.INVITE_EXPIRES_DAYS, group_1.GROUP_DEFAULTS.INVITE_MAX_EXPIRES_DAYS);
    const finalMaxJoins = Math.min(maxJoins || group_1.GROUP_DEFAULTS.INVITE_MAX_JOINS, group_1.GROUP_DEFAULTS.INVITE_MAX_MAX_JOINS);
    const { inviteCode, inviteId } = await (0, inviteService_1.createInvite)(groupId, uid, finalExpiresInDays, finalMaxJoins);
    const inviteUrl = (0, inviteService_1.generateInviteUrl)(groupId, inviteCode);
    // 監査ログ
    await (0, groupAuditService_1.logInviteRegenerate)(uid, groupId, oldInviteId, inviteId);
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
exports.revokeInviteCode = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // 権限チェック（オーナーのみ）
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '招待コードの管理は団体オーナーのみが行えます');
    }
    const existingInvite = await (0, inviteService_1.getActiveInvite)(groupId);
    if (existingInvite) {
        await (0, inviteService_1.revokeInvite)(existingInvite.inviteId);
        await (0, groupAuditService_1.logInviteRevoke)(uid, groupId, existingInvite.inviteId);
    }
    return { success: true };
});
/**
 * T019: 招待コードを取得（管理者用）
 */
exports.getInviteCode = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // 権限チェック（オーナーまたは運営）
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', '招待コードの取得は団体オーナー/運営のみが行えます');
    }
    // 有効な招待コードがない場合は新規作成
    let invite = await (0, inviteService_1.getActiveInvite)(groupId);
    let inviteCode;
    if (!invite) {
        const result = await (0, inviteService_1.createInvite)(groupId, uid);
        inviteCode = result.inviteCode;
        invite = await (0, inviteService_1.getActiveInvite)(groupId);
        await (0, groupAuditService_1.logInviteCreate)(uid, groupId, result.inviteId);
    }
    else {
        // 注意: 既存の招待コードのplaintextは取得できない（セキュリティ上）
        // 新しいコードを生成する必要がある
        const result = await (0, inviteService_1.createInvite)(groupId, uid);
        inviteCode = result.inviteCode;
        // 古い招待コードを無効化
        await (0, inviteService_1.revokeInvite)(invite.inviteId);
        invite = await (0, inviteService_1.getActiveInvite)(groupId);
    }
    if (!invite) {
        throw new functions.https.HttpsError('internal', '招待コードの作成に失敗しました');
    }
    return {
        inviteCode,
        inviteUrl: (0, inviteService_1.generateInviteUrl)(groupId, inviteCode),
        expiresAt: invite.expiresAt.toDate(),
    };
});
// =============================================================================
// 団体参加 (User Story 2)
// =============================================================================
/**
 * T028: 招待コードで団体に参加
 */
exports.joinGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, inviteCode } = data;
    if (!groupId || !inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdとinviteCodeは必須です');
    }
    // 団体存在チェック
    const group = await (0, groupService_1.getGroup)(groupId);
    if (!group || group.status !== 'active') {
        return {
            success: false,
            errorCode: 'INVALID_CODE',
            message: '団体が見つからないか、無効です',
        };
    }
    // 招待コード検証
    const validation = await (0, inviteService_1.validateInviteCode)(groupId, inviteCode, uid);
    if (!validation.valid) {
        return {
            success: false,
            errorCode: validation.errorCode,
            message: validation.message,
        };
    }
    // メンバーシップ作成
    const membershipId = `${groupId}_${uid}`;
    const membershipDoc = {
        membershipId,
        groupId,
        userId: uid,
        role: 'member',
        status: 'active',
        joinedAt: firestore_1.Timestamp.now(),
        inviteCodeUsed: validation.inviteDoc.inviteCodeHash,
    };
    const batch = db.batch();
    batch.set(db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId), membershipDoc);
    await batch.commit();
    // カウンター更新
    await (0, groupService_1.incrementMemberCount)(groupId);
    await (0, inviteService_1.incrementJoinCount)(validation.inviteDoc.inviteId);
    // 監査ログ
    await (0, groupAuditService_1.logMemberJoin)(uid, groupId, validation.inviteDoc.inviteCodeHash);
    return {
        success: true,
        groupId,
        groupName: group.name,
    };
});
/**
 * T029: 招待コード情報を取得（公開）
 */
exports.getInviteInfo = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    requireAuth(context); // 認証必須
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    const group = await (0, groupService_1.getGroup)(groupId);
    if (!group || group.status !== 'active') {
        return { hasValidInvite: false };
    }
    return (0, inviteService_1.getInviteInfo)(groupId);
});
// =============================================================================
// メンバー管理 (User Story 5)
// =============================================================================
/**
 * T056: 団体メンバー一覧を取得
 */
exports.getGroupMembers = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // メンバーのみ閲覧可能
    const isMember = await (0, groupService_1.isGroupMember)(uid, groupId);
    if (!isMember) {
        throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }
    const members = await (0, groupService_1.getGroupMembers)(groupId);
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
exports.changeRole = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, targetUserId, newRole } = data;
    if (!groupId || !targetUserId || !newRole) {
        throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }
    // 権限チェック（オーナーのみ）
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
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
        batch.update(db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId), {
            role: 'owner',
        });
        // 現オーナーをorganizerに
        const currentMembershipId = `${groupId}_${uid}`;
        batch.update(db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(currentMembershipId), {
            role: 'organizer',
        });
        // 団体ドキュメントも更新
        batch.update(db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId), {
            ownerUserId: targetUserId,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await batch.commit();
        await (0, groupAuditService_1.logRoleChange)(uid, groupId, targetUserId, 'member/organizer', 'owner');
        await (0, groupAuditService_1.logRoleChange)(uid, groupId, uid, 'owner', 'organizer');
    }
    else {
        // 通常のロール変更
        const targetMembership = await (0, groupService_1.getMembership)(targetUserId, groupId);
        if (!targetMembership || targetMembership.status !== 'active') {
            throw new functions.https.HttpsError('not-found', '対象メンバーが見つかりません');
        }
        // オーナーは他のロールに変更できない（オーナー譲渡以外）
        if (targetMembership.role === 'owner') {
            throw new functions.https.HttpsError('invalid-argument', 'オーナーのロールは直接変更できません。オーナー譲渡を使用してください');
        }
        const targetMembershipId = `${groupId}_${targetUserId}`;
        await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId).update({
            role: newRole,
        });
        await (0, groupAuditService_1.logRoleChange)(uid, groupId, targetUserId, targetMembership.role, newRole);
    }
    return { success: true };
});
/**
 * T058: メンバーを除名
 */
exports.removeMember = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, targetUserId } = data;
    if (!groupId || !targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }
    // 権限チェック（オーナーのみ）
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '除名は団体オーナーのみが行えます');
    }
    // 自分自身は除名不可
    if (targetUserId === uid) {
        throw new functions.https.HttpsError('invalid-argument', '自分自身を除名することはできません');
    }
    const targetMembership = await (0, groupService_1.getMembership)(targetUserId, groupId);
    if (!targetMembership || targetMembership.status !== 'active') {
        throw new functions.https.HttpsError('not-found', '対象メンバーが見つかりません');
    }
    // オーナーは除名できない
    if (targetMembership.role === 'owner') {
        throw new functions.https.HttpsError('invalid-argument', 'オーナーは除名できません');
    }
    const targetMembershipId = `${groupId}_${targetUserId}`;
    await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(targetMembershipId).update({
        status: 'left',
        leftAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, groupService_1.decrementMemberCount)(groupId);
    await (0, groupAuditService_1.logMemberRemove)(uid, groupId, targetUserId);
    return { success: true };
});
/**
 * T059: 団体から退会
 */
exports.leaveGroup = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    const membership = await (0, groupService_1.getMembership)(uid, groupId);
    if (!membership || membership.status !== 'active') {
        throw new functions.https.HttpsError('not-found', 'メンバーシップが見つかりません');
    }
    // オーナーは退会不可（先に譲渡が必要）
    if (membership.role === 'owner') {
        throw new functions.https.HttpsError('failed-precondition', 'オーナーは退会できません。先にオーナー権限を譲渡してください');
    }
    const membershipId = `${groupId}_${uid}`;
    await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).update({
        status: 'left',
        leftAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, groupService_1.decrementMemberCount)(groupId);
    await (0, groupAuditService_1.logMemberLeave)(uid, groupId);
    return { success: true };
});
// =============================================================================
// イベント管理 (User Story 3)
// =============================================================================
/**
 * T034: イベントを作成
 */
exports.createEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, title, description, startAt, endAt, visibility } = data;
    if (!groupId || !title || !startAt || !endAt) {
        throw new functions.https.HttpsError('invalid-argument', 'パラメータが不足しています');
    }
    // 権限チェック（オーナーまたは運営）
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', 'イベント作成は団体オーナー/運営のみが行えます');
    }
    // タイトルバリデーション
    if (title.length < group_1.GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH || title.length > group_1.GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH) {
        throw new functions.https.HttpsError('invalid-argument', `タイトルは${group_1.GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH}〜${group_1.GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH}文字で入力してください`);
    }
    if (description && description.length > group_1.GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH) {
        throw new functions.https.HttpsError('invalid-argument', `説明は${group_1.GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
    }
    const eventRef = db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc();
    const eventId = eventRef.id;
    const now = firestore_1.Timestamp.now();
    const eventDoc = {
        eventId,
        groupId,
        title: title.trim(),
        description: description?.trim(),
        startAt: firestore_1.Timestamp.fromDate(new Date(startAt)),
        endAt: firestore_1.Timestamp.fromDate(new Date(endAt)),
        isOfficial: false, // デフォルトは非公式
        visibility: visibility || 'group_only',
        status: 'draft',
        participantCount: 0,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
    };
    await eventRef.set(eventDoc);
    await (0, groupAuditService_1.logEventCreate)(uid, groupId, eventId, title.trim());
    return {
        success: true,
        eventId,
    };
});
/**
 * T035: イベントを更新
 */
exports.updateEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId, title, description, startAt, endAt, visibility } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // 権限チェック
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, event.groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', 'イベント編集は団体オーナー/運営のみが行えます');
    }
    // 終了済みイベントは編集不可
    if (event.status === 'closed') {
        throw new functions.https.HttpsError('failed-precondition', '終了したイベントは編集できません');
    }
    const updates = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (title !== undefined) {
        if (title.length < group_1.GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH || title.length > group_1.GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH) {
            throw new functions.https.HttpsError('invalid-argument', `タイトルは${group_1.GROUP_DEFAULTS.EVENT_TITLE_MIN_LENGTH}〜${group_1.GROUP_DEFAULTS.EVENT_TITLE_MAX_LENGTH}文字で入力してください`);
        }
        updates.title = title.trim();
    }
    if (description !== undefined) {
        if (description && description.length > group_1.GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH) {
            throw new functions.https.HttpsError('invalid-argument', `説明は${group_1.GROUP_DEFAULTS.EVENT_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
        }
        updates.description = description?.trim() || null;
    }
    if (startAt !== undefined) {
        updates.startAt = firestore_1.Timestamp.fromDate(new Date(startAt));
    }
    if (endAt !== undefined) {
        updates.endAt = firestore_1.Timestamp.fromDate(new Date(endAt));
    }
    if (visibility !== undefined) {
        updates.visibility = visibility;
    }
    await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).update(updates);
    await (0, groupAuditService_1.logEventUpdate)(uid, event.groupId, eventId, updates);
    return { success: true };
});
/**
 * T036: イベントを公開
 */
exports.publishEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // 権限チェック
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, event.groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', 'イベント公開は団体オーナー/運営のみが行えます');
    }
    if (event.status !== 'draft') {
        throw new functions.https.HttpsError('failed-precondition', 'ドラフト状態のイベントのみ公開できます');
    }
    await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
        status: 'published',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, groupAuditService_1.logEventPublish)(uid, event.groupId, eventId);
    return { success: true };
});
/**
 * イベントを非公開に戻す
 */
exports.unpublishEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // 権限チェック
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, event.groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', 'イベント管理は団体オーナー/運営のみが行えます');
    }
    if (event.status !== 'published') {
        throw new functions.https.HttpsError('failed-precondition', '公開中のイベントのみ非公開にできます');
    }
    await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
        status: 'draft',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * T037: イベントを終了
 */
exports.closeEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // 権限チェック
    const canManage = await (0, groupService_1.isGroupOwnerOrOrganizer)(uid, event.groupId);
    if (!canManage) {
        throw new functions.https.HttpsError('permission-denied', 'イベント終了は団体オーナー/運営のみが行えます');
    }
    if (event.status === 'closed') {
        throw new functions.https.HttpsError('failed-precondition', 'すでに終了しています');
    }
    await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
        status: 'closed',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, groupAuditService_1.logEventClose)(uid, event.groupId, eventId);
    return { success: true };
});
/**
 * 104: 集いを却下（主宰者のみ、draft→rejected）
 */
exports.rejectEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId, groupId } = data;
    if (!eventId || !groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdとgroupIdは必須です');
    }
    // 権限チェック（主宰者のみ）
    const isOwner = await (0, groupService_1.isGroupOwner)(uid, groupId);
    if (!isOwner) {
        throw new functions.https.HttpsError('permission-denied', '集いの却下は主宰者のみが行えます');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', '集いが見つかりません');
    }
    const event = eventDoc.data();
    // groupIdの一致チェック
    if (event.groupId !== groupId) {
        throw new functions.https.HttpsError('not-found', '集いが見つかりません');
    }
    // draft状態のみ却下可能
    if (event.status !== 'draft') {
        throw new functions.https.HttpsError('failed-precondition', '下書き状態の集いのみ却下できます');
    }
    await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).update({
        status: 'rejected',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, groupAuditService_1.logEventReject)(uid, groupId, eventId);
    return { success: true };
});
/**
 * T038: 団体のイベント一覧を取得
 */
exports.getGroupEvents = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { groupId, status } = data;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'groupIdは必須です');
    }
    // メンバーのみ閲覧可能
    const isMember = await (0, groupService_1.isGroupMember)(uid, groupId);
    if (!isMember) {
        throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }
    let query = db
        .collection(group_1.GROUP_COLLECTIONS.EVENTS)
        .where('groupId', '==', groupId)
        .orderBy('startAt', 'desc');
    if (status && status !== 'all') {
        query = query.where('status', '==', status);
    }
    const snap = await query.limit(50).get();
    return {
        success: true,
        events: snap.docs.map((doc) => {
            const e = doc.data();
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
exports.joinEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // メンバーのみ参加可能
    const isMember = await (0, groupService_1.isGroupMember)(uid, event.groupId);
    if (!isMember) {
        throw new functions.https.HttpsError('permission-denied', '団体メンバーのみが参加できます');
    }
    // 公開中のイベントのみ参加可能
    if (event.status !== 'published') {
        throw new functions.https.HttpsError('failed-precondition', '公開中のイベントのみ参加できます');
    }
    // 既に参加済みかチェック
    const participantId = `${eventId}_${uid}`;
    const existingDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId).get();
    if (existingDoc.exists) {
        throw new functions.https.HttpsError('already-exists', 'すでに参加しています');
    }
    const participantDoc = {
        participantId,
        eventId,
        groupId: event.groupId,
        userId: uid,
        joinedAt: firestore_1.Timestamp.now(),
    };
    const batch = db.batch();
    batch.set(db.collection(group_1.GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId), participantDoc);
    batch.update(db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId), {
        participantCount: firestore_1.FieldValue.increment(1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    await (0, groupAuditService_1.logEventJoin)(uid, event.groupId, eventId);
    return { success: true };
});
/**
 * T040: イベント参加をキャンセル
 */
exports.leaveEvent = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // 終了済みイベントは退出不可
    if (event.status === 'closed') {
        throw new functions.https.HttpsError('failed-precondition', '終了したイベントからは退出できません');
    }
    const participantId = `${eventId}_${uid}`;
    const participantDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId).get();
    if (!participantDoc.exists) {
        throw new functions.https.HttpsError('not-found', '参加していません');
    }
    const batch = db.batch();
    batch.delete(db.collection(group_1.GROUP_COLLECTIONS.EVENT_PARTICIPANTS).doc(participantId));
    batch.update(db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId), {
        participantCount: firestore_1.FieldValue.increment(-1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    await (0, groupAuditService_1.logEventLeave)(uid, event.groupId, eventId);
    return { success: true };
});
/**
 * T041: イベント参加者一覧を取得
 */
exports.getEventParticipants = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'eventIdは必須です');
    }
    const eventDoc = await db.collection(group_1.GROUP_COLLECTIONS.EVENTS).doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'イベントが見つかりません');
    }
    const event = eventDoc.data();
    // メンバーのみ閲覧可能
    const isMember = await (0, groupService_1.isGroupMember)(uid, event.groupId);
    if (!isMember) {
        throw new functions.https.HttpsError('permission-denied', 'メンバーのみが閲覧できます');
    }
    const snap = await db
        .collection(group_1.GROUP_COLLECTIONS.EVENT_PARTICIPANTS)
        .where('eventId', '==', eventId)
        .orderBy('joinedAt', 'asc')
        .get();
    const participants = [];
    for (const doc of snap.docs) {
        const p = doc.data();
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
//# sourceMappingURL=groupFunctions.js.map