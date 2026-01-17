import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export function KyogiPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete } = useAuthContext();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-3xl font-bold mb-2 text-karuta-gold">競技モード</h2>
        <p className="text-gray-600">
          公式記録の提出と本日の番付（ランキング）
        </p>
      </div>

      {/* Official Submission Section */}
      <div className="card">
        <h3 className="font-bold text-xl mb-3">公式記録提出</h3>
        <p className="text-gray-600 mb-4">
          練習結果を公式記録として提出すると、本日の番付に反映されます
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">公式記録の条件</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 10問・8択形式で完答すること</li>
            <li>• 異常値判定に引っかからないこと（合計2秒未満は無効）</li>
            <li>• ニックネーム設定と番付参加への同意が必要</li>
          </ul>
        </div>

        {isAuthenticated && isProfileComplete ? (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/practice')}
              className="btn-primary w-full"
            >
              公式記録用の練習を開始
            </button>
            <p className="text-sm text-gray-500 text-center">
              練習終了後、結果画面から公式提出できます
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-3">
              公式記録を提出するにはログインとプロフィール設定が必要です
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary"
            >
              ログイン / プロフィール設定
            </button>
          </div>
        )}
      </div>

      {/* Today's Banzuke */}
      <div className="card">
        <h3 className="font-bold text-xl mb-3">本日の番付</h3>
        <p className="text-gray-600 mb-4">
          今日提出された公式記録のランキング（毎日JST 00:00にリセット）
        </p>

        <button
          onClick={() => navigate('/banzuke')}
          className="btn-primary w-full"
        >
          番付を見る
        </button>
      </div>

      {/* Score Formula */}
      <div className="card bg-gray-50">
        <h3 className="font-bold mb-3">スコア計算式</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <code className="bg-white px-2 py-1 rounded">
              スコア = 正答数 x 100 + max(0, round(300 - 経過秒数))
            </code>
          </p>
          <p className="text-xs text-gray-600">
            正答10問で1000点 + 0秒で300点のタイムボーナス（最大1300点）
          </p>
        </div>
      </div>
    </div>
  );
}
