import { useState, useEffect, useCallback } from 'react';
import {
  getUserLearned,
  toggleLearnedPoem,
  clearLearnedPoems,
} from '@/services/learned.service';

export type LearnedFilterMode = 'normal' | 'exclude' | 'prioritize';

/** 未ログイン時はこの端末に保存する */
const GUEST_STORAGE_KEY = 'learned_poems_guest';

function loadGuestLearned(): Set<string> {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveGuestLearned(ids: Set<string>) {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // 保存できなくても画面上は反映される
  }
}

interface LearnedState {
  learnedPoemIds: Set<string>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing learned poems
 * @param uid - User ID (null if not authenticated → この端末の localStorage に保存)
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
      setState({ learnedPoemIds: loadGuestLearned(), loading: false, error: null });
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
    if (!uid) {
      setState(prev => {
        const newSet = new Set(prev.learnedPoemIds);
        if (newSet.has(poemId)) newSet.delete(poemId);
        else newSet.add(poemId);
        saveGuestLearned(newSet);
        return { ...prev, learnedPoemIds: newSet };
      });
      return;
    }

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

  // 覚えた / 覚えてない を明示的に設定（既に同じ状態なら何もしない）
  const setLearned = useCallback((poemId: string, learned: boolean) => {
    if (state.learnedPoemIds.has(poemId) === learned) return;
    void toggleLearned(poemId);
  }, [state.learnedPoemIds, toggleLearned]);

  // Clear all learned poems
  const clearAll = useCallback(async () => {
    if (!uid) {
      saveGuestLearned(new Set());
      setState(prev => ({ ...prev, learnedPoemIds: new Set() }));
      return;
    }

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
    setLearned,
    clearAll,
    isLearned,
    isAuthenticated: !!uid,
  };
}
