// Draws each gradient the site and the app show as a picture: web/art/<id>.webp holds one palette's background and
// blurred color field (surfaces.mjs), without grain; pages lay the grain over it as one repeating tile (web/fast.css).
// Walls of moving cards stay smooth on phones this way, because nothing runs SVG filters while they move. The canvas
// keeps drawing them live. Needs Google Chrome: `node design/art.mjs`, after changing wall decks, palettes, or the generator.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flowImage, paletteData } from './surfaces.mjs';
import { gen } from './generator.mjs';
import { ART } from './wall.mjs';

const OUT = new URL('../web/art/', import.meta.url);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Each picture is drawn at the shape of the cards that show it, since a card's background gradient depends on it.
const jobs = ART.map(a => ({ ...a, p: a.deck ? gen(a.deck, 'vivid') : paletteData(a.palette) })).map(a => ({ ...a, file: a.p.fid + (a.variant ? '-' + a.variant : '') + '.webp' }));

const profile = mkdtempSync(join(tmpdir(), 'lucida-art-'));
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
try {
  let port, page;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {} }
  for (let i = 0; i < 50 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} if (!page) await sleep(100); }
  if (!page) throw new Error('Chrome did not start');
  const ws = new WebSocket(page.webSocketDebuggerUrl), waiting = new Map();
  let id = 0;
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } };
  const send = (method, params = {}) => new Promise(ok => { waiting.set(++id, ok); ws.send(JSON.stringify({ id, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 1200, deviceScaleFactor: 1, mobile: false });
  mkdirSync(OUT, { recursive: true });
  for (const j of jobs) {
    const html = `<div style="position: relative; width: ${j.w}px; height: ${j.h}px; background: ${j.p.base};"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(flowImage(j.p, 480))}" style="position: absolute; inset: 0; width: 100%; height: 100%;"></div>`;
    const r = await send('Runtime.evaluate', { expression: `(async () => { document.body.style.margin = '0'; document.body.innerHTML = ${JSON.stringify(html)}; await document.querySelector('img').decode(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()`, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error('Could not draw ' + j.file);
    const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 80, clip: { x: 0, y: 0, width: j.w, height: j.h, scale: 1 } });
    writeFileSync(new URL(j.file, OUT), Buffer.from(shot.result.data, 'base64'));
  }
  ws.close();
  // Pictures no page uses anymore go.
  for (const f of readdirSync(OUT)) if (!jobs.some(j => j.file === f)) rmSync(new URL(f, OUT));
  const kb = jobs.reduce((n, j) => n + readFileSync(new URL(j.file, OUT)).length, 0) / 1024;
  console.log(jobs.length + ' pictures in web/art, ' + Math.round(kb) + ' KB');
} finally {
  chrome.kill('SIGKILL');
  await sleep(200);
  if (existsSync(profile)) rmSync(profile, { recursive: true, force: true });
}
