import type { ReactNode } from "react";

interface TabsProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; badge?: ReactNode }[];
  className?: string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto rounded-lg border border-line bg-cream-50 p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-forest text-cream"
                : "text-charcoal-muted hover:bg-cream-200 hover:text-charcoal",
            ].join(" ")}
          >
            {opt.label}
            {opt.badge ? <span className="ml-1.5">{opt.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
