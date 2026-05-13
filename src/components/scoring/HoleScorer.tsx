import { useRef } from "react";
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
  prevHoleNumber?: number | null;
  nextHoleNumber?: number | null;
  readonly?: boolean;
}

const SWIPE_DISTANCE_THRESHOLD = 50;
const SWIPE_DOMINANCE_RATIO = 1.5;

export function HoleScorer({
  roundId,
  hole,
  players,
  scoreFor,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  prevHoleNumber = null,
  nextHoleNumber = null,
  readonly = false,
}: HoleScorerProps) {
  const upsert = useUpsertScore();
  const touchStart = useRef<{ x: number; y: number; onInput: boolean } | null>(
    null,
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    if (!t) return;
    const target = e.target as HTMLElement | null;
    const onInput =
      target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
    touchStart.current = { x: t.clientX, y: t.clientY, onInput };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.onInput) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE_RATIO) return;
    if (dx < 0 && hasNext) {
      onNext();
    } else if (dx > 0 && hasPrev) {
      onPrev();
    }
  };

  return (
    <section
      className="card-padded touch-pan-y select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-stretch justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex min-h-11 flex-1 items-center justify-start gap-1 rounded-lg px-2 text-sm font-medium text-charcoal-muted hover:bg-cream-200 disabled:pointer-events-none disabled:opacity-30 sm:flex-none"
          aria-label={
            prevHoleNumber != null
              ? `Previous hole, hole ${prevHoleNumber}`
              : "Previous hole"
          }
        >
          <ChevronLeft size={20} />
          {prevHoleNumber != null ? <span>{prevHoleNumber}</span> : null}
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
          className="inline-flex min-h-11 flex-1 items-center justify-end gap-1 rounded-lg px-2 text-sm font-medium text-charcoal-muted hover:bg-cream-200 disabled:pointer-events-none disabled:opacity-30 sm:flex-none"
          aria-label={
            nextHoleNumber != null
              ? `Next hole, hole ${nextHoleNumber}`
              : "Next hole"
          }
        >
          {nextHoleNumber != null ? <span>{nextHoleNumber}</span> : null}
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
                holeNumber={hole.hole_number}
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
