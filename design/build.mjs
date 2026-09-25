// Generates every board of the Lucida design canvas (https://claude.ai/artifact/VLXyuTGdroHdrJ2qNAmiGs).
// The web app is made from these boards too (design/to-web.mjs), so the canvas and the app always match.
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { PALETTE_NAMES, PALETTES, flowSvg, grainSvg, grainTile, paletteData } from './surfaces.mjs';
import { GEN_METHOD } from './generator.mjs';
import { MOCK_METHOD, SAMPLE } from './mock.mjs';
import { DRAG_METHOD } from './drag.mjs';
import { WALL_CARDS } from './wall.mjs';
import { PRIVACY, TERMS, UPDATED } from './legal.mjs';
import { PRO_LINKS } from '../web/plans.mjs';
import { G_LOGO, APPLE_LOGO } from './logos.mjs';
const MESH_DATA = JSON.stringify(Object.fromEntries(PALETTE_NAMES.map(n => [n, { ...paletteData(n), shadow: PALETTES[n].ink === '#FFFFFF' ? '0 1px 14px rgba(0,0,0,.16)' : 'none' }])));
// Card text formatting (web/rich.js), copied into every board that shows or edits card text.
const RICH_SRC = readFileSync(new URL('../web/rich.js', import.meta.url), 'utf8');
const RICH_METHOD = `rich() { return Component._rich || (Component._rich = (${RICH_SRC.slice(RICH_SRC.indexOf('function makeRich'), RICH_SRC.lastIndexOf('export default')).trim()})()); }`;
const OUT = new URL('./canvas/project/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const FONT = 'Geist, -apple-system, system-ui, sans-serif';
const MONO = "'Geist Mono', ui-monospace, monospace";
// A finer waveform: many thin bars with a speech-like shape, quiet at the ends. Made once, when the boards are built.
const waveHeights = (n, max, min = 3) => Array.from({ length: n }, (_, i) => {
  const x = i / (n - 1), env = Math.pow(Math.sin(Math.PI * x), 0.6), v = 0.55 + 0.45 * Math.sin(i * 1.7) * Math.cos(i * 0.43 + 1.1);
  return Math.max(min, Math.round(max * env * v));
});
const WAVE_BIG = JSON.stringify(waveHeights(44, 46, 4)), WAVE_SMALL = JSON.stringify(waveHeights(64, 30));

const page = (title, body, { props = {}, logic = '', css = '', w, h }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&amp;family=Geist+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:${FONT}}
a{color:inherit;text-decoration:none}a:hover{opacity:.8}
${APP_MOTION_CSS}
${css}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${JSON.stringify({ ...props, $preview: { width: w, height: h } })}'>
class Component extends DCLogic {
// Dark mode has two looks, picked in Settings → Dark mode: black (the first one, and still the default) or gray (the
// owner: "add a darkmode option that is grayish not fully blackedout"). g asks for gray; it only counts when d is on.
// Gray keeps the grade colors, and its muted words still read at WCAG AA on every surface.
theme(d, g) {
  if (d && g) return { bg: '#1E1E20', surf: '#2A2A2D', surf2: '#353539', line: '#3A3A3E', text: '#F2F2F2', muted: '#A8A8AD', inv: '#F2F2F2', invText: '#1E1E20', card: '#2A2A2D', shadow: '0 1px 2px rgba(0,0,0,.2), 0 18px 44px -18px rgba(0,0,0,.5)', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD', againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.45)' };
  return d
    ? { bg: '#000000', surf: '#141414', surf2: '#222222', line: '#262626', text: '#FFFFFF', muted: '#A3A3A3', inv: '#FFFFFF', invText: '#000000', card: '#141414', shadow: 'none', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD', againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.7)' }
    : { bg: '#FFFFFF', surf: '#F4F4F4', surf2: '#E8E8E8', line: '#EBEBEB', text: '#000000', muted: '#666666', inv: '#000000', invText: '#FFFFFF', card: '#FFFFFF', shadow: '0 1px 2px rgba(0,0,0,.04), 0 18px 44px -18px rgba(0,0,0,.18)', again: '#D92D20', hard: '#B54708', good: '#067647', easy: '#175CD3', againTint: '#FDECEA', goodTint: '#E6F4EC', hardTint: '#FDF1E3', dim: 'rgba(0,0,0,.28)' };
}
mesh(name, i) {
  const P = ${MESH_DATA};
  const keys = Object.keys(P);
  return P[name] || P[keys[(i || 0) % keys.length]];
}
${GEN_METHOD}
${MOCK_METHOD}
${logic.includes('this.rich(') ? RICH_METHOD : ''}${logic.includes('this.drag(') ? '\n' + DRAG_METHOD : ''}
${logic}
}
</script>
</body>
</html>
`;
// Motion on every board, as the Motion board shows it: a page's content rises in (each part a moment after the one
// before), pills and buttons press in, deck cards lift under the pointer, empty states float in a soft light with a
// shine crossing the top card, the Today card's colors drift, the session meter draws in, and forecast bars grow.
// Reduced motion turns all of it off.
const APP_MOTION_CSS = [
  '@keyframes scRise{from{opacity:0;transform:translateY(14px)}}main>*{animation:scRise .5s cubic-bezier(.2,.8,.2,1) backwards}',
  [2, 3, 4, 5].map(n => `main>*:nth-child(${n}){animation-delay:${((n - 1) * 0.06).toFixed(2)}s}`).join('') + 'main>*:nth-child(n+6){animation-delay:.3s}',
  'button,.sc-press{transition:transform .1s ease}button:active,.sc-press:active{transform:scale(.96)}',
  '.sc-lift{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s cubic-bezier(.2,.8,.2,1)}.sc-lift:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}',
  '@keyframes scFloat{50%{transform:translateY(-6px)}}@keyframes scSwayA{50%{transform:rotate(-13deg) translateX(-3px)}}@keyframes scSwayB{50%{transform:rotate(10deg) translateX(3px)}}@keyframes scGlow{50%{opacity:.55}}',
  '@keyframes scSheen{0%,58%{transform:translateX(-160%) skewX(-18deg)}86%,100%{transform:translateX(260%) skewX(-18deg)}}',
  '.sc-float{animation:scFloat 6s ease-in-out infinite}.sc-sway-a{animation:scSwayA 6s ease-in-out infinite}.sc-sway-b{animation:scSwayB 6s ease-in-out infinite}.sc-glow{animation:scGlow 6s ease-in-out infinite}',
  '.sc-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:scSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}',
  '@keyframes scDrift{from{transform:scale(1.14) translate(-3%,-2%)}to{transform:scale(1.14) translate(3%,2%)}}.sc-alive>svg:first-of-type{animation:scDrift 16s ease-in-out infinite alternate}',
  '@keyframes scDraw{from{stroke-dashoffset:1.02}}.sc-draw{stroke-dasharray:1 2;animation:scDraw .9s cubic-bezier(.2,.8,.2,1) backwards}',
  '@keyframes scKnob{from{opacity:0;transform:scale(.3)}}.sc-knob{transform-box:fill-box;transform-origin:center;animation:scKnob .35s .75s cubic-bezier(.34,1.56,.64,1) backwards}',
  '@keyframes scGrow{from{transform:scaleY(0)}}.sc-grow{transform-origin:bottom;animation:scGrow .6s cubic-bezier(.2,.8,.2,1) backwards}',
  Array.from({ length: 13 }, (_, i) => `:nth-child(${i + 2})>.sc-grow{animation-delay:${((i + 1) * 0.04).toFixed(2)}s}`).join(''),
  '@media (prefers-reduced-motion:reduce){main>*,.sc-float,.sc-sway-a,.sc-sway-b,.sc-glow,.sc-alive>svg,.sc-draw,.sc-knob,.sc-grow{animation:none!important}.sc-sheen{display:none}button:active,.sc-press:active,.sc-lift:hover{transform:none}}'
].join('');
// Dark mode, and its gray look (dim): the app sets both from Settings (Appearance, and Dark mode: Gray or Black).
const DARK = { dark: { editor: 'boolean', default: false }, dim: { editor: 'boolean', default: false } };
const T = 'const t = this.theme(!!this.props.dark, !!this.props.dim);';
// Data: the web app passes its database as props.db; on the canvas, boards use the sample in mock.mjs.
const DB_JS = 'const db = this.props.db || this.mock(); const chrome = db.chrome();';

// ---------- icons (stroke, currentColor) ----------
const svg = (p, s = 18, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  decks: '<rect x="3" y="7" width="14" height="14" rx="3"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>',
  stats: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  connect: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  shuffle: '<path d="M3 7h3.5c2.2 0 3.4 1.1 4.6 3l1.8 3c1.2 1.9 2.4 3 4.6 3H21M3 17h3.5c1.4 0 2.4-.4 3.3-1.3M14.2 8.3c.9-.9 1.9-1.3 3.3-1.3H21M18 4l3 3-3 3M18 13l3 3-3 3"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  more: '<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  blank: '<path d="M4 7h6M14 7h6M4 12h3M11 12h9M4 17h9M17 17h3"/>',
  text: '<path d="M5 6h14M12 6v13"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  bracket: '<path d="M7 7H5.5A2.5 2.5 0 0 0 3 9.5v5A2.5 2.5 0 0 0 5.5 17H7M17 7h1.5A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H17M9 12h6"/>',
  kbdDown: '<rect x="3" y="3" width="18" height="12" rx="2.5"/><path d="M7 7h.01M10.5 7h.01M14 7h.01M17 7h.01M8 11h8M9 18.5l3 2.5 3-2.5"/>',
  shift: '<path d="M12 4l8 8h-4.5v7h-7v-7H4z"/>',
  del: '<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12 9l6 6M18 9l-6 6"/>',
  shiftOn: '<path d="M12 4l8 8h-4.5v7h-7v-7H4z" fill="currentColor"/>',
  emoji: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2a4.4 4.4 0 0 0 7 0"/><circle cx="9" cy="9.8" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.8" r="1" fill="currentColor" stroke="none"/>',
  ret: '<path d="M20 6v6a3 3 0 0 1-3 3H5"/><path d="M9 11l-4 4 4 4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9"/>',
  sqrt: '<path d="M3 13h2.5l3 6L14 5h7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  marker: '<path d="M14.5 4.5l5 5L11 18H6v-5z"/><path d="M4 21h9"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  sparkle: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-8-5-13-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 7 0 5 3 9 7 9z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  // Where Lucida posts (the landing and legal footers).
  tiktok: '<path d="M15.5 3c.4 2.7 2.3 4.6 5 5"/><path d="M15.5 3v11.8a4.3 4.3 0 1 1-4.3-4.3"/>',
  youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/>',
  facebook: '<circle cx="12" cy="12" r="9.5"/><path d="M15.5 7.5h-1.8a2.7 2.7 0 0 0-2.7 2.7v11.3M8.5 13.2h6"/>',
  live: '<circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6M8.2 15.8a5.4 5.4 0 0 1 0-7.6M18.7 5.3a9.5 9.5 0 0 1 0 13.4M5.3 18.7a9.5 9.5 0 0 1 0-13.4"/>'
};

// The mark: three dots, two above and one below, in the text color. The viewBox hugs the ink, so `h` is its real height.
const MARK_DOTS = [[7, 7], [26, 7], [16.5, 23.45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
const mark = h => `<svg width="${Math.round(h * 33 / 30.5)}" height="${h}" viewBox="0 0 33 30.5" fill="currentColor" aria-hidden="true" style="flex-shrink: 0; display: block;">${MARK_DOTS}</svg>`;
const logo = (size = 28) => `<div style="display: flex; align-items: center; gap: 9px;">${mark(Math.round(size / 2))}<div style="font-size: 17px; font-weight: 600; letter-spacing: -.02em;">Lucida</div></div>`;

// ---------- Structure A: web sidebar ----------
const NAV_A = [['Today', 'today', 'Main.dc.html', '64'], ['Library', 'decks', 'WebDecks.dc.html', ''], ['Stats', 'stats', 'WebStats.dc.html', ''], ['Connect AI', 'connect', 'WebConnect.dc.html', '']];
// Your profile circle follows Settings (color and initial): in the web sidebar, and on the iPhone's Today and Settings.
const AVATAR_ME = size => `<span style="width: ${size}px; height: ${size}px; flex-shrink: 0; border-radius: ${size / 2}px; background: {{me.bg}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size * 0.42)}px; font-weight: 600;">{{me.initial}}</span>`;
const sidebar = active => `<nav style="width: 240px; flex-shrink: 0; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid {{t.line}};">
  <div style="padding: 0 12px 20px;">${logo()}</div>
  ${NAV_A.map(([label, ic, href]) => `<a href="${href}" style="display: flex; align-items: center; gap: 12px; height: 36px; padding: 0 14px; border-radius: 999px; font-size: 14px; ${label === active ? 'background: {{t.surf}}; color: {{t.text}}; font-weight: 600;' : 'color: {{t.muted}};'}">${svg(I[ic])}${label}${label === 'Today' ? `<sc-if value="{{nav.today}}" hint-placeholder-val="{{ true }}"><span style="margin-left: auto; font-family: ${MONO}; font-size: 12px;">{{nav.today}}</span></sc-if>` : ''}</a>`).join('\n  ')}
  <div style="flex-grow: 1;"></div>
  <a href="WebSettings.dc.html" aria-label="Settings" style="display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 14px 0 9px; border-radius: 999px; font-size: 14px; ${active === 'You' ? 'background: {{t.surf}}; color: {{t.text}}; font-weight: 600;' : 'color: {{t.muted}};'}">${AVATAR_ME(28)}You<span style="margin-left: auto; display: flex;">${svg(I.gear, 18)}</span></a>
</nav>`;
// `board`: the page has things to drag (see drag.mjs), and popups and trays drawn over the whole page.
const webRoot = (inner, board = false) => `<div${board ? ' data-sc-board="{{dragKey}}"' : ''} style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};${board ? ' position: relative;' : ''}">
${inner}
</div>`;

const pill = (label, { inv = false, href = '', icon = '', h = 36, onClick = '' } = {}) => {
  const st = `height: ${h}px; padding: 0 ${h >= 44 ? 22 : h >= 36 ? 16 : 14}px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; border: 0; font: inherit; font-size: ${h >= 36 ? 14 : 13}px; font-weight: 600; cursor: pointer; ${inv ? 'background: {{t.inv}}; color: {{t.invText}};' : 'background: {{t.surf}}; color: {{t.text}};'}`;
  const inner = `${icon ? svg(I[icon], 16, 2) : ''}${label}`;
  return href ? `<a href="${href}" class="sc-press" style="${st}">${inner}</a>` : `<button type="button"${onClick ? ` onClick="${onClick}"` : ''} class="sc-press" style="${st}">${inner}</button>`;
};
const eyebrow = txt => `<div style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">${txt}</div>`;
const chip = (txt, extra = '') => `<span style="display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: {{t.surf}}; font-size: 12px; font-weight: 500; ${extra}">${txt}</span>`;
// The grading-style switcher (web: compact pill in the header; phone: full-width row).
const modeSeg = full => `<div role="group" aria-label="Grading style" style="display: ${full ? 'grid; grid-template-columns: repeat(3, minmax(0, 1fr))' : 'flex'}; gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
  <sc-for list="{{modes}}" as="m" hint-placeholder-count="3">
    <button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" title="{{m.long}}" style="height: ${full ? 34 : 36}px; padding: 0 ${full ? 8 : 16}px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button>
  </sc-for>
</div>`;
const stepper = (label, val, dec, inc, stacked = false, num = '') => stacked ? `<div style="padding: 12px 14px; border-radius: 18px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 4px;">
  <span style="font-size: 12px; color: {{t.muted}}; white-space: nowrap;">${label}</span>
  <span style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">${num ? numInput(num, { size: 20, w: 64, h: 32, radius: 10, left: true }) : `<span style="font-size: 20px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap;">{{${val}}}</span>`}<span style="display: flex; gap: 6px;"><button type="button" onClick="{{${dec}}}" aria-label="Less" style="width: 32px; height: 32px; border: 0; border-radius: 16px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 18px; font-weight: 600; cursor: pointer;">−</button><button type="button" onClick="{{${inc}}}" aria-label="More" style="width: 32px; height: 32px; border: 0; border-radius: 16px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 18px; font-weight: 600; cursor: pointer;">+</button></span></span>
</div>` : `<div style="padding: 12px 14px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
  <span style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; color: {{t.muted}};">${label}</span><span style="font-size: 20px; font-weight: 600; letter-spacing: -.02em;">{{${val}}}</span></span>
  <span style="display: flex; gap: 6px;"><button type="button" onClick="{{${dec}}}" aria-label="Less" style="width: 32px; height: 32px; border: 0; border-radius: 16px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 18px; font-weight: 600; cursor: pointer;">−</button><button type="button" onClick="{{${inc}}}" aria-label="More" style="width: 32px; height: 32px; border: 0; border-radius: 16px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 18px; font-weight: 600; cursor: pointer;">+</button></span>
</div>`;

// On/off switch; `v` names a renderVals object made by sw() below.
const SWITCH = (v, handler, label) => `<button type="button" role="switch" aria-checked="{{${v}.checked}}" aria-disabled="{{${v}.disabled}}" aria-label="${label}" onClick="{{${handler}}}" style="width: 48px; height: 28px; flex-shrink: 0; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{${v}.track}}; opacity: {{${v}.op}}; cursor: pointer; transition: background .2s;"><span style="display: block; width: 22px; height: 22px; border-radius: 11px; background: {{${v}.knobColor}}; transform: {{${v}.knob}}; transition: transform .2s cubic-bezier(.4,0,.2,1);"></span></button>`;
const SW_JS = `const sw = (on, enabled = true) => ({ checked: on ? 'true' : 'false', track: on ? t.inv : t.surf2, knob: on ? 'translateX(20px)' : 'translateX(0)', knobColor: on ? t.invText : t.bg, op: enabled ? '1' : '.4', disabled: enabled ? 'false' : 'true' });`;
// Small segmented control on a gray surface; `key` names a list made by opts() below.
const SEG = (key, label, n = 3) => `<div role="group" aria-label="${label}" style="display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: {{t.bg}}; flex-shrink: 0;"><sc-for list="{{${key}}}" as="o" hint-placeholder-count="${n}"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="height: 30px; padding: 0 12px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}};">{{o.label}}</button></sc-for></div>`;
const OPTS_JS = `const opts = (list, cur, set) => list.map(([id, label]) => ({ label, pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.inv : 'transparent', fg: id === cur ? t.invText : t.muted, pick: () => set(id) }));`;

// iOS keyboard (drawn, not interactive), with a floating formatting bar on top like Notion's.
const KB_JS = `const kb = this.props.dark
    ? { panel: '#2A2A2D', key: '#48484C', ink: '#FFFFFF', edge: '0 1px 0 rgba(0,0,0,.35)', bar: '#2C2C2F', barInk: '#EBEBF0', barLine: 'rgba(255,255,255,.14)', on: '#45454A', barShadow: '0 8px 28px rgba(0,0,0,.5), 0 0 0 .5px rgba(255,255,255,.1)' }
    : { panel: '#E3E4E9', key: '#FFFFFF', ink: '#000000', edge: '0 1px 0 rgba(0,0,0,.08)', bar: '#FFFFFF', barInk: '#3C3C43', barLine: 'rgba(60,60,67,.16)', on: '#ECECF1', barShadow: '0 8px 28px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.06)' };`;
const kbKey = (label, extra = '') => `<span style="height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; ${extra}">${label}</span>`;
const kbRow = (cols, keys, pad = 0) => `<div style="display: grid; grid-template-columns: ${cols}; gap: 6px;${pad ? ` padding: 0 ${pad}px;` : ''}">${keys}</div>`;
const KB_KEYS = `<div aria-hidden="true" style="box-sizing: border-box; padding: 10px 5px 0; border-radius: 26px 26px 44px 44px; background: {{kb.panel}}; display: flex; flex-direction: column; gap: 12px;">
    ${kbRow('repeat(10, minmax(0, 1fr))', [...'QWERTYUIOP'].map(k => kbKey(k)).join(''))}
    ${kbRow('repeat(9, minmax(0, 1fr))', [...'ASDFGHJKL'].map(k => kbKey(k)).join(''), 18)}
    ${kbRow('1.45fr .1fr repeat(7, minmax(0, 1fr)) .1fr 1.45fr', kbKey(svg(I.shiftOn, 21, 1.6)) + '<span></span>' + [...'ZXCVBNM'].map(k => kbKey(k)).join('') + '<span></span>' + kbKey(svg(I.del, 21, 1.7)))}
    ${kbRow('1.15fr 1.15fr 4.7fr 2.1fr', kbKey('123', 'font-size: 17px;') + kbKey(svg(I.emoji, 23, 1.6)) + kbKey('') + kbKey(svg(I.ret, 22, 1.8)))}
    <div style="height: 58px; box-sizing: border-box; padding: 6px 22px 0; display: flex; justify-content: space-between;">${svg(I.globe, 27, 1.5)}${svg(I.mic, 27, 1.5)}</div>
  </div>`;
const KB_H = 284;
const KEYBOARD = (bar = '') => `<div style="position: absolute; left: 0; right: 0; bottom: 0; color: {{kb.ink}}; font-family: -apple-system, system-ui, sans-serif;">${bar}${KB_KEYS}</div>`;
const barBtn = (label, glyph, handler = '', key = '') => `<button type="button" onMouseDown="{{keepFocus}}"${handler ? ` onClick="{{${handler}}}"` : ''} aria-label="${label}"${key ? ` aria-pressed="{{${key}.pressed}}"` : ''} style="width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: ${key ? `{{${key}.bg}}` : 'transparent'}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;">${glyph}</button>`;
const barRow = (on, hint, buttons) => `<sc-if value="{{${on}}}" hint-placeholder-val="{{ ${hint} }}"><div style="flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between;">${buttons}</div></sc-if>`;
const FMT_BAR = `<div role="toolbar" aria-label="Formatting" style="margin: 0 10px 12px; height: 48px; box-sizing: border-box; padding: 0 6px; border-radius: 999px; background: {{kb.bar}}; box-shadow: {{kb.barShadow}}; display: flex; align-items: center; gap: 4px;">
    ${barRow('fmtMain', 'true', barBtn('Text style', '<span style="font-size: 19px; font-weight: 500; letter-spacing: -.02em;">Aa</span>', 'openStyles') + barBtn('Make a blank', svg(I.bracket, 22, 1.6), 'fmt.blank.toggle', 'fmt.blank') + barBtn('List', svg(I.list, 21, 1.6), 'fmt.list.toggle', 'fmt.list') + barBtn('Add image', svg(I.image, 21, 1.6), 'fmt.img.toggle') + barBtn('Record audio', svg(I.mic, 21, 1.6), 'fmt.audio.toggle') + barBtn('Math', svg(I.sqrt, 21, 1.6), 'fmt.math.toggle', 'fmt.math') + barBtn('Undo', svg(I.undo, 21, 1.6), 'fmt.undo.toggle'))}
    ${barRow('fmtStyles', 'false', barBtn('Back to tools', svg(I.back, 20, 1.8), 'closeStyles') + barBtn('Bold', '<span style="font-size: 18px; font-weight: 700;">B</span>', 'fmt.b.toggle', 'fmt.b') + barBtn('Italic', '<span style="font-size: 19px; font-style: italic; font-family: Georgia, serif;">I</span>', 'fmt.i.toggle', 'fmt.i') + barBtn('Underline', '<span style="font-size: 18px; text-decoration: underline; text-underline-offset: 3px;">U</span>', 'fmt.u.toggle', 'fmt.u') + barBtn('Strikethrough', '<span style="font-size: 18px; text-decoration: line-through;">S</span>', 'fmt.s.toggle', 'fmt.s') + barBtn('Highlight', svg(I.marker, 21, 1.6), 'fmt.hl.toggle', 'fmt.hl'))}
    <span style="width: 1px; height: 26px; flex-shrink: 0; background: {{kb.barLine}};"></span>
    ${barBtn('Hide keyboard', svg(I.kbdDown, 22, 1.6), 'hideKeyboard')}
  </div>`;
// New pile: name it, then add it. Shared by the web popover and the iPhone dialog.
const PILE_FORM = `<span style="font-size: 16px; font-weight: 600;">New pile</span>
      <input type="text" value="{{pileName}}" onChange="{{setPileName}}" placeholder="Name it, like “Tricky ones”" aria-label="Pile name" style="height: 46px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: inset 0 0 0 2px {{t.text}}; font: inherit; font-size: 15px;">
      <div style="display: flex; gap: 8px;"><button type="button" onClick="{{cancelPile}}" style="flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button><button type="button" onClick="{{savePile}}" style="flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Add pile</button></div>`;

// Small − value + control for rows.
// A stepper number you can also click and type into. `num` names a renderVals object made by typed() (NUM_JS).
const numInput = (num, { size = 15, w = 44, h = 30, radius = 15, left = false } = {}) => `<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" class="sc-num" value="{{${num}.text}}" onChange="{{${num}.type}}" onFocus="{{${num}.focus}}" onBlur="{{${num}.done}}" onKeyDown="{{${num}.key}}" aria-label="{{${num}.label}}" style="width: ${w}px; height: ${h}px; box-sizing: border-box; ${left ? 'margin-left: -8px; padding: 0 8px; ' : 'padding: 0; text-align: center; '}border: 0; outline: 0; border-radius: ${radius}px; background: transparent; color: {{t.text}}; font: inherit; font-size: ${size}px; font-weight: 600;${left ? ' letter-spacing: -.02em;' : ''}">`;
const NUM_CSS = '.sc-num{cursor:text;transition:background-color .15s,box-shadow .15s}.sc-num:hover{background-color:color-mix(in srgb,currentColor 8%,transparent)!important}.sc-num:focus{background-color:transparent!important;box-shadow:inset 0 0 0 2px currentColor}';
// Typing a number saves as you type (0 to 999) and shows what you typed until you leave the field.
const NUM_JS = `const typed = (id, value, save, label) => {
    const draft = (this.state.numDraft || {})[id];
    const keep = v => this.setState({ numDraft: { ...(this.state.numDraft || {}), [id]: v } });
    return { text: draft != null ? draft : String(value), label,
      type: e => { const v = String(e.target.value).replace(/\\D/g, '').slice(0, 3); if (e.target.value !== v) e.target.value = v; keep(v); if (v !== '') save(+v); },
      focus: e => { const el = e.target; setTimeout(() => el.setSelectionRange && el.setSelectionRange(0, el.value.length), 0); },
      done: () => keep(null),
      key: e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.target.blur(); } } };
  };`;
const miniStep = (val, dec, inc, btnBg = '{{t.bg}}', num = '') => `<span style="display: flex; align-items: center; gap: ${num ? 8 : 10}px;"><button type="button" onClick="{{${dec}}}" aria-label="Less" style="width: 30px; height: 30px; border: 0; border-radius: 15px; background: ${btnBg}; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;">−</button>${num ? numInput(num) : `<span style="min-width: 40px; text-align: center; font-size: 15px; font-weight: 600;">{{${val}}}</span>`}<button type="button" onClick="{{${inc}}}" aria-label="More" style="width: 30px; height: 30px; border: 0; border-radius: 15px; background: ${btnBg}; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;">+</button></span>`;
// FSRS learning steps: the first short gaps for new cards. Tap one to remove it, + adds the next.
const STEPS_ROW = `<div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span style="font-size: 12px; color: {{t.muted}}; margin-right: 4px;">Learning steps</span><sc-for list="{{stepChips}}" as="x" hint-placeholder-count="2"><button type="button" onClick="{{x.remove}}" aria-label="Remove {{x.label}} step" style="height: 30px; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font-family: ${MONO}; font-size: 12px; font-weight: 500; cursor: pointer;">{{x.label}}<span style="display: flex; color: {{t.muted}};">${svg(I.close, 10, 2.4)}</span></button></sc-for><sc-if value="{{canAddStep}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{addStep}}" aria-label="Add a step" style="width: 30px; height: 30px; border: 0; border-radius: 15px; background: {{t.surf}}; color: {{t.text}}; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.plus, 12, 2.4)}</button></sc-if></div>`;
// Two-way segmented control on a panel (gray track, white pick); `key` names a list of { label, pressed, bg, fg, sh, pick }.
const panelSeg = (key, label, n = 2) => `<div role="group" aria-label="${label}" style="display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{${key}}}" as="o" hint-placeholder-count="${n}"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="height: 34px; padding: 0 10px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}};">{{o.label}}</button></sc-for></div>`;

// Soft blurred color field + fine film grain (surfaces.mjs); `key` names the renderVals object holding a palette.
const flowLayer = key => flowSvg(k => `{{${key}.${k}}}`);
const pick = (o, path) => path.split('.').reduce((a, k) => a[k], o);
const GRAIN_LAYER = grainSvg('{{grain}}', { blend: 'soft-light', freq: 0.85, slope: 3.4, id: 'sc-grain' });
const meshCard = (key, outer, inner, body, tag = 'div', attrs = '') => `<${tag}${attrs} style="position: relative; overflow: hidden; color: {{${key}.ink}}; background: {{${key}.base}}; ${outer}">${flowLayer(key)}${GRAIN_LAYER}<div style="position: relative; text-shadow: {{${key}.shadow}}; ${inner}">${body}</div></${tag}>`;
const glass = 'background: {{hero.glass}}; box-shadow: inset 0 0 0 1.5px {{hero.glassLine}}; color: {{hero.ink}};';
const MESH = def => ({ gradient: { editor: 'enum', default: def, options: PALETTE_NAMES }, grain: { editor: 'range', default: 0.7, min: 0, max: 1, step: 0.05 } });
const MESH_VALS = def => `hero: this.mesh(this.props.gradient ?? '${def}'), grain: String(this.props.grain ?? 0.7),`;
// The landing page and the sign-in wall move dozens of these cards, which phones can't redraw live. There (props.site
// on the site, props.db in the app) a card's color field is a picture from design/art.mjs (web/art) under one grain
// tile (web/fast.css); the canvas draws it live. `variant` picks a picture drawn at another shape.
const ART_DIR = new URL('../web/art/', import.meta.url);
const ART_FILES = existsSync(ART_DIR) ? readdirSync(ART_DIR).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort() : [];
const ART_METHOD = `art(p, variant) {
  const name = p.fid + (variant ? '-' + variant : ''), on = !!(this.props.site || this.props.db) && ${JSON.stringify(ART_FILES)}.includes(name);
  return { ...p, art: on ? 'url(/art/' + name + '.webp)' : '', live: !on };
}`;
const ART_LAYERS = key => `<sc-if value="{{${key}.art}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; background: {{${key}.art}} center / 100% 100% no-repeat;"></div><div class="sc-grain" style="opacity: {{grain}};"></div></sc-if><sc-if value="{{${key}.live}}" hint-placeholder-val="{{ true }}">${flowLayer(key)}${GRAIN_LAYER}</sc-if>`;
const artCard = (key, outer, inner, body) => `<div style="position: relative; overflow: hidden; color: {{${key}.ink}}; background: {{${key}.base}}; ${outer}">${ART_LAYERS(key)}<div style="position: relative; text-shadow: {{${key}.shadow}}; ${inner}">${body}</div></div>`;
writeFileSync(new URL('../web/fast.css', import.meta.url), `/* Made by design/build.mjs. Film grain for gradient cards drawn from pictures (web/art): one tile, drawn once. */
.sc-grain { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: soft-light; background: url("data:image/svg+xml,${encodeURIComponent(grainTile(256)).replace(/'/g, '%27')}") 0 0 / 256px 256px; }
`);

const DECKS = `[
  { name: 'Cell Biology', total: '412', due: 28, overdue: 12, soon: 0, fresh: 10, ret: '91%' },
  { name: 'Japanese · JLPT N4', total: '1,280', due: 19, overdue: 5, soon: 0, fresh: 20, ret: '87%' },
  { name: 'Organic Chemistry', total: '236', due: 11, overdue: 0, soon: 0, fresh: 5, ret: '84%' },
  { name: 'US History', total: '158', due: 6, overdue: 0, soon: 0, fresh: 0, ret: '93%' },
  { name: 'System Design', total: '74', due: 0, overdue: 0, soon: 1, fresh: 8, ret: '89%' },
  { name: 'Spanish Verbs', total: '310', due: 0, overdue: 0, soon: 3, fresh: 0, ret: '95%' }
]`;
const AI_ITEMS = `[
  { id: 1, src: 'Claude', kind: 'Fill in the blank', front: 'The ____ is the powerhouse of the cell.', deck: 'Cell Biology' },
  { id: 2, src: 'ChatGPT', kind: 'Audio', front: 'What word do you hear? (でんしゃ)', deck: 'Japanese · JLPT N4' },
  { id: 3, src: 'Claude', kind: 'Image', front: 'Name structure 1 on the diagram.', deck: 'Cell Biology' }
]`;
const AI_LOGIC = `
  const done = this.state.handled || {};
  const items = ${AI_ITEMS}.filter(i => !done[i.id]).map(i => ({ ...i,
    keep: () => this.setState({ handled: { ...done, [i.id]: 'kept' } }),
    toss: () => this.setState({ handled: { ...done, [i.id]: 'tossed' } }) }));
  const kept = Object.values(done).filter(v => v === 'kept').length;
  const tossed = Object.values(done).filter(v => v === 'tossed').length;`;

// Cards due each day: the count sits on each bar, darker periwinkle means a busier day, the busiest is called out.
const DUE_14 = { vals: [32, 18, 24, 12, 30, 8, 16, 22, 14, 26, 10, 20, 6, 12], labels: ['23', '24', '25', '26', '27', '28', '29', '30', '1', '2', '3', '4', '5', '6'], tops: ['W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T'], names: ['tomorrow', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27', 'Mon 28', 'Tue 29', 'Wed 30', 'Thu, Oct 1', 'Fri, Oct 2', 'Sat, Oct 3', 'Sun, Oct 4', 'Mon, Oct 5', 'Tue, Oct 6'] };
const FORECAST_JS = (data, maxH) => `
  // Periwinkle by load, from the heat map's family; the busiest day gets the darkest bar.
  const fcScale = this.props.dark ? ['#2A3374', '#3A4BB0', '#5569E4', '#8C9AFC'] : ['#C9CFFC', '#9DA9F8', '#7282F0', '#4353E0'];
  const fc = ${typeof data === 'string' ? data : JSON.stringify(data)};
  const fcPeak = Math.max(0, ...fc.vals), fcMax = Math.max(1, fcPeak), fcTop = fc.vals.indexOf(fcPeak);
  const forecast = fc.vals.map((n, i) => ({ n: String(n), d: fc.labels[i], w: fc.tops ? fc.tops[i] : '', h: Math.max(6, Math.round(n / fcMax * ${maxH})) + 'px',
    c: fcScale[n === fcMax ? 3 : n >= fcMax * 0.75 ? 2 : n >= fcMax * 0.4 ? 1 : 0], strong: i === fcTop ? t.text : t.muted, weight: i === fcTop ? '600' : '400' }));
  const dueTotal = fc.vals.reduce((a, b) => a + b, 0) + ' cards';
  const busy = { c: fcScale[3], text: fcPeak ? 'Busiest: ' + fc.names[fcTop] + ', ' + fcMax + ' cards' : 'Nothing due yet' };`;
const DUE_HEAD = (span, stacked) => stacked
  ? `<div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 600;">Cards due each day</span><span style="font-size: 12px; color: {{t.muted}};">${span} · {{dueTotal}} in all</span></div>`
  : `<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px;"><span style="font-size: 16px; font-weight: 600;">Cards due each day <span style="font-weight: 400; color: {{t.muted}};">· ${span}</span></span><span style="font-size: 13px; color: {{t.muted}};">{{dueTotal}} in all</span></div>`;
const DUE_BARS = (n, gap, radius, twoLine = false) => `<div style="flex-grow: 1; display: flex; align-items: flex-end; gap: ${gap}px;">
        <sc-for list="{{forecast}}" as="f" hint-placeholder-count="${n}"><div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 5px;"><span style="font-family: ${MONO}; font-size: 11px; font-weight: 600; color: {{f.strong}};">{{f.n}}</span><div class="sc-grow" style="width: 100%; border-radius: ${radius}px; background: {{f.c}}; height: {{f.h}};"></div><span style="display: flex; flex-direction: column; align-items: center; font-size: 11px; line-height: 1.3; color: {{f.strong}}; font-weight: {{f.weight}}; white-space: nowrap;">${twoLine ? '<span style="opacity: .7;">{{f.w}}</span>' : ''}{{f.d}}</span></div></sc-for>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: {{t.muted}};"><span style="width: 10px; height: 10px; border-radius: 3px; background: {{busy.c}};"></span>{{busy.text}}</div>`;

// Main = Web Today
const webToday = webRoot(`${sidebar('Today')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; gap: 40px;">
  <section style="flex-grow: 1; display: flex; flex-direction: column; gap: 36px; min-width: 0;">
    ${meshCard('hero', 'border-radius: 20px; height: 160px; flex-shrink: 0;', 'height: 100%; box-sizing: border-box; padding: 28px 32px; display: flex; align-items: flex-end; justify-content: space-between;', `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="font-size: 14px; opacity: .8;">{{heroMeta}}</div>
        <h1 style="margin: 0; font-size: 42px; font-weight: 500; line-height: 1; letter-spacing: -.04em;">{{heroTitle}}</h1>
        <div style="font-size: 14px; opacity: .8;">{{heroSub}}</div>
      </div>
      <div style="display: flex; gap: 10px;">
        <a href="{{newCardHref}}" style="height: 36px; padding: 0 20px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; ${glass} font-size: 14px; font-weight: 600;">${svg(I.plus, 16, 2)}New card</a>
        <a href="{{heroHref}}" style="height: 36px; padding: 0 24px; display: inline-flex; align-items: center; border-radius: 999px; background: #FFFFFF; color: #000000; font-size: 14px; font-weight: 600;">{{heroCta}}</a>
      </div>`, 'div', ' class="sc-alive"')}

    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">${eyebrow('Decks')}<span style="font-size: 12px; color: {{t.muted}};">Most urgent first</span></div>
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="6">
        <div class="sc-row" style="position: relative; display: flex; align-items: center; gap: 16px; height: 56px; border-bottom: 1px solid {{t.line}};">
          <a href="{{d.href}}" aria-label="{{d.name}}" class="sc-hit" style="position: absolute; inset: 0;"></a>
          <span style="flex-grow: 1; min-width: 0; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</span>
          <span style="flex-shrink: 0; height: 26px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 600; background: {{d.tagBg}}; color: {{d.tagFg}};">{{d.tag}}</span>
          <span style="flex-shrink: 0; width: 40px; text-align: right; font-family: ${MONO}; font-size: 15px; color: {{d.countColor}};">{{d.due}}</span>
          <span style="position: relative; flex-shrink: 0; width: 100px; display: flex; justify-content: flex-end; pointer-events: none;">
            <sc-if value="{{d.canStudy}}" hint-placeholder-val="{{ true }}"><span style="display: flex; pointer-events: auto;">${pill('Flashcards', { href: '{{d.studyHref}}', h: 32 })}</span></sc-if>
            <sc-if value="{{d.noStudy}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">Up to date</span></sc-if>
          </span>
        </div>
      </sc-for>
    </div>
  </section>

  <aside style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="width: 36px; height: 36px; border-radius: 18px; background: linear-gradient(135deg, #FFC857 0%, #F58A3A 55%, #EE5A36 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">${svg(I.flame, 18, 2)}</span>
        <span style="display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 15px; font-weight: 600;">{{streakTitle}}</span><span style="font-size: 12px; color: {{t.muted}};">{{bestLine}}</span></span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px;">
        <sc-for list="{{week}}" as="w" hint-placeholder-count="7">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;"><div style="width: 28px; height: 28px; border-radius: 14px; background: {{w.fill}}; box-shadow: {{w.ring}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center;"><sc-if value="{{w.done}}" hint-placeholder-val="{{ false }}">${svg(I.check, 14, 3)}</sc-if></div><span style="font-size: 11px; color: {{w.labelColor}}; font-weight: {{w.weight}};">{{w.d}}</span></div>
        </sc-for>
      </div>
    </div>
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 14px;">
      ${DUE_HEAD('Next 7 days', true)}
      ${DUE_BARS(7, 8, 8)}
    </div>
  </aside>
</main>`);
const todayLogic = `
renderVals() {
  ${T}${DB_JS}
  const td = db.today();
  ${FORECAST_JS('td.forecast', 64)}
  const streak = 'linear-gradient(135deg, #FFC857 0%, #F58A3A 55%, #EE5A36 100%)';
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  // Most urgent first: overdue cards, then cards due today, then whatever is due soonest.
  // All caught up: nothing due today, so every deck shows when it's next due.
  const caught = !td.due;
  const decks = db.decks().filter(d => !d.paused).sort((a, b) => (b.overdue - a.overdue) || (b.due - a.due) || ((a.soon ?? 1e9) - (b.soon ?? 1e9))).map(d => {
    const tag = d.overdue ? { tag: d.overdue + ' overdue', tagBg: t.againTint, tagFg: t.again }
      : d.due ? { tag: 'Due today', tagBg: t.hardTint, tagFg: t.hard }
      : d.soon == null ? { tag: d.fresh ? d.fresh + ' new' : 'No cards yet', tagBg: t.surf, tagFg: t.muted }
      : { tag: d.soon === 1 ? 'Next: tomorrow' : 'Next: in ' + d.soon + ' days', tagBg: t.surf, tagFg: t.muted };
    // Flashcards whenever there's something to study (cards due, or new ones to learn).
    return { ...d, ...tag, canStudy: d.due > 0 || d.fresh > 0, noStudy: !d.due && !d.fresh, countColor: d.due ? t.text : t.muted };
  });
  return {
    ${MESH_VALS('Iris')}
    t, decks, ...chrome,
    heroMeta: td.date + (td.streak ? ' · ' + td.streak + '-day streak' : ''),
    streakTitle: td.streak ? td.streak + '-day streak' : 'No streak yet', bestLine: 'Best: ' + plural(td.best, 'day'),
    heroTitle: caught ? 'All caught up' : plural(td.due, 'card') + ' due',
    heroSub: caught ? (td.next ? 'Next review ' + td.next.day + ' · ' + plural(td.next.n, 'card') : 'Nothing scheduled yet') : 'About ' + plural(td.minutes, 'minute'),
    // Only Learn mode's button says Learn (the owner: "learn button needs to be 'learn'"); this one starts flashcards.
    heroCta: caught ? (td.fresh ? 'Study ' + plural(td.fresh, 'new card') : 'Add cards') : 'Study all',
    heroHref: caught && !td.fresh ? td.newCardHref : td.studyHref, newCardHref: td.newCardHref,
    week: td.week.map(w => ({ d: w.d, done: w.done, fill: w.done ? streak : t.surf2, ring: w.today ? '0 0 0 2px ' + t.surf + ', 0 0 0 4px #F58A3A' : 'none', labelColor: w.today ? t.text : t.muted, weight: w.today ? '600' : '400' })),
    forecast, dueTotal, busy
  };
}`;

// Decks
// Tags: each has a color. Decks are tagged; filter by tag on Decks, edit tags in New deck and Deck settings.
const TAG_JS = `const tagC = { Biology: '#30A46C', Chemistry: '#F76B15', Languages: '#3E63DD', MCAT: '#8E4EC6', History: '#AD7F58', 'Computer science': '#12A594', Exam: '#E5484D', 'Year 1': '#0090FF',
    Energy: '#D6409F', Organelles: '#12A594', 'Exam 1': '#E5484D', 'Exam 2': '#F76B15', Diagrams: '#3E63DD', Proteins: '#8E4EC6', Pronunciation: '#0090FF', Cells: '#3E63DD',
    'BIO 201': '#05A2C2', 'Fall 2026': '#AD7F58', Midterm: '#F76B15', 'Final exam': '#E5484D', 'Pre-med': '#E93D82', Lab: '#12A594', 'Must know': '#AB4ABA', Mitochondria: '#30A46C', Tricky: '#F76B15' };
  const tagPal = ['#30A46C', '#F76B15', '#3E63DD', '#8E4EC6', '#AD7F58', '#12A594', '#E5484D', '#0090FF', '#D6409F', '#05A2C2'];
  const tagCol = g => tagC[g] || tagPal[Array.from(g).reduce((a, ch) => a + ch.charCodeAt(0), 0) % tagPal.length];
  const tagChip = g => ({ label: g, dot: tagCol(g), bg: tagCol(g) + '26', fg: tagCol(g) });
  // More tags than room: show the first few, then a +N chip in the last slot (so never "+1").
  const tagFit = (tags, max) => { const tg = tags || [], vis = tg.length > max ? tg.slice(0, max - 1) : tg; return { vis, more: tg.length - vis.length }; };
  // Add tag: find any tag you have, tick it on or off, or make a new one.
  const tagPicker = (cur, set, key, own) => {
    const st = this.state, open = st[key + 'Open'] == null ? !!this.props.tagPicker : st[key + 'Open'];
    const q = (st[key + 'Q'] || '').trim(), ql = q.toLowerCase();
    const lib = Array.from(new Set([...(own || Object.keys(tagC)), ...cur])).sort((a, b) => a.localeCompare(b));
    const shown = lib.filter(g => !ql || g.toLowerCase().includes(ql));
    return {
      open, expanded: open ? 'true' : 'false', query: q, count: String(cur.length),
      toggle: () => this.setState({ [key + 'Open']: !open, [key + 'Q']: '' }), close: () => this.setState({ [key + 'Open']: false, [key + 'Q']: '' }),
      setQuery: e => this.setState({ [key + 'Q']: e && e.target ? e.target.value : '' }),
      options: shown.map(g => ({ ...tagChip(g), on: cur.includes(g), pressed: cur.includes(g) ? 'true' : 'false', pick: () => set(cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]) })),
      canMake: !!q && !lib.some(g => g.toLowerCase() === ql), makeLabel: 'Make “' + q + '”',
      make: () => { set([...cur, q]); this.setState({ [key + 'Q']: '' }); }
    };
  };`;
// Tag menus: a search box, then one row per tag (color dot, name, optional count, a check when it's on).
const tagSearch = (q, set, ph, h = 40) => `<label style="display: flex; align-items: center; gap: 8px; height: ${h}px; flex-shrink: 0; padding: 0 14px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};">${svg(I.search, 14)}<span style="position: absolute; left: -9999px;">${ph}</span><input value="{{${q}}}" onChange="{{${set}}}" placeholder="${ph}" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: ${h > 40 ? 16 : 14}px; color: {{t.text}};"></label>`;
const tagRow = (o, { count = false, h = 38, line = false } = {}) => `<button type="button" onClick="{{${o}.pick}}" aria-pressed="{{${o}.pressed}}" style="height: ${h}px; flex-shrink: 0; padding: 0 ${line ? 4 : 12}px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: ${line ? 0 : 12}px; ${line ? 'border-bottom: 1px solid {{t.line}}; ' : ''}background: transparent; color: {{t.text}}; font: inherit; font-size: ${h > 40 ? 16 : 14}px; text-align: left; cursor: pointer;"><span style="width: ${h > 40 ? 10 : 8}px; height: ${h > 40 ? 10 : 8}px; flex-shrink: 0; border-radius: 5px; background: {{${o}.dot}};"></span><span style="flex-grow: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{${o}.label}}</span>${count ? `<span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{${o}.count}}</span>` : ''}<sc-if value="{{${o}.on}}" hint-placeholder-val="{{ false }}"><span style="display: flex;">${svg(I.check, 15, 2.4)}</span></sc-if></button>`;
const popBox = 'box-sizing: border-box; padding: 8px; border-radius: 22px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 4px;';
// Filter by tag: every tag, with how many decks (or cards) have it.
const tagMenu = (m, pos, { label = 'Filter by tag', find = 'Find a tag', none = 'No tags match' } = {}) => `<sc-if value="{{${m}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="${label}" style="position: absolute; ${pos} z-index: 30; width: 300px; ${popBox}">${tagSearch(m + '.query', m + '.setQuery', find)}<div style="max-height: 304px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column;"><sc-for list="{{${m}.rows}}" as="o" hint-placeholder-count="6">${tagRow('o', { count: true })}</sc-for><sc-if value="{{${m}.none}}" hint-placeholder-val="{{ false }}"><span style="padding: 10px 12px; font-size: 13px; color: {{t.muted}};">${none}</span></sc-if></div></div></sc-if>`;
const makeRow = (pk, h = 38) => `<sc-if value="{{${pk}.canMake}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{${pk}.make}}" style="height: ${h}px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: ${h > 40 ? 16 : 14}px; font-weight: 600; text-align: left; cursor: pointer;">${svg(I.plus, 13, 2.4)}{{${pk}.makeLabel}}</button></sc-if>`;
// Tags on a deck or card: x removes one. Add tag opens the picker: a menu on web, its own sheet on iPhone.
const TAG_EDIT = (list, pk, phone = false) => `<div style="${phone ? '' : 'position: relative; '}display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{${list}}}" as="g" hint-placeholder-count="2"><button type="button" onClick="{{g.remove}}" aria-label="Remove tag {{g.label}}" style="height: 32px; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">{{g.label}}<span style="display: flex; opacity: .7;">${svg(I.close, 10, 2.4)}</span></button></sc-for><button type="button" onClick="{{${pk}.toggle}}" aria-expanded="{{${pk}.expanded}}" style="height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: 999px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.plus, 12, 2.4)}Add tag</button>${phone
  ? `<sc-if value="{{${pk}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Tags" style="position: absolute; inset: 0; z-index: 30; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 18px; font-weight: 600;">Tags<span style="margin-left: 8px; font-family: ${MONO}; font-size: 13px; font-weight: 500; color: {{t.muted}};">{{${pk}.count}}</span></span><button type="button" onClick="{{${pk}.close}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Done</button></div>${tagSearch(pk + '.query', pk + '.setQuery', 'Find or make a tag', 44)}<div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column;">${makeRow(pk, 48)}<sc-for list="{{${pk}.options}}" as="o" hint-placeholder-count="8">${tagRow('o', { h: 48, line: true })}</sc-for></div></div></sc-if>`
  : `<sc-if value="{{${pk}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Add a tag" style="position: absolute; left: 0; top: calc(100% + 8px); z-index: 30; width: 320px; max-width: 100%; ${popBox}">${tagSearch(pk + '.query', pk + '.setQuery', 'Find or make a tag')}<div style="max-height: 190px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column;">${makeRow(pk)}<sc-for list="{{${pk}.options}}" as="o" hint-placeholder-count="5">${tagRow('o')}</sc-for></div></div></sc-if>`}</div>`;
const viewBtn = (key, handler, label, icon) => `<button type="button" onClick="{{${handler}}}" aria-label="${label}" aria-pressed="{{${key}.pressed}}" style="width: 42px; height: 36px; border: 0; border-radius: 999px; background: {{${key}.bg}}; color: {{${key}.fg}}; box-shadow: {{${key}.sh}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[icon], 16, 2)}</button>`;
// One glass chip per tag on a deck's gradient card (a chip in list view). Clicking one shows every deck with that tag,
// like the chips in the +N menu, instead of opening the deck.
const glassTag = k => `<sc-if value="{{d.${k}.show}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{d.${k}.pick}}" title="Every deck tagged {{d.${k}.label}}" style="height: 26px; padding: 0 11px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{d.glass}}; box-shadow: inset 0 0 0 1px {{d.glassLine}}; color: inherit; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: none; cursor: pointer; pointer-events: auto;">{{d.${k}.label}}</button></sc-if>`;
const tagSlot = k => `<sc-if value="{{d.${k}.show}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{d.${k}.pick}}" title="Every deck tagged {{d.${k}.label}}" style="height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{d.${k}.bg}}; color: {{d.${k}.fg}}; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; pointer-events: auto;">{{d.${k}.label}}</button></sc-if>`;
// A deck's +N chip opens a menu with all of its tags; pick one to see every deck that has it.
const deckTagsPop = pos => `<sc-if value="{{d.tagsOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Tags on {{d.name}}" style="position: absolute; ${pos} z-index: 20; pointer-events: auto; width: 320px; box-sizing: border-box; padding: 16px; border-radius: 24px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 12px; text-shadow: none;">
  <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 14px; font-weight: 600;">{{d.tagCount}}</span><button type="button" onClick="{{d.toggleTags}}" aria-label="Close" style="width: 28px; height: 28px; border: 0; border-radius: 14px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.4)}</button></div>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{d.allTags}}" as="g" hint-placeholder-count="6"><button type="button" onClick="{{g.pick}}" style="height: 28px; padding: 0 11px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer;">{{g.label}}</button></sc-for></div>
  <a href="{{d.settingsHref}}" style="align-self: flex-start; font-size: 13px; font-weight: 600; color: {{t.muted}};">Edit tags</a>
</div></sc-if>`;
const moreTag = (bg, h) => `<sc-if value="{{d.more.show}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{d.toggleTags}}" aria-expanded="{{d.expanded}}" aria-label="Show all {{d.tagCount}}" style="height: ${h}px; padding: 0 10px; flex-shrink: 0; display: inline-flex; align-items: center; border: 0; border-radius: 999px; ${bg} font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: none; cursor: pointer; pointer-events: auto;">{{d.more.label}}</button></sc-if>`;
// A card's tag as a small chip; `k` names the row's tag slot (c1, c2).
const cardTag = k => `<sc-if value="{{r.${k}.show}}" hint-placeholder-val="{{ true }}"><span style="height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; background: {{r.${k}.bg}}; color: {{r.${k}.fg}}; font-size: 11px; font-weight: 600; white-space: nowrap;">{{r.${k}.label}}</span></sc-if>`;
// Cards show up to two tags; with more, the first one and a +N (hover it to read the rest).
const cardMore = `<sc-if value="{{r.cMore.show}}" hint-placeholder-val="{{ false }}"><span title="{{r.cMore.title}}" style="height: 22px; padding: 0 8px; flex-shrink: 0; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}}; font-size: 11px; font-weight: 600; white-space: nowrap;">{{r.cMore.label}}</span></sc-if>`;
const CARD_TAGS_JS = `const cardSlot = (tags, i) => (tags && tags[i] ? { show: true, ...tagChip(tags[i]) } : { show: false, label: '', bg: 'transparent', fg: t.text });
  const cardFit = tags => { const fit = tagFit(tags, 2); return { c1: cardSlot(fit.vis, 0), c2: cardSlot(fit.vis, 1), cMore: { show: fit.more > 0, label: '+' + fit.more, title: (tags || []).slice(fit.vis.length).join(', ') } }; };`;
// ---------- Library (was Decks) ----------
// The owner (V96): "rename decks to library", folders for decks, and every card in one place to filter by tags and
// difficulty. One board is the whole Library: your folders and decks, one folder's decks (prop `folder`), or all your
// cards (prop `mode`). The app gives each its own address: /library, /library/folder/<id>, /library/cards.
const LIST_COLS = 'display: grid; grid-template-columns: 44px minmax(0, 1.5fr) minmax(0, 1.3fr) 70px 80px 120px 164px; gap: 16px; align-items: center;';
const CARD_COLS = 'display: grid; grid-template-columns: 36px minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, .9fr) 170px 80px 96px; gap: 16px; align-items: center;';
// Decks or All cards: two links, since each is its own page.
const libModes = (h, fs = 13, grow = false) => `<div role="group" aria-label="Show" style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{modes}}" as="m" hint-placeholder-count="2"><a href="{{m.href}}" aria-current="{{m.current}}" style="height: ${h}px; padding: 0 16px; ${grow ? 'flex: 1 1 0; ' : ''}display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}}; font-size: ${fs}px; font-weight: 600; white-space: nowrap;">{{m.label}}</a></sc-for></div>`;
// A folder: its first decks' colors fanned like cards, its name, and how many decks and due cards are in it.
const folderTile = (h, w, pad = '18px 20px') => `<a href="{{f.href}}" data-sc-drop="folder:{{f.id}}" data-sc-look="tile" draggable="false" class="sc-lift" style="position: relative; height: ${h}px; box-sizing: border-box; padding: ${pad}; border-radius: 20px; background: {{t.surf}}; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
  <span aria-hidden="true" style="position: relative; height: ${Math.round(w * .68) + 8}px;"><sc-for list="{{f.swatches}}" as="w" hint-placeholder-count="3"><span style="position: absolute; left: {{w.x}}; top: {{w.y}}; width: ${w}px; height: ${Math.round(w * .68)}px; border-radius: 12px; background: {{w.base}}; transform: rotate({{w.r}}); box-shadow: 0 8px 18px -8px rgba(0,0,0,.4), 0 0 0 2px {{t.surf}};"></span></sc-for><sc-if value="{{f.empty}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; left: -2px; top: 2px; color: {{t.muted}};">${svg(I.folder, 44, 1.5)}</span></sc-if></span>
  <span style="display: flex; flex-direction: column; gap: 3px; min-width: 0;"><span style="font-size: 17px; font-weight: 600; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{f.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{f.line}}</span></span>
</a>`;
// Naming a folder, in a popup over the dimmed page (the owner: "'new folder' button should bring up a popup menu"): a new
// one, or this one (Rename). Enter or the button saves; Escape, Cancel, or a click outside closes it. On the iPhone it
// sits above the keyboard, drawn on the canvas (the app has the phone's own).
const folderPopup = phone => `<sc-if value="{{naming.show}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; z-index: 80;${phone ? '' : ' display: flex; align-items: center; justify-content: center;'}">
  <div class="sc-fade" onClick="{{naming.cancel}}" style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-modal="true" aria-label="{{naming.title}}" class="sc-pop" style="position: ${phone ? 'absolute; left: 16px; right: 16px; top: 20%; padding: 20px; border-radius: 28px;' : 'relative; width: 440px; padding: 28px; border-radius: 32px; box-shadow: 0 24px 64px rgba(0,0,0,.24);'} box-sizing: border-box; background: {{t.bg}}; color: {{t.text}}; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: ${phone ? 20 : 22}px; font-weight: 600; letter-spacing: -.02em;">{{naming.title}}</span><sc-if value="{{naming.hasHint}}" hint-placeholder-val="{{ true }}"><span style="font-size: 14px; line-height: 1.4; color: {{t.muted}};">{{naming.hint}}</span></sc-if></div>
    <label style="display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 16px; box-sizing: border-box; border-radius: 16px; background: {{t.surf}}; color: {{t.muted}}; box-shadow: inset 0 0 0 2px {{t.text}};">${svg(I.folder, 18, 1.8)}<input type="text" value="{{naming.value}}" onChange="{{naming.set}}" onKeyDown="{{naming.key}}" ref="{{naming.ref}}" placeholder="Folder name" aria-label="Folder name" maxlength="80" autocomplete="off" style="flex-grow: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: {{t.text}};"></label>
    <div style="display: flex; gap: 10px;"><button type="button" onClick="{{naming.cancel}}" data-key="escape" style="flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Cancel</button><button type="button" onClick="{{naming.save}}" aria-disabled="{{naming.off}}" style="flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{naming.bg}}; color: {{naming.fg}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s;">{{naming.action}}</button></div>
  </div>${phone ? `
  <sc-if value="{{drawKb}}" hint-placeholder-val="{{ true }}">${KEYBOARD()}</sc-if>` : ''}
</div></sc-if>`;
// While a card is dragged: the Move to tray, your other decks to drop it on (see drag.mjs). `key` names the decks.
const moveTray = (key, phone) => `<div data-sc-tray="1" style="display: {{trayShow}}; position: absolute; ${phone ? 'left: 12px; right: 12px; bottom: 24px;' : 'left: 240px; right: 0; bottom: 28px; justify-content: center;'} z-index: 70; pointer-events: none;">
  <div role="group" aria-label="Move to" class="sc-tray" style="${phone ? 'flex-grow: 1; min-width: 0; padding: 14px 14px 16px; border-radius: 28px;' : 'max-width: 880px; padding: 14px 16px 16px; border-radius: 26px;'} box-sizing: border-box; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 0 0 1px {{t.line}}, 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 10px; pointer-events: auto;">
    <span style="padding: 0 4px; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Move to</span>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: ${phone ? 184 : 136}px; overflow: hidden;"><sc-for list="{{${key}}}" as="o" hint-placeholder-count="4"><span data-sc-drop="deck:{{o.id}}" data-sc-look="chip" style="max-width: 100%; height: 40px; box-sizing: border-box; padding: 0 14px 0 8px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; font-size: 14px; font-weight: 600; white-space: nowrap;"><span style="width: 24px; height: 24px; flex-shrink: 0; border-radius: 8px; background: {{o.base}};"></span><span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">{{o.name}}</span></span></sc-for></div>
  </div>
</div>`;
// Decks and cards you can drag (see drag.mjs): a held finger drags instead of selecting words or opening the phone's
// link menu. A deck's row lights up under the pointer, since all of it opens the deck. The popup and the Move to tray
// rise in; reduced motion keeps them still.
const DRAG_CSS = '.sc-drag{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}.sc-hit:focus-visible{outline:2px solid currentColor;outline-offset:-2px}'
  + '.sc-row .sc-hit::before{content:"";position:absolute;inset:4px -12px;border-radius:14px;background:currentColor;opacity:0;transition:opacity .15s}.sc-row:hover .sc-hit::before{opacity:.05}'
  + '@keyframes scTray{from{opacity:0;transform:translateY(18px) scale(.98)}}.sc-tray{animation:scTray .3s cubic-bezier(.2,.8,.2,1)}'
  + '@keyframes scPop{from{opacity:0;transform:translateY(12px) scale(.97)}}.sc-pop{animation:scPop .26s cubic-bezier(.2,.8,.2,1)}@keyframes scFade{from{opacity:0}}.sc-fade{animation:scFade .2s ease}'
  + '@media (prefers-reduced-motion:reduce){.sc-tray,.sc-pop,.sc-fade{animation:none}}';
// How a dragged deck or card looks while it's lifted: a tile gets a deeper shadow; a row gets the page behind it, a
// little room around its words, and a shadow.
const LIFT_JS = `const liftTile = 'border-radius:20px!important;box-shadow:0 30px 60px -18px rgba(0,0,0,.5)!important;';
  const liftRow = 'background:' + t.bg + '!important;border-radius:12px!important;border-bottom-color:transparent!important;box-shadow:0 0 0 12px ' + t.bg + ',0 0 0 13px ' + t.line + ',0 24px 48px -12px rgba(0,0,0,' + (this.props.dark ? '.8' : '.25') + ')!important;';
  const dragKey = this.dragKey || (this.dragKey = 'b' + Math.random().toString(36).slice(2, 8)), dragList = el => this.dragList(el);`;
// A deck's folder menu: into a folder, out of one, or into a new one.
const moveMenu = pos => `<sc-if value="{{d.moveOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Move {{d.name}}" style="position: absolute; ${pos} z-index: 25; width: 240px; ${popBox} text-shadow: none;"><span style="padding: 8px 12px 4px; font-size: 12px; font-weight: 600; color: {{t.muted}};">Move to</span><sc-for list="{{d.moveTo}}" as="o" hint-placeholder-count="3"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="height: 38px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; text-align: left; cursor: pointer;"><span style="display: flex; color: {{t.muted}};">${svg(I.folder, 16, 1.8)}</span><span style="flex-grow: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{o.label}}</span><sc-if value="{{o.on}}" hint-placeholder-val="{{ false }}"><span style="display: flex;">${svg(I.check, 14, 2.4)}</span></sc-if></button></sc-for><button type="button" onClick="{{d.newFolder}}" style="height: 38px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer;">${svg(I.plus, 13, 2.4)}New folder</button></div></sc-if>`;
const moveBtn = (bg, size = 32) => `<button type="button" onClick="{{d.toggleMove}}" aria-label="Move {{d.name}} to a folder" aria-expanded="{{d.moveExpanded}}" style="width: ${size}px; height: ${size}px; flex-shrink: 0; border: 0; border-radius: ${size / 2}px; ${bg} display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">${svg(I.more, 16, 2)}</button>`;
// All cards: how hard each one is, as a colored dot and word.
const levelTag = `<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: {{r.levelFg}};"><span style="width: 8px; height: 8px; border-radius: 4px; background: {{r.levelFg}};"></span>{{r.level}}</span>`;
const levelSeg = (h, fs = 13, tight = false) => `<div role="group" aria-label="Difficulty" style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {{t.surf}}; max-width: 100%; overflow-x: auto; scrollbar-width: none;"><sc-for list="{{levels}}" as="l" hint-placeholder-count="5"><button type="button" onClick="{{l.pick}}" aria-pressed="{{l.pressed}}" style="height: ${h}px; ${tight ? 'flex: 1 1 auto; padding: 0 6px; justify-content: center; gap: 4px;' : 'flex-shrink: 0; padding: 0 12px; gap: 7px;'} display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{l.bg}}; color: {{l.fg}}; box-shadow: {{l.sh}}; font: inherit; font-size: ${fs}px; font-weight: 600; white-space: nowrap; cursor: pointer;"><span style="width: {{l.dotW}}; height: 8px; border-radius: 4px; background: {{l.dot}};"></span>{{l.label}}<span style="font-family: ${MONO}; font-size: 11px; opacity: .6;">{{l.count}}</span></button></sc-for></div>`;
// Picked tags, each with an x; and the menus to add a tag or pick a deck.
const pickedTags = h => `<sc-for list="{{pickedTags}}" as="g" hint-placeholder-count="1"><button type="button" onClick="{{g.remove}}" aria-label="Stop filtering by {{g.label}}" style="height: ${h}px; flex-shrink: 0; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;">{{g.label}}<span style="display: flex; opacity: .7;">${svg(I.close, 10, 2.4)}</span></button></sc-for>`;
const menuBtn = (m, label, h) => `<button type="button" onClick="{{${m}.toggle}}" aria-expanded="{{${m}.expanded}}" style="height: ${h}px; flex-shrink: 0; padding: 0 12px 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;">${label}${svg(I.chevDown, 14, 2)}</button>`;
const webDecks = webRoot(`${sidebar('Library')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 22px; min-width: 0; overflow-y: auto;">
  <sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}"><a href="{{libraryHref}}" data-sc-drop="folder:" data-sc-look="chip" draggable="false" style="align-self: flex-start; margin: -6px 0 -18px -10px; height: 32px; padding: 0 14px 0 8px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; font-size: 14px; color: {{t.muted}};">${svg(I.back, 16, 2)}Library</a></sc-if>
  <div style="display: flex; align-items: center; gap: 12px;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{title}}</h1>
    <sc-if value="{{atTop}}" hint-placeholder-val="{{ true }}"><span style="margin-left: 10px; display: flex;">${libModes(32)}</span></sc-if>
    <span style="flex-grow: 1;"></span>
    <label style="display: flex; align-items: center; gap: 10px; width: 280px; height: 36px; padding: 0 16px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};">${svg(I.search, 16)}<span style="position: absolute; left: -9999px;">{{searchHint}}</span><input value="{{query}}" onChange="{{setQuery}}" placeholder="{{searchHint}}" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: {{t.text}};"></label>
    <sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}">${pill('Rename', { onClick: '{{renameFolder}}' })}${pill('Remove folder', { onClick: '{{removeFolder}}' })}</sc-if>
    <sc-if value="{{deckView}}" hint-placeholder-val="{{ true }}"><sc-if value="{{atTop}}" hint-placeholder-val="{{ true }}">${pill('New folder', { icon: 'folder', onClick: '{{newFolder}}' })}</sc-if></sc-if>
    ${pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' })}
  </div>
  <sc-if value="{{deckView}}" hint-placeholder-val="{{ true }}">
    <div style="display: flex; align-items: center; gap: 16px;">
      <div role="group" aria-label="Filter by tag" style="flex-grow: 1; display: flex; flex-wrap: wrap; gap: 8px;">
        <sc-for list="{{tagFilters}}" as="g" hint-placeholder-count="6"><button type="button" onClick="{{g.pick}}" aria-pressed="{{g.pressed}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;"><span style="width: {{g.dotW}}; height: 8px; margin-right: {{g.dotM}}; border-radius: 4px; background: {{g.dot}};"></span>{{g.label}}<span style="margin-left: 8px; font-family: ${MONO}; font-size: 11px; opacity: .6;">{{g.count}}</span></button></sc-for>
        <sc-if value="{{moreMenu.show}}" hint-placeholder-val="{{ true }}"><div style="position: relative;"><button type="button" onClick="{{moreMenu.toggle}}" aria-expanded="{{moreMenu.expanded}}" style="height: 36px; padding: 0 12px 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;">More${svg(I.chevDown, 14, 2)}</button>${tagMenu('moreMenu', 'left: 0; top: 44px;')}</div></sc-if>
      </div>
      <div role="group" aria-label="View" style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {{t.surf}};">${viewBtn('vCards', 'showCards', 'Card view', 'grid')}${viewBtn('vList', 'showList', 'List view', 'list')}</div>
    </div>
    <sc-if value="{{showFolders}}" hint-placeholder-val="{{ true }}">
      <div style="display: flex; flex-direction: column; gap: 12px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Folders</span><div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;"><sc-for list="{{folders}}" as="f" hint-placeholder-count="2">${folderTile(150, 76)}</sc-for></div></div>
      <span style="margin-bottom: -10px; font-size: 13px; font-weight: 600; color: {{t.muted}};">Decks</span>
    </sc-if>
    <sc-if value="{{cardView}}" hint-placeholder-val="{{ true }}">
      <div data-sc-list="decks" ref="{{dragList}}" onPointerDown="{{grabDeck}}" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
        <sc-for list="{{decks}}" as="d" hint-placeholder-count="6"><div data-sc-item="{{d.id}}" class="sc-drag" style="position: relative;">
          ${meshCard('d', 'border-radius: 20px; height: 240px;', 'height: 100%; box-sizing: border-box; padding: 22px; display: flex; flex-direction: column; justify-content: space-between;', `
            <sc-if value="{{d.hasPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{d.photo}}" alt="" draggable="false" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"><span style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.55) 100%);"></span></sc-if>
            <a href="{{d.href}}" aria-label="{{d.name}}" draggable="false" class="sc-hit" style="position: absolute; inset: 0; border-radius: 20px;"></a>
            <div style="position: relative; display: flex; flex-wrap: wrap; gap: 6px; padding-right: 40px; pointer-events: none;">${glassTag('t1')}${glassTag('t2')}${glassTag('t3')}${moreTag('background: {{d.glass}}; box-shadow: inset 0 0 0 1px {{d.glassLine}}; color: inherit;', 26)}</div>
            <div style="position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; pointer-events: none;">
              <span style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
                <span style="font-size: 44px; font-weight: 500; letter-spacing: -.035em; line-height: 1;">{{d.due}}<span style="font-size: 15px; letter-spacing: 0; margin-left: 6px; opacity: .85;">due</span></span>
                <span style="font-size: 19px; font-weight: 600; letter-spacing: -.015em; padding-top: 8px;">{{d.name}}</span>
                <span style="font-size: 13px; opacity: .85;">{{d.line}}</span>
              </span>
              <a href="{{d.studyHref}}" draggable="false" class="sc-press" style="flex-shrink: 0; height: 36px; padding: 0 18px; display: inline-flex; align-items: center; border-radius: 999px; background: #FFFFFF; color: #000000; font-size: 13px; font-weight: 600; text-shadow: none; pointer-events: auto;">Flashcards</a>
            </div>`, 'div', ' class="sc-lift"')}
          <span style="position: absolute; top: 16px; right: 16px; z-index: 2; color: {{d.ink}};">${moveBtn('background: {{d.glass}}; box-shadow: inset 0 0 0 1px {{d.glassLine}}; color: inherit;')}</span>
          ${moveMenu('right: 12px; top: 56px;')}
          ${deckTagsPop('left: 12px; top: 58px;')}
        </div></sc-for>
      </div>
    </sc-if>
    <sc-if value="{{listView}}" hint-placeholder-val="{{ false }}">
      <div style="display: flex; flex-direction: column;">
        <div style="${LIST_COLS} height: 36px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: {{t.muted}}; border-bottom: 1px solid {{t.line}};"><span></span><span>Deck</span><span>Tags</span><span style="text-align: right;">Due</span><span style="text-align: right;">Cards</span><span style="text-align: right;">Remembered</span><span></span></div>
        <div data-sc-list="decks" ref="{{dragList}}" onPointerDown="{{grabDeck}}" style="display: flex; flex-direction: column;"><sc-for list="{{decks}}" as="d" hint-placeholder-count="6">
          <div data-sc-item="{{d.id}}" class="sc-row sc-drag" style="${LIST_COLS} position: relative; height: 64px; border-bottom: 1px solid {{t.line}}; font-size: 14px;">
            <a href="{{d.href}}" aria-label="{{d.name}}" draggable="false" class="sc-hit" style="position: absolute; inset: 0;"></a>
            <span style="width: 36px; height: 36px; border-radius: 12px; background: {{d.base}}; overflow: hidden;"><sc-if value="{{d.hasPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{d.photo}}" alt="" draggable="false" style="width: 100%; height: 100%; object-fit: cover;"></sc-if></span>
            <span style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</span>
            <span style="position: relative; min-width: 0; pointer-events: none;"><span style="display: flex; gap: 6px; min-width: 0; overflow: hidden;">${tagSlot('t1')}${tagSlot('t2')}${tagSlot('t3')}${moreTag('background: {{t.surf}}; color: {{t.muted}};', 24)}</span>${deckTagsPop('left: -12px; top: 34px;')}</span>
            <span style="text-align: right; font-family: ${MONO}; font-size: 15px; color: {{d.dueColor}};">{{d.due}}</span>
            <span style="text-align: right; font-family: ${MONO}; font-size: 14px; color: {{t.muted}};">{{d.total}}</span>
            <span style="text-align: right; font-family: ${MONO}; font-size: 14px; font-weight: 600; color: {{d.retColor}};">{{d.ret}}</span>
            <span style="position: relative; display: flex; align-items: center; justify-content: flex-end; gap: 8px; pointer-events: none;"><sc-if value="{{d.canStudy}}" hint-placeholder-val="{{ true }}"><span style="display: flex; pointer-events: auto;">${pill('Flashcards', { href: '{{d.studyHref}}', h: 36 })}</span></sc-if><sc-if value="{{d.noStudy}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">Up to date</span></sc-if>${moveBtn('background: {{t.surf}}; color: {{t.text}};', 36)}</span>
            ${moveMenu('right: 0; top: 56px;')}
          </div>
        </sc-for></div>
      </div>
    </sc-if>
    <sc-if value="{{noDecks}}" hint-placeholder-val="{{ false }}"><div style="padding: 48px 24px; border-radius: 20px; background: {{t.surf}}; text-align: center; font-size: 15px; color: {{t.muted}};">{{noDecksLine}}</div></sc-if>
  </sc-if>
  <sc-if value="{{cardsView}}" hint-placeholder-val="{{ false }}">
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      ${levelSeg(32)}
      <div style="position: relative;">${menuBtn('tagPick', 'Tags', 40)}${tagMenu('tagPick', 'left: 0; top: 48px;')}</div>
      ${pickedTags(32)}
      <div style="position: relative;">${menuBtn('deckPick', '{{deckPick.label}}', 40)}${tagMenu('deckPick', 'left: 0; top: 48px;', { label: 'Filter by deck', find: 'Find a deck or folder', none: 'No decks match' })}</div>
      <span style="flex-grow: 1;"></span>
      <span style="font-size: 13px; color: {{t.muted}};">{{cardCount}}</span>
    </div>
    <div style="display: flex; flex-direction: column;">
      <div style="${CARD_COLS} height: 36px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: {{t.muted}}; border-bottom: 1px solid {{t.line}};"><span></span><span>Card</span><span>Answer</span><span>Deck</span><span>Tags</span><span>Difficulty</span><span style="text-align: right;">Next</span></div>
      <div data-sc-list="cards" ref="{{dragList}}" onPointerDown="{{grabCard}}" style="display: flex; flex-direction: column;"><sc-for list="{{rows}}" as="r" hint-placeholder-count="8">
        <a href="{{r.href}}" data-sc-item="{{r.id}}" data-sc-from="{{r.deckId}}" draggable="false" class="sc-drag" style="${CARD_COLS} height: 60px; border-bottom: 1px solid {{t.line}}; font-size: 14px;">
          <span style="width: 32px; height: 32px; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 13px;">{{r.glyph}}</span>
          <span style="min-width: 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.front}}</span>
          <span style="min-width: 0; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.back}}</span>
          <span style="min-width: 0; display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; flex-shrink: 0; border-radius: 5px; background: {{r.swatch}};"></span><span style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.deckName}}</span></span>
          <span style="display: flex; gap: 6px; min-width: 0; overflow: hidden;">${cardTag('c1')}${cardTag('c2')}${cardMore}</span>
          ${levelTag}
          <span style="font-size: 13px; text-align: right;">{{r.next}}</span>
        </a>
      </sc-for></div>
    </div>
    <sc-if value="{{hasMore}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{showMore}}" style="align-self: center; height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{moreLabel}}</button></sc-if>
    <sc-if value="{{noCards}}" hint-placeholder-val="{{ false }}"><div style="padding: 48px 24px; border-radius: 20px; background: {{t.surf}}; text-align: center; font-size: 15px; color: {{t.muted}};">No cards match. Try fewer filters.</div></sc-if>
  </sc-if>
</main>
${folderPopup(false)}
${moveTray('tray', false)}`, true);
// The Library's logic, for the web and iPhone boards.
const libraryLogic = phone => `
constructor(props) { super(props); this.state = { tag: 'All', view: props.view === 'List' ? 'list' : 'cards', openDeck: props.openTags ? 'cell' : null, moreOpen: !!props.moreTags, moreQ: '', q: '',
  level: 'all', cardTags: [], deck: '', tagPickOpen: false, tagPickQ: '', deckPickOpen: false, deckPickQ: '', shown: 60, naming: props.naming ? 'new' : null, name: props.naming ? 'Biology' : '', namingAt: 0,
  moveDeck: props.moveOpen ? 'cell' : null, moveAfter: null }; }
renderVals() {
  ${T}${DB_JS}
  ${TAG_JS}
  ${CARD_TAGS_JS}
  ${LIFT_JS}${phone ? `
  ${KB_JS}` : ''}
  const p = this.props, s = this.state, tag = s.tag, view = s.view, act = db.act;
  const board = n => '${phone ? 'Phone' : 'Web'}' + n + '.dc.html';
  const folders = db.folders(), folder = p.folder ? folders.find(f => f.id === p.folder) || null : null;
  const cards = p.mode === 'cards' && !folder, atTop = !folder;
  const all = db.decks(), q = (s.q || '').trim().toLowerCase();
  const seg = on => ({ pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const grad = d => this.gen(d.seed + (d.round ? ' #' + d.round : ''), d.style);
  // Naming a folder in the popup: a new one (maybe for a deck that asked to move into it), or renaming this one.
  const naming = s.naming, typed = (s.name || '').trim(), mover = s.moveAfter ? all.find(d => d.id === s.moveAfter) : null;
  const closeNaming = () => this.setState({ naming: null, name: '', moveAfter: null });
  const openNaming = (kind, moveAfter) => this.setState({ naming: kind, name: kind === 'rename' && folder ? folder.name : '', moveAfter: moveAfter || null, moveDeck: null, namingAt: Date.now() });
  const saveName = () => {
    if (!typed) return;
    closeNaming();
    if (naming === 'rename' && folder) act.renameFolder(folder.id, typed); else act.newFolder(typed, s.moveAfter);
  };
  // Dragging (drag.mjs): a deck to another spot, onto a folder, or (in a folder) onto the Library link to take it out;
  // in All cards, a card onto another deck. Menus close when something lifts.
  const quiet = () => (s.moveDeck || s.openDeck || s.moreOpen || s.tagPickOpen || s.deckPickOpen) && this.setState({ moveDeck: null, openDeck: null, moreOpen: false, tagPickOpen: false, deckPickOpen: false });
  // Decks: in a folder, its decks. At the top, folders and the decks in none, unless a tag or search looks everywhere.
  const hits = q && !cards ? db.searchDecks(q) : null, looking = tag !== 'All' || !!hits;
  const scope = folder ? all.filter(d => d.folder === folder.id) : looking || !folders.length ? all : all.filter(d => !d.folder);
  const uses = {}; (folder ? scope : all).forEach(d => d.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
  const byUse = Object.keys(uses).sort((a, b) => uses[b] - uses[a]);
  const top = byUse.slice(0, ${phone ? 3 : 5}), shownTags = tag === 'All' || top.includes(tag) ? top : [...top, tag];
  const pickTag = g => this.setState({ tag: g, openDeck: null, moreOpen: false, moreQ: '' });
  const mq = (s.moreQ || '').trim().toLowerCase(), found = byUse.filter(g => !mq || g.toLowerCase().includes(mq));
  const decks = scope.filter(d => (tag === 'All' || d.tags.includes(tag)) && (!hits || hits.includes(d.id))).map(d => {
    const tg = d.tags, fit = tagFit(tg, 3), open = s.openDeck === d.id, moving = s.moveDeck === d.id, photo = d.image && d.image !== 'mock' ? d.image : '';
    const slot = i => (fit.vis[i] ? { show: true, ...tagChip(fit.vis[i]), pick: () => pickTag(fit.vis[i]) } : { show: false, label: '', bg: 'transparent', fg: t.text, pick: () => {} });
    const move = f => () => { act.moveDeck(d.id, f); this.setState({ moveDeck: null }); };
    // A photo cover takes white words on a dark wash, whatever the gradient would have used.
    const onPhoto = photo ? { ink: '#FFFFFF', glass: 'rgba(0,0,0,.28)', glassLine: 'rgba(255,255,255,.35)', shadow: '0 1px 12px rgba(0,0,0,.35)' } : {};
    return { ...d, ...grad(d), ...onPhoto, t1: slot(0), t2: slot(1), t3: slot(2), hasPhoto: !!photo, photo,
      href: db.mock ? board('Deck') : d.href, studyHref: db.mock ? board('Review') : d.studyHref,
      more: { show: fit.more > 0, label: '+' + fit.more }, tagCount: tg.length + (tg.length === 1 ? ' tag' : ' tags'), tagsOpen: open, expanded: open ? 'true' : 'false',
      toggleTags: () => this.setState({ openDeck: open ? null : d.id, moreOpen: false, moveDeck: null }),
      allTags: tg.map(g => ({ ...tagChip(g), pick: () => pickTag(g) })),
      moveOpen: moving, moveExpanded: moving ? 'true' : 'false', toggleMove: () => this.setState({ moveDeck: moving ? null : d.id, openDeck: null }),
      moveTo: [{ id: null, name: 'No folder' }, ...folders].map(f => ({ label: f.name, on: (d.folder || null) === f.id, pressed: (d.folder || null) === f.id ? 'true' : 'false', pick: move(f.id) })),
      newFolder: () => openNaming('new', d.id),
      total: d.totalLabel, ret: d.ret == null ? '—' : d.ret + '%', line: d.totalLabel + ' cards · ' + d.fresh + ' new' + (d.ret == null ? '' : ' · ' + d.ret + '%'),
      canStudy: d.due > 0 || d.fresh > 0, noStudy: !d.due && !d.fresh, dueColor: d.due ? t.text : t.muted, dueLabel: d.due ? String(d.due) : '—',
      retColor: d.ret == null ? t.muted : d.ret >= 90 ? t.good : d.ret >= 85 ? t.hard : t.again };
  });
  // Folders, each with its first decks' colors fanned out.
  const fanned = [['0px', '8px', '-8deg'], ['22px', '4px', '0deg'], ['44px', '0px', '8deg']];
  const folderRows = folders.map(f => ({ ...f, href: db.mock ? board('LibraryFolder') : f.href, empty: !f.decks.length,
    line: f.n + (f.n === 1 ? ' deck' : ' decks') + (f.due ? ' · ' + f.due + ' due' : ''),
    swatches: f.decks.slice(0, 3).map((d, i) => ({ base: grad(d).base, x: fanned[i][0], y: fanned[i][1], r: fanned[i][2] })) }));
  // All cards, filtered by how hard, by tags (every picked one), by deck or folder, and by the search.
  const LV = { new: ['New', t.easy], easy: ['Easy', t.good], medium: ['Medium', t.hard], hard: ['Hard', t.again] };
  const every = cards ? db.allCards() : [];
  const picked = s.cardTags || [], pick = s.deck || '';
  const inPick = c => !pick || (pick.startsWith('f:') ? c.folder === pick.slice(2) : c.deckId === pick);
  const base = every.filter(c => inPick(c) && picked.every(g => c.tags.includes(g)) && (!q || [c.front, c.back, c.deckName, ...c.tags].join(' ').toLowerCase().includes(q)));
  const count = k => base.filter(c => k === 'all' || c.level === k).length;
  const matched = base.filter(c => s.level === 'all' || c.level === s.level);
  const glyphs = { text: 'Aa', blank: '_', image: '▢', audio: '♪' };
  const rows = matched.slice(0, s.shown).map(c => ({ ...c, glyph: glyphs[c.icon], level: LV[c.level][0], levelFg: LV[c.level][1], swatch: grad(c).base,
    href: db.mock ? board('Editor') : c.href, ...cardFit(c.tags) }));
  const cardUses = {}; every.forEach(c => c.tags.forEach(g => { cardUses[g] = (cardUses[g] || 0) + 1; }));
  const tq = (s.tagPickQ || '').trim().toLowerCase(), cardTagNames = Object.keys(cardUses).sort((a, b) => cardUses[b] - cardUses[a] || a.localeCompare(b)).filter(g => !tq || g.toLowerCase().includes(tq));
  const dq = (s.deckPickQ || '').trim().toLowerCase();
  const allOptions = [{ id: '', label: 'All decks', dot: t.muted }, ...folders.map(f => ({ id: 'f:' + f.id, label: f.name, dot: t.text })), ...all.map(d => ({ id: d.id, label: d.name, dot: grad(d).base }))];
  const deckOptions = allOptions.filter(o => !dq || o.label.toLowerCase().includes(dq)), pickedName = (allOptions.find(o => o.id === pick) || allOptions[0]).label;
  const title = folder ? folder.name : 'Library';
  return {
    t, ...chrome, grain: String(this.props.grain ?? 0.7), decks, title, atTop, inFolder: !!folder, libraryHref: db.mock ? board('Decks') : '/library',
    query: s.q || '', setQuery: e => this.setState({ q: e && e.target ? e.target.value : '', shown: 60 }), searchHint: cards ? 'Search all cards' : folder ? 'Search this folder' : 'Search decks and cards',
    modes: [['Decks', !cards, db.mock ? board('Decks') : '/library'], ['All cards', cards, db.mock ? board('LibraryCards') : '/library/cards']]
      .map(([label, on, href]) => ({ label, href, current: on ? 'page' : 'false', ...seg(on) })),
    deckView: !cards, cardsView: cards,
    folders: folderRows, showFolders: atTop && !cards && !looking && folders.length > 0,
    noDecks: !cards && decks.length === 0, noDecksLine: folder ? 'No decks in this folder yet. Drag a deck onto the folder, or use its ⋯ button.' : 'No decks match.',
    newFolder: () => openNaming('new'), renameFolder: () => openNaming('rename'),
    removeFolder: () => folder && act.deleteFolder(folder.id),
    naming: { show: !!naming, title: naming === 'rename' ? 'Rename folder' : 'New folder', action: naming === 'rename' ? 'Save' : 'Create', value: s.name || '',
      hasHint: naming !== 'rename', hint: mover ? '“' + mover.name + '” goes in it.' : 'Then drag decks onto it.',
      off: typed ? 'false' : 'true', bg: typed ? t.inv : t.surf2, fg: typed ? t.invText : t.muted,
      set: e => this.setState({ name: e && e.target ? e.target.value : '' }), save: saveName, cancel: closeNaming,
      key: e => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') { e.preventDefault(); closeNaming(); } },
      // The field is ready to type in when the popup opens (in the app; the canvas draws it focused).
      ref: el => { if (!el || db.mock || this.namedAt === s.namingAt) return; this.namedAt = s.namingAt; el.focus(); if (naming === 'rename') el.select(); } },
    drawKb: !!db.mock,${phone ? ' kb,' : ''}
    dragKey, dragList, trayShow: 'none', tray: all.map(d => ({ id: d.id, name: d.name, base: grad(d).base, bg: t.surf, fg: t.text })),
    grabDeck: e => this.drag(e, { drops: ['folder:'], ink: t.text, bg: t.bg, lifted: view === 'cards' && !${phone} ? liftTile : liftRow, bottom: ${phone ? 92 : 0}, start: quiet,
      drop: (id, w) => (w.to ? act.moveDeck(id, w.to.slice(7) || null) : act.reorderDeck(id, w.before)) }),
    grabCard: e => this.drag(e, { drops: ['deck:'], reorder: false, keep: true, tray: all.length > 1, ink: t.text, bg: t.bg, lifted: liftRow, bottom: ${phone ? 92 : 0}, start: quiet,
      drop: (id, w) => w.to && act.moveCard(id, w.to.slice(5)) }),
    tagFilters: ['All', ...shownTags].map(n => { const on = n === tag, isAll = n === 'All'; return { label: isAll ? (folder ? 'All' : 'All decks') : n, dot: isAll ? 'transparent' : tagCol(n), dotW: isAll ? '0px' : '8px', dotM: isAll ? '0px' : '8px',
      count: String(isAll ? (folder ? scope.length : all.length) : uses[n] || 0), pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => pickTag(n) }; }),
    moreMenu: { show: byUse.length > top.length, open: !!s.moreOpen, expanded: s.moreOpen ? 'true' : 'false', query: s.moreQ || '',
      toggle: () => this.setState({ moreOpen: !s.moreOpen, moreQ: '', openDeck: null }), setQuery: e => this.setState({ moreQ: e && e.target ? e.target.value : '' }),
      rows: found.map(g => ({ ...tagChip(g), count: String(uses[g]), on: g === tag, pressed: g === tag ? 'true' : 'false', pick: () => pickTag(g === tag ? 'All' : g) })), none: found.length === 0 },
    cardView: view === 'cards', listView: view === 'list',
    vCards: seg(view === 'cards'), vList: seg(view === 'list'),
    showCards: () => this.setState({ view: 'cards' }), showList: () => this.setState({ view: 'list' }),
    levels: ['all', 'new', 'easy', 'medium', 'hard'].map(k => { const on = s.level === k; return { label: k === 'all' ? 'All' : LV[k][0], count: String(count(k)), dot: k === 'all' ? 'transparent' : LV[k][1], dotW: k === 'all' ? '0px' : '8px',
      pick: () => this.setState({ level: k, shown: 60 }), ...seg(on) }; }),
    tagPick: { open: !!s.tagPickOpen, expanded: s.tagPickOpen ? 'true' : 'false', query: s.tagPickQ || '', toggle: () => this.setState({ tagPickOpen: !s.tagPickOpen, tagPickQ: '', deckPickOpen: false }),
      setQuery: e => this.setState({ tagPickQ: e && e.target ? e.target.value : '' }), none: cardTagNames.length === 0,
      rows: cardTagNames.map(g => ({ ...tagChip(g), count: String(cardUses[g]), on: picked.includes(g), pressed: picked.includes(g) ? 'true' : 'false',
        pick: () => this.setState({ cardTags: picked.includes(g) ? picked.filter(x => x !== g) : [...picked, g], shown: 60 }) })) },
    pickedTags: picked.map(g => ({ ...tagChip(g), remove: () => this.setState({ cardTags: picked.filter(x => x !== g), shown: 60 }) })),
    deckPick: { label: pickedName, open: !!s.deckPickOpen, expanded: s.deckPickOpen ? 'true' : 'false', query: s.deckPickQ || '', toggle: () => this.setState({ deckPickOpen: !s.deckPickOpen, deckPickQ: '', tagPickOpen: false }),
      setQuery: e => this.setState({ deckPickQ: e && e.target ? e.target.value : '' }), none: deckOptions.length === 0,
      rows: deckOptions.map(o => ({ label: o.label, dot: o.dot, count: '', on: o.id === pick, pressed: o.id === pick ? 'true' : 'false', pick: () => this.setState({ deck: o.id, deckPickOpen: false, shown: 60 }) })) },
    rows, cardCount: matched.length.toLocaleString('en-US') + (matched.length === 1 ? ' card' : ' cards'), noCards: cards && matched.length === 0,
    hasMore: matched.length > s.shown, moreLabel: 'Show ' + Math.min(${phone ? 40 : 60}, matched.length - s.shown) + ' more', showMore: () => this.setState({ shown: s.shown + ${phone ? 40 : 60} })
  };
}`;
const decksLogic = libraryLogic(false);
// Which Library page a board shows (the app sets these from the address).
const LIB_MODE = { editor: 'enum', default: 'decks', options: ['decks', 'cards'] }, LIB_FOLDER = { editor: 'string', default: '' };


// Deck page
const CARD_ROWS = `[
  { front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺)', kind: 'Basic', icon: 'text', next: 'Tomorrow', ai: '', tags: ['Energy', 'Exam 1', 'Mitochondria', 'Must know'] },
  { front: 'The ____ is the powerhouse of the cell.', back: 'mitochondrion', kind: 'Fill in the blank', icon: 'blank', next: 'Due now', ai: 'Claude', tags: ['Organelles', 'Exam 1'] },
  { front: 'Name structure 1 on the diagram.', back: 'Nucleus', kind: 'Image', icon: 'image', next: 'In 3 days', ai: 'Claude', tags: ['Organelles', 'Diagrams'] },
  { front: 'Which organelle packages proteins for secretion?', back: 'Golgi apparatus', kind: 'Basic', icon: 'text', next: 'In 6 days', ai: '', tags: ['Organelles'] },
  { front: 'Say it: ribosome', back: 'RY-buh-sohm', kind: 'Audio', icon: 'audio', next: 'Due now', ai: 'ChatGPT', tags: ['Pronunciation'] },
  { front: 'What is the role of the ribosome?', back: 'Translates mRNA into protein', kind: 'Basic', icon: 'text', next: 'In 12 days', ai: '', tags: ['Proteins', 'Exam 2'] }
]`;
// Deck header: the deck's gradient by default; an uploaded image replaces it (placeholder here).
const onCover = 'background: rgba(255,255,255,.62); color: #000000; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);';
const coverBtn = (label, handler, icon = '') => `<button type="button" onClick="{{${handler}}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; ${onCover} font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon ? svg(I[icon], 14, 2) : ''}${label}</button>`;
const coverRound = (ic, label, href = '', onClick = '') => href
  ? `<a href="${href}" aria-label="${label}" style="width: 44px; height: 44px; border-radius: 22px; ${onCover} display: flex; align-items: center; justify-content: center;">${svg(I[ic], 18, 2)}</a>`
  : `<button type="button" aria-label="${label}"${onClick ? ` onClick="${onClick}"` : ''} style="width: 44px; height: 44px; border: 0; border-radius: 22px; ${onCover} display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[ic], 18, 2)}</button>`;
// ---------- Study backgrounds ----------
// The owner (V96): "make the background be the decks gradient by default, but make it monochrome, slight color only
// faint, for darkmode, make the gradient monochrome too but black", and let people change it "for learn, flashcards,
// and live". Behind those screens: the deck's own gradient, nearly gray with a faint hint of its colors (near-black at
// night); or, picked in the deck's settings, a plain page, the sky, the sunset (the owner's faint sunset idea, V95),
// or a photo they upload, softened so the words stay easy to read.
const SUNSET_BG = 'radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.22), rgba(238,142,98,0) 70%), linear-gradient(180deg, #C3D3E3 0%, #D3DBE6 30%, #E6DDE4 52%, #F2DCD8 72%, #F5CFC2 100%)';
const SUNSET_NIGHT = 'radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.16), rgba(238,142,98,0) 70%), linear-gradient(180deg, #0C1426 0%, #151B31 35%, #231C2E 65%, #2E1D25 100%)';
const SKY_TILE = 'linear-gradient(180deg, #86BDF3 0%, #C9E2FB 45%, #EDF5FE 100%)';
// Gray dark mode lifts these off black: the deck's colors under a gray wash (not a black one), a dusk sky that fades
// into the gray page, and a dusk sunset.
const SKY_DUSK = { top: '#1B2A48', mid: '#1F2B45', low: '#212637' };
const SUNSET_DUSK = 'radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.18), rgba(238,142,98,0) 70%), linear-gradient(180deg, #1F2638 0%, #272C40 35%, #332C3F 65%, #3E2E37 100%)';
const STUDY_BG_JS = `const studyBg = (dk, dark, dim) => {
    const b = (dk && dk.bg) || {}, img = b.image || (dk && dk.image) || '';
    const kind = ['deck', 'plain', 'sky', 'sunset', 'photo'].includes(b.kind) && !(b.kind === 'photo' && !img) ? b.kind : 'deck';
    const mesh = this.gen(((dk && dk.seed) || 'Lucida') + (dk && dk.round ? ' #' + dk.round : ''), (dk && dk.style) || 'mix');
    // On the canvas a photo is a placeholder, so it shows the deck's colors at full strength instead.
    const photo = kind === 'photo' && img !== 'mock' ? img : '', sample = kind === 'photo' && !photo, faint = kind === 'deck', gray = dark && dim;
    return { isDeck: faint || sample, isPhoto: !!photo, isSky: kind === 'sky', isSunset: kind === 'sunset', mesh, photo,
      filter: sample ? 'none' : gray ? 'saturate(.16) brightness(.34)' : dark ? 'saturate(.16) brightness(.42)' : 'saturate(.16) brightness(1.15)',
      veil: faint ? (gray ? 'rgba(30,30,32,.45)' : dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.6)') : photo || sample ? (gray ? 'rgba(30,30,32,.55)' : dark ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.38)') : 'rgba(0,0,0,0)',
      skyTop: gray ? '${SKY_DUSK.top}' : dark ? '#081733' : '#86BDF3', skyMid: gray ? '${SKY_DUSK.mid}' : dark ? '#0D2148' : '#C9E2FB', skyLow: gray ? '${SKY_DUSK.low}' : dark ? '#0A1530' : '#EDF5FE',
      sunset: gray ? ${JSON.stringify(SUNSET_DUSK)} : dark ? ${JSON.stringify(SUNSET_NIGHT)} : ${JSON.stringify(SUNSET_BG)}, grain: faint || sample || kind === 'sunset' ? '.55' : '0' };
  };`;
// The layer itself, behind everything on the page (its parent needs isolation: isolate).
const studyBgLayer = `<div aria-hidden="true" style="position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background: {{t.bg}};">
  <sc-if value="{{bg.isDeck}}" hint-placeholder-val="{{ true }}"><div style="position: absolute; inset: -4%; background: {{bg.mesh.base}}; filter: {{bg.filter}};">${flowLayer('bg.mesh')}</div></sc-if>
  <sc-if value="{{bg.isPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{bg.photo}}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></sc-if>
  <sc-if value="{{bg.isSky}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; left: 0; right: 0; top: 0; height: 700px; background: linear-gradient(180deg, {{bg.skyTop}} 0%, {{bg.skyMid}} 30%, {{bg.skyLow}} 55%, {{t.bg}} 100%);"></div></sc-if>
  <sc-if value="{{bg.isSunset}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; background: {{bg.sunset}};"></div></sc-if>
  <div style="position: absolute; inset: 0; background: {{bg.veil}};"></div>
  ${grainSvg('{{bg.grain}}', { blend: 'overlay', freq: 0.85, slope: 3.4, id: 'sc-study-grain' })}
</div>`;
const coverFill = `<sc-if value="{{coverIsGradient}}" hint-placeholder-val="{{ true }}">${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}</sc-if>
    <sc-if value="{{coverIsImage}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; background: repeating-linear-gradient(135deg, {{t.surf}} 0 14px, {{t.surf2}} 14px 28px); display: flex; align-items: center; justify-content: center; gap: 8px; color: {{t.muted}}; font-size: 14px; font-weight: 500;">${svg(I.image, 18, 1.8)}[Your header image]</div></sc-if>
    <sc-if value="{{coverHasPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{coverPhoto}}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></sc-if>`;
// Parallax: as the page scrolls, the deck's cover drifts at half speed behind the header (once the header's top reaches
// the top, so no gap opens above it). Browsers without scroll-linked animations, and Reduce Motion, keep it still.
const parallax = (h, from = 0) => `<div class="sc-parallax" style="position: absolute; inset: 0; --px: ${h}px; --from: ${from}px; --to: ${from + 2 * h}px;">${coverFill}</div>`;
const PARALLAX_CSS = '@keyframes scParallax{to{transform:translateY(var(--px))}}@supports (animation-timeline: scroll()){.sc-parallax{animation:scParallax linear both;animation-timeline:--deck;animation-range:var(--from) var(--to)}}@media (prefers-reduced-motion:reduce){.sc-parallax{animation:none!important}}';
// Deck stat tiles are plain, so the header stays the only gradient on the page.
const deckTile = big => `<div style="border-radius: ${big ? 24 : 22}px; height: ${big ? 104 : 80}px; box-sizing: border-box; padding: ${big ? '18px 20px' : '12px 14px'}; background: {{t.surf}}; display: flex; flex-direction: column; justify-content: space-between;"><span style="font-size: ${big ? 13 : 12}px; font-weight: 500; color: {{t.muted}};">{{k.label}}</span><span style="font-size: ${big ? 34 : 26}px; font-weight: ${big ? 600 : 700}; letter-spacing: -.03em; line-height: 1; color: {{k.color}};">{{k.value}}</span></div>`;
const COVER_LOGIC = `
  const cs = this.state;
  ${TAG_JS}
  const dk = db.deck(this.props.deckId);
  const up = (patch, typing) => db.act.updateDeck(dk.id, patch, typing);
  ${NUM_JS}
  const tagList = dk.tags;
  const segOf = (id, cur) => ({ pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const style = dk.cover.style || 'mix';
  const cover = this.gen(dk.seed + (dk.cover.round ? ' #' + dk.cover.round : ''), style);
  // A header image replaces the gradient: your photo in the app, a placeholder on the canvas.
  const isImage = !!dk.cover.image, photo = isImage && dk.cover.image !== 'mock' ? dk.cover.image : '';
  const settingsOpen = cs.deckSettings == null ? !!this.props.settingsOpen : cs.deckSettings;
  const bgKind = (dk.bg && dk.bg.kind) || 'deck', bgImage = (dk.bg && dk.bg.image) || dk.cover.image || '', bgPhoto = bgImage && bgImage !== 'mock' ? bgImage : '';
  const perDay = dk.perDay, goal = dk.goal, grading = dk.grading, paused = dk.paused;
  // FSRS is set per deck. It schedules the four grades and check / x; piles only sort cards.
  ${SW_JS}
  const fsrsAllowed = grading !== 'piles', fsrsOn = fsrsAllowed && dk.fsrs !== false;
  const gaps = [[30, '1 mo'], [90, '3 mo'], [180, '6 mo'], [365, '1 yr'], [730, '2 yr'], [1825, '5 yr'], [3650, '10 yr']];
  const gi = dk.gapIdx, steps = dk.steps, stepPool = ['1m', '10m', '1h', '1d'];
  const dsTab = cs.dsTab || (this.props.settingsTab === 'Studying' ? 'study' : 'general');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const coverVals = {
    grain: String(this.props.grain ?? 0.7),
    cover, coverIsGradient: !isImage, coverIsImage: isImage && !photo, coverHasPhoto: !!photo, coverPhoto: photo,
    coverInk: photo ? '#FFFFFF' : isImage ? t.text : cover.ink, coverShadow: photo ? '0 1px 14px rgba(0,0,0,.45)' : isImage ? 'none' : cover.shadow,
    deckName: cs.deckName == null ? dk.name : cs.deckName,
    setDeckName: e => { const v = e && e.target ? e.target.value : cs.deckName; this.setState({ deckName: v }); up({ name: v }, true); },
    nextCover: () => up({ cover: { round: (dk.cover.round || 0) + 1, image: null } }),
    uploadCover: () => db.act.pickCover(dk.id),
    removeCover: () => up({ cover: { image: null } }),
    settingsOpen, openSettings: () => this.setState({ deckSettings: true }), closeSettings: () => this.setState({ deckSettings: false }),
    coverStyles: [['mix', 'Mix'], ['vivid', 'Vivid'], ['deep', 'Deep']].map(([id, label]) => ({ label, long: label, ...segOf(id, style), pick: () => up({ cover: { style: id, image: null } }) })),
    modes: [['four', 'Forgot · Hard · Good · Easy', '4 grades'], ['binary', 'Check or X', '✓ / ✗'], ['piles', 'Piles', 'Piles']].map(([id, long, short]) => ({ label: short, long, ...segOf(id, grading), pick: () => up({ grading: id }) })),
    perDay: String(perDay), goal: goal + '%', perDayIn: typed('perDay', perDay, n => up({ perDay: n }, true), 'New cards a day'),
    lessDay: () => up({ perDay: Math.max(0, perDay - 5) }), moreDay: () => up({ perDay: Math.min(999, perDay + 5) }),
    lessGoal: () => up({ goal: Math.max(70, goal - 1) }), moreGoal: () => up({ goal: Math.min(97, goal + 1) }),
    pause: { checked: paused ? 'true' : 'false', track: paused ? t.inv : t.surf2, knob: paused ? 'translateX(20px)' : 'translateX(0)', knobColor: paused ? t.invText : t.bg },
    togglePause: () => up({ paused: !paused }),
    fsrsOn, fsrsSw: sw(fsrsOn, fsrsAllowed), toggleFsrs: () => fsrsAllowed && up({ fsrs: !fsrsOn }),
    fsrsHint: !fsrsAllowed ? 'Piles only sort cards, so there’s nothing to schedule.' : fsrsOn ? 'Picks the best day to bring each card back.' : 'Off: cards don’t get a next review date.',
    gapLabel: gaps[gi][1], lessGap: () => up({ gapIdx: Math.max(0, gi - 1) }), moreGap: () => up({ gapIdx: Math.min(gaps.length - 1, gi + 1) }),
    stepChips: steps.map(x => ({ label: x, remove: () => steps.length > 1 && up({ steps: steps.filter(y => y !== x) }) })),
    canAddStep: steps.length < stepPool.length,
    addStep: () => { const nx = stepPool.find(q => !steps.includes(q)); if (nx) up({ steps: stepPool.filter(q => q === nx || steps.includes(q)) }); },
    dsGeneral: dsTab === 'general', dsStudy: dsTab === 'study',
    dsTabs: [['general', 'General'], ['study', 'Studying']].map(([id, label]) => ({ label, ...segOf(id, dsTab), pick: () => this.setState({ dsTab: id }) })),
    tiles: [{ label: 'Due now', value: String(dk.due), color: t.text }, { label: 'New', value: String(dk.fresh), color: t.text },
      { label: 'Remembered', value: dk.ret == null ? '—' : dk.ret + '%', color: dk.ret == null ? t.muted : dk.ret >= goal ? t.good : dk.ret >= goal - 5 ? t.hard : t.again }],
    deckTags: tagList.map(g => ({ ...tagChip(g), remove: () => up({ tags: tagList.filter(x => x !== g) }) })),
    deckPick: tagPicker(tagList, next => up({ tags: next }), 'dp', db.mock ? null : db.tags()),
    exportDeck: () => db.act.exportDeck(dk.id), deleteDeck: () => db.act.deleteDeck(dk.id),
    // The deck's folder, and its background for Learn mode, flashcards, and Live.
    folderChips: [{ id: null, name: 'No folder' }, ...db.folders()].map(f => { const on = (dk.folder || null) === f.id; return { label: f.name, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => db.act.moveDeck(dk.id, f.id) }; }),
    noFolders: !db.folders().length,
    bgOptions: [['deck', 'Colors'], ['plain', 'Plain'], ['sky', 'Sky'], ['sunset', 'Sunset'], ['photo', 'Photo']].map(([id, label]) => { const on = bgKind === id;
      return { label, pressed: on ? 'true' : 'false', ring: on ? '0 0 0 2px ' + t.text : 'inset 0 0 0 1px ' + t.line, isDeck: id === 'deck', isPlain: id === 'plain', isSky: id === 'sky', isSunset: id === 'sunset', isPhoto: id === 'photo',
        pick: () => (id === 'photo' && !bgImage ? db.act.pickBg(dk.id) : db.act.setBg(dk.id, id)) }; }),
    hasBgPhoto: !!bgPhoto, bgPhoto, bgIsPhoto: bgKind === 'photo', uploadBg: () => db.act.pickBg(dk.id),
    deckLine: plural(dk.total, 'card').replace(String(dk.total), dk.totalLabel) + (dk.aiCount ? ' · ' + dk.aiCount + ' added by your AI' : ''),
    deckLineShort: plural(dk.total, 'card').replace(String(dk.total), dk.totalLabel) + (dk.aiCount ? ' · ' + dk.aiCount + ' from your AI' : ''),
    // The owner: "learn button needs to be 'learn', flashcards need to have flashcards button". So this one always says
    // Flashcards ("Learn 10 new cards" read like Learn mode), with how many cards wait for it today.
    studyLabel: 'Flashcards', studyCount: String(dk.due || dk.fresh || 0), hasStudyCount: !!(dk.due || dk.fresh), noStudyCount: !(dk.due || dk.fresh),
    studyHref: dk.studyHref, newCardHref: dk.newCardHref
  };`;
// Deck settings: shared by the web side panel and the iPhone sheet.
const smallBtn = (label, handler, icon = '') => `<button type="button" onClick="{{${handler}}}" style="height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon ? svg(I[icon], 14, 2) : ''}${label}</button>`;
const deckSettingsBody = phone => `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: ${phone ? 18 : 20}px; font-weight: 600; letter-spacing: -.01em;">Deck settings</span>${phone
    ? `<button type="button" onClick="{{closeSettings}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Done</button>`
    : `<button type="button" onClick="{{closeSettings}}" aria-label="Close settings" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 14, 2.2)}</button>`}</div>
      <div role="tablist" aria-label="Deck settings sections" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{dsTabs}}" as="m" hint-placeholder-count="2"><button type="button" role="tab" onClick="{{m.pick}}" aria-selected="{{m.pressed}}" style="height: 36px; border: 0; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button></sc-for></div>
      <sc-if value="{{dsGeneral}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Header</span>
          <div style="position: relative; height: ${phone ? 88 : 108}px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">${coverFill}</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">${smallBtn('Shuffle', 'nextCover', 'shuffle')}${smallBtn('Upload image', 'uploadCover', 'image')}<sc-if value="{{coverIsImage}}" hint-placeholder-val="{{ false }}">${smallBtn('Use gradient', 'removeCover')}</sc-if></div>
          <div role="group" aria-label="Gradient style" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
            <sc-for list="{{coverStyles}}" as="m" hint-placeholder-count="3"><button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" style="height: 34px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button></sc-for>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Background</span><span style="margin-top: -4px; font-size: 12px; color: {{t.muted}};">Behind Learn mode, flashcards, and Live</span>
          <div role="radiogroup" aria-label="Background" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px;"><sc-for list="{{bgOptions}}" as="o" hint-placeholder-count="5"><button type="button" role="radio" aria-checked="{{o.pressed}}" onClick="{{o.pick}}" style="min-width: 0; padding: 0; border: 0; background: transparent; color: {{t.text}}; display: flex; flex-direction: column; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;"><span style="position: relative; height: ${phone ? 48 : 54}px; border-radius: 14px; overflow: hidden; box-shadow: {{o.ring}};">
            <sc-if value="{{o.isDeck}}" hint-placeholder-val="{{ true }}"><span style="position: absolute; inset: 0; background: {{cover.base}}; filter: saturate(.16) brightness(1.15);"></span><span style="position: absolute; inset: 0; background: rgba(255,255,255,.55);"></span></sc-if>
            <sc-if value="{{o.isPlain}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; inset: 0; background: {{t.bg}};"></span></sc-if>
            <sc-if value="{{o.isSky}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; inset: 0; background: ${SKY_TILE};"></span></sc-if>
            <sc-if value="{{o.isSunset}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; inset: 0; background: ${SUNSET_BG};"></span></sc-if>
            <sc-if value="{{o.isPhoto}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; inset: 0; background: {{t.surf}}; color: {{t.muted}}; display: flex; align-items: center; justify-content: center;">${svg(I.image, 18, 1.8)}</span><sc-if value="{{hasBgPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{bgPhoto}}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></sc-if></sc-if>
          </span><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{o.label}}</span></button></sc-for></div>
          <sc-if value="{{bgIsPhoto}}" hint-placeholder-val="{{ false }}"><div style="display: flex; gap: 6px;">${smallBtn('Change photo', 'uploadBg', 'image')}</div></sc-if>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Folder</span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{folderChips}}" as="f" hint-placeholder-count="3"><button type="button" onClick="{{f.pick}}" aria-pressed="{{f.pressed}}" style="height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{f.bg}}; color: {{f.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.folder, 14, 1.8)}{{f.label}}</button></sc-for></div>
          <sc-if value="{{noFolders}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: {{t.muted}};">Make folders on the Library page.</span></sc-if>
        </div>
        <label style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Name</span><input type="text" value="{{deckName}}" onChange="{{setDeckName}}" style="height: 46px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px;"></label>
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Tags</span>${TAG_EDIT('deckTags', 'deckPick', phone)}</div>
        <div style="display: flex; align-items: center; gap: 12px; min-height: 44px;"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 14px; font-weight: 600;">Pause this deck</span><span style="font-size: 12px; line-height: 1.35; color: {{t.muted}};">No reminders, and it leaves Today until you turn it back on.</span></span><button type="button" role="switch" aria-checked="{{pause.checked}}" aria-label="Pause this deck" onClick="{{togglePause}}" style="width: 48px; height: 28px; flex-shrink: 0; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{pause.track}}; cursor: pointer; transition: background .2s;"><span style="display: block; width: 22px; height: 22px; border-radius: 11px; background: {{pause.knobColor}}; transform: {{pause.knob}}; transition: transform .2s cubic-bezier(.4,0,.2,1);"></span></button></div>
        <div style="display: flex; gap: 8px; margin-top: auto;"><button type="button" onClick="{{exportDeck}}" style="flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Export cards</button><button type="button" onClick="{{deleteDeck}}" style="flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.againTint}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Delete deck</button></div>
      </div></sc-if>
      <sc-if value="{{dsStudy}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Grade with</span>${modeSeg(true)}</div>
        <div style="display: flex; align-items: center; gap: 12px;"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 14px; font-weight: 600;">Schedule with FSRS</span><span style="font-size: 12px; line-height: 1.35; color: {{t.muted}};">{{fsrsHint}}</span></span>${SWITCH('fsrsSw', 'toggleFsrs', 'Schedule with FSRS')}</div>
        <sc-if value="{{fsrsOn}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 12px;"><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">${stepper('Remember goal', 'goal', 'lessGoal', 'moreGoal', true)}${stepper('Longest gap', 'gapLabel', 'lessGap', 'moreGap', true)}</div>${STEPS_ROW}</div></sc-if>
        <div style="display: flex; align-items: center; gap: 12px; min-height: 44px;"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 14px; font-weight: 600;">New cards a day</span><span style="font-size: 12px; color: {{t.muted}};">Unseen cards added each day</span></span>${miniStep('perDay', 'lessDay', 'moreDay', '{{t.surf}}', 'perDayIn')}</div>
      </div></sc-if>`;

// How many cards wait for Flashcards today, as a small round count inside its button.
const STUDY_COUNT = (h, bg, fg) => `<span style="min-width: ${h}px; height: ${h}px; padding: 0 7px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border-radius: ${h / 2}px; background: ${bg}; color: ${fg}; font-family: ${MONO}; font-size: ${h > 22 ? 13 : 12}px; font-weight: 600;">{{studyCount}}</span>`;
const webDeck = webRoot(`${sidebar('Library')}
<main style="position: relative; flex-grow: 1; box-sizing: border-box; padding: 24px 48px 20px; display: flex; flex-direction: column; gap: 20px; min-width: 0; scroll-timeline: --deck block;">
  <div style="position: relative; height: 184px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">
    ${parallax(184, 24)}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 20px 24px 24px 28px; display: flex; flex-direction: column; justify-content: space-between; color: {{coverInk}};">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <a href="WebDecks.dc.html" style="height: 36px; padding: 0 14px 0 10px; display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; ${onCover} font-size: 13px; font-weight: 600;">${svg(I.back, 14, 2.2)}Library</a>
        ${coverBtn('Deck settings', 'openSettings', 'gear')}
      </div>
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;">
        <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0; text-shadow: {{coverShadow}};"><h1 style="margin: 0; font-size: 34px; font-weight: 600; letter-spacing: -.035em; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</h1><div style="font-size: 14px; opacity: .8;">{{deckLine}}</div></div>
        <div style="display: flex; gap: 10px; flex-shrink: 0;">
          <sc-if value="{{showLive}}" hint-placeholder-val="{{ false }}"><a href="LiveSetup.dc.html" style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; ${onCover} font-size: 14px; font-weight: 600;">${svg(I.live, 15, 2)}Play live</a></sc-if>
          <a href="{{learnHref}}" style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; ${onCover} font-size: 14px; font-weight: 600;">${svg(I.sparkle, 15, 2)}{{learnLabel}}</a>
          <a href="{{newCardHref}}" style="height: 36px; padding: 0 18px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; ${onCover} font-size: 14px; font-weight: 600;">${svg(I.plus, 16, 2)}New card</a>
          <a href="{{studyHref}}" style="height: 36px; padding: 0 8px 0 18px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: #FFFFFF; color: #000000; box-shadow: 0 1px 2px rgba(0,0,0,.1); font-size: 14px; font-weight: 600;">${svg(I.decks, 15, 2)}<span>{{studyLabel}}</span><sc-if value="{{hasStudyCount}}" hint-placeholder-val="{{ true }}">${STUDY_COUNT(22, '#EDEDED', '#000000')}</sc-if><sc-if value="{{noStudyCount}}" hint-placeholder-val="{{ false }}"><span style="width: 2px;"></span></sc-if></a>
        </div>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;">
    <sc-for list="{{tiles}}" as="k" hint-placeholder-count="3">
      ${deckTile(true)}
    </sc-for>
    <div style="border-radius: 16px; height: 104px; box-sizing: border-box; padding: 18px 20px; background: {{t.surf}}; display: flex; flex-direction: column; justify-content: space-between;"><span style="font-size: 13px; font-weight: 500; color: {{t.muted}};">Due next 7 days</span><div style="display: flex; align-items: flex-end; gap: 6px; height: 36px;"><sc-for list="{{spark}}" as="s" hint-placeholder-count="7"><div style="flex-grow: 1; border-radius: 4px; background: {{s.c}}; height: {{s.h}};"></div></sc-for></div></div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <sc-for list="{{filters}}" as="f" hint-placeholder-count="6">
      <button type="button" onClick="{{f.pick}}" aria-pressed="{{f.pressed}}" style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{f.bg}}; color: {{f.fg}};">{{f.label}}</button>
    </sc-for>
    <div style="position: relative;"><button type="button" onClick="{{tagMenu.toggle}}" aria-expanded="{{tagMenu.expanded}}" aria-pressed="{{tagBtn.pressed}}" style="height: 36px; padding: 0 12px 0 16px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{tagBtn.bg}}; color: {{tagBtn.fg}};"><span style="width: {{tagBtn.dotW}}; height: 8px; margin-right: {{tagBtn.dotW}}; border-radius: 4px; background: {{tagBtn.dot}};"></span>{{tagBtn.label}}<span style="display: flex; margin-left: 6px;">${svg(I.chevDown, 14, 2)}</span></button>${tagMenu('tagMenu', 'left: 0; top: 44px;')}</div>
    <div style="flex-grow: 1;"></div>
    <label style="display: flex; align-items: center; gap: 8px; width: 260px; height: 36px; padding: 0 14px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};">${svg(I.search, 15)}<span style="position: absolute; left: -9999px;">Search this deck</span><input value="{{query}}" onChange="{{setQuery}}" placeholder="Search this deck" style="flex-grow: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: {{t.text}};"></label>
  </div>
  <div data-sc-list="cards" ref="{{dragList}}" onPointerDown="{{grab}}" style="display: flex; flex-direction: column;">
    <sc-for list="{{rows}}" as="r" hint-placeholder-count="6">
      <a href="{{r.href}}" data-sc-item="{{r.id}}" draggable="false" class="sc-drag" style="display: grid; grid-template-columns: 36px minmax(0, 1.4fr) minmax(0, 1fr) 190px 100px; gap: 16px; align-items: center; height: 64px; border-bottom: 1px solid {{t.line}}; font-size: 14px;">
        <span style="width: 32px; height: 32px; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">{{r.glyph}}</span>
        <span style="min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.front}}</span><span style="font-size: 12px; color: {{t.muted}};">{{r.kind}}{{r.aiNote}}</span></span>
        <span style="color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.back}}</span>
        <span style="display: flex; gap: 6px; min-width: 0; overflow: hidden;">${cardTag('c1')}${cardTag('c2')}${cardMore}</span>
        <span style="font-size: 13px; text-align: right;">{{r.next}}</span>
      </a>
    </sc-for>
  </div>
  <sc-if value="{{settingsOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <aside role="dialog" aria-label="Deck settings" style="position: absolute; top: 12px; right: 12px; bottom: 12px; width: 460px; box-sizing: border-box; padding: 24px; border-radius: 20px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
      ${deckSettingsBody(false)}
    </aside>
  </sc-if>
</main>
${moveTray('tray', false)}`, true);
// Dragging a card (drag.mjs, both deck pages): to another spot in the deck, or onto another deck in the Move to tray.
// The canvas shows the tray open (prop trayOpen), with a card over its first deck.
const CARD_DRAG_JS = phone => `const others = db.decks().filter(d => d.id !== dk.id), trayOpen = !!this.props.trayOpen;
  const cardDrag = {
    dragKey, dragList, trayShow: trayOpen ? 'flex' : 'none',
    tray: others.map((d, i) => ({ id: d.id, name: d.name, base: this.gen(d.seed + (d.round ? ' #' + d.round : ''), d.style).base, bg: trayOpen && !i ? t.text : t.surf, fg: trayOpen && !i ? t.bg : t.text })),
    grab: e => this.drag(e, { drops: ['deck:'], tray: others.length > 0, ink: t.text, bg: t.bg, lifted: liftRow, bottom: ${phone ? 92 : 0}, start: () => this.state.tagMenuOpen && this.setState({ tagMenuOpen: false }),
      drop: (id, w) => (w.to ? db.act.moveCard(id, w.to.slice(5)) : db.act.reorderCard(id, w.before)) }) };`;
const deckLogic = `
constructor(props) { super(props); this.state = { filter: 'All', tagMenuOpen: false, tagQ: '', q: '' }; }
renderVals() {
  ${T}${DB_JS}${COVER_LOGIC}${FORECAST_JS('{ vals: dk.forecast, labels: [], tops: null, names: [] }', 40)}
  ${CARD_TAGS_JS}
  ${LIFT_JS}
  ${CARD_DRAG_JS(false)}
  const labels = ['All', 'Basic', 'Fill in the blank', 'Image', 'Audio'];
  const f = this.state.filter, allRows = db.cards(dk.id), q = (this.state.q || '').trim().toLowerCase();
  const glyphs = { text: 'Aa', blank: '_', image: '▢', audio: '♪' };
  // Tags sit in one menu, so the filter row stays short however many tags the cards have.
  const uses = {}; allRows.forEach(r => r.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
  const tagNames = Object.keys(uses).sort((a, b) => uses[b] - uses[a] || a.localeCompare(b));
  const tagOn = tagNames.includes(f), tq = (this.state.tagQ || '').trim().toLowerCase(), found = tagNames.filter(g => !tq || g.toLowerCase().includes(tq));
  const menuOpen = !!this.state.tagMenuOpen;
  const rows = allRows.filter(r => (f === 'All' || r.kind === f || r.tags.includes(f)) && (!q || [r.front, r.back, ...r.tags].join(' ').toLowerCase().includes(q)))
    .map(r => ({ ...r, glyph: glyphs[r.icon], aiNote: r.ai ? ' · ' + r.ai : '', ...cardFit(r.tags) }));
  return {
    t, rows, ...chrome, ...coverVals, ...cardDrag, query: this.state.q || '', setQuery: e => this.setState({ q: e && e.target ? e.target.value : '' }),
    filters: labels.map(l => ({ label: l, pressed: l === f ? 'true' : 'false', bg: l === f ? t.inv : t.surf, fg: l === f ? t.invText : t.text, pick: () => this.setState({ filter: l, tagMenuOpen: false }) })),
    tagBtn: { label: tagOn ? f : 'Tags', pressed: tagOn ? 'true' : 'false', bg: tagOn ? t.inv : t.surf, fg: tagOn ? t.invText : t.text, dot: tagOn ? tagCol(f) : 'transparent', dotW: tagOn ? '8px' : '0px' },
    tagMenu: { open: menuOpen, expanded: menuOpen ? 'true' : 'false', query: this.state.tagQ || '',
      toggle: () => this.setState({ tagMenuOpen: !menuOpen, tagQ: '' }), setQuery: e => this.setState({ tagQ: e && e.target ? e.target.value : '' }),
      rows: found.map(g => ({ ...tagChip(g), count: String(uses[g]), on: g === f, pressed: g === f ? 'true' : 'false', pick: () => this.setState({ filter: g === f ? 'All' : g, tagMenuOpen: false, tagQ: '' }) })), none: found.length === 0 },
    spark: forecast,
    // Learn mode: start one, or go back to the one you stopped.
    learnHref: db.mock ? 'WebQuizStart.dc.html' : db.learnOn(dk.id) ? '/learn/' + dk.id : '/deck/' + dk.id + '/learn', learnLabel: 'Learn',
    // Live (play with friends) is on the canvas only until it’s built.
    showLive: !!db.mock
  };
}`;

// The sample cell diagram (220 x 150). `pointer`: the "1" pointing at the nucleus; a picture with boxes has none.
const CELL = (w, h, pointer = true) => `<svg width="${w}" height="${h}" viewBox="0 0 220 150" fill="none" stroke="{{t.text}}" stroke-width="2"${pointer ? '' : ' style="display: block;"'}><ellipse cx="104" cy="80" rx="94" ry="62"/><circle cx="116" cy="74" r="24" fill="{{t.surf}}"/><circle cx="120" cy="70" r="7" fill="{{t.text}}"/><ellipse cx="54" cy="96" rx="16" ry="8"/><ellipse cx="74" cy="46" rx="12" ry="6"/><ellipse cx="158" cy="112" rx="14" ry="7"/>${pointer ? '<path d="M138 60 L186 22"/><circle cx="194" cy="16" r="12" fill="{{t.inv}}" stroke="none"/><text x="194" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="{{t.invText}}" stroke="none" font-family="Geist, sans-serif">1</text>' : ''}</svg>`;
// ---------- Image occlusion (the owner: "image mode for cards doesnt have way to add occlusion box") ----------
// An image card can hide parts of its picture behind boxes, and each box is its own card, like each blank of a
// fill-in-the-blank card. A box's place and size are fractions of the picture (0 to 1), so it fits the picture at any
// size, and each box has a label: what's under it, the answer. "What to hide": only the box being asked (the rest of
// the picture shows), or every box, with one asked.
// How the boxes look on a card (review and Learn): the asked box is filled in the inverse color with its number; in
// "Hide all" the others are gray with theirs. Once the answer shows, the asked box fades to an outline. `c` holds the
// colors: the asked box (ask, askText), a hidden one (cover, coverText), and the ring that sets them off the picture.
const OCC_JS = `const occView = (boxes, ask, mode, shown, c) => (boxes || []).map((b, i) => {
    const asked = i === ask, hide = asked || mode === 'all', pct = v => +(v * 100).toFixed(3) + '%';
    return { n: hide ? String(i + 1) : '', x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h), z: asked ? '2' : '1',
      bg: asked ? (shown ? 'transparent' : c.ask) : hide ? c.cover : 'transparent', fg: asked ? (shown ? 'transparent' : c.askText) : c.coverText,
      ring: asked ? 'inset 0 0 0 2.5px ' + c.ask + ', 0 0 0 2px ' + c.ring : hide ? '0 0 0 2px ' + c.ring : 'none',
      // Only showing the answer fades; covering a new card's box is instant, so its answer never shows through.
      tr: asked && shown ? 'background-color .45s cubic-bezier(.2,.8,.2,1), color .3s ease' : 'none' };
  });`;
const OCC_BOXES = (list, fs) => `<sc-for list="{{${list}}}" as="ob" hint-placeholder-count="3"><span class="sc-occ" style="position: absolute; z-index: {{ob.z}}; left: {{ob.x}}; top: {{ob.y}}; width: {{ob.w}}; height: {{ob.h}}; box-sizing: border-box; border-radius: 6px; background: {{ob.bg}}; color: {{ob.fg}}; box-shadow: {{ob.ring}}; transition: {{ob.tr}}; display: flex; align-items: center; justify-content: center; font-size: ${fs}px; font-weight: 700; line-height: 1;">{{ob.n}}</span></sc-for>`;
// Reduced motion: the box turns to an outline at once.
const OCC_VIEW_CSS = '@media (prefers-reduced-motion:reduce){.sc-occ{transition:none!important}}';
// The editor's corner handles reach further than they look under a finger, mostly outward, so a small box can still
// be moved from its middle. The picture shows it has focus for keyboard use.
const OCC_EDIT_CSS = '.sc-occ-h::before,.sc-occ-x::before{content:"";position:absolute;inset:-5px}'
  + '@media (pointer:coarse){.sc-occ-h[data-occ-h=nw]::before{inset:-16px -3px -3px -16px}.sc-occ-h[data-occ-h=sw]::before{inset:-3px -3px -16px -16px}.sc-occ-h[data-occ-h=se]::before{inset:-3px -16px -16px -3px}.sc-occ-x::before{inset:-10px}}'
  + '.sc-occ-pic:focus-visible{outline:2px solid currentColor;outline-offset:5px}';
const occHandle = (c, pos, cursor) => `<span data-occ-h="${c}" class="sc-occ-h" style="position: absolute; ${pos} width: 12px; height: 12px; box-sizing: border-box; border-radius: 6px; background: {{t.bg}}; box-shadow: 0 0 0 2px {{t.inv}}; cursor: ${cursor};"></span>`;
// The picture in the editor, with its boxes: drag on it to draw one; a picked box shows its corners and a ×.
const occPicture = h => `<div style="height: ${h}px; box-sizing: border-box; padding: 14px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">
    <div class="sc-occ-pic" ref="{{occ.ref}}" tabindex="0" role="group" aria-label="The picture. Drag on it to hide a part behind a box." style="position: relative; max-width: 100%; line-height: 0; border-radius: 8px; color: {{t.text}}; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: crosshair; outline: 0;">
      <sc-if value="{{img.mock}}" hint-placeholder-val="{{ true }}">${CELL(Math.round((h - 28) * 22 / 15), h - 28, false)}</sc-if>
      <sc-if value="{{img.url}}" hint-placeholder-val="{{ false }}"><img src="{{img.url}}" alt="" draggable="false" style="display: block; max-width: 100%; max-height: ${h - 28}px; border-radius: 8px; pointer-events: none;"></sc-if>
      <sc-for list="{{occ.boxes}}" as="b" hint-placeholder-count="3"><div data-occ-box="{{b.id}}" style="position: absolute; z-index: {{b.z}}; left: {{b.x}}; top: {{b.y}}; width: {{b.w}}; height: {{b.h}}; box-sizing: border-box; border-radius: 6px; background: {{b.bg}}; color: {{b.fg}}; box-shadow: {{b.ring}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; line-height: 1; cursor: move;">{{b.num}}<sc-if value="{{b.sel}}" hint-placeholder-val="{{ false }}">${occHandle('nw', 'left: -6px; top: -6px;', 'nwse-resize')}${occHandle('sw', 'left: -6px; bottom: -6px;', 'nesw-resize')}${occHandle('se', 'right: -6px; bottom: -6px;', 'nwse-resize')}<button type="button" data-occ-del="1" class="sc-occ-x" onClick="{{b.del}}" aria-label="Remove box {{b.n}}" title="Remove box {{b.n}}" style="position: absolute; {{b.delAt}} width: 24px; height: 24px; padding: 0; border: 0; border-radius: 12px; background: {{t.inv}}; color: {{t.invText}}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.8)}</button></sc-if></div></sc-for>
    </div>
  </div>`;
// One row per box under the picture: its number (tap to pick the box), what's under it (the card's answer), and ×.
const occAnswers = `<sc-if value="{{occ.has}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 8px;">
    <span style="font-size: 13px; font-weight: 600;">Answers <span style="font-weight: 400; color: {{t.muted}};">· Each box is its own card. {{occ.hint}}</span></span>
    <div style="display: flex; flex-direction: column; gap: 6px;"><sc-for list="{{occ.boxes}}" as="b" hint-placeholder-count="3"><div style="height: 34px; box-sizing: border-box; padding: 0 6px; display: flex; align-items: center; gap: 8px; border-radius: 14px; background: {{t.surf}}; box-shadow: {{b.rowRing}}; transition: box-shadow .15s;">
      <button type="button" onClick="{{b.pick}}" aria-label="Pick box {{b.n}}" aria-pressed="{{b.pressed}}" style="width: 24px; height: 24px; flex-shrink: 0; padding: 0; border: 0; border-radius: 8px; background: {{b.chip}}; color: {{b.chipFg}}; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;">{{b.n}}</button>
      <input type="text" value="{{b.label}}" onChange="{{b.setLabel}}" onFocus="{{b.pick}}" onKeyDown="{{b.key}}" data-occ-label="{{b.id}}" placeholder="What’s under box {{b.n}}" aria-label="What’s under box {{b.n}}" maxlength="200" autocomplete="off" style="flex-grow: 1; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 15px;">
      <button type="button" onClick="{{b.remove}}" aria-label="Remove box {{b.n}}" title="Remove box {{b.n}}" style="width: 28px; height: 28px; flex-shrink: 0; padding: 0; border: 0; border-radius: 14px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 12, 2.2)}</button>
    </div></sc-for></div>
  </div></sc-if>
  <sc-if value="{{occ.tip}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">Drag on the picture to hide a part behind a box. Each box becomes its own card, with what’s under it as the answer.</span></sc-if>`;
// Card editor: slide-over panel on the deck page
const TYPE_SEG = `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
  <sc-for list="{{types}}" as="k" hint-placeholder-count="4">
    <button type="button" onClick="{{k.pick}}" style="height: 36px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{k.bg}}; color: {{k.fg}}; box-shadow: {{k.sh}};">{{k.label}}</button>
  </sc-for>
</div>`;
// Card text with its formatting (web/rich.js makes the lines). RICH_SHOW is text on a card; RICH_CLOZE also
// draws blanks, with `pill` as a blank's style; RICH_EDIT is the editor's own drawing, where every letter can be edited.
const RICH_SHOW = e => `<sc-for list="{{${e}}}" as="rl" hint-placeholder-count="1"><div style="{{rl.css}}"><sc-for list="{{rl.items}}" as="rc" hint-placeholder-count="1"><span style="{{rc.css}}">{{rc.t}}</span></sc-for></div></sc-for>`;
const RICH_CLOZE = (e, pill, cls = '') => `<sc-for list="{{${e}}}" as="rl" hint-placeholder-count="1"><div style="{{rl.css}}"><sc-for list="{{rl.items}}" as="rc" hint-placeholder-count="3"><sc-if value="{{rc.plain}}" hint-placeholder-val="{{ true }}"><span style="{{rc.css}}">{{rc.t}}</span></sc-if><sc-if value="{{rc.blank}}" hint-placeholder-val="{{ false }}"><span${cls ? ` class="${cls}"` : ''} style="${pill}"><sc-for list="{{rc.runs}}" as="rr" hint-placeholder-count="1"><span style="{{rr.css}}">{{rr.t}}</span></sc-for></span></sc-if></sc-for></div></sc-for>`;
const RICH_EDIT = e => `<sc-for list="{{${e}}}" as="rl" hint-placeholder-count="1"><div style="{{rl.css}}"><sc-for list="{{rl.items}}" as="rc" hint-placeholder-count="1"><sc-if value="{{rc.plain}}" hint-placeholder-val="{{ true }}"><span data-edge="{{rc.edge}}" style="{{rc.css}}">{{rc.t}}</span></sc-if><sc-if value="{{rc.blank}}" hint-placeholder-val="{{ false }}"><span data-edge="1" style="padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;"><sc-for list="{{rc.runs}}" as="rr" hint-placeholder-count="1"><span style="{{rr.css}}">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value="{{rl.empty}}" hint-placeholder-val="{{ false }}"><br></sc-if></div></sc-for>`;
// An empty field shows its placeholder.
const RICH_CSS = '.sc-rich[data-empty="true"]::before{content:attr(data-ph);position:absolute;color:var(--ph);pointer-events:none}';
// A card field: it shows bold, blanks, and the rest as you type. The editor's logic handles every keystroke.
const field = (label, key, rows = 3, ph = '') => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">${label}</span><div class="sc-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${label}" spellcheck="true" data-rk="${key}" data-ph="${ph}" data-empty="{{rich.${key}.empty}}" key="{{rich.${key}.key}}" ref="{{rich.${key}.ref}}" style="position: relative; min-height: ${+(rows * 1.45).toFixed(2)}em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.${key}.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;">${RICH_EDIT(`rich.${key}.lines`)}</div></div>`;
const blankPill = word => `<span style="padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600;">${word}</span>`;
const editorFieldsOf = phone => `
<sc-if value="{{isBasic}}" hint-placeholder-val="{{ true }}">${field('Front', 'front', 3, 'The question')}${field('Back', 'back', 2, 'The answer')}</sc-if>
<sc-if value="{{isCloze}}" hint-placeholder-val="{{ false }}">${field('Text', 'text', 3, 'Put [[double brackets]] around the words to hide')}
  <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Cards to make</span>${panelSeg('clozeModes', 'Cards to make')}</div>
  ${field('Extra, shown after', 'note', 1)}</sc-if>
<sc-if value="{{isImage}}" hint-placeholder-val="{{ false }}"><sc-if value="{{img.some}}" hint-placeholder-val="{{ true }}">${occPicture(phone ? 240 : 186)}</sc-if>
  <sc-if value="{{img.none}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{pickImage}}" style="height: ${phone ? 240 : 186}px; border: 1.5px dashed {{t.muted}}; border-radius: 20px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">${svg(I.image, 22, 1.8)}Add an image</button></sc-if>
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">${smallBtn('Replace image', 'pickImage', 'image')}<sc-if value="{{occ.canAdd}}" hint-placeholder-val="{{ true }}">${smallBtn('Add a box', 'addBox', 'plus')}</sc-if><sc-if value="{{occ.has}}" hint-placeholder-val="{{ true }}"><span style="flex-grow: 1;"></span>${panelSeg('occModes', 'What to hide')}</sc-if></div>
  ${occAnswers}
  ${field('Prompt', 'front', 1, 'What should they name?')}<sc-if value="{{occ.none}}" hint-placeholder-val="{{ false }}">${field('Answer', 'back', 1)}</sc-if></sc-if>
<sc-if value="{{isAudio}}" hint-placeholder-val="{{ false }}"><div style="height: 72px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; gap: 14px; padding: 0 16px;"><button type="button" onClick="{{playAudio}}" aria-label="Play" style="width: 40px; height: 40px; flex-shrink: 0; padding: 0; border: 0; border-radius: 20px; background: {{snd.btn}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.play, 16)}</button><sc-if value="{{snd.mock}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 2px; height: 32px;"><sc-for list="{{bars}}" as="b" hint-placeholder-count="64"><div style="flex: 1 1 0; min-width: 1px; border-radius: 1px; background: {{t.text}}; height: {{b.h}};"></div></sc-for></div><span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">0:02</span></sc-if><sc-if value="{{snd.real}}" hint-placeholder-val="{{ false }}"><span style="flex-grow: 1; min-width: 0; font-size: 14px; color: {{snd.fg}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{snd.label}}</span></sc-if></div>
  <div style="display: flex; gap: 8px; flex-wrap: wrap;">${smallBtn('{{recLabel}}', 'toggleRecord', 'mic')}${smallBtn('Upload', 'pickAudio', 'upload')}${smallBtn('Read it aloud', 'toggleSpeak', 'audio')}</div>
  <sc-if value="{{speakOn}}" hint-placeholder-val="{{ false }}">${field('Words to read aloud', 'speak', 1, 'What the card says out loud')}</sc-if>
  ${field('Answer', 'back', 1)}
  <div style="display: flex; align-items: center; gap: 12px; min-height: 44px;"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 14px; font-weight: 600;">Play on its own</span><span style="font-size: 12px; color: {{t.muted}};">The sound starts when the card comes up</span></span>${SWITCH('autoSw', 'toggleAuto', 'Play on its own')}</div></sc-if>`;
// Web formatting bar: text styles, blank, list, math, image, audio, undo. It works on the field you're typing in,
// and pressing a button leaves the caret there.
const webFmtBtn = (label, glyph, key, toggle = true) => `<button type="button" onMouseDown="{{keepFocus}}" onClick="{{fmt.${key}.toggle}}"${toggle ? ` aria-pressed="{{fmt.${key}.pressed}}"` : ''} aria-label="${label}" title="${label}" style="width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.${key}.webBg}}; box-shadow: {{fmt.${key}.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;">${glyph}</button>`;
const webFmtLine = '<span style="width: 1px; height: 20px; margin: 0 4px; flex-shrink: 0; background: {{t.surf2}};"></span>';
const WEB_FMT = `<div role="toolbar" aria-label="Formatting" style="display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px; background: {{t.surf}};">
      ${webFmtBtn('Bold', '<span style="font-size: 16px; font-weight: 700;">B</span>', 'b')}${webFmtBtn('Italic', '<span style="font-size: 17px; font-style: italic; font-family: Georgia, serif;">I</span>', 'i')}${webFmtBtn('Underline', '<span style="font-size: 16px; text-decoration: underline; text-underline-offset: 3px;">U</span>', 'u')}${webFmtBtn('Strikethrough', '<span style="font-size: 16px; text-decoration: line-through;">S</span>', 's')}${webFmtBtn('Highlight', svg(I.marker, 18, 1.7), 'hl')}${webFmtLine}${webFmtBtn('Make a blank', svg(I.bracket, 19, 1.7), 'blank')}${webFmtBtn('List', svg(I.list, 18, 1.7), 'list')}${webFmtBtn('Math', svg(I.sqrt, 18, 1.7), 'math')}${webFmtLine}${webFmtBtn('Add image', svg(I.image, 18, 1.7), 'img', false)}${webFmtBtn('Add audio', svg(I.mic, 18, 1.7), 'audio', false)}<span style="flex-grow: 1;"></span>${webFmtBtn('Undo', svg(I.undo, 18, 1.7), 'undo', false)}
    </div>`;
// The / menu, like Notion's: type / in a field for headings, lists, a blank, math, an image, or audio.
// It opens under the / and narrows as you type; ↑ ↓ and Return pick, Esc closes.
const slashIcon = `<sc-if value="{{it.g}}" hint-placeholder-val="{{ true }}">{{it.g}}</sc-if><sc-if value="{{it.list}}" hint-placeholder-val="{{ false }}">${svg(I.list, 16, 1.8)}</sc-if><sc-if value="{{it.bracket}}" hint-placeholder-val="{{ false }}">${svg(I.bracket, 16, 1.8)}</sc-if><sc-if value="{{it.sqrt}}" hint-placeholder-val="{{ false }}">${svg(I.sqrt, 16, 1.8)}</sc-if><sc-if value="{{it.image}}" hint-placeholder-val="{{ false }}">${svg(I.image, 16, 1.8)}</sc-if><sc-if value="{{it.mic}}" hint-placeholder-val="{{ false }}">${svg(I.mic, 16, 1.8)}</sc-if>`;
const SLASH_MENU = maxH => `<sc-if value="{{slash.on}}" hint-placeholder-val="{{ false }}"><div role="listbox" aria-label="Add to the card" data-slash="1" onMouseDown="{{keepFocus}}" style="position: absolute; left: {{slash.x}}; top: {{slash.y}}; width: 248px; max-height: ${maxH}px; overflow-y: auto; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px; z-index: 30;"><sc-for list="{{slash.items}}" as="it" hint-placeholder-count="6"><button type="button" role="option" aria-selected="{{it.sel}}" onMouseDown="{{keepFocus}}" onClick="{{it.pick}}" style="flex-shrink: 0; height: 40px; padding: 0 8px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{it.bg}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;"><span style="width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; background: {{it.chip}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; letter-spacing: -.02em;">${slashIcon}</span><span style="flex-grow: 1;">{{it.label}}</span><span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{it.hint}}</span></button></sc-for></div></sc-if>`;
const webEditor = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <aside style="position: absolute; top: 12px; right: 12px; bottom: 12px; width: 520px; box-sizing: border-box; padding: 28px; border-radius: 20px; background: {{t.bg}}; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 24px 64px rgba(0,0,0,.24);">
    <div style="display: flex; align-items: center; justify-content: space-between;"><div style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">{{title}}</div><a href="{{backHref}}" aria-label="Close" style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    ${TYPE_SEG}
    ${WEB_FMT}
    <div style="flex-shrink: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 20px;">${editorFieldsOf(false)}</div>
    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">${chip(svg(I.decks, 12, 2) + '{{deckName}}', 'height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600;')}${TAG_EDIT('cardTags', 'cardPick')}</div>
    <div style="flex-grow: 1;"></div>
    <div style="display: flex; gap: 10px;"><sc-if value="{{canDelete}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{remove}}" style="height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.againTint}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Delete</button></sc-if><a href="{{backHref}}" style="flex-grow: 1; height: 40px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">Cancel</a><a href="{{backHref}}" onClick="{{save}}" data-key="mod+enter" style="flex-grow: 2; height: 40px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">Save card <span style="font-family: ${MONO}; font-size: 12px; opacity: .6; margin-left: 8px;">⌘↵</span></a></div>
    ${SLASH_MENU(420)}
  </aside>
</div>`;
const EDITOR_LOGIC = `
constructor(props) {
  super(props);
  this.state = { typing: !!props.keyboard, focus: 'front', styles: !!props.textStyles };
  // The card as you write it: its fields, its type, where the caret is, and what Undo steps back to.
  // It lives outside state so fast typing never builds on an old copy.
  this.ed = { edits: {}, type: null, sel: null, pend: null, past: [], future: [], last: '', lastAt: 0, key: 0, restore: false, sig: '' };
  this.els = {};
  this.refFns = {};
}
componentDidMount() { this.placeCaret(); this.placeSlash(); this.onDocKey = ev => this.boxKey(ev); document.addEventListener('keydown', this.onDocKey); }
componentDidUpdate() { this.placeCaret(); this.placeSlash(); this.placeLabel(); }
componentWillUnmount() { if (this.onSel) document.removeEventListener('selectionchange', this.onSel); if (this.onDocKey) document.removeEventListener('keydown', this.onDocKey); }
// A saved card opens with what it says; a new one starts empty in the app (the canvas shows a sample).
doc() {
  const db = this.props.db || this.mock(), e = this.ed;
  const saved = this.props.cardId ? db.card(this.props.cardId) : null;
  const names = { basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' };
  const ty = e.type || (saved ? names[saved.kind] : ({ Blank: 'Blank', Image: 'Image', Audio: 'Audio' })[this.props.cardType] || 'Basic');
  return { db, saved, ty, f: { ...(saved || db.draft(ty)), ...e.edits } };
}
isCloze(k) { return k === 'text' && this.doc().ty === 'Blank'; }
lines(k) { return this.rich().parse(this.doc().f[k] || '', this.isCloze(k)); }
firstField(ty) { return { Basic: 'front', Blank: 'text', Image: 'front', Audio: 'back' }[ty]; }
live(k) { const el = this.els[k]; return !!el && el.isConnected && el.getAttribute('data-rk') === k; }
// Every change goes through here, so Undo can step back through it. Typing in a row is one step.
commit(patch, o) {
  o = o || {};
  const e = this.ed, now = Date.now(), again = /^(type|del):/.test(o.kind || '') && o.kind === e.last && now - e.lastAt < 1000;
  if (!again) { e.past.push({ edits: e.edits, type: e.type, sel: e.sel }); if (e.past.length > 100) e.past.shift(); e.future = []; }
  e.last = o.kind || '';
  e.lastAt = now;
  e.edits = { ...e.edits, ...patch };
  if (o.type) e.type = o.type;
  if (o.sel) { e.sel = o.sel; e.restore = true; }
  e.pend = o.pend || null;
  this.forceUpdate();
}
step(from, to) {
  const e = this.ed;
  if (!from.length) return;
  to.push({ edits: e.edits, type: e.type, sel: e.sel });
  const p = from.pop();
  e.edits = p.edits; e.type = p.type; e.sel = p.sel; e.restore = !!p.sel; e.pend = null; e.last = '';
  this.forceUpdate();
}
undo() { this.step(this.ed.past, this.ed.future); }
redo() { this.step(this.ed.future, this.ed.past); }
// The selection in field k: the one about to be drawn, else the browser's.
selIn(k) {
  const e = this.ed, el = this.els[k], R = this.rich();
  if (e.restore && e.sel && e.sel.k === k) return e.sel;
  const s = document.getSelection();
  if (this.live(k) && s && s.rangeCount && el.contains(s.anchorNode)) {
    const a = R.domPos(el, s.anchorNode, s.anchorOffset), b = R.domPos(el, s.focusNode, s.focusOffset);
    return { k, a: Math.min(a, b), b: Math.max(a, b) };
  }
  if (e.sel && e.sel.k === k) return e.sel;
  const n = R.size(this.lines(k));
  return { k, a: n, b: n };
}
// After a change is drawn, put the caret back where it belongs.
placeCaret() {
  const e = this.ed;
  if (!e.restore || !e.sel || !this.live(e.sel.k)) return;
  e.restore = false;
  const el = this.els[e.sel.k];
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  this.rich().setSel(el, e.sel.a, e.sel.b);
}
focusField(k) {
  const n = this.rich().size(this.lines(k));
  this.ed.sel = { k, a: n, b: n };
  this.ed.restore = true;
  this.setState({ typing: true, focus: k, speakOpen: this.state.speakOpen || k === 'speak' });
}
// Each field is drawn from the card's text; the browser never edits it on its own.
refFor(k) {
  return this.refFns[k] || (this.refFns[k] = el => {
    if (!el) return;
    this.els[k] = el;
    if (el.__sc) return;
    el.__sc = true;
    const key = () => el.getAttribute('data-rk');
    el.addEventListener('beforeinput', ev => this.onEdit(ev, key()));
    el.addEventListener('keydown', ev => this.onKey(ev, key()));
    el.addEventListener('compositionstart', () => this.onCompose(key(), true));
    el.addEventListener('compositionend', ev => this.onCompose(key(), false, ev.data));
    el.addEventListener('copy', ev => this.onCopy(ev, key(), false));
    el.addEventListener('cut', ev => this.onCopy(ev, key(), true));
    el.addEventListener('focus', () => this.onFocus(key(), true));
    el.addEventListener('blur', () => this.onFocus(key(), false));
    el.addEventListener('dragstart', ev => ev.preventDefault());
    el.addEventListener('drop', ev => ev.preventDefault());
    if (!this.onSel) { this.onSel = () => this.trackSel(); document.addEventListener('selectionchange', this.onSel); }
  });
}
onFocus(k, on) {
  if (!on && this.ed.slash) { this.ed.slash = null; this.forceUpdate(); }
  if (on) { if (!this.state.typing || this.state.focus !== k) this.setState({ typing: true, focus: k }); }
  else if (!this.props.keyboard && this.state.typing) this.setState({ typing: false });
}
// The formatting buttons follow the caret.
trackSel() {
  const e = this.ed, s = document.getSelection(), els = Object.values(this.els).filter(x => x && x.isConnected);
  if (!els.length) { document.removeEventListener('selectionchange', this.onSel); this.onSel = null; return; }
  if (e.restore || !s || !s.rangeCount) return;
  const el = els.find(x => x.contains(s.anchorNode));
  if (!el || el.hasAttribute('data-composing')) return;
  const R = this.rich(), k = el.getAttribute('data-rk'), a = R.domPos(el, s.anchorNode, s.anchorOffset), b = R.domPos(el, s.focusNode, s.focusOffset);
  const sel = { k, a: Math.min(a, b), b: Math.max(a, b) }, o = e.sel;
  if (!o || o.k !== k || o.a !== sel.a || o.b !== sel.b) {
    e.sel = sel;
    if (e.pend && (e.pend.k !== k || e.pend.at !== sel.a || sel.a !== sel.b)) e.pend = null;
  }
  const sig = JSON.stringify(this.pressed()) + (e.slash && this.slashView() ? '/' : '');
  if (sig !== e.sig) { e.sig = sig; this.forceUpdate(); }
}
// Which buttons show as on: the look of what's selected, or of what you'd type next.
pressed() {
  const e = this.ed, s = e.sel;
  if (!s || !this.live(s.k)) return {};
  const R = this.rich(), L = this.lines(s.k);
  const m = e.pend && e.pend.k === s.k && e.pend.at === s.a && s.a === s.b ? e.pend.m : s.a === s.b ? R.typingMarks(L, s.a, s.a) : R.marksIn(L, s.a, s.b);
  const on = {};
  for (const c of m) on[c] = true;
  if (R.allKind(L, s.a, s.b, 'li')) on.list = true;
  return on;
}
// Keys like a notes app: ⌘B bold, ⌘I italic, ⌘U underline, ⌘⇧S strikethrough, ⌘⇧H highlight, ⌘⇧E math,
// ⌘⌥1–3 headings, ⌘⌥0 plain text, ⌘⌥5 bullets, ⌘⌥6 numbers (⌘⇧8 and ⌘⇧7 too), ⌘Z undo, ⌘⇧Z redo.
onKey(ev, k) {
  const mod = ev.metaKey || ev.ctrlKey, key = (ev.key || '').toLowerCase(), code = ev.code || '';
  // The / menu: ↑ ↓ move, Return or Tab picks, Esc closes.
  const menu = this.ed.slash && !mod && !ev.isComposing ? this.slashView() : null;
  if (menu && /^(arrowdown|arrowup|enter|tab|escape)$/.test(key)) {
    ev.preventDefault();
    const sl = this.ed.slash, n = menu.items.length;
    if (key === 'escape') { this.ed.slash = null; return this.forceUpdate(); }
    if (key === 'enter' || key === 'tab') return this.slashPick(menu.items[sl.idx].id);
    sl.idx = (sl.idx + (key === 'arrowdown' ? 1 : n - 1)) % n;
    sl.scroll = true;
    return this.forceUpdate();
  }
  if (!mod) return;
  const line = ev.altKey ? { Digit0: '', Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit5: 'li', Digit6: 'ol' }[code] : ev.shiftKey ? { Digit8: 'li', Digit7: 'ol' }[code] : undefined;
  if (line !== undefined) { ev.preventDefault(); return this.lineKind(line); }
  if (ev.altKey) return;
  if (key === 'z') { ev.preventDefault(); return ev.shiftKey ? this.redo() : this.undo(); }
  if (key === 'y') { ev.preventDefault(); return this.redo(); }
  const m = ev.shiftKey ? { s: 's', x: 's', h: 'h', e: 'm' }[key] : { b: 'b', i: 'i', u: 'u' }[key];
  if (m) { ev.preventDefault(); this.fmt(m); }
}
onEdit(ev, k) {
  const ty = ev.inputType || '';
  // An input method (Japanese, Chinese, accents) is still typing: read what it wrote when it's done.
  if (ev.isComposing || ty === 'insertCompositionText') return;
  ev.preventDefault();
  if (ty === 'historyUndo') return this.undo();
  if (ty === 'historyRedo') return this.redo();
  const F = { formatBold: 'b', formatItalic: 'i', formatUnderline: 'u', formatStrikeThrough: 's' }[ty];
  if (F) return this.fmt(F);
  if (/Composition$|ByDrag$|ByCut$/.test(ty)) return;
  const R = this.rich(), L = this.lines(k), s = this.selIn(k);
  let a = s.a, b = s.b;
  const exact = !this.ed.restore && ev.getTargetRanges ? ev.getTargetRanges() : [];
  if (exact.length && (ty.startsWith('delete') || ty === 'insertReplacementText')) {
    const r = exact[0], el = this.els[k], x = R.domPos(el, r.startContainer, r.startOffset), y = R.domPos(el, r.endContainer, r.endOffset);
    a = Math.min(x, y); b = Math.max(x, y);
  }
  const dt = ev.dataTransfer;
  if (ty === 'insertText' || ty === 'insertReplacementText') return this.typeIn(k, L, a, b, ev.data != null ? ev.data : dt ? dt.getData('text/plain') : '');
  if (ty === 'insertParagraph' || ty === 'insertLineBreak') return this.enter(k, L, a, b);
  if (ty.startsWith('insertFrom')) return this.paste(k, L, a, b, dt);
  if (ty.startsWith('delete')) return this.erase(k, L, s, a, b, ty, exact.length > 0);
}
typeIn(k, L, a, b, text) {
  if (!text) return;
  const R = this.rich(), e = this.ed, cloze = this.isCloze(k);
  const m = e.pend && e.pend.k === k && e.pend.at === a && a === b ? e.pend.m : R.typingMarks(L, a, b);
  let lines = R.replace(L, a, b, R.frag(text, m, R.lineAt(L, a).kind)), caret = a + text.length;
  // Shortcuts as you type: "# " makes a heading, "- " a bullet, "1. " a number; **bold**, ==highlight== and the rest finish a style.
  ({ lines, caret } = R.lineRule(lines, caret));
  const fin = R.inlineRule(lines, caret);
  ({ lines, caret } = fin);
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  // A finished style stops there; a blank or math you're typing into carries on with the next letter (until you move the caret).
  const pend = fin.done ? { k, at: caret, m: R.typingMarks(lines, caret, caret).replace(fin.done, '') } : /[km]/.test(m) ? { k, at: caret, m } : null;
  // A / at the start of a line or after a space opens the / menu (not inside math, like a/b). Web only: the iPhone editor has none.
  const before = R.text(L).slice(0, a);
  if (text === '/' && this.props.keyboard === undefined && !m.includes('m') && (!before || /\\s$/.test(before))) e.slash = { k, at: a, idx: 0, q: '', pos: null };
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'type:' + k, sel: { k, a: caret, b: caret }, pend });
}
// What the / menu offers, and the words that find each thing.
slashItems() {
  return [
    { id: 'text', label: 'Text', hint: '', g: 'Aa', keys: ['text', 'plain', 'paragraph', 'normal'] },
    { id: 'h1', label: 'Heading 1', hint: '#', g: 'H1', keys: ['h1', 'heading', 'title', 'big'] },
    { id: 'h2', label: 'Heading 2', hint: '##', g: 'H2', keys: ['h2', 'heading', 'subheading'] },
    { id: 'h3', label: 'Heading 3', hint: '###', g: 'H3', keys: ['h3', 'heading', 'small'] },
    { id: 'li', label: 'Bulleted list', hint: '-', icon: 'list', keys: ['bullet', 'list', 'ul', 'unordered', 'points'] },
    { id: 'ol', label: 'Numbered list', hint: '1.', g: '1.', keys: ['numbered', 'number', 'list', 'ol', 'ordered', 'steps'] },
    { id: 'k', label: 'Blank', hint: '[[ ]]', icon: 'bracket', keys: ['blank', 'cloze', 'fill', 'hide', 'gap'] },
    { id: 'm', label: 'Math', hint: '$ $', icon: 'sqrt', keys: ['math', 'equation', 'formula', 'latex', 'tex'] },
    { id: 'image', label: 'Image', hint: '', icon: 'image', keys: ['image', 'picture', 'photo', 'diagram', 'img'] },
    { id: 'audio', label: 'Audio', hint: '', icon: 'mic', keys: ['audio', 'sound', 'record', 'voice', 'mic'] }
  ];
}
// The open / menu: what you've typed after the / and what matches it. Moving away or no matches closes it.
slashView() {
  const e = this.ed, sl = e.slash, sel = e.sel;
  if (!sl) return null;
  const t = this.rich().text(this.lines(sl.k)), q = sel && sel.k === sl.k && sel.a === sel.b && sel.a > sl.at ? t.slice(sl.at + 1, sel.a) : null;
  const items = q == null || t[sl.at] !== '/' || /\\n|^\\s/.test(q) || q.length > 24 ? [] : this.slashItems().filter(it => { const w = q.trim().toLowerCase(); return !w || it.label.toLowerCase().includes(w) || it.keys.some(x => x.startsWith(w)); });
  if (!items.length) { e.slash = null; return null; }
  sl.q = q;
  sl.idx = Math.min(sl.idx, items.length - 1);
  return { items };
}
// Put the menu just under the / (above it when there's no room), inside the editor's panel.
placeSlash() {
  const e = this.ed, sl = e.slash;
  if (!sl || !this.live(sl.k)) return;
  const menu = this.els[sl.k].offsetParent && this.els[sl.k].offsetParent.querySelector('[data-slash="1"]');
  if (sl.scroll && menu) { sl.scroll = false; const on = menu.querySelector('[aria-selected="true"]'); if (on) on.scrollIntoView({ block: 'nearest' }); }
  if (sl.pos && !sl.demo) return;
  const el = this.els[sl.k], host = el.offsetParent, R = this.rich();
  if (!host || !this.slashView()) return;
  const [n1, o1] = R.pointAt(el, sl.at), [n2, o2] = R.pointAt(el, sl.at + 1), r = document.createRange();
  try { r.setStart(n1, o1); r.setEnd(n2, o2); } catch (err) { return; }
  const box = r.getBoundingClientRect(), hb = host.getBoundingClientRect(), z = hb.width / (host.offsetWidth || hb.width) || 1;
  const w = 248, h = menu ? menu.offsetHeight : 300, left = (box.left - hb.left) / z, top = (box.top - hb.top) / z, bottom = (box.bottom - hb.top) / z;
  const x = Math.round(Math.max(12, Math.min(left - 10, host.offsetWidth - w - 12)));
  const y = Math.round(bottom + 8 + h > host.offsetHeight - 12 && top - 8 - h > 12 ? top - 8 - h : bottom + 8);
  const pos = { x: x + 'px', y: y + 'px' };
  if (sl.pos && sl.pos.x === pos.x && sl.pos.y === pos.y) return;
  sl.pos = pos;
  sl.demo = false;
  this.forceUpdate();
}
// Picking from the / menu takes the "/..." away, then does the thing where it was.
slashPick(id) {
  const e = this.ed, sl = e.slash;
  if (!sl || !this.slashView()) return;
  const R = this.rich(), k = sl.k, cloze = this.isCloze(k), a = sl.at;
  let lines = R.replace(this.lines(k), a, a + 1 + sl.q.length, [{ runs: [] }]);
  e.slash = null;
  const at = { k, a, b: a };
  if (['text', 'h1', 'h2', 'h3', 'li', 'ol'].includes(id)) return this.commit({ [k]: R.write(R.setKind(lines, a, a, id === 'text' ? '' : id), cloze) }, { kind: 'fmt', sel: at });
  if (id === 'm' || (id === 'k' && cloze)) return this.commit({ [k]: R.write(lines, cloze) }, { kind: 'fmt', sel: at, pend: { k, at: a, m: R.typingMarks(lines, a, a) + id } });
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'fmt', sel: at });
  if (id === 'k') { this.toBlank(); if (this.ed.sel && this.ed.sel.k === 'text' && this.ed.sel.a === this.ed.sel.b) this.ed.pend = { k: 'text', at: this.ed.sel.a, m: 'k' }; return; }
  this.media(id === 'image' ? 'image' : 'audio');
}
// Return makes a new line: a new bullet or number in a list, plain text after a heading. On an empty bullet it ends the list.
enter(k, L, a, b) {
  const R = this.rich(), cloze = this.isCloze(k), l = R.lineAt(L, a);
  if (a === b && R.carry(l.kind) && !R.lineLen(l)) return this.commit({ [k]: R.write(R.setKind(L, a, a, ''), cloze) }, { kind: 'line', sel: { k, a, b: a } });
  const m = R.typingMarks(L, a, b).replace(/[km]/g, '');
  this.commit({ [k]: R.write(R.replace(L, a, b, [{ runs: [] }, { kind: R.carry(l.kind), runs: [] }]), cloze) }, { kind: 'line', sel: { k, a: a + 1, b: a + 1 }, pend: m ? { k, at: a + 1, m } : null });
}
erase(k, L, s, a, b, ty, exact) {
  const R = this.rich(), cloze = this.isCloze(k), back = /Backward/.test(ty), [i, c] = R.at(L, s.a);
  // Backspace at the start of a heading, bullet, or number turns the line back into text first.
  if (back && s.a === s.b && c === 0 && L[i].kind) return this.commit({ [k]: R.write(R.setKind(L, s.a, s.a, ''), cloze) }, { kind: 'line', sel: { k, a: s.a, b: s.a } });
  if (!exact && a === b) {
    const t = R.text(L), [n, col] = R.at(L, a), end = R.lineLen(L[n]);
    if (back) a = /Word/.test(ty) ? R.wordStart(t, a) : /Line/.test(ty) ? a - col : R.prevChar(t, a);
    else b = /Word/.test(ty) ? R.wordEnd(t, b) : /Line/.test(ty) ? b + end - col : R.nextChar(t, b);
  }
  if (a === b) return;
  this.commit({ [k]: R.write(R.replace(L, a, b, [{ runs: [] }]), cloze) }, { kind: 'del:' + k, sel: { k, a, b: a } });
}
// Pasting keeps bold, italic, and the rest (from a web page, a doc, or another card); plain text takes the look around it.
paste(k, L, a, b, dt) {
  if (!dt) return;
  const R = this.rich(), cloze = this.isCloze(k), html = dt.getData('text/html'), txt = dt.getData('text/plain');
  const md = html ? R.fromHtml(html, cloze) : '';
  const part = md ? R.parse(md, cloze) : txt ? R.frag(txt.replace(/\\r\\n?/g, '\\n'), R.typingMarks(L, a, b), R.lineAt(L, a).kind) : null;
  if (!part) return;
  let lines = R.replace(L, a, b, part), caret = a + R.size(part);
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'paste', sel: { k, a: caret, b: caret } });
}
onCopy(ev, k, cut) {
  const R = this.rich(), s = this.selIn(k);
  if (s.a === s.b || !ev.clipboardData) return;
  ev.preventDefault();
  const L = this.lines(k), part = R.slice(L, s.a, s.b);
  ev.clipboardData.setData('text/plain', R.plainLines(part));
  ev.clipboardData.setData('text/html', R.toHtml(part));
  if (cut) this.commit({ [k]: R.write(R.replace(L, s.a, s.b, [{ runs: [] }]), this.isCloze(k)) }, { kind: 'cut', sel: { k, a: s.a, b: s.a } });
}
onCompose(k, start, data) {
  const e = this.ed, el = this.els[k];
  if (start) { e.comp = this.selIn(k); if (el) el.setAttribute('data-composing', '1'); return; }
  if (el) el.removeAttribute('data-composing');
  const s = e.comp || this.selIn(k), R = this.rich(), L = this.lines(k), cloze = this.isCloze(k);
  e.comp = null;
  e.key++; // the input method wrote into the field itself, so draw the field afresh
  if (!data) { e.sel = { k, a: s.a, b: s.b }; e.restore = true; return this.forceUpdate(); }
  const m = e.pend && e.pend.k === k && e.pend.at === s.a && s.a === s.b ? e.pend.m : R.typingMarks(L, s.a, s.b);
  let lines = R.replace(L, s.a, s.b, R.frag(data, m, R.lineAt(L, s.a).kind)), caret = s.a + data.length;
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'type:' + k, sel: { k, a: caret, b: caret }, pend: /[km]/.test(m) ? { k, at: caret, m } : null });
}
// Bold, italic, underline, strikethrough, highlight, math, and blanks. With nothing selected it styles the word
// under the caret, or the next letters you type.
fmt(mark) {
  const e = this.ed, d = this.doc(), R = this.rich();
  if (mark === 'k' && d.ty !== 'Blank') return this.toBlank();
  const k = e.sel && this.live(e.sel.k) ? e.sel.k : this.firstField(d.ty);
  if (mark === 'k' && k !== 'text') return;
  const cloze = this.isCloze(k), L = this.lines(k), s = this.selIn(k);
  if (mark === 'list') return this.lineKind('li');
  let a = s.a, b = s.b;
  if (a === b) { const w = R.wordAt(L, a); if (w) [a, b] = w; }
  if (a === b) {
    const cur = e.pend && e.pend.k === k && e.pend.at === a ? e.pend.m : R.typingMarks(L, a, a);
    e.pend = { k, at: a, m: cur.includes(mark) ? cur.replace(mark, '') : cur + mark };
    e.sel = { k, a, b: a };
    e.restore = true;
    e.sig = '';
    return this.forceUpdate();
  }
  this.commit({ [k]: R.write(R.setMark(L, a, b, mark, !R.marksIn(L, a, b).includes(mark)), cloze) }, { kind: 'fmt', sel: s });
}
// Headings, bullets, and numbers for the lines you're on. Asking again turns them back into text.
lineKind(kind) {
  const e = this.ed, d = this.doc(), R = this.rich();
  const k = e.sel && this.live(e.sel.k) ? e.sel.k : this.firstField(d.ty), L = this.lines(k), s = this.selIn(k);
  this.commit({ [k]: R.write(R.setKind(L, s.a, s.b, kind && R.allKind(L, s.a, s.b, kind) ? '' : kind), this.isCloze(k)) }, { kind: 'fmt', sel: s });
}
// Make a blank on another kind of card turns it into a fill-in-the-blank card, with what you picked hidden.
toBlank() {
  const e = this.ed, d = this.doc(), R = this.rich();
  const src = e.sel && ['front', 'back', 'speak'].includes(e.sel.k) && this.live(e.sel.k) ? e.sel.k : 'front';
  const L = R.parse(d.f[src] || '', false), s = this.selIn(src);
  let a = s.a, b = s.b;
  if (a === b) { const w = R.wordAt(L, a); if (w) [a, b] = w; }
  const other = src === 'back' ? d.f.front : d.f.back, patch = { text: R.write(a < b ? R.setMark(L, a, b, 'k', true) : L, true) };
  if (R.plain(other || '').trim() && !R.plain(d.f.note || '').trim()) patch.note = other;
  this.commit(patch, { type: 'Blank', kind: 'fmt', sel: { k: 'text', a, b } });
}
// Add image and Add audio switch the card to that kind (and pick the image, or record).
media(kind) {
  const d = this.doc();
  if (kind === 'image') {
    if (d.ty !== 'Image') this.commit({}, { type: 'Image', kind: 'kind' });
    if (d.ty === 'Image' || !this.doc().f.image) this.pickImage();
    return;
  }
  if (d.ty !== 'Audio') return this.commit({}, { type: 'Audio', kind: 'kind' });
  this.toggleRecord();
}
pickImage() { (this.props.db || this.mock()).act.pickFile('image').then(url => url && this.commit({ image: url })); }
// ---------- Image occlusion ----------
// Drag on the picture to draw a box (or press Add a box). Pick a box to move it, pull a corner to resize it, and take it
// away with its × (or Delete). Undo steps back through all of it. While you drag, the box follows the pointer; letting
// go saves it as one step.
boxes() { const d = this.drag; return d && d.boxes ? d.boxes : this.doc().f.boxes || []; }
newBoxId() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
putBoxes(list, kind) { this.commit({ boxes: list.map(b => ({ ...b, x: +b.x.toFixed(4), y: +b.y.toFixed(4), w: +b.w.toFixed(4), h: +b.h.toFixed(4) })) }, { kind: kind || 'box' }); }
// With a mouse or trackpad, a new box goes straight to its answer; on a phone the keyboard waits until you tap it.
fine() { return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches; }
occRef() {
  return this.refFns.$occ || (this.refFns.$occ = el => {
    if (!el) return;
    this.occEl = el;
    if (el.__occ) return;
    el.__occ = true;
    el.addEventListener('pointerdown', ev => this.occDown(ev));
    el.addEventListener('pointermove', ev => this.occMove(ev));
    el.addEventListener('pointerup', ev => this.occUp(ev, false));
    el.addEventListener('pointercancel', ev => this.occUp(ev, true));
    el.addEventListener('dragstart', ev => ev.preventDefault());
  });
}
occDown(ev) {
  const el = this.occEl;
  // A phone moves a tap onto a button nearby (like a picked box's ×), so what's under the finger decides, and the ×
  // takes a box away only when the finger really went down on it.
  const pt = el && el.ownerDocument.elementFromPoint(ev.clientX, ev.clientY), at = pt && el.contains(pt) ? pt : ev.target;
  this.delDown = !!at.closest('[data-occ-del]');
  if (!el || this.delDown || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  ev.preventDefault();
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const list = this.doc().f.boxes || [], hit = at.closest('[data-occ-h]'), on = at.closest('[data-occ-box]'), sel = this.state.occSel;
  const d = hit && sel ? { kind: 'size', id: sel, corner: hit.getAttribute('data-occ-h') } : on ? { kind: 'move', id: on.getAttribute('data-occ-box') } : { kind: list.length < 30 ? 'draw' : 'none', id: this.newBoxId() };
  this.drag = { ...d, r, at: { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }, start: list, moved: false, pid: ev.pointerId, boxes: null };
  if (d.kind === 'move' && d.id !== sel) this.setState({ occSel: d.id });
  try { el.setPointerCapture(ev.pointerId); } catch (err) { /* the pointer is already gone */ }
}
occMove(ev) {
  const d = this.drag;
  if (!d || ev.pointerId !== d.pid || d.kind === 'none') return;
  const r = d.r, cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const p = { x: cl((ev.clientX - r.left) / r.width, 0, 1), y: cl((ev.clientY - r.top) / r.height, 0, 1) }, dx = p.x - d.at.x, dy = p.y - d.at.y;
  if (!d.moved && Math.abs(dx * r.width) < 4 && Math.abs(dy * r.height) < 4) return;
  d.moved = true;
  if (d.kind === 'draw') d.boxes = [...d.start, { id: d.id, x: Math.min(d.at.x, p.x), y: Math.min(d.at.y, p.y), w: Math.abs(dx), h: Math.abs(dy), label: '' }];
  else {
    const b = d.start.find(x => x.id === d.id);
    if (!b) return;
    let n;
    if (d.kind === 'move') n = { ...b, x: cl(b.x + dx, 0, 1 - b.w), y: cl(b.y + dy, 0, 1 - b.h) };
    else {
      // Pulling a corner keeps the opposite corner where it is; a box stays at least 14 points across.
      const mw = 14 / r.width, mh = 14 / r.height;
      let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      if (d.corner.includes('w')) x1 = cl(x1 + dx, 0, x2 - mw); else x2 = cl(x2 + dx, x1 + mw, 1);
      if (d.corner.includes('n')) y1 = cl(y1 + dy, 0, y2 - mh); else y2 = cl(y2 + dy, y1 + mh, 1);
      n = { ...b, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    d.boxes = d.start.map(x => (x.id === d.id ? n : x));
  }
  this.forceUpdate();
}
occUp(ev, cancel) {
  const d = this.drag;
  if (!d || ev.pointerId !== d.pid) return;
  this.drag = null;
  const drawn = d.kind === 'draw' && d.boxes ? d.boxes[d.boxes.length - 1] : null;
  // A tap on the picture, off the boxes, puts the picked box down; so does a drawing too small to be a box.
  if (cancel || !d.boxes || (drawn && (drawn.w * d.r.width < 12 || drawn.h * d.r.height < 12))) {
    if (!cancel && d.kind === 'draw' && this.state.occSel) this.setState({ occSel: null }); else this.forceUpdate();
    return;
  }
  if (drawn && this.fine()) this.ed.labelFocus = drawn.id;
  this.putBoxes(d.boxes);
  if (drawn) this.setState({ occSel: drawn.id });
}
// Add a box: in the middle, a little lower and to the right of any box already there.
addBox() {
  const list = this.doc().f.boxes || [], w = .26, h = .18;
  if (list.length >= 30) return;
  let x = .37, y = .41;
  while (list.some(b => Math.abs(b.x - x) < .02 && Math.abs(b.y - y) < .02) && y < .78) { x = Math.min(1 - w, x + .04); y += .04; }
  const id = this.newBoxId();
  if (this.fine()) this.ed.labelFocus = id;
  this.putBoxes([...list, { id, x, y, w, h, label: '' }]);
  this.setState({ occSel: id });
}
removeBox(id) {
  this.putBoxes((this.doc().f.boxes || []).filter(b => b.id !== id));
  if (this.state.occSel === id) this.setState({ occSel: null });
}
labelBox(id, label) { this.commit({ boxes: (this.doc().f.boxes || []).map(b => (b.id === id ? { ...b, label: String(label).slice(0, 200) } : b)) }, { kind: 'type:box' + id }); }
focusLabel(id) {
  const el = (this.occEl ? this.occEl.ownerDocument : document).querySelector('[data-occ-label="' + id + '"]');
  if (el) el.focus();
  return !!el;
}
placeLabel() { const id = this.ed.labelFocus; if (id) { this.ed.labelFocus = null; this.focusLabel(id); } }
// Keys for the picked box (not while typing): Delete or Backspace takes it away, the arrows nudge it (Shift for bigger
// steps), Esc puts it down. ⌘Z undoes on the picture too.
boxKey(ev) {
  const tg = ev.target, id = this.state.occSel;
  if (ev.defaultPrevented || ev.isComposing || this.doc().ty !== 'Image' || (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable="true"]'))) return;
  const mod = ev.metaKey || ev.ctrlKey, list = this.doc().f.boxes || [];
  if (mod && /^z$/i.test(ev.key) && (id || tg === this.occEl)) { ev.preventDefault(); return ev.shiftKey ? this.redo() : this.undo(); }
  if (!id || mod || ev.altKey || !list.some(b => b.id === id)) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return this.removeBox(id); }
  if (ev.key === 'Escape') { ev.preventDefault(); return this.setState({ occSel: null }); }
  const st = ev.shiftKey ? .05 : .01, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[ev.key];
  if (!m) return;
  ev.preventDefault();
  this.putBoxes(list.map(b => (b.id === id ? { ...b, x: Math.min(1 - b.w, Math.max(0, b.x + m[0])), y: Math.min(1 - b.h, Math.max(0, b.y + m[1])) } : b)), 'type:nudge' + id);
}
toggleRecord() {
  const db = this.props.db || this.mock();
  if (this.state.recording) { this.setState({ recording: false }); db.act.record(); return; }
  this.setState({ recording: true });
  db.act.record().then(url => { this.setState({ recording: false }); if (url) this.commit({ audio: url }); });
}
renderVals() {
  ${T}${DB_JS}
  ${KB_JS}
  ${SW_JS}
  ${TAG_JS}
  const s = this.state, e = this.ed, R = this.rich();
  // The canvas's / menu board: the menu open on a new line of the sample card.
  if (this.props.slashDemo && !e.demoDone) {
    e.demoDone = true;
    const front = String(this.doc().f.front || '') + '\\n/', at = R.size(R.parse(front)) - 1;
    e.edits = { ...e.edits, front };
    e.sel = { k: 'front', a: at + 1, b: at + 1 };
    e.slash = { k: 'front', at, idx: 0, q: '', pos: { x: '34px', y: '329px' }, demo: true };
  }
  const { saved, ty, f } = this.doc();
  // A saved box's card opens with its box picked (the canvas shows box 1 picked).
  if (!('occSel' in s)) s.occSel = db.mock ? 'b1' : saved && saved.box != null ? saved.box : null;
  const kinds = { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' };
  const put = patch => this.commit(patch);
  const dk = db.deck(this.props.deckId), tags = f.tags || [];
  const pick2 = (list, cur, set) => list.map(([id, label]) => ({ label, pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => set(id) }));
  // Each field, drawn with its formatting. The ring shows which one you're typing in.
  const ro = { t, dark: !!this.props.dark };
  const field = (k, cloze) => ({ lines: R.editView(f[k] || '', { ...ro, cloze }), empty: String(f[k] || '') === '' ? 'true' : 'false', ref: this.refFor(k), key: k + e.key,
    ring: s.typing && s.focus === k ? 'inset 0 0 0 2px ' + t.text : 'none' });
  const rich = { front: field('front'), back: field('back'), text: field('text', ty === 'Blank'), note: field('note'), speak: field('speak') };
  const nBlanks = R.blanks(f.text || '').length;
  const kind = kinds[ty], fr = R.plain(f.front || '').trim(), bk = R.plain(f.back || '').trim(), said = R.plain(f.speak || '').trim();
  const hasSound = (f.audio && f.audio !== 'mock') || said;
  // Image occlusion: the boxes as they are now (while one is dragged, where it is), the picked one, and each one's answer.
  // A picture with boxes needs no Answer: each box's label is its card's answer.
  const bx = this.boxes(), picked = bx.some(b => b.id === s.occSel) ? s.occSel : null, pct = v => +(v * 100).toFixed(3) + '%';
  const tint = this.props.dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)';
  const occ = { ref: this.occRef(), has: bx.length > 0, none: !bx.length, canAdd: !!f.image && bx.length < 30, tip: !!f.image && f.image !== 'mock' && !bx.length,
    hint: f.occ === 'all' ? 'Every box stays hidden while one is asked.' : 'Only the box being asked is hidden.',
    // The picked box sits on top of the others, so its corners can always be reached.
    boxes: bx.map((b, i) => { const on = b.id === picked; return { id: b.id, n: String(i + 1), num: on ? '' : String(i + 1), sel: on, pressed: on ? 'true' : 'false', z: on ? '2' : '1',
      x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h), bg: on ? tint : t.surf2, fg: t.text, ring: on ? 'inset 0 0 0 2px ' + t.inv + ', 0 0 0 2px ' + t.bg : '0 0 0 2px ' + t.bg,
      // The × floats over the middle of the box, clear of its corners: above it, or below it near the picture's top
      // (inside a box that fills the picture's height).
      delAt: b.y >= .16 ? 'left: 50%; margin-left: -12px; bottom: calc(100% + 8px);' : b.y + b.h <= .84 ? 'left: 50%; margin-left: -12px; top: calc(100% + 8px);' : 'right: 8px; top: 8px;',
      rowRing: on ? 'inset 0 0 0 2px ' + t.text : 'none', chip: on ? t.inv : t.bg, chipFg: on ? t.invText : t.text, label: b.label || '',
      pick: () => { if (this.state.occSel !== b.id) this.setState({ occSel: b.id }); },
      remove: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); this.removeBox(b.id); },
      del: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (ev && ev.detail > 0 && !this.delDown) return; this.delDown = false; this.removeBox(b.id); },
      setLabel: ev => this.labelBox(b.id, ev && ev.target ? ev.target.value : ''),
      // Return goes on to the next box's answer.
      key: ev => { if (!ev || ev.key !== 'Enter' || ev.isComposing) return; ev.preventDefault(); const nx = bx[i + 1]; if (!nx || !this.focusLabel(nx.id)) ev.target.blur(); } }; }) };
  const missing = kind === 'basic' ? (!fr ? 'front' : !bk ? 'back' : '') : kind === 'cloze' ? (nBlanks ? '' : 'text') : kind === 'image' ? (!f.image ? 'image' : bx.length || bk ? '' : 'back') : (!hasSound ? 'speak' : !bk ? 'back' : '');
  // Back goes where you came from: the review, the Library's All cards, or the deck.
  const backHref = this.props.from === 'review' ? db.href('review', dk.id) : this.props.from === 'library' ? db.href('cards') : dk.href;
  const snd = f.audio === 'mock' ? { mock: true, real: false, btn: t.inv } : { mock: false, real: true, btn: hasSound ? t.inv : t.surf2, fg: hasSound ? t.text : t.muted,
    label: f.audio ? 'Your recording' : said ? 'Reads: “' + said + '”' : 'No sound yet. Record one, upload a file, or have it read aloud.' };
  // Formatting buttons: which are on, and what each does.
  const on = this.pressed();
  e.sig = JSON.stringify(on);
  const marks = { b: 'b', i: 'i', u: 'u', s: 's', hl: 'h', blank: 'k', list: 'list', math: 'm' };
  const acts = { b: () => this.fmt('b'), i: () => this.fmt('i'), u: () => this.fmt('u'), s: () => this.fmt('s'), hl: () => this.fmt('h'), blank: () => this.fmt('k'), list: () => this.fmt('list'),
    math: () => this.fmt('m'), img: () => this.media('image'), audio: () => this.media('audio'), undo: () => this.undo() };
  const fmt = Object.fromEntries(Object.entries(acts).map(([k, fn]) => { const x = !!on[marks[k]]; return [k, { pressed: x ? 'true' : 'false', bg: x ? kb.on : 'transparent', webBg: x ? t.bg : 'transparent', webSh: x ? '0 1px 3px rgba(0,0,0,.14)' : 'none', toggle: fn }]; }));
  // The / menu, when it's open.
  const sv = this.slashView(), sl = e.slash;
  const slash = { on: !!(sv && sl.pos), x: sl && sl.pos ? sl.pos.x : '0px', y: sl && sl.pos ? sl.pos.y : '0px',
    items: sv ? sv.items.map((it, n) => ({ label: it.label, hint: it.hint, g: it.g || '', list: it.icon === 'list', bracket: it.icon === 'bracket', sqrt: it.icon === 'sqrt', image: it.icon === 'image', mic: it.icon === 'mic',
      sel: n === sl.idx ? 'true' : 'false', bg: n === sl.idx ? t.surf : 'transparent', chip: n === sl.idx ? t.bg : t.surf, pick: () => this.slashPick(it.id) })) : [] };
  return {
    t, kb, dark: !!this.props.dark, dim: !!this.props.dim, typing: s.typing, deckId: this.props.deckId || '',
    // The iPhone editor's keyboard is drawn on the canvas; in the app the phone shows its own.
    drawKb: s.typing && !!db.mock,
    title: saved ? 'Edit card' : 'New card', deckName: dk.name, backHref, f, rich, slash,
    // On the canvas the iPhone editor goes back to the iPhone deck page.
    phoneBack: db.mock ? 'PhoneDeck.dc.html' : backHref,
    isBasic: ty === 'Basic', isCloze: ty === 'Blank', isImage: ty === 'Image', isAudio: ty === 'Audio',
    types: ['Basic', 'Blank', 'Image', 'Audio'].map(l => ({ label: l, bg: l === ty ? t.bg : 'transparent', fg: l === ty ? t.text : t.muted, sh: l === ty ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => this.commit({}, { type: l, kind: 'kind' }) })),
    bars: ${WAVE_SMALL}.map(h => ({ h: h + 'px' })),
    hideKeyboard: () => this.setState({ typing: false }),
    // Pressing a formatting button leaves the caret in the field.
    keepFocus: ev => { if (ev && ev.preventDefault) ev.preventDefault(); },
    // Formatting bar over the keyboard. Aa swaps in the text styles.
    fmtMain: !s.styles, fmtStyles: s.styles,
    openStyles: () => this.setState({ styles: true }), closeStyles: () => this.setState({ styles: false }),
    fmt,
    // Fill in the blank: one card per blank, or one card with every blank.
    clozeModes: pick2([['each', 'One card per blank · ' + nBlanks], ['one', 'One card, all blanks']], f.clozeMode || 'each', id => put({ clozeMode: id })),
    // Image cards: hide only the box being asked, or every box.
    occModes: pick2([['one', 'Hide one'], ['all', 'Hide all']], f.occ === 'all' ? 'all' : 'one', id => put({ occ: id })),
    img: { mock: f.image === 'mock', url: f.image && f.image !== 'mock' ? f.image : '', none: !f.image, some: !!f.image },
    occ, addBox: () => this.addBox(),
    pickImage: () => this.pickImage(),
    snd, recLabel: s.recording ? 'Stop' : 'Record',
    toggleRecord: () => this.toggleRecord(),
    pickAudio: () => db.act.pickFile('audio').then(url => url && put({ audio: url })),
    playAudio: () => (f.audio && f.audio !== 'mock' ? db.act.play(f.audio) : db.act.speak(said, f.lang)),
    speakOn: !!s.speakOpen || !!said, toggleSpeak: () => this.setState({ speakOpen: !s.speakOpen }),
    autoSw: sw(f.auto !== false), toggleAuto: () => put({ auto: f.auto === false }), noop: () => {},
    // A card can have any number of tags.
    cardTags: tags.map(g => ({ ...tagChip(g), remove: () => put({ tags: tags.filter(x => x !== g) }) })),
    // Opening the picker puts the keyboard away.
    cardPick: (() => { const q = tagPicker(tags, next => put({ tags: next }), 'cp', db.mock ? null : db.tags()); return { ...q, toggle: () => this.setState({ cpOpen: !q.open, cpQ: '', typing: false }) }; })(),
    canDelete: !!saved, remove: () => db.act.deleteCard(saved.id, backHref),
    save: ev => {
      if (db.mock) return;
      ev.preventDefault();
      if (missing === 'image') return this.pickImage();
      if (missing) return this.focusField(missing);
      db.act.saveCard(saved ? saved.id : null, dk.id, { kind, front: f.front, back: f.back, text: f.text, note: f.note, tags, image: f.image || null, audio: f.audio || null, speak: f.speak || '', auto: f.auto !== false, clozeMode: f.clozeMode || 'each',
        ...(kind === 'image' ? { boxes: f.boxes || [], occ: f.occ === 'all' ? 'all' : 'one' } : {}) }, backHref);
    }
  };
}`;

// ---------- Review (shared by web + phone) ----------
const WAVE = (h) => `<div style="display: flex; align-items: center; gap: 3px; height: ${h}px;"><sc-for list="{{bars}}" as="b" hint-placeholder-count="44"><div data-anim="1" style="width: 3px; border-radius: 2px; background: {{t.text}}; height: {{b.h}}; animation: {{b.anim}};"></div></sc-for></div>`;
// A picture with boxes fills the card: the picture as big as it fits (its shape is known once it loads), the question
// under it, and the answer (the box's label), which shows as the box fades to an outline.
const occFace = big => `<sc-if value="{{card.isOcc}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${big ? 14 : 12}px;">
  <div style="flex: 0 1 auto; min-height: 0; width: 100%; aspect-ratio: {{card.occRatio}}; container-type: size; display: flex; align-items: center; justify-content: center;">
    <div role="img" aria-label="{{card.occAlt}}" style="position: relative; width: min(100cqw, calc(100cqh * {{card.occRatio}})); aspect-ratio: {{card.occRatio}}; visibility: {{card.occVis}};">
      <sc-if value="{{card.imageMock}}" hint-placeholder-val="{{ true }}">${CELL('100%', '100%', false)}</sc-if>
      <sc-if value="{{card.imageUrl}}" hint-placeholder-val="{{ false }}"><img src="{{card.imageUrl}}" alt="" draggable="false" style="position: absolute; inset: 0; width: 100%; height: 100%; border-radius: ${big ? 16 : 14}px;"></sc-if>
      ${OCC_BOXES('card.occ', big ? 13 : 12)}
    </div>
  </div>
  <div style="font-size: ${big ? 22 : 18}px; font-weight: 500; line-height: 1.3; text-align: center;">${RICH_SHOW('card.occAsk')}</div>
  <sc-if value="{{card.hasOccLabel}}" hint-placeholder-val="{{ true }}"><div class="{{card.occLabelCls}}" style="visibility: {{card.occLabelVis}}; font-size: ${big ? 30 : 24}px; font-weight: 600; letter-spacing: -.02em; line-height: 1.2; text-align: center;">{{card.occLabel}}</div></sc-if>
</div></sc-if>`;
const faceFront = big => `${occFace(big)}
<sc-if value="{{card.isBasic}}" hint-placeholder-val="{{ true }}"><div style="font-size: ${big ? 38 : 28}px; font-weight: 500; line-height: 1.25; letter-spacing: -.02em;">${RICH_SHOW('card.frontLines')}</div></sc-if>
<sc-if value="{{card.isCloze}}" hint-placeholder-val="{{ false }}"><div style="font-size: ${big ? 38 : 28}px; font-weight: 500; line-height: 1.45; letter-spacing: -.02em;">${RICH_CLOZE('card.lines', `display: inline-block; padding: 0 ${big ? 16 : 12}px; border-radius: 999px; line-height: 1.3; background: {{blank.bg}}; color: {{blank.fg}}; transition: background-color .3s ease, color .3s ease;`, '{{blank.cls}}')}</div></sc-if>
<sc-if value="{{card.isImage}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; align-items: center; gap: 16px;"><sc-if value="{{card.imageMock}}" hint-placeholder-val="{{ true }}">${CELL(big ? 330 : 260, big ? 225 : 178)}</sc-if><sc-if value="{{card.imageUrl}}" hint-placeholder-val="{{ false }}"><img src="{{card.imageUrl}}" alt="" style="max-width: 100%; max-height: ${big ? 250 : 200}px; border-radius: 16px; object-fit: contain;"></sc-if><div style="font-size: ${big ? 24 : 20}px; font-weight: 500;">${RICH_SHOW('card.frontLines')}</div></div></sc-if>
<sc-if value="{{card.isAudio}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; align-items: center; gap: 24px;"><span role="button" aria-label="Play the sound" onClick="{{playSound}}" style="width: ${big ? 88 : 76}px; height: ${big ? 88 : 76}px; border-radius: 50%; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center;">${svg(I.play, 30)}</span>${WAVE(48)}<div style="font-size: ${big ? 24 : 20}px; font-weight: 500;">${RICH_SHOW('card.frontLines')}</div></div></sc-if>`;
const faceBack = big => `
<sc-if value="{{card.isBasic}}" hint-placeholder-val="{{ true }}"><div style="font-size: ${big ? 32 : 24}px; font-weight: 500; line-height: 1.3; letter-spacing: -.015em;">${RICH_SHOW('card.backLines')}</div></sc-if>
<sc-if value="{{card.isImage}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; align-items: center; gap: 16px;"><sc-if value="{{card.imageMock}}" hint-placeholder-val="{{ true }}">${CELL(big ? 330 : 260, big ? 225 : 178)}</sc-if><sc-if value="{{card.imageUrl}}" hint-placeholder-val="{{ false }}"><img src="{{card.imageUrl}}" alt="" style="max-width: 100%; max-height: ${big ? 250 : 200}px; border-radius: 16px; object-fit: contain;"></sc-if><div style="font-size: ${big ? 32 : 26}px; font-weight: 600; letter-spacing: -.02em;">${RICH_SHOW('card.labelLines')}</div></div></sc-if>
<sc-if value="{{card.isAudio}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><div style="font-size: ${big ? 64 : 52}px; font-weight: 600; letter-spacing: -.02em;">${RICH_SHOW('card.bigLines')}</div><div style="font-size: ${big ? 22 : 18}px; color: {{t.muted}};">${RICH_SHOW('card.subLines')}</div></div></sc-if>`;
// Card view fields: each text as lines with its formatting (blanks hidden until shown), plus image and sound flags.
// The canvas's sample blanks come as before / blank / after; real cards have their text.
const CARD_VIEW_JS = `const R = this.rich(), ro = { t, dark: !!this.props.dark };
  ${OCC_JS}
  // A picture's shape (width / height), learned once it loads, so its boxes sit right on it.
  const ratioOf = url => {
    const RT = Component._ratio || (Component._ratio = {});
    if (url === 'mock') return 220 / 150;
    if (!(url in RT)) { RT[url] = 0; const im = new Image(); im.onload = () => { RT[url] = im.naturalWidth / im.naturalHeight || 4 / 3; this.forceUpdate(); }; im.onerror = () => { RT[url] = 4 / 3; this.forceUpdate(); }; im.src = url; }
    return RT[url];
  };
  const cardView = (c, rev) => {
    const show = md => R.view(md || '', ro);
    const text = c.text != null ? c.text : (c.before || '') + ' [[' + (c.back || '') + ']] ' + (c.after || '');
    // A picture with boxes asks one box (c.box); a picture without is a plain image card, as before.
    const oi = c.kind === 'image' && c.image && Array.isArray(c.boxes) ? c.boxes.findIndex(b => b.id === c.box) : -1, ob = oi < 0 ? null : c.boxes[oi], ratio = ob ? ratioOf(c.image) : 0;
    return { ...c, isBasic: c.kind === 'basic', isCloze: c.kind === 'cloze', isImage: c.kind === 'image' && !ob, isOcc: !!ob, isAudio: c.kind === 'audio',
      occ: ob ? occView(c.boxes, oi, c.occ, rev, { ask: t.inv, askText: t.invText, cover: t.surf2, coverText: t.muted, ring: t.bg }) : [],
      occAsk: ob ? show(R.plain(c.front || '').trim() ? c.front : 'What’s under box ' + (oi + 1) + '?') : [], occRatio: String(+(ratio || 4 / 3).toFixed(4)), occVis: ratio ? 'visible' : 'hidden',
      occLabel: ob ? ob.label || '' : '', hasOccLabel: !!(ob && ob.label), occLabelCls: rev ? 'sc-fade-a' : '', occLabelVis: rev ? 'visible' : 'hidden',
      occAlt: ob ? 'The picture, with box ' + (oi + 1) + (rev ? ' showing' : ' hidden') : '',
      lines: c.kind === 'cloze' ? R.view(text, { ...ro, cloze: true, ask: c.cloze == null ? -1 : c.cloze, hide: !rev }) : [],
      frontLines: show(c.front), backLines: show(c.back), noteLines: show(c.note),
      imageMock: c.image === 'mock', imageUrl: c.image && c.image !== 'mock' ? c.image : '',
      labelLines: show(c.backLabel || c.back), bigLines: show(c.backBig || c.back), subLines: show(c.backSub != null ? c.backSub : c.note) };
  };`;
const BLANK_JS = `rev ? { text: c.back, bg: t.inv, fg: t.invText, cls: 'sc-pop' } : { text: '\\u2003\\u2003\\u2003\\u2003', bg: t.surf2, fg: 'transparent', cls: '' }`;
const REVIEW_LOGIC = total => `
constructor(props) { super(props); this.state = { revealed: !!props.startRevealed, settings: null, pileDraft: props.newPileOpen ? 'Tricky ones' : null, exOpen: !!props.explainOpen, exFor: props.explainOpen ? 'r0' : null }; }
renderVals() {
  ${T}${DB_JS}
  ${KB_JS}
  ${CARD_VIEW_JS}
  ${STUDY_BG_JS}
  ${EXPLAIN_JS}
  const rv = db.review(this.props.deckId, this.props.pile);
  const rev = this.state.revealed;
  const ex = explainView(rv.ex, rv.card && rv.card.id, '', rev, ${JSON.stringify('It pumps protons (H⁺) out of the matrix into the space between the two membranes. That builds a gradient, like water held behind a dam, and ATP synthase uses the flow back in to make ATP. Remember it as pump uphill first, then cash in on the way down.')});
  // Behind the cards: the background of the deck this card is from.
  const bg = studyBg(db.deck(rv.deckId), !!this.props.dark, !!this.props.dim);
  const c = rv.card || { kind: 'basic', front: '', back: '' };
  const card = cardView(c, rev);
  const after = patch => this.setState({ revealed: false, moved: true, ...(patch || {}) });
  const grade = g => () => { after(); db.act.grade(c.id, g); };
  const seg = (id, cur) => ({ pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  // Grading style: four grades, a simple check / x, or piles the learner names. It's saved with the deck.
  const mode = rv.mode;
  const modes = [['four', 'Forgot · Hard · Good · Easy', '4 grades'], ['binary', 'Check or X', '✓ / ✗'], ['piles', 'Piles', 'Piles']].map(([id, long, short]) => ({ label: short, long, ...seg(id, mode), pick: () => db.act.updateDeck(rv.deckId, { grading: id }) }));
  // FSRS (set per deck in Deck settings) schedules the four grades and check / x; piles only sort cards.
  const fsrsOn = rv.fsrsOn, iv = rv.iv;
  const grades = [['Forgot', 'again', '1'], ['Hard', 'hard', '2'], ['Good', 'good', '3'], ['Easy', 'easy', '4']]
    .map(([label, k, key], i) => ({ label, key, color: t[k], gap: iv[k], interval: fsrsOn ? iv[k] : '', sub: fsrsOn ? iv[k] + ' · ' + key : key, pick: grade(i + 1) }));
  // Piles are named by the learner. They sort cards; they don't schedule them.
  const pileList = rv.piles;
  const piles = pileList.map((p, i) => ({ ...p, count: String(p.n), key: String(i + 1), pick: () => { after(); db.act.pile(c.id, p.name); } }));
  const draft = this.state.pileDraft;
  const done = rv.done, leftN = rv.left, tot = Math.max(1, rv.total);
  const r = this.props.radius ?? 32;
  // Progress style: a bar, Anki-style queue counts (new · learning · review), or nothing at all.
  const prog = rv.prog;
  const settingsOpen = this.state.settings ?? !!this.props.settingsOpen;
  const progs = [['bar', 'Bar'], ['counts', 'Counts'], ['none', 'None']].map(([id, label]) => ({ label, long: label, ...seg(id, prog), pick: () => db.act.setSettings({ prog: id }) }));
  const queue = rv.queue, n = rv.counts;
  const u = q => (queue === q ? 'underline' : 'none');
  const playing = card.isAudio && !rev;
  return {
    t, bg, ex, kb, card, grades, piles, modes, progs,
    showBar: prog === 'bar', showCounts: prog === 'counts',
    cNew: { n: String(n.new), u: u('new') }, cLearn: { n: String(n.learn), u: u('learn') }, cRev: { n: String(n.rev), u: u('rev') },
    countsLabel: n.new + ' new, ' + n.learn + ' learning, ' + n.rev + ' to review',
    progHint: { bar: 'A thin bar and how many cards are left.', counts: 'New · learning · review, like Anki. The current card’s queue is underlined.', none: 'Nothing on screen but the card.' }[prog],
    settingsOpen, settingsExpanded: settingsOpen ? 'true' : 'false',
    settingsBtnBg: settingsOpen ? t.inv : t.surf, settingsBtnFg: settingsOpen ? t.invText : t.text,
    toggleSettings: () => this.setState({ settings: !settingsOpen }),
    knew: { label: 'Knew it', title: fsrsOn ? 'Knew it · ' + iv.good : 'Knew it', pick: grade(3) }, missed: { label: 'Didn’t know', title: fsrsOn ? 'Didn’t know · ' + iv.again : 'Didn’t know', pick: grade(1) },
    canAddPile: pileList.length < 5,
    // The iPhone's New pile shows a keyboard drawn on the canvas; in the app the phone shows its own.
    newPileOpen: draft != null, pileName: draft || '', drawKb: !!db.mock,
    openPile: () => this.setState({ pileDraft: '' }),
    setPileName: e => this.setState({ pileDraft: e && e.target ? e.target.value : draft }),
    cancelPile: () => this.setState({ pileDraft: null }),
    savePile: () => { this.setState({ pileDraft: null }); db.act.addPile(rv.deckId, (draft || '').trim() || 'Pile ' + (pileList.length + 1)); },
    left: String(leftN), position: String(done),
    progress: Math.round(done / tot * 100) + '%',
    radius: r + 'px',
    revealed: rev,
    showFour: rev && mode === 'four', showBinary: rev && mode === 'binary', showPiles: rev && mode === 'piles',
    // Fill-in-the-blank cards and pictures with boxes stay put: the blank fills in with a pop, or the box fades to an
    // outline, instead of the card flipping.
    flipTransform: rev && !card.isCloze && !card.isOcc ? 'rotateY(180deg)' : 'rotateY(0deg)',
    // After a grade the next card shows up fresh with a small lift, instead of spinning back to its front.
    flipTrans: this.state.moved ? 'none' : 'transform .5s cubic-bezier(.4,0,.2,1)', cardIn: this.state.moved ? (done % 2 ? 'sc-in-a' : 'sc-in-b') : '',
    flipLabel: card.isCloze ? (rev ? 'Hide the answer' : 'Show the blank') : card.isOcc ? (rev ? 'Hide the answer' : 'Show what’s under the box') : (rev ? 'Flip back' : 'Flip card'),
    // The note under a card that stays put (clozeShown: fill in the blank, or a picture with boxes) shows with the answer.
    clozeShown: rev && (card.isCloze || card.isOcc),
    blank: ${BLANK_JS},
    reveal: () => this.setState({ revealed: !rev, moved: false }),
    undo: () => { if (done > 0 || !db.mock) { this.setState({ revealed: true, moved: false }); db.act.undo(); } },
    editHref: rv.editHref,
    playSound: e => { if (e && e.stopPropagation) e.stopPropagation(); if (c.audio && c.audio !== 'mock') db.act.play(c.audio); else if (c.speak) db.act.speak(c.speak, c.lang); },
    bars: ${WAVE_BIG}.map((h, i) => ({ h: h + 'px', anim: playing ? 'scWave .9s ease-in-out ' + ((i % 5) * 0.12).toFixed(2) + 's infinite alternate' : 'none' }))
  };
}`;
const progSeg = `<div role="group" aria-label="Progress style" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
  <sc-for list="{{progs}}" as="m" hint-placeholder-count="3">
    <button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" style="height: 34px; padding: 0 8px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button>
  </sc-for>
</div>`;
// Anki-style counts: new (blue) · learning (red) · review (green); the current card's queue is underlined.
const COUNTS = small => `<span role="status" aria-label="{{countsLabel}}" style="display: flex; align-items: center; gap: ${small ? 12 : 16}px; font-family: ${MONO}; font-size: ${small ? 15 : 16}px; font-weight: 600;">${[['cNew', 'easy'], ['cLearn', 'again'], ['cRev', 'good']].map(([k, c]) => `<span style="color: {{t.${c}}}; text-decoration: {{${k}.u}}; text-decoration-thickness: 2px; text-underline-offset: 5px;">{{${k}.n}}</span>`).join('')}</span>`;
const settingsBtn = `<button type="button" onClick="{{toggleSettings}}" aria-label="Review settings" title="Review settings" aria-expanded="{{settingsExpanded}}" style="width: 44px; height: 44px; flex-shrink: 0; border: 0; border-radius: 22px; background: {{settingsBtnBg}}; color: {{settingsBtnFg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.sliders, 18, 2)}</button>`;
const settingsGroups = `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Grade with</span>${modeSeg(true)}</div>
      <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Progress</span>${progSeg}<span style="font-size: 12px; line-height: 1.4; color: {{t.muted}};">{{progHint}}</span></div>`;
// Check / x: two big answers.
const binaryBtns = phoneSize => ['missed', 'knew'].map(k => `<button type="button" onClick="{{${k}.pick}}" aria-label="{{${k}.label}}" title="{{${k}.title}}" data-key="${k === 'knew' ? 2 : 1}" style="width: ${phoneSize ? 68 : 76}px; height: ${phoneSize ? 68 : 76}px; flex-shrink: 0; border: 0; border-radius: 50%; background: {{t.${k === 'knew' ? 'good' : 'again'}}}; color: {{t.bg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[k === 'knew' ? 'check' : 'close'], phoneSize ? 28 : 30, 2.8)}</button>`).join('\n    ');
// Piles: plain tiles with a count and a name; the last tile opens the New pile popup.
const pileTiles = phoneSize => `<sc-for list="{{piles}}" as="p" hint-placeholder-count="3">
      <button type="button" onClick="{{p.pick}}" aria-label="Put in {{p.name}}" data-key="{{p.key}}" style="flex: 1 1 0; min-width: 0; position: relative; padding: 0; border: 0; background: transparent; font: inherit; color: inherit; cursor: pointer;">
        <span style="position: absolute; inset: 0; box-sizing: border-box; border-radius: ${phoneSize ? 20 : 24}px; background: {{t.surf}}; display: flex; ${phoneSize ? 'flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; padding: 0 12px;' : 'align-items: center; gap: 14px; padding: 0 18px;'}">
          <span style="font-size: ${phoneSize ? 22 : 28}px; font-weight: 600; letter-spacing: -.03em; line-height: 1;">{{p.count}}</span>
          <span style="min-width: 0; max-width: 100%; font-size: ${phoneSize ? 13 : 15}px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;${phoneSize ? '' : ' flex-grow: 1; text-align: left;'}">{{p.name}}</span>${phoneSize ? '' : `
          <span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{p.key}}</span>`}
        </span>
      </button>
    </sc-for>
    <sc-if value="{{canAddPile}}" hint-placeholder-val="{{ true }}">
      <button type="button" onClick="{{openPile}}" aria-label="New pile" aria-haspopup="dialog" style="width: ${phoneSize ? 52 : 92}px; flex-shrink: 0; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: ${phoneSize ? 20 : 24}px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">${svg(I.plus, 16, 2.2)}${phoneSize ? '' : 'New pile'}</button>
    </sc-if>`;
const FACE = (pad, big, back) => `<div style="position: absolute; inset: 0; box-sizing: border-box; padding: ${pad}; display: flex; flex-direction: column; text-align: left; background: {{t.card}}; border: 1px solid {{t.line}}; border-radius: {{radius}}; box-shadow: {{t.shadow}}; backface-visibility: hidden; -webkit-backface-visibility: hidden;${back ? ' transform: rotateY(180deg);' : ''}">
  <div style="min-height: 21px;"></div>
  <div style="position: relative; display: flex; flex-direction: column; justify-content: center; flex-grow: 1;">${back ? faceBack(big) : faceFront(big)}</div>
  <div style="font-size: 14px; line-height: 1.5; color: {{t.muted}}; min-height: 21px;">${back ? RICH_SHOW('card.noteLines') : `<sc-if value="{{clozeShown}}" hint-placeholder-val="{{ false }}"><span class="sc-fade-a" style="display: block;">${RICH_SHOW('card.noteLines')}</span></sc-if>`}</div>
</div>`;
// Explain (V96): once a card is turned over, its corner offers an AI explanation of the answer, which opens over the
// card. It shows only when Lucida's AI is set up (or the card already has one); Free gets a few a day.
const explainOver = phone => `<sc-if value="{{ex.show}}" hint-placeholder-val="{{ false }}">
  <sc-if value="{{ex.closed}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{ex.ask}}" class="sc-press" style="position: absolute; top: ${phone ? 12 : 16}px; right: ${phone ? 12 : 16}px; z-index: 3; height: 34px; padding: 0 14px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.sparkle, 14, 2)}{{ex.label}}</button></sc-if>
  <sc-if value="{{ex.open}}" hint-placeholder-val="{{ false }}"><div role="region" aria-label="Explanation" class="sc-quiz-in" style="position: absolute; left: ${phone ? 10 : 16}px; right: ${phone ? 10 : 16}px; bottom: ${phone ? 10 : 16}px; z-index: 3; max-height: 72%; overflow-y: auto; box-sizing: border-box; padding: ${phone ? '14px 16px' : '18px 20px'}; border-radius: 20px; background: {{t.bg}}; box-shadow: 0 18px 44px -14px rgba(0,0,0,.4), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 8px; text-align: left; animation: scQuizIn .25s cubic-bezier(.2,.8,.2,1) both;">
    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: {{t.muted}};">${svg(I.sparkle, 13, 2)}<span style="flex-grow: 1;">Explained by AI</span><button type="button" onClick="{{ex.close}}" aria-label="Close the explanation" style="width: 28px; height: 28px; border: 0; border-radius: 14px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.4)}</button></div>
    <sc-if value="{{ex.busy}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; color: {{t.muted}};">Thinking…</span></sc-if>
    <sc-if value="{{ex.hasText}}" hint-placeholder-val="{{ true }}"><span style="font-size: ${phone ? 15 : 17}px; line-height: 1.5;">{{ex.text}}</span></sc-if>
    <sc-if value="{{ex.hasError}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{ex.error}}</span><sc-if value="{{ex.goPro}}" hint-placeholder-val="{{ false }}"><a href="{{ex.proHref}}" style="align-self: flex-start; height: 34px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 13px; font-weight: 600;">Go Pro</a></sc-if></sc-if>
    <sc-if value="{{ex.hasNote}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: {{t.muted}};">{{ex.note}}</span></sc-if>
  </div></sc-if>
</sc-if>`;
// The explanation's state for a screen (review or Learn): `exv` is db's view of it, `id` the card, `question` how it
// was asked, `answered` whether the answer is showing.
const EXPLAIN_JS = `const explainView = (exv, id, question, answered, sample) => {
    exv = db.mock ? { on: true, text: this.state.exMock || this.props.explained ? sample : '', note: this.state.exMock || this.props.explained ? '2 free explanations left today' : '' } : exv || { on: false };
    const open = !!this.state.exOpen && this.state.exFor === id;
    return { show: !!(answered && exv.on && id), closed: !open, open, label: exv.text ? 'Explanation' : 'Explain',
      busy: !!exv.busy, hasText: !!exv.text && !exv.busy, text: exv.text || '', hasError: !!exv.error && !exv.busy, error: exv.error || '', goPro: !!exv.goPro,
      proHref: db.mock ? 'Pricing.dc.html' : 'https://lucida.cards/pricing', hasNote: !!exv.note && !!exv.text, note: exv.note || '',
      ask: () => { this.setState({ exOpen: true, exFor: id }); if (db.mock) this.setState({ exMock: true }); else if (!exv.text) db.act.explain(id, question); },
      close: () => this.setState({ exOpen: false }) };
  };`;
const flipCard = (w, h, pad, big) => `<button type="button" onClick="{{reveal}}" aria-label="{{flipLabel}}" data-key="Space" class="{{cardIn}}" style="width: ${w}; height: ${h}; padding: 0; border: 0; background: transparent; perspective: 1600px; font: inherit; color: inherit; cursor: pointer; flex-grow: ${h === 'auto' ? 1 : 0};">
  <div style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: {{flipTrans}}; transform: {{flipTransform}};">
    ${FACE(pad, big, false)}
    ${FACE(pad, big, true)}
  </div>
</button>`;
const webReview = `<div style="position: relative; isolation: isolate; width: 1440px; height: 900px; box-sizing: border-box; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  ${studyBgLayer}
  <header style="height: 76px; box-sizing: border-box; padding: 0 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px;">
    <div style="display: flex;"><a href="WebDone.dc.html" aria-label="End review" title="End review" style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2.2)}</a></div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; min-width: 420px; min-height: 24px;">
      <sc-if value="{{showBar}}" hint-placeholder-val="{{ true }}"><div style="width: 360px; height: 6px; border-radius: 3px; background: {{t.surf}}; overflow: hidden;"><div style="height: 6px; border-radius: 3px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);"></div></div><span style="font-family: ${MONO}; font-size: 13px; color: {{t.muted}};">{{left}} left</span></sc-if>
      <sc-if value="{{showCounts}}" hint-placeholder-val="{{ false }}">${COUNTS(false)}</sc-if>
    </div>
    <div style="display: flex; justify-content: flex-end;">${settingsBtn}</div>
  </header>
  <main style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px;">
    <div style="position: relative; width: 780px; height: 480px;">${flipCard('780px', '480px', '44px 56px', true)}${explainOver(false)}</div>
    <div style="width: 780px; height: 84px; display: flex;">
      <sc-if value="{{showBinary}}" hint-placeholder-val="{{ false }}">
        <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 56px;">
    ${binaryBtns(false)}
        </div>
      </sc-if>
      <sc-if value="{{showPiles}}" hint-placeholder-val="{{ false }}">
        <div style="flex-grow: 1; display: flex; gap: 10px;">
    ${pileTiles(false)}
        </div>
      </sc-if>
      <sc-if value="{{showFour}}" hint-placeholder-val="{{ false }}">
        <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
          <sc-for list="{{grades}}" as="g" hint-placeholder-count="4">
            <button type="button" onClick="{{g.pick}}" data-key="{{g.key}}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: {{t.surf}}; color: {{t.text}}; border: 0; border-radius: 999px; font: inherit; cursor: pointer;">
              <span style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600;"><span style="width: 8px; height: 8px; border-radius: 4px; background: {{g.color}};"></span>{{g.label}}</span>
              <span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{g.sub}}</span>
            </button>
          </sc-for>
        </div>
      </sc-if>
    </div>
  </main>
  <footer style="height: 64px; box-sizing: border-box; padding: 0 32px; display: flex; align-items: center; gap: 24px; font-size: 13px; color: {{t.muted}};">
    <span style="flex-grow: 1;"></span>
    <a href="{{editHref}}" data-key="e">Edit <span style="font-family: ${MONO};">E</span></a><button type="button" onClick="{{undo}}" data-key="z" style="padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer;">Undo <span style="font-family: ${MONO};">Z</span></button>
  </footer>
  <sc-if value="{{settingsOpen}}" hint-placeholder-val="{{ false }}">
    <div role="dialog" aria-label="Review settings" style="position: absolute; top: 72px; right: 32px; width: 380px; box-sizing: border-box; padding: 20px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 24px 64px rgba(0,0,0,.18); display: flex; flex-direction: column; gap: 18px; z-index: 5;">
      <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 16px; font-weight: 600;">Review settings</span><button type="button" onClick="{{toggleSettings}}" aria-label="Close settings" style="width: 32px; height: 32px; border: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 14, 2.2)}</button></div>
      ${settingsGroups}
    </div>
  </sc-if>
  <sc-if value="{{newPileOpen}}" hint-placeholder-val="{{ false }}">
    <div role="dialog" aria-label="New pile" style="position: absolute; right: 330px; bottom: 244px; width: 320px; box-sizing: border-box; padding: 18px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 24px 64px rgba(0,0,0,.18); display: flex; flex-direction: column; gap: 14px; z-index: 6;">
      ${PILE_FORM}
    </div>
  </sc-if>
</div>`;

// Session done
const RING = (size, stroke, { track = '{{t.surf2}}', color = '{{t.text}}', sub = 'color: {{t.muted}};' } = {}) => {
  const r = (size - stroke) / 2, c = +(2 * Math.PI * r).toFixed(1);
  return `<div style="position: relative; width: ${size}px; height: ${size}px;"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${(c * .09).toFixed(1)}"/></svg><div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"><span style="font-size: ${Math.round(size / 4)}px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">91%</span><span style="font-size: 13px; ${sub}">remembered</span></div></div>`;
};
const RING_ON_GRADIENT = { track: 'rgba(255,255,255,.5)', color: '#FFFFFF', sub: 'opacity: .75;' };
// Half-circle meter, red (forgot most) through yellow to green (remembered all), with a knob at the score.
// Session score: a gray half ring that fills in periwinkle (the Iris family) up to the score.
const METER = (w, stroke) => {
  const r = (w - stroke) / 2 - 6, cx = w / 2, cy = r + stroke / 2 + 6, h = Math.ceil(cy + stroke / 2 + 2);
  const start = `M ${(cx - r).toFixed(1)} ${cy.toFixed(1)}`, arc = `A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1`;
  return `<div style="position: relative; width: ${w}px; height: ${h}px;"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="sc-meter" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{{meter.a}}"/><stop offset="1" stop-color="{{meter.b}}"/></linearGradient></defs><path d="${start} ${arc} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}" fill="none" stroke="{{t.surf2}}" stroke-width="${stroke}" stroke-linecap="round"/><path d="${start} ${arc} {{meter.x}} {{meter.y}}" fill="none" stroke="url(#sc-meter)" stroke-width="${stroke}" stroke-linecap="round" pathLength="1" class="sc-draw"/><circle class="sc-knob" cx="{{meter.x}}" cy="{{meter.y}}" r="${(stroke / 2 + 5).toFixed(1)}" fill="{{t.bg}}" stroke="{{meter.b}}" stroke-width="4"/></svg><div role="img" aria-label="{{meter.pct}}% remembered" style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;"><span style="font-size: ${Math.round(w / 5)}px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">{{meter.pct}}%</span><span style="font-size: 13px; color: {{t.muted}};">remembered</span></div></div>`;
};
// Where the ring's knob sits for a score, matching METER(w, stroke).
const METER_JS = (w, stroke) => `const mr = ${(w - stroke) / 2 - 6}, mcx = ${w / 2}, mcy = ${(w - stroke) / 2 - 6 + stroke / 2 + 6};
  const mAng = Math.PI * (1 - Math.max(0.001, Math.min(0.999, ss.pct / 100)));`;
const splitBar = `<div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 3px;"><div style="width: {{split.w0}}; background: {{t.again}};"></div><div style="width: {{split.w1}}; background: {{t.hard}};"></div><div style="width: {{split.w2}}; background: {{t.good}};"></div><div style="width: {{split.w3}}; background: {{t.easy}};"></div></div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 13px; color: {{t.muted}};"><span>Forgot {{split.n0}}</span><span>Hard {{split.n1}}</span><span>Good {{split.n2}}</span><span>Easy {{split.n3}}</span></div>`;
const webDone = `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <div style="width: 560px; display: flex; flex-direction: column; align-items: center; gap: 28px; text-align: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">${METER(300, 22)}<span style="font-size: 14px; font-weight: 600; color: {{meter.ink}};">{{goalLine}}</span></div>
    <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Session complete</h1><div style="font-size: 16px; color: {{t.muted}};">{{summary}}</div></div>
    <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left;">${splitBar}</div>
    <div style="width: 100%; display: flex; gap: 12px;">
      <div style="flex-grow: 1; background: {{t.surf}}; border-radius: 16px; padding: 18px; text-align: left; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 13px; color: {{t.muted}};">Streak</span><span style="font-size: 22px; font-weight: 600;">{{streakLabel}}</span></div>
      <div style="flex-grow: 1; background: {{t.surf}}; border-radius: 16px; padding: 18px; text-align: left; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 13px; color: {{t.muted}};">Next review</span><span style="font-size: 22px; font-weight: 600;">{{nextLabel}}</span></div>
    </div>
    <div style="width: 100%; display: flex; gap: 10px;"><a href="{{moreHref}}" style="flex-grow: 1; height: 52px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">{{moreLabel}}</a><a href="Main.dc.html" style="flex-grow: 1; height: 52px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Done</a></div>
  </div>
</div>`;
// Session done after sorting into piles. Piles don't grade, so there's no score: each pile shows how many cards
// went in this time, with a bar for its share of the session.
const donePiles = big => `<div role="list" aria-label="Your piles" style="width: 100%; display: flex; flex-wrap: wrap; gap: ${big ? 10 : 8}px;"><sc-for list="{{piles}}" as="p" hint-placeholder-count="3"><a role="listitem" href="{{p.href}}" aria-label="Go over {{p.name}}" title="Go over {{p.name}}" style="flex: 1 1 ${big ? '0' : '96px'}; min-width: 0; position: relative; box-sizing: border-box; padding: ${big ? '22px 20px 20px' : '16px 14px 14px'}; border-radius: ${big ? 28 : 22}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: ${big ? 6 : 4}px; text-align: left; pointer-events: {{p.pe}};"><span style="position: absolute; top: ${big ? 18 : 12}px; right: ${big ? 16 : 12}px; width: ${big ? 28 : 24}px; height: ${big ? 28 : 24}px; border-radius: 50%; background: {{t.bg}}; color: {{p.arrow}}; display: flex; align-items: center; justify-content: center;">${svg(I.chev, big ? 14 : 12, 2.2)}</span><span style="font-size: ${big ? 44 : 34}px; font-weight: 600; letter-spacing: -.03em; line-height: 1;">{{p.count}}</span><span style="font-size: ${big ? 14 : 13}px; font-weight: 600; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{p.name}}</span><div style="margin-top: ${big ? 10 : 8}px; height: 6px; border-radius: 3px; background: {{t.surf2}}; overflow: hidden;"><div style="height: 6px; border-radius: 3px; width: {{p.w}}; background: {{fill}};"></div></div></a></sc-for></div>`;
const noSplit = '<div style="width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left;">' + splitBar + '</div>';
const webDonePiles = webDone.replace(/<div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">[\s\S]*?\{\{goalLine\}\}<\/span><\/div>/, () => donePiles(true)).replace(noSplit, () => '');
const donePilesLogic = `renderVals() { ${T}${DB_JS}
  const ss = db.session(), plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's'), all = Math.max(1, ss.sorted);
  const ink = this.props.dark ? ['#3A4BB0', '#8C9AFC'] : ['#B0BAFB', '#4353E0'];
  return { t, ...chrome, fill: 'linear-gradient(90deg, ' + ink[0] + ', ' + ink[1] + ')',
    // Each pile opens a review of just the cards in it (an empty pile can't be opened).
    piles: ss.piles.map(p => ({ name: p.name, count: String(p.n), w: Math.round(p.n / all * 100) + '%', href: p.href || 'WebReview.dc.html', pe: p.total === 0 ? 'none' : 'auto', arrow: p.total === 0 ? t.surf2 : t.text })),
    summary: plural(ss.sorted, 'card') + ' sorted · ' + plural(ss.minutes, 'minute'), summaryShort: ss.sorted + ' sorted · ' + ss.minutes + ' min',
    streakLabel: plural(ss.streak, 'day'), nextLabel: ss.next, nextShort: ss.next.split(' · ')[0],
    moreHref: ss.moreHref, moreLabel: ss.moreLabel || 'Study 10 more' }; }`;
const plainLogic = `renderVals() { ${T} return { t }; }`;
const doneLogic = (w, stroke) => `renderVals() { ${T}${DB_JS}
  const ss = db.session();
  ${METER_JS(w, stroke)}
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's'), tot = ss.split.reduce((a, b) => a + b, 0) || 1;
  const pct = n => Math.round(n / tot * 100) + '%', w = ss.splitW || ss.split.map(pct);
  return { t, ...chrome, meter: { ...(this.props.dark ? { a: '#3A4BB0', b: '#8C9AFC', ink: '#8C9AFC' } : { a: '#B0BAFB', b: '#4353E0', ink: '#4353E0' }), pct: String(ss.pct), x: (mcx + mr * Math.cos(mAng)).toFixed(1), y: (mcy - mr * Math.sin(mAng)).toFixed(1) },
    goalLine: ss.pct > ss.goal ? 'Above your ' + ss.goal + '% goal' : ss.pct === ss.goal ? 'Right at your ' + ss.goal + '% goal' : 'Below your ' + ss.goal + '% goal',
    summary: plural(ss.cards, 'card') + ' · ' + plural(ss.minutes, 'minute') + ' · ' + plural(ss.fresh, 'new card') + ' learned',
    summaryShort: plural(ss.cards, 'card') + ' · ' + ss.minutes + ' min · ' + ss.fresh + ' new learned',
    split: { w0: w[0], w1: w[1], w2: w[2], w3: w[3], n0: String(ss.split[0]), n1: String(ss.split[1]), n2: String(ss.split[2]), n3: String(ss.split[3]) },
    streakLabel: plural(ss.streak, 'day'), nextLabel: ss.next, nextShort: ss.next.split(' · ')[0],
    moreHref: ss.moreHref, moreLabel: ss.moreLabel || 'Study 10 more' }; }`;

// Stats
const HEAT_LOGIC = weeks => `
  // Periwinkle scale (the Iris gradient's family): empty, then four levels of study.
  // In gray dark mode an empty day is a shade under the gray panel, not black.
  const scale = this.props.dark && this.props.dim ? ['#232326', '#2A3272', '#3442A8', '#4F62DE', '#8C9AFC'] : this.props.dark ? ['#0B0B0F', '#1E2452', '#2F3D9A', '#4C5FDB', '#8C9AFC'] : ['#FFFFFF', '#DCE0FD', '#B0BAFB', '#7F8DF6', '#4F60E6'];
  const cell = lv => ({ c: scale[lv], edge: lv ? 'none' : 'inset 0 0 0 1px ' + t.line });
  const heat = Array.from({ length: ${weeks} * 7 }, (_, i) => { const v = (i * 37 + (i % 7) * 11) % 13; return cell(v < 3 ? 0 : v < 6 ? 1 : v < 9 ? 2 : v < 11 ? 3 : 4); });
  const legend = [0, 1, 2, 3, 4].map(cell);`;
const webStats = webRoot(`${sidebar('Stats')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 24px; min-width: 0;">
  <div style="display: flex; align-items: center;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; flex-grow: 1;">Stats</h1>
    <div style="display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
      <sc-for list="{{ranges}}" as="r" hint-placeholder-count="3"><button type="button" onClick="{{r.pick}}" style="height: 36px; padding: 0 18px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{r.bg}}; color: {{r.fg}};">{{r.label}}</button></sc-for>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;">
    <sc-for list="{{kpis}}" as="k" hint-placeholder-count="4">
      <div style="background: {{t.surf}}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 13px; color: {{t.muted}};">{{k.label}}</span><span style="font-size: 32px; font-weight: 600; letter-spacing: -.035em; line-height: 1.05;">{{k.value}}</span><span style="font-size: 13px; color: {{t.muted}};">{{k.sub}}</span></div>
    </sc-for>
  </div>
  <div style="background: {{t.surf}}; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 16px; font-weight: 600;">Study days <span style="font-weight: 400; color: {{t.muted}};">· last 6 months</span></span><span style="display: flex; align-items: center; gap: 5px; font-size: 12px; color: {{t.muted}};">Less<sc-for list="{{legend}}" as="l" hint-placeholder-count="5"><span style="width: 12px; height: 12px; border-radius: 4px; background: {{l.c}}; box-shadow: {{l.edge}};"></span></sc-for>More</span></div>
    <div style="display: grid; grid-template-rows: repeat(7, 18px); grid-auto-flow: column; grid-auto-columns: 18px; gap: 5px;">
      <sc-for list="{{heat}}" as="h" hint-placeholder-count="40"><div style="border-radius: 6px; background: {{h.c}}; box-shadow: {{h.edge}};"></div></sc-for>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; flex-grow: 1;">
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 14px;">
      ${DUE_HEAD('next 2 weeks', false)}
      ${DUE_BARS(14, 8, 8, true)}
    </div>
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 6px;">
        <span style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 600;">Remembered, by deck</span><span style="font-size: 12px; color: {{t.muted}};">{{goalNote}}</span></span>
        ${SEG('sorts', 'Sort decks by remembered', 2)}
      </div>
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="6">
        <div style="display: flex; align-items: center; gap: 14px; height: 36px; font-size: 14px;"><span style="width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</span><span style="position: relative; flex-grow: 1; height: 8px; border-radius: 4px; background: {{t.surf2}};"><span style="position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: {{d.bar}}; width: {{d.w}};"></span><span style="position: absolute; left: {{goalLeft}}; top: -4px; width: 2px; height: 16px; margin-left: -1px; border-radius: 1px; background: {{t.text}}; opacity: .35;"></span></span><span style="font-family: ${MONO}; font-size: 13px; font-weight: 600; width: 40px; text-align: right; color: {{d.color}};">{{d.ret}}</span></div>
      </sc-for>
    </div>
  </div>
</main>`);
const statsLogic = `
constructor(props) { super(props); this.state = { range: 'Month', sort: 'most' }; }
renderVals() {
  ${T}${DB_JS}
  const rg = this.state.range, sort = this.state.sort, st = db.stats(rg);
  ${HEAT_LOGIC(38)}
  ${FORECAST_JS('st.forecast', 140)}
  ${OPTS_JS}
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's'), goal = st.goal;
  // Remembered, by deck: most or least first. Green at or above your goal, amber close to it, red below.
  const val = d => (d.ret == null ? -1 : d.ret);
  const decks = st.byDeck.slice().sort((a, b) => (sort === 'most' ? val(b) - val(a) : (a.ret == null) - (b.ret == null) || val(a) - val(b)))
    .map(d => { const v = d.ret, k = v == null ? 'none' : v >= goal ? 'good' : v >= goal - 5 ? 'hard' : 'again';
      return { name: d.name, ret: v == null ? '—' : v + '%', w: v == null ? '0%' : v + '%', color: v == null ? t.muted : t[k], bar: { good: '#30A46C', hard: '#F5A524', again: '#E5484D', none: 'transparent' }[k] }; });
  return {
    t, ...chrome, heat: st.heat ? st.heat.map(cell) : heat, legend, forecast, dueTotal, busy, decks,
    ranges: ['Week', 'Month', 'Year'].map(l => ({ label: l, bg: l === rg ? t.bg : 'transparent', fg: l === rg ? t.text : t.muted, pick: () => this.setState({ range: l }) })),
    kpis: [{ label: 'Streak', value: plural(st.streak, 'day'), sub: 'Best: ' + plural(st.best, 'day') }, { label: 'Reviews', value: st.reviews, sub: { Week: 'This week', Month: 'This month', Year: 'This year' }[rg] },
      { label: 'Remembered', value: st.remembered == null ? '—' : st.remembered + '%', sub: 'Goal: ' + goal + '%' }, { label: 'Cards', value: st.cards, sub: st.ai + ' made by AI' }],
    goalNote: 'The line marks your ' + goal + '% goal', goalLeft: goal + '%',
    sorts: opts([['most', 'Most'], ['least', 'Least']], sort, id => this.setState({ sort: id }))
  };
}`;

// Real logos for Connect (from svgl.app, downloaded with the owner's OK on 2026-09-23). Each light and dark
// version differs only in fill, so one path each takes the theme's color; Claude keeps its own orange.
const LOGO = {
  claude: size => `<svg width="${size}" height="${size}" viewBox="0 0 256 257" aria-hidden="true"><path fill="#D97757" d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"/></svg>`,
  openai: size => `<svg width="${size}" height="${size}" viewBox="96 96 419 419" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" fill="{{t.text}}" d="M252.794 108.802C289.191 99.0484 326.265 110.305 351.148 135.135C385.113 126.072 422.85 134.862 449.492 161.505C476.136 188.149 484.925 225.888 475.862 259.85V259.854C500.696 284.735 511.95 321.81 502.198 358.207C492.447 394.602 464.161 421.084 430.215 430.217C421.083 464.162 394.603 492.448 358.206 502.199C321.812 511.951 284.734 500.693 259.852 475.864C225.887 484.927 188.15 476.137 161.507 449.495C134.864 422.851 126.073 385.111 135.136 351.149C110.304 326.266 99.0496 289.192 108.801 252.795C118.552 216.4 146.84 189.918 180.784 180.785C189.917 146.841 216.396 118.553 252.794 108.802ZM374.292 407.145C374.292 411.271 372.092 415.086 368.517 417.148L283.723 466.102C302.487 480.585 327.555 486.459 352.217 479.852C386.997 470.532 410.068 439.312 410.555 405.006V317.717C410.555 315.08 409.125 312.621 406.843 311.303L374.292 292.509V407.145ZM251.868 415.897C248.296 417.959 243.893 417.959 240.317 415.897L155.526 366.942C152.366 390.436 159.811 415.08 177.866 433.136H177.863C203.325 458.594 241.896 462.962 271.85 446.232L347.449 402.586C349.735 401.268 351.148 398.8 351.148 396.163V358.579L251.868 415.897ZM368.602 220.628C366.319 219.309 363.474 219.318 361.191 220.637L328.641 239.431L427.921 296.749C431.496 298.811 433.697 302.627 433.697 306.752V404.661C455.622 395.654 473.244 376.881 479.851 352.218C489.169 317.442 473.668 281.85 444.201 264.274L368.602 220.628ZM177.303 206.34C155.377 215.348 137.756 234.122 131.148 258.783C121.832 293.561 137.331 329.153 166.799 346.727L242.398 390.373C244.68 391.692 247.525 391.684 249.807 390.366L282.357 371.572L183.078 314.253C179.504 312.189 177.303 308.375 177.303 304.251V206.34ZM259.849 279.145V331.858L305.5 358.213L351.15 331.858V279.145L305.5 252.789L259.849 279.145ZM327.276 144.9C308.512 130.418 283.445 124.543 258.782 131.15C224.002 140.471 200.931 171.691 200.445 205.995V293.286C200.445 295.923 201.875 298.381 204.158 299.7L236.707 318.493V203.856C236.707 199.731 238.909 195.916 242.483 193.853L327.276 144.9ZM433.137 177.867C407.675 152.407 369.103 148.038 339.149 164.769L263.55 208.415C261.265 209.734 259.852 212.202 259.852 214.838V252.423L359.132 195.105C362.703 193.041 367.108 193.041 370.682 195.105L455.473 244.06C458.635 220.567 451.189 195.922 433.135 177.867H433.137Z"/></svg>`,
  cursor: size => `<svg width="${Math.round(size * 0.88)}" height="${size}" viewBox="0 0 466.73 532.09" aria-hidden="true"><path fill="{{p.cursorInk}}" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/></svg>`,
  mcp: size => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill-rule="evenodd" aria-hidden="true"><path fill="{{t.text}}" d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z"/><path fill="{{t.text}}" d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z"/></svg>`
};
const PROVIDER_LOGO = size => `<sc-if value="{{p.isClaude}}" hint-placeholder-val="{{ true }}">${LOGO.claude(size)}</sc-if><sc-if value="{{p.isOpenAI}}" hint-placeholder-val="{{ false }}">${LOGO.openai(size)}</sc-if><sc-if value="{{p.isCursor}}" hint-placeholder-val="{{ false }}">${LOGO.cursor(size)}</sc-if><sc-if value="{{p.isMcp}}" hint-placeholder-val="{{ false }}">${LOGO.mcp(size)}</sc-if>`;
// Which AI apps are connected: from the MCP link's visitors in the app, a sample on the canvas.
const PROVIDERS = on => `const providers = [['claude', 'Claude'], ['openai', 'ChatGPT'], ['cursor', 'Cursor'], ['mcp', 'Any MCP app']].map(([id, name]) => ({ name, status: (${on})[id] ? 'Connected' : 'Connect', color: (${on})[id] ? t.good : t.muted,
    isClaude: id === 'claude', isOpenAI: id === 'openai', isCursor: id === 'cursor', isMcp: id === 'mcp', cursorInk: this.props.dark ? '#edecec' : '#26251e' }));`;

// Connect
const aiKind = (icon, title, text) => `<div style="background: {{t.bg}}; border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 10px;"><span style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I[icon], 16, 2)}</span><span style="font-size: 14px; font-weight: 600;">${title}</span><span style="font-size: 13px; line-height: 1.4; color: {{t.muted}};">${text}</span></div>`;
const webConnect = webRoot(`${sidebar('Connect AI')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 24px; min-width: 0;">
  <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Connect your AI</h1><p style="margin: 0; font-size: 16px; line-height: 1.5; color: {{t.muted}}; max-width: 640px;">Your cards live here. Claude, ChatGPT, or any app that speaks MCP can add text, fill-in-the-blank, image, and audio cards straight from the chat.</p></div>
  <div style="display: flex; gap: 16px; min-height: 0;">
    <section style="flex-grow: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0;">
      ${meshCard('hero', 'border-radius: 20px; flex-shrink: 0;', 'box-sizing: border-box; padding: 26px; display: flex; flex-direction: column; gap: 14px;', `
        <div style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .8;">Your MCP link</div>
        <div style="display: flex; gap: 10px;"><div style="flex-grow: 1; min-width: 0; height: 50px; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; border-radius: 999px; ${glass} font-family: ${MONO}; font-size: 15px;"><span style="min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{{mcpUrl}}</span></div><button type="button" onClick="{{copy}}" style="flex-shrink: 0; height: 50px; padding: 0 24px; border: 0; border-radius: 999px; background: #FFFFFF; color: #000000; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{copyLabel}}</button></div>
        <sc-if value="{{canRenew}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{renew}}" style="align-self: flex-start; border: 0; padding: 0; background: transparent; color: inherit; opacity: .8; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;">{{renewLabel}}</button></sc-if>`)}
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
        <sc-for list="{{providers}}" as="p" hint-placeholder-count="4">
          <div style="background: {{t.surf}}; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px;"><span style="width: 36px; height: 36px; border-radius: 18px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${PROVIDER_LOGO(22)}</span><span style="font-size: 15px; font-weight: 600;">{{p.name}}</span><span style="font-size: 13px; color: {{p.color}};">{{p.status}}</span></div>
        </sc-for>
      </div>
      <div style="background: {{t.surf}}; border-radius: 18px; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px;"><span style="font-size: 15px; font-weight: 600;">Cards your AI can make</span><span style="font-size: 13px; color: {{t.muted}};">Just ask, like “Make 20 cards from my notes.”</span></div>
        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
          ${aiKind('text', 'Question and answer', 'A question on the front, the answer on the back.')}
          ${aiKind('blank', 'Fill in the blank', 'Hides a word inside a sentence.')}
          ${aiKind('image', 'Image', 'A diagram with one part to name.')}
          ${aiKind('audio', 'Audio', 'Hear a word, then say what it means.')}
        </div>
      </div>
    </section>
    <section style="width: 380px; flex-shrink: 0; background: {{t.surf}}; border-radius: 18px; padding: 8px 22px; box-sizing: border-box; align-self: flex-start;">
      <div style="padding: 16px 0 8px; font-size: 15px; font-weight: 600;">What your AI can do</div>
      <sc-for list="{{perms}}" as="x" hint-placeholder-count="6">
        <div style="display: flex; align-items: center; gap: 12px; min-height: 60px; border-top: 1px solid {{t.line}};">
          <span style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1;"><span style="font-size: 14px; font-weight: 500;">{{x.label}}</span><span style="font-size: 12px; color: {{t.muted}};">{{x.sub}}</span></span>
          <button type="button" role="switch" aria-checked="{{x.checked}}" aria-label="{{x.label}}" onClick="{{x.toggle}}" style="width: 48px; height: 28px; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{x.track}}; cursor: pointer; transition: background .2s;"><span style="display: block; width: 22px; height: 22px; border-radius: 11px; background: {{x.knobColor}}; transform: {{x.knob}}; transition: transform .2s cubic-bezier(.4,0,.2,1);"></span></button>
        </div>
      </sc-for>
    </section>
  </div>
</main>`);
const connectLogic = `
constructor(props) { super(props); this.state = { copied: false }; }
renderVals() {
  ${T}${DB_JS}
  const ai = db.ai();
  const defs = [
    { id: 'read', label: 'Read cards and what’s due', sub: 'So it can quiz you and see what you’re learning' },
    { id: 'text', label: 'Write text and fill-in-the-blank', sub: 'Adds new cards to your decks' },
    { id: 'media', label: 'Write image and audio cards', sub: 'Adds pictures and sound to cards' },
    { id: 'edit', label: 'Edit cards', sub: 'Fixes typos and updates answers' },
    { id: 'check', label: 'Let me check AI cards first', sub: 'They wait in their deck until you keep them' },
    { id: 'del', label: 'Delete cards', sub: 'Removes cards for good' }
  ];
  const perms = defs.map(d => { const on = ai.perms[d.id]; return { ...d, checked: on ? 'true' : 'false', track: on ? t.inv : t.surf2, knobColor: on ? t.invText : t.bg, knob: on ? 'translateX(20px)' : 'translateX(0)', toggle: () => db.act.setPerm(d.id, !on) }; });
  ${PROVIDERS('ai.clients')}
  // Online, a link that got out can be swapped for a new one; AI apps with the old link lose access.
  const renew = () => { if (db.mock) return this.setState({ renewed: true }); if (!confirm('Make a new link? AI apps using the old one will stop working until you give them the new link.')) return; db.act.newLink().then(() => this.setState({ renewed: true, copied: false })); };
  return { ${MESH_VALS('Apricot')} t, ...chrome, perms, providers, mcpUrl: ai.url, copyLabel: this.state.copied ? 'Copied' : 'Copy', copy: () => { db.act.copy(ai.url); this.setState({ copied: true }); },
    canRenew: db.mock || db.settings().signedIn, renew, renewLabel: this.state.renewed ? 'New link made' : 'Make a new link' };
}`;

// ---------- Structure B: top tabs, one centered column ----------
const topBar = active => `<header style="height: 76px; box-sizing: border-box; padding: 0 40px; display: flex; align-items: center;">
  <div style="width: 240px;">${logo(26)}</div>
  <nav style="flex-grow: 1; display: flex; justify-content: center;"><div style="display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
    ${[['Today', 'TopToday.dc.html'], ['Decks', 'TopDeck.dc.html'], ['Stats', 'TopToday.dc.html'], ['Connect', 'TopToday.dc.html']].map(([l, h]) => `<a href="${h}" style="height: 38px; padding: 0 20px; display: flex; align-items: center; border-radius: 999px; font-size: 14px; font-weight: 500; ${l === active ? 'background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 1px 3px rgba(0,0,0,.12);' : 'color: {{t.muted}};'}">${l}</a>`).join('')}
  </div></nav>
  <div style="width: 240px; display: flex; justify-content: flex-end; gap: 8px;"><button type="button" aria-label="Search" style="width: 40px; height: 40px; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.search, 16)}</button><span style="width: 40px; height: 40px; border-radius: 20px; background: {{t.surf2}}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">A</span></div>
</header>`;
const topToday = `<div style="width: 1440px; height: 900px; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${topBar('Today')}
<main style="flex-grow: 1; display: flex; justify-content: center; padding-top: 40px;">
  <div style="width: 680px; display: flex; flex-direction: column; gap: 36px;">
    ${meshCard('hero', 'border-radius: 36px; flex-shrink: 0;', 'box-sizing: border-box; padding: 36px; display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center;', `
      <div style="font-size: 14px; opacity: .8;">Tuesday · 12-day streak</div>
      <h1 style="margin: 0; font-size: 88px; font-weight: 500; letter-spacing: -.05em; line-height: .95;">64 due</h1>
      <a href="WebReview.dc.html" style="height: 56px; padding: 0 40px; border-radius: 999px; background: #FFFFFF; color: #000000; display: inline-flex; align-items: center; font-size: 16px; font-weight: 600;">Start review · 11 min</a>`)}
    <div style="background: {{t.surf}}; border-radius: 28px; padding: 8px;">
      <sc-for list="{{items}}" as="i" hint-placeholder-count="3">
        <div style="display: flex; align-items: center; gap: 14px; padding: 12px 12px 12px 16px;">
          <span style="font-size: 12px; font-weight: 600; width: 64px;">{{i.src}}</span>
          <span style="flex-grow: 1; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{i.front}}</span>
          <button type="button" onClick="{{i.toss}}" style="height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">Toss</button>
          <button type="button" onClick="{{i.keep}}" style="height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">Keep</button>
        </div>
      </sc-for>
      <sc-if value="{{noItems}}" hint-placeholder-val="{{ false }}"><div style="padding: 16px; font-size: 14px; color: {{t.muted}};">All AI cards checked.</div></sc-if>
    </div>
    <div style="display: flex; flex-direction: column;">
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="4">
        <a href="TopDeck.dc.html" style="display: flex; align-items: center; gap: 12px; height: 60px; border-bottom: 1px solid {{t.line}};"><span style="flex-grow: 1; font-size: 16px; font-weight: 500;">{{d.name}}</span><span style="font-family: ${MONO}; font-size: 15px;">{{d.due}}</span><span style="color: {{t.muted}};">${svg(I.chev, 16, 2)}</span></a>
      </sc-for>
    </div>
  </div>
</main>
</div>`;
const topTodayLogic = `
constructor(props) { super(props); this.state = { handled: {} }; }
renderVals() { ${T}${AI_LOGIC}
  return { ${MESH_VALS('Iris')} t, items, noItems: items.length === 0, decks: ${DECKS}.slice(0, 3) }; }`;
const topDeck = `<div style="width: 1440px; height: 900px; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${topBar('Decks')}
<main style="flex-grow: 1; display: flex; justify-content: center; padding-top: 32px;">
  <div style="width: 680px; display: flex; flex-direction: column; gap: 28px;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;">
      <h1 style="margin: 0; font-size: 56px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">Cell Biology</h1>
      <div style="font-size: 15px; color: {{t.muted}};">28 due · 10 new · 91% remembered · 412 cards</div>
      <div style="display: flex; gap: 10px; padding-top: 8px;">${pill('Add card', { icon: 'plus', href: 'WebEditor.dc.html', h: 52 })}<a href="WebReview.dc.html" style="height: 52px; padding: 0 36px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: inline-flex; align-items: center; font-size: 16px; font-weight: 600;">Study now</a></div>
    </div>
    <div style="display: flex; flex-direction: column;">
      <sc-for list="{{rows}}" as="r" hint-placeholder-count="6">
        <div style="display: flex; align-items: center; gap: 14px; height: 64px; border-bottom: 1px solid {{t.line}};"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;"><span style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.front}}</span><span style="font-size: 13px; color: {{t.muted}};">{{r.kind}} · {{r.next}}</span></span></div>
      </sc-for>
    </div>
  </div>
</main>
</div>`;
const topDeckLogic = `renderVals() { ${T} return { t, rows: ${CARD_ROWS} }; }`;

// ---------- Structure C: focus, the card is home ----------
const focusShell = (inner, overlay = '') => `<div style="position: relative; width: 1440px; height: 900px; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
  <header style="position: absolute; top: 0; left: 0; right: 0; height: 88px; box-sizing: border-box; padding: 0 40px; display: flex; align-items: center; justify-content: space-between;">
    ${logo(26)}
    <div style="display: flex; gap: 8px;">${['stats', 'connect', 'search', 'gear'].map(ic => `<button type="button" aria-label="${ic}" style="width: 44px; height: 44px; border: 0; border-radius: 22px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[ic], 18)}</button>`).join('')}</div>
  </header>
  ${inner}
  ${overlay}
</div>`;
const stack = `<div style="position: absolute; left: 50%; top: 150px; width: 640px; height: 400px; margin-left: -320px;">
  <div style="position: absolute; inset: 0; transform: translateY(28px) scale(.9); border-radius: 36px; background: {{t.surf2}};"></div>
  <div style="position: absolute; inset: 0; transform: translateY(14px) scale(.95); border-radius: 36px; background: {{t.surf}}; border: 1px solid {{t.line}};"></div>
  <a href="WebReview.dc.html" style="position: absolute; inset: 0; box-sizing: border-box; padding: 40px 48px; border-radius: 36px; background: {{t.card}}; border: 1px solid {{t.line}}; box-shadow: {{t.shadow}}; display: flex; flex-direction: column; justify-content: space-between;">
    <span style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Cell Biology · 1 of 64</span>
    <span style="font-size: 36px; font-weight: 500; line-height: 1.25; letter-spacing: -.02em;">What does the electron transport chain pump across the inner membrane?</span>
    <span style="font-size: 14px; color: {{t.muted}};">Click or press Space to start</span>
  </a>
</div>`;
const focusChips = `<div style="position: absolute; left: 0; right: 0; bottom: 64px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
  <div style="font-size: 15px; color: {{t.muted}};">64 due · about 11 minutes · 12-day streak</div>
  <div style="display: flex; gap: 8px;">
    <a href="FocusDecks.dc.html" style="height: 44px; padding: 0 20px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; font-size: 14px; font-weight: 600;">All decks</a>
    <sc-for list="{{decks}}" as="d" hint-placeholder-count="4"><a href="FocusDecks.dc.html" style="height: 44px; padding: 0 18px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500;">{{d.name}}<span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{d.due}}</span></a></sc-for>
  </div>
</div>`;
const focusHome = focusShell(stack + focusChips);
const focusDecks = focusShell(stack, `<div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div style="position: absolute; left: 50%; bottom: 16px; width: 720px; margin-left: -360px; box-sizing: border-box; padding: 12px 24px 24px; border-radius: 36px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 4px;">
    <div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}}; margin-bottom: 12px;"></div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">Decks</span>${pill('New deck', { icon: 'plus', h: 40 })}</div>
    <sc-for list="{{decks}}" as="d" hint-placeholder-count="6">
      <a href="FocusHome.dc.html" style="display: flex; align-items: center; gap: 14px; height: 60px; border-top: 1px solid {{t.line}};"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 500;">{{d.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{d.total}} cards · {{d.ret}} remembered</span></span><span style="font-family: ${MONO}; font-size: 15px;">{{d.due}}</span><span style="height: 36px; padding: 0 16px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; font-size: 13px; font-weight: 600;">Study</span></a>
    </sc-for>
  </div>`);
const focusLogic = n => `renderVals() { ${T} return { t, decks: ${DECKS}.slice(0, ${n}) }; }`;

// ---------- Card types ----------
const typeCol = (title, sub, key, body) => `<div style="display: flex; flex-direction: column; gap: 14px;">
  <div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 18px; font-weight: 600; letter-spacing: -.01em;">${title}</span><span style="font-size: 14px; color: {{t.muted}}; line-height: 1.4;">${sub}</span></div>
  <div style="height: 460px; box-sizing: border-box; border-radius: 32px; background: {{t.card}}; border: 1px solid {{t.line}}; box-shadow: {{t.shadow}}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">${body}</div>
  <span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">type: "${key}"</span>
</div>`;
const centered = inner => `<div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">${inner}</div>`;
const revealBtn = (handler, label) => `<button type="button" onClick="{{${handler}}}" style="height: 48px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{${label}}}</button>`;
const cardTypes = `<div style="width: 1440px; height: 900px; box-sizing: border-box; padding: 56px 64px; display: flex; flex-direction: column; gap: 36px; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 44px; font-weight: 600; letter-spacing: -.035em;">Four kinds of cards, all writable by AI</h1><p style="margin: 0; font-size: 16px; color: {{t.muted}};">Click each card to try it.</p></div>
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px;">
    ${typeCol('Basic', 'A question on the front, the answer on the back.', 'basic', `${centered('<div class="{{basicCls}}" style="font-size: 26px; font-weight: 500; line-height: 1.3; letter-spacing: -.02em;">{{basicText}}</div>')}
      ${revealBtn('flipBasic', 'basicLabel')}`)}
    ${typeCol('Fill in the blank', 'Words hide inside a sentence. Each blank is its own card.', 'cloze', `${centered('<div style="font-size: 24px; font-weight: 500; line-height: 1.6; letter-spacing: -.015em;">The <span class="{{c1.cls}}" style="display: inline-block; padding: 0 10px; border-radius: 999px; background: {{c1.bg}}; color: {{c1.fg}}; transition: background-color .3s ease, color .3s ease;">{{c1.text}}</span> is the powerhouse of the cell, making most of its <span class="{{c2.cls}}" style="display: inline-block; padding: 0 10px; border-radius: 999px; background: {{c2.bg}}; color: {{c2.fg}}; transition: background-color .3s ease, color .3s ease;">{{c2.text}}</span>.</div>')}
      ${revealBtn('nextBlank', 'clozeLabel')}`)}
    ${typeCol('Image', 'Your AI sends a diagram and hides one part of it.', 'image', `${centered(`<div style="display: flex; flex-direction: column; align-items: center; gap: 14px;">${CELL(250, 170)}<span class="{{imageCls}}" style="font-size: 20px; font-weight: 600;">{{imageText}}</span></div>`)}
      ${revealBtn('flipImage', 'imageLabel')}`)}
    ${typeCol('Audio', 'Hear a word or a phrase, then say what it means.', 'audio', `${centered(`<div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
        <button type="button" onClick="{{togglePlay}}" aria-label="{{playLabel}}" style="width: 80px; height: 80px; border: 0; border-radius: 40px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; cursor: pointer;"><sc-if value="{{paused}}" hint-placeholder-val="{{ true }}">${svg(I.play, 28)}</sc-if><sc-if value="{{playing}}" hint-placeholder-val="{{ false }}">${svg(I.pause, 28)}</sc-if></button>
        <div style="display: flex; align-items: center; gap: 3px; height: 48px;"><sc-for list="{{bars}}" as="b" hint-placeholder-count="44"><div data-anim="1" style="width: 3px; border-radius: 2px; background: {{t.text}}; height: {{b.h}}; animation: {{b.anim}};"></div></sc-for></div>
        <div style="width: 180px; height: 3px; border-radius: 2px; background: {{t.surf2}}; overflow: hidden;"><div data-anim="1" style="width: 0; height: 3px; border-radius: 2px; background: {{t.text}}; animation: {{progAnim}};"></div></div>
        <span class="{{audioCls}}" style="font-size: 20px; font-weight: 600;">{{audioText}}</span>
      </div>`)}
      ${revealBtn('flipAudio', 'audioLabel')}`)}
  </div>
</div>`;
const cardTypesCss = `@keyframes scWave{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
@keyframes scProg{from{width:0}to{width:100%}}
@keyframes scPop{0%{transform:scale(.6) translateY(4px);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:none;opacity:1}}
@keyframes scFadeA{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes scFadeB{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes scInA{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
@keyframes scInB{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.sc-pop{animation:scPop .5s cubic-bezier(.34,1.56,.64,1) both}
.sc-fade-a{animation:scFadeA .4s cubic-bezier(.2,.8,.2,1) both}
.sc-fade-b{animation:scFadeB .4s cubic-bezier(.2,.8,.2,1) both}
.sc-in-a{animation:scInA .32s cubic-bezier(.2,.8,.2,1) both}
.sc-in-b{animation:scInB .32s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){.sc-pop,.sc-fade-a,.sc-fade-b,.sc-in-a,.sc-in-b,[data-anim]{animation:none!important}}`;
const REVIEW_CSS = cardTypesCss + OCC_VIEW_CSS;
const cardTypesLogic = `
constructor(props) { super(props); this.state = { basic: false, blanks: 0, image: false, audio: false, playing: false }; }
renderVals() {
  ${T}
  const s = this.state;
  // Revealed blanks pop in; answers fade up (two class names so the animation replays each way).
  const blank = (shown, word) => shown ? { text: word, bg: t.inv, fg: t.invText, cls: 'sc-pop' } : { text: '\\u2003\\u2003\\u2003', bg: t.surf2, fg: t.text, cls: '' };
  const fade = on => on ? 'sc-fade-a' : 'sc-fade-b';
  return {
    t,
    basicText: s.basic ? 'Protons (H⁺), pumped into the intermembrane space.' : 'What does the electron transport chain pump across the inner membrane?',
    basicCls: fade(s.basic), basicLabel: s.basic ? 'Flip back' : 'Show answer', flipBasic: () => this.setState({ basic: !s.basic }),
    c1: blank(s.blanks >= 1, 'mitochondrion'), c2: blank(s.blanks >= 2, 'ATP'),
    clozeLabel: s.blanks >= 2 ? 'Start over' : 'Reveal blank ' + (s.blanks + 1), nextBlank: () => this.setState({ blanks: s.blanks >= 2 ? 0 : s.blanks + 1 }),
    imageText: s.image ? '1 = Nucleus' : 'Name structure 1', imageCls: fade(s.image), imageLabel: s.image ? 'Hide label' : 'Show answer', flipImage: () => this.setState({ image: !s.image }),
    audioText: s.audio ? '電車 · でんしゃ · train' : 'What word do you hear?', audioCls: fade(s.audio), audioLabel: s.audio ? 'Hide answer' : 'Show answer', flipAudio: () => this.setState({ audio: !s.audio }),
    playing: s.playing, paused: !s.playing, playLabel: s.playing ? 'Pause audio' : 'Play audio',
    togglePlay: () => this.setState({ playing: !s.playing }),
    progAnim: s.playing ? 'scProg 2.4s linear infinite' : 'none',
    bars: ${WAVE_BIG}.map((h, i) => ({ h: h + 'px', anim: s.playing ? 'scWave .9s ease-in-out ' + ((i % 5) * 0.12).toFixed(2) + 's infinite alternate' : 'none' }))
  };
}`;

// ---------- Motion ----------
const tile = (title, spec, stage) => `<div style="background: #F4F4F4; border-radius: 32px; padding: 22px; display: flex; flex-direction: column; gap: 14px;">
  <div style="flex-grow: 1; border-radius: 22px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; min-height: 250px;">${stage}</div>
  <div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 16px; font-weight: 600;">${title}</span><span style="font-family: ${MONO}; font-size: 12px; color: #666666;">${spec}</span></div>
</div>`;
const mcard = (txt, extra = '', cls = '') => `<div class="${cls}" style="width: 180px; height: 120px; box-sizing: border-box; padding: 16px; border-radius: 22px; background: #FFFFFF; border: 1px solid #EBEBEB; box-shadow: 0 12px 28px -12px rgba(0,0,0,.22); display: flex; align-items: flex-end; font-size: 15px; font-weight: 600; ${extra}">${txt}</div>`;
const MOTION_H = 1260;
// Drawn when the boards are made, since its tiles use parts defined further down (EMPTY_ART).
const motion = () => `<div style="width: 1440px; height: ${MOTION_H}px; box-sizing: border-box; padding: 56px 64px; display: flex; flex-direction: column; gap: 28px; font-family: ${FONT}; background: #FFFFFF; color: #000000;">
  <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 44px; font-weight: 600; letter-spacing: -.035em;">Motion</h1><p style="margin: 0; font-size: 16px; color: #666666;">Every animation loops here so you can watch it. In the app most play once; empty states and the Today card keep moving, slowly. All of them turn off when Reduce Motion is on.</p></div>
  <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 16px;">
    ${tile('Card flip', '500 ms · 3D turn · ease in-out', `<div style="perspective: 900px;"><div class="m-flip" style="position: relative; width: 180px; height: 120px; transform-style: preserve-3d;">${mcard('Question', 'position: absolute; inset: 0; backface-visibility: hidden;')}${mcard('Answer', 'position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg); background: #000000; color: #FFFFFF; border-color: #000000;')}</div></div>`)}
    ${tile('Grade → next card', 'out 220 ms · in 320 ms · slight lift', `<div style="position: relative; width: 180px; height: 120px;">${mcard('Next card', 'position: absolute; inset: 0;', 'm-in')}${mcard('Graded card', 'position: absolute; inset: 0;', 'm-out')}</div>`)}
    ${tile('Button press', '100 ms · shrinks to 96%', `<div class="m-press" style="height: 56px; padding: 0 36px; border-radius: 999px; background: #000000; color: #FFFFFF; display: flex; align-items: center; font-size: 15px; font-weight: 600;">Save card</div>`)}
    ${tile('AI card arrives', 'spring · 400 ms · soft pulse', `<div style="display: flex; flex-direction: column; gap: 8px; width: 220px;"><div class="m-arrive" style="height: 52px; border-radius: 18px; background: #000000; color: #FFFFFF; display: flex; align-items: center; gap: 10px; padding: 0 16px; font-size: 13px; font-weight: 600;"><span class="m-pulse" style="width: 8px; height: 8px; border-radius: 4px; background: #FFFFFF;"></span>Claude added 12 cards</div><div style="height: 52px; border-radius: 18px; background: #F4F4F4;"></div><div style="height: 52px; border-radius: 18px; background: #F4F4F4;"></div></div>`)}
    ${tile('Keep or toss', 'swipe · follows your finger · 250 ms', `<span style="position: absolute; left: 20px; font-size: 13px; font-weight: 600; color: #666666;">Toss</span><span style="position: absolute; right: 20px; font-size: 13px; font-weight: 600; color: #666666;">Keep</span>${mcard('AI card', '', 'm-swipe')}`)}
    ${tile('Session done', 'ring fills · 900 ms · ease out', `<div style="position: relative; width: 140px; height: 140px;"><svg width="140" height="140" viewBox="0 0 140 140" style="transform: rotate(-90deg);"><circle cx="70" cy="70" r="60" fill="none" stroke="#EBEBEB" stroke-width="12"/><circle class="m-ring" cx="70" cy="70" r="60" fill="none" stroke="#000000" stroke-width="12" stroke-linecap="round" stroke-dasharray="377"/></svg><div class="m-fade" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">91%</div></div>`)}
    ${tile('Progress bar', 'moves after each card · 300 ms', `<div style="width: 220px; height: 8px; border-radius: 4px; background: #EBEBEB; overflow: hidden;"><div class="m-bar" style="height: 8px; border-radius: 4px; background: #000000;"></div></div>`)}
    ${tile('Light ↔ dark', 'cross-fade · 250 ms', `<div class="m-theme" style="width: 200px; height: 130px; border-radius: 24px; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; box-sizing: border-box; border: 1px solid #EBEBEB;"><span style="font-size: 13px; font-weight: 600;">64 cards due</span><span class="m-theme-btn" style="height: 36px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">Study</span></div>`)}
    ${tile('Page opens', 'rises 14 px · 500 ms · each part 60 ms later', `<div style="width: 220px; display: flex; flex-direction: column; gap: 10px;"><div class="m-rise1" style="width: 120px; height: 20px; border-radius: 6px; background: #000000;"></div><div class="m-rise2" style="height: 64px; border-radius: 16px; background: #F4F4F4;"></div><div class="m-rise3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"><div style="height: 40px; border-radius: 12px; background: #F4F4F4;"></div><div style="height: 40px; border-radius: 12px; background: #F4F4F4;"></div></div></div>`)}
    ${tile('Empty state', 'floats and fans · 6 s · a shine every 5 s', EMPTY_ART(150, 'plus'))}
    ${tile('Deck card hover', 'lifts 4 px · 250 ms · shadow grows', meshCard('hero', 'width: 200px; height: 132px; border-radius: 20px;', 'height: 100%; box-sizing: border-box; padding: 16px; display: flex; align-items: flex-end; font-size: 15px; font-weight: 600;', 'Cell Biology', 'div', ' class="m-lift"'))}
    ${tile('Today card', 'colors drift · 16 s · back and forth', meshCard('hero', 'width: 240px; height: 132px; border-radius: 20px;', 'height: 100%; box-sizing: border-box; padding: 18px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px;', '<span style="font-size: 12px; opacity: .8;">Tuesday</span><span style="font-size: 26px; font-weight: 500; letter-spacing: -.03em; line-height: 1;">64 cards due</span>', 'div', ' class="sc-alive"'))}
  </div>
</div>`;
const motionCss = `.m-flip{animation:flip 3.2s cubic-bezier(.4,0,.2,1) infinite}
@keyframes flip{0%,25%{transform:rotateY(0)}40%,75%{transform:rotateY(180deg)}90%,100%{transform:rotateY(360deg)}}
.m-out{animation:out 2.8s infinite}
@keyframes out{0%,35%{transform:none;opacity:1}48%{transform:translateX(-150px) rotate(-8deg);opacity:0}100%{transform:translateX(-150px);opacity:0}}
.m-in{animation:in 2.8s infinite}
@keyframes in{0%,40%{transform:translateY(22px) scale(.93);opacity:0}58%,100%{transform:none;opacity:1}}
.m-press{animation:press 1.8s infinite}
@keyframes press{0%,45%,100%{transform:scale(1)}52%{transform:scale(.96)}62%{transform:scale(1)}}
.m-arrive{animation:arrive 3.2s cubic-bezier(.34,1.56,.64,1) infinite}
@keyframes arrive{0%,8%{transform:translateY(-20px);opacity:0}24%,86%{transform:none;opacity:1}100%{transform:none;opacity:0}}
.m-pulse{animation:pulse 1.6s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
.m-swipe{animation:swipe 4.4s cubic-bezier(.4,0,.2,1) infinite}
@keyframes swipe{0%,15%{transform:none;opacity:1}32%{transform:translateX(170px) rotate(12deg);opacity:0}33%{transform:none;opacity:0}45%,60%{transform:none;opacity:1}78%{transform:translateX(-170px) rotate(-12deg);opacity:0}79%,100%{transform:none;opacity:0}}
.m-ring{animation:ring 3.2s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes ring{0%,10%{stroke-dashoffset:377}45%,85%{stroke-dashoffset:34}100%{stroke-dashoffset:34;opacity:0}}
.m-fade{animation:fade 3.2s infinite}
@keyframes fade{0%,25%{opacity:0}45%,85%{opacity:1}100%{opacity:0}}
.m-bar{animation:bar 4s cubic-bezier(.4,0,.2,1) infinite}
@keyframes bar{0%{width:10%}20%{width:10%}25%,45%{width:30%}50%,70%{width:55%}75%,95%{width:80%}100%{width:10%}}
.m-theme{animation:theme 3.6s infinite}
@keyframes theme{0%,40%{background:#FFFFFF;color:#000000;border-color:#EBEBEB}50%,90%{background:#000000;color:#FFFFFF;border-color:#000000}100%{background:#FFFFFF;color:#000000}}
.m-theme-btn{animation:themebtn 3.6s infinite}
@keyframes themebtn{0%,40%{background:#000000;color:#FFFFFF}50%,90%{background:#FFFFFF;color:#000000}100%{background:#000000;color:#FFFFFF}}
.m-rise1,.m-rise2,.m-rise3{animation:rise 2.4s cubic-bezier(.2,.8,.2,1) infinite}.m-rise2{animation-delay:.06s}.m-rise3{animation-delay:.12s}
@keyframes rise{0%{opacity:0;transform:translateY(14px)}21%,85%{opacity:1;transform:none}100%{opacity:0;transform:none}}
.m-lift{animation:lift 2.4s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes lift{0%,20%,100%{transform:none;box-shadow:0 8px 20px -14px rgba(0,0,0,.3)}35%,70%{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}}
@media (prefers-reduced-motion:reduce){[class^="m-"]{animation:none!important}}`;


// ---------- Gradient cards: every palette in the reference style ----------
const GALLERY = [['Iris', '64 cards due'], ['Apricot', 'Connect your AI'], ['Lilac', 'Session complete'], ['Mint', 'Cell Biology'], ['Aqua', 'Japanese · N4'], ['Rose', '12-day streak'], ['Lemon', 'Spanish Verbs']];
const galleryCard = ([name, text]) => {
  const d = paletteData(name);
  const flow = flowSvg(k => pick(d, k));
  const shadow = d.shadow;
  return `<div style="position: relative; overflow: hidden; border-radius: 36px; background: ${d.base}; color: ${d.ink};">${flow}${GRAIN_LAYER}<div style="position: relative; height: 100%; box-sizing: border-box; padding: 22px 24px; display: flex; flex-direction: column; text-shadow: ${shadow};"><span style="font-size: 13px; font-weight: 500; opacity: .85;">${name}</span><span style="flex-grow: 1; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 32px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; padding-bottom: 20px;">${text}</span></div></div>`;
};
const chatCard = () => {
  const d = paletteData('Mint');
  const flow = flowSvg(k => pick(d, k));
  const you = t => `<span style="align-self: flex-end; max-width: 82%; padding: 9px 14px; border-radius: 18px; box-shadow: inset 0 0 0 1.5px ${d.glassLine}; background: ${d.glass}; font-size: 13px; line-height: 1.35;">${t}</span>`;
  const ai = t => `<span style="align-self: flex-start; max-width: 86%; padding: 10px 14px; border-radius: 18px; background: #FFFFFF; color: #000000; font-size: 13px; line-height: 1.35; text-shadow: none;">${t}</span>`;
  return `<div style="position: relative; overflow: hidden; border-radius: 36px; background: ${d.base}; color: ${d.ink};">${flow}${GRAIN_LAYER}<div style="position: relative; height: 100%; box-sizing: border-box; padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 8px; text-shadow: ${d.shadow};"><span style="font-size: 13px; font-weight: 500; opacity: .85; padding-bottom: 6px;">Mint · your AI, making cards</span>${you('Turn my bio notes into flashcards')}${ai('Done. Added 12 cards to Cell Biology.')}${you('Add a diagram of the cell too')}${ai('Added 1 image card: “Name structure 1.”')}<span style="flex-grow: 1;"></span><span style="font-size: 12px; opacity: .85;">Claude · via your MCP link</span></div></div>`;
};
const galleryBoard = `<div style="width: 1440px; height: 900px; box-sizing: border-box; padding: 48px 56px; display: flex; flex-direction: column; gap: 24px; font-family: ${FONT}; background: #FFFFFF; color: #000000;">
  <div style="display: flex; flex-direction: column; gap: 6px;"><h1 style="margin: 0; font-size: 40px; font-weight: 600; letter-spacing: -.035em;">Gradient cards</h1><p style="margin: 0; font-size: 15px; color: #666666;">Clear, silky color with fine grain, matched to your latest two references. The deeper colors are still under Tweaks → Gradient.</p></div>
  <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 20px;">
    ${GALLERY.map(galleryCard).join('\n    ')}
    ${chatCard()}
  </div>
</div>`;
const galleryLogic = `renderVals() { return { grain: String(this.props.grain ?? 0.7) }; }`;
const GEN_DECKS = ['Pharmacology', 'Cell Biology', 'Japanese · JLPT N4', 'Organic Chemistry', 'US History', 'Spanish Verbs', 'Anatomy', 'Calculus', 'Art History', 'Biochemistry', 'French', 'Physics'];
const generatedBoard = `<div style="width: 1440px; height: 900px; box-sizing: border-box; padding: 48px 56px; display: flex; flex-direction: column; gap: 24px; font-family: ${FONT}; background: #FFFFFF; color: #000000;">
  <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;">
    <div style="display: flex; flex-direction: column; gap: 6px;"><h1 style="margin: 0; font-size: 40px; font-weight: 600; letter-spacing: -.035em;">Every deck gets its own gradient</h1><p style="margin: 0; font-size: 15px; color: #666666; max-width: 760px;">Made from the deck’s name, so it looks the same on every device. Mix is mostly vivid, with some deep ones.</p></div>
    <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
      <div role="group" aria-label="Style" style="display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: #F4F4F4;">
        <sc-for list="{{styles}}" as="m" hint-placeholder-count="3"><button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button></sc-for>
      </div>
      <button type="button" onClick="{{shuffle}}" style="height: 44px; padding: 0 20px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; background: #000000; color: #FFFFFF; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">${svg(I.shuffle, 16, 2)}Shuffle</button>
    </div>
  </div>
  <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 16px;">
    <sc-for list="{{cards}}" as="d" hint-placeholder-count="12">
      ${meshCard('d', 'border-radius: 28px;', 'height: 100%; box-sizing: border-box; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between;', `<span style="font-size: 12px; font-weight: 600; opacity: .8;">{{d.style}}</span><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em; line-height: 1.15;">{{d.name}}</span>`)}
    </sc-for>
  </div>
</div>`;
const generatedLogic = `
constructor(props) { super(props); this.state = { round: 0, style: 'mix' }; }
renderVals() {
  const s = this.state;
  const names = ${JSON.stringify(GEN_DECKS)};
  const cards = names.map(name => {
    const d = this.gen(name + (s.round ? ' #' + s.round : ''), s.style);
    return { ...d, name, style: d.kind };
  });
  return {
    grain: String(this.props.grain ?? 0.7), cards,
    styles: [['mix', 'Mix'], ['vivid', 'Vivid'], ['deep', 'Deep']].map(([id, label]) => ({ label, pressed: id === s.style ? 'true' : 'false', bg: id === s.style ? '#FFFFFF' : 'transparent', fg: id === s.style ? '#000000' : '#666666', sh: id === s.style ? '0 1px 3px rgba(0,0,0,.14)' : 'none', pick: () => this.setState({ style: id }) })),
    shuffle: () => this.setState({ round: s.round + 1 })
  };
}`;

// ---------- iPhone ----------
const NAV_P = [['Today', 'today', 'PhoneToday.dc.html'], ['Library', 'decks', 'PhoneLibrary.dc.html'], ['Stats', 'stats', 'PhoneStats.dc.html'], ['Connect', 'connect', 'PhoneConnect.dc.html']];
const tabBar = active => `<nav style="position: absolute; left: 16px; right: 16px; bottom: 28px; height: 64px; box-sizing: border-box; padding: 6px; border-radius: 999px; background: {{t.surf}}; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px;">
  ${NAV_P.map(([l, ic, h]) => `<a href="${h}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 999px; font-size: 11px; font-weight: 600; ${l === active ? 'background: {{t.inv}}; color: {{t.invText}};' : 'color: {{t.muted}};'}">${svg(I[ic], 20, 2)}${l}</a>`).join('\n  ')}
</nav>`;
// A page taller than the phone scrolls under the tab bar (in the app, phone pages are the screen's height).
const phone = (inner, active, extra = '', h = 844) => `<div${/dragKey/.test(extra) || /data-sc-list/.test(inner) ? ' data-sc-board="{{dragKey}}"' : ''} style="position: relative; width: 390px; height: ${h}px; box-sizing: border-box; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
<div style="height: 100%; overflow-x: hidden; overflow-y: auto; scrollbar-width: none;">${inner}</div>
${active ? tabBar(active) : ''}
${extra}
</div>`;
// iPhone: the same Library as a list, with the Decks / All cards switch under the title.
const phoneLibRow = `<a href="{{d.href}}" draggable="false" style="flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 12px;"><span style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 14px; background: {{d.base}}; overflow: hidden;"><sc-if value="{{d.hasPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{d.photo}}" alt="" draggable="false" style="width: 100%; height: 100%; object-fit: cover;"></sc-if></span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.line}}</span></span><span style="font-family: ${MONO}; font-size: 15px; color: {{d.dueColor}};">{{d.dueLabel}}</span></a>`;
const libRound = (ic, label, { href = '', onClick = '', inv = false, attrs = '' } = {}) => { const st = `width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; ${inv ? 'background: {{t.inv}}; color: {{t.invText}};' : 'background: {{t.surf}}; color: {{t.text}};'} display: flex; align-items: center; justify-content: center; cursor: pointer;`;
  return href ? `<a href="${href}" aria-label="${label}"${attrs} class="sc-press" style="${st}">${svg(I[ic], 18, 2)}</a>` : `<button type="button" onClick="${onClick}" aria-label="${label}"${attrs} class="sc-press" style="${st}">${svg(I[ic], 18, 2)}</button>`; };
const phoneLibrary = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 14px;">
  <sc-if value="{{atTop}}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: center; gap: 8px;">
    <h1 style="margin: 0; flex-grow: 1; min-width: 0; font-size: 32px; font-weight: 700; letter-spacing: -.03em;">Library</h1>
    <sc-if value="{{deckView}}" hint-placeholder-val="{{ true }}">${libRound('folder', 'New folder', { onClick: '{{newFolder}}' })}</sc-if>
    ${libRound('plus', 'New deck', { href: 'PhoneNewDeck.dc.html', inv: true })}
  </div></sc-if>
  <sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}"><div style="display: flex; align-items: center; gap: 8px;">
    ${libRound('back', 'Library', { href: '{{libraryHref}}', attrs: ' data-sc-drop="folder:" data-sc-look="chip" draggable="false"' })}<span style="flex-grow: 1;"></span>
    <button type="button" onClick="{{renameFolder}}" class="sc-press" style="height: 40px; padding: 0 16px; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Rename</button>
    ${libRound('plus', 'New deck', { href: 'PhoneNewDeck.dc.html', inv: true })}
  </div>
  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -.03em; overflow-wrap: anywhere;">{{title}}</h1></sc-if>
  <sc-if value="{{atTop}}" hint-placeholder-val="{{ true }}">${libModes(36, 14, true)}</sc-if>
  <label style="display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};">${svg(I.search, 16)}<span style="position: absolute; left: -9999px;">{{searchHint}}</span><input value="{{query}}" onChange="{{setQuery}}" placeholder="{{searchHint}}" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: {{t.text}};"></label>
  <sc-if value="{{deckView}}" hint-placeholder-val="{{ true }}">
    <sc-if value="{{showFolders}}" hint-placeholder-val="{{ true }}">
      <div style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}}; padding: 6px 4px 0;">Folders</div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;"><sc-for list="{{folders}}" as="f" hint-placeholder-count="2">${folderTile(132, 60, '16px')}</sc-for></div>
      <div style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}}; padding: 10px 4px 0;">Decks</div>
    </sc-if>
    <div data-sc-list="decks" ref="{{dragList}}" onPointerDown="{{grabDeck}}" style="display: flex; flex-direction: column;">
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="4"><div data-sc-item="{{d.id}}" class="sc-drag" style="position: relative; display: flex; align-items: center; gap: 8px; min-height: 68px; border-bottom: 1px solid {{t.line}};">${phoneLibRow}${moveBtn('background: transparent; color: {{t.muted}};', 36)}${moveMenu('right: 0; top: 60px;')}</div></sc-for>
    </div>
    <sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{removeFolder}}" style="align-self: center; height: 40px; padding: 0 16px; border: 0; border-radius: 999px; background: transparent; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Remove folder</button></sc-if>
    <sc-if value="{{noDecks}}" hint-placeholder-val="{{ false }}"><div style="padding: 36px 20px; border-radius: 20px; background: {{t.surf}}; text-align: center; font-size: 15px; line-height: 1.4; color: {{t.muted}};">{{noDecksLine}}</div></sc-if>
  </sc-if>
  <sc-if value="{{cardsView}}" hint-placeholder-val="{{ false }}">
    ${levelSeg(34, 12, true)}
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
      <div style="position: relative;">${menuBtn('tagPick', 'Tags', 36)}${tagMenu('tagPick', 'left: 0; top: 44px;')}</div>
      <div style="position: relative;">${menuBtn('deckPick', '{{deckPick.label}}', 36)}${tagMenu('deckPick', 'left: 0; top: 44px;', { label: 'Filter by deck', find: 'Find a deck or folder', none: 'No decks match' })}</div>
      ${pickedTags(32)}
    </div>
    <span style="font-size: 13px; color: {{t.muted}}; padding: 2px 4px 0;">{{cardCount}}</span>
    <div data-sc-list="cards" ref="{{dragList}}" onPointerDown="{{grabCard}}" style="display: flex; flex-direction: column;">
      <sc-for list="{{rows}}" as="r" hint-placeholder-count="6">
        <a href="{{r.href}}" data-sc-item="{{r.id}}" data-sc-from="{{r.deckId}}" draggable="false" class="sc-drag" style="display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-bottom: 1px solid {{t.line}};">
          <span style="font-size: 15px; font-weight: 500; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{r.front}}</span>
          <span style="display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; color: {{t.muted}};"><span style="width: 12px; height: 12px; flex-shrink: 0; border-radius: 4px; background: {{r.swatch}};"></span><span style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.deckName}}</span>${levelTag}<span style="flex-grow: 1;"></span><span style="flex-shrink: 0;">{{r.next}}</span></span>
        </a>
      </sc-for>
    </div>
    <sc-if value="{{hasMore}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{showMore}}" style="align-self: center; height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{moreLabel}}</button></sc-if>
    <sc-if value="{{noCards}}" hint-placeholder-val="{{ false }}"><div style="padding: 36px 20px; border-radius: 20px; background: {{t.surf}}; text-align: center; font-size: 15px; color: {{t.muted}};">No cards match. Try fewer filters.</div></sc-if>
  </sc-if>
</div>`, 'Library', `${moveTray('tray', true)}
${folderPopup(true)}`);
const pTitle = (txt, right = '') => `<div style="display: flex; align-items: center; justify-content: space-between;"><div style="font-size: 34px; font-weight: 700; letter-spacing: -.03em;">${txt}</div>${right}</div>`;
const roundBtn = (ic, label, href = '') => href ? `<a href="${href}" aria-label="${label}" style="width: 44px; height: 44px; border-radius: 22px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I[ic], 18, 2)}</a>` : `<button type="button" aria-label="${label}" style="width: 44px; height: 44px; border: 0; border-radius: 22px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[ic], 18, 2)}</button>`;
// Today's header: your picture on the left (it opens Settings), the title in the middle, and + on the right.
const todayTitle = (label, href) => `<div style="display: flex; align-items: center; gap: 12px;"><a href="PhoneSettings.dc.html" aria-label="Settings" style="display: flex; flex-shrink: 0; border-radius: 22px;">${AVATAR_ME(44)}</a><h1 style="flex-grow: 1; margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -.03em; text-align: center;">Today</h1>${roundBtn('plus', label, href)}</div>`;
const phoneToday = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 18px;">
  ${todayTitle('New card', 'PhoneEditor.dc.html')}
  ${meshCard('hero', 'display: block; border-radius: 32px;', 'box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; gap: 18px;', `
    <span style="height: 56px;"></span>
    <span style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 14px; opacity: .85;">{{heroMeta}}</span><span style="font-size: {{heroSize}}; font-weight: 600; letter-spacing: -.045em; line-height: 1;">{{heroTitle}}</span><span style="font-size: 14px; opacity: .85;">{{heroSub}}</span></span>
    <span style="height: 52px; border-radius: 999px; background: #FFFFFF; color: #000000; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; text-shadow: none;">{{heroCta}}</span>`, 'a', ' href="{{heroHref}}"')}
  <div style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}}; padding: 6px 4px 0;">Decks</div>
  <div style="display: flex; flex-direction: column;">
    <sc-for list="{{decks}}" as="d" hint-placeholder-count="4">
      <a href="{{d.href}}" style="display: flex; align-items: center; gap: 12px; min-height: 58px; border-bottom: 1px solid {{t.line}};"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 500;">{{d.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{d.fresh}} new · {{d.total}} cards</span></span><span style="font-family: {{d.rightFont}}; font-size: {{d.rightSize}}; color: {{d.rightColor}};">{{d.right}}</span></a>
    </sc-for>
  </div>
</div>`, 'Today');
// Your day on the Iris card, then your decks, most urgent first (like the web's Today). The canvas shows its sample day.
const phoneDecksLogic = `renderVals() { ${T}${DB_JS}
  // A deck's count on the right: cards due now, or (muted) when it's next due.
  const row = (d, right, later) => ({ ...d, right, rightColor: later ? t.muted : t.text, rightFont: later ? 'inherit' : "${MONO}", rightSize: later ? '14px' : '15px' });
  if (db.mock) {
    const caught = !!this.props.caughtUp, next = ['Tomorrow', 'Tomorrow', 'In 2 days', 'In 3 days'];
    return { ${MESH_VALS('Iris')} t, ...chrome, heroHref: 'PhoneReview.dc.html',
      heroMeta: caught ? 'Done for today · 13-day streak' : 'Due now · 12-day streak', heroTitle: caught ? 'All caught up' : '64 cards', heroSize: caught ? '42px' : '56px',
      heroSub: caught ? 'Next review tomorrow · 32 cards' : 'About 11 minutes', heroCta: caught ? 'Learn 10 new cards' : 'Start review',
      decks: ${DECKS}.slice(0, 4).map((d, i) => ({ ...row(d, caught ? next[i] : String(d.due), caught), href: 'PhoneDeck.dc.html' })) };
  }
  const td = db.today(), caught = !td.due, plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const decks = db.decks().filter(d => !d.paused).sort((a, b) => (b.overdue - a.overdue) || (b.due - a.due) || ((a.soon ?? 1e9) - (b.soon ?? 1e9)))
    .map(d => row({ ...d, total: d.totalLabel }, d.due ? String(d.due) : d.soon == null ? (d.fresh ? d.fresh + ' new' : '—') : d.soon === 1 ? 'Tomorrow' : 'In ' + d.soon + ' days', !d.due));
  return { ${MESH_VALS('Iris')} t, ...chrome, decks,
    heroMeta: (caught ? 'Done for today' : 'Due now') + (td.streak ? ' · ' + td.streak + '-day streak' : ''),
    heroTitle: caught ? 'All caught up' : plural(td.due, 'card'), heroSize: caught ? '42px' : '56px',
    heroSub: caught ? (td.next ? 'Next review ' + td.next.day + ' · ' + plural(td.next.n, 'card') : 'Nothing scheduled yet') : 'About ' + plural(td.minutes, 'minute'),
    heroCta: caught ? (td.fresh ? 'Study ' + plural(td.fresh, 'new card') : 'Add cards') : 'Start review',
    // All caught up with nothing new to learn: the card adds cards instead.
    heroHref: caught && !td.fresh ? td.newCardHref : td.studyHref };
}`;

// Check AI cards: tap the card to see its answer (a blank fills in place), then keep or toss it.
const INBOX_ITEMS = `[
  { id: 1, kind: 'cloze', deck: 'Cell Biology', before: 'The', after: 'is the powerhouse of the cell.', back: 'mitochondrion', note: 'It makes most of the cell’s ATP.' },
  { id: 2, kind: 'audio', deck: 'Japanese · JLPT N4', front: 'What word do you hear?', back: 'train', note: '電 electricity + 車 vehicle.' },
  { id: 3, kind: 'image', deck: 'Cell Biology', front: 'Name structure 1.', back: 'Nucleus', note: 'Holds the cell’s DNA.' }
]`;
const phoneInbox = phone(`<div style="height: 100%; box-sizing: border-box; padding: 64px 20px 40px; display: flex; flex-direction: column; gap: 18px;">
  <div style="display: flex; align-items: center; gap: 12px;">${roundBtn('back', 'Back', 'PhoneSettings.dc.html')}<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px;"><span style="font-size: 17px; font-weight: 600;">Check AI cards</span><span style="max-width: 100%; font-size: 12px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckLine}}</span></div><div style="width: 44px; font-family: ${MONO}; font-size: 13px; color: {{t.muted}}; text-align: right;">{{counter}}</div></div>
  <sc-if value="{{hasItem}}" hint-placeholder-val="{{ true }}">
    <div style="flex-grow: 1; position: relative; display: flex; flex-direction: column;">
      <div style="position: absolute; inset: 0; transform: translateY(16px) scale(.94); border-radius: 36px; background: {{t.surf}};"></div>
      ${flipCard('100%', 'auto', '28px 24px', false)}
    </div>
    <div style="display: flex; gap: 12px; padding-top: 8px;">
      <button type="button" onClick="{{toss}}" style="flex-grow: 1; height: 60px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;">Toss</button>
      <button type="button" onClick="{{keep}}" style="flex-grow: 1; height: 60px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;">Keep</button>
    </div>
  </sc-if>
  <sc-if value="{{noItems}}" hint-placeholder-val="{{ false }}">
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;"><span style="width: 72px; height: 72px; border-radius: 36px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center;">${svg(I.check, 30, 2.4)}</span><span style="font-size: 24px; font-weight: 600;">All checked</span><span style="font-size: 15px; color: {{t.muted}};">{{kept}} kept, {{tossed}} tossed</span></div>
    <a href="PhoneSettings.dc.html" style="height: 60px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600;">Done</a>
  </sc-if>
</div>`, '');
const phoneInboxLogic = `
constructor(props) { super(props); this.state = { handled: {}, revealed: false }; }
renderVals() { ${T}
  const done = this.state.handled;
  const items = ${INBOX_ITEMS}.filter(i => !done[i.id]);
  const c = items[0] || { kind: 'basic', front: '', back: '', note: '' };
  const rev = this.state.revealed;
  ${CARD_VIEW_JS}
  const card = cardView({ ...c, image: c.kind === 'image' ? 'mock' : null, backLabel: c.kind === 'image' ? '1 = ' + c.back : '', backBig: c.kind === 'audio' ? '電車' : '', backSub: c.kind === 'audio' ? 'でんしゃ · ' + c.back : undefined }, rev);
  const handle = v => () => this.setState({ revealed: false, moved: true, handled: { ...done, [c.id]: v } });
  const count = v => Object.values(done).filter(x => x === v).length;
  const playing = card.isAudio && !rev;
  return {
    t, card, radius: '36px',
    reveal: () => this.setState({ revealed: !rev, moved: false }),
    flipTransform: rev && !card.isCloze ? 'rotateY(180deg)' : 'rotateY(0deg)',
    flipTrans: this.state.moved ? 'none' : 'transform .5s cubic-bezier(.4,0,.2,1)', cardIn: this.state.moved ? (Object.keys(done).length % 2 ? 'sc-in-a' : 'sc-in-b') : '',
    flipLabel: card.isCloze ? (rev ? 'Hide the answer' : 'Show the blank') : (rev ? 'Flip back' : 'Flip card'),
    clozeShown: rev && card.isCloze,
    blank: ${BLANK_JS},
    bars: ${WAVE_BIG}.map((h, i) => ({ h: h + 'px', anim: playing ? 'scWave .9s ease-in-out ' + ((i % 5) * 0.12).toFixed(2) + 's infinite alternate' : 'none' })),
    keep: handle('kept'), toss: handle('tossed'),
    hasItem: items.length > 0, noItems: items.length === 0,
    deckLine: items.length ? c.deck : '', counter: items.length ? (4 - items.length) + '/3' : '',
    kept: String(count('kept')), tossed: String(count('tossed'))
  };
}`;

const phoneDeck = phone(`<div style="height: 100%; overflow-y: auto; scrollbar-width: none; scroll-timeline: --deck block;"><div style="padding: 0 0 120px; display: flex; flex-direction: column; gap: 16px;">
  <div style="position: relative; height: 232px; overflow: hidden;">
    ${parallax(232)}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 54px 16px 18px 20px; display: flex; flex-direction: column; justify-content: space-between; color: {{coverInk}};">
      <div style="display: flex; justify-content: space-between;">${coverRound('back', 'Back', 'PhoneToday.dc.html')}<div style="display: flex; gap: 8px;">${coverRound('gear', 'Deck settings', '', '{{openSettings}}')}${coverRound('search', 'Search')}${coverRound('plus', 'New card', 'PhoneEditor.dc.html')}</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; text-shadow: {{coverShadow}};"><div style="font-size: 32px; font-weight: 700; letter-spacing: -.03em; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</div><div style="font-size: 14px; opacity: .8;">{{deckLineShort}}</div></div>
    </div>
  </div>
  <div style="padding: 0 20px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
      <sc-for list="{{tiles}}" as="k" hint-placeholder-count="3">${deckTile(false)}</sc-for>
    </div>
    <div style="display: flex; gap: 8px;"><a href="PhoneReview.dc.html" style="flex: 2 1 0; height: 56px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 17px; font-weight: 600; white-space: nowrap;">${svg(I.decks, 17, 2)}<span>{{studyLabel}}</span><sc-if value="{{hasStudyCount}}" hint-placeholder-val="{{ true }}">${STUDY_COUNT(24, 'rgba(128,128,128,.32)', 'inherit')}</sc-if></a><a href="{{learnHref}}" style="flex: 1 1 0; height: 56px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 17px; font-weight: 600; white-space: nowrap;">${svg(I.sparkle, 17, 2)}{{learnShort}}</a></div>
    <div data-sc-list="cards" ref="{{dragList}}" onPointerDown="{{grab}}" style="display: flex; flex-direction: column;">
      <sc-for list="{{rows}}" as="r" hint-placeholder-count="4">
        <a href="{{r.href}}" data-sc-item="{{r.id}}" draggable="false" class="sc-drag" style="display: flex; flex-direction: column; gap: 3px; padding: 12px 0; border-bottom: 1px solid {{t.line}};"><span style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.front}}</span><span style="display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; color: {{t.muted}};"><span style="white-space: nowrap;">{{r.kind}} · {{r.next}}</span>${cardTag('c1')}${cardTag('c2')}${cardMore}</span></a>
      </sc-for>
    </div>
  </div>
</div></div>`, 'Library', `<sc-if value="{{settingsOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Deck settings" style="position: absolute; left: 0; right: 0; bottom: 0; top: 56px; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 14px;">
    ${deckSettingsBody(true)}
  </div>
</sc-if>
${moveTray('tray', true)}`);
const phoneDeckLogic = `
constructor(props) { super(props); this.state = {}; }
renderVals() { ${T}${DB_JS}${COVER_LOGIC}
  ${CARD_TAGS_JS}
  ${LIFT_JS}
  ${CARD_DRAG_JS(true)}
  return { t, dark: !!this.props.dark, ...coverVals, ...cardDrag, tiles: coverVals.tiles.map(k => k.label === 'Due now' ? { ...k, label: 'Due' } : k),
    // Every card (all six sample cards on the canvas, so the page scrolls and shows the cover's parallax); each opens
    // in the editor.
    rows: db.cards(dk.id).map(r => ({ ...r, ...cardFit(r.tags), href: db.mock ? 'PhoneEditor.dc.html' : r.href })),
    learnHref: db.mock ? 'PhoneQuizStart.dc.html' : db.learnOn(dk.id) ? '/learn/' + dk.id : '/deck/' + dk.id + '/learn', learnShort: 'Learn' }; }`;

// The fields scroll under the header when they're taller than the sheet. The keyboard is drawn on the canvas only: in
// the app, the phone shows its own.
const phoneEditor = `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 56px; box-sizing: border-box; padding: 10px 20px 34px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;">
    <div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>
    <div style="display: flex; align-items: center; justify-content: space-between;"><a href="{{phoneBack}}" style="font-size: 16px; color: {{t.muted}}; min-height: 44px; display: flex; align-items: center;">Cancel</a><span style="font-size: 17px; font-weight: 600;">{{title}}</span><a href="{{phoneBack}}" onClick="{{save}}" style="font-size: 16px; font-weight: 600; min-height: 44px; display: flex; align-items: center;">Save</a></div>
    ${TYPE_SEG}
    <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;"><div style="display: flex; flex-direction: column; gap: 16px;">
    ${editorFieldsOf(true)}
    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">${chip(svg(I.decks, 12, 2) + '{{deckName}}', 'height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600;')}${TAG_EDIT('cardTags', 'cardPick', true)}</div>
    <sc-if value="{{canDelete}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{remove}}" style="align-self: flex-start; min-height: 44px; padding: 0; border: 0; background: transparent; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Delete card</button></sc-if>
    </div></div>
  </div>
  <sc-if value="{{drawKb}}" hint-placeholder-val="{{ true }}">${KEYBOARD(FMT_BAR)}</sc-if>
</div>`;

const phoneReview = `<div style="position: relative; isolation: isolate; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  ${studyBgLayer}
  <div style="display: flex; align-items: center; gap: 12px;">
    ${roundBtn('close', 'End review', 'PhoneDone.dc.html')}
    <div style="flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <sc-if value="{{showBar}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; height: 6px; border-radius: 3px; background: {{t.surf}}; overflow: hidden;"><div style="height: 6px; border-radius: 3px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);"></div></div><span style="font-family: ${MONO}; font-size: 13px; color: {{t.muted}};">{{left}}</span></sc-if>
      <sc-if value="{{showCounts}}" hint-placeholder-val="{{ false }}">${COUNTS(true)}</sc-if>
    </div>
    ${settingsBtn}
  </div>
  <div style="position: relative; flex-grow: 1; display: flex; flex-direction: column;">${flipCard('100%', 'auto', '26px 22px', false)}${explainOver(true)}</div>
  <div style="height: 76px; display: flex;">
    <sc-if value="{{showBinary}}" hint-placeholder-val="{{ false }}">
      <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 44px;">
    ${binaryBtns(true)}
      </div>
    </sc-if>
    <sc-if value="{{showPiles}}" hint-placeholder-val="{{ false }}">
      <div style="flex-grow: 1; display: flex; gap: 6px;">
    ${pileTiles(true)}
      </div>
    </sc-if>
    <sc-if value="{{showFour}}" hint-placeholder-val="{{ false }}">
      <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px;">
        <sc-for list="{{grades}}" as="g" hint-placeholder-count="4">
          <button type="button" onClick="{{g.pick}}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; cursor: pointer;"><span style="display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 600;"><span style="width: 7px; height: 7px; border-radius: 4px; background: {{g.color}};"></span>{{g.label}}</span><span style="font-family: ${MONO}; font-size: 11px; color: {{t.muted}};">{{g.interval}}</span></button>
        </sc-for>
      </div>
    </sc-if>
  </div>
  <sc-if value="{{settingsOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <div role="dialog" aria-label="Review settings" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 10px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 18px;">
      <div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>
      <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 18px; font-weight: 600;">Review settings</span><button type="button" onClick="{{toggleSettings}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Done</button></div>
      ${settingsGroups}
    </div>
  </sc-if>
  <sc-if value="{{newPileOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <div role="dialog" aria-label="New pile" style="position: absolute; left: 16px; right: 16px; bottom: ${KB_H + 16}px; box-sizing: border-box; padding: 20px; border-radius: 28px; background: {{t.bg}}; display: flex; flex-direction: column; gap: 14px;">
      ${PILE_FORM}
    </div>
    <sc-if value="{{drawKb}}" hint-placeholder-val="{{ true }}">${KEYBOARD()}</sc-if>
  </sc-if>
</div>`;

const phoneDone = phone(`<div style="height: 100%; box-sizing: border-box; padding: 64px 20px 34px; display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">${METER(260, 20)}<span style="font-size: 14px; font-weight: 600; color: {{meter.ink}};">{{goalLine}}</span></div>
  <div style="display: flex; flex-direction: column; gap: 6px;"><div style="font-size: 30px; font-weight: 700; letter-spacing: -.03em;">Session complete</div><div style="font-size: 15px; color: {{t.muted}};">{{summaryShort}}</div></div>
  <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left;">${splitBar}</div>
  <div style="width: 100%; display: flex; gap: 8px;"><div style="flex-grow: 1; background: {{t.surf}}; border-radius: 22px; padding: 14px; text-align: left;"><div style="font-size: 12px; color: {{t.muted}};">Streak</div><div style="font-size: 20px; font-weight: 700;">{{streakLabel}}</div></div><div style="flex-grow: 1; background: {{t.surf}}; border-radius: 22px; padding: 14px; text-align: left;"><div style="font-size: 12px; color: {{t.muted}};">Next</div><div style="font-size: 20px; font-weight: 700;">{{nextShort}}</div></div></div>
  <div style="flex-grow: 1;"></div>
  <a href="PhoneToday.dc.html" style="width: 100%; height: 58px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600;">Done</a>
</div>`, '');
const phoneDonePiles = phoneDone.replace(/<div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">[\s\S]*?\{\{goalLine\}\}<\/span><\/div>/, () => donePiles(false)).replace(noSplit, () => '');

const phoneStats = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 14px;">
  ${pTitle('Stats')}
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
    <sc-for list="{{kpis}}" as="k" hint-placeholder-count="4"><div style="background: {{t.surf}}; border-radius: 24px; padding: 16px; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; color: {{t.muted}};">{{k.label}}</span><span style="font-size: 28px; font-weight: 700; letter-spacing: -.03em;">{{k.value}}</span></div></sc-for>
  </div>
  <div style="background: {{t.surf}}; border-radius: 28px; padding: 18px; display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 15px; font-weight: 600;">Study days</span><span style="display: flex; align-items: center; gap: 5px; font-size: 12px; color: {{t.muted}};">Less<sc-for list="{{legend}}" as="l" hint-placeholder-count="5"><span style="width: 12px; height: 12px; border-radius: 4px; background: {{l.c}}; box-shadow: {{l.edge}};"></span></sc-for>More</span></div>
    <div style="display: grid; grid-template-rows: repeat(7, 14px); grid-auto-flow: column; grid-auto-columns: 14px; gap: 4px;"><sc-for list="{{heat}}" as="h" hint-placeholder-count="40"><div style="border-radius: 4px; background: {{h.c}}; box-shadow: {{h.edge}};"></div></sc-for></div>
  </div>
  <div style="background: {{t.surf}}; border-radius: 28px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
    ${DUE_HEAD('Next 7 days', true)}
    ${DUE_BARS(7, 6, 6)}
  </div>
</div>`, 'Stats');
// Your last 30 days, the last 17 weeks of study days, and the cards due each day this week (the canvas: its sample).
const phoneStatsLogic = `renderVals() { ${T}${DB_JS}
  const st = db.stats('Month'), plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  ${HEAT_LOGIC(17)}${FORECAST_JS('db.today().forecast', 60)}
  return { t, heat: st.heat ? st.heat.slice(-17 * 7).map(cell) : heat, legend, forecast, dueTotal, busy,
    kpis: [{ label: 'Streak', value: plural(st.streak, 'day') }, { label: 'Remembered', value: st.remembered == null ? '—' : st.remembered + '%' }, { label: 'Reviews', value: st.reviews }, { label: 'Cards', value: st.cards }] }; }`;

const phoneConnect = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 16px;">
  ${pTitle('Connect AI')}
  <div style="font-size: 15px; line-height: 1.45; color: {{t.muted}};">Make cards from any chat: text, fill-in-the-blank, images, and audio.</div>
  ${meshCard('hero', 'border-radius: 32px;', 'box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; gap: 12px;', `
    <span style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .8;">Your MCP link</span>
    <span style="font-family: ${MONO}; font-size: 14px; white-space: nowrap; padding: 14px 16px; border-radius: 999px; ${glass}">{{mcpUrl}}</span>
    <button type="button" onClick="{{copy}}" style="height: 48px; border: 0; border-radius: 999px; background: #FFFFFF; color: #000000; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">{{copyLabel}}</button>`)}
  <div style="display: flex; flex-direction: column;">
    <sc-for list="{{providers}}" as="p" hint-placeholder-count="4">
      <div style="display: flex; align-items: center; gap: 12px; min-height: 60px; border-bottom: 1px solid {{t.line}};"><span style="width: 38px; height: 38px; border-radius: 19px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${PROVIDER_LOGO(20)}</span><span style="flex-grow: 1; font-size: 16px; font-weight: 500;">{{p.name}}</span><span style="font-size: 13px; font-weight: 600; color: {{p.color}};">{{p.status}}</span></div>
    </sc-for>
  </div>
</div>`, 'Connect');
// Your MCP link runs on past its pill to the card's edge, as on the canvas.
const phoneConnectLogic = `
constructor(props) { super(props); this.state = { copied: false }; }
renderVals() { ${T}${DB_JS}
  const ai = db.ai();
  ${PROVIDERS('ai.clients')}
  return { ${MESH_VALS('Apricot')} t, providers, mcpUrl: ai.url, copyLabel: this.state.copied ? 'Copied' : 'Copy link', copy: () => { db.act.copy(ai.url); this.setState({ copied: true }); } }; }`;

// iPhone Settings, from the gear on Today. Appearance switches this screen right away, and so does Dark mode (gray or
// black, for whenever the app is dark). The page scrolls; the board is tall enough to show all of it.
const PHONE_SETTINGS_H = 1100;
const sRow = (label, right, { href = '', sub = '', click = '' } = {}) => {
  const inner = `<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px;">${label}</span>${sub ? `<span style="font-size: 12px; color: {{t.muted}};">${sub}</span>` : ''}</span>${right}`;
  const st = 'min-height: 52px; box-sizing: border-box; padding: 8px 16px; display: flex; align-items: center; gap: 12px;';
  return href ? `<a href="${href}" style="${st}">${inner}</a>` : click ? `<button type="button" onClick="{{${click}}}" style="${st} width: 100%; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer;">${inner}</button>` : `<div style="${st}">${inner}</div>`;
};
const sVal = v => `<span style="display: flex; align-items: center; gap: 6px; font-size: 15px; color: {{t.muted}}; white-space: nowrap;">${v}${svg(I.chev, 14, 2.2)}</span>`;
// A row that picks from a list: tapping it opens the phone's own picker (an invisible <select> over the row, with 16px
// text so the phone doesn't zoom in), like the iPhone app's menus. `k` names a renderVals object made by pickOf()
// (phoneSettingsLogic); `options` are [value, label].
const sPick = (label, k, options) => `<div style="position: relative;">${sRow(label, sVal(`{{${k}.label}}`))}<select onChange="{{${k}.set}}" ref="{{${k}.ref}}" aria-label="${label}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; font-size: 16px; cursor: pointer;">${options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>`;
const S_LINE = '<div style="height: 1px; margin-left: 16px; background: {{t.bg}};"></div>';
const sGroup = (title, rows) => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="padding: 0 4px; font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">${title}</span><div style="border-radius: 24px; background: {{t.surf}}; overflow: hidden;">${rows.join(S_LINE)}</div></div>`;
const PRO_BADGE = '<span style="height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; background: linear-gradient(90deg, #7E94FB, #2CB2EA); color: #FFFFFF; font-size: 12px; font-weight: 700; letter-spacing: .01em;">Pro</span>';
// Settings → Plan: Free, with a way to Go Pro; or Pro, when it renews (or ends), and Stripe's page to manage or cancel it.
// Online only: on your own computer everything is on, so there's no plan to show.
const PRO_PILL = `<a href="{{proHref}}" style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 14px; font-weight: 600; white-space: nowrap;">Go Pro</a>`;
const planGroups = `<sc-if value="{{planFree}}" hint-placeholder-val="{{ false }}">${sGroup('Plan', [sRow('Free', PRO_PILL, { sub: 'Pro adds Learn mode, photo covers, and more' })])}</sc-if>
      <sc-if value="{{planPro}}" hint-placeholder-val="{{ true }}">${sGroup('Plan', [
        sRow(`<span style="display: inline-flex; align-items: center; gap: 8px;">Lucida ${PRO_BADGE}</span>`, '', { sub: '{{planSub}}' }),
        sRow('Manage plan', sVal(''), { href: '{{manageHref}}' }),
        `<sc-if value="{{planRenews}}" hint-placeholder-val="{{ true }}">${sRow('<span style="color: {{t.again}};">Cancel Pro</span>', '', { href: '{{manageHref}}' })}</sc-if><sc-if value="{{planEnding}}" hint-placeholder-val="{{ false }}">${sRow('Keep Pro', sVal(''), { href: '{{manageHref}}' })}</sc-if>`
      ])}</sc-if>`;
// The plan's values for renderVals: the app's plan (db.plan()), or on the canvas the board's `plan` setting.
const PLAN_JS = pricingBoard => `const planOf = { Free: { pro: false }, Pro: { pro: true, every: 'year', until: '2027-09-24T12:00:00Z', ending: false, manage: '#' }, 'Pro, ending': { pro: true, every: 'year', until: '2027-09-24T12:00:00Z', ending: true, manage: '#' } };
  const plan = db.mock ? planOf[this.props.plan] || planOf.Pro : db.plan && db.plan();
  const planDay = plan && plan.until ? new Date(plan.until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const planVals = { planFree: !!plan && !plan.pro, planPro: !!plan && !!plan.pro, planRenews: !!plan && !plan.ending, planEnding: !!plan && !!plan.ending,
    planSub: plan ? [({ month: 'Monthly', year: 'Yearly' })[plan.every] || '', planDay ? (plan.ending ? 'ends ' : 'renews ') + planDay : ''].filter(Boolean).join(' · ') : '',
    manageHref: plan && plan.manage || 'https://lucida.cards/pricing', proHref: db.mock ? '${pricingBoard}.dc.html' : 'https://lucida.cards/pricing' };`;
const phoneSettings = phone(`<div style="padding: 64px 20px 34px; display: flex; flex-direction: column; gap: 18px;">
  <div style="display: flex; align-items: center; gap: 12px;">${roundBtn('back', 'Back', 'PhoneToday.dc.html')}<div style="flex-grow: 1; font-size: 17px; font-weight: 600; text-align: center;">Settings</div><div style="width: 44px;"></div></div>
  <button type="button" onClick="{{account}}" style="width: 100%; border: 0; border-radius: 24px; background: {{t.surf}}; padding: 14px 16px; display: flex; align-items: center; gap: 14px; color: inherit; font: inherit; text-align: left; cursor: pointer;">${AVATAR_ME(44)}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 600;">Your account</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{accountSub}}</span></span><span style="display: flex; color: {{t.muted}};">${svg(I.chev, 14, 2.2)}</span></button>
  ${planGroups}
  ${sGroup('Studying', [
    sPick('Daily reminder', 'reminder', ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '6:00 PM', '8:00 PM', '9:00 PM'].map(x => [x, x])),
    sPick('New cards a day', 'perDay', [0, 5, 10, 15, 20, 30, 50].map(n => [n, n])),
    sPick('Remember goal', 'goal', [80, 85, 90, 93, 95].map(n => [n, n + '%'])),
    sRow('Schedule with FSRS', SWITCH('fsrsSw', 'toggleFsrs', 'Schedule with FSRS'), { sub: '{{fsrsSub}}' })
  ])}
  ${sGroup('Look', [sRow('Appearance', SEG('looks', 'Appearance')), sRow('Dark mode', SEG('darks', 'Dark mode', 2), { sub: 'When the app is dark' }), sRow('Card gradients', SEG('grads', 'Card gradients'))])}
  ${sGroup('Your AI', [
    sRow('Connected apps', sVal('{{connected}}'), { href: 'PhoneConnect.dc.html' }),
    sRow('Check AI cards first', SWITCH('checkSw', 'toggleCheck', 'Check AI cards first'))
      + `<sc-if value="{{hasInbox}}" hint-placeholder-val="{{ true }}">${S_LINE}${sRow('Cards to check', sVal('{{toCheck}}'), { href: 'PhoneInbox.dc.html' })}</sc-if>`
  ])}
</div>`, '', '', PHONE_SETTINGS_H);
const phoneSettingsLogic = `
renderVals() {
  const db = this.props.db || this.mock(), chrome = db.chrome(), st = db.settings();
  // Appearance: on the canvas System follows the board's dark setting, and Light and Dark switch this screen right
  // away; in the app the whole app switches.
  const look = st.look, darkMode = st.darkMode === 'gray' ? 'gray' : 'black';
  const t = this.theme(db.mock ? look === 'dark' || (look === 'system' && !!this.props.dark) : !!this.props.dark, db.mock ? darkMode === 'gray' : !!this.props.dim);
  ${SW_JS}
  ${OPTS_JS}
  const set = patch => db.act.setSettings(patch), piles = st.grading === 'piles';
  // A row's list (sPick): the value it shows, and saving a pick. The list shows the current value as picked.
  const pickOf = (cur, label, save) => ({ label, set: e => save(e.target.value), ref: el => { if (el && el.value !== String(cur)) el.value = String(cur); } });
  ${PLAN_JS('PricingPhone')}
  return {
    t, ...chrome, ...planVals,
    // Your account: tap it to sign out (online).
    accountSub: db.mock ? 'Synced on all your devices · just now' : st.sub,
    account: () => { if (!db.mock && st.signedIn && confirm('Sign out of Lucida?')) db.act.signOut(); },
    reminder: pickOf(st.reminder, st.reminder, v => set({ reminder: v })),
    perDay: pickOf(st.perDay, String(st.perDay), v => set({ perDay: +v })),
    goal: pickOf(st.goal, st.goal + '%', v => set({ goal: +v })),
    fsrsSw: sw(st.fsrs && !piles, !piles), toggleFsrs: () => !piles && set({ fsrs: !st.fsrs }),
    fsrsSub: piles ? 'Off while you grade with piles' : 'For 4 grades and ✓ / ✗',
    looks: opts([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], look, id => set({ look: id })),
    darks: opts([['gray', 'Gray'], ['black', 'Black']], darkMode, id => set({ darkMode: id })),
    grads: opts([['mix', 'Mix'], ['vivid', 'Vivid'], ['deep', 'Deep']], st.grads, id => set({ grads: id })),
    connected: db.ai().connected,
    checkSw: sw(st.check), toggleCheck: () => db.act.setPerm('check', !st.check),
    // Checking AI cards has its own page on the canvas only; in the app they wait in their deck.
    hasInbox: !!db.mock, toCheck: '3'
  };
}`;

// Web Settings, from "You" at the bottom of the sidebar. Profile picture: the Google photo, or a color.
// Stand-in for a Google profile photo.
const PHOTO = size => `<span role="img" aria-label="Google profile photo" style="width: ${size}px; height: ${size}px; flex-shrink: 0; border-radius: ${size / 2}px; overflow: hidden; background: linear-gradient(160deg, #FFD9A8 0%, #F59E6B 55%, #D9677A 100%); display: flex;"><svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="26" r="11" fill="rgba(255,255,255,.92)"/><path d="M11 64c1.5-12 10-19 21-19s19.5 7 21 19z" fill="rgba(255,255,255,.92)"/></svg></span>`;
const webSettings = webRoot(`${sidebar('You')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 24px; min-width: 0;">
  <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Settings</h1>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start;">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="border-radius: 18px; background: {{t.surf}}; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <sc-if value="{{photoColor}}" hint-placeholder-val="{{ true }}"><span style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 20px; background: {{avatarBg}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 600;">{{initial}}</span></sc-if>
          <sc-if value="{{photoGoogle}}" hint-placeholder-val="{{ false }}">${PHOTO(64)}</sc-if>
          <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;"><span style="font-size: 18px; font-weight: 600;">{{name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{sub}}</span></span>
          <sc-if value="{{signedIn}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{signOut}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Sign out</button></sc-if>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 14px; font-weight: 600;">Profile picture</span><sc-if value="{{google}}" hint-placeholder-val="{{ true }}">${SEG('photoOpts', 'Profile picture', 2)}</sc-if></div>
          <sc-if value="{{photoColor}}" hint-placeholder-val="{{ true }}"><div role="group" aria-label="Circle color" style="display: flex; gap: 10px;"><sc-for list="{{swatches}}" as="w" hint-placeholder-count="6"><button type="button" onClick="{{w.pick}}" aria-label="{{w.label}}" aria-pressed="{{w.pressed}}" style="width: 34px; height: 34px; border: 0; border-radius: 17px; background: {{w.bg}}; box-shadow: {{w.ring}}; cursor: pointer;"></button></sc-for></div></sc-if>
          <sc-if value="{{photoGoogle}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">Uses the photo on your Google account. Change it there and it updates here.</span></sc-if>
        </div>
      </div>
      ${sGroup('Studying', [
        sRow('Daily reminder', sVal('{{reminder}}')),
        sRow('New cards a day', miniStep('perDay', 'lessDay', 'moreDay', '{{t.bg}}', 'perDayIn')),
        sRow('Remember goal', miniStep('goal', 'lessGoal', 'moreGoal')),
        sRow('Schedule with FSRS', SWITCH('fsrsSw', 'toggleFsrs', 'Schedule with FSRS'), { sub: '{{fsrsSub}}' }),
        sRow('Grade with', SEG('gradeOpts', 'Grade with')),
        sRow('Progress', SEG('progOpts', 'Progress'))
      ])}
      ${sGroup('Your data', [
        sRow('Import cards', sVal('Anki, Quizlet, or CSV'), { href: 'WebImport.dc.html' }),
        sRow('Export all cards', sVal(''), { click: 'exportAll' }),
        sRow('<span style="color: {{t.again}};">Delete account</span>', '', { click: 'deleteAccount' })
      ])}
    </div>
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${planGroups}
      ${sGroup('Look', [
        sRow('Appearance', SEG('looks', 'Appearance')),
        sRow('Dark mode', SEG('darks', 'Dark mode', 2), { sub: 'When the app is dark' }),
        `<div style="padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; align-items: center; gap: 12px;"><span style="flex-grow: 1; font-size: 16px;">Card gradients</span>${SEG('grads', 'Card gradients')}</div><div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;"><sc-for list="{{gradPreview}}" as="k" hint-placeholder-count="4">${meshCard('k', 'height: 60px; border-radius: 14px;', 'height: 100%; box-sizing: border-box; padding: 8px 10px; display: flex; align-items: flex-end; font-size: 11px; font-weight: 600;', '{{k.name}}')}</sc-for></div></div>`
      ])}
      ${sGroup('Your AI', [
        sRow('Connected apps', sVal('{{connected}}'), { href: 'WebConnect.dc.html' }),
        sRow('Check AI cards first', SWITCH('checkSw', 'toggleCheck', 'Check AI cards first'), { sub: 'They wait in their deck until you keep them' })
      ])}
    </div>
  </div>
</main>`);
const webSettingsLogic = `
renderVals() {
  const db = this.props.db || this.mock(), chrome = db.chrome(), st = db.settings();
  // Appearance and Dark mode: on the canvas System follows the board's dark setting; in the app the whole app switches.
  const look = st.look, darkMode = st.darkMode === 'gray' ? 'gray' : 'black';
  const t = this.theme(db.mock ? look === 'dark' || (look === 'system' && !!this.props.dark) : !!this.props.dark, db.mock ? darkMode === 'gray' : !!this.props.dim);
  ${SW_JS}
  ${OPTS_JS}
  const set = patch => db.act.setSettings(patch);
  ${NUM_JS}
  const colors = [['Periwinkle', 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)'], ['Orange', 'linear-gradient(135deg, #FFC857 0%, #EE5A36 100%)'], ['Green', 'linear-gradient(135deg, #7EE0B0 0%, #1F8F5F 100%)'], ['Pink', 'linear-gradient(135deg, #F9A8D4 0%, #D6336C 100%)'], ['Teal', 'linear-gradient(135deg, #7DE3F0 0%, #0E8A9E 100%)'], ['Violet', 'linear-gradient(135deg, #C4A7FF 0%, #7C3AED 100%)']];
  const piles = st.grading === 'piles', photo = st.google ? st.photo : 'color';
  ${PLAN_JS('Pricing')}
  return {
    t, ...chrome, grain: String(this.props.grain ?? 0.7), ...planVals,
    name: st.name, sub: st.sub, signedIn: st.signedIn, google: st.google, initial: chrome.me.initial,
    avatarBg: colors[st.color][1], photoColor: photo === 'color', photoGoogle: photo === 'google',
    photoOpts: opts([['google', 'Google photo'], ['color', 'Color']], photo, id => set({ photo: id })),
    swatches: colors.map(([label, bg], i) => ({ label, bg, pressed: i === st.color ? 'true' : 'false', ring: i === st.color ? '0 0 0 2px ' + t.surf + ', 0 0 0 4px ' + t.text : 'none', pick: () => set({ color: i }) })),
    looks: opts([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], look, id => set({ look: id })),
    darks: opts([['gray', 'Gray'], ['black', 'Black']], darkMode, id => set({ darkMode: id })),
    grads: opts([['mix', 'Mix'], ['vivid', 'Vivid'], ['deep', 'Deep']], st.grads, id => set({ grads: id })),
    gradPreview: ['Cell Biology', 'Japanese', 'Chemistry', 'History'].map(n => ({ ...this.gen(n, st.grads), name: n })),
    gradeOpts: opts([['four', '4 grades'], ['binary', '✓ / ✗'], ['piles', 'Piles']], st.grading, id => set({ grading: id })),
    progOpts: opts([['bar', 'Bar'], ['counts', 'Counts'], ['none', 'None']], st.prog, id => set({ prog: id })),
    fsrsSw: sw(st.fsrs && !piles, !piles), toggleFsrs: () => !piles && set({ fsrs: !st.fsrs }),
    fsrsSub: piles ? 'Off while you grade with piles' : 'For 4 grades and ✓ / ✗',
    checkSw: sw(st.check), toggleCheck: () => db.act.setPerm('check', !st.check),
    perDay: String(st.perDay), goal: st.goal + '%', perDayIn: typed('perDay', st.perDay, n => set({ perDay: n }), 'New cards a day'),
    lessDay: () => set({ perDay: Math.max(0, st.perDay - 5) }), moreDay: () => set({ perDay: Math.min(999, st.perDay + 5) }),
    lessGoal: () => set({ goal: Math.max(70, st.goal - 1) }), moreGoal: () => set({ goal: Math.min(97, st.goal + 1) }),
    reminder: st.reminder, connected: db.ai().connected,
    exportAll: () => db.act.exportAll(), deleteAccount: () => db.act.resetAll(), signOut: () => db.act.signOut && db.act.signOut()
  };
}`;

// Icon options for Stats and Connect AI. Pick one in each row; the sidebar on the left shows the picks.
const STATS_ICONS = [
  ['Bars', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
  ['Bars in a box (picked)', I.stats],
  ['Trend line', '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'],
  ['Pie', '<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"/>'],
  ['Pulse', '<path d="M3 12h4l3-8 4 16 3-8h4"/>'],
  ['Target', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>']
];
const CONNECT_ICONS = [
  ['Plug', '<path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v5"/>'],
  ['Puzzle piece', '<path d="M4 8h3.5a2.5 2.5 0 1 1 5 0H16v3.5a2.5 2.5 0 1 1 0 5V20H4z"/>'],
  ['Link (picked)', I.connect],
  ['Sparkle', I.sparkle],
  ['Network', '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6h7M7.2 8.2l3.6 7.6M16.8 8.2l-3.6 7.6"/>'],
  ['Bot', '<rect x="4" y="8" width="16" height="11" rx="3.5"/><path d="M12 8V5.5"/><circle cx="12" cy="4.2" r="1.2"/><path d="M9 13h.01M15 13h.01M9.5 16h5"/>']
];
const optTile = (group, label) => ([name, path], i) => `<button type="button" onClick="{{${group}.o${i}.pick}}" aria-pressed="{{${group}.o${i}.pressed}}" style="position: relative; border: 0; border-radius: 24px; padding: 16px; background: {{t.surf}}; box-shadow: {{${group}.o${i}.ring}}; color: {{t.text}}; font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; text-align: left;">
  <span style="width: 52px; height: 52px; border-radius: 16px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(path, 26, 1.8)}</span>
  <span style="font-size: 14px; font-weight: 600;">${name}</span>
  <span style="width: 100%; box-sizing: border-box; height: 36px; padding: 0 12px; display: flex; align-items: center; gap: 10px; border-radius: 999px; background: {{t.bg}}; font-size: 13px; color: {{t.muted}};">${svg(path, 16, 1.8)}${label}</span>
  <sc-if value="{{${group}.o${i}.on}}" hint-placeholder-val="{{ ${i === 0} }}"><span style="position: absolute; top: 14px; right: 14px; width: 24px; height: 24px; border-radius: 12px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center;">${svg(I.check, 13, 3)}</span></sc-if>
</button>`;
const navItem = (label, icon, active = false) => `<div style="display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-radius: 999px; font-size: 14px; ${active ? 'background: {{t.surf}}; color: {{t.text}}; font-weight: 600;' : 'color: {{t.muted}};'}">${icon}${label}</div>`;
const pickIcon = (group, list) => list.map(([, path], i) => `<sc-if value="{{${group}.o${i}.on}}" hint-placeholder-val="{{ ${i === 0} }}">${svg(path)}</sc-if>`).join('');
const iconSection = (title, group, list, label) => `<section style="display: flex; flex-direction: column; gap: 12px;"><span style="font-size: 18px; font-weight: 600;">${title}</span><div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px;">${list.map(optTile(group, label)).join('')}</div></section>`;
const iconOptions = `<div style="width: 1440px; height: 900px; box-sizing: border-box; padding: 56px 64px; display: flex; flex-direction: column; gap: 32px; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 40px; font-weight: 600; letter-spacing: -.03em;">Icon options</h1><p style="margin: 0; font-size: 16px; color: {{t.muted}};">Pick one for Stats and one for Connect AI. The sidebar on the left shows your picks.</p></div>
  <div style="display: flex; gap: 40px;">
    <div style="width: 240px; flex-shrink: 0; align-self: flex-start; box-sizing: border-box; padding: 20px 14px; border-radius: 28px; box-shadow: 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 4px;">
      <div style="padding: 0 12px 22px;">${logo()}</div>
      ${navItem('Today', svg(I.today))}${navItem('Decks', svg(I.decks))}${navItem('Stats', pickIcon('stats', STATS_ICONS), true)}${navItem('Connect AI', pickIcon('connect', CONNECT_ICONS))}
    </div>
    <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 28px;">
      ${iconSection('Stats', 'stats', STATS_ICONS, 'Stats')}
      ${iconSection('Connect AI', 'connect', CONNECT_ICONS, 'Connect AI')}
    </div>
  </div>
</div>`;
const iconOptionsLogic = `
constructor(props) { super(props); this.state = { stats: 1, connect: 2 }; }
renderVals() {
  ${T}
  const opt = (group, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => { const on = this.state[group] === i; return ['o' + i, { on, pressed: on ? 'true' : 'false', ring: on ? 'inset 0 0 0 2px ' + t.text : 'none', pick: () => this.setState({ [group]: i }) }]; }));
  return { t, stats: opt('stats', ${STATS_ICONS.length}), connect: opt('connect', ${CONNECT_ICONS.length}) };
}`;

// ---------- Empty states ----------
// A small stack of blank cards, each in its own gradient: Iris on top, Mint and Apricot behind. It floats in a soft
// light, the back cards fan in and out, and a shine crosses the top card now and then (APP_MOTION_CSS).
const EMPTY_ART = (w, icon) => { const r = Math.round(w * 0.14); return `<div aria-hidden="true" style="position: relative; isolation: isolate; width: ${w}px; height: ${Math.round(w * 0.8)}px;">
  <div class="sc-glow" style="position: absolute; left: -45%; right: -45%; top: -40%; bottom: -50%; z-index: -1; background: radial-gradient(closest-side, {{t.surf}}, transparent);"></div>
  <div class="sc-float" style="position: absolute; inset: 0;">
  ${meshCard('art3', `position: absolute; left: 10%; top: 18%; width: 70%; height: 68%; border-radius: ${r}px; transform: rotate(-9deg); box-shadow: 0 10px 24px -14px rgba(0,0,0,.35);`, 'height: 100%;', '', 'div', ' class="sc-sway-a"')}
  ${meshCard('art2', `position: absolute; left: 22%; top: 12%; width: 70%; height: 68%; border-radius: ${r}px; transform: rotate(6deg); box-shadow: 0 10px 24px -14px rgba(0,0,0,.35);`, 'height: 100%;', '', 'div', ' class="sc-sway-b"')}
  ${meshCard('art', `position: absolute; left: 15%; top: 4%; width: 70%; height: 68%; border-radius: ${r}px; box-shadow: 0 14px 30px -14px rgba(0,0,0,.4);`, 'height: 100%; display: flex; align-items: center; justify-content: center;', `<span style="display: flex; opacity: .9;">${svg(I[icon], Math.round(w * 0.2), 2)}</span><span class="sc-sheen"></span>`)}
  </div>
</div>`; };
const emptyBlock = ({ art, title, body, actions = '', size = 24, w = 420 }) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center;">${art}<div style="max-width: ${w}px; display: flex; flex-direction: column; gap: 8px;"><span style="font-size: ${size}px; font-weight: 600; letter-spacing: -.02em;">${title}</span><span style="font-size: 15px; line-height: 1.5; color: {{t.muted}};">${body}</span></div>${actions}</div>`;
const webActions = btns => `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding-top: 2px;">${btns}</div>`;
const phoneBtn = (label, href, icon = '', inv = false) => `<a href="${href}" style="height: 52px; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 600; ${inv ? 'background: {{t.inv}}; color: {{t.invText}};' : 'background: {{t.surf}};'}">${icon ? svg(I[icon], 17, 2) : ''}${label}</a>`;
// On phones: one black button, then the lighter choices side by side (like the web's row of pills).
const phoneBtn2 = (label, href, icon) => `<a href="${href}" style="flex: 1 1 0; min-width: 0; height: 48px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 15px; font-weight: 600; white-space: nowrap;">${svg(I[icon], 16, 2)}${label}</a>`;
const phoneActionRow = (primary, a, b) => `<div style="align-self: stretch; width: 100%; display: flex; flex-direction: column; gap: 10px; padding-top: 2px;">${primary}<div style="display: flex; gap: 10px;">${a}${b}</div></div>`;
// The web's Get started tiles, sized for a phone: Make a deck runs across in black, the other two sit side by side.
const phoneStartTile = (icon, title, body, href, primary = false) => primary
  ? `<a href="${href}" style="box-sizing: border-box; padding: 18px; border-radius: 22px; display: flex; align-items: center; gap: 14px; background: {{t.inv}}; color: {{t.invText}};"><span style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: rgba(128,128,128,.28); display: flex; align-items: center; justify-content: center;">${svg(I[icon], 20, 2)}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 3px;"><span style="font-size: 17px; font-weight: 600;">${title}</span><span style="font-size: 13px; opacity: .7;">${body}</span></span><span style="display: flex; opacity: .7;">${svg(I.chev, 14, 2.2)}</span></a>`
  : `<a href="${href}" style="flex: 1 1 0; min-width: 0; min-height: 148px; box-sizing: border-box; padding: 18px; border-radius: 22px; display: flex; flex-direction: column; gap: 6px; background: {{t.surf}};"><span style="width: 36px; height: 36px; border-radius: 18px; background: rgba(128,128,128,.18); display: flex; align-items: center; justify-content: center;">${svg(I[icon], 18, 2)}</span><span style="flex-grow: 1;"></span><span style="font-size: 16px; font-weight: 600;">${title}</span><span style="font-size: 13px; line-height: 1.4; color: {{t.muted}};">${body}</span></a>`;
const startTile = (icon, title, body, href, primary = false) => `<a href="${href}" style="min-height: 190px; box-sizing: border-box; padding: 22px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px; ${primary ? 'background: {{t.inv}}; color: {{t.invText}};' : 'background: {{t.surf}};'}"><span style="width: 36px; height: 36px; border-radius: 18px; background: rgba(128,128,128,.18); display: flex; align-items: center; justify-content: center;">${svg(I[icon], 20, 2)}</span><span style="flex-grow: 1;"></span><span style="font-size: 17px; font-weight: 600;">${title}</span><span style="font-size: 14px; line-height: 1.45; ${primary ? 'opacity: .7;' : 'color: {{t.muted}};'}">${body}</span></a>`;
const emptyWeek = `<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px;">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;"><div style="width: 28px; height: 28px; border-radius: 14px; background: {{t.surf2}};${i === 1 ? ' box-shadow: 0 0 0 2px {{t.surf}}, 0 0 0 4px {{t.muted}};' : ''}"></div><span style="font-size: 11px; ${i === 1 ? 'font-weight: 600; color: {{t.text}};' : 'color: {{t.muted}};'}">${d}</span></div>`).join('')}</div>`;
const webTodayNew = webRoot(`${sidebar('Today')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; gap: 40px;">
  <section style="flex-grow: 1; display: flex; flex-direction: column; gap: 32px; min-width: 0;">
    ${meshCard('hero', 'border-radius: 20px; height: 160px; flex-shrink: 0;', 'height: 100%; box-sizing: border-box; padding: 28px 32px; display: flex; align-items: flex-end;', `
      <div style="display: flex; flex-direction: column; gap: 10px;"><div style="font-size: 14px; opacity: .8;">{{date}}</div><h1 style="margin: 0; font-size: 42px; font-weight: 500; line-height: 1; letter-spacing: -.04em;">Welcome</h1><div style="font-size: 14px; opacity: .8;">Nothing to study yet. Start with a deck.</div></div>`)}
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${eyebrow('Get started')}
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;">
        ${startTile('plus', 'Make a deck', 'Start from scratch and add your own cards.', 'WebNewDeck.dc.html', true)}
        ${startTile('upload', 'Import cards', 'Bring your decks from Anki, Quizlet, or a CSV file.', 'WebImport.dc.html')}
        ${startTile('connect', 'Connect your AI', 'Let Claude or ChatGPT make cards for you.', 'WebConnect.dc.html')}
      </div>
    </div>
  </section>
  <aside style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;"><span style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf2}}; color: {{t.muted}}; display: flex; align-items: center; justify-content: center;">${svg(I.flame, 18, 2)}</span><span style="display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 15px; font-weight: 600;">No streak yet</span><span style="font-size: 12px; color: {{t.muted}};">Study today to start one</span></span></div>
      ${emptyWeek}
    </div>
    <div style="background: {{t.surf}}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 600;">Cards due each day</span><span style="font-size: 12px; color: {{t.muted}};">Next 7 days</span></div>
      <div style="height: 76px; display: flex; align-items: flex-end; gap: 8px;">${Array.from({ length: 7 }, () => '<div style="flex: 1 1 0; height: 6px; border-radius: 3px; background: {{t.surf2}};"></div>').join('')}</div>
      <span style="font-size: 12px; color: {{t.muted}};">Nothing scheduled yet</span>
    </div>
  </aside>
</main>`);
const webDecksEmpty = webRoot(`${sidebar('Library')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 28px; min-width: 0;">
  <div style="display: flex; align-items: center; gap: 12px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; flex-grow: 1;">Library</h1>${pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' })}</div>
  <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; padding-bottom: 60px;">
    ${emptyBlock({ art: EMPTY_ART(170, 'plus'), title: 'No decks yet', body: 'Make one, bring your cards from Anki or Quizlet, or let your AI make them for you.', actions: webActions(pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' }) + pill('Import cards', { icon: 'upload', href: 'WebImport.dc.html' }) + pill('Connect your AI', { icon: 'connect', href: 'WebConnect.dc.html' })) })}
  </div>
</main>`);
const webDeckEmpty = webRoot(`${sidebar('Library')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 24px 48px 20px; display: flex; flex-direction: column; gap: 20px; min-width: 0;">
  <div style="position: relative; height: 184px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">
    ${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 20px 24px 24px 28px; display: flex; flex-direction: column; justify-content: space-between; color: {{cover.ink}};">
      <div style="display: flex; align-items: center; justify-content: space-between;"><a href="WebDecks.dc.html" style="height: 36px; padding: 0 14px 0 10px; display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; ${onCover} font-size: 13px; font-weight: 600;">${svg(I.back, 14, 2.2)}Library</a>${coverBtn('Deck settings', 'openSettings', 'gear')}</div>
      <div style="display: flex; flex-direction: column; gap: 6px; text-shadow: {{cover.shadow}};"><h1 style="margin: 0; font-size: 34px; font-weight: 600; letter-spacing: -.035em; line-height: 1;">{{deckName}}</h1><div style="font-size: 14px; opacity: .8;">No cards yet</div></div>
    </div>
  </div>
  <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; padding-bottom: 40px;">
    ${emptyBlock({ art: EMPTY_ART(150, 'plus'), title: 'This deck is empty', body: 'Add your first card, import some, or ask your AI to make them.', actions: webActions(pill('New card', { inv: true, icon: 'plus', href: '{{newCardHref}}' }) + pill('Import cards', { icon: 'upload', href: '{{importHref}}' }) + pill('Ask your AI', { icon: 'sparkle', href: 'WebConnect.dc.html' })) })}
  </div>
</main>`);
const emptyKpis = (list, big) => `<div style="display: grid; grid-template-columns: repeat(${big ? 4 : 2}, minmax(0, 1fr)); gap: ${big ? 12 : 8}px;">${list.map(([l, v]) => `<div style="background: {{t.surf}}; border-radius: ${big ? 28 : 24}px; padding: ${big ? 22 : 16}px; display: flex; flex-direction: column; gap: ${big ? 6 : 2}px;"><span style="font-size: ${big ? 13 : 12}px; color: {{t.muted}};">${l}</span><span style="font-size: ${big ? 40 : 28}px; font-weight: ${big ? 600 : 700}; letter-spacing: -.035em; line-height: 1.05; color: {{t.muted}};">${v}</span></div>`).join('')}</div>`;
const webStatsEmpty = webRoot(`${sidebar('Stats')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 24px; min-width: 0;">
  <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Stats</h1>
  ${emptyKpis([['Streak', '0 days'], ['Reviews', '0'], ['Remembered', '—'], ['Cards', '0']], true)}
  <div style="flex-grow: 1; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(150, 'stats'), title: 'No stats yet', body: 'Your streak, study days, and how much you remember show up here after your first review.', actions: webActions(pill('Make a deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' })) })}
  </div>
</main>`);
const phoneTodayNew = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 18px;">
  ${todayTitle('New deck', 'PhoneNewDeck.dc.html')}
  ${meshCard('hero', 'display: block; height: 168px; border-radius: 32px;', 'height: 100%; box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px;', `
    <span style="font-size: 14px; opacity: .85;">{{date}}</span><span style="font-size: 44px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">Welcome</span><span style="font-size: 15px; opacity: .85;">Nothing to study yet. Start with a deck.</span>`)}
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}}; padding: 0 4px;">Get started</div>
    ${phoneStartTile('plus', 'Make a deck', 'Start from scratch with your own cards', 'PhoneNewDeck.dc.html', true)}
    <div style="display: flex; gap: 8px;">${phoneStartTile('upload', 'Import cards', 'From Anki, Quizlet, or a CSV file.', '{{importHref}}')}${phoneStartTile('connect', 'Connect your AI', 'Let Claude or ChatGPT make cards.', 'PhoneConnect.dc.html')}</div>
  </div>
  <div style="background: {{t.surf}}; border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
    <div style="display: flex; align-items: center; gap: 12px;"><span style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf2}}; color: {{t.muted}}; display: flex; align-items: center; justify-content: center;">${svg(I.flame, 18, 2)}</span><span style="display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 15px; font-weight: 600;">No streak yet</span><span style="font-size: 12px; color: {{t.muted}};">Study today to start one</span></span></div>
    ${emptyWeek}
  </div>
</div>`, 'Today');
const phoneDeckEmpty = phone(`<div style="height: 100%; box-sizing: border-box; padding: 0 0 120px; display: flex; flex-direction: column;">
  <div style="position: relative; height: 232px; flex-shrink: 0; overflow: hidden;">
    ${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 54px 16px 18px 20px; display: flex; flex-direction: column; justify-content: space-between; color: {{cover.ink}};">
      <div style="display: flex; justify-content: space-between;">${coverRound('back', 'Back', 'PhoneToday.dc.html')}<div style="display: flex; gap: 8px;">${coverRound('gear', 'Deck settings', '', '{{openSettings}}')}${coverRound('plus', 'New card', 'PhoneEditor.dc.html')}</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; text-shadow: {{cover.shadow}};"><div style="font-size: 32px; font-weight: 700; letter-spacing: -.03em; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</div><div style="font-size: 14px; opacity: .8;">No cards yet</div></div>
    </div>
  </div>
  <div style="flex-grow: 1; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(140, 'plus'), title: 'This deck is empty', size: 22, body: 'Add your first card, import some, or ask your AI to make them.', actions: phoneActionRow(phoneBtn('New card', 'PhoneEditor.dc.html', 'plus', true), phoneBtn2('Import cards', '{{importHref}}', 'upload'), phoneBtn2('Ask your AI', 'PhoneConnect.dc.html', 'sparkle')) })}
  </div>
</div>`, 'Library');
// The Decks tab before there are any decks.
const phoneDecksEmpty = phone(`<div style="height: 100%; box-sizing: border-box; padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 14px;">
  ${pTitle('Library', roundBtn('plus', 'New deck', 'PhoneNewDeck.dc.html'))}
  <div style="flex-grow: 1; box-sizing: border-box; padding: 0 8px 20px; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(150, 'plus'), title: 'No decks yet', size: 22, body: 'Make one, bring your cards from Anki or Quizlet, or let your AI make them for you.', actions: phoneActionRow(phoneBtn('New deck', 'PhoneNewDeck.dc.html', 'plus', true), phoneBtn2('Import cards', 'PhoneDecksEmpty.dc.html', 'upload'), phoneBtn2('Connect AI', 'PhoneConnect.dc.html', 'connect')) })}
  </div>
</div>`, 'Library');
const phoneStatsEmpty = phone(`<div style="height: 100%; box-sizing: border-box; padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 14px;">
  ${pTitle('Stats')}
  ${emptyKpis([['Streak', '0 days'], ['Remembered', '—'], ['Reviews', '0'], ['Cards', '0']], false)}
  <div style="flex-grow: 1; box-sizing: border-box; padding: 20px; border-radius: 28px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(130, 'stats'), title: 'No stats yet', size: 22, body: 'Your streak, study days, and how much you remember show up after your first review.', actions: `<a href="PhoneNewDeck.dc.html" style="height: 48px; padding: 0 22px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600;">${svg(I.plus, 16, 2)}Make a deck</a>` })}
  </div>
</div>`, 'Stats');
const emptyLogic = (cover = '') => `renderVals() { ${T}${DB_JS}
  // On the canvas these boards show a brand-new account, so the Today count stays hidden (except on the empty deck).
  const dk = db.mock ? { name: '${cover}', seed: '${cover}', cover: { style: null, round: 0, image: null } } : (db.deck(this.props.deckId) || { name: '', seed: '', cover: {} });
  return { ${MESH_VALS('Iris')} t, ...chrome, nav: db.mock ? { today: ${cover ? "'64'" : "''"} } : chrome.nav, art: this.mesh('Iris'), art2: this.mesh('Mint'), art3: this.mesh('Apricot'), noop: () => {},
    date: db.today().date, deckName: dk.name, cover: this.gen(dk.seed + (dk.cover.round ? ' #' + dk.cover.round : ''), dk.cover.style),
    newCardHref: db.mock ? 'WebEditor.dc.html' : dk.newCardHref, importHref: db.href('import', dk.id), connectHref: db.href('connect'),
    openSettings: () => { if (!db.mock) db.act.go(dk.settingsHref); } }; }`;

// New deck. The cover starts white. Its colors (generated from the name) fade in over 2 s once you stop typing the name
// or press Shuffle, and each later change fades the new colors in over the old ones the same way.
const COVER_FADE_CSS = '@keyframes scCoverA{from{opacity:0}to{opacity:1}}@keyframes scCoverB{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.sc-cover-in{animation:none!important}}';
// Both layers stay in the page and hide when unused, so clearing the old one never restarts the new one's fade.
const coverLayer = (key, extra = '') => `<div${extra ? ' class="sc-cover-in"' : ''} style="position: absolute; inset: 0; display: {{${key}Show}}; background: {{${key}.base}};${extra}">${flowLayer(key)}${GRAIN_LAYER}</div>`;
const newDeckBody = (phone, back, done) => `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">New deck</span><a href="${back}" aria-label="Close" style="width: 40px; height: 40px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    <div style="position: relative; height: ${phone ? 132 : 150}px; border-radius: 26px; flex-shrink: 0; overflow: hidden; background: {{t.bg}}; box-shadow: inset 0 0 0 1px {{t.line}}; color: {{coverInk}}; transition: color 2s ease;">
      ${coverLayer('prev')}${coverLayer('cover', ' animation: {{coverFade}};')}
      <div style="position: relative; height: 100%; box-sizing: border-box; padding: 14px 16px 16px 18px; display: flex; flex-direction: column; justify-content: space-between; text-shadow: {{coverShadow}};"><div style="display: flex; justify-content: flex-end; gap: 8px;">${coverBtn('Shuffle', 'shuffle', 'shuffle')}${coverBtn(phone ? 'Image' : 'Upload image', 'pickCover', 'image')}</div><span style="font-size: ${phone ? 22 : 26}px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{title}}</span></div>
    </div>
    <label style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Name</span><input type="text" value="{{name}}" onChange="{{setName}}" placeholder="Name your deck" style="height: 48px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px;"></label>
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Tags</span>${TAG_EDIT('deckTags', 'deckPick', phone)}</div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">${stepper('New cards a day', 'perDay', 'lessDay', 'moreDay', true, 'perDayIn')}${stepper('Remember goal', 'goal', 'lessGoal', 'moreGoal', true)}</div>
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Grade with</span>${modeSeg(true)}</div>
    <div style="display: flex; gap: 10px;"><a href="${back}" style="flex-grow: 1; height: 52px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Cancel</a><a href="${done}" onClick="{{create}}" style="flex-grow: 2; height: 52px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Create deck</a></div>`;
const webNewDeck = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDecks" dark="{{dark}}" dim="{{dim}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="New deck" style="position: absolute; left: 420px; top: 50%; transform: translateY(-50%); width: 600px; box-sizing: border-box; padding: 28px; border-radius: 36px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 18px;">
    ${newDeckBody(false, 'WebDecks.dc.html', 'WebDeck.dc.html')}
  </div>
</div>`;
// Import cards: paste text or pick a file (Anki and Quizlet exports, CSV), then pick the deck. Opens over Decks.
const webImport = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDecks" dark="{{dark}}" dim="{{dim}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Import cards" style="position: absolute; left: 420px; top: 50%; transform: translateY(-50%); width: 600px; box-sizing: border-box; padding: 28px; border-radius: 36px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 18px;">
    <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">Import cards</span><a href="{{backHref}}" aria-label="Close" style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    <label style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Cards</span><textarea rows="8" onChange="{{setText}}" placeholder="One card per line: front, then back" style="resize: none; border: 0; outline: 0; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; font-family: ${MONO}; font-size: 13px; line-height: 1.6;">{{text}}</textarea></label>
    <div style="display: flex; align-items: center; gap: 12px;">${smallBtn('Choose a file', 'pickText', 'upload')}<span style="font-size: 13px; color: {{t.muted}};">{{foundLine}}</span></div>
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Into deck</span><input type="text" value="{{deckName}}" onChange="{{setDeck}}" placeholder="New deck name" style="height: 40px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px;">
      <div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{deckChips}}" as="d" hint-placeholder-count="4"><button type="button" onClick="{{d.pick}}" aria-pressed="{{d.pressed}}" style="height: 32px; padding: 0 12px; border: 0; border-radius: 999px; background: {{d.bg}}; color: {{d.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">{{d.name}}</button></sc-for></div></div>
    <div style="display: flex; gap: 10px;"><a href="{{backHref}}" style="flex-grow: 1; height: 52px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Cancel</a><a href="{{backHref}}" onClick="{{doImport}}" style="flex-grow: 2; height: 52px; border-radius: 999px; background: {{importBg}}; color: {{importFg}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">{{importLabel}}</a></div>
  </div>
</div>`;
const importLogic = `
constructor(props) { super(props); this.state = {}; }
renderVals() {
  ${T}${DB_JS}
  const s = this.state, decks = db.decks();
  const text = s.text ?? (db.mock ? 'でんしゃ\\ttrain\\nねこ\\tcat\\nみず\\twater' : '');
  // One card per line. A tab (Anki, Quizlet), a comma or semicolon (CSV), or " - " splits the front from the back.
  const cells = l => { if (l.includes('\\t')) return l.split('\\t'); if (l.includes(' - ')) return l.split(' - ');
    const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if ((ch === ',' || ch === ';') && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  // Anki and other apps export HTML (<b>, <br>): its bold, italics, and line breaks come along. Anki's {{c1::word}} blanks become fill-in-the-blank cards.
  const R = this.rich(), cell = x => (R.looksHtml(x) ? R.fromHtml(x) : x.trim());
  const toCard = ([front, ...rest]) => {
    const back = rest.filter(Boolean).join(', ');
    return /\\{\\{c\\d+::/.test(front) ? { kind: 'cloze', text: front.replace(/\\{\\{c\\d+::([\\s\\S]+?)(?:::[^}]*)?\\}\\}/g, '[[$1]]'), note: back } : { front, back };
  };
  const cards = String(text).split(/\\r?\\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => toCard(cells(l).map(cell))).filter(c => (c.kind === 'cloze' ? R.blanks(c.text).length : c.front && c.back));
  const here = db.mock ? { name: 'Japanese · JLPT N4' } : this.props.deckId ? db.deck(this.props.deckId) : null;
  const deckName = s.deck ?? (here ? here.name : '');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  return {
    t, ...chrome, dark: !!this.props.dark, dim: !!this.props.dim, text, deckName,
    setText: e => this.setState({ text: e && e.target ? e.target.value : '' }), setDeck: e => this.setState({ deck: e && e.target ? e.target.value : '' }),
    pickText: () => db.act.pickText().then(txt => txt != null && this.setState({ text: txt })),
    foundLine: cards.length ? plural(cards.length, 'card') + ' found' : text.trim() ? 'No cards yet. Put the front and back on one line, split by a tab or comma.' : '',
    deckChips: decks.slice(0, 6).map(d => { const on = d.name === deckName; return { name: d.name, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => this.setState({ deck: d.name }) }; }),
    importLabel: cards.length ? 'Import ' + plural(cards.length, 'card') : 'Import cards', importBg: cards.length ? t.inv : t.surf2, importFg: cards.length ? t.invText : t.muted,
    backHref: here && !db.mock ? here.href : db.href('decks'),
    // Into the deck with that name (this deck first), or a new deck when no deck has it.
    doImport: e => { if (db.mock) return; e.preventDefault(); if (!cards.length) return;
      const name = deckName.trim() || 'Imported cards', same = here && here.id && here.name === name ? here : decks.find(d => d.name.trim().toLowerCase() === name.toLowerCase());
      db.act.importCards({ deckId: same ? same.id : '', deckName: name, cards }); }
  };
}`;
const phoneNewDeck = `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneToday" dark="{{dark}}" dim="{{dim}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="New deck" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;">
    ${newDeckBody(true, 'PhoneToday.dc.html', 'PhoneDeck.dc.html')}
  </div>
</div>`;
const NEW_DECK_LOGIC = `
constructor(props) { super(props); this.state = { name: 'Pharmacology', round: 0, tags: ['MCAT'], shown: null, prev: null, k: 0 }; }
renderVals() {
  ${T}${DB_JS}
  const s = this.state, st = db.settings();
  // The cover's colors come from a seed (the name, plus the Shuffle count). show() fades a new seed in over the one before;
  // the one underneath goes once the fade is done.
  const seedOf = (n, r) => ((n || '').trim() || 'Untitled deck') + (r ? ' #' + r : '');
  const show = (seed, more = {}) => {
    const k = this.state.k + 1;
    this.setState({ ...more, prev: this.state.shown, shown: seed, k });
    clearTimeout(this.faded); this.faded = setTimeout(() => { if (this.state.k === k) this.setState({ prev: null }); }, 2100);
  };
  ${TAG_JS}
  // A new deck starts from your Settings (new cards a day, goal, grading) until you change them here.
  const name = db.mock ? s.name : s.name === 'Pharmacology' && s.typed == null ? '' : s.name;
  const grading = s.grading || st.grading, perDay = s.perDay ?? st.perDay, goal = s.goal ?? st.goal;
  const tags = db.mock || s.typedTags ? s.tags : [];
  const title = (name || '').trim() || 'Untitled deck';
  const seg = (id, cur) => ({ pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const setTags = next => this.setState({ tags: next, typedTags: true });
  ${NUM_JS}
  return {
    t, dark: !!this.props.dark, dim: !!this.props.dim, grain: String(this.props.grain ?? 0.7),
    name, title,
    coverShow: s.shown ? 'block' : 'none', prevShow: s.prev ? 'block' : 'none', cover: this.gen(s.shown || seedOf(title, s.round), st.grads), prev: this.gen(s.prev || seedOf(title, s.round), st.grads),
    coverFade: s.k % 2 ? 'scCoverA 2s ease-in-out both' : 'scCoverB 2s ease-in-out both',
    coverInk: s.shown ? this.gen(s.shown, st.grads).ink : t.text, coverShadow: s.shown ? this.gen(s.shown, st.grads).shadow : 'none',
    // A moment after you stop typing a name, its colors fade in.
    setName: e => {
      const v = e && e.target ? e.target.value : s.name;
      this.setState({ name: v, typed: true });
      clearTimeout(this.settle);
      this.settle = setTimeout(() => { const seed = seedOf(v, this.state.round); if (v.trim() && seed !== this.state.shown) show(seed); }, 800);
    },
    shuffle: () => show(seedOf(name, s.round + 1), { round: s.round + 1 }), noop: () => {},
    pickCover: () => db.act.pickFile('image').then(url => url && this.setState({ image: url })),
    modes: [['four', 'Forgot · Hard · Good · Easy', '4 grades'], ['binary', 'Check or X', '✓ / ✗'], ['piles', 'Piles', 'Piles']].map(([id, long, short]) => ({ label: short, long, ...seg(id, grading), pick: () => this.setState({ grading: id }) })),
    perDay: String(perDay), goal: goal + '%', perDayIn: typed('perDay', perDay, n => this.setState({ perDay: n }), 'New cards a day'),
    lessDay: () => this.setState({ perDay: Math.max(0, perDay - 5) }), moreDay: () => this.setState({ perDay: Math.min(999, perDay + 5) }),
    lessGoal: () => this.setState({ goal: Math.max(70, goal - 1) }), moreGoal: () => this.setState({ goal: Math.min(97, goal + 1) }),
    deckTags: tags.map(g => ({ ...tagChip(g), remove: () => setTags(tags.filter(x => x !== g)) })),
    deckPick: tagPicker(tags, setTags, 'dp', db.mock ? null : db.tags()),
    create: e => { if (db.mock) return; e.preventDefault(); db.act.addDeck({ name: title, tags, perDay, goal, grading, style: st.grads, round: s.round, image: s.image || null }); }
  };
}`;

// Live's flat colors (LV), which Learn mode's sky style shares, and the hover (a card rises, then bobs gently).
const LV = { blue: '#7ACFEA', green: '#62DE8A', yellow: '#FFD84A', navy: '#0D1542', ink2: 'rgba(13,21,66,.68)', chip: 'rgba(255,255,255,.55)', check: '#16C64A', gray: '#C4CBD5', grayInk: '#5D6677', purple: '#4F60E6', shadow: '0 10px 24px -16px rgba(13,21,66,.35)', lift: '0 26px 48px -20px rgba(13,21,66,.5)' };
const HOVER_CSS = (a, b) => `@keyframes scLiftIn{from{transform:none}to{transform:translateY(${a}px)}}@keyframes scHover{from{transform:translateY(${a}px)}to{transform:translateY(${b}px)}}`;
const HOVER = (a, delay) => `scLiftIn .45s cubic-bezier(.2,.8,.2,1) ${delay}s both, scHover 2.4s ease-in-out ${delay + .45}s infinite alternate`;

// ---------- Learn mode ----------
// Learn a set of cards until you know every one. Each card is asked in different ways (multiple choice, true or false,
// matching, filling in its blank, typing the answer); it's learned after two right answers in a row, asked two ways,
// and a card you miss comes back a few questions later (web/db.js runs a session). It's Pro: on Free the Learn button
// opens the upgrade card instead. On the canvas the boards show a sample session: the 40 cards tagged Exam 1 in Cell
// Biology, 18 learned so far.
const LEARN_QS = [
  { kind: 'Multiple choice', streak: 1, q: 'A drug makes the inner mitochondrial membrane leak protons. What happens to the cell’s ATP output?', options: ['It drops', 'It rises', 'It stays the same', 'Only glycolysis stops'], right: 0,
    why: 'ATP synthase runs on the proton gradient the electron transport chain builds. A leak spends that gradient before it can make ATP.', card: ['What does the electron transport chain pump across the inner membrane?', 'Protons (H⁺)'] },
  { kind: 'True or false', streak: 0, q: 'What is the role of the ribosome?', claim: 'Copies DNA into mRNA', options: ['True', 'False'], right: 1,
    why: 'Copying DNA into mRNA is transcription, and it happens in the nucleus. Ribosomes translate mRNA into protein.', card: ['What is the role of the ribosome?', 'Translates mRNA into protein'] },
  { kind: 'Fill in the blank', streak: 1, q: 'The ____ is the powerhouse of the cell.', options: ['mitochondrion', 'nucleus', 'ribosome', 'lysosome'], right: 0,
    why: 'It makes most of the cell’s ATP.', card: ['The ____ is the powerhouse of the cell.', 'mitochondrion'] },
  // A picture with boxes: which part is under the highlighted box, with the picture's other labels as the choices.
  { kind: 'Multiple choice', streak: 0, q: 'What’s under box 2?', image: 'mock', occ: { boxes: SAMPLE.BOXES, ask: 1, mode: 'all' }, options: ['Vacuole', 'Mitochondrion', 'Nucleus', 'Lysosome'], right: 1,
    why: 'The bean-shaped part with folds inside is a mitochondrion. It makes most of the cell’s ATP.', card: ['What’s under box 2?', 'Mitochondrion'] }
];
const LEARN_PAIRS = [['Mitochondrion', 'Makes most of the cell’s ATP'], ['Ribosome', 'Builds proteins from mRNA'], ['Golgi apparatus', 'Packages proteins for export'], ['Nucleus', 'Holds the cell’s DNA'], ['Lysosome', 'Breaks down waste']];
const LEARN_RIGHT = [3, 0, 4, 2, 1];
const LEARN_KINDS = [['mc', 'Multiple choice'], ['match', 'Matching'], ['tf', 'True or false'], ['blank', 'Fill in the blank'], ['type', 'Type the answer']];
// Motion: each question rises in, a right answer pops as its check draws, a wrong one shakes, "+1"
// floats up by the count when a card is learned, and the end counts up while its ring draws. Reduced motion: none.
const LEARN_CSS = OCC_VIEW_CSS + '@keyframes scQuizIn{from{opacity:0;transform:translateY(6px)}}@keyframes scQA{from{opacity:0;transform:translateY(12px)}}@keyframes scQB{from{opacity:0;transform:translateY(12px)}}'
  + '@keyframes scShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@keyframes scPop{40%{transform:scale(1.025)}}'
  + '@keyframes scPlusA{0%{opacity:0;transform:translateY(6px)}25%{opacity:1}100%{opacity:0;transform:translateY(-16px)}}@keyframes scPlusB{0%{opacity:0;transform:translateY(6px)}25%{opacity:1}100%{opacity:0;transform:translateY(-16px)}}'
  + '.sc-tick path{stroke-dasharray:24;stroke-dashoffset:24;animation:scTick .32s .06s ease forwards}@keyframes scTick{to{stroke-dashoffset:0}}'
  + "@property --sc-n{syntax:'<integer>';initial-value:0;inherits:false}.sc-count{--sc-n:var(--to);counter-reset:n var(--sc-n);animation:scCount 1.1s .25s cubic-bezier(.2,.8,.2,1) backwards}.sc-count::after{content:counter(n)}@keyframes scCount{from{--sc-n:0}}"
  + '@keyframes scLearnIn{from{transform:none}to{transform:translateY(-5px)}}@keyframes scLearnHover{from{transform:translateY(-5px)}to{transform:translateY(-9px)}}'
  + '@media (prefers-reduced-motion:reduce){.sc-quiz-in,.sc-shake,.sc-q,.sc-count,.sc-plus,.sc-opt{animation:none!important}.sc-tick path{animation:none;stroke-dashoffset:0}}';
const LEARN_HOVER = 'scLearnIn .45s cubic-bezier(.2,.8,.2,1) both, scLearnHover 2.4s ease-in-out .45s infinite alternate';
// Learn mode's look, picked by the owner from the style ideas (V82: "lets go with this style"): the sky. The sky's faint
// blue fade behind the top (a night sky in dark mode), big navy words, and white answer cards with colored numbers; the
// right answer rises and hovers with a green check, and after an answer the rest turn gray (Live's rules). Its colors
// are `k` in renderVals (K below): light, or the same look at night.
const LEARN_COLORS = ['#4F60E6', '#F2701D', '#0E8FB0', '#E5407E'];
// In gray dark mode the answer cards sit a step above the gray page, instead of below it.
const LEARN_K = `const K = this.props.dark && this.props.dim
    ? { ink: '#F2F3F7', ink2: 'rgba(242,243,247,.7)', card: '#2D2F36', shadow: '0 10px 24px -16px rgba(0,0,0,.6)', lift: '0 26px 48px -20px rgba(0,0,0,.75)', gray: '#393C45', grayInk: '#A3A9B6', chip: 'rgba(255,255,255,.12)', track: 'rgba(255,255,255,.16)', btn: '#F2F3F7', btnFg: '${LV.navy}', other: 'rgba(255,255,255,.16)', wrong: '#5A606E', bar: '#8C9AFC', part: 'rgba(140,154,252,.42)', check: '${LV.check}' }
    : this.props.dark
    ? { ink: '#F2F3F7', ink2: 'rgba(242,243,247,.66)', card: '#1B1D24', shadow: '0 10px 24px -16px rgba(0,0,0,.7)', lift: '0 26px 48px -20px rgba(0,0,0,.85)', gray: '#2A2D35', grayInk: '#8E95A3', chip: 'rgba(255,255,255,.1)', track: 'rgba(255,255,255,.14)', btn: '#F2F3F7', btnFg: '${LV.navy}', other: 'rgba(255,255,255,.14)', wrong: '#4A4F5C', bar: '#8C9AFC', part: 'rgba(140,154,252,.4)', check: '${LV.check}' }
    : { ink: '${LV.navy}', ink2: '${LV.ink2}', card: '#FFFFFF', shadow: '${LV.shadow}', lift: '${LV.lift}', gray: '${LV.gray}', grayInk: '${LV.grayInk}', chip: 'rgba(255,255,255,.72)', track: 'rgba(13,21,66,.08)', btn: '${LV.navy}', btnFg: '#FFFFFF', other: 'rgba(13,21,66,.12)', wrong: '${LV.navy}', bar: '${LV.purple}', part: 'rgba(79,96,230,.38)', check: '${LV.check}' };`;
// Progress through the set: learned (purple), still learning (light purple), not yet (track), with "+1" when one is learned.
const learnBar = w => `<div style="${w ? `width: ${w}px;` : 'flex-grow: 1;'} height: 10px; border-radius: 5px; background: {{k.track}}; overflow: hidden; display: flex;"><div style="width: {{doneW}}; background: {{k.bar}}; transition: width .5s cubic-bezier(.2,.8,.2,1);"></div><div style="width: {{partW}}; background: {{k.part}}; transition: width .5s cubic-bezier(.2,.8,.2,1);"></div></div>`;
const learnPlus = `<sc-if value="{{plusOne}}" hint-placeholder-val="{{ false }}"><span class="sc-plus" aria-hidden="true" style="position: absolute; left: 100%; top: -3px; margin-left: 6px; font-size: 13px; font-weight: 700; color: {{k.bar}}; animation: {{plusAnim}};">+1</span></sc-if>`;
// The top: stop, progress, and the set, on soft glass chips over the sky.
const learnTop = back => `<header style="height: 76px; flex-shrink: 0; box-sizing: border-box; padding: 0 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px;">
    <div style="display: flex;"><a href="${back}" aria-label="Stop for now" title="Stop for now" style="width: 40px; height: 40px; border-radius: 20px; background: {{k.chip}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2.2)}</a></div>
    <div style="display: flex; align-items: center; gap: 14px;">${learnBar(360)}<span role="status" style="position: relative; font-size: 14px; white-space: nowrap;"><span style="font-weight: 700;">{{learned}}</span> of {{total}} learned${learnPlus}</span></div>
    <div style="display: flex; justify-content: flex-end; min-width: 0;"><span style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: {{k.chip}}; font-size: 13px; font-weight: 600; white-space: nowrap;">${svg(I.sparkle, 14, 1.8)}<span>Learn · {{setName}}</span></span></div>
  </header>`;
const learnTopPhone = back => `<div style="display: flex; align-items: center; gap: 12px;"><a href="${back}" aria-label="Stop for now" style="width: 44px; height: 44px; flex-shrink: 0; border-radius: 22px; background: {{k.chip}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 18, 2)}</a>${learnBar(0)}<span role="status" style="position: relative; font-size: 13px; white-space: nowrap;"><span style="font-weight: 700;">{{learned}}</span>/{{total}}${learnPlus}</span></div>`;
const quizSeg = list => `<div role="group" style="display: flex; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{${list}}}" as="o" hint-placeholder-count="4"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="flex: 1 1 0; min-width: 0; height: 38px; padding: 0 6px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{o.label}}</button></sc-for></div>`;
const quizField = (label, body) => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">${label}</span>${body}</div>`;
const quizBtn = (label, href, inv, grow, icon = '', click = '') => `<a href="${href}"${click ? ` onClick="{{${click}}}"` : ''} style="flex-grow: ${grow}; height: 52px; border-radius: 999px; background: ${inv ? '{{t.inv}}' : '{{t.surf}}'}; color: ${inv ? '{{t.invText}}' : '{{t.text}}'}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 600;">${icon ? svg(I[icon], 16, 2) : ''}${label}</a>`;
// A fade that looks natural: the alpha follows the "scrim" easing curve (it lets go slowly, faster in the middle, then
// slowly again), so neither end shows as an edge the way a straight ramp does. `from` and `to` are % of the layer.
const SCRIM = [[0, 1], [.081, .987], [.155, .951], [.225, .896], [.29, .825], [.353, .741], [.412, .648], [.471, .55], [.529, .45], [.588, .352], [.647, .259], [.71, .175], [.775, .104], [.845, .049], [.919, .013], [1, 0]];
const scrimMask = (from, to) => `linear-gradient(180deg, ${SCRIM.map(([p, a]) => `rgba(0,0,0,${a}) ${+(from + (to - from) * p).toFixed(1)}%`).join(', ')})`;
// A deep gradient across the top of a dialog that fades out toward the bottom, under a white title and line (the owner
// asked for it on the web's Learn mode and Play live cards). It's the site's Midnight (`deep` in renderVals). The fade
// starts under the title and runs 290px on the scrim curve (V74; V72's short straight fade "looks forced"): the line
// stays on the dark part (alpha .75 or more), and it's under .6 by the first label, where black text reads again.
// Midnight's bright bottom corners fall past the end, so the fade shows no band.
// `deepTopOf(h, from)`: the layer's height and where its fade starts (px). The phone's sheet starts it lower: its line
// runs 3 lines under a grab handle, so it ends near 158px and the first label sits near 200px (V77).
const deepTopOf = (h, from) => `<div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 0; height: ${h}px; overflow: hidden; background: {{deep.base}}; -webkit-mask-image: ${scrimMask(+(from / h * 100).toFixed(1), 100)}; mask-image: ${scrimMask(+(from / h * 100).toFixed(1), 100)};">${flowLayer('deep')}${GRAIN_LAYER}</div>`;
const deepTop = deepTopOf(330, 40);
const deepHead = (icon, title, back, line) => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #FFFFFF;"><span style="display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">${svg(I[icon], 20, 1.8)}${title}</span><a href="${back}" aria-label="Close" style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: rgba(255,255,255,.14); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.3); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: rgba(255,255,255,.9); text-shadow: {{deep.shadow}};">${line}</p>`;
// Starting: which cards to learn and which kinds of questions to ask (on the web, under the deep top).
const LEARN_LINE = 'Learn cards until you know every one. Each card is asked a few different ways, and the ones you miss come back.';
const learnStartBody = (back, start, deep) => `${deep ? deepHead('sparkle', 'Learn mode', back, LEARN_LINE) : `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">${svg(I.sparkle, 20, 1.8)}Learn mode</span><a href="${back}" aria-label="Close" style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: {{t.muted}};">${LEARN_LINE}</p>`}
    ${quizField('Cards', quizSeg('sets'))}
    ${quizField('Kinds of questions', `<div style="display: flex; flex-wrap: wrap; gap: 8px;"><sc-for list="{{kinds}}" as="k" hint-placeholder-count="5"><button type="button" onClick="{{k.pick}}" aria-pressed="{{k.pressed}}" style="height: 38px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{k.bg}}; color: {{k.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;"><sc-if value="{{k.on}}" hint-placeholder-val="{{ true }}">${svg(I.check, 14, 2.4)}</sc-if>{{k.label}}</button></sc-for></div>`)}
    <div style="font-size: 13px; color: {{t.muted}};">{{goalLine}}</div>
    <div style="display: flex; gap: 10px;">${quizBtn('Cancel', back, false, 1)}${quizBtn('Start learning', start, true, 2, 'sparkle', 'start')}</div>`;
// A daylight sky behind the top of the page (a night sky in dark mode): deep blue up high, paler toward the page,
// a soft glow, and clouds of three soft puffs each, drifting slowly. The wall and the words sit over it.
const SKY_CLOUDS = {
  web: [[-4, 118, 440, 150, 52], [79, 84, 470, 160, 64], [8, 404, 540, 170, 58], [67, 372, 500, 160, 70], [41, 22, 280, 96, 46]],
  phone: [[-24, 104, 260, 100, 44], [62, 64, 250, 94, 52], [48, 372, 300, 110, 60]]
};
const skyLayer = phone => `<div aria-hidden="true" class="sc-demo" style="position: absolute; left: 0; right: 0; top: 0; height: ${phone ? 600 : 700}px; z-index: -1; overflow: hidden; pointer-events: none; background: linear-gradient(180deg, {{sky.top}} 0%, {{sky.mid}} 30%, {{sky.low}} 55%, {{t.bg}} 100%);">
  <div style="position: absolute; left: 50%; top: -35%; width: 120%; height: 90%; transform: translateX(-50%); background: radial-gradient(closest-side, {{sky.glow}}, transparent);"></div>
  ${SKY_CLOUDS[phone ? 'phone' : 'web'].map(([x, y, w, h, secs], i) => `<div class="sc-cloud" style="position: absolute; left: ${x}%; top: ${y}px; width: ${w}px; height: ${h}px; animation: scCloud ${secs}s ease-in-out -${i * 11}s infinite alternate;">${[[0, 30, 60, 70], [24, 0, 56, 88], [46, 24, 54, 76]].map(([l, t, pw, ph]) => `<span style="position: absolute; left: ${l}%; top: ${t}%; width: ${pw}%; height: ${ph}%; background: radial-gradient(closest-side, {{sky.cloud}} 40%, transparent);"></span>`).join('')}</div>`).join('')}
</div>`;
const SKY_CSS = '@keyframes scCloud{from{transform:translateX(-28px)}to{transform:translateX(28px)}}@media (prefers-reduced-motion:reduce){.sc-cloud{animation:none!important}}';
// Learn mode's sky: only the faint blue fade, with no clouds or glow (the owner: "remove the clouds, i only want the
// faint blue fade", V75). A night sky in dark mode.
// The sky's colors, for renderVals: daylight, or a night sky in dark mode (the landing page's top, Learn mode's end).
// Gray dark mode gets a dusk sky that fades into its gray page.
const SKY = `(this.props.dark && this.props.dim ? { top: '${SKY_DUSK.top}', mid: '${SKY_DUSK.mid}', low: '${SKY_DUSK.low}', glow: 'rgba(120,150,255,.16)', cloud: 'rgba(150,170,230,.12)' }
    : this.props.dark ? { top: '#081733', mid: '#0D2148', low: '#0A1530', glow: 'rgba(120,150,255,.16)', cloud: 'rgba(150,170,230,.10)' }
    : { top: '#86BDF3', mid: '#C9E2FB', low: '#EDF5FE', glow: 'rgba(255,255,255,.75)', cloud: 'rgba(255,255,255,.94)' })`;
// On Free (once Pro can be bought), the Learn button opens this: a sky, two matched cards, what Pro adds, the price.
const skyTop = (h, cw, ch) => `<div aria-hidden="true" style="position: relative; height: ${h}px; background: linear-gradient(180deg, {{sky.top}} 0%, {{sky.mid}} 58%, {{sky.low}} 82%, {{t.bg}} 100%); overflow: hidden;">
      ${[[-8, 18, 190, 70], [58, 6, 210, 76], [70, 58, 170, 60]].map(([x, y, w, hh]) => `<div style="position: absolute; left: ${x}%; top: ${y}%; width: ${w}px; height: ${hh}px;">${[[0, 30, 60, 70], [24, 0, 56, 88], [46, 24, 54, 76]].map(([l, t, pw, ph]) => `<span style="position: absolute; left: ${l}%; top: ${t}%; width: ${pw}%; height: ${ph}%; background: radial-gradient(closest-side, {{sky.cloud}} 40%, transparent);"></span>`).join('')}</div>`).join('')}
      <div style="position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 14px;">
        ${meshCard('m1', `width: ${cw}px; height: ${ch}px; border-radius: 18px; transform: rotate(-6deg); box-shadow: 0 16px 32px -16px rgba(20,22,90,.45);`, 'height: 100%; box-sizing: border-box; padding: 12px; display: flex; align-items: center; justify-content: center; text-align: center;', `<span style="font-size: ${Math.round(cw / 9.5)}px; font-weight: 600; letter-spacing: -.01em;">Golgi apparatus</span>`)}
        <span style="width: 34px; height: 34px; flex-shrink: 0; border-radius: 17px; background: #FFFFFF; color: #067647; box-shadow: 0 6px 16px -6px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center;">${svg(I.check, 18, 2.6)}</span>
        ${meshCard('m2', `width: ${cw}px; height: ${ch}px; border-radius: 18px; transform: rotate(5deg); box-shadow: 0 16px 32px -16px rgba(20,22,90,.45);`, 'height: 100%; box-sizing: border-box; padding: 12px; display: flex; align-items: center; justify-content: center; text-align: center;', `<span style="font-size: ${Math.round(cw / 11)}px; font-weight: 600; line-height: 1.25;">Packages proteins for export</span>`)}
      </div>
    </div>`;
// Each price is its own button, so paying never picks yearly for you (the owner: "the pricing is confusing because
// it only has the yearly subscription no monthly option").
const learnUpgradeBody = (back, pad) => `<a href="${back}" aria-label="Close" style="position: absolute; top: 16px; right: 16px; z-index: 1; width: 40px; height: 40px; border-radius: 20px; background: rgba(255,255,255,.7); color: #000000; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a>
    <div style="box-sizing: border-box; padding: 0 ${pad}px ${pad}px; margin-top: -6px; display: flex; flex-direction: column; gap: 18px;">
      <div style="display: flex; flex-direction: column; gap: 8px;"><span style="display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 600; letter-spacing: -.03em;">Learn every card${PRO_BADGE}</span><span style="font-size: 15px; line-height: 1.5; color: {{t.muted}};">AI turns your cards into questions of every kind, like matching and typing the answer, and keeps going until you know them all.</span></div>
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 15px;">${['Learn mode with 5 kinds of questions', 'Photo covers and your own colors', 'Unlimited pictures and sounds'].map(x => `<span style="display: flex; align-items: center; gap: 10px;"><span style="width: 22px; height: 22px; flex-shrink: 0; border-radius: 11px; background: linear-gradient(135deg, #7E94FB, #2CB2EA); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">${svg(I.check, 13, 2.6)}</span>${x}</span>`).join('')}</div>
      <div style="font-size: 14px; color: {{t.muted}};">Yearly works out to $4.17 a month. Cancel anytime.</div>
      <div style="display: flex; gap: 10px;">${quizBtn('$5.99 a month', '{{monthlyHref}}', false, 1)}${quizBtn('$49.99 a year', '{{yearlyHref}}', true, 1)}</div>
    </div>`;
const webQuizStart = pro => `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Learn mode" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 560px; box-sizing: border-box; border-radius: 36px; overflow: hidden; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); ${pro ? 'padding: 28px;' : ''}">
    ${pro ? deepTop + '<div style="position: relative; display: flex; flex-direction: column; gap: 20px;">' + learnStartBody('WebDeck.dc.html', '{{startHref}}', true) + '</div>' : skyTop(236, 168, 108) + learnUpgradeBody('WebDeck.dc.html', 32)}
  </div>
</div>`;
const phoneQuizStart = pro => `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Learn mode" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; border-radius: 36px 36px 0 0; overflow: hidden; background: {{t.bg}}; ${pro ? 'padding: 10px 20px 34px;' : 'padding-bottom: 14px;'}">
    ${pro ? deepTopOf(354, 64) + '<div style="position: relative; display: flex; flex-direction: column; gap: 18px;"><div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: rgba(255,255,255,.45);"></div>' + learnStartBody('PhoneDeck.dc.html', '{{startHref}}', true) + '</div>' : skyTop(200, 132, 88) + learnUpgradeBody('PhoneDeck.dc.html', 20)}
  </div>
</div>`;
// `deep`: the start card's deep top (web and iPhone).
const QUIZ_START_LOGIC = (phone, deep) => `
constructor(props) { super(props); this.state = { set: null, kinds: ['mc', 'match', 'tf', 'blank'] }; }
renderVals() { ${T}${DB_JS}
  const s = this.state, id = this.props.deckId, seg = (k, cur) => ({ pressed: k === cur ? 'true' : 'false', bg: k === cur ? t.bg : 'transparent', fg: k === cur ? t.text : t.muted, sh: k === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const sets = db.mock ? [{ id: 'new', label: 'New', n: 10 }, { id: 'hard', label: 'Hard', n: 36 }, { id: 'tag:Exam 1', label: 'Exam 1', n: 40 }, { id: 'all', label: 'All', n: 412 }] : db.learnSets(id);
  const set = sets.find(x => x.id === s.set) || (db.mock ? sets[2] : sets.find(x => x.n > 0) || sets[sets.length - 1]), n = set.n, mins = Math.max(1, Math.round(n * .6));
  return { t, dark: !!this.props.dark, dim: !!this.props.dim, deckId: id || '', sky: ${SKY}, grain: String(this.props.grain ?? 0.7), m1: this.mesh('Iris'), m2: this.mesh('Mint'), ${deep ? 'deep: ' + MIDNIGHT + ', ' : ''}monthlyHref: db.mock ? '${phone ? 'PricingPhone' : 'Pricing'}.dc.html' : '/pro?plan=monthly', yearlyHref: db.mock ? '${phone ? 'PricingPhone' : 'Pricing'}.dc.html' : '/pro?plan=yearly',
    sets: sets.map(x => ({ label: x.label + ' · ' + x.n, ...seg(x.id, set.id), pick: () => this.setState({ set: x.id }) })),
    kinds: ${JSON.stringify(LEARN_KINDS)}.map(([k, label]) => { const on = s.kinds.includes(k); return { label, on, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => this.setState({ kinds: on && s.kinds.length > 1 ? s.kinds.filter(x => x !== k) : on ? s.kinds : [...s.kinds, k] }) }; }),
    goalLine: n ? 'Learn all ' + n + ' card' + (n === 1 ? '' : 's') + ', about ' + (mins >= 90 ? Math.round(mins / 60) + ' hours over a few sessions' : mins + ' minute' + (mins === 1 ? '' : 's')) + '. You can stop anytime and pick up where you left off.' : 'This deck has no cards to learn yet. Picture and text cards work; sound cards come later.',
    startHref: '${phone ? 'PhoneQuiz' : 'WebQuiz'}.dc.html',
    start: e => { if (db.mock) return; if (e && e.preventDefault) e.preventDefault(); if (n) db.act.startLearn(id, set.id, s.kinds); } }; }`;
// What every question shows: progress and the motion keys.
const LEARN_VIEW_JS = `${LEARN_K}
  ${STUDY_BG_JS}
  const L = db.mock ? null : db.learn() || { learned: 0, total: 1, learning: 0, justLearned: 0, n: 0, setName: '' };
  const bg = studyBg(db.deck(L ? L.deckId : this.props.deckId), !!this.props.dark, !!this.props.dim);
  const view = (learned, total, part, n, just) => ({ k: K, sky: ${SKY}, bg, learned: String(learned), total: String(total), setName: L ? L.setName : 'Exam 1',
    doneW: learned / total * 100 + '%', partW: part / total * 100 + '%', qAnim: (n % 2 ? 'scQA' : 'scQB') + ' .36s cubic-bezier(.2,.8,.2,1) both',
    plusOne: just > 0, plusAnim: (learned % 2 ? 'scPlusA' : 'scPlusB') + ' 1.1s ease both' });`;
// A choice question (multiple choice, true or false, fill in the blank): pick, then see why and the card it came from.
// The answers are white cards with a colored number; the right one rises and hovers with a green check, a wrong pick
// gets an ×, and after an answer the others go gray.
const learnMark = `<sc-if value="{{o.plain}}" hint-placeholder-val="{{ true }}">{{o.key}}</sc-if><sc-if value="{{o.isRight}}" hint-placeholder-val="{{ false }}"><span class="sc-tick" style="display: flex;">${svg(I.check, 18, 2.6)}</span></sc-if><sc-if value="{{o.isWrong}}" hint-placeholder-val="{{ false }}">${svg(I.close, 16, 2.6)}</sc-if>`;
const learnOption = (h, r, fs, badge = 40) => `<button type="button" class="sc-opt" onClick="{{o.pick}}" data-key="{{o.key}}" aria-pressed="{{o.pressed}}" style="min-height: ${h}px; box-sizing: border-box; padding: 10px 20px 10px 12px; display: flex; align-items: center; gap: ${badge > 36 ? 16 : 14}px; border: 0; border-radius: ${r}px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.shadow}}; transform: {{o.tf}}; animation: {{o.anim}}; font: inherit; font-size: ${fs}px; font-weight: 600; text-align: left; cursor: {{o.cursor}}; transition: background-color .25s, color .25s, box-shadow .35s, transform .35s cubic-bezier(.2,.8,.2,1);"><span style="width: ${badge}px; height: ${badge}px; flex-shrink: 0; border-radius: ${badge / 2}px; background: {{o.badge}}; color: {{o.badgeFg}}; display: flex; align-items: center; justify-content: center; font-size: ${badge > 36 ? 16 : 15}px; font-weight: 700; transition: background-color .25s, color .25s;">${learnMark}</span><span style="flex-grow: 1;">{{o.label}}</span></button>`;
const quizFrom = `<div style="min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; border-radius: 18px; background: {{k.card}}; box-shadow: {{k.shadow}}; font-size: 13px; line-height: 1.4;"><span style="color: {{k.ink2}};">From your card</span><span style="min-width: 0;">{{cardFront}} <span style="color: {{k.ink2}};">→</span> <span style="font-weight: 700;">{{cardBack}}</span></span></div>`;
const learnNext = (h, fs) => `<sc-if value="{{isLast}}" hint-placeholder-val="{{ false }}"><a href="{{afterHref}}" style="height: ${h}px; padding: 0 24px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{k.btn}}; color: {{k.btnFg}}; font-size: ${fs}px; font-weight: 600;">Next question</a></sc-if><sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{next}}" data-key="Enter" style="width: 100%; height: ${h}px; padding: 0 24px; border: 0; border-radius: 999px; background: {{k.btn}}; color: {{k.btnFg}}; font: inherit; font-size: ${fs}px; font-weight: 600; cursor: pointer;">Next question</button></sc-if>`;
// The canvas's sample explanation for the Learn question.
const EX_SAMPLE_LEARN = 'It drops. ATP synthase makes ATP only as protons flow back through it, down the gradient the electron transport chain built. A leak lets them slip back another way, so the gradient runs down and far less ATP gets made. Picture a dam with a hole in it: the water still falls, but the turbine barely turns.';
// After an answer, the AI can explain it, under the line that says why (the same explanation as the card's, V96).
const learnExplain = fs => `<sc-if value="{{ex.show}}" hint-placeholder-val="{{ false }}"><sc-if value="{{ex.closed}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{ex.ask}}" class="sc-press" style="align-self: flex-start; height: 34px; padding: 0 14px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{k.card}}; box-shadow: {{k.shadow}}; color: {{k.ink}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.sparkle, 14, 2)}{{ex.label}}</button></sc-if><sc-if value="{{ex.open}}" hint-placeholder-val="{{ false }}"><div role="region" aria-label="Explanation" style="box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: {{k.card}}; box-shadow: {{k.shadow}}; display: flex; flex-direction: column; gap: 6px; animation: scQuizIn .25s cubic-bezier(.2,.8,.2,1) both;">
    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: {{k.ink2}};">${svg(I.sparkle, 13, 2)}<span style="flex-grow: 1;">Explained by AI</span><button type="button" onClick="{{ex.close}}" aria-label="Close the explanation" style="width: 26px; height: 26px; border: 0; border-radius: 13px; background: {{k.track}}; color: {{k.ink}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.4)}</button></div>
    <sc-if value="{{ex.busy}}" hint-placeholder-val="{{ false }}"><span style="font-size: ${fs}px; color: {{k.ink2}};">Thinking…</span></sc-if>
    <sc-if value="{{ex.hasText}}" hint-placeholder-val="{{ true }}"><span style="font-size: ${fs}px; line-height: 1.5;">{{ex.text}}</span></sc-if>
    <sc-if value="{{ex.hasError}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{ex.error}}</span><sc-if value="{{ex.goPro}}" hint-placeholder-val="{{ false }}"><a href="{{ex.proHref}}" style="align-self: flex-start; height: 34px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 999px; background: {{k.btn}}; color: {{k.btnFg}}; font-size: 13px; font-weight: 600;">Go Pro</a></sc-if></sc-if>
    <sc-if value="{{ex.hasNote}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: {{k.ink2}};">{{ex.note}}</span></sc-if>
  </div></sc-if></sc-if>`;
const learnWhy = (fs = 17) => `<div style="font-size: ${fs}px; line-height: 1.5;"><span style="font-weight: 700; color: {{verdictColor}};">{{verdict}}</span> {{why}}</div>`;
// The card's picture; a picture with boxes shows them, the asked one highlighted, and it turns to an outline once
// answered.
const learnImage = h => `<sc-if value="{{hasImage}}" hint-placeholder-val="{{ false }}"><div style="align-self: flex-start; position: relative; max-width: 100%; line-height: 0;"><sc-if value="{{imageMock}}" hint-placeholder-val="{{ false }}"><div style="padding: 10px 14px; border-radius: 18px; background: {{t.surf}};">${CELL(Math.round((h - 20) * 22 / 15), h - 20, false)}</div></sc-if><sc-if value="{{imageUrl}}" hint-placeholder-val="{{ true }}"><img src="{{imageUrl}}" alt="" style="display: block; max-width: 100%; max-height: ${h}px; border-radius: 18px; background: {{t.surf}};"></sc-if><div style="position: absolute; inset: {{occInset}};">${OCC_BOXES('occBoxes', 13)}</div></div></sc-if>`;
// What learnImage shows: the picture (the canvas's sample diagram, or the card's), and its boxes.
const LEARN_IMG_JS = `${OCC_JS}
  const learnImg = (img, o, shown) => ({ hasImage: !!img, imageMock: img === 'mock', imageUrl: img && img !== 'mock' ? img : '', occInset: img === 'mock' ? '10px 14px' : '0',
    occBoxes: img && o ? occView(o.boxes, o.ask, o.mode, shown, { ask: K.btn, askText: K.btnFg, cover: K.gray, coverText: K.grayInk, ring: t.bg }) : [] });`;
const learnClaim = fs => `<sc-if value="{{hasClaim}}" hint-placeholder-val="{{ false }}"><div style="padding: 16px 20px; border-radius: 20px; background: {{k.card}}; box-shadow: {{k.shadow}}; font-size: ${fs}px; font-weight: 700; line-height: 1.35;">{{claim}}</div></sc-if>`;
const webQuizOf = bg => `<div style="position: relative; isolation: isolate; width: 1440px; height: 900px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${bg}
  ${learnTop('WebDeck.dc.html')}
  <main style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="sc-q" style="width: 720px; display: flex; flex-direction: column; gap: 22px; animation: {{qAnim}};">
      <h1 style="margin: 0; font-size: 36px; font-weight: 700; line-height: 1.15; letter-spacing: -.03em; text-wrap: pretty;">{{question}}</h1>
      ${learnImage(240)}${learnClaim(20)}
      <div style="display: flex; flex-direction: column; gap: 12px;"><sc-for list="{{options}}" as="o" hint-placeholder-count="4">${learnOption(64, 22, 18)}</sc-for></div>
      <div style="min-height: 150px;"><sc-if value="{{answered}}" hint-placeholder-val="{{ false }}"><div class="sc-quiz-in" style="display: flex; flex-direction: column; gap: 14px; animation: scQuizIn .3s cubic-bezier(.2,.8,.2,1) both;">
        ${learnWhy()}
        ${learnExplain(16)}
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 20px;">${quizFrom}<div style="flex-shrink: 0; width: 180px;">${learnNext(52, 15)}</div></div>
      </div></sc-if></div>
    </div>
  </main>
</div>`;
const webQuiz = webQuizOf(studyBgLayer);
const phoneQuizOf = bg => `<div style="position: relative; isolation: isolate; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 18px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${bg}
  ${learnTopPhone('PhoneDeck.dc.html')}
  <div class="sc-q" style="display: flex; flex-direction: column; gap: 16px; animation: {{qAnim}};">
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 8px 4px 0;"><div style="font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -.025em; text-wrap: pretty;">{{question}}</div>${learnImage(180)}${learnClaim(18)}</div>
    <div style="display: flex; flex-direction: column; gap: 8px;"><sc-for list="{{options}}" as="o" hint-placeholder-count="4">${learnOption(54, 20, 16, 34)}</sc-for></div>
    <sc-if value="{{answered}}" hint-placeholder-val="{{ false }}"><div class="sc-quiz-in" style="display: flex; flex-direction: column; gap: 12px; padding: 0 4px; animation: scQuizIn .3s cubic-bezier(.2,.8,.2,1) both;">${learnWhy(16)}${learnExplain(15)}${quizFrom}</div></sc-if>
  </div>
  <div style="flex-grow: 1;"></div>
  <sc-if value="{{answered}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column;">${learnNext(56, 17)}</div></sc-if>
</div>`;
const phoneQuiz = phoneQuizOf(studyBgLayer);
const QUIZ_LOGIC = phone => `
constructor(props) { super(props); this.state = { i: 0, pick: props && props.answered ? 1 : null, gained: 0 }; }
renderVals() { ${T}${DB_JS}
  ${LEARN_VIEW_JS}
  ${EXPLAIN_JS}
  let q, pick, streak, learnedNow, why, v, n, choose, next, last;
  if (L) {
    // The app: the session's current question (web/db.js).
    q = { kind: L.kind, q: L.text, claim: L.claim, options: L.options || [], right: L.right, card: [L.cardText || L.text, L.answer] };
    pick = L.pick; streak = L.streak; learnedNow = L.learnedNow; n = L.n; last = false;
    // A question the learner's AI wrote brings its own why.
    const ok = pick === q.right, note = L.why ? ' ' + L.why : L.note ? ' ' + L.note : '';
    why = pick == null ? '' : ok ? (learnedNow ? 'Two right in a row.' + note : 'Get it right once more, asked another way, and it’s learned.' + note) : 'The answer is “' + (L.aiAnswer || L.answer) + '”.' + note + ' This card comes back in a few questions.';
    v = view(L.learned, L.total, L.learning, n, L.justLearned);
    choose = j => db.act.learnAnswer(j); next = () => db.act.learnNext();
  } else {
    // The canvas: three sample questions.
    const Q = ${JSON.stringify(LEARN_QS)}, s = this.state;
    q = Q[s.i]; pick = s.pick; n = s.i; last = s.i === Q.length - 1;
    const ok = pick === q.right;
    streak = q.streak + (pick != null && ok ? 1 : 0); learnedNow = pick != null && ok && streak >= 2;
    why = q.why + (pick == null ? '' : ok ? (learnedNow ? '' : ' Get it right once more, asked another way, and it’s learned.') : ' This card comes back in a few questions.');
    v = view(18 + s.gained, 40, 9, n, learnedNow ? 1 : 0);
    choose = j => { if (this.state.pick == null) this.setState({ pick: j, gained: this.state.gained + (j === q.right && q.streak + 1 >= 2 ? 1 : 0) }); };
    next = () => this.setState({ i: Math.min(Q.length - 1, s.i + 1), pick: null });
  }
  const done = pick != null, ok = pick === q.right;
  const ex = explainView(L && L.ex, L ? L.id : 'q' + (this.state.i || 0), q.q, done, ${JSON.stringify(EX_SAMPLE_LEARN)});
  ${LEARN_IMG_JS}
  return { t, ex, dark: !!this.props.dark, ...v, kind: q.kind, question: q.q, hasClaim: !!q.claim, claim: q.claim || '', ...learnImg(L ? L.image : q.image, L ? L.occ : q.occ, done),
    options: q.options.map((label, j) => {
      const right = done && j === q.right, wrong = done && j === pick && j !== q.right, other = done && !right && !wrong;
      return { label, key: String(j + 1), pressed: j === pick ? 'true' : 'false', plain: !right && !wrong, isRight: right, isWrong: wrong,
        bg: wrong || other ? K.gray : K.card, fg: wrong || other ? K.grayInk : K.ink, shadow: right ? K.lift : wrong || other ? 'none' : K.shadow,
        tf: right ? 'translateY(-5px)' : 'none', badge: right ? K.check : wrong ? K.wrong : other ? K.other : ${JSON.stringify(LEARN_COLORS)}[j % 4], badgeFg: other ? K.grayInk : '#FFFFFF',
        cursor: done ? 'default' : 'pointer', anim: right ? '${LEARN_HOVER}' : wrong ? 'scShake .35s ease' : 'none', pick: () => { if (!done) choose(j); } };
    }),
    answered: done, verdict: ok ? (learnedNow ? 'Learned.' : 'Right.') : 'Not quite.', verdictColor: ok ? t.good : t.again, why,
    cardFront: q.card[0], cardBack: q.card[1], isLast: last, notLast: !last, afterHref: '${phone ? 'PhoneQuizMatch' : 'WebQuizMatch'}.dc.html', next }; }`;
// Matching: tap a word, then what it means. A right pair pops and goes green; a wrong one shakes and clears.
const matchTile = (h, fs) => `<button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" class="sc-shake" style="min-height: ${h}px; box-sizing: border-box; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 0; border-radius: 18px; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.ring}}; opacity: {{m.op}}; transform: {{m.tf}}; animation: {{m.anim}}; font: inherit; font-size: ${fs}px; font-weight: 600; line-height: 1.3; text-align: left; cursor: {{m.cursor}}; transition: background-color .2s, opacity .3s, box-shadow .25s, transform .3s cubic-bezier(.2,.8,.2,1);"><span>{{m.label}}</span><sc-if value="{{m.check}}" hint-placeholder-val="{{ false }}"><span class="sc-tick" style="display: flex; color: {{k.check}};">${svg(I.check, 16, 2.6)}</span></sc-if></button>`;
const matchCols = (h, fs, gap) => `<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: ${gap}px;"><div style="display: flex; flex-direction: column; gap: ${gap}px;"><sc-for list="{{left}}" as="m" hint-placeholder-count="5">${matchTile(h, fs)}</sc-for></div><div style="display: flex; flex-direction: column; gap: ${gap}px;"><sc-for list="{{right}}" as="m" hint-placeholder-count="5">${matchTile(h, fs)}</sc-for></div></div>`;
const webQuizMatch = `<div style="position: relative; isolation: isolate; width: 1440px; height: 900px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${studyBgLayer}
  ${learnTop('WebDeck.dc.html')}
  <main style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="sc-q" style="width: 760px; display: flex; flex-direction: column; gap: 20px; animation: {{qAnim}};">
      <h1 style="margin: 0; font-size: 36px; font-weight: 700; line-height: 1.15; letter-spacing: -.03em;">{{question}}</h1>
      ${matchCols(60, 16, 12)}
      <div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 20px;"><span style="font-size: 14px; color: {{k.ink2}};">{{matchLine}}</span><sc-if value="{{allMatched}}" hint-placeholder-val="{{ false }}"><div class="sc-quiz-in" style="width: 180px; animation: scQuizIn .3s cubic-bezier(.2,.8,.2,1) both;">${learnNext(52, 15)}</div></sc-if></div>
    </div>
  </main>
</div>`;
const phoneQuizMatch = `<div style="position: relative; isolation: isolate; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 18px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${studyBgLayer}
  ${learnTopPhone('PhoneDeck.dc.html')}
  <div class="sc-q" style="display: flex; flex-direction: column; gap: 18px; animation: {{qAnim}};">
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 8px 4px 0;"><div style="font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -.025em;">{{question}}</div></div>
    ${matchCols(64, 14, 10)}
    <div style="padding: 0 4px; font-size: 14px; color: {{k.ink2}};">{{matchLine}}</div>
  </div>
  <div style="flex-grow: 1;"></div>
  <sc-if value="{{allMatched}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column;">${learnNext(56, 17)}</div></sc-if>
</div>`;
const MATCH_LOGIC = phone => `
constructor(props) { super(props); this.state = { done: [0, 3], sel: 1, wrong: null }; }
renderVals() { ${T}${DB_JS}
  ${LEARN_VIEW_JS}
  let left, right, doneIds, sel, wrong, pickL, pickR, v, next, last;
  if (L) {
    left = L.left || []; right = L.right || []; doneIds = L.matched || []; sel = L.sel; wrong = L.wrong; last = false;
    pickL = id => db.act.learnPick('left', id); pickR = id => db.act.learnPick('right', id); next = () => db.act.learnNext();
    v = view(L.learned, L.total, L.learning, L.n, L.justLearned);
  } else {
    const P = ${JSON.stringify(LEARN_PAIRS)}, s = this.state;
    left = P.map((p, i) => ({ id: i, label: p[0] })); right = ${JSON.stringify(LEARN_RIGHT)}.map(i => ({ id: i, label: P[i][1] }));
    doneIds = s.done; sel = s.sel; wrong = s.wrong; last = true;
    pickL = i => this.setState({ sel: i, wrong: null });
    pickR = i => { if (this.state.sel == null) return; if (i === this.state.sel) this.setState({ done: [...this.state.done, i], sel: null, wrong: null }); else { this.setState({ wrong: [this.state.sel, i] }); clearTimeout(this.w); this.w = setTimeout(() => this.setState({ wrong: null, sel: null }), 700); } };
    next = () => {};
    v = view(18, 40, 9, 1, 0);
  }
  const all = doneIds.length === left.length;
  const look = st => ({ bg: st === 'wrong' ? K.gray : K.card, fg: st === 'wrong' ? K.grayInk : K.ink,
    ring: st === 'sel' ? 'inset 0 0 0 2.5px ' + K.bar + ', ' + K.lift : st === 'idle' ? K.shadow : 'none', tf: st === 'sel' ? 'translateY(-3px)' : 'none',
    op: st === 'done' ? '.55' : '1', anim: st === 'wrong' ? 'scShake .35s ease' : st === 'done' ? 'scPop .32s ease' : 'none',
    check: st === 'done', cursor: st === 'done' ? 'default' : 'pointer', pressed: st === 'sel' ? 'true' : 'false' });
  return { t, dark: !!this.props.dark, ...v, kind: 'Matching', question: L ? 'Match each one to its answer.' : 'Match each organelle to what it does.', allMatched: all,
    matchLine: all ? 'All ' + left.length + ' matched.' : (left.length - doneIds.length) + ' pair' + (left.length - doneIds.length === 1 ? '' : 's') + ' to go',
    left: left.map(x => ({ label: x.label, ...look(doneIds.includes(x.id) ? 'done' : wrong && wrong[0] === x.id ? 'wrong' : sel === x.id ? 'sel' : 'idle'), pick: () => { if (!doneIds.includes(x.id)) pickL(x.id); } })),
    right: right.map(x => ({ label: x.label, ...look(doneIds.includes(x.id) ? 'done' : wrong && wrong[1] === x.id ? 'wrong' : 'idle'), pick: () => { if (!doneIds.includes(x.id)) pickR(x.id); } })),
    isLast: last, notLast: !last, afterHref: '${phone ? 'PhoneQuizType' : 'WebQuizType'}.dc.html', next }; }`;
// Typing the answer: close spelling counts, and "I was right" takes another word for the same thing.
const typeRow = (h, fs) => `<div style="display: flex; gap: 10px;"><input type="text" value="{{typed}}" onChange="{{setTyped}}" onKeyDown="{{typedKey}}" ref="{{focusIn}}" placeholder="Type your answer" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex-grow: 1; min-width: 0; height: ${h}px; box-sizing: border-box; padding: 0 20px; border: 0; outline: 0; border-radius: 20px; background: {{inputBg}}; box-shadow: {{inputRing}}; color: {{inputFg}}; font: inherit; font-size: ${fs}px; font-weight: 600; transform: {{inputTf}}; animation: {{inputAnim}}; transition: background-color .2s, box-shadow .25s, transform .3s cubic-bezier(.2,.8,.2,1);"><sc-if value="{{notChecked}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{check}}" style="height: ${h}px; padding: 0 26px; border: 0; border-radius: 999px; background: {{k.btn}}; color: {{k.btnFg}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Check</button></sc-if></div>`;
const typeOverride = `<sc-if value="{{canOverride}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{override}}" style="align-self: flex-start; height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: {{k.card}}; box-shadow: {{k.shadow}}; color: {{k.ink}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">I was right</button></sc-if>`;
const webQuizType = `<div style="position: relative; isolation: isolate; width: 1440px; height: 900px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${studyBgLayer}
  ${learnTop('WebDeck.dc.html')}
  <main style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="sc-q" style="width: 720px; display: flex; flex-direction: column; gap: 20px; animation: {{qAnim}};">
      <h1 style="margin: 0; font-size: 36px; font-weight: 700; line-height: 1.15; letter-spacing: -.03em; text-wrap: pretty;">{{question}}</h1>
      ${learnImage(240)}
      ${typeRow(64, 18)}
      <span style="font-size: 13px; color: {{k.ink2}};">Close spelling counts.</span>
      <div style="min-height: 150px;"><sc-if value="{{checked}}" hint-placeholder-val="{{ true }}"><div class="sc-quiz-in" style="display: flex; flex-direction: column; gap: 14px; animation: scQuizIn .3s cubic-bezier(.2,.8,.2,1) both;">
        ${learnWhy()}${typeOverride}${learnExplain(16)}
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 20px;">${quizFrom}<div style="flex-shrink: 0; width: 180px;">${learnNext(52, 15)}</div></div>
      </div></sc-if></div>
    </div>
  </main>
</div>`;
const phoneQuizType = `<div style="position: relative; isolation: isolate; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{k.ink}};">
  ${studyBgLayer}
  ${learnTopPhone('PhoneDeck.dc.html')}
  <div class="sc-q" style="display: flex; flex-direction: column; gap: 16px; animation: {{qAnim}};">
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 8px 4px 0;"><div style="font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -.025em;">{{question}}</div>${learnImage(180)}</div>
    ${typeRow(56, 16)}
    <span style="padding: 0 4px; font-size: 13px; color: {{k.ink2}};">Close spelling counts.</span>
    <sc-if value="{{checked}}" hint-placeholder-val="{{ true }}"><div class="sc-quiz-in" style="display: flex; flex-direction: column; gap: 12px; padding: 0 4px; animation: scQuizIn .3s cubic-bezier(.2,.8,.2,1) both;">${learnWhy(16)}${typeOverride}${learnExplain(15)}${quizFrom}</div></sc-if>
  </div>
  <div style="flex-grow: 1;"></div>
  <sc-if value="{{checked}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column;">${learnNext(56, 17)}</div></sc-if>
</div>`;
const TYPE_LOGIC = phone => `
constructor(props) { super(props); this.state = { typed: 'golgi body', checked: true, qid: null }; }
renderVals() { ${T}${DB_JS}
  ${LEARN_VIEW_JS}
  ${EXPLAIN_JS}
  let typed, checked, ok, question, answer, why, v, check, override, next, last, learnedNow;
  if (L) {
    // A new question clears what you typed for the last one.
    if (this.state.qid !== L.id) { this.state.qid = L.id; this.state.typed = ''; }
    typed = L.checked ? L.typed : this.state.typed; checked = !!L.checked; ok = !!L.ok; question = L.text; answer = L.answer; learnedNow = L.learnedNow; last = false;
    const note = L.note ? ' ' + L.note : '';
    why = !checked ? '' : ok ? (learnedNow ? 'Two right in a row.' + note : 'Get it right once more, asked another way, and it’s learned.' + note) : 'The answer is “' + answer + '”.' + note + ' This card comes back in a few questions.';
    check = () => db.act.learnType(this.state.typed); override = () => db.act.learnOverride(); next = () => db.act.learnNext();
    v = view(L.learned, L.total, L.learning, L.n, L.justLearned);
  } else {
    const s = this.state;
    typed = s.typed; checked = s.checked; ok = /golg/i.test(s.typed || ''); question = 'Which organelle packages proteins for secretion?'; answer = 'Golgi apparatus'; last = true;
    learnedNow = checked && ok;
    why = ok ? '“' + String(s.typed).trim() + '” is close to the Golgi apparatus, so it counts. That was the second time in a row.' : 'The answer is “Golgi apparatus”. This card comes back in a few questions.';
    check = () => { if ((this.state.typed || '').trim()) this.setState({ checked: true }); }; override = () => this.setState({ typed: 'Golgi apparatus' }); next = () => {};
    v = view(learnedNow ? 19 : 18, 40, 9, 2, learnedNow ? 1 : 0);
  }
  const ex = explainView(L && L.ex, L ? L.id : 'typeq', question, checked, ${JSON.stringify("The Golgi apparatus takes proteins from the rough ER, finishes them with sugar tags, and ships them out in little bubbles called vesicles. Think of it as the cell’s post office: sort, label, send.")});
  ${LEARN_IMG_JS}
  return { t, ex, dark: !!this.props.dark, ...v, kind: 'Type the answer', question, ...learnImg(L && L.image, L && L.occ, checked), 
    typed, checked, notChecked: !checked, canOverride: checked && !ok, check, override, next,
    setTyped: e => { const x = e && e.target ? e.target.value : ''; if (L) this.state.typed = x; else this.setState({ typed: x, checked: false }); },
    typedKey: e => { if (e && e.key === 'Enter' && !checked) { if (e.preventDefault) e.preventDefault(); check(); } },
    focusIn: el => { if (L && el && !checked && document.activeElement !== el) el.focus(); },
    inputBg: checked && !ok ? K.gray : K.card, inputFg: checked && !ok ? K.grayInk : K.ink, inputTf: checked && ok ? 'translateY(-3px)' : 'none',
    inputRing: !checked ? K.shadow : ok ? 'inset 0 0 0 2.5px ' + K.check + ', ' + K.lift : 'none', inputAnim: checked && !ok ? 'scShake .35s ease' : 'none',
    verdict: ok ? (learnedNow ? 'Learned.' : 'Right.') : 'Not quite.', verdictColor: ok ? t.good : t.again, why,
    cardFront: question, cardBack: answer, isLast: last, notLast: !last, afterHref: '${phone ? 'PhoneQuizDone' : 'WebQuizDone'}.dc.html' }; }`;
// The end: every card learned, what took the most tries, and that they're in your reviews now. The sky's faint blue
// fade sits behind its top (a night sky in dark mode): the owner asked for a sky here (V73), then for no clouds (V75).
const learnRing = (size, stroke) => { const r = (size - stroke) / 2, c = size / 2;
  return `<div style="position: relative; width: ${size}px; height: ${size}px;"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="{{t.surf2}}" stroke-width="${stroke}"/><circle class="sc-draw" pathLength="1" transform="rotate(-90 ${c} ${c})" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="{{ring}}" stroke-width="${stroke}" stroke-linecap="round"/></svg><div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"><span aria-label="{{total}} of {{total}}" style="font-size: ${Math.round(size / 4.6)}px; font-weight: 600; letter-spacing: -.04em; line-height: 1; font-variant-numeric: tabular-nums;"><span class="sc-count" style="--to: {{total}};"></span>/{{total}}</span><span style="margin-top: 4px; font-size: 13px; color: {{t.muted}};">learned</span></div></div>`; };
const learnTries = `<sc-if value="{{hasTries}}" hint-placeholder-val="{{ true }}"><div style="width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left;"><span style="font-size: 15px; font-weight: 600;">Took the most tries</span><sc-for list="{{tries}}" as="m" hint-placeholder-count="2"><div style="box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="min-width: 0; font-size: 15px; line-height: 1.35;">{{m.front}} <span style="color: {{t.muted}};">→</span> <span style="font-weight: 600;">{{m.back}}</span></span><span style="flex-shrink: 0; font-size: 13px; color: {{t.muted}};">{{m.n}}</span></div></sc-for></div></sc-if>`;
const learnInReviews = `<div style="width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; gap: 12px; text-align: left; font-size: 14px; line-height: 1.45;"><span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(I.today, 18, 1.8)}</span>They’re in your reviews now. Lucida brings each card back right before you’d forget it.</div>`;
const webQuizDone = `<div style="position: relative; isolation: isolate; width: 1440px; height: 900px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  ${studyBgLayer}
  <main style="width: 560px; display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;">
    ${learnRing(190, 16)}
    <div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">{{title}}</h1><div style="font-size: 16px; color: {{t.muted}};">{{summary}}</div></div>
    ${learnInReviews}
    ${learnTries}
    <div style="width: 100%; display: flex; gap: 10px;">${quizBtn('Learn more cards', 'WebQuizStart.dc.html', false, 1)}${quizBtn('Done', 'WebDeck.dc.html', true, 1)}</div>
  </main>
</div>`;
const phoneQuizDone = `<div style="position: relative; isolation: isolate; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 20px 34px; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  ${studyBgLayer}
  ${learnRing(156, 14)}
  <div style="display: flex; flex-direction: column; gap: 6px;"><div style="font-size: 28px; font-weight: 700; letter-spacing: -.03em;">{{title}}</div><div style="font-size: 15px; color: {{t.muted}};">{{summaryShort}}</div></div>
  ${learnInReviews}
  ${learnTries}
  <div style="flex-grow: 1;"></div>
  <div style="width: 100%; display: flex; gap: 10px;">${quizBtn('Learn more', 'PhoneQuizStart.dc.html', false, 1)}${quizBtn('Done', 'PhoneDeck.dc.html', true, 1)}</div>
</div>`;
const QUIZ_DONE_LOGIC = `renderVals() { ${T}${DB_JS}
  const L = db.mock ? { total: 40, setName: 'Exam 1', minutes: 26, firstPct: 88, tries: [{ front: 'Lysosome', back: 'Breaks down waste', n: '4 tries' }, { front: 'What is the role of the ribosome?', back: 'Translates mRNA into protein', n: '3 tries' }] }
    : db.learn() || { total: 0, setName: '', minutes: 0, firstPct: 0, tries: [] };
  ${STUDY_BG_JS}
  return { t, sky: ${SKY}, bg: studyBg(db.deck(db.mock ? 'cell' : (db.learn() || {}).deckId || this.props.deckId), !!this.props.dark, !!this.props.dim), ring: this.props.dark ? '#8C9AFC' : '#4353E0', total: String(L.total), title: L.total === 1 ? 'You learned it' : 'You learned all ' + L.total + ' cards',
    summary: L.setName + ' · ' + L.minutes + ' minute' + (L.minutes === 1 ? '' : 's') + ' · ' + L.firstPct + '% right the first time', summaryShort: L.setName + ' · ' + L.minutes + ' min · ' + L.firstPct + '% first time',
    hasTries: L.tries.length > 0, tries: L.tries }; }`;

// ---------- dark wrappers ----------
const darkOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden; background: #000000;"><dc-import name="${name}" dark="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const darkLogic = `renderVals() { return { yes: true }; }`;
// Gray dark mode (Settings → Dark mode: Gray): the same boards, dark on gray instead of black.
const grayOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden; background: #1E1E20;"><dc-import name="${name}" dark="{{yes}}" dim="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const settingsOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" settings-open="{{yes}}" progress="Counts" hint-size="${w}px,${h}px"></dc-import></div>`;
const openOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" settings-open="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const pileOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" grading="Piles" start-revealed="{{yes}}" new-pile-open="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const blankOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" card="Fill in the blank" hint-size="${w}px,${h}px"></dc-import></div>`;
const caughtOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" caught-up="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const listOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" view="List" hint-size="${w}px,${h}px"></dc-import></div>`;
const typeOf = (name, w, h, type) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" card-type="${type}" hint-size="${w}px,${h}px"></dc-import></div>`;
const studyOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" settings-open="{{yes}}" settings-tab="Studying" hint-size="${w}px,${h}px"></dc-import></div>`;
const attrOf = (name, w, h, attrs) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" ${attrs} hint-size="${w}px,${h}px"></dc-import></div>`;
const styleOf = (name, w, h, grading) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden;"><dc-import name="${name}" grading="${grading}" start-revealed="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;

// ---------- Sign in: Google, Apple, or a 6-digit code sent by email ----------
// The Google and Apple logos come from design/logos (see logos.mjs).
// In the app these sign in for real (the logic's handlers); on the canvas their links just show the next board.
const authBtn = (label, glyph, href, h, handler) => `<a href="${href}" onClick="{{${handler}}}" style="height: ${h}px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 999px; background: {{t.bg}}; box-shadow: inset 0 0 0 1px {{t.surf2}}; font-size: 15px; font-weight: 600;">${glyph}${label}</a>`;
const orLine = `<div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: {{t.muted}};"><span style="flex-grow: 1; height: 1px; background: {{t.line}};"></span>or<span style="flex-grow: 1; height: 1px; background: {{t.line}};"></span></div>`;
// What signing in means, with the Terms and Privacy pages a tap away.
const AGREE = `<p style="margin: 0; font-size: 12px; line-height: 1.5; color: {{t.muted}}; text-align: center;">By continuing, you agree to the <a href="{{termsHref}}" style="text-decoration: underline;">Terms</a> and <a href="{{privacyHref}}" style="text-decoration: underline;">Privacy Policy</a>.</p>`;
// Phones get 16px text in the field, or they zoom in when it's tapped.
const emailForm = (h, next, fs = 15) => `<div style="display: flex; flex-direction: column; gap: 10px;"><input type="email" value="{{email}}" onChange="{{setEmail}}" onKeyDown="{{emailKey}}" placeholder="Email" aria-label="Email" autocomplete="email" style="height: ${h}px; box-sizing: border-box; padding: 0 20px; border: 0; outline: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: ${fs}px;"><a href="${next}" onClick="{{sendCode}}" style="height: ${h}px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; font-weight: 600;">{{sendLabel}}</a>${SIGN_ERROR}</div>`;
// Why signing in didn't work (a wrong code, Google not set up yet), under the field it's about.
const SIGN_ERROR = `<sc-if value="{{hasError}}" hint-placeholder-val="{{ false }}"><div role="alert" style="padding: 2px 4px 0; font-size: 14px; line-height: 1.4; color: {{t.again}}; text-align: center;">{{error}}</div></sc-if>`;
// Six boxes over one real field, so typing, pasting, and the phone's "code from Mail" all work.
const codeBoxes = (w, h) => `<label style="position: relative; display: flex; justify-content: space-between; gap: 6px; cursor: text;"><sc-for list="{{boxes}}" as="b" hint-placeholder-count="6"><span style="flex: 0 1 ${w}px; min-width: 0; height: ${h}px; border-radius: 14px; background: {{t.surf}}; box-shadow: {{b.ring}}; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600;">{{b.digit}}</span></sc-for><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="{{code}}" onChange="{{setCode}}" aria-label="6-digit code" style="position: absolute; inset: 0; width: 100%; opacity: 0; border: 0; padding: 0; font-size: 16px;"></label>`;
// The card wall (sign-in and the landing page): flashcards in tilted columns, each column drifting slowly up or down (the
// next one the other way). A column holds its cards twice and moves by one set, so the loop has no seam; with reduced
// motion it holds still. Some cards turn over now and then to show their backs; a blank fills in where it is.
const WALL_ROWS = 6;
// How often cards turn: on the landing page every other card (every third on phones), once every 16 s; on sign-in, where
// the wall is only a backdrop, every third card, once every 28 s.
const FLIPS = { busy: { loop: 16, every: 2 }, phone: { loop: 16, every: 3 }, calm: { loop: 28, every: 3 } };
// Columns for renderVals (the cards are in wall.mjs): text sized by its length (k shrinks it for smaller cards), seconds
// per loop for each column, each column starting part of a card from the last so rows don't line up, and a turn time
// for each card spread over the loop so only a few turn at once.
const WALL_VALS = (secs, k, { loop, every } = FLIPS.busy) => `wall: ${JSON.stringify(secs)}.map((d, i) => {
      // Wider walls reuse the columns, turned a few cards so the same cards never sit side by side.
      const base = ${JSON.stringify(WALL_CARDS)}[i % 4], turn = 3 * Math.floor(i / 4), col = base.slice(turn).concat(base.slice(0, turn));
      const size = s => Math.round((s.length <= 12 ? 30 : s.length <= 26 ? 23 : 19) * ${k});
      const cards = col.map(([deck, front, back], j) => {
        const audio = front === '♪', code = /^\`.*\`$/.test(front), s = code ? front.slice(1, -1) : front, [before, after] = s.split('{}');
        const blank = after != null, bcode = /^\`.*\`$/.test(back), [answer, sub = ''] = (bcode ? back.slice(1, -1) : back).split('\\n');
        const flips = !blank && ((i + j) % ${every} === 0 || audio), at = ' ${loop}s linear -' + (((i * 37 + j * 17) % 32) / 32 * ${loop}).toFixed(2) + 's infinite';
        // Turning cards draw above the rest (z 1), so a phone keeps the still cards of a column together in one layer.
        return { ...this.art(this.gen(deck, 'vivid')), audio, words: !audio, before, after: after ?? '', blank, z: flips ? 1 : 0,
          font: code ? "${MONO}" : 'inherit', size: size(s), answer, sub, hasSub: !!sub, answerFont: bcode ? "${MONO}" : 'inherit',
          answerSize: size(answer), subSize: Math.round(16 * ${k}), flips, flip: flips ? 'scFlip${loop}' + at : 'none', back: flips ? 'scBack${loop}' + at : 'none', reveal: blank ? 'scReveal${loop}' + at : 'none' };
      });
      const up = i % 2 === 0, f = [0, .5, .25, .75, .125, .625, .375, .875][i % 8] / ${WALL_ROWS};
      return { cards: cards.concat(cards), anim: (up ? 'scUp ' : 'scDown ') + d + 's linear -' + ((up ? f : 1 - f) * d).toFixed(2) + 's infinite' };
    }),`;
// The review card's turn curve (the landing page's study demo uses it too).
const TURN = 'animation-timing-function:cubic-bezier(.4,0,.2,1)';
// A wall card's turn takes .5 s: it narrows to its edge, shows its other side, and widens again; the back stays up for
// about 5 s of each loop. It turns flat (no 3D), so a turning card is one layer for a phone to draw instead of three.
const wallKeys = L => {
  const p = s => +(s / L * 100).toFixed(3), a = L - 6.4, c = L - 1.12;
  const turn = at => `${p(at)}%{transform:scaleX(1);animation-timing-function:cubic-bezier(.4,0,1,1)}${p(at + .25)}%{transform:scaleX(0);animation-timing-function:cubic-bezier(0,0,.2,1)}${p(at + .5)}%{transform:scaleX(1)}`;
  return `@keyframes scFlip${L}{0%{transform:scaleX(1)}${turn(a)}${turn(c)}100%{transform:scaleX(1)}}`
    + `@keyframes scBack${L}{0%,${p(a + .25)}%{visibility:hidden}${p(a + .26)}%,${p(c + .25)}%{visibility:visible}${p(c + .26)}%,100%{visibility:hidden}}`
    + `@keyframes scReveal${L}{0%,${p(a)}%{opacity:0}${p(a + .5)}%,${p(c)}%{opacity:1}${p(c + .5)}%,100%{opacity:0}}`;
};
const WALL_CSS = '@keyframes scUp{from{transform:translateY(0)}to{transform:translateY(-50%)}}@keyframes scDown{from{transform:translateY(-50%)}to{transform:translateY(0)}}.sc-drift{will-change:transform}'
  + Object.values(FLIPS).map(f => wallKeys(f.loop)).join('')
  + '@media (prefers-reduced-motion:reduce){.sc-drift{animation-play-state:paused!important}.sc-wc,.sc-wb,.sc-rev{animation:none!important}}';
// What a card shows, the way review shows it: its words (a blank is a glass pill the answer fills), or a play button
// and waveform for sound. Its back: the answer, and a smaller second line.
const wallFace = k => {
  const px = n => Math.max(2, Math.round(n * k));
  const bars = [10, 20, 30, 16, 26, 12, 22, 14, 8].map(b => `<span style="width: ${px(3)}px; height: ${px(b)}px; border-radius: 2px; background: currentColor; opacity: .85;"></span>`).join('');
  return `<sc-if value="{{c.words}}" hint-placeholder-val="{{ true }}"><span style="font-family: {{c.font}}; font-size: {{c.size}}px; font-weight: 500; line-height: 1.2; letter-spacing: -.02em;">{{c.before}}<sc-if value="{{c.blank}}" hint-placeholder-val="{{ false }}"><span style="display: inline-block; margin: 0 .1em; padding: 0 .4em; border-radius: 999px; line-height: 1.1; background: {{c.glass}};"><span class="sc-rev" style="opacity: 0; animation: {{c.reveal}};">{{c.answer}}</span></span></sc-if>{{c.after}}</span></sc-if><sc-if value="{{c.audio}}" hint-placeholder-val="{{ false }}"><span style="display: flex; align-items: center; gap: ${px(14)}px;"><span style="width: ${px(46)}px; height: ${px(46)}px; flex-shrink: 0; border-radius: 50%; background: {{c.glass}}; box-shadow: inset 0 0 0 1.5px {{c.glassLine}}; display: flex; align-items: center; justify-content: center;"><span style="display: flex; margin-left: ${px(3)}px;">${svg(I.play, px(20), 0)}</span></span><span style="display: flex; align-items: center; gap: ${px(4)}px;">${bars}</span></span></sc-if>`;
};
const WALL_BACK = `<span style="display: flex; flex-direction: column; align-items: center; gap: 4px;"><span style="font-family: {{c.answerFont}}; font-size: {{c.answerSize}}px; font-weight: 600; line-height: 1.15; letter-spacing: -.02em;">{{c.answer}}</span><sc-if value="{{c.hasSub}}" hint-placeholder-val="{{ false }}"><span style="font-size: {{c.subSize}}px; font-weight: 500; opacity: .85;">{{c.sub}}</span></sc-if></span>`;
const cardWall = ({ cols, w, h, gap, r, tilt, k }) => {
  const set = WALL_ROWS * (h + gap), width = cols * w + (cols - 1) * gap;
  const face = back => `<div${back ? ' class="sc-wb"' : ''} style="position: absolute; inset: 0; overflow: hidden; border-radius: ${r}px; color: {{c.ink}}; background: {{c.base}};${back ? ' visibility: hidden; animation: {{c.back}};' : ''}">${ART_LAYERS('c')}<div style="position: relative; height: 100%; box-sizing: border-box; padding: ${Math.round(22 * k)}px; display: flex; align-items: center; justify-content: center; text-align: center; text-shadow: {{c.shadow}};">${back ? WALL_BACK : wallFace(k)}</div></div>`;
  return `<div aria-hidden="true" style="position: absolute; left: 50%; top: 50%; width: ${width}px; height: ${set}px; margin: -${set / 2}px 0 0 -${width / 2}px; display: flex; gap: ${gap}px; transform: rotate(${tilt}deg); pointer-events: none;"><sc-for list="{{wall}}" as="col" hint-placeholder-count="${cols}"><div class="sc-drift" style="flex-shrink: 0; align-self: flex-start; display: flex; flex-direction: column; gap: ${gap}px; padding-bottom: ${gap}px; animation: {{col.anim}};"><sc-for list="{{col.cards}}" as="c" hint-placeholder-count="${WALL_ROWS * 2}"><div class="sc-wc" style="position: relative; z-index: {{c.z}}; width: ${w}px; height: ${h}px; flex-shrink: 0; animation: {{c.flip}};">${face(false)}<sc-if value="{{c.flips}}" hint-placeholder-val="{{ false }}">${face(true)}</sc-if></div></sc-for></div></sc-for></div>`;
};
// iPhone cards are smaller, so their words and padding shrink by this much.
const PHONE_K = 150 / 264;
// The wall on sign-in drifts over near-black, edge to edge, in light and dark mode alike.
const signPanel = (style, wall) => `<div style="position: relative; overflow: hidden; background: linear-gradient(180deg, #12141C 0%, #0B0C12 55%, #060709 100%); ${style}">${cardWall(wall)}</div>`;
// The sign-in column: the form in the very middle (the logo sits in the corner, apart from it).
// The owner: "allow users to go back to landing page from the sign in page". The logo and a quiet link both go to
// lucida.cards.
const HOME = 'https://lucida.cards';
const signCol = inner => `<section style="position: relative; width: 560px; flex-shrink: 0; box-sizing: border-box; padding: 32px 40px; display: flex; flex-direction: column; justify-content: center;">
    <a href="${HOME}" aria-label="Lucida home" style="position: absolute; top: 32px; left: 40px;">${logo()}</a>
    <a href="${HOME}" style="position: absolute; top: 34px; right: 40px; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: {{t.muted}};">${svg(I.back, 16, 2)}Back to home</a>
    <div style="width: 360px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">${inner}</div>
  </section>`;
const webSignRoot = inner => `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
  ${signCol(inner)}
  ${signPanel('flex-grow: 1; min-width: 0;', { cols: 4, w: 264, h: 176, gap: 16, r: 20, tilt: -14, k: 1 })}
</div>`;
const webSignIn = webSignRoot(`<h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; text-align: center;">Sign in to Lucida</h1>
      <div style="display: flex; flex-direction: column; gap: 10px;">${authBtn('Continue with Google', G_LOGO, 'Main.dc.html', 44, 'google')}${authBtn('Continue with Apple', APPLE_LOGO, 'Main.dc.html', 44, 'apple')}</div>
      ${orLine}
      ${emailForm(44, 'WebSignInCode.dc.html')}
      ${AGREE}`);
const codeText = `<div style="display: flex; flex-direction: column; gap: 8px; text-align: center;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Check your email</h1><div style="font-size: 15px; line-height: 1.45; color: {{t.muted}};">Enter the 6-digit code we sent to <span style="color: {{t.text}}; font-weight: 500;">{{sentTo}}</span></div></div>`;
const webSignInCode = webSignRoot(`<a href="WebSignIn.dc.html" style="align-self: center; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: {{t.muted}};">${svg(I.back, 16, 2)}Use another email</a>
      ${codeText}
      ${codeBoxes(52, 60)}${SIGN_ERROR}
      <div style="display: flex; flex-direction: column; gap: 14px;"><a href="Main.dc.html" onClick="{{verify}}" style="height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; font-weight: 600;">{{verifyLabel}}</a><button type="button" onClick="{{resend}}" style="align-self: center; border: 0; padding: 0; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; cursor: pointer;">{{resendLabel}}</button></div>`);
// The phone sign-in pages fill any phone's screen in the app (design/to-web.mjs swaps this 390 x 844 frame for the
// window), so the wall takes whatever height the form leaves.
const signPhoneRoot = inner => `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${inner}
</div>`;
// The wall takes only the height the form leaves (at least 120px), so sign-in fits a phone's screen without scrolling.
const phoneSignIn = signPhoneRoot(`<a href="${HOME}" style="position: absolute; top: 56px; left: 16px; z-index: 2; height: 36px; box-sizing: border-box; padding: 0 14px 0 10px; border-radius: 18px; background: rgba(255,255,255,.88); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: 0 4px 14px rgba(0,0,0,.18); color: #111111; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600;">${svg(I.back, 16, 2.2)}Home</a>
  ${signPanel('flex: 1 1 0; min-height: 120px;', { cols: 4, w: 150, h: 100, gap: 10, r: 16, tilt: -14, k: PHONE_K })}
  <div style="flex-shrink: 0; box-sizing: border-box; padding: 22px 20px 34px; display: flex; flex-direction: column; gap: 10px;">
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -.03em; text-align: center;">Sign in to Lucida</h1>
    ${authBtn('Continue with Apple', APPLE_LOGO, 'PhoneToday.dc.html', 50, 'apple')}${authBtn('Continue with Google', G_LOGO, 'PhoneToday.dc.html', 50, 'google')}
    <div style="padding: 4px 0;">${orLine}</div>
    ${emailForm(50, 'PhoneSignInCode.dc.html', 16)}
    ${AGREE}
  </div>`);
const phoneSignInCode = signPhoneRoot(`<div style="flex: 1 0 auto; box-sizing: border-box; padding: 64px 20px 34px; display: flex; flex-direction: column; gap: 28px;">
  ${roundBtn('back', 'Use another email', 'PhoneSignIn.dc.html')}
  ${codeText}
  ${codeBoxes(50, 58)}${SIGN_ERROR}
  <div style="flex-grow: 1;"></div>
  <div style="display: flex; flex-direction: column; gap: 14px;"><a href="PhoneToday.dc.html" onClick="{{verify}}" style="height: 52px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 16px; font-weight: 600;">{{verifyLabel}}</a><button type="button" onClick="{{resend}}" style="align-self: center; border: 0; padding: 0; background: transparent; color: {{t.muted}}; font: inherit; font-size: 15px; cursor: pointer;">{{resendLabel}}</button></div>
</div>`);
// On the canvas the code page shows three digits typed, with the fourth box next.
const signInLogic = (code, secs, k = 1) => `${ART_METHOD}
constructor(props) { super(props); const a = props.db && props.db.auth; this.state = { email: a ? a.email() : '', code: a ? '' : '${code}', resent: false, busy: false, error: a ? a.error() : '' }; }
renderVals() { ${T}
  const s = this.state, code = String(s.code || ''), a = this.props.db && this.props.db.auth;
  // In the app (props.db) these sign in for real: an email code, or Google and Apple through the server.
  const stop = e => { if (e && e.preventDefault) e.preventDefault(); };
  const failed = e => this.setState({ busy: false, error: e.message });
  const send = e => {
    if (!a) return; stop(e);
    const email = String(s.email || '').trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return this.setState({ error: 'Type your email address.' });
    if (s.busy) return;
    this.setState({ busy: true, error: '' });
    a.sendCode(email).then(() => { this.setState({ busy: false }); a.go('/sign-in/code'); }, failed);
  };
  const check = digits => {
    if (!a || digits.length < 6 || s.busy) return;
    this.setState({ busy: true, error: '' });
    // A wrong code empties the boxes (and the field under them, which keeps typed text while it has focus).
    a.verify(digits).then(() => a.done(), e => { const box = document.querySelector('input[autocomplete="one-time-code"]'); if (box) box.value = ''; this.setState({ busy: false, code: '', error: e.message }); });
  };
  const leave = to => e => { if (!a) return; stop(e); location.assign(to); };
  return { grain: String(this.props.grain ?? 0.7), t, ${secs ? WALL_VALS(secs, k, FLIPS.calm) : ''}
    email: s.email, setEmail: e => this.setState({ email: e && e.target ? e.target.value : '', error: '' }), emailKey: e => { if (e && e.key === 'Enter') send(e); },
    sentTo: (s.email || '').trim() || 'you@school.edu', sendCode: send, sendLabel: s.busy ? 'Sending…' : 'Continue',
    google: leave('/auth/google'), apple: leave('/auth/apple'),
    code, setCode: e => { const c = String(e && e.target ? e.target.value : '').replace(/\\D/g, '').slice(0, 6); this.setState({ code: c, error: '' }); check(c); },
    verify: e => { if (!a) return; stop(e); if (code.length < 6) return this.setState({ error: 'Type the 6-digit code from the email.' }); check(code); },
    verifyLabel: s.busy ? 'Checking…' : 'Continue', error: s.error, hasError: !!s.error,
    boxes: Array.from({ length: 6 }, (_, i) => ({ digit: code[i] || '', ring: i === Math.min(code.length, 5) ? 'inset 0 0 0 2px ' + t.text : 'none' })),
    resend: () => { if (!a) return this.setState({ resent: true }); a.sendCode(a.email()).then(() => this.setState({ resent: true, error: '' }), failed); },
    resendLabel: s.resent ? 'New code sent' : 'Send a new code',
    termsHref: a ? '/terms' : 'Terms.dc.html', privacyHref: a ? '/privacy' : 'Privacy.dc.html' }; }`;

// ---------- Landing page (lucida.cards) ----------
// One page, drawn twice: for computers (Landing) and phones (LandingPhone). design/to-site.mjs turns both into the
// static page at lucida.cards; there the links go to the app, on the canvas to the sign-in boards.
const LAND = {
  web: { pad: 48, h1: 80, lead: 19, h2: 48, gapTop: 128, btn: 48, wallH: 560, wall: { cols: 9, w: 264, h: 176, gap: 16, r: 20, tilt: -14, k: 1 }, typeH: 196, ctaH1: 56, typeCols: 'repeat(auto-fit, minmax(240px, 1fr))' },
  phone: { pad: 20, h1: 44, lead: 17, h2: 32, gapTop: 88, btn: 50, wallH: 420, wall: { cols: 4, w: 150, h: 100, gap: 10, r: 16, tilt: -14, k: PHONE_K }, typeH: 150, ctaH1: 34, typeCols: 'repeat(2, minmax(0, 1fr))' }
};
const landPill = (label, href, inv, h, extra = '') => `<a href="${href}" style="height: ${h}px; padding: 0 ${Math.round(h / 2)}px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: ${h >= 48 ? 15 : 14}px; font-weight: 600; white-space: nowrap; ${inv ? 'background: {{t.inv}}; color: {{t.invText}};' : 'background: {{t.surf}}; color: {{t.text}};'} ${extra}">${label}</a>`;
const landH2 = (L, text) => `<h2 style="margin: 0; max-width: 760px; font-size: ${L.h2}px; font-weight: 600; line-height: 1.04; letter-spacing: -.04em; text-wrap: balance;">${text}</h2>`;
const leadP = (L, text, center) => `<p style="margin: ${Math.round(L.lead * .9)}px ${center ? 'auto' : '0'} 0; max-width: 600px; font-size: ${L.lead}px; line-height: 1.5; color: {{t.muted}}; text-wrap: pretty;">${text}</p>`;
// A demo beside its words: side by side on computers (the demo first when `demoFirst`), stacked on phones.
const featureRow = (L, id, title, text, demo, demoFirst) => {
  const phone = L === LAND.phone, words = `<div style="min-width: 0;">${landH2(L, title)}${leadP(L, text)}</div>`;
  return `<section${id ? ` id="${id}"` : ''} style="max-width: 1200px; margin: 0 auto; box-sizing: border-box; padding: ${L.gapTop}px ${L.pad}px 0;">
  <div style="${phone ? 'display: flex; flex-direction: column; gap: 28px;' : `display: grid; grid-template-columns: ${demoFirst ? 'minmax(0, 7fr) minmax(0, 5fr)' : 'minmax(0, 5fr) minmax(0, 7fr)'}; gap: 64px; align-items: center;`}">
    ${demoFirst && !phone ? demo + words : words + demo}
  </div>
</section>`;
};

// Two demos that loop on CSS keyframes alone, so they play the same on the canvas and the site. Every part of a demo
// runs on the same loop, so the parts stay together; with reduced motion each shows its finished state.
const CHAT_S = 14, STUDY_S = 16;
const keyframes = (name, stops) => `@keyframes ${name}{${stops.map(([at, css]) => `${at}{${css}}`).join('')}}`;
const EASE_OUT = 'animation-timing-function:cubic-bezier(.2,.8,.2,1)';
const showAt = (name, at, from = 'transform:translateY(10px)') => keyframes(name, [[`0%,${at}%`, `opacity:0;${from};${EASE_OUT}`], [`${at + 4}%,100%`, 'opacity:1;transform:none']]);
const showBetween = (name, a, b, from = 'transform:translateY(6px)') => keyframes(name, [[`0%,${a}%`, `opacity:0;${from};${EASE_OUT}`], [`${a + 2.5}%,${b}%`, 'opacity:1;transform:none'], [`${b + 2}%,100%`, 'opacity:0;transform:none']]);
// The study demo's two cards take turns: A in the first half of the loop, B (the same steps) in the second.
const studyKeys = (x, o) => [
  keyframes('scStudy' + x, [[`0%,${o}%`, `opacity:0;transform:translateX(28px);${EASE_OUT}`], [`${o + 3}%,${o + 44}%`, 'opacity:1;transform:none;animation-timing-function:ease-in'], [`${o + 48}%,100%`, 'opacity:0;transform:translateX(-28px)']]),
  keyframes('scTurn' + x, [[`0%,${o + 14}%`, `transform:rotateY(0deg);${TURN}`], [`${o + 17.125}%,100%`, 'transform:rotateY(180deg)']]),
  keyframes('scTap' + x, [[`0%,${o + 11}%`, 'opacity:0;transform:scale(.5)'], [`${o + 12}%`, 'opacity:.16;transform:scale(.5)'], [`${o + 15}%,100%`, 'opacity:0;transform:scale(1.5)']]),
  showBetween('scRate' + x, o + 18, o + 35),
  keyframes('scPress' + x, [[`0%,${o + 29}%`, 'transform:none'], [`${o + 30.5}%`, 'transform:scale(.93)'], [`${o + 32}%,100%`, 'transform:none']]),
  keyframes('scPick' + x, [[`0%,${o + 29.5}%`, 'opacity:0'], [`${o + 30.5}%,${o + 35}%`, 'opacity:1'], [`${o + 37}%,100%`, 'opacity:0']]),
  showBetween('scToast' + x, o + 36.5, o + 44)
].join('');
const DEMO_CSS = [
  keyframes('scChat', [['0%,91%', 'opacity:1'], ['95%,100%', 'opacity:0']]),
  showAt('scChatYou', 2), showBetween('scChatDots', 9, 17, 'transform:none'), showBetween('scChatWork', 18, 30), showAt('scChatDone', 30, 'transform:none'),
  showAt('scChatCard1', 33, 'transform:translateY(10px) scale(.92)'), showAt('scChatCard2', 36, 'transform:translateY(10px) scale(.92)'), showAt('scChatCard3', 39, 'transform:translateY(10px) scale(.92)'),
  showAt('scChatText', 45),
  '@keyframes scSpin{to{transform:rotate(360deg)}}@keyframes scDot{0%,60%,100%{transform:none;opacity:.45}30%{transform:translateY(-3px);opacity:1}}@keyframes scWaveSoft{from{transform:scaleY(.5)}to{transform:none}}@keyframes scFill{0%,35%{opacity:0;transform:translateY(.25em)}45%,85%{opacity:1;transform:none}95%,100%{opacity:0;transform:none}}',
  studyKeys('A', 0), studyKeys('B', 50),
  '@media (prefers-reduced-motion:reduce){.sc-anim,.sc-anim *{animation:none!important}.sc-transient{display:none!important}}'
].join('');

// An AI chat using Lucida: you share a lecture, the AI adds cards through your Lucida link, and they show up.
const PICTURE_ICON = '<ellipse cx="62" cy="42" rx="56" ry="32"/><path d="M18 44c8-16 14 14 22 0s14 14 22 0 14 14 22 0 12 12 20 0"/><circle cx="112" cy="14" r="11" fill="currentColor" stroke="none"/><path d="M103 21 90 30"/>';
const chatDemo = phone => {
  const A = `${CHAT_S}s linear infinite`;
  const pill = '<span style="display: inline-block; width: 2.4em; height: .9em; margin: 0 .1em; border-radius: 999px; vertical-align: -.1em; background: {{m1.glass}};"></span>';
  const mini = ['<span>What makes most of the cell’s energy?</span>', `<span>The ${pill} is the powerhouse of the cell.</span>`, `<svg width="46" height="28" viewBox="0 0 130 80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" aria-hidden="true">${PICTURE_ICON}</svg><span>Name part 1.</span>`].slice(0, phone ? 2 : 3)
    .map((body, i) => `<div class="sc-anim" style="flex: 1 1 0; min-width: 0; max-width: 150px; animation: scChatCard${i + 1} ${A};">${artCard('m1', `height: ${phone ? 92 : 96}px; border-radius: 14px;`, 'height: 100%; box-sizing: border-box; padding: 10px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; font-size: 13px; font-weight: 500; line-height: 1.25; letter-spacing: -.01em;', body)}</div>`).join('');
  const dots = [0, .15, .3].map(d => `<span style="width: 6px; height: 6px; border-radius: 3px; background: {{t.muted}}; animation: scDot 1.2s ease-in-out ${d}s infinite;"></span>`).join('');
  // Lucida at work in the chat, the way AI apps show a tool running: what it's doing, then a check.
  const tool = (text, end) => `<span style="height: 36px; box-sizing: border-box; padding: 0 14px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; border: 1px solid {{t.line}}; font-size: 13px; font-weight: 500; white-space: nowrap;">${text}${end}</span>`;
  return `<div class="sc-demo" style="border-radius: ${phone ? 24 : 28}px; background: {{t.surf}}; padding: ${phone ? '16px' : '40px 32px'}; display: flex; justify-content: center;">
  <div style="width: 100%; max-width: 540px; border-radius: 22px; background: {{t.bg}}; box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 24px 56px -28px rgba(0,0,0,.3); overflow: hidden; display: flex; flex-direction: column;">
    <div class="sc-anim" style="height: ${phone ? 352 : 344}px; box-sizing: border-box; padding: ${phone ? 16 : 20}px; display: flex; flex-direction: column; gap: 12px; animation: scChat ${A};">
      <div class="sc-anim" style="align-self: flex-end; max-width: 88%; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; animation: scChatYou ${A};">
        <span style="display: flex; align-items: center; gap: 10px; padding: 7px 14px 7px 7px; border-radius: 14px; border: 1px solid {{t.line}};"><span style="width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.file, 17, 1.8)}</span><span style="display: flex; flex-direction: column; gap: 1px; text-align: left;"><span style="font-size: 13px; font-weight: 600;">Lecture 7 · The cell.pdf</span><span style="font-size: 12px; color: {{t.muted}};">PDF · 32 pages</span></span></span>
        <span style="padding: 10px 15px; border-radius: 18px 18px 6px 18px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; line-height: 1.4;">Make flashcards from this lecture.</span>
      </div>
      <div style="display: grid; justify-items: start;">
        <span class="sc-anim sc-transient" style="grid-area: 1 / 1; height: 36px; padding: 0 14px; display: inline-flex; align-items: center; gap: 5px; border-radius: 18px; background: {{t.surf}}; animation: scChatDots ${A};">${dots}</span>
        <span class="sc-anim sc-transient" style="grid-area: 1 / 1; animation: scChatWork ${A};">${tool('Adding cards to Cell Biology', '<span style="width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; border: 2px solid {{t.line}}; border-top-color: {{t.text}}; animation: scSpin .8s linear infinite;"></span>')}</span>
        <span class="sc-anim" style="grid-area: 1 / 1; animation: scChatDone ${A};">${tool('Added 12 cards to Cell Biology', `<span style="display: flex; color: {{t.good}};">${svg(I.check, 15, 2.4)}</span>`)}</span>
      </div>
      <div style="display: flex; gap: 8px;">${mini}</div>
      <p class="sc-anim" style="margin: 0; font-size: 15px; line-height: 1.45; text-align: left; animation: scChatText ${A};">Done. 12 new cards are in Cell Biology, ready to study.</p>
    </div>
    <div style="padding: 0 14px 14px;"><div style="height: 46px; box-sizing: border-box; padding: 0 6px 0 18px; border-radius: 999px; border: 1px solid {{t.line}}; display: flex; align-items: center; gap: 10px; font-size: 15px; color: {{t.muted}};"><span style="flex-grow: 1; text-align: left;">Reply…</span><span style="width: 34px; height: 34px; border-radius: 17px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center;">${svg(I.arrowUp, 16, 2.2)}</span></div></div>
  </div>
</div>`;
};

// A card in review, as the app shows it: tap to turn it, rate how well you knew it, and see when it comes back.
// Two cards take turns: one you know (Good, back in 12 days) and a new one you forgot (back in 1 minute).
// The gaps are what FSRS gives those cards (web/fsrs.js).
const STUDY = [
  { front: 'What makes most of the cell’s energy?', back: 'The mitochondria', note: 'They turn sugar and oxygen into ATP.', iv: ['10m', '6d', '12d', '28d'], pick: 2, when: 'back in 12 days' },
  { front: 'でんしゃ', big: true, back: 'train', note: '電車 · densha', iv: ['1m', '6m', '10m', '16d'], pick: 0, when: 'back in 1 minute' }
];
const GRADES = [['Forgot', 'again', 'againTint'], ['Hard', 'hard', 'hardTint'], ['Good', 'good', 'goodTint'], ['Easy', 'easy', 'goodTint']];
const studyDemo = phone => {
  const A = `${STUDY_S}s linear infinite`, fs = phone ? 21 : 26, r = phone ? 20 : 24;
  const face = (c, back) => `<div style="position: absolute; inset: 0; box-sizing: border-box; padding: ${phone ? '20px 22px' : '28px 32px'}; display: flex; flex-direction: column; text-align: center; background: {{t.card}}; border: 1px solid {{t.line}}; border-radius: ${r}px; box-shadow: {{t.shadow}}; backface-visibility: hidden; -webkit-backface-visibility: hidden;${back ? ' transform: rotateY(180deg);' : ''}"><div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;"><span style="font-size: ${back ? fs - 2 : c.big ? fs + 16 : fs}px; font-weight: 500; line-height: 1.25; letter-spacing: -.02em;">${back ? c.back : c.front}</span></div>${back ? `<span style="font-size: 14px; line-height: 1.5; color: {{t.muted}};">${c.note}</span>` : ''}</div>`;
  const card = (c, i) => { const x = 'AB'[i]; return `<div class="sc-anim${i ? ' sc-transient' : ''}" style="position: absolute; inset: 0; perspective: 1600px; animation: scStudy${x} ${A};"><div class="sc-anim" style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: scTurn${x} ${A};">${face(c, false)}${face(c, true)}</div><span class="sc-anim sc-transient" style="position: absolute; left: 62%; top: 56%; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; background: {{t.text}}; opacity: 0; animation: scTap${x} ${A};"></span></div>`; };
  const row = (c, i) => { const x = 'AB'[i]; return `<div class="sc-anim${i ? ' sc-transient' : ''}" style="position: absolute; inset: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: ${phone ? 6 : 8}px; animation: scRate${x} ${A};">${GRADES.map(([label, color, tint], g) => { const on = g === c.pick; return `<span${on ? ' class="sc-anim"' : ''} style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 999px; background: {{t.bg}};${on ? ` animation: scPress${x} ${A};` : ''}">${on ? `<span class="sc-anim" style="position: absolute; inset: 0; border-radius: 999px; background: {{t.${tint}}}; opacity: 0; animation: scPick${x} ${A};"></span>` : ''}<span style="position: relative; display: flex; align-items: center; gap: 6px; font-size: ${phone ? 13 : 14}px; font-weight: 600;"><span style="width: 7px; height: 7px; border-radius: 4px; background: {{t.${color}}};"></span>${label}</span><span style="position: relative; font-family: ${MONO}; font-size: ${phone ? 11 : 12}px; color: {{t.muted}};">${c.iv[g]}</span></span>`; }).join('')}</div>`; };
  const toast = (c, i) => { const [label, color] = GRADES[c.pick]; return `<div class="sc-anim sc-transient" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; animation: scToast${'AB'[i]} ${A};"><span style="height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: {{t.bg}}; font-size: 14px; font-weight: 600; white-space: nowrap;"><span style="width: 7px; height: 7px; border-radius: 4px; background: {{t.${color}}};"></span>${label} · ${c.when}</span></div>`; };
  return `<div class="sc-demo" style="border-radius: ${phone ? 24 : 28}px; background: {{t.surf}}; padding: ${phone ? '24px 16px' : '48px 32px'}; display: flex; flex-direction: column; align-items: center; gap: ${phone ? 14 : 18}px;">
  <div style="position: relative; width: 100%; max-width: 440px; height: ${phone ? 196 : 248}px;">${STUDY.map(card).join('')}</div>
  <div style="position: relative; width: 100%; max-width: 440px; height: ${phone ? 54 : 58}px;">${STUDY.map(row).join('')}${STUDY.map(toast).join('')}</div>
</div>`;
};

// Card types: the four kinds, each on its own deck's gradient.
const typeCard = (L, key, label, sub, face) => `<div style="display: flex; flex-direction: column; gap: 10px; min-width: 0;">${artCard(key, `height: ${L.typeH}px; border-radius: 22px;`, `height: 100%; box-sizing: border-box; padding: ${L === LAND.phone ? 14 : 22}px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;`, face)}<span style="padding: 0 4px; font-size: 16px; font-weight: 600;">${label}</span><span style="padding: 0 4px; margin-top: -6px; font-size: 14px; line-height: 1.45; color: {{t.muted}};">${sub}</span></div>`;
const typeText = (L, text) => `<span style="font-size: ${L === LAND.phone ? 15 : 21}px; font-weight: 500; line-height: 1.22; letter-spacing: -.02em;">${text}</span>`;
// The blank fills in now and then: the answer rises into the pill, stays a moment, and fades (the pill stays empty with
// reduced motion; on the site it rests while it's off screen).
const typeBlank = (L, key) => typeText(L, `The <span class="sc-demo sc-anim" style="display: inline-block; margin: 0 .1em; padding: 0 .4em; border-radius: 999px; line-height: 1.1; background: {{${key}.glass}};"><span style="display: inline-block; opacity: 0; animation: scFill 6s ease-in-out infinite;">mitochondrion</span></span> is the powerhouse of the cell.`);
const typePicture = L => { const w = L === LAND.phone ? 90 : 130; return `<svg width="${w}" height="${Math.round(w * .62)}" viewBox="0 0 130 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">${PICTURE_ICON}</svg>${typeText(L, 'Name part 1.')}`; };
// Sound: just a waveform whose bars rise and fall a little, like a clip playing (still with reduced motion; on the
// site it stops while it's off screen).
const typeSound = L => { const k = L === LAND.phone ? .7 : 1, px = n => Math.max(2, Math.round(n * k)); return `<span class="sc-demo sc-anim" style="display: flex; align-items: center; gap: ${px(5)}px; height: ${px(44)}px;">${[14, 26, 40, 22, 34, 16, 30, 20, 12, 24, 36, 18].map((b, i) => `<span style="width: ${px(4)}px; height: ${px(b)}px; border-radius: 3px; background: currentColor; opacity: .9; animation: scWaveSoft ${(0.8 + (i * 3 % 7) / 10).toFixed(1)}s ease-in-out -${(i * 0.37 % 1.4).toFixed(2)}s infinite alternate;"></span>`).join('')}</span>`; };
// More reasons: small tiles with an icon each.
const reason = (ic, title, text) => `<div style="border-radius: 24px; background: {{t.surf}}; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;"><span style="width: 40px; height: 40px; border-radius: 20px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(I[ic], 19, 1.8)}</span><span style="margin-top: 6px; font-size: 17px; font-weight: 600; letter-spacing: -.01em;">${title}</span><span style="font-size: 15px; line-height: 1.5; color: {{t.muted}};">${text}</span></div>`;
const REASONS = [
  ['stats', 'Remembers what you forget', 'FSRS spaced repetition plans every review, so the hard cards come back sooner.'],
  ['connect', 'You stay in charge', 'Choose what your AI may do, and check its cards before they join a deck.'],
  ['upload', 'Bring your cards', 'Import from Anki, Quizlet, or a CSV file.'],
  ['decks', 'Decks with their own look', 'Every deck gets its own gradient, or a photo of your choice.'],
  ['today', 'A few minutes a day', 'Today shows what’s due, how long it takes, and your streak.'],
  ['list', 'Your cards stay yours', 'Export every deck, card, and review whenever you want.']
];
const landing = (L, w, hgt) => { const phone = L === LAND.phone; return `<div style="position: relative; isolation: isolate; width: ${w}px; height: ${hgt}px; box-sizing: border-box; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${skyLayer(phone)}
<header style="max-width: 1344px; margin: 0 auto; height: ${phone ? 64 : 76}px; box-sizing: border-box; padding: 0 ${L.pad}px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
  <a href="{{homeHref}}" aria-label="Lucida home">${logo(phone ? 26 : 30)}</a>
  <nav style="display: flex; align-items: center; gap: ${phone ? 6 : 4}px;">${phone ? '' : `<a href="#how" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">How it works</a><a href="#cards" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Card types</a><a href="{{pricingHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Pricing</a>`}<a href="{{signInHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Sign in</a>${landPill('Get started', '{{startHref}}', true, 36, phone ? 'padding: 0 14px;' : '')}</nav>
</header>
<section style="padding: ${phone ? 48 : 88}px ${L.pad}px 0; display: flex; flex-direction: column; align-items: center; text-align: center;">
  <h1 style="margin: 0; max-width: 1200px; font-size: ${L.h1}px; font-weight: 600; line-height: 1; letter-spacing: -.05em; text-wrap: balance;">Flashcards your AI can make.</h1>
  ${leadP(L, 'Ask Claude or ChatGPT to turn a lecture into cards. Lucida keeps them in your decks and brings each one back right before you’d forget it.', true)}
  <div style="margin-top: ${phone ? 26 : 32}px; display: flex; gap: 10px; ${phone ? 'flex-direction: column; align-self: stretch;' : ''}">${landPill('Get started', '{{startHref}}', true, L.btn)}${landPill('See how it works', '#how', false, L.btn, 'background: {{t.bg}}; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 10px 24px -14px rgba(0,0,0,.25);')}</div>
</section>
<section style="padding-top: ${phone ? 44 : 64}px;"><div class="sc-demo" style="position: relative; height: ${L.wallH}px; overflow: hidden;">${cardWall(L.wall)}</div></section>
${featureRow(L, 'how', 'Ask for cards in your chat.', 'Paste your Lucida link into Claude or ChatGPT once. Then share a lecture or your notes and ask for flashcards. They land in your decks, ready to study.', chatDemo(phone), false)}
${featureRow(L, '', 'Flip, rate, remember.', 'Tap a card to see the answer, then say how well you knew it. Lucida picks the day it comes back: soon if you forgot, much later if it was easy.', studyDemo(phone), true)}
<section id="cards" style="max-width: 1200px; margin: 0 auto; box-sizing: border-box; padding: ${L.gapTop}px ${L.pad}px 0;">
  ${landH2(L, 'Every kind of card.')}
  ${leadP(L, 'Questions, fill in the blank, pictures, and sound. Your AI can make all four, and so can you.')}
  <div style="margin-top: ${phone ? 28 : 40}px; display: grid; grid-template-columns: ${L.typeCols}; gap: ${phone ? 12 : 16}px;">
    ${typeCard(L, 'q1', 'Question', 'A question on the front, the answer on the back.', typeText(L, 'What makes most of the cell’s energy?'))}
    ${typeCard(L, 'q2', 'Fill in the blank', 'The hidden words show up in place.', typeBlank(L, 'q2'))}
    ${typeCard(L, 'q3', 'Picture', 'Diagrams, maps, and slides from your class.', typePicture(L))}
    ${typeCard(L, 'q4', 'Sound', 'Hear it, then say what it means.', typeSound(L))}
  </div>
</section>
<section style="max-width: 1200px; margin: 0 auto; box-sizing: border-box; padding: ${L.gapTop}px ${L.pad}px 0;">
  ${landH2(L, 'Everything else you need.')}
  <div style="margin-top: ${phone ? 28 : 40}px; display: grid; grid-template-columns: ${phone ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))'}; gap: ${phone ? 12 : 16}px;">
    ${REASONS.map(([ic, t, x]) => reason(ic, t, x)).join('\n    ')}
  </div>
</section>
<section style="padding-top: ${L.gapTop}px;">
  ${artCard('hero', '', `box-sizing: border-box; padding: ${phone ? '64px 24px' : '104px 32px'}; display: flex; flex-direction: column; align-items: center; text-align: center;`, `<h2 style="margin: 0; font-size: ${L.ctaH1}px; font-weight: 600; line-height: 1.04; letter-spacing: -.04em; text-wrap: balance;">Your next exam, in cards.</h2><p style="margin: 16px 0 0; max-width: 480px; font-size: ${phone ? 16 : 18}px; line-height: 1.5; opacity: .8; text-wrap: balance;">Start with one deck. Your AI can fill it in a few minutes.</p><div style="margin-top: 28px;">${landPill('Get started', '{{startHref}}', true, L.btn, 'background: #FFFFFF; color: #000000;')}</div>`)}
</section>
${landFooter(phone)}
</div>`; };
// The footer on the landing page and the Privacy and Terms pages.
// Lucida's accounts, as icons (each a 36px target) that open in a new tab.
const SOCIALS = [['tiktok', 'TikTok', 'https://www.tiktok.com/@lucidacards'], ['youtube', 'YouTube', 'https://www.youtube.com/@lucidacards'], ['instagram', 'Instagram', 'https://www.instagram.com/lucidacards/'], ['facebook', 'Facebook', 'https://www.facebook.com/61594547618098']];
const socialLinks = gap => `<span style="display: flex; align-items: center; gap: ${gap}px;">${SOCIALS.map(([ic, name, href]) => `<a href="${href}" target="_blank" rel="noopener" aria-label="Lucida on ${name}" title="${name}" style="width: 36px; height: 36px; margin: -8px; display: inline-flex; align-items: center; justify-content: center;">${svg(I[ic], 20, 1.8)}</a>`).join('')}</span>`;
// On phones: the logo and the accounts, then the links. On computers it's one row, which wraps on a narrow window.
const landFooter = phone => phone
  ? `<footer style="box-sizing: border-box; padding: 36px 20px 40px; display: flex; flex-direction: column; gap: 24px; font-size: 14px; color: {{t.muted}};">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">${logo(24)}${socialLinks(22)}</div>
  <span style="display: flex; flex-wrap: wrap; gap: 16px;"><a href="{{pricingHref}}">Pricing</a><a href="{{privacyHref}}">Privacy</a><a href="{{termsHref}}">Terms</a><span>© 2026 Lucida</span></span>
</footer>`
  : `<footer style="max-width: 1344px; margin: 0 auto; box-sizing: border-box; padding: 48px clamp(20px, 4vw, 48px); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 16px; font-size: 14px; color: {{t.muted}};">
  ${logo(26)}<span style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px;"><a href="{{pricingHref}}">Pricing</a><a href="{{privacyHref}}">Privacy</a><a href="{{termsHref}}">Terms</a><span>© 2026 Lucida</span><span style="margin-left: 8px;">${socialLinks(20)}</span></span>
</footer>`;
const LANDING_H = 4002, LANDING_PHONE_H = 4818;
// The band that ends the page runs edge to edge in the site's dark Midnight gradient (surfaces.mjs).
const MIDNIGHT = JSON.stringify(paletteData('Midnight'));
const landingLogic = phone => `${ART_METHOD}
renderVals() { ${T}
  // On lucida.cards (props.site) the links open the app; on the canvas they open the sign-in board.
  const site = !!this.props.site, signIn = site ? 'https://app.lucida.cards/sign-in' : '${phone ? 'PhoneSignIn' : 'WebSignIn'}.dc.html';
  const deck = name => this.art(this.gen(name, 'vivid'));
  return { t, sky: ${SKY}, grain: String(this.props.grain ?? 0.7), hero: this.art(${MIDNIGHT}, '${phone ? '' : 'wide'}'), ${WALL_VALS(phone ? [50, 60, 55, 65] : [64, 78, 70, 84, 74, 88, 68, 80, 72], phone ? PHONE_K : 1, phone ? FLIPS.phone : FLIPS.busy)}
    q1: deck('Cell Biology'), q2: deck('Genetics'), q3: deck('Anatomy'), q4: deck('Korean'), m1: deck('Cell Biology'),
    homeHref: site ? '/' : '${phone ? 'LandingPhone' : 'Landing'}.dc.html', signInHref: signIn, startHref: site ? 'https://app.lucida.cards/' : signIn,
    privacyHref: site ? '/privacy' : 'Privacy.dc.html', termsHref: site ? '/terms' : 'Terms.dc.html', pricingHref: site ? '/pricing' : '${phone ? 'PricingPhone' : 'Pricing'}.dc.html' }; }`;

// ---------- Live (play with friends) ----------
// A game like Kahoot, for study groups: from any deck, a host opens a room, friends join on their phones with a code
// and a name (no account), and everyone answers the same questions (Learn mode's multiple choice and true or false).
// Points for right and fast answers, a leaderboard between questions, and a podium. Canvas only for now: the design,
// before it's built. The sample room plays Cell Biology.
const LIVE_Q = { n: 3, of: 10, q: 'Which organelle packages proteins for secretion?', options: ['Golgi apparatus', 'Lysosome', 'Nucleus', 'Ribosome'], right: 0, counts: [7, 2, 1, 2] };
const LIVE_PEOPLE = ['Maya', 'Jordan', 'Priya', 'Leo', 'Sofia', 'Ethan', 'Ana', 'Kai', 'Zoe', 'Omar', 'Lina', 'Noah'];
const LIVE_BOARD = [['Maya', 3420, 1], ['Jordan', 3210, 2], ['Kai', 2980, -1], ['Priya', 2860, 0], ['Leo', 2640, 3]];
// Each answer has a flat color and a shape, the same on the big screen and on phones.
const LIVE_SHAPES = ['<circle cx="12" cy="12" r="7.5"/>', '<path d="M12 4.5l8.5 15h-17z"/>', '<rect x="5" y="5" width="14" height="14" rx="2.5"/>', '<path d="M12 3.5l8.5 8.5-8.5 8.5-8.5-8.5z"/>'];
const liveShape = (i, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${LIVE_SHAPES[i]}</svg>`;
// Live's look (the owner's reference, 2026-09-24, then their comments): bright colors and big navy type, like a game.
// The lobby, the leaderboard, and a phone's join and waiting screens are on the daylight sky; the big screen's question
// and answer are on white (V74); a phone's answering is blue; green means you got it; yellow means not quite; the end
// is a faint yellow fading to white (V76). The answers are tiles in vivid gradients. The screens stay bright in dark mode.
// The four answers: tiles in vivid gradients (the decks' "Vivid" style, generator.mjs), with white words. The owner
// asked for the deep set in V72, then for "brighter gradients than this" (V76). These seeds give four clearly different
// colors, blue, purple, orange, and magenta, each dark side on the left behind the words (the 225° angle, unflipped).
const LIVE_VIVID = ['Live answer 9', 'Live answer 86', 'Live answer 34', 'Live answer 5'];
// The end's faint sunny color, fading to white like the sky (the owner asked for "faint color" there, V76).
const LIVE_SUN = (mid, low) => `linear-gradient(180deg, #FFE08A 0%, #FFF0C2 ${mid}%, #FFF9E8 ${low}%, #FFFFFF 100%)`;
// The daylight sky (the landing page's, SKY, in daylight), fading to white. `mid` and `low` place its paler bands, in %.
const liveSky = (mid, low) => `linear-gradient(180deg, #86BDF3 0%, #C9E2FB ${mid}%, #EDF5FE ${low}%, #FFFFFF 100%)`;
// On white, chips are a faint navy instead of glass.
const LIVE_TINT = 'rgba(13,21,66,.06)';
// Players' circles: flat colors dark enough for a white initial.
const LIVE_COLORS = ['#4F60E6', '#F2701D', '#12A150', '#E5407E', '#0D1542'];
const navyBtn = (label, href, h = 52, fs = 16, extra = '') => `<a href="${href}" style="height: ${h}px; padding: 0 26px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; background: ${LV.navy}; color: #FFFFFF; font-size: ${fs}px; font-weight: 600; ${extra}">${label}</a>`;
// A made-up QR code for the design (the real one points at lucida.cards/join/<code>): 25 by 25 modules, three finders.
const LIVE_QR = (() => {
  const n = 25, on = new Set(), finder = (x, y) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const edge = i === 0 || i === 6 || j === 0 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4; if (edge || core) on.add((x + i) + ',' + (y + j)); } };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  let seed = 7;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
    if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
    seed = (seed * 9301 + 49297) % 233280; if (seed / 233280 < .46) on.add(x + ',' + y);
  }
  return `<svg width="100%" height="100%" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-label="QR code to join"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#FFFFFF"/>${[...on].map(k => { const [x, y] = k.split(','); return `<rect x="${x}" y="${y}" width="1" height="1" fill="#000000"/>`; }).join('')}</svg>`;
})();
// The right answer rises and then hovers above the others, bobbing gently (the owner: no tilt, "make it appear like it is
// hovering above the rest and that should be an animation", V77). It holds at `a` with Reduce Motion.
const LIVE_CSS = '@keyframes scTimer{from{stroke-dashoffset:0}to{stroke-dashoffset:1}}@keyframes scJoin{from{opacity:0;transform:scale(.6)}}@keyframes scBar{from{transform:scaleX(0)}}@keyframes scRiseUp{from{opacity:0;transform:translateY(40px)}}@keyframes scFloat2{50%{transform:translateY(-6px)}}@keyframes scPop{from{transform:scale(0)}}'
  + '@keyframes scDealR{from{opacity:0;transform:translate(40px,30px)}}@keyframes scDealL{from{opacity:0;transform:translate(-30px,30px)}}'
  + HOVER_CSS(-10, -15)
  + '@media (prefers-reduced-motion:reduce){.sc-live *{animation:none!important}}';
// The streak flame's flicker (only the phone's "right" screen has it).
const FLAME_CSS = '@keyframes scFlame{0%,100%{transform:rotate(-3deg) scale(1,1)}25%{transform:rotate(2deg) scale(1.05,.96)}50%{transform:rotate(-1deg) scale(.97,1.06)}75%{transform:rotate(3deg) scale(1.02,.99)}}@keyframes scFlameCore{0%,100%{transform:scale(1,1);opacity:1}50%{transform:scale(.86,1.14);opacity:.82}}';
// The top of the big screen during a game: which question, how many answered, and the time left (a purple ring).
// (Words beside a {{hole}} sit in their own span: the canvas wraps each hole in one, and a flex box drops the spaces
// around it.)
const liveTimer = (size, stroke, chip = LV.chip) => { const r = (size - stroke) / 2, c = size / 2;
  return `<div style="position: relative; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${chip};"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="transform: rotate(-90deg);"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(13,21,66,.1)" stroke-width="${stroke}"/><circle pathLength="1" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${LV.purple}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="1" style="animation: scTimer 20s linear infinite;"/></svg><span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size / 3)}px; font-weight: 700; font-variant-numeric: tabular-nums;">14</span></div>`; };
const liveTop = (right, chip = LV.chip) => `<header style="height: 96px; flex-shrink: 0; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; justify-content: space-between; gap: 24px;">
    <div style="display: flex; align-items: center; gap: 16px;">${logo(30)}<span style="height: 32px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; background: ${chip}; font-size: 14px; font-weight: 600;"><span>Question {{q.n}} of {{q.of}}</span></span><span style="font-size: 15px; color: ${LV.ink2};">Cell Biology</span></div>
    ${right}
  </header>`;
const liveFoot = `<footer style="height: 56px; flex-shrink: 0; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; justify-content: space-between; font-size: 15px; color: ${LV.ink2};"><span>Join at <span style="font-weight: 700; color: ${LV.navy};">lucida.cards/join</span> with <span style="font-weight: 700; color: ${LV.navy}; letter-spacing: .06em;">482 913</span></span><span>{{peopleN}} people</span></footer>`;
const liveRoot = (w, h, extra = '') => `class="sc-live" style="position: relative; isolation: isolate; width: ${w}px; height: ${h}px; box-sizing: border-box; font-family: ${FONT}; background: ${LV.blue}; color: ${LV.navy}; overflow: hidden; ${extra}"`;
// An answer on the big screen: a tile in its vivid gradient, with its shape and words. After the reveal, the right one
// rises and hovers above the rest with a green check (V77: no tilt); the others keep their gradients, grayed out (V76). Each shows how many picked it. `liveDeep` is the color under a tile (the phones' too).
const liveDeep = i => `<span aria-hidden="true" style="position: absolute; inset: 0; background: {{o${i}.p.base}}; filter: {{o${i}.gfilter}}; transition: filter .35s;">${flowLayer(`o${i}.p`)}</span>${GRAIN_LAYER}`;
const liveTile = i => `<div style="position: relative; overflow: hidden; height: 150px; border-radius: 28px; color: {{o${i}.fg}}; box-shadow: {{o${i}.shadow}}; transform: {{o${i}.tf}}; animation: {{o${i}.anim}}; transition: color .3s, transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s;">${liveDeep(i)}<div style="position: relative; height: 100%; box-sizing: border-box; padding: 0 32px; display: flex; align-items: center; gap: 22px; text-shadow: {{o${i}.ts}};"><span style="width: 60px; height: 60px; flex-shrink: 0; border-radius: 30px; background: {{o${i}.badge}}; box-shadow: {{o${i}.badgeLine}}; display: flex; align-items: center; justify-content: center;">${liveShape(i, 26)}</span><span style="flex-grow: 1; font-size: 34px; font-weight: 700; letter-spacing: -.02em;">{{o${i}.label}}</span><sc-if value="{{o${i}.showCount}}" hint-placeholder-val="{{ false }}"><span style="display: flex; align-items: center; gap: 14px;"><span style="font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums;">{{o${i}.count}}</span><sc-if value="{{o${i}.right}}" hint-placeholder-val="{{ false }}"><span style="width: 52px; height: 52px; border-radius: 26px; background: ${LV.check}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: scPop .4s cubic-bezier(.2,.8,.2,1) both;">${svg(I.check, 26, 3)}</span></sc-if></span></sc-if></div></div>`;
const liveTiles = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">${[0, 1, 2, 3].map(liveTile).join('')}</div>`;
// The question, on white (the owner asked to go back to it, V74), so the deep gradient answers stand out.
const liveQuestion = `<div ${liveRoot(1440, 900, 'display: flex; flex-direction: column; background: #FFFFFF;')}>
  ${studyBgLayer}
  ${liveTop(`<div style="display: flex; align-items: center; gap: 20px;"><span style="font-size: 15px; color: ${LV.ink2};"><span style="font-weight: 700; color: ${LV.navy};">9</span> of 12 answered</span>${liveTimer(76, 7, LIVE_TINT)}</div>`, LIVE_TINT)}
  <main style="flex-grow: 1; box-sizing: border-box; padding: 8px 48px 24px; display: flex; flex-direction: column; justify-content: center; gap: 40px;">
    <h1 style="margin: 0; text-align: center; font-size: 60px; font-weight: 700; line-height: 1.08; letter-spacing: -.035em; text-wrap: balance;">{{q.q}}</h1>
    ${liveTiles}
  </main>
  ${liveFoot}
</div>`;
// After time's up: the right answer lifts with a check, the rest go gray, and each shows how many picked it. On white,
// like the question it follows.
const liveReveal = `<div ${liveRoot(1440, 900, 'display: flex; flex-direction: column; background: #FFFFFF;')}>
  ${studyBgLayer}
  ${liveTop(`<div style="display: flex; align-items: center; gap: 14px;"><span style="font-size: 15px; color: ${LV.ink2};"><span style="font-weight: 700; color: ${LV.navy};">7 of 12</span> got it</span>${navyBtn(`{{nextLabel}}${svg(I.chev, 16, 2.4)}`, '{{nextHref}}')}</div>`, LIVE_TINT)}
  <main style="flex-grow: 1; box-sizing: border-box; padding: 8px 48px 24px; display: flex; flex-direction: column; justify-content: center; gap: 40px;">
    <h1 style="margin: 0; text-align: center; font-size: 60px; font-weight: 700; line-height: 1.08; letter-spacing: -.035em; text-wrap: balance;">{{q.q}}</h1>
    ${liveTiles}
  </main>
  ${liveFoot}
</div>`;
// The leaderboard between questions, on the sky's faint blue fade (the owner, V76): the top five on white cards, how far
// each moved, and purple bars against the leader.
const liveLeaderboard = `<div ${liveRoot(1440, 900, 'display: flex; flex-direction: column; background: #FFFFFF;')}>
  ${studyBgLayer}
  ${liveTop(navyBtn(`Next question${svg(I.chev, 16, 2.4)}`, 'LiveQuestion.dc.html'))}
  <main style="flex-grow: 1; box-sizing: border-box; padding: 16px 48px 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px;">
    <h1 style="margin: 0; font-size: 60px; font-weight: 700; letter-spacing: -.035em;">Leaderboard</h1>
    <div style="width: 900px; display: flex; flex-direction: column; gap: 12px;"><sc-for list="{{board}}" as="p" hint-placeholder-count="5"><div style="height: 72px; box-sizing: border-box; padding: 0 22px; border-radius: 22px; background: #FFFFFF; box-shadow: ${LV.shadow}; display: flex; align-items: center; gap: 18px; animation: scRiseUp .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: {{p.delay}};"><span style="width: 32px; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${LV.ink2};">{{p.rank}}</span><span style="width: 44px; height: 44px; flex-shrink: 0; border-radius: 22px; background: {{p.color}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">{{p.initial}}</span><span style="width: 150px; font-size: 22px; font-weight: 700;">{{p.name}}</span><div style="flex-grow: 1; height: 12px; border-radius: 6px; background: rgba(13,21,66,.08); overflow: hidden;"><div style="width: {{p.w}}; height: 100%; border-radius: 6px; background: ${LV.purple}; transform-origin: left; animation: scBar .9s cubic-bezier(.2,.8,.2,1) both;"></div></div><span style="width: 90px; text-align: right; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;">{{p.score}}</span><span style="width: 44px; text-align: right; font-size: 15px; font-weight: 700; color: {{p.moveColor}};">{{p.move}}</span></div></sc-for></div>
  </main>
  ${liveFoot}
</div>`;
// The end: a faint yellow fading to white (the owner, V76), with confetti, a flat podium (navy, purple, and blue blocks),
// and play again.
const LIVE_PODIUM = [[1, 'Jordan', '8,940', 230, LV.purple, '#FFFFFF'], [0, 'Maya', '9,610', 320, LV.navy, '#FFFFFF'], [2, 'Kai', '8,120', 170, LV.blue, LV.navy]];
const livePodium = `<div ${liveRoot(1440, 900, 'display: flex; flex-direction: column; align-items: center; background: #FFFFFF;')}>
  ${studyBgLayer}
  <div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none;">${Array.from({ length: 28 }, (_, i) => { const x = (i * 37) % 100, y = (i * 53) % 55, c = [LV.navy, '#FFB020', LV.blue, '#1FC45A', LV.purple][i % 5], s = 6 + (i % 4) * 3; return `<span style="position: absolute; left: ${x}%; top: ${y}%; width: ${s}px; height: ${s}px; border-radius: ${i % 3 ? '50%' : '2px'}; background: ${c}; animation: scFloat2 ${3 + (i % 3)}s ease-in-out -${i % 4}s infinite;"></span>`; }).join('')}</div>
  <header style="position: relative; width: 100%; height: 96px; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; justify-content: space-between;">${logo(30)}<span style="font-size: 15px; color: ${LV.ink2};">Cell Biology · final results</span></header>
  <h1 style="position: relative; margin: 8px 0 0; font-size: 60px; font-weight: 700; letter-spacing: -.035em;">Maya wins!</h1>
  <div style="position: relative; flex-grow: 1; width: 900px; display: flex; align-items: flex-end; justify-content: center; gap: 18px;">
    ${LIVE_PODIUM.map(([i, name, score, h, bg, fg]) => `<div style="width: 260px; display: flex; flex-direction: column; align-items: center; gap: 12px; animation: scRiseUp .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: ${[.4, .8, 0][i]}s;"><span style="width: 64px; height: 64px; border-radius: 32px; background: {{c${i}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; box-shadow: 0 0 0 4px #FFFFFF, 0 0 0 6px rgba(13,21,66,.12);">${name[0]}</span><span style="font-size: 24px; font-weight: 700;">${name}</span><span style="font-size: 18px; color: ${LV.ink2}; font-variant-numeric: tabular-nums;">${score}</span><div style="width: 100%; height: ${h}px; box-sizing: border-box; padding-top: 22px; border-radius: 28px 28px 0 0; background: ${bg}; color: ${fg}; display: flex; justify-content: center;"><span style="font-size: 64px; font-weight: 700; letter-spacing: -.04em; line-height: 1;">${i + 1}</span></div></div>`).join('')}
  </div>
  <div style="position: relative; width: 100%; height: 108px; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; justify-content: center; gap: 12px;"><a href="LiveLobby.dc.html" style="height: 52px; padding: 0 26px; display: inline-flex; align-items: center; border-radius: 999px; background: rgba(13,21,66,.07); font-size: 16px; font-weight: 600;">Play again</a>${navyBtn('Done', 'WebDeck.dc.html')}</div>
</div>`;
// The lobby: on the daylight sky, like before V71 (the owner asked for it back, V74), with the join code big, a QR code,
// and people popping in as they join.
const liveLobby = `<div ${liveRoot(1440, 900, 'display: flex; flex-direction: column; background: #FFFFFF;')}>
  ${studyBgLayer}
  <header style="height: 96px; flex-shrink: 0; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; justify-content: space-between;">${logo(30)}<span style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: ${LV.chip}; font-size: 14px; font-weight: 600;">${svg(I.live, 16, 2)}Cell Biology</span></header>
  <main style="flex-grow: 1; box-sizing: border-box; padding: 0 48px 48px; display: grid; grid-template-columns: 1fr 380px; gap: 48px; align-items: center;">
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <span style="font-size: 30px; font-weight: 500; color: ${LV.ink2};">Join at <span style="font-weight: 700; color: ${LV.navy};">lucida.cards/join</span></span>
      <span style="font-size: 150px; font-weight: 700; line-height: .95; letter-spacing: .02em; font-variant-numeric: tabular-nums;">482 913</span>
      <div style="margin-top: 22px; display: flex; flex-wrap: wrap; gap: 10px; max-width: 820px;"><sc-for list="{{people}}" as="p" hint-placeholder-count="12"><span style="height: 44px; padding: 0 18px 0 8px; display: inline-flex; align-items: center; gap: 10px; border-radius: 999px; background: #FFFFFF; box-shadow: ${LV.shadow}; font-size: 18px; font-weight: 700; animation: scJoin .45s cubic-bezier(.2,.8,.2,1) both; animation-delay: {{p.delay}};"><span style="width: 30px; height: 30px; border-radius: 15px; background: {{p.color}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">{{p.initial}}</span>{{p.name}}</span></sc-for></div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 22px;">
      <div style="width: 300px; height: 300px; box-sizing: border-box; padding: 18px; border-radius: 32px; background: #FFFFFF; box-shadow: ${LV.lift}; transform: rotate(3deg);">${LIVE_QR}</div>
      <span style="font-size: 18px; color: ${LV.ink2};"><span style="font-weight: 700; color: ${LV.navy};">12</span> people in</span>
      ${navyBtn('Start', 'LiveQuestion.dc.html', 64, 20, 'width: 300px; box-sizing: border-box;')}
    </div>
  </main>
</div>`;
// Setting up, from a deck: which cards, how many questions, and the time for each.
const liveSetup = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDeck" dark="{{dark}}" dim="{{dim}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Play live" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 560px; box-sizing: border-box; padding: 28px; border-radius: 36px; overflow: hidden; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24);">
    ${deepTop}
    <div style="position: relative; display: flex; flex-direction: column; gap: 20px;">
    ${deepHead('live', 'Play live', 'WebDeck.dc.html', 'Play this deck with friends. They join on their phones with a code, no account needed. Right and fast answers win.')}
    ${quizField('Cards', quizSeg('sets'))}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">${quizField('Questions', quizSeg('counts'))}${quizField('Time for each', quizSeg('times'))}</div>
    <div style="display: flex; gap: 10px;">${quizBtn('Cancel', 'WebDeck.dc.html', false, 1)}${quizBtn('Open the room', 'LiveLobby.dc.html', true, 2, 'live')}</div>
    </div>
  </div>
</div>`;
// On phones: join with the code and a name, on the daylight sky like the waiting screen after it (the owner asked for
// it, V74; the same on the web's join page and in the iPhone app once Live is built).
const liveJoin = `<div ${liveRoot(390, 844, 'padding: 72px 20px 34px; display: flex; flex-direction: column; gap: 28px; background: #FFFFFF;')}>
  ${studyBgLayer}
  ${logo(28)}
  <div style="display: flex; flex-direction: column; gap: 10px;"><h1 style="margin: 0; font-size: 36px; font-weight: 700; line-height: 1.08; letter-spacing: -.03em;">Join a live game</h1><span style="font-size: 16px; line-height: 1.45; color: ${LV.ink2};">Type the code on the big screen. No account needed.</span></div>
  <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 700;">Code</span><label style="position: relative; display: flex; justify-content: space-between; gap: 6px; cursor: text;"><sc-for list="{{boxes}}" as="b" hint-placeholder-count="6"><span style="flex: 0 1 50px; min-width: 0; height: 58px; border-radius: 14px; background: #FFFFFF; box-shadow: ${LV.shadow}; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;">{{b.digit}}</span></sc-for><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="{{code}}" onChange="{{setCode}}" aria-label="6-digit code" style="position: absolute; inset: 0; width: 100%; opacity: 0; border: 0; padding: 0; font-size: 16px;"></label></div>
  <label style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 700;">Your name</span><input type="text" value="Maya" aria-label="Your name" style="height: 56px; box-sizing: border-box; padding: 0 20px; border: 0; outline: 0; border-radius: 999px; background: #FFFFFF; box-shadow: ${LV.shadow}; color: ${LV.navy}; font: inherit; font-size: 16px; font-weight: 600;"></label>
  <div style="flex-grow: 1;"></div>
  ${navyBtn('Join', 'LiveWaiting.dc.html', 58, 17)}
</div>`;
// In, and waiting for the host to start, on the daylight sky it had before V71 (the owner asked for it back).
const liveWaiting = `<div ${liveRoot(390, 844, 'padding: 64px 24px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; background: #FFFFFF;')}>
  ${studyBgLayer}
  <span style="width: 112px; height: 112px; border-radius: 56px; background: ${LV.purple}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; box-shadow: ${LV.lift}; animation: scFloat2 3s ease-in-out infinite;">M</span>
  <div style="display: flex; flex-direction: column; gap: 8px;"><div style="font-size: 34px; font-weight: 700; letter-spacing: -.03em;">You’re in, Maya!</div><div style="font-size: 16px; line-height: 1.5; color: ${LV.ink2};">Look for your name on the big screen. The game starts soon.</div></div>
  <span style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: #FFFFFF; font-size: 14px; font-weight: 700;">${svg(I.live, 15, 2)}Cell Biology</span>
</div>`;
// Answering on a phone, on white like the big screen's question (V77): the question in big navy type, then four big
// tiles with the same gradients and shapes as the big screen. The bar at the top is the time left, in Lucida's purple.
const liveAnswer = `<div ${liveRoot(390, 844, 'padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 16px; background: #FFFFFF;')}>
  ${studyBgLayer}
  <div style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 13px; font-weight: 700; color: ${LV.ink2};">3 of 10</span><div style="flex-grow: 1; height: 8px; border-radius: 4px; background: ${LIVE_TINT}; overflow: hidden;"><div style="width: 70%; height: 100%; border-radius: 4px; background: ${LV.purple}; transform-origin: left; animation: scBar 20s linear reverse infinite;"></div></div><span style="font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;">14s</span></div>
  <div style="padding: 8px 4px 6px; font-size: 28px; font-weight: 700; line-height: 1.15; letter-spacing: -.025em;">{{q.q}}</div>
  <div style="flex-grow: 1; display: grid; grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 10px;">${[0, 1, 2, 3].map(i => `<button type="button" style="position: relative; overflow: hidden; width: 100%; height: 100%; box-sizing: border-box; padding: 0; border: 0; border-radius: 26px; background: none; color: {{o${i}.fg}}; box-shadow: ${LV.shadow}; font: inherit; text-align: left; cursor: pointer;">${liveDeep(i)}<span style="position: relative; height: 100%; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; gap: 16px; text-shadow: {{o${i}.ts}};"><span style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 24px; background: {{o${i}.badge}}; box-shadow: {{o${i}.badgeLine}}; display: flex; align-items: center; justify-content: center;">${liveShape(i, 22)}</span><span style="font-size: 21px; font-weight: 700;">{{o${i}.label}}</span></span></button>`).join('')}</div>
  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: ${LV.ink2};"><span style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: ${LV.navy};"><span style="width: 24px; height: 24px; border-radius: 12px; background: ${LV.purple}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">M</span>Maya</span><span style="font-variant-numeric: tabular-nums;"><span style="font-weight: 700; color: ${LV.navy};">2,550</span> points</span></div>
</div>`;
// The streak flame: orange, with a yellow core, flickering from its base (it holds still with Reduce Motion).
const liveFlame = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink: 0; overflow: visible; filter: drop-shadow(0 1px 2px rgba(238,90,54,.35));"><defs><linearGradient id="sc-flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB03B"/><stop offset=".55" stop-color="#F7792A"/><stop offset="1" stop-color="#EE5A36"/></linearGradient></defs><g class="sc-flame" style="transform-origin: 12px 21px; animation: scFlame 1.6s ease-in-out infinite;"><path fill="url(#sc-flame)" d="M12 2C12.8 5.2 15 7.1 16.7 9.1C18.2 10.9 19 12.9 19 15.2C19 19.1 15.9 22 12 22C8.1 22 5 19.1 5 15.4C5 13.1 5.9 11.2 7.5 9.7C7.7 11.2 8.4 12.3 9.5 12.9C9.2 9.1 10.1 5.6 12 2Z"/><path fill="#FFD25E" style="transform-origin: 12px 21.6px; animation: scFlameCore .9s ease-in-out infinite;" d="M12 11.5C12.5 13.4 13.8 14.5 14.7 15.7C15.3 16.5 15.6 17.3 15.6 18.2C15.6 20.2 14 21.6 12 21.6C10 21.6 8.4 20.2 8.4 18.3C8.4 16.9 9.1 15.8 10.2 15C10.3 15.8 10.7 16.4 11.3 16.7C11.1 14.9 11.4 13.1 12 11.5Z"/></g></svg>`;
// After each question on a phone, on a faint color fading to white (the owner: iPhone backgrounds faint, like the big
// screen, V77). Right: faint green, the answer dealt onto a white card with a green check that hovers, your points, and
// your streak. Not quite: faint yellow, your pick on a gray card beside the right answer's. Then your place.
const LIVE_MINT = (mid, low) => `linear-gradient(180deg, #A3E8BC 0%, #D0F5DD ${mid}%, #EEFCF3 ${low}%, #FFFFFF 100%)`;
const liveResult = `<div ${liveRoot(390, 844, 'padding: 64px 24px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; background: {{r.bg}};')}>
  <div style="position: relative; width: 310px; height: 236px;">
    <sc-if value="{{r.wrong}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; left: -4px; top: 58px; width: 158px; height: 168px; box-sizing: border-box; padding: 18px; border-radius: 28px; background: ${LV.gray}; color: ${LV.grayInk}; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; text-align: left; animation: scDealL .5s cubic-bezier(.2,.8,.2,1) both;"><span style="width: 44px; height: 44px; border-radius: 22px; background: ${LV.navy}; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">${svg(I.close, 20, 2.8)}</span><span style="font-size: 22px; font-weight: 700; line-height: 1.12;">{{r.pick}}</span></div></sc-if>
    <div style="position: absolute; left: {{r.cardX}}; top: 12px; width: 188px; height: 196px; box-sizing: border-box; padding: 20px; border-radius: 30px; background: #FFFFFF; box-shadow: ${LV.lift}; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; text-align: left; transform: translateY(-8px); animation: scDealR .55s cubic-bezier(.2,.8,.2,1) .1s backwards, ${HOVER(-8, .65).replace('scLiftIn .45s cubic-bezier(.2,.8,.2,1) 0.65s both, ', '')};"><span style="width: 48px; height: 48px; border-radius: 24px; background: ${LV.check}; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">${svg(I.check, 24, 3)}</span><span style="font-size: 24px; font-weight: 700; line-height: 1.1; letter-spacing: -.01em;">{{r.answer}}</span></div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 6px;"><div style="font-size: 40px; font-weight: 700; letter-spacing: -.03em;">{{r.title}}</div><div style="font-size: 18px; font-weight: 600;">{{r.line}}</div></div>
  <sc-if value="{{r.right}}" hint-placeholder-val="{{ true }}"><span style="height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: #FFFFFF; box-shadow: ${LV.shadow}; font-size: 15px; font-weight: 700;">${liveFlame(20)}3 in a row</span></sc-if>
  <span style="font-size: 16px; color: ${LV.ink2};">{{r.place}}</span>
</div>`;
// The end on a phone: the final leaderboard, on the faint yellow fading to white (V76). The top three stand on a flat podium (you're marked), everyone
// else is listed under it, and players without Lucida get a way to make their own cards.
const LIVE_FINAL_REST = [['Priya', '7,860'], ['Leo', '7,420'], ['Sofia', '6,980'], ['Ethan', '6,540'], ['Ana', '6,110']];
const LIVE_FINAL_PODIUM = [[1, 'Jordan', '8,940', 88, true, LV.purple, '#FFFFFF'], [0, 'Maya', '9,610', 120, false, LV.navy, '#FFFFFF'], [2, 'Kai', '8,120', 64, false, LV.blue, LV.navy]];
const liveFinal = `<div ${liveRoot(390, 844, 'padding: 64px 20px 34px; display: flex; flex-direction: column; gap: 18px; background: #FFFFFF;')}>
  ${studyBgLayer}
  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
    <span style="font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${LV.ink2};">Final results</span>
    <h1 style="margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -.03em;">You placed 2nd!</h1>
    <span style="font-size: 15px; color: ${LV.ink2};">8,940 points · 8 of 10 right</span>
  </div>
  <div role="list" aria-label="Top three" style="display: flex; align-items: flex-end; gap: 8px;">
    ${LIVE_FINAL_PODIUM.map(([i, name, score, h, you, bg, fg]) => `<div role="listitem" aria-label="${i + 1}. ${you ? 'You' : name}, ${score} points" style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; animation: scRiseUp .6s cubic-bezier(.2,.8,.2,1) both; animation-delay: ${[.3, .6, 0][i]}s;"><span style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 24px; background: {{c${i}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;${you ? ` box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 5px ${LV.navy};` : ''}">${name[0]}</span><span style="font-size: 15px; font-weight: 700;">${you ? 'You' : name}</span><span style="font-size: 13px; color: ${LV.ink2}; font-variant-numeric: tabular-nums;">${score}</span><div style="width: 100%; height: ${h}px; box-sizing: border-box; padding-top: 10px; border-radius: 18px 18px 8px 8px; background: ${bg}; color: ${fg}; display: flex; justify-content: center;"><span style="font-size: 26px; font-weight: 700; line-height: 1;">${i + 1}</span></div></div>`).join('')}
  </div>
  <div role="list" aria-label="Everyone else" style="box-sizing: border-box; padding: 2px 16px; border-radius: 22px; background: #FFFFFF; box-shadow: ${LV.shadow}; display: flex; flex-direction: column;">
    <sc-for list="{{rest}}" as="p" hint-placeholder-count="5"><div role="listitem" style="height: 50px; display: flex; align-items: center; gap: 12px; box-shadow: {{p.line}}; animation: scRiseUp .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: {{p.delay}};"><span style="width: 18px; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${LV.ink2};">{{p.rank}}</span><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 16px; background: {{p.color}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">{{p.initial}}</span><span style="flex-grow: 1; font-size: 16px; font-weight: 600;">{{p.name}}</span><span style="font-size: 15px; color: ${LV.ink2}; font-variant-numeric: tabular-nums;">{{p.score}}</span></div></sc-for>
  </div>
  <div style="flex-grow: 1;"></div>
  <div style="box-sizing: border-box; padding: 14px 14px 14px 18px; border-radius: 22px; background: #FFFFFF; box-shadow: ${LV.shadow}; display: flex; align-items: center; gap: 12px; text-align: left;"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 700;">Make your own cards</span><span style="font-size: 13px; line-height: 1.35; color: ${LV.ink2};">Your AI makes them. Lucida plans your reviews.</span></span>${navyBtn('Try free', 'https://lucida.cards', 40, 14, 'flex-shrink: 0; padding: 0 16px;')}</div>
</div>`;
const LIVE_LOGIC = `
constructor(props) { super(props); this.state = { set: 'tag', count: 10, time: 20 }; }
renderVals() { ${T}
  ${STUDY_BG_JS}
  const s = this.state, reveal = !!this.props.reveal, Q = ${JSON.stringify(LIVE_Q)}, total = Q.counts.reduce((a, b) => a + b, 0);
  const seg = (k, cur) => ({ pressed: k === cur ? 'true' : 'false', bg: k === cur ? t.bg : 'transparent', fg: k === cur ? t.text : t.muted, sh: k === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const LV = ${JSON.stringify(LV)}, VIVID = ${JSON.stringify(LIVE_VIVID)}, colors = ${JSON.stringify(LIVE_COLORS)};
  // Each answer's vivid gradient; after the reveal the right one lifts and tilts a little, and the others gray out.
  const opt = i => { const lift = reveal && i === Q.right, gray = reveal && i !== Q.right, p = this.gen(VIVID[i], 'vivid');
    return { i, p, label: Q.options[i], count: String(Q.counts[i]), right: lift, showCount: reveal, gfilter: gray ? 'grayscale(1)' : 'none', fg: p.ink, ts: p.shadow,
      badge: p.glass, badgeLine: 'inset 0 0 0 1.5px ' + p.glassLine, shadow: lift ? LV.lift : gray ? 'none' : LV.shadow, tf: lift ? 'translateY(-10px)' : 'none', anim: lift ? '${HOVER(-10, .1)}' : 'none' }; };
  const wrongPick = !!this.props.wrong;
  return { t, bg: studyBg({ seed: 'Cell Biology', style: 'mix', bg: { kind: 'deck' } }, false), dark: !!this.props.dark, dim: !!this.props.dim, grain: String(this.props.grain ?? 0.7), q: Q, peopleN: '12',
    o0: opt(0), o1: opt(1), o2: opt(2), o3: opt(3), c0: colors[0], c1: colors[2], c2: colors[1],
    nextHref: 'LiveLeaderboard.dc.html', nextLabel: 'Leaderboard',
    people: ${JSON.stringify(LIVE_PEOPLE)}.map((name, i) => ({ name, initial: name[0], color: colors[i % colors.length], delay: (i * .12).toFixed(2) + 's' })),
    board: ${JSON.stringify(LIVE_BOARD)}.map(([name, score, move], i) => ({ rank: String(i + 1), name, initial: name[0], color: colors[i % colors.length], score: score.toLocaleString('en-US'), w: score / ${LIVE_BOARD[0][1]} * 100 + '%',
      move: move > 0 ? '▲ ' + move : move < 0 ? '▼ ' + -move : '–', moveColor: move > 0 ? '#12A150' : move < 0 ? '#D92D20' : LV.grayInk, delay: (i * .08).toFixed(2) + 's' })),
    r: wrongPick ? { right: false, wrong: true, bg: '${LIVE_SUN(45, 75)}', title: 'Not quite', line: 'It was Golgi apparatus.', place: 'You’re in 5th place', pick: 'Lysosome', answer: 'Golgi apparatus', cardX: '134px' }
      : { right: true, wrong: false, bg: '${LIVE_MINT(45, 75)}', title: 'Right!', line: '+870 points', place: 'You’re in 2nd place, 140 points behind Maya', pick: '', answer: 'Golgi apparatus', cardX: '61px' },
    sets: [['new', 'New · 10'], ['hard', 'Hard · 36'], ['tag', 'Exam 1 · 40'], ['all', 'All · 412']].map(([k, label]) => ({ label, ...seg(k, s.set), pick: () => this.setState({ set: k }) })),
    counts: [5, 10, 20].map(n => ({ label: String(n), ...seg(n, s.count), pick: () => this.setState({ count: n }) })),
    times: [10, 20, 30].map(n => ({ label: n + 's', ...seg(n, s.time), pick: () => this.setState({ time: n }) })),
    code: '482913', setCode: () => {}, boxes: '482913'.split('').map(d => ({ digit: d, ring: 'none' })) }; }`;
// Setting up carries the deep gradient for the card's top.
const LIVE_SETUP_LOGIC = LIVE_LOGIC.replace('  return { t,', '  return { deep: ' + MIDNIGHT + ', t,');
// The phone's final leaderboard also lists everyone from 4th place on (white card, hairlines between rows).
const LIVE_FINAL_LOGIC = LIVE_LOGIC.replace('    r: wrongPick ? {', `    rest: ${JSON.stringify(LIVE_FINAL_REST)}.map(([name, score], i, all) => ({ rank: String(i + 4), name, initial: name[0], score, color: colors[(i + 3) % colors.length], line: i < all.length - 1 ? 'inset 0 -1px 0 rgba(13,21,66,.08)' : 'none', delay: (.8 + i * .08).toFixed(2) + 's' })),
    r: wrongPick ? {`);

// ---------- Pricing (lucida.cards/pricing) ----------
// Free keeps every card. Pro ($5.99 a month or $49.99 a year, since 2026-09-25; it was $39) is for making Lucida yours: AI quizzes, photo covers and
// your own colors, unlimited pictures and sounds, natural voices. Drawn for computers and phones like the landing page,
// with the same sky; it isn't on the site yet (it goes live with payments).
const PLAN_FREE = ['Unlimited decks and cards', 'Your AI makes cards for you', 'Reviews planned by spaced repetition', 'All four card types', 'A color for every deck', 'Up to 100 pictures and sounds', 'Import and export anytime'];
const PLAN_PRO = ['Learn mode with AI questions', 'Photo covers and your own colors', 'Unlimited pictures and sounds', 'Natural voices for sound cards', 'Early access to new features'];
const PRICING_FAQ = [
  ['Do I need Pro for my AI to make cards?', 'No. On Free, your AI can make as many cards as you want.'],
  ['What happens to my cards if I stop Pro?', 'Nothing. Every deck and card stays yours. Only the Pro extras switch off.'],
  ['Can I cancel anytime?', 'Yes, from Settings. Pro stays on until the end of the time you paid for.'],
  ['What counts toward the 100 pictures and sounds?', 'Each picture or sound on a card. Text cards never count.']
];
const planList = (items, check) => `<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px; font-size: 15px; line-height: 1.35;">${items.map(x => `<li style="display: flex; align-items: flex-start; gap: 10px;"><span style="margin-top: 1px; flex-shrink: 0; display: flex; ${check}">${svg(I.check, 17, 2.2)}</span>${x}</li>`).join('')}</ul>`;
const planPrice = (price, per, note) => `<div style="display: flex; flex-direction: column; gap: 6px;"><div style="display: flex; align-items: baseline; gap: 8px;"><span style="font-size: 56px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">${price}</span><span style="font-size: 16px; opacity: .75;">${per}</span></div><span style="min-height: 20px; font-size: 14px; opacity: .75;">${note}</span></div>`;
// Pro's price and Go Pro for one way of paying. Both are drawn, and the Monthly/Yearly switch shows one (on the site, a
// small script in design/to-site.mjs flips them, since its pages are plain HTML).
const proPlan = (plan, price, per, note) => `<div data-plan="${plan}" style="display: {{${plan}Show}}; flex-direction: column; gap: 24px;">${planPrice(price, per, note)}<sc-if value="{{proLive}}" hint-placeholder-val="{{ true }}">${landPill('Go Pro', `{{${plan}Href}}`, true, 50, 'background: #FFFFFF; color: #000000;')}</sc-if><sc-if value="{{proSoon}}" hint-placeholder-val="{{ false }}"><span style="height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255,255,255,.16); box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); font-size: 15px; font-weight: 600;">Pro is coming soon</span></sc-if></div>`;
const pricing = (L, w, hgt) => { const phone = L === LAND.phone, pad = phone ? 20 : 32; return `<div style="position: relative; isolation: isolate; width: ${w}px; height: ${hgt}px; box-sizing: border-box; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${skyLayer(phone)}
<header style="max-width: 1344px; margin: 0 auto; height: ${phone ? 64 : 76}px; box-sizing: border-box; padding: 0 ${L.pad}px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
  <a href="{{homeHref}}" aria-label="Lucida home">${logo(phone ? 26 : 30)}</a>
  <nav style="display: flex; align-items: center; gap: ${phone ? 6 : 4}px;">${phone ? '' : `<a href="{{howHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">How it works</a><a href="{{typesHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Card types</a><a href="#" aria-current="page" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; font-weight: 600; color: {{t.text}};">Pricing</a>`}<a href="{{signInHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Sign in</a>${landPill('Get started', '{{startHref}}', true, 36, phone ? 'padding: 0 14px;' : '')}</nav>
</header>
<section style="padding: ${phone ? 44 : 80}px ${L.pad}px 0; display: flex; flex-direction: column; align-items: center; text-align: center;">
  <h1 style="margin: 0; font-size: ${phone ? 44 : 72}px; font-weight: 600; line-height: 1; letter-spacing: -.05em; text-wrap: balance;">Simple pricing.</h1>
  ${leadP(L, 'Your cards are always free. Pro is for making Lucida yours.', true)}
  <div role="group" aria-label="Billing" style="margin-top: ${phone ? 26 : 32}px; display: inline-flex; padding: 4px; border-radius: 999px; background: {{t.bg}}; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 10px 24px -14px rgba(0,0,0,.25);"><sc-for list="{{billing}}" as="b" hint-placeholder-count="2"><button type="button" onClick="{{b.pick}}" data-plan-pick="{{b.id}}" aria-pressed="{{b.pressed}}" style="height: 40px; padding: 0 18px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; background: {{b.bg}}; color: {{b.fg}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{b.label}}<sc-if value="{{b.hasTag}}" hint-placeholder-val="{{ false }}"><span style="height: 22px; padding: 0 8px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.goodTint}}; color: {{t.good}}; font-size: 12px; font-weight: 600;">Save 30%</span></sc-if></button></sc-for></div>
</section>
<section style="padding: ${phone ? 28 : 44}px ${phone ? 16 : L.pad}px 0;">
  <div style="max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: ${phone ? '1fr' : '1fr 1fr'}; gap: ${phone ? 12 : 16}px;">
    <div style="box-sizing: border-box; padding: ${pad}px; border-radius: ${phone ? 28 : 32}px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px -24px rgba(0,0,0,.25); display: flex; flex-direction: column; gap: 24px;">
      <div><div style="font-size: 20px; font-weight: 600; letter-spacing: -.01em;">Free</div><div style="margin-top: 6px; font-size: 15px; color: {{t.muted}};">Everything you need to learn.</div></div>
      ${planPrice('$0', 'forever', '')}
      ${landPill('Get started', '{{startHref}}', false, 50)}
      ${planList(PLAN_FREE, 'color: {{t.muted}};')}
    </div>
    ${artCard('pro', `border-radius: ${phone ? 28 : 32}px; box-shadow: 0 24px 56px -28px rgba(20,22,90,.55);`, `height: 100%; box-sizing: border-box; padding: ${pad}px; display: flex; flex-direction: column; gap: 24px;`, `<div><div style="display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 600; letter-spacing: -.01em;">${svg(I.sparkle, 18, 1.8)}Pro</div><div style="margin-top: 6px; font-size: 15px; opacity: .8;">Make Lucida yours.</div></div>
      ${proPlan('yearly', '$49.99', 'a year', 'That’s $4.17 a month, paid once a year.')}
      ${proPlan('monthly', '$5.99', 'a month', 'Paid monthly. Cancel anytime.')}
      <div style="display: flex; flex-direction: column; gap: 12px;"><span style="font-size: 14px; opacity: .8;">Everything in Free, plus:</span>${planList(PLAN_PRO, 'color: #FFFFFF;')}</div>`)}
  </div>
</section>
<section style="max-width: 1024px; margin: 0 auto; box-sizing: border-box; padding: ${phone ? 72 : 112}px ${phone ? 20 : 32}px 0;">
  ${landH2(L, 'Questions')}
  <div style="margin-top: ${phone ? 24 : 32}px; display: grid; grid-template-columns: ${phone ? '1fr' : '1fr 1fr'}; gap: ${phone ? 10 : 16}px;">
    ${PRICING_FAQ.map(([q, a]) => `<div style="box-sizing: border-box; padding: ${phone ? 20 : 24}px; border-radius: ${phone ? 22 : 24}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 17px; font-weight: 600; letter-spacing: -.01em;">${q}</span><span style="font-size: 15px; line-height: 1.5; color: {{t.muted}};">${a}</span></div>`).join('\n    ')}
  </div>
</section>
<div style="height: ${phone ? 72 : 112}px;"></div>
${landFooter(phone)}
</div>`; };
const PRICING_H = 1617, PRICING_PHONE_H = 2191;
// Pro's Stripe payment links are in web/plans.mjs. While they're empty the site says "Pro is coming soon"; once both are
// set, Go Pro goes through the app's /pro page (it signs you in first, then opens Stripe's checkout knowing who's
// paying). The site had only yearly with a "Pay $5.99 monthly instead" link, and the owner found it confusing ("it only
// has the yearly subscription no monthly option"), so the site has the Monthly/Yearly switch too, starting on Yearly.
const pricingLogic = phone => `${ART_METHOD}
constructor(props) { super(props); this.state = { yearly: true }; }
renderVals() { ${T}
  // On lucida.cards (props.site) the links open the app and the landing page; on the canvas, the boards.
  const site = !!this.props.site, y = this.state.yearly, signIn = site ? 'https://app.lucida.cards/sign-in' : '${phone ? 'PhoneSignIn' : 'WebSignIn'}.dc.html';
  const seg = on => ({ bg: on ? t.inv : 'transparent', fg: on ? t.invText : t.text, pressed: on ? 'true' : 'false' });
  const links = ${JSON.stringify(PRO_LINKS)}, selling = !!(links.monthly && links.yearly), start = site ? 'https://app.lucida.cards/' : signIn;
  return { t, sky: ${SKY}, grain: String(this.props.grain ?? 0.7), pro: this.art(${MIDNIGHT}, ''),
    billing: [{ id: 'monthly', label: 'Monthly', ...seg(!y), hasTag: false, pick: () => this.setState({ yearly: false }) }, { id: 'yearly', label: 'Yearly', ...seg(y), hasTag: true, pick: () => this.setState({ yearly: true }) }],
    yearlyShow: y ? 'flex' : 'none', monthlyShow: y ? 'none' : 'flex',
    yearlyHref: selling ? (site ? 'https://app.lucida.cards/pro?plan=yearly' : links.yearly) : start, monthlyHref: selling ? (site ? 'https://app.lucida.cards/pro?plan=monthly' : links.monthly) : start,
    homeHref: site ? '/' : '${phone ? 'LandingPhone' : 'Landing'}.dc.html', howHref: site ? '/#how' : 'Landing.dc.html', typesHref: site ? '/#cards' : 'Landing.dc.html',
    signInHref: signIn, startHref: site ? 'https://app.lucida.cards/' : signIn, privacyHref: site ? '/privacy' : 'Privacy.dc.html', termsHref: site ? '/terms' : 'Terms.dc.html',
    pricingHref: site ? '/pricing' : '${phone ? 'PricingPhone' : 'Pricing'}.dc.html', proLive: !site || selling, proSoon: site && !selling }; }`;

// ---------- Privacy and Terms (lucida.cards/privacy and /terms) ----------
// Plain pages from legal.mjs: one column of text that fits any window. design/to-site.mjs makes them pages.
const LEGAL_H = { Privacy: 2236, Terms: 1963 };
const legalPage = (doc, hgt) => `<div style="width: 1440px; height: ${hgt}px; box-sizing: border-box; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
<header style="max-width: 1344px; margin: 0 auto; height: 76px; box-sizing: border-box; padding: 0 clamp(20px, 4vw, 48px); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
  <a href="{{homeHref}}" aria-label="Lucida home">${logo(28)}</a>
  <nav style="display: flex; align-items: center; gap: 4px;"><a href="{{signInHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.muted}};">Sign in</a>${landPill('Get started', '{{startHref}}', true, 36)}</nav>
</header>
<main style="max-width: 720px; margin: 0 auto; box-sizing: border-box; padding: clamp(40px, 7vw, 88px) 24px 72px; display: flex; flex-direction: column; gap: 16px;">
  <h1 style="margin: 0; font-size: clamp(38px, 5vw, 52px); font-weight: 600; line-height: 1.05; letter-spacing: -.045em;">${doc.title}</h1>
  <p style="margin: 0; font-size: 14px; color: {{t.muted}};">Last updated ${UPDATED}</p>
  <p style="margin: 8px 0 0; font-size: 19px; line-height: 1.55; text-wrap: pretty;">${doc.intro}</p>
  ${doc.sections.map(x => `<section style="margin-top: 24px; display: flex; flex-direction: column; gap: 12px;"><h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">${x.h}</h2>${x.body.map(b => Array.isArray(b) ? `<ul style="margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 16px; line-height: 1.6; color: {{t.muted}};">${b.slice(1).map(li => `<li>${li}</li>`).join('')}</ul>` : `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: {{t.muted}};">${b}</p>`).join('')}</section>`).join('\n  ')}
</main>
${landFooter(false)}
</div>`;
// On lucida.cards (props.site) the links open the site and the app; on the canvas, the boards.
const legalLogic = `renderVals() { ${T}
  const site = !!this.props.site;
  return { t, homeHref: site ? 'https://lucida.cards/' : 'Landing.dc.html', signInHref: site ? 'https://app.lucida.cards/sign-in' : 'WebSignIn.dc.html', startHref: site ? 'https://app.lucida.cards/' : 'WebSignIn.dc.html',
    privacyHref: site ? '/privacy' : 'Privacy.dc.html', termsHref: site ? '/terms' : 'Terms.dc.html', pricingHref: site ? '/pricing' : 'Pricing.dc.html' }; }`;

// ---------- write ----------
const W = 1440, H = 900, PW = 390, PH = 844;
const EDITOR_CSS = RICH_CSS + OCC_EDIT_CSS;
const files = {
  'Main': ['Web · Today', webToday, { props: { ...DARK, ...MESH('Iris'), caughtUp: { editor: 'boolean', default: false } }, logic: todayLogic, css: DRAG_CSS, w: W, h: H }],
  'WebNewDeck': ['Web · New deck', webNewDeck, { props: { ...DARK, grain: MESH('Iris').grain }, logic: NEW_DECK_LOGIC, css: NUM_CSS + COVER_FADE_CSS, w: W, h: H }],
  'WebImport': ['Web · Import cards', webImport, { props: { ...DARK, grain: MESH('Iris').grain }, logic: importLogic, w: W, h: H }],
  'WebDecks': ['Web · Library', webDecks, { props: { ...DARK, grain: MESH('Iris').grain, mode: LIB_MODE, folder: LIB_FOLDER, view: { editor: 'enum', default: 'Cards', options: ['Cards', 'List'] }, openTags: { editor: 'boolean', default: false }, moreTags: { editor: 'boolean', default: false } }, logic: decksLogic, css: DRAG_CSS, w: W, h: H }],
  'WebLibraryCards': ['Web · Library · all cards (filter by tags and difficulty)', attrOf('WebDecks', W, H, 'mode="cards"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebLibraryFolder': ['Web · Library · a folder', attrOf('WebDecks', W, H, 'folder="f1"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebLibraryNewFolder': ['Web · Library · New folder popup', attrOf('WebDecks', W, H, 'naming="{{yes}}"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebLibraryMove': ['Web · Library · a deck’s ⋯ menu (move it to a folder)', attrOf('WebDecks', W, H, 'move-open="{{yes}}"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebDeckMoveTray': ['Web · Deck · Move to tray (while a card is dragged)', attrOf('WebDeck', W, H, 'tray-open="{{yes}}"'), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebDecksTags': ['Web · Library · a deck with 11 tags (+9 shows them all)', attrOf('WebDecks', W, H, 'open-tags="{{yes}}"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebDecksMoreTags': ['Web · Library · More (find any tag)', attrOf('WebDecks', W, H, 'more-tags="{{yes}}"'), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebDecksList': ['Web · Library · list view', listOf('WebDecks', W, H), { logic: 'renderVals() { return {}; }', css: DRAG_CSS, w: W, h: H }],
  'WebSettings': ['Web · Settings', webSettings, { props: { ...DARK, grain: MESH('Iris').grain, photo: { editor: 'enum', default: 'Color', options: ['Color', 'Google photo'] }, plan: { editor: 'enum', default: 'Pro', options: ['Free', 'Pro', 'Pro, ending'] } }, logic: webSettingsLogic, css: NUM_CSS, w: W, h: H }],
  'IconOptions': ['Web · Icon options', iconOptions, { props: DARK, logic: iconOptionsLogic, w: W, h: H }],
  'WebTodayNew': ['Web · Today · new user', webTodayNew, { props: { ...DARK, ...MESH('Iris') }, logic: emptyLogic(), w: W, h: H }],
  'WebTodayCaughtUp': ['Web · Today · all caught up', caughtOf('Main', W, H), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebDecksEmpty': ['Web · Library · no decks yet', webDecksEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: W, h: H }],
  'WebDeckEmpty': ['Web · Deck · no cards yet', webDeckEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic('Pharmacology'), w: W, h: H }],
  'WebStatsEmpty': ['Web · Stats · no reviews yet', webStatsEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: W, h: H }],
  'WebDeck': ['Web · Deck page', webDeck, { props: { ...DARK, grain: MESH('Iris').grain, settingsOpen: { editor: 'boolean', default: false }, settingsTab: { editor: 'enum', default: 'General', options: ['General', 'Studying'] }, tagPicker: { editor: 'boolean', default: false } }, logic: deckLogic, css: NUM_CSS + PARALLAX_CSS + DRAG_CSS, w: W, h: H }],
  'WebDeckTagPicker': ['Web · Deck settings · Add tag', attrOf('WebDeck', W, H, 'settings-open="{{yes}}" tag-picker="{{yes}}"'), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebEditor': ['Web · Card editor', webEditor, { props: { ...DARK, cardType: { editor: 'enum', default: 'Basic', options: ['Basic', 'Blank', 'Image', 'Audio'] }, slashDemo: { editor: 'boolean', default: false } }, logic: EDITOR_LOGIC, css: EDITOR_CSS, w: W, h: H }],
  'WebEditorSlash': ['Web · Card editor · / menu', attrOf('WebEditor', W, H, 'slash-demo="{{yes}}"'), { logic: darkLogic, css: EDITOR_CSS, w: W, h: H }],
  'WebSignIn': ['Web · Sign in', webSignIn, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('', [64, 78, 70, 84]), css: WALL_CSS, w: W, h: H }],
  'WebSignInCode': ['Web · Sign in · code from email', webSignInCode, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('482', [64, 78, 70, 84]), css: WALL_CSS, w: W, h: H }],
  'WebEditorBlank': ['Web · Card editor · fill in the blank', typeOf('WebEditor', W, H, 'Blank'), { logic: darkLogic, css: EDITOR_CSS, w: W, h: H }],
  'WebEditorImage': ['Web · Card editor · image', typeOf('WebEditor', W, H, 'Image'), { logic: darkLogic, css: EDITOR_CSS, w: W, h: H }],
  'WebEditorAudio': ['Web · Card editor · audio', typeOf('WebEditor', W, H, 'Audio'), { logic: darkLogic, css: EDITOR_CSS, w: W, h: H }],
  'WebReview': ['Web · Review', webReview, { props: { ...DARK, explainOpen: { editor: 'boolean', default: false }, explained: { editor: 'boolean', default: false }, grading: { editor: 'enum', default: 'Four buttons', options: ['Four buttons', 'Check or X', 'Piles'] }, card: { editor: 'enum', default: 'Basic', options: ['Basic', 'Fill in the blank', 'Image', 'Audio'] }, startRevealed: { editor: 'boolean', default: false }, fsrs: { editor: 'boolean', default: true }, progress: { editor: 'enum', default: 'Bar', options: ['Bar', 'Counts', 'None'] }, settingsOpen: { editor: 'boolean', default: false }, newPileOpen: { editor: 'boolean', default: false }, radius: { editor: 'range', default: 32, min: 12, max: 48, step: 2, unit: 'px' } }, logic: REVIEW_LOGIC(64), css: REVIEW_CSS, w: W, h: H }],
  'WebDone': ['Web · Session done', webDone, { props: DARK, logic: doneLogic(300, 22), w: W, h: H }],
  'WebDonePiles': ['Web · Session done · piles', webDonePiles, { props: DARK, logic: donePilesLogic, w: W, h: H }],
  'WebStats': ['Web · Stats', webStats, { props: DARK, logic: statsLogic, w: W, h: H }],
  'WebConnect': ['Web · Connect AI', webConnect, { props: { ...DARK, ...MESH('Apricot') }, logic: connectLogic, w: W, h: H }],
  'WebTodayDark': ['Web · Today (dark)', darkOf('Main', W, H), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebReviewDark': ['Web · Review (dark)', darkOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewFour': ['Web · Review · 4 grades', styleOf('WebReview', W, H, 'Four buttons'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewCheck': ['Web · Review · ✓ or ✗', styleOf('WebReview', W, H, 'Check or X'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewExplain': ['Web · Review · Explain (AI explains the answer)', attrOf('WebReview', W, H, 'start-revealed="{{yes}}" explain-open="{{yes}}" explained="{{yes}}"'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewSettings': ['Web · Review · settings', settingsOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewPiles': ['Web · Review · Piles', styleOf('WebReview', W, H, 'Piles'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewNewPile': ['Web · Review · New pile popup', pileOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewBlank': ['Web · Review · fill in the blank', blankOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewImage': ['Web · Review · picture with hidden parts (click the card or press Space)', attrOf('WebReview', W, H, 'card="Image"'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebDeckSettings': ['Web · Deck settings', openOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebDeckSettingsStudy': ['Web · Deck settings · Studying (FSRS)', studyOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebDeckDark': ['Web · Deck page (dark)', darkOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebStatsDark': ['Web · Stats (dark)', darkOf('WebStats', W, H), { logic: darkLogic, w: W, h: H }],
  'WebTodayGray': ['Web · Today (dark, gray)', grayOf('Main', W, H), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebLibraryGray': ['Web · Library (dark, gray)', grayOf('WebDecks', W, H), { logic: darkLogic, css: DRAG_CSS, w: W, h: H }],
  'WebDeckGray': ['Web · Deck page (dark, gray)', grayOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: W, h: H }],
  'WebReviewGray': ['Web · Review (dark, gray)', grayOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebQuizGray': ['Web · Learn mode (dark, gray)', grayOf('WebQuiz', W, H), { logic: darkLogic, css: LEARN_CSS, w: W, h: H }],
  'WebStatsGray': ['Web · Stats (dark, gray)', grayOf('WebStats', W, H), { logic: darkLogic, w: W, h: H }],
  'WebSettingsGray': ['Web · Settings (dark, gray)', grayOf('WebSettings', W, H), { logic: darkLogic, css: NUM_CSS, w: W, h: H }],
  'TopToday': ['Top tabs · Today', topToday, { props: { ...DARK, ...MESH('Iris') }, logic: topTodayLogic, w: W, h: H }],
  'TopDeck': ['Top tabs · Deck', topDeck, { props: DARK, logic: topDeckLogic, w: W, h: H }],
  'TopTodayDark': ['Top tabs · Today (dark)', darkOf('TopToday', W, H), { logic: darkLogic, w: W, h: H }],
  'FocusHome': ['Focus · Home', focusHome, { props: DARK, logic: focusLogic(4), w: W, h: H }],
  'FocusDecks': ['Focus · Decks sheet', focusDecks, { props: DARK, logic: focusLogic(6), w: W, h: H }],
  'FocusHomeDark': ['Focus · Home (dark)', darkOf('FocusHome', W, H), { logic: darkLogic, w: W, h: H }],
  'CardTypes': ['Card types', cardTypes, { props: DARK, logic: cardTypesLogic, css: cardTypesCss, w: W, h: H }],
  'CardTypesDark': ['Card types (dark)', darkOf('CardTypes', W, H), { logic: darkLogic, css: cardTypesCss, w: W, h: H }],
  'Reference': ['Your reference', `<div style="width: 1440px; height: 1110px; overflow: hidden; background: #FFFFFF;"><img src="/_blob/b36d0110fdee9533cc5677ceb6b78d3d" alt="Reference: blurred green and gold gradient with grain and chat bubbles" width="1440" height="1110" style="display: block; width: 1440px; height: 1110px; object-fit: cover;"></div>`, { logic: 'renderVals() { return {}; }', w: W, h: 1110 }],
  'Generated': ['Generated gradients', generatedBoard, { props: { grain: MESH('Iris').grain }, logic: generatedLogic, w: W, h: H }],
  'Gallery': ['Gradient cards', galleryBoard, { props: { grain: MESH('Iris').grain }, logic: galleryLogic, w: W, h: H }],
  'Motion': ['Motion', motion(), { props: { grain: MESH('Iris').grain }, logic: `renderVals() { return { t: this.theme(false), grain: String(this.props.grain ?? 0.7), hero: this.mesh('Iris'), art: this.mesh('Iris'), art2: this.mesh('Mint'), art3: this.mesh('Apricot') }; }`, css: motionCss, w: W, h: MOTION_H }],
  'PhoneToday': ['iPhone · Today', phoneToday, { props: { ...DARK, ...MESH('Iris'), caughtUp: { editor: 'boolean', default: false } }, logic: phoneDecksLogic, w: PW, h: PH }],
  'PhoneTodayNew': ['iPhone · Today · new user', phoneTodayNew, { props: { ...DARK, ...MESH('Iris') }, logic: emptyLogic(), w: PW, h: PH }],
  'PhoneTodayCaughtUp': ['iPhone · Today · all caught up', caughtOf('PhoneToday', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneDeckEmpty': ['iPhone · Deck · no cards yet', phoneDeckEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic('Pharmacology'), w: PW, h: PH }],
  'PhoneDecksEmpty': ['iPhone · Library · no decks yet', phoneDecksEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: PW, h: PH }],
  'PhoneLibrary': ['iPhone · Library', phoneLibrary, { props: { ...DARK, grain: MESH('Iris').grain, mode: LIB_MODE, folder: LIB_FOLDER }, logic: libraryLogic(true), css: DRAG_CSS, w: PW, h: PH }],
  'PhoneLibraryCards': ['iPhone · Library · all cards', attrOf('PhoneLibrary', PW, PH, 'mode="cards"'), { logic: darkLogic, css: DRAG_CSS, w: PW, h: PH }],
  'PhoneLibraryFolder': ['iPhone · Library · a folder', attrOf('PhoneLibrary', PW, PH, 'folder="f1"'), { logic: darkLogic, css: DRAG_CSS, w: PW, h: PH }],
  'PhoneLibraryNewFolder': ['iPhone · Library · New folder popup', attrOf('PhoneLibrary', PW, PH, 'naming="{{yes}}"'), { logic: darkLogic, css: DRAG_CSS, w: PW, h: PH }],
  'PhoneDeckMoveTray': ['iPhone · Deck · Move to tray (while a card is dragged)', attrOf('PhoneDeck', PW, PH, 'tray-open="{{yes}}"'), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneStatsEmpty': ['iPhone · Stats · no reviews yet', phoneStatsEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: PW, h: PH }],
  'PhoneNewDeck': ['iPhone · New deck', phoneNewDeck, { props: { ...DARK, grain: MESH('Iris').grain }, logic: NEW_DECK_LOGIC, css: NUM_CSS + COVER_FADE_CSS, w: PW, h: PH }],
  'PhoneInbox': ['iPhone · Check AI cards', phoneInbox, { props: DARK, logic: phoneInboxLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneDeck': ['iPhone · Deck page', phoneDeck, { props: { ...DARK, grain: MESH('Iris').grain, settingsOpen: { editor: 'boolean', default: false }, settingsTab: { editor: 'enum', default: 'General', options: ['General', 'Studying'] }, tagPicker: { editor: 'boolean', default: false } }, logic: phoneDeckLogic, css: NUM_CSS + PARALLAX_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneDeckTagPicker': ['iPhone · Deck settings · Add tag', attrOf('PhoneDeck', PW, PH, 'settings-open="{{yes}}" tag-picker="{{yes}}"'), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneDeckSettingsStudy': ['iPhone · Deck settings · Studying (FSRS)', studyOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneEditor': ['iPhone · Card editor', phoneEditor, { props: { ...DARK, keyboard: { editor: 'boolean', default: true }, textStyles: { editor: 'boolean', default: false }, cardType: { editor: 'enum', default: 'Basic', options: ['Basic', 'Blank', 'Image', 'Audio'] } }, logic: EDITOR_LOGIC, css: EDITOR_CSS, w: PW, h: PH }],
  'PhoneReview': ['iPhone · Review', phoneReview, { props: { ...DARK, explainOpen: { editor: 'boolean', default: false }, explained: { editor: 'boolean', default: false }, grading: { editor: 'enum', default: 'Four buttons', options: ['Four buttons', 'Check or X', 'Piles'] }, card: { editor: 'enum', default: 'Basic', options: ['Basic', 'Fill in the blank', 'Image', 'Audio'] }, startRevealed: { editor: 'boolean', default: false }, fsrs: { editor: 'boolean', default: true }, progress: { editor: 'enum', default: 'Bar', options: ['Bar', 'Counts', 'None'] }, settingsOpen: { editor: 'boolean', default: false }, newPileOpen: { editor: 'boolean', default: false }, radius: { editor: 'range', default: 32, min: 12, max: 48, step: 2, unit: 'px' } }, logic: REVIEW_LOGIC(64), css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneDone': ['iPhone · Session done', phoneDone, { props: DARK, logic: doneLogic(260, 20), w: PW, h: PH }],
  'PhoneDonePiles': ['iPhone · Session done · piles', phoneDonePiles, { props: DARK, logic: donePilesLogic, w: PW, h: PH }],
  'PhoneSignIn': ['iPhone · Sign in', phoneSignIn, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('', [50, 60, 55, 65], PHONE_K), css: WALL_CSS, w: PW, h: PH }],
  'PhoneSignInCode': ['iPhone · Sign in · code from email', phoneSignInCode, { props: DARK, logic: signInLogic('482'), w: PW, h: PH }],
  'Landing': ['Landing page · lucida.cards', landing(LAND.web, W, LANDING_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: landingLogic(false), css: WALL_CSS + DEMO_CSS + SKY_CSS, w: W, h: LANDING_H }],
  'WebQuizStart': ['Web · Learn mode · start (Pro)', webQuizStart(true), { props: DARK, logic: QUIZ_START_LOGIC(false, true), w: W, h: H }],
  'WebQuizUpgrade': ['Web · Learn mode · on Free: go Pro', webQuizStart(false), { props: { ...DARK, grain: MESH('Iris').grain }, logic: QUIZ_START_LOGIC(false), w: W, h: H }],
  'WebQuiz': ['Web · Learn mode · choice question', webQuiz, { props: { ...DARK, answered: { editor: 'boolean', default: false } }, logic: QUIZ_LOGIC(false), css: LEARN_CSS, w: W, h: H }],
  'WebQuizAnswered': ['Web · Learn mode · answered', attrOf('WebQuiz', W, H, 'answered="{{yes}}"'), { logic: darkLogic, css: LEARN_CSS, w: W, h: H }],
  'WebQuizMatch': ['Web · Learn mode · matching', webQuizMatch, { props: DARK, logic: MATCH_LOGIC(false), css: LEARN_CSS, w: W, h: H }],
  'WebQuizType': ['Web · Learn mode · type the answer', webQuizType, { props: DARK, logic: TYPE_LOGIC(false), css: LEARN_CSS, w: W, h: H }],
  'WebQuizDone': ['Web · Learn mode · all learned', webQuizDone, { props: DARK, logic: QUIZ_DONE_LOGIC, css: LEARN_CSS, w: W, h: H }],
  'PhoneQuizStart': ['iPhone · Learn mode · start (Pro)', phoneQuizStart(true), { props: DARK, logic: QUIZ_START_LOGIC(true, true), w: PW, h: PH }],
  'PhoneQuizUpgrade': ['iPhone · Learn mode · on Free: go Pro', phoneQuizStart(false), { props: { ...DARK, grain: MESH('Iris').grain }, logic: QUIZ_START_LOGIC(true), w: PW, h: PH }],
  'PhoneQuiz': ['iPhone · Learn mode · choice question', phoneQuiz, { props: { ...DARK, answered: { editor: 'boolean', default: false } }, logic: QUIZ_LOGIC(true), css: LEARN_CSS, w: PW, h: PH }],
  'PhoneQuizAnswered': ['iPhone · Learn mode · answered', attrOf('PhoneQuiz', PW, PH, 'answered="{{yes}}"'), { logic: darkLogic, css: LEARN_CSS, w: PW, h: PH }],
  'PhoneQuizMatch': ['iPhone · Learn mode · matching', phoneQuizMatch, { props: DARK, logic: MATCH_LOGIC(true), css: LEARN_CSS, w: PW, h: PH }],
  'PhoneQuizType': ['iPhone · Learn mode · type the answer', phoneQuizType, { props: DARK, logic: TYPE_LOGIC(true), css: LEARN_CSS, w: PW, h: PH }],
  'PhoneQuizDone': ['iPhone · Learn mode · all learned', phoneQuizDone, { props: DARK, logic: QUIZ_DONE_LOGIC, css: LEARN_CSS, w: PW, h: PH }],
  'LiveSetup': ['Live · host · set up', liveSetup, { props: DARK, logic: LIVE_SETUP_LOGIC, w: W, h: H }],
  'LiveLobby': ['Live · big screen · lobby (join code)', liveLobby, { props: DARK, logic: LIVE_LOGIC, css: LIVE_CSS, w: W, h: H }],
  'LiveQuestion': ['Live · big screen · question', liveQuestion, { props: { ...DARK, grain: MESH('Iris').grain }, logic: LIVE_LOGIC, css: LIVE_CSS, w: W, h: H }],
  'LiveReveal': ['Live · big screen · answer', liveReveal, { props: { ...DARK, grain: MESH('Iris').grain, reveal: { editor: 'boolean', default: true } }, logic: LIVE_LOGIC, css: LIVE_CSS, w: W, h: H }],
  'LiveLeaderboard': ['Live · big screen · leaderboard', liveLeaderboard, { props: DARK, logic: LIVE_LOGIC, css: LIVE_CSS, w: W, h: H }],
  'LivePodium': ['Live · big screen · podium', livePodium, { props: { ...DARK, grain: MESH('Iris').grain }, logic: LIVE_LOGIC, css: LIVE_CSS, w: W, h: H }],
  'LiveJoin': ['Live · phone · join', liveJoin, { props: DARK, logic: LIVE_LOGIC, w: PW, h: PH }],
  'LiveWaiting': ['Live · phone · waiting', liveWaiting, { props: DARK, logic: LIVE_LOGIC, css: LIVE_CSS, w: PW, h: PH }],
  'LiveAnswer': ['Live · phone · answer', liveAnswer, { props: { ...DARK, grain: MESH('Iris').grain }, logic: LIVE_LOGIC, css: LIVE_CSS, w: PW, h: PH }],
  'LiveResult': ['Live · phone · right', liveResult, { props: { ...DARK, wrong: { editor: 'boolean', default: false } }, logic: LIVE_LOGIC, css: LIVE_CSS + FLAME_CSS, w: PW, h: PH }],
  'LiveResultWrong': ['Live · phone · not quite', attrOf('LiveResult', PW, PH, 'wrong="{{yes}}"'), { logic: darkLogic, css: LIVE_CSS, w: PW, h: PH }],
  'LiveFinal': ['Live · phone · final', liveFinal, { props: { ...DARK, grain: MESH('Iris').grain }, logic: LIVE_FINAL_LOGIC, css: LIVE_CSS, w: PW, h: PH }],
  'Pricing': ['Pricing · lucida.cards/pricing', pricing(LAND.web, W, PRICING_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: pricingLogic(false), css: SKY_CSS, w: W, h: PRICING_H }],
  'PricingPhone': ['Pricing · lucida.cards/pricing on a phone', pricing(LAND.phone, PW, PRICING_PHONE_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: pricingLogic(true), css: SKY_CSS, w: PW, h: PRICING_PHONE_H }],
  'Privacy': ['Privacy Policy · lucida.cards/privacy', legalPage(PRIVACY, LEGAL_H.Privacy), { props: DARK, logic: legalLogic, w: W, h: LEGAL_H.Privacy }],
  'Terms': ['Terms of Service · lucida.cards/terms', legalPage(TERMS, LEGAL_H.Terms), { props: DARK, logic: legalLogic, w: W, h: LEGAL_H.Terms }],
  'LandingPhone': ['Landing page · lucida.cards on a phone', landing(LAND.phone, PW, LANDING_PHONE_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: landingLogic(true), css: WALL_CSS + DEMO_CSS + SKY_CSS, w: PW, h: LANDING_PHONE_H }],
  'PhoneStats': ['iPhone · Stats', phoneStats, { props: DARK, logic: phoneStatsLogic, w: PW, h: PH }],
  'PhoneConnect': ['iPhone · Connect AI', phoneConnect, { props: { ...DARK, ...MESH('Apricot') }, logic: phoneConnectLogic, w: PW, h: PH }],
  'PhoneTodayDark': ['iPhone · Today (dark)', darkOf('PhoneToday', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneReviewDark': ['iPhone · Review (dark)', darkOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewFour': ['iPhone · Review · 4 grades', styleOf('PhoneReview', PW, PH, 'Four buttons'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewCheck': ['iPhone · Review · ✓ or ✗', styleOf('PhoneReview', PW, PH, 'Check or X'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewExplain': ['iPhone · Review · Explain (AI explains the answer)', attrOf('PhoneReview', PW, PH, 'start-revealed="{{yes}}" explain-open="{{yes}}" explained="{{yes}}"'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewSettings': ['iPhone · Review · settings', settingsOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewPiles': ['iPhone · Review · Piles', styleOf('PhoneReview', PW, PH, 'Piles'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewNewPile': ['iPhone · Review · New pile popup', pileOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewBlank': ['iPhone · Review · fill in the blank', blankOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewImage': ['iPhone · Review · picture with hidden parts (tap the card)', attrOf('PhoneReview', PW, PH, 'card="Image"'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneEditorImage': ['iPhone · Card editor · image with boxes', attrOf('PhoneEditor', PW, PH, 'card-type="Image" keyboard="{{no}}"'), { logic: 'renderVals() { return { yes: true, no: false }; }', css: EDITOR_CSS, w: PW, h: PH }],
  'PhoneSettings': ['iPhone · Settings', phoneSettings, { props: { ...DARK, plan: { editor: 'enum', default: 'Pro', options: ['Free', 'Pro', 'Pro, ending'] } }, logic: phoneSettingsLogic, w: PW, h: PHONE_SETTINGS_H }],
  'PhoneDeckSettings': ['iPhone · Deck settings', openOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneDeckDark': ['iPhone · Deck page (dark)', darkOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneStatsDark': ['iPhone · Stats (dark)', darkOf('PhoneStats', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneTodayGray': ['iPhone · Today (dark, gray)', grayOf('PhoneToday', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneLibraryGray': ['iPhone · Library (dark, gray)', grayOf('PhoneLibrary', PW, PH), { logic: darkLogic, css: DRAG_CSS, w: PW, h: PH }],
  'PhoneDeckGray': ['iPhone · Deck page (dark, gray)', grayOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS + DRAG_CSS, w: PW, h: PH }],
  'PhoneReviewGray': ['iPhone · Review (dark, gray)', grayOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneQuizGray': ['iPhone · Learn mode (dark, gray)', grayOf('PhoneQuiz', PW, PH), { logic: darkLogic, css: LEARN_CSS, w: PW, h: PH }],
  'PhoneStatsGray': ['iPhone · Stats (dark, gray)', grayOf('PhoneStats', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneSettingsGray': ['iPhone · Settings (dark, gray)', grayOf('PhoneSettings', PW, PHONE_SETTINGS_H), { logic: darkLogic, w: PW, h: PHONE_SETTINGS_H }]
};
for (const [name, [title, body, opts]] of Object.entries(files)) writeFileSync(OUT + name + '.dc.html', page(title, body, opts));

// The canvas layout (where each board sits) lives in canvas/project/canvas.json. It's kept in sync with the live
// canvas, since boards can be moved there, so this script never rewrites it.
console.log(Object.keys(files).length, 'artboards');
