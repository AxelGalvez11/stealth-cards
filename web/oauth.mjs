// Signing in for AI apps: an OAuth 2.1 authorization server for Lucida's MCP endpoint (/mcp), so Claude, ChatGPT, Grok,
// Gemini and other apps can connect with a normal sign-in instead of a secret link (the secret links still work; see
// handler.mjs). Claude's and OpenAI's directories ask for this (claude.com/docs/connectors/building/authentication,
// developers.openai.com/apps-sdk/build/auth), and it follows the MCP authorization spec (2025-11-25):
//   /.well-known/oauth-protected-resource      (RFC 9728)  what /mcp is and who signs people in
//   /.well-known/oauth-authorization-server    (RFC 8414)  where the endpoints are and what they support
//   /oauth/register                            (RFC 7591)  apps that register themselves
//   Client ID Metadata Documents: an https client_id whose page says who the app is (Claude and ChatGPT use these)
//   /oauth/authorize                           the person signs in to Lucida as usual and says Allow (the app's own screen
//                                              is a board, ConnectConsent; it asks /api/oauth/request and /api/oauth/decision)
//   /oauth/token                               a code for tokens (PKCE S256), and refresh tokens that work once each
//   /oauth/revoke                              (RFC 7009)  an app ending its own connection
// Tokens are random and opaque; only their SHA-256 hashes are kept (supabase/oauth.sql, the same four tables in
// web/localrest.mjs). Each connected app is a grant, listed in Settings → Connect AI, where the person can disconnect it.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { rest, val, cloud } from './supa.mjs';
import { who, cookies } from './auth.mjs';
import { isDev } from './store.mjs';
import { reach } from './media.mjs';

// What an app may be given. Read tools need the first, everything that adds, changes or deletes needs the second. An app
// that asks for nothing we know gets both; `offline_access` is the usual OpenID word for "keep me signed in".
export const SCOPES = { 'cards:read': 'See your decks, cards and study stats', 'cards:write': 'Add and change your cards and decks' };
export const OFFLINE = 'offline_access';
export const PRODUCTION = 'https://app.lucida.cards';
// How long a code (five minutes), an access token (an hour) and a refresh token (90 days, from the last refresh) last. The
// LUCIDA_CODE_SECS, LUCIDA_ACCESS_SECS and LUCIDA_REFRESH_SECS settings shorten them, for checks that wait for them to run out.
const secs = (name, dflt) => (+process.env[name] > 0 ? +process.env[name] : dflt);
const ACCESS_SECS = () => secs('LUCIDA_ACCESS_SECS', 3600), REFRESH_SECS = () => secs('LUCIDA_REFRESH_SECS', 90 * 86400), CODE_SECS = () => secs('LUCIDA_CODE_SECS', 300), MAX_GRANTS = 10;

const enc = encodeURIComponent;
const rnd = n => randomBytes(n).toString('base64url');
const sha = s => createHash('sha256').update(String(s)).digest('hex');
const iso = ms => new Date(ms).toISOString();
// Text from an app (its name): no control characters, and none that change the direction of the text or hide in it.
const clean = (s, n) => String(s ?? '').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const words = s => [...new Set(String(s || '').split(/\s+/).filter(Boolean))];

// ---------- addresses ----------
// This server's own address as AI apps reach it: https://app.lucida.cards online (the `resource` in the metadata is exactly
// https://app.lucida.cards/mcp), this computer's own address when it runs here. LUCIDA_ORIGIN sets it by hand.
const originOf = req => ((req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || (req.socket.encrypted ? 'https' : 'http')) + '://' + (req.headers['x-forwarded-host'] || req.headers.host);
export const canonical = req => (process.env.LUCIDA_ORIGIN || '').replace(/\/+$/, '') || (cloud() ? PRODUCTION : originOf(req));
export const resourceOf = origin => origin + '/mcp';
export const metadataUrl = origin => origin + '/.well-known/oauth-protected-resource';
// The header that sends an app to sign-in (401) or to ask for more (403). With no token it is only the pointer, as the
// spec's example has it; other cases add what went wrong.
export function challenge(origin, { error = '', description = '', scope = '' } = {}) {
  return 'Bearer resource_metadata="' + metadataUrl(origin) + '"' + (error ? ', error="' + error + '"' : '') + (scope ? ', scope="' + scope + '"' : '') + (description ? ', error_description="' + description.replace(/[^\x20-\x7e]|["\\]/g, ' ') + '"' : '');
}

// Where a web page asking for /mcp may come from: this site, the AI apps' own sites, or an app on this computer. Requests from
// servers (which is how Claude and ChatGPT call) carry no Origin at all. A page from anywhere else is turned away (403), and the
// ones let in may read the answer (`cors`).
const APP_ORIGINS = ['https://claude.ai', 'https://claude.com', 'https://chatgpt.com', 'https://chat.openai.com', 'https://app.lucida.cards', 'https://lucida.cards'];
export function mcpOrigin(req) {
  const o = req.headers.origin;
  if (!o) return { ok: true, cors: null };
  let u; try { u = new URL(o); } catch { return { ok: false, cors: null }; }
  const ok = u.origin !== 'null' && (APP_ORIGINS.includes(u.origin) || (/^https?:$/.test(u.protocol) && LOOPBACK.has(u.hostname)) || u.host === (req.headers['x-forwarded-host'] || req.headers.host));
  return ok ? { ok, cors: { 'access-control-allow-origin': u.origin, vary: 'Origin', 'access-control-expose-headers': 'mcp-session-id, www-authenticate' } } : { ok: false, cors: null };
}

// ---------- the two metadata documents ----------
export const protectedResource = origin => ({
  resource: resourceOf(origin), authorization_servers: [origin], scopes_supported: Object.keys(SCOPES), bearer_methods_supported: ['header'],
  resource_name: 'Lucida', resource_documentation: 'https://lucida.cards/connect', resource_policy_uri: 'https://lucida.cards/privacy', resource_tos_uri: 'https://lucida.cards/terms'
});
export const authorizationServer = origin => ({
  issuer: origin, authorization_endpoint: origin + '/oauth/authorize', token_endpoint: origin + '/oauth/token', registration_endpoint: origin + '/oauth/register', revocation_endpoint: origin + '/oauth/revoke',
  scopes_supported: [...Object.keys(SCOPES), OFFLINE], response_types_supported: ['code'], response_modes_supported: ['query'], grant_types_supported: ['authorization_code', 'refresh_token'],
  token_endpoint_auth_methods_supported: ['none'], revocation_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'],
  client_id_metadata_document_supported: true, authorization_response_iss_parameter_supported: true, service_documentation: 'https://lucida.cards/connect'
});

// ---------- who is asking ----------
const LOCAL_HOST = req => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(req.headers.host || ''));
// The signed-in person, as { id, email, set } (`set`: cookies to send back, from a renewed session), or { id: null } when nobody
// is signed in. On this computer nobody signs in: a made-up person (the lc_dev cookie) or the one local person, 'local'.
export async function personOf(req) {
  if (cloud()) {
    const w = await who(req).catch(() => ({ user: null, set: [] }));
    return w.user ? { id: w.user.id, email: w.user.email || '', set: w.set } : { id: null, set: w.set };
  }
  const n = cookies(req).lc_dev;
  return n && LOCAL_HOST(req) && isDev('dev_' + n) ? { id: 'dev_' + n, email: n + '@dev.local', set: [] } : { id: 'local', email: '', set: [] };
}

// ---------- redirect addresses ----------
// A return address is https, or an app on this same computer (http on localhost, 127.0.0.1 or ::1, any port; RFC 8252).
// Nothing with a fragment or a name and password in it, and no other schemes (an address like myapp:// can be claimed by any
// app on a phone).
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const isLoopback = u => u.protocol === 'http:' && LOOPBACK.has(u.hostname);
export function redirectOk(s) {
  if (typeof s !== 'string' || !s || s.length > 2000 || s.includes('#')) return false;
  let u; try { u = new URL(s); } catch { return false; }
  return !u.username && !u.password && (u.protocol === 'https:' || isLoopback(u));
}
// The address must be one the app listed, letter for letter; an app on this computer may use any port.
export function redirectMatches(listed, want) {
  if (listed.includes(want)) return true;
  let w; try { w = new URL(want); } catch { return false; }
  if (!isLoopback(w)) return false;
  return listed.some(r => { try { const u = new URL(r); return isLoopback(u) && u.hostname === w.hostname && u.pathname === w.pathname && u.search === w.search; } catch { return false; } });
}
const backTo = (uri, params) => { const u = new URL(uri); for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, v); return u.href; };

// ---------- apps ----------
// Claude and ChatGPT publish fixed documents for themselves (their redirects are on their own sites), so these are known here
// without asking the network. Any other https client_id is fetched and checked (cimd below).
const KNOWN_APPS = [
  { test: id => id === 'https://claude.ai/oauth/mcp-oauth-client-metadata', name: 'Claude', redirects: () => ['https://claude.ai/api/mcp/auth_callback', 'https://claude.com/api/mcp/auth_callback'] },
  { test: id => id === 'https://claude.ai/oauth/claude-code-client-metadata', name: 'Claude Code', redirects: () => ['http://localhost/callback', 'http://127.0.0.1/callback'] },
  { test: id => id === 'https://chatgpt.com/oauth/client.json', name: 'ChatGPT', redirects: () => ['https://chatgpt.com/connector_platform_oauth_redirect', 'https://platform.openai.com/apps-manage/oauth'] },
  { test: id => /^https:\/\/chatgpt\.com\/oauth\/[A-Za-z0-9_-]{1,80}\/client\.json$/.test(id), name: 'ChatGPT', redirects: id => ['https://chatgpt.com/connector/oauth/' + id.split('/')[4]] }
];
// Sites whose name can be trusted on the consent screen: what a person sees is the site they go back to.
const KNOWN_HOSTS = [[/^(?:claude\.ai|claude\.com)$/, 'Claude'], [/^(?:chatgpt\.com|chat\.openai\.com|platform\.openai\.com)$/, 'ChatGPT']];
const IMPERSONATES = /claude|chatgpt|openai|anthropic|lucida/i;

const docs = new Map(); // client_id → { doc, until }
async function getDoc(href) {
  const stop = AbortSignal.timeout(5000);
  const res = await reach(new URL(href), stop, { accept: 'application/json' });
  try {
    if (res.statusCode !== 200) throw new Error('status'); // redirects aren't followed
    const parts = []; let n = 0;
    for await (const chunk of res) { n += chunk.length; if (n > 10240) throw new Error('big'); parts.push(chunk); }
    return { json: JSON.parse(Buffer.concat(parts).toString('utf8')), headers: res.headers };
  } finally { res.destroy(); }
}
// An https client_id is the address of a page that says who the app is (draft-ietf-oauth-client-id-metadata-document).
async function cimd(id) {
  let u; try { u = new URL(id); } catch { return null; }
  const path = id.replace(/^https:\/\/[^/?#]*/i, '').split('?')[0];
  if (u.protocol !== 'https:' || u.username || u.password || id.includes('#') || u.pathname.length < 2 || path.split('/').some(s => /^(\.|%2e){1,2}$/i.test(s))) return null;
  const known = KNOWN_APPS.find(k => k.test(id));
  if (known) return { id, name: known.name, redirects: known.redirects(id), kind: 'known', host: u.hostname };
  const hit = docs.get(id);
  if (hit && hit.until > Date.now()) return hit.client;
  let got; try { got = await getDoc(id); } catch { return null; }
  const d = got.json;
  // The page's own client_id must be its address, it lists return addresses, and it can't hold a secret.
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.client_id !== id) return null;
  const uris = Array.isArray(d.redirect_uris) ? d.redirect_uris : [];
  if (!uris.length || uris.length > 10 || !uris.every(redirectOk)) return null;
  if ('client_secret' in d || 'client_secret_expires_at' in d || /^client_secret_/.test(String(d.token_endpoint_auth_method || ''))) return null;
  const client = { id, name: clean(d.client_name, 100), redirects: uris, kind: 'cimd', host: u.hostname };
  // Kept as long as the page says (an hour when it says nothing), between a minute and a day; a page that failed the checks isn't kept.
  const age = /max-age=(\d+)/.exec(String(got.headers['cache-control'] || '')), secs = /no-store|no-cache/.test(String(got.headers['cache-control'] || '')) ? 60 : age ? +age[1] : 3600;
  if (docs.size > 500) docs.clear();
  docs.set(id, { client, until: Date.now() + Math.min(86400, Math.max(60, secs)) * 1000 });
  return client;
}
async function findClient(id) {
  if (typeof id !== 'string' || !id || id.length > 2000) return null;
  if (id.startsWith('https://')) return cimd(id);
  const rows = await rest('/oauth_clients?client_id=eq.' + val(id) + '&select=client_id,client_name,redirect_uris,client_uri').catch(() => null);
  const r = rows && rows[0];
  return r ? { id: r.client_id, name: r.client_name, redirects: Array.isArray(r.redirect_uris) ? r.redirect_uris : [], kind: 'registered', host: '' } : null;
}

// Apps that register themselves (RFC 7591): https or this-computer return addresses, a name, nothing else needed. They are
// all public clients (PKCE, no secret).
async function register(body, res) {
  let b; try { b = JSON.parse(body || '{}'); } catch { return oauthError(res, 400, 'invalid_client_metadata', 'The request has to be JSON.'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return oauthError(res, 400, 'invalid_client_metadata', 'The request has to be a JSON object.');
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || !uris.length || uris.length > 10 || !uris.every(redirectOk)) return oauthError(res, 400, 'invalid_redirect_uri', 'redirect_uris needs one to ten https addresses (or http://localhost or 127.0.0.1 for an app on this computer).');
  const grants = b.grant_types === undefined ? ['authorization_code'] : Array.isArray(b.grant_types) ? b.grant_types.filter(g => ['authorization_code', 'refresh_token'].includes(g)) : [];
  if (!grants.length || (b.response_types !== undefined && !(Array.isArray(b.response_types) && b.response_types.includes('code')))) return oauthError(res, 400, 'invalid_client_metadata', 'Only the authorization_code and refresh_token grants with response type code are supported.');
  const scope = words(b.scope).filter(s => s in SCOPES || s === OFFLINE).join(' ');
  const row = { client_id: 'lcc_' + rnd(18), client_name: clean(b.client_name, 100) || 'MCP app', redirect_uris: uris, grant_types: grants, scope, client_uri: /^https:\/\//.test(String(b.client_uri || '')) ? clean(b.client_uri, 500) : '' };
  await rest('/oauth_clients', { method: 'POST', body: row, prefer: 'return=minimal' });
  if (Math.random() < 0.05) sweep();
  return json(res, 201, { client_id: row.client_id, client_id_issued_at: Math.floor(Date.now() / 1000), client_name: row.client_name, redirect_uris: uris, grant_types: grants, response_types: ['code'], token_endpoint_auth_method: 'none', ...(scope ? { scope } : {}) }, CORS);
}

// ---------- the consent ----------
const hostOf = u => u.hostname.replace(/^\[|\]$/g, '');
// What the person is asked: the app's name (a known site's own name, else what the app calls itself unless it is wearing
// someone else's name), where they'll go back to, and what it will be able to do.
function describe(client, redirect, scopes) {
  const r = new URL(redirect), host = hostOf(r), local = isLoopback(r);
  const site = KNOWN_HOSTS.find(([re]) => re.test(r.hostname));
  const own = client.kind === 'known' ? client.name : '';
  const said = clean(client.name, 40), name = own || (site && site[1]) || (said && !IMPERSONATES.test(said) ? said : '') || (local ? 'An app on your computer' : host);
  return { app: name, host, loopback: local, verified: !!(own || site), permissions: scopes.filter(s => s in SCOPES).map(s => SCOPES[s]) };
}
export function scopesFor(asked) {
  const want = words(asked), known = want.filter(s => s in SCOPES);
  return [...(known.length ? known : Object.keys(SCOPES)), ...(want.includes(OFFLINE) ? [OFFLINE] : [])];
}
const resourceOk = (list, origin) => list.every(x => { try { const u = new URL(x); return !u.hash && u.origin + u.pathname.replace(/\/+$/, '') === resourceOf(origin); } catch { return false; } });

// One authorization request, read the same way for showing the consent and for acting on it. The answer is one of:
//   { error }  the app or its return address can't be trusted, so nobody is sent anywhere (the person is told)
//   { back }   the request is wrong in a way the app should hear about: where to send the person, with the error
//   { ok, … }  good to ask (`deny` makes the answer for Cancel)
async function check(q, origin) {
  const client = await findClient(q.get('client_id'));
  if (!client) return { error: 'Lucida doesn’t know the app that sent you here.' };
  const redirect = q.get('redirect_uri') || '';
  if (!redirectOk(redirect) || !redirectMatches(client.redirects, redirect)) return { error: 'That app’s return address isn’t one it gave Lucida.' };
  const state = (q.get('state') || '').slice(0, 4000);
  const back = (error, description) => ({ back: backTo(redirect, { error, error_description: description, state, iss: origin }) });
  if (q.get('response_type') !== 'code') return back('unsupported_response_type', 'Only response_type=code works here.');
  const challenge = q.get('code_challenge') || '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge) || q.get('code_challenge_method') !== 'S256') return back('invalid_request', 'Send a PKCE code_challenge with code_challenge_method=S256.');
  if (!resourceOk(q.getAll('resource'), origin)) return back('invalid_target', 'That isn’t a resource Lucida serves.');
  const scopes = scopesFor(q.get('scope'));
  return { ok: true, client, redirect, state, challenge, scopes, deny: back, ...describe(client, redirect, scopes) };
}

// ---------- codes and tokens ----------
const now = () => Date.now();
async function issueCode(r, person, origin) {
  const code = 'lco_' + rnd(24);
  await rest('/oauth_codes', { method: 'POST', prefer: 'return=minimal', body: { code_hash: sha(code), client_id: r.client.id, client_name: clean(r.app, 100), client_host: r.client.host || r.host, user_id: person, redirect_uri: r.redirect,
    code_challenge: r.challenge, scope: r.scopes.join(' '), resource: resourceOf(origin), grant_id: 'g' + rnd(12), expires_at: iso(now() + CODE_SECS() * 1000) } });
  if (r.client.kind === 'registered') rest('/oauth_clients?client_id=eq.' + val(r.client.id), { method: 'PATCH', body: { used: true } }).catch(() => {});
  return code;
}
const pkceOk = (verifier, challenge) => {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(String(verifier || ''))) return false;
  const a = Buffer.from(createHash('sha256').update(verifier).digest('base64url')), b = Buffer.from(String(challenge));
  return a.length === b.length && timingSafeEqual(a, b);
};
class Fail extends Error { constructor(code, description, status = 400) { super(description); this.code = code; this.status = status; } }

// Tokens for a grant: an hour for the access token, 90 days for the refresh token (which works once; the next refresh makes a new one).
async function mint(g) {
  const access = 'lat_' + rnd(32), refresh = 'lrt_' + rnd(32), t = now(), base = { grant_id: g.id, user_id: g.user_id, client_id: g.client_id, scope: g.scope, resource: g.resource };
  await rest('/oauth_tokens', { method: 'POST', prefer: 'return=minimal', body: [{ ...base, token_hash: sha(access), kind: 'access', expires_at: iso(t + ACCESS_SECS() * 1000) }, { ...base, token_hash: sha(refresh), kind: 'refresh', expires_at: iso(t + REFRESH_SECS() * 1000) }] });
  return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_SECS(), refresh_token: refresh, scope: g.scope };
}
async function revokeGrant(id, user) {
  const mine = user ? '&user_id=eq.' + val(user) : '';
  await rest('/oauth_tokens?grant_id=eq.' + val(id) + mine, { method: 'DELETE' });
  const gone = await rest('/oauth_grants?id=eq.' + val(id) + mine, { method: 'DELETE', prefer: 'return=representation' });
  return Array.isArray(gone) && gone.length > 0;
}
async function sweep() {
  const t = enc(iso(now()));
  await Promise.all([rest('/oauth_tokens?expires_at=lt.' + t, { method: 'DELETE' }), rest('/oauth_codes?expires_at=lt.' + enc(iso(now() - 3600e3)), { method: 'DELETE' }),
    rest('/oauth_grants?last_used_at=lt.' + enc(iso(now() - 91 * 86400e3)), { method: 'DELETE' }), rest('/oauth_clients?used=eq.false&created_at=lt.' + enc(iso(now() - 86400e3)), { method: 'DELETE' })]).catch(() => {});
}

async function codeGrant(p, origin) {
  const h = sha(p.code || '');
  const took = await rest('/oauth_codes?code_hash=eq.' + h + '&used=eq.false&expires_at=gt.' + enc(iso(now())), { method: 'PATCH', body: { used: true }, prefer: 'return=representation' });
  const c = took && took[0];
  if (!c) {
    // A code that comes back a second time was stolen or replayed: what it already made stops working.
    const seen = await rest('/oauth_codes?code_hash=eq.' + h + '&select=grant_id,used');
    if (seen && seen[0] && seen[0].used) await revokeGrant(seen[0].grant_id).catch(() => {});
    throw new Fail('invalid_grant', 'That code was already used, or it has run out. Start again from the app.');
  }
  if (p.client_id && p.client_id !== c.client_id) throw new Fail('invalid_grant', 'That code was given to a different app.');
  if (p.redirect_uri !== c.redirect_uri) throw new Fail('invalid_grant', 'redirect_uri isn’t the one the code was made for.');
  if (!pkceOk(p.code_verifier, c.code_challenge)) throw new Fail('invalid_grant', 'The code_verifier doesn’t match the code_challenge.');
  if (p.resources.length && !resourceOk(p.resources, origin)) throw new Fail('invalid_target', 'That isn’t a resource Lucida serves.');
  const g = { id: c.grant_id, user_id: c.user_id, client_id: c.client_id, client_name: c.client_name, client_host: c.client_host, scope: c.scope, resource: c.resource };
  await rest('/oauth_grants', { method: 'POST', prefer: 'return=minimal', body: g });
  // A person keeps ten connected apps; the one used longest ago makes room.
  const all = await rest('/oauth_grants?user_id=eq.' + val(g.user_id) + '&select=id&order=last_used_at.desc');
  for (const old of (all || []).slice(MAX_GRANTS)) await revokeGrant(old.id, g.user_id).catch(() => {});
  if (Math.random() < 0.05) sweep();
  return mint(g);
}
async function refreshGrant(p) {
  const h = sha(p.refresh_token || ''), live = '&kind=eq.refresh&expires_at=gt.' + enc(iso(now()));
  // Look first, so a wrong app or a request for too much doesn't use the token up; then take it (only one request can).
  const seen = await rest('/oauth_tokens?token_hash=eq.' + h + live + '&select=grant_id,client_id,scope');
  const t = seen && seen[0];
  if (!t) throw new Fail('invalid_grant', 'That refresh token doesn’t work anymore. Connect the app again.');
  if (p.client_id && p.client_id !== t.client_id) throw new Fail('invalid_grant', 'That refresh token was given to a different app.');
  // Asking for less is fine; asking for more isn't.
  const have = words(t.scope), want = p.scope === undefined ? have : words(p.scope);
  if (want.some(s => !have.includes(s))) throw new Fail('invalid_scope', 'That is more than the app was allowed.');
  const took = await rest('/oauth_tokens?token_hash=eq.' + h + live, { method: 'DELETE', prefer: 'return=representation' });
  if (!took || !took[0]) throw new Fail('invalid_grant', 'That refresh token doesn’t work anymore. Connect the app again.');
  const g = await rest('/oauth_grants?id=eq.' + val(t.grant_id) + '&select=id,user_id,client_id,scope,resource');
  if (!g || !g[0]) throw new Fail('invalid_grant', 'That connection was ended. Connect the app again.');
  await rest('/oauth_grants?id=eq.' + val(t.grant_id), { method: 'PATCH', body: { last_used_at: iso(now()) } }).catch(() => {});
  return mint({ ...g[0], scope: want.join(' ') || g[0].scope });
}

// An access token for /mcp: who it is for, the apps' scopes, and which connection it belongs to. Null when it isn't one of ours, has run
// out, was ended (Disconnect), or was made for another address.
export async function verify(token, origin) {
  if (!/^lat_[A-Za-z0-9_-]{43}$/.test(String(token || ''))) return null;
  const rows = await rest('/oauth_tokens?token_hash=eq.' + sha(token) + '&kind=eq.access&select=grant_id,user_id,client_id,scope,resource,expires_at');
  const t = rows && rows[0];
  if (!t || Date.parse(t.expires_at) <= now() || t.resource !== resourceOf(origin)) return null;
  return { uid: t.user_id, grantId: t.grant_id, clientId: t.client_id, scopes: new Set(words(t.scope)) };
}
// The apps a person connected, newest first (Settings → Connect AI), and ending one. Everything an app holds goes with it.
export async function apps(uid) {
  const rows = await rest('/oauth_grants?user_id=eq.' + val(uid) + '&select=id,client_name,client_host,scope,created_at,last_used_at&order=created_at.desc');
  return (rows || []).map(g => ({ id: g.id, name: g.client_name || g.client_host, host: g.client_host, canChange: words(g.scope).includes('cards:write'), connected: g.created_at, lastUsed: g.last_used_at }));
}
export const disconnect = (uid, id) => revokeGrant(String(id || ''), uid);
// Everything a person's connections hold (used when an account is deleted).
export async function forget(uid) {
  await rest('/oauth_tokens?user_id=eq.' + val(uid), { method: 'DELETE' });
  await rest('/oauth_codes?user_id=eq.' + val(uid), { method: 'DELETE' });
  await rest('/oauth_grants?user_id=eq.' + val(uid), { method: 'DELETE' });
}

// ---------- answering ----------
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization, mcp-protocol-version', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-max-age': '600' };
const json = (res, code, body, extra = {}) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra }); res.end(JSON.stringify(body)); };
const oauthError = (res, status, error, description, extra = {}) => json(res, status, { error, error_description: description }, { pragma: 'no-cache', ...CORS, ...extra });
const formOf = (raw, type) => {
  if (/json/i.test(type)) { try { const o = JSON.parse(raw); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } }
  const f = new URLSearchParams(raw), o = Object.fromEntries(f); o.resources = f.getAll('resource'); return o;
};

async function token(req, res, origin, readBody) {
  let raw; try { raw = String(await readBody(req, 20000)); } catch { return oauthError(res, 400, 'invalid_request', 'The request is too big.'); }
  const p = formOf(raw, req.headers['content-type'] || '');
  for (const k of ['grant_type', 'code', 'redirect_uri', 'code_verifier', 'client_id', 'refresh_token']) if (p[k] !== undefined) p[k] = String(p[k]);
  if (p.scope !== undefined) p.scope = String(p.scope);
  p.resources = Array.isArray(p.resources) ? p.resources : p.resource ? [String(p.resource)] : [];
  // An app that sends its id in a Basic header (and no secret that matters) is read the same way.
  const basic = /^Basic ([A-Za-z0-9+/=]+)$/.exec(req.headers.authorization || '');
  if (!p.client_id && basic) { try { p.client_id = decodeURIComponent(Buffer.from(basic[1], 'base64').toString().split(':')[0]); } catch { /* no id */ } }
  try {
    if (p.grant_type === 'authorization_code') return json(res, 200, await codeGrant(p, origin), { pragma: 'no-cache', ...CORS });
    if (p.grant_type === 'refresh_token') return json(res, 200, await refreshGrant(p), { pragma: 'no-cache', ...CORS });
    return oauthError(res, 400, 'unsupported_grant_type', 'Use authorization_code or refresh_token.');
  } catch (e) {
    if (e instanceof Fail) return oauthError(res, e.status, e.code, e.message);
    console.error('oauth token', e);
    return oauthError(res, 500, 'server_error', 'Something went wrong. Try again.');
  }
}
async function revoke(req, res, readBody) {
  let raw; try { raw = String(await readBody(req, 20000)); } catch { return oauthError(res, 400, 'invalid_request', 'The request is too big.'); }
  const p = formOf(raw, req.headers['content-type'] || ''), t = String(p.token || '');
  if (/^l[ar]t_[A-Za-z0-9_-]{43}$/.test(t)) {
    const rows = await rest('/oauth_tokens?token_hash=eq.' + sha(t) + '&select=grant_id,client_id');
    const row = rows && rows[0];
    if (row && (!p.client_id || p.client_id === row.client_id)) await revokeGrant(row.grant_id);
  }
  // Whether or not it was one of ours, the answer is the same (RFC 7009).
  res.writeHead(200, { 'cache-control': 'no-store', ...CORS }); res.end();
}

// The routes an AI app calls. True when it answered (handler.mjs serves the consent page itself).
export async function route(req, res, path, { readBody }) {
  const origin = canonical(req);
  if (req.method === 'OPTIONS' && (path.startsWith('/oauth/') || path.startsWith('/.well-known/'))) { res.writeHead(204, CORS); res.end(); return true; }
  const m = req.method === 'GET' || req.method === 'HEAD';
  if (m && /^\/\.well-known\/oauth-protected-resource(\/mcp\/?)?$/.test(path)) { json(res, 200, protectedResource(origin), { ...CORS, 'cache-control': 'public, max-age=300' }); return true; }
  if (m && path === '/.well-known/oauth-authorization-server') { json(res, 200, authorizationServer(origin), { ...CORS, 'cache-control': 'public, max-age=300' }); return true; }
  if (req.method === 'POST' && path === '/oauth/register') {
    let raw; try { raw = String(await readBody(req, 20000)); } catch { oauthError(res, 400, 'invalid_client_metadata', 'The request is too big.'); return true; }
    await register(raw, res); return true;
  }
  if (req.method === 'POST' && path === '/oauth/token') { await token(req, res, origin, readBody); return true; }
  if (req.method === 'POST' && path === '/oauth/revoke') { await revoke(req, res, readBody); return true; }
  return false;
}

// What the app's own screens ask (the ConnectConsent board, and Settings → Connect AI). `uid` is the signed-in person.
export async function api(req, res, path, body, { uid, email }) {
  const origin = canonical(req);
  if (path === '/api/oauth/request' && req.method === 'GET') {
    const r = await check(new URL(req.url, 'http://x').searchParams, origin);
    if (r.error) return json(res, 400, { error: r.error });
    if (r.back) return json(res, 200, { redirect: r.back });
    return json(res, 200, { app: r.app, host: r.host, loopback: r.loopback, verified: r.verified, permissions: r.permissions, email });
  }
  if (path === '/api/oauth/decision' && req.method === 'POST') {
    // Only this site's own page may ask: a JSON body can't come from another site's form, and the browser says where it came from.
    const site = req.headers['sec-fetch-site'];
    if (!/json/i.test(String(req.headers['content-type'] || '')) || (site && site !== 'same-origin')) return json(res, 403, { error: 'Forbidden' });
    let b; try { b = JSON.parse(String(body || '{}')) || {}; } catch { b = {}; }
    const r = await check(new URLSearchParams(String(b.query || '')), origin);
    if (r.error) return json(res, 400, { error: r.error });
    if (r.back) return json(res, 200, { redirect: r.back });
    if (b.allow !== true) return json(res, 200, { redirect: r.deny('access_denied', 'The person said no.').back });
    return json(res, 200, { redirect: backTo(r.redirect, { code: await issueCode(r, uid, origin), state: r.state, iss: origin }) });
  }
  if (path === '/api/oauth/apps' && req.method === 'GET') return json(res, 200, { apps: await apps(uid) });
  if (path === '/api/oauth/disconnect' && req.method === 'POST') {
    let b; try { b = JSON.parse(String(body || '{}')) || {}; } catch { b = {}; }
    return json(res, 200, { ok: await disconnect(uid, b.id), apps: await apps(uid) });
  }
  return json(res, 404, { error: 'Not found' });
}
