import { useState, useEffect, useCallback } from 'react';
import {
  getUserLearned,
  toggleLearnedPoem,
  clearLearnedPoems,
} from '@/services/learned.service';

export type LearnedFilterMode = 'normal' | 'exclude' | 'prioritize';

interface LearnedState {
  learnedPoemIds: Set<string>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing learned poems
 * @param uid - User ID (null if not authenticated)
 */
export function useLearned(uid: string | null) {
  const [state, setState] = useState<LearnedState>({
    learnedPoemIds: new Set<string>(),
    loading: false,
    error: null,
  });
  const [filterMode, setFilterMode] = useState<LearnedFilterMode>('normal');

  // Load learned poems from Firestore
  useEffect(() => {
    if (!uid) {
      setState({ learnedPoemIds: new Set<string>(), loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    getUserLearned(uid)
      .then(data => {
        setState({
          learnedPoemIds: new Set<string>(data?.poemIds || []),
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load learned poems',
        }));
      });
  }, [uid]);

  // Toggle a poem's learned status
  const toggleLearned = useCallback(async (poemId: string) => {
    if (!uid) return;

    // Optimistic update
    setState(prev => {
      const newSet = new Set(prev.learnedPoemIds);
      if (newSet.has(poemId)) {
        newSet.delete(poemId);
      } else {
        newSet.add(poemId);
      }
      return { ...prev, learnedPoemIds: newSet };
    });

    try {
      await toggleLearnedPoem(uid, poemId);
    } catch {
      // Revert on error
      setState(prev => {
        const newSet = new Set(prev.learnedPoemIds);
        if (newSet.has(poemId)) {
          newSet.delete(poemId);
        } else {
          newSet.add(poemId);
        }
        return { ...prev, learnedPoemIds: newSet, error: 'Failed to update' };
      });
    }
  }, [uid]);

  // Clear all learned poems
  const clearAll = useCallback(async () => {
    if (!uid) return;

    const backup = state.learnedPoemIds;
    setState(prev => ({ ...prev, learnedPoemIds: new Set() }));

    try {
      await clearLearnedPoems(uid);
    } catch {
      setState(prev => ({ ...prev, learnedPoemIds: backup, error: 'Failed to clear' }));
    }
  }, [uid, state.learnedPoemIds]);

  // Check if a poem is learned
  const isLearned = useCallback((poemId: string) => {
    return state.learnedPoemIds.has(poemId);
  }, [state.learnedPoemIds]);

  // Cycle through filter modes: normal -> exclude -> prioritize -> normal
  const cycleFilterMode = useCallback(() => {
    setFilterMode(prev => {
      switch (prev) {
        case 'normal': return 'exclude';
        case 'exclude': return 'prioritize';
        case 'prioritize': return 'normal';
      }
    });
  }, []);

  // Get filter mode label
  const getFilterModeLabel = useCallback(() => {
    switch (filterMode) {
      case 'normal': return '通常';
      case 'exclude': return '除外';
      case 'prioritize': return '優先';
    }
  }, [filterMode]);

  return {
    learnedPoemIds: state.learnedPoemIds,
    learnedCount: state.learnedPoemIds.size,
    loading: state.loading,
    error: state.error,
    filterMode,
    setFilterMode,
    cycleFilterMode,
    getFilterModeLabel,
    toggleLearned,
    clearAll,
    isLearned,
    isAuthenticated: !!uid,
  };
}
