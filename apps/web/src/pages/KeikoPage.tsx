/**
 * 稽古ページ（練習モード選択）
 *
 * - 練習モード: 12枚・手動次へ
 * - 研鑽モード: 12枚・自動次へ
 * - 決まり字・札範囲の絞り込み
 * - 読札・取札の表示設定
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPoemCountByKimariji } from '@/services/poems.service';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { DisplayOptionsToggle } from '@/components/DisplayOptionsToggle';

export function KeikoPage() {
  const navigate = useNavigate();

  // 決まり字・札範囲選択（練習モード用）
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  // 表示設定
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(false);

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

  const buildParams = (mode?: string) => {
    const params = new URLSearchParams();
    if (mode) {
      params.set('mode', mode);
    }
    if (selectedKimariji.length > 0) {
      params.set('kimariji', selectedKimariji.join(','));
    }
    if (selectedPoemRange.length > 0) {
      params.set('range', selectedPoemRange.map(r => `${r.start}-${r.end}`).join(','));
    }
    if (showYomiKana) {
      params.set('yomiKana', '1');
    }
    if (showToriKana) {
      params.set('toriKana', '1');
    }
    if (showKimariji) {
      params.set('kimariji_show', '1');
    }
    return params.toString();
  };

  const startPractice = () => {
    navigate(`/practice12?${buildParams('renshu')}`);
  };

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* 説明 */}
      <div className="bg-white/90 border border-gray-200 rounded-lg px-3 py-2">
        <p className="text-sm text-gray-700">
          読み札から取り札を選ぶ練習です。表示オプションと対象札を選択して開始してください。
        </p>
      </div>

      {/* モード選択カード */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Display options: 読札・取札・決まり字 */}
        <DisplayOptionsToggle
          showYomiKana={showYomiKana}
          showToriKana={showToriKana}
          showKimariji={showKimariji}
          onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
          onToggleToriKana={() => setShowToriKana(!showToriKana)}
          onToggleKimariji={() => setShowKimariji(!showKimariji)}
          label="表示"
        />

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

        {/* Mode buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startPractice}
            className="py-2 px-3 bg-red-50 border border-karuta-red/30 rounded-lg hover:bg-red-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-red">練習</div>
            <div className="text-xs text-gray-500">手動次へ・{selectedPoemCount}首</div>
          </button>
          <button
            onClick={() => {
              const query = buildParams();
              navigate(query ? `/practice12?${query}` : '/practice12');
            }}
            className="py-2 px-3 bg-amber-50 border border-karuta-accent/30 rounded-lg hover:bg-amber-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-accent">研鑽</div>
            <div className="text-xs text-gray-500">自動次へ・{selectedPoemCount}首</div>
          </button>
        </div>
      </div>
    </div>
  );
}
