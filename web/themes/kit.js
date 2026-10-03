// Lucida themes (Pro, Settings › Theme). A theme changes four things only: the flashcard, the study background (behind
// flashcards and Learn mode), the deck covers, and the profile picture. The rest of the app stays Lucida: the sidebar,
// buttons, grade buttons, progress bar, chips, menus, and the Geist type. Each theme is a module in this folder (index.js
// lists them); this kit has what they share: small drawing helpers, and the calls the app's screens make (make()).
// The same code runs in three places: design/build.mjs reads it for the Themes boards of the design canvas, the canvas
// runs it inside those boards, and the app loads a theme's module once you pick it (web/themes/load.js). So it has no
// imports, and every picture it draws is inline markup: inline styles, inline SVG without ids, and pictures only
// through CSS classes (the canvas takes url() only in a board's own CSS).

// ---------- drawing ----------
export const A = (css, inner = '') => `<span style="position: absolute; ${css}">${inner}</span>`;
export const V = (vb, inner, css = '') => `<svg width="100%" viewBox="${vb}" aria-hidden="true" style="display: block; overflow: visible; ${css}">${inner}</svg>`;
export const R = Math.round;
export const f = n => (Math.round(n * 10) / 10).toString();
// Where a picture sits: wide = a computer's study screen (drawn at 1440 × 900), tall = a phone's (390 × 844), mid = the
// theme page's preview (640 × 700), tiny = a Settings › Theme tile or a background tile.
export const lay = (w, h) => (w < 300 ? 'tiny' : w / h > 1.25 ? 'wide' : h / w > 1.5 ? 'tall' : 'mid');
export const VT = 'VT323, ui-monospace, monospace';
export const scrim = (rgb, a = 0.5, to = 62) => A(`left: 0; right: 0; bottom: 0; height: ${to}%; background: linear-gradient(to top, rgba(${rgb},${a}), rgba(${rgb},0));`);
// Film grain over a picture (the texture is in the kit's CSS below).
export const grain = (op = 0.55, css = '') => `<span class="sk-grain" style="opacity: ${op}; ${css}"></span>`;

// ---------- decks: which cover, and which picture on it ----------
// A theme has six covers. A deck gets one from its seed (its name when it was made, so renaming it keeps its cover),
// and Shuffle moves it to the next. The six sample decks of the canvas get six different ones.
export function variant(d) {
  let h = 2166136261 ^ 66;
  for (const ch of String(d.seed || d.name || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (((h >>> 0) % 6) + (+(d.round ?? (d.cover && d.cover.round)) || 0)) % 6;
}
// The picture on a cover says what the deck is about, from its name and tags; a deck about something else gets its
// first letter instead ('#' + the letter).
export const KEYS = ['cell', 'cloud', 'torii', 'benzene', 'quill', 'bone'];
export const MOTIF = ['Cell', 'Cloud', 'Torii', 'Benzene', 'Quill', 'Bone'];
const SUBJECTS = [
  ['torii', /japan|jlpt|kanji|hiragana|katakana|nihongo|日本/],
  ['benzene', /chem|organic|molecul|reaction|periodic|benzene|orgo/],
  ['bone', /anatom|physiol|bone|skelet|medic|nurs|pharm|clinic|surg|health|usmle|nclex|dental|muscle/],
  ['cell', /bio|cell|gene|dna|micro|ecolog|botan|zoolog|evolution|mcat|organelle/],
  ['cloud', /comput|system|software|program|coding|\bcode|algorithm|data|network|cloud|\bweb|\bcs\b|devops|sql|python|java|linux|engineer/],
  ['quill', /histor|literat|english|writ|poem|poet|\blaw\b|legal|civic|govern|philosoph|essay|revolution|ancient/],
  ['words', /spanish|french|german|italian|portuguese|latin|korean|chinese|mandarin|arabic|russian|vocab|grammar|language|verbs|idiom|toefl|ielts/],
];
export function subject(d) {
  const text = [d.name || '', ...(d.tags || [])].join(' ').toLowerCase();
  for (const [k, re] of SUBJECTS) if (re.test(text)) return k;
  const ch = String(d.name || '').trim().match(/[\p{L}\p{N}]/u);
  return '#' + (ch ? ch[0].toUpperCase() : 'L');
}
// A deck ready for a theme's cover(): its cover (v), its picture (m), and a name for the canvas's captions.
export const deckLook = d => ({ ...d, v: d.v != null ? d.v : variant(d), m: d.m || subject(d) });
export const di = d => (d.v != null ? d.v : variant(d));
export const mo = d => d.m || subject(d);
export const motifName = k => (k[0] === '#' ? 'Letter ' + k.slice(1) : k === 'words' ? 'Words' : MOTIF[KEYS.indexOf(k)] || k);
// A long, low cover (a deck page's header on the web, New deck's preview) is a banner.
export const banner = o => o.shape === 'wide' && o.w / o.h > 2.2;
// Where a banner's picture goes: its middle (cx, cy) and size (s). A deck page's header (o.head) has buttons in its top
// corners and at its bottom right (+ and Study ▾), so its picture sits a little left of the middle, a little high; New
// deck's preview has its buttons top right and the name bottom left, so its picture sits bottom right.
export const bannerSpot = o => (o.head ? { cx: o.w * 0.43, cy: o.h * 0.38, s: o.h * 0.58 } : { cx: o.w * 0.78, cy: o.h * 0.64, s: o.h * 0.52 });
// A phone deck page's header has its buttons along the top (o.top: how tall that row is), so its picture sits in the
// lower right, under them.
export const headSpot = o => { const rem = o.h - o.top, s = R(rem * 0.9); return { s, x: R(o.w - s - o.w * 0.045), y: R(o.top + (rem - s) / 2) }; };
// the main picture spot on a cover: the right side of the wide Library card, the upper middle of portrait covers
export const focal = o => (o.top ? headSpot(o) : banner(o) ? (B => { const s = R(B.s * 0.83); return { s, x: R(B.cx - s / 2), y: R(B.cy - s / 2) }; })(bannerSpot(o)) : o.shape === 'wide' ? { s: R(o.h * 0.5), x: R(o.w - o.h * 0.5 - o.w * 0.06), y: R(o.h * 0.17) } : { s: R(o.w * 0.62), x: R(o.w * 0.19), y: R(o.h * 0.08) });

// ---------- subject pictures (one per deck) ----------
export const LINE = {
  cell: '<path d="M24 5c10.5 0 19 7.6 19 18.5S34.5 43 24 43 5 35 5 24.5 13.5 5 24 5z"/><circle cx="21" cy="22" r="7.5"/><circle cx="21" cy="22" r="2.4" fill="currentColor" stroke="none"/><path d="M30 33c1.8-3.2 6.4-3.4 7.6-.4 1.2 3-2.6 5.4-5.6 4.4"/><circle cx="33.5" cy="15" r="2.2"/><circle cx="12.5" cy="33" r="1.8"/>',
  cloud: '<path d="M14 28h21a7.5 7.5 0 0 0 .6-15A11 11 0 0 0 15 11.6 8.2 8.2 0 0 0 14 28z"/><path d="M16 28v6M24.5 28v6M33 28v6"/><rect x="12.5" y="34" width="7" height="7" rx="1.8"/><rect x="21" y="34" width="7" height="7" rx="1.8"/><rect x="29.5" y="34" width="7" height="7" rx="1.8"/>',
  torii: '<path d="M5 11.5c7 2.4 31 2.4 38 0l-1.2 4.4c-6 1.7-29.6 1.7-35.6 0z"/><path d="M9.5 21.5h29M24 16v5.5M14.5 16v26M33.5 16v26M11.5 42h6M30.5 42h6"/>',
  benzene: '<path d="M24 6l15.6 9v18L24 42 8.4 33V15z"/><circle cx="24" cy="24" r="8.2"/><path d="M39.6 15l5.4-3.2"/>',
  quill: '<path d="M40 5C28 6 16.5 16 13 34c9-2.2 22-10 27-29z"/><path d="M13 34L35 10"/><path d="M13 34l-4.5 6.5"/><path d="M19.5 24.8l4 3.4M25.8 18l3.6 3.2"/><path d="M8 43h17"/>',
  bone: '<path transform="rotate(-38 24 24)" d="M14.9 20.5H33.1A5 5 0 1 1 40.2 24A5 5 0 1 1 33.1 27.5H14.9A5 5 0 1 1 7.8 24A5 5 0 1 1 14.9 20.5Z"/>',
  // languages: a speech bubble with two lines of words
  words: '<path d="M9 9h30a4.5 4.5 0 0 1 4.5 4.5v15A4.5 4.5 0 0 1 39 33H23l-9.5 7.5V33H9a4.5 4.5 0 0 1-4.5-4.5v-15A4.5 4.5 0 0 1 9 9z"/><path d="M13 18h22M13 25h13"/>',
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// A subject picture's shapes (viewBox 48), or a deck's first letter set in `font` (for decks about something else).
export const lineOf = (k, font = 'inherit', weight = 700) => LINE[k] || `<text x="24" y="36" text-anchor="middle" font-size="35" font-weight="${weight}" fill="currentColor" stroke="none" style="font-family: ${font};">${esc(k.slice(1))}</text>`;
export const icon = (k, color, w = 2.4, extra = '', font) => V('0 0 48 48', `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${lineOf(k, font)}</g>`, `color: ${color};`);
// a dark line under a light one, like a chrome tube
export const tube = (k, under, over, w = 2.4, font) => V('0 0 48 48', `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${under}" stroke-width="${w * 2.3}">${lineOf(k, font).replace('fill="currentColor" stroke="none"', `fill="${under}" stroke="${under}"`)}</g><g stroke="currentColor" stroke-width="${w}">${lineOf(k, font)}</g></g>`, `color: ${over};`);
export const spark = fill => `<path d="M20 0Q23.2 16.8 40 20Q23.2 23.2 20 40Q16.8 23.2 0 20Q16.8 16.8 20 0Z" fill="${fill}"/>`;
// A four-point sparkle. `tw`: it glows softly (a slow 6 s breath, never a blink).
export const sparkle = (x, y, s, fill = '#FFFFFF', d = 0, tw = true) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; ${tw ? `animation: sk-twinkle 6s ease-in-out ${d}s infinite;` : ''}`, V('0 0 40 40', spark(fill)));
export const star5 = (cx, cy, r0, k = 0.45) => { let d = ''; for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? r0 * k : r0; d += (i ? 'L' : 'M') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a)); } return d + 'Z'; };

// ---------- flashcards ----------
// o = { q, a, side, r, pad, fs }. The back shows the question small, then the answer (the theme previews do; the app's
// own card shows its answer and note).
export function qa(o, s) {
  const small = o.side === 'back' ? `<span style="position: relative; display: block; margin-bottom: ${R(o.fs * 0.34)}px; font-size: ${Math.max(7, R(o.fs * (s.qs || 0.44)))}px; line-height: 1.35; ${s.q}">${s.qp || ''}${o.q}</span>` : '';
  return small + `<span style="position: relative; display: block; font-size: ${Math.max(8, R(o.fs * (s.fs || 1)))}px; line-height: ${s.lh || 1.2}; text-wrap: pretty; ${s.a}">${o.side === 'back' ? o.a : o.q}${s.after || ''}</span>`;
}
// A theme's card face: `css` styles the face itself (its color, edge, shadow, and type), `deco` is drawn behind its words
// (tape, a title bar, a stamp), `a` and `q` style the main words and the small ones. ink / muted / paper are its colors.
export const face = (css, deco, s, more = {}) => ({ css, deco: typeof deco === 'function' ? deco : () => deco, a: s.a, q: s.q, fs: s.fs || 1, lh: s.lh, qs: s.qs, qp: s.qp, after: s.after, ...more });
// A whole card with words on it, for previews (Settings › Theme, the theme's page).
export function cardOf(T, w, h, o) {
  const F = T.face(w, h, o);
  return `<div style="position: relative; width: ${w}px; height: ${h}px; box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column; justify-content: center; padding: ${o.pad}; ${F.css}">${F.deco()}${qa(o, F)}</div>`;
}

// ---------- photo themes ----------
// Their pictures are files (web/themes/img, and the same ones uploaded to the canvas), shown through CSS classes.
// Each set has a wide and a tall study background and six deck covers.
export const photoAssets = p => Object.fromEntries(['bg-wide', 'bg-tall', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5'].map(k => [`${p}-${k}`, `${p}-${k}.webp`]));
export const photoCss = p => Object.keys(photoAssets(p)).map(k => `.${k}{background:url(%%${k}%%) center/cover no-repeat}`).join('\n');
export const photo = (cls, css = '') => `<span class="${cls}" style="position: absolute; inset: 0; ${css}"></span>`;
export const photoBg = (p, w, h, css = '') => photo(`${p}-bg-${w / h > 1.2 ? 'wide' : 'tall'}`, css);
// Soft shade at the top (for the tag chips) and the bottom (for the deck name and buttons) of a photo cover.
export const photoScrim = (rgb, o, top = 0.34, bottom = 0.72) =>
  A(`left: 0; right: 0; top: 0; height: ${o.shape === 'wide' ? 34 : 30}%; background: linear-gradient(180deg, rgba(${rgb},${top}), rgba(${rgb},0));`) +
  A(`left: 0; right: 0; bottom: 0; height: ${o.shape === 'wide' ? 70 : 62}%; background: linear-gradient(0deg, rgba(${rgb},${bottom}), rgba(${rgb},${R(bottom * 40) / 100}) 45%, rgba(${rgb},0));`);
// A photo profile picture with the initial on it.
export const photoAvatar = (cls, s, ch, font, ring = 'rgba(255,255,255,.9)', shade = '0,0,0') => `<span class="${cls}" style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; box-shadow: 0 0 0 ${Math.max(1.5, R(s / 28))}px ${ring}, 0 ${Math.max(1, R(s / 24))}px ${Math.max(2, R(s / 7))}px rgba(${shade},.28); display: flex; align-items: center; justify-content: center; overflow: hidden;"><span style="position: absolute; inset: 0; background: radial-gradient(circle at 50% 60%, rgba(${shade},.28), rgba(${shade},0) 70%);"></span><span style="position: relative; font-family: ${font}; font-size: ${R(s * 0.44)}px; font-weight: 600; line-height: 1; color: #FFFFFF; text-shadow: 0 1px ${Math.max(2, R(s / 12))}px rgba(${shade},.55);">${ch}</span></span>`;
// Around your own photo, a theme draws only a ring (your photo stays as it is).
export const ringFrame = (s, ring, shade = '0,0,0') => `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 ${Math.max(1.5, R(s / 28))}px ${ring}, 0 ${Math.max(1, R(s / 24))}px ${Math.max(2, R(s / 7))}px rgba(${shade},.28); pointer-events: none;"></span>`;

// ---------- CSS every theme uses (pictures come as %%name%% and are filled in with each place's picture links) ----------
export const KIT_ASSETS = { grain: 'grain.webp', paper: 'paper.webp' };
export const KIT_CSS = `.sk-grain{position:absolute;inset:0;pointer-events:none;mix-blend-mode:soft-light;opacity:.55;background:url(%%grain%%) 0 0/256px 256px}
.lx-paper{background-image:url(%%paper%%);background-size:256px 256px;background-blend-mode:soft-light}
@keyframes sk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes sk-drift{0%{transform:translateX(0)}100%{transform:translateX(20px)}}
@keyframes sk-twinkle{0%,100%{opacity:.65}50%{opacity:1}}
.sk-still *{animation:none!important}
@media (prefers-reduced-motion:reduce){[data-sc-own] *{animation:none!important}}`;

// ---------- what the app's screens ask a theme ----------
// Sizes the screens are drawn at. A study background is drawn at its layout's size and scaled to cover the screen,
// since its pieces sit where the card isn't; the card and the covers are drawn at the size they really are.
const DESIGN = { wide: [1440, 900], tall: [390, 844], mid: [640, 700] };
const FACE_AT = { web: { w: 780, h: 480, r: 32, pad: '44px 56px', fs: 32 }, phone: { w: 358, h: 600, r: 28, pad: '26px 22px', fs: 24 }, learn: { w: 720, h: 220, r: 28, pad: '28px 32px', fs: 30 }, learnPhone: { w: 358, h: 200, r: 24, pad: '20px 20px', fs: 22 } };
// The sample decks on a Settings › Theme tile, and the card.
const TILE_DECKS = [{ name: 'Cell Biology', v: 0, m: 'cell' }, { name: 'Japanese N4', v: 2, m: 'torii' }];
// Your initial, as a theme draws it: one letter or digit (a name that starts with something else gets a dot).
const initial = ch => (String(ch || '').match(/[\p{L}\p{N}]/u) || ['•'])[0];
const hexA = (c, a) => (/^#[0-9a-f]{6}$/i.test(c) ? 'rgba(' + [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',') + ',' + a + ')' : c);

export function make(T) {
  // Drawing a part into an element the page leaves to the theme (data-sc-own): drawn again only when what it shows or
  // its size changes, and when the element's size changes (a window made bigger).
  const draw = (part, w, h, a) => {
    if (part === 'bg') {
      // A small one (a Background tile in settings) is the same picture made small, and holds still.
      const L = w / h > 1.25 ? 'wide' : h / w > 1.5 ? 'tall' : 'mid', small = w < 300;
      const veil = a.veil ? A(`inset: 0; background: linear-gradient(180deg, rgba(${T.dark ? '0,0,0' : '255,255,255'},.5) 0, rgba(${T.dark ? '0,0,0' : '255,255,255'},0) ${a.veil === 'phone' ? 130 : 120}px, rgba(${T.dark ? '0,0,0' : '255,255,255'},0) calc(100% - ${a.veil === 'phone' ? 150 : 110}px), rgba(${T.dark ? '0,0,0' : '255,255,255'},.45) 100%);`) : '';
      const [dw, dh] = DESIGN[L], k = Math.max(w / dw, h / dh);
      return `<span${small ? ' class="sk-still"' : ''} style="position: absolute; left: 50%; top: 50%; width: ${dw}px; height: ${dh}px; overflow: hidden; transform: translate(-50%, -50%) scale(${k.toFixed(4)});">${T.bg(dw, dh)}</span>` + veil;
    }
    if (part === 'deco') return T.face(w, h, { q: '', a: '', side: a.side || 'front', ...(FACE_AT[a.at] || FACE_AT.web), w, h }).deco();
    if (part === 'cover') {
      // 'head': a deck page's header. Long and low on the web (a banner); on a phone, with its buttons along the top.
      const head = a.shape === 'head', o = { w, h, r: a.r ?? 20, big: w > 200, shape: head ? 'wide' : a.shape || 'wide', fs: a.fs };
      if (head && w / h <= 2.2) o.top = R(h * 0.45);
      else if (head) o.head = true;
      const C = T.cover(deckLook(a.d || {}), o);
      return `<span${C.cls ? ` class="${C.cls}"` : ''} style="position: absolute; inset: 0; background-color: ${C.bg};"></span>${C.draw()}`;
    }
    if (part === 'avatar') return a.photo ? (T.frame ? T.frame(w) : '') : T.avatar(w, initial(a.ch));
    if (part === 'card') return cardOf(T, w, h, { q: a.q || '', a: a.a || '', side: a.side || 'front', r: a.r ?? R(Math.min(w, h) * 0.07), pad: a.pad || `${R(h * 0.12)}px ${R(w * 0.09)}px`, fs: a.fs || R(Math.min(w / 16, h / 7)) });
    if (part === 'tile') return tile(w, h, a);
    return '';
  };
  // A Settings › Theme tile: the study background, two deck covers, a card, and the profile picture.
  const tile = (W, H, a) => {
    const k = W / 208, kv = H / 220, px = n => R(n * k), py = n => R(n * kv);
    const cw = px(76), ch = R(cw * 97 / 76), fw = px(124), fh = R(fw * 80 / 124);
    const cov = (d, x, y, rot) => { const C = T.cover(deckLook(d), { w: cw, h: ch, r: px(12), big: false, shape: 'tall' }); return A(`left: ${x}px; top: ${y}px; width: ${cw}px; height: ${ch}px; border-radius: ${px(12)}px; overflow: hidden; box-shadow: ${C.shadow || 'none'}; ${rot ? `transform: rotate(${rot}deg);` : ''}`, `<span${C.cls ? ` class="${C.cls}"` : ''} style="position: absolute; inset: 0; background-color: ${C.bg};"></span>${C.draw()}`); };
    return T.bg(W, H) + cov(TILE_DECKS[0], px(16), py(24), 0) + cov(TILE_DECKS[1], px(60), py(40), 7)
      + A(`right: ${px(14)}px; bottom: ${py(16)}px;`, cardOf(T, fw, fh, { q: 'Mitochondria make…', side: 'front', fs: Math.max(8, px(12)), r: px(12), pad: `${px(9)}px ${px(12)}px` }))
      + A(`right: ${px(14)}px; top: ${px(14)}px;`, T.avatar(px(34), initial(a.ch)));
  };
  const paint = (el, part, a = {}) => {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    el.__skp = [api, part, a];
    const w = el.clientWidth, h = el.clientHeight;
    if (!el.__skro && typeof ResizeObserver === 'function') {
      el.__skro = new ResizeObserver(() => { if (!el.isConnected) { el.__skro.disconnect(); return; } const [S, p, x] = el.__skp; S.paint(el, p, x); });
      el.__skro.observe(el);
    }
    if (!w || !h) return;
    const sig = [T.key, part, w, h, JSON.stringify(a)].join('|');
    if (el.__sk === sig && el.firstChild) return;
    el.__sk = sig;
    el.innerHTML = draw(part, w, h, a);
    if (T.mount) T.mount(el);
  };
  const api = {
    key: T.key, name: T.name, short: T.short || T.name, line: T.line, dark: !!T.dark, board: T.board,
    // A ref for an element the theme draws into: ref="{{…}}" on a data-sc-own element.
    ref: (part, a = {}) => el => paint(el, part, a),
    paint,
    // The study screen's background layer (see studyBg in build.mjs); `dark` above says whether the screen's buttons use
    // Lucida's dark look. `phone`: the veil under the top and bottom bars is taller.
    bg: phone => el => paint(el, 'bg', { veil: phone ? 'phone' : 'web' }),
    // A flashcard face, for a screen's holes: the face's own style, its words' style, its colors, and a ref for what's
    // drawn behind its words. `at`: web, phone, learn, or learnPhone (the size it's drawn at on the canvas).
    faceOf(side, at = 'web') {
      const z = FACE_AT[at] || FACE_AT.web, F = T.face(z.w, z.h, { q: '', a: '', side, r: z.r, pad: z.pad, fs: z.fs });
      const ink = F.ink || '#000000', paper = F.paper || '#FFFFFF';
      return { css: 'border: 0; ' + F.css, a: F.a || '', q: F.q || '', ink, paper, muted: F.muted || hexA(ink, 0.6), dark: !!F.dark, fs: String(F.fs || 1),
        blankBg: ink, blankFg: paper, blankOff: hexA(ink, 0.12), deco: el => paint(el, 'deco', { side, at }) };
    },
    // A deck's cover, for a screen's holes: its base color, words (light or dark ink, with the chips and buttons that
    // go with them), the lettering of its name (`size`: the name's size in px), its shadow, and a ref for its picture.
    coverOf(d, shape = 'wide', size = 19, r) {
      const sh = shape === 'head' ? 'wide' : shape, dl = deckLook(d), C = T.cover(dl, { w: sh === 'wide' ? 356 : sh === 'square' ? 48 : 173, h: sh === 'wide' ? 240 : sh === 'square' ? 48 : 206, r: r ?? 20, big: sh !== 'square', shape: sh, fs: size });
      // (a ref for this cover's picture at another shape: a Library row's thumbnail)
      const art = (sh, rr) => el => paint(el, 'cover', { d: { seed: dl.seed, name: dl.name, round: dl.round, tags: dl.tags, v: dl.v, m: dl.m }, shape: sh, r: rr, fs: size });
      const light = C.ink !== 'dark';
      return { on: true, base: C.bg, ink: light ? '#FFFFFF' : '#111111', sub: light ? 'rgba(255,255,255,.82)' : 'rgba(0,0,0,.62)',
        glass: light ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.07)', glassLine: light ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.08)',
        btnBg: light ? '#FFFFFF' : '#000000', btnFg: light ? '#000000' : '#FFFFFF', shadow: C.shadow || 'none', textShadow: 'none',
        title: `font-size: ${R(size * (C.ts || 1))}px; ${C.title || ''}`, name: C.name || '',
        titleAt: n => `font-size: ${R(n * (C.ts || 1))}px; ${C.title || ''}`,
        // A phone deck page's header (a size container): the name on one line, smaller when it's long (down to 60%).
        // With a theme whose picture sits right of the name there (T.headArt), a long name takes two lines beside it
        // instead. T.cw: how wide the theme's letters run, as a share of their size.
        titleHead: (n, name) => {
          const big = R(n * (C.ts || 1)), cw = T.cw || 0.54, s = String(name || ''), len = Math.max(1, s.length), cut = T.headArt ? 192 : 40, W = 390 - cut;
          const word = Math.max(1, ...s.split(/\s+/).map(x => x.length)), one = W / (len * cw);
          if (!T.headArt || one >= big * 0.82) return `font-size: ${big}px; font-size: clamp(${R(big * 0.6)}px, calc((100cqw - ${cut}px) / ${(len * cw).toFixed(2)}), ${big}px); max-width: calc(100cqw - ${cut}px); ${C.title || ''}`;
          // (its longest word has to fit a line, with room for wide letters and outlines)
          const two = Math.max(R(big * 0.6), Math.min(big, R((1.9 * W) / (len * cw)), R(W / (word * cw * 1.15))));
          return `font-size: ${two}px; max-width: calc(100cqw - ${cut}px); white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; ${C.title || ''}`;
        },
        art: art(shape, r), artAs: art };
    },
    // Your profile picture: the theme's circle with your initial, or a ring around your photo.
    me: (ch, photo) => el => paint(el, 'avatar', { ch, photo: !!photo }),
    tile: ch => el => paint(el, 'tile', { ch }),
    card: o => el => paint(el, 'card', o),
    T
  };
  return api;
}
