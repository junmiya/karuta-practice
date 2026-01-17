import type { Poem } from '@/types/poem';

interface KarutaCardProps {
  poem: Poem;
  showKana: boolean;
  isSelected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function KarutaCard({
  poem,
  showKana,
  isSelected = false,
  isCorrect = false,
  isWrong = false,
  disabled = false,
  onClick,
}: KarutaCardProps) {
  // Use tokens for proper line breaks, fallback to space splitting
  const toriTokens = showKana
    ? (poem.toriKanaTokens || poem.toriKana.split(/[\s　]+/))
    : (poem.toriTokens || poem.tori.split(/[\s　]+/));

  // Determine card styles based on state
  let cardClass = 'karuta-card-grid relative border transition-all overflow-hidden rounded ';

  if (isCorrect) {
    cardClass += 'border-green-500 bg-green-50 ring-2 ring-green-500 ';
  } else if (isWrong) {
    cardClass += 'border-red-500 bg-red-50 ring-2 ring-red-500 ';
  } else if (isSelected) {
    cardClass += 'border-karuta-red bg-red-50 ring-2 ring-karuta-red ';
  } else if (disabled) {
    cardClass += 'border-neutral-200 bg-neutral-100 opacity-60 ';
  } else {
    cardClass += 'border-neutral-300 bg-white hover:border-karuta-red hover:shadow-md cursor-pointer ';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cardClass}
    >
      <div className="karuta-card-container-grid">
        {/* Display tori (下の句) in vertical writing, right to left */}
        {toriTokens.slice().reverse().map((line, i) => (
          <div key={i} className="karuta-line-grid">
            {line}
          </div>
        ))}
      </div>
    </button>
  );
}
