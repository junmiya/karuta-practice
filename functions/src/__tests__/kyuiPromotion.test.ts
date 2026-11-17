/**
 * 級位検定の昇級判定（本番の旧IDルールセット・1字決まり7問への対応）
 */
import { evaluateKyuiPromotion, resolveKyuiRequirements } from '../lib/ruleEngine';
import type { Ruleset, KyuiExamEventData, KyuiLevel } from '../types/utaawase';

const exam = (over: Partial<KyuiExamEventData>): KyuiExamEventData => ({
  kimarijiFuda: 1,
  questionCount: 7,
  correctCount: 6,
  totalElapsedMs: 60_000,
  allCards: false,
  passRate: 0,
  passed: false,
  ...over,
});

/** 本番 rulesets/current と同じ旧IDの級位条件 */
const legacyRuleset = {
  kyuiRequirements: [
    { level: 'beginner', label: '初級', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
    { level: 'jyukkyu', label: '二級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
    { level: 'kyukyu', label: '三級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
    { level: 'hachikyu', label: '四級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
    { level: 'nanakyu', label: '五級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
    { level: 'rokkyu', label: '六級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
  ],
} as unknown as Ruleset;

/** 新IDの級位条件（adminSeedDefaultRuleset と同じ） */
const currentRuleset = {
  kyuiRequirements: [
    { level: 'minarai', label: '見習', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
    { level: 'shokkyu', label: '初級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
    { level: 'nikyu', label: '二級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
    { level: 'sankyu', label: '三級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
    { level: 'yonkyu', label: '四級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
    { level: 'gokyu', label: '五級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
    { level: 'rokkyu', label: '六級', kimarijiFuda: null, questionCount: 50, passRate: 90, allCards: true },
  ],
} as unknown as Ruleset;

describe.each([
  ['旧IDのルールセット', legacyRuleset],
  ['新IDのルールセット', currentRuleset],
])('初級検定（%s）', (_name, ruleset) => {
  test('1字決まり 7問中6問正解（86%）で 見習 → 初級', () => {
    const r = evaluateKyuiPromotion('minarai', exam({ questionCount: 7, correctCount: 6 }), ruleset);
    expect(r).toEqual({ promoted: true, newLevel: 'shokkyu', danEligible: false });
  });

  test('ちょうど80%（10問中8問）でも合格', () => {
    const r = evaluateKyuiPromotion('minarai', exam({ questionCount: 10, correctCount: 8 }), ruleset);
    expect(r.promoted).toBe(true);
  });

  test('7問中5問（71%）は不合格', () => {
    const r = evaluateKyuiPromotion('minarai', exam({ questionCount: 7, correctCount: 5 }), ruleset);
    expect(r).toEqual({ promoted: false, newLevel: 'minarai', danEligible: false });
  });

  test('対象の札（7枚）より少ない出題は不合格', () => {
    const r = evaluateKyuiPromotion('minarai', exam({ questionCount: 5, correctCount: 5 }), ruleset);
    expect(r.promoted).toBe(false);
  });

  test('違う決まり字の検定では昇級しない', () => {
    const r = evaluateKyuiPromotion('minarai', exam({ kimarijiFuda: 2, questionCount: 42, correctCount: 42 }), ruleset);
    expect(r.promoted).toBe(false);
  });
});

test('旧IDの級位条件は新IDに読み替える（旧 rokkyu は五級）', () => {
  const levels = resolveKyuiRequirements(legacyRuleset).map(r => [r.level, r.kimarijiFuda]);
  expect(levels).toEqual([
    ['minarai', null], ['shokkyu', 1], ['nikyu', 2], ['sankyu', 3], ['yonkyu', 4], ['gokyu', 5],
  ]);
});

test('五級 → 六級（旧ルールセットに条件が無い）は規定の条件（全札・90%）で判定', () => {
  const pass = evaluateKyuiPromotion('gokyu', exam({ kimarijiFuda: null, allCards: true, questionCount: 50, correctCount: 45 }), legacyRuleset);
  expect(pass).toEqual({ promoted: true, newLevel: 'rokkyu', danEligible: true });
  const fail = evaluateKyuiPromotion('gokyu', exam({ kimarijiFuda: null, allCards: true, questionCount: 50, correctCount: 44 }), legacyRuleset);
  expect(fail.promoted).toBe(false);
});

test('2字決まり（42枚）は規定の10問以上で判定', () => {
  const r = evaluateKyuiPromotion('shokkyu', exam({ kimarijiFuda: 2, questionCount: 42, correctCount: 34 }), legacyRuleset);
  expect(r).toEqual({ promoted: true, newLevel: 'nikyu', danEligible: false });
});

test('旧IDで保存された級位（beginner）も見習として扱う', () => {
  const r = evaluateKyuiPromotion('beginner' as KyuiLevel, exam({}), legacyRuleset);
  expect(r.newLevel).toBe('shokkyu');
});
