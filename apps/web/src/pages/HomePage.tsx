import { useState, useMemo, useCallback } from 'react';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { ControlBar } from '@/components/ControlBar';
import { useAuth } from '@/hooks/useAuth';
import { useLearned } from '@/hooks/useLearned';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';

export function HomePage() {
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(true);
  const [displayCount, setDisplayCount] = useState<12 | 100>(12);
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const { user } = useAuth();
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

  // Display poems (limited by displayCount, shuffled if needed)
  const displayPoems = useMemo(() => {
    if (displayCount === 100) {
      return filteredPoems;
    }

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

    return shuffled.slice(0, displayCount);
  }, [filteredPoems, displayCount, shuffleSeed]);

  // Shuffle handler
  const handleShuffle = useCallback(() => {
    setShuffleSeed(prev => prev + 1);
  }, []);

  if (!allPoems.length) {
    return <LoadingSpinner fullScreen message="読み込み中..." />;
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Control Panel - 3行レイアウト */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Line 1: Search + Count */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索..."
            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-karuta-tansei/50"
          />
          <div className="flex bg-gray-100 rounded p-0.5">
            {([12, 100] as const).map(count => (
              <button
                key={count}
                onClick={() => setDisplayCount(count)}
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
        </div>

        {/* Line 2: Kimariji */}
        <KimarijiSelector
          selected={selectedKimariji}
          onChange={setSelectedKimariji}
          compact
        />

        {/* Line 3: Poem Range */}
        <PoemRangeSelector
          selected={selectedPoemRange}
          onChange={setSelectedPoemRange}
          compact
        />

        {/* Line 4: Options + Info */}
        <div className="flex items-center justify-between text-xs">
          <ControlBar
            showYomiKana={showYomiKana}
            onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
            showToriKana={showToriKana}
            onToggleToriKana={() => setShowToriKana(!showToriKana)}
            showKimariji={showKimariji}
            onToggleKimariji={() => setShowKimariji(!showKimariji)}
            learnedFilterMode={filterMode}
            onCycleLearnedFilter={cycleFilterMode}
            learnedCount={learnedCount}
            isLearnedEnabled={isAuthenticated}
            onClearLearned={isAuthenticated ? handleClearAll : undefined}
            onShuffle={handleShuffle}
          />
          <span className="text-gray-400">
            {displayPoems.length}/{filteredPoems.length}首
          </span>
        </div>
      </div>

      {/* Cards Grid - デバイス向きベースのグリッド (横向き=4×3, 縦向き=3×4) */}
      {displayPoems.length > 0 ? (
        <div className={displayCount === 12 ? "karuta-grid" : "karuta-grid-all"}>
          {displayPoems.map(poem => (
            <div key={poem.poemId} className="flex flex-col gap-2 group">
              <KarutaCard
                poem={poem}
                mode="flip"
                showYomiKana={showYomiKana}
                showToriKana={showToriKana}
                showKimariji={showKimariji}
              />
              <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
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
          ))}
        </div>
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
      {displayCount !== 100 && filteredPoems.length > displayCount && (
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
