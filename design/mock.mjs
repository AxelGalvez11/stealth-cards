import { qrMatrix } from '../web/qr.js';
import { SIDE_TIPS, sideView } from '../web/side.js';
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

import { NET_SAMPLE } from './net-sample.mjs';
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
// Deep stats (Pro), as db.insights(range) gives them (web/insights.js): the sample decks' memory by week and by tag,
// weak spots, and pace, around the sample's Tuesday, September 22, 2026. Kept out of SAMPLE, which the iPhone app copies.
const WEEK = 7 * 86400000, MONDAY = new Date(2026, 8, 21).getTime();
const weeks = vals => vals.map((v, i) => ({ start: MONDAY - (vals.length - 1 - i) * WEEK, ...v }));
const months = vals => vals.map((v, i) => ({ start: new Date(2026, 8 - (vals.length - 1 - i), 1).getTime(), ...v }));
const TAGS_SEEN = [['Vocabulary', 92, 310, 140], ['Organelles', 88, 142, 64], ['Exam 1', 90, 120, 40], ['Energy', 93, 96, 31], ['Irregular', 76, 88, 45], ['Proteins', 84, 64, 28], ['Mitochondria', 79, 58, 22], ['Reactions', 71, 52, 24], ['Pronunciation', 95, 40, 18], ['Aromatics', 86, 40, 20]]
  .map(([tag, pct, n, cards]) => ({ tag, pct, n, cards }));
const HARD = [['orgo', 'Markovnikov’s rule says the H goes to…', 'The carbon with more H’s', 'Organic Chemistry', 9, 9.1], ['span', 'Yo ____ dos hermanos.', 'tengo', 'Spanish Verbs', 8, 8.7],
  ['cell', 'The ____ is the powerhouse of the cell.', 'mitochondrion', 'Cell Biology', 8, 8.2], ['jlpt', '電車', 'train (でんしゃ)', 'Japanese · JLPT N4', 5, 7.9], ['cell', 'Which organelle packages proteins for secretion?', 'Golgi apparatus', 'Cell Biology', 4, 7.4]]
  .map(([deckId, front, back, deck, lapses, d], i) => ({ id: 'h' + i, deckId, front, back, deck, lapses, d, recall: .62 + i * .05, href: 'WebCardsScreen.dc.html' }));
const insightsOf = range => {
  const year = range === 'Year', n = { Week: 240, Month: 1020, Year: 11800 }[range] || 1020, scale = x => Math.round(x * n / 1020);
  return { days: { Week: 7, Month: 30, Year: 365 }[range] || 30, reviews: scale(1284),
    memory: { retention: { n, pct: { Week: 92, Month: 91, Year: 90 }[range] || 91 }, byMonth: year,
      trend: year ? months([84, 85, 87, 86, 88, 87, 89, 90, 88, 90, 91, 91].map(pct => ({ pct, n: 900 + pct * 3 }))) : weeks([86, 88, 87, 89, 90, 88, 91, 90, 92, 91, 93, 91].map((pct, i) => ({ pct, n: 180 + i * 6 }))),
      byTag: TAGS_SEEN.map(g => ({ ...g, n: Math.max(5, scale(g.n)) })),
      improved: [{ tag: 'Energy', before: 85, after: 93, delta: 8, n: 96 }, { tag: 'Vocabulary', before: 88, after: 92, delta: 4, n: 310 }, { tag: 'Exam 1', before: 87, after: 90, delta: 3, n: 120 }],
      slipping: [{ tag: 'Reactions', before: 80, after: 71, delta: -9, n: 52 }, { tag: 'Irregular', before: 82, after: 76, delta: -6, n: 88 }, { tag: 'Mitochondria', before: 84, after: 79, delta: -5, n: 58 }],
      modes: { cards: { n: scale(1284), pct: 88 }, learn: { n: scale(310), pct: 76 } } },
    weak: { weakTags: TAGS_SEEN.slice().sort((a, b) => a.pct - b.pct).slice(0, 6).map(g => ({ ...g, n: Math.max(5, scale(g.n)) })), hardest: HARD,
      leeches: [HARD[0], HARD[1], HARD[2]].map((h, i) => ({ ...h, paused: i === 0 })), forgot: { n: Math.round(n * .09), of: n, pct: 9 },
      lapseDist: [['0', 1420], ['1', 480], ['2', 210], ['3–4', 120], ['5–7', 46], ['8+', 12]].map(([label, c]) => ({ label, n: c })),
      diffDist: [180, 320, 460, 520, 410, 300, 190, 110, 60].map((c, i) => ({ label: String(i + 1), n: c })), studied: 2288 },
    pace: { time: { n: scale(1284), perCard: 8.2, perRight: 9.4, rightPerMin: 6.4, minutes: scale(175), learnN: scale(310), perQuestion: 11.6 },
      gaps: year ? months([3, 4, 5, 6, 7, 9, 10, 12, 13, 15, 17, 18].map(days => ({ days, n: 400 }))) : weeks([4, 5, 6, 6, 8, 9, 10, 12, 13, 15, 16, 18].map(days => ({ days, n: 120 }))), gapNow: 18,
      ahead: [212, 168, 140, 126, 98, 90, 72, 64].map((c, i) => ({ start: new Date(2026, 8, 22 + i * 7).getTime(), n: c })),
      exams: [{ deckId: 'cell', name: 'Cell Biology', days: 12, date: '2026-10-04', total: 412, seen: 380, learned: 334, toReview: 84, likely: .74, line: 'Exam in 12 days · 84 cards to review first' }] } };
};
export const SAMPLE_INSIGHTS = Object.fromEntries(['Week', 'Month', 'Year'].map(r => [r, insightsOf(r)]));

export const MOCK_METHOD = String.raw`mock() {
  const p = this.props, m = this.state.$m || {};
  const N = __NET__;
  // The web sidebar's rail (web/side.js): the board's collapsed Tweak, and its button.
  const SIDE_TIPS = __SIDE_TIPS__, side = __SIDE__;
  const set = patch => this.setState({ $m: { ...m, ...patch } });
  const X = __SAMPLE__, WAVE = __WAVE__, LS = __LIVE__, INSIGHTS = __INSIGHTS__;
  const caught = !!p.caughtUp;
  const byName = { 'Four buttons': 'four', 'Check or X': 'binary', 'Piles': 'piles' };
  const ed = m.deck || {};
  // Pro's sample: Cell Biology has an exam on Sunday, October 4 (12 days after the sample's Tuesday, September 22), and
  // the usual rule for cards you keep forgetting. Picking another day here moves it.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const examDay = 'exam' in ed ? ed.exam : p.free ? null : '2026-10-04';
  const examIn = examDay ? Math.round((new Date(examDay + 'T12:00:00') - new Date(2026, 8, 22, 12)) / 86400000) : null;
  const exam = examDay && examIn >= 0 ? { days: examIn, date: examDay, day: MON[+examDay.slice(5, 7) - 1] + ' ' + +examDay.slice(8, 10), total: 412, seen: 380, learned: 334, toReview: 84, likely: .74,
    when: examIn === 0 ? 'Exam today' : examIn === 1 ? 'Exam tomorrow' : 'Exam in ' + examIn + ' days', line: (examIn === 0 ? 'Exam today' : examIn === 1 ? 'Exam tomorrow' : 'Exam in ' + examIn + ' days') + ' · 84 cards to review first' } : null;
  const pausedIds = m.paused || (p.paused ? { k1: true } : {});
  const deck = () => ({ id: 'cell', name: ed.name ?? 'Cell Biology', tags: ed.tags || X.TAGS.cell, seed: 'Cell Biology', cover: { style: 'mix', round: 0, image: null, ...(ed.cover || {}) },
    paused: !!ed.paused, grading: ed.grading || byName[p.grading] || 'four', fsrs: ed.fsrs ?? (p.fsrs !== false), goal: ed.goal ?? 90, gapIdx: ed.gapIdx ?? 3, steps: ed.steps || ['1m', '10m'], perDay: ed.perDay ?? 20,
    total: 412, totalLabel: '412', due: 28, fresh: 10, ret: 91, aiCount: 38, forecast: [28, 14, 20, 9, 24, 6, 12], piles: m.piles || [{ name: 'Know it', n: 18 }, { name: 'Almost', n: 6 }, { name: 'No clue', n: 3 }],
    href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', newCardHref: 'WebCardsScreenNew.dc.html', folder: null, bg: ed.bg || { kind: 'deck', image: null },
    exam, examDay: examDay || '', leechAt: ed.leechAt ?? 8, leechAct: ed.leechAct ?? 'tag',
    // Sharing (Tweaks: shared, linked): shared by you, or from Maria (studied as it is, or a copy with her changes waiting).
    ...(() => { const sv = m.share ? m.share.vis : p.shared === 'Public' ? 'public' : p.shared === 'Link only' ? 'link' : 'private', lk = m.detached ? '' : p.linked;
      // Its labels (level, subject, school): Cell Biology's own, and what you pick in its Sharing settings.
      return { shared: sv !== 'private' && !lk ? { vis: sv, id: 's9', url: '/@alexkim/cell-biology', label: sv === 'public' ? 'Public' : 'Link only', labels: { level: 'college', subject: 'biology', schoolId: '110644', school: 'University of California-Davis', ...((m.share && m.share.labels) || {}) } } : null,
        link: lk ? { mode: lk, gone: false, id: 's1', owner: { name: 'Maria Santos', handle: 'mariasantos' }, url: '/@mariasantos/mcat-biochemistry', pending: lk === 'copy' && !m.took ? 3 : 0, updates: m.upd ?? true } : null,
        readOnly: lk === 'study' }; })() });
  const idx = m.idx ?? (({ 'Fill in the blank': 1, Image: 2, Audio: 3 })[p.card] || 0);
  // Profile picture (the Settings boards' photo setting): the Google photo, your own, or the color; the canvas draws
  // stand-ins for the photos.
  const st = { name: 'Alex Kim', sub: 'Signed in with Google · alex@gmail.com', signedIn: true, google: true, photo: ({ 'Google photo': 'google', 'Your photo': 'yours' })[p.photo] || 'color', yourPhoto: p.photo === 'Your photo' ? 'mock' : null, color: 0,
    look: 'system', darkMode: p.dim ? 'gray' : 'black', grads: 'mix', prog: ({ Bar: 'bar', Counts: 'counts', None: 'none' })[p.progress] || 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, check: true, reminder: '9:00 AM',
    // Settings › Theme (Pro): the Theme boards say which is picked (props.theme).
    theme: p.theme || 'lucida', themeProfile: true, ...(m.settings || {}) };
  // Your profile picture in a theme: the theme a board shows (props.skin) or the one picked here (see skin() in build.mjs).
  const skinned = () => this.skinFor(p.skin || (st.theme !== 'lucida' ? st.theme : ''));
  const perms = { read: true, text: true, media: true, edit: true, check: true, del: false, ...(m.perms || {}) };
  const noop = () => {};
  // In the Library, System Design is shared (Public) and Spanish Verbs is a copy of Maria's deck.
  const LIB_NET = { sys: { shared: { vis: 'public', id: 's10', url: '/@alexkim/system-design', label: 'Public' } },
    span: { link: { mode: 'copy', gone: false, id: 's8', owner: { name: 'Maria Santos', handle: 'mariasantos' }, url: '/@mariasantos/spanish-b1', pending: 0, updates: true } } };
  // Folders you make or change here stay on this board.
  const folders = () => m.folders || X.FOLDERS;
  const folderOf = id => (m.moved && id in m.moved ? m.moved[id] : (folders().find(f => (f.decks || []).includes(id)) || {}).id || null);
  // Decks and cards you drag here keep their new order (and cards their new deck) on this board.
  const order = m.deckOrder || X.DECKS.map(d => d.id), inOrder = () => order.map(id => X.DECKS.find(d => d.id === id));
  const before = (list, id, b) => { const l = list.filter(x => x !== id), at = b ? l.indexOf(b) : -1; l.splice(at < 0 ? l.length : at, 0, id); return l; };
  const cardDeck = m.cardDeck || {}, cardOrder = m.cardOrder || X.CARDS.map(c => c.id), aiDone = m.aiDone || {};
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
    // The canvas asks nothing and says nothing: a board shows a question or a message open through its Tweaks (design/ui.mjs).
    ask: () => Promise.resolve(false), say: noop,
    // The school list (web/schools.json): the sample's few schools, found by the words they start with.
    schools: { find: q => { const w = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      return w.length ? N.SCHOOLS.filter(r => w.every(x => (r[1] + ' ' + r[2] + ' ' + r[3] + ' ' + (r[4] || '')).toLowerCase().split(/[^a-z0-9]+/).some(y => y.startsWith(x)))) : []; } },
    // Pro: on for the canvas's boards, off for the ones that show Free (their free or plan setting).
    pro: () => !(p.free || p.plan === 'Free'),
    chrome: () => { const S = skinned(), color = st.photo === 'color', col = m.collapsed ?? !!p.collapsed;
      return { nav: { news: m.read ? '' : '2', hasNews: !m.read, ...side(col, () => set({ collapsed: !col })) }, me: { bg: S && color ? 'transparent' : 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A', color: color && !S, photo: '', sampleGoogle: st.photo === 'google', sampleYours: st.photo === 'yours',
        href: 'WebProfile.dc.html', skinned: !!S, art: S ? S.me('A', !color) : null } }; },
    settings: () => st,
    theme: () => (st.theme && st.theme !== 'lucida' ? st.theme : ''),
    tags: () => [],
    decks: () => inOrder().map(d => ({ d, i: X.DECKS.indexOf(d) })).map(({ d, i }) => ({ ...d, name: d.name, tags: X.TAGS[d.id], seed: d.name, style: null, image: null, totalLabel: d.total, paused: false, folder: folderOf(d.id), bg: { kind: 'deck', image: null },
      due: caught ? 0 : d.due, overdue: caught ? 0 : d.overdue, soon: caught ? (d.soon || [1, 1, 2, 3, 1, 3][i]) : d.soon, exam: d.id === 'cell' ? exam : null,
      href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', shared: null, link: null, readOnly: false, ...(LIB_NET[d.id] || {}) })),
    deck,
    folders: () => folders().map(f => { const ds = inOrder().filter(d => folderOf(d.id) === f.id);
      return { id: f.id, name: f.name, n: ds.length, due: caught ? 0 : ds.reduce((n, d) => n + d.due, 0), decks: ds.map(d => ({ ...d, seed: d.name, style: null, round: 0 })), href: 'WebLibraryFolder.dc.html' }; }),
    // Three of the sample cards are ones you keep forgetting; Markovnikov's rule is paused.
    allCards: () => X.ALL_CARDS.map(([was, front, back, icon, next, level, tags], i) => { const deckId = cardDeck['a' + i] || was, d = X.DECKS.find(x => x.id === deckId), id = 'a' + i, paused = pausedIds[id] ?? i === 10;
      return { id, kind: '', icon, front, back, tags, next: paused ? 'Paused' : next, level, deckId, deckName: d.name, seed: d.name, style: null, round: 0, folder: folderOf(deckId), href: 'WebCardsScreen.dc.html', paused, leech: [1, 6, 10].includes(i) }; }),
    searchDecks: q => X.DECKS.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
    // Prop aiWaiting: the sample's AI cards wait for you to keep or toss them (the Suggestions boards).
    cards: () => cardOrder.map(id => X.CARDS.find(r => r.id === id)).filter(r => (!cardDeck[r.id] || cardDeck[r.id] === 'cell') && aiDone[r.id] !== 'tossed')
      .map(r => ({ ...r, href: 'WebCardsScreen.dc.html', paused: !!pausedIds[r.id], next: pausedIds[r.id] ? 'Paused' : r.next, ...(p.aiWaiting && r.ai && !aiDone[r.id] ? { pending: true, next: 'Waiting for you' } : {}) })),
    // A sample card, for the editor boards that open one to edit (their cardId setting).
    card: id => { const r = X.CARDS.find(c => c.id === id); if (!r) return null;
      const kind = { text: 'basic', blank: 'cloze', image: 'image', audio: 'audio' }[r.icon], d = X.DRAFTS[{ basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' }[kind]];
      return { ...d, id, kind, tags: r.tags, note: '', front: kind === 'cloze' ? '' : r.front, back: kind === 'image' ? '' : r.back, text: kind === 'cloze' ? r.front.replace('____', '[[' + r.back + ']]') : '', paused: !!pausedIds[id], clozeMode: 'each' }; },
    // What a memory goal costs Cell Biology: about 32 reviews a day at 90%.
    workload: (id, g) => 22 * (Math.pow(0.9, -2) - 1) / (Math.pow(g / 100, -2) - 1) * (2 - g / 100) / 1.1 + 10,
    // Tune to you, tuned to 1,240 reviews (the Settings boards' tune setting shows the other states).
    tuneInfo: () => { const k = m.tune || ({ Off: 'off', 'Not enough reviews': 'few', Tuning: 'busy' })[p.tune] || 'on';
      return { pro: !(p.free || p.plan === 'Free'), on: k === 'on', tuned: k === 'on' || k === 'off', reviews: k === 'few' ? 212 : 1240, need: 400, can: k !== 'few', busy: k === 'busy', progress: .4, error: '', n: 1240 }; },
    insights: range => INSIGHTS[range] || INSIGHTS.Month,
    updatesOf: () => (p.linked === 'copy' && !m.took ? [
      { card: 'u1', op: 'edit', kind: 'answer', mine: false, before: { q: 'Which enzyme is the rate-limiting step of glycolysis?', a: 'Hexokinase' }, after: { q: 'Which enzyme is the rate-limiting step of glycolysis?', a: 'Phosphofructokinase-1 (PFK-1)' } },
      { card: 'u2', op: 'add', kind: 'new', mine: false, before: null, after: { q: 'What activates PFK-1?', a: 'AMP and fructose-2,6-bisphosphate' } },
      { card: 'u3', op: 'edit', kind: 'typo', mine: true, before: { q: 'Where is ATP made?', a: 'In the mitochondria (my notes)' }, after: { q: 'Where is ATP made?', a: 'Mostly in the mitochondria' } }] : []),
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
    ai: () => ({ url: 'https://app.lucida.cards/mcp', privateUrl: 'https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ', perms, clients: { claude: true, openai: true, cursor: false, mcp: false }, connected: 'Claude, ChatGPT' }),
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
    href: kind => ({ decks: 'WebDecks.dc.html', newDeck: 'WebNewDeck.dc.html', import: 'WebImport.dc.html', connect: 'WebConnect.dc.html', today: 'WebDecks.dc.html', stats: 'WebStats.dc.html' })[kind] || 'WebDecks.dc.html',
    // The study network (net-sample.mjs): the same answers web/net.js gets from the server. Saving, following and the
    // like stay on this board. Prop "loading" shows a page before its answer arrives.
    me: () => { const h = (m.profile && m.profile.handle) || 'alexkim'; return { handle: h, url: '/@' + h, name: st.name }; },
    // Classes (web/classes.mjs): what the Library's Assigned lists (prop "assignments" shows it), and your own progress on a class deck.
    assignments: () => (p.assignments ? N.ASSIGNED : []),
    classProgress: id => N.MY_PROGRESS[id] || null,
    net: (() => {
      const wait = !!p.loading, D = N.DECKS, pick = k => D[k];
      const star = id => (m.stars && id in m.stars ? m.stars[id] : null), follows = m.follows || {};
      const deckCard = d => { const s = star(d.id); return s == null ? d : { ...d, stars: d.stars + (s ? 1 : -1) }; };
      const picked = s => { const pk = (m.picks || {})[s.id] || {};
        return { ...s, changes: s.changes.map(c => { const v = pk[c.id] || pk.$all; return v && c.status === 'open' ? { ...c, status: v === 'take' ? 'taken' : 'skipped' } : c; }) }; };
      const open = () => (wait ? undefined : p.noSuggestions ? [] : N.SUGGESTIONS.map(picked).filter(s => s.changes.some(c => c.status === 'open')));
      // Going back to a version (on this board) adds a version saying so.
      const back = list => (m.restored ? [{ version: list[0].version + 1, kind: 'restore', summary: 'Went back to version ' + m.restored, ai: '', at: '2026-09-28T09:58:00Z', by: N.P.alex,
        changes: list.filter(v => v.version > m.restored).flatMap(v => v.changes).slice(0, 3).map(c => ({ ...c, op: c.op === 'add' ? 'remove' : c.op === 'remove' ? 'add' : 'edit', kind: c.op === 'add' ? 'remove' : c.op === 'remove' ? 'new' : c.kind, before: c.after, after: c.before })) }, ...list] : list);
      // A class, as the board's Tweaks and what you do on it make it: sharing answered, helpers picked, people taken out,
      // decks assigned, an invite taken (it then shows the class as a member sees it).
      const klass = code => {
        const k0 = N.CLASSES[code] || N.CLASSES.BIOKTZ, shared = m.classShare || {}, roles = m.roles || {}, out = m.out || {};
        if (k0.invite) return m.joined ? { ...N.CLASSES.ORGCHM, id: k0.id, code: k0.code, name: k0.name, owner: k0.owner, people: k0.people + 1, me: { role: 'member', share: false, asked: false }, assignments: [] } : k0;
        const me = k0.id in shared ? { ...k0.me, share: shared[k0.id], asked: true } : p.sharing ? { ...k0.me, share: true, asked: true } : k0.me;
        const members = k0.members.filter(x => !out[x.handle]).map(x => (roles[x.handle] ? { ...x, role: roles[x.handle] } : x));
        const decks = (m.takenOut ? k0.deckList.filter(d => !m.takenOut[d.id]) : k0.deckList);
        const assignments = [...k0.assignments.filter(a => !(m.unassigned || {})[a.id] && decks.some(d => d.id === a.sharedId)), ...(m.assigned || []).filter(a => a.classId === k0.id)];
        return { ...k0, me, members, people: members.length, deckList: decks, decks: decks.length, assignments, empty: false, ...(p.empty ? { members: members.filter(x => x.role === 'owner'), people: 1, deckList: [], decks: 0, assignments: [] } : {}) };
      };
      const deckPage = () => ({ ...deckCard(D.mcat), ...(m.checked ? { checked: { name: 'Alex Kim', handle: 'alexkim', current: true } } : {}), helpers: [{ handle: 'devp', name: 'Dev Patel' }], contributors: [{ handle: 'devp', name: 'Dev Patel', n: 6 }, { handle: 'alexkim', name: 'Alex Kim', n: 3 }],
        people: [N.P.maria, N.P.dev, N.P.okafor, N.P.alex], cardsList: N.CARDS, moreCards: 634, made: N.MADE,
        me: p.signedOut ? null : { owner: !!p.owner, helper: false, studying: m.studying || (p.studying ? 'cell' : ''), copied: m.copied || '', watching: !!(m.watching ?? p.watching), starred: star('s1') ?? false, open: p.owner ? 3 : 0 } });
      return {
        signedOut: !!p.signedOut,
        // Narrowed by level, subject, or school (f: level and subject ids, a school's id or name): one list of decks, best first. Not
        // narrowed, the sections, and first the one for your school (the board's mySchool: University of California-Davis).
        discover: (tag, f = {}) => {
          if (wait) return undefined;
          const school = f.school ? N.SCHOOLS.find(r => r[0] === f.school || r[1] === f.school) : null, on = !!(f.level || f.subject || f.school);
          const same = d => (!f.level || d.level === f.level) && (!f.subject || d.subject === f.subject) && (!f.school || (school && d.schoolId === school[0]));
          const echo = { topics: N.DISCOVER.topics, tag: tag || '', level: f.level || '', subject: f.subject || '', school: school ? { id: school[0], name: school[1] } : null, filtered: on };
          if (on) { const list = Object.values(D).filter(same).sort((a, b) => b.stars - a.stars || (a.id < b.id ? -1 : 1)).slice(0, 24); return { ...echo, sections: list.length ? [{ id: 'results', title: 'Decks', decks: list.map(deckCard) }] : [] }; }
          const home = p.mySchool === false ? [] : Object.values(D).filter(d => d.schoolId === '110644').sort((a, b) => b.stars - a.stars || (a.id < b.id ? -1 : 1)).slice(0, 12);
          return { ...echo, sections: [...(home.length ? [{ id: 'school', title: 'Popular at University of California-Davis', decks: home.map(deckCard) }] : []), ...N.DISCOVER.sections.map(s => ({ ...s, decks: s.decks.map(pick).map(deckCard) }))] };
        },
        search: (q, f = {}) => {
          if (wait) return undefined;
          if (!String(q || '').trim()) return { q: '', decks: [], people: [] };
          const school = f.school ? N.SCHOOLS.find(r => r[0] === f.school || r[1] === f.school) : null, on = !!(f.level || f.subject || f.school);
          const same = d => (!f.level || d.level === f.level) && (!f.subject || d.subject === f.subject) && (!f.school || (school && d.schoolId === school[0]));
          // People aren't narrowed by school or level (nothing lists the people at a school), so with a filter there are none.
          return { q, filtered: on, decks: [D.mcat, D.bio2a, D.cell].filter(same).map(deckCard), people: on ? [] : [{ ...N.P.maria, bio: 'Biochem TA', followers: 1280 }, { ...N.P.okafor, bio: '', followers: 3400 }] };
        },
        // A profile: Maria's for any other handle (prop "following": you follow her), or yours, with what you changed on
        // this board (your handle, bio, pins). Prop "missing": no one has that name; "empty": nothing shared or saved yet.
        profile: h => {
          if (wait) return undefined;
          if (p.missing) return { missing: true, status: 404, error: 'No one has that name.' };
          const mine = (m.profile && m.profile.handle) || 'alexkim';
          if (h && h !== mine) {
            // Prop "blocked": someone you blocked (Unblock); their page comes without their decks, like the server's.
            const was = !!p.following, blocked = (m.blocks || {})[h] ?? !!p.blocked, on = !blocked && (follows[h] ?? was);
            return { ...N.OTHER, followers: N.OTHER.followers + (on ? 1 : 0) - (was ? 1 : 0), decks: p.empty || blocked ? [] : [D.mcat, D.spanish].map(deckCard).map((d, i) => ({ ...d, pinned: !i })), saved: [], stars: blocked ? 0 : N.OTHER.stars, me: p.signedOut ? null : { self: false, following: on, blocked } };
          }
          const pr = { ...N.PROFILE, ...(m.profile || {}), handle: mine }, feat = pr.featured || [];
          const decks = p.empty ? [] : N.ALEX_DECKS.map(deckCard).map(d => ({ ...d, pinned: feat.includes(d.id) }));
          return { ...pr, followers: p.empty ? 0 : pr.followers, following: p.empty ? 0 : pr.following, stars: decks.reduce((n, d) => n + d.stars, 0), decks,
            saved: p.empty ? [] : [D.mcat, D.kanji, D.bio2a].map(deckCard), me: { self: true, following: false } };
        },
        deck: () => (wait ? undefined : deckPage()), deckById: () => (wait ? undefined : deckPage()),
        // Your Cell Biology's History; prop someoneElse shows Maria's MCAT Biochemistry, which isn't yours.
        history: () => (wait ? undefined : p.someoneElse ? { id: 's1', name: 'MCAT Biochemistry', url: '/@mariasantos/mcat-biochemistry', owner: N.P.maria, mine: false, following: 300, versions: N.HISTORY }
          : { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology', owner: N.P.alex, mine: true, following: 214, versions: back(N.CELL_HISTORY) }),
        activity: () => (wait ? undefined : p.empty ? { unread: 0, items: [] } : { unread: m.read ? 0 : 2, items: N.NEWS.map(x => ({ ...x, read: m.read ? true : x.read })) }),
        suggestions: open, inbox: open, sent: () => (wait ? undefined : p.empty ? [] : N.SENT),
        // The people you blocked (Settings › Account): Maria and Dev, or nobody (prop "noBlocks"); Unblock takes one off.
        blocks: () => (wait ? undefined : { people: p.noBlocks ? [] : [N.P.maria, N.P.dev].filter(x => (m.blocks || {})[x.handle] !== false) }),
        mine: () => ({ handle: 'alexkim', profile: N.P.alex, decks: [{ id: 's9', slug: 'cell-biology', visibility: 'public', stars: 1300, learners: 214, copies: 86, version: 14, open: 3, level: 'college', subject: 'biology', schoolId: '110644', school: 'University of California-Davis' }] }),
        classes: () => (wait ? undefined : p.empty ? [] : N.CLASS_LIST),
        klass: code => (wait ? undefined : p.missing ? { missing: true, status: 404 } : klass(code)),
        verify: () => ({ verified: ({ Teacher: 'teacher', School: 'school' })[p.verified] || '', open: p.verified === 'Waiting for review' || !!m.verifySent, declined: false, role: '', school: 'UC Davis' }),
        admin: () => (wait ? undefined : p.denied ? { missing: true, status: 403 } : p.empty ? { requests: [], reports: [] } : N.ADMIN),
        drop: noop, act: () => Promise.resolve(null)
      };
    })(),
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
      star: (id, on) => set({ stars: { ...(m.stars || {}), [id]: !!on } }), watch: (id, on) => set({ watching: !!on }),
      follow: (h, on) => set({ follows: { ...(m.follows || {}), [h]: !!on } }), study: () => set({ studying: 'cell' }), copyDeck: () => set({ copied: 'cell' }),
      // Block (or Unblock) and Delete account (App Store): they stay on the board.
      block: (h, on) => { set({ blocks: { ...(m.blocks || {}), [h]: !!on } }); return Promise.resolve({ blocked: !!on }); }, deleteAccount: () => Promise.resolve({ ok: true, apple: false }),
      decide: (id, picks) => { set({ picks: { ...(m.picks || {}), [id]: { ...((m.picks || {})[id] || {}), ...picks } } }); return Promise.resolve({}); }, readNews: () => set({ read: true }),
      suggest: () => Promise.resolve({ id: 'g9', taken: false }), restore: (id, v) => { set({ restored: v }); return Promise.resolve({ changes: 1 }); }, checkDeck: () => { set({ checked: true }); return Promise.resolve({}); },
      keepCards: ids => { set({ aiDone: { ...aiDone, ...Object.fromEntries(ids.map(x => [x, 'kept'])) } }); return Promise.resolve({}); },
      tossCards: ids => { set({ aiDone: { ...aiDone, ...Object.fromEntries(ids.map(x => [x, 'tossed'])) } }); return Promise.resolve({}); }, ensureProfile: noop,
      // Someone in the sample already has the handle: it's taken, like the server says.
      updateProfile: patch => {
        const h = patch.handle ? String(patch.handle).toLowerCase() : '';
        if (h && Object.values(N.P).some(x => x.handle === h && x.handle !== 'alexkim')) return Promise.reject(new Error('That name is taken. Try another.'));
        set({ profile: { ...(m.profile || {}), ...patch } });
        return Promise.resolve({ handle: h || (m.profile && m.profile.handle) || 'alexkim' });
      },
      // Its level, subject, and school stay on the board too (a school by its id, from the sample's list, or the words typed).
      shareDeck: (id, o) => {
        const labels = {};
        if ('level' in o) labels.level = o.level;
        if ('subject' in o) labels.subject = o.subject;
        if ('schoolId' in o || 'school' in o) { const r = N.SCHOOLS.find(x => x[0] === o.schoolId); labels.schoolId = r ? r[0] : ''; labels.school = r ? r[1] : o.school || ''; }
        set({ share: { ...(m.share || { vis: p.shared === 'Public' ? 'public' : p.shared === 'Link only' ? 'link' : 'private' }), ...(o.visibility ? { vis: o.visibility } : {}), labels: { ...((m.share || {}).labels || {}), ...labels } } });
        return Promise.resolve({});
      },
      detach: () => set({ detached: true }), takeUpdates: () => { set({ took: true }); return Promise.resolve({}); }, copyUpdates: (id, on) => set({ upd: !!on }),
      // Live: typing on the join board and tapping an answer stay on that board; the rest link to the next board.
      joinCode: v => set({ joinCode: String(v || '').replace(/\D/g, '').slice(0, 6) }), joinName: v => set({ joinName: String(v || '').slice(0, 20) }), liveAnswer: i => set({ livePick: i }),
      openLive: noop, liveStart: noop, liveNext: noop, liveAgain: noop, liveClose: noop, joinLive: noop, joinAgain: noop,
      setExam: (id, day) => set({ deck: { ...ed, exam: day || null } }),
      pauseCards: (ids, on) => set({ paused: { ...pausedIds, ...Object.fromEntries(ids.map(id => [id, !!on])) } }),
      tune: () => set({ tune: 'on' }), useTuned: on => set({ tune: on ? 'on' : 'off' }),
      // Classes: the canvas keeps each change on its board.
      makeClass: () => Promise.resolve({ code: 'BIOKTZ' }), joinClass: () => { set({ joined: true }); return Promise.resolve({}); },
      leaveClass: () => Promise.resolve({}), deleteClass: () => Promise.resolve({}), updateClass: () => Promise.resolve({}),
      shareProgress: (id, on) => { set({ classShare: { ...(m.classShare || {}), [id]: !!on } }); return Promise.resolve({ on: !!on }); },
      setMember: (id, h, o) => { set(o.remove ? { out: { ...(m.out || {}), [h]: true } } : { roles: { ...(m.roles || {}), [h]: o.role } }); return Promise.resolve({}); },
      addClassDeck: () => Promise.resolve({}), removeClassDeck: (id, sid) => { set({ takenOut: { ...(m.takenOut || {}), [sid]: true } }); return Promise.resolve({}); },
      assign: (id, o) => { const d = Object.values(N.CLASSES).flatMap(k => k.deckList || []).find(x => x.id === o.sharedId) || {};
        set({ assigned: [...(m.assigned || []), { id: 'n' + (m.assigned || []).length, classId: id, sharedId: o.sharedId, goal: o.goal, due: o.due, deck: { name: d.name, cover: d.cover, cards: d.cards, url: d.url }, progress: {} }] }); return Promise.resolve({}); },
      unassign: (id, a) => { set({ unassigned: { ...(m.unassigned || {}), [a]: true } }); return Promise.resolve({}); },
      askVerify: () => { set({ verifySent: true }); return Promise.resolve({}); }, report: () => Promise.resolve({}),
      adminVerify: () => Promise.resolve({}), adminReport: () => Promise.resolve({}), classroom: noop
    }
  };
}`.replace('__SIDE_TIPS__', () => JSON.stringify(SIDE_TIPS)).replace('__SIDE__', () => sideView.toString()).replace('__SAMPLE__', () => JSON.stringify(SAMPLE)).replace('__WAVE__', () => JSON.stringify(SAMPLE_WAVE)).replace('__NET__', () => JSON.stringify(NET_SAMPLE)).replace('__LIVE__', () => JSON.stringify(LIVE_SAMPLE)).replace('__INSIGHTS__', () => JSON.stringify(SAMPLE_INSIGHTS));
