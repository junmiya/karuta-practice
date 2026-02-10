/**
 * 105: 手引招待機能 - バックエンド型定義
 */
import { Timestamp } from 'firebase-admin/firestore';

// 対象モード
export type TargetMode = 'tenarai' | 'keiko' | 'utaawase';

// 招待ステータス
export type InviteStatus = 'active' | 'expired' | 'revoked';

// 招待設定
export interface InviteSettings {
  yomiKana: boolean;
  toriKana: boolean;
  kimarijiShow: boolean;
  kimarijiFilter: number[];
  poemRange: string;
}

// 招待ドキュメント
export interface InviteDoc {
  inviteId: string;
  inviteCode: string;
  createdByUserId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: InviteStatus;
  targetMode: TargetMode;
  settings: InviteSettings;
  usageCount: number;
  lastUsedAt?: Timestamp;
}

// コレクション名
export const INVITE_COLLECTIONS = {
  INVITES: 'invites',
  PARTICIPANTS: 'invite_participants',
} as const;

// 対象モード設定
export interface TargetModeConfig {
  label: string;
  startUrl: string;
  requiresAuth: boolean;
}

export const TARGET_MODE_CONFIG: Record<TargetMode, TargetModeConfig> = {
  tenarai: {
    label: '手習',
    startUrl: '/practice',
    requiresAuth: false,
  },
  keiko: {
    label: '稽古',
    startUrl: '/practice12',
    requiresAuth: true,
  },
  utaawase: {
    label: '歌合',
    startUrl: '/utaawase',
    requiresAuth: true,
  },
};

// デフォルト値
export const INVITE_DEFAULTS = {
  EXPIRY_HOURS: 24,
  CODE_LENGTH: 6,
  // 紛らわしい文字(0/O, 1/I/L)除外の32文字セット
  CODE_CHARSET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  DEFAULT_SETTINGS: {
    yomiKana: false,
    toriKana: false,
    kimarijiShow: false,
    kimarijiFilter: [],
    poemRange: '',
  } as InviteSettings,
} as const;

// 有効な対象モード一覧
export const VALID_TARGET_MODES: TargetMode[] = ['tenarai', 'keiko', 'utaawase'];
