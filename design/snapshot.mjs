// Renders every board (with the canvas's sample data) so logic changes can be checked against how the canvas looked.
//   node design/snapshot.mjs save            save a snapshot of every board
//   node design/snapshot.mjs                 list boards that render differently from the snapshot
//   node design/snapshot.mjs against <dir>   list boards that look different from the boards in <dir>,
//                                            ignoring changes you can't see (new event hooks, empty values)
//   node design/snapshot.mjs html <Board> [props]   print one board's HTML
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HERE = new URL('./canvas/project/', import.meta.url);
const SNAP = new URL('./.snapshot.json', import.meta.url);
const SETS = [{}, { dark: true }, { startRevealed: true }, { grading: 'Check or X', startRevealed: true }, { grading: 'Piles', startRevealed: true },
  { settingsOpen: true }, { settingsOpen: true, settingsTab: 'Studying' }, { caughtUp: true }, { view: 'List' }, { cardType: 'Blank' }, { cardType: 'Image' }, { cardType: 'Audio' }];
const get = (o, p) => p.trim().split('.').reduce((a, k) => (a == null ? a : a[k]), o);

function loadBoards(dir) {
  const boards = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.dc.html'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const raw = JSON.parse(src.match(/data-props='([^']*)'/)[1]);
    const logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
    boards[f.replace('.dc.html', '')] = {
      template: src.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, ''),
      defaults: Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '$preview').map(([k, v]) => [k, v.default])),
      C: new Function('DCLogic', logic + ';return Component')(class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} })
    };
  }
  const fill = (s, sc) => s.replace(/\son[A-Z][a-zA-Z]*="\{\{[^}]+\}\}"/g, ' on').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    if (p === 'true') return 'true'; if (p === 'false') return '';
    const v = get(sc, p); return v == null || typeof v === 'function' ? '' : String(v);
  });
  const render = (str, sc) => {
    let out = '', i = 0;
    for (;;) {
      const re = /<(sc-if|sc-for|dc-import)\b/g; re.lastIndex = i; const hit = re.exec(str);
      if (!hit) return out + fill(str.slice(i), sc);
      out += fill(str.slice(i, hit.index), sc);
      const tag = hit[1], k = str.indexOf('>', hit.index), open = str.slice(hit.index, k + 1);
      const cre = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); cre.lastIndex = k + 1; let depth = 1, close;
      while (depth) { close = cre.exec(str); depth += close[0].startsWith('</') ? -1 : 1; }
      const inner = str.slice(k + 1, close.index);
      const hole = a => (open.match(new RegExp('\\s' + a + '="\\{\\{([^}]+)\\}\\}"')) || [])[1];
      if (tag === 'sc-if') { if (get(sc, hole('value'))) out += render(inner, sc); }
      else if (tag === 'sc-for') { const as = open.match(/\sas="(\w+)"/)[1]; (get(sc, hole('list')) || []).forEach(it => { out += render(inner, { ...sc, [as]: it }); }); }
      else {
        const b = boards[open.match(/\sname="([^"]+)"/)[1]], props = { ...b.defaults };
        for (const [, a, v] of open.matchAll(/\s([a-z][a-z0-9-]*)="([^"]*)"/g)) {
          if (a === 'name' || a.startsWith('hint-')) continue;
          const h = v.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
          props[a.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = h ? (h[1] === 'true' ? true : h[1] === 'false' ? false : get(sc, h[1])) : v;
        }
        out += render(b.template, new b.C(props).renderVals());
      }
      i = close.index + close[0].length;
    }
  };
  const one = (name, set) => { const b = boards[name]; try { return render(b.template, new b.C({ ...b.defaults, ...set }).renderVals()); } catch (e) { return 'ERROR ' + e.stack; } };
  const all = () => {
    const out = {};
    for (const [name, b] of Object.entries(boards)) for (const set of SETS) if (!Object.keys(set).some(k => !(k in b.defaults))) out[name + ' ' + JSON.stringify(set)] = one(name, set);
    return out;
  };
  return { one, all };
}
const hash = h => createHash('sha1').update(h).digest('hex').slice(0, 12);
// Changes you can't see: added event hooks, empty values, and an empty Today count.
// (Placeholders only show in empty fields, and the canvas fills its fields.)
const look = h => h.replace(/ on(?=[ >])/g, '').replace(/ value=""/g, '').replace(/ (placeholder|data-key)="[^"]*"/g, '')
  .replace(/<span style="margin-left: auto; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px;"><\/span>/g, '').replace(/\s+/g, ' ');

const [cmd, a1, a2] = process.argv.slice(2);
const here = loadBoards(HERE);
if (cmd === 'html') console.log((process.argv[5] ? loadBoards(new URL('file://' + process.argv[5].replace(/\/?$/, '/'))) : here).one(a1, JSON.parse(a2 || '{}')));
else if (cmd === 'save') { const now = Object.fromEntries(Object.entries(here.all()).map(([k, v]) => [k, hash(v)])); writeFileSync(SNAP, JSON.stringify(now, null, 1)); console.log('saved', Object.keys(now).length, 'renders'); }
else if (cmd === 'against') {
  const now = here.all(), old = loadBoards(new URL('file://' + a1.replace(/\/?$/, '/'))).all();
  const changed = Object.keys(now).filter(k => k in old && look(old[k]) !== look(now[k]));
  const added = Object.keys(now).filter(k => !(k in old));
  console.log(changed.length ? changed.length + ' renders look different:\n  ' + changed.join('\n  ') : 'all ' + Object.keys(now).filter(k => k in old).length + ' renders look the same');
  if (added.length) console.log('new: ' + added.join(', '));
} else {
  const old = existsSync(SNAP) ? JSON.parse(readFileSync(SNAP, 'utf8')) : {};
  const changed = Object.entries(here.all()).filter(([k, v]) => old[k] !== hash(v)).map(([k]) => k);
  console.log(changed.length ? changed.length + ' renders differ from the snapshot:\n  ' + changed.join('\n  ') : 'all renders match the snapshot');
}
