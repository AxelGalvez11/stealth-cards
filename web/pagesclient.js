// The app's side of Pages (web/pages.mjs, /api/pages): each deck's (or folder's) list of pages, the pages opened, their
// versions, and saving them.
//   - Lists and pages are kept here and fetched when first asked for; the screen draws again when they arrive (`changed`).
//   - /api/rev says when the person's pages last changed (an AI app's change over MCP, another device): what's kept is fetched again.
//   - A save goes out a moment after the last change (one at a time per page) from the version the screen showed. When the page
//     changed meanwhile (409), the two are merged block by block: the blocks this person changed (or added, or took out) since
//     that version go onto the newer one, everything else is the newer one's, and that is saved on top. `conflict(id)` then says
//     who changed it and which versions hold what, for the line at the top of the page.
import { noteToMarkdown, markdownToNote } from './pageblocks.js';

export function createPages({ changed, say }) {
  const mds = new Map(), lists = new Map(), pages = new Map(), vers = new Map(), asked = new Set(), conflicts = new Map(), queue = new Map();
  let rev = 0;
  const key = (scope, id) => scope + '|' + id;
  async function call(url, body) {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong.'), { status: r.status, code: j.code, current: j.current });
    return j;
  }
  const fetchList = (scope, id) => {
    const k = key(scope, id);
    if (asked.has('l' + k)) return; asked.add('l' + k);
    call('/api/pages?scope=' + scope + '&id=' + encodeURIComponent(id)).then(j => { lists.set(k, j.pages); if (j.rev > rev) rev = j.rev; changed(); }).catch(() => {}).finally(() => asked.delete('l' + k));
  };
  const fetchPage = id => {
    if (asked.has('p' + id)) return; asked.add('p' + id);
    call('/api/pages/' + id).then(p => { const q = queue.get(id); if (!q || (!q.timer && !q.busy)) { pages.set(id, p); mds.delete(id); } changed(); })
      .catch(e => { if (e.status === 404) { pages.set(id, null); changed(); } }).finally(() => asked.delete('p' + id));
  };
  // Something changed on the server: what's kept is fetched again (a page being written in is left alone; its save merges).
  function onRev(r) {
    if (!r || r <= rev) return; rev = r;
    for (const k of lists.keys()) { const [scope, id] = k.split('|'); fetchList(scope, id); }
    for (const id of pages.keys()) if (!queue.has(id)) fetchPage(id);
    vers.clear();
  }

  // Top-level blocks merged by id: `base` is the version the screen started from, `mine` what it has now, `theirs` the newer saved one.
  function merge(base, mine, theirs) {
    const B = new Map(((base && base.blocks) || []).map(b => [b.id, JSON.stringify(b)])), M = (mine && mine.blocks) || [], T = (theirs && theirs.blocks) || [];
    const mineBy = new Map(M.map(b => [b.id, b])), mineChanged = b => !B.has(b.id) || B.get(b.id) !== JSON.stringify(b);
    const out = [];
    for (const b of T) {
      if (B.has(b.id) && !mineBy.has(b.id) && B.get(b.id) === JSON.stringify(b)) continue;   // taken out here, untouched there
      const m = mineBy.get(b.id);
      out.push(m && mineChanged(m) ? m : b);
    }
    // blocks added here go after the block they follow here (or first)
    M.forEach((b, i) => {
      if (B.has(b.id) || out.some(x => x.id === b.id)) return;
      const prev = i ? M[i - 1].id : null, at = prev ? out.findIndex(x => x.id === prev) : -1;
      out.splice(at + 1, 0, b);
    });
    return { blocks: out };
  }

  async function flush(id) {
    const q = queue.get(id); if (!q || q.busy) return;
    clearTimeout(q.timer); q.timer = 0; q.busy = true;
    const { title, data } = q; q.title = undefined; q.data = undefined;
    try {
      let p;
      try { p = await call('/api/pages', { op: 'update', page: id, baseVersion: q.base, title, data }); }
      catch (e) {
        if (e.code !== 'conflict' || !e.current) throw e;
        const cur = e.current, merged = data !== undefined && cur.kind === 'note' ? merge(q.baseData, data, cur.data) : data;
        p = await call('/api/pages', { op: 'update', page: id, baseVersion: cur.version, title, data: merged, summary: 'Kept what you wrote, with ' + (cur.by || 'the other') + '’s change' });
        conflicts.set(id, { by: cur.by, ai: cur.ai, theirs: cur.version, mine: p.version });
        if (q.data === undefined) mds.delete(id);   // the page shows the merged one
      }
      q.base = p.version; q.baseData = p.data;
      if (q.data === undefined && q.title === undefined) pages.set(id, p);
      else pages.set(id, { ...p, data: q.data !== undefined ? q.data : p.data, title: q.title !== undefined ? q.title : p.title });
      q.saved = Date.now(); q.err = '';
      vers.delete(id);
      for (const [k, l] of lists) if (l.some(x => x.id === id)) lists.set(k, l.map(x => (x.id === id ? { ...x, title: p.title, version: p.version, by: p.by, ai: p.ai, updated: p.updated } : x)));
    } catch (e) { q.err = e.message || 'Couldn’t save.'; if (data !== undefined && q.data === undefined) q.data = data; if (title !== undefined && q.title === undefined) q.title = title; }
    finally { q.busy = false; changed(); }
    if (q.data !== undefined || q.title !== undefined) { if (q.err) q.timer = setTimeout(() => flush(id), 4000); else flush(id); }
    else if (!q.err) queue.delete(id);
  }

  const api = {
    onRev,
    // The pages of a deck or folder ([] until they arrive; `loaded` says whether they have).
    list(scope, id) { const k = key(scope, id); if (!lists.has(k)) fetchList(scope, id); return lists.get(k) || []; },
    loaded: (scope, id) => lists.has(key(scope, id)),
    // One page with its data (undefined until it arrives, null when there's no such page). What's being saved shows as it is here.
    page(id) { if (!pages.has(id)) fetchPage(id); return pages.get(id); },
    saving: id => { const q = queue.get(id); return q ? { busy: !!(q.busy || q.timer), err: q.err || '', saved: q.saved || 0 } : { busy: false, err: '', saved: 0 }; },
    conflict: id => conflicts.get(id) || null,
    clearConflict: id => { conflicts.delete(id); changed(); },
    versions(id) { if (!vers.has(id)) { vers.set(id, null); call('/api/pages/' + id + '/versions').then(j => { vers.set(id, j.versions); changed(); }).catch(() => vers.delete(id)); } return vers.get(id); },
    version: (id, v) => call('/api/pages/' + id + '/versions/' + v),
    // A Note as Markdown, for the editor (web/notes.js): what was typed here while it's being saved, else the saved blocks as Markdown.
    markdown(id) { if (mds.has(id)) return mds.get(id); const p = pages.get(id); return p && p.kind === 'note' ? noteToMarkdown(p.data) : ''; },
    editMarkdown(id, md) { const p = pages.get(id); if (!p) return; mds.set(id, md); api.edit(id, { data: markdownToNote(md, p.data) }); },
    // A change: shown at once, saved a moment after the last one.
    edit(id, { title, data }) {
      const p = pages.get(id); if (!p) return;
      let q = queue.get(id);
      if (!q) queue.set(id, q = { base: p.version, baseData: p.data });
      if (title !== undefined) q.title = title;
      if (data !== undefined) q.data = data;
      pages.set(id, { ...p, ...(title !== undefined ? { title } : {}), ...(data !== undefined ? { data } : {}) });
      clearTimeout(q.timer); q.timer = setTimeout(() => flush(id), 700);
      changed();
    },
    flush,
    async create(scope, id, { kind = 'note', title = '', data, parent = '' } = {}) {
      const p = await call('/api/pages', { op: 'create', scope, id, kind, title, data, parent });
      pages.set(p.id, p); const k = key(scope, p.scopeId); lists.set(k, [...(lists.get(k) || []), p]); changed();
      return p;
    },
    async remove(pid) {
      await call('/api/pages', { op: 'delete', page: pid });
      pages.delete(pid); mds.delete(pid); queue.delete(pid);
      for (const [k, l] of lists) lists.set(k, l.filter(x => x.id !== pid).map(x => (x.parent === pid ? { ...x, parent: '' } : x)));
      changed();
    },
    async restore(pid, v) {
      await flush(pid);
      const p = pages.get(pid); if (!p) return;
      const got = await call('/api/pages', { op: 'restore', page: pid, version: v, baseVersion: p.version }).catch(e => { say(e.message); throw e; });
      pages.set(pid, got); mds.delete(pid); vers.delete(pid); changed();
      return got;
    },
    async move(pid, { parent, pos }) {
      const m = await call('/api/pages', { op: 'move', page: pid, parent, pos });
      for (const [k, l] of lists) if (l.some(x => x.id === pid)) lists.set(k, l.map(x => (x.id === pid ? { ...x, ...m } : x)));
      changed();
    }
  };
  // Leaving the page (or the tab) sends what's waiting.
  addEventListener('pagehide', () => { for (const id of queue.keys()) flush(id); });
  return api;
}
