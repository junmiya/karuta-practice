import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { cn } from '@/lib/utils';

interface PracticeControlsProps {
  showYomiKana: boolean;
  showToriKana: boolean;
  showKimariji: boolean;
  kimarijiFilter: number[];
  poemRangeFilter: PoemRange[];
  onToggleYomiKana: () => void;
  onToggleToriKana: () => void;
  onToggleKimariji: () => void;
  onShuffle: () => void;
  onKimarijiFilterChange: (counts: number[]) => void;
  onPoemRangeFilterChange: (ranges: PoemRange[]) => void;
}

export function PracticeControls({
  showYomiKana,
  showToriKana,
  showKimariji,
  kimarijiFilter,
  poemRangeFilter,
  onToggleYomiKana,
  onToggleToriKana,
  onToggleKimariji,
  onShuffle,
  onKimarijiFilterChange,
  onPoemRangeFilterChange,
}: PracticeControlsProps) {
  // 共通ボタンスタイル
  const baseBtn = "h-7 px-2.5 text-xs font-bold rounded-full transition-all border";
  const activeBtn = "bg-white shadow-sm";
  const inactiveBtn = "text-gray-500 hover:text-gray-700 border-transparent";

  return (
    <div className="flex flex-col gap-2">
      {/* Control Bar with separate yomi/tori kana toggles */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full">
          {/* 読札: 漢字/かな */}
          <span className="text-[10px] text-gray-400 pl-1.5">読</span>
          <button
            onClick={onToggleYomiKana}
            className={cn(
              baseBtn,
              showYomiKana
                ? `${activeBtn} text-karuta-tansei border-karuta-tansei/30`
                : inactiveBtn
            )}
          >
            {showYomiKana ? 'かな' : '漢字'}
          </button>

          {/* 取札: 漢字/かな */}
          <span className="text-[10px] text-gray-400 pl-1">取</span>
          <button
            onClick={onToggleToriKana}
            className={cn(
              baseBtn,
              showToriKana
                ? `${activeBtn} text-green-600 border-green-300`
                : inactiveBtn
            )}
          >
            {showToriKana ? 'かな' : '漢字'}
          </button>

          {/* 決まり字 */}
          <button
            onClick={onToggleKimariji}
            className={cn(
              baseBtn,
              showKimariji
                ? `${activeBtn} text-karuta-accent border-karuta-accent/30`
                : inactiveBtn
            )}
          >
            決まり字
          </button>

          {/* シャッフル */}
          <button
            onClick={onShuffle}
            className={cn(baseBtn, inactiveBtn)}
            title="シャッフル"
          >
            🔀
          </button>
        </div>

        <KimarijiSelector
          selected={kimarijiFilter}
          onChange={onKimarijiFilterChange}
          label="決まり字:"
        />
        <PoemRangeSelector
          selected={poemRangeFilter}
          onChange={onPoemRangeFilterChange}
          label="札番号:"
        />
      </div>
    </div>
  );
}
