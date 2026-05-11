import { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import {
  useOpenGolfCourse,
  useOpenGolfSearch,
  useUpsertOpenGolfCourse,
} from "@/hooks/useCourses";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ConfirmHoleDataModal,
  type ConfirmHoleRow,
} from "./ConfirmHoleDataModal";
import type { CourseRow } from "@/types/database";
import { useToast } from "@/components/ui/Toast";

interface CourseSearchProps {
  onSelected: (course: CourseRow) => void;
}

export function CourseSearch({ onSelected }: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string>("");
  const { show } = useToast();

  const search = useOpenGolfSearch(query);
  const detail = useOpenGolfCourse(pickedId);
  const upsert = useUpsertOpenGolfCourse();

  const onConfirmHoles = async (holes: ConfirmHoleRow[]) => {
    if (!detail.data) return;
    try {
      const course = await upsert.mutateAsync({
        detail: detail.data,
        holes,
      });
      setPickedId(null);
      setPickedName("");
      onSelected(course);
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Failed to save course",
        "error",
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted"
        />
        <Input
          placeholder="Search OpenGolfAPI..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search courses"
        />
        {search.isFetching ? (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-charcoal-muted"
          />
        ) : null}
      </div>

      {query.trim().length >= 2 && search.isError ? (
        <p className="text-xs text-red-800">
          Could not reach OpenGolfAPI. You can still add a custom course below.
        </p>
      ) : null}

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
        {(search.data ?? []).slice(0, 8).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                setPickedId(r.id);
                setPickedName(r.name);
              }}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-cream-50"
            >
              <MapPin size={16} className="mt-0.5 text-brass" />
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal">{r.name}</p>
                <p className="truncate text-xs text-charcoal-muted">
                  {[r.city, r.state, r.country].filter(Boolean).join(", ") ||
                    "Location unknown"}
                </p>
              </div>
            </button>
          </li>
        ))}
        {query.trim().length >= 2 &&
        !search.isFetching &&
        (search.data ?? []).length === 0 ? (
          <li className="px-3 py-3 text-sm text-charcoal-muted">
            No matches. Try a different query or add a custom course.
          </li>
        ) : null}
      </ul>

      <ConfirmHoleDataModal
        open={!!pickedId && !!detail.data}
        courseName={detail.data?.name ?? pickedName}
        numHoles={detail.data?.num_holes ?? 18}
        initial={
          detail.data?.holes.map((h) => ({
            hole_number: h.hole_number,
            par: h.par ?? undefined,
            hcp_rating: h.hcp_rating ?? undefined,
            yards: h.yards,
          })) ?? []
        }
        saving={upsert.isPending}
        onCancel={() => {
          setPickedId(null);
          setPickedName("");
        }}
        onConfirm={onConfirmHoles}
      />

      {pickedId && detail.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-charcoal-muted">
          <Loader2 size={14} className="animate-spin" /> Loading hole data...
        </div>
      ) : null}
      {pickedId && detail.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cream-50 px-3 py-2 text-xs text-red-800">
          <span>Could not load course details.</span>
          <Button
            variant="ghost"
            onClick={() => {
              setPickedId(null);
              setPickedName("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}
