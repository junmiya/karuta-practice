import { useMemo } from 'react';
import { getPoemCountByKimariji } from '@/services/poems.service';
import { SelectButton } from '@/components/ui/SelectButton';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Typography';

interface KimarijiSelectorProps {
  selected: number[];
  onChange: (selected: number[]) => void;
  compact?: boolean;
  label?: string;
}

/**
 * 決まり字選択コンポーネント
 *
 * デザインルール準拠:
 * - SelectButtonを使用してON/OFF状態を統一
 * - OFF: グレー背景 + 濃い文字
 * - ON: 淡青背景 + 白文字
 */
export function KimarijiSelector({
  selected,
  onChange,
  compact = false,
  label = '決まり字数',
}: KimarijiSelectorProps) {
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  const toggleKimariji = (count: number) => {
    onChange(
      selected.includes(count)
        ? selected.filter(c => c !== count)
        : [...selected, count].sort()
    );
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedPoemCount = selected.length > 0
    ? selected.reduce((sum, k) => sum + (poemCounts[k] || 0), 0)
    : 100;

  if (compact) {
    // 1行コンパクト版
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4, 5, 6].map(count => {
            const isSelected = selected.includes(count);
            return (
              <SelectButton
                key={count}
                isSelected={isSelected}
                onVariant="onPrimary"
                size="sm"
                shape="pill"
                onClick={() => toggleKimariji(count)}
                className="min-w-0 px-2 py-0.5 text-xs"
              >
                {count}字
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

  // Standard version (for filters) - コンパクト横並び
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Text size="xs" weight="medium" className="text-gray-600">{label}</Text>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map(count => {
          const isSelected = selected.includes(count);
          return (
            <SelectButton
              key={count}
              isSelected={isSelected}
              onVariant="onPrimary"
              size="sm"
              shape="pill"
              onClick={() => toggleKimariji(count)}
              className="min-w-0 px-2"
            >
              {count}字
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

// Hook to manage kimariji selection state
export function useKimarijiSelection() {
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  const getSelectedPoemCount = (selected: number[]) => {
    return selected.length > 0
      ? selected.reduce((sum, k) => sum + (poemCounts[k] || 0), 0)
      : 100;
  };

  return { poemCounts, getSelectedPoemCount };
}
