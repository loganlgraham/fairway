import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`${padded ? "card-padded" : "card"} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-lg font-semibold text-forest ${className}`.trim()}
    >
      {children}
    </h2>
  );
}

export function CardEyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-brass ${className}`.trim()}
    >
      {children}
    </p>
  );
}
