// The boards for making cards from anything, a deck's Guide, and its Sources (web/make.js, web/make.mjs, web/guide.js):
//   WebMake / PhoneMake    the flow: pick a source, add it (and a few options), watch it work, check the cards
//   WebGuide / PhoneGuide  the Guide's editor: Write and Preview, a small toolbar, older versions, extra pages
// and the pieces other boards carry: the deck page's Guide and Sources, the shared deck page's Guide, the add menu, and Live's topic.
// This file holds them so design/build.mjs stays small; build.mjs hands it the helpers its boards are made with (H).
// The app draws these boards (design/to-web.mjs), so what you see on the canvas is what runs.

import { diagramBlocks, publicDiagramBlocks, DIAGRAMS_JS, DIAGRAMS_MOCK, DIAGRAM_STATES, DIAGRAM_STATE_RE } from './diagrams.mjs';

// What the Make boards' "step" picker offers on the canvas (the app's own flow follows web/make.js).
export const MAKE_STEPS = ['Pick', 'Upload', 'Upload (a file added)', 'Upload (picture cards on)', 'Photos', 'Record', 'Recording', 'Paused', 'Paste', 'Paste (a language set)', 'YouTube', 'YouTube transcript', 'Topic', 'More from a source',
  'Making', 'Making a recording', 'Review', 'Review (notes open)', 'Review (notes off)', 'Review (no room for notes)', 'Review (audio cards)', 'Review (picture cards)', 'Review (editing a card)', 'Limit reached', 'File too big', 'Error'];

// Icons these boards use that the main set doesn't have (the onboarding's paste icon).
const EXTRA = { paste: '<rect x="5.5" y="4.5" width="13" height="16" rx="2.5"/><path d="M9 4.5v-.3a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 4.2v.3"/><path d="M9 11h6M9 15h4"/>' };

// What the deck page's Guide setting offers on the canvas.
export const GUIDE_STATES = ['Guide and sources', 'Guide pages', 'Long guide', 'A source open', 'No guide yet', 'Studying (read only)', ...DIAGRAM_STATES];

export function makeBoards(H) {
  const { svg, I, FONT, MONO, T, DB_JS, DARK, MESH, W, HH, PW, PH } = H;
  const ROUND = 'width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;';
  const field = (label, body) => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">${label}</span>${body}</div>`;
  const seg = list => `<div role="group" style="display: flex; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{${list}}}" as="o" hint-placeholder-count="4"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="flex: 1 1 0; min-width: 0; height: 36px; padding: 0 6px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{o.label}}</button></sc-for></div>`;
  const btn = (label, onClick, { inv = false, grow = 1, h = 52, icon = '', style = '' } = {}) => `<button type="button" onClick="{{${onClick}}}" class="sc-press" style="flex-grow: ${grow}; height: ${h}px; padding: 0 20px; border: 0; border-radius: 999px; background: ${inv ? '{{t.inv}}' : '{{t.surf}}'}; color: ${inv ? '{{t.invText}}' : '{{t.text}}'}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; ${style}">${icon ? svg(I[icon], 16, 2) : ''}${label}</button>`;
  const input = (value, change, placeholder, extra = '') => `<input type="text" value="{{${value}}}" onChange="{{${change}}}" placeholder="${placeholder}" autocomplete="off" style="height: 48px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px; ${extra}">`;

  // ----- step 1: what to make cards from
  const row = (icon, title, sub, click) => `<button type="button" onClick="{{${click}}}" class="sc-press" style="width: 100%; min-height: 68px; box-sizing: border-box; padding: 12px 16px 12px 12px; display: flex; align-items: center; gap: 14px; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;"><span style="width: 44px; height: 44px; flex-shrink: 0; border-radius: 22px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(I[icon] || EXTRA[icon], 20, 1.8)}</span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 16px; font-weight: 600; letter-spacing: -.01em;">${title}</span><span style="font-size: 13px; color: {{t.muted}};">${sub}</span></span><span style="display: flex; color: {{t.muted}};">${svg(I.chev, 16, 2)}</span></button>`;
  const pick = `<div style="display: flex; flex-direction: column; gap: 10px;">
    ${row('upload', 'Upload', 'A PDF, slides, a Word file, captions, pictures or audio', 'pickFile')}
    ${row('image', 'Photo', 'Notes, slides, a whiteboard or a book page', 'pickPhoto')}
    ${row('mic', 'Record a lecture', 'Use your microphone', 'pickRecord')}
    ${row('paste', 'Paste', 'Text or notes', 'pickPaste')}
    ${row('youtube', 'YouTube', 'A public video', 'pickVideo')}
    ${row('sparkle', 'A topic', 'Say what you want to study', 'pickTopic')}
  </div>`;

  // ----- step 2: the source, then the options
  const fileRow = `<div style="min-height: 56px; box-sizing: border-box; padding: 8px 8px 8px 12px; display: flex; align-items: center; gap: 12px; border-radius: 16px; background: {{t.surf}};"><span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;"><sc-if value="{{f.isDoc}}" hint-placeholder-val="{{ true }}">${svg(I.file, 17, 1.8)}</sc-if><sc-if value="{{f.isImage}}" hint-placeholder-val="{{ false }}">${svg(I.image, 17, 1.8)}</sc-if><sc-if value="{{f.isAudio}}" hint-placeholder-val="{{ false }}">${svg(I.audio, 17, 1.8)}</sc-if></span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{f.name}}</span><span style="font-size: 12px; color: {{t.muted}};">{{f.size}}</span></span><button type="button" onClick="{{f.remove}}" aria-label="Remove {{f.name}}" style="width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 16px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 14, 2)}</button></div>`;
  const drop = phone => `<div onDragOver="{{dragOver}}" onDrop="{{drop}}" style="box-sizing: border-box; padding: ${phone ? 20 : 26}px 20px; border-radius: 22px; background: {{t.surf}}; box-shadow: inset 0 0 0 1.5px {{t.line}}; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;">
      <span style="display: flex; color: {{t.muted}};">${svg(I.upload, 26, 1.6)}</span>
      <span style="font-size: 15px; font-weight: 600;">{{dropLine}}</span>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">${btn('{{chooseLabel}}', 'choose', { h: 40, icon: 'upload', inv: true, style: 'padding: 0 18px;' })}<sc-if value="{{canCamera}}" hint-placeholder-val="{{ false }}">${btn('Take a photo', 'camera', { h: 40, icon: 'image', style: 'padding: 0 18px; background: {{t.bg}};' })}</sc-if></div>
      <span style="font-size: 12px; color: {{t.muted}};">{{acceptLine}}</span>
    </div>
    <sc-if value="{{hasFiles}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 8px;"><sc-for list="{{files}}" as="f" hint-placeholder-count="1">${fileRow}</sc-for></div></sc-if>`;
  const recorder = `<div style="box-sizing: border-box; padding: 22px 20px; border-radius: 22px; background: {{t.surf}}; display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">{{recState}}</span>
      <span style="font-family: ${MONO}; font-size: 44px; font-weight: 500; letter-spacing: -.02em; line-height: 1;">{{recTime}}</span>
      <div aria-hidden="true" style="width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 3px;"><sc-for list="{{bars}}" as="b" hint-placeholder-count="40"><span style="width: 3px; height: {{b.h}}; border-radius: 2px; background: {{b.bg}};"></span></sc-for></div>
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
        <sc-if value="{{recIdle}}" hint-placeholder-val="{{ false }}">${btn('Start recording', 'recStart', { icon: 'mic', inv: true, h: 52, style: 'padding: 0 26px;' })}</sc-if>
        <sc-if value="{{recLive}}" hint-placeholder-val="{{ true }}">${btn('{{recPauseLabel}}', 'recPause', { h: 52, icon: 'pause', style: 'padding: 0 22px; background: {{t.bg}};' })}${btn('Stop', 'recStop', { inv: true, h: 52, style: 'padding: 0 28px;' })}<button type="button" onClick="{{recDiscard}}" aria-label="Discard the recording" style="${ROUND} width: 52px; height: 52px; border-radius: 26px; background: {{t.bg}}; color: {{t.muted}};">${svg(I.close, 16, 2)}</button></sc-if>
      </div>
      <span style="max-width: 420px; font-size: 12px; line-height: 1.45; text-align: center; color: {{t.muted}};">{{recNote}}</span>
    </div>`;
  const textarea = (value, change, placeholder, rows) => `<textarea rows="${rows}" onChange="{{${change}}}" placeholder="${placeholder}" style="resize: none; border: 0; outline: 0; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; line-height: 1.5;">{{${value}}}</textarea>`;
  const source = phone => `
    <sc-if value="{{isFile}}" hint-placeholder-val="{{ false }}">${drop(phone)}</sc-if>
    <sc-if value="{{isPhoto}}" hint-placeholder-val="{{ false }}">${drop(phone)}</sc-if>
    <sc-if value="{{isRecord}}" hint-placeholder-val="{{ false }}">${recorder}</sc-if>
    <sc-if value="{{isPaste}}" hint-placeholder-val="{{ false }}">${textarea('text', 'setText', 'Paste your text or notes', phone ? 7 : 8)}</sc-if>
    <sc-if value="{{isVideo}}" hint-placeholder-val="{{ false }}">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${input('url', 'setUrl', 'youtube.com/watch?v=…')}
        <sc-if value="{{videoLine}}" hint-placeholder-val="{{ true }}"><span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">{{videoLine}}</span></sc-if>
        <sc-if value="{{showTranscript}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 8px;">${textarea('text', 'setText', 'Paste the transcript', phone ? 5 : 6)}<span style="font-size: 13px; line-height: 1.45; color: {{t.muted}};">On YouTube, open the video’s description, tap Show transcript, then copy it.</span></div></sc-if>
        <button type="button" onClick="{{toggleTranscript}}" style="align-self: flex-start; padding: 0; border: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-decoration: underline; cursor: pointer;">{{transcriptLabel}}</button>
      </div>
    </sc-if>
    <sc-if value="{{isTopic}}" hint-placeholder-val="{{ false }}">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${input('topic', 'setTopic', 'I want to study…', 'height: 52px; font-size: 17px;')}
        <div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{topics}}" as="x" hint-placeholder-count="4"><button type="button" onClick="{{x.pick}}" style="height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;">{{x.label}}</button></sc-for></div>
        ${phone ? '' : `<sc-if value="{{liveShow}}" hint-placeholder-val="{{ true }}"><a href="{{liveHref}}" style="align-self: flex-start; font-size: 14px; font-weight: 600; text-decoration: underline; color: {{t.text}};">Play it live with friends instead</a></sc-if>`}
      </div>
    </sc-if>
    <sc-if value="{{isFrom}}" hint-placeholder-val="{{ false }}"><div style="min-height: 56px; box-sizing: border-box; padding: 10px 16px; display: flex; align-items: center; gap: 12px; border-radius: 16px; background: {{t.surf}};"><span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;">${svg(I.history, 17, 1.8)}</span><span style="display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{fromName}}</span><span style="font-size: 12px; color: {{t.muted}};">More cards from this source</span></span></div></sc-if>`;
  const chip = (label, on, click) => `<button type="button" onClick="{{${click}}}" aria-pressed="{{${on}Pressed}}" style="height: 36px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{${on}Bg}}; color: {{${on}Fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${label}</button>`;
  const options = phone => `<div style="display: flex; flex-direction: column; gap: 16px;">
    ${field('Into deck', `<div style="display: flex; flex-direction: column; gap: 8px;">${input('deckName', 'setDeckName', '{{deckPlaceholder}}', 'height: 44px; font-size: 15px;')}<div style="display: flex; flex-wrap: wrap; gap: 6px;"><sc-for list="{{deckChips}}" as="d" hint-placeholder-count="3"><button type="button" onClick="{{d.pick}}" aria-pressed="{{d.pressed}}" style="height: 32px; max-width: 100%; padding: 0 12px; border: 0; border-radius: 999px; background: {{d.bg}}; color: {{d.fg}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{d.name}}</button></sc-for></div></div>`)}
    ${field('How many cards', seg('counts'))}
    <div style="display: grid; grid-template-columns: ${phone ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)'}; gap: 16px;">
      ${field('Kinds', `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="display: flex; gap: 8px; flex-wrap: wrap;">${chip(svg(I.check, 13, 2.4) + 'Basic', 'basic', 'toggleBasic')}${chip(svg(I.check, 13, 2.4) + 'Fill in the blank', 'cloze', 'toggleCloze')}<sc-if value="{{canAudio}}" hint-placeholder-val="{{ false }}">${chip(svg(I.check, 13, 2.4) + 'Audio', 'audio', 'toggleAudio')}</sc-if><sc-if value="{{canImage}}" hint-placeholder-val="{{ false }}">${chip(svg(I.check, 13, 2.4) + 'Image', 'image', 'toggleImage')}</sc-if></div><sc-if value="{{audioOn}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 1.45; color: {{t.muted}};">{{audioLine}}</span></sc-if><sc-if value="{{imageOn}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 1.45; color: {{t.muted}};">{{imageLine}}</span></sc-if></div>`)}
      ${field('Language', `<label style="position: relative; display: flex; align-items: center;"><select onChange="{{setLang}}" aria-label="Language of the cards" style="appearance: none; -webkit-appearance: none; width: 100%; height: 36px; padding: 0 34px 0 14px; border: 0; outline: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;"><sc-for list="{{langs}}" as="l" hint-placeholder-count="3"><sc-if value="{{l.on}}" hint-placeholder-val="{{ false }}"><option value="{{l.code}}" selected>{{l.name}}</option></sc-if><sc-if value="{{l.off}}" hint-placeholder-val="{{ true }}"><option value="{{l.code}}">{{l.name}}</option></sc-if></sc-for></select><span style="position: absolute; right: 12px; display: flex; pointer-events: none; color: {{t.muted}};">${svg(I.chevDown, 14, 2)}</span></label>`)}
    </div>
  </div>`;

  // ----- making, checking, and when it can't go on
  const making = `<div style="display: flex; flex-direction: column; gap: 22px; padding: 18px 0 6px;">
    <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 17px; font-weight: 600; letter-spacing: -.01em;">{{progWord}}</span><span style="font-size: 14px; color: {{t.muted}};">{{progLine}}</span></div>
    <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{progPct}}" style="height: 6px; border-radius: 3px; background: {{t.surf2}}; overflow: hidden;"><div style="width: {{progWidth}}; height: 100%; border-radius: 3px; background: {{t.inv}}; transition: width .5s ease;"></div></div>
  </div>`;
  const reviewCard = `<div style="box-sizing: border-box; padding: 14px 8px 14px 16px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: flex-start; gap: 8px; opacity: {{c.op}};">
      <sc-if value="{{c.isImage}}" hint-placeholder-val="{{ false }}"><div aria-hidden="true" style="position: relative; width: 84px; height: 64px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: #FFFFFF; box-shadow: inset 0 0 0 1px {{t.line}};"><img src="{{c.thumb}}" alt="" draggable="false" style="width: 100%; height: 100%; object-fit: contain; display: block;"><sc-for list="{{c.shapes}}" as="b" hint-placeholder-count="3"><div style="position: absolute; left: {{b.x}}; top: {{b.y}}; width: {{b.w}}; height: {{b.h}}; box-sizing: border-box; border: 1px solid #000000; background: rgba(255,255,255,.4);"></div></sc-for></div></sc-if>
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
        <sc-if value="{{c.isImage}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; text-decoration: {{c.strike}};">{{c.q}}</span><span style="font-size: 14px; line-height: 1.4; color: {{t.muted}}; overflow-wrap: anywhere;">{{c.a}}</span></sc-if>
        <sc-if value="{{c.reading}}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: flex-start; gap: 8px;"><sc-if value="{{c.isAudio}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{c.say}}" aria-label="Hear {{c.q}}" style="width: 28px; height: 28px; flex-shrink: 0; margin-top: -3px; border: 0; border-radius: 14px; background: {{t.bg}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.audio, 14, 2)}</button></sc-if><span style="font-size: 15px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; text-decoration: {{c.strike}};">{{c.q}}</span></div><span style="font-size: 14px; line-height: 1.4; color: {{t.muted}}; overflow-wrap: anywhere;">{{c.a}}</span></sc-if>
        <sc-if value="{{c.editing}}" hint-placeholder-val="{{ false }}">
          <sc-if value="{{c.isBasic}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 6px;"><input type="text" value="{{c.front}}" onChange="{{c.setFront}}" aria-label="Question" style="height: 40px; box-sizing: border-box; padding: 0 12px; border: 0; outline: 0; border-radius: 12px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 15px;"><input type="text" value="{{c.back}}" onChange="{{c.setBack}}" aria-label="Answer" style="height: 40px; box-sizing: border-box; padding: 0 12px; border: 0; outline: 0; border-radius: 12px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 15px;"></div></sc-if>
          <sc-if value="{{c.isAudio}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 6px;"><input type="text" value="{{c.speak}}" onChange="{{c.setSpeak}}" aria-label="Words to say" style="height: 40px; box-sizing: border-box; padding: 0 12px; border: 0; outline: 0; border-radius: 12px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 15px;"><input type="text" value="{{c.back}}" onChange="{{c.setBack}}" aria-label="What it means" style="height: 40px; box-sizing: border-box; padding: 0 12px; border: 0; outline: 0; border-radius: 12px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 15px;"></div></sc-if>
          <sc-if value="{{c.isCloze}}" hint-placeholder-val="{{ false }}"><textarea rows="2" onChange="{{c.setText}}" aria-label="Sentence with a blank in [[double brackets]]" style="resize: none; border: 0; outline: 0; border-radius: 12px; padding: 10px 12px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 15px; line-height: 1.4;">{{c.text}}</textarea></sc-if>
        </sc-if>
        <sc-if value="{{c.hasAt}}" hint-placeholder-val="{{ true }}"><span style="font-family: ${MONO}; font-size: 11px; color: {{t.muted}};">{{c.at}}</span></sc-if>
      </div>
      <div style="display: flex; flex-shrink: 0; gap: 2px;">
        <sc-if value="{{c.canEdit}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{c.toggleEdit}}" aria-label="{{c.editLabel}}" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;"><sc-if value="{{c.editing}}" hint-placeholder-val="{{ false }}">${svg(I.check, 16, 2.2)}</sc-if><sc-if value="{{c.notEditing}}" hint-placeholder-val="{{ true }}">${svg(I.pencil, 15, 2)}</sc-if></button></sc-if>
        <button type="button" onClick="{{c.toggleGone}}" aria-label="{{c.goneLabel}}" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;"><sc-if value="{{c.gone}}" hint-placeholder-val="{{ false }}">${svg(I.undo, 15, 2)}</sc-if><sc-if value="{{c.kept}}" hint-placeholder-val="{{ true }}">${svg(I.close, 15, 2)}</sc-if></button>
      </div>
    </div>`;
  // The starter notes drafted from the same material (a note for each part, joined in order): shown beside the cards, kept with them unless the switch is turned off.
  const notesPanel = `<sc-if value="{{hasNotes}}" hint-placeholder-val="{{ true }}">
    <section aria-label="Notes" style="box-sizing: border-box; padding: 14px 16px; border-radius: 20px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 15px; font-weight: 600;">Notes for the deck</span><span style="font-size: 13px; line-height: 1.4; color: {{t.muted}};">{{notesLine}}</span></span>
        <button type="button" role="switch" aria-checked="{{notesSw.checked}}" aria-disabled="{{notesSw.disabled}}" aria-label="Save these notes with the cards" onClick="{{toggleNotes}}" class="sc-sw" style="width: 48px; height: 28px; flex-shrink: 0; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{notesSw.track}}; opacity: {{notesSw.op}}; cursor: pointer;"><span style="display: block; width: 22px; height: 22px; border-radius: 11px; background: {{notesSw.knobColor}}; transform: {{notesSw.knob}};"></span></button>
      </div>
      <button type="button" onClick="{{toggleNotesOpen}}" aria-expanded="{{notesExpanded}}" style="align-self: flex-start; padding: 0; border: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-decoration: underline; cursor: pointer;">{{notesOpenLabel}}</button>
      <sc-if value="{{notesOpen}}" hint-placeholder-val="{{ false }}"><div class="gd" ref="{{notesRef}}" data-sc-own style="--gd-text: {{t.text}}; --gd-muted: {{t.muted}}; --gd-line: {{t.line}}; --gd-code: {{t.bg}}; max-height: ${'${PHONE_NOTES_H}'}px; overflow-y: auto; scrollbar-width: none; opacity: {{notesOp}};"></div></sc-if>
    </section>
  </sc-if>`;
  const review = phone => `<div style="display: flex; flex-direction: column; gap: 14px; min-height: 0;">
    <span style="font-size: 14px; color: {{t.muted}};">{{reviewLine}}</span>
    <sc-if value="{{hasFigs}}" hint-placeholder-val="{{ false }}"><span style="display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 1.4; color: {{t.muted}};"><span style="display: flex; flex-shrink: 0; color: {{t.text}};">${svg(I.image, 15, 1.8)}</span>{{figLine}}</span></sc-if>
    ${notesPanel.replace('${PHONE_NOTES_H}', phone ? '220' : '260')}
    <div style="display: flex; flex-direction: column; gap: 8px; ${phone ? 'max-height: 520px;' : 'max-height: 470px;'} overflow-y: auto; scrollbar-width: none; margin: 0 -4px; padding: 0 4px;"><sc-for list="{{cards}}" as="c" hint-placeholder-count="4">${reviewCard}</sc-for></div>
  </div>`;
  const problem = `<div style="display: flex; flex-direction: column; gap: 14px; padding: 8px 0 0;"><span style="font-size: 17px; font-weight: 600; line-height: 1.35;">{{errMessage}}</span><span style="font-size: 14px; line-height: 1.45; color: {{t.muted}};">{{errMore}}</span></div>`;

  const footer = `
    <sc-if value="{{showFooter}}" hint-placeholder-val="{{ true }}"><div style="display: flex; gap: 10px;">${btn('Back', 'back', { grow: 1 })}<sc-if value="{{showMake}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{make}}" class="sc-press" style="flex-grow: 2; height: 52px; padding: 0 20px; border: 0; border-radius: 999px; background: {{makeBg}}; color: {{makeFg}}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">${svg(I.sparkle, 16, 2)}Make cards</button></sc-if></div></sc-if>
    <sc-if value="{{isMaking}}" hint-placeholder-val="{{ false }}"><div style="display: flex; gap: 10px;">${btn('Cancel', 'cancel', { grow: 1 })}</div></sc-if>
    <sc-if value="{{isReview}}" hint-placeholder-val="{{ false }}"><div style="display: flex; gap: 10px;">${btn('Discard', 'discard', { grow: 1 })}<button type="button" onClick="{{save}}" class="sc-press" style="flex: 2 1 0; min-width: 0; height: 52px; padding: 0 20px; border: 0; border-radius: 999px; background: {{saveBg}}; color: {{saveFg}}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;"><span style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{saveLabel}}</span></button></div></sc-if>
    <sc-if value="{{isError}}" hint-placeholder-val="{{ false }}"><div style="display: flex; gap: 10px;">${btn('Back', 'back', { grow: 1 })}<sc-if value="{{errPro}}" hint-placeholder-val="{{ false }}"><a href="Pricing.dc.html" class="sc-press" style="flex-grow: 2; height: 52px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600;">Go Pro</a></sc-if><sc-if value="{{errRetry}}" hint-placeholder-val="{{ true }}">${btn('Try again', 'retry', { grow: 2, inv: true })}</sc-if></div></sc-if>`;

  const body = phone => `
    <div style="display: flex; align-items: center; gap: 10px; min-height: 44px;">
      <sc-if value="{{canBack}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{back}}" aria-label="Back" style="${ROUND}">${svg(I.back, 18, 2)}</button></sc-if>
      <span style="flex-grow: 1; min-width: 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">{{title}}</span>
      <sc-if value="{{canClose}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{close}}" aria-label="Close" style="${ROUND}">${svg(I.close, 16, 2)}</button></sc-if>
    </div>
    <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 16px; ${phone ? 'overflow-y: auto; scrollbar-width: none;' : 'overflow-y: auto; scrollbar-width: none;'}">
      <sc-if value="{{isPick}}" hint-placeholder-val="{{ false }}">${pick}</sc-if>
      <sc-if value="{{isAdd}}" hint-placeholder-val="{{ true }}">${source(phone)}<sc-if value="{{hasWarn}}" hint-placeholder-val="{{ false }}"><span role="alert" style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{warn}}</span></sc-if>${options(phone)}</sc-if>
      <sc-if value="{{isMaking}}" hint-placeholder-val="{{ false }}">${making}</sc-if>
      <sc-if value="{{isReview}}" hint-placeholder-val="{{ false }}">${review(phone)}<sc-if value="{{hasWarn}}" hint-placeholder-val="{{ false }}"><span role="alert" style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{warn}}</span></sc-if></sc-if>
      <sc-if value="{{isError}}" hint-placeholder-val="{{ false }}">${problem}</sc-if>
    </div>
    ${footer}`;

  const webMake = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDecks" dark="{{dark}}" dim="{{dim}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; z-index: 40; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Make cards" style="position: absolute; z-index: 40; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 640px; max-height: 840px; box-sizing: border-box; padding: 28px; border-radius: 36px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 18px;">
    ${body(false)}
  </div>
</div>`;
  const phoneMake = `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="PhoneToday" dark="{{dark}}" dim="{{dim}}" hint-size="390px,844px"></dc-import>
  <div style="position: absolute; inset: 0; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Make cards" style="position: absolute; left: 0; right: 0; bottom: 0; top: 46px; box-sizing: border-box; padding: 16px 20px 30px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;">
    ${body(true)}
  </div>
</div>`;

  // ----- the logic: what the page draws comes from db.make.view() (web/make.js), or on the canvas from a sample for the board's step
  const logic = phone => `
constructor(props) { super(props); this.state = {}; }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, R = this.rich(), md = this.md(), M = db.mock ? this.mockMaterials().make : db.make, plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  M.enter({ kind: p.kind, deckId: p.deckId, from: p.from, guide: p.guide, page: p.page, step: p.step });
  const v = M.view(), step = v.step, kind = v.kind, o = v.opts, lim = v.limits, mock = !!db.mock;
  const TITLES = { file: 'Upload', photo: 'Photos', record: 'Record a lecture', paste: 'Paste', video: 'YouTube', topic: 'A topic' };
  const title = step === 'add' ? (v.from ? 'More cards' : TITLES[kind] || 'Make cards') : step === 'making' ? 'Making your cards' : step === 'review' ? 'Check your cards' : 'Make cards';
  const mmss = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
  const segBtn = (label, on, go) => ({ label, pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none', pick: go });
  const decks = db.decks().slice(0, 5), chosen = o.deckId ? decks.find(d => d.id === o.deckId) || db.decks().find(d => d.id === o.deckId) : null;
  // The recorder: the time, the state in words, and a quiet meter of how loud it is.
  const rec = v.rec, live = !!rec && rec.state !== 'saving';
  const bars = Array.from({ length: 40 }, (_, i) => { const lv = rec ? rec.levels[rec.levels.length - 40 + i] : undefined, x = lv == null ? 0 : lv; return { h: Math.round(4 + x * 28) + 'px', bg: x ? t.text : t.line }; });
  const topics = ['The Krebs cycle', 'Spanish travel phrases', 'The French Revolution', 'Linear algebra basics'];
  const addable = step === 'add' && !(kind === 'record');
  const prog = v.progress, pct = prog.n ? Math.min(100, Math.round(100 * prog.i / prog.n)) : 0;
  const cards = v.cards.map(c => { const q = c.kind === 'cloze' ? R.plain(c.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : c.kind === 'audio' ? c.speak : c.front, a = c.kind === 'cloze' ? R.blanks(c.text, { math: 'show' }).join(', ') : c.back, ed = v.editing === c.key;
    const img = c.kind === 'image', parts = img ? (c.parts || []) : [];
    const meta = [c.kind === 'audio' ? 'Read aloud · ' + c.lang : '', img ? plural(parts.length, 'card') + ', one for each label' : '', c.at].filter(Boolean).join(' · ');
    return { q: img ? c.front : q, a: img ? parts.slice(0, 8).join(', ') + (parts.length > 8 ? ', and ' + (parts.length - 8) + ' more' : '') : a, at: meta, hasAt: !!meta, isImage: img, canEdit: !img, thumb: img ? c.image : '', shapes: img ? (c.boxes || []).map(b => ({ x: +(b.x * 100).toFixed(2) + '%', y: +(b.y * 100).toFixed(2) + '%', w: +(b.w * 100).toFixed(2) + '%', h: +(b.h * 100).toFixed(2) + '%' })) : [],
      editing: ed && !img, notEditing: !ed, reading: !ed && !img, isBasic: c.kind === 'basic', isCloze: c.kind === 'cloze', isAudio: c.kind === 'audio', front: c.front, back: c.back, text: c.text, speak: c.speak || '', gone: !!c.gone, kept: !c.gone, op: c.gone ? '.45' : '1', strike: c.gone ? 'line-through' : 'none',
      editLabel: ed ? 'Done editing' : 'Edit this card', goneLabel: c.gone ? 'Put this card back' : 'Remove this card',
      toggleEdit: () => M.openCard(c.key), toggleGone: () => M.remove(c.key, !c.gone), say: () => (mock ? null : db.act.speak(c.speak, c.lang)),
      setFront: e => M.edit(c.key, { front: e && e.target ? e.target.value : '' }), setBack: e => M.edit(c.key, { back: e && e.target ? e.target.value : '' }), setText: e => M.edit(c.key, { text: e && e.target ? e.target.value : '' }), setSpeak: e => M.edit(c.key, { speak: e && e.target ? e.target.value : '' }) }; });
  // The notes drafted beside the cards: a line on what is in them, the switch that keeps them, and the draft itself (drawn as a Guide page is).
  const N = v.notes, full = !!v.notesFull, keepN = v.keepNotes !== false && !full, nOpen = this.state.notesOpen != null ? !!this.state.notesOpen : mock && p.step === 'Review (notes open)';
  const sw = (on, enabled = true) => ({ checked: on ? 'true' : 'false', track: on ? t.inv : t.surf2, knob: on ? 'translateX(20px)' : 'translateX(0)', knobColor: on ? t.invText : t.bg, op: enabled ? '1' : '.4', disabled: enabled ? 'false' : 'true' });
  const noteAts = N ? N.sections.map(x => x.at).filter(Boolean) : [];
  const notesLine = N ? (full ? 'This deck has every page a Guide can have, so these notes can’t be added. Delete a page in its Guide to make room.'
    : plural(N.sections.length, 'note') + (noteAts.length > 1 ? ' · ' + noteAts[0] + ' to ' + noteAts[noteAts.length - 1] : noteAts.length ? ' · ' + noteAts[0] : '') + (keepN ? ' · saved with the cards' : ' · not saved')) : '';
  // (A picture is one row to keep or leave out, and makes a card for each label hidden in it.)
  const keep = v.cards.filter(c => !c.gone).reduce((n, c) => n + (c.kind === 'image' ? Math.max(1, (c.parts || []).length) : 1), 0), err = v.error;
  const into = chosen ? chosen.name : (o.deckName.trim() || v.title || v.name || 'a new deck');
  const LANGS = [['', 'Same as the material'], ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ar', 'Arabic'], ['hi', 'Hindi']];
  const files = v.files.map(f => ({ ...f, isDoc: f.fam === 'doc', isImage: f.fam === 'image', isAudio: f.fam === 'audio', remove: () => M.removeFile(f.i) }));
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const tooLong = v.limits.minutes;
  return {
    t, ...chrome, dark: !!p.dark, dim: !!p.dim,
    isPick: step === 'pick', isAdd: step === 'add', isMaking: step === 'making', isReview: step === 'review', isError: step === 'error', title,
    canBack: (step === 'add' && !live) || step === 'error', canClose: step !== 'making' && !live, showFooter: step === 'add' && !live,
    back: () => M.back(), close: () => (mock ? null : M.close()), cancel: () => M.cancel(), discard: () => M.discard(), retry: () => M.retry(), save: () => M.save(), make: () => M.make(),
    pickFile: () => M.choose('file'), pickPhoto: () => M.choose('photo'), pickRecord: () => M.choose('record'), pickPaste: () => M.choose('paste'), pickVideo: () => M.choose('video'), pickTopic: () => M.choose('topic'),
    // A topic can also be a live game (it needs a big screen, so only the web offers it): the setup opens with the topic filled in.
    liveShow: kind === 'topic' && String(v.topic || '').trim().length >= 2, liveHref: mock ? 'LiveSetup.dc.html' : '/live/new?topic=' + encodeURIComponent(String(v.topic || '').trim()),
    isFile: kind === 'file' && !v.from, isPhoto: kind === 'photo' && !v.from, isRecord: kind === 'record' && !v.from, isPaste: kind === 'paste' && !v.from, isVideo: kind === 'video' && !v.from, isTopic: kind === 'topic' && !v.from, isFrom: !!v.from, fromName: v.from ? v.from.name : '',
    files, hasFiles: files.length > 0, dropLine: kind === 'photo' ? 'Add your photos' : 'Drop a file here', chooseLabel: kind === 'photo' ? 'Choose photos' : 'Choose a file',
    acceptLine: kind === 'photo' ? 'Up to ' + lim.photos + ' pictures' : 'PDF, slides, Word, captions, text, pictures or audio · up to ' + lim.fileMB + ' MB', canCamera: kind === 'photo' && (coarse || mock),
    choose: () => M.pickFiles(false), camera: () => M.pickFiles(true), dragOver: e => { if (e && e.preventDefault) e.preventDefault(); }, drop: e => { if (e && e.preventDefault) { e.preventDefault(); const l = e.dataTransfer && e.dataTransfer.files; if (l && l.length) M.addFiles([...l]); } },
    recIdle: !live, recLive: live, bars, recTime: mmss(rec ? rec.secs : 0), recState: !rec ? 'Ready' : rec.state === 'paused' ? 'Paused' : rec.state === 'saving' ? 'Saving…' : 'Recording', recPauseLabel: rec && rec.state === 'paused' ? 'Resume' : 'Pause',
    recStart: () => M.recStart(), recPause: () => (rec && rec.state === 'paused' ? M.recResume() : M.recPause()), recStop: () => M.recStop(), recDiscard: () => M.recDiscard(),
    recNote: 'When you stop, the recording goes to Lucida, and an AI service writes it out as text. The recording stays with your deck, up to ' + plural(lim.minutes, 'minute') + ' at a time.',
    text: v.text, setText: e => M.setText(e && e.target ? e.target.value : ''), topic: v.topic, setTopic: e => M.setTopic(e && e.target ? e.target.value : ''), url: v.url, setUrl: e => M.setUrl(e && e.target ? e.target.value : ''),
    topics: topics.map(x => ({ label: x, pick: () => M.setTopic(x) })),
    showTranscript: v.transcript || (!v.videoOn && !mock), transcriptLabel: v.transcript ? 'Use the link instead' : 'Paste the transcript instead', toggleTranscript: () => M.useTranscript(!v.transcript),
    videoLine: v.videoOn ? 'Lucida watches public videos, up to ' + plural(lim.minutes, 'minute') + '.' : 'Lucida can’t watch videos yet, so paste the transcript.',
    deckName: o.deckName, deckPlaceholder: chosen ? '' : (v.title || v.name || 'New deck name'), setDeckName: e => { M.setOpt('deckId', ''); M.setOpt('deckName', e && e.target ? e.target.value : ''); },
    deckChips: decks.map(d => { const on = o.deckId === d.id; return { name: d.name, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text, pick: () => { M.setOpt('deckId', on ? '' : d.id); M.setOpt('deckName', ''); } }; }),
    counts: [['Auto', 'auto'], ['10', 10], ['20', 20], ['50', 50]].map(([l, n]) => segBtn(l, o.count === n, () => M.setOpt('count', n))),
    // Audio cards are for learning a language, so the choice is there only once a language is set, and it starts off.
    canAudio: !!o.lang, audioOn: !!o.lang && !!o.audio, audioPressed: o.audio ? 'true' : 'false', audioBg: o.audio ? t.inv : t.surf, audioFg: o.audio ? t.invText : t.text, toggleAudio: () => M.setOpt('audio', !o.audio),
    audioLine: 'Words and short phrases in ' + ((LANGS.find(x => x[0] === o.lang) || [])[1] || 'that language') + ' are read aloud by your device’s voice. The back says what they mean.',
    // Image (picture cards from the diagrams found in the material): offered where there may be some; it starts off.
    canImage: !!v.canImage, imageOn: !!v.canImage && !!o.image, imagePressed: o.image ? 'true' : 'false', imageBg: o.image ? t.inv : t.surf, imageFg: o.image ? t.invText : t.text, toggleImage: () => M.setOpt('image', !o.image),
    imageLine: v.from ? 'A card for each label of this source’s diagrams, with the label hidden.' : 'A card for each label of the diagrams in it, with the label hidden.',
    hasFigs: step === 'review' && v.figures > 0, figLine: plural(v.figures, 'diagram') + ' found. ' + (v.figures === 1 ? 'It is' : 'They are') + ' kept in the deck’s Diagrams tab.',
    basicPressed: o.basic ? 'true' : 'false', basicBg: o.basic ? t.inv : t.surf, basicFg: o.basic ? t.invText : t.text, toggleBasic: () => M.setOpt('basic', !o.basic),
    clozePressed: o.cloze ? 'true' : 'false', clozeBg: o.cloze ? t.inv : t.surf, clozeFg: o.cloze ? t.invText : t.text, toggleCloze: () => M.setOpt('cloze', !o.cloze),
    langs: LANGS.map(([code, name]) => ({ code, name, on: o.lang === code, off: o.lang !== code })), setLang: e => M.setOpt('lang', e && e.target ? e.target.value : ''),
    showMake: addable, makeBg: v.ready ? t.inv : t.surf2, makeFg: v.ready ? t.invText : t.muted,
    hasWarn: !!(err && err.soft), warn: err && err.soft ? err.message : '',
    progWord: prog.word || 'Getting ready…', progLine: prog.phase === 'write' || prog.phase === 'read' ? plural(prog.i, 'part') + ' of ' + prog.n + ' done' : prog.phase === 'see' ? prog.i + ' of ' + plural(prog.n, 'step') + ' done' : prog.phase === 'send' && prog.n > 1 ? prog.i + ' of ' + prog.n + ' sent' : 'This takes a moment', progPct: pct, progWidth: Math.max(4, pct) + '%',
    hasNotes: step === 'review' && !!N, notesLine, notesSw: sw(keepN, !full), toggleNotes: () => (full ? null : M.setKeepNotes(!keepN)), toggleNotesOpen: () => this.setState({ notesOpen: !nOpen }), notesOpen: nOpen, notesExpanded: nOpen ? 'true' : 'false',
    notesOpenLabel: nOpen ? 'Hide the notes' : 'Read the notes', notesOp: keepN ? '1' : '.5',
    notesRef: el => { const k = N ? N.text.length + ':' + (() => { let h = 0; for (let i = 0; i < N.text.length; i++) h = (h * 31 + N.text.charCodeAt(i)) | 0; return h; })() : ''; if (el.getAttribute('data-k') !== k) { el.innerHTML = N ? md.render(N.text) : ''; el.setAttribute('data-k', k); } },
    cards, reviewLine: plural(keep, 'card') + (v.name || v.title ? ' from ' + (v.name || v.title) : ''), saveLabel: v.saving ? 'Saving…' : keep ? 'Add ' + plural(keep, 'card') + ' to ' + into : 'No cards to add', saveBg: keep ? t.inv : t.surf2, saveFg: keep ? t.invText : t.muted,
    errMessage: err && !err.soft ? err.message : '', errMore: err && err.code === 'video-failed' ? 'You can paste the video’s transcript instead.' : err && err.code === 'video-off' ? 'On YouTube, open the video’s description, tap Show transcript, then copy it.' : '',
    errPro: !!(err && err.pro), errRetry: !!(err && !err.pro && err.again)
  };
}`;

  const props = { ...DARK, grain: MESH('Iris').grain, step: { editor: 'enum', default: 'Pick', options: MAKE_STEPS } };
  return {
    'WebMake': ['Web · Make cards (pick the step)', webMake, { props, logic: logic(false), css: GUIDE_CSS, w: W, h: HH }],
    'PhoneMake': ['iPhone · Make cards (pick the step)', phoneMake, { props, logic: logic(true), css: GUIDE_CSS, w: PW, h: PH }],
    ...guideBoards(H)
  };
}

// ---------- the rendered Guide's look (the markup comes from web/guide.js; every board that draws one carries this) ----------
// The wrapper sets four colors (--gd-text, --gd-muted, --gd-line, --gd-code) from the board's theme, so one set of rules serves light, dark and gray.
export const GUIDE_CSS = [
  '.gd{font-size:15px;line-height:1.6;color:var(--gd-text);overflow-wrap:anywhere}.gd>:first-child{margin-top:0}.gd>:last-child{margin-bottom:0}',
  '.gd h1,.gd h2,.gd h3,.gd h4,.gd h5,.gd h6{margin:1.3em 0 .5em;line-height:1.25;font-weight:600;letter-spacing:-.02em}',
  '.gd h1{font-size:1.65em;padding-bottom:.3em;border-bottom:1px solid var(--gd-line)}.gd h2{font-size:1.32em;padding-bottom:.25em;border-bottom:1px solid var(--gd-line)}.gd h3{font-size:1.12em}.gd h4,.gd h5,.gd h6{font-size:1em}.gd h6{color:var(--gd-muted)}',
  '.gd p{margin:0 0 .9em}.gd ul,.gd ol{margin:0 0 .9em;padding-left:1.5em}.gd li{margin:.25em 0}.gd li>ul,.gd li>ol{margin:.25em 0 0}',
  '.gd li.gd-task{list-style:none;margin-left:-1.5em;display:flex;gap:.55em;align-items:baseline}.gd li.gd-task>input{flex-shrink:0;margin:0;accent-color:var(--gd-text)}',
  '.gd blockquote{margin:0 0 .9em;padding:0 1em;border-left:3px solid var(--gd-line);color:var(--gd-muted)}.gd blockquote>:last-child{margin-bottom:0}',
  ".gd code{font-family:'Geist Mono',ui-monospace,monospace;font-size:.88em;padding:.15em .4em;border-radius:6px;background:var(--gd-code)}",
  '.gd pre{margin:0 0 .9em;padding:12px 14px;border-radius:12px;background:var(--gd-code);overflow:auto;line-height:1.5}.gd pre code{padding:0;background:none;font-size:.85em}',
  '.gd table{display:block;border-collapse:collapse;margin:0 0 .9em;overflow:auto;max-width:100%}.gd th,.gd td{padding:6px 12px;border:1px solid var(--gd-line);text-align:left}.gd th{font-weight:600;background:var(--gd-code)}',
  '.gd hr{border:0;border-top:1px solid var(--gd-line);margin:1.3em 0}.gd a{color:inherit;text-decoration:underline;text-underline-offset:2px}.gd img{max-width:100%;height:auto;border-radius:12px}'
].join('');
const GUIDE_VARS = 'style="--gd-text: {{t.text}}; --gd-muted: {{t.muted}}; --gd-line: {{t.line}}; --gd-code: {{t.bg}};"';

// ---------- what the deck pages carry: Guide, Sources, the Add cards menu, and a source opened ----------
// `phone` draws the iPhone page's version. Each returns a piece of template; `DECK_MATERIALS_JS` is the logic they read (it goes in each deck
// board's renderVals, and its `gs` goes in what it returns).
export function deckBlocks(H, phone) {
  const { svg, I, MONO } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name] || EXTRA[name], size, w);
  const small = (label, handler, ic, attrs = '') => `<button type="button" onClick="{{${handler}}}" ${attrs} style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.bg}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${ic ? icon(ic, 14, 2) : ''}${label}</button>`;
  const link = (label, href, ic) => `<a href="${href}" style="height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: {{t.bg}}; color: {{t.text}}; font-size: 13px; font-weight: 600;">${ic ? icon(ic, 14, 2) : ''}${label}</a>`;
  const guide = `<sc-if value="{{gs.guideShow}}" hint-placeholder-val="{{ true }}">
    <section aria-label="Guide" style="min-width: 0; box-sizing: border-box; padding: ${phone ? '18px 18px 16px' : '20px 24px 18px'}; border-radius: ${phone ? 22 : 24}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Guide</span>
        <sc-if value="{{gs.hasTabs}}" hint-placeholder-val="{{ true }}"><div role="group" aria-label="Guide pages" style="display: flex; gap: 4px; flex-wrap: wrap;"><sc-for list="{{gs.tabs}}" as="g" hint-placeholder-count="3"><button type="button" onClick="{{g.pick}}" aria-pressed="{{g.pressed}}" style="height: 28px; max-width: 180px; padding: 0 12px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{g.title}}</button></sc-for></div></sc-if>
        <span style="flex-grow: 1;"></span>
        <sc-if value="{{gs.canEdit}}" hint-placeholder-val="{{ true }}"><div style="display: flex; gap: 6px;"><sc-if value="{{gs.hasText}}" hint-placeholder-val="{{ true }}">${link('Make cards', '{{gs.makeHref}}', 'sparkle')}</sc-if>${link('{{gs.editLabel}}', '{{gs.editHref}}', 'pencil')}</div></sc-if>
      </div>
      <sc-if value="{{gs.hasText}}" hint-placeholder-val="{{ true }}">
        <div style="position: relative; ${'{{gs.clip}}'}">
          <div class="gd" ref="{{gs.ref}}" data-sc-own ${GUIDE_VARS}></div>
        </div>
        <sc-if value="{{gs.long}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{gs.toggle}}" aria-expanded="{{gs.expanded}}" style="align-self: flex-start; padding: 0; border: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-decoration: underline; cursor: pointer;">{{gs.toggleLabel}}</button></sc-if>
      </sc-if>
      <sc-if value="{{gs.empty}}" hint-placeholder-val="{{ false }}"><a href="{{gs.editHref}}" style="min-height: 64px; box-sizing: border-box; padding: 14px 18px; display: flex; align-items: center; gap: 12px; border-radius: 16px; background: {{t.bg}}; color: {{t.text}};"><span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${icon('plus', 16, 2)}</span><span style="display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 15px; font-weight: 600;">Add a guide</span><span style="font-size: 13px; color: {{t.muted}};">Notes, links and a plan for this deck</span></span></a></sc-if>
    </section>
  </sc-if>`;
  // The deck page's sections: Cards, Notes (the Guide and its pages) and Sources (what the cards were made from; only for the deck's owner). A row of tabs with room for
  // one more. A section with a count shows it (cards, sources).
  const tabs = `<sc-if value="{{gs.showSections}}" hint-placeholder-val="{{ true }}"><div role="tablist" aria-label="Deck sections" style="flex-shrink: 0; display: flex; gap: ${phone ? 22 : 28}px; border-bottom: 1px solid {{t.line}}; overflow-x: auto; scrollbar-width: none;"><sc-for list="{{gs.sections}}" as="x" hint-placeholder-count="3"><button type="button" role="tab" aria-selected="{{x.selected}}" onClick="{{x.pick}}" style="position: relative; height: ${phone ? 44 : 46}px; padding: 0; flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: {{x.fg}}; font: inherit; font-size: 15px; font-weight: 600; white-space: nowrap; cursor: pointer;"><span>{{x.label}}</span><sc-if value="{{x.hasCount}}" hint-placeholder-val="{{ true }}"><span style="font-family: ${MONO}; font-size: 12px; font-weight: 500; color: {{t.muted}};">{{x.count}}</span></sc-if><span aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 1px; background: {{x.bar}};"></span></button></sc-for></div></sc-if>`;
  const sources = `<sc-if value="{{gs.sourcesShow}}" hint-placeholder-val="{{ true }}">
    <section aria-label="Sources" style="min-width: 0; box-sizing: border-box; padding: ${phone ? '18px 18px 10px' : '20px 20px 10px'}; border-radius: ${phone ? 22 : 24}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 10px; min-height: 34px;"><span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Sources</span><span style="font-family: ${MONO}; font-size: 12px; color: {{t.muted}};">{{gs.sourceCount}}</span><span style="flex-grow: 1;"></span><sc-if value="{{gs.canEdit}}" hint-placeholder-val="{{ true }}">${link('Make cards', '{{gs.makeHref}}', 'sparkle')}</sc-if></div>
      <sc-if value="{{gs.sourcesNone}}" hint-placeholder-val="{{ false }}"><div style="padding: 14px 0 20px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid {{t.line}};"><span style="font-size: 15px; font-weight: 600;">Nothing here yet</span><span style="font-size: 13px; line-height: 1.5; color: {{t.muted}};">When Lucida makes cards from a file, a recording, a link or a topic, the source is kept here. You can open it, make more cards from it, or delete it. Cards you write yourself have no source.</span></div></sc-if>
      <div style="display: flex; flex-direction: column;"><sc-for list="{{gs.sources}}" as="s" hint-placeholder-count="3">
        <button type="button" onClick="{{s.open}}" aria-label="Open {{s.name}}" style="min-height: 60px; box-sizing: border-box; padding: 8px 0; display: flex; align-items: center; gap: 12px; border: 0; border-top: 1px solid {{t.line}}; background: transparent; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;">
          <span style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center;"><sc-if value="{{s.isFile}}" hint-placeholder-val="{{ true }}">${icon('file', 17, 1.8)}</sc-if><sc-if value="{{s.isPhoto}}" hint-placeholder-val="{{ false }}">${icon('image', 17, 1.8)}</sc-if><sc-if value="{{s.isRecording}}" hint-placeholder-val="{{ false }}">${icon('mic', 17, 1.8)}</sc-if><sc-if value="{{s.isVideo}}" hint-placeholder-val="{{ false }}">${icon('youtube', 17, 1.8)}</sc-if><sc-if value="{{s.isText}}" hint-placeholder-val="{{ false }}">${icon('paste', 17, 1.8)}</sc-if><sc-if value="{{s.isTopic}}" hint-placeholder-val="{{ false }}">${icon('sparkle', 17, 1.8)}</sc-if></span>
          <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{s.name}}</span><span style="font-size: 12px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{s.line}}</span></span>
          <span style="display: flex; color: {{t.muted}};">${icon('chev', 15, 2)}</span>
        </button></sc-for></div>
    </section>
  </sc-if>`;
  // A source opened: what it is, what it holds (its text with where each part is from, the recording, the pictures), and what can be done with it.
  const viewerBody = `<div style="display: flex; align-items: center; gap: 12px;"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em; overflow-wrap: anywhere;">{{vw.name}}</span><span style="font-size: 13px; color: {{t.muted}};">{{vw.line}}</span></span><button type="button" onClick="{{vw.close}}" aria-label="Close" style="width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${icon('close', 16, 2)}</button></div>
    <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 14px;">
      <sc-if value="{{vw.hasAudio}}" hint-placeholder-val="{{ false }}"><audio controls preload="none" src="{{vw.audio}}" style="width: 100%;"></audio></sc-if>
      <sc-if value="{{vw.hasPhotos}}" hint-placeholder-val="{{ false }}"><div style="display: grid; grid-template-columns: repeat(${phone ? 2 : 3}, minmax(0, 1fr)); gap: 8px;"><sc-for list="{{vw.photos}}" as="x" hint-placeholder-count="3"><a href="{{x.href}}" target="_blank" rel="noopener" style="display: block; border-radius: 14px; overflow: hidden; background: {{t.surf}}; aspect-ratio: 1;"><img src="{{x.href}}" alt="{{x.file}}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;"></a></sc-for></div></sc-if>
      <sc-if value="{{vw.hasTopic}}" hint-placeholder-val="{{ false }}"><div style="padding: 16px 18px; border-radius: 18px; background: {{t.surf}}; font-size: 16px; line-height: 1.5;">{{vw.topic}}</div></sc-if>
      <sc-if value="{{vw.hasParts}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 18px; background: {{t.surf}};"><sc-for list="{{vw.parts}}" as="p" hint-placeholder-count="3"><div ref="{{p.ref}}" data-hit="{{p.hit}}" style="display: flex; flex-direction: column; gap: 4px; margin: -6px -10px; padding: 6px 10px; border-radius: 12px; background: {{p.bg}};"><sc-if value="{{p.hasAt}}" hint-placeholder-val="{{ true }}"><span style="font-family: ${MONO}; font-size: 12px; color: {{p.atColor}};">{{p.at}}</span></sc-if><span style="font-size: 14px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere;">{{p.text}}</span></div></sc-for></div></sc-if>
      <sc-if value="{{vw.loading}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; color: {{t.muted}};">One moment…</span></sc-if>
      <sc-if value="{{vw.noText}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.5; color: {{t.muted}};">{{vw.noTextLine}}</span></sc-if>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <sc-if value="{{vw.hasOpen}}" hint-placeholder-val="{{ true }}"><a href="{{vw.openHref}}" target="_blank" rel="noopener" class="sc-press" style="flex: 1 1 0; min-width: 130px; height: 48px; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 600;">${icon('link', 16, 2)}{{vw.openLabel}}</a></sc-if>
      <sc-if value="{{vw.canEdit}}" hint-placeholder-val="{{ true }}"><a href="{{vw.moreHref}}" class="sc-press" style="flex: 1 1 0; min-width: 130px; height: 48px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 600;">${icon('sparkle', 16, 2)}More cards</a><button type="button" onClick="{{vw.remove}}" class="sc-press" style="height: 48px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.again}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Delete</button></sc-if>
    </div>`;
  const viewer = phone => `<sc-if value="{{vw.open}}" hint-placeholder-val="{{ false }}">
    <div class="sc-scrim" onClick="{{vw.close}}" style="position: absolute; ${phone ? 'inset: 0;' : 'top: 0; right: 0; bottom: 0; left: 240px;'} background: {{t.dim}};"></div>
    <div role="dialog" aria-label="{{vw.name}}" class="${phone ? 'sc-sheet' : 'sc-panel'}" style="position: absolute; ${phone ? 'left: 0; right: 0; bottom: 0; top: 56px; padding: 20px 20px 34px; border-radius: 32px 32px 0 0;' : 'top: 12px; right: 12px; bottom: 12px; width: 520px; padding: 24px; border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,.24);'} box-sizing: border-box; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
      ${viewerBody}
    </div>
  </sc-if>`;
  // Add cards: a new card, cards made from a file, photo, video or topic, or imported ones. A menu on the deck page's top.
  const ADD_ROWS = [['plus', 'New card', 'Write one yourself', '{{gs.newCardHref}}'], ['sparkle', 'From a file, photo, video or topic', 'Lucida makes the cards', '{{gs.makeHref}}'], ['upload', 'Import cards', 'From Anki, Quizlet or a CSV', '{{gs.importHref}}']];
  const addMenu = (btn, pos, rows = ADD_ROWS) => `<div style="position: relative;">${btn}<sc-if value="{{gs.addOpen}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="Add cards" data-sc-pop style="position: absolute; ${pos} z-index: 30; width: 300px; box-sizing: border-box; padding: 8px; border-radius: 22px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 2px; text-shadow: none;">
    ${rows.map(([ic, a, b, h]) => `<a href="${h}" role="menuitem" style="min-height: 52px; box-sizing: border-box; padding: 8px 12px; display: flex; align-items: center; gap: 12px; border-radius: 14px; color: {{t.text}};"><span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 16px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;">${icon(ic, 15, 2)}</span><span style="display: flex; flex-direction: column; gap: 1px; min-width: 0;"><span style="font-size: 14px; font-weight: 600; line-height: 1.25;">${a}</span><span style="font-size: 12px; color: {{t.muted}};">${b}</span></span></a>`).join('')}
  </div></sc-if></div>`;
  return { guide, sources, tabs, viewer: viewer(phone), addMenu, ...diagramBlocks(H, phone) };
}

// The logic those pieces read, for a deck's own page (`dk` is the deck, and `this.md()` draws the Guide). Returns `gs`.
export const DECK_MATERIALS_JS = String.raw`
  const GS = (() => {
    const st = this.state, p = this.props, mock = !!db.mock, dm = mock ? this.mockMaterials() : db, G = dm.guide(dk.id), srcs = dm.sources(dk.id), md = this.md();
    const DGM = dm.diagrams, dgRows = DGM.rows(dk.id), dgv = DGM.view(dk.id, p.diagram || '');
    const pageId = G.pages.some(x => x.id === st.gpage) ? st.gpage : 'main', cur = pageId === 'main' ? { id: 'main', title: 'Guide', text: G.text } : G.pages.find(x => x.id === pageId);
    const text = (cur && cur.text) || '', hasAny = !!(G.text.trim() || G.pages.length), open = !!st.gopen, long = text.length > 640 || text.split('\n').length > 14;
    const sum = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
    const key = pageId + ':' + text.length + ':' + sum(text);
    const KIND = { file: 'File', photo: 'Photos', recording: 'Recording', video: 'YouTube', text: 'Text', topic: 'Topic' };
    const when = t => (t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
    const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    const mins = s => (s ? Math.max(1, Math.round(s / 60)) + ' min' : '');
    const sourceRows = srcs.map(s => ({ ...s, line: [KIND[s.kind] + (s.kind === 'file' && s.pages ? ' · ' + plural(s.pages, 'page') : s.kind === 'recording' ? ' · ' + mins(s.seconds) : ''), plural(s.cards, 'card'), when(s.at)].filter(Boolean).join(' · '),
      isFile: s.kind === 'file', isPhoto: s.kind === 'photo', isRecording: s.kind === 'recording', isVideo: s.kind === 'video', isText: s.kind === 'text', isTopic: s.kind === 'topic', open: () => this.setState({ viewing: s.id }) }));
    const viewing = st.viewing !== undefined ? st.viewing : p.sourceOpen || (mock && p.guide === 'A source open' ? 'x2' : ''), vs = srcs.find(x => x.id === viewing) || null;
    // A card can point into its source (its page, or its time): that part is marked, the audio starts there, and "Open the file" opens at that page.
    const at = st.viewing !== undefined ? '' : p.sourceAt || (mock && p.guide === 'A source open' ? '1:00' : ''), secs = ((/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(at) ? at : '').split(':').filter(Boolean).reduce((n, x) => n * 60 + +x, 0)) || 0;
    const pageNo = (/^(?:p\.?|page|slide)\s*(\d{1,5})$/i.exec(at) || [])[1] || '';
    const raw = vs && vs.textName ? dm.sourceText(vs.textName) : '', parts = [];
    const push = (a, text) => { const hit = !!at && a === at; parts.push({ at: a, hasAt: !!a, text, hit: hit ? 'true' : '', bg: hit ? t.bg : 'transparent', atColor: hit ? t.text : t.muted,
      ref: hit ? el => { if (this._seen !== viewing + '|' + at) { this._seen = viewing + '|' + at; el.scrollIntoView({ block: 'center' }); } } : () => {} }); };
    if (raw) { const bits = String(raw).split(/\n*<<([^>\n]*)>>\n/); if (bits[0].trim()) push('', bits[0].trim()); for (let i = 1; i < bits.length; i += 2) if ((bits[i + 1] || '').trim()) push(bits[i], bits[i + 1].trim()); }
    const sourceRow = vs ? sourceRows.find(x => x.id === vs.id) : null;
    const kind = vs ? vs.kind : '';
    // A recording kept in several files (a long one is cut into parts, and the microphone makes a file every ten minutes): the time asked for is in the part that covers it.
    let part = vs && vs.files[0] ? vs.files[0] : null, off = 0;
    if (vs && kind === 'recording' && vs.files.length > 1) { let o = 0; for (const f of vs.files) { part = f; off = o; if (!f.seconds || secs < o + f.seconds) break; o += f.seconds; } }
    const fileHref = part ? part.href : '', secsIn = Math.max(0, secs - off);
    const vw = vs ? { open: true, name: vs.name, line: sourceRow.line, close: () => this.setState({ viewing: '' }),
      hasAudio: kind === 'recording' && !!fileHref, audio: fileHref + (secsIn ? '#t=' + secsIn : ''), hasPhotos: kind === 'photo', photos: vs.files, hasTopic: kind === 'topic', topic: vs.text,
      hasParts: parts.length > 0, parts, loading: !!vs.textName && raw === null, noText: !parts.length && !!vs.textName && raw === '' || kind === 'file',
      noTextLine: kind === 'file' ? (vs.pages ? plural(vs.pages, 'page') + '. ' : '') + 'The cards from it say which page they came from.' : 'Nothing to show.',
      hasOpen: kind === 'video' ? !!vs.url : (kind === 'file' || kind === 'recording') && !!fileHref,
      openHref: kind === 'video' ? vs.url + (secs ? (/\?/.test(vs.url) ? '&' : '?') + 't=' + secs + 's' : '') : kind === 'file' && pageNo ? fileHref + '#page=' + pageNo : kind === 'recording' && secsIn ? fileHref + '#t=' + secsIn : fileHref, openLabel: kind === 'video' ? 'Open the video' : kind === 'recording' ? 'Open the recording' : 'Open the file',
      canEdit: G.can, moreHref: mock ? 'WebMake.dc.html' : '/make?from=' + encodeURIComponent(vs.id) + '&deck=' + encodeURIComponent(dk.id), remove: () => { if (mock) return; db.act.deleteSource(dk.id, vs.id).then(() => this.setState({ viewing: '' })); } }
      : { open: false, name: '', line: '', close: () => {}, hasAudio: false, audio: '', hasPhotos: false, photos: [], hasTopic: false, topic: '', hasParts: false, parts: [], loading: false, noText: false, noTextLine: '', hasOpen: false, openHref: '', openLabel: '', canEdit: false, moreHref: '', remove: () => {} };
    // The section on show (Cards unless the address or a tap says another, and only a section that is there): ?tab= in the address, a source opened from a card, or the canvas's setting.
    const cardsN = db.cards(dk.id).length, notesTab = hasAny || G.can, sourcesTab = !!G.can, dgTab = !!G.can || dgRows.length > 0;
    const dgState = mock && new RegExp(${JSON.stringify(DIAGRAM_STATE_RE)}).test(p.guide || '');
    const wanted = st.tab !== undefined ? st.tab : p.sourceOpen ? 'sources' : p.diagram ? 'diagrams' : mock ? (p.guide === 'A source open' ? 'sources' : dgState ? 'diagrams' : { Notes: 'notes', Diagrams: 'diagrams', Sources: 'sources' }[p.section] || 'cards') : { notes: 'notes', diagrams: 'diagrams', sources: 'sources' }[p.tab] || 'cards';
    const tab = wanted === 'notes' && notesTab ? 'notes' : wanted === 'diagrams' && dgTab ? 'diagrams' : wanted === 'sources' && sourcesTab ? 'sources' : 'cards';
    const tabList = [{ id: 'cards', label: 'Cards', count: String(cardsN) }, ...(notesTab ? [{ id: 'notes', label: 'Notes', count: '' }] : []), ...(dgTab ? [{ id: 'diagrams', label: 'Diagrams', count: dgRows.length ? String(dgRows.length) : '' }] : []), ...(sourcesTab ? [{ id: 'sources', label: 'Sources', count: sourceRows.length ? String(sourceRows.length) : '' }] : [])]
      .map(x => ({ ...x, hasCount: !!x.count, selected: x.id === tab ? 'true' : 'false', fg: x.id === tab ? t.text : t.muted, bar: x.id === tab ? t.text : 'transparent', pick: () => this.setState({ tab: x.id }) }));
    const gs = {
      sections: tabList, showSections: tabList.length > 1, showCards: tab === 'cards', noCards: tab === 'cards' && cardsN === 0, sourcesNone: sourceRows.length === 0,
      guideShow: tab === 'notes', empty: !hasAny && G.can, hasText: !!text.trim(), canEdit: G.can, editHref: mock ? 'WebGuide.dc.html' : db.href('guide', dk.id) + (pageId === 'main' ? '' : '?page=' + pageId), editLabel: hasAny ? 'Edit' : 'Write',
      makeHref: mock ? 'WebMake.dc.html' : '/make?deck=' + encodeURIComponent(dk.id), newCardHref: dk.newCardHref, importHref: db.href('import', dk.id),
      hasTabs: G.pages.length > 0, tabs: [{ id: 'main', title: 'Guide' }, ...G.pages].map(x => ({ title: x.title, pressed: x.id === pageId ? 'true' : 'false', bg: x.id === pageId ? t.bg : 'transparent', fg: x.id === pageId ? t.text : t.muted, pick: () => this.setState({ gpage: x.id, gopen: false }) })),
      long, expanded: open ? 'true' : 'false', toggle: () => this.setState({ gopen: !open }), toggleLabel: open ? 'Show less' : 'Show more',
      clip: long && !open ? 'max-height: 230px; overflow: hidden; -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent); mask-image: linear-gradient(180deg, #000 62%, transparent);' : '',
      ref: el => { if (el.getAttribute('data-k') !== key) { el.innerHTML = md.render(text); el.setAttribute('data-k', key); } },
      sourcesShow: tab === 'sources', sourceCount: String(sourceRows.length), sources: sourceRows,
      addOpen: !!st.addOpen, addExpanded: st.addOpen ? 'true' : 'false', toggleAdd: () => this.setState({ addOpen: !st.addOpen }) };
    ${DIAGRAMS_JS}
    return { gs, vw, dg };
  })(), gs = GS.gs, vw = GS.vw, dg = GS.dg;`;

// ---------- the canvas's sample for these boards ----------
// Only the boards that draw them carry it (their logic calls this.mockMaterials()), so no other board changes. It answers like web/db.js:
// `make` (the step the board's "step" setting names), and a deck's Guide and Sources (the deck board's "guide" setting).
const MATERIALS_MOCK_BASE = String.raw`mockMaterials() {
  const p = this.props, noop = () => {};
  const day = (m, d) => new Date(2026, m, d, 10).getTime();
  const MK = (() => {
    const free = { perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20, audioMB: 25, cards: 100 }, pro = { perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40, audioMB: 25, cards: 100 };
    const base = { step: 'add', kind: '', from: null, on: true, videoOn: true, limits: pro, files: [], text: '', topic: '', url: '', transcript: false, title: '', opts: { count: 'auto', basic: true, cloze: true, audio: false, lang: '', deckId: '', deckName: '' },
      rec: null, progress: { word: '', phase: '', i: 0, n: 1 }, cards: [], figures: 0, canImage: false, notes: null, keepNotes: true, editing: '', error: null, saving: false, ready: false, name: '', job: '' };
    const slides = { i: 0, name: 'Lecture 3 slides.pdf', size: '4.2 MB', fam: 'doc' };
    const levels = Array.from({ length: 60 }, (_, i) => Math.round((.18 + .5 * Math.abs(Math.sin(i * .55)) * (.6 + .4 * Math.sin(i * .17))) * 100) / 100);
    const cards = [
      { key: 'k1', kind: 'basic', front: 'What does the electron transport chain pump across the inner membrane?', back: 'Protons (H⁺), from the matrix into the intermembrane space.', text: '', at: 'p. 4', gone: false },
      { key: 'k2', kind: 'cloze', front: '', back: '', text: 'The [[mitochondrion]] is the powerhouse of the cell.', at: 'p. 4', gone: false },
      { key: 'k3', kind: 'basic', front: 'What does ATP synthase make?', back: 'ATP, using the proton gradient.', text: '', at: 'p. 5', gone: false },
      { key: 'k4', kind: 'basic', front: 'Where does glycolysis happen?', back: 'In the cytoplasm.', text: '', at: 'p. 7', gone: true },
      { key: 'k5', kind: 'cloze', front: '', back: '', text: 'The Krebs cycle runs in the [[mitochondrial matrix]].', at: 'p. 8', gone: false },
      { key: 'k6', kind: 'basic', front: 'What carries electrons to the transport chain?', back: 'NADH and FADH₂.', text: '', at: 'p. 9', gone: false }];
    const notes = { title: 'Lecture 3 slides', overview: 'How cells make energy: the mitochondrion, the electron transport chain and the Krebs cycle. It ends with how ATP is made and what runs out without oxygen.',
      sections: [{ heading: 'The mitochondrion', at: 'p. 4', text: 'The **mitochondrion** makes most of the cell’s **ATP**. It has two membranes and is the site of the electron transport chain.' },
        { heading: 'The electron transport chain', at: 'p. 5', text: '- **NADH** and **FADH₂** pass electrons along the chain\n- Protons (H⁺) are pumped into the intermembrane space\n- **ATP synthase** lets them flow back and makes ATP' },
        { heading: 'Glycolysis', at: 'p. 7', text: 'Happens in the **cytoplasm** and splits one glucose into two **pyruvate**.' },
        { heading: 'The Krebs cycle', at: 'p. 8', text: '| Where | What it makes |\n| --- | --- |\n| **Matrix** | NADH, FADH₂ and a little ATP |' }],
      text: ['# Lecture 3 slides', '', 'How cells make energy: the mitochondrion, the electron transport chain and the Krebs cycle. It ends with how ATP is made and what runs out without oxygen.', '', '## The mitochondrion (p. 4)', '', 'The **mitochondrion** makes most of the cell’s **ATP**. It has two membranes and is the site of the electron transport chain.', '',
        '## The electron transport chain (p. 5)', '', '- **NADH** and **FADH₂** pass electrons along the chain', '- Protons (H⁺) are pumped into the intermembrane space', '- **ATP synthase** lets them flow back and makes ATP', '', '## Glycolysis (p. 7)', '', 'Happens in the **cytoplasm** and splits one glucose into two **pyruvate**.', '',
        '## The Krebs cycle (p. 8)', '', '| Where | What it makes |', '| --- | --- |', '| **Matrix** | NADH, FADH₂ and a little ATP |', ''].join('\n') };
    const spanish = [
      { key: 'k1', kind: 'audio', front: '', back: 'the house', text: '', speak: 'la casa', lang: 'es', at: '', gone: false },
      { key: 'k2', kind: 'audio', front: '', back: 'Good morning', text: '', speak: 'buenos días', lang: 'es', at: '', gone: false },
      { key: 'k3', kind: 'basic', front: 'When do you use “usted”?', back: 'To be formal or polite with someone, like a teacher or a stranger.', text: '', at: '', gone: false },
      { key: 'k4', kind: 'audio', front: '', back: 'Where is the library?', text: '', speak: '¿Dónde está la biblioteca?', lang: 'es', at: '', gone: false },
      { key: 'k5', kind: 'cloze', front: '', back: '', text: 'Ella [[tiene]] dos hermanos.', at: '', gone: false }];
    const art = this.diagramsMock().rows().filter(r => r.picture), pics = [
      { key: 'k7', kind: 'image', front: 'Animal cell', back: '', text: '', at: 'Slide 4', image: art[0] ? art[0].picture : '', parts: ['Nucleus', 'Mitochondrion', 'Mitochondrion'], boxes: [{ x: .41, y: .03, w: .12, h: .06 }, { x: .012, y: .785, w: .17, h: .06 }, { x: .8, y: .083, w: .17, h: .06 }], gone: false },
      { key: 'k8', kind: 'image', front: 'The Krebs cycle', back: '', text: '', at: 'Slide 9', image: art[1] ? art[1].picture : '', parts: ['Acetyl-CoA', 'Citrate', 'Isocitrate'], boxes: [{ x: .11, y: .12, w: .125, h: .05 }, { x: .47, y: .12, w: .07, h: .05 }, { x: .79, y: .12, w: .1, h: .05 }], gone: false }];
    const by = {
      'Pick': { step: 'pick' }, 'Upload': { kind: 'file' }, 'Upload (a file added)': { kind: 'file', files: [slides], ready: true, canImage: true },
      'Upload (picture cards on)': { kind: 'file', files: [slides], ready: true, canImage: true, opts: { count: 'auto', basic: true, cloze: true, audio: false, image: true, lang: '', deckId: '', deckName: '' } },
      'Photos': { kind: 'photo', ready: true, canImage: true, files: ['IMG_2041.jpg', 'IMG_2042.jpg', 'IMG_2043.jpg'].map((name, i) => ({ i, name, size: (1.1 + i * .3).toFixed(1) + ' MB', fam: 'image' })) },
      'Record': { kind: 'record' }, 'Recording': { kind: 'record', rec: { state: 'recording', secs: 754, levels, level: .4, limit: 7200 } }, 'Paused': { kind: 'record', rec: { state: 'paused', secs: 754, levels, level: 0, limit: 7200 } },
      'Paste': { kind: 'paste', ready: true, text: 'The mitochondrion is the powerhouse of the cell. It makes most of the cell’s ATP through the electron transport chain, which pumps protons across the inner membrane.\n\nThe nucleus holds the cell’s DNA, and the ribosomes translate mRNA into protein.' },
      'Paste (a language set)': { kind: 'paste', ready: true, text: 'la casa · the house\nbuenos días · good morning\n¿Dónde está la biblioteca? · Where is the library?\nElla tiene dos hermanos · She has two siblings', opts: { count: 'auto', basic: true, cloze: true, audio: true, lang: 'es', deckId: '', deckName: '' } },
      'YouTube': { kind: 'video', ready: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      'YouTube transcript': { kind: 'video', ready: true, transcript: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', text: '0:00\nWelcome to the lecture on enzymes\n0:20\nAn enzyme lowers the activation energy of a reaction' },
      'Topic': { kind: 'topic', ready: true, topic: 'The Krebs cycle' }, 'More from a source': { kind: 'file', ready: true, from: { deckId: 'cell', id: 'x1', name: 'Lecture 3 slides', kind: 'file' } },
      'Making': { step: 'making', kind: 'file', progress: { word: 'Writing cards…', phase: 'write', i: 3, n: 8 } },
      'Making a recording': { step: 'making', kind: 'record', progress: { word: 'Listening to your recording…', phase: 'read', i: 1, n: 2 } },
      'Review': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes },
      'Review (picture cards)': { step: 'review', kind: 'file', cards: [...cards.slice(0, 3), ...pics], name: 'Lecture 3 slides', notes, figures: 3, canImage: true }, 'Review (notes open)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes }, 'Review (notes off)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes, keepNotes: false },
      'Review (no room for notes)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes, notesFull: true },
      'Review (audio cards)': { step: 'review', kind: 'paste', cards: spanish, name: 'Spanish words', notes: { ...notes, title: 'Spanish words', sections: notes.sections.slice(0, 2).map(x => ({ ...x, at: '' })), text: '# Spanish words\n\nGreetings and words for the home and school.\n\n## Greetings\n\n**buenos días** means good morning. Use **usted** to be polite.\n\n## The home\n\n**la casa** is the house.\n' } },
      'Review (editing a card)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes, editing: 'k2' },
      'Limit reached': { step: 'error', kind: 'file', limits: free, error: { message: 'That’s today’s 3 free makes. Go Pro for 30 a day.', pro: true, code: 'day' } },
      'File too big': { step: 'add', kind: 'file', limits: free, files: [slides], ready: true, error: { message: 'That file is over 20 MB. Go Pro for up to 40 MB.', soft: true } },
      'Error': { step: 'error', kind: 'file', error: { message: 'The AI didn’t answer. Try again in a moment.', again: true } } };
    return { view: () => ({ ...base, ...(by[p.step] || by.Pick) }), enter: noop, begin: noop, choose: noop, back: noop, close: noop, pickFiles: noop, addFiles: noop, removeFile: noop, setText: noop, setTopic: noop, setUrl: noop, useTranscript: noop, setOpt: noop,
      recStart: noop, recPause: noop, recResume: noop, recStop: noop, recDiscard: noop, setKeepNotes: noop, make: noop, cancel: noop, retry: noop, edit: noop, openCard: noop, remove: noop, save: noop, discard: noop };
  })();
  const GD = (() => {
    const text = ['# Cell Biology: Exam 1', '', 'Everything for the first exam, in the order we covered it. Start with the checklist, then the mnemonics.', '', '## Checklist', '- [x] Organelles and what each one does', '- [x] The electron transport chain',
      '- [ ] Glycolysis, step by step', '- [ ] Mitosis versus meiosis', '', '## Mnemonics', '| Phase | Remember it as |', '| --- | --- |', '| Prophase | **P**ut your chromosomes in **P**lace |', '| Metaphase | **M**iddle of the cell |',
      '| Anaphase | **A**part they go |', '| Telophase | **T**wo new cells |', '', '> The mitochondrion makes most of the cell’s ATP.', '', 'Questions? Ask in [office hours](https://example.edu/office-hours).'].join('\n');
    const pages = [{ id: 'g1', title: 'Lecture 3 summary', text: '## Lecture 3\n\nThe **electron transport chain** pumps protons across the inner membrane.\n\n1. NADH gives up its electrons.\n2. Protons are pumped out of the matrix.\n3. ATP synthase lets them flow back and makes ATP.', at: 0 }, { id: 'g2', title: 'Mnemonics', text: '- **PMAT** for the phases of mitosis\n- *Please Do Not Throw Sausage Pizza Away* for the layers', at: 0 }];
    const file = (name, type, size, f) => ({ name, href: '/media/' + name, type, size, file: f });
    const sources = [
      { id: 'x1', kind: 'file', name: 'Lecture 3 slides', cards: 24, at: day(8, 18), url: '', text: '', textName: '', seconds: 0, pages: 32, files: [file('sx1-0.pdf', 'application/pdf', 4200000, 'Lecture 3 slides.pdf')], href: '/media/sx1-0.pdf' },
      { id: 'x2', kind: 'recording', name: 'Lecture 4 · Sep 21', cards: 18, at: day(8, 21), url: '', text: '', textName: 'sx2-text.txt', seconds: 2532, pages: 0, files: [file('sx2-0.m4a', 'audio/mp4', 6100000, 'Lecture 4.m4a')], href: '/media/sx2-0.m4a' },
      { id: 'x3', kind: 'video', name: 'Mitochondria explained', cards: 9, at: day(8, 20), url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', text: '', textName: 'sx3-text.txt', seconds: 0, pages: 0, files: [], href: '' },
      { id: 'x4', kind: 'photo', name: 'Whiteboard, Sep 22', cards: 6, at: day(8, 22), url: '', text: '', textName: '', seconds: 0, pages: 0, files: [file('sx4-0.jpg', 'image/jpeg', 1100000, 'IMG_2041.jpg'), file('sx4-1.jpg', 'image/jpeg', 1400000, 'IMG_2042.jpg')], href: '/media/sx4-0.jpg' },
      { id: 'x5', kind: 'topic', name: 'The Krebs cycle', cards: 12, at: day(8, 19), url: '', text: 'The Krebs cycle', textName: '', seconds: 0, pages: 0, files: [], href: '' }];
    const talk = '<<0:00>>\nWelcome back. Today we finish the electron transport chain and see how it makes ATP.\n\n<<1:00>>\nThe chain pumps protons across the inner membrane, and ATP synthase lets them flow back.\n\n<<2:00>>\nWithout oxygen as the last acceptor, the chain backs up and ATP production stops.';
    return { text, pages, sources, talk };
  })();
  const GMODE = p.guide || 'Guide and sources', RO = GMODE === 'Studying (read only)' || GMODE === 'Diagrams (studying)';
  return { make: MK, diagrams: this.diagramsMock(),
    publicGuide: () => (GMODE === 'No guide yet' ? { pages: [], sources: 0 } : { pages: [{ id: 'main', title: 'Guide', text: GD.text }, ...(GMODE === 'Guide pages' ? GD.pages : [])], sources: 5, diagrams: this.diagramsMock().rows().filter(r => r.group === 'Made').map(r => ({ id: r.id, kind: r.kind, name: r.name, at: r.at, ...(r.table ? { table: r.table } : { tree: r.tree }) })) }),
    guide: () => ({ deckId: 'cell', text: GMODE === 'No guide yet' ? '' : GMODE === 'Long guide' ? GD.text + '\n\n' + GD.text.replace('# Cell Biology: Exam 1', '## More for the exam') : GD.text, at: 0, pages: GMODE === 'Guide pages' ? GD.pages : [], can: !RO, studying: RO }),
    sources: () => (GMODE === 'No guide yet' || RO ? [] : GD.sources),
    sourceText: name => (/^sx2/.test(name) || /^sx3/.test(name) ? GD.talk : ''),
    guideHistory: () => Promise.resolve([{ at: day(8, 21), saved: 0, text: GD.text.replace('- [x] The electron transport chain', '- [ ] The electron transport chain') }, { at: day(8, 18), saved: 0, text: '# Cell Biology: Exam 1\n\nEverything for the first exam.' }]),
    saveGuide: () => Promise.resolve({}), addGuidePage: () => Promise.resolve('g9'), renameGuidePage: () => Promise.resolve({}), deleteGuidePage: () => Promise.resolve({}), restoreGuide: () => Promise.resolve({}), deleteSource: () => Promise.resolve({}) };
}`;
export const MATERIALS_MOCK = MATERIALS_MOCK_BASE + '\n' + DIAGRAMS_MOCK;

// ---------- the Guide's editor (WebGuide, PhoneGuide) ----------
export const GUIDE_VIEWS = ['Write', 'Preview', 'Older versions', 'A new page', 'Nothing written yet'];
function guideBoards(H) {
  const { svg, I, FONT, MONO, T, DB_JS, DARK, MESH, W, HH, PW, PH } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name] || EXTRA[name], size, w);
  const ROUND = 'width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;';
  // A toolbar button acts on a mouse press (so the text field keeps its place and selection) and on a click from the keyboard.
  const tb = (handler, label, inner, extra = '') => `<button type="button" onMouseDown="{{${handler}.down}}" onClick="{{${handler}.click}}" aria-label="${label}" title="${label}" style="min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; ${extra}">${inner}</button>`;
  const toolbar = `<div role="toolbar" aria-label="Formatting" style="display: flex; align-items: center; gap: 2px; overflow-x: auto; scrollbar-width: none;">
    ${tb('tbHeading', 'Heading', 'H')}${tb('tbBold', 'Bold', 'B', 'font-weight: 800;')}${tb('tbItalic', 'Italic', 'I', 'font-style: italic; font-family: Georgia, serif; font-size: 15px;')}${tb('tbCode', 'Code', '&lt;/&gt;', 'font-family: ' + MONO + '; font-size: 12px;')}
    <span aria-hidden="true" style="width: 1px; height: 18px; flex-shrink: 0; margin: 0 6px; background: {{t.line}};"></span>
    ${tb('tbLink', 'Link', icon('link', 16, 2))}${tb('tbBullets', 'Bulleted list', icon('list', 16, 2))}${tb('tbNumbers', 'Numbered list', '1.', 'font-family: ' + MONO + '; font-size: 12px;')}${tb('tbTasks', 'Task list', icon('check', 16, 2.2))}${tb('tbQuote', 'Quote', '“', 'font-size: 20px; font-family: Georgia, serif;')}${tb('tbTable', 'Table', icon('grid', 16, 2))}${tb('tbImage', 'Picture', icon('image', 16, 2))}
  </div>`;
  const body = phone => `
    <div style="display: flex; align-items: center; gap: 10px;">
      <button type="button" onClick="{{done}}" aria-label="Done" style="${ROUND}">${icon(phone ? 'back' : 'close', phone ? 18 : 16, 2)}</button>
      <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: ${phone ? 20 : 22}px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Guide</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{deckName}}</span></span>
      <span aria-live="polite" style="font-size: 13px; color: {{saveColor}};">{{saveLabel}}</span>
      <button type="button" onClick="{{toggleHistory}}" aria-pressed="{{histPressed}}" class="sc-press" style="height: 40px; padding: 0 ${phone ? 12 : 16}px; border: 0; border-radius: 20px; background: {{histBg}}; color: {{histFg}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer;">${icon('history', 15, 2)}${phone ? '' : 'History'}</button>
    </div>
    <div role="group" aria-label="Pages" style="display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex-shrink: 0;"><sc-for list="{{tabs}}" as="g" hint-placeholder-count="3"><button type="button" onClick="{{g.pick}}" aria-pressed="{{g.pressed}}" style="height: 34px; max-width: 220px; flex-shrink: 0; padding: 0 14px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{g.title}}</button></sc-for><sc-if value="{{canAddPage}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{addPage}}" aria-label="Add a page" style="height: 34px; flex-shrink: 0; padding: 0 14px 0 10px; border: 0; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px {{t.line}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; cursor: pointer;">${icon('plus', 14, 2.2)}Add page</button></sc-if></div>
    <sc-if value="{{pageTools}}" hint-placeholder-val="{{ false }}"><div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;"><input type="text" value="{{pageTitle}}" onChange="{{setPageTitle}}" aria-label="Page name" placeholder="Page name" style="flex-grow: 1; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 14px; border: 0; outline: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600;"><button type="button" onClick="{{deletePage}}" style="height: 40px; padding: 0 14px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">Delete page</button></div></sc-if>
    <sc-if value="{{showEditor}}" hint-placeholder-val="{{ true }}">
      <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; ${phone ? 'flex-wrap: wrap;' : ''}">
        <div role="group" aria-label="Write or Preview" style="display: flex; padding: 3px; border-radius: 999px; background: {{t.surf}}; flex-shrink: 0;"><sc-for list="{{tabsWP}}" as="o" hint-placeholder-count="2"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="height: 32px; padding: 0 16px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">{{o.label}}</button></sc-for></div>
        <sc-if value="{{isWrite}}" hint-placeholder-val="{{ true }}"><div style="min-width: 0; ${phone ? 'width: 100%; order: 3;' : 'flex-grow: 1;'}">${toolbar}</div></sc-if>
      </div>
      <sc-if value="{{isWrite}}" hint-placeholder-val="{{ true }}"><textarea ref="{{taRef}}" onChange="{{type}}" onKeyDown="{{keys}}" aria-label="Guide, in Markdown" placeholder="Write about this deck in Markdown: a plan, links, a summary, a table of terms." spellcheck="true" style="flex-grow: 1; min-height: 0; resize: none; box-sizing: border-box; border: 0; outline: 0; border-radius: 18px; padding: 16px 18px; background: {{t.surf}}; color: {{t.text}}; font-family: ${MONO}; font-size: ${phone ? 14 : 14}px; line-height: 1.65; tab-size: 2;">{{text}}</textarea></sc-if>
      <sc-if value="{{isPreview}}" hint-placeholder-val="{{ false }}"><div style="flex-grow: 1; min-height: 0; overflow-y: auto; box-sizing: border-box; padding: 18px 22px; border-radius: 18px; background: {{t.surf}};"><div class="gd" ref="{{previewRef}}" data-sc-own style="--gd-text: {{t.text}}; --gd-muted: {{t.muted}}; --gd-line: {{t.line}}; --gd-code: {{t.bg}};"></div><sc-if value="{{previewEmpty}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; color: {{t.muted}};">Nothing to show yet.</span></sc-if></div></sc-if>
      <div style="display: flex; gap: 10px; flex-shrink: 0;">
        <button type="button" onClick="{{makeCards}}" class="sc-press" style="flex: 1 1 0; min-width: 0; height: ${phone ? 50 : 52}px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; overflow: hidden; cursor: pointer;">${icon('sparkle', 16, 2)}<span style="overflow: hidden; text-overflow: ellipsis;">{{makeLabel}}</span></button>
        <button type="button" onClick="{{done}}" class="sc-press" style="flex: 1 1 0; height: ${phone ? 50 : 52}px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Done</button>
      </div>
    </sc-if>
    <sc-if value="{{histOpen}}" hint-placeholder-val="{{ false }}">
      <div style="flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 10px;">
        <span style="font-size: 14px; color: {{t.muted}};">{{histLine}}</span>
        <sc-for list="{{versions}}" as="v" hint-placeholder-count="2"><div style="box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;"><span style="flex-grow: 1; font-size: 14px; font-weight: 600;">{{v.when}}</span><span style="font-size: 12px; color: {{t.muted}};">{{v.size}}</span><button type="button" onClick="{{v.restore}}" class="sc-press" style="height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">Restore</button></div>
          <span style="font-size: 13px; line-height: 1.5; color: {{t.muted}}; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 84px; overflow: hidden;">{{v.excerpt}}</span>
        </div></sc-for>
        <sc-if value="{{noVersions}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; color: {{t.muted}};">There are no older versions yet. They show up here as you write.</span></sc-if>
      </div>
      <div style="display: flex; gap: 10px; flex-shrink: 0;"><button type="button" onClick="{{toggleHistory}}" class="sc-press" style="flex-grow: 1; height: ${phone ? 50 : 52}px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">Back to writing</button></div>
    </sc-if>`;
  const webGuide = `<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; font-family: ${FONT}; color: {{t.text}};">
  <dc-import name="WebDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="1440px,900px"></dc-import>
  <div style="position: absolute; inset: 0; z-index: 40; background: {{t.dim}};"></div>
  <div role="dialog" aria-label="Guide" style="position: absolute; z-index: 40; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 980px; height: 800px; box-sizing: border-box; padding: 24px 28px 26px; border-radius: 32px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 14px;">
    ${body(false)}
  </div>
</div>`;
  const phoneGuide = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; padding: 58px 16px 22px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
    ${body(true)}
  </div>`;

  const logic = phone => `
constructor(props) { super(props); this.state = { tab: props.view === 'Preview' ? 'preview' : 'write', histOpen: props.view === 'Older versions', drafts: {}, saving: false, err: '', hist: null }; }
componentWillUnmount() { clearTimeout(this._t); if (this._pending) this._flush(); }
renderVals() {
  ${T}${DB_JS}
  const p = this.props, st = this.state, mock = !!db.mock, dm = mock ? this.mockMaterials() : db, am = mock ? dm : db.act, md = this.md();
  const dk = db.deck(p.deckId || (mock ? 'cell' : '')), G = dm.guide(dk.id), deckId = dk.id;
  const extra = mock && p.view === 'A new page' ? [...G.pages, { id: 'gnew', title: 'New page', text: '' }] : G.pages;
  const want = st.page || p.page || (mock && p.view === 'A new page' ? 'gnew' : ''), pageId = extra.some(x => x.id === want) ? want : 'main';
  const cur = pageId === 'main' ? { id: 'main', title: 'Guide', text: G.text } : extra.find(x => x.id === pageId), key = deckId + '|' + pageId;
  const text = key in st.drafts ? st.drafts[key] : mock && p.view === 'Nothing written yet' ? '' : cur.text;
  const tab = st.tab, histOpen = !!st.histOpen, plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  // Saving as it's typed: a moment after the last key, one save after another. Leaving sends what's waiting.
  this._pending = this._pending || {};
  this._flush = async () => {
    clearTimeout(this._t);
    const jobs = Object.values(this._pending); this._pending = {};
    if (!jobs.length) return;
    this.setState({ saving: true, err: '' });
    try { for (const j of jobs) await am.saveGuide(j.deckId, j.page, j.text); this.setState({ saving: false, savedAt: Date.now() }); }
    catch (e) { for (const j of jobs) this._pending[j.deckId + '|' + j.page] = j; this.setState({ saving: false, err: e.message || 'Couldn’t save. Try again.' }); }
  };
  const setText = v => { this.setState({ drafts: { ...this.state.drafts, [key]: v }, err: '' }); this._pending[key] = { deckId, page: pageId, text: v }; clearTimeout(this._t); this._t = setTimeout(() => this._flush(), 700); };
  const ta = () => this._ta;
  // A formatting button: the text field's own text and selection go through guide.js, and the result goes back in.
  const act = (name, ...args) => { const el = ta(); if (!el) return; const r = md[name](el.value, el.selectionStart, el.selectionEnd, ...args); el.value = r.text; el.setSelectionRange(r.a, r.b); el.focus(); setText(r.text); };
  const btn = (fn) => ({ down: e => { if (e && e.preventDefault) e.preventDefault(); this._did = true; fn(); }, click: () => { if (this._did) { this._did = false; return; } fn(); } });
  const pickPicture = () => (mock ? Promise.resolve(null) : db.act.pickFile('image')).then(url => { if (url) act('image', url, ''); });
  const seg = (label, on, go) => ({ label, pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none', pick: go });
  const saved = st.err ? st.err : st.saving ? 'Saving…' : st.savedAt || Object.keys(st.drafts).length ? 'Saved' : '';
  const canAddPage = G.can && extra.length < 10, mark = G.can;
  const openHist = async () => { this.setState({ histOpen: true, hist: null }); await this._flush(); const v = await dm.guideHistory(deckId, pageId); this.setState({ hist: v }); };
  const when = t0 => new Date(t0).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const versions = (st.hist || (mock && histOpen ? [] : [])).map(v => ({ when: when(v.at), size: plural(v.text.length, 'character'), excerpt: v.text.slice(0, 220), restore: async () => { await am.restoreGuide(deckId, pageId, v.at); this.setState({ drafts: Object.fromEntries(Object.entries(this.state.drafts).filter(([k]) => k !== key)), histOpen: false, hist: null }); } }));
  const histNow = mock && histOpen && st.hist === null ? (dm.guideHistory(deckId, pageId).then(v => this.setState({ hist: v })), []) : versions;
  const goBack = () => (mock ? null : db.act.go('/deck/' + deckId + '?tab=notes'));
  return {
    t, ...chrome, dark: !!p.dark, dim: !!p.dim, deckId, deckName: dk.name || 'Cell Biology',
    done: async () => { await this._flush(); goBack(); },
    saveLabel: saved, saveColor: st.err ? t.again : t.muted,
    toggleHistory: () => (histOpen ? this.setState({ histOpen: false }) : openHist()), histPressed: histOpen ? 'true' : 'false', histBg: histOpen ? t.inv : t.surf, histFg: histOpen ? t.invText : t.text,
    tabs: [{ id: 'main', title: 'Guide' }, ...extra].map(x => ({ title: x.title, pressed: x.id === pageId ? 'true' : 'false', bg: x.id === pageId ? t.inv : t.surf, fg: x.id === pageId ? t.invText : t.text, pick: async () => { await this._flush(); this.setState({ page: x.id, histOpen: false, tab: 'write' }); } })),
    canAddPage, addPage: async () => { await this._flush(); const id = await am.addGuidePage(deckId, 'New page'); this.setState({ page: id, histOpen: false, tab: 'write' }); },
    pageTools: G.can && pageId !== 'main', pageTitle: cur.title, setPageTitle: e => { const v = e && e.target ? e.target.value : ''; clearTimeout(this._tt); this._tt = setTimeout(() => am.renameGuidePage(deckId, pageId, v).catch(() => {}), 600); },
    deletePage: async () => { if (!mock && !confirm('Delete the page “' + cur.title + '”?')) return; await am.deleteGuidePage(deckId, pageId); this.setState({ page: 'main', drafts: Object.fromEntries(Object.entries(this.state.drafts).filter(([k]) => k !== key)) }); },
    showEditor: !histOpen, isWrite: tab === 'write', isPreview: tab === 'preview',
    tabsWP: [seg('Write', tab === 'write', () => this.setState({ tab: 'write' })), seg('Preview', tab === 'preview', () => this.setState({ tab: 'preview' }))],
    text, type: e => setText(e && e.target ? e.target.value : ''), taRef: el => { this._ta = el; },
    keys: e => {
      if (!e || !this._ta) return;
      const el = this._ta, mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && !e.altKey && ['b', 'i', 'k'].includes(e.key.toLowerCase())) { e.preventDefault(); return act(e.key.toLowerCase() === 'b' ? 'bold' : e.key.toLowerCase() === 'i' ? 'italic' : 'link', ''); }
      if (e.key === 'Enter' && !e.shiftKey && !mod && !e.isComposing && el.selectionStart === el.selectionEnd) { const r = md.continueList(el.value, el.selectionStart); if (r) { e.preventDefault(); el.value = r.text; el.setSelectionRange(r.pos, r.pos); setText(r.text); } }
      if (e.key === 'Tab' && !mod && !e.altKey) { const r = md.indent(el.value, el.selectionStart, el.selectionEnd, !!e.shiftKey); if (r && r.text !== el.value) { e.preventDefault(); el.value = r.text; el.setSelectionRange(r.a, r.b); setText(r.text); } }
    },
    tbHeading: btn(() => act('heading', 2)), tbBold: btn(() => act('bold')), tbItalic: btn(() => act('italic')), tbCode: btn(() => act('code')), tbLink: btn(() => act('link', '')), tbBullets: btn(() => act('bullets')),
    tbNumbers: btn(() => act('numbers')), tbTasks: btn(() => act('tasks')), tbQuote: btn(() => act('quote')), tbTable: btn(() => act('table')), tbImage: btn(pickPicture),
    previewRef: el => { const k = key + ':' + text.length + ':' + text.slice(0, 40) + text.slice(-40); if (el.getAttribute('data-k') !== k) { el.innerHTML = md.render(text); el.setAttribute('data-k', k); } },
    previewEmpty: !text.trim(),
    makeLabel: ${phone ? "'Make cards'" : "'Make cards from this ' + (pageId === 'main' ? 'guide' : 'page')"},
    makeCards: () => { const el = ta(), sel = el && el.selectionEnd > el.selectionStart ? el.value.slice(el.selectionStart, el.selectionEnd) : ''; if (mock) return; this._flush().then(() => db.make.begin({ kind: 'paste', noNotes: true, text: sel || text, title: sel ? dk.name + ' (selection)' : dk.name + (pageId === 'main' ? ' Guide' : ': ' + cur.title), opts: { deckId } })); },
    histOpen, versions: histNow, noVersions: histOpen && st.hist !== null && !versions.length, histLine: 'Older versions of ' + (pageId === 'main' ? 'the Guide' : cur.title) + '. Restoring one keeps what you have now as a version too.'
  };
}`;
  const props = { ...DARK, grain: MESH('Iris').grain, view: { editor: 'enum', default: 'Write', options: GUIDE_VIEWS }, deckId: { editor: 'string', default: '' }, page: { editor: 'string', default: '' } };
  return {
    'WebGuide': ['Web · Deck Guide editor (pick the view)', webGuide, { props, logic: logic(false), css: GUIDE_CSS, w: W, h: HH }],
    'PhoneGuide': ['iPhone · Deck Guide editor (pick the view)', phoneGuide, { props, logic: logic(true), css: GUIDE_CSS, w: PW, h: PH }]
  };
}

// ---------- a shared deck's Guide, on its public page (web and iPhone) ----------
// The words are the owner's, shown to anyone: web/guide.js draws them safely (no raw HTML; links say nofollow ugc; a picture only from this app's own
// public storage). The Sources' files and names are never shared; the page only says how many the deck was made from.
export function publicGuideBlocks(H, phone) {
  const { svg, I } = H;
  const guide = `<sc-if value="{{gd.show}}" hint-placeholder-val="{{ true }}">
    <section aria-label="Guide" style="min-width: 0; box-sizing: border-box; padding: ${phone ? '18px 18px 16px' : '22px 26px 20px'}; border-radius: ${phone ? 22 : 26}px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 12px; margin-bottom: ${phone ? 4 : 20}px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;"><span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: {{t.muted}};">Guide</span>
        <sc-if value="{{gd.hasTabs}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="Guide pages" style="display: flex; gap: 4px; flex-wrap: wrap;"><sc-for list="{{gd.tabs}}" as="g" hint-placeholder-count="3"><button type="button" onClick="{{g.pick}}" aria-pressed="{{g.pressed}}" style="height: 28px; max-width: 180px; padding: 0 12px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">{{g.title}}</button></sc-for></div></sc-if></div>
      <div style="position: relative; {{gd.clip}}"><div class="gd" ref="{{gd.ref}}" data-sc-own style="--gd-text: {{t.text}}; --gd-muted: {{t.muted}}; --gd-line: {{t.line}}; --gd-code: {{t.bg}};"></div></div>
      <sc-if value="{{gd.long}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{gd.toggle}}" aria-expanded="{{gd.expanded}}" style="align-self: flex-start; padding: 0; border: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-decoration: underline; cursor: pointer;">{{gd.toggleLabel}}</button></sc-if>
    </section>
  </sc-if>`;
  const made = `<sc-if value="{{gd.hasMade}}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: {{t.muted}};">${svg(I.file, 14, 2)}<span>{{gd.madeLine}}</span></div></sc-if>`;
  return { guide, made };
}
// The logic for it, inside a shared deck page's renderVals (`d` is the page's deck, `t` its theme; this.md() draws the words).
export const PUBLIC_GUIDE_JS = String.raw`
  const GD = (() => {
    const st = this.state, p = this.props, md = this.md(), mock = !!db.mock, g = mock ? this.mockMaterials().publicGuide() : d.guide;
    const pages = g && Array.isArray(g.pages) ? g.pages.filter(x => x.text && x.text.trim()) : [], n = (g && g.sources) || 0;
    const id = pages.some(x => x.id === st.gpage) ? st.gpage : pages.length ? pages[0].id : '', cur = pages.find(x => x.id === id), text = cur ? cur.text : '';
    const open = !!st.gopen, long = text.length > 640 || text.split('\n').length > 14;
    const sum = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
    const key = id + ':' + text.length + ':' + sum(text);
    // Pictures only from this app's own storage (or, on this computer, its own /media), never from anywhere else.
    const image = src => (/^\/media\/[\w-]+\.(png|jpe?g|gif|webp)$/i.test(src) || /^https:\/\/[^/]+\/storage\/v1\/object\/public\/shared\/[\w./-]+\.(png|jpe?g|gif|webp)$/i.test(src) ? src : '');
    return { show: !!text, hasTabs: pages.length > 1, tabs: pages.map(x => ({ title: x.id === 'main' ? 'Guide' : x.title, pressed: x.id === id ? 'true' : 'false', bg: x.id === id ? t.bg : 'transparent', fg: x.id === id ? t.text : t.muted, pick: () => this.setState({ gpage: x.id, gopen: false }) })),
      long, expanded: open ? 'true' : 'false', toggle: () => this.setState({ gopen: !open }), toggleLabel: open ? 'Show less' : 'Show more',
      clip: long && !open ? 'max-height: 230px; overflow: hidden; -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent); mask-image: linear-gradient(180deg, #000 62%, transparent);' : '',
      ref: el => { if (el.getAttribute('data-k') !== key) { el.innerHTML = md.render(text, { image }); el.setAttribute('data-k', key); } },
      hasMade: n > 0, madeLine: 'Made from ' + n + (n === 1 ? ' source' : ' sources') };
  })();`;

// ---------- Live from a topic: the settings the Live boards show it with ----------
// Setting up (LiveSetup): questions from the deck's cards, from a topic (over a deck, or over the Library), while the AI writes them, and when it didn't work.
export const LIVE_FROM = ['A deck', 'A topic', 'A topic (from the Library)', 'Writing the questions', 'It didn’t work'];
// The end (LivePodium): after a game from a deck, from a topic (Save as a deck), and from a topic that was saved.
export const LIVE_TOPIC_STATES = ['A deck', 'A topic', 'A topic (saved)'];
