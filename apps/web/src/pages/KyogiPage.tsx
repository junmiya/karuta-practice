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
import type { Season } from '@/types/entry';

export function KyogiPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete } = useAuthContext();
  const [season, setSeason] = useState<Season | null>(null);

  useEffect(() => {
    getCurrentSeason().then(setSeason).catch(console.error);
  }, []);

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

      {/* Entry Card */}
      <Card padding="sm" className="bg-white/80">
        {isAuthenticated && isProfileComplete ? (
          <div className="text-center py-2">
            <Button
              onClick={() => navigate('/entry')}
              className="w-full max-w-xs text-base py-3"
            >
              公式競技にエントリー
            </Button>
            <p className="text-xs text-gray-500 mt-2">50問・12枚形式で番付に挑戦</p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600 mb-3">
              公式記録を提出するにはログインが必要です
            </p>
            <Button onClick={() => navigate('/profile')}>
              ログイン / プロフィール設定
            </Button>
          </div>
        )}
      </Card>

      {/* Info */}
      <Card padding="sm" className="bg-gray-50/50">
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">公式記録の条件</h4>
            <ul className="text-xs text-gray-600 space-y-0.5 pl-3">
              <li>• 50問・12枚形式で完答</li>
              <li>• 異常値判定をパス（極端に速い回答は無効）</li>
              <li>• 制限時間60分以内に完了</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-1">スコア計算</h4>
            <p className="text-xs text-gray-600">
              <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                正答数×100 + max(0, 300-秒数)
              </code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              満点5000点 + ボーナス最大300点 = 最大5300点
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
