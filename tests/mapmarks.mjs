// Test me marks (design/specs/step4-maps.md §6.1 row 2): what the learner recalled when they hid a map's words, kept in the library as
// S.mapMarks[pageId] = { deck, at, n: { key: [knew, missed, last, at] } } through store.mjs's mapmarks.save and mapmarks.drop actions.
//   - a save counts each idea (or arrow, 'e:from>to') as knew or missed, with the last result and when, and never makes a page version;
//   - `ids` drops the marks of ideas the page no longer has; a page keeps at most 300 marks and the library 100 pages (oldest go first);
//   - keys that aren't ids, and ids JavaScript keeps for itself, are never stored;
//   - a page's marks go with mapmarks.drop and page.gone (a page deleted from the app or an AI app; page.gone also drops the old Figures
//     mind map moved into it), its deck, its folder, and Delete my data.
// It runs in this process with its data in a new folder that goes afterwards (no server).
//   node tests/mapmarks.mjs            (prints each failure, then "mapmarks: N passed, M failed"; exits 1 on a failure)
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'lucida-mapmarks-'));
process.env.STEALTH_DATA = DIR + '/';
delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const store = await import('../web/store.mjs');
const pages = await import('../web/pages.mjs');

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
}
const J = x => JSON.stringify(x);
const S = () => store.state();
const save = a => store.apply({ type: 'mapmarks.save', ...a });
const caught = fn => { try { fn(); return null; } catch (e) { return e; } };

try {
  store.load();
  check('a new library has no marks', J(S().mapMarks) === '{}');
  const d = store.apply({ type: 'deck.add', name: 'Cells' }), deck = d.id;
  const pid = 'pmap00001';

  // ---------- saving ----------
  const t0 = Date.now();
  let r = save({ pageId: pid, deckId: deck, results: [{ id: 'mito', ok: true }, { id: 'etc', ok: false }, { id: 'e:c1>q', ok: false }] });
  let m = S().mapMarks[pid];
  check('a save keeps the page’s deck, when, and each mark', m.deck === deck && m.at >= t0 && J(Object.keys(m.n).sort()) === J(['e:c1>q', 'etc', 'mito']) && r.marks === 3, m);
  check('…knew, missed, last (1 knew, 0 missed), when', J(m.n.mito.slice(0, 3)) === J([1, 0, 1]) && J(m.n.etc.slice(0, 3)) === J([0, 1, 0]) && m.n.etc[3] >= t0, m.n);
  save({ pageId: pid, deckId: deck, results: [{ id: 'etc', ok: true }, { id: 'mito', ok: false }] });
  m = S().mapMarks[pid];
  check('a second test adds up, and the last result is the newest', J(m.n.etc.slice(0, 3)) === J([1, 1, 1]) && J(m.n.mito.slice(0, 3)) === J([1, 1, 0]), m.n);
  const marks = store.marksOf(pid);
  check('marksOf reads them as a Map', marks.n instanceof Map && marks.n.size === 3 && J(marks.n.get('etc').slice(0, 3)) === J([1, 1, 1]) && marks.deck === deck);
  check('marksOf of a page with none is null', store.marksOf('pnone0001') === null);

  // ---------- pruning to the ideas the page has ----------
  save({ pageId: pid, deckId: deck, results: [{ id: 'krebs', ok: true }], ids: ['mito', 'krebs', 'nucleus'] });
  m = S().mapMarks[pid];
  check('ids drops the marks of ideas the page no longer has', J(Object.keys(m.n).sort()) === J(['krebs', 'mito']), Object.keys(m.n));

  // ---------- what is never stored ----------
  save({ pageId: pid, deckId: deck, results: [{ id: '__proto__', ok: true }, { id: 'constructor', ok: false }, { id: 'has space', ok: true }, { id: 'x'.repeat(41), ok: true }, { id: 'e:a>b>c', ok: true }, { id: 42, ok: true }, null] });
  m = S().mapMarks[pid];
  check('keys that aren’t ids, or that JavaScript keeps, are never stored', J(Object.keys(m.n).sort()) === J(['krebs', 'mito']) && Object.getPrototypeOf(m.n) === Object.prototype, Object.keys(m.n));
  check('a page id that isn’t one is refused', (caught(() => save({ pageId: '../x', deckId: deck, results: [] })) || {}).message === 'No such page');
  check('…and a deck that isn’t the learner’s', (caught(() => save({ pageId: pid, deckId: 'dnope', results: [] })) || {}).message === 'No such deck');

  // ---------- caps ----------
  const many = Array.from({ length: 350 }, (_, i) => ({ id: 'i' + i, ok: i % 2 === 0 }));
  save({ pageId: 'pbig00001', deckId: deck, results: many.slice(0, 200) });
  save({ pageId: 'pbig00001', deckId: deck, results: many.slice(200) });
  m = S().mapMarks.pbig00001;
  check('a page keeps at most 300 marks, the newest', Object.keys(m.n).length === store.MAP_MARKS.keys && 'i349' in m.n && 'i200' in m.n, Object.keys(m.n).length);
  for (let i = 0; i < 105; i++) { S().mapMarks['pold' + String(i).padStart(5, '0')] = { deck, at: 1000 + i, n: { a: [1, 0, 1, 1000 + i] } }; }
  save({ pageId: pid, deckId: deck, results: [{ id: 'mito', ok: true }] });
  const kept = Object.keys(S().mapMarks);
  check('the library keeps at most 100 pages, the ones tested longest ago go first', kept.length === store.MAP_MARKS.pages && kept.includes(pid) && kept.includes('pbig00001') && !kept.includes('pold00000') && kept.includes('pold00104'), kept.length);

  // ---------- never a page version ----------
  const page = await pages.create(null, { scope: 'deck', scopeId: deck, kind: 'mindmap', title: 'Map', data: { root: { id: 'cell', label: 'Cell', children: [{ id: 'mito', label: 'Mito' }] } } });
  save({ pageId: page.id, deckId: deck, results: [{ id: 'mito', ok: false }] });
  check('a save never makes a page version', (await pages.get(null, page.id)).version === 1 && (await pages.versions(null, page.id)).length === 1);

  // ---------- dropping ----------
  store.apply({ type: 'mapmarks.drop', pageId: page.id });
  check('mapmarks.drop: a page’s marks go', !(page.id in S().mapMarks));
  check('…dropping a page with none is fine', !caught(() => store.apply({ type: 'mapmarks.drop', pageId: 'pnone0001' })));
  // page.gone (the server, when a page is deleted): its marks, and the old Figures mind map it was moved from, go; nothing else does
  save({ pageId: page.id, deckId: deck, results: [{ id: 'mito', ok: true }] });
  const dk = S().decks.find(x => x.id === deck);
  dk.diagrams = [{ id: 'gmap1', kind: 'mindmap', name: 'Map', pageId: page.id, tree: { text: 'Cell' } }, { id: 'gmap2', kind: 'mindmap', name: 'Other map', pageId: 'pelse0001', tree: { text: 'X' } }, { id: 'gtab1', kind: 'table', name: 'T', pageId: page.id, table: { columns: ['A', 'B'], rows: [['x', 'y']] } }];
  const studied = store.apply({ type: 'deck.add', name: 'Theirs' }).id, sd = S().decks.find(x => x.id === studied);
  sd.diagrams = [{ id: 'gs1', kind: 'mindmap', name: 'Theirs', pageId: page.id, tree: { text: 'T' } }]; sd.link = { id: 's1', mode: 'study', owner: { name: 'Maria' } };
  store.apply({ type: 'page.gone', pageId: page.id });
  check('page.gone: the page’s marks go', !(page.id in S().mapMarks));
  check('…and the mind map moved into it, only that', J(dk.diagrams.map(g => g.id)) === J(['gmap2', 'gtab1']), dk.diagrams.map(g => g.id));
  check('…never on a deck studied from someone', sd.diagrams.length === 1);
  check('…a page id that isn’t one does nothing', !caught(() => store.apply({ type: 'page.gone', pageId: '../x' })));
  dk.diagrams = []; S().decks.splice(S().decks.indexOf(sd), 1);
  const f = store.apply({ type: 'folder.add', name: 'Bio' }).id;
  save({ pageId: 'pfold0001', deckId: f, results: [{ id: 'a', ok: true }] });
  check('a folder’s page can have marks', 'pfold0001' in S().mapMarks);
  store.apply({ type: 'folder.delete', id: f });
  check('…and they go with the folder', !('pfold0001' in S().mapMarks));
  const other = store.apply({ type: 'deck.add', name: 'Other' }).id;
  save({ pageId: 'pother001', deckId: other, results: [{ id: 'a', ok: true }] });
  store.apply({ type: 'deck.delete', id: deck });
  const left = Object.keys(S().mapMarks);
  check('deck.delete drops its pages’ marks, and only those', J(left) === J(['pother001']), left.length);
  store.apply({ type: 'data.reset' });
  check('Delete my data drops them all', J(S().mapMarks) === '{}');
} catch (e) { fail++; console.log('  FAIL (threw) ' + (e.stack || e.message)); }
finally { rmSync(DIR, { recursive: true, force: true }); }

console.log('mapmarks: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
