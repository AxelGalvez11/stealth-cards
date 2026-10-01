// Lucida's data online (on Vercel): each person's library is one row in Supabase's `libraries` table (keyed by their
// user id), their pictures and sound are files in their own folder of the private `media` bucket, and sign-in is
// Supabase Auth. Used when SUPABASE_URL and a secret key are set (Vercel gets them from the Supabase integration); on
// your computer the app saves to data/ instead (see store.mjs) and nobody signs in.
// Plain fetch calls to Supabase's REST, Storage, and Auth APIs, so there are still no packages to install.
import { fileURLToPath } from 'node:url';
import { localRest } from './localrest.mjs';
const env = process.env;
const base = () => (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const secret = () => env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
// The public key, for sign-in calls made for a visitor (Supabase's limits then count them like calls from the app).
const publicKey = () => env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || secret();
export const cloud = () => !!(base() && secret());

// New keys (sb_…) go in the apikey header only; older keys are JWTs and also go in Authorization.
const keyHeaders = k => ({ apikey: k, ...(k.startsWith('eyJ') ? { authorization: 'Bearer ' + k } : {}) });
async function call(path, { method = 'GET', headers = {}, body, raw = false, ok404 = false, key = secret() } = {}) {
  const r = await fetch(base() + path, { method, headers: { ...keyHeaders(key), ...headers }, body, signal: AbortSignal.timeout(20000), redirect: 'manual' });
  if (ok404 && (r.status === 404 || r.status === 400)) return null;
  if (!r.ok) { const t = await r.text(); const e = new Error('Supabase ' + r.status + ': ' + t.slice(0, 300)); e.status = r.status; e.body = t; throw e; }
  if (raw) return r;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
const json = { 'content-type': 'application/json' };
const uuid = id => { if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw new Error('Not signed in'); return id; };

export const library = {
  rev: async uid => { const rows = await call('/rest/v1/libraries?id=eq.' + uuid(uid) + '&select=rev'); return rows.length ? rows[0].rev : null; },
  load: async uid => { const rows = await call('/rest/v1/libraries?id=eq.' + uuid(uid) + '&select=state,rev'); return rows[0] || null; },
  // Both return false when another request saved first, so the caller can start over from the newer copy.
  create: async (uid, state) => {
    try { await call('/rest/v1/libraries', { method: 'POST', headers: { ...json, prefer: 'return=minimal' }, body: JSON.stringify({ id: uuid(uid), owner: uid, state, rev: state.rev }) }); return true; }
    catch (e) { if (e.status === 409) return false; throw e; }
  },
  update: async (uid, state, was) => {
    const rows = await call('/rest/v1/libraries?id=eq.' + uuid(uid) + '&rev=eq.' + was, { method: 'PATCH', headers: { ...json, prefer: 'return=representation' },
      body: JSON.stringify({ state, rev: state.rev, updated_at: new Date().toISOString() }) });
    return Array.isArray(rows) && rows.length === 1;
  },
  // Delete account (account.mjs): the whole library goes.
  remove: uid => call('/rest/v1/libraries?id=eq.' + uuid(uid), { method: 'DELETE' })
};

// Each person's files live in a folder named after their user id.
const obj = (uid, name) => '/storage/v1/object/media/' + uuid(uid) + '/' + encodeURIComponent(name);
const listIn = async (uid, search, limit) => (await call('/storage/v1/object/list/media', { method: 'POST', headers: json, body: JSON.stringify({ prefix: uuid(uid) + '/', search, limit }) })) || [];
export const files = {
  put: (uid, name, buf, type) => call(obj(uid, name), { method: 'POST', headers: { 'content-type': type || 'application/octet-stream', 'x-upsert': 'true' }, body: buf }),
  get: async (uid, name) => { const r = await call(obj(uid, name), { raw: true, ok404: true }); return r ? Buffer.from(await r.arrayBuffer()) : null; },
  has: async (uid, name) => (await listIn(uid, name, 5)).some(o => o.name === name),
  // A link that works for an hour, so pictures and sound load straight from storage.
  link: async (uid, name) => {
    const r = await call('/storage/v1/object/sign/media/' + uuid(uid) + '/' + encodeURIComponent(name), { method: 'POST', headers: json, body: JSON.stringify({ expiresIn: 3600 }), ok404: true });
    return r && r.signedURL ? base() + '/storage/v1' + r.signedURL : null;
  },
  clear: async uid => {
    for (let i = 0; i < 50; i++) {
      const names = (await listIn(uid, '', 1000)).map(o => o.name).filter(Boolean);
      if (!names.length) return;
      await call('/storage/v1/object/media', { method: 'DELETE', headers: json, body: JSON.stringify({ prefixes: names.map(n => uid + '/' + n) }) });
    }
  },
  // Making cards from files (blobs.mjs): an address the page can PUT a big file to without going through this server (Vercel takes
  // no request over 4.5 MB), good for two hours; a file moved to its kept name; files deleted; and a person's files by name prefix
  // (with when each was made, so waiting uploads nobody used can be cleared).
  signedUpload: async (uid, name) => {
    const r = await call('/storage/v1/object/upload/sign/media/' + uuid(uid) + '/' + encodeURIComponent(name), { method: 'POST', headers: { ...json, 'x-upsert': 'true' }, body: '{}' });
    const rel = r && (r.url || (r.token ? '/object/upload/sign/media/' + uuid(uid) + '/' + encodeURIComponent(name) + '?token=' + encodeURIComponent(r.token) : ''));
    return rel ? base() + '/storage/v1' + rel : null;
  },
  move: (uid, from, to) => call('/storage/v1/object/move', { method: 'POST', headers: json, body: JSON.stringify({ bucketId: 'media', sourceKey: uuid(uid) + '/' + from, destinationKey: uuid(uid) + '/' + to }) }),
  remove: (uid, names) => call('/storage/v1/object/media', { method: 'DELETE', headers: json, body: JSON.stringify({ prefixes: names.map(n => uuid(uid) + '/' + n) }) }),
  list: (uid, search, limit) => listIn(uid, search, limit)
};

// Sign-in (Supabase Auth): a 6-digit code by email, or an ID token from Google or Apple.
const authCall = (path, body, extra = {}) => call('/auth/v1' + path, { method: body ? 'POST' : 'GET', headers: body ? json : {}, body: body && JSON.stringify(body), key: publicKey(), ...extra });
export const auth = {
  // The email has the 6-digit code; its link (if the email template has one) comes back to /auth/callback in this browser.
  sendCode: (email, redirectTo, challenge) => authCall('/otp?' + new URLSearchParams({ redirect_to: redirectTo }), { email, create_user: true, code_challenge: challenge, code_challenge_method: 's256' }),
  verify: (email, token) => authCall('/verify', { type: 'email', email, token }),
  refresh: refresh_token => authCall('/token?grant_type=refresh_token', { refresh_token }),
  exchange: (auth_code, code_verifier) => authCall('/token?grant_type=pkce', { auth_code, code_verifier }),
  user: token => call('/auth/v1/user', { key: publicKey(), headers: { authorization: 'Bearer ' + token } }),
  signOut: token => call('/auth/v1/logout', { method: 'POST', key: publicKey(), headers: { authorization: 'Bearer ' + token } }),
  // Which ways to sign in are turned on in Supabase (Google and Apple need their own setup there).
  providers: async () => ((await authCall('/settings')) || {}).external || {},
  // Google and Apple (see auth.mjs): their signed ID token, checked by Supabase against the raw nonce it was made for.
  idToken: (provider, id_token, nonce) => authCall('/token?grant_type=id_token', { provider, id_token, nonce }),
  // Apple sends the person's name only the first time, and not in the token, so it's saved to their account.
  setName: (token, name) => call('/auth/v1/user', { method: 'PUT', key: publicKey(), headers: { ...json, authorization: 'Bearer ' + token }, body: JSON.stringify({ data: { full_name: name } }) }),
  // A password, for people who set one (Settings → Account → Password): Supabase's own password sign-in. It gives the same
  // session as a code does. Directory reviewers can't receive an email code, so they sign in this way.
  password: (email, password) => authCall('/token?grant_type=password', { email, password }),
  setPassword: (token, password) => call('/auth/v1/user', { method: 'PUT', key: publicKey(), headers: { ...json, authorization: 'Bearer ' + token }, body: JSON.stringify({ password }) })
};

// Delete account (account.mjs): removing the sign-in account itself, which only this server's secret key can do (Supabase Auth's
// admin API). Its sessions and sign-in methods go with it, and so does everything that points at it with "on delete cascade".
export const admin = {
  deleteUser: uid => call('/auth/v1/admin/users/' + uuid(uid), { method: 'DELETE', headers: json, body: JSON.stringify({ should_soft_delete: false }) })
};

// The study network's tables (social.mjs): profiles, shared decks and their cards, versions, suggestions, follows,
// saves, and news. Online they're Supabase tables only this server's secret key can reach (supabase/social.sql); on
// this computer the same calls go to data/social.json (localrest.mjs). `path` is PostgREST's, like
// "/profiles?handle=eq.alex&select=id,name". Gives back the rows (or null), or with `count` { rows, total }.
let here = null;
const localDb = () => here || (here = localRest(env.STEALTH_DATA || fileURLToPath(new URL('../data/', import.meta.url))));
export async function rest(path, { method = 'GET', body, prefer = '', count = false } = {}) {
  const pref = [prefer, count ? 'count=exact' : ''].filter(Boolean).join(',');
  let status, range, rows;
  if (!cloud()) {
    const r = localDb().call('/rest/v1' + path, { method, headers: { prefer: pref }, body: body == null ? undefined : JSON.stringify(body) });
    rows = r.body; range = r.headers['content-range'] || ''; status = r.status;
  } else {
    const r = await call('/rest/v1' + path, { method, headers: { ...(body == null ? {} : json), ...(pref ? { prefer: pref } : {}) }, body: body == null ? undefined : JSON.stringify(body), raw: true });
    const text = await r.text();
    rows = text ? JSON.parse(text) : null; range = r.headers.get('content-range') || ''; status = r.status;
  }
  if (!count) return rows;
  const total = +(range.split('/')[1] || 0) || 0;
  return { rows: rows || [], total, status };
}
// A value in a PostgREST filter (?handle=eq.<val>). Inside or=(…) and in.(…) a value is quoted instead (qval), so
// commas, dots and parentheses in someone's words can't change the query.
export const val = s => encodeURIComponent(String(s ?? ''));
export const qval = s => { const v = String(s ?? ''); return /^[\w-]+$/.test(v) ? encodeURIComponent(v) : encodeURIComponent('"' + v.replace(/["\\]/g, '\\$&') + '"'); };
export const inList = list => '(' + list.map(qval).join(',') + ')';
// ilike patterns: * is the wildcard; the words someone types can't add their own.
export const like = s => encodeURIComponent('"*' + String(s ?? '').replace(/[*%,()"\\]/g, ' ').replace(/\s+/g, ' ').trim() + '*"');

// Pictures and sound that anyone may see (a shared deck's cards, a public profile picture): copied from the person's
// private folder into the public `shared` bucket, at the same name. On this computer every picture is already served
// to whoever opens the app, so they stay where they are.
export const publicMedia = {
  on: () => cloud(),
  url: (uid, name) => base() + '/storage/v1/object/public/shared/' + uuid(uid) + '/' + encodeURIComponent(name),
  publish: async (uid, name) => {
    try { await call('/storage/v1/object/copy', { method: 'POST', headers: json, body: JSON.stringify({ bucketId: 'media', sourceKey: uuid(uid) + '/' + name, destinationBucket: 'shared', destinationKey: uuid(uid) + '/' + name }) }); }
    catch (e) {
      // Already public (copied before) is fine; anything else falls back to reading it and writing it again.
      if (e.status === 409 || /already exists|Duplicate/i.test(e.body || '')) return publicMedia.url(uid, name);
      const buf = await files.get(uid, name);
      if (!buf) return null;
      await call('/storage/v1/object/shared/' + uuid(uid) + '/' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-upsert': 'true' }, body: buf });
    }
    return publicMedia.url(uid, name);
  },
  // Everything a person made public: "Delete my data" (social.mjs forget) removes their whole folder, like files.clear.
  clear: async uid => {
    for (let i = 0; i < 50; i++) {
      const names = ((await call('/storage/v1/object/list/shared', { method: 'POST', headers: json, body: JSON.stringify({ prefix: uuid(uid) + '/', search: '', limit: 1000 }) })) || []).map(o => o.name).filter(Boolean);
      if (!names.length) return;
      await call('/storage/v1/object/shared', { method: 'DELETE', headers: json, body: JSON.stringify({ prefixes: names.map(n => uuid(uid) + '/' + n) }) });
    }
  }
};

// Lucida Pro (see billing.mjs): one row per Stripe subscription in the private `pro` table. Stripe's webhook writes
// the rows through two database functions (they keep the newest news and never lose who paid); only this server's
// secret key can reach either.
const rpc = (fn, args) => call('/rest/v1/rpc/' + fn, { method: 'POST', headers: json, body: JSON.stringify(args) });
// A value in a PostgREST filter goes in double quotes (an email has dots).
const quoted = s => '"' + String(s).replace(/["\\]/g, '') + '"';
export const pro = {
  checkout: args => rpc('pro_checkout', args),
  status: args => rpc('pro_status', args),
  // Someone's rows: theirs, and any paid with their email before they signed in (nobody's yet).
  of: (uid, email) => call('/rest/v1/pro?select=subscription,user_id,status,plan,period_end,ending&or=' + encodeURIComponent('(user_id.eq.' + uuid(uid) + (email ? ',and(user_id.is.null,email.eq.' + quoted(String(email).toLowerCase()) + ')' : '') + ')')),
  claim: (subscription, uid) => call('/rest/v1/pro?subscription=eq.' + encodeURIComponent(subscription) + '&user_id=is.null', { method: 'PATCH', headers: { ...json, prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uuid(uid) }) }),
  // Delete account (account.mjs): the same rows `of` finds.
  remove: (uid, email) => call('/rest/v1/pro?or=' + encodeURIComponent('(user_id.eq.' + uuid(uid) + (email ? ',and(user_id.is.null,email.eq.' + quoted(String(email).toLowerCase()) + ')' : '') + ')'), { method: 'DELETE' })
};

// Live (rooms.mjs): each game's 6-digit code, a row in the private `live_rooms` table while the game can be joined.
// A code already held by another game that hasn't run out is refused (409), so two games never share one.
const at = t => new Date(t).toISOString();
const code6 = c => { if (!/^\d{6}$/.test(String(c))) throw new Error('No such room'); return c; };
export const rooms = {
  // True when the room is now this host's (false: the code is taken).
  add: async (code, uid, deck, until) => {
    try { await call('/rest/v1/live_rooms', { method: 'POST', headers: { ...json, prefer: 'return=minimal' }, body: JSON.stringify({ code: code6(code), host: uuid(uid), deck, expires_at: at(until) }) }); return true; }
    catch (e) { if (e.status === 409) return false; throw e; }
  },
  // Rooms whose time is up make way for new ones.
  sweep: () => call('/rest/v1/live_rooms?expires_at=lt.' + encodeURIComponent(at(Date.now())), { method: 'DELETE' }),
  renew: async (code, uid, until) => {
    const rows = await call('/rest/v1/live_rooms?code=eq.' + code6(code) + '&host=eq.' + uuid(uid), { method: 'PATCH', headers: { ...json, prefer: 'return=representation' }, body: JSON.stringify({ expires_at: at(until) }) });
    return Array.isArray(rows) && rows.length === 1;
  },
  get: async code => ((await call('/rest/v1/live_rooms?code=eq.' + code6(code) + '&expires_at=gt.' + encodeURIComponent(at(Date.now())) + '&select=deck')) || [])[0] || null,
  remove: (code, uid) => call('/rest/v1/live_rooms?code=eq.' + code6(code) + '&host=eq.' + uuid(uid), { method: 'DELETE' }),
  // Delete account (account.mjs): every room this person hosts.
  clearHost: uid => call('/rest/v1/live_rooms?host=eq.' + uuid(uid), { method: 'DELETE' })
};
// Live's messages go over Supabase Realtime, straight between the host's and the players' browsers, which connect with
// the project's public key. That key is made to be shared (the secret one never leaves this server), so it's Lucida's
// own when none is set. LUCIDA_LIVE_REALTIME (a project URL) tries Realtime from this computer, for testing.
const LUCIDA_URL = 'https://rlifdwvbspbvmeboadzg.supabase.co', LUCIDA_KEY = 'sb_publishable_Lfh1fJfWYj-x_zeZmG6N8g_0BoUf97w';
export function realtime() {
  const url = (base() || env.LUCIDA_LIVE_REALTIME || '').replace(/\/+$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (url === LUCIDA_URL ? LUCIDA_KEY : '');
  return url && key ? { ws: url.replace(/^http/, 'ws') + '/realtime/v1/websocket', rest: url + '/realtime/v1/api/broadcast', key } : null;
}
