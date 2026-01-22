import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodaysBanzuke } from '@/services/banzuke.service';
import { getActiveSeason } from '@/services/entry.service';
import {
  getActiveSeasonStage1,
  getLatestFinalizedSeason,
  getRankingCache,
  getBanzukeAsRanking,
} from '@/services/stage1.service';
import { useRanking } from '@/hooks/useRanking';
import { RankingList } from '@/components/RankingList';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/PageStates';
import { cn } from '@/lib/utils';
import type { Submission } from '@/types/submission';
import type { Division, Season, SeasonStatus } from '@/types/entry';
import type { Ranking } from '@/types/ranking';

type ViewMode = 'provisional' | 'official' | 'daily';

export function BanzukePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('provisional');
  const [division, setDivision] = useState<Division>('kyu');
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [finalizedSeason, setFinalizedSeason] = useState<Season | null>(null);
  const [provisionalRanking, setProvisionalRanking] = useState<Ranking | null>(null);
  const [officialRanking, setOfficialRanking] = useState<Ranking | null>(null);
  const [dailyRankings, setDailyRankings] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch seasons (Stage 1)
  useEffect(() => {
    async function fetchSeasons() {
      try {
        // Try Stage 1 seasons first
        const [active, finalized] = await Promise.all([
          getActiveSeasonStage1(),
          getLatestFinalizedSeason(),
        ]);

        if (active) {
          setActiveSeason(active);
        } else {
          // Fallback to Stage 0 season
          const legacySeason = await getActiveSeason();
          if (legacySeason) {
            // Convert to Stage 1 format (explicit to avoid status type conflict)
            setActiveSeason({
              seasonId: legacySeason.seasonId,
              name: legacySeason.name,
              status: 'open' as SeasonStatus,
              startDate: legacySeason.startDate,
              createdAt: legacySeason.startDate,
              updatedAt: legacySeason.startDate,
            });
          }
        }

        if (finalized) {
          setFinalizedSeason(finalized);
        }
      } catch (err) {
        console.error('Failed to fetch seasons:', err);
      }
    }
    fetchSeasons();
  }, []);

  // Fetch provisional ranking (Stage 1)
  useEffect(() => {
    async function fetchProvisionalRanking() {
      if (!activeSeason || viewMode !== 'provisional') return;

      setLoading(true);
      try {
        const ranking = await getRankingCache(activeSeason.seasonId, division);
        setProvisionalRanking(ranking);
      } catch (err) {
        console.error('Failed to fetch provisional ranking:', err);
        setError('暫定ランキングの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchProvisionalRanking();
  }, [activeSeason, division, viewMode]);

  // Fetch official ranking (Stage 1)
  useEffect(() => {
    async function fetchOfficialRanking() {
      if (!finalizedSeason || viewMode !== 'official') return;

      setLoading(true);
      try {
        const ranking = await getBanzukeAsRanking(finalizedSeason.seasonId, division);
        setOfficialRanking(ranking);
      } catch (err) {
        console.error('Failed to fetch official ranking:', err);
        setError('公式番付の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchOfficialRanking();
  }, [finalizedSeason, division, viewMode]);

  // Fallback: use existing ranking hook for Stage 0 compatibility
  const { ranking: legacyRanking, loading: legacyLoading } = useRanking({
    seasonId: activeSeason?.seasonId || '',
    division,
  });

  // Fetch daily rankings
  useEffect(() => {
    async function fetchDailyBanzuke() {
      if (viewMode !== 'daily') return;

      setLoading(true);
      try {
        const data = await getTodaysBanzuke();
        setDailyRankings(data);
      } catch (err) {
        console.error('Failed to fetch daily banzuke:', err);
        setError('番付の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchDailyBanzuke();
  }, [viewMode]);

  // Determine which ranking to show
  const currentRanking = viewMode === 'provisional'
    ? (provisionalRanking || legacyRanking)
    : viewMode === 'official'
      ? officialRanking
      : null;

  const isLoading = viewMode === 'provisional'
    ? (loading || legacyLoading)
    : loading;

  const formatTime = (date: Date) => {
    const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().substring(11, 19);
  };

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Control Panel - 2行 */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        {/* Line 1: View mode + Division */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-gray-100 rounded p-0.5">
            {[
              { id: 'provisional' as const, label: '暫定' },
              { id: 'official' as const, label: '公式', disabled: !finalizedSeason },
              { id: 'daily' as const, label: '本日' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => !mode.disabled && setViewMode(mode.id)}
                disabled={mode.disabled}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  viewMode === mode.id
                    ? "bg-white text-karuta-tansei shadow-sm"
                    : "text-gray-600",
                  mode.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {(viewMode === 'provisional' || viewMode === 'official') && (
            <div className="flex bg-gray-100 rounded p-0.5">
              {[
                { id: 'kyu' as const, label: '級位' },
                { id: 'dan' as const, label: '段位' },
              ].map((div) => (
                <button
                  key={div.id}
                  onClick={() => setDivision(div.id)}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded transition-colors",
                    division === div.id
                      ? "bg-white text-karuta-tansei shadow-sm"
                      : "text-gray-600"
                  )}
                >
                  {div.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Line 2: Info text */}
        <div className="text-xs text-gray-500">
          {viewMode === 'provisional' && '約10分ごと更新・公式提出のみ'}
          {viewMode === 'official' && '確定済み・変更なし'}
          {viewMode === 'daily' && `${new Date().toLocaleDateString('ja-JP')}の記録`}
        </div>
      </div>

      {/* Provisional / Official Ranking */}
      {(viewMode === 'provisional' || viewMode === 'official') && (
        <Card>
          <RankingList
            ranking={currentRanking}
            currentUserId={user?.uid}
            loading={isLoading}
            emptyMessage={
              viewMode === 'provisional'
                ? 'この部門の暫定ランキングはまだありません'
                : 'この部門の公式番付はまだありません'
            }
          />
          {currentRanking?.totalParticipants && (
            <div className="mt-2 text-xs text-gray-400 text-right">
              参加者数: {currentRanking.totalParticipants}名
            </div>
          )}
        </Card>
      )}

      {/* Daily Ranking Table */}
      {viewMode === 'daily' && (
        <>
          {loading ? (
            <LoadingState message="本日の番付を読み込み中..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => window.location.reload()} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">順位</th>
                      <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">表示名</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-semibold text-gray-700">スコア</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-semibold text-gray-700">正答</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden sm:table-cell">平均</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">時刻</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRankings.length > 0 ? (
                      dailyRankings.map((entry, index) => {
                        const rank = index + 1;
                        return (
                          <tr
                            key={entry.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-2 px-2 sm:px-3">
                              <span className={cn(
                                "font-bold",
                                rank === 1 ? "text-yellow-600 text-lg" :
                                  rank === 2 ? "text-gray-400" :
                                    rank === 3 ? "text-orange-600" :
                                      "text-gray-600"
                              )}>
                                {rank}
                              </span>
                            </td>
                            <td className="py-2 px-2 sm:px-3 font-medium truncate max-w-[100px] sm:max-w-none">{entry.nickname}</td>
                            <td className="py-2 px-2 sm:px-3 text-right font-bold text-karuta-gold">
                              {entry.score}
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-right">
                              {entry.correctCount}/50
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-right text-gray-600 hidden sm:table-cell">
                              {entry.avgMs}ms
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-right text-gray-500 hidden md:table-cell">
                              {formatTime(entry.serverSubmittedAt)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          本日の公式記録はまだありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {dailyRankings.length === 0 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  <button
                    onClick={() => navigate('/entry')}
                    className="text-karuta-tansei hover:underline"
                  >
                    公式競技に挑戦 →
                  </button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
