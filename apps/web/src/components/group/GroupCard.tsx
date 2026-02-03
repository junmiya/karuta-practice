/**
 * 103: 団体機能 - 団体カードコンポーネント
 */
import { Link } from 'react-router-dom';
import type { GroupWithMembership } from '@/types/group';

interface GroupCardProps {
  group: GroupWithMembership;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '管理者',
  organizer: '運営',
  member: 'メンバー',
};

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link
      to={`/groups/${group.groupId}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
          {ROLE_LABELS[group.myRole] || group.myRole}
        </span>
      </div>
      <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>{group.memberCount}人</span>
      </div>
    </Link>
  );
}
