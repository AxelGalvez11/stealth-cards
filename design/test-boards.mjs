// The practice test's boards: WebTest and PhoneTest (one board each, with a state picker on the canvas: Set up, each kind of question,
// the questions' dialogs, and the results), and the small pieces a folder's page gets for it (the Practice test button, and how the
// last one went). A deck's page has none (the owner, 2026-10-02: "remove practice tests"). design/build.mjs wires them in; web/db.js
// runs the test (see "Practice test" there).
//
// The look: a calm, professional exam, not a game. Plain words, no colors but the app's own, no confetti, streaks, or points; the
// timer is a quiet number; nothing says right or wrong until you submit. Motion is quick and subtle (a question slides in 6 px), and
// off with Reduce Motion. Dark and gray (Tweaks) look like the neighbors'.
// The canvas's sample test (also copied into the iPhone app by design/to-ios.mjs, for its design screens).
import { CHAT_SAMPLE, chatMarkup, CHAT_CSS, CHAT_JS } from './chat.mjs';

export const TEST_SAMPLE = {
  name: 'Cell Biology', cards: 412, n: 20, answered: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14], flagged: [5, 12], at: { mc: 3, tf: 10, blank: 13, match: 15, type: 18, submit: 20 },
  mc: ['Which organelle packages proteins for secretion?', ['Golgi apparatus', 'Lysosome', 'Nucleus', 'Ribosome']],
  tf: ['True or false?', 'The ribosome copies DNA into mRNA.'],
  blank: ['The ____ is the powerhouse of the cell.', ['mitochondrion', 'nucleus', 'ribosome', 'lysosome']],
  type: 'What does the electron transport chain pump across the inner membrane?',
  match: [['Mitochondrion', 'Ribosome', 'Golgi apparatus', 'Nucleus', 'Lysosome'], ['Holds the cell’s DNA', 'Makes most of the cell’s ATP', 'Breaks down waste', 'Builds proteins from mRNA', 'Packages proteins for export']],
  picks: { mc: 0, tf: 1, blank: 0, type: 'protons', match: { 0: 1, 1: 3, 2: 4 } },
  // The results: 16 of 20 (the questions, as they were asked in sections: kind, words, statement, answer given, right answer).
  rows: [
    ['mc', 'What does the electron transport chain pump across the inner membrane?', '', 'Protons (H⁺)', 'Protons (H⁺)'], ['mc', 'Which organelle packages proteins for secretion?', '', 'Golgi apparatus', 'Golgi apparatus'],
    ['mc', 'Which organelle makes most of the cell’s ATP?', '', '', 'Mitochondrion'], ['mc', 'What holds the cell’s DNA?', '', 'The nucleus', 'The nucleus'], ['mc', 'What builds proteins from mRNA?', '', 'Ribosome', 'Ribosome'],
    ['mc', 'What breaks down waste in the cell?', '', 'Lysosome', 'Lysosome'], ['mc', 'Where does glycolysis happen?', '', 'In the cytoplasm', 'In the cytoplasm'], ['mc', 'What is the cell’s outer layer?', '', 'Membrane', 'Membrane'],
    ['tf', 'True or false?', 'The Golgi apparatus makes most of the cell’s ATP.', 'False', 'False'], ['tf', 'True or false?', 'The ribosome copies DNA into mRNA.', 'True', 'False'],
    ['tf', 'True or false?', 'The nucleus holds the cell’s DNA.', 'True', 'True'], ['tf', 'True or false?', 'Lysosomes build proteins.', 'False', 'False'],
    ['blank', 'The ____ is the powerhouse of the cell.', '', 'mitochondrion', 'mitochondrion'], ['blank', 'DNA is copied in the ____.', '', 'nucleus', 'nucleus'],
    ['match', 'Match each one to its answer.', '', '', '', [['Mitochondrion', 'Makes most of the cell’s ATP', 'Makes most of the cell’s ATP'], ['Ribosome', 'Builds proteins from mRNA', 'Builds proteins from mRNA'], ['Golgi apparatus', 'Breaks down waste', 'Packages proteins for export'], ['Nucleus', 'Holds the cell’s DNA', 'Holds the cell’s DNA'], ['Lysosome', 'Packages proteins for export', 'Breaks down waste']]],
    ['match', 'Match each one to its answer.', '', '', '', [['Cytoplasm', 'The jelly inside a cell', 'The jelly inside a cell'], ['Membrane', 'The cell’s outer layer', 'The cell’s outer layer'], ['Vacuole', 'Stores water in a plant cell', 'Stores water in a plant cell'], ['Chloroplast', 'Where photosynthesis happens', 'Where photosynthesis happens']]],
    ['type', 'Which organelle packages proteins for secretion?', '', 'golgi aparatus', 'Golgi apparatus'], ['type', 'What is the jelly inside a cell?', '', 'cytosol', 'Cytoplasm'],
    ['type', 'Which sugar is in DNA?', '', 'deoxyribose', 'Deoxyribose'], ['type', 'What do ribosomes make?', '', 'proteins', 'Proteins']
  ],
  wrong: [3, 10, 15, 18],
  // The folder's last result: day, "x of y", percent.
  past: [['Sep 28', '16 of 20', 80], ['Sep 24', '14 of 20', 70], ['Sep 19', '11 of 20', 55]], explain: 'The cell’s ATP mostly comes from the mitochondrion, which uses the energy in food to charge ATP. The Golgi apparatus only packages proteins, and the nucleus holds the DNA.'
};
export default function testKit(c) {
  // (OCC_JS, OCC_BOXES, and CELL are read when a board is made, not now: build.mjs defines them further down.)
  const { svg, I, FONT, MONO, DB_JS, T } = c;
  const SCREENS = ['Set up', 'Multiple choice', 'True or false', 'Fill in the blank', 'Written', 'Matching', 'Submit', 'Leave', 'Results', 'Results · missed'];
  // (explainOpen: the results' question 3 with its explanation open; followUp: a question asked about it, and answered: design/chat.mjs)
  const props = { dark: { editor: 'boolean', default: false }, dim: { editor: 'boolean', default: false }, screen: { editor: 'enum', default: 'Set up', options: SCREENS }, timed: { editor: 'boolean', default: true },
    explainOpen: { editor: 'boolean', default: false }, followUp: { editor: 'boolean', default: false } };
  const css = CHAT_CSS + '@keyframes scTA{from{opacity:0;transform:translateY(6px)}}@keyframes scTB{from{opacity:0;transform:translateY(6px)}}'
    + '.sc-topt{transition:background-color .15s,box-shadow .15s,opacity .15s}.sc-tdot{transition:background-color .15s,color .15s,box-shadow .15s}.sc-tnum{transition:background-color .15s,color .15s}'
    + '.sc-tfield:focus{box-shadow:inset 0 0 0 2px var(--tf,currentColor)!important;outline:0}'
    + '@media (prefers-reduced-motion:reduce){.sc-tq,.sc-topt,.sc-tdot,.sc-tnum,.sc-sheet,.sc-scrim{animation:none!important;transition:none!important}}';

  // ---------- pieces ----------
  const btn = (label, onClick, { inv = false, grow = 1, h = 52, icon = '', attrs = '', bg = '{{t.surf}}' } = {}) => `<button type="button" onClick="{{${onClick}}}"${attrs} class="sc-press" style="flex-grow: ${grow}; height: ${h}px; padding: 0 22px; border: 0; border-radius: 999px; background: ${inv ? '{{t.inv}}' : bg}; color: ${inv ? '{{t.invText}}' : '{{t.text}}'}; display: flex; align-items: center; justify-content: center; gap: 8px; font: inherit; font-size: 15px; font-weight: 600; white-space: nowrap; cursor: pointer;">${icon ? svg(I[icon], 16, 2) : ''}${label}</button>`;
  const seg = (list, h = 38) => `<div role="group" style="display: flex; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{${list}}}" as="o" hint-placeholder-count="4"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="flex: 1 1 0; min-width: 0; height: ${h}px; padding: 0 6px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: background-color .15s, color .15s;">{{o.label}}</button></sc-for></div>`;
  const field = (label, body) => `<div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">${label}</span>${body}</div>`;
  const close = (href, label, size = 40) => `<button type="button" onClick="{{${href}}}" aria-label="${label}" class="sc-press" style="width: ${size}px; height: ${size}px; flex-shrink: 0; border: 0; border-radius: ${size / 2}px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, size > 40 ? 18 : 16, 2.2)}</button>`;
  const clockEl = (fs = 14) => `<sc-if value="{{hasClock}}" hint-placeholder-val="{{ true }}"><span role="timer" aria-label="Time left" style="display: inline-flex; align-items: center; gap: 6px; font-family: ${MONO}; font-size: ${fs}px; font-weight: {{clockWeight}}; color: {{clockColor}}; white-space: nowrap;">${svg(I.today, fs + 2, 2)}<span>{{clock}}</span></span></sc-if>`;
  const flagBtn = (phone) => `<button type="button" onClick="{{flag}}" aria-pressed="{{flagPressed}}" data-key="f" class="sc-press" style="height: ${phone ? 44 : 38}px; padding: 0 ${phone ? 16 : 14}px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; background: {{flagBg}}; color: {{flagFg}}; font: inherit; font-size: ${phone ? 15 : 13}px; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s;">${svg(I.flag, phone ? 17 : 15, 2)}<span>{{flagLabel}}</span></button>`;
  // A choice (A, B, C, D): a ring and a filled letter when picked; nothing says right or wrong.
  const optionRow = phone => `<button type="button" class="sc-topt" onClick="{{o.pick}}" data-key="{{o.key}}" aria-pressed="{{o.pressed}}" style="min-height: ${phone ? 56 : 62}px; box-sizing: border-box; padding: 10px 20px 10px 12px; display: flex; align-items: center; gap: 14px; border: 0; border-radius: ${phone ? 18 : 20}px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{o.ring}}; font: inherit; font-size: ${phone ? 16 : 17}px; font-weight: 500; line-height: 1.35; text-align: left; cursor: pointer;"><span class="sc-tdot" style="width: ${phone ? 34 : 38}px; height: ${phone ? 34 : 38}px; flex-shrink: 0; border-radius: 50%; background: {{o.badge}}; color: {{o.badgeFg}}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700;">{{o.letter}}</span><span style="flex-grow: 1;">{{o.label}}</span></button>`;
  const claimCard = phone => `<sc-if value="{{hasClaim}}" hint-placeholder-val="{{ false }}"><div style="padding: ${phone ? '16px 18px' : '20px 24px'}; border-radius: ${phone ? 18 : 20}px; background: {{t.surf}}; font-size: ${phone ? 18 : 20}px; font-weight: 600; line-height: 1.35;">{{claim}}</div></sc-if>`;
  // A picture with boxes: the asked box is filled in, the others covered (nothing is revealed during the test).
  const picture = phone => `<sc-if value="{{hasImage}}" hint-placeholder-val="{{ false }}"><div style="align-self: flex-start; position: relative; max-width: 100%; line-height: 0;"><sc-if value="{{imageMock}}" hint-placeholder-val="{{ false }}"><div style="padding: 10px 14px; border-radius: 18px; background: {{t.surf}};">${c.CELL(Math.round((phone ? 160 : 220) * 22 / 15), phone ? 160 : 220, false)}</div></sc-if><sc-if value="{{imageUrl}}" hint-placeholder-val="{{ true }}"><img src="{{imageUrl}}" alt="" style="display: block; max-width: 100%; max-height: ${phone ? 180 : 240}px; border-radius: 18px; background: {{t.surf}};"></sc-if><div style="position: absolute; inset: {{occInset}};">${c.OCC_BOXES('occBoxes', 12)}</div></div></sc-if>`;
  const typedField = phone => `<div style="display: flex; flex-direction: column; gap: 10px;"><input type="text" class="sc-tfield" value="{{typed}}" onChange="{{type}}" placeholder="Type your answer" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" style="--tf: {{t.text}}; height: ${phone ? 56 : 62}px; box-sizing: border-box; padding: 0 20px; border: 0; border-radius: ${phone ? 18 : 20}px; background: {{t.surf}}; color: {{t.text}}; box-shadow: none; font: inherit; font-size: ${phone ? 16 : 18}px; font-weight: 500;"><span style="padding: 0 4px; font-size: 14px; color: {{t.muted}};">Close spelling counts.</span></div>`;
  // Matching: each word gets the letter of its answer (the same letter again takes it back).
  const matching = phone => phone
    ? `<div style="display: flex; flex-direction: column; gap: 10px;"><sc-for list="{{terms}}" as="m" hint-placeholder-count="5"><div style="box-sizing: border-box; padding: 12px 14px; border-radius: 18px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; line-height: 1.3;"><span style="width: 26px; height: 26px; flex-shrink: 0; border-radius: 13px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">{{m.n}}</span><span>{{m.label}}</span></div><div style="display: flex; gap: 8px;"><sc-for list="{{m.chips}}" as="x" hint-placeholder-count="5"><button type="button" class="sc-tdot" onClick="{{x.pick}}" aria-pressed="{{x.pressed}}" aria-label="{{x.aria}}" style="flex: 1 1 0; height: 42px; border: 0; border-radius: 21px; background: {{x.bg}}; color: {{x.fg}}; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;">{{x.letter}}</button></sc-for></div></div></sc-for></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 4px 4px 0;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Answers</span><sc-for list="{{defs}}" as="d" hint-placeholder-count="5"><div style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; font-size: 15px; line-height: 1.35;"><span style="width: 26px; height: 26px; flex-shrink: 0; border-radius: 13px; background: {{d.bg}}; color: {{d.fg}}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">{{d.letter}}</span><span style="flex-grow: 1; padding-top: 3px;">{{d.label}}</span><sc-if value="{{d.taken}}" hint-placeholder-val="{{ false }}"><span style="width: 22px; height: 22px; flex-shrink: 0; border-radius: 11px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">{{d.by}}</span></sc-if></div></sc-for></div>`
    : `<div style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 32px; align-items: start;"><div style="display: flex; flex-direction: column; gap: 10px;"><sc-for list="{{terms}}" as="m" hint-placeholder-count="5"><div style="min-height: 64px; box-sizing: border-box; padding: 10px 12px 10px 14px; border-radius: 18px; background: {{t.surf}}; display: flex; align-items: center; gap: 12px;"><span style="width: 28px; height: 28px; flex-shrink: 0; border-radius: 14px; background: {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">{{m.n}}</span><span style="flex-grow: 1; min-width: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">{{m.label}}</span><span style="display: flex; gap: 6px; flex-shrink: 0;"><sc-for list="{{m.chips}}" as="x" hint-placeholder-count="5"><button type="button" class="sc-tdot" onClick="{{x.pick}}" aria-pressed="{{x.pressed}}" aria-label="{{x.aria}}" style="width: 36px; height: 36px; border: 0; border-radius: 18px; background: {{x.bg}}; color: {{x.fg}}; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;">{{x.letter}}</button></sc-for></span></div></sc-for></div>
      <div style="display: flex; flex-direction: column; gap: 10px;"><sc-for list="{{defs}}" as="d" hint-placeholder-count="5"><div style="min-height: 64px; box-sizing: border-box; padding: 10px 14px; border-radius: 18px; border: 1px solid {{t.line}}; display: flex; align-items: center; gap: 12px; font-size: 15px; line-height: 1.35;"><span style="width: 28px; height: 28px; flex-shrink: 0; border-radius: 14px; background: {{d.bg}}; color: {{d.fg}}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">{{d.letter}}</span><span style="flex-grow: 1;">{{d.label}}</span><sc-if value="{{d.taken}}" hint-placeholder-val="{{ false }}"><span style="width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">{{d.by}}</span></sc-if></div></sc-for></div></div>`;
  // What the question asks, by its kind.
  const questionBody = phone => `<sc-if value="{{isChoice}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: ${phone ? 'column' : 'column'}; gap: ${phone ? 10 : 12}px;"><sc-for list="{{options}}" as="o" hint-placeholder-count="4">${optionRow(phone)}</sc-for></div></sc-if>
    <sc-if value="{{isType}}" hint-placeholder-val="{{ false }}">${typedField(phone)}</sc-if>
    <sc-if value="{{isMatch}}" hint-placeholder-val="{{ false }}">${matching(phone)}</sc-if>`;

  // ---------- Set up ----------
  const setupBody = phone => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; letter-spacing: -.02em;">${svg(I.file, 20, 1.8)}Practice test</span>${close('cancel', 'Close')}</div>
    ${field('Questions', seg('lengths'))}
    ${field('Kinds of questions', `<div style="display: flex; flex-wrap: wrap; gap: 8px;"><sc-for list="{{kinds}}" as="k" hint-placeholder-count="5"><button type="button" onClick="{{k.pick}}" aria-pressed="{{k.pressed}}" style="height: 38px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{k.bg}}; color: {{k.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s;"><sc-if value="{{k.on}}" hint-placeholder-val="{{ true }}">${svg(I.check, 14, 2.4)}</sc-if>{{k.label}}</button></sc-for></div>`)}
    ${field('Time limit', seg('limits'))}
    <sc-if value="{{hasNote}}" hint-placeholder-val="{{ false }}"><div style="font-size: 13px; line-height: 1.5; color: {{t.muted}};">{{setupNote}}</div></sc-if>
    <div style="display: flex; gap: 10px;">${btn('Cancel', 'cancel')}${btn('Start test', 'start', { inv: true, grow: 2, attrs: ' aria-disabled="{{startOff}}"' }).replace('background: {{t.inv}}', 'background: {{startBg}}').replace('color: {{t.invText}}', 'color: {{startFg}}')}</div>`;
  const webSetup = `<div style="position: absolute; inset: 0;"><sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}"><dc-import name="WebDecks" dark="{{dark}}" dim="{{dim}}" folder="{{folderId}}" hint-size="1440px,900px"></dc-import></sc-if><sc-if value="{{inDeck}}" hint-placeholder-val="{{ true }}"><dc-import name="WebDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="1440px,900px"></dc-import></sc-if></div>
    <div class="sc-scrim" style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <div role="dialog" aria-label="Practice test" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 560px; box-sizing: border-box; border-radius: 28px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); padding: 28px; display: flex; flex-direction: column; gap: 20px;">${setupBody(false)}</div>`;
  const phoneSetup = `<div style="position: absolute; inset: 0;"><sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}"><dc-import name="PhoneLibrary" dark="{{dark}}" dim="{{dim}}" folder="{{folderId}}" hint-size="390px,844px"></dc-import></sc-if><sc-if value="{{inDeck}}" hint-placeholder-val="{{ true }}"><dc-import name="PhoneDeck" dark="{{dark}}" dim="{{dim}}" deck-id="{{deckId}}" hint-size="390px,844px"></dc-import></sc-if></div>
    <div class="sc-scrim" style="position: absolute; inset: 0; background: {{t.dim}};"></div>
    <div role="dialog" aria-label="Practice test" class="sc-sheet" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; border-radius: 32px 32px 0 0; background: {{t.bg}}; padding: 10px 20px 34px; display: flex; flex-direction: column; gap: 18px;"><div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>${setupBody(true)}</div>`;

  // ---------- Taking it ----------
  const dialogs = phone => `<sc-if value="{{confirmOpen}}" hint-placeholder-val="{{ false }}"><div class="sc-scrim" onClick="{{keepGoing}}" style="position: absolute; inset: 0; z-index: 8; background: {{t.dim}};"></div>
      <div role="alertdialog" aria-label="{{confirmTitle}}" class="${phone ? 'sc-sheet' : ''}" style="position: absolute; z-index: 9; ${phone ? 'left: 0; right: 0; bottom: 0; border-radius: 32px 32px 0 0; padding: 10px 20px 34px;' : 'left: 50%; top: 50%; transform: translate(-50%, -50%); width: 440px; border-radius: 28px; padding: 28px;'} box-sizing: border-box; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 14px;">
        ${phone ? `<div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};"></div>` : ''}
        <span style="font-size: 22px; font-weight: 600; letter-spacing: -.02em;">{{confirmTitle}}</span>
        <p style="margin: 0; font-size: 15px; line-height: 1.5; color: {{t.muted}};">{{confirmLine}}</p>
        <div style="display: flex; gap: 10px; margin-top: 6px;">${btn('Keep going', 'keepGoing')}${btn('{{confirmAction}}', 'confirmGo', { inv: true })}</div>
      </div></sc-if>`;
  const navGrid = (cols, size, gap) => `<div role="group" aria-label="Questions" style="display: grid; grid-template-columns: repeat(${cols}, ${size}px); gap: ${gap}px;"><sc-for list="{{nav}}" as="x" hint-placeholder-count="20"><button type="button" class="sc-tnum" onClick="{{x.go}}" aria-label="{{x.aria}}" aria-current="{{x.current}}" style="position: relative; width: ${size}px; height: ${size}px; padding: 0; border: 0; border-radius: ${size >= 44 ? 14 : 12}px; background: {{x.bg}}; color: {{x.fg}}; box-shadow: {{x.ring}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;">{{x.n}}<sc-if value="{{x.flagged}}" hint-placeholder-val="{{ false }}"><span aria-hidden="true" style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; border-radius: 6px; background: {{t.hard}}; box-shadow: 0 0 0 2px {{t.bg}};"></span></sc-if></button></sc-for></div>`;
  const webQuestion = () => `<header style="height: 72px; flex-shrink: 0; box-sizing: border-box; padding: 0 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px; border-bottom: 1px solid {{t.line}};">
      <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">${close('askLeave', 'Leave the test', 36)}<span style="min-width: 0; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Practice test<span style="font-weight: 400; color: {{t.muted}};"> · {{name}}</span></span></div>
      <span role="status" style="font-size: 15px; font-weight: 600; white-space: nowrap;">{{number}} of {{n}}</span>
      <div style="display: flex; justify-content: flex-end;">${clockEl(14)}</div>
    </header>
    <div style="flex-grow: 1; min-height: 0; display: flex;">
      <aside style="width: 296px; flex-shrink: 0; box-sizing: border-box; padding: 28px 24px; border-right: 1px solid {{t.line}}; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
        <span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Questions</span>
        ${navGrid(5, 40, 8)}
        <span style="font-size: 13px; color: {{t.muted}};">{{progressLine}}</span>
      </aside>
      <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 44px 48px 40px; display: flex; flex-direction: column; align-items: center; overflow-y: auto;">
        <div class="sc-tq" style="width: {{colWidth}}; max-width: 100%; flex-grow: 1; display: flex; flex-direction: column; gap: 26px; animation: {{qAnim}};">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 14px; font-weight: 600; color: {{t.muted}};">Question {{number}} · {{kindLabel}}</span>${flagBtn(false)}</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 600; line-height: 1.25; letter-spacing: -.025em; text-wrap: pretty;">{{question}}</h1>
          ${picture(false)}${claimCard(false)}
          ${questionBody(false)}
          <div style="flex-grow: 1;"></div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <button type="button" onClick="{{back}}" data-key="ArrowLeft" aria-label="Previous question" class="sc-press" style="height: 48px; padding: 0 22px 0 16px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; opacity: {{backOpacity}}; pointer-events: {{backEvents}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">${svg(I.back, 16, 2.2)}Back</button>
            <button type="button" onClick="{{next}}" data-key="ArrowRight" class="sc-press" style="height: 48px; padding: 0 {{nextPad}}; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;">{{nextLabel}}<sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}">${svg(I.chev, 16, 2.2)}</sc-if></button>
          </div>
        </div>
      </main>
    </div>`;
  const phoneQuestion = () => `<div style="flex-shrink: 0; box-sizing: border-box; padding: 58px 16px 0; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">${close('askLeave', 'Leave the test', 44)}<button type="button" onClick="{{openSheet}}" aria-label="All the questions" class="sc-press" style="height: 44px; padding: 0 14px 0 16px; display: inline-flex; align-items: center; gap: 4px; border: 0; border-radius: 22px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;"><span role="status">{{number}} of {{n}}</span>${svg(I.chevDown, 16, 2.2)}</button><span style="flex-grow: 1;"></span>${clockEl(15)}</div>
      <div style="height: 3px; border-radius: 2px; background: {{t.surf}}; overflow: hidden;"><div style="height: 3px; border-radius: 2px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);"></div></div>
    </div>
    <div style="flex-grow: 1; min-height: 0; box-sizing: border-box; padding: 20px 16px 8px; overflow-y: auto; scrollbar-width: none;">
      <div class="sc-tq" style="display: flex; flex-direction: column; gap: 18px; animation: {{qAnim}};">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">{{kindLabel}}</span>${flagBtn(true)}</div>
        <div style="font-size: 24px; font-weight: 600; line-height: 1.22; letter-spacing: -.025em; text-wrap: pretty;">{{question}}</div>
        ${picture(true)}${claimCard(true)}
        ${questionBody(true)}
      </div>
    </div>
    <div style="flex-shrink: 0; box-sizing: border-box; padding: 10px 16px 34px; display: flex; gap: 10px;">
      <button type="button" onClick="{{back}}" aria-label="Previous question" class="sc-press" style="width: 56px; height: 56px; flex-shrink: 0; border: 0; border-radius: 28px; background: {{t.surf}}; color: {{t.text}}; opacity: {{backOpacity}}; pointer-events: {{backEvents}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.back, 20, 2.2)}</button>
      <button type="button" onClick="{{next}}" class="sc-press" style="flex-grow: 1; height: 56px; border: 0; border-radius: 28px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;">{{nextLabel}}</button>
    </div>
    <sc-if value="{{sheetOpen}}" hint-placeholder-val="{{ false }}"><div class="sc-scrim" onClick="{{closeSheet}}" style="position: absolute; inset: 0; z-index: 6; background: {{t.dim}};"></div>
      <div role="dialog" aria-label="Questions" class="sc-sheet" style="position: absolute; z-index: 7; left: 0; right: 0; bottom: 0; max-height: 72%; box-sizing: border-box; border-radius: 32px 32px 0 0; background: {{t.bg}}; padding: 10px 20px 34px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;">
        <div style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}}; flex-shrink: 0;"></div>
        <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 20px; font-weight: 600; letter-spacing: -.02em;">Questions</span>${btn('Done', 'closeSheet', { h: 36, grow: 0 })}</div>
        ${navGrid(6, 48, 10)}
        <span style="font-size: 13px; color: {{t.muted}};">{{progressLine}}</span>
      </div></sc-if>`;

  // ---------- Results ----------
  const mark = `<span style="width: 28px; height: 28px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: {{r.markBg}}; color: {{r.markFg}};"><sc-if value="{{r.ok}}" hint-placeholder-val="{{ true }}">${svg(I.check, 15, 2.6)}</sc-if><sc-if value="{{r.bad}}" hint-placeholder-val="{{ false }}">${svg(I.close, 13, 2.6)}</sc-if></span>`;
  const answerLine = (label, value, color = '{{t.text}}') => `<div style="display: flex; gap: 12px; font-size: 15px; line-height: 1.4;"><span style="width: 104px; flex-shrink: 0; color: {{t.muted}};">${label}</span><span style="flex-grow: 1; min-width: 0; color: ${color}; font-weight: 500; overflow-wrap: anywhere;">${value}</span></div>`;
  // Each explanation ends with the conversation about its question and the composer (design/chat.mjs), in the test's colors.
  const chat = phone => chatMarkup({ svg, I }, 'r.chat', { text: '{{t.text}}', muted: '{{t.muted}}', bubble: '{{t.bg}}', field: '{{t.bg}}', again: '{{t.again}}', btn: '{{t.inv}}', btnFg: '{{t.invText}}' }, { phone, fs: 15, gap: 6, pad: 16 });
  const row = phone => `<div data-q="{{r.n}}" style="box-sizing: border-box; padding: ${phone ? '16px' : '20px 24px'}; border-radius: ${phone ? 20 : 24}px; border: 1px solid {{t.line}}; display: flex; flex-direction: column; gap: ${phone ? 10 : 12}px;">
      <div style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}}; flex-grow: 1;">{{r.n}} · {{r.kindLabel}}</span>${mark}</div>
      <sc-if value="{{r.hasText}}" hint-placeholder-val="{{ true }}"><div style="font-size: ${phone ? 16 : 17}px; font-weight: 600; line-height: 1.35;">{{r.q}}</div></sc-if>
      <sc-if value="{{r.hasClaim}}" hint-placeholder-val="{{ false }}"><div style="padding: 12px 14px; border-radius: 14px; background: {{t.surf}}; font-size: 15px; font-weight: 600; line-height: 1.35;">{{r.claim}}</div></sc-if>
      <sc-if value="{{r.isPairs}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 8px;"><sc-for list="{{r.pairs}}" as="p" hint-placeholder-count="4"><div style="display: flex; align-items: flex-start; gap: 10px; font-size: 15px; line-height: 1.4;"><span style="width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: {{p.markBg}}; color: {{p.markFg}};"><sc-if value="{{p.ok}}" hint-placeholder-val="{{ true }}">${svg(I.check, 11, 3)}</sc-if><sc-if value="{{p.bad}}" hint-placeholder-val="{{ false }}">${svg(I.close, 10, 3)}</sc-if></span><span style="flex-grow: 1; min-width: 0;"><span style="font-weight: 600;">{{p.q}}</span> <span style="color: {{t.muted}};">→</span> <span>{{p.a}}</span><sc-if value="{{p.bad}}" hint-placeholder-val="{{ false }}"><span style="display: block; color: {{t.muted}};">Right answer: <span style="color: {{t.text}}; font-weight: 500;">{{p.r}}</span></span></sc-if></span></div></sc-for></div></sc-if>
      <sc-if value="{{r.isSingle}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column; gap: 6px;">${answerLine('Your answer', '{{r.a}}', '{{r.aColor}}')}<sc-if value="{{r.bad}}" hint-placeholder-val="{{ false }}">${answerLine('Right answer', '{{r.r}}')}</sc-if></div></sc-if>
      <sc-if value="{{r.hasActions}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-wrap: wrap; gap: 8px;"><sc-if value="{{r.canCount}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{r.count}}" class="sc-press" style="height: 34px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">Count it as right</button></sc-if><sc-if value="{{r.canExplain}}" hint-placeholder-val="{{ false }}"><sc-if value="{{r.exClosed}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{r.ask}}" class="sc-press" style="height: 34px; padding: 0 14px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">${svg(I.sparkle, 14, 2)}{{r.exLabel}}</button></sc-if></sc-if></div></sc-if>
      <sc-if value="{{r.exOpen}}" hint-placeholder-val="{{ false }}"><div role="region" aria-label="Explanation" class="sc-tq" style="box-sizing: border-box; border-radius: 16px; background: {{t.surf}}; display: flex; flex-direction: column; overflow: hidden; animation: scTA .2s cubic-bezier(.2,.8,.2,1) both;"><div style="flex-shrink: 0; padding: 14px 16px 0; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: {{t.muted}};">${svg(I.sparkle, 13, 2)}<span style="flex-grow: 1;">Explained by AI</span><button type="button" onClick="{{r.closeEx}}" aria-label="Close the explanation" style="width: 28px; height: 28px; border: 0; border-radius: 14px; background: {{t.bg}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;">${svg(I.close, 10, 2.4)}</button></div>
        <div ref="{{r.chat.end}}" style="box-sizing: border-box; padding: 6px 16px; display: flex; flex-direction: column; gap: 6px;"><sc-if value="{{r.exBusy}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; color: {{t.muted}};">Thinking…</span></sc-if><sc-if value="{{r.exText}}" hint-placeholder-val="{{ true }}"><span style="font-size: 15px; line-height: 1.5;">{{r.exText}}</span></sc-if><sc-if value="{{r.exError}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.4; color: {{t.again}};">{{r.exError}}</span></sc-if>
        ${chat(phone).turns}
        <sc-if value="{{r.hasNote}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: {{t.muted}};">{{r.note}}</span></sc-if></div>
        ${chat(phone).composer}</div></sc-if>
    </div>`;
  const summaryButtons = `<sc-if value="{{hasMissed}}" hint-placeholder-val="{{ true }}">${btn('Retake the ones I missed', 'retake', { inv: true })}${btn('Study the missed cards now', 'study', { bg: '{{t.bg}}' })}</sc-if><sc-if value="{{noMissed}}" hint-placeholder-val="{{ false }}"><span style="font-size: 15px; line-height: 1.5; color: {{t.muted}};">Every question was right.</span></sc-if>`;
  const filter = `<div role="group" aria-label="Show" style="display: flex; padding: 4px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{filters}}" as="o" hint-placeholder-count="2"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: background-color .15s, color .15s;">{{o.label}}</button></sc-for></div>`;
  const webResults = `<header style="height: 72px; flex-shrink: 0; box-sizing: border-box; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid {{t.line}};"><span style="font-size: 15px; font-weight: 600;">Practice test<span style="font-weight: 400; color: {{t.muted}};"> · {{name}}</span></span>${btn('Done', 'done', { h: 38, grow: 0 })}</header>
    <main style="flex-grow: 1; min-height: 0; box-sizing: border-box; padding: 40px 48px; display: flex; justify-content: center; gap: 40px; overflow-y: auto;">
      <div style="width: 380px; flex-shrink: 0; align-self: flex-start; position: sticky; top: 0; box-sizing: border-box; padding: 32px; border-radius: 28px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 22px;">
        <div style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Your score</span><span style="font-size: 76px; font-weight: 600; letter-spacing: -.045em; line-height: 1;">{{pct}}%</span><span style="font-size: 20px; font-weight: 500;">{{right}} of {{n}}</span></div>
        <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 18px; border-top: 1px solid {{t.line}};"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Time taken</span><span style="font-family: ${MONO}; font-size: 20px; font-weight: 500;">{{tookLabel}}</span><sc-if value="{{timeUp}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; color: {{t.muted}};">The time ran out.</span></sc-if></div>
        <div style="display: flex; flex-direction: column; gap: 10px;">${summaryButtons}</div>
      </div>
      <div style="width: 640px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 20px; font-weight: 600; letter-spacing: -.02em;">Questions</span>${filter}</div>
        <sc-for list="{{rows}}" as="r" hint-placeholder-count="5">${row(false)}</sc-for>
      </div>
    </main>`;
  const phoneResults = `<div style="flex-grow: 1; min-height: 0; box-sizing: border-box; padding: 58px 16px 40px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; scrollbar-width: none;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 15px; font-weight: 600; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Practice test<span style="font-weight: 400; color: {{t.muted}};"> · {{name}}</span></span>${btn('Done', 'done', { h: 40, grow: 0 })}</div>
      <div style="box-sizing: border-box; padding: 24px; border-radius: 28px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;"><div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Your score</span><span style="font-size: 64px; font-weight: 600; letter-spacing: -.045em; line-height: 1;">{{pct}}%</span></div><div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; padding-bottom: 6px;"><span style="font-size: 20px; font-weight: 500;">{{right}} of {{n}}</span><span style="font-family: ${MONO}; font-size: 15px; color: {{t.muted}};">{{tookLabel}}</span></div></div>
        <sc-if value="{{timeUp}}" hint-placeholder-val="{{ false }}"><span style="margin-top: -8px; font-size: 14px; color: {{t.muted}};">The time ran out.</span></sc-if>
        <div style="display: flex; flex-direction: column; gap: 10px;">${summaryButtons}</div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 20px; font-weight: 600; letter-spacing: -.02em;">Questions</span>${filter}</div>
      <sc-for list="{{rows}}" as="r" hint-placeholder-count="4">${row(true)}</sc-for>
    </div>`;

  // ---------- the boards ----------
  const board = phone => {
    const w = phone ? 390 : 1440, h = phone ? 844 : 900;
    return `<div style="position: relative; isolation: isolate; width: ${w}px; height: ${h}px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <sc-if value="{{isSetup}}" hint-placeholder-val="{{ true }}">${phone ? phoneSetup : webSetup}</sc-if>
  <sc-if value="{{isQuestion}}" hint-placeholder-val="{{ false }}">${phone ? phoneQuestion() : webQuestion()}${dialogs(phone)}</sc-if>
  <sc-if value="{{isResults}}" hint-placeholder-val="{{ false }}">${phone ? phoneResults : webResults}</sc-if>
</div>`;
  };

  // ---------- the logic (the canvas's sample, or the app's real test: web/db.js) ----------
  const SAMPLE = TEST_SAMPLE;

  const logic = phone => `
constructor(props) { super(props); this.state = {}; }
renderVals() { ${DB_JS}
  ${T}
  ${CHAT_JS}
  ${c.OCC_JS}
  const P = this.props, s = this.state, mock = !!db.mock, live = !mock, X = ${JSON.stringify(SAMPLE)};
  const scope = P.folderId ? { folderId: P.folderId } : { deckId: P.deckId || '' };
  const FLOW = ['Multiple choice', 'True or false', 'Fill in the blank', 'Matching', 'Written'], LETTERS = 'ABCDEFGH';
  const screen = mock ? (s.screen != null ? s.screen : P.screen || 'Set up') : '';
  const TV = live ? db.test() : null;
  const setup = live ? (P.screen === 'Set up' || !TV) : screen === 'Set up';
  const results = live ? !setup && TV.phase === 'results' : /^Results/.test(screen);
  const question = !setup && !results;
  const seg = (on, h) => ({ pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  const go = to => { if (mock) this.setState({ screen: to, confirm: '', sheet: false }); };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  // ---- Set up ----
  const chips = live ? db.testKinds() : [['mc', 'Multiple choice'], ['tf', 'True or false'], ['type', 'Written'], ['match', 'Matching'], ['blank', 'Fill in the blank']];
  const kindsOn = s.kinds || ['mc', 'tf', 'type', 'match', 'blank'];
  const plan = live ? db.testPlan(scope, kindsOn) : { name: X.name, cards: X.cards, available: X.cards };
  const avail = plan.available, have = [10, 20, 30].filter(x => x < avail);
  const lens = [...have.map(x => ({ id: x, label: String(x) })), { id: 0, label: 'All' }];
  const wanted = s.count != null ? s.count : 20, lenNow = (lens.find(x => x.id === wanted) || (avail >= 20 ? lens.find(x => x.id === 20) : null) || lens[lens.length - 1]).id;
  const limitNow = s.limit != null ? s.limit : 0;
  const folder = !!P.folderId;
  const hasCards = plan.cards > 0;
  const setupVals = {
    inFolder: folder, inDeck: !folder,
    lengths: lens.map(x => ({ label: x.id ? x.label : 'All' + (avail > 0 ? ' · ' + avail.toLocaleString('en-US') : ''), ...seg(x.id === lenNow), pick: () => this.setState({ count: x.id }) })),
    kinds: chips.map(([k, label]) => { const on = kindsOn.includes(k); return { label, on, pressed: on ? 'true' : 'false', bg: on ? t.inv : t.surf, fg: on ? t.invText : t.text,
      pick: () => this.setState({ kinds: on && kindsOn.length > 1 ? kindsOn.filter(x => x !== k) : on ? kindsOn : [...kindsOn, k] }) }; }),
    limits: [[0, 'Off'], [10, '10 min'], [20, '20 min'], [30, '30 min']].map(([m, label]) => ({ label, ...seg(m === limitNow), pick: () => this.setState({ limit: m }) })),
    setupNote: !hasCards ? (folder ? 'These decks have no cards to ask yet.' : 'This deck has no cards to ask yet.') : avail === 0 ? 'These kinds don’t fit your cards. Turn on more.' : '',
    hasNote: !hasCards || avail === 0,
    startOff: avail === 0 ? 'true' : 'false', startBg: avail === 0 ? t.surf2 : t.inv, startFg: avail === 0 ? t.muted : t.invText,
    cancel: () => { if (live) db.act.go(folder ? '/library/folder/' + P.folderId : '/deck/' + P.deckId); else this.setState({ screen: 'Set up' }); },
    start: e => { if (e && e.preventDefault) e.preventDefault(); if (avail === 0) return; if (live) db.act.startTest(scope, { count: lenNow, kinds: kindsOn, limit: limitNow }); else go('Multiple choice'); },
    deckId: P.deckId || '', folderId: P.folderId || '', dark: !!P.dark, dim: !!P.dim
  };

  // ---- the question (the app's real test, or the canvas's sample) ----
  let V = null;
  if (question) {
    if (live) V = TV;
    else {
      const kind = { 'Multiple choice': 'mc', 'True or false': 'tf', 'Fill in the blank': 'blank', Written: 'type', Matching: 'match', Submit: 'type', Leave: 'mc' }[screen] || 'mc', M = s.m || X.picks;
      const at = kind === 'type' && screen === 'Submit' ? X.at.submit : X.at[kind], pick = M[kind];
      const base = { type: 'choice', kind, image: '', occ: null, claim: '' };
      let q;
      if (kind === 'mc' || kind === 'blank') q = { ...base, kindLabel: kind === 'mc' ? 'Multiple choice' : 'Fill in the blank', text: X[kind][0], options: X[kind][1].map((label, j) => ({ label, picked: pick === j })) };
      else if (kind === 'tf') q = { ...base, kindLabel: 'True or false', text: X.tf[0], claim: X.tf[1], options: ['True', 'False'].map((label, j) => ({ label, picked: pick === j })) };
      else if (kind === 'type') q = { ...base, type: 'type', kindLabel: 'Written', text: X.type, typed: M.type };
      else q = { ...base, type: 'match', kindLabel: 'Matching', text: 'Match each one to its answer.',
        defs: X.match[1].map((label, j) => ({ id: 'd' + j, letter: LETTERS[j], label, by: Object.keys(M.match).find(k => M.match[k] === j) != null ? +Object.keys(M.match).find(k => M.match[k] === j) + 1 : 0 })),
        terms: X.match[0].map((label, i) => ({ id: 't' + i, n: i + 1, label, picked: M.match[i] != null ? LETTERS[M.match[i]] : '', chips: X.match[1].map((_, k) => ({ id: 'd' + k, letter: LETTERS[k], on: M.match[i] === k })) })) };
      const done = kind === 'type' ? String(M.type || '').trim() !== '' : kind === 'match' ? Object.keys(M.match).length === 5 : pick != null;
      const flagged = s.flag != null ? s.flag === at : X.flagged.includes(at), answeredSet = X.answered.filter(x => x !== at).concat(done ? [at] : []);
      const flagSet = X.flagged.filter(x => x !== at).concat(flagged ? [at] : []);
      V = { phase: 'taking', name: X.name, n: X.n, i: at - 1, number: at, q, flagged, answered: answeredSet.length, flags: flagSet.length, unanswered: X.n - answeredSet.length, canBack: at > 1, last: screen === 'Submit',
        left: 872, clock: P.timed === false ? '' : '14:32', limit: P.timed === false ? 0 : 20,
        nav: Array.from({ length: X.n }, (_, j) => ({ n: j + 1, answered: answeredSet.includes(j + 1), flagged: flagSet.includes(j + 1), current: j + 1 === at })) };
    }
  }
  const confirm = mock ? (s.confirm != null ? s.confirm : screen === 'Submit' ? 'submit' : screen === 'Leave' ? 'leave' : '') : s.confirm || '';
  const q = V && V.q ? V.q : null;
  const act = {
    choose: j => { if (live) db.act.testChoose(j); else this.setState({ m: { ...(s.m || X.picks), [({ 'Multiple choice': 'mc', 'True or false': 'tf', 'Fill in the blank': 'blank' })[screen]]: j } }); },
    type: e => { const v = e && e.target ? e.target.value : ''; if (live) db.act.testType(v); else this.setState({ m: { ...(s.m || X.picks), type: v } }); },
    match: (term, def, mi, di) => { if (live) return db.act.testMatch(term, def); const M = s.m || X.picks, cur = { ...M.match }; if (cur[mi] === di) delete cur[mi]; else { for (const k of Object.keys(cur)) if (cur[k] === di) delete cur[k]; cur[mi] = di; } this.setState({ m: { ...M, match: cur } }); },
    go: j => { if (live) db.act.testGo(j); }
  };
  const questionVals = !V ? {} : {
    name: V.name, number: V.number, n: V.n, hasClock: !!V.clock, clock: V.clock, clockColor: V.left != null && V.left <= 60 ? t.text : t.muted, clockWeight: V.left != null && V.left <= 60 ? 600 : 500,
    kindLabel: q.kindLabel, question: q.text, hasClaim: !!q.claim, claim: q.claim || '', isChoice: q.type === 'choice', isType: q.type === 'type', isMatch: q.type === 'match', typed: q.typed || '', type: act.type,
    qAnim: (V.number % 2 ? 'scTA' : 'scTB') + ' .2s cubic-bezier(.2,.8,.2,1) both', colWidth: q.type === 'match' ? '${phone ? '100%' : '960px'}' : '720px',
    hasImage: !!q.image || !!(q.occ && mock), imageMock: q.image === 'mock', imageUrl: q.image && q.image !== 'mock' ? q.image : '', occInset: q.image === 'mock' ? '10px 14px' : '0',
    occBoxes: q.image && q.occ ? occView(q.occ.boxes, q.occ.ask, q.occ.mode, false, { edge: t.inv, ring: t.bg }) : [],
    options: (q.options || []).map((o, j) => ({ label: o.label, letter: LETTERS[j], key: String(j + 1), pressed: o.picked ? 'true' : 'false', ring: o.picked ? 'inset 0 0 0 2px ' + t.text : 'none',
      badge: o.picked ? t.inv : t.surf2, badgeFg: o.picked ? t.invText : t.muted, pick: () => act.choose(j) })),
    terms: (q.terms || []).map((m, mi) => ({ n: m.n, label: m.label, chips: m.chips.map((x, di) => ({ letter: x.letter, pressed: x.on ? 'true' : 'false', aria: 'Answer ' + x.letter + ' for ' + m.label, bg: x.on ? t.inv : t.bg, fg: x.on ? t.invText : t.muted, pick: () => act.match(m.id, x.id, mi, di) })) })),
    defs: (q.defs || []).map(d => ({ letter: d.letter, label: d.label, taken: d.by > 0, by: d.by > 0 ? String(d.by) : '', bg: d.by > 0 ? t.inv : t.surf2, fg: d.by > 0 ? t.invText : t.muted })),
    nav: V.nav.map((x, j) => ({ n: x.n, flagged: x.flagged, aria: 'Question ' + x.n + (x.answered ? ', answered' : ', not answered') + (x.flagged ? ', flagged' : ''), current: x.current ? 'step' : 'false',
      bg: x.current ? t.inv : x.answered ? t.surf : 'transparent', fg: x.current ? t.invText : x.answered ? t.text : t.muted, ring: x.current ? 'none' : x.answered ? 'none' : 'inset 0 0 0 1px ' + t.line,
      go: () => { if (live) act.go(j); this.setState({ sheet: false }); } })),
    progressLine: V.answered + ' answered' + (V.flags ? ' · ' + V.flags + ' flagged' : ''), progress: (V.number / V.n * 100) + '%',
    flag: () => { if (live) db.act.testFlag(); else this.setState({ flag: V.flagged ? -1 : V.number }); }, flagPressed: V.flagged ? 'true' : 'false', flagLabel: V.flagged ? 'Flagged' : 'Flag', flagBg: V.flagged ? t.hardTint : t.surf, flagFg: V.flagged ? t.hard : t.text,
    backOpacity: V.canBack ? '1' : '0', backEvents: V.canBack ? 'auto' : 'none', back: () => { if (live) db.act.testGo(V.i - 1); else go(FLOW[Math.max(0, FLOW.indexOf(screen) - 1)]); },
    notLast: !V.last, nextLabel: V.last ? 'Submit' : 'Next', nextPad: V.last ? '26px' : '18px 0 22px',
    next: () => { if (!V.last) { if (live) db.act.testGo(V.i + 1); else go(FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(screen) + 1)] === screen ? 'Submit' : FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(screen) + 1)]); return; }
      if (V.unanswered > 0) this.setState({ confirm: 'submit' }); else if (live) db.act.testSubmit(); else go('Results'); },
    askLeave: () => this.setState({ confirm: 'leave' }),
    confirmOpen: !!confirm, keepGoing: () => this.setState({ confirm: '' }),
    confirmTitle: confirm === 'leave' ? 'Leave this test?' : 'Submit your test?',
    confirmLine: confirm === 'leave' ? 'Your answers won’t be saved.' : (V.unanswered ? 'You haven’t answered ' + plural(V.unanswered, 'question') + '.' : 'You answered every question.') + (V.flags ? ' ' + V.flags + (V.flags === 1 ? ' is' : ' are') + ' flagged.' : ''),
    confirmAction: confirm === 'leave' ? 'Leave' : 'Submit',
    confirmGo: () => { if (confirm === 'leave') { if (live) Promise.resolve(db.act.go(V.back)).then(() => db.act.testLeave()); else go('Set up'); this.setState({ confirm: '' }); } else { this.setState({ confirm: '' }); if (live) db.act.testSubmit(); else go('Results'); } },
    sheetOpen: !!(s.sheet), openSheet: () => this.setState({ sheet: true }), closeSheet: () => this.setState({ sheet: false })
  };

  // ---- the results ----
  let R = null;
  if (results) {
    if (live) R = TV;
    else {
      const counted = s.counted || {}, ok = n => !X.wrong.includes(n) || !!counted[n];
      const rows = X.rows.map((r, j) => { const n = j + 1, pairs = r[5] ? r[5].map(p => ({ q: p[0], a: p[1], r: p[2], ok: p[1] === p[2] })) : null, bad = !ok(n);
        return { n, k: r[0], kindLabel: { mc: 'Multiple choice', tf: 'True or false', blank: 'Fill in the blank', match: 'Matching', type: 'Written' }[r[0]], q: r[1], claim: r[2], a: r[3], r: r[4], ok: !bad, counted: !!counted[n], pairs, notAnswered: !r[3] && !pairs,
          canCount: r[0] === 'type' && bad && !!r[3], ex: { on: n === 3, text: (s.exOn || {})[n] || (P.explainOpen && n === 3) ? X.explain : '', note: (s.exOn || {})[n] || (P.explainOpen && n === 3) ? '2 free explanations left today' : '' } }; });
      const right = rows.filter(r => r.ok).length;
      R = { phase: 'results', name: X.name, n: 20, right, pct: Math.round(right / 20 * 100), tookLabel: '14:32', timeUp: false, missed: 20 - right, rows };
    }
  }
  const onlyMissed = results && (s.only != null ? s.only === 'missed' : screen === 'Results · missed');
  const resultVals = !R ? {} : {
    name: R.name, pct: R.pct, right: R.right, n: R.n, tookLabel: R.tookLabel, timeUp: !!R.timeUp, hasMissed: R.missed > 0, noMissed: R.missed === 0,
    filters: [['all', 'All ' + R.n], ['missed', 'Missed ' + R.missed]].map(([k, label]) => ({ label, ...seg((k === 'missed') === onlyMissed), pick: () => this.setState({ only: k }) })),
    rows: R.rows.filter(r => !onlyMissed || !r.ok).map(r => {
      const opened = (s.exOpen || {})[r.n], open = opened != null ? !!opened : mock && !!P.explainOpen && r.n === 3, ex = r.ex || { on: false };
      // The conversation about this question (design/chat.mjs): closing its explanation forgets it.
      const chat = chatView('r' + r.n, r.card || 'q' + r.n, r.q, ex, { show: open && !!ex.on && !!ex.text && !ex.busy, sample: ${JSON.stringify(CHAT_SAMPLE.test)}, asked: !!P.followUp && r.n === 3,
        pal: { on: t.inv, onFg: t.invText, off: t.surf2, offFg: t.muted }, phone: ${phone}, proHref: mock ? 'Pricing.dc.html' : 'https://lucida.cards/pricing' });
      return { n: r.n, kindLabel: r.kindLabel, ok: r.ok, bad: !r.ok, markBg: r.ok ? t.goodTint : t.againTint, markFg: r.ok ? t.good : t.again,
        hasText: !!r.q && !(r.k === 'tf' && r.q === 'True or false?' && r.claim), q: r.q, hasClaim: !!r.claim, claim: r.claim || '', isPairs: !!r.pairs, isSingle: !r.pairs, a: r.a || 'No answer', aColor: r.a ? t.text : t.muted, r: r.r,
        pairs: (r.pairs || []).map(p => ({ q: p.q, a: p.a || 'No answer', r: p.r, ok: p.ok, bad: !p.ok, markBg: p.ok ? t.goodTint : t.againTint, markFg: p.ok ? t.good : t.again })),
        canCount: !!r.canCount, count: () => { if (live) db.act.testCount(r.n); else this.setState({ counted: { ...(s.counted || {}), [r.n]: true } }); },
        canExplain: !!ex.on && !r.pairs, exClosed: !open, exLabel: ex.text ? 'Explanation' : 'Explain', hasActions: !!r.canCount || (!!ex.on && !r.pairs),
        ask: () => { this.setState({ exOpen: { ...(s.exOpen || {}), [r.n]: true } }); if (mock) this.setState({ exOn: { ...(s.exOn || {}), [r.n]: true } }); else if (!ex.text && r.card) db.act.explain(r.card, r.q); },
        closeEx: () => { const k = 'r' + r.n; this.setState({ exOpen: { ...(this.state.exOpen || {}), [r.n]: false }, chatDraft: { ...(this.state.chatDraft || {}), [k]: '' }, chatMock: { ...(this.state.chatMock || {}), [k]: [] } }); if (live && r.card) db.act.followUpClear(r.card); },
        exOpen: open && !!ex.on, exBusy: !!ex.busy, exText: ex.busy ? '' : ex.text || '', exError: ex.busy ? '' : ex.error || '',
        hasNote: !!ex.note && !!ex.text && !ex.busy && !chat.limited, note: ex.note || '', chat };
    }),
    retake: () => { if (live) db.act.testRetake(); else go('Multiple choice'); }, study: () => { if (live) db.act.testStudy(); },
    done: () => { if (live) Promise.resolve(db.act.go(R.back)).then(() => db.act.testLeave()); else go('Set up'); }
  };
  return { t, dark: !!P.dark, dim: !!P.dim, isSetup: setup, isQuestion: question, isResults: results, ...setupVals, ...questionVals, ...resultVals };
}`;

  // A folder's page: a button to start one over all its decks (no line about the last one: the owner, 2026-10-02: "remove this").
  const folderJs = `const testVals = { testHref: db.mock ? 'WebTest.dc.html' : folder ? '/library/folder/' + folder.id + '/test' : '', canTest: !!folder && decks.length > 0 };`;
  const folderWebPill = `<sc-if value="{{canTest}}" hint-placeholder-val="{{ true }}"><a href="{{testHref}}" class="sc-press" style="height: 36px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font-size: 14px; font-weight: 600;">${svg(I.file, 16, 2)}Practice test</a></sc-if>`;
  const folderPhoneButton = `<sc-if value="{{canTest}}" hint-placeholder-val="{{ true }}"><a href="{{testHref}}" class="sc-press" style="height: 48px; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 600;">${svg(I.file, 17, 2)}Practice test</a></sc-if>`;

  return { props, css, board, logic, folderJs, folderWebPill, folderPhoneButton, SCREENS };
}
