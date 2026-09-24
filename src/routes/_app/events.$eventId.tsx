import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, MapPin } from "lucide-react";
import { cancelRsvp, getEvent, rsvpEvent } from "@/lib/church/api";
import { imageSrc, type ChurchEvent } from "@/lib/church/types";
import { formatMoney, formatWhen } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/events/$eventId")({ component: EventDetail });

function EventDetail() {
  const { eventId } = Route.useParams();
  const id = Number(eventId);
  const [event, setEvent] = useState<ChurchEvent | null>(null);
  const [roster, setRoster] = useState<{ seat: string; name: string; team: string }[]>([]);
  const [tickets, setTickets] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    getEvent({ data: id }).then((d) => {
      setEvent(d.event);
      setRoster(d.roster);
    });
  }
  useEffect(reload, [id]);

  if (!event) {
    return <div className="h-80 animate-pulse rounded-xl bg-bg-warm" />;
  }

  const paid = event.ticketCents > 0;
  const ics = buildIcs(event);
  const gcal = googleCal(event);

  async function onRsvp() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await rsvpEvent({ data: { eventId: id, tickets } });
      setMessage(
        paid
          ? `Tickets reserved. ${formatMoney(res.paidCents)} recorded (demo payment — connect PayFast or Stripe to take live cards).`
          : "You’re on the list. We’ll see you there.",
      );
      reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    setBusy(true);
    await cancelRsvp({ data: id });
    setMessage("Registration cancelled.");
    setBusy(false);
    reload();
  }

  return (
    <article>
      <Link to="/events" className="text-sm text-muted hover:text-fg">
        ← Events
      </Link>
      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)]">
        <img src={imageSrc(event.imageKey)} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            <Badge>{event.visibility === "public" ? "Open" : "Members"}</Badge>
            <Badge tone="warm">{event.kind}</Badge>
          </div>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">{event.title}</h1>
          <p className="mt-2 text-muted">{formatWhen(event.startsAt)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <MapPin className="size-4" /> {event.location}
          </p>
          <p className="mt-5 max-w-2xl leading-relaxed">{event.description}</p>
          <p className="mt-3 text-sm text-muted">
            {event.going} going
            {event.capacity ? ` · ${event.capacity} capacity` : ""}
            {paid ? ` · ${formatMoney(event.ticketCents)} per ticket` : " · Free"}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            {paid && !event.mine ? (
              <div className="space-y-1.5">
                <Label htmlFor="tickets">Tickets</Label>
                <Input
                  id="tickets"
                  type="number"
                  min={1}
                  max={8}
                  value={tickets}
                  onChange={(e) => setTickets(Number(e.target.value))}
                  className="w-24"
                />
              </div>
            ) : null}
            {event.mine ? (
              <Button variant="outline" disabled={busy} onClick={onCancel}>
                Cancel my place
              </Button>
            ) : (
              <Button disabled={busy} onClick={onRsvp}>
                {paid ? `Purchase · ${formatMoney(event.ticketCents * tickets)}` : "Register"}
              </Button>
            )}
            <Button asChild variant="ghost">
              <a href={gcal} target="_blank" rel="noreferrer">
                <CalendarPlus className="size-4" /> Google Calendar
              </a>
            </Button>
            <Button asChild variant="ghost">
              <a href={ics} download={`${event.title}.ics`}>
                Download .ics
              </a>
            </Button>
          </div>
          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
        </div>
      </div>

      {roster.length ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-medium">Serving roster</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-card)]">
            {roster.map((r) => (
              <li key={r.seat + r.name} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted"> · {r.team}</span>
                </span>
                <span className="text-muted">{r.seat}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function googleCal(ev: ChurchEvent) {
  const start = compact(ev.startsAt);
  const end = compact(ev.endsAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${end}`,
    location: ev.location,
    details: ev.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function compact(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcs(ev: ChurchEvent) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${compact(ev.startsAt)}`,
    `DTEND:${compact(ev.endsAt)}`,
    `SUMMARY:${ev.title}`,
    `LOCATION:${ev.location}`,
    `DESCRIPTION:${ev.description.replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
}
