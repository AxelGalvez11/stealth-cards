// How tall each of the Site boards has to be: a board's frame must hold its tallest page, at 1440 and at 390 wide, or the
// canvas clips the bottom. Draws every page of each board in Chrome (the same markup and styles as lucida.cards) and writes
// the tallest to design/site-heights.json, which design/build.mjs reads. Run it after adding or changing page files, then
// `node design/build.mjs` again:  node design/site-measure.mjs
import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withChrome } from './chrome.mjs';
import { board } from './render.mjs';
import { pageSet, boardData, BOARDS } from './site.mjs';
import { BASE_CSS, FONTS } from './seo.mjs';

const WEB = new URL('../web/', import.meta.url);
const FAST = readFileSync(new URL('fast.css', WEB), 'utf8').trim();
const { pages } = pageSet();
const dir = mkdtempSync(join(tmpdir(), 'lucida-measure-'));
const result = {};
try {
  await withChrome(async chrome => {
    for (const name of BOARDS) {
      const slugs = boardData(name, pages).pages.map(p => p.slug);
      result[name] = [0, 0];
      for (const [i, width] of [1440, 390].entries()) {
        await chrome.size(width, 900);
        for (const slug of slugs) {
          const b = board(name, { page: slug, site: true, dark: false });
          const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link href="${FONTS}" rel="stylesheet"><style>${BASE_CSS}\n${b.css}\n${FAST}</style></head><body>${b.html.replace(/url\(\/art\//g, 'url(' + pathToFileURL(new URL('art/', WEB).pathname).href + '/')}</body></html>`;
          const file = join(dir, name + '-' + width + '-' + slug.replace(/\W+/g, '-') + '.html');
          writeFileSync(file, html);
          await chrome.open(pathToFileURL(file).href);
          const ready = await chrome.run(`document.fonts.ready.then(() => new Promise(r => setTimeout(() => r(document.fonts.check('600 20px Geist')), 300)))`);
          if (!ready) console.log('  (Geist didn’t load for ' + name + ' ' + slug + '; the height may be a little off)');
          const h = await chrome.run('Math.ceil(document.documentElement.scrollHeight)');
          console.log(name.padEnd(12), String(width).padStart(4), slug.padEnd(28), h);
          result[name][i] = Math.max(result[name][i], h);
        }
      }
    }
  });
} finally { rmSync(dir, { recursive: true, force: true }); }
writeFileSync(new URL('site-heights.json', import.meta.url), JSON.stringify(result, null, 1) + '\n');
console.log('design/site-heights.json:', JSON.stringify(result));
