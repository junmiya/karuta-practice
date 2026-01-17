/**
 * Ranking list component displaying ranked entries
 */

import type { Ranking, RankingEntry } from '@/types/ranking';

interface RankingListProps {
  ranking: Ranking | null;
  currentUserId?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function RankingList({
  ranking,
  currentUserId,
  loading = false,
  emptyMessage = '番付データがありません',
}: RankingListProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!ranking || ranking.entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">
              順位
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              表示名
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-24">
              スコア
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-20">
              確定数
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ranking.entries.map((entry, index) => (
            <RankingRow
              key={entry.uid}
              entry={entry}
              isCurrentUser={entry.uid === currentUserId}
              index={index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RankingRowProps {
  entry: RankingEntry;
  isCurrentUser: boolean;
  index: number;
}

function RankingRow({ entry, isCurrentUser, index }: RankingRowProps) {
  const rankClass = getRankClass(entry.rank);

  return (
    <tr
      className={`${
        isCurrentUser
          ? 'bg-yellow-50 border-l-4 border-l-karuta-gold'
          : index % 2 === 0
          ? 'bg-white'
          : 'bg-gray-50'
      }`}
    >
      <td className={`px-4 py-3 font-bold ${rankClass}`}>
        {entry.rank <= 3 ? (
          <span className="inline-flex items-center gap-1">
            {entry.rank === 1 && '🥇'}
            {entry.rank === 2 && '🥈'}
            {entry.rank === 3 && '🥉'}
            {entry.rank}
          </span>
        ) : (
          entry.rank
        )}
      </td>
      <td className="px-4 py-3">
        <span className={isCurrentUser ? 'font-bold' : ''}>
          {entry.nickname}
        </span>
        {isCurrentUser && (
          <span className="ml-2 text-xs bg-karuta-gold text-white px-2 py-0.5 rounded">
            あなた
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono font-bold">
        {entry.score.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-gray-500">
        {entry.confirmedSessions}
      </td>
    </tr>
  );
}

function getRankClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'text-yellow-600';
    case 2:
      return 'text-gray-500';
    case 3:
      return 'text-orange-600';
    default:
      return 'text-gray-700';
  }
}
