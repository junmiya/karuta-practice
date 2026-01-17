export interface AnomalyResult {
  isValid: boolean;
  reasons: string[];
}

/**
 * Detect anomalies in submission data
 * Rules:
 * 1. totalElapsedMs must be >= 2000ms (2 seconds minimum)
 * 2. correctCount must be between 0 and questionCount (inclusive)
 * 3. questionCount must be exactly 10
 */
export function detectAnomalies(
  questionCount: number,
  correctCount: number,
  totalElapsedMs: number
): AnomalyResult {
  const reasons: string[] = [];

  // Rule 1: Minimum time check (2 seconds)
  if (totalElapsedMs < 2000) {
    reasons.push('回答時間が短すぎます（2秒未満）');
  }

  // Rule 2: correctCount range check
  if (correctCount < 0 || correctCount > questionCount) {
    reasons.push('正答数が不正です');
  }

  // Rule 3: questionCount must be 10
  if (questionCount !== 10) {
    reasons.push('問題数が10問ではありません');
  }

  // Rule 4: avgMs sanity check (minimum 100ms per question)
  const avgMs = totalElapsedMs / questionCount;
  if (avgMs < 100) {
    reasons.push('平均回答時間が短すぎます');
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}
