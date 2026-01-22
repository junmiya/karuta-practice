import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { LoadingState, ErrorState, EmptyState, AuthRequiredState } from '@/components/ui/PageStates';
import {
  getUserConfirmedSessions,
  calculateOverallStats,
  calculateDailyStats,
  calculateKimarijiStats,
  type SessionStats,
  type OverallStats,
  type DailyStats,
  type KimarijiStats,
} from '@/services/stats.service';
import { getAllPoems } from '@/services/poems.service';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Cell,
} from 'recharts';
import { colors } from '@/lib/design-tokens';

export function SeisekiPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();

  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [kimarijiStats, setKimarijiStats] = useState<KimarijiStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch poems and sessions
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [poemsData, sessionsData] = await Promise.all([
          getAllPoems(),
          getUserConfirmedSessions(user.uid),
        ]);
        setSessions(sessionsData);

        // Calculate kimariji stats if we have sessions
        if (sessionsData.length > 0) {
          const poemsMap = new Map(
            poemsData.map(p => [p.poemId, { kimarijiCount: p.kimarijiCount }])
          );
          const kimStats = await calculateKimarijiStats(
            sessionsData.map(s => s.sessionId),
            poemsMap
          );
          setKimarijiStats(kimStats);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Calculate derived stats
  const overallStats: OverallStats = useMemo(
    () => calculateOverallStats(sessions),
    [sessions]
  );

  const dailyStats: DailyStats[] = useMemo(
    () => calculateDailyStats(sessions).slice(0, 14),
    [sessions]
  );

  // Prepare chart data with formatted dates and accuracy
  const dailyChartData = useMemo(() => {
    return dailyStats.slice().reverse().map((day) => {
      const accuracy = day.totalQuestions > 0
        ? Math.round((day.totalCorrect / day.totalQuestions) * 100)
        : 0;
      const parts = day.dayKeyJst.split('-');
      return {
        date: `${parts[1]}/${parts[2]}`,
        bestScore: day.bestScore,
        accuracy,
        sessions: day.sessionCount,
      };
    });
  }, [dailyStats]);

  const formatDate = (dayKeyJst: string) => {
    // dayKeyJst format: YYYY-MM-DD
    const parts = dayKeyJst.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  // Prepare kimariji chart data
  const kimarijiChartData = useMemo(() => {
    return kimarijiStats.map((stat) => ({
      name: `${stat.kimarijiCount}字`,
      accuracy: stat.accuracy,
      attempts: stat.totalAttempts,
    }));
  }, [kimarijiStats]);

  return (
    <Container className="space-y-2">
      {!isAuthenticated || !isProfileComplete ? (
        <AuthRequiredState message="成績を記録・閲覧するにはログインとプロフィール設定が必要です" />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : sessions.length === 0 ? (
        <EmptyState
          message="公式競技の記録がありません。競技に参加して成績を記録しましょう。"
          actionLabel="競技に参加する"
          actionPath="/entry"
        />
      ) : (
        <>
          {/* Summary Stats - 1行 */}
          <div className="flex items-center justify-between bg-white/90 border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-karuta-red">{overallStats.totalSessions}</span>
              <span className="text-xs text-gray-400">回</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-karuta-gold">
                {overallStats.totalQuestions > 0
                  ? Math.round((overallStats.totalCorrect / overallStats.totalQuestions) * 100)
                  : 0}%
              </span>
              <span className="text-xs text-gray-400">正答</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-600">{overallStats.avgResponseMs}</span>
              <span className="text-xs text-gray-400">ms</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-green-600">{overallStats.bestScore}</span>
              <span className="text-xs text-gray-400">点</span>
            </div>
          </div>

          {/* Daily Chart - Score & Accuracy Trends */}
          {dailyChartData.length > 0 && (
            <Card padding="sm">
              <h4 className="text-sm font-medium text-gray-700 mb-3">日別推移（直近14日）</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: colors.gray300 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 'auto']}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 8,
                      }}
                      formatter={(value, name) => {
                        if (name === 'accuracy') return [`${value}%`, '正答率'];
                        if (name === 'bestScore') return [value, 'ベストスコア'];
                        return [value, String(name)];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={24}
                      formatter={(value) => {
                        if (value === 'bestScore') return 'スコア';
                        if (value === 'accuracy') return '正答率';
                        return value;
                      }}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="bestScore"
                      fill={colors.accent}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      stroke={colors.tansei}
                      strokeWidth={2}
                      dot={{ fill: colors.tansei, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: colors.tansei }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Kimariji Stats - Horizontal Bar Chart */}
          <Card>
            <Heading as="h3" size="h3" className="mb-4">決まり字別の正答率</Heading>
            {kimarijiStats.every(s => s.totalAttempts === 0) ? (
              <Text size="sm" color="muted" className="text-center py-4">
                決まり字別統計にはより多くの練習データが必要です
              </Text>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kimarijiChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: colors.gray300 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 8,
                      }}
                      formatter={(value, _name, props) => {
                        const attempts = (props.payload as { attempts: number }).attempts;
                        return [`${value}% (${attempts}問)`, '正答率'];
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {kimarijiChartData.map((entry, index) => {
                        const fillColor =
                          entry.accuracy >= 80 ? colors.success :
                          entry.accuracy >= 60 ? colors.accent :
                          entry.accuracy >= 40 ? '#fb923c' :
                          colors.red;
                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend for color coding */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.success }} />
                <span>80%+</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.accent }} />
                <span>60-79%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fb923c' }} />
                <span>40-59%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.red }} />
                <span>&lt;40%</span>
              </div>
            </div>
          </Card>

          {/* Recent Records */}
          <Card>
            <Heading as="h3" size="h3" className="mb-4">最近の提出記録</Heading>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">日付</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">スコア</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">正答</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">平均時間</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((session) => (
                    <tr key={session.sessionId} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-gray-700">
                        {formatDate(session.dayKeyJst)}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-karuta-gold">
                        {session.score}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {session.correctCount}/50
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">
                        {session.avgMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              onClick={() => navigate('/entry')}
              className="w-full mt-4"
            >
              公式競技に挑戦
            </Button>
          </Card>
        </>
      )}
    </Container>
  );
}
