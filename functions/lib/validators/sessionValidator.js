"use strict";
/**
 * Session validator with 5 anomaly detection rules
 * Per constitution v7.0.0 and data-model.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULE_VERSION = void 0;
exports.validateSession = validateSession;
exports.calculateCorrectCount = calculateCorrectCount;
exports.calculateTotalElapsedMs = calculateTotalElapsedMs;
// Current rule version for audit tracking
exports.RULE_VERSION = '1.1.0';
/**
 * Validate a session against 5 anomaly detection rules
 * @param session - Session data
 * @param rounds - Array of round data
 * @returns ValidationResult with isValid flag and reasons array
 */
function validateSession(session, rounds) {
    const reasons = [];
    // Rule 1: Round count must be exactly 50
    if (rounds.length !== 50) {
        reasons.push('ROUND_COUNT_MISMATCH');
    }
    // Rule 2: Round indices must be unique (0-49)
    const indices = new Set(rounds.map((r) => r.roundIndex));
    if (indices.size !== 50) {
        reasons.push('ROUND_INDEX_DUPLICATE');
    }
    // Rule 3: Selected poem must be in choices
    for (const round of rounds) {
        if (!round.choices.includes(round.selectedPoemId)) {
            reasons.push('INVALID_SELECTION');
            break; // Only add once
        }
    }
    // Rule 4: Too fast - clientElapsedMs < 200ms for 5+ rounds
    const fastRounds = rounds.filter((r) => r.clientElapsedMs < 200);
    if (fastRounds.length >= 5) {
        reasons.push('TOO_FAST');
    }
    // Rule 5: Too slow - clientElapsedMs > 60000ms for any round
    const slowRounds = rounds.filter((r) => r.clientElapsedMs > 60000);
    if (slowRounds.length >= 1) {
        reasons.push('TOO_SLOW');
    }
    // Rule 6: correctCount must be in valid range (0-50)
    if (session.correctCount !== undefined &&
        (session.correctCount < 0 || session.correctCount > 50)) {
        reasons.push('INVALID_CORRECT_COUNT');
    }
    return {
        isValid: reasons.length === 0,
        reasons,
        reasonCodes: reasons, // InvalidReason types are already code-like
        ruleVersion: exports.RULE_VERSION,
    };
}
/**
 * Calculate correctCount from rounds
 */
function calculateCorrectCount(rounds) {
    return rounds.filter((r) => r.isCorrect).length;
}
/**
 * Calculate totalElapsedMs from rounds
 */
function calculateTotalElapsedMs(rounds) {
    return rounds.reduce((sum, r) => sum + r.clientElapsedMs, 0);
}
//# sourceMappingURL=sessionValidator.js.map