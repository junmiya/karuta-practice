/**
 * Score calculation service for official sessions
 * Formula: base (correctCount * 100) + speedBonus (max(0, 300 - tSec))
 */

export interface ScoreInput {
  correctCount: number;
  totalElapsedMs: number;
}

export interface ScoreResult {
  score: number;
  base: number;
  speedBonus: number;
}

/**
 * Calculate score for an official session
 * @param input - correctCount and totalElapsedMs
 * @returns ScoreResult with score, base, and speedBonus
 */
export function calculateScore(input: ScoreInput): ScoreResult {
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
