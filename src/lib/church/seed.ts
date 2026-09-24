import type { Sql } from "@/lib/db";
import { token } from "./map";
import { CHURCH_ADDRESS } from "./types";

function at(daysFromToday: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function sast(date: string, hour: number, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+02:00`).toISOString();
}

function plusMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

/** Next Sunday, as YYYY-MM-DD, N weeks out. */
function nextSunday(weeksOut = 0): string {
  const d = new Date();
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add + weeksOut * 7);
  return d.toISOString().slice(0, 10);
}

async function resetChurch(sql: Sql) {
  await sql.query(`
    truncate table
      checkins, contributions, messages, resources,
      event_registrations, roster_slots, availability,
      team_members, group_members,
      events, news, sermons, teams, groups, channels,
      people, households, church_meta
    restart identity cascade
  `);
}

export async function seedIfNeeded(sql: Sql) {
  const name = await sql<{ value: string }>`select value from church_meta where key = 'name'`;
  if (name[0]?.value === "Awake the Nations") return;

  await resetChurch(sql);

  await sql`insert into church_meta (key, value) values ('seeded', 'awake-the-nations-1')`;
  await sql`insert into church_meta (key, value) values ('name', 'Awake the Nations')`;
  await sql`insert into church_meta (key, value) values ('city', 'Goodwood, Cape Town')`;

  const households = [
    "Matthew",
    "Einbeck",
    "Naidoo",
    "Botha",
    "Mokoena",
    "Petersen",
    "van der Merwe",
    "Adeyemi",
    "Davids",
    "Nkosi",
  ];
  const householdIds: number[] = [];
  for (const h of households) {
    const rows = await sql<{ id: number }>`insert into households (name) values (${h}) returning id`;
    householdIds.push(rows[0]!.id);
  }

  type SeedPerson = {
    first: string;
    last: string;
    role: string;
    age: string;
    household: number;
    email: string;
    phone: string;
    bio: string;
    birthday: string;
    allergies?: string;
    hue: number;
  };

  const people: SeedPerson[] = [
    {
      first: "Zion",
      last: "Matthew",
      role: "pastor",
      age: "adults",
      household: 0,
      email: "admin@zionmatthew.com",
      phone: "0725891779",
      bio: "Senior Pastor of Awake the Nations. Leads the vision and teaching of the house.",
      birthday: "1978-04-12",
      hue: 210,
    },
    {
      first: "Fedillio",
      last: "Einbeck",
      role: "pastor",
      age: "adults",
      household: 1,
      email: "fedillio@zionmatthew.com",
      phone: "0734930893",
      bio: "Executive Pastor. Runs the day-to-day life of the church alongside Pastor Zion.",
      birthday: "1982-09-03",
      hue: 220,
    },
    {
      first: "Lerato",
      last: "Mokoena",
      role: "staff",
      age: "adults",
      household: 4,
      email: "lerato@zionmatthew.com",
      phone: "",
      bio: "Kids Church lead. Wants every child to leave thinking God must really love me to give me this church.",
      birthday: "1992-02-18",
      hue: 18,
    },
    {
      first: "Kabelo",
      last: "Mokoena",
      role: "child",
      age: "kids",
      household: 4,
      email: "",
      phone: "",
      bio: "",
      birthday: "2017-06-11",
      allergies: "Peanuts",
      hue: 42,
    },
    {
      first: "James",
      last: "Botha",
      role: "staff",
      age: "adults",
      household: 3,
      email: "james@zionmatthew.com",
      phone: "",
      bio: "Worship lead. Believes a church that sings becomes a family.",
      birthday: "1990-11-04",
      hue: 205,
    },
    {
      first: "Priya",
      last: "Naidoo",
      role: "staff",
      age: "young_adults",
      household: 2,
      email: "priya@zionmatthew.com",
      phone: "",
      bio: "Operations and hospitality. First at the coffee urn, last to stack a chair.",
      birthday: "1995-07-22",
      hue: 12,
    },
    {
      first: "Anika",
      last: "Naidoo",
      role: "child",
      age: "little_ones",
      household: 2,
      email: "",
      phone: "",
      bio: "",
      birthday: "2024-01-09",
      allergies: "Dairy",
      hue: 48,
    },
    {
      first: "Sipho",
      last: "Nkosi",
      role: "volunteer",
      age: "adults",
      household: 9,
      email: "sipho@example.com",
      phone: "",
      bio: "Prayer team. Holds the rest of us when we cannot pray.",
      birthday: "1974-03-30",
      hue: 168,
    },
    {
      first: "Nomsa",
      last: "Nkosi",
      role: "member",
      age: "seniors",
      household: 9,
      email: "nomsa@example.com",
      phone: "",
      bio: "Intercessor. Has been praying for a church like this in Goodwood for years.",
      birthday: "1956-08-17",
      hue: 200,
    },
    {
      first: "Daniel",
      last: "Petersen",
      role: "volunteer",
      age: "young_adults",
      household: 5,
      email: "daniel@example.com",
      phone: "",
      bio: "Teens. Midweek gatherings are his favourite hour.",
      birthday: "1998-12-01",
      hue: 190,
    },
    {
      first: "Mia",
      last: "van der Merwe",
      role: "volunteer",
      age: "adults",
      household: 6,
      email: "mia@example.com",
      phone: "",
      bio: "Media and stories. Films the quiet moments, not just the stage.",
      birthday: "1993-05-14",
      hue: 235,
    },
    {
      first: "Tunde",
      last: "Adeyemi",
      role: "member",
      age: "adults",
      household: 7,
      email: "tunde@example.com",
      phone: "",
      bio: "New to church. Found Awake the Nations through a neighbour in Goodwood.",
      birthday: "1986-10-09",
      hue: 36,
    },
    {
      first: "Ruth",
      last: "Davids",
      role: "member",
      age: "seniors",
      household: 8,
      email: "ruth@example.com",
      phone: "",
      bio: "Scripture circle on Thursday mornings. Tea, psalms, and long memory.",
      birthday: "1948-06-04",
      hue: 120,
    },
  ];

  const personIds: number[] = [];
  for (const p of people) {
    const qr = token();
    const rows = await sql<{ id: number }>`
      insert into people (
        household_id, first_name, last_name, email, phone, role, age_group,
        bio, birthday, allergies, qr_token, avatar_hue
      ) values (
        ${householdIds[p.household]!}, ${p.first}, ${p.last},
        ${p.email || null}, ${p.phone || null}, ${p.role}, ${p.age},
        ${p.bio || null}, ${p.birthday}, ${p.allergies ?? null}, ${qr}, ${p.hue}
      ) returning id`;
    personIds.push(rows[0]!.id);
  }

  const pid = (i: number) => personIds[i]!;

  const sun1 = sast(nextSunday(0), 9, 30);
  const sun2 = sast(nextSunday(1), 9, 30);
  const sun3 = sast(nextSunday(2), 9, 30);
  const prayer = sast(nextSunday(0), 18, 30);
  const homes = sast(nextSunday(1), 19, 0);
  const teens = sast(nextSunday(1), 18, 30);

  const eventRows = [
    {
      title: "Midweek prayer",
      description:
        "A midweek gathering to seek God together in prayer, ahead of Sunday.",
      location: CHURCH_ADDRESS,
      starts: prayer,
      ends: plusMinutes(prayer, 90),
      vis: "members",
      kind: "midweek",
      cap: 80,
      price: 0,
      img: "scripture",
    },
    {
      title: "Sunday gathering · 09:30",
      description:
        "Worship, prayer, and the Word. Kids Church runs throughout the service.",
      location: CHURCH_ADDRESS,
      starts: sun1,
      ends: plusMinutes(sun1, 90),
      vis: "public",
      kind: "sunday",
      cap: 400,
      price: 0,
      img: "sanctuary",
    },
    {
      title: "Life together",
      description:
        "The church is most alive in homes. A midweek table for people learning to belong — no performance, just presence.",
      location: "Homes across Goodwood",
      starts: homes,
      ends: plusMinutes(homes, 120),
      vis: "members",
      kind: "midweek",
      cap: 40,
      price: 0,
      img: "study",
    },
    {
      title: "Teens",
      description:
        "Teens gather in the main meeting on Sunday, and connect through the week. Games, honesty, and a short word.",
      location: "The teens room",
      starts: teens,
      ends: plusMinutes(teens, 120),
      vis: "members",
      kind: "kids",
      cap: 40,
      price: 0,
      img: "kids",
    },
    {
      title: "Sunday gathering · 09:30",
      description: "Every Sunday. One gathering, one house, reaching the nations.",
      location: CHURCH_ADDRESS,
      starts: sun2,
      ends: plusMinutes(sun2, 90),
      vis: "public",
      kind: "sunday",
      cap: 400,
      price: 0,
      img: "arch",
    },
    {
      title: "Sunday gathering · 09:30",
      description: "Ordinary Sunday. Coffee, worship, the Word, and a place at the table.",
      location: CHURCH_ADDRESS,
      starts: sun3,
      ends: plusMinutes(sun3, 90),
      vis: "public",
      kind: "sunday",
      cap: 400,
      price: 0,
      img: "sanctuary",
    },
  ];

  const eventIds: number[] = [];
  for (const e of eventRows) {
    const rows = await sql<{ id: number }>`
      insert into events (
        title, description, location, starts_at, ends_at, visibility, kind, capacity, ticket_cents, image_key
      ) values (
        ${e.title}, ${e.description}, ${e.location}, ${e.starts}, ${e.ends}, ${e.vis}, ${e.kind}, ${e.cap}, ${e.price}, ${e.img}
      ) returning id`;
    eventIds.push(rows[0]!.id);
  }

  await sql`
    insert into news (title, excerpt, body, author_name, pinned, audience, image_key, published_at) values
    (
      'Welcome to Awake the Nations',
      'Sundays at 09:30 at 31 Kimberley Street, Townsend Estate, Goodwood.',
      'Awake the Nations is an Awake house devoted to worship, prayer, and making disciples of all nations. Whatever your background, you are welcome to come as you are. Kids Church runs every Sunday for little ones through to Grade 7; teens join the main meeting.',
      'Fedillio Einbeck', true, 'all', 'exterior', ${at(-2, 10)}
    ),
    (
      'Awake the Nations — a new series',
      'Pastor Zion begins a series on God calling His people to rise, shine, and awaken the nations.',
      'Arise, shine, for your light has come. Series notes will live on the Resources tab. If you would like to read ahead: Isaiah 60, Acts 2, and Matthew 28.',
      'Zion Matthew', true, 'all', 'scripture', ${at(-5, 8)}
    ),
    (
      'Kids Church still needs hosts',
      'If you can give one Sunday a month, Lerato would love to train you this week.',
      'No teaching degree required — just a calm presence and a willingness to learn the room. Speak to Lerato or tap Teams → Kids Church.',
      'Lerato Mokoena', false, 'all', 'kids', ${at(-6, 12)}
    )`;

  await sql`
    insert into sermons (title, speaker, series, scripture, preached_at, duration_seconds, description, image_key, transcript) values
    (
      'Awake the Nations',
      'Zion Matthew',
      'Awake the Nations',
      'Isaiah 60:1',
      ${at(-9, 9).slice(0, 10)},
      1860,
      'A word on God''s call to rise, shine, and awaken the nations to His presence and power.',
      'arch',
      'Arise, shine, for your light has come, and the glory of the Lord has risen upon you. That is not a suggestion — it is a call. God is not looking for a people content to stay quiet in the dark. He is raising up a house that will awaken the nations to His presence and power, starting right here in Goodwood. If you came tonight tired of church, or tired of yourself, hear this: the light has come. Arise. Shine.'
    ),
    (
      'A house of prayer',
      'Fedillio Einbeck',
      'Awake the Nations',
      'Acts 2:1–47',
      ${at(-16, 9).slice(0, 10)},
      1740,
      'The first church was a family of Spirit-empowered worshippers. We are asking God to build that here.',
      'sanctuary',
      'Acts 2 is not a museum. It is a pattern. Spirit poured out, Jesus proclaimed, a people who held things in common and added to their number daily. We are not trying to be impressive. We are trying to be that. If you have been around church long enough to be over it, I understand. Come and see whether God still builds this way.'
    ),
    (
      'Reaching the nations from Goodwood',
      'Zion Matthew',
      'Awake the Nations',
      'Matthew 28:19',
      ${at(-23, 9).slice(0, 10)},
      1620,
      'Why the nations start with the street outside our door.',
      'exterior',
      'Go therefore and make disciples of all nations. That commission did not skip Goodwood. Every nation begins with a neighbour, a household, a street. Awake the Nations is not a brand exercise. It is prayer, obedience, and a people who will not settle for spiritual dryness. Come and help us build.'
    )`;

  const teamNames = [
    { name: "Worship", ministry: "worship", desc: "Music, and the quiet work of helping us sing." },
    { name: "Kids Church", ministry: "kids", desc: "Little Lights, the kids' rooms, and a church that feels like wonder." },
    { name: "Hospitality", ministry: "hospitality", desc: "Doors, coffee, and first conversations." },
    { name: "Prayer", ministry: "prayer", desc: "The people who hold the rest of us when we cannot pray." },
    { name: "Media", ministry: "media", desc: "Sound, stories, and the recordings that travel further than Kimberley Street." },
    { name: "Outreach", ministry: "outreach", desc: "No passengers — every gift in the body, on mission in the city." },
  ];
  const teamIds: number[] = [];
  for (const t of teamNames) {
    const rows = await sql<{ id: number }>`
      insert into teams (name, description, ministry) values (${t.name}, ${t.desc}, ${t.ministry}) returning id`;
    teamIds.push(rows[0]!.id);
  }

  // 0 Zion, 1 Fedillio, 2 Lerato, 3 Kabelo, 4 James, 5 Priya, 6 Anika,
  // 7 Sipho, 8 Nomsa, 9 Daniel, 10 Mia, 11 Tunde, 12 Ruth
  const memberships: [number, number, string][] = [
    [0, 4, "lead"],
    [0, 10, "member"],
    [0, 0, "member"],
    [1, 2, "lead"],
    [1, 5, "member"],
    [2, 5, "lead"],
    [2, 11, "member"],
    [3, 7, "lead"],
    [3, 8, "member"],
    [3, 1, "member"],
    [4, 10, "lead"],
    [4, 4, "member"],
    [5, 0, "lead"],
    [5, 1, "member"],
    [5, 9, "member"],
  ];
  for (const [ti, pi, seat] of memberships) {
    await sql`insert into team_members (team_id, people_id, seat) values (${teamIds[ti]!}, ${pid(pi)}, ${seat})`;
  }

  const firstSundayId = eventIds[1]!;
  await sql`insert into roster_slots (event_id, team_id, people_id, seat_label) values
    (${firstSundayId}, ${teamIds[0]!}, ${pid(4)}, 'Worship lead'),
    (${firstSundayId}, ${teamIds[0]!}, ${pid(10)}, 'Vocals'),
    (${firstSundayId}, ${teamIds[1]!}, ${pid(2)}, 'Kids Church lead'),
    (${firstSundayId}, ${teamIds[2]!}, ${pid(5)}, 'Doors'),
    (${firstSundayId}, ${teamIds[2]!}, ${pid(11)}, 'Coffee'),
    (${firstSundayId}, ${teamIds[4]!}, ${pid(4)}, 'Sound')`;

  const groups = [
    {
      name: "Life together · homes",
      desc: "The church is most alive in homes. Unhurried conversation, Scripture, and a table.",
      meets: "Thursdays · 19:00",
      loc: "Homes across Goodwood",
      age: "adults",
      img: "study",
      leader: 0,
    },
    {
      name: "Young adults",
      desc: "Twenty-somethings learning to follow Jesus in Cape Town — work, friendship, and faith.",
      meets: "Wednesdays · 19:30",
      loc: "Rotating homes",
      age: "young_adults",
      img: "table",
      leader: 5,
    },
    {
      name: "Scripture circle",
      desc: "Thursday mornings with Ruth. Tea, psalms, and long memory.",
      meets: "Thursdays · 10:00",
      loc: "Library room",
      age: "seniors",
      img: "scripture",
      leader: 12,
    },
    {
      name: "Teens",
      desc: "Teens join the main meeting on Sunday, and connect through the week.",
      meets: "Fridays · 18:30",
      loc: "The teens room",
      age: "youth",
      img: "kids",
      leader: 9,
    },
  ];
  const groupIds: number[] = [];
  for (const g of groups) {
    const rows = await sql<{ id: number }>`
      insert into groups (name, description, meets, location, age_group, image_key, leader_people_id)
      values (${g.name}, ${g.desc}, ${g.meets}, ${g.loc}, ${g.age}, ${g.img}, ${pid(g.leader)})
      returning id`;
    groupIds.push(rows[0]!.id);
  }
  const gmem: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 7],
    [0, 11],
    [1, 5],
    [1, 9],
    [1, 10],
    [2, 12],
    [2, 8],
    [3, 9],
  ];
  for (const [gi, pi] of gmem) {
    await sql`insert into group_members (group_id, people_id) values (${groupIds[gi]!}, ${pid(pi)})`;
  }

  const churchCh = await sql<{ id: number }>`
    insert into channels (name, kind) values ('Awake the Nations', 'church') returning id`;
  const ageChannels = [
    ["Little Lights parents", "little_ones"],
    ["Kids Church shepherds", "kids"],
    ["Teens", "youth"],
    ["Young adults", "young_adults"],
    ["Adults", "adults"],
    ["Seniors", "seniors"],
  ];
  for (const [chName, age] of ageChannels) {
    await sql`insert into channels (name, kind, age_group) values (${chName}, ${"age"}, ${age})`;
  }
  for (let i = 0; i < teamIds.length; i++) {
    await sql`insert into channels (name, kind, team_id) values (${teamNames[i]!.name}, ${"team"}, ${teamIds[i]!})`;
  }
  for (let i = 0; i < groupIds.length; i++) {
    await sql`insert into channels (name, kind, group_id) values (${groups[i]!.name}, ${"group"}, ${groupIds[i]!})`;
  }

  const chId = churchCh[0]!.id;
  await sql`
    insert into messages (channel_id, user_id, author_name, body, created_at) values
    (${chId}, ${"seed"}, ${"Zion Matthew"}, ${"Sundays at 09:30 at 31 Kimberley Street. Come as you are."}, ${at(-1, 16)}),
    (${chId}, ${"seed"}, ${"Fedillio Einbeck"}, ${"If you have kids: Kids Church runs every Sunday through to Grade 7. Teens stay with us in the main meeting."}, ${at(-1, 17, 20)}),
    (${chId}, ${"seed"}, ${"Priya Naidoo"}, ${"We still need two extra coffee urns for this Sunday. I will be at the church after prayer on Wednesday."}, ${at(0, 8)})
  `;

  await sql`
    insert into resources (title, url, category, description, kind) values
    ('Child protection policy', '/resources#safeguarding', 'Policies', 'How we screen volunteers, run rooms, and handle disclosures.', 'policy'),
    ('Sunday volunteer handbook', '/resources#handbook', 'Policies', 'Doors, coffee, kids, and the changeover between gatherings.', 'document'),
    ('Giving FAQ', '/give', 'Finance', 'Funds, tax receipts, and how to give by EFT.', 'link'),
    ('Map & directions', ${"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("31 Kimberley Street, Townsend Estate, Goodwood, Cape Town")}, 'Practical', '31 Kimberley Street, Townsend Estate, Goodwood, Cape Town.', 'link'),
    ('Contact the church', ${"mailto:admin@zionmatthew.com"}, 'Practical', 'Questions, feedback, or a first hello.', 'link')
  `;

  await sql`
    insert into contributions (user_id, amount_cents, fund, method, note, anonymous, recurring, created_at) values
    (${"seed-hidden"}, 50000, ${"general"}, ${"eft"}, ${null}, true, true, ${at(-20, 9)}),
    (${"seed-hidden"}, 25000, ${"missions"}, ${"card"}, ${null}, true, false, ${at(-12, 11)}),
    (${"seed-hidden"}, 100000, ${"building"}, ${"eft"}, ${"Towards the Kimberley Street home"}, true, false, ${at(-40, 10)})
  `;
}
