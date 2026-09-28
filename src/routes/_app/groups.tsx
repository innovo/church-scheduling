import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { createGroup, deleteGroup, joinGroup, listGroups, updateGroup } from "@/lib/church/api";
import { imageSrc, AGE_GROUPS, type Group } from "@/lib/church/types";
import { useMe } from "@/lib/church/me-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/groups")({ component: GroupsPage });

function GroupsPage() {
  const me = useMe();
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function reload() {
    listGroups().then(setGroups);
  }
  useEffect(reload, []);

  async function onDelete(id: number) {
    if (!window.confirm("Delete this group? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteGroup({ data: id });
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Formation"
        title="Groups & midweek"
        description="Homes, youth, and the tables where most of the church actually happens."
        actions={me.isStaff ? <Button onClick={() => setOpen(true)}>New group</Button> : null}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <article key={g.id} className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
            <img src={imageSrc(g.imageKey)} alt="" className="h-36 w-full object-cover" />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="warm">{g.meets}</Badge>
                {g.mine ? <Badge tone="primary">Joined</Badge> : null}
              </div>
              <h2 className="mt-3 font-display text-2xl font-medium">{g.name}</h2>
              <p className="mt-1 text-sm text-muted">{g.description}</p>
              <p className="mt-3 text-sm text-muted">
                {g.location}
                {g.leaderName ? ` · led by ${g.leaderName}` : ""} · {g.memberCount} people
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!g.mine ? (
                  <Button
                    onClick={async () => {
                      await joinGroup({ data: g.id });
                      reload();
                    }}
                  >
                    Join this group
                  </Button>
                ) : null}
                {me.isStaff ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(g)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      title="Delete group"
                      disabled={deletingId === g.id}
                      onClick={() => onDelete(g.id)}
                      className="grid size-9 shrink-0 place-items-center rounded-md text-muted transition hover:bg-destructive hover:text-white"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <GroupDialog
        open={open || editing !== null}
        group={editing}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setEditing(null);
          }
        }}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

function GroupDialog({
  open,
  group,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  group: Group | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const ageGroup = String(fd.get("ageGroup") || "");
      const data = {
        name: String(fd.get("name")),
        description: String(fd.get("description") || ""),
        meets: String(fd.get("meets")),
        location: String(fd.get("location") || ""),
        ageGroup: ageGroup || null,
      };
      if (group) {
        await updateGroup({ data: { groupId: group.id, ...data } });
      } else {
        await createGroup({ data });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? "Edit group" : "New group"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit} key={group?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={group?.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meets">Meets</Label>
            <Input id="meets" name="meets" placeholder="e.g. Wednesdays, 6:30pm" defaultValue={group?.meets} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={group?.location} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ageGroup">Age group (optional)</Label>
            <select
              id="ageGroup"
              name="ageGroup"
              defaultValue={group?.ageGroup ?? ""}
              className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              <option value="">Any age</option>
              {AGE_GROUPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={group?.description} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : group ? "Save group" : "Add group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
