import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLearned } from '@/hooks/useLearned';
import { getDisplaySettings } from '@/lib/displaySettings';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';

/**
 * 覚えてない一覧: 手習で「覚えてない」を押した札を、上の句と下の句を並べて見る
 */
export function NotLearnedPage() {
  const [initial] = useState(() => getDisplaySettings().tenarai);
  const [showKana, setShowKana] = useState(initial.yomiKana);
  const [showKimariji, setShowKimariji] = useState(initial.kimariji);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);

  const { user, loading: authLoading } = useAuthContext();
  const { notLearnedPoemIds, notLearnedCount, loading, getStatus, setStatus } = useLearned(user?.uid ?? null);

  // このページで「覚えた」にした札もすぐには消さず、「戻す」で取り消せるようにする
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setSeenIds(prev => {
      const missing = [...notLearnedPoemIds].filter(id => !prev.has(id));
      return missing.length ? new Set([...prev, ...missing]) : prev;
    });
  }, [notLearnedPoemIds]);
  // ログイン状態が変わったら（別の記録になるので）表示し直す
  useEffect(() => {
    setSeenIds(new Set());
  }, [user?.uid]);

  const allPoems = useMemo(() => getAllPoemsSync(), []);
  const poems = useMemo(
    () => allPoems.filter(p => seenIds.has(p.poemId)).sort((a, b) => a.order - b.order),
    [allPoems, seenIds]
  );

  if (!allPoems.length || authLoading || loading) {
    return <LoadingSpinner fullScreen message="読み込み中..." />;
  }

  const toggleClass = (on: boolean) => cn(
    'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap',
    on ? 'bg-karuta-tansei text-white border-karuta-tansei' : 'bg-white text-gray-600 border-gray-200 hover:border-karuta-tansei/50'
  );

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* 見出し */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-karuta-tansei whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            手習
          </Link>
          <h1 className="text-base font-bold text-karuta-tansei whitespace-nowrap">覚えてない札</h1>
          <span className="text-xs text-gray-500 whitespace-nowrap">{notLearnedCount}首</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowKana(v => !v)} aria-pressed={showKana} className={toggleClass(showKana)}>
            かな
          </button>
          <button onClick={() => setShowKimariji(v => !v)} aria-pressed={showKimariji} className={toggleClass(showKimariji)}>
            決まり字
          </button>
        </div>
      </div>

      {poems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center space-y-3">
          <p className="text-sm text-gray-600">覚えてない札はありません。</p>
          <p className="text-xs text-gray-500">
            手習で札の下の「覚えてない」を押すと、ここに上の句と下の句を並べて表示します。
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 text-sm font-bold text-white bg-karuta-tansei rounded hover:opacity-90"
          >
            手習へ
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {poems.map(poem => {
            const status = getStatus(poem.poemId);
            const learned = status === 'learned';
            return (
              <li
                key={poem.poemId}
                data-poem={poem.order}
                className={cn(
                  'bg-white border rounded-lg p-2 space-y-1.5 transition-opacity',
                  learned ? 'border-green-200 opacity-60' : 'border-gray-200'
                )}
              >
                <div className="flex items-baseline gap-2 min-w-0 px-0.5">
                  <span className="text-sm font-bold text-karuta-tansei tabular-nums">{poem.order}</span>
                  <span className="text-xs text-gray-600 truncate">{poem.author}</span>
                </div>
                {/* 上の句と下の句を並べる */}
                <div className="grid grid-cols-2 gap-2">
                  <figure className="min-w-0 space-y-0.5">
                    <figcaption className="text-[11px] text-gray-500 text-center">上の句</figcaption>
                    <KarutaCard
                      poem={poem}
                      mode="yomi"
                      showYomiKana={showKana}
                      showKimariji={showKimariji}
                      onClick={() => setSelectedPoem(poem)}
                    />
                  </figure>
                  <figure className="min-w-0 space-y-0.5">
                    <figcaption className="text-[11px] text-gray-500 text-center">下の句</figcaption>
                    <KarutaCard
                      poem={poem}
                      mode="tori"
                      showToriKana={showKana}
                      onClick={() => setSelectedPoem(poem)}
                    />
                  </figure>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {learned ? (
                    <button
                      onClick={() => setStatus(poem.poemId, 'notLearned')}
                      data-action="undo"
                      className="py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                    >
                      ✓ 覚えた（戻す）
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(poem.poemId, 'learned')}
                      data-action="learned"
                      className="py-1.5 text-xs font-bold rounded border border-green-300 bg-white text-green-700 hover:bg-green-50 whitespace-nowrap"
                    >
                      覚えた
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPoem(poem)}
                    data-action="kaisetsu"
                    className="py-1.5 text-xs font-bold rounded border border-blue-100 bg-blue-50 text-karuta-tansei hover:bg-blue-100 whitespace-nowrap"
                  >
                    解説
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPoem && (
        <PoemDetailModal poem={selectedPoem} onClose={() => setSelectedPoem(null)} />
      )}
    </div>
  );
}
