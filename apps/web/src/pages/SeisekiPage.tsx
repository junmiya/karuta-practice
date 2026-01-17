import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export function SeisekiPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete } = useAuthContext();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-3xl font-bold mb-2">成績</h2>
        <p className="text-gray-600">
          あなたの練習成績と統計情報
        </p>
      </div>

      {isAuthenticated && isProfileComplete ? (
        <>
          {/* Summary Stats */}
          <div className="card">
            <h3 className="font-bold text-xl mb-4">総合統計</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">総練習回数</p>
                <p className="text-3xl font-bold text-karuta-red">-</p>
                <p className="text-xs text-gray-500 mt-1">回</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">平均正答率</p>
                <p className="text-3xl font-bold text-karuta-gold">-</p>
                <p className="text-xs text-gray-500 mt-1">%</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">平均時間</p>
                <p className="text-3xl font-bold text-gray-800">-</p>
                <p className="text-xs text-gray-500 mt-1">ms</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">最高スコア</p>
                <p className="text-3xl font-bold text-green-600">-</p>
                <p className="text-xs text-gray-500 mt-1">pt</p>
              </div>
            </div>
          </div>

          {/* Recent Records */}
          <div className="card">
            <h3 className="font-bold text-xl mb-4">最近の練習記録</h3>
            <div className="text-center py-8 text-gray-500">
              この機能は段階1で実装予定です
            </div>
            <button
              onClick={() => navigate('/practice')}
              className="btn-primary w-full mt-4"
            >
              練習を開始する
            </button>
          </div>

          {/* By Card Stats */}
          <div className="card">
            <h3 className="font-bold text-xl mb-4">決まり字別の正答率</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['1字決まり', '2字決まり', '3字決まり', '4字決まり', '5字決まり', '6字決まり'].map((category) => (
                <div key={category} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">{category}</p>
                  <p className="text-2xl font-bold text-gray-400">--%</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              段階1で詳細な統計機能を実装予定
            </p>
          </div>
        </>
      ) : (
        <div className="card text-center">
          <div className="py-8">
            <p className="text-gray-600 mb-6">
              成績を記録・閲覧するにはログインとプロフィール設定が必要です
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary"
            >
              ログイン / プロフィール設定
            </button>
          </div>
        </div>
      )}

      {/* Coming Soon Notice */}
      <div className="card bg-gray-100">
        <p className="text-sm text-gray-700">
          <strong>段階0（MVP）バージョン：</strong>
          成績保存・閲覧機能は段階1以降で実装予定です。現在は「基本」タブの練習と競技タブの公式提出が利用できます。
        </p>
      </div>
    </div>
  );
}
