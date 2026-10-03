// The study network's sample data for the canvas (profiles, shared decks, Discover, a deck's page and History,
// suggestions, news), the same people and decks as the "Study network" mockups. mock.mjs hands these to boards as
// this.mock().net, shaped exactly like what web/social.mjs answers the app (see web/net.js), so a board draws the same
// way from both.
import { readFileSync } from 'node:fs';
// A few real schools out of web/schools.json, for the school pickers (the picker's rows are [id, name, city, state, other names]).
const SCHOOL_IDS = ['110644', '110635', '110653', '110680', '110662', '243744', '166683', '166027', '130794', '190415', '193900', '228778', '237358', '202435', '186131'];
const SCHOOL_ROWS = JSON.parse(readFileSync(new URL('../web/schools.json', import.meta.url), 'utf8')).rows;
export const SCHOOLS = SCHOOL_IDS.map(id => SCHOOL_ROWS.find(r => r[0] === id));
const UCD = { schoolId: '110644', school: 'University of California-Davis' }, STAN = { schoolId: '243744', school: 'Stanford University' };
const P = {
  alex: { handle: 'alexkim', name: 'Alex Kim', avatar: null, color: 0, verified: '', kind: 'person' },
  maria: { handle: 'mariasantos', name: 'Maria Santos', avatar: null, color: 3, verified: '', kind: 'person' },
  dev: { handle: 'devp', name: 'Dev Patel', avatar: null, color: 2, verified: '', kind: 'person' },
  jordan: { handle: 'jordanlee', name: 'Jordan Lee', avatar: null, color: 1, verified: '', kind: 'person' },
  okafor: { handle: 'drokafor', name: 'Dr. Okafor', avatar: null, color: 4, verified: 'teacher', kind: 'person' },
  sam: { handle: 'samr', name: 'Sam Rivera', avatar: null, color: 5, verified: '', kind: 'person' },
  ucd: { handle: 'ucdavis.bio', name: 'UC Davis Biology', avatar: null, color: 0, verified: 'school', kind: 'school' }
};
const deck = (id, owner, name, cards, stars, extra = {}) => ({ level: '', subject: '', school: '', schoolId: '', id, url: '/@' + P[owner].handle + '/' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, description: '', tags: [],
  cover: { style: 'mix', round: 0, seed: name, image: null }, cards, stars, learners: Math.round(stars * .6), copies: Math.round(stars * .12), version: 3, updated: '2026-09-26T10:00:00Z', visibility: 'public',
  checked: null, maintained: 'creator', owner: P[owner], theme: '', ...extra });
const DECKS = {
  mcat: deck('s1', 'maria', 'MCAT Biochemistry', 640, 4200, { ...UCD, level: 'college', subject: 'biology', tags: ['MCAT', 'Biology'], description: 'Every enzyme, pathway, and number the exam asks. Suggestions welcome.', version: 14, updated: '2026-09-26T10:00:00Z',
    checked: { name: 'Dr. Okafor', handle: 'drokafor', current: false }, learners: 214, copies: 86 }),
  kanji: deck('s2', 'jordan', 'JLPT N3 Kanji', 1024, 3100, { level: 'other', subject: 'languages', tags: ['Languages', 'Japanese'] }),
  algo: deck('s3', 'dev', 'Algorithms', 212, 2700, { ...STAN, level: 'college', subject: 'computer-science', tags: ['Computer science'] }),
  pharm: deck('s4', 'sam', 'Pharmacology', 388, 1900, { ...STAN, level: 'medical', subject: 'pharmacy', tags: ['Pre-med'] }),
  bio2a: deck('s5', 'okafor', 'BIO 2A · Final', 290, 860, { ...UCD, level: 'college', subject: 'biology', tags: ['Biology'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  law: deck('s6', 'sam', 'Constitutional Law', 174, 640, { ...STAN, level: 'medical', subject: 'law', tags: ['Law'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  orgo: deck('s7', 'okafor', 'Organic Reactions', 256, 1400, { ...UCD, level: 'college', subject: 'chemistry', tags: ['Chemistry'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  spanish: deck('s8', 'maria', 'Spanish B1', 900, 2200, { level: 'highschool', subject: 'languages', tags: ['Languages'] }),
  cell: deck('s9', 'alex', 'Cell Biology', 412, 1300, { ...UCD, level: 'college', subject: 'biology', tags: ['Biology', 'MCAT'] }),
  sys: deck('s10', 'alex', 'System Design', 74, 412, { ...UCD, level: 'college', subject: 'computer-science', tags: ['Computer science'] }),
  jp: deck('s11', 'alex', 'Japanese N4', 820, 2400, { level: 'other', subject: 'languages', tags: ['Languages'] }),
  orgoA: deck('s12', 'alex', 'Organic Chemistry', 236, 640, { ...UCD, level: 'college', subject: 'chemistry', tags: ['Chemistry'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  hist: deck('s13', 'alex', 'US History', 158, 205, { level: 'highschool', subject: 'history', tags: ['History'] }),
  anat: deck('s14', 'alex', 'Anatomy', 530, 980, { ...UCD, level: 'college', subject: 'medicine', tags: ['Biology'] }),
  pharmA: deck('s15', 'alex', 'Pharmacology', 188, 320, { ...UCD, level: 'medical', subject: 'pharmacy', tags: ['Pre-med'] }),
  psych: deck('s16', 'alex', 'Psych & Soc', 344, 1100, { ...UCD, level: 'college', subject: 'psychology', tags: ['MCAT'] })
};
const ALEX_DECKS = ['cell', 'sys', 'jp', 'orgoA', 'hist', 'anat', 'pharmA', 'psych'].map((k, i) => ({ ...DECKS[k], pinned: i < 2 }));
const CARDS = [
  { id: 'c1', kind: 'basic', front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺)', tags: ['Energy'], source: '', trail: [{ w: 'made', at: 1 }] },
  { id: 'c2', kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Phosphofructokinase-1 (PFK-1)', tags: ['Glycolysis'], source: '', trail: [{ w: 'made', at: 1 }, { w: 'edited', by: 'Maria Santos', at: 2 }] },
  { id: 'c3', kind: 'cloze', front: '', back: '', text: 'The [[citric acid]] cycle produces NADH and FADH₂.', tags: ['Krebs'], source: 'Claude', trail: [{ w: 'made', ai: 'Claude', at: 1 }] },
  { id: 'c4', kind: 'image', front: 'Name the structure marked 1 on the diagram.', back: 'Inner membrane', tags: ['Diagrams'], source: '', trail: [{ w: 'made', at: 1 }] },
  { id: 'c5', kind: 'basic', front: 'What inhibits pyruvate dehydrogenase?', back: 'Acetyl-CoA and NADH', tags: [], source: '', trail: [{ w: 'made', at: 1 }, { w: 'edited', by: 'Dev Patel', at: 2 }] },
  { id: 'c6', kind: 'cloze', front: '', back: '', text: 'Km is the substrate concentration at [[half]] Vmax.', tags: ['Enzymes'], source: '', trail: [{ w: 'made', at: 1 }] }
];
// How Maria's MCAT Biochemistry came to be (its page's "How it was made", and its History for someone who isn't her).
const MADE = [
  { version: 14, kind: 'suggestion', summary: 'Took 3 changes from Alex Kim', ai: '', at: '2026-09-26T10:00:00Z', by: P.alex, n: 3 },
  { version: 13, kind: 'check', summary: 'Dr. Okafor checked every card', ai: '', at: '2026-09-21T10:00:00Z', by: P.okafor, n: 0 },
  { version: 12, kind: 'suggestion', summary: 'Took 2 changes from Dev Patel', ai: '', at: '2026-09-14T10:00:00Z', by: P.dev, n: 2 },
  { version: 9, kind: 'ai', summary: '38 new cards', ai: 'Claude', at: '2026-08-30T10:00:00Z', by: P.maria, n: 38 },
  { version: 1, kind: 'made', summary: 'Shared 220 cards', ai: 'ChatGPT', at: '2026-08-12T10:00:00Z', by: P.maria, n: 0 }
];
const ch = (card, op, kind, before, after) => ({ card, op, kind, before, after });
const basic = (front, back) => ({ kind: 'basic', front, back });
const HISTORY = MADE.map(v => ({ ...v, changes: v.version === 14 ? [
  ch('c2', 'edit', 'answer', basic('Which enzyme is the rate-limiting step of glycolysis?', 'Hexokinase'), basic('Which enzyme is the rate-limiting step of glycolysis?', 'Phosphofructokinase-1 (PFK-1)')),
  ch('n1', 'add', 'new', null, basic('What activates PFK-1?', 'AMP and fructose-2,6-bisphosphate')),
  ch('c7', 'edit', 'typo', basic('Where does the citric acid cycle hapen?', 'In the mitochondrial matrix'), basic('Where does the citric acid cycle happen?', 'In the mitochondrial matrix'))]
  : v.version === 12 ? [ch('c5', 'edit', 'answer', basic('What inhibits pyruvate dehydrogenase?', 'ATP'), basic('What inhibits pyruvate dehydrogenase?', 'Acetyl-CoA and NADH')),
    ch('c8', 'remove', 'remove', basic('Glycolysis happens in the mitochondria.', 'False'), null)] : [] }));
// Your Cell Biology's History (the sample History page): suggestions you took, a teacher's check, cards your AI made
// for you, and the first version.
const CELL_HISTORY = [
  { version: 14, kind: 'suggestion', summary: 'Took 3 changes from Maria Santos', ai: '', at: '2026-09-26T10:00:00Z', by: P.maria, changes: [
    ch('k7', 'edit', 'answer', basic('Which enzyme is the rate-limiting step of glycolysis?', 'Hexokinase'), basic('Which enzyme is the rate-limiting step of glycolysis?', 'Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate.')),
    ch('n1', 'add', 'new', null, basic('What activates PFK-1?', 'AMP and fructose-2,6-bisphosphate.')),
    ch('k8', 'edit', 'typo', basic('The citric acid cycle happens in the cytoplasm.', ''), basic('The citric acid cycle happens in the mitochondrial matrix.', ''))] },
  { version: 13, kind: 'check', summary: 'Dr. Okafor checked every card', ai: '', at: '2026-09-21T10:00:00Z', by: P.okafor, changes: [] },
  { version: 12, kind: 'suggestion', summary: 'Took 1 change from Dev Patel', ai: '', at: '2026-09-14T10:00:00Z', by: P.dev, changes: [
    ch('k6', 'edit', 'answer', basic('What is the role of the ribosome?', 'Makes lipids'), basic('What is the role of the ribosome?', 'Translates mRNA into protein'))] },
  { version: 9, kind: 'ai', summary: '3 new cards', ai: 'Claude', at: '2026-08-30T10:00:00Z', by: P.alex, changes: [
    ch('k2', 'add', 'new', null, { kind: 'cloze', text: 'The [[mitochondrion]] is the powerhouse of the cell.' }),
    ch('k3', 'add', 'new', null, basic('Name structure 1 on the diagram.', 'Nucleus')),
    ch('k9', 'add', 'new', null, basic('What does ATP synthase make?', 'ATP, from ADP and phosphate.'))] },
  { version: 1, kind: 'made', summary: 'Shared 220 cards', ai: 'ChatGPT', at: '2026-08-12T10:00:00Z', by: P.alex, changes: [] }
];
const SUGGESTIONS = [
  { id: 'g1', shared_id: 's9', author_name: 'Maria Santos', person: P.maria, ai: '', message: 'Fixed the glycolysis answers from my TA’s review.', status: 'open', created_at: '2026-09-28T08:00:00Z', deck: { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology' }, changes: [
    { id: 'x1', card: 'c2', op: 'edit', kind: 'answer', status: 'open', before: { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Hexokinase' }, after: { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate.' } },
    { id: 'x2', card: 'n1', op: 'add', kind: 'new', status: 'open', before: null, after: { kind: 'basic', front: 'What activates PFK-1?', back: 'AMP and fructose-2,6-bisphosphate.' } },
    { id: 'x3', card: 'c7', op: 'edit', kind: 'typo', status: 'open', before: { kind: 'basic', front: 'The citric acid cycle happens in the cytoplasm.', back: '' }, after: { kind: 'basic', front: 'The citric acid cycle happens in the mitochondrial matrix.', back: '' } }] },
  { id: 'g2', shared_id: 's9', author_name: 'Dev Patel', person: P.dev, ai: 'ChatGPT', message: '', status: 'open', created_at: '2026-09-25T08:00:00Z', deck: { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology' }, changes: [
    { id: 'x4', card: 'n2', op: 'add', kind: 'new', status: 'open', before: null, after: { kind: 'basic', front: 'What does ATP synthase make?', back: 'ATP, from ADP and phosphate.' } }] }
];
// Suggestions you (Alex) sent to other people's decks, for your profile's Suggestions tab: one waiting, one partly
// taken, one taken, one skipped. `deck` is the deck they went to, as the server adds it to the ones you sent.
const sent = (id, key, message, at, statuses) => ({ id, shared_id: DECKS[key].id, author_name: 'Alex Kim', person: P.alex, ai: '', message, created_at: at, status: statuses.includes('open') ? 'open' : 'done',
  deck: { id: DECKS[key].id, name: DECKS[key].name, url: DECKS[key].url },
  changes: statuses.map((status, i) => ({ id: id + 'x' + i, card: 'c' + (i + 1), op: 'edit', kind: 'answer', status, before: { kind: 'basic', front: 'Card ' + (i + 1), back: 'Before' }, after: { kind: 'basic', front: 'Card ' + (i + 1), back: 'After' } })) });
const SENT = [
  sent('g11', 'mcat', 'Two answers my students kept missing.', '2026-09-27T15:00:00Z', ['open', 'open']),
  sent('g12', 'pharm', 'Fixed the doses on the beta blocker cards.', '2026-09-22T15:00:00Z', ['taken', 'taken', 'skipped']),
  sent('g13', 'algo', '', '2026-09-18T15:00:00Z', ['taken']),
  sent('g14', 'kanji', 'One reading was off.', '2026-09-10T15:00:00Z', ['skipped'])
];
const NEWS = [
  { id: 1, kind: 'suggestion', actor_name: 'Maria Santos', person: P.maria, deck: { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology' }, data: { n: 3, message: 'Fixed the glycolysis answers from my TA’s review.' }, read: false, created_at: '2026-09-28T08:00:00Z' },
  { id: 2, kind: 'follow', actor_name: 'Jordan Lee', person: P.jordan, deck: null, data: { handle: 'jordanlee' }, read: false, created_at: '2026-09-28T06:00:00Z' },
  { id: 3, kind: 'update', actor_name: 'Maria Santos', person: P.maria, deck: { id: 's1', name: 'MCAT Biochemistry', url: '/@mariasantos/mcat-biochemistry' }, data: { summary: '3 new cards, 2 answers fixed', n: 5 }, read: true, created_at: '2026-09-26T10:00:00Z' },
  { id: 4, kind: 'decided', actor_name: 'Sam Rivera', person: P.sam, deck: { id: 's4', name: 'Pharmacology', url: '/@samr/pharmacology' }, data: { took: 2, skipped: 1 }, read: true, created_at: '2026-09-24T10:00:00Z' },
  { id: 6, kind: 'hidden', actor_name: 'Lucida', person: null, deck: { id: 's13', name: 'US History', url: '/@alexkim/us-history' }, data: { name: 'US History' }, read: true, created_at: '2026-09-23T10:00:00Z' },
  { id: 5, kind: 'checked', actor_name: 'Dr. Okafor', person: P.okafor, deck: { id: 's12', name: 'Organic Chemistry', url: '/@alexkim/organic-chemistry' }, data: {}, read: true, created_at: '2026-09-21T10:00:00Z' },
  { id: 7, kind: 'verified', actor_name: 'Lucida', person: null, deck: null, data: { role: 'teacher' }, read: true, created_at: '2026-09-19T10:00:00Z' }
];
// The admin page: two verification requests, and reports about a deck, a profile, and a suggestion.
const KAI = { handle: 'kaiw', name: 'Kai Wong', avatar: null, color: 3, verified: '', kind: 'person' };
const ADMIN = {
  requests: [
    { id: 'v1', role: 'teacher', school: 'UC Davis', contact: 'hokafor@ucdavis.edu', at: '2026-09-27T15:00:00Z', person: { ...P.okafor, verified: '' } },
    { id: 'v2', role: 'school', school: 'Davis Senior High School', contact: 'https://dshs.djusd.net/staff', at: '2026-09-28T07:40:00Z', person: { handle: 'davishigh', name: 'Davis Senior High', avatar: null, color: 2, verified: '', kind: 'person' } }],
  reports: [
    { id: 'r1', kind: 'deck', name: 'USMLE Step 1 (all of it)', deck: deck('s30', 'sam', 'USMLE Step 1 (all of it)', 2400, 90, { owner: KAI }), person: null, suggestion: null,
      reports: [{ reason: 'stolen', note: 'These are my Anki cards, word for word.', by: P.jordan, at: '2026-09-28T06:00:00Z' }, { reason: 'wrong', note: '', by: P.sam, at: '2026-09-27T22:00:00Z' }] },
    { id: 'r2', kind: 'profile', name: 'Free Answers (@freeanswers)', deck: null, person: { handle: 'freeanswers', name: 'Free Answers', avatar: null, color: 1, verified: '', kind: 'person' }, suggestion: null,
      reports: [{ reason: 'spam', note: 'Every deck links to a site selling answers.', by: P.maria, at: '2026-09-28T05:00:00Z' }] },
    { id: 'r3', kind: 'suggestion', name: 'Leo Martin: check my page', deck: null, person: null, suggestion: { author: 'Leo Martin', message: 'check my page for more', n: 12, first: 'Get every answer at my page — link in bio', open: true },
      reports: [{ reason: 'spam', note: '', by: P.alex, at: '2026-09-26T12:00:00Z' }] }]
};
export const NET_SAMPLE = {
  P, DECKS, ALEX_DECKS, CARDS, MADE, HISTORY, CELL_HISTORY, SUGGESTIONS, SENT, NEWS, ADMIN,
  // Alex shows his school (the switch is on); Maria's page shows hers too.
  PROFILE: { ...P.alex, bio: 'MCAT decks, made with my AI. Suggestions welcome.', ...UCD, level: 'college', year: '3', showSchool: true, subject: 'Pre-med', followers: 340, following: 86, contributions: 23, featured: ['s9', 's10'], stars: 7360 },
  OTHER: { ...P.maria, bio: 'Biochem TA. I fix what my students trip on.', school: 'University of California-Davis', level: 'graduate', year: '', subject: 'Biochemistry', followers: 1280, following: 140, contributions: 212, featured: ['s1'], stars: 6400 },
  SCHOOLS,
  DISCOVER: { topics: ['MCAT', 'Languages', 'Computer science', 'Chemistry', 'Law', 'History', 'Biology'], sections: [
    { id: 'popular', title: 'Popular this week', decks: ['mcat', 'kanji', 'algo', 'pharm'] },
    { id: 'checked', title: 'Checked by teachers', decks: ['bio2a', 'law', 'orgo', 'spanish'] },
    { id: 'new', title: 'New', decks: ['pharm', 'algo', 'spanish', 'kanji'] }] }
};
