// The app's page saving (web/pagesclient.js), with a pretend server in this process (no network, no browser):
//   - a change made `hold` (a map's label still being typed) is never sent, and the page isn't fetched over it, until a change comes
//     without it (the field closed): one burst of typing is one version;
//   - a save whose data is what the page already has (a delete undone, an idea added and let go of with Esc) is never sent;
//   - a 409 still merges a map by kind (both kept) and says so (`conflict`), and that line goes once the page is restored or has
//     moved on past the merged version.
//   node tests/pagesclient.mjs            (prints each failure, then "pagesclient: N passed, M failed"; exits 1 on a failure)
const listeners = {};
globalThis.addEventListener = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
}
const J = x => JSON.stringify(x);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The pretend server: one Mind map page, its versions, and every request it was sent.
const tree = (...kids) => ({ root: { id: 'cell', label: 'The cell', children: kids.map(([id, label]) => ({ id, label })) } });
let server, sent;
function reset(data) {
  server = { id: 'p1', kind: 'mindmap', scope: 'deck', scopeId: 'd1', title: 'The cell', version: 1, by: 'you', ai: false, data, versions: [{ version: 1, data, summary: 'Made the page' }] };
  sent = [];
}
const page = () => { const { versions, ...p } = server; return JSON.parse(J(p)); };
globalThis.fetch = async (url, init) => {
  const body = init && init.body ? JSON.parse(init.body) : null;
  sent.push({ url, body });
  const reply = (status, j) => ({ ok: status < 400, status, json: async () => JSON.parse(J(j)) });
  if (url === '/api/pages/p1') return reply(200, page());
  if (url === '/api/pages' && body && body.op === 'update') {
    if (body.baseVersion !== server.version) return reply(409, { error: 'Changed', code: 'conflict', current: page() });
    server.version++; if (body.data !== undefined) server.data = body.data; if (body.title !== undefined) server.title = body.title; server.by = 'you';
    server.versions.push({ version: server.version, data: server.data, summary: body.summary || '' });
    return reply(200, page());
  }
  if (url === '/api/pages' && body && body.op === 'restore') {
    const v = server.versions.find(x => x.version === body.version);
    server.version++; server.data = v.data; server.versions.push({ version: server.version, data: v.data, summary: 'Restored version ' + v.version });
    return reply(200, page());
  }
  return reply(404, { error: 'No such page' });
};

const { createPages } = await import('../web/pagesclient.js');
await import('../web/maps.js');
await sleep(20);   // (pagesclient loads web/maps.js for the map merge)
const updates = () => sent.filter(x => x.body && x.body.op === 'update');
async function opened() {
  const P = createPages({ changed: () => {}, say: () => {} });
  P.page('p1');
  await sleep(20);
  return P;
}

// ---------- a held change waits for the field to close ----------
{
  const A = tree(['nucleus', 'Nucleus']);
  reset(A);
  const P = await opened();
  const typing = s => tree(['nucleus', 'Nucleus'], ['n1', s]);
  P.edit('p1', { data: typing(''), hold: true });
  P.edit('p1', { data: typing('Autoph'), hold: true });
  await sleep(900);
  check('a held change is not sent, however long the pause', updates().length === 0, updates());
  check('a held change shows at once', P.page('p1').data.root.children.length === 2);
  check('a held page says it is not saving', P.saving('p1').busy === false);
  // (another writer's change arrives meanwhile: the page being typed in isn't fetched over)
  server.data = tree(['nucleus', 'Nucleus'], ['ai1', 'From the AI']); server.version = 2; server.versions.push({ version: 2, data: server.data, summary: 'AI' });
  P.onRev(Date.now());
  await sleep(30);
  check('a held page is not fetched over', P.page('p1').data.root.children.some(c => c.id === 'n1'), P.page('p1').data);
  P.edit('p1', { data: typing('Autophagy'), hold: true });
  P.edit('p1', { data: typing('Autophagy') });   // (the field closed)
  await sleep(900);
  const u = updates();
  check('closing the field sends the burst once', u.length === 2 && u[0].body.baseVersion === 1, u.map(x => x.body.baseVersion));   // (the 409, then the merge on top)
  const last = server.data.root.children.map(c => c.label);
  check('the 409 keeps both: theirs and the typed label', last.includes('From the AI') && last.includes('Autophagy'), last);
  check('the merge is said', !!P.conflict('p1') && P.conflict('p1').theirs === 2 && P.conflict('p1').mine === 3, P.conflict('p1'));
  // (restored: the line goes)
  await P.restore('p1', 1);
  check('a restore clears the merge line', P.conflict('p1') === null);
}

// ---------- a change that comes back to what the page has makes no version ----------
{
  const A = tree(['nucleus', 'Nucleus'], ['mito', 'Mitochondria']);
  reset(A);
  const P = await opened();
  P.edit('p1', { data: tree(['nucleus', 'Nucleus']) });   // (Delete)
  P.edit('p1', { data: JSON.parse(J(A)) });               // (⌘Z within the moment)
  await sleep(900);
  check('delete then undo sends nothing', updates().length === 0, updates());
  check('delete then undo leaves no queue', P.saving('p1').busy === false && !P.saving('p1').err);
  P.edit('p1', { data: tree(['nucleus', 'Nucleus'], ['mito', 'Mitochondria'], ['n2', '']), hold: true });   // (Enter: an empty new idea)
  P.edit('p1', { data: JSON.parse(J(A)) });                                                                   // (Esc: it goes)
  await sleep(900);
  check('an idea added and let go of sends nothing', updates().length === 0, updates());
  P.edit('p1', { data: tree(['nucleus', 'Nucleus']) });
  await sleep(900);
  check('a real change is still saved', updates().length === 1 && server.version === 2, updates().length);
  // (the page moved on past a merge: the line goes)
  P.edit('p1', { title: 'Cells' });
  await sleep(900);
  check('a title alone is still saved', server.title === 'Cells' && server.version === 3);
}

// ---------- the merge line goes once the page moves past the merged version ----------
{
  reset(tree(['nucleus', 'Nucleus']));
  const P = await opened();
  server.data = tree(['nucleus', 'Nucleus'], ['ai1', 'AI idea']); server.version = 2;
  P.edit('p1', { data: tree(['nucleus', 'Nucleus'], ['n1', 'Mine']) });
  await sleep(900);
  check('a merge happened', !!P.conflict('p1') && P.conflict('p1').mine === 3, P.conflict('p1'));
  P.edit('p1', { data: tree(['nucleus', 'Nucleus'], ['n1', 'Mine'], ['ai1', 'AI idea'], ['n2', 'More']) });
  await sleep(900);
  check('the line goes once the page is past the merged version', P.conflict('p1') === null, P.conflict('p1'));
}

// ---------- leaving the page sends a held change ----------
{
  reset(tree(['nucleus', 'Nucleus']));
  const P = await opened();
  P.edit('p1', { data: tree(['nucleus', 'Nucleus'], ['n1', 'Kept']), hold: true });
  for (const fn of listeners.pagehide || []) fn();
  await sleep(50);
  check('pagehide sends what is held', server.data.root.children.some(c => c.label === 'Kept'), server.data);
}

console.log('pagesclient: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
