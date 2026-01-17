"use strict";
/**
 * Score calculation service for official sessions
 * Formula: base (correctCount * 100) + speedBonus (max(0, 300 - tSec))
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScore = calculateScore;
/**
 * Calculate score for an official session
 * @param input - correctCount and totalElapsedMs
 * @returns ScoreResult with score, base, and speedBonus
 */
function calculateScore(input) {
    const { correctCount, totalElapsedMs } = input;
    // Base score: correctCount * 100
    const base = correctCount * 100;
    // Speed bonus: max(0, 300 - seconds)
    const tSec = totalElapsedMs / 1000;
    const speedBonus = Math.round(Math.max(0, 300 - tSec));
    // Total score (min 0)
    const score = Math.max(0, base + speedBonus);
    return {
        score,
        base,
        speedBonus,
    };
}
//# sourceMappingURL=scoreCalculator.js.map