-- Lucida's App Store readiness (2026-09-30): what Block (web/social.mjs) and Apple's in-app purchases (web/apple.mjs)
-- read and write. Run it on the live database BEFORE deploying that code. It is safe while the old code is still running:
--   * it only adds two tables and their indexes; nothing is dropped, renamed, changed, or emptied;
--   * every statement can run again (if not exists), so running the whole file twice is fine.
-- Like every other table, row level security is on and there are no policies: only the server's secret key reads or
-- writes these. The columns match web/localrest.mjs, which stands in for them on a computer without Supabase.
-- Run after social.sql.

-- 1. Blocks ---------------------------------------------------------------------------------------------------------
-- Someone blocked someone else (Settings → Account → Blocked people; a profile's ⋯; a suggestion). The blocked person can't
-- follow the blocker or suggest changes to their decks, and the blocker doesn't see their decks in Discover or search, or
-- anything from them in News. They point at the sign-in accounts, not at profiles, so a person who uses "Delete my data"
-- (which removes their profile) is still blocked afterwards; deleting an account removes its blocks, both ways.
create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists blocks_blocked on public.blocks (blocked);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;

-- 2. Apple purchases ------------------------------------------------------------------------------------------------
-- Lucida Pro bought with Apple's in-app purchase on the iPhone: one row per subscription (Apple's original transaction
-- id), kept up to date by the signed transactions the app sends (POST /api/iap) and Apple's notifications
-- (POST /api/apple). Pro counts from here or from Stripe's `pro` table, whichever lasts longer (web/billing.mjs planOf).
--   user_id      whose Pro it is: the purchase's appAccountToken is the person's id, so it can't be moved to someone else
--   plan         month or year (cards.lucida.pro.monthly / cards.lucida.pro.yearly)
--   status       active, expired, or revoked (refunded)
--   period_end   when Pro stops unless Apple renews it (the end of the period paid for, or of the grace period)
--   ending       the subscription is set not to renew
--   signed_at    when Apple signed the newest news used here; older news that arrives later is ignored
--   rev          counts changes, so two requests updating one row never overwrite each other
create table if not exists public.apple_purchases (
  original_transaction_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  plan text not null check (plan in ('month', 'year')),
  status text not null check (status in ('active', 'expired', 'revoked')),
  period_end timestamptz,
  ending boolean not null default false,
  environment text not null default 'Production',
  transaction_id text not null default '',
  signed_at timestamptz not null default now(),
  rev int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists apple_purchases_user on public.apple_purchases (user_id);
alter table public.apple_purchases enable row level security;
revoke all on public.apple_purchases from anon, authenticated;
