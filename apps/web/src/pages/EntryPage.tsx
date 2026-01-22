/**
 * Entry page for official competition
 * Users select division and consent to ranking display
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserEntry,
  createEntry,
  canEnterDanDivision,
} from '@/services/entry.service';
import { getCurrentSeason } from '@/services/stage1.service';
import { initializeSeasons } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Season, Entry, Division, SeasonStatus } from '@/types/entry';

// シーズン状態に応じたラベルと説明
const SEASON_STATUS_INFO: Record<SeasonStatus, { label: string; description: string; variant: BadgeVariant }> = {
  open: { label: '受付中', description: 'エントリーを受け付けています', variant: 'success' },
  frozen: { label: '集計中', description: 'シーズン終了、番付集計中です。新規エントリーはできません。', variant: 'warning' },
  finalized: { label: '確定済', description: '番付が確定しました。次のシーズンをお待ちください。', variant: 'info' },
  archived: { label: '過去', description: 'アーカイブ済みのシーズンです。', variant: 'secondary' },
};

export function EntryPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [season, setSeason] = useState<Season | null>(null);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [canDan, setCanDan] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division>('kyu');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load season and entry data
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [currentSeason, danEligible] = await Promise.all([
          getCurrentSeason(),
          user ? canEnterDanDivision(user.uid) : false,
        ]);

        setSeason(currentSeason);
        if (currentSeason && user) {
          const userEntry = await getUserEntry(user.uid, currentSeason.seasonId);
          setExistingEntry(userEntry);
        }
        setCanDan(danEligible);
      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  // Handle entry submission
  const handleSubmit = async () => {
    if (!user || !season || !consent) return;

    setSubmitting(true);
    setError(null);

    try {
      await createEntry(user.uid, season.seasonId, selectedDivision);
      // Redirect to official competition page
      navigate('/official');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エントリーに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // Auth check
  if (authLoading || loading) {
    return (
      <div className="karuta-container py-2 text-center">
        <Text>読み込み中...</Text>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container py-2">
        <Card centered>
          <Heading as="h1" className="mb-4">ログインが必要です</Heading>
          <Text color="muted" className="mb-6">
            公式競技にエントリーするにはログインしてください。
          </Text>
          <Button
            onClick={() => navigate('/profile')}
          >
            ログインページへ
          </Button>
        </Card>
      </div>
    );
  }

  // Handle season initialization
  const handleInitSeasons = async () => {
    setSubmitting(true);
    try {
      await initializeSeasons();
      // Reload the page to fetch new season data
      window.location.reload();
    } catch (err) {
      setError('シーズン初期化に失敗しました');
      setSubmitting(false);
    }
  };

  if (!season) {
    return (
      <div className="karuta-container py-2">
        <Card centered>
          <Heading as="h1" className="mb-4">シーズン情報なし</Heading>
          <Text color="muted" className="mb-6">
            現在アクティブなシーズンがありません。
          </Text>
          {user && (
            <Button
              onClick={handleInitSeasons}
              disabled={submitting}
            >
              {submitting ? '初期化中...' : 'シーズンを初期化する'}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // シーズンが受付中かどうか
  const isSeasonOpen = season.status === 'open';
  const statusInfo = SEASON_STATUS_INFO[season.status];

  if (existingEntry) {
    return (
      <div className="karuta-container py-2">
        <Card centered>
          <Heading as="h1" className="mb-4">エントリー済み</Heading>
          <Text color="muted" className="mb-4">
            {season.name}に{existingEntry.division === 'kyu' ? '級位の部' : '段位の部'}でエントリー済みです。
          </Text>
          {isSeasonOpen ? (
            <Button
              onClick={() => navigate('/official')}
            >
              公式競技を開始する
            </Button>
          ) : (
            <div className="space-y-3">
              <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
                {statusInfo.label}
              </Badge>
              <Text size="sm" color="muted">{statusInfo.description}</Text>
              <Button
                variant="secondary"
                onClick={() => navigate('/banzuke')}
              >
                番付を確認する
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // シーズンが受付中でない場合はエントリー不可
  if (!isSeasonOpen) {
    return (
      <div className="karuta-container py-2">
        <Card centered>
          <Badge variant={statusInfo.variant} className="text-sm px-3 py-1 mb-4">
            {statusInfo.label}
          </Badge>
          <Heading as="h1" className="mb-4">{season.name}</Heading>
          <Text color="muted" className="mb-6">
            {statusInfo.description}
          </Text>
          <Button
            variant="secondary"
            onClick={() => navigate('/banzuke')}
          >
            番付を確認する
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="karuta-container py-2">
      <Card>
        <Heading as="h1" className="mb-6 text-center">{season.name} エントリー</Heading>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {/* Division selection */}
        <div className="mb-6">
          <Heading as="h2" size="h4" className="mb-3">部門を選択</Heading>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedDivision('kyu')}
              className={cn(
                "flex-1 p-4 border rounded-lg transition-all text-left",
                selectedDivision === 'kyu'
                  ? 'border-karuta-red bg-red-50 ring-2 ring-karuta-red'
                  : 'border-gray-200 hover:border-karuta-red hover:bg-gray-50'
              )}
            >
              <div className="font-bold text-lg text-gray-900">級位の部</div>
              <div className="text-sm text-gray-500">初心者〜中級者向け</div>
            </button>

            <button
              onClick={() => canDan && setSelectedDivision('dan')}
              disabled={!canDan}
              className={cn(
                "flex-1 p-4 border rounded-lg transition-all text-left",
                selectedDivision === 'dan'
                  ? 'border-karuta-accent bg-yellow-50 ring-2 ring-karuta-accent'
                  : canDan
                    ? 'border-gray-200 hover:border-karuta-accent hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              )}
            >
              <div className="font-bold text-lg text-gray-900">段位の部</div>
              <div className="text-sm text-gray-500">
                {canDan ? '六級以上向け' : '六級取得後に参加可能'}
              </div>
            </button>
          </div>
        </div>

        {/* Consent checkbox */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-karuta-red focus:ring-karuta-red"
            />
            <div>
              <div className="font-medium text-gray-900">番付掲載に同意する</div>
              <div className="text-sm text-gray-600 mt-1">
                公式競技の結果は番付（ランキング）に表示名（ニックネーム）で掲載されます。
                同意しない場合はエントリーできません。
              </div>
            </div>
          </label>
        </div>

        {/* Submit button */}
        <Button
          fullWidth
          size="lg"
          onClick={handleSubmit}
          disabled={!consent || submitting}
        >
          {submitting ? 'エントリー中...' : 'エントリーする'}
        </Button>

        <Text size="sm" color="muted" className="mt-4 text-center">
          エントリー後は部門の変更はできません
        </Text>
      </Card>
    </div>
  );
}

