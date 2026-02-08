/**
 * 103: 団体機能 - 団体ホームページ
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useGroup, useInviteCode } from '@/hooks/useGroup';
import { useGroupMembers, useLeaveGroup } from '@/hooks/useGroupMembership';
import { InviteCodeDisplay } from '@/components/group/InviteCodeDisplay';
import { QRCodeModal } from '@/components/group/QRCodeModal';

/**
 * Firebase Callable から返される日付を安全にパースする
 */
function parseFirebaseDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  // Already a Date
  if (value instanceof Date) return value;

  // ISO string
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // Number (milliseconds)
  if (typeof value === 'number') {
    return new Date(value);
  }

  // Firestore Timestamp-like object { _seconds, _nanoseconds } or { seconds, nanoseconds }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }

  return undefined;
}

export function GroupHomePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { group, loading, error, refresh: _refresh } = useGroup(groupId);
  const { members } = useGroupMembers(groupId);
  const { inviteCode, loading: inviteLoading, fetch: fetchInvite, regenerate, revoke } = useInviteCode(groupId);
  const { leaveGroup, loading: leaveLoading } = useLeaveGroup();

  const [showQR, setShowQR] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showInviteSection, setShowInviteSection] = useState(false);

  const myMembership = members.find((m) => m.userId === user?.uid);
  const isOwner = myMembership?.role === 'owner';
  const isOwnerOrOrganizer = myMembership?.role === 'owner' || myMembership?.role === 'organizer';

  const ROLE_LABELS: Record<string, string> = {
    owner: '主宰者',
    organizer: '世話役',
    member: '一般',
  };

  const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    organizer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  const handleFetchInvite = async () => {
    await fetchInvite();
  };

  const handleRegenerate = async () => {
    if (confirm('招待コードを再生成しますか？古いコードは無効になります。')) {
      await regenerate();
    }
  };

  const handleRevoke = async () => {
    if (confirm('招待コードを無効化しますか？')) {
      await revoke();
    }
  };

  const handleLeave = async () => {
    if (!groupId) return;
    const success = await leaveGroup(groupId);
    if (success) {
      navigate('/groups');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            結びが見つかりません
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error?.message || '指定された結びは存在しないか、アクセス権限がありません。'}
          </p>
          <Link
            to="/groups"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            結び一覧へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          &larr; 結び一覧に戻る
        </Link>
      </div>

      {/* 団体情報ヘッダー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {group.name || '(名称未設定)'}
            </h1>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {group.description}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              メンバー: {group.memberCount}人
            </p>
            {myMembership && (
              <div className="mt-3">
                <span className={`inline-block px-3 py-1 text-sm rounded-full ${ROLE_COLORS[myMembership.role]}`}>
                  あなたの権限: {ROLE_LABELS[myMembership.role]}
                </span>
              </div>
            )}
          </div>
          {isOwner && (
            <Link
              to={`/groups/${groupId}/edit`}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              編集
            </Link>
          )}
        </div>
      </div>

      {/* 二分割レイアウト: 集い / 団体歌合 */}
      <div className="space-y-4 mb-6">
        {/* 集いセクション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg mr-3">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">集い</h2>
            </div>
            <Link
              to={`/groups/${groupId}/events`}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              集い一覧へ
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            メンバーが個人で参加するイベントです
          </p>
        </div>

        {/* 団体歌合セクション（準備中） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 opacity-75">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg mr-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">団体歌合</h2>
            </div>
            <span className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg">
              準備中
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            結びとして出場し、団体順位が決まる大会です（近日公開）
          </p>
        </div>
      </div>

      {/* メンバーリンク */}
      <div className="mb-6">
        <Link
          to={`/groups/${groupId}/members`}
          className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">メンバー</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{members.length}人</p>
          </div>
        </Link>
      </div>

      {/* 招待コード管理（オーナー/運営のみ） */}
      {isOwnerOrOrganizer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
          <button
            onClick={() => setShowInviteSection(!showInviteSection)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              メンバー招待
            </h2>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showInviteSection ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInviteSection && (
            <div className="px-6 pb-6">
              {inviteCode ? (
                <>
                  <InviteCodeDisplay
                    inviteCode={inviteCode.inviteCode}
                    inviteUrl={inviteCode.inviteUrl}
                    expiresAt={parseFirebaseDate(inviteCode.expiresAt)}
                    onRegenerate={handleRegenerate}
                    onRevoke={handleRevoke}
                    onShowQR={() => setShowQR(true)}
                    isOwner={isOwner}
                    loading={inviteLoading}
                  />
                  <QRCodeModal
                    isOpen={showQR}
                    onClose={() => setShowQR(false)}
                    url={inviteCode.inviteUrl}
                  />
                </>
              ) : (
                <button
                  onClick={handleFetchInvite}
                  disabled={inviteLoading}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? '取得中...' : '招待コードを発行'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 退会ボタン（オーナー以外） */}
      {myMembership && !isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            結び設定
          </h2>

          {showLeaveConfirm ? (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                本当にこの結びから退会しますか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  disabled={leaveLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {leaveLoading ? '退会中...' : '退会する'}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              この結びから退会
            </button>
          )}
        </div>
      )}
    </div>
  );
}
