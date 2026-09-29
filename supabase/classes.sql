-- Lucida's classes (web/classes.mjs): a study group a teacher can also run. A class has a 6-letter code (its invite
-- link is lucida.cards/class/<code>), the people in it (the owner, helpers the owner picks, and members), the decks the
-- owner and helpers add to it, and assignments (a deck, a goal, a date). Progress is the one thing a class can see of
-- someone's studying, and only when that member turns it on: a few numbers per assignment, never their answers.
-- Also: asking to be verified as a teacher or a school, and reports of decks, profiles and suggestions for the admin
-- page. Like social.sql, only the server's secret key reads and writes these (row level security on, no policies).
-- The columns match web/localrest.mjs, which stands in for these tables on a computer without Supabase.
-- Run after social.sql.

create table if not exists public.classes (
  id text primary key,
  code text not null unique check (code ~ '^[A-Z]{6}$'),
  owner uuid not null references public.profiles on delete cascade,
  name text not null default '',
  school text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.classes is 'Lucida classes (study groups a teacher can run). Server only.';
create index if not exists classes_owner on public.classes (owner);

create table if not exists public.class_members (
  class_id text not null references public.classes on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null default 'member' check (role in ('owner', 'helper', 'member')),
  -- Off until the member turns it on; `asked` is set once they've answered "Share my progress?".
  share_progress boolean not null default false,
  asked boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index if not exists class_members_user on public.class_members (user_id);

-- A deck in a class. A deck can be in several classes; one shared only with classes has visibility 'class' in
-- shared_decks (so only people in those classes see it). shared_decks.class_id isn't used.
create table if not exists public.class_decks (
  class_id text not null references public.classes on delete cascade,
  shared_id text not null references public.shared_decks on delete cascade,
  added_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_id, shared_id)
);
create index if not exists class_decks_deck on public.class_decks (shared_id);

create table if not exists public.assignments (
  id text primary key,
  class_id text not null references public.classes on delete cascade,
  shared_id text not null references public.shared_decks on delete cascade,
  goal text not null default 'learn' check (goal in ('learn', 'daily')),
  due date not null,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists assignments_class on public.assignments (class_id, due);

-- What a member who shares their progress sends when their app syncs: per assignment, how many of its cards they've
-- learned, how many are due, how often they remembered (the last 30 days), and when they last studied it.
create table if not exists public.class_progress (
  assignment_id text not null references public.assignments on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  class_id text not null references public.classes on delete cascade,
  learned int not null default 0,
  total int not null default 0,
  due int not null default 0,
  remembered int,
  last_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);
create index if not exists class_progress_class on public.class_progress (class_id);

create table if not exists public.verify_requests (
  id text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null default 'teacher' check (role in ('teacher', 'school')),
  school text not null default '',
  contact text not null default '',
  status text not null default 'open' check (status in ('open', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text not null default ''
);
create index if not exists verify_requests_open on public.verify_requests (status, created_at);
create index if not exists verify_requests_user on public.verify_requests (user_id, created_at desc);

create table if not exists public.reports (
  id text primary key,
  kind text not null check (kind in ('deck', 'profile', 'suggestion')),
  -- A shared deck's id, a profile's id, or a suggestion's id.
  target text not null,
  target_name text not null default '',
  reason text not null default 'other' check (reason in ('wrong', 'spam', 'stolen', 'other')),
  note text not null default '',
  reporter uuid references public.profiles on delete set null,
  status text not null default 'open' check (status in ('open', 'hidden', 'removed', 'dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists reports_open on public.reports (status, created_at);
create index if not exists reports_target on public.reports (kind, target);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_decks enable row level security;
alter table public.assignments enable row level security;
alter table public.class_progress enable row level security;
alter table public.verify_requests enable row level security;
alter table public.reports enable row level security;
revoke all on public.classes, public.class_members, public.class_decks, public.assignments, public.class_progress, public.verify_requests, public.reports from anon, authenticated;
