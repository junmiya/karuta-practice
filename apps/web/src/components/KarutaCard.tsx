import { useState } from 'react';
import type { Poem } from '@/types/poem';
import { splitInto3Lines, splitIntoFixedLines, removeSpaces } from '@/utils/karuta';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/design-tokens';

// =============================================================================
// 型定義
// =============================================================================

export type CardMode = 'tori' | 'yomi' | 'flip';
export type CardVariant = 'default' | 'selected' | 'correct' | 'wrong' | 'disabled' | 'tori-face';

export interface KarutaCardProps {
  /** 歌データ */
  poem: Poem;
  /** 表示モード: tori=取札のみ, yomi=読札のみ, flip=フリップ可能 */
  mode?: CardMode;
  /** ひらがな表示（後方互換性用、両方に適用） */
  showKana?: boolean;
  /** 読札のひらがな表示 */
  showYomiKana?: boolean;
  /** 取札のひらがな表示 */
  showToriKana?: boolean;
  /** 決まり字ハイライト表示（yomi/flipのみ有効） */
  showKimariji?: boolean;
  /** 選択状態（練習モード用） */
  isSelected?: boolean;
  /** 正解状態（練習モード用） */
  isCorrect?: boolean;
  /** 不正解状態（練習モード用） */
  isWrong?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** クリックハンドラ */
  onClick?: () => void;
  /** 追加のクラス名 */
  className?: string;
}

// =============================================================================
// スタイル定義
// =============================================================================

const variantStyles: Record<CardVariant, {
  borderColor: string;
  bgColor: string;
  hoverBorderColor?: string;
  ringColor?: string;
}> = {
  default: {
    borderColor: '#d4d4d4', // neutral-300
    bgColor: colors.white,
    hoverBorderColor: colors.red,
  },
  selected: {
    borderColor: colors.red,
    bgColor: '#fef2f2', // red-50
    ringColor: colors.red,
  },
  correct: {
    borderColor: '#22c55e', // green-500
    bgColor: '#f0fdf4', // green-50
    ringColor: '#22c55e',
  },
  wrong: {
    borderColor: '#ef4444', // red-500
    bgColor: '#fef2f2', // red-50
    ringColor: '#ef4444',
  },
  disabled: {
    borderColor: '#e5e5e5', // neutral-200
    bgColor: '#f5f5f5', // neutral-100
  },
  'tori-face': {
    borderColor: colors.red,
    bgColor: '#fef2f2', // red-50
  },
};

// =============================================================================
// 内部コンポーネント: カード面
// =============================================================================

interface CardFaceProps {
  text: string;
  tokens?: string[];
  kimarijiCount?: number;
  showKimariji?: boolean;
  variant: CardVariant;
  clickable: boolean;
  onClick?: () => void;
  className?: string;
  /** 取札モード（5文字改行を使用） */
  isTori?: boolean;
  /** ひらがな表示モード（決まり字ハイライト用） */
  isKana?: boolean;
}

function CardFace({
  text,
  tokens,
  kimarijiCount = 0,
  showKimariji = false,
  variant,
  clickable,
  onClick,
  className,
  isTori = false,
  isKana = false,
}: CardFaceProps) {
  const [isHovered, setIsHovered] = useState(false);

  // テキストを行に分割（取札は5文字改行、読札はスペース区切りまたは3分割）
  const lines = isTori
    ? splitIntoFixedLines(text, 5)
    : (() => {
        const splitText = text.trim().split(/[\s　]+/);
        return splitText.length > 1
          ? splitText
          : (tokens || splitInto3Lines(removeSpaces(text)));
      })();

  // 決まり字ハイライト用：各行の開始位置を計算
  const getLinePositions = () => {
    let totalChars = 0;
    return lines.map(line => {
      const start = totalChars;
      totalChars += line.length;
      return { line, start, end: totalChars };
    });
  };

  const linePositions = getLinePositions();
  const style = variantStyles[variant];
  const canHover = clickable && variant !== 'disabled' && style.hoverBorderColor;

  const inlineStyle: React.CSSProperties = {
    borderColor: isHovered && canHover ? style.hoverBorderColor : style.borderColor,
    backgroundColor: style.bgColor,
    ...(style.ringColor && { boxShadow: `0 0 0 2px ${style.ringColor}` }),
    ...(variant === 'disabled' && { opacity: 0.6 }),
  };

  // 行をレンダリング（決まり字ハイライト対応 - ひらがな表示時のみ有効）
  const renderLine = (item: { line: string; start: number; end: number }, index: number) => {
    // 決まり字カウントはひらがな基準のため、漢字表示時はハイライトしない
    if (!showKimariji || kimarijiCount === 0 || !isKana) {
      return (
        <div key={index} className="karuta-line-grid">
          {item.line}
        </div>
      );
    }

    if (item.end <= kimarijiCount) {
      // 行全体が決まり字
      return (
        <div key={index} className="karuta-line-grid font-bold" style={{ color: colors.red }}>
          {item.line}
        </div>
      );
    } else if (item.start >= kimarijiCount) {
      // 決まり字なし
      return (
        <div key={index} className="karuta-line-grid">
          {item.line}
        </div>
      );
    } else {
      // 行の途中まで決まり字
      const kimarijiInLine = kimarijiCount - item.start;
      return (
        <div key={index} className="karuta-line-grid">
          <span className="font-bold" style={{ color: colors.red }}>{item.line.substring(0, kimarijiInLine)}</span>
          <span>{item.line.substring(kimarijiInLine)}</span>
        </div>
      );
    }
  };

  const content = (
    <div className="karuta-card-container-grid">
      <div className="karuta-text-wrapper">
        {linePositions.slice().reverse().map((item, i) => renderLine(item, i))}
      </div>
    </div>
  );

  const cardClass = cn(
    'karuta-card-grid relative border transition-all overflow-hidden rounded',
    clickable && variant !== 'disabled' ? 'cursor-pointer hover:shadow-md' : '',
    className
  );

  if (clickable && onClick) {
    return (
      <button
        onClick={onClick}
        disabled={variant === 'disabled'}
        className={cardClass}
        style={inlineStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cardClass}
      style={inlineStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </div>
  );
}

// =============================================================================
// メインコンポーネント
// =============================================================================

/**
 * 統一カルタ札コンポーネント
 *
 * @example
 * // 練習モード（取札のみ、選択状態対応）
 * <KarutaCard poem={poem} mode="tori" showKana={false} isSelected={true} onClick={handleClick} />
 *
 * @example
 * // 学習モード（フリップ可能）
 * <KarutaCard poem={poem} mode="flip" showKana={false} showKimariji={true} />
 *
 * @example
 * // 読札のみ表示
 * <KarutaCard poem={poem} mode="yomi" showKana={true} showKimariji={true} />
 */
export function KarutaCard({
  poem,
  mode = 'tori',
  showKana = false,
  showYomiKana,
  showToriKana,
  showKimariji = false,
  isSelected = false,
  isCorrect = false,
  isWrong = false,
  disabled = false,
  onClick,
  className,
}: KarutaCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // 読札・取札で別々のひらがな設定（指定がなければshowKanaを使用）
  const isYomiKana = showYomiKana ?? showKana;
  const isToriKana = showToriKana ?? showKana;

  // テキストとトークンを取得
  const yomiText = isYomiKana ? poem.yomiKana : poem.yomi;
  const yomiTokens = isYomiKana ? poem.yomiKanaTokens : undefined;
  const toriText = isToriKana ? poem.toriKana : poem.tori;

  // 状態からvariantを決定
  const getVariant = (): CardVariant => {
    if (isCorrect) return 'correct';
    if (isWrong) return 'wrong';
    if (isSelected) return 'selected';
    if (disabled) return 'disabled';
    return 'default';
  };

  // ==========================================================================
  // mode="tori": 取札のみ表示（練習モード）- 常にひらがな、5文字改行
  // ==========================================================================
  if (mode === 'tori') {
    return (
      <CardFace
        text={toriText}
        variant={getVariant()}
        clickable={!disabled}
        onClick={onClick}
        className={className}
        isTori
      />
    );
  }

  // ==========================================================================
  // mode="yomi": 読札のみ表示
  // ==========================================================================
  if (mode === 'yomi') {
    return (
      <CardFace
        text={yomiText}
        tokens={yomiTokens}
        kimarijiCount={poem.kimarijiCount}
        showKimariji={showKimariji}
        isKana={isYomiKana}
        variant={getVariant()}
        clickable={!disabled && !!onClick}
        onClick={onClick}
        className={className}
      />
    );
  }

  // ==========================================================================
  // mode="flip": フリップ可能（学習モード）
  // ==========================================================================
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    onClick?.();
  };

  return (
    <div
      onClick={handleFlip}
      className={cn('aspect-[52/73] w-full cursor-pointer perspective-1000', className)}
    >
      <div
        className={cn(
          'relative w-full h-full transition-transform duration-500 transform-style-3d',
          isFlipped ? 'rotate-y-180' : ''
        )}
      >
        {/* Front - Yomi (上の句) */}
        <div className="absolute inset-0 backface-hidden">
          <CardFace
            text={yomiText}
            tokens={yomiTokens}
            kimarijiCount={poem.kimarijiCount}
            showKimariji={showKimariji}
            isKana={isYomiKana}
            variant="default"
            clickable={false}
            className="w-full h-full"
          />
        </div>

        {/* Back - Tori (下の句) - 常にひらがな、5文字改行 */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <CardFace
            text={toriText}
            variant="tori-face"
            clickable={false}
            className="w-full h-full"
            isTori
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 後方互換性のためのエクスポート
// =============================================================================

/** @deprecated KarutaCard with mode="flip" を使用してください */
export const PoemCard = KarutaCard;
