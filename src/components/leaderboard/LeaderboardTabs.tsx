import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { FORMAT_SHORT, type Format } from "@/types/golf";
import { StrokeBoard } from "./StrokeBoard";
import { StablefordBoard } from "./StablefordBoard";
import { SkinsBoard } from "./SkinsBoard";
import { MatchPlayBoard } from "./MatchPlayBoard";
import type { ScoringInput } from "@/scoring/types";

interface LeaderboardTabsProps {
  formats: Format[];
  input: ScoringInput;
  compact?: boolean;
}

function renderBoard(format: Format, input: ScoringInput, compact: boolean) {
  switch (format) {
    case "stroke":
      return <StrokeBoard input={input} compact={compact} />;
    case "stableford":
      return <StablefordBoard input={input} />;
    case "skins":
      return <SkinsBoard input={input} />;
    case "match":
      return <MatchPlayBoard input={input} />;
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

export function LeaderboardTabs({
  formats,
  input,
  compact = false,
}: LeaderboardTabsProps) {
  const [active, setActive] = useState<Format>(formats[0] ?? "stroke");

  if (formats.length === 0) return null;

  if (formats.length === 1) {
    return <div className="overflow-x-auto">{renderBoard(formats[0], input, compact)}</div>;
  }

  return (
    <div className="space-y-3">
      <Tabs
        value={active}
        onChange={(v) => setActive(v as Format)}
        options={formats.map((f) => ({ value: f, label: FORMAT_SHORT[f] }))}
      />
      <div className="overflow-x-auto">{renderBoard(active, input, compact)}</div>
    </div>
  );
}
