import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    small?: boolean;
}

export function StatCard({ label, value, highlight = false, small = false }: StatCardProps) {
    return (
        <Card padding={small ? "sm" : "md"} className="flex flex-col justify-between h-full">
            <Text size="sm" color="muted" className="mb-1">{label}</Text>
            <Text
                as="p"
                className={cn(
                    "font-bold leading-none",
                    highlight ? "text-2xl text-karuta-accent" : small ? "text-lg text-gray-900" : "text-xl text-gray-900"
                )}
            >
                {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
        </Card>
    );
}
