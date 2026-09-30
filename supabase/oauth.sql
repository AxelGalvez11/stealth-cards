-- Lucida's sign-in for AI apps (web/oauth.mjs): Claude, ChatGPT and other apps that connect to /mcp sign the person in to
-- Lucida (OAuth 2.1) instead of using a secret link. Four tables: apps that registered themselves, one-time codes, one row
-- for each app a person connected (a grant), and the tokens each grant holds. Tokens are never kept, only their SHA-256
-- hashes. Like the other tables, only the server's secret key reads and writes them: row level security is on and nobody
-- else (anon, signed-in browsers) has a policy. The columns match web/localrest.mjs, which stands in for these tables on a
-- computer without Supabase.
--
-- Safe to run on the live database while the old code is running: it only adds four new tables and their indexes (nothing
-- existing is touched), and every statement can run again. Run it BEFORE deploying the code that uses it.

-- Apps that registered themselves (Dynamic Client Registration, RFC 7591). Apps that use a Client ID Metadata Document (like
-- Claude and ChatGPT) need no row: their address is their id. `used` says whether anyone ever got as far as a code from it,
-- so the ones nobody used can be cleared out after a day.
create table if not exists public.oauth_clients (
  client_id text primary key,
  client_name text not null default '',
  redirect_uris jsonb not null default '[]',
  grant_types jsonb not null default '["authorization_code","refresh_token"]',
  scope text not null default '',
  client_uri text not null default '',
  used boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.oauth_clients is 'AI apps that registered themselves with Lucida (OAuth). Server only.';
create index if not exists oauth_clients_unused on public.oauth_clients (created_at) where not used;

-- The one-time code an app gets after the person says Allow (good for five minutes, and for one try).
create table if not exists public.oauth_codes (
  code_hash text primary key,
  client_id text not null,
  client_name text not null default '',
  client_host text not null default '',
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  scope text not null default '',
  resource text not null default '',
  grant_id text not null,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists oauth_codes_expires_at on public.oauth_codes (expires_at);

-- One row for each app a person connected. Settings → Connect AI lists these, and Disconnect deletes one.
create table if not exists public.oauth_grants (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  client_name text not null default '',
  client_host text not null default '',
  scope text not null default '',
  resource text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists oauth_grants_user on public.oauth_grants (user_id, created_at desc);

-- The hashed access tokens (an hour) and refresh tokens (90 days, each one used once) of a grant.
create table if not exists public.oauth_tokens (
  token_hash text primary key,
  kind text not null check (kind in ('access', 'refresh')),
  grant_id text not null references public.oauth_grants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  scope text not null default '',
  resource text not null default '',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists oauth_tokens_grant on public.oauth_tokens (grant_id);
create index if not exists oauth_tokens_expires_at on public.oauth_tokens (expires_at);

alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;
alter table public.oauth_grants enable row level security;
alter table public.oauth_tokens enable row level security;
revoke all on public.oauth_clients, public.oauth_codes, public.oauth_grants, public.oauth_tokens from anon, authenticated;
