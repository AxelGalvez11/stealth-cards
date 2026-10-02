// Copies what the iPhone app (ios/) shares with the design canvas into Swift: the theme colors, the icons, the gradient
// palettes (plus the site's Midnight, for the Learn sheet's deep top), the onboarding's icons and moving background, tag colors, the sign-in wall's cards, and the canvas's sample data
// (its sample sound's waveform, Pro's deep stats, and the study network's sample: net-sample.mjs), and the themes' list; and copies the Guide's engine (web/guide.js) into the app's
// resources. Run it after changing any of those.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { PALETTES, PALETTE_NAMES, SITE_PALETTES } from './surfaces.mjs';
import { WALL_CARDS } from './wall.mjs';
import { SAMPLE, SAMPLE_WAVE, SAMPLE_INSIGHTS } from './mock.mjs';
import { NET_SAMPLE } from './net-sample.mjs';
import { G_LOGO, APPLE_LOGO } from './logos.mjs';
import { THEMES } from '../web/themes/index.js';

const OUT = new URL('../ios/Lucida/Design/Generated.swift', import.meta.url);
const src = readFileSync(new URL('./build.mjs', import.meta.url), 'utf8');
const grab = (re, what) => { const m = src.match(re); if (!m) throw new Error('Could not find ' + what + ' in build.mjs'); return m; };
const evalJs = code => new Function('return (' + code + ')')();

// The themes from the boards' theme(d, g): light, dark (black), and dark mode's gray look (Settings → Dark mode: Gray).
const th = grab(/\? (\{ bg: '#000000'[^}]+\})\n\s+: (\{ bg: '#FFFFFF'[^}]+\})/, 'the theme');
const dark = evalJs(th[1]), light = evalJs(th[2]);
const gray = evalJs(grab(/if \(d && g\) return (\{ bg: '#[0-9A-Fa-f]{6}'[^}]+\});/, 'the gray theme')[1]);
// Icons: stroke drawings on a 24 x 24 grid.
const I = evalJs(grab(/const I = (\{[\s\S]*?\n\});/, 'the icons')[1]);
// The onboarding's own icons (star, sheet, paste, out, copy) go in with the rest; the two whose names the app's icons
// already use (star and copy, drawn a little differently) as obStar and obCopy.
for (const [k, v] of Object.entries(evalJs(grab(/const OB_I = (\{[\s\S]*?\n\});/, 'the onboarding icons')[1]))) I[k in I ? 'ob' + k[0].toUpperCase() + k.slice(1) : k] = v;
// The onboarding's moving background (OB_AURA): the page, the folds' light and shadow, how much the edges fade, the
// grain (its opacity, blend, and the slope and intercept that set how bright it is), and the card's shadow; per mode.
const OB_AURA = evalJs(grab(/const OB_AURA = (\{[\s\S]*?\n\});/, 'the onboarding background')[1]);
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
// A box-shadow as Swift: each layer's offset, blur, spread, and color ("none": no layers).
const shadow = css => css === 'none' ? '[]' : '[' + css.split(/,\s*(?![^(]*\))/).map(l => {
  const m = /^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)?(?: (-?[\d.]+)(?:px)?)? (.+)$/.exec(l.trim());
  if (!m || !color(m[5])) throw new Error('Not a shadow: ' + l);
  return `Shadow(x: ${+m[1]}, y: ${+m[2]}, blur: ${+m[3]}, spread: ${+(m[4] || 0)}, color: ${color(m[5])})`;
}).join(', ') + ']';
const themeSwift = t => [...Object.entries(t).filter(([k]) => color(t[k])).map(([k, v]) => `${k}: ${color(v)}`), `shadow: ${shadow(t.shadow)}`].join(', ');
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
  static let gray = ThemeColors(${themeSwift(gray)})

  static let icons: [String: String] = [
${Object.entries(I).map(([k, v]) => `    ${str(k)}: ${str(v)}`).join(',\n')}
  ]

  /// The onboarding's moving background (design/build.mjs OB_AURA), light and dark.
${['light', 'dark'].map(m => { const a = OB_AURA[m]; return `  static let aura${m[0].toUpperCase() + m.slice(1)} = Aura(base: ${color(a.base)}, lit: ${color(a.lit)}, deep: ${color(a.deep)}, vig: ${a.vig}, grain: ${+a.grain}, multiply: ${a.blend === 'multiply'}, slope: ${+a.gs}, intercept: ${+a.gi}, card: ${shadow(a.card)})`; }).join('\n')}

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

  /// The study network's sample data (design/net-sample.mjs): people, shared decks, Discover, profiles, and news.
  static let netSampleJSON = ${str(JSON.stringify(NET_SAMPLE))}

  /// The themes (web/themes/index.js), in the order Settings › Theme shows them: key, the name of its boards, its name, and its short name.
  static let themes: [(key: String, board: String, name: String, short: String)] = [
${THEMES.map(t => `    (${str(t.key)}, ${str(t.board || '')}, ${str(t.name)}, ${str(t.short || t.name)})`).join(',\n')}
  ]

  /// The sample sound's waveform (design/mock.mjs SAMPLE_WAVE): 96 peaks, 0 to 1.
  static let sampleWave: [Double] = ${str(SAMPLE_WAVE)}

  /// Pro's deep stats sample (design/mock.mjs SAMPLE_INSIGHTS), by range (Week, Month, Year), as db.insights() gives them.
  static let insightsJSON = ${str(JSON.stringify(SAMPLE_INSIGHTS))}
}
`;
writeFileSync(OUT, out);
// The Guide's engine, web/guide.js, goes into the app as it is: the iPhone runs the same file in JavaScriptCore (ios/Lucida/Data/GuideEngine.swift),
// so what a Guide says is read the same everywhere. (ios/tests/guide-check.sh fails when the two files differ.)
copyFileSync(new URL('../web/guide.js', import.meta.url), new URL('../ios/Lucida/Resources/guide.js', import.meta.url));
console.log('wrote', OUT.pathname.split('/stealth-cards/')[1], Object.keys(I).length, 'icons,', PALETTE_NAMES.length, 'palettes');
