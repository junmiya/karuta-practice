import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPoemsSync, getPoemCountByKimariji } from '@/services/poems.service';
import { PoemCard } from '@/components/PoemCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function CardsListPage() {
  const navigate = useNavigate();
  const [showKana, setShowKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(true);
  const [displayCount, setDisplayCount] = useState<8 | 16 | 100>(16);
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');

  const allPoems = useMemo(() => getAllPoemsSync(), []);
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

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

  const toggleKimariji = (count: number) => {
    setSelectedKimariji(prev =>
      prev.includes(count)
        ? prev.filter(c => c !== count)
        : [...prev, count].sort()
    );
  };

  if (!allPoems.length) {
    return <LoadingSpinner fullScreen message="読み込み中..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">百人一首 札一覧</h2>
            <p className="text-gray-600 text-sm mt-1">
              タップで上の句⇔下の句を切り替え
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-karuta-red"
          >
            ← 戻る
          </button>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-red"
            />
          </div>

          {/* Kimariji Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">決まり字で絞り込み</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map(count => {
                const isSelected = selectedKimariji.includes(count);
                const poems = poemCounts[count] || 0;
                return (
                  <button
                    key={count}
                    onClick={() => toggleKimariji(count)}
                    className={`px-3 py-1 rounded border text-sm transition-all ${
                      isSelected
                        ? 'bg-karuta-red text-white border-karuta-red'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-karuta-red'
                    }`}
                  >
                    {count}字 ({poems})
                  </button>
                );
              })}
              {selectedKimariji.length > 0 && (
                <button
                  onClick={() => setSelectedKimariji([])}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* Display Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Display Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">表示数:</span>
              {([8, 16, 100] as const).map(count => (
                <button
                  key={count}
                  onClick={() => setDisplayCount(count)}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    displayCount === count
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {count === 100 ? '全て' : count}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKimariji(!showKimariji)}
                className={`px-3 py-1 border text-sm font-medium transition-all rounded ${
                  showKimariji
                    ? 'bg-karuta-gold text-white border-karuta-gold'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                決
              </button>
              <button
                onClick={() => setShowKana(!showKana)}
                className={`px-3 py-1 border text-sm font-medium transition-all rounded ${
                  showKana
                    ? 'bg-karuta-red text-white border-karuta-red'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {showKana ? 'あ' : '漢'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        {filteredPoems.length}首中 {displayPoems.length}首を表示
        {selectedKimariji.length > 0 && (
          <span className="ml-2 text-karuta-red">
            ({selectedKimariji.map(n => `${n}字`).join('・')}決まり)
          </span>
        )}
      </div>

      {/* Cards Grid */}
      {displayPoems.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          {displayPoems.map(poem => (
            <PoemCard
              key={poem.poemId}
              poem={poem}
              showKana={showKana}
              showKimariji={showKimariji}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">該当する札がありません</p>
        </div>
      )}

      {/* Show More */}
      {displayCount !== 100 && filteredPoems.length > displayCount && (
        <div className="text-center">
          <button
            onClick={() => setDisplayCount(100)}
            className="btn-secondary"
          >
            すべて表示 ({filteredPoems.length}首)
          </button>
        </div>
      )}
    </div>
  );
}
