-- Live (web/rooms.mjs): the 6-digit code each game is joined with. A row holds its code while the game can be joined
-- (three hours from when the room opens; Play again renews it), so two games never share a code. The deck's name is
-- what a player sees before joining. Only the server reads or writes these, with its secret key: row level security is
-- on with no policies, like the other tables. The game's messages don't come through here; they go over Supabase
-- Realtime's public broadcast channels, straight between the browsers.
create table if not exists public.live_rooms (
  code text primary key check (code ~ '^[0-9]{6}$'),
  host uuid not null references auth.users (id) on delete cascade,
  deck text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists live_rooms_expires_at on public.live_rooms (expires_at);
create index if not exists live_rooms_host on public.live_rooms (host);
alter table public.live_rooms enable row level security;
