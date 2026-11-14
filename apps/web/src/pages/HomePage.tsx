import { useState, useMemo, useCallback, useEffect } from 'react';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { DisplayOptionsToggle } from '@/components/DisplayOptionsToggle';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLearned } from '@/hooks/useLearned';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';

export function HomePage() {
  // 手習はかな表示・下の句先出しがデフォルト
  const [showYomiKana, setShowYomiKana] = useState(true);
  const [showToriKana, setShowToriKana] = useState(true);
  const [showKimariji, setShowKimariji] = useState(true);
  const [flipStart, setFlipStart] = useState<'yomi' | 'tori'>('tori');
  const [displayCount, setDisplayCount] = useState<1 | 12 | 100>(12);
  const [singleIndex, setSingleIndex] = useState(0);
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const { user } = useAuthContext();
  const {
    learnedPoemIds,
    learnedCount,
    filterMode,
    cycleFilterMode,
    toggleLearned,
    clearAll,
    isLearned,
    isAuthenticated,
  } = useLearned(user?.uid ?? null);

  // 一括クリア確認
  const handleClearAll = useCallback(() => {
    if (learnedCount === 0) return;
    if (confirm(`覚えた札 ${learnedCount}首 をすべてクリアしますか？`)) {
      clearAll();
    }
  }, [clearAll, learnedCount]);

  const allPoems = useMemo(() => getAllPoemsSync(), []);

  // Filter poems
  const filteredPoems = useMemo(() => {
    let result = allPoems;

    // Filter by kimariji count
    if (selectedKimariji.length > 0) {
      result = result.filter(p => selectedKimariji.includes(p.kimarijiCount));
    }

    // Filter by poem range (order)
    if (selectedPoemRange.length > 0) {
      result = result.filter(p =>
        selectedPoemRange.some(range => p.order >= range.start && p.order <= range.end)
      );
    }

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(p =>
        p.yomi.toLowerCase().includes(search) ||
        p.yomiKana.toLowerCase().includes(search) ||
        p.tori.toLowerCase().includes(search) ||
        p.toriKana.toLowerCase().includes(search) ||
        p.kimariji.toLowerCase().includes(search) ||
        p.author.toLowerCase().includes(search)
      );
    }

    // Apply learned filter mode
    if (filterMode === 'exclude' && learnedPoemIds.size > 0) {
      result = result.filter(p => !learnedPoemIds.has(p.poemId));
    } else if (filterMode === 'prioritize' && learnedPoemIds.size > 0) {
      // Sort learned poems first
      result = [...result].sort((a, b) => {
        const aLearned = learnedPoemIds.has(a.poemId) ? 0 : 1;
        const bLearned = learnedPoemIds.has(b.poemId) ? 0 : 1;
        return aLearned - bLearned;
      });
    }

    return result;
  }, [allPoems, selectedKimariji, selectedPoemRange, searchText, filterMode, learnedPoemIds]);

  // Shuffled order (seed=0 のときは元の順番のまま)
  const shuffledPoems = useMemo(() => {
    // Shuffle based on seed (Fisher-Yates with seeded random)
    const shuffled = [...filteredPoems];
    if (shuffleSeed > 0) {
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(shuffleSeed + i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }

    return shuffled;
  }, [filteredPoems, shuffleSeed]);

  // 1枚モード: 絞り込みで枚数が減っても範囲内に収める
  const currentIndex = Math.min(singleIndex, Math.max(shuffledPoems.length - 1, 0));

  // Display poems (limited by displayCount)
  const displayPoems = useMemo(() => {
    if (displayCount === 100) return filteredPoems;
    if (displayCount === 1) return shuffledPoems.slice(currentIndex, currentIndex + 1);
    return shuffledPoems.slice(0, displayCount);
  }, [filteredPoems, shuffledPoems, displayCount, currentIndex]);

  // Shuffle handler
  const handleShuffle = useCallback(() => {
    setShuffleSeed(prev => prev + 1);
    setSingleIndex(0);
  }, []);

  const handleDisplayCount = useCallback((count: 1 | 12 | 100) => {
    setDisplayCount(count);
    setSingleIndex(0);
  }, []);

  // 1枚モードの前後移動（端は反対側へ回り込む）
  const goPrev = useCallback(() => {
    const n = shuffledPoems.length;
    if (n === 0) return;
    setSingleIndex((currentIndex - 1 + n) % n);
  }, [shuffledPoems.length, currentIndex]);

  const goNext = useCallback(() => {
    const n = shuffledPoems.length;
    if (n === 0) return;
    setSingleIndex((currentIndex + 1) % n);
  }, [shuffledPoems.length, currentIndex]);

  // 1枚モード: ← → キーで前後移動（検索入力中は無効）
  useEffect(() => {
    if (displayCount !== 1) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [displayCount, goPrev, goNext]);

  // 札1枚 + 覚/解説ボタン
  const renderCard = (poem: Poem) => (
    <div key={`${poem.poemId}-${flipStart}`} className="flex flex-col gap-2 group">
      <KarutaCard
        poem={poem}
        mode="flip"
        flipStart={flipStart}
        showYomiKana={showYomiKana}
        showToriKana={showToriKana}
        showKimariji={showKimariji}
      />
      <div className={cn(
        "flex gap-2 transition-opacity duration-200",
        displayCount === 1 ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      )}>
        {/* 覚えた toggle button */}
        {isAuthenticated && (
          <button
            onClick={() => toggleLearned(poem.poemId)}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded transition-colors border",
              isLearned(poem.poemId)
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}
          >
            {isLearned(poem.poemId) ? '✓' : '覚'}
          </button>
        )}
        <button
          onClick={() => setSelectedPoem(poem)}
          className={cn(
            isAuthenticated ? "flex-1" : "w-full",
            "py-1.5 bg-blue-50 text-karuta-tansei border border-blue-100 text-xs font-bold rounded hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
          )}
        >
          解説
        </button>
      </div>
    </div>
  );

  if (!allPoems.length) {
    return <LoadingSpinner fullScreen message="読み込み中..." />;
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Control Panel - 4行レイアウト */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Line 1: Search + 表示面 + Count（狭い画面では検索欄だけ1行目に折り返す） */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索..."
            className="basis-full sm:basis-0 sm:flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-karuta-tansei/50"
          />
          {/* 最初に表示する面: 下の句 / 上の句 */}
          <div className="flex bg-gray-100 rounded p-0.5" title="最初に表示する面">
            {([['tori', '下'], ['yomi', '上']] as const).map(([side, label]) => (
              <button
                key={side}
                onClick={() => setFlipStart(side)}
                aria-pressed={flipStart === side}
                title={side === 'tori' ? '下の句から表示' : '上の句から表示'}
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                  flipStart === side
                    ? "bg-white text-karuta-tansei shadow-sm"
                    : "text-gray-600"
                )}
              >
                {label}の句
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 rounded p-0.5">
            {([1, 12, 100] as const).map(count => (
              <button
                key={count}
                onClick={() => handleDisplayCount(count)}
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded transition-colors",
                  displayCount === count
                    ? "bg-white text-karuta-tansei shadow-sm"
                    : "text-gray-600"
                )}
              >
                {count === 100 ? '全' : count}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {displayCount === 1
              ? `${filteredPoems.length > 0 ? currentIndex + 1 : 0}/${filteredPoems.length}首`
              : `${displayPoems.length}/${filteredPoems.length}首`}
          </span>
        </div>

        {/* Line 2: Display Options + Learned */}
        <DisplayOptionsToggle
          showYomiKana={showYomiKana}
          showToriKana={showToriKana}
          showKimariji={showKimariji}
          onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
          onToggleToriKana={() => setShowToriKana(!showToriKana)}
          onToggleKimariji={() => setShowKimariji(!showKimariji)}
          onShuffle={handleShuffle}
          learnedCount={learnedCount}
          filterMode={filterMode}
          onCycleFilterMode={cycleFilterMode}
          onClearLearned={handleClearAll}
          isAuthenticated={isAuthenticated}
        />

        {/* Line 3: Kimariji Filter */}
        <KimarijiSelector
          selected={selectedKimariji}
          onChange={setSelectedKimariji}
          compact
        />

        {/* Line 4: Poem Range Filter */}
        <PoemRangeSelector
          selected={selectedPoemRange}
          onChange={setSelectedPoemRange}
          compact
        />
      </div>

      {/* Cards - 1枚モードは中央に大きく、それ以外はグリッド (横向き=4×3, 縦向き=3×4) */}
      {displayPoems.length > 0 ? (
        displayCount === 1 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-full max-w-[280px]">
              {renderCard(displayPoems[0])}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                className="px-4 py-1.5 text-sm font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                ← 前
              </button>
              <span className="text-xs text-gray-400 min-w-[4rem] text-center">
                {currentIndex + 1} / {shuffledPoems.length}
              </span>
              <button
                onClick={goNext}
                className="px-4 py-1.5 text-sm font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                次 →
              </button>
            </div>
            <p className="text-[11px] text-gray-400">札をタップでめくる</p>
          </div>
        ) : (
          <div className={displayCount === 12 ? "karuta-grid" : "karuta-grid-all"}>
            {displayPoems.map(renderCard)}
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          該当する札がありません
        </div>
      )}

      {selectedPoem && (
        <PoemDetailModal
          poem={selectedPoem}
          onClose={() => setSelectedPoem(null)}
        />
      )}

      {/* Show More */}
      {displayCount === 12 && filteredPoems.length > displayCount && (
        <div className="text-center py-2">
          <button
            onClick={() => setDisplayCount(100)}
            className="text-sm text-karuta-tansei hover:underline"
          >
            すべて表示 ({filteredPoems.length}首)
          </button>
        </div>
      )}
    </div>
  );
}
