/**
 * 競技ページ（公式競技エントリー）
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getCurrentSeason } from '@/services/stage1.service';
import { getUserProgress } from '@/services/utaawase.service';
import type { Season } from '@/types/entry';
import type { KyuiLevel, UserProgress } from '@/types/utaawase';
import { KYUI_LEVEL_LABELS, KYUI_LEVELS_ORDERED, KYUI_MATCH_CONFIG, KYUI_MATCH_LABELS, KYUI_PROMOTION_CONDITIONS } from '@/types/utaawase';

export function KyogiPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isProfileComplete } = useAuthContext();
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [seasonData, progressData] = await Promise.all([
          getCurrentSeason(),
          user ? getUserProgress(user.uid) : null,
        ]);
        setSeason(seasonData);
        setProgress(progressData);
      } catch (err) {
        console.error('[KyogiPage] Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const kyuiLevel: KyuiLevel = progress?.kyuiLevel || 'beginner';
  const hasRokkyu = kyuiLevel === 'rokkyu';
  const config = KYUI_MATCH_CONFIG[kyuiLevel];
  const kimarijiRangeText = config.maxKimariji === 1
    ? '1字決まり'
    : `1-${config.maxKimariji}字決まり`;

  // Get next level info for exam
  const currentLevelIndex = KYUI_LEVELS_ORDERED.indexOf(kyuiLevel);
  const nextLevel = currentLevelIndex < KYUI_LEVELS_ORDERED.length - 1
    ? KYUI_LEVELS_ORDERED[currentLevelIndex + 1]
    : null;

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Season Info */}
      {season && (
        <Card padding="sm" className="bg-karuta-tansei/5 border-karuta-tansei/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-karuta-tansei">{season.name}</h2>
              <p className="text-xs text-gray-500">
                {season.status === 'open' && '開催中'}
                {season.status === 'frozen' && '集計中'}
                {season.status === 'finalized' && '確定済'}
              </p>
            </div>
            <Badge
              variant={season.status === 'open' ? 'success' : season.status === 'frozen' ? 'warning' : 'info'}
            >
              {season.status === 'open' ? '受付中' : season.status === 'frozen' ? '集計中' : '確定'}
            </Badge>
          </div>
        </Card>
      )}

      {/* User Level Display */}
      {isAuthenticated && isProfileComplete && !loading && (
        <Card padding="sm" className="bg-blue-50/50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">あなたの級位</div>
            <Badge variant="info" className="text-sm">
              {KYUI_LEVEL_LABELS[kyuiLevel]}
            </Badge>
          </div>
        </Card>
      )}

      {/* 級位検定 - for advancement */}
      <Card padding="sm" className="bg-white/80">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-gray-700">級位検定</h3>
          <span className="text-xs text-gray-400">- 昇級するための試験</span>
        </div>
        {isAuthenticated && isProfileComplete ? (
          kyuiLevel !== 'rokkyu' ? (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">
                  {nextLevel ? `${KYUI_LEVEL_LABELS[nextLevel]}への検定` : '検定'}
                </span>
                <Badge variant="success" className="text-xs">80%で合格</Badge>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {KYUI_PROMOTION_CONDITIONS[kyuiLevel]}
              </p>
              <Button
                onClick={() => navigate('/kyui-exam')}
                className="w-full"
              >
                検定を受ける
              </Button>
            </div>
          ) : (
            <div className="text-center py-3">
              <Badge variant="success" className="text-sm mb-2">六級達成済</Badge>
              <p className="text-xs text-gray-500">
                全ての級位を修了しました。上級歌合に挑戦できます。
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600 mb-3">
              検定を受けるにはログインが必要です
            </p>
            <Button onClick={() => navigate('/profile')}>
              ログイン / プロフィール設定
            </Button>
          </div>
        )}
      </Card>

      {/* 級位別歌合 - for competition at current level */}
      <Card padding="sm" className="bg-white/80">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-gray-700">級位別歌合</h3>
          <span className="text-xs text-gray-400">- 今の級位で腕試し</span>
        </div>
        {isAuthenticated && isProfileComplete ? (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">{KYUI_MATCH_LABELS[kyuiLevel]}</span>
              <Badge variant="secondary" className="text-xs">{KYUI_LEVEL_LABELS[kyuiLevel]}</Badge>
            </div>
            <ul className="text-xs text-gray-600 space-y-0.5 mb-3">
              <li>・{config.questionCount}問・{config.cardCount}枚・{kimarijiRangeText}</li>
              <li>・スコアが番付に反映されます（昇級はしません）</li>
            </ul>
            <Button
              onClick={() => navigate('/kyui-match')}
              className="w-full"
              variant="secondary"
            >
              歌合に挑戦
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              ログインすると参加できます
            </p>
          </div>
        )}
      </Card>

      {/* 上級歌合 (六級達成者のみ) */}
      <Card padding="sm" className={`${hasRokkyu ? 'bg-white/80' : 'bg-gray-100/50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-gray-700">上級歌合</h3>
          <span className="text-xs text-gray-400">- 六級達成後の本格競技</span>
        </div>
        {isAuthenticated && isProfileComplete ? (
          hasRokkyu ? (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">公式歌合（上級）</span>
                <Badge variant="warning" className="text-xs">六級達成者限定</Badge>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 mb-3">
                <li>・50問・12枚・全札（100首）</li>
                <li>・スコアが番付に反映されます</li>
              </ul>
              <Button
                onClick={() => navigate('/entry')}
                className="w-full"
              >
                エントリー
              </Button>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-gray-500 mb-2">
                六級達成で解放されます
              </p>
              <Badge variant="secondary" className="text-xs">
                50問・12枚・全札
              </Badge>
            </div>
          )
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              六級達成後に挑戦可能
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
