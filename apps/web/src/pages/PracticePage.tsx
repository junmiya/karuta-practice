import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { KarutaGrid } from '@/components/KarutaGrid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ControlBar } from '@/components/ControlBar';
import { POEM_RANGES } from '@/components/PoemRangeSelector';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';
import type { PracticeFilter } from '@/services/practice.service';

export function PracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showYomiKana, setShowYomiKana] = useState(false);
  const [showToriKana, setShowToriKana] = useState(false);
  const [showKimariji, setShowKimariji] = useState(false);

  // Parse filter from URL params
  const filter: PracticeFilter | undefined = useMemo(() => {
    const result: PracticeFilter = {};

    // Parse kimariji filter
    const kimarijiParam = searchParams.get('kimariji');
    if (kimarijiParam) {
      const counts = kimarijiParam.split(',').map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 6);
      if (counts.length > 0) {
        result.kimarijiCounts = counts;
      }
    }

    // Parse poem range filter (format: range=1-20,21-40)
    const rangeParam = searchParams.get('range');
    if (rangeParam) {
      const ranges = rangeParam.split(',').map(r => {
        const [start, end] = r.split('-').map(Number);
        return { start, end };
      }).filter(r => !isNaN(r.start) && !isNaN(r.end) && r.start >= 1 && r.end <= 100);
      if (ranges.length > 0) {
        result.poemRanges = ranges;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
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
      <div className="karuta-container space-y-2 py-2 text-center">
        <p>読み込み中...</p>
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
  const displayYomi = showYomiKana ? currentQuestion.poem.yomiKana : currentQuestion.poem.yomi;

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
    const yomiText = showYomiKana ? poem.yomiKana : poem.yomi;

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
  const filterLabels: string[] = [];
  if (filter?.kimarijiCounts) {
    filterLabels.push(filter.kimarijiCounts.map(n => `${n}字`).join('・'));
  }
  if (filter?.poemRanges) {
    const rangeLabels = filter.poemRanges.map(r => {
      const predefined = POEM_RANGES.find(pr => pr.start === r.start && pr.end === r.end);
      return predefined ? predefined.label : `${r.start}-${r.end}`;
    });
    filterLabels.push(rangeLabels.join('・'));
  }
  const filterLabel = filterLabels.length > 0 ? filterLabels.join(' / ') : '全て';

  return (
    <div className="karuta-container space-y-2 py-2 text-foreground">
      {/* Progress & Controls */}
      <Card className="mb-1 p-1 bg-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold font-sans text-karuta-tansei">
                {questionNumber} <span className="text-xs font-medium text-neutral-400">/ {totalQuestions}</span>
              </span>
            </div>
            {filter && (
              <Badge variant="info" className="mt-0">
                {filterLabel}
              </Badge>
            )}
          </div>

          {/* コントロールバー */}
          <ControlBar
            showYomiKana={showYomiKana}
            onToggleYomiKana={() => setShowYomiKana(!showYomiKana)}
            showToriKana={showToriKana}
            onToggleToriKana={() => setShowToriKana(!showToriKana)}
            showKimariji={showKimariji}
            onToggleKimariji={() => setShowKimariji(!showKimariji)}
          />
        </div>

        <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden">
          <div
            className="bg-karuta-tansei h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(25,106,171,0.5)]"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </Card>

      {/* Yomi (上の句) - Compact */}
      <Card className="mb-1 p-0 relative overflow-hidden text-center border-0 shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-karuta-tansei"></div>

        <div className="px-2 py-2">
          {showKimariji && (
            <div className="mb-1 flex justify-center">
              <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-karuta-accent rounded-full font-bold border border-yellow-200">
                {currentQuestion.poem.kimarijiCount}字決まり「{currentQuestion.poem.kimariji}」
              </span>
            </div>
          )}

          <p className="text-lg md:text-xl font-bold text-neutral-800 leading-normal font-serif">
            {renderYomiWithKimariji()}
          </p>
        </div>

        {/* Result Feedback Overlay - Modern Toast style */}
        {currentQuestion.answered && (
          <div className={cn(
            "absolute bottom-0 left-0 w-full py-2 text-center font-bold animate-slide-up-fade",
            currentQuestion.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}>
            <span className="text-base mr-2">{currentQuestion.isCorrect ? '正解 ⭕' : '不正解 ❌'}</span>
            <span className="text-xs font-mono opacity-90">{currentQuestion.elapsedMs}ms</span>
          </div>
        )}
      </Card>

      {/* Tori choices (取札・下の句) - 12枚グリッド */}
      <div>
        <KarutaGrid
          poems={currentQuestion.choicePoems}
          showKana={showToriKana}
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
