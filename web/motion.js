// Motion the boards' CSS can't do alone (the timings are the iPhone app's too: design/motion.mjs, made into motion-timings.js).
//   - A segmented control's selected pill slides to the new choice instead of jumping (the owner: "slide in animations to
//     app components, like menu popup, button toggle etc."). Menus, pop-ups, sheets and switches are CSS (design/motion.mjs).
//   - A deck cover's parallax for browsers that can't scroll-link an animation in CSS (Safari before 26, Firefox): the cover
//     moves at half speed as the page scrolls, and it rests while it's off the screen.
// Reduced motion turns both off.
import T from './motion-timings.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(' + T.ease.join(',') + ')';

// ---------- the pill ----------
// A segmented control is a group (or tab list) of buttons, exactly one of them picked (aria-pressed, aria-current, or
// aria-selected), on a track: the group has a color of its own, the buttons that aren't picked have none, and the picked one
// has a pill. The boards draw every one this way (the pill is the picked button's own background).
const picked = el => el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || ['page', 'true', 'location'].includes(el.getAttribute('aria-current'));
const clear = c => !c || c === 'transparent' || /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/.test(c);
const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
function controls(root) {
  const out = [];
  for (const g of root.querySelectorAll('[role="group"], [role="tablist"]')) {
    const items = [...g.children].filter(c => /^(BUTTON|A)$/.test(c.tagName) && (c.hasAttribute('aria-pressed') || c.hasAttribute('aria-current') || c.hasAttribute('aria-selected')));
    if (items.length < 2 || items.length !== g.children.length) continue;
    const on = items.filter(picked);
    if (on.length !== 1) continue;
    const pill = getComputedStyle(on[0]);
    if (clear(getComputedStyle(g).backgroundColor) || (clear(pill.backgroundColor) && pill.boxShadow === 'none') || items.some(i => i !== on[0] && !clear(getComputedStyle(i).backgroundColor))) continue;
    out.push({ g, items, on: on[0] });
  }
  return out;
}
// Where each segmented control's pill is, before the page changes.
export function snapPills(root) {
  if (reduced.matches) return [];
  return controls(root).map(({ g, items, on }) => ({ g, label: g.getAttribute('aria-label') || '', n: items.length, i: items.indexOf(on), at: box(g), pill: box(on) }));
}
const near = (a, b) => Math.abs(a.left - b.left) < 3 && Math.abs(a.top - b.top) < 3 && Math.abs(a.width - b.width) < 3 && Math.abs(a.height - b.height) < 3;
// After the page changed: a pill whose choice moved slides from where it was to where it is. (The same group, redrawn in
// place; or the same group on another page, in the same place, like the Library's Decks and All cards.)
const going = new WeakMap();
export function slidePills(root, snap) {
  if (reduced.matches || !snap || !snap.length) return;
  for (const { g, items, on } of controls(root)) {
    const was = snap.find(o => o.g === g) || snap.find(o => !o.g.isConnected && o.label === (g.getAttribute('aria-label') || '') && o.n === items.length && near(o.at, box(g)));
    const i = items.indexOf(on);
    if (!was || was.i === i) continue;
    const gb = box(g), at = (b) => ({ left: b.left - gb.left - g.clientLeft + g.scrollLeft, top: b.top - gb.top - g.clientTop + g.scrollTop, width: b.width, height: b.height });
    const to = at(box(on)), cs = getComputedStyle(on);
    // A second tap while it's still sliding starts from where the pill is now.
    const live = going.get(g);
    let from = at(was.pill);
    if (live) { const p = getComputedStyle(g, '::before'); from = { left: parseFloat(p.left), top: parseFloat(p.top), width: parseFloat(p.width), height: parseFloat(p.height) }; live.cancel(); }
    const look = { backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius };
    const frame = b => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', ...look });
    g.setAttribute('data-fx-pill', ''); on.setAttribute('data-fx-hide', '');
    items.forEach(x => x !== on && x.removeAttribute('data-fx-hide'));
    const a = g.animate([frame(from), frame(to)], { duration: T.knob * 1000, easing: EASE, fill: 'both', pseudoElement: '::before' });
    going.set(g, a);
    const done = () => { if (going.get(g) !== a) return; going.delete(g); g.removeAttribute('data-fx-pill'); on.removeAttribute('data-fx-hide'); a.cancel(); };
    a.finished.then(done, () => {});
  }
}

// ---------- the cover's parallax ----------
// The boards do this in CSS where a browser can link an animation to scrolling (.sc-parallax, design/build.mjs). Here, for
// the others: the cover moves down by half of what the page scrolled, between its --from and --to scroll positions, and
// nothing runs while the cover is off the screen.
const linked = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');
const bound = new WeakMap();
const scroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll') return p; } return null; };
export function bindParallax(root) {
  if (linked || reduced.matches) return;
  for (const el of root.querySelectorAll('.sc-parallax')) {
    const sc = scroller(el), prev = bound.get(el);
    if (!sc || (prev && prev.sc === sc)) continue;
    if (prev) prev.stop();
    const num = n => parseFloat(el.style.getPropertyValue(n)) || 0, run = el.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(' + num('--px') + 'px)' }], { duration: 1000, fill: 'both', easing: 'linear' });
    run.pause();
    let seen = true, queued = false;
    const draw = () => { queued = false; const from = num('--from'), to = num('--to'); run.currentTime = 1000 * Math.min(1, Math.max(0, (sc.scrollTop - from) / Math.max(1, to - from))); };
    const onScroll = () => { if (seen && !queued) { queued = true; requestAnimationFrame(draw); } };
    const watch = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) draw(); });
    watch.observe(el.parentElement);
    sc.addEventListener('scroll', onScroll, { passive: true });
    draw();
    bound.set(el, { sc, stop: () => { sc.removeEventListener('scroll', onScroll); watch.disconnect(); run.cancel(); } });
  }
}
