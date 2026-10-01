// Draws the app's real screens as pictures for the articles, with Chrome (Vercel's build has no browser, so they're drawn here and
// committed): web/shots/<screen>[-phone][-dark].webp, one for a computer and one for a phone, light and dark, each a crop of one of
// the app's own boards (design/visuals.mjs SCREENS says which board and which part), with the canvas's sample data. The boards are
// shown by the app's own local server (web/server.mjs, on a port of its own, stopped afterwards), the way the canvas shows them.
//   web/shots/manifest.json  what each picture was drawn from (the board's file, the crop), so design/check-site.mjs can tell when
//                            the app's board has changed since: run `node design/screens.mjs` again then (only those are redrawn)
// Run it after changing an app board that an article shows, or the table in design/visuals.mjs:  node design/screens.mjs [--all]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { withChrome } from './chrome.mjs';
import { SCREENS, shotFile } from './visuals.mjs';
import { readBoard } from './slim.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), WEB = join(ROOT, 'web'), OUT = join(WEB, 'shots'), BOARDS = join(ROOT, 'design/canvas/project');
const ALL = process.argv.includes('--all'), VERSION = 2;
export const isPhoneBoard = name => /^Phone|^LiveAnswer$/.test(name);
// The size of the window a board is drawn in: 1440 × 900, and for the iPhone boards 390 × 844. The app's design page puts some boards
// (the "variant" ones) in a padded gray frame (#app.fixed), so those get a window 64 px larger, and the crop is measured from the
// board's own corner (the first element in #app), not the window's.
export const windowOf = name => (isPhoneBoard(name) ? [390, 844] : [1440, 900]);
// How many device pixels to a CSS pixel: a phone's picture at 2 (shown at about 350 px wide), a computer's so it comes out about 1360 px wide.
export const scaleOf = (phone, crop) => (phone ? 2 : Math.min(2, 1360 / crop[2]));
const bw0 = name => (isPhoneBoard(name) ? 390 : 1440);
export const boardHash = name => { const f = join(BOARDS, name + '.dc.html'); return existsSync(f) ? createHash('sha1').update(readBoard(BOARDS, name + '.dc.html')).digest('hex').slice(0, 10) : ''; };

// Every picture that is wanted: its file, its board, its crop, whether dark.
export const wanted = () => Object.entries(SCREENS).flatMap(([id, sc]) => [[false, false], [false, true], [true, false], [true, true]].map(([phone, dark]) => {
  const side = phone ? sc.phone : sc.desk, file = shotFile(id, phone, dark).replace(/^\/shots\//, '');
  return { id, phone, dark, file, board: side.board, crop: side.crop, scale: scaleOf(phone, side.crop), hash: createHash('sha1').update([VERSION, side.board, boardHash(side.board), side.crop.join(','), scaleOf(phone, side.crop), dark].join('|')).digest('hex').slice(0, 10) };
}));

if (import.meta.url === 'file://' + process.argv[1]) {
  mkdirSync(OUT, { recursive: true });
  let manifest = {};
  try { manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')); } catch {}
  const todo = wanted().filter(w => ALL || manifest[w.file]?.hash !== w.hash || !existsSync(join(OUT, w.file)));
  if (!todo.length) console.log('Every screen picture is up to date (' + wanted().length + ' in web/shots).');
  else {
    // The app's own server, on a free port, with a data folder that is thrown away.
    const data = mkdtempSync(join(tmpdir(), 'lucida-shots-'));
    const server = spawn(process.execPath, [join(WEB, 'server.mjs')], { cwd: ROOT, env: { ...process.env, PORT: process.env.SHOTS_PORT || '3892', STEALTH_DATA: data }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const port = await new Promise((ok, bad) => {
        const t = setTimeout(() => bad(new Error('The app’s server did not start')), 30000);
        server.stdout.on('data', d => { const m = /localhost:(\d+)/.exec(String(d)); if (m) { clearTimeout(t); ok(m[1]); } });
        server.on('exit', c => { clearTimeout(t); bad(new Error('The app’s server stopped (' + c + ')')); });
      });
      await withChrome(async chrome => {
        for (const w of todo) {
          const [bw, bh] = windowOf(w.board);
          await chrome.size(bw, bh, w.scale); await chrome.scheme(w.dark ? 'dark' : 'light');
          await chrome.open(`http://127.0.0.1:${port}/b/${w.board}${w.dark ? '?dark' : ''}`);
          const ready = await chrome.run(`document.fonts.ready.then(() => new Promise(r => setTimeout(() => r(document.fonts.check('600 20px Geist')), 1200)))`);
          if (!ready) throw new Error('Geist didn’t load (is this computer online?), so ' + w.file + ' would use another font.');
          const [x, y, cw, ch] = w.crop;
          if (await chrome.run(`document.querySelector('#app').classList.contains('fixed')`)) { await chrome.size(bw + 64, bh + 64, w.scale); await chrome.run('new Promise(r => setTimeout(r, 400))'); }
          const at = await chrome.run(`(() => { const r = document.querySelector('#app').firstElementChild.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
          if (Math.abs(at[2] - bw0(w.board)) > 2) throw new Error(w.board + ' is ' + Math.round(at[2]) + ' px wide in its window, not ' + bw0(w.board));
          writeFileSync(join(OUT, w.file), await chrome.shot({ type: 'webp', quality: 82, clip: { x: at[0] + x, y: at[1] + y, width: cw, height: ch } }));
          manifest[w.file] = { board: w.board, crop: w.crop, scale: w.scale, hash: w.hash, width: Math.round(cw * w.scale), height: Math.round(ch * w.scale), bytes: readFileSync(join(OUT, w.file)).length };
          console.log(w.file.padEnd(30), (w.board + ' ' + w.crop.join(',')).padEnd(40), Math.round(manifest[w.file].bytes / 1024) + ' KB');
        }
      });
    } finally { server.kill('SIGKILL'); rmSync(data, { recursive: true, force: true }); }
  }
  // Pictures of screens that are no longer in the table go.
  const want = new Set(wanted().map(w => w.file));
  for (const f of Object.keys(manifest)) if (!want.has(f)) delete manifest[f];
  for (const f of readdirSync(OUT)) if (f !== 'manifest.json' && !want.has(f)) rmSync(join(OUT, f));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(want.size + ' screen pictures in web/shots, ' + Math.round(Object.values(manifest).reduce((n, m) => n + m.bytes, 0) / 1024) + ' KB');
}
