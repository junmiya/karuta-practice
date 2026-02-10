/**
 * 105: 手引招待機能 - フロントエンド型定義
 */

// 対象モード
export type TargetMode = 'tenarai' | 'keiko' | 'utaawase';

// 招待ステータス
export type InviteStatus = 'active' | 'expired' | 'not_found';

// 招待設定
export interface InviteSettings {
  yomiKana: boolean;
  toriKana: boolean;
  kimarijiShow: boolean;
  kimarijiFilter: number[];
  poemRange: string;
}

// 対象モードラベル
export const TARGET_MODE_LABELS: Record<TargetMode, string> = {
  tenarai: '手習',
  keiko: '稽古',
  utaawase: '歌合',
};

// === API Input/Output 型 ===

// createInvite
export interface CreateInviteInput {
  targetMode: TargetMode;
}

export interface CreateInviteOutput {
  success: boolean;
  inviteId: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: string; // ISO 8601
  targetMode: string;
}

// getInviteInfo
export interface GetInviteInfoInput {
  inviteId?: string;
  inviteCode?: string;
}

export interface GetInviteInfoOutput {
  found: boolean;
  status: InviteStatus;
  targetMode?: string;
  targetModeLabel?: string;
  requiresAuth?: boolean;
  settings?: InviteSettings;
}

// joinInvite
export interface JoinInviteInput {
  inviteId?: string;
  inviteCode?: string;
}

export interface JoinInviteOutput {
  success: boolean;
  redirectUrl: string;
  targetMode: string;
  targetModeLabel: string;
}
