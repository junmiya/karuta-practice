import { SelectButton } from '@/components/ui/SelectButton';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Typography';

export interface PoemRange {
  start: number;
  end: number;
  label: string;
}

// 札番号の範囲定義
export const POEM_RANGES: PoemRange[] = [
  { start: 1, end: 20, label: '1-20' },
  { start: 21, end: 40, label: '21-40' },
  { start: 41, end: 60, label: '41-60' },
  { start: 61, end: 80, label: '61-80' },
  { start: 81, end: 100, label: '81-100' },
];

interface PoemRangeSelectorProps {
  selected: PoemRange[];
  onChange: (selected: PoemRange[]) => void;
  compact?: boolean;
  label?: string;
}

/**
 * 札番号範囲選択コンポーネント
 *
 * 1-20, 21-40, 41-60, 61-80, 81-100 の範囲で選択
 */
export function PoemRangeSelector({
  selected,
  onChange,
  compact = false,
  label = '札番号',
}: PoemRangeSelectorProps) {
  const toggleRange = (range: PoemRange) => {
    const isSelected = selected.some(r => r.start === range.start);
    if (isSelected) {
      onChange(selected.filter(r => r.start !== range.start));
    } else {
      onChange([...selected, range].sort((a, b) => a.start - b.start));
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedPoemCount = selected.length > 0
    ? selected.reduce((sum, r) => sum + (r.end - r.start + 1), 0)
    : 100;

  if (compact) {
    // 1行コンパクト版
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
        <div className="flex gap-1 flex-1">
          {POEM_RANGES.map(range => {
            const isSelected = selected.some(r => r.start === range.start);
            return (
              <SelectButton
                key={range.start}
                isSelected={isSelected}
                onVariant="onAccent"
                size="sm"
                shape="pill"
                onClick={() => toggleRange(range)}
                className="min-w-0 px-2 py-0.5 text-xs"
              >
                {range.label}
              </SelectButton>
            );
          })}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {selected.length > 0 ? `${selectedPoemCount}首` : '全100首'}
        </span>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Standard version - コンパクト横並び
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Text size="xs" weight="medium" className="text-gray-600">{label}</Text>
      <div className="flex gap-1">
        {POEM_RANGES.map(range => {
          const isSelected = selected.some(r => r.start === range.start);
          return (
            <SelectButton
              key={range.start}
              isSelected={isSelected}
              onVariant="onAccent"
              size="sm"
              shape="pill"
              onClick={() => toggleRange(range)}
              className="min-w-0 px-2"
            >
              {range.label}
            </SelectButton>
          );
        })}
      </div>
      {selected.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          ✕
        </Button>
      )}
    </div>
  );
}

/**
 * 札番号範囲でフィルタリングするヘルパー関数
 */
export function filterPoemsByRange<T extends { order: number }>(
  poems: T[],
  ranges: PoemRange[]
): T[] {
  if (ranges.length === 0) {
    return poems;
  }
  return poems.filter(poem =>
    ranges.some(range => poem.order >= range.start && poem.order <= range.end)
  );
}
