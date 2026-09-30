// Draws the pictures that go with the site's pages, with Chrome (Vercel's build has no browser, so they're drawn here and
// committed):
//   web/og/<page>.png   the 1200 × 630 link-preview picture of every page (the SiteOg board), and og/manifest.json, which
//                       says which title each one was drawn for, so design/check-site.mjs can tell when one is out of date
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

const WEB = new URL('../web/', import.meta.url);
const OUT = new URL('og/', WEB), ICONS = new URL('icons/', WEB);
const FAST = readFileSync(new URL('fast.css', WEB), 'utf8').trim();
const { pages } = pageSet();
const items = indexOf(pages);
const dir = mkdtempSync(join(tmpdir(), 'lucida-og-'));
mkdirSync(OUT, { recursive: true }); mkdirSync(ICONS, { recursive: true });

// Smaller files: a picture with smooth gradients keeps its look with 256 colors (ImageMagick, if it's installed).
const shrink = file => { try { execFileSync('magick', [file, '-dither', 'FloydSteinberg', '-colors', '256', 'PNG8:' + file], { stdio: 'ignore' }); } catch {} };
const manifest = {};
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
      const b = board('SiteOg', { page: ogKey(it.slug), site: true, dark: false });
      if (!b.html.includes(esc(it.h1))) throw new Error('The SiteOg board doesn’t know "' + it.h1 + '" yet. Run `node design/build.mjs` first.');
      // The board is 1200 × 630; `board` leaves its width to the page, so put the frame back.
      const inner = b.html.replace('width: 100%;', 'width: 1200px; height: 630px;').replace(/url\(\/art\//g, 'url(' + pathToFileURL(new URL('art/', WEB).pathname).href + '/');
      const fonts = await show(`<!doctype html><html lang="en"><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>${BASE_CSS}\n${b.css}\n${FAST}\nbody{width:1200px;height:630px;overflow:hidden}</style></head><body>${inner}</body></html>`);
      if (!fonts) throw new Error('Geist didn’t load (is this computer online?), so the picture for ' + (it.slug || 'the home page') + ' would use another font.');
      const file = new URL(ogFile(it.slug).replace(/^og\//, ''), OUT);
      writeFileSync(file, await chrome.shot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
      shrink(file.pathname);
      manifest[it.slug || 'home'] = { file: ogFile(it.slug), fingerprint: ogFingerprint(it), bytes: readFileSync(file).length };
      console.log(ogFile(it.slug).padEnd(28), Math.round(manifest[it.slug || 'home'].bytes / 1024) + ' KB');
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
const keep = new Set(Object.values(manifest).map(m => m.file.replace(/^og\//, '')).concat('manifest.json'));
for (const f of readdirSync(OUT)) if (!keep.has(f)) rmSync(new URL(f, OUT));
console.log(Object.keys(manifest).length + ' pictures in web/og, ' + Math.round(Object.values(manifest).reduce((n, m) => n + m.bytes, 0) / 1024) + ' KB');
