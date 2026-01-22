import { ControlBar } from '@/components/ControlBar';
import { KimarijiSelector } from '@/components/KimarijiSelector';

interface PracticeControlsProps {
  showKana: boolean;
  showKimariji: boolean;
  kimarijiFilter: number[];
  onToggleKana: () => void;
  onToggleKimariji: () => void;
  onShuffle: () => void;
  onKimarijiFilterChange: (counts: number[]) => void;
}

export function PracticeControls({
  showKana,
  showKimariji,
  kimarijiFilter,
  onToggleKana,
  onToggleKimariji,
  onShuffle,
  onKimarijiFilterChange,
}: PracticeControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Unified Control Bar + Kimariji Filter in one row */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <ControlBar
          showKana={showKana}
          onToggleKana={onToggleKana}
          showKimariji={showKimariji}
          onToggleKimariji={onToggleKimariji}
          onShuffle={onShuffle}
        />
        <KimarijiSelector
          selected={kimarijiFilter}
          onChange={onKimarijiFilterChange}
          label="決まり字:"
        />
      </div>
    </div>
  );
}
