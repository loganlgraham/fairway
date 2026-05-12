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
  activePlayers: (RoundPlayerRow & { profile: ProfileRow })[];
  archivedPlayers: (RoundPlayerRow & { profile: ProfileRow })[];
  scores: ScoreRow[];
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const maybeMessage =
      "message" in err ? (err as { message?: unknown }).message : undefined;
    if (typeof maybeMessage === "string" && maybeMessage.trim() !== "") {
      return new Error(maybeMessage);
    }
  }
  return new Error("Unexpected error");
}

function isMissingArchivedAtError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? (err as { code?: unknown }).code : undefined;
  const message =
    "message" in err ? (err as { message?: unknown }).message : undefined;
  if (code === "42703") return true; // undefined_column
  return typeof message === "string" && message.includes("archived_at");
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
        .maybeSingle();
      if (rErr) throw toError(rErr);
      if (!round) {
        throw new Error("This round no longer exists.");
      }

      const { data: course, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", round.course_id)
        .single();
      if (cErr) throw toError(cErr);

      const { data: holes, error: hErr } = await supabase
        .from("course_holes")
        .select("*")
        .eq("course_id", round.course_id)
        .order("hole_number", { ascending: true });
      if (hErr) throw toError(hErr);

      let rps: RoundPlayerRow[] = [];
      {
        const { data, error } = await supabase
          .from("round_players")
          .select("*")
          .eq("round_id", id)
          .order("archived_at", { ascending: true, nullsFirst: true })
          .order("position", { ascending: true });
        if (error) {
          if (!isMissingArchivedAtError(error)) throw toError(error);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("round_players")
            .select("*")
            .eq("round_id", id)
            .order("position", { ascending: true });
          if (fallbackError) throw toError(fallbackError);
          rps = (fallbackData ?? []) as RoundPlayerRow[];
        } else {
          rps = (data ?? []) as RoundPlayerRow[];
        }
      }

      const profileIds = rps.map((rp) => rp.profile_id);
      let profiles: ProfileRow[] = [];
      if (profileIds.length > 0) {
        const { data: profs, error: prErr } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds);
        if (prErr) throw toError(prErr);
        profiles = (profs ?? []) as ProfileRow[];
      }

      const { data: scores, error: sErr } = await supabase
        .from("scores")
        .select("*")
        .eq("round_id", id);
      if (sErr) throw toError(sErr);

      const players = rps.map((rp) => ({
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
      const activePlayers = players.filter((p) => p.archived_at == null);
      const archivedPlayers = players.filter((p) => p.archived_at != null);

      return {
        round: round as RoundRow,
        course: course as CourseRow,
        holes: (holes ?? []) as CourseHoleRow[],
        players,
        activePlayers,
        archivedPlayers,
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

export function useDeleteRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roundId: string): Promise<string> => {
      const { error } = await supabase.from("rounds").delete().eq("id", roundId);
      if (error) throw error;
      return roundId;
    },
    onSuccess: (roundId) => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
      qc.removeQueries({ queryKey: ["round-bundle", roundId] });
    },
  });
}

export interface UpdateRoundLineupInput {
  players: {
    id?: string;
    profile_id: string;
    course_handicap: number;
  }[];
}

export function useUpdateRoundLineup(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRoundLineupInput): Promise<void> => {
      if (!roundId) throw new Error("Round id is required");
      if (input.players.length < 1) throw new Error("Add at least one player");
      if (input.players.length > 12) throw new Error("Max 12 players");
      const profileIds = input.players.map((p) => p.profile_id);
      if (new Set(profileIds).size !== profileIds.length) {
        throw new Error("Duplicate players are not allowed");
      }

      const payload = input.players.map((p) => ({
        id: p.id ?? null,
        profile_id: p.profile_id,
        course_handicap: Math.round(p.course_handicap),
      }));
      const { error } = await supabase.rpc("update_round_lineup", {
        p_round_id: roundId,
        p_players: payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
      qc.invalidateQueries({ queryKey: ["round-bundle", roundId] });
    },
  });
}
