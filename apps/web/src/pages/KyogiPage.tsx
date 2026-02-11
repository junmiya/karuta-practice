/**
 * 競技ページ（公式競技エントリー + 歌合録）
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getCurrentSeason } from '@/services/stage1.service';
import { getUserProgress, getUserSessions, type UserSession } from '@/services/utaawase.service';
import type { Season } from '@/types/entry';
import type { KyuiLevel, UserProgress } from '@/types/utaawase';
import {
  KYUI_LEVEL_LABELS,
  KYUI_LEVELS_ORDERED,
  KYUI_MATCH_CONFIG,
  KYUI_EXAM_CONFIG,
  DAN_LEVEL_LABELS,
  normalizeKyuiLevel,
} from '@/types/utaawase';
import { cn } from '@/lib/utils';

export function KyogiPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [seasonData, progressData, sessionsData] = await Promise.all([
          getCurrentSeason(),
          user ? getUserProgress(user.uid) : null,
          user ? getUserSessions(user.uid) : [],
        ]);
        setSeason(seasonData);
        setProgress(progressData);
        setSessions(sessionsData);
      } catch (err) {
        console.error('[KyogiPage] Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const kyuiLevel: KyuiLevel = normalizeKyuiLevel(progress?.kyuiLevel);
  const hasRokkyu = kyuiLevel === 'rokkyu';
  const config = KYUI_MATCH_CONFIG[kyuiLevel];
  const examConfig = KYUI_EXAM_CONFIG[kyuiLevel];
  const currentLevelIndex = KYUI_LEVELS_ORDERED.indexOf(kyuiLevel);
  const nextLevel = currentLevelIndex < KYUI_LEVELS_ORDERED.length - 1
    ? KYUI_LEVELS_ORDERED[currentLevelIndex + 1]
    : null;

  // 歌合録の統計
  const sessionStats = useMemo(() => {
    const confirmed = sessions.filter(s => s.status === 'confirmed');
    const totalMatches = confirmed.length;
    const bestScore = Math.max(...confirmed.map(s => s.score || 0), 0);
    return { totalMatches, bestScore };
  }, [sessions]);

  // 未ログイン時
  if (!isAuthenticated || !isProfileComplete) {
    return (
      <div className="karuta-container space-y-2 py-2">
        {season && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-karuta-tansei">{season.name}</span>
            <Badge variant={season.status === 'open' ? 'success' : 'warning'} className="text-xs">
              {season.status === 'open' ? '開催中' : '集計中'}
            </Badge>
          </div>
        )}
        <Card className="text-center py-6">
          <p className="text-sm text-gray-600 mb-3">歌合に参加するにはログインが必要です</p>
          <Button onClick={() => navigate('/profile')}>ログイン</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* ヘッダー: シーズン + 級位 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {season && (
            <>
              <span className="font-bold text-karuta-tansei">{season.name}</span>
              <Badge variant={season.status === 'open' ? 'success' : 'warning'} className="text-xs">
                {season.status === 'open' ? '開催中' : '集計中'}
              </Badge>
            </>
          )}
        </div>
        {!loading && (
          <Badge variant="info" className="text-xs">
            {KYUI_LEVEL_LABELS[kyuiLevel]}
          </Badge>
        )}
      </div>

      {/* 説明 */}
      <div className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
        歌合（うたあわせ）は、表示された上の句に対応する取札を選ぶ腕試しです。検定で昇級すると出題範囲が広がります。スコアは番付に反映されます。
      </div>

      {/* メインアクション */}
      <Card padding="sm">
        <div className="space-y-3">
          {/* 級位検定 */}
          {!hasRokkyu && examConfig.nextLevel !== 'dan' && nextLevel && (
            <div className="p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{KYUI_LEVEL_LABELS[nextLevel]}検定</div>
                  <div className="text-xs text-gray-500">
                    {examConfig.examKimariji}字決まり80%正解で昇級
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/kyui-exam')}>
                  受験
                </Button>
              </div>
            </div>
          )}

          {/* 六級達成済み表示 */}
          {hasRokkyu && (
            <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
              <Badge variant="success" className="text-xs">六級達成 - 段位資格取得</Badge>
            </div>
          )}

          {/* 級位別歌合 */}
          <div className="p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{KYUI_LEVEL_LABELS[kyuiLevel]}の歌合</div>
                <div className="text-xs text-gray-500">
                  {config.questionCount}問・{config.cardCount}枚・{config.maxKimariji === 1 ? '1字' : config.maxKimariji >= 100 ? '全札' : `1-${config.maxKimariji}字`}決まり
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/kyui-match')}>
                挑戦
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              今の級位で練習。スコアは番付に反映
            </div>
          </div>

          {/* 上級歌合 */}
          <div className={`p-2 rounded-lg ${hasRokkyu ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${!hasRokkyu && 'text-gray-400'}`}>上級歌合</div>
                <div className="text-xs text-gray-500">
                  50問・12枚・全札100首
                </div>
              </div>
              <Button
                size="sm"
                disabled={!hasRokkyu}
                onClick={() => navigate('/entry')}
              >
                参加
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {hasRokkyu ? '本格競技。段位昇格を目指す' : '六級達成で解放'}
            </div>
          </div>
        </div>
      </Card>

      {/* 歌合録 */}
      <div className="bg-white/90 border border-gray-200 rounded-lg p-2 space-y-2">
        <div className="text-sm font-bold text-gray-700">歌合録</div>

        {/* レベル表示 */}
        <div className="grid grid-cols-4 gap-1">
          {/* 級位 */}
          <div className="bg-blue-50 rounded p-1.5 text-center">
            <div className="text-xs text-gray-500">級位</div>
            <div className="text-sm font-bold text-blue-700">
              {KYUI_LEVEL_LABELS[kyuiLevel]}
            </div>
          </div>
          {/* 段位 */}
          <div className={cn(
            "rounded p-1.5 text-center",
            progress?.danLevel ? "bg-purple-50" : "bg-gray-50"
          )}>
            <div className="text-xs text-gray-500">段位</div>
            <div className={cn(
              "text-sm font-bold",
              progress?.danLevel ? "text-purple-700" : "text-gray-300"
            )}>
              {progress?.danLevel ? DAN_LEVEL_LABELS[progress.danLevel] : 'ー'}
            </div>
          </div>
          {/* 伝位 */}
          <div className={cn(
            "rounded p-1.5 text-center",
            progress?.denLevel ? "bg-amber-50" : "bg-gray-50"
          )}>
            <div className="text-xs text-gray-500">伝位</div>
            <div className={cn(
              "text-sm font-bold",
              progress?.denLevel ? "text-amber-700" : "text-gray-300"
            )}>
              {progress?.denLevel === 'kaiden' ? '皆伝' :
               progress?.denLevel === 'okuden' ? '奥伝' :
               progress?.denLevel === 'chuden' ? '中伝' :
               progress?.denLevel === 'shoden' ? '初伝' : 'ー'}
            </div>
          </div>
          {/* 歌位 */}
          <div className={cn(
            "rounded p-1.5 text-center",
            progress?.utakuraiLevel ? "bg-yellow-50" : "bg-gray-50"
          )}>
            <div className="text-xs text-gray-500">歌位</div>
            <div className={cn(
              "text-sm font-bold",
              progress?.utakuraiLevel ? "text-yellow-700" : "text-gray-300"
            )}>
              {progress?.utakuraiLevel === 'eisei_meijin' ? '永世名歌位' :
               progress?.utakuraiLevel === 'meijin' ? '名歌位' : 'ー'}
            </div>
          </div>
        </div>

        {/* 通算成績 */}
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="bg-gray-50 rounded p-1.5">
            <div className="text-sm font-bold text-karuta-tansei">
              {progress?.officialWinCount || 0}
            </div>
            <div className="text-xs text-gray-400">公式勝利</div>
          </div>
          <div className="bg-gray-50 rounded p-1.5">
            <div className="text-sm font-bold text-karuta-gold">
              {progress?.championCount || 0}
            </div>
            <div className="text-xs text-gray-400">優勝</div>
          </div>
          <div className="bg-gray-50 rounded p-1.5">
            <div className="text-sm font-bold text-gray-600">
              {progress?.totalOfficialMatches || sessionStats.totalMatches}
            </div>
            <div className="text-xs text-gray-400">参加</div>
          </div>
          <div className="bg-gray-50 rounded p-1.5">
            <div className="text-sm font-bold text-green-600">
              {sessionStats.bestScore}
            </div>
            <div className="text-xs text-gray-400">最高点</div>
          </div>
        </div>

        {/* 級位進捗バー */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">級位進捗</span>
            <span className="text-gray-400">
              {currentLevelIndex}/{KYUI_LEVELS_ORDERED.length - 1}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
              style={{
                width: `${(currentLevelIndex / (KYUI_LEVELS_ORDERED.length - 1)) * 100}%`,
              }}
            />
          </div>
          {kyuiLevel !== 'rokkyu' && (
            <div className="text-xs text-gray-400 mt-1">
              次: {nextLevel ? KYUI_LEVEL_LABELS[nextLevel] : ''}
              {examConfig.examKimariji && ` (${examConfig.examKimariji}字決まり${examConfig.passRate}%)`}
            </div>
          )}
        </div>

        {/* 直近の歌合 */}
        {sessions.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">直近の歌合</div>
            <div className="space-y-1">
              {sessions.filter(s => s.status === 'confirmed').slice(0, 3).map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1"
                >
                  <span className="text-gray-500">
                    {session.startedAt.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {session.correctCount !== undefined ? `${session.correctCount}/50` : '-'}
                    </span>
                    <span className="font-bold text-karuta-gold">
                      {session.score || 0}点
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 詳細リンク */}
        <button
          onClick={() => navigate('/utaawaseroku')}
          className="w-full text-xs text-karuta-tansei hover:underline text-center py-1 border-t border-gray-100"
        >
          グラフ・詳細分析を見る →
        </button>
      </div>
    </div>
  );
}
