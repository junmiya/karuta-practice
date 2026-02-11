/**
 * 102: 歌合・節気別歌位確定 - ルールエンジン (純関数)
 */
import {
  SeasonCalendar,
  SeasonId,
  EventTier,
  Ruleset,
  KyuiLevel,
  DanLevel,
  DenLevel,
  UtakuraiLevel,
  KyuiExamEventData,
  UserProgress,
  KYUI_LEVELS_ORDERED,
  DAN_LEVELS_ORDERED,
  DEN_LEVELS_ORDERED,
  UTAKURAI_LEVELS_ORDERED,
} from '../types/utaawase';

// =============================================================================
// Season / Tier determination
// =============================================================================

/**
 * 日時から四季区分を判定 (半開区間 [start_at, end_at))
 * @returns { seasonId, seasonYear } or null if no matching period
 */
export function determineSeason(
  calendar: SeasonCalendar,
  eventDate: Date
): { seasonId: SeasonId; seasonYear: number } | null {
  const eventMs = eventDate.getTime();

  for (const period of calendar.periods) {
    const startMs = period.start_at.toMillis();
    const endMs = period.end_at.toMillis();

    if (eventMs >= startMs && eventMs < endMs) {
      return {
        seasonId: period.seasonId,
        seasonYear: calendar.year,
      };
    }
  }
  return null;
}

/**
 * 参加者数からtierを判定
 */
export function determineTier(
  participantCount: number | null,
  officialMinParticipants: number
): EventTier {
  if (participantCount === null) return null; // kyui_exam
  return participantCount >= officialMinParticipants ? 'official' : 'provisional';
}

// =============================================================================
// 級位検定 (Kyui) promotion
// =============================================================================

/**
 * 級位検定の合格判定 + 昇級先を返す
 * 飛び級禁止: 現在レベルの次のレベルにのみ昇級可能
 */
export function evaluateKyuiPromotion(
  currentLevel: KyuiLevel,
  examData: KyuiExamEventData,
  ruleset: Ruleset
): { promoted: boolean; newLevel: KyuiLevel; danEligible: boolean } {
  const currentIndex = KYUI_LEVELS_ORDERED.indexOf(currentLevel);
  const nextIndex = currentIndex + 1;

  // Already at max level (六級)
  if (nextIndex >= KYUI_LEVELS_ORDERED.length) {
    return { promoted: false, newLevel: currentLevel, danEligible: currentLevel === 'rokkyu' };
  }

  const nextLevel = KYUI_LEVELS_ORDERED[nextIndex];
  const requirement = ruleset.kyuiRequirements.find((r) => r.level === nextLevel);

  if (!requirement) {
    return { promoted: false, newLevel: currentLevel, danEligible: false };
  }

  // Check conditions
  const actualPassRate = examData.questionCount > 0
    ? (examData.correctCount / examData.questionCount) * 100
    : 0;

  const passRateMet = actualPassRate >= requirement.passRate;
  const cardRequirementMet = requirement.allCards
    ? examData.allCards
    : requirement.kimarijiFuda === null || examData.kimarijiFuda === requirement.kimarijiFuda;
  const questionCountMet = examData.questionCount >= requirement.questionCount;

  if (passRateMet && cardRequirementMet && questionCountMet) {
    const newLevel = nextLevel;
    // 六級(rokkyu)が最高位、到達でdan_eligible
    const danEligible = newLevel === 'rokkyu';
    return { promoted: true, newLevel, danEligible };
  }

  return { promoted: false, newLevel: currentLevel, danEligible: false };
}

// =============================================================================
// 段位 (Dan) promotion — season-end only
// =============================================================================

/**
 * 段位昇格判定 (finalize時に実行)
 * 飛び段禁止: 1回のfinalizeで1段階のみ
 */
export function evaluateDanPromotion(
  progress: UserProgress,
  seasonRank: number,
  totalParticipants: number,
  allCardsUsed: boolean,
  ruleset: Ruleset
): { promoted: boolean; newLevel: DanLevel } | null {
  if (!progress.danEligible) return null;

  const currentLevel = progress.danLevel;
  const currentIndex = currentLevel ? DAN_LEVELS_ORDERED.indexOf(currentLevel) : -1;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= DAN_LEVELS_ORDERED.length) return null;

  const nextLevel = DAN_LEVELS_ORDERED[nextIndex];
  const requirement = ruleset.danRequirements.find((r) => r.level === nextLevel);

  if (!requirement) return null;

  // Must use all cards
  if (requirement.allCardsRequired && !allCardsUsed) return null;

  // Check rank ratio
  const rankRatio = seasonRank / totalParticipants;
  if (rankRatio <= requirement.topRatio) {
    return { promoted: true, newLevel: nextLevel };
  }

  return null;
}

// =============================================================================
// 伝位 (Den) promotion — season-end only
// =============================================================================

/**
 * 伝位昇格判定 (finalize時に実行)
 */
export function evaluateDenPromotion(
  progress: UserProgress,
  ruleset: Ruleset
): { promoted: boolean; newLevel: DenLevel } | null {
  if (!progress.denEligible) return null;

  const currentLevel = progress.denLevel;
  const currentIndex = currentLevel ? DEN_LEVELS_ORDERED.indexOf(currentLevel) : -1;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= DEN_LEVELS_ORDERED.length) return null;

  const nextLevel = DEN_LEVELS_ORDERED[nextIndex];
  const requirement = ruleset.denRequirements.find((r) => r.level === nextLevel);

  if (!requirement) return null;

  if (progress.officialWinCount >= requirement.officialWinCount) {
    return { promoted: true, newLevel: nextLevel };
  }

  return null;
}

// =============================================================================
// 歌位 (Utakurai) promotion — season-end only
// =============================================================================

export function evaluateUtakuraiPromotion(
  progress: UserProgress,
  ruleset: Ruleset
): { promoted: boolean; newLevel: UtakuraiLevel } | null {
  const currentLevel = progress.utakuraiLevel;
  const currentIndex = currentLevel ? UTAKURAI_LEVELS_ORDERED.indexOf(currentLevel) : -1;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= UTAKURAI_LEVELS_ORDERED.length) return null;

  const nextLevel = UTAKURAI_LEVELS_ORDERED[nextIndex];
  const requirement = ruleset.utakuraiRequirements.find((r) => r.level === nextLevel);

  if (!requirement) return null;

  if (progress.championCount >= requirement.championCount) {
    return { promoted: true, newLevel: nextLevel };
  }

  return null;
}

// =============================================================================
// Validation
// =============================================================================

export function validateSeasonCalendar(calendar: Partial<SeasonCalendar>): string[] {
  const errors: string[] = [];

  if (!calendar.year || calendar.year < 2024 || calendar.year > 2100) {
    errors.push('year must be between 2024 and 2100');
  }

  if (!calendar.boundaries || calendar.boundaries.length !== 5) {
    errors.push('boundaries must have exactly 5 entries (risshun, rikka, risshuu, rittou, risshun_next)');
  } else {
    const requiredMarkers = ['risshun', 'rikka', 'risshuu', 'rittou', 'risshun_next'];
    const foundMarkers = calendar.boundaries.map((b) => b.marker);
    for (const marker of requiredMarkers) {
      if (!foundMarkers.includes(marker as any)) {
        errors.push(`Missing boundary marker: ${marker}`);
      }
    }
  }

  if (!calendar.periods || calendar.periods.length !== 4) {
    errors.push('periods must have exactly 4 entries (spring, summer, autumn, winter)');
  } else {
    const requiredSeasons: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
    const foundSeasons = calendar.periods.map((p) => p.seasonId);
    for (const sid of requiredSeasons) {
      if (!foundSeasons.includes(sid)) {
        errors.push(`Missing season period: ${sid}`);
      }
    }

    // Validate monotonic increase: each period's end_at must equal next period's start_at
    const ordered = [...calendar.periods].sort((a, b) => a.start_at.toMillis() - b.start_at.toMillis());
    for (let i = 0; i < ordered.length - 1; i++) {
      if (ordered[i].end_at.toMillis() !== ordered[i + 1].start_at.toMillis()) {
        errors.push(`Gap or overlap between ${ordered[i].seasonId} and ${ordered[i + 1].seasonId}`);
      }
    }

    // Validate winter.end_at == risshun_next
    if (calendar.boundaries && calendar.boundaries.length === 5) {
      const winterPeriod = calendar.periods.find((p) => p.seasonId === 'winter');
      const risshunNext = calendar.boundaries.find((b) => b.marker === 'risshun_next');
      if (winterPeriod && risshunNext) {
        if (winterPeriod.end_at.toMillis() !== risshunNext.datetime.toMillis()) {
          errors.push('winter.end_at must equal risshun_next datetime');
        }
      }
    }
  }

  return errors;
}

export function validateRuleset(ruleset: Partial<Ruleset>): string[] {
  const errors: string[] = [];

  if (!ruleset.version) errors.push('version is required');
  if (!ruleset.yamlContent) errors.push('yamlContent is required');
  if (!ruleset.kyuiRequirements?.length) errors.push('kyuiRequirements are required');
  if (!ruleset.danRequirements?.length) errors.push('danRequirements are required');
  if (!ruleset.denRequirements?.length) errors.push('denRequirements are required');
  if (!ruleset.utakuraiRequirements?.length) errors.push('utakuraiRequirements are required');
  if (!ruleset.officialMinParticipants || ruleset.officialMinParticipants < 1) {
    errors.push('officialMinParticipants must be >= 1');
  }

  return errors;
}

/**
 * Check if a season period is currently frozen
 */
export function isSeasonFrozen(
  snapshotStatus: string | undefined
): boolean {
  return snapshotStatus === 'frozen' || snapshotStatus === 'finalized' || snapshotStatus === 'published';
}
