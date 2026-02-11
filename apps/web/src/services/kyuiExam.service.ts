/**
 * 102: 級位検定 - Frontend service
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface KyuiExamResult {
  passed: boolean;
  promoted: boolean;
  previousLevel: string;
  currentLevel: string;
  danEligible: boolean;
  passRate: number;
}

export async function submitKyuiExam(params: {
  kimarijiFuda: number | null;
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
}): Promise<KyuiExamResult> {
  const fn = httpsCallable<typeof params, KyuiExamResult>(functions, 'submitKyuiExam');
  const result = await fn(params);
  return result.data;
}
