export function formatHandicap(hi: number | null | undefined): string {
  if (hi == null || Number.isNaN(hi)) return "—";
  return hi.toFixed(1);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return formatDate(iso);
}

export function plus(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
