/**
 * 103: 団体機能 - フロントエンド型定義
 */

// ロール定義
export type GroupRole = 'owner' | 'organizer' | 'member';
export type GroupStatus = 'active' | 'suspended' | 'deleted';
export type MembershipStatus = 'active' | 'left';
export type EventStatus = 'draft' | 'published' | 'closed';
export type EventVisibility = 'group_only' | 'public';

// ロールラベル
export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  owner: '団体管理者',
  organizer: '団体運営',
  member: '団体一般',
};

// ステータスラベル
export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  active: '活動中',
  suspended: '停止中',
  deleted: '削除済',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: '下書き',
  published: '公開中',
  closed: '終了',
};

// 団体
export interface Group {
  groupId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerUserId: string;
  status: GroupStatus;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 団体 + 自分のメンバーシップ
export interface GroupWithMembership extends Group {
  myRole: GroupRole;
  joinedAt: Date;
}

// メンバーシップ
export interface GroupMembership {
  membershipId: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: MembershipStatus;
  joinedAt: Date;
  leftAt?: Date;
}

// メンバー情報（表示用）
export interface GroupMember {
  userId: string;
  nickname: string;
  role: GroupRole;
  joinedAt: Date;
}

// 招待コード情報
export interface InviteInfo {
  hasValidInvite: boolean;
  expiresAt?: Date;
  maxJoins?: number;
  joinCount?: number;
  isExpired?: boolean;
  isRevoked?: boolean;
  isMaxed?: boolean;
}

// 招待コード（管理者用）
export interface InviteCodeResponse {
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

// イベント
export interface GroupEvent {
  eventId: string;
  groupId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  isOfficial: boolean;
  visibility: EventVisibility;
  status: EventStatus;
  participantCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isParticipating?: boolean; // リクエストユーザーの参加状況
}

// イベント参加者
export interface EventParticipant {
  userId: string;
  nickname: string;
  joinedAt: Date;
}

// 団体成績
export interface GroupStats {
  groupId: string;
  seasonKey: string;
  totalMatches: number;
  totalScore: number;
  avgScore: number;
  topScore: number;
  memberCount: number;
  rank?: number;
  updatedAt: Date;
}

// API レスポンス型
export interface CreateGroupResponse {
  success: boolean;
  groupId: string;
  inviteCode: string;
}

export interface JoinGroupResponse {
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
