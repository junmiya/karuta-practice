import { type ReactNode, type HTMLAttributes } from 'react';

type CardVariant = 'default' | 'info' | 'warning' | 'error' | 'success';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  centered?: boolean;
  noPadding?: boolean;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: '',
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
  success: 'bg-green-50 border-green-200',
};

export function Card({
  variant = 'default',
  centered = false,
  noPadding = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const baseClass = 'card';
  const variantClass = variantClasses[variant];
  const centeredClass = centered ? 'text-center' : '';
  const paddingClass = noPadding ? 'p-0' : '';

  return (
    <div
      className={`${baseClass} ${variantClass} ${centeredClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Stat Card for displaying statistics
interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  small?: boolean;
}

export function StatCard({ label, value, highlight = false, small = false }: StatCardProps) {
  return (
    <Card className={small ? 'p-3' : ''}>
      <p className="text-sm text-gray-600">{label}</p>
      <p
        className={`font-bold ${
          highlight ? 'text-2xl text-karuta-gold' : small ? 'text-lg' : 'text-xl'
        }`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </Card>
  );
}
