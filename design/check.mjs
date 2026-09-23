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
  { card: 'Audio' }, { card: 'Image', startRevealed: true }, { keyboard: true }, { keyboard: false }, { caughtUp: true }, { view: 'List' }, { photo: 'Google photo' }, { textStyles: true, keyboard: true }, { cardType: 'Blank' }, { cardType: 'Image' }, { cardType: 'Audio', keyboard: true }, { settingsOpen: true, settingsTab: 'Studying' },
  { openTags: true }, { moreTags: true }, { view: 'List', openTags: true }, { settingsOpen: true, tagPicker: true }, { tagPicker: true, keyboard: false },
  { $state: { moreOpen: true, moreQ: 'zz' } }, { $state: { tag: 'Must know' } }, { $state: { tagMenuOpen: true, tagQ: 'ex', filter: 'Organelles' } },
  { settingsOpen: true, $state: { dpOpen: true, dpQ: 'Pharm' } }, { $state: { cpOpen: true, cpQ: 'new tag' } }, { slashDemo: true }
];

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
  // Wrapper boards: {{yes}} lives in their own logic; dc-import attributes are fine.
  errs.push(...miss);
  if (errs.length) { bad++; console.log(f, '\n  ' + errs.join('\n  ')); }
}
console.log(bad ? `${bad} boards with problems` : 'all boards clean');
