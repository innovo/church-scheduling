import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  assignRosterSlot,
  joinTeam,
  listAvailability,
  listEvents,
  listTeamRoster,
  listTeams,
  removeRosterSlot,
  setAvailability,
} from "@/lib/church/api";
import type { ChurchEvent, Team } from "@/lib/church/types";
import { useMe } from "@/lib/church/me-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/teams")({ component: TeamsPage });

function upcomingSundays(n = 8) {
  const days: string[] = [];
  const d = new Date();
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 7);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
}

type Panel = { teamId: number; mode: "availability" | "roster" } | null;

function TeamsPage() {
  const me = useMe();
  const [teams, setTeams] = useState<Team[]>([]);
  const [panel, setPanel] = useState<Panel>(null);

  function reload() {
    listTeams().then(setTeams);
  }
  useEffect(reload, []);

  function toggle(teamId: number, mode: "availability" | "roster") {
    setPanel((cur) => (cur?.teamId === teamId && cur.mode === mode ? null : { teamId, mode }));
  }

  return (
    <div>
      <PageHeader
        kicker="Serve"
        title="Teams"
        description="Say when you can serve. Leads see the calendar; the Sunday roster is built from it."
      />
      <div className="space-y-4">
        {teams.map((t) => {
          const myMembership = t.members.find((m) => m.peopleId === me.id);
          const canBuildRoster = me.isStaff || myMembership?.seat === "lead";
          return (
            <article key={t.id} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-medium">{t.name}</h2>
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.members.map((m) => (
                      <Badge key={m.peopleId} tone={m.seat === "lead" ? "primary" : "muted"}>
                        {m.name}
                        {m.seat === "lead" ? " · lead" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.mine ? (
                    <Button variant="outline" onClick={() => toggle(t.id, "availability")}>
                      {panel?.teamId === t.id && panel.mode === "availability"
                        ? "Hide calendar"
                        : "My availability"}
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        await joinTeam({ data: t.id });
                        reload();
                      }}
                    >
                      Join team
                    </Button>
                  )}
                  {canBuildRoster ? (
                    <Button variant="outline" onClick={() => toggle(t.id, "roster")}>
                      {panel?.teamId === t.id && panel.mode === "roster" ? "Hide roster" : "Build roster"}
                    </Button>
                  ) : null}
                </div>
              </div>
              {panel?.teamId === t.id && panel.mode === "availability" && t.mine ? (
                <Availability teamId={t.id} />
              ) : null}
              {panel?.teamId === t.id && panel.mode === "roster" && canBuildRoster ? (
                <RosterBuilder teamId={t.id} />
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Availability({ teamId }: { teamId: number }) {
  const days = upcomingSundays();
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    listAvailability({ data: teamId }).then((rows) => {
      const next: Record<string, string> = {};
      for (const r of rows) next[r.day] = r.status;
      setMap(next);
    });
  }, [teamId]);

  async function cycle(day: string) {
    const cur = map[day];
    const next = cur === "available" ? "unavailable" : cur === "unavailable" ? "maybe" : "available";
    setMap({ ...map, [day]: next });
    await setAvailability({ data: { teamId, day, status: next as "available" | "unavailable" | "maybe" } });
  }

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {days.map((day) => {
        const status = map[day] || "unset";
        const label = new Date(day + "T12:00:00").toLocaleDateString("en-ZA", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return (
          <button
            key={day}
            type="button"
            onClick={() => cycle(day)}
            className="rounded-lg border border-border px-3 py-3 text-left text-sm hover:bg-secondary"
          >
            <p className="font-medium">{label}</p>
            <p className="mt-1 capitalize text-muted">{status === "unset" ? "tap to set" : status}</p>
          </button>
        );
      })}
    </div>
  );
}

type RosterRow = {
  peopleId: number;
  name: string;
  isLead: boolean;
  availability: "available" | "unavailable" | "maybe" | "unset";
  assignedSeat: string | null;
};

const AVAILABILITY_TONE: Record<RosterRow["availability"], "primary" | "muted" | "warm"> = {
  available: "primary",
  maybe: "warm",
  unavailable: "muted",
  unset: "muted",
};

function RosterBuilder({ teamId }: { teamId: number }) {
  const [sundayEvents, setSundayEvents] = useState<ChurchEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [seatDrafts, setSeatDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listEvents().then((events) => {
      const sundays = events.filter((e) => e.kind === "sunday");
      setSundayEvents(sundays);
      if (sundays[0]) setEventId(sundays[0].id);
    });
  }, []);

  function reload() {
    if (!eventId) return;
    setLoading(true);
    listTeamRoster({ data: { teamId, eventId } })
      .then((r) => {
        setRows(r);
        const drafts: Record<number, string> = {};
        for (const row of r) drafts[row.peopleId] = row.assignedSeat ?? "";
        setSeatDrafts(drafts);
      })
      .finally(() => setLoading(false));
  }
  useEffect(reload, [teamId, eventId]);

  async function assign(peopleId: number) {
    if (!eventId) return;
    const seatLabel = (seatDrafts[peopleId] || "").trim();
    if (!seatLabel) return;
    await assignRosterSlot({ data: { eventId, teamId, peopleId, seatLabel } });
    reload();
  }

  async function remove(peopleId: number) {
    if (!eventId) return;
    await removeRosterSlot({ data: { eventId, teamId, peopleId } });
    reload();
  }

  return (
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-medium">
        Sunday
        <select
          className="mt-1 block w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={eventId ?? ""}
          onChange={(e) => setEventId(Number(e.target.value))}
        >
          {sundayEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {new Date(e.startsAt).toLocaleDateString("en-ZA", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {" — "}
              {e.title}
            </option>
          ))}
        </select>
      </label>

      {sundayEvents.length === 0 ? (
        <p className="text-sm text-muted">No upcoming Sunday services to build a roster for yet.</p>
      ) : loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.peopleId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-[8rem] font-medium">
                {r.name}
                {r.isLead ? " · lead" : ""}
              </span>
              <Badge tone={AVAILABILITY_TONE[r.availability]}>{r.availability}</Badge>
              <input
                type="text"
                placeholder="Seat, e.g. Sound"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                value={seatDrafts[r.peopleId] ?? ""}
                onChange={(e) =>
                  setSeatDrafts({ ...seatDrafts, [r.peopleId]: e.target.value })
                }
              />
              <Button variant="outline" onClick={() => assign(r.peopleId)}>
                {r.assignedSeat ? "Update" : "Assign"}
              </Button>
              {r.assignedSeat ? (
                <Button variant="ghost" onClick={() => remove(r.peopleId)}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
