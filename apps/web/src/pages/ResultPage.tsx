import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { calculateResults } from '@/services/practice.service';
import { submitOfficialRecord } from '@/services/submission.service';
import { savePracticeResult } from '@/services/practiceStats.service';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { PracticeSession } from '@/types/practice';
import type { SubmitResponse } from '@/types/submission';

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = location.state?.session as PracticeSession | undefined;
  const filter = location.state?.filter as { kimarijiCounts?: number[] } | undefined;
  const { user, isAuthenticated, isProfileComplete, loading: authLoading } = useAuthContext();

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [practiceSaved, setPracticeSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveAttempted = useRef(false);

  // Save practice result for authenticated users
  useEffect(() => {
    console.log('[ResultPage] Save effect triggered', {
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.uid,
      authLoading,
      saveAttempted: saveAttempted.current
    });

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[ResultPage] Auth still loading, waiting...');
      return;
    }

    if (!session) {
      console.log('[ResultPage] No session, skipping save');
      return;
    }

    if (!user) {
      console.log('[ResultPage] No user, skipping save');
      return;
    }

    if (saveAttempted.current) {
      console.log('[ResultPage] Already attempted save, skipping');
      return;
    }

    saveAttempted.current = true;
    console.log('[ResultPage] Starting save...', {
      questionsCount: session.questions.length,
      answeredCount: session.questions.filter(q => q.answered).length
    });

    const saveResult = async () => {
      try {
        // Only pass filter if it has valid kimarijiCounts array
        const validFilter = filter?.kimarijiCounts?.length
          ? { kimarijiCounts: filter.kimarijiCounts }
          : undefined;

        console.log('[ResultPage] Saving with filter:', validFilter);

        const resultId = await savePracticeResult(
          user.uid,
          'practice',
          session.questions,
          validFilter
        );
        console.log('[ResultPage] Save successful, id:', resultId);
        setPracticeSaved(true);
      } catch (err: unknown) {
        console.error('[ResultPage] Failed to save practice result:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setSaveError(errorMessage);
        // Reset so user can retry
        saveAttempted.current = false;
      }
    };

    saveResult();
  }, [session, user, filter, authLoading]);

  if (!session) {
    return (
      <Container size="sm" className="text-center py-12">
        <Text color="muted" className="mb-4">結果がありません</Text>
        <Button onClick={() => navigate('/')}>
          ホームへ戻る
        </Button>
      </Container>
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
    <Container size="sm" className="py-6">
      <Card>
        <Heading as="h2" size="h1" className="mb-6 text-center">練習結果</Heading>

        {/* Practice saved indicator */}
        {practiceSaved && (
          <div className="mb-4 text-center">
            <Badge variant="success" className="text-xs">
              成績に記録しました
            </Badge>
          </div>
        )}

        {/* Save error indicator */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <Text size="sm" className="text-red-600">
              記録の保存に失敗しました: {saveError}
            </Text>
          </div>
        )}

        {/* Auth loading indicator */}
        {authLoading && (
          <div className="mb-4 text-center">
            <Text size="sm" color="muted">認証確認中...</Text>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text size="sm" color="muted" className="mb-1">正答数</Text>
            <p className="text-3xl font-bold text-karuta-red">
              {result.correctCount}
            </p>
            <Text size="sm" color="muted" className="mt-1">
              / {result.questionCount} 問
            </Text>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text size="sm" color="muted" className="mb-1">正答率</Text>
            <p className="text-3xl font-bold text-karuta-accent">
              {accuracy}%
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text size="sm" color="muted" className="mb-1">合計時間</Text>
            <p className="text-2xl font-bold">
              {(result.totalElapsedMs / 1000).toFixed(1)}秒
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text size="sm" color="muted" className="mb-1">平均時間</Text>
            <p className="text-2xl font-bold">
              {result.avgMs}ms
            </p>
          </div>
        </div>

        {/* Per-Question Details */}
        <div className="mb-8">
          <Heading as="h3" size="h4" className="mb-3">問題ごとの結果</Heading>
          <div className="space-y-2">
            {session.questions.map((q, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded flex items-center justify-between",
                  q.isCorrect ? "bg-green-50" : "bg-red-50"
                )}
              >
                <div className="flex-1">
                  <span className="text-sm text-gray-500 mr-2">問{index + 1}:</span>
                  <span className="text-sm font-medium">{q.poem.yomi.substring(0, 20)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={q.isCorrect ? "success" : "danger"}>
                    {q.isCorrect ? '正解' : '不正解'}
                  </Badge>
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
          <div className={cn(
            "mb-6 p-4 rounded-lg border",
            submitResult.official
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Heading as="h3" size="h4" className={submitResult.official ? "text-green-800" : "text-yellow-800"}>
                {submitResult.official ? '公式記録として登録されました' : '参考記録として登録されました'}
              </Heading>
            </div>
            <div className="text-sm space-y-1 text-gray-700">
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
                  <Button
                    onClick={handleOfficialSubmit}
                    disabled={submitting}
                    className="w-full"
                    size="lg"
                  >
                    {submitting ? '提出中...' : '公式記録として提出'}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-800 mb-3">
                    公式記録として提出するにはログインとプロフィール設定が必要です。
                  </p>
                  <Button
                    onClick={() => navigate('/profile')}
                    variant="secondary"
                    className="w-full"
                  >
                    ログイン / プロフィール設定
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/practice')}
              variant="primary"
              className="flex-1"
            >
              もう一度練習
            </Button>
            {submitResult && (
              <Button
                onClick={() => navigate('/utakurai')}
                variant="secondary"
                className="flex-1"
              >
                番付を見る
              </Button>
            )}
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="flex-1"
            >
              ホームへ戻る
            </Button>
          </div>
        </div>
      </Card>
    </Container>
  );
}
