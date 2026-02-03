/**
 * 103: 団体機能 - イベントページ
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGroup } from '@/hooks/useGroup';
import { useGroupMembers } from '@/hooks/useGroupMembership';
import {
  getGroupEvents,
  createEvent,
  joinEvent,
  // leaveEvent, // TODO: Add leave button in UI
} from '@/services/group.service';
import type { GroupEvent } from '@/types/group';

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  published: '公開中',
  closed: '終了',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function GroupEventPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { group, loading: groupLoading } = useGroup(groupId);
  const { members } = useGroupMembers(groupId);

  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // フォーム状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const myMembership = members.find((m) => m.userId === user?.uid);
  const isOwnerOrOrganizer = myMembership?.role === 'owner' || myMembership?.role === 'organizer';

  const loadEvents = async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGroupEvents({ groupId, status: 'all' });
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [groupId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    setCreating(true);
    try {
      await createEvent({
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      });

      setShowCreateForm(false);
      setTitle('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (eventId: string) => {
    setJoining(eventId);
    try {
      await joinEvent(eventId);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました');
    } finally {
      setJoining(null);
    }
  };

  // TODO: Add leave button in UI (use leaveEvent service function)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (groupLoading || (loading && events.length === 0)) {
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          イベント
        </h1>
        {isOwnerOrOrganizer && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            {showCreateForm ? 'キャンセル' : 'イベントを作成'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            閉じる
          </button>
        </div>
      )}

      {/* 作成フォーム */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            新しいイベント
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                説明
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  開始日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  終了日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成（下書き）'}
            </button>
          </div>
        </form>
      )}

      {/* イベント一覧 */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            イベントがありません
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isOwnerOrOrganizer ? 'イベントを作成しましょう' : '管理者がイベントを作成するとここに表示されます'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.eventId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[event.status]}`}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {event.description}
                    </p>
                  )}

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(event.startAt)} 〜 {formatDate(event.endAt)}
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    参加者: {event.participantCount}人
                  </p>
                </div>

                {event.status === 'published' && (
                  <button
                    onClick={() => handleJoin(event.eventId)}
                    disabled={joining === event.eventId}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {joining === event.eventId ? '処理中...' : '参加'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
