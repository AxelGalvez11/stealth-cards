// What people say about where they study, and what a shared deck is for (the study network's school labels). Shared by the server
// (web/social.mjs checks what it's given), the web app (the pickers search the school list), and the boards (design/build.mjs
// reads the lists, so the canvas and the app offer the same words). The iPhone app has the same lists in Data/Schools.swift.
//
// - A person's level, optional year, and school (picked from web/schools.json, or typed as "Other"), shown on their profile only
//   if they switched it on. High school students pick the level only: there is no list of high schools.
// - A public deck's three labels: level, subject, school. Discover narrows by them.

// [id, words]
export const LEVELS = [['highschool', 'High school'], ['college', 'College'], ['graduate', 'Graduate'], ['medical', 'Medical or professional'], ['other', 'Other']];
export const YEARS = [['1', '1st year'], ['2', '2nd year'], ['3', '3rd year'], ['4', '4th year'], ['5', '5th year or more']];
export const SUBJECTS = [['art', 'Art and design'], ['biology', 'Biology'], ['business', 'Business'], ['chemistry', 'Chemistry'], ['computer-science', 'Computer science'],
  ['economics', 'Economics'], ['education', 'Education'], ['engineering', 'Engineering'], ['english', 'English and literature'], ['environment', 'Environmental science'],
  ['finance', 'Finance and accounting'], ['geography', 'Geography'], ['history', 'History'], ['languages', 'Languages'], ['law', 'Law'], ['math', 'Math'], ['medicine', 'Medicine'],
  ['music', 'Music'], ['neuroscience', 'Neuroscience'], ['nursing', 'Nursing and health'], ['pharmacy', 'Pharmacy'], ['philosophy', 'Philosophy'], ['physics', 'Physics'],
  ['politics', 'Political science'], ['psychology', 'Psychology'], ['public-health', 'Public health'], ['religion', 'Religion'], ['sociology', 'Sociology'],
  ['statistics', 'Statistics'], ['test-prep', 'Test prep']];

const plain = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
// Another way of saying one of the above (an AI app may say "mathematics" or "high school"), by its plain letters.
const SAYS = { mathematics: 'math', maths: 'math', cs: 'computer-science', computing: 'computer-science', computerscience: 'computer-science', language: 'languages', foreignlanguages: 'languages',
  poliscience: 'politics', politicalscience: 'politics', polisci: 'politics', literature: 'english', englishliterature: 'english', environmentalscience: 'environment', accounting: 'finance',
  health: 'nursing', nursingandhealth: 'nursing', med: 'medicine', premed: 'medicine', arts: 'art', design: 'art', artanddesign: 'art', stats: 'statistics', sat: 'test-prep', mcat: 'test-prep', testprep: 'test-prep', publichealth: 'public-health',
  hs: 'highschool', secondary: 'highschool', undergraduate: 'college', undergrad: 'college', university: 'college', gradschool: 'graduate', postgraduate: 'graduate', masters: 'graduate',
  professional: 'medical', medicalschool: 'medical', medicalorprofessional: 'medical', lawschool: 'medical' };
const pick = (list, x, level) => {
  const p = plain(x);
  if (!p) return '';
  for (const [id, words] of list) if (plain(id) === p || plain(words) === p) return id;
  const s = SAYS[p];
  return s && list.some(([id]) => id === s) && (level ? ['highschool', 'college', 'graduate', 'medical'].includes(s) : !['highschool', 'college', 'graduate', 'medical'].includes(s)) ? s : '';
};
// What someone sent, as the list's own id ('' for anything it doesn't know).
export const levelOf = x => pick(LEVELS, x, true);
export const subjectOf = x => pick(SUBJECTS, x, false);
export const yearOf = x => { const s = String(x ?? '').trim(); return YEARS.some(([id]) => id === s) ? s : ''; };
export const levelWords = id => (LEVELS.find(([k]) => k === id) || [])[1] || '';
export const subjectWords = id => (SUBJECTS.find(([k]) => k === id) || [])[1] || '';
export const yearWords = id => (YEARS.find(([k]) => k === id) || [])[1] || '';
// A person's line on their profile, from what they chose to show: "College · 3rd year", after their school.
export const schoolLine = ({ school, level, year } = {}) => [school, levelWords(level), yearWords(year)].filter(Boolean).join(' · ');

// ---------- the school list (web/schools.json): rows of [id, name, city, state, other names separated by |] ----------
const words = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean);
const cache = new WeakMap();
const tokensOf = row => {
  let t = cache.get(row);
  if (!t) { t = { name: words(row[1]), more: words(row[2] + ' ' + row[3] + ' ' + (row[4] || '')), alias: words(row[4] || ''), flat: words(row[1]).join(' '), names: String(row[4] || '').split(/[|,]/).map(x => words(x).join(' ')).filter(Boolean) }; cache.set(row, t); }
  return t;
};
// The schools a few typed words find, best first: every word starts a word of the school's name, its other names, its city or its
// state ("tex aus" finds The University of Texas at Austin; "ucla" finds UCLA by its other name). A school whose name is what was
// typed comes first, then one whose other name is (mit), then ones whose name starts with it, then names that hold all the words,
// then other names, then places.
export function schoolSearch(rows, q, limit = 40) {
  const w = words(q);
  if (!w.length || !Array.isArray(rows)) return [];
  const flat = w.join(' '), out = [];
  for (const row of rows) {
    const t = tokensOf(row);
    const inName = w.every(x => t.name.some(y => y.startsWith(x)));
    const inAny = inName || w.every(x => t.name.some(y => y.startsWith(x)) || t.more.some(y => y.startsWith(x)));
    if (!inAny) continue;
    const rank = t.flat === flat ? 0 : t.names.includes(flat) ? 1 : t.flat.startsWith(flat) ? 2 : inName ? 3 : w.every(x => t.alias.some(y => y.startsWith(x))) ? 4 : 5;
    out.push({ row, rank });
  }
  out.sort((a, b) => a.rank - b.rank || a.row[1].length - b.row[1].length || (a.row[1] < b.row[1] ? -1 : a.row[1] > b.row[1] ? 1 : 0));
  return out.slice(0, limit).map(x => x.row);
}
