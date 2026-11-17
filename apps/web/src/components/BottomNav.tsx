import { cn } from '@/lib/utils';
import { useNavTabs } from '@/hooks/useNavTabs';
import { JapaneseLock } from './icons/JapaneseLock';

/**
 * スマホ用の下部メニュー（640px 未満でのみ表示）
 * 一般的なスマホアプリと同じく画面下に固定し、アイコン＋ラベルで並べる。
 */
export function BottomNav() {
  const { tabs, isActive, goTo, isProfileComplete } = useNavTabs();

  return (
    <nav
      aria-label="メインメニュー"
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-neutral-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-7 h-14">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="min-w-0">
              <button
                onClick={() => goTo(tab)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors',
                  active ? 'text-karuta-tansei' : 'text-neutral-400 active:text-karuta-tansei'
                )}
              >
                {active && <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-karuta-tansei" />}
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
                  {tab.required && !isProfileComplete && (
                    <JapaneseLock className="absolute -top-1 -right-2 w-2.5 h-2.5 text-neutral-400" />
                  )}
                </span>
                <span className={cn('text-[11px] leading-none whitespace-nowrap', active && 'font-bold')}>
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
