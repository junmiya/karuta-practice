import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

// バリアント別のスタイル定義（インラインスタイル用）
const variantStyles: Record<ButtonVariant, {
  bg: string;
  text: string;
  border: string;
  hoverBg: string;
}> = {
  primary: {
    bg: colors.tansei,
    text: colors.white,
    border: colors.tansei,
    hoverBg: colors.tanseiHover,
  },
  secondary: {
    bg: colors.white,
    text: colors.tansei,
    border: colors.tansei,
    hoverBg: '#f0f9ff', // sky-50
  },
  accent: {
    bg: colors.accent,
    text: colors.black,
    border: colors.accent,
    hoverBg: colors.accentHover,
  },
  ghost: {
    bg: 'transparent',
    text: colors.gray600,
    border: 'transparent',
    hoverBg: colors.gray100,
  },
  outline: {
    bg: colors.white,
    text: colors.gray900,
    border: colors.gray200,
    hoverBg: colors.gray100,
  },
  danger: {
    bg: colors.red,
    text: colors.white,
    border: colors.red,
    hoverBg: colors.redHover,
  },
};

// サイズ別のクラス
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-6 py-2',
  lg: 'h-12 px-8 text-lg',
  icon: 'h-10 w-10 px-0',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, disabled, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const style = variantStyles[variant];

    // インラインスタイルで色を直接指定
    const inlineStyle: React.CSSProperties = {
      backgroundColor: isHovered && !disabled ? style.hoverBg : style.bg,
      color: style.text,
      borderColor: style.border,
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'border',
          sizeClasses[size],
          fullWidth && 'w-full',
          variant === 'accent' && 'font-bold',
          variant === 'primary' && 'shadow-sm',
          className
        )}
        style={inlineStyle}
        ref={ref}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
