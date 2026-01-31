import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/utils';
import { JapaneseLock } from './icons/JapaneseLock';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isProfileComplete, profile, logout } = useAuthContext();

  const isActive = (path: string) => {
    if (path === '/tenarai') {
      return location.pathname === '/' || location.pathname === '/cards';
    }
    if (path === '/keiko') {
      return location.pathname === '/keiko' || location.pathname === '/practice' || location.pathname === '/practice12' || location.pathname === '/result';
    }
    if (path === '/utakurai') {
      return location.pathname === '/utakurai';
    }
    if (path === '/utaawaseroku') {
      return location.pathname === '/utaawaseroku';
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
      onClick={() => path === '/tenarai' ? navigate('/') : handleTabClick(path, !!required, !!required)}
      className={cn(
        "px-3 py-1 text-sm font-medium transition-all whitespace-nowrap border-b-2",
        isActive(path)
          ? "text-karuta-tansei border-karuta-tansei"
          : "text-neutral-500 border-transparent hover:text-karuta-tansei"
      )}
    >
      {label}
      {required && !isProfileComplete && <JapaneseLock className="inline-block w-3 h-3 ml-1 mb-0.5 text-neutral-400" />}
    </button>
  );

  return (
    <header className="bg-white border-b border-neutral-200">
      <Container className="py-0" size="full">
        {/* Row 1: Title + User */}
        <div className="flex items-center justify-between h-8">
          {/* Title */}
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <span className="text-sm font-bold text-karuta-tansei">百人一首 カルタ番付</span>
            <span className="text-xs text-neutral-400 ml-1">v0.1β</span>
          </button>

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
                  出門
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="text-xs text-karuta-tansei font-medium px-2 py-0.5 bg-karuta-tansei/10 rounded hover:bg-karuta-tansei/20"
              >
                入門
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Navigation Tabs */}
        <nav className="flex items-center justify-center gap-1 h-8 border-t border-neutral-100">
          <TabButton path="/tenarai" label="手習" />
          <TabButton path="/keiko" label="稽古" required />
          <TabButton path="/keikoroku" label="稽古録" required />
          <TabButton path="/utaawase" label="歌合" required />
          <TabButton path="/utaawaseroku" label="歌合録" required />
          <TabButton path="/utakurai" label="歌位" required />
        </nav>
      </Container>
    </header>
  );
}
