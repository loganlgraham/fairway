import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trophy } from "lucide-react";
import { useRoundBundle } from "@/hooks/useRound";
import { useRoundRealtime } from "@/hooks/useRoundRealtime";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { strokesReceived } from "@/scoring/strokesReceived";
import { strokeRanked } from "@/scoring/stroke";
import { stablefordRanked } from "@/scoring/stableford";
import { skinsRanked } from "@/scoring/skins";
import { matchPlayRanked } from "@/scoring/matchPlay";
import type { ScoringInput } from "@/scoring/types";
import { plus, formatDate } from "@/utils/format";
import { FORMAT_LABEL, type Format } from "@/types/golf";
import { MatchPlayPairTable } from "@/components/leaderboard/MatchPlayBoard";

export default function RoundSummaryPage() {
  const { roundId = "" } = useParams<{ roundId: string }>();
  const nav = useNavigate();
  const bundle = useRoundBundle(roundId);
  useRoundRealtime(roundId);

  const scoringInput = useMemo<ScoringInput>(() => {
    if (!bundle.data) return { players: [], holes: [], scores: {} };
    const scores: Record<string, Record<number, number | null>> = {};
    for (const p of bundle.data.players) scores[p.id] = {};
    for (const s of bundle.data.scores) {
      scores[s.round_player_id] = scores[s.round_player_id] ?? {};
      scores[s.round_player_id][s.hole_number] = s.strokes;
    }
    return {
      players: bundle.data.players.map((p) => ({
        id: p.id,
        display_name: p.profile.display_name,
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
  if (!bundle.data) {
    return (
      <Card>
        <p className="text-sm text-red-800">Could not load round.</p>
      </Card>
    );
  }

  const { round, course, holes, players } = bundle.data;

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
        {round.status === "in_progress" ? (
          <Button variant="secondary" onClick={() => nav(`/rounds/${round.id}`)}>
            Continue scoring
          </Button>
        ) : null}
      </header>

      <div>
        <CardEyebrow>{round.status === "completed" ? "Final" : "Live summary"}</CardEyebrow>
        <h1 className="font-display text-2xl font-semibold text-forest">
          {course.name}
        </h1>
        <p className="text-sm text-charcoal-muted">
          {formatDate(round.played_on)}
          {course.city || course.state ? " · " : ""}
          {[course.city, course.state].filter(Boolean).join(", ")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {round.formats.map((f) => (
          <WinnerCard key={f} format={f} input={scoringInput} />
        ))}
      </div>

      <Card>
        <CardTitle>Leaderboard</CardTitle>
        <div className="mt-3">
          <LeaderboardTabs formats={round.formats} input={scoringInput} />
          {round.formats.includes("match") ? (
            <MatchPlayPairTable input={scoringInput} />
          ) : null}
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-4 sm:p-5">
          <CardTitle>Scorecard</CardTitle>
        </div>
        <ScorecardGrid
          players={players.map((p) => ({
            id: p.id,
            display_name: p.profile.display_name,
            course_handicap: p.course_handicap,
          }))}
          holes={holes}
          scores={scoringInput.scores}
        />
      </Card>
    </div>
  );
}

function WinnerCard({
  format,
  input,
}: {
  format: Format;
  input: ScoringInput;
}) {
  const { name, line } = (() => {
    switch (format) {
      case "stroke": {
        const ranked = strokeRanked(input);
        const top = ranked[0];
        if (!top || top.holesPlayed === 0)
          return { name: "—", line: "Awaiting scores" };
        return {
          name: top.display_name,
          line: `Net ${top.net} (${plus(top.toParNet)})`,
        };
      }
      case "stableford": {
        const ranked = stablefordRanked(input);
        const top = ranked[0];
        if (!top || top.holesPlayed === 0)
          return { name: "—", line: "Awaiting scores" };
        return { name: top.display_name, line: `${top.points} pts` };
      }
      case "skins": {
        const ranked = skinsRanked(input);
        const top = ranked[0];
        if (!top || top.skins === 0)
          return { name: "—", line: "No skins awarded yet" };
        return {
          name: top.display_name,
          line: `${top.skins} skin${top.skins === 1 ? "" : "s"}`,
        };
      }
      case "match": {
        const ranked = matchPlayRanked(input);
        const top = ranked[0];
        if (!top) return { name: "—", line: "Awaiting scores" };
        return {
          name: top.display_name,
          line: `${top.wins}-${top.losses}-${top.ties} · ${
            top.differential > 0 ? "+" : ""
          }${top.differential}`,
        };
      }
      default: {
        const _exhaustive: never = format;
        return _exhaustive;
      }
    }
  })();
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <CardEyebrow>{FORMAT_LABEL[format]}</CardEyebrow>
          <CardTitle>{name}</CardTitle>
          <p className="truncate text-xs text-charcoal-muted">{line}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brass-50 text-brass-500">
          <Trophy size={18} />
        </span>
      </div>
    </Card>
  );
}

interface ScorecardGridProps {
  players: { id: string; display_name: string; course_handicap: number }[];
  holes: { hole_number: number; par: number; hcp_rating: number }[];
  scores: Record<string, Record<number, number | null | undefined>>;
}

function ScorecardGrid({ players, holes, scores }: ScorecardGridProps) {
  const front = holes.filter((h) => h.hole_number <= 9);
  const back = holes.filter((h) => h.hole_number > 9);

  const partials = (rows: typeof holes) =>
    rows.reduce((acc, h) => acc + h.par, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-xs">
        <thead className="bg-cream-50">
          <tr>
            <th className="sticky left-0 z-10 bg-cream-50 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-charcoal-muted">
              Player
            </th>
            {front.map((h) => (
              <HoleHeader key={h.hole_number} h={h} />
            ))}
            {front.length > 0 ? (
              <th className="bg-forest-50 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-forest">
                Out
              </th>
            ) : null}
            {back.map((h) => (
              <HoleHeader key={h.hole_number} h={h} />
            ))}
            {back.length > 0 ? (
              <th className="bg-forest-50 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-forest">
                In
              </th>
            ) : null}
            <th className="bg-forest px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-cream">
              Tot
            </th>
          </tr>
          <tr>
            <th className="sticky left-0 z-10 bg-cream-50 px-3 py-1 text-left text-[10px] font-medium text-charcoal-muted">
              Par
            </th>
            {front.map((h) => (
              <td
                key={`par-${h.hole_number}`}
                className="border-t border-line bg-cream-50 px-2 py-1 text-center text-[10px] text-charcoal-muted"
              >
                {h.par}
              </td>
            ))}
            {front.length > 0 ? (
              <td className="border-t border-line bg-forest-50 px-2 py-1 text-center text-[10px] font-medium text-forest">
                {partials(front)}
              </td>
            ) : null}
            {back.map((h) => (
              <td
                key={`par-${h.hole_number}`}
                className="border-t border-line bg-cream-50 px-2 py-1 text-center text-[10px] text-charcoal-muted"
              >
                {h.par}
              </td>
            ))}
            {back.length > 0 ? (
              <td className="border-t border-line bg-forest-50 px-2 py-1 text-center text-[10px] font-medium text-forest">
                {partials(back)}
              </td>
            ) : null}
            <td className="border-t border-line bg-forest px-2 py-1 text-center text-[10px] font-semibold text-cream">
              {partials(holes)}
            </td>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const ps = scores[p.id] ?? {};
            const sumOf = (rows: typeof holes) =>
              rows.reduce(
                (acc, h) => acc + (ps[h.hole_number] ?? 0),
                0,
              );
            const outScore = sumOf(front);
            const inScore = sumOf(back);
            const total = outScore + inScore;
            return (
              <tr key={p.id}>
                <th className="sticky left-0 z-10 border-t border-line bg-white px-3 py-2 text-left">
                  <p className="text-sm font-medium text-charcoal">
                    {p.display_name}
                  </p>
                  <p className="text-[10px] text-charcoal-muted">
                    CH {p.course_handicap}
                  </p>
                </th>
                {front.map((h) => (
                  <CellCell
                    key={`${p.id}:${h.hole_number}`}
                    par={h.par}
                    hcp={h.hcp_rating}
                    ch={p.course_handicap}
                    gross={ps[h.hole_number] ?? null}
                  />
                ))}
                {front.length > 0 ? (
                  <td className="border-t border-line bg-forest-50 px-2 py-2 text-center text-sm font-medium text-forest">
                    {outScore || "—"}
                  </td>
                ) : null}
                {back.map((h) => (
                  <CellCell
                    key={`${p.id}:${h.hole_number}`}
                    par={h.par}
                    hcp={h.hcp_rating}
                    ch={p.course_handicap}
                    gross={ps[h.hole_number] ?? null}
                  />
                ))}
                {back.length > 0 ? (
                  <td className="border-t border-line bg-forest-50 px-2 py-2 text-center text-sm font-medium text-forest">
                    {inScore || "—"}
                  </td>
                ) : null}
                <td className="border-t border-line bg-forest px-2 py-2 text-center text-sm font-semibold text-cream">
                  {total || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HoleHeader({ h }: { h: { hole_number: number; par: number; hcp_rating: number } }) {
  return (
    <th className="border-l border-line bg-cream-50 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-charcoal-muted">
      <div className="leading-none">{h.hole_number}</div>
      <div className="mt-0.5 text-[9px] font-normal opacity-70">
        H{h.hcp_rating}
      </div>
    </th>
  );
}

function CellCell({
  par,
  hcp,
  ch,
  gross,
}: {
  par: number;
  hcp: number;
  ch: number;
  gross: number | null;
}) {
  const dots = strokesReceived(ch, hcp);
  const diff = gross != null ? gross - par : null;
  let bg = "bg-white";
  let txt = "text-charcoal";
  if (diff != null) {
    if (diff <= -2) {
      bg = "bg-brass";
      txt = "text-cream";
    } else if (diff === -1) {
      bg = "bg-forest";
      txt = "text-cream";
    } else if (diff === 0) {
      bg = "bg-white";
      txt = "text-forest font-semibold";
    } else if (diff >= 2) {
      bg = "bg-cream-50";
      txt = "text-charcoal-muted";
    }
  }
  return (
    <td className={`relative border-l border-t border-line px-2 py-2 text-center text-sm ${bg} ${txt}`}>
      {gross ?? "—"}
      {dots > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex gap-[1px]">
          {Array.from({ length: Math.min(dots, 3) }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-brass"
              aria-hidden
            />
          ))}
        </span>
      ) : null}
      {dots < 0 ? (
        <span className="absolute right-0.5 top-0.5 flex gap-[1px]">
          {Array.from({ length: Math.min(-dots, 3) }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full border border-forest"
              aria-hidden
            />
          ))}
        </span>
      ) : null}
    </td>
  );
}
