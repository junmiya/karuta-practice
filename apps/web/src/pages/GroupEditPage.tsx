/**
 * 103: 団体機能 - 団体編集ページ
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/useGroup';
import { useGroupMembers } from '@/hooks/useGroupMembership';

export function GroupEditPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { group, loading: groupLoading, error: groupError } = useGroup(groupId);
  const { members } = useGroupMembers(groupId);
  const { updateGroup, loading: updateLoading, error: updateError } = useUpdateGroup();
  const { deleteGroup, loading: deleteLoading, error: deleteError } = useDeleteGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const myMembership = members.find((m) => m.userId === user?.uid);
  const isOwner = myMembership?.role === 'owner';

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');

    if (!name.trim()) {
      setNameError('団体名を入力してください');
      return;
    }

    if (name.trim().length > 50) {
      setNameError('団体名は50文字以内で入力してください');
      return;
    }

    if (!groupId) return;

    const success = await updateGroup({
      groupId,
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (success) {
      navigate(`/groups/${groupId}`);
    }
  };

  const handleDelete = async () => {
    if (!groupId || deleteConfirmText !== group?.name) return;

    const success = await deleteGroup(groupId);
    if (success) {
      navigate('/groups');
    }
  };

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            団体が見つかりません
          </h1>
          <Link
            to="/groups"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            団体一覧へ
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            編集権限がありません
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            団体の編集は管理者のみが行えます。
          </p>
          <Link
            to={`/groups/${groupId}`}
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            団体ホームへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/groups/${groupId}`}
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          &larr; {group.name}に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        団体を編集
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            団体名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={50}
            disabled={updateLoading}
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {name.length}/50文字
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            説明（任意）
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={500}
            disabled={updateLoading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description.length}/500文字
          </p>
        </div>

        {updateError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {updateError.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateLoading ? '保存中...' : '保存'}
          </button>
          <Link
            to={`/groups/${groupId}`}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {/* 団体削除セクション */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          危険な操作
        </h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            この団体を削除
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-4">
            <p className="text-red-800 dark:text-red-300">
              この操作は取り消せません。団体を削除すると、すべてのメンバーシップ、イベント、招待コードが削除されます。
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              確認のため、団体名「<strong>{group?.name}</strong>」を入力してください：
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="団体名を入力"
              className="w-full px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={deleteLoading}
            />
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {deleteError.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoading || deleteConfirmText !== group?.name}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? '削除中...' : '完全に削除する'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
