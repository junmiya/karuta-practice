import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPoemCountByKimariji } from '@/services/poems.service';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);

  // Get poem counts for each kimariji
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  const toggleKimariji = (count: number) => {
    setSelectedKimariji(prev =>
      prev.includes(count)
        ? prev.filter(c => c !== count)
        : [...prev, count].sort()
    );
  };

  const selectAll = () => {
    setSelectedKimariji([1, 2, 3, 4, 5, 6]);
  };

  const clearAll = () => {
    setSelectedKimariji([]);
  };

  const startPractice = () => {
    if (selectedKimariji.length > 0) {
      navigate(`/practice?kimariji=${selectedKimariji.join(',')}`);
    } else {
      navigate('/practice');
    }
  };

  // Calculate total poems for selected kimariji
  const selectedPoemCount = selectedKimariji.length > 0
    ? selectedKimariji.reduce((sum, k) => sum + (poemCounts[k] || 0), 0)
    : 100;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      {/* メインカード */}
      <div className="card text-center border-t-4 border-karuta-shikon">
        <h2 className="text-3xl font-bold mb-4 text-karuta-shikon tracking-wide font-serif">基本モード（無料）</h2>
        <p className="text-neutral-700 mb-8 leading-relaxed">
          百人一首の競技かるた練習アプリです。<br />
          10問・8択形式で決まり字の判断力を鍛えます。
        </p>

        {/* 決まり字選択 */}
        <div className="mb-8 p-6 bg-neutral-50 rounded border border-neutral-200">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-2">
            <h3 className="font-semibold text-karuta-shikon flex items-center gap-2">
              <span className="w-1 h-4 bg-karuta-ukon block"></span>
              決まり字で絞り込み
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 text-karuta-shikon hover:bg-karuta-shikon hover:text-white rounded-sm border border-karuta-shikon transition-colors"
              >
                全選択
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 text-neutral-600 hover:bg-neutral-600 hover:text-white rounded-sm border border-neutral-300 transition-colors"
              >
                クリア
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6].map(count => {
              const isSelected = selectedKimariji.includes(count);
              const poems = poemCounts[count] || 0;
              return (
                <button
                  key={count}
                  onClick={() => toggleKimariji(count)}
                  className={`p-3 rounded-sm border text-center transition-all ${isSelected
                      ? 'bg-karuta-shikon text-white border-karuta-shikon shadow-md'
                      : 'bg-white text-karuta-shikon border-neutral-300 hover:border-karuta-ukon hover:bg-amber-50'
                    }`}
                >
                  <div className="font-bold text-lg font-serif">{count}字</div>
                  <div className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {poems}首
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-neutral-600 bg-white p-2 rounded border border-neutral-100 inline-block">
            {selectedKimariji.length > 0 ? (
              <>
                <span className="font-bold text-karuta-ukon mr-2">{selectedKimariji.map(n => `${n}字`).join('・')}</span>
                から出題（計{selectedPoemCount}首）
              </>
            ) : (
              <span className="text-gray-400">選択なし = 全100首からランダム出題</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={startPractice}
            className="btn-primary text-lg px-10 py-4 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
          >
            <span>▶</span> 練習を開始する
          </button>
          <button
            onClick={() => navigate('/cards')}
            className="btn-secondary text-lg px-10 py-4 flex items-center justify-center gap-2"
          >
            <span>📖</span> 札を見る
          </button>
        </div>
      </div>

      {/* 基本モードの特徴 */}
      <div className="card border-0 shadow-none bg-transparent">
        <h3 className="font-bold text-xl mb-6 text-karuta-shikon text-center font-serif relative">
          <span className="bg-neutral-50 px-4 relative z-10">機能と特徴</span>
          <div className="absolute top-1/2 left-0 w-full h-px bg-neutral-300 -z-0"></div>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4 p-4 bg-white rounded border border-neutral-200">
            <span className="text-2xl text-karuta-ukon">✓</span>
            <div>
              <h4 className="font-bold mb-1 text-karuta-shikon">実戦形式の練習</h4>
              <p className="text-sm text-neutral-600">
                ランダムな10首で、8択から正解を選ぶ実戦的な形式です。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-white rounded border border-neutral-200">
            <span className="text-2xl text-karuta-ukon">⏱️</span>
            <div>
              <h4 className="font-bold mb-1 text-karuta-shikon">正確な計測</h4>
              <p className="text-sm text-neutral-600">
                100分の1秒単位で反応速度を計測し、即座にフィードバック。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-white rounded border border-neutral-200">
            <span className="text-2xl text-karuta-ukon">📊</span>
            <div>
              <h4 className="font-bold mb-1 text-karuta-shikon">結果分析</h4>
              <p className="text-sm text-neutral-600">
                練習直後に正答率と平均タイムを確認できます。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-white rounded border border-neutral-200">
            <span className="text-2xl text-karuta-ukon">あ</span>
            <div>
              <h4 className="font-bold mb-1 text-karuta-shikon">表示切替</h4>
              <p className="text-sm text-neutral-600">
                漢字・かな表示をワンタップで切り替え可能。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* もっと本格的に練習したい方へ */}
      <div className="bg-gradient-to-r from-karuta-shikon to-neutral-800 text-white rounded p-8 shadow-lg">
        <div className="md:flex items-center justify-between gap-6">
          <div className="mb-6 md:mb-0">
            <h3 className="font-bold text-xl mb-2 text-karuta-ukon font-serif">本格的な競技者へ</h3>
            <p className="text-gray-300 text-sm opacity-90">
              研鑽・競技・成績機能で、より高みを目指すための環境を提供します。<br />
              （段階1以降で実装予定）
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-white/10 rounded text-xs border border-white/20">研鑽</span>
            <span className="px-3 py-1 bg-white/10 rounded text-xs border border-white/20">競技</span>
            <span className="px-3 py-1 bg-white/10 rounded text-xs border border-white/20">成績</span>
          </div>
        </div>
      </div>
    </div>
  );
}
