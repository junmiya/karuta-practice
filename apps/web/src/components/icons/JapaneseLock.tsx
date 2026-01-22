import { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function JapaneseLock({ className, ...props }: ComponentProps<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            className={cn("w-4 h-4", className)}
            {...props}
        >
            {/* Shackle (Can) - Distinctive thick rounded top */}
            <path
                d="M7 11V6.5C7 3.5 9.5 2 12 2C14.5 2 17 3.5 17 6.5V11"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Body (Do) - Heavy rectangular block typical of Japanese locks */}
            <rect x="5" y="10" width="14" height="12" rx="1" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />

            {/* Key mechanism detailed - decorative horizontal bar/mechanism */}
            <path d="M9 16H15" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 16V19" strokeWidth="2" strokeLinecap="round" />

            {/* Side ornamentation (optional, for flavor) */}
            <path d="M6 12H18" strokeWidth="1" strokeOpacity="0.5" />
        </svg>
    );
}
