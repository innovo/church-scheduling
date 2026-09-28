import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { seedIfNeeded } from "./seed";
import { mapPerson, token, pickupCode, splitName, ageGroupFromBirthday } from "./map";
import {
  isOpsRole,
  isStaffRole,
  personName,
  CHURCH_NAME,
  CHURCH_TAGLINE,
  CHURCH_ADDRESS,
  CHURCH_EMAIL,
  CHURCH_PHONE,
  type Me,
  type ChurchEvent,
  type Sermon,
  type Team,
  type Group,
  type Resource,
  type Contribution,
  type Checkin,
  type ChildRecord,
  type Branding,
} from "./types";

type PersonRow = Parameters<typeof mapPerson>[0];

async function loadMe(
  userId: string,
  hint?: { name?: string | null; email?: string | null },
): Promise<Me> {
  const sql = await getSql();
  await seedIfNeeded(sql);

  const existing = await sql<PersonRow>`select * from people where user_id = ${userId} limit 1`;
  if (existing[0]) {
    const p = mapPerson(existing[0]);
    return {
      ...p,
      isStaff: isStaffRole(p.role),
      isOps: isOpsRole(p.role),
      displayName: personName(p),
    };
  }

  const signedIn = await sql<{ n: number }>`select count(*)::int as n from people where user_id is not null`;
  const isFirstEver = (signedIn[0]?.n ?? 0) === 0;
  const role = isFirstEver ? "pastor" : "member";
  // The very first account ever created (Zion/Amy standing the church up)
  // is auto-approved and made admin. Everyone after that starts pending
  // until a pastor/admin approves them (see the People/Approvals screen).
  const status = isFirstEver ? "approved" : "pending";
  const isAdmin = isFirstEver;
  const isTenantAdmin = isFirstEver;
  const { first, last } = splitName(hint?.name ?? null, hint?.email ?? null);
  const hh = await sql<{ id: number }>`insert into households (name) values (${last || first}) returning id`;
  const qr = token();
  const hue = Math.floor(Math.random() * 360);
  const rows = await sql<PersonRow>`
    insert into people (
      user_id, household_id, first_name, last_name, email, role, age_group, qr_token, avatar_hue, status, is_admin, is_tenant_admin
    ) values (
      ${userId}, ${hh[0]!.id}, ${first}, ${last}, ${hint?.email ?? null}, ${role}, ${"adults"}, ${qr}, ${hue}, ${status}, ${isAdmin}, ${isTenantAdmin}
    ) returning *`;
  const p = mapPerson(rows[0]!);

  return {
    ...p,
    isStaff: isStaffRole(p.role),
    isOps: isOpsRole(p.role),
    displayName: personName(p),
  };
}

function mapEvent(
  row: {
    id: number;
    title: string;
    description: string;
    location: string;
    starts_at: string;
    ends_at: string;
    visibility: string;
    kind: string;
    capacity: number | null;
    ticket_cents: number;
    image_key: string;
    image_url?: string | null;
    going: number;
    mine: boolean | number | null;
  },
): ChurchEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    visibility: row.visibility === "public" ? "public" : "members",
    kind: row.kind,
    capacity: row.capacity,
    ticketCents: row.ticket_cents,
    imageKey: row.image_key,
    imageUrl: row.image_url ?? null,
    going: Number(row.going) || 0,
    mine: Boolean(row.mine),
  };
}

function mapSermon(row: {
  id: number;
  title: string;
  speaker: string;
  series: string;
  scripture: string;
  preached_at: string;
  duration_seconds: number;
  description: string;
  image_key: string;
  image_url: string | null;
  transcript: string;
  audio_url: string | null;
}): Sermon {
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    series: row.series,
    scripture: row.scripture,
    preachedAt: row.preached_at,
    durationSeconds: row.duration_seconds,
    description: row.description,
    imageKey: row.image_key,
    imageUrl: row.image_url ?? null,
    transcript: row.transcript,
    audioUrl: row.audio_url ?? null,
  };
}

function roomForAge(ageGroup: string) {
  if (ageGroup === "little_ones") return "Little Lights";
  if (ageGroup === "youth") return "Youth";
  return "Kids Church";
}

export const getPublicSite = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await seedIfNeeded(sql);
  const events = await sql<Parameters<typeof mapEvent>[0]>`
    select e.*,
      (select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'going') as going,
      false as mine
    from events e
    where e.visibility = 'public' and e.starts_at > now() - interval '2 hours'
    order by e.starts_at asc
    limit 6
  `;
  const sermons = await sql<Parameters<typeof mapSermon>[0]>`
    select * from sermons order by preached_at desc limit 1
  `;
  return {
    events: events.map(mapEvent),
    sermon: sermons[0] ? mapSermon(sermons[0]) : null,
  };
});

export const getHome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name?: string | null; email?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId, data);
    const sql = await getSql();
    const events = await sql<Parameters<typeof mapEvent>[0]>`
      select e.*,
        (select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'going') as going,
        exists(select 1 from event_registrations r where r.event_id = e.id and r.user_id = ${context.userId} and r.status = 'going') as mine
      from events e
      where e.starts_at > now() - interval '2 hours'
      order by e.starts_at asc
      limit 5
    `;
    const sermon = await sql<Parameters<typeof mapSermon>[0]>`
      select * from sermons order by preached_at desc limit 1
    `;
    const myTeams = await sql<{ name: string }>`
      select t.name from teams t
      join team_members tm on tm.team_id = t.id
      where tm.people_id = ${me.id}
    `;
    const giving = await sql<{ total: number }>`
      select coalesce(sum(amount_cents), 0)::int as total
      from contributions where user_id = ${context.userId} and status = 'paid'
    `;
    const kidsToday = await sql<{ n: number }>`
      select count(*)::int as n from checkins
      where service_date = current_date and checked_out_at is null
    `;
    return {
      me,
      events: events.map(mapEvent),
      sermon: sermon[0] ? mapSermon(sermon[0]) : null,
      teams: myTeams.map((t) => t.name),
      givenCents: giving[0]?.total ?? 0,
      kidsOnSite: kidsToday[0]?.n ?? 0,
    };
  });

export const getMe = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name?: string | null; email?: string | null }) => d)
  .handler(async ({ context, data }) => loadMe(context.userId, data));

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      firstName: string;
      lastName: string;
      phone?: string;
      bio?: string;
      ageGroup?: string;
      birthday?: string;
      address?: string;
      avatarUrl?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update people set
        first_name = ${data.firstName.trim() || "Friend"},
        last_name = ${data.lastName.trim()},
        phone = ${data.phone?.trim() || null},
        bio = ${data.bio?.trim() || null},
        age_group = ${data.ageGroup || "adults"},
        birthday = ${data.birthday || null},
        address = ${data.address?.trim() || null},
        avatar_url = coalesce(${data.avatarUrl ?? null}, avatar_url)
      where user_id = ${context.userId}
    `;
    return loadMe(context.userId);
  });

export const listPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<PersonRow>`
      select * from people where role <> 'child' and status = 'approved' order by last_name, first_name
    `;
    return rows.map(mapPerson);
  });

function assertAdmin(me: Me) {
  if (!me.isAdmin && !me.isTenantAdmin) throw new Error("Only admins can do that");
}

function assertTenantAdmin(me: Me) {
  if (!me.isTenantAdmin) throw new Error("Only a tenant admin can do that");
}

async function brandingMetaGet(key: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from church_meta where key = ${key}`;
  return rows[0]?.value ?? null;
}

async function brandingMetaSet(key: string, value: string) {
  const sql = await getSql();
  await sql`
    insert into church_meta (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value
  `;
}

/** Public: anyone can read the current branding, including logged-out pages. */
export const getBranding = createServerFn({ method: "GET" }).handler(async (): Promise<Branding> => {
  const [name, tagline, address, email, phone, logoUrl, primaryColor] = await Promise.all([
    brandingMetaGet("branding_name"),
    brandingMetaGet("branding_tagline"),
    brandingMetaGet("branding_address"),
    brandingMetaGet("branding_email"),
    brandingMetaGet("branding_phone"),
    brandingMetaGet("branding_logo_url"),
    brandingMetaGet("branding_color"),
  ]);
  return {
    name: name ?? CHURCH_NAME,
    tagline: tagline ?? CHURCH_TAGLINE,
    address: address ?? CHURCH_ADDRESS,
    email: email ?? CHURCH_EMAIL,
    phone: phone ?? CHURCH_PHONE,
    logoUrl,
    primaryColor,
  };
});

export const updateBranding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      name: string;
      tagline: string;
      address: string;
      email: string;
      phone: string;
      logoUrl?: string | null;
      primaryColor?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    assertTenantAdmin(me);
    await Promise.all([
      brandingMetaSet("branding_name", data.name.trim()),
      brandingMetaSet("branding_tagline", data.tagline.trim()),
      brandingMetaSet("branding_address", data.address.trim()),
      brandingMetaSet("branding_email", data.email.trim()),
      brandingMetaSet("branding_phone", data.phone.trim()),
      data.logoUrl != null ? brandingMetaSet("branding_logo_url", data.logoUrl) : Promise.resolve(),
      data.primaryColor != null ? brandingMetaSet("branding_color", data.primaryColor) : Promise.resolve(),
    ]);
    return { ok: true as const };
  });

/** Everyone (any status), for the admin People/Approvals screen. */
export const listPeopleForAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    assertAdmin(me);
    const sql = await getSql();
    const rows = await sql<PersonRow>`
      select * from people
      order by (status = 'pending') desc, (user_id is null) asc, last_name, first_name
    `;
    return rows.map(mapPerson);
  });

export const setPersonStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { personId: number; status: "approved" | "declined" | "pending" }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    assertAdmin(me);
    const sql = await getSql();
    await sql`update people set status = ${data.status} where id = ${data.personId}`;
    return { ok: true as const };
  });

export const setPersonRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { personId: number; role: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    assertAdmin(me);
    const sql = await getSql();
    const target = await sql<{ role: string }>`select role from people where id = ${data.personId}`;
    const touchesPastor = target[0]?.role === "pastor" || data.role === "pastor";
    if (touchesPastor) assertTenantAdmin(me);
    // Pastors are admins by default, so they can manage teams, groups, events, and payments.
    if (data.role === "pastor") {
      await sql`update people set role = ${data.role}, is_admin = true where id = ${data.personId}`;
    } else {
      await sql`update people set role = ${data.role} where id = ${data.personId}`;
    }
    return { ok: true as const };
  });

export const setPersonAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { personId: number; isAdmin: boolean }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    assertTenantAdmin(me);
    const sql = await getSql();
    if (data.isAdmin) {
      const target = await sql<{ user_id: string | null }>`select user_id from people where id = ${data.personId}`;
      if (!target[0]?.user_id) throw new Error("This person doesn't have a login yet, so they can't be made an admin");
    }
    await sql`update people set is_admin = ${data.isAdmin} where id = ${data.personId}`;
    return { ok: true as const };
  });

export const setPersonTenantAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { personId: number; isTenantAdmin: boolean }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    assertTenantAdmin(me);
    const sql = await getSql();
    if (data.isTenantAdmin) {
      const target = await sql<{ user_id: string | null }>`select user_id from people where id = ${data.personId}`;
      if (!target[0]?.user_id)
        throw new Error("This person doesn't have a login yet, so they can't be made a tenant admin");
    } else if (data.personId === me.id) {
      throw new Error("You can't remove your own tenant admin access");
    }
    await sql`update people set is_tenant_admin = ${data.isTenantAdmin} where id = ${data.personId}`;
    return { ok: true as const };
  });

export const deletePerson = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((personId: number) => personId)
  .handler(async ({ context, data: personId }) => {
    const me = await loadMe(context.userId);
    assertTenantAdmin(me);
    if (personId === me.id) throw new Error("You can't remove your own account");
    const sql = await getSql();
    // team_members, availability, roster_slots, group_members, and checkins cascade
    // automatically. event_registrations.people_id and groups.leader_people_id are
    // nullable references without a cascade rule, so clear those first or the delete
    // fails with a foreign key violation.
    await sql`update event_registrations set people_id = null where people_id = ${personId}`;
    await sql`update groups set leader_people_id = null where leader_people_id = ${personId}`;
    await sql`delete from people where id = ${personId}`;
    return { ok: true as const };
  });

const EVENTS_PAGE_SIZE = 20;

export const listEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { offset?: number } | undefined) => d)
  .handler(async ({ context, data }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const offset = Math.max(0, data?.offset ?? 0);
    const rows = await sql<Parameters<typeof mapEvent>[0]>`
      select e.*,
        (select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'going') as going,
        exists(select 1 from event_registrations r where r.event_id = e.id and r.user_id = ${context.userId} and r.status = 'going') as mine
      from events e
      where e.starts_at > now() - interval '1 day'
      order by e.starts_at asc
      limit ${EVENTS_PAGE_SIZE + 1} offset ${offset}
    `;
    const hasMore = rows.length > EVENTS_PAGE_SIZE;
    return { events: rows.slice(0, EVENTS_PAGE_SIZE).map(mapEvent), hasMore };
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<Parameters<typeof mapEvent>[0]>`
      select e.*,
        (select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'going') as going,
        exists(select 1 from event_registrations r where r.event_id = e.id and r.user_id = ${context.userId} and r.status = 'going') as mine
      from events e where e.id = ${id} limit 1
    `;
    if (!rows[0]) throw new Error("Event not found");
    const roster = await sql<{
      seat_label: string;
      first_name: string;
      last_name: string;
      team: string;
    }>`
      select rs.seat_label, p.first_name, p.last_name, t.name as team
      from roster_slots rs
      join people p on p.id = rs.people_id
      join teams t on t.id = rs.team_id
      where rs.event_id = ${id}
      order by t.name, rs.seat_label
    `;
    return {
      event: mapEvent(rows[0]),
      roster: roster.map((r) => ({
        seat: r.seat_label,
        name: `${r.first_name} ${r.last_name}`.trim(),
        team: r.team,
      })),
    };
  });

export const rsvpEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { eventId: number; tickets?: number }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const ev = await sql<{ id: number; ticket_cents: number }>`
      select id, ticket_cents from events where id = ${data.eventId} limit 1
    `;
    if (!ev[0]) throw new Error("Event not found");
    const tickets = Math.max(1, Math.min(8, data.tickets ?? 1));
    const paid = ev[0].ticket_cents * tickets;
    await sql`
      insert into event_registrations (event_id, user_id, people_id, tickets, status, paid_cents)
      values (${data.eventId}, ${context.userId}, ${me.id}, ${tickets}, 'going', ${paid})
      on conflict (event_id, user_id) do update set status = 'going', tickets = ${tickets}, paid_cents = ${paid}
    `;
    return { ok: true as const, paidCents: paid };
  });

export const cancelRsvp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((eventId: number) => eventId)
  .handler(async ({ context, data: eventId }) => {
    const sql = await getSql();
    await sql`
      update event_registrations set status = 'cancelled'
      where event_id = ${eventId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      title: string;
      description: string;
      location: string;
      startsAt: string;
      endsAt: string;
      visibility: "public" | "members";
      kind: string;
      ticketCents: number;
      capacity?: number;
      imageKey?: string;
      imageUrl?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only staff can create events");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into events (
        title, description, location, starts_at, ends_at, visibility, kind, capacity, ticket_cents, image_key, image_url, created_by_user_id
      ) values (
        ${data.title.trim()}, ${data.description.trim()}, ${data.location.trim()},
        ${data.startsAt}, ${data.endsAt}, ${data.visibility}, ${data.kind},
        ${data.capacity ?? null}, ${Math.max(0, data.ticketCents | 0)}, ${data.imageKey || "sanctuary"},
        ${data.imageUrl ?? null}, ${context.userId}
      ) returning id
    `;
    return { id: rows[0]!.id };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      eventId: number;
      title: string;
      description: string;
      location: string;
      startsAt: string;
      endsAt: string;
      visibility: "public" | "members";
      kind: string;
      ticketCents: number;
      capacity?: number;
      imageKey?: string;
      imageUrl?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only staff can edit events");
    const sql = await getSql();
    await sql`
      update events set
        title = ${data.title.trim()}, description = ${data.description.trim()}, location = ${data.location.trim()},
        starts_at = ${data.startsAt}, ends_at = ${data.endsAt}, visibility = ${data.visibility}, kind = ${data.kind},
        capacity = ${data.capacity ?? null}, ticket_cents = ${Math.max(0, data.ticketCents | 0)},
        image_key = ${data.imageKey || "sanctuary"}, image_url = ${data.imageUrl ?? null}
      where id = ${data.eventId}
    `;
    return { ok: true as const };
  });

/** Every event, past and future, for the "view all" browser with sort/filter. */
export const listAllEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<Parameters<typeof mapEvent>[0]>`
      select e.*,
        (select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'going') as going,
        exists(select 1 from event_registrations r where r.event_id = e.id and r.user_id = ${context.userId} and r.status = 'going') as mine
      from events e
      order by e.starts_at desc
    `;
    return rows.map(mapEvent);
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((eventId: number) => eventId)
  .handler(async ({ context, data: eventId }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only staff can delete events");
    const sql = await getSql();
    await sql`delete from event_registrations where event_id = ${eventId}`;
    await sql`delete from roster_slots where event_id = ${eventId}`;
    await sql`delete from events where id = ${eventId}`;
    return { ok: true as const };
  });

export const listSermons = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<Parameters<typeof mapSermon>[0]>`select * from sermons order by preached_at desc`;
    return rows.map(mapSermon);
  });

export const deleteSermon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((sermonId: number) => sermonId)
  .handler(async ({ context, data: sermonId }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only staff can delete sermons");
    const sql = await getSql();
    await sql`delete from sermons where id = ${sermonId}`;
    return { ok: true as const };
  });

export const createSermon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      title: string;
      speaker: string;
      series?: string;
      scripture?: string;
      preachedAt: string;
      durationSeconds?: number;
      description?: string;
      imageKey?: string;
      imageUrl?: string | null;
      transcript?: string;
      audioUrl?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff && !me.isAdmin) throw new Error("Only pastors and admins can add sermons");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into sermons (
        title, speaker, series, scripture, preached_at, duration_seconds, description, image_key, image_url, transcript, audio_url
      ) values (
        ${data.title.trim()}, ${data.speaker.trim()}, ${data.series?.trim() || ""}, ${data.scripture?.trim() || ""},
        ${data.preachedAt}, ${data.durationSeconds ?? 1800}, ${data.description?.trim() || ""},
        ${data.imageKey || "music"}, ${data.imageUrl ?? null}, ${data.transcript?.trim() || ""}, ${data.audioUrl ?? null}
      ) returning id
    `;
    return { id: rows[0]!.id };
  });

export const listTeams = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const teams = await sql<{ id: number; name: string; description: string; ministry: string }>`
      select * from teams order by name
    `;
    const members = await sql<{
      team_id: number;
      people_id: number;
      seat: string;
      first_name: string;
      last_name: string;
      user_id: string | null;
    }>`
      select tm.team_id, tm.people_id, tm.seat, p.first_name, p.last_name, p.user_id
      from team_members tm join people p on p.id = tm.people_id
    `;
    return teams.map((t): Team => {
      const ms = members.filter((m) => m.team_id === t.id);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        ministry: t.ministry,
        members: ms.map((m) => ({
          peopleId: m.people_id,
          name: `${m.first_name} ${m.last_name}`.trim(),
          seat: m.seat,
          userId: m.user_id,
        })),
        mine: ms.some((m) => m.people_id === me.id),
      };
    });
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; description?: string; ministry: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can add teams");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into teams (name, description, ministry)
      values (${data.name.trim()}, ${data.description?.trim() || ""}, ${data.ministry.trim()})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const updateTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { teamId: number; name: string; description?: string; ministry: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can edit teams");
    const sql = await getSql();
    await sql`
      update teams set name = ${data.name.trim()}, description = ${data.description?.trim() || ""},
        ministry = ${data.ministry.trim()}
      where id = ${data.teamId}
    `;
    return { ok: true as const };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((teamId: number) => teamId)
  .handler(async ({ context, data: teamId }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can delete teams");
    const sql = await getSql();
    await sql`delete from roster_slots where team_id = ${teamId}`;
    await sql`delete from availability where team_id = ${teamId}`;
    await sql`delete from team_members where team_id = ${teamId}`;
    await sql`delete from teams where id = ${teamId}`;
    return { ok: true as const };
  });

export const joinTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((teamId: number) => teamId)
  .handler(async ({ context, data: teamId }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    await sql`
      insert into team_members (team_id, people_id, seat)
      values (${teamId}, ${me.id}, 'member')
      on conflict (team_id, people_id) do nothing
    `;
    return { ok: true as const };
  });

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { teamId: number; day: string; status: "available" | "unavailable" | "maybe" }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    await sql`
      insert into availability (people_id, team_id, day, status)
      values (${me.id}, ${data.teamId}, ${data.day}, ${data.status})
      on conflict (people_id, team_id, day) do update set status = ${data.status}
    `;
    return { ok: true as const };
  });

export const listAvailability = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((teamId: number) => teamId)
  .handler(async ({ context, data: teamId }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    return sql<{ day: string; status: string }>`
      select day, status from availability
      where people_id = ${me.id} and team_id = ${teamId}
      order by day
    `;
  });

async function assertTeamLead(me: Me, teamId: number) {
  if (me.isStaff) return;
  const sql = await getSql();
  const rows = await sql<{ seat: string }>`
    select seat from team_members where team_id = ${teamId} and people_id = ${me.id} limit 1
  `;
  if (rows[0]?.seat !== "lead") throw new Error("Only the team lead or staff can build the roster");
}

/** For a lead building the roster: every team member, their availability for
 * that event's date, and whatever seat they're already assigned (if any). */
export const listTeamRoster = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { teamId: number; eventId: number }) => d)
  .handler(async ({ context, data }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    const ev = await sql<{ starts_at: string }>`
      select starts_at from events where id = ${data.eventId} limit 1
    `;
    if (!ev[0]) throw new Error("Event not found");
    const day = String(ev[0].starts_at).slice(0, 10);
    const rows = await sql<{
      people_id: number;
      first_name: string;
      last_name: string;
      seat: string;
      status: string | null;
      seat_label: string | null;
    }>`
      select tm.people_id, p.first_name, p.last_name, tm.seat,
        a.status,
        rs.seat_label
      from team_members tm
      join people p on p.id = tm.people_id
      left join availability a
        on a.people_id = tm.people_id and a.team_id = tm.team_id and a.day = ${day}
      left join roster_slots rs
        on rs.people_id = tm.people_id and rs.team_id = tm.team_id and rs.event_id = ${data.eventId}
      where tm.team_id = ${data.teamId}
      order by p.first_name, p.last_name
    `;
    return rows.map((r) => ({
      peopleId: r.people_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      isLead: r.seat === "lead",
      availability: (r.status ?? "unset") as "available" | "unavailable" | "maybe" | "unset",
      assignedSeat: r.seat_label,
    }));
  });

/** Assign (or re-assign) one team member to a seat for a given Sunday/event.
 * Only that team's lead, or staff, may call this. */
export const assignRosterSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { eventId: number; teamId: number; peopleId: number; seatLabel: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    await assertTeamLead(me, data.teamId);
    const sql = await getSql();
    await sql`
      insert into roster_slots (event_id, team_id, people_id, seat_label)
      values (${data.eventId}, ${data.teamId}, ${data.peopleId}, ${data.seatLabel})
      on conflict (event_id, team_id, people_id) do update set seat_label = ${data.seatLabel}
    `;
    return { ok: true as const };
  });

/** Remove someone from the roster for that event. Same lead/staff-only gate. */
export const removeRosterSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { eventId: number; teamId: number; peopleId: number }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    await assertTeamLead(me, data.teamId);
    const sql = await getSql();
    await sql`
      delete from roster_slots
      where event_id = ${data.eventId} and team_id = ${data.teamId} and people_id = ${data.peopleId}
    `;
    return { ok: true as const };
  });

export const listGroups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      name: string;
      description: string;
      meets: string;
      location: string;
      age_group: string | null;
      image_key: string;
      leader: string | null;
      n: number;
      mine: boolean;
    }>`
      select g.*,
        (select first_name || ' ' || last_name from people p where p.id = g.leader_people_id) as leader,
        (select count(*)::int from group_members gm where gm.group_id = g.id) as n,
        exists(select 1 from group_members gm where gm.group_id = g.id and gm.people_id = ${me.id}) as mine
      from groups g
      order by g.name
    `;
    return rows.map(
      (g): Group => ({
        id: g.id,
        name: g.name,
        description: g.description,
        meets: g.meets,
        location: g.location,
        ageGroup: g.age_group,
        imageKey: g.image_key,
        leaderName: g.leader,
        memberCount: g.n,
        mine: Boolean(g.mine),
      }),
    );
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      name: string;
      description?: string;
      meets: string;
      location?: string;
      ageGroup?: string | null;
      imageKey?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can add groups");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into groups (name, description, meets, location, age_group, image_key)
      values (
        ${data.name.trim()}, ${data.description?.trim() || ""}, ${data.meets.trim()},
        ${data.location?.trim() || ""}, ${data.ageGroup || null}, ${data.imageKey || "study"}
      ) returning id
    `;
    return { id: rows[0]!.id };
  });

export const updateGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      groupId: number;
      name: string;
      description?: string;
      meets: string;
      location?: string;
      ageGroup?: string | null;
      imageKey?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can edit groups");
    const sql = await getSql();
    await sql`
      update groups set
        name = ${data.name.trim()}, description = ${data.description?.trim() || ""}, meets = ${data.meets.trim()},
        location = ${data.location?.trim() || ""}, age_group = ${data.ageGroup || null},
        image_key = ${data.imageKey || "study"}
      where id = ${data.groupId}
    `;
    return { ok: true as const };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((groupId: number) => groupId)
  .handler(async ({ context, data: groupId }) => {
    const me = await loadMe(context.userId);
    if (!me.isStaff) throw new Error("Only pastors and staff can delete groups");
    const sql = await getSql();
    await sql`delete from group_members where group_id = ${groupId}`;
    await sql`delete from groups where id = ${groupId}`;
    return { ok: true as const };
  });

export const joinGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((groupId: number) => groupId)
  .handler(async ({ context, data: groupId }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    await sql`
      insert into group_members (group_id, people_id)
      values (${groupId}, ${me.id})
      on conflict (group_id, people_id) do nothing
    `;
    return { ok: true as const };
  });


export const listResources = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await loadMe(context.userId);
    const sql = await getSql();
    return sql<Resource>`
      select id, title, url, category, description, kind from resources order by category, title
    `;
  });

export const give = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      amountCents: number;
      fund: string;
      method: string;
      note?: string;
      anonymous?: boolean;
      recurring?: boolean;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await loadMe(context.userId);
    const amount = Math.round(data.amountCents);
    if (amount < 1000) throw new Error("Minimum gift is R10");
    const sql = await getSql();
    await sql`
      insert into contributions (user_id, amount_cents, fund, method, note, anonymous, recurring)
      values (
        ${context.userId}, ${amount}, ${data.fund}, ${data.method},
        ${data.note?.trim() || null}, ${Boolean(data.anonymous)}, ${Boolean(data.recurring)}
      )
    `;
    return { ok: true as const };
  });

export const myGiving = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      amount_cents: number;
      fund: string;
      method: string;
      note: string | null;
      anonymous: boolean;
      recurring: boolean;
      created_at: string;
    }>`
      select id, amount_cents, fund, method, note, anonymous, recurring, created_at
      from contributions
      where user_id = ${context.userId} and status = 'paid'
      order by created_at desc
    `;
    const totals = me.isStaff
      ? await sql<{ fund: string; total: number }>`
          select fund, sum(amount_cents)::int as total from contributions where status = 'paid' group by fund
        `
      : [];
    const history: Contribution[] = rows.map((r) => ({
      id: r.id,
      amountCents: r.amount_cents,
      fund: r.fund,
      method: r.method,
      note: r.note,
      anonymous: r.anonymous,
      recurring: r.recurring,
      createdAt: r.created_at,
    }));
    return { history, totals };
  });

export const listChildren = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      first_name: string;
      last_name: string;
      birthday: string | null;
      allergies: string | null;
      qr_token: string;
      household_id: number | null;
      notes: string | null;
      parent: string | null;
    }>`
      select c.id, c.first_name, c.last_name, c.birthday, c.allergies, c.qr_token, c.household_id, c.notes,
        (select p.first_name || ' ' || p.last_name from people p
          where p.household_id = c.household_id and p.role <> 'child' and p.id <> c.id
          order by case p.role when 'pastor' then 0 when 'staff' then 1 else 2 end
          limit 1) as parent
      from people c
      where c.role = 'child'
      order by c.first_name
    `;
    const mine = rows.filter((r) => r.household_id && r.household_id === me.householdId);
    const all = me.isOps ? rows : mine;
    return all.map(
      (r): ChildRecord => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        birthday: r.birthday,
        allergies: r.allergies,
        qrToken: r.qr_token,
        householdId: r.household_id,
        notes: r.notes,
        parentName: r.parent,
      }),
    );
  });

export const registerChild = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { firstName: string; lastName: string; birthday?: string; allergies?: string; walkIn?: boolean }) => d,
  )
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const birthday = data.birthday || null;
    const age = ageGroupFromBirthday(birthday);
    const roleAge = age === "little_ones" || age === "kids" || age === "youth" ? age : "kids";
    const hh = data.walkIn ? null : me.householdId;
    const rows = await sql<{ id: number; qr_token: string }>`
      insert into people (
        household_id, first_name, last_name, role, age_group, birthday, allergies, notes, qr_token, avatar_hue, status
      ) values (
        ${hh}, ${data.firstName.trim()}, ${data.lastName.trim()}, ${"child"}, ${roleAge},
        ${birthday}, ${data.allergies?.trim() || null}, ${data.walkIn ? "Walk-in" : null}, ${token()}, ${Math.floor(Math.random() * 360)}, ${"approved"}
      ) returning id, qr_token
    `;
    return { id: rows[0]!.id, qrToken: rows[0]!.qr_token };
  });

export const checkInChild = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { childId: number; serviceLabel: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const child = await sql<{
      id: number;
      first_name: string;
      last_name: string;
      age_group: string;
      allergies: string | null;
      qr_token: string;
      notes: string | null;
      household_id: number | null;
    }>`select id, first_name, last_name, age_group, allergies, qr_token, notes, household_id from people where id = ${data.childId} limit 1`;
    if (!child[0]) throw new Error("Child not found");
    if (!me.isOps && child[0].household_id !== me.householdId) {
      throw new Error("You can only check in your own children");
    }
    const open = await sql<{ id: number }>`
      select id from checkins
      where child_people_id = ${data.childId} and service_date = current_date and checked_out_at is null
      limit 1
    `;
    if (open[0]) throw new Error("Already checked in");
    const code = pickupCode();
    const room = roomForAge(child[0].age_group);
    const walkIn = child[0].notes === "Walk-in";
    const rows = await sql<{
      id: number;
      checked_in_at: string;
      service_date: string;
    }>`
      insert into checkins (
        child_people_id, service_label, service_date, checked_in_by_user_id, room, pickup_code, walk_in
      ) values (
        ${data.childId}, ${data.serviceLabel}, current_date, ${context.userId}, ${room}, ${code}, ${walkIn}
      ) returning id, checked_in_at, service_date
    `;
    const c = child[0];
    const result: Checkin = {
      id: rows[0]!.id,
      childPeopleId: c.id,
      childName: `${c.first_name} ${c.last_name}`.trim(),
      age: null,
      allergies: c.allergies,
      qrToken: c.qr_token,
      serviceLabel: data.serviceLabel,
      serviceDate: rows[0]!.service_date,
      checkedInAt: rows[0]!.checked_in_at,
      checkedOutAt: null,
      room,
      pickupCode: code,
      walkIn,
    };
    return result;
  });

export const checkOutChild = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { checkinId: number; pickupCode?: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const row = await sql<{ id: number; pickup_code: string }>`
      select id, pickup_code from checkins where id = ${data.checkinId} limit 1
    `;
    if (!row[0]) throw new Error("Check-in not found");
    if (!me.isOps && data.pickupCode && data.pickupCode !== row[0].pickup_code) {
      throw new Error("Pickup code does not match");
    }
    if (!me.isOps && !data.pickupCode) throw new Error("Pickup code required");
    await sql`update checkins set checked_out_at = now() where id = ${data.checkinId}`;
    return { ok: true as const };
  });

export const todayCheckins = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await loadMe(context.userId);
    const sql = await getSql();
    const rows = me.isOps
      ? await sql<{
          id: number;
          child_people_id: number;
          first_name: string;
          last_name: string;
          birthday: string | null;
          allergies: string | null;
          qr_token: string;
          service_label: string;
          service_date: string;
          checked_in_at: string;
          checked_out_at: string | null;
          room: string;
          pickup_code: string;
          walk_in: boolean;
        }>`
          select ck.id, ck.child_people_id, ck.service_label, ck.service_date, ck.checked_in_at,
                 ck.checked_out_at, ck.room, ck.pickup_code, ck.walk_in,
                 p.first_name, p.last_name, p.birthday, p.allergies, p.qr_token
          from checkins ck
          join people p on p.id = ck.child_people_id
          where ck.service_date = current_date
          order by ck.checked_in_at desc
        `
      : await sql<{
          id: number;
          child_people_id: number;
          first_name: string;
          last_name: string;
          birthday: string | null;
          allergies: string | null;
          qr_token: string;
          service_label: string;
          service_date: string;
          checked_in_at: string;
          checked_out_at: string | null;
          room: string;
          pickup_code: string;
          walk_in: boolean;
        }>`
          select ck.id, ck.child_people_id, ck.service_label, ck.service_date, ck.checked_in_at,
                 ck.checked_out_at, ck.room, ck.pickup_code, ck.walk_in,
                 p.first_name, p.last_name, p.birthday, p.allergies, p.qr_token
          from checkins ck
          join people p on p.id = ck.child_people_id
          where ck.service_date = current_date and p.household_id = ${me.householdId}
          order by ck.checked_in_at desc
        `;
    return rows.map(
      (r): Checkin => ({
        id: r.id,
        childPeopleId: r.child_people_id,
        childName: `${r.first_name} ${r.last_name}`.trim(),
        age: null,
        allergies: r.allergies,
        qrToken: r.qr_token,
        serviceLabel: r.service_label,
        serviceDate: r.service_date,
        checkedInAt: r.checked_in_at,
        checkedOutAt: r.checked_out_at,
        room: r.room,
        pickupCode: r.pickup_code,
        walkIn: r.walk_in,
      }),
    );
  });

export const scanCheckIn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { qrToken: string; serviceLabel: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await loadMe(context.userId);
    if (!me.isOps) throw new Error("Only volunteers and staff can scan at the desk");
    const sql = await getSql();
    const child = await sql<{ id: number }>`
      select id from people where qr_token = ${data.qrToken.trim().toUpperCase()} and role = 'child' limit 1
    `;
    if (!child[0]) throw new Error("QR code not recognised");
    const childId = child[0].id;
    const row = await sql<{
      id: number;
      first_name: string;
      last_name: string;
      age_group: string;
      allergies: string | null;
      qr_token: string;
      notes: string | null;
    }>`select id, first_name, last_name, age_group, allergies, qr_token, notes from people where id = ${childId} limit 1`;
    const c = row[0]!;
    const open = await sql<{ id: number }>`
      select id from checkins
      where child_people_id = ${childId} and service_date = current_date and checked_out_at is null
      limit 1
    `;
    if (open[0]) throw new Error("Already checked in");
    const code = pickupCode();
    const room = roomForAge(c.age_group);
    const walkIn = c.notes === "Walk-in";
    const inserted = await sql<{
      id: number;
      checked_in_at: string;
      service_date: string;
    }>`
      insert into checkins (
        child_people_id, service_label, service_date, checked_in_by_user_id, room, pickup_code, walk_in
      ) values (
        ${childId}, ${data.serviceLabel}, current_date, ${context.userId}, ${room}, ${code}, ${walkIn}
      ) returning id, checked_in_at, service_date
    `;
    return {
      id: inserted[0]!.id,
      childPeopleId: c.id,
      childName: `${c.first_name} ${c.last_name}`.trim(),
      age: null,
      allergies: c.allergies,
      qrToken: c.qr_token,
      serviceLabel: data.serviceLabel,
      serviceDate: inserted[0]!.service_date,
      checkedInAt: inserted[0]!.checked_in_at,
      checkedOutAt: null,
      room,
      pickupCode: code,
      walkIn,
    } satisfies Checkin;
  });
