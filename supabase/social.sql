-- Lucida's study network (web/social.mjs): public profiles, shared decks and their cards, every version of a deck,
-- suggestions, follows, saves, who studies what, and news. Like `libraries`, only the server's secret key reads and
-- writes these: row level security is on and nobody else (anon, signed-in browsers) has a policy. The columns match
-- web/localrest.mjs, which stands in for these tables on a computer without Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  name text not null default '',
  bio text not null default '',
  school text not null default '',
  subject text not null default '',
  avatar text,
  color int not null default 0,
  kind text not null default 'person' check (kind in ('person', 'school')),
  verified text not null default '' check (verified in ('', 'teacher', 'school')),
  featured jsonb not null default '[]',
  theme text not null default '',
  followers int not null default 0,
  following int not null default 0,
  contributions int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Lucida public profiles (the study network). Server only.';

create table if not exists public.shared_decks (
  id text primary key,
  owner uuid not null references public.profiles on delete cascade,
  deck_id text not null,
  slug text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  visibility text not null default 'link' check (visibility in ('private', 'link', 'public', 'class')),
  name text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  cover jsonb not null default '{}',
  card_count int not null default 0,
  rev int not null default 1,
  version int not null default 0,
  maintained text not null default 'creator' check (maintained in ('creator', 'community')),
  helpers jsonb not null default '[]',
  contributors jsonb not null default '[]',
  checked jsonb,
  stars int not null default 0,
  learners int not null default 0,
  copies int not null default 0,
  score int not null default 0,
  theme text not null default '',
  class_id text,
  media text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, slug),
  unique (owner, deck_id)
);
comment on table public.shared_decks is 'Decks people share (Link only or Public). Server only.';
create index if not exists shared_decks_listed on public.shared_decks (visibility, score desc, updated_at desc);
create index if not exists shared_decks_new on public.shared_decks (visibility, created_at desc);
create index if not exists shared_decks_tags on public.shared_decks using gin (tags);

create table if not exists public.shared_cards (
  shared_id text not null references public.shared_decks on delete cascade,
  id text not null,
  pos int not null default 0,
  data jsonb not null default '{}',
  deleted boolean not null default false,
  rev int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (shared_id, id)
);
comment on table public.shared_cards is 'The cards of shared decks (content only, never anyone''s schedule). Server only.';
create index if not exists shared_cards_since on public.shared_cards (shared_id, rev);

create table if not exists public.deck_versions (
  id bigint generated always as identity primary key,
  shared_id text not null references public.shared_decks on delete cascade,
  version int not null,
  author uuid references public.profiles on delete set null,
  author_name text not null default '',
  ai text not null default '',
  kind text not null default 'edit',
  summary text not null default '',
  changes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (shared_id, version)
);
comment on table public.deck_versions is 'Every version of a shared deck: who changed what. Server only.';

create table if not exists public.suggestions (
  id text primary key,
  shared_id text not null references public.shared_decks on delete cascade,
  owner uuid not null references public.profiles on delete cascade,
  author uuid references public.profiles on delete cascade,
  author_name text not null default '',
  ai text not null default '',
  message text not null default '',
  changes jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
comment on table public.suggestions is 'Changes people suggest to someone else''s deck. Server only.';
create index if not exists suggestions_owner on public.suggestions (owner, status, created_at desc);
create index if not exists suggestions_deck on public.suggestions (shared_id, status, created_at desc);
create index if not exists suggestions_author on public.suggestions (author, created_at desc);

create table if not exists public.follows (
  follower uuid not null references public.profiles on delete cascade,
  followee uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee on public.follows (followee);

create table if not exists public.stars (
  user_id uuid not null references public.profiles on delete cascade,
  shared_id text not null references public.shared_decks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shared_id)
);
create index if not exists stars_deck on public.stars (shared_id);

create table if not exists public.subscriptions (
  user_id uuid not null references public.profiles on delete cascade,
  shared_id text not null references public.shared_decks on delete cascade,
  deck_id text not null default '',
  mode text not null default 'study' check (mode in ('study', 'copy', 'watch')),
  updates boolean not null default true,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, shared_id, deck_id)
);
create index if not exists subscriptions_deck on public.subscriptions (shared_id, mode);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  actor uuid references public.profiles on delete set null,
  actor_name text not null default '',
  shared_id text references public.shared_decks on delete cascade,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread on public.notifications (user_id) where not read;

alter table public.profiles enable row level security;
alter table public.shared_decks enable row level security;
alter table public.shared_cards enable row level security;
alter table public.deck_versions enable row level security;
alter table public.suggestions enable row level security;
alter table public.follows enable row level security;
alter table public.stars enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
revoke all on public.profiles, public.shared_decks, public.shared_cards, public.deck_versions, public.suggestions, public.follows, public.stars, public.subscriptions, public.notifications from anon, authenticated;

-- Pictures and sound anyone may see: a shared deck's cards and public profile pictures (supa.mjs publicMedia). The
-- server copies them here from the person's private `media` folder.
insert into storage.buckets (id, name, public) values ('shared', 'shared', true) on conflict (id) do nothing;
