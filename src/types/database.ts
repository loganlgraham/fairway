import type { Format, RoundStatus } from "./golf";

export type ProfileRow = {
  id: string;
  user_id: string | null;
  owner_id: string | null;
  display_name: string;
  ghin_number: string | null;
  handicap_index: number | null;
  low_hi: number | null;
  home_club: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id?: string;
  user_id?: string | null;
  owner_id?: string | null;
  display_name: string;
  ghin_number?: string | null;
  handicap_index?: number | null;
  low_hi?: number | null;
  home_club?: string | null;
};

export type CourseRow = {
  id: string;
  opengolf_id: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  num_holes: number;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
};

export type CourseInsert = {
  id?: string;
  opengolf_id?: string | null;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  num_holes?: number;
  is_public?: boolean;
  created_by?: string | null;
};

export type CourseHoleRow = {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  hcp_rating: number;
  yards: number | null;
};

export type CourseHoleInsert = {
  id?: string;
  course_id: string;
  hole_number: number;
  par: number;
  hcp_rating: number;
  yards?: number | null;
};

export type RoundRow = {
  id: string;
  owner_id: string;
  course_id: string;
  played_on: string;
  formats: Format[];
  status: RoundStatus;
  created_at: string;
};

export type RoundInsert = {
  id?: string;
  owner_id: string;
  course_id: string;
  played_on?: string;
  formats: Format[];
  status?: RoundStatus;
};

export type RoundPlayerRow = {
  id: string;
  round_id: string;
  profile_id: string;
  position: number;
  course_handicap: number;
};

export type RoundPlayerInsert = {
  id?: string;
  round_id: string;
  profile_id: string;
  position: number;
  course_handicap: number;
};

export type ScoreRow = {
  id: string;
  round_id: string;
  round_player_id: string;
  hole_number: number;
  strokes: number | null;
  updated_at: string;
};

export type ScoreInsert = {
  id?: string;
  round_id: string;
  round_player_id: string;
  hole_number: number;
  strokes?: number | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      courses: {
        Row: CourseRow;
        Insert: CourseInsert;
        Update: Partial<CourseInsert>;
        Relationships: [];
      };
      course_holes: {
        Row: CourseHoleRow;
        Insert: CourseHoleInsert;
        Update: Partial<CourseHoleInsert>;
        Relationships: [];
      };
      rounds: {
        Row: RoundRow;
        Insert: RoundInsert;
        Update: Partial<RoundInsert>;
        Relationships: [];
      };
      round_players: {
        Row: RoundPlayerRow;
        Insert: RoundPlayerInsert;
        Update: Partial<RoundPlayerInsert>;
        Relationships: [];
      };
      scores: {
        Row: ScoreRow;
        Insert: ScoreInsert;
        Update: Partial<ScoreInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
