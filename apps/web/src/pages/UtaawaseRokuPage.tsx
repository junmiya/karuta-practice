/**
 * 歌合録ページ - 歌合の記録と分析を表示
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, AuthRequiredState } from '@/components/ui/PageStates';
import { getUserProgress, getUserSessions, type UserSession } from '@/services/utaawase.service';
import {
  KYUI_LEVELS_ORDERED,
  DAN_LEVELS_ORDERED,
  KYUI_LEVEL_LABELS,
  DAN_LEVEL_LABELS,
  KYUI_PROMOTION_CONDITIONS,
  type DenLevel,
  type UtakuraiLevel,
  type UserProgress,
} from '@/types/utaawase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { colors } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'records' | 'analysis';

const DEN_LEVEL_LABELS: Record<DenLevel, string> = {
  shoden: '初伝',
  chuden: '中伝',
  okuden: '奥伝',
  kaiden: '皆伝',
};

const UTAKURAI_LEVEL_LABELS: Record<UtakuraiLevel, string> = {
  meijin: '名人',
  eisei_meijin: '永世名人',
};

const DEN_LEVELS_ORDERED: DenLevel[] = ['shoden', 'chuden', 'okuden', 'kaiden'];

export function UtaawaseRokuPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user progress and sessions
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [userProgress, userSessions] = await Promise.all([
          getUserProgress(user.uid),
          getUserSessions(user.uid),
        ]);
        setProgress(userProgress);
        setSessions(userSessions);
      } catch (err) {
        console.error('[UtaawaseRokuPage] Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Calculate stats from sessions
  const sessionStats = useMemo(() => {
    const confirmed = sessions.filter(s => s.status === 'confirmed');
    const totalMatches = confirmed.length;
    const avgScore = totalMatches > 0
      ? Math.round(confirmed.reduce((sum, s) => sum + (s.score || 0), 0) / totalMatches)
      : 0;
    const avgCorrect = totalMatches > 0
      ? Math.round(confirmed.reduce((sum, s) => sum + (s.correctCount || 0), 0) / totalMatches * 10) / 10
      : 0;
    const bestScore = Math.max(...confirmed.map(s => s.score || 0), 0);

    return { totalMatches, avgScore, avgCorrect, bestScore };
  }, [sessions]);

  // Prepare season data for chart
  const seasonChartData = useMemo(() => {
    if (!progress?.seasonScores) return [];
    return Object.entries(progress.seasonScores)
      .map(([key, value]) => ({
        season: key.replace('_', '\n'),
        bestThree: value.bestThreeTotal,
        matchCount: value.scores.length,
      }))
      .slice(-8); // Last 8 seasons
  }, [progress]);

  // Get current level info
  const getLevelInfo = () => {
    if (!progress) {
      return {
        kyui: null,
        dan: null,
        den: null,
        utakurai: null,
        nextCondition: KYUI_PROMOTION_CONDITIONS.beginner,
      };
    }

    const kyui = progress.kyuiLevel;
    const dan = progress.danLevel;
    const den = progress.denLevel;
    const utakurai = progress.utakuraiLevel;

    // Get next level condition
    let nextCondition: string | null = null;
    if (kyui && kyui !== 'rokkyu') {
      nextCondition = KYUI_PROMOTION_CONDITIONS[kyui];
    } else if (dan && dan !== 'rokudan') {
      const danIndex = DAN_LEVELS_ORDERED.indexOf(dan);
      const nextDan = DAN_LEVELS_ORDERED[danIndex + 1];
      if (nextDan) {
        nextCondition = `${DAN_LEVEL_LABELS[nextDan]}へ: 公式戦${(danIndex + 2) * 5}勝`;
      }
    }

    return { kyui, dan, den, utakurai, nextCondition };
  };

  const levelInfo = getLevelInfo();

  // Render level stars
  const renderLevelStars = (
    currentLevel: string | null,
    orderedLevels: readonly string[],
    labels: Record<string, string>
  ) => {
    if (!currentLevel) return null;
    const currentIndex = orderedLevels.indexOf(currentLevel);

    return (
      <div className="flex items-center gap-1">
        {orderedLevels.map((_, i) => (
          <span
            key={i}
            className={cn(
              "text-lg",
              i <= currentIndex ? "text-yellow-500" : "text-gray-300"
            )}
          >
            {i <= currentIndex ? '★' : '☆'}
          </span>
        ))}
        <span className="ml-2 font-medium">({labels[currentLevel] || currentLevel})</span>
      </div>
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '概要' },
    { key: 'records', label: '記録' },
    { key: 'analysis', label: '分析' },
  ];

  if (!isAuthenticated || !isProfileComplete) {
    return (
      <div className="karuta-container py-2">
        <AuthRequiredState message="歌合録を閲覧するにはログインとプロフィール設定が必要です" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="karuta-container py-2">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Tab Navigation */}
      <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 px-3 text-sm font-medium transition-colors"
            style={
              activeTab === tab.key
                ? { backgroundColor: '#196AAB', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#4b5563' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Current Level Display */}
          <Card>
            <Text className="font-bold mb-3 text-gray-700">現在のレベル</Text>

            {/* 級位 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">級位</span>
                {levelInfo.kyui === 'rokkyu' && (
                  <Badge variant="success" className="text-xs">達成</Badge>
                )}
              </div>
              {levelInfo.kyui ? (
                renderLevelStars(levelInfo.kyui, KYUI_LEVELS_ORDERED, KYUI_LEVEL_LABELS)
              ) : (
                <Text size="sm" color="muted">未取得</Text>
              )}
              {levelInfo.kyui && levelInfo.kyui !== 'rokkyu' && levelInfo.nextCondition && (
                <Text size="sm" color="muted" className="mt-1">
                  → {levelInfo.nextCondition}
                </Text>
              )}
            </div>

            {/* 段位 */}
            <div className="mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">段位</span>
                {levelInfo.dan === 'rokudan' && (
                  <Badge variant="success" className="text-xs">達成</Badge>
                )}
              </div>
              {levelInfo.dan ? (
                renderLevelStars(levelInfo.dan, DAN_LEVELS_ORDERED, DAN_LEVEL_LABELS)
              ) : progress?.danEligible ? (
                <Text size="sm" color="muted">資格あり（未取得）</Text>
              ) : (
                <Text size="sm" color="muted">ー（六級達成で取得可能）</Text>
              )}
            </div>

            {/* 伝位 */}
            <div className="mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">伝位</span>
                {levelInfo.den === 'kaiden' && (
                  <Badge variant="success" className="text-xs">達成</Badge>
                )}
              </div>
              {levelInfo.den ? (
                renderLevelStars(levelInfo.den, DEN_LEVELS_ORDERED, DEN_LEVEL_LABELS)
              ) : progress?.denEligible ? (
                <Text size="sm" color="muted">資格あり（未取得）</Text>
              ) : (
                <Text size="sm" color="muted">ー（六段達成で取得可能）</Text>
              )}
            </div>

            {/* 歌位 */}
            <div className="pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">歌位</span>
              {levelInfo.utakurai ? (
                <div className="mt-1">
                  <Badge
                    variant="warning"
                    className="text-sm px-3 py-1"
                  >
                    {UTAKURAI_LEVEL_LABELS[levelInfo.utakurai]}
                  </Badge>
                </div>
              ) : (
                <Text size="sm" color="muted" className="mt-1">
                  ー（皆伝達成で取得可能）
                </Text>
              )}
            </div>
          </Card>

          {/* Overall Stats */}
          <Card>
            <Text className="font-bold mb-3 text-gray-700">通算成績</Text>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-karuta-tansei">
                  {progress?.officialWinCount || 0}
                </div>
                <div className="text-xs text-gray-500">公式戦勝利</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-karuta-gold">
                  {progress?.championCount || 0}
                </div>
                <div className="text-xs text-gray-500">優勝回数</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {progress?.totalOfficialMatches || sessionStats.totalMatches}
                </div>
                <div className="text-xs text-gray-500">公式戦参加</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessionStats.bestScore}
                </div>
                <div className="text-xs text-gray-500">最高スコア</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <Text size="sm" color="muted">公式歌合に挑戦しよう</Text>
              <Button onClick={() => navigate('/utaawase')} size="sm">
                歌合へ
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-3">
          {/* Session Summary */}
          <div className="grid grid-cols-4 gap-2 bg-white/90 border border-gray-200 rounded-lg p-2">
            <div className="text-center">
              <div className="text-lg font-bold text-karuta-tansei">{sessionStats.totalMatches}</div>
              <div className="text-xs text-gray-400">試合</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-karuta-gold">{sessionStats.avgScore}</div>
              <div className="text-xs text-gray-400">平均点</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{sessionStats.avgCorrect}</div>
              <div className="text-xs text-gray-400">平均正答</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{sessionStats.bestScore}</div>
              <div className="text-xs text-gray-400">最高</div>
            </div>
          </div>

          {/* Session History */}
          <Card>
            <Text className="font-bold mb-3 text-gray-700">競技履歴</Text>
            {sessions.length === 0 ? (
              <div className="text-center py-6">
                <Text color="muted">競技履歴がありません</Text>
                <Button
                  onClick={() => navigate('/utaawase')}
                  size="sm"
                  className="mt-3"
                >
                  初めての歌合へ
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">日付</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">スコア</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">正答</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600 hidden sm:table-cell">時間</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-600">結果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 20).map((session) => (
                      <tr key={session.sessionId} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-600">
                          {session.startedAt.toLocaleDateString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-karuta-gold">
                          {session.score || '-'}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {session.correctCount !== undefined ? `${session.correctCount}/50` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-600 hidden sm:table-cell">
                          {session.totalElapsedMs
                            ? `${Math.round(session.totalElapsedMs / 1000)}秒`
                            : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant={
                              session.status === 'confirmed' ? 'success' :
                              session.status === 'invalid' ? 'danger' :
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {session.status === 'confirmed' ? '確定' :
                             session.status === 'invalid' ? '無効' :
                             session.status === 'submitted' ? '審査中' :
                             session.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Season Scores */}
          {progress?.seasonScores && Object.keys(progress.seasonScores).length > 0 && (
            <Card>
              <Text className="font-bold mb-3 text-gray-700">シーズン別集計</Text>
              <div className="space-y-2">
                {Object.entries(progress.seasonScores)
                  .slice(-5)
                  .reverse()
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium">{key.replace('_', ' ')}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {value.scores.length}試合
                        </span>
                        <span className="font-bold text-karuta-tansei">
                          Best3: {value.bestThreeTotal}点
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-3">
          {/* Level Progress Visualization */}
          <Card>
            <Text className="font-bold mb-3 text-gray-700">レベル進捗</Text>
            <div className="space-y-4">
              {/* Progress bars */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">級位</span>
                  <span className="text-xs text-gray-500">
                    {levelInfo.kyui ? KYUI_LEVEL_LABELS[levelInfo.kyui] : '未取得'}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                    style={{
                      width: `${levelInfo.kyui
                        ? ((KYUI_LEVELS_ORDERED.indexOf(levelInfo.kyui) + 1) / KYUI_LEVELS_ORDERED.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">段位</span>
                  <span className="text-xs text-gray-500">
                    {levelInfo.dan ? DAN_LEVEL_LABELS[levelInfo.dan] : 'ー'}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
                    style={{
                      width: `${levelInfo.dan
                        ? ((DAN_LEVELS_ORDERED.indexOf(levelInfo.dan) + 1) / DAN_LEVELS_ORDERED.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">伝位</span>
                  <span className="text-xs text-gray-500">
                    {levelInfo.den ? DEN_LEVEL_LABELS[levelInfo.den] : 'ー'}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                    style={{
                      width: `${levelInfo.den
                        ? ((DEN_LEVELS_ORDERED.indexOf(levelInfo.den) + 1) / DEN_LEVELS_ORDERED.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              {levelInfo.utakurai && (
                <div className="pt-2 border-t border-gray-100 text-center">
                  <Badge variant="warning" className="text-sm px-4 py-1">
                    {UTAKURAI_LEVEL_LABELS[levelInfo.utakurai]}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {/* Season Score Chart */}
          {seasonChartData.length > 0 && (
            <Card>
              <Text className="font-bold mb-3 text-gray-700">シーズン推移（Best3合計）</Text>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={seasonChartData}
                    margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="season"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: colors.gray300 }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 8,
                      }}
                      formatter={(value, _name, props) => {
                        const payload = props.payload as { matchCount: number };
                        return [`${value}点 (${payload.matchCount}試合)`, 'Best3'];
                      }}
                    />
                    <Bar dataKey="bestThree" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {seasonChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors.tansei} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Level Roadmap */}
          <Card>
            <Text className="font-bold mb-3 text-gray-700">昇級・昇段ロードマップ</Text>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">●</span>
                <div>
                  <span className="font-medium">級位</span>
                  <span className="text-gray-500 ml-2">
                    見習 → 初級 → 二級 → 三級 → 四級 → 五級
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">●</span>
                <div>
                  <span className="font-medium">段位</span>
                  <span className="text-gray-400 ml-2">（六級達成後）</span>
                  <span className="text-gray-500 ml-1">
                    初段 → 二段 → 三段 → 四段 → 五段 → 六段
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">●</span>
                <div>
                  <span className="font-medium">伝位</span>
                  <span className="text-gray-400 ml-2">（六段達成後）</span>
                  <span className="text-gray-500 ml-1">
                    初伝 → 中伝 → 奥伝 → 皆伝
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">●</span>
                <div>
                  <span className="font-medium">歌位</span>
                  <span className="text-gray-400 ml-2">（皆伝達成後）</span>
                  <span className="text-gray-500 ml-1">
                    名人 → 永世名人
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* No data message */}
          {sessions.length === 0 && (
            <Card padding="sm" className="bg-blue-50 border-blue-200">
              <div className="text-center py-4">
                <Text color="muted" className="mb-3">
                  まだ分析データがありません
                </Text>
                <Button onClick={() => navigate('/utaawase')} size="sm">
                  歌合に挑戦
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
