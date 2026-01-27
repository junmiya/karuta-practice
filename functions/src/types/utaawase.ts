/**
 * 102: 歌合・節気別歌位確定システム - 型定義
 */
import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// 節気カレンダー (Season Calendar)
// =============================================================================

export type SekkiMarker = 'risshun' | 'rikka' | 'risshuu' | 'rittou' | 'risshun_next';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SekkiBoundary {
  marker: SekkiMarker;
  datetime: Timestamp; // Asia/Tokyo
}

export interface SeasonPeriod {
  seasonId: SeasonId;
  label: string;        // "春戦", "夏戦", "秋戦", "冬戦"
  start_at: Timestamp;  // inclusive
  end_at: Timestamp;    // exclusive
}

export interface SeasonCalendar {
  year: number;
  boundaries: SekkiBoundary[];
  periods: SeasonPeriod[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// ルールセット (Ruleset)
// =============================================================================

export type KyuiLevel = 'beginner' | 'jyukkyu' | 'kyukyu' | 'hachikyu' | 'nanakyu' | 'rokkyu';
export type DanLevel = 'shodan' | 'nidan' | 'sandan' | 'yondan' | 'godan' | 'rokudan';
export type DenLevel = 'shoden' | 'chuden' | 'okuden' | 'kaiden';
export type UtakuraiLevel = 'meijin' | 'eisei_meijin';

export interface KyuiRequirement {
  level: KyuiLevel;
  label: string;
  /** 決まり字上限 (e.g. 1=一字決まり, null=全札) */
  kimarijiFuda: number | null;
  /** 出題数 */
  questionCount: number;
  /** 合格正答率 (0-100) */
  passRate: number;
  /** 全札フラグ */
  allCards: boolean;
}

export interface DanRequirement {
  level: DanLevel;
  label: string;
  /** 公式競技で上位何割以内 (0-1, e.g. 0.5 = 上位半分) */
  topRatio: number;
  /** 全札使用必須 */
  allCardsRequired: boolean;
}

export interface DenRequirement {
  level: DenLevel;
  label: string;
  /** 公式競技での上位入賞回数 */
  officialWinCount: number;
}

export interface UtakuraiRequirement {
  level: UtakuraiLevel;
  label: string;
  /** 公式競技での優勝回数 */
  championCount: number;
}

export interface Ruleset {
  version: string;
  yamlContent: string;
  kyuiRequirements: KyuiRequirement[];
  danRequirements: DanRequirement[];
  denRequirements: DenRequirement[];
  utakuraiRequirements: UtakuraiRequirement[];
  /** 公式記録の最低参加者数 */
  officialMinParticipants: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// 歌合イベント (Event)
// =============================================================================

export type EventType = 'kyui_exam' | 'match';
export type EventTier = 'official' | 'provisional' | null;

export interface MatchEventData {
  sessionId: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
}

export interface KyuiExamEventData {
  kimarijiFuda: number | null;
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
  passRate: number;  // actual pass rate achieved
  passed: boolean;
}

export interface UtaawaseEvent {
  eventId: string;
  uid: string;
  eventType: EventType;
  seasonId: SeasonId;
  seasonYear: number;
  seasonKey: string;       // "2026_spring"
  tier: EventTier;
  participantCount: number | null;
  matchData?: MatchEventData;
  examData?: KyuiExamEventData;
  startedAt: Timestamp;
  createdAt: Timestamp;
}

// =============================================================================
// ユーザー進捗 (User Progress)
// =============================================================================

export interface UserProgress {
  uid: string;
  nickname: string;

  // 級位
  kyuiLevel: KyuiLevel;
  kyuiPromotedAt?: Timestamp;

  // 段位
  danLevel: DanLevel | null;
  danEligible: boolean;       // 六級到達で true
  danPromotedAt?: Timestamp;

  // 伝位
  denLevel: DenLevel | null;
  denEligible: boolean;       // 六段到達で true
  denPromotedAt?: Timestamp;

  // 歌位
  utakuraiLevel: UtakuraiLevel | null;
  utakuraiPromotedAt?: Timestamp;

  // シーズン別スコア（ベスト3合計方式）
  seasonScores: Record<string, { scores: number[]; bestThreeTotal: number }>;

  // カウンター
  officialWinCount: number;     // 公式競技上位入賞回数
  championCount: number;        // 公式競技優勝回数
  totalOfficialMatches: number; // 公式競技参加回数

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// 季末スナップショット (Season Snapshot)
// =============================================================================

export type PipelineStatus = 'draft' | 'frozen' | 'finalized' | 'published';

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
  snapshotId: string;          // "2026_spring"
  year: number;
  seasonId: SeasonId;
  seasonKey: string;           // "2026_spring"
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// ジョブ実行ログ (Job Run)
// =============================================================================

export type JobStatus = 'running' | 'success' | 'failed';
export type JobName = 'freeze' | 'finalize' | 'publish' | 'checkSeasonBoundary';

export interface JobRun {
  runId: string;
  jobName: JobName;
  seasonKey: string;
  status: JobStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  stats?: Record<string, number>;
  createdBy: string;  // "system" or admin uid
}

// =============================================================================
// コレクションID定数
// =============================================================================

export const UTAAWASE_COLLECTIONS = {
  RULESETS: 'rulesets',
  SEASON_CALENDARS: 'season_calendars',
  EVENTS: 'events',
  USER_PROGRESS: 'user_progress',
  SEASON_SNAPSHOTS: 'season_snapshots',
  JOB_RUNS: 'job_runs',
} as const;

// =============================================================================
// ヘルパー定数
// =============================================================================

export const KYUI_LEVELS_ORDERED: KyuiLevel[] = [
  'beginner', 'jyukkyu', 'kyukyu', 'hachikyu', 'nanakyu', 'rokkyu',
];

export const DAN_LEVELS_ORDERED: DanLevel[] = [
  'shodan', 'nidan', 'sandan', 'yondan', 'godan', 'rokudan',
];

export const DEN_LEVELS_ORDERED: DenLevel[] = [
  'shoden', 'chuden', 'okuden', 'kaiden',
];

export const UTAKURAI_LEVELS_ORDERED: UtakuraiLevel[] = [
  'meijin', 'eisei_meijin',
];

export function seasonKey(year: number, seasonId: SeasonId): string {
  return `${year}_${seasonId}`;
}
