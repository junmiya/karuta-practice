import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/utils';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isProfileComplete, profile, logout } = useAuthContext();

  const isActive = (path: string) => {
    if (path === '/basic') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    if (path === '/keiko') {
      return location.pathname === '/keiko' || location.pathname === '/practice' || location.pathname === '/practice12' || location.pathname === '/result';
    }
    if (path === '/banzuke') {
      return location.pathname === '/banzuke';
    }
    return location.pathname.startsWith(path);
  };

  const handleTabClick = (path: string, requiresAuth: boolean, requiresProfile: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      navigate('/profile');
      return;
    }
    if (requiresProfile && !isProfileComplete) {
      navigate('/profile');
      return;
    }
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const TabButton = ({ path, label, required }: { path: string, label: string, required?: boolean }) => (
    <button
      onClick={() => path === '/basic' ? navigate('/') : handleTabClick(path, !!required, !!required)}
      className={cn(
        "px-3 py-1 text-sm font-medium transition-all whitespace-nowrap border-b-2",
        isActive(path)
          ? "text-karuta-tansei border-karuta-tansei"
          : "text-neutral-500 border-transparent hover:text-karuta-tansei"
      )}
    >
      {label}
      {required && !isProfileComplete && <span className="text-xs ml-0.5 opacity-60">🔒</span>}
    </button>
  );

  return (
    <header className="bg-white border-b border-neutral-200">
      <Container className="py-0">
        {/* Single Row: Title + Tabs + User */}
        <div className="flex items-center justify-between h-10">
          {/* Title */}
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <span className="text-sm font-bold text-karuta-tansei">百人一首 番付</span>
          </button>

          {/* Tabs - Center */}
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            <TabButton path="/basic" label="学習" />
            <TabButton path="/keiko" label="稽古" required />
            <TabButton path="/kyogi" label="競技" required />
            <TabButton path="/seiseki" label="成績" required />
            <TabButton path="/banzuke" label="番付" required />
          </nav>

          {/* Profile / Login */}
          <div className="flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded transition-colors",
                    location.pathname === '/profile'
                      ? "bg-karuta-tansei/10 text-karuta-tansei"
                      : "text-neutral-600 hover:text-karuta-tansei"
                  )}
                >
                  {profile?.nickname || '設定'}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-xs text-neutral-400 hover:text-red-500 px-1"
                >
                  出
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="text-xs text-karuta-tansei font-medium px-2 py-0.5 bg-karuta-tansei/10 rounded hover:bg-karuta-tansei/20"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
