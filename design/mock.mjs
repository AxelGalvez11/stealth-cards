import { qrMatrix } from '../web/qr.js';
// Sample data for the canvas. The web app hands every screen its real database (web/db.js) as `this.props.db`;
// the canvas has none, so boards call this.mock(), which answers the same questions with the sample decks and cards
// the canvas has always shown. Edits made on a canvas board (a new tag, a grade, a setting) stay on that board.
// Exported as source text so it can live inside each board's logic class, like the gradient generator.

const DECKS = [
  { id: 'cell', name: 'Cell Biology', total: '412', due: 28, overdue: 12, soon: 0, fresh: 10, ret: 91, ai: 38 },
  { id: 'jlpt', name: 'Japanese · JLPT N4', total: '1,280', due: 19, overdue: 5, soon: 0, fresh: 20, ret: 87, ai: 0 },
  { id: 'orgo', name: 'Organic Chemistry', total: '236', due: 11, overdue: 0, soon: 0, fresh: 5, ret: 84, ai: 0 },
  { id: 'hist', name: 'US History', total: '158', due: 6, overdue: 0, soon: 0, fresh: 0, ret: 93, ai: 0 },
  { id: 'sys', name: 'System Design', total: '74', due: 0, overdue: 0, soon: 1, fresh: 8, ret: 89, ai: 0 },
  { id: 'span', name: 'Spanish Verbs', total: '310', due: 0, overdue: 0, soon: 3, fresh: 0, ret: 95, ai: 0 }
];
const TAGS = { cell: ['Biology', 'MCAT', 'Year 1', 'BIO 201', 'Fall 2026', 'Midterm', 'Final exam', 'Pre-med', 'Lab', 'Cells', 'Must know'], jlpt: ['Languages'],
  orgo: ['Chemistry', 'MCAT', 'Year 1', 'Pre-med', 'Fall 2026'], hist: ['History'], sys: ['Computer science'], span: ['Languages'] };
const CARDS = [
  { id: 'k1', front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺)', kind: 'Basic', icon: 'text', next: 'Tomorrow', ai: '', tags: ['Energy', 'Exam 1', 'Mitochondria', 'Must know'] },
  { id: 'k2', front: 'The ____ is the powerhouse of the cell.', back: 'mitochondrion', kind: 'Fill in the blank', icon: 'blank', next: 'Due now', ai: 'Claude', tags: ['Organelles', 'Exam 1'] },
  { id: 'k3', front: 'Name structure 1 on the diagram.', back: 'Nucleus', kind: 'Image', icon: 'image', next: 'In 3 days', ai: 'Claude', tags: ['Organelles', 'Diagrams'] },
  { id: 'k4', front: 'Which organelle packages proteins for secretion?', back: 'Golgi apparatus', kind: 'Basic', icon: 'text', next: 'In 6 days', ai: '', tags: ['Organelles'] },
  { id: 'k5', front: 'Say it: ribosome', back: 'RY-buh-sohm', kind: 'Audio', icon: 'audio', next: 'Due now', ai: 'ChatGPT', tags: ['Pronunciation'] },
  { id: 'k6', front: 'What is the role of the ribosome?', back: 'Translates mRNA into protein', kind: 'Basic', icon: 'text', next: 'In 12 days', ai: '', tags: ['Proteins', 'Exam 2'] }
];
// Folders in the Library, and a few cards from every deck for All cards (with how hard each one is).
const FOLDERS = [{ id: 'f1', name: 'Languages', decks: ['jlpt', 'span'] }, { id: 'f2', name: 'Year 1', decks: ['orgo', 'hist'] }];
const ALL_CARDS = [
  ['cell', 'What does the electron transport chain pump across the inner membrane?', 'Protons (H⁺)', 'text', 'Tomorrow', 'easy', ['Energy', 'Exam 1', 'Mitochondria', 'Must know']],
  ['cell', 'The ____ is the powerhouse of the cell.', 'mitochondrion', 'blank', 'Due now', 'hard', ['Organelles', 'Exam 1']],
  ['jlpt', '電車', 'train (でんしゃ)', 'text', 'In 2 days', 'medium', ['Vocabulary']],
  ['orgo', 'C₆H₆', 'Benzene', 'text', 'In 5 days', 'easy', ['Aromatics']],
  ['cell', 'Name structure 1 on the diagram.', 'Nucleus', 'image', 'In 3 days', 'medium', ['Organelles', 'Diagrams']],
  ['hist', 'Year the Declaration of Independence was signed?', '1776', 'text', 'In 9 days', 'easy', ['Revolution']],
  ['span', 'Yo ____ dos hermanos.', 'tengo', 'blank', 'Due now', 'hard', ['Irregular']],
  ['sys', 'What does a load balancer do?', 'Spreads requests across servers', 'text', 'New', 'new', ['Basics']],
  ['cell', 'Which organelle packages proteins for secretion?', 'Golgi apparatus', 'text', 'In 6 days', 'medium', ['Organelles']],
  ['jlpt', '学校', 'school (がっこう)', 'text', 'New', 'new', ['Vocabulary']],
  ['orgo', 'Markovnikov’s rule says the H goes to…', 'The carbon with more H’s', 'text', 'Due now', 'hard', ['Reactions', 'Exam 2']],
  ['cell', 'Say it: ribosome', 'RY-buh-sohm', 'audio', 'Due now', 'new', ['Pronunciation']]
];
// The sample diagram's parts, hidden by boxes (image occlusion): each box is its own card. Place and size are fractions
// of the picture.
const BOXES = [{ id: 'b1', x: .409, y: .32, w: .236, h: .347, label: 'Nucleus' }, { id: 'b2', x: .164, y: .573, w: .164, h: .133, label: 'Mitochondrion' },
  { id: 'b3', x: .645, y: .687, w: .145, h: .12, label: 'Vacuole' }];
const REVIEW = [
  { kind: 'basic', front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺), from the matrix into the intermembrane space.', note: 'That gradient powers ATP synthase.' },
  { kind: 'cloze', before: 'The', after: 'is the powerhouse of the cell.', back: 'mitochondrion', note: 'It makes most of the cell’s ATP.' },
  { kind: 'image', front: '', back: 'Nucleus', note: 'Holds the cell’s DNA.', image: 'mock', boxes: BOXES, box: 'b1', occ: 'all' },
  { kind: 'audio', front: 'What word do you hear?', back: 'train', note: '電 electricity + 車 vehicle.', audio: 'mock', backBig: '電車', backSub: 'でんしゃ · train' }
];
const DRAFTS = {
  Basic: { kind: 'basic', front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺), into the intermembrane space.' },
  Blank: { kind: 'cloze', text: 'The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].', note: 'It makes most of the cell’s ATP.' },
  Image: { kind: 'image', front: 'Name the part of the cell.', back: '', image: 'mock', boxes: BOXES, occ: 'one' },
  Audio: { kind: 'audio', back: '電車 (でんしゃ): train', audio: 'mock' }
};
const DUE_7 = { vals: [32, 18, 24, 12, 30, 8, 16], labels: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'], tops: null, names: ['tomorrow', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'] };
const DUE_14 = { vals: [32, 18, 24, 12, 30, 8, 16, 22, 14, 26, 10, 20, 6, 12], labels: ['23', '24', '25', '26', '27', '28', '29', '30', '1', '2', '3', '4', '5', '6'], tops: ['W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T'],
  names: ['tomorrow', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27', 'Mon 28', 'Tue 29', 'Wed 30', 'Thu, Oct 1', 'Fri, Oct 2', 'Sat, Oct 3', 'Sun, Oct 4', 'Mon, Oct 5', 'Tue, Oct 6'] };
export const SAMPLE = { DECKS, TAGS, CARDS, FOLDERS, ALL_CARDS, REVIEW, DRAFTS, DUE_7, DUE_14, BOXES };
// The sample clip's shape for the canvas's waveforms (96 peaks, 0 to 1): two syllables, like “den-sha”, with a breath
// between. It's kept out of SAMPLE, which the iPhone app copies.
export const SAMPLE_WAVE = Array.from({ length: 96 }, (_, i) => {
  const x = i / 95, syl = (c, w) => Math.exp(-Math.pow((x - c) / w, 2));
  const env = Math.max(syl(.3, .17), .8 * syl(.7, .14)), grain = .68 + .32 * Math.abs(Math.sin(i * 2.3) * Math.cos(i * .7 + .4));
  return Math.round(Math.max(.05, env * grain) * 100) / 100;
});

// Live (play with friends): a sample room playing Cell Biology, at question 3 of 10, for the Live boards. The phone in
// the samples is Jordan's. `board` is where everyone stands after question 3 (and how far each moved), `final` the end.
// Its QR code is real (it opens the join page with the code filled in), kept small here as its modules in hex, row by
// row; the boards draw it (mock()).
const LIVE_QR = qrMatrix('https://app.lucida.cards/join/482913').map(r => r.map(Number).join('')).join('').replace(/.{1,4}/g, b => parseInt(b.padEnd(4, '0'), 2).toString(16));
const LIVE_PEOPLE = ['Maya', 'Jordan', 'Priya', 'Leo', 'Sofia', 'Ethan', 'Ana', 'Kai', 'Zoe', 'Omar', 'Lina', 'Noah'];
export const LIVE_SAMPLE = {
  code: '482913', codeShown: '482 913', joinText: 'lucida.cards/join', qr: LIVE_QR, me: 'Jordan', people: LIVE_PEOPLE,
  deck: { name: 'Cell Biology', seed: 'Cell Biology', style: 'mix', round: 0, bg: { kind: 'deck', image: null } },
  q: { text: 'Which organelle packages proteins for secretion?', options: ['Golgi apparatus', 'Lysosome', 'Nucleus', 'Ribosome'], right: 0, counts: [7, 2, 1, 2] },
  // A picture card's question: what's under its second box (the sample diagram's).
  pic: { text: 'What’s under box 2?', options: ['Nucleus', 'Mitochondrion', 'Vacuole', 'Lysosome'], right: 1, counts: [2, 8, 1, 1] },
  board: [['Maya', 3420, 1], ['Jordan', 3210, 2], ['Kai', 2980, -1], ['Priya', 2860, 0], ['Leo', 2640, 3], ['Sofia', 2210, -1], ['Ethan', 1980, 0], ['Ana', 1640, 0], ['Zoe', 1420, 1], ['Omar', 1210, -1], ['Lina', 980, 0], ['Noah', 620, 0]],
  final: [['Maya', 9610], ['Jordan', 8940], ['Kai', 8120], ['Priya', 7860], ['Leo', 7420], ['Sofia', 6980], ['Ethan', 6540], ['Ana', 6110]]
};

export const MOCK_METHOD = String.raw`mock() {
  const p = this.props, m = this.state.$m || {};
  const set = patch => this.setState({ $m: { ...m, ...patch } });
  const X = __SAMPLE__, WAVE = __WAVE__, LS = __LIVE__;
  const caught = !!p.caughtUp;
  const byName = { 'Four buttons': 'four', 'Check or X': 'binary', 'Piles': 'piles' };
  const ed = m.deck || {};
  const deck = () => ({ id: 'cell', name: ed.name ?? 'Cell Biology', tags: ed.tags || X.TAGS.cell, seed: 'Cell Biology', cover: { style: 'mix', round: 0, image: null, ...(ed.cover || {}) },
    paused: !!ed.paused, grading: ed.grading || byName[p.grading] || 'four', fsrs: ed.fsrs ?? (p.fsrs !== false), goal: ed.goal ?? 90, gapIdx: ed.gapIdx ?? 3, steps: ed.steps || ['1m', '10m'], perDay: ed.perDay ?? 20,
    total: 412, totalLabel: '412', due: 28, fresh: 10, ret: 91, aiCount: 38, forecast: [28, 14, 20, 9, 24, 6, 12], piles: m.piles || [{ name: 'Know it', n: 18 }, { name: 'Almost', n: 6 }, { name: 'No clue', n: 3 }],
    href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', newCardHref: 'WebCardsScreenNew.dc.html', folder: null, bg: ed.bg || { kind: 'deck', image: null } });
  const idx = m.idx ?? (({ 'Fill in the blank': 1, Image: 2, Audio: 3 })[p.card] || 0);
  // Profile picture (the Settings boards' photo setting): the Google photo, your own, or the color; the canvas draws
  // stand-ins for the photos.
  const st = { name: 'Alex Kim', sub: 'Signed in with Google · alex@gmail.com', signedIn: true, google: true, photo: ({ 'Google photo': 'google', 'Your photo': 'yours' })[p.photo] || 'color', yourPhoto: p.photo === 'Your photo' ? 'mock' : null, color: 0,
    look: 'system', darkMode: p.dim ? 'gray' : 'black', grads: 'mix', prog: ({ Bar: 'bar', Counts: 'counts', None: 'none' })[p.progress] || 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, check: true, reminder: '9:00 AM', ...(m.settings || {}) };
  const perms = { read: true, text: true, media: true, edit: true, check: true, del: false, ...(m.perms || {}) };
  const noop = () => {};
  // Folders you make or change here stay on this board.
  const folders = () => m.folders || X.FOLDERS;
  const folderOf = id => (m.moved && id in m.moved ? m.moved[id] : (folders().find(f => (f.decks || []).includes(id)) || {}).id || null);
  // Decks and cards you drag here keep their new order (and cards their new deck) on this board.
  const order = m.deckOrder || X.DECKS.map(d => d.id), inOrder = () => order.map(id => X.DECKS.find(d => d.id === id));
  const before = (list, id, b) => { const l = list.filter(x => x !== id), at = b ? l.indexOf(b) : -1; l.splice(at < 0 ? l.length : at, 0, id); return l; };
  const cardDeck = m.cardDeck || {}, cardOrder = m.cardOrder || X.CARDS.map(c => c.id);
  // Live's sample room (the boards' props pick what it shows: an empty lobby, a picture question, the answer, the end).
  const livePerson = name => ({ id: 'p' + LS.people.indexOf(name), name, color: LS.people.indexOf(name) % 5 });
  // The sample's QR code (29 by 29 modules), drawn the way web/qr.js draws one, with a margin of 2.
  const liveQr = () => { const bits = [...LS.qr].map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join(''), n = 29; let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (bits[y * n + x] === '1') d += 'M' + (x + 2) + ' ' + (y + 2) + 'h1v1h-1z';
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><rect width="33" height="33" fill="#FFFFFF"/><path d="' + d + '" fill="#000000"/></svg>'); };
  const liveQ = p.image ? LS.pic : LS.q;
  // Jordan's phone: before question 3 he had 2,340 points, and a right answer made it 3,210.
  const liveRight = !p.wrong && !p.timeUp, jordan = p.final ? 8940 : liveRight ? 3210 : 2340;
  const liveRows = (p.final ? LS.final : LS.board.map(([name, score]) => [name, name === LS.me ? jordan : score])).slice().sort((a, b) => b[1] - a[1]);
  return {
    mock: true,
    chrome: () => ({ nav: { today: caught ? '' : '64' }, me: { bg: 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A', color: st.photo === 'color', photo: '', sampleGoogle: st.photo === 'google', sampleYours: st.photo === 'yours' } }),
    settings: () => st,
    tags: () => [],
    decks: () => inOrder().map(d => ({ d, i: X.DECKS.indexOf(d) })).map(({ d, i }) => ({ ...d, name: d.name, tags: X.TAGS[d.id], seed: d.name, style: null, image: null, totalLabel: d.total, paused: false, folder: folderOf(d.id), bg: { kind: 'deck', image: null },
      due: caught ? 0 : d.due, overdue: caught ? 0 : d.overdue, soon: caught ? (d.soon || [1, 1, 2, 3, 1, 3][i]) : d.soon,
      href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html' })),
    deck,
    folders: () => folders().map(f => { const ds = inOrder().filter(d => folderOf(d.id) === f.id);
      return { id: f.id, name: f.name, n: ds.length, due: caught ? 0 : ds.reduce((n, d) => n + d.due, 0), decks: ds.map(d => ({ ...d, seed: d.name, style: null, round: 0 })), href: 'WebLibraryFolder.dc.html' }; }),
    allCards: () => X.ALL_CARDS.map(([was, front, back, icon, next, level, tags], i) => { const deckId = cardDeck['a' + i] || was, d = X.DECKS.find(x => x.id === deckId);
      return { id: 'a' + i, kind: '', icon, front, back, tags, next, level, deckId, deckName: d.name, seed: d.name, style: null, round: 0, folder: folderOf(deckId), href: 'WebCardsScreen.dc.html' }; }),
    searchDecks: q => X.DECKS.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
    cards: () => cardOrder.map(id => X.CARDS.find(r => r.id === id)).filter(r => !cardDeck[r.id] || cardDeck[r.id] === 'cell').map(r => ({ ...r, href: 'WebCardsScreen.dc.html' })),
    card: () => null,
    draft: type => ({ tags: ['Energy', 'Exam 1'], front: '', back: '', text: '', note: '', image: null, audio: null, speak: '', auto: true, ...X.DRAFTS[type] }),
    today: () => ({ date: 'Tuesday, September 22', streak: 12, best: 31, due: caught ? 0 : 64, minutes: 11, fresh: 10, next: { day: 'tomorrow', n: 32 },
      week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => ({ d, done: i < 2, today: i === 1 })), forecast: X.DUE_7, newCardHref: 'WebCardsScreenNew.dc.html', studyHref: 'WebReview.dc.html' }),
    review: () => {
      const c = X.REVIEW[idx % X.REVIEW.length], d = deck(), done = 12 + idx, left = 64 - done;
      const scale = (Math.pow(d.goal / 100, -2) - 1) / (Math.pow(0.9, -2) - 1), gaps = [30, 90, 180, 365, 730, 1825, 3650], maxGap = gaps[d.gapIdx];
      const days = b => Math.min(maxGap, Math.max(1, Math.round(b * scale)));
      const fmt = n => (n < 30 ? n + 'd' : n < 365 ? Math.round(n / 3) / 10 + 'mo' : Math.round(n / 36.5) / 10 + 'y');
      const hardD = days(2), goodD = Math.min(maxGap, Math.max(hardD + 1, days(4))), easyD = Math.min(maxGap, Math.max(goodD + 1, days(9)));
      return { empty: false, deckId: 'cell', card: { id: 'r' + idx, ...c }, done, left, total: 64, queue: { basic: 'rev', cloze: 'new', image: 'new', audio: 'learn' }[c.kind],
        counts: { new: 8, learn: 3, rev: Math.max(left - 11, 0) }, iv: { again: d.steps[0], hard: fmt(hardD), good: fmt(goodD), easy: fmt(easyD) },
        mode: d.grading, fsrsOn: d.grading !== 'piles' && d.fsrs, piles: d.piles, prog: st.prog, editHref: 'WebCardsScreen.dc.html' };
    },
    session: () => ({ pct: 91, goal: 90, cards: 40, minutes: 12, fresh: 3, split: [3, 5, 25, 7], splitW: ['8%', '12%', '62%', '18%'], streak: 13, next: 'Tomorrow · 32', moreHref: 'WebReview.dc.html',
      sorted: 12, piles: [{ name: 'Know it', n: 7, total: 18 }, { name: 'Almost', n: 3, total: 6 }, { name: 'No clue', n: 2, total: 3 }], onlyPiles: false }),
    stats: () => ({ streak: 12, best: 31, reviews: '1,284', cards: '2,470', ai: 312, remembered: 90, goal: 90, heat: null, forecast: X.DUE_14,
      byDeck: X.DECKS.map(d => ({ name: d.name, ret: d.ret })) }),
    ai: () => ({ url: 'https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ', perms, clients: { claude: true, openai: true, cursor: false, mcp: false }, connected: 'Claude, ChatGPT' }),
    // Sound: the sample clip, a little way in (paused, or playing on the boards that say so). Play and the waveform work.
    sound: c => ({ key: c && (c.audio || c.speak) ? 'mock' : '', peaks: WAVE, dur: 2.6, speech: !!c && !c.audio, on: m.playing ?? !!p.playing, frac: m.frac ?? .42, busy: false }),
    // The Recording boards: a clip being recorded, 3 seconds in.
    recording: () => ((p.recording && !m.recStop) || m.rec ? { saving: false, levels: Array.from({ length: 70 }, (_, i) => WAVE[(i * 3 + 30) % 96]), level: .55, secs: 3.4 } : null),
    liveSets: () => [{ id: 'new', label: 'New', n: 10 }, { id: 'hard', label: 'Hard', n: 36 }, { id: 'tag:Exam 1', label: 'Exam 1', n: 40 }, { id: 'all', label: 'All', n: 412 }],
    live: () => { const people = p.empty ? [] : LS.people.map(livePerson);
      return { code: LS.code, codeShown: LS.codeShown, joinText: LS.joinText, qr: liveQr(), deck: LS.deck, deckId: 'cell', phase: p.final ? 'end' : p.reveal ? 'reveal' : 'question', status: '',
        people, here: people.length, n: 3, of: 10,
        q: { text: liveQ.text, options: liveQ.options, right: p.reveal ? liveQ.right : null, counts: p.reveal ? liveQ.counts : null, image: p.image ? 'mock' : '', occ: p.image ? { boxes: X.BOXES, ask: 1, mode: 'all' } : null },
        answered: 9, playing: 12, got: 7, timer: { left: 14, dur: 20, delay: 0, frac: .3 },
        board: (p.final ? LS.final : LS.board).map(([name, score, move]) => ({ ...livePerson(name), score, move: p.final ? null : move })), last: false };
    },
    join: () => {
      const pick = p.timeUp ? -1 : p.wrong ? 1 : 0, rank = liveRows.findIndex(r => r[0] === LS.me) + 1;
      return { form: { code: m.joinCode ?? LS.code, name: m.joinName ?? LS.me, error: p.notFound ? 'No game with that code' : '', busy: false },
        phase: p.late ? 'late' : p.final ? 'final' : 'waiting', deck: LS.deck, n: 3, of: 10, promo: true,
        me: { ...livePerson(LS.me), score: p.final ? jordan : 2340, streak: liveRight ? 3 : 0, rank, right: 8, played: 10 },
        q: { text: LS.q.text, options: LS.q.options, right: LS.q.right }, pick: m.livePick ?? (p.picked ? 1 : null), timer: { left: 14, dur: 20, delay: 0, frac: .7 },
        result: { ok: liveRight, timeUp: !!p.timeUp, pick: pick >= 0 ? LS.q.options[pick] : '', answer: LS.q.options[LS.q.right], gained: liveRight ? 870 : 0, streak: liveRight ? 3 : 0 },
        standings: liveRows.map(([name, score]) => ({ ...livePerson(name), score })) };
    },
    href: kind => ({ decks: 'WebDecks.dc.html', newDeck: 'WebNewDeck.dc.html', import: 'WebImport.dc.html', connect: 'WebConnect.dc.html', today: 'Main.dc.html' })[kind] || 'Main.dc.html',
    act: {
      updateDeck: (id, patch) => set({ deck: { ...ed, ...patch, cover: { ...(ed.cover || {}), ...(patch.cover || {}) } } }),
      grade: () => set({ idx: idx + 1 }),
      pile: (id, name) => set({ idx: idx + 1, piles: deck().piles.map(q => (q.name === name ? { ...q, n: q.n + 1 } : q)) }),
      undo: () => idx > 0 && set({ idx: idx - 1 }),
      setSettings: patch => set({ settings: { ...(m.settings || {}), ...patch } }),
      pickPhoto: () => set({ settings: { ...(m.settings || {}), photo: 'yours', yourPhoto: 'mock' } }),
      removePhoto: () => set({ settings: { ...(m.settings || {}), photo: 'google', yourPhoto: null } }),
      setPerm: (k, on) => set(k === 'check' ? { perms: { ...(m.perms || {}), check: on }, settings: { ...(m.settings || {}), check: on } } : { perms: { ...(m.perms || {}), [k]: on } }),
      pickCover: () => set({ deck: { ...ed, cover: { ...(ed.cover || {}), image: 'mock' } } }),
      newFolder: (name, deckId) => { const id = 'f' + (folders().length + 1) + Date.now().toString(36); set({ folders: [...folders(), { id, name, decks: [] }], ...(deckId ? { moved: { ...(m.moved || {}), [deckId]: id } } : {}) }); return id; },
      renameFolder: (id, name) => set({ folders: folders().map(f => (f.id === id ? { ...f, name } : f)) }),
      deleteFolder: id => set({ folders: folders().filter(f => f.id !== id) }),
      moveDeck: (id, folder) => folderOf(id) !== (folder || null) && set({ moved: { ...(m.moved || {}), [id]: folder || null }, deckOrder: before(order, id, null) }),
      reorderDeck: (id, b) => set({ deckOrder: before(order, id, b) }),
      reorderCard: (id, b) => set({ cardOrder: before(cardOrder, id, b) }),
      moveCard: (id, deckId) => set({ cardDeck: { ...cardDeck, [id]: deckId } }),
      setBg: (id, kind) => set({ deck: { ...ed, bg: { ...(ed.bg || { kind: 'deck', image: null }), kind } } }),
      pickBg: () => set({ deck: { ...ed, bg: { kind: 'photo', image: 'mock' } } }),
      addDeck: noop, deleteDeck: noop, exportDeck: noop, saveCard: noop, deleteCard: noop, copy: noop, speak: noop, play: noop, importCards: noop, exportAll: noop, resetAll: noop,
      pickFile: () => Promise.resolve(null), pickText: () => Promise.resolve(null), pickSound: () => Promise.resolve(null),
      record: () => { set((p.recording && !m.recStop) || m.rec ? { rec: false, recStop: true } : { rec: true }); return Promise.resolve(null); },
      stopRecording: () => set({ rec: false, recStop: true }), watchMic: noop, watchSound: noop,
      playSound: () => set({ playing: !(m.playing ?? !!p.playing) }), seekSound: (c, f) => { if (f != null) set({ frac: f }); },
      addPile: (id, name) => set({ piles: [...deck().piles, { name, n: 0 }] }),
      // Live: typing on the join board and tapping an answer stay on that board; the rest link to the next board.
      joinCode: v => set({ joinCode: String(v || '').replace(/\D/g, '').slice(0, 6) }), joinName: v => set({ joinName: String(v || '').slice(0, 20) }), liveAnswer: i => set({ livePick: i }),
      openLive: noop, liveStart: noop, liveNext: noop, liveAgain: noop, liveClose: noop, joinLive: noop, joinAgain: noop
    }
  };
}`.replace('__SAMPLE__', () => JSON.stringify(SAMPLE)).replace('__WAVE__', () => JSON.stringify(SAMPLE_WAVE)).replace('__LIVE__', () => JSON.stringify(LIVE_SAMPLE));
