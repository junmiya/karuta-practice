/**
 * Hook for managing official competition sessions
 */

import { useState, useCallback, useMemo } from 'react';
import type { Poem } from '@/types/poem';
import type { Round } from '@/types/session';
import { getAllPoemsSync } from '@/services/poems.service';
import {
  createSession,
  saveRound,
  submitSession,
  generateChoices,
  SubmitResponse,
} from '@/services/session.service';

interface UseOfficialSessionOptions {
  uid: string;
  seasonId: string;
  entryId: string;
}

interface OfficialSessionState {
  sessionId: string | null;
  currentRoundIndex: number;
  rounds: Round[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  result: SubmitResponse | null;
}

export function useOfficialSession(options: UseOfficialSessionOptions) {
  const { uid, seasonId, entryId } = options;
  const allPoems = useMemo(() => getAllPoemsSync(), []);
  const allPoemIds = useMemo(() => allPoems.map((p) => p.poemId), [allPoems]);

  const [state, setState] = useState<OfficialSessionState>({
    sessionId: null,
    currentRoundIndex: 0,
    rounds: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    result: null,
  });

  // Generate question order (50 random poems)
  const [questionOrder, setQuestionOrder] = useState<Poem[]>([]);

  // Current question data
  const currentQuestion = useMemo(() => {
    if (state.currentRoundIndex >= 50 || questionOrder.length === 0) {
      return null;
    }

    const poem = questionOrder[state.currentRoundIndex];
    const choices = generateChoices(poem.poemId, allPoemIds);
    const choicePoems = choices
      .map((id) => allPoems.find((p) => p.poemId === id))
      .filter((p): p is Poem => p !== undefined);

    return {
      roundIndex: state.currentRoundIndex,
      poem,
      choices,
      choicePoems,
    };
  }, [state.currentRoundIndex, questionOrder, allPoemIds, allPoems]);

  // Start a new session
  const startSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create session in Firestore
      const sessionId = await createSession(uid, seasonId, entryId);

      // Generate random question order (50 poems)
      const shuffled = [...allPoems].sort(() => Math.random() - 0.5);
      const questions = shuffled.slice(0, 50);

      setQuestionOrder(questions);
      setState((prev) => ({
        ...prev,
        sessionId,
        currentRoundIndex: 0,
        rounds: [],
        isLoading: false,
      }));

      return sessionId;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'セッション作成に失敗しました',
      }));
      return null;
    }
  }, [uid, seasonId, entryId, allPoems]);

  // Answer current question
  const answerQuestion = useCallback(
    async (selectedPoemId: string, elapsedMs: number) => {
      if (!state.sessionId || !currentQuestion) return;

      const round: Round = {
        roundIndex: currentQuestion.roundIndex,
        correctPoemId: currentQuestion.poem.poemId,
        choices: currentQuestion.choices,
        selectedPoemId,
        isCorrect: selectedPoemId === currentQuestion.poem.poemId,
        clientElapsedMs: elapsedMs,
      };

      // Save round to Firestore
      try {
        await saveRound(state.sessionId, round);
      } catch (error) {
        console.error('Failed to save round:', error);
        // Continue anyway - the round data is stored locally
      }

      setState((prev) => ({
        ...prev,
        rounds: [...prev.rounds, round],
        currentRoundIndex: prev.currentRoundIndex + 1,
      }));
    },
    [state.sessionId, currentQuestion]
  );

  // Submit session for confirmation
  const submitForConfirmation = useCallback(async () => {
    if (!state.sessionId) return;

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const result = await submitSession(state.sessionId);
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        result,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : '提出に失敗しました',
      }));
      return null;
    }
  }, [state.sessionId]);

  // Calculate progress stats
  const stats = useMemo(() => {
    const correctCount = state.rounds.filter((r) => r.isCorrect).length;
    const totalElapsedMs = state.rounds.reduce(
      (sum, r) => sum + r.clientElapsedMs,
      0
    );
    const averageMs =
      state.rounds.length > 0 ? totalElapsedMs / state.rounds.length : 0;

    return {
      correctCount,
      totalCount: state.rounds.length,
      totalElapsedMs,
      averageMs,
      accuracy:
        state.rounds.length > 0
          ? Math.round((correctCount / state.rounds.length) * 100)
          : 0,
    };
  }, [state.rounds]);

  // Check if session is complete
  const isComplete = state.currentRoundIndex >= 50;

  return {
    // State
    sessionId: state.sessionId,
    currentRoundIndex: state.currentRoundIndex,
    currentQuestion,
    rounds: state.rounds,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    error: state.error,
    result: state.result,
    isComplete,
    stats,

    // Actions
    startSession,
    answerQuestion,
    submitForConfirmation,
  };
}
