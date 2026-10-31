-- Companion (rules class) of each player's best Run, shown as an emoji next to the name
alter table public.run_leaderboard
  add column if not exists best_hero text not null default 'KNIGHT'
  check (best_hero in ('KNIGHT', 'ROGUE', 'MAGE', 'VAMPIRE'));
