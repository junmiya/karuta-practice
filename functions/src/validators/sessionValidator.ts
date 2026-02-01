/**
 * Session validator with 5 anomaly detection rules
 * Per constitution v7.0.0 and data-model.md
 */

export interface Round {
  roundIndex: number;
  correctPoemId: string;
  choices: string[];
  selectedPoemId: string;
  isCorrect: boolean;
  clientElapsedMs: number;
}

export interface SessionData {
  correctCount?: number;
  totalElapsedMs?: number;
  roundCount?: number;
}

export type InvalidReason =
  | 'ROUND_COUNT_MISMATCH'
  | 'ROUND_INDEX_DUPLICATE'
  | 'INVALID_SELECTION'
  | 'TOO_FAST'
  | 'TOO_SLOW'
  | 'INVALID_CORRECT_COUNT';

export interface ValidationResult {
  isValid: boolean;
  reasons: InvalidReason[];
  reasonCodes: string[];
  ruleVersion: string;
}

// Current rule version for audit tracking
export const RULE_VERSION = '1.1.0';

/**
 * Validate a session against 5 anomaly detection rules
 * @param session - Session data
 * @param rounds - Array of round data
 * @returns ValidationResult with isValid flag and reasons array
 */
export function validateSession(
  session: SessionData,
  rounds: Round[]
): ValidationResult {
  const reasons: InvalidReason[] = [];
  const expectedRoundCount = session.roundCount || 50;

  // Rule 1: Round count must match expected
  if (rounds.length !== expectedRoundCount) {
    reasons.push('ROUND_COUNT_MISMATCH');
  }

  // Rule 2: Round indices must be unique (0 to roundCount-1)
  const indices = new Set(rounds.map((r) => r.roundIndex));
  if (indices.size !== expectedRoundCount) {
    reasons.push('ROUND_INDEX_DUPLICATE');
  }

  // Rule 3: Selected poem must be in choices
  for (const round of rounds) {
    if (!round.choices.includes(round.selectedPoemId)) {
      reasons.push('INVALID_SELECTION');
      break; // Only add once
    }
  }

  // Rule 4: Too fast - clientElapsedMs < 200ms for 5+ rounds (or 3+ for short sessions)
  const fastRounds = rounds.filter((r) => r.clientElapsedMs < 200);
  const fastThreshold = expectedRoundCount <= 10 ? 3 : 5;
  if (fastRounds.length >= fastThreshold) {
    reasons.push('TOO_FAST');
  }

  // Rule 5: Too slow - clientElapsedMs > 60000ms for any round
  const slowRounds = rounds.filter((r) => r.clientElapsedMs > 60000);
  if (slowRounds.length >= 1) {
    reasons.push('TOO_SLOW');
  }

  // Rule 6: correctCount must be in valid range (0-roundCount)
  if (
    session.correctCount !== undefined &&
    (session.correctCount < 0 || session.correctCount > expectedRoundCount)
  ) {
    reasons.push('INVALID_CORRECT_COUNT');
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    reasonCodes: reasons, // InvalidReason types are already code-like
    ruleVersion: RULE_VERSION,
  };
}

/**
 * Calculate correctCount from rounds
 */
export function calculateCorrectCount(rounds: Round[]): number {
  return rounds.filter((r) => r.isCorrect).length;
}

/**
 * Calculate totalElapsedMs from rounds
 */
export function calculateTotalElapsedMs(rounds: Round[]): number {
  return rounds.reduce((sum, r) => sum + r.clientElapsedMs, 0);
}
