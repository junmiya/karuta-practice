import { cn } from '@/lib/utils';

export type LearnedFilterMode = 'normal' | 'exclude' | 'prioritize';

export interface ControlBarProps {
  /** ひらがな表示状態 */
  showKana: boolean;
  /** ひらがな切替 */
  onToggleKana: () => void;
  /** 決まり字表示状態 */
  showKimariji?: boolean;
  /** 決まり字切替 */
  onToggleKimariji?: () => void;
  /** 覚えたフィルターモード */
  learnedFilterMode?: LearnedFilterMode;
  /** 覚えた切替 */
  onCycleLearnedFilter?: () => void;
  /** 覚えた数 */
  learnedCount?: number;
  /** 覚えた機能が有効か（ログイン必須） */
  isLearnedEnabled?: boolean;
  /** シャッフル */
  onShuffle?: () => void;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 統一コントロールバーコンポーネント（コンパクト版）
 *
 * 全ページ共通のコントロールUIを提供
 * ボタン順序: 漢字/かな → 決まり字 → 覚えた → 🔀
 */
export function ControlBar({
  showKana,
  onToggleKana,
  showKimariji,
  onToggleKimariji,
  learnedFilterMode = 'normal',
  onCycleLearnedFilter,
  learnedCount = 0,
  isLearnedEnabled = false,
  onShuffle,
  className,
}: ControlBarProps) {
  // 覚えたフィルターのラベル
  const getLearnedLabel = () => {
    switch (learnedFilterMode) {
      case 'exclude': return '除外';
      case 'prioritize': return '優先';
      default: return '';
    }
  };

  const isLearnedActive = learnedFilterMode !== 'normal';

  // 共通ボタンスタイル
  const baseBtn = "h-7 px-2.5 text-xs font-bold rounded-full transition-all border";
  const activeBtn = "bg-white shadow-sm";
  const inactiveBtn = "text-gray-500 hover:text-gray-700 border-transparent";

  return (
    <div className={cn('flex items-center gap-1 bg-gray-100 p-1 rounded-full', className)}>
      {/* 1. 漢字/かな */}
      <button
        onClick={onToggleKana}
        className={cn(
          baseBtn,
          showKana
            ? `${activeBtn} text-karuta-tansei border-karuta-tansei/30`
            : inactiveBtn
        )}
      >
        {showKana ? 'かな' : '漢字'}
      </button>

      {/* 2. 決まり字 */}
      {onToggleKimariji && (
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
      )}

      {/* 3. 覚えた */}
      {onCycleLearnedFilter && (
        <button
          onClick={onCycleLearnedFilter}
          disabled={!isLearnedEnabled}
          title={!isLearnedEnabled ? 'ログイン必須' : '通常→除外→優先'}
          className={cn(
            baseBtn,
            !isLearnedEnabled && 'opacity-40 cursor-not-allowed',
            isLearnedActive
              ? learnedFilterMode === 'exclude'
                ? `${activeBtn} text-red-600 border-red-200`
                : `${activeBtn} text-green-600 border-green-200`
              : inactiveBtn
          )}
        >
          覚{learnedCount > 0 && <span className="ml-0.5">{learnedCount}</span>}
          {isLearnedActive && <span className="ml-0.5">{getLearnedLabel()}</span>}
        </button>
      )}

      {/* 4. シャッフル */}
      {onShuffle && (
        <button
          onClick={onShuffle}
          className={cn(baseBtn, inactiveBtn)}
          title="シャッフル"
        >
          🔀
        </button>
      )}
    </div>
  );
}
