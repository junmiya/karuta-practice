"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KYUI_REQUIREMENTS = void 0;
exports.determineSeason = determineSeason;
exports.determineTier = determineTier;
exports.resolveKyuiRequirements = resolveKyuiRequirements;
exports.evaluateKyuiPromotion = evaluateKyuiPromotion;
exports.evaluateDanPromotion = evaluateDanPromotion;
exports.evaluateDenPromotion = evaluateDenPromotion;
exports.evaluateUtakuraiPromotion = evaluateUtakuraiPromotion;
exports.validateSeasonCalendar = validateSeasonCalendar;
exports.validateRuleset = validateRuleset;
exports.isSeasonFrozen = isSeasonFrozen;
/**
 * 102: 歌合・節気別歌位確定 - ルールエンジン (純関数)
 */
const utaawase_1 = require("../types/utaawase");
// =============================================================================
// Season / Tier determination
// =============================================================================
/**
 * 日時から四季区分を判定 (半開区間 [start_at, end_at))
 * @returns { seasonId, seasonYear } or null if no matching period
 */
function determineSeason(calendar, eventDate) {
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
function determineTier(participantCount, officialMinParticipants) {
    if (participantCount === null)
        return null; // kyui_exam
    return participantCount >= officialMinParticipants ? 'official' : 'provisional';
}
// =============================================================================
// 級位検定 (Kyui) promotion
// =============================================================================
/** 字決まり別の札数（1字〜6字決まり） */
const KIMARIJI_POEM_COUNTS = [7, 42, 37, 6, 2, 6];
/**
 * 旧ルールセットの級位ID（並び順で新IDに対応する。旧 rokkyu は「五級（5字決まり）」）。
 * 本番の rulesets/current がこの旧IDのまま残っていて、新IDで条件を探すと見つからず誰も合格できなかった。
 */
const LEGACY_KYUI_ORDER = ['beginner', 'jyukkyu', 'kyukyu', 'hachikyu', 'nanakyu', 'rokkyu'];
/** 規定の昇級条件（ルールセットに無い級位はこれを使う。adminSeedDefaultRuleset と同じ値） */
exports.DEFAULT_KYUI_REQUIREMENTS = [
    { level: 'minarai', label: '見習', kimarijiFuda: null, questionCount: 0, passRate: 0, allCards: false },
    { level: 'shokkyu', label: '初級', kimarijiFuda: 1, questionCount: 10, passRate: 80, allCards: false },
    { level: 'nikyu', label: '二級', kimarijiFuda: 2, questionCount: 10, passRate: 80, allCards: false },
    { level: 'sankyu', label: '三級', kimarijiFuda: 3, questionCount: 10, passRate: 80, allCards: false },
    { level: 'yonkyu', label: '四級', kimarijiFuda: 4, questionCount: 10, passRate: 80, allCards: false },
    { level: 'gokyu', label: '五級', kimarijiFuda: 5, questionCount: 10, passRate: 80, allCards: false },
    { level: 'rokkyu', label: '六級', kimarijiFuda: null, questionCount: 50, passRate: 90, allCards: true },
];
/** ルールセットの級位条件を新IDにそろえる（旧IDのルールセットにも対応） */
function resolveKyuiRequirements(ruleset) {
    const reqs = ruleset.kyuiRequirements ?? [];
    const isLegacy = reqs.some((r) => r.level === 'beginner');
    if (!isLegacy)
        return reqs;
    return reqs.map((r) => {
        const i = LEGACY_KYUI_ORDER.indexOf(r.level);
        return i >= 0 ? { ...r, level: utaawase_1.KYUI_LEVELS_ORDERED[i] } : r;
    });
}
/** 利用者の級位を新IDにそろえる（旧IDで保存されている場合） */
function normalizeKyuiLevel(level) {
    if (utaawase_1.KYUI_LEVELS_ORDERED.includes(level))
        return level;
    const i = LEGACY_KYUI_ORDER.indexOf(level);
    return i >= 0 ? utaawase_1.KYUI_LEVELS_ORDERED[i] : 'minarai';
}
/**
 * 必要な出題数。対象の札がそれより少ない（1字決まり=7枚など）ときは、対象の札をすべて出題すればよい
 */
function requiredQuestionCount(requirement) {
    const n = Number(requirement.questionCount) || 0;
    if (requirement.allCards)
        return Math.min(n, 100);
    const k = requirement.kimarijiFuda == null ? null : Number(requirement.kimarijiFuda);
    if (k !== null && k >= 1 && k <= KIMARIJI_POEM_COUNTS.length) {
        return Math.min(n, KIMARIJI_POEM_COUNTS[k - 1]);
    }
    return n;
}
/**
 * 級位検定の合格判定 + 昇級先を返す
 * 飛び級禁止: 現在レベルの次のレベルにのみ昇級可能
 */
function evaluateKyuiPromotion(currentLevel, examData, ruleset) {
    currentLevel = normalizeKyuiLevel(currentLevel);
    const currentIndex = utaawase_1.KYUI_LEVELS_ORDERED.indexOf(currentLevel);
    const nextIndex = currentIndex + 1;
    // Already at max level (六級)
    if (nextIndex >= utaawase_1.KYUI_LEVELS_ORDERED.length) {
        return { promoted: false, newLevel: currentLevel, danEligible: currentLevel === 'rokkyu' };
    }
    const nextLevel = utaawase_1.KYUI_LEVELS_ORDERED[nextIndex];
    const requirement = resolveKyuiRequirements(ruleset).find((r) => r.level === nextLevel) ??
        exports.DEFAULT_KYUI_REQUIREMENTS.find((r) => r.level === nextLevel);
    if (!requirement) {
        return { promoted: false, newLevel: currentLevel, danEligible: false };
    }
    // Check conditions
    const actualPassRate = examData.questionCount > 0
        ? (examData.correctCount / examData.questionCount) * 100
        : 0;
    const passRateMet = actualPassRate >= Number(requirement.passRate);
    const cardRequirementMet = requirement.allCards
        ? examData.allCards
        : requirement.kimarijiFuda == null || Number(examData.kimarijiFuda) === Number(requirement.kimarijiFuda);
    const questionCountMet = examData.questionCount >= requiredQuestionCount(requirement);
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
function evaluateDanPromotion(progress, seasonRank, totalParticipants, allCardsUsed, ruleset) {
    if (!progress.danEligible)
        return null;
    const currentLevel = progress.danLevel;
    const currentIndex = currentLevel ? utaawase_1.DAN_LEVELS_ORDERED.indexOf(currentLevel) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= utaawase_1.DAN_LEVELS_ORDERED.length)
        return null;
    const nextLevel = utaawase_1.DAN_LEVELS_ORDERED[nextIndex];
    const requirement = ruleset.danRequirements.find((r) => r.level === nextLevel);
    if (!requirement)
        return null;
    // Must use all cards
    if (requirement.allCardsRequired && !allCardsUsed)
        return null;
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
function evaluateDenPromotion(progress, ruleset) {
    if (!progress.denEligible)
        return null;
    const currentLevel = progress.denLevel;
    const currentIndex = currentLevel ? utaawase_1.DEN_LEVELS_ORDERED.indexOf(currentLevel) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= utaawase_1.DEN_LEVELS_ORDERED.length)
        return null;
    const nextLevel = utaawase_1.DEN_LEVELS_ORDERED[nextIndex];
    const requirement = ruleset.denRequirements.find((r) => r.level === nextLevel);
    if (!requirement)
        return null;
    if (progress.officialWinCount >= requirement.officialWinCount) {
        return { promoted: true, newLevel: nextLevel };
    }
    return null;
}
// =============================================================================
// 歌位 (Utakurai) promotion — season-end only
// =============================================================================
function evaluateUtakuraiPromotion(progress, ruleset) {
    const currentLevel = progress.utakuraiLevel;
    const currentIndex = currentLevel ? utaawase_1.UTAKURAI_LEVELS_ORDERED.indexOf(currentLevel) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= utaawase_1.UTAKURAI_LEVELS_ORDERED.length)
        return null;
    const nextLevel = utaawase_1.UTAKURAI_LEVELS_ORDERED[nextIndex];
    const requirement = ruleset.utakuraiRequirements.find((r) => r.level === nextLevel);
    if (!requirement)
        return null;
    if (progress.championCount >= requirement.championCount) {
        return { promoted: true, newLevel: nextLevel };
    }
    return null;
}
// =============================================================================
// Validation
// =============================================================================
function validateSeasonCalendar(calendar) {
    const errors = [];
    if (!calendar.year || calendar.year < 2024 || calendar.year > 2100) {
        errors.push('year must be between 2024 and 2100');
    }
    if (!calendar.boundaries || calendar.boundaries.length !== 5) {
        errors.push('boundaries must have exactly 5 entries (risshun, rikka, risshuu, rittou, risshun_next)');
    }
    else {
        const requiredMarkers = ['risshun', 'rikka', 'risshuu', 'rittou', 'risshun_next'];
        const foundMarkers = calendar.boundaries.map((b) => b.marker);
        for (const marker of requiredMarkers) {
            if (!foundMarkers.includes(marker)) {
                errors.push(`Missing boundary marker: ${marker}`);
            }
        }
    }
    if (!calendar.periods || calendar.periods.length !== 4) {
        errors.push('periods must have exactly 4 entries (spring, summer, autumn, winter)');
    }
    else {
        const requiredSeasons = ['spring', 'summer', 'autumn', 'winter'];
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
function validateRuleset(ruleset) {
    const errors = [];
    if (!ruleset.version)
        errors.push('version is required');
    if (!ruleset.yamlContent)
        errors.push('yamlContent is required');
    if (!ruleset.kyuiRequirements?.length)
        errors.push('kyuiRequirements are required');
    if (!ruleset.danRequirements?.length)
        errors.push('danRequirements are required');
    if (!ruleset.denRequirements?.length)
        errors.push('denRequirements are required');
    if (!ruleset.utakuraiRequirements?.length)
        errors.push('utakuraiRequirements are required');
    if (!ruleset.officialMinParticipants || ruleset.officialMinParticipants < 1) {
        errors.push('officialMinParticipants must be >= 1');
    }
    return errors;
}
/**
 * Check if a season period is currently frozen
 */
function isSeasonFrozen(snapshotStatus) {
    return snapshotStatus === 'frozen' || snapshotStatus === 'finalized' || snapshotStatus === 'published';
}
//# sourceMappingURL=ruleEngine.js.map