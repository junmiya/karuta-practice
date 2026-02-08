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
import { getLatestPublishedSnapshot, getUserProgress, getUtakuraiHolders, getDanHolders, getDenHolders } from '@/services/utaawase.service';
import { KYUI_LEVEL_LABELS, DAN_LEVEL_LABELS, KYUI_PROMOTION_CONDITIONS, UserProgress, DanLevel, normalizeKyuiLevel } from '@/types/utaawase';
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
  const [utakuraiHolders, setUtakuraiHolders] = useState<UserProgress[]>([]);
  const [danHolders, setDanHolders] = useState<UserProgress[]>([]);
  const [denHolders, setDenHolders] = useState<UserProgress[]>([]);

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
              const kyuLevel = normalizeKyuiLevel(progress.kyuiLevel);
              setUserLevelLabel(KYUI_LEVEL_LABELS[kyuLevel]);
              setPromotionCondition(KYUI_PROMOTION_CONDITIONS[kyuLevel]);
            }
          } else {
            // No progress = minarai level
            setUserLevelLabel('見習');
            setPromotionCondition(KYUI_PROMOTION_CONDITIONS.minarai);
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

  // Fetch V2 published snapshot and utaurai holders
  useEffect(() => {
    async function fetchV2Data() {
      if (viewMode !== 'v2published') return;
      setLoading(true);
      try {
        // Fetch utakurai holders (歌位保持者)
        const [utakurai, dan, den, snapshot] = await Promise.all([
          getUtakuraiHolders(),
          getDanHolders(),
          getDenHolders(),
          getLatestPublishedSnapshot(),
        ]);
        setUtakuraiHolders(utakurai);
        setDanHolders(dan);
        setDenHolders(den);
        setV2Snapshot(snapshot);
      } catch (err) {
        console.error('Failed to fetch V2 data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchV2Data();
  }, [viewMode]);

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

      {/* 歌位保持者一覧 */}
      {viewMode === 'v2published' && (
        <>
          {loading ? (
            <LoadingState message="歌位データを読み込み中..." />
          ) : (
            <div className="space-y-3">
              {/* 歌位（名歌位・永世名歌位） */}
              <Card>
                <Text className="font-bold mb-3">歌位</Text>
                {utakuraiHolders.length > 0 ? (
                  <div className="space-y-2">
                    {utakuraiHolders.map((holder) => (
                      <div
                        key={holder.uid}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200",
                          holder.uid === user?.uid && "ring-2 ring-karuta-red"
                        )}
                      >
                        <span className="font-medium">{holder.nickname}</span>
                        <Badge variant="warning" className="text-xs">
                          {holder.utakuraiLevel === 'eisei_meijin' ? '永世名歌位' : '名歌位'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text size="sm" color="muted" className="text-center py-4">
                    歌位保持者はまだいません
                  </Text>
                )}
              </Card>

              {/* 伝位 */}
              <Card>
                <Text className="font-bold mb-3">伝位</Text>
                {denHolders.length > 0 ? (
                  <div className="space-y-2">
                    {denHolders.map((holder) => (
                      <div
                        key={holder.uid}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg bg-purple-50 border border-purple-200",
                          holder.uid === user?.uid && "ring-2 ring-karuta-red"
                        )}
                      >
                        <span className="font-medium">{holder.nickname}</span>
                        <Badge variant="secondary" className="text-xs">
                          {holder.denLevel === 'kaiden' ? '皆伝' :
                           holder.denLevel === 'okuden' ? '奥伝' :
                           holder.denLevel === 'chuden' ? '中伝' : '初伝'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text size="sm" color="muted" className="text-center py-4">
                    伝位保持者はまだいません
                  </Text>
                )}
              </Card>

              {/* 段位 */}
              <Card>
                <Text className="font-bold mb-3">段位</Text>
                {danHolders.length > 0 ? (
                  <div className="space-y-2">
                    {danHolders.map((holder) => (
                      <div
                        key={holder.uid}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50 border border-blue-200",
                          holder.uid === user?.uid && "ring-2 ring-karuta-red"
                        )}
                      >
                        <span className="font-medium">{holder.nickname}</span>
                        <Badge variant="info" className="text-xs">
                          {DAN_LEVEL_LABELS[holder.danLevel as DanLevel] || holder.danLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text size="sm" color="muted" className="text-center py-4">
                    段位保持者はまだいません
                  </Text>
                )}
              </Card>

              {/* 最新の昇格結果 */}
              {v2Snapshot && v2Snapshot.promotions.length > 0 && (
                <Card>
                  <Text className="font-bold mb-3">最新の昇格結果（{v2Snapshot.seasonKey}）</Text>
                  <div className="space-y-2">
                    {v2Snapshot.promotions.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 border border-green-200">
                        <span className="font-medium">{p.nickname}</span>
                        <span className="text-sm text-gray-600">
                          {p.fromLevel} → <span className="font-bold text-green-700">{p.toLevel}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
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
