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
