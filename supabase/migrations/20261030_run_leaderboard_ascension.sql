-- Ascension level (0-6) of each player's best Run, shown next to the score
alter table public.run_leaderboard
  add column if not exists best_asc smallint not null default 0 check (best_asc between 0 and 6);
