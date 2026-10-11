// Pages: what a deck (or a folder) holds beside its cards, each of a kind (a Note, a Presentation, a Mind map, a Canvas, a
// Diagram, a Doc), versioned, and written by the learner or by their AI app over MCP (the owner, 2026-10-11: "AI-native for
// agents ... the way Claude Artifacts work, but specific to studying"). These boards are the design, drawn first for the
// owner to approve (step 1 of the approved plan: the deck's Pages and the Note page); the app's screens follow them.
//   - PagesWeb / PagesPhone: the deck's Pages tab (in place of Notes): each page's kind, title, who changed it last and when,
//     its version, and New page (its menu of kinds).
//   - NoteWeb / NotePhone: a Note page with the new blocks (callout: trap, pearl, mnemonic; chain a → b → c; a card from the
//     deck; another page shown inside; a table; a toggle), its version and who wrote it, Make a card from any block, older
//     versions (by whom, Restore), and what shows when the learner's AI changed the page while it was open.
export const PAGES_VIEWS = ['List', 'New page menu', 'Empty deck'];
export const NOTE_VIEWS = ['Reading', 'Make a card from a block', 'Older versions', 'Changed by your AI'];

// The kinds, in the order New page lists them (icons from build.mjs's I).
export const PAGE_KINDS = [
  { kind: 'note', name: 'Note', icon: 'text', line: 'Headings, callouts, chains, tables, toggles and cards' },
  { kind: 'slides', name: 'Presentation', icon: 'play', line: 'Slides to present, or save as a PDF' },
  { kind: 'mindmap', name: 'Mind map', icon: 'mindmap', line: 'One idea in the middle, branches you can fold' },
  { kind: 'diagram', name: 'Diagram', icon: 'share', line: 'Boxes and arrows, laid out for you' },
  { kind: 'canvas', name: 'Canvas', icon: 'grid', line: 'A board to pin notes, cards and pictures on' },
  { kind: 'doc', name: 'Doc', icon: 'file', line: 'A PDF to read beside the cards' }
];

// A sample deck's pages, for the boards (who: 'You' or the AI app's name; the AI's are marked).
const SAMPLE = [
  { kind: 'note', title: 'Guide', who: 'Claude', ai: true, when: '2 min ago', v: 7, depth: 0 },
  { kind: 'note', title: 'Cellular respiration', who: 'You', ai: false, when: 'Yesterday', v: 12, depth: 1 },
  { kind: 'mindmap', title: 'The cell at a glance', who: 'Claude', ai: true, when: 'Yesterday', v: 3, depth: 1 },
  { kind: 'slides', title: 'Exam 5 review', who: 'ChatGPT', ai: true, when: 'Mon', v: 2, depth: 0 },
  { kind: 'diagram', title: 'Electron transport chain', who: 'Claude', ai: true, when: 'Mon', v: 5, depth: 0 },
  { kind: 'doc', title: 'Lecture 14 slides.pdf', who: 'You', ai: false, when: 'Sep 30', v: 1, depth: 0 }
];

// The canvas's sample pages for a deck's Pages tab (design/materials.mjs reads them on the deck page), as the list web/pagesclient.js gives.
export const PAGES_SAMPLE_JSON = JSON.stringify(SAMPLE.map((r, i) => ({ id: 'ps' + i, kind: r.kind, title: r.title, version: r.v, by: r.who, ai: r.ai, parent: r.depth ? 'ps0' : '', updated: Date.UTC(2026, 9, 10 - i) })));

// The deck page's Pages tab (its section, under the tabs): each page with its kind, who changed it last, when and its version; New page
// opens the kinds (only the ones the apps can show yet can be made). `gs` comes from design/materials.mjs's deck logic, and this adds to it.
export function deckPagesBlock(H, phone) {
  const { svg, I } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const kindIcon = v => PAGE_KINDS.map(k => `<sc-if value="{{${v}.is_${k.kind}}}" hint-placeholder-val="{{ false }}">${icon(k.icon, 16, 2)}</sc-if>`).join('');
  return `<sc-if value="{{gs.pagesShow}}" hint-placeholder-val="{{ false }}">
    <section aria-label="Pages" style="min-width: 0; display: flex; flex-direction: column;">
      <sc-if value="{{gs.pg.canNew}}" hint-placeholder-val="{{ true }}"><div style="display: flex; justify-content: flex-end; padding: 10px 0;"><div style="position: relative;">
        <button type="button" onClick="{{gs.pg.toggleNew}}" aria-haspopup="menu" aria-expanded="{{gs.pg.newExpanded}}" class="sc-press" style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon('plus', 14, 2.4)}New page</button>
        <sc-if value="{{gs.pg.newOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="New page" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 40; width: ${phone ? 300 : 320}px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">
          <sc-for list="{{gs.pg.kinds}}" as="k" hint-placeholder-count="6"><button type="button" role="menuitem" onClick="{{k.pick}}" aria-disabled="{{k.disabled}}" style="min-height: 52px; padding: 6px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 12px; background: transparent; color: {{k.fg}}; font: inherit; text-align: left; cursor: {{k.cursor}};"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('k')}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600;">{{k.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{k.line}}</span></span><sc-if value="{{k.soon}}" hint-placeholder-val="{{ false }}"><span style="font-size: 11px; font-weight: 600; color: {{t.muted}};">Soon</span></sc-if></button></sc-for>
          <div style="margin: 4px 6px; padding: 10px 4px 4px; border-top: 1px solid {{t.line}}; display: flex; gap: 8px; font-size: 12px; line-height: 1.45; color: {{t.muted}};"><span style="flex-shrink: 0;">${icon('sparkle', 13, 2)}</span><span>Your AI can make pages too: ask it in Claude or ChatGPT once Lucida is connected.</span></div>
        </div></sc-if>
      </div></div></sc-if>
      <sc-if value="{{gs.pg.none}}" hint-placeholder-val="{{ false }}"><div style="padding: ${phone ? '24px 18px' : '32px 28px'}; border-radius: 22px; background: {{t.surf}}; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;"><span style="font-size: 16px; font-weight: 600;">No pages yet</span><span style="max-width: 420px; font-size: 14px; line-height: 1.5; color: {{t.muted}};">Notes beside the cards, with traps, pearls, chains and the deck’s own cards. Make one here, or ask your AI: “Make a page of notes for this deck in Lucida.”</span></div></sc-if>
      <div style="display: flex; flex-direction: column; border-top: 1px solid {{t.line}};"><sc-for list="{{gs.pg.rows}}" as="r" hint-placeholder-count="4"><a href="{{r.href}}" style="min-height: ${phone ? 64 : 60}px; box-sizing: border-box; padding: 8px 0 8px {{r.indent}}; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid {{t.line}}; color: {{t.text}};">
        <span style="width: 34px; height: 34px; flex-shrink: 0; border-radius: 17px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('r')}</span>
        <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.title}}</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.sub}}</span></span>
        <span style="flex-shrink: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: {{t.muted}};"><sc-if value="{{r.ai}}" hint-placeholder-val="{{ false }}"><span aria-label="by an AI app" style="display: flex;">${icon('sparkle', 13, 2)}</span></sc-if>${phone ? '' : '<span>{{r.who}} · {{r.when}}</span>'}<span style="height: 22px; padding: 0 8px; display: inline-flex; align-items: center; border-radius: 11px; background: {{t.surf}}; font-size: 12px; font-weight: 600; color: {{t.text}};">v{{r.v}}</span></span>
      </a></sc-for></div>
    </section>
  </sc-if>`;
}
// Its logic, after the deck's materials logic (which made gs, gs.pagesList, and knows whether the deck is the person's: G.can).
export const deckPagesJs = phone => `
  {
    const KN = ${JSON.stringify(PAGE_KINDS)}, READY = ['note'], list = gs.pagesList || [], is = kind => Object.fromEntries(KN.map(k => ['is_' + k.kind, k.kind === kind]));
    const NAME = Object.fromEntries(KN.map(k => [k.kind, k.name])), ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    const by = new Map(list.map(x => [x.id, x])), depthOf = x => { let d = 0; for (let q = x; q && q.parent && by.has(q.parent) && d < 6; q = by.get(q.parent)) d++; return d; };
    const ordered = [], seen = new Set(), walk = x => { if (seen.has(x.id)) return; seen.add(x.id); ordered.push(x); list.filter(y => y.parent === x.id).forEach(walk); };
    list.filter(x => !x.parent || !by.has(x.parent)).forEach(walk);
    const mock = !!db.mock, open = !!this.state.newPage, canNew = !!gs.pagesCan;
    const make = async kind => { this.setState({ newPage: false }); if (mock || !READY.includes(kind)) return; try { const pg = await db.pages.create('deck', dk.id, { kind, title: '' }); db.act.go(db.href('page', pg.id) + '?new=1'); } catch (e) { db.say(e.message); } };
    gs.pg = { canNew, none: !list.length && (mock ? false : db.pages.loaded('deck', dk.id)), newOpen: open, newExpanded: open ? 'true' : 'false', toggleNew: () => this.setState({ newPage: !open }),
      kinds: KN.map(k => { const ready = READY.includes(k.kind); return { ...k, ...is(k.kind), soon: !ready, disabled: ready ? 'false' : 'true', fg: ready ? t.text : t.muted, cursor: ready ? 'pointer' : 'default', pick: () => make(k.kind) }; }),
      rows: ordered.map(x => ({ ...is(x.kind), title: x.title || 'Untitled', sub: NAME[x.kind] || 'Page', who: x.by === 'you' ? 'You' : x.by || 'You', ai: !!x.ai, when: ago(x.updated), v: x.version, indent: depthOf(x) * ${phone ? 20 : 28} + 'px',
        href: mock ? '${phone ? 'PhonePage' : 'WebPage'}.dc.html' : db.href('page', x.id) })) };
  }`;

export function pagesBoards(H) {
  const { svg, I, FONT, T, DB_JS, DARK, W, HH, PW, PH, sidebar } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const PILL = 'height: 36px; flex-shrink: 0; box-sizing: border-box; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;';
  // (a hole can't hold markup, so each kind's icon is there and only its own shows)
  const kindIcon = v => PAGE_KINDS.map(k => `<sc-if value="{{${v}.is_${k.kind}}}" hint-placeholder-val="{{ false }}">${icon(k.icon, 16, 2)}</sc-if>`).join('');

  // ---------- the deck's Pages ----------
  // A row: the kind's round icon, the title (and the kind under it), who changed it last (an AI app's name gets a small ✦), when, and its version.
  const row = phone => `<sc-for list="{{rows}}" as="r" hint-placeholder-count="5"><button type="button" style="width: 100%; min-height: ${phone ? 64 : 60}px; box-sizing: border-box; padding: 8px 0 8px {{r.indent}}; display: flex; align-items: center; gap: 12px; border: 0; border-bottom: 1px solid {{t.line}}; background: transparent; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;">
      <span style="width: 34px; height: 34px; flex-shrink: 0; border-radius: 17px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('r')}</span>
      <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.title}}</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{r.sub}}</span></span>
      <sc-if value="{{r.showMeta}}" hint-placeholder-val="{{ true }}"><span style="flex-shrink: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: {{t.muted}};"><sc-if value="{{r.ai}}" hint-placeholder-val="{{ false }}"><span aria-hidden="true">${icon('sparkle', 13, 2)}</span></sc-if><span>{{r.who}} · {{r.when}}</span><span style="height: 22px; padding: 0 8px; display: inline-flex; align-items: center; border-radius: 11px; background: {{t.surf}}; font-size: 12px; font-weight: 600; color: {{t.text}};">v{{r.v}}</span></span></sc-if>
    </button></sc-for>`;
  // New page: Lucida's own menu of kinds (each its icon, name and one line).
  const kindMenu = `<sc-if value="{{menuOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="New page" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 320px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">
      <sc-for list="{{kinds}}" as="k" hint-placeholder-count="6"><button type="button" role="menuitem" style="min-height: 52px; padding: 6px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 12px; background: transparent; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('k')}</span><span style="display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600;">{{k.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{k.line}}</span></span></button></sc-for>
      <div style="margin: 4px 6px 4px; padding: 10px 4px 4px; border-top: 1px solid {{t.line}}; display: flex; gap: 8px; font-size: 12px; line-height: 1.45; color: {{t.muted}};"><span style="flex-shrink: 0;">${icon('sparkle', 13, 2)}</span><span>Your AI can make any of these too: ask it in Claude or ChatGPT once Lucida is connected.</span></div>
    </div></sc-if>`;
  const newBtn = `<div style="position: relative; flex-shrink: 0;"><button type="button" onClick="{{toggleMenu}}" aria-haspopup="menu" aria-expanded="{{menuExpanded}}" class="sc-press" style="${PILL} background: {{t.inv}}; color: {{t.invText}};">${icon('plus', 14, 2.4)}New page</button>${kindMenu}</div>`;
  const tabs = `<div role="tablist" aria-label="Deck" style="display: flex; gap: 4px;"><sc-for list="{{tabs}}" as="x" hint-placeholder-count="3"><button type="button" role="tab" aria-selected="{{x.on}}" style="${PILL} height: 34px; background: {{x.bg}}; color: {{x.fg}};">{{x.name}}</button></sc-for></div>`;
  const empty = phone => `<sc-if value="{{isEmpty}}" hint-placeholder-val="{{ false }}"><div style="margin-top: ${phone ? 24 : 40}px; padding: ${phone ? '28px 20px' : '40px 32px'}; border-radius: 24px; background: {{t.surf}}; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;">
      <span style="font-size: 17px; font-weight: 600;">No pages yet</span>
      <span style="max-width: 420px; font-size: 14px; line-height: 1.5; color: {{t.muted}};">Notes, slides, mind maps and more, beside the cards. Make one here, or ask your AI: “Make a mind map of this deck in Lucida.”</span>
    </div></sc-if>`;
  const pagesWeb = `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
${sidebar('Library')}
<main aria-label="Cell Biology" style="flex-grow: 1; min-width: 0; overflow-y: auto;">
  <div style="max-width: 880px; margin: 0 auto; padding: 40px 48px 80px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px;">
    <div style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Library</span><h1 style="margin: 0; font-size: 34px; font-weight: 600; letter-spacing: -.03em;">Cell Biology</h1></div>
    <div style="display: flex; align-items: center; gap: 12px;">${tabs}<span style="flex-grow: 1;"></span>${newBtn}</div>
    <div role="tabpanel" style="display: flex; flex-direction: column; border-top: 1px solid {{t.line}};">${row(false)}</div>${empty(false)}
  </div>
</main>
</div>`;
  const pagesPhone = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding: 52px 16px 0; display: flex; flex-direction: column; gap: 14px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    <div style="display: flex; align-items: center; gap: 8px; height: 44px;"><span style="${PILL} padding: 0 10px; background: {{t.surf}}; color: {{t.text}};">${icon('back', 14, 2.2)}Library</span></div>
    <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em;">Cell Biology</h1>
    <div style="display: flex; align-items: center; gap: 8px;">${tabs}<span style="flex-grow: 1;"></span>${newBtn}</div>
    <div style="display: flex; flex-direction: column; border-top: 1px solid {{t.line}};">${row(true)}</div>${empty(true)}
  </div>`;
  const pagesLogic = `
constructor(props) { super(props); this.state = { menu: null }; }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, view = p.view || 'List', none = view === 'Empty deck', is = kind => Object.fromEntries(${JSON.stringify(PAGE_KINDS.map(k => k.kind))}.map(x => ['is_' + x, x === kind]));
  const open = this.state.menu === null ? view === 'New page menu' : this.state.menu, KIND = ${JSON.stringify(Object.fromEntries(PAGE_KINDS.map(k => [k.kind, k.name])))};
  const rows = none ? [] : ${JSON.stringify(SAMPLE)}.map(r => ({ ...r, ...is(r.kind), sub: KIND[r.kind] + (r.kind === 'note' && r.depth ? ' · inside Guide' : ''), indent: (r.depth * 28) + 'px', showMeta: true }));
  return { t, ...chrome, rows, isEmpty: none, kinds: ${JSON.stringify(PAGE_KINDS)}.map(k => ({ ...k, ...is(k.kind) })),
    menuOpen: open, menuExpanded: open ? 'true' : 'false', toggleMenu: () => this.setState({ menu: !open }),
    tabs: ['Cards', 'Pages', 'Sources'].map(n => ({ name: n, on: n === 'Pages' ? 'true' : 'false', bg: n === 'Pages' ? t.surf : 'transparent', fg: n === 'Pages' ? t.text : t.muted })) };
}`;

  // ---------- a Note page ----------
  // Each block is drawn as the app will draw it. A callout's kind gives it its color (a trap: the again red; a pearl: the good green;
  // a mnemonic: the hard amber) and its label; a chain is pills with arrows; a card from the deck shows its front and back, and its
  // weak mark when the learner keeps missing it; a page inside shows the other page's preview (here a mind map) and opens it.
  const callout = (kind, label, text) => `<div data-block style="position: relative; padding: 14px 16px; border-radius: 16px; background: {{c.${kind}Bg}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: {{c.${kind}}};">${label}</span><span style="font-size: 16px; line-height: 1.6;">${text}</span></div>`;
  const chain = steps => `<div data-block style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">${steps.map((s, i) => (i ? `<span aria-hidden="true" style="color: {{t.muted}};">${icon('chev', 14, 2.2)}</span>` : '') + `<span style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 17px; background: {{t.surf}}; font-size: 14px; font-weight: 600;">${s}</span>`).join('')}</div>`;
  const cardRef = `<div data-block style="display: flex; align-items: stretch; border-radius: 16px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden;"><div style="flex: 1 1 0; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Card · front</span><span style="font-size: 15px; font-weight: 600;">Where does the Krebs cycle happen?</span></div><div style="flex: 1 1 0; padding: 14px 16px; border-left: 1px solid {{t.line}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Back</span><span style="font-size: 15px;">The mitochondrial matrix</span></div><span style="align-self: center; margin: 0 14px; height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 12px; background: {{t.againTint}}; color: {{t.again}}; font-size: 12px; font-weight: 600; white-space: nowrap;">Weak spot</span></div>`;
  const embed = `<div data-block style="border-radius: 18px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden;"><div style="height: 150px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">
      <svg width="340" height="120" viewBox="0 0 340 120" aria-hidden="true" style="color: {{t.text}};"><g stroke="currentColor" stroke-opacity=".35" stroke-width="1.5" fill="none"><path d="M170 60 C120 60 110 22 60 22"/><path d="M170 60 C120 60 110 98 60 98"/><path d="M170 60 C220 60 230 22 280 22"/><path d="M170 60 C220 60 230 98 280 98"/></g><g font-family="${FONT}" font-size="11" font-weight="600" fill="currentColor" text-anchor="middle"><rect x="120" y="46" width="100" height="28" rx="14" fill="currentColor" fill-opacity=".1"/><text x="170" y="64">The cell</text><text x="46" y="26">Nucleus</text><text x="46" y="102">Membrane</text><text x="296" y="26">Mitochondria</text><text x="296" y="102">Ribosomes</text></g></svg>
    </div><div style="padding: 12px 16px; display: flex; align-items: center; gap: 10px;"><span style="color: {{t.muted}};">${icon('mindmap', 16, 2)}</span><span style="flex-grow: 1; font-size: 14px; font-weight: 600;">The cell at a glance</span><span style="font-size: 13px; color: {{t.muted}};">Mind map · open</span></div></div>`;
  const table = `<div data-block style="border-radius: 14px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden; font-size: 14px;"><div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; font-weight: 600; background: {{t.surf}};"><span style="padding: 10px 14px;">Stage</span><span style="padding: 10px 14px;">Where</span><span style="padding: 10px 14px;">ATP made</span></div>${[['Glycolysis', 'Cytoplasm', '2'], ['Krebs cycle', 'Matrix', '2'], ['Electron transport', 'Inner membrane', '~34']].map(r => `<div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-top: 1px solid {{t.line}};">${r.map(x => `<span style="padding: 10px 14px;">${x}</span>`).join('')}</div>`).join('')}</div>`;
  const toggle = `<div data-block style="display: flex; flex-direction: column; gap: 6px;"><div style="display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 600;"><span style="transform: rotate(90deg); display: flex;">${icon('chev', 14, 2.2)}</span>Why does cyanide stop it?</div><span style="padding-left: 20px; font-size: 16px; line-height: 1.6; color: {{t.text}};">It blocks complex IV, so oxygen can’t take the electrons and the chain stops.</span></div>`;
  // Make a card from this: on the block under the pointer (a press on a phone), its button beside it, and the card it makes, to check before adding.
  const makeBtn = `<sc-if value="{{showMake}}" hint-placeholder-val="{{ false }}"><span class="sc-press" style="position: absolute; right: 10px; top: 10px; ${PILL} height: 30px; padding: 0 12px; font-size: 12px; background: {{t.inv}}; color: {{t.invText}};">${icon('plus', 12, 2.4)}Card</span></sc-if>`;
  const makeSheet = phone => `<sc-if value="{{makeOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="New card from this block" data-sc-pop style="${phone ? 'position: absolute; left: 0; right: 0; bottom: 0; border-radius: 24px 24px 0 0; padding: 18px 16px 34px;' : 'position: relative; margin-top: 10px; border-radius: 20px; padding: 16px;'} z-index: 60; box-sizing: border-box; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 10px;">
      <span style="font-size: 15px; font-weight: 600;">New card from this block</span>
      <div style="padding: 12px 14px; border-radius: 14px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Front</span><span style="font-size: 15px;">Where does glycolysis happen, and does it need oxygen?</span></div>
      <div style="padding: 12px 14px; border-radius: 14px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Back</span><span style="font-size: 15px;">In the cytoplasm, and no: it needs no oxygen</span></div>
      <span style="font-size: 12px; color: {{t.muted}};">Written by Lucida from the trap above. The card links back to this page.</span>
      <div style="display: flex; gap: 8px; justify-content: flex-end;"><span class="sc-press" style="${PILL} background: {{t.surf}}; color: {{t.text}};">Cancel</span><span class="sc-press" style="${PILL} background: {{t.inv}}; color: {{t.invText}};">Add to Cell Biology</span></div>
    </div></sc-if>`;
  const versions = phone => `<sc-if value="{{histOpen}}" hint-placeholder-val="{{ false }}"><aside aria-label="Older versions" style="${phone ? 'position: absolute; inset: 96px 0 0 0; z-index: 40; padding: 16px;' : 'width: 320px; flex-shrink: 0; padding: 24px 20px; border-left: 1px solid {{t.line}};'} box-sizing: border-box; background: {{t.bg}}; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
      <span style="font-size: 17px; font-weight: 600;">Versions</span><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">Every save is one. Restoring one keeps what's there now too.</span>
      <sc-for list="{{vers}}" as="v" hint-placeholder-count="4"><div style="padding: 12px 14px; border-radius: 16px; background: {{v.bg}}; display: flex; flex-direction: column; gap: 4px;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 14px; font-weight: 600;">v{{v.n}}</span><sc-if value="{{v.ai}}" hint-placeholder-val="{{ false }}"><span style="display: flex; color: {{t.muted}};">${icon('sparkle', 12, 2)}</span></sc-if><span style="flex-grow: 1; font-size: 13px; color: {{t.muted}};">{{v.who}} · {{v.when}}</span><sc-if value="{{v.old}}" hint-placeholder-val="{{ true }}"><span class="sc-press" style="${PILL} height: 28px; padding: 0 12px; font-size: 12px; background: {{t.inv}}; color: {{t.invText}};">Restore</span></sc-if></div><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">{{v.what}}</span></div></sc-for>
    </aside></sc-if>`;
  // The learner's AI changed the page while it was open: the page shows the new version, and what the learner was typing is kept as its own version.
  const changed = `<sc-if value="{{changedOpen}}" hint-placeholder-val="{{ false }}"><div role="status" style="margin-bottom: 18px; padding: 12px 14px; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; gap: 10px; font-size: 14px;"><span style="display: flex;">${icon('sparkle', 15, 2)}</span><span style="flex-grow: 1; line-height: 1.45;">Claude changed this page just now (v13). What you were writing is kept as v14, on top of it.</span><span class="sc-press" style="${PILL} height: 30px; font-size: 12px; background: {{t.bg}}; color: {{t.text}};">See what changed</span></div></sc-if>`;
  const body = phone => `${changed}<div style="display: flex; flex-direction: column; gap: 18px;">
      <h1 style="margin: 0; font-size: ${phone ? 28 : 36}px; font-weight: 600; letter-spacing: -.03em;">Cellular respiration</h1>
      <p data-block style="margin: 0; font-size: 16px; line-height: 1.6;">Cells turn glucose into ATP in three stages. Most of the ATP comes from the last one, on the inner membrane of the mitochondrion.</p>
      ${chain(['Glycolysis', 'Pyruvate', 'Acetyl-CoA', 'Krebs cycle', 'Electron transport'])}
      <div style="position: relative;">${callout('trap', 'Trap', 'Glycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.')}${makeBtn}${phone ? '' : makeSheet(false)}</div>
      ${callout('pearl', 'Pearl', 'Oxygen is the last electron acceptor: no O₂, no electron transport, almost no ATP.')}
      ${callout('mnemonic', 'Mnemonic', '“Can I Keep Selling Seashells For Money, Officer?”: the Krebs cycle’s steps in order.')}
      <h2 style="margin: 8px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">Where each stage happens</h2>
      ${table}
      ${toggle}
      <h2 style="margin: 8px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">From your cards</h2>
      ${cardRef}
      ${embed}
    </div>`;
  const noteHeader = phone => `<header style="height: ${phone ? 52 : 64}px; flex-shrink: 0; box-sizing: border-box; padding: 0 ${phone ? 12 : 20}px 0 ${phone ? 12 : 24}px; display: flex; align-items: center; gap: 8px; ${phone ? '' : 'border-bottom: 1px solid {{t.line}};'}">
      <span style="${PILL} padding: 0 14px 0 10px; background: {{t.surf}}; color: {{t.text}};">${icon('back', 14, 2.2)}Cell Biology</span>
      ${phone ? '' : `<span style="font-size: 13px; color: {{t.muted}};">/ Guide /</span><span style="font-size: 13px; font-weight: 600;">Cellular respiration</span>`}
      <span style="flex-grow: 1;"></span>
      <button type="button" onClick="{{toggleHist}}" aria-pressed="{{histPressed}}" style="${PILL} background: {{histBg}}; color: {{t.text}};"><span style="display: flex;">${icon('history', 14, 2)}</span>${phone ? 'v12' : 'v12 · You, yesterday'}</button>
      <span style="${PILL} width: 36px; padding: 0; justify-content: center; background: transparent; color: {{t.text}};">${icon('more', 18, 2)}</span>
    </header>`;
  const noteWeb = `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
${sidebar('Library')}
<main aria-label="Note" style="position: relative; flex-grow: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;">
  ${noteHeader(false)}
  <div style="flex-grow: 1; min-height: 0; display: flex;">
    <div style="flex-grow: 1; min-width: 0; overflow-y: auto;"><div style="max-width: 728px; margin: 0 auto; padding: 30px 54px 140px; box-sizing: border-box;">${body(false)}</div></div>
    ${versions(false)}
  </div>
</main>
</div>`;
  const notePhone = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding-top: 52px; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    ${noteHeader(true)}
    <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;"><div style="padding: 10px 20px 120px; box-sizing: border-box;">${body(true)}</div></div>
    ${versions(true)}${makeSheet(true)}
  </div>`;
  const VERS = [
    { n: 12, who: 'You', ai: false, when: 'Yesterday, 9:40 PM', what: 'Added the table of stages' },
    { n: 11, who: 'Claude', ai: true, when: 'Yesterday, 9:12 PM', what: 'Added the trap and the pearl, linked 2 weak cards' },
    { n: 10, who: 'You', ai: false, when: 'Oct 9', what: 'Rewrote the opening line' },
    { n: 9, who: 'ChatGPT', ai: true, when: 'Oct 8', what: 'Made the page from Lecture 14 slides.pdf' }
  ];
  const noteLogic = `
constructor(props) { super(props); this.state = { hist: null }; }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, view = p.view || 'Reading', hist = this.state.hist === null ? view === 'Older versions' : this.state.hist;
  return { t, ...chrome,
    c: { trap: t.again, trapBg: t.againTint, pearl: t.good, pearlBg: t.goodTint, mnemonic: t.hard, mnemonicBg: t.hardTint },
    showMake: view === 'Make a card from a block', makeOpen: view === 'Make a card from a block', changedOpen: view === 'Changed by your AI',
    histOpen: hist, histPressed: hist ? 'true' : 'false', histBg: hist ? t.surf : 'transparent', toggleHist: () => this.setState({ hist: !hist }),
    vers: ${JSON.stringify(VERS)}.map((v, i) => ({ ...v, old: i > 0, bg: i ? t.surf : 'transparent' })) };
}`;
  const pp = { ...DARK, view: { editor: 'enum', default: 'List', options: PAGES_VIEWS } };
  const np = { ...DARK, view: { editor: 'enum', default: 'Reading', options: NOTE_VIEWS } };
  return {
    'PagesWeb': ['Web · Deck › Pages (design)', pagesWeb, { props: pp, logic: pagesLogic, w: W, h: HH }],
    'PagesPhone': ['iPhone · Deck › Pages (design)', pagesPhone, { props: pp, logic: pagesLogic, w: PW, h: PH }],
    'NoteWeb': ['Web · Note page (design)', noteWeb, { props: np, logic: noteLogic, w: W, h: HH }],
    'NotePhone': ['iPhone · Note page (design)', notePhone, { props: np, logic: noteLogic, w: PW, h: PH }]
  };
}

// ---------- the Note page itself (the app's screen: /page/<id>) ----------
// The page's deck (back to its Pages), the title (pressed to rename it), what's saving, its version (Versions beside the page: who
// wrote each, Restore), and ⋯ (Delete page). The Note is web/notes.js, the Guide's editor, with the Note blocks; a card block shows
// the deck's card and whether the learner keeps missing it, another page shows inside as a box that opens it, and + Card on a block
// makes a card from it. When the learner's AI changed the page while it was being written, both are kept and a line says so.
const NOTE_SAMPLE_MD = '# Cellular respiration\n\nCells turn glucose into ATP in three stages. Most of the ATP comes from the last one, on the inner membrane of the mitochondrion.\n\n:::chain\nGlycolysis\nPyruvate\nAcetyl-CoA\nKrebs cycle\nElectron transport\n:::\n\n:::trap\nGlycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.\n:::\n\n:::pearl\nOxygen is the last electron acceptor: no O₂, no electron transport, almost no ATP.\n:::\n\n:::mnemonic\n“Can I Keep Selling Seashells For Money, Officer?”: the Krebs cycle’s steps in order.\n:::\n\n## Where each stage happens\n\n| Stage | Where | ATP made |\n| --- | --- | --- |\n| Glycolysis | Cytoplasm | 2 |\n| Krebs cycle | Matrix | 2 |\n| Electron transport | Inner membrane | ~34 |\n\n:::toggle Why does cyanide stop it?\nIt blocks complex IV, so oxygen can’t take the electrons and the chain stops.\n:::\n\n## From your cards\n\n::card c1\n';
export const PAGE_VIEWS = ['Writing', 'Versions', 'Changed by your AI', 'Make a card'];
export function pageBoards(H) {
  const { svg, I, FONT, T, DB_JS, DARK, W, HH, PW, PH, sidebar, NOTES_VARS, GUIDE_CSS } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const PILL = 'height: 36px; flex-shrink: 0; box-sizing: border-box; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;';
  const item = (handler, ic, label, danger) => `<button type="button" role="menuitem" onClick="{{${handler}}}" style="height: 40px; padding: 0 10px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: transparent; color: ${danger ? '{{t.again}}' : '{{t.text}}'}; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;">${icon(ic, 16, 2)}<span>${label}</span></button>`;
  const more = `<sc-if value="{{canEdit}}" hint-placeholder-val="{{ true }}"><div style="position: relative; flex-shrink: 0;"><button type="button" onClick="{{toggleMore}}" aria-label="More" aria-haspopup="menu" aria-expanded="{{moreExpanded}}" style="${PILL} width: 36px; padding: 0; justify-content: center; background: {{moreBg}}; color: {{t.text}};">${icon('more', 18, 2)}</button>
      <sc-if value="{{moreOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="More" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 220px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">${item('openHist', 'history', 'Versions')}${item('deletePage', 'bin', 'Delete page', true)}</div></sc-if></div></sc-if>`;
  const verBtn = phone => `<button type="button" onClick="{{toggleHist}}" aria-pressed="{{histPressed}}" style="${PILL} background: {{histBg}}; color: {{t.text}};"><span style="display: flex;">${icon('history', 14, 2)}</span>${phone ? 'v{{version}}' : '{{versionLine}}'}</button>`;
  const saving = `<span aria-live="polite" style="flex-shrink: 0; font-size: 13px; color: {{saveColor}}; white-space: nowrap;">{{saveLabel}}</span>`;
  const header = phone => `<header style="height: ${phone ? 52 : 64}px; flex-shrink: 0; box-sizing: border-box; padding: 0 ${phone ? 12 : 20}px 0 ${phone ? 12 : 24}px; display: flex; align-items: center; gap: 8px; ${phone ? '' : 'border-bottom: 1px solid {{t.line}};'}">
      <a href="{{backHref}}" aria-label="Back to {{scopeName}}" style="${PILL} max-width: ${phone ? 170 : 280}px; padding: 0 14px 0 10px; background: {{t.surf}}; color: {{t.text}};">${icon('back', 14, 2.2)}<span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">{{scopeName}}</span></a>
      <span style="flex-grow: 1;"></span>${saving}${verBtn(phone)}${more}
    </header>`;
  const banner = `<sc-if value="{{conflictOpen}}" hint-placeholder-val="{{ false }}"><div role="status" style="margin-bottom: 18px; padding: 12px 14px; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; gap: 10px; font-size: 14px;"><span style="display: flex;">${icon('sparkle', 15, 2)}</span><span style="flex-grow: 1; line-height: 1.45;">{{conflictLine}}</span><button type="button" onClick="{{openHist}}" class="sc-press" style="${PILL} height: 30px; font-size: 12px; background: {{t.bg}}; color: {{t.text}};">Versions</button><button type="button" onClick="{{dismissConflict}}" aria-label="Dismiss" style="${PILL} width: 30px; height: 30px; padding: 0; justify-content: center; background: transparent; color: {{t.muted}};">${icon('close', 14, 2)}</button></div></sc-if>`;
  const TITLE = phone => `display: block; width: 100%; box-sizing: border-box; margin: 0 0 ${phone ? 10 : 14}px; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: ${phone ? 28 : 36}px; font-weight: 600; letter-spacing: -.03em;`;
  const title = phone => `<sc-if value="{{canEdit}}" hint-placeholder-val="{{ true }}"><input type="text" value="{{title}}" onChange="{{setTitle}}" ref="{{titleRef}}" aria-label="Page title" placeholder="Untitled" autocomplete="off" style="${TITLE(phone)}"></sc-if><sc-if value="{{readOnly}}" hint-placeholder-val="{{ false }}"><h1 style="${TITLE(phone)}">{{title}}</h1></sc-if>`;
  const makeSheet = phone => `<sc-if value="{{makeOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="New card from this block" data-sc-pop style="${phone ? 'position: absolute; left: 0; right: 0; bottom: 0; border-radius: 24px 24px 0 0; padding: 18px 16px 34px;' : 'position: absolute; right: 24px; bottom: 24px; width: 380px; border-radius: 20px; padding: 16px;'} z-index: 60; box-sizing: border-box; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 10px;">
      <span style="font-size: 15px; font-weight: 600;">New card from this block</span>
      <label style="padding: 10px 14px; border-radius: 14px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Front</span><textarea rows="2" onChange="{{setFront}}" ref="{{frontRef}}" placeholder="A question" style="border: 0; outline: 0; resize: none; background: transparent; color: {{t.text}}; font: inherit; font-size: 15px;">{{makeFront}}</textarea></label>
      <label style="padding: 10px 14px; border-radius: 14px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Back</span><textarea rows="3" onChange="{{setBack}}" placeholder="The answer" style="border: 0; outline: 0; resize: none; background: transparent; color: {{t.text}}; font: inherit; font-size: 15px;">{{makeBack}}</textarea></label>
      <span style="font-size: 12px; color: {{t.muted}};">Or ask your AI to make cards from this page.</span>
      <div style="display: flex; gap: 8px; justify-content: flex-end;"><button type="button" onClick="{{closeMake}}" class="sc-press" style="${PILL} background: {{t.surf}}; color: {{t.text}};">Cancel</button><button type="button" onClick="{{addCard}}" class="sc-press" style="${PILL} background: {{t.inv}}; color: {{t.invText}};">Add to {{scopeName}}</button></div>
    </div></sc-if>`;
  const versions = phone => `<sc-if value="{{histOpen}}" hint-placeholder-val="{{ false }}"><aside aria-label="Versions" style="${phone ? 'position: absolute; inset: 104px 0 0 0; z-index: 40; padding: 16px;' : 'width: 320px; flex-shrink: 0; padding: 24px 20px; border-left: 1px solid {{t.line}};'} box-sizing: border-box; background: {{t.bg}}; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
      <div style="display: flex; align-items: center;"><span style="flex-grow: 1; font-size: 17px; font-weight: 600;">Versions</span><button type="button" onClick="{{toggleHist}}" aria-label="Close versions" style="${PILL} width: 32px; height: 32px; padding: 0; justify-content: center; background: transparent; color: {{t.text}};">${icon('close', 15, 2)}</button></div>
      <span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">Every save is one. Restoring one keeps what’s there now too.</span>
      <sc-if value="{{histLoading}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; color: {{t.muted}};">One moment…</span></sc-if>
      <sc-for list="{{vers}}" as="v" hint-placeholder-count="3"><div style="padding: 12px 14px; border-radius: 16px; background: {{v.bg}}; display: flex; flex-direction: column; gap: 4px;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 14px; font-weight: 600;">v{{v.n}}</span><sc-if value="{{v.ai}}" hint-placeholder-val="{{ false }}"><span style="display: flex; color: {{t.muted}};">${icon('sparkle', 12, 2)}</span></sc-if><span style="flex-grow: 1; min-width: 0; font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{v.who}} · {{v.when}}</span><sc-if value="{{v.old}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{v.restore}}" aria-label="Restore version {{v.n}}" class="sc-press" style="${PILL} height: 28px; padding: 0 12px; font-size: 12px; background: {{t.inv}}; color: {{t.invText}};">Restore</button></sc-if></div><sc-if value="{{v.hasWhat}}" hint-placeholder-val="{{ true }}"><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">{{v.what}}</span></sc-if></div></sc-for>
    </aside></sc-if>`;
  const status = `<sc-if value="{{statusOpen}}" hint-placeholder-val="{{ false }}"><div style="padding: 60px 0; text-align: center; font-size: 15px; color: {{t.muted}};">{{statusLine}}</div></sc-if>`;
  const body = phone => `${banner}<sc-if value="{{showPage}}" hint-placeholder-val="{{ true }}">${title(phone)}<div ref="{{nbRef}}" data-sc-own style="${NOTES_VARS()}"></div></sc-if>${status}`;
  const web = `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
${sidebar('Library')}
<main aria-label="{{title}}" style="position: relative; flex-grow: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;">
  ${header(false)}
  <div style="flex-grow: 1; min-height: 0; display: flex;">
    <div style="flex-grow: 1; min-width: 0; overflow-y: auto;"><div style="max-width: 728px; margin: 0 auto; padding: 30px 54px 140px; box-sizing: border-box;">${body(false)}</div></div>
    ${versions(false)}
  </div>
  ${makeSheet(false)}
</main>
</div>`;
  const phone = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding-top: 52px; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    ${header(true)}
    <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;"><div style="padding: 10px 20px 120px 30px; box-sizing: border-box;">${body(true)}</div></div>
    ${versions(true)}${makeSheet(true)}
  </div>`;
  const logic = isPhone => `
constructor(props) { super(props); this.state = { hist: null, more: false, make: null }; }
componentWillUnmount() { const db = this.props.db; if (db && !db.mock && this.props.pageId) db.pages.flush(this.props.pageId); }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, st = this.state, mock = !!db.mock, view = mock ? p.view || 'Writing' : '', id = p.pageId || '';
  const pg = mock ? { id: 'ps1', kind: 'note', scope: 'deck', scopeId: 'cell', title: 'Cellular respiration', version: 12, by: 'you', ai: false, updated: Date.now() - 864e5 } : db.pages.page(id);
  const loading = pg === undefined, missing = pg === null, ok = !!pg;
  const deck = ok && pg.scope === 'deck' ? db.deck(pg.scopeId) : null, folder = ok && pg.scope === 'folder' ? (db.folders() || []).find(f => f.id === pg.scopeId) : null;
  const scopeName = deck ? deck.name : folder ? folder.name : 'Library', canEdit = ok && (mock || (deck ? db.guide(deck.id).can : !!folder));
  const backHref = mock ? '${isPhone ? 'PhoneDeck' : 'WebDeck'}.dc.html' : deck ? '/deck/' + deck.id + '?tab=pages' : '/library';
  const md = mock ? ${JSON.stringify(NOTE_SAMPLE_MD)} : ok ? db.pages.markdown(id) : '';
  const sv = mock ? { busy: false, err: '', saved: 0 } : db.pages.saving(id);
  const who = x => (!x || x === 'you' ? 'You' : x), ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const cf = mock ? (view === 'Changed by your AI' ? { by: 'Claude', ai: true, theirs: 13, mine: 14 } : null) : db.pages.conflict(id);
  const hist = st.hist === null ? view === 'Versions' : st.hist;
  const vl = mock ? [{ version: 12, by: 'you', ai: false, at: Date.now() - 864e5, summary: 'Added the table of stages' }, { version: 11, by: 'Claude', ai: true, at: Date.now() - 9e7, summary: 'Added the trap and the pearl, linked 2 weak cards' }, { version: 9, by: 'ChatGPT', ai: true, at: Date.now() - 3e8, summary: 'Made the page from Lecture 14 slides.pdf' }] : hist && ok ? db.pages.versions(id) : null;
  const make = st.make || (mock && view === 'Make a card' ? { front: '', back: 'Glycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.' } : null);
  const plain = s => String(s || '').split('\\n').filter(l => !/^:::|^::(card|page) /.test(l)).map(l => l.replace(/^#+\\s*|^\\s*[-*+]\\s+|^\\s*\\d+\\.\\s+/, '').replace(/\\*\\*|__|\`/g, '')).join(' ').replace(/\\s+/g, ' ').trim();
  const cardInfo = cid => { const c = mock ? { front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix', srs: { lapses: 2 } } : db.card(cid); return c ? { front: plain(c.front || c.text), back: plain(c.back), weak: !!c.srs && ((c.srs.lapses || 0) > 0 || c.srs.state === 'relearning') } : null; };
  const pageInfo = pid => { if (mock) return { title: 'The cell at a glance', kind: 'mindmap' }; const x = db.pages.page(pid); return x ? { title: x.title, kind: x.kind } : null; };
  const image = s => (/^\\/media\\/[\\w-]+\\.(png|jpe?g|gif|webp)$/i.test(s) ? s : '');
  return { t, ...chrome, dark: !!p.dark, dim: !!p.dim, canEdit, scopeName, backHref, title: ok ? pg.title : '', readOnly: ok && !canEdit, version: ok ? pg.version : '',
    versionLine: ok ? 'v' + pg.version + ' · ' + who(pg.by) + ', ' + ago(pg.updated) : '',
    saveLabel: sv.err ? 'Not saved: ' + sv.err : sv.busy ? 'Saving…' : '', saveColor: sv.err ? t.again : t.muted,
    setTitle: e => { if (mock || !canEdit) return; db.pages.edit(id, { title: e && e.target ? e.target.value : '' }); },
    titleRef: el => { if (el && p.fresh && !mock && this._titled !== id) { this._titled = id; el.focus(); } },
    showPage: ok, statusOpen: !ok, statusLine: loading ? 'One moment…' : 'This page isn’t here any more.',
    conflictOpen: !!cf, conflictLine: cf ? who(cf.by) + ' changed this page while you were writing (v' + cf.theirs + '). Both are kept: what you wrote is on top of it, in v' + cf.mine + '.' : '', dismissConflict: () => { if (!mock) db.pages.clearConflict(id); },
    moreOpen: !!st.more, moreExpanded: st.more ? 'true' : 'false', moreBg: st.more ? t.surf : 'transparent', toggleMore: () => this.setState({ more: !st.more }),
    histOpen: hist, histPressed: hist ? 'true' : 'false', histBg: hist ? t.surf : 'transparent', toggleHist: () => this.setState({ hist: !hist, more: false }), openHist: () => this.setState({ hist: true, more: false }), histLoading: hist && vl === null,
    vers: (vl || []).map((v, i) => ({ n: v.version, who: who(v.by), ai: !!v.ai, when: ago(v.at), what: v.summary || '', hasWhat: !!v.summary, old: i > 0, bg: i ? t.surf : 'transparent',
      restore: async () => { if (mock) return; await db.pages.restore(id, v.version); this.setState({ hist: false }); } })),
    deletePage: async () => { this.setState({ more: false }); if (mock || !(await db.ask({ title: 'Delete the page “' + (pg.title || 'Untitled') + '”?', action: 'Delete page', danger: true }))) return; await db.pages.remove(id); db.act.go(backHref, true); },
    makeOpen: !!make, makeFront: make ? make.front : '', makeBack: make ? make.back : '',
    setFront: e => { this._front = e && e.target ? e.target.value : ''; }, setBack: e => { this._back = e && e.target ? e.target.value : ''; },
    frontRef: el => { if (el && this._focusFront) { this._focusFront = false; el.focus(); } },
    closeMake: () => this.setState({ make: null }),
    addCard: async () => { if (mock || !deck) return this.setState({ make: null }); const front = (this._front ?? make.front).trim(), back = (this._back ?? make.back).trim(); if (!front || !back) return db.say('A card needs a front and a back.'); await db.act.addCard(deck.id, { kind: 'basic', front, back }); this.setState({ make: null }); db.say('Added to ' + deck.name + '.'); },
    nbRef: el => { if (!el || !ok) return; this._nbc = this.notes().mount(el, { md, titled: true, key: (mock ? 'canvas|' + view + '|' : 'page|') + id, editable: canEdit, phone: ${isPhone ? 'true' : 'false'}, outline: true, image,
      card: cardInfo, page: pageInfo, onOpenPage: pid => { if (!mock) db.act.go(db.href('page', pid)); }, onOpenCard: cid => { if (!mock && deck) db.act.go('/deck/' + deck.id + '/card/' + cid); },
      onMakeCard: canEdit && deck ? b => { this._front = undefined; this._back = undefined; this._focusFront = true; this.setState({ make: { front: '', back: plain(b && b.markdown) } }); } : undefined,
      onChange: canEdit && !mock ? v => db.pages.editMarkdown(id, v) : undefined }); }
  };
}`;
  const props = { ...DARK, view: { editor: 'enum', default: 'Writing', options: PAGE_VIEWS }, pageId: { editor: 'string', default: '' }, fresh: { editor: 'boolean', default: false } };
  return {
    'WebPage': ['Web · A page (a Note)', web, { props, logic: logic(false), css: GUIDE_CSS, w: W, h: HH }],
    'PhonePage': ['iPhone · A page (a Note)', phone, { props, logic: logic(true), css: GUIDE_CSS, w: PW, h: PH }]
  };
}
