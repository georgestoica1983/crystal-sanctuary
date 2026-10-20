-- Run leaderboard: one row per player with their best Run.
-- Only the server (service-role key, /api/run-leaderboard) reads and writes it:
-- RLS is on with no public policies, so player ids are never exposed to the
-- public anon key.

create table if not exists public.run_leaderboard (
  player_id text primary key,
  player_name text not null,
  best_score bigint not null default 0 check (best_score >= 0),
  best_garden_index integer not null default 0 check (best_garden_index >= 0),
  best_run_seed text,
  runs_submitted integer not null default 0,
  last_submit_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists run_leaderboard_rank_idx
  on public.run_leaderboard (best_score desc, best_garden_index desc, updated_at asc);

alter table public.run_leaderboard enable row level security;
