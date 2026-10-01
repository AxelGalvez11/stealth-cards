// Static check for every board: props JSON parses, logic runs under several prop sets,
// every {{hole}} resolves (handlers to functions), sc-for lists are arrays, and tags balance.
import { readFileSync, readdirSync } from 'node:fs';

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
  { someoneElse: true, openVersion: 14 }, { openVersion: 12, confirmVersion: 12 }, { openVersion: 9 }
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
// A verified teacher's or school's shared deck page (Check this deck, pressing it, one being pressed, on their own deck,
// signed out), and your verification in Settings.
PROP_SETS.push({ verified: 'Teacher' }, { verified: 'School' }, { verified: 'Teacher', $state: { $m: { checked: true } } }, { verified: 'Teacher', $state: { busy: 'check', error: 'That didn’t save.' } },
  { verified: 'Teacher', owner: true }, { verified: 'Teacher', signedOut: true }, { verified: 'Waiting for review' }, { verified: 'Teacher', $state: { checkedAt: 14 } }, { verified: 'Teacher', dark: true });

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
  const src = readFileSync(new URL(f, DIR), 'utf8');
  const errs = [];
  let props;
  try { props = JSON.parse(src.match(/data-props='([^']*)'/)[1]); } catch (e) { errs.push('props JSON: ' + e.message); }
  const body = src.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  errs.push(...balance(body));
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
