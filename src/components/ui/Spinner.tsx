import { Loader2 } from "lucide-react";

export function Spinner({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-forest ${className}`.trim()}
      aria-hidden
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <Spinner size={24} />
    </div>
  );
}
