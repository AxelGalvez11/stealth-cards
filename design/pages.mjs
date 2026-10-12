// Pages: what a deck (or a folder) holds beside its cards, each of a kind (a Note, a Presentation, a Mind map, a Canvas, a
// Diagram, a Doc), versioned, and written by the learner or by their AI app over MCP (the owner, 2026-10-11: "AI-native for
// agents ... the way Claude Artifacts work, but specific to studying"). These boards are the design, drawn first for the
// owner to approve (step 1 of the approved plan: the deck's Pages and the Note page); the app's screens follow them.
//   - PagesWeb / PagesPhone: the deck's Pages tab (in place of Notes): each page's kind, title, who changed it last and when,
//     its version, and New page (its menu of kinds).
//   - NoteWeb / NotePhone: a Note page with the new blocks (callout: trap, pearl, mnemonic; chain a → b → c; a card from the
//     deck; another page shown inside; a table; a toggle), its version and who wrote it, Make a card from any block, older
//     versions (by whom, Restore), and what shows when the learner's AI changed the page while it was open.
// Step 4a (design/specs/step4-maps.md, design/maps.mjs) adds the Mind map: New page's second step for it, its rows' last test, a map
// shown inside a Note (drawn by the real engine, web/maps.js), and the Mind map page itself in WebPage / PhonePage.
import { MINDMAP_VIEWS, MAP_SAMPLE, MAP_ICONS as EXTRA_ICONS, mapPage } from './maps.mjs';
import { PAGE_READY } from '../web/pages.mjs';
export const PAGES_VIEWS = ['List', 'New page menu', 'New mind map', 'Empty deck'];
export const NOTE_VIEWS = ['Reading', 'A map inside', 'Make a card from a block', 'Older versions', 'Changed by your AI'];
// The kinds the apps can show (web/pages.mjs PAGE_READY, the one list), and the ones these boards draw ahead of them for the owner to
// approve. LUCIDA_PAGES_READY (a comma list, like "note,mindmap") builds the app's screens with more kinds, to try one on this computer
// before PAGE_READY has it; without it they go by PAGE_READY.
const READY = process.env.LUCIDA_PAGES_READY ? process.env.LUCIDA_PAGES_READY.split(',').map(x => x.trim()).filter(Boolean) : [...PAGE_READY], DESIGN_READY = ['note', 'mindmap'];
// A Mind map row's second line: when it was last tested (S.mapMarks, no page fetch), as 'Mind map · tested yesterday'.
const TESTED_JS = `const dayWord = ms => { const d = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? new Date(ms).toLocaleDateString('en-US', { weekday: 'short' }) : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    const testedLine = (kind, mk) => kind === 'mindmap' ? ' · ' + (mk && mk.at ? 'tested ' + dayWord(mk.at) : 'not tested yet') : '';`;

// A menu's raised colors (design/maps.mjs raisedOf): the page's own in the light; in the dark a gray a step above the black page.
const POP_JS = `const lift = (c, a) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c)); if (!m) return c; const v = parseInt(m[1], 16); return '#' + [v >> 16 & 255, v >> 8 & 255, v & 255].map(x => Math.round(x + (255 - x) * a).toString(16).padStart(2, '0')).join(''); };
    const popDark = (() => { const m = /^#([0-9a-f]{6})$/i.exec(String(t.bg)); if (!m) return false; const v = parseInt(m[1], 16); return (v >> 16 & 255) * 0.299 + (v >> 8 & 255) * 0.587 + (v & 255) * 0.114 < 128; })();
    const pop = popDark ? { bg: lift(t.bg, 0.1), surf: lift(t.bg, 0.19), line: lift(t.bg, 0.2) } : { bg: t.bg, surf: t.surf, line: t.line };`;

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

// New page › Mind map's second step (§7.3): a blank map, or one Lucida AI makes from the deck's cards (it opens the Make sheet with
// Mind map chosen, and the map arrives linked to the cards). `P` is where its values are ('gs.pg.' on the deck page).
function mindmapStep(H) {
  const { svg, I } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const opt = (handler, ic, name, line, P) => `<button type="button" role="menuitem" onClick="{{${handler}}}" style="min-height: 56px; padding: 6px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 12px; background: transparent; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: {{${P}pop.surf}}; display: flex; align-items: center; justify-content: center;">${icon(ic, 16, 2)}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600;">${name}</span><span style="font-size: 13px; color: {{t.muted}};">${line}</span></span></button>`;
  return (P, width, z) => `<sc-if value="{{${P}stepOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="New mind map" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: ${z}; width: ${width}px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{${P}pop.bg}}; box-shadow: 0 0 0 1px {{${P}pop.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; gap: 6px; padding: 2px 4px 6px;"><button type="button" onClick="{{${P}stepBack}}" aria-label="Back to the kinds" style="width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 16px; background: {{${P}pop.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('back', 14, 2.2)}</button><span style="font-size: 14px; font-weight: 600;">New mind map</span></div>
      ${opt(P + 'blank', 'mindmap', 'Blank map', 'Start from the topic, then add ideas', P)}
      ${opt(P + 'fromCards', 'sparkle', 'From this deck’s cards', '{{' + P + 'aiLeft}}', P)}
      <div style="margin: 4px 6px; padding: 10px 4px 4px; border-top: 1px solid {{${P}pop.line}}; font-size: 12px; line-height: 1.45; color: {{t.muted}};">Lucida AI makes the map from your cards, each idea linked to the cards it came from, so Weak spots works the first time you open it.</div>
    </div></sc-if>`;
}

// The deck page's Pages tab (its section, under the tabs): each page with its kind, who changed it last, when and its version; New page
// opens the kinds (only the ones the apps can show yet can be made). `gs` comes from design/materials.mjs's deck logic, and this adds to it.
export function deckPagesBlock(H, phone) {
  const { svg, I } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const mindStep = mindmapStep(H);
  const kindIcon = v => PAGE_KINDS.map(k => `<sc-if value="{{${v}.is_${k.kind}}}" hint-placeholder-val="{{ false }}">${icon(k.icon, 16, 2)}</sc-if>`).join('');
  return `<sc-if value="{{gs.pagesShow}}" hint-placeholder-val="{{ false }}">
    <section aria-label="Pages" style="min-width: 0; display: flex; flex-direction: column;">
      <sc-if value="{{gs.pg.canNew}}" hint-placeholder-val="{{ true }}"><div style="display: flex; justify-content: flex-end; padding: 10px 0;"><div style="position: relative;">
        <button type="button" onClick="{{gs.pg.toggleNew}}" aria-haspopup="menu" aria-expanded="{{gs.pg.newExpanded}}" class="sc-press" style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${icon('plus', 14, 2.4)}New page</button>
        <sc-if value="{{gs.pg.newOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="New page" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 40; width: ${phone ? 300 : 320}px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{gs.pg.pop.bg}}; box-shadow: 0 0 0 1px {{gs.pg.pop.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">
          <sc-for list="{{gs.pg.kinds}}" as="k" hint-placeholder-count="6"><button type="button" role="menuitem" onClick="{{k.pick}}" aria-disabled="{{k.disabled}}" style="min-height: 52px; padding: 6px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 12px; background: transparent; color: {{k.fg}}; font: inherit; text-align: left; cursor: {{k.cursor}};"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: {{gs.pg.pop.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('k')}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600;">{{k.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{k.line}}</span></span><sc-if value="{{k.soon}}" hint-placeholder-val="{{ false }}"><span style="font-size: 11px; font-weight: 600; color: {{t.muted}};">Soon</span></sc-if></button></sc-for>
          <div style="margin: 4px 6px; padding: 10px 4px 4px; border-top: 1px solid {{gs.pg.pop.line}}; display: flex; gap: 8px; font-size: 12px; line-height: 1.45; color: {{t.muted}};"><span style="flex-shrink: 0;">${icon('sparkle', 13, 2)}</span><span>Your AI can make pages too: ask it in Claude or ChatGPT once Lucida is connected.</span></div>
        </div></sc-if>${mindStep('gs.pg.', phone ? 300 : 320, 40)}
      </div></div></sc-if>
      <sc-if value="{{gs.pg.none}}" hint-placeholder-val="{{ false }}"><div style="padding: ${phone ? '24px 18px' : '32px 28px'}; border-radius: 22px; background: {{t.surf}}; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;"><span style="font-size: 16px; font-weight: 600;">No pages yet</span><span style="max-width: 420px; font-size: 14px; line-height: 1.5; color: {{t.muted}};">Notes, mind maps and more beside the cards. Make one here, or ask your AI: “Make a mind map of this deck in Lucida.”</span></div></sc-if>
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
    const KN = ${JSON.stringify(PAGE_KINDS)}, list = gs.pagesList || [], is = kind => Object.fromEntries(KN.map(k => ['is_' + k.kind, k.kind === kind]));
    ${TESTED_JS}
    const NAME = Object.fromEntries(KN.map(k => [k.kind, k.name])), ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    const by = new Map(list.map(x => [x.id, x])), depthOf = x => { let d = 0; for (let q = x; q && q.parent && by.has(q.parent) && d < 6; q = by.get(q.parent)) d++; return d; };
    const ordered = [], seen = new Set(), walk = x => { if (seen.has(x.id)) return; seen.add(x.id); ordered.push(x); list.filter(y => y.parent === x.id).forEach(walk); };
    list.filter(x => !x.parent || !by.has(x.parent)).forEach(walk);
    const mock = !!db.mock, READY = mock ? ${JSON.stringify(DESIGN_READY)} : ${JSON.stringify(READY)}, step = this.state.newPage === 'mindmap', open = !!this.state.newPage && !step, canNew = !!gs.pagesCan;
    ${POP_JS}
    const make = async kind => { this.setState({ newPage: false }); if (mock || !READY.includes(kind)) return; try { const pg = await db.pages.create('deck', dk.id, { kind, title: '' }); db.act.go(db.href('page', pg.id) + '?new=1'); } catch (e) { db.say(e.message); } };
    // (a Mind map has a second step: a blank map, or one Lucida AI makes from the deck's cards)
    const marksOf = x => (db.mapMarks ? db.mapMarks(x.id) : mock && x.kind === 'mindmap' ? { at: Date.now() - 864e5 } : null);
    gs.pg = { canNew, none: !list.length && (mock ? false : db.pages.loaded('deck', dk.id)), newOpen: open, newExpanded: open || step ? 'true' : 'false', toggleNew: () => this.setState({ newPage: open || step ? false : true }),
      kinds: KN.map(k => { const ready = READY.includes(k.kind); return { ...k, ...is(k.kind), soon: !ready, disabled: ready ? 'false' : 'true', fg: ready ? t.text : t.muted, cursor: ready ? 'pointer' : 'default', pick: () => (ready && k.kind === 'mindmap' ? this.setState({ newPage: 'mindmap' }) : make(k.kind)) }; }),
      stepOpen: step, stepBack: () => this.setState({ newPage: true }), blank: () => make('mindmap'), fromCards: () => { this.setState({ newPage: false }); if (!mock && db.diagrams) { db.diagrams.openSheet(dk.id); db.diagrams.setType('mindmap'); } }, pop,
      aiLeft: (() => { const left = mock ? 2 : db.diagrams && typeof db.diagrams.left === 'function' ? db.diagrams.left() : null; return typeof left === 'number' ? 'Lucida AI (' + left + ' left today)' : 'Lucida AI'; })(),
      rows: ordered.map(x => ({ ...is(x.kind), title: x.title || 'Untitled', sub: (NAME[x.kind] || 'Page') + testedLine(x.kind, marksOf(x)), who: x.by === 'you' ? 'You' : x.by || 'You', ai: !!x.ai, when: ago(x.updated), v: x.version, indent: depthOf(x) * ${phone ? 20 : 28} + 'px',
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
      <sc-if value="{{r.showMeta}}" hint-placeholder-val="{{ true }}"><span style="flex-shrink: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: {{t.muted}};"><sc-if value="{{r.ai}}" hint-placeholder-val="{{ false }}"><span aria-hidden="true">${icon('sparkle', 13, 2)}</span></sc-if>${phone ? '' : '<span>{{r.who}} · {{r.when}}</span>'}<span style="height: 22px; padding: 0 8px; display: inline-flex; align-items: center; border-radius: 11px; background: {{t.surf}}; font-size: 12px; font-weight: 600; color: {{t.text}};">v{{r.v}}</span></span></sc-if>
    </button></sc-for>`;
  // New page: Lucida's own menu of kinds (each its icon, name and one line).
  const kindMenu = `<sc-if value="{{menuOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="New page" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 320px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{pop.bg}}; box-shadow: 0 0 0 1px {{pop.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;">
      <sc-for list="{{kinds}}" as="k" hint-placeholder-count="6"><button type="button" role="menuitem" onClick="{{k.pick}}" aria-disabled="{{k.disabled}}" style="min-height: 52px; padding: 6px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 12px; background: transparent; color: {{k.fg}}; font: inherit; text-align: left; cursor: {{k.cursor}};"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: {{pop.surf}}; display: flex; align-items: center; justify-content: center;">${kindIcon('k')}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600;">{{k.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{k.line}}</span></span><sc-if value="{{k.soon}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Soon</span></sc-if></button></sc-for>
      <div style="margin: 4px 6px 4px; padding: 10px 4px 4px; border-top: 1px solid {{pop.line}}; display: flex; gap: 8px; font-size: 12px; line-height: 1.45; color: {{t.muted}};"><span style="flex-shrink: 0;">${icon('sparkle', 13, 2)}</span><span>Your AI can make any of these too: ask it in Claude or ChatGPT once Lucida is connected.</span></div>
    </div></sc-if>`;
  const newBtn = `<div style="position: relative; flex-shrink: 0;"><button type="button" onClick="{{toggleMenu}}" aria-haspopup="menu" aria-expanded="{{menuExpanded}}" class="sc-press" style="${PILL} background: {{t.inv}}; color: {{t.invText}};">${icon('plus', 14, 2.4)}New page</button>${kindMenu}${mindmapStep(H)('', 320, 50)}</div>`;
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
  ${POP_JS}
  const p = this.props, view = p.view || 'List', none = view === 'Empty deck', is = kind => Object.fromEntries(${JSON.stringify(PAGE_KINDS.map(k => k.kind))}.map(x => ['is_' + x, x === kind]));
  // (what's open: New page's kinds, the Mind map's second step, or nothing)
  const m = this.state.menu === null ? (view === 'New page menu' ? 'kinds' : view === 'New mind map' ? 'mindmap' : '') : this.state.menu, KIND = ${JSON.stringify(Object.fromEntries(PAGE_KINDS.map(k => [k.kind, k.name])))};
  ${TESTED_JS}
  const rows = none ? [] : ${JSON.stringify(SAMPLE)}.map(r => ({ ...r, ...is(r.kind), sub: KIND[r.kind] + (r.kind === 'note' && r.depth ? ' · inside Guide' : '') + testedLine(r.kind, r.kind === 'mindmap' ? { at: Date.now() - 864e5 } : null), indent: (r.depth * 28) + 'px', showMeta: true }));
  const READY = ${JSON.stringify(DESIGN_READY)};
  return { t, ...chrome, pop, rows, isEmpty: none, kinds: ${JSON.stringify(PAGE_KINDS)}.map(k => { const ready = READY.includes(k.kind); return { ...k, ...is(k.kind), soon: !ready, disabled: ready ? 'false' : 'true', fg: ready ? t.text : t.muted, cursor: ready ? 'pointer' : 'default', pick: () => this.setState({ menu: ready && k.kind === 'mindmap' ? 'mindmap' : '' }) }; }),
    stepOpen: m === 'mindmap', stepBack: () => this.setState({ menu: 'kinds' }), blank: () => this.setState({ menu: '' }), fromCards: () => this.setState({ menu: '' }), aiLeft: 'Lucida AI (2 left today)',
    menuOpen: m === 'kinds', menuExpanded: m ? 'true' : 'false', toggleMenu: () => this.setState({ menu: m ? '' : 'kinds' }),
    tabs: ['Cards', 'Pages', 'Sources'].map(n => ({ name: n, on: n === 'Pages' ? 'true' : 'false', bg: n === 'Pages' ? t.surf : 'transparent', fg: n === 'Pages' ? t.text : t.muted })) };
}`;

  // ---------- a Note page ----------
  // Each block is drawn as the app will draw it. A callout's kind gives it its color (a trap: the again red; a pearl: the good green;
  // a mnemonic: the hard amber) and its label; a chain is pills with arrows; a card from the deck shows its front and back, and its
  // weak mark when the learner keeps missing it; a page inside shows the other page's preview (here a mind map) and opens it.
  const callout = (kind, label, text) => `<div data-block style="position: relative; padding: 14px 16px; border-radius: 16px; background: {{c.${kind}Bg}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: {{c.${kind}}};">${label}</span><span style="font-size: 16px; line-height: 1.6;">${text}</span></div>`;
  const chain = steps => `<div data-block style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">${steps.map((s, i) => (i ? `<span aria-hidden="true" style="color: {{t.muted}};">${icon('chev', 14, 2.2)}</span>` : '') + `<span style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: 17px; background: {{t.surf}}; font-size: 14px; font-weight: 600;">${s}</span>`).join('')}</div>`;
  const cardRef = `<div data-block style="display: flex; align-items: stretch; border-radius: 16px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden;"><div style="flex: 1 1 0; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Card · front</span><span style="font-size: 15px; font-weight: 600;">Where does the Krebs cycle happen?</span></div><div style="flex: 1 1 0; padding: 14px 16px; border-left: 1px solid {{t.line}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 12px; font-weight: 600; color: {{t.muted}};">Back</span><span style="font-size: 15px;">The mitochondrial matrix</span></div><span style="align-self: center; margin: 0 14px; height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 12px; background: {{t.againTint}}; color: {{t.again}}; font-size: 12px; font-weight: 600; white-space: nowrap;">Weak spot</span></div>`;
  // A map inside a Note (§9.1): the page's preview, laid out by web/maps.js (the topic and its main ideas, never so small its words
  // can't be read), and a line under it with the ideas, the weak ones and Test me (its own button: it opens the page testing the
  // weak ones); the rest of the box opens the page.
  const embed = phone => `<div data-block style="position: relative; border-radius: 18px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden;"><a href="{{embedHref}}" aria-label="Open the mind map The cell at a glance" style="position: absolute; inset: 0; z-index: 0; border-radius: 18px;"></a><div ref="{{embedRef}}" data-sc-own aria-hidden="true" style="position: relative; height: ${phone ? 120 : 150}px; background: {{t.surf}}; pointer-events: none;"></div>
      <div style="position: relative; padding: ${phone ? '8px 8px 8px 14px' : '10px 10px 10px 16px'}; display: flex; align-items: center; gap: 10px; pointer-events: none;"><span style="display: flex; color: {{t.muted}};">${icon('mindmap', 16, 2)}</span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: ${phone ? 'column' : 'row'}; ${phone ? 'gap: 1px;' : 'align-items: baseline; gap: 10px;'}"><span style="font-size: ${phone ? 15 : 14}px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">The cell at a glance</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap;">Mind map · {{embedIdeas}} ideas · <span style="color: {{t.again}}; font-weight: 600;">{{embedWeak}} weak</span></span></span><button type="button" onClick="{{embedTest}}" aria-label="Test me on the weak ideas of The cell at a glance" class="sc-press" style="${PILL} position: relative; z-index: 1; pointer-events: auto; height: ${phone ? 44 : 32}px; padding: 0 14px; font-size: 13px; background: {{t.inv}}; color: {{t.invText}};">Test me</button></div></div>`;
  // ... while it loads, and a page that isn't there any more.
  const embedMore = phone => `<sc-if value="{{mapInside}}" hint-placeholder-val="{{ false }}"><div data-block aria-busy="true" style="border-radius: 18px; box-shadow: 0 0 0 1px {{t.line}}; overflow: hidden;"><div style="height: ${phone ? 120 : 150}px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; gap: ${phone ? 8 : 14}px;"><span style="width: ${phone ? 52 : 76}px; height: 26px; border-radius: 13px; background: {{t.surf2}};"></span><span style="width: ${phone ? 28 : 56}px; height: 2px; background: {{t.surf2}};"></span><span style="width: ${phone ? 72 : 96}px; height: 30px; border-radius: 15px; background: {{t.surf2}};"></span><span style="width: ${phone ? 28 : 56}px; height: 2px; background: {{t.surf2}};"></span><span style="width: ${phone ? 52 : 76}px; height: 26px; border-radius: 13px; background: {{t.surf2}};"></span></div><div style="height: ${phone ? 60 : 52}px; padding: 0 16px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: {{t.muted}};"><span style="display: flex;">${icon('mindmap', 16, 2)}</span>One moment…</div></div>
      <div data-block style="min-height: ${phone ? 60 : 52}px; box-sizing: border-box; padding: 0 16px; border-radius: 18px; box-shadow: inset 0 0 0 1.5px {{t.line}}; display: flex; align-items: center; gap: 10px; font-size: 14px; color: {{t.muted}};"><span style="display: flex;">${icon('mindmap', 16, 2)}</span>Page not found</div></sc-if>`;
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
      <h2 data-embeds style="margin: 8px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">The whole picture</h2>
      ${embed(phone)}${embedMore(phone)}
      <h2 style="margin: 8px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">From your cards</h2>
      ${cardRef}
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
    <div ref="{{scrollRef}}" style="flex-grow: 1; min-width: 0; overflow-y: auto;"><div style="max-width: 728px; margin: 0 auto; padding: 30px 54px 140px; box-sizing: border-box;">${body(false)}</div></div>
    ${versions(false)}
  </div>
</main>
</div>`;
  const notePhone = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding-top: 52px; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    ${noteHeader(true)}
    <div ref="{{scrollRef}}" style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;"><div style="padding: 10px 20px 120px; box-sizing: border-box;">${body(true)}</div></div>
    ${versions(true)}${makeSheet(true)}
  </div>`;
  const VERS = [
    { n: 12, who: 'You', ai: false, when: 'Yesterday, 9:40 PM', what: 'Added the table of stages' },
    { n: 11, who: 'Claude', ai: true, when: 'Yesterday, 9:12 PM', what: 'Added the trap and the pearl, linked 2 weak cards' },
    { n: 10, who: 'You', ai: false, when: 'Oct 9', what: 'Rewrote the opening line' },
    { n: 9, who: 'ChatGPT', ai: true, when: 'Oct 8', what: 'Made the page from Lecture 14 slides.pdf' }
  ];
  const noteLogic = phone => `
constructor(props) { super(props); this.state = { hist: null }; }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, view = p.view || 'Reading', hist = this.state.hist === null ? view === 'Older versions' : this.state.hist;
  // the Mind map shown inside: the topic and its main ideas, at ${phone ? '12 pt' : '11 px'} or more, cut around the topic where it doesn't fit (both
  // sides even on a phone: one-sided, its six main ideas would stand in a column far taller than the box)
  const M = this.maps(), A = this.mapArt(), DATA = ${JSON.stringify(MAP_SAMPLE.data)}, ST = A.studyOf(M, DATA);
  const P = A.previewModel(M, DATA, { w: ${phone ? 350 : 620}, h: ${phone ? 120 : 150}, side: 'both', tones: ST.tones, title: ${JSON.stringify(MAP_SAMPLE.title)}, least: ${phone ? 12 : 11} });
  return { t, ...chrome, embedRef: A.refOf(A.preview(P, t, t.surf)), embedIdeas: String(ST.ideas), embedWeak: String(ST.weak), mapInside: view === 'A map inside',
    embedHref: '${phone ? 'PhonePage' : 'WebPage'}.dc.html', embedTest: () => {},
    scrollRef: el => { if (!el || view !== 'A map inside' || el.__at === view) return; el.__at = view; const go = () => { const h = el.querySelector('[data-embeds]'); if (h) el.scrollTop += h.getBoundingClientRect().top - el.getBoundingClientRect().top - 24; }; go(); setTimeout(go, 60); },
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
    'NoteWeb': ['Web · Note page (design)', noteWeb, { props: np, logic: noteLogic(false), w: W, h: HH }],
    'NotePhone': ['iPhone · Note page (design)', notePhone, { props: np, logic: noteLogic(true), w: PW, h: PH }]
  };
}

// ---------- the Note page itself (the app's screen: /page/<id>) ----------
// The page's deck (back to its Pages), the title (pressed to rename it), what's saving, its version (Versions beside the page: who
// wrote each, Restore), and ⋯ (Delete page). The Note is web/notes.js, the Guide's editor, with the Note blocks; a card block shows
// the deck's card and whether the learner keeps missing it, another page shows inside as a box that opens it, and + Card on a block
// makes a card from it. When the learner's AI changed the page while it was being written, both are kept and a line says so.
const NOTE_SAMPLE_MD = '# Cellular respiration\n\nCells turn glucose into ATP in three stages. Most of the ATP comes from the last one, on the inner membrane of the mitochondrion.\n\n:::chain\nGlycolysis\nPyruvate\nAcetyl-CoA\nKrebs cycle\nElectron transport\n:::\n\n:::trap\nGlycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.\n:::\n\n:::pearl\nOxygen is the last electron acceptor: no O₂, no electron transport, almost no ATP.\n:::\n\n:::mnemonic\n“Can I Keep Selling Seashells For Money, Officer?”: the Krebs cycle’s steps in order.\n:::\n\n## Where each stage happens\n\n| Stage | Where | ATP made |\n| --- | --- | --- |\n| Glycolysis | Cytoplasm | 2 |\n| Krebs cycle | Matrix | 2 |\n| Electron transport | Inner membrane | ~34 |\n\n:::toggle Why does cyanide stop it?\nIt blocks complex IV, so oxygen can’t take the electrons and the chain stops.\n:::\n\n## The whole picture\n\n::page ps2\n\n## From your cards\n\n::card c1\n';
// A page of a kind this app can't show yet says so (and never opens as an empty Note); the Mind map's states follow (design/maps.mjs).
export const PAGE_VIEWS = ['Writing', 'Versions', 'Changed by your AI', 'Make a card', 'Needs an update', ...MINDMAP_VIEWS];
export function pageBoards(H) {
  const { svg, I, FONT, T, DB_JS, DARK, W, HH, PW, PH, sidebar, NOTES_VARS, GUIDE_CSS, MAP_CSS } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name] || EXTRA_ICONS[name], size, w);
  const PILL = 'height: 36px; flex-shrink: 0; box-sizing: border-box; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;';
  const MW = mapPage(H, false), MP = mapPage(H, true);
  const item = (handler, ic, label, danger) => `<button type="button" role="menuitem" onClick="{{${handler}}}" style="height: 40px; padding: 0 10px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: transparent; color: ${danger ? '{{t.again}}' : '{{t.text}}'}; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;">${icon(ic, 16, 2)}<span>${label}</span></button>`;
  const more = `<sc-if value="{{canEdit}}" hint-placeholder-val="{{ true }}"><div style="position: relative; flex-shrink: 0;"><button type="button" onClick="{{toggleMore}}" aria-label="More" aria-haspopup="menu" aria-expanded="{{moreExpanded}}" style="${PILL} width: 36px; padding: 0; justify-content: center; background: {{moreBg}}; color: {{t.text}};">${icon('more', 18, 2)}</button>
      <sc-if value="{{moreOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="More" data-sc-pop style="position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 220px; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px;"><sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}">${item('mp.foldAllDo', 'fold', '{{mp.foldAll}}')}${item('mp.makeAgain', 'sparkle', 'Make again from the cards')}</sc-if>${item('openHist', 'history', 'Versions')}${item('deletePage', 'bin', 'Delete page', true)}</div></sc-if></div></sc-if>`;
  const verBtn = phone => `<button type="button" onClick="{{toggleHist}}" aria-pressed="{{histPressed}}" style="${PILL} background: {{histBg}}; color: {{t.text}};"><span style="display: flex;">${icon('history', 14, 2)}</span>${phone ? 'v{{version}}' : '{{versionLine}}'}</button>`;
  const saving = `<span aria-live="polite" style="flex-shrink: 0; font-size: 13px; color: {{saveColor}}; white-space: nowrap;">{{saveLabel}}</span>`;
  const header = phone => `<header style="height: ${phone ? 52 : 64}px; flex-shrink: 0; box-sizing: border-box; padding: 0 ${phone ? 12 : 20}px 0 ${phone ? 12 : 24}px; display: flex; align-items: center; gap: 8px; ${phone ? '' : 'border-bottom: 1px solid {{t.line}};'}">
      <a href="{{backHref}}" aria-label="Back to {{scopeName}}" style="${PILL} max-width: ${phone ? 170 : 280}px; padding: 0 14px 0 10px; background: {{t.surf}}; color: {{t.text}};">${icon('back', 14, 2.2)}<span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">{{scopeName}}</span></a>
      <span style="flex-grow: 1;"></span>${saving}${phone ? '' : `<sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}">${MW.testPill}</sc-if>`}${verBtn(phone)}${more}
    </header>`;
  const banner = `<sc-if value="{{conflictOpen}}" hint-placeholder-val="{{ false }}"><div role="status" style="margin-bottom: 18px; padding: 12px 14px; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; gap: 10px; font-size: 14px;"><span style="display: flex;">${icon('sparkle', 15, 2)}</span><span style="flex-grow: 1; line-height: 1.45;">{{conflictLine}}</span><button type="button" onClick="{{openHist}}" class="sc-press" style="${PILL} height: 30px; font-size: 12px; background: {{t.bg}}; color: {{t.text}};">Versions</button><button type="button" onClick="{{dismissConflict}}" aria-label="Dismiss" style="${PILL} width: 30px; height: 30px; padding: 0; justify-content: center; background: transparent; color: {{t.muted}};">${icon('close', 14, 2)}</button></div></sc-if>`;
  const TITLE = phone => `display: block; width: 100%; box-sizing: border-box; margin: 0 0 ${phone ? 10 : 14}px; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: ${phone ? 28 : 36}px; font-weight: 600; letter-spacing: -.03em;`;
  const title = phone => `<sc-if value="{{canEdit}}" hint-placeholder-val="{{ true }}"><input type="text" value="{{title}}" onChange="{{setTitle}}" ref="{{titleRef}}" aria-label="Page title" placeholder="Untitled" autocomplete="off" style="${TITLE(phone)}"></sc-if><sc-if value="{{readOnly}}" hint-placeholder-val="{{ false }}"><h1 style="${TITLE(phone)}">{{title}}</h1></sc-if>`;
  const makeSheet = phone => `<sc-if value="{{makeOpen}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="New card from this block" data-sc-pop style="${phone ? 'position: absolute; left: 0; right: 0; bottom: 0; border-radius: 24px 24px 0 0; padding: 18px 16px 34px;' : 'position: absolute; right: 24px; bottom: 24px; width: 380px; border-radius: 20px; padding: 16px;'} z-index: 60; box-sizing: border-box; background: {{te.bg}}; box-shadow: 0 0 0 1px {{te.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 10px;">${phone ? '<span aria-hidden="true" style="align-self: center; width: 36px; height: 5px; margin: -8px 0 -2px; border-radius: 3px; background: {{te.line}};"></span>' : ''}
      <span style="font-size: ${phone ? 17 : 15}px; font-weight: 600;">{{makeTitle}}</span>
      <label style="padding: 10px 14px; border-radius: 14px; background: {{te.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: ${phone ? 13 : 12}px; font-weight: 600; color: {{t.muted}};">Front</span><textarea rows="2" onChange="{{setFront}}" ref="{{frontRef}}" placeholder="A question" style="border: 0; outline: 0; resize: none; background: transparent; color: {{t.text}}; font: inherit; font-size: ${phone ? 16 : 15}px;">{{makeFront}}</textarea></label>
      <label style="padding: 10px 14px; border-radius: 14px; background: {{te.surf}}; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: ${phone ? 13 : 12}px; font-weight: 600; color: {{t.muted}};">Back</span><textarea rows="{{makeRows}}" onChange="{{setBack}}" placeholder="The answer" style="border: 0; outline: 0; resize: none; background: transparent; color: {{t.text}}; font: inherit; font-size: ${phone ? 16 : 15}px; line-height: 1.45;">{{makeBack}}</textarea></label>
      <span style="font-size: ${phone ? 13 : 12}px; color: {{t.muted}};">{{makeNote}}</span>
      <div style="display: flex; gap: 8px; justify-content: flex-end;"><button type="button" onClick="{{closeMake}}" class="sc-press" style="${PILL} ${phone ? 'flex: 1 1 0; height: 48px; font-size: 15px;' : ''} background: {{te.surf}}; color: {{t.text}};">Cancel</button><button type="button" onClick="{{addCard}}" class="sc-press" style="${PILL} ${phone ? 'flex: 2 1 0; height: 48px; font-size: 15px;' : ''} background: {{t.inv}}; color: {{t.invText}};">Add to {{scopeName}}</button></div>
    </div></sc-if>${phone ? '' : ''}`;
  const versions = phone => `<sc-if value="{{histOpen}}" hint-placeholder-val="{{ false }}"><aside aria-label="Versions" style="${phone ? 'position: absolute; inset: 104px 0 0 0; z-index: 40; padding: 16px;' : 'width: 320px; flex-shrink: 0; padding: 24px 20px; border-left: 1px solid {{t.line}};'} box-sizing: border-box; background: {{t.bg}}; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
      <div style="display: flex; align-items: center;"><span style="flex-grow: 1; font-size: 17px; font-weight: 600;">Versions</span><button type="button" onClick="{{toggleHist}}" aria-label="Close versions" style="${PILL} width: 32px; height: 32px; padding: 0; justify-content: center; background: transparent; color: {{t.text}};">${icon('close', 15, 2)}</button></div>
      <span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">Every save is one. Restoring one keeps what’s there now too.</span>
      <sc-if value="{{histLoading}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; color: {{t.muted}};">One moment…</span></sc-if>
      <sc-for list="{{vers}}" as="v" hint-placeholder-count="3"><div style="padding: 12px 14px; border-radius: 16px; background: {{v.bg}}; display: flex; flex-direction: column; gap: 4px;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 14px; font-weight: 600;">v{{v.n}}</span><sc-if value="{{v.ai}}" hint-placeholder-val="{{ false }}"><span style="display: flex; color: {{t.muted}};">${icon('sparkle', 12, 2)}</span></sc-if><span style="flex-grow: 1; min-width: 0; font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{v.who}} · {{v.when}}</span><sc-if value="{{v.old}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{v.restore}}" aria-label="Restore version {{v.n}}" class="sc-press" style="${PILL} height: 28px; padding: 0 12px; font-size: 12px; background: {{t.inv}}; color: {{t.invText}};">Restore</button></sc-if></div><sc-if value="{{v.hasWhat}}" hint-placeholder-val="{{ true }}"><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">{{v.what}}</span></sc-if></div></sc-for>
    </aside></sc-if>`;
  const status = `<sc-if value="{{statusOpen}}" hint-placeholder-val="{{ false }}"><div style="padding: 60px 0; text-align: center; font-size: 15px; color: {{t.muted}};">{{statusLine}}</div></sc-if>`;
  const body = phone => `${banner}<sc-if value="{{showPage}}" hint-placeholder-val="{{ true }}">${title(phone)}<div ref="{{nbRef}}" data-sc-own style="${NOTES_VARS()} --gd-inv: {{t.inv}}; --gd-inv-text: {{t.invText}};"></div></sc-if>${status}`;
  // A page of a kind this app can't show yet (an older app, or a kind still to come): it says so, with Back; never an empty Note.
  const update = phone => `<sc-if value="{{updateOn}}" hint-placeholder-val="{{ false }}"><div role="status" style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: ${phone ? '40px 28px 120px' : '40px'}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center;">
      <span aria-hidden="true" style="width: 64px; height: 64px; border-radius: 32px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center;">${icon('update', 26, 2)}</span>
      <span style="max-width: ${phone ? 320 : 480}px; font-size: ${phone ? 20 : 22}px; font-weight: 600; letter-spacing: -.02em; line-height: 1.3; text-wrap: balance;">{{updateTitle}}</span>
      <span style="max-width: 360px; font-size: 15px; line-height: 1.5; color: {{t.muted}}; text-wrap: balance;">{{updateLine}}</span>
      <a href="{{backHref}}" class="sc-press" style="margin-top: 6px; height: ${phone ? 48 : 40}px; padding: 0 20px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px; font-weight: 600;">${icon('back', 14, 2.2)}Back to {{scopeName}}</a>
    </div></sc-if>`;
  const web = `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; display: flex; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
${sidebar('Library')}
<main aria-label="{{title}}" style="position: relative; flex-grow: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;">
  ${header(false)}
  <div style="flex-grow: 1; min-height: 0; display: flex;">
    <sc-if value="{{noteOn}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; min-width: 0; overflow-y: auto;"><div style="max-width: 728px; margin: 0 auto; padding: 30px 54px 140px; box-sizing: border-box;">${body(false)}</div></div></sc-if>
    <sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}"><div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column;">${MW.body}</div></sc-if>
    ${update(false)}
    ${versions(false)}
  </div>
  ${makeSheet(false)}
</main>
<sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}">${MW.over}</sc-if>
</div>`;
  const phone = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding-top: 52px; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    ${header(true)}
    <sc-if value="{{noteOn}}" hint-placeholder-val="{{ true }}"><div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;"><div style="padding: 10px 20px 120px 30px; box-sizing: border-box;">${body(true)}</div></div></sc-if>
    <sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}">${MP.body}</sc-if>
    ${update(true)}
    <sc-if value="{{mp.on}}" hint-placeholder-val="{{ false }}">${MP.over}</sc-if>
    ${versions(true)}${makeSheet(true)}
  </div>`;
  const logic = isPhone => `
constructor(props) { super(props); this.state = { hist: null, more: false, make: null }; }
componentWillUnmount() { const db = this.props.db; if (db && !db.mock && this.props.pageId) { this.mapview().leave(this.props.pageId); db.pages.flush(this.props.pageId); } }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, st = this.state, mock = !!db.mock, view = mock ? p.view || 'Writing' : '', id = p.pageId || '';
  // On the canvas a Mind map state draws the sample map (design/maps.mjs, laid out by web/maps.js); 'Needs an update' is a page of a
  // kind this app can't show. The app goes by the kinds it can show (READY): any other kind says so, and is never opened as a Note.
  const MV = mock && /^Mind map/.test(view), NU = mock && view === 'Needs an update';
  const mm = MV ? this.mapArt().model(this.maps(), { view, phone: ${isPhone ? 'true' : 'false'}, dark: !!p.dark, t, st: st.mp || {}, set: u => this.setState({ mp: { ...(this.state.mp || {}), ...u } }) }) : null;
  const pg = !mock ? db.pages.page(id) : mm ? { id: 'ps2', kind: 'mindmap', scope: 'deck', scopeId: 'cell', title: mm.page.title, version: mm.page.version, by: mm.page.by === 'You' ? 'you' : mm.page.by, ai: mm.page.ai, updated: Date.now() - (mm.page.when === 'yesterday' ? 864e5 : 6e4) }
    : NU ? { id: 'ps2', kind: 'mindmap', scope: 'deck', scopeId: 'cell', title: 'The cell at a glance', version: 3, by: 'Claude', ai: true, updated: Date.now() - 864e5 }
    : { id: 'ps1', kind: 'note', scope: 'deck', scopeId: 'cell', title: 'Cellular respiration', version: 12, by: 'you', ai: false, updated: Date.now() - 864e5 };
  const loading = pg === undefined, missing = pg === null, ok = !!pg;
  const ready = ok && (mock ? !NU && ${JSON.stringify(DESIGN_READY)}.includes(pg.kind) : ${JSON.stringify(READY)}.includes(pg.kind));
  const isNote = ready && pg.kind === 'note', isMap = ready && pg.kind === 'mindmap' && (!!mm || !mock), needsUpdate = ok && !ready;
  const KINDS = ${JSON.stringify(Object.fromEntries(PAGE_KINDS.map(k => [k.kind, k.name])))};
  const deck = ok && pg.scope === 'deck' ? db.deck(pg.scopeId) : null, folder = ok && pg.scope === 'folder' ? (db.folders() || []).find(f => f.id === pg.scopeId) : null;
  const scopeName = deck ? deck.name : folder ? folder.name : 'Library', canEdit = ok && (mock || (deck ? db.guide(deck.id).can : !!folder));
  const backHref = mock ? '${isPhone ? 'PhoneDeck' : 'WebDeck'}.dc.html' : deck ? '/deck/' + deck.id + '?tab=pages' : '/library';
  const md = mock ? ${JSON.stringify(NOTE_SAMPLE_MD)} : isNote ? db.pages.markdown(id) : '';
  const sv = mock ? { busy: false, err: '', saved: 0 } : db.pages.saving(id);
  const who = x => (!x || x === 'you' ? 'You' : x), ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const cf = mock ? (view === 'Changed by your AI' ? { by: 'Claude', ai: true, theirs: 13, mine: 14 } : null) : db.pages.conflict(id);
  const hist = st.hist === null ? view === 'Versions' : st.hist;
  // The app's Mind map (web/mapview.js): the same values the canvas's states give the markup, from the page, the deck's cards (each with
  // its tone, sched.toneOf) and the last Test me marks (S.mapMarks). Its edits go to the page's saving (web/pagesclient.js).
  const aiLeft = (() => { const left = mock ? 2 : db.diagrams && typeof db.diagrams.left === 'function' ? db.diagrams.left() : null; return typeof left === 'number' ? 'Lucida AI (' + left + ' left today)' : 'Lucida AI'; })();
  const mv = !mock && isMap ? this.mapview().model({ key: id, data: pg.data, version: pg.version, by: who(pg.by), ai: !!pg.ai, title: pg.title || '', editable: canEdit, phone: ${isPhone ? 'true' : 'false'}, t,
      cards: db.mapCards ? db.mapCards(pg.scope, pg.scopeId) : [], marks: ((db.mapMarks && db.mapMarks(id)) || {}).n || {}, deckName: scopeName, conflict: cf, clearConflict: () => db.pages.clearConflict(id),
      query: { idea: p.idea || '', test: p.test || '' }, aiLeft, making: !!st.make, rerender: () => this.forceUpdate(),
      onEdit: canEdit ? (data, summary, own, x) => db.pages.edit(id, { data, summary: own ? summary : undefined, hold: !!(x && x.hold), ...(x && x.title && !pg.title ? { title: x.title } : {}) }) : undefined,
      onMakeCard: canEdit && deck ? m => { this._front = undefined; this._back = undefined; this._focusFront = true; this.setState({ make: m }); } : undefined,
      onStudy: set => db.act.go('/review?set=' + encodeURIComponent(set)),
      onTest: (results, ids) => { if (db.act.saveMapMarks) db.act.saveMapMarks({ pageId: id, deckId: pg.scopeId, results, ids }).catch(() => {}); },
      onToast: m => db.say(m), onVersions: () => this.setState({ hist: true, more: false }), onDone: () => this.setState({ more: false }),
      onFromCards: canEdit && deck && db.diagrams ? () => { db.diagrams.openSheet(deck.id); db.diagrams.setType('mindmap'); db.act.go('/deck/' + deck.id + '?tab=pages'); } : undefined }) : null;
  const MM = mm || mv;
  const vl = mock && mm ? [{ version: mm.page.version, by: mm.page.by === 'You' ? 'you' : 'Claude', ai: mm.page.ai, at: Date.now() - 864e5, summary: mm.page.version === 4 ? 'Added “Cytoskeleton” and 3 ideas under it' : mm.page.version === 1 ? '' : 'Linked 6 cards and set “ER and Golgi” to start folded' }, { version: 2, by: 'you', ai: false, at: Date.now() - 2e8, summary: 'Added 3 ideas under “Cell membrane”' }, { version: 1, by: 'Claude', ai: true, at: Date.now() - 3e8, summary: 'Made the map from 42 cards: All cards' }].slice(0, mm.page.version === 1 ? 1 : 3)
    : mock ? [{ version: 12, by: 'you', ai: false, at: Date.now() - 864e5, summary: 'Added the table of stages' }, { version: 11, by: 'Claude', ai: true, at: Date.now() - 9e7, summary: 'Added the trap and the pearl, linked 2 weak cards' }, { version: 9, by: 'ChatGPT', ai: true, at: Date.now() - 3e8, summary: 'Made the page from Lecture 14 slides.pdf' }] : hist && ok ? db.pages.versions(id) : null;
  const make = st.make || (mock && view === 'Make a card' ? { front: '', back: 'Glycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.' } : mm && mm.make ? { ...mm.make, label: mm.bar.label } : null);
  const plain = s => String(s || '').split('\\n').filter(l => !/^:::|^::(card|page) /.test(l)).map(l => l.replace(/^#+\\s*|^\\s*[-*+]\\s+|^\\s*\\d+\\.\\s+/, '').replace(/\\*\\*|__|\`/g, '')).join(' ').replace(/\\s+/g, ' ').trim();
  const cardInfo = cid => { const c = mock ? { front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix', srs: { lapses: 2 } } : db.card(cid); return c ? { front: plain(c.front || c.text), back: plain(c.back), weak: !mock && db.cardTone ? db.cardTone(cid) === 'weak' : !!c.srs && ((c.srs.lapses || 0) > 0 || c.srs.state === 'relearning') } : null; };
  // (a page shown inside: its title, kind and version, and a map's preview and study (§9.1: the topic and its main ideas, at 11 px or
  // more, and how many ideas and weak ones); notes.js draws them above its row once it lets them through)
  // (the canvas's sample has its cards' tones; the app's weak count comes with its study block, so here it's the ideas alone)
  const mapInfo = (data, title, x) => { if (!data || !data.root) return {}; const M = this.maps(), A = this.mapArt();
    const tn = mock ? null : this.mapview().tones(data, db.mapCards ? db.mapCards(x.scope, x.scopeId) : [], ((db.mapMarks && db.mapMarks(x.id)) || {}).n || {});
    const ST = mock ? A.studyOf(M, data) : { ideas: M.countOf('mindmap', data), weak: [...tn.values()].filter(v => v === 'weak').length, tones: tn };
    return { preview: A.previewModel(M, data, { w: ${isPhone ? 350 : 620}, h: ${isPhone ? 120 : 150}, side: 'both', tones: ST.tones, title, least: ${isPhone ? 12 : 11} }), study: { ideas: ST.ideas, weak: ST.weak } }; };
  const pageInfo = pid => { if (mock) return { title: ${JSON.stringify(MAP_SAMPLE.title)}, kind: 'Mind map', version: 3, ...mapInfo(${JSON.stringify(MAP_SAMPLE.data)}, ${JSON.stringify(MAP_SAMPLE.title)}) }; const x = db.pages.page(pid); return x ? { title: x.title || 'Untitled', kind: KINDS[x.kind] || 'Page', version: x.version, ...(x.kind === 'mindmap' ? mapInfo(x.data, x.title, x) : {}) } : x === undefined ? { title: 'One moment…', kind: '' } : null; };
  // (the pages and cards the Note shows, as far as they're known: when one arrives or changes, those rows draw again)
  const refs = mock || !ok ? '' : (md.match(/^::(?:page|card) [A-Za-z0-9_-]+$/gm) || []).map(l => { const [k, rid] = l.slice(2).split(' '); const x = k === 'page' ? db.pages.page(rid) : db.card(rid); return rid + ':' + (x === undefined ? 'u' : x ? (x.title || x.front || '') + (x.version ? 'v' + x.version : '') + (x.srs ? x.srs.lapses + (x.srs.state || '') : '') : 'n'); }).join('|');
  const image = s => (/^\\/media\\/[\\w-]+\\.(png|jpe?g|gif|webp)$/i.test(s) ? s : '');
  // (the Make a card sheet is raised over the page: a gray a step above it in the dark)
  const te = this.mapArt().raisedOf(t);
  return { t, te, ...chrome, dark: !!p.dark, dim: !!p.dim, canEdit, scopeName, backHref, title: ok ? pg.title : '', readOnly: ok && !canEdit, version: ok ? pg.version : '',
    mp: isMap && MM ? MM : { on: false }, noteOn: !isMap && !needsUpdate, updateOn: needsUpdate, updateTitle: needsUpdate ? 'This ' + (KINDS[pg.kind] || 'page') + ' needs a newer Lucida.' : '', updateLine: 'Update to open it. Nothing on it is lost.',
    makeTitle: isMap ? 'New card from this idea' : 'New card from this block', makeRows: isMap ? 5 : 3, makeNote: isMap ? 'It’s linked to “' + ((make && make.label) || (MM && MM.bar.label) || '') + '” once it’s added.' : 'Or ask your AI to make cards from this page.',
    versionLine: ok ? 'v' + pg.version + ' · ' + who(pg.by) + ', ' + ago(pg.updated) : '',
    saveLabel: sv.err ? 'Not saved: ' + sv.err : sv.busy ? 'Saving…' : '', saveColor: sv.err ? t.again : t.muted,
    setTitle: e => { if (mock || !canEdit) return; db.pages.edit(id, { title: e && e.target ? e.target.value : '' }); },
    titleRef: el => { if (el && p.fresh && !mock && this._titled !== id) { this._titled = id; el.focus(); } },
    showPage: isNote, statusOpen: !ok, statusLine: loading ? 'One moment…' : 'This page isn’t here any more.',
    conflictOpen: !!cf, conflictLine: cf ? who(cf.by) + ' changed this page while you were writing (v' + cf.theirs + '). Both are kept: what you wrote is on top of it, in v' + cf.mine + '.' : '', dismissConflict: () => { if (!mock) db.pages.clearConflict(id); },
    moreOpen: !!st.more, moreExpanded: st.more ? 'true' : 'false', moreBg: st.more ? t.surf : 'transparent', toggleMore: () => this.setState({ more: !st.more }),
    histOpen: hist, histPressed: hist ? 'true' : 'false', histBg: hist ? t.surf : 'transparent', toggleHist: () => this.setState({ hist: !hist, more: false }), openHist: () => this.setState({ hist: true, more: false }), histLoading: hist && vl === null,
    vers: (vl || []).map((v, i) => ({ n: v.version, who: who(v.by), ai: !!v.ai, when: ago(v.at), what: v.summary || '', hasWhat: !!v.summary, old: i > 0, bg: i ? t.surf : 'transparent',
      restore: async () => { if (mock) return; await db.pages.restore(id, v.version); this.setState({ hist: false }); } })),
    deletePage: async () => { this.setState({ more: false }); if (mock || !(await db.ask({ title: 'Delete the page “' + (pg.title || 'Untitled') + '”?', action: 'Delete page', danger: true }))) return; await db.pages.remove(id); if (pg.kind !== 'note' && db.act.dropMapMarks) db.act.dropMapMarks(id).catch(() => {}); db.act.go(backHref, true); },
    makeOpen: !!make, makeFront: make ? make.front : '', makeBack: make ? make.back : '',
    setFront: e => { this._front = e && e.target ? e.target.value : ''; }, setBack: e => { this._back = e && e.target ? e.target.value : ''; },
    frontRef: el => { if (el && this._focusFront) { this._focusFront = false; el.focus(); } },
    closeMake: () => this.setState({ make: null }),
    addCard: async () => { if (mock || !deck) return this.setState({ make: null }); const front = (this._front ?? make.front).trim(), back = (this._back ?? make.back).trim(); if (!front || !back) return db.say('A card needs a front and a back.');
      const r = await db.act.addCard(deck.id, { kind: 'basic', front, back }), cid = r && r.ids && r.ids[0];
      // (a card made from an idea is linked to it, in one version)
      if (make.nodeId && cid) this.mapview().link(id, make.nodeId, cid, 'Made a card from “' + make.label + '” and linked it');
      this.setState({ make: null }); db.say(make.nodeId && cid ? 'Added to ' + deck.name + ' and linked to “' + make.label + '”.' : 'Added to ' + deck.name + '.'); },
    nbRef: el => { if (!el || !isNote) return; this._nbc = this.notes().mount(el, { md, refs, titled: true, key: (mock ? 'canvas|' + view + '|' : 'page|') + id, editable: canEdit, phone: ${isPhone ? 'true' : 'false'}, outline: true, image,
      card: cardInfo, page: pageInfo, onOpenPage: pid => { if (!mock) db.act.go(db.href('page', pid)); }, onTestPage: pid => { if (!mock) db.act.go(db.href('page', pid) + '?test=weak'); }, onOpenCard: cid => { if (!mock && deck) db.act.go('/deck/' + deck.id + '/card/' + cid); },
      onMakeCard: canEdit && deck ? b => { this._front = undefined; this._back = undefined; this._focusFront = true; this.setState({ make: { front: '', back: plain(b && b.markdown) } }); } : undefined,
      onChange: canEdit && !mock ? v => db.pages.editMarkdown(id, v) : undefined }); }
  };
}`;
  const props = { ...DARK, view: { editor: 'enum', default: 'Writing', options: PAGE_VIEWS }, pageId: { editor: 'string', default: '' }, fresh: { editor: 'boolean', default: false }, idea: { editor: 'string', default: '' }, test: { editor: 'string', default: '' } };
  return {
    'WebPage': ['Web · A page (a Note or a Mind map)', web, { props, logic: logic(false), css: GUIDE_CSS + MAP_CSS, w: W, h: HH }],
    'PhonePage': ['iPhone · A page (a Note or a Mind map)', phone, { props, logic: logic(true), css: GUIDE_CSS + MAP_CSS, w: PW, h: PH }]
  };
}
