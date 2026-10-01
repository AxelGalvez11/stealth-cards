// Draws the pictures that go with the site's pages, with Chrome (Vercel's build has no browser, so they're drawn here and
// committed):
//   web/og/<page>.png        the 1200 × 630 picture of every page (the SiteOg board): the link preview, and the page's hero and
//                            card, on a light screen and a dark one alike (the gradients keep their look in dark mode). It has a light
//                            grain of its own; on the site the app's grain is laid over it too (spPic in design/build.mjs)
//   og/manifest.json         says what each one was drawn for (its title, scene and palette) and which version of the drawing
//                            (`_art`), so design/check-site.mjs can tell when one is out of date
//   web/icons/*.png     the icon as pictures: 192 and 512 pixels (the organization's logo, and the icon search results show)
//                       and the 180-pixel one iPhones use for the home screen
// Run it after adding pages or changing a page's title (and after design/build.mjs):  node design/og.mjs
// Everything it draws is shown in a window of the size it will have, so nothing is scaled.
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { withChrome } from './chrome.mjs';
import { board, esc } from './render.mjs';
import { pageSet, indexOf, ogKey, ogFile, ogFingerprint } from './site.mjs';
import { BASE_CSS, FONTS } from './seo.mjs';
import { readPng } from './png.mjs';

const WEB = new URL('../web/', import.meta.url);
const OUT = new URL('og/', WEB), ICONS = new URL('icons/', WEB);
const FAST = readFileSync(new URL('fast.css', WEB), 'utf8').trim();
const { pages } = pageSet();
const items = indexOf(pages);
const dir = mkdtempSync(join(tmpdir(), 'lucida-og-'));
mkdirSync(OUT, { recursive: true }); mkdirSync(ICONS, { recursive: true });

// Smaller files: a picture with smooth gradients keeps its look with 256 colors (ImageMagick, if it's installed). No dithering: it
// brightens the colors and leaves stray dots of another hue; the picture's own light grain breaks up the steps instead. `-strip` leaves out
// the time stamps ImageMagick writes into a file, so drawing the same picture again gives the same bytes (and git sees no change).
const shrink = file => { try { execFileSync('magick', [file, '-colors', '256', '+dither', '-strip', 'PNG8:' + file], { stdio: 'ignore' }); } catch {} };
const manifest = {};
// Which drawing the pictures come from: SiteOg's own code writes it into its logic (`// og-art: …`).
const art = (readFileSync(new URL('../design/canvas/project/SiteOg.dc.html', import.meta.url), 'utf8').match(/og-art: ([0-9a-f]+)/) || [])[1];
if (!art) throw new Error('SiteOg has no og-art mark. Run `node design/build.mjs` first.');
manifest._art = art;
try {
  await withChrome(async chrome => {
    const show = async html => {
      const file = join(dir, 'page.html');
      writeFileSync(file, html);
      await chrome.open(pathToFileURL(file).href);
      return chrome.run(`document.fonts.ready.then(() => new Promise(r => setTimeout(() => r(document.fonts.check('600 40px Geist')), 300)))`);
    };
    await chrome.size(1200, 630);
    for (const it of items) {
      const entry = manifest[it.slug || 'home'] = { file: ogFile(it.slug), fingerprint: ogFingerprint(it), bytes: 0 };
      const b = board('SiteOg', { page: ogKey(it.slug), site: true });
      if (!b.html.includes(esc(it.h1))) throw new Error('The SiteOg board doesn’t know "' + it.h1 + '" yet. Run `node design/build.mjs` first.');
      // The board is 1200 × 630; `board` leaves its width to the page, so put the frame back.
      const inner = b.html.replace('width: 100%;', 'width: 1200px; height: 630px;').replace(/url\(\/art\//g, 'url(' + pathToFileURL(new URL('art/', WEB).pathname).href + '/');
      const fonts = await show(`<!doctype html><html lang="en"><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>${BASE_CSS}\n${b.css}\n${FAST}\nbody{width:1200px;height:630px;overflow:hidden}</style></head><body>${inner}</body></html>`);
      if (!fonts) throw new Error('Geist didn’t load (is this computer online?), so the picture for ' + (it.slug || 'the home page') + ' would use another font.');
      const file = new URL(entry.file.replace(/^og\//, ''), OUT);
      writeFileSync(file, await chrome.shot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
      // The words on the picture (Lucida, the title, the address) must read against the gradient behind them: 4.5 to 1 or more, measured
      // from a picture of the same page with its text taken out.
      const words = await chrome.run(`[...document.querySelectorAll('[data-og-text]')].map(e => { const cs = getComputedStyle(e), r = document.createRange(); r.selectNodeContents(e); return { t: e.textContent.trim().slice(0, 30), color: cs.color, rects: [...r.getClientRects()].filter(x => x.width > 2).map(x => [x.left, x.top, x.width, x.height]) }; })`);
      await chrome.run(`(() => { const s = document.createElement('style'); s.id = 'hide'; s.textContent = '*{color:transparent!important;-webkit-text-fill-color:transparent!important}'; document.head.appendChild(s); })()`);
      const bare = readPng(await chrome.shot({ clip: { x: 0, y: 0, width: 1200, height: 630 } })), lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      let worst = 99, where = '';
      for (const w of words) { const fg = /rgba?\(([^)]+)\)/.exec(w.color)[1].split(/[ ,]+/).map(Number); for (const [x, y, rw, rh] of w.rects) for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { const px = Math.min(1199, Math.round(x + rw * (i + 0.5) / 12)), py = Math.min(629, Math.round(y + rh * (j + 0.5) / 4)), k = (py * 1200 + px) * 3, bg = [bare.rgb[k], bare.rgb[k + 1], bare.rgb[k + 2]], a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (ratio < worst) { worst = ratio; where = w.t; } } }
      if (worst < 4.5) throw new Error('The words on the picture for ' + (it.slug || 'the home page') + ' ("' + where + '") read at only ' + worst.toFixed(2) + ' to 1 against their gradient (4.5 is the least). Change the page’s style or palette in design/site.mjs.');
      entry.read = +worst.toFixed(1);
      shrink(file.pathname);
      entry.bytes = readFileSync(file).length;
      console.log(ogFile(it.slug).padEnd(34), Math.round(entry.bytes / 1024) + ' KB, words read ' + entry.read + ' to 1');
    }
    // The icon, from web/icon.svg (the tab icon), as pictures: the tile with its rounded corners, and for iPhones a full square.
    const svg = readFileSync(new URL('icon.svg', WEB), 'utf8');
    const dots = svg.match(/<g fill="#fff"[\s\S]*?<\/g>/)[0];
    const tile = px => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="8.4" fill="#000"/>${dots.replace('translate(8.41 9) scale(.46)', 'translate(7.6 8.3) scale(.51)')}</svg>`;
    const square = px => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/>${dots.replace('translate(8.41 9) scale(.46)', 'translate(7.6 8.3) scale(.51)')}</svg>`;
    for (const [name, px, draw, transparent] of [['icon-192.png', 192, tile, true], ['icon-512.png', 512, tile, true], ['apple-touch-icon.png', 180, square, false]]) {
      await chrome.size(px, px);
      await show(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${draw(px)}</body></html>`);
      writeFileSync(new URL(name, ICONS), await chrome.shot({ clip: { x: 0, y: 0, width: px, height: px }, transparent }));
      console.log('icons/' + name);
    }
  });
} finally { rmSync(dir, { recursive: true, force: true }); }
writeFileSync(new URL('manifest.json', OUT), JSON.stringify(manifest, null, 1) + '\n');
// Pictures of pages that no longer exist go.
const pics = Object.entries(manifest).filter(([k]) => !k.startsWith('_')).map(([, m]) => m);
const keep = new Set(pics.map(m => m.file.replace(/^og\//, '')).concat('manifest.json'));
for (const f of readdirSync(OUT)) if (!keep.has(f)) rmSync(new URL(f, OUT));
console.log(pics.length + ' pages, ' + pics.length + ' pictures in web/og, ' + Math.round(pics.reduce((n, m) => n + m.bytes, 0) / 1024) + ' KB');
