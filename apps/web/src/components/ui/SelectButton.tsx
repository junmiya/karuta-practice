import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { selectButtonVariants } from '@/lib/design-tokens';

type OnVariant = 'onPrimary' | 'onAccent' | 'onRed';

export interface SelectButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 選択状態 */
  isSelected?: boolean;
  /** ON時のバリアント */
  onVariant?: OnVariant;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
  /** 形状 */
  shape?: 'rounded' | 'pill';
  /** 子要素 */
  children: React.ReactNode;
}

/**
 * 選択ボタンコンポーネント（複数選択可能なボタン用）
 *
 * デザインルール:
 * - OFF: グレー背景 + 濃いグレー文字（視認性確保）
 * - ON: 色付き背景 + コントラスト確保された文字
 * - ボーダー: 常に見える状態を維持
 *
 * 使用例:
 * - 決まり字選択（1字〜6字）
 * - フィルター選択
 * - 複数選択可能なオプション
 */
export const SelectButton = forwardRef<HTMLButtonElement, SelectButtonProps>(
  (
    {
      isSelected = false,
      onVariant = 'onPrimary',
      size = 'sm',
      shape = 'pill',
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);

    // サイズに応じたスタイル
    const sizeStyles = {
      sm: 'h-7 px-3 text-xs',
      md: 'h-8 px-4 text-sm',
      lg: 'h-10 px-5 text-base',
    };

    // 形状に応じたスタイル
    const shapeStyles = {
      rounded: 'rounded-md',
      pill: 'rounded-full',
    };

    // 状態に応じたバリアントを取得
    const variant = isSelected
      ? selectButtonVariants[onVariant]
      : selectButtonVariants.off;

    // インラインスタイルで色を直接指定（Tailwind JIT問題を回避）
    const inlineStyle: React.CSSProperties = {
      backgroundColor: isHovered && !disabled ? variant.hoverBg : variant.bg,
      color: variant.text,
      borderColor: variant.border,
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        style={inlineStyle}
        className={cn(
          // ベーススタイル
          'inline-flex items-center justify-center font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'border',
          // サイズ
          sizeStyles[size],
          // 形状
          shapeStyles[shape],
          // 無効時
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

SelectButton.displayName = 'SelectButton';
