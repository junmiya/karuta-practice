import type { Poem } from '@/types/poem';
import { KarutaCard } from './KarutaCard';

interface KarutaGridProps {
  poems: Poem[];
  showKana: boolean;
  selectedPoemId?: string | null;
  correctPoemId?: string | null;
  wrongPoemId?: string | null;
  disabled?: boolean;
  onSelect?: (poem: Poem) => void;
}

export function KarutaGrid({
  poems,
  showKana,
  selectedPoemId,
  correctPoemId,
  wrongPoemId,
  disabled = false,
  onSelect,
}: KarutaGridProps) {
  if (poems.length !== 12) {
    console.warn(`KarutaGrid expects 12 poems, received ${poems.length}`);
  }

  return (
    <div className="karuta-grid">
      {poems.map((poem) => (
        <KarutaCard
          key={poem.poemId}
          poem={poem}
          showKana={showKana}
          isSelected={selectedPoemId === poem.poemId}
          isCorrect={correctPoemId === poem.poemId}
          isWrong={wrongPoemId === poem.poemId && wrongPoemId !== correctPoemId}
          disabled={disabled}
          onClick={() => onSelect?.(poem)}
        />
      ))}
    </div>
  );
}
