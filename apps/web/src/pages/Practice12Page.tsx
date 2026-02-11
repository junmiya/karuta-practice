import { useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KarutaGrid } from '@/components/KarutaGrid';
import { usePractice } from '@/hooks/usePractice';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';
import type { PoemRange } from '@/components/PoemRangeSelector';

export function Practice12Page() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // mode=renshu for 練習 (manual advance), otherwise 研鑽 (auto-advance)
  const isRenshuMode = searchParams.get('mode') === 'renshu';

  // ページロード時にナビゲーションヘッダーを過ぎた位置にスクロール
  useEffect(() => {
    // ヘッダーの高さ分スクロール（約48px + 余白）
    window.scrollTo({ top: 56, behavior: 'instant' });
  }, []);

  // Parse initial filters and display options from URL
  const initialOptions = useMemo(() => {
    const result: {
      kimarijiFilter?: number[];
      poemRangeFilter?: PoemRange[];
      showYomiKana?: boolean;
      showToriKana?: boolean;
      showKimariji?: boolean;
    } = {};

    const kimarijiParam = searchParams.get('kimariji');
    if (kimarijiParam) {
      const counts = kimarijiParam.split(',').map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 6);
      if (counts.length > 0) {
        result.kimarijiFilter = counts;
      }
    }

    const rangeParam = searchParams.get('range');
    if (rangeParam) {
      const ranges = rangeParam.split(',').map(r => {
        const [start, end] = r.split('-').map(Number);
        return { start, end, label: `${start}-${end}` };
      }).filter(r => !isNaN(r.start) && !isNaN(r.end) && r.start >= 1 && r.end <= 100);
      if (ranges.length > 0) {
        result.poemRangeFilter = ranges;
      }
    }

    // Display options
    result.showYomiKana = searchParams.get('yomiKana') === '1';
    result.showToriKana = searchParams.get('toriKana') === '1';
    result.showKimariji = searchParams.get('kimariji_show') === '1';

    return result;
  }, [searchParams]);

  const {
    selectedPoems,
    correctPoemId,
    selectedPoemId,
    correctPoem,
    showYomiKana,
    showToriKana,
    showKimariji,
    questionCount,
    correctCount,
    isAnswered,
    isCorrect,
    isCompleted,
    filteredPoemsCount,
    maxQuestions,
    selectPoem,
    nextQuestion,
  } = usePractice({
    initialKimarijiFilter: initialOptions.kimarijiFilter,
    initialPoemRangeFilter: initialOptions.poemRangeFilter,
    initialShowYomiKana: initialOptions.showYomiKana,
    initialShowToriKana: initialOptions.showToriKana,
    initialShowKimariji: initialOptions.showKimariji,
  });

  // Auto-advance to next question after showing result (研鑽 mode only)
  useEffect(() => {
    if (isAnswered && !isRenshuMode && !isCompleted) {
      const timer = setTimeout(() => {
        nextQuestion();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, nextQuestion, isRenshuMode, isCompleted]);

  const handleSelectPoem = useCallback((poem: Poem) => {
    if (!isAnswered) {
      selectPoem(poem.poemId);
    }
  }, [isAnswered, selectPoem]);

  // Display yomi with optional kimariji highlight
  const renderYomi = () => {
    if (!correctPoem) return null;

    const yomiTokens = showYomiKana
      ? (correctPoem.yomiKanaTokens || correctPoem.yomiKana.split(/[\s\u3000]+/))
      : (correctPoem.yomiTokens || correctPoem.yomi.split(/[\s\u3000]+/));

    const yomiText = showYomiKana
      ? (correctPoem.yomiKanaNoSpace || correctPoem.yomiKana.replace(/[\s\u3000]+/g, ''))
      : (correctPoem.yomiNoSpace || correctPoem.yomi.replace(/[\s\u3000]+/g, ''));

    if (!showKimariji) {
      return (
        <div className="text-xl md:text-2xl font-bold text-gray-900 leading-tight text-center">
          {yomiTokens.join(' ')}
        </div>
      );
    }

    // Highlight kimariji
    const kimarijiLength = correctPoem.kimarijiCount;
    const kimarijiPart = yomiText.substring(0, kimarijiLength);
    const restPart = yomiText.substring(kimarijiLength);

    return (
      <div className="text-xl md:text-2xl font-bold leading-tight text-center">
        <span className="text-karuta-red underline decoration-karuta-red decoration-2 underline-offset-4">
          {kimarijiPart}
        </span>
        <span className="text-gray-900">{restPart}</span>
      </div>
    );
  };

  const accuracy = questionCount > 0
    ? Math.round((correctCount / questionCount) * 100)
    : 0;

  // 50問終了時の結果画面
  if (isCompleted) {
    return (
      <div className="karuta-container space-y-4 py-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isRenshuMode ? '練習' : '研鑽'}終了
          </h2>
          <div className="space-y-2 mb-6">
            <p className="text-3xl font-bold text-karuta-red">
              {correctCount} / {maxQuestions}
            </p>
            <p className="text-lg text-gray-600">
              正解率 {accuracy}%
            </p>
          </div>
          <Button
            onClick={() => navigate('/keiko')}
            className="bg-karuta-red hover:bg-karuta-red/90 text-white px-6 py-2"
          >
            稽古に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header - コンパクト1行 */}
      <div className="flex items-center justify-between bg-white/90 border border-gray-200 rounded-lg px-3 py-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-bold",
            isRenshuMode ? "text-karuta-red" : "text-karuta-accent"
          )}>
            {isRenshuMode ? '練習' : '研鑽'}
          </span>
          <span className="text-xs text-gray-500">
            {questionCount}/{maxQuestions}問 正解{correctCount} ({accuracy}%)
          </span>
        </div>
        <span className="text-xs text-gray-400">{filteredPoemsCount}首</span>
      </div>

      {/* Yomi display - コンパクト */}
      <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-center">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">読札</span>
          {showKimariji && correctPoem && (
            <Badge variant="accent" className="text-xs px-1.5 py-0">
              {correctPoem.kimarijiCount}字「{correctPoem.kimariji}」
            </Badge>
          )}
        </div>

        <div className="py-0.5">
          {renderYomi()}
        </div>

        {/* Result feedback */}
        <div className={cn(
          "mt-1 py-1.5 rounded text-sm font-bold flex items-center justify-center gap-4",
          isAnswered && (isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"),
          !isAnswered && "bg-transparent"
        )}>
          <span className={cn(
            "transition-opacity",
            isAnswered ? "opacity-100" : "opacity-0"
          )}>
            {isAnswered ? (isCorrect ? '正解！' : '不正解') : '\u00A0'}
          </span>
          {isRenshuMode && (
            <Button
              onClick={nextQuestion}
              disabled={!isAnswered}
              className={cn(
                "px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-200",
                isAnswered
                  ? "bg-karuta-red hover:bg-karuta-red/90 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                  : "bg-gray-200 text-gray-400 opacity-0 cursor-default"
              )}
            >
              次へ
            </Button>
          )}
        </div>
      </div>

      {/* 12-card grid */}
      <KarutaGrid
        poems={selectedPoems}
        showKana={showToriKana}
        selectedPoemId={selectedPoemId}
        correctPoemId={isAnswered ? correctPoemId : null}
        wrongPoemId={isAnswered && !isCorrect ? selectedPoemId : null}
        disabled={isAnswered}
        onSelect={handleSelectPoem}
      />
    </div>
  );
}
