import { splitIntoFixedLines } from '@/utils/karuta';

interface ToriTextProps {
  /** 取札テキスト（ひらがな） */
  text: string;
  /** 1行あたりの文字数（デフォルト: 5） */
  charsPerLine?: number;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 取札テキスト表示コンポーネント
 * 5文字改行で3行表示（縦書き・右から左）
 *
 * @example
 * <ToriText text="わがころもでは つゆにぬれつつ" />
 * // → ["わがころ", "もではつ", "ゆにぬれ", "つつ"] (5文字ずつ)
 */
export function ToriText({ text, charsPerLine = 5, className }: ToriTextProps) {
  const lines = splitIntoFixedLines(text, charsPerLine);

  return (
    <div className={`karuta-text-wrapper ${className || ''}`}>
      {lines.slice().reverse().map((line, index) => (
        <div key={index} className="karuta-line-grid">
          {line}
        </div>
      ))}
    </div>
  );
}
