/**
 * Admin Dashboard - V2統一版
 * 節気カレンダー・ルールセット・確定パイプライン管理
 */

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, AuthRequiredState, InfoBox } from '@/components/ui/PageStates';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  adminGetRuleset,
  adminSeedDefaultRuleset,
  adminGetSeasonCalendar,
  adminSeedDefaultCalendar,
  adminFreezeSeason2,
  adminFinalizeSeason2,
  adminPublishSeason,
  adminGetJobRuns,
  adminGetCurrentSeasonInfo,
  adminGetSnapshotStatus,
  adminGetAllGroups,
  adminSuspendGroup,
  adminResumeGroup,
  adminDeleteGroup,
  adminGetGroupAuditLogs,
  type AdminGroup,
  type AdminGroupAuditLog,
  adminGetUsers,
  adminSetUserRole,
  adminGetUserBillingStatuses,
  type AdminUser,
  type UserBillingStatus,
} from '@/services/admin-v2.service';

type TabType = 'calendar' | 'ruleset' | 'pipeline' | 'groups' | 'users';

const SITE_ROLE_OPTIONS = [
  { value: 'user', label: '一般' },
  { value: 'tester', label: 'テスター' },
  { value: 'admin', label: '管理者' },
  { value: 'banned', label: '禁止' },
];

// Pipeline status labels
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_created: { label: '未作成', color: 'secondary' },
  draft: { label: 'ドラフト', color: 'secondary' },
  frozen: { label: '凍結中', color: 'warning' },
  finalized: { label: '確定済', color: 'info' },
  published: { label: '公開済', color: 'success' },
};

export function AdminPage() {
  const { user, loading: authLoading } = useAuthContext();

  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Calendar tab state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Ruleset tab state
  const [rulesetData, setRulesetData] = useState<any>(null);
  const [rulesetYaml, setRulesetYaml] = useState('');
  const [rulesetLoading, setRulesetLoading] = useState(false);

  // Pipeline tab state
  const [pipelineSeasonKey, setPipelineSeasonKey] = useState('');
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [jobRuns, setJobRuns] = useState<any[]>([]);
  const [seasonInfo, setSeasonInfo] = useState<{
    currentSeason: { seasonKey: string; seasonId: string; year: number } | null;
    previousSeason: { seasonKey: string; seasonId: string; year: number } | null;
  } | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<{
    status: string;
    frozenAt: string | null;
    finalizedAt: string | null;
    publishedAt: string | null;
    totalParticipants: number;
    totalEvents: number;
  } | null>(null);

  // Groups tab state
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsFilter, setGroupsFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupAuditLogs, setGroupAuditLogs] = useState<AdminGroupAuditLog[]>([]);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendDialog, setShowSuspendDialog] = useState<string | null>(null);

  // Users tab state
  const [usersData, setUsersData] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersNicknameFilter, setUsersNicknameFilter] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<string>('all');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [usersBilling, setUsersBilling] = useState<Record<string, UserBillingStatus>>({});

  // Load current season info when pipeline tab is opened
  useEffect(() => {
    if (activeTab === 'pipeline' && user && !seasonInfo) {
      loadSeasonInfo();
    }
  }, [activeTab, user]);

  // Load groups when groups tab is opened
  useEffect(() => {
    if (activeTab === 'groups' && user) {
      loadGroups();
    }
  }, [activeTab, user, groupsFilter]);

  // Load users when users tab is opened
  useEffect(() => {
    if (activeTab === 'users' && user) {
      loadUsers();
    }
  }, [activeTab, user]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const filter: { siteRole?: string; nickname?: string } = {};
      if (usersRoleFilter !== 'all') filter.siteRole = usersRoleFilter;
      if (usersNicknameFilter.trim()) filter.nickname = usersNicknameFilter.trim();
      const res = await adminGetUsers(filter);
      const users = res.users || [];
      setUsersData(users);

      // 課金ステータスも取得
      if (users.length > 0) {
        const uids = users.map((u) => u.uid);
        try {
          const billingRes = await adminGetUserBillingStatuses(uids);
          setUsersBilling(billingRes.statuses || {});
        } catch {
          setUsersBilling({});
        }
      }
    } catch (err: any) {
      setError(err.message || 'ユーザー一覧の取得に失敗しました');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSetUserRole = async (targetUid: string, newRole: string) => {
    const roleLabel = SITE_ROLE_OPTIONS.find((r) => r.value === newRole)?.label || newRole;
    if (!confirm(`このユーザーの権限を「${roleLabel}」に変更しますか？`)) return;
    setChangingRole(targetUid);
    try {
      await adminSetUserRole(targetUid, newRole);
      setMessage(`権限を「${roleLabel}」に変更しました`);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || '権限の変更に失敗しました');
    } finally {
      setChangingRole(null);
    }
  };

  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await adminGetAllGroups({ status: groupsFilter });
      setGroups(res.groups || []);
    } catch (err: any) {
      setError(err.message || '団体一覧の取得に失敗しました');
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadGroupAuditLogs = async (groupId: string) => {
    try {
      const res = await adminGetGroupAuditLogs(groupId, 50);
      setGroupAuditLogs(res.logs || []);
      setSelectedGroupId(groupId);
    } catch (err: any) {
      setError(err.message || '監査ログの取得に失敗しました');
    }
  };

  const handleSuspendGroup = async (groupId: string) => {
    if (!suspendReason.trim()) {
      setError('停止理由を入力してください');
      return;
    }
    setGroupsLoading(true);
    try {
      await adminSuspendGroup(groupId, suspendReason);
      setMessage('団体を停止しました');
      setShowSuspendDialog(null);
      setSuspendReason('');
      await loadGroups();
    } catch (err: any) {
      setError(err.message || '団体の停止に失敗しました');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleResumeGroup = async (groupId: string) => {
    if (!confirm('この団体を再開しますか？')) return;
    setGroupsLoading(true);
    try {
      await adminResumeGroup(groupId);
      setMessage('団体を再開しました');
      await loadGroups();
    } catch (err: any) {
      setError(err.message || '団体の再開に失敗しました');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`団体「${groupName}」を削除しますか？この操作は取り消せません。`)) return;
    if (!confirm('本当に削除してよろしいですか？関連するすべてのデータが削除されます。')) return;
    setGroupsLoading(true);
    try {
      await adminDeleteGroup(groupId);
      setMessage('団体を削除しました');
      await loadGroups();
    } catch (err: any) {
      setError(err.message || '団体の削除に失敗しました');
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadSeasonInfo = async () => {
    try {
      const res = await adminGetCurrentSeasonInfo();
      setSeasonInfo(res);
      // Default to previous season (most likely to need processing)
      if (res.previousSeason) {
        setPipelineSeasonKey(res.previousSeason.seasonKey);
      } else if (res.currentSeason) {
        setPipelineSeasonKey(res.currentSeason.seasonKey);
      }
    } catch (err: any) {
      console.error('Failed to load season info:', err);
    }
  };

  // Load snapshot status when season key changes
  useEffect(() => {
    if (pipelineSeasonKey && activeTab === 'pipeline') {
      loadSnapshotStatus();
    }
  }, [pipelineSeasonKey, activeTab]);

  const loadSnapshotStatus = async () => {
    if (!pipelineSeasonKey) return;
    try {
      const res = await adminGetSnapshotStatus(pipelineSeasonKey);
      setSnapshotStatus(res);
    } catch (err: any) {
      console.error('Failed to load snapshot status:', err);
    }
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="管理者ダッシュボード" subtitle="節気カレンダー・ルールセット・確定パイプライン" />
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="管理者ダッシュボード" subtitle="節気カレンダー・ルールセット・確定パイプライン" />
        <AuthRequiredState message="管理者ページにアクセスするにはログインが必要です" />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header */}
      <PageHeader title="管理者ダッシュボード" subtitle="節気カレンダー・ルールセット・確定パイプライン" />

      {/* Tab Navigation */}
      <SegmentedControl
        options={[
          { value: 'calendar' as TabType, label: '節気カレンダー' },
          { value: 'ruleset' as TabType, label: 'ルールセット' },
          { value: 'pipeline' as TabType, label: '確定パイプライン' },
          { value: 'groups' as TabType, label: '団体管理' },
          { value: 'users' as TabType, label: 'ユーザー' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        size="md"
        className="w-full flex-wrap"
      />

      {/* Messages */}
      {message && (
        <Card className="bg-green-50 border-green-200">
          <Text className="text-green-800">{message}</Text>
          <Button variant="ghost" size="sm" onClick={() => setMessage(null)} className="mt-2">
            閉じる
          </Button>
        </Card>
      )}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <Text className="text-red-800">{error}</Text>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2">
            閉じる
          </Button>
        </Card>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">節気カレンダー管理</Heading>
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                <input
                  type="number"
                  value={calendarYear}
                  onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
                  min={2024}
                  max={2030}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <Button
                onClick={async () => {
                  setCalendarLoading(true);
                  setMessage(null);
                  try {
                    const res = await adminGetSeasonCalendar(calendarYear);
                    setCalendarData(res.calendar);
                    if (!res.calendar) setMessage('カレンダーが未登録です');
                  } catch (err: any) {
                    setError(err.message || '取得に失敗しました');
                  } finally {
                    setCalendarLoading(false);
                  }
                }}
                disabled={calendarLoading}
                size="sm"
              >
                {calendarLoading ? '読込中...' : '読み込み'}
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm('2026年のデフォルト節気カレンダーを投入しますか？')) return;
                  setCalendarLoading(true);
                  try {
                    const res = await adminSeedDefaultCalendar();
                    setCalendarData(res.calendar);
                    setMessage('2026年デフォルトカレンダーを投入しました');
                  } catch (err: any) {
                    setError(err.message || '投入に失敗しました');
                  } finally {
                    setCalendarLoading(false);
                  }
                }}
                disabled={calendarLoading}
                variant="secondary"
                size="sm"
              >
                2026年デフォルト投入
              </Button>
            </div>

            {calendarData && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <Text className="font-bold">{calendarData.year}年 節気カレンダー</Text>
                {calendarData.periods?.map((p: any) => (
                  <div key={p.seasonId} className="flex justify-between text-sm border-b border-gray-200 pb-1">
                    <span className="font-medium">{p.label} ({p.seasonId})</span>
                    <span className="text-gray-600">
                      {p.start_at?._seconds ? new Date(p.start_at._seconds * 1000).toLocaleDateString('ja-JP') : '?'}
                      {' 〜 '}
                      {p.end_at?._seconds ? new Date(p.end_at._seconds * 1000).toLocaleDateString('ja-JP') : '?'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Ruleset Tab */}
      {activeTab === 'ruleset' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">ルールセット管理</Heading>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setRulesetLoading(true);
                  try {
                    const res = await adminGetRuleset();
                    setRulesetData(res.ruleset);
                    if (res.ruleset?.yamlContent) {
                      setRulesetYaml(res.ruleset.yamlContent);
                    }
                    if (!res.ruleset) setMessage('ルールセットが未登録です');
                  } catch (err: any) {
                    setError(err.message || '取得に失敗しました');
                  } finally {
                    setRulesetLoading(false);
                  }
                }}
                disabled={rulesetLoading}
                size="sm"
              >
                {rulesetLoading ? '読込中...' : '現在のルールセットを読み込み'}
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm('デフォルトルールセットを投入しますか？既存のルールセットは上書きされます。')) return;
                  setRulesetLoading(true);
                  try {
                    const res = await adminSeedDefaultRuleset();
                    setRulesetData(res.ruleset);
                    setMessage('デフォルトルールセットを投入しました');
                  } catch (err: any) {
                    setError(err.message || 'ルールセット投入に失敗しました');
                  } finally {
                    setRulesetLoading(false);
                  }
                }}
                disabled={rulesetLoading}
                variant="secondary"
                size="sm"
              >
                デフォルト投入
              </Button>
            </div>

            {rulesetData && (
              <div className="bg-gray-50 rounded-lg p-3">
                <Text size="sm" className="font-bold">バージョン: {rulesetData.version}</Text>
                <Text size="sm" color="muted">
                  公式最低参加者数: {rulesetData.officialMinParticipants}名
                </Text>
                <Text size="sm" color="muted">
                  級位条件数: {rulesetData.kyuiRequirements?.length || 0} /
                  段位条件数: {rulesetData.danRequirements?.length || 0} /
                  伝位条件数: {rulesetData.denRequirements?.length || 0}
                </Text>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ルールセットYAML
              </label>
              <textarea
                value={rulesetYaml}
                onChange={(e) => setRulesetYaml(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                placeholder="YAML形式でルールセットを入力..."
              />
            </div>

            <Text size="xs" color="muted">
              注意: YAML内容はそのまま保存されます。パース済みルールは別途サーバ側で処理されます。
            </Text>
          </div>
        </Card>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">確定パイプライン</Heading>
          <div className="space-y-3">
            {/* Season Info */}
            {seasonInfo && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <Text size="sm" className="font-bold">シーズン情報（自動検出）</Text>
                <div className="flex gap-4 text-sm">
                  {seasonInfo.currentSeason && (
                    <button
                      onClick={() => setPipelineSeasonKey(seasonInfo.currentSeason!.seasonKey)}
                      className={`px-3 py-1 rounded ${pipelineSeasonKey === seasonInfo.currentSeason.seasonKey ? 'bg-blue-200' : 'bg-white'}`}
                    >
                      現在: {seasonInfo.currentSeason.seasonKey}
                    </button>
                  )}
                  {seasonInfo.previousSeason && (
                    <button
                      onClick={() => setPipelineSeasonKey(seasonInfo.previousSeason!.seasonKey)}
                      className={`px-3 py-1 rounded ${pipelineSeasonKey === seasonInfo.previousSeason.seasonKey ? 'bg-blue-200' : 'bg-white'}`}
                    >
                      前回: {seasonInfo.previousSeason.seasonKey}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Season Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                シーズンキー（手動入力可）
              </label>
              <input
                type="text"
                value={pipelineSeasonKey}
                onChange={(e) => setPipelineSeasonKey(e.target.value)}
                placeholder="2026_spring"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Snapshot Status */}
            {snapshotStatus && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Text size="sm" className="font-bold">状態:</Text>
                  <Badge variant={STATUS_LABELS[snapshotStatus.status]?.color as any || 'secondary'}>
                    {STATUS_LABELS[snapshotStatus.status]?.label || snapshotStatus.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>参加者: {snapshotStatus.totalParticipants}名 / イベント: {snapshotStatus.totalEvents}件</div>
                  {snapshotStatus.frozenAt && <div>凍結: {new Date(snapshotStatus.frozenAt).toLocaleString('ja-JP')}</div>}
                  {snapshotStatus.finalizedAt && <div>確定: {new Date(snapshotStatus.finalizedAt).toLocaleString('ja-JP')}</div>}
                  {snapshotStatus.publishedAt && <div>公開: {new Date(snapshotStatus.publishedAt).toLocaleString('ja-JP')}</div>}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  if (!pipelineSeasonKey) return;
                  if (!confirm(`${pipelineSeasonKey} を凍結しますか？`)) return;
                  setPipelineLoading(true);
                  try {
                    await adminFreezeSeason2(pipelineSeasonKey);
                    setMessage(`${pipelineSeasonKey} を凍結しました`);
                    await loadSnapshotStatus();
                  } catch (err: any) {
                    setError(err.message || '凍結に失敗しました');
                  } finally {
                    setPipelineLoading(false);
                  }
                }}
                disabled={pipelineLoading || !pipelineSeasonKey}
                variant="secondary"
                size="sm"
                className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
              >
                Freeze
              </Button>
              <Button
                onClick={async () => {
                  if (!pipelineSeasonKey) return;
                  if (!confirm(`${pipelineSeasonKey} を確定しますか？`)) return;
                  setPipelineLoading(true);
                  try {
                    await adminFinalizeSeason2(pipelineSeasonKey);
                    setMessage(`${pipelineSeasonKey} を確定しました`);
                    await loadSnapshotStatus();
                  } catch (err: any) {
                    setError(err.message || '確定に失敗しました');
                  } finally {
                    setPipelineLoading(false);
                  }
                }}
                disabled={pipelineLoading || !pipelineSeasonKey}
                variant="secondary"
                size="sm"
                className="bg-blue-100 hover:bg-blue-200 border-blue-300"
              >
                Finalize
              </Button>
              <Button
                onClick={async () => {
                  if (!pipelineSeasonKey) return;
                  if (!confirm(`${pipelineSeasonKey} を公開しますか？`)) return;
                  setPipelineLoading(true);
                  try {
                    await adminPublishSeason(pipelineSeasonKey);
                    setMessage(`${pipelineSeasonKey} を公開しました`);
                    await loadSnapshotStatus();
                  } catch (err: any) {
                    setError(err.message || '公開に失敗しました');
                  } finally {
                    setPipelineLoading(false);
                  }
                }}
                disabled={pipelineLoading || !pipelineSeasonKey}
                variant="secondary"
                size="sm"
                className="bg-green-100 hover:bg-green-200 border-green-300"
              >
                Publish
              </Button>
              <Button
                onClick={async () => {
                  if (!pipelineSeasonKey) return;
                  setPipelineLoading(true);
                  try {
                    const res = await adminGetJobRuns(pipelineSeasonKey);
                    setJobRuns(res.jobRuns || []);
                  } catch (err: any) {
                    setError(err.message || 'ジョブログ取得に失敗しました');
                  } finally {
                    setPipelineLoading(false);
                  }
                }}
                disabled={pipelineLoading || !pipelineSeasonKey}
                variant="ghost"
                size="sm"
              >
                ジョブログ取得
              </Button>
            </div>

            {jobRuns.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <Text className="font-bold">ジョブ実行ログ</Text>
                {jobRuns.map((run: any, i: number) => (
                  <div key={i} className="text-sm border-b border-gray-200 pb-1">
                    <span className="font-mono">{run.jobName}</span>
                    {' '}
                    <Badge variant={run.status === 'success' ? 'success' : run.status === 'failed' ? 'warning' : 'info'}>
                      {run.status}
                    </Badge>
                    {run.error && <Text size="xs" className="text-red-600">{run.error}</Text>}
                  </div>
                ))}
              </div>
            )}

            {/* Auto-processing info */}
            <InfoBox title="自動処理について" variant="info">
              <Text size="xs">
                毎日00:01 JSTに自動処理が実行されます:
                シーズン終了時に自動freeze → 24時間後に自動finalize → 即時publish
              </Text>
            </InfoBox>
          </div>
        </Card>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">団体管理</Heading>
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2 items-center">
              <Text size="sm" className="font-medium">フィルター:</Text>
              <select
                value={groupsFilter}
                onChange={(e) => setGroupsFilter(e.target.value as 'all' | 'active' | 'suspended')}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">すべて</option>
                <option value="active">有効</option>
                <option value="suspended">停止中</option>
              </select>
              <Button
                onClick={loadGroups}
                disabled={groupsLoading}
                size="sm"
                variant="ghost"
              >
                更新
              </Button>
            </div>

            {/* Groups List */}
            {groupsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red"></div>
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                団体がありません
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`border rounded-lg p-4 ${group.status === 'suspended' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Text className="font-bold">{group.name}</Text>
                          <Badge variant={group.status === 'active' ? 'success' : 'warning'}>
                            {group.status === 'active' ? '有効' : '停止中'}
                          </Badge>
                        </div>
                        {group.description && (
                          <Text size="sm" color="muted" className="mt-1">{group.description}</Text>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>メンバー: {group.memberCount}人</span>
                          <span>作成: {new Date(group.createdAt).toLocaleDateString('ja-JP')}</span>
                          {group.suspendedAt && (
                            <span className="text-red-600">
                              停止: {new Date(group.suspendedAt).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                        {group.suspendReason && (
                          <Text size="xs" className="text-red-600 mt-1">理由: {group.suspendReason}</Text>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => loadGroupAuditLogs(group.id)}
                          size="sm"
                          variant="ghost"
                        >
                          ログ
                        </Button>
                        {group.status === 'active' ? (
                          <Button
                            onClick={() => setShowSuspendDialog(group.id)}
                            size="sm"
                            variant="secondary"
                            className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
                          >
                            停止
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleResumeGroup(group.id)}
                            size="sm"
                            variant="secondary"
                            className="bg-green-100 hover:bg-green-200 border-green-300"
                          >
                            再開
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          size="sm"
                          variant="secondary"
                          className="bg-red-100 hover:bg-red-200 border-red-300 text-red-700"
                        >
                          削除
                        </Button>
                      </div>
                    </div>

                    {/* Suspend Dialog */}
                    {showSuspendDialog === group.id && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Text size="sm" className="font-medium mb-2">停止理由を入力してください:</Text>
                        <input
                          type="text"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="例: 規約違反のため"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSuspendGroup(group.id)}
                            size="sm"
                            variant="secondary"
                            className="bg-yellow-200 hover:bg-yellow-300"
                          >
                            停止実行
                          </Button>
                          <Button
                            onClick={() => {
                              setShowSuspendDialog(null);
                              setSuspendReason('');
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Audit Logs Modal */}
            {selectedGroupId && groupAuditLogs.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <Text className="font-bold">監査ログ</Text>
                  <Button
                    onClick={() => {
                      setSelectedGroupId(null);
                      setGroupAuditLogs([]);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    閉じる
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {groupAuditLogs.map((log) => (
                    <div key={log.id} className="text-xs border-b border-gray-200 pb-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-gray-500">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        実行者: {log.actorEmail || log.actorId}
                        {log.targetId && <span> / 対象: {log.targetId}</span>}
                      </div>
                      {log.details && (
                        <div className="text-gray-500 mt-1">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">ユーザー管理</Heading>
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ニックネーム検索</label>
                <input
                  type="text"
                  value={usersNicknameFilter}
                  onChange={(e) => setUsersNicknameFilter(e.target.value)}
                  placeholder="検索..."
                  className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">権限フィルタ</label>
                <select
                  value={usersRoleFilter}
                  onChange={(e) => setUsersRoleFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">すべて</option>
                  {SITE_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <Button onClick={loadUsers} disabled={usersLoading} size="sm">
                {usersLoading ? '検索中...' : '検索'}
              </Button>
            </div>

            {/* Users List */}
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red"></div>
              </div>
            ) : usersData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ユーザーが見つかりません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2">ニックネーム</th>
                      <th className="text-left py-2 px-2">UID</th>
                      <th className="text-left py-2 px-2">権限</th>
                      <th className="text-left py-2 px-2">課金</th>
                      <th className="text-left py-2 px-2">作成日</th>
                      <th className="text-left py-2 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((u) => (
                      <tr key={u.uid} className="border-b border-gray-100">
                        <td className="py-2 px-2 font-medium">{u.nickname || '(未設定)'}</td>
                        <td className="py-2 px-2 font-mono text-xs text-gray-500">{u.uid.slice(0, 12)}...</td>
                        <td className="py-2 px-2">
                          <Badge variant={
                            u.siteRole === 'admin' ? 'info' :
                            u.siteRole === 'tester' ? 'success' :
                            u.siteRole === 'banned' ? 'warning' : 'secondary'
                          }>
                            {SITE_ROLE_OPTIONS.find((r) => r.value === u.siteRole)?.label || u.siteRole}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          {(() => {
                            const b = usersBilling[u.uid];
                            if (!b) return <span className="text-xs text-gray-400">-</span>;
                            const colors: Record<string, string> = {
                              FREE: 'success', TRIAL: 'info', ACTIVE: 'success',
                              CANCELED: 'warning', PAST_DUE: 'warning', NONE: 'secondary',
                            };
                            const labels: Record<string, string> = {
                              FREE: '無料', TRIAL: '試用', ACTIVE: '有効',
                              CANCELED: '解約', PAST_DUE: '未入門', NONE: '未設定',
                            };
                            return (
                              <Badge variant={(colors[b.status] || 'secondary') as any}>
                                {labels[b.status] || b.status}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-2 text-xs text-gray-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={u.siteRole}
                            onChange={(e) => handleSetUserRole(u.uid, e.target.value)}
                            disabled={changingRole === u.uid}
                            className="px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            {SITE_ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Text size="xs" color="muted">
              {usersData.length}件のユーザーを表示中（最大50件）
            </Text>
          </div>
        </Card>
      )}

      {/* Info */}
      <InfoBox title="操作について" variant="info">
        <ul className="space-y-1">
          <li>• <strong>節気カレンダー</strong>: 年間の四季（春戦・夏戦・秋戦・冬戦）期間を管理します。</li>
          <li>• <strong>ルールセット</strong>: 級位・段位・伝位の昇格条件を管理します。</li>
          <li>• <strong>確定パイプライン</strong>: シーズン終了時の凍結→確定→公開を実行します。</li>
          <li>• <strong>団体管理</strong>: 団体の停止・再開・削除、監査ログの確認を行います。</li>
          <li>• <strong>ユーザー</strong>: ユーザーの権限（admin/tester/user/banned）を管理します。</li>
        </ul>
      </InfoBox>
    </div>
  );
}
