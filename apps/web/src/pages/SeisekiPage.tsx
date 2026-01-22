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
    () => calculateDailyStats(sessions).slice(0, 7),
    [sessions]
  );

  // Find max score for daily chart scaling
  const maxDailyScore = useMemo(
    () => Math.max(...dailyStats.map(d => d.bestScore), 100),
    [dailyStats]
  );

  const formatDate = (dayKeyJst: string) => {
    // dayKeyJst format: YYYY-MM-DD
    const parts = dayKeyJst.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

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

          {/* Daily Chart */}
          {dailyStats.length > 0 && (
            <Card padding="sm">
              <h4 className="text-sm font-medium text-gray-700 mb-3">日別ベストスコア（直近7日）</h4>
              <div className="flex items-end gap-1 h-32">
                {dailyStats.slice().reverse().map((day) => {
                  const height = Math.max((day.bestScore / maxDailyScore) * 100, 5);
                  return (
                    <div key={day.dayKeyJst} className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-gray-600 font-medium mb-1">
                        {day.bestScore}
                      </span>
                      <div
                        className="w-full bg-karuta-gold rounded-t transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-1">
                        {formatDate(day.dayKeyJst)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Kimariji Stats */}
          <Card>
            <Heading as="h3" size="h3" className="mb-4">決まり字別の正答率</Heading>
            <div className="space-y-4">
              {kimarijiStats.map((stat) => {
                const hasData = stat.totalAttempts > 0;
                return (
                  <div key={stat.kimarijiCount}>
                    <div className="flex justify-between items-center mb-1">
                      <Text size="sm" className="text-gray-700">
                        {stat.kimarijiCount}字決まり
                      </Text>
                      <div className="flex items-center gap-2">
                        <Text size="sm" color="muted">
                          ({stat.correctAttempts}/{stat.totalAttempts})
                        </Text>
                        <Text size="sm" className={hasData ? 'font-bold' : 'text-gray-400'}>
                          {hasData ? `${stat.accuracy}%` : '--'}
                        </Text>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          stat.accuracy >= 80 ? 'bg-green-500' :
                          stat.accuracy >= 60 ? 'bg-karuta-gold' :
                          stat.accuracy >= 40 ? 'bg-orange-400' :
                          'bg-red-400'
                        }`}
                        style={{ width: hasData ? `${stat.accuracy}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {kimarijiStats.every(s => s.totalAttempts === 0) && (
              <Text size="sm" color="muted" className="mt-4 text-center">
                決まり字別統計にはより多くの練習データが必要です
              </Text>
            )}
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
