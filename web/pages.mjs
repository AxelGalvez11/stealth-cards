// Pages: what a deck or a folder holds beside its cards, each of a kind (a Note, a Presentation, a Mind map, a Diagram, a
// Canvas, a Doc), written by its owner in the app or by their AI app over MCP (the owner, 2026-10-11: "AI-native for agents
// ... the way Claude Artifacts work, but specific to studying"). The tables are supabase/pages.sql (web/localrest.mjs on this
// computer).
//   - A page is its own row, not part of the library the app reloads every few seconds, and it is written here directly, not
//     inside withLibrary: a library save that has to be tried again never writes a page twice.
//   - Every save is a new version (page_versions), so any older one can be restored, and Free keeps PAGES.free.versions of them.
//   - A save names the version it was made from (`baseVersion`). One made from an older version is refused with the page as
//     it is now (a PageError with code 'conflict' and `current`), so the app or the AI app reads it again and merges: two
//     writers never overwrite each other unseen. The row is only changed where its version is still the base one, so two
//     saves at the same moment can't both win.
//   - A Note's data is blocks (web/pageblocks.js); an AI app may send Markdown instead, which becomes blocks. A Mind map's and a
//     Diagram's data is cleaned by web/maps.js (normalize), and a Note's blocks sent to one of them are refused (code 'shape'):
//     an older app that opens every page as a Note can't turn a map into a Note.
//   - Only the kinds in PAGE_READY can be made or written from the app and from AI apps (handler.mjs and mcp.mjs pass `ready`).
//   - Deleting a page marks it deleted (its versions stay until the deck goes), and pages inside it move up to its parent.
import { rest, val, inList } from './supa.mjs';
import { PAGES } from './plans.mjs';
import { normalizeNote, markdownToNote } from './pageblocks.js';

export const KINDS = ['note', 'slides', 'mindmap', 'diagram', 'canvas', 'doc'];
export const KIND_NAMES = { note: 'Note', slides: 'Presentation', mindmap: 'Mind map', diagram: 'Diagram', canvas: 'Canvas', doc: 'Doc' };
// The kinds the apps can show so far (the rest come in the approved order: mind map and diagram, presentation, canvas, doc).
// The one list: the server, MCP and the apps' New page all go by it (a test may add a kind to it for a while).
export const PAGE_READY = new Set(['note']);
export const READY = PAGE_READY;
export const SCOPES = ['deck', 'folder'];
const META = 'id,scope,scope_id,parent,pos,kind,title,size,version,updated_by,updated_ai,created_at,updated_at';

export class PageError extends Error {
  constructor(message, status = 400, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}
const owner = uid => String(uid || 'local');
const newId = () => 'p' + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 8);
const now = () => new Date().toISOString();
const limits = pro => (pro === false ? PAGES.free : PAGES.pro);
// (an empty title stays empty: the apps show Untitled, and the title box waits for one)
const cleanTitle = t => String(t ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 200);

// "a note, a mind map or a diagram": the kinds that are ready, in words.
const words = list => (list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' or ' + list[list.length - 1]);
const readyWords = () => words(KINDS.filter(k => PAGE_READY.has(k)).map(k => 'a ' + KIND_NAMES[k].toLowerCase()));
// What a kind that isn't ready (or isn't a kind at all) answers, the same over MCP and in the app.
export const notReady = kind => (KINDS.includes(kind)
  ? 'Lucida can’t show ' + KIND_NAMES[kind] + ' pages yet; make ' + readyWords() + (PAGE_READY.size < 2 ? ' for now' : '') + '.'
  : 'A page is ' + readyWords() + ' (the others are coming).');
const refuseUnready = kind => { if (!PAGE_READY.has(kind)) throw new PageError(notReady(kind), 400, { code: 'ready' }); };

// web/maps.js cleans the map kinds' data. It's loaded here if it's there (and works), so this file runs before it is written too.
let maps = null;
try { const m = await import('./maps.js'); maps = m.default || m; if (typeof maps.normalize !== 'function') maps = null; } catch { maps = null; }
export const MAP_KINDS = new Set(['mindmap', 'diagram']);
// The engine itself, for the other server files (null while web/maps.js isn't there).
export const mapsEngine = () => maps;
// What an AI write that says nothing about itself changed, in words ('Added 3 ideas under Mitochondria'), from the two versions.
function autoSummary(kind, before, after) {
  if (!maps || !MAP_KINDS.has(kind) || !before) return '';
  try { const s = maps.summaryOf(maps.diff(kind, before, after)); return s === 'No changes' ? '' : s; } catch { return ''; }
}
// A new page's data when none is sent (maps.js's emptyOf when it's there).
const EMPTY = { note: { blocks: [] }, mindmap: { root: { id: 'root', label: '' } }, diagram: { direction: 'down', nodes: [], edges: [] } };
export const emptyOf = kind => JSON.parse(JSON.stringify((maps && typeof maps.emptyOf === 'function' && MAP_KINDS.has(kind) && maps.emptyOf(kind)) || EMPTY[kind] || {}));
// A Note's blocks sent to a page of another kind (what an older app that opens every page as a Note would save).
const noteShaped = d => !!d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.blocks);
const shapeError = (kind, ai) => new PageError(ai
  ? 'This page is a ' + KIND_NAMES[kind] + ': send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.'
  : 'This page is a ' + KIND_NAMES[kind] + '. Update Lucida to change it here.', 400, { code: 'shape' });

// A page's data, made safe and the right shape for its kind; too big is refused. `prev` is the page's data before (a Note keeps
// its blocks' ids, a map its ideas' ids and what the learner owns), `ai` says an AI app or Lucida's AI wrote it (app saves and
// Restore are taken as sent), and `title` is the page's. A Note's blocks are never kept on a page of another kind.
export function cleanData(kind, data, prev, { ai = false, title = '' } = {}) {
  let out, warnings = [];
  if (kind === 'note') {
    const n = typeof data === 'string' ? markdownToNote(data, prev) : data && typeof data.markdown === 'string' && !Array.isArray(data.blocks) ? markdownToNote(data.markdown, prev) : normalizeNote(data || {});
    out = { blocks: n.blocks };
    // (what Note cleaning repaired comes back too, said as a sentence)
    if (Array.isArray(n.warnings) && n.warnings.length) warnings = n.warnings.slice(0, 10).map(w => { const t = String(w); return t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.'); });
  } else {
    if (noteShaped(data)) throw shapeError(kind, ai);
    if (data == null) data = emptyOf(kind);
    let r = null;
    if (maps && MAP_KINDS.has(kind)) {
      try { r = maps.normalize(kind, data, prev, { ai, title }); }
      catch (e) {
        if (e instanceof TypeError || e instanceof RangeError || e instanceof ReferenceError) throw e;
        // (a kind web/maps.js can't read yet, the diagram until step 4b: its data is kept as an object, below)
        if (e.code === 'shape') throw shapeError(kind, ai);
        if (e.code !== 'kind') throw new PageError(e.message, 400, e.code ? { code: e.code } : {});
      }
    }
    if (r) {
      out = r.data; warnings = r.warnings || [];
      if (!out || typeof out !== 'object' || noteShaped(out)) throw shapeError(kind, ai);
    } else {
      if (typeof data !== 'object' || Array.isArray(data)) throw new PageError('A ' + KIND_NAMES[kind] + ' page’s data is an object.');
      out = JSON.parse(JSON.stringify(data));
    }
  }
  const size = JSON.stringify(out).length;
  if (size > PAGES.bytes) throw new PageError('That page is too big: ' + Math.round(size / 1000) + ' KB, and a page holds up to ' + PAGES.bytes / 1000 + ' KB. Split it into pages.');
  return { data: out, size, warnings };
}

const ask = (path, o) => rest(path, o);
const metaOf = r => (r ? { id: r.id, scope: r.scope, scopeId: r.scope_id, parent: r.parent || '', pos: r.pos, kind: r.kind, title: r.title, size: r.size, version: r.version, by: r.updated_by, ai: !!r.updated_ai, created: Date.parse(r.created_at), updated: Date.parse(r.updated_at) } : null);
const fullOf = r => (r ? { ...metaOf(r), data: r.data } : null);

// The pages of one deck or folder (or every page of the person's, with no scope), without their data, in their order.
export async function list(uid, scope, scopeId) {
  const where = scope ? '&scope=eq.' + val(scope) + '&scope_id=eq.' + val(scopeId) : '';
  const rows = await ask('/pages?owner=eq.' + val(owner(uid)) + where + '&deleted=is.false&select=' + META + '&order=pos.asc,created_at.asc');
  return (rows || []).map(metaOf);
}
async function row(uid, id) {
  if (!/^p[a-z0-9]{6,24}$/.test(String(id || ''))) return null;
  const rows = await ask('/pages?id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)) + '&deleted=is.false&limit=1');
  return rows && rows[0] ? rows[0] : null;
}
export const get = async (uid, id) => fullOf(await row(uid, id));
const mustGet = async (uid, id) => { const r = await row(uid, id); if (!r) throw new PageError('No page ' + id + '. list_pages gives the ids.', 404); return r; };

async function keepVersion(uid, r, { who, ai, summary }) {
  await ask('/page_versions', { method: 'POST', body: { page_id: r.id, version: r.version, owner: owner(uid), title: r.title, data: r.data, author: who || '', ai: !!ai, summary: String(summary || '').slice(0, 300) } });
}
async function prune(uid, id, version, pro) {
  const keep = limits(pro).versions;
  if (version > keep) await ask('/page_versions?page_id=eq.' + val(id) + '&version=lte.' + (version - keep), { method: 'DELETE' });
}

// A new page in a deck or a folder (the caller has checked the deck or folder is the person's own and may be written). `ready`
// (the app and AI apps) refuses a kind that isn't in PAGE_READY.
// `cleaned`: the data went through cleanData's rules already, with `ai` (mcp.mjs cleans a map first to check its card ids): it is
// taken as it is now, so what that AI write cleared stays cleared.
export async function create(uid, { scope, scopeId, kind, title, data, parent = '', who = 'you', ai = false, summary = '', pro, ready = false, cleaned = false }) {
  if (!SCOPES.includes(scope)) throw new PageError('A page belongs to a deck or a folder.');
  if (ready) refuseUnready(kind);
  if (!KINDS.includes(kind)) throw new PageError('A page is one of: ' + KINDS.join(', ') + '.');
  const have = await list(uid, scope, scopeId);
  if (have.length >= limits(pro).perScope) throw new PageError(pro === false ? 'Free holds ' + PAGES.free.perScope + ' pages in a ' + scope + '. Go Pro for more: lucida.cards/pricing' : 'A ' + scope + ' holds up to ' + PAGES.pro.perScope + ' pages.', 402);
  if (parent && !have.some(p => p.id === parent)) throw new PageError('The page to put it inside isn’t in that ' + scope + '.');
  const c = cleanData(kind, data, undefined, { ai: ai && !cleaned, title: cleanTitle(title) });
  const r = { id: newId(), owner: owner(uid), scope, scope_id: String(scopeId), parent: parent || '', pos: have.length ? Math.max(...have.map(p => p.pos || 0)) + 1 : 0, kind, title: cleanTitle(title, kind), data: c.data, size: c.size, version: 1, updated_by: who, updated_ai: !!ai, created_at: now(), updated_at: now() };
  await ask('/pages', { method: 'POST', body: r });
  await keepVersion(uid, r, { who, ai, summary: summary || 'Made the page' });
  return withWarnings(fullOf(r), c.warnings);
}
// What cleaning repaired, said beside the page it gave back (not kept).
const withWarnings = (p, w) => (w && w.length ? { ...p, warnings: w } : p);

// A save: new data and/or title, made from `baseVersion`. Refused with the page as it is now when that isn't its version.
// `ready` (the app and AI apps) refuses a page whose kind isn't in PAGE_READY.
export async function update(uid, id, { baseVersion, title, data, who = 'you', ai = false, summary = '', pro, ready = false, cleaned = false }) {
  const cur = await mustGet(uid, id);
  if (ready) refuseUnready(cur.kind);
  const base = Number(baseVersion);
  const conflict = c => new PageError('This page changed since version ' + base + ': it is at version ' + c.version + ' now (' + (c.updated_by || 'someone') + '). Read it again, merge your change into it, and save with baseVersion ' + c.version + '.', 409, { code: 'conflict', current: fullOf(c) });
  if (!Number.isInteger(base) || base < 1) throw new PageError('Say which version the change was made from (baseVersion, from get_page).');
  if (base !== cur.version) throw conflict(cur);
  const patch = { version: cur.version + 1, updated_by: who, updated_ai: !!ai, updated_at: now() };
  if (title !== undefined) patch.title = cleanTitle(title, cur.kind);
  let warnings = [];
  if (data !== undefined) { const c = cleanData(cur.kind, data, cur.data, { ai: ai && !cleaned, title: patch.title ?? cur.title }); patch.data = c.data; patch.size = c.size; warnings = c.warnings; }
  // An AI write that doesn't say what it changed gets the words of what changed (the app writes its own at flush).
  if (ai && !String(summary || '').trim() && patch.data) summary = autoSummary(cur.kind, cur.data, patch.data);
  const got = await ask('/pages?id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)) + '&version=eq.' + base, { method: 'PATCH', body: patch, prefer: 'return=representation' });
  const r = got && got[0];
  if (!r) throw conflict((await row(uid, id)) || cur);
  await keepVersion(uid, r, { who, ai, summary });
  await prune(uid, id, r.version, pro);
  return withWarnings(fullOf(r), warnings);
}

// Where a page sits: inside another page of the same deck or folder ('' for the top), and its place among its siblings. Not a new version.
export async function move(uid, id, { parent, pos }) {
  const cur = await mustGet(uid, id), patch = {};
  if (parent !== undefined) {
    if (parent) {
      const sib = await list(uid, cur.scope, cur.scope_id), by = new Map(sib.map(p => [p.id, p]));
      if (!by.has(parent)) throw new PageError('The page to put it inside isn’t in that ' + cur.scope + '.');
      for (let p = parent, n = 0; p && n < 50; p = (by.get(p) || {}).parent, n++) if (p === id) throw new PageError('A page can’t go inside itself.');
    }
    patch.parent = parent || '';
  }
  if (pos !== undefined && Number.isFinite(+pos)) patch.pos = +pos;
  if (!Object.keys(patch).length) return metaOf(cur);
  patch.updated_at = now();
  const got = await ask('/pages?id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)), { method: 'PATCH', body: patch, prefer: 'return=representation' });
  return metaOf(got && got[0]);
}

// A page goes (pages inside it move up to where it was).
export async function remove(uid, id) {
  const cur = await mustGet(uid, id);
  await ask('/pages?owner=eq.' + val(owner(uid)) + '&parent=eq.' + val(id) + '&deleted=is.false', { method: 'PATCH', body: { parent: cur.parent || '', updated_at: now() } });
  await ask('/pages?id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)), { method: 'PATCH', body: { deleted: true, updated_at: now() } });
  return metaOf(cur);
}
// Everything in a deck or folder that went (store.mjs deck.delete, after the library is saved): the pages and every version.
export async function removeScope(uid, scope, scopeId) {
  const rows = await ask('/pages?owner=eq.' + val(owner(uid)) + '&scope=eq.' + val(scope) + '&scope_id=eq.' + val(scopeId) + '&select=id');
  const ids = (rows || []).map(r => r.id);
  if (!ids.length) return 0;
  await ask('/page_versions?page_id=in.' + inList(ids), { method: 'DELETE' });
  await ask('/pages?id=in.' + inList(ids) + '&owner=eq.' + val(owner(uid)), { method: 'DELETE' });
  return ids.length;
}

// Older versions, newest first (without their data), and one of them in full.
export async function versions(uid, id) {
  await mustGet(uid, id);
  const rows = await ask('/page_versions?page_id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)) + '&select=version,title,author,ai,summary,created_at&order=version.desc');
  return (rows || []).map(v => ({ version: v.version, title: v.title, by: v.author, ai: !!v.ai, summary: v.summary, at: Date.parse(v.created_at) }));
}
export async function version(uid, id, v) {
  await mustGet(uid, id);
  const rows = await ask('/page_versions?page_id=eq.' + val(id) + '&owner=eq.' + val(owner(uid)) + '&version=eq.' + (+v || 0) + '&limit=1');
  const r = rows && rows[0];
  if (!r) throw new PageError('Version ' + v + ' of this page isn’t kept any more.', 404);
  return { version: r.version, title: r.title, data: r.data, by: r.author, ai: !!r.ai, summary: r.summary, at: Date.parse(r.created_at) };
}
// Restoring an older version is a new version with its words (what was there stays a version too).
export async function restore(uid, id, v, { baseVersion, who = 'you', ai = false, pro, ready = false }) {
  const old = await version(uid, id, v);
  return update(uid, id, { baseVersion, title: old.title, data: old.data, who, ai, summary: 'Restored version ' + old.version, pro, ready });
}

// When the person's pages last changed (the app asks /api/rev every few seconds, and reads the list again when this moves).
export async function rev(uid) {
  const rows = await ask('/pages?owner=eq.' + val(owner(uid)) + '&select=updated_at&order=updated_at.desc&limit=1');
  return rows && rows[0] ? Date.parse(rows[0].updated_at) : 0;
}

// One answer for one request: when a library save has to be tried again (handler.mjs run), a tool that already wrote a page
// gives back what it got the first time instead of writing again.
const ONCE = new WeakMap();
export function onceFor(req) {
  if (!req) return (key, fn) => fn();
  let m = ONCE.get(req); if (!m) ONCE.set(req, m = new Map());
  return (key, fn) => { if (!m.has(key)) m.set(key, Promise.resolve().then(fn)); return m.get(key); };
}
