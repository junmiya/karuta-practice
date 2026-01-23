import { cn } from '@/lib/utils';

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

  // 共通ボタンスタイル
  const baseBtn = "h-7 px-2.5 text-xs font-bold rounded-full transition-all border";
  const activeBtn = "bg-white shadow-sm";
  const inactiveBtn = "text-gray-500 hover:text-gray-700 border-transparent";

  return (
    <div className={cn('flex items-center gap-1 bg-gray-100 p-1 rounded-full', className)}>
      {/* 1. 漢字/かな - separate or unified */}
      {hasSeparateToggles ? (
        <>
          {/* 読札: 漢字/かな */}
          <span className="text-[10px] text-gray-400 pl-1">読</span>
          <button
            onClick={onToggleYomiKana}
            className={cn(
              baseBtn,
              yomiKanaActive
                ? `${activeBtn} text-karuta-tansei border-karuta-tansei/30`
                : inactiveBtn
            )}
          >
            {yomiKanaActive ? 'かな' : '漢字'}
          </button>

          {/* 取札: 漢字/かな */}
          <span className="text-[10px] text-gray-400 pl-0.5">取</span>
          <button
            onClick={onToggleToriKana}
            className={cn(
              baseBtn,
              toriKanaActive
                ? `${activeBtn} text-green-600 border-green-300`
                : inactiveBtn
            )}
          >
            {toriKanaActive ? 'かな' : '漢字'}
          </button>
        </>
      ) : onToggleKana ? (
        <button
          onClick={onToggleKana}
          className={cn(
            baseBtn,
            yomiKanaActive
              ? `${activeBtn} text-karuta-tansei border-karuta-tansei/30`
              : inactiveBtn
          )}
        >
          {yomiKanaActive ? 'かな' : '漢字'}
        </button>
      ) : null}

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
