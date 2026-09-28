-- Uploaded profile photo (Vercel Blob URL). Falls back to the initials avatar
-- (avatar_hue) in the UI when null.
alter table people add column if not exists avatar_url text;

-- Uploaded event invitation image (Vercel Blob URL). Falls back to the stock
-- image_key photo when null.
alter table events add column if not exists image_url text;

-- Account approval: new sign-ups start 'pending' and cannot use the app until
-- a pastor/admin approves them. The very first person to ever sign up
-- (see seed.ts / api.ts loadMe) is auto-approved as pastor.
alter table people add column if not exists status text not null default 'pending';
alter table people add constraint people_status_check
  check (status in ('pending', 'approved', 'declined'));

-- Overhead admin flag: separate from role (pastor/staff/volunteer/member/child)
-- so specific accounts (Zion, Amy, whoever they designate) can be granted
-- admin control without changing their pastoral/staff role.
alter table people add column if not exists is_admin boolean not null default false;

-- Real payment gateway support (PayFast / Yoco) for giving.
alter table contributions add column if not exists status text not null default 'paid';
alter table contributions add column if not exists gateway text not null default 'manual';
alter table contributions add column if not exists payment_ref text unique;
create index if not exists contributions_payment_ref_idx on contributions (payment_ref);

