/**
 * 103: 団体機能 - 団体作成ページ
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateGroup } from '@/hooks/useGroup';

export function GroupCreatePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createGroup, loading, error } = useCreateGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

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

    const result = await createGroup({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (result) {
      navigate(`/groups/${result.groupId}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            団体を作成
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            団体を作成するにはログインが必要です
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
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          &larr; 団体一覧に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        団体を作成
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
            placeholder="例: かるた同好会"
            maxLength={50}
            disabled={loading}
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
            placeholder="団体の説明を入力してください"
            maxLength={500}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description.length}/500文字
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '作成中...' : '団体を作成'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        団体を作成すると、あなたが団体管理者になります。
        <br />
        招待コードを共有してメンバーを招待できます。
      </p>
    </div>
  );
}
