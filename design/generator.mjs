// Seeded gradient generator: every deck (or card) gets its own gradient from its name.
// Styles: 'vivid' (the case-study cards: one strong color, a warm or cool accent pooling in a corner,
// darker folds for depth), 'deep' (dark and moody), 'clear' (pale and silky), or 'mix' / null,
// which is mostly vivid and some deep (clear only when asked for by name). A number 0..1 still works:
// 0 = deep, 1 = clear. The same seed always gives the same gradient.
// Exported as source text so it can live inside each artboard's logic class.
export const GEN_METHOD = String.raw`gen(seed, mode) {
  // Starting value picked so the sample decks get a varied set; any value is equally random.
  let h = 2300790937;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const norm = x => ((x % 360) + 360) % 360;
  const rgb = (hh, ss, ll) => { ss /= 100; ll /= 100; const k = n => (n + hh / 30) % 12; const a = ss * Math.min(ll, 1 - ll); const f = n => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)]; };
  const lum = ([r, g, b]) => { const L = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b); };
  const hsl = (hh, l, ss) => 'hsl(' + norm(hh).toFixed(0) + ' ' + ss.toFixed(0) + '% ' + Math.max(4, Math.min(97, l)).toFixed(0) + '%)';
  const id = (h >>> 0).toString(36);
  let kind = mode, c = 0;
  if (typeof mode === 'number') { c = mode; kind = c < 0.5 ? 'deep' : 'clear'; }
  else {
    if (mode == null || mode === 'mix') kind = rnd() < 0.7 ? 'vivid' : 'deep';
    c = kind === 'clear' ? 0.76 + rnd() * 0.24 : kind === 'deep' ? 0.02 + rnd() * 0.26 : 0;
  }
  if (kind === 'vivid') {
    // Families from the references, as [hue, saturation, lightness]: main, light, dark, accent, second accent,
    // fold angle, roundness (0 = long silky folds, 1 = soft round clouds), and how big the accent is.
    const F = [
      [[270, 44, 58], [262, 46, 72], [292, 50, 44], [6, 78, 60], [312, 44, 66], 0, 0.1, 1],
      [[20, 88, 54], [27, 94, 62], [10, 50, 25], [282, 16, 50], [8, 82, 48], -38, 0.15, 1],
      [[13, 78, 48], [18, 88, 60], [8, 72, 30], [212, 70, 66], [20, 88, 71], 18, 0.85, 1.5],
      [[199, 82, 46], [195, 80, 58], [210, 86, 29], [348, 76, 82], [350, 70, 76], 58, 0.3, 1.45],
      [[238, 60, 58], [284, 46, 52], [236, 52, 30], [352, 74, 66], [18, 88, 71], 86, 0.55, 1.2],
      [[229, 66, 50], [226, 70, 60], [231, 64, 29], [330, 58, 64], [352, 62, 58], -36, 0.35, 1.4],
      [[318, 58, 46], [326, 64, 60], [290, 52, 26], [24, 92, 58], [18, 88, 72], 12, 0.3, 1.2],
      [[190, 72, 40], [186, 66, 54], [205, 76, 23], [10, 82, 64], [22, 88, 72], -24, 0.45, 1.35],
      [[350, 72, 50], [356, 80, 62], [340, 64, 28], [258, 58, 62], [268, 52, 74], 30, 0.4, 1.3],
      [[248, 54, 48], [252, 60, 63], [246, 56, 26], [20, 90, 70], [8, 78, 62], -12, 0.5, 1.2]
    ];
    const fam = Math.floor(rnd() * F.length), [dom, lite, dark, acc, acc2, flow0, round, big] = F[fam];
    const dh = (rnd() - 0.5) * 14, fx = rnd() < 0.5, fy = rnd() < 0.4;
    const vc = ([hh, ss, ll], dl = 0) => hsl(hh + dh, ll + dl, ss);
    const X = x => +(fx ? 100 - x : x).toFixed(1), Y = y => +(fy ? 100 - y : y).toFixed(1);
    const flow = (flow0 + (rnd() - 0.5) * 14) * (fx !== fy ? -1 : 1);
    const j = () => (rnd() - 0.5) * 12, k = () => 0.8 + rnd() * 0.4;
    const blob = (cc, x, y, w, ht, rot = flow) => ({ c: cc, x: X(x + j()), y: Y(y + j()), rx: +(w * k()).toFixed(1), ry: +(ht * k()).toFixed(1), r: +rot.toFixed(1) });
    let a = 225; if (fx) a = 360 - a; if (fy) a = 180 - a;
    const o = { base: 'linear-gradient(' + Math.round(norm(a)) + 'deg, ' + vc(lite) + ' 0%, ' + vc(dom) + ' 52%, ' + vc(dark, 6) + ' 100%)',
      fid: 'sc-gen-' + id, sid: 'sc-gens-' + id, blur: '9', sblur: '5.5', disp: '24', clarity: 0, kind: 'Vivid', fam };
    o.b0 = blob(vc(acc), 6, 94, (26 + 14 * round) * big, (26 + 14 * round) * big);
    o.b1 = blob(vc(acc2), 24 * big, 86, (12 + 10 * round) * big, (18 + 8 * round) * big);
    o.b2 = blob(vc(dark), 18, 36, 8 + 16 * round, 64 - 30 * round);
    o.b3 = blob(vc(lite, 2), 72, 18, 12 + 14 * round, 60 - 24 * round);
    o.b4 = blob(vc(dom), 52, 56, 9 + 16 * round, 66 - 30 * round);
    o.b5 = blob(vc(dark, 8), 90, 88, 10 + 16 * round, 40 - 10 * round);
    const silk = round < 0.5, none = { c: 'transparent', x: 0, y: 0, rx: 0, ry: 0, r: 0 };
    o.s0 = silk ? { c: vc(lite, 4), x: X(42 + j()), y: 50, rx: 4.5, ry: 80, r: +flow.toFixed(1) } : none;
    o.s1 = silk ? { c: vc(dark, 4), x: X(66 + j()), y: 50, rx: 3.5, ry: 80, r: +flow.toFixed(1) } : none;
    o.ink = '#FFFFFF'; o.glass = 'rgba(255,255,255,.14)'; o.glassLine = 'rgba(255,255,255,.6)'; o.shadow = '0 1px 14px rgba(0,0,0,.18)';
    return o;
  }
  const mix = (a, b) => a + (b - a) * c;
  let hue = rnd() * 360;
  // Deep yellows and yellow-greens turn olive and muddy; nudge them to amber or green.
  if (c < 0.6 && hue > 46 && hue < 100) hue = hue < 73 ? 32 + rnd() * 8 : 118 + rnd() * 20;
  let hue2 = hue + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 30);
  const n2 = norm(hue2);
  if (c < 0.6 && n2 > 46 && n2 < 100) hue2 = n2 < 73 ? 28 : 124;
  const sat = mix(52, 88), lo = mix(16, 62), hi = mix(70, 90);
  const col = (hh, l, ss) => hsl(hh, l, ss == null ? sat : ss);
  const tilt = (rnd() - 0.5) * 50;
  const angle = Math.round(rnd() * 360);
  const lMid = (lo + hi) / 2;
  const base = 'linear-gradient(' + angle + 'deg, ' + col(hue, hi) + ' 0%, ' + col(hue, lMid) + ' 45%, ' + col(hue2, mix(lo + 6, lMid)) + ' 100%)';
  const o = { base, fid: 'sc-gen-' + id, sid: 'sc-gens-' + id,
    blur: mix(9, 6).toFixed(1), sblur: mix(4, 3).toFixed(1), disp: mix(26, 9).toFixed(0), clarity: c, kind: c < 0.5 ? 'Deep' : 'Clear', hue: Math.round(norm(hue)) };
  for (let i = 0; i < 6; i++) {
    const hh = i % 2 ? hue2 : hue, span = (hi - lo) * 0.45, l = rnd() < 0.5 ? lo + rnd() * span : hi - rnd() * span;
    o['b' + i] = { c: col(hh, l), x: +(rnd() * 100).toFixed(1), y: +(rnd() * 100).toFixed(1),
      rx: +(mix(34, 11) * (0.7 + rnd() * 0.6)).toFixed(1), ry: +(mix(26, 72) * (0.7 + rnd() * 0.6)).toFixed(1), r: +(tilt * c).toFixed(1) };
  }
  for (let i = 0; i < 2; i++) {
    const on = c > 0.45;
    o['s' + i] = on ? { c: col(hue, Math.min(95, hi + 4), sat * 0.8), x: +(8 + rnd() * 84).toFixed(1), y: 50, rx: +(1.5 + rnd() * 2 * c).toFixed(1), ry: 80, r: +tilt.toFixed(1) }
      : { c: 'transparent', x: 0, y: 0, rx: 0, ry: 0, r: 0 };
  }
  // Text color: whichever of black or white reads better on the middle of the card.
  const Lm = lum(rgb(norm(hue), sat, lMid));
  const white = 1.05 / (Lm + 0.05), black = (Lm + 0.05) / 0.05;
  const dark = white > black;
  o.ink = dark ? '#FFFFFF' : '#000000';
  o.glass = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.34)';
  o.glassLine = dark ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.22)';
  o.shadow = dark ? '0 1px 14px rgba(0,0,0,.16)' : 'none';
  return o;
}`;

// Node-side copy for previews and tests.
export const gen = new Function('return {' + GEN_METHOD + '}')().gen;
