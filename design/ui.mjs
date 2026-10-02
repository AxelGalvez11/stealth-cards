// Lucida's own UI for what a browser or a phone would draw itself (the owner, 2026-10-01: "all buttons and actions need to have ui? i dont
// want anything that has ios or google default ui"): the question that asks before something is deleted, the message that says
// something went wrong, and the calendar that picks a day. Never confirm(), alert() or <input type="date">.
//   - design/build.mjs puts the markup in the boards that show one open (their Tweaks), so the canvas draws each one.
//   - design/to-web.mjs writes the same markup to web/ui-templates.js, which web/app.js draws over any page for a question or a message
//     that comes from the app's own code (web/ui.js), so the app and the canvas are the same markup.
//   - The iPhone app draws the same things natively (Design/Question.swift, Toast.swift, DatePicker.swift).
// A question: a title, at most one short line, Cancel and the answer (red when it deletes). On a computer it is a dialog over the
// dimmed page; on a phone, a sheet from the bottom, like every other question of the iPhone app.
import { MOTION } from './motion.mjs';

const svg = (p, s = 18, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const CHEV = '<path d="M9 6l6 6-6 6"/>', BACK = '<path d="M15 18l-6-6 6-6"/>';

// `layer`: 'fixed' over the whole page (the app), 'absolute' inside a board (the canvas, where a board is its own page).
export const askMarkup = ({ phone = false, layer = 'fixed' } = {}) => `<sc-if value="{{ask.show}}" hint-placeholder-val="{{ false }}"><div data-lu="ask" style="position: ${layer}; inset: 0; z-index: 2000; display: flex; justify-content: center; align-items: ${phone ? 'flex-end' : 'center'};">
  <div class="${phone ? 'sc-scrim' : 'sc-fade'}" onClick="{{ask.no}}" style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="alertdialog" aria-modal="true" aria-labelledby="lu-ask-title" aria-describedby="lu-ask-line" class="${phone ? 'sc-sheet' : 'sc-pop'}" style="position: relative; box-sizing: border-box; ${phone ? 'width: 100%; padding: 10px 20px 34px; border-radius: 32px 32px 0 0;' : 'width: 440px; max-width: calc(100% - 32px); padding: 28px; border-radius: 32px; box-shadow: 0 24px 64px rgba(0,0,0,.24);'} background: {{t.bg}}; color: {{t.text}}; font-family: Geist, -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; gap: 14px; text-shadow: none;">
    ${phone ? '<div aria-hidden="true" style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>' : ''}
    <span id="lu-ask-title" style="font-size: 22px; font-weight: 600; letter-spacing: -.02em; line-height: 1.2;">{{ask.title}}</span>
    <sc-if value="{{ask.hasLine}}" hint-placeholder-val="{{ true }}"><p id="lu-ask-line" style="margin: 0; font-size: 15px; line-height: 1.45; color: {{t.muted}};">{{ask.line}}</p></sc-if>
    <div style="display: flex; gap: 10px; margin-top: 6px;"><button type="button" data-key="escape" onClick="{{ask.no}}" class="sc-press" style="flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Cancel</button><button type="button" onClick="{{ask.yes}}" class="sc-press" style="flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{ask.bg}}; color: {{ask.fg}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">{{ask.action}}</button></div>
  </div></div></sc-if>`;

// A message: a quiet pill that comes in, stays a few seconds and goes (a save that failed, a file that can't be used). It never
// takes focus; a screen reader reads it where it is (role=status).
export const toastMarkup = ({ phone = false, layer = 'fixed' } = {}) => `<sc-if value="{{toast.show}}" hint-placeholder-val="{{ false }}"><div data-lu="toast" style="position: ${layer}; left: 0; right: 0; bottom: ${phone ? 104 : 28}px; z-index: 2100; display: flex; justify-content: center; padding: 0 16px; pointer-events: none;">
  <div role="status" aria-live="polite" class="sc-pop" style="max-width: 420px; box-sizing: border-box; padding: 12px 18px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-family: Geist, -apple-system, system-ui, sans-serif; font-size: 14px; font-weight: 500; line-height: 1.35; text-align: center; box-shadow: 0 8px 28px rgba(0,0,0,.22); pointer-events: auto;">{{toast.text}}</div>
</div></sc-if>`;

// What the app draws over a page: the question and the message, for a computer and for a phone.
export const overlayTemplates = () => ({
  web: askMarkup({ phone: false }) + toastMarkup({ phone: false }),
  phone: askMarkup({ phone: true }) + toastMarkup({ phone: true })
});

// The question as a board's Tweak shows it: each board lists the questions it can ask (ASK_SAMPLES holds their words, the same as the
// app's), and `this.askPreview(t, ASK_SAMPLES)` turns the Tweak's choice into the holes the markup reads.
export const ASK_SAMPLES = {
  'Delete deck': { title: 'Delete “MCAT Biochemistry”?', line: 'Its 42 cards go too. This can’t be undone.', action: 'Delete deck', danger: true },
  'Remove from library': { title: 'Remove “MCAT Biochemistry”?', line: 'Your progress on it goes too.', action: 'Remove', danger: true },
  'Remove folder': { title: 'Remove the folder “Med school”?', line: 'Its decks stay in your library.', action: 'Remove folder', danger: true },
  'Delete card': { title: 'Delete this card?', line: '', action: 'Delete card', danger: true },
  'Leave without saving': { title: 'Leave anyway?', line: 'Your new card isn’t finished, so it won’t be added.', action: 'Leave', danger: false },
  'Delete my data': { title: 'Delete all your data?', line: 'Every deck, card and review goes. This can’t be undone.', action: 'Delete my data', danger: true },
  'Sign out': { title: 'Sign out of Lucida?', line: '', action: 'Sign out', danger: false },
  'Delete source': { title: 'Delete “Lecture 4.m4a”?', line: 'Its file goes. The 6 cards made from it stay in the deck.', action: 'Delete', danger: true },
  'Delete page': { title: 'Delete the page “Week 3”?', line: '', action: 'Delete page', danger: true },
  'Disconnect app': { title: 'Disconnect Claude?', line: 'It can’t use your decks until you connect it again.', action: 'Disconnect', danger: true },
  'New link': { title: 'Make a new link?', line: 'AI apps using the old one stop working until you give them the new one.', action: 'Make a new link', danger: false },
  'Leave class': { title: 'Leave “Biology 101”?', line: 'The decks you study from it stay in your library.', action: 'Leave class', danger: true },
  'Delete class': { title: 'Delete “Biology 101”?', line: 'Everyone in it keeps the decks they study.', action: 'Delete class', danger: true },
  'Take out of class': { title: 'Take Maria out of the class?', line: '', action: 'Take out', danger: true }
};
export const ASK_JS = `askPreview(t, samples) {
  const q = samples[this.props.ask || ''];
  return q ? { show: true, title: q.title, line: q.line, hasLine: !!q.line, action: q.action, bg: q.danger ? t.againTint : t.inv, fg: q.danger ? t.again : t.invText, yes: () => {}, no: () => {} } : { show: false };
}`;
// A board's Tweak that opens one of its questions.
export const askProp = list => ({ editor: 'enum', default: '', options: ['', ...list] });

// ---------- the calendar (a day to pick: an exam, a class's due date) ----------
// A small calendar in a popover under what opens it (a sheet is too much for one day): the month and its arrows, the days of the week,
// the days of the month (today has a ring, the picked day is filled, days before `min` are dimmed and can't be picked), and it works
// from the keyboard: arrows move a day or a week, Page Up and Page Down a month, Return picks, Escape closes (web/app.js). `k` names a
// renderVals object made by `this.datePick(...)` below. `trigger` is the button that opens it, with aria-expanded="{{k.expanded}}".
export const dateMarkup = (k, trigger, { w = 308, pos = 'right: 0; top: calc(100% + 8px);' } = {}) => `<div style="position: relative;">${trigger}<sc-if value="{{${k}.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="{{${k}.title}}" data-sc-pop style="position: absolute; ${pos} z-index: 30; width: ${w}px; max-width: calc(100vw - 32px); box-sizing: border-box; padding: 14px; border-radius: 22px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 10px; text-shadow: none;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;"><button type="button" onClick="{{${k}.prev}}" aria-label="Earlier month" aria-disabled="{{${k}.prevOff}}" class="sc-press" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: {{t.surf}}; color: {{t.text}}; opacity: {{${k}.prevOp}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(BACK, 15, 2.2)}</button><span role="status" aria-live="polite" style="font-size: 15px; font-weight: 600; letter-spacing: -.01em;">{{${k}.month}}</span><button type="button" onClick="{{${k}.next}}" aria-label="Later month" class="sc-press" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(CHEV, 15, 2.2)}</button></div>
  <div role="group" aria-label="{{${k}.month}}" onKeyDown="{{${k}.key}}" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px;">
    <sc-for list="{{${k}.weekdays}}" as="d" hint-placeholder-count="7"><span aria-hidden="true" style="height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: {{t.muted}};">{{d}}</span></sc-for>
    <sc-for list="{{${k}.cells}}" as="c" hint-placeholder-count="35"><sc-if value="{{c.blank}}" hint-placeholder-val="{{ false }}"><span aria-hidden="true"></span></sc-if><sc-if value="{{c.day}}" hint-placeholder-val="{{ true }}"><button type="button" ref="{{c.ref}}" data-day="{{c.iso}}" onClick="{{c.pick}}" aria-label="{{c.label}}" aria-pressed="{{c.on}}" aria-current="{{c.today}}" aria-disabled="{{c.off}}" style="height: 36px; padding: 0; border: 0; border-radius: 18px; background: {{c.bg}}; color: {{c.fg}}; box-shadow: {{c.ring}}; opacity: {{c.op}}; font: inherit; font-size: 14px; font-weight: {{c.weight}}; font-variant-numeric: tabular-nums; cursor: pointer;">{{c.n}}</button></sc-if></sc-for>
  </div>
</div></sc-if></div>`;
// The logic of one calendar, for a board's renderVals (it needs `t`): `this.datePick(key, { value, min, title, choose, shown })` returns the holes.
// value and min are 'YYYY-MM-DD' ('' for none); choose(iso) is called with the day picked. `shown` opens it on a board whose Tweak asks.
export const DATE_JS = `datePick(t, key, { value = '', min = '', title = 'Pick a day', choose, shown = false }) {
  const pad = n => String(n).padStart(2, '0'), iso = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d), now = new Date(), today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const st = this.state, open = 'dpIs' in st ? st.dpIs === key : shown, parse = s => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2] - 1, +m[3]] : null; };
  const base = parse(value) || parse(min) || [now.getFullYear(), now.getMonth(), now.getDate()];
  const view = st.dpKey === key && st.dpView ? st.dpView : [base[0], base[1]], y = view[0], m = view[1];
  const first = new Date(y, m, 1).getDay(), count = new Date(y, m + 1, 0).getDate(), MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const go = (dy, dm) => { const d = new Date(y, m + dm, 1); this.setState({ dpKey: key, dpView: [d.getFullYear(), d.getMonth()] }); };
  const prevStart = parse(min), canPrev = !prevStart || y > prevStart[0] || (y === prevStart[0] && m > prevStart[1]);
  const shut = () => this.setState({ dpIs: '', dpKey: '', dpView: null, dpFocus: '' });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push({ blank: true, day: false });
  for (let d = 1; d <= count; d++) {
    const s = iso(y, m, d), on = s === value, off = !!min && s < min, isToday = s === today;
    cells.push({ blank: false, day: true, n: String(d), iso: s, on: on ? 'true' : 'false', today: isToday ? 'date' : 'false', off: off ? 'true' : 'false', label: MONTHS[m] + ' ' + d + ', ' + y,
      bg: on ? t.inv : 'transparent', fg: on ? t.invText : t.text, ring: isToday && !on ? 'inset 0 0 0 1.5px ' + t.muted : 'none', op: off ? '.3' : '1', weight: on || isToday ? '600' : '400',
      pick: () => { if (off) return; shut(); choose(s); },
      ref: el => { if (el && this.state.dpFocus === s && !this.dpDone) { this.dpDone = s; el.focus(); } } });
  }
  const move = (s, by) => { const p = parse(s); if (!p) return; const d = new Date(p[0], p[1], p[2] + by), t2 = iso(d.getFullYear(), d.getMonth(), d.getDate()); if (min && t2 < min) return; this.dpDone = ''; this.setState({ dpKey: key, dpView: [d.getFullYear(), d.getMonth()], dpFocus: t2 }); };
  return { open, expanded: open ? 'true' : 'false', title, month: MONTHS[m] + ' ' + y, weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], cells,
    prev: () => canPrev && go(0, -1), next: () => go(0, 1), prevOff: canPrev ? 'false' : 'true', prevOp: canPrev ? '1' : '.3',
    toggle: () => { if (open) shut(); else { this.dpDone = ''; this.setState({ dpIs: key, dpKey: key, dpView: [base[0], base[1]], dpFocus: '' }); } }, close: shut,
    key: e => {
      const el = e && e.target && e.target.closest ? e.target.closest('[data-day]') : null, s = el ? el.getAttribute('data-day') : '';
      const by = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (by && s) { e.preventDefault(); move(s, by); }
      else if ((e.key === 'PageDown' || e.key === 'PageUp') && s) { e.preventDefault(); const p = parse(s), d = new Date(p[0], p[1] + (e.key === 'PageDown' ? 1 : -1), Math.min(p[2], 28)); move(iso(d.getFullYear(), d.getMonth(), d.getDate()), 0); }
    } };
}`;
export { MOTION };
