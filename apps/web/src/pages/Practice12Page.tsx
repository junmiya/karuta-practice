import { useEffect, useCallback } from 'react';
import { KarutaGrid } from '@/components/KarutaGrid';
import { PracticeControls } from '@/components/PracticeControls';
import { usePractice } from '@/hooks/usePractice';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Poem } from '@/types/poem';

export function Practice12Page() {
  const {
    selectedPoems,
    correctPoemId,
    selectedPoemId,
    correctPoem,
    showKana,
    showKimariji,
    kimarijiFilter,
    questionCount,
    correctCount,
    isAnswered,
    isCorrect,
    filteredPoemsCount,
    toggleKana,
    toggleKimariji,
    setKimarijiFilter,
    shuffle,
    selectPoem,
    nextQuestion,
  } = usePractice();

  // Auto-advance to next question after showing result
  useEffect(() => {
    if (isAnswered) {
      const timer = setTimeout(() => {
        nextQuestion();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, nextQuestion]);

  const handleSelectPoem = useCallback((poem: Poem) => {
    if (!isAnswered) {
      selectPoem(poem.poemId);
    }
  }, [isAnswered, selectPoem]);

  // Display yomi with optional kimariji highlight
  const renderYomi = () => {
    if (!correctPoem) return null;

    const yomiTokens = showKana
      ? (correctPoem.yomiKanaTokens || correctPoem.yomiKana.split(/[\s\u3000]+/))
      : (correctPoem.yomiTokens || correctPoem.yomi.split(/[\s\u3000]+/));

    const yomiText = showKana
      ? (correctPoem.yomiKanaNoSpace || correctPoem.yomiKana.replace(/[\s\u3000]+/g, ''))
      : (correctPoem.yomiNoSpace || correctPoem.yomi.replace(/[\s\u3000]+/g, ''));

    if (!showKimariji) {
      return (
        <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-relaxed text-center">
          {yomiTokens.join(' ')}
        </div>
      );
    }

    // Highlight kimariji
    const kimarijiLength = correctPoem.kimarijiCount;
    const kimarijiPart = yomiText.substring(0, kimarijiLength);
    const restPart = yomiText.substring(kimarijiLength);

    return (
      <div className="text-2xl md:text-3xl font-bold leading-relaxed text-center">
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

  return (
    <div className="karuta-container space-y-2 py-2">
      {/* Header - コンパクト1行 */}
      <div className="flex items-center justify-between bg-white/90 border border-gray-200 rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">研鑽</span>
          {questionCount > 0 && (
            <span className="text-xs text-gray-500">
              {correctCount}/{questionCount} ({accuracy}%)
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{filteredPoemsCount}首</span>
      </div>

      {/* Controls */}
      <PracticeControls
        showKana={showKana}
        showKimariji={showKimariji}
        kimarijiFilter={kimarijiFilter}
        onToggleKana={toggleKana}
        onToggleKimariji={toggleKimariji}
        onShuffle={shuffle}
        onKimarijiFilterChange={setKimarijiFilter}
      />

      {/* Yomi display - コンパクト */}
      <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">読札</span>
          {showKimariji && correctPoem && (
            <Badge variant="accent" className="text-xs px-1.5 py-0">
              {correctPoem.kimarijiCount}字「{correctPoem.kimariji}」
            </Badge>
          )}
        </div>

        <div className="py-1">
          {renderYomi()}
        </div>

        {/* Result feedback */}
        <div className={cn(
          "mt-2 py-1.5 rounded text-sm font-bold transition-opacity",
          isAnswered ? "opacity-100" : "opacity-0",
          isAnswered && (isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
        )}>
          {isAnswered ? (isCorrect ? '正解！' : '不正解') : '\u00A0'}
        </div>
      </div>

      {/* 12-card grid */}
      <KarutaGrid
        poems={selectedPoems}
        showKana={showKana}
        selectedPoemId={selectedPoemId}
        correctPoemId={isAnswered ? correctPoemId : null}
        wrongPoemId={isAnswered && !isCorrect ? selectedPoemId : null}
        disabled={isAnswered}
        onSelect={handleSelectPoem}
      />
    </div>
  );
}
