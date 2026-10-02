// The deck page's Diagrams (web/diagrams.js, web/diagrams.mjs, web/diagram.js): a tab with the diagrams found in the lecture files its cards were made from, the tables and mind maps made
// from its cards and notes, and the pictures its owner uploaded; a diagram opened (a picture with its labels, a table, a mind map); and the Make diagram sheet. They are pieces of
// WebDeck and PhoneDeck (design/materials.mjs deckBlocks puts them in), and the shared deck page draws the made ones read-only (publicDiagramBlocks).
// The app draws these boards (design/to-web.mjs), so what you see on the canvas is what runs. Every state shows on the deck boards' Tweaks (`guide` and `section`).
import { readFileSync } from 'node:fs';

// What the deck page's Guide Tweak offers for Diagrams.
export const DIAGRAM_STATES = ['Diagrams', 'Diagrams (none yet)', 'A picture open', 'An uploaded picture open', 'A table open', 'A mind map open', 'Renaming a diagram', 'Delete asked', 'Uploading a picture', 'Upload didn’t work',
  'Make diagram', 'Making a diagram', 'Make diagram (it didn’t work)', 'Diagrams (studying)'];
export const DIAGRAM_STATE_RE = '^(Diagrams|A picture open|An uploaded picture open|A table open|A mind map open|Renaming a diagram|Delete asked|Uploading a picture|Upload didn.t work|Make diagram|Making a diagram)';

// How a diagram's picture, table and mind map are drawn (web/diagram.js), as a method every board that draws one has (`this.dg()`), like the Guide's `md()`.
const SRC = (() => { try { return readFileSync(new URL('../web/diagram.js', import.meta.url), 'utf8'); } catch { return ''; } })();
export const DIAGRAM_METHOD = SRC ? `dg() { return Component._dg || (Component._dg = (${SRC.slice(SRC.indexOf('function makeDiagram'), SRC.lastIndexOf('export default')).trim()})()); }`
  : `dg() { return { tableHtml: () => '', mapSvg: () => '', count: () => 0, layoutTree: () => ({ nodes: [], links: [] }) }; }`;

export const DIAGRAM_CSS = [
  // a screen reader's copy of a picture of ideas (an outline), and the tables and maps' scrolling boxes
  '.dg-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
  '.dgt-wrap,.dgm-wrap{max-width:100%;overflow:auto;scrollbar-width:thin;border-radius:16px;outline-offset:2px}.dgt-wrap:focus-visible,.dgm-wrap:focus-visible{outline:2px solid var(--dg-text,currentColor)}',
  '.dgt-wrap{max-height:100%;background:var(--dg-surf);color:var(--dg-text)}',
  '.dgt{width:100%;border-collapse:separate;border-spacing:0;font-size:14px;line-height:1.45;color:var(--dg-text)}',
  '.dgt th,.dgt td{padding:11px 16px;text-align:left;vertical-align:top;border-bottom:1px solid var(--dg-line)}.dgt tbody tr:last-child>*{border-bottom:0}',
  '.dgt thead th{position:sticky;top:0;z-index:1;background:var(--dg-surf);color:var(--dg-muted);font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}',
  '.dgt tbody th{font-weight:600;min-width:130px}.dgt td{min-width:150px}',
  // the slow drift of the bar while a diagram is being made (nothing blinks; it stops with Reduce Motion)
  '.dg-bar{position:relative;height:6px;border-radius:3px;overflow:hidden}.dg-bar>i{position:absolute;top:0;bottom:0;left:0;width:34%;border-radius:3px;animation:dgDrift 2.6s ease-in-out infinite alternate}',
  '@keyframes dgDrift{from{transform:translateX(0)}to{transform:translateX(194%)}}',
  '@media (prefers-reduced-motion:reduce){.dg-bar>i{animation:none;left:33%}}'
].join('');

// ---------- the pieces of the deck page ----------
export function diagramBlocks(H, phone) {
  const { svg, I, MONO } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const small = (label, handler, ic, attrs = '', bg = '{{t.bg}}') => `<button type="button" onClick="{{${handler}}}" ${attrs} class="sc-press" style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: ${bg}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${ic ? icon(ic, 14, 2) : ''}${label}</button>`;
  const big = (label, handler, { inv = false, danger = false, grow = 1, attrs = '', ic = '' } = {}) => `<button type="button" onClick="{{${handler}}}" ${attrs} class="sc-press" style="flex: ${grow} 1 0; min-width: ${phone ? 120 : 140}px; height: 48px; padding: 0 20px; border: 0; border-radius: 999px; background: ${inv ? '{{t.inv}}' : '{{t.surf}}'}; color: ${inv ? '{{t.invText}}' : danger ? '{{t.again}}' : '{{t.text}}'}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">${ic ? icon(ic, 16, 2) : ''}${label}</button>`;
  const alertLine = (has, text) => `<sc-if value="{{${has}}}" hint-placeholder-val="{{ false }}"><span role="alert" style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{${text}}}</span></sc-if>`;

  // ----- the tab: its card, with the diagrams in three groups (Made, From your lectures, Uploaded)
  const glyph = `<span aria-hidden="true" style="display: flex; color: {{t.muted}};"><sc-if value="{{x.isTable}}" hint-placeholder-val="{{ false }}">${icon('table', 34, 1.5)}</sc-if><sc-if value="{{x.isMap}}" hint-placeholder-val="{{ false }}">${icon('mindmap', 34, 1.5)}</sc-if></span>`;
  const item = `<button type="button" onClick="{{x.open}}" aria-label="Open {{x.name}}" class="sc-press" style="min-width: 0; padding: 0; border: 0; border-radius: 18px; background: {{t.bg}}; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer; overflow: hidden; display: flex; flex-direction: column;">
      <span style="position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: 4 / 3; background: {{t.bg}}; box-shadow: inset 0 0 0 1px {{t.line}}; border-radius: 18px 18px 0 0; overflow: hidden;"><sc-if value="{{x.isPicture}}" hint-placeholder-val="{{ true }}"><img src="{{x.picture}}" alt="" loading="lazy" draggable="false" style="width: 100%; height: 100%; object-fit: contain; display: block; background: #FFFFFF;"></sc-if>${glyph}</span>
      <span style="display: flex; flex-direction: column; gap: 2px; padding: 10px 12px 12px;"><span style="font-size: 14px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{{x.name}}</span><span style="font-size: 12px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{x.line}}</span></span>
    </button>`;
  const diagrams = `<sc-if value="{{dg.show}}" hint-placeholder-val="{{ true }}">
    <section aria-label="Diagrams" style="min-width: 0; box-sizing: border-box; padding: ${phone ? '18px 18px 20px' : '20px 20px 22px'}; border-radius: ${phone ? 22 : 24}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: center; gap: 10px; min-height: 34px; flex-wrap: wrap;"><span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Diagrams</span><span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{dg.count}}</span><span style="flex-grow: 1;"></span>
        <sc-if value="{{dg.canEdit}}" hint-placeholder-val="{{ true }}"><div style="display: flex; gap: 6px;">${small('Make diagram', 'dg.openSheet', 'sparkle')}${small('Upload', 'dg.upload', 'upload', 'aria-disabled="{{dg.uploadDisabled}}"')}</div></sc-if></div>
      <sc-if value="{{dg.uploading}}" hint-placeholder-val="{{ false }}"><div role="status" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 16px; background: {{t.bg}};"><span style="font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Sending {{dg.upName}}…</span><div class="dg-bar" aria-hidden="true" style="background: {{t.surf2}};"><i style="background: {{t.inv}};"></i></div></div></sc-if>
      <sc-if value="{{dg.hasUpErr}}" hint-placeholder-val="{{ false }}"><div style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 16px; background: {{t.bg}};"><span role="alert" style="flex-grow: 1; min-width: 0; font-size: 14px; line-height: 1.4; color: {{t.again}};">{{dg.upErr}}</span><button type="button" onClick="{{dg.dismissUpErr}}" aria-label="Dismiss" style="width: 28px; height: 28px; flex-shrink: 0; border: 0; border-radius: 14px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('close', 13, 2)}</button></div></sc-if>
      <sc-if value="{{dg.none}}" hint-placeholder-val="{{ false }}"><div style="padding: 14px 0 6px; border-top: 1px solid {{t.line}};"><span style="font-size: 14px; color: {{t.muted}};">Nothing here yet</span></div></sc-if>
      <sc-for list="{{dg.groups}}" as="g" hint-placeholder-count="2">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <span style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">{{g.title}}</span>
          <div style="display: grid; grid-template-columns: repeat(${phone ? 2 : 'auto-fill'}, ${phone ? 'minmax(0, 1fr)' : 'minmax(200px, 1fr)'}); gap: 12px;"><sc-for list="{{g.items}}" as="x" hint-placeholder-count="3">${item}</sc-for></div>
        </div>
      </sc-for>
    </section>
  </sc-if>`;

  // ----- a diagram opened: the picture with its labels, the table, or the mind map; and what can be done with it
  const head = `<div style="display: flex; align-items: flex-start; gap: 12px;">
      <sc-if value="{{dg.v.renaming}}" hint-placeholder-val="{{ false }}"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;"><input type="text" value="{{dg.v.draft}}" onChange="{{dg.v.setDraft}}" aria-label="Name" maxlength="80" autocomplete="off" style="height: 48px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600;"><span style="display: flex; gap: 8px;">${small('Save', 'dg.v.saveRename', 'check', '', '{{t.surf}}')}${small('Cancel', 'dg.v.cancelRename', '', '', '{{t.surf}}')}</span></span></sc-if>
      <sc-if value="{{dg.v.showName}}" hint-placeholder-val="{{ true }}"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em; overflow-wrap: anywhere;">{{dg.v.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{dg.v.line}}</span></span></sc-if>
      <button type="button" onClick="{{dg.v.close}}" aria-label="Close" class="sc-press" style="width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('close', 16, 2)}</button>
    </div>`;
  const box = `<div style="position: absolute; left: {{b.x}}; top: {{b.y}}; width: {{b.w}}; height: {{b.h}}; box-sizing: border-box; border: 1.5px solid #000000; border-radius: 3px; background: rgba(255,255,255,.32); box-shadow: 0 0 0 1px rgba(255,255,255,.9);"></div>`;
  const viewBody = `<div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 14px;">
      <sc-if value="{{dg.v.isPicture}}" hint-placeholder-val="{{ true }}">
        <div style="position: relative; align-self: stretch; border-radius: 14px; overflow: hidden; background: #FFFFFF; box-shadow: inset 0 0 0 1px {{t.line}};"><img src="{{dg.v.picture}}" alt="{{dg.v.alt}}" draggable="false" style="width: 100%; height: auto; display: block;"><sc-if value="{{dg.v.labelsOn}}" hint-placeholder-val="{{ true }}"><div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none;"><sc-for list="{{dg.v.boxes}}" as="b" hint-placeholder-count="4">${box}</sc-for></div></sc-if></div>
        <sc-if value="{{dg.v.hasLabels}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">{{dg.v.labelsTitle}}</span><span style="flex-grow: 1;"></span>${small('{{dg.v.labelsToggle}}', 'dg.v.toggleLabels', '', 'aria-pressed="{{dg.v.labelsOn}}"', '{{t.surf}}')}</div><div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{dg.v.labelList}}" as="l" hint-placeholder-count="5"><span style="height: 30px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.surf}}; font-size: 13px; font-weight: 500;">{{l.text}}</span></sc-for></div></div></sc-if>
        <sc-if value="{{dg.v.hasNote}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; line-height: 1.5; color: {{t.muted}};">{{dg.v.note}}</span></sc-if>
      </sc-if>
      <sc-if value="{{dg.v.isTable}}" hint-placeholder-val="{{ false }}"><div ref="{{dg.v.tableRef}}" data-sc-own style="min-height: 0;"></div></sc-if>
      <sc-if value="{{dg.v.isMap}}" hint-placeholder-val="{{ false }}"><div ref="{{dg.v.mapRef}}" data-sc-own style="min-height: 0; border-radius: 16px; background: {{t.surf}}; --dg-text: {{t.text}};"></div></sc-if>
      <sc-if value="{{dg.v.hasWhere}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; line-height: 1.5; color: {{t.muted}};">{{dg.v.where}}</span></sc-if>
    </div>`;
  const ask = `<sc-if value="{{dg.v.confirm}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="Delete this diagram" style="display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 20px; background: {{t.surf}};"><span style="font-size: 15px; font-weight: 600; line-height: 1.4;">{{dg.v.confirmTitle}}</span><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">{{dg.v.confirmNote}}</span><div style="display: flex; gap: 8px;">${big('Keep it', 'dg.v.keep', { grow: 1 }).replace('background: {{t.surf}}', 'background: {{t.bg}}')}${big('{{dg.v.deleteLabel}}', 'dg.v.remove', { danger: true, grow: 1, attrs: 'aria-disabled="{{dg.v.busy}}"' }).replace('background: {{t.surf}}', 'background: {{t.bg}}')}</div></div></sc-if>`;
  const actions = `<sc-if value="{{dg.v.canEdit}}" hint-placeholder-val="{{ true }}"><sc-if value="{{dg.v.showActions}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <sc-if value="{{dg.v.canCards}}" hint-placeholder-val="{{ true }}">${big('{{dg.v.cardsLabel}}', 'dg.v.cards', { inv: true, grow: 2, ic: 'sparkle', attrs: 'aria-disabled="{{dg.v.busy}}"' })}</sc-if>
      <sc-if value="{{dg.v.canRedo}}" hint-placeholder-val="{{ false }}">${big('{{dg.v.redoLabel}}', 'dg.v.redo', { inv: true, grow: 2, attrs: 'aria-disabled="{{dg.v.busy}}"' })}</sc-if>
      ${big('Rename', 'dg.v.startRename', { grow: 1 })}${big('Delete', 'dg.v.askDelete', { danger: true, grow: 1 })}</div></sc-if></sc-if>`;
  const viewerBody = `${head}${viewBody}${alertLine('dg.v.hasMsg', 'dg.v.msg')}${ask}${actions}`;
  const dgViewer = `<sc-if value="{{dg.v.open}}" hint-placeholder-val="{{ false }}">
    <div class="sc-scrim" onClick="{{dg.v.close}}" style="position: absolute; ${phone ? 'inset: 0;' : 'top: 0; right: 0; bottom: 0; left: 240px;'} background: {{t.dim}};"></div>
    <div role="dialog" aria-modal="true" aria-label="{{dg.v.name}}" class="${phone ? 'sc-sheet' : 'sc-panel'}" style="position: absolute; ${phone ? 'left: 0; right: 0; bottom: 0; top: 56px; padding: 20px 20px 34px; border-radius: 32px 32px 0 0;' : 'top: 12px; right: 12px; bottom: 12px; width: 720px; max-width: calc(100% - 264px); padding: 24px; border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,.24);'} box-sizing: border-box; background: {{t.bg}}; color: {{t.text}}; display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
      ${viewerBody}
    </div>
  </sc-if>`;

  // ----- the Make diagram sheet: Table or Mind map, from what, and then it is made (one AI step, with a calm bar and a way out)
  const seg = `<div role="group" aria-label="Kind of diagram" style="display: flex; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{dg.sheet.types}}" as="o" hint-placeholder-count="2"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="flex: 1 1 0; min-width: 0; height: 40px; padding: 0 6px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;"><span style="display: flex;"><sc-if value="{{o.isTable}}" hint-placeholder-val="{{ true }}">${icon('table', 16, 1.8)}</sc-if><sc-if value="{{o.isMap}}" hint-placeholder-val="{{ false }}">${icon('mindmap', 16, 1.8)}</sc-if></span>{{o.label}}</button></sc-for></div>`;
  const chips = `<div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{dg.sheet.scopes}}" as="s" hint-placeholder-count="4"><button type="button" onClick="{{s.pick}}" aria-pressed="{{s.pressed}}" class="sc-press" style="height: 34px; max-width: 100%; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{s.bg}}; color: {{s.fg}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;"><sc-if value="{{s.isSource}}" hint-placeholder-val="{{ false }}"><span style="display: flex; flex-shrink: 0;">${icon('file', 13, 2)}</span></sc-if><span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">{{s.label}}</span></button></sc-for></div>`;
  const sheetBody = `<div style="display: flex; align-items: center; gap: 10px; min-height: 40px;"><span style="flex-grow: 1; min-width: 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">Make diagram</span><button type="button" onClick="{{dg.sheet.close}}" aria-label="Close" class="sc-press" style="width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('close', 16, 2)}</button></div>
      <sc-if value="{{dg.sheet.setUp}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 18px; min-height: 0; overflow-y: auto; scrollbar-width: none;">
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Make a</span>${seg}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">From</span>${chips}<span style="font-size: 12px; line-height: 1.45; color: {{t.muted}};">{{dg.sheet.fromLine}}</span></div>
        ${alertLine('dg.sheet.hasNote', 'dg.sheet.note')}
      </div>
      <div style="display: flex; gap: 10px;">${big('Cancel', 'dg.sheet.close', { grow: 1 })}<button type="button" onClick="{{dg.sheet.make}}" aria-disabled="{{dg.sheet.cannotMake}}" class="sc-press" style="flex: 2 1 0; min-width: 0; height: 52px; padding: 0 20px; border: 0; border-radius: 999px; background: {{dg.sheet.makeBg}}; color: {{dg.sheet.makeFg}}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">${icon('sparkle', 16, 2)}{{dg.sheet.makeLabel}}</button></div></sc-if>
      <sc-if value="{{dg.sheet.making}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 22px; padding: 18px 0 6px;"><div role="status" style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 17px; font-weight: 600; letter-spacing: -.01em;">{{dg.sheet.makingWord}}</span><span style="font-size: 14px; color: {{t.muted}};">{{dg.sheet.makingLine}}</span></div><div class="dg-bar" role="progressbar" aria-label="Making your diagram" style="background: {{t.surf2}};"><i style="background: {{t.inv}};"></i></div></div>
        <div style="display: flex; gap: 10px;">${big('Cancel', 'dg.sheet.close', { grow: 1 })}</div></sc-if>
      <sc-if value="{{dg.sheet.hasError}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 14px; padding: 8px 0 0;"><span role="alert" style="font-size: 17px; font-weight: 600; line-height: 1.35;">{{dg.sheet.errMessage}}</span></div>
        <div style="display: flex; gap: 10px;">${big('Back', 'dg.sheet.back', { grow: 1 })}<sc-if value="{{dg.sheet.errPro}}" hint-placeholder-val="{{ false }}"><a href="Pricing.dc.html" class="sc-press" style="flex-grow: 2; height: 52px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Go Pro</a></sc-if><sc-if value="{{dg.sheet.errRetry}}" hint-placeholder-val="{{ true }}">${big('Try again', 'dg.sheet.make', { inv: true, grow: 2 })}</sc-if></div></sc-if>`;
  const dgSheet = phone
    ? `<sc-if value="{{dg.sheet.open}}" hint-placeholder-val="{{ false }}">
    <div class="sc-scrim" onClick="{{dg.sheet.backdrop}}" style="position: absolute; inset: 0; z-index: 60; background: {{t.dim}};"></div>
    <div role="dialog" aria-modal="true" aria-label="Make diagram" class="sc-sheet" style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 61; max-height: calc(100% - 56px); box-sizing: border-box; padding: 20px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; color: {{t.text}}; display: flex; flex-direction: column; gap: 18px; overflow: hidden;">
      ${sheetBody}
    </div>
  </sc-if>`
    : `<sc-if value="{{dg.sheet.open}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center;">
    <div class="sc-fade" onClick="{{dg.sheet.backdrop}}" style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <div role="dialog" aria-modal="true" aria-label="Make diagram" class="sc-pop" style="position: relative; width: 560px; max-height: calc(100% - 48px); overflow: hidden; box-sizing: border-box; padding: 28px; border-radius: 32px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 18px;">
      ${sheetBody}
    </div>
  </div></sc-if>`;
  return { diagrams, dgViewer, dgSheet };
}

// ---------- what the shared deck page shows: the tables and mind maps made from its cards, read only ----------
export function publicDiagramBlocks(H, phone) {
  const { svg, I, MONO } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name], size, w);
  const card = `<sc-if value="{{pdg.show}}" hint-placeholder-val="{{ true }}"><section aria-label="Diagrams" style="min-width: 0; box-sizing: border-box; padding: ${phone ? '18px 18px 16px' : '20px 24px 20px'}; border-radius: ${phone ? 22 : 24}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Diagrams</span><span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{pdg.count}}</span></div>
      <div style="display: grid; grid-template-columns: repeat(${phone ? 1 : 'auto-fill'}, ${phone ? 'minmax(0, 1fr)' : 'minmax(240px, 1fr)'}); gap: 8px;"><sc-for list="{{pdg.items}}" as="x" hint-placeholder-count="2">
        <button type="button" onClick="{{x.open}}" aria-label="Open {{x.name}}" class="sc-press" style="min-height: 60px; box-sizing: border-box; padding: 8px 12px 8px 10px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 16px; background: {{t.bg}}; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;"><span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;"><sc-if value="{{x.isTable}}" hint-placeholder-val="{{ true }}">${icon('table', 17, 1.8)}</sc-if><sc-if value="{{x.isMap}}" hint-placeholder-val="{{ false }}">${icon('mindmap', 17, 1.8)}</sc-if></span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{x.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{x.line}}</span></span><span style="display: flex; color: {{t.muted}};">${icon('chev', 15, 2)}</span></button></sc-for></div>
    </section></sc-if>`;
  const viewer = `<sc-if value="{{pdg.v.open}}" hint-placeholder-val="{{ false }}">
    <div class="sc-scrim" onClick="{{pdg.v.close}}" style="position: absolute; inset: 0; z-index: 60; background: {{t.dim}};"></div>
    <div role="dialog" aria-modal="true" aria-label="{{pdg.v.name}}" class="${phone ? 'sc-sheet' : 'sc-panel'}" style="position: absolute; z-index: 61; ${phone ? 'left: 0; right: 0; bottom: 0; top: 56px; padding: 20px 20px 34px; border-radius: 32px 32px 0 0;' : 'top: 12px; right: 12px; bottom: 12px; width: 720px; max-width: calc(100% - 24px); padding: 24px; border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,.24);'} box-sizing: border-box; background: {{t.bg}}; color: {{t.text}}; display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
      <div style="display: flex; align-items: flex-start; gap: 12px;"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em; overflow-wrap: anywhere;">{{pdg.v.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{pdg.v.line}}</span></span><button type="button" onClick="{{pdg.v.close}}" aria-label="Close" class="sc-press" style="width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('close', 16, 2)}</button></div>
      <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 14px;">
        <sc-if value="{{pdg.v.isTable}}" hint-placeholder-val="{{ true }}"><div ref="{{pdg.v.tableRef}}" data-sc-own style="min-height: 0;"></div></sc-if>
        <sc-if value="{{pdg.v.isMap}}" hint-placeholder-val="{{ false }}"><div ref="{{pdg.v.mapRef}}" data-sc-own style="min-height: 0; border-radius: 16px; background: {{t.surf}};"></div></sc-if>
      </div>
    </div>
  </sc-if>`;
  return { card, viewer };
}

// ---------- the logic ----------
// The deck page's `dg`: what the Diagrams tab, the viewer and the sheet read. `DGM` is web/diagrams.js's flow (db.diagrams) or, on the canvas, the sample below; `dk` the deck, `G` its Guide's
// state (G.can: it is yours to change), `plural`, `t` and `mock` as in the deck page's logic. Called inside DECK_MATERIALS_JS (design/materials.mjs).
export const DIAGRAMS_JS = String.raw`
    const dgGroupsOf = rows => ['Made', 'From your lectures', 'Uploaded'].map(title => ({ title, items: rows.filter(r => r.group === title) })).filter(g => g.items.length);
    const dgCount = tree => this.dg().count(tree);
    const dgLine = r => r.kind === 'table' ? 'Table · ' + plural(r.table ? r.table.rows.length : 0, 'row') : r.kind === 'mindmap' ? 'Mind map · ' + plural(r.tree ? dgCount(r.tree) : 0, 'idea')
      : r.kind === 'lecture' ? [r.src && r.src.at, r.src && r.src.name].filter(Boolean).join(' · ') || 'From your lecture' : 'Uploaded' + (r.w ? ' · ' + r.w + ' × ' + r.h : '');
    const dgColors = { text: t.text, muted: t.muted, line: t.line, bg: t.bg, surf: t.surf, surf2: t.surf2, inv: t.inv, invText: t.invText };
    const dgRef = (kind, id, html) => el => { const k = kind + ':' + id + ':' + html.length + ':' + sum(html); if (el.getAttribute('data-k') !== k) { el.innerHTML = html; el.setAttribute('data-k', k); } };
    const dgPct = v => +(v * 100).toFixed(3) + '%';
    const dgCur = dgv.open ? dgRows.find(r => r.id === dgv.open) || null : null;
    const dgMade = !!dgCur && (dgCur.kind === 'table' || dgCur.kind === 'mindmap'), dgPic = !!dgCur && !!dgCur.picture;
    const dgBusy = !!dgv.busy, dgLabels = dgCur && dgCur.labels ? dgCur.labels : [];
    const dgFrom = dgCur && dgCur.from && dgCur.from.kind !== 'all' ? 'Made from ' + (dgCur.from.kind === 'tag' ? 'the cards tagged ' + dgCur.from.label : dgCur.from.label) : dgCur && dgMade ? 'Made from all the cards and notes' : '';
    const dgWhere = !dgCur ? '' : dgMade ? (G.can ? dgFrom + (dgCur.cards ? ' (' + plural(dgCur.cards, 'card') + '). Redo writes it again from the cards as they are now.' : '.') : 'Made from the cards of this deck.')
      : dgCur.kind === 'lecture' ? 'Found in ' + [dgCur.src && dgCur.src.name, dgCur.src && dgCur.src.at].filter(Boolean).join(', ') + '. Only you see it.' : 'Only you see this picture.';
    const dgNote = !dgPic ? '' : dgCur.labels === null ? 'Lucida reads the labels in a picture when you make cards from it.' : dgLabels.length ? '' : 'Lucida couldn’t find any labels in this picture to hide.';
    const dgV = dgCur ? { open: true, name: dgCur.name, alt: dgCur.name, line: dgLine(dgCur) + (dgPic && dgLabels.length ? ' · ' + plural(dgLabels.length, 'label') : ''), close: DGM.close, canEdit: !!G.can,
        isPicture: dgPic, picture: dgCur.picture, isTable: dgCur.kind === 'table', isMap: dgCur.kind === 'mindmap',
        hasLabels: dgPic && dgLabels.length > 0, labelsOn: !!dgv.labels, labelsTitle: plural(dgLabels.length, 'label'), labelsToggle: dgv.labels ? 'Hide boxes' : 'Show boxes', toggleLabels: () => DGM.setLabels(!dgv.labels),
        boxes: dgLabels.map(b => ({ x: dgPct(b.x), y: dgPct(b.y), w: dgPct(b.w), h: dgPct(b.h) })), labelList: dgLabels.map(b => ({ text: b.label })),
        hasNote: !!dgNote, note: dgNote, hasWhere: !!dgWhere, where: dgWhere,
        tableRef: dgCur.kind === 'table' ? dgRef('t', dgCur.id, this.dg().tableHtml(dgCur.table, dgColors, dgCur.name)) : () => {}, mapRef: dgCur.kind === 'mindmap' ? dgRef('m', dgCur.id, this.dg().mapSvg(dgCur.tree, dgColors, dgCur.name)) : () => {},
        renaming: !!dgv.renaming, showName: !dgv.renaming, draft: dgv.draft, setDraft: e => DGM.setDraft(e && e.target ? e.target.value : e), saveRename: () => DGM.rename(dk.id, dgCur.id), cancelRename: DGM.cancelRename, startRename: () => DGM.startRename(dgCur.name),
        confirm: !!dgv.confirm, askDelete: DGM.askDelete, keep: DGM.keep, remove: () => DGM.remove(dk.id, dgCur.id), busy: dgBusy ? 'true' : '', deleteLabel: dgv.busy === 'delete' ? 'Deleting…' : 'Delete',
        confirmTitle: 'Delete “' + dgCur.name + '”?', confirmNote: dgMade ? 'You can make another one any time.' : dgPic ? 'Its picture goes. Cards made from it keep their own picture.' : '',
        showActions: !dgv.renaming && !dgv.confirm, canCards: dgPic && !(dgCur.labels && !dgCur.labels.length), cardsLabel: dgv.busy === 'cards' ? (dgCur.labels === null ? 'Reading the labels…' : 'Opening…') : 'Make cards', cards: () => DGM.cards(dk.id, dgCur.id),
        canRedo: dgMade, redoLabel: dgv.busy === 'redo' ? 'Making it again…' : 'Redo', redo: () => DGM.redo(dk.id, dgCur.id), hasMsg: !!dgv.msg, msg: dgv.msg }
      : { open: false, name: '', alt: '', line: '', close: () => {}, canEdit: false, isPicture: false, picture: '', isTable: false, isMap: false, hasLabels: false, labelsOn: false, labelsTitle: '', labelsToggle: '', toggleLabels: () => {}, boxes: [], labelList: [],
        hasNote: false, note: '', hasWhere: false, where: '', tableRef: () => {}, mapRef: () => {}, renaming: false, showName: true, draft: '', setDraft: () => {}, saveRename: () => {}, cancelRename: () => {}, startRename: () => {},
        confirm: false, askDelete: () => {}, keep: () => {}, remove: () => {}, busy: '', deleteLabel: 'Delete', confirmTitle: '', confirmNote: '', showActions: false, canCards: false, cardsLabel: 'Make cards', cards: () => {}, canRedo: false, redoLabel: 'Redo', redo: () => {}, hasMsg: false, msg: '' };
    // The Make diagram sheet: Table or Mind map, and what from (all of it, or one tag's cards, or one source's).
    const dgTags = [...new Set(db.cards(dk.id).flatMap(c => c.tags || []))].slice(0, 8), dgSources = srcs.slice(0, 6), dgScope = dgv.scope || { kind: 'all', value: '' };
    const dgChip = (label, on, go, isSource) => ({ label, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: go, isSource: !!isSource });
    const dgTyp = (label, on, kind, go) => ({ label, pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none', pick: go, isTable: kind === 'table', isMap: kind === 'map' });
    const dgFew = cardsN < 3, dgWord = dgv.type === 'mindmap' ? 'mind map' : 'table', dgErr = dgv.error;
    const dgSheet = { open: !!dgv.sheet, close: DGM.cancel, backdrop: () => { if (!dgv.making) DGM.cancel(); },
      types: [dgTyp('Table', dgv.type !== 'mindmap', 'table', () => DGM.setType('table')), dgTyp('Mind map', dgv.type === 'mindmap', 'map', () => DGM.setType('mindmap'))],
      scopes: [dgChip('All cards and notes', dgScope.kind === 'all', () => DGM.setScope('all', '')), ...dgTags.map(x => dgChip(x, dgScope.kind === 'tag' && dgScope.value === x, () => DGM.setScope('tag', x))), ...dgSources.map(x => dgChip(x.name, dgScope.kind === 'source' && dgScope.value === x.id, () => DGM.setScope('source', x.id), true))],
      fromLine: dgScope.kind === 'all' ? 'Lucida reads every card and your notes.' : dgScope.kind === 'tag' ? 'Only the cards tagged ' + dgScope.value + '.' : 'Only the cards made from this source.',
      setUp: !!dgv.sheet && !dgv.making && !dgErr, hasNote: dgFew, note: 'Add a few cards first: Lucida needs something to make a ' + dgWord + ' from.', cannotMake: dgFew ? 'true' : '',
      makeLabel: 'Make ' + dgWord, makeBg: dgFew ? t.surf2 : t.inv, makeFg: dgFew ? t.muted : t.invText, make: () => { if (!dgFew) DGM.make(dk.id); },
      making: !!dgv.sheet && !!dgv.making, makingWord: dgv.type === 'mindmap' ? 'Drawing your mind map' : 'Writing your table', makingLine: 'Lucida is reading your cards. It takes a few seconds.',
      hasError: !!dgv.sheet && !!dgErr && !dgv.making, errMessage: dgErr ? dgErr.message : '', errPro: !!(dgErr && dgErr.pro), errRetry: !!(dgErr && dgErr.again), back: () => DGM.openSheet(dk.id) };
    const dg = { show: tab === 'diagrams', canEdit: !!G.can, count: String(dgRows.length), none: !dgRows.length && !!G.can, openSheet: () => DGM.openSheet(dk.id), upload: () => DGM.upload(dk.id), uploadDisabled: dgv.up ? 'true' : '',
      uploading: !!dgv.up, upName: dgv.up ? dgv.up.name : '', hasUpErr: !!dgv.upErr, upErr: dgv.upErr || '', dismissUpErr: DGM.dismissUploadError,
      groups: dgGroupsOf(dgRows).map(g => ({ title: g.title, items: g.items.map(r => ({ id: r.id, name: r.name, line: dgLine(r), isPicture: !!r.picture, picture: r.picture, isTable: r.kind === 'table', isMap: r.kind === 'mindmap', open: () => DGM.open(dk.id, r.id) })) })),
      v: dgV, sheet: dgSheet };`;

// ---------- the canvas's sample ----------
// What the deck boards' "guide" Tweak shows for Diagrams: sample pictures (small drawings made here), a table and a mind map, and the states of the viewer and the sheet. It answers like web/diagrams.js.
export const DIAGRAMS_MOCK = String.raw`diagramsMock() {
  const p = this.props, noop = () => {}, G = p.guide || '';
  const svgOf = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
  const label = (x, y, text, anchor) => '<text x="' + x + '" y="' + y + '" font-family="Geist, system-ui, sans-serif" font-size="15" fill="#18181B" text-anchor="' + (anchor || 'start') + '">' + text + '</text>';
  const CELL = svgOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#fff"/><ellipse cx="320" cy="215" rx="200" ry="145" fill="#F7F8FC" stroke="#76767E" stroke-width="4"/><circle cx="310" cy="200" r="50" fill="#DCE2F2" stroke="#76767E" stroke-width="3"/><ellipse cx="210" cy="285" rx="40" ry="25" fill="#FFE8D6" stroke="#76767E" stroke-width="3"/><ellipse cx="435" cy="142" rx="35" ry="22" fill="#FFE8D6" stroke="#76767E" stroke-width="3"/><g stroke="#76767E" stroke-width="2"><path d="M310 150V40M210 285L60 330M470 145L560 60"/></g>' + label(270, 30, 'Nucleus') + label(10, 345, 'Mitochondrion') + label(515, 50, 'Mitochondrion') + '</svg>');
  const FLOW = svgOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#fff"/><g stroke="#76767E" stroke-width="2"><path d="M125 67H365M365 67H605M605 67V177M605 177V287"/></g><g fill="#EBEEF5" stroke="#76767E" stroke-width="3"><rect x="60" y="40" width="130" height="54" rx="10"/><rect x="300" y="40" width="130" height="54" rx="10"/><rect x="540" y="40" width="130" height="54" rx="10"/><rect x="540" y="150" width="130" height="54" rx="10"/><rect x="540" y="260" width="130" height="54" rx="10"/></g>' + label(125, 72, 'Acetyl-CoA', 'middle') + label(365, 72, 'Citrate', 'middle') + label(605, 72, 'Isocitrate', 'middle') + label(605, 182, 'Ketoglutarate', 'middle') + label(605, 292, 'Succinyl-CoA', 'middle') + '</svg>');
  const CHART = svgOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#fff"/><path d="M70 40V330H560" stroke="#18181B" stroke-width="3" fill="none"/><path d="M70 330L160 200 260 130 380 100 540 92" stroke="#285AC8" stroke-width="4" fill="none"/><path d="M70 330L160 280 260 230 380 170 540 140" stroke="#D2463C" stroke-width="4" fill="none"/>' + label(190, 365, 'Substrate concentration') + label(8, 24, 'Reaction rate') + label(400, 78, 'Enzyme A') + label(400, 198, 'Enzyme B') + '</svg>');
  const day = (m, d) => new Date(2026, m, d, 10).getTime();
  const box = (id, x, y, w, h, l) => ({ id, x, y, w, h, label: l });
  const cellLabels = [box('b1', .41, .03, .12, .06, 'Nucleus'), box('b2', .012, .785, .17, .06, 'Mitochondrion'), box('b3', .8, .083, .17, .06, 'Mitochondrion')];
  const flowLabels = [box('b1', .11, .12, .125, .05, 'Acetyl-CoA'), box('b2', .47, .12, .07, .05, 'Citrate'), box('b3', .79, .12, .1, .05, 'Isocitrate')];
  const table = { columns: ['Organelle', 'What it does', 'Found in'], rows: [['Nucleus', 'Holds the cell’s DNA', 'Animal and plant cells'], ['Mitochondrion', 'Makes most of the cell’s ATP', 'Animal and plant cells'], ['Ribosome', 'Builds proteins from amino acids', 'Every cell'], ['Chloroplast', 'Turns light into sugar', 'Plant cells'], ['Golgi apparatus', 'Packs proteins to send out', 'Animal and plant cells']] };
  const tree = { text: 'The cell', children: [{ text: 'Organelles', children: [{ text: 'Nucleus' }, { text: 'Ribosome' }, { text: 'Golgi apparatus' }] }, { text: 'Energy', children: [{ text: 'ATP' }, { text: 'Glycolysis' }, { text: 'Krebs cycle' }, { text: 'Electron transport chain' }] }, { text: 'Membrane', children: [{ text: 'Phospholipids' }, { text: 'Channel proteins' }] }] };
  const lecture = (id, name, src, at, picture, w, h, labels, figure) => ({ id, kind: 'lecture', name, group: 'From your lectures', at: day(8, 18), src: { id: 'x1', name: src, at }, picture, w, h, labels, figure, table: null, tree: null, from: null, cards: 0, size: 0 });
  const rows = [
    { id: 'g1', kind: 'table', name: 'Organelles at a glance', group: 'Made', at: day(8, 22), src: null, picture: '', w: 0, h: 0, labels: null, figure: '', table, tree: null, from: { kind: 'all', value: '', label: 'All cards and notes' }, cards: 24, size: 0 },
    { id: 'g2', kind: 'mindmap', name: 'The cell', group: 'Made', at: day(8, 22), src: null, picture: '', w: 0, h: 0, labels: null, figure: '', table: null, tree, from: { kind: 'tag', value: 'cell', label: 'cell' }, cards: 12, size: 0 },
    lecture('g3', 'Animal cell', 'Lecture 3 slides', 'Slide 4', CELL, 640, 420, cellLabels, 'labelled figure'),
    lecture('g4', 'The Krebs cycle', 'Lecture 3 slides', 'Slide 9', FLOW, 720, 480, flowLabels, 'flow diagram'),
    lecture('g5', 'Enzyme reaction rates', 'Lecture 3 slides', 'Slide 14', CHART, 600, 400, [], 'chart'),
    { id: 'g6', kind: 'upload', name: 'Whiteboard, Sep 22', group: 'Uploaded', at: day(8, 22), src: null, picture: FLOW, w: 720, h: 480, labels: null, figure: '', table: null, tree: null, from: null, cards: 0, size: 0 }
  ];
  const none = G === 'Diagrams (none yet)', study = G === 'Diagrams (studying)';
  const list = none ? [] : study ? rows.filter(r => r.group === 'Made') : rows;
  const open = { 'A picture open': 'g3', 'An uploaded picture open': 'g6', 'A table open': 'g1', 'A mind map open': 'g2', 'Renaming a diagram': 'g3', 'Delete asked': 'g3' }[G] || '';
  const view = { open, sheet: /^Make diagram|^Making a diagram/.test(G), type: 'table', scope: { kind: 'all', value: '' }, making: G === 'Making a diagram', error: G === 'Make diagram (it didn’t work)' ? { message: 'That’s today’s 3 free diagrams. Go Pro for 30 a day.', pro: true, code: 'day', again: false } : null,
    busy: '', msg: '', renaming: G === 'Renaming a diagram', draft: G === 'Renaming a diagram' ? 'Animal cell' : '', confirm: G === 'Delete asked', up: G === 'Uploading a picture' ? { name: 'IMG_2058.jpg' } : null, upErr: G === 'Upload didn’t work' ? 'That file is over 20 MB. Go Pro for up to 40 MB.' : '', labels: G === 'A picture open' };
  return { rows: () => list, view: () => view, open: noop, close: noop, openSheet: noop, closeSheet: noop, cancel: noop, setType: noop, setScope: noop, make: noop, redo: noop, startRename: noop, setDraft: noop, cancelRename: noop, rename: noop,
    askDelete: noop, keep: noop, remove: noop, upload: noop, dismissUploadError: noop, cards: noop, setLabels: noop, takeDraft: () => null, peekDraft: () => null };
}`;

// The shared deck page's `pdg`: the made diagrams (g.diagrams of the deck's public Guide record), a card listing them and a read-only viewer. Runs inside the public deck page's logic
// (PUBLIC_GUIDE_JS's neighbour), where `d` is the deck, `t` the theme and `db` the database (or the canvas's sample).
export const PUBLIC_DIAGRAMS_JS = String.raw`
  const PDG = (() => {
    const st = this.state, p = this.props, mock = !!db.mock, g = mock ? this.mockMaterials().publicGuide() : d.guide, list = g && Array.isArray(g.diagrams) ? g.diagrams.filter(x => x && (x.table || x.tree)) : [];
    const D = this.dg(), plural2 = (n, w) => n + ' ' + w + (n === 1 ? '' : 's'), sum2 = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
    const want = st.dgOpen !== undefined ? st.dgOpen : mock ? ({ 'A table open': 'g1', 'A mind map open': 'g2' })[p.guide] || '' : '', cur = list.find(x => x.id === want) || null;
    const line = x => x.kind === 'table' ? 'Table · ' + plural2(((x.table || {}).rows || []).length, 'row') : 'Mind map · ' + plural2(D.count(x.tree || {}), 'idea');
    const colors = { text: t.text, muted: t.muted, line: t.line, bg: t.bg, surf: t.surf, surf2: t.surf2, inv: t.inv, invText: t.invText };
    const ref = (kind, x, html) => el => { const k = kind + ':' + x.id + ':' + html.length + ':' + sum2(html); if (el.getAttribute('data-k') !== k) { el.innerHTML = html; el.setAttribute('data-k', k); } };
    return { show: list.length > 0, count: String(list.length), items: list.map(x => ({ id: x.id, name: x.name, line: line(x), isTable: x.kind === 'table', isMap: x.kind === 'mindmap', open: () => this.setState({ dgOpen: x.id }) })),
      v: cur ? { open: true, name: cur.name, line: line(cur), close: () => this.setState({ dgOpen: '' }), isTable: cur.kind === 'table', isMap: cur.kind === 'mindmap',
          tableRef: cur.kind === 'table' ? ref('t', cur, D.tableHtml(cur.table, colors, cur.name)) : () => {}, mapRef: cur.kind === 'mindmap' ? ref('m', cur, D.mapSvg(cur.tree, colors, cur.name)) : () => {} }
        : { open: false, name: '', line: '', close: () => {}, isTable: false, isMap: false, tableRef: () => {}, mapRef: () => {} } };
  })();`;
