import { useState } from "react";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import {
  useCreateFriend,
  useDeleteFriend,
  useFriends,
  useSelfProfile,
  useUpdateFriend,
  useUpsertSelfProfile,
} from "@/hooks/useFriends";
import { useAuth } from "@/auth/useAuth";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FriendForm } from "@/components/players/FriendForm";
import { GhinImport } from "@/components/players/GhinImport";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { formatHandicap } from "@/utils/format";
import type { ProfileRow } from "@/types/database";

export default function ProfilePage() {
  const { user } = useAuth();
  const self = useSelfProfile();
  const friends = useFriends();
  const upsertSelf = useUpsertSelfProfile();
  const createFriend = useCreateFriend();
  const updateFriend = useUpdateFriend();
  const deleteFriend = useDeleteFriend();
  const { show } = useToast();

  const [editSelf, setEditSelf] = useState(false);
  const [addFriend, setAddFriend] = useState(false);
  const [editingFriend, setEditingFriend] = useState<ProfileRow | null>(null);

  if (self.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">
          Members
        </p>
        <h1 className="font-display text-2xl font-semibold text-forest">
          Profile &amp; friends
        </h1>
      </header>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardEyebrow>You</CardEyebrow>
            <CardTitle>{self.data?.display_name ?? "Player"}</CardTitle>
            <p className="text-sm text-charcoal-muted">{user?.email}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setEditSelf(true)}
            leadingIcon={<Pencil size={14} />}
          >
            Edit
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="HCP index" value={formatHandicap(self.data?.handicap_index)} />
          <Stat label="Low HI" value={formatHandicap(self.data?.low_hi)} />
          <Stat label="GHIN #" value={self.data?.ghin_number ?? "—"} />
          <Stat label="Home club" value={self.data?.home_club ?? "—"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <GhinImport
            buttonLabel="Update from screenshot"
            fallbackName={self.data?.display_name}
            onAccept={async (v) => {
              if (!v.display_name.trim()) return;
              await upsertSelf.mutateAsync(v);
              show("Profile updated", "success");
            }}
          />
        </div>
      </Card>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">
              Foursomes
            </p>
            <h2 className="font-display text-xl font-semibold text-forest">
              Friends
            </h2>
          </div>
          <Button
            onClick={() => setAddFriend(true)}
            leadingIcon={<Plus size={14} />}
          >
            Add friend
          </Button>
        </div>

        {friends.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (friends.data ?? []).length === 0 ? (
          <EmptyState
            icon={<UsersRound size={28} />}
            title="No friends yet"
            description="Add the regulars you play with so you can quickly drop them into a round."
            action={
              <Button onClick={() => setAddFriend(true)}>Add your first friend</Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {(friends.data ?? []).map((f) => (
              <Card key={f.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal">
                    {f.display_name}
                  </p>
                  <p className="truncate text-xs text-charcoal-muted">
                    HCP {formatHandicap(f.handicap_index)}
                    {f.home_club ? ` · ${f.home_club}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingFriend(f)}
                    leadingIcon={<Pencil size={14} />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Remove ${f.display_name} from your friends?`,
                        )
                      ) {
                        return;
                      }
                      try {
                        await deleteFriend.mutateAsync(f.id);
                        show("Friend removed", "success");
                      } catch (err) {
                        show(
                          err instanceof Error ? err.message : "Failed",
                          "error",
                        );
                      }
                    }}
                    leadingIcon={<Trash2 size={14} />}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={editSelf}
        onClose={() => setEditSelf(false)}
        title="Edit your profile"
      >
        {self.data ? (
          <FriendForm
            initial={self.data}
            saving={upsertSelf.isPending}
            submitLabel="Save"
            onCancel={() => setEditSelf(false)}
            onSubmit={async (v) => {
              try {
                await upsertSelf.mutateAsync(v);
                setEditSelf(false);
                show("Profile updated", "success");
              } catch (err) {
                show(
                  err instanceof Error ? err.message : "Failed to save",
                  "error",
                );
              }
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={addFriend}
        onClose={() => setAddFriend(false)}
        title="Add friend"
        footer={null}
      >
        <FriendForm
          submitLabel="Add"
          saving={createFriend.isPending}
          onCancel={() => setAddFriend(false)}
          onSubmit={async (v) => {
            try {
              await createFriend.mutateAsync(v);
              setAddFriend(false);
              show("Friend added", "success");
            } catch (err) {
              show(
                err instanceof Error ? err.message : "Failed to add friend",
                "error",
              );
            }
          }}
        />
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-charcoal-muted">
            Have a GHIN profile screenshot? Import to fill the form
            automatically.
          </p>
          <GhinImport
            buttonLabel="Import from screenshot"
            onAccept={async (v) => {
              await createFriend.mutateAsync(v);
              setAddFriend(false);
              show("Friend added", "success");
            }}
          />
        </div>
      </Modal>

      <Modal
        open={!!editingFriend}
        onClose={() => setEditingFriend(null)}
        title="Edit friend"
        footer={null}
      >
        {editingFriend ? (
          <FriendForm
            initial={editingFriend}
            saving={updateFriend.isPending}
            submitLabel="Save"
            onCancel={() => setEditingFriend(null)}
            onSubmit={async (v) => {
              try {
                await updateFriend.mutateAsync({ id: editingFriend.id, ...v });
                setEditingFriend(null);
                show("Friend updated", "success");
              } catch (err) {
                show(
                  err instanceof Error ? err.message : "Failed",
                  "error",
                );
              }
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-cream-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-muted">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg text-forest">{value}</p>
    </div>
  );
}
