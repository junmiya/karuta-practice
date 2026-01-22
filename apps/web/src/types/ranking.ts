import type { Division } from './entry';

export interface RankingEntry {
  uid: string;
  nickname: string;
  score: number;
  rank: number;
  confirmedSessions: number;
  sessionCount?: number;           // 段階1用
  lastReflectedSubmittedAt?: Date; // 段階1用
}

export interface Ranking {
  seasonId: string;
  division: Division;
  entries: RankingEntry[];
  updatedAt: Date;
  totalParticipants?: number; // 段階1用
}

export interface UserStats {
  totalSessions: number;
  confirmedSessions: number;
  bestScore: number;
  currentRank?: string;
}

// =============================================================================
// 段階1用型定義
// =============================================================================

/**
 * 番付エントリー（確定版）
 */
export interface BanzukeEntry {
  uid: string;
  nickname: string;
  rank: number;
  score: number;
  sessionCount: number;
  lastReflectedSubmittedAt: Date;
  isChampion?: boolean;
}

/**
 * 番付スナップショット（公式結果）
 */
export interface BanzukeSnapshot {
  seasonId: string;
  division: Division;
  status: 'finalized';
  entries: BanzukeEntry[];
  totalParticipants: number;
  createdAt: Date;
}

/**
 * 称号情報
 */
export interface Title {
  uid: string;
  nickname: string;
  meijinCount: number;
  eiseiCount: number;
  isMeijin: boolean;
  isEisei: boolean;
  history: TitleHistory[];
  updatedAt: Date;
}

export interface TitleHistory {
  seasonId: string;
  division: 'dan';
  rank: number;
  totalParticipants: number;
  awardedAt: Date;
}

/**
 * 日次反映記録
 */
export interface DailyReflection {
  seasonId: string;
  division: Division;
  dayKeyJst: string;
  topSessions: TopSession[];
  createdAt: Date;
}

export interface TopSession {
  sessionId: string;
  uid: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  submittedAt: Date;
}
