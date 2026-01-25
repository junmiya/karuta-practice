import { cn } from '@/lib/utils';
import { SelectButton } from '@/components/ui/SelectButton';

export type LearnedFilterMode = 'normal' | 'exclude' | 'prioritize';

export interface ControlBarProps {
  /** ひらがな表示状態 (後方互換性用、読札用) */
  showKana?: boolean;
  /** ひらがな切替 (後方互換性用) */
  onToggleKana?: () => void;
  /** 読札のひらがな表示状態 */
  showYomiKana?: boolean;
  /** 読札のひらがな切替 */
  onToggleYomiKana?: () => void;
  /** 取札のひらがな表示状態 */
  showToriKana?: boolean;
  /** 取札のひらがな切替 */
  onToggleToriKana?: () => void;
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
  /** 覚えた一括クリア */
  onClearLearned?: () => void;
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
  showYomiKana,
  onToggleYomiKana,
  showToriKana,
  onToggleToriKana,
  showKimariji,
  onToggleKimariji,
  learnedFilterMode = 'normal',
  onCycleLearnedFilter,
  learnedCount = 0,
  isLearnedEnabled = false,
  onClearLearned,
  onShuffle,
  className,
}: ControlBarProps) {
  // Use separate yomi/tori states if provided, otherwise fall back to shared showKana
  const yomiKanaActive = showYomiKana ?? showKana ?? false;
  const toriKanaActive = showToriKana ?? showKana ?? false;
  const hasSeparateToggles = onToggleYomiKana !== undefined && onToggleToriKana !== undefined;
  // 覚えたフィルターのラベル
  const getLearnedLabel = () => {
    switch (learnedFilterMode) {
      case 'exclude': return '除外';
      case 'prioritize': return '優先';
      default: return '';
    }
  };

  const isLearnedActive = learnedFilterMode !== 'normal';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* 1. 漢字/かな - separate or unified */}
      {hasSeparateToggles ? (
        <>
          {/* 読札: 漢字/かな */}
          <span className="text-[10px] text-gray-400">読</span>
          <SelectButton
            isSelected={yomiKanaActive}
            onVariant="onPrimary"
            size="sm"
            shape="pill"
            onClick={onToggleYomiKana}
            className="min-w-0 px-2 text-xs"
          >
            {yomiKanaActive ? 'かな' : '漢字'}
          </SelectButton>

          {/* 取札: 漢字/かな */}
          <span className="text-[10px] text-gray-400">取</span>
          <SelectButton
            isSelected={toriKanaActive}
            onVariant="onPrimary"
            size="sm"
            shape="pill"
            onClick={onToggleToriKana}
            className="min-w-0 px-2 text-xs"
          >
            {toriKanaActive ? 'かな' : '漢字'}
          </SelectButton>
        </>
      ) : onToggleKana ? (
        <SelectButton
          isSelected={yomiKanaActive}
          onVariant="onPrimary"
          size="sm"
          shape="pill"
          onClick={onToggleKana}
          className="min-w-0 px-2 text-xs"
        >
          {yomiKanaActive ? 'かな' : '漢字'}
        </SelectButton>
      ) : null}

      {/* 2. 決まり字 */}
      {onToggleKimariji && (
        <SelectButton
          isSelected={showKimariji}
          onVariant="onAccent"
          size="sm"
          shape="pill"
          onClick={onToggleKimariji}
          className="min-w-0 px-2 text-xs"
        >
          決まり字
        </SelectButton>
      )}

      {/* 3. 覚えた */}
      {onCycleLearnedFilter && (
        <SelectButton
          isSelected={isLearnedActive}
          onVariant={learnedFilterMode === 'exclude' ? 'onRed' : 'onPrimary'}
          size="sm"
          shape="pill"
          onClick={onCycleLearnedFilter}
          disabled={!isLearnedEnabled}
          title={!isLearnedEnabled ? 'ログイン必須' : '通常→除外→優先'}
          className="min-w-0 px-2 text-xs"
        >
          覚{learnedCount > 0 && <span className="ml-0.5">{learnedCount}</span>}
          {isLearnedActive && <span className="ml-0.5">{getLearnedLabel()}</span>}
        </SelectButton>
      )}

      {/* 3.5. 覚えたクリア */}
      {onClearLearned && learnedCount > 0 && (
        <button
          onClick={onClearLearned}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
          title="覚えた札をすべてクリア"
        >
          ×
        </button>
      )}

      {/* 4. シャッフル */}
      {onShuffle && (
        <SelectButton
          isSelected={false}
          size="sm"
          shape="pill"
          onClick={onShuffle}
          title="シャッフル"
          className="min-w-0 px-2 text-xs"
        >
          🔀
        </SelectButton>
      )}
    </div>
  );
}
