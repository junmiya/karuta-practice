import { useState, useMemo } from 'react';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { ControlBar } from '@/components/ControlBar';
import type { Poem } from '@/types/poem';

export function CardsListPage() {
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(true);
  const [displayCount, setDisplayCount] = useState<12 | 100>(12);
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);

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

    return result;
  }, [allPoems, selectedKimariji, selectedPoemRange, searchText]);

  // Display poems (limited by displayCount)
  const displayPoems = useMemo(() => {
    if (displayCount === 100) {
      return filteredPoems;
    }
    return filteredPoems.slice(0, displayCount);
  }, [filteredPoems, displayCount]);

  if (!allPoems.length) {
    return <LoadingSpinner fullScreen message="読み込み中..." />;
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Control Panel */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Row 1: Search + Display Count */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="歌・作者・決まり字で検索..."
            className="flex-1 h-8 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-tansei"
          />
          <div className="flex items-center gap-1">
            {([12, 100] as const).map(count => (
              <Button
                key={count}
                variant={displayCount === count ? "primary" : "ghost"}
                size="sm"
                onClick={() => setDisplayCount(count)}
                className="h-7 px-2 text-xs"
              >
                {count === 100 ? '全' : `${count}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Filters: Kimariji + Poem Range */}
        <div className="flex items-center gap-2">
          <KimarijiSelector
            selected={selectedKimariji}
            onChange={setSelectedKimariji}
            compact
          />
          <PoemRangeSelector
            selected={selectedPoemRange}
            onChange={setSelectedPoemRange}
            compact
          />
        </div>

        {/* Row 4: Control Bar + Count */}
        <div className="flex items-center justify-between">
          <ControlBar
            showYomiKana={showYomiKana}
            onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
            showToriKana={showToriKana}
            onToggleToriKana={() => setShowToriKana(!showToriKana)}
            showKimariji={showKimariji}
            onToggleKimariji={() => setShowKimariji(!showKimariji)}
          />
          <span className="text-xs text-gray-500">
            {filteredPoems.length}/{allPoems.length}首
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      {displayPoems.length > 0 ? (
        <div className={
          displayCount === 12
            ? "karuta-grid"
            : "karuta-grid-all"
        }>
          {displayPoems.map(poem => (
            <div key={poem.poemId} className="flex flex-col gap-2">
              <KarutaCard
                poem={poem}
                mode="flip"
                showYomiKana={showYomiKana}
                showToriKana={showToriKana}
                showKimariji={showKimariji}
              />
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setSelectedPoem(poem)}
                className="h-8 text-xs bg-blue-50 border-blue-100 text-karuta-tansei hover:bg-blue-100"
              >
                <span className="mr-1 text-sm">✨</span> 解説
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card centered className="py-12">
          <p className="text-gray-500">該当する札がありません</p>
        </Card>
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
          <Button variant="secondary" size="sm" onClick={() => setDisplayCount(100)}>
            すべて表示 ({filteredPoems.length}首)
          </Button>
        </div>
      )}
    </div>
  );
}

