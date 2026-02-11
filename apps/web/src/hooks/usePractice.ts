import { useState, useCallback, useMemo } from 'react';
import type { Poem } from '@/types/poem';
import { getAllPoemsSync } from '@/services/poems.service';
import type { PoemRange } from '@/components/PoemRangeSelector';

const MAX_QUESTIONS = 50;

interface UsePracticeOptions {
  initialKimarijiFilter?: number[];
  initialPoemRangeFilter?: PoemRange[];
  initialShowYomiKana?: boolean;
  initialShowToriKana?: boolean;
  initialShowKimariji?: boolean;
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
  isCompleted: boolean;  // 50問終了フラグ
}

export function usePractice(options: UsePracticeOptions = {}) {
  const allPoems = useMemo(() => getAllPoemsSync(), []);

  const initialKimarijiFilter = options.initialKimarijiFilter || [1, 2, 3, 4, 5, 6];
  const initialPoemRangeFilter = options.initialPoemRangeFilter || [];
  const initialShowYomiKana = options.initialShowYomiKana || false;
  const initialShowToriKana = options.initialShowToriKana || false;
  const initialShowKimariji = options.initialShowKimariji || false;

  const [state, setState] = useState<PracticeState>(() => {
    const filtered = filterPoems(allPoems, initialKimarijiFilter, initialPoemRangeFilter);
    // Use filtered count (can be fewer than 12)
    const selected = selectRandomPoems(filtered, Math.min(12, filtered.length));
    const correct = selected.length > 0
      ? selected[Math.floor(Math.random() * selected.length)]
      : null;

    return {
      poems: allPoems,
      selectedPoems: selected,
      correctPoemId: correct?.poemId || null,
      selectedPoemId: null,
      showYomiKana: initialShowYomiKana,
      showToriKana: initialShowToriKana,
      showKimariji: initialShowKimariji,
      kimarijiFilter: initialKimarijiFilter,
      poemRangeFilter: initialPoemRangeFilter,
      questionCount: 0,
      correctCount: 0,
      isAnswered: false,
      isCorrect: null,
      isCompleted: false,
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
      // Reshuffle with available poems (can be fewer than 12)
      if (newFiltered.length > 0) {
        const selected = selectRandomPoems(newFiltered, Math.min(12, newFiltered.length));
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
      return { ...prev, kimarijiFilter: counts, selectedPoems: [], correctPoemId: null };
    });
  }, []);

  // Update poem range filter
  const setPoemRangeFilter = useCallback((ranges: PoemRange[]) => {
    setState(prev => {
      const newFiltered = filterPoems(prev.poems, prev.kimarijiFilter, ranges);
      // Reshuffle with available poems (can be fewer than 12)
      if (newFiltered.length > 0) {
        const selected = selectRandomPoems(newFiltered, Math.min(12, newFiltered.length));
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
      return { ...prev, poemRangeFilter: ranges, selectedPoems: [], correctPoemId: null };
    });
  }, []);

  // Shuffle cards (select new random poems from filtered set)
  const shuffle = useCallback(() => {
    setState(prev => {
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter, prev.poemRangeFilter);
      const selected = selectRandomPoems(filtered, Math.min(12, filtered.length));
      const correct = selected.length > 0
        ? selected[Math.floor(Math.random() * selected.length)]
        : null;
      return {
        ...prev,
        selectedPoems: selected,
        correctPoemId: correct?.poemId || null,
        selectedPoemId: null,
        isAnswered: false,
        isCorrect: null,
      };
    });
  }, []);

  // Select a poem (answer)
  const selectPoem = useCallback((poemId: string) => {
    setState(prev => {
      if (prev.isAnswered || prev.isCompleted) return prev;

      const isCorrect = poemId === prev.correctPoemId;
      const newQuestionCount = prev.questionCount + 1;
      const isCompleted = newQuestionCount >= MAX_QUESTIONS;
      return {
        ...prev,
        selectedPoemId: poemId,
        isAnswered: true,
        isCorrect,
        questionCount: newQuestionCount,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        isCompleted,
      };
    });
  }, []);

  // Move to next question
  const nextQuestion = useCallback(() => {
    setState(prev => {
      // 50問終了している場合は何もしない
      if (prev.isCompleted) return prev;

      // 入れ替える札を決定
      const poemsToReplace: string[] = [];

      if (prev.correctPoemId) {
        if (prev.isCorrect) {
          // 正解: 正解札のみ入れ替え
          poemsToReplace.push(prev.correctPoemId);
        } else {
          // 不正解: 選択札と正解札を入れ替え
          poemsToReplace.push(prev.correctPoemId);
          if (prev.selectedPoemId && prev.selectedPoemId !== prev.correctPoemId) {
            poemsToReplace.push(prev.selectedPoemId);
          }
        }
      }

      // 残す札（入れ替えない札）
      const remainingPoems = prev.selectedPoems.filter(
        p => !poemsToReplace.includes(p.poemId)
      );

      // 新しい札を選ぶ（既存の札と重複しない）
      const filtered = filterPoems(prev.poems, prev.kimarijiFilter, prev.poemRangeFilter);
      const available = filtered.filter(
        p => !remainingPoems.some(r => r.poemId === p.poemId)
      );

      // 十分な札がある場合は新しい札を追加、なければ既存札を再利用
      const newPoems = selectRandomPoems(available, poemsToReplace.length);

      // 入れ替え対象の位置に新しい札を挿入（残す札の位置は維持）
      // 新しい札がない場合はその位置を削除
      let newPoemIdx = 0;
      const selected: Poem[] = [];
      for (const p of prev.selectedPoems) {
        if (poemsToReplace.includes(p.poemId)) {
          if (newPoemIdx < newPoems.length) {
            selected.push(newPoems[newPoemIdx++]);
          }
          // 新しい札が足りない場合は削除（pushしない）
        } else {
          selected.push(p);
        }
      }

      // カードがなくなった場合は終了状態
      if (selected.length === 0) {
        return {
          ...prev,
          selectedPoems: [],
          correctPoemId: null,
          selectedPoemId: null,
          isAnswered: false,
          isCorrect: null,
        };
      }

      // 新しい正解を選択（残った札から選ぶ、入れ替えた札は除外）
      const replacedIds = newPoems.map(p => p.poemId);
      const remainingCandidates = selected.filter(p => !replacedIds.includes(p.poemId));
      const correctSource = remainingCandidates.length > 0 ? remainingCandidates : selected;
      const correct = correctSource[Math.floor(Math.random() * correctSource.length)];

      return {
        ...prev,
        selectedPoems: selected,
        correctPoemId: correct?.poemId || null,
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
    isCompleted: state.isCompleted,
    filteredPoemsCount: filteredPoems.length,
    maxQuestions: MAX_QUESTIONS,

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
