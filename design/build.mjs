// Generates every board of the Lucida design canvas (https://claude.ai/artifact/VLXyuTGdroHdrJ2qNAmiGs).
// The web app is made from these boards too (design/to-web.mjs), so the canvas and the app always match.
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { PALETTE_NAMES, PALETTES, flowSvg, grainSvg, grainTile, paletteData } from './surfaces.mjs';
import { GEN_METHOD } from './generator.mjs';
import { MOCK_METHOD } from './mock.mjs';
import { WALL_CARDS } from './wall.mjs';
import { PRIVACY, TERMS, UPDATED } from './legal.mjs';
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
theme(d) {
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
${logic.includes('this.rich(') ? RICH_METHOD : ''}
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
const DARK = { dark: { editor: 'boolean', default: false } };
const T = 'const t = this.theme(!!this.props.dark);';
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
  // Where Lucida posts (the landing and legal footers).
  tiktok: '<path d="M15.5 3c.4 2.7 2.3 4.6 5 5"/><path d="M15.5 3v11.8a4.3 4.3 0 1 1-4.3-4.3"/>',
  youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/>',
  facebook: '<circle cx="12" cy="12" r="9.5"/><path d="M15.5 7.5h-1.8a2.7 2.7 0 0 0-2.7 2.7v11.3M8.5 13.2h6"/>'
};

// The mark: three dots, two above and one below, in the text color. The viewBox hugs the ink, so `h` is its real height.
const MARK_DOTS = [[7, 7], [26, 7], [16.5, 23.45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
const mark = h => `<svg width="${Math.round(h * 33 / 30.5)}" height="${h}" viewBox="0 0 33 30.5" fill="currentColor" aria-hidden="true" style="flex-shrink: 0; display: block;">${MARK_DOTS}</svg>`;
const logo = (size = 28) => `<div style="display: flex; align-items: center; gap: 9px;">${mark(Math.round(size / 2))}<div style="font-size: 17px; font-weight: 600; letter-spacing: -.02em;">Lucida</div></div>`;

// ---------- Structure A: web sidebar ----------
const NAV_A = [['Today', 'today', 'Main.dc.html', '64'], ['Decks', 'decks', 'WebDecks.dc.html', ''], ['Stats', 'stats', 'WebStats.dc.html', ''], ['Connect AI', 'connect', 'WebConnect.dc.html', '']];
// Profile circle: a color by default (Settings can switch it to the Google photo).
const AVATAR_BG = 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)';
const AVATAR = size => `<span style="width: ${size}px; height: ${size}px; flex-shrink: 0; border-radius: ${size / 2}px; background: ${AVATAR_BG}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size * 0.42)}px; font-weight: 600;">A</span>`;
// The web sidebar's profile circle follows Settings (color and initial).
const AVATAR_ME = size => `<span style="width: ${size}px; height: ${size}px; flex-shrink: 0; border-radius: ${size / 2}px; background: {{me.bg}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size * 0.42)}px; font-weight: 600;">{{me.initial}}</span>`;
const sidebar = active => `<nav style="width: 240px; flex-shrink: 0; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid {{t.line}};">
  <div style="padding: 0 12px 20px;">${logo()}</div>
  ${NAV_A.map(([label, ic, href]) => `<a href="${href}" style="display: flex; align-items: center; gap: 12px; height: 36px; padding: 0 14px; border-radius: 999px; font-size: 14px; ${label === active ? 'background: {{t.surf}}; color: {{t.text}}; font-weight: 600;' : 'color: {{t.muted}};'}">${svg(I[ic])}${label}${label === 'Today' ? `<sc-if value="{{nav.today}}" hint-placeholder-val="{{ true }}"><span style="margin-left: auto; font-family: ${MONO}; font-size: 12px;">{{nav.today}}</span></sc-if>` : ''}</a>`).join('\n  ')}
  <div style="flex-grow: 1;"></div>
  <a href="WebSettings.dc.html" aria-label="Settings" style="display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 14px 0 9px; border-radius: 999px; font-size: 14px; ${active === 'You' ? 'background: {{t.surf}}; color: {{t.text}}; font-weight: 600;' : 'color: {{t.muted}};'}">${AVATAR_ME(28)}You<span style="margin-left: auto; display: flex;">${svg(I.gear, 18)}</span></a>
</nav>`;
const webRoot = inner => `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
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
const DUE_7 = { vals: [32, 18, 24, 12, 30, 8, 16], labels: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'], tops: null, names: ['tomorrow', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'] };
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
        <div style="display: flex; align-items: center; gap: 16px; height: 56px; border-bottom: 1px solid {{t.line}};">
          <a href="{{d.href}}" style="flex-grow: 1; min-width: 0; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</a>
          <span style="flex-shrink: 0; height: 26px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 600; background: {{d.tagBg}}; color: {{d.tagFg}};">{{d.tag}}</span>
          <span style="flex-shrink: 0; width: 40px; text-align: right; font-family: ${MONO}; font-size: 15px; color: {{d.countColor}};">{{d.due}}</span>
          <span style="flex-shrink: 0; width: 84px; display: flex; justify-content: flex-end;">
            <sc-if value="{{d.hasDue}}" hint-placeholder-val="{{ true }}">${pill('Study', { href: '{{d.studyHref}}', h: 32 })}</sc-if>
            <sc-if value="{{d.noDue}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">Up to date</span></sc-if>
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
    return { ...d, ...tag, hasDue: d.due > 0, noDue: d.due === 0, countColor: d.due ? t.text : t.muted };
  });
  return {
    ${MESH_VALS('Iris')}
    t, decks, ...chrome,
    heroMeta: td.date + (td.streak ? ' · ' + td.streak + '-day streak' : ''),
    streakTitle: td.streak ? td.streak + '-day streak' : 'No streak yet', bestLine: 'Best: ' + plural(td.best, 'day'),
    heroTitle: caught ? 'All caught up' : plural(td.due, 'card') + ' due',
    heroSub: caught ? (td.next ? 'Next review ' + td.next.day + ' · ' + plural(td.next.n, 'card') : 'Nothing scheduled yet') : 'About ' + plural(td.minutes, 'minute'),
    heroCta: caught ? (td.fresh ? 'Learn ' + plural(td.fresh, 'new card') : 'Add cards') : 'Study all',
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
const tagMenu = (m, pos) => `<sc-if value="{{${m}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Filter by tag" style="position: absolute; ${pos} z-index: 30; width: 300px; ${popBox}">${tagSearch(m + '.query', m + '.setQuery', 'Find a tag')}<div style="max-height: 304px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column;"><sc-for list="{{${m}.rows}}" as="o" hint-placeholder-count="6">${tagRow('o', { count: true })}</sc-for><sc-if value="{{${m}.none}}" hint-placeholder-val="{{ false }}"><span style="padding: 10px 12px; font-size: 13px; color: {{t.muted}};">No tags match</span></sc-if></div></div></sc-if>`;
const makeRow = (pk, h = 38) => `<sc-if value="{{${pk}.canMake}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{${pk}.make}}" style="height: ${h}px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: ${h > 40 ? 16 : 14}px; font-weight: 600; text-align: left; cursor: pointer;">${svg(I.plus, 13, 2.4)}{{${pk}.makeLabel}}</button></sc-if>`;
// Tags on a deck or card: x removes one. Add tag opens the picker: a menu on web, its own sheet on iPhone.
const TAG_EDIT = (list, pk, phone = false) => `<div style="${phone ? '' : 'position: relative; '}display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{${list}}}" as="g" hint-placeholder-count="2"><button type="button" onClick="{{g.remove}}" aria-label="Remove tag {{g.label}}" style="height: 32px; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">{{g.label}}<span style="display: flex; opacity: .7;">${svg(I.close, 10, 2.4)}</span></button></sc-for><button type="button" onClick="{{${pk}.toggle}}" aria-expanded="{{${pk}.expanded}}" style="height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: 999px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.plus, 12, 2.4)}Add tag</button>${phone
  ? `<sc-if value="{{${pk}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Tags" style="position: absolute; inset: 0; z-index: 30; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 18px; font-weight: 600;">Tags<span style="margin-left: 8px; font-family: ${MONO}; font-size: 13px; font-weight: 500; color: {{t.muted}};">{{${pk}.count}}</span></span><button type="button" onClick="{{${pk}.close}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Done</button></div>${tagSearch(pk + '.query', pk + '.setQuery', 'Find or make a tag', 44)}<div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column;">${makeRow(pk, 48)}<sc-for list="{{${pk}.options}}" as="o" hint-placeholder-count="8">${tagRow('o', { h: 48, line: true })}</sc-for></div></div></sc-if>`
  : `<sc-if value="{{${pk}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Add a tag" style="position: absolute; left: 0; top: calc(100% + 8px); z-index: 30; width: 320px; max-width: 100%; ${popBox}">${tagSearch(pk + '.query', pk + '.setQuery', 'Find or make a tag')}<div style="max-height: 190px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column;">${makeRow(pk)}<sc-for list="{{${pk}.options}}" as="o" hint-placeholder-count="5">${tagRow('o')}</sc-for></div></div></sc-if>`}</div>`;
const viewBtn = (key, handler, label, icon) => `<button type="button" onClick="{{${handler}}}" aria-label="${label}" aria-pressed="{{${key}.pressed}}" style="width: 42px; height: 36px; border: 0; border-radius: 999px; background: {{${key}.bg}}; color: {{${key}.fg}}; box-shadow: {{${key}.sh}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[icon], 16, 2)}</button>`;
// One glass chip per tag on a deck's gradient card.
const glassTag = k => `<sc-if value="{{d.${k}.show}}" hint-placeholder-val="{{ true }}"><span style="height: 26px; padding: 0 11px; display: inline-flex; align-items: center; border-radius: 999px; background: {{d.glass}}; box-shadow: inset 0 0 0 1px {{d.glassLine}}; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: none;">{{d.${k}.label}}</span></sc-if>`;
const tagSlot = k => `<sc-if value="{{d.${k}.show}}" hint-placeholder-val="{{ true }}"><span style="height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 999px; background: {{d.${k}.bg}}; color: {{d.${k}.fg}}; font-size: 12px; font-weight: 600; white-space: nowrap;">{{d.${k}.label}}</span></sc-if>`;
// A deck's +N chip opens a menu with all of its tags; pick one to see every deck that has it.
const deckTagsPop = pos => `<sc-if value="{{d.tagsOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Tags on {{d.name}}" style="position: absolute; ${pos} z-index: 20; width: 320px; box-sizing: border-box; padding: 16px; border-radius: 24px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 12px; text-shadow: none;">
  <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 14px; font-weight: 600;">{{d.tagCount}}</span><button type="button" onClick="{{d.toggleTags}}" aria-label="Close" style="width: 28px; height: 28px; border: 0; border-radius: 14px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.4)}</button></div>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{d.allTags}}" as="g" hint-placeholder-count="6"><button type="button" onClick="{{g.pick}}" style="height: 28px; padding: 0 11px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer;">{{g.label}}</button></sc-for></div>
  <a href="{{d.settingsHref}}" style="align-self: flex-start; font-size: 13px; font-weight: 600; color: {{t.muted}};">Edit tags</a>
</div></sc-if>`;
const moreTag = (bg, h) => `<sc-if value="{{d.more.show}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{d.toggleTags}}" aria-expanded="{{d.expanded}}" aria-label="Show all {{d.tagCount}}" style="height: ${h}px; padding: 0 10px; flex-shrink: 0; display: inline-flex; align-items: center; border: 0; border-radius: 999px; ${bg} font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: none; cursor: pointer;">{{d.more.label}}</button></sc-if>`;
const LIST_COLS = 'display: grid; grid-template-columns: 44px minmax(0, 1.5fr) minmax(0, 1.3fr) 70px 80px 120px 110px; gap: 16px; align-items: center;';
const webDecks = webRoot(`${sidebar('Decks')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 22px; min-width: 0;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; flex-grow: 1;">Decks</h1>
    <label style="display: flex; align-items: center; gap: 10px; width: 320px; height: 36px; padding: 0 16px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};">${svg(I.search, 16)}<span style="position: absolute; left: -9999px;">Search all cards</span><input value="{{query}}" onChange="{{setQuery}}" placeholder="Search all cards" style="flex-grow: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: {{t.text}};"></label>
    ${pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' })}
  </div>
  <div style="display: flex; align-items: center; gap: 16px;">
    <div role="group" aria-label="Filter by tag" style="flex-grow: 1; display: flex; flex-wrap: wrap; gap: 8px;">
      <sc-for list="{{tagFilters}}" as="g" hint-placeholder-count="6"><button type="button" onClick="{{g.pick}}" aria-pressed="{{g.pressed}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;"><span style="width: {{g.dotW}}; height: 8px; margin-right: {{g.dotM}}; border-radius: 4px; background: {{g.dot}};"></span>{{g.label}}<span style="margin-left: 8px; font-family: ${MONO}; font-size: 11px; opacity: .6;">{{g.count}}</span></button></sc-for>
      <sc-if value="{{moreMenu.show}}" hint-placeholder-val="{{ true }}"><div style="position: relative;"><button type="button" onClick="{{moreMenu.toggle}}" aria-expanded="{{moreMenu.expanded}}" style="height: 36px; padding: 0 12px 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;">More${svg(I.chevDown, 14, 2)}</button>${tagMenu('moreMenu', 'left: 0; top: 44px;')}</div></sc-if>
    </div>
    <div role="group" aria-label="View" style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {{t.surf}};">${viewBtn('vCards', 'showCards', 'Card view', 'grid')}${viewBtn('vList', 'showList', 'List view', 'list')}</div>
  </div>
  <sc-if value="{{cardView}}" hint-placeholder-val="{{ true }}">
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="6"><div style="position: relative;">
        ${meshCard('d', 'border-radius: 20px; height: 240px;', 'height: 100%; box-sizing: border-box; padding: 22px; display: flex; flex-direction: column; justify-content: space-between;', `
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">${glassTag('t1')}${glassTag('t2')}${glassTag('t3')}${moreTag('background: {{d.glass}}; box-shadow: inset 0 0 0 1px {{d.glassLine}}; color: inherit;', 26)}</div>
          <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
            <a href="{{d.href}}" style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
              <span style="font-size: 44px; font-weight: 500; letter-spacing: -.035em; line-height: 1;">{{d.due}}<span style="font-size: 15px; letter-spacing: 0; margin-left: 6px; opacity: .85;">due</span></span>
              <span style="font-size: 19px; font-weight: 600; letter-spacing: -.015em; padding-top: 8px;">{{d.name}}</span>
              <span style="font-size: 13px; opacity: .85;">{{d.line}}</span>
            </a>
            <a href="{{d.studyHref}}" style="flex-shrink: 0; height: 36px; padding: 0 18px; display: inline-flex; align-items: center; border-radius: 999px; background: #FFFFFF; color: #000000; font-size: 13px; font-weight: 600; text-shadow: none;">Study</a>
          </div>`, 'div', ' class="sc-lift"')}
        ${deckTagsPop('left: 12px; top: 58px;')}
      </div></sc-for>
    </div>
  </sc-if>
  <sc-if value="{{listView}}" hint-placeholder-val="{{ false }}">
    <div style="display: flex; flex-direction: column;">
      <div style="${LIST_COLS} height: 36px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: {{t.muted}}; border-bottom: 1px solid {{t.line}};"><span></span><span>Deck</span><span>Tags</span><span style="text-align: right;">Due</span><span style="text-align: right;">Cards</span><span style="text-align: right;">Remembered</span><span></span></div>
      <sc-for list="{{decks}}" as="d" hint-placeholder-count="6">
        <div style="${LIST_COLS} height: 64px; border-bottom: 1px solid {{t.line}}; font-size: 14px;">
          <span style="width: 36px; height: 36px; border-radius: 12px; background: {{d.base}};"></span>
          <a href="{{d.href}}" style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{d.name}}</a>
          <span style="position: relative; min-width: 0;"><span style="display: flex; gap: 6px; min-width: 0; overflow: hidden;">${tagSlot('t1')}${tagSlot('t2')}${tagSlot('t3')}${moreTag('background: {{t.surf}}; color: {{t.muted}};', 24)}</span>${deckTagsPop('left: -12px; top: 34px;')}</span>
          <span style="text-align: right; font-family: ${MONO}; font-size: 15px; color: {{d.dueColor}};">{{d.due}}</span>
          <span style="text-align: right; font-family: ${MONO}; font-size: 14px; color: {{t.muted}};">{{d.total}}</span>
          <span style="text-align: right; font-family: ${MONO}; font-size: 14px; font-weight: 600; color: {{d.retColor}};">{{d.ret}}</span>
          <span style="display: flex; justify-content: flex-end;"><sc-if value="{{d.hasDue}}" hint-placeholder-val="{{ true }}">${pill('Study', { href: '{{d.studyHref}}', h: 36 })}</sc-if><sc-if value="{{d.noDue}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">Up to date</span></sc-if></span>
        </div>
      </sc-for>
    </div>
  </sc-if>
</main>`);
const decksLogic = `
constructor(props) { super(props); this.state = { tag: 'All', view: props.view === 'List' ? 'list' : 'cards', openDeck: props.openTags ? 'cell' : null, moreOpen: !!props.moreTags, moreQ: '', q: '' }; }
renderVals() {
  ${T}${DB_JS}
  ${TAG_JS}
  const s = this.state, tag = s.tag, view = s.view;
  const all = db.decks(), q = (s.q || '').trim().toLowerCase(), hits = q ? db.searchDecks(q) : null;
  const seg = on => ({ pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  // Filter row: your five most-used tags. Every other tag is under More.
  const uses = {}; all.forEach(d => d.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
  const byUse = Object.keys(uses).sort((a, b) => uses[b] - uses[a]);
  const top = byUse.slice(0, 5), shownTags = tag === 'All' || top.includes(tag) ? top : [...top, tag];
  const pickTag = g => this.setState({ tag: g, openDeck: null, moreOpen: false, moreQ: '' });
  const mq = (s.moreQ || '').trim().toLowerCase(), found = byUse.filter(g => !mq || g.toLowerCase().includes(mq));
  const decks = all.filter(d => (tag === 'All' || d.tags.includes(tag)) && (!hits || hits.includes(d.id))).map(d => {
    const tg = d.tags, fit = tagFit(tg, 3), open = s.openDeck === d.id;
    const slot = i => (fit.vis[i] ? { show: true, ...tagChip(fit.vis[i]) } : { show: false, label: '', bg: 'transparent', fg: t.text });
    return { ...d, ...this.gen(d.seed + (d.round ? ' #' + d.round : ''), d.style), t1: slot(0), t2: slot(1), t3: slot(2),
      more: { show: fit.more > 0, label: '+' + fit.more }, tagCount: tg.length + (tg.length === 1 ? ' tag' : ' tags'), tagsOpen: open, expanded: open ? 'true' : 'false',
      toggleTags: () => this.setState({ openDeck: open ? null : d.id, moreOpen: false }),
      allTags: tg.map(g => ({ ...tagChip(g), pick: () => pickTag(g) })),
      total: d.totalLabel, ret: d.ret == null ? '—' : d.ret + '%', line: d.totalLabel + ' cards · ' + d.fresh + ' new' + (d.ret == null ? '' : ' · ' + d.ret + '%'),
      hasDue: d.due > 0, noDue: d.due === 0, dueColor: d.due ? t.text : t.muted,
      retColor: d.ret == null ? t.muted : d.ret >= 90 ? t.good : d.ret >= 85 ? t.hard : t.again };
  });
  return {
    t, ...chrome, grain: String(this.props.grain ?? 0.7), decks, query: s.q || '', setQuery: e => this.setState({ q: e && e.target ? e.target.value : '' }),
    tagFilters: ['All', ...shownTags].map(n => { const on = n === tag, isAll = n === 'All'; return { label: isAll ? 'All decks' : n, dot: isAll ? 'transparent' : tagCol(n), dotW: isAll ? '0px' : '8px', dotM: isAll ? '0px' : '8px',
      count: String(isAll ? all.length : uses[n] || 0), pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => pickTag(n) }; }),
    moreMenu: { show: byUse.length > top.length, open: !!s.moreOpen, expanded: s.moreOpen ? 'true' : 'false', query: s.moreQ || '',
      toggle: () => this.setState({ moreOpen: !s.moreOpen, moreQ: '', openDeck: null }), setQuery: e => this.setState({ moreQ: e && e.target ? e.target.value : '' }),
      rows: found.map(g => ({ ...tagChip(g), count: String(uses[g]), on: g === tag, pressed: g === tag ? 'true' : 'false', pick: () => pickTag(g === tag ? 'All' : g) })), none: found.length === 0 },
    cardView: view === 'cards', listView: view === 'list',
    vCards: seg(view === 'cards'), vList: seg(view === 'list'),
    showCards: () => this.setState({ view: 'cards' }), showList: () => this.setState({ view: 'list' })
  };
}`;

// Deck page
const CARD_ROWS = `[
  { front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺)', kind: 'Basic', icon: 'text', next: 'Tomorrow', ai: '', tags: ['Energy', 'Exam 1', 'Mitochondria', 'Must know'] },
  { front: 'The ____ is the powerhouse of the cell.', back: 'mitochondrion', kind: 'Fill in the blank', icon: 'blank', next: 'Due now', ai: 'Claude', tags: ['Organelles', 'Exam 1'] },
  { front: 'Name structure 1 on the diagram.', back: 'Nucleus', kind: 'Image', icon: 'image', next: 'In 3 days', ai: 'Claude', tags: ['Organelles', 'Diagrams'] },
  { front: 'Which organelle packages proteins for secretion?', back: 'Golgi apparatus', kind: 'Basic', icon: 'text', next: 'In 6 days', ai: '', tags: ['Organelles'] },
  { front: 'Say it: ribosome', back: 'RY-buh-sohm', kind: 'Audio', icon: 'audio', next: 'Due now', ai: 'ChatGPT', tags: ['Pronunciation'] },
  { front: 'What is the role of the ribosome?', back: 'Translates mRNA into protein', kind: 'Basic', icon: 'text', next: 'In 12 days', ai: '', tags: ['Proteins', 'Exam 2'] }
]`;
// A card's tag as a small chip; `k` names the row's tag slot (c1, c2).
const cardTag = k => `<sc-if value="{{r.${k}.show}}" hint-placeholder-val="{{ true }}"><span style="height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; background: {{r.${k}.bg}}; color: {{r.${k}.fg}}; font-size: 11px; font-weight: 600; white-space: nowrap;">{{r.${k}.label}}</span></sc-if>`;
// Cards show up to two tags; with more, the first one and a +N (hover it to read the rest).
const cardMore = `<sc-if value="{{r.cMore.show}}" hint-placeholder-val="{{ false }}"><span title="{{r.cMore.title}}" style="height: 22px; padding: 0 8px; flex-shrink: 0; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}}; font-size: 11px; font-weight: 600; white-space: nowrap;">{{r.cMore.label}}</span></sc-if>`;
const CARD_TAGS_JS = `const cardSlot = (tags, i) => (tags && tags[i] ? { show: true, ...tagChip(tags[i]) } : { show: false, label: '', bg: 'transparent', fg: t.text });
  const cardFit = tags => { const fit = tagFit(tags, 2); return { c1: cardSlot(fit.vis, 0), c2: cardSlot(fit.vis, 1), cMore: { show: fit.more > 0, label: '+' + fit.more, title: (tags || []).slice(fit.vis.length).join(', ') } }; };`;
// Deck header: the deck's gradient by default; an uploaded image replaces it (placeholder here).
const onCover = 'background: rgba(255,255,255,.62); color: #000000; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);';
const coverBtn = (label, handler, icon = '') => `<button type="button" onClick="{{${handler}}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; ${onCover} font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon ? svg(I[icon], 14, 2) : ''}${label}</button>`;
const coverRound = (ic, label, href = '', onClick = '') => href
  ? `<a href="${href}" aria-label="${label}" style="width: 44px; height: 44px; border-radius: 22px; ${onCover} display: flex; align-items: center; justify-content: center;">${svg(I[ic], 18, 2)}</a>`
  : `<button type="button" aria-label="${label}"${onClick ? ` onClick="${onClick}"` : ''} style="width: 44px; height: 44px; border: 0; border-radius: 22px; ${onCover} display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[ic], 18, 2)}</button>`;
const coverFill = `<sc-if value="{{coverIsGradient}}" hint-placeholder-val="{{ true }}">${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}</sc-if>
    <sc-if value="{{coverIsImage}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; background: repeating-linear-gradient(135deg, {{t.surf}} 0 14px, {{t.surf2}} 14px 28px); display: flex; align-items: center; justify-content: center; gap: 8px; color: {{t.muted}}; font-size: 14px; font-weight: 500;">${svg(I.image, 18, 1.8)}[Your header image]</div></sc-if>
    <sc-if value="{{coverHasPhoto}}" hint-placeholder-val="{{ false }}"><img src="{{coverPhoto}}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></sc-if>`;
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
    deckLine: plural(dk.total, 'card').replace(String(dk.total), dk.totalLabel) + (dk.aiCount ? ' · ' + dk.aiCount + ' added by your AI' : ''),
    deckLineShort: plural(dk.total, 'card').replace(String(dk.total), dk.totalLabel) + (dk.aiCount ? ' · ' + dk.aiCount + ' from your AI' : ''),
    studyLabel: dk.due ? 'Study ' + plural(dk.due, 'card') : dk.fresh ? 'Learn ' + plural(dk.fresh, 'new card') : 'Nothing due',
    studyHref: dk.studyHref, newCardHref: dk.newCardHref
  };`;
// Deck settings: shared by the web side panel and the iPhone sheet.
const smallBtn = (label, handler, icon = '') => `<button type="button" onClick="{{${handler}}}" style="height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon ? svg(I[icon], 14, 2) : ''}${label}</button>`;
const deckSettingsBody = phone => `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: ${phone ? 18 : 20}px; font-weight: 600; letter-spacing: -.01em;">Deck settings</span>${phone
    ? `<button type="button" onClick="{{closeSettings}}" style="height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Done</button>`
    : `<button type="button" onClick="{{closeSettings}}" aria-label="Close settings" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 14, 2.2)}</button>`}</div>
      <div role="tablist" aria-label="Deck settings sections" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{dsTabs}}" as="m" hint-placeholder-count="2"><button type="button" role="tab" onClick="{{m.pick}}" aria-selected="{{m.pressed}}" style="height: 36px; border: 0; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button></sc-for></div>
      <sc-if value="{{dsGeneral}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Header</span>
          <div style="position: relative; height: ${phone ? 88 : 108}px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">${coverFill}</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">${smallBtn('Shuffle', 'nextCover', 'shuffle')}${smallBtn('Upload image', 'uploadCover', 'image')}<sc-if value="{{coverIsImage}}" hint-placeholder-val="{{ false }}">${smallBtn('Use gradient', 'removeCover')}</sc-if></div>
          <div role="group" aria-label="Gradient style" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};">
            <sc-for list="{{coverStyles}}" as="m" hint-placeholder-count="3"><button type="button" onClick="{{m.pick}}" aria-pressed="{{m.pressed}}" style="height: 34px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};">{{m.label}}</button></sc-for>
          </div>
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

const webDeck = webRoot(`${sidebar('Decks')}
<main style="position: relative; flex-grow: 1; box-sizing: border-box; padding: 24px 48px 20px; display: flex; flex-direction: column; gap: 20px; min-width: 0;">
  <div style="position: relative; height: 184px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">
    ${coverFill}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 20px 24px 24px 28px; display: flex; flex-direction: column; justify-content: space-between; color: {{coverInk}};">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <a href="WebDecks.dc.html" style="height: 36px; padding: 0 14px 0 10px; display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; ${onCover} font-size: 13px; font-weight: 600;">${svg(I.back, 14, 2.2)}Decks</a>
        ${coverBtn('Deck settings', 'openSettings', 'gear')}
      </div>
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;">
        <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0; text-shadow: {{coverShadow}};"><h1 style="margin: 0; font-size: 34px; font-weight: 600; letter-spacing: -.035em; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</h1><div style="font-size: 14px; opacity: .8;">{{deckLine}}</div></div>
        <div style="display: flex; gap: 10px; flex-shrink: 0;">
          <a href="{{newCardHref}}" style="height: 36px; padding: 0 18px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; ${onCover} font-size: 14px; font-weight: 600;">${svg(I.plus, 16, 2)}New card</a>
          <a href="{{studyHref}}" style="height: 36px; padding: 0 22px; display: inline-flex; align-items: center; border-radius: 999px; background: #FFFFFF; color: #000000; box-shadow: 0 1px 2px rgba(0,0,0,.1); font-size: 14px; font-weight: 600;">{{studyLabel}}</a>
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
  <div style="display: flex; flex-direction: column;">
    <sc-for list="{{rows}}" as="r" hint-placeholder-count="6">
      <a href="{{r.href}}" style="display: grid; grid-template-columns: 36px minmax(0, 1.4fr) minmax(0, 1fr) 190px 100px; gap: 16px; align-items: center; height: 64px; border-bottom: 1px solid {{t.line}}; font-size: 14px;">
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
</main>`);
const deckLogic = `
constructor(props) { super(props); this.state = { filter: 'All', tagMenuOpen: false, tagQ: '', q: '' }; }
renderVals() {
  ${T}${DB_JS}${COVER_LOGIC}${FORECAST_JS('{ vals: dk.forecast, labels: [], tops: null, names: [] }', 40)}
  ${CARD_TAGS_JS}
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
    t, rows, ...chrome, ...coverVals, query: this.state.q || '', setQuery: e => this.setState({ q: e && e.target ? e.target.value : '' }),
    filters: labels.map(l => ({ label: l, pressed: l === f ? 'true' : 'false', bg: l === f ? t.inv : t.surf, fg: l === f ? t.invText : t.text, pick: () => this.setState({ filter: l, tagMenuOpen: false }) })),
    tagBtn: { label: tagOn ? f : 'Tags', pressed: tagOn ? 'true' : 'false', bg: tagOn ? t.inv : t.surf, fg: tagOn ? t.invText : t.text, dot: tagOn ? tagCol(f) : 'transparent', dotW: tagOn ? '8px' : '0px' },
    tagMenu: { open: menuOpen, expanded: menuOpen ? 'true' : 'false', query: this.state.tagQ || '',
      toggle: () => this.setState({ tagMenuOpen: !menuOpen, tagQ: '' }), setQuery: e => this.setState({ tagQ: e && e.target ? e.target.value : '' }),
      rows: found.map(g => ({ ...tagChip(g), count: String(uses[g]), on: g === f, pressed: g === f ? 'true' : 'false', pick: () => this.setState({ filter: g === f ? 'All' : g, tagMenuOpen: false, tagQ: '' }) })), none: found.length === 0 },
    spark: forecast
  };
}`;

const CELL = (w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 220 150" fill="none" stroke="{{t.text}}" stroke-width="2"><ellipse cx="104" cy="80" rx="94" ry="62"/><circle cx="116" cy="74" r="24" fill="{{t.surf}}"/><circle cx="120" cy="70" r="7" fill="{{t.text}}"/><ellipse cx="54" cy="96" rx="16" ry="8"/><ellipse cx="74" cy="46" rx="12" ry="6"/><ellipse cx="158" cy="112" rx="14" ry="7"/><path d="M138 60 L186 22"/><circle cx="194" cy="16" r="12" fill="{{t.inv}}" stroke="none"/><text x="194" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="{{t.invText}}" stroke="none" font-family="Geist, sans-serif">1</text></svg>`;
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
// Image occlusion boxes over the diagram (CELL, 250 x 170): box 1 is the one being asked.
const occBox = (x, y, w, h, n, on) => `<span style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; border-radius: 8px; background: ${on ? '{{t.inv}}' : '{{t.surf2}}'}; color: ${on ? '{{t.invText}}' : '{{t.text}}'}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${n}</span>`;
const blankPill = word => `<span style="padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600;">${word}</span>`;
const editorFields = `
<sc-if value="{{isBasic}}" hint-placeholder-val="{{ true }}">${field('Front', 'front', 3, 'The question')}${field('Back', 'back', 2, 'The answer')}</sc-if>
<sc-if value="{{isCloze}}" hint-placeholder-val="{{ false }}">${field('Text', 'text', 3, 'Put [[double brackets]] around the words to hide')}
  <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Cards to make</span>${panelSeg('clozeModes', 'Cards to make')}</div>
  ${field('Extra, shown after', 'note', 1)}</sc-if>
<sc-if value="{{isImage}}" hint-placeholder-val="{{ false }}"><sc-if value="{{img.mock}}" hint-placeholder-val="{{ true }}"><div style="height: 196px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;"><div style="position: relative; width: 250px; height: 170px;">${CELL(250, 170)}${occBox(107, 64, 50, 40, 1, true)}${occBox(41, 97, 40, 25, 2, false)}${occBox(158, 114, 40, 25, 3, false)}</div></div></sc-if>
  <sc-if value="{{img.url}}" hint-placeholder-val="{{ false }}"><div style="height: 196px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; overflow: hidden;"><img src="{{img.url}}" alt="" style="max-width: 100%; max-height: 100%; object-fit: contain;"></div></sc-if>
  <sc-if value="{{img.none}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{pickImage}}" style="height: 196px; border: 1.5px dashed {{t.muted}}; border-radius: 20px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">${svg(I.image, 22, 1.8)}Add an image</button></sc-if>
  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">${smallBtn('Replace image', 'pickImage', 'image')}<sc-if value="{{img.mock}}" hint-placeholder-val="{{ true }}">${smallBtn('Add a box', 'noop', 'plus')}<span style="flex-grow: 1;"></span>${panelSeg('occModes', 'What to hide')}</sc-if></div>
  ${field('Prompt', 'front', 1, 'What should they name?')}${field('Answer', 'back', 1)}</sc-if>
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
  <dc-import name="WebDeck" dark="{{dark}}" deck-id="{{deckId}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <aside style="position: absolute; top: 12px; right: 12px; bottom: 12px; width: 520px; box-sizing: border-box; padding: 28px; border-radius: 20px; background: {{t.bg}}; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 24px 64px rgba(0,0,0,.24);">
    <div style="display: flex; align-items: center; justify-content: space-between;"><div style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">{{title}}</div><a href="{{backHref}}" aria-label="Close" style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    ${TYPE_SEG}
    ${WEB_FMT}
    ${editorFields}
    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">${chip(svg(I.decks, 12, 2) + '{{deckName}}', 'height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600;')}${TAG_EDIT('cardTags', 'cardPick')}</div>
    <div style="flex-grow: 1;"></div>
    <div style="display: flex; gap: 10px;"><sc-if value="{{canDelete}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{remove}}" style="height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.againTint}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Delete</button></sc-if><a href="{{backHref}}" style="flex-grow: 1; height: 40px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">Cancel</a><a href="{{backHref}}" onClick="{{save}}" data-key="mod+enter" style="flex-grow: 2; height: 40px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">Save card <span style="font-family: ${MONO}; font-size: 12px; opacity: .6; margin-left: 8px;">⌘↵</span></a></div>
    ${SLASH_MENU(420)}
  </aside>
</div>`;
const EDITOR_LOGIC = `
constructor(props) {
  super(props);
  this.state = { typing: !!props.keyboard, focus: 'front', styles: !!props.textStyles, occ: 'one' };
  // The card as you write it: its fields, its type, where the caret is, and what Undo steps back to.
  // It lives outside state so fast typing never builds on an old copy.
  this.ed = { edits: {}, type: null, sel: null, pend: null, past: [], future: [], last: '', lastAt: 0, key: 0, restore: false, sig: '' };
  this.els = {};
  this.refFns = {};
}
componentDidMount() { this.placeCaret(); this.placeSlash(); }
componentDidUpdate() { this.placeCaret(); this.placeSlash(); }
componentWillUnmount() { if (this.onSel) document.removeEventListener('selectionchange', this.onSel); }
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
  else if (this.props.keyboard === undefined && this.state.typing) this.setState({ typing: false });
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
  const missing = kind === 'basic' ? (!fr ? 'front' : !bk ? 'back' : '') : kind === 'cloze' ? (nBlanks ? '' : 'text') : kind === 'image' ? (!f.image ? 'image' : !bk ? 'back' : '') : (!hasSound ? 'speak' : !bk ? 'back' : '');
  const backHref = this.props.from === 'review' ? db.href('review', dk.id) : dk.href;
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
    t, kb, dark: !!this.props.dark, typing: s.typing, deckId: this.props.deckId || '',
    title: saved ? 'Edit card' : 'New card', deckName: dk.name, backHref, f, rich, slash,
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
    // Image cards: hide one part, or all of them.
    occModes: pick2([['one', 'Hide one'], ['all', 'Hide all']], s.occ, id => this.setState({ occ: id })),
    img: { mock: f.image === 'mock', url: f.image && f.image !== 'mock' ? f.image : '', none: !f.image },
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
      db.act.saveCard(saved ? saved.id : null, dk.id, { kind, front: f.front, back: f.back, text: f.text, note: f.note, tags, image: f.image || null, audio: f.audio || null, speak: f.speak || '', auto: f.auto !== false, clozeMode: f.clozeMode || 'each' }, backHref);
    }
  };
}`;

// ---------- Review (shared by web + phone) ----------
const WAVE = (h) => `<div style="display: flex; align-items: center; gap: 3px; height: ${h}px;"><sc-for list="{{bars}}" as="b" hint-placeholder-count="44"><div data-anim="1" style="width: 3px; border-radius: 2px; background: {{t.text}}; height: {{b.h}}; animation: {{b.anim}};"></div></sc-for></div>`;
const faceFront = big => `
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
  const cardView = (c, rev) => {
    const show = md => R.view(md || '', ro);
    const text = c.text != null ? c.text : (c.before || '') + ' [[' + (c.back || '') + ']] ' + (c.after || '');
    return { ...c, isBasic: c.kind === 'basic', isCloze: c.kind === 'cloze', isImage: c.kind === 'image', isAudio: c.kind === 'audio',
      lines: c.kind === 'cloze' ? R.view(text, { ...ro, cloze: true, ask: c.cloze == null ? -1 : c.cloze, hide: !rev }) : [],
      frontLines: show(c.front), backLines: show(c.back), noteLines: show(c.note),
      imageMock: c.image === 'mock', imageUrl: c.image && c.image !== 'mock' ? c.image : '',
      labelLines: show(c.backLabel || c.back), bigLines: show(c.backBig || c.back), subLines: show(c.backSub != null ? c.backSub : c.note) };
  };`;
const BLANK_JS = `rev ? { text: c.back, bg: t.inv, fg: t.invText, cls: 'sc-pop' } : { text: '\\u2003\\u2003\\u2003\\u2003', bg: t.surf2, fg: 'transparent', cls: '' }`;
const REVIEW_LOGIC = total => `
constructor(props) { super(props); this.state = { revealed: !!props.startRevealed, settings: null, pileDraft: props.newPileOpen ? 'Tricky ones' : null }; }
renderVals() {
  ${T}${DB_JS}
  ${KB_JS}
  ${CARD_VIEW_JS}
  const rv = db.review(this.props.deckId, this.props.pile);
  const rev = this.state.revealed;
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
    t, kb, card, grades, piles, modes, progs,
    showBar: prog === 'bar', showCounts: prog === 'counts',
    cNew: { n: String(n.new), u: u('new') }, cLearn: { n: String(n.learn), u: u('learn') }, cRev: { n: String(n.rev), u: u('rev') },
    countsLabel: n.new + ' new, ' + n.learn + ' learning, ' + n.rev + ' to review',
    progHint: { bar: 'A thin bar and how many cards are left.', counts: 'New · learning · review, like Anki. The current card’s queue is underlined.', none: 'Nothing on screen but the card.' }[prog],
    settingsOpen, settingsExpanded: settingsOpen ? 'true' : 'false',
    settingsBtnBg: settingsOpen ? t.inv : t.surf, settingsBtnFg: settingsOpen ? t.invText : t.text,
    toggleSettings: () => this.setState({ settings: !settingsOpen }),
    knew: { label: 'Knew it', title: fsrsOn ? 'Knew it · ' + iv.good : 'Knew it', pick: grade(3) }, missed: { label: 'Didn’t know', title: fsrsOn ? 'Didn’t know · ' + iv.again : 'Didn’t know', pick: grade(1) },
    canAddPile: pileList.length < 5,
    newPileOpen: draft != null, pileName: draft || '',
    openPile: () => this.setState({ pileDraft: '' }),
    setPileName: e => this.setState({ pileDraft: e && e.target ? e.target.value : draft }),
    cancelPile: () => this.setState({ pileDraft: null }),
    savePile: () => { this.setState({ pileDraft: null }); db.act.addPile(rv.deckId, (draft || '').trim() || 'Pile ' + (pileList.length + 1)); },
    left: String(leftN), position: String(done),
    progress: Math.round(done / tot * 100) + '%',
    radius: r + 'px',
    revealed: rev,
    showFour: rev && mode === 'four', showBinary: rev && mode === 'binary', showPiles: rev && mode === 'piles',
    // Fill-in-the-blank cards stay put: the blank fills in with a pop instead of the card flipping.
    flipTransform: rev && !card.isCloze ? 'rotateY(180deg)' : 'rotateY(0deg)',
    // After a grade the next card shows up fresh with a small lift, instead of spinning back to its front.
    flipTrans: this.state.moved ? 'none' : 'transform .5s cubic-bezier(.4,0,.2,1)', cardIn: this.state.moved ? (done % 2 ? 'sc-in-a' : 'sc-in-b') : '',
    flipLabel: card.isCloze ? (rev ? 'Hide the answer' : 'Show the blank') : (rev ? 'Flip back' : 'Flip card'),
    clozeShown: rev && card.isCloze,
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
  <div style="display: flex; flex-direction: column; justify-content: center; flex-grow: 1;">${back ? faceBack(big) : faceFront(big)}</div>
  <div style="font-size: 14px; line-height: 1.5; color: {{t.muted}}; min-height: 21px;">${back ? RICH_SHOW('card.noteLines') : `<sc-if value="{{clozeShown}}" hint-placeholder-val="{{ false }}"><span class="sc-fade-a" style="display: block;">${RICH_SHOW('card.noteLines')}</span></sc-if>`}</div>
</div>`;
const flipCard = (w, h, pad, big) => `<button type="button" onClick="{{reveal}}" aria-label="{{flipLabel}}" data-key="Space" class="{{cardIn}}" style="width: ${w}; height: ${h}; padding: 0; border: 0; background: transparent; perspective: 1600px; font: inherit; color: inherit; cursor: pointer; flex-grow: ${h === 'auto' ? 1 : 0};">
  <div style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: {{flipTrans}}; transform: {{flipTransform}};">
    ${FACE(pad, big, false)}
    ${FACE(pad, big, true)}
  </div>
</button>`;
const webReview = `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <header style="height: 76px; box-sizing: border-box; padding: 0 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px;">
    <div style="display: flex;"><a href="WebDone.dc.html" aria-label="End review" title="End review" style="width: 36px; height: 36px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2.2)}</a></div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; min-width: 420px; min-height: 24px;">
      <sc-if value="{{showBar}}" hint-placeholder-val="{{ true }}"><div style="width: 360px; height: 6px; border-radius: 3px; background: {{t.surf}}; overflow: hidden;"><div style="height: 6px; border-radius: 3px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);"></div></div><span style="font-family: ${MONO}; font-size: 13px; color: {{t.muted}};">{{left}} left</span></sc-if>
      <sc-if value="{{showCounts}}" hint-placeholder-val="{{ false }}">${COUNTS(false)}</sc-if>
    </div>
    <div style="display: flex; justify-content: flex-end;">${settingsBtn}</div>
  </header>
  <main style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px;">
    ${flipCard('780px', '480px', '44px 56px', true)}
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
  const scale = this.props.dark ? ['#0B0B0F', '#1E2452', '#2F3D9A', '#4C5FDB', '#8C9AFC'] : ['#FFFFFF', '#DCE0FD', '#B0BAFB', '#7F8DF6', '#4F60E6'];
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
const PROVIDERS_JS = PROVIDERS("{ claude: true, openai: true, cursor: false, mcp: false }");

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
const REVIEW_CSS = cardTypesCss;
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
const NAV_P = [['Today', 'today', 'PhoneToday.dc.html'], ['Decks', 'decks', 'PhoneDeck.dc.html'], ['Stats', 'stats', 'PhoneStats.dc.html'], ['Connect', 'connect', 'PhoneConnect.dc.html']];
const tabBar = active => `<nav style="position: absolute; left: 16px; right: 16px; bottom: 28px; height: 64px; box-sizing: border-box; padding: 6px; border-radius: 999px; background: {{t.surf}}; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px;">
  ${NAV_P.map(([l, ic, h]) => `<a href="${h}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 999px; font-size: 11px; font-weight: 600; ${l === active ? 'background: {{t.inv}}; color: {{t.invText}};' : 'color: {{t.muted}};'}">${svg(I[ic], 20, 2)}${l}</a>`).join('\n  ')}
</nav>`;
const phone = (inner, active, extra = '') => `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${inner}
${active ? tabBar(active) : ''}
${extra}
</div>`;
const pTitle = (txt, right = '') => `<div style="display: flex; align-items: center; justify-content: space-between;"><div style="font-size: 34px; font-weight: 700; letter-spacing: -.03em;">${txt}</div>${right}</div>`;
const roundBtn = (ic, label, href = '') => href ? `<a href="${href}" aria-label="${label}" style="width: 44px; height: 44px; border-radius: 22px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I[ic], 18, 2)}</a>` : `<button type="button" aria-label="${label}" style="width: 44px; height: 44px; border: 0; border-radius: 22px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I[ic], 18, 2)}</button>`;
const phoneToday = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 18px;">
  ${pTitle('Today', `<div style="display: flex; gap: 8px;">${roundBtn('gear', 'Settings', 'PhoneSettings.dc.html')}${roundBtn('plus', 'New card', 'PhoneEditor.dc.html')}</div>`)}
  ${meshCard('hero', 'display: block; border-radius: 32px;', 'box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; gap: 18px;', `
    <span style="height: 56px;"></span>
    <span style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 14px; opacity: .85;">{{heroMeta}}</span><span style="font-size: {{heroSize}}; font-weight: 600; letter-spacing: -.045em; line-height: 1;">{{heroTitle}}</span><span style="font-size: 14px; opacity: .85;">{{heroSub}}</span></span>
    <span style="height: 52px; border-radius: 999px; background: #FFFFFF; color: #000000; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; text-shadow: none;">{{heroCta}}</span>`, 'a', ' href="PhoneReview.dc.html"')}
  <div style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}}; padding: 6px 4px 0;">Decks</div>
  <div style="display: flex; flex-direction: column;">
    <sc-for list="{{decks}}" as="d" hint-placeholder-count="4">
      <a href="PhoneDeck.dc.html" style="display: flex; align-items: center; gap: 12px; min-height: 58px; border-bottom: 1px solid {{t.line}};"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 500;">{{d.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{d.fresh}} new · {{d.total}} cards</span></span><span style="font-family: {{d.rightFont}}; font-size: {{d.rightSize}}; color: {{d.rightColor}};">{{d.right}}</span></a>
    </sc-for>
  </div>
</div>`, 'Today');
const phoneDecksLogic = `renderVals() { ${T}
  const caught = !!this.props.caughtUp, next = ['Tomorrow', 'Tomorrow', 'In 2 days', 'In 3 days'];
  return { ${MESH_VALS('Iris')} t,
    heroMeta: caught ? 'Done for today · 13-day streak' : 'Due now · 12-day streak', heroTitle: caught ? 'All caught up' : '64 cards', heroSize: caught ? '42px' : '56px',
    heroSub: caught ? 'Next review tomorrow · 32 cards' : 'About 11 minutes', heroCta: caught ? 'Learn 10 new cards' : 'Start review',
    decks: ${DECKS}.slice(0, 4).map((d, i) => ({ ...d, right: caught ? next[i] : String(d.due), rightColor: caught ? t.muted : t.text, rightFont: caught ? 'inherit' : "${MONO}", rightSize: caught ? '14px' : '15px' })) }; }`;

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

const phoneDeck = phone(`<div style="padding: 0 0 120px; display: flex; flex-direction: column; gap: 16px;">
  <div style="position: relative; height: 232px; overflow: hidden;">
    ${coverFill}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 54px 16px 18px 20px; display: flex; flex-direction: column; justify-content: space-between; color: {{coverInk}};">
      <div style="display: flex; justify-content: space-between;">${coverRound('back', 'Back', 'PhoneToday.dc.html')}<div style="display: flex; gap: 8px;">${coverRound('gear', 'Deck settings', '', '{{openSettings}}')}${coverRound('search', 'Search')}${coverRound('plus', 'New card', 'PhoneEditor.dc.html')}</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; text-shadow: {{coverShadow}};"><div style="font-size: 32px; font-weight: 700; letter-spacing: -.03em; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</div><div style="font-size: 14px; opacity: .8;">{{deckLineShort}}</div></div>
    </div>
  </div>
  <div style="padding: 0 20px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
      <sc-for list="{{tiles}}" as="k" hint-placeholder-count="3">${deckTile(false)}</sc-for>
    </div>
    <a href="PhoneReview.dc.html" style="height: 56px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600;">{{studyLabel}}</a>
    <div style="display: flex; flex-direction: column;">
      <sc-for list="{{rows}}" as="r" hint-placeholder-count="4">
        <a href="PhoneEditor.dc.html" style="display: flex; flex-direction: column; gap: 3px; padding: 12px 0; border-bottom: 1px solid {{t.line}};"><span style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.front}}</span><span style="display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; color: {{t.muted}};"><span style="white-space: nowrap;">{{r.kind}} · {{r.next}}</span>${cardTag('c1')}${cardTag('c2')}${cardMore}</span></a>
      </sc-for>
    </div>
  </div>
</div>`, 'Decks', `<sc-if value="{{settingsOpen}}" hint-placeholder-val="{{ false }}">
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Deck settings" style="position: absolute; left: 0; right: 0; bottom: 0; top: 56px; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 14px;">
    ${deckSettingsBody(true)}
  </div>
</sc-if>`);
const phoneDeckLogic = `
constructor(props) { super(props); this.state = {}; }
renderVals() { ${T}${DB_JS}${COVER_LOGIC}
  ${CARD_TAGS_JS}
  return { t, dark: !!this.props.dark, ...coverVals, tiles: coverVals.tiles.map(k => k.label === 'Due now' ? { ...k, label: 'Due' } : k),
    rows: db.cards(dk.id).slice(0, 4).map(r => ({ ...r, ...cardFit(r.tags) })) }; }`;

const phoneEditor = `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneDeck" dark="{{dark}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 56px; box-sizing: border-box; padding: 10px 20px 34px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;">
    <div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>
    <div style="display: flex; align-items: center; justify-content: space-between;"><a href="PhoneDeck.dc.html" style="font-size: 16px; color: {{t.muted}}; min-height: 44px; display: flex; align-items: center;">Cancel</a><span style="font-size: 17px; font-weight: 600;">{{title}}</span><a href="PhoneDeck.dc.html" style="font-size: 16px; font-weight: 600; min-height: 44px; display: flex; align-items: center;">Save</a></div>
    ${TYPE_SEG}
    ${editorFields}
    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">${chip(svg(I.decks, 12, 2) + '{{deckName}}', 'height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600;')}${TAG_EDIT('cardTags', 'cardPick', true)}</div>
  </div>
  <sc-if value="{{typing}}" hint-placeholder-val="{{ true }}">${KEYBOARD(FMT_BAR)}</sc-if>
</div>`;

const phoneReview = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <div style="display: flex; align-items: center; gap: 12px;">
    ${roundBtn('close', 'End review', 'PhoneDone.dc.html')}
    <div style="flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <sc-if value="{{showBar}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; height: 6px; border-radius: 3px; background: {{t.surf}}; overflow: hidden;"><div style="height: 6px; border-radius: 3px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);"></div></div><span style="font-family: ${MONO}; font-size: 13px; color: {{t.muted}};">{{left}}</span></sc-if>
      <sc-if value="{{showCounts}}" hint-placeholder-val="{{ false }}">${COUNTS(true)}</sc-if>
    </div>
    ${settingsBtn}
  </div>
  ${flipCard('100%', 'auto', '26px 22px', false)}
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
    ${KEYBOARD()}
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
const phoneStatsLogic = `renderVals() { ${T}${HEAT_LOGIC(17)}${FORECAST_JS(DUE_7, 60)}
  return { t, heat, legend, forecast, dueTotal, busy, kpis: [{ label: 'Streak', value: '12 days' }, { label: 'Remembered', value: '90%' }, { label: 'Reviews', value: '1,284' }, { label: 'Cards', value: '2,470' }] }; }`;

const phoneConnect = phone(`<div style="padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 16px;">
  ${pTitle('Connect AI')}
  <div style="font-size: 15px; line-height: 1.45; color: {{t.muted}};">Make cards from any chat: text, fill-in-the-blank, images, and audio.</div>
  ${meshCard('hero', 'border-radius: 32px;', 'box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; gap: 12px;', `
    <span style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .8;">Your MCP link</span>
    <span style="font-family: ${MONO}; font-size: 14px; padding: 14px 16px; border-radius: 999px; ${glass}">https://app.lucida.cards/mcp/lk_5b1f0c6e…</span>
    <button type="button" onClick="{{copy}}" style="height: 48px; border: 0; border-radius: 999px; background: #FFFFFF; color: #000000; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">{{copyLabel}}</button>`)}
  <div style="display: flex; flex-direction: column;">
    <sc-for list="{{providers}}" as="p" hint-placeholder-count="4">
      <div style="display: flex; align-items: center; gap: 12px; min-height: 60px; border-bottom: 1px solid {{t.line}};"><span style="width: 38px; height: 38px; border-radius: 19px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${PROVIDER_LOGO(20)}</span><span style="flex-grow: 1; font-size: 16px; font-weight: 500;">{{p.name}}</span><span style="font-size: 13px; font-weight: 600; color: {{p.color}};">{{p.status}}</span></div>
    </sc-for>
  </div>
</div>`, 'Connect');
const phoneConnectLogic = `
constructor(props) { super(props); this.state = { copied: false }; }
renderVals() { ${T}
  ${PROVIDERS_JS}
  return { ${MESH_VALS('Apricot')} t, providers, copyLabel: this.state.copied ? 'Copied' : 'Copy link', copy: () => this.setState({ copied: true }) }; }`;

// iPhone Settings, from the gear on Today. Appearance switches this screen right away.
const sRow = (label, right, { href = '', sub = '', click = '' } = {}) => {
  const inner = `<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px;">${label}</span>${sub ? `<span style="font-size: 12px; color: {{t.muted}};">${sub}</span>` : ''}</span>${right}`;
  const st = 'min-height: 52px; box-sizing: border-box; padding: 8px 16px; display: flex; align-items: center; gap: 12px;';
  return href ? `<a href="${href}" style="${st}">${inner}</a>` : click ? `<button type="button" onClick="{{${click}}}" style="${st} width: 100%; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer;">${inner}</button>` : `<div style="${st}">${inner}</div>`;
};
const sVal = v => `<span style="display: flex; align-items: center; gap: 6px; font-size: 15px; color: {{t.muted}}; white-space: nowrap;">${v}${svg(I.chev, 14, 2.2)}</span>`;
const sGroup = (title, rows) => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="padding: 0 4px; font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">${title}</span><div style="border-radius: 24px; background: {{t.surf}}; overflow: hidden;">${rows.join('<div style="height: 1px; margin-left: 16px; background: {{t.bg}};"></div>')}</div></div>`;
const phoneSettings = phone(`<div style="padding: 64px 20px 34px; display: flex; flex-direction: column; gap: 18px;">
  <div style="display: flex; align-items: center; gap: 12px;">${roundBtn('back', 'Back', 'PhoneToday.dc.html')}<div style="flex-grow: 1; font-size: 17px; font-weight: 600; text-align: center;">Settings</div><div style="width: 44px;"></div></div>
  <div style="border-radius: 24px; background: {{t.surf}}; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">${AVATAR(44)}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 600;">Your account</span><span style="font-size: 13px; color: {{t.muted}};">Synced on all your devices · just now</span></span><span style="display: flex; color: {{t.muted}};">${svg(I.chev, 14, 2.2)}</span></div>
  ${sGroup('Studying', [
    sRow('Daily reminder', sVal('9:00 AM')),
    sRow('New cards a day', sVal('20')),
    sRow('Remember goal', sVal('90%')),
    sRow('Schedule with FSRS', SWITCH('fsrsSw', 'toggleFsrs', 'Schedule with FSRS'), { sub: 'For 4 grades and ✓ / ✗' })
  ])}
  ${sGroup('Look', [sRow('Appearance', SEG('looks', 'Appearance')), sRow('Card gradients', SEG('grads', 'Card gradients'))])}
  ${sGroup('Your AI', [
    sRow('Connected apps', sVal('Claude, ChatGPT'), { href: 'PhoneConnect.dc.html' }),
    sRow('Check AI cards first', SWITCH('checkSw', 'toggleCheck', 'Check AI cards first')),
    sRow('Cards to check', sVal('3'), { href: 'PhoneInbox.dc.html' })
  ])}
</div>`, '');
const phoneSettingsLogic = `
constructor(props) { super(props); this.state = { look: 'system', grads: 'mix', fsrs: true, check: true }; }
renderVals() {
  const s = this.state;
  // System follows the board's dark setting; Light and Dark switch this screen right away.
  const t = this.theme(s.look === 'dark' || (s.look === 'system' && !!this.props.dark));
  ${SW_JS}
  ${OPTS_JS}
  return {
    t,
    looks: opts([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], s.look, id => this.setState({ look: id })),
    grads: opts([['mix', 'Mix'], ['vivid', 'Vivid'], ['deep', 'Deep']], s.grads, id => this.setState({ grads: id })),
    fsrsSw: sw(s.fsrs), toggleFsrs: () => this.setState({ fsrs: !s.fsrs }),
    checkSw: sw(s.check), toggleCheck: () => this.setState({ check: !s.check })
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
    </div>
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${sGroup('Look', [
        sRow('Appearance', SEG('looks', 'Appearance')),
        `<div style="padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; align-items: center; gap: 12px;"><span style="flex-grow: 1; font-size: 16px;">Card gradients</span>${SEG('grads', 'Card gradients')}</div><div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;"><sc-for list="{{gradPreview}}" as="k" hint-placeholder-count="4">${meshCard('k', 'height: 60px; border-radius: 14px;', 'height: 100%; box-sizing: border-box; padding: 8px 10px; display: flex; align-items: flex-end; font-size: 11px; font-weight: 600;', '{{k.name}}')}</sc-for></div></div>`
      ])}
      ${sGroup('Your AI', [
        sRow('Connected apps', sVal('{{connected}}'), { href: 'WebConnect.dc.html' }),
        sRow('Check AI cards first', SWITCH('checkSw', 'toggleCheck', 'Check AI cards first'), { sub: 'They wait in their deck until you keep them' })
      ])}
      ${sGroup('Your data', [
        sRow('Import cards', sVal('Anki, Quizlet, or CSV'), { href: 'WebImport.dc.html' }),
        sRow('Export all cards', sVal(''), { click: 'exportAll' }),
        sRow('<span style="color: {{t.again}};">Delete account</span>', '', { click: 'deleteAccount' })
      ])}
    </div>
  </div>
</main>`);
const webSettingsLogic = `
renderVals() {
  const db = this.props.db || this.mock(), chrome = db.chrome(), st = db.settings();
  // Appearance: on the canvas System follows the board's dark setting; in the app the whole app switches.
  const look = st.look;
  const t = this.theme(db.mock ? look === 'dark' || (look === 'system' && !!this.props.dark) : !!this.props.dark);
  ${SW_JS}
  ${OPTS_JS}
  const set = patch => db.act.setSettings(patch);
  ${NUM_JS}
  const colors = [['Periwinkle', 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)'], ['Orange', 'linear-gradient(135deg, #FFC857 0%, #EE5A36 100%)'], ['Green', 'linear-gradient(135deg, #7EE0B0 0%, #1F8F5F 100%)'], ['Pink', 'linear-gradient(135deg, #F9A8D4 0%, #D6336C 100%)'], ['Teal', 'linear-gradient(135deg, #7DE3F0 0%, #0E8A9E 100%)'], ['Violet', 'linear-gradient(135deg, #C4A7FF 0%, #7C3AED 100%)']];
  const piles = st.grading === 'piles', photo = st.google ? st.photo : 'color';
  return {
    t, ...chrome, grain: String(this.props.grain ?? 0.7),
    name: st.name, sub: st.sub, signedIn: st.signedIn, google: st.google, initial: chrome.me.initial,
    avatarBg: colors[st.color][1], photoColor: photo === 'color', photoGoogle: photo === 'google',
    photoOpts: opts([['google', 'Google photo'], ['color', 'Color']], photo, id => set({ photo: id })),
    swatches: colors.map(([label, bg], i) => ({ label, bg, pressed: i === st.color ? 'true' : 'false', ring: i === st.color ? '0 0 0 2px ' + t.surf + ', 0 0 0 4px ' + t.text : 'none', pick: () => set({ color: i }) })),
    looks: opts([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], look, id => set({ look: id })),
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
const phoneActions = btns => `<div style="align-self: stretch; width: 100%; display: flex; flex-direction: column; gap: 10px; padding-top: 2px;">${btns}</div>`;
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
const webDecksEmpty = webRoot(`${sidebar('Decks')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 36px 48px; display: flex; flex-direction: column; gap: 28px; min-width: 0;">
  <div style="display: flex; align-items: center; gap: 12px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em; flex-grow: 1;">Decks</h1>${pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' })}</div>
  <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; padding-bottom: 60px;">
    ${emptyBlock({ art: EMPTY_ART(170, 'plus'), title: 'No decks yet', body: 'Make one, bring your cards from Anki or Quizlet, or let your AI make them for you.', actions: webActions(pill('New deck', { inv: true, icon: 'plus', href: 'WebNewDeck.dc.html' }) + pill('Import cards', { icon: 'upload', href: 'WebImport.dc.html' }) + pill('Connect your AI', { icon: 'connect', href: 'WebConnect.dc.html' })) })}
  </div>
</main>`);
const webDeckEmpty = webRoot(`${sidebar('Decks')}
<main style="flex-grow: 1; box-sizing: border-box; padding: 24px 48px 20px; display: flex; flex-direction: column; gap: 20px; min-width: 0;">
  <div style="position: relative; height: 184px; flex-shrink: 0; border-radius: 20px; overflow: hidden;">
    ${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 20px 24px 24px 28px; display: flex; flex-direction: column; justify-content: space-between; color: {{cover.ink}};">
      <div style="display: flex; align-items: center; justify-content: space-between;"><a href="WebDecks.dc.html" style="height: 36px; padding: 0 14px 0 10px; display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; ${onCover} font-size: 13px; font-weight: 600;">${svg(I.back, 14, 2.2)}Decks</a>${coverBtn('Deck settings', 'openSettings', 'gear')}</div>
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
  ${pTitle('Today', `<div style="display: flex; gap: 8px;">${roundBtn('gear', 'Settings', 'PhoneSettings.dc.html')}${roundBtn('plus', 'New deck', 'PhoneNewDeck.dc.html')}</div>`)}
  ${meshCard('hero', 'display: block; border-radius: 32px;', 'box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; gap: 18px;', `
    <span style="height: 40px;"></span>
    <span style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 44px; font-weight: 600; letter-spacing: -.04em; line-height: 1;">Welcome</span><span style="font-size: 15px; opacity: .85;">Nothing to study yet. Start with a deck.</span></span>
    <a href="PhoneNewDeck.dc.html" style="height: 52px; border-radius: 999px; background: #FFFFFF; color: #000000; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; text-shadow: none;">Make a deck</a>`)}
  <div style="border-radius: 24px; background: {{t.surf}}; overflow: hidden;">
    ${[['upload', 'Import cards', 'From Anki, Quizlet, or a CSV file', 'PhoneTodayNew.dc.html'], ['connect', 'Connect your AI', 'Let Claude or ChatGPT make cards', 'PhoneConnect.dc.html']].map(([ic, title, sub, href]) => `<a href="${href}" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px;"><span style="width: 38px; height: 38px; flex-shrink: 0; border-radius: 19px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(I[ic], 18, 2)}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 600;">${title}</span><span style="font-size: 13px; color: {{t.muted}};">${sub}</span></span><span style="display: flex; color: {{t.muted}};">${svg(I.chev, 14, 2.2)}</span></a>`).join('<div style="height: 1px; margin-left: 68px; background: {{t.bg}};"></div>')}
  </div>
</div>`, 'Today');
const phoneDeckEmpty = phone(`<div style="height: 100%; box-sizing: border-box; padding: 0 0 120px; display: flex; flex-direction: column;">
  <div style="position: relative; height: 232px; flex-shrink: 0; overflow: hidden;">
    ${meshCard('cover', 'position: absolute; inset: 0;', 'height: 100%;', '')}
    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 54px 16px 18px 20px; display: flex; flex-direction: column; justify-content: space-between; color: {{cover.ink}};">
      <div style="display: flex; justify-content: space-between;">${coverRound('back', 'Back', 'PhoneToday.dc.html')}<div style="display: flex; gap: 8px;">${coverRound('gear', 'Deck settings')}${coverRound('plus', 'New card', 'PhoneEditor.dc.html')}</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; text-shadow: {{cover.shadow}};"><div style="font-size: 32px; font-weight: 700; letter-spacing: -.03em; line-height: 1.05;">Pharmacology</div><div style="font-size: 14px; opacity: .8;">No cards yet</div></div>
    </div>
  </div>
  <div style="flex-grow: 1; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(130, 'plus'), title: 'This deck is empty', size: 22, body: 'Add your first card, or ask your AI to make some.', actions: phoneActions(phoneBtn('New card', 'PhoneEditor.dc.html', 'plus', true) + phoneBtn('Import cards', 'PhoneDeckEmpty.dc.html', 'upload') + phoneBtn('Ask your AI', 'PhoneConnect.dc.html', 'sparkle')) })}
  </div>
</div>`, 'Decks');
const phoneStatsEmpty = phone(`<div style="height: 100%; box-sizing: border-box; padding: 64px 20px 120px; display: flex; flex-direction: column; gap: 14px;">
  ${pTitle('Stats')}
  ${emptyKpis([['Streak', '0 days'], ['Remembered', '—'], ['Reviews', '0'], ['Cards', '0']], false)}
  <div style="flex-grow: 1; box-sizing: border-box; padding: 20px; border-radius: 28px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">
    ${emptyBlock({ art: EMPTY_ART(120, 'stats'), title: 'No stats yet', size: 22, body: 'Your streak, study days, and how much you remember show up after your first review.' })}
  </div>
</div>`, 'Stats');
const emptyLogic = (cover = '') => `renderVals() { ${T}${DB_JS}
  // On the canvas these boards show a brand-new account, so the Today count stays hidden (except on the empty deck).
  const dk = db.mock ? { name: '${cover}', seed: '${cover}', cover: { style: null, round: 0, image: null } } : (db.deck(this.props.deckId) || { name: '', seed: '', cover: {} });
  return { ${MESH_VALS('Iris')} t, ...chrome, nav: db.mock ? { today: ${cover ? "'64'" : "''"} } : chrome.nav, art: this.mesh('Iris'), art2: this.mesh('Mint'), art3: this.mesh('Apricot'), noop: () => {},
    date: db.today().date, deckName: dk.name, cover: this.gen(dk.seed + (dk.cover.round ? ' #' + dk.cover.round : ''), dk.cover.style),
    newCardHref: db.mock ? 'WebEditor.dc.html' : dk.newCardHref, importHref: db.href('import', dk.id), connectHref: db.href('connect'),
    openSettings: () => { if (!db.mock) db.act.go(dk.settingsHref); } }; }`;

// New deck. The cover is generated from the name as you type; Shuffle re-rolls it.
const newDeckBody = (phone, back, done) => `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">New deck</span><a href="${back}" aria-label="Close" style="width: 40px; height: 40px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${svg(I.close, 16, 2)}</a></div>
    ${meshCard('cover', `height: ${phone ? 132 : 150}px; border-radius: 26px; flex-shrink: 0;`, 'height: 100%; box-sizing: border-box; padding: 14px 16px 16px 18px; display: flex; flex-direction: column; justify-content: space-between;', `<div style="display: flex; justify-content: flex-end; gap: 8px;">${coverBtn('Shuffle', 'shuffle', 'shuffle')}${coverBtn(phone ? 'Image' : 'Upload image', 'pickCover', 'image')}</div><span style="font-size: ${phone ? 22 : 26}px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{title}}</span>`)}
    <label style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Name</span><input type="text" value="{{name}}" onChange="{{setName}}" placeholder="Name your deck" style="height: 48px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px;"></label>
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Tags</span>${TAG_EDIT('deckTags', 'deckPick', phone)}</div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">${stepper('New cards a day', 'perDay', 'lessDay', 'moreDay', true, 'perDayIn')}${stepper('Remember goal', 'goal', 'lessGoal', 'moreGoal', true)}</div>
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Grade with</span>${modeSeg(true)}</div>
    <div style="display: flex; gap: 10px;"><a href="${back}" style="flex-grow: 1; height: 52px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Cancel</a><a href="${done}" onClick="{{create}}" style="flex-grow: 2; height: 52px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Create deck</a></div>`;
const webNewDeck = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDecks" dark="{{dark}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="New deck" style="position: absolute; left: 420px; top: 50%; transform: translateY(-50%); width: 600px; box-sizing: border-box; padding: 28px; border-radius: 36px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 18px;">
    ${newDeckBody(false, 'WebDecks.dc.html', 'WebDeck.dc.html')}
  </div>
</div>`;
// Import cards: paste text or pick a file (Anki and Quizlet exports, CSV), then pick the deck. Opens over Decks.
const webImport = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDecks" dark="{{dark}}" hint-size="1440px,900px"></dc-import>
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
    t, ...chrome, dark: !!this.props.dark, text, deckName,
    setText: e => this.setState({ text: e && e.target ? e.target.value : '' }), setDeck: e => this.setState({ deck: e && e.target ? e.target.value : '' }),
    pickText: () => db.act.pickText().then(txt => txt != null && this.setState({ text: txt })),
    foundLine: cards.length ? plural(cards.length, 'card') + ' found' : text.trim() ? 'No cards yet. Put the front and back on one line, split by a tab or comma.' : '',
    deckChips: decks.slice(0, 6).map(d => { const on = d.name === deckName; return { name: d.name, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => this.setState({ deck: d.name }) }; }),
    importLabel: cards.length ? 'Import ' + plural(cards.length, 'card') : 'Import cards', importBg: cards.length ? t.inv : t.surf2, importFg: cards.length ? t.invText : t.muted,
    backHref: here && !db.mock ? here.href : db.href('decks'),
    doImport: e => { if (db.mock) return; e.preventDefault(); if (cards.length) db.act.importCards({ deckName: deckName.trim() || 'Imported cards', cards }); }
  };
}`;
const phoneNewDeck = `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneToday" dark="{{dark}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="New deck" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;">
    ${newDeckBody(true, 'PhoneToday.dc.html', 'PhoneDeck.dc.html')}
  </div>
</div>`;
const NEW_DECK_LOGIC = `
constructor(props) { super(props); this.state = { name: 'Pharmacology', round: 0, tags: ['MCAT'] }; }
renderVals() {
  ${T}${DB_JS}
  const s = this.state, st = db.settings();
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
    t, dark: !!this.props.dark, grain: String(this.props.grain ?? 0.7),
    name, title,
    cover: this.gen(title + (s.round ? ' #' + s.round : ''), st.grads),
    setName: e => this.setState({ name: e && e.target ? e.target.value : s.name, typed: true }),
    shuffle: () => this.setState({ round: s.round + 1 }), noop: () => {},
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

// ---------- dark wrappers ----------
const darkOf = (name, w, h) => `<div style="width: ${w}px; height: ${h}px; overflow: hidden; background: #000000;"><dc-import name="${name}" dark="{{yes}}" hint-size="${w}px,${h}px"></dc-import></div>`;
const darkLogic = `renderVals() { return { yes: true }; }`;
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
const G_LOGO = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const APPLE_LOGO = `<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>`;
// In the app these sign in for real (the logic's handlers); on the canvas their links just show the next board.
const authBtn = (label, glyph, href, h, handler) => `<a href="${href}" onClick="{{${handler}}}" style="height: ${h}px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 999px; background: {{t.bg}}; box-shadow: inset 0 0 0 1px {{t.surf2}}; font-size: 15px; font-weight: 600;">${glyph}${label}</a>`;
const orLine = `<div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: {{t.muted}};"><span style="flex-grow: 1; height: 1px; background: {{t.line}};"></span>or<span style="flex-grow: 1; height: 1px; background: {{t.line}};"></span></div>`;
// What signing in means, with the Terms and Privacy pages a tap away.
const AGREE = `<p style="margin: 0; font-size: 12px; line-height: 1.5; color: {{t.muted}};">By continuing, you agree to the <a href="{{termsHref}}" style="text-decoration: underline;">Terms</a> and <a href="{{privacyHref}}" style="text-decoration: underline;">Privacy Policy</a>.</p>`;
// Phones get 16px text in the field, or they zoom in when it's tapped.
const emailForm = (h, next, fs = 15) => `<div style="display: flex; flex-direction: column; gap: 10px;"><input type="email" value="{{email}}" onChange="{{setEmail}}" onKeyDown="{{emailKey}}" placeholder="Email" aria-label="Email" autocomplete="email" style="height: ${h}px; box-sizing: border-box; padding: 0 20px; border: 0; outline: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: ${fs}px;"><a href="${next}" onClick="{{sendCode}}" style="height: ${h}px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; font-weight: 600;">{{sendLabel}}</a>${SIGN_ERROR}</div>`;
// Why signing in didn't work (a wrong code, Google not set up yet), under the field it's about.
const SIGN_ERROR = `<sc-if value="{{hasError}}" hint-placeholder-val="{{ false }}"><div role="alert" style="padding: 2px 4px 0; font-size: 14px; line-height: 1.4; color: {{t.again}};">{{error}}</div></sc-if>`;
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
const wallTag = (h, size, bottom) => `<div style="position: absolute; left: 50%; bottom: ${bottom}px; transform: translateX(-50%); height: ${h}px; padding: 0 ${h / 2}px; display: flex; align-items: center; border-radius: 999px; background: {{t.bg}}; color: {{t.text}}; font-size: ${size}px; font-weight: 500; letter-spacing: -.01em; white-space: nowrap; box-shadow: 0 12px 32px -14px rgba(0,0,0,.45);">Flashcards your AI can make.</div>`;
// iPhone cards are smaller, so their words and padding shrink by this much.
const PHONE_K = 150 / 264;
// The wall on sign-in drifts over a sky (a night sky in dark mode), edge to edge.
const signPanel = (style, wall, tag) => `<div style="position: relative; overflow: hidden; background: radial-gradient(120% 50% at 50% 0%, {{sky.glow}}, transparent 70%), linear-gradient(180deg, {{sky.top}} 0%, {{sky.mid}} 55%, {{sky.low}} 100%); ${style}">${cardWall(wall)}${tag}</div>`;
const signCol = inner => `<section style="width: 560px; flex-shrink: 0; box-sizing: border-box; padding: 32px 40px; display: flex; flex-direction: column;">
    ${logo()}
    <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;"><div style="width: 360px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">${inner}</div></div>
  </section>`;
const webSignRoot = inner => `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
  ${signCol(inner)}
  ${signPanel('flex-grow: 1; min-width: 0;', { cols: 4, w: 264, h: 176, gap: 16, r: 20, tilt: -14, k: 1 }, wallTag(44, 16, 36))}
</div>`;
const webSignIn = webSignRoot(`<h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Sign in to Lucida</h1>
      <div style="display: flex; flex-direction: column; gap: 10px;">${authBtn('Continue with Google', G_LOGO, 'Main.dc.html', 44, 'google')}${authBtn('Continue with Apple', APPLE_LOGO, 'Main.dc.html', 44, 'apple')}</div>
      ${orLine}
      ${emailForm(44, 'WebSignInCode.dc.html')}
      ${AGREE}`);
const codeText = `<div style="display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -.03em;">Check your email</h1><div style="font-size: 15px; line-height: 1.45; color: {{t.muted}};">Enter the 6-digit code we sent to <span style="color: {{t.text}}; font-weight: 500;">{{sentTo}}</span></div></div>`;
const webSignInCode = webSignRoot(`<a href="WebSignIn.dc.html" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: {{t.muted}};">${svg(I.back, 16, 2)}Use another email</a>
      ${codeText}
      ${codeBoxes(52, 60)}${SIGN_ERROR}
      <div style="display: flex; flex-direction: column; gap: 14px;"><a href="Main.dc.html" onClick="{{verify}}" style="height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; font-weight: 600;">{{verifyLabel}}</a><button type="button" onClick="{{resend}}" style="align-self: center; border: 0; padding: 0; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; cursor: pointer;">{{resendLabel}}</button></div>`);
// The phone sign-in pages fill any phone's screen in the app (design/to-web.mjs swaps this 390 x 844 frame for the
// window), so the wall takes whatever height the form leaves.
const signPhoneRoot = inner => `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; display: flex; flex-direction: column; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}}; overflow: hidden;">
${inner}
</div>`;
const phoneSignIn = signPhoneRoot(`${signPanel('flex: 1 1 380px; min-height: 220px;', { cols: 4, w: 150, h: 100, gap: 10, r: 16, tilt: -14, k: PHONE_K }, wallTag(38, 14, 18))}
  <div style="flex-shrink: 0; box-sizing: border-box; padding: 22px 20px 34px; display: flex; flex-direction: column; gap: 10px;">
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -.03em;">Sign in to Lucida</h1>
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
  return { grain: String(this.props.grain ?? 0.7), t, sky: ${SKY}, ${secs ? WALL_VALS(secs, k, FLIPS.calm) : ''}
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
  '@keyframes scSpin{to{transform:rotate(360deg)}}@keyframes scDot{0%,60%,100%{transform:none;opacity:.45}30%{transform:translateY(-3px);opacity:1}}',
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
const typeBlank = (L, key) => typeText(L, `The <span style="display: inline-block; width: 2.4em; height: .9em; margin: 0 .1em; border-radius: 999px; vertical-align: -.1em; background: {{${key}.glass}};"></span> is the powerhouse of the cell.`);
const typePicture = L => { const w = L === LAND.phone ? 90 : 130; return `<svg width="${w}" height="${Math.round(w * .62)}" viewBox="0 0 130 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">${PICTURE_ICON}</svg>${typeText(L, 'Name part 1.')}`; };
const typeSound = L => { const k = L === LAND.phone ? .7 : 1, px = n => Math.max(2, Math.round(n * k)); return `<span style="display: flex; align-items: center; gap: ${px(14)}px;"><span style="width: ${px(50)}px; height: ${px(50)}px; flex-shrink: 0; border-radius: 50%; background: {{q4.glass}}; box-shadow: inset 0 0 0 1.5px {{q4.glassLine}}; display: flex; align-items: center; justify-content: center;"><span style="display: flex; margin-left: ${px(3)}px;">${svg(I.play, px(22), 0)}</span></span><span style="display: flex; align-items: center; gap: ${px(4)}px;">${[12, 22, 34, 18, 28, 14, 24, 16, 9].map(b => `<span style="width: ${px(3)}px; height: ${px(b)}px; border-radius: 2px; background: currentColor; opacity: .85;"></span>`).join('')}</span></span>`; };
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
  <nav style="display: flex; align-items: center; gap: ${phone ? 6 : 4}px;">${phone ? '' : `<a href="#how" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">How it works</a><a href="#cards" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Card types</a>`}<a href="{{signInHref}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 14px; color: {{t.text}};">Sign in</a>${landPill('Get started', '{{startHref}}', true, 36, phone ? 'padding: 0 14px;' : '')}</nav>
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
  <span style="display: flex; flex-wrap: wrap; gap: 16px;"><a href="{{privacyHref}}">Privacy</a><a href="{{termsHref}}">Terms</a><span>© 2026 Lucida</span></span>
</footer>`
  : `<footer style="max-width: 1344px; margin: 0 auto; box-sizing: border-box; padding: 48px clamp(20px, 4vw, 48px); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 16px; font-size: 14px; color: {{t.muted}};">
  ${logo(26)}<span style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px;"><a href="{{privacyHref}}">Privacy</a><a href="{{termsHref}}">Terms</a><span>© 2026 Lucida</span><span style="margin-left: 8px;">${socialLinks(20)}</span></span>
</footer>`;
const LANDING_H = 4002, LANDING_PHONE_H = 4818;
// The sky behind the landing page's top and the sign-in wall: daylight, or a night sky in dark mode.
const SKY = `(this.props.dark ? { top: '#081733', mid: '#0D2148', low: '#0A1530', glow: 'rgba(120,150,255,.16)', cloud: 'rgba(150,170,230,.10)' }
    : { top: '#86BDF3', mid: '#C9E2FB', low: '#EDF5FE', glow: 'rgba(255,255,255,.75)', cloud: 'rgba(255,255,255,.94)' })`;
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
    privacyHref: site ? '/privacy' : 'Privacy.dc.html', termsHref: site ? '/terms' : 'Terms.dc.html' }; }`;

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
    privacyHref: site ? '/privacy' : 'Privacy.dc.html', termsHref: site ? '/terms' : 'Terms.dc.html' }; }`;

// ---------- write ----------
const W = 1440, H = 900, PW = 390, PH = 844;
const files = {
  'Main': ['Web · Today', webToday, { props: { ...DARK, ...MESH('Iris'), caughtUp: { editor: 'boolean', default: false } }, logic: todayLogic, w: W, h: H }],
  'WebNewDeck': ['Web · New deck', webNewDeck, { props: { ...DARK, grain: MESH('Iris').grain }, logic: NEW_DECK_LOGIC, css: NUM_CSS, w: W, h: H }],
  'WebImport': ['Web · Import cards', webImport, { props: { ...DARK, grain: MESH('Iris').grain }, logic: importLogic, w: W, h: H }],
  'WebDecks': ['Web · Decks', webDecks, { props: { ...DARK, grain: MESH('Iris').grain, view: { editor: 'enum', default: 'Cards', options: ['Cards', 'List'] }, openTags: { editor: 'boolean', default: false }, moreTags: { editor: 'boolean', default: false } }, logic: decksLogic, w: W, h: H }],
  'WebDecksTags': ['Web · Decks · a deck with 11 tags (+9 shows them all)', attrOf('WebDecks', W, H, 'open-tags="{{yes}}"'), { logic: darkLogic, w: W, h: H }],
  'WebDecksMoreTags': ['Web · Decks · More (find any tag)', attrOf('WebDecks', W, H, 'more-tags="{{yes}}"'), { logic: darkLogic, w: W, h: H }],
  'WebDecksList': ['Web · Decks · list view', listOf('WebDecks', W, H), { logic: 'renderVals() { return {}; }', w: W, h: H }],
  'WebSettings': ['Web · Settings', webSettings, { props: { ...DARK, grain: MESH('Iris').grain, photo: { editor: 'enum', default: 'Color', options: ['Color', 'Google photo'] } }, logic: webSettingsLogic, css: NUM_CSS, w: W, h: H }],
  'IconOptions': ['Web · Icon options', iconOptions, { props: DARK, logic: iconOptionsLogic, w: W, h: H }],
  'WebTodayNew': ['Web · Today · new user', webTodayNew, { props: { ...DARK, ...MESH('Iris') }, logic: emptyLogic(), w: W, h: H }],
  'WebTodayCaughtUp': ['Web · Today · all caught up', caughtOf('Main', W, H), { logic: darkLogic, w: W, h: H }],
  'WebDecksEmpty': ['Web · Decks · no decks yet', webDecksEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: W, h: H }],
  'WebDeckEmpty': ['Web · Deck · no cards yet', webDeckEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic('Pharmacology'), w: W, h: H }],
  'WebStatsEmpty': ['Web · Stats · no reviews yet', webStatsEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: W, h: H }],
  'WebDeck': ['Web · Deck page', webDeck, { props: { ...DARK, grain: MESH('Iris').grain, settingsOpen: { editor: 'boolean', default: false }, settingsTab: { editor: 'enum', default: 'General', options: ['General', 'Studying'] }, tagPicker: { editor: 'boolean', default: false } }, logic: deckLogic, css: NUM_CSS, w: W, h: H }],
  'WebDeckTagPicker': ['Web · Deck settings · Add tag', attrOf('WebDeck', W, H, 'settings-open="{{yes}}" tag-picker="{{yes}}"'), { logic: darkLogic, css: NUM_CSS, w: W, h: H }],
  'WebEditor': ['Web · Card editor', webEditor, { props: { ...DARK, cardType: { editor: 'enum', default: 'Basic', options: ['Basic', 'Blank', 'Image', 'Audio'] }, slashDemo: { editor: 'boolean', default: false } }, logic: EDITOR_LOGIC, css: RICH_CSS, w: W, h: H }],
  'WebEditorSlash': ['Web · Card editor · / menu', attrOf('WebEditor', W, H, 'slash-demo="{{yes}}"'), { logic: darkLogic, css: RICH_CSS, w: W, h: H }],
  'WebSignIn': ['Web · Sign in', webSignIn, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('', [64, 78, 70, 84]), css: WALL_CSS, w: W, h: H }],
  'WebSignInCode': ['Web · Sign in · code from email', webSignInCode, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('482', [64, 78, 70, 84]), css: WALL_CSS, w: W, h: H }],
  'WebEditorBlank': ['Web · Card editor · fill in the blank', typeOf('WebEditor', W, H, 'Blank'), { logic: darkLogic, css: RICH_CSS, w: W, h: H }],
  'WebEditorImage': ['Web · Card editor · image', typeOf('WebEditor', W, H, 'Image'), { logic: darkLogic, css: RICH_CSS, w: W, h: H }],
  'WebEditorAudio': ['Web · Card editor · audio', typeOf('WebEditor', W, H, 'Audio'), { logic: darkLogic, css: RICH_CSS, w: W, h: H }],
  'WebReview': ['Web · Review', webReview, { props: { ...DARK, grading: { editor: 'enum', default: 'Four buttons', options: ['Four buttons', 'Check or X', 'Piles'] }, card: { editor: 'enum', default: 'Basic', options: ['Basic', 'Fill in the blank', 'Image', 'Audio'] }, startRevealed: { editor: 'boolean', default: false }, fsrs: { editor: 'boolean', default: true }, progress: { editor: 'enum', default: 'Bar', options: ['Bar', 'Counts', 'None'] }, settingsOpen: { editor: 'boolean', default: false }, newPileOpen: { editor: 'boolean', default: false }, radius: { editor: 'range', default: 32, min: 12, max: 48, step: 2, unit: 'px' } }, logic: REVIEW_LOGIC(64), css: REVIEW_CSS, w: W, h: H }],
  'WebDone': ['Web · Session done', webDone, { props: DARK, logic: doneLogic(300, 22), w: W, h: H }],
  'WebDonePiles': ['Web · Session done · piles', webDonePiles, { props: DARK, logic: donePilesLogic, w: W, h: H }],
  'WebStats': ['Web · Stats', webStats, { props: DARK, logic: statsLogic, w: W, h: H }],
  'WebConnect': ['Web · Connect AI', webConnect, { props: { ...DARK, ...MESH('Apricot') }, logic: connectLogic, w: W, h: H }],
  'WebTodayDark': ['Web · Today (dark)', darkOf('Main', W, H), { logic: darkLogic, w: W, h: H }],
  'WebReviewDark': ['Web · Review (dark)', darkOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewFour': ['Web · Review · 4 grades', styleOf('WebReview', W, H, 'Four buttons'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewCheck': ['Web · Review · ✓ or ✗', styleOf('WebReview', W, H, 'Check or X'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewSettings': ['Web · Review · settings', settingsOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewPiles': ['Web · Review · Piles', styleOf('WebReview', W, H, 'Piles'), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewNewPile': ['Web · Review · New pile popup', pileOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebReviewBlank': ['Web · Review · fill in the blank', blankOf('WebReview', W, H), { logic: darkLogic, css: REVIEW_CSS, w: W, h: H }],
  'WebDeckSettings': ['Web · Deck settings', openOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS, w: W, h: H }],
  'WebDeckSettingsStudy': ['Web · Deck settings · Studying (FSRS)', studyOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS, w: W, h: H }],
  'WebDeckDark': ['Web · Deck page (dark)', darkOf('WebDeck', W, H), { logic: darkLogic, css: NUM_CSS, w: W, h: H }],
  'WebStatsDark': ['Web · Stats (dark)', darkOf('WebStats', W, H), { logic: darkLogic, w: W, h: H }],
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
  'PhoneStatsEmpty': ['iPhone · Stats · no reviews yet', phoneStatsEmpty, { props: { ...DARK, grain: MESH('Iris').grain }, logic: emptyLogic(), w: PW, h: PH }],
  'PhoneNewDeck': ['iPhone · New deck', phoneNewDeck, { props: { ...DARK, grain: MESH('Iris').grain }, logic: NEW_DECK_LOGIC, css: NUM_CSS, w: PW, h: PH }],
  'PhoneInbox': ['iPhone · Check AI cards', phoneInbox, { props: DARK, logic: phoneInboxLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneDeck': ['iPhone · Deck page', phoneDeck, { props: { ...DARK, grain: MESH('Iris').grain, settingsOpen: { editor: 'boolean', default: false }, settingsTab: { editor: 'enum', default: 'General', options: ['General', 'Studying'] }, tagPicker: { editor: 'boolean', default: false } }, logic: phoneDeckLogic, css: NUM_CSS, w: PW, h: PH }],
  'PhoneDeckTagPicker': ['iPhone · Deck settings · Add tag', attrOf('PhoneDeck', PW, PH, 'settings-open="{{yes}}" tag-picker="{{yes}}"'), { logic: darkLogic, css: NUM_CSS, w: PW, h: PH }],
  'PhoneDeckSettingsStudy': ['iPhone · Deck settings · Studying (FSRS)', studyOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS, w: PW, h: PH }],
  'PhoneEditor': ['iPhone · Card editor', phoneEditor, { props: { ...DARK, keyboard: { editor: 'boolean', default: true }, textStyles: { editor: 'boolean', default: false }, cardType: { editor: 'enum', default: 'Basic', options: ['Basic', 'Blank', 'Image', 'Audio'] } }, logic: EDITOR_LOGIC, css: RICH_CSS, w: PW, h: PH }],
  'PhoneReview': ['iPhone · Review', phoneReview, { props: { ...DARK, grading: { editor: 'enum', default: 'Four buttons', options: ['Four buttons', 'Check or X', 'Piles'] }, card: { editor: 'enum', default: 'Basic', options: ['Basic', 'Fill in the blank', 'Image', 'Audio'] }, startRevealed: { editor: 'boolean', default: false }, fsrs: { editor: 'boolean', default: true }, progress: { editor: 'enum', default: 'Bar', options: ['Bar', 'Counts', 'None'] }, settingsOpen: { editor: 'boolean', default: false }, newPileOpen: { editor: 'boolean', default: false }, radius: { editor: 'range', default: 32, min: 12, max: 48, step: 2, unit: 'px' } }, logic: REVIEW_LOGIC(64), css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneDone': ['iPhone · Session done', phoneDone, { props: DARK, logic: doneLogic(260, 20), w: PW, h: PH }],
  'PhoneDonePiles': ['iPhone · Session done · piles', phoneDonePiles, { props: DARK, logic: donePilesLogic, w: PW, h: PH }],
  'PhoneSignIn': ['iPhone · Sign in', phoneSignIn, { props: { ...DARK, grain: MESH('Iris').grain }, logic: signInLogic('', [50, 60, 55, 65], PHONE_K), css: WALL_CSS, w: PW, h: PH }],
  'PhoneSignInCode': ['iPhone · Sign in · code from email', phoneSignInCode, { props: DARK, logic: signInLogic('482'), w: PW, h: PH }],
  'Landing': ['Landing page · lucida.cards', landing(LAND.web, W, LANDING_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: landingLogic(false), css: WALL_CSS + DEMO_CSS + SKY_CSS, w: W, h: LANDING_H }],
  'Privacy': ['Privacy Policy · lucida.cards/privacy', legalPage(PRIVACY, LEGAL_H.Privacy), { props: DARK, logic: legalLogic, w: W, h: LEGAL_H.Privacy }],
  'Terms': ['Terms of Service · lucida.cards/terms', legalPage(TERMS, LEGAL_H.Terms), { props: DARK, logic: legalLogic, w: W, h: LEGAL_H.Terms }],
  'LandingPhone': ['Landing page · lucida.cards on a phone', landing(LAND.phone, PW, LANDING_PHONE_H), { props: { ...DARK, grain: MESH('Iris').grain }, logic: landingLogic(true), css: WALL_CSS + DEMO_CSS + SKY_CSS, w: PW, h: LANDING_PHONE_H }],
  'PhoneStats': ['iPhone · Stats', phoneStats, { props: DARK, logic: phoneStatsLogic, w: PW, h: PH }],
  'PhoneConnect': ['iPhone · Connect AI', phoneConnect, { props: { ...DARK, ...MESH('Apricot') }, logic: phoneConnectLogic, w: PW, h: PH }],
  'PhoneTodayDark': ['iPhone · Today (dark)', darkOf('PhoneToday', PW, PH), { logic: darkLogic, w: PW, h: PH }],
  'PhoneReviewDark': ['iPhone · Review (dark)', darkOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewFour': ['iPhone · Review · 4 grades', styleOf('PhoneReview', PW, PH, 'Four buttons'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewCheck': ['iPhone · Review · ✓ or ✗', styleOf('PhoneReview', PW, PH, 'Check or X'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewSettings': ['iPhone · Review · settings', settingsOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewPiles': ['iPhone · Review · Piles', styleOf('PhoneReview', PW, PH, 'Piles'), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewNewPile': ['iPhone · Review · New pile popup', pileOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneReviewBlank': ['iPhone · Review · fill in the blank', blankOf('PhoneReview', PW, PH), { logic: darkLogic, css: REVIEW_CSS, w: PW, h: PH }],
  'PhoneSettings': ['iPhone · Settings', phoneSettings, { props: DARK, logic: phoneSettingsLogic, w: PW, h: PH }],
  'PhoneDeckSettings': ['iPhone · Deck settings', openOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS, w: PW, h: PH }],
  'PhoneDeckDark': ['iPhone · Deck page (dark)', darkOf('PhoneDeck', PW, PH), { logic: darkLogic, css: NUM_CSS, w: PW, h: PH }],
  'PhoneStatsDark': ['iPhone · Stats (dark)', darkOf('PhoneStats', PW, PH), { logic: darkLogic, w: PW, h: PH }]
};
for (const [name, [title, body, opts]] of Object.entries(files)) writeFileSync(OUT + name + '.dc.html', page(title, body, opts));

// The canvas layout (where each board sits) lives in canvas/project/canvas.json. It's kept in sync with the live
// canvas, since boards can be moved there, so this script never rewrites it.
console.log(Object.keys(files).length, 'artboards');
