interface PracticeControlsProps {
  showKana: boolean;
  showKimariji: boolean;
  kimarijiFilter: number[];
  onToggleKana: () => void;
  onToggleKimariji: () => void;
  onShuffle: () => void;
  onKimarijiFilterChange: (counts: number[]) => void;
}

const KIMARIJI_OPTIONS = [1, 2, 3, 4, 5, 6];

export function PracticeControls({
  showKana,
  showKimariji,
  kimarijiFilter,
  onToggleKana,
  onToggleKimariji,
  onShuffle,
  onKimarijiFilterChange,
}: PracticeControlsProps) {
  const toggleKimarijiCount = (count: number) => {
    if (kimarijiFilter.includes(count)) {
      // Remove from filter (but don't allow empty filter)
      const newFilter = kimarijiFilter.filter(c => c !== count);
      if (newFilter.length > 0) {
        onKimarijiFilterChange(newFilter);
      }
    } else {
      // Add to filter
      onKimarijiFilterChange([...kimarijiFilter, count].sort());
    }
  };

  const selectAllKimariji = () => {
    onKimarijiFilterChange([1, 2, 3, 4, 5, 6]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main control buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {/* Hiragana toggle */}
        <button
          onClick={onToggleKana}
          className={`px-4 py-2 border text-sm font-medium transition-all rounded ${
            showKana
              ? 'bg-karuta-red text-white border-karuta-red hover:bg-red-900'
              : 'bg-white text-neutral-700 border-neutral-300 hover:border-karuta-red hover:bg-neutral-50'
          }`}
          title={showKana ? '漢字表示に切り替え' : 'ひらがな表示に切り替え'}
        >
          {showKana ? 'ひらがな' : '漢字'}
        </button>

        {/* Kimariji toggle */}
        <button
          onClick={onToggleKimariji}
          className={`px-4 py-2 border text-sm font-medium transition-all rounded ${
            showKimariji
              ? 'bg-karuta-gold text-white border-karuta-gold hover:bg-yellow-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:border-karuta-gold hover:bg-neutral-50'
          }`}
          title={showKimariji ? '決まり字を隠す' : '決まり字を表示'}
        >
          決まり字
        </button>

        {/* Shuffle button */}
        <button
          onClick={onShuffle}
          className="px-4 py-2 border text-sm font-medium transition-all rounded bg-white text-neutral-700 border-neutral-300 hover:border-blue-500 hover:bg-blue-50"
          title="札をシャッフル"
        >
          🔀 シャッフル
        </button>
      </div>

      {/* Kimariji filter chips */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <span className="text-sm text-gray-500 mr-2">決まり字:</span>
        {KIMARIJI_OPTIONS.map(count => (
          <button
            key={count}
            onClick={() => toggleKimarijiCount(count)}
            className={`px-3 py-1 text-xs font-medium transition-all rounded-full ${
              kimarijiFilter.includes(count)
                ? 'bg-karuta-gold text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {count}字
          </button>
        ))}
        <button
          onClick={selectAllKimariji}
          className="px-3 py-1 text-xs font-medium transition-all rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          全て
        </button>
      </div>
    </div>
  );
}
