import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export function KensaiPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete } = useAuthContext();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-3xl font-bold mb-2">研鑽モード</h2>
        <p className="text-gray-600">
          練習記録の分析、苦手札の特訓、詳細な学習機能を提供します
        </p>
      </div>

      {/* Feature List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold text-lg mb-3">練習記録</h3>
          <p className="text-sm text-gray-600 mb-3">
            過去の練習結果を保存・閲覧できます
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• 日別・月別の統計</li>
            <li>• 正答率の推移グラフ</li>
            <li>• 平均時間の推移</li>
          </ul>
          <button className="btn-secondary w-full" disabled>
            準備中（段階1で実装予定）
          </button>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg mb-3">苦手札分析</h3>
          <p className="text-sm text-gray-600 mb-3">
            間違えた札を自動で分析します
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• 誤答回数ランキング</li>
            <li>• 決まり字別の正答率</li>
            <li>• 混同しやすい札の組み合わせ</li>
          </ul>
          <button className="btn-secondary w-full" disabled>
            準備中（段階1で実装予定）
          </button>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg mb-3">特訓モード</h3>
          <p className="text-sm text-gray-600 mb-3">
            苦手札だけを集中的に練習できます
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• 苦手札のみ出題</li>
            <li>• 決まり字別の絞り込み</li>
            <li>• カスタム問題セット作成</li>
          </ul>
          <button className="btn-secondary w-full" disabled>
            準備中（段階1で実装予定）
          </button>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg mb-3">学習コンテンツ</h3>
          <p className="text-sm text-gray-600 mb-3">
            百人一首の知識を深めるコンテンツ
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• 歌人の解説</li>
            <li>• 歌の意味・背景</li>
            <li>• 決まり字の覚え方</li>
          </ul>
          <button className="btn-secondary w-full" disabled>
            準備中（段階1で実装予定）
          </button>
        </div>
      </div>

      {/* Login Prompt */}
      {!isAuthenticated || !isProfileComplete ? (
        <div className="card bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">ログインが必要です</h3>
          <p className="text-sm text-blue-800 mb-3">
            研鑽モードを利用するには、ログインとプロフィール設定が必要です。
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary"
          >
            ログイン / プロフィール設定
          </button>
        </div>
      ) : null}

      {/* Coming Soon Notice */}
      <div className="card bg-gray-100">
        <p className="text-sm text-gray-700">
          <strong>段階0（MVP）バージョン：</strong>
          研鑽モードは段階1以降で実装予定です。現在は「基本」タブの無料練習モードをご利用ください。
        </p>
      </div>
    </div>
  );
}
