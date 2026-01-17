import type { Division } from './entry';

export interface RankingEntry {
  uid: string;
  nickname: string;
  score: number;
  rank: number;
  confirmedSessions: number;
}

export interface Ranking {
  seasonId: string;
  division: Division;
  entries: RankingEntry[];
  updatedAt: Date;
}

export interface UserStats {
  totalSessions: number;
  confirmedSessions: number;
  bestScore: number;
  currentRank?: string;
}
