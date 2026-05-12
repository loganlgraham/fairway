import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Flag, Users, Wifi } from "lucide-react";
import {
  useCompleteRound,
  useRoundBundle,
  useUpdateRoundLineup,
} from "@/hooks/useRound";
import { useRoundRealtime } from "@/hooks/useRoundRealtime";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { HoleScorer } from "@/components/scoring/HoleScorer";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { PlayerPicker } from "@/components/players/PlayerPicker";
import type { PickedPlayer } from "@/components/players/PlayerPicker";
import type { ScoringInput } from "@/scoring/types";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/auth/useAuth";
import { FORMAT_SHORT } from "@/types/golf";

export default function RoundPage() {
  const { roundId = "" } = useParams<{ roundId: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const bundle = useRoundBundle(roundId);
  const complete = useCompleteRound();
  const updateLineup = useUpdateRoundLineup(roundId);
  const { show } = useToast();
  useRoundRealtime(roundId);

  const [holeIdx, setHoleIdx] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [editPlayersOpen, setEditPlayersOpen] = useState(false);
  const [lineupDraft, setLineupDraft] = useState<PickedPlayer[]>([]);

  const scoreLookup = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!bundle.data) return map;
    for (const s of bundle.data.scores) {
      map.set(`${s.round_player_id}:${s.hole_number}`, s.strokes);
    }
    return map;
  }, [bundle.data]);

  const scoringInput = useMemo<ScoringInput>(() => {
    if (!bundle.data) {
      return { players: [], holes: [], scores: {} };
    }
    const scores: Record<string, Record<number, number | null>> = {};
    for (const p of bundle.data.players) scores[p.id] = {};
    for (const s of bundle.data.scores) {
      scores[s.round_player_id] = scores[s.round_player_id] ?? {};
      scores[s.round_player_id][s.hole_number] = s.strokes;
    }
    return {
      players: bundle.data.players.map((p) => ({
        id: p.id,
        display_name:
          p.archived_at == null
            ? p.profile.display_name
            : `${p.profile.display_name} (Archived)`,
        course_handicap: p.course_handicap,
      })),
      holes: bundle.data.holes,
      scores,
    };
  }, [bundle.data]);

  if (bundle.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (bundle.error || !bundle.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => nav("/")} leadingIcon={<ChevronLeft size={14} />}>
          Back
        </Button>
        <Card>
          <p className="text-sm text-red-800">
            {bundle.error instanceof Error
              ? bundle.error.message
              : "Could not load round."}
          </p>
        </Card>
      </div>
    );
  }

  const { round, course, holes, activePlayers } = bundle.data;
  const hole = holes[Math.min(holeIdx, holes.length - 1)];
  const isOwner = round.owner_id === user?.id;
  const readonly = !isOwner || round.status === "completed";

  const activePlayerIds = new Set(activePlayers.map((p) => p.id));
  const totalScored = bundle.data.scores.filter(
    (s) => s.strokes != null && activePlayerIds.has(s.round_player_id),
  ).length;
  const expected = holes.length * activePlayers.length;
  const progressPct = expected > 0 ? Math.round((totalScored / expected) * 100) : 0;

  const finish = async () => {
    try {
      await complete.mutateAsync(round.id);
      nav(`/rounds/${round.id}/summary`);
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not complete round",
        "error",
      );
    }
  };

  const openEditPlayers = () => {
    setLineupDraft(
      activePlayers.map((p) => ({
        profile: p.profile,
        course_handicap: p.course_handicap,
      })),
    );
    setEditPlayersOpen(true);
  };

  const saveLineup = async () => {
    try {
      await updateLineup.mutateAsync({
        players: lineupDraft.map((p) => ({
          profile_id: p.profile.id,
          course_handicap: p.course_handicap,
          id:
            activePlayers.find((ap) => ap.profile_id === p.profile.id)?.id ??
            undefined,
        })),
      });
      setEditPlayersOpen(false);
      show("Player lineup updated", "success");
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not update players",
        "error",
      );
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => nav("/")}
          className="-ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-charcoal-muted hover:bg-cream-200"
        >
          <ChevronLeft size={16} /> Home
        </button>
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-charcoal-muted">
          <Wifi size={12} className="text-forest" /> Live
        </span>
      </header>

      <div>
        <CardEyebrow>Round in progress</CardEyebrow>
        <h1 className="font-display text-2xl font-semibold text-forest">
          {course.name}
        </h1>
        <p className="text-sm text-charcoal-muted">
          {round.formats.map((f) => FORMAT_SHORT[f]).join(" · ")} ·{" "}
          {activePlayers.length} player{activePlayers.length === 1 ? "" : "s"} ·{" "}
          {progressPct}% complete
        </p>
        {!isOwner ? (
          <p className="mt-1 text-xs text-charcoal-muted">
            Viewing live; only the round creator can edit scores.
          </p>
        ) : null}
      </div>

      {hole ? (
        <HoleScorer
          roundId={round.id}
          hole={hole}
          players={activePlayers}
          scoreFor={(rpId, h) => scoreLookup.get(`${rpId}:${h}`) ?? null}
          onPrev={() => setHoleIdx((i) => Math.max(0, i - 1))}
          onNext={() => setHoleIdx((i) => Math.min(holes.length - 1, i + 1))}
          hasPrev={holeIdx > 0}
          hasNext={holeIdx < holes.length - 1}
          readonly={readonly}
        />
      ) : null}

      <HoleStrip
        holes={holes}
        activeIdx={holeIdx}
        onPick={setHoleIdx}
        completedHoleNumbers={completedHoles({
          scores: bundle.data.scores,
          players: activePlayers,
        })}
      />

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <CardEyebrow>Leaderboard</CardEyebrow>
        </div>
        <LeaderboardTabs
          formats={round.formats}
          input={scoringInput}
          compact
        />
      </Card>

      {isOwner && round.status !== "completed" ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={openEditPlayers}
            leadingIcon={<Users size={14} />}
          >
            Edit players
          </Button>
          <Button
            onClick={() => setConfirmFinish(true)}
            leadingIcon={<Flag size={14} />}
          >
            Finish round
          </Button>
        </div>
      ) : null}

      <Modal
        open={editPlayersOpen}
        onClose={() => setEditPlayersOpen(false)}
        title="Edit players"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditPlayersOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveLineup}
              loading={updateLineup.isPending}
              disabled={lineupDraft.length === 0}
            >
              Save players
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-charcoal-muted">
          Removed players stay visible on the leaderboard as archived.
        </p>
        <PlayerPicker picked={lineupDraft} onChange={setLineupDraft} />
      </Modal>

      <Modal
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Finish this round?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmFinish(false)}>
              Keep playing
            </Button>
            <Button onClick={finish} loading={complete.isPending} leadingIcon={<CheckCircle2 size={14} />}>
              Yes, finish
            </Button>
          </>
        }
      >
        <p className="text-sm text-charcoal">
          You can still review the scorecard, but no more scores can be entered.
        </p>
      </Modal>
    </div>
  );
}

function completedHoles(bundle: {
  scores: { hole_number: number; strokes: number | null }[];
  players: { id: string }[];
}): Set<number> {
  const counts = new Map<number, number>();
  for (const s of bundle.scores) {
    if (s.strokes == null) continue;
    counts.set(s.hole_number, (counts.get(s.hole_number) ?? 0) + 1);
  }
  const complete = new Set<number>();
  counts.forEach((n, hole) => {
    if (n === bundle.players.length) complete.add(hole);
  });
  return complete;
}

interface HoleStripProps {
  holes: { hole_number: number; par: number }[];
  activeIdx: number;
  onPick: (idx: number) => void;
  completedHoleNumbers: Set<number>;
}

function HoleStrip({ holes, activeIdx, onPick, completedHoleNumbers }: HoleStripProps) {
  return (
    <div className="card-padded">
      <div className="flex gap-1.5 overflow-x-auto">
        {holes.map((h, i) => {
          const isActive = i === activeIdx;
          const done = completedHoleNumbers.has(h.hole_number);
          return (
            <button
              key={h.hole_number}
              type="button"
              onClick={() => onPick(i)}
              className={[
                "flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-md border text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-forest bg-forest text-cream"
                  : done
                    ? "border-brass bg-brass-50 text-brass-500"
                    : "border-line bg-white text-charcoal hover:bg-cream-50",
              ].join(" ")}
              aria-label={`Hole ${h.hole_number}, par ${h.par}`}
            >
              <span>{h.hole_number}</span>
              <span className="text-[10px] font-normal opacity-70">
                {h.par}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
