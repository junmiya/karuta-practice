/**
 * Kyui-level match page - variable question counts and card grids by level
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KarutaGrid } from '@/components/KarutaGrid';
import { useKyuiMatch } from '@/hooks/useKyuiMatch';
import { getUserEntry } from '@/services/entry.service';
import { getCurrentSeason } from '@/services/stage1.service';
import { getUserProgress } from '@/services/utaawase.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { ControlBar } from '@/components/ControlBar';
import type { Poem } from '@/types/poem';
import type { SeasonStatus } from '@/types/entry';
import type { KyuiLevel } from '@/types/utaawase';
import { KYUI_LEVEL_LABELS, KYUI_MATCH_CONFIG, KYUI_MATCH_LABELS } from '@/types/utaawase';

export function KyuiMatchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Get kyui level from URL params, default to user's current level
  const levelParam = searchParams.get('level') as KyuiLevel | null;

  const [kyuiLevel, setKyuiLevel] = useState<KyuiLevel | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasonStatus, setSeasonStatus] = useState<SeasonStatus | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<'yomi' | 'tori' | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'countdown' | 'playing'>('waiting');
  const [countdown, setCountdown] = useState(0);

  // Initialize session data
  useEffect(() => {
    async function init() {
      if (!user) return;

      const season = await getCurrentSeason();
      if (!season) {
        navigate('/utaawase');
        return;
      }

      if (season.status === 'archived') {
        navigate('/utaawase');
        return;
      }

      const entry = await getUserEntry(user.uid, season.seasonId);
      if (!entry) {
        navigate('/entry');
        return;
      }

      // Get user's kyui level
      const progress = await getUserProgress(user.uid);
      const userKyuiLevel = progress?.kyuiLevel || 'beginner';

      // Use level from URL param if valid, otherwise use user's current level
      const targetLevel = levelParam && Object.keys(KYUI_MATCH_CONFIG).includes(levelParam)
        ? levelParam
        : userKyuiLevel;

      setKyuiLevel(targetLevel);
      setSeasonId(season.seasonId);
      setSeasonStatus(season.status);
      setEntryId(`${user.uid}_${season.seasonId}`);
      setInitialized(true);
    }

    if (!authLoading && user) {
      init();
    }
  }, [user, authLoading, navigate, levelParam]);

  // Hook must be called unconditionally
  const session = useKyuiMatch({
    uid: user?.uid || '',
    seasonId: seasonId || '',
    entryId: entryId || '',
    kyuiLevel: kyuiLevel || 'beginner',
  });

  const {
    currentQuestion,
    currentRoundIndex,
    isLoading,
    isSubmitting,
    error,
    result,
    isComplete,
    stats,
    config,
    startSession,
    answerQuestion,
    submitForConfirmation,
  } = session;

  // Create session when initialized (but don't start playing yet)
  useEffect(() => {
    if (initialized && kyuiLevel && !session.sessionId && !isLoading) {
      startSession();
    }
  }, [initialized, kyuiLevel, session.sessionId, isLoading, startSession]);

  // Handle start button press
  const handleStart = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown' || countdown <= 0) return;
    const timer = setTimeout(() => {
      const next = countdown - 1;
      setCountdown(next);
      if (next <= 0) {
        setPhase('playing');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Handle card selection
  const handleSelectPoem = useCallback(
    (poem: Poem) => {
      answerQuestion(poem.poemId);
    },
    [answerQuestion]
  );

  // Handle session submission
  const handleSubmit = () => {
    submitForConfirmation();
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="karuta-container text-center py-2">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="karuta-container py-2">
        <Card className="text-center">
          <Heading as="h1" size="h2" className="mb-4">ログインが必要です</Heading>
          <Button onClick={() => navigate('/profile')}>
            ログインページへ
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!initialized || isLoading || !kyuiLevel) {
    return (
      <div className="karuta-container text-center py-2">
        <p>セッション準備中...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="karuta-container py-2">
        <Card className="text-center border-red-200 bg-red-50">
          <Heading as="h1" size="h2" className="mb-4 text-red-600">エラー</Heading>
          <Text className="mb-4 text-red-800">{error}</Text>
          <Button onClick={() => navigate('/')} variant="secondary">
            ホームに戻る
          </Button>
        </Card>
      </div>
    );
  }

  // Result state
  if (result) {
    return (
      <div className="karuta-container py-2">
        <Card className="text-center">
          {result.status === 'confirmed' ? (
            <>
              <Heading as="h1" size="h1" className="mb-4 text-green-600">確定</Heading>
              <div className="text-6xl font-bold mb-4 text-karuta-tansei">{result.score}<span className="text-2xl font-normal text-gray-500 ml-1">点</span></div>
              <div className="text-lg mb-6">
                正答: {stats.correctCount}/{config.questionCount} ({stats.accuracy}%)
              </div>
              <Badge variant="info" className="mb-4">
                {KYUI_LEVEL_LABELS[kyuiLevel]} - {KYUI_MATCH_LABELS[kyuiLevel]}
              </Badge>
            </>
          ) : result.status === 'invalid' ? (
            <>
              <Heading as="h1" size="h1" className="mb-4 text-red-600">無効</Heading>
              <Text className="mb-4">
                セッションは無効と判定されました。
              </Text>
              {result.reasons && (
                <div className="text-sm text-red-500">
                  理由: {result.reasons.join(', ')}
                </div>
              )}
            </>
          ) : result.status === 'expired' ? (
            <>
              <Heading as="h1" size="h1" className="mb-4 text-orange-600">期限切れ</Heading>
              <Text className="mb-4">
                セッションの制限時間を超過しました。
              </Text>
            </>
          ) : (
            <>
              <Heading as="h1" size="h1" className="mb-4 text-red-600">エラー</Heading>
              <Text className="mb-4">{result.message}</Text>
            </>
          )}

          <div className="flex gap-2 justify-center mt-6">
            <Button onClick={() => navigate('/utakurai')}>
              番付を見る
            </Button>
            <Button onClick={() => navigate('/')} variant="secondary">
              ホームに戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Complete state - ready to submit
  if (isComplete) {
    return (
      <div className="karuta-container py-2">
        <Card className="text-center">
          <Heading as="h1" size="h2" className="mb-4">{config.questionCount}問完了</Heading>
          <Badge variant="info" className="mb-4">
            {KYUI_LEVEL_LABELS[kyuiLevel]} - {KYUI_MATCH_LABELS[kyuiLevel]}
          </Badge>
          <div className="text-lg mb-6 text-gray-700">
            <p>正答: {stats.correctCount}/{config.questionCount} ({stats.accuracy}%)</p>
            <p>合計時間: {Math.round(stats.totalElapsedMs / 1000)}秒</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="px-8 py-4"
          >
            {isSubmitting ? '提出中...' : '結果を確定する'}
          </Button>

          <Text size="sm" color="muted" className="mt-4">
            確定ボタンを押すとサーバーで検証され、公式記録として登録されます
          </Text>
        </Card>
      </div>
    );
  }

  // Active question state
  if (!currentQuestion) {
    return (
      <div className="karuta-container text-center py-2">
        <p>問題を準備中...</p>
      </div>
    );
  }

  const progress = ((currentRoundIndex + 1) / config.questionCount) * 100;
  const kimarijiRangeText = config.maxKimariji === 1
    ? '1字決まり'
    : `1-${config.maxKimariji}字決まり`;

  // Waiting phase: show start button, settings, and grid preview
  if (phase === 'waiting') {
    return (
      <div className="karuta-container space-y-2 py-2">
        <div className="text-center">
          <Heading as="h1" size="h2" className="mb-2">{KYUI_MATCH_LABELS[kyuiLevel]}</Heading>
          <Badge variant="info" className="mb-2">{KYUI_LEVEL_LABELS[kyuiLevel]}</Badge>
          <Text size="sm" color="muted" className="mb-4">
            {config.questionCount}問・{config.cardCount}枚・{kimarijiRangeText}
          </Text>
        </div>

        {/* Display settings + Start button */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <Text size="sm" color="muted" className="mb-1">表示設定</Text>
              <ControlBar
                showYomiKana={showYomiKana}
                onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
                showToriKana={showToriKana}
                onToggleToriKana={() => setShowToriKana(!showToriKana)}
              />
            </div>
            <Button onClick={handleStart} size="lg" className="px-8 py-3 text-lg">
              開始
            </Button>
          </div>
        </Card>

        {/* Grid preview */}
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showToriKana}
          cardCount={config.cardCount}
          disabled
          onSelect={() => {}}
        />
      </div>
    );
  }

  // Countdown phase: show countdown number over the grid
  if (phase === 'countdown') {
    return (
      <div className="karuta-container space-y-2 py-2">
        <div className="text-center py-8">
          <Text size="sm" color="muted" className="mb-2">{KYUI_MATCH_LABELS[kyuiLevel]}</Text>
          <div className="text-8xl font-bold text-karuta-red animate-pulse">
            {countdown}
          </div>
        </div>

        {/* Grid visible but disabled during countdown */}
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showToriKana}
          cardCount={config.cardCount}
          disabled
          onSelect={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heading as="h1" size="h2">{KYUI_MATCH_LABELS[kyuiLevel]}</Heading>
            {seasonStatus === 'frozen' && (
              <Badge variant="warning" className="text-xs">集計中</Badge>
            )}
            {seasonStatus === 'finalized' && (
              <Badge variant="info" className="text-xs">確定済</Badge>
            )}
          </div>
          <Text size="sm" color="muted">
            問 {currentRoundIndex + 1} / {config.questionCount} ・ 正答: {stats.correctCount}/{stats.totalCount}
          </Text>
        </div>
        <ControlBar
          showYomiKana={showYomiKana}
          onToggleYomiKana={() => setPendingToggle('yomi')}
          showToriKana={showToriKana}
          onToggleToriKana={() => setPendingToggle('tori')}
        />
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-karuta-red h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Yomi display */}
      <Card className="text-center">
        <Text size="sm" color="muted" className="mb-2">読札（上の句）</Text>
        <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-relaxed">
          {showYomiKana
            ? currentQuestion.poem.yomiKana
            : currentQuestion.poem.yomi}
        </div>
      </Card>

      {/* Card grid */}
      <div>
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showToriKana}
          cardCount={config.cardCount}
          onSelect={handleSelectPoem}
        />
      </div>

      {/* Kana Toggle Confirmation Dialog */}
      {pendingToggle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-sm mx-4">
            <Heading as="h3" size="h3" className="mb-4">表示切替の確認</Heading>
            <Text color="muted" className="mb-6">
              公式歌合中の表示変更は記録の公平性に影響する可能性があります。
              {pendingToggle === 'yomi' ? '読札' : '取札'}を
              {pendingToggle === 'yomi'
                ? (showYomiKana ? '漢字表示' : 'ひらがな表示')
                : (showToriKana ? '漢字表示' : 'ひらがな表示')}
              に切り替えますか？
            </Text>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (pendingToggle === 'yomi') {
                    setShowYomiKana(!showYomiKana);
                  } else {
                    setShowToriKana(!showToriKana);
                  }
                  setPendingToggle(null);
                }}
                className="flex-1"
              >
                切り替える
              </Button>
              <Button
                onClick={() => setPendingToggle(null)}
                variant="secondary"
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
