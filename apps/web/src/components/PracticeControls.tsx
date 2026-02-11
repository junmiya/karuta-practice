import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { DisplayOptionsToggle } from '@/components/DisplayOptionsToggle';

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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {/* 表示オプション */}
        <DisplayOptionsToggle
          showYomiKana={showYomiKana}
          showToriKana={showToriKana}
          showKimariji={showKimariji}
          onToggleYomiKana={onToggleYomiKana}
          onToggleToriKana={onToggleToriKana}
          onToggleKimariji={onToggleKimariji}
          onShuffle={onShuffle}
        />

        {/* フィルター */}
        <div className="flex items-center gap-2">
          <KimarijiSelector
            selected={kimarijiFilter}
            onChange={onKimarijiFilterChange}
            label="決まり字"
          />
          <PoemRangeSelector
            selected={poemRangeFilter}
            onChange={onPoemRangeFilterChange}
            label="札番号"
          />
        </div>
      </div>
    </div>
  );
}
