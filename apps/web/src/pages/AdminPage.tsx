/**
 * Admin Dashboard - シーズン管理・統計・手動運用操作
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, AuthRequiredState, InfoBox } from '@/components/ui/PageStates';
import {
  adminGetRuleset,
  adminSeedDefaultRuleset,
  adminGetSeasonCalendar,
  adminSeedDefaultCalendar,
  adminFreezeSeason2,
  adminFinalizeSeason2,
  adminPublishSeason,
  adminGetJobRuns,
} from '@/services/admin-v2.service';

interface Season {
  seasonId: string;
  name: string;
  status: 'open' | 'frozen' | 'finalized' | 'archived';
  startDate: string | null;
  freezeDate: string | null;
  finalizeDate: string | null;
  updatedAt: string | null;
}

interface SeasonStats {
  seasonId: string;
  entries: {
    total: number;
    kyu: number;
    dan: number;
  };
  sessions: {
    total: number;
    confirmed: number;
    invalid: number;
    pending: number;
  };
}

const statusLabels: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'secondary' }> = {
  open: { label: '開催中', variant: 'info' },
  frozen: { label: '凍結中', variant: 'warning' },
  finalized: { label: '確定', variant: 'success' },
  archived: { label: 'アーカイブ', variant: 'secondary' },
};

type TabType = 'seasons' | 'create' | 'calendar' | 'ruleset' | 'pipeline';

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('seasons');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonStats, setSeasonStats] = useState<Record<string, SeasonStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // New season form
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newTerm, setNewTerm] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [creating, setCreating] = useState(false);

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

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const adminGetSeasons = httpsCallable<unknown, { success: boolean; seasons: Season[] }>(
        functions,
        'adminGetSeasons'
      );
      const result = await adminGetSeasons({});
      if (result.data.success) {
        setSeasons(result.data.seasons);
      }
    } catch (err) {
      console.error('Failed to fetch seasons:', err);
      setError('シーズン情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSeasons();
    }
  }, [user, authLoading, fetchSeasons]);

  // Fetch stats for a season
  const fetchSeasonStats = async (seasonId: string) => {
    try {
      const adminGetSeasonStats = httpsCallable<{ seasonId: string }, { success: boolean; stats: SeasonStats }>(
        functions,
        'adminGetSeasonStats'
      );
      const result = await adminGetSeasonStats({ seasonId });
      if (result.data.success) {
        setSeasonStats((prev) => ({ ...prev, [seasonId]: result.data.stats }));
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Load stats for open/frozen seasons
  useEffect(() => {
    seasons
      .filter((s) => s.status === 'open' || s.status === 'frozen')
      .forEach((s) => {
        if (!seasonStats[s.seasonId]) {
          fetchSeasonStats(s.seasonId);
        }
      });
  }, [seasons, seasonStats]);

  const handleFreeze = async (seasonId: string) => {
    if (!confirm(`シーズン ${seasonId} を凍結しますか？\n凍結後は新規提出が反映されなくなります。`)) {
      return;
    }

    try {
      setActionLoading(seasonId);
      setMessage(null);
      const adminFreezeSeason = httpsCallable<{ seasonId: string }, { success: boolean }>(
        functions,
        'adminFreezeSeason'
      );
      await adminFreezeSeason({ seasonId });
      setMessage(`${seasonId} を凍結しました`);
      await fetchSeasons();
    } catch (err: unknown) {
      console.error('Failed to freeze season:', err);
      const errorMessage = err instanceof Error ? err.message : '凍結に失敗しました';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (seasonId: string) => {
    if (!confirm(`シーズン ${seasonId} を確定しますか？\n確定後は番付が公式として固定されます。`)) {
      return;
    }

    try {
      setActionLoading(seasonId);
      setMessage(null);
      const adminFinalizeSeason = httpsCallable<{ seasonId: string }, { success: boolean }>(
        functions,
        'adminFinalizeSeason'
      );
      await adminFinalizeSeason({ seasonId });
      setMessage(`${seasonId} を確定しました`);
      await fetchSeasons();
    } catch (err: unknown) {
      console.error('Failed to finalize season:', err);
      const errorMessage = err instanceof Error ? err.message : '確定に失敗しました';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRankings = async (seasonId: string) => {
    try {
      setActionLoading(`ranking-${seasonId}`);
      setMessage(null);
      const adminUpdateRankings = httpsCallable<{ seasonId: string }, { success: boolean; message: string }>(
        functions,
        'adminUpdateRankings'
      );
      const result = await adminUpdateRankings({ seasonId });
      setMessage(result.data.message);
      // Refresh stats
      fetchSeasonStats(seasonId);
    } catch (err: unknown) {
      console.error('Failed to update rankings:', err);
      const errorMessage = err instanceof Error ? err.message : 'ランキング更新に失敗しました';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSeason = async () => {
    if (!confirm(`${newYear}年${newTerm === 'spring' ? '春' : newTerm === 'summer' ? '夏' : newTerm === 'autumn' ? '秋' : '冬'}戦を作成しますか？`)) {
      return;
    }

    try {
      setCreating(true);
      setMessage(null);
      const adminCreateSeason = httpsCallable<
        { year: number; term: string },
        { success: boolean; season: { seasonId: string; name: string } }
      >(functions, 'adminCreateSeason');
      const result = await adminCreateSeason({ year: newYear, term: newTerm });
      setMessage(`${result.data.season.name} を作成しました`);
      await fetchSeasons();
      setActiveTab('seasons');
    } catch (err: unknown) {
      console.error('Failed to create season:', err);
      const errorMessage = err instanceof Error ? err.message : 'シーズン作成に失敗しました';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="管理者ダッシュボード" subtitle="シーズン管理・統計・手動運用" />
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="管理者ダッシュボード" subtitle="シーズン管理・統計・手動運用" />
        <AuthRequiredState message="管理者ページにアクセスするにはログインが必要です" />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header */}
      <PageHeader title="管理者ダッシュボード" subtitle="シーズン管理・統計・手動運用" />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('seasons')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'seasons'
              ? 'bg-karuta-red text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          シーズン管理
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'create'
              ? 'bg-karuta-red text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          新規シーズン
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'calendar'
              ? 'bg-karuta-red text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          節気カレンダー
        </button>
        <button
          onClick={() => setActiveTab('ruleset')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'ruleset'
              ? 'bg-karuta-red text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          ルールセット
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'pipeline'
              ? 'bg-karuta-red text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          確定パイプライン
        </button>
      </div>

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

      {/* Seasons Tab */}
      {activeTab === 'seasons' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">シーズン一覧</Heading>

          {loading ? (
            <LoadingState message="シーズン情報を読み込み中..." />
          ) : seasons.length === 0 ? (
            <Text color="muted" className="text-center py-8">
              シーズンがありません
            </Text>
          ) : (
            <div className="space-y-2">
              {seasons.map((season) => {
                const statusInfo = statusLabels[season.status] || { label: season.status, variant: 'secondary' as const };
                const isActionLoading = actionLoading === season.seasonId;
                const isRankingLoading = actionLoading === `ranking-${season.seasonId}`;
                const stats = seasonStats[season.seasonId];

                return (
                  <div
                    key={season.seasonId}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Text className="font-bold">{season.name}</Text>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <Text size="sm" color="muted">{season.seasonId}</Text>
                      </div>
                    </div>

                    {/* Stats */}
                    {stats && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                          <div>
                            <Text size="sm" color="muted">エントリー</Text>
                            <Text className="font-bold text-lg">{stats.entries.total}</Text>
                            <Text size="xs" color="muted">
                              級{stats.entries.kyu} / 段{stats.entries.dan}
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" color="muted">セッション</Text>
                            <Text className="font-bold text-lg">{stats.sessions.total}</Text>
                          </div>
                          <div>
                            <Text size="sm" color="muted">確定</Text>
                            <Text className="font-bold text-lg text-green-600">{stats.sessions.confirmed}</Text>
                          </div>
                          <div>
                            <Text size="sm" color="muted">無効</Text>
                            <Text className="font-bold text-lg text-red-600">{stats.sessions.invalid}</Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <Text size="sm" color="muted">開始日</Text>
                        <Text size="sm">{formatDate(season.startDate)}</Text>
                      </div>
                      <div>
                        <Text size="sm" color="muted">凍結日</Text>
                        <Text size="sm">{formatDate(season.freezeDate)}</Text>
                      </div>
                      <div>
                        <Text size="sm" color="muted">確定日</Text>
                        <Text size="sm">{formatDate(season.finalizeDate)}</Text>
                      </div>
                      <div>
                        <Text size="sm" color="muted">更新日</Text>
                        <Text size="sm">{formatDate(season.updatedAt)}</Text>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {season.status === 'open' && (
                        <>
                          <Button
                            onClick={() => handleFreeze(season.seasonId)}
                            disabled={isActionLoading}
                            variant="secondary"
                            size="sm"
                            className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
                          >
                            {isActionLoading ? '処理中...' : '凍結'}
                          </Button>
                          <Button
                            onClick={() => handleUpdateRankings(season.seasonId)}
                            disabled={isRankingLoading}
                            variant="secondary"
                            size="sm"
                          >
                            {isRankingLoading ? '更新中...' : 'ランキング更新'}
                          </Button>
                          <Button
                            onClick={() => fetchSeasonStats(season.seasonId)}
                            variant="ghost"
                            size="sm"
                          >
                            統計更新
                          </Button>
                        </>
                      )}
                      {season.status === 'frozen' && (
                        <>
                          <Button
                            onClick={() => handleFinalize(season.seasonId)}
                            disabled={isActionLoading}
                            variant="secondary"
                            size="sm"
                            className="bg-green-100 hover:bg-green-200 border-green-300"
                          >
                            {isActionLoading ? '処理中...' : '確定'}
                          </Button>
                          <Button
                            onClick={() => fetchSeasonStats(season.seasonId)}
                            variant="ghost"
                            size="sm"
                          >
                            統計更新
                          </Button>
                        </>
                      )}
                      {(season.status === 'finalized' || season.status === 'archived') && (
                        <Text size="sm" color="muted">操作不可</Text>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Create Season Tab */}
      {activeTab === 'create' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">新規シーズン作成</Heading>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value, 10))}
                min={2024}
                max={2030}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-karuta-red focus:border-karuta-red"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期</label>
              <select
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value as 'spring' | 'summer' | 'autumn' | 'winter')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-karuta-red focus:border-karuta-red"
              >
                <option value="spring">春戦 (2-5月)</option>
                <option value="summer">夏戦 (5-8月)</option>
                <option value="autumn">秋戦 (8-11月)</option>
                <option value="winter">冬戦 (11-2月)</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <Text size="sm" color="muted">
                作成されるシーズンID: <span className="font-mono font-bold">{newYear}_{newTerm}</span>
              </Text>
            </div>

            <Button
              onClick={handleCreateSeason}
              disabled={creating}
              fullWidth
              size="lg"
            >
              {creating ? '作成中...' : 'シーズンを作成'}
            </Button>
          </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                シーズンキー (例: 2026_spring)
              </label>
              <input
                type="text"
                value={pipelineSeasonKey}
                onChange={(e) => setPipelineSeasonKey(e.target.value)}
                placeholder="2026_spring"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  if (!pipelineSeasonKey) return;
                  if (!confirm(`${pipelineSeasonKey} を凍結しますか？`)) return;
                  setPipelineLoading(true);
                  try {
                    await adminFreezeSeason2(pipelineSeasonKey);
                    setMessage(`${pipelineSeasonKey} を凍結しました`);
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
          </div>
        </Card>
      )}

      {/* Info */}
      <InfoBox title="操作について" variant="info">
        <ul className="space-y-1">
          <li>• <strong>凍結</strong>: シーズンを集計停止状態にします。新規提出は反映されなくなります。</li>
          <li>• <strong>確定</strong>: 凍結中のシーズンを確定し、公式番付として固定します。</li>
          <li>• <strong>ランキング更新</strong>: 手動でランキングキャッシュを更新します。</li>
          <li>• 通常は凍結から24時間後に自動確定されます。</li>
          <li>• 確定後は原則再計算しません（重大不正時のみ）。</li>
        </ul>
      </InfoBox>
    </div>
  );
}
