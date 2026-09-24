import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listEvents, createEvent } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { imageSrc, type ChurchEvent } from "@/lib/church/types";
import { formatMoney, formatWhen } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_app/events")({ component: EventsPage });

function EventsPage() {
  const me = useMe();
  const [events, setEvents] = useState<ChurchEvent[] | null>(null);
  const [open, setOpen] = useState(false);

  function reload() {
    listEvents().then(setEvents);
  }
  useEffect(reload, []);

  return (
    <div>
      <PageHeader
        kicker="Gather"
        title="Events"
        description="Sundays, life together, and the nights we open the doors."
        actions={
          me.isStaff ? (
            <Button onClick={() => setOpen(true)}>New event</Button>
          ) : null
        }
      />

      {!events ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-bg-warm" />
          <div className="h-64 animate-pulse rounded-xl bg-bg-warm" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="Nothing on the calendar" description="Staff can add the next gathering from this page." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to="/events/$eventId"
              params={{ eventId: String(ev.id) }}
              className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]"
            >
              <img src={imageSrc(ev.imageKey)} alt="" className="h-40 w-full object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge>{ev.visibility === "public" ? "Open" : "Members"}</Badge>
                  {ev.ticketCents > 0 ? <Badge tone="primary">{formatMoney(ev.ticketCents)}</Badge> : <Badge tone="warm">Free</Badge>}
                  {ev.mine ? <Badge tone="primary">Going</Badge> : null}
                </div>
                <h2 className="mt-3 font-display text-xl font-medium">{ev.title}</h2>
                <p className="mt-1 text-sm text-muted">{formatWhen(ev.startsAt)}</p>
                <p className="text-sm text-muted">{ev.location}</p>
                <p className="mt-2 text-xs text-faint">{ev.going} going</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateEventDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const starts = String(fd.get("starts"));
      const ends = String(fd.get("ends") || starts);
      await createEvent({
        data: {
          title: String(fd.get("title")),
          description: String(fd.get("description")),
          location: String(fd.get("location")),
          startsAt: new Date(starts).toISOString(),
          endsAt: new Date(ends).toISOString(),
          visibility: fd.get("visibility") === "public" ? "public" : "members",
          kind: String(fd.get("kind") || "special"),
          ticketCents: Math.round(Number(fd.get("price") || 0) * 100),
          imageKey: "sanctuary",
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue="31 Kimberley Street, Townsend Estate, Goodwood" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="starts">Starts</Label>
              <Input id="starts" name="starts" type="datetime-local" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ends">Ends</Label>
              <Input id="ends" name="ends" type="datetime-local" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visibility">Who can come</Label>
              <select
                id="visibility"
                name="visibility"
                className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm"
              >
                <option value="members">Members</option>
                <option value="public">Open to the city</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Ticket (R, 0 = free)</Label>
              <Input id="price" name="price" type="number" min={0} step="1" defaultValue={0} />
            </div>
          </div>
          <input type="hidden" name="kind" value="special" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Publish event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
