import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { listEvents, listAllEvents, createEvent, updateEvent, deleteEvent } from "@/lib/church/api";
import { uploadImage } from "@/lib/church/upload";
import { useMe } from "@/lib/church/me-context";
import { eventImageSrc, type ChurchEvent } from "@/lib/church/types";
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

const EVENT_KINDS = [
  { id: "sunday", label: "Sunday" },
  { id: "midweek", label: "Midweek" },
  { id: "kids", label: "Kids" },
  { id: "special", label: "Special" },
];

function EventsPage() {
  const me = useMe();
  const [events, setEvents] = useState<ChurchEvent[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  function reload() {
    setEvents(null);
    listEvents({ data: undefined }).then(({ events: rows, hasMore: more }) => {
      setEvents(rows);
      setHasMore(more);
    });
  }
  useEffect(reload, []);

  async function loadMore() {
    if (!events) return;
    setLoadingMore(true);
    try {
      const { events: more, hasMore: nextHasMore } = await listEvents({ data: { offset: events.length } });
      setEvents([...events, ...more]);
      setHasMore(nextHasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Are you sure you would like to delete this event? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteEvent({ data: id });
      setEvents((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Gather"
        title="Events"
        description="Sundays, life together, and the nights we open the doors."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAllOpen(true)}>
              View all events
            </Button>
            {me.isStaff ? <Button onClick={() => setOpen(true)}>New event</Button> : null}
          </div>
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
            <div key={ev.id} className="relative overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
              {me.isStaff ? (
                <div className="absolute top-2 right-2 z-10 flex gap-1.5">
                  <button
                    type="button"
                    title="Edit event"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(ev);
                    }}
                    className="grid size-8 place-items-center rounded-full bg-black/50 text-white transition hover:bg-primary"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete event"
                    disabled={deletingId === ev.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(ev.id);
                    }}
                    className="grid size-8 place-items-center rounded-full bg-black/50 text-white transition hover:bg-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : null}
              <Link to="/events/$eventId" params={{ eventId: String(ev.id) }} className="block">
                <img src={eventImageSrc(ev)} alt="" className="h-40 w-full object-cover" />
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
            </div>
          ))}
        </div>
      )}

      {events && events.length > 0 && hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more events"}
          </Button>
        </div>
      ) : null}

      <EventDialog
        open={open || editing !== null}
        event={editing}
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

      <AllEventsDialog
        open={allOpen}
        onOpenChange={setAllOpen}
        isStaff={me.isStaff}
        onEdit={(ev) => {
          setAllOpen(false);
          setEditing(ev);
        }}
        onDeleted={reload}
      />
    </div>
  );
}

function AllEventsDialog({
  open,
  onOpenChange,
  isStaff,
  onEdit,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isStaff: boolean;
  onEdit: (ev: ChurchEvent) => void;
  onDeleted: () => void;
}) {
  const [events, setEvents] = useState<ChurchEvent[] | null>(null);
  const [sort, setSort] = useState<"soonest" | "latest">("soonest");
  const [type, setType] = useState<string>("all");
  const [when, setWhen] = useState<"all" | "upcoming" | "past">("upcoming");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function reload() {
    listAllEvents().then(setEvents);
  }
  useEffect(() => {
    if (open) reload();
  }, [open]);

  const filtered = useMemo(() => {
    if (!events) return [];
    const now = Date.now();
    let rows = events.filter((e) => (type === "all" ? true : e.kind === type));
    if (when === "upcoming") rows = rows.filter((e) => new Date(e.startsAt).getTime() >= now);
    if (when === "past") rows = rows.filter((e) => new Date(e.startsAt).getTime() < now);
    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      return sort === "soonest" ? diff : -diff;
    });
    return rows;
  }, [events, sort, type, when]);

  async function onDelete(id: number) {
    if (!window.confirm("Are you sure you would like to delete this event? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteEvent({ data: id });
      setEvents((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
      onDeleted();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>All events</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <select
            value={when}
            onChange={(e) => setWhen(e.target.value as typeof when)}
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All dates</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm capitalize"
          >
            <option value="all">All types</option>
            {EVENT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="soonest">Date: soonest first</option>
            <option value="latest">Date: latest first</option>
          </select>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {!events ? (
            <div className="h-40 animate-pulse rounded-xl bg-bg-warm" />
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No events match those filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: String(ev.id) }}
                      onClick={() => onOpenChange(false)}
                      className="font-medium hover:underline"
                    >
                      {ev.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatWhen(ev.startsAt)} · {ev.location}
                    </p>
                  </div>
                  <Badge className="capitalize">{ev.kind}</Badge>
                  {isStaff ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onEdit(ev)}>
                        Edit
                      </Button>
                      <button
                        type="button"
                        title="Delete event"
                        disabled={deletingId === ev.id}
                        onClick={() => onDelete(ev.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-destructive hover:text-white"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({
  open,
  event,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  event: ChurchEvent | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImageUrl(event?.imageUrl ?? null);
  }, [event]);

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large, max 8MB");
      return;
    }
    setImageBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { url } = await uploadImage({ data: { dataUrl, kind: "event" } });
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setImageBusy(false);
    }
  }

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (event) {
      if (!window.confirm("Are you sure you would like to implement these changes?")) return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const starts = String(fd.get("starts"));
      const ends = String(fd.get("ends") || starts);
      const data = {
        title: String(fd.get("title")),
        description: String(fd.get("description")),
        location: String(fd.get("location")),
        startsAt: new Date(starts).toISOString(),
        endsAt: new Date(ends).toISOString(),
        visibility: (fd.get("visibility") === "public" ? "public" : "members") as "public" | "members",
        kind: String(fd.get("kind") || "special"),
        ticketCents: Math.round(Number(fd.get("price") || 0) * 100),
        imageKey: "sanctuary",
        imageUrl,
      };
      if (event) {
        await updateEvent({ data: { eventId: event.id, ...data } });
      } else {
        await createEvent({ data });
      }
      onSaved();
      setImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit} key={event?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label>Invitation image (optional, max 8MB)</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={imageBusy}
              className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-surface text-sm text-muted"
            >
              {imageBusy ? (
                "Uploading…"
              ) : imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                "Tap to add an image"
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickImage}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={event?.title} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={event?.description} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={event?.location ?? "31 Kimberley Street, Townsend Estate, Goodwood"}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="starts">Starts</Label>
              <Input
                id="starts"
                name="starts"
                type="datetime-local"
                defaultValue={event ? toLocalInput(event.startsAt) : undefined}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ends">Ends</Label>
              <Input id="ends" name="ends" type="datetime-local" defaultValue={event ? toLocalInput(event.endsAt) : undefined} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visibility">Who can come</Label>
              <select
                id="visibility"
                name="visibility"
                defaultValue={event?.visibility ?? "members"}
                className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm"
              >
                <option value="members">Members</option>
                <option value="public">Open to the city</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Ticket (R, 0 = free)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="1"
                defaultValue={event ? event.ticketCents / 100 : 0}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kind">Type</Label>
            <select
              id="kind"
              name="kind"
              defaultValue={event?.kind ?? "special"}
              className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm capitalize"
            >
              {EVENT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : event ? "Save changes" : "Publish event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
