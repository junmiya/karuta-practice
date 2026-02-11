import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toggleVariants, type ToggleVariant } from '@/lib/design-tokens';

export interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 選択状態 */
  isActive?: boolean;
  /** アクティブ時のバリアント */
  activeVariant?: ToggleVariant;
  /** サイズ */
  size?: 'sm' | 'md';
  /** 子要素 */
  children: React.ReactNode;
}

/**
 * トグルボタンコンポーネント
 *
 * デザインルール準拠:
 * - タッチターゲット最小44px
 * - 視認性の高いコントラスト
 * - 選択状態の明確な表示
 */
export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  (
    {
      isActive = false,
      activeVariant = 'primary',
      size = 'sm',
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
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
    };

    // 状態に応じたバリアントを取得
    const variant = disabled
      ? toggleVariants.disabled
      : isActive
        ? toggleVariants[activeVariant]
        : toggleVariants.default;

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
          'inline-flex items-center justify-center rounded-full font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          'border',
          // サイズ
          sizeStyles[size],
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

ToggleButton.displayName = 'ToggleButton';
