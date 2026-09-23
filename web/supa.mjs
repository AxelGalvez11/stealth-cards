// Lucida's data online (on Vercel): the library is one row in Supabase's `libraries` table, and pictures and
// sound are files in the private `media` bucket. Used when SUPABASE_URL and a secret key are set (Vercel gets
// them from the Supabase integration); on your computer the app saves to data/ instead (see store.mjs).
// Plain fetch calls to Supabase's REST and Storage APIs, so there are still no packages to install.
const env = process.env;
const base = () => (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const secret = () => env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
export const cloud = () => !!(base() && secret());

// New secret keys (sb_secret_…) go in the apikey header only; older service-role keys are JWTs and also go in Authorization.
const auth = () => { const k = secret(); return { apikey: k, ...(k.startsWith('eyJ') ? { authorization: 'Bearer ' + k } : {}) }; };
async function call(path, { method = 'GET', headers = {}, body, raw = false, ok404 = false } = {}) {
  const r = await fetch(base() + path, { method, headers: { ...auth(), ...headers }, body, signal: AbortSignal.timeout(20000) });
  if (ok404 && (r.status === 404 || r.status === 400)) return null;
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200));
  if (raw) return r;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
const json = { 'content-type': 'application/json' };
// One library for now; with sign-in, each person gets their own row.
const LIB = 'main';

export const library = {
  rev: async () => { const rows = await call('/rest/v1/libraries?id=eq.' + LIB + '&select=rev'); return rows.length ? rows[0].rev : null; },
  load: async () => { const rows = await call('/rest/v1/libraries?id=eq.' + LIB + '&select=state,rev'); return rows[0] || null; },
  // Both return false when someone else saved first, so the caller can start over from the newer copy.
  create: async state => {
    try { await call('/rest/v1/libraries', { method: 'POST', headers: { ...json, prefer: 'return=minimal' }, body: JSON.stringify({ id: LIB, state, rev: state.rev }) }); return true; }
    catch (e) { if (/Supabase 409/.test(e.message)) return false; throw e; }
  },
  update: async (state, was) => {
    const rows = await call('/rest/v1/libraries?id=eq.' + LIB + '&rev=eq.' + was, { method: 'PATCH', headers: { ...json, prefer: 'return=representation' },
      body: JSON.stringify({ state, rev: state.rev, updated_at: new Date().toISOString() }) });
    return Array.isArray(rows) && rows.length === 1;
  }
};

const obj = name => '/storage/v1/object/media/' + encodeURIComponent(name);
export const files = {
  put: (name, buf, type) => call(obj(name), { method: 'POST', headers: { 'content-type': type || 'application/octet-stream', 'x-upsert': 'true' }, body: buf }),
  get: async name => { const r = await call(obj(name), { raw: true, ok404: true }); return r ? Buffer.from(await r.arrayBuffer()) : null; },
  has: async name => {
    const rows = await call('/storage/v1/object/list/media', { method: 'POST', headers: json, body: JSON.stringify({ prefix: '', search: name, limit: 5 }) });
    return (rows || []).some(o => o.name === name);
  },
  // A link that works for an hour, so pictures and sound load straight from storage.
  link: async name => { const r = await call('/storage/v1/object/sign/media/' + encodeURIComponent(name), { method: 'POST', headers: json, body: JSON.stringify({ expiresIn: 3600 }), ok404: true }); return r && r.signedURL ? base() + '/storage/v1' + r.signedURL : null; },
  clear: async () => {
    for (let i = 0; i < 50; i++) {
      const rows = await call('/storage/v1/object/list/media', { method: 'POST', headers: json, body: JSON.stringify({ prefix: '', limit: 1000 }) });
      const names = (rows || []).map(o => o.name).filter(Boolean);
      if (!names.length) return;
      await call('/storage/v1/object/media', { method: 'DELETE', headers: json, body: JSON.stringify({ prefixes: names }) });
    }
  }
};
