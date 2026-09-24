create table if not exists church_meta (
  key   text primary key,
  value text not null
);

create table if not exists households (
  id   serial primary key,
  name text not null
);

create table if not exists people (
  id            serial primary key,
  user_id       text unique,
  household_id  int references households(id),
  first_name    text not null,
  last_name     text not null default '',
  email         text,
  phone         text,
  role          text not null default 'member',
  age_group     text not null default 'adults',
  bio           text,
  address       text,
  birthday      date,
  allergies     text,
  notes         text,
  qr_token      text unique not null,
  avatar_hue    int not null default 140,
  created_at    timestamptz not null default now()
);
create index if not exists people_household_idx on people (household_id);
create index if not exists people_age_group_idx on people (age_group);
create index if not exists people_role_idx on people (role);

create table if not exists events (
  id                 serial primary key,
  title              text not null,
  description        text not null default '',
  location           text not null default '',
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  visibility         text not null default 'members',
  kind               text not null default 'special',
  capacity           int,
  ticket_cents       int not null default 0,
  image_key          text not null default 'sanctuary',
  created_by_user_id text
);
create index if not exists events_starts_idx on events (starts_at);

create table if not exists event_registrations (
  id         serial primary key,
  event_id   int not null references events(id) on delete cascade,
  user_id    text not null,
  people_id  int references people(id),
  tickets    int not null default 1,
  status     text not null default 'going',
  paid_cents int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists event_reg_user_idx on event_registrations (user_id);
create unique index if not exists event_reg_unique on event_registrations (event_id, user_id);

create table if not exists news (
  id             serial primary key,
  title          text not null,
  excerpt        text not null default '',
  body           text not null default '',
  author_name    text not null default '',
  author_user_id text,
  published_at   timestamptz not null default now(),
  pinned         boolean not null default false,
  audience       text not null default 'all',
  image_key      text not null default 'arch'
);

create table if not exists sermons (
  id                serial primary key,
  title             text not null,
  speaker           text not null,
  series            text not null default '',
  scripture         text not null default '',
  preached_at       date not null,
  duration_seconds  int not null default 1800,
  description       text not null default '',
  image_key         text not null default 'scripture',
  transcript        text not null default ''
);

create table if not exists teams (
  id          serial primary key,
  name        text not null,
  description text not null default '',
  ministry    text not null
);

create table if not exists team_members (
  team_id   int not null references teams(id) on delete cascade,
  people_id int not null references people(id) on delete cascade,
  seat      text not null default 'member',
  primary key (team_id, people_id)
);

create table if not exists availability (
  id        serial primary key,
  people_id int not null references people(id) on delete cascade,
  team_id   int not null references teams(id) on delete cascade,
  day       date not null,
  status    text not null,
  note      text,
  unique (people_id, team_id, day)
);

create table if not exists roster_slots (
  id         serial primary key,
  event_id   int not null references events(id) on delete cascade,
  team_id    int not null references teams(id) on delete cascade,
  people_id  int not null references people(id) on delete cascade,
  seat_label text not null
);

create table if not exists groups (
  id               serial primary key,
  name             text not null,
  description      text not null default '',
  meets            text not null,
  location         text not null default '',
  age_group        text,
  image_key        text not null default 'study',
  leader_people_id int references people(id)
);

create table if not exists group_members (
  group_id  int not null references groups(id) on delete cascade,
  people_id int not null references people(id) on delete cascade,
  primary key (group_id, people_id)
);

create table if not exists channels (
  id        serial primary key,
  name      text not null,
  kind      text not null,
  team_id   int references teams(id) on delete cascade,
  group_id  int references groups(id) on delete cascade,
  age_group text
);

create table if not exists messages (
  id          serial primary key,
  channel_id  int not null references channels(id) on delete cascade,
  user_id     text not null,
  author_name text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_channel_idx on messages (channel_id, created_at);

create table if not exists resources (
  id          serial primary key,
  title       text not null,
  url         text not null default '',
  category    text not null,
  description text not null default '',
  kind        text not null default 'link'
);

create table if not exists contributions (
  id         serial primary key,
  user_id    text not null,
  amount_cents int not null,
  fund       text not null,
  method     text not null,
  note       text,
  anonymous  boolean not null default false,
  recurring  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contributions_user_idx on contributions (user_id);

create table if not exists checkins (
  id                    serial primary key,
  child_people_id       int not null references people(id) on delete cascade,
  service_label         text not null,
  service_date          date not null,
  checked_in_at         timestamptz not null default now(),
  checked_out_at        timestamptz,
  checked_in_by_user_id text not null,
  room                  text not null,
  pickup_code           text not null,
  walk_in               boolean not null default false
);
create index if not exists checkins_day_idx on checkins (service_date, service_label);
