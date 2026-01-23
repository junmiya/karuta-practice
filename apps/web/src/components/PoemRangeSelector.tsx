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
 */
export function PoemRangeSelector({
  selected,
  onChange,
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

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex gap-1">
        {POEM_RANGES.map(range => {
          const isSelected = selected.some(r => r.start === range.start);
          return (
            <button
              key={range.start}
              onClick={() => toggleRange(range)}
              className="h-7 px-2 text-xs font-semibold rounded-full border transition-colors"
              style={
                isSelected
                  ? { backgroundColor: '#D97706', color: '#ffffff', borderColor: '#D97706' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' }
              }
            >
              {range.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={clearAll}
          className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
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
