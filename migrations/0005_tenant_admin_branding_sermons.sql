alter table people add column if not exists is_tenant_admin boolean not null default false;
alter table sermons add column if not exists audio_url text;
alter table sermons add column if not exists image_url text;

-- Pastors are admins by default, so they can manage teams, groups, events, and payments.
update people set is_admin = true where role = 'pastor' and is_admin = false;

-- The in-app messaging feature was removed. Drop its tables (messages first,
-- since it has the foreign key to channels).
drop table if exists messages;
drop table if exists channels;
