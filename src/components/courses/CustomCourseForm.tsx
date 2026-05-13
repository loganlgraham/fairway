import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateCustomCourse } from "@/hooks/useCourses";
import {
  ConfirmHoleDataModal,
  type ConfirmHoleRow,
} from "./ConfirmHoleDataModal";
import { ScorecardImport } from "./ScorecardImport";
import type { CourseRow } from "@/types/database";
import { useToast } from "@/components/ui/Toast";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ScorecardExtractResult } from "@/types/golf";

interface CustomCourseFormProps {
  onCreated: (course: CourseRow) => void;
}

export function CustomCourseForm({ onCreated }: CustomCourseFormProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const [openHoles, setOpenHoles] = useState(false);
  const [imported, setImported] = useState<ScorecardExtractResult | null>(null);
  const [saveVisibility, setSaveVisibility] = useState<"private" | "shared">(
    "private",
  );
  const { show } = useToast();
  const create = useCreateCustomCourse();

  const initialHoles = useMemo(() => {
    if (imported) {
      const holesByNumber = new Map(
        imported.holes.map((hole) => [hole.hole_number, hole]),
      );
      return Array.from({ length: numHoles }, (_, i) => {
        const holeNumber = i + 1;
        const parsed = holesByNumber.get(holeNumber);
        return {
          hole_number: holeNumber,
          par: parsed?.par ?? undefined,
          hcp_rating: parsed?.hcp_rating ?? undefined,
          yards: parsed?.yards ?? null,
        };
      });
    }

    return Array.from({ length: numHoles }, (_, i) => ({
      hole_number: i + 1,
      par: 4,
      hcp_rating: i + 1,
      yards: null,
    }));
  }, [imported, numHoles]);

  const canContinue = name.trim().length > 1;

  const onImported = (result: ScorecardExtractResult) => {
    setImported(result);
    if (result.course_name) setName(result.course_name);
    if (result.city) setCity(result.city);
    if (result.state) setState(result.state);
    if (result.country) setCountry(result.country);
    setNumHoles(result.num_holes);
    setSaveVisibility("private");
    setOpenHoles(true);
    if (!result.course_name) {
      show("Add a course name before saving the imported scorecard.", "error");
    }
  };

  const onConfirm = async (holes: ConfirmHoleRow[]) => {
    if (!name.trim()) {
      show("Add a course name before saving.", "error");
      return;
    }

    try {
      const course = await create.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null,
        num_holes: numHoles,
        is_public: imported ? saveVisibility === "shared" : false,
        holes,
      });
      setOpenHoles(false);
      setImported(null);
      onCreated(course);
    } catch (err) {
      const e = err as Partial<PostgrestError> | Error;
      const details =
        "code" in e || "details" in e
          ? [
              e.message,
              (e as Partial<PostgrestError>).code,
              (e as Partial<PostgrestError>).details,
            ]
              .filter(Boolean)
              .join(" | ")
          : err instanceof Error
            ? err.message
            : "Failed to create course";
      show(details || "Failed to create course", "error");
    }
  };

  return (
    <div className="space-y-3">
      <ScorecardImport onImported={onImported} />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-[11px] uppercase tracking-wide text-charcoal-muted">
          or enter manually
        </span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <Input
        label="Course name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Pine Ridge Country Club"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Input
          label="State / Region"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
      </div>
      <Input
        label="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
      <div>
        <span className="label">Holes</span>
        <div className="flex gap-2">
          {([9, 18] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumHoles(n)}
              className={numHoles === n ? "chip-on" : "chip"}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Button
        onClick={() => setOpenHoles(true)}
        disabled={!canContinue}
        fullWidth
      >
        Enter hole data
      </Button>

      <ConfirmHoleDataModal
        open={openHoles}
        courseName={name.trim() || "Custom course"}
        numHoles={numHoles}
        initial={initialHoles}
        saving={create.isPending}
        reviewContent={
          imported ? (
            <div className="space-y-3 rounded-lg border border-line bg-cream-50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-muted">
                <span>
                  Parsed from scorecard
                  {imported.tee_name ? ` (${imported.tee_name} tees)` : ""}.
                </span>
                <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-charcoal">
                  Confidence {Math.round(imported.confidence * 100)}%
                </span>
              </div>
              {imported.warnings.length > 0 ? (
                <ul className="space-y-1 text-xs text-red-800">
                  {imported.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <span className="label">Save visibility</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveVisibility("private")}
                    className={
                      saveVisibility === "private" ? "chip-on" : "chip"
                    }
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveVisibility("shared")}
                    className={
                      saveVisibility === "shared" ? "chip-on" : "chip"
                    }
                  >
                    Shared
                  </button>
                </div>
                <p className="mt-1 text-xs text-charcoal-muted">
                  Shared courses are visible to other players, but only you can
                  edit this imported copy.
                </p>
              </div>
            </div>
          ) : null
        }
        onCancel={() => setOpenHoles(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
}
