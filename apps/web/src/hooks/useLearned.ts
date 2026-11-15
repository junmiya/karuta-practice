import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUserLearned,
  setPoemStatus,
  setPoemStarred,
  clearLearnedPoems,
  type PoemStatus,
} from '@/services/learned.service';

export type LearnedFilterMode = 'normal' | 'exclude' | 'prioritize';
export type { PoemStatus };

/** 未ログイン時はこの端末に保存する */
const GUEST_STORAGE_KEY = 'learned_poems_guest';
const GUEST_NOT_LEARNED_KEY = 'not_learned_poems_guest';
const GUEST_STARRED_KEY = 'starred_poems_guest';

function loadGuestIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveGuestIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // 保存できなくても画面上は反映される
  }
}

interface LearnedState {
  learnedPoemIds: Set<string>;
  notLearnedPoemIds: Set<string>;
  starredPoemIds: Set<string>;
  loading: boolean;
  error: string | null;
}

const emptyState = (): LearnedState => ({
  learnedPoemIds: new Set<string>(),
  notLearnedPoemIds: new Set<string>(),
  starredPoemIds: new Set<string>(),
  loading: false,
  error: null,
});

/**
 * 覚えた / 覚えてない の記録
 * @param uid - User ID (null if not authenticated → この端末の localStorage に保存)
 */
export function useLearned(uid: string | null) {
  const [state, setState] = useState<LearnedState>(emptyState);
  const [filterMode, setFilterMode] = useState<LearnedFilterMode>('normal');
  // 書き込み失敗時に最新の状態から戻すため
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadFromServer = useCallback((userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    getUserLearned(userId)
      .then(data => {
        setState({
          learnedPoemIds: new Set<string>(data?.poemIds || []),
          notLearnedPoemIds: new Set<string>(data?.notLearnedPoemIds || []),
          starredPoemIds: new Set<string>(data?.starredPoemIds || []),
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load learned poems' }));
      });
  }, []);

  useEffect(() => {
    if (!uid) {
      setState({
        ...emptyState(),
        learnedPoemIds: loadGuestIds(GUEST_STORAGE_KEY),
        notLearnedPoemIds: loadGuestIds(GUEST_NOT_LEARNED_KEY),
        starredPoemIds: loadGuestIds(GUEST_STARRED_KEY),
      });
      return;
    }
    loadFromServer(uid);
  }, [uid, loadFromServer]);

  /** 1首を「覚えた」または「覚えてない」にする（もう一方の印は外れる） */
  const setStatus = useCallback((poemId: string, status: PoemStatus) => {
    const cur = stateRef.current;
    const already = status === 'learned'
      ? cur.learnedPoemIds.has(poemId)
      : cur.notLearnedPoemIds.has(poemId);
    if (already) return;

    const learned = new Set(cur.learnedPoemIds);
    const notLearned = new Set(cur.notLearnedPoemIds);
    if (status === 'learned') {
      learned.add(poemId);
      notLearned.delete(poemId);
    } else {
      notLearned.add(poemId);
      learned.delete(poemId);
    }
    setState(prev => ({ ...prev, learnedPoemIds: learned, notLearnedPoemIds: notLearned, error: null }));

    if (!uid) {
      saveGuestIds(GUEST_STORAGE_KEY, learned);
      saveGuestIds(GUEST_NOT_LEARNED_KEY, notLearned);
      return;
    }
    setPoemStatus(uid, poemId, status).catch(() => {
      // 失敗したらサーバの状態に合わせ直す
      setState(prev => ({ ...prev, error: 'Failed to update' }));
      loadFromServer(uid);
    });
  }, [uid, loadFromServer]);

  /** 星を付ける / 外す */
  const toggleStar = useCallback((poemId: string) => {
    const starred = new Set(stateRef.current.starredPoemIds);
    const nowStarred = !starred.has(poemId);
    if (nowStarred) starred.add(poemId);
    else starred.delete(poemId);
    setState(prev => ({ ...prev, starredPoemIds: starred, error: null }));

    if (!uid) {
      saveGuestIds(GUEST_STARRED_KEY, starred);
      return;
    }
    setPoemStarred(uid, poemId, nowStarred).catch(() => {
      setState(prev => ({ ...prev, error: 'Failed to update' }));
      loadFromServer(uid);
    });
  }, [uid, loadFromServer]);

  /** 覚えた(true) / 覚えてない(false) */
  const setLearned = useCallback((poemId: string, learned: boolean) => {
    setStatus(poemId, learned ? 'learned' : 'notLearned');
  }, [setStatus]);

  // Clear all（覚えた・覚えてない の印をすべて外す）
  const clearAll = useCallback(async () => {
    if (!uid) {
      saveGuestIds(GUEST_STORAGE_KEY, new Set());
      saveGuestIds(GUEST_NOT_LEARNED_KEY, new Set());
      setState(prev => ({ ...prev, learnedPoemIds: new Set(), notLearnedPoemIds: new Set() }));
      return;
    }

    const backup = stateRef.current;
    setState(prev => ({ ...prev, learnedPoemIds: new Set(), notLearnedPoemIds: new Set() }));

    try {
      await clearLearnedPoems(uid);
    } catch {
      setState(prev => ({
        ...prev,
        learnedPoemIds: backup.learnedPoemIds,
        notLearnedPoemIds: backup.notLearnedPoemIds,
        error: 'Failed to clear',
      }));
    }
  }, [uid]);

  const isLearned = useCallback((poemId: string) => {
    return state.learnedPoemIds.has(poemId);
  }, [state.learnedPoemIds]);

  /** 印の状態（未記録は null） */
  const getStatus = useCallback((poemId: string): PoemStatus | null => {
    if (state.learnedPoemIds.has(poemId)) return 'learned';
    if (state.notLearnedPoemIds.has(poemId)) return 'notLearned';
    return null;
  }, [state.learnedPoemIds, state.notLearnedPoemIds]);

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

  const getFilterModeLabel = useCallback(() => {
    switch (filterMode) {
      case 'normal': return '通常';
      case 'exclude': return '除外';
      case 'prioritize': return '優先';
    }
  }, [filterMode]);

  return {
    learnedPoemIds: state.learnedPoemIds,
    notLearnedPoemIds: state.notLearnedPoemIds,
    starredPoemIds: state.starredPoemIds,
    starredCount: state.starredPoemIds.size,
    toggleStar,
    learnedCount: state.learnedPoemIds.size,
    notLearnedCount: state.notLearnedPoemIds.size,
    loading: state.loading,
    error: state.error,
    filterMode,
    setFilterMode,
    cycleFilterMode,
    getFilterModeLabel,
    setStatus,
    setLearned,
    clearAll,
    isLearned,
    getStatus,
    isAuthenticated: !!uid,
  };
}
