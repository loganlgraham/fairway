import { netScore } from "./strokesReceived";
import type { ScoringInput } from "./types";

export interface SkinHoleResult {
  hole_number: number;
  winnerPlayerId: string | null; // null when carried over
  carriedIn: number; // skins on the line before this hole
  awarded: number; // 0 when carried, else carriedIn + 1
}

export interface SkinTotal {
  playerId: string;
  display_name: string;
  skins: number;
  wonHoles: number[];
}

export function skinsBreakdown(input: ScoringInput): {
  perHole: SkinHoleResult[];
  totals: SkinTotal[];
} {
  const perHole: SkinHoleResult[] = [];
  const totals: SkinTotal[] = input.players.map((p) => ({
    playerId: p.id,
    display_name: p.display_name,
    skins: 0,
    wonHoles: [],
  }));

  let carry = 0;
  for (const hole of input.holes) {
    let lowNet = Infinity;
    let lowCount = 0;
    let lowPlayer: string | null = null;
    let everyoneScored = true;

    for (const p of input.players) {
      const gross = input.scores[p.id]?.[hole.hole_number];
      if (gross == null) {
        everyoneScored = false;
        continue;
      }
      const net = netScore(gross, p.course_handicap, hole.hcp_rating);
      if (net == null) {
        everyoneScored = false;
        continue;
      }
      if (net < lowNet) {
        lowNet = net;
        lowCount = 1;
        lowPlayer = p.id;
      } else if (net === lowNet) {
        lowCount += 1;
      }
    }

    if (!everyoneScored) {
      // Hole not finished; freeze accounting at the current carry. We treat
      // the hole as pending and do not advance the carry counter.
      perHole.push({
        hole_number: hole.hole_number,
        winnerPlayerId: null,
        carriedIn: carry,
        awarded: 0,
      });
      continue;
    }

    if (lowCount === 1 && lowPlayer) {
      const award = carry + 1;
      perHole.push({
        hole_number: hole.hole_number,
        winnerPlayerId: lowPlayer,
        carriedIn: carry,
        awarded: award,
      });
      const row = totals.find((t) => t.playerId === lowPlayer);
      if (row) {
        row.skins += award;
        row.wonHoles.push(hole.hole_number);
      }
      carry = 0;
    } else {
      // Tie -> carry
      perHole.push({
        hole_number: hole.hole_number,
        winnerPlayerId: null,
        carriedIn: carry,
        awarded: 0,
      });
      carry += 1;
    }
  }

  return { perHole, totals };
}

export function skinsRanked(input: ScoringInput): SkinTotal[] {
  return [...skinsBreakdown(input).totals].sort((a, b) => b.skins - a.skins);
}
