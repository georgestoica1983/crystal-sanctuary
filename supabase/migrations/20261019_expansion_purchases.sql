-- Expansion purchases, restored devices and AI Crafter quota.
-- Only the server (service-role key) reads/writes these: RLS is on and there
-- are no policies, so the public anon key can't touch them.

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  email text,
  stripe_session_id text not null unique,
  product text not null default 'expansion',
  created_at timestamptz not null default now()
);
create index if not exists entitlements_player_idx on public.entitlements (player_id);
create index if not exists entitlements_email_idx on public.entitlements (lower(email));

-- Extra devices linked to a purchase via "restore purchase" (email magic link)
create table if not exists public.entitlement_devices (
  player_id text primary key,
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  linked_at timestamptz not null default now()
);

-- One row per AI Crafter use; the unique slot caps uses per purchase per day
create table if not exists public.crafter_usage (
  id bigint generated always as identity primary key,
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  date_key text not null,
  slot smallint not null check (slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (entitlement_id, date_key, slot)
);

alter table public.entitlements enable row level security;
alter table public.entitlement_devices enable row level security;
alter table public.crafter_usage enable row level security;
