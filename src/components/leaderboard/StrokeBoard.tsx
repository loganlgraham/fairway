import { strokeRanked } from "@/scoring/stroke";
import type { ScoringInput } from "@/scoring/types";
import { plus } from "@/utils/format";

interface StrokeBoardProps {
  input: ScoringInput;
  compact?: boolean;
}

export function StrokeBoard({ input, compact = false }: StrokeBoardProps) {
  const rows = strokeRanked(input);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-charcoal-muted">
          <th className="py-1.5 pr-2">#</th>
          <th className="py-1.5 pr-2">Player</th>
          <th className="py-1.5 pr-2 text-right">Net</th>
          <th className="py-1.5 pr-2 text-right">Gross</th>
          {!compact ? (
            <th className="py-1.5 pr-2 text-right">Thru</th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.playerId} className="border-t border-line">
            <td className="py-1.5 pr-2 text-charcoal-muted">{i + 1}</td>
            <td className="py-1.5 pr-2 font-medium text-charcoal">
              {r.display_name}
            </td>
            <td className="py-1.5 pr-2 text-right font-medium tabular-nums text-forest">
              {r.holesPlayed === 0
                ? "—"
                : `${r.net} (${plus(r.toParNet)})`}
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal">
              {r.holesPlayed === 0
                ? "—"
                : `${r.gross} (${plus(r.toParGross)})`}
            </td>
            {!compact ? (
              <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal-muted">
                {r.holesPlayed === input.holes.length ? "F" : r.holesPlayed}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
