import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ScoreRow } from "@/types/database";

export interface UpsertScoreInput {
  round_id: string;
  round_player_id: string;
  hole_number: number;
  strokes: number | null;
}

export function useUpsertScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertScoreInput): Promise<ScoreRow> => {
      const { data, error } = await supabase
        .from("scores")
        .upsert(
          {
            round_id: input.round_id,
            round_player_id: input.round_player_id,
            hole_number: input.hole_number,
            strokes: input.strokes,
          },
          { onConflict: "round_player_id,hole_number" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as ScoreRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["round-bundle", row.round_id] });
    },
  });
}
