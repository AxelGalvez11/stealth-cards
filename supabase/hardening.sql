-- Lucida's security hardening (2026-09-29): what the fixes in web/social.mjs and web/classes.mjs read and write.
-- Run it on the live database BEFORE deploying that code. It is safe while the old code is still running:
--   * it only adds: three columns (each with a default the old code never notices), one read-only view, and indexes;
--   * nothing is dropped, renamed, or emptied, and no old column changes meaning;
--   * every statement can run again (if not exists, or replace, or an update that only touches rows still to fix), so
--     running the two "fill" sections once more right after the deploy is fine (rows the old code wrote in between).
-- The columns match web/localrest.mjs, which stands in for these tables on a computer without Supabase.
-- Run after social.sql and classes.sql.

-- 1. Columns ------------------------------------------------------------------------------------------------------
-- Whether a profile shows in search. One made just by studying, copying, following, saving, watching, suggesting,
-- reporting, joining a class, or asking to be verified stays unlisted until its person edits it or shares a deck
-- publicly (social.mjs updateProfile and shareDeck turn it on).
alter table public.profiles add column if not exists listed boolean not null default false;
-- A deck hidden after a report (classes.mjs hideDeck). Its owner can't share it again, and nobody else can see it.
alter table public.shared_decks add column if not exists hidden boolean not null default false;
-- How many changes a version holds, so a deck's page doesn't read every version's whole list of changes to count them.
alter table public.deck_versions add column if not exists n_changes int not null default 0;

-- 2. Fill them for the rows that are already there ---------------------------------------------------------------
-- People who already made themselves findable: they wrote something on their profile, are verified (or a school), or
-- share a deck publicly.
update public.profiles p set listed = true
 where not p.listed
   and (p.bio <> '' or p.school <> '' or p.subject <> '' or p.featured <> '[]'::jsonb or p.verified <> '' or p.kind = 'school'
        or exists (select 1 from public.shared_decks d where d.owner = p.id and d.visibility = 'public'));
-- Decks Lucida's team already hid after a report.
update public.shared_decks set hidden = true
 where not hidden and id in (select target from public.reports where kind = 'deck' and status = 'hidden');
-- Each version's number of changes.
update public.deck_versions set n_changes = jsonb_array_length(changes)
 where n_changes = 0 and case when jsonb_typeof(changes) = 'array' then jsonb_array_length(changes) else 0 end > 0;

-- 3. How many different people study or copy each deck --------------------------------------------------------------
-- Discover ranks by these (shared_decks.learners, copies, score), so one account that copies a deck 25 times has to count
-- as one person. Only the server's secret key can read it (like the tables it's made from).
create or replace view public.deck_people as
  select shared_id,
         (count(distinct user_id) filter (where mode = 'study'))::int as learners,
         (count(distinct user_id) filter (where mode = 'copy'))::int as copies
    from public.subscriptions
   group by shared_id;
revoke all on public.deck_people from anon, authenticated;
do $$ begin
  alter view public.deck_people set (security_invoker = true);
exception when others then null;  -- an older Postgres: the revoke above is what keeps the view private
end $$;
-- Decks already ranked by rows: count them by people now.
update public.shared_decks d
   set learners = v.learners, copies = v.copies, score = d.stars * 3 + v.learners * 2 + v.copies * 2
  from public.deck_people v
 where v.shared_id = d.id and (d.learners <> v.learners or d.copies <> v.copies);

-- 4. Indexes ---------------------------------------------------------------------------------------------------------
-- Copying a deck's changes for someone who studies it, a page at a time, oldest first (social.mjs sync).
create index if not exists shared_cards_sync on public.shared_cards (shared_id, rev, id);
-- How many suggestions one person has waiting on one deck, and how many reports one person has open.
create index if not exists suggestions_sender on public.suggestions (shared_id, author) where status = 'open';
create index if not exists reports_reporter on public.reports (reporter, status);
-- People search lists listed profiles, most followed first.
create index if not exists profiles_listed on public.profiles (followers desc) where listed;
