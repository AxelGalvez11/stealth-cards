// How a table and a mind map are drawn (a deck's Diagrams). Pure: data in, text out, no page and no AI, so the web app, the canvas's boards (design/build.mjs puts this function in each
// board that draws one, as it does the Guide's) and the checks all draw the same thing. The iPhone app draws them in SwiftUI with the same numbers (`layoutTree`).
//
//   table  { columns: [text], rows: [[text]] }       drawn as a real HTML table: the first column names each row (a row header)
//   tree   { text, children: [{ text, children: [{ text }] }] }       a mind map: the topic on the left, its main ideas in the next column, their details in the third, as a tidy tree
//
// Nothing here trusts its input: every word is escaped as it is put in the markup, whatever the AI wrote (diagrams.mjs checks it too).
function makeDiagram() {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- the table ----------
  // `c` are the colors: { text, muted, line, bg, surf }. The wrapper scrolls sideways when the table is wider than its box (a phone), the headings stay on top when it scrolls down.
  function tableHtml(table, c, title) {
    const cols = (table && table.columns) || [], rows = (table && table.rows) || [];
    const head = cols.map(x => '<th scope="col">' + esc(x) + '</th>').join('');
    const body = rows.map(r => '<tr>' + cols.map((_, i) => (i === 0 ? '<th scope="row">' : '<td>') + esc(r[i]) + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('');
    return '<div class="dgt-wrap" tabindex="0" role="region" aria-label="' + esc(title || 'Table') + '" style="--dg-text:' + c.text + ';--dg-muted:' + c.muted + ';--dg-line:' + c.line + ';--dg-bg:' + c.bg + ';--dg-surf:' + c.surf + ';">'
      + '<table class="dgt"><caption class="dg-sr">' + esc(title || 'Table') + '</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  // ---------- the mind map ----------
  // One layout for the page and the app. Sizes are in points (a node's width comes from its longest line at CHAR points a letter: no font is measured, so every screen lays it out alike).
  const L = { lineH: 17, padX: 14, padY: 9, gapY: 10, gapX: 56, minW: 72, maxW: 200, char: [8.4, 7.3, 6.8], wrap: [16, 22, 24], margin: 16, rootPad: 4 };
  // Words broken into lines of at most `max` letters (a word longer than that is cut), as many lines as it takes.
  function wrap(text, max) {
    const out = []; let line = '';
    for (let w of String(text == null ? '' : text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)) {
      while (w.length > max) { if (line) { out.push(line); line = ''; } out.push(w.slice(0, max)); w = w.slice(max); }
      if (!line) line = w; else if ((line + ' ' + w).length <= max) line += ' ' + w; else { out.push(line); line = w; }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }
  /**
   * Where everything goes: { nodes: [{ id, level, branch, x, y, w, h, lines }], links: [{ from, to, d }], width, height }. Levels are columns; a node sits in the middle of its
   * children, and each branch has room for all of its children, so nothing overlaps. `d` is the link's path (a gentle S from one box's right side to the next one's left).
   */
  function layoutTree(tree) {
    const nodes = [], links = [];
    const make = (n, level, branch, parent) => {
      const lines = wrap(n.text, L.wrap[Math.min(level, 2)]), longest = Math.max(...lines.map(s => s.length)), pad = level === 0 ? L.padX + L.rootPad : L.padX;
      const node = { id: nodes.length, level, branch, parent, lines, w: Math.min(L.maxW, Math.max(L.minW, Math.ceil(longest * L.char[Math.min(level, 2)]) + pad * 2)), h: lines.length * L.lineH + L.padY * 2 + (level === 0 ? 4 : 0), kids: [], x: 0, y: 0, span: 0 };
      nodes.push(node);
      (Array.isArray(n.children) ? n.children : []).slice(0, 12).forEach((k, i) => node.kids.push(make(k, level + 1, level === 0 ? i : branch, node)));
      return node;
    };
    const root = make(tree && typeof tree === 'object' ? tree : { text: '' }, 0, -1, null);
    const span = n => { const kids = n.kids.reduce((s, k) => s + span(k), 0) + L.gapY * Math.max(0, n.kids.length - 1); return (n.span = Math.max(n.h, kids)); };
    span(root);
    const place = (n, top) => {
      const kidsH = n.kids.reduce((s, k) => s + k.span, 0) + L.gapY * Math.max(0, n.kids.length - 1);
      if (!n.kids.length) { n.y = top + (n.span - n.h) / 2; return; }
      let y = top + (n.span - kidsH) / 2;
      for (const k of n.kids) { place(k, y); y += k.span + L.gapY; }
      const first = n.kids[0], last = n.kids[n.kids.length - 1];
      n.y = (first.y + first.h / 2 + last.y + last.h / 2) / 2 - n.h / 2;
    };
    place(root, L.margin);
    const colW = []; for (const n of nodes) colW[n.level] = Math.max(colW[n.level] || 0, n.w);
    const colX = [L.margin]; for (let i = 1; i < colW.length; i++) colX[i] = colX[i - 1] + colW[i - 1] + L.gapX;
    for (const n of nodes) n.x = colX[n.level];
    for (const n of nodes) if (n.parent) {
      const p = n.parent, x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = n.x, y2 = n.y + n.h / 2, m = (x1 + x2) / 2, r = v => Math.round(v * 10) / 10;
      links.push({ from: p.id, to: n.id, d: 'M' + r(x1) + ' ' + r(y1) + ' C' + r(m) + ' ' + r(y1) + ' ' + r(m) + ' ' + r(y2) + ' ' + r(x2) + ' ' + r(y2) });
    }
    const out = nodes.map(({ parent, kids, span: _s, ...rest }) => rest);
    return { nodes: out, links, width: Math.ceil(colX[colX.length - 1] + colW[colW.length - 1] + L.margin), height: Math.ceil(root.span + L.margin * 2) };
  }
  // The ideas of a map, counted.
  const count = t => 1 + ((t && t.children) || []).reduce((n, c) => n + count(c), 0);
  // The map as SVG (`c`: { text, muted, line, bg, surf, surf2, inv, invText }). The picture is hidden from screen readers, which get the same ideas as an outline (a list inside a list).
  function mapSvg(tree, c, title) {
    const g = layoutTree(tree), r = v => Math.round(v * 10) / 10;
    const links = g.links.map(l => '<path d="' + l.d + '"/>').join('');
    const nodes = g.nodes.map(n => {
      const fill = n.level === 0 ? c.inv : n.level === 1 ? c.surf2 || c.line : c.bg, ink = n.level === 0 ? c.invText : c.text, stroke = n.level === 2 ? ' stroke="' + c.line + '" stroke-width="1.5"' : '';
      const size = n.level === 0 ? 14 : n.level === 1 ? 13 : 12.5, weight = n.level === 2 ? 500 : 600, top = n.h / 2 - ((n.lines.length - 1) * L.lineH) / 2;
      const text = n.lines.map((s, i) => '<tspan x="' + r(n.w / 2) + '" y="' + r(top + i * L.lineH + size * 0.36) + '">' + esc(s) + '</tspan>').join('');
      return '<g transform="translate(' + r(n.x) + ' ' + r(n.y) + ')"><rect width="' + r(n.w) + '" height="' + r(n.h) + '" rx="' + (n.level === 0 ? 16 : 12) + '" fill="' + fill + '"' + stroke + '/>'
        + '<text text-anchor="middle" fill="' + ink + '" font-size="' + size + '" font-weight="' + weight + '">' + text + '</text></g>';
    }).join('');
    const ul = n => (n.children && n.children.length ? '<ul>' + n.children.map(k => '<li>' + esc(k.text) + ul(k) + '</li>').join('') + '</ul>' : '');
    return '<div class="dgm-wrap" tabindex="0" role="region" aria-label="' + esc(title || 'Mind map') + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + g.width + ' ' + g.height + '" width="' + g.width + '" height="' + g.height + '" aria-hidden="true" focusable="false" style="display:block;font-family:inherit;">'
      + '<g fill="none" stroke="' + c.line + '" stroke-width="1.5" stroke-linecap="round">' + links + '</g>' + nodes + '</svg>'
      + '<div class="dg-sr"><p>' + esc((tree && tree.text) || '') + '</p>' + ul(tree || {}) + '</div></div>';
  }
  return { esc, tableHtml, layoutTree, mapSvg, wrap, count, L };
}
export default makeDiagram();
