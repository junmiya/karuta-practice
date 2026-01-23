import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, AuthRequiredState } from '@/components/ui/PageStates';
import {
  calculateAllPracticeStats,
  generateWeakPoemAnalysisPrompt,
  type AllPracticeStats,
  type PoemStatsData,
} from '@/services/practiceStats.service';
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
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'kimariji' | 'weak' | 'all';

export function SeisekiPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<AllPracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoemForAI, setSelectedPoemForAI] = useState<PoemStatsData | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [kimarijiFilter, setKimarijiFilter] = useState<number | null>(null);

  // Fetch poems and practice stats
  useEffect(() => {
    async function fetchData() {
      console.log('[SeisekiPage] fetchData called, user:', user?.uid);
      if (!user) {
        console.log('[SeisekiPage] No user, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[SeisekiPage] Fetching poems...');
        const poemsData = await getAllPoems();
        console.log('[SeisekiPage] Got', poemsData.length, 'poems');

        // Create poems map for stats calculation
        const poemsMap = new Map(
          poemsData.map(p => [p.poemId, {
            poemId: p.poemId,
            poemNumber: p.order,
            kimarijiCount: p.kimarijiCount,
            kimariji: p.kimariji,
            yomi: p.yomi,
            tori: p.tori,
            author: p.author,
          }])
        );

        console.log('[SeisekiPage] Calculating practice stats...');
        const practiceStats = await calculateAllPracticeStats(user.uid, poemsMap);
        console.log('[SeisekiPage] Got practice stats:', practiceStats.overall.totalSessions, 'sessions');
        setStats(practiceStats);
      } catch (err) {
        console.error('[SeisekiPage] Failed to fetch stats:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Prepare daily chart data
  const dailyChartData = useMemo(() => {
    if (!stats) return [];
    return stats.overall.dailyStats.slice().reverse().map((day) => {
      const parts = day.date.split('-');
      return {
        date: `${parts[1]}/${parts[2]}`,
        questions: day.questions,
        accuracy: day.accuracy,
        sessions: day.sessions,
      };
    });
  }, [stats]);

  // Prepare kimariji chart data
  const kimarijiChartData = useMemo(() => {
    if (!stats) return [];
    return stats.byKimariji
      .filter(s => s.totalAttempts > 0)
      .map((stat) => ({
        name: `${stat.kimarijiCount}字`,
        kimarijiCount: stat.kimarijiCount,
        accuracy: stat.accuracy,
        attempts: stat.totalAttempts,
        poemCount: stat.poemCount,
      }));
  }, [stats]);

  // Filter poems by kimariji
  const filteredPoems = useMemo(() => {
    if (!stats) return [];
    if (kimarijiFilter === null) return stats.byPoem;
    return stats.byPoem.filter(p => p.kimarijiCount === kimarijiFilter);
  }, [stats, kimarijiFilter]);

  // Handle AI analysis request
  const handleRequestAIAnalysis = (poem: PoemStatsData) => {
    setSelectedPoemForAI(poem);
    setAiPrompt(generateWeakPoemAnalysisPrompt(poem));
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '概要' },
    { key: 'kimariji', label: '決まり字' },
    { key: 'weak', label: '苦手札' },
    { key: 'all', label: '全札' },
  ];

  if (!isAuthenticated || !isProfileComplete) {
    return (
      <div className="karuta-container py-2">
        <AuthRequiredState message="成績を記録・閲覧するにはログインとプロフィール設定が必要です" />
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

  if (error) {
    return (
      <div className="karuta-container py-2">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const hasData = stats && stats.overall.totalSessions > 0;

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

      {!hasData ? (
        <Card className="text-center py-8">
          <Text color="muted" className="mb-4">
            練習データがありません。練習してデータを蓄積しましょう。
          </Text>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/practice')}>
              練習する
            </Button>
            <Button onClick={() => navigate('/practice12')} variant="secondary">
              研鑽する
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-2">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/90 border border-gray-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                  <span className="text-lg font-bold text-karuta-tansei">{stats!.overall.totalSessions}</span>
                  <span className="text-xs text-gray-400">回</span>
                </div>
                <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                  <span className="text-lg font-bold text-karuta-gold">{stats!.overall.accuracy}%</span>
                  <span className="text-xs text-gray-400">正答</span>
                </div>
                <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                  <span className="text-lg font-bold text-gray-600">{stats!.overall.avgResponseMs}</span>
                  <span className="text-xs text-gray-400">ms</span>
                </div>
                <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                  <span className="text-lg font-bold text-green-600">{stats!.overall.totalQuestions}</span>
                  <span className="text-xs text-gray-400">問</span>
                </div>
              </div>

              {/* Daily Chart */}
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
                            if (name === 'questions') return [value, '問題数'];
                            return [value, String(name)];
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={24}
                          formatter={(value) => {
                            if (value === 'questions') return '問題数';
                            if (value === 'accuracy') return '正答率';
                            return value;
                          }}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="questions"
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

              {/* Quick Stats Grid */}
              <Card padding="sm">
                <h4 className="text-sm font-medium text-gray-700 mb-2">クイック情報</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">苦手札</span>
                    <span className="font-medium">{stats!.weakPoems.length}首</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">挑戦した札</span>
                    <span className="font-medium">{stats!.byPoem.length}/100首</span>
                  </div>
                  {stats!.overall.lastPracticeAt && (
                    <div className="col-span-2 flex justify-between">
                      <span className="text-gray-500">最終練習</span>
                      <span className="font-medium">
                        {stats!.overall.lastPracticeAt.toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Kimariji Tab */}
          {activeTab === 'kimariji' && (
            <div className="space-y-2">
              <Card padding="sm">
                <h4 className="text-sm font-medium text-gray-700 mb-3">決まり字別正答率</h4>
                {kimarijiChartData.length === 0 ? (
                  <Text size="sm" color="muted" className="text-center py-4">
                    まだ十分なデータがありません
                  </Text>
                ) : (
                  <div className="h-56">
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
                            const payload = props.payload as { attempts: number; poemCount: number };
                            return [`${value}% (${payload.attempts}問 / ${payload.poemCount}首)`, '正答率'];
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
                {/* Legend */}
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

              {/* Kimariji Stats Detail */}
              <Card padding="sm">
                <h4 className="text-sm font-medium text-gray-700 mb-2">決まり字詳細</h4>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-600">決まり字</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">札数</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">挑戦</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">正答率</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">平均</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats!.byKimariji.map((ks) => (
                        <tr key={ks.kimarijiCount} className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium">{ks.kimarijiCount}字決まり</td>
                          <td className="py-2 px-2 text-right">{ks.poemCount}首</td>
                          <td className="py-2 px-2 text-right">{ks.totalAttempts}問</td>
                          <td className="py-2 px-2 text-right">
                            <span className={cn(
                              "font-bold",
                              ks.accuracy >= 80 ? "text-green-600" :
                              ks.accuracy >= 60 ? "text-blue-600" :
                              ks.accuracy >= 40 ? "text-orange-500" :
                              "text-red-500"
                            )}>
                              {ks.totalAttempts > 0 ? `${ks.accuracy}%` : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {ks.totalAttempts > 0 ? `${ks.avgResponseMs}ms` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Weak Cards Tab */}
          {activeTab === 'weak' && (
            <div className="space-y-2">
              <Card padding="sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">苦手札（正答率の低い順）</h4>
                  <Badge variant="warning">{stats!.weakPoems.length}首</Badge>
                </div>
                {stats!.weakPoems.length === 0 ? (
                  <div className="text-center py-6">
                    <Text color="muted">3回以上挑戦した札がまだありません</Text>
                    <Text size="sm" color="muted" className="mt-1">
                      練習を続けると苦手札が特定されます
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats!.weakPoems.slice(0, 10).map((poem) => (
                      <div
                        key={poem.poemId}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={poem.accuracy < 40 ? "danger" : "warning"} className="text-xs">
                                {poem.accuracy}%
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {poem.poemNumber}番 / {poem.kimarijiCount}字「{poem.kimariji}」
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 truncate">{poem.yomi}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {poem.correctAttempts}/{poem.totalAttempts}回正解 ・ 平均{poem.avgResponseMs}ms
                            </p>
                          </div>
                          <button
                            onClick={() => handleRequestAIAnalysis(poem)}
                            className="ml-2 p-2 text-karuta-tansei hover:bg-karuta-tansei/10 rounded-lg transition-colors"
                            title="AIアドバイス"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* AI Analysis Modal */}
              {aiPrompt && selectedPoemForAI && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="max-w-lg w-full max-h-[80vh] overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <Heading as="h3" size="h3">AIアドバイス</Heading>
                      <button
                        onClick={() => { setAiPrompt(null); setSelectedPoemForAI(null); }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">
                        {selectedPoemForAI.poemNumber}番「{selectedPoemForAI.kimariji}」
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{selectedPoemForAI.yomi}</p>
                    </div>
                    <div className="mb-4">
                      <Text size="sm" color="muted" className="mb-2">
                        以下のプロンプトをAIアシスタントにコピーして貼り付けてください：
                      </Text>
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                          {aiPrompt}
                        </pre>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(aiPrompt);
                      }}
                      className="w-full"
                    >
                      コピー
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* All Cards Tab */}
          {activeTab === 'all' && (
            <div className="space-y-2">
              {/* Kimariji Filter */}
              <div className="flex gap-1 flex-wrap bg-white border border-gray-200 rounded-lg p-2">
                <button
                  onClick={() => setKimarijiFilter(null)}
                  className="px-3 py-1 text-xs rounded-full transition-colors"
                  style={
                    kimarijiFilter === null
                      ? { backgroundColor: '#196AAB', color: '#ffffff' }
                      : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                  }
                >
                  全て
                </button>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setKimarijiFilter(n)}
                    className="px-3 py-1 text-xs rounded-full transition-colors"
                    style={
                      kimarijiFilter === n
                        ? { backgroundColor: '#196AAB', color: '#ffffff' }
                        : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                    }
                  >
                    {n}字
                  </button>
                ))}
              </div>

              {/* Card Stats */}
              <Card padding="sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    札別成績 {kimarijiFilter && `(${kimarijiFilter}字決まり)`}
                  </h4>
                  <span className="text-xs text-gray-400">{filteredPoems.length}首</span>
                </div>
                {filteredPoems.length === 0 ? (
                  <Text size="sm" color="muted" className="text-center py-4">
                    この条件に該当するデータがありません
                  </Text>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-600">No.</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-600">決まり字</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-600">挑戦</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-600">正答率</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-600 hidden sm:table-cell">平均</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPoems.map((poem) => (
                          <tr key={poem.poemId} className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-600">{poem.poemNumber}</td>
                            <td className="py-2 px-2">
                              <span className="font-medium">{poem.kimariji}</span>
                              <span className="text-xs text-gray-400 ml-1">({poem.kimarijiCount}字)</span>
                            </td>
                            <td className="py-2 px-2 text-right">{poem.totalAttempts}</td>
                            <td className="py-2 px-2 text-right">
                              <span className={cn(
                                "font-bold",
                                poem.accuracy >= 80 ? "text-green-600" :
                                poem.accuracy >= 60 ? "text-blue-600" :
                                poem.accuracy >= 40 ? "text-orange-500" :
                                "text-red-500"
                              )}>
                                {poem.accuracy}%
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right text-gray-600 hidden sm:table-cell">
                              {poem.avgResponseMs}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Practice CTA */}
          <Card padding="sm" className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <Text size="sm" color="muted">データを蓄積して分析精度を上げましょう</Text>
              <Button onClick={() => navigate('/practice')} size="sm">
                練習する
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
