// Themes (Pro) on the design canvas. The app loads a theme's module from web/themes when you pick it; the canvas can't,
// so each Theme board carries its theme's code in its own logic (a static block that puts it where the boards look for
// it, globalThis.LucidaThemes), and its CSS and fonts in its helmet, with the pictures as the canvas's uploads (/_blob).
// design/to-web.mjs takes the code back out of those boards for the app (it has the modules) and points their
// pictures at web/themes/img. build.mjs uses this file; nothing here runs in the app.
import { readFileSync } from 'node:fs';
import { THEMES } from '../web/themes/index.js';
import { KIT_CSS, KIT_ASSETS } from '../web/themes/kit.js';

const DIR = new URL('../web/themes/', import.meta.url);
export const THEME_KEYS = THEMES.filter(t => t.key !== 'lucida').map(t => t.key);
const mods = Object.fromEntries(await Promise.all(THEME_KEYS.map(async k => [k, (await import(new URL(k + '.js', DIR))).default])));
export const themeModule = k => mods[k];

// The canvas's copies of the theme pictures (uploaded with the Themes page mockups), by file name in web/themes/img.
export const CANVAS_BLOBS = {
  'grain.webp': '/_blob/7835d260d8696ad9ac79e85e3d6dfdc0', 'paper.webp': '/_blob/9fed834b930367f15ef1c51c1989a61d', 'doodle.svg': '/_blob/486f0b9f320966e54d483d222de65bbb',
  'chrome-silver.webp': '/_blob/a4b26b4c8ff1e803f36decf868fc83a2', 'chrome-dark.webp': '/_blob/22a2bdaa360c2b9f5df913bc8a6f7c5a', 'chrome-pearl.webp': '/_blob/1bf41a03f774ac39faef7997322304a9',
  'chrome-tall.webp': '/_blob/15455827df7a6e6bd8ee4876455479e4', 'chrome-sphere.webp': '/_blob/d19db90c9638a004d63dc334fc36814b',
  'aero-bg-tall.webp': '/_blob/d0ab4d7fbb01c582e129c52c89018212', 'aero-bg-wide.webp': '/_blob/7497d64864e356d6e83d0b9d40d0cdca',
  'aero-c0.webp': '/_blob/9df4ab6d2dfdbd7d4f8729dc8cde0227', 'aero-c1.webp': '/_blob/ff6963aff293dcf2954f90012558886d', 'aero-c2.webp': '/_blob/61264c955b690c88d75e6631200a6d2a',
  'aero-c3.webp': '/_blob/736e32fb7a773470c0f1a73b60d01d66', 'aero-c4.webp': '/_blob/f9229bd19b2bfbe34f8f5ef36363860c', 'aero-c5.webp': '/_blob/b4bb33e162e5534a36f3b5b75e70d176',
  'lmf-bg-tall.webp': '/_blob/2d609730069a87c59e34bafc35bb1f57', 'lmf-bg-wide.webp': '/_blob/7609bffa89386cc851726f70ecce2852',
  'lmf-c0.webp': '/_blob/d39674fe3349529c574f454e4d94c551', 'lmf-c1.webp': '/_blob/48cf21623c91dc9b2e5e8df2513766a5', 'lmf-c2.webp': '/_blob/f4431db3f76e796f35ba74e881a6f177',
  'lmf-c3.webp': '/_blob/72ea9891ab393c3e9c4380ecec34305a', 'lmf-c4.webp': '/_blob/4b0712167a87a7a9e8fad81d1f99faa9', 'lmf-c5.webp': '/_blob/0621ec35522f914284deb3b341fde1c3',
  'lmr-bg-tall.webp': '/_blob/377b39b2b50698825ab49bd21781db2c', 'lmr-bg-wide.webp': '/_blob/21cdf3bc4ecbb60ae6bf032f086ac5fa',
  'lmr-c0.webp': '/_blob/2460a52eff2e2ab6e64644981bffedd9', 'lmr-c1.webp': '/_blob/80b52b5ab27107943e76632ad4fdb6b4', 'lmr-c2.webp': '/_blob/2dc0d917ddf31224f2049248b7b0543a',
  'lmr-c3.webp': '/_blob/dfa0493beaff3810d21bd1e906ed4d62', 'lmr-c4.webp': '/_blob/b4dc1e0e1839683a93cdfb8fb8adc948', 'lmr-c5.webp': '/_blob/6688458b5cac6356a25b1c01fb085289',
  'vpa-bg-tall.webp': '/_blob/a3e5edb78b56ec830b868dc18afb3e66', 'vpa-bg-wide.webp': '/_blob/c462575fbd5590155be1833ea04569a1',
  'vpa-c0.webp': '/_blob/4f33d4a3199b01525754678b22723bdc', 'vpa-c1.webp': '/_blob/73837e6acda92d8617b5f9293ffb1227', 'vpa-c2.webp': '/_blob/51cca6da291e147402fb3bed10f47396',
  'vpa-c3.webp': '/_blob/ca4c08ddc62dffff42057beefe62d99f', 'vpa-c4.webp': '/_blob/4f4925f1b63b642742d2d88307136a5a', 'vpa-c5.webp': '/_blob/a7920bc22d875ebcb1865486cf8e9a68',
  'vpd-bg-tall.webp': '/_blob/277b4103b37d9f4e6b7121ccb13745ca', 'vpd-bg-wide.webp': '/_blob/f4de9eb0b5500a88f955b2fd8a5638eb',
  'vpd-c0.webp': '/_blob/de85615bd3686d57d5aa98a389f966ce', 'vpd-c1.webp': '/_blob/229c379cd0811121f00cc2882051e85e', 'vpd-c2.webp': '/_blob/76e6d84b6d896175771c5299dba56c43',
  'vpd-c3.webp': '/_blob/a71926c90cd812f4e871ba2cac4ddbd1', 'vpd-c4.webp': '/_blob/cb310aba3935eaa3cc0b6976f267df85', 'vpd-c5.webp': '/_blob/0f9b29f1ac8a1a243f3d1f94cf9599c9',
};

// A theme's CSS (with the kit's), its pictures pointing at the canvas's uploads.
const fill = (css, assets) => css.replace(/%%([a-z0-9-]+)%%/g, (_, k) => {
  const file = assets[k] || KIT_ASSETS[k];
  if (!file || !CANVAS_BLOBS[file]) throw new Error('No canvas picture for ' + k);
  return CANVAS_BLOBS[file];
});
export const themeCss = keys => [fill(KIT_CSS, KIT_ASSETS), ...keys.map(k => fill(mods[k].css || '', mods[k].assets || {}))].filter(Boolean).join('\n');
// The Google Fonts families the themes use (for a board's font link).
export const themeFonts = keys => [...new Set(keys.flatMap(k => (mods[k].fonts || '').split('&').filter(Boolean)))].map(x => x + '&').join('');

// The themes' code for a board's logic: kit.js, then each theme's module, made plain code (no imports or exports) and
// registered. A marked static block, so the app's copy of the board can leave it out (to-web.mjs).
export const CANVAS_START = 'static { /* themes for the canvas */', CANVAS_END = '/* end of the themes */ }';
const plain = src => src.replace(/^import [^;]+;\n/gm, '').replace(/^export (const|function|let|async function) /gm, '$1 ');
export function themeStatic(keys) {
  const kit = plain(readFileSync(new URL('kit.js', DIR), 'utf8'));
  const each = keys.map(k => `  if (!T.${k}) T.${k} = make((() => {\n${plain(readFileSync(new URL(k + '.js', DIR), 'utf8')).replace(/^export default \{/m, 'const __theme = {')}\nreturn __theme;\n})());`).join('\n');
  return `${CANVAS_START}
  const T = globalThis.LucidaThemes || (globalThis.LucidaThemes = {});
  if (${keys.map(k => `!T.${k}`).join(' || ')}) {
${kit}
${each}
  }
${CANVAS_END}`;
}
// to-web.mjs: a board's logic without its themes, and its CSS pointing at the app's copies of the pictures.
export const withoutThemes = logic => logic.replace(/static \{ \/\* themes for the canvas \*\/[\s\S]*?\/\* end of the themes \*\/ \}/g, '');
const BY_BLOB = Object.fromEntries(Object.entries(CANVAS_BLOBS).map(([file, blob]) => [blob, '/themes/img/' + file]));
export const appPictures = css => css.replace(/\/_blob\/[0-9a-f]{32}/g, b => BY_BLOB[b] || b);
