export type Format = "stroke" | "match" | "stableford" | "skins";

export const ALL_FORMATS: Format[] = [
  "stroke",
  "match",
  "stableford",
  "skins",
];

export const FORMAT_LABEL: Record<Format, string> = {
  stroke: "Stroke Play",
  match: "Match Play",
  stableford: "Stableford",
  skins: "Skins",
};

export const FORMAT_SHORT: Record<Format, string> = {
  stroke: "Stroke",
  match: "Match",
  stableford: "Stableford",
  skins: "Skins",
};

export type RoundStatus = "in_progress" | "completed";

export interface CourseHole {
  hole_number: number;
  par: number;
  hcp_rating: number;
  yards: number | null;
}

export interface RoundPlayer {
  id: string;
  profile_id: string;
  display_name: string;
  position: number;
  course_handicap: number;
}

export interface ScoreEntry {
  round_player_id: string;
  hole_number: number;
  strokes: number | null;
}

export interface GhinExtractResult {
  name: string | null;
  ghin_number: string | null;
  handicap_index: number | null;
  low_hi: number | null;
  home_club: string | null;
  confidence: number;
}
