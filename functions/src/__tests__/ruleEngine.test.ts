/**
 * 102: ruleEngine 純関数ユニットテスト
 */
import { Timestamp } from 'firebase-admin/firestore';
import {
  determineSeason,
  determineTier,
  evaluateKyuiPromotion,
  evaluateDanPromotion,
  evaluateDenPromotion,
  evaluateUtakuraiPromotion,
  validateSeasonCalendar,
  validateRuleset,
  isSeasonFrozen,
} from '../lib/ruleEngine';
import type {
  SeasonCalendar,
  Ruleset,
  KyuiExamEventData,
  UserProgress,
} from '../types/utaawase';

// Helper to create Timestamp from date string
function ts(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(dateStr));
}

// Mock calendar for 2026
const mockCalendar: SeasonCalendar = {
  year: 2026,
  boundaries: [
    { marker: 'risshun', datetime: ts('2026-02-04T00:00:00+09:00') },
    { marker: 'rikka', datetime: ts('2026-05-05T00:00:00+09:00') },
    { marker: 'risshuu', datetime: ts('2026-08-07T00:00:00+09:00') },
    { marker: 'rittou', datetime: ts('2026-11-07T00:00:00+09:00') },
    { marker: 'risshun_next', datetime: ts('2027-02-03T00:00:00+09:00') },
  ],
  periods: [
    { seasonId: 'spring', label: '春戦', start_at: ts('2026-02-04T00:00:00+09:00'), end_at: ts('2026-05-05T00:00:00+09:00') },
    { seasonId: 'summer', label: '夏戦', start_at: ts('2026-05-05T00:00:00+09:00'), end_at: ts('2026-08-07T00:00:00+09:00') },
    { seasonId: 'autumn', label: '秋戦', start_at: ts('2026-08-07T00:00:00+09:00'), end_at: ts('2026-11-07T00:00:00+09:00') },
    { seasonId: 'winter', label: '冬戦', start_at: ts('2026-11-07T00:00:00+09:00'), end_at: ts('2027-02-03T00:00:00+09:00') },
  ],
  createdAt: ts('2026-01-01T00:00:00+09:00'),
  updatedAt: ts('2026-01-01T00:00:00+09:00'),
};

// Mock ruleset
const mockRuleset: Ruleset = {
  version: '1.0.0',
  yamlContent: 'test',
  kyuiRequirements: [
    { level: 'jyukkyu', label: '十級', kimarijiFuda: 1, questionCount: 7, passRate: 80, allCards: false },
    { level: 'kyukyu', label: '九級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
    { level: 'hachikyu', label: '八級', kimarijiFuda: 3, questionCount: 15, passRate: 80, allCards: false },
    { level: 'nanakyu', label: '七級', kimarijiFuda: null, questionCount: 25, passRate: 80, allCards: false },
    { level: 'rokkyu', label: '六級', kimarijiFuda: null, questionCount: 50, passRate: 80, allCards: true },
  ],
  danRequirements: [
    { level: 'shodan', label: '初段', topRatio: 0.5, allCardsRequired: true },
    { level: 'nidan', label: '二段', topRatio: 0.33, allCardsRequired: true },
  ],
  denRequirements: [
    { level: 'shoden', label: '初伝', officialWinCount: 3 },
  ],
  utakuraiRequirements: [
    { level: 'meijin', label: '名人', championCount: 4 },
  ],
  officialMinParticipants: 24,
  isActive: true,
  createdAt: ts('2026-01-01T00:00:00+09:00'),
  updatedAt: ts('2026-01-01T00:00:00+09:00'),
};

// =============================================================================
// determineSeason
// =============================================================================

describe('determineSeason', () => {
  test('spring: 2026-03-01 → spring', () => {
    const result = determineSeason(mockCalendar, new Date('2026-03-01T12:00:00+09:00'));
    expect(result).toEqual({ seasonId: 'spring', seasonYear: 2026 });
  });

  test('winter: 2026-11-08 → winter', () => {
    const result = determineSeason(mockCalendar, new Date('2026-11-08T12:00:00+09:00'));
    expect(result).toEqual({ seasonId: 'winter', seasonYear: 2026 });
  });

  test('boundary: exactly at start of summer → summer (half-open interval)', () => {
    const result = determineSeason(mockCalendar, new Date('2026-05-05T00:00:00+09:00'));
    expect(result).toEqual({ seasonId: 'summer', seasonYear: 2026 });
  });

  test('before calendar year → null', () => {
    const result = determineSeason(mockCalendar, new Date('2026-01-01T12:00:00+09:00'));
    expect(result).toBeNull();
  });
});

// =============================================================================
// determineTier
// =============================================================================

describe('determineTier', () => {
  test('24 participants → official', () => {
    expect(determineTier(24, 24)).toBe('official');
  });

  test('30 participants → official', () => {
    expect(determineTier(30, 24)).toBe('official');
  });

  test('23 participants → provisional', () => {
    expect(determineTier(23, 24)).toBe('provisional');
  });

  test('null participants → null (kyui_exam)', () => {
    expect(determineTier(null, 24)).toBeNull();
  });
});

// =============================================================================
// evaluateKyuiPromotion
// =============================================================================

describe('evaluateKyuiPromotion', () => {
  test('beginner → jyukkyu (pass)', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 10,
      correctCount: 9,
      totalElapsedMs: 30000,
      allCards: false,
      passRate: 90,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    expect(result.promoted).toBe(true);
    expect(result.newLevel).toBe('jyukkyu');
    expect(result.danEligible).toBe(false);
  });

  test('beginner → fails (insufficient pass rate)', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 10,
      correctCount: 5,
      totalElapsedMs: 30000,
      allCards: false,
      passRate: 50,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    expect(result.promoted).toBe(false);
    expect(result.newLevel).toBe('beginner');
  });

  test('nanakyu → rokkyu sets danEligible', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: null,
      questionCount: 50,
      correctCount: 45,
      totalElapsedMs: 60000,
      allCards: true,
      passRate: 90,
      passed: false,
    };
    const result = evaluateKyuiPromotion('nanakyu', examData, mockRuleset);
    expect(result.promoted).toBe(true);
    expect(result.newLevel).toBe('rokkyu');
    expect(result.danEligible).toBe(true);
  });

  test('no skip promotion (飛び級禁止): beginner can only go to jyukkyu even if meeting higher requirements', () => {
    // Use kimarijiFuda: 1 to match jyukkyu requirement
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 100,
      correctCount: 95,
      totalElapsedMs: 60000,
      allCards: false,
      passRate: 95,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    // Should only promote to jyukkyu (next level), not skip
    expect(result.promoted).toBe(true);
    expect(result.newLevel).toBe('jyukkyu');
  });
});

// =============================================================================
// evaluateDanPromotion
// =============================================================================

describe('evaluateDanPromotion', () => {
  test('dan_eligible + top half → shodan', () => {
    const progress: UserProgress = {
      uid: 'test',
      nickname: 'Test',
      kyuiLevel: 'rokkyu',
      danLevel: null,
      danEligible: true,
      denLevel: null,
      denEligible: false,
      utakuraiLevel: null,
      seasonScores: {},
      officialWinCount: 0,
      championCount: 0,
      totalOfficialMatches: 5,
      createdAt: ts('2026-01-01T00:00:00+09:00'),
      updatedAt: ts('2026-01-01T00:00:00+09:00'),
    };
    const result = evaluateDanPromotion(progress, 10, 30, true, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('shodan');
  });

  test('not dan_eligible → null', () => {
    const progress: UserProgress = {
      uid: 'test',
      nickname: 'Test',
      kyuiLevel: 'beginner',
      danLevel: null,
      danEligible: false,
      denLevel: null,
      denEligible: false,
      utakuraiLevel: null,
      seasonScores: {},
      officialWinCount: 0,
      championCount: 0,
      totalOfficialMatches: 0,
      createdAt: ts('2026-01-01T00:00:00+09:00'),
      updatedAt: ts('2026-01-01T00:00:00+09:00'),
    };
    const result = evaluateDanPromotion(progress, 1, 30, true, mockRuleset);
    expect(result).toBeNull();
  });

  test('no skip dan (飛び段禁止): shodan → nidan only', () => {
    const progress: UserProgress = {
      uid: 'test',
      nickname: 'Test',
      kyuiLevel: 'rokkyu',
      danLevel: 'shodan',
      danEligible: true,
      denLevel: null,
      denEligible: false,
      utakuraiLevel: null,
      seasonScores: {},
      officialWinCount: 0,
      championCount: 0,
      totalOfficialMatches: 10,
      createdAt: ts('2026-01-01T00:00:00+09:00'),
      updatedAt: ts('2026-01-01T00:00:00+09:00'),
    };
    const result = evaluateDanPromotion(progress, 3, 30, true, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('nidan');
  });
});

// =============================================================================
// Validation
// =============================================================================

describe('validateSeasonCalendar', () => {
  test('valid calendar → no errors', () => {
    const errors = validateSeasonCalendar(mockCalendar);
    expect(errors).toHaveLength(0);
  });

  test('missing boundaries → error', () => {
    const errors = validateSeasonCalendar({ ...mockCalendar, boundaries: [] as any });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateRuleset', () => {
  test('valid ruleset → no errors', () => {
    const errors = validateRuleset(mockRuleset);
    expect(errors).toHaveLength(0);
  });

  test('missing version → error', () => {
    const errors = validateRuleset({ ...mockRuleset, version: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  // T1: YAMLパース失敗時（yamlContent空）は拒否
  test('missing yamlContent → error', () => {
    const errors = validateRuleset({ ...mockRuleset, yamlContent: '' });
    expect(errors).toContain('yamlContent is required');
  });

  test('missing officialMinParticipants → error', () => {
    const errors = validateRuleset({ ...mockRuleset, officialMinParticipants: 0 });
    expect(errors).toContain('officialMinParticipants must be >= 1');
  });
});

// =============================================================================
// T2: Season Calendar Validation (acceptance)
// =============================================================================

describe('T2: validateSeasonCalendar acceptance', () => {
  test('periods are monotonically increasing (no gap)', () => {
    const errors = validateSeasonCalendar(mockCalendar);
    expect(errors).toHaveLength(0);
  });

  test('gap between periods → error', () => {
    const gapCalendar: SeasonCalendar = {
      ...mockCalendar,
      periods: [
        { seasonId: 'spring', label: '春戦', start_at: ts('2026-02-04T00:00:00+09:00'), end_at: ts('2026-05-04T00:00:00+09:00') }, // gap: end 5/4, next start 5/5
        { seasonId: 'summer', label: '夏戦', start_at: ts('2026-05-05T00:00:00+09:00'), end_at: ts('2026-08-07T00:00:00+09:00') },
        { seasonId: 'autumn', label: '秋戦', start_at: ts('2026-08-07T00:00:00+09:00'), end_at: ts('2026-11-07T00:00:00+09:00') },
        { seasonId: 'winter', label: '冬戦', start_at: ts('2026-11-07T00:00:00+09:00'), end_at: ts('2027-02-03T00:00:00+09:00') },
      ],
    };
    const errors = validateSeasonCalendar(gapCalendar);
    expect(errors.some((e) => e.includes('Gap or overlap'))).toBe(true);
  });

  test('winter.end_at != risshun_next → error', () => {
    const badWinter: SeasonCalendar = {
      ...mockCalendar,
      periods: [
        ...mockCalendar.periods.filter((p) => p.seasonId !== 'winter'),
        { seasonId: 'winter', label: '冬戦', start_at: ts('2026-11-07T00:00:00+09:00'), end_at: ts('2027-02-04T00:00:00+09:00') }, // wrong: 2/4 instead of 2/3
      ],
    };
    const errors = validateSeasonCalendar(badWinter);
    expect(errors.some((e) => e.includes('winter.end_at must equal risshun_next'))).toBe(true);
  });

  test('missing required boundary marker → error', () => {
    const missingMarker: SeasonCalendar = {
      ...mockCalendar,
      boundaries: mockCalendar.boundaries.filter((b) => b.marker !== 'rikka'),
    };
    const errors = validateSeasonCalendar(missingMarker);
    expect(errors.some((e) => e.includes('boundaries must have exactly 5'))).toBe(true);
  });

  test('missing required season → error', () => {
    const missingSeason: SeasonCalendar = {
      ...mockCalendar,
      periods: mockCalendar.periods.filter((p) => p.seasonId !== 'autumn'),
    };
    const errors = validateSeasonCalendar(missingSeason);
    expect(errors.some((e) => e.includes('periods must have exactly 4'))).toBe(true);
  });
});

// =============================================================================
// T3: Event write pipeline — season/tier (acceptance)
// =============================================================================

describe('T3: determineSeason boundary cases', () => {
  // startAt on period boundary: [start_at, end_at) → belongs to the period starting at that time
  test('exactly at rikka (start of summer) → summer', () => {
    const result = determineSeason(mockCalendar, new Date('2026-05-05T00:00:00+09:00'));
    expect(result).toEqual({ seasonId: 'summer', seasonYear: 2026 });
  });

  test('1ms before rikka → still spring', () => {
    const rikkaMs = new Date('2026-05-05T00:00:00+09:00').getTime();
    const result = determineSeason(mockCalendar, new Date(rikkaMs - 1));
    expect(result).toEqual({ seasonId: 'spring', seasonYear: 2026 });
  });

  test('exactly at rittou → winter', () => {
    const result = determineSeason(mockCalendar, new Date('2026-11-07T00:00:00+09:00'));
    expect(result).toEqual({ seasonId: 'winter', seasonYear: 2026 });
  });

  test('winter end (risshun_next) → null (next year calendar needed)', () => {
    const result = determineSeason(mockCalendar, new Date('2027-02-03T00:00:00+09:00'));
    expect(result).toBeNull();
  });
});

describe('T3: determineTier acceptance', () => {
  test('exactly 24 → official', () => {
    expect(determineTier(24, 24)).toBe('official');
  });

  test('1 participant → provisional', () => {
    expect(determineTier(1, 24)).toBe('provisional');
  });
});

// =============================================================================
// T4: Kyui exam immediate promotion (acceptance)
// =============================================================================

describe('T4: kyui exam acceptance', () => {
  test('accuracy_min met → 1 step promotion only', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 7,
      correctCount: 6, // 85.7% > 80%
      totalElapsedMs: 30000,
      allCards: false,
      passRate: 85.7,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    expect(result.promoted).toBe(true);
    expect(result.newLevel).toBe('jyukkyu');
  });

  test('accuracy below min → no promotion', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 10,
      correctCount: 7, // 70% < 80%
      totalElapsedMs: 30000,
      allCards: false,
      passRate: 70,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    expect(result.promoted).toBe(false);
  });

  test('insufficient questionCount → no promotion', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: 1,
      questionCount: 5, // need 7 for jyukkyu
      correctCount: 5, // 100%
      totalElapsedMs: 30000,
      allCards: false,
      passRate: 100,
      passed: false,
    };
    const result = evaluateKyuiPromotion('beginner', examData, mockRuleset);
    expect(result.promoted).toBe(false);
  });

  test('rokkyu is max level → no further promotion', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: null,
      questionCount: 100,
      correctCount: 100,
      totalElapsedMs: 60000,
      allCards: true,
      passRate: 100,
      passed: false,
    };
    const result = evaluateKyuiPromotion('rokkyu', examData, mockRuleset);
    expect(result.promoted).toBe(false);
    expect(result.newLevel).toBe('rokkyu');
    expect(result.danEligible).toBe(true); // already at rokkyu
  });

  test('nanakyu → rokkyu requires allCards=true', () => {
    const examData: KyuiExamEventData = {
      kimarijiFuda: null,
      questionCount: 50,
      correctCount: 50,
      totalElapsedMs: 60000,
      allCards: false, // requirement is allCards: true
      passRate: 100,
      passed: false,
    };
    const result = evaluateKyuiPromotion('nanakyu', examData, mockRuleset);
    expect(result.promoted).toBe(false);
  });
});

// =============================================================================
// T7: Dan promotion on finalize (acceptance)
// =============================================================================

describe('T7: evaluateDanPromotion acceptance', () => {
  const baseProgress: UserProgress = {
    uid: 'test',
    nickname: 'Test',
    kyuiLevel: 'rokkyu',
    danLevel: null,
    danEligible: true,
    denLevel: null,
    denEligible: false,
    utakuraiLevel: null,
    seasonScores: {},
    officialWinCount: 0,
    championCount: 0,
    totalOfficialMatches: 5,
    createdAt: ts('2026-01-01T00:00:00+09:00'),
    updatedAt: ts('2026-01-01T00:00:00+09:00'),
  };

  // participants=24, placement=12 → rank/total = 12/24 = 0.5 <= 0.5 → shodan
  test('participants=24, placement=12 → shodan (top half boundary)', () => {
    const result = evaluateDanPromotion(baseProgress, 12, 24, true, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('shodan');
  });

  // participants=24, placement=13 → 13/24 = 0.5417 > 0.5 → no promotion
  test('participants=24, placement=13 → no promotion', () => {
    const result = evaluateDanPromotion(baseProgress, 13, 24, true, mockRuleset);
    expect(result).toBeNull();
  });

  // 飛び段禁止: even if rank 5 out of 24 (top 1/3), can only get shodan first
  test('飛び段禁止: no dan yet, rank 5/24 → shodan only', () => {
    const result = evaluateDanPromotion(baseProgress, 5, 24, true, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('shodan'); // not nidan
  });

  // allCards not used → no promotion
  test('allCards=false → no promotion', () => {
    const result = evaluateDanPromotion(baseProgress, 5, 24, false, mockRuleset);
    expect(result).toBeNull();
  });

  // already shodan, rank 5/24 → 5/24=0.208 <= 0.33 → nidan
  test('shodan + top 1/3 → nidan', () => {
    const progress = { ...baseProgress, danLevel: 'shodan' as const };
    const result = evaluateDanPromotion(progress, 5, 24, true, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('nidan');
  });
});

// =============================================================================
// T8: Den/Utakurai promotion on finalize (acceptance)
// =============================================================================

describe('T8: evaluateDenPromotion acceptance', () => {
  const baseProgress: UserProgress = {
    uid: 'test',
    nickname: 'Test',
    kyuiLevel: 'rokkyu',
    danLevel: 'rokudan',
    danEligible: true,
    denLevel: null,
    denEligible: true,
    utakuraiLevel: null,
    seasonScores: {},
    officialWinCount: 0,
    championCount: 0,
    totalOfficialMatches: 10,
    createdAt: ts('2026-01-01T00:00:00+09:00'),
    updatedAt: ts('2026-01-01T00:00:00+09:00'),
  };

  test('denEligible + officialWinCount>=3 → shoden', () => {
    const progress = { ...baseProgress, officialWinCount: 3 };
    const result = evaluateDenPromotion(progress, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('shoden');
  });

  test('denEligible + officialWinCount<3 → no promotion', () => {
    const progress = { ...baseProgress, officialWinCount: 2 };
    const result = evaluateDenPromotion(progress, mockRuleset);
    expect(result).toBeNull();
  });

  test('not denEligible → null (even with enough wins)', () => {
    const progress = { ...baseProgress, denEligible: false, officialWinCount: 10 };
    const result = evaluateDenPromotion(progress, mockRuleset);
    expect(result).toBeNull();
  });
});

describe('T8: evaluateUtakuraiPromotion acceptance', () => {
  const baseProgress: UserProgress = {
    uid: 'test',
    nickname: 'Test',
    kyuiLevel: 'rokkyu',
    danLevel: 'rokudan',
    danEligible: true,
    denLevel: 'kaiden',
    denEligible: true,
    utakuraiLevel: null,
    seasonScores: {},
    officialWinCount: 10,
    championCount: 0,
    totalOfficialMatches: 20,
    createdAt: ts('2026-01-01T00:00:00+09:00'),
    updatedAt: ts('2026-01-01T00:00:00+09:00'),
  };

  test('championCount>=4 → meijin', () => {
    const progress = { ...baseProgress, championCount: 4 };
    const result = evaluateUtakuraiPromotion(progress, mockRuleset);
    expect(result?.promoted).toBe(true);
    expect(result?.newLevel).toBe('meijin');
  });

  test('championCount<4 → no promotion', () => {
    const progress = { ...baseProgress, championCount: 3 };
    const result = evaluateUtakuraiPromotion(progress, mockRuleset);
    expect(result).toBeNull();
  });
});

// =============================================================================
// T9: isSeasonFrozen (acceptance)
// =============================================================================

describe('T9: isSeasonFrozen', () => {
  test('frozen → true', () => {
    expect(isSeasonFrozen('frozen')).toBe(true);
  });

  test('finalized → true', () => {
    expect(isSeasonFrozen('finalized')).toBe(true);
  });

  test('published → true', () => {
    expect(isSeasonFrozen('published')).toBe(true);
  });

  test('draft → false', () => {
    expect(isSeasonFrozen('draft')).toBe(false);
  });

  test('undefined → false', () => {
    expect(isSeasonFrozen(undefined)).toBe(false);
  });
});
