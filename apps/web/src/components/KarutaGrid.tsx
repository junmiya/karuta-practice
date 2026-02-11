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
  cardCount?: 7 | 9 | 12;
}

/**
 * 取札グリッド（7枚/9枚/12枚対応）
 * 練習・公式競技・級位別歌合で使用
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
  cardCount = 12,
}: KarutaGridProps) {
  const expectedCount = cardCount;
  if (poems.length !== expectedCount) {
    console.warn(`KarutaGrid expects ${expectedCount} poems, received ${poems.length}`);
  }

  const gridClass = cardCount === 7 ? 'karuta-grid-7' :
                    cardCount === 9 ? 'karuta-grid-9' :
                    'karuta-grid';

  return (
    <div className={gridClass}>
      {poems.map((poem, index) => (
        <KarutaCard
          key={index}
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
