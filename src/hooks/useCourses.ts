import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CourseHoleRow, CourseRow } from "@/types/database";
import {
  getCourse,
  searchCourses,
  type OpenGolfCourseDetail,
  type OpenGolfSearchResult,
} from "@/lib/opengolf";

export function useOpenGolfSearch(query: string) {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  return useQuery<OpenGolfSearchResult[]>({
    queryKey: ["opengolf-search", debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: ({ signal }) => searchCourses(debounced, signal),
  });
}

export function useOpenGolfCourse(id: string | null) {
  return useQuery<OpenGolfCourseDetail>({
    queryKey: ["opengolf-course", id],
    enabled: !!id,
    queryFn: () => getCourse(id as string),
  });
}

export function useRecentCourses(limit = 12) {
  return useQuery<CourseRow[]>({
    queryKey: ["courses-recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });
}

export function useCourseWithHoles(courseId: string | null) {
  return useQuery({
    queryKey: ["course-with-holes", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: course, error: e1 } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId as string)
        .single();
      if (e1) throw e1;
      const { data: holes, error: e2 } = await supabase
        .from("course_holes")
        .select("*")
        .eq("course_id", courseId as string)
        .order("hole_number", { ascending: true });
      if (e2) throw e2;
      return {
        course: course as CourseRow,
        holes: (holes ?? []) as CourseHoleRow[],
      };
    },
  });
}

interface UpsertOpenGolfCourseInput {
  detail: OpenGolfCourseDetail;
  // Holes overridden by the user in the confirm modal (par + hcp_rating)
  holes: { hole_number: number; par: number; hcp_rating: number; yards: number | null }[];
}

export function useUpsertOpenGolfCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ detail, holes }: UpsertOpenGolfCourseInput) => {
      const { data: courseRow, error: cErr } = await supabase
        .from("courses")
        .upsert(
          {
            opengolf_id: detail.id,
            name: detail.name,
            city: detail.city,
            state: detail.state,
            country: detail.country,
            num_holes: detail.num_holes,
            is_public: true,
            created_by: null,
          },
          { onConflict: "opengolf_id" },
        )
        .select()
        .single();
      if (cErr) throw cErr;
      const course = courseRow as CourseRow;

      const rows = holes.map((h) => ({
        course_id: course.id,
        hole_number: h.hole_number,
        par: h.par,
        hcp_rating: h.hcp_rating,
        yards: h.yards,
      }));
      const { error: hErr } = await supabase
        .from("course_holes")
        .upsert(rows, { onConflict: "course_id,hole_number" });
      if (hErr) throw hErr;

      return course;
    },
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: ["courses-recent"] });
      qc.invalidateQueries({ queryKey: ["course-with-holes", course.id] });
    },
  });
}

interface CreateCustomCourseInput {
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  num_holes: 9 | 18;
  holes: { hole_number: number; par: number; hcp_rating: number; yards: number | null }[];
}

export function useCreateCustomCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomCourseInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;

      const { data: courseRow, error: cErr } = await supabase
        .from("courses")
        .insert({
          name: input.name,
          city: input.city,
          state: input.state,
          country: input.country,
          num_holes: input.num_holes,
          is_public: false,
          created_by: userId,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      const course = courseRow as CourseRow;

      const rows = input.holes.map((h) => ({
        course_id: course.id,
        hole_number: h.hole_number,
        par: h.par,
        hcp_rating: h.hcp_rating,
        yards: h.yards,
      }));
      const { error: hErr } = await supabase.from("course_holes").insert(rows);
      if (hErr) throw hErr;
      return course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-recent"] });
    },
  });
}
