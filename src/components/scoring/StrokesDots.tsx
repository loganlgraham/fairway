interface StrokesDotsProps {
  value: number;
  className?: string;
}

// Positive value -> filled dots in brass.
// Negative value -> open circles outlined in forest (gives strokes back).
export function StrokesDots({ value, className = "" }: StrokesDotsProps) {
  if (!value) return null;
  const count = Math.min(Math.abs(value), 4);
  return (
    <span
      aria-label={value > 0 ? `${value} strokes received` : `${-value} strokes back`}
      className={`inline-flex items-center gap-0.5 ${className}`.trim()}
    >
      {Array.from({ length: count }).map((_, i) =>
        value > 0 ? (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brass"
            aria-hidden
          />
        ) : (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full border border-forest"
            aria-hidden
          />
        ),
      )}
    </span>
  );
}
