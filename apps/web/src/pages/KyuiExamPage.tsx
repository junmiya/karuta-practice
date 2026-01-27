/**
 * 102: 級位検定ページ
 * 対象札フィルタ + 即時結果表示
 */
import { useAuth } from '@/hooks/useAuth';
import { useKyuiExam } from '@/hooks/useKyuiExam';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuthRequiredState } from '@/components/ui/PageStates';
import { KYUI_LEVEL_LABELS, KyuiLevel } from '@/types/utaawase';

export function KyuiExamPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    phase,
    result,
    error,
    kimarijiFuda,
    setKimarijiFuda,
    allCards,
    setAllCards,
    startExam,
    submitExam,
    reset,
  } = useKyuiExam();

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="級位検定" subtitle="級位の昇級試験" />
        <AuthRequiredState message="検定にはログインが必要です" />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      <PageHeader title="級位検定" subtitle="合格すると即座に昇級します" />

      {error && (
        <Card className="bg-red-50 border-red-200">
          <Text className="text-red-800">{error}</Text>
        </Card>
      )}

      {/* Setup Phase */}
      {phase === 'setup' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">検定設定</Heading>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allCards}
                  onChange={(e) => {
                    setAllCards(e.target.checked);
                    if (e.target.checked) setKimarijiFuda(null);
                  }}
                  className="rounded"
                />
                <Text>全札 (100首)</Text>
              </label>

              {!allCards && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    決まり字上限
                  </label>
                  <select
                    value={kimarijiFuda || 1}
                    onChange={(e) => setKimarijiFuda(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value={1}>一字決まり</option>
                    <option value={2}>二字決まり</option>
                    <option value={3}>三字決まり</option>
                    <option value={4}>四字決まり</option>
                    <option value={5}>五字決まり</option>
                    <option value={6}>六字決まり</option>
                  </select>
                </div>
              )}
            </div>

            <Text size="sm" color="muted">
              検定では出題された札に回答し、合格正答率を達成すると昇級します。
              1回の検定で1段階のみ昇級可能です（飛び級不可）。
            </Text>

            <Button onClick={startExam} fullWidth size="lg">
              検定を開始
            </Button>
          </div>
        </Card>
      )}

      {/* In Progress Phase - simplified placeholder */}
      {phase === 'inProgress' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">検定中...</Heading>
          <Text size="sm" color="muted" className="mb-4">
            検定の出題・回答はPracticePageのフローを利用します。
            ここでは結果を手動入力してテストできます。
          </Text>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出題数</label>
              <input
                type="number"
                defaultValue={10}
                min={1}
                max={100}
                id="exam-question-count"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">正解数</label>
              <input
                type="number"
                defaultValue={8}
                min={0}
                max={100}
                id="exam-correct-count"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <Button
              onClick={() => {
                const qCount = parseInt(
                  (document.getElementById('exam-question-count') as HTMLInputElement)?.value || '10',
                  10
                );
                const cCount = parseInt(
                  (document.getElementById('exam-correct-count') as HTMLInputElement)?.value || '8',
                  10
                );
                submitExam(cCount, qCount);
              }}
              fullWidth
              size="lg"
            >
              検定を提出
            </Button>
          </div>
        </Card>
      )}

      {/* Submitting Phase */}
      {phase === 'submitting' && (
        <Card>
          <Text className="text-center py-8">判定中...</Text>
        </Card>
      )}

      {/* Result Phase */}
      {phase === 'result' && result && (
        <Card>
          <div className="text-center space-y-4">
            <Heading as="h3" size="h3">
              {result.passed ? '合格！' : '不合格'}
            </Heading>

            <div className="text-6xl">
              {result.passed ? '🎉' : '📝'}
            </div>

            <div className="space-y-2">
              <Text>正答率: {result.passRate}%</Text>

              {result.promoted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Text className="font-bold text-lg">
                    {KYUI_LEVEL_LABELS[result.previousLevel as KyuiLevel] || result.previousLevel}
                    {' → '}
                    {KYUI_LEVEL_LABELS[result.currentLevel as KyuiLevel] || result.currentLevel}
                  </Text>
                  <Text size="sm" color="muted">昇級しました！</Text>
                  {result.danEligible && (
                    <Badge variant="success" className="mt-2">段位の部 参加資格取得！</Badge>
                  )}
                </div>
              )}

              {!result.promoted && (
                <Text size="sm" color="muted">
                  合格条件を満たしませんでした。再挑戦できます。
                </Text>
              )}
            </div>

            <Button onClick={reset} fullWidth>
              検定メニューに戻る
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
