/**
 * 102: 級位検定セッション管理hook
 */
import { useState, useCallback } from 'react';
import { submitKyuiExam, KyuiExamResult } from '@/services/kyuiExam.service';

export type ExamPhase = 'setup' | 'inProgress' | 'submitting' | 'result';

export function useKyuiExam() {
  const [phase, setPhase] = useState<ExamPhase>('setup');
  const [result, setResult] = useState<KyuiExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Exam config
  const [kimarijiFuda, setKimarijiFuda] = useState<number | null>(1);
  const [allCards, setAllCards] = useState(false);

  // In-progress state
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startExam = useCallback(() => {
    setPhase('inProgress');
    setStartTime(Date.now());
    setCorrectCount(0);
    setQuestionCount(0);
    setResult(null);
    setError(null);
  }, []);

  const submitExam = useCallback(async (finalCorrectCount: number, finalQuestionCount: number) => {
    setPhase('submitting');
    setError(null);

    const totalElapsedMs = startTime ? Date.now() - startTime : 0;

    try {
      const res = await submitKyuiExam({
        kimarijiFuda: allCards ? null : kimarijiFuda,
        questionCount: finalQuestionCount,
        correctCount: finalCorrectCount,
        totalElapsedMs,
        allCards,
      });
      setResult(res);
      setPhase('result');
    } catch (err: any) {
      setError(err.message || '検定の送信に失敗しました');
      setPhase('inProgress');
    }
  }, [startTime, kimarijiFuda, allCards]);

  const reset = useCallback(() => {
    setPhase('setup');
    setResult(null);
    setError(null);
    setStartTime(null);
  }, []);

  return {
    phase,
    result,
    error,
    kimarijiFuda,
    setKimarijiFuda,
    allCards,
    setAllCards,
    questionCount,
    setQuestionCount,
    correctCount,
    setCorrectCount,
    startExam,
    submitExam,
    reset,
  };
}
