// Made from design/canvas/project/PhoneEditor.dc.html by design/to-web.mjs. Change the design, not this file.
export default {
  name: "PhoneEditor", title: "iPhone · Card editor", w: 390, h: 844, fill: false,
  props: {"dark":false,"keyboard":true,"textStyles":false,"cardType":"Basic"},
  imports: ["PhoneDeck"],
  css: "body{margin:0;font-family:Geist, -apple-system, system-ui, sans-serif}\na{color:inherit;text-decoration:none}a:hover{opacity:.8}\n.sc-rich[data-empty=\"true\"]::before{content:attr(data-ph);position:absolute;color:var(--ph);pointer-events:none}",
  template: "<div style=\"position: relative; width: 390px; height: 844px; overflow: hidden; font-family: Geist, -apple-system, system-ui, sans-serif; color: {{t.text}};\">\n  <dc-import name=\"PhoneDeck\" dark=\"{{dark}}\" hint-size=\"390px,844px\"></dc-import>\n  <div style=\"position: absolute; inset: 0; background: {{t.dim}};\"></div>\n  <div style=\"position: absolute; left: 0; right: 0; bottom: 0; top: 56px; box-sizing: border-box; padding: 10px 20px 34px; border-radius: 36px 36px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 16px;\">\n    <div style=\"align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};\"></div>\n    <div style=\"display: flex; align-items: center; justify-content: space-between;\"><a href=\"PhoneDeck.dc.html\" style=\"font-size: 16px; color: {{t.muted}}; min-height: 44px; display: flex; align-items: center;\">Cancel</a><span style=\"font-size: 17px; font-weight: 600;\">{{title}}</span><a href=\"PhoneDeck.dc.html\" style=\"font-size: 16px; font-weight: 600; min-height: 44px; display: flex; align-items: center;\">Save</a></div>\n    <div style=\"display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\">\n  <sc-for list=\"{{types}}\" as=\"k\" hint-placeholder-count=\"4\">\n    <button type=\"button\" onClick=\"{{k.pick}}\" style=\"height: 36px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{k.bg}}; color: {{k.fg}}; box-shadow: {{k.sh}};\">{{k.label}}</button>\n  </sc-for>\n</div>\n    \n<sc-if value=\"{{isBasic}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Front</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Front\" spellcheck=\"true\" data-rk=\"front\" data-ph=\"The question\" data-empty=\"{{rich.front.empty}}\" key=\"{{rich.front.key}}\" ref=\"{{rich.front.ref}}\" style=\"position: relative; min-height: 4.35em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.front.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.front.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Back</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Back\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"The answer\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; min-height: 2.9em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if>\n<sc-if value=\"{{isCloze}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Text</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Text\" spellcheck=\"true\" data-rk=\"text\" data-ph=\"Put [[double brackets]] around the words to hide\" data-empty=\"{{rich.text.empty}}\" key=\"{{rich.text.key}}\" ref=\"{{rich.text.ref}}\" style=\"position: relative; min-height: 4.35em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.text.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.text.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div>\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Cards to make</span><div role=\"group\" aria-label=\"Cards to make\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\"><sc-for list=\"{{clozeModes}}\" as=\"o\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 34px; padding: 0 10px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}};\">{{o.label}}</button></sc-for></div></div>\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Extra, shown after</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Extra, shown after\" spellcheck=\"true\" data-rk=\"note\" data-ph=\"\" data-empty=\"{{rich.note.empty}}\" key=\"{{rich.note.key}}\" ref=\"{{rich.note.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.note.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.note.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if>\n<sc-if value=\"{{isImage}}\" hint-placeholder-val=\"{{ false }}\"><sc-if value=\"{{img.mock}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"height: 196px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;\"><div style=\"position: relative; width: 250px; height: 170px;\"><svg width=\"250\" height=\"170\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"2\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/><path d=\"M138 60 L186 22\"/><circle cx=\"194\" cy=\"16\" r=\"12\" fill=\"{{t.inv}}\" stroke=\"none\"/><text x=\"194\" y=\"21\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"{{t.invText}}\" stroke=\"none\" font-family=\"Geist, sans-serif\">1</text></svg><span style=\"position: absolute; left: 107px; top: 64px; width: 50px; height: 40px; box-sizing: border-box; border-radius: 8px; background: {{t.inv}}; color: {{t.invText}}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;\">1</span><span style=\"position: absolute; left: 41px; top: 97px; width: 40px; height: 25px; box-sizing: border-box; border-radius: 8px; background: {{t.surf2}}; color: {{t.text}}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;\">2</span><span style=\"position: absolute; left: 158px; top: 114px; width: 40px; height: 25px; box-sizing: border-box; border-radius: 8px; background: {{t.surf2}}; color: {{t.text}}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;\">3</span></div></div></sc-if>\n  <sc-if value=\"{{img.url}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"height: 196px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center; overflow: hidden;\"><img src=\"{{img.url}}\" alt=\"\" style=\"max-width: 100%; max-height: 100%; object-fit: contain;\"></div></sc-if>\n  <sc-if value=\"{{img.none}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{pickImage}}\" style=\"height: 196px; border: 1.5px dashed {{t.muted}}; border-radius: 20px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer;\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg>Add an image</button></sc-if>\n  <div style=\"display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\"><button type=\"button\" onClick=\"{{pickImage}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg>Replace image</button><sc-if value=\"{{img.mock}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{noop}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>Add a box</button><span style=\"flex-grow: 1;\"></span><div role=\"group\" aria-label=\"What to hide\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\"><sc-for list=\"{{occModes}}\" as=\"o\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 34px; padding: 0 10px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}};\">{{o.label}}</button></sc-for></div></sc-if></div>\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Prompt</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Prompt\" spellcheck=\"true\" data-rk=\"front\" data-ph=\"What should they name?\" data-empty=\"{{rich.front.empty}}\" key=\"{{rich.front.key}}\" ref=\"{{rich.front.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.front.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.front.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Answer</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Answer\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if>\n<sc-if value=\"{{isAudio}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"height: 72px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; gap: 14px; padding: 0 16px;\"><button type=\"button\" onClick=\"{{playAudio}}\" aria-label=\"Play\" style=\"width: 40px; height: 40px; flex-shrink: 0; padding: 0; border: 0; border-radius: 20px; background: {{snd.btn}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5v14l11-7z\" fill=\"currentColor\"/></svg></button><sc-if value=\"{{snd.mock}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 2px; height: 32px;\"><sc-for list=\"{{bars}}\" as=\"b\" hint-placeholder-count=\"64\"><div style=\"flex: 1 1 0; min-width: 1px; border-radius: 1px; background: {{t.text}}; height: {{b.h}};\"></div></sc-for></div><span style=\"font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{t.muted}};\">0:02</span></sc-if><sc-if value=\"{{snd.real}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"flex-grow: 1; min-width: 0; font-size: 14px; color: {{snd.fg}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{snd.label}}</span></sc-if></div>\n  <div style=\"display: flex; gap: 8px; flex-wrap: wrap;\"><button type=\"button\" onClick=\"{{toggleRecord}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg>{{recLabel}}</button><button type=\"button\" onClick=\"{{pickAudio}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 15V4M7 9l5-5 5 5\"/><path d=\"M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3\"/></svg>Upload</button><button type=\"button\" onClick=\"{{toggleSpeak}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2\"/></svg>Read it aloud</button></div>\n  <sc-if value=\"{{speakOn}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Words to read aloud</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Words to read aloud\" spellcheck=\"true\" data-rk=\"speak\" data-ph=\"What the card says out loud\" data-empty=\"{{rich.speak.empty}}\" key=\"{{rich.speak.key}}\" ref=\"{{rich.speak.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.speak.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.speak.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if>\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Answer</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Answer\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div>\n  <div style=\"display: flex; align-items: center; gap: 12px; min-height: 44px;\"><span style=\"flex-grow: 1; display: flex; flex-direction: column; gap: 2px;\"><span style=\"font-size: 14px; font-weight: 600;\">Play on its own</span><span style=\"font-size: 12px; color: {{t.muted}};\">The sound starts when the card comes up</span></span><button type=\"button\" role=\"switch\" aria-checked=\"{{autoSw.checked}}\" aria-disabled=\"{{autoSw.disabled}}\" aria-label=\"Play on its own\" onClick=\"{{toggleAuto}}\" style=\"width: 48px; height: 28px; flex-shrink: 0; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{autoSw.track}}; opacity: {{autoSw.op}}; cursor: pointer; transition: background .2s;\"><span style=\"display: block; width: 22px; height: 22px; border-radius: 11px; background: {{autoSw.knobColor}}; transform: {{autoSw.knob}}; transition: transform .2s cubic-bezier(.4,0,.2,1);\"></span></button></div></sc-if>\n    <div style=\"display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\"><span style=\"display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: {{t.surf}}; font-size: 12px; font-weight: 500; height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600;\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"7\" width=\"14\" height=\"14\" rx=\"3\"/><path d=\"M7 3h11a3 3 0 0 1 3 3v11\"/></svg>{{deckName}}</span><div style=\"display: flex; flex-wrap: wrap; gap: 6px;\"><sc-for list=\"{{cardTags}}\" as=\"g\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{g.remove}}\" aria-label=\"Remove tag {{g.label}}\" style=\"height: 32px; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\">{{g.label}}<span style=\"display: flex; opacity: .7;\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></span></button></sc-for><button type=\"button\" onClick=\"{{cardPick.toggle}}\" aria-expanded=\"{{cardPick.expanded}}\" style=\"height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: 999px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>Add tag</button><sc-if value=\"{{cardPick.open}}\" hint-placeholder-val=\"{{ false }}\"><div role=\"dialog\" aria-label=\"Tags\" style=\"position: absolute; inset: 0; z-index: 30; box-sizing: border-box; padding: 16px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 12px;\"><div style=\"display: flex; align-items: center; justify-content: space-between;\"><span style=\"font-size: 18px; font-weight: 600;\">Tags<span style=\"margin-left: 8px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 13px; font-weight: 500; color: {{t.muted}};\">{{cardPick.count}}</span></span><button type=\"button\" onClick=\"{{cardPick.close}}\" style=\"height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Done</button></div><label style=\"display: flex; align-items: center; gap: 8px; height: 44px; flex-shrink: 0; padding: 0 14px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-3.5-3.5\"/></svg><span style=\"position: absolute; left: -9999px;\">Find or make a tag</span><input value=\"{{cardPick.query}}\" onChange=\"{{cardPick.setQuery}}\" placeholder=\"Find or make a tag\" style=\"flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: {{t.text}};\"></label><div style=\"flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column;\"><sc-if value=\"{{cardPick.canMake}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{cardPick.make}}\" style=\"height: 48px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px; font-weight: 600; text-align: left; cursor: pointer;\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>{{cardPick.makeLabel}}</button></sc-if><sc-for list=\"{{cardPick.options}}\" as=\"o\" hint-placeholder-count=\"8\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 48px; flex-shrink: 0; padding: 0 4px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 0px; border-bottom: 1px solid {{t.line}}; background: transparent; color: {{t.text}}; font: inherit; font-size: 16px; text-align: left; cursor: pointer;\"><span style=\"width: 10px; height: 10px; flex-shrink: 0; border-radius: 5px; background: {{o.dot}};\"></span><span style=\"flex-grow: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{o.label}}</span><sc-if value=\"{{o.on}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"display: flex;\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg></span></sc-if></button></sc-for></div></div></sc-if></div></div>\n  </div>\n  <sc-if value=\"{{typing}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"position: absolute; left: 0; right: 0; bottom: 0; color: {{kb.ink}}; font-family: -apple-system, system-ui, sans-serif;\"><div role=\"toolbar\" aria-label=\"Formatting\" style=\"margin: 0 10px 12px; height: 48px; box-sizing: border-box; padding: 0 6px; border-radius: 999px; background: {{kb.bar}}; box-shadow: {{kb.barShadow}}; display: flex; align-items: center; gap: 4px;\">\n    <sc-if value=\"{{fmtMain}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between;\"><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{openStyles}}\" aria-label=\"Text style\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 19px; font-weight: 500; letter-spacing: -.02em;\">Aa</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.blank.toggle}}\" aria-label=\"Make a blank\" aria-pressed=\"{{fmt.blank.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.blank.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 7H5.5A2.5 2.5 0 0 0 3 9.5v5A2.5 2.5 0 0 0 5.5 17H7M17 7h1.5A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H17M9 12h6\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.list.toggle}}\" aria-label=\"List\" aria-pressed=\"{{fmt.list.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.list.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.img.toggle}}\" aria-label=\"Add image\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.audio.toggle}}\" aria-label=\"Record audio\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.math.toggle}}\" aria-label=\"Math\" aria-pressed=\"{{fmt.math.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.math.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 13h2.5l3 6L14 5h7\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.undo.toggle}}\" aria-label=\"Undo\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 14L4 9l5-5\"/><path d=\"M4 9h11a5 5 0 0 1 0 10h-3\"/></svg></button></div></sc-if>\n    <sc-if value=\"{{fmtStyles}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between;\"><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{closeStyles}}\" aria-label=\"Back to tools\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 18l-6-6 6-6\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.b.toggle}}\" aria-label=\"Bold\" aria-pressed=\"{{fmt.b.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.b.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 18px; font-weight: 700;\">B</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.i.toggle}}\" aria-label=\"Italic\" aria-pressed=\"{{fmt.i.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.i.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 19px; font-style: italic; font-family: Georgia, serif;\">I</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.u.toggle}}\" aria-label=\"Underline\" aria-pressed=\"{{fmt.u.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.u.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 18px; text-decoration: underline; text-underline-offset: 3px;\">U</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.s.toggle}}\" aria-label=\"Strikethrough\" aria-pressed=\"{{fmt.s.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.s.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 18px; text-decoration: line-through;\">S</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.hl.toggle}}\" aria-label=\"Highlight\" aria-pressed=\"{{fmt.hl.pressed}}\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: {{fmt.hl.bg}}; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.5 4.5l5 5L11 18H6v-5z\"/><path d=\"M4 21h9\"/></svg></button></div></sc-if>\n    <span style=\"width: 1px; height: 26px; flex-shrink: 0; background: {{kb.barLine}};\"></span>\n    <button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{hideKeyboard}}\" aria-label=\"Hide keyboard\" style=\"width: 38px; height: 38px; flex-shrink: 0; border: 0; border-radius: 19px; background: transparent; color: {{kb.barInk}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"12\" rx=\"2.5\"/><path d=\"M7 7h.01M10.5 7h.01M14 7h.01M17 7h.01M8 11h8M9 18.5l3 2.5 3-2.5\"/></svg></button>\n  </div><div aria-hidden=\"true\" style=\"box-sizing: border-box; padding: 10px 5px 0; border-radius: 26px 26px 44px 44px; background: {{kb.panel}}; display: flex; flex-direction: column; gap: 12px;\">\n    <div style=\"display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Q</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">W</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">E</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">R</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">T</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Y</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">U</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">I</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">O</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">P</span></div>\n    <div style=\"display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 6px; padding: 0 18px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">A</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">S</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">D</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">F</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">G</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">H</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">J</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">K</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">L</span></div>\n    <div style=\"display: grid; grid-template-columns: 1.45fr .1fr repeat(7, minmax(0, 1fr)) .1fr 1.45fr; gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 4l8 8h-4.5v7h-7v-7H4z\" fill=\"currentColor\"/></svg></span><span></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Z</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">X</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">C</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">V</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">B</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">N</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">M</span><span></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z\"/><path d=\"M12 9l6 6M18 9l-6 6\"/></svg></span></div>\n    <div style=\"display: grid; grid-template-columns: 1.15fr 1.15fr 4.7fr 2.1fr; gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; font-size: 17px;\">123</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"23\" height=\"23\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.2a4.4 4.4 0 0 0 7 0\"/><circle cx=\"9\" cy=\"9.8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"9.8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6v6a3 3 0 0 1-3 3H5\"/><path d=\"M9 11l-4 4 4 4\"/></svg></span></div>\n    <div style=\"height: 58px; box-sizing: border-box; padding: 6px 22px 0; display: flex; justify-content: space-between;\"><svg width=\"27\" height=\"27\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9\"/></svg><svg width=\"27\" height=\"27\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg></div>\n  </div></div></sc-if>\n</div>",
  Logic: DCLogic => {
class Component extends DCLogic {
theme(d) {
  return d
    ? { bg: '#000000', surf: '#141414', surf2: '#222222', line: '#262626', text: '#FFFFFF', muted: '#A3A3A3', inv: '#FFFFFF', invText: '#000000', card: '#141414', shadow: 'none', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD', againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.7)' }
    : { bg: '#FFFFFF', surf: '#F4F4F4', surf2: '#E8E8E8', line: '#EBEBEB', text: '#000000', muted: '#666666', inv: '#000000', invText: '#FFFFFF', card: '#FFFFFF', shadow: '0 1px 2px rgba(0,0,0,.04), 0 18px 44px -18px rgba(0,0,0,.18)', again: '#D92D20', hard: '#B54708', good: '#067647', easy: '#175CD3', againTint: '#FDECEA', goodTint: '#E6F4EC', hardTint: '#FDF1E3', dim: 'rgba(0,0,0,.28)' };
}
mesh(name, i) {
  const P = {"Iris":{"base":"linear-gradient(102deg, #C9CCFC 0%, #9CA2FE 17%, #A9B9FF 32%, #BFCEFF 52%, #BACFFF 70%, #8EC5FC 86%, #33B3EC 100%)","ink":"#000000","fid":"sc-flow-iris","sid":"sc-streak-iris","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#8C98FC","x":14,"y":70,"rx":10,"ry":70,"r":12},"b1":{"c":"#C3D0FF","x":55,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#2CB2EA","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#C2CCFF","x":88,"y":0,"rx":22,"ry":26,"r":0},"b4":{"c":"#7E94FB","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#B9CEFF","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#E6E8FD","x":1,"y":40,"rx":3.2,"ry":70,"r":12},"s1":{"c":"#D3DBFF","x":44,"y":50,"rx":2.6,"ry":80,"r":12}},"Apricot":{"base":"linear-gradient(200deg, #F2AC45 0%, #EE9D3F 28%, #E88C37 52%, #E99038 76%, #EE9A3E 100%)","ink":"#000000","fid":"sc-flow-apricot","sid":"sc-streak-apricot","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#E27E2E","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#F3AE44","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#F4BC76","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#EA9139","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#E7862F","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#F1A640","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FAE6BC","x":6,"y":55,"rx":11,"ry":70,"r":-22},"s1":{"c":"#F7D39A","x":20,"y":70,"rx":5,"ry":50,"r":-22}},"Lilac":{"base":"linear-gradient(110deg, #D9CCFA 0%, #C3B2F6 22%, #D8C3F4 45%, #F1CDE3 68%, #F8CDB8 88%, #F6B999 100%)","ink":"#000000","fid":"sc-flow-lilac","sid":"sc-streak-lilac","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#B7A3F4","x":18,"y":64,"rx":10,"ry":70,"r":14},"b1":{"c":"#E7D3F6","x":50,"y":40,"rx":12,"ry":80,"r":14},"b2":{"c":"#F5B08E","x":100,"y":100,"rx":22,"ry":40,"r":16},"b3":{"c":"#D2C6FA","x":86,"y":0,"rx":22,"ry":24,"r":0},"b4":{"c":"#AE98F2","x":4,"y":100,"rx":16,"ry":22,"r":14},"b5":{"c":"#F4C9D8","x":72,"y":62,"rx":10,"ry":70,"r":14},"s0":{"c":"#F3EDFD","x":2,"y":40,"rx":3,"ry":70,"r":14},"s1":{"c":"#EEDDF8","x":44,"y":50,"rx":2.4,"ry":80,"r":14}},"Mint":{"base":"linear-gradient(105deg, #D7F3E6 0%, #A7E3C9 20%, #BDEBD6 40%, #CFF1DE 60%, #B6E6CD 78%, #7FD0B0 100%)","ink":"#000000","fid":"sc-flow-mint","sid":"sc-streak-mint","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#8FD8B8","x":16,"y":66,"rx":10,"ry":70,"r":12},"b1":{"c":"#D9F5E6","x":52,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#5FC3A0","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#E9F7C9","x":88,"y":2,"rx":22,"ry":24,"r":0},"b4":{"c":"#7ACFAD","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#C3EDD7","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#F1FBF5","x":2,"y":40,"rx":3,"ry":70,"r":12},"s1":{"c":"#E2F7EB","x":44,"y":50,"rx":2.4,"ry":80,"r":12}},"Aqua":{"base":"linear-gradient(102deg, #D5F1FA 0%, #9EDCF1 18%, #B6E6F5 36%, #C9EEF8 56%, #A6DEF2 74%, #5CC0E6 90%, #2FA7DE 100%)","ink":"#000000","fid":"sc-flow-aqua","sid":"sc-streak-aqua","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#86D2EE","x":14,"y":68,"rx":10,"ry":70,"r":12},"b1":{"c":"#D0F0FA","x":54,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#2A9FDA","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#C7EDF9","x":88,"y":0,"rx":22,"ry":26,"r":0},"b4":{"c":"#6CC6EA","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#B2E4F5","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#EEFAFD","x":1,"y":40,"rx":3.2,"ry":70,"r":12},"s1":{"c":"#DDF4FB","x":44,"y":50,"rx":2.6,"ry":80,"r":12}},"Rose":{"base":"linear-gradient(200deg, #F9C3CF 0%, #F5A9BB 30%, #EE8CA6 55%, #F29AB0 78%, #F6AFC0 100%)","ink":"#000000","fid":"sc-flow-rose","sid":"sc-streak-rose","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#EC7F9C","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#FAC6D2","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#F8C0B4","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#F09CB1","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#EF93AA","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#F7B6C5","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FDE9EE","x":4,"y":52,"rx":8,"ry":64,"r":-20},"s1":{"c":"#FBD6DF","x":16,"y":66,"rx":5,"ry":50,"r":-20}},"Lemon":{"base":"linear-gradient(200deg, #FCE78C 0%, #F9DA6E 30%, #F5C752 55%, #F7CF5E 78%, #F9D86C 100%)","ink":"#000000","fid":"sc-flow-lemon","sid":"sc-streak-lemon","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#F2BD45","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#FCE891","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#FBD99A","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#F6CB5A","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#F4C44F","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#FADF7A","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FFF7DA","x":4,"y":52,"rx":8,"ry":64,"r":-20},"s1":{"c":"#FDEDB4","x":16,"y":66,"rx":5,"ry":50,"r":-20}},"Dusk":{"base":"linear-gradient(180deg, #9A92B6 0%, #A58AA6 36%, #AF8599 54%, #C8715F 76%, #DA7A50 100%)","ink":"#FFFFFF","fid":"sc-flow-dusk","sid":"sc-streak-dusk","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#958FB9","x":5,"y":10,"rx":60,"ry":40,"r":0},"b1":{"c":"#AC839E","x":92,"y":18,"rx":50,"ry":36,"r":0},"b2":{"c":"#B0869A","x":50,"y":55,"rx":60,"ry":14,"r":0},"b3":{"c":"#CE505A","x":6,"y":96,"rx":40,"ry":30,"r":0},"b4":{"c":"#F4A04A","x":50,"y":100,"rx":34,"ry":30,"r":0},"b5":{"c":"#D9744C","x":96,"y":92,"rx":34,"ry":28,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Grove":{"base":"linear-gradient(160deg, #2E4A1F 0%, #4E6428 25%, #9A9A3E 50%, #5E7A3A 72%, #1E3A22 100%)","ink":"#FFFFFF","fid":"sc-flow-grove","sid":"sc-streak-grove","blur":"7","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#D9A878","x":70,"y":6,"rx":26,"ry":14,"r":0},"b1":{"c":"#7FB2D6","x":97,"y":30,"rx":16,"ry":26,"r":0},"b2":{"c":"#C8B432","x":40,"y":50,"rx":40,"ry":10,"r":0},"b3":{"c":"#15301A","x":86,"y":94,"rx":36,"ry":22,"r":0},"b4":{"c":"#8FA3AE","x":6,"y":86,"rx":30,"ry":16,"r":0},"b5":{"c":"#22401C","x":6,"y":12,"rx":34,"ry":22,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Forest":{"base":"linear-gradient(180deg, #AEBEC9 0%, #B0C2CF 22%, #A8B7B8 38%, #8A9675 50%, #5E6B3C 61%, #3F4F25 72%, #25391A 86%, #1C3214 100%)","ink":"#FFFFFF","fid":"sc-flow-forest","sid":"sc-streak-forest","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#B3C6D4","x":70,"y":8,"rx":62,"ry":22,"r":0},"b1":{"c":"#909C7C","x":60,"y":50,"rx":46,"ry":7,"r":0},"b2":{"c":"#6F7C4C","x":4,"y":53,"rx":30,"ry":9,"r":0},"b3":{"c":"#203616","x":50,"y":102,"rx":72,"ry":24,"r":0},"b4":{"c":"#2B4319","x":0,"y":80,"rx":30,"ry":18,"r":0},"b5":{"c":"#AAB9BD","x":10,"y":36,"rx":34,"ry":8,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Ember":{"base":"linear-gradient(270deg, #EB840C 0%, #E77C0D 36%, #B8641A 50%, #7A4A22 61%, #5A3A28 72%, #6A3F27 85%, #8B4922 100%)","ink":"#FFFFFF","fid":"sc-flow-ember","sid":"sc-streak-ember","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#E36E0E","x":80,"y":100,"rx":40,"ry":40,"r":0},"b1":{"c":"#F08C10","x":86,"y":4,"rx":36,"ry":36,"r":0},"b2":{"c":"#533728","x":28,"y":45,"rx":13,"ry":75,"r":0},"b3":{"c":"#974B1D","x":0,"y":92,"rx":18,"ry":40,"r":0},"b4":{"c":"#C96A17","x":55,"y":20,"rx":8,"ry":40,"r":0},"b5":{"c":"#E0740E","x":100,"y":60,"rx":20,"ry":30,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Meadow":{"base":"linear-gradient(180deg, #A9CFE0 0%, #7FAE6A 26%, #5E8E3E 38%, #D6C648 50%, #CFE3E6 64%, #5C9450 80%, #3E8480 100%)","ink":"#FFFFFF","fid":"sc-flow-meadow","sid":"sc-streak-meadow","blur":"5","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#2F6230","x":14,"y":40,"rx":38,"ry":10,"r":0},"b1":{"c":"#EDCBA8","x":78,"y":20,"rx":30,"ry":12,"r":0},"b2":{"c":"#E6CB3C","x":46,"y":52,"rx":30,"ry":7,"r":0},"b3":{"c":"#E4EFF3","x":20,"y":68,"rx":30,"ry":10,"r":0},"b4":{"c":"#3F7F3A","x":84,"y":74,"rx":30,"ry":10,"r":0},"b5":{"c":"#9CC8E8","x":94,"y":42,"rx":18,"ry":12,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Ocean":{"base":"linear-gradient(180deg, #CFE2E7 0%, #A2C9D4 28%, #6A9FB3 52%, #33708C 76%, #1B4A66 100%)","ink":"#FFFFFF","fid":"sc-flow-ocean","sid":"sc-streak-ocean","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#E7EFF1","x":72,"y":6,"rx":44,"ry":16,"r":0},"b1":{"c":"#8DBBCB","x":12,"y":32,"rx":40,"ry":10,"r":0},"b2":{"c":"#4E8FA8","x":22,"y":56,"rx":46,"ry":10,"r":0},"b3":{"c":"#2A6482","x":86,"y":70,"rx":42,"ry":14,"r":0},"b4":{"c":"#173F5A","x":30,"y":102,"rx":62,"ry":20,"r":0},"b5":{"c":"#3C7F9B","x":100,"y":46,"rx":24,"ry":10,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Sun":{"base":"linear-gradient(165deg, #F7D84E 0%, #F5C63F 42%, #EFA436 78%, #EA9031 100%)","ink":"#000000","fid":"sc-flow-sun","sid":"sc-streak-sun","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#FBE46C","x":14,"y":8,"rx":52,"ry":34,"r":0},"b1":{"c":"#F3B63A","x":70,"y":55,"rx":50,"ry":22,"r":0},"b2":{"c":"#EA8A2E","x":92,"y":100,"rx":46,"ry":30,"r":0},"b3":{"c":"#F8D24A","x":0,"y":70,"rx":30,"ry":24,"r":0},"b4":{"c":"#F9DC5C","x":80,"y":10,"rx":30,"ry":20,"r":0},"b5":{"c":"#EE9C34","x":30,"y":100,"rx":40,"ry":18,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}}};
  const keys = Object.keys(P);
  return P[name] || P[keys[(i || 0) % keys.length]];
}
gen(seed, mode) {
  // Starting value picked so the sample decks get a varied set; any value is equally random.
  let h = 2300790937;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const norm = x => ((x % 360) + 360) % 360;
  const rgb = (hh, ss, ll) => { ss /= 100; ll /= 100; const k = n => (n + hh / 30) % 12; const a = ss * Math.min(ll, 1 - ll); const f = n => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)]; };
  const lum = ([r, g, b]) => { const L = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b); };
  const hsl = (hh, l, ss) => 'hsl(' + norm(hh).toFixed(0) + ' ' + ss.toFixed(0) + '% ' + Math.max(4, Math.min(97, l)).toFixed(0) + '%)';
  const id = (h >>> 0).toString(36);
  let kind = mode, c = 0;
  if (typeof mode === 'number') { c = mode; kind = c < 0.5 ? 'deep' : 'clear'; }
  else {
    if (mode == null || mode === 'mix') kind = rnd() < 0.7 ? 'vivid' : 'deep';
    c = kind === 'clear' ? 0.76 + rnd() * 0.24 : kind === 'deep' ? 0.02 + rnd() * 0.26 : 0;
  }
  if (kind === 'vivid') {
    // Families from the references, as [hue, saturation, lightness]: main, light, dark, accent, second accent,
    // fold angle, roundness (0 = long silky folds, 1 = soft round clouds), and how big the accent is.
    const F = [
      [[270, 44, 58], [262, 46, 72], [292, 50, 44], [6, 78, 60], [312, 44, 66], 0, 0.1, 1],
      [[20, 88, 54], [27, 94, 62], [10, 50, 25], [282, 16, 50], [8, 82, 48], -38, 0.15, 1],
      [[13, 78, 48], [18, 88, 60], [8, 72, 30], [212, 70, 66], [20, 88, 71], 18, 0.85, 1.5],
      [[199, 82, 46], [195, 80, 58], [210, 86, 29], [348, 76, 82], [350, 70, 76], 58, 0.3, 1.45],
      [[238, 60, 58], [284, 46, 52], [236, 52, 30], [352, 74, 66], [18, 88, 71], 86, 0.55, 1.2],
      [[229, 66, 50], [226, 70, 60], [231, 64, 29], [330, 58, 64], [352, 62, 58], -36, 0.35, 1.4],
      [[318, 58, 46], [326, 64, 60], [290, 52, 26], [24, 92, 58], [18, 88, 72], 12, 0.3, 1.2],
      [[190, 72, 40], [186, 66, 54], [205, 76, 23], [10, 82, 64], [22, 88, 72], -24, 0.45, 1.35],
      [[350, 72, 50], [356, 80, 62], [340, 64, 28], [258, 58, 62], [268, 52, 74], 30, 0.4, 1.3],
      [[248, 54, 48], [252, 60, 63], [246, 56, 26], [20, 90, 70], [8, 78, 62], -12, 0.5, 1.2]
    ];
    const fam = Math.floor(rnd() * F.length), [dom, lite, dark, acc, acc2, flow0, round, big] = F[fam];
    const dh = (rnd() - 0.5) * 14, fx = rnd() < 0.5, fy = rnd() < 0.4;
    const vc = ([hh, ss, ll], dl = 0) => hsl(hh + dh, ll + dl, ss);
    const X = x => +(fx ? 100 - x : x).toFixed(1), Y = y => +(fy ? 100 - y : y).toFixed(1);
    const flow = (flow0 + (rnd() - 0.5) * 14) * (fx !== fy ? -1 : 1);
    const j = () => (rnd() - 0.5) * 12, k = () => 0.8 + rnd() * 0.4;
    const blob = (cc, x, y, w, ht, rot = flow) => ({ c: cc, x: X(x + j()), y: Y(y + j()), rx: +(w * k()).toFixed(1), ry: +(ht * k()).toFixed(1), r: +rot.toFixed(1) });
    let a = 225; if (fx) a = 360 - a; if (fy) a = 180 - a;
    const o = { base: 'linear-gradient(' + Math.round(norm(a)) + 'deg, ' + vc(lite) + ' 0%, ' + vc(dom) + ' 52%, ' + vc(dark, 6) + ' 100%)',
      fid: 'sc-gen-' + id, sid: 'sc-gens-' + id, blur: '9', sblur: '5.5', disp: '24', clarity: 0, kind: 'Vivid', fam };
    o.b0 = blob(vc(acc), 6, 94, (26 + 14 * round) * big, (26 + 14 * round) * big);
    o.b1 = blob(vc(acc2), 24 * big, 86, (12 + 10 * round) * big, (18 + 8 * round) * big);
    o.b2 = blob(vc(dark), 18, 36, 8 + 16 * round, 64 - 30 * round);
    o.b3 = blob(vc(lite, 2), 72, 18, 12 + 14 * round, 60 - 24 * round);
    o.b4 = blob(vc(dom), 52, 56, 9 + 16 * round, 66 - 30 * round);
    o.b5 = blob(vc(dark, 8), 90, 88, 10 + 16 * round, 40 - 10 * round);
    const silk = round < 0.5, none = { c: 'transparent', x: 0, y: 0, rx: 0, ry: 0, r: 0 };
    o.s0 = silk ? { c: vc(lite, 4), x: X(42 + j()), y: 50, rx: 4.5, ry: 80, r: +flow.toFixed(1) } : none;
    o.s1 = silk ? { c: vc(dark, 4), x: X(66 + j()), y: 50, rx: 3.5, ry: 80, r: +flow.toFixed(1) } : none;
    o.ink = '#FFFFFF'; o.glass = 'rgba(255,255,255,.14)'; o.glassLine = 'rgba(255,255,255,.6)'; o.shadow = '0 1px 14px rgba(0,0,0,.18)';
    return o;
  }
  const mix = (a, b) => a + (b - a) * c;
  let hue = rnd() * 360;
  // Deep yellows and yellow-greens turn olive and muddy; nudge them to amber or green.
  if (c < 0.6 && hue > 46 && hue < 100) hue = hue < 73 ? 32 + rnd() * 8 : 118 + rnd() * 20;
  let hue2 = hue + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 30);
  const n2 = norm(hue2);
  if (c < 0.6 && n2 > 46 && n2 < 100) hue2 = n2 < 73 ? 28 : 124;
  const sat = mix(52, 88), lo = mix(16, 62), hi = mix(70, 90);
  const col = (hh, l, ss) => hsl(hh, l, ss == null ? sat : ss);
  const tilt = (rnd() - 0.5) * 50;
  const angle = Math.round(rnd() * 360);
  const lMid = (lo + hi) / 2;
  const base = 'linear-gradient(' + angle + 'deg, ' + col(hue, hi) + ' 0%, ' + col(hue, lMid) + ' 45%, ' + col(hue2, mix(lo + 6, lMid)) + ' 100%)';
  const o = { base, fid: 'sc-gen-' + id, sid: 'sc-gens-' + id,
    blur: mix(9, 6).toFixed(1), sblur: mix(4, 3).toFixed(1), disp: mix(26, 9).toFixed(0), clarity: c, kind: c < 0.5 ? 'Deep' : 'Clear', hue: Math.round(norm(hue)) };
  for (let i = 0; i < 6; i++) {
    const hh = i % 2 ? hue2 : hue, span = (hi - lo) * 0.45, l = rnd() < 0.5 ? lo + rnd() * span : hi - rnd() * span;
    o['b' + i] = { c: col(hh, l), x: +(rnd() * 100).toFixed(1), y: +(rnd() * 100).toFixed(1),
      rx: +(mix(34, 11) * (0.7 + rnd() * 0.6)).toFixed(1), ry: +(mix(26, 72) * (0.7 + rnd() * 0.6)).toFixed(1), r: +(tilt * c).toFixed(1) };
  }
  for (let i = 0; i < 2; i++) {
    const on = c > 0.45;
    o['s' + i] = on ? { c: col(hue, Math.min(95, hi + 4), sat * 0.8), x: +(8 + rnd() * 84).toFixed(1), y: 50, rx: +(1.5 + rnd() * 2 * c).toFixed(1), ry: 80, r: +tilt.toFixed(1) }
      : { c: 'transparent', x: 0, y: 0, rx: 0, ry: 0, r: 0 };
  }
  // Text color: whichever of black or white reads better on the middle of the card.
  const Lm = lum(rgb(norm(hue), sat, lMid));
  const white = 1.05 / (Lm + 0.05), black = (Lm + 0.05) / 0.05;
  const dark = white > black;
  o.ink = dark ? '#FFFFFF' : '#000000';
  o.glass = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.34)';
  o.glassLine = dark ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.22)';
  o.shadow = dark ? '0 1px 14px rgba(0,0,0,.16)' : 'none';
  return o;
}
mock() {
  const p = this.props, m = this.state.$m || {};
  const set = patch => this.setState({ $m: { ...m, ...patch } });
  const X = {"DECKS":[{"id":"cell","name":"Cell Biology","total":"412","due":28,"overdue":12,"soon":0,"fresh":10,"ret":91,"ai":38},{"id":"jlpt","name":"Japanese · JLPT N4","total":"1,280","due":19,"overdue":5,"soon":0,"fresh":20,"ret":87,"ai":0},{"id":"orgo","name":"Organic Chemistry","total":"236","due":11,"overdue":0,"soon":0,"fresh":5,"ret":84,"ai":0},{"id":"hist","name":"US History","total":"158","due":6,"overdue":0,"soon":0,"fresh":0,"ret":93,"ai":0},{"id":"sys","name":"System Design","total":"74","due":0,"overdue":0,"soon":1,"fresh":8,"ret":89,"ai":0},{"id":"span","name":"Spanish Verbs","total":"310","due":0,"overdue":0,"soon":3,"fresh":0,"ret":95,"ai":0}],"TAGS":{"cell":["Biology","MCAT","Year 1","BIO 201","Fall 2026","Midterm","Final exam","Pre-med","Lab","Cells","Must know"],"jlpt":["Languages"],"orgo":["Chemistry","MCAT","Year 1","Pre-med","Fall 2026"],"hist":["History"],"sys":["Computer science"],"span":["Languages"]},"CARDS":[{"id":"k1","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","kind":"Basic","icon":"text","next":"Tomorrow","ai":"","tags":["Energy","Exam 1","Mitochondria","Must know"]},{"id":"k2","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","kind":"Fill in the blank","icon":"blank","next":"Due now","ai":"Claude","tags":["Organelles","Exam 1"]},{"id":"k3","front":"Name structure 1 on the diagram.","back":"Nucleus","kind":"Image","icon":"image","next":"In 3 days","ai":"Claude","tags":["Organelles","Diagrams"]},{"id":"k4","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","kind":"Basic","icon":"text","next":"In 6 days","ai":"","tags":["Organelles"]},{"id":"k5","front":"Say it: ribosome","back":"RY-buh-sohm","kind":"Audio","icon":"audio","next":"Due now","ai":"ChatGPT","tags":["Pronunciation"]},{"id":"k6","front":"What is the role of the ribosome?","back":"Translates mRNA into protein","kind":"Basic","icon":"text","next":"In 12 days","ai":"","tags":["Proteins","Exam 2"]}],"REVIEW":[{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), from the matrix into the intermembrane space.","note":"That gradient powers ATP synthase."},{"kind":"cloze","before":"The","after":"is the powerhouse of the cell.","back":"mitochondrion","note":"It makes most of the cell’s ATP."},{"kind":"image","front":"Name structure 1.","back":"Nucleus","note":"Holds the cell’s DNA.","image":"mock","backLabel":"1 = Nucleus"},{"kind":"audio","front":"What word do you hear?","back":"train","note":"電 electricity + 車 vehicle.","audio":"mock","backBig":"電車","backSub":"でんしゃ · train"}],"DRAFTS":{"Basic":{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), into the intermembrane space."},"Blank":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].","note":"It makes most of the cell’s ATP."},"Image":{"kind":"image","front":"Name structure 1.","back":"Nucleus","image":"mock"},"Audio":{"kind":"audio","back":"電車 (でんしゃ): train","audio":"mock"}},"DUE_7":{"vals":[32,18,24,12,30,8,16],"labels":["Wed","Thu","Fri","Sat","Sun","Mon","Tue"],"tops":null,"names":["tomorrow","Thursday","Friday","Saturday","Sunday","Monday","Tuesday"]},"DUE_14":{"vals":[32,18,24,12,30,8,16,22,14,26,10,20,6,12],"labels":["23","24","25","26","27","28","29","30","1","2","3","4","5","6"],"tops":["W","T","F","S","S","M","T","W","T","F","S","S","M","T"],"names":["tomorrow","Thu 24","Fri 25","Sat 26","Sun 27","Mon 28","Tue 29","Wed 30","Thu, Oct 1","Fri, Oct 2","Sat, Oct 3","Sun, Oct 4","Mon, Oct 5","Tue, Oct 6"]}};
  const caught = !!p.caughtUp;
  const byName = { 'Four buttons': 'four', 'Check or X': 'binary', 'Piles': 'piles' };
  const ed = m.deck || {};
  const deck = () => ({ id: 'cell', name: ed.name ?? 'Cell Biology', tags: ed.tags || X.TAGS.cell, seed: 'Cell Biology', cover: { style: 'mix', round: 0, image: null, ...(ed.cover || {}) },
    paused: !!ed.paused, grading: ed.grading || byName[p.grading] || 'four', fsrs: ed.fsrs ?? (p.fsrs !== false), goal: ed.goal ?? 90, gapIdx: ed.gapIdx ?? 3, steps: ed.steps || ['1m', '10m'], perDay: ed.perDay ?? 20,
    total: 412, totalLabel: '412', due: 28, fresh: 10, ret: 91, aiCount: 38, forecast: [28, 14, 20, 9, 24, 6, 12], piles: m.piles || [{ name: 'Know it', n: 18 }, { name: 'Almost', n: 6 }, { name: 'No clue', n: 3 }],
    href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', newCardHref: 'WebEditor.dc.html' });
  const idx = m.idx ?? (({ 'Fill in the blank': 1, Image: 2, Audio: 3 })[p.card] || 0);
  const st = { name: 'Alex Kim', sub: 'Signed in with Google · alex@gmail.com', signedIn: true, google: true, photo: p.photo === 'Google photo' ? 'google' : 'color', color: 0,
    look: 'system', grads: 'mix', prog: ({ Bar: 'bar', Counts: 'counts', None: 'none' })[p.progress] || 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, check: true, reminder: '9:00 AM', ...(m.settings || {}) };
  const perms = { read: true, text: true, media: true, edit: true, check: true, del: false, ...(m.perms || {}) };
  const noop = () => {};
  return {
    mock: true,
    chrome: () => ({ nav: { today: caught ? '' : '64' }, me: { bg: 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A' } }),
    settings: () => st,
    tags: () => [],
    decks: () => X.DECKS.map((d, i) => ({ ...d, name: d.name, tags: X.TAGS[d.id], seed: d.name, style: null, image: null, totalLabel: d.total, paused: false,
      due: caught ? 0 : d.due, overdue: caught ? 0 : d.overdue, soon: caught ? (d.soon || [1, 1, 2, 3, 1, 3][i]) : d.soon,
      href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html' })),
    deck,
    searchDecks: q => X.DECKS.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
    cards: () => X.CARDS.map(r => ({ ...r, href: 'WebEditor.dc.html' })),
    card: () => null,
    draft: type => ({ tags: ['Energy', 'Exam 1'], front: '', back: '', text: '', note: '', image: null, audio: null, speak: '', auto: true, ...X.DRAFTS[type] }),
    today: () => ({ date: 'Tuesday, September 22', streak: 12, best: 31, due: caught ? 0 : 64, minutes: 11, fresh: 10, next: { day: 'tomorrow', n: 32 },
      week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => ({ d, done: i < 2, today: i === 1 })), forecast: X.DUE_7, newCardHref: 'WebEditor.dc.html', studyHref: 'WebReview.dc.html' }),
    review: () => {
      const c = X.REVIEW[idx % X.REVIEW.length], d = deck(), done = 12 + idx, left = 64 - done;
      const scale = (Math.pow(d.goal / 100, -2) - 1) / (Math.pow(0.9, -2) - 1), gaps = [30, 90, 180, 365, 730, 1825, 3650], maxGap = gaps[d.gapIdx];
      const days = b => Math.min(maxGap, Math.max(1, Math.round(b * scale)));
      const fmt = n => (n < 30 ? n + 'd' : n < 365 ? Math.round(n / 3) / 10 + 'mo' : Math.round(n / 36.5) / 10 + 'y');
      const hardD = days(2), goodD = Math.min(maxGap, Math.max(hardD + 1, days(4))), easyD = Math.min(maxGap, Math.max(goodD + 1, days(9)));
      return { empty: false, deckId: 'cell', card: { id: 'r' + idx, ...c }, done, left, total: 64, queue: { basic: 'rev', cloze: 'new', image: 'new', audio: 'learn' }[c.kind],
        counts: { new: 8, learn: 3, rev: Math.max(left - 11, 0) }, iv: { again: d.steps[0], hard: fmt(hardD), good: fmt(goodD), easy: fmt(easyD) },
        mode: d.grading, fsrsOn: d.grading !== 'piles' && d.fsrs, piles: d.piles, prog: st.prog, editHref: 'WebEditor.dc.html' };
    },
    session: () => ({ pct: 91, goal: 90, cards: 40, minutes: 12, fresh: 3, split: [3, 5, 25, 7], splitW: ['8%', '12%', '62%', '18%'], streak: 13, next: 'Tomorrow · 32', moreHref: 'WebReview.dc.html',
      sorted: 12, piles: [{ name: 'Know it', n: 7, total: 18 }, { name: 'Almost', n: 3, total: 6 }, { name: 'No clue', n: 2, total: 3 }], onlyPiles: false }),
    stats: () => ({ streak: 12, best: 31, reviews: '1,284', cards: '2,470', ai: 312, remembered: 90, goal: 90, heat: null, forecast: X.DUE_14,
      byDeck: X.DECKS.map(d => ({ name: d.name, ret: d.ret })) }),
    ai: () => ({ url: 'https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ', perms, clients: { claude: true, openai: true, cursor: false, mcp: false }, connected: 'Claude, ChatGPT' }),
    href: kind => ({ decks: 'WebDecks.dc.html', newDeck: 'WebNewDeck.dc.html', import: 'WebImport.dc.html', connect: 'WebConnect.dc.html', today: 'Main.dc.html' })[kind] || 'Main.dc.html',
    act: {
      updateDeck: (id, patch) => set({ deck: { ...ed, ...patch, cover: { ...(ed.cover || {}), ...(patch.cover || {}) } } }),
      grade: () => set({ idx: idx + 1 }),
      pile: (id, name) => set({ idx: idx + 1, piles: deck().piles.map(q => (q.name === name ? { ...q, n: q.n + 1 } : q)) }),
      undo: () => idx > 0 && set({ idx: idx - 1 }),
      setSettings: patch => set({ settings: { ...(m.settings || {}), ...patch } }),
      setPerm: (k, on) => set(k === 'check' ? { perms: { ...(m.perms || {}), check: on }, settings: { ...(m.settings || {}), check: on } } : { perms: { ...(m.perms || {}), [k]: on } }),
      pickCover: () => set({ deck: { ...ed, cover: { ...(ed.cover || {}), image: 'mock' } } }),
      addDeck: noop, deleteDeck: noop, exportDeck: noop, saveCard: noop, deleteCard: noop, copy: noop, speak: noop, play: noop, importCards: noop, exportAll: noop, resetAll: noop,
      pickFile: () => Promise.resolve(null), pickText: () => Promise.resolve(null), record: () => Promise.resolve(null),
      addPile: (id, name) => set({ piles: [...deck().piles, { name, n: 0 }] })
    }
  };
}
rich() { return Component._rich || (Component._rich = (function makeRich() {
  const ORDER = 'khsuibm', WS = /\s/, WORD = /[\p{L}\p{N}_]/u, PUNCT = /[!-/:-@[-`{-~]/;
  const norm = m => [...new Set(m)].filter(c => ORDER.includes(c)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('');
  const tidy = runs => {
    const out = [];
    for (const r of runs) { if (!r.t) continue; const p = out[out.length - 1]; if (p && p.m === r.m) p.t += r.t; else out.push({ t: r.t, m: r.m }); }
    return out;
  };

  // ---------- reading ----------
  const TAGS = [['b', /^<(?:b|strong)>/i, /^<\/(?:b|strong)>/i], ['i', /^<(?:i|em)>/i, /^<\/(?:i|em)>/i], ['u', /^<u>/i, /^<\/u>/i],
    ['s', /^<(?:s|del|strike)>/i, /^<\/(?:s|del|strike)>/i], ['h', /^<mark>/i, /^<\/mark>/i]];
  // $x$ is math when the $ hugs the formula: "$5 and $6" stays money.
  function mathEnd(s, i) {
    if (!s[i + 1] || WS.test(s[i + 1]) || s[i + 1] === '$') return -1;
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '$' && !WS.test(s[j - 1]) && !/\d/.test(s[j + 1] || '')) return j;
    }
    return -1;
  }
  function inline(s, cloze) {
    const toks = [];
    let buf = '';
    const flush = () => { if (buf) toks.push({ k: 'x', v: buf }); buf = ''; };
    for (let i = 0; i < s.length;) {
      const c = s[i], two = s.substr(i, 2);
      if (two === '\\(') { const j = s.indexOf('\\)', i + 2); if (j > i + 2) { flush(); toks.push({ k: 'm', v: s.slice(i + 2, j) }); i = j + 2; continue; } }
      if (c === '\\' && i + 1 < s.length && PUNCT.test(s[i + 1])) { buf += s[i + 1]; i += 2; continue; }
      if (c === '$') { const j = mathEnd(s, i); if (j > 0) { flush(); toks.push({ k: 'm', v: s.slice(i + 1, j).replace(/\\\$/g, '$') }); i = j + 1; continue; } }
      if (c === '<') {
        const rest = s.slice(i);
        let hit = null;
        for (const [m, o, cl] of TAGS) { const r = rest.match(o) || rest.match(cl); if (r) { hit = { m, role: o.test(r[0]) ? 'open' : 'close', raw: r[0] }; break; } }
        if (hit) { flush(); toks.push({ k: 'd', ...hit }); i += hit.raw.length; continue; }
      }
      if (cloze && (two === '[[' || two === ']]')) { flush(); toks.push({ k: 'd', m: 'k', role: two === '[[' ? 'open' : 'close', raw: two }); i += 2; continue; }
      const d = two === '**' ? 'b' : two === '~~' ? 's' : two === '==' ? 'h' : c === '*' ? 'i' : '';
      if (d) { const n = d === 'i' ? 1 : 2; flush(); toks.push({ k: 'd', m: d, role: 'tog', raw: s.substr(i, n), pre: s[i - 1] || '', post: s[i + n] || '' }); i += n; continue; }
      buf += c; i++;
    }
    flush();
    // Pair each style's start with its end. A start with no end is just text ("5 * 3").
    const open = {};
    toks.forEach((t, n) => {
      if (t.k !== 'd') return;
      const o = open[t.m];
      if (t.role === 'open') { if (o == null) open[t.m] = n; return; }
      if (t.role === 'close') { if (o != null) { t.on = toks[o].on = true; open[t.m] = null; } return; }
      if (o == null) { if (t.post && !WS.test(t.post)) open[t.m] = n; }
      else if (t.pre && !WS.test(t.pre)) { t.on = toks[o].on = true; open[t.m] = null; }
    });
    const runs = [], on = new Set();
    for (const t of toks) {
      const m = [...on].join('');
      if (t.k === 'x') runs.push({ t: t.v, m: norm(m) });
      else if (t.k === 'm') runs.push({ t: t.v, m: norm(m + 'm') });
      else if (!t.on) runs.push({ t: t.raw, m: norm(m) });
      else if (on.has(t.m)) on.delete(t.m);
      else on.add(t.m);
    }
    return tidy(runs);
  }
  const LEAD = [[/^#\s+/, 'h1'], [/^##\s+/, 'h2'], [/^###\s+/, 'h3'], [/^\s*[-*+]\s+/, 'li'], [/^\s*\d{1,3}[.)]\s+/, 'ol']];
  function parse(md, cloze) {
    return String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n').map(line => {
      for (const [re, kind] of LEAD) { const b = re.exec(line); if (b) return { kind, runs: inline(line.slice(b[0].length), !!cloze) }; }
      return { kind: '', runs: inline(line, !!cloze) };
    });
  }

  // ---------- writing ----------
  const MD = { b: ['**', '**'], i: ['*', '*'], s: ['~~', '~~'], h: ['==', '=='], u: ['<u>', '</u>'], k: ['[[', ']]'] };
  const TAG = { b: ['<b>', '</b>'], i: ['<i>', '</i>'], s: ['<s>', '</s>'], h: ['<mark>', '</mark>'], u: ['<u>', '</u>'], k: ['[[', ']]'] };
  const escText = (t, safe) => {
    const s = t.replace(/[\\*$]/g, '\\$&');
    return safe ? s.replace(/[~=<[\]]/g, '\\$&') : s.replace(/~~/g, '\\~\\~').replace(/==/g, '\\=\\=').replace(/<(?=\/?(?:b|strong|i|em|u|s|del|strike|mark)>)/gi, '\\<');
  };
  const mathOut = (t, safe) => (!safe && /^[^\s$](?:[^$]*[^\s$])?$/.test(t) ? '$' + t + '$' : '\\(' + t + '\\)');
  function writeLine(l, safe) {
    // Open and close styles around the runs, closing only what has to close. A blank is always
    // outermost, so a style changing inside it never splits it in two.
    const ev = [];
    let stack = [];
    for (const r of l.runs) {
      const has = [...r.m.replace('m', '')];
      const want = [...has.filter(m => m === 'k'), ...stack.filter(m => m !== 'k' && has.includes(m)), ...has.filter(m => m !== 'k' && !stack.includes(m))];
      let p = 0;
      while (p < stack.length && p < want.length && stack[p] === want[p]) p++;
      for (let q = stack.length - 1; q >= p; q--) ev.push({ close: stack[q] });
      stack = stack.slice(0, p);
      for (const m of want.slice(p)) { ev.push({ open: m }); stack.push(m); }
      ev.push({ run: r });
    }
    for (let q = stack.length - 1; q >= 0; q--) ev.push({ close: stack[q] });
    // A style that starts or ends on a space is written as a tag: "**x **" wouldn't read back.
    const form = [], opens = [];
    ev.forEach((e, n) => {
      if (e.open) opens.push(n);
      else if (e.close) {
        const o = opens.pop(), txt = ev.slice(o + 1, n).filter(x => x.run).map(x => x.run.t).join('');
        form[o] = form[n] = safe || /^\s|\s$/.test(txt) ? TAG : MD;
      }
    });
    return ev.map((e, n) => (e.open ? form[n][e.open][0] : e.close ? form[n][e.close][1] : e.run.m.includes('m') ? mathOut(e.run.t, safe) : escText(e.run.t, safe))).join('');
  }
  const same = (a, b) => a.length === b.length && a.every((l, i) => (l.kind || '') === (b[i].kind || '') && JSON.stringify(tidy(l.runs)) === JSON.stringify(tidy(b[i].runs)));
  // Text that only looks like a heading or a list ("# 1" or "1. ") gets a backslash so it stays text.
  const plainStart = s => s.replace(/^(\s*)([-+]|#{1,3})(?=\s)/, (m, sp, x) => sp + '\\' + x).replace(/^(\s*\d{1,3})([.)])(?=\s)/, (m, d, x) => d + '\\' + x);
  function write(lines, cloze) {
    const go = safe => { let n = 0; return lines.map(l => { n = l.kind === 'ol' ? n + 1 : 0; const body = writeLine(l, safe); return l.kind ? prefix(l.kind, n) + body : plainStart(body); }).join('\n'); };
    const md = go(false);
    return same(parse(md, cloze), lines) ? md : go(true);
  }
  const prefix = (kind, n) => ({ h1: '# ', h2: '## ', h3: '### ', li: '- ', ol: n + '. ' })[kind] || '';

  // ---------- plain text ----------
  // Runs grouped into blanks and the text between them.
  function groups(runs) {
    const out = [];
    for (const r of runs) {
      const k = r.m.includes('k'), p = out[out.length - 1];
      if (p && p.blank === k) { p.runs.push(r); p.text += r.t; } else out.push({ blank: k, runs: [r], text: r.t });
    }
    return out;
  }
  // o.blank replaces each blank (like "____"); o.join joins the lines (default a line break);
  // o.math: 'show' writes formulas as they look (π r²) instead of as typed (\pi r^2).
  const runText = (r, o) => (o.math === 'show' && r.m.includes('m') ? mathText(r.t) : r.t);
  const plain = (md, o = {}) => parse(md, !!o.cloze).map(l => groups(l.runs).map(g => (g.blank && o.blank != null ? o.blank : g.runs.map(r => runText(r, o)).join(''))).join('')).join(o.join == null ? '\n' : o.join);
  const blanks = (md, o = {}) => parse(md, true).flatMap(l => groups(l.runs).filter(g => g.blank).map(g => g.runs.map(r => runText(r, o)).join('')));
  const plainLines = lines => { let n = 0; return lines.map(l => { n = l.kind === 'ol' ? n + 1 : 0; return prefix(l.kind, n) + l.runs.map(r => r.t).join(''); }).join('\n'); };

  // ---------- showing ----------
  // How each kind of line looks. Headings are sized from the text around them.
  const LINE = { li: 'display: list-item; list-style: disc outside; margin-left: 1.15em;',
    h1: 'font-size: 1.35em; font-weight: 700; line-height: 1.25; letter-spacing: -.02em;', h2: 'font-size: 1.18em; font-weight: 700; line-height: 1.3; letter-spacing: -.015em;',
    h3: 'font-size: 1.05em; font-weight: 600; line-height: 1.35;' };
  const lineCss = (kind, n) => (kind === 'ol' ? "display: list-item; list-style-type: '" + n + ". '; margin-left: 1.5em;" : LINE[kind] || '');
  const numbered = lines => { let n = 0; return lines.map(l => (n = l.kind === 'ol' ? n + 1 : 0)); };
  const MATH_FONT = "font-family: Georgia, 'Times New Roman', serif;";
  const hl = o => (o.dark ? '#2F3D9A' : '#DCE0FD');
  function css(m, o, edit) {
    let s = '';
    if (m.includes('b')) s += 'font-weight: 700; ';
    if (m.includes('i')) s += 'font-style: italic; ';
    const d = [m.includes('u') && 'underline', m.includes('s') && 'line-through'].filter(Boolean).join(' ');
    if (d) s += 'text-decoration: ' + d + '; text-underline-offset: .15em; ';
    if (m.includes('h')) s += 'background: ' + hl(o) + '; ';
    if (m.includes('m') && edit) s += MATH_FONT + ' background: ' + (o.t ? o.t.surf2 : '#E8E8E8') + '; border-radius: 6px; padding: 0 4px; ';
    return s.trim();
  }
  // Math reads like a formula on the card: x^2 → x², \frac{a}{b} → a⁄b, \alpha → α, <= → ≤.
  const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ',
    Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠',
    neq: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', partial: '∂', nabla: '∇', sum: '∑', prod: '∏', int: '∫', oint: '∮', to: '→', rightarrow: '→', leftarrow: '←',
    gets: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆',
    supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨', angle: '∠',
    circ: '∘', degree: '°', perp: '⊥', parallel: '∥', ldots: '…', cdots: '⋯', dots: '…', prime: '′', hbar: 'ℏ', ell: 'ℓ', aleph: 'ℵ', langle: '⟨', rangle: '⟩', mid: '∣',
    star: '⋆', oplus: '⊕', otimes: '⊗', quad: '\u2003', qquad: '\u2003\u2003', ',': '\u2009', ';': '\u2005', ':': '\u2005', ' ': ' ', '!': '', '{': '{', '}': '}', '%': '%',
    $: '$', '#': '#', '&': '&', _: '_', '\\': '\\' };
  const WORDS = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'min', 'max', 'det', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'gcd', 'mod'];
  const ASCII = { '<=': '≤', '>=': '≥', '!=': '≠', '->': '→', '<-': '←', '=>': '⇒', '+-': '±' };
  function mathBits(s, pos, over, out) {
    for (let i = 0; i < s.length;) {
      const arg = () => {
        while (s[i] === ' ') i++;
        if (s[i] === '{') { let d = 1, j = i + 1; for (; j < s.length && d; j++) d += s[j] === '{' ? 1 : s[j] === '}' ? -1 : 0; const r = s.slice(i + 1, d ? j : j - 1); i = j; return r; }
        if (s[i] === '\\') { const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i)); i += m ? m[0].length : 1; return m ? m[0] : ''; }
        return s[i++] || '';
      };
      const c = s[i];
      if (c === '^' || c === '_') { i++; mathBits(arg(), pos || (c === '^' ? 'sup' : 'sub'), over, out); continue; }
      if (c === '{' || c === '}') { i++; continue; }
      if (c === '\\') {
        const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i)) || ['\\', ''];
        i += m[0].length;
        const n = m[1];
        if (n === 'sqrt') { out.push({ t: '√', pos, over }); mathBits(arg(), pos, true, out); continue; }
        if (n === 'frac') { const a = arg(), b = arg(); mathBits(a, pos || 'sup', over, out); out.push({ t: '⁄', pos, over }); mathBits(b, pos || 'sub', over, out); continue; }
        if (/^(text|mathrm|textrm|operatorname)$/.test(n)) { out.push({ t: arg(), pos, over }); continue; }
        if (/^(mathbf|textbf|boldsymbol)$/.test(n)) { const from = out.length; mathBits(arg(), pos, over, out); for (let q = from; q < out.length; q++) out[q].bold = true; continue; }
        if (/^(left|right|displaystyle|big|Big)$/.test(n)) continue;
        if (n in SYM) { out.push({ t: SYM[n], pos, over }); continue; }
        if (WORDS.includes(n)) { out.push({ t: n, pos, over }); continue; }
        out.push({ t: '\\' + n, pos, over });
        continue;
      }
      const two = s.substr(i, 2);
      if (ASCII[two]) { out.push({ t: ASCII[two], pos, over }); i += 2; continue; }
      if (c === '*') { out.push({ t: '×', pos, over }); i++; continue; }
      if (c === '-') { out.push({ t: '−', pos, over }); i++; continue; }
      out.push({ t: c, pos, over, it: /[A-Za-z]/.test(c) });
      i++;
    }
    return out;
  }
  // A formula as plain text, with ² and ₂ where there are such letters.
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '−': '₋', '=': '₌', '(': '₍', ')': '₎' };
  function mathText(src) {
    const parts = [];
    for (const x of mathBits(src, '', false, [])) { const p = parts[parts.length - 1]; if (p && p.pos === x.pos) p.t += x.t; else parts.push({ pos: x.pos, t: x.t }); }
    return parts.map(x => {
      if (!x.pos) return x.t;
      const map = x.pos === 'sup' ? SUP : SUB;
      if ([...x.t].every(c => map[c])) return [...x.t].map(c => map[c]).join('');
      return (x.pos === 'sup' ? '^' : '_') + (x.t.length > 1 ? '(' + x.t + ')' : x.t);
    }).join('');
  }
  function mathItems(src, base) {
    const items = [];
    for (const x of mathBits(src, '', false, [])) {
      if (!x.t) continue;
      const c = [base, MATH_FONT, x.it ? 'font-style: italic;' : '', x.bold ? 'font-weight: 700;' : '',
        x.pos === 'sup' ? 'font-size: .7em; vertical-align: super; line-height: 0;' : x.pos === 'sub' ? 'font-size: .7em; vertical-align: sub; line-height: 0;' : '',
        x.over ? 'text-decoration: overline;' : ''].filter(Boolean).join(' ');
      const p = items[items.length - 1];
      if (p && p.css === c) p.t += x.t; else items.push({ plain: true, blank: false, t: x.t, css: c, runs: [] });
    }
    return items;
  }
  const showRun = (r, o) => (r.m.includes('m') ? mathItems(r.t, css(r.m.replace('m', ''), o)) : [{ plain: true, blank: false, t: r.t, css: css(r.m, o), runs: [] }]);
  // Lines for a card. Fill-in-the-blank: o.ask is the blank being asked (-1 for all of them) and
  // o.hide hides it; the other blanks read as normal text.
  function view(md, o = {}) {
    let n = -1;
    const lines = parse(md, !!o.cloze), nums = numbered(lines);
    return lines.map((l, li) => {
      const items = [];
      for (const g of groups(l.runs)) {
        const inner = g.runs.flatMap(r => showRun({ t: r.t, m: r.m.replace('k', '') }, o));
        if (!g.blank) { items.push(...inner); continue; }
        n++;
        if (o.ask != null && o.ask >= 0 && o.ask !== n) { items.push(...inner); continue; }
        items.push({ plain: false, blank: true, t: '', css: '', runs: o.hide ? [{ plain: true, blank: false, t: '\u2003\u2003\u2003\u2003', css: '', runs: [] }] : inner });
      }
      if (!items.length) items.push({ plain: true, blank: false, t: '\u200b', css: '', runs: [] });
      return { css: lineCss(l.kind, nums[li]), items };
    });
  }
  // Lines for the editor: blanks as pills and math as its formula, so every letter can be edited.
  const editView = (md, o = {}) => { const lines = parse(md, !!o.cloze), nums = numbered(lines); return lines.map((l, li) => {
    const items = groups(l.runs).flatMap(g => (g.blank
      ? [{ plain: false, blank: true, t: '', css: '', edge: '1', runs: g.runs.map(r => ({ t: r.t, css: css(r.m.replace('k', ''), o, true) })) }]
      : g.runs.map(r => ({ plain: true, blank: false, t: r.t, css: css(r.m, o, true), edge: r.m.includes('m') ? '1' : '', runs: [] }))));
    return { css: lineCss(l.kind, nums[li]), items, empty: !items.length };
  }); };

  // ---------- editing ----------
  // A position counts characters, with one for each line break.
  const lineLen = l => l.runs.reduce((n, r) => n + r.t.length, 0);
  const size = lines => lines.reduce((n, l) => n + lineLen(l), 0) + lines.length - 1;
  const text = lines => lines.map(l => l.runs.map(r => r.t).join('')).join('\n');
  function at(lines, pos) {
    let i = 0;
    while (i < lines.length - 1 && pos > lineLen(lines[i])) { pos -= lineLen(lines[i]) + 1; i++; }
    return [i, Math.max(0, Math.min(pos, lineLen(lines[i])))];
  }
  const posOf = (lines, i, col) => lines.slice(0, i).reduce((n, l) => n + lineLen(l) + 1, 0) + col;
  const lineAt = (lines, pos) => lines[at(lines, pos)[0]];
  function cut(runs, col) {
    const a = [], b = [];
    let n = 0;
    for (const r of runs) {
      const L = r.t.length;
      if (n + L <= col) a.push(r);
      else if (n >= col) b.push(r);
      else { a.push({ t: r.t.slice(0, col - n), m: r.m }); b.push({ t: r.t.slice(col - n), m: r.m }); }
      n += L;
    }
    return [a, b];
  }
  function markAt(l, col) {
    let n = 0;
    for (const r of l.runs) { if (col < n + r.t.length) return r.m; n += r.t.length; }
    return null;
  }
  // Text to put in: one line per line break, all with the marks m. New lines take kind (bullets and numbers carry on; headings don't).
  const carry = kind => (kind === 'li' || kind === 'ol' ? kind : '');
  const frag = (t, m, kind) => String(t).split('\n').map((x, n) => ({ kind: n ? carry(kind) : undefined, runs: x ? [{ t: x, m: norm(m || '') }] : [] }));
  function replace(lines, a, b, part) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    const head = cut(lines[i].runs, c)[0], tail = cut(lines[j].runs, d)[1];
    const out = part.map((l, n) => ({ kind: n ? l.kind || '' : lines[i].kind, runs: n ? l.runs.slice() : [...head, ...l.runs] }));
    const last = out[out.length - 1];
    last.runs = [...last.runs, ...tail];
    out.forEach(l => { l.runs = tidy(l.runs); });
    return [...lines.slice(0, i), ...out, ...lines.slice(j + 1)];
  }
  function slice(lines, a, b) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    return lines.slice(i, j + 1).map((l, n) => {
      let runs = l.runs;
      if (n + i === j) runs = cut(runs, d)[0];
      if (n === 0) runs = cut(runs, c)[1];
      return { kind: l.kind, runs: tidy(runs) };
    });
  }
  function eachIn(lines, a, b, fn) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    return lines.map((l, n) => {
      if (n < i || n > j) return l;
      const s = n === i ? c : 0, e = n === j ? d : lineLen(l), [x, rest] = cut(l.runs, s), [y, z] = cut(rest, e - s);
      return { kind: l.kind, runs: tidy([...x, ...y.map(fn), ...z]) };
    });
  }
  const setMark = (lines, a, b, mark, on) => eachIn(lines, a, b, r => ({ t: r.t, m: norm(on ? r.m + mark : r.m.replace(mark, '')) }));
  // The marks every character in the range has.
  function marksIn(lines, a, b) {
    let common = null;
    eachIn(lines, a, b, r => { common = common == null ? r.m : [...common].filter(c => r.m.includes(c)).join(''); return r; });
    return common || '';
  }
  // The marks new letters get: the letter before's (blanks and math only carry on inside them).
  function typingMarks(lines, a, b) {
    const [i, c] = at(lines, a), l = lines[i];
    if (a !== b) return markAt(l, c) || '';
    const before = c > 0 ? markAt(l, c - 1) : null, after = markAt(l, c), base = before != null ? before : after || '';
    return [...base].filter(ch => !'km'.includes(ch) || ((before || '').includes(ch) && (after || '').includes(ch))).join('');
  }
  function wordAt(lines, pos) {
    const [i, c] = at(lines, pos), t = lines[i].runs.map(r => r.t).join('');
    if (!(c > 0 && c < t.length && WORD.test(t[c - 1]) && WORD.test(t[c]))) return null;
    let s = c, e = c;
    while (s > 0 && WORD.test(t[s - 1])) s--;
    while (e < t.length && WORD.test(t[e])) e++;
    const base = posOf(lines, i, 0);
    return [base + s, base + e];
  }
  const allKind = (lines, a, b, kind) => { const [i] = at(lines, a), [j] = at(lines, b); return lines.slice(i, j + 1).every(l => l.kind === kind); };
  const setKind = (lines, a, b, kind) => { const [i] = at(lines, a), [j] = at(lines, b); return lines.map((l, n) => (n >= i && n <= j ? { kind, runs: l.runs } : l)); };
  // Shortcuts like a notes app. At the start of a line: "# " heading (## and ### smaller), "- " bullet, "1. " numbers.
  const LINE_KEYS = [[/^#$/, 'h1'], [/^##$/, 'h2'], [/^###$/, 'h3'], [/^[-*+]$/, 'li'], [/^\d{1,3}[.)]$/, 'ol']];
  function lineRule(lines, caret) {
    const [i, c] = at(lines, caret), l = lines[i], t = l.runs.map(r => r.t).join('');
    if (t[c - 1] !== ' ') return { lines, caret };
    const hit = LINE_KEYS.find(([re]) => re.test(t.slice(0, c - 1)));
    if (!hit) return { lines, caret };
    const base = posOf(lines, i, 0), out = replace(lines, base, base + c, [{ runs: [] }]);
    out[i] = { kind: hit[1], runs: out[i].runs };
    return { lines: out, caret: caret - c };
  }
  // And as you type: **bold**, *italic* or _italic_, ~~strikethrough~~ or ~strikethrough~, ==highlight==, $math$.
  const INLINE_KEYS = [[/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, 'b', 2], [/(?:^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*$/, 'i', 1], [/(?:^|[^_\w])_([^_\s](?:[^_]*[^_\s])?)_$/, 'i', 1],
    [/~~([^~\s](?:[^~]*[^~\s])?)~~$/, 's', 2], [/(?:^|[^~])~([^~\s](?:[^~]*[^~\s])?)~$/, 's', 1], [/==([^=\s](?:[^=]*[^=\s])?)==$/, 'h', 2], [/(?:^|[^$\w\\])\$([^$\s](?:[^$]*[^$\s])?)\$$/, 'm', 1]];
  function inlineRule(lines, caret) {
    const [i, c] = at(lines, caret), l = lines[i], t = l.runs.map(r => r.t).join('').slice(0, c);
    for (const [re, mark, n] of INLINE_KEYS) {
      const hit = re.exec(t);
      if (!hit) continue;
      const w = hit[1].length, s = c - 2 * n - w;
      if ((markAt(l, s) || '').includes('m') || (markAt(l, c - 1) || '').includes('m')) continue;
      const base = posOf(lines, i, 0);
      let out = replace(lines, base + c - n, base + c, [{ runs: [] }]);
      out = replace(out, base + s, base + s + n, [{ runs: [] }]);
      return { lines: setMark(out, base + s, base + s + w, mark, true), caret: caret - 2 * n, done: mark };
    }
    return { lines, caret };
  }
  // On fill-in-the-blank cards, typing [[words]] makes a blank.
  function autoBlank(lines, caret) {
    for (let i = 0; i < lines.length; i++) {
      for (let guard = 0; guard < 20; guard++) {
        const l = lines[i], t = l.runs.map(r => r.t).join(''), m = /\[\[([^[\]]+?)\]\]/.exec(t);
        if (!m || (markAt(l, m.index) || '').includes('k')) break;
        const s = posOf(lines, i, m.index), e = s + m[0].length;
        lines = replace(lines, e - 2, e, [{ runs: [] }]);
        lines = replace(lines, s, s + 2, [{ runs: [] }]);
        lines = setMark(lines, s, e - 4, 'k', true);
        caret = caret >= e ? caret - 4 : caret > s ? Math.max(s, caret - 2) : caret;
      }
    }
    return { lines, caret };
  }
  // One letter before or after a position (whole emoji and accents), or the word next to it.
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
  function prevChar(t, pos) {
    if (pos <= 0) return 0;
    if (seg) { let last = 0; for (const x of seg.segment(t.slice(0, pos))) last = x.index; return last; }
    const lo = t.charCodeAt(pos - 1);
    return pos - (lo >= 0xdc00 && lo <= 0xdfff && pos > 1 ? 2 : 1);
  }
  function nextChar(t, pos) {
    if (pos >= t.length) return t.length;
    if (seg) { const it = seg.segment(t.slice(pos))[Symbol.iterator]().next(); return pos + (it.done ? 1 : it.value.segment.length); }
    const hi = t.charCodeAt(pos);
    return pos + (hi >= 0xd800 && hi <= 0xdbff ? 2 : 1);
  }
  function wordStart(t, pos) {
    let p = pos;
    while (p > 0 && t[p - 1] !== '\n' && WS.test(t[p - 1])) p--;
    if (p > 0 && WORD.test(t[p - 1])) { while (p > 0 && WORD.test(t[p - 1])) p--; } else if (p > 0) p--;
    return p;
  }
  function wordEnd(t, pos) {
    let p = pos;
    while (p < t.length && t[p] !== '\n' && WS.test(t[p])) p++;
    if (p < t.length && WORD.test(t[p])) { while (p < t.length && WORD.test(t[p])) p++; } else if (p < t.length) p++;
    return p;
  }

  // ---------- copy and paste ----------
  const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function toHtml(lines) {
    const WRAP = { b: 'b', i: 'i', u: 'u', s: 's', h: 'mark' };
    const run = r => {
      let h = escHtml(r.t);
      for (const m of [...r.m].reverse()) h = m === 'm' ? '<span data-sc="m">' + h + '</span>' : m === 'k' ? '<span data-sc="k">' + h + '</span>' : '<' + WRAP[m] + '>' + h + '</' + WRAP[m] + '>';
      return h;
    };
    let out = '', list = '';
    for (const l of lines) {
      const body = l.runs.map(run).join('') || '<br>', want = l.kind === 'li' ? 'ul' : l.kind === 'ol' ? 'ol' : '';
      if (list !== want) { out += (list ? '</' + list + '>' : '') + (want ? '<' + want + '>' : ''); list = want; }
      out += want ? '<li>' + body + '</li>' : /^h[123]$/.test(l.kind) ? '<' + l.kind + '>' + body + '</' + l.kind + '>' : '<div>' + body + '</div>';
    }
    return out + (list ? '</' + list + '>' : '');
  }
  // A background that marks words: not white, and not see-through (rgba with alpha 0).
  const isHl = c => !!c && !/transparent|inherit|initial|none/.test(c) && !/^(#fff(fff)?|white)$/i.test(c.trim()) && !/^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(c)
    && !/^rgba\([^,]+,[^,]+,[^,]+,\s*0(\.0+)?\s*\)$/.test(c.trim());
  // Pasted or imported HTML (web pages, Google Docs, Anki) turned into card text. Keeps the styles cards have.
  function fromHtml(html, cloze) {
    if (typeof DOMParser === 'undefined') return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const lines = [{ kind: '', runs: [] }];
    const cur = () => lines[lines.length - 1];
    const next = kind => { if (cur().runs.length) lines.push({ kind, runs: [] }); else cur().kind = kind; };
    const BLOCK = /^(P|DIV|H[1-6]|LI|UL|OL|BLOCKQUOTE|PRE|TR|TABLE|SECTION|ARTICLE|HEADER|FOOTER)$/;
    const kindOf = node => (node.tagName === 'LI' ? (node.parentElement && node.parentElement.tagName === 'OL' ? 'ol' : 'li') : /^H[123]$/.test(node.tagName) ? node.tagName.toLowerCase() : '');
    const walk = (node, m) => {
      if (node.nodeType === 3) { const t = node.nodeValue.replace(/\s+/g, ' '); if (t) cur().runs.push({ t, m: norm(m) }); return; }
      if (node.nodeType !== 1 || /^(SCRIPT|STYLE|HEAD|TITLE|META|TEMPLATE)$/.test(node.tagName)) return;
      const tag = node.tagName, st = node.style || {}, fw = st.fontWeight || '';
      if (tag === 'BR') { lines.push({ kind: '', runs: [] }); return; }
      let mm = m;
      if (fw) mm = fw === 'bold' || fw === 'bolder' || +fw >= 600 ? mm + 'b' : mm.replace('b', '');
      else if (/^(B|STRONG)$/.test(tag)) mm += 'b';
      if (st.fontStyle) mm = st.fontStyle === 'italic' || st.fontStyle === 'oblique' ? mm + 'i' : mm.replace('i', '');
      else if (/^(I|EM)$/.test(tag)) mm += 'i';
      const dec = (st.textDecoration || '') + ' ' + (st.textDecorationLine || '');
      if (tag === 'U' || /underline/.test(dec)) mm += 'u';
      if (/^(S|DEL|STRIKE)$/.test(tag) || /line-through/.test(dec)) mm += 's';
      if (tag === 'MARK' || (tag !== 'BODY' && !BLOCK.test(tag) && isHl(st.backgroundColor))) mm += 'h';
      const sc = node.getAttribute('data-sc');
      if (sc === 'm') mm += 'm';
      if (sc === 'k' && cloze) mm += 'k';
      const block = BLOCK.test(tag);
      if (block) next(kindOf(node));
      node.childNodes.forEach(ch => walk(ch, mm));
      if (block) next('');
    };
    walk(doc.body, '');
    // Spaces at the edges of lines go, and so do empty lines at the start and end.
    for (const l of lines) {
      l.runs = tidy(l.runs);
      if (l.runs[0]) l.runs[0].t = l.runs[0].t.replace(/^\s+/, '');
      const z = l.runs[l.runs.length - 1];
      if (z) z.t = z.t.replace(/\s+$/, '');
      l.runs = tidy(l.runs);
    }
    while (lines.length > 1 && !lines[0].runs.length) lines.shift();
    while (lines.length > 1 && !lines[lines.length - 1].runs.length) lines.pop();
    return write(lines, cloze);
  }
  const looksHtml = s => /<\/?(b|strong|i|em|u|s|del|strike|mark|br|div|p|span|ul|ol|li|sub|sup|font)\b[^>]*>|&(nbsp|amp|lt|gt|quot|#\d+);/i.test(String(s || ''));

  // ---------- the editor's DOM ----------
  // The editor draws each line as a <div> of spans (an empty line holds a <br>). Pills and math are marked data-edge="1".
  function domPos(root, node, off) {
    const lines = [...root.children];
    if (node === root) {
      let n = 0;
      for (let i = 0; i < Math.min(off, lines.length); i++) n += lines[i].textContent.length + 1;
      return Math.max(0, off >= lines.length ? n - 1 : n);
    }
    let ln = node;
    while (ln && ln.parentNode !== root) ln = ln.parentNode;
    if (!ln) return 0;
    let n = 0;
    for (const l of lines) { if (l === ln) break; n += l.textContent.length + 1; }
    const r = document.createRange();
    try { r.setStart(ln, 0); r.setEnd(node, off); } catch (e) { return n; }
    return n + r.toString().length;
  }
  function inLine(ln, col) {
    const ts = [], w = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) ts.push(t);
    if (!ts.length) return [ln, 0];
    const edge = t => t.parentElement && t.parentElement.closest('[data-edge="1"]');
    const spot = (e, d) => [e.parentNode, [...e.parentNode.childNodes].indexOf(e) + d];
    for (let n = 0; n < ts.length; n++) {
      const t = ts[n], L = t.nodeValue.length, e = edge(t);
      if (n === 0 && col === 0 && e) return spot(e, 0);
      if (col < L) return [t, col];
      if (col === L) return !e || (ts[n + 1] && edge(ts[n + 1]) === e) ? [t, L] : spot(e, 1);
      col -= L;
    }
    const t = ts[ts.length - 1];
    return [t, t.nodeValue.length];
  }
  function point(root, pos) {
    const lines = [...root.children];
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i].textContent.length;
      if (pos <= L || i === lines.length - 1) return inLine(lines[i], Math.max(0, Math.min(pos, L)));
      pos -= L + 1;
    }
    return [root, 0];
  }
  function setSel(root, a, b) {
    const s = document.getSelection(), [n1, o1] = point(root, a), [n2, o2] = point(root, b == null ? a : b);
    try { s.setBaseAndExtent(n1, o1, n2, o2); } catch (e) { /* the field was redrawn meanwhile */ }
  }

  return { parse, write, plain, mathText, blanks, plainLines, view, editView, groups, lineLen, size, text, at, posOf, lineAt, frag, carry, replace, slice, setMark, marksIn,
    typingMarks, wordAt, allKind, setKind, lineRule, inlineRule, autoBlank, prevChar, nextChar, wordStart, wordEnd, toHtml, fromHtml, looksHtml, domPos, pointAt: point, setSel };
})()); }

constructor(props) {
  super(props);
  this.state = { typing: !!props.keyboard, focus: 'front', styles: !!props.textStyles, occ: 'one' };
  // The card as you write it: its fields, its type, where the caret is, and what Undo steps back to.
  // It lives outside state so fast typing never builds on an old copy.
  this.ed = { edits: {}, type: null, sel: null, pend: null, past: [], future: [], last: '', lastAt: 0, key: 0, restore: false, sig: '' };
  this.els = {};
  this.refFns = {};
}
componentDidMount() { this.placeCaret(); this.placeSlash(); }
componentDidUpdate() { this.placeCaret(); this.placeSlash(); }
componentWillUnmount() { if (this.onSel) document.removeEventListener('selectionchange', this.onSel); }
// A saved card opens with what it says; a new one starts empty in the app (the canvas shows a sample).
doc() {
  const db = this.props.db || this.mock(), e = this.ed;
  const saved = this.props.cardId ? db.card(this.props.cardId) : null;
  const names = { basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' };
  const ty = e.type || (saved ? names[saved.kind] : ({ Blank: 'Blank', Image: 'Image', Audio: 'Audio' })[this.props.cardType] || 'Basic');
  return { db, saved, ty, f: { ...(saved || db.draft(ty)), ...e.edits } };
}
isCloze(k) { return k === 'text' && this.doc().ty === 'Blank'; }
lines(k) { return this.rich().parse(this.doc().f[k] || '', this.isCloze(k)); }
firstField(ty) { return { Basic: 'front', Blank: 'text', Image: 'front', Audio: 'back' }[ty]; }
live(k) { const el = this.els[k]; return !!el && el.isConnected && el.getAttribute('data-rk') === k; }
// Every change goes through here, so Undo can step back through it. Typing in a row is one step.
commit(patch, o) {
  o = o || {};
  const e = this.ed, now = Date.now(), again = /^(type|del):/.test(o.kind || '') && o.kind === e.last && now - e.lastAt < 1000;
  if (!again) { e.past.push({ edits: e.edits, type: e.type, sel: e.sel }); if (e.past.length > 100) e.past.shift(); e.future = []; }
  e.last = o.kind || '';
  e.lastAt = now;
  e.edits = { ...e.edits, ...patch };
  if (o.type) e.type = o.type;
  if (o.sel) { e.sel = o.sel; e.restore = true; }
  e.pend = o.pend || null;
  this.forceUpdate();
}
step(from, to) {
  const e = this.ed;
  if (!from.length) return;
  to.push({ edits: e.edits, type: e.type, sel: e.sel });
  const p = from.pop();
  e.edits = p.edits; e.type = p.type; e.sel = p.sel; e.restore = !!p.sel; e.pend = null; e.last = '';
  this.forceUpdate();
}
undo() { this.step(this.ed.past, this.ed.future); }
redo() { this.step(this.ed.future, this.ed.past); }
// The selection in field k: the one about to be drawn, else the browser's.
selIn(k) {
  const e = this.ed, el = this.els[k], R = this.rich();
  if (e.restore && e.sel && e.sel.k === k) return e.sel;
  const s = document.getSelection();
  if (this.live(k) && s && s.rangeCount && el.contains(s.anchorNode)) {
    const a = R.domPos(el, s.anchorNode, s.anchorOffset), b = R.domPos(el, s.focusNode, s.focusOffset);
    return { k, a: Math.min(a, b), b: Math.max(a, b) };
  }
  if (e.sel && e.sel.k === k) return e.sel;
  const n = R.size(this.lines(k));
  return { k, a: n, b: n };
}
// After a change is drawn, put the caret back where it belongs.
placeCaret() {
  const e = this.ed;
  if (!e.restore || !e.sel || !this.live(e.sel.k)) return;
  e.restore = false;
  const el = this.els[e.sel.k];
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  this.rich().setSel(el, e.sel.a, e.sel.b);
}
focusField(k) {
  const n = this.rich().size(this.lines(k));
  this.ed.sel = { k, a: n, b: n };
  this.ed.restore = true;
  this.setState({ typing: true, focus: k, speakOpen: this.state.speakOpen || k === 'speak' });
}
// Each field is drawn from the card's text; the browser never edits it on its own.
refFor(k) {
  return this.refFns[k] || (this.refFns[k] = el => {
    if (!el) return;
    this.els[k] = el;
    if (el.__sc) return;
    el.__sc = true;
    const key = () => el.getAttribute('data-rk');
    el.addEventListener('beforeinput', ev => this.onEdit(ev, key()));
    el.addEventListener('keydown', ev => this.onKey(ev, key()));
    el.addEventListener('compositionstart', () => this.onCompose(key(), true));
    el.addEventListener('compositionend', ev => this.onCompose(key(), false, ev.data));
    el.addEventListener('copy', ev => this.onCopy(ev, key(), false));
    el.addEventListener('cut', ev => this.onCopy(ev, key(), true));
    el.addEventListener('focus', () => this.onFocus(key(), true));
    el.addEventListener('blur', () => this.onFocus(key(), false));
    el.addEventListener('dragstart', ev => ev.preventDefault());
    el.addEventListener('drop', ev => ev.preventDefault());
    if (!this.onSel) { this.onSel = () => this.trackSel(); document.addEventListener('selectionchange', this.onSel); }
  });
}
onFocus(k, on) {
  if (!on && this.ed.slash) { this.ed.slash = null; this.forceUpdate(); }
  if (on) { if (!this.state.typing || this.state.focus !== k) this.setState({ typing: true, focus: k }); }
  else if (this.props.keyboard === undefined && this.state.typing) this.setState({ typing: false });
}
// The formatting buttons follow the caret.
trackSel() {
  const e = this.ed, s = document.getSelection(), els = Object.values(this.els).filter(x => x && x.isConnected);
  if (!els.length) { document.removeEventListener('selectionchange', this.onSel); this.onSel = null; return; }
  if (e.restore || !s || !s.rangeCount) return;
  const el = els.find(x => x.contains(s.anchorNode));
  if (!el || el.hasAttribute('data-composing')) return;
  const R = this.rich(), k = el.getAttribute('data-rk'), a = R.domPos(el, s.anchorNode, s.anchorOffset), b = R.domPos(el, s.focusNode, s.focusOffset);
  const sel = { k, a: Math.min(a, b), b: Math.max(a, b) }, o = e.sel;
  if (!o || o.k !== k || o.a !== sel.a || o.b !== sel.b) {
    e.sel = sel;
    if (e.pend && (e.pend.k !== k || e.pend.at !== sel.a || sel.a !== sel.b)) e.pend = null;
  }
  const sig = JSON.stringify(this.pressed()) + (e.slash && this.slashView() ? '/' : '');
  if (sig !== e.sig) { e.sig = sig; this.forceUpdate(); }
}
// Which buttons show as on: the look of what's selected, or of what you'd type next.
pressed() {
  const e = this.ed, s = e.sel;
  if (!s || !this.live(s.k)) return {};
  const R = this.rich(), L = this.lines(s.k);
  const m = e.pend && e.pend.k === s.k && e.pend.at === s.a && s.a === s.b ? e.pend.m : s.a === s.b ? R.typingMarks(L, s.a, s.a) : R.marksIn(L, s.a, s.b);
  const on = {};
  for (const c of m) on[c] = true;
  if (R.allKind(L, s.a, s.b, 'li')) on.list = true;
  return on;
}
// Keys like a notes app: ⌘B bold, ⌘I italic, ⌘U underline, ⌘⇧S strikethrough, ⌘⇧H highlight, ⌘⇧E math,
// ⌘⌥1–3 headings, ⌘⌥0 plain text, ⌘⌥5 bullets, ⌘⌥6 numbers (⌘⇧8 and ⌘⇧7 too), ⌘Z undo, ⌘⇧Z redo.
onKey(ev, k) {
  const mod = ev.metaKey || ev.ctrlKey, key = (ev.key || '').toLowerCase(), code = ev.code || '';
  // The / menu: ↑ ↓ move, Return or Tab picks, Esc closes.
  const menu = this.ed.slash && !mod && !ev.isComposing ? this.slashView() : null;
  if (menu && /^(arrowdown|arrowup|enter|tab|escape)$/.test(key)) {
    ev.preventDefault();
    const sl = this.ed.slash, n = menu.items.length;
    if (key === 'escape') { this.ed.slash = null; return this.forceUpdate(); }
    if (key === 'enter' || key === 'tab') return this.slashPick(menu.items[sl.idx].id);
    sl.idx = (sl.idx + (key === 'arrowdown' ? 1 : n - 1)) % n;
    sl.scroll = true;
    return this.forceUpdate();
  }
  if (!mod) return;
  const line = ev.altKey ? { Digit0: '', Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit5: 'li', Digit6: 'ol' }[code] : ev.shiftKey ? { Digit8: 'li', Digit7: 'ol' }[code] : undefined;
  if (line !== undefined) { ev.preventDefault(); return this.lineKind(line); }
  if (ev.altKey) return;
  if (key === 'z') { ev.preventDefault(); return ev.shiftKey ? this.redo() : this.undo(); }
  if (key === 'y') { ev.preventDefault(); return this.redo(); }
  const m = ev.shiftKey ? { s: 's', x: 's', h: 'h', e: 'm' }[key] : { b: 'b', i: 'i', u: 'u' }[key];
  if (m) { ev.preventDefault(); this.fmt(m); }
}
onEdit(ev, k) {
  const ty = ev.inputType || '';
  // An input method (Japanese, Chinese, accents) is still typing: read what it wrote when it's done.
  if (ev.isComposing || ty === 'insertCompositionText') return;
  ev.preventDefault();
  if (ty === 'historyUndo') return this.undo();
  if (ty === 'historyRedo') return this.redo();
  const F = { formatBold: 'b', formatItalic: 'i', formatUnderline: 'u', formatStrikeThrough: 's' }[ty];
  if (F) return this.fmt(F);
  if (/Composition$|ByDrag$|ByCut$/.test(ty)) return;
  const R = this.rich(), L = this.lines(k), s = this.selIn(k);
  let a = s.a, b = s.b;
  const exact = !this.ed.restore && ev.getTargetRanges ? ev.getTargetRanges() : [];
  if (exact.length && (ty.startsWith('delete') || ty === 'insertReplacementText')) {
    const r = exact[0], el = this.els[k], x = R.domPos(el, r.startContainer, r.startOffset), y = R.domPos(el, r.endContainer, r.endOffset);
    a = Math.min(x, y); b = Math.max(x, y);
  }
  const dt = ev.dataTransfer;
  if (ty === 'insertText' || ty === 'insertReplacementText') return this.typeIn(k, L, a, b, ev.data != null ? ev.data : dt ? dt.getData('text/plain') : '');
  if (ty === 'insertParagraph' || ty === 'insertLineBreak') return this.enter(k, L, a, b);
  if (ty.startsWith('insertFrom')) return this.paste(k, L, a, b, dt);
  if (ty.startsWith('delete')) return this.erase(k, L, s, a, b, ty, exact.length > 0);
}
typeIn(k, L, a, b, text) {
  if (!text) return;
  const R = this.rich(), e = this.ed, cloze = this.isCloze(k);
  const m = e.pend && e.pend.k === k && e.pend.at === a && a === b ? e.pend.m : R.typingMarks(L, a, b);
  let lines = R.replace(L, a, b, R.frag(text, m, R.lineAt(L, a).kind)), caret = a + text.length;
  // Shortcuts as you type: "# " makes a heading, "- " a bullet, "1. " a number; **bold**, ==highlight== and the rest finish a style.
  ({ lines, caret } = R.lineRule(lines, caret));
  const fin = R.inlineRule(lines, caret);
  ({ lines, caret } = fin);
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  // A finished style stops there; a blank or math you're typing into carries on with the next letter (until you move the caret).
  const pend = fin.done ? { k, at: caret, m: R.typingMarks(lines, caret, caret).replace(fin.done, '') } : /[km]/.test(m) ? { k, at: caret, m } : null;
  // A / at the start of a line or after a space opens the / menu (not inside math, like a/b). Web only: the iPhone editor has none.
  const before = R.text(L).slice(0, a);
  if (text === '/' && this.props.keyboard === undefined && !m.includes('m') && (!before || /\s$/.test(before))) e.slash = { k, at: a, idx: 0, q: '', pos: null };
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'type:' + k, sel: { k, a: caret, b: caret }, pend });
}
// What the / menu offers, and the words that find each thing.
slashItems() {
  return [
    { id: 'text', label: 'Text', hint: '', g: 'Aa', keys: ['text', 'plain', 'paragraph', 'normal'] },
    { id: 'h1', label: 'Heading 1', hint: '#', g: 'H1', keys: ['h1', 'heading', 'title', 'big'] },
    { id: 'h2', label: 'Heading 2', hint: '##', g: 'H2', keys: ['h2', 'heading', 'subheading'] },
    { id: 'h3', label: 'Heading 3', hint: '###', g: 'H3', keys: ['h3', 'heading', 'small'] },
    { id: 'li', label: 'Bulleted list', hint: '-', icon: 'list', keys: ['bullet', 'list', 'ul', 'unordered', 'points'] },
    { id: 'ol', label: 'Numbered list', hint: '1.', g: '1.', keys: ['numbered', 'number', 'list', 'ol', 'ordered', 'steps'] },
    { id: 'k', label: 'Blank', hint: '[[ ]]', icon: 'bracket', keys: ['blank', 'cloze', 'fill', 'hide', 'gap'] },
    { id: 'm', label: 'Math', hint: '$ $', icon: 'sqrt', keys: ['math', 'equation', 'formula', 'latex', 'tex'] },
    { id: 'image', label: 'Image', hint: '', icon: 'image', keys: ['image', 'picture', 'photo', 'diagram', 'img'] },
    { id: 'audio', label: 'Audio', hint: '', icon: 'mic', keys: ['audio', 'sound', 'record', 'voice', 'mic'] }
  ];
}
// The open / menu: what you've typed after the / and what matches it. Moving away or no matches closes it.
slashView() {
  const e = this.ed, sl = e.slash, sel = e.sel;
  if (!sl) return null;
  const t = this.rich().text(this.lines(sl.k)), q = sel && sel.k === sl.k && sel.a === sel.b && sel.a > sl.at ? t.slice(sl.at + 1, sel.a) : null;
  const items = q == null || t[sl.at] !== '/' || /\n|^\s/.test(q) || q.length > 24 ? [] : this.slashItems().filter(it => { const w = q.trim().toLowerCase(); return !w || it.label.toLowerCase().includes(w) || it.keys.some(x => x.startsWith(w)); });
  if (!items.length) { e.slash = null; return null; }
  sl.q = q;
  sl.idx = Math.min(sl.idx, items.length - 1);
  return { items };
}
// Put the menu just under the / (above it when there's no room), inside the editor's panel.
placeSlash() {
  const e = this.ed, sl = e.slash;
  if (!sl || !this.live(sl.k)) return;
  const menu = this.els[sl.k].offsetParent && this.els[sl.k].offsetParent.querySelector('[data-slash="1"]');
  if (sl.scroll && menu) { sl.scroll = false; const on = menu.querySelector('[aria-selected="true"]'); if (on) on.scrollIntoView({ block: 'nearest' }); }
  if (sl.pos && !sl.demo) return;
  const el = this.els[sl.k], host = el.offsetParent, R = this.rich();
  if (!host || !this.slashView()) return;
  const [n1, o1] = R.pointAt(el, sl.at), [n2, o2] = R.pointAt(el, sl.at + 1), r = document.createRange();
  try { r.setStart(n1, o1); r.setEnd(n2, o2); } catch (err) { return; }
  const box = r.getBoundingClientRect(), hb = host.getBoundingClientRect(), z = hb.width / (host.offsetWidth || hb.width) || 1;
  const w = 248, h = menu ? menu.offsetHeight : 300, left = (box.left - hb.left) / z, top = (box.top - hb.top) / z, bottom = (box.bottom - hb.top) / z;
  const x = Math.round(Math.max(12, Math.min(left - 10, host.offsetWidth - w - 12)));
  const y = Math.round(bottom + 8 + h > host.offsetHeight - 12 && top - 8 - h > 12 ? top - 8 - h : bottom + 8);
  const pos = { x: x + 'px', y: y + 'px' };
  if (sl.pos && sl.pos.x === pos.x && sl.pos.y === pos.y) return;
  sl.pos = pos;
  sl.demo = false;
  this.forceUpdate();
}
// Picking from the / menu takes the "/..." away, then does the thing where it was.
slashPick(id) {
  const e = this.ed, sl = e.slash;
  if (!sl || !this.slashView()) return;
  const R = this.rich(), k = sl.k, cloze = this.isCloze(k), a = sl.at;
  let lines = R.replace(this.lines(k), a, a + 1 + sl.q.length, [{ runs: [] }]);
  e.slash = null;
  const at = { k, a, b: a };
  if (['text', 'h1', 'h2', 'h3', 'li', 'ol'].includes(id)) return this.commit({ [k]: R.write(R.setKind(lines, a, a, id === 'text' ? '' : id), cloze) }, { kind: 'fmt', sel: at });
  if (id === 'm' || (id === 'k' && cloze)) return this.commit({ [k]: R.write(lines, cloze) }, { kind: 'fmt', sel: at, pend: { k, at: a, m: R.typingMarks(lines, a, a) + id } });
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'fmt', sel: at });
  if (id === 'k') { this.toBlank(); if (this.ed.sel && this.ed.sel.k === 'text' && this.ed.sel.a === this.ed.sel.b) this.ed.pend = { k: 'text', at: this.ed.sel.a, m: 'k' }; return; }
  this.media(id === 'image' ? 'image' : 'audio');
}
// Return makes a new line: a new bullet or number in a list, plain text after a heading. On an empty bullet it ends the list.
enter(k, L, a, b) {
  const R = this.rich(), cloze = this.isCloze(k), l = R.lineAt(L, a);
  if (a === b && R.carry(l.kind) && !R.lineLen(l)) return this.commit({ [k]: R.write(R.setKind(L, a, a, ''), cloze) }, { kind: 'line', sel: { k, a, b: a } });
  const m = R.typingMarks(L, a, b).replace(/[km]/g, '');
  this.commit({ [k]: R.write(R.replace(L, a, b, [{ runs: [] }, { kind: R.carry(l.kind), runs: [] }]), cloze) }, { kind: 'line', sel: { k, a: a + 1, b: a + 1 }, pend: m ? { k, at: a + 1, m } : null });
}
erase(k, L, s, a, b, ty, exact) {
  const R = this.rich(), cloze = this.isCloze(k), back = /Backward/.test(ty), [i, c] = R.at(L, s.a);
  // Backspace at the start of a heading, bullet, or number turns the line back into text first.
  if (back && s.a === s.b && c === 0 && L[i].kind) return this.commit({ [k]: R.write(R.setKind(L, s.a, s.a, ''), cloze) }, { kind: 'line', sel: { k, a: s.a, b: s.a } });
  if (!exact && a === b) {
    const t = R.text(L), [n, col] = R.at(L, a), end = R.lineLen(L[n]);
    if (back) a = /Word/.test(ty) ? R.wordStart(t, a) : /Line/.test(ty) ? a - col : R.prevChar(t, a);
    else b = /Word/.test(ty) ? R.wordEnd(t, b) : /Line/.test(ty) ? b + end - col : R.nextChar(t, b);
  }
  if (a === b) return;
  this.commit({ [k]: R.write(R.replace(L, a, b, [{ runs: [] }]), cloze) }, { kind: 'del:' + k, sel: { k, a, b: a } });
}
// Pasting keeps bold, italic, and the rest (from a web page, a doc, or another card); plain text takes the look around it.
paste(k, L, a, b, dt) {
  if (!dt) return;
  const R = this.rich(), cloze = this.isCloze(k), html = dt.getData('text/html'), txt = dt.getData('text/plain');
  const md = html ? R.fromHtml(html, cloze) : '';
  const part = md ? R.parse(md, cloze) : txt ? R.frag(txt.replace(/\r\n?/g, '\n'), R.typingMarks(L, a, b), R.lineAt(L, a).kind) : null;
  if (!part) return;
  let lines = R.replace(L, a, b, part), caret = a + R.size(part);
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'paste', sel: { k, a: caret, b: caret } });
}
onCopy(ev, k, cut) {
  const R = this.rich(), s = this.selIn(k);
  if (s.a === s.b || !ev.clipboardData) return;
  ev.preventDefault();
  const L = this.lines(k), part = R.slice(L, s.a, s.b);
  ev.clipboardData.setData('text/plain', R.plainLines(part));
  ev.clipboardData.setData('text/html', R.toHtml(part));
  if (cut) this.commit({ [k]: R.write(R.replace(L, s.a, s.b, [{ runs: [] }]), this.isCloze(k)) }, { kind: 'cut', sel: { k, a: s.a, b: s.a } });
}
onCompose(k, start, data) {
  const e = this.ed, el = this.els[k];
  if (start) { e.comp = this.selIn(k); if (el) el.setAttribute('data-composing', '1'); return; }
  if (el) el.removeAttribute('data-composing');
  const s = e.comp || this.selIn(k), R = this.rich(), L = this.lines(k), cloze = this.isCloze(k);
  e.comp = null;
  e.key++; // the input method wrote into the field itself, so draw the field afresh
  if (!data) { e.sel = { k, a: s.a, b: s.b }; e.restore = true; return this.forceUpdate(); }
  const m = e.pend && e.pend.k === k && e.pend.at === s.a && s.a === s.b ? e.pend.m : R.typingMarks(L, s.a, s.b);
  let lines = R.replace(L, s.a, s.b, R.frag(data, m, R.lineAt(L, s.a).kind)), caret = s.a + data.length;
  if (cloze) ({ lines, caret } = R.autoBlank(lines, caret));
  this.commit({ [k]: R.write(lines, cloze) }, { kind: 'type:' + k, sel: { k, a: caret, b: caret }, pend: /[km]/.test(m) ? { k, at: caret, m } : null });
}
// Bold, italic, underline, strikethrough, highlight, math, and blanks. With nothing selected it styles the word
// under the caret, or the next letters you type.
fmt(mark) {
  const e = this.ed, d = this.doc(), R = this.rich();
  if (mark === 'k' && d.ty !== 'Blank') return this.toBlank();
  const k = e.sel && this.live(e.sel.k) ? e.sel.k : this.firstField(d.ty);
  if (mark === 'k' && k !== 'text') return;
  const cloze = this.isCloze(k), L = this.lines(k), s = this.selIn(k);
  if (mark === 'list') return this.lineKind('li');
  let a = s.a, b = s.b;
  if (a === b) { const w = R.wordAt(L, a); if (w) [a, b] = w; }
  if (a === b) {
    const cur = e.pend && e.pend.k === k && e.pend.at === a ? e.pend.m : R.typingMarks(L, a, a);
    e.pend = { k, at: a, m: cur.includes(mark) ? cur.replace(mark, '') : cur + mark };
    e.sel = { k, a, b: a };
    e.restore = true;
    e.sig = '';
    return this.forceUpdate();
  }
  this.commit({ [k]: R.write(R.setMark(L, a, b, mark, !R.marksIn(L, a, b).includes(mark)), cloze) }, { kind: 'fmt', sel: s });
}
// Headings, bullets, and numbers for the lines you're on. Asking again turns them back into text.
lineKind(kind) {
  const e = this.ed, d = this.doc(), R = this.rich();
  const k = e.sel && this.live(e.sel.k) ? e.sel.k : this.firstField(d.ty), L = this.lines(k), s = this.selIn(k);
  this.commit({ [k]: R.write(R.setKind(L, s.a, s.b, kind && R.allKind(L, s.a, s.b, kind) ? '' : kind), this.isCloze(k)) }, { kind: 'fmt', sel: s });
}
// Make a blank on another kind of card turns it into a fill-in-the-blank card, with what you picked hidden.
toBlank() {
  const e = this.ed, d = this.doc(), R = this.rich();
  const src = e.sel && ['front', 'back', 'speak'].includes(e.sel.k) && this.live(e.sel.k) ? e.sel.k : 'front';
  const L = R.parse(d.f[src] || '', false), s = this.selIn(src);
  let a = s.a, b = s.b;
  if (a === b) { const w = R.wordAt(L, a); if (w) [a, b] = w; }
  const other = src === 'back' ? d.f.front : d.f.back, patch = { text: R.write(a < b ? R.setMark(L, a, b, 'k', true) : L, true) };
  if (R.plain(other || '').trim() && !R.plain(d.f.note || '').trim()) patch.note = other;
  this.commit(patch, { type: 'Blank', kind: 'fmt', sel: { k: 'text', a, b } });
}
// Add image and Add audio switch the card to that kind (and pick the image, or record).
media(kind) {
  const d = this.doc();
  if (kind === 'image') {
    if (d.ty !== 'Image') this.commit({}, { type: 'Image', kind: 'kind' });
    if (d.ty === 'Image' || !this.doc().f.image) this.pickImage();
    return;
  }
  if (d.ty !== 'Audio') return this.commit({}, { type: 'Audio', kind: 'kind' });
  this.toggleRecord();
}
pickImage() { (this.props.db || this.mock()).act.pickFile('image').then(url => url && this.commit({ image: url })); }
toggleRecord() {
  const db = this.props.db || this.mock();
  if (this.state.recording) { this.setState({ recording: false }); db.act.record(); return; }
  this.setState({ recording: true });
  db.act.record().then(url => { this.setState({ recording: false }); if (url) this.commit({ audio: url }); });
}
renderVals() {
  const t = this.theme(!!this.props.dark);const db = this.props.db || this.mock(); const chrome = db.chrome();
  const kb = this.props.dark
    ? { panel: '#2A2A2D', key: '#48484C', ink: '#FFFFFF', edge: '0 1px 0 rgba(0,0,0,.35)', bar: '#2C2C2F', barInk: '#EBEBF0', barLine: 'rgba(255,255,255,.14)', on: '#45454A', barShadow: '0 8px 28px rgba(0,0,0,.5), 0 0 0 .5px rgba(255,255,255,.1)' }
    : { panel: '#E3E4E9', key: '#FFFFFF', ink: '#000000', edge: '0 1px 0 rgba(0,0,0,.08)', bar: '#FFFFFF', barInk: '#3C3C43', barLine: 'rgba(60,60,67,.16)', on: '#ECECF1', barShadow: '0 8px 28px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.06)' };
  const sw = (on, enabled = true) => ({ checked: on ? 'true' : 'false', track: on ? t.inv : t.surf2, knob: on ? 'translateX(20px)' : 'translateX(0)', knobColor: on ? t.invText : t.bg, op: enabled ? '1' : '.4', disabled: enabled ? 'false' : 'true' });
  const tagC = { Biology: '#30A46C', Chemistry: '#F76B15', Languages: '#3E63DD', MCAT: '#8E4EC6', History: '#AD7F58', 'Computer science': '#12A594', Exam: '#E5484D', 'Year 1': '#0090FF',
    Energy: '#D6409F', Organelles: '#12A594', 'Exam 1': '#E5484D', 'Exam 2': '#F76B15', Diagrams: '#3E63DD', Proteins: '#8E4EC6', Pronunciation: '#0090FF', Cells: '#3E63DD',
    'BIO 201': '#05A2C2', 'Fall 2026': '#AD7F58', Midterm: '#F76B15', 'Final exam': '#E5484D', 'Pre-med': '#E93D82', Lab: '#12A594', 'Must know': '#AB4ABA', Mitochondria: '#30A46C', Tricky: '#F76B15' };
  const tagPal = ['#30A46C', '#F76B15', '#3E63DD', '#8E4EC6', '#AD7F58', '#12A594', '#E5484D', '#0090FF', '#D6409F', '#05A2C2'];
  const tagCol = g => tagC[g] || tagPal[Array.from(g).reduce((a, ch) => a + ch.charCodeAt(0), 0) % tagPal.length];
  const tagChip = g => ({ label: g, dot: tagCol(g), bg: tagCol(g) + '26', fg: tagCol(g) });
  // More tags than room: show the first few, then a +N chip in the last slot (so never "+1").
  const tagFit = (tags, max) => { const tg = tags || [], vis = tg.length > max ? tg.slice(0, max - 1) : tg; return { vis, more: tg.length - vis.length }; };
  // Add tag: find any tag you have, tick it on or off, or make a new one.
  const tagPicker = (cur, set, key, own) => {
    const st = this.state, open = st[key + 'Open'] == null ? !!this.props.tagPicker : st[key + 'Open'];
    const q = (st[key + 'Q'] || '').trim(), ql = q.toLowerCase();
    const lib = Array.from(new Set([...(own || Object.keys(tagC)), ...cur])).sort((a, b) => a.localeCompare(b));
    const shown = lib.filter(g => !ql || g.toLowerCase().includes(ql));
    return {
      open, expanded: open ? 'true' : 'false', query: q, count: String(cur.length),
      toggle: () => this.setState({ [key + 'Open']: !open, [key + 'Q']: '' }), close: () => this.setState({ [key + 'Open']: false, [key + 'Q']: '' }),
      setQuery: e => this.setState({ [key + 'Q']: e && e.target ? e.target.value : '' }),
      options: shown.map(g => ({ ...tagChip(g), on: cur.includes(g), pressed: cur.includes(g) ? 'true' : 'false', pick: () => set(cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]) })),
      canMake: !!q && !lib.some(g => g.toLowerCase() === ql), makeLabel: 'Make “' + q + '”',
      make: () => { set([...cur, q]); this.setState({ [key + 'Q']: '' }); }
    };
  };
  const s = this.state, e = this.ed, R = this.rich();
  // The canvas's / menu board: the menu open on a new line of the sample card.
  if (this.props.slashDemo && !e.demoDone) {
    e.demoDone = true;
    const front = String(this.doc().f.front || '') + '\n/', at = R.size(R.parse(front)) - 1;
    e.edits = { ...e.edits, front };
    e.sel = { k: 'front', a: at + 1, b: at + 1 };
    e.slash = { k: 'front', at, idx: 0, q: '', pos: { x: '34px', y: '329px' }, demo: true };
  }
  const { saved, ty, f } = this.doc();
  const kinds = { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' };
  const put = patch => this.commit(patch);
  const dk = db.deck(this.props.deckId), tags = f.tags || [];
  const pick2 = (list, cur, set) => list.map(([id, label]) => ({ label, pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => set(id) }));
  // Each field, drawn with its formatting. The ring shows which one you're typing in.
  const ro = { t, dark: !!this.props.dark };
  const field = (k, cloze) => ({ lines: R.editView(f[k] || '', { ...ro, cloze }), empty: String(f[k] || '') === '' ? 'true' : 'false', ref: this.refFor(k), key: k + e.key,
    ring: s.typing && s.focus === k ? 'inset 0 0 0 2px ' + t.text : 'none' });
  const rich = { front: field('front'), back: field('back'), text: field('text', ty === 'Blank'), note: field('note'), speak: field('speak') };
  const nBlanks = R.blanks(f.text || '').length;
  const kind = kinds[ty], fr = R.plain(f.front || '').trim(), bk = R.plain(f.back || '').trim(), said = R.plain(f.speak || '').trim();
  const hasSound = (f.audio && f.audio !== 'mock') || said;
  const missing = kind === 'basic' ? (!fr ? 'front' : !bk ? 'back' : '') : kind === 'cloze' ? (nBlanks ? '' : 'text') : kind === 'image' ? (!f.image ? 'image' : !bk ? 'back' : '') : (!hasSound ? 'speak' : !bk ? 'back' : '');
  const backHref = this.props.from === 'review' ? db.href('review', dk.id) : dk.href;
  const snd = f.audio === 'mock' ? { mock: true, real: false, btn: t.inv } : { mock: false, real: true, btn: hasSound ? t.inv : t.surf2, fg: hasSound ? t.text : t.muted,
    label: f.audio ? 'Your recording' : said ? 'Reads: “' + said + '”' : 'No sound yet. Record one, upload a file, or have it read aloud.' };
  // Formatting buttons: which are on, and what each does.
  const on = this.pressed();
  e.sig = JSON.stringify(on);
  const marks = { b: 'b', i: 'i', u: 'u', s: 's', hl: 'h', blank: 'k', list: 'list', math: 'm' };
  const acts = { b: () => this.fmt('b'), i: () => this.fmt('i'), u: () => this.fmt('u'), s: () => this.fmt('s'), hl: () => this.fmt('h'), blank: () => this.fmt('k'), list: () => this.fmt('list'),
    math: () => this.fmt('m'), img: () => this.media('image'), audio: () => this.media('audio'), undo: () => this.undo() };
  const fmt = Object.fromEntries(Object.entries(acts).map(([k, fn]) => { const x = !!on[marks[k]]; return [k, { pressed: x ? 'true' : 'false', bg: x ? kb.on : 'transparent', webBg: x ? t.bg : 'transparent', webSh: x ? '0 1px 3px rgba(0,0,0,.14)' : 'none', toggle: fn }]; }));
  // The / menu, when it's open.
  const sv = this.slashView(), sl = e.slash;
  const slash = { on: !!(sv && sl.pos), x: sl && sl.pos ? sl.pos.x : '0px', y: sl && sl.pos ? sl.pos.y : '0px',
    items: sv ? sv.items.map((it, n) => ({ label: it.label, hint: it.hint, g: it.g || '', list: it.icon === 'list', bracket: it.icon === 'bracket', sqrt: it.icon === 'sqrt', image: it.icon === 'image', mic: it.icon === 'mic',
      sel: n === sl.idx ? 'true' : 'false', bg: n === sl.idx ? t.surf : 'transparent', chip: n === sl.idx ? t.bg : t.surf, pick: () => this.slashPick(it.id) })) : [] };
  return {
    t, kb, dark: !!this.props.dark, typing: s.typing, deckId: this.props.deckId || '',
    title: saved ? 'Edit card' : 'New card', deckName: dk.name, backHref, f, rich, slash,
    isBasic: ty === 'Basic', isCloze: ty === 'Blank', isImage: ty === 'Image', isAudio: ty === 'Audio',
    types: ['Basic', 'Blank', 'Image', 'Audio'].map(l => ({ label: l, bg: l === ty ? t.bg : 'transparent', fg: l === ty ? t.text : t.muted, sh: l === ty ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => this.commit({}, { type: l, kind: 'kind' }) })),
    bars: [3,3,4,8,4,3,12,11,8,11,5,10,21,11,6,14,12,17,21,5,9,24,17,16,16,6,19,29,11,10,18,14,24,22,4,14,25,16,18,13,6,22,24,8,12,14,12,22,14,3,14,16,11,13,6,5,14,11,4,6,4,4,5,3].map(h => ({ h: h + 'px' })),
    hideKeyboard: () => this.setState({ typing: false }),
    // Pressing a formatting button leaves the caret in the field.
    keepFocus: ev => { if (ev && ev.preventDefault) ev.preventDefault(); },
    // Formatting bar over the keyboard. Aa swaps in the text styles.
    fmtMain: !s.styles, fmtStyles: s.styles,
    openStyles: () => this.setState({ styles: true }), closeStyles: () => this.setState({ styles: false }),
    fmt,
    // Fill in the blank: one card per blank, or one card with every blank.
    clozeModes: pick2([['each', 'One card per blank · ' + nBlanks], ['one', 'One card, all blanks']], f.clozeMode || 'each', id => put({ clozeMode: id })),
    // Image cards: hide one part, or all of them.
    occModes: pick2([['one', 'Hide one'], ['all', 'Hide all']], s.occ, id => this.setState({ occ: id })),
    img: { mock: f.image === 'mock', url: f.image && f.image !== 'mock' ? f.image : '', none: !f.image },
    pickImage: () => this.pickImage(),
    snd, recLabel: s.recording ? 'Stop' : 'Record',
    toggleRecord: () => this.toggleRecord(),
    pickAudio: () => db.act.pickFile('audio').then(url => url && put({ audio: url })),
    playAudio: () => (f.audio && f.audio !== 'mock' ? db.act.play(f.audio) : db.act.speak(said, f.lang)),
    speakOn: !!s.speakOpen || !!said, toggleSpeak: () => this.setState({ speakOpen: !s.speakOpen }),
    autoSw: sw(f.auto !== false), toggleAuto: () => put({ auto: f.auto === false }), noop: () => {},
    // A card can have any number of tags.
    cardTags: tags.map(g => ({ ...tagChip(g), remove: () => put({ tags: tags.filter(x => x !== g) }) })),
    // Opening the picker puts the keyboard away.
    cardPick: (() => { const q = tagPicker(tags, next => put({ tags: next }), 'cp', db.mock ? null : db.tags()); return { ...q, toggle: () => this.setState({ cpOpen: !q.open, cpQ: '', typing: false }) }; })(),
    canDelete: !!saved, remove: () => db.act.deleteCard(saved.id, backHref),
    save: ev => {
      if (db.mock) return;
      ev.preventDefault();
      if (missing === 'image') return this.pickImage();
      if (missing) return this.focusField(missing);
      db.act.saveCard(saved ? saved.id : null, dk.id, { kind, front: f.front, back: f.back, text: f.text, note: f.note, tags, image: f.image || null, audio: f.audio || null, speak: f.speak || '', auto: f.auto !== false, clozeMode: f.clozeMode || 'each' }, backHref);
    }
  };
}
}
return Component;
  }
};
