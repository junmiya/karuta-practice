/**
 * 103: 団体機能 - 団体参加ページ
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useJoinGroup } from '@/hooks/useGroupMembership';

export function GroupJoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const { joinGroup, loading, error, clearError } = useJoinGroup();

  const groupIdFromUrl = searchParams.get('groupId') || '';
  const codeFromUrl = searchParams.get('code') || '';

  const [groupId, setGroupId] = useState(groupIdFromUrl);
  const [inviteCode, setInviteCode] = useState(codeFromUrl);
  const [successMessage, setSuccessMessage] = useState('');
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);

  // 自動参加が試行されたかどうかを追跡
  const autoJoinAttempted = useRef(false);

  // URLパラメータが変わったら反映
  useEffect(() => {
    if (groupIdFromUrl) setGroupId(groupIdFromUrl);
    if (codeFromUrl) setInviteCode(codeFromUrl);
  }, [groupIdFromUrl, codeFromUrl]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearError();
    setSuccessMessage('');

    if (!groupId.trim() || !inviteCode.trim()) {
      return;
    }

    const result = await joinGroup({
      groupId: groupId.trim(),
      inviteCode: inviteCode.trim(),
    });

    if (result) {
      setSuccessMessage(`「${result.groupName}」に参加しました！`);
      setJoinedGroupId(result.groupId);
    }
  }, [groupId, inviteCode, joinGroup, clearError]);

  // URLに両方のパラメータがある場合は自動で参加処理
  useEffect(() => {
    if (user && groupIdFromUrl && codeFromUrl && !loading && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true;
      handleSubmit();
    }
  }, [user, groupIdFromUrl, codeFromUrl, loading, handleSubmit]);

  // 参加成功後にリダイレクト
  useEffect(() => {
    if (joinedGroupId) {
      const timer = setTimeout(() => {
        navigate(`/groups/${joinedGroupId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [joinedGroupId, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    // ログインが必要な場合、パラメータを保持してリダイレクト
    const returnUrl = groupIdFromUrl && codeFromUrl
      ? `/join?groupId=${encodeURIComponent(groupIdFromUrl)}&code=${encodeURIComponent(codeFromUrl)}`
      : '/join';

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            結びに参加
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            結びに参加するにはログインが必要です
          </p>
          <Link
            to={`/profile?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ログインして参加
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          &larr; 結び一覧に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        結びに参加
      </h1>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="groupId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            結びID
          </label>
          <input
            type="text"
            id="groupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="結びIDを入力"
            disabled={loading || !!joinedGroupId}
          />
        </div>

        <div>
          <label
            htmlFor="inviteCode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            招待コード
          </label>
          <input
            type="text"
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="招待コードを入力"
            disabled={loading || !!joinedGroupId}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!joinedGroupId || !groupId.trim() || !inviteCode.trim()}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '参加中...' : '参加する'}
        </button>
      </form>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          招待コードの入手方法
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          結びの主宰者からQRコードまたは招待リンクを受け取ってください。
          QRコードをスキャンすると自動で入力されます。
        </p>
      </div>
    </div>
  );
}
