// The site's colors for a light and for a dark screen, as CSS variables, so one markup serves both: the page's colors are
// `var(--t-bg)` and the like, and the browser picks the set that matches the system (prefers-color-scheme). The canvas boards
// draw the same two looks with their Dark switch (theme() in design/build.mjs); design/check-site.mjs checks that these values
// are the ones theme() gives, so the site and the canvas can't drift apart. Dark is the app's black look, not its gray one.
export const LIGHT = {
  bg: '#FFFFFF', surf: '#F4F4F4', surf2: '#E8E8E8', line: '#EBEBEB', text: '#000000', muted: '#666666', inv: '#000000', invText: '#FFFFFF',
  card: '#FFFFFF', shadow: '0 1px 2px rgba(0,0,0,.04), 0 18px 44px -18px rgba(0,0,0,.18)', again: '#D92D20', hard: '#B54708', good: '#067647', easy: '#175CD3',
  againTint: '#FDECEA', goodTint: '#E6F4EC', hardTint: '#FDF1E3', dim: 'rgba(0,0,0,.28)'
};
export const DARK = {
  bg: '#000000', surf: '#141414', surf2: '#222222', line: '#262626', text: '#FFFFFF', muted: '#A3A3A3', inv: '#FFFFFF', invText: '#000000',
  card: '#141414', shadow: 'none', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD',
  againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.7)'
};
// The sky behind the top of a page: daylight, or night (SKY in design/build.mjs).
export const SKY_LIGHT = { top: '#86BDF3', mid: '#C9E2FB', low: '#EDF5FE', glow: 'rgba(255,255,255,.75)', cloud: 'rgba(255,255,255,.94)' };
export const SKY_DARK = { top: '#081733', mid: '#0D2148', low: '#0A1530', glow: 'rgba(120,150,255,.16)', cloud: 'rgba(150,170,230,.10)' };
// Only the site's pages: thin rules inside a card, the hairline round a picture, the second gray (for the words over the page's sky, a
// touch stronger than `muted`, which a dark sky would leave under 4.5 to 1), the chip on a card's picture, and the three colors of the
// blog's headline (Lucida's colors: periwinkle, sky, violet), and the drawn diagrams in the articles (the stage they sit on, their cards,
// the hairline and shadow of a card, the soft bars that stand for text, the lines and arrows).
export const EXTRA_LIGHT = { hair: 'rgba(0,0,0,.09)', edge: 'rgba(0,0,0,.07)', sub: '#595959', chipbg: 'rgba(255,255,255,.92)', chipfg: '#000000', g1: '#4B5BF0', g2: '#1D8FD6', g3: '#7C4DF2',
  fstage: '#F3F4F9', fcard: '#FFFFFF', fedge: 'rgba(20,20,60,.08)', fsoft: '#E3E6EF', fline: '#9096AB', fshadow: '0 1px 2px rgba(20,20,60,.05), 0 16px 30px -18px rgba(30,30,90,.30)' };
export const EXTRA_DARK = { hair: 'rgba(255,255,255,.12)', edge: 'rgba(255,255,255,.1)', sub: '#BDBDBD', chipbg: 'rgba(24,24,28,.92)', chipfg: '#FFFFFF', g1: '#8C98FC', g2: '#53B1FD', g3: '#B79DFB',
  fstage: '#111116', fcard: '#1E1E24', fedge: 'rgba(255,255,255,.10)', fsoft: '#2E2E37', fline: '#6F7389', fshadow: '0 16px 30px -16px rgba(0,0,0,.8)' };

const names = o => Object.keys(o);
// theme() as variable references: { bg: 'var(--t-bg)', ... }; and the sky and the extras the same way.
export const VARS = Object.fromEntries(names(LIGHT).map(k => [k, `var(--t-${k})`]));
export const SKY_VARS = Object.fromEntries(names(SKY_LIGHT).map(k => [k, `var(--sky-${k})`]));
export const EXTRA_VARS = Object.fromEntries(names(EXTRA_LIGHT).map(k => [k, `var(--t-${k})`]));

const set = (t, sky, extra) => [...names(t).map(k => `--t-${k}:${t[k]}`), ...names(sky).map(k => `--sky-${k}:${sky[k]}`), ...names(extra).map(k => `--t-${k}:${extra[k]}`)].join(';');
// The stylesheet: the light set, then the dark set when the system is dark. `color-scheme` makes the browser's own parts (the
// scrollbar, the page behind an overscroll, a details marker) follow too.
export const SCHEME_CSS = `:root{color-scheme:light dark;${set(LIGHT, SKY_LIGHT, EXTRA_LIGHT)}}
@media (prefers-color-scheme:dark){:root{${set(DARK, SKY_DARK, EXTRA_DARK)}}}`;
export const THEME_COLORS = { light: LIGHT.bg, dark: DARK.bg };
