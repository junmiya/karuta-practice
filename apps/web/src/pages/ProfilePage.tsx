import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/users.service';

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    profile,
    user,
    loading,
    error,
    loginWithGoogle,
    loginAnonymously,
    loginWithEmail,
    registerWithEmail,
    refreshProfile,
  } = useAuthContext();

  const [nickname, setNickname] = useState('');
  const [banzukeConsent, setBanzukeConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Email login state
  const [emailMode, setEmailMode] = useState<'login' | 'register' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setBanzukeConsent(profile.banzukeConsent || false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!nickname.trim()) {
      setSaveError('表示名を入力してください');
      return;
    }
    if (!banzukeConsent) {
      setSaveError('番付参加に同意していただく必要があります');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateUserProfile(user.uid, {
        nickname: nickname.trim(),
        banzukeConsent,
      });
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setSaveError('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (emailMode === 'login') {
      await loginWithEmail(email, password);
    } else if (emailMode === 'register') {
      await registerWithEmail(email, password);
    }
  };

  // Login view
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold mb-4">ログイン</h2>
          <p className="text-gray-600 mb-6">
            競技機能や成績保存を利用するにはログインが必要です
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Email login/register form */}
          {emailMode ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
              <div className="text-left">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-red"
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div className="text-left">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-red"
                  placeholder="6文字以上"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? '処理中...' : emailMode === 'login' ? 'ログイン' : '新規登録'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className="btn-secondary"
                >
                  戻る
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {emailMode === 'login' ? (
                  <>
                    アカウントをお持ちでない方は{' '}
                    <button
                      type="button"
                      onClick={() => setEmailMode('register')}
                      className="text-karuta-red hover:underline"
                    >
                      新規登録
                    </button>
                  </>
                ) : (
                  <>
                    既にアカウントをお持ちの方は{' '}
                    <button
                      type="button"
                      onClick={() => setEmailMode('login')}
                      className="text-karuta-red hover:underline"
                    >
                      ログイン
                    </button>
                  </>
                )}
              </p>
            </form>
          ) : (
            <div className="space-y-3">
              <button
                onClick={loginWithGoogle}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </button>
              <button
                onClick={() => setEmailMode('login')}
                className="btn-secondary w-full"
              >
                メールでログイン
              </button>
              <button
                onClick={loginAnonymously}
                className="w-full py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                匿名でログイン
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← ホームへ戻る
            </button>
          </div>
        </div>

        <div className="card mt-6 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">認証について</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Googleログイン</strong>: データが永続化され、別のデバイスからもアクセスできます</li>
            <li>• <strong>メールログイン</strong>: メールアドレスとパスワードで登録・ログインできます</li>
            <li>• <strong>匿名ログイン</strong>: すぐに始められますが、データはこのブラウザにのみ保存されます</li>
          </ul>
        </div>
      </div>
    );
  }

  // Profile setup view
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">プロフィール設定</h2>

        {saveError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {saveError}
          </div>
        )}

        <div className="space-y-6">
          {/* User Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              ログイン方法: {user?.isAnonymous ? '匿名' : 'Google'}
            </p>
            {!user?.isAnonymous && user?.email && (
              <p className="text-sm text-gray-600">Email: {user.email}</p>
            )}
          </div>

          {/* Nickname */}
          <div>
            <label htmlFor="nickname" className="block font-semibold mb-2">
              表示名（ニックネーム）<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：かるた太郎"
              maxLength={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-karuta-red"
            />
            <p className="text-sm text-gray-500 mt-1">
              番付に表示される名前です（20文字以内）
            </p>
          </div>

          {/* Banzuke Consent */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={banzukeConsent}
                onChange={(e) => setBanzukeConsent(e.target.checked)}
                className="mt-1 w-5 h-5 text-karuta-red focus:ring-karuta-red"
              />
              <div>
                <span className="font-semibold">
                  番付参加に同意する<span className="text-red-500 ml-1">*</span>
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  あなたの表示名、スコア、正答数、平均時間が公開番付に表示されることに同意します。
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !nickname.trim() || !banzukeConsent}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="card bg-yellow-50 border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">プライバシーについて</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• 表示名以外の個人情報は公開されません</li>
          <li>• 表示名は番付に公開されます</li>
          <li>• 本名の使用は推奨しません</li>
        </ul>
      </div>
    </div>
  );
}
