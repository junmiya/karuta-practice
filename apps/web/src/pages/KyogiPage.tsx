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
import { KYUI_LEVEL_LABELS, KYUI_MATCH_CONFIG, KYUI_MATCH_LABELS } from '@/types/utaawase';

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

      {/* Kyui-level Match Entry */}
      <Card padding="sm" className="bg-white/80">
        <h3 className="font-bold text-gray-700 mb-2">級位別歌合</h3>
        {isAuthenticated && isProfileComplete ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{KYUI_MATCH_LABELS[kyuiLevel]}</span>
                <Badge variant="secondary" className="text-xs">{KYUI_LEVEL_LABELS[kyuiLevel]}</Badge>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 mb-3">
                <li>・{config.questionCount}問・{config.cardCount}枚</li>
                <li>・{kimarijiRangeText}</li>
              </ul>
              <Button
                onClick={() => navigate('/kyui-match')}
                className="w-full"
              >
                エントリー
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600 mb-3">
              級位別歌合に参加するにはログインが必要です
            </p>
            <Button onClick={() => navigate('/profile')}>
              ログイン / プロフィール設定
            </Button>
          </div>
        )}
      </Card>

      {/* Advanced Match Entry (六級達成者のみ) */}
      <Card padding="sm" className={`${hasRokkyu ? 'bg-white/80' : 'bg-gray-100/50'}`}>
        <h3 className="font-bold text-gray-700 mb-2">上級歌合</h3>
        {isAuthenticated && isProfileComplete ? (
          hasRokkyu ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">公式歌合（上級）</span>
                  <Badge variant="warning" className="text-xs">六級達成者限定</Badge>
                </div>
                <ul className="text-xs text-gray-600 space-y-0.5 mb-3">
                  <li>・50問・12枚</li>
                  <li>・全札（100首）</li>
                </ul>
                <Button
                  onClick={() => navigate('/entry')}
                  className="w-full"
                >
                  エントリー
                </Button>
              </div>
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

      {/* Info */}
      <Card padding="sm" className="bg-gray-50/50">
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">公式記録の条件</h4>
            <ul className="text-xs text-gray-600 space-y-0.5 pl-3">
              <li>・出題数を完答</li>
              <li>・異常値判定をパス（極端に速い回答は無効）</li>
              <li>・制限時間以内に完了</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-1">スコア計算</h4>
            <p className="text-xs text-gray-600">
              <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                正答数×100 + max(0, 300-秒数)
              </code>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
