// Asking about a card in Explain (the owner, 2026-10-02, on Web · Review · Explain: "add a chatcomposer so user can ask question"). Every Explain
// panel (a flashcard's, Learn mode's, and each question's on a practice test's results) ends with a calm one-line composer, a rounded field
// "Ask about this card" and a round send button (the old Make box's field). A question shows as a short bubble on the right and its answer comes
// in under it in the explanation's own text style; later ones stack below, the panel scrolls, and the composer stays at its bottom. Enter sends
// and Shift+Enter makes a new line. On a phone's web page the composer rides on the keyboard while it would be under it (visualViewport, the
// Notes bar's way: web/notes.js). Each question is one of the day's explanations (Free gets FREE_EXPLAINS, web/plans.mjs), so "N free
// explanations left today" goes down by one; once they're used up the composer shows the upgrade line instead. Closing Explain forgets the
// conversation: it lives in the page (web/db.js `followUp`) and the server's POST /api/explain/ask keeps nothing (web/handler.mjs). The iPhone
// app draws the same pieces natively (ios/Lucida/Screens/Explain.swift), and its design screens read CHAT_SAMPLE (design/to-ios.mjs).

// One question asked and answered, for each board that shows the state (the boards' followUp Tweak, and WebReviewExplainAsk / PhoneReviewExplainAsk).
export const CHAT_SAMPLE = {
  // Review: the electron transport chain card
  review: { q: 'Why does it need oxygen at the end?', a: 'Oxygen is the last stop for the electrons. It takes them at the end of the chain and joins with protons to make water. Without it the electrons back up, the pumping stops, and so does most of the cell’s ATP.' },
  // Learn mode's choice question (a drug makes the inner membrane leak protons)
  learn: { q: 'Where does the energy go instead?', a: 'It comes out as heat. The protons still flow back into the matrix, just not through ATP synthase, so the energy that would have made ATP warms the cell. Brown fat does this on purpose to keep you warm.' },
  // Learn mode's written answer (the Golgi apparatus)
  type: { q: 'Where do the vesicles go next?', a: 'Most go to the cell’s outer membrane and let their proteins out of the cell. Others carry enzymes to the lysosomes, and some wait inside until a signal tells the cell to release them.' },
  // The practice test's question 3 (which organelle makes most of the cell's ATP)
  test: { q: 'How does it make the ATP?', a: 'It runs the electron transport chain on its inner membrane, which pumps protons out and builds a gradient. ATP synthase lets them flow back in and uses that flow to make ATP.' }
};

// The longest question (the server cuts there too) and the field's tallest (four lines, then it scrolls).
export const CHAT_MAX = 500;
const GROW = { phone: 102, web: 92 };

// The pieces' markup. `X` is where the board keeps the conversation's values ('ex.chat' on a flashcard and in Learn mode, 'r.chat' on a test
// question), `c` the panel's colors (template holes: text, muted, bubble, field, again, btn, btnFg) and `o` its sizes: `phone` (16 px in the
// field, so a phone doesn't zoom in), `fs` the explanation's text size, `gap` the panel's gap and `pad` its side padding.
export function chatMarkup({ svg, I }, X, c, o) {
  const fs = o.fs, gap = o.gap, side = Math.max(6, o.pad - 10);
  // Each question as a short bubble on the right, and under it its answer in the explanation's own style (or "Thinking…", or what went wrong).
  const turns = `<sc-if value="{{${X}.hasTurns}}" hint-placeholder-val="{{ false }}"><div role="log" aria-label="Your questions" style="display: flex; flex-direction: column; gap: ${gap + 6}px; padding-top: 2px;"><sc-for list="{{${X}.turns}}" as="qa" hint-placeholder-count="1"><div style="display: flex; flex-direction: column; gap: ${gap}px;">
      <div class="sc-ask-q" style="align-self: flex-end; max-width: 85%; box-sizing: border-box; padding: 8px 14px; border-radius: 18px; background: ${c.bubble}; color: ${c.text}; font-size: 15px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere;">{{qa.q}}</div>
      <sc-if value="{{qa.busy}}" hint-placeholder-val="{{ false }}"><span style="font-size: ${fs}px; color: ${c.muted};">Thinking…</span></sc-if>
      <sc-if value="{{qa.hasA}}" hint-placeholder-val="{{ true }}"><span style="font-size: ${fs}px; line-height: 1.5; overflow-wrap: anywhere;">{{qa.a}}</span></sc-if>
      <sc-if value="{{qa.hasError}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.4; color: ${c.again};">{{qa.error}}</span></sc-if>
    </div></sc-for></div></sc-if>`;
  // The field and its round send button (pale until there's a question), or, once the day's explanations are used up, the upgrade line. The
  // slot keeps its height while the field rides on a phone's keyboard.
  const h = o.phone ? 36 : 32, lh = o.phone ? 22 : 20, py = (h - lh) / 2;
  const composer = `<div class="sc-ask" ref="{{${X}.slotRef}}" style="flex-shrink: 0; box-sizing: border-box; padding: 0 ${side}px ${side}px; {{${X}.slot}}">
      <sc-if value="{{${X}.open}}" hint-placeholder-val="{{ true }}"><div class="sc-ask-in" style="--ask-ring: ${c.muted}; --ask-ph: ${c.muted}; box-sizing: border-box; display: flex; align-items: flex-end; gap: 8px; padding: ${o.phone ? '4px 4px 4px 16px' : '6px 6px 6px 16px'}; border-radius: ${o.phone ? 22 : 22}px; background: ${c.field}; color: ${c.text}; {{${X}.float}}"><textarea rows="1" class="sc-ask-ta" value="{{${X}.draft}}" ref="{{${X}.grow}}" onChange="{{${X}.set}}" onKeyDown="{{${X}.key}}" onFocus="{{${X}.focus}}" onBlur="{{${X}.blur}}" placeholder="Ask about this card" aria-label="Ask about this card" maxlength="${CHAT_MAX}" enterkeyhint="send" autocomplete="off" style="flex: 1 1 auto; min-width: 0; box-sizing: border-box; height: ${h}px; max-height: ${o.phone ? GROW.phone : GROW.web}px; margin: 0; padding: ${py}px 0; border: 0; outline: 0; resize: none; background: transparent; color: ${c.text}; font: inherit; font-size: ${o.phone ? 16 : 15}px; line-height: ${lh}px;">{{${X}.draft}}</textarea><button type="button" onClick="{{${X}.send}}" onMouseDown="{{${X}.hold}}" aria-label="Send" data-tip="Send" aria-disabled="{{${X}.off}}" class="sc-press" style="width: ${h}px; height: ${h}px; flex-shrink: 0; padding: 0; border: 0; border-radius: ${h / 2}px; background: {{${X}.goBg}}; color: {{${X}.goFg}}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s, color .15s;">${svg(I.arrowUp, o.phone ? 18 : 16, 2.2)}</button></div></sc-if>
      <sc-if value="{{${X}.limited}}" hint-placeholder-val="{{ false }}"><div style="box-sizing: border-box; padding: 0 ${o.pad - side}px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px;"><span style="font-size: 14px; line-height: 1.4; color: ${c.again};">{{${X}.limitText}}</span><sc-if value="{{${X}.goPro}}" hint-placeholder-val="{{ true }}"><a href="{{${X}.proHref}}" style="height: 34px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 999px; background: ${c.btn}; color: ${c.btnFg}; font-size: 13px; font-weight: 600;">Go Pro</a></sc-if></div></sc-if>
    </div>`;
  return { turns, composer };
}

// A thin ring while the field has the cursor, the placeholder in the panel's muted color, and no motion with Reduce Motion.
export const CHAT_CSS = '.sc-ask-in{transition:box-shadow .15s}.sc-ask-in:focus-within{box-shadow:inset 0 0 0 1.5px var(--ask-ring)}.sc-ask-ta::placeholder{color:var(--ask-ph);opacity:1}.sc-ask-ta{scrollbar-width:thin}'
  + '@media (prefers-reduced-motion:reduce){.sc-ask-in{transition:none}}';

// A board method: leaving the page forgets the conversations it asked (as closing Explain does), and stops following the keyboard.
export const CHAT_METHOD = `componentWillUnmount() {
  const db = this.props && this.props.db, v = typeof window !== 'undefined' && window.visualViewport;
  if (v && this.chatOnVv) { v.removeEventListener('resize', this.chatOnVv); v.removeEventListener('scroll', this.chatOnVv); this.chatOnVv = null; }
  if (db && db.act && db.act.followUpClear) for (const id of this.chatIds || []) db.act.followUpClear(id);
}`;

// The conversation's values for a board's renderVals (`db` and `this` are the board's). `key` keeps each panel's typing apart (a test has one
// panel a question), `id` is the card, `question` how Learn mode or the test asked it, `exv` db's view of the card's explanation (its `turns` and
// the day's `limit`), and `o`: `show` (the explanation is on screen, so the composer can be), `sample` (the canvas's question and answer),
// `asked` (the canvas shows the sample asked), `pal` (the send button's colors: on, onFg, off, offFg), `phone` (a phone's board) and `proHref`.
// On the canvas a question typed gets the board's sample answer.
export const CHAT_JS = String.raw`const chatView = (key, id, question, exv, o) => {
    exv = exv || {};
    const mock = !!db.mock, st = this.state, draft = (st.chatDraft || {})[key] || '';
    const own = mock ? (o.asked && o.sample ? [{ q: o.sample.q, a: o.sample.a }] : []).concat((st.chatMock || {})[key] || []) : exv.turns || [];
    const turns = own.map(m => ({ q: m.q || '', a: String(m.a || '').replace(/\*\*/g, ''), busy: !!m.busy, hasA: !!m.a && !m.busy, error: m.error || '', hasError: !!m.error && !m.busy }));
    const lim = mock ? null : exv.limit || null, waiting = turns.some(m => m.busy), ready = !!draft.trim() && !waiting;
    const setDraft = v => this.setState({ chatDraft: { ...(this.state.chatDraft || {}), [key]: v } });
    const send = (v, field) => {
      const q = String(v == null ? draft : v).trim().slice(0, ${CHAT_MAX});
      if (!q || waiting || lim || !id) return;
      if (field) { field.value = ''; field.style.height = ''; }
      setDraft('');
      if (mock) this.setState({ chatMock: { ...(this.state.chatMock || {}), [key]: [...((this.state.chatMock || {})[key] || []), { q, a: o.sample ? o.sample.a : '' }] } });
      else { this.chatIds = [...new Set([...(this.chatIds || []), id])]; db.act.followUp(id, q, question); }
    };
    // A phone's web page: while the field would be under the keyboard, it rides on it (the visible part of the page is visualViewport's, which
    // changes as the keyboard comes and goes and as the phone moves the view), and its place in the panel keeps its height.
    const vv = () => (typeof window !== 'undefined' && window.visualViewport) || null;
    const unlisten = () => { const v = vv(); if (v && this.chatOnVv) { v.removeEventListener('resize', this.chatOnVv); v.removeEventListener('scroll', this.chatOnVv); } this.chatOnVv = null; };
    const place = () => {
      const v = vv(), slot = this.chatSlot && this.chatSlot[key];
      let f = null;
      if (v && slot && slot.isConnected && this.chatFocus === key && slot.querySelector('.sc-ask-in') && slot.contains(document.activeElement)) {
        const r = slot.getBoundingClientRect(), low = v.offsetTop + v.height, pill = slot.querySelector('.sc-ask-in'), ph = pill ? pill.offsetHeight : 44, sp = parseFloat(getComputedStyle(slot).paddingLeft) || 0;
        if (r.bottom > low + 1) f = { top: Math.round(low - ph - 8), left: Math.round(r.left + sp), width: Math.round(r.width - 2 * sp), h: Math.round(r.height) };
      } else unlisten();
      if (JSON.stringify(f) !== JSON.stringify(this.chatFloat || null)) { this.chatFloat = f; this.setState({ chatAt: Date.now() }); }
    };
    const fl = this.chatFocus === key && this.chatFloat ? this.chatFloat : null;
    // (the newest question and its answer come into view: the panel scrolls so the question is at its top, or as far as it goes, and a panel
    // in a page that scrolls is brought up)
    const last = turns[turns.length - 1], endKey = id + '|' + turns.length + '|' + (last ? (last.busy ? 'busy' : last.a.length + ':' + last.error) : '') + '|' + !!lim;
    return {
      open: !!o.show && !lim, limited: !!o.show && !!lim, limitText: lim ? lim.text || '' : '', goPro: !!(lim && lim.goPro), proHref: o.proHref,
      turns, hasTurns: turns.length > 0, draft, off: ready ? 'false' : 'true', goBg: ready ? o.pal.on : o.pal.off, goFg: ready ? o.pal.onFg : o.pal.offFg, fill: o.pal.fill || '',
      float: fl ? 'position: fixed; z-index: 60; top: ' + fl.top + 'px; left: ' + fl.left + 'px; width: ' + fl.width + 'px; box-shadow: 0 8px 28px rgba(0,0,0,.16);' : '',
      slot: fl ? 'min-height: ' + fl.h + 'px;' : '',
      set: e => setDraft(e && e.target ? e.target.value : ''),
      // Enter sends; Shift+Enter is a new line (and nothing happens while a word is being composed, or an answer is on its way).
      key: e => { if (!e || e.key !== 'Enter' || e.shiftKey || e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return; if (e.preventDefault) e.preventDefault(); send(e.target && typeof e.target.value === 'string' ? e.target.value : draft, e.target); },
      send: e => { const s = e && e.target && e.target.closest ? e.target.closest('.sc-ask') : null; const f = s ? s.querySelector('textarea') : null; send(f ? f.value : draft, f); if (f && !mock && f.focus) f.focus(); },
      // (pressing send keeps the cursor in the field, so a phone's keyboard stays up)
      hold: e => { if (e && e.preventDefault) e.preventDefault(); },
      // The field grows with what's typed, up to four lines, then scrolls.
      grow: el => { if (!el || !el.style || !el.isConnected) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, o.phone ? ${GROW.phone} : ${GROW.web}) + 'px'; },
      slotRef: el => { if (!el) return; this.chatSlot = { ...(this.chatSlot || {}), [key]: el }; },
      end: el => {
        if (!el || !el.isConnected) return; this.chatEnd = this.chatEnd || {};
        if (this.chatEnd[key] === endKey) return; this.chatEnd[key] = endKey;
        if (!turns.length) return;
        const qs = el.querySelectorAll('.sc-ask-q'), b = qs[qs.length - 1];
        if (b) el.scrollTop += b.getBoundingClientRect().top - el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).paddingTop) || 0); else el.scrollTop = el.scrollHeight;
        if (!mock) setTimeout(() => { const s = this.chatSlot && this.chatSlot[key]; if (s && s.isConnected && s.scrollIntoView && !this.chatFloat) s.scrollIntoView({ block: 'nearest' }); }, 60);
      },
      focus: () => { this.chatFocus = key; if (mock || !o.phone || !vv()) return; unlisten(); this.chatOnVv = place; vv().addEventListener('resize', place); vv().addEventListener('scroll', place); setTimeout(place, 0); setTimeout(place, 350); },
      blur: () => { if (this.chatFocus === key) this.chatFocus = null; unlisten(); if (this.chatFloat) { this.chatFloat = null; this.setState({ chatAt: Date.now() }); } }
    };
  };`;
