/**
 * 103: 団体機能 - メンバー管理ページ
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroup } from '@/hooks/useGroup';
import { useGroupMembers, useChangeRole, useRemoveMember } from '@/hooks/useGroupMembership';
import type { GroupRole } from '@/types/group';

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: '主宰者',
  organizer: '世話役',
  member: '一般',
};

const ROLE_COLORS: Record<GroupRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  organizer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export function GroupMembersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { group, loading: groupLoading } = useGroup(groupId);
  const { members, loading: membersLoading, refresh } = useGroupMembers(groupId);
  const { changeRole, loading: roleLoading } = useChangeRole();
  const { removeMember, loading: removeLoading } = useRemoveMember();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const myMembership = members.find((m) => m.userId === user?.uid);
  const isOwner = myMembership?.role === 'owner';

  const loading = groupLoading || membersLoading;

  const handleRoleChange = async (targetUserId: string, newRole: GroupRole) => {
    if (!groupId) return;

    const success = await changeRole({
      groupId,
      targetUserId,
      newRole,
    });

    if (success) {
      await refresh();
      setShowRoleDialog(false);
      setSelectedMember(null);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    if (!groupId) return;

    const success = await removeMember({
      groupId,
      targetUserId,
    });

    if (success) {
      await refresh();
      setShowRemoveDialog(false);
      setSelectedMember(null);
    }
  };

  const selectedMemberData = members.find((m) => m.userId === selectedMember);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            結びが見つかりません
          </h1>
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
          to={`/groups/${groupId}`}
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          &larr; {group.name}に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        メンバー一覧
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => (
            <li
              key={member.userId}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                  {member.nickname.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.nickname}
                    {member.userId === user?.uid && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        (自分)
                      </span>
                    )}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[member.role]}`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
              </div>

              {isOwner && member.userId !== user?.uid && member.role !== 'owner' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMember(member.userId);
                      setShowRoleDialog(true);
                    }}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    ロール変更
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMember(member.userId);
                      setShowRemoveDialog(true);
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    除名
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ロール変更ダイアログ */}
      {showRoleDialog && selectedMemberData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRoleDialog(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ロールを変更
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedMemberData.nickname}のロールを変更します
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleRoleChange(selectedMember!, 'organizer')}
                disabled={roleLoading || selectedMemberData.role === 'organizer'}
                className="w-full px-4 py-2 text-left bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <span className="font-medium">世話役</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  集いの管理、招待の閲覧ができます
                </p>
              </button>
              <button
                onClick={() => handleRoleChange(selectedMember!, 'member')}
                disabled={roleLoading || selectedMemberData.role === 'member'}
                className="w-full px-4 py-2 text-left bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <span className="font-medium">一般</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  集いの参加、閲覧ができます
                </p>
              </button>
              <button
                onClick={() => handleRoleChange(selectedMember!, 'owner')}
                disabled={roleLoading}
                className="w-full px-4 py-2 text-left bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                <span className="font-medium">主宰者に譲渡</span>
                <p className="text-xs">
                  あなたは世話役になります
                </p>
              </button>
            </div>

            <button
              onClick={() => setShowRoleDialog(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 除名確認ダイアログ */}
      {showRemoveDialog && selectedMemberData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRemoveDialog(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              メンバーを除名
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedMemberData.nickname}をこの結びから除名しますか？
              この操作は取り消せません。
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleRemove(selectedMember!)}
                disabled={removeLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {removeLoading ? '処理中...' : '除名する'}
              </button>
              <button
                onClick={() => setShowRemoveDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
