/**
 * 103: 団体機能 - 団体選択コンポーネント
 * 試合開始時に所属団体を選択するためのドロップダウン
 */
import { useMyGroups } from '@/hooks/useGroup';

interface GroupSelectorProps {
  selectedGroupId: string | null;
  onSelect: (groupId: string | null, groupName: string | null) => void;
  disabled?: boolean;
}

export function GroupSelector({ selectedGroupId, onSelect, disabled }: GroupSelectorProps) {
  const { groups, loading } = useMyGroups();

  if (loading) {
    return (
      <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    );
  }

  if (groups.length === 0) {
    return null; // 所属団体がない場合は表示しない
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onSelect(null, null);
    } else {
      const group = groups.find((g) => g.groupId === value);
      onSelect(value, group?.name || null);
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="group-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        団体を選択（任意）
      </label>
      <select
        id="group-select"
        value={selectedGroupId || ''}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
      >
        <option value="">個人として参加</option>
        {groups.map((group) => (
          <option key={group.groupId} value={group.groupId}>
            {group.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        団体を選択すると、成績が団体に紐づけられます
      </p>
    </div>
  );
}
