import { skinsBreakdown } from "@/scoring/skins";
import type { ScoringInput } from "@/scoring/types";

export function SkinsBoard({ input }: { input: ScoringInput }) {
  const { totals, perHole } = skinsBreakdown(input);
  const ranked = [...totals].sort((a, b) => b.skins - a.skins);
  const carryNow = (() => {
    // Carry currently on the line is the highest carriedIn that hasn't been
    // resolved. The last completed hole determines this.
    let carry = 0;
    for (const h of perHole) {
      if (h.winnerPlayerId) carry = 0;
      else if (h.awarded === 0 && h.winnerPlayerId == null && h.carriedIn >= 0) {
        // unfinished -> show current carry
        carry = h.carriedIn;
      } else {
        carry += 1;
      }
    }
    return carry;
  })();

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-charcoal-muted">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Player</th>
            <th className="py-1.5 pr-2 text-right">Skins</th>
            <th className="py-1.5 pr-2 text-right">Holes</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.playerId} className="border-t border-line">
              <td className="py-1.5 pr-2 text-charcoal-muted">{i + 1}</td>
              <td className="py-1.5 pr-2 font-medium text-charcoal">
                {r.display_name}
              </td>
              <td className="py-1.5 pr-2 text-right font-medium tabular-nums text-forest">
                {r.skins}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal-muted">
                {r.wonHoles.length === 0 ? "—" : r.wonHoles.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {carryNow > 0 ? (
        <p className="mt-2 text-xs text-charcoal-muted">
          {carryNow} skin{carryNow === 1 ? "" : "s"} carried to next hole.
        </p>
      ) : null}
    </div>
  );
}
