/**
 * 103: 団体機能 - バックエンド型定義
 */
import { Timestamp } from 'firebase-admin/firestore';

// ロール定義
export type GroupRole = 'owner' | 'organizer' | 'member';
export type GroupStatus = 'active' | 'suspended' | 'deleted';
export type MembershipStatus = 'active' | 'left';
export type EventStatus = 'draft' | 'published' | 'rejected' | 'closed';
export type EventVisibility = 'group_only' | 'public';

// コレクション名
export const GROUP_COLLECTIONS = {
  GROUPS: 'groups',
  MEMBERSHIPS: 'group_memberships',
  INVITES: 'group_invites',
  EVENTS: 'group_events',
  EVENT_PARTICIPANTS: 'group_event_participants',
  STATS: 'group_stats',
} as const;

// 団体ドキュメント
export interface GroupDoc {
  groupId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerUserId: string;
  status: GroupStatus;
  memberCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// メンバーシップドキュメント
export interface GroupMembershipDoc {
  membershipId: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: MembershipStatus;
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  inviteCodeUsed?: string; // 使用した招待コードハッシュ（監査用）
}

// 招待コードドキュメント
export interface GroupInviteDoc {
  inviteId: string;
  groupId: string;
  inviteCodeHash: string; // salt:hash形式
  createdAt: Timestamp;
  expiresAt: Timestamp;
  maxJoins: number;
  joinCount: number;
  revokedAt?: Timestamp;
  createdBy: string;
}

// イベントドキュメント
export interface GroupEventDoc {
  eventId: string;
  groupId: string;
  title: string;
  description?: string;
  startAt: Timestamp;
  endAt: Timestamp;
  isOfficial: boolean;
  visibility: EventVisibility;
  status: EventStatus;
  participantCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// イベント参加者ドキュメント
export interface GroupEventParticipantDoc {
  participantId: string;
  eventId: string;
  groupId: string;
  userId: string;
  joinedAt: Timestamp;
}

// 団体成績ドキュメント
export interface GroupStatsDoc {
  statsId: string;
  groupId: string;
  seasonKey: string;
  totalMatches: number;
  totalScore: number;
  avgScore: number;
  topScore: number;
  memberCount: number;
  rank?: number;
  updatedAt: Timestamp;
}

// 監査ログイベント種別
export type GroupAuditEventType =
  | 'group_create'
  | 'group_update'
  | 'group_delete'
  | 'group_suspend'
  | 'group_resume'
  | 'member_join'
  | 'member_leave'
  | 'member_remove'
  | 'role_change'
  | 'invite_create'
  | 'invite_regenerate'
  | 'invite_revoke'
  | 'event_create'
  | 'event_update'
  | 'event_publish'
  | 'event_close'
  | 'event_reject'
  | 'event_join'
  | 'event_leave';

// 監査ログドキュメント
export interface GroupAuditLogDoc {
  eventId: string;
  eventType: GroupAuditEventType;
  actorId: string;
  targetId?: string;
  groupId: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
}

// API入力型
export interface CreateGroupInput {
  name: string;
  description?: string;
}

export interface UpdateGroupInput {
  groupId: string;
  name?: string;
  description?: string;
}

export interface JoinGroupInput {
  groupId: string;
  inviteCode: string;
}

export interface RegenerateInviteCodeInput {
  groupId: string;
  expiresInDays?: number;
  maxJoins?: number;
}

export interface ChangeRoleInput {
  groupId: string;
  targetUserId: string;
  newRole: GroupRole;
}

export interface CreateEventInput {
  groupId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  visibility?: EventVisibility;
}

export interface UpdateEventInput {
  eventId: string;
  title?: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  visibility?: EventVisibility;
}

// API出力型
export interface CreateGroupResult {
  success: boolean;
  groupId: string;
  inviteCode: string;
}

export interface JoinGroupResult {
  success: boolean;
  groupId: string;
  groupName: string;
}

export type JoinGroupErrorCode =
  | 'INVALID_CODE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'MAX_JOINS_REACHED'
  | 'ALREADY_MEMBER';

export interface JoinGroupError {
  success: false;
  errorCode: JoinGroupErrorCode;
  message: string;
}

// 招待コード情報（管理者向け）
export interface InviteCodeResult {
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

// 招待コード情報（公開）
export interface InviteInfoResult {
  hasValidInvite: boolean;
  expiresAt?: Date;
  maxJoins?: number;
  joinCount?: number;
  isExpired?: boolean;
  isRevoked?: boolean;
  isMaxed?: boolean;
}

// デフォルト値
export const GROUP_DEFAULTS = {
  INVITE_EXPIRES_DAYS: 7,
  INVITE_MAX_JOINS: 100,
  INVITE_MAX_EXPIRES_DAYS: 30,
  INVITE_MAX_MAX_JOINS: 1000,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500,
  EVENT_TITLE_MIN_LENGTH: 1,
  EVENT_TITLE_MAX_LENGTH: 100,
  EVENT_DESCRIPTION_MAX_LENGTH: 1000,
} as const;
