import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateCustomCourse } from "@/hooks/useCourses";
import {
  ConfirmHoleDataModal,
  type ConfirmHoleRow,
} from "./ConfirmHoleDataModal";
import type { CourseRow } from "@/types/database";
import { useToast } from "@/components/ui/Toast";

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
  const { show } = useToast();
  const create = useCreateCustomCourse();

  const initialHoles = useMemo(
    () =>
      Array.from({ length: numHoles }, (_, i) => ({
        hole_number: i + 1,
        par: 4,
        hcp_rating: i + 1,
        yards: null,
      })),
    [numHoles],
  );

  const canContinue = name.trim().length > 1;

  const onConfirm = async (holes: ConfirmHoleRow[]) => {
    try {
      const course = await create.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null,
        num_holes: numHoles,
        holes,
      });
      setOpenHoles(false);
      onCreated(course);
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Failed to create course",
        "error",
      );
    }
  };

  return (
    <div className="space-y-3">
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
        onCancel={() => setOpenHoles(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
}
