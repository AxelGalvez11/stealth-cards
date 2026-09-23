// Lucida's data online (on Vercel): each person's library is one row in Supabase's `libraries` table (keyed by their
// user id), their pictures and sound are files in their own folder of the private `media` bucket, and sign-in is
// Supabase Auth. Used when SUPABASE_URL and a secret key are set (Vercel gets them from the Supabase integration); on
// your computer the app saves to data/ instead (see store.mjs) and nobody signs in.
// Plain fetch calls to Supabase's REST, Storage, and Auth APIs, so there are still no packages to install.
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
  }
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
  }
};

// Sign-in (Supabase Auth): a 6-digit code by email, or Google and Apple through Supabase.
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
  startUrl: (provider, redirectTo, challenge) => base() + '/auth/v1/authorize?' + new URLSearchParams({ provider, redirect_to: redirectTo, code_challenge: challenge, code_challenge_method: 's256' })
};
