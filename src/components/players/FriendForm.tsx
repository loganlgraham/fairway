import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ProfileRow } from "@/types/database";

export interface FriendFormValues {
  display_name: string;
  ghin_number: string | null;
  handicap_index: number | null;
  low_hi: number | null;
  home_club: string | null;
}

interface FriendFormProps {
  initial?: Partial<ProfileRow>;
  onSubmit: (values: FriendFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  saving?: boolean;
}

export function FriendForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
}: FriendFormProps) {
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [ghin, setGhin] = useState(initial?.ghin_number ?? "");
  const [hi, setHi] = useState(
    initial?.handicap_index != null ? String(initial.handicap_index) : "",
  );
  const [low, setLow] = useState(
    initial?.low_hi != null ? String(initial.low_hi) : "",
  );
  const [homeClub, setHomeClub] = useState(initial?.home_club ?? "");

  const canSubmit = displayName.trim().length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      display_name: displayName.trim(),
      ghin_number: ghin.trim() || null,
      handicap_index: hi.trim() === "" ? null : Number(hi),
      low_hi: low.trim() === "" ? null : Number(low),
      home_club: homeClub.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Handicap index"
          inputMode="decimal"
          value={hi}
          onChange={(e) => setHi(e.target.value)}
          placeholder="e.g. 12.4"
        />
        <Input
          label="Low HI"
          inputMode="decimal"
          value={low}
          onChange={(e) => setLow(e.target.value)}
        />
      </div>
      <Input
        label="GHIN number"
        value={ghin}
        onChange={(e) => setGhin(e.target.value)}
      />
      <Input
        label="Home club"
        value={homeClub}
        onChange={(e) => setHomeClub(e.target.value)}
      />

      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={saving} type="button">
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={saving} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
