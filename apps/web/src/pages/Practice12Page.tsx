import { useEffect, useCallback } from 'react';
import { KarutaGrid } from '@/components/KarutaGrid';
import { PracticeControls } from '@/components/PracticeControls';
import { usePractice } from '@/hooks/usePractice';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Heading, Text } from '@/components/ui/Typography';
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
    <Container className="py-6 space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1" size="h2">研鑽モード</Heading>
          <Text color="muted" size="sm">
            {questionCount > 0 && (
              <>正解: {correctCount}/{questionCount} ({accuracy}%)</>
            )}
          </Text>
        </div>
        <div className="flex items-center gap-4">
          <Text size="sm" color="muted">
            対象: {filteredPoemsCount}首
          </Text>
        </div>
      </div>

      {/* Controls */}
      <div>
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
      <Card className="text-center">
        <div className="flex items-center justify-between mb-4">
          <Text size="sm" color="muted">読札（上の句）</Text>
          {showKimariji && correctPoem && (
            <Badge variant="accent">
              {correctPoem.kimarijiCount}字決まり「{correctPoem.kimariji}」
            </Badge>
          )}
        </div>

        <div className="py-4">
          {renderYomi()}
        </div>

        {/* Result feedback - 常に高さを確保して表示/非表示を切り替え */}
        <div className={cn(
          "mt-4 p-3 rounded text-center font-bold transition-opacity",
          isAnswered ? "opacity-100" : "opacity-0",
          isAnswered && (isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
        )}>
          {isAnswered ? (isCorrect ? '正解！' : '不正解') : '\u00A0'}
        </div>
      </Card>

      {/* 12-card grid */}
      <div>
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
    </Container>
  );
}
