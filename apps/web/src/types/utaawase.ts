/**
 * 102: 歌合・節気別歌位確定システム - Frontend型定義
 */
import { Timestamp } from 'firebase/firestore';

export type SekkiMarker = 'risshun' | 'rikka' | 'risshuu' | 'rittou' | 'risshun_next';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type KyuiLevel = 'minarai' | 'shokkyu' | 'nikyu' | 'sankyu' | 'yonkyu' | 'gokyu' | 'rokkyu';
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
  'minarai', 'shokkyu', 'nikyu', 'sankyu', 'yonkyu', 'gokyu', 'rokkyu',
];

export const DAN_LEVELS_ORDERED: DanLevel[] = [
  'shodan', 'nidan', 'sandan', 'yondan', 'godan', 'rokudan',
];

export const KYUI_LEVEL_LABELS: Record<KyuiLevel, string> = {
  minarai: '見習',
  shokkyu: '初級',
  nikyu: '二級',
  sankyu: '三級',
  yonkyu: '四級',
  gokyu: '五級',
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
  minarai: '初級へ: 1字決まり 80%正解',
  shokkyu: '二級へ: 2字決まり 80%正解',
  nikyu: '三級へ: 3字決まり 80%正解',
  sankyu: '四級へ: 4字決まり 80%正解',
  yonkyu: '五級へ: 5字決まり 80%正解',
  gokyu: '六級へ: 全札 90%正解',
  rokkyu: '段位資格取得済（六級達成で段位の部に参加可能）',
};

export function seasonKey(year: number, seasonId: SeasonId): string {
  return `${year}_${seasonId}`;
}

/**
 * 級位別公式歌合の設定
 * cardCount: 表示枚数（7/9/12）
 * questionCount: 出題数
 * maxKimariji: 出題範囲（1-maxKimarijiの決まり字）
 */
export const KYUI_MATCH_CONFIG: Record<KyuiLevel, {
  cardCount: 7 | 9 | 12;
  questionCount: number;
  maxKimariji: number;
  targetCardCount: number;
}> = {
  minarai: { cardCount: 7, questionCount: 7, maxKimariji: 1, targetCardCount: 7 },
  shokkyu: { cardCount: 9, questionCount: 20, maxKimariji: 2, targetCardCount: 42 },
  nikyu: { cardCount: 9, questionCount: 20, maxKimariji: 3, targetCardCount: 37 },
  sankyu: { cardCount: 9, questionCount: 20, maxKimariji: 4, targetCardCount: 6 },
  yonkyu: { cardCount: 9, questionCount: 20, maxKimariji: 5, targetCardCount: 2 },
  gokyu: { cardCount: 9, questionCount: 20, maxKimariji: 6, targetCardCount: 6 },
  rokkyu: { cardCount: 12, questionCount: 50, maxKimariji: 100, targetCardCount: 100 },
};

export const KYUI_MATCH_LABELS: Record<KyuiLevel, string> = {
  minarai: '見習の歌合',
  shokkyu: '初級の歌合',
  nikyu: '二級の歌合',
  sankyu: '三級の歌合',
  yonkyu: '四級の歌合',
  gokyu: '五級の歌合',
  rokkyu: '六級の歌合',
};

/**
 * 級位検定の設定
 * examKimariji: 検定で出題する決まり字（その字数のみ）
 * passRate: 合格に必要な正答率
 * nextLevel: 合格後の級位
 */
export const KYUI_EXAM_CONFIG: Record<KyuiLevel, {
  examKimariji: number | null;  // null = 全札
  passRate: number;
  nextLevel: KyuiLevel | 'dan';
  examLabel: string;
}> = {
  minarai: { examKimariji: 1, passRate: 80, nextLevel: 'shokkyu', examLabel: '初級検定（1字決まり）' },
  shokkyu: { examKimariji: 2, passRate: 80, nextLevel: 'nikyu', examLabel: '二級検定（2字決まり）' },
  nikyu: { examKimariji: 3, passRate: 80, nextLevel: 'sankyu', examLabel: '三級検定（3字決まり）' },
  sankyu: { examKimariji: 4, passRate: 80, nextLevel: 'yonkyu', examLabel: '四級検定（4字決まり）' },
  yonkyu: { examKimariji: 5, passRate: 80, nextLevel: 'gokyu', examLabel: '五級検定（5字決まり）' },
  gokyu: { examKimariji: null, passRate: 90, nextLevel: 'rokkyu', examLabel: '六級検定（全札）' },
  rokkyu: { examKimariji: null, passRate: 90, nextLevel: 'dan', examLabel: '段位資格取得済' },
};

/**
 * 旧ID→新IDマッピング（Firestore既存データ対応）
 */
const LEGACY_KYUI_ID_MAP: Record<string, KyuiLevel> = {
  beginner: 'minarai',
  jyukkyu: 'shokkyu',
  kyukyu: 'nikyu',
  hachikyu: 'sankyu',
  nanakyu: 'yonkyu',
  // 旧rokkyu(五級)は新gokyu(五級)にマップ
  // 注意: 旧システムでは rokkyu=五級、新システムでは rokkyu=六級
};

/**
 * Firestoreから取得したkyuiLevelを正規化
 * 旧IDの場合は新IDに変換、新IDはそのまま返す
 */
export function normalizeKyuiLevel(level: string | undefined | null): KyuiLevel {
  if (!level) return 'minarai';

  // 新IDならそのまま返す
  if (KYUI_LEVELS_ORDERED.includes(level as KyuiLevel)) {
    return level as KyuiLevel;
  }

  // 旧IDなら変換
  if (level in LEGACY_KYUI_ID_MAP) {
    return LEGACY_KYUI_ID_MAP[level];
  }

  // 不明な値はminaraiにフォールバック
  return 'minarai';
}
