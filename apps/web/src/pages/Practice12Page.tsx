import { useEffect, useCallback } from 'react';
import { KarutaGrid } from '@/components/KarutaGrid';
import { PracticeControls } from '@/components/PracticeControls';
import { usePractice } from '@/hooks/usePractice';
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header with stats */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">12枚練習</h1>
          <p className="text-sm text-gray-500">
            {questionCount > 0 && (
              <>正解: {correctCount}/{questionCount} ({accuracy}%)</>
            )}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          対象: {filteredPoemsCount}首
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <PracticeControls
          showKana={showKana}
          showKimariji={showKimariji}
          kimarijiFilter={kimarijiFilter}
          onToggleKana={toggleKana}
          onToggleKimariji={toggleKimariji}
          onShuffle={shuffle}
          onKimarijiFilterChange={setKimarijiFilter}
        />
      </div>

      {/* Yomi display */}
      <div className="card bg-white mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm text-gray-500">読札（上の句）</h2>
          {showKimariji && correctPoem && (
            <span className="text-xs px-2 py-1 bg-karuta-gold text-white rounded">
              {correctPoem.kimarijiCount}字決まり「{correctPoem.kimariji}」
            </span>
          )}
        </div>
        {renderYomi()}

        {/* Result feedback */}
        {isAnswered && (
          <div className={`mt-4 p-3 rounded text-center font-medium ${
            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isCorrect ? '正解！' : '不正解'}
          </div>
        )}
      </div>

      {/* 12-card grid */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-500 mb-2 text-center">取札を選んでください（12枚）</h3>
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
    </div>
  );
}
