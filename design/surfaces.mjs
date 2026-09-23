// Soft, blurred color fields with fine film grain, sampled from the owner's reference images.
// Each palette: a base CSS gradient (broad structure), up to 6 soft blobs in a 0-100 box
// (warped by low-frequency noise, then heavily blurred, so edges flow like water), and a text color.
export const PALETTES = {
  // Clear set (refs 6 and 7): bright, silky color with bands of light; black text.
  // Blob/streak rows: [color, x, y, rx, ry, rotation°]. Blobs blur heavily; streaks keep a cleaner edge.
  Iris: {
    base: 'linear-gradient(102deg, #C9CCFC 0%, #9CA2FE 17%, #A9B9FF 32%, #BFCEFF 52%, #BACFFF 70%, #8EC5FC 86%, #33B3EC 100%)',
    blobs: [['#8C98FC', 14, 70, 10, 70, 12], ['#C3D0FF', 55, 40, 12, 80, 12], ['#2CB2EA', 102, 102, 20, 42, 18], ['#C2CCFF', 88, 0, 22, 26, 0], ['#7E94FB', 6, 100, 16, 22, 12], ['#B9CEFF', 72, 60, 10, 70, 12]],
    streaks: [['#E6E8FD', 1, 40, 3.2, 70, 12], ['#D3DBFF', 44, 50, 2.6, 80, 12]],
    blur: 6, sblur: 2.2, disp: 10,
    ink: '#000000'
  },
  Apricot: {
    base: 'linear-gradient(200deg, #F2AC45 0%, #EE9D3F 28%, #E88C37 52%, #E99038 76%, #EE9A3E 100%)',
    blobs: [['#E27E2E', 70, 38, 12, 60, -32], ['#F3AE44', 92, 4, 28, 24, 0], ['#F4BC76', 10, 98, 24, 22, 0], ['#EA9139', 40, 80, 20, 30, -20], ['#E7862F', 100, 70, 14, 30, 0], ['#F1A640', 60, 0, 18, 14, 0]],
    streaks: [['#FAE6BC', 6, 55, 11, 70, -22], ['#F7D39A', 20, 70, 5, 50, -22]],
    blur: 7, sblur: 3, disp: 8,
    ink: '#000000'
  },
  Lilac: {
    base: 'linear-gradient(110deg, #D9CCFA 0%, #C3B2F6 22%, #D8C3F4 45%, #F1CDE3 68%, #F8CDB8 88%, #F6B999 100%)',
    blobs: [['#B7A3F4', 18, 64, 10, 70, 14], ['#E7D3F6', 50, 40, 12, 80, 14], ['#F5B08E', 100, 100, 22, 40, 16], ['#D2C6FA', 86, 0, 22, 24, 0], ['#AE98F2', 4, 100, 16, 22, 14], ['#F4C9D8', 72, 62, 10, 70, 14]],
    streaks: [['#F3EDFD', 2, 40, 3, 70, 14], ['#EEDDF8', 44, 50, 2.4, 80, 14]],
    blur: 6, sblur: 2.2, disp: 10,
    ink: '#000000'
  },
  Mint: {
    base: 'linear-gradient(105deg, #D7F3E6 0%, #A7E3C9 20%, #BDEBD6 40%, #CFF1DE 60%, #B6E6CD 78%, #7FD0B0 100%)',
    blobs: [['#8FD8B8', 16, 66, 10, 70, 12], ['#D9F5E6', 52, 40, 12, 80, 12], ['#5FC3A0', 102, 102, 20, 42, 18], ['#E9F7C9', 88, 2, 22, 24, 0], ['#7ACFAD', 6, 100, 16, 22, 12], ['#C3EDD7', 72, 60, 10, 70, 12]],
    streaks: [['#F1FBF5', 2, 40, 3, 70, 12], ['#E2F7EB', 44, 50, 2.4, 80, 12]],
    blur: 6, sblur: 2.2, disp: 10,
    ink: '#000000'
  },
  Aqua: {
    base: 'linear-gradient(102deg, #D5F1FA 0%, #9EDCF1 18%, #B6E6F5 36%, #C9EEF8 56%, #A6DEF2 74%, #5CC0E6 90%, #2FA7DE 100%)',
    blobs: [['#86D2EE', 14, 68, 10, 70, 12], ['#D0F0FA', 54, 40, 12, 80, 12], ['#2A9FDA', 102, 102, 20, 42, 18], ['#C7EDF9', 88, 0, 22, 26, 0], ['#6CC6EA', 6, 100, 16, 22, 12], ['#B2E4F5', 72, 60, 10, 70, 12]],
    streaks: [['#EEFAFD', 1, 40, 3.2, 70, 12], ['#DDF4FB', 44, 50, 2.6, 80, 12]],
    blur: 6, sblur: 2.2, disp: 10,
    ink: '#000000'
  },
  Rose: {
    base: 'linear-gradient(200deg, #F9C3CF 0%, #F5A9BB 30%, #EE8CA6 55%, #F29AB0 78%, #F6AFC0 100%)',
    blobs: [['#EC7F9C', 70, 38, 12, 60, -32], ['#FAC6D2', 92, 4, 28, 24, 0], ['#F8C0B4', 10, 98, 24, 22, 0], ['#F09CB1', 40, 80, 20, 30, -20], ['#EF93AA', 100, 70, 14, 30, 0], ['#F7B6C5', 60, 0, 18, 14, 0]],
    streaks: [['#FDE9EE', 4, 52, 8, 64, -20], ['#FBD6DF', 16, 66, 5, 50, -20]],
    blur: 7, sblur: 3, disp: 8,
    ink: '#000000'
  },
  Lemon: {
    base: 'linear-gradient(200deg, #FCE78C 0%, #F9DA6E 30%, #F5C752 55%, #F7CF5E 78%, #F9D86C 100%)',
    blobs: [['#F2BD45', 70, 38, 12, 60, -32], ['#FCE891', 92, 4, 28, 24, 0], ['#FBD99A', 10, 98, 24, 22, 0], ['#F6CB5A', 40, 80, 20, 30, -20], ['#F4C44F', 100, 70, 14, 30, 0], ['#FADF7A', 60, 0, 18, 14, 0]],
    streaks: [['#FFF7DA', 4, 52, 8, 64, -20], ['#FDEDB4', 16, 66, 5, 50, -20]],
    blur: 7, sblur: 3, disp: 8,
    ink: '#000000'
  },
  // Deep set (refs 1-5), kept as options.

  // ref 3, "Introducing Flows": lavender and mauve fading into coral and an orange glow.
  Dusk: {
    base: 'linear-gradient(180deg, #9A92B6 0%, #A58AA6 36%, #AF8599 54%, #C8715F 76%, #DA7A50 100%)',
    blobs: [['#958FB9', 5, 10, 60, 40], ['#AC839E', 92, 18, 50, 36], ['#B0869A', 50, 55, 60, 14], ['#CE505A', 6, 96, 40, 30], ['#F4A04A', 50, 100, 34, 30], ['#D9744C', 96, 92, 34, 28]],
    ink: '#FFFFFF'
  },
  // ref 5 (the chat-bubble image): deep forest green, a gold band, peach and sky in the top-right corner.
  Grove: {
    base: 'linear-gradient(160deg, #2E4A1F 0%, #4E6428 25%, #9A9A3E 50%, #5E7A3A 72%, #1E3A22 100%)',
    blobs: [['#D9A878', 70, 6, 26, 14], ['#7FB2D6', 97, 30, 16, 26], ['#C8B432', 40, 50, 40, 10], ['#15301A', 86, 94, 36, 22], ['#8FA3AE', 6, 86, 30, 16], ['#22401C', 6, 12, 34, 22]],
    blur: 7,
    ink: '#FFFFFF'
  },
  // ref 4, "Expressive mode": pale sky, sage, olive, then deep forest.
  Forest: {
    base: 'linear-gradient(180deg, #AEBEC9 0%, #B0C2CF 22%, #A8B7B8 38%, #8A9675 50%, #5E6B3C 61%, #3F4F25 72%, #25391A 86%, #1C3214 100%)',
    blobs: [['#B3C6D4', 70, 8, 62, 22], ['#909C7C', 60, 50, 46, 7], ['#6F7C4C', 4, 53, 30, 9], ['#203616', 50, 102, 72, 24], ['#2B4319', 0, 80, 30, 18], ['#AAB9BD', 10, 36, 34, 8]],
    ink: '#FFFFFF'
  },
  // ref 2: deep brown on the left warming into bright orange (mirrored so text sits on the dark side).
  Ember: {
    base: 'linear-gradient(270deg, #EB840C 0%, #E77C0D 36%, #B8641A 50%, #7A4A22 61%, #5A3A28 72%, #6A3F27 85%, #8B4922 100%)',
    blobs: [['#E36E0E', 80, 100, 40, 40], ['#F08C10', 86, 4, 36, 36], ['#533728', 28, 45, 13, 75], ['#974B1D', 0, 92, 18, 40], ['#C96A17', 55, 20, 8, 40], ['#E0740E', 100, 60, 20, 30]],
    ink: '#FFFFFF'
  },
  // ref 1: blurred meadow, greens, yellow and sky, with teal pooling at the bottom.
  Meadow: {
    base: 'linear-gradient(180deg, #A9CFE0 0%, #7FAE6A 26%, #5E8E3E 38%, #D6C648 50%, #CFE3E6 64%, #5C9450 80%, #3E8480 100%)',
    blobs: [['#2F6230', 14, 40, 38, 10], ['#EDCBA8', 78, 20, 30, 12], ['#E6CB3C', 46, 52, 30, 7], ['#E4EFF3', 20, 68, 30, 10], ['#3F7F3A', 84, 74, 30, 10], ['#9CC8E8', 94, 42, 18, 12]],
    blur: 5,
    ink: '#FFFFFF'
  },
  // New: sea foam at the top falling into deep water.
  Ocean: {
    base: 'linear-gradient(180deg, #CFE2E7 0%, #A2C9D4 28%, #6A9FB3 52%, #33708C 76%, #1B4A66 100%)',
    blobs: [['#E7EFF1', 72, 6, 44, 16], ['#8DBBCB', 12, 32, 40, 10], ['#4E8FA8', 22, 56, 46, 10], ['#2A6482', 86, 70, 42, 14], ['#173F5A', 30, 102, 62, 20], ['#3C7F9B', 100, 46, 24, 10]],
    ink: '#FFFFFF'
  },
  // The brighter option (earlier "neon yellow" ask): warm yellow into amber, black text.
  Sun: {
    base: 'linear-gradient(165deg, #F7D84E 0%, #F5C63F 42%, #EFA436 78%, #EA9031 100%)',
    blobs: [['#FBE46C', 14, 8, 52, 34], ['#F3B63A', 70, 55, 50, 22], ['#EA8A2E', 92, 100, 46, 30], ['#F8D24A', 0, 70, 30, 24], ['#F9DC5C', 80, 10, 30, 20], ['#EE9C34', 30, 100, 40, 18]],
    ink: '#000000'
  }
};
export const PALETTE_NAMES = Object.keys(PALETTES);

// Organic flow: blobs warped by low-frequency noise then blurred into each other; streaks get a light blur
// only, so bands of light keep a cleaner edge. `get(k)` returns a static value or a {{hole}} for field k.
const FLOW_FILTER = (id, disp, blur) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${disp}" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="${blur}"/></filter>`;
const STREAK_FILTER = (id, blur) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${blur}"/></filter>`;
const shape = (get, key) => `<ellipse cx="${get(key + '.x')}" cy="${get(key + '.y')}" rx="${get(key + '.rx')}" ry="${get(key + '.ry')}" fill="${get(key + '.c')}" transform="rotate(${get(key + '.r')} ${get(key + '.x')} ${get(key + '.y')})"/>`;
export const flowSvg = get => `<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="position: absolute; inset: 0; pointer-events: none;"><defs>${FLOW_FILTER(get('fid'), get('disp'), get('blur'))}${STREAK_FILTER(get('sid'), get('sblur'))}</defs><g filter="url(#${get('fid')})">${[0, 1, 2, 3, 4, 5].map(i => shape(get, 'b' + i)).join('')}</g><g filter="url(#${get('sid')})">${[0, 1].map(i => shape(get, 's' + i)).join('')}</g></svg>`;

// Fine monochrome film grain in CSS pixels (no viewBox, so it never stretches).
export const grainSvg = (opacity, { blend = 'overlay', freq = 0.9, slope = 3, id = 'sc-grain' } = {}) =>
  `<svg aria-hidden="true" width="100%" height="100%" style="position: absolute; inset: 0; mix-blend-mode: ${blend}; opacity: ${opacity}; pointer-events: none;"><filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${Math.round((1 - slope) / 2 * 100) / 100}"/><feFuncG type="linear" slope="${slope}" intercept="${Math.round((1 - slope) / 2 * 100) / 100}"/><feFuncB type="linear" slope="${slope}" intercept="${Math.round((1 - slope) / 2 * 100) / 100}"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#${id})"/></svg>`;

// Plain data for a palette, shaped for templates: { base, ink, b0: { c, x, y, rx, ry }, ... }.
export const paletteData = name => {
  const p = PALETTES[name], dark = p.ink === '#FFFFFF';
  const o = { base: p.base, ink: p.ink, fid: 'sc-flow-' + name.toLowerCase(), sid: 'sc-streak-' + name.toLowerCase(),
    blur: String(p.blur || 9), sblur: String(p.sblur || 3), disp: String(p.disp ?? 26),
    glass: dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.34)', glassLine: dark ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.22)',
    shadow: dark ? '0 1px 14px rgba(0,0,0,.16)' : 'none' };
  const blank = { c: 'transparent', x: 0, y: 0, rx: 0, ry: 0, r: 0 };
  for (let i = 0; i < 6; i++) { const b = p.blobs[i]; o['b' + i] = b ? { c: b[0], x: b[1], y: b[2], rx: b[3], ry: b[4], r: b[5] || 0 } : blank; }
  for (let i = 0; i < 2; i++) { const b = (p.streaks || [])[i]; o['s' + i] = b ? { c: b[0], x: b[1], y: b[2], rx: b[3], ry: b[4], r: b[5] || 0 } : blank; }
  return o;
};
