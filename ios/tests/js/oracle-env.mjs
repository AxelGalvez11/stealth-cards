// Runs the web app's own database (web/db.js) in Node on a library, so its answers can be compared with the iPhone
// app's ports. It patches a temporary copy of db.js (the worktree's file isn't touched) to also hand out its inner
// pieces (the review queue, a deck's numbers), stubs the browser things db.js reaches for, and pins the clock.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function openDb(WT, state, NOW) {  // WT: the repo's folder
  // A clock that stays put (Date.now() and new Date()).
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(NOW); else super(...a); } static now() { return NOW; } }
  globalThis.Date = FakeDate;
  const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
  globalThis.sessionStorage = mem(); globalThis.localStorage = mem();
  globalThis.location = { search: '', hostname: 'localhost', origin: 'http://localhost', assign() {}, href: '' };
  globalThis.document = { hidden: false, addEventListener() {}, createElement: () => ({ style: {}, remove() {}, click() {} }), body: { appendChild() {} } };
  globalThis.alert = () => {}; globalThis.confirm = () => true;
  globalThis.window = globalThis; globalThis.window.speechSynthesis = undefined;
  globalThis.Audio = class { addEventListener() {} pause() {} play() { return Promise.resolve(); } removeAttribute() {} load() {} };
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  const sent = [];
  globalThis.fetch = async (url, opts) => {
    if (opts && opts.method === 'POST') { sent.push({ url, body: JSON.parse(opts.body || '{}') }); return { status: 200, ok: true, json: async () => ({ result: {}, state }) }; }
    return { status: 200, ok: true, json: async () => state };
  };
  const realSetTimeout = globalThis.setTimeout, realSetInterval = globalThis.setInterval;
  globalThis.setTimeout = () => 0; globalThis.setInterval = () => 0;
  // A patched copy of db.js: imports made absolute, inner pieces handed out.
  let src = readFileSync(WT + '/web/db.js', 'utf8').replace(/from '\.\//g, "from '" + WT + '/web/');
  const marker = '    mock: false, act, net,';
  if (!src.includes(marker)) throw new Error('db.js changed: cannot find where to hand out its inner pieces');
  src = src.replace(marker, marker + ' __queue: queue, __setCards: setCards, __deckStat: deckStat, __nextDue: nextDue, __forecast: forecast, __difficulty: difficulty, __streaks: streaks, __histories: () => histories(S),');
  const file = join(mkdtempSync(join(tmpdir(), 'oracle-')), 'db-patched.mjs'); writeFileSync(file, src);
  const { createDb } = await import(pathToFileURL(file).href + '?t=' + Date.now());
  const db = await createDb({ onChange() {}, go() {} });
  globalThis.setTimeout = realSetTimeout; globalThis.setInterval = realSetInterval;
  return { db, sent };
}
