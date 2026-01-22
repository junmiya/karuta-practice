import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils'; // Assuming existence or next step creation

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
    ({ className, size = 'lg', ...props }, ref) => {
        const maxWidths = {
            sm: 'max-w-screen-sm', // ~640px
            md: 'max-w-screen-md', // ~768px
            lg: 'max-w-screen-lg', // ~1024px
            xl: 'max-w-screen-xl', // ~1280px
            full: 'max-w-full',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "mx-auto px-4 w-full",
                    maxWidths[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Container.displayName = "Container";

export { Container };
