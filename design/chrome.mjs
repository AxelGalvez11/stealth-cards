// A small way to drive Google Chrome (headless, nothing to install): open a page, run a script in it, take a picture.
// design/og.mjs (link-preview pictures and icons) and design/site-measure.mjs (how tall each page is) use it; design/art.mjs
// does the same thing inline. Needs Chrome at the usual place on a Mac (or CHROME=<path>).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Runs fn(page) with a fresh Chrome and closes it afterwards, whatever happens.
export async function withChrome(fn) {
  if (!existsSync(CHROME)) throw new Error('Google Chrome isn’t at ' + CHROME + ' (set CHROME=<path to it>).');
  const profile = mkdtempSync(join(tmpdir(), 'lucida-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--force-color-profile=srgb', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  try {
    let port, target;
    for (let i = 0; i < 900 && !port; i++) { await sleep(100); try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {} }
    for (let i = 0; i < 300 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(100); }
    if (!target) throw new Error('Chrome did not start within a minute and a half (is the computer very busy?)');
    const ws = new WebSocket(target.webSocketDebuggerUrl), waiting = new Map(), events = new Map();
    let id = 0;
    await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
      else if (d.method && events.has(d.method)) { events.get(d.method)(d.params); events.delete(d.method); }
    };
    const send = (method, params = {}) => new Promise((ok, bad) => { waiting.set(++id, d => (d.error ? bad(new Error(method + ': ' + d.error.message)) : ok(d.result))); ws.send(JSON.stringify({ id, method, params })); });
    const once = method => new Promise(ok => events.set(method, ok));
    await send('Page.enable');
    const page = {
      // The window's size in CSS pixels, and how many device pixels make one.
      size: (width, height, scale = 1) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 500 }),
      // The look the window asks pages for: 'light' or 'dark' (prefers-color-scheme).
      scheme: value => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] }),
      // Opens an address and waits until it has loaded.
      open: async url => { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url }); await Promise.race([loaded, sleep(30000)]); },
      // Runs an expression (it may be async) and gives back its value.
      run: async expression => {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
        return r.result.value;
      },
      // A picture of what's in the window (or of `clip`), as bytes. `transparent` leaves the page's background out.
      shot: async ({ type = 'png', clip, transparent = false, quality = 90, beyond = false } = {}) => {
        if (transparent) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
        const r = await send('Page.captureScreenshot', { format: type, quality, ...(beyond ? { captureBeyondViewport: true } : {}), ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
        if (transparent) await send('Emulation.setDefaultBackgroundColorOverride', {});
        return Buffer.from(r.data, 'base64');
      }
    };
    try { return await fn(page); } finally { ws.close(); }
  } finally {
    chrome.kill('SIGKILL');
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
}
