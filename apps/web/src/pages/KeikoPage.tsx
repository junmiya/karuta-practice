/**
 * 稽古ページ（練習モード選択）
 *
 * - 練習モード: 10問・8択
 * - 研鑽モード: 無制限・12枚
 * - 決まり字・札範囲の絞り込み
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPoemCountByKimariji } from '@/services/poems.service';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';

export function KeikoPage() {
  const navigate = useNavigate();

  // 決まり字・札範囲選択（練習モード用）
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  // 選択中の首数を計算（両フィルタの交差を考慮した概算）
  const selectedPoemCount = useMemo(() => {
    let count = 100;
    if (selectedKimariji.length > 0) {
      count = selectedKimariji.reduce((sum, k) => sum + (poemCounts[k] || 0), 0);
    }
    if (selectedPoemRange.length > 0) {
      const rangeCount = selectedPoemRange.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      // 両方選択時は小さい方を表示（実際のフィルタ結果は異なる場合あり）
      if (selectedKimariji.length > 0) {
        count = Math.min(count, rangeCount);
      } else {
        count = rangeCount;
      }
    }
    return count;
  }, [selectedKimariji, selectedPoemRange, poemCounts]);

  const startPractice = () => {
    const params = new URLSearchParams();
    if (selectedKimariji.length > 0) {
      params.set('kimariji', selectedKimariji.join(','));
    }
    if (selectedPoemRange.length > 0) {
      params.set('range', selectedPoemRange.map(r => `${r.start}-${r.end}`).join(','));
    }
    const query = params.toString();
    navigate(query ? `/practice?${query}` : '/practice');
  };

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* モード選択カード */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Line 1: Mode buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startPractice}
            className="py-2 px-3 bg-red-50 border border-karuta-red/30 rounded-lg hover:bg-red-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-red">練習</div>
            <div className="text-xs text-gray-500">10問・8択・{selectedPoemCount}首</div>
          </button>
          <button
            onClick={() => navigate('/practice12')}
            className="py-2 px-3 bg-amber-50 border border-karuta-accent/30 rounded-lg hover:bg-amber-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-accent">研鑽</div>
            <div className="text-xs text-gray-500">無制限・12枚実戦</div>
          </button>
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
      </div>
    </div>
  );
}
