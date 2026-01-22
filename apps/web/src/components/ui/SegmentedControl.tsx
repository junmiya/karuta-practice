import { cn } from '@/lib/utils';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex bg-gray-100 rounded-lg p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !option.disabled && onChange(option.value)}
          disabled={option.disabled}
          className={cn(
            "font-medium rounded-md transition-all",
            size === 'sm' ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === option.value
              ? "bg-white text-karuta-tansei shadow-sm"
              : "text-gray-600 hover:text-gray-900",
            option.disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
