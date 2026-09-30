// Draws a canvas board as plain HTML: the board's own template and logic, filled with its props, and no runtime.
// design/to-site.mjs (the site's pages) and design/og.mjs (the link-preview pictures) both use it.
import { readFileSync } from 'node:fs';

const SRC = new URL('./canvas/project/', import.meta.url);
const get = (o, p) => p.trim().split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// { css, html, logic } for a board with the given props on top of its defaults. The board's frame size becomes the
// page's width (its height follows the content).
export function board(name, props) {
  const src = readFileSync(new URL(name + '.dc.html', SRC), 'utf8');
  const raw = JSON.parse(src.match(/data-props='([^']*)'/)[1]);
  const defaults = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '$preview').map(([k, v]) => [k, v.default]));
  const logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  const C = new Function('DCLogic', logic + ';return Component')(class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} });
  const body = src.split('<x-dc>')[1].split('</x-dc>')[0];
  const css = (body.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
  const fill = (s, sc) => s.replace(/\s(on[A-Z][a-zA-Z]*|ref)="\{\{[^}]+\}\}"/g, '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    if (p === 'true') return 'true'; if (p === 'false') return '';
    const v = get(sc, p); return v == null || typeof v === 'function' ? '' : esc(v);
  });
  const render = (str, sc) => {
    let out = '', i = 0;
    for (;;) {
      const re = /<(sc-if|sc-for)\b/g; re.lastIndex = i; const hit = re.exec(str);
      if (!hit) return out + fill(str.slice(i), sc);
      out += fill(str.slice(i, hit.index), sc);
      const tag = hit[1], k = str.indexOf('>', hit.index), open = str.slice(hit.index, k + 1);
      const cre = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); cre.lastIndex = k + 1; let depth = 1, close;
      while (depth) { close = cre.exec(str); depth += close[0].startsWith('</') ? -1 : 1; }
      const inner = str.slice(k + 1, close.index), hole = a => (open.match(new RegExp('\\s' + a + '="\\{\\{([^}]+)\\}\\}"')) || [])[1];
      if (tag === 'sc-if') { if (get(sc, hole('value'))) out += render(inner, sc); }
      else { const as = open.match(/\sas="(\w+)"/)[1]; (get(sc, hole('list')) || []).forEach(it => { out += render(inner, { ...sc, [as]: it }); }); }
      i = close.index + close[0].length;
    }
  };
  const html = render(body.replace(/<helmet>[\s\S]*?<\/helmet>/, '').trim(), new C({ ...defaults, ...props }).renderVals());
  // The board's frame size becomes the page's width; its height follows the content.
  return { css, html: html.replace(/width: \d+px; height: \d+px;/, 'width: 100%;'), logic };
}
