// Copies what the iPhone app (ios/) shares with the design canvas into Swift: the theme colors, the icons, the gradient
// palettes (plus the site's Midnight, for the Learn sheet's deep top), tag colors, the sign-in wall's cards, and the canvas's sample data. Run it after changing any of those.
import { readFileSync, writeFileSync } from 'node:fs';
import { PALETTES, PALETTE_NAMES, SITE_PALETTES } from './surfaces.mjs';
import { WALL_CARDS } from './wall.mjs';
import { SAMPLE } from './mock.mjs';
import { G_LOGO, APPLE_LOGO } from './logos.mjs';

const OUT = new URL('../ios/Lucida/Design/Generated.swift', import.meta.url);
const src = readFileSync(new URL('./build.mjs', import.meta.url), 'utf8');
const grab = (re, what) => { const m = src.match(re); if (!m) throw new Error('Could not find ' + what + ' in build.mjs'); return m; };
const evalJs = code => new Function('return (' + code + ')')();

// The two themes from the boards' theme(d).
const th = grab(/\? (\{ bg: '#000000'[^}]+\})\n\s+: (\{ bg: '#FFFFFF'[^}]+\})/, 'the theme');
const dark = evalJs(th[1]), light = evalJs(th[2]);
// Icons: stroke drawings on a 24 x 24 grid.
const I = evalJs(grab(/const I = (\{[\s\S]*?\n\});/, 'the icons')[1]);
// Tag colors.
const tagC = evalJs(grab(/const tagC = (\{[\s\S]*?\});/, 'tag colors')[1]);
const tagPal = evalJs(grab(/const tagPal = (\[[^\]]*\]);/, 'the tag palette')[1]);
// The AI apps' logos on Connect AI: each drawn once to read its box and shapes. A fill written as {{...}} follows the
// theme (the text color, or Cursor's own ink).
// Sign in with Apple and Google: their logos as the boards draw them (design/logos).
const APPLE = APPLE_LOGO, GOOGLE = G_LOGO;
const LOGO = evalJs(grab(/const LOGO = (\{[\s\S]*?\n\});/, 'the logos')[1]);
const logos = Object.fromEntries(Object.entries(LOGO).map(([name, fn]) => {
  const svg = fn(20), vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const evenOdd = /fill-rule="evenodd"/.test(svg);
  const paths = [...svg.matchAll(/<path([^>]*)\sd="([^"]+)"/g)].map(m => {
    const fill = (m[1].match(/fill="([^"]+)"/) || [, ''])[1];
    return { d: m[2], fill: /^#/.test(fill) ? fill : fill.includes('cursorInk') ? 'cursor' : 'text', evenOdd: evenOdd || /fill-rule="evenodd"/.test(m[1]) };
  });
  return [name, { vb, paths }];
}));

const str = s => JSON.stringify(s);
const hex = c => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) throw new Error('Not a hex color: ' + c); return '0x' + m[1].toUpperCase(); };
// A CSS color as Swift: hex, rgba(), or transparent.
const color = c => {
  if (c === 'transparent') return '.clear';
  if (/^#[0-9a-f]{6}$/i.test(c)) return `RGBA(${hex(c)})`;
  const m = /^rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/.exec(c);
  if (m) return `RGBA(r: ${+m[1]}, g: ${+m[2]}, b: ${+m[3]}, a: ${+m[4]})`;
  return null;
};
const themeSwift = t => Object.entries(t).filter(([k]) => color(t[k])).map(([k, v]) => `${k}: ${color(v)}`).join(', ');
const shape = b => `Blob(c: RGBA(${hex(b[0])}), x: ${b[1]}, y: ${b[2]}, rx: ${b[3]}, ry: ${b[4]}, r: ${b[5] || 0})`;
const linear = css => {
  const m = /^linear-gradient\((-?[\d.]+)deg,\s*(.*)\)$/.exec(css);
  const stops = m[2].split(/,\s*(?=#)/).map(s => { const [c, at] = s.trim().split(/\s+/); return `(RGBA(${hex(c)}), ${parseFloat(at) / 100})`; });
  return `angle: ${m[1]}, stops: [${stops.join(', ')}]`;
};
const palette = (name, p) => `    ${str(name)}: Palette(${linear(p.base)},
      blobs: [${p.blobs.map(shape).join(', ')}],
      streaks: [${(p.streaks || []).map(shape).join(', ')}],
      blur: ${p.blur || 9}, sblur: ${p.sblur || 3}, disp: ${p.disp ?? 26}, darkInk: ${p.ink === '#FFFFFF'})`;

const out = `// Made by design/to-ios.mjs from the design canvas's sources. Change those, not this file.
import Foundation

enum Generated {
  static let light = ThemeColors(${themeSwift(light)})
  static let dark = ThemeColors(${themeSwift(dark)})

  static let icons: [String: String] = [
${Object.entries(I).map(([k, v]) => `    ${str(k)}: ${str(v)}`).join(',\n')}
  ]

  static let paletteNames: [String] = ${str(PALETTE_NAMES)}
  static let palettes: [String: Palette] = [
${[...PALETTE_NAMES.map(n => palette(n, PALETTES[n])), ...Object.keys(SITE_PALETTES).map(n => palette(n, SITE_PALETTES[n]))].join(',\n')}
  ]

  static let tagColors: [String: UInt32] = [${Object.entries(tagC).map(([k, v]) => `${str(k)}: ${hex(v)}`).join(', ')}]
  static let tagPalette: [UInt32] = [${tagPal.map(hex).join(', ')}]

  /// Logos: viewBox, then shapes with a fill (a hex color, "text", or "cursor") and whether they fill even-odd.
  static let logos: [String: (box: [Double], paths: [(d: String, fill: String, evenOdd: Bool)])] = [
${Object.entries(logos).map(([k, v]) => `    ${str(k)}: (${str(v.vb)}, [${v.paths.map(p => `(${str(p.d)}, ${str(p.fill)}, ${p.evenOdd})`).join(', ')}])`).join(',\n')}
  ]

  static let apple = ${str(APPLE)}
  static let google = ${str(GOOGLE)}

  /// The sign-in wall: one card from each sample deck, as [deck, front, back], in columns.
  static let wallCards: [[[String]]] = ${str(WALL_CARDS)}

  /// The canvas's sample data (design/mock.mjs), for the demo screens.
  static let sampleJSON = ${str(JSON.stringify(SAMPLE))}
}
`;
writeFileSync(OUT, out);
console.log('wrote', OUT.pathname.split('/stealth-cards/')[1], Object.keys(I).length, 'icons,', PALETTE_NAMES.length, 'palettes');
