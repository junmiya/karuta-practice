/**
 * 108: 便り（掲示板）機能 - フロントエンド型定義
 */

// ===== カテゴリ・タイプ =====

export type PostCategory = 'kawaraban' | 'bugroom';

export type PostType = 'external_news' | 'system_news' | 'group_recruit' | 'bug_report';

export type BugStatus = 'new' | 'need_info' | 'confirmed' | 'in_progress' | 'fixed' | 'closed';

export type BugTargetArea =
  | 'basic'
  | 'tebiraki'
  | 'tenarai'
  | 'keiko'
  | 'utaawase'
  | 'musubi'
  | 'kawi'
  | 'group'
  | 'invite_auth'
  | 'billing'
  | 'other';

export type BugFrequency = 'always' | 'sometimes' | 'once';

// ===== ラベル =====

export const POST_TYPE_LABELS: Record<PostType, string> = {
  external_news: '外部ニュース',
  system_news: 'お知らせ',
  group_recruit: 'メンバー募集',
  bug_report: '不具合報告',
};

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  new: '新規',
  need_info: '情報待ち',
  confirmed: '確認済',
  in_progress: '対応中',
  fixed: '修正済',
  closed: '完了',
};

export const BUG_TARGET_AREA_LABELS: Record<BugTargetArea, string> = {
  basic: '基本',
  tebiraki: '手引',
  tenarai: '手習',
  keiko: '稽古',
  utaawase: '歌合',
  musubi: '結び',
  kawi: '歌位',
  group: '団体',
  invite_auth: '招待・認証',
  billing: '課金',
  other: 'その他',
};

export const BUG_FREQUENCY_LABELS: Record<BugFrequency, string> = {
  always: '毎回',
  sometimes: '時々',
  once: '一度だけ',
};

// ===== データモデル =====

export interface BoardPost {
  id: string;
  category: PostCategory;
  type: PostType;
  title: string;
  body?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
  createdByNickname?: string;
  // 瓦版フィールド
  pinned?: boolean;
  expiresAt?: Date;
  externalUrl?: string;
  groupId?: string;
  groupName?: string;
  inviteCodeId?: string;
  // 不具合フィールド
  status?: BugStatus;
  targetArea?: BugTargetArea;
  targetPage?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  envOs?: string;
  envBrowser?: string;
  envDevice?: string;
  frequency?: BugFrequency;
}

export interface BoardComment {
  id: string;
  postId: string;
  body: string;
  createdAt: Date;
  createdByUserId: string;
  createdByNickname?: string;
}
