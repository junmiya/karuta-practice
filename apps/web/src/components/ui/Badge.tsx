import { HTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/design-tokens';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'accent' | 'danger' | 'success' | 'info' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

// バリアント別のスタイル定義
const variantStyles: Record<BadgeVariant, {
  bg: string;
  text: string;
  border: string;
  hoverBg?: string;
}> = {
  default: {
    bg: colors.tansei,
    text: colors.white,
    border: 'transparent',
    hoverBg: '#1a5a8f',
  },
  secondary: {
    bg: colors.gray100,
    text: colors.gray900,
    border: 'transparent',
    hoverBg: colors.gray200,
  },
  outline: {
    bg: 'transparent',
    text: colors.gray900,
    border: colors.gray200,
  },
  accent: {
    bg: colors.accent,
    text: colors.black,
    border: 'transparent',
    hoverBg: colors.accentHover,
  },
  danger: {
    bg: colors.red,
    text: colors.white,
    border: 'transparent',
    hoverBg: colors.redHover,
  },
  success: {
    bg: '#22c55e', // green-500
    text: colors.white,
    border: 'transparent',
    hoverBg: '#16a34a', // green-600
  },
  info: {
    bg: '#3b82f6', // blue-500
    text: colors.white,
    border: 'transparent',
    hoverBg: '#2563eb', // blue-600
  },
  warning: {
    bg: '#eab308', // yellow-500
    text: colors.white,
    border: 'transparent',
    hoverBg: '#ca8a04', // yellow-600
  },
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const style = variantStyles[variant];

  const inlineStyle: React.CSSProperties = {
    backgroundColor: isHovered && style.hoverBg ? style.hoverBg : style.bg,
    color: style.text,
    borderColor: style.border,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        className
      )}
      style={inlineStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    />
  );
}

export { Badge };
