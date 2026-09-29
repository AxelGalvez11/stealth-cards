import { A, R, f, di, mo, motifName, lay, scrim, icon, face, banner, bannerSpot, headSpot } from './kit.js';

// Terminal: a modern terminal app (Ghostty, Warp, a refined iTerm). Graphite glass, soft color glow, crisp mono type.
const TF = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
// the house colors (study screen + card)
const H = { ink: '#ECEEF4', sub: '#9CA2B4', dim: '#646A7C', blue: '#86A8F6', violet: '#B9A1F4', green: '#94D3A2', orange: '#EDAA84' };
// a prompt chevron (❯), drawn so it never depends on the font's glyphs
const chev = (c, w = 2.7) => `<svg viewBox="0 0 9 14" aria-hidden="true" style="display: inline-block; width: .5em; height: .8em; vertical-align: -.06em; overflow: visible;"><path d="M2.2 2.2L7 7l-4.8 4.8" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const dotGrid = (pitch, a, mask) => A(`inset: 0; background-image: radial-gradient(rgba(255,255,255,${a}) ${f(pitch / 26 + 0.55)}px, rgba(255,255,255,0) ${f(pitch / 26 + 0.95)}px); background-size: ${pitch}px ${pitch}px; background-position: 50% 50%; -webkit-mask-image: ${mask}; mask-image: ${mask};`);
const glow = (ex, ey, x, y, c, a) => `radial-gradient(ellipse ${ex} ${ey} at ${x} ${y}, ${rgba(c, a)}, ${rgba(c, f(a * 0.64))} 22%, ${rgba(c, f(a * 0.32))} 44%, ${rgba(c, f(a * 0.1))} 66%, ${rgba(c, 0)} 88%)`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// six editor-style palettes, one per cover
const PAL = [
  { name: 'Midnight', top: '#1D2346', base: '#13141F', deep: '#0B0C13', fg: '#D9DFFB', ac: '#7AA2F7', a2: '#BB9AF7', r: '#F7768E', y: '#E0AF68', g: '#9ECE6A' },
  { name: 'Ember', top: '#3B2517', base: '#1D1713', deep: '#110D0B', fg: '#F3E4C8', ac: '#FB9B50', a2: '#FABD2F', r: '#FB5A45', y: '#FABD2F', g: '#B8BB26' },
  { name: 'Dusk', top: '#35213C', base: '#1A1725', deep: '#100E17', fg: '#ECE7F8', ac: '#EBBCBA', a2: '#C4A7E7', r: '#EB6F92', y: '#F6C177', g: '#9CCFD8' },
  { name: 'Moss', top: '#223A2E', base: '#162019', deep: '#0D1310', fg: '#E3DFC8', ac: '#A7C080', a2: '#83C092', r: '#E67E80', y: '#DBBC7F', g: '#A7C080' },
  { name: 'Lavender', top: '#2E2648', base: '#1B1A2B', deep: '#11101A', fg: '#E5E8FB', ac: '#CBA6F7', a2: '#F5C2E7', r: '#F38BA8', y: '#F9E2AF', g: '#A6E3A1' },
  { name: 'Fjord', top: '#24394E', base: '#1A212C', deep: '#10141B', fg: '#ECEFF4', ac: '#88C0D0', a2: '#81A1C1', r: '#BF616A', y: '#EBCB8B', g: '#A3BE8C' },
];
// the command in each cover's window: one per subject, or opening the deck by name
const CMD = { cell: ['grep', 'mitochondria'], cloud: ['kubectl', 'get pods'], torii: ['say', 'konnichiwa'], benzene: ['echo', 'C6H6'], quill: ['cat', 'notes.txt'], bone: ['ls', './skeleton'] };
const cmdOf = (k, d) => CMD[k] || ['open', esc(String(d.name || 'deck').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 14) || 'deck')];

// a small glass terminal window on a cover: title-bar dots, the command, and its output (the subject picture)
function win(P, k, cmdw, x, y, ww, wh) {
  const r = Math.max(4, R(ww * 0.075)), bar = Math.max(7, R(wh * 0.15)), dot = Math.max(2.2, bar * 0.34), gap = dot * 0.62, cmd = ww >= 96;
  const dots = [P.r, P.y, P.g].map((c, n) => A(`left: ${f(bar * 0.55 + n * (dot + gap))}px; top: ${f((bar - dot) / 2)}px; width: ${f(dot)}px; height: ${f(dot)}px; border-radius: 50%; background: ${c};`)).join('');
  const fs = Math.max(7, R(ww * 0.058));
  const line = cmd ? A(`left: ${R(ww * 0.075)}px; top: ${bar + R(wh * 0.08)}px; font-family: ${TF}; font-size: ${fs}px; line-height: 1; white-space: nowrap; color: ${P.fg};`, `${chev(P.g)} <span style="color: ${P.ac};">${cmdw[0]}</span> <span style="opacity: .72;">${cmdw[1]}</span>`) : '';
  const is = R((wh - bar) * (cmd ? 0.56 : 0.64)), top = cmd ? bar + R((wh - bar) * 0.32) : bar + R((wh - bar - is) / 2);
  const ico = A(`left: ${R((ww - is) / 2)}px; top: ${top}px; width: ${is}px; filter: drop-shadow(0 0 ${Math.max(2, R(is * 0.12))}px ${rgba(P.ac, 0.6)});`, icon(k, P.ac, ww < 90 ? 3 : 2.4, '', TF));
  const back = A(`left: ${R(x + ww * 0.06)}px; top: ${R(y + wh * 0.12)}px; width: ${R(ww * 0.88)}px; height: ${R(wh * 0.88)}px; border-radius: ${r}px; background: linear-gradient(135deg, ${P.a2}, ${P.ac} 55%, ${P.g}); filter: blur(${Math.max(4, R(ww * 0.14))}px); opacity: .5;`);
  return back + A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(ww)}px; height: ${R(wh)}px; box-sizing: border-box; border-radius: ${r}px; overflow: hidden; background: linear-gradient(180deg, ${rgba(P.base, 0.5)}, ${rgba(P.deep, 0.7)}); -webkit-backdrop-filter: blur(8px) saturate(1.3); backdrop-filter: blur(8px) saturate(1.3); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.1), 0 ${Math.max(2, R(wh * 0.1))}px ${Math.max(4, R(wh * 0.28))}px rgba(0,0,0,.45), 0 0 ${R(ww * 0.3)}px ${rgba(P.ac, 0.14)};`,
    A(`left: 0; right: 0; top: 0; height: ${bar}px; background: rgba(255,255,255,.035); border-bottom: 1px solid rgba(255,255,255,.07);`, dots) + line + ico);
}

export default {
  key: 'terminal', board: 'Terminal', name: 'Terminal', dark: true, headArt: true, cw: 0.58, fonts: 'family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&',
  line: 'A modern terminal: graphite glass, a soft color glow, and crisp mono type.',
  bg(w, h) {
    const L = lay(w, h);
    const pitch = { wide: 28, tall: 22, mid: 24, tiny: 13 }[L], da = { wide: 0.12, tall: 0.11, mid: 0.12, tiny: 0.09 }[L];
    // soft blooms of color at the edges (indigo, violet, teal) and a faint halo behind the window
    const bloom = {
      wide: [['62%', '60%', '26%', '0%', '#5B6CFF', 0.24], ['42%', '50%', '84%', '2%', '#9A74FF', 0.13], ['52%', '60%', '94%', '100%', '#1FC2AE', 0.16], ['38%', '46%', '2%', '100%', '#8B5CF6', 0.05], ['50%', '46%', '50%', '48%', '#6D7BFF', 0.08], ['44%', '20%', '50%', '82%', '#6D7BFF', 0.07]],
      mid: [['80%', '54%', '24%', '0%', '#5B6CFF', 0.26], ['56%', '42%', '92%', '2%', '#9A74FF', 0.14], ['72%', '52%', '96%', '100%', '#1FC2AE', 0.17], ['54%', '40%', '0%', '100%', '#8B5CF6', 0.05], ['56%', '44%', '50%', '50%', '#6D7BFF', 0.08]],
      tall: [['80%', '26%', '10%', '2%', '#5B6CFF', 0.3], ['60%', '20%', '96%', '6%', '#9A74FF', 0.14], ['80%', '26%', '92%', '100%', '#1FC2AE', 0.18], ['60%', '18%', '4%', '96%', '#8B5CF6', 0.1]],
      tiny: [['70%', '56%', '6%', '4%', '#5B6CFF', 0.34], ['64%', '52%', '100%', '100%', '#1FC2AE', 0.2], ['50%', '40%', '96%', '8%', '#9A74FF', 0.14]],
    }[L].map(g => glow(...g)).join(', ');
    return A('inset: 0; background: linear-gradient(180deg, #0F1016 0%, #0B0C10 55%, #08090C 100%);') +
      A(`inset: 0; background: ${bloom};`) +
      dotGrid(pitch, da, 'radial-gradient(ellipse 70% 70% at 50% 48%, #000 22%, rgba(0,0,0,.4) 62%, transparent 92%)') +
      A('inset: 0; background: radial-gradient(ellipse 115% 95% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,.32) 100%);');
  },
  // The card is a terminal window: a title bar with its three dots, and a prompt line above the words.
  face(w, h, o) {
    const k = Math.min(w, h), tiny = w < 200;
    const [pt, px = pt] = String(o.pad).split(' ').map(parseFloat);
    const r = Math.max(7, R(o.r * 0.5)), bar = tiny ? 15 : R(Math.max(20, Math.min(34, k * 0.072)));
    const dot = tiny ? 4 : Math.max(7, R(bar * 0.34)), gap = tiny ? 3 : R(dot * 0.66);
    const dots = ['#F2665C', '#F0BD4F', '#58C46A'].map(c => `<span style="width: ${dot}px; height: ${dot}px; flex-shrink: 0; border-radius: 50%; background: ${c}; box-shadow: inset 0 0 0 .5px rgba(0,0,0,.25);"></span>`).join('');
    const title = tiny ? '' : `<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${w >= 700 ? 12 : w >= 350 ? 10 : 9}px; font-weight: 500; color: rgba(236,238,244,.5); white-space: nowrap;">lucida — zsh</span>`;
    const ps = Math.max(9, R(o.fs * 0.44));
    const prompt = tiny ? '' : A(`left: ${px}px; top: ${bar + R(pt * 0.55)}px; font-size: ${ps}px; line-height: 1.3; white-space: nowrap; color: ${H.sub};`, `${chev(H.green)} <span style="color: ${H.blue};">cat</span> <span style="color: ${H.orange};">${o.side === 'back' ? 'answer' : 'question'}.md</span>`);
    return face(`border-radius: ${r}px; border: 1px solid rgba(255,255,255,.11); background: radial-gradient(${R(w * 0.9)}px ${R(h * 0.8)}px at 18% 0%, rgba(120,138,255,.07), rgba(120,138,255,0) 70%), linear-gradient(180deg, rgba(24,25,32,.9), rgba(16,17,22,.94)); -webkit-backdrop-filter: blur(24px) saturate(1.4); backdrop-filter: blur(24px) saturate(1.4); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 0 0 1px rgba(0,0,0,.5), 0 ${R(h * 0.05)}px ${R(h * 0.14)}px ${-R(h * 0.03)}px rgba(0,0,0,.6); overflow: hidden; font-family: ${TF}; color: ${H.ink};${tiny ? '' : ` padding-top: ${Math.max(pt, bar + R(pt * 0.55) + R(ps * 1.3) + 10)}px;`}`,
      () => `<span style="position: absolute; left: 0; right: 0; top: 0; height: ${bar}px; box-sizing: border-box; padding: 0 ${R(bar * 0.42)}px; display: flex; align-items: center; gap: ${gap}px; border-bottom: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.02);">${dots}${title}</span>${prompt}`,
      { q: `color: ${H.sub}; font-style: italic;`, qp: `<span style="color: ${H.dim}; font-style: normal;">#&nbsp;</span>`, a: `color: ${H.ink}; font-weight: 500; letter-spacing: -.012em;`, fs: tiny ? 0.92 : 0.88, qs: 0.46, lh: 1.3 },
      { ink: H.ink, paper: '#16171D', muted: H.sub, dark: true });
  },
  cover(d, o) {
    const i = di(d), P = PAL[i], w = o.w, h = o.h, wide = o.shape === 'wide', sq = o.shape === 'square', tiny = w < 100, k = mo(d);
    return {
      bg: P.deep, ink: 'light', name: `${P.name} · ${motifName(k)}`, ts: 0.9,
      title: `font-family: ${TF}; font-weight: 600; letter-spacing: -.02em; color: ${P.fg};`,
      shadow: '0 1px 2px rgba(0,0,0,.3), 0 14px 30px -14px rgba(0,0,0,.7)',
      draw() {
        let ww, wh, x, y;
        if (o.top) { const HS = headSpot(o); wh = R(HS.s * 0.8); ww = R(wh * 1.55); x = R(w - ww - w * 0.045); y = R(HS.y + (HS.s - wh) / 2); }
        else if (banner(o)) { const B = bannerSpot(o); ww = R(B.s * 1.5); wh = R(B.s * 0.87); x = R(B.cx - ww / 2); y = R(B.cy - wh / 2); }
        else if (wide) { ww = R(w * 0.49); wh = R(h * 0.43); x = w - ww - R(w * 0.062); y = R(h * 0.21); }
        else { ww = R(w * (tiny ? 0.7 : 0.68)); wh = R(ww * (tiny ? 0.8 : 0.75)); x = R((w - ww) / 2); y = tiny ? R((h - wh) * 0.4) : Math.max(R(h * 0.19), 40); }
        const BS = banner(o) && bannerSpot(o), gx = o.top ? '78%' : BS ? R((BS.cx / w) * 100) + '%' : wide ? '76%' : '50%', gy = o.top ? '72%' : BS ? R((BS.cy / h) * 100) + '%' : wide ? '42%' : tiny ? '45%' : '38%';
        const light = `radial-gradient(circle at ${gx} ${gy}, ${rgba(P.ac, 0.5)} 0, ${rgba(P.ac, 0.3)} ${wide ? 14 : 18}%, ${rgba(P.ac, 0.1)} ${wide ? 32 : 40}%, ${rgba(P.ac, 0)} ${wide ? 54 : 66}%), radial-gradient(ellipse at 0% 0%, ${rgba(P.a2, 0.28)}, ${rgba(P.a2, 0.1)} 30%, ${rgba(P.a2, 0)} 60%)`;
        const pic = sq ? A(`left: 22%; top: 22%; width: 56%; filter: drop-shadow(0 0 3px ${rgba(P.ac, 0.6)});`, icon(k, P.ac, 3, '', TF)) : win(P, k, cmdOf(k, d), x, y, ww, wh);
        return A(`inset: 0; background: ${light}, linear-gradient(155deg, ${P.top} 0%, ${P.base} 50%, ${P.deep} 100%);`) +
          (tiny || sq ? '' : dotGrid(wide ? 14 : 12, 0.07, `radial-gradient(ellipse at ${gx} ${gy}, #000 10%, transparent 62%)`)) +
          (sq ? '' : scrim(hex(P.deep).join(','), wide ? 0.85 : 0.8, wide ? 56 : 50)) + pic +
          A(`inset: 0; border-radius: ${o.r}px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.1);`);
      },
    };
  },
  avatar(s, ch) {
    const b = Math.max(1.5, s / 30), gap = s >= 56 ? Math.max(2, R(s / 26)) : 0;
    const inner = `<span style="position: absolute; inset: ${f(b + gap)}px; border-radius: 50%; background: radial-gradient(circle at 50% 28%, #262833, #131419 72%); box-shadow: inset 0 1px 0 rgba(255,255,255,.07);"></span>`;
    const label = s >= 56 ? `${chev(H.green, 2.8)}<span style="margin-left: .08em;">${ch}</span>` : ch;
    return `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; background: conic-gradient(from 210deg, #7AA2F7, #BB9AF7, #F7A1C4, #7DCFFF, #7AA2F7); box-shadow: 0 ${Math.max(1, R(s / 24))}px ${Math.max(2, R(s / 8))}px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center;">${gap ? `<span style="position: absolute; inset: ${f(b)}px; border-radius: 50%; background: #0C0D11;"></span>` : ''}${inner}<span style="position: relative; display: inline-flex; align-items: center; font-family: ${TF}; font-size: ${R(s * (s >= 56 ? 0.36 : 0.44))}px; font-weight: 600; line-height: 1; letter-spacing: -.02em; color: ${H.ink};">${label}</span></span>`;
  },
  // around your photo: the same ring of editor colors
  frame: s => `<span style="position: absolute; inset: ${-Math.max(1.5, R(s / 30))}px; border-radius: 50%; padding: ${Math.max(1.5, R(s / 30))}px; background: conic-gradient(from 210deg, #7AA2F7, #BB9AF7, #F7A1C4, #7DCFFF, #7AA2F7); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; pointer-events: none;"></span>`,
};
