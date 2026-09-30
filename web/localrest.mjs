// On this computer there's no Supabase, so the study network's tables (profiles, shared decks, versions, suggestions,
// follows, saves, and news, see social.mjs; classes, verification and reports, see classes.mjs) live in data/social.json,
// and this answers the same calls Supabase's REST API (PostgREST) would: the same paths, filters, and headers. So
// social.mjs runs unchanged here and online. It knows
// only what social.mjs asks, and says so when asked anything else, so nothing works here that wouldn't online.
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Each table's key (and other unique columns), and the columns the database fills in itself (supabase/social.sql).
const now = () => new Date().toISOString();
export const TABLES = {
  // `listed`: whether the profile shows in search (a profile made just by studying, following, saving... stays unlisted until its
  // person edits it or shares a deck publicly). supabase/hardening.sql adds it, and the two columns below.
  profiles: { key: ['id'], unique: [['handle']], defaults: () => ({ name: '', bio: '', school: '', subject: '', avatar: null, color: 0, kind: 'person', verified: '', featured: [], theme: '', followers: 0, following: 0, contributions: 0, listed: false, created_at: now(), updated_at: now() }) },
  shared_decks: { key: ['id'], unique: [['owner', 'slug'], ['owner', 'deck_id']], defaults: () => ({ visibility: 'link', name: '', description: '', tags: [], cover: {}, card_count: 0, rev: 1, version: 0, maintained: 'creator', helpers: [], contributors: [], checked: null, stars: 0, learners: 0, copies: 0, score: 0, theme: '', class_id: null, media: [], hidden: false, created_at: now(), updated_at: now() }) },
  shared_cards: { key: ['shared_id', 'id'], defaults: () => ({ pos: 0, data: {}, deleted: false, rev: 1, updated_at: now() }) },
  deck_versions: { key: ['id'], serial: 'id', unique: [['shared_id', 'version']], defaults: () => ({ author: null, author_name: '', ai: '', kind: 'edit', summary: '', changes: [], n_changes: 0, created_at: now() }) },
  suggestions: { key: ['id'], defaults: () => ({ author: null, author_name: '', ai: '', message: '', changes: [], status: 'open', created_at: now(), decided_at: null }) },
  follows: { key: ['follower', 'followee'], defaults: () => ({ created_at: now() }) },
  stars: { key: ['user_id', 'shared_id'], defaults: () => ({ created_at: now() }) },
  subscriptions: { key: ['user_id', 'shared_id', 'deck_id'], defaults: () => ({ mode: 'study', updates: true, last_seen: now(), created_at: now() }) },
  card_stats: { key: ['shared_id', 'user_id', 'card_id'], defaults: () => ({ reviews: 0, misses: 0, updated_at: now() }) },
  notifications: { key: ['id'], serial: 'id', defaults: () => ({ actor: null, actor_name: '', shared_id: null, data: {}, read: false, created_at: now() }) },
  // Classes, verification, and reports (classes.mjs, supabase/classes.sql). Nothing here deletes in a chain the way
  // Supabase's "on delete cascade" does, so classes.mjs deletes a class's rows itself.
  classes: { key: ['id'], unique: [['code']], defaults: () => ({ name: '', school: '', created_at: now(), updated_at: now() }) },
  class_members: { key: ['class_id', 'user_id'], defaults: () => ({ role: 'member', share_progress: false, asked: false, joined_at: now() }) },
  class_decks: { key: ['class_id', 'shared_id'], defaults: () => ({ added_by: null, created_at: now() }) },
  assignments: { key: ['id'], defaults: () => ({ goal: 'learn', created_by: null, created_at: now() }) },
  class_progress: { key: ['assignment_id', 'user_id'], defaults: () => ({ learned: 0, total: 0, due: 0, remembered: null, last_at: null, updated_at: now() }) },
  verify_requests: { key: ['id'], defaults: () => ({ role: 'teacher', school: '', contact: '', status: 'open', created_at: now(), decided_at: null, decided_by: '' }) },
  reports: { key: ['id'], defaults: () => ({ target_name: '', reason: 'other', note: '', reporter: null, status: 'open', created_at: now(), decided_at: null }) },
  // A view (supabase/hardening.sql deck_people), read only: how many different people study or copy each shared deck. A person
  // who copies a deck 25 times is one person.
  deck_people: { key: ['shared_id'], view: db => {
    const by = new Map();
    for (const s of db.subscriptions) {
      if (s.mode !== 'study' && s.mode !== 'copy') continue;
      const e = by.get(s.shared_id) || { shared_id: s.shared_id, study: new Set(), copy: new Set() };
      e[s.mode].add(s.user_id); by.set(s.shared_id, e);
    }
    return [...by.values()].map(e => ({ shared_id: e.shared_id, learners: e.study.size, copies: e.copy.size }));
  } }
};

const fail = (status, message) => Object.assign(new Error('Supabase ' + status + ': ' + message), { status, body: JSON.stringify({ message }) });

// Splits "a,b(c,d),'e,f'" at its top-level commas.
function splitTop(s) {
  const out = []; let depth = 0, quote = false, cur = '';
  for (const ch of s) {
    if (ch === '"') quote = !quote;
    if (!quote && (ch === '(' || ch === '{')) depth++;
    if (!quote && (ch === ')' || ch === '}')) depth--;
    if (ch === ',' && !depth && !quote) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const unquote = v => (v.length > 1 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\(["\\])/g, '$1') : v);
const likeRe = (pat, flags) => new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*') + '$', flags);
const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
const num = v => (v !== '' && !isNaN(+v) ? +v : v);

// One condition, like "handle=eq.alex" or, inside or=(…), "name.ilike.*bio*".
function test(row, col, expr) {
  let neg = false;
  if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4); }
  const dot = expr.indexOf('.'), op = expr.slice(0, dot), raw = expr.slice(dot + 1), v = row[col];
  let ok;
  switch (op) {
    case 'eq': ok = v != null && String(v) === unquote(raw); break;
    case 'neq': ok = v == null || String(v) !== unquote(raw); break;
    case 'gt': ok = v != null && cmp(v, num(unquote(raw))) > 0; break;
    case 'gte': ok = v != null && cmp(v, num(unquote(raw))) >= 0; break;
    case 'lt': ok = v != null && cmp(v, num(unquote(raw))) < 0; break;
    case 'lte': ok = v != null && cmp(v, num(unquote(raw))) <= 0; break;
    case 'like': ok = v != null && likeRe(unquote(raw), '').test(String(v)); break;
    case 'ilike': ok = v != null && likeRe(unquote(raw), 'i').test(String(v)); break;
    case 'is': ok = raw === 'null' ? v == null : raw === 'true' ? v === true : raw === 'false' ? v === false : (() => { throw fail(400, 'is.' + raw); })(); break;
    case 'in': { if (!/^\(.*\)$/.test(raw)) throw fail(400, 'in needs (…)'); const list = splitTop(raw.slice(1, -1)).map(unquote); ok = v != null && list.includes(String(v)); break; }
    // Array columns: contains every one of these ({a,b}), or has any of them (ov).
    case 'cs': case 'ov': {
      // A jsonb column of objects (a deck's helpers): cs.[{"id":"x"}] holds when the column has an object with all of those fields.
      if (op === 'cs' && raw.startsWith('[')) {
        let want; try { want = JSON.parse(raw); } catch { throw fail(400, 'cs needs JSON'); }
        const holds = (a, b) => (b && typeof b === 'object' ? (Array.isArray(b) ? Array.isArray(a) && b.every(y => a.some(x => holds(x, y))) : !!a && typeof a === 'object' && !Array.isArray(a) && Object.keys(b).every(k => k in a && holds(a[k], b[k]))) : a === b);
        ok = holds(v, want); break;
      }
      if (!/^\{.*\}$/.test(raw)) throw fail(400, op + ' needs {…}');
      const list = splitTop(raw.slice(1, -1)).map(unquote), have = Array.isArray(v) ? v.map(String) : [];
      ok = op === 'cs' ? list.every(x => have.includes(x)) : list.some(x => have.includes(x)); break;
    }
    default: throw fail(400, 'Unknown filter ' + op);
  }
  return neg ? !ok : ok;
}
// or=(a.eq.1,and(b.is.null,c.eq.2)) and and=(…).
function logic(row, kind, body) {
  const parts = splitTop(body.replace(/^\(|\)$/g, ''));
  const one = p => {
    const m = /^(and|or)\((.*)\)$/.exec(p);
    if (m) return logic(row, m[1], m[2]);
    const dot = p.indexOf('.');
    return test(row, p.slice(0, dot), p.slice(dot + 1));
  };
  return kind === 'or' ? parts.some(one) : parts.every(one);
}
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'or', 'and', 'columns']);
function matcher(params) {
  const conds = [];
  for (const [k, v] of params) {
    if (k === 'or' || k === 'and') conds.push(row => logic(row, k, v));
    else if (!RESERVED.has(k)) conds.push(row => test(row, k, v));
  }
  return row => conds.every(c => c(row));
}
function select(rows, params) {
  const sel = params.get('select');
  if (!sel || sel === '*') return rows.map(r => ({ ...r }));
  const cols = splitTop(sel).map(c => c.trim());
  for (const c of cols) if (!/^[a-z_][a-z0-9_]*$/.test(c)) throw fail(400, 'select ' + c);
  return rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] === undefined ? null : r[c]])));
}
function order(rows, params) {
  const o = params.get('order');
  if (!o) return rows;
  const keys = o.split(',').map(p => { const [col, ...fl] = p.split('.'); return { col, desc: fl.includes('desc'), nullsFirst: fl.includes('nullsfirst') || (fl.includes('desc') && !fl.includes('nullslast')) }; });
  return rows.slice().sort((a, b) => {
    for (const k of keys) {
      const x = a[k.col], y = b[k.col];
      if (x == null && y == null) continue;
      if (x == null) return k.nullsFirst ? -1 : 1;
      if (y == null) return k.nullsFirst ? 1 : -1;
      const c = cmp(x, y);
      if (c) return k.desc ? -c : c;
    }
    return 0;
  });
}

// A file written before a column was added gives the rows that are already there the column's default, the way
// `alter table … add column … default` does in Supabase, and what supabase/hardening.sql fills in for them: who is listed
// (someone who wrote on their profile, is verified, or shares a deck publicly), decks already hidden after a report, and
// how many changes each version has.
function migrate(db) {
  const publicOwners = new Set(db.shared_decks.filter(d => d.visibility === 'public').map(d => d.owner));
  for (const p of db.profiles) if (!('listed' in p)) p.listed = !!(p.bio || p.school || p.subject || (p.featured || []).length || p.verified || p.kind === 'school' || publicOwners.has(p.id));
  for (const d of db.shared_decks) if (!('hidden' in d)) d.hidden = db.reports.some(r => r.kind === 'deck' && r.status === 'hidden' && r.target === d.id);
  for (const v of db.deck_versions) if (!('n_changes' in v)) v.n_changes = Array.isArray(v.changes) ? v.changes.length : 0;
  for (const [t, spec] of Object.entries(TABLES)) {
    if (spec.view) continue;
    const fresh = spec.defaults();
    for (const r of db[t]) for (const k of Object.keys(fresh)) if (!(k in r)) r[k] = fresh[k];
  }
}

export function localRest(dir) {
  const FILE = join(dir, 'social.json');
  let db = null;
  const load = () => {
    if (db) return db;
    try { db = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}; } catch { db = {}; }
    for (const t of Object.keys(TABLES)) if (!TABLES[t].view) db[t] ||= [];
    db.$serial ||= {};
    migrate(db);
    return db;
  };
  const save = () => { mkdirSync(dir, { recursive: true }); const tmp = FILE + '.tmp'; writeFileSync(tmp, JSON.stringify(db)); renameSync(tmp, FILE); };
  const keyOf = (spec, row, cols = spec.key) => JSON.stringify(cols.map(c => row[c] ?? null));
  function clash(t, spec, row, except) {
    for (const cols of [spec.key, ...(spec.unique || [])]) {
      const k = keyOf(spec, row, cols);
      if (db[t].some(r => r !== except && keyOf(spec, r, cols) === k)) return cols;
    }
    return null;
  }
  // Answers like fetch would: { status, headers, body } (body is the parsed JSON, or null).
  function call(path, { method = 'GET', headers = {}, body } = {}) {
    load();
    const m = /^\/rest\/v1\/([a-z_]+)(\?.*)?$/.exec(path);
    if (!m || !TABLES[m[1]]) throw fail(404, 'No table ' + path);
    const t = m[1], spec = TABLES[t], params = new URLSearchParams((m[2] || '').slice(1));
    const prefer = String(headers.prefer || headers.Prefer || ''), back = /return=representation/.test(prefer);
    const input = body == null ? null : typeof body === 'string' ? JSON.parse(body) : body;
    if (spec.view && method !== 'GET' && method !== 'HEAD') throw fail(405, t + ' is read only');
    if (method === 'GET' || method === 'HEAD') {
      let rows = order((spec.view ? spec.view(db) : db[t]).filter(matcher(params)), params);
      const total = rows.length, off = +(params.get('offset') || 0), lim = params.has('limit') ? +params.get('limit') : Infinity;
      rows = rows.slice(off, off + lim);
      const h = /count=exact/.test(prefer) ? { 'content-range': (rows.length ? off + '-' + (off + rows.length - 1) : '*') + '/' + total } : {};
      return { status: 200, headers: h, body: method === 'HEAD' ? null : select(rows, params) };
    }
    if (method === 'POST') {
      const list = (Array.isArray(input) ? input : [input]).filter(Boolean), out = [];
      const upsert = /resolution=merge-duplicates/.test(prefer), ignore = /resolution=ignore-duplicates/.test(prefer);
      const onConflict = params.get('on_conflict') ? params.get('on_conflict').split(',') : spec.key;
      for (const src of list) {
        const row = { ...spec.defaults(), ...src };
        if (spec.serial && row[spec.serial] == null) row[spec.serial] = (db.$serial[t] = (db.$serial[t] || 0) + 1);
        const same = db[t].find(r => keyOf(spec, r, onConflict) === keyOf(spec, row, onConflict));
        if (same && (upsert || ignore)) {
          if (ignore) continue;
          const next = { ...same, ...src };
          const c = clash(t, spec, next, same);
          if (c) throw fail(409, 'duplicate key (' + c.join(', ') + ')');
          Object.assign(same, src);
          out.push({ ...same });
          continue;
        }
        const c = clash(t, spec, row);
        if (c) throw fail(409, 'duplicate key (' + c.join(', ') + ')');
        db[t].push(row);
        out.push({ ...row });
      }
      save();
      return { status: 201, headers: {}, body: back ? select(out, params) : null };
    }
    if (method === 'PATCH') {
      if (![...params.keys()].some(k => !RESERVED.has(k) || k === 'or')) throw fail(400, 'PATCH needs a filter');
      const rows = db[t].filter(matcher(params));
      for (const r of rows) {
        const next = { ...r, ...input };
        const c = clash(t, spec, next, r);
        if (c) throw fail(409, 'duplicate key (' + c.join(', ') + ')');
        Object.assign(r, input);
      }
      save();
      return { status: 200, headers: {}, body: back ? select(rows, params) : null };
    }
    if (method === 'DELETE') {
      if (![...params.keys()].some(k => !RESERVED.has(k) || k === 'or')) throw fail(400, 'DELETE needs a filter');
      const hit = matcher(params), gone = db[t].filter(hit);
      db[t] = db[t].filter(r => !hit(r));
      save();
      return { status: 200, headers: {}, body: back ? select(gone, params) : null };
    }
    throw fail(405, method);
  }
  return { call, reset: () => { db = null; } };
}
