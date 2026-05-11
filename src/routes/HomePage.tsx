import { Link } from "react-router-dom";
import { Plus, Flag } from "lucide-react";
import { useRecentRounds } from "@/hooks/useRound";
import { useSelfProfile } from "@/hooks/useFriends";
import { useCourseWithHoles } from "@/hooks/useCourses";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, formatHandicap } from "@/utils/format";
import { FORMAT_SHORT } from "@/types/golf";
import type { RoundRow } from "@/types/database";

export default function HomePage() {
  const self = useSelfProfile();
  const rounds = useRecentRounds(10);

  return (
    <div className="space-y-5">
      <header>
        <CardEyebrow>The clubhouse</CardEyebrow>
        <h1 className="font-display text-2xl font-semibold text-forest">
          {greeting()}
          {self.data?.display_name ? `, ${self.data.display_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-charcoal-muted">
          HCP {formatHandicap(self.data?.handicap_index)}
          {self.data?.home_club ? ` · ${self.data.home_club}` : ""}
        </p>
      </header>

      <Link to="/rounds/new" className="block">
        <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-cream-50">
          <div>
            <CardEyebrow>Tee it up</CardEyebrow>
            <CardTitle>New round</CardTitle>
            <p className="text-sm text-charcoal-muted">
              Pick a course, choose formats, add up to 12 players.
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest text-cream">
            <Plus size={18} />
          </span>
        </Card>
      </Link>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-forest">
          Recent rounds
        </h2>
        {rounds.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (rounds.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Flag size={28} />}
            title="No rounds yet"
            description="Start your first round and the leaderboard will live here."
            action={
              <Link to="/rounds/new">
                <Button>Start a round</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(rounds.data ?? []).map((r) => (
              <li key={r.id}>
                <RoundRow round={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RoundRow({ round }: { round: RoundRow }) {
  const c = useCourseWithHoles(round.course_id);
  const href =
    round.status === "completed"
      ? `/rounds/${round.id}/summary`
      : `/rounds/${round.id}`;
  return (
    <Link to={href} className="block">
      <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-cream-50">
        <div className="min-w-0">
          <p className="truncate font-medium text-charcoal">
            {c.data?.course.name ?? "Loading..."}
          </p>
          <p className="truncate text-xs text-charcoal-muted">
            {formatDate(round.played_on)} ·{" "}
            {round.formats.map((f) => FORMAT_SHORT[f]).join(" · ")}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            round.status === "completed"
              ? "bg-brass-50 text-brass-500"
              : "bg-forest-50 text-forest",
          ].join(" ")}
        >
          {round.status === "completed" ? "Final" : "Live"}
        </span>
      </Card>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
