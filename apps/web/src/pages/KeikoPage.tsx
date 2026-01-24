/**
 * 稽古ページ（成績分析）
 *
 * - 練習記録の表示
 * - 決まり字別正答率
 * - 日別統計
 * - 苦手札分析
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getUserStatsAnalysis,
  type UserStatsAnalysis,
  type KimarijiStats,
} from '@/services/stats.service';
import { getActiveSeasonStage1 } from '@/services/stage1.service';
import { getAllPoems, getPoemCountByKimariji } from '@/services/poems.service';
import { PoemDetailModal } from '@/components/PoemDetailModal';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, InfoBox } from '@/components/ui/PageStates';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { cn } from '@/lib/utils';
import { getAccuracyColor, getAccuracyTextColor } from '@/utils/karuta';
import type { Season } from '@/types/entry';
import type { Poem } from '@/types/poem';

type TabType = 'overview' | 'kimariji' | 'daily' | 'weak';

export function KeikoPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<UserStatsAnalysis | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);

  // 決まり字・札範囲選択（練習モード用）
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  // 選択中の首数を計算（両フィルタの交差を考慮した概算）
  const selectedPoemCount = useMemo(() => {
    let count = 100;
    if (selectedKimariji.length > 0) {
      count = selectedKimariji.reduce((sum, k) => sum + (poemCounts[k] || 0), 0);
    }
    if (selectedPoemRange.length > 0) {
      const rangeCount = selectedPoemRange.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      // 両方選択時は小さい方を表示（実際のフィルタ結果は異なる場合あり）
      if (selectedKimariji.length > 0) {
        count = Math.min(count, rangeCount);
      } else {
        count = rangeCount;
      }
    }
    return count;
  }, [selectedKimariji, selectedPoemRange, poemCounts]);

  const startPractice = () => {
    const params = new URLSearchParams();
    if (selectedKimariji.length > 0) {
      params.set('kimariji', selectedKimariji.join(','));
    }
    if (selectedPoemRange.length > 0) {
      params.set('range', selectedPoemRange.map(r => `${r.start}-${r.end}`).join(','));
    }
    const query = params.toString();
    navigate(query ? `/practice?${query}` : '/practice');
  };

  // 歌データをMapに変換（決まり字数取得用）- 統計計算で使用
  const poemsMap = useMemo(() => {
    const map = new Map<string, { kimarijiCount: number }>();
    for (const poem of poems) {
      map.set(poem.poemId, { kimarijiCount: poem.kimarijiCount });
    }
    return map;
  }, [poems]);

  // poemsMap is used in loadData below
  void poemsMap;

  // 歌IDから歌情報を取得
  const getPoemInfo = (poemId: string) => {
    return poems.find((p) => p.poemId === poemId);
  };

  // データ読み込み
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 歌データを読み込み
        const poemsData = await getAllPoems();
        setPoems(poemsData);

        // シーズンを取得
        const activeSeason = await getActiveSeasonStage1();
        setSeason(activeSeason);

        // 歌データをMapに変換
        const poemsDataMap = new Map<string, { kimarijiCount: number }>();
        for (const poem of poemsData) {
          poemsDataMap.set(poem.poemId, { kimarijiCount: poem.kimarijiCount });
        }

        // 成績分析を取得
        const analysis = await getUserStatsAnalysis(
          user.uid,
          poemsDataMap,
          activeSeason?.seasonId
        );
        setStats(analysis);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError('成績データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // モード選択カード - 3行レイアウト
  const ModeSelectionCard = () => (
    <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
      {/* Line 1: Mode buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={startPractice}
          className="py-2 px-3 bg-red-50 border border-karuta-red/30 rounded-lg hover:bg-red-100 transition-colors text-left"
        >
          <div className="text-sm font-bold text-karuta-red">練習</div>
          <div className="text-xs text-gray-500">10問・8択・{selectedPoemCount}首</div>
        </button>
        <button
          onClick={() => navigate('/practice12')}
          className="py-2 px-3 bg-amber-50 border border-karuta-accent/30 rounded-lg hover:bg-amber-100 transition-colors text-left"
        >
          <div className="text-sm font-bold text-karuta-accent">研鑽</div>
          <div className="text-xs text-gray-500">無制限・12枚実戦</div>
        </button>
      </div>

      {/* Line 2: Kimariji */}
      <KimarijiSelector
        selected={selectedKimariji}
        onChange={setSelectedKimariji}
        compact
      />

      {/* Line 3: Poem Range */}
      <PoemRangeSelector
        selected={selectedPoemRange}
        onChange={setSelectedPoemRange}
        compact
      />
    </div>
  );

  // 未ログイン時の表示
  if (!isAuthenticated || !isProfileComplete) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <ModeSelectionCard />
        <div className="text-center py-3 text-sm text-gray-500">
          <span>成績分析には</span>
          <button
            onClick={() => navigate('/profile')}
            className="text-karuta-tansei hover:underline mx-1"
          >
            ログイン
          </button>
          <span>が必要です</span>
        </div>
      </div>
    );
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <ModeSelectionCard />
        <LoadingState message="読み込み中..." />
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <ModeSelectionCard />
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // データなしの表示
  if (!stats || stats.overall.totalSessions === 0) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <ModeSelectionCard />
        <div className="text-center py-4 text-sm text-gray-500">
          <p>公式競技を完了すると成績分析が表示されます</p>
          <button
            onClick={() => navigate('/entry')}
            className="text-karuta-tansei hover:underline mt-2"
          >
            公式競技に挑戦 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* 研鑽メニュー */}
      <ModeSelectionCard />

      {/* 成績分析 */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2">
        {/* タブ - 1行 */}
        <div className="flex items-center gap-1 mb-2 pb-2 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded p-0.5">
            {[
              { id: 'overview', label: '概要' },
              { id: 'kimariji', label: '決まり字' },
              { id: 'daily', label: '日別' },
              { id: 'weak', label: '苦手' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-karuta-tansei shadow-sm"
                    : "text-gray-600"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {season?.name || ''}
          </span>
        </div>

        <div>
          {/* 概要タブ */}
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} />
          )}

          {/* 決まり字別タブ */}
          {activeTab === 'kimariji' && (
            <KimarijiTab stats={stats.byKimariji} />
          )}

          {/* 日別推移タブ */}
          {activeTab === 'daily' && (
            <DailyTab stats={stats} />
          )}

          {/* 苦手札タブ */}
          {activeTab === 'weak' && (
            <WeakPoemsTab
              stats={stats}
              getPoemInfo={getPoemInfo}
              onSelectPoem={setSelectedPoem}
            />
          )}
        </div>
      </div>

      {selectedPoem && (
        <PoemDetailModal
          poem={selectedPoem}
          onClose={() => setSelectedPoem(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// 概要タブ
// =============================================================================

function OverviewTab({ stats }: { stats: UserStatsAnalysis }) {
  const { overall, recentSessions } = stats;

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="ベストスコア"
          value={overall.bestScore.toLocaleString()}
          highlight
        />
        <StatCard
          label="平均スコア"
          value={overall.avgScore.toLocaleString()}
        />
        <StatCard
          label="正答率"
          value={`${Math.round((overall.totalCorrect / overall.totalQuestions) * 100)}%`}
        />
        <StatCard
          label="確定セッション"
          value={overall.confirmedSessions.toString()}
        />
      </div>

      {/* 追加統計 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="平均解答時間"
          value={`${overall.avgResponseMs}ms`}
          small
        />
        <StatCard
          label="スコア標準偏差"
          value={overall.scoreStdDev.toString()}
          small
        />
        <StatCard
          label="スコア分散"
          value={overall.scoreVariance.toLocaleString()}
          small
        />
      </div>

      {/* 最近のセッション */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <Heading as="h4" size="h4" className="text-base">最近の記録</Heading>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="text-left py-2 px-4 font-medium text-gray-500">日付</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">スコア</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">正答</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">平均時間</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session) => (
                <tr key={session.sessionId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2 px-4">{session.dayKeyJst}</td>
                  <td className="py-2 px-4 text-right font-bold text-karuta-accent">
                    {session.score.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right">{session.correctCount}/50</td>
                  <td className="py-2 px-4 text-right text-gray-600">
                    {session.avgMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 決まり字別タブ
// =============================================================================

function KimarijiTab({ stats }: { stats: KimarijiStats[] }) {
  const kimarijiLabels = ['一字', '二字', '三字', '四字', '五字', '六字'];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.kimarijiCount} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {kimarijiLabels[stat.kimarijiCount - 1]}決まり
              </span>
              <span className="text-gray-600">
                {stat.correctAttempts}/{stat.totalAttempts} ({stat.accuracy}%)
              </span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${getAccuracyColor(stat.accuracy)}`}
                style={{ width: `${stat.accuracy}%` }}
              />
            </div>
            {stat.totalAttempts > 0 && (
              <p className="text-xs text-gray-500">
                平均解答時間: {stat.avgResponseMs}ms
              </p>
            )}
          </div>
        ))}
      </div>

      <InfoBox title="決まり字について" variant="info">
        <ul className="space-y-1 pl-4 list-disc">
          <li>一字決まり: 7首（む、す、め、ふ、さ、ほ、せ）</li>
          <li>二字決まり: 42首</li>
          <li>三字決まり: 37首</li>
          <li>四字決まり: 6首</li>
          <li>五字決まり: 2首</li>
          <li>六字決まり: 6首</li>
        </ul>
      </InfoBox>
    </div>
  );
}

// =============================================================================
// 日別推移タブ
// =============================================================================

function DailyTab({ stats }: { stats: UserStatsAnalysis }) {
  const { byDay } = stats;

  if (byDay.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        日別データがありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-4 font-medium text-gray-600">日付</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">回数</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">ベスト</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">平均</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">正答率</th>
            </tr>
          </thead>
          <tbody>
            {byDay.map((day) => (
              <tr key={day.dayKeyJst} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-4">{day.dayKeyJst}</td>
                <td className="py-2 px-4 text-right">{day.sessionCount}</td>
                <td className="py-2 px-4 text-right font-bold text-karuta-accent">
                  {day.bestScore.toLocaleString()}
                </td>
                <td className="py-2 px-4 text-right">{day.avgScore.toLocaleString()}</td>
                <td className="py-2 px-4 text-right">
                  {Math.round((day.totalCorrect / day.totalQuestions) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 簡易グラフ（ベストスコア推移） */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <Heading as="h4" size="h4" className="text-base mb-4">ベストスコア推移</Heading>
        <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
          {[...byDay].reverse().map((day) => {
            const maxScore = Math.max(...byDay.map((d) => d.bestScore));
            const height = maxScore > 0 ? (day.bestScore / maxScore) * 100 : 0;
            return (
              <div
                key={day.dayKeyJst}
                className="flex-1 min-w-[20px] bg-karuta-accent rounded-t hover:opacity-80 transition-opacity relative group"
                style={{ height: `${height}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {day.dayKeyJst}: {day.bestScore}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 苦手札タブ
// =============================================================================

function WeakPoemsTab({
  stats,
  getPoemInfo,
  onSelectPoem,
}: {
  stats: UserStatsAnalysis;
  getPoemInfo: (poemId: string) => Poem | undefined;
  onSelectPoem: (poem: Poem) => void;
}) {
  const { weakPoems } = stats;

  if (weakPoems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Text>十分なデータがありません。もう少し練習を続けてください。</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Text size="sm" color="muted">
          正答率の低い順に表示しています。解説ボタンで対策を確認できます。
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {weakPoems.map((poemStat, index) => {
          const poem = getPoemInfo(poemStat.poemId);
          if (!poem) return null;

          return (
            <div
              key={poemStat.poemId}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                  #{index + 1}
                </Badge>
                <div className="text-right">
                  <span
                    className={cn("text-lg font-bold", getAccuracyTextColor(poemStat.accuracy))}
                  >
                    {poemStat.accuracy}%
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({poemStat.correctAttempts}/{poemStat.totalAttempts})
                  </span>
                </div>
              </div>

              <div className="text-sm mb-4">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-karuta-red border-karuta-red/30">
                    {poem.kimariji}
                  </Badge>
                  <span className="text-gray-400 text-xs">
                    {poem.kimarijiCount}字決まり
                  </span>
                </p>
                <p className="text-gray-800 text-base leading-relaxed my-2">{poem.yomi}</p>
                <p className="text-gray-500 text-xs text-right">— {poem.author}</p>
              </div>

              <Button
                variant="secondary"
                fullWidth
                size="sm"
                onClick={() => onSelectPoem(poem)}
                className="gap-2"
              >
                <span>✨</span> AI解説で対策
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// Note: StatCard, getAccuracyColor, getAccuracyTextColor are imported from shared components/utils
