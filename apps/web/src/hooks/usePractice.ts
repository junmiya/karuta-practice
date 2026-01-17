import { useState, useCallback, useMemo } from 'react';
import type { Poem } from '@/types/poem';
import { getAllPoemsSync } from '@/services/poems.service';

interface UsePracticeOptions {
  initialKimarijiFilter?: number[];
}

interface PracticeState {
  poems: Poem[];
  selectedPoems: Poem[];
  correctPoemId: string | null;
  selectedPoemId: string | null;
  showKana: boolean;
  showKimariji: boolean;
  kimarijiFilter: number[];
  questionCount: number;
  correctCount: number;
  isAnswered: boolean;
  isCorrect: boolean | null;
}

export function usePractice(options: UsePracticeOptions = {}) {
  const allPoems = useMemo(() => getAllPoemsSync(), []);
  
  const initialFilter = options.initialKimarijiFilter || [1, 2, 3, 4, 5, 6];
  
  const [state, setState] = useState<PracticeState>(() => {
    const filtered = filterPoems(allPoems, initialFilter);
    const selected = selectRandomPoems(filtered, 12);
    const correct = selected[Math.floor(Math.random() * selected.length)];
    
    return {
      poems: allPoems,
      selectedPoems: selected,
      correctPoemId: correct.poemId,
      selectedPoemId: null,
      showKana: false,
      showKimariji: false,
      kimarijiFilter: initialFilter,
      questionCount: 0,
      correctCount: 0,
      isAnswered: false,
      isCorrect: null,
    };
  });

  // Filter poems by kimariji count
  const filteredPoems = useMemo(() => {
    return filterPoems(allPoems, state.kimarijiFilter);
  }, [allPoems, state.kimarijiFilter]);

  // Get current correct poem
  const correctPoem = useMemo(() => {
    return state.selectedPoems.find(p => p.poemId === state.correctPoemId) || null;
  }, [state.selectedPoems, state.correctPoemId]);

  // Toggle hiragana display
  const toggleKana = useCallback(() => {
    setState(prev => ({ ...prev, showKana: !prev.showKana }));
  }, []);

  // Toggle kimariji display
  const toggleKimariji = useCallback(() => {
    setState(prev => ({ ...prev, showKimariji: !prev.showKimariji }));
  }, []);

  // Update kimariji filter
  const setKimarijiFilter = useCallback((counts: number[]) => {
    setState(prev => {
      const newFiltered = filterPoems(prev.poems, counts);
      // Only reshuffle if we have enough poems
      if (newFiltered.length >= 12) {
        const selected = selectRandomPoems(newFiltered, 12);
        const correct = selected[Math.floor(Math.random() * selected.length)];
        return {
          ...prev,
          kimarijiFilter: counts,
          selectedPoems: selected,
          correctPoemId: correct.poemId,
          selectedPoemId: null,
          isAnswered: false,
          isCorrect: null,
        };
      }
      return { ...prev, kimarijiFilter: counts };
    });
  }, []);

  // Shuffle cards (select new random 12 poems)
  const shuffle = useCallback(() => {
    setState(prev => {
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter);
      const selected = selectRandomPoems(filtered, 12);
      const correct = selected[Math.floor(Math.random() * selected.length)];
      return {
        ...prev,
        selectedPoems: selected,
        correctPoemId: correct.poemId,
        selectedPoemId: null,
        isAnswered: false,
        isCorrect: null,
      };
    });
  }, []);

  // Select a poem (answer)
  const selectPoem = useCallback((poemId: string) => {
    setState(prev => {
      if (prev.isAnswered) return prev;
      
      const isCorrect = poemId === prev.correctPoemId;
      return {
        ...prev,
        selectedPoemId: poemId,
        isAnswered: true,
        isCorrect,
        questionCount: prev.questionCount + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      };
    });
  }, []);

  // Move to next question
  const nextQuestion = useCallback(() => {
    setState(prev => {
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter);
      const selected = selectRandomPoems(filtered, 12);
      const correct = selected[Math.floor(Math.random() * selected.length)];
      return {
        ...prev,
        selectedPoems: selected,
        correctPoemId: correct.poemId,
        selectedPoemId: null,
        isAnswered: false,
        isCorrect: null,
      };
    });
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    setState(prev => ({
      ...prev,
      questionCount: 0,
      correctCount: 0,
    }));
  }, []);

  return {
    // State
    selectedPoems: state.selectedPoems,
    correctPoemId: state.correctPoemId,
    selectedPoemId: state.selectedPoemId,
    correctPoem,
    showKana: state.showKana,
    showKimariji: state.showKimariji,
    kimarijiFilter: state.kimarijiFilter,
    questionCount: state.questionCount,
    correctCount: state.correctCount,
    isAnswered: state.isAnswered,
    isCorrect: state.isCorrect,
    filteredPoemsCount: filteredPoems.length,
    
    // Actions
    toggleKana,
    toggleKimariji,
    setKimarijiFilter,
    shuffle,
    selectPoem,
    nextQuestion,
    resetStats,
  };
}

// Helper functions
function filterPoems(poems: Poem[], kimarijiCounts: number[]): Poem[] {
  if (kimarijiCounts.length === 0 || kimarijiCounts.length === 6) {
    return poems;
  }
  return poems.filter(p => kimarijiCounts.includes(p.kimarijiCount));
}

function selectRandomPoems(poems: Poem[], count: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
