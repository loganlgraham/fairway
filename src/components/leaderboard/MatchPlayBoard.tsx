import { matchPlayRanked, matchPlayBreakdown } from "@/scoring/matchPlay";
import type { ScoringInput } from "@/scoring/types";

export function MatchPlayBoard({ input }: { input: ScoringInput }) {
  const standings = matchPlayRanked(input);

  if (input.players.length < 2) {
    return (
      <p className="text-sm text-charcoal-muted">
        Match play needs at least 2 players.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-charcoal-muted">
          <th className="py-1.5 pr-2">#</th>
          <th className="py-1.5 pr-2">Player</th>
          <th className="py-1.5 pr-2 text-right">W-L-T</th>
          <th className="py-1.5 pr-2 text-right">Diff</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.playerId} className="border-t border-line">
            <td className="py-1.5 pr-2 text-charcoal-muted">{i + 1}</td>
            <td className="py-1.5 pr-2 font-medium text-charcoal">
              {s.display_name}
            </td>
            <td className="py-1.5 pr-2 text-right font-medium tabular-nums text-forest">
              {s.wins}-{s.losses}-{s.ties}
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal">
              {s.differential > 0 ? `+${s.differential}` : s.differential}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MatchPlayPairTable({ input }: { input: ScoringInput }) {
  const { pairs } = matchPlayBreakdown(input);
  const nameById = new Map(
    input.players.map((p) => [p.id, p.display_name] as const),
  );
  if (pairs.length === 0) return null;
  return (
    <details className="mt-2 rounded-lg border border-line bg-cream-50 p-2 text-xs">
      <summary className="cursor-pointer select-none text-charcoal-muted">
        Pairwise results
      </summary>
      <ul className="mt-2 space-y-1">
        {pairs.map((p) => {
          const a = nameById.get(p.aId) ?? "—";
          const b = nameById.get(p.bId) ?? "—";
          let result = "Halved";
          if (p.outcome === "a") result = `${a} wins`;
          else if (p.outcome === "b") result = `${b} wins`;
          return (
            <li key={`${p.aId}:${p.bId}`} className="text-charcoal">
              <span className="font-medium">{a}</span> vs{" "}
              <span className="font-medium">{b}</span>:{" "}
              <span className="text-charcoal-muted">
                {p.aHolesWon}-{p.bHolesWon}-{p.halved}
              </span>{" "}
              · {result}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
