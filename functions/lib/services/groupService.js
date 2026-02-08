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
exports.checkGroupPermission = checkGroupPermission;
exports.isGroupOwner = isGroupOwner;
exports.isGroupOwnerOrOrganizer = isGroupOwnerOrOrganizer;
exports.isGroupMember = isGroupMember;
exports.getMembership = getMembership;
exports.getGroup = getGroup;
exports.getUserGroups = getUserGroups;
exports.getGroupMembers = getGroupMembers;
exports.validateGroupName = validateGroupName;
exports.validateGroupDescription = validateGroupDescription;
exports.incrementMemberCount = incrementMemberCount;
exports.decrementMemberCount = decrementMemberCount;
/**
 * 103: 団体機能 - グループサービス
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const group_1 = require("../types/group");
const db = admin.firestore();
/**
 * 権限チェック：指定ロールを持つか確認
 */
async function checkGroupPermission(uid, groupId, requiredRoles) {
    const membershipId = `${groupId}_${uid}`;
    const doc = await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();
    if (!doc.exists)
        return false;
    const data = doc.data();
    return data.status === 'active' && requiredRoles.includes(data.role);
}
/**
 * 団体オーナーか確認
 */
async function isGroupOwner(uid, groupId) {
    return checkGroupPermission(uid, groupId, ['owner']);
}
/**
 * 団体オーナーまたは運営か確認
 */
async function isGroupOwnerOrOrganizer(uid, groupId) {
    return checkGroupPermission(uid, groupId, ['owner', 'organizer']);
}
/**
 * 団体メンバーか確認
 */
async function isGroupMember(uid, groupId) {
    return checkGroupPermission(uid, groupId, ['owner', 'organizer', 'member']);
}
/**
 * メンバーシップを取得
 */
async function getMembership(uid, groupId) {
    const membershipId = `${groupId}_${uid}`;
    const doc = await db.collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS).doc(membershipId).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
/**
 * 団体を取得
 */
async function getGroup(groupId) {
    const doc = await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
/**
 * ユーザーの所属団体一覧を取得
 */
async function getUserGroups(uid) {
    const membershipsSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS)
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .get();
    if (membershipsSnap.empty)
        return [];
    const results = [];
    for (const memberDoc of membershipsSnap.docs) {
        const membership = memberDoc.data();
        const groupDoc = await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(membership.groupId).get();
        if (groupDoc.exists) {
            const group = groupDoc.data();
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
async function getGroupMembers(groupId) {
    const membershipsSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS)
        .where('groupId', '==', groupId)
        .where('status', '==', 'active')
        .get();
    if (membershipsSnap.empty)
        return [];
    const results = [];
    for (const doc of membershipsSnap.docs) {
        const membership = doc.data();
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
    const roleOrder = { owner: 0, organizer: 1, member: 2 };
    results.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    return results;
}
/**
 * 団体名のバリデーション
 */
function validateGroupName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, message: '団体名は必須です' };
    }
    const trimmed = name.trim();
    if (trimmed.length < group_1.GROUP_DEFAULTS.NAME_MIN_LENGTH) {
        return { valid: false, message: '団体名を入力してください' };
    }
    if (trimmed.length > group_1.GROUP_DEFAULTS.NAME_MAX_LENGTH) {
        return { valid: false, message: `団体名は${group_1.GROUP_DEFAULTS.NAME_MAX_LENGTH}文字以内で入力してください` };
    }
    return { valid: true };
}
/**
 * 団体説明のバリデーション
 */
function validateGroupDescription(description) {
    if (!description)
        return { valid: true };
    if (description.length > group_1.GROUP_DEFAULTS.DESCRIPTION_MAX_LENGTH) {
        return { valid: false, message: `説明は${group_1.GROUP_DEFAULTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください` };
    }
    return { valid: true };
}
/**
 * メンバー数をインクリメント
 */
async function incrementMemberCount(groupId) {
    await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
        memberCount: firestore_1.FieldValue.increment(1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
/**
 * メンバー数をデクリメント
 */
async function decrementMemberCount(groupId) {
    await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(groupId).update({
        memberCount: firestore_1.FieldValue.increment(-1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=groupService.js.map