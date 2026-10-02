// Lucida's own tooltip (the owner: nothing the browser draws itself, so no title="…" tooltips). Anything with data-tip="words" shows them in a
// small pill after a short pause under the pointer, or at once as keyboard focus lands on it, and hides again when the pointer leaves, a
// key is pressed, the page scrolls or the element is pressed. data-tip-side="right" puts it beside the element (the collapsed sidebar's
// rail), otherwise it sits under it, or over it when there's no room below. It is the inverse of the surface it sits on (black on a
// light page, light on a dark one), 12 px, with a short fade (none with reduced motion).
// One file for the web app (web/app.js) and the canvas (design/slim.mjs puts this function's text into the shared lucida-logic.js), so a
// board shows the same tooltip in both. Nothing here reads the app.
export default function installTips(doc) {
  doc = doc || document;
  const win = doc.defaultView;
  if (!win || doc.__luTips) return;
  doc.__luTips = true;
  const DELAY = 450, FOCUS_DELAY = 250, GAP = 8;
  let tip = null, timer = 0, on = null;
  const hide = () => { clearTimeout(timer); timer = 0; on = null; if (tip) { tip.remove(); tip = null; } };
  // The first thing behind the element that has a color of its own is the surface the pill sits on.
  const surface = el => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(win.getComputedStyle(n).backgroundColor);
      if (m && (m[4] === undefined || +m[4] > 0.5)) return [+m[1], +m[2], +m[3]];
    }
    return [255, 255, 255];
  };
  const place = (el, side) => {
    const a = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = doc.documentElement.clientWidth, vh = doc.documentElement.clientHeight;
    let x, y;
    if (side === 'right') { x = a.right + GAP; y = a.top + (a.height - h) / 2; if (x + w > vw - 8) x = a.left - GAP - w; }
    else { x = a.left + (a.width - w) / 2; y = a.bottom + GAP; if (y + h > vh - 8) y = a.top - GAP - h; }
    x = Math.max(8, Math.min(x, vw - 8 - w)); y = Math.max(8, Math.min(y, vh - 8 - h));
    tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
  };
  const show = el => {
    const words = el.getAttribute('data-tip');
    if (!words || !el.isConnected || on !== el) return;
    if (tip) tip.remove();
    const [r, g, b] = surface(el), dark = (0.299 * r + 0.587 * g + 0.114 * b) < 128;
    tip = doc.createElement('div');
    tip.setAttribute('data-lu', 'tip');
    tip.setAttribute('aria-hidden', 'true');
    tip.textContent = words;
    Object.assign(tip.style, {
      position: 'fixed', left: '0px', top: '0px', zIndex: '3000', maxWidth: '240px', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '10px', pointerEvents: 'none',
      font: '500 12px/1.3 Geist, -apple-system, system-ui, sans-serif', letterSpacing: '0', textAlign: 'center',
      background: dark ? '#F2F2F2' : '#000000', color: dark ? '#000000' : '#FFFFFF', boxShadow: '0 6px 20px rgba(0,0,0,.18)', opacity: '0'
    });
    doc.body.appendChild(tip);
    place(el, el.getAttribute('data-tip-side'));
    const still = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches, t = tip;
    if (still) t.style.opacity = '1';
    else { t.style.transition = 'opacity .14s ease-out'; win.requestAnimationFrame(() => { t.style.opacity = '1'; }); }
  };
  const start = (el, delay) => { hide(); on = el; timer = win.setTimeout(() => show(el), delay); };
  const own = e => (e.target && e.target.closest ? e.target.closest('[data-tip]') : null);
  doc.addEventListener('pointerover', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const el = own(e);
    if (!el) return;
    if (el !== on) start(el, DELAY);
  }, true);
  doc.addEventListener('pointerout', e => {
    const el = own(e);
    if (el && el === on && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
  }, true);
  doc.addEventListener('pointerdown', hide, true);
  doc.addEventListener('keydown', e => { if (tip || timer) hide(); }, true);
  doc.addEventListener('scroll', hide, true);
  win.addEventListener('blur', hide);
  doc.addEventListener('focusin', e => {
    const el = own(e);
    if (el && el.matches && el.matches(':focus-visible')) start(el, FOCUS_DELAY);
  }, true);
  doc.addEventListener('focusout', hide, true);
}
