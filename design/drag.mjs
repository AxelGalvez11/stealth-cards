// Dragging decks and cards (the owner: "allow users to drag decks and cards"), for the boards that list them: the
// Library (its decks, and All cards) and a deck's page (its cards), on the web and the iPhone. Boards call
// this.drag(e, options) from the list's onPointerDown, and give the list ref="{{…}}" calling this.dragList(el).
//
// A board marks its root with data-sc-board="<key>" (its own key, so boards side by side on the canvas never move each
// other's decks), the list with data-sc-list, each item with data-sc-item="<id>", and the places to drop on with
// data-sc-drop: "folder:<id>" (a folder), "folder:" (the Library link in a folder, which takes a deck out of it), and
// "deck:<id>" (a deck in the Move to tray, data-sc-tray, which shows while a card is dragged). data-sc-look says how
// a place lights up when something is over it: "tile" (a ring) or "chip" (filled in).
// A mouse drags once it moves a few pixels. A finger holds still for a moment first, so a swipe still scrolls and a tap
// still opens the deck or card. Escape puts it back.
// The item lifts and follows the pointer, the others slide out of its way, and the list scrolls near its top and
// bottom. All of that is one style sheet the drag owns: the app redraws a page by matching it to a fresh copy, which
// would undo styles set on the elements themselves. Nothing changes until the drop: then o.drop(id, { before }) (the
// item it now comes before, or null for last) or o.drop(id, { to }) (the place it was dropped on), and everything
// glides from where it was on screen to where it landed.
// Options: drops (which places it can go, like ['folder:']), reorder (false: it can't move within the list), tray (show
// the board's Move to tray), keep (it stays in the list after going onto a place), lifted (extra style while it's
// lifted), ink and bg (theme colors for a lit place), bottom (how much of the list a tab bar covers), start(id) (it
// just lifted).
function drag(e, o) {
  const ev = e.nativeEvent || e, t = ev.target, doc = t && t.ownerDocument, win = doc && doc.defaultView;
  if (!win || !t.closest || (ev.pointerType === 'mouse' && ev.button !== 0) || ev.isPrimary === false) return;
  if (t.closest('button, input, textarea, select, [role="dialog"], [data-sc-nodrag]')) return;
  const item = t.closest('[data-sc-item]'), list = item && item.closest('[data-sc-list]'), board = list && list.closest('[data-sc-board]');
  if (!board) return;
  const G = win.scDrag || (win.scDrag = {});
  if (G.dragging) return; // a second finger while one drags
  if (G.stop) G.stop(); // a press that never came up (let go outside the window)
  if (G.settle) G.settle();
  const q = s => (win.CSS && win.CSS.escape ? win.CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));
  const B = '[data-sc-board="' + q(board.getAttribute('data-sc-board')) + '"] ', L = B + '[data-sc-list="' + q(list.getAttribute('data-sc-list')) + '"] ';
  const at = x => L + '[data-sc-item="' + q(x) + '"]';
  const id = item.getAttribute('data-sc-item'), own = item.getAttribute('data-sc-from'), pid = ev.pointerId, touch = ev.pointerType === 'touch';
  const x0 = ev.clientX, y0 = ev.clientY, calm = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ease = ' cubic-bezier(.2,.8,.2,1)', sec = n => (calm ? 0 : n) + 's';
  const sheet = G.sheet && G.sheet.isConnected ? G.sheet : (G.sheet = doc.head.appendChild(doc.createElement('style')));
  const LOOK = { tile: () => 'translate:0 -4px!important;scale:1.04!important;box-shadow:0 0 0 2px ' + o.ink + ',0 24px 48px -24px rgba(0,0,0,.45)!important;',
    chip: () => 'background:' + o.ink + '!important;color:' + o.bg + '!important;scale:1.06!important;' };
  const off = [], on = (el, type, fn, opt = true) => { el.addEventListener(type, fn, opt); off.push(() => el.removeEventListener(type, fn, opt)); };
  let live = false, leaving = false, still = false, timer = 0, raf = 0, px = x0, py = y0, dx = 0, dy = 0, tx = 0, ty = 0, spot = null, from = -1, to = -1, size = 1;
  let ids = [], slots = [], k = 1, sc = null, s0 = 0, grid = false, ox = 0, oy = 0, lift = 1;
  const quit = () => { win.clearTimeout(timer); win.cancelAnimationFrame(raf); off.splice(0).forEach(f => f()); live = false; G.dragging = false; if (G.stop === quit) G.stop = null; };
  G.stop = quit;
  // The click that ends a drag doesn't open anything.
  const noClick = () => { const f = c => { c.preventDefault(); c.stopPropagation(); }; win.addEventListener('click', f, true); win.setTimeout(() => win.removeEventListener('click', f, true), 400); };
  const scroller = () => {
    for (let p = list.parentElement; p && p !== doc.body; p = p.parentElement) { const s = win.getComputedStyle(p).overflowY; if ((s === 'auto' || s === 'scroll') && p.scrollHeight > p.clientHeight) return p; }
    return null;
  };

  on(win, 'pointermove', m => {
    if (m.pointerId !== pid) return;
    px = m.clientX; py = m.clientY;
    if (!live) {
      if (m.pointerType === 'mouse' && !m.buttons) { quit(); return; } // the button came up somewhere else
      const far = Math.hypot(px - x0, py - y0);
      if (touch) { if (far > 10) quit(); return; } // a swipe: the page scrolls
      if (far < 6) return;
      begin();
    }
    frame();
  });
  on(win, 'pointerup', m => { if (m.pointerId === pid) (live ? land() : quit()); });
  on(win, 'pointercancel', m => { if (m.pointerId === pid) (live ? back() : quit()); });
  on(win, 'dragstart', d => d.preventDefault()); // not the browser's own dragging of the link or picture
  if (touch) { on(win, 'contextmenu', c => c.preventDefault()); timer = win.setTimeout(begin, 350); }

  function begin() {
    if (live) return;
    const items = [...doc.querySelectorAll(L + '[data-sc-item]')];
    ids = items.map(x => x.getAttribute('data-sc-item')); from = to = ids.indexOf(id);
    if (from < 0) { quit(); return; }
    live = G.dragging = true; win.clearTimeout(timer);
    try { doc.documentElement.setPointerCapture(pid); } catch (x) { /* the pointer is already gone */ }
    try { win.getSelection().removeAllRanges(); } catch (x) { /* nothing was selected */ }
    if (touch && win.navigator.vibrate) try { win.navigator.vibrate(8); } catch (x) { /* no buzz here */ }
    const r = items[from].getBoundingClientRect();
    k = r.width / (items[from].offsetWidth || 1) || 1; // the canvas can show a board zoomed
    sc = scroller(); s0 = sc ? sc.scrollTop : 0;
    const b = sc ? sc.getBoundingClientRect() : { left: 0, top: 0 };
    slots = items.map(x => { const s = x.getBoundingClientRect(); return { x: (s.left - b.left) / k, y: (s.top - b.top) / k + s0, w: s.width / k, h: s.height / k }; });
    grid = new Set(slots.map(s => Math.round(s.x))).size > 1;
    ox = (x0 - r.left) / k; oy = (y0 - r.top) / k; lift = grid ? 1.04 : 1; size = lift;
    on(win, 'keydown', kd => { if (kd.key === 'Escape') { kd.preventDefault(); kd.stopPropagation(); back(); } });
    on(win, 'blur', back, false);
    if (o.start) o.start(id);
    (function roll() { raf = win.requestAnimationFrame(roll); edge(); })();
    frame();
  }
  // Near the top or bottom of the list's scrolling area (above the iPhone's tab bar), it scrolls, faster nearer the edge;
  // not while it's over a place to drop it, or over the Move to tray.
  function edge() {
    if (!sc || still) return;
    const r = sc.getBoundingClientRect(), low = r.bottom - (o.bottom || 0) * k, band = Math.min(72, r.height / 5);
    const v = py < r.top + band ? (py - r.top - band) / band : py > low - band ? (py - low + band) / band : 0, was = sc.scrollTop;
    if (!v) return;
    sc.scrollTop = was + Math.round(Math.max(-1, Math.min(1, v)) * 16);
    if (sc.scrollTop !== was) frame();
  }
  function frame() {
    const me = slots[from];
    dx = (px - x0) / k; dy = (py - y0) / k + ((sc ? sc.scrollTop : 0) - s0);
    // What's under the pointer: a place to drop it, or else a spot in the list.
    const under = doc.elementFromPoint(px, py), hit = under && under.closest('[data-sc-drop]'), name = hit ? hit.getAttribute('data-sc-drop') : '';
    still = !!(under && under.closest('[data-sc-drop], [data-sc-tray]'));
    spot = hit && hit.closest('[data-sc-board]') === board && name !== 'deck:' + own && (o.drops || []).some(p => name.indexOf(p) === 0) ? hit : null;
    to = from;
    if (!spot && o.reorder !== false) {
      const cx = me.x + me.w / 2 + dx, cy = me.y + me.h / 2 + dy;
      if (grid) { let near = Infinity; slots.forEach((s, i) => { const d = Math.hypot(s.x + s.w / 2 - cx, s.y + s.h / 2 - cy); if (d < near) { near = d; to = i; } }); }
      else slots.forEach((s, i) => { const mid = s.y + s.h / 2; if (i > from && cy > mid) to = Math.max(to, i); if (i < from && cy < mid) to = Math.min(to, i); });
    }
    // Over a place to drop it, it shrinks and hangs just below the pointer, so the place shows.
    size = spot ? Math.min(0.45, Math.max(140 / me.w, 28 / me.h)) : lift;
    tx = dx + (spot ? ox * size + 14 : 0); ty = dy + (spot ? oy * size + 14 : 0);
    draw();
  }
  // The others move out of its way: in a grid, each to the next spot; in a list, by its height.
  function shifts() {
    const out = [], me = slots[from];
    if (to > from) { const gap = from + 1 < slots.length ? slots[from + 1].y - me.y - me.h : 0; for (let i = from + 1; i <= to; i++) out.push(grid ? [i, slots[i - 1].x - slots[i].x, slots[i - 1].y - slots[i].y] : [i, 0, -(me.h + gap)]); }
    if (to < from) { const gap = from > 0 ? me.y - slots[from - 1].y - slots[from - 1].h : 0; for (let i = to; i < from; i++) out.push(grid ? [i, slots[i + 1].x - slots[i].x, slots[i + 1].y - slots[i].y] : [i, 0, me.h + gap]); }
    return out;
  }
  function draw() {
    let css = '*{cursor:grabbing!important;-webkit-user-select:none!important;user-select:none!important}'
      + L + '[data-sc-item]{transition:translate ' + sec(0.25) + ease + '!important}'
      + B + '[data-sc-drop]{transition:translate ' + sec(0.2) + ease + ',scale ' + sec(0.2) + ease + ',box-shadow .2s,background-color .2s,color .2s!important}'
      + at(id) + '{position:relative!important;z-index:60!important;pointer-events:none!important;will-change:translate;'
      + 'transition:scale ' + sec(0.2) + ease + ',opacity .2s,box-shadow .2s' + (leaving ? ',translate ' + sec(0.22) + ease : '') + '!important;'
      + 'translate:' + tx + 'px ' + ty + 'px!important;scale:' + size + '!important;transform-origin:' + ox + 'px ' + oy + 'px!important;opacity:' + (leaving ? 0 : spot ? 0.9 : 1) + '!important;' + (o.lifted || '') + '}';
    css += at(id) + ' *{pointer-events:none!important}'; // (its buttons too, so what's under it shows through)
    shifts().forEach(([i, x, y]) => { css += at(ids[i]) + '{translate:' + x + 'px ' + y + 'px!important}'; });
    if (o.tray) css += B + '[data-sc-tray]{display:flex!important}' + (own ? B + '[data-sc-drop="deck:' + q(own) + '"]{display:none!important}' : '');
    if (spot) css += B + '[data-sc-drop="' + q(spot.getAttribute('data-sc-drop')) + '"]{' + (LOOK[spot.getAttribute('data-sc-look')] || LOOK.chip)() + '}';
    sheet.textContent = css;
  }
  function land() {
    const name = spot && spot.getAttribute('data-sc-drop');
    quit(); noClick();
    if (name && !o.keep) {
      // Into a folder or another deck: it shrinks into the place, then the rest close up behind it.
      const el = doc.querySelector(at(id)), a = spot.getBoundingClientRect(), v = el ? el.getBoundingClientRect() : a, s1 = 0.12, me = slots[from];
      tx += (a.left + a.width / 2 - v.left - v.width / 2) / k - (me.w / 2 - ox) * (s1 - size);
      ty += (a.top + a.height / 2 - v.top - v.height / 2) / k - (me.h / 2 - oy) * (s1 - size);
      size = s1; leaving = true; draw();
      win.setTimeout(() => settle(() => o.drop(id, { to: name })), calm ? 0 : 220);
    } else if (name) settle(() => o.drop(id, { to: name }));
    else if (to !== from) settle(() => o.drop(id, { before: to > from ? ids[to + 1] || null : ids[to] }));
    else settle(null);
  }
  function back() {
    if (!live) { quit(); return; }
    quit(); noClick(); settle(null);
  }
  // Makes the change (if there is one), waits for the page to show it, and then moves everything from where it was on
  // screen to where it is now (with no change, that's back where it started).
  function settle(change) {
    const was = {}, box = doc.querySelector(L.trim()) || list;
    doc.querySelectorAll(L + '[data-sc-item]').forEach(x => { was[x.getAttribute('data-sc-item')] = x.getBoundingClientRect(); });
    let ran = false, end = 0;
    const mo = new win.MutationObserver(() => run()), wait = win.setTimeout(() => run(), change ? 600 : 0);
    const done = () => { win.clearTimeout(end); win.clearTimeout(wait); mo.disconnect(); ran = true; sheet.textContent = ''; if (G.settle === run) G.settle = null; };
    function run() {
      if (ran) { done(); return; } // a new drag while this one glides: stop gliding
      ran = true; mo.disconnect(); win.clearTimeout(wait);
      sheet.textContent = '';
      let start = '', glide = '';
      doc.querySelectorAll(L + '[data-sc-item]').forEach(x => {
        const n = x.getAttribute('data-sc-item'), a = was[n];
        if (!a) return;
        const b = x.getBoundingClientRect(), fx = (a.left - b.left) / k, fy = (a.top - b.top) / k, fs = a.width / (b.width || 1);
        if (Math.abs(fx) < 0.5 && Math.abs(fy) < 0.5 && Math.abs(fs - 1) < 0.005) return;
        const me = n === id ? 'position:relative!important;z-index:60!important;' + (o.lifted || '') : '';
        start += at(n) + '{' + me + 'transform-origin:0 0!important;transition:none!important;translate:' + fx + 'px ' + fy + 'px!important;scale:' + fs + '!important}';
        glide += at(n) + '{' + me + 'transform-origin:0 0!important;transition:translate ' + sec(0.3) + ease + ',scale ' + sec(0.3) + ease + ',box-shadow .3s!important;translate:0 0!important;scale:1!important' + (n === id ? ';box-shadow:none!important' : '') + '}';
      });
      if (!start || calm) { done(); return; }
      sheet.textContent = start;
      box.getBoundingClientRect(); // (start from there)
      sheet.textContent = glide;
      end = win.setTimeout(done, 330);
    }
    G.settle = run;
    if (!change) { run(); return; }
    mo.observe(box, { childList: true, subtree: true, attributes: true, characterData: true });
    change();
  }
}
// A finger held on a list can drag instead of scroll: the list tells the browser early that it may stop a scroll
// (a browser only lets a page stop scrolling if it asked before the touch began).
function dragList(el) {
  if (!el || el.scDragList) return;
  el.scDragList = true;
  const win = el.ownerDocument.defaultView;
  el.addEventListener('touchmove', m => { if (win.scDrag && win.scDrag.dragging && m.cancelable) m.preventDefault(); }, { passive: false });
}
// As methods of a board's logic class.
export const DRAG_METHOD = [drag, dragList].map(f => String(f).replace(/^function\s+/, '')).join('\n');
