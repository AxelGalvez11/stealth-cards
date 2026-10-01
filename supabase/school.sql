-- Lucida's school labels (2026-10-01): finding shared decks by school, level and subject, and a person's school on their profile
-- (what web/social.mjs, web/schools.mjs and web/school.js read and write).
-- Run it on the live database BEFORE deploying that code. It is safe while the old code is still running:
--   * it only adds: nine columns, each with a default the old code never notices, and three indexes;
--   * nothing is dropped, renamed, or emptied, and no old column changes meaning;
--   * every statement can run again (if not exists), so running it once more right after the deploy is fine.
-- The columns match web/localrest.mjs, which stands in for these tables on a computer without Supabase.
-- Run after social.sql and hardening.sql.
--
-- Privacy: nothing here lists people by school. A person's school (profiles.school with school_id) shows only if school_show is on,
-- and it starts off for everyone, including people who typed a school before this: their words stay in the row, hidden, until they
-- switch it on. A deck's school label shows only if its owner kept it.

-- 1. A person's school, level and year -----------------------------------------------------------------------------------
-- profiles.school (already there) holds the school's name. school_id is its id in web/schools.json (the US Department of
-- Education's IPEDS directory), or '' for a school typed as "Other" and for people who haven't picked one. level is
-- highschool, college, graduate, medical or other; a high school student has no school at all, only the level. year is 1 to 5.
alter table public.profiles add column if not exists school_id text not null default '';
alter table public.profiles add column if not exists level text not null default '';
alter table public.profiles add column if not exists year text not null default '';
-- "Show my school on my profile". Off until the person turns it on.
alter table public.profiles add column if not exists school_show boolean not null default false;

-- 2. A public deck's labels ------------------------------------------------------------------------------------------------
-- level (as above), subject (one of the thirty in web/school.js), and the school it's for (id and name). `labeled` says the labels
-- were set up once (the school starts as its owner's, if they show it); a school its owner cleared stays cleared.
alter table public.shared_decks add column if not exists level text not null default '';
alter table public.shared_decks add column if not exists subject text not null default '';
alter table public.shared_decks add column if not exists school_id text not null default '';
alter table public.shared_decks add column if not exists school text not null default '';
alter table public.shared_decks add column if not exists labeled boolean not null default false;

-- 3. Indexes for Discover's filters (public decks, best first) ---------------------------------------------------------------
create index if not exists shared_decks_level on public.shared_decks (level, score desc) where visibility = 'public' and level <> '';
create index if not exists shared_decks_subject on public.shared_decks (subject, score desc) where visibility = 'public' and subject <> '';
create index if not exists shared_decks_school on public.shared_decks (school_id, score desc) where visibility = 'public' and school_id <> '';
