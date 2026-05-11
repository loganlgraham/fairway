import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUpsertScore } from "@/hooks/useScores";
import { strokesReceived } from "@/scoring/strokesReceived";
import type { CourseHoleRow, RoundPlayerRow, ProfileRow } from "@/types/database";
import { ScoreCell } from "./ScoreCell";
import { StrokesDots } from "./StrokesDots";

interface HoleScorerProps {
  roundId: string;
  hole: CourseHoleRow;
  players: (RoundPlayerRow & { profile: ProfileRow })[];
  scoreFor: (roundPlayerId: string, holeNumber: number) => number | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  readonly?: boolean;
}

export function HoleScorer({
  roundId,
  hole,
  players,
  scoreFor,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  readonly = false,
}: HoleScorerProps) {
  const upsert = useUpsertScore();

  return (
    <section className="card-padded">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="rounded-md p-1.5 text-charcoal-muted hover:bg-cream-200 disabled:opacity-30"
          aria-label="Previous hole"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
            Hole
          </p>
          <p className="font-display text-4xl font-semibold leading-none text-forest">
            {hole.hole_number}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">
            Par {hole.par}
            {hole.yards ? ` · ${hole.yards}y` : ""} · HCP {hole.hcp_rating}
          </p>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-md p-1.5 text-charcoal-muted hover:bg-cream-200 disabled:opacity-30"
          aria-label="Next hole"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {players.map((p) => {
          const dots = strokesReceived(p.course_handicap, hole.hcp_rating);
          const value = scoreFor(p.id, hole.hole_number);
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">
                  {p.profile.display_name}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                  CH {p.course_handicap}
                  {dots ? <StrokesDots value={dots} /> : null}
                </p>
              </div>
              <ScoreCell
                value={value}
                par={hole.par}
                disabled={readonly || upsert.isPending}
                onCommit={(next) => {
                  if (next === value) return;
                  void upsert.mutateAsync({
                    round_id: roundId,
                    round_player_id: p.id,
                    hole_number: hole.hole_number,
                    strokes: next,
                  });
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
