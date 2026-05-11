import { stablefordRanked } from "@/scoring/stableford";
import type { ScoringInput } from "@/scoring/types";

export function StablefordBoard({ input }: { input: ScoringInput }) {
  const rows = stablefordRanked(input);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-charcoal-muted">
          <th className="py-1.5 pr-2">#</th>
          <th className="py-1.5 pr-2">Player</th>
          <th className="py-1.5 pr-2 text-right">Points</th>
          <th className="py-1.5 pr-2 text-right">Thru</th>
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
              {r.holesPlayed === 0 ? "—" : r.points}
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal-muted">
              {r.holesPlayed === input.holes.length ? "F" : r.holesPlayed}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
