import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CourseHoleRow,
  CourseRow,
  ProfileRow,
  RoundPlayerRow,
  RoundRow,
  ScoreRow,
} from "@/types/database";
import type { Format } from "@/types/golf";
import { useAuth } from "@/auth/useAuth";

export interface CreateRoundInput {
  course: CourseRow;
  formats: Format[];
  // ordered list (position 1..N) of (profile_id, course_handicap snapshot)
  players: { profile_id: string; course_handicap: number }[];
  played_on?: string; // ISO date, defaults to today
}

export function useCreateRound() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoundInput): Promise<RoundRow> => {
      if (!user) throw new Error("Not signed in");
      if (input.players.length < 1) throw new Error("Add at least one player");
      if (input.players.length > 12) throw new Error("Max 12 players");
      if (input.formats.length < 1) throw new Error("Pick at least one format");

      const { data: round, error: rErr } = await supabase
        .from("rounds")
        .insert({
          owner_id: user.id,
          course_id: input.course.id,
          formats: input.formats,
          played_on: input.played_on,
          status: "in_progress",
        })
        .select()
        .single();
      if (rErr) throw rErr;
      const r = round as RoundRow;

      const rpRows = input.players.map((p, idx) => ({
        round_id: r.id,
        profile_id: p.profile_id,
        position: idx + 1,
        course_handicap: p.course_handicap,
      }));
      const { error: rpErr } = await supabase
        .from("round_players")
        .insert(rpRows);
      if (rpErr) throw rpErr;

      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
    },
  });
}

export interface RoundBundle {
  round: RoundRow;
  course: CourseRow;
  holes: CourseHoleRow[];
  players: (RoundPlayerRow & { profile: ProfileRow })[];
  scores: ScoreRow[];
}

export function useRoundBundle(roundId: string | null) {
  return useQuery<RoundBundle>({
    queryKey: ["round-bundle", roundId],
    enabled: !!roundId,
    queryFn: async () => {
      const id = roundId as string;

      const { data: round, error: rErr } = await supabase
        .from("rounds")
        .select("*")
        .eq("id", id)
        .single();
      if (rErr) throw rErr;

      const { data: course, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", (round as RoundRow).course_id)
        .single();
      if (cErr) throw cErr;

      const { data: holes, error: hErr } = await supabase
        .from("course_holes")
        .select("*")
        .eq("course_id", (round as RoundRow).course_id)
        .order("hole_number", { ascending: true });
      if (hErr) throw hErr;

      const { data: rps, error: pErr } = await supabase
        .from("round_players")
        .select("*")
        .eq("round_id", id)
        .order("position", { ascending: true });
      if (pErr) throw pErr;

      const profileIds = (rps ?? []).map((rp) => (rp as RoundPlayerRow).profile_id);
      let profiles: ProfileRow[] = [];
      if (profileIds.length > 0) {
        const { data: profs, error: prErr } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds);
        if (prErr) throw prErr;
        profiles = (profs ?? []) as ProfileRow[];
      }

      const { data: scores, error: sErr } = await supabase
        .from("scores")
        .select("*")
        .eq("round_id", id);
      if (sErr) throw sErr;

      const players = ((rps ?? []) as RoundPlayerRow[]).map((rp) => ({
        ...rp,
        profile:
          profiles.find((p) => p.id === rp.profile_id) ??
          ({
            id: rp.profile_id,
            user_id: null,
            owner_id: null,
            display_name: "Player",
            ghin_number: null,
            handicap_index: null,
            low_hi: null,
            home_club: null,
            created_at: "",
            updated_at: "",
          } as ProfileRow),
      }));

      return {
        round: round as RoundRow,
        course: course as CourseRow,
        holes: (holes ?? []) as CourseHoleRow[],
        players,
        scores: (scores ?? []) as ScoreRow[],
      };
    },
  });
}

export function useRecentRounds(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rounds", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("owner_id", user!.id)
        .order("played_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as RoundRow[];
    },
  });
}

export function useCompleteRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roundId: string): Promise<RoundRow> => {
      const { data, error } = await supabase
        .from("rounds")
        .update({ status: "completed" })
        .eq("id", roundId)
        .select()
        .single();
      if (error) throw error;
      return data as RoundRow;
    },
    onSuccess: (round) => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
      qc.invalidateQueries({ queryKey: ["round-bundle", round.id] });
    },
  });
}
