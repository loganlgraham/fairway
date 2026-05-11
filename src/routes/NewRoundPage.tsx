import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Flag } from "lucide-react";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CourseSearch } from "@/components/courses/CourseSearch";
import { CustomCourseForm } from "@/components/courses/CustomCourseForm";
import { PlayerPicker, type PickedPlayer } from "@/components/players/PlayerPicker";
import { ALL_FORMATS, FORMAT_LABEL, type Format } from "@/types/golf";
import type { CourseRow } from "@/types/database";
import { useCreateRound } from "@/hooks/useRound";
import { useSelfProfile } from "@/hooks/useFriends";
import { useToast } from "@/components/ui/Toast";

type Step = "course" | "format" | "players";

export default function NewRoundPage() {
  const nav = useNavigate();
  const self = useSelfProfile();
  const create = useCreateRound();
  const { show } = useToast();

  const [step, setStep] = useState<Step>("course");
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [formats, setFormats] = useState<Format[]>(["stroke"]);
  const [players, setPlayers] = useState<PickedPlayer[]>([]);
  const [tab, setTab] = useState<"search" | "custom">("search");

  // Seed lineup with self once the profile loads
  useEffect(() => {
    if (self.data && players.length === 0) {
      const ch =
        self.data.handicap_index != null
          ? Math.round(self.data.handicap_index)
          : 0;
      setPlayers([{ profile: self.data, course_handicap: ch }]);
    }
  }, [self.data, players.length]);

  const toggleFormat = (f: Format) => {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const onCreate = async () => {
    if (!course) return;
    if (formats.length === 0) {
      show("Pick at least one format.", "error");
      return;
    }
    if (players.length === 0) {
      show("Add at least one player.", "error");
      return;
    }
    try {
      const round = await create.mutateAsync({
        course,
        formats,
        players: players.map((p) => ({
          profile_id: p.profile.id,
          course_handicap: p.course_handicap,
        })),
      });
      nav(`/rounds/${round.id}`);
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not create round",
        "error",
      );
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => nav("/")}
          className="-ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-charcoal-muted hover:bg-cream-200"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </header>

      <div>
        <CardEyebrow>The first tee</CardEyebrow>
        <h1 className="font-display text-2xl font-semibold text-forest">
          New round
        </h1>
      </div>

      <StepIndicator step={step} />

      {step === "course" ? (
        <Card>
          <CardTitle>Course</CardTitle>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={tab === "search" ? "chip-on" : "chip"}
              onClick={() => setTab("search")}
            >
              Search
            </button>
            <button
              type="button"
              className={tab === "custom" ? "chip-on" : "chip"}
              onClick={() => setTab("custom")}
            >
              Custom course
            </button>
          </div>
          <div className="mt-4">
            {tab === "search" ? (
              <CourseSearch
                onSelected={(c) => {
                  setCourse(c);
                  setStep("format");
                }}
              />
            ) : (
              <CustomCourseForm
                onCreated={(c) => {
                  setCourse(c);
                  setStep("format");
                }}
              />
            )}
          </div>
        </Card>
      ) : null}

      {step === "format" && course ? (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardEyebrow>Course</CardEyebrow>
              <CardTitle>{course.name}</CardTitle>
              <p className="text-sm text-charcoal-muted">
                {[course.city, course.state, course.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setStep("course")}>
              Change
            </Button>
          </div>
          <div className="mt-4">
            <p className="label">Formats (pick one or more)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_FORMATS.map((f) => {
                const on = formats.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFormat(f)}
                    className={on ? "chip-on" : "chip"}
                  >
                    {on ? <Check size={12} /> : null}
                    {FORMAT_LABEL[f]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              onClick={() => setStep("players")}
              disabled={formats.length === 0}
            >
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "players" && course ? (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardEyebrow>Lineup</CardEyebrow>
              <CardTitle>Players</CardTitle>
              <p className="text-sm text-charcoal-muted">
                Up to 12. Course Handicap defaults to rounded HI; tweak as
                needed.
              </p>
            </div>
            <Button variant="ghost" onClick={() => setStep("format")}>
              Back
            </Button>
          </div>
          <div className="mt-4">
            <PlayerPicker picked={players} onChange={setPlayers} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              onClick={onCreate}
              loading={create.isPending}
              disabled={players.length === 0}
              leadingIcon={!create.isPending ? <Flag size={14} /> : undefined}
            >
              Start round
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "course", label: "Course" },
    { id: "format", label: "Format" },
    { id: "players", label: "Players" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={[
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                active
                  ? "border-forest bg-forest text-cream"
                  : done
                    ? "border-brass bg-brass text-cream"
                    : "border-line bg-white text-charcoal-muted",
              ].join(" ")}
            >
              {i + 1}
            </span>
            <span
              className={
                active
                  ? "font-medium text-forest"
                  : "text-charcoal-muted"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-line" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
