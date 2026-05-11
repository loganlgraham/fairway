import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  useCreateFriend,
  useFriends,
  useSelfProfile,
} from "@/hooks/useFriends";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FriendForm } from "./FriendForm";
import { GhinImport } from "./GhinImport";
import { useToast } from "@/components/ui/Toast";
import { formatHandicap } from "@/utils/format";
import type { ProfileRow } from "@/types/database";

export interface PickedPlayer {
  profile: ProfileRow;
  course_handicap: number; // editable override
}

interface PlayerPickerProps {
  picked: PickedPlayer[];
  onChange: (next: PickedPlayer[]) => void;
  max?: number;
}

function defaultCourseHandicap(hi: number | null | undefined): number {
  if (hi == null || Number.isNaN(hi)) return 0;
  return Math.round(hi);
}

export function PlayerPicker({
  picked,
  onChange,
  max = 12,
}: PlayerPickerProps) {
  const self = useSelfProfile();
  const friends = useFriends();
  const createFriend = useCreateFriend();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const { show } = useToast();

  const available = useMemo(() => {
    const pool: ProfileRow[] = [];
    if (self.data) pool.push(self.data);
    pool.push(...(friends.data ?? []));
    const pickedIds = new Set(picked.map((p) => p.profile.id));
    return pool.filter((p) => !pickedIds.has(p.id));
  }, [self.data, friends.data, picked]);

  const add = (profile: ProfileRow) => {
    if (picked.length >= max) {
      show(`A round can have at most ${max} players.`, "error");
      return;
    }
    onChange([
      ...picked,
      {
        profile,
        course_handicap: defaultCourseHandicap(profile.handicap_index),
      },
    ]);
  };

  const remove = (id: string) =>
    onChange(picked.filter((p) => p.profile.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = picked.findIndex((p) => p.profile.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= picked.length) return;
    const list = picked.slice();
    [list[idx], list[next]] = [list[next], list[idx]];
    onChange(list);
  };

  const updateCh = (id: string, value: string) => {
    const n = value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(n)) return;
    onChange(
      picked.map((p) =>
        p.profile.id === id ? { ...p, course_handicap: Math.round(n) } : p,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-end justify-between">
          <h3 className="font-display text-base font-semibold text-forest">
            Lineup ({picked.length}/{max})
          </h3>
        </div>
        {picked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-cream-50 px-3 py-4 text-center text-sm text-charcoal-muted">
            Add yourself and up to {max - 1} more.
          </p>
        ) : (
          <ol className="space-y-2">
            {picked.map((p, idx) => (
              <li
                key={p.profile.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2"
              >
                <span className="w-6 text-center text-xs font-semibold text-charcoal-muted">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {p.profile.display_name}
                  </p>
                  <p className="truncate text-xs text-charcoal-muted">
                    HI {formatHandicap(p.profile.handicap_index)}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs text-charcoal-muted">
                  CH
                  <input
                    type="number"
                    className="input h-8 w-14 px-1.5 py-1 text-center text-sm"
                    value={p.course_handicap}
                    onChange={(e) => updateCh(p.profile.id, e.target.value)}
                  />
                </label>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(p.profile.id, -1)}
                    className="rounded p-0.5 text-charcoal-muted hover:bg-cream-200"
                    aria-label="Move up"
                    disabled={idx === 0}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(p.profile.id, 1)}
                    className="rounded p-0.5 text-charcoal-muted hover:bg-cream-200"
                    aria-label="Move down"
                    disabled={idx === picked.length - 1}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.profile.id)}
                  className="rounded-md p-1 text-charcoal-muted hover:bg-cream-200"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {picked.length < max ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
            Add players
          </h4>
          <div className="space-y-2">
            {available.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-cream-50 px-3 py-3 text-sm text-charcoal-muted">
                No more profiles to add. Create a friend below.
              </p>
            ) : (
              available.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => add(p)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left hover:bg-cream-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {p.display_name}
                      {p.user_id ? (
                        <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-brass">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-charcoal-muted">
                      HI {formatHandicap(p.handicap_index)}
                      {p.home_club ? ` · ${p.home_club}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
                    <Plus size={14} /> Add
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => setAddFriendOpen(true)}
              leadingIcon={<Plus size={14} />}
            >
              New friend profile
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        title="New friend"
        footer={null}
      >
        <FriendForm
          submitLabel="Add &amp; pick"
          saving={createFriend.isPending}
          onCancel={() => setAddFriendOpen(false)}
          onSubmit={async (v) => {
            try {
              const created = await createFriend.mutateAsync(v);
              add(created);
              setAddFriendOpen(false);
            } catch (err) {
              show(
                err instanceof Error ? err.message : "Failed",
                "error",
              );
            }
          }}
        />
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-charcoal-muted">
            Import from a GHIN screenshot instead:
          </p>
          <GhinImport
            buttonLabel="Import from screenshot"
            onAccept={async (v) => {
              const created = await createFriend.mutateAsync(v);
              add(created);
              setAddFriendOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
