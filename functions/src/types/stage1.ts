/**
 * 段階1: 公式競技運用自動化 - 型定義
 */
import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// シーズン管理
// =============================================================================

export type SeasonStatus = 'open' | 'frozen' | 'finalized' | 'archived';

export interface Season {
  seasonId: string;          // "2026_spring", "2026_winter"
  name: string;              // "2026年春戦"
  status: SeasonStatus;
  startDate: Timestamp;
  freezeDate?: Timestamp;
  finalizeDate?: Timestamp;
  archiveDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// ランキング
// =============================================================================

export type Division = 'kyu' | 'dan';

export interface RankingEntry {
  uid: string;
  nickname: string;
  rank: number;
  score: number;
  sessionCount: number;
  lastReflectedSubmittedAt: Timestamp;
}

export interface RankingCache {
  seasonId: string;
  division: Division;
  entries: RankingEntry[];
  totalParticipants: number;
  updatedAt: Timestamp;
}

// =============================================================================
// 番付スナップショット（確定版）
// =============================================================================

export interface BanzukeEntry {
  uid: string;
  nickname: string;
  rank: number;
  score: number;
  sessionCount: number;
  lastReflectedSubmittedAt: Timestamp;
  isChampion?: boolean;      // 称号対象の場合
}

export interface BanzukeSnapshot {
  seasonId: string;
  division: Division;
  status: 'finalized';
  entries: BanzukeEntry[];
  totalParticipants: number;
  createdAt: Timestamp;
}

// =============================================================================
// 日次反映記録
// =============================================================================

export interface TopSession {
  sessionId: string;
  uid: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  submittedAt: Timestamp;
}

export interface DailyReflection {
  seasonId: string;
  division: Division;
  dayKeyJst: string;         // "2026-01-18"
  topSessions: TopSession[];
  createdAt: Timestamp;
}

// =============================================================================
// 称号
// =============================================================================

export interface TitleHistory {
  seasonId: string;
  division: 'dan';           // 段位の部のみ対象
  rank: number;              // 1位のみカウント
  totalParticipants: number; // 24名以上が条件
  awardedAt: Timestamp;
}

export interface Title {
  uid: string;
  nickname: string;
  meijinCount: number;       // 名人回数（4回で達成）
  eiseiCount: number;        // 永世回数（8回で達成）
  isMeijin: boolean;         // 名人資格保持
  isEisei: boolean;          // 永世資格保持
  history: TitleHistory[];
  updatedAt: Timestamp;
}

// =============================================================================
// 監査ログ
// =============================================================================

export type AuditEventType =
  | 'session_confirmed'
  | 'session_invalidated'
  | 'season_frozen'
  | 'season_finalized'
  | 'ranking_recalculated'
  | 'title_awarded';

export interface AuditLog {
  eventId: string;
  eventType: AuditEventType;
  seasonId?: string;
  uid?: string;
  sessionId?: string;
  details: Record<string, unknown>;
  createdAt: Timestamp;
  createdBy: string;         // "system" or admin uid
}

// =============================================================================
// セッション拡張（段階1）
// =============================================================================

export interface SessionSummary {
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  accuracy: number;          // 正答率 (0-100)
}

export interface SessionStage1Extension {
  isRankEligible: boolean;   // 番付反映対象
  reflectedAt?: Timestamp;   // 番付反映日時
  summary?: SessionSummary;  // 正規化サマリ
}

// =============================================================================
// ユーザー拡張（段階1）
// =============================================================================

export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

export interface Subscription {
  status: SubscriptionStatus;
  plan: string;
  currentPeriodEnd: Timestamp;
  canceledAt?: Timestamp;
}

export interface UserStage1Extension {
  subscription?: Subscription;
}

// =============================================================================
// コレクションID定数
// =============================================================================

export const COLLECTIONS = {
  SEASONS: 'seasons',
  RANKINGS: 'rankings',
  BANZUKE_SNAPSHOTS: 'banzukeSnapshots',
  DAILY_REFLECTIONS: 'dailyReflections',
  TITLES: 'titles',
  AUDIT_LOGS: 'auditLogs',
} as const;

// =============================================================================
// ドキュメントID生成ヘルパー
// =============================================================================

export function rankingDocId(seasonId: string, division: Division): string {
  return `${seasonId}_${division}`;
}

export function banzukeDocId(seasonId: string, division: Division): string {
  return `${seasonId}_${division}`;
}

export function dailyReflectionDocId(
  seasonId: string,
  division: Division,
  dayKeyJst: string
): string {
  // dayKeyJst: "2026-01-18" -> "20260118"
  const yyyymmdd = dayKeyJst.replace(/-/g, '');
  return `${seasonId}_${division}_${yyyymmdd}`;
}

// =============================================================================
// 称号判定定数
// =============================================================================

export const TITLE_REQUIREMENTS = {
  MIN_PARTICIPANTS: 24,      // 最低参加者数
  MEIJIN_COUNT: 4,           // 名人達成回数
  EISEI_COUNT: 8,            // 永世達成回数
} as const;
