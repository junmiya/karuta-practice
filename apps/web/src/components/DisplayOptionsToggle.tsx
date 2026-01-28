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
}

/**
 * 表示オプション切替コンポーネント
 * - 読札: 漢字/かな
 * - 取札: 漢字/かな
 * - 決まり字: ON/OFF
 * - シャッフル (optional)
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
}: DisplayOptionsToggleProps) {
  const baseBtn = "h-7 px-2.5 text-xs font-bold rounded-full transition-all border";
  const activeBtn = "bg-white shadow-sm";
  const inactiveBtn = "text-gray-500 hover:text-gray-700 border-transparent";

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
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
      </div>
    </div>
  );
}
