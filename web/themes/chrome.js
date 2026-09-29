import { A, R, di, face } from './kit.js';

// Liquid chrome: silver liquid metal, alive on the study background (slowly: it moves at a fifth of its speed, and the
// ripples are shallow), with frosted glass cards. Deck covers are still pieces of the same metal, each its own color.
// The metal is drawn with WebGL2, one context for the whole page; without it, the picture under each canvas shows.
const METALS = [
  { name: 'Silver', dark: '#0B0C0E', mid: '#8E9298', light: '#F5F7F9', irid: 0.22, chip: 'linear-gradient(135deg, #FFFFFF, #8E9298 45%, #F5F7F9 60%, #55595F)' },
  { name: 'Gold', dark: '#160C02', mid: '#B0802C', light: '#FFF3C8', irid: 0.06, chip: 'linear-gradient(135deg, #FFF3C8, #B0802C 45%, #FFE9A8 60%, #6B4A12)' },
  { name: 'Rose', dark: '#1B0B0B', mid: '#B57B73', light: '#FFE8E2', irid: 0.1, chip: 'linear-gradient(135deg, #FFE8E2, #B57B73 45%, #FFD9D0 60%, #6E3F3A)' },
  { name: 'Cobalt', dark: '#020A24', mid: '#2E5CDB', light: '#E4F0FF', irid: 0.14, chip: 'linear-gradient(135deg, #E4F0FF, #2E5CDB 45%, #BFD5FF 60%, #0B2470)' },
  { name: 'Oil slick', dark: '#060509', mid: '#6B6577', light: '#F2EFF7', irid: 0.95, chip: 'conic-gradient(from 30deg, #FF8AD8, #8AB6FF, #8AFFD1, #FFE58A, #FF8AD8)' },
  { name: 'Obsidian', dark: '#000000', mid: '#2E3034', light: '#B5BAC1', irid: 0.2, chip: 'linear-gradient(135deg, #B5BAC1, #2E3034 45%, #8E949C 60%, #000000)' },
];

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime, uSeed, uUnit, uIrid, uAngle, uK, uSphere;
uniform vec3 uDark, uMid, uLight;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s; }
float H(vec2 p){
  float t = uTime;
  vec2 q = vec2(fbm(p + vec2(0., .06 * t)), fbm(p + vec2(5.2, 1.3) - .05 * t));
  vec2 r = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2) + .035 * t), fbm(p + 2.2 * q + vec2(8.3, 2.8) - .03 * t));
  float u = dot(p, vec2(cos(uAngle), sin(uAngle)));
  return sin(6.2831 * u * .9 + 6. * r.x + 2. * q.y) * .6 + .6 * r.y;
}
float band(float x, float c, float w, float s){ return 1. / (1. + exp((abs(x - c) - w) / s)); }
void main(){
  vec2 fc = gl_FragCoord.xy; fc.y = uRes.y - fc.y;
  vec2 p = fc / uUnit + uSeed * 7.3;
  float e = 1.5 / uUnit;
  float h0 = H(p), hx = H(p + vec2(e, 0.)), hy = H(p + vec2(0., e));
  vec3 n = normalize(vec3(-(hx - h0) / e * uK, -(hy - h0) / e * uK, 1.));
  if (uSphere > .5) {
    vec2 s = (fc / uRes) * 2. - 1.;
    float d = min(dot(s, s), 1.);
    n = normalize(vec3(s, sqrt(1. - d)) + vec3(n.xy * .35, 0.));
  }
  vec3 rr = vec3(2. * n.z * n.x, 2. * n.z * n.y, 2. * n.z * n.z - 1.);
  float L = .10 + .06 * (rr.y + 1.);
  L += .95 * band(rr.y, -.42, .20, .035) * band(rr.x, -.05, .75, .06);
  L += .70 * band(rr.y, .38, .06, .02);
  L += .55 * band(rr.x, .62, .10, .03) * band(rr.y, 0., .5, .05);
  L += .35 * band(rr.x, -.7, .07, .02);
  L += .45 * pow(max(rr.z, 0.), 6.);
  L = L / (1. + L * .35) * 1.3;
  float tilt = clamp((1. - n.z) * 3., 0., 1.);
  vec3 col = L < .5 ? mix(uDark, uMid, L * 2.) : mix(uMid, uLight, min((L - .5) * 2., 1.));
  vec3 tint = .5 + .5 * cos(6.2831 * (h0 * .65 + (1. - n.z) * 2.2 + vec3(0., .33, .67)));
  col = mix(col, col * (.45 + tint * 1.25), uIrid * tilt);
  col += (hash(fc + fract(uTime)) - .5) * .02;
  o = vec4(clamp(col, 0., 1.), 1.);
}`;
const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const PAL = METALS.map(m => [hex(m.dark), hex(m.mid), hex(m.light), m.irid]);

// A metal tile: a canvas over a picture of the same size. `live` ones move; the others are drawn once.
const lqTile = ({ metal = 0, live = false, seed = 0, unit = 260, res = 1, angle = -0.5, sphere = false, r = 0, k = 0 } = {}) =>
  `<canvas data-lq="1"${live ? ' data-live="1"' : ''} data-metal="${metal}"${k ? ` data-k="${k}"` : ''} data-seed="${seed}" data-unit="${unit}" data-res="${res}" data-angle="${angle}"${sphere ? ' data-sphere="1"' : ''} aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block; border-radius: ${r}${typeof r === 'number' ? 'px' : ''};"></canvas>`;

// ---------- drawing the metal ----------
// One WebGL2 context renders every metal canvas on the page in turn and copies each out with drawImage. The moving one
// (the study background) redraws about 30 times a second while it's on screen and the page is showing; it holds still
// with Reduce Motion, and stops once it's gone from the page.
let gl = null, glc = null, U = null, failed = false, raf = 0, last = 0, t0 = 0;
const roots = new Set();
function setup() {
  if (gl || failed) return !!gl;
  try {
    glc = document.createElement('canvas');
    gl = glc.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
  } catch (e) { gl = null; }
  if (!gl) { failed = true; return false; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; failed = true; return false; }
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  U = {};
  ['uRes', 'uTime', 'uSeed', 'uUnit', 'uIrid', 'uAngle', 'uK', 'uSphere', 'uDark', 'uMid', 'uLight'].forEach(k => { U[k] = gl.getUniformLocation(pr, k); });
  return true;
}
function draw(cv, t) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), res = parseFloat(cv.getAttribute('data-res') || '1') * dpr;
  const w = Math.max(2, Math.round(cv.offsetWidth * res)), h = Math.max(2, Math.round(cv.offsetHeight * res));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  if (glc.width < w || glc.height < h) { glc.width = Math.max(glc.width, w); glc.height = Math.max(glc.height, h); }
  const P = PAL[parseInt(cv.getAttribute('data-metal') || '0', 10)] || PAL[0];
  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.uRes, w, h);
  gl.uniform1f(U.uTime, t);
  gl.uniform1f(U.uSeed, parseFloat(cv.getAttribute('data-seed') || '0'));
  gl.uniform1f(U.uUnit, parseFloat(cv.getAttribute('data-unit') || '260') * res);
  gl.uniform1f(U.uAngle, parseFloat(cv.getAttribute('data-angle') || '-0.5'));
  gl.uniform1f(U.uK, parseFloat(cv.getAttribute('data-k') || (cv.hasAttribute('data-sphere') ? 0.08 : 0.16)));
  gl.uniform1f(U.uSphere, cv.hasAttribute('data-sphere') ? 1 : 0);
  gl.uniform1f(U.uIrid, P[3]);
  gl.uniform3fv(U.uDark, P[0]); gl.uniform3fv(U.uMid, P[1]); gl.uniform3fv(U.uLight, P[2]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  cv.getContext('2d').drawImage(glc, 0, glc.height - h, w, h, 0, 0, w, h);
}
function frame(ts) {
  raf = 0;
  for (const el of roots) if (!el.isConnected) { if (el.__lqIo) el.__lqIo.disconnect(); roots.delete(el); }
  if (!roots.size) return;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let moving = false;
  if (!document.hidden && ts - last >= 33) {
    last = ts;
    const t = (ts - t0) / 1000 * 0.22;
    for (const el of roots) for (const cv of el.querySelectorAll('canvas[data-lq]')) {
      const live = cv.hasAttribute('data-live') && !still;
      if (live && el.__lqOff) { moving = true; continue; }
      if (!live && cv.__lqDrawn) continue;
      if (!cv.offsetWidth) continue;
      draw(cv, live ? t : 3 + parseFloat(cv.getAttribute('data-seed') || '0') * 1.7);
      cv.__lqDrawn = true;
      if (live) moving = true;
    }
  } else moving = true;
  for (const el of roots) for (const cv of el.querySelectorAll('canvas[data-lq]')) if (!cv.__lqDrawn || (cv.hasAttribute('data-live') && !still)) moving = true;
  if (moving) raf = requestAnimationFrame(frame);
}
function mount(el) {
  if (typeof document === 'undefined' || !el.querySelector('canvas[data-lq]') || !setup()) return;
  roots.add(el);
  if (!el.__lqIo && typeof IntersectionObserver === 'function') {
    el.__lqIo = new IntersectionObserver(es => { el.__lqOff = !es.some(e => e.isIntersecting); });
    el.__lqIo.observe(el);
  }
  if (!t0) t0 = performance.now();
  if (!raf) raf = requestAnimationFrame(frame);
}

// ---------- the theme ----------
// Six covers, each a piece of one picture of the metal, in its own color.
const CR = [
  { cls: 'cr-silver', pos: '18% 30%', size: '260%', name: 'Silver', m: 0, seed: 1 },
  { cls: 'cr-dark', pos: '70% 20%', size: '240%', name: 'Gold', m: 1, seed: 2 },
  { cls: 'cr-pearl', pos: '40% 60%', size: '240%', name: 'Cobalt', m: 3, seed: 3 },
  { cls: 'cr-silver', pos: '85% 75%', size: '220%', name: 'Rose', m: 2, seed: 4 },
  { cls: 'cr-dark', pos: '20% 85%', size: '260%', name: 'Obsidian', m: 5, seed: 5 },
  { cls: 'cr-pearl', pos: '85% 20%', size: '260%', name: 'Oil slick', m: 4, seed: 6 },
];
export default {
  key: 'chrome', board: 'Chrome', name: 'Liquid chrome', dark: true, fonts: '',
  line: 'Silver liquid metal with frosted glass cards.',
  assets: { 'cr-silver': 'chrome-silver.webp', 'cr-dark': 'chrome-dark.webp', 'cr-pearl': 'chrome-pearl.webp', 'cr-tall': 'chrome-tall.webp', 'cr-sphere': 'chrome-sphere.webp' },
  css: '.cr-silver{background-image:url(%%cr-silver%%)}.cr-dark{background-image:url(%%cr-dark%%)}.cr-pearl{background-image:url(%%cr-pearl%%)}.cr-tall{background-image:url(%%cr-tall%%)}.cr-sphere{background-image:url(%%cr-sphere%%);background-size:cover}',
  // The metal moves on the study background (a dark veil over it keeps the words calm); a small tile holds still.
  bg(w, h) {
    const big = w > 600, tiny = w < 300;
    return `<div class="${big ? 'cr-silver' : 'cr-tall'}" style="position: absolute; inset: 0; background-size: cover; background-position: center;"></div>${lqTile({ live: !tiny, seed: 3, unit: big ? 900 : 620, res: big ? 0.5 : 0.75, angle: big ? -0.5 : -1.1, k: 0.08 })}<div style="position: absolute; inset: 0; background: rgba(26,27,30,.42);"></div><div style="position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 48%, rgba(10,10,12,.22), rgba(10,10,12,.04) 70%), linear-gradient(180deg, rgba(0,0,0,.14), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,.2));"></div>`;
  },
  face(w, h, o) {
    return face(`border-radius: ${o.r}px; border: ${w > 400 ? 2 : 1.5}px solid transparent; background: linear-gradient(160deg, rgba(250,251,253,.74), rgba(232,234,238,.62)) padding-box, linear-gradient(135deg, #FFFFFF 0%, #8C9097 22%, #F5F6F8 44%, #6E7278 64%, #E4E6EA 84%, #A3A6AC 100%) border-box; -webkit-backdrop-filter: blur(26px) saturate(1.3); backdrop-filter: blur(26px) saturate(1.3); color: #111111; box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 2px 4px rgba(0,0,0,.18), 0 34px 70px -24px rgba(0,0,0,.65);`,
      '', { q: 'color: #5C5F66;', qs: 0.44, a: 'font-weight: 600; letter-spacing: -.025em;', lh: 1.18 }, { ink: '#111111', paper: '#EEF0F3', muted: '#5C5F66' });
  },
  cover(d, o) {
    const m = CR[di(d)];
    return {
      bg: '#8E9095', ink: 'light', name: m.name,
      title: 'font-weight: 600; letter-spacing: -.03em; text-shadow: 0 1px 3px rgba(0,0,0,.45);',
      shadow: '0 1px 2px rgba(0,0,0,.25), 0 16px 32px -14px rgba(0,0,0,.55)',
      draw: () => `<span class="${m.cls}" style="position: absolute; inset: 0; border-radius: ${o.r}px; background-size: ${m.size} auto; background-position: ${m.pos};"></span>${lqTile({ metal: m.m, seed: m.seed, unit: 420, r: o.r })}<span style="position: absolute; inset: 0; border-radius: ${o.r}px; background: linear-gradient(to top, rgba(8,8,10,.62), rgba(8,8,10,.12) 48%, rgba(8,8,10,0) 70%); box-shadow: inset 0 1px 0 rgba(255,255,255,.7), inset 0 0 0 1px rgba(255,255,255,.28);"></span>`,
    };
  },
  avatar: (s, ch) => `<span class="cr-sphere" style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; box-shadow: 0 ${Math.max(1, s / 30)}px ${Math.max(2, s / 10)}px rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center;">${lqTile({ metal: 0, seed: 9, unit: Math.max(90, s * 2.2), sphere: true, r: '50%' })}<span style="position: relative; font-size: ${R(s * 0.44)}px; font-weight: 700; letter-spacing: -.03em; color: rgba(18,18,20,.82); text-shadow: 0 1px 0 rgba(255,255,255,.75), 0 -1px 0 rgba(0,0,0,.25);">${ch}</span></span>`,
  // around your photo: a polished silver ring
  frame: s => { const b = Math.max(2, R(s / 16)); return A(`inset: ${-b}px; border-radius: 50%; padding: ${b}px; background: linear-gradient(135deg, #FFFFFF 0%, #8C9097 26%, #F5F6F8 48%, #6E7278 68%, #E4E6EA 86%, #A3A6AC 100%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; box-shadow: 0 1px 3px rgba(0,0,0,.3);`); },
  mount,
  METALS,
};
