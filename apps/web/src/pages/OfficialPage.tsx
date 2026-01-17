/**
 * Official competition page - 50 questions with 12-card grid
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KarutaGrid } from '@/components/KarutaGrid';
import { useOfficialSession } from '@/hooks/useOfficialSession';
import { getActiveSeason, getUserEntry } from '@/services/entry.service';
import type { Poem } from '@/types/poem';

export function OfficialPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showKana, setShowKana] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // Timer ref for tracking elapsed time
  // const timerRef = useRef<number>(0);

  // Initialize session data
  useEffect(() => {
    async function init() {
      if (!user) return;

      const season = await getActiveSeason();
      if (!season) {
        navigate('/entry');
        return;
      }

      const entry = await getUserEntry(user.uid, season.seasonId);
      if (!entry) {
        navigate('/entry');
        return;
      }

      setSeasonId(season.seasonId);
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
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
          <button onClick={() => navigate('/profile')} className="btn-primary">
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!initialized || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p>セッション準備中...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">エラー</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // Result state
  if (result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          {result.status === 'confirmed' ? (
            <>
              <h1 className="text-3xl font-bold mb-4 text-green-600">確定</h1>
              <div className="text-6xl font-bold mb-4">{result.score}</div>
              <p className="text-gray-600 mb-2">点</p>
              <div className="text-lg mb-6">
                正答: {stats.correctCount}/50 ({stats.accuracy}%)
              </div>
            </>
          ) : result.status === 'invalid' ? (
            <>
              <h1 className="text-3xl font-bold mb-4 text-red-600">無効</h1>
              <p className="text-gray-600 mb-4">
                セッションは無効と判定されました。
              </p>
              {result.reasons && (
                <div className="text-sm text-red-500">
                  理由: {result.reasons.join(', ')}
                </div>
              )}
            </>
          ) : result.status === 'expired' ? (
            <>
              <h1 className="text-3xl font-bold mb-4 text-orange-600">期限切れ</h1>
              <p className="text-gray-600 mb-4">
                セッションの制限時間（60分）を超過しました。
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-4 text-red-600">エラー</h1>
              <p className="text-gray-600 mb-4">{result.message}</p>
            </>
          )}

          <div className="flex gap-4 justify-center mt-6">
            <button onClick={() => navigate('/banzuke')} className="btn-primary">
              番付を見る
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete state - ready to submit
  if (isComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">50問完了</h1>
          <div className="text-lg mb-6">
            <p>正答: {stats.correctCount}/50 ({stats.accuracy}%)</p>
            <p>合計時間: {Math.round(stats.totalElapsedMs / 1000)}秒</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary text-lg px-8 py-4"
          >
            {isSubmitting ? '提出中...' : '結果を確定する'}
          </button>

          <p className="mt-4 text-sm text-gray-500">
            確定ボタンを押すとサーバーで検証され、公式記録として登録されます
          </p>
        </div>
      </div>
    );
  }

  // Active question state
  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p>問題を準備中...</p>
      </div>
    );
  }

  const progress = ((currentRoundIndex + 1) / 50) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">公式競技</h1>
          <p className="text-sm text-gray-500">
            問 {currentRoundIndex + 1} / 50
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            正答: {stats.correctCount}/{stats.totalCount}
          </p>
          <button
            onClick={() => setShowKana(!showKana)}
            className={`mt-1 px-3 py-1 text-xs rounded ${showKana
              ? 'bg-karuta-red text-white'
              : 'bg-gray-100 text-gray-600'
              }`}
          >
            {showKana ? 'ひらがな' : '漢字'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-karuta-red h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Yomi display */}
      <div className="card bg-white mb-6">
        <h2 className="text-sm text-gray-500 mb-2">読札（上の句）</h2>
        <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-relaxed text-center">
          {showKana
            ? currentQuestion.poem.yomiKana
            : currentQuestion.poem.yomi}
        </div>
      </div>

      {/* 12-card grid */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-500 mb-2 text-center">
          取札を選んでください（12枚）
        </h3>
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showKana}
          onSelect={handleSelectPoem}
        />
      </div>
    </div>
  );
}
