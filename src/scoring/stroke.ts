import { netScore } from "./strokesReceived";
import type { PlayerTotal, ScoringInput } from "./types";

export function strokeTotals(input: ScoringInput): PlayerTotal[] {
  const totals: PlayerTotal[] = input.players.map((p) => ({
    playerId: p.id,
    display_name: p.display_name,
    gross: 0,
    net: 0,
    holesPlayed: 0,
    toParGross: 0,
    toParNet: 0,
  }));

  for (let i = 0; i < input.players.length; i++) {
    const p = input.players[i];
    const t = totals[i];
    const playerScores = input.scores[p.id] ?? {};
    for (const hole of input.holes) {
      const gross = playerScores[hole.hole_number];
      if (gross == null) continue;
      const net = netScore(gross, p.course_handicap, hole.hcp_rating);
      if (net == null) continue;
      t.gross += gross;
      t.net += net;
      t.toParGross += gross - hole.par;
      t.toParNet += net - hole.par;
      t.holesPlayed += 1;
    }
  }
  return totals;
}

export function strokeRanked(input: ScoringInput): PlayerTotal[] {
  return [...strokeTotals(input)].sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
    if (a.holesPlayed === 0) return 1;
    if (b.holesPlayed === 0) return -1;
    if (a.net !== b.net) return a.net - b.net;
    return a.gross - b.gross;
  });
}
