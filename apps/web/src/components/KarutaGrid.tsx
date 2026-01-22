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

/**
 * 12枚の取札グリッド
 * 練習・公式競技で使用
 * カードサイズはCardSizeProviderがグローバルに管理
 */
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
          mode="tori"
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
