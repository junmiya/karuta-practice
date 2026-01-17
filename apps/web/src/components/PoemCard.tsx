import { useState } from 'react';
import type { Poem } from '@/types/poem';

interface PoemCardProps {
  poem: Poem;
  showKana: boolean;
  showKimariji: boolean;
}

export function PoemCard({ poem, showKana, showKimariji }: PoemCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const yomiText = showKana ? poem.yomiKana : poem.yomi;
  const toriText = showKana ? poem.toriKana : poem.tori;

  // 決まり字を強調表示（縦書き対応）
  const renderYomiWithKimariji = () => {
    // スペース（半角・全角）で分割
    const lines = yomiText.split(/[\s　]+/);

    if (!showKimariji) {
      return lines.slice().reverse().map((line, i) => (
        <div key={i} className="karuta-line">
          {line}
        </div>
      ));
    }

    const text = showKana ? poem.yomiKana : poem.yomi;
    const kimarijiLength = poem.kimarijiCount;

    // 決まり字部分を抽出（スペースを除いた文字数でカウント）
    let charCount = 0;
    let splitIndex = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ' ' && text[i] !== '　') {
        charCount++;
        if (charCount === kimarijiLength) {
          splitIndex = i + 1;
          break;
        }
      } else {
        splitIndex = i + 1;
      }
    }

    const kimarijiPart = text.substring(0, splitIndex);
    const kimarijiCharCount = kimarijiPart.replace(/[\s　]+/g, '').length;

    // 各行の開始文字位置を計算
    let totalChars = 0;
    const linePositions = lines.map(line => {
      const start = totalChars;
      totalChars += line.length;
      return { line, start, end: totalChars };
    });

    // 逆順（右から左）で表示
    return linePositions.slice().reverse().map((item, i) => {
      if (item.end <= kimarijiCharCount) {
        // 全体が決まり字
        return (
          <div key={i} className="karuta-line text-karuta-red font-bold">
            {item.line}
          </div>
        );
      } else if (item.start >= kimarijiCharCount) {
        // 決まり字なし
        return (
          <div key={i} className="karuta-line">
            {item.line}
          </div>
        );
      } else {
        // 部分的に決まり字
        const kimarijiInLine = kimarijiCharCount - item.start;
        return (
          <div key={i} className="karuta-line">
            <span className="text-karuta-red font-bold">{item.line.substring(0, kimarijiInLine)}</span>
            <span>{item.line.substring(kimarijiInLine)}</span>
          </div>
        );
      }
    });
  };

  const renderTori = () => {
    const lines = toriText.split(/[\s　]+/);
    return lines.slice().reverse().map((line, i) => (
      <div key={i} className="karuta-line">
        {line}
      </div>
    ));
  };

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className="relative karuta-card cursor-pointer perspective-1000"
    >
      <div
        className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front - Yomi (上の句) */}
        <div className="absolute inset-0 backface-hidden">
          <div className="h-full border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-shadow flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="text-xs text-gray-400">#{poem.order}</span>
              {showKimariji && (
                <span className="text-xs px-2 py-0.5 bg-karuta-gold text-white rounded">
                  {poem.kimarijiCount}字「{poem.kimariji}」
                </span>
              )}
            </div>
            <div className="flex-1 karuta-card-container">
              {renderYomiWithKimariji()}
            </div>
            <div className="text-xs text-gray-400 text-center pb-2">
              上の句
            </div>
          </div>
        </div>

        {/* Back - Tori (下の句) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="h-full border border-karuta-red rounded-lg bg-red-50 hover:shadow-md transition-shadow flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="text-xs text-gray-400">#{poem.order}</span>
              <span className="text-xs text-karuta-red">{poem.author}</span>
            </div>
            <div className="flex-1 karuta-card-container bg-red-50">
              {renderTori()}
            </div>
            <div className="text-xs text-gray-400 text-center pb-2">
              下の句
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
