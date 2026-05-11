import { netScore } from "./strokesReceived";
import type { ScoringInput } from "./types";

// Pairwise round-robin match play on net hole-by-hole scores.
// For each unordered pair (i, j):
//   - hole won by player with lower net
//   - if equal net or either score missing, the hole is halved
//   - pair winner = more holes won (W); ties on holes_won are draws
// Overall standings:
//   record W = number of pair matches won, L = lost, T = tied
//   tiebreak: holes-won differential across all pairs

export interface MatchPlayPairResult {
  aId: string;
  bId: string;
  aHolesWon: number;
  bHolesWon: number;
  halved: number;
  // 'a' | 'b' | 'tie'
  outcome: "a" | "b" | "tie";
}

export interface MatchPlayPlayerStanding {
  playerId: string;
  display_name: string;
  wins: number;
  losses: number;
  ties: number;
  holesWon: number;
  holesLost: number;
  differential: number;
}

export function matchPlayBreakdown(input: ScoringInput): {
  pairs: MatchPlayPairResult[];
  standings: MatchPlayPlayerStanding[];
} {
  const standings: MatchPlayPlayerStanding[] = input.players.map((p) => ({
    playerId: p.id,
    display_name: p.display_name,
    wins: 0,
    losses: 0,
    ties: 0,
    holesWon: 0,
    holesLost: 0,
    differential: 0,
  }));

  const pairs: MatchPlayPairResult[] = [];

  for (let i = 0; i < input.players.length; i++) {
    for (let j = i + 1; j < input.players.length; j++) {
      const a = input.players[i];
      const b = input.players[j];
      let aWon = 0;
      let bWon = 0;
      let halved = 0;
      for (const hole of input.holes) {
        const aGross = input.scores[a.id]?.[hole.hole_number];
        const bGross = input.scores[b.id]?.[hole.hole_number];
        const aNet = netScore(aGross ?? null, a.course_handicap, hole.hcp_rating);
        const bNet = netScore(bGross ?? null, b.course_handicap, hole.hcp_rating);
        if (aNet == null || bNet == null) {
          // can't decide this hole yet
          continue;
        }
        if (aNet < bNet) aWon += 1;
        else if (bNet < aNet) bWon += 1;
        else halved += 1;
      }

      const outcome: MatchPlayPairResult["outcome"] =
        aWon > bWon ? "a" : bWon > aWon ? "b" : "tie";
      pairs.push({
        aId: a.id,
        bId: b.id,
        aHolesWon: aWon,
        bHolesWon: bWon,
        halved,
        outcome,
      });

      const aRow = standings.find((s) => s.playerId === a.id);
      const bRow = standings.find((s) => s.playerId === b.id);
      if (aRow && bRow) {
        aRow.holesWon += aWon;
        aRow.holesLost += bWon;
        bRow.holesWon += bWon;
        bRow.holesLost += aWon;
        if (outcome === "a") {
          aRow.wins += 1;
          bRow.losses += 1;
        } else if (outcome === "b") {
          bRow.wins += 1;
          aRow.losses += 1;
        } else {
          aRow.ties += 1;
          bRow.ties += 1;
        }
      }
    }
  }

  for (const row of standings) {
    row.differential = row.holesWon - row.holesLost;
  }

  return { pairs, standings };
}

export function matchPlayRanked(
  input: ScoringInput,
): MatchPlayPlayerStanding[] {
  const { standings } = matchPlayBreakdown(input);
  return [...standings].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.ties !== b.ties) return b.ties - a.ties;
    return b.differential - a.differential;
  });
}
