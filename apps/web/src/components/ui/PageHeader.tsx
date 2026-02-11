import { ReactNode } from 'react';
import { Card } from './Card';
import { Heading, Text } from './Typography';
import { Badge, type BadgeVariant } from './Badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional badge */
  badge?: {
    text: string;
    variant?: BadgeVariant;
  };
  /** Optional additional content (filters, controls, etc.) */
  children?: ReactNode;
  /** Additional className for the card */
  className?: string;
}

/**
 * Unified page header component for consistent styling across pages.
 *
 * @example
 * // Simple header
 * <PageHeader title="成績" subtitle="あなたの練習成績と統計情報" />
 *
 * @example
 * // Header with badge
 * <PageHeader
 *   title="暫定ランキング"
 *   subtitle="シーズン1 - 級位の部"
 *   badge={{ text: '開催中', variant: 'info' }}
 * />
 *
 * @example
 * // Header with controls
 * <PageHeader title="競技モード" subtitle="公式記録の提出">
 *   <div className="mt-4 flex gap-2">
 *     <Button>アクション</Button>
 *   </div>
 * </PageHeader>
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <Card className={cn('p-3', className)}>
      <div className="flex items-center gap-3 mb-2">
        <Heading as="h2" size="h2">
          {title}
        </Heading>
        {badge && (
          <Badge variant={badge.variant || 'info'}>
            {badge.text}
          </Badge>
        )}
      </div>
      {subtitle && (
        <Text color="muted">{subtitle}</Text>
      )}
      {children}
    </Card>
  );
}
