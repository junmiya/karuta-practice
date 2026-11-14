import { cn } from '@/lib/utils';

interface DisplayOptionsToggleProps {
  showYomiKana: boolean;
  showToriKana: boolean;
  showKimariji: boolean;
  onToggleYomiKana: () => void;
  onToggleToriKana: () => void;
  onToggleKimariji: () => void;
  onShuffle?: () => void;
  label?: string;
  // 覚えた機能 (optional)
  learnedCount?: number;
  filterMode?: 'normal' | 'exclude' | 'prioritize';
  onCycleFilterMode?: () => void;
  onClearLearned?: () => void;
  isAuthenticated?: boolean;
}

/**
 * 表示オプション切替コンポーネント
 * - 読札: 漢字/かな
 * - 取札: 漢字/かな
 * - 決まり字: ON/OFF
 * - シャッフル (optional)
 * - 覚えた (optional)
 */
export function DisplayOptionsToggle({
  showYomiKana,
  showToriKana,
  showKimariji,
  onToggleYomiKana,
  onToggleToriKana,
  onToggleKimariji,
  onShuffle,
  label,
  learnedCount = 0,
  filterMode = 'normal',
  onCycleFilterMode,
  onClearLearned,
  isAuthenticated = false,
}: DisplayOptionsToggleProps) {
  // whitespace-nowrap/shrink-0: 狭い画面でラベルが「か/な」のように折り返さないようにする
  const baseBtn = "h-7 px-2.5 text-xs font-bold rounded-full transition-all border whitespace-nowrap shrink-0";
  const activeBtn = "bg-white shadow-sm";
  const inactiveBtn = "text-gray-500 hover:text-gray-700 border-transparent";

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      {/* 収まらない幅ではボタン単位で折り返す */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-2xl">
        {/* 読札: 漢字/かな */}
        <span className="text-[10px] text-gray-400 pl-1.5 shrink-0">読</span>
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
        <span className="text-[10px] text-gray-400 pl-1 shrink-0">取</span>
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

        {/* シャッフル (optional) */}
        {onShuffle && (
          <button
            onClick={onShuffle}
            className={cn(baseBtn, inactiveBtn)}
            title="シャッフル"
          >
            🔀
          </button>
        )}

        {/* 覚えた (optional) */}
        {onCycleFilterMode && (
          <button
            onClick={onCycleFilterMode}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? 'ログイン必須' : '通常→除外→優先'}
            className={cn(
              baseBtn,
              filterMode === 'exclude'
                ? `${activeBtn} text-red-600 border-red-300`
                : filterMode === 'prioritize'
                  ? `${activeBtn} text-karuta-tansei border-karuta-tansei/30`
                  : inactiveBtn,
              !isAuthenticated && "opacity-50 cursor-not-allowed"
            )}
          >
            覚{learnedCount > 0 && <span className="ml-0.5">{learnedCount}</span>}
            {filterMode !== 'normal' && <span className="ml-0.5">{filterMode === 'exclude' ? '除外' : '優先'}</span>}
          </button>
        )}

        {/* 覚えたクリア (optional) */}
        {onClearLearned && isAuthenticated && learnedCount > 0 && (
          <button
            onClick={onClearLearned}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
            title="覚えた札をすべてクリア"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
