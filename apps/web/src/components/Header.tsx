import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isProfileComplete, profile, logout } = useAuthContext();

  const isActive = (path: string) => {
    if (path === '/basic') {
      return location.pathname === '/' || location.pathname === '/practice' || location.pathname === '/result';
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

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Title */}
        <button onClick={() => navigate('/')} className="text-left hover:opacity-80 transition-opacity mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-karuta-black">百人一首 競技かるた練習</h1>
          <p className="text-xs md:text-sm text-neutral-700 mt-1">Hyakunin Isshu Practice</p>
        </button>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {/* Basic (Free) */}
          <button
            onClick={() => navigate('/')}
            className={`px-5 py-3 font-medium transition-all whitespace-nowrap ${
              isActive('/basic')
                ? 'text-karuta-red border-b-3 border-karuta-red'
                : 'text-neutral-700 border-b-3 border-transparent hover:text-karuta-red hover:bg-neutral-50'
            }`}
          >
            <span className="text-sm md:text-base">基本</span>
            <span className="text-xs ml-1 text-neutral-700">無料</span>
          </button>

          {/* Kensai (Requires Auth + Profile) */}
          <button
            onClick={() => handleTabClick('/kensai', true, true)}
            className={`px-5 py-3 font-medium transition-all whitespace-nowrap ${
              isActive('/kensai')
                ? 'text-karuta-red border-b-3 border-karuta-red'
                : 'text-neutral-700 border-b-3 border-transparent hover:text-karuta-red hover:bg-neutral-50'
            }`}
          >
            <span className="text-sm md:text-base">研鑽</span>
            {!isProfileComplete && <span className="text-xs ml-1">🔒</span>}
          </button>

          {/* Kyogi (Requires Auth + Profile) */}
          <button
            onClick={() => handleTabClick('/kyogi', true, true)}
            className={`px-5 py-3 font-medium transition-all whitespace-nowrap ${
              isActive('/kyogi')
                ? 'text-karuta-red border-b-3 border-karuta-red'
                : 'text-neutral-700 border-b-3 border-transparent hover:text-karuta-red hover:bg-neutral-50'
            }`}
          >
            <span className="text-sm md:text-base">競技</span>
            {!isProfileComplete && <span className="text-xs ml-1">🔒</span>}
          </button>

          {/* Seiseki (Requires Auth + Profile) */}
          <button
            onClick={() => handleTabClick('/seiseki', true, true)}
            className={`px-5 py-3 font-medium transition-all whitespace-nowrap ${
              isActive('/seiseki')
                ? 'text-karuta-red border-b-3 border-karuta-red'
                : 'text-neutral-700 border-b-3 border-transparent hover:text-karuta-red hover:bg-neutral-50'
            }`}
          >
            <span className="text-sm md:text-base">成績</span>
            {!isProfileComplete && <span className="text-xs ml-1">🔒</span>}
          </button>

          {/* Profile / Login */}
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className={`px-4 py-2 text-sm transition-all whitespace-nowrap border rounded ${
                    location.pathname === '/profile'
                      ? 'bg-neutral-100 border-neutral-300 text-karuta-black'
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {profile?.nickname || '未設定'}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-neutral-600 hover:text-karuta-red transition-colors"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className={`px-4 py-2 text-sm transition-all whitespace-nowrap border rounded ${
                  location.pathname === '/profile'
                    ? 'bg-neutral-100 border-neutral-300 text-karuta-black'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                ログイン
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
