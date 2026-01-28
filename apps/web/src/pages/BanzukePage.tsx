import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodaysBanzuke } from '@/services/banzuke.service';
import { getActiveSeason, getUserEntry } from '@/services/entry.service';
import {
  getActiveSeasonStage1,
  getLatestFinalizedSeason,
  getRankingCache,
  getBanzukeAsRanking,
} from '@/services/stage1.service';
import { getLatestPublishedSnapshot, getUserProgress } from '@/services/utaawase.service';
import { KYUI_LEVEL_LABELS, DAN_LEVEL_LABELS, KYUI_PROMOTION_CONDITIONS, KyuiLevel } from '@/types/utaawase';
import { useRanking } from '@/hooks/useRanking';
import { RankingList } from '@/components/RankingList';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Typography';
import { LoadingState, ErrorState } from '@/components/ui/PageStates';
import { cn } from '@/lib/utils';
import type { Submission } from '@/types/submission';
import type { Division, Season, SeasonStatus } from '@/types/entry';
import type { Ranking } from '@/types/ranking';
import type { SeasonSnapshot } from '@/types/utaawase';

type ViewMode = 'provisional' | 'official' | 'daily' | 'v2published';

export function BanzukePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [division, setDivision] = useState<Division>('kyu');
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [finalizedSeason, setFinalizedSeason] = useState<Season | null>(null);
  const [provisionalRanking, setProvisionalRanking] = useState<Ranking | null>(null);
  const [officialRanking, setOfficialRanking] = useState<Ranking | null>(null);
  const [dailyRankings, setDailyRankings] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [v2Snapshot, setV2Snapshot] = useState<SeasonSnapshot | null>(null);
  const [userLevelLabel, setUserLevelLabel] = useState<string | null>(null);
  const [promotionCondition, setPromotionCondition] = useState<string | null>(null);

  // Fetch seasons (Stage 1)
  useEffect(() => {
    async function fetchSeasons() {
      // Fetch independently so one failure doesn't block the other
      let active: Season | null = null;
      try {
        active = await getActiveSeasonStage1();
      } catch (err) {
        console.error('Failed to fetch active season (Stage1):', err);
      }

      if (!active) {
        try {
          const legacySeason = await getActiveSeason();
          if (legacySeason) {
            active = {
              seasonId: legacySeason.seasonId,
              name: legacySeason.name,
              status: 'open' as SeasonStatus,
              startDate: legacySeason.startDate,
              createdAt: legacySeason.startDate,
              updatedAt: legacySeason.startDate,
            };
          }
        } catch (err) {
          console.error('Failed to fetch active season (legacy):', err);
        }
      }

      if (active) {
        setActiveSeason(active);
      }

      try {
        const finalized = await getLatestFinalizedSeason();
        if (finalized) {
          setFinalizedSeason(finalized);
        }
      } catch (err) {
        console.error('Failed to fetch finalized season:', err);
      }
    }
    fetchSeasons();
  }, []);

  // Fetch user's entry division and level
  useEffect(() => {
    async function fetchUserEntry() {
      if (!user || !activeSeason) return;
      try {
        const entry = await getUserEntry(user.uid, activeSeason.seasonId);
        if (entry) {
          setDivision(entry.division); // Auto-select user's division

          // Get user's current level from progress
          const progress = await getUserProgress(user.uid);
          if (progress) {
            if (entry.division === 'dan' && progress.danLevel) {
              setUserLevelLabel(DAN_LEVEL_LABELS[progress.danLevel] || progress.danLevel);
              setPromotionCondition(null); // Dan has different promotion rules
            } else {
              const kyuLevel = progress.kyuiLevel as KyuiLevel;
              setUserLevelLabel(KYUI_LEVEL_LABELS[kyuLevel] || kyuLevel);
              setPromotionCondition(KYUI_PROMOTION_CONDITIONS[kyuLevel]);
            }
          } else {
            // No progress = beginner level
            setUserLevelLabel('初級');
            setPromotionCondition(KYUI_PROMOTION_CONDITIONS.beginner);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user entry:', err);
      }
    }
    fetchUserEntry();
  }, [user, activeSeason]);

  // Fetch provisional ranking (Stage 1) - always fetch when season is available
  useEffect(() => {
    async function fetchProvisionalRanking() {
      if (!activeSeason) return;

      try {
        const ranking = await getRankingCache(activeSeason.seasonId, division);
        setProvisionalRanking(ranking);
      } catch (err) {
        console.error('Failed to fetch provisional ranking:', err);
      }
    }
    fetchProvisionalRanking();
  }, [activeSeason, division]);

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

  // Fetch V2 published snapshot or fallback to provisional ranking
  useEffect(() => {
    async function fetchV2Data() {
      if (viewMode !== 'v2published') return;
      setLoading(true);
      try {
        const snapshot = await getLatestPublishedSnapshot();
        setV2Snapshot(snapshot);
        // If no published snapshot, fallback to provisional ranking
        if (!snapshot && activeSeason) {
          const ranking = await getRankingCache(activeSeason.seasonId, division);
          setProvisionalRanking(ranking);
        }
      } catch (err) {
        console.error('Failed to fetch V2 data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchV2Data();
  }, [viewMode, activeSeason, division]);

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
    ? (provisionalRanking === null && legacyRanking === null && legacyLoading)
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
              { id: 'daily' as const, label: '本日' },
              { id: 'provisional' as const, label: '暫定' },
              { id: 'official' as const, label: '公式', disabled: !finalizedSeason },
              { id: 'v2published' as const, label: '歌位' },
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

          {(viewMode === 'provisional' || viewMode === 'official' || viewMode === 'v2published') && (
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

        {/* Line 2: Info text + User's division */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {viewMode === 'provisional' && 'リアルタイム更新・公式提出のみ'}
            {viewMode === 'official' && '確定済み・変更なし'}
            {viewMode === 'daily' && `${new Date().toLocaleDateString('ja-JP')}の記録`}
            {viewMode === 'v2published' && '節気別歌位確定結果（publish済み）'}
          </span>
          {userLevelLabel && (
            <div className="text-right">
              <Badge variant="info" className="text-xs">
                現在: {userLevelLabel}
              </Badge>
              {promotionCondition && (
                <div className="text-xs text-gray-400 mt-0.5">{promotionCondition}</div>
              )}
            </div>
          )}
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

      {/* V2 Published Snapshot */}
      {viewMode === 'v2published' && (
        <>
          {loading ? (
            <LoadingState message="歌位データを読み込み中..." />
          ) : v2Snapshot ? (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Text className="font-bold">{v2Snapshot.seasonKey}</Text>
                  <Badge variant="success">publish済み</Badge>
                </div>
                <Text size="sm" color="muted">
                  参加者: {v2Snapshot.totalParticipants}名 / イベント: {v2Snapshot.totalEvents}件
                </Text>

                {/* Promotions */}
                {v2Snapshot.promotions.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <Text size="sm" className="font-bold mb-2">昇格結果</Text>
                    {v2Snapshot.promotions.map((p, i) => (
                      <div key={i} className="text-sm">
                        {p.nickname}: {p.fromLevel} → {p.toLevel} ({p.promotionType})
                      </div>
                    ))}
                  </div>
                )}

                {/* Rankings */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 px-2">順位</th>
                        <th className="text-left py-2 px-2">表示名</th>
                        <th className="text-right py-2 px-2">累積スコア</th>
                        <th className="text-right py-2 px-2">試合数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v2Snapshot.rankings.map((entry) => (
                        <tr
                          key={entry.uid}
                          className={cn(
                            "border-b border-gray-100",
                            entry.uid === user?.uid && "bg-karuta-red/5"
                          )}
                        >
                          <td className="py-2 px-2 font-bold">{entry.rank}</td>
                          <td className="py-2 px-2">{entry.nickname}</td>
                          <td className="py-2 px-2 text-right font-bold text-karuta-gold">{entry.bestThreeTotal}</td>
                          <td className="py-2 px-2 text-right">{entry.matchCount}</td>
                        </tr>
                      ))}
                      {v2Snapshot.rankings.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            ランキングデータがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          ) : provisionalRanking ? (
            <Card>
              <div className="mb-2">
                <Badge variant="info" className="text-xs">暫定</Badge>
              </div>
              <RankingList
                ranking={provisionalRanking}
                currentUserId={user?.uid}
                loading={false}
                emptyMessage="まだランキングデータがありません"
              />
              {provisionalRanking.totalParticipants && (
                <div className="mt-2 text-xs text-gray-400 text-right">
                  参加者数: {provisionalRanking.totalParticipants}名
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <Text className="text-center py-8 text-gray-500">
                歌位データがありません
              </Text>
            </Card>
          )}
        </>
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
                    公式歌合に挑戦 →
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
