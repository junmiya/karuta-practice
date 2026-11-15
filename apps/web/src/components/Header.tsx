import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/utils';
import { useNavTabs, type NavTab } from '@/hooks/useNavTabs';
import { JapaneseLock } from './icons/JapaneseLock';

const TEBIKI_BANNER_KEY = 'tebiki_banner_dismissed';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile } = useAuthContext();
  const { tabs, isActive, goTo, isProfileComplete } = useNavTabs();

  // 手引バナー状態
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(TEBIKI_BANNER_KEY) === '1';
  });

  const showBanner = !bannerDismissed && location.pathname !== '/tebiki';

  const dismissBanner = () => {
    localStorage.setItem(TEBIKI_BANNER_KEY, '1');
    setBannerDismissed(true);
  };

  const TabButton = ({ tab }: { tab: NavTab }) => (
    <button
      onClick={() => goTo(tab)}
      className={cn(
        "px-3 py-1 text-sm font-medium transition-all whitespace-nowrap border-b-2",
        isActive(tab.path)
          ? "text-karuta-tansei border-karuta-tansei"
          : "text-neutral-500 border-transparent hover:text-karuta-tansei"
      )}
    >
      {tab.label}
      {tab.required
        ? <JapaneseLock className={cn("inline-block w-3 h-3 ml-1 mb-0.5 text-neutral-400", isProfileComplete && "invisible")} />
        : <span className="inline-block w-3 ml-1" />}
    </button>
  );

  return (
    <header className="bg-white border-b border-neutral-200">
      {/* 手引バナー（初回訪問者向け） */}
      {showBanner && (
        <div className="bg-karuta-tansei/5 border-b border-karuta-tansei/20">
          <Container className="py-1.5 flex items-center justify-between" size="full">
            <div className="flex items-center gap-2 text-xs min-w-0">
              {/* 狭い画面では説明文を省略し、ボタンは折り返さない */}
              <span className="text-karuta-tansei font-medium truncate min-w-0">手引：百首のこと／遊びの手順／友を誘う</span>
              <button
                onClick={() => navigate('/tebiki')}
                className="text-karuta-tansei font-bold underline hover:no-underline whitespace-nowrap shrink-0"
              >
                手引を見る
              </button>
            </div>
            <button
              onClick={dismissBanner}
              className="text-neutral-400 hover:text-neutral-600 text-xs px-1 shrink-0"
              aria-label="閉じる"
            >
              ✕
            </button>
          </Container>
        </div>
      )}
      <Container className="py-0" size="full">
        {/* Row 1: Title + User */}
        <div className="flex items-center justify-between h-8">
          {/* Title */}
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <span className="text-sm font-bold text-karuta-tansei">百人一首 カルタ番付</span>
            <span className="text-xs text-neutral-400 ml-1">v0.1β</span>
          </button>

          {/* Settings + Profile / Login */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/settings')}
              aria-label="表示設定"
              title="表示設定"
              className={cn(
                "p-1 rounded transition-colors",
                location.pathname === '/settings'
                  ? "bg-karuta-tansei/10 text-karuta-tansei"
                  : "text-neutral-500 hover:text-karuta-tansei"
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
            {isAuthenticated ? (
              // 自分の名前 → プロフィール画面（ログアウトはその画面の一番下）
              <button
                onClick={() => navigate('/profile')}
                title="プロフィール・ログアウト"
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors max-w-[10rem] truncate",
                  location.pathname === '/profile'
                    ? "bg-karuta-tansei/10 text-karuta-tansei"
                    : "text-neutral-600 hover:text-karuta-tansei"
                )}
              >
                {profile?.nickname || 'プロフィール'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="text-xs text-karuta-tansei font-medium px-2 py-0.5 bg-karuta-tansei/10 rounded hover:bg-karuta-tansei/20 whitespace-nowrap"
              >
                ログイン
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Navigation Tabs（スマホでは下部メニュー BottomNav を使う） */}
        <nav className="hidden sm:flex items-center justify-center gap-1 h-8 border-t border-neutral-100">
          {tabs.map(tab => <TabButton key={tab.path} tab={tab} />)}
        </nav>
      </Container>
    </header>
  );
}
