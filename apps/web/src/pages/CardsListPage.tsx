import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { Container } from '@/components/ui/Container';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { ControlBar } from '@/components/ControlBar';
import type { Poem } from '@/types/poem';

export function CardsListPage() {
  const navigate = useNavigate();
  const [showKana, setShowKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(true);
  const [displayCount, setDisplayCount] = useState<12 | 100>(12);
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
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
  }, [allPoems, selectedKimariji, searchText]);

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
    <Container size="md" className="space-y-6 py-4">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading as="h2" size="h2" className="mb-1">基本モード</Heading>
            <Text color="muted" size="sm">
              百人一首 札一覧 - タップで上の句⇔下の句を切り替え
            </Text>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            ← 戻る
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="歌・作者・決まり字で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-tansei"
            />
          </div>

          {/* Kimariji Filter */}
          <div>
            <KimarijiSelector
              selected={selectedKimariji}
              onChange={setSelectedKimariji}
              label="決まり字で絞り込み"
            />
          </div>

          {/* Display Options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Display Count */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">表示:</span>
              {([12, 100] as const).map(count => (
                <Button
                  key={count}
                  variant={displayCount === count ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayCount(count)}
                  className="h-6 px-2 text-xs"
                >
                  {count === 100 ? '全て' : `${count}枚`}
                </Button>
              ))}
            </div>

            {/* Control Bar */}
            <ControlBar
              showKana={showKana}
              onToggleKana={() => setShowKana(!showKana)}
              showKimariji={showKimariji}
              onToggleKimariji={() => setShowKimariji(!showKimariji)}
              className="ml-auto"
            />
          </div>
        </div>
      </Card>

      {/* Results Info */}
      <div className="text-sm text-gray-600 px-1">
        {filteredPoems.length}首中 {displayPoems.length}首を表示
        {selectedKimariji.length > 0 && (
          <span className="ml-2 text-karuta-red font-medium">
            ({selectedKimariji.map(n => `${n}字`).join('・')}決まり)
          </span>
        )}
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
                showKana={showKana}
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
        <div className="text-center py-4">
          <Button variant="secondary" onClick={() => setDisplayCount(100)}>
            すべて表示 ({filteredPoems.length}首)
          </Button>
        </div>
      )}
    </Container>
  );
}

