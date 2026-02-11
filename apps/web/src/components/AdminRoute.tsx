/**
 * 106: 管理者ガード — admin 以外は / にリダイレクト
 * profileVerified を待ってから判定（キャッシュの stale siteRole で誤リダイレクトしない）
 */
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { loading, profileVerified, isAuthenticated, isAdmin } = useAuthContext();

  // Firestore からプロファイルを取得するまで待つ
  if (loading || !profileVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-neutral-400 text-sm">読み込み中...</span>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
