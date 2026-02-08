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
exports.writeGroupAuditLog = writeGroupAuditLog;
exports.logGroupCreate = logGroupCreate;
exports.logGroupUpdate = logGroupUpdate;
exports.logGroupDelete = logGroupDelete;
exports.logGroupSuspend = logGroupSuspend;
exports.logGroupResume = logGroupResume;
exports.logMemberJoin = logMemberJoin;
exports.logMemberLeave = logMemberLeave;
exports.logMemberRemove = logMemberRemove;
exports.logRoleChange = logRoleChange;
exports.logInviteCreate = logInviteCreate;
exports.logInviteRegenerate = logInviteRegenerate;
exports.logInviteRevoke = logInviteRevoke;
exports.logEventCreate = logEventCreate;
exports.logEventUpdate = logEventUpdate;
exports.logEventPublish = logEventPublish;
exports.logEventReject = logEventReject;
exports.logEventClose = logEventClose;
exports.logEventJoin = logEventJoin;
exports.logEventLeave = logEventLeave;
exports.getGroupAuditLogs = getGroupAuditLogs;
/**
 * 103: 団体機能 - 監査ログサービス
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("../lib/crypto");
const db = admin.firestore();
/**
 * 団体関連の監査ログを書き込む
 */
async function writeGroupAuditLog(params) {
    const eventId = (0, crypto_1.generateAuditEventId)('group');
    const logDoc = {
        eventId,
        eventType: params.eventType,
        actorId: params.actorId,
        groupId: params.groupId,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
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
async function logGroupCreate(actorId, groupId, groupName) {
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
async function logGroupUpdate(actorId, groupId, changes) {
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
async function logGroupDelete(actorId, groupId) {
    await writeGroupAuditLog({
        eventType: 'group_delete',
        actorId,
        groupId,
    });
}
/**
 * 団体停止ログ
 */
async function logGroupSuspend(actorId, groupId, reason) {
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
async function logGroupResume(actorId, groupId) {
    await writeGroupAuditLog({
        eventType: 'group_resume',
        actorId,
        groupId,
    });
}
/**
 * メンバー参加ログ
 */
async function logMemberJoin(actorId, groupId, inviteCodeHash) {
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
async function logMemberLeave(actorId, groupId) {
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
async function logMemberRemove(actorId, groupId, targetId, reason) {
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
async function logRoleChange(actorId, groupId, targetId, oldRole, newRole) {
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
async function logInviteCreate(actorId, groupId, inviteId) {
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
async function logInviteRegenerate(actorId, groupId, oldInviteId, newInviteId) {
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
async function logInviteRevoke(actorId, groupId, inviteId) {
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
async function logEventCreate(actorId, groupId, eventId, eventTitle) {
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
async function logEventUpdate(actorId, groupId, eventId, changes) {
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
async function logEventPublish(actorId, groupId, eventId) {
    await writeGroupAuditLog({
        eventType: 'event_publish',
        actorId,
        groupId,
        details: { eventId },
    });
}
/**
 * イベント却下ログ
 */
async function logEventReject(actorId, groupId, eventId) {
    await writeGroupAuditLog({
        eventType: 'event_reject',
        actorId,
        groupId,
        details: { eventId },
    });
}
/**
 * イベント終了ログ
 */
async function logEventClose(actorId, groupId, eventId) {
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
async function logEventJoin(actorId, groupId, eventId) {
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
async function logEventLeave(actorId, groupId, eventId) {
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
async function getGroupAuditLogs(groupId, limit = 50) {
    const snap = await db
        .collection('audit_logs')
        .where('groupId', '==', groupId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    return snap.docs.map(doc => doc.data());
}
//# sourceMappingURL=groupAuditService.js.map