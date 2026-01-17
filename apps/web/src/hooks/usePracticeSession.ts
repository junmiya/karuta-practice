import { useState, useCallback } from 'react';
import type { PracticeSession, Question } from '@/types/practice';
import { createPracticeSession, type PracticeFilter } from '@/services/practice.service';

interface UsePracticeSessionOptions {
  questionCount?: number;
  filter?: PracticeFilter;
}

export function usePracticeSession(options: UsePracticeSessionOptions = {}) {
  const { questionCount = 10, filter } = options;

  const [session, setSession] = useState<PracticeSession>(() =>
    createPracticeSession(questionCount, filter)
  );

  const currentQuestion: Question | null = session.isComplete
    ? null
    : session.questions[session.currentQuestionIndex];

  /**
   * Start timing for the current question
   */
  const startQuestion = useCallback(() => {
    setSession(prev => {
      const updated = { ...prev };
      const question = updated.questions[prev.currentQuestionIndex];
      if (question && !question.answered) {
        question.startTime = performance.now();
      }
      return updated;
    });
  }, []);

  /**
   * Answer the current question
   */
  const answerQuestion = useCallback((selectedIndex: number) => {
    setSession(prev => {
      const updated = { ...prev };
      const question = updated.questions[prev.currentQuestionIndex];

      if (!question || question.answered) {
        return prev;
      }

      // Calculate elapsed time
      const elapsedMs = Math.round(performance.now() - question.startTime);
      const isCorrect = selectedIndex === question.correctIndex;

      // Update question
      question.answered = true;
      question.selectedIndex = selectedIndex;
      question.elapsedMs = elapsedMs;
      question.isCorrect = isCorrect;

      // Update session stats
      updated.totalElapsedMs += elapsedMs;
      if (isCorrect) {
        updated.correctCount++;
      }

      return updated;
    });
  }, []);

  /**
   * Move to next question or complete session
   */
  const nextQuestion = useCallback(() => {
    setSession(prev => {
      const updated = { ...prev };
      const nextIndex = prev.currentQuestionIndex + 1;

      if (nextIndex >= prev.questions.length) {
        // Session complete
        updated.isComplete = true;
        updated.avgMs = updated.questions.length > 0
          ? Math.round(updated.totalElapsedMs / updated.questions.length)
          : 0;
      } else {
        updated.currentQuestionIndex = nextIndex;
      }

      return updated;
    });
  }, []);

  /**
   * Reset session with same options
   */
  const resetSession = useCallback(() => {
    setSession(createPracticeSession(questionCount, filter));
  }, [questionCount, filter]);

  return {
    session,
    currentQuestion,
    startQuestion,
    answerQuestion,
    nextQuestion,
    resetSession,
  };
}
