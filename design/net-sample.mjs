// The study network's sample data for the canvas (profiles, shared decks, Discover, a deck's page and History,
// suggestions, news), the same people and decks as the "Study network" mockups. mock.mjs hands these to boards as
// this.mock().net, shaped exactly like what web/social.mjs answers the app (see web/net.js), so a board draws the same
// way from both.
const P = {
  alex: { handle: 'alexkim', name: 'Alex Kim', avatar: null, color: 0, verified: '', kind: 'person' },
  maria: { handle: 'mariasantos', name: 'Maria Santos', avatar: null, color: 3, verified: '', kind: 'person' },
  dev: { handle: 'devp', name: 'Dev Patel', avatar: null, color: 2, verified: '', kind: 'person' },
  jordan: { handle: 'jordanlee', name: 'Jordan Lee', avatar: null, color: 1, verified: '', kind: 'person' },
  okafor: { handle: 'drokafor', name: 'Dr. Okafor', avatar: null, color: 4, verified: 'teacher', kind: 'person' },
  sam: { handle: 'samr', name: 'Sam Rivera', avatar: null, color: 5, verified: '', kind: 'person' },
  ucd: { handle: 'ucdavis.bio', name: 'UC Davis Biology', avatar: null, color: 0, verified: 'school', kind: 'school' }
};
const deck = (id, owner, name, cards, stars, extra = {}) => ({ id, url: '/@' + P[owner].handle + '/' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, description: '', tags: [],
  cover: { style: 'mix', round: 0, seed: name, image: null }, cards, stars, learners: Math.round(stars * .6), copies: Math.round(stars * .12), version: 3, updated: '2026-09-26T10:00:00Z', visibility: 'public',
  checked: null, maintained: 'creator', owner: P[owner], theme: '', ...extra });
const DECKS = {
  mcat: deck('s1', 'maria', 'MCAT Biochemistry', 640, 4200, { tags: ['MCAT', 'Biology'], description: 'Every enzyme, pathway, and number the exam asks. Suggestions welcome.', version: 14, updated: '2026-09-26T10:00:00Z',
    checked: { name: 'Dr. Okafor', handle: 'drokafor', current: false }, learners: 214, copies: 86 }),
  kanji: deck('s2', 'jordan', 'JLPT N3 Kanji', 1024, 3100, { tags: ['Languages', 'Japanese'] }),
  algo: deck('s3', 'dev', 'Algorithms', 212, 2700, { tags: ['Computer science'] }),
  pharm: deck('s4', 'sam', 'Pharmacology', 388, 1900, { tags: ['Pre-med'] }),
  bio2a: deck('s5', 'okafor', 'BIO 2A · Final', 290, 860, { tags: ['Biology'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  law: deck('s6', 'sam', 'Constitutional Law', 174, 640, { tags: ['Law'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  orgo: deck('s7', 'okafor', 'Organic Reactions', 256, 1400, { tags: ['Chemistry'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  spanish: deck('s8', 'maria', 'Spanish B1', 900, 2200, { tags: ['Languages'] }),
  cell: deck('s9', 'alex', 'Cell Biology', 412, 1300, { tags: ['Biology', 'MCAT'] }),
  sys: deck('s10', 'alex', 'System Design', 74, 412, { tags: ['Computer science'] }),
  jp: deck('s11', 'alex', 'Japanese N4', 820, 2400, { tags: ['Languages'] }),
  orgoA: deck('s12', 'alex', 'Organic Chemistry', 236, 640, { tags: ['Chemistry'], checked: { name: 'Dr. Okafor', handle: 'drokafor', current: true } }),
  hist: deck('s13', 'alex', 'US History', 158, 205, { tags: ['History'] }),
  anat: deck('s14', 'alex', 'Anatomy', 530, 980, { tags: ['Biology'] }),
  pharmA: deck('s15', 'alex', 'Pharmacology', 188, 320, { tags: ['Pre-med'] }),
  psych: deck('s16', 'alex', 'Psych & Soc', 344, 1100, { tags: ['MCAT'] })
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
const MADE = [
  { version: 14, kind: 'suggestion', summary: 'Took 3 changes from Maria Santos', ai: '', at: '2026-09-26T10:00:00Z', by: P.maria, n: 3 },
  { version: 13, kind: 'check', summary: 'Dr. Okafor checked every card', ai: '', at: '2026-09-21T10:00:00Z', by: P.okafor, n: 0 },
  { version: 12, kind: 'suggestion', summary: 'Took 1 change from Dev Patel', ai: '', at: '2026-09-14T10:00:00Z', by: P.dev, n: 6 },
  { version: 9, kind: 'ai', summary: '38 new cards', ai: 'Claude', at: '2026-08-30T10:00:00Z', by: P.maria, n: 38 },
  { version: 1, kind: 'made', summary: 'Shared 220 cards', ai: 'ChatGPT', at: '2026-08-12T10:00:00Z', by: P.maria, n: 0 }
];
const ch = (card, op, kind, before, after) => ({ card, op, kind, before, after });
const HISTORY = MADE.map(v => ({ ...v, changes: v.kind === 'suggestion' && v.version === 14 ? [
  ch('c2', 'edit', 'answer', { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Hexokinase' }, { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Phosphofructokinase-1 (PFK-1)' }),
  ch('n1', 'add', 'new', null, { kind: 'basic', front: 'What activates PFK-1?', back: 'AMP and fructose-2,6-bisphosphate' }),
  ch('c7', 'edit', 'typo', { kind: 'basic', front: 'Where does the citric acid cycle happen?', back: 'In the cytoplasm' }, { kind: 'basic', front: 'Where does the citric acid cycle happen?', back: 'In the mitochondrial matrix' })] : [] }));
const SUGGESTIONS = [
  { id: 'g1', shared_id: 's1', author_name: 'Maria Santos', author: P.maria, ai: '', message: 'Fixed the glycolysis answers from my TA’s review.', status: 'open', created_at: '2026-09-28T08:00:00Z', deck: { name: 'Cell Biology' }, changes: [
    { id: 'x1', card: 'c2', op: 'edit', kind: 'answer', status: 'open', before: { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Hexokinase' }, after: { kind: 'basic', front: 'Which enzyme is the rate-limiting step of glycolysis?', back: 'Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate.' } },
    { id: 'x2', card: 'n1', op: 'add', kind: 'new', status: 'open', before: null, after: { kind: 'basic', front: 'What activates PFK-1?', back: 'AMP and fructose-2,6-bisphosphate.' } },
    { id: 'x3', card: 'c7', op: 'edit', kind: 'typo', status: 'open', before: { kind: 'basic', front: 'The citric acid cycle happens in the cytoplasm.', back: '' }, after: { kind: 'basic', front: 'The citric acid cycle happens in the mitochondrial matrix.', back: '' } }] },
  { id: 'g2', shared_id: 's1', author_name: 'Dev Patel', author: P.dev, ai: 'ChatGPT', message: '', status: 'open', created_at: '2026-09-25T08:00:00Z', deck: { name: 'Cell Biology' }, changes: [
    { id: 'x4', card: 'n2', op: 'add', kind: 'new', status: 'open', before: null, after: { kind: 'basic', front: 'What does ATP synthase make?', back: 'ATP, from ADP and phosphate.' } }] }
];
const NEWS = [
  { id: 1, kind: 'suggestion', actor_name: 'Maria Santos', person: P.maria, deck: { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology' }, data: { n: 3, message: 'Fixed the glycolysis answers from my TA’s review.' }, read: false, created_at: '2026-09-28T08:00:00Z' },
  { id: 2, kind: 'follow', actor_name: 'Jordan Lee', person: P.jordan, deck: null, data: { handle: 'jordanlee' }, read: false, created_at: '2026-09-28T06:00:00Z' },
  { id: 3, kind: 'update', actor_name: 'Maria Santos', person: P.maria, deck: { id: 's1', name: 'MCAT Biochemistry', url: '/@mariasantos/mcat-biochemistry' }, data: { summary: '3 new cards, 2 answers fixed', n: 5 }, read: true, created_at: '2026-09-26T10:00:00Z' },
  { id: 4, kind: 'decided', actor_name: 'Sam Rivera', person: P.sam, deck: { id: 's4', name: 'Pharmacology', url: '/@samr/pharmacology' }, data: { took: 2, skipped: 1 }, read: true, created_at: '2026-09-24T10:00:00Z' },
  { id: 5, kind: 'checked', actor_name: 'Dr. Okafor', person: P.okafor, deck: { id: 's12', name: 'Organic Chemistry', url: '/@alexkim/organic-chemistry' }, data: {}, read: true, created_at: '2026-09-21T10:00:00Z' }
];
export const NET_SAMPLE = {
  P, DECKS, ALEX_DECKS, CARDS, MADE, HISTORY, SUGGESTIONS, NEWS,
  PROFILE: { ...P.alex, bio: 'MCAT decks, made with my AI. Suggestions welcome.', school: 'UC Davis', subject: 'Pre-med', followers: 340, following: 86, contributions: 23, featured: ['s9', 's10'], stars: 7360 },
  OTHER: { ...P.maria, bio: 'Biochem TA. I fix what my students trip on.', school: 'UC Davis', subject: 'Biochemistry', followers: 1280, following: 140, contributions: 212, featured: ['s1'], stars: 6400 },
  DISCOVER: { topics: ['MCAT', 'Languages', 'Computer science', 'Chemistry', 'Law', 'History', 'Biology'], sections: [
    { id: 'popular', title: 'Popular this week', decks: ['mcat', 'kanji', 'algo', 'pharm'] },
    { id: 'checked', title: 'Checked by teachers', decks: ['bio2a', 'law', 'orgo', 'spanish'] },
    { id: 'new', title: 'New', decks: ['pharm', 'algo', 'spanish', 'kanji'] }] }
};
