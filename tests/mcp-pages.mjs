// Step 4's server side for mind maps (design/specs/step4-maps.md §3, §6.1, §7, §8.4): what AI apps read and write over MCP, the study
// block they tutor from, the mind maps made from cards moving into Pages (web/mapmove.mjs), Lucida AI making a Mind map page
// (web/diagrams.mjs), and a shared deck's map pages (web/social.mjs mapsCopy).
//   - the help strings are the spec's §3.2 words, read from the spec itself, once every kind is ready; with only the mind map ready
//     (step 4a), what they say follows PAGE_READY;
//   - create_page and update_page take text or data, answer with the page as saved (text with every id), repair and warn, check card
//     ids against the deck, keep what the learner owns on an AI write, and refuse a stale baseVersion with the page as text;
//   - get_page gives a map's text, its study block (after Test me marks) and its cards, weak by sched.js toneOf; list_pages says when
//     a map was tested; add_cards answers with the new ids; delete_page drops the page's marks;
//   - a Note refuses a map's data; an AI update keeps the learner's card links unchecked; a deleted moved map's old Figures record goes;
//     /api/action refuses the server's own actions and keeps Test me marks under the page's own deck; get_page and /api/state move maps;
//     Make diagram makes a page only for an app that says it opens one (`pages: true`); mapPagesOf's `from` is always an old record.
// PAGE_READY is still ['note'] in web/pages.mjs; the tests make 'mindmap' (and for the final help strings 'diagram') ready for a while.
// It runs the worktree's server in this process on port 3610 (127.0.0.1), with its data in a new folder that goes afterwards, and
// answers for the AI (OpenRouter) itself.
//   node tests/mcp-pages.mjs            (prints each failure, then "mcp-pages: N passed, M failed"; exits 1 on a failure)
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';

const DIR = mkdtempSync(join(tmpdir(), 'lucida-mcp-pages-'));
process.env.STEALTH_DATA = DIR + '/';
delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.LUCIDA_MCP_LOGIN; delete process.env.LUCIDA_PLAN;
process.env.OPENROUTER_API_KEY = 'test'; process.env.OPENROUTER_BASE = 'http://ai.test/v1';
const PORT = 3610, BASE = 'http://127.0.0.1:' + PORT;

const store = await import('../web/store.mjs');
const { handle } = await import('../web/handler.mjs');
const pages = await import('../web/pages.mjs');
const { mapsCopy, mapPagesOf } = await import('../web/social.mjs');
const maps = (await import('../web/maps.js')).default;

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 600) : '')); }
}
const J = x => JSON.stringify(x);
const S = () => store.state();

// ---------- the spec's own words (§3.2) ----------
const SPEC = readFileSync(new URL('../design/specs/step4-maps.md', import.meta.url), 'utf8');
const block = SPEC.slice(SPEC.indexOf('```js\nconst MINDMAP_HELP') + 6, SPEC.indexOf('```', SPEC.indexOf('```js\nconst MINDMAP_HELP') + 6));
const HELPS = new Function(block + '; return { MINDMAP_HELP, DIAGRAM_HELP, FIX_HELP };')();
const NOTE_HELP = 'A Note’s blocks, each an object with a type (keep an existing block’s id when you change it; new ones get one): ' +
  '{type:"heading", level:1|2|3, text} · {type:"text", text} · {type:"list", style:"bullet"|"number"|"todo", items:[{text, checked?, items?}]} · ' +
  '{type:"callout", style:"trap"|"pearl"|"mnemonic"|"note", title?, text} (a trap: a mistake students make; a pearl: a high-yield fact; a mnemonic: a memory aid) · ' +
  '{type:"chain", steps:["Glycolysis","Pyruvate","Krebs cycle"]} (a → b → c sequence) · {type:"toggle", title, blocks:[...]} (folds; put answers and details inside) · ' +
  '{type:"table", header:["Stage","Where"], rows:[["Glycolysis","Cytoplasm"]]} · {type:"quote", text} · {type:"code", lang, text} · {type:"image", src, alt} · {type:"divider"} · ' +
  '{type:"card", cardId} (shows one of the deck’s cards; list_cards gives ids) · {type:"embed", pageId} (shows another page inside; a mind map or a diagram shows as its live picture). ' +
  'text, title, steps and cells are Markdown inside a line (**bold**, *italic*, `code`, [links](https://…)). In Markdown instead: ":::trap", ":::pearl", ":::mnemonic", ":::note" or ":::toggle Title" then lines then ":::", ":::chain" then one step a line then ":::", and "::card <id>" or "::page <id>" on a line. ' +
  'Example: [{"type":"heading","level":1,"text":"Cellular respiration"},{"type":"chain","steps":["Glycolysis","Krebs cycle","Electron transport"]},{"type":"callout","style":"trap","text":"Glycolysis needs no oxygen."}]';
const quoted = head => { const i = SPEC.indexOf(head), line = SPEC.slice(SPEC.indexOf('\n> ', i) + 3, SPEC.indexOf('\n', SPEC.indexOf('\n> ', i) + 3)); return new Function('NOTE_HELP', 'MINDMAP_HELP', 'DIAGRAM_HELP', 'FIX_HELP', 'return ' + line + ';')(NOTE_HELP, HELPS.MINDMAP_HELP, HELPS.DIAGRAM_HELP, HELPS.FIX_HELP); };
const WANT = { list_pages: quoted('**`list_pages`:**'), get_page: quoted('**`get_page`:**'), create_page: quoted('**`create_page`:**'), update_page: quoted('**`update_page`**'), instructions: quoted('**Server instructions**') };

// ---------- the AI's answers (diagrams.mjs asks OpenRouter; here it is this test) ----------
let aiAnswer = null, aiAsked = [];
const realFetch = globalThis.fetch;
// (diagrams.mjs logs what each AI answer cost; these answers cost nothing)
const realLog = console.log;
console.log = (...a) => { if (!(typeof a[0] === 'string' && a[0].startsWith('diagrams test'))) realLog(...a); };
globalThis.fetch = async (url, o) => {
  if (String(url).startsWith('http://ai.test/')) {
    aiAsked.push(JSON.parse(o.body));
    return new Response(J({ model: 'test', choices: [{ finish_reason: 'stop', message: { content: J(aiAnswer) } }], usage: {} }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, o);
};

store.load();
const server = createServer(handle);
await new Promise((ok, no) => { server.once('error', no); server.listen(PORT, '127.0.0.1', ok); });
const api = async (path, body) => {
  const r = await fetch(BASE + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) } : {});
  return { status: r.status, j: await r.json().catch(() => ({})) };
};
let rpc = 0;
const call = async (method, params) => {
  const r = await fetch(BASE + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: J({ jsonrpc: '2.0', id: ++rpc, method, params }) });
  return (await r.json()).result;
};
const tool = async (name, args) => {
  const res = (await call('tools/call', { name, arguments: args })) || {};
  const parts = (res.content || []).map(c => c.text), txt = parts.join('\n');
  let j = null; try { j = JSON.parse(parts[parts.length - 1]); } catch { j = null; }
  return { error: !!res.isError, text: txt, parts, j };
};
const listed = async () => Object.fromEntries(((await call('tools/list', {})) || { tools: [] }).tools.map(t => [t.name, t]));
const whileReady = async (kinds, fn) => { const added = kinds.filter(k => !pages.PAGE_READY.has(k)); added.forEach(k => pages.PAGE_READY.add(k)); try { return await fn(); } finally { added.forEach(k => pages.PAGE_READY.delete(k)); } };
const deckOf = name => S().decks.find(d => d.name === name);
const cardsOf = name => S().cards.filter(c => c.deckId === deckOf(name).id);

try {
  // ---------- the help strings ----------
  check('PAGE_READY is still just the note', J([...pages.PAGE_READY]) === J(['note']), [...pages.PAGE_READY]);
  check('the spec’s helps were read', HELPS.MINDMAP_HELP.startsWith('MIND MAP') && HELPS.DIAGRAM_HELP.startsWith('DIAGRAM') && HELPS.FIX_HELP.startsWith('Lucida fixes'));
  await whileReady(['mindmap', 'diagram'], async () => {
    const T = await listed();
    for (const k of ['list_pages', 'get_page', 'create_page', 'update_page']) check('every kind ready: ' + k + ' says the spec’s words (§3.2)', T[k].description === WANT[k], { got: T[k].description.slice(0, 300), want: WANT[k].slice(0, 300) });
    check('…create_page’s kind enum is [...READY]', J(T.create_page.inputSchema.properties.kind.enum) === J(['note', 'mindmap', 'diagram']), T.create_page.inputSchema.properties.kind);
    check('…its text and data (§3.3)', T.create_page.inputSchema.properties.text.description === 'A Mind map as an indented list, or a Diagram as arrow lines (see above). A Note’s Markdown works here too.' && T.create_page.inputSchema.properties.data.description === 'A Mind map’s {root} or a Diagram’s {direction, nodes, edges}.', T.create_page.inputSchema.properties);
    check('…update_page takes text and data too', ['page', 'baseVersion', 'title', 'summary', 'blocks', 'markdown', 'text', 'data'].every(k => k in T.update_page.inputSchema.properties), Object.keys(T.update_page.inputSchema.properties));
    const init = await call('initialize', { protocolVersion: '2025-06-18', clientInfo: { name: 'Claude' } });
    check('…the instructions’ pages sentence and the one meaning of weak', init.instructions.endsWith(' ' + WANT.instructions + ' A weak card is one whose recall is low now, not one ever forgotten.'), init.instructions.slice(-700));
  });
  await whileReady(['mindmap'], async () => {
    const T = await listed(), c = T.create_page.description;
    const core = HELPS.MINDMAP_HELP.replace(' Steps, causes and links across branches belong in a Diagram.', '');
    check('4a: create_page has the mind map’s help, without the Diagram’s', core !== HELPS.MINDMAP_HELP && c.includes(core + ' Lucida fixes') && !c.includes('DIAGRAM (kind') && !c.includes('belong in a Diagram'), c.slice(0, 300));
    check('4a: kind is note or mindmap; the rest are coming', c.includes('kind is "note" (explanations) or "mindmap" (a topic broken into its ideas); presentations, diagrams, canvases and docs are coming.'), c.slice(0, 300));
    check('4a: FIX_HELP without arrows', c.includes('Lucida fixes what it can (a repeated id, a label too long, too many ideas, card ids that aren’t the deck’s) and lists what it changed in warnings; the answer gives the page as saved, as text with every id.'));
    check('4a: kind enum', J(T.create_page.inputSchema.properties.kind.enum) === J(['note', 'mindmap']));
    check('4a: update_page doesn’t repeat the helps', !T.update_page.description.includes('MIND MAP (kind') && T.update_page.description.includes('On a Mind map, an idea you leave out is deleted with everything under it'), T.update_page.description);
    check('4a: get_page’s format enum', J(T.get_page.inputSchema.properties.format.enum) === J(['blocks', 'markdown', 'text', 'json']));
    // (§13 risk: the tool descriptions grow; create_page carries each kind's help once)
    check('4a: create_page’s description stays under 6,000 characters', c.length < 6000, c.length);
    const all = J(Object.values(T));
    check('4a: every tool listed stays under 45,000 characters', all.length < 45000, all.length);
  });
  {
    const T = await listed();
    check('note only: create_page offers no map content', !('text' in T.create_page.inputSchema.properties) && !('data' in T.create_page.inputSchema.properties) && J(T.create_page.inputSchema.properties.kind.enum) === J(['note']), T.create_page.inputSchema);
    check('note only: no map help', !T.create_page.description.includes('MIND MAP') && T.create_page.description.includes('presentations, mind maps, diagrams, canvases and docs are coming'), T.create_page.description.slice(0, 200));
  }

  // ---------- a deck with cards ----------
  check('a deck', !(await tool('create_deck', { name: 'Cell Biology' })).error);
  const added = await tool('add_cards', { deck: 'Cell Biology', cards: [{ front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix' }, { front: 'Where does electron transport happen?', back: 'The inner mitochondrial membrane' }, { front: 'What makes ribosomes?', back: 'The nucleolus' }] });
  const [c1, c2, c3] = cardsOf('Cell Biology').map(c => c.id);
  check('add_cards answers with the new ids (§6.1 row 10)', added.text === 'Added 3 cards to Cell Biology. Their ids: ' + [c1, c2, c3].join(', ') + '.', added.text);
  const one = await tool('add_cards', { deck: 'Cell Biology', cards: [{ front: 'What holds the DNA?', back: 'The nucleus' }] }), c4 = cardsOf('Cell Biology')[3].id;
  check('…one card: its id (while only Notes are ready, nothing about linking ideas)', one.text === 'Added 1 card to Cell Biology. Its id: ' + c4 + '.', one.text);
  check('another deck', !(await tool('create_deck', { name: 'Other' })).error);
  await tool('add_cards', { deck: 'Other', cards: [{ front: 'Other?', back: 'Yes' }] });
  const other = cardsOf('Other')[0].id;

  await whileReady(['mindmap'], async () => {
    // ---------- create_page with text ----------
    const TEXT = 'The cell {#cell}\n- Mitochondria {#mito cards:' + c1 + ',c99}\n  > Most ATP is made on the inner membrane.\n  - Krebs cycle in the matrix {#krebs cards:' + c1 + '}\n  - Electron transport {#etc cards:' + c2 + ',' + other + '}\n- Nucleus\n  - Holds the DNA\n  - Nucleolus makes ribosomes {cards:' + c3 + '}';
    let t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'The cell at a glance', text: TEXT });
    check('create_page with text', !t.error && t.j && t.j.made && t.j.made.kind === 'mindmap' && t.j.made.version === 1 && t.j.made.deck === 'Cell Biology', t.text);
    const pid = t.j.made.id;
    check('…answers with its text, every id in it (§3.5)', t.j.text === 'The cell {#cell}\n- Mitochondria {#mito cards:' + c1 + '}\n  > Most ATP is made on the inner membrane.\n  - Krebs cycle in the matrix {#krebs cards:' + c1 + '}\n  - Electron transport {#etc cards:' + c2 + '}\n- Nucleus {#nucleus}\n  - Holds the DNA {#holds-the-dna}\n  - Nucleolus makes ribosomes {#nucleolus-makes-ribosomes cards:' + c3 + '}', t.j.text);
    check('…card ids that aren’t the deck’s are left out, with a warning', J(t.j.warnings) === J(['Left out 2 card ids that aren’t this deck’s cards: c99, ' + other + '.']), t.j.warnings);
    check('…its link and what to do next', t.j.link === 'https://lucida.cards/page/' + pid && t.j.note === 'The learner sees it in Cell Biology › Pages now. Change it with update_page and baseVersion 1.', t.j);

    // ---------- create_page with data ----------
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'From data', data: { root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', note: 'ATP.', cards: [c1] }, 'Nucleus', { text: 'Ribosomes' }] } } });
    check('create_page with data: ids kept, string children and text as label read', !t.error && t.j.text === 'The cell {#cell}\n- Mitochondria {#mito cards:' + c1 + '}\n  > ATP.\n- Nucleus {#nucleus}\n- Ribosomes {#ribosomes}', t.text);
    check('…cards read as cardIds, with a warning', t.j.warnings && t.j.warnings.includes('Read “cards” as cardIds on 1 idea.'), t.j.warnings);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'Legacy', data: { tree: { text: 'Cell', children: [{ text: 'Nucleus', children: [{ text: 'DNA' }] }] } } });
    check('…the old {tree} shape', !t.error && t.j.text === 'Cell {#cell}\n- Nucleus {#nucleus}\n  - DNA {#dna}', t.text);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'JSON string', data: '{"label":"Cell","children":["A","B"]}' });
    check('…a JSON string', !t.error && t.j.text === 'Cell {#cell}\n- A {#a}\n- B {#b}', t.text);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'Empty' });
    check('…nothing sent: the starting value (the page’s title shows as the topic)', !t.error && t.j.text === maps.textOf('mindmap', maps.emptyOf('mindmap')), t.text);

    // ---------- refusals (§3.7) ----------
    const before = (await pages.list(null, 'deck', deckOf('Cell Biology').id)).length;
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'Two', text: 'A\n- B', data: { root: { label: 'A' } } });
    check('two contents are refused', t.error && t.text === 'Send the content one way: text or data (a Note: blocks or markdown), not both. Nothing was saved.', t.text);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'Blocks', blocks: [{ type: 'text', text: 'Hi' }] });
    check('a Note’s blocks are refused (shape, the AI app’s words)', t.error && t.text === 'This page is a Mind map: send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.', t.text);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'mindmap', title: 'Numbers', data: [1, 2] });
    check('something that isn’t a mind map is refused', t.error && t.text === 'That isn’t a mind map: send text (an indented list, the topic first) or data ({"root": …}). Nothing was saved.', t.text);
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'diagram', title: 'No', text: 'a -> b' });
    check('a kind that isn’t ready', t.error && t.text === pages.notReady('diagram'), t.text);
    check('no page was made by the refusals', (await pages.list(null, 'deck', deckOf('Cell Biology').id)).length === before);

    // ---------- update_page: ids kept, what the learner owns kept ----------
    t = await tool('update_page', { page: pid, baseVersion: 1, text: 'The cell\n- Mitochondria\n  - Krebs cycle in the matrix\n  - Electron transport\n  - ATP synthase\n- Nucleus\n  - Holds the DNA' });
    check('update_page with text, no ids', !t.error && t.j.saved.version === 2, t.text);
    check('…ideas matched by their words keep their ids, notes and cards; the one left out is gone', t.j.text === 'The cell {#cell}\n- Mitochondria {#mito cards:' + c1 + '}\n  > Most ATP is made on the inner membrane.\n  - Krebs cycle in the matrix {#krebs cards:' + c1 + '}\n  - Electron transport {#etc cards:' + c2 + '}\n  - ATP synthase {#atp-synthase}\n- Nucleus {#nucleus}\n  - Holds the DNA {#holds-the-dna}', t.j.text);
    check('…and says so', t.j.warnings && t.j.warnings.includes('Matched 6 ideas without ids to the old ones by their words.') && t.j.note === 'Saved as version 2.', t.j);
    const vs = await pages.versions(null, pid);
    check('…Lucida wrote what changed as the summary', vs[0].summary === 'Added “ATP synthase” under Mitochondria and deleted “Nucleolus makes ribosomes”', vs[0].summary);
    t = await tool('update_page', { page: pid, baseVersion: 2, text: 'The cell {#cell}\n- Mitochondria {#mito cards:}\n  >\n  - Krebs cycle in the matrix {#krebs}\n  - Electron transport {#etc}\n  - ATP synthase {#atp-synthase}\n- Nucleus {#nucleus}\n  - Holds the DNA {#holds-the-dna cards:' + c4 + '}', summary: 'Linked the DNA card' });
    check('a lone ">" and an empty cards: clear; cards left out stay', !t.error && t.j.text === 'The cell {#cell}\n- Mitochondria {#mito}\n  - Krebs cycle in the matrix {#krebs cards:' + c1 + '}\n  - Electron transport {#etc cards:' + c2 + '}\n  - ATP synthase {#atp-synthase}\n- Nucleus {#nucleus}\n  - Holds the DNA {#holds-the-dna cards:' + c4 + '}', t.text);
    check('…its summary is kept', (await pages.versions(null, pid))[0].summary === 'Linked the DNA card');
    t = await tool('update_page', { page: pid, baseVersion: 3, data: { root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', note: null }, { id: 'nucleus', label: 'Nucleus', cardIds: [] }] } } });
    check('update_page with data (null and [] clear; the rest is deleted)', !t.error && t.j.text === 'The cell {#cell}\n- Mitochondria {#mito}\n- Nucleus {#nucleus}', t.text);
    t = await tool('update_page', { page: pid, baseVersion: 4, title: 'The cell, renamed' });
    check('a title alone changes only the title', !t.error && t.j.saved.title === 'The cell, renamed' && t.j.text === 'The cell {#cell}\n- Mitochondria {#mito}\n- Nucleus {#nucleus}', t.text);
    t = await tool('update_page', { page: pid, baseVersion: 5, text: TEXT.replace(',c99', '') });
    check('back to the first map', !t.error && t.j.saved.version === 6, t.text);

    // ---------- a stale baseVersion (§8.4) ----------
    t = await tool('update_page', { page: pid, baseVersion: 2, text: 'Nope' });
    check('a stale baseVersion is refused', t.error && t.parts[0] === 'This page changed since version 2: it is at version 6 now (Claude). Read it again, merge your change into it, and save with baseVersion 6.', t.parts[0]);
    check('…with the page as it is now, as text with every id', t.j && t.j.version === 6 && t.j.text.startsWith('The cell {#cell}\n- Mitochondria {#mito cards:' + c1 + '}') && t.j.study, t.parts[1] && t.parts[1].slice(0, 300));
    check('…and nothing was saved', (await pages.get(null, pid)).version === 6);
    t = await tool('update_page', { page: pid, baseVersion: 6, blocks: [{ type: 'text', text: 'x' }] });
    check('update_page refuses a Note’s blocks', t.error && /blocks are a Note’s/.test(t.text) && (await pages.get(null, pid)).version === 6, t.text);
    t = await tool('update_page', { page: pid, baseVersion: 6, markdown: '# A', data: { root: { label: 'A' } } });
    check('update_page refuses two contents', t.error && /^Send the content one way/.test(t.text), t.text);

    // ---------- get_page and the study block (§3.6) ----------
    const d = deckOf('Cell Biology'), now = Date.now();
    let g = await tool('get_page', { page: pid });
    check('get_page: a map comes as text, with ideas and how to change it', !g.error && g.j.text === maps.textOf('mindmap', (await pages.get(null, pid)).data) && g.j.ideas === 7 && g.j.link === 'https://lucida.cards/page/' + pid && g.j.to_change === 'update_page with baseVersion 6 and the whole map as text or data.', g.j);
    check('…no data unless asked (format json)', !('data' in g.j) && J((await tool('get_page', { page: pid, format: 'json' })).j.data) === J((await pages.get(null, pid)).data));
    check('…before any test: nothing tested', g.j.study.tests === 0 && !g.j.study.last_tested && g.j.study.not_tested === 6 && g.j.study.no_cards === 2 && J(g.j.study.weak) === '[]' && !g.j.tested, g.j.study);
    check('…its cards, each with the ideas it tests', J(g.j.cards[c1].on) === J(['mito', 'krebs']) && J(g.j.cards[c2].on) === J(['etc']) && g.j.cards[c1].front === 'Where does the Krebs cycle happen?' && g.j.cards[c1].weak === false, g.j.cards);
    // a card the learner keeps forgetting (relearning) is weak; one forgotten once long ago and remembered now isn't (sched.js toneOf)
    const card = id => S().cards.find(c => c.id === id);
    Object.assign(card(c2).srs, { state: 'relearning', reps: 9, lapses: 3, s: 2, last: now - 86400000, due: now });
    Object.assign(card(c1).srs, { state: 'review', reps: 6, lapses: 1, s: 400, last: now - 86400000, due: now + 300 * 86400000 });
    store.apply({ type: 'mapmarks.save', pageId: pid, deckId: d.id, results: [{ id: 'etc', ok: false }, { id: 'krebs', ok: true }, { id: 'nucleus', ok: true }], ids: maps.pathsOf((await pages.get(null, pid)).data).map(x => x.id) });
    store.apply({ type: 'mapmarks.save', pageId: pid, deckId: d.id, results: [{ id: 'etc', ok: false }, { id: 'holds-the-dna', ok: false }, { id: 'mito', ok: true }] });
    g = await tool('get_page', { page: pid });
    const st = g.j.study, today = new Date(); const ymd = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    check('after marks: when and how often', st.last_tested === ymd && st.tests === 2 && g.j.tested === ymd, st);
    check('…what they missed, worst first, each with its path', J(st.weak.map(w => w.id)) === J(['etc', 'holds-the-dna']) && st.weak[0].path === 'The cell › Mitochondria › Electron transport' && st.weak[0].missed === 2 && st.weak[0].knew === 0 && J(st.weak[0].cards) === J([c2]), st.weak);
    check('…the weakest branches', J(st.weak_branches) === J([{ id: 'mito', label: 'Mitochondria', weak: 1 }, { id: 'nucleus', label: 'Nucleus', weak: 1 }]), st.weak_branches);
    check('…what no test covers yet, and what no card covers', st.not_tested === 1 && st.no_cards === 2, st);
    check('…weak follows toneOf (the one meaning of weak)', g.j.cards[c2].weak === true && g.j.cards[c1].weak === false && g.j.cards[c2].lapses === 3, g.j.cards);
    // a weak card makes its idea weak even when the test went well: sorted after what was missed
    Object.assign(card(c1).srs, { state: 'relearning' });
    g = await tool('get_page', { page: pid });
    check('…missed last time first, then ideas with weak cards', J(g.j.study.weak.map(w => w.id)) === J(['etc', 'holds-the-dna', 'mito', 'krebs']), g.j.study.weak.map(w => w.id));
    Object.assign(card(c1).srs, { state: 'review' });
    const lp = await tool('list_pages', { deck: 'Cell Biology' });
    check('list_pages: a tested map says when (§3.2 pageLine)', lp.j.pages.find(p => p.id === pid).tested === ymd && !lp.j.pages.find(p => p.title === 'Legacy').tested, lp.j.pages);
    const ap = await api('/api/pages?scope=deck&id=' + d.id);
    check('the app’s Pages list carries when it was tested (§9.2)', ap.j.pages.find(p => p.id === pid).tested > now - 60000, ap.j.pages.find(p => p.id === pid));

    // ---------- a Note: weak by toneOf, embeds ----------
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'note', title: 'Notes', blocks: [{ type: 'text', text: 'See the map.' }, { type: 'embed', pageId: pid }, { type: 'card', cardId: c2 }] });
    const nid = t.j.made.id;
    check('a Note’s write answer has no map text', !t.error && !('text' in t.j) && t.j.link === 'https://lucida.cards/page/' + nid, t.j);
    g = await tool('get_page', { page: nid });
    check('a Note lists the pages it shows inside (embeds)', J(g.j.embeds) === J({ [pid]: { title: 'The cell, renamed', kind: 'mindmap' } }), g.j.embeds);
    check('…its cards are weak by toneOf too', g.j.cards[c2].weak === true && !('on' in g.j.cards[c2]), g.j.cards);
    check('…format text is Markdown', typeof (await tool('get_page', { page: nid, format: 'text' })).j.markdown === 'string');
    // a Note takes blocks or markdown only: a map's data would have saved an empty Note over the learner's
    const kn = (await tool('create_page', { deck: 'Cell Biology', kind: 'note', title: 'Krebs notes', markdown: '# Krebs\nLong learner notes here.' })).j.made.id;
    t = await tool('update_page', { page: kn, baseVersion: 1, data: { root: { label: 'Krebs', children: ['A'] } } });
    const kp = await pages.get(null, kn);
    check('update_page: a Note refuses a map’s data, and keeps its words', t.error && t.text === 'This page is a Note: send its content as blocks or markdown. Nothing was saved.' && kp.version === 1 && kp.data.blocks.length === 2, { t: t.text, v: kp.version });
    const nBefore = (await pages.list(null, 'deck', d.id)).length;
    t = await tool('create_page', { deck: 'Cell Biology', kind: 'note', title: 'Wrong', data: { root: { label: 'A' } } });
    check('create_page: a Note refuses a map’s data, and makes nothing', t.error && t.text === 'This page is a Note: send its content as blocks or markdown. Nothing was saved.' && (await pages.list(null, 'deck', d.id)).length === nBefore, t.text);
    t = await tool('update_page', { page: kn, baseVersion: 1, data: { markdown: '# Krebs\nMore notes.' } });
    check('…a Note’s data as {markdown} still works', !t.error && t.j.saved.version === 2, t.text);

    // ---------- a page in a folder ----------
    store.apply({ type: 'deck.update', id: d.id, patch: { folder: store.apply({ type: 'folder.add', name: 'Biology' }).id } });
    t = await tool('create_page', { folder: 'Biology', kind: 'mindmap', title: 'Folder map', text: 'Biology\n- Cells {cards:' + c1 + ',' + other + '}' });
    check('a map in a folder: its decks’ cards are kept, the others left out', !t.error && t.j.made.folder === 'Biology' && t.j.text === 'Biology {#biology}\n- Cells {#cells cards:' + c1 + '}' && J(t.j.warnings) === J(['Left out 1 card id that isn’t this folder’s cards: ' + other + '.']), t.text);

    // the learner's card links stay when an AI update leaves them out, even ones no longer in the folder's decks (§2.1 AI-keep); only what
    // the AI app sends is checked
    const fp = t.j.made.id, bio = d.folder;
    store.apply({ type: 'deck.update', id: d.id, patch: { folder: null } });
    t = await tool('update_page', { page: fp, baseVersion: 1, text: 'Biology {#biology}\n- Cells {#cells}\n- New idea' });
    check('an AI update keeps the learner’s card links it left out, unchecked', !t.error && t.j.text === 'Biology {#biology}\n- Cells {#cells cards:' + c1 + '}\n- New idea {#new-idea}' && !t.j.warnings?.some(w => /^Left out/.test(w)), t.text);
    t = await tool('update_page', { page: fp, baseVersion: 2, text: 'Biology {#biology}\n- Cells {#cells}\n- New idea {#new-idea cards:' + c2 + '}' });
    check('…a card id the AI app adds is still checked', !t.error && t.j.text === 'Biology {#biology}\n- Cells {#cells cards:' + c1 + '}\n- New idea {#new-idea}' && J(t.j.warnings) === J(['Left out 1 card id that isn’t this folder’s cards: ' + c2 + '.']), t.text);
    store.apply({ type: 'deck.update', id: d.id, patch: { folder: bio } });
    const more = await tool('add_cards', { deck: 'Cell Biology', cards: [{ front: 'What do ribosomes make?', back: 'Proteins' }] });
    check('add_cards, once a map kind is ready: link it to a page’s ideas', more.text === 'Added 1 card to Cell Biology. Its id: ' + cardsOf('Cell Biology').at(-1).id + ' (link it to a page’s ideas with update_page).', more.text);

    // ---------- delete_page drops its marks ----------
    check('the page has marks', !!S().mapMarks[pid]);
    store.apply({ type: 'ai.perm', id: 'del', on: true });
    t = await tool('delete_page', { page: pid });
    check('delete_page', !t.error && !(await pages.get(null, pid)), t.text);
    check('…and its Test me marks go with it', !(pid in S().mapMarks), Object.keys(S().mapMarks));
  });

  // ---------- the mind maps made from cards move into Pages (§7.1) ----------
  {
    const d = store.makeDeck({ name: 'Legacy deck' });
    store.addDiagram(d.id, { kind: 'mindmap', name: 'The cell', at: Date.parse('2026-10-03T12:00:00'), from: { kind: 'all', value: '', label: 'All cards and notes' }, cards: 42, tree: { text: 'Cell', children: [{ text: 'Nucleus', children: [{ text: 'DNA' }] }, { text: 'Mitochondria' }] } });
    store.addDiagram(d.id, { kind: 'table', name: 'Organelles', table: { columns: ['A', 'B'], rows: [['x', 'y'], ['z', 'w']] } });
    const g0 = d.diagrams[0];
    await tool('list_pages', { deck: 'Legacy deck' });
    check('before the mind map is ready nothing moves', !d.diagramsMoved && !(await pages.list(null, 'deck', d.id)).length);
    await whileReady(['mindmap'], async () => {
      const r = await tool('list_pages', { deck: 'Legacy deck' });
      const list = await pages.list(null, 'deck', d.id);
      check('list_pages moves the made mind map into a page', list.length === 1 && list[0].kind === 'mindmap' && list[0].title === 'The cell' && list[0].by === 'Lucida' && r.j.pages.length === 1, list);
      const p = await pages.get(null, list[0].id);
      check('…its data from the old tree, with slug ids', maps.textOf('mindmap', p.data) === 'Cell {#cell}\n- Nucleus {#nucleus}\n  - DNA {#dna}\n- Mitochondria {#mitochondria}', p.data);
      check('…the deck says where it went, and the old record says its page', d.diagramsMoved && d.diagramsMoved.map[g0.id] === p.id && g0.pageId === p.id && g0.tree && d.diagrams.length === 2 && !d.diagrams[1].pageId, d.diagramsMoved);
      check('…the version says where it came from', (await pages.versions(null, p.id))[0].summary === 'Moved from Figures (made from 42 cards: All cards and notes, Oct 3)', (await pages.versions(null, p.id))[0]);
      await tool('list_pages', { deck: 'Legacy deck' });
      await api('/api/pages?scope=deck&id=' + d.id);
      check('…once (listing again makes nothing)', (await pages.list(null, 'deck', d.id)).length === 1);

      // only the server applies the moves and a deleted page's leftovers; an app sending one is refused
      for (const type of ['diagrams.moved', 'guide.moved', 'page.gone']) {
        const rr = await api('/api/action', { type, deckId: d.id, map: { [d.diagrams[1].id]: 'pzzzzzzzz' }, main: 'pzzzzzzzz', pageId: p.id });
        check('/api/action refuses ' + type + ' from an app', rr.status === 400 && rr.j.error === 'Unknown action ' + type, rr);
      }
      store.apply({ type: 'diagrams.moved', deckId: d.id, map: { [d.diagrams[1].id]: 'pzzzzzzzz' } });
      check('…and even the server’s diagrams.moved never gives a table a page', !d.diagrams[1].pageId, d.diagrams[1]);
      // a Test me save is kept under the page's own deck, whatever the app said
      const od = deckOf('Other');
      let ra = await api('/api/action', { type: 'mapmarks.save', pageId: p.id, deckId: od.id, results: [{ id: 'cell', ok: true }] });
      check('mapmarks.save from the app: kept under the page’s own deck', ra.status === 200 && S().mapMarks[p.id] && S().mapMarks[p.id].deck === d.id, { r: ra.status, m: S().mapMarks[p.id] });
      ra = await api('/api/action', { type: 'mapmarks.save', pageId: 'pnotapage1', deckId: d.id, results: [{ id: 'cell', ok: true }] });
      check('…a page that isn’t there is refused', ra.status === 400 && ra.j.error === 'No such page' && !('pnotapage1' in S().mapMarks), ra);
      // a moved map whose page is deleted goes from Figures too (and from what the deck shares, and from an older app)
      const { sharedDiagram } = await import('../web/diagrams.mjs');
      check('before: the old record is shared', d.diagrams.map(sharedDiagram).filter(Boolean).some(x => x.id === g0.id));
      ra = await api('/api/pages', { op: 'delete', page: p.id });
      check('deleting the moved page drops its old Figures record and its marks', ra.status === 200 && !d.diagrams.some(x => x.id === g0.id) && d.diagrams.length === 1 && !(p.id in S().mapMarks), d.diagrams);
      check('…so the deck shares only its table', J(d.diagrams.map(sharedDiagram).filter(Boolean).map(x => x.kind)) === J(['table']));
      await tool('list_pages', { deck: 'Legacy deck' });
      check('…and it isn’t moved again', (await pages.list(null, 'deck', d.id)).length === 0 && d.diagramsMoved.map[g0.id] === p.id);

      // get_page and the app's /api/state move a deck's made mind maps too (§7.1)
      const d5 = store.makeDeck({ name: 'Legacy get' });
      store.addDiagram(d5.id, { kind: 'mindmap', name: 'Got', tree: { text: 'G', children: [{ text: 'A' }, { text: 'B' }] } });
      const n5 = await pages.create(null, { scope: 'deck', scopeId: d5.id, kind: 'note', title: 'A note' });
      check('get_page moves the deck’s made mind maps', !(await tool('get_page', { page: n5.id })).error && d5.diagramsMoved && d5.diagrams[0].pageId && (await pages.list(null, 'deck', d5.id)).some(x => x.kind === 'mindmap' && x.title === 'Got'), d5.diagramsMoved);
      const d6 = store.makeDeck({ name: 'Legacy state' });
      store.addDiagram(d6.id, { kind: 'mindmap', name: 'Stated', tree: { text: 'S', children: [{ text: 'A' }, { text: 'B' }] } });
      ra = await api('/api/state');
      check('/api/state moves them, so Figures already says where each went', ra.status === 200 && d6.diagrams[0].pageId && (ra.j.decks || []).find(x => x.id === d6.id)?.diagrams?.[0]?.pageId === d6.diagrams[0].pageId, d6.diagrams[0]);

      // an earlier try's page is taken up; Free's page limit doesn't stop a move; the app's Pages list moves them too
      const d2 = store.makeDeck({ name: 'Earlier' });
      store.addDiagram(d2.id, { kind: 'mindmap', name: 'Taken', tree: { text: 'T', children: [{ text: 'A' }, { text: 'B' }] } });
      store.addDiagram(d2.id, { kind: 'mindmap', name: 'New one', tree: { text: 'N', children: [{ text: 'A' }, { text: 'B' }] } });
      const earlier = await pages.create(null, { scope: 'deck', scopeId: d2.id, kind: 'mindmap', title: 'Taken', data: { root: { label: 'T' } }, who: 'Lucida' });
      for (let i = 0; i < 24; i++) await pages.create(null, { scope: 'deck', scopeId: d2.id, kind: 'note', title: 'N' + i, pro: false });
      store.apply({ type: 'settings.update', patch: { viewFree: true } });
      const r2 = await api('/api/pages?scope=deck&id=' + d2.id);
      store.apply({ type: 'settings.update', patch: { viewFree: false } });
      const l2 = await pages.list(null, 'deck', d2.id);
      check('the app’s Pages list moves them too, past Free’s 25 pages', r2.status === 200 && l2.length === 26 && l2.filter(p => p.kind === 'mindmap').length === 2, { status: r2.status, n: l2.length, e: r2.j.error });
      check('…an earlier try’s page is taken up, not made again', d2.diagramsMoved.map[d2.diagrams[0].id] === earlier.id && l2.filter(p => p.title === 'Taken').length === 1, d2.diagramsMoved);
      check('…oldest first, each its own page', d2.diagramsMoved.map[d2.diagrams[1].id] !== earlier.id && l2.some(p => p.title === 'New one'));
      const newOne = d2.diagrams[1];
      check('delete_page of a moved map drops its old Figures record too', !(await tool('delete_page', { page: newOne.pageId })).error && !d2.diagrams.includes(newOne) && d2.diagrams.length === 1);

      // a deck studied from someone keeps its owner's
      const d3 = store.makeDeck({ name: 'Studied' });
      d3.diagrams = [{ id: 'gs1', kind: 'mindmap', name: 'Theirs', at: 1, tree: { text: 'X', children: [{ text: 'A' }, { text: 'B' }] } }];
      d3.link = { id: 's1', mode: 'study', owner: { name: 'Maria' } };
      await tool('list_pages', { deck: 'Studied' });
      check('a deck studied from someone doesn’t move', !d3.diagramsMoved && !(await pages.list(null, 'deck', d3.id)).length);

      // a copy brings its owner's map pages: they become its own, linked to its cards; the old record they came from isn't made twice
      const d4 = store.makeDeck({ name: 'Copied' });
      const mine = store.apply({ type: 'card.add', deckId: d4.id, front: 'Q', back: 'A' }).ids[0];
      S().cards.find(c => c.id === mine).origin = 'cOwner1';
      d4.diagrams = [{ id: 'gold', kind: 'mindmap', name: 'Shared map', at: 1, tree: { text: 'Old', children: [{ text: 'A' }, { text: 'B' }] } }];
      d4.link = { id: 's2', mode: 'copy', owner: { name: 'Maria' } };
      d4.maps = mapsCopy({ maps: [{ id: 'pshared01', kind: 'mindmap', title: 'Shared map', from: 'gold', data: { root: { id: 'cell', label: 'The cell', children: [{ id: 'a', label: 'A', cardIds: ['cOwner1', 'cOwner2'] }] } } }] }, new Map([['cOwner1', mine]]));
      check('mapsCopy links the shared cards to the copy’s (and leaves out the rest)', J(d4.maps[0].data.root.children[0].cardIds) === J([mine]) && d4.maps[0].from === 'gold', d4.maps);
      await tool('list_pages', { deck: 'Copied' });
      const l4 = await pages.list(null, 'deck', d4.id);
      check('a copy’s shared map becomes its own page, once', l4.length === 1 && l4[0].title === 'Shared map' && d4.diagramsMoved.map.gold === l4[0].id && d4.diagrams[0].pageId === l4[0].id && !d4.maps, { l4, moved: d4.diagramsMoved });
      check('…linked to the copy’s card', J((await pages.get(null, l4[0].id)).data.root.children[0].cardIds) === J([mine]));
    });
  }

  // ---------- what a shared deck carries of its map pages (§7.4) ----------
  {
    const d = store.makeDeck({ name: 'Shared deck' });
    const [k1, k2] = store.apply({ type: 'card.add', deckId: d.id, front: 'A?', back: 'A' }).ids.concat(store.apply({ type: 'card.add', deckId: d.id, front: 'B?', back: 'B', pending: true }).ids);
    const p = await pages.create(null, { scope: 'deck', scopeId: d.id, kind: 'mindmap', title: 'Shared map', data: { root: { id: 'r', label: 'Root', children: [{ id: 'a', label: 'A', cardIds: [k1, k2, 'cElsewhere'] }, { id: 'b', label: 'B', cardIds: [k2] }] } } });
    await pages.create(null, { scope: 'deck', scopeId: d.id, kind: 'note', title: 'A note' });
    d.diagrams = [{ id: 'gOld', kind: 'mindmap', name: 'Shared map', at: 1, pageId: p.id, tree: { text: 'Root', children: [{ text: 'A' }, { text: 'B' }] } }];
    d.diagramsMoved = { at: 1, map: { gOld: p.id } };
    check('a map page isn’t shared before the apps can show it', (await mapPagesOf(null, d)).length === 0);
    await whileReady(['mindmap'], async () => {
      const out = await mapPagesOf(null, d);
      check('mapPagesOf: the deck’s map pages, with the old record they came from', out.length === 1 && out[0].id === p.id && out[0].kind === 'mindmap' && out[0].title === 'Shared map' && out[0].from === 'gOld', out);
      check('…card links only to cards that go out with the deck', J(out[0].data.root.children[0].cardIds) === J([k1]) && !('cardIds' in out[0].data.root.children[1]), out[0].data);
      // a copy's map also says which shared page it came from: `from` is still the old record, in either order
      d.diagramsMoved = { at: 1, map: { gOld: p.id, pshared99: p.id } };
      check('a copy’s map: from is the old record, not the shared page', (await mapPagesOf(null, d))[0].from === 'gOld');
      d.diagramsMoved = { at: 1, map: { pshared99: p.id, gOld: p.id } };
      check('…in either order', (await mapPagesOf(null, d))[0].from === 'gOld');
      d.diagramsMoved = { at: 1, map: { pshared99: p.id } };
      check('…and none when there is no old record', !('from' in (await mapPagesOf(null, d))[0]));
    });
  }

  // ---------- mapsCopy: what a shared deck's map pages become (§7.4) ----------
  {
    const g = { maps: [{ id: 'pabc1234', kind: 'mindmap', title: '<b>Cells</b>', data: { root: { id: 'c', label: 'Cells **bold**', children: [{ label: 'A', cardIds: ['x1'] }] } } }, { id: 'bad id', kind: 'mindmap', data: { root: { label: 'x' } } }, { id: 'pabc1235', kind: 'note', data: { blocks: [] } }, { id: 'pabc1236', kind: 'mindmap', data: { blocks: [] } }] };
    const out = mapsCopy(g);
    check('mapsCopy cleans again: titles, labels, ids; drops what isn’t a map', out.length === 1 && out[0].title === 'Cells' && out[0].data.root.label === 'Cells bold' && out[0].data.root.children[0].id === 'a' && J(out[0].data.root.children[0].cardIds) === J(['x1']), out);
    check('…at most 20', mapsCopy({ maps: Array.from({ length: 30 }, (_, i) => ({ id: 'pabcd' + String(i).padStart(3, '0'), kind: 'mindmap', data: { root: { label: 'X' } } })) }).length === 20);
  }

  // ---------- Lucida AI makes a Mind map page from the deck's cards (§7.3) ----------
  {
    const d = store.makeDeck({ name: 'AI deck' });
    const ids = store.apply({ type: 'card.add', deckId: d.id, front: 'Where is the Krebs cycle?', back: 'The matrix' }).ids
      .concat(store.apply({ type: 'card.add', deckId: d.id, front: 'Where is electron transport?', back: 'The inner membrane' }).ids)
      .concat(store.apply({ type: 'card.add', deckId: d.id, front: 'What holds the DNA?', back: 'The nucleus' }).ids);
    // the deck's notes are its Note pages once its Guide moved into them
    const note = await pages.create(null, { scope: 'deck', scopeId: d.id, kind: 'note', title: 'Guide', data: { markdown: 'Mitochondria make **ATP** on the inner membrane.' } });
    store.apply({ type: 'guide.moved', deckId: d.id, main: note.id, map: {} });
    aiAnswer = { title: 'The cell', root: { text: 'The cell', cards: [], children: [{ text: 'Mitochondria', cards: [1, 2], children: [{ text: 'Krebs cycle', cards: [1, 1, 99] }, { text: 'Electron transport', cards: [2] }] }, { text: 'Nucleus', cards: [3], children: [{ text: 'DNA', cards: [3] }] }] } };
    const usedBefore = (S().ai.dg && S().ai.dg.n) || 0;
    let r = await api('/api/diagrams/make', { deckId: d.id, type: 'mindmap' });
    check('before the mind map is ready, a made mind map stays in Figures', r.status === 200 && r.j.kind === 'mindmap' && r.j.id && !r.j.pageId && d.diagrams.length === 1, r);
    check('…the material’s notes came from the Note pages', aiAsked.length && aiAsked[aiAsked.length - 1].messages[1].content.includes('Mitochondria make ATP on the inner membrane.'), aiAsked.length && aiAsked[aiAsked.length - 1].messages[1].content.slice(-200));
    check('…and the AI was asked for each idea’s card lines', J(aiAsked[aiAsked.length - 1].response_format.json_schema.schema.properties.root.properties.children.items.required) === J(['text', 'cards', 'children']));
    await whileReady(['mindmap'], async () => {
      r = await api('/api/diagrams/make', { deckId: d.id, type: 'mindmap', pages: true });
      check('ready: Make diagram › Mind map makes a Mind map page and answers its id', r.status === 200 && /^p[a-z0-9]+$/.test(r.j.pageId || '') && r.j.kind === 'mindmap', r);
      const p = await pages.get(null, r.j.pageId);
      check('…made by Lucida, its ideas linked to the cards they came from', p.by === 'Lucida' && p.ai && p.title === 'The cell' && maps.textOf('mindmap', p.data) === 'The cell {#the-cell}\n- Mitochondria {#mitochondria cards:' + ids[0] + ',' + ids[1] + '}\n  - Krebs cycle {#krebs-cycle cards:' + ids[0] + '}\n  - Electron transport {#electron-transport cards:' + ids[1] + '}\n- Nucleus {#nucleus cards:' + ids[2] + '}\n  - DNA {#dna cards:' + ids[2] + '}', maps.textOf('mindmap', p.data));
      check('…the version says what it was made from', (await pages.versions(null, p.id))[0].summary === 'Made from 3 cards: All cards and notes', (await pages.versions(null, p.id))[0].summary);
      check('…it used one of the day’s makes each time', S().ai.dg.n === usedBefore + 2, S().ai.dg);
      check('…the made mind map from before moved into Pages too', d.diagramsMoved && d.diagrams[0].pageId && (await pages.list(null, 'deck', d.id)).filter(x => x.kind === 'mindmap').length === 2);
      // the learner adds a note and a card link; making it again keeps them on the ideas that match
      const cur = await pages.get(null, p.id), data = JSON.parse(J(cur.data));
      data.root.children[1].note = 'The control centre.'; data.root.children[1].cardIds = [ids[2], ids[0]];
      await pages.update(null, p.id, { baseVersion: cur.version, data, who: 'you' });
      aiAnswer = { title: 'Another title', root: { text: 'The cell', cards: [], children: [{ text: 'Mitochondria', cards: [1], children: [{ text: 'Krebs cycle', cards: [1] }] }, { text: 'Nucleus', cards: [3], children: [{ text: 'DNA', cards: [3] }, { text: 'Nucleolus', cards: [] }] }] } };
      r = await api('/api/diagrams/make', { deckId: d.id, type: 'mindmap', page: p.id, pages: true });
      const again = await pages.get(null, p.id);
      check('Make again from the cards: a new version of the same page', r.status === 200 && r.j.pageId === p.id && again.version === cur.version + 2 && again.title === 'The cell', { r: r.j, v: again.version });
      check('…ideas that match keep their ids, notes and card links', maps.textOf('mindmap', again.data) === 'The cell {#the-cell}\n- Mitochondria {#mitochondria cards:' + ids[0] + ',' + ids[1] + '}\n  - Krebs cycle {#krebs-cycle cards:' + ids[0] + '}\n- Nucleus {#nucleus cards:' + ids[2] + ',' + ids[0] + '}\n  > The control centre.\n  - DNA {#dna cards:' + ids[2] + '}\n  - Nucleolus {#nucleolus}', maps.textOf('mindmap', again.data));
      // an app from before Pages (no `pages: true`) still gets a Figures mind map it can open by its id
      const figs = d.diagrams.length;
      r = await api('/api/diagrams/make', { deckId: d.id, type: 'mindmap' });
      check('an app from before Pages still gets a Figures mind map (its id, no page)', r.status === 200 && r.j.id && !r.j.pageId && d.diagrams.length === figs + 1 && !d.diagrams.at(-1).pageId, r);
      // a moved mind map frees its figure's place; nothing else does
      const full = store.makeDeck({ name: 'Full deck' });
      for (let i = 0; i < 3; i++) store.apply({ type: 'card.add', deckId: full.id, front: 'Q' + i, back: 'A' + i });
      full.diagrams = Array.from({ length: 30 }, (_, i) => ({ id: 'gt' + i, kind: 'table', name: 'T' + i, at: i, pageId: 'pzzzzzzzz', table: { columns: ['A', 'B'], rows: [['x', 'y']] } }));
      store.apply({ type: 'settings.update', patch: { viewFree: true } });
      r = await api('/api/diagrams/make', { deckId: full.id, type: 'table', pages: true });
      store.apply({ type: 'settings.update', patch: { viewFree: false } });
      check('a table with a page id still takes a figure’s place (Free keeps 30)', r.status === 403 && r.j.code === 'full', r);
      // a failed make gives the day's make back
      aiAnswer = { title: 'x', root: { text: '', cards: [], children: [] } };
      const n = S().ai.dg.n;
      r = await api('/api/diagrams/make', { deckId: d.id, type: 'mindmap', pages: true });
      check('a make the AI got wrong is refused and given back', r.status === 422 && S().ai.dg.n === n, { r, n: S().ai.dg.n });
    });
  }
} catch (e) { fail++; console.log('  FAIL (threw) ' + (e.stack || e.message)); }
finally {
  globalThis.fetch = realFetch;
  await new Promise(r => server.close(r));
  rmSync(DIR, { recursive: true, force: true });
}

console.log('mcp-pages: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
