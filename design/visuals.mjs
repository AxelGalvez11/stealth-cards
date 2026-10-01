// What the article pages show besides their words: drawn diagrams made of flashcards, tables made from bullets that are already
// a table, the real screens of the app as pictures, and a "Test yourself" set of flashcards. The words stay the page file's; this
// only says WHERE each thing goes and the few labels, captions and test cards that restate what the page says.
//
//   design/site/_visuals.json   { "<slug>": { figs: [...], tables: [...], test: [...] } }  (read by design/site.mjs, page.visuals)
//   figs[]    { kind, at: "<h2 of the section it goes in>", pos: "before" | "after" (default after), caption, ...the kind's labels }
//   tables[]  { at: "<h2>", columns: ["What", "On the free plan"] }  a section's bullets that begin with a bold lead-in, as a table
//   test[]    { q, a }  3 or 4 cards, from facts already on the page
//
// The kinds of figure (design/build.mjs draws each one; the check in design/check-site.mjs knows this list):
//   pick       the page's two "Pick X if …" bullets as two flashcards side by side (their own words)
//   steps      small step cards with arrows: `steps: [{ t, d }]`, or `auto: true` for a section's numbered steps (their bold lead-ins)
//   apps       a row of small cards, an app and its one line: `cards: [{ name, line, lucida }]`
//   checklist  a section's bullets as a checklist card (their own words)
//   screen     one of Lucida's real screens, as a picture (SCREENS below): `id`, `caption`, `alt`
//   and the drawings of single pages: timeline, chat, learn, live, fork, class, occlusion, import, plan, example, words.
//
// visualsOf() runs inside the boards (design/build.mjs writes it into their logic with .toString()), so it stands alone: it uses
// nothing outside itself except what `E` hands it.

// The app's real screens, drawn from its own boards (design/screens.mjs, into web/shots/): a board at 1440 × 900 for a computer
// and, where the app has one, the iPhone board at 390 × 844 for a phone. `crop` is the part of the board that is shown, [x, y, w, h].
export const SCREENS = {
  review:  { desk: { board: 'WebReviewFour', crop: [300, 130, 840, 640] }, phone: { board: 'PhoneReviewFour', crop: [0, 340, 390, 480] },
    alt: 'Lucida’s review screen: a card, and the Forgot, Hard, Good and Easy buttons, each with the time until the card comes back' },
  learn:   { desk: { board: 'WebQuiz', crop: [250, 10, 940, 640] }, phone: { board: 'PhoneQuiz', crop: [0, 105, 390, 390] },
    alt: 'Learn mode: a question with four answers, and the bar at the top showing how many cards are learned' },
  setup:   { desk: { board: 'WebQuizStart', crop: [400, 160, 640, 590] }, phone: { board: 'PhoneQuizStart', crop: [0, 250, 390, 420] },
    alt: 'Learn mode’s start screen: which cards, and which kinds of questions (multiple choice, matching, true or false, fill in the blank, type the answer)' },
  live:    { desk: { board: 'LiveQuestion', crop: [30, 190, 1380, 540] }, phone: { board: 'LiveAnswer', crop: [0, 40, 390, 440] },
    alt: 'A live game: the question on the big screen with four colored answers, and the player’s phone with the same answers' },
  deck:    { desk: { board: 'WebPublicDeck', crop: [270, 20, 1130, 640] }, phone: { board: 'PhonePublicDeck', crop: [0, 0, 390, 440] },
    alt: 'A shared deck’s page: its cover, the Study and Make a copy buttons, its cards and how it was made' },
  class:   { desk: { board: 'WebClass', crop: [270, 20, 1130, 640] }, phone: { board: 'PhoneClass', crop: [0, 100, 390, 390] },
    alt: 'A class: its assignments, how far each student who shares has got, the invite code and the people in it' },
  picture: { desk: { board: 'WebCardsScreenImage', crop: [370, 130, 1060, 620] }, phone: { board: 'PhoneReviewImage', crop: [0, 100, 390, 440] },
    alt: 'A picture card in Lucida: boxes cover the labels of a picture, and each box is its own card' },
  import:  { desk: { board: 'WebImport', crop: [400, 130, 640, 640] }, phone: { board: 'WebImport', crop: [420, 143, 600, 400] },
    alt: 'Import cards: pasted text with one card per line, the number of cards found, and the deck to put them in' },
  connect: { desk: { board: 'WebConnect', crop: [270, 50, 1130, 650] }, phone: { board: 'PhoneConnect', crop: [0, 50, 390, 420] },
    alt: 'Connect your AI: your personal link, the AI apps you can add it to, and what your AI may do with your cards' },
  consent: { desk: { board: 'WebConnectConsent', crop: [440, 180, 560, 540] }, phone: { board: 'PhoneConnectConsent', crop: [0, 180, 390, 480] },
    alt: 'The screen where an AI app asks to use your Lucida decks, with Allow and Cancel' },
  decks:   { desk: { board: 'WebDecks', crop: [270, 20, 1130, 640] }, phone: { board: 'PhoneLibrary', crop: [0, 40, 390, 480] },
    alt: 'Lucida’s library: folders and decks, each with the number of cards due' },
  audio:   { desk: { board: 'WebReviewAudio', crop: [300, 120, 840, 540] }, phone: { board: 'PhoneReviewAudio', crop: [0, 200, 390, 360] },
    alt: 'A sound card in review: a play button, the sound’s wave, and the question' },
  stats:   { desk: { board: 'WebStats', crop: [270, 20, 1130, 580] }, phone: { board: 'PhoneStats', crop: [0, 40, 390, 480] },
    alt: 'Stats: your streak, reviews, how much you remember, and the days you studied' }
};

// The kinds of figure the article template draws (design/build.mjs has a drawing for each).
export const KINDS = ['pick', 'steps', 'apps', 'checklist', 'screen', 'gaps', 'curve', 'chat', 'learn', 'live', 'fork', 'class', 'occlusion', 'import', 'plan', 'example', 'words'];

// Where the pictures of a screen are (web/shots/): a computer and a phone, light and dark.
export const shotFile = (id, phone, dark) => '/shots/' + id + (phone ? '-phone' : '') + (dark ? '-dark' : '') + '.webp';

// The Connect guide (lucida.cards/connect, a page of its own kind, not a page file): its four steps as cards, and the screen where an AI
// app asks to use your decks.
export const CONNECT_FIGS = [
  { kind: 'steps', at: 'What you need', pos: 'before', caption: 'Connecting Lucida to your AI, in four steps',
    steps: [{ t: 'Copy the address', d: 'Use it exactly as written' }, { t: 'Add it in your AI', d: 'As a connector, also called an MCP server' }, { t: 'Sign in and allow', d: 'Sign in to Lucida if it asks, then press Allow' }, { t: 'Ask for cards', d: 'Start a chat and turn Lucida on' }] },
  { kind: 'screen', id: 'consent', at: 'Claude', pos: 'after', caption: 'The screen where Claude asks to use your Lucida decks: press Allow' }
];

export function visualsOf(P, E, sections) {
  const V = P.visuals || {}, out = { bySection: {}, test: [], hasTest: false };
  const sec = h2 => (out.bySection[h2] = out.bySection[h2] || { before: [], after: [], table: null, hide: [], hideParas: false });
  const cap = k => k.charAt(0).toUpperCase() + k.slice(1);
  const secOf = h2 => sections.find(s => s.h2 === h2);
  // A figure: its kind and a flag for it (isPick …), its caption, and what the kind carries.
  const flags = k => Object.fromEntries(E.KINDS.map(x => ['is' + cap(x), x === k]));
  const fig = (f, data) => ({ kind: f.kind, ...flags(f.kind), caption: f.caption || '', hasCaption: !!f.caption, label: f.label || '', ...data });
  const stepOf = b => {
    const m = /^\*\*([^*]+)\*\*/.exec(b.raw), t = m ? E.plain(m[1]).replace(/^\d+\.\s*/, '').replace(/[\s.:,;]+$/, '') : E.plain(b.raw).slice(0, 40);
    return { t };
  };
  for (const f of V.figs || []) {
    const s = secOf(f.at);
    if (!s) continue;
    const t = sec(s.h2), list = f.pos === 'before' ? t.before : t.after;
    if (f.kind === 'pick') {
      // The two bullets "Pick X if …": each one's own words on a card; the card is titled with the app's name.
      const items = s.bullets.map(b => { const m = /^\*\*Pick ([^*]+)\*\*/.exec(b.raw), name = m ? E.plain(m[1]).trim() : ''; return { id: b.id, noId: !b.id, name, lucida: name === 'Lucida', parts: b.parts }; });
      list.push(fig(f, { items }));
      t.hide = s.bullets.map((_, i) => i);
    } else if (f.kind === 'checklist') {
      list.push(fig(f, { rows: s.bullets.map(b => ({ id: b.id, noId: !b.id, parts: b.parts })) }));
      t.hide = s.bullets.map((_, i) => i);
    } else if (f.kind === 'steps') {
      const steps = f.auto ? s.bullets.filter(b => /^\*\*\d+\./.test(b.raw)).map(stepOf) : (f.steps || []).map(x => ({ t: x.t, d: x.d || '' }));
      list.push(fig(f, { steps: steps.map((x, i) => ({ n: String(i + 1), t: x.t, d: x.d || '', hasD: !!x.d, more: i < steps.length - 1 })), count: String(steps.length), cols: ' sp-n' + steps.length }));
    } else if (f.kind === 'screen') {
      const sc = E.SCREENS[f.id];
      if (!sc) continue;
      const phone = !!E.PHONE, side = phone ? sc.phone : sc.desk, [x, y, w, h] = side.crop;
      const b = Object.fromEntries(E.BOARDS.map(n => [n, n === side.board]));
      // The width it is shown at: the column (680 px, or a phone's 350), but no taller than 560 px (420 on a phone).
      const dw = Math.min(phone ? 350 : 680, (phone ? 420 : 560) * w / h), k = dw / w;
      list.push(fig(f, {
        id: f.id, alt: f.alt || sc.alt, b, board: side.board,
        d: { w: String(sc.desk.crop[2]), h: String(sc.desk.crop[3]), ar: (sc.desk.crop[2] / sc.desk.crop[3]).toFixed(4) }, p: { w: String(sc.phone.crop[2]), h: String(sc.phone.crop[3]), ar: (sc.phone.crop[2] / sc.phone.crop[3]).toFixed(4) },
        src: { d: E.shotFile(f.id, false, false), dd: E.shotFile(f.id, false, true), p: E.shotFile(f.id, true, false), pd: E.shotFile(f.id, true, true) },
        // On the canvas: the board itself, cropped and scaled to the width it has (the column's 680 px, or a phone's 350).
        ar: (w / h).toFixed(4), dw: dw.toFixed(1), k: k.toFixed(5), tx: String(-x), ty: String(-y), bw: String(side.board.startsWith('Phone') || /^LiveAnswer$/.test(side.board) ? 390 : 1440), bh: String(side.board.startsWith('Phone') || /^LiveAnswer$/.test(side.board) ? 844 : 900)
      }));
    } else if (f.kind === 'gaps') {
      // Cards and the gaps between them: a gap's width grows, its height (on a phone) grows more slowly.
      const items = [];
      f.cards.forEach((t, i) => {
        items.push({ isCard: true, isGap: false, t, cv: String(i % 8), w: '0', h: '0' });
        if (i < f.gaps.length) { const w = [2, 3, 6, 10, 16, 24][i] || 24; items.push({ isCard: false, isGap: true, t: f.gaps[i], cv: '0', w: String(w), h: String(Math.round(10 + 9 * Math.log2(w))) }); }
      });
      list.push(fig(f, { items }));
    } else if (f.kind === 'apps') {
      list.push(fig(f, { cards: f.cards.map(c => ({ name: c.name, line: c.line, lucida: !!c.lucida })) }));
    } else if (f.kind === 'fork') {
      // The first two bullets ("**Study it as it is.** …", "**Make a copy.** …") as two branches: the bold lead-in is a branch's title,
      // each sentence after it a line; their words are the bullets' own, so the bullets give way to the fork.
      const idx = f.replace || [0, 1];
      const ways = idx.map(i => s.bullets[i]).filter(Boolean).map(b => {
        const m = /^\*\*([^*]+)\*\*\s*([\s\S]*)$/.exec(b.raw), rest = m ? m[2] : b.raw;
        return { id: b.id, noId: !b.id, t: m ? E.plain(m[1]).replace(/[\s.:,;]+$/, '') : '', lines: rest.split(/(?<=[.!?])\s+/).filter(Boolean).map(x => ({ parts: E.parts(x) })) };
      });
      list.push(fig(f, { ...f, ways }));
      t.hide = idx;
    } else if (f.kind === 'learn') {
      const path = f.path.map((x, i) => ({ t: x.t, d: x.d || '', hasD: !!x.d, done: i === f.path.length - 1, more: i < f.path.length - 1 }));
      list.push(fig(f, { ...f, path }));
    } else if (f.kind === 'live') {
      const colors = ['#4F57E6', '#C2410C', '#0E7490', '#BE185D'];
      list.push(fig(f, { ...f, board: f.board.map((r, i) => ({ n: String(i + 1), i: r.who.charAt(0), c: colors[i % 4], who: r.who, pts: r.pts })) }));
    } else if (f.kind === 'class') {
      const colors = ['#4F57E6', '#C2410C', '#0E7490', '#BE185D', '#7E22CE'];
      const steps = s.bullets.filter(b => /^\*\*\d+\./.test(b.raw)).map(stepOf).map((x, i) => ({ n: String(i + 1), t: x.t }));
      list.push(fig(f, { ...f, letters: f.code.split(''), people: f.people.map((n, i) => ({ i: n.charAt(0), c: colors[i % 5] })), steps }));
    } else if (f.kind === 'plan') {
      const steps = f.steps.map((x, i) => ({ n: x.n, t: x.t, d: x.d || '', hasD: !!x.d, cv: String([0, 2, 4, 6, 1, 3][i % 6]), more: i < f.steps.length - 1 }));
      list.push(fig(f, { steps, cols: ' sp-n' + steps.length }));
    } else if (f.kind === 'example') {
      list.push(fig(f, { ...f, load: f.load.map((x, i) => ({ t: x, cv: String([0, 2, 4][i % 3]) })) }));
    } else {
      // The other drawings carry what the page file gives them.
      list.push(fig(f, { ...f }));
    }
  }
  // Tables made from a section's bullets that begin with a bold lead-in ("**Learn:** a free study session …"): the lead-in is the
  // first cell, the rest of the bullet the second. Bullets without a lead-in stay bullets, after the table.
  for (const tb of V.tables || []) {
    const s = secOf(tb.at);
    if (!s) continue;
    const rows = [], t = sec(s.h2);
    s.bullets.forEach((b, i) => {
      const m = /^\*\*([^*]+)\*\*\s*([\s\S]*)$/.exec(b.raw);
      if (!m) return;
      let rest = m[2].trim();
      rest = rest.charAt(0).toLowerCase() === rest.charAt(0) ? rest.charAt(0).toUpperCase() + rest.slice(1) : rest;
      rows.push({ id: b.id, noId: !b.id, label: E.plain(m[1]).replace(/[\s.:,;]+$/, ''), parts: E.parts(rest), empty: !rest });
      t.hide.push(i);
    });
    t.table = { head: (tb.columns || ['What', 'Details']).map(c => ({ label: c })), rows };
  }
  // "Test yourself": 3 or 4 cards; the first is open on the canvas.
  const cards = (V.test || []).filter(c => c && c.q && c.a);
  out.test = cards.map((c, i) => ({ n: String(i + 1), cv: String(i % 4), q: c.q, a: c.a, open: !E.site && i === 0, closed: E.site || i > 0 }));
  out.testCols = ' sp-n' + cards.length;
  out.hasTest = out.test.length >= 3;
  return out;
}
