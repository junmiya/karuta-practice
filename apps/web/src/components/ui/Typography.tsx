import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Heading Component
const headingVariants = cva(
    "font-bold leading-tight tracking-tight text-gray-900",
    {
        variants: {
            size: {
                h1: "text-3xl md:text-4xl",
                h2: "text-2xl md:text-3xl",
                h3: "text-xl md:text-2xl",
                h4: "text-lg md:text-xl",
            },
            color: {
                default: "text-gray-900",
                primary: "text-karuta-tansei",
                accent: "text-karuta-accent",
            },
        },
        defaultVariants: {
            size: "h2",
            color: "default",
        },
    }
);

interface HeadingProps
    extends Omit<HTMLAttributes<HTMLHeadingElement>, 'color'>,
    VariantProps<typeof headingVariants> {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
    ({ className, size, color, as, ...props }, ref) => {
        const Component = as || 'h2'; // Default to h2 if not specified, but style logic handles up to h4 mainly
        return (
            <Component
                ref={ref}
                className={headingVariants({ size, color, className })}
                {...props}
            />
        );
    }
);
Heading.displayName = "Heading";


// Text Component (Body)
const textVariants = cva(
    "leading-relaxed",
    {
        variants: {
            size: {
                xs: "text-xs",
                sm: "text-sm",
                base: "text-base",
                lg: "text-lg",
                xl: "text-xl",
            },
            weight: {
                normal: "font-normal",
                medium: "font-medium",
                bold: "font-bold",
            },
            align: {
                left: "text-left",
                center: "text-center",
                right: "text-right",
            },
            color: {
                default: "text-gray-700",
                muted: "text-gray-500",
                white: "text-white",
                primary: "text-karuta-tansei",
            },
        },
        defaultVariants: {
            size: "base",
            weight: "normal",
            align: "left",
            color: "default",
        },
    }
);

interface TextProps
    extends Omit<HTMLAttributes<HTMLParagraphElement>, 'color'>,
    VariantProps<typeof textVariants> {
    as?: 'p' | 'span' | 'div';
}

const Text = forwardRef<HTMLParagraphElement, TextProps>(
    ({ className, size, weight, align, color, as, ...props }, ref) => {
        const Component = as || 'p';
        return (
            <Component
                ref={ref}
                className={textVariants({ size, weight, align, color, className })}
                {...props}
            />
        );
    }
);
Text.displayName = "Text";

export { Heading, Text };
