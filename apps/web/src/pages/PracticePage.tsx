import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePracticeSession } from '@/hooks/usePracticeSession';
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

  const handleAnswer = (index: number) => {
    if (currentQuestion.answered) return;

    answerQuestion(index);

    // Wait a moment to show feedback, then move to next
    setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  const questionNumber = session.currentQuestionIndex + 1;
  const totalQuestions = session.questions.length;

  // 表示する選択肢（ひらがなON/OFFに応じて切り替え）
  const displayChoices = showKanaOnly ? currentQuestion.choiceKanas : currentQuestion.choices;
  const displayYomi = showKanaOnly ? currentQuestion.poem.yomiKana : currentQuestion.poem.yomi;

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
        <span className="text-karuta-ukon font-bold underline decoration-karuta-ukon decoration-2 underline-offset-4">
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
    <div className="max-w-3xl mx-auto py-6">
      {/* Progress & Controls */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif text-karuta-shikon">問 {questionNumber}</span>
              <span className="text-sm text-neutral-500">/ {totalQuestions}</span>
            </div>
            {filter && (
              <p className="text-xs text-karuta-ukon font-medium mt-1">
                {filterLabel}決まり
              </p>
            )}
          </div>

          {/* トグルボタン群 */}
          <div className="flex gap-2">
            {/* 決まり字トグル */}
            <button
              onClick={() => setShowKimariji(!showKimariji)}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-sm border ${showKimariji
                ? 'bg-karuta-ukon text-white border-karuta-ukon shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-karuta-ukon hover:text-karuta-ukon'
                }`}
              title={showKimariji ? '決まり字を隠す' : '決まり字を表示'}
            >
              決
            </button>

            {/* ひらがなトグル */}
            <button
              onClick={() => setShowKanaOnly(!showKanaOnly)}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-sm border ${showKanaOnly
                ? 'bg-karuta-shikon text-white border-karuta-shikon shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-karuta-shikon hover:text-karuta-shikon'
                }`}
              title={showKanaOnly ? '漢字表示に切り替え' : 'ひらがな表示に切り替え'}
            >
              {showKanaOnly ? 'あ' : '漢'}
            </button>
          </div>
        </div>

        <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden">
          <div
            className="bg-karuta-shikon h-full transition-all duration-500 ease-out"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Yomi (上の句) */}
      <div className="card bg-white mb-8 border-t-4 border-karuta-shikon shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
          <h2 className="text-sm text-neutral-500 font-serif tracking-wider">読札（上の句）</h2>
          {showKimariji && (
            <span className="text-xs px-2 py-1 bg-karuta-ukon text-white rounded-sm font-medium">
              {currentQuestion.poem.kimarijiCount}字決まり「{currentQuestion.poem.kimariji}」
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-karuta-shikon leading-relaxed font-serif py-4 text-center">
          {renderYomiWithKimariji()}
        </p>

        {/* Result Feedback Overlay */}
        {currentQuestion.answered && (
          <div className={`mt-2 p-3 rounded-sm text-center font-bold animate-fade-in ${currentQuestion.isCorrect
            ? 'bg-green-50 text-green-800 border-l-4 border-green-600'
            : 'bg-red-50 text-red-800 border-l-4 border-red-600'
            }`}>
            <span className="text-lg mr-2">{currentQuestion.isCorrect ? '正解 ⭕' : '不正解 ❌'}</span>
            <span className="text-sm font-normal opacity-75">{currentQuestion.elapsedMs}ms</span>
          </div>
        )}
      </div>

      {/* Tori choices (取札・下の句) */}
      <div>
        <h3 className="text-sm text-neutral-500 mb-4 text-center font-serif tracking-wider">
          ― 取札を選択 ―
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {displayChoices.map((choice, index) => {
            const isSelected = currentQuestion.selectedIndex === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showResult = currentQuestion.answered;

            let buttonClass = 'relative karuta-card border transition-all p-1 overflow-hidden rounded-sm ';

            if (showResult) {
              if (isCorrect) {
                // Correct answer highlight
                buttonClass += 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200 ';
              } else if (isSelected) {
                // Wrong selection highlight
                buttonClass += 'border-red-500 bg-red-50 shadow-md ring-2 ring-red-200 ';
              } else {
                // Dim others
                buttonClass += 'border-neutral-200 bg-neutral-100 opacity-40 grayscale ';
              }
            } else {
              // Normal state
              buttonClass += 'border-neutral-300 bg-white hover:border-karuta-ukon hover:shadow-lg hover:-translate-y-0.5 cursor-pointer hover:z-10 ';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={currentQuestion.answered}
                className={buttonClass}
              >
                {!showResult && <span className="absolute top-1 left-1 text-[10px] text-neutral-300 font-sans">{index + 1}</span>}
                <div className="karuta-card-container border border-neutral-100/50 h-full w-full">
                  {choice.split('　').reverse().map((line, i) => (
                    <div key={i} className="karuta-line text-karuta-black">
                      {line}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
