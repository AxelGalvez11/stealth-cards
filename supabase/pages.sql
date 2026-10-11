-- Pages (web/pages.mjs): what a deck or a folder holds beside its cards, each of a kind (a Note, a Presentation, a Mind map,
-- a Diagram, a Canvas, a Doc), written by its owner in the app or by their AI app over MCP. Each save is a new version
-- (page_versions keeps them, so any one can be restored), and a save names the version it was made from: one made from an
-- older version is refused (web/pages.mjs `update`), so two writers never overwrite each other unseen.
-- A page lives here, not inside the person's library (`libraries.state`), so the library the app reloads every few seconds
-- stays small however big the pages get. Like the study network's tables, only the server's secret key reads and writes
-- these. The columns match web/localrest.mjs, which stands in for them on a computer without Supabase.

create table if not exists public.pages (
  id text primary key check (id ~ '^p[a-z0-9]{6,24}$'),
  owner uuid not null references auth.users on delete cascade,
  scope text not null check (scope in ('deck', 'folder')),
  scope_id text not null,
  parent text not null default '',
  pos double precision not null default 0,
  kind text not null check (kind in ('note', 'slides', 'mindmap', 'diagram', 'canvas', 'doc')),
  title text not null default '' check (char_length(title) <= 200),
  data jsonb not null default '{}',
  size int not null default 0,
  version int not null default 1,
  updated_by text not null default '',
  updated_ai boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.pages is 'Lucida pages beside a deck''s or folder''s cards (web/pages.mjs). Server only.';
create index if not exists pages_scope on public.pages (owner, scope, scope_id) where not deleted;
create index if not exists pages_recent on public.pages (owner, updated_at desc);

create table if not exists public.page_versions (
  page_id text not null references public.pages on delete cascade,
  version int not null,
  owner uuid not null references auth.users on delete cascade,
  title text not null default '',
  data jsonb not null default '{}',
  author text not null default '',
  ai boolean not null default false,
  summary text not null default '' check (char_length(summary) <= 300),
  created_at timestamptz not null default now(),
  primary key (page_id, version)
);
comment on table public.page_versions is 'Every saved version of a Lucida page (web/pages.mjs). Server only.';

alter table public.pages enable row level security;
alter table public.page_versions enable row level security;
revoke all on public.pages, public.page_versions from anon, authenticated;
