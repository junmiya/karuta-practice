/**
 * 102: 歌合・節気別歌位確定システム - Frontend型定義
 */
import { Timestamp } from 'firebase/firestore';

export type SekkiMarker = 'risshun' | 'rikka' | 'risshuu' | 'rittou' | 'risshun_next';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type KyuiLevel = 'beginner' | 'jyukkyu' | 'kyukyu' | 'hachikyu' | 'nanakyu' | 'rokkyu';
export type DanLevel = 'shodan' | 'nidan' | 'sandan' | 'yondan' | 'godan' | 'rokudan';
export type DenLevel = 'shoden' | 'chuden' | 'okuden' | 'kaiden';
export type UtakuraiLevel = 'meijin' | 'eisei_meijin';
export type PipelineStatus = 'draft' | 'frozen' | 'finalized' | 'published';
export type EventType = 'kyui_exam' | 'match';
export type EventTier = 'official' | 'provisional' | null;

export interface SeasonCalendar {
  year: number;
  boundaries: { marker: SekkiMarker; datetime: Timestamp }[];
  periods: { seasonId: SeasonId; label: string; start_at: Timestamp; end_at: Timestamp }[];
}

export interface Ruleset {
  version: string;
  yamlContent: string;
  officialMinParticipants: number;
}

export interface UserProgress {
  uid: string;
  nickname: string;
  kyuiLevel: KyuiLevel;
  danLevel: DanLevel | null;
  danEligible: boolean;
  denLevel: DenLevel | null;
  denEligible: boolean;
  utakuraiLevel: UtakuraiLevel | null;
  seasonScores: Record<string, { scores: number[]; bestThreeTotal: number }>;
  officialWinCount: number;
  championCount: number;
  totalOfficialMatches: number;
}

export interface SnapshotRankingEntry {
  uid: string;
  nickname: string;
  rank: number;
  bestThreeTotal: number;
  matchCount: number;
}

export interface PromotionRecord {
  uid: string;
  nickname: string;
  promotionType: 'dan' | 'den' | 'utakurai';
  fromLevel: string;
  toLevel: string;
}

export interface SeasonSnapshot {
  snapshotId: string;
  year: number;
  seasonId: SeasonId;
  seasonKey: string;
  pipeline: {
    status: PipelineStatus;
    frozenAt?: Timestamp;
    finalizedAt?: Timestamp;
    publishedAt?: Timestamp;
    rulesetVersion: string;
  };
  rankings: SnapshotRankingEntry[];
  promotions: PromotionRecord[];
  totalParticipants: number;
  totalEvents: number;
  immutable: boolean;
}

export const KYUI_LEVELS_ORDERED: KyuiLevel[] = [
  'beginner', 'jyukkyu', 'kyukyu', 'hachikyu', 'nanakyu', 'rokkyu',
];

export const DAN_LEVELS_ORDERED: DanLevel[] = [
  'shodan', 'nidan', 'sandan', 'yondan', 'godan', 'rokudan',
];

export const KYUI_LEVEL_LABELS: Record<KyuiLevel, string> = {
  beginner: '初級',
  jyukkyu: '二級',
  kyukyu: '三級',
  hachikyu: '四級',
  nanakyu: '五級',
  rokkyu: '六級',
};

export const DAN_LEVEL_LABELS: Record<DanLevel, string> = {
  shodan: '初段',
  nidan: '二段',
  sandan: '三段',
  yondan: '四段',
  godan: '五段',
  rokudan: '六段',
};

// 次のレベルへの昇級条件（現在のレベルからの昇級条件）
// 検定: 50問、制限時間600秒（10分）
export const KYUI_PROMOTION_CONDITIONS: Record<KyuiLevel, string> = {
  beginner: '二級へ: 1字決まり 80%正解',
  jyukkyu: '三級へ: 2字決まり 80%正解',
  kyukyu: '四級へ: 3字決まり 80%正解',
  hachikyu: '五級へ: 4字決まり 80%正解',
  nanakyu: '六級へ: 5字決まり 80%正解',
  rokkyu: '段位資格取得済（全札90%正解で達成）',
};

export function seasonKey(year: number, seasonId: SeasonId): string {
  return `${year}_${seasonId}`;
}
