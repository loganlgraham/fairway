import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";
import { useAuth } from "@/auth/useAuth";

export function useSelfProfile() {
  const { user } = useAuth();
  return useQuery<ProfileRow | null>({
    queryKey: ["self-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });
}

export function useFriends() {
  const { user } = useAuth();
  return useQuery<ProfileRow[]>({
    queryKey: ["friends", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", user!.id)
        .is("user_id", null)
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });
}

interface ProfileUpsertInput {
  id?: string;
  display_name: string;
  ghin_number?: string | null;
  handicap_index?: number | null;
  low_hi?: number | null;
  home_club?: string | null;
}

export function useUpsertSelfProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpsertInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: input.display_name,
          ghin_number: input.ghin_number ?? null,
          handicap_index: input.handicap_index ?? null,
          low_hi: input.low_hi ?? null,
          home_club: input.home_club ?? null,
        })
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["self-profile"] });
    },
  });
}

export function useCreateFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpsertInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: null,
          owner_id: user.id,
          display_name: input.display_name,
          ghin_number: input.ghin_number ?? null,
          handicap_index: input.handicap_index ?? null,
          low_hi: input.low_hi ?? null,
          home_club: input.home_club ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useUpdateFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ProfileUpsertInput & { id: string },
    ): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: input.display_name,
          ghin_number: input.ghin_number ?? null,
          handicap_index: input.handicap_index ?? null,
          low_hi: input.low_hi ?? null,
          home_club: input.home_club ?? null,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useDeleteFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}
