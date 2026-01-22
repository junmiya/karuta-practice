import { useState, useCallback, useMemo } from 'react';
import type { Poem } from '@/types/poem';
import { getAllPoemsSync } from '@/services/poems.service';
import type { PoemRange } from '@/components/PoemRangeSelector';

interface UsePracticeOptions {
  initialKimarijiFilter?: number[];
  initialPoemRangeFilter?: PoemRange[];
}

interface PracticeState {
  poems: Poem[];
  selectedPoems: Poem[];
  correctPoemId: string | null;
  selectedPoemId: string | null;
  showYomiKana: boolean;  // 読札のひらがな表示
  showToriKana: boolean;  // 取札のひらがな表示
  showKimariji: boolean;
  kimarijiFilter: number[];
  poemRangeFilter: PoemRange[];  // 札番号フィルター
  questionCount: number;
  correctCount: number;
  isAnswered: boolean;
  isCorrect: boolean | null;
}

export function usePractice(options: UsePracticeOptions = {}) {
  const allPoems = useMemo(() => getAllPoemsSync(), []);

  const initialKimarijiFilter = options.initialKimarijiFilter || [1, 2, 3, 4, 5, 6];
  const initialPoemRangeFilter = options.initialPoemRangeFilter || [];

  const [state, setState] = useState<PracticeState>(() => {
    const filtered = filterPoems(allPoems, initialKimarijiFilter, initialPoemRangeFilter);
    const selected = selectRandomPoems(filtered, 12);
    const correct = selected[Math.floor(Math.random() * selected.length)];

    return {
      poems: allPoems,
      selectedPoems: selected,
      correctPoemId: correct.poemId,
      selectedPoemId: null,
      showYomiKana: false,
      showToriKana: false,
      showKimariji: false,
      kimarijiFilter: initialKimarijiFilter,
      poemRangeFilter: initialPoemRangeFilter,
      questionCount: 0,
      correctCount: 0,
      isAnswered: false,
      isCorrect: null,
    };
  });

  // Filter poems by kimariji count and poem range
  const filteredPoems = useMemo(() => {
    return filterPoems(allPoems, state.kimarijiFilter, state.poemRangeFilter);
  }, [allPoems, state.kimarijiFilter, state.poemRangeFilter]);

  // Get current correct poem
  const correctPoem = useMemo(() => {
    return state.selectedPoems.find(p => p.poemId === state.correctPoemId) || null;
  }, [state.selectedPoems, state.correctPoemId]);

  // Toggle yomi hiragana display (読札)
  const toggleYomiKana = useCallback(() => {
    setState(prev => ({ ...prev, showYomiKana: !prev.showYomiKana }));
  }, []);

  // Toggle tori hiragana display (取札)
  const toggleToriKana = useCallback(() => {
    setState(prev => ({ ...prev, showToriKana: !prev.showToriKana }));
  }, []);

  // Toggle both (for backward compatibility)
  const toggleKana = useCallback(() => {
    setState(prev => ({
      ...prev,
      showYomiKana: !prev.showYomiKana,
      showToriKana: !prev.showToriKana,
    }));
  }, []);

  // Toggle kimariji display
  const toggleKimariji = useCallback(() => {
    setState(prev => ({ ...prev, showKimariji: !prev.showKimariji }));
  }, []);

  // Update kimariji filter
  const setKimarijiFilter = useCallback((counts: number[]) => {
    setState(prev => {
      const newFiltered = filterPoems(prev.poems, counts, prev.poemRangeFilter);
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

  // Update poem range filter
  const setPoemRangeFilter = useCallback((ranges: PoemRange[]) => {
    setState(prev => {
      const newFiltered = filterPoems(prev.poems, prev.kimarijiFilter, ranges);
      // Only reshuffle if we have enough poems
      if (newFiltered.length >= 12) {
        const selected = selectRandomPoems(newFiltered, 12);
        const correct = selected[Math.floor(Math.random() * selected.length)];
        return {
          ...prev,
          poemRangeFilter: ranges,
          selectedPoems: selected,
          correctPoemId: correct.poemId,
          selectedPoemId: null,
          isAnswered: false,
          isCorrect: null,
        };
      }
      return { ...prev, poemRangeFilter: ranges };
    });
  }, []);

  // Shuffle cards (select new random 12 poems)
  const shuffle = useCallback(() => {
    setState(prev => {
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter, prev.poemRangeFilter);
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
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter, prev.poemRangeFilter);
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
    showYomiKana: state.showYomiKana,
    showToriKana: state.showToriKana,
    showKana: state.showYomiKana, // backward compatibility
    showKimariji: state.showKimariji,
    kimarijiFilter: state.kimarijiFilter,
    poemRangeFilter: state.poemRangeFilter,
    questionCount: state.questionCount,
    correctCount: state.correctCount,
    isAnswered: state.isAnswered,
    isCorrect: state.isCorrect,
    filteredPoemsCount: filteredPoems.length,

    // Actions
    toggleYomiKana,
    toggleToriKana,
    toggleKana,
    toggleKimariji,
    setKimarijiFilter,
    setPoemRangeFilter,
    shuffle,
    selectPoem,
    nextQuestion,
    resetStats,
  };
}

// Helper functions
function filterPoems(poems: Poem[], kimarijiCounts: number[], poemRanges: PoemRange[]): Poem[] {
  let result = poems;

  // Filter by kimariji count
  if (kimarijiCounts.length > 0 && kimarijiCounts.length < 6) {
    result = result.filter(p => kimarijiCounts.includes(p.kimarijiCount));
  }

  // Filter by poem range (order)
  if (poemRanges.length > 0) {
    result = result.filter(p =>
      poemRanges.some(range => p.order >= range.start && p.order <= range.end)
    );
  }

  return result;
}

function selectRandomPoems(poems: Poem[], count: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
