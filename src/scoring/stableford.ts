import { strokesReceived } from "./strokesReceived";
import type { ScoringInput } from "./types";

// Standard Stableford points relative to NET par (par + strokes received):
//   Eagle or better (-2 or lower)  = 4
//   Birdie (-1)                    = 3
//   Par  (0)                       = 2
//   Bogey (+1)                     = 1
//   Double bogey or worse (>=+2)   = 0
export function stablefordPoints(
  gross: number,
  par: number,
  courseHandicap: number,
  holeHcp: number,
): number {
  const sr = strokesReceived(courseHandicap, holeHcp);
  const netPar = par + sr;
  const diff = gross - netPar;
  if (diff <= -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

export interface StablefordRow {
  playerId: string;
  display_name: string;
  points: number;
  holesPlayed: number;
}

export function stablefordTotals(input: ScoringInput): StablefordRow[] {
  return input.players.map((p) => {
    let points = 0;
    let holesPlayed = 0;
    const playerScores = input.scores[p.id] ?? {};
    for (const hole of input.holes) {
      const gross = playerScores[hole.hole_number];
      if (gross == null) continue;
      points += stablefordPoints(gross, hole.par, p.course_handicap, hole.hcp_rating);
      holesPlayed += 1;
    }
    return {
      playerId: p.id,
      display_name: p.display_name,
      points,
      holesPlayed,
    };
  });
}

export function stablefordRanked(input: ScoringInput): StablefordRow[] {
  return [...stablefordTotals(input)].sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
    if (a.holesPlayed === 0) return 1;
    if (b.holesPlayed === 0) return -1;
    return b.points - a.points;
  });
}
