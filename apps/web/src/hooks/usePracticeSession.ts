/**
 * Practice session hook with card replacement model
 * correct=1 card replaced, incorrect=2 cards replaced
 * Remaining cards keep their positions, next correct chosen from remaining
 */

import { useState, useCallback, useMemo } from 'react';
import type { Poem } from '@/types/poem';
import type { Question, PracticeSession } from '@/types/practice';
import { getAllPoemsSync } from '@/services/poems.service';
import type { PracticeFilter } from '@/services/practice.service';

interface UsePracticeSessionOptions {
  questionCount?: number;
  filter?: PracticeFilter;
}

function selectRandomPoems(poems: Poem[], count: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function initSession(_questionCount: number, filter?: PracticeFilter) {
  const allPoems = getAllPoemsSync();

  // Get filtered poems based on kimariji and poem range filters
  let filteredPoems = allPoems;
  if (filter?.kimarijiCounts && filter.kimarijiCounts.length > 0 && filter.kimarijiCounts.length < 6) {
    filteredPoems = filteredPoems.filter(p => filter.kimarijiCounts!.includes(p.kimarijiCount));
  }
  if (filter?.poemRanges && filter.poemRanges.length > 0) {
    filteredPoems = filteredPoems.filter(p =>
      filter.poemRanges!.some(range => p.order >= range.start && p.order <= range.end)
    );
  }

  // Initial cards - select from filtered poems (can be fewer than 12)
  let cards: Poem[];
  if (filteredPoems.length > 0) {
    // Use up to 12 filtered poems (or fewer if not enough)
    cards = selectRandomPoems(filteredPoems, Math.min(12, filteredPoems.length));
  } else {
    // No filter or empty filter result - use all poems
    cards = selectRandomPoems(allPoems, 12);
  }

  // Pick first correct from filtered poems in the cards
  const candidates = cards.filter(p => filteredPoems.some(fp => fp.poemId === p.poemId));
  const correct = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : cards[Math.floor(Math.random() * cards.length)];

  return {
    cards,
    correctPoemId: correct.poemId,
    usedCorrectIds: [correct.poemId],
    filteredPoems,
  };
}

export function usePracticeSession(options: UsePracticeSessionOptions = {}) {
  const { questionCount = 10, filter } = options;
  const allPoems = useMemo(() => getAllPoemsSync(), []);

  const [initial] = useState(() => initSession(questionCount, filter));

  const [currentCards, setCurrentCards] = useState<Poem[]>(initial.cards);
  const [correctPoemId, setCorrectPoemId] = useState<string>(initial.correctPoemId);
  const [usedCorrectIds, setUsedCorrectIds] = useState<string[]>(initial.usedCorrectIds);
  const [filteredPoems] = useState<Poem[]>(initial.filteredPoems);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const isComplete = currentQuestionIndex >= questionCount;

  // Build current question object for PracticePage
  const correctPoem = useMemo(
    () => currentCards.find(p => p.poemId === correctPoemId) || null,
    [currentCards, correctPoemId]
  );

  const correctIndex = useMemo(
    () => currentCards.findIndex(p => p.poemId === correctPoemId),
    [currentCards, correctPoemId]
  );

  const currentQuestion: Question | null = isComplete || !correctPoem
    ? null
    : {
      poem: correctPoem,
      choices: currentCards.map(p => p.tori),
      choiceKanas: currentCards.map(p => p.toriKana),
      choicePoems: currentCards,
      correctIndex,
      startTime,
      answered,
      selectedIndex,
      elapsedMs,
      isCorrect: isCorrectAnswer,
    };

  // Build session object for ResultPage
  const session: PracticeSession = useMemo(() => ({
    questions,
    currentQuestionIndex,
    isComplete,
    totalElapsedMs: questions.reduce((sum, q) => sum + (q.elapsedMs || 0), 0),
    correctCount: questions.filter(q => q.isCorrect).length,
    avgMs: questions.length > 0
      ? Math.round(questions.reduce((sum, q) => sum + (q.elapsedMs || 0), 0) / questions.length)
      : 0,
  }), [questions, currentQuestionIndex, isComplete]);

  const startQuestion = useCallback(() => {
    setStartTime(performance.now());
  }, []);

  const answerQuestion = useCallback((selectedIdx: number) => {
    if (answered || isComplete) return;

    const elapsed = Math.round(performance.now() - startTime);
    const isCorrect = selectedIdx === correctIndex;

    setAnswered(true);
    setSelectedIndex(selectedIdx);
    setIsCorrectAnswer(isCorrect);
    setElapsedMs(elapsed);

    // Record question for result page
    const questionRecord: Question = {
      poem: correctPoem!,
      choices: currentCards.map(p => p.tori),
      choiceKanas: currentCards.map(p => p.toriKana),
      choicePoems: [...currentCards],
      correctIndex,
      startTime,
      answered: true,
      selectedIndex: selectedIdx,
      elapsedMs: elapsed,
      isCorrect,
    };

    setQuestions(prev => [...prev, questionRecord]);
  }, [answered, isComplete, startTime, correctIndex, correctPoem, currentCards]);

  const nextQuestion = useCallback(() => {
    const nextIdx = currentQuestionIndex + 1;

    if (nextIdx >= questionCount) {
      setCurrentQuestionIndex(nextIdx);
      return;
    }

    // Replace cards
    const selectedPoemId = selectedIndex !== null ? currentCards[selectedIndex]?.poemId : null;
    const poemsToReplace: string[] = [correctPoemId];
    if (isCorrectAnswer === false && selectedPoemId && selectedPoemId !== correctPoemId) {
      poemsToReplace.push(selectedPoemId);
    }

    const remainingPoems = currentCards.filter(p => !poemsToReplace.includes(p.poemId));
    // Only use filtered poems for replacement (no fallback to other poems)
    const availableFiltered = filteredPoems.filter(
      p => !remainingPoems.some(r => r.poemId === p.poemId) &&
        !poemsToReplace.includes(p.poemId)
    );
    // Use as many filtered poems as available (may be fewer than needed)
    const newPoems = selectRandomPoems(availableFiltered, Math.min(availableFiltered.length, poemsToReplace.length));

    // Build next cards: keep remaining, replace what we can, remove the rest
    let newPoemIdx = 0;
    const nextCards: Poem[] = [];
    for (const p of currentCards) {
      if (poemsToReplace.includes(p.poemId)) {
        // This card needs replacement
        if (newPoemIdx < newPoems.length) {
          nextCards.push(newPoems[newPoemIdx++]);
        }
        // If no replacement available, card is removed (not pushed)
      } else {
        // Keep this card
        nextCards.push(p);
      }
    }

    // If no cards left, end the session early
    if (nextCards.length === 0) {
      setCurrentQuestionIndex(questionCount); // Force complete
      return;
    }

    // Pick next correct from remaining cards that are in filteredPoems and not already used
    const replacedIds = new Set(newPoems.map(p => p.poemId));
    const usedSet = new Set(usedCorrectIds);
    const filteredSet = new Set(filteredPoems.map(p => p.poemId));

    // Only pick from filtered poems (no fallback to non-filtered!)
    // Best: remaining + filtered + unused
    let candidates = nextCards.filter(
      p => !replacedIds.has(p.poemId) && !usedSet.has(p.poemId) && filteredSet.has(p.poemId)
    );
    // Fallback: remaining + filtered (allow already used)
    if (candidates.length === 0) {
      candidates = nextCards.filter(
        p => !replacedIds.has(p.poemId) && filteredSet.has(p.poemId)
      );
    }
    // Fallback: any filtered poem in nextCards (including newly replaced)
    if (candidates.length === 0) {
      candidates = nextCards.filter(p => filteredSet.has(p.poemId));
    }

    // If no filtered candidates available, end the session early
    if (candidates.length === 0) {
      setCurrentQuestionIndex(questionCount); // Force complete
      return;
    }

    const nextCorrect = candidates[Math.floor(Math.random() * candidates.length)];

    setCurrentCards(nextCards);
    setCorrectPoemId(nextCorrect.poemId);
    setUsedCorrectIds(prev => [...prev, nextCorrect.poemId]);
    setCurrentQuestionIndex(nextIdx);
    setAnswered(false);
    setSelectedIndex(null);
    setIsCorrectAnswer(null);
    setElapsedMs(null);
    setStartTime(0);
  }, [currentQuestionIndex, questionCount, currentCards, correctPoemId, isCorrectAnswer, selectedIndex, allPoems, usedCorrectIds, filteredPoems]);

  const resetSession = useCallback(() => {
    const fresh = initSession(questionCount, filter);
    setCurrentCards(fresh.cards);
    setCorrectPoemId(fresh.correctPoemId);
    setUsedCorrectIds(fresh.usedCorrectIds);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswered(false);
    setSelectedIndex(null);
    setIsCorrectAnswer(null);
    setElapsedMs(null);
    setStartTime(0);
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
