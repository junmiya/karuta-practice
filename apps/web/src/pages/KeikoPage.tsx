/**
 * 稽古ページ（練習モード選択 + 稽古録）
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPoemCountByKimariji, getAllPoems } from '@/services/poems.service';
import { calculateAllPracticeStats, type AllPracticeStats } from '@/services/practiceStats.service';
import { KimarijiSelector } from '@/components/KimarijiSelector';
import { PoemRangeSelector, type PoemRange } from '@/components/PoemRangeSelector';
import { DisplayOptionsToggle } from '@/components/DisplayOptionsToggle';
import { cn } from '@/lib/utils';

export function KeikoPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();

  // 決まり字・札範囲選択（練習モード用）
  const [selectedKimariji, setSelectedKimariji] = useState<number[]>([]);
  const [selectedPoemRange, setSelectedPoemRange] = useState<PoemRange[]>([]);
  const poemCounts = useMemo(() => getPoemCountByKimariji(), []);

  // 表示設定
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(false);

  // 稽古録データ
  const [stats, setStats] = useState<AllPracticeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 稽古録データ取得
  useEffect(() => {
    async function fetchStats() {
      if (!user || !isAuthenticated || !isProfileComplete) return;

      setStatsLoading(true);
      try {
        const poemsData = await getAllPoems();
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
        const practiceStats = await calculateAllPracticeStats(user.uid, poemsMap);
        setStats(practiceStats);
      } catch (err) {
        console.error('[KeikoPage] Failed to fetch stats:', err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, [user, isAuthenticated, isProfileComplete]);

  // 選択中の首数を計算
  const selectedPoemCount = useMemo(() => {
    let count = 100;
    if (selectedKimariji.length > 0) {
      count = selectedKimariji.reduce((sum, k) => sum + (poemCounts[k] || 0), 0);
    }
    if (selectedPoemRange.length > 0) {
      const rangeCount = selectedPoemRange.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      if (selectedKimariji.length > 0) {
        count = Math.min(count, rangeCount);
      } else {
        count = rangeCount;
      }
    }
    return count;
  }, [selectedKimariji, selectedPoemRange, poemCounts]);

  const buildParams = (mode?: string) => {
    const params = new URLSearchParams();
    if (mode) {
      params.set('mode', mode);
    }
    if (selectedKimariji.length > 0) {
      params.set('kimariji', selectedKimariji.join(','));
    }
    if (selectedPoemRange.length > 0) {
      params.set('range', selectedPoemRange.map(r => `${r.start}-${r.end}`).join(','));
    }
    if (showYomiKana) {
      params.set('yomiKana', '1');
    }
    if (showToriKana) {
      params.set('toriKana', '1');
    }
    if (showKimariji) {
      params.set('kimariji_show', '1');
    }
    return params.toString();
  };

  const startPractice = () => {
    navigate(`/practice12?${buildParams('renshu')}`);
  };

  const hasStats = stats && stats.overall.totalSessions > 0;

  // 最終練習日のフォーマット
  const formatLastPractice = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今日';
    if (diff === 1) return '昨日';
    if (diff < 7) return `${diff}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* 練習設定 */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        <p className="text-xs text-gray-500 px-1">
          表示と対象札を選んで練習開始
        </p>

        {/* Display options */}
        <DisplayOptionsToggle
          showYomiKana={showYomiKana}
          showToriKana={showToriKana}
          showKimariji={showKimariji}
          onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
          onToggleToriKana={() => setShowToriKana(!showToriKana)}
          onToggleKimariji={() => setShowKimariji(!showKimariji)}
          label="表示"
        />

        {/* Kimariji Filter */}
        <KimarijiSelector
          selected={selectedKimariji}
          onChange={setSelectedKimariji}
          compact
        />

        {/* Poem Range Filter */}
        <PoemRangeSelector
          selected={selectedPoemRange}
          onChange={setSelectedPoemRange}
          compact
        />

        {/* Mode buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startPractice}
            className="py-2 px-3 bg-red-50 border border-karuta-red/30 rounded-lg hover:bg-red-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-red">練習</div>
            <div className="text-xs text-gray-500">手動次へ・{selectedPoemCount}首</div>
          </button>
          <button
            onClick={() => {
              const query = buildParams();
              navigate(query ? `/practice12?${query}` : '/practice12');
            }}
            className="py-2 px-3 bg-amber-50 border border-karuta-accent/30 rounded-lg hover:bg-amber-100 transition-colors text-left"
          >
            <div className="text-sm font-bold text-karuta-accent">研鑽</div>
            <div className="text-xs text-gray-500">自動次へ・{selectedPoemCount}首</div>
          </button>
        </div>
      </div>

      {/* 稽古録 */}
      {isAuthenticated && isProfileComplete && (
        <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">稽古録</span>
            {statsLoading ? (
              <span className="text-xs text-gray-400">読込中...</span>
            ) : hasStats && stats.overall.lastPracticeAt ? (
              <span className="text-xs text-gray-400">
                最終: {formatLastPractice(stats.overall.lastPracticeAt)}
              </span>
            ) : null}
          </div>

          {hasStats ? (
            <>
              {/* メイン統計 */}
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-gray-50 rounded p-1.5">
                  <div className="text-sm font-bold text-karuta-tansei">{stats.overall.totalSessions}</div>
                  <div className="text-xs text-gray-400">回</div>
                </div>
                <div className="bg-gray-50 rounded p-1.5">
                  <div className="text-sm font-bold text-karuta-gold">{stats.overall.accuracy}%</div>
                  <div className="text-xs text-gray-400">正答率</div>
                </div>
                <div className="bg-gray-50 rounded p-1.5">
                  <div className="text-sm font-bold text-gray-600">{stats.overall.avgResponseMs}</div>
                  <div className="text-xs text-gray-400">ms</div>
                </div>
                <div className="bg-gray-50 rounded p-1.5">
                  <div className="text-sm font-bold text-green-600">{stats.byPoem.length}</div>
                  <div className="text-xs text-gray-400">/100首</div>
                </div>
              </div>

              {/* 決まり字別正答率 */}
              <div>
                <div className="text-xs text-gray-500 mb-1">決まり字別</div>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((n) => {
                    const k = stats.byKimariji.find(x => x.kimarijiCount === n);
                    const hasData = k && k.totalAttempts > 0;
                    const accuracy = hasData ? k.accuracy : 0;
                    return (
                      <div
                        key={n}
                        className={cn(
                          "text-center rounded py-1",
                          !hasData ? "bg-gray-100 text-gray-300" :
                          accuracy >= 80 ? "bg-green-100 text-green-700" :
                          accuracy >= 60 ? "bg-blue-100 text-blue-700" :
                          accuracy >= 40 ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        )}
                      >
                        <div className="text-xs font-medium">{n}字</div>
                        <div className="text-xs">{hasData ? `${accuracy}%` : '-'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 苦手札 */}
              {stats.weakPoems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">苦手札</span>
                    <span className="text-xs text-red-500 font-medium">{stats.weakPoems.length}首</span>
                  </div>
                  <div className="space-y-1">
                    {stats.weakPoems.slice(0, 3).map((poem) => (
                      <div
                        key={poem.poemId}
                        className="flex items-center justify-between text-xs bg-red-50 rounded px-2 py-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-red-600 font-medium flex-shrink-0">{poem.accuracy}%</span>
                          <span className="text-gray-600 truncate">
                            {poem.poemNumber}番「{poem.kimariji}」
                          </span>
                        </div>
                        <span className="text-gray-400 flex-shrink-0 ml-2">
                          {poem.correctAttempts}/{poem.totalAttempts}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 直近の練習（日別） */}
              {stats.overall.dailyStats.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">直近の練習</div>
                  <div className="flex gap-1 overflow-x-auto">
                    {stats.overall.dailyStats.slice(0, 7).map((day) => {
                      const parts = day.date.split('-');
                      return (
                        <div
                          key={day.date}
                          className="flex-shrink-0 text-center bg-gray-50 rounded px-2 py-1 min-w-[48px]"
                        >
                          <div className="text-xs text-gray-400">{parts[1]}/{parts[2]}</div>
                          <div className={cn(
                            "text-xs font-medium",
                            day.accuracy >= 80 ? "text-green-600" :
                            day.accuracy >= 60 ? "text-blue-600" :
                            "text-orange-600"
                          )}>
                            {day.accuracy}%
                          </div>
                          <div className="text-xs text-gray-400">{day.questions}問</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 詳細リンク */}
              <button
                onClick={() => navigate('/keikoroku')}
                className="w-full text-xs text-karuta-tansei hover:underline text-center py-1 border-t border-gray-100 mt-1"
              >
                AI分析・グラフなど詳細を見る →
              </button>
            </>
          ) : !statsLoading ? (
            <p className="text-xs text-gray-400 text-center py-3">
              練習するとデータが蓄積されます
            </p>
          ) : null}
        </div>
      )}

      {/* 未ログイン時 */}
      {(!isAuthenticated || !isProfileComplete) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600 mb-2">ログインすると練習記録が保存されます</p>
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-karuta-tansei font-medium hover:underline"
          >
            ログイン →
          </button>
        </div>
      )}
    </div>
  );
}
