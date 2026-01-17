import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PracticeSession } from '@/types/practice';
import { calculateResults } from '@/services/practice.service';
import { submitOfficialRecord } from '@/services/submission.service';
import { useAuthContext } from '@/contexts/AuthContext';
import type { SubmitResponse } from '@/types/submission';

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = location.state?.session as PracticeSession | undefined;
  const { isAuthenticated, isProfileComplete } = useAuthContext();

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="text-center">
        <p className="text-gray-600 mb-4">結果がありません</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          ホームへ戻る
        </button>
      </div>
    );
  }

  const result = calculateResults(session);
  const accuracy = ((result.correctCount / result.questionCount) * 100).toFixed(1);

  const handleOfficialSubmit = async () => {
    if (!isAuthenticated || !isProfileComplete) {
      navigate('/profile');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitOfficialRecord({
        questionCount: result.questionCount,
        correctCount: result.correctCount,
        totalElapsedMs: result.totalElapsedMs,
        avgMs: result.avgMs,
        clientSubmittedAt: Date.now(),
      });
      setSubmitResult(response);
    } catch (err) {
      setSubmitError('提出に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-3xl font-bold mb-6 text-center">練習結果</h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">正答数</p>
            <p className="text-4xl font-bold text-karuta-red">
              {result.correctCount}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              / {result.questionCount} 問
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">正答率</p>
            <p className="text-4xl font-bold text-karuta-gold">
              {accuracy}%
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">合計時間</p>
            <p className="text-3xl font-bold text-gray-800">
              {(result.totalElapsedMs / 1000).toFixed(1)}秒
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">平均時間</p>
            <p className="text-3xl font-bold text-gray-800">
              {result.avgMs}ms
            </p>
          </div>
        </div>

        {/* Per-Question Details */}
        <div className="mb-8">
          <h3 className="font-bold mb-3">問題ごとの結果</h3>
          <div className="space-y-2">
            {session.questions.map((q, index) => (
              <div
                key={index}
                className={`p-3 rounded flex items-center justify-between ${
                  q.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex-1">
                  <span className="text-sm text-gray-500 mr-2">問{index + 1}:</span>
                  <span className="text-sm font-medium">{q.poem.yomi.substring(0, 20)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${
                    q.isCorrect ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {q.isCorrect ? '正解' : '不正解'}
                  </span>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {q.elapsedMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Submission Result */}
        {submitResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            submitResult.official
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <h3 className={`font-bold mb-2 ${
              submitResult.official ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {submitResult.official ? '公式記録として登録されました' : '参考記録として登録されました'}
            </h3>
            <div className="text-sm space-y-1">
              <p>スコア: <strong>{submitResult.score}</strong></p>
              <p>日付: {submitResult.dayKeyJst}</p>
              {!submitResult.official && submitResult.invalidReasons.length > 0 && (
                <div className="mt-2 text-yellow-700">
                  <p>番付反映なしの理由:</p>
                  <ul className="list-disc list-inside">
                    {submitResult.invalidReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Official Submit Button */}
          {!submitResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {isAuthenticated && isProfileComplete ? (
                <div>
                  <p className="text-sm text-blue-800 mb-3">
                    この結果を公式記録として提出できます。公式記録は本日の番付に反映されます。
                  </p>
                  <button
                    onClick={handleOfficialSubmit}
                    disabled={submitting}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {submitting ? '提出中...' : '公式記録として提出'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-800 mb-3">
                    公式記録として提出するにはログインとプロフィール設定が必要です。
                  </p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="btn-secondary w-full"
                  >
                    ログイン / プロフィール設定
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/practice')}
              className="btn-primary flex-1"
            >
              もう一度練習
            </button>
            {submitResult && (
              <button
                onClick={() => navigate('/banzuke')}
                className="btn-secondary flex-1"
              >
                番付を見る
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1"
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
