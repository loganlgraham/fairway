import { useEffect, useRef, useState } from "react";

interface ScoreCellProps {
  value: number | null;
  par: number;
  onCommit: (next: number | null) => void;
  disabled?: boolean;
}

function classForVsPar(strokes: number | null, par: number): string {
  if (strokes == null) return "border-line bg-white text-charcoal-muted";
  const diff = strokes - par;
  if (diff <= -2) return "border-brass bg-brass text-cream";
  if (diff === -1) return "border-forest bg-forest text-cream";
  if (diff === 0) return "border-forest bg-white text-forest";
  if (diff === 1) return "border-line bg-white text-charcoal";
  return "border-line bg-cream-50 text-charcoal-muted";
}

export function ScoreCell({ value, par, onCommit, disabled }: ScoreCellProps) {
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    if (raw.trim() === "") {
      onCommit(null);
      return;
    }
    const n = Math.max(1, Math.min(20, Math.round(Number(raw))));
    if (!Number.isFinite(n)) {
      onCommit(null);
      return;
    }
    onCommit(n);
  };

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min={1}
      max={20}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={[
        "h-12 w-12 rounded-lg border text-center font-display text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:opacity-60",
        classForVsPar(value, par),
      ].join(" ")}
    />
  );
}
