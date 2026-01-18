import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { KarutaGrid } from '@/components/KarutaGrid';
import type { Poem } from '@/types/poem';
import type { PracticeFilter } from '@/services/practice.service';

export function PracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showKanaOnly, setShowKanaOnly] = useState(false);
  const [showKimariji, setShowKimariji] = useState(false);

  // Parse filter from URL params
  const filter: PracticeFilter | undefined = useMemo(() => {
    const kimarijiParam = searchParams.get('kimariji');
    if (kimarijiParam) {
      const counts = kimarijiParam.split(',').map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 6);
      if (counts.length > 0) {
        return { kimarijiCounts: counts };
      }
    }
    return undefined;
  }, [searchParams]);

  const {
    session,
    currentQuestion,
    startQuestion,
    answerQuestion,
    nextQuestion,
  } = usePracticeSession({ questionCount: 10, filter });

  // Start timer when question loads
  useEffect(() => {
    if (currentQuestion && !currentQuestion.answered && currentQuestion.startTime === 0) {
      startQuestion();
    }
  }, [currentQuestion, startQuestion]);

  // Navigate to result page when session complete
  useEffect(() => {
    if (session.isComplete) {
      navigate('/result', { state: { session, filter } });
    }
  }, [session, navigate, filter]);

  if (!currentQuestion) {
    return (
      <div className="text-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleAnswer = (poem: Poem) => {
    if (currentQuestion.answered) return;

    const index = currentQuestion.choicePoems.findIndex(p => p.poemId === poem.poemId);
    if (index === -1) return;

    answerQuestion(index);

    // Wait a moment to show feedback, then move to next
    setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  const questionNumber = session.currentQuestionIndex + 1;
  const totalQuestions = session.questions.length;

  // ひらがな表示用の読み
  const displayYomi = showKanaOnly ? currentQuestion.poem.yomiKana : currentQuestion.poem.yomi;

  // KarutaGrid用のpoemId
  const correctPoemId = currentQuestion.choicePoems[currentQuestion.correctIndex]?.poemId;
  const selectedPoemId = currentQuestion.selectedIndex !== null
    ? currentQuestion.choicePoems[currentQuestion.selectedIndex]?.poemId
    : null;
  const wrongPoemId = currentQuestion.answered && !currentQuestion.isCorrect
    ? selectedPoemId
    : null;

  // 決まり字を強調表示するための関数
  const renderYomiWithKimariji = () => {
    if (!showKimariji) {
      return <span>{displayYomi}</span>;
    }

    const poem = currentQuestion.poem;
    const kimarijiLength = poem.kimarijiCount;

    // ひらがな表示の場合、yomiKanaの先頭から決まり字の文字数分を強調
    const yomiText = showKanaOnly ? poem.yomiKana : poem.yomi;

    // 決まり字部分を抽出（スペースを除いた文字数でカウント）
    let charCount = 0;
    let splitIndex = 0;
    for (let i = 0; i < yomiText.length; i++) {
      if (yomiText[i] !== ' ' && yomiText[i] !== '　') {
        charCount++;
        if (charCount === kimarijiLength) {
          splitIndex = i + 1;
          break;
        }
      } else {
        splitIndex = i + 1;
      }
    }

    const kimarijiPart = yomiText.substring(0, splitIndex);
    const restPart = yomiText.substring(splitIndex);

    return (
      <>
        <span className="text-karuta-tansei font-bold underline decoration-karuta-tansei decoration-2 underline-offset-4">
          {kimarijiPart}
        </span>
        <span>{restPart}</span>
      </>
    );
  };

  // フィルタ情報の表示
  const filterLabel = filter?.kimarijiCounts
    ? filter.kimarijiCounts.map(n => `${n}字`).join('・')
    : '全て';

  return (
    <div className="max-w-4xl mx-auto py-8 text-neutral-800">
      {/* Progress & Controls */}
      <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-neutral-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-sans text-karuta-tansei">
                {questionNumber} <span className="text-base font-medium text-neutral-400">/ {totalQuestions}</span>
              </span>
            </div>
            {filter && (
              <p className="text-xs text-karuta-tansei font-bold bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                {filterLabel}決まり
              </p>
            )}
          </div>

          {/* トグルボタン群 - Pill shaped */}
          <div className="flex gap-2 bg-neutral-100 p-1 rounded-full">
            {/* 決まり字トグル */}
            <button
              onClick={() => setShowKimariji(!showKimariji)}
              className={`px-4 py-1.5 text-sm font-bold transition-all rounded-full ${showKimariji
                ? 'bg-white text-karuta-accent shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
                }`}
            >
              決まり字
            </button>

            {/* ひらがなトグル */}
            <button
              onClick={() => setShowKanaOnly(!showKanaOnly)}
              className={`px-4 py-1.5 text-sm font-bold transition-all rounded-full ${showKanaOnly
                ? 'bg-white text-karuta-tansei shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
                }`}
            >
              {showKanaOnly ? 'かな' : '漢字'}
            </button>
          </div>
        </div>

        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-karuta-tansei h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(11,139,219,0.5)]"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Yomi (上の句) - Clean & Focus */}
      <div className="card bg-white mb-10 border-0 shadow-lg rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-karuta-tansei"></div>

        <div className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            {showKimariji && (
              <span className="text-xs px-3 py-1 bg-karuta-accent/10 text-karuta-accent rounded-full font-bold border border-karuta-accent/20">
                {currentQuestion.poem.kimarijiCount}字決まり「{currentQuestion.poem.kimariji}」
              </span>
            )}
          </div>

          <p className="text-3xl md:text-4xl font-bold text-neutral-800 leading-normal font-serif py-2">
            {renderYomiWithKimariji()}
          </p>
        </div>

        {/* Result Feedback Overlay - Modern Toast style */}
        {currentQuestion.answered && (
          <div className={`absolute bottom-0 left-0 w-full py-3 text-center font-bold animate-slide-up-fade ${currentQuestion.isCorrect
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
            }`}>
            <span className="text-xl mr-3">{currentQuestion.isCorrect ? 'Excellent! ⭕' : 'Missed... ❌'}</span>
            <span className="text-sm font-mono opacity-90">{currentQuestion.elapsedMs}ms</span>
          </div>
        )}
      </div>

      {/* Tori choices (取札・下の句) - 12枚グリッド */}
      <div>
        <h3 className="text-xs font-bold text-neutral-400 mb-6 text-center tracking-widest uppercase">
          Select the correct card
        </h3>
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showKanaOnly}
          selectedPoemId={selectedPoemId}
          correctPoemId={currentQuestion.answered ? correctPoemId : undefined}
          wrongPoemId={wrongPoemId}
          disabled={currentQuestion.answered}
          onSelect={handleAnswer}
        />
      </div>
    </div>
  );
}
