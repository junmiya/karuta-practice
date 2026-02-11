import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
    "rounded-lg border bg-white text-karuta-black transition-all",
    {
        variants: {
            padding: {
                none: "p-0",
                sm: "p-4",
                md: "p-6",
                lg: "p-8",
            },
            shadow: {
                none: "",
                sm: "shadow-sm",
                md: "shadow-md",
                lg: "shadow-lg",
            },
            hover: {
                true: "hover:shadow-md hover:-translate-y-[1px]",
                false: "",
            },
            centered: {
                true: "flex flex-col items-center justify-center text-center",
                false: "",
            },
        },
        defaultVariants: {
            padding: "md",
            shadow: "sm",
            hover: false,
            centered: false,
        },
    }
);

export interface CardProps
    extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> { }

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, padding, shadow, hover, centered, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cardVariants({ padding, shadow, hover, centered, className })}
                {...props}
            />
        );
    }
);
Card.displayName = "Card";

export { Card, cardVariants };
