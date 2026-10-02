// Lucida's own UI for the web app, nothing the browser draws itself (the owner, 2026-10-01): the question that asks before a delete
// (ask), the message that says something went wrong (say), real dialogs (focus goes in, stays in, comes back to what opened it), and the
// arrow keys in menus and lists. The markup is design/ui.mjs (made into web/ui-templates.js by design/to-web.mjs, the same markup the
// canvas's boards draw); this file is what runs. web/app.js calls `vals` for what the markup reads and `after` after each paint.
export function createUi({ schedule, app }) {
  let asking = null, toast = null, toastTimer = 0;
  const seen = new Map(), inerted = new Set();

  // ask({ title, line, action, danger }) answers true (the action) or false (Cancel, Escape, or a press outside the dialog).
  // `line` is at most one short line; `danger` makes the action red (it deletes something).
  const ask = o => new Promise(done => {
    if (asking) { done(false); return; }
    asking = { title: String((o && o.title) || ''), line: String((o && o.line) || ''), action: String((o && o.action) || 'OK'), danger: !!(o && o.danger), done, opener: document.activeElement };
    schedule();
  });
  const answer = yes => {
    const a = asking;
    if (!a) return;
    asking = null;
    schedule();
    a.done(!!yes);
  };
  // say('words') shows a quiet message for a few seconds.
  const say = (text, ms = 5200) => {
    clearTimeout(toastTimer);
    toast = { text: String(text || '') };
    schedule();
    toastTimer = setTimeout(() => { toast = null; schedule(); }, ms);
  };
  // What the markup reads (`t` is the page's colors).
  const vals = t => ({
    t,
    ask: asking ? { show: true, title: asking.title, line: asking.line, hasLine: !!asking.line, action: asking.action, bg: asking.danger ? t.againTint : t.inv, fg: asking.danger ? t.again : t.invText, yes: () => answer(true), no: () => answer(false) } : { show: false },
    toast: toast && toast.text ? { show: true, text: toast.text } : { show: false }
  });

  // ---------- dialogs ----------
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const focusables = root => [...root.querySelectorAll(FOCUSABLE)].filter(visible);
  const modals = () => [...app.querySelectorAll('[role="alertdialog"], [role="dialog"][aria-modal="true"]')].filter(el => !el.closest('.sc-gone'));
  // The open dialog is the only thing the page answers to: everything else is set aside (inert), then given back.
  const setAside = top => {
    for (const el of inerted) if (!top || !el.isConnected) { el.inert = false; inerted.delete(el); }
    if (!top) return;
    // (From the box the dialog and its dimmed backdrop share, so a press on the backdrop still reaches it.)
    for (let n = top.parentElement; n && n !== app; n = n.parentElement) {
      for (const s of n.parentElement ? n.parentElement.children : []) if (s !== n) { s.inert = true; inerted.add(s); }
    }
  };
  // After each paint: a dialog that just opened takes focus (the first thing in it; a question that deletes starts on Cancel), and when it
  // is gone, focus goes back to what opened it.
  const after = () => {
    const now = modals();
    for (const el of now) {
      if (seen.has(el)) continue;
      const held = document.activeElement && !el.contains(document.activeElement) && document.activeElement !== document.body ? document.activeElement : (asking && asking.opener) || null;
      seen.set(el, held);
      if (el.contains(document.activeElement)) continue;
      const list = focusables(el), ask = el.closest('[data-lu="ask"]');
      const pick = ask ? (asking && asking.danger ? list[0] : list[list.length - 1]) : el.querySelector('[role="option"][aria-selected="true"]') || list.find(x => !x.matches('[aria-label="Close"]')) || list[0];
      if (pick) pick.focus({ preventScroll: true });
      else { el.tabIndex = -1; el.focus({ preventScroll: true }); }
    }
    for (const [el, held] of [...seen]) {
      if (el.isConnected) continue;
      seen.delete(el);
      if (!now.length && held && held.isConnected && (document.activeElement === document.body || !document.activeElement || !app.contains(document.activeElement))) held.focus({ preventScroll: true });
    }
    setAside(now.length ? now[now.length - 1] : null);
  };
  // Tab stays inside the open dialog, and Escape closes one the page has no Escape of its own for.
  document.addEventListener('keydown', e => {
    const list = modals(), top = list[list.length - 1];
    if (!top || e.defaultPrevented || e.isComposing) return;
    if (e.key === 'Tab') {
      const f = focusables(top);
      if (!f.length) { e.preventDefault(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    } else if (e.key === 'Escape' && !top.querySelector('[data-key="escape"]')) {
      const close = top.querySelector('[aria-label="Close"], [data-close]');
      if (close) { e.preventDefault(); close.click(); }
    }
  });

  // ---------- menus and lists: the arrow keys ----------
  // In an open menu, dropdown or list (a popover beside its button): Down and Up move between its rows (from the button that opened it,
  // or from its search box, Down goes to the first), Home and End go to the first and the last. Return and Space press the row, and
  // Escape closes it (web/app.js).
  document.addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || e.defaultPrevented || e.isComposing || e.altKey || e.metaKey || e.ctrlKey) return;
    const t = e.target;
    if (!t || !t.closest || !app.contains(t)) return;
    const typing = t.matches('input, textarea, [contenteditable="true"]');
    if (typing && (e.key === 'Home' || e.key === 'End')) return;
    let pop = t.closest('[data-sc-pop], [role="menu"], [role="listbox"]');
    if (!pop && t.getAttribute('aria-expanded') === 'true' && t.parentElement) pop = t.parentElement.querySelector('[data-sc-pop]');
    if (!pop) return;
    // (A calendar moves by days; it has its own keys.)
    if (t.closest('[data-day]') || pop.querySelector('[data-day]')) return;
    const rows = [...pop.querySelectorAll('button:not([disabled]), a[href], [role="menuitem"], [role="option"]')].filter(x => visible(x) && !x.matches('[aria-label="Close"]'));
    if (!rows.length) return;
    const at = rows.findIndex(x => x === t || x.contains(t));
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : e.key === 'ArrowDown' ? (at < 0 ? 0 : Math.min(rows.length - 1, at + 1)) : (at < 0 ? rows.length - 1 : Math.max(0, at - 1));
    e.preventDefault();
    rows[next].focus({ preventScroll: false });
  });

  return { ask, say, vals, after, active: () => !!asking, answer };
}
