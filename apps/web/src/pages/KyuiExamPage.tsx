/**
 * 102: 級位検定ページ
 * 現在の級位に基づいて自動的に次の級への検定を実施
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useKyuiExam } from '@/hooks/useKyuiExam';
import { getUserProgress } from '@/services/utaawase.service';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaGrid } from '@/components/KarutaGrid';
import { ControlBar } from '@/components/ControlBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuthRequiredState, LoadingState } from '@/components/ui/PageStates';
import { KYUI_LEVEL_LABELS, KYUI_EXAM_CONFIG, normalizeKyuiLevel, type KyuiLevel } from '@/types/utaawase';
import type { Poem } from '@/types/poem';

/** 字決まり別の札数 */
const KIMARIJI_POEM_COUNTS = [7, 42, 37, 6, 2, 6];

/** ランダムに n 枚選ぶ */
function selectRandom(poems: Poem[], n: number): Poem[] {
  const shuffled = [...poems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

export function KyuiExamPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
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

  // --- 表示オプション ---
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(false);

  // --- 出題用ステート ---
  const allPoems = useMemo(() => getAllPoemsSync(), []);
  const [examCards, setExamCards] = useState<Poem[]>([]);
  const [correctPoemId, setCorrectPoemId] = useState<string | null>(null);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

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

  /** 検定レベルに合った出題可能札 */
  const eligiblePoems = useMemo(() => {
    if (!kyuiLevel) return [];
    const config = KYUI_EXAM_CONFIG[kyuiLevel];
    if (config.examKimariji === null) return allPoems;
    return allPoems.filter(p => p.kimarijiCount === config.examKimariji);
  }, [allPoems, kyuiLevel]);

  /** 出題数（そのレベルの対象札数） */
  const examQuestionCount = useMemo(() => {
    if (!kyuiLevel) return 0;
    const config = KYUI_EXAM_CONFIG[kyuiLevel];
    if (config.examKimariji === null) return 100;
    return KIMARIJI_POEM_COUNTS[config.examKimariji - 1];
  }, [kyuiLevel]);

  /** グリッドに表示する枚数 */
  const gridCardCount = useMemo((): 7 | 9 | 12 => {
    if (eligiblePoems.length <= 7) return 7;
    if (eligiblePoems.length <= 9) return 9;
    return 12;
  }, [eligiblePoems]);

  /** 出題を初期化（検定開始時） */
  const initQuiz = useCallback(() => {
    const cards = selectRandom(eligiblePoems, gridCardCount);
    const correct = cards[Math.floor(Math.random() * cards.length)];
    setExamCards(cards);
    setCorrectPoemId(correct.poemId);
    setSelectedPoemId(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setQuestionCount(0);
    setCorrectCount(0);
    setTotalQuestions(examQuestionCount);
  }, [eligiblePoems, gridCardCount, examQuestionCount]);

  /** 検定を開始 */
  const handleStartExam = useCallback(() => {
    startExam();
    initQuiz();
  }, [startExam, initQuiz]);

  /** 札を選択（回答） */
  const handleSelectPoem = useCallback((poem: Poem) => {
    if (isAnswered) return;
    const correct = poem.poemId === correctPoemId;
    setSelectedPoemId(poem.poemId);
    setIsAnswered(true);
    setIsCorrect(correct);
    setQuestionCount(prev => prev + 1);
    if (correct) setCorrectCount(prev => prev + 1);
  }, [isAnswered, correctPoemId]);

  /** 次の問題へ進む */
  const handleNextQuestion = useCallback(() => {
    const newQ = questionCount; // already incremented in handleSelectPoem
    if (newQ >= totalQuestions) {
      // 全問終了 → 提出
      submitExam(correctCount, totalQuestions);
      return;
    }

    // 正解札と（不正解なら）選択札を入れ替え
    const toReplace: string[] = [];
    if (correctPoemId) toReplace.push(correctPoemId);
    if (!isCorrect && selectedPoemId && selectedPoemId !== correctPoemId) {
      toReplace.push(selectedPoemId);
    }

    const remaining = examCards.filter(p => !toReplace.includes(p.poemId));
    const available = eligiblePoems.filter(
      p => !remaining.some(r => r.poemId === p.poemId) && !toReplace.includes(p.poemId)
    );
    const newPoems = selectRandom(available, toReplace.length);

    let newIdx = 0;
    const nextCards = examCards.map(p => {
      if (toReplace.includes(p.poemId) && newIdx < newPoems.length) {
        return newPoems[newIdx++];
      }
      return p;
    });

    // 新しい正解札を選択（入れ替えた札以外から優先）
    const replacedIds = new Set(newPoems.map(p => p.poemId));
    const candidates = nextCards.filter(p => !replacedIds.has(p.poemId));
    const source = candidates.length > 0 ? candidates : nextCards;
    const nextCorrect = source[Math.floor(Math.random() * source.length)];

    setExamCards(nextCards);
    setCorrectPoemId(nextCorrect.poemId);
    setSelectedPoemId(null);
    setIsAnswered(false);
    setIsCorrect(null);
  }, [questionCount, totalQuestions, correctCount, correctPoemId, selectedPoemId, isCorrect, examCards, eligiblePoems, submitExam]);

  /** 再挑戦 */
  const handleReset = useCallback(() => {
    reset();
    setExamCards([]);
    setCorrectPoemId(null);
    setSelectedPoemId(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setQuestionCount(0);
    setCorrectCount(0);
  }, [reset]);

  // 回答後に自動で次の問題へ進む
  useEffect(() => {
    if (isAnswered && phase === 'inProgress') {
      const timer = setTimeout(() => {
        handleNextQuestion();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, phase, handleNextQuestion]);

  const correctPoem = useMemo(
    () => examCards.find(p => p.poemId === correctPoemId) || null,
    [examCards, correctPoemId]
  );

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
              <li>・全{examQuestionCount}問 / {examConfig.passRate}%以上の正答率で合格</li>
              <li>・合格すると{examConfig.nextLevel === 'dan' ? '段位資格を取得' : `${KYUI_LEVEL_LABELS[examConfig.nextLevel]}に昇級`}</li>
            </ul>
          </div>

          <Button onClick={handleStartExam} fullWidth size="lg">
            検定を開始
          </Button>
        </Card>
      )}

      {/* In Progress Phase - 実際のカルタ出題 */}
      {phase === 'inProgress' && examCards.length > 0 && (
        <>
          {/* 進捗バー */}
          <Card padding="sm">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                {questionCount} / {totalQuestions} 問
                <span className="ml-2 font-medium">
                  正解 {correctCount} / 不正解 {questionCount - correctCount}
                </span>
              </span>
              <ControlBar
                showYomiKana={showYomiKana}
                onToggleYomiKana={() => setShowYomiKana(v => !v)}
                showToriKana={showToriKana}
                onToggleToriKana={() => setShowToriKana(v => !v)}
                showKimariji={showKimariji}
                onToggleKimariji={() => setShowKimariji(v => !v)}
              />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(questionCount / totalQuestions) * 100}%` }}
              />
            </div>
          </Card>

          {/* 読み札表示 */}
          {correctPoem && (
            <Card padding="sm" className="text-center">
              {showKimariji && (
                <div className="mb-1 flex justify-center">
                  <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-karuta-accent rounded-full font-bold border border-yellow-200">
                    {correctPoem.kimarijiCount}字決まり「{correctPoem.kimariji}」
                  </span>
                </div>
              )}
              <div className="text-xl font-bold text-gray-900 leading-tight">
                {(() => {
                  const yomiText = showYomiKana ? correctPoem.yomiKana : correctPoem.yomi;
                  if (!showKimariji) return yomiText;
                  // 決まり字部分をハイライト
                  const kimarijiLength = correctPoem.kimarijiCount;
                  let charCount = 0;
                  let splitIndex = 0;
                  for (let i = 0; i < yomiText.length; i++) {
                    if (yomiText[i] !== ' ' && yomiText[i] !== '\u3000') {
                      charCount++;
                      if (charCount === kimarijiLength) {
                        splitIndex = i + 1;
                        break;
                      }
                    } else {
                      splitIndex = i + 1;
                    }
                  }
                  return (
                    <>
                      <span className="text-karuta-tansei font-bold underline decoration-karuta-tansei decoration-2 underline-offset-4">
                        {yomiText.substring(0, splitIndex)}
                      </span>
                      <span>{yomiText.substring(splitIndex)}</span>
                    </>
                  );
                })()}
              </div>
            </Card>
          )}

          {/* 取札グリッド */}
          <KarutaGrid
            poems={examCards}
            showKana={showToriKana}
            selectedPoemId={selectedPoemId}
            correctPoemId={isAnswered ? correctPoemId : undefined}
            wrongPoemId={isAnswered && !isCorrect ? selectedPoemId : undefined}
            disabled={isAnswered}
            onSelect={handleSelectPoem}
            cardCount={gridCardCount}
          />
        </>
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
              <Button onClick={handleReset} className="flex-1">
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
