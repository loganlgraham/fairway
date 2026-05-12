import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Subscribes to changes on scores, rounds, and round players for the given round id,
// and refreshes the round bundle so the leaderboard stays live.
export function useRoundRealtime(roundId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!roundId) return;
    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["round-bundle", roundId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_players",
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["round-bundle", roundId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `id=eq.${roundId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["round-bundle", roundId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, qc]);
}
