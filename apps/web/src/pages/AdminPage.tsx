/**
 * Admin page for manual season operations (S1_T14)
 */

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, AuthRequiredState, InfoBox } from '@/components/ui/PageStates';

interface Season {
  seasonId: string;
  name: string;
  status: 'open' | 'frozen' | 'finalized' | 'archived';
  startDate: string | null;
  freezeDate: string | null;
  finalizeDate: string | null;
  updatedAt: string | null;
}

const statusLabels: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'secondary' }> = {
  open: { label: '開催中', variant: 'info' },
  frozen: { label: '凍結中', variant: 'warning' },
  finalized: { label: '確定', variant: 'success' },
  archived: { label: 'アーカイブ', variant: 'secondary' },
};

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch seasons
  useEffect(() => {
    async function fetchSeasons() {
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
    }

    if (!authLoading && user) {
      fetchSeasons();
    }
  }, [user, authLoading]);

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

      // Refresh seasons
      const adminGetSeasons = httpsCallable<unknown, { success: boolean; seasons: Season[] }>(
        functions,
        'adminGetSeasons'
      );
      const result = await adminGetSeasons({});
      if (result.data.success) {
        setSeasons(result.data.seasons);
      }
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

      // Refresh seasons
      const adminGetSeasons = httpsCallable<unknown, { success: boolean; seasons: Season[] }>(
        functions,
        'adminGetSeasons'
      );
      const result = await adminGetSeasons({});
      if (result.data.success) {
        setSeasons(result.data.seasons);
      }
    } catch (err: unknown) {
      console.error('Failed to finalize season:', err);
      const errorMessage = err instanceof Error ? err.message : '確定に失敗しました';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="karuta-container space-y-6 py-2">
        <PageHeader title="管理者ページ" subtitle="シーズン管理・手動運用操作" />
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container space-y-6 py-2">
        <PageHeader title="管理者ページ" subtitle="シーズン管理・手動運用操作" />
        <AuthRequiredState message="管理者ページにアクセスするにはログインが必要です" />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-6 py-2">
      {/* Header */}
      <PageHeader title="管理者ページ" subtitle="シーズン管理・手動運用操作" />

      {/* Messages */}
      {message && (
        <Card className="bg-green-50 border-green-200">
          <Text className="text-green-800">{message}</Text>
        </Card>
      )}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <Text className="text-red-800">{error}</Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            閉じる
          </Button>
        </Card>
      )}

      {/* Seasons List */}
      <Card>
        <Heading as="h3" size="h3" className="mb-4">シーズン一覧</Heading>

        {loading ? (
          <LoadingState message="シーズン情報を読み込み中..." />
        ) : seasons.length === 0 ? (
          <Text color="muted" className="text-center py-8">
            シーズンがありません
          </Text>
        ) : (
          <div className="space-y-4">
            {seasons.map((season) => {
              const statusInfo = statusLabels[season.status] || { label: season.status, variant: 'secondary' as const };
              const isActionLoading = actionLoading === season.seasonId;

              return (
                <div
                  key={season.seasonId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Text className="font-bold">{season.name}</Text>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <Text size="sm" color="muted">{season.seasonId}</Text>
                    </div>
                  </div>

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

                  <div className="flex gap-2">
                    {season.status === 'open' && (
                      <Button
                        onClick={() => handleFreeze(season.seasonId)}
                        disabled={isActionLoading}
                        variant="secondary"
                        size="sm"
                        className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
                      >
                        {isActionLoading ? '処理中...' : '凍結'}
                      </Button>
                    )}
                    {season.status === 'frozen' && (
                      <Button
                        onClick={() => handleFinalize(season.seasonId)}
                        disabled={isActionLoading}
                        variant="secondary"
                        size="sm"
                        className="bg-green-100 hover:bg-green-200 border-green-300"
                      >
                        {isActionLoading ? '処理中...' : '確定'}
                      </Button>
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

      {/* Info */}
      <InfoBox title="操作について" variant="info">
        <ul className="space-y-1">
          <li>• <strong>凍結</strong>: シーズンを集計停止状態にします。新規提出は反映されなくなります。</li>
          <li>• <strong>確定</strong>: 凍結中のシーズンを確定し、公式番付として固定します。</li>
          <li>• 通常は凍結から24時間後に自動確定されます。</li>
          <li>• 確定後は原則再計算しません（重大不正時のみ）。</li>
        </ul>
      </InfoBox>
    </div>
  );
}
