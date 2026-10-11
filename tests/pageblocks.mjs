// The Note page's blocks: guide.js's new Markdown (callouts, chains, a card or a page shown in a note) and web/pageblocks.js (a Page's JSON <-> Markdown).
//   node tests/pageblocks.mjs            (prints each failure, then "pageblocks: N passed, M failed"; exits 1 on a failure)
import guide from '../web/guide.js';
import * as PB from '../web/pageblocks.js';

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
}
const J = x => JSON.stringify(x);
const noIds = x => JSON.parse(JSON.stringify(x, (k, v) => (k === 'id' ? undefined : v)));
// guide.js's own rule: blocks(markdown(list)) is list again, and markdown(blocks(md)) reads back as the same blocks
const stable = md => { const b = guide.blocks(md), m = guide.markdown(b); return J(guide.blocks(m)) === J(b) && guide.markdown(guide.blocks(m)) === m; };

// ---------- guide.js: the new syntax ----------
{
  const t = guide.parse(':::trap Watch *out*\nGlycolysis is in the **cytoplasm**.\n:::');
  check('callout parses', t.length === 1 && t[0].t === 'callout' && t[0].style === 'trap' && t[0].inline[0].v === 'Watch ' && t[0].blocks[0].t === 'p', t);
  for (const s of ['trap', 'pearl', 'mnemonic', 'note']) check('callout ' + s, guide.parse(':::' + s + '\nx\n:::')[0].style === s);
  check('callout word is case-insensitive', guide.parse(':::Pearl\nx\n:::')[0].style === 'pearl');
  check('callout with no title', J(guide.parse(':::note\nx\n:::')[0].inline) === '[]');
  check('callout needs a space after its word', guide.parse(':::trapdoor\nx\n:::')[0].t === 'p');
  check('two colons are not a callout', guide.parse('::trap\nx')[0].t === 'p');
  check('callout never closed ends at the page end', (t2 => t2.length === 1 && t2[0].t === 'callout' && t2[0].blocks.length === 2)(guide.parse(':::mnemonic\na\n\nb')));
  check('callout nests and closes innermost', J(guide.parse(':::trap\n:::pearl\nin\n:::\nmid\n:::\nout').map(b => b.t)) === J(['callout', 'p']));
  check('callout in a list item', guide.parse('- a\n  :::pearl\n  x\n  :::')[0].items[0].blocks[1].t === 'callout');
  check('callout in a quote', guide.parse('> :::note\n> x\n> :::')[0].blocks[0].t === 'callout');
  check('fenced code inside a callout keeps its :::', (t2 => t2[0].blocks[0].t === 'code' && t2[0].blocks[0].text === ':::')(guide.parse(':::trap\n```\n:::\n```\n:::')));
  let deep = ''; for (let i = 0; i < 20; i++) deep += ':::note\n'; deep += 'x';
  let depth = 0; for (let b = guide.parse(deep)[0]; b && b.t === 'callout'; b = b.blocks[0]) depth++;
  check('callouts nest at most 12 deep, like toggles', depth === 12, depth);

  const c = guide.parse(':::chain\nGlycolysis\n\n  Pyruvate  \n*Krebs*\n:::\nafter');
  check('chain parses, empty lines left out', c[0].t === 'chain' && c[0].steps.length === 3 && c[0].steps[2][0].t === 'i' && c[1].t === 'p', c);
  check('a chain has at most 12 steps', guide.parse(':::chain\n' + Array.from({ length: 30 }, (_, i) => 's' + i).join('\n') + '\n:::')[0].steps.length === 12);
  check('chain with words after its word is text', guide.parse(':::chain x\na\n:::')[0].t === 'p');
  check('chain lines are never blocks', guide.parse(':::chain\n# a\n- b\n:::')[0].steps.map(s => s[0].v).join('|') === '# a|- b');
  check('a chain inside a toggle closes first', J(guide.parse(':::toggle T\n:::chain\na\n:::\nin\n:::\nout').map(b => b.t)) === J(['toggle', 'p']));
  check('an empty chain', J(guide.parse(':::chain\n:::')) === J([{ t: 'chain', steps: [] }]));

  check('card ref', J(guide.parse('::card abc_1-X')) === J([{ t: 'card', id: 'abc_1-X' }]));
  check('page ref', J(guide.parse('   ::page P2  ')) === J([{ t: 'page', id: 'P2' }]));
  for (const bad of ['::card', '::card a b', '::card a/b', '::card ' + 'x'.repeat(41), ':::card a', '::cards a', '::card <a>', '::card "a"', 'x ::card a'])
    check('malformed ref stays text: ' + bad, guide.parse(bad).every(b => b.t === 'p'), guide.parse(bad));
  check('a ref interrupts a paragraph', J(guide.parse('words\n::card a').map(b => b.t)) === J(['p', 'card']));
}

// ---------- render: safe by construction ----------
{
  const h = guide.render(':::trap Watch\nx\n:::\n\n:::chain\na\nb\n:::\n\n::card c1\n\n::page p1');
  check('callout html', h.includes('<aside class="gd-co gd-co-trap"><span class="gd-co-l">Trap</span><p class="gd-co-t">Watch</p><p>x</p></aside>'), h);
  check('chain html', h.includes('<div class="gd-ch"><span>a</span><span class="gd-ch-a" aria-hidden="true">→</span><span>b</span></div>'), h);
  check('refs html', h.includes('<div class="gd-ref" data-card="c1"></div><div class="gd-ref" data-page="p1"></div>'), h);
  const evil = guide.render(':::trap <script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>\nbody\n:::\n\n:::chain\n[go](javascript:alert(1))\n<b onmouseover=alert(1)>hi</b>\n[ok](https://x.com/" onclick="a)\n:::\n\n::card a"onclick=x\n\n::page <script>');
  check('no script tag', !/<script/i.test(evil), evil);
  check('no javascript: link', !/href="javascript/i.test(evil) && !/javascript:/i.test(evil.replace(/\[[^\]]*\]\(javascript:alert\(1\)\)/g, '')), evil);
  check('no event attribute', !/<[^>]+\son\w+=/i.test(evil), evil);
  check('no raw <b> or <img>', !/<b\s|<img/i.test(evil), evil);
  check('bad ids are words', !/data-card|data-page/.test(evil), evil);
  // only the allowed tags and classes
  const tags = new Set([...evil.matchAll(/<\/?([a-z0-9]+)/gi)].map(m => m[1].toLowerCase()));
  check('only allowed tags', [...tags].every(t => ['div', 'p', 'aside', 'span', 'a', 'em', 'strong', 'del', 'code', 'br'].includes(t)), [...tags]);
  check('a tricky style word is a note', guide.render(':::note x').includes('gd-co-note'));
  check('plain of callout and chain', guide.plain(':::pearl Key\nbody\n:::\n\n:::chain\na\n**b**\n:::\n\n::card x') === 'Key\nbody\na → b');
  check('headings inside a callout', J(guide.headings(':::trap\n## Inside\n:::').map(x => x.text)) === J(['Inside']));
}

// ---------- the editor's blocks ----------
{
  const md = ':::trap Watch *out*\nGlycolysis is in the **cytoplasm**.\n\n- a\n- b\n:::\n\n:::chain\nGlycolysis\nPyruvate\n*Krebs*\n:::\n\n::card abc_1\n\n::page P-2\n\n:::pearl\n:::\n\n:::chain\n:::\n';
  const b = guide.blocks(md);
  check('blocks kinds', J(b.map(x => x.k + x.d)) === J(['callout0', 'p1', 'ul1', 'ul1', 'chain0', 'card0', 'page0', 'callout0', 'chain0']), b.map(x => x.k + x.d));
  check('callout block has its style', b[0].style === 'trap' && b[7].style === 'pearl');
  check('chain block is one line with arrows', b[4].r.map(r => r.t).join('') === 'Glycolysis → Pyruvate → Krebs' && b[4].r[1].i === true, b[4]);
  check('ref blocks', b[5].ref === 'abc_1' && b[6].ref === 'P-2');
  check('markdown writes it back exactly', guide.markdown(b) === md.replace('Glycolysis\nPyruvate', 'Glycolysis\nPyruvate'), guide.markdown(b));
  check('blocks(markdown(blocks)) is the same', J(guide.blocks(guide.markdown(b))) === J(b));
  const typed = guide.markdown([{ k: 'chain', d: 0, r: [{ t: 'a->b→ c →  → :::' }] }, { k: 'card', d: 0, ref: 'bad id' }, { k: 'page', d: 0, ref: 'ok' }, { k: 'callout', d: 0, style: 'evil', r: [{ t: 'x\ny' }] }]);
  check('markdown: chain steps split at →, empty ones out, ::: escaped; a bad ref left out; an unknown style a note', typed === ':::chain\na->b\nc\n\\:::\n:::\n\n::page ok\n\n:::note x y\n:::\n', typed);
  check('a callout holds what follows', guide.markdown([{ k: 'callout', d: 0, style: 'pearl', r: [] }, { k: 'p', d: 1, r: [{ t: 'in' }] }, { k: 'p', d: 0, r: [{ t: 'out' }] }]) === ':::pearl\nin\n:::\n\nout\n');
  for (const m of [':::trap\nx\n:::', ':::chain\na\n:::', '::card a', '- x\n  :::note T\n  - y\n  :::\n- z', '> :::pearl\n> a\n> :::', ':::toggle A\n:::mnemonic M\n:::chain\na\nb\n:::\n:::\n:::'])
    check('stable round trip: ' + J(m), stable(m), guide.markdown(guide.blocks(m)));
  // random pages of the new blocks with the old ones, read and written back
  const bits = [':::trap T', ':::pearl', ':::mnemonic **M**', ':::note', ':::chain', ':::toggle X', ':::', '::card c1', '::page p_2', '- item', '1. one', '- [ ] todo', '> quote', '# Head', 'words *em*', '', '```', 'a → b', '| a | b |\n| --- | --- |', '---', '![p](/media/a-1.png)'];
  let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  let bad = 0, first = '';
  for (let k = 0; k < 400; k++) {
    const m = Array.from({ length: 2 + rnd(12) }, () => (rnd(4) ? '' : '  ') + bits[rnd(bits.length)]).join('\n');
    if (!stable(m)) { bad++; if (!first) first = m; }
  }
  check('400 random pages round-trip', bad === 0, first);
  check('the engine hid no errors', guide.errors === 0, guide.errors);
}

// ---------- pageblocks: every type, JSON -> Markdown -> JSON ----------
const ALL = [
  { type: 'heading', level: 1, text: 'Cellular **respiration**' }, { type: 'heading', level: 2, text: 'Two' }, { type: 'heading', level: 3, text: 'Three' },
  { type: 'text', text: 'Cells turn glucose into ATP. See [this](https://x.com/a "t") and `code` ~~old~~.' }, { type: 'text', text: '' },
  { type: 'quote', text: 'to be\nor not' },
  { type: 'list', style: 'bullet', items: [{ text: 'a', items: [{ text: 'a1', items: [{ text: 'a1x' }] }] }, { text: '**b**' }] },
  { type: 'list', style: 'number', items: [{ text: 'one' }, { text: 'two', items: [{ text: 'two.1' }] }] },
  { type: 'list', style: 'todo', items: [{ text: 'done', checked: true }, { text: 'not', checked: false, items: [{ text: 'sub', checked: true }] }] },
  { type: 'callout', style: 'trap', text: 'Glycolysis is in the cytoplasm.\n\n- no oxygen\n- 2 ATP' },
  { type: 'callout', style: 'pearl', title: 'Key *idea*', text: 'O₂ is the last acceptor.' },
  { type: 'callout', style: 'mnemonic', text: '“Can I Keep Selling Seashells”' }, { type: 'callout', style: 'note', title: 'Empty', text: '' },
  { type: 'toggle', title: 'Why?', blocks: [{ type: 'text', text: 'Because.' }, { type: 'toggle', title: 'Deeper', blocks: [{ type: 'chain', steps: ['x', 'y'] }] }, { type: 'card', cardId: 'c9' }] },
  { type: 'table', header: ['Stage', 'Where'], rows: [['Glycolysis', 'Cytoplasm'], ['a|b', '`c|d`'], ['', '**x**']] },
  { type: 'chain', steps: ['Glycolysis', 'Pyruvate', '*Krebs* cycle'] }, { type: 'chain', steps: [] },
  { type: 'code', lang: 'js', text: 'let a = 1;\n```\n:::' }, { type: 'code', lang: '', text: '' },
  { type: 'image', src: '/media/a-1.png', alt: 'A *pic* [x]' }, { type: 'image', src: 'https://e.com/a (1).png', alt: '' },
  { type: 'divider' }, { type: 'card', cardId: 'c_123' }, { type: 'embed', pageId: 'p-9' }
];
{
  const n = PB.normalizeNote({ blocks: ALL });
  check('every type is kept', J(n.blocks.map(b => b.type)) === J(ALL.map(b => b.type)), n.blocks.map(b => b.type));
  check('no warnings for good blocks', !n.warnings, n.warnings);
  check('NOTE_BLOCK_TYPES', J(PB.NOTE_BLOCK_TYPES) === J(['heading', 'text', 'quote', 'list', 'callout', 'toggle', 'table', 'chain', 'code', 'image', 'divider', 'card', 'embed']));
  const md = PB.noteToMarkdown(n);
  const back = PB.markdownToNote(md);
  check('JSON -> Markdown -> JSON is the same (all types)', J(noIds(back.blocks)) === J(noIds(n.blocks)), { md, back: noIds(back.blocks) });
  for (let i = 0; i < n.blocks.length; i++) {
    const one = { blocks: [n.blocks[i]] }, b1 = PB.markdownToNote(PB.noteToMarkdown(one));
    check('round trip: ' + n.blocks[i].type + ' #' + i, J(noIds(b1.blocks)) === J(noIds(one.blocks)), { md: PB.noteToMarkdown(one), got: noIds(b1.blocks), want: noIds(one.blocks) });
  }
  check('Markdown -> JSON -> Markdown is the same', PB.noteToMarkdown(PB.markdownToNote(md)) === md);
  check('normalizing twice changes nothing', J(PB.normalizeNote(n)) === J(n));
  const kept = PB.markdownToNote(md, n);
  check('with the previous note, unchanged blocks keep their ids', J(kept.blocks) === J(n.blocks));
  const edited = md.replace('Two', 'Two and a half');
  const k2 = PB.markdownToNote(edited, n);
  check('a changed block gets a new id, the others keep theirs', k2.blocks[1].id !== n.blocks[1].id && k2.blocks[0].id === n.blocks[0].id && k2.blocks[2].id === n.blocks[2].id && k2.blocks.slice(3).every((b, i) => b.id === n.blocks[i + 3].id));
  const tog = n.blocks.find(b => b.type === 'toggle');
  check('nested blocks have ids', tog.blocks.every(b => /^b[0-9a-z]{8}$/.test(b.id)) && n.blocks.every(b => /^b[0-9a-z]{8}$/.test(b.id)));
  const ids = []; const walk = l => l.forEach(b => { ids.push(b.id); if (b.blocks) walk(b.blocks); }); walk(n.blocks);
  check('ids are unique', new Set(ids).size === ids.length);
  check('blockMarkdown of a callout', PB.blockMarkdown(n, n.blocks[9].id) === ':::trap\nGlycolysis is in the cytoplasm.\n\n- no oxygen\n- 2 ATP\n:::\n', PB.blockMarkdown(n, n.blocks[9].id));
  check('blockMarkdown of a nested block', PB.blockMarkdown(n, tog.blocks[0].id) === 'Because.\n');
  check('blockMarkdown of nothing', PB.blockMarkdown(n, 'nope') === '' && PB.blockMarkdown(null, 'x') === '');
  check('Markdown input and { markdown } give the same', J(noIds(PB.normalizeNote(md).blocks)) === J(noIds(PB.normalizeNote({ markdown: md }).blocks)));
}

// ---------- pageblocks: what is given is cleaned ----------
{
  const given = PB.normalizeNote({ blocks: [
    { id: 'keep_me', type: 'text', text: '  hi  ' }, { id: 'keep_me', type: 'text', text: 'dup' }, { id: 'bad id!', type: 'divider' },
    { type: 'nope', text: 'x' }, null, 'str', { type: 'heading', level: 9, text: 'h\nx' }, { type: 'list', style: 'weird', items: [{ text: 'a', checked: true }] },
    { type: 'callout', style: 'danger', text: 'x' }, { type: 'card', cardId: 'a b' }, { type: 'embed', pageId: '../x' }, { type: 'image', src: 'javascript:alert(1)', alt: 'x' },
    { type: 'image', src: '//evil.com/x.png' }, { type: 'chain', steps: ['a → b', '', 'c', ...Array(20).fill('s')] }, { type: 'code', lang: 'bad lang!', text: 'x' },
    { type: 'table', header: ['a'], rows: [['1', '2', '3'], 'notarow'] }, { type: 'text', text: 'one\n\ntwo\n\n- three' },
    { type: 'list', style: 'bullet', items: [{ text: 'x' }] }, { type: 'list', style: 'bullet', items: [{ text: 'y' }] }
  ] });
  const b = given.blocks;
  check('a good id is kept', b[0].id === 'keep_me' && b[0].text === 'hi');
  check('a repeated id is replaced', b[1].id !== 'keep_me' && /^b[0-9a-z]{8}$/.test(b[1].id));
  check('a bad id is replaced', /^b[0-9a-z]{8}$/.test(b[2].id));
  check('unknown types and non-objects are dropped, with warnings', !b.some(x => x.type === 'nope') && given.warnings.some(w => /unknown type/.test(w)), given.warnings);
  check('heading level clamped, one line', b[3].type === 'heading' && b[3].level === 3 && b[3].text === 'h x', b[3]);
  check('unknown list style is bullet, checked dropped', b[4].style === 'bullet' && !('checked' in b[4].items[0]), b[4]);
  check('unknown callout style is note', b[5].style === 'note');
  check('bad card/page ids and bad pictures dropped', !b.some(x => x.type === 'card' || x.type === 'embed' || x.type === 'image'), b.map(x => x.type));
  const ch = b.find(x => x.type === 'chain');
  check('chain: arrows split, empty out, at most 12', ch.steps.length === 12 && ch.steps[0] === 'a' && ch.steps[1] === 'b' && ch.steps[2] === 'c', ch.steps);
  check('bad code language is none', b.find(x => x.type === 'code').lang === '');
  const tb = b.find(x => x.type === 'table');
  check('table rows fit the header', J(tb.rows) === J([['1']]), tb.rows);
  const i2 = b.findIndex(x => x.type === 'text' && x.text === 'one');
  check('a text of several blocks becomes them', i2 > 0 && b[i2 + 1].text === 'two' && b[i2 + 2].type === 'list' && b[i2 + 2].items.length === 3, b.slice(i2));
  check('lists of one style side by side are one', b[b.length - 1].type === 'list' && b[b.length - 1].items.length === 3 && b[b.length - 1].items[1].text === 'x', b[b.length - 1]);
  for (const bad of [undefined, null, 5, [], {}, { blocks: 'x' }, { markdown: 5 }, () => 1])
    check('bad input gives no blocks: ' + String(J(bad)), J(PB.normalizeNote(bad).blocks) === '[]');
  check('a string is Markdown', PB.normalizeNote('# Hi').blocks[0].type === 'heading');
  const cyc = { type: 'toggle', title: 't', blocks: [] }; cyc.blocks.push(cyc);
  check('a block that holds itself does not hang or throw', Array.isArray(PB.normalizeNote({ blocks: [cyc] }).blocks));
}

// ---------- pageblocks: limits ----------
{
  const many = PB.normalizeNote({ blocks: Array.from({ length: 2500 }, (_, i) => ({ type: 'text', text: 't' + i })) });
  check('at most 2000 blocks', many.blocks.length === 2000 && many.warnings && many.warnings.some(w => /2000/.test(w)), many.blocks.length);
  const big = PB.normalizeNote({ blocks: Array.from({ length: 30 }, () => ({ type: 'code', lang: '', text: 'x'.repeat(10000) })) });
  const chars = big.blocks.reduce((n, b) => n + b.text.length, 0);
  check('at most 200,000 characters', chars <= 200000 && big.blocks.length === 20 && !!big.warnings, chars);
  check('a long string is cut', PB.normalizeNote({ blocks: [{ type: 'text', text: 'y'.repeat(50000) }] }).blocks[0].text.length === 20000);
  let deep = { type: 'toggle', title: 'L0', blocks: [] }, at = deep;
  for (let i = 1; i < 10; i++) { const t = { type: 'toggle', title: 'L' + i, blocks: [{ type: 'text', text: 'in' + i }] }; at.blocks.push(t); at = t; }
  const d = PB.normalizeNote({ blocks: [deep] });
  let lv = 0; for (let b = d.blocks[0]; b && b.type === 'toggle'; b = b.blocks.find(x => x.type === 'toggle')) lv++;
  check('toggles nest at most 6 deep', lv === 6 && !!d.warnings, lv);
  check('what a too-deep toggle held is kept', J(d).includes('in9') && J(d).includes('L9'));
  const listDeep = { text: 'a' }; let li = listDeep; for (let i = 0; i < 20; i++) { li.items = [{ text: 'n' + i }]; li = li.items[0]; }
  let ld = 0; for (let x = PB.normalizeNote({ blocks: [{ type: 'list', style: 'bullet', items: [listDeep] }] }).blocks[0].items[0]; x; x = x.items && x.items[0]) ld++;
  check('list items nest at most 8 deep', ld === 8, ld);
  // speed: a page at the limits is read and written quickly
  const t0 = Date.now();
  const full = PB.normalizeNote({ blocks: Array.from({ length: 2000 }, (_, i) => ({ type: i % 3 ? 'text' : 'callout', style: 'pearl', text: 'Some **words** here ' + i })) });
  PB.markdownToNote(PB.noteToMarkdown(full), full);
  check('2000 blocks in under 5 seconds', Date.now() - t0 < 5000, Date.now() - t0);
}

// ---------- pageblocks: nothing unsafe gets through ----------
{
  const n = PB.normalizeNote({ blocks: [
    { type: 'text', text: '<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>' },
    { type: 'callout', style: 'trap', title: '[t](javascript:alert(1)) <b>', text: '<iframe src="https://evil"></iframe>' },
    { type: 'chain', steps: ['[go](javascript:alert(1))', '<script>x</script>'] },
    { type: 'table', header: ['<b>h</b>'], rows: [['[a](data:text/html,x)']] }
  ] });
  const html = guide.render(PB.noteToMarkdown(n));
  check('rendered page has no script, iframe, img, event attribute or javascript:/data: link', !/<script|<iframe|<img|<[^>]*\son\w+=|href="(?:javascript|data):/i.test(html), html);
  check('links that may not be links are words (only the bare https address is one)', [...html.matchAll(/<a href="([^"]*)"/g)].every(m => /^https:\/\//.test(m[1])), html);
}

// ---------- the file as JavaScriptCore would take it: the one function, given guide.js's makeGuide() ----------
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../web/pageblocks.js', import.meta.url), 'utf8'), gsrc = readFileSync(new URL('../web/guide.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('\nexport function makePageBlocks') + 8, src.indexOf('\nconst PB ='));
  const gfn = gsrc.slice(gsrc.indexOf('\nexport function makeGuide') + 8, gsrc.lastIndexOf('export default'));
  const pb = Function('return (' + fn.trim() + ')((' + gfn.trim() + ')());')();
  const md = PB.noteToMarkdown({ blocks: ALL });
  check('the bare function (no imports) gives the same answers', pb.noteToMarkdown({ blocks: ALL }) === md && J(noIds(pb.markdownToNote(md).blocks)) === J(noIds(PB.markdownToNote(md).blocks)));
}

console.log('pageblocks: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
