/**
 * Calculate score based on correct answers and time
 * Formula: max(0, correctCount * 100 + round(max(0, 300 - elapsedMs/1000)))
 *
 * - 10 correct answers = 1000 base points
 * - Time bonus: up to 300 points (for completing in 0 seconds)
 * - Time penalty: loses 1 point per second
 * - Max possible score: 1300 (10 correct + 0 seconds)
 * - Min score: 0
 */
export function calculateScore(
  correctCount: number,
  totalElapsedMs: number
): number {
  const baseScore = correctCount * 100;
  const elapsedSeconds = totalElapsedMs / 1000;
  const timeBonus = Math.round(Math.max(0, 300 - elapsedSeconds));
  return Math.max(0, baseScore + timeBonus);
}
