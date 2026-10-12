// Step 4's safety release (design/specs/step4-maps.md §12 step 0): before any map page can exist, nothing can turn one into a Note.
//   - web/pages.mjs refuses a Note's blocks on a page of another kind (code 'shape', the §3.7 words for the app and for AI apps), and
//     cleans every kind's data with the page's data before (`prev`);
//   - /api/pages and MCP refuse to make or write a kind that isn't in PAGE_READY (code 'ready', the same words in both);
//   - web/pagesclient.js merges a 409 by kind (MERGE): a Note's block by block, and a kind with no merge never sends what was
//     written here over the other writer's.
// It runs the worktree's server in this process on port 3600 (127.0.0.1), with its data in a new folder that goes afterwards.
//   node tests/pages-safety.mjs            (prints each failure, then "pages-safety: N passed, M failed"; exits 1 on a failure)
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';

const DIR = mkdtempSync(join(tmpdir(), 'lucida-safety-'));
process.env.STEALTH_DATA = DIR + '/';
delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.LUCIDA_MCP_LOGIN;
const PORT = 3600, BASE = 'http://127.0.0.1:' + PORT;

const store = await import('../web/store.mjs');
const { handle } = await import('../web/handler.mjs');
const pages = await import('../web/pages.mjs');
const MAPS_FILE = new URL('../web/maps.js', import.meta.url);
let maps = null;
if (existsSync(MAPS_FILE)) { try { const m = await import(MAPS_FILE.href); maps = m.default || m; if (typeof maps.normalize !== 'function') maps = null; } catch { maps = null; } }

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
}
const J = x => JSON.stringify(x);
const caught = fn => { try { fn(); return null; } catch (e) { return e; } };
const caughtA = async fn => { try { await fn(); return null; } catch (e) { return e; } };
const NOTE = { blocks: [{ id: 'b1', type: 'text', text: 'Glycolysis is in the cytoplasm.' }] };
const MIND = { root: { id: 'cell', label: 'The cell', children: [{ id: 'nuc', label: 'Nucleus' }] } };
const APP_SHAPE = 'This page is a Mind map. Update Lucida to change it here.';
const AI_SHAPE = 'This page is a Mind map: send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.';

store.load();
const server = createServer(handle);
await new Promise((ok, no) => { server.once('error', no); server.listen(PORT, '127.0.0.1', ok); });
const api = async (path, body) => {
  const r = await fetch(BASE + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) } : {});
  return { status: r.status, j: await r.json().catch(() => ({})) };
};
let rpc = 0;
const tool = async (name, args) => {
  const r = await fetch(BASE + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: J({ jsonrpc: '2.0', id: ++rpc, method: 'tools/call', params: { name, arguments: args } }) });
  const j = await r.json(); const res = j.result || {};
  return { error: !!res.isError, text: (res.content || []).map(c => c.text).join('\n') };
};
// a kind made ready for a while (as the tests of later steps do), then not again
const whileReady = async (kinds, fn) => { const added = kinds.filter(k => !pages.PAGE_READY.has(k)); added.forEach(k => pages.PAGE_READY.add(k)); try { return await fn(); } finally { added.forEach(k => pages.PAGE_READY.delete(k)); } };

try {
  // ---------- PAGE_READY, the one list ----------
  check('PAGE_READY is still just the note', J([...pages.PAGE_READY]) === J(['note']), [...pages.PAGE_READY]);
  check('READY is the same list', pages.READY === pages.PAGE_READY);
  check('notReady names the kind and what can be made', pages.notReady('mindmap') === 'Lucida can’t show Mind map pages yet; make a note for now.', pages.notReady('mindmap'));
  check('notReady for a kind that isn’t one', pages.notReady('timeline') === 'A page is a note (the others are coming).', pages.notReady('timeline'));
  await whileReady(['mindmap', 'diagram'], () => {
    check('notReady’s lists follow PAGE_READY', pages.notReady('slides') === 'Lucida can’t show Presentation pages yet; make a note, a mind map or a diagram.', pages.notReady('slides'));
    check('…and for a kind that isn’t one', pages.notReady('x') === 'A page is a note, a mind map or a diagram (the others are coming).', pages.notReady('x'));
  });

  // ---------- cleanData: a Note's blocks never go on another kind ----------
  for (const kind of ['mindmap', 'diagram', 'slides', 'canvas', 'doc']) {
    const e = caught(() => pages.cleanData(kind, NOTE));
    check('blocks on a ' + kind + ' are refused with code shape', e && e.code === 'shape' && e.status === 400, e && { code: e.code, message: e.message });
    const e2 = caught(() => pages.cleanData(kind, { blocks: [] }, { root: { id: 'root', label: '' } }, { ai: true }));
    check('empty blocks on a ' + kind + ' are refused too (an AI app)', e2 && e2.code === 'shape', e2 && e2.message);
  }
  check('the app’s words (§3.7)', (caught(() => pages.cleanData('mindmap', NOTE)) || {}).message === APP_SHAPE);
  check('an AI app’s words (§3.7)', (caught(() => pages.cleanData('mindmap', NOTE, undefined, { ai: true })) || {}).message === AI_SHAPE);
  check('a Diagram is named in them', (caught(() => pages.cleanData('diagram', NOTE)) || {}).message === 'This page is a Diagram. Update Lucida to change it here.');
  check('a Note’s blocks still go on a Note', J(pages.cleanData('note', NOTE).data) === J(NOTE));
  check('a Note keeps its blocks’ ids from prev', pages.cleanData('note', '# Cells\n\nGlycolysis is in the cytoplasm.', NOTE).data.blocks.some(b => b.id === 'b1'));
  {
    const c = pages.cleanData('mindmap', MIND);
    check('a mind map’s data is kept (cleaned) and has no blocks', c.data && c.data.root && !('blocks' in c.data), c.data);
    check('cleanData gives warnings', Array.isArray(c.warnings));
    const empty = pages.cleanData('mindmap', undefined).data;
    check('a new mind map starts as a topic, not as blocks', empty && empty.root && empty.root.id === 'root' && !('blocks' in empty), empty);
    check('a new diagram starts empty', J(pages.cleanData('diagram', null).data) === J(maps && maps.emptyOf ? maps.emptyOf('diagram') : { direction: 'down', nodes: [], edges: [] }));
  }
  // prev for every kind: update hands the page's data before to cleanData, whatever its kind
  check('update passes prev for every kind', /cleanData\(cur\.kind, data, cur\.data\b/.test(readFileSync(new URL('../web/pages.mjs', import.meta.url), 'utf8')));
  if (maps) {
    const prev = maps.normalize('mindmap', MIND, undefined, { ai: false }).data, next = { root: { label: 'The cell', children: [{ label: 'Nucleus' }, { label: 'Ribosome' }] } };
    check('maps.normalize gets prev (with web/maps.js)', J(pages.cleanData('mindmap', next, prev, { ai: true }).data) === J(maps.normalize('mindmap', next, prev, { ai: true }).data));
  } else console.log('  (web/maps.js isn’t there yet: map data is kept as sent, still never as blocks)');

  // ---------- a deck, and pages on it ----------
  const made = await tool('create_deck', { name: 'Safety' });
  check('a deck to put pages in', !made.error, made.text);
  const deck = store.state().decks.find(d => d.name === 'Safety');
  const mind = await pages.create(null, { scope: 'deck', scopeId: deck.id, kind: 'mindmap', title: 'The cell', data: MIND, who: 'seed' });
  check('a mind map row can be seeded (no ready check in-process)', mind.kind === 'mindmap' && mind.version === 1, mind);
  const reread = async () => pages.get(null, mind.id);

  // in-process: a Note's blocks on the mind map row
  const e1 = await caughtA(() => pages.update(null, mind.id, { baseVersion: 1, data: NOTE }));
  check('pages.update refuses blocks on the mind map row', e1 && e1.code === 'shape', e1 && e1.message);
  check('…and nothing was saved', (await reread()).version === 1 && !('blocks' in (await reread()).data));

  // ---------- /api/pages ----------
  {
    let r = await api('/api/pages', { op: 'create', scope: 'deck', id: deck.id, kind: 'mindmap', title: 'No' });
    check('the app can’t make a mind map yet', r.status === 400 && r.j.code === 'ready' && r.j.error === pages.notReady('mindmap'), r);
    r = await api('/api/pages', { op: 'create', scope: 'deck', id: deck.id, kind: 'timeline', title: 'No' });
    check('…nor a kind that isn’t one', r.status === 400 && r.j.error === 'A page is a note (the others are coming).', r);
    r = await api('/api/pages', { op: 'update', page: mind.id, baseVersion: 1, data: NOTE });
    check('the app can’t write the mind map row (not ready)', r.status === 400 && r.j.code === 'ready', r);
    r = await api('/api/pages', { op: 'update', page: mind.id, baseVersion: 1, title: 'Renamed' });
    check('…not even its title', r.status === 400 && r.j.code === 'ready', r);
    r = await api('/api/pages', { op: 'restore', page: mind.id, version: 1, baseVersion: 1 });
    check('…nor restore one of its versions', r.status === 400 && r.j.code === 'ready', r);
    await whileReady(['mindmap'], async () => {
      r = await api('/api/pages', { op: 'update', page: mind.id, baseVersion: 1, data: NOTE });
      check('ready, a Note’s blocks on it give 400 shape', r.status === 400 && r.j.code === 'shape' && r.j.error === APP_SHAPE, r);
    });
    const now = await reread();
    check('the mind map row is untouched', now.version === 1 && now.title === 'The cell' && J(now.data) === J(pages.cleanData('mindmap', MIND).data), now);
    r = await api('/api/pages', { op: 'create', scope: 'deck', id: deck.id, kind: 'note', title: 'Notes', data: NOTE });
    check('a Note is still made', r.status === 200 && r.j.kind === 'note', r);
    const nid = r.j.id;
    r = await api('/api/pages', { op: 'update', page: nid, baseVersion: 1, data: { blocks: [...NOTE.blocks, { id: 'b2', type: 'text', text: 'Krebs is in the matrix.' }] } });
    check('…and saved', r.status === 200 && r.j.version === 2, r);
  }

  // ---------- MCP ----------
  {
    let t = await tool('create_page', { deck: 'Safety', kind: 'mindmap', title: 'No', blocks: NOTE.blocks });
    check('MCP can’t make a mind map yet', t.error && t.text === pages.notReady('mindmap'), t);
    t = await tool('update_page', { page: mind.id, baseVersion: 1, blocks: NOTE.blocks });
    check('MCP can’t write the mind map row', t.error && t.text === pages.notReady('mindmap'), t);
    await whileReady(['mindmap'], async () => {
      t = await tool('update_page', { page: mind.id, baseVersion: 1, blocks: NOTE.blocks });
      check('ready, MCP blocks on it get the AI app’s shape words', t.error && t.text === AI_SHAPE, t);
    });
    t = await tool('list_pages', { deck: 'Safety' });
    check('list_pages says what can be made', /"kinds_you_can_make": \[\s*"note"\s*\]/.test(t.text), t.text.slice(-200));
    check('the mind map row is still untouched', (await reread()).version === 1);
  }

  // ---------- web/pagesclient.js: the 409 merge by kind ----------
  {
    globalThis.addEventListener = globalThis.addEventListener || (() => {});
    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, o) => realFetch(String(url).startsWith('/') ? BASE + url : url, o);
    const { createPages } = await import('../web/pagesclient.js');
    await new Promise(r => setTimeout(r, 50));   // (its maps.js import settles)
    const client = createPages({ changed() {}, say() {} });
    const opened = async id => { client.page(id); for (let i = 0; i < 100 && !client.page(id); i++) await new Promise(r => setTimeout(r, 10)); return client.page(id); };

    // a Note: both changes are kept
    const note = await pages.create(null, { scope: 'deck', scopeId: deck.id, kind: 'note', title: 'Merge', data: { blocks: [{ id: 'a', type: 'text', text: 'A' }, { id: 'b', type: 'text', text: 'B' }] } });
    await opened(note.id);
    await pages.update(null, note.id, { baseVersion: 1, data: { blocks: [{ id: 'a', type: 'text', text: 'A by Claude' }, { id: 'b', type: 'text', text: 'B' }] }, who: 'Claude', ai: true });
    client.edit(note.id, { data: { blocks: [{ id: 'a', type: 'text', text: 'A' }, { id: 'b', type: 'text', text: 'B by you' }] } });
    await client.flush(note.id);
    let s = await pages.get(null, note.id);
    check('a Note merges: theirs and mine both kept', s.version === 3 && J(s.data.blocks.map(b => b.text)) === J(['A by Claude', 'B by you']), s.data);
    check('…and says so', client.conflict(note.id) && client.conflict(note.id).theirs === 2 && client.conflict(note.id).mine === 3, client.conflict(note.id));

    // a kind with no merge: theirs stays
    await whileReady(['slides'], async () => {
      const sl = await pages.create(null, { scope: 'deck', scopeId: deck.id, kind: 'slides', title: 'Deck', data: { slides: ['one'] } });
      await opened(sl.id);
      await pages.update(null, sl.id, { baseVersion: 1, data: { slides: ['one', 'two by Claude'] }, who: 'Claude', ai: true });
      client.edit(sl.id, { data: { slides: ['one by you'] } });
      await client.flush(sl.id);
      s = await pages.get(null, sl.id);
      check('a kind with no merge never overwrites the other writer', s.version === 2 && J(s.data) === J({ slides: ['one', 'two by Claude'] }), s);
      check('…the page shows theirs', J(client.page(sl.id).data) === J({ slides: ['one', 'two by Claude'] }), client.page(sl.id));
      check('…and the saving line says what wasn’t saved', client.saving(sl.id).err === 'Your change wasn’t saved: Claude changed this page (v2).', client.saving(sl.id));
    });

    // a mind map: merged by web/maps.js when it's there, else theirs stays; never blocks
    await whileReady(['mindmap'], async () => {
      const mm = await pages.create(null, { scope: 'deck', scopeId: deck.id, kind: 'mindmap', title: 'Map', data: MIND });
      const base = (await opened(mm.id)).data;
      const theirs = { root: { ...base.root, children: [...(base.root.children || []), { id: 'mito', label: 'Mitochondria' }] } };
      await pages.update(null, mm.id, { baseVersion: 1, data: theirs, who: 'Claude', ai: true });
      client.edit(mm.id, { data: { root: { ...base.root, label: 'The animal cell' } } });
      await client.flush(mm.id);
      s = await pages.get(null, mm.id);
      check('a mind map is never saved as blocks', !('blocks' in s.data), s.data);
      check('…and their idea is still there', J(s.data).includes('"mito"'), s.data);
      if (!(maps && typeof maps.merge === 'function')) check('…with no maps.merge yet, theirs stays as it was', s.version === 2, s);
      // a Note's blocks never go on it from the app
      const before = client.page(mm.id);
      client.edit(mm.id, { data: { blocks: [] } }); client.editMarkdown(mm.id, '# Hi');
      check('the client never puts blocks on a mind map', client.page(mm.id) === before && !client.saving(mm.id).busy);
    });
    globalThis.fetch = realFetch;
  }
} catch (e) { fail++; console.log('  FAIL (threw) ' + (e.stack || e.message)); }
finally {
  await new Promise(r => server.close(r));
  rmSync(DIR, { recursive: true, force: true });
}

console.log('pages-safety: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
