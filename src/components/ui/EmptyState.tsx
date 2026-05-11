import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="card-padded flex flex-col items-center gap-3 text-center">
      {icon ? <div className="text-brass">{icon}</div> : null}
      <h3 className="font-display text-lg font-semibold text-forest">
        {title}
      </h3>
      {description ? (
        <p className="max-w-sm text-sm text-charcoal-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
