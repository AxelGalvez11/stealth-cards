import { A, R, di, mo, motifName, lay, face, banner, BANNER_X } from './kit.js';

// Rubber hose: a 1930s cartoon. Thick ink outlines, pie-cut eyes, white gloves, and Lu, the flashcard mascot. Covers
// are sunbursts with a character for the deck's subject; the card is plain cream with a hard ink shadow.
// Everything is inline SVG with no ids or url() refs. Outlines use the "stroke behind" trick: draw the shapes with a
// thick black stroke first, then the same shapes filled on top, so overlapping parts share one outline.
const INK = '#1A1A1A';
const RH = { peach: '#FBD9C3', peach2: '#F6C6A8', orange: '#F58A5E', teal: '#63D3C4', yellow: '#FFD84D', cream: '#FFF6E6', pink: '#FF9DB0', purple: '#B9A2FF', green: '#1F5E57', red: '#F0624D', blue: '#7FA8FF' };

const f = n => Math.round(n * 100) / 100;
const blob = (shapes, fill, ow) => `<g fill="${INK}" stroke="${INK}" stroke-width="${ow * 2}" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;

// ---------- face ----------
function pieEye(ex, ey, a, b) {
  const P = th => [f(ex + a * Math.cos(th * Math.PI / 180)), f(ey + b * Math.sin(th * Math.PI / 180))];
  const [x1, y1] = P(-104), [x2, y2] = P(-38);
  return `<ellipse cx="${ex}" cy="${ey}" rx="${a}" ry="${b}" fill="${INK}"/><path d="M${f(ex + a * 0.12)} ${f(ey - b * 0.2)} L${x1} ${y1} A${a} ${b} 0 0 1 ${x2} ${y2} Z" fill="#FFFFFF"/>`;
}
function rhFace(cx, cy, s = 1, { wink = true, tongue = true, cheeks = RH.orange } = {}) {
  const k = v => f(v * s);
  const eyeL = pieEye(f(cx - 15 * s), f(cy - 6 * s), k(7), k(10.5));
  const eyeR = wink
    ? `<path d="M${f(cx + 6 * s)} ${f(cy - 3 * s)} Q${f(cx + 15 * s)} ${f(cy - 15 * s)} ${f(cx + 24 * s)} ${f(cy - 3 * s)}" fill="none" stroke="${INK}" stroke-width="${k(4.2)}" stroke-linecap="round"/><path d="M${f(cx + 23 * s)} ${f(cy - 6 * s)} l${k(5)} ${k(-3)}" stroke="${INK}" stroke-width="${k(3)}" stroke-linecap="round"/>`
    : pieEye(f(cx + 15 * s), f(cy - 6 * s), k(7), k(10.5));
  const mx = cx, my = cy + 8 * s;
  const mouth = `<path d="M${f(mx - 21 * s)} ${f(my)} Q${f(mx)} ${f(my + 5 * s)} ${f(mx + 21 * s)} ${f(my)} Q${f(mx + 18 * s)} ${f(my + 24 * s)} ${f(mx)} ${f(my + 24 * s)} Q${f(mx - 18 * s)} ${f(my + 24 * s)} ${f(mx - 21 * s)} ${f(my)} Z" fill="${INK}" stroke="${INK}" stroke-width="${k(2)}" stroke-linejoin="round"/>`;
  const tng = tongue ? `<path d="M${f(mx - 9 * s)} ${f(my + 19 * s)} Q${f(mx)} ${f(my + 11 * s)} ${f(mx + 9 * s)} ${f(my + 19 * s)} Q${f(mx + 5 * s)} ${f(my + 23 * s)} ${f(mx)} ${f(my + 23 * s)} Q${f(mx - 5 * s)} ${f(my + 23 * s)} ${f(mx - 9 * s)} ${f(my + 19 * s)} Z" fill="#F0624D"/>` : '';
  const dimples = `<path d="M${f(mx - 25 * s)} ${f(my - 3 * s)} q${k(3)} ${k(3)} ${k(4)} ${k(7)}M${f(mx + 25 * s)} ${f(my - 3 * s)} q${k(-3)} ${k(3)} ${k(-4)} ${k(7)}" fill="none" stroke="${INK}" stroke-width="${k(2.6)}" stroke-linecap="round"/>`;
  const ch = cheeks ? `<ellipse cx="${f(cx - 27 * s)}" cy="${f(cy + 9 * s)}" rx="${k(6)}" ry="${k(3.6)}" fill="${cheeks}" opacity=".55"/><ellipse cx="${f(cx + 27 * s)}" cy="${f(cy + 9 * s)}" rx="${k(6)}" ry="${k(3.6)}" fill="${cheeks}" opacity=".55"/>` : '';
  return ch + eyeL + eyeR + mouth + tng + dimples;
}

// ---------- gloves, shoes, limbs ----------
// Local frame: wrist at 0,0, fingers pointing up (-y).
function glove(x, y, rot, s = 1, kind = 'open', ow = 2.6) {
  const open = `<rect x="-10" y="-10" width="20" height="11" rx="5.5"/><ellipse cx="0" cy="-20" rx="12.5" ry="11.5"/><rect x="-12.5" y="-39" width="8.4" height="22" rx="4.2"/><rect x="-4.2" y="-42" width="8.4" height="25" rx="4.2"/><rect x="4.2" y="-38" width="8.4" height="21" rx="4.2"/><rect x="-4.2" y="-15" width="8.4" height="16" rx="4.2" transform="translate(-10 -17) rotate(-58)"/>`;
  const fist = `<rect x="-10" y="-10" width="20" height="11" rx="5.5"/><circle cx="0" cy="-21" r="13"/><rect x="-11" y="-44" width="9.5" height="20" rx="4.75"/>`;
  const detail = kind === 'open'
    ? `<path d="M-4.2 -26 V-31 M4.2 -26 V-30 M-9 -9.5 Q0 -7 9 -9.5" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/><path d="M-5 -15 V-19 M0 -14 V-19 M5 -15 V-19" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>`
    : `<path d="M1 -31 Q11 -31 12 -26 M2 -23 Q13 -23 13 -17 M2 -15 Q11 -15 11 -11 M-9 -9.5 Q0 -7 9 -9.5" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})">${blob(kind === 'open' ? open : fist, '#FFFFFF', ow)}${detail}</g>`;
}
function shoe(x, y, dir = 1, s = 1, ow = 2.8) {
  const sh = `<rect x="-7" y="-4" width="14" height="12" rx="4"/><path d="M-12 12 C-14 0 2 -2 12 1 C22 3 30 6 30 13 C30 20 20 22 6 22 C-6 22 -12 20 -12 12 Z"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${dir * s} ${s})">${blob(sh, '#FFFFFF', ow)}<path d="M-11 17 C0 21 18 21 29 16 C28 20 20 22.5 6 22.5 C-4 22.5 -10 21 -11 17 Z" fill="#D8D2C8"/><path d="M-6 -1 H6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="16" cy="6.5" rx="6" ry="2.6" fill="#FFFFFF" opacity=".9"/></g>`;
}
const limb = (d, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const starPath = (cx, cy, R, r = R * 0.45, pts = 5, rot = -90) => {
  let d = '';
  for (let i = 0; i < pts * 2; i++) {
    const a = (rot + i * 180 / pts) * Math.PI / 180, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + f(cx + rr * Math.cos(a)) + ' ' + f(cy + rr * Math.sin(a));
  }
  return d + 'Z';
};
const star = (cx, cy, R, fill, ow = 2.4) => `<path d="${starPath(cx, cy, R)}" fill="${fill}" stroke="${INK}" stroke-width="${ow}" stroke-linejoin="round"/>`;
const starLine = (cx, cy, R, color, w = 2.6) => `<path d="${starPath(cx, cy, R)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;
const sparkle = (cx, cy, R, fill) => `<path d="M${cx} ${cy - R} Q${f(cx + R * 0.16)} ${f(cy - R * 0.16)} ${cx + R} ${cy} Q${f(cx + R * 0.16)} ${f(cy + R * 0.16)} ${cx} ${cy + R} Q${f(cx - R * 0.16)} ${f(cy + R * 0.16)} ${cx - R} ${cy} Q${f(cx - R * 0.16)} ${f(cy - R * 0.16)} ${cx} ${cy - R} Z" fill="${fill}"/>`;

// ---------- Lu, the flashcard mascot ----------
// viewBox 0 0 220 240; card body centered near 110,92.
function mascot(pose = 'wave', { w = 220, card = RH.cream, blink = false } = {}) {
  const OW = 3;
  const armW = 8.5, legW = 9.5;
  let arms = '', hands = '';
  if (pose === 'wave') {
    arms = limb('M166 96 C196 92 206 62 196 36', armW) + limb('M56 100 C22 100 16 128 40 134', armW);
    hands = glove(196, 36, 12, 1.05, 'open') + glove(44, 134, 96, 1.0, 'fist');
  } else if (pose === 'cheer') {
    arms = limb('M166 94 C194 86 204 56 198 30', armW) + limb('M54 100 C26 92 18 60 26 34', armW);
    hands = glove(198, 30, 8, 1.05, 'fist') + glove(26, 34, -10, 1.05, 'open');
  } else if (pose === 'point') {
    arms = limb('M166 98 C188 98 200 80 214 66', armW) + limb('M56 100 C22 100 16 128 40 134', armW);
    hands = glove(214, 66, 52, 1.05, 'open') + glove(44, 134, 96, 1.0, 'fist');
  } else if (pose === 'thumbs') {
    arms = limb('M166 98 C194 104 200 128 192 140', armW) + limb('M54 104 C28 110 24 138 36 156', armW);
    hands = glove(190, 132, 0, 1.1, 'fist') + glove(36, 156, 168, 1.05, 'fist');
  }
  const legs = limb('M92 138 C90 164 76 180 80 204', legW) + limb('M130 138 C134 166 150 178 144 202', legW);
  const feet = shoe(80, 204, -1, 1.05) + shoe(144, 202, 1, 1.05);
  const body = `<g transform="rotate(-6 110 92)">
    <g fill="${INK}" stroke="${INK}" stroke-width="${OW * 2}" stroke-linejoin="round"><rect x="46" y="44" width="128" height="96" rx="14"/></g>
    <rect x="46" y="44" width="128" height="96" rx="14" fill="${card}"/>
    <path d="M52 66 H168" stroke="#F0624D" stroke-width="2" opacity=".75"/>
    <path d="M52 84 H168 M52 101 H168 M52 118 H168" stroke="#7FA8FF" stroke-width="1.6" opacity=".45"/>
    <path d="M52 50 Q54 46 60 46 H104" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    <path d="M168 132 Q168 136 162 136 H150" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="4" stroke-linecap="round"/>
    ${rhFace(110, 94, 1.1, { wink: !blink })}
  </g>`;
  const shadow = `<ellipse cx="112" cy="226" rx="58" ry="7" fill="rgba(0,0,0,.14)"/>`;
  const h = Math.round(w * 240 / 220);
  return `<svg width="${w}" ${w === '100%' ? '' : `height="${h}"`} viewBox="0 0 220 240" aria-hidden="true" style="display: block; overflow: visible;">${shadow}${legs}${feet}${arms}${body}${hands}</svg>`;
}

// ---------- subject characters for deck covers (viewBox 0 0 140 140) ----------
function arms2(lx, ly, rx, ry, s = 0.62, wave = 'right') {
  const w = 5.5;
  const up = wave === 'right'
    ? limb(`M${rx} ${ry} C${rx + 16} ${ry - 2} ${rx + 22} ${ry - 18} ${rx + 18} ${ry - 32}`, w) + limb(`M${lx} ${ly} C${lx - 14} ${ly + 4} ${lx - 18} ${ly + 18} ${lx - 12} ${ly + 28}`, w)
    : limb(`M${rx} ${ry} C${rx + 14} ${ry + 4} ${rx + 18} ${ry + 18} ${rx + 12} ${ry + 28}`, w) + limb(`M${lx} ${ly} C${lx - 16} ${ly - 2} ${lx - 22} ${ly - 18} ${lx - 18} ${ly - 32}`, w);
  const g = wave === 'right'
    ? glove(rx + 18, ry - 32, 10, s, 'open', 3.2) + glove(lx - 12, ly + 28, 190, s, 'fist', 3.2)
    : glove(rx + 12, ry + 28, 170, s, 'fist', 3.2) + glove(lx - 18, ly - 32, -10, s, 'open', 3.2);
  return [up, g];
}
const OWc = 3.2;
const out = (shapes, fill) => blob(shapes, fill, OWc);
const CHAR = {
  cell: () => {
    const [a, g] = arms2(34, 80, 106, 76);
    return a + out(`<path d="M70 26 C96 22 116 40 114 66 C113 92 98 112 70 112 C42 113 24 94 26 68 C27 42 44 28 70 26 Z"/>`, '#FFB3C1') + `<ellipse cx="92" cy="46" rx="11" ry="9" fill="#F07A93" stroke="${INK}" stroke-width="2.4"/><ellipse cx="89" cy="43" rx="3.5" ry="2.5" fill="#FFFFFF" opacity=".8"/><circle cx="42" cy="92" r="3" fill="#F07A93"/><circle cx="50" cy="100" r="2" fill="#F07A93"/><path d="M44 40 Q52 33 62 32" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".85"/>` + rhFace(68, 74, 0.82) + g;
  },
  cloud: () => {
    const [a, g] = arms2(30, 88, 112, 86);
    return a + out(`<circle cx="50" cy="72" r="22"/><circle cx="76" cy="58" r="28"/><circle cx="100" cy="76" r="20"/><rect x="30" y="72" width="88" height="30" rx="15"/>`, '#FFFFFF') + `<path d="M58 42 Q68 33 82 34" fill="none" stroke="#DDEBFF" stroke-width="5" stroke-linecap="round"/>` + rhFace(74, 76, 0.78, { cheeks: RH.pink }) + g;
  },
  onigiri: () => {
    const [a, g] = arms2(34, 88, 106, 88);
    return a + out(`<path d="M70 22 C78 22 84 30 92 44 L112 84 C120 100 112 116 94 116 H46 C28 116 20 100 28 84 L48 44 C56 30 62 22 70 22 Z"/>`, '#FFFFFF') + `<rect x="46" y="94" width="48" height="24" rx="3" fill="#1F3B34" stroke="${INK}" stroke-width="2.6"/><path d="M58 38 Q64 30 70 30" fill="none" stroke="#EDEDED" stroke-width="4" stroke-linecap="round"/>` + rhFace(70, 66, 0.72, { cheeks: RH.pink }) + g;
  },
  flask: () => {
    const [a, g] = arms2(38, 92, 102, 92);
    return a + out(`<rect x="56" y="18" width="28" height="12" rx="4"/><path d="M60 28 H80 V52 L108 100 C114 112 106 122 94 122 H46 C34 122 26 112 32 100 L60 52 Z"/>`, '#E9FBFF') + `<path d="M44 86 C58 80 80 92 97 84 L106 100 C111 111 104 119 94 119 H46 C36 119 29 111 34 100 Z" fill="#7BE3A8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="58" cy="104" r="3.4" fill="#FFFFFF" opacity=".8"/><circle cx="80" cy="98" r="2.4" fill="#FFFFFF" opacity=".8"/><path d="M66 34 V50" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>` + rhFace(70, 70, 0.62, { cheeks: RH.pink }) + g;
  },
  scroll: () => {
    const [a, g] = arms2(30, 80, 110, 80);
    return a + out(`<rect x="34" y="30" width="72" height="82" rx="6"/><rect x="26" y="20" width="88" height="16" rx="8"/><rect x="26" y="106" width="88" height="16" rx="8"/>`, '#FBE7B8') + `<path d="M34 28 H106 M34 114 H106" stroke="#E2C27E" stroke-width="3"/><path d="M48 96 H92" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".35"/>` + rhFace(70, 64, 0.74) + g;
  },
  // for decks about something else: a little flashcard with Lu's face
  card: () => {
    const [a, g] = arms2(30, 84, 110, 82);
    return a + out(`<rect x="28" y="34" width="84" height="66" rx="10"/>`, RH.cream) + `<path d="M36 44 Q37 40 44 40 H74" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".9"/><path d="M104 92 Q104 95 100 95 H92" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="3.4" stroke-linecap="round"/>` + rhFace(70, 64, 0.7) + g;
  },
  bone: () => {
    const [a, g] = arms2(40, 84, 100, 84);
    return a + out(`<circle cx="34" cy="50" r="15"/><circle cx="34" cy="90" r="15"/><circle cx="106" cy="50" r="15"/><circle cx="106" cy="90" r="15"/><rect x="30" y="54" width="80" height="32" rx="16"/>`, '#FFFFFF') + `<path d="M26 42 Q30 37 36 37" fill="none" stroke="#E9E3D8" stroke-width="4" stroke-linecap="round"/>` + rhFace(70, 66, 0.66, { cheeks: RH.pink }) + g;
  },
};
const charSvg = (key, s = '100%') => `<svg width="${s}" ${s === '100%' ? '' : `height="${s}"`} viewBox="0 0 140 140" aria-hidden="true" style="display: block; overflow: visible;">${CHAR[key]()}</svg>`;


// ---------- the theme ----------
const TITAN = "'Titan One', 'Arial Rounded MT Bold', system-ui, sans-serif";
const FRED = "Fredoka, 'Arial Rounded MT Bold', system-ui, sans-serif";
// Six cover colors, and the character for each subject (Japanese gets an onigiri, chemistry a flask, history a scroll).
const PAL = [['Teal', RH.teal], ['Yellow', RH.yellow], ['Red', RH.red], ['Purple', RH.purple], ['Blue', RH.blue], ['Pink', RH.pink]];
const CHAR_OF = { cell: 'cell', cloud: 'cloud', torii: 'onigiri', benzene: 'flask', quill: 'scroll', bone: 'bone' };
// The deck name's ink outline (bigger names get a thicker one).
const OUT = `text-shadow: 2px 0 ${INK}, -2px 0 ${INK}, 0 2px ${INK}, 0 -2px ${INK}, 1.5px 1.5px ${INK}, -1.5px -1.5px ${INK}, 1.5px -1.5px ${INK}, -1.5px 1.5px ${INK}, 4px 4px 0 ${INK};`;
const OUT_S = `text-shadow: 1.5px 0 ${INK}, -1.5px 0 ${INK}, 0 1.5px ${INK}, 0 -1.5px ${INK}, 1px 1px ${INK}, -1px -1px ${INK}, 1px -1px ${INK}, -1px 1px ${INK}, 2.5px 2.5px 0 ${INK};`;
const svg40 = inner => `<svg width="100%" viewBox="0 0 40 40" style="display: block; overflow: visible;">${inner}</svg>`;

export default {
  key: 'hose', board: 'Rubber', name: 'Rubber hose', dark: false, fonts: 'family=Titan+One&family=Fredoka:wght@400;500;600;700&',
  line: '1930s cartoon: thick outlines, pie-cut eyes, white gloves, and Lu the flashcard.',
  assets: { doodle: 'doodle.svg' },
  css: `.rh-bg{background-color:${RH.peach};background-image:url(%%doodle%%);background-size:360px 360px}
.rh-dots{background-image:radial-gradient(rgba(26,26,26,.15) 1.4px,transparent 1.8px);background-size:10px 10px}`,
  bg(w, h) {
    const L = lay(w, h), big = L === 'wide', mid = L === 'mid';
    const deco = big
      ? A('left: 7%; top: 12%; width: 64px; transform: rotate(-12deg);', svg40(starLine(20, 20, 18, RH.green, 2.6))) + A('right: 9%; top: 16%; width: 46px; transform: rotate(10deg);', svg40(star(20, 20, 17, RH.orange, 2.4))) + A('right: 6%; bottom: 14%; width: 70px; transform: rotate(-8deg);', svg40(star(20, 20, 17, RH.teal, 2.2))) + A('left: 20%; top: 8%; width: 30px;', svg40(sparkle(20, 20, 20, '#FFFFFF')))
        + A(`left: ${R(w * 0.06)}px; bottom: ${R(h * 0.07)}px; width: ${R(Math.min(w, 1440) * 0.17)}px;`, mascot('point', { w: '100%' }))
      : mid ? A('left: 34px; bottom: 40px; width: 150px;', mascot('cheer', { w: '100%' })) + A('right: 9%; top: 9%; width: 40px; transform: rotate(10deg);', svg40(star(20, 20, 17, RH.orange, 2.4))) + A('left: 8%; top: 10%; width: 48px; transform: rotate(-12deg);', svg40(starLine(20, 20, 18, RH.green, 2.6)))
      : L === 'tall' ? A('right: 18px; top: 118px; width: 34px; transform: rotate(12deg);', svg40(star(20, 20, 17, RH.orange, 2.6))) + A('right: 26px; bottom: 150px; width: 40px; transform: rotate(-10deg);', svg40(starLine(20, 20, 18, RH.green, 2.8)))
      : A('right: 10%; top: 12%; width: 16%; transform: rotate(12deg);', svg40(star(20, 20, 17, RH.orange, 2.6)));
    return `<div class="rh-bg" style="position: absolute; inset: 0;"></div><div style="position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,240,228,.55), rgba(255,240,228,0) 70%);"></div>${deco}`;
  },
  // Plain cream, a thick ink edge and a hard ink shadow, and a yellow star stuck on its corner.
  face(w, h, o) {
    const bw = w > 400 ? 4 : 3, sh = w > 400 ? 9 : w > 250 ? 6 : 4;
    return face(`border-radius: ${o.r}px; background-color: ${RH.cream}; color: ${INK}; box-shadow: inset 0 0 0 ${bw}px ${INK}, ${sh}px ${sh}px 0 ${INK}; font-family: ${FRED};`,
      () => (w > 250 ? A(`right: ${R(w * 0.04)}px; top: ${-R(w * 0.035)}px; width: ${R(w * 0.1)}px; transform: rotate(14deg);`, svg40(star(20, 20, 17, RH.yellow, 2.4))) : ''),
      { q: 'font-weight: 500; color: #7A5E4C;', qs: 0.46, a: 'font-weight: 600;' }, { ink: INK, paper: RH.cream, muted: '#7A5E4C' });
  },
  cover(d, o) {
    const i = di(d), [pname, col] = PAL[i], k = mo(d), ch = CHAR_OF[k] || 'card', shape = o.shape, big = o.w > 200, r = o.r;
    return {
      bg: col, cls: 'rh-dots', ink: col === RH.yellow || col === RH.pink ? 'dark' : 'light', name: `${pname} · ${motifName(k)}`, ts: 1.1,
      title: `font-family: ${TITAN}; font-weight: 400; letter-spacing: .01em; color: #FFFFFF; ${(o.fs || 19) >= 24 ? OUT : OUT_S}`,
      shadow: `${big ? 6 : 4}px ${big ? 6 : 4}px 0 ${INK}`,
      draw() {
        const art = shape === 'wide' ? 'right: 10%; top: 13%; width: 40%;' : shape === 'square' ? 'left: 8%; top: 10%; width: 84%;' : 'right: -2%; top: 5%; width: 70%;';
        // A wide header gets its character on the right, clear of the buttons in its corners.
        const wideArt = banner(o) ? `left: ${R(o.w * BANNER_X - o.h * 0.45)}px; top: 5%; width: ${R(o.h * 0.9)}px;` : art;
        return `<span style="position: absolute; inset: -40%; background: repeating-conic-gradient(from 0deg at ${banner(o) ? R(BANNER_X * 100) + '% 50%' : shape === 'wide' ? '75% 45%' : '62% 38%'}, rgba(255,255,255,.22) 0deg 9deg, rgba(255,255,255,0) 9deg 18deg);"></span>`
          // (a wide cover's top left has the deck's tags on it, so its star goes low, by the character)
          + (shape === 'square' ? '' : A(shape === 'wide' && !banner(o) ? 'left: 45%; top: 58%; width: 6%; transform: rotate(-10deg);' : `left: 7%; top: 9%; width: ${banner(o) ? R(o.h * 0.14) + 'px' : '13%'};`, svg40(star(20, 20, 17, '#FFFFFF', 2.6))) + A(`left: ${banner(o) ? R(BANNER_X * 100 - 12) : shape === 'wide' ? 44 : 30}%; top: ${shape === 'wide' ? 10 : 30}%; width: ${banner(o) ? R(o.h * 0.08) + 'px' : shape === 'wide' ? '4%' : '8%'};`, svg40(sparkle(20, 20, 20, '#FFFFFF'))))
          + A(wideArt, charSvg(ch)) + A(`inset: 0; border-radius: ${r}px; box-shadow: inset 0 0 0 ${big ? 3.5 : 3}px ${INK};`);
      },
    };
  },
  avatar(s, ch) {
    const ring = Math.max(2, R(s / 22)), sh = Math.max(2, R(s / 18));
    const sticker = s >= 56 ? A(`right: ${-R(s * 0.06)}px; top: ${-R(s * 0.08)}px; width: ${R(s * 0.38)}px; transform: rotate(14deg);`, svg40(star(20, 20, 17, RH.yellow, 2.6))) : '';
    return `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; box-sizing: border-box; border-radius: 50%; background: ${RH.orange}; box-shadow: inset 0 0 0 ${ring}px ${INK}, ${sh}px ${sh}px 0 ${INK}; display: flex; align-items: center; justify-content: center;"><span style="position: absolute; left: 22%; top: 14%; width: 26%; height: 16%; border-radius: 50%; background: rgba(255,255,255,.55); transform: rotate(-24deg);"></span><span style="position: relative; font-family: ${TITAN}; font-size: ${R(s * 0.5)}px; line-height: 1; color: #FFFFFF; transform: translateY(${-R(s * 0.02)}px); ${s >= 56 ? OUT : OUT_S}">${ch}</span>${sticker}</span>`;
  },
  // around your photo: the thick ink ring and hard shadow (and the star, on a big one)
  frame: s => { const ring = Math.max(2, R(s / 22)), sh = Math.max(2, R(s / 18)); return `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 ${ring}px ${INK}, ${sh}px ${sh}px 0 ${INK}; pointer-events: none;"></span>` + (s >= 56 ? A(`right: ${-R(s * 0.06)}px; top: ${-R(s * 0.08)}px; width: ${R(s * 0.38)}px; transform: rotate(14deg);`, svg40(star(20, 20, 17, RH.yellow, 2.6))) : ''); },
};
