import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodaysBanzuke, getJstDateForDisplay } from '@/services/banzuke.service';
import { getActiveSeason } from '@/services/entry.service';
import { useRanking } from '@/hooks/useRanking';
import { RankingList } from '@/components/RankingList';
import { useAuth } from '@/hooks/useAuth';
import type { Submission } from '@/types/submission';
import type { Division, Season } from '@/types/entry';

type ViewMode = 'season' | 'daily';

export function BanzukePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('season');
  const [division, setDivision] = useState<Division>('kyu');
  const [season, setSeason] = useState<Season | null>(null);
  const [dailyRankings, setDailyRankings] = useState<Submission[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active season
  useEffect(() => {
    async function fetchSeason() {
      try {
        const activeSeason = await getActiveSeason();
        setSeason(activeSeason);
      } catch (err) {
        console.error('Failed to fetch season:', err);
      }
    }
    fetchSeason();
  }, []);

  // Season ranking hook
  const { ranking, loading: seasonLoading } = useRanking({
    seasonId: season?.seasonId || '',
    division,
  });

  // Fetch daily rankings
  useEffect(() => {
    async function fetchDailyBanzuke() {
      try {
        const data = await getTodaysBanzuke();
        setDailyRankings(data);
      } catch (err) {
        console.error('Failed to fetch daily banzuke:', err);
        setError('番付の取得に失敗しました');
      } finally {
        setDailyLoading(false);
      }
    }
    if (viewMode === 'daily') {
      fetchDailyBanzuke();
    }
  }, [viewMode]);

  const today = getJstDateForDisplay();

  const formatTime = (date: Date) => {
    const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().substring(11, 19);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-3xl font-bold mb-2 text-karuta-gold">
          {viewMode === 'season' ? (season?.name || '公式番付') : '本日の番付'}
        </h2>
        <p className="text-gray-600">
          {viewMode === 'season' ? 'シーズン累計ランキング' : today}
        </p>

        {/* View mode toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('season')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              viewMode === 'season'
                ? 'bg-karuta-gold text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            シーズン番付
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              viewMode === 'daily'
                ? 'bg-karuta-gold text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            本日の番付
          </button>
        </div>

        {viewMode === 'season' && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setDivision('kyu')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                division === 'kyu'
                  ? 'bg-karuta-red text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              級位の部
            </button>
            <button
              onClick={() => setDivision('dan')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                division === 'dan'
                  ? 'bg-karuta-red text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              段位の部
            </button>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">公式番付について</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 公式提出された記録のみが対象です</li>
            <li>• 異常値判定により無効となった記録は除外されます</li>
            <li>• シーズン番付はベストスコアで順位付けされます</li>
            <li>• 同点の場合は同順位となります</li>
          </ul>
        </div>
      </div>

      {/* Season Ranking */}
      {viewMode === 'season' && (
        <div className="card">
          <RankingList
            ranking={ranking}
            currentUserId={user?.uid}
            loading={seasonLoading}
            emptyMessage="この部門の番付データはまだありません"
          />
        </div>
      )}

      {/* Daily Ranking Table */}
      {viewMode === 'daily' && (
      <div className="card">
        {dailyLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red mx-auto mb-4"></div>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">順位</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">表示名</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">スコア</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">正答数</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">平均時間</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">提出時刻</th>
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
                        <td className="py-3 px-4">
                          <span className={`font-bold ${
                            rank === 1 ? 'text-yellow-600 text-xl' :
                            rank === 2 ? 'text-gray-400 text-lg' :
                            rank === 3 ? 'text-orange-600 text-lg' :
                            'text-gray-600'
                          }`}>
                            {rank === 1 ? '1' : rank === 2 ? '2' : rank === 3 ? '3' : rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{entry.nickname}</td>
                        <td className="py-3 px-4 text-right font-bold text-karuta-gold">
                          {entry.score}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {entry.correctCount} / 10
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {entry.avgMs}ms
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-500">
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
        )}

        {!dailyLoading && dailyRankings.length === 0 && (
          <div className="mt-4 text-center">
            <p className="text-gray-600 mb-4">
              あなたも挑戦してみませんか？
            </p>
            <button
              onClick={() => navigate('/practice')}
              className="btn-primary"
            >
              練習開始
            </button>
          </div>
        )}
      </div>
      )}

      {/* Back Button */}
      <div className="text-center">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
        >
          ホームへ戻る
        </button>
      </div>
    </div>
  );
}
