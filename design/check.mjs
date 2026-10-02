// Static check for every board: props JSON parses, logic runs under several prop sets,
// every {{hole}} resolves (handlers to functions), sc-for lists are arrays, and tags balance.
import { readFileSync, readdirSync } from 'node:fs';
import { readBoard } from './slim.mjs';
import { MAKE_STEPS, GUIDE_STATES, GUIDE_VIEWS, LIVE_FROM, LIVE_TOPIC_STATES } from './materials.mjs';
import { ASK_SAMPLES } from './ui.mjs';
import { webProblems } from './check-own-ui.mjs';

const DIR = new URL('./canvas/project/', import.meta.url);
const get = (o, p) => p.trim().split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source']);
const PROP_SETS = [
  {}, { dark: true }, { startRevealed: true }, { startRevealed: true, grading: 'Check or X' },
  { startRevealed: true, grading: 'Piles', newPileOpen: true }, { settingsOpen: true, progress: 'Counts' },
  { settingsOpen: true, grading: 'Piles' }, { settingsOpen: true, fsrs: false }, { card: 'Fill in the blank', startRevealed: true },
  { card: 'Audio' }, { card: 'Image', startRevealed: true }, { keyboard: true }, { keyboard: false }, { caughtUp: true }, { view: 'List' }, { photo: 'Google photo' }, { photo: 'Your photo' }, { textStyles: true, keyboard: true }, { cardType: 'Blank' }, { cardType: 'Image' }, { cardType: 'Audio', keyboard: true }, { cardType: 'Audio', recording: true }, { cardType: 'Audio', recording: true, keyboard: false }, { settingsOpen: true, settingsTab: 'Studying' },
  { openTags: true }, { moreTags: true }, { view: 'List', openTags: true }, { settingsOpen: true, tagPicker: true }, { tagPicker: true, keyboard: false },
  { $state: { moreOpen: true, moreQ: 'zz' } }, { $state: { tag: 'Must know' } }, { $state: { tagMenuOpen: true, tagQ: 'ex', filter: 'Organelles' } },
  { settingsOpen: true, $state: { dpOpen: true, dpQ: 'Pharm' } }, { $state: { cpOpen: true, cpQ: 'new tag' } }, { slashDemo: true }, { site: true },
  { naming: true }, { naming: true, dark: true, folder: 'f1' }, { moveOpen: true }, { mode: 'cards' }, { folder: 'f1', view: 'List' },
  { newCard: true, $state: { listQ: 'zz' } },
  // Pro: deep stats tabs, Free versions, the goal stepped, All cards' filters, paused cards, tuning.
  { tab: 'Memory' }, { tab: 'Weak spots' }, { tab: 'Pace' }, { tab: 'Pace', free: true }, { tab: 'Memory', dark: true, dim: true },
  { settingsOpen: true, settingsTab: 'Studying', free: true }, { settingsOpen: true, settingsTab: 'Studying', free: true, $state: { $m: { deck: { exam: '2026-10-04' } } } }, { settingsOpen: true, settingsTab: 'Studying', stepGoal: true },
  { mode: 'cards', level: 'leech' }, { mode: 'cards', level: 'paused' }, { mode: 'cards', level: 'hard' }, { paused: true }, { cardId: 'k1', paused: true, keyboard: false },
  { tune: 'Not enough reviews' }, { tune: 'Tuning' }, { tune: 'Off' }, { plan: 'Free' },
  // The study network: a shared deck (yours, one you study, signed out, loading, not shared) with its copy dialog and its
  // Suggest a change panel in each step, Suggestions for one deck or all of them, and History (opened, going back).
  { owner: true }, { studying: true }, { copyOpen: true, $state: { cpFolders: true } }, { suggest: 'c2' }, { suggest: 'c3' }, { suggest: 'c4' }, { suggest: 'new' }, { suggest: '1' },
  { suggest: 'c2', $state: { spRemove: true } }, { suggest: 'new', $state: { spKind: 'cloze' } }, { suggest: 'c2', $state: { spSent: true } }, { signedOut: true }, { loading: true }, { missing: true },
  { deckTab: 'History' }, { deckTab: 'People' }, { $state: { openCard: 'c1' } }, { owner: true, $state: { openCard: 'c1' } },
  { deckId: '' }, { pickItem: 'ai' }, { pickItem: 'g1' }, { noSuggestions: true, aiWaiting: false },
  { someoneElse: true, openVersion: 14 }, { openVersion: 12, confirmVersion: 12 }, { openVersion: 9 },
  // Explain open: beside a flashcard or a Learn question on a computer, under it on a phone.
  { startRevealed: true, explainOpen: true, explained: true }, { answered: true, explainOpen: true }, { explainOpen: true, dark: true, startRevealed: true }
];
// The study network's pages: loading, signed out, nothing yet, not found, someone else's profile (followed or not),
// a profile's tabs, Edit profile (with a handle someone has, or one that can't be a handle), and a deck's ⋯ menu.
PROP_SETS.push({ loading: true }, { signedOut: true }, { empty: true }, { missing: true }, { handle: 'mariasantos' }, { handle: 'mariasantos', following: true },
  { handle: 'mariasantos', signedOut: true }, { tab: 'Saved' }, { tab: 'Suggestions' }, { tab: 'Saved', empty: true }, { tab: 'Suggestions', empty: true }, { tab: 'Suggestions', loading: true },
  { editOpen: true }, { editOpen: true, editHandle: 'mariasantos', editError: 'That name is taken. Try another.' }, { editOpen: true, editHandle: 'no spaces' }, { pinOpen: true }, { self: true, handle: '' });
// Report on the deck, profile, and Suggestions pages: the sheet open, a line needed for Other and the error that says so,
// and the thank-you.
PROP_SETS.push({ report: true }, { report: true, signedOut: true }, { report: true, handle: 'mariasantos' }, { report: true, pickItem: 'g1' }, { report: true, deckId: '' },
  { $state: { rep: { kind: 'deck', id: 's1', name: 'MCAT Biochemistry' }, repReason: 'other', repNote: '', repErr: 'Say what’s wrong.' } },
  { $state: { rep: { kind: 'profile', id: 'mariasantos', name: 'Maria Santos' }, repReason: 'spam', repSent: true } },
  { pickItem: 'g1', $state: { rep: { kind: 'suggestion', id: 'g1', name: 'Maria Santos' }, repReason: 'stolen', repNote: 'Mine' } });
// Blocking people and deleting your account (App Store). Someone else's profile: the ⋯ menu (Report, Block), the Block question
// (slow, failed), a person you blocked (Unblock, its menu, slow, failed), and signed out (just Report). Suggestions: Block on one.
// Settings: the plan billed by Apple, the Account group (two blocked people, none, one just unblocked, a failed Unblock), and
// Delete account's question for Free, Pro, and Pro billed by Apple (waiting, failed).
PROP_SETS.push({ handle: 'mariasantos', moreOpen: true }, { handle: 'mariasantos', moreOpen: true, dark: true }, { handle: 'mariasantos', moreOpen: true, blocked: true },
  { handle: 'mariasantos', block: true }, { handle: 'mariasantos', block: true, dark: true }, { handle: 'mariasantos', block: true, $state: { blkBusy: true } },
  { handle: 'mariasantos', block: true, $state: { blkErr: 'You can’t block yourself.' } }, { handle: 'mariasantos', blocked: true }, { handle: 'mariasantos', blocked: true, dark: true },
  { handle: 'mariasantos', blocked: true, following: true }, { handle: 'mariasantos', blocked: true, $state: { err: 'Something went wrong. Try again.' } },
  { handle: 'mariasantos', moreOpen: true, signedOut: true }, { handle: 'mariasantos', blocked: true, signedOut: true }, { handle: 'mariasantos', block: true, signedOut: true },
  { block: true }, { block: true, pickItem: 'g1' }, { block: true, pickItem: 'g2' }, { block: true, deckId: '' }, { block: true, dark: true, pickItem: 'g1' },
  { block: true, pickItem: 'g1', $state: { blkBusy: true } }, { block: true, pickItem: 'g1', $state: { blkErr: 'Something went wrong. Try again.' } },
  { pickItem: 'ai' }, { pickItem: 'ai', block: true },
  { plan: 'Pro, billed by Apple' }, { plan: 'Pro, billed by Apple', dark: true }, { noBlocks: true }, { $state: { unblocked: { mariasantos: true } } },
  { $state: { unblocked: { mariasantos: true, devp: true } } }, { $state: { blockErr: 'Something went wrong. Try again.' } }, { noBlocks: true, dark: true },
  { deleteOpen: 'Asking' }, { deleteOpen: 'Asking', plan: 'Free' }, { deleteOpen: 'Asking', plan: 'Pro, ending' }, { deleteOpen: 'Asking', plan: 'Pro, billed by Apple' },
  { deleteOpen: 'Asking', plan: 'Pro, billed by Apple', dark: true }, { deleteOpen: 'Deleting' }, { deleteOpen: 'Failed' }, { deleteOpen: 'Failed', dark: true },
  { deleteOpen: 'Asking', $state: { del: false } }, { $state: { del: true, delBusy: true } }, { $state: { del: true, delErr: 'Couldn’t delete your account. Try again in a minute.' } });
// Connecting an AI app: the sign-in page on a password, Settings with Password open, the Connect AI page with no apps, and the consent page (an app
// Lucida vouches for, one it doesn't, one on this computer, loading, and a link that failed).
PROP_SETS.push({ passwordMode: true }, { passwordOpen: true }, { passwordOpen: true, dark: true }, { noApps: true }, { consent: 'Claude' }, { consent: 'ChatGPT' }, { consent: 'Other app' }, { consent: 'App on this computer' }, { consent: 'Loading' }, { consent: 'Error' }, { consent: 'Error', dark: true });
// Go Pro on the iPhone (the paywall) in each state (yearly, monthly, buying, an error, not on the App Store yet, loading, and Pro already),
// and Settings' plan for Pro bought on the web (no Manage plan or Cancel Pro).
PROP_SETS.push({ state: 'Yearly' }, { state: 'Monthly' }, { state: 'Buying' }, { state: 'Error' }, { state: 'Not yet' }, { state: 'Offline' }, { state: 'Loading' }, { state: 'Pro' },
  { state: 'Monthly', dark: true }, { state: 'Not yet', dark: true, dim: true }, { state: 'Pro', dark: true }, { state: 'Error', $state: { pick: 'monthly' } },
  { plan: 'Pro, billed on the web' }, { plan: 'Pro, billed on the web', dark: true });
// Settings' Daily reminder on iPhone: Off, a time, and the line that says how to allow notifications when the phone has them off.
PROP_SETS.push({ reminder: 'Off' }, { reminder: '6:00 PM' }, { reminder: 'Off', dark: true }, { reminderNote: true }, { reminderNote: true, dark: true }, { reminderNote: true, dark: true, dim: true });
// The web sidebar as the rail of icons (the Library's collapsed Tweak; the mock gives every board with a sidebar the same).
PROP_SETS.push({ collapsed: true }, { collapsed: true, dark: true }, { collapsed: true, caughtUp: true });
// The Library's top: with assignments, and with nothing due.
PROP_SETS.push({ assignments: true }, { assignments: true, caughtUp: true, dark: true });
// Settings' sections: the web page shows one at a time (WebSettings' section), the iPhone's list shows all of them (PhoneSettings, All),
// and a narrow web screen shows the list of sections (List) or one of them.
for (const name of ['Account', 'Plan', 'Studying', 'Appearance', 'Connect AI', 'Privacy', 'Help & legal']) PROP_SETS.push({ section: name }, { section: name, dark: true, dim: true }, { section: name, plan: 'Free' });
PROP_SETS.push({ section: 'All' }, { section: 'List' }, { section: 'List', dark: true }, { section: 'Account', verified: 'Teacher', passwordOpen: true }, { section: 'Account', deleteOpen: 'Asking' }, { section: 'Privacy', noBlocks: true },
  { section: 'Plan', plan: 'Pro, billed by Apple' }, { section: 'Plan', plan: 'Pro, billed on the web' }, { section: 'Plan', plan: 'Pro, ending' }, { section: 'Studying', tune: 'Not enough reviews', reminder: 'Off', reminderNote: true }, { section: 'Studying', tune: 'Tuning' },
  { section: 'All', reminder: 'Off', reminderNote: true }, { section: 'Appearance', photo: 'Your photo', theme: 'aero' });
// A verified teacher's or school's shared deck page (Check this deck, pressing it, one being pressed, on their own deck,
// signed out), and your verification in Settings.
PROP_SETS.push({ verified: 'Teacher' }, { verified: 'School' }, { verified: 'Teacher', $state: { $m: { checked: true } } }, { verified: 'Teacher', $state: { busy: 'check', error: 'That didn’t save.' } },
  { verified: 'Teacher', owner: true }, { verified: 'Teacher', signedOut: true }, { verified: 'Waiting for review' }, { verified: 'Teacher', $state: { checkedAt: 14 } }, { verified: 'Teacher', dark: true });

// School labels: Discover narrowed (each filter, together, searching, the pickers open with what's typed in them, a search nobody
// matches, someone with no school), Edit profile (the school picker open, a high school level, a school typed as Other), and a public deck's
// labels with each picker open.
PROP_SETS.push({ level: 'College' }, { subject: 'Biology' }, { school: 'Stanford University' }, { level: 'College', subject: 'Biology', school: 'University of California-Davis' },
  { level: 'Graduate', subject: 'Law' }, { level: 'Other' }, { q: 'bio', level: 'College' }, { q: 'bio', subject: 'Biology', school: 'Stanford University' }, { level: 'College', loading: true }, { level: 'College', signedOut: true },
  { pick: 'Level' }, { pick: 'Subject' }, { pick: 'School' }, { pick: 'School', pickQ: 'davis' }, { pick: 'School', pickQ: 'zzzz' }, { pick: 'School', pickQ: 'my own college' }, { mySchool: false }, { level: 'College', pick: 'Level', dark: true },
  { editOpen: true, pick: 'School' }, { editOpen: true, pick: 'School', pickQ: 'stan' }, { editOpen: true, pick: 'School', pickQ: 'my own college' }, { editOpen: true, dark: true },
  { editOpen: true, $state: { draft: { level: 'highschool', school: '', schoolId: '', year: '2', showSchool: true } } }, { editOpen: true, $state: { draft: { school: 'Small Town College', schoolId: '', showSchool: false } } },
  { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing' }, { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing', pick: 'Level' }, { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing', pick: 'Subject' },
  { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing', pick: 'School', pickQ: 'stan' }, { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing', pick: 'School', pickQ: 'my own college' },
  { shared: 'Link only', settingsOpen: true, settingsTab: 'Sharing' }, { shared: 'Public', settingsOpen: true, settingsTab: 'Sharing', dark: true, pick: 'School', pickQ: 'stan' });

// The practice test: each state the canvas can show (set up; each kind of question; its Submit and Leave questions; the results, all
// of them or the ones missed), with and without the timer, in dark and gray, the question list open on a phone, the results with an
// explanation open and a written answer counted, the set-up on other choices and over a folder.
PROP_SETS.push({ screen: 'Set up' }, { screen: 'Multiple choice' }, { screen: 'True or false' }, { screen: 'Fill in the blank' }, { screen: 'Written' }, { screen: 'Matching' }, { screen: 'Submit' }, { screen: 'Leave' },
  { screen: 'Results' }, { screen: 'Results · missed' }, { screen: 'Multiple choice', timed: false }, { screen: 'Matching', dark: true, dim: true }, { screen: 'Results', dark: true }, { screen: 'Submit', dark: true },
  { screen: 'Multiple choice', $state: { sheet: true } }, { screen: 'Results', $state: { exOpen: { 3: true }, exOn: { 3: true } } }, { screen: 'Results', $state: { counted: { 18: true } } },
  { screen: 'Set up', $state: { kinds: ['mc'], count: 10, limit: 20 } }, { screen: 'Set up', folderId: 'f1' }, { screen: 'Set up', dark: true, dim: true }, { screen: 'Written', $state: { m: { type: '' } } },
  { screen: 'Matching', $state: { m: { match: { 0: 1, 1: 3, 2: 4, 3: 0, 4: 2 } } } });

// The questions that ask before a delete (Lucida's own dialog, design/ui.mjs): each one open, light, dark and gray.
for (const ask of Object.keys(ASK_SAMPLES)) PROP_SETS.push({ ask }, { ask, dark: true }, { ask, dark: true, dim: true });
// Settings' lists (Lucida's own dropdown, a sheet on the iPhone): each one open.
for (const dropdown of ['Daily reminder', 'New cards a day', 'Remember goal']) PROP_SETS.push({ dropdown, section: 'Studying' }, { dropdown, section: 'Studying', dark: true, dim: true });
// Lucida's own calendar (a deck's exam date, a class's due date), open, light and dark.
PROP_SETS.push({ calendar: 'Exam date', settingsOpen: true, settingsTab: 'Studying' }, { calendar: 'Exam date', settingsOpen: true, settingsTab: 'Studying', dark: true }, { calendar: 'Exam date', settingsOpen: true, settingsTab: 'Studying', free: true },
  { calendar: 'Due date', panel: 'Assign' }, { calendar: 'Due date', panel: 'Assign', dark: true });
// Import cards on the iPhone (PhoneImport's state Tweak, build.mjs IMPORT_STATES): each state, light and dark.
for (const state of ['Deck chosen', 'Empty', 'Pasted', 'A file picked', 'No cards', 'Importing', 'Error']) PROP_SETS.push({ state }, { state, dark: true });
// Making cards: every step the Make boards offer, light and dark.
for (const step of MAKE_STEPS) PROP_SETS.push({ step }, { step, dark: true });
// The deck page's Cards, Notes (the Guide) and Sources sections, each with the Guide and Sources in every state (and dark).
for (const guide of GUIDE_STATES) PROP_SETS.push({ guide }, { guide, dark: true }, { guide, section: 'Notes' }, { guide, section: 'Notes', dark: true }, { guide, section: 'Diagrams' }, { guide, section: 'Diagrams', dark: true }, { guide, section: 'Sources' }, { guide, section: 'Sources', dark: true });
// The Guide's editor: writing, previewing, older versions, a new page, nothing written yet (and dark).
for (const view of GUIDE_VIEWS) PROP_SETS.push({ view }, { view, dark: true });
for (const liveFrom of LIVE_FROM) PROP_SETS.push({ liveFrom }, { liveFrom, dark: true });
for (const topicState of LIVE_TOPIC_STATES) PROP_SETS.push({ topicState });
// A card made from a source says so in the editor (and the deck page's source opens where the card points).
PROP_SETS.push({ madeFrom: false }, { madeFrom: true, dark: true }, { guide: 'A source open', sourceAt: 'p. 4' }, { guide: 'A source open', sourceAt: 'p. 4', section: 'Sources' });

function walk(str, sc, miss) {
  let i = 0;
  const check = chunk => {
    for (const m of chunk.matchAll(/(on[A-Z][a-zA-Z]*)="\{\{\s*([^}]+?)\s*\}\}"/g)) {
      if (typeof get(sc, m[2]) !== 'function') miss.add(`handler ${m[1]}={{${m[2]}}}`);
    }
    for (const m of chunk.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      const p = m[1];
      if (p === 'true' || p === 'false') continue;
      if (get(sc, p) === undefined) miss.add(`{{${p}}}`);
    }
  };
  for (;;) {
    const re = /<sc-(if|for)\b/g; re.lastIndex = i; const hit = re.exec(str);
    if (!hit) { check(str.slice(i)); return; }
    check(str.slice(i, hit.index));
    const tag = hit[1], k = str.indexOf('>', hit.index), open = str.slice(hit.index, k + 1);
    const cre = new RegExp(`<sc-${tag}\\b|</sc-${tag}>`, 'g'); cre.lastIndex = k + 1; let depth = 1, close;
    while (depth) { close = cre.exec(str); if (!close) { miss.add(`unclosed sc-${tag}`); return; } depth += close[0].startsWith('</') ? -1 : 1; }
    const inner = str.slice(k + 1, close.index);
    if (tag === 'if') {
      const p = open.match(/value="\{\{([^}]+)\}\}"/)[1].trim();
      const v = get(sc, p); if (v === undefined) miss.add(`if {{${p}}}`);
      if (v) walk(inner, sc, miss);
    } else {
      const p = open.match(/list="\{\{([^}]+)\}\}"/)[1].trim(), as = open.match(/as="(\w+)"/)[1];
      const list = get(sc, p);
      if (!Array.isArray(list)) miss.add(`for {{${p}}} is not a list`);
      else list.forEach(it => walk(inner, { ...sc, [as]: it }, miss));
    }
    i = close.index + close[0].length;
  }
}

function balance(body) {
  const stack = [], errs = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
    const [, closing, name, self] = m; const n = name.toLowerCase();
    if (self || VOID.has(n)) continue;
    if (!closing) stack.push(n);
    else if (stack[stack.length - 1] === n) stack.pop();
    else { errs.push(`</${n}> but open <${stack[stack.length - 1]}>`); break; }
  }
  if (stack.length && !errs.length) errs.push('unclosed: ' + stack.slice(-3).join(','));
  return errs;
}

let bad = 0;
for (const f of readdirSync(DIR).filter(f => f.endsWith('.dc.html')).sort()) {
  const src = readBoard(DIR, f);
  const errs = [];
  let props;
  try { props = JSON.parse(src.match(/data-props='([^']*)'/)[1]); } catch (e) { errs.push('props JSON: ' + e.message); }
  const body = src.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  errs.push(...balance(body));
  // Nothing the browser draws itself (a confirm, an alert, a select, a date picker, a checkbox, a player, a tooltip): design/check-own-ui.mjs.
  errs.push(...webProblems(src).map(w => 'uses ' + w));
  const js = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  let C;
  try { C = new Function('DCLogic', js + ';return Component')(class { constructor(p) { this.props = p || {}; this.state = {}; } setState(u) { this.state = { ...this.state, ...u }; } }); } catch (e) { errs.push('class: ' + e.message); }
  const defaults = Object.fromEntries(Object.entries(props || {}).filter(([k]) => k !== '$preview').map(([k, v]) => [k, v.default]));
  const miss = new Set();
  if (C) for (const extra of PROP_SETS) {
    try { const { $state, ...pp } = extra; const c = new C({ ...defaults, ...pp }); if ($state) c.state = { ...c.state, ...$state }; walk(body, c.renderVals(), miss); } catch (e) { errs.push(`renderVals ${JSON.stringify(extra)}: ${e.message}`); break; }
  }
  // The site's boards draw a page chosen by the `page` prop (a picker of every page): check each page, on the site (props.site) and
  // on the canvas, in light and in dark.
  const pickable = props && props.page && Array.isArray(props.page.options) && /^Site/.test(f) ? props.page.options : [];
  if (C) for (const pg of pickable) for (const extra of [{}, { dark: true }, { site: true }]) {
    try { const c = new C({ ...defaults, page: pg, ...extra }); walk(body, c.renderVals(), miss); } catch (e) { errs.push(`renderVals page ${pg} ${JSON.stringify(extra)}: ${e.message}`); break; }
  }
  // Wrapper boards: {{yes}} lives in their own logic; dc-import attributes are fine.
  errs.push(...miss);
  if (errs.length) { bad++; console.log(f, '\n  ' + errs.join('\n  ')); }
}
console.log(bad ? `${bad} boards with problems` : 'all boards clean');
