// The top of the Library, where decks are made and material goes in (the owner, 2026-10-01: "just make have make cards from home like
// in gizmo"; then: "could we just get rid of the 'today' page so users just focus on the library and deck creation in there?").
//   the Make box     "What do you want to study?": typed words and Enter (or its Make cards button) make cards from a topic, a pasted
//                    YouTube link makes them from the video, a long paste from the text; its + is Upload, and on a computer a file
//                    dropped on the box or the page is uploaded
//   the row          Upload, Paste, YouTube and More (Photos, Record a lecture, A topic, Import cards, New deck): each opens the Make
//                    flow on that kind (web/make.js); an empty deck shows the same row, set to that deck
//   the due line     "12 cards due · About 6 min" and Review (the review of every deck), only when something is due
//   Assigned         what your classes assigned you, only when they did
// The boards that carry them are the Library's (WebDecks, PhoneLibrary, their folder pages and their new account's WebDecksEmpty and
// PhoneDecksEmpty) and the empty deck's (WebDeckEmpty, PhoneDeckEmpty). The iPhone app draws the same pieces natively
// (ios/Lucida/Screens/LibraryTop.swift).
const PASTE = '<rect x="5.5" y="4.5" width="13" height="16" rx="2.5"/><path d="M9 4.5v-.3a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 4.2v.3"/><path d="M9 11h6M9 15h4"/>';

export function homeBlocks(H, phone) {
  const { svg, I } = H;
  const icon = (name, size, w = 2) => svg(name === 'paste' ? PASTE : I[name], size, w);
  // The row's buttons: pills across a computer's page, tiles with the icon over the word on a phone.
  const kindStyle = phone
    ? 'height: 64px; box-sizing: border-box; border-radius: 18px; background: transparent; box-shadow: inset 0 0 0 1px {{t.surf2}}; color: {{t.text}}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; font-size: 13px; font-weight: 600; white-space: nowrap;'
    : 'height: 48px; box-sizing: border-box; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px {{t.surf2}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 600; white-space: nowrap;';
  const kind = (ic, label, href) => `<a href="{{mk.${href}}}" class="sc-press" style="${kindStyle}">${icon(ic, phone ? 20 : 18)}<span>${label}</span></a>`;
  // More: Lucida's own menu under its button (data-sc-pop: Escape and a press outside close it, web/app.js), never the browser's.
  const moreRow = (ic, label, href) => `<a href="{{mk.${href}}}" role="menuitem" onClick="{{mk.more.close}}" style="height: 44px; flex-shrink: 0; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; gap: 12px; border-radius: 12px; color: {{t.text}}; font-size: 14px; font-weight: 600;"><span style="display: flex; color: {{t.muted}};">${icon(ic, 17)}</span>${label}</a>`;
  const more = `<div style="position: relative; display: flex; flex-direction: column;"><button type="button" onClick="{{mk.more.toggle}}" aria-haspopup="menu" aria-expanded="{{mk.more.expanded}}" class="sc-press" style="${kindStyle} flex-grow: 1; border: 0; font: inherit; font-size: ${phone ? 13 : 15}px; font-weight: 600; cursor: pointer;">${icon('chevDown', phone ? 20 : 18)}<span>More</span></button>
    <sc-if value="{{mk.more.open}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="More ways to add cards" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 30; width: ${phone ? 220 : 240}px; box-sizing: border-box; padding: 8px; border-radius: 22px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 2px;">
      ${moreRow('image', 'Photos', 'photoHref')}${moreRow('mic', 'Record a lecture', 'recordHref')}${moreRow('sparkle', 'A topic', 'topicHref')}${moreRow('enter', 'Import cards', 'importHref')}<sc-if value="{{mk.newDeck}}" hint-placeholder-val="{{ true }}">${moreRow('decks', 'New deck', 'newDeckHref')}</sc-if>
    </div></sc-if></div>`;
  const kinds = `<div role="group" aria-label="Add cards from" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: ${phone ? 8 : 10}px;">${kind('upload', 'Upload', 'fileHref')}${kind('paste', 'Paste', 'pasteHref')}${kind('youtube', 'YouTube', 'videoHref')}${more}</div>`;
  // The box: the words, then its + (Upload) on the left and Make cards on the right (pale until there are words to make cards from).
  const go = phone
    ? `<button type="button" onClick="{{mk.go}}" aria-label="Make cards" aria-disabled="{{mk.off}}" class="sc-press" style="width: 36px; height: 36px; flex-shrink: 0; padding: 0; border: 0; border-radius: 18px; background: {{mk.goBg}}; color: {{mk.goFg}}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s, color .15s;">${svg(I.arrowUp, 18, 2.2)}</button>`
    : `<button type="button" onClick="{{mk.go}}" aria-disabled="{{mk.off}}" class="sc-press" style="height: 36px; flex-shrink: 0; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; background: {{mk.goBg}}; color: {{mk.goFg}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s;">${svg(I.sparkle, 16, 2)}Make cards</button>`;
  const box = `<div data-make-drop="1" onDragOver="{{mk.over}}" onDragLeave="{{mk.leave}}" onDrop="{{mk.drop}}" style="box-sizing: border-box; padding: ${phone ? '16px 12px 12px 18px' : '18px 14px 14px 22px'}; border-radius: ${phone ? 24 : 26}px; background: {{t.surf}}; box-shadow: {{mk.ring}}; display: flex; flex-direction: column; gap: ${phone ? 6 : 8}px;">
    <textarea rows="2" onChange="{{mk.set}}" onKeyDown="{{mk.key}}" placeholder="What do you want to study?" aria-label="What do you want to study?" autocomplete="off" style="resize: none; height: ${phone ? 50 : 52}px; margin: 0; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 17px; line-height: 1.45;">{{mk.text}}</textarea>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><a href="{{mk.uploadHref}}" aria-label="Upload" data-tip="Upload" class="sc-press" style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.bg}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center;">${svg(I.plus, 18, 2)}</a>${go}</div>
  </div>`;
  // What's due across your decks, and the review of every deck (the one Today's Start review was).
  const due = `<sc-if value="{{due.show}}" hint-placeholder-val="{{ true }}"><div style="min-height: ${phone ? 60 : 52}px; box-sizing: border-box; padding: 0 ${phone ? 10 : 8}px 0 ${phone ? 18 : 20}px; border-radius: ${phone ? 20 : 18}px; background: {{t.surf}}; display: flex; align-items: center; gap: 12px;"><span style="flex-grow: 1; min-width: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><span style="font-weight: 600;">{{due.count}}</span><span style="color: {{t.muted}};"> · {{due.time}}</span></span><a href="{{due.href}}" class="sc-press" style="height: ${phone ? 40 : 36}px; flex-shrink: 0; padding: 0 18px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: inline-flex; align-items: center; font-size: ${phone ? 15 : 14}px; font-weight: 600;">Review</a></div></sc-if>`;
  return { box, kinds, due, top: box + '\n    ' + kinds };
}

// The logic the pieces read, as a method of a board's logic (`mk` in what renderVals returns): `deckId` sets every way in to that deck (an
// empty deck's row), `folder` puts what a new deck is made from into that folder (a folder's page), `board` is 'Web' or 'Phone' (where the
// canvas's links go), `newDeck` whether More offers New deck.
export const MAKE_BOX_METHOD = String.raw`makeBox(t, db, { deckId = '', folder = '', board = 'Web', newDeck = true } = {}) {
  const s = this.state, mock = !!db.mock, text = s.mkText || '', words = text.trim(), ready = words.length >= 2;
  const at = k => '/make?source=' + k + (deckId ? '&deck=' + encodeURIComponent(deckId) : '') + (folder ? '&folder=' + encodeURIComponent(folder) : '');
  const href = k => (mock ? board + 'Make.dc.html' : at(k));
  // A YouTube link, a long paste (more than one line, or longer than a topic holds), or a topic in a few words.
  const kindOf = v => { const w = String(v || '').trim(); return /^(https?:\/\/)?([\w-]+\.)*(youtube\.com|youtu\.be|youtube-nocookie\.com)\/\S+$/i.test(w) ? 'video' : /\n/.test(w) || w.length > 200 ? 'paste' : 'topic'; };
  // The Make flow opens on that kind with the words already in, and the flow's own deck choice says where the cards go.
  const begin = v => { const w = String(v || '').trim(), k = kindOf(w); if (mock || w.length < 2) return; this.setState({ mkText: '' });
    db.make.begin({ kind: k, ...(k === 'video' ? { url: w } : k === 'paste' ? { text: w } : { topic: w }), opts: { deckId, folder } }); };
  const upload = list => { this.setState({ mkOver: false }); if (mock || !list || !list.length) return; db.make.begin({ kind: 'file', opts: { deckId, folder } }); db.make.addFiles([...list]); };
  const files = e => { const ty = e && e.dataTransfer && e.dataTransfer.types; return !!ty && [...ty].includes('Files'); };
  const open = !!s.mkMore, close = () => this.setState({ mkMore: false });
  return {
    text, off: ready ? 'false' : 'true', goBg: ready ? t.inv : t.surf2, goFg: ready ? t.invText : t.muted,
    set: e => { const v = e && e.target ? e.target.value : '', how = e && (e.inputType || (e.nativeEvent && e.nativeEvent.inputType));
      if (how === 'insertFromPaste' && kindOf(v) !== 'topic') return begin(v);
      this.setState({ mkText: v }); },
    key: e => { if (!e || e.key !== 'Enter' || e.shiftKey || e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing)) return; if (e.preventDefault) e.preventDefault(); begin(e.target && typeof e.target.value === 'string' ? e.target.value : text); },
    go: () => begin(text),
    uploadHref: href('file'), fileHref: href('file'), pasteHref: href('paste'), videoHref: href('video'), photoHref: href('photo'), recordHref: href('record'), topicHref: href('topic'),
    importHref: mock ? 'WebImport.dc.html' : db.href('import', deckId), newDeckHref: mock ? board + 'NewDeck.dc.html' : db.href('newDeck'), newDeck,
    more: { open, expanded: open ? 'true' : 'false', toggle: () => this.setState({ mkMore: !open }), close },
    // A file over the page rings the box; dropped, it goes to Upload.
    ring: s.mkOver ? 'inset 0 0 0 2px ' + t.text : 'none',
    over: e => { if (!files(e)) return; e.preventDefault(); if (!s.mkOver) this.setState({ mkOver: true }); },
    leave: e => { const el = e && e.target && e.target.closest ? e.target.closest('[data-make-drop]') || e.target : null, r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (s.mkOver && (!r || e.clientX <= r.left || e.clientX >= r.right || e.clientY <= r.top || e.clientY >= r.bottom)) this.setState({ mkOver: false }); },
    drop: e => { if (!files(e)) return; e.preventDefault(); upload(e.dataTransfer.files); }
  };
}
// What's due, for the due line: how many cards, about how long, and the review of every deck.
dueLine(db, board = 'Web') {
  const td = db.today(), n = td.due || 0;
  return { show: n > 0, count: n + (n === 1 ? ' card' : ' cards') + ' due', time: 'About ' + Math.max(1, td.minutes || 1) + ' min', href: db.mock ? board + 'Review.dc.html' : td.studyHref };
}`;
