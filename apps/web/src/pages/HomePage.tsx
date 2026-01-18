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
    <div className="space-y-8 max-w-4xl mx-auto py-12 px-4">
      {/* メインカード - UTokyo Style: Clean, Light, Blue */}
      <div className="card text-center border-t-8 border-karuta-tansei shadow-xl rounded-xl overflow-hidden">
        <div className="bg-blue-50 pt-10 pb-6 px-6">
          <h2 className="text-4xl font-bold mb-4 text-karuta-tansei tracking-tight font-sans">基本モード</h2>
          <p className="text-neutral-600 mb-0 leading-relaxed max-w-xl mx-auto">
            百人一首の競技かるた練習アプリです。<br />
            静謐な環境で、決まり字の判断力を磨きましょう。
          </p>
        </div>

        <div className="p-8">
          {/* 決まり字選択 */}
          <div className="mb-10 p-6 bg-white rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-blue-100 pb-4">
              <h3 className="font-bold text-neutral-700 flex items-center gap-3 text-lg">
                <span className="w-1.5 h-6 bg-karuta-tansei rounded-full block"></span>
                出題範囲の設定
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-4 py-2 text-karuta-tansei font-bold hover:bg-blue-50 rounded-full border border-blue-200 transition-colors"
                >
                  全選択
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs px-4 py-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 rounded-full border border-neutral-200 transition-colors"
                >
                  クリア
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6].map(count => {
                const isSelected = selectedKimariji.includes(count);
                const poems = poemCounts[count] || 0;
                return (
                  <button
                    key={count}
                    onClick={() => toggleKimariji(count)}
                    className={`p-4 rounded-lg border text-center transition-all duration-200 ${isSelected
                      ? 'bg-karuta-tansei text-white border-karuta-tansei shadow-md transform scale-105'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-karuta-tansei hover:text-karuta-tansei hover:bg-blue-50'
                      }`}
                  >
                    <div className="font-bold text-xl mb-1">{count}字</div>
                    <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-neutral-400'}`}>
                      {poems}首
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${selectedKimariji.length > 0
                ? 'bg-blue-50 text-karuta-tansei border-blue-100'
                : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                }`}>
                {selectedKimariji.length > 0 ? (
                  <>
                    現在 <span className="font-bold text-lg mx-1">{selectedPoemCount}</span> 首から出題されます
                  </>
                ) : (
                  '決まり字を選択してください（選択なしの場合は全100首）'
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button
              onClick={startPractice}
              className="btn-primary text-lg shadow-blue-200 flex items-center justify-center gap-3 min-w-[240px]"
            >
              <span>▶</span> 練習を開始する
            </button>
            <button
              onClick={() => navigate('/cards')}
              className="btn-secondary text-lg flex items-center justify-center gap-3 min-w-[240px]"
            >
              <span>📖</span> 札一覧を見る
            </button>
          </div>
        </div>
      </div>

      {/* 機能紹介 - Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-karuta-tansei text-xl mb-4">
            ⏱️
          </div>
          <h4 className="font-bold text-lg mb-2 text-neutral-800">精密計測</h4>
          <p className="text-sm text-neutral-600 leading-relaxed">
            0.01秒単位での反応速度計測。即座にフィードバックを表示し、競技感覚を養います。
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-karuta-tansei text-xl mb-4">
            📊
          </div>
          <h4 className="font-bold text-lg mb-2 text-neutral-800">データ分析</h4>
          <p className="text-sm text-neutral-600 leading-relaxed">
            練習ごとの正答率と平均タイムを可視化。自分の成長を客観的な数値で把握できます。
          </p>
        </div>
      </div>

      {/* 本格的な機能への導線 */}
      <div className="mt-8 rounded-2xl overflow-hidden relative shadow-lg group cursor-pointer">
        <div className="absolute inset-0 bg-karuta-tansei opacity-90 transition-opacity group-hover:opacity-100"></div>
        <div className="relative p-8 flex flex-col md:flex-row items-center justify-between text-neutral-800">
          <div className="mb-6 md:mb-0 md:pr-8">
            <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
              Next Level
              <span className="text-xs bg-black/10 px-2 py-1 rounded border border-black/20">Coming Soon</span>
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              研鑽モード・公式戦・段位認定など、<br />
              より高度な競技機能の実装を予定しています。
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {['研鑽', '競技', '成績', '段位'].map(label => (
              <span key={label} className="px-4 py-2 bg-black/10 backdrop-blur-sm rounded-lg text-sm font-medium border border-black/20 shadow-sm whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
