// Per-hole strokes-received from course handicap and HCP rating.
//
// Course Handicap can be negative ("plus" handicap). Positive CH gives the
// player strokes on the hardest holes first (HCP 1 = hardest). Negative CH
// takes strokes back on the easiest holes first (HCP 18 = easiest).
//
// Returns a signed integer:
//   +N -> player receives N strokes on this hole (net = gross - N)
//   -N -> player gives back N strokes on this hole (net = gross + N)

export function strokesReceived(
  courseHandicap: number,
  holeHcp: number,
): number {
  if (!Number.isFinite(holeHcp) || holeHcp < 1 || holeHcp > 18) return 0;
  const ch = Math.trunc(courseHandicap);
  if (ch === 0) return 0;

  const abs = Math.abs(ch);
  const base = Math.floor(abs / 18);
  const extra = abs % 18;

  if (ch > 0) {
    // strokes go to hardest holes first (HCP 1..extra)
    return base + (holeHcp <= extra ? 1 : 0);
  }
  // plus handicap: strokes come off easiest holes first (HCP 18..(18-extra+1))
  const extraStroke = holeHcp > 18 - extra ? 1 : 0;
  return -(base + extraStroke);
}

export function netScore(
  gross: number | null,
  courseHandicap: number,
  holeHcp: number,
): number | null {
  if (gross == null) return null;
  return gross - strokesReceived(courseHandicap, holeHcp);
}
