/**
 * Official competition page - 50 questions with 12-card grid
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KarutaGrid } from '@/components/KarutaGrid';
import { useOfficialSession } from '@/hooks/useOfficialSession';
import { getUserEntry } from '@/services/entry.service';
import { getCurrentSeason } from '@/services/stage1.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { ControlBar } from '@/components/ControlBar';
import type { Poem } from '@/types/poem';
import type { SeasonStatus } from '@/types/entry';

export function OfficialPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasonStatus, setSeasonStatus] = useState<SeasonStatus | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [pendingToggle, setPendingToggle] = useState<'yomi' | 'tori' | null>(null);

  // Initialize session data
  useEffect(() => {
    async function init() {
      if (!user) return;

      const season = await getCurrentSeason();
      if (!season) {
        navigate('/entry');
        return;
      }

      // シーズンがアーカイブ済みの場合はエントリーページへ
      if (season.status === 'archived') {
        navigate('/entry');
        return;
      }

      const entry = await getUserEntry(user.uid, season.seasonId);
      if (!entry) {
        navigate('/entry');
        return;
      }

      setSeasonId(season.seasonId);
      setSeasonStatus(season.status);
      setEntryId(`${user.uid}_${season.seasonId}`);
      setInitialized(true);
    }

    if (!authLoading && user) {
      init();
    }
  }, [user, authLoading, navigate]);

  // Hook must be called unconditionally
  const session = useOfficialSession({
    uid: user?.uid || '',
    seasonId: seasonId || '',
    entryId: entryId || '',
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
    startSession,
    answerQuestion,
    submitForConfirmation,
  } = session;

  // Start session when initialized
  useEffect(() => {
    if (initialized && !session.sessionId && !isLoading) {
      startSession();
    }
  }, [initialized, session.sessionId, isLoading, startSession]);

  // Start timer when new question appears
  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(performance.now());
    }
  }, [currentQuestion?.roundIndex]);

  // Handle card selection
  const handleSelectPoem = useCallback(
    (poem: Poem) => {
      const elapsedMs = Math.round(performance.now() - questionStartTime);
      answerQuestion(poem.poemId, elapsedMs);
    },
    [questionStartTime, answerQuestion]
  );

  // Handle session submission
  const handleSubmit = () => {
    submitForConfirmation();
    // Result will be stored in state and shown in the UI
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
  if (!initialized || isLoading) {
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
              <div className="text-6xl font-bold mb-4 text-karuta-tansei">{result.score}</div>
              <Text color="muted" className="mb-2">点</Text>
              <div className="text-lg mb-6">
                正答: {stats.correctCount}/50 ({stats.accuracy}%)
              </div>
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
                セッションの制限時間（60分）を超過しました。
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
          <Heading as="h1" size="h2" className="mb-4">50問完了</Heading>
          <div className="text-lg mb-6 text-gray-700">
            <p>正答: {stats.correctCount}/50 ({stats.accuracy}%)</p>
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

  const progress = ((currentRoundIndex + 1) / 50) * 100;

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heading as="h1" size="h2">公式競技</Heading>
            {seasonStatus === 'frozen' && (
              <Badge variant="warning" className="text-xs">集計中</Badge>
            )}
            {seasonStatus === 'finalized' && (
              <Badge variant="info" className="text-xs">確定済</Badge>
            )}
          </div>
          <Text size="sm" color="muted">
            問 {currentRoundIndex + 1} / 50 ・ 正答: {stats.correctCount}/{stats.totalCount}
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

      {/* 12-card grid */}
      <div>
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showToriKana}
          onSelect={handleSelectPoem}
        />
      </div>

      {/* Kana Toggle Confirmation Dialog */}
      {pendingToggle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-sm mx-4">
            <Heading as="h3" size="h3" className="mb-4">表示切替の確認</Heading>
            <Text color="muted" className="mb-6">
              公式競技中の表示変更は記録の公平性に影響する可能性があります。
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
