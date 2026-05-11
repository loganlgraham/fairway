import type { CourseHoleRow } from "@/types/database";

export interface ScoringPlayer {
  id: string; // round_player_id
  display_name: string;
  course_handicap: number;
}

export interface ScoringInput {
  players: ScoringPlayer[];
  holes: CourseHoleRow[];
  // scores[playerId][holeNumber] = strokes (null/undefined when not yet entered)
  scores: Record<string, Record<number, number | null | undefined>>;
}

export interface PlayerTotal {
  playerId: string;
  display_name: string;
  gross: number;
  net: number;
  holesPlayed: number;
  toParGross: number;
  toParNet: number;
}
