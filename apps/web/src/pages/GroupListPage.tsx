/**
 * 103: 団体機能 - 団体一覧ページ
 */
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups } from '@/hooks/useGroup';
import { GroupCard } from '@/components/group/GroupCard';

export function GroupListPage() {
  const { user, loading: authLoading } = useAuth();
  const { groups, loading, error, refresh } = useMyGroups();

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            団体
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            団体機能を使用するにはログインが必要です
          </p>
          <Link
            to="/profile"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          団体
        </h1>
        <Link
          to="/groups/create"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          団体を作成
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          エラーが発生しました: {error.message}
          <button onClick={refresh} className="ml-2 underline">
            再読み込み
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            所属団体がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            団体を作成するか、招待コードで参加しましょう
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/groups/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              団体を作成
            </Link>
            <Link
              to="/join"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              招待コードで参加
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.groupId} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
