/**
 * Hook for managing official competition sessions
 * Uses card replacement model: correct=1 card replaced, incorrect=2 cards replaced
 * Remaining cards keep their positions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Poem } from '@/types/poem';
import type { Round } from '@/types/session';
import { getAllPoemsSync } from '@/services/poems.service';
import {
  createSession,
  saveRound,
  submitSession,
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
  currentCards: Poem[];       // 12 cards on the grid
  correctPoemId: string | null;  // current correct poem
  usedCorrectIds: string[];   // already used as correct (won't be reused)
  lastIsCorrect: boolean | null; // result of last answer (for replacement logic)
  lastSelectedId: string | null; // last selected poem ID
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  result: SubmitResponse | null;
}

function selectRandomPoems(poems: Poem[], count: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function useOfficialSession(options: UseOfficialSessionOptions) {
  const { uid, seasonId, entryId } = options;
  const allPoems = useMemo(() => getAllPoemsSync(), []);

  const [state, setState] = useState<OfficialSessionState>({
    sessionId: null,
    currentRoundIndex: 0,
    rounds: [],
    currentCards: [],
    correctPoemId: null,
    usedCorrectIds: [],
    lastIsCorrect: null,
    lastSelectedId: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    result: null,
  });

  const questionStartTimeRef = useRef<number>(0);
  const isSavingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const processedRoundsRef = useRef<Set<number>>(new Set());
  const lastRoundIndexRef = useRef<number>(-1);

  // Current question data
  const currentQuestion = useMemo(() => {
    if (state.currentRoundIndex >= 50 || state.currentCards.length === 0 || !state.correctPoemId) {
      return null;
    }

    const poem = state.currentCards.find(p => p.poemId === state.correctPoemId);
    if (!poem) return null;

    return {
      roundIndex: state.currentRoundIndex,
      poem,
      choices: state.currentCards.map(p => p.poemId),
      choicePoems: state.currentCards,
    };
  }, [state.currentRoundIndex, state.currentCards, state.correctPoemId]);

  // Start timer when round changes
  useEffect(() => {
    if (currentQuestion && state.currentRoundIndex !== lastRoundIndexRef.current) {
      questionStartTimeRef.current = performance.now();
      lastRoundIndexRef.current = state.currentRoundIndex;
    }
  }, [currentQuestion, state.currentRoundIndex]);

  // Start a new session
  const startSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const sessionId = await createSession(uid, seasonId, entryId);
      sessionIdRef.current = sessionId;
      processedRoundsRef.current = new Set();

      // Pick initial 12 cards
      const initial12 = selectRandomPoems(allPoems, 12);
      // Pick first correct from the 12
      const correct = initial12[Math.floor(Math.random() * initial12.length)];

      setState((prev) => ({
        ...prev,
        sessionId,
        currentRoundIndex: 0,
        rounds: [],
        currentCards: initial12,
        correctPoemId: correct.poemId,
        usedCorrectIds: [correct.poemId],
        lastIsCorrect: null,
        lastSelectedId: null,
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
    async (selectedPoemId: string) => {
      if (!sessionIdRef.current || !currentQuestion || isSavingRef.current) return;

      const roundIndex = currentQuestion.roundIndex;
      if (processedRoundsRef.current.has(roundIndex)) return;

      isSavingRef.current = true;
      processedRoundsRef.current.add(roundIndex);

      const elapsedMs = Math.max(200, Math.round(performance.now() - questionStartTimeRef.current));
      const isCorrect = selectedPoemId === currentQuestion.poem.poemId;

      const round: Round = {
        roundIndex,
        correctPoemId: currentQuestion.poem.poemId,
        choices: currentQuestion.choices,
        selectedPoemId,
        isCorrect,
        clientElapsedMs: elapsedMs,
      };

      // Save round to Firestore
      try {
        await saveRound(sessionIdRef.current, round);
      } catch (error) {
        console.error('Failed to save round:', error);
        try {
          await saveRound(sessionIdRef.current!, round);
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
      }

      // Advance state: replace cards and pick next correct
      setState((prev) => {
        const nextRoundIndex = prev.currentRoundIndex + 1;

        if (nextRoundIndex >= 50) {
          // Last question — just record the round
          return {
            ...prev,
            rounds: [...prev.rounds, round],
            currentRoundIndex: nextRoundIndex,
          };
        }

        // Determine cards to replace
        const poemsToReplace: string[] = [];
        if (prev.correctPoemId) {
          poemsToReplace.push(prev.correctPoemId);
          if (!isCorrect && selectedPoemId !== prev.correctPoemId) {
            poemsToReplace.push(selectedPoemId);
          }
        }

        // Remaining cards (not replaced)
        const remainingPoems = prev.currentCards.filter(
          p => !poemsToReplace.includes(p.poemId)
        );

        // Pick new cards (not in remaining, not already used as correct)
        const availableForNew = allPoems.filter(
          p => !remainingPoems.some(r => r.poemId === p.poemId) &&
               !poemsToReplace.includes(p.poemId)
        );
        const newPoems = selectRandomPoems(availableForNew, poemsToReplace.length);

        // In-place replacement (preserve positions)
        let newPoemIdx = 0;
        const nextCards = prev.currentCards.map(p => {
          if (poemsToReplace.includes(p.poemId) && newPoemIdx < newPoems.length) {
            return newPoems[newPoemIdx++];
          }
          if (poemsToReplace.includes(p.poemId)) {
            return p; // fallback
          }
          return p;
        });

        // Pick next correct from remaining cards (not the replaced ones),
        // and not already used as correct
        const replacedIds = new Set(newPoems.map(p => p.poemId));
        const usedSet = new Set(prev.usedCorrectIds);
        const candidates = nextCards.filter(
          p => !replacedIds.has(p.poemId) && !usedSet.has(p.poemId)
        );

        // Fallback: if no unused remaining card, allow any remaining card
        const fallbackCandidates = candidates.length > 0
          ? candidates
          : nextCards.filter(p => !replacedIds.has(p.poemId));

        // Fallback 2: if still none, use any card
        const finalCandidates = fallbackCandidates.length > 0
          ? fallbackCandidates
          : nextCards;

        const nextCorrect = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

        return {
          ...prev,
          rounds: [...prev.rounds, round],
          currentRoundIndex: nextRoundIndex,
          currentCards: nextCards,
          correctPoemId: nextCorrect.poemId,
          usedCorrectIds: [...prev.usedCorrectIds, nextCorrect.poemId],
          lastIsCorrect: isCorrect,
          lastSelectedId: selectedPoemId,
        };
      });

      isSavingRef.current = false;
    },
    [currentQuestion, allPoems]
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

    return {
      correctCount,
      totalCount: state.rounds.length,
      totalElapsedMs,
      averageMs:
        state.rounds.length > 0 ? totalElapsedMs / state.rounds.length : 0,
      accuracy:
        state.rounds.length > 0
          ? Math.round((correctCount / state.rounds.length) * 100)
          : 0,
    };
  }, [state.rounds]);

  const isComplete = state.currentRoundIndex >= 50;

  return {
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

    startSession,
    answerQuestion,
    submitForConfirmation,
  };
}
