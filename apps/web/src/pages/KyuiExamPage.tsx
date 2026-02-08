/**
 * 102: 級位検定ページ
 * 現在の級位に基づいて自動的に次の級への検定を実施
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKyuiExam } from '@/hooks/useKyuiExam';
import { getUserProgress } from '@/services/utaawase.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuthRequiredState, LoadingState } from '@/components/ui/PageStates';
import { KYUI_LEVEL_LABELS, KYUI_EXAM_CONFIG, normalizeKyuiLevel, type KyuiLevel } from '@/types/utaawase';

export function KyuiExamPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [kyuiLevel, setKyuiLevel] = useState<KyuiLevel | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(true);

  const {
    phase,
    result,
    error,
    setKimarijiFuda,
    setAllCards,
    startExam,
    submitExam,
    reset,
  } = useKyuiExam();

  // Fetch user's current kyui level
  useEffect(() => {
    async function fetchLevel() {
      if (!user) {
        setLoadingLevel(false);
        return;
      }
      try {
        const progress = await getUserProgress(user.uid);
        setKyuiLevel(normalizeKyuiLevel(progress?.kyuiLevel));
      } catch (err) {
        console.error('Failed to fetch user progress:', err);
        setKyuiLevel('minarai');
      } finally {
        setLoadingLevel(false);
      }
    }
    if (!authLoading) {
      fetchLevel();
    }
  }, [user, authLoading]);

  // Set exam config based on current level
  useEffect(() => {
    if (kyuiLevel) {
      const config = KYUI_EXAM_CONFIG[kyuiLevel];
      if (config.examKimariji === null) {
        setAllCards(true);
        setKimarijiFuda(null);
      } else {
        setAllCards(false);
        setKimarijiFuda(config.examKimariji);
      }
    }
  }, [kyuiLevel, setAllCards, setKimarijiFuda]);

  if (authLoading || loadingLevel) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="級位検定" subtitle="級位の昇級試験" />
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="級位検定" subtitle="級位の昇級試験" />
        <AuthRequiredState message="検定にはログインが必要です" />
      </div>
    );
  }

  if (!kyuiLevel) {
    return (
      <div className="karuta-container space-y-2 py-2">
        <PageHeader title="級位検定" subtitle="級位の昇級試験" />
        <Card className="text-center py-4">
          <Text>レベル情報を取得できませんでした</Text>
          <Button onClick={() => navigate('/utaawase')} className="mt-4">
            戻る
          </Button>
        </Card>
      </div>
    );
  }

  const examConfig = KYUI_EXAM_CONFIG[kyuiLevel];

  return (
    <div className="karuta-container space-y-2 py-2">
      <PageHeader title="級位検定" subtitle="合格すると即座に昇級します" />

      {error && (
        <Card className="bg-red-50 border-red-200">
          <Text className="text-red-800">{error}</Text>
        </Card>
      )}

      {/* Current Level Display */}
      <Card padding="sm" className="bg-blue-50/50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">現在の級位</div>
          <Badge variant="info" className="text-sm">
            {KYUI_LEVEL_LABELS[kyuiLevel]}
          </Badge>
        </div>
      </Card>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <Card>
          <div className="text-center mb-4">
            <Heading as="h3" size="h3" className="mb-2">{examConfig.examLabel}</Heading>
            <Badge variant="success" className="text-sm">
              {examConfig.passRate}%正解で合格
            </Badge>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <ul className="text-sm text-gray-600 space-y-1">
              <li>・{examConfig.examKimariji ? `${examConfig.examKimariji}字決まりの札のみ出題` : '全札（100首）から出題'}</li>
              <li>・{examConfig.passRate}%以上の正答率で合格</li>
              <li>・合格すると{examConfig.nextLevel === 'dan' ? '段位資格を取得' : `${KYUI_LEVEL_LABELS[examConfig.nextLevel]}に昇級`}</li>
            </ul>
          </div>

          <Button onClick={startExam} fullWidth size="lg">
            検定を開始
          </Button>
        </Card>
      )}

      {/* In Progress Phase - simplified placeholder */}
      {phase === 'inProgress' && (
        <Card>
          <Heading as="h3" size="h3" className="mb-4">{examConfig.examLabel}</Heading>
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
              {result.passed ? '合格' : '不合格'}
            </Heading>

            <div className="text-4xl">
              {result.passed ? '🎊' : ''}
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
                  <Text size="sm" color="muted">昇級しました</Text>
                  {result.danEligible && (
                    <Badge variant="success" className="mt-2">段位の部 参加資格取得</Badge>
                  )}
                </div>
              )}

              {!result.promoted && (
                <Text size="sm" color="muted">
                  {examConfig.passRate}%以上で合格です。再挑戦できます。
                </Text>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={reset} className="flex-1">
                再挑戦
              </Button>
              <Button onClick={() => navigate('/utaawase')} variant="secondary" className="flex-1">
                歌合に戻る
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
