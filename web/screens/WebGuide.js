// Made from design/canvas/project/WebGuide.dc.html by design/to-web.mjs. Change the design, not this file.
export default {
  name: "WebGuide", title: "Web · Deck Guide editor (pick the view)", w: 1440, h: 900, fill: true,
  props: {"dark":false,"dim":false,"grain":0.7,"view":"Write","deckId":"","page":"","ask":""},
  imports: ["WebDeck"],
  css: "body{margin:0;font-family:Geist, -apple-system, system-ui, sans-serif}\na{color:inherit;text-decoration:none}a:hover{opacity:.8}\n@keyframes scRise{from{opacity:0;transform:translateY(14px)}}main>*{animation:scRise .5s cubic-bezier(.2,.8,.2,1) backwards}main>*:nth-child(2){animation-delay:0.06s}main>*:nth-child(3){animation-delay:0.12s}main>*:nth-child(4){animation-delay:0.18s}main>*:nth-child(5){animation-delay:0.24s}main>*:nth-child(n+6){animation-delay:.3s}button,.sc-press{transition:transform .1s ease}button:active,.sc-press:active{transform:scale(.96)}@keyframes scPopIn{from{opacity:0;transform:translateY(10px)}}.sc-pop,[data-sc-pop],.sc-tray{animation:scPopIn .22s cubic-bezier(0.2,0.8,0.2,1) backwards}@keyframes scFade{from{opacity:0}}.sc-fade{animation:scFade .18s ease-out backwards}@keyframes scScrimIn{from{opacity:0}}@keyframes scScrimOut{to{opacity:0}}.sc-scrim{animation:scScrimIn .25s ease backwards}.sc-scrim.sc-gone{animation:scScrimOut .18s ease forwards}@keyframes scPanelIn{from{opacity:0;transform:translateX(calc(100% + 12px))}}@keyframes scPanelOut{to{opacity:0;transform:translateX(calc(100% + 12px))}}.sc-panel{animation:scPanelIn .25s cubic-bezier(0.2,0.8,0.2,1) backwards}.sc-panel.sc-gone{animation:scPanelOut .18s cubic-bezier(.4,0,1,1) forwards}@keyframes scSheetIn{from{transform:translateY(100%)}}@keyframes scSheetOut{to{transform:translateY(100%)}}.sc-sheet{animation:scSheetIn .25s cubic-bezier(0.2,0.8,0.2,1) backwards}.sc-sheet.sc-gone{animation:scSheetOut .18s cubic-bezier(.4,0,1,1) forwards}.sc-sw{transition:background-color .2s ease,transform .1s ease}.sc-sw>span{transition:transform .2s cubic-bezier(0.2,0.8,0.2,1),background-color .2s ease}[role=\"group\"]>button,[role=\"tablist\"]>button{transition:color .2s ease,transform .1s ease}@media (prefers-reduced-motion:reduce){.sc-pop,[data-sc-pop],.sc-tray,.sc-fade,.sc-scrim,.sc-panel,.sc-sheet{animation:none!important}.sc-sw>span,[role=\"group\"]>button,[role=\"tablist\"]>button{transition:none}.sc-sw{transition:background-color .2s ease}}.sc-lift{transition:transform 0.2s ease-out,box-shadow 0.2s ease-out}.sc-lift:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}.sk-cover{box-shadow:var(--sk-shadow)}.sk-cover.sc-lift:hover{box-shadow:var(--sk-shadow),0 24px 48px -24px rgba(0,0,0,.45)}@keyframes scFloat{50%{transform:translateY(-6px)}}@keyframes scSwayA{50%{transform:rotate(-13deg) translateX(-3px)}}@keyframes scSwayB{50%{transform:rotate(10deg) translateX(3px)}}@keyframes scGlow{50%{opacity:.55}}@keyframes scSheen{0%,58%{transform:translateX(-160%) skewX(-18deg)}86%,100%{transform:translateX(260%) skewX(-18deg)}}.sc-float{animation:scFloat 6s ease-in-out infinite}.sc-sway-a{animation:scSwayA 6s ease-in-out infinite}.sc-sway-b{animation:scSwayB 6s ease-in-out infinite}.sc-glow{animation:scGlow 6s ease-in-out infinite}.sc-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:scSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}@keyframes scDrift{from{transform:scale(1.14) translate(-3%,-2%)}to{transform:scale(1.14) translate(3%,2%)}}.sc-alive>svg:first-of-type{animation:scDrift 16s ease-in-out infinite alternate}@keyframes scDraw{from{stroke-dashoffset:1.02}}.sc-draw{stroke-dasharray:1 2;animation:scDraw .9s cubic-bezier(.2,.8,.2,1) backwards}@keyframes scKnob{from{opacity:0;transform:scale(.3)}}.sc-knob{transform-box:fill-box;transform-origin:center;animation:scKnob .35s .75s cubic-bezier(.34,1.56,.64,1) backwards}@keyframes scGrow{from{transform:scaleY(0)}}.sc-grow{transform-origin:bottom;animation:scGrow .6s cubic-bezier(.2,.8,.2,1) backwards}:nth-child(2)>.sc-grow{animation-delay:0.04s}:nth-child(3)>.sc-grow{animation-delay:0.08s}:nth-child(4)>.sc-grow{animation-delay:0.12s}:nth-child(5)>.sc-grow{animation-delay:0.16s}:nth-child(6)>.sc-grow{animation-delay:0.20s}:nth-child(7)>.sc-grow{animation-delay:0.24s}:nth-child(8)>.sc-grow{animation-delay:0.28s}:nth-child(9)>.sc-grow{animation-delay:0.32s}:nth-child(10)>.sc-grow{animation-delay:0.36s}:nth-child(11)>.sc-grow{animation-delay:0.40s}:nth-child(12)>.sc-grow{animation-delay:0.44s}:nth-child(13)>.sc-grow{animation-delay:0.48s}:nth-child(14)>.sc-grow{animation-delay:0.52s}.sc-side{width:240px;transition:width .2s ease}.sc-side[data-collapsed=\"true\"]{width:78px}.sc-side-head{padding:0 4px 20px 12px;display:flex;align-items:center;justify-content:space-between;gap:4px}.sc-side-btns{display:flex;align-items:center;gap:4px}.sc-side[data-collapsed=\"true\"] .sc-side-head{padding:0 0 12px;justify-content:center}.sc-side[data-collapsed=\"true\"] .sc-side-btns{flex-direction:column-reverse;gap:6px}.sc-side[data-collapsed=\"true\"] :is(.sc-logo,.sc-lab,.sc-num){display:none}.sc-side .sc-dot{display:none}.sc-side[data-collapsed=\"true\"] .sc-dot{display:block}@media (prefers-reduced-motion:reduce){.sc-side{transition:none}}a:focus-visible,button:focus-visible,summary:focus-visible,[role=\"button\"]:focus-visible,[role=\"tab\"]:focus-visible,[role=\"radio\"]:focus-visible,[role=\"switch\"]:focus-visible,[role=\"menuitem\"]:focus-visible,[role=\"option\"]:focus-visible,[tabindex]:focus-visible{outline:2px solid currentColor;outline-offset:2px}[role=\"option\"]:focus-visible,[role=\"menuitem\"]:focus-visible{outline-offset:-2px}label:has(input:focus-visible,textarea:focus-visible):not([style*=\"box-shadow\"]){box-shadow:0 0 0 2px color-mix(in srgb,currentColor 45%,transparent)}*{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,currentColor 30%,transparent) transparent}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{border-radius:8px;background:color-mix(in srgb,currentColor 30%,transparent)}::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}@media (prefers-reduced-motion:reduce){main>*,.sc-float,.sc-sway-a,.sc-sway-b,.sc-glow,.sc-alive>svg,.sc-draw,.sc-knob,.sc-grow{animation:none!important}.sc-sheen{display:none}button:active,.sc-press:active,.sc-lift:hover{transform:none}}\n.gd{font-size:15px;line-height:1.6;color:var(--gd-text);overflow-wrap:anywhere}.gd>:first-child{margin-top:0}.gd>:last-child{margin-bottom:0}.gd h1,.gd h2,.gd h3,.gd h4,.gd h5,.gd h6{margin:1.3em 0 .5em;line-height:1.25;font-weight:600;letter-spacing:-.02em}.gd h1{font-size:1.65em;padding-bottom:.3em;border-bottom:1px solid var(--gd-line)}.gd h2{font-size:1.32em;padding-bottom:.25em;border-bottom:1px solid var(--gd-line)}.gd h3{font-size:1.12em}.gd h4,.gd h5,.gd h6{font-size:1em}.gd h6{color:var(--gd-muted)}.gd p{margin:0 0 .9em}.gd ul,.gd ol{margin:0 0 .9em;padding-left:1.5em}.gd li{margin:.25em 0}.gd li>ul,.gd li>ol{margin:.25em 0 0}.gd li.gd-task{list-style:none;margin-left:-1.5em}.gd .gd-box{display:inline-block;box-sizing:border-box;width:1.05em;height:1.05em;margin-right:.3em;vertical-align:-.17em;border:1.5px solid var(--gd-muted);border-radius:.3em}.gd .gd-on{border-color:var(--gd-text);background:var(--gd-text)}.gd .gd-on::after{content:\"\";display:block;width:.3em;height:.55em;margin:.02em auto 0;border:solid var(--gd-code);border-width:0 2px 2px 0;transform:rotate(45deg)}.gd blockquote{margin:0 0 .9em;padding:0 1em;border-left:3px solid var(--gd-line);color:var(--gd-muted)}.gd blockquote>:last-child{margin-bottom:0}.gd code{font-family:'Geist Mono',ui-monospace,monospace;font-size:.88em;padding:.15em .4em;border-radius:6px;background:var(--gd-code)}.gd pre{margin:0 0 .9em;padding:12px 14px;border-radius:12px;background:var(--gd-code);overflow:auto;line-height:1.5}.gd pre code{padding:0;background:none;font-size:.85em}.gd table{display:block;border-collapse:collapse;margin:0 0 .9em;overflow:auto;max-width:100%}.gd th,.gd td{padding:6px 12px;border:1px solid var(--gd-line);text-align:left}.gd th{font-weight:600;background:var(--gd-code)}.gd hr{border:0;border-top:1px solid var(--gd-line);margin:1.3em 0}.gd a{color:inherit;text-decoration:underline;text-underline-offset:2px}.gd img{max-width:100%;height:auto;border-radius:12px}",
  template: "<div style=\"position: relative; width: 100%; height: 100vh; overflow: hidden; font-family: Geist, -apple-system, system-ui, sans-serif; color: {{t.text}};\">\n  <dc-import name=\"WebDeck\" dark=\"{{dark}}\" dim=\"{{dim}}\" deck-id=\"{{deckId}}\" hint-size=\"1440px,900px\"></dc-import>\n  <div style=\"position: absolute; inset: 0; z-index: 40; background: {{t.dim}};\"></div>\n  <div role=\"dialog\" aria-label=\"Guide\" style=\"position: absolute; z-index: 40; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 980px; height: 800px; box-sizing: border-box; padding: 24px 28px 26px; border-radius: 32px; background: {{t.bg}}; box-shadow: 0 24px 64px rgba(0,0,0,.24); display: flex; flex-direction: column; gap: 14px;\">\n    \n    <div style=\"display: flex; align-items: center; gap: 10px;\">\n      <button type=\"button\" onClick=\"{{done}}\" aria-label=\"Done\" style=\"width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 20px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button>\n      <span style=\"flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;\"><span style=\"font-size: 22px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">Guide</span><span style=\"font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{deckName}}</span></span>\n      <span aria-live=\"polite\" style=\"font-size: 13px; color: {{saveColor}};\">{{saveLabel}}</span>\n      <button type=\"button\" onClick=\"{{toggleHistory}}\" aria-pressed=\"{{histPressed}}\" class=\"sc-press\" style=\"height: 40px; padding: 0 16px; border: 0; border-radius: 20px; background: {{histBg}}; color: {{histFg}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer;\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12a8 8 0 1 0 2.4-5.7L4 8.5\"/><path d=\"M4 4v4.5h4.5M12 8v4.5l3 1.8\"/></svg>History</button>\n    </div>\n    <div role=\"group\" aria-label=\"Pages\" style=\"display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex-shrink: 0;\"><sc-for list=\"{{tabs}}\" as=\"g\" hint-placeholder-count=\"3\"><button type=\"button\" onClick=\"{{g.pick}}\" aria-pressed=\"{{g.pressed}}\" style=\"height: 34px; max-width: 220px; flex-shrink: 0; padding: 0 14px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;\">{{g.title}}</button></sc-for><sc-if value=\"{{canAddPage}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{addPage}}\" aria-label=\"Add a page\" style=\"height: 34px; flex-shrink: 0; padding: 0 14px 0 10px; border: 0; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px {{t.line}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>Add page</button></sc-if></div>\n    <sc-if value=\"{{pageTools}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; align-items: center; gap: 8px; flex-shrink: 0;\"><input type=\"text\" value=\"{{pageTitle}}\" onChange=\"{{setPageTitle}}\" aria-label=\"Page name\" placeholder=\"Page name\" style=\"flex-grow: 1; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 14px; border: 0; outline: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600;\"><button type=\"button\" onClick=\"{{deletePage}}\" style=\"height: 40px; padding: 0 14px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Delete page</button></div></sc-if>\n    <sc-if value=\"{{showEditor}}\" hint-placeholder-val=\"{{ true }}\">\n      <div style=\"display: flex; align-items: center; gap: 10px; flex-shrink: 0; \">\n        <div role=\"group\" aria-label=\"Write or Preview\" style=\"display: flex; padding: 3px; border-radius: 999px; background: {{t.surf}}; flex-shrink: 0;\"><sc-for list=\"{{tabsWP}}\" as=\"o\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 32px; padding: 0 16px; border: 0; border-radius: 999px; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\">{{o.label}}</button></sc-for></div>\n        <sc-if value=\"{{isWrite}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"min-width: 0; flex-grow: 1;\"><div role=\"toolbar\" aria-label=\"Formatting\" style=\"display: flex; align-items: center; gap: 2px; overflow-x: auto; scrollbar-width: none;\">\n    <button type=\"button\" onMouseDown=\"{{tbHeading.down}}\" onClick=\"{{tbHeading.click}}\" aria-label=\"Heading\" data-tip=\"Heading\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \">H</button><button type=\"button\" onMouseDown=\"{{tbBold.down}}\" onClick=\"{{tbBold.click}}\" aria-label=\"Bold\" data-tip=\"Bold\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: 800;\">B</button><button type=\"button\" onMouseDown=\"{{tbItalic.down}}\" onClick=\"{{tbItalic.click}}\" aria-label=\"Italic\" data-tip=\"Italic\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; font-style: italic; font-family: Georgia, serif; font-size: 15px;\">I</button><button type=\"button\" onMouseDown=\"{{tbCode.down}}\" onClick=\"{{tbCode.click}}\" aria-label=\"Code\" data-tip=\"Code\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px;\">&lt;/&gt;</button>\n    <span aria-hidden=\"true\" style=\"width: 1px; height: 18px; flex-shrink: 0; margin: 0 6px; background: {{t.line}};\"></span>\n    <button type=\"button\" onMouseDown=\"{{tbLink.down}}\" onClick=\"{{tbLink.click}}\" aria-label=\"Link\" data-tip=\"Link\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1\"/></svg></button><button type=\"button\" onMouseDown=\"{{tbBullets.down}}\" onClick=\"{{tbBullets.click}}\" aria-label=\"Bulleted list\" data-tip=\"Bulleted list\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></button><button type=\"button\" onMouseDown=\"{{tbNumbers.down}}\" onClick=\"{{tbNumbers.click}}\" aria-label=\"Numbered list\" data-tip=\"Numbered list\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px;\">1.</button><button type=\"button\" onMouseDown=\"{{tbTasks.down}}\" onClick=\"{{tbTasks.click}}\" aria-label=\"Task list\" data-tip=\"Task list\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg></button><button type=\"button\" onMouseDown=\"{{tbQuote.down}}\" onClick=\"{{tbQuote.click}}\" aria-label=\"Quote\" data-tip=\"Quote\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; font-family: Georgia, serif;\">“</button><button type=\"button\" onMouseDown=\"{{tbTable.down}}\" onClick=\"{{tbTable.click}}\" aria-label=\"Table\" data-tip=\"Table\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"3.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"13.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"2\"/></svg></button><button type=\"button\" onMouseDown=\"{{tbImage.down}}\" onClick=\"{{tbImage.click}}\" aria-label=\"Picture\" data-tip=\"Picture\" style=\"min-width: 36px; height: 34px; flex-shrink: 0; padding: 0 8px; border: 0; border-radius: 10px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; \"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg></button>\n  </div></div></sc-if>\n      </div>\n      <sc-if value=\"{{isWrite}}\" hint-placeholder-val=\"{{ true }}\"><textarea ref=\"{{taRef}}\" onChange=\"{{type}}\" onKeyDown=\"{{keys}}\" aria-label=\"Guide, in Markdown\" placeholder=\"Write about this deck in Markdown: a plan, links, a summary, a table of terms.\" spellcheck=\"true\" style=\"flex-grow: 1; min-height: 0; resize: none; box-sizing: border-box; border: 0; outline: 0; border-radius: 18px; padding: 16px 18px; background: {{t.surf}}; color: {{t.text}}; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 14px; line-height: 1.65; tab-size: 2;\">{{text}}</textarea></sc-if>\n      <sc-if value=\"{{isPreview}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"flex-grow: 1; min-height: 0; overflow-y: auto; box-sizing: border-box; padding: 18px 22px; border-radius: 18px; background: {{t.surf}};\"><div class=\"gd\" ref=\"{{previewRef}}\" data-sc-own style=\"--gd-text: {{t.text}}; --gd-muted: {{t.muted}}; --gd-line: {{t.line}}; --gd-code: {{t.bg}};\"></div><sc-if value=\"{{previewEmpty}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 15px; color: {{t.muted}};\">Nothing to show yet.</span></sc-if></div></sc-if>\n      <div style=\"display: flex; gap: 10px; flex-shrink: 0;\">\n        <button type=\"button\" onClick=\"{{makeCards}}\" class=\"sc-press\" style=\"flex: 1 1 0; min-width: 0; height: 52px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; overflow: hidden; cursor: pointer;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z\"/><path d=\"M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z\"/></svg><span style=\"overflow: hidden; text-overflow: ellipsis;\">{{makeLabel}}</span></button>\n        <button type=\"button\" onClick=\"{{done}}\" class=\"sc-press\" style=\"flex: 1 1 0; height: 52px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;\">Done</button>\n      </div>\n    </sc-if>\n    <sc-if value=\"{{histOpen}}\" hint-placeholder-val=\"{{ false }}\">\n      <div style=\"flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 10px;\">\n        <span style=\"font-size: 14px; color: {{t.muted}};\">{{histLine}}</span>\n        <sc-for list=\"{{versions}}\" as=\"v\" hint-placeholder-count=\"2\"><div style=\"box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 8px;\">\n          <div style=\"display: flex; align-items: center; gap: 10px;\"><span style=\"flex-grow: 1; font-size: 14px; font-weight: 600;\">{{v.when}}</span><span style=\"font-size: 12px; color: {{t.muted}};\">{{v.size}}</span><button type=\"button\" onClick=\"{{v.restore}}\" class=\"sc-press\" style=\"height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\">Restore</button></div>\n          <span style=\"font-size: 13px; line-height: 1.5; color: {{t.muted}}; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 84px; overflow: hidden;\">{{v.excerpt}}</span>\n        </div></sc-for>\n        <sc-if value=\"{{noVersions}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 15px; color: {{t.muted}};\">There are no older versions yet. They show up here as you write.</span></sc-if>\n      </div>\n      <div style=\"display: flex; gap: 10px; flex-shrink: 0;\"><button type=\"button\" onClick=\"{{toggleHistory}}\" class=\"sc-press\" style=\"flex-grow: 1; height: 52px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;\">Back to writing</button></div>\n    </sc-if>\n  </div>\n<sc-if value=\"{{ask.show}}\" hint-placeholder-val=\"{{ false }}\"><div data-lu=\"ask\" style=\"position: absolute; inset: 0; z-index: 2000; display: flex; justify-content: center; align-items: center;\">\n  <div class=\"sc-fade\" onClick=\"{{ask.no}}\" style=\"position: absolute; inset: 0; background: {{t.dim}};\"></div>\n  <div role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"lu-ask-title\" aria-describedby=\"lu-ask-line\" class=\"sc-pop\" style=\"position: relative; box-sizing: border-box; width: 440px; max-width: calc(100% - 32px); padding: 28px; border-radius: 32px; box-shadow: 0 24px 64px rgba(0,0,0,.24); background: {{t.bg}}; color: {{t.text}}; font-family: Geist, -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; gap: 14px; text-shadow: none;\">\n    \n    <span id=\"lu-ask-title\" style=\"font-size: 22px; font-weight: 600; letter-spacing: -.02em; line-height: 1.2;\">{{ask.title}}</span>\n    <sc-if value=\"{{ask.hasLine}}\" hint-placeholder-val=\"{{ true }}\"><p id=\"lu-ask-line\" style=\"margin: 0; font-size: 15px; line-height: 1.45; color: {{t.muted}};\">{{ask.line}}</p></sc-if>\n    <div style=\"display: flex; gap: 10px; margin-top: 6px;\"><button type=\"button\" data-key=\"escape\" onClick=\"{{ask.no}}\" class=\"sc-press\" style=\"flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;\">Cancel</button><button type=\"button\" onClick=\"{{ask.yes}}\" class=\"sc-press\" style=\"flex: 1 1 0; height: 48px; border: 0; border-radius: 999px; background: {{ask.bg}}; color: {{ask.fg}}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;\">{{ask.action}}</button></div>\n  </div></div></sc-if></div>",
  Logic: DCLogic => {
class Component extends DCLogic {
// Dark mode has two looks, picked in Settings → Dark mode: black (the first one, and still the default) or gray (the
// owner: "add a darkmode option that is grayish not fully blackedout"). g asks for gray; it only counts when d is on.
// Gray keeps the grade colors, and its muted words still read at WCAG AA on every surface.
theme(d, g) {
  if (d && g) return { bg: '#1E1E20', surf: '#2A2A2D', surf2: '#353539', line: '#3A3A3E', text: '#F2F2F2', muted: '#A8A8AD', inv: '#F2F2F2', invText: '#1E1E20', card: '#2A2A2D', shadow: '0 1px 2px rgba(0,0,0,.2), 0 18px 44px -18px rgba(0,0,0,.5)', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD', againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.45)' };
  return d
    ? { bg: '#000000', surf: '#141414', surf2: '#222222', line: '#262626', text: '#FFFFFF', muted: '#A3A3A3', inv: '#FFFFFF', invText: '#000000', card: '#141414', shadow: 'none', again: '#F97066', hard: '#FDB022', good: '#47CD89', easy: '#53B1FD', againTint: 'rgba(249,112,102,.16)', goodTint: 'rgba(71,205,137,.16)', hardTint: 'rgba(253,176,34,.16)', dim: 'rgba(0,0,0,.7)' }
    : { bg: '#FFFFFF', surf: '#F4F4F4', surf2: '#E8E8E8', line: '#EBEBEB', text: '#000000', muted: '#666666', inv: '#000000', invText: '#FFFFFF', card: '#FFFFFF', shadow: '0 1px 2px rgba(0,0,0,.04), 0 18px 44px -18px rgba(0,0,0,.18)', again: '#D92D20', hard: '#B54708', good: '#067647', easy: '#175CD3', againTint: '#FDECEA', goodTint: '#E6F4EC', hardTint: '#FDF1E3', dim: 'rgba(0,0,0,.28)' };
}
mesh(name, i) {
  const P = {"Iris":{"base":"linear-gradient(102deg, #C9CCFC 0%, #9CA2FE 17%, #A9B9FF 32%, #BFCEFF 52%, #BACFFF 70%, #8EC5FC 86%, #33B3EC 100%)","ink":"#000000","fid":"sc-flow-iris","sid":"sc-streak-iris","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#8C98FC","x":14,"y":70,"rx":10,"ry":70,"r":12},"b1":{"c":"#C3D0FF","x":55,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#2CB2EA","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#C2CCFF","x":88,"y":0,"rx":22,"ry":26,"r":0},"b4":{"c":"#7E94FB","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#B9CEFF","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#E6E8FD","x":1,"y":40,"rx":3.2,"ry":70,"r":12},"s1":{"c":"#D3DBFF","x":44,"y":50,"rx":2.6,"ry":80,"r":12}},"Apricot":{"base":"linear-gradient(200deg, #F2AC45 0%, #EE9D3F 28%, #E88C37 52%, #E99038 76%, #EE9A3E 100%)","ink":"#000000","fid":"sc-flow-apricot","sid":"sc-streak-apricot","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#E27E2E","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#F3AE44","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#F4BC76","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#EA9139","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#E7862F","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#F1A640","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FAE6BC","x":6,"y":55,"rx":11,"ry":70,"r":-22},"s1":{"c":"#F7D39A","x":20,"y":70,"rx":5,"ry":50,"r":-22}},"Lilac":{"base":"linear-gradient(110deg, #D9CCFA 0%, #C3B2F6 22%, #D8C3F4 45%, #F1CDE3 68%, #F8CDB8 88%, #F6B999 100%)","ink":"#000000","fid":"sc-flow-lilac","sid":"sc-streak-lilac","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#B7A3F4","x":18,"y":64,"rx":10,"ry":70,"r":14},"b1":{"c":"#E7D3F6","x":50,"y":40,"rx":12,"ry":80,"r":14},"b2":{"c":"#F5B08E","x":100,"y":100,"rx":22,"ry":40,"r":16},"b3":{"c":"#D2C6FA","x":86,"y":0,"rx":22,"ry":24,"r":0},"b4":{"c":"#AE98F2","x":4,"y":100,"rx":16,"ry":22,"r":14},"b5":{"c":"#F4C9D8","x":72,"y":62,"rx":10,"ry":70,"r":14},"s0":{"c":"#F3EDFD","x":2,"y":40,"rx":3,"ry":70,"r":14},"s1":{"c":"#EEDDF8","x":44,"y":50,"rx":2.4,"ry":80,"r":14}},"Mint":{"base":"linear-gradient(105deg, #D7F3E6 0%, #A7E3C9 20%, #BDEBD6 40%, #CFF1DE 60%, #B6E6CD 78%, #7FD0B0 100%)","ink":"#000000","fid":"sc-flow-mint","sid":"sc-streak-mint","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#8FD8B8","x":16,"y":66,"rx":10,"ry":70,"r":12},"b1":{"c":"#D9F5E6","x":52,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#5FC3A0","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#E9F7C9","x":88,"y":2,"rx":22,"ry":24,"r":0},"b4":{"c":"#7ACFAD","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#C3EDD7","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#F1FBF5","x":2,"y":40,"rx":3,"ry":70,"r":12},"s1":{"c":"#E2F7EB","x":44,"y":50,"rx":2.4,"ry":80,"r":12}},"Aqua":{"base":"linear-gradient(102deg, #D5F1FA 0%, #9EDCF1 18%, #B6E6F5 36%, #C9EEF8 56%, #A6DEF2 74%, #5CC0E6 90%, #2FA7DE 100%)","ink":"#000000","fid":"sc-flow-aqua","sid":"sc-streak-aqua","blur":"6","sblur":"2.2","disp":"10","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#86D2EE","x":14,"y":68,"rx":10,"ry":70,"r":12},"b1":{"c":"#D0F0FA","x":54,"y":40,"rx":12,"ry":80,"r":12},"b2":{"c":"#2A9FDA","x":102,"y":102,"rx":20,"ry":42,"r":18},"b3":{"c":"#C7EDF9","x":88,"y":0,"rx":22,"ry":26,"r":0},"b4":{"c":"#6CC6EA","x":6,"y":100,"rx":16,"ry":22,"r":12},"b5":{"c":"#B2E4F5","x":72,"y":60,"rx":10,"ry":70,"r":12},"s0":{"c":"#EEFAFD","x":1,"y":40,"rx":3.2,"ry":70,"r":12},"s1":{"c":"#DDF4FB","x":44,"y":50,"rx":2.6,"ry":80,"r":12}},"Rose":{"base":"linear-gradient(200deg, #F9C3CF 0%, #F5A9BB 30%, #EE8CA6 55%, #F29AB0 78%, #F6AFC0 100%)","ink":"#000000","fid":"sc-flow-rose","sid":"sc-streak-rose","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#EC7F9C","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#FAC6D2","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#F8C0B4","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#F09CB1","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#EF93AA","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#F7B6C5","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FDE9EE","x":4,"y":52,"rx":8,"ry":64,"r":-20},"s1":{"c":"#FBD6DF","x":16,"y":66,"rx":5,"ry":50,"r":-20}},"Lemon":{"base":"linear-gradient(200deg, #FCE78C 0%, #F9DA6E 30%, #F5C752 55%, #F7CF5E 78%, #F9D86C 100%)","ink":"#000000","fid":"sc-flow-lemon","sid":"sc-streak-lemon","blur":"7","sblur":"3","disp":"8","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#F2BD45","x":70,"y":38,"rx":12,"ry":60,"r":-32},"b1":{"c":"#FCE891","x":92,"y":4,"rx":28,"ry":24,"r":0},"b2":{"c":"#FBD99A","x":10,"y":98,"rx":24,"ry":22,"r":0},"b3":{"c":"#F6CB5A","x":40,"y":80,"rx":20,"ry":30,"r":-20},"b4":{"c":"#F4C44F","x":100,"y":70,"rx":14,"ry":30,"r":0},"b5":{"c":"#FADF7A","x":60,"y":0,"rx":18,"ry":14,"r":0},"s0":{"c":"#FFF7DA","x":4,"y":52,"rx":8,"ry":64,"r":-20},"s1":{"c":"#FDEDB4","x":16,"y":66,"rx":5,"ry":50,"r":-20}},"Dusk":{"base":"linear-gradient(180deg, #9A92B6 0%, #A58AA6 36%, #AF8599 54%, #C8715F 76%, #DA7A50 100%)","ink":"#FFFFFF","fid":"sc-flow-dusk","sid":"sc-streak-dusk","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#958FB9","x":5,"y":10,"rx":60,"ry":40,"r":0},"b1":{"c":"#AC839E","x":92,"y":18,"rx":50,"ry":36,"r":0},"b2":{"c":"#B0869A","x":50,"y":55,"rx":60,"ry":14,"r":0},"b3":{"c":"#CE505A","x":6,"y":96,"rx":40,"ry":30,"r":0},"b4":{"c":"#F4A04A","x":50,"y":100,"rx":34,"ry":30,"r":0},"b5":{"c":"#D9744C","x":96,"y":92,"rx":34,"ry":28,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Grove":{"base":"linear-gradient(160deg, #2E4A1F 0%, #4E6428 25%, #9A9A3E 50%, #5E7A3A 72%, #1E3A22 100%)","ink":"#FFFFFF","fid":"sc-flow-grove","sid":"sc-streak-grove","blur":"7","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#D9A878","x":70,"y":6,"rx":26,"ry":14,"r":0},"b1":{"c":"#7FB2D6","x":97,"y":30,"rx":16,"ry":26,"r":0},"b2":{"c":"#C8B432","x":40,"y":50,"rx":40,"ry":10,"r":0},"b3":{"c":"#15301A","x":86,"y":94,"rx":36,"ry":22,"r":0},"b4":{"c":"#8FA3AE","x":6,"y":86,"rx":30,"ry":16,"r":0},"b5":{"c":"#22401C","x":6,"y":12,"rx":34,"ry":22,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Forest":{"base":"linear-gradient(180deg, #AEBEC9 0%, #B0C2CF 22%, #A8B7B8 38%, #8A9675 50%, #5E6B3C 61%, #3F4F25 72%, #25391A 86%, #1C3214 100%)","ink":"#FFFFFF","fid":"sc-flow-forest","sid":"sc-streak-forest","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#B3C6D4","x":70,"y":8,"rx":62,"ry":22,"r":0},"b1":{"c":"#909C7C","x":60,"y":50,"rx":46,"ry":7,"r":0},"b2":{"c":"#6F7C4C","x":4,"y":53,"rx":30,"ry":9,"r":0},"b3":{"c":"#203616","x":50,"y":102,"rx":72,"ry":24,"r":0},"b4":{"c":"#2B4319","x":0,"y":80,"rx":30,"ry":18,"r":0},"b5":{"c":"#AAB9BD","x":10,"y":36,"rx":34,"ry":8,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Ember":{"base":"linear-gradient(270deg, #EB840C 0%, #E77C0D 36%, #B8641A 50%, #7A4A22 61%, #5A3A28 72%, #6A3F27 85%, #8B4922 100%)","ink":"#FFFFFF","fid":"sc-flow-ember","sid":"sc-streak-ember","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#E36E0E","x":80,"y":100,"rx":40,"ry":40,"r":0},"b1":{"c":"#F08C10","x":86,"y":4,"rx":36,"ry":36,"r":0},"b2":{"c":"#533728","x":28,"y":45,"rx":13,"ry":75,"r":0},"b3":{"c":"#974B1D","x":0,"y":92,"rx":18,"ry":40,"r":0},"b4":{"c":"#C96A17","x":55,"y":20,"rx":8,"ry":40,"r":0},"b5":{"c":"#E0740E","x":100,"y":60,"rx":20,"ry":30,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Meadow":{"base":"linear-gradient(180deg, #A9CFE0 0%, #7FAE6A 26%, #5E8E3E 38%, #D6C648 50%, #CFE3E6 64%, #5C9450 80%, #3E8480 100%)","ink":"#FFFFFF","fid":"sc-flow-meadow","sid":"sc-streak-meadow","blur":"5","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#2F6230","x":14,"y":40,"rx":38,"ry":10,"r":0},"b1":{"c":"#EDCBA8","x":78,"y":20,"rx":30,"ry":12,"r":0},"b2":{"c":"#E6CB3C","x":46,"y":52,"rx":30,"ry":7,"r":0},"b3":{"c":"#E4EFF3","x":20,"y":68,"rx":30,"ry":10,"r":0},"b4":{"c":"#3F7F3A","x":84,"y":74,"rx":30,"ry":10,"r":0},"b5":{"c":"#9CC8E8","x":94,"y":42,"rx":18,"ry":12,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Ocean":{"base":"linear-gradient(180deg, #CFE2E7 0%, #A2C9D4 28%, #6A9FB3 52%, #33708C 76%, #1B4A66 100%)","ink":"#FFFFFF","fid":"sc-flow-ocean","sid":"sc-streak-ocean","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.12)","glassLine":"rgba(255,255,255,.62)","shadow":"0 1px 14px rgba(0,0,0,.16)","b0":{"c":"#E7EFF1","x":72,"y":6,"rx":44,"ry":16,"r":0},"b1":{"c":"#8DBBCB","x":12,"y":32,"rx":40,"ry":10,"r":0},"b2":{"c":"#4E8FA8","x":22,"y":56,"rx":46,"ry":10,"r":0},"b3":{"c":"#2A6482","x":86,"y":70,"rx":42,"ry":14,"r":0},"b4":{"c":"#173F5A","x":30,"y":102,"rx":62,"ry":20,"r":0},"b5":{"c":"#3C7F9B","x":100,"y":46,"rx":24,"ry":10,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}},"Sun":{"base":"linear-gradient(165deg, #F7D84E 0%, #F5C63F 42%, #EFA436 78%, #EA9031 100%)","ink":"#000000","fid":"sc-flow-sun","sid":"sc-streak-sun","blur":"9","sblur":"3","disp":"26","glass":"rgba(255,255,255,.34)","glassLine":"rgba(0,0,0,.22)","shadow":"none","b0":{"c":"#FBE46C","x":14,"y":8,"rx":52,"ry":34,"r":0},"b1":{"c":"#F3B63A","x":70,"y":55,"rx":50,"ry":22,"r":0},"b2":{"c":"#EA8A2E","x":92,"y":100,"rx":46,"ry":30,"r":0},"b3":{"c":"#F8D24A","x":0,"y":70,"rx":30,"ry":24,"r":0},"b4":{"c":"#F9DC5C","x":80,"y":10,"rx":30,"ry":20,"r":0},"b5":{"c":"#EE9C34","x":30,"y":100,"rx":40,"ry":18,"r":0},"s0":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0},"s1":{"c":"transparent","x":0,"y":0,"rx":0,"ry":0,"r":0}}};
  const keys = Object.keys(P);
  return P[name] || P[keys[(i || 0) % keys.length]];
}
// Themes (Pro, Settings › Theme) change four things: deck covers, flashcards, the study background, and your profile
// picture (web/themes). skin(db) is the theme a board draws with: the one a canvas Theme board names (props.skin), or
// yours, once its code has loaded (null for Lucida's own look). skinFor(key) is any theme, like a profile owner's.
skin(db) { return this.skinFor(this.props.skin || (db && db.theme ? db.theme() : '')); }
skinFor(k) {
  if (!k || k === 'lucida') return null;
  const T = globalThis.LucidaThemes || {}, load = (this.props.db && this.props.db.loadTheme) || globalThis.LucidaLoadTheme;
  if (!T[k] && load) load(k);
  return T[k] || null;
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
  const N = {"P":{"alex":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"maria":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"dev":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"jordan":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"okafor":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"sam":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"ucd":{"handle":"ucdavis.bio","name":"UC Davis Biology","avatar":null,"color":0,"verified":"school","kind":"school"}},"DECKS":{"mcat":{"level":"college","subject":"biology","school":"University of California-Davis","schoolId":"110644","id":"s1","url":"/@mariasantos/mcat-biochemistry","name":"MCAT Biochemistry","description":"Every enzyme, pathway, and number the exam asks. Suggestions welcome.","tags":["MCAT","Biology"],"cover":{"style":"mix","round":0,"seed":"MCAT Biochemistry","image":null},"cards":640,"stars":4200,"learners":214,"copies":86,"version":14,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":false},"maintained":"creator","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"kanji":{"level":"other","subject":"languages","school":"","schoolId":"","id":"s2","url":"/@jordanlee/jlpt-n3-kanji","name":"JLPT N3 Kanji","description":"","tags":["Languages","Japanese"],"cover":{"style":"mix","round":0,"seed":"JLPT N3 Kanji","image":null},"cards":1024,"stars":3100,"learners":1860,"copies":372,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"theme":""},"algo":{"level":"college","subject":"computer-science","school":"Stanford University","schoolId":"243744","id":"s3","url":"/@devp/algorithms","name":"Algorithms","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"Algorithms","image":null},"cards":212,"stars":2700,"learners":1620,"copies":324,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"theme":""},"pharm":{"level":"medical","subject":"pharmacy","school":"Stanford University","schoolId":"243744","id":"s4","url":"/@samr/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":388,"stars":1900,"learners":1140,"copies":228,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"theme":""},"bio2a":{"level":"college","subject":"biology","school":"University of California-Davis","schoolId":"110644","id":"s5","url":"/@drokafor/bio-2a-final","name":"BIO 2A · Final","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"BIO 2A · Final","image":null},"cards":290,"stars":860,"learners":516,"copies":103,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":""},"law":{"level":"medical","subject":"law","school":"Stanford University","schoolId":"243744","id":"s6","url":"/@samr/constitutional-law","name":"Constitutional Law","description":"","tags":["Law"],"cover":{"style":"mix","round":0,"seed":"Constitutional Law","image":null},"cards":174,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"theme":""},"orgo":{"level":"college","subject":"chemistry","school":"University of California-Davis","schoolId":"110644","id":"s7","url":"/@drokafor/organic-reactions","name":"Organic Reactions","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"stars":1400,"learners":840,"copies":168,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":""},"spanish":{"level":"highschool","subject":"languages","school":"","schoolId":"","id":"s8","url":"/@mariasantos/spanish-b1","name":"Spanish B1","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Spanish B1","image":null},"cards":900,"stars":2200,"learners":1320,"copies":264,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"cell":{"level":"college","subject":"biology","school":"University of California-Davis","schoolId":"110644","id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"sys":{"level":"college","subject":"computer-science","school":"University of California-Davis","schoolId":"110644","id":"s10","url":"/@alexkim/system-design","name":"System Design","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"System Design","image":null},"cards":74,"stars":412,"learners":247,"copies":49,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"jp":{"level":"other","subject":"languages","school":"","schoolId":"","id":"s11","url":"/@alexkim/japanese-n4","name":"Japanese N4","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Japanese N4","image":null},"cards":820,"stars":2400,"learners":1440,"copies":288,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"orgoA":{"level":"college","subject":"chemistry","school":"University of California-Davis","schoolId":"110644","id":"s12","url":"/@alexkim/organic-chemistry","name":"Organic Chemistry","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Chemistry","image":null},"cards":236,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"hist":{"level":"highschool","subject":"history","school":"","schoolId":"","id":"s13","url":"/@alexkim/us-history","name":"US History","description":"","tags":["History"],"cover":{"style":"mix","round":0,"seed":"US History","image":null},"cards":158,"stars":205,"learners":123,"copies":25,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"anat":{"level":"college","subject":"medicine","school":"University of California-Davis","schoolId":"110644","id":"s14","url":"/@alexkim/anatomy","name":"Anatomy","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Anatomy","image":null},"cards":530,"stars":980,"learners":588,"copies":118,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"pharmA":{"level":"medical","subject":"pharmacy","school":"University of California-Davis","schoolId":"110644","id":"s15","url":"/@alexkim/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":188,"stars":320,"learners":192,"copies":38,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"psych":{"level":"college","subject":"psychology","school":"University of California-Davis","schoolId":"110644","id":"s16","url":"/@alexkim/psych-soc","name":"Psych & Soc","description":"","tags":["MCAT"],"cover":{"style":"mix","round":0,"seed":"Psych & Soc","image":null},"cards":344,"stars":1100,"learners":660,"copies":132,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""}},"ALEX_DECKS":[{"level":"college","subject":"biology","school":"University of California-Davis","schoolId":"110644","id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":true},{"level":"college","subject":"computer-science","school":"University of California-Davis","schoolId":"110644","id":"s10","url":"/@alexkim/system-design","name":"System Design","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"System Design","image":null},"cards":74,"stars":412,"learners":247,"copies":49,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":true},{"level":"other","subject":"languages","school":"","schoolId":"","id":"s11","url":"/@alexkim/japanese-n4","name":"Japanese N4","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Japanese N4","image":null},"cards":820,"stars":2400,"learners":1440,"copies":288,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"level":"college","subject":"chemistry","school":"University of California-Davis","schoolId":"110644","id":"s12","url":"/@alexkim/organic-chemistry","name":"Organic Chemistry","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Chemistry","image":null},"cards":236,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"level":"highschool","subject":"history","school":"","schoolId":"","id":"s13","url":"/@alexkim/us-history","name":"US History","description":"","tags":["History"],"cover":{"style":"mix","round":0,"seed":"US History","image":null},"cards":158,"stars":205,"learners":123,"copies":25,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"level":"college","subject":"medicine","school":"University of California-Davis","schoolId":"110644","id":"s14","url":"/@alexkim/anatomy","name":"Anatomy","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Anatomy","image":null},"cards":530,"stars":980,"learners":588,"copies":118,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"level":"medical","subject":"pharmacy","school":"University of California-Davis","schoolId":"110644","id":"s15","url":"/@alexkim/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":188,"stars":320,"learners":192,"copies":38,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"level":"college","subject":"psychology","school":"University of California-Davis","schoolId":"110644","id":"s16","url":"/@alexkim/psych-soc","name":"Psych & Soc","description":"","tags":["MCAT"],"cover":{"style":"mix","round":0,"seed":"Psych & Soc","image":null},"cards":344,"stars":1100,"learners":660,"copies":132,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false}],"CARDS":[{"id":"c1","kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","tags":["Energy"],"source":"","trail":[{"w":"made","at":1}]},{"id":"c2","kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1)","tags":["Glycolysis"],"source":"","trail":[{"w":"made","at":1},{"w":"edited","by":"Maria Santos","at":2}]},{"id":"c3","kind":"cloze","front":"","back":"","text":"The [[citric acid]] cycle produces NADH and FADH₂.","tags":["Krebs"],"source":"Claude","trail":[{"w":"made","ai":"Claude","at":1}]},{"id":"c4","kind":"image","front":"Name the structure marked 1 on the diagram.","back":"Inner membrane","tags":["Diagrams"],"source":"","trail":[{"w":"made","at":1}]},{"id":"c5","kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"Acetyl-CoA and NADH","tags":[],"source":"","trail":[{"w":"made","at":1},{"w":"edited","by":"Dev Patel","at":2}]},{"id":"c6","kind":"cloze","front":"","back":"","text":"Km is the substrate concentration at [[half]] Vmax.","tags":["Enzymes"],"source":"","trail":[{"w":"made","at":1}]}],"MADE":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Alex Kim","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"n":3},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"n":0},{"version":12,"kind":"suggestion","summary":"Took 2 changes from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"n":2},{"version":9,"kind":"ai","summary":"38 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":38},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":0}],"HISTORY":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Alex Kim","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"n":3,"changes":[{"card":"c2","op":"edit","kind":"answer","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1)"}},{"card":"n1","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate"}},{"card":"c7","op":"edit","kind":"typo","before":{"kind":"basic","front":"Where does the citric acid cycle hapen?","back":"In the mitochondrial matrix"},"after":{"kind":"basic","front":"Where does the citric acid cycle happen?","back":"In the mitochondrial matrix"}}]},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"n":0,"changes":[]},{"version":12,"kind":"suggestion","summary":"Took 2 changes from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"n":2,"changes":[{"card":"c5","op":"edit","kind":"answer","before":{"kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"ATP"},"after":{"kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"Acetyl-CoA and NADH"}},{"card":"c8","op":"remove","kind":"remove","before":{"kind":"basic","front":"Glycolysis happens in the mitochondria.","back":"False"},"after":null}]},{"version":9,"kind":"ai","summary":"38 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":38,"changes":[]},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":0,"changes":[]}],"CELL_HISTORY":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Maria Santos","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"changes":[{"card":"k7","op":"edit","kind":"answer","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate."}},{"card":"n1","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate."}},{"card":"k8","op":"edit","kind":"typo","before":{"kind":"basic","front":"The citric acid cycle happens in the cytoplasm.","back":""},"after":{"kind":"basic","front":"The citric acid cycle happens in the mitochondrial matrix.","back":""}}]},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"changes":[]},{"version":12,"kind":"suggestion","summary":"Took 1 change from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"changes":[{"card":"k6","op":"edit","kind":"answer","before":{"kind":"basic","front":"What is the role of the ribosome?","back":"Makes lipids"},"after":{"kind":"basic","front":"What is the role of the ribosome?","back":"Translates mRNA into protein"}}]},{"version":9,"kind":"ai","summary":"3 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"changes":[{"card":"k2","op":"add","kind":"new","before":null,"after":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell."}},{"card":"k3","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"Name structure 1 on the diagram.","back":"Nucleus"}},{"card":"k9","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What does ATP synthase make?","back":"ATP, from ADP and phosphate."}}]},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"changes":[]}],"SUGGESTIONS":[{"id":"g1","shared_id":"s9","author_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"ai":"","message":"Fixed the glycolysis answers from my TA’s review.","status":"open","created_at":"2026-09-28T08:00:00Z","deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"changes":[{"id":"x1","card":"c2","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate."}},{"id":"x2","card":"n1","op":"add","kind":"new","status":"open","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate."}},{"id":"x3","card":"c7","op":"edit","kind":"typo","status":"open","before":{"kind":"basic","front":"The citric acid cycle happens in the cytoplasm.","back":""},"after":{"kind":"basic","front":"The citric acid cycle happens in the mitochondrial matrix.","back":""}}]},{"id":"g2","shared_id":"s9","author_name":"Dev Patel","person":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"ai":"ChatGPT","message":"","status":"open","created_at":"2026-09-25T08:00:00Z","deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"changes":[{"id":"x4","card":"n2","op":"add","kind":"new","status":"open","before":null,"after":{"kind":"basic","front":"What does ATP synthase make?","back":"ATP, from ADP and phosphate."}}]}],"SENT":[{"id":"g11","shared_id":"s1","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"Two answers my class kept missing.","created_at":"2026-09-27T15:00:00Z","status":"open","deck":{"id":"s1","name":"MCAT Biochemistry","url":"/@mariasantos/mcat-biochemistry"},"changes":[{"id":"g11x0","card":"c1","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}},{"id":"g11x1","card":"c2","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Card 2","back":"Before"},"after":{"kind":"basic","front":"Card 2","back":"After"}}]},{"id":"g12","shared_id":"s4","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"Fixed the doses on the beta blocker cards.","created_at":"2026-09-22T15:00:00Z","status":"done","deck":{"id":"s4","name":"Pharmacology","url":"/@samr/pharmacology"},"changes":[{"id":"g12x0","card":"c1","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}},{"id":"g12x1","card":"c2","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 2","back":"Before"},"after":{"kind":"basic","front":"Card 2","back":"After"}},{"id":"g12x2","card":"c3","op":"edit","kind":"answer","status":"skipped","before":{"kind":"basic","front":"Card 3","back":"Before"},"after":{"kind":"basic","front":"Card 3","back":"After"}}]},{"id":"g13","shared_id":"s3","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"","created_at":"2026-09-18T15:00:00Z","status":"done","deck":{"id":"s3","name":"Algorithms","url":"/@devp/algorithms"},"changes":[{"id":"g13x0","card":"c1","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}}]},{"id":"g14","shared_id":"s2","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"One reading was off.","created_at":"2026-09-10T15:00:00Z","status":"done","deck":{"id":"s2","name":"JLPT N3 Kanji","url":"/@jordanlee/jlpt-n3-kanji"},"changes":[{"id":"g14x0","card":"c1","op":"edit","kind":"answer","status":"skipped","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}}]}],"NEWS":[{"id":1,"kind":"suggestion","actor_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"data":{"n":3,"message":"Fixed the glycolysis answers from my TA’s review."},"read":false,"created_at":"2026-09-28T08:00:00Z"},{"id":2,"kind":"follow","actor_name":"Jordan Lee","person":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"deck":null,"data":{"handle":"jordanlee"},"read":false,"created_at":"2026-09-28T06:00:00Z"},{"id":3,"kind":"update","actor_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"deck":{"id":"s1","name":"MCAT Biochemistry","url":"/@mariasantos/mcat-biochemistry"},"data":{"summary":"3 new cards, 2 answers fixed","n":5},"read":true,"created_at":"2026-09-26T10:00:00Z"},{"id":4,"kind":"decided","actor_name":"Sam Rivera","person":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"deck":{"id":"s4","name":"Pharmacology","url":"/@samr/pharmacology"},"data":{"took":2,"skipped":1},"read":true,"created_at":"2026-09-24T10:00:00Z"},{"id":6,"kind":"hidden","actor_name":"Lucida","person":null,"deck":{"id":"s13","name":"US History","url":"/@alexkim/us-history"},"data":{"name":"US History"},"read":true,"created_at":"2026-09-23T10:00:00Z"},{"id":5,"kind":"checked","actor_name":"Dr. Okafor","person":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"deck":{"id":"s12","name":"Organic Chemistry","url":"/@alexkim/organic-chemistry"},"data":{},"read":true,"created_at":"2026-09-21T10:00:00Z"},{"id":7,"kind":"verified","actor_name":"Lucida","person":null,"deck":null,"data":{"role":"teacher"},"read":true,"created_at":"2026-09-19T10:00:00Z"}],"CLASSES":{"BIOKTZ":{"id":"k1","code":"BIOKTZ","name":"BIO 201","school":"UC Davis","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"official":false,"people":8,"decks":3,"me":{"role":"owner","share":false,"asked":true},"helpers":["Dev Patel"],"members":[{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","role":"owner","share":false,"joined":"2026-09-01T10:00:00Z","you":true},{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person","role":"helper","share":false,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"priya","name":"Priya Shah","avatar":null,"color":4,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person","role":"member","share":false,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"ninap","name":"Nina Park","avatar":null,"color":5,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"leom","name":"Leo Martin","avatar":null,"color":1,"verified":"","kind":"person","role":"member","share":false,"joined":"2026-09-01T10:00:00Z","you":false}],"deckList":[{"level":"","subject":"","school":"","schoolId":"","id":"s21","url":"/@alexkim/cells","name":"Cells","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Cells","image":null},"cards":40,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","addedBy":"alexkim","mine":true},{"level":"","subject":"","school":"","schoolId":"","id":"s22","url":"/@devp/membranes","name":"Membranes","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Membranes","image":null},"cards":36,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"theme":"","addedBy":"devp","mine":false},{"level":"college","subject":"biology","school":"University of California-Davis","schoolId":"110644","id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","addedBy":"alexkim","mine":true}],"assignments":[{"id":"a1","sharedId":"s21","goal":"learn","due":"2026-10-02","deck":{"name":"Cells","cover":{"style":"mix","round":0,"seed":"Cells","image":null},"cards":40,"url":"/@alexkim/cells"},"progress":{"mariasantos":{"learned":32,"total":40,"due":3,"remembered":91,"last":"2026-09-28T08:10:00Z","at":"2026-09-28T09:00:00Z"},"samr":{"learned":40,"total":40,"due":0,"remembered":88,"last":"2026-09-27T20:00:00Z","at":"2026-09-28T09:00:00Z"},"priya":{"learned":12,"total":40,"due":5,"remembered":76,"last":"2026-09-25T18:00:00Z","at":"2026-09-28T09:00:00Z"},"ninap":{"learned":0,"total":40,"due":0,"remembered":null,"last":null,"at":"2026-09-28T09:00:00Z"}}},{"id":"a2","sharedId":"s22","goal":"daily","due":"2026-10-09","deck":{"name":"Membranes","cover":{"style":"mix","round":0,"seed":"Membranes","image":null},"cards":36,"url":"/@devp/membranes"},"progress":{"mariasantos":{"learned":20,"total":36,"due":0,"remembered":94,"last":"2026-09-28T08:30:00Z","at":"2026-09-28T09:00:00Z"},"samr":{"learned":18,"total":36,"due":7,"remembered":82,"last":"2026-09-26T21:00:00Z","at":"2026-09-28T09:00:00Z"},"priya":{"learned":9,"total":36,"due":2,"remembered":70,"last":"2026-09-27T17:00:00Z","at":"2026-09-28T09:00:00Z"},"ninap":{"learned":0,"total":36,"due":0,"remembered":null,"last":null,"at":"2026-09-28T09:00:00Z"}}}]},"ORGCHM":{"id":"k2","code":"ORGCHM","name":"Organic Chemistry","school":"UC Davis","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"official":false,"people":7,"decks":2,"me":{"role":"member","share":false,"asked":false},"helpers":[],"members":[{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person","role":"owner","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":true},{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"omar","name":"Omar Haddad","avatar":null,"color":2,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"priya","name":"Priya Shah","avatar":null,"color":4,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false}],"deckList":[{"level":"","subject":"","school":"","schoolId":"","id":"s23","url":"/@drokafor/chapter-3","name":"Chapter 3","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"cards":64,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":"","addedBy":"drokafor","mine":false},{"level":"college","subject":"chemistry","school":"University of California-Davis","schoolId":"110644","id":"s7","url":"/@drokafor/organic-reactions","name":"Organic Reactions","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"stars":1400,"learners":840,"copies":168,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":"","addedBy":"drokafor","mine":false}],"assignments":[{"id":"a3","sharedId":"s23","goal":"learn","due":"2026-10-02","deck":{"name":"Chapter 3","cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"cards":64,"url":"/@drokafor/chapter-3"}},{"id":"a4","sharedId":"s7","goal":"daily","due":"2026-10-06","deck":{"name":"Organic Reactions","cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"url":"/@drokafor/organic-reactions"}}]},"PREMED":{"id":"k3","code":"PREMED","name":"Pre-med study group","school":"UC Davis","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"official":false,"people":12,"decks":4,"invite":true}},"CLASS_LIST":[{"id":"k1","code":"BIOKTZ","name":"BIO 201","school":"UC Davis","role":"owner","share":false,"owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"official":false,"people":8,"decks":3,"assignments":2},{"id":"k2","code":"ORGCHM","name":"Organic Chemistry","school":"UC Davis","role":"member","share":false,"owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"official":false,"people":7,"decks":2,"assignments":2},{"id":"k4","code":"JPNFRK","name":"Japanese N4 study group","school":"","role":"helper","share":false,"owner":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"official":false,"people":5,"decks":1,"assignments":0}],"MY_PROGRESS":{"s23":{"deckId":"orgo","learned":52,"total":64,"due":6,"remembered":88,"last":"2026-09-28T08:00:00Z"},"s7":{"deckId":"orgo","learned":120,"total":256,"due":4,"remembered":91,"last":"2026-09-27T19:00:00Z"}},"ASSIGNED":[{"id":"a3","classId":"k2","className":"Organic Chemistry","code":"ORGCHM","sharedId":"s23","name":"Chapter 3","goal":"learn","due":"2026-10-02","cards":64,"cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"progress":{"deckId":"orgo","learned":52,"total":64,"due":6,"remembered":88,"last":"2026-09-28T08:00:00Z"},"done":false},{"id":"a4","classId":"k2","className":"Organic Chemistry","code":"ORGCHM","sharedId":"s7","name":"Organic Reactions","goal":"daily","due":"2026-10-06","cards":256,"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"progress":{"deckId":"orgo","learned":120,"total":256,"due":4,"remembered":91,"last":"2026-09-27T19:00:00Z"},"done":false}],"ADMIN":{"requests":[{"id":"v1","role":"teacher","school":"UC Davis","contact":"hokafor@ucdavis.edu","at":"2026-09-27T15:00:00Z","person":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"","kind":"person"}},{"id":"v2","role":"school","school":"Davis Senior High School","contact":"https://dshs.djusd.net/staff","at":"2026-09-28T07:40:00Z","person":{"handle":"davishigh","name":"Davis Senior High","avatar":null,"color":2,"verified":"","kind":"person"}}],"reports":[{"id":"r1","kind":"deck","name":"USMLE Step 1 (all of it)","deck":{"level":"","subject":"","school":"","schoolId":"","id":"s30","url":"/@samr/usmle-step-1-all-of-it","name":"USMLE Step 1 (all of it)","description":"","tags":[],"cover":{"style":"mix","round":0,"seed":"USMLE Step 1 (all of it)","image":null},"cards":2400,"stars":90,"learners":54,"copies":11,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"kaiw","name":"Kai Wong","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"person":null,"suggestion":null,"reports":[{"reason":"stolen","note":"These are my Anki cards, word for word.","by":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"at":"2026-09-28T06:00:00Z"},{"reason":"wrong","note":"","by":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"at":"2026-09-27T22:00:00Z"}]},{"id":"r2","kind":"profile","name":"Free Answers (@freeanswers)","deck":null,"person":{"handle":"freeanswers","name":"Free Answers","avatar":null,"color":1,"verified":"","kind":"person"},"suggestion":null,"reports":[{"reason":"spam","note":"Every deck links to a site selling answers.","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"at":"2026-09-28T05:00:00Z"}]},{"id":"r3","kind":"suggestion","name":"Leo Martin: check my page","deck":null,"person":null,"suggestion":{"author":"Leo Martin","message":"check my page for more","n":12,"first":"Get every answer at my page — link in bio","open":true},"reports":[{"reason":"spam","note":"","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"at":"2026-09-26T12:00:00Z"}]}]},"PROFILE":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","bio":"MCAT decks, made with my AI. Suggestions welcome.","schoolId":"110644","school":"University of California-Davis","level":"college","year":"3","showSchool":true,"subject":"Pre-med","followers":340,"following":86,"contributions":23,"featured":["s9","s10"],"stars":7360},"OTHER":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","bio":"Biochem TA. I fix what my students trip on.","school":"University of California-Davis","level":"graduate","year":"","subject":"Biochemistry","followers":1280,"following":140,"contributions":212,"featured":["s1"],"stars":6400},"SCHOOLS":[["110644","University of California-Davis","Davis","CA","UC Davis"],["110635","University of California-Berkeley","Berkeley","CA","UC Berkeley"],["110653","University of California-Irvine","Irvine","CA","UCI UC Irvine"],["110680","University of California-San Diego","La Jolla","CA","UCSD UC San Diego"],["110662","University of California-Los Angeles","Los Angeles","CA","UCLA"],["243744","Stanford University","Stanford","CA"],["166683","Massachusetts Institute of Technology","Cambridge","MA","MIT, M.I.T."],["166027","Harvard University","Cambridge","MA"],["130794","Yale University","New Haven","CT"],["190415","Cornell University","Ithaca","NY"],["193900","New York University","New York","NY"],["228778","The University of Texas at Austin","Austin","TX","UT Austin"],["237358","Davis & Elkins College","Elkins","WV","Davis and Elkins College, D&E College, D&E"],["202435","Davis College (Toledo, OH)","Toledo","OH","Davis University"],["186131","Princeton University","Princeton","NJ"]],"DISCOVER":{"topics":["MCAT","Languages","Computer science","Chemistry","Law","History","Biology"],"sections":[{"id":"popular","title":"Popular this week","decks":["mcat","kanji","algo","pharm"]},{"id":"checked","title":"Checked by teachers","decks":["bio2a","law","orgo","spanish"]},{"id":"new","title":"New","decks":["pharm","algo","spanish","kanji"]}]}};
  // The web sidebar's rail (web/side.js): the board's collapsed Tweak, and its button.
  const SIDE_TIPS = {"today":"Today","library":"Library","discover":"Discover","stats":"Stats","profile":"Profile","news":"News","settings":"Settings"}, side = (collapsed, toggle) => ({ collapsed: collapsed ? 'true' : 'false', sideOpen: collapsed ? 'false' : 'true', sideLabel: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
  tip: collapsed ? SIDE_TIPS : Object.fromEntries(Object.keys(SIDE_TIPS).map(k => [k, ''])), toggleSide: toggle });
  const set = patch => this.setState({ $m: { ...m, ...patch } });
  const X = {"DECKS":[{"id":"cell","name":"Cell Biology","total":"412","due":28,"overdue":12,"soon":0,"fresh":10,"ret":91,"ai":38},{"id":"jlpt","name":"Japanese · JLPT N4","total":"1,280","due":19,"overdue":5,"soon":0,"fresh":20,"ret":87,"ai":0},{"id":"orgo","name":"Organic Chemistry","total":"236","due":11,"overdue":0,"soon":0,"fresh":5,"ret":84,"ai":0},{"id":"hist","name":"US History","total":"158","due":6,"overdue":0,"soon":0,"fresh":0,"ret":93,"ai":0},{"id":"sys","name":"System Design","total":"74","due":0,"overdue":0,"soon":1,"fresh":8,"ret":89,"ai":0},{"id":"span","name":"Spanish Verbs","total":"310","due":0,"overdue":0,"soon":3,"fresh":0,"ret":95,"ai":0}],"TAGS":{"cell":["Biology","MCAT","Year 1","BIO 201","Fall 2026","Midterm","Final exam","Pre-med","Lab","Cells","Must know"],"jlpt":["Languages"],"orgo":["Chemistry","MCAT","Year 1","Pre-med","Fall 2026"],"hist":["History"],"sys":["Computer science"],"span":["Languages"]},"CARDS":[{"id":"k1","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","kind":"Basic","icon":"text","next":"Tomorrow","ai":"","tags":["Energy","Exam 1","Mitochondria","Must know"]},{"id":"k2","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","kind":"Fill in the blank","icon":"blank","next":"Due now","ai":"Claude","tags":["Organelles","Exam 1"]},{"id":"k3","front":"Name structure 1 on the diagram.","back":"Nucleus","kind":"Image","icon":"image","next":"In 3 days","ai":"Claude","tags":["Organelles","Diagrams"]},{"id":"k4","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","kind":"Basic","icon":"text","next":"In 6 days","ai":"","tags":["Organelles"]},{"id":"k5","front":"Say it: ribosome","back":"RY-buh-sohm","kind":"Audio","icon":"audio","next":"Due now","ai":"ChatGPT","tags":["Pronunciation"]},{"id":"k6","front":"What is the role of the ribosome?","back":"Translates mRNA into protein","kind":"Basic","icon":"text","next":"In 12 days","ai":"","tags":["Proteins","Exam 2"]}],"FOLDERS":[{"id":"f1","name":"Languages","decks":["jlpt","span"]},{"id":"f2","name":"Year 1","decks":["orgo","hist"]}],"ALL_CARDS":[["cell","What does the electron transport chain pump across the inner membrane?","Protons (H⁺)","text","Tomorrow","easy",["Energy","Exam 1","Mitochondria","Must know"]],["cell","The ____ is the powerhouse of the cell.","mitochondrion","blank","Due now","hard",["Organelles","Exam 1"]],["jlpt","電車","train (でんしゃ)","text","In 2 days","medium",["Vocabulary"]],["orgo","C₆H₆","Benzene","text","In 5 days","easy",["Aromatics"]],["cell","Name structure 1 on the diagram.","Nucleus","image","In 3 days","medium",["Organelles","Diagrams"]],["hist","Year the Declaration of Independence was signed?","1776","text","In 9 days","easy",["Revolution"]],["span","Yo ____ dos hermanos.","tengo","blank","Due now","hard",["Irregular"]],["sys","What does a load balancer do?","Spreads requests across servers","text","New","new",["Basics"]],["cell","Which organelle packages proteins for secretion?","Golgi apparatus","text","In 6 days","medium",["Organelles"]],["jlpt","学校","school (がっこう)","text","New","new",["Vocabulary"]],["orgo","Markovnikov’s rule says the H goes to…","The carbon with more H’s","text","Due now","hard",["Reactions","Exam 2"]],["cell","Say it: ribosome","RY-buh-sohm","audio","Due now","new",["Pronunciation"]]],"REVIEW":[{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), from the matrix into the intermembrane space.","note":"That gradient powers ATP synthase."},{"kind":"cloze","before":"The","after":"is the powerhouse of the cell.","back":"mitochondrion","note":"It makes most of the cell’s ATP."},{"kind":"image","front":"","back":"Nucleus","note":"Holds the cell’s DNA.","image":"mock","boxes":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}],"box":"b1","occ":"all"},{"kind":"audio","front":"What word do you hear?","back":"train","note":"電 electricity + 車 vehicle.","audio":"mock","backBig":"電車","backSub":"でんしゃ · train"}],"DRAFTS":{"Basic":{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), into the intermembrane space."},"Blank":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].","note":"It makes most of the cell’s ATP."},"Image":{"kind":"image","front":"Name the part of the cell.","back":"","image":"mock","boxes":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}],"occ":"one"},"Audio":{"kind":"audio","back":"電車 (でんしゃ): train","audio":"mock"}},"DUE_7":{"vals":[32,18,24,12,30,8,16],"labels":["Wed","Thu","Fri","Sat","Sun","Mon","Tue"],"tops":null,"names":["tomorrow","Thursday","Friday","Saturday","Sunday","Monday","Tuesday"]},"DUE_14":{"vals":[32,18,24,12,30,8,16,22,14,26,10,20,6,12],"labels":["23","24","25","26","27","28","29","30","1","2","3","4","5","6"],"tops":["W","T","F","S","S","M","T","W","T","F","S","S","M","T"],"names":["tomorrow","Thu 24","Fri 25","Sat 26","Sun 27","Mon 28","Tue 29","Wed 30","Thu, Oct 1","Fri, Oct 2","Sat, Oct 3","Sun, Oct 4","Mon, Oct 5","Tue, Oct 6"]},"BOXES":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}]}, WAVE = [0.05,0.05,0.05,0.07,0.08,0.11,0.1,0.13,0.16,0.22,0.22,0.21,0.3,0.4,0.38,0.34,0.45,0.59,0.55,0.51,0.57,0.74,0.67,0.7,0.65,0.79,0.7,0.87,0.81,0.74,0.7,0.92,0.85,0.64,0.66,0.82,0.76,0.54,0.52,0.62,0.56,0.38,0.34,0.39,0.35,0.26,0.24,0.21,0.19,0.16,0.15,0.14,0.18,0.25,0.32,0.29,0.29,0.43,0.53,0.47,0.43,0.58,0.7,0.59,0.56,0.62,0.73,0.58,0.64,0.53,0.62,0.5,0.6,0.49,0.43,0.4,0.46,0.37,0.26,0.26,0.28,0.22,0.14,0.13,0.14,0.1,0.07,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], LS = {"code":"482913","codeShown":"482 913","joinText":"lucida.cards/join","qr":"fe6eb3fc16df906e81eebb74ff75dbad392ec112cd07faaaafe000ee00aa4a689102507264c5110f6292c92ae994e5aa8205a64eebbb7e8ec92a8bb25f5b6bd0336aaf30a6d982e6aa3d94f800760c5ff88aeb704ffd1abaa24f9dd2f085eeb996730495bc2fef3fe98","me":"Jordan","people":["Maya","Jordan","Priya","Leo","Sofia","Ethan","Ana","Kai","Zoe","Omar","Lina","Noah"],"deck":{"name":"Cell Biology","seed":"Cell Biology","style":"mix","round":0,"bg":{"kind":"deck","image":null}},"q":{"text":"Which organelle packages proteins for secretion?","options":["Golgi apparatus","Lysosome","Nucleus","Ribosome"],"right":0,"counts":[7,2,1,2]},"pic":{"text":"What’s under box 2?","options":["Nucleus","Mitochondrion","Vacuole","Lysosome"],"right":1,"counts":[2,8,1,1]},"board":[["Maya",3420,1],["Jordan",3210,2],["Kai",2980,-1],["Priya",2860,0],["Leo",2640,3],["Sofia",2210,-1],["Ethan",1980,0],["Ana",1640,0],["Zoe",1420,1],["Omar",1210,-1],["Lina",980,0],["Noah",620,0]],"final":[["Maya",9610],["Jordan",8940],["Kai",8120],["Priya",7860],["Leo",7420],["Sofia",6980],["Ethan",6540],["Ana",6110]]}, INSIGHTS = {"Week":{"days":7,"reviews":302,"memory":{"retention":{"n":240,"pct":92},"byMonth":false,"trend":[{"start":1783314000000,"pct":86,"n":180},{"start":1783918800000,"pct":88,"n":186},{"start":1784523600000,"pct":87,"n":192},{"start":1785128400000,"pct":89,"n":198},{"start":1785733200000,"pct":90,"n":204},{"start":1786338000000,"pct":88,"n":210},{"start":1786942800000,"pct":91,"n":216},{"start":1787547600000,"pct":90,"n":222},{"start":1788152400000,"pct":92,"n":228},{"start":1788757200000,"pct":91,"n":234},{"start":1789362000000,"pct":93,"n":240},{"start":1789966800000,"pct":91,"n":246}],"byTag":[{"tag":"Vocabulary","pct":92,"n":73,"cards":140},{"tag":"Organelles","pct":88,"n":33,"cards":64},{"tag":"Exam 1","pct":90,"n":28,"cards":40},{"tag":"Energy","pct":93,"n":23,"cards":31},{"tag":"Irregular","pct":76,"n":21,"cards":45},{"tag":"Proteins","pct":84,"n":15,"cards":28},{"tag":"Mitochondria","pct":79,"n":14,"cards":22},{"tag":"Reactions","pct":71,"n":12,"cards":24},{"tag":"Pronunciation","pct":95,"n":9,"cards":18},{"tag":"Aromatics","pct":86,"n":9,"cards":20}],"improved":[{"tag":"Energy","before":85,"after":93,"delta":8,"n":96},{"tag":"Vocabulary","before":88,"after":92,"delta":4,"n":310},{"tag":"Exam 1","before":87,"after":90,"delta":3,"n":120}],"slipping":[{"tag":"Reactions","before":80,"after":71,"delta":-9,"n":52},{"tag":"Irregular","before":82,"after":76,"delta":-6,"n":88},{"tag":"Mitochondria","before":84,"after":79,"delta":-5,"n":58}],"modes":{"cards":{"n":302,"pct":88},"learn":{"n":73,"pct":76}}},"weak":{"weakTags":[{"tag":"Reactions","pct":71,"n":12,"cards":24},{"tag":"Irregular","pct":76,"n":21,"cards":45},{"tag":"Mitochondria","pct":79,"n":14,"cards":22},{"tag":"Proteins","pct":84,"n":15,"cards":28},{"tag":"Aromatics","pct":86,"n":9,"cards":20},{"tag":"Organelles","pct":88,"n":33,"cards":64}],"hardest":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html"},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html"},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html"},{"id":"h3","deckId":"jlpt","front":"電車","back":"train (でんしゃ)","deck":"Japanese · JLPT N4","lapses":5,"d":7.9,"recall":0.77,"href":"WebCardsScreen.dc.html"},{"id":"h4","deckId":"cell","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","deck":"Cell Biology","lapses":4,"d":7.4,"recall":0.8200000000000001,"href":"WebCardsScreen.dc.html"}],"leeches":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html","paused":true},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html","paused":false},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html","paused":false}],"forgot":{"n":22,"of":240,"pct":9},"lapseDist":[{"label":"0","n":1420},{"label":"1","n":480},{"label":"2","n":210},{"label":"3–4","n":120},{"label":"5–7","n":46},{"label":"8+","n":12}],"diffDist":[{"label":"1","n":180},{"label":"2","n":320},{"label":"3","n":460},{"label":"4","n":520},{"label":"5","n":410},{"label":"6","n":300},{"label":"7","n":190},{"label":"8","n":110},{"label":"9","n":60}],"studied":2288},"pace":{"time":{"n":302,"perCard":8.2,"perRight":9.4,"rightPerMin":6.4,"minutes":41,"learnN":73,"perQuestion":11.6},"gaps":[{"start":1783314000000,"days":4,"n":120},{"start":1783918800000,"days":5,"n":120},{"start":1784523600000,"days":6,"n":120},{"start":1785128400000,"days":6,"n":120},{"start":1785733200000,"days":8,"n":120},{"start":1786338000000,"days":9,"n":120},{"start":1786942800000,"days":10,"n":120},{"start":1787547600000,"days":12,"n":120},{"start":1788152400000,"days":13,"n":120},{"start":1788757200000,"days":15,"n":120},{"start":1789362000000,"days":16,"n":120},{"start":1789966800000,"days":18,"n":120}],"gapNow":18,"ahead":[{"start":1790053200000,"n":212},{"start":1790658000000,"n":168},{"start":1791262800000,"n":140},{"start":1791867600000,"n":126},{"start":1792472400000,"n":98},{"start":1793077200000,"n":90},{"start":1793685600000,"n":72},{"start":1794290400000,"n":64}],"exams":[{"deckId":"cell","name":"Cell Biology","days":12,"date":"2026-10-04","total":412,"seen":380,"learned":334,"toReview":84,"likely":0.74,"line":"Exam in 12 days · 84 cards to review first"}]}},"Month":{"days":30,"reviews":1284,"memory":{"retention":{"n":1020,"pct":91},"byMonth":false,"trend":[{"start":1783314000000,"pct":86,"n":180},{"start":1783918800000,"pct":88,"n":186},{"start":1784523600000,"pct":87,"n":192},{"start":1785128400000,"pct":89,"n":198},{"start":1785733200000,"pct":90,"n":204},{"start":1786338000000,"pct":88,"n":210},{"start":1786942800000,"pct":91,"n":216},{"start":1787547600000,"pct":90,"n":222},{"start":1788152400000,"pct":92,"n":228},{"start":1788757200000,"pct":91,"n":234},{"start":1789362000000,"pct":93,"n":240},{"start":1789966800000,"pct":91,"n":246}],"byTag":[{"tag":"Vocabulary","pct":92,"n":310,"cards":140},{"tag":"Organelles","pct":88,"n":142,"cards":64},{"tag":"Exam 1","pct":90,"n":120,"cards":40},{"tag":"Energy","pct":93,"n":96,"cards":31},{"tag":"Irregular","pct":76,"n":88,"cards":45},{"tag":"Proteins","pct":84,"n":64,"cards":28},{"tag":"Mitochondria","pct":79,"n":58,"cards":22},{"tag":"Reactions","pct":71,"n":52,"cards":24},{"tag":"Pronunciation","pct":95,"n":40,"cards":18},{"tag":"Aromatics","pct":86,"n":40,"cards":20}],"improved":[{"tag":"Energy","before":85,"after":93,"delta":8,"n":96},{"tag":"Vocabulary","before":88,"after":92,"delta":4,"n":310},{"tag":"Exam 1","before":87,"after":90,"delta":3,"n":120}],"slipping":[{"tag":"Reactions","before":80,"after":71,"delta":-9,"n":52},{"tag":"Irregular","before":82,"after":76,"delta":-6,"n":88},{"tag":"Mitochondria","before":84,"after":79,"delta":-5,"n":58}],"modes":{"cards":{"n":1284,"pct":88},"learn":{"n":310,"pct":76}}},"weak":{"weakTags":[{"tag":"Reactions","pct":71,"n":52,"cards":24},{"tag":"Irregular","pct":76,"n":88,"cards":45},{"tag":"Mitochondria","pct":79,"n":58,"cards":22},{"tag":"Proteins","pct":84,"n":64,"cards":28},{"tag":"Aromatics","pct":86,"n":40,"cards":20},{"tag":"Organelles","pct":88,"n":142,"cards":64}],"hardest":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html"},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html"},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html"},{"id":"h3","deckId":"jlpt","front":"電車","back":"train (でんしゃ)","deck":"Japanese · JLPT N4","lapses":5,"d":7.9,"recall":0.77,"href":"WebCardsScreen.dc.html"},{"id":"h4","deckId":"cell","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","deck":"Cell Biology","lapses":4,"d":7.4,"recall":0.8200000000000001,"href":"WebCardsScreen.dc.html"}],"leeches":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html","paused":true},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html","paused":false},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html","paused":false}],"forgot":{"n":92,"of":1020,"pct":9},"lapseDist":[{"label":"0","n":1420},{"label":"1","n":480},{"label":"2","n":210},{"label":"3–4","n":120},{"label":"5–7","n":46},{"label":"8+","n":12}],"diffDist":[{"label":"1","n":180},{"label":"2","n":320},{"label":"3","n":460},{"label":"4","n":520},{"label":"5","n":410},{"label":"6","n":300},{"label":"7","n":190},{"label":"8","n":110},{"label":"9","n":60}],"studied":2288},"pace":{"time":{"n":1284,"perCard":8.2,"perRight":9.4,"rightPerMin":6.4,"minutes":175,"learnN":310,"perQuestion":11.6},"gaps":[{"start":1783314000000,"days":4,"n":120},{"start":1783918800000,"days":5,"n":120},{"start":1784523600000,"days":6,"n":120},{"start":1785128400000,"days":6,"n":120},{"start":1785733200000,"days":8,"n":120},{"start":1786338000000,"days":9,"n":120},{"start":1786942800000,"days":10,"n":120},{"start":1787547600000,"days":12,"n":120},{"start":1788152400000,"days":13,"n":120},{"start":1788757200000,"days":15,"n":120},{"start":1789362000000,"days":16,"n":120},{"start":1789966800000,"days":18,"n":120}],"gapNow":18,"ahead":[{"start":1790053200000,"n":212},{"start":1790658000000,"n":168},{"start":1791262800000,"n":140},{"start":1791867600000,"n":126},{"start":1792472400000,"n":98},{"start":1793077200000,"n":90},{"start":1793685600000,"n":72},{"start":1794290400000,"n":64}],"exams":[{"deckId":"cell","name":"Cell Biology","days":12,"date":"2026-10-04","total":412,"seen":380,"learned":334,"toReview":84,"likely":0.74,"line":"Exam in 12 days · 84 cards to review first"}]}},"Year":{"days":365,"reviews":14854,"memory":{"retention":{"n":11800,"pct":90},"byMonth":true,"trend":[{"start":1759294800000,"pct":84,"n":1152},{"start":1761973200000,"pct":85,"n":1155},{"start":1764568800000,"pct":87,"n":1161},{"start":1767247200000,"pct":86,"n":1158},{"start":1769925600000,"pct":88,"n":1164},{"start":1772344800000,"pct":87,"n":1161},{"start":1775019600000,"pct":89,"n":1167},{"start":1777611600000,"pct":90,"n":1170},{"start":1780290000000,"pct":88,"n":1164},{"start":1782882000000,"pct":90,"n":1170},{"start":1785560400000,"pct":91,"n":1173},{"start":1788238800000,"pct":91,"n":1173}],"byTag":[{"tag":"Vocabulary","pct":92,"n":3586,"cards":140},{"tag":"Organelles","pct":88,"n":1643,"cards":64},{"tag":"Exam 1","pct":90,"n":1388,"cards":40},{"tag":"Energy","pct":93,"n":1111,"cards":31},{"tag":"Irregular","pct":76,"n":1018,"cards":45},{"tag":"Proteins","pct":84,"n":740,"cards":28},{"tag":"Mitochondria","pct":79,"n":671,"cards":22},{"tag":"Reactions","pct":71,"n":602,"cards":24},{"tag":"Pronunciation","pct":95,"n":463,"cards":18},{"tag":"Aromatics","pct":86,"n":463,"cards":20}],"improved":[{"tag":"Energy","before":85,"after":93,"delta":8,"n":96},{"tag":"Vocabulary","before":88,"after":92,"delta":4,"n":310},{"tag":"Exam 1","before":87,"after":90,"delta":3,"n":120}],"slipping":[{"tag":"Reactions","before":80,"after":71,"delta":-9,"n":52},{"tag":"Irregular","before":82,"after":76,"delta":-6,"n":88},{"tag":"Mitochondria","before":84,"after":79,"delta":-5,"n":58}],"modes":{"cards":{"n":14854,"pct":88},"learn":{"n":3586,"pct":76}}},"weak":{"weakTags":[{"tag":"Reactions","pct":71,"n":602,"cards":24},{"tag":"Irregular","pct":76,"n":1018,"cards":45},{"tag":"Mitochondria","pct":79,"n":671,"cards":22},{"tag":"Proteins","pct":84,"n":740,"cards":28},{"tag":"Aromatics","pct":86,"n":463,"cards":20},{"tag":"Organelles","pct":88,"n":1643,"cards":64}],"hardest":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html"},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html"},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html"},{"id":"h3","deckId":"jlpt","front":"電車","back":"train (でんしゃ)","deck":"Japanese · JLPT N4","lapses":5,"d":7.9,"recall":0.77,"href":"WebCardsScreen.dc.html"},{"id":"h4","deckId":"cell","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","deck":"Cell Biology","lapses":4,"d":7.4,"recall":0.8200000000000001,"href":"WebCardsScreen.dc.html"}],"leeches":[{"id":"h0","deckId":"orgo","front":"Markovnikov’s rule says the H goes to…","back":"The carbon with more H’s","deck":"Organic Chemistry","lapses":9,"d":9.1,"recall":0.62,"href":"WebCardsScreen.dc.html","paused":true},{"id":"h1","deckId":"span","front":"Yo ____ dos hermanos.","back":"tengo","deck":"Spanish Verbs","lapses":8,"d":8.7,"recall":0.67,"href":"WebCardsScreen.dc.html","paused":false},{"id":"h2","deckId":"cell","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","deck":"Cell Biology","lapses":8,"d":8.2,"recall":0.72,"href":"WebCardsScreen.dc.html","paused":false}],"forgot":{"n":1062,"of":11800,"pct":9},"lapseDist":[{"label":"0","n":1420},{"label":"1","n":480},{"label":"2","n":210},{"label":"3–4","n":120},{"label":"5–7","n":46},{"label":"8+","n":12}],"diffDist":[{"label":"1","n":180},{"label":"2","n":320},{"label":"3","n":460},{"label":"4","n":520},{"label":"5","n":410},{"label":"6","n":300},{"label":"7","n":190},{"label":"8","n":110},{"label":"9","n":60}],"studied":2288},"pace":{"time":{"n":14854,"perCard":8.2,"perRight":9.4,"rightPerMin":6.4,"minutes":2025,"learnN":3586,"perQuestion":11.6},"gaps":[{"start":1759294800000,"days":3,"n":400},{"start":1761973200000,"days":4,"n":400},{"start":1764568800000,"days":5,"n":400},{"start":1767247200000,"days":6,"n":400},{"start":1769925600000,"days":7,"n":400},{"start":1772344800000,"days":9,"n":400},{"start":1775019600000,"days":10,"n":400},{"start":1777611600000,"days":12,"n":400},{"start":1780290000000,"days":13,"n":400},{"start":1782882000000,"days":15,"n":400},{"start":1785560400000,"days":17,"n":400},{"start":1788238800000,"days":18,"n":400}],"gapNow":18,"ahead":[{"start":1790053200000,"n":212},{"start":1790658000000,"n":168},{"start":1791262800000,"n":140},{"start":1791867600000,"n":126},{"start":1792472400000,"n":98},{"start":1793077200000,"n":90},{"start":1793685600000,"n":72},{"start":1794290400000,"n":64}],"exams":[{"deckId":"cell","name":"Cell Biology","days":12,"date":"2026-10-04","total":412,"seen":380,"learned":334,"toReview":84,"likely":0.74,"line":"Exam in 12 days · 84 cards to review first"}]}}};
  const caught = !!p.caughtUp;
  const byName = { 'Four buttons': 'four', 'Check or X': 'binary', 'Piles': 'piles' };
  const ed = m.deck || {};
  // Pro's sample: Cell Biology has an exam on Sunday, October 4 (12 days after the sample's Tuesday, September 22), and
  // the usual rule for cards you keep forgetting. Picking another day here moves it.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const examDay = 'exam' in ed ? ed.exam : p.free ? null : '2026-10-04';
  const examIn = examDay ? Math.round((new Date(examDay + 'T12:00:00') - new Date(2026, 8, 22, 12)) / 86400000) : null;
  const exam = examDay && examIn >= 0 ? { days: examIn, date: examDay, day: MON[+examDay.slice(5, 7) - 1] + ' ' + +examDay.slice(8, 10), total: 412, seen: 380, learned: 334, toReview: 84, likely: .74,
    when: examIn === 0 ? 'Exam today' : examIn === 1 ? 'Exam tomorrow' : 'Exam in ' + examIn + ' days', line: (examIn === 0 ? 'Exam today' : examIn === 1 ? 'Exam tomorrow' : 'Exam in ' + examIn + ' days') + ' · 84 cards to review first' } : null;
  const pausedIds = m.paused || (p.paused ? { k1: true } : {});
  const deck = () => ({ id: 'cell', name: ed.name ?? 'Cell Biology', tags: ed.tags || X.TAGS.cell, seed: 'Cell Biology', cover: { style: 'mix', round: 0, image: null, ...(ed.cover || {}) },
    paused: !!ed.paused, grading: ed.grading || byName[p.grading] || 'four', fsrs: ed.fsrs ?? (p.fsrs !== false), goal: ed.goal ?? 90, gapIdx: ed.gapIdx ?? 3, steps: ed.steps || ['1m', '10m'], perDay: ed.perDay ?? 20,
    total: 412, totalLabel: '412', due: 28, fresh: 10, ret: 91, aiCount: 38, forecast: [28, 14, 20, 9, 24, 6, 12], piles: m.piles || [{ name: 'Know it', n: 18 }, { name: 'Almost', n: 6 }, { name: 'No clue', n: 3 }],
    href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', newCardHref: 'WebCardsScreenNew.dc.html', folder: null, bg: ed.bg || { kind: 'deck', image: null },
    exam, examDay: examDay || '', leechAt: ed.leechAt ?? 8, leechAct: ed.leechAct ?? 'tag',
    // Sharing (Tweaks: shared, linked): shared by you, or from Maria (studied as it is, or a copy with her changes waiting).
    ...(() => { const sv = m.share ? m.share.vis : p.shared === 'Public' ? 'public' : p.shared === 'Link only' ? 'link' : 'private', lk = m.detached ? '' : p.linked;
      // Its labels (level, subject, school): Cell Biology's own, and what you pick in its Sharing settings.
      return { shared: sv !== 'private' && !lk ? { vis: sv, id: 's9', url: '/@alexkim/cell-biology', label: sv === 'public' ? 'Public' : 'Link only', labels: { level: 'college', subject: 'biology', schoolId: '110644', school: 'University of California-Davis', ...((m.share && m.share.labels) || {}) } } : null,
        link: lk ? { mode: lk, gone: false, id: 's1', owner: { name: 'Maria Santos', handle: 'mariasantos' }, url: '/@mariasantos/mcat-biochemistry', pending: lk === 'copy' && !m.took ? 3 : 0, updates: m.upd ?? true } : null,
        readOnly: lk === 'study' }; })() });
  const idx = m.idx ?? (({ 'Fill in the blank': 1, Image: 2, Audio: 3 })[p.card] || 0);
  // Profile picture (the Settings boards' photo setting): the Google photo, your own, or the color; the canvas draws
  // stand-ins for the photos.
  const st = { name: 'Alex Kim', sub: 'Signed in with Google · alex@gmail.com', signedIn: true, google: true, photo: ({ 'Google photo': 'google', 'Your photo': 'yours' })[p.photo] || 'color', yourPhoto: p.photo === 'Your photo' ? 'mock' : null, color: 0,
    look: 'system', darkMode: p.dim ? 'gray' : 'black', grads: 'mix', prog: ({ Bar: 'bar', Counts: 'counts', None: 'none' })[p.progress] || 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, check: true, reminder: '9:00 AM',
    // Settings › Theme (Pro): the Theme boards say which is picked (props.theme).
    theme: p.theme || 'lucida', themeProfile: true, ...(m.settings || {}) };
  // Your profile picture in a theme: the theme a board shows (props.skin) or the one picked here (see skin() in build.mjs).
  const skinned = () => this.skinFor(p.skin || (st.theme !== 'lucida' ? st.theme : ''));
  const perms = { read: true, text: true, media: true, edit: true, check: true, del: false, ...(m.perms || {}) };
  const noop = () => {};
  // In the Library, System Design is shared (Public) and Spanish Verbs is a copy of Maria's deck.
  const LIB_NET = { sys: { shared: { vis: 'public', id: 's10', url: '/@alexkim/system-design', label: 'Public' } },
    span: { link: { mode: 'copy', gone: false, id: 's8', owner: { name: 'Maria Santos', handle: 'mariasantos' }, url: '/@mariasantos/spanish-b1', pending: 0, updates: true } } };
  // Folders you make or change here stay on this board.
  const folders = () => m.folders || X.FOLDERS;
  const folderOf = id => (m.moved && id in m.moved ? m.moved[id] : (folders().find(f => (f.decks || []).includes(id)) || {}).id || null);
  // Decks and cards you drag here keep their new order (and cards their new deck) on this board.
  const order = m.deckOrder || X.DECKS.map(d => d.id), inOrder = () => order.map(id => X.DECKS.find(d => d.id === id));
  const before = (list, id, b) => { const l = list.filter(x => x !== id), at = b ? l.indexOf(b) : -1; l.splice(at < 0 ? l.length : at, 0, id); return l; };
  const cardDeck = m.cardDeck || {}, cardOrder = m.cardOrder || X.CARDS.map(c => c.id), aiDone = m.aiDone || {};
  // Live's sample room (the boards' props pick what it shows: an empty lobby, a picture question, the answer, the end).
  const livePerson = name => ({ id: 'p' + LS.people.indexOf(name), name, color: LS.people.indexOf(name) % 5 });
  // The sample's QR code (29 by 29 modules), drawn the way web/qr.js draws one, with a margin of 2.
  const liveQr = () => { const bits = [...LS.qr].map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join(''), n = 29; let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (bits[y * n + x] === '1') d += 'M' + (x + 2) + ' ' + (y + 2) + 'h1v1h-1z';
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><rect width="33" height="33" fill="#FFFFFF"/><path d="' + d + '" fill="#000000"/></svg>'); };
  const liveQ = p.image ? LS.pic : LS.q;
  // Jordan's phone: before question 3 he had 2,340 points, and a right answer made it 3,210.
  const liveRight = !p.wrong && !p.timeUp, jordan = p.final ? 8940 : liveRight ? 3210 : 2340;
  const liveRows = (p.final ? LS.final : LS.board.map(([name, score]) => [name, name === LS.me ? jordan : score])).slice().sort((a, b) => b[1] - a[1]);
  return {
    mock: true,
    // The canvas asks nothing and says nothing: a board shows a question or a message open through its Tweaks (design/ui.mjs).
    ask: () => Promise.resolve(false), say: noop,
    // The school list (web/schools.json): the sample's few schools, found by the words they start with.
    schools: { find: q => { const w = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      return w.length ? N.SCHOOLS.filter(r => w.every(x => (r[1] + ' ' + r[2] + ' ' + r[3] + ' ' + (r[4] || '')).toLowerCase().split(/[^a-z0-9]+/).some(y => y.startsWith(x)))) : []; } },
    // Pro: on for the canvas's boards, off for the ones that show Free (their free or plan setting).
    pro: () => !(p.free || p.plan === 'Free'),
    chrome: () => { const S = skinned(), color = st.photo === 'color', col = m.collapsed ?? !!p.collapsed;
      return { nav: { today: caught ? '' : '64', news: m.read ? '' : '2', hasNews: !m.read, ...side(col, () => set({ collapsed: !col })) }, me: { bg: S && color ? 'transparent' : 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A', color: color && !S, photo: '', sampleGoogle: st.photo === 'google', sampleYours: st.photo === 'yours',
        href: 'WebProfile.dc.html', skinned: !!S, art: S ? S.me('A', !color) : null } }; },
    settings: () => st,
    theme: () => (st.theme && st.theme !== 'lucida' ? st.theme : ''),
    tags: () => [],
    decks: () => inOrder().map(d => ({ d, i: X.DECKS.indexOf(d) })).map(({ d, i }) => ({ ...d, name: d.name, tags: X.TAGS[d.id], seed: d.name, style: null, image: null, totalLabel: d.total, paused: false, folder: folderOf(d.id), bg: { kind: 'deck', image: null },
      due: caught ? 0 : d.due, overdue: caught ? 0 : d.overdue, soon: caught ? (d.soon || [1, 1, 2, 3, 1, 3][i]) : d.soon, exam: d.id === 'cell' ? exam : null,
      href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', shared: null, link: null, readOnly: false, ...(LIB_NET[d.id] || {}) })),
    deck,
    folders: () => folders().map(f => { const ds = inOrder().filter(d => folderOf(d.id) === f.id);
      return { id: f.id, name: f.name, n: ds.length, due: caught ? 0 : ds.reduce((n, d) => n + d.due, 0), decks: ds.map(d => ({ ...d, seed: d.name, style: null, round: 0 })), href: 'WebLibraryFolder.dc.html' }; }),
    // Three of the sample cards are ones you keep forgetting; Markovnikov's rule is paused.
    allCards: () => X.ALL_CARDS.map(([was, front, back, icon, next, level, tags], i) => { const deckId = cardDeck['a' + i] || was, d = X.DECKS.find(x => x.id === deckId), id = 'a' + i, paused = pausedIds[id] ?? i === 10;
      return { id, kind: '', icon, front, back, tags, next: paused ? 'Paused' : next, level, deckId, deckName: d.name, seed: d.name, style: null, round: 0, folder: folderOf(deckId), href: 'WebCardsScreen.dc.html', paused, leech: [1, 6, 10].includes(i) }; }),
    searchDecks: q => X.DECKS.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
    // Prop aiWaiting: the sample's AI cards wait for you to keep or toss them (the Suggestions boards).
    cards: () => cardOrder.map(id => X.CARDS.find(r => r.id === id)).filter(r => (!cardDeck[r.id] || cardDeck[r.id] === 'cell') && aiDone[r.id] !== 'tossed')
      .map(r => ({ ...r, href: 'WebCardsScreen.dc.html', paused: !!pausedIds[r.id], next: pausedIds[r.id] ? 'Paused' : r.next, ...(p.aiWaiting && r.ai && !aiDone[r.id] ? { pending: true, next: 'Waiting for you' } : {}) })),
    // A sample card, for the editor boards that open one to edit (their cardId setting).
    card: id => { const r = X.CARDS.find(c => c.id === id); if (!r) return null;
      const kind = { text: 'basic', blank: 'cloze', image: 'image', audio: 'audio' }[r.icon], d = X.DRAFTS[{ basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' }[kind]];
      return { ...d, id, kind, tags: r.tags, note: '', front: kind === 'cloze' ? '' : r.front, back: kind === 'image' ? '' : r.back, text: kind === 'cloze' ? r.front.replace('____', '[[' + r.back + ']]') : '', paused: !!pausedIds[id], clozeMode: 'each' }; },
    // What a memory goal costs Cell Biology: about 32 reviews a day at 90%.
    workload: (id, g) => 22 * (Math.pow(0.9, -2) - 1) / (Math.pow(g / 100, -2) - 1) * (2 - g / 100) / 1.1 + 10,
    // Tune to you, tuned to 1,240 reviews (the Settings boards' tune setting shows the other states).
    tuneInfo: () => { const k = m.tune || ({ Off: 'off', 'Not enough reviews': 'few', Tuning: 'busy' })[p.tune] || 'on';
      return { pro: !(p.free || p.plan === 'Free'), on: k === 'on', tuned: k === 'on' || k === 'off', reviews: k === 'few' ? 212 : 1240, need: 400, can: k !== 'few', busy: k === 'busy', progress: .4, error: '', n: 1240 }; },
    insights: range => INSIGHTS[range] || INSIGHTS.Month,
    updatesOf: () => (p.linked === 'copy' && !m.took ? [
      { card: 'u1', op: 'edit', kind: 'answer', mine: false, before: { q: 'Which enzyme is the rate-limiting step of glycolysis?', a: 'Hexokinase' }, after: { q: 'Which enzyme is the rate-limiting step of glycolysis?', a: 'Phosphofructokinase-1 (PFK-1)' } },
      { card: 'u2', op: 'add', kind: 'new', mine: false, before: null, after: { q: 'What activates PFK-1?', a: 'AMP and fructose-2,6-bisphosphate' } },
      { card: 'u3', op: 'edit', kind: 'typo', mine: true, before: { q: 'Where is ATP made?', a: 'In the mitochondria (my notes)' }, after: { q: 'Where is ATP made?', a: 'Mostly in the mitochondria' } }] : []),
    draft: type => ({ tags: ['Energy', 'Exam 1'], front: '', back: '', text: '', note: '', image: null, audio: null, speak: '', auto: true, ...X.DRAFTS[type] }),
    today: () => ({ date: 'Tuesday, September 22', streak: 12, best: 31, due: caught ? 0 : 64, minutes: 11, fresh: 10, next: { day: 'tomorrow', n: 32 },
      week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => ({ d, done: i < 2, today: i === 1 })), forecast: X.DUE_7, newCardHref: 'WebCardsScreenNew.dc.html', studyHref: 'WebReview.dc.html' }),
    review: () => {
      const c = X.REVIEW[idx % X.REVIEW.length], d = deck(), done = 12 + idx, left = 64 - done;
      const scale = (Math.pow(d.goal / 100, -2) - 1) / (Math.pow(0.9, -2) - 1), gaps = [30, 90, 180, 365, 730, 1825, 3650], maxGap = gaps[d.gapIdx];
      const days = b => Math.min(maxGap, Math.max(1, Math.round(b * scale)));
      const fmt = n => (n < 30 ? n + 'd' : n < 365 ? Math.round(n / 3) / 10 + 'mo' : Math.round(n / 36.5) / 10 + 'y');
      const hardD = days(2), goodD = Math.min(maxGap, Math.max(hardD + 1, days(4))), easyD = Math.min(maxGap, Math.max(goodD + 1, days(9)));
      return { empty: false, deckId: 'cell', card: { id: 'r' + idx, ...c }, done, left, total: 64, queue: { basic: 'rev', cloze: 'new', image: 'new', audio: 'learn' }[c.kind],
        counts: { new: 8, learn: 3, rev: Math.max(left - 11, 0) }, iv: { again: d.steps[0], hard: fmt(hardD), good: fmt(goodD), easy: fmt(easyD) },
        mode: d.grading, fsrsOn: d.grading !== 'piles' && d.fsrs, piles: d.piles, prog: st.prog, editHref: 'WebCardsScreen.dc.html' };
    },
    session: () => ({ pct: 91, goal: 90, cards: 40, minutes: 12, fresh: 3, split: [3, 5, 25, 7], splitW: ['8%', '12%', '62%', '18%'], streak: 13, next: 'Tomorrow · 32', moreHref: 'WebReview.dc.html',
      sorted: 12, piles: [{ name: 'Know it', n: 7, total: 18 }, { name: 'Almost', n: 3, total: 6 }, { name: 'No clue', n: 2, total: 3 }], onlyPiles: false }),
    stats: () => ({ streak: 12, best: 31, reviews: '1,284', cards: '2,470', ai: 312, remembered: 90, goal: 90, heat: null, forecast: X.DUE_14,
      byDeck: X.DECKS.map(d => ({ name: d.name, ret: d.ret })) }),
    ai: () => ({ url: 'https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ', perms, clients: { claude: true, openai: true, cursor: false, mcp: false }, connected: 'Claude, ChatGPT' }),
    // Sound: the sample clip, a little way in (paused, or playing on the boards that say so). Play and the waveform work.
    sound: c => ({ key: c && (c.audio || c.speak) ? 'mock' : '', peaks: WAVE, dur: 2.6, speech: !!c && !c.audio, on: m.playing ?? !!p.playing, frac: m.frac ?? .42, busy: false }),
    // The Recording boards: a clip being recorded, 3 seconds in.
    recording: () => ((p.recording && !m.recStop) || m.rec ? { saving: false, levels: Array.from({ length: 70 }, (_, i) => WAVE[(i * 3 + 30) % 96]), level: .55, secs: 3.4 } : null),
    liveSets: () => [{ id: 'new', label: 'New', n: 10 }, { id: 'hard', label: 'Hard', n: 36 }, { id: 'tag:Exam 1', label: 'Exam 1', n: 40 }, { id: 'all', label: 'All', n: 412 }],
    live: () => { const people = p.empty ? [] : LS.people.map(livePerson);
      return { code: LS.code, codeShown: LS.codeShown, joinText: LS.joinText, qr: liveQr(), deck: LS.deck, deckId: 'cell', phase: p.final ? 'end' : p.reveal ? 'reveal' : 'question', status: '',
        people, here: people.length, n: 3, of: 10,
        q: { text: liveQ.text, options: liveQ.options, right: p.reveal ? liveQ.right : null, counts: p.reveal ? liveQ.counts : null, image: p.image ? 'mock' : '', occ: p.image ? { boxes: X.BOXES, ask: 1, mode: 'all' } : null },
        answered: 9, playing: 12, got: 7, timer: { left: 14, dur: 20, delay: 0, frac: .3 },
        board: (p.final ? LS.final : LS.board).map(([name, score, move]) => ({ ...livePerson(name), score, move: p.final ? null : move })), last: false };
    },
    join: () => {
      const pick = p.timeUp ? -1 : p.wrong ? 1 : 0, rank = liveRows.findIndex(r => r[0] === LS.me) + 1;
      return { form: { code: m.joinCode ?? LS.code, name: m.joinName ?? LS.me, error: p.notFound ? 'No game with that code' : '', busy: false },
        phase: p.late ? 'late' : p.final ? 'final' : 'waiting', deck: LS.deck, n: 3, of: 10, promo: true,
        me: { ...livePerson(LS.me), score: p.final ? jordan : 2340, streak: liveRight ? 3 : 0, rank, right: 8, played: 10 },
        q: { text: LS.q.text, options: LS.q.options, right: LS.q.right }, pick: m.livePick ?? (p.picked ? 1 : null), timer: { left: 14, dur: 20, delay: 0, frac: .7 },
        result: { ok: liveRight, timeUp: !!p.timeUp, pick: pick >= 0 ? LS.q.options[pick] : '', answer: LS.q.options[LS.q.right], gained: liveRight ? 870 : 0, streak: liveRight ? 3 : 0 },
        standings: liveRows.map(([name, score]) => ({ ...livePerson(name), score })) };
    },
    href: kind => ({ decks: 'WebDecks.dc.html', newDeck: 'WebNewDeck.dc.html', import: 'WebImport.dc.html', connect: 'WebConnect.dc.html', today: 'Main.dc.html', stats: 'WebStats.dc.html' })[kind] || 'Main.dc.html',
    // The study network (net-sample.mjs): the same answers web/net.js gets from the server. Saving, following and the
    // like stay on this board. Prop "loading" shows a page before its answer arrives.
    me: () => { const h = (m.profile && m.profile.handle) || 'alexkim'; return { handle: h, url: '/@' + h, name: st.name }; },
    // Classes (web/classes.mjs): what Today lists (prop "assignments" shows it), and your own progress on a class deck.
    assignments: () => (p.assignments ? N.ASSIGNED : []),
    classProgress: id => N.MY_PROGRESS[id] || null,
    net: (() => {
      const wait = !!p.loading, D = N.DECKS, pick = k => D[k];
      const star = id => (m.stars && id in m.stars ? m.stars[id] : null), follows = m.follows || {};
      const deckCard = d => { const s = star(d.id); return s == null ? d : { ...d, stars: d.stars + (s ? 1 : -1) }; };
      const picked = s => { const pk = (m.picks || {})[s.id] || {};
        return { ...s, changes: s.changes.map(c => { const v = pk[c.id] || pk.$all; return v && c.status === 'open' ? { ...c, status: v === 'take' ? 'taken' : 'skipped' } : c; }) }; };
      const open = () => (wait ? undefined : p.noSuggestions ? [] : N.SUGGESTIONS.map(picked).filter(s => s.changes.some(c => c.status === 'open')));
      // Going back to a version (on this board) adds a version saying so.
      const back = list => (m.restored ? [{ version: list[0].version + 1, kind: 'restore', summary: 'Went back to version ' + m.restored, ai: '', at: '2026-09-28T09:58:00Z', by: N.P.alex,
        changes: list.filter(v => v.version > m.restored).flatMap(v => v.changes).slice(0, 3).map(c => ({ ...c, op: c.op === 'add' ? 'remove' : c.op === 'remove' ? 'add' : 'edit', kind: c.op === 'add' ? 'remove' : c.op === 'remove' ? 'new' : c.kind, before: c.after, after: c.before })) }, ...list] : list);
      // A class, as the board's Tweaks and what you do on it make it: sharing answered, helpers picked, people taken out,
      // decks assigned, an invite taken (it then shows the class as a member sees it).
      const klass = code => {
        const k0 = N.CLASSES[code] || N.CLASSES.BIOKTZ, shared = m.classShare || {}, roles = m.roles || {}, out = m.out || {};
        if (k0.invite) return m.joined ? { ...N.CLASSES.ORGCHM, id: k0.id, code: k0.code, name: k0.name, owner: k0.owner, people: k0.people + 1, me: { role: 'member', share: false, asked: false }, assignments: [] } : k0;
        const me = k0.id in shared ? { ...k0.me, share: shared[k0.id], asked: true } : p.sharing ? { ...k0.me, share: true, asked: true } : k0.me;
        const members = k0.members.filter(x => !out[x.handle]).map(x => (roles[x.handle] ? { ...x, role: roles[x.handle] } : x));
        const decks = (m.takenOut ? k0.deckList.filter(d => !m.takenOut[d.id]) : k0.deckList);
        const assignments = [...k0.assignments.filter(a => !(m.unassigned || {})[a.id] && decks.some(d => d.id === a.sharedId)), ...(m.assigned || []).filter(a => a.classId === k0.id)];
        return { ...k0, me, members, people: members.length, deckList: decks, decks: decks.length, assignments, empty: false, ...(p.empty ? { members: members.filter(x => x.role === 'owner'), people: 1, deckList: [], decks: 0, assignments: [] } : {}) };
      };
      const deckPage = () => ({ ...deckCard(D.mcat), ...(m.checked ? { checked: { name: 'Alex Kim', handle: 'alexkim', current: true } } : {}), helpers: [{ handle: 'devp', name: 'Dev Patel' }], contributors: [{ handle: 'devp', name: 'Dev Patel', n: 6 }, { handle: 'alexkim', name: 'Alex Kim', n: 3 }],
        people: [N.P.maria, N.P.dev, N.P.okafor, N.P.alex], cardsList: N.CARDS, moreCards: 634, made: N.MADE,
        me: p.signedOut ? null : { owner: !!p.owner, helper: false, studying: m.studying || (p.studying ? 'cell' : ''), copied: m.copied || '', watching: !!(m.watching ?? p.watching), starred: star('s1') ?? false, open: p.owner ? 3 : 0 } });
      return {
        signedOut: !!p.signedOut,
        // Narrowed by level, subject, or school (f: level and subject ids, a school's id or name): one list of decks, best first. Not
        // narrowed, the sections, and first the one for your school (the board's mySchool: University of California-Davis).
        discover: (tag, f = {}) => {
          if (wait) return undefined;
          const school = f.school ? N.SCHOOLS.find(r => r[0] === f.school || r[1] === f.school) : null, on = !!(f.level || f.subject || f.school);
          const same = d => (!f.level || d.level === f.level) && (!f.subject || d.subject === f.subject) && (!f.school || (school && d.schoolId === school[0]));
          const echo = { topics: N.DISCOVER.topics, tag: tag || '', level: f.level || '', subject: f.subject || '', school: school ? { id: school[0], name: school[1] } : null, filtered: on };
          if (on) { const list = Object.values(D).filter(same).sort((a, b) => b.stars - a.stars || (a.id < b.id ? -1 : 1)).slice(0, 24); return { ...echo, sections: list.length ? [{ id: 'results', title: 'Decks', decks: list.map(deckCard) }] : [] }; }
          const home = p.mySchool === false ? [] : Object.values(D).filter(d => d.schoolId === '110644').sort((a, b) => b.stars - a.stars || (a.id < b.id ? -1 : 1)).slice(0, 12);
          return { ...echo, sections: [...(home.length ? [{ id: 'school', title: 'Popular at University of California-Davis', decks: home.map(deckCard) }] : []), ...N.DISCOVER.sections.map(s => ({ ...s, decks: s.decks.map(pick).map(deckCard) }))] };
        },
        search: (q, f = {}) => {
          if (wait) return undefined;
          if (!String(q || '').trim()) return { q: '', decks: [], people: [] };
          const school = f.school ? N.SCHOOLS.find(r => r[0] === f.school || r[1] === f.school) : null, on = !!(f.level || f.subject || f.school);
          const same = d => (!f.level || d.level === f.level) && (!f.subject || d.subject === f.subject) && (!f.school || (school && d.schoolId === school[0]));
          // People aren't narrowed by school or level (nothing lists the people at a school), so with a filter there are none.
          return { q, filtered: on, decks: [D.mcat, D.bio2a, D.cell].filter(same).map(deckCard), people: on ? [] : [{ ...N.P.maria, bio: 'Biochem TA', followers: 1280 }, { ...N.P.okafor, bio: '', followers: 3400 }] };
        },
        // A profile: Maria's for any other handle (prop "following": you follow her), or yours, with what you changed on
        // this board (your handle, bio, pins). Prop "missing": no one has that name; "empty": nothing shared or saved yet.
        profile: h => {
          if (wait) return undefined;
          if (p.missing) return { missing: true, status: 404, error: 'No one has that name.' };
          const mine = (m.profile && m.profile.handle) || 'alexkim';
          if (h && h !== mine) {
            // Prop "blocked": someone you blocked (Unblock); their page comes without their decks, like the server's.
            const was = !!p.following, blocked = (m.blocks || {})[h] ?? !!p.blocked, on = !blocked && (follows[h] ?? was);
            return { ...N.OTHER, followers: N.OTHER.followers + (on ? 1 : 0) - (was ? 1 : 0), decks: p.empty || blocked ? [] : [D.mcat, D.spanish].map(deckCard).map((d, i) => ({ ...d, pinned: !i })), saved: [], stars: blocked ? 0 : N.OTHER.stars, me: p.signedOut ? null : { self: false, following: on, blocked } };
          }
          const pr = { ...N.PROFILE, ...(m.profile || {}), handle: mine }, feat = pr.featured || [];
          const decks = p.empty ? [] : N.ALEX_DECKS.map(deckCard).map(d => ({ ...d, pinned: feat.includes(d.id) }));
          return { ...pr, followers: p.empty ? 0 : pr.followers, following: p.empty ? 0 : pr.following, stars: decks.reduce((n, d) => n + d.stars, 0), decks,
            saved: p.empty ? [] : [D.mcat, D.kanji, D.bio2a].map(deckCard), me: { self: true, following: false } };
        },
        deck: () => (wait ? undefined : deckPage()), deckById: () => (wait ? undefined : deckPage()),
        // Your Cell Biology's History; prop someoneElse shows Maria's MCAT Biochemistry, which isn't yours.
        history: () => (wait ? undefined : p.someoneElse ? { id: 's1', name: 'MCAT Biochemistry', url: '/@mariasantos/mcat-biochemistry', owner: N.P.maria, mine: false, following: 300, versions: N.HISTORY }
          : { id: 's9', name: 'Cell Biology', url: '/@alexkim/cell-biology', owner: N.P.alex, mine: true, following: 214, versions: back(N.CELL_HISTORY) }),
        activity: () => (wait ? undefined : p.empty ? { unread: 0, items: [] } : { unread: m.read ? 0 : 2, items: N.NEWS.map(x => ({ ...x, read: m.read ? true : x.read })) }),
        suggestions: open, inbox: open, sent: () => (wait ? undefined : p.empty ? [] : N.SENT),
        // The people you blocked (Settings › Account): Maria and Dev, or nobody (prop "noBlocks"); Unblock takes one off.
        blocks: () => (wait ? undefined : { people: p.noBlocks ? [] : [N.P.maria, N.P.dev].filter(x => (m.blocks || {})[x.handle] !== false) }),
        mine: () => ({ handle: 'alexkim', profile: N.P.alex, decks: [{ id: 's9', slug: 'cell-biology', visibility: 'public', stars: 1300, learners: 214, copies: 86, version: 14, open: 3, level: 'college', subject: 'biology', schoolId: '110644', school: 'University of California-Davis' }] }),
        classes: () => (wait ? undefined : p.empty ? [] : N.CLASS_LIST),
        klass: code => (wait ? undefined : p.missing ? { missing: true, status: 404 } : klass(code)),
        verify: () => ({ verified: ({ Teacher: 'teacher', School: 'school' })[p.verified] || '', open: p.verified === 'Waiting for review' || !!m.verifySent, declined: false, role: '', school: 'UC Davis' }),
        admin: () => (wait ? undefined : p.denied ? { missing: true, status: 403 } : p.empty ? { requests: [], reports: [] } : N.ADMIN),
        drop: noop, act: () => Promise.resolve(null)
      };
    })(),
    act: {
      updateDeck: (id, patch) => set({ deck: { ...ed, ...patch, cover: { ...(ed.cover || {}), ...(patch.cover || {}) } } }),
      grade: () => set({ idx: idx + 1 }),
      pile: (id, name) => set({ idx: idx + 1, piles: deck().piles.map(q => (q.name === name ? { ...q, n: q.n + 1 } : q)) }),
      undo: () => idx > 0 && set({ idx: idx - 1 }),
      setSettings: patch => set({ settings: { ...(m.settings || {}), ...patch } }),
      pickPhoto: () => set({ settings: { ...(m.settings || {}), photo: 'yours', yourPhoto: 'mock' } }),
      removePhoto: () => set({ settings: { ...(m.settings || {}), photo: 'google', yourPhoto: null } }),
      setPerm: (k, on) => set(k === 'check' ? { perms: { ...(m.perms || {}), check: on }, settings: { ...(m.settings || {}), check: on } } : { perms: { ...(m.perms || {}), [k]: on } }),
      pickCover: () => set({ deck: { ...ed, cover: { ...(ed.cover || {}), image: 'mock' } } }),
      newFolder: (name, deckId) => { const id = 'f' + (folders().length + 1) + Date.now().toString(36); set({ folders: [...folders(), { id, name, decks: [] }], ...(deckId ? { moved: { ...(m.moved || {}), [deckId]: id } } : {}) }); return id; },
      renameFolder: (id, name) => set({ folders: folders().map(f => (f.id === id ? { ...f, name } : f)) }),
      deleteFolder: id => set({ folders: folders().filter(f => f.id !== id) }),
      moveDeck: (id, folder) => folderOf(id) !== (folder || null) && set({ moved: { ...(m.moved || {}), [id]: folder || null }, deckOrder: before(order, id, null) }),
      reorderDeck: (id, b) => set({ deckOrder: before(order, id, b) }),
      reorderCard: (id, b) => set({ cardOrder: before(cardOrder, id, b) }),
      moveCard: (id, deckId) => set({ cardDeck: { ...cardDeck, [id]: deckId } }),
      setBg: (id, kind) => set({ deck: { ...ed, bg: { ...(ed.bg || { kind: 'deck', image: null }), kind } } }),
      pickBg: () => set({ deck: { ...ed, bg: { kind: 'photo', image: 'mock' } } }),
      addDeck: noop, deleteDeck: noop, exportDeck: noop, saveCard: noop, deleteCard: noop, copy: noop, speak: noop, play: noop, importCards: noop, exportAll: noop, resetAll: noop,
      pickFile: () => Promise.resolve(null), pickText: () => Promise.resolve(null), pickSound: () => Promise.resolve(null),
      record: () => { set((p.recording && !m.recStop) || m.rec ? { rec: false, recStop: true } : { rec: true }); return Promise.resolve(null); },
      stopRecording: () => set({ rec: false, recStop: true }), watchMic: noop, watchSound: noop,
      playSound: () => set({ playing: !(m.playing ?? !!p.playing) }), seekSound: (c, f) => { if (f != null) set({ frac: f }); },
      addPile: (id, name) => set({ piles: [...deck().piles, { name, n: 0 }] }),
      star: (id, on) => set({ stars: { ...(m.stars || {}), [id]: !!on } }), watch: (id, on) => set({ watching: !!on }),
      follow: (h, on) => set({ follows: { ...(m.follows || {}), [h]: !!on } }), study: () => set({ studying: 'cell' }), copyDeck: () => set({ copied: 'cell' }),
      // Block (or Unblock) and Delete account (App Store): they stay on the board.
      block: (h, on) => { set({ blocks: { ...(m.blocks || {}), [h]: !!on } }); return Promise.resolve({ blocked: !!on }); }, deleteAccount: () => Promise.resolve({ ok: true, apple: false }),
      decide: (id, picks) => { set({ picks: { ...(m.picks || {}), [id]: { ...((m.picks || {})[id] || {}), ...picks } } }); return Promise.resolve({}); }, readNews: () => set({ read: true }),
      suggest: () => Promise.resolve({ id: 'g9', taken: false }), restore: (id, v) => { set({ restored: v }); return Promise.resolve({ changes: 1 }); }, checkDeck: () => { set({ checked: true }); return Promise.resolve({}); },
      keepCards: ids => { set({ aiDone: { ...aiDone, ...Object.fromEntries(ids.map(x => [x, 'kept'])) } }); return Promise.resolve({}); },
      tossCards: ids => { set({ aiDone: { ...aiDone, ...Object.fromEntries(ids.map(x => [x, 'tossed'])) } }); return Promise.resolve({}); }, ensureProfile: noop,
      // Someone in the sample already has the handle: it's taken, like the server says.
      updateProfile: patch => {
        const h = patch.handle ? String(patch.handle).toLowerCase() : '';
        if (h && Object.values(N.P).some(x => x.handle === h && x.handle !== 'alexkim')) return Promise.reject(new Error('That name is taken. Try another.'));
        set({ profile: { ...(m.profile || {}), ...patch } });
        return Promise.resolve({ handle: h || (m.profile && m.profile.handle) || 'alexkim' });
      },
      // Its level, subject, and school stay on the board too (a school by its id, from the sample's list, or the words typed).
      shareDeck: (id, o) => {
        const labels = {};
        if ('level' in o) labels.level = o.level;
        if ('subject' in o) labels.subject = o.subject;
        if ('schoolId' in o || 'school' in o) { const r = N.SCHOOLS.find(x => x[0] === o.schoolId); labels.schoolId = r ? r[0] : ''; labels.school = r ? r[1] : o.school || ''; }
        set({ share: { ...(m.share || { vis: p.shared === 'Public' ? 'public' : p.shared === 'Link only' ? 'link' : 'private' }), ...(o.visibility ? { vis: o.visibility } : {}), labels: { ...((m.share || {}).labels || {}), ...labels } } });
        return Promise.resolve({});
      },
      detach: () => set({ detached: true }), takeUpdates: () => { set({ took: true }); return Promise.resolve({}); }, copyUpdates: (id, on) => set({ upd: !!on }),
      // Live: typing on the join board and tapping an answer stay on that board; the rest link to the next board.
      joinCode: v => set({ joinCode: String(v || '').replace(/\D/g, '').slice(0, 6) }), joinName: v => set({ joinName: String(v || '').slice(0, 20) }), liveAnswer: i => set({ livePick: i }),
      openLive: noop, liveStart: noop, liveNext: noop, liveAgain: noop, liveClose: noop, joinLive: noop, joinAgain: noop,
      setExam: (id, day) => set({ deck: { ...ed, exam: day || null } }),
      pauseCards: (ids, on) => set({ paused: { ...pausedIds, ...Object.fromEntries(ids.map(id => [id, !!on])) } }),
      tune: () => set({ tune: 'on' }), useTuned: on => set({ tune: on ? 'on' : 'off' }),
      // Classes: the canvas keeps each change on its board.
      makeClass: () => Promise.resolve({ code: 'BIOKTZ' }), joinClass: () => { set({ joined: true }); return Promise.resolve({}); },
      leaveClass: () => Promise.resolve({}), deleteClass: () => Promise.resolve({}), updateClass: () => Promise.resolve({}),
      shareProgress: (id, on) => { set({ classShare: { ...(m.classShare || {}), [id]: !!on } }); return Promise.resolve({ on: !!on }); },
      setMember: (id, h, o) => { set(o.remove ? { out: { ...(m.out || {}), [h]: true } } : { roles: { ...(m.roles || {}), [h]: o.role } }); return Promise.resolve({}); },
      addClassDeck: () => Promise.resolve({}), removeClassDeck: (id, sid) => { set({ takenOut: { ...(m.takenOut || {}), [sid]: true } }); return Promise.resolve({}); },
      assign: (id, o) => { const d = Object.values(N.CLASSES).flatMap(k => k.deckList || []).find(x => x.id === o.sharedId) || {};
        set({ assigned: [...(m.assigned || []), { id: 'n' + (m.assigned || []).length, classId: id, sharedId: o.sharedId, goal: o.goal, due: o.due, deck: { name: d.name, cover: d.cover, cards: d.cards, url: d.url }, progress: {} }] }); return Promise.resolve({}); },
      unassign: (id, a) => { set({ unassigned: { ...(m.unassigned || {}), [a]: true } }); return Promise.resolve({}); },
      askVerify: () => { set({ verifySent: true }); return Promise.resolve({}); }, report: () => Promise.resolve({}),
      adminVerify: () => Promise.resolve({}), adminReport: () => Promise.resolve({}), classroom: noop
    }
  };
}

md() { return Component._md || (Component._md = (function makeGuide() {
  // ---------- limits ----------
  const MAX = 60000;         // characters read; the rest of a longer text is ignored
  const MAX_NEST = 12;       // lists and quotes inside lists and quotes; a deeper one is shown as text
  const MAX_MARKS = 20;      // bold, italic, strike and links inside each other; a deeper one loses its marks
  const MAX_URL_CHARS = 200000; // all link and picture addresses of one document together (a [ref] used again counts again)
  const MAX_IMAGES = 100;    // pictures shown in one document
  let errors = 0;            // unexpected errors caught (a bug if it is ever not 0)
  let lastScan = 0;          // how many characters the last link scan read, for the inline work budget

  // ---------- characters and text ----------
  const isSp = c => c === 32 || c === 9;
  const isDigit = c => c >= 48 && c <= 57;
  const isAlpha = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  const isAlnum = c => isDigit(c) || isAlpha(c);
  const isHex = c => isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
  // ASCII punctuation: the characters a backslash can escape.
  const isPunct = c => (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
  const str = v => { try { return v == null ? '' : String(v); } catch (e) { return ''; } };
  // The text as read: at most MAX characters, one kind of line break, no NUL and no half emoji (a lone surrogate).
  function clean(v) {
    let s = str(v);
    if (s.length > MAX) { s = s.slice(0, MAX); const c = s.charCodeAt(MAX - 1); if (c >= 0xd800 && c <= 0xdbff) s = s.slice(0, -1); }
    return s.replace(/\r\n?/g, '\n').replace(/\0/g, '\uFFFD').replace(/[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g, m => (m.length === 2 ? m : '\uFFFD'));
  }
  // Spaces, tabs and line breaks off both ends.
  function trimWS(s) {
    let a = 0, b = s.length;
    while (a < b && (isSp(s.charCodeAt(a)) || s.charCodeAt(a) === 10)) a++;
    while (b > a && (isSp(s.charCodeAt(b - 1)) || s.charCodeAt(b - 1) === 10)) b--;
    return s.slice(a, b);
  }
  const blankFrom = (s, i) => { for (; i < s.length; i++) { const c = s.charCodeAt(i); if (!isSp(c) && c !== 10 && c !== 13 && c !== 12 && c !== 11) return false; } return true; };
  const AMP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => s.replace(/[&<>]/g, c => AMP[c]);              // text between tags
  const escA = s => s.replace(/[&<>"']/g, c => AMP[c]);           // an attribute value
  // Punctuation and whitespace as the emphasis rules see them: 0 whitespace, 1 punctuation or symbol, 2 anything else.
  const RE_WS = /[\p{Zs}\t\n\f\r]/u, RE_PUNCT = /[\p{P}\p{S}]/u;
  function cls(cp) {
    if (cp < 128) return cp === 32 || (cp >= 9 && cp <= 13 && cp !== 11) ? 0 : isPunct(cp) ? 1 : 2;
    const ch = String.fromCodePoint(cp);
    return RE_WS.test(ch) ? 0 : RE_PUNCT.test(ch) ? 1 : 2;
  }
  function cpBefore(s, i) {
    if (i <= 0) return 10;
    const c = s.charCodeAt(i - 1);
    if (c >= 0xdc00 && c <= 0xdfff && i >= 2) { const h = s.charCodeAt(i - 2); if (h >= 0xd800 && h <= 0xdbff) return ((h - 0xd800) << 10) + (c - 0xdc00) + 0x10000; }
    return c;
  }
  const cpAfter = (s, i) => (i >= s.length ? 10 : s.codePointAt(i));

  // ---------- entities ----------
  // Only a safe list of named entities is read; anything else stays as typed. Numbers are read when they are a real
  // printable character (a control character, a lone surrogate or a non-character becomes U+FFFD).
  const NAMED = Object.create(null);
  NAMED.amp = '&'; NAMED.lt = '<'; NAMED.gt = '>'; NAMED.quot = '"'; NAMED.apos = "'"; NAMED.nbsp = '\u00A0';
  ('copy:© reg:® trade:™ hellip:… mdash:— ndash:– lsquo:‘ rsquo:’ ldquo:“ rdquo:” sbquo:‚ bdquo:„ laquo:« raquo:» lsaquo:‹ rsaquo:› bull:• middot:· deg:° plusmn:± times:× divide:÷ ' +
    'frac12:½ frac14:¼ frac34:¾ euro:€ pound:£ yen:¥ cent:¢ curren:¤ sect:§ para:¶ dagger:† Dagger:‡ permil:‰ prime:′ Prime:″ larr:← rarr:→ uarr:↑ darr:↓ harr:↔ lArr:⇐ rArr:⇒ uArr:⇑ dArr:⇓ hArr:⇔ ' +
    'minus:− lowast:∗ radic:√ infin:∞ ne:≠ le:≤ ge:≥ asymp:≈ equiv:≡ sum:∑ prod:∏ int:∫ part:∂ nabla:∇ isin:∈ notin:∉ cap:∩ cup:∪ sub:⊂ sup:⊃ and:∧ or:∨ not:¬ forall:∀ exist:∃ empty:∅ ' +
    'sup1:¹ sup2:² sup3:³ micro:µ ordf:ª ordm:º iexcl:¡ iquest:¿ hearts:♥ spades:♠ clubs:♣ diams:♦ check:✓ star:☆ starf:★ phone:☎ ' +
    'alpha:α beta:β gamma:γ delta:δ epsilon:ε zeta:ζ eta:η theta:θ iota:ι kappa:κ lambda:λ mu:μ nu:ν xi:ξ omicron:ο pi:π rho:ρ sigma:σ tau:τ upsilon:υ phi:φ chi:χ psi:ψ omega:ω ' +
    'Alpha:Α Beta:Β Gamma:Γ Delta:Δ Theta:Θ Lambda:Λ Pi:Π Sigma:Σ Phi:Φ Psi:Ψ Omega:Ω ' +
    'Agrave:À Aacute:Á Acirc:Â Atilde:Ã Auml:Ä Aring:Å AElig:Æ Ccedil:Ç Egrave:È Eacute:É Ecirc:Ê Euml:Ë Igrave:Ì Iacute:Í Icirc:Î Iuml:Ï Ntilde:Ñ Ograve:Ò Oacute:Ó Ocirc:Ô Otilde:Õ Ouml:Ö Oslash:Ø ' +
    'Ugrave:Ù Uacute:Ú Ucirc:Û Uuml:Ü Yacute:Ý szlig:ß agrave:à aacute:á acirc:â atilde:ã auml:ä aring:å aelig:æ ccedil:ç egrave:è eacute:é ecirc:ê euml:ë igrave:ì iacute:í icirc:î iuml:ï ntilde:ñ ' +
    'ograve:ò oacute:ó ocirc:ô otilde:õ ouml:ö oslash:ø ugrave:ù uacute:ú ucirc:û uuml:ü yacute:ý yuml:ÿ').split(' ').forEach(p => { NAMED[p.slice(0, p.indexOf(':'))] = p.slice(p.indexOf(':') + 1); });
  function safeChar(cp) {
    if (cp === 9 || cp === 10 || cp === 13) return ' ';
    if (cp < 32 || (cp >= 127 && cp < 160) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) || (cp & 0xfffe) === 0xfffe || (cp >= 0xfdd0 && cp <= 0xfdef)) return '\uFFFD';
    return String.fromCodePoint(cp);
  }
  // The entity starting at s[i] (which is "&"): [the text it stands for, its length], or null.
  function entityAt(s, i) {
    let j = i + 1;
    const c = s.charCodeAt(j);
    if (c === 35) {
      j++;
      const hex = s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88;
      if (hex) j++;
      const from = j;
      let n = 0;
      while (j - from < 9) { const d = s.charCodeAt(j); if (!(hex ? isHex(d) : isDigit(d))) break; n = n * (hex ? 16 : 10) + parseInt(s[j], 16); j++; }
      if (j === from || j - from > (hex ? 6 : 7) || s.charCodeAt(j) !== 59) return null;
      return [safeChar(n), j + 1 - i];
    }
    if (!isAlpha(c)) return null;
    while (j - i < 34 && isAlnum(s.charCodeAt(j))) j++;
    if (s.charCodeAt(j) !== 59 || j - i < 3) return null;
    const v = NAMED[s.slice(i + 1, j)];
    return v === undefined ? null : [v, j + 1 - i];
  }
  // Backslash escapes and entities turned into the characters they stand for (for addresses, titles and code languages).
  function unescapeStr(s) {
    if (s.indexOf('\\') < 0 && s.indexOf('&') < 0) return s;
    let out = '';
    for (let i = 0; i < s.length;) {
      const c = s.charCodeAt(i);
      if (c === 92 && isPunct(s.charCodeAt(i + 1))) { out += s[i + 1]; i += 2; }
      else if (c === 38) { const e = entityAt(s, i); if (e) { out += e[0]; i += e[1]; } else { out += '&'; i++; } }
      else { out += s[i]; i++; }
    }
    return out;
  }

  // ---------- addresses ----------
  // An address is percent-encoded: afterwards it has only letters, digits and URL punctuation, never a quote, angle
  // bracket, space, backslash or control character. A valid %XX stays as it is. "javascript:" and "vbscript:" never
  // appear in one (the colon is written %3A), so an address that hides one in its path still cannot be mistaken for a script.
  const URL_OK = new Uint8Array(128);
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&'()*+,;=:@/?#") URL_OK[ch.charCodeAt(0)] = 1;
  const pct = c => (c < 16 ? '%0' : '%') + c.toString(16).toUpperCase();
  function encodeUrl(u) {
    let out = '';
    for (let i = 0; i < u.length; i++) {
      const c = u.charCodeAt(i);
      if (c < 128) out += URL_OK[c] || (c === 37 && isHex(u.charCodeAt(i + 1)) && isHex(u.charCodeAt(i + 2))) ? u[i] : pct(c);
      else {
        const cp = u.codePointAt(i);
        if (cp >= 0xd800 && cp <= 0xdfff) out += '%EF%BF%BD';
        else { out += encodeURIComponent(String.fromCodePoint(cp)); if (cp > 0xffff) i++; }
      }
    }
    return out.replace(/((?:java|vb)script):/gi, '$1%3A');       // not even inside a path: no scanner should ever see "javascript:" in an address
  }
  // Which (already encoded) addresses may be a link, and which a picture.
  const linkOk = u => u.charCodeAt(0) === 35 || /^(?:https?:\/\/[^\/?#]|mailto:.)/i.test(u);
  const imgOk = u => /^(?:https?:\/\/[^\/?#]|\/(?!\/))/i.test(u);
  const ownImg = u => /^\/media\/[\w-]+\.(?:png|jpe?g|gif|webp)$/i.test(u);

  // ---------- link syntax: label, address, title (shared by [text](...) and [ref]: ... ) ----------
  // Each scanner reads a bounded number of characters and notes in lastScan how many it read.
  // The text of a [label] starting at p: the index after its "]", or -1. No brackets inside, at most 999 characters.
  function labelEnd(s, p) {
    const lim = Math.min(s.length, p + 1002);
    let j = p + 1;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92) { j += 2; continue; }
      if (c === 91) { lastScan = j - p; return -1; }
      if (c === 93) { lastScan = j - p; return j + 1; }
      j++;
    }
    lastScan = j - p;
    return -1;
  }
  // An address at p, either <...> or characters up to a space with balanced parentheses: { end, raw } or null.
  function scanDest(s, p) {
    const lim = Math.min(s.length, p + 2002);
    let j = p;
    if (s.charCodeAt(p) === 60) {
      j = p + 1;
      while (j < lim) {
        const c = s.charCodeAt(j);
        if (c === 62) { lastScan = j - p; return { end: j + 1, raw: s.slice(p + 1, j) }; }
        if (c === 10 || c === 60) break;
        j += c === 92 && isPunct(s.charCodeAt(j + 1)) ? 2 : 1;
      }
      lastScan = j - p;
      return null;
    }
    let depth = 0;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92 && isPunct(s.charCodeAt(j + 1))) { j += 2; continue; }
      if (c === 40) { if (++depth > 32) break; j++; continue; }
      if (c === 41) { if (depth === 0) break; depth--; j++; continue; }
      if (c <= 32 || c === 127) break;
      j++;
    }
    lastScan = j - p;
    if (j >= lim && j < s.length) return null;                  // longer than we read
    if (depth !== 0 || (j === p && s.charCodeAt(j) !== 41)) return null;
    return { end: j, raw: s.slice(p, j) };
  }
  // A title at p, in "...", '...' or (...): { end, raw } or null.
  function scanTitle(s, p) {
    const q = s.charCodeAt(p), close = q === 34 ? 34 : q === 39 ? 39 : q === 40 ? 41 : 0;
    if (!close) return null;
    const lim = Math.min(s.length, p + 1002);
    let j = p + 1;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92 && isPunct(s.charCodeAt(j + 1))) { j += 2; continue; }
      if (c === close) { lastScan = j - p; return { end: j + 1, raw: s.slice(p + 1, j) }; }
      if (q === 40 && c === 40) break;
      j++;
    }
    lastScan = j - p;
    return null;
  }
  // Spaces, at most one line break, and more spaces.
  function spnl(s, p) {
    while (isSp(s.charCodeAt(p))) p++;
    if (s.charCodeAt(p) === 10) { p++; while (isSp(s.charCodeAt(p))) p++; }
    return p;
  }
  const normLabel = raw => trimWS(raw).replace(/[ \t\n]+/g, ' ').toLowerCase().toUpperCase();
  // After spaces, the end of the line: the index after the line break, or -1 when something else comes first.
  function eol(s, p) {
    while (isSp(s.charCodeAt(p))) p++;
    if (p >= s.length) return s.length;
    return s.charCodeAt(p) === 10 ? p + 1 : -1;
  }
  // "[label]: address "title"" at the start of s[p0...]: the index after it, or -1. The first definition of a label wins.
  function parseRefDef(s, p0, refs) {
    const le = labelEnd(s, p0);
    if (le < 0 || s.charCodeAt(le) !== 58) return -1;
    const label = normLabel(s.slice(p0 + 1, le - 1));
    if (!label) return -1;
    const D = scanDest(s, spnl(s, le + 1));
    if (!D) return -1;
    let q = spnl(s, D.end), title = null, e = -1;
    if (q > D.end) { const T = scanTitle(s, q); if (T) { title = unescapeStr(T.raw); e = eol(s, T.end); } }
    if (e < 0) { title = null; e = eol(s, D.end); }
    if (e < 0) return -1;
    if (!refs.has(label)) refs.set(label, { dest: encodeUrl(unescapeStr(D.raw)), title: title || '' });
    return e;
  }

  // ---------- inline: text -> nodes ----------
  // The nodes while reading are a linked list per parent: { t, v, p (previous), n (next), fc, lc (first, last child), par }.
  const N = (t, v) => ({ t, v: v === undefined ? '' : v, p: null, n: null, fc: null, lc: null, par: null, dest: '', title: '' });
  function unlink(x) {
    if (x.p) x.p.n = x.n; else if (x.par) x.par.fc = x.n;
    if (x.n) x.n.p = x.p; else if (x.par) x.par.lc = x.p;
    x.par = x.p = x.n = null;
  }
  function appendChild(par, x) {
    x.par = par; x.p = par.lc; x.n = null;
    if (par.lc) par.lc.n = x; else par.fc = x;
    par.lc = x;
  }
  function insertAfter(a, x) {
    x.par = a.par; x.p = a; x.n = a.n;
    if (a.n) a.n.p = x; else if (a.par) a.par.lc = x;
    a.n = x;
  }
  const SPECIAL = new Uint8Array(128);
  for (const ch of '\n\\`*_~[]!<&hH') SPECIAL[ch.charCodeAt(0)] = 1;
  function schemeEnd(b) {
    if (!isAlpha(b.charCodeAt(0))) return -1;
    let i = 1;
    while (i < 33) { const c = b.charCodeAt(i); if (isAlnum(c) || c === 43 || c === 46 || c === 45) i++; else break; }
    return i >= 2 && b.charCodeAt(i) === 58 ? i : -1;
  }
  const EMAIL_CH = "!#$%&'*+/=?^_`{|}~-.";
  function isEmail(b) {
    const at = b.indexOf('@');
    if (at < 1) return false;
    for (let i = 0; i < at; i++) { const c = b.charCodeAt(i); if (!isAlnum(c) && EMAIL_CH.indexOf(b[i]) < 0) return false; }
    const labels = b.slice(at + 1).split('.');
    return labels.every(l => l.length >= 1 && l.length <= 63 && isAlnum(l.charCodeAt(0)) && isAlnum(l.charCodeAt(l.length - 1)) && [...l].every(ch => isAlnum(ch.charCodeAt(0)) || ch === '-'));
  }

  // Reads one paragraph, heading or table cell. Returns a root node whose children are the inline nodes.
  // This is the CommonMark way: scan left to right, push * _ ~ and [ ![ on two stacks, and when a closer shows up look
  // back for its opener. Every loop that could be slow on hostile text is bounded (see the work budget).
  function inlineParse(s, refs) {
    const root = N('root'), len = s.length;
    let pos = 0, delims = null, brackets = null, work = 0, tickIdx = null;
    const cap = 20 * len + 2000;                   // the work budget: scans past it stop making links and emphasis
    const text = v => N('text', v);
    const add = x => appendChild(root, x);
    const removeDelim = d => { if (d.prev) d.prev.next = d.next; if (!d.next) delims = d.prev; else d.next.prev = d.prev; };

    // Code spans: the closing run of backticks of the same length is found with an index built once, so a long text of
    // unmatched backtick runs is still read in one pass.
    function findTicks(L, from) {
      if (!tickIdx) {
        tickIdx = new Map();
        for (let i = s.indexOf('`'); i >= 0 && i < len;) {
          let j = i; while (s.charCodeAt(j) === 96) j++;
          let a = tickIdx.get(j - i); if (!a) tickIdx.set(j - i, a = { p: [], k: 0 });
          a.p.push(i);
          i = s.indexOf('`', j);
        }
      }
      const a = tickIdx.get(L);
      if (!a) return -1;
      while (a.k < a.p.length && a.p[a.k] < from) a.k++;
      return a.k < a.p.length ? a.p[a.k] : -1;
    }
    function backticks() {
      let j = pos; while (s.charCodeAt(j) === 96) j++;
      const L = j - pos, at = findTicks(L, j);
      if (at < 0) { add(text(s.slice(pos, j))); pos = j; return; }
      let v = s.slice(j, at).replace(/\n/g, ' ');
      if (v.length > 0 && v.charCodeAt(0) === 32 && v.charCodeAt(v.length - 1) === 32 && /[^ ]/.test(v)) v = v.slice(1, -1);
      add(N('code', v));
      pos = at + L;
    }
    function backslash() {
      pos++;
      const c = s.charCodeAt(pos);
      if (c === 10) { pos++; add(N('br')); }
      else if (isPunct(c)) { add(text(s[pos])); pos++; }
      else add(text('\\'));
    }
    function newline() {
      pos++;
      const l = root.lc;
      if (l && l.t === 'text' && l.v.charCodeAt(l.v.length - 1) === 32) {
        const hard = l.v.charCodeAt(l.v.length - 2) === 32;
        let e = l.v.length; while (e > 0 && l.v.charCodeAt(e - 1) === 32) e--;
        l.v = l.v.slice(0, e);
        add(N(hard ? 'br' : 'soft'));
      } else add(N('soft'));
      while (s.charCodeAt(pos) === 32) pos++;
    }
    function entity() {
      const e = entityAt(s, pos);
      if (e) { add(text(e[0])); pos += e[1]; } else { add(text('&')); pos++; }
    }
    // <https://...> and <me@mail.com>. Other schemes are not links: the whole <...> stays as typed.
    function angle() {
      let e = pos + 1;
      const lim = Math.min(len, pos + 2100);
      while (e < lim) { const c = s.charCodeAt(e); if (c === 62) break; if (c <= 32 || c === 60 || c === 127) { e = -1; break; } e++; }
      work += (e < 0 ? 1 : e - pos);
      if (e < 0 || e >= len || s.charCodeAt(e) !== 62) { add(text('<')); pos++; return; }
      const body = s.slice(pos + 1, e), colon = schemeEnd(body);
      let href = '';
      if (colon > 0) { const sch = body.slice(0, colon).toLowerCase(); if (sch === 'http' || sch === 'https' || sch === 'mailto') href = encodeUrl(body); else { add(text(s.slice(pos, e + 1))); pos = e + 1; return; } }
      else if (isEmail(body)) href = 'mailto:' + encodeUrl(body);
      else { add(text('<')); pos++; return; }
      const a = N('link'); a.dest = href;
      appendChild(a, text(body)); add(a);
      pos = e + 1;
    }
    // A bare http:// or https:// address (GitHub style). It starts after anything but a letter; the domain may not have
    // an underscore in its last two parts; a trailing . , : ; ! ? * _ ~ ' " ] and an unmatched ) are not part of it.
    function urlAt(j) {
      if (j > 0 && isAlpha(s.charCodeAt(j - 1))) return false;
      if ((s.charCodeAt(j + 1) | 32) !== 116 || (s.charCodeAt(j + 2) | 32) !== 116 || (s.charCodeAt(j + 3) | 32) !== 112) return false;
      let k = j + 4; if ((s.charCodeAt(k) | 32) === 115) k++;
      return s.charCodeAt(k) === 58 && s.charCodeAt(k + 1) === 47 && s.charCodeAt(k + 2) === 47;
    }
    const wsAt = e => { const c = s.charCodeAt(e); return c <= 32 || c === 127 || (c >= 128 && RE_WS.test(s[e])); };
    function autoEnd(j) {
      let k = j + 4; if ((s.charCodeAt(k) | 32) === 115) k++;
      k += 3;
      const ds = k;
      if (k >= len || s.charCodeAt(k) < 33 || cls(s.codePointAt(k)) !== 2) return -1;
      let e = k;
      while (e < len && e - j < 2100) {
        if (wsAt(e) || s.charCodeAt(e) === 60) break;
        if (s.charCodeAt(e) === 93) { const d = s.charCodeAt(e + 1); if (e + 1 >= len || d === 40 || d === 91 || wsAt(e + 1)) break; }
        e++;
      }
      work += e - j;
      if (e - j >= 2100) return -1;
      let open = 0, close = 0;
      for (let i = j; i < e; i++) { const c = s.charCodeAt(i); if (c === 40) open++; else if (c === 41) close++; }
      let end = e;
      while (end > ds) {
        const c = s.charCodeAt(end - 1);
        if (c === 63 || c === 33 || c === 46 || c === 44 || c === 58 || c === 42 || c === 95 || c === 126 || c === 39 || c === 34 || c === 93) end--;
        else if (c === 59) { let q = end - 2; while (q > ds && isAlpha(s.charCodeAt(q))) q--; end = q < end - 2 && s.charCodeAt(q) === 38 ? q : end - 1; }
        else if (c === 41 && close > open) { close--; end--; }
        else break;
      }
      let seen = false, under = false, underBefore = false;
      for (let d = ds; d < end;) {
        const cp = s.codePointAt(d);
        if (cp === 46) { underBefore = under; under = false; d++; continue; }
        if (cp === 95) { under = true; d++; continue; }
        if (cp !== 45 && cls(cp) !== 2) break;
        seen = true; d += cp > 0xffff ? 2 : 1;
      }
      return under || underBefore || !seen ? -1 : end;
    }
    // * _ and ~ runs. Whether a run can open or close emphasis follows the CommonMark "flanking" rules.
    function delim(c) {
      let j = pos; while (s.charCodeAt(j) === c) j++;
      const n = j - pos;
      if (c === 126 && n > 2) { add(text(s.slice(pos, j))); pos = j; return; }
      const before = cls(cpBefore(s, pos)), after = cls(cpAfter(s, j));
      const left = after !== 0 && (after !== 1 || before !== 2), right = before !== 0 && (before !== 1 || after !== 2);
      let open = left, close = right;
      if (c === 95) { open = left && (!right || before === 1); close = right && (!left || after === 1); }
      const node = text(s.slice(pos, j)); add(node);
      pos = j;
      if (open || close) { delims = { cc: c, n, orig: n, node, prev: delims, next: null, open, close }; if (delims.prev) delims.prev.next = delims; }
    }
    // Pair every closer above `bottom` with the nearest opener below it. A closer with no opener is plain text.
    function processEmphasis(bottom) {
      const ob = new Array(14).fill(bottom);                      // per kind of closer: no opener to find below here
      let closer = delims;
      while (closer && closer.prev !== bottom) closer = closer.prev;
      while (closer && work <= cap) {
        if (!closer.close) { closer = closer.next; continue; }
        const cc = closer.cc, idx = cc === 95 ? (closer.open ? 3 : 0) + closer.orig % 3 : cc === 42 ? 6 + (closer.open ? 3 : 0) + closer.orig % 3 : 12 + (closer.n === 2 ? 1 : 0);
        let opener = closer.prev, found = false;
        while (opener && opener !== bottom && opener !== ob[idx]) {
          if (++work > cap) break;
          if (opener.cc === cc && opener.open) {
            if (cc === 126) { if (opener.n === closer.n) { found = true; break; } }
            else if (!((closer.open || opener.close) && closer.orig % 3 !== 0 && (opener.orig + closer.orig) % 3 === 0)) { found = true; break; }
          }
          opener = opener.prev;
        }
        const old = closer;
        if (!found) {
          closer = closer.next;
          ob[idx] = old.prev;
          if (!old.open) removeDelim(old);
          continue;
        }
        const use = cc === 126 ? closer.n : closer.n >= 2 && opener.n >= 2 ? 2 : 1;
        const oi = opener.node, ci = closer.node;
        opener.n -= use; closer.n -= use;
        oi.v = oi.v.slice(0, oi.v.length - use); ci.v = ci.v.slice(0, ci.v.length - use);
        const em = N(cc === 126 ? 's' : use === 1 ? 'i' : 'b');
        for (let t = oi.n; t && t !== ci;) { const nx = t.n; unlink(t); appendChild(em, t); t = nx; work++; }
        insertAfter(oi, em);
        if (opener.next !== closer) { opener.next = closer; closer.prev = opener; }
        if (opener.n === 0) { unlink(oi); removeDelim(opener); }
        if (closer.n === 0) { unlink(ci); const nx = closer.next; removeDelim(closer); closer = nx; }
      }
      while (delims && delims !== bottom) removeDelim(delims);
    }
    function openBracket(image) {
      const index = image ? pos + 1 : pos;
      add(text(image ? '![' : '['));
      pos += image ? 2 : 1;
      if (brackets) brackets.after = true;
      brackets = { node: root.lc, prev: brackets, prevDelim: delims, index, image, active: true, after: false };
    }
    // The tail of an inline link: "(address "title")" at p. { end, dest, title } or null.
    function inlineTail(p) {
      const start = p;
      p = spnl(s, p + 1);
      const D = scanDest(s, p); work += lastScan;
      if (!D) return null;
      let q = spnl(s, D.end), title = '';
      if (q > D.end) { const T = scanTitle(s, q); work += lastScan; if (T) { title = unescapeStr(T.raw); q = spnl(s, T.end); } }
      if (s.charCodeAt(q) !== 41) return null;
      work += q - start;
      return { end: q + 1, dest: encodeUrl(unescapeStr(D.raw)), title };
    }
    function closeBracket() {
      pos++;
      const startpos = pos, op = brackets;
      if (!op) { add(text(']')); return; }
      if (!op.active) { add(text(']')); brackets = op.prev; return; }
      let dest = '', title = '', matched = false;
      if (s.charCodeAt(pos) === 40 && work <= cap) { const r = inlineTail(pos); if (r) { dest = r.dest; title = r.title; pos = r.end; matched = true; } }
      if (!matched && work <= cap) {
        let n = 0;
        if (s.charCodeAt(pos) === 91) { const le = labelEnd(s, pos); work += lastScan; n = le < 0 ? 0 : le - pos; }
        let raw = null;
        if (n > 2) raw = s.slice(pos + 1, pos + n - 1);
        else if (!op.after && startpos - op.index <= 1001) raw = s.slice(op.index + 1, startpos - 1);
        const ref = raw === null ? null : refs.get(normLabel(raw));
        if (ref) { dest = ref.dest; title = ref.title; matched = true; pos += n; }
      }
      if (!matched) { brackets = op.prev; pos = startpos; add(text(']')); return; }
      const node = N(op.image ? 'image' : 'link'); node.dest = dest; node.title = title;
      for (let t = op.node.n; t;) { const nx = t.n; unlink(t); appendChild(node, t); t = nx; work++; }
      add(node);
      processEmphasis(op.prevDelim);
      brackets = op.prev;
      unlink(op.node);
      if (!op.image) for (let b = brackets; b; b = b.prev) { if (b.image) continue; if (!b.active) break; b.active = false; }
    }

    while (pos < len) {
      const c = s.charCodeAt(pos);
      if (c === 10) newline();
      else if (c === 92) backslash();
      else if (c === 96) backticks();
      else if (c === 42 || c === 95 || c === 126) delim(c);
      else if (c === 91) openBracket(false);
      else if (c === 33) { if (s.charCodeAt(pos + 1) === 91) openBracket(true); else { add(text('!')); pos++; } }
      else if (c === 93) closeBracket();
      else if (c === 60) angle();
      else if (c === 38) entity();
      else if ((c === 104 || c === 72) && !brackets && urlAt(pos) && work <= cap) {
        const e = autoEnd(pos);
        if (e > 0) { const url = s.slice(pos, e), a = N('link'); a.dest = encodeUrl(url); appendChild(a, text(url)); add(a); pos = e; }
        else { add(text(s[pos])); pos++; }
      } else {
        let j = pos + 1;
        while (j < len) { const d = s.charCodeAt(j); if (d < 128 && SPECIAL[d] && !((d === 104 || d === 72) && !urlAt(j))) break; j++; }
        add(text(s.slice(pos, j)));
        pos = j;
      }
    }
    processEmphasis(null);
    return root;
  }

  // The plain text inside a picture's [description]: all the text and code in it, line breaks as spaces.
  function altOf(x) {
    let out = '', cur = x.fc;
    const up = [];
    for (;;) {
      if (!cur) { if (!up.length) break; cur = up.pop(); continue; }
      const nd = cur;
      if (nd.fc) { up.push(nd.n); cur = nd.fc; continue; }
      if (nd.t === 'text' || nd.t === 'code') out += nd.v; else if (nd.t === 'soft' || nd.t === 'br') out += ' ';
      cur = nd.n;
    }
    return out;
  }
  function pushText(out, v) {
    if (!v) return;
    const l = out[out.length - 1];
    if (l && l.t === 'text') l.v += v; else out.push({ t: 'text', v });
  }
  // Linked nodes -> the tree. No recursion (a hostile text can nest very deep), and marks nested deeper than MAX_MARKS
  // are dropped but their text stays. Links inside links are dropped the same way.
  function toInline(root, ctx) {
    const out = [], stack = [];
    let f = { cur: root.fc, out, inA: false, depth: 0 };
    for (;;) {
      const x = f.cur;
      if (!x) { if (!stack.length) break; f = stack.pop(); continue; }
      f.cur = x.n;
      switch (x.t) {
        case 'text': pushText(f.out, x.v); break;
        case 'soft': pushText(f.out, ' '); break;
        case 'br': f.out.push({ t: 'br' }); break;
        case 'code': if (x.v) f.out.push({ t: 'code', v: x.v }); break;
        case 'image': {
          const alt = altOf(x), cost = x.dest.length + x.title.length;
          if (!imgOk(x.dest) || ctx.urls + cost > MAX_URL_CHARS) pushText(f.out, alt);
          else { ctx.urls += cost; f.out.push({ t: 'img', src: x.dest, alt, title: x.title }); }
          break;
        }
        default: {                                                 // b, i, s, link
          const isA = x.t === 'link', cost = x.dest.length + x.title.length;
          let wrap = null;
          if (f.depth < MAX_MARKS) {
            if (!isA) wrap = { t: x.t, c: [] };
            else if (!f.inA && linkOk(x.dest) && ctx.urls + cost <= MAX_URL_CHARS) { ctx.urls += cost; wrap = { t: 'a', href: x.dest, title: x.title, c: [] }; ctx.links.push(wrap); }
          }
          if (wrap) f.out.push(wrap);
          stack.push(f);
          f = { cur: x.fc, out: wrap ? wrap.c : f.out, inA: f.inA || (isA && !!wrap), depth: f.depth + (wrap ? 1 : 0) };
        }
      }
    }
    return out;
  }
  const inlineOf = (content, refs, ctx) => toInline(inlineParse(trimWS(content), refs), ctx);

  // ---------- blocks: lines -> a tree of containers and leaves ----------
  // This is the CommonMark way (and commonmark.js's): each line is matched against the open containers (quote, list item),
  // then against the starts of new blocks, and what is left is text for a paragraph, a code block or a table row.
  // Tabs count as moving to the next multiple of 4 columns, as the spec says.
  function parseBlocks(src, refs) {
    const mk = (type, depth) => ({ type, kids: [], parent: null, open: true, content: '', depth, line: 0, blankEnd: false, seen: false, ld: null });
    const doc = mk('doc', 0);
    let tip = doc, oldtip = doc, lastMatched = doc, allClosed = true;
    let ln = '', lineNo = 0, offset = 0, column = 0, nextNonspace = 0, nextCol = 0, indent = 0, indented = false, blank = false, partialTab = false;
    const canContain = (p, t) => (p === 'doc' || p === 'quote' || p === 'item' ? t !== 'item' : p === 'list' ? t === 'item' : false);

    function findNextNonspace() {
      let i = offset, cols = column;
      for (; i < ln.length; i++) {
        const c = ln.charCodeAt(i);
        if (c === 32) cols++; else if (c === 9) cols += 4 - (cols % 4); else break;
      }
      blank = i >= ln.length;
      nextNonspace = i; nextCol = cols; indent = cols - column; indented = indent >= 4;
    }
    function advanceNextNonspace() { offset = nextNonspace; column = nextCol; partialTab = false; }
    function advanceOffset(count, columns) {
      while (count > 0 && offset < ln.length) {
        if (ln.charCodeAt(offset) === 9) {
          const toTab = 4 - (column % 4);
          if (columns) {
            partialTab = toTab > count;
            const adv = partialTab ? count : toTab;
            column += adv; offset += partialTab ? 0 : 1; count -= adv;
          } else { partialTab = false; column += toTab; offset += 1; count -= 1; }
        } else { partialTab = false; offset += 1; column += 1; count -= 1; }
      }
    }
    function addLine() {
      if (partialTab) { offset += 1; tip.content += ' '.repeat(4 - (column % 4)); }
      tip.content += ln.slice(offset) + '\n';
    }
    function addChild(type) {
      while (!canContain(tip.type, type)) finalize(tip);
      const n = mk(type, tip.depth + (type === 'quote' || type === 'item' ? 1 : 0));
      n.parent = tip; n.line = lineNo;
      tip.kids.push(n);
      tip = n;
      return n;
    }
    function closeUnmatched() {
      if (allClosed) return;
      while (oldtip !== lastMatched) { const parent = oldtip.parent; finalize(oldtip); oldtip = parent; }
      allClosed = true;
    }
    function endsBlank(b) {
      while (b) {
        if (b.blankEnd) return true;
        if (!b.seen && (b.type === 'list' || b.type === 'item')) { b.seen = true; b = b.kids[b.kids.length - 1]; } else { b.seen = true; break; }
      }
      return false;
    }
    function finalize(b) {
      const above = b.parent;
      b.open = false;
      if (b.type === 'para') {
        let p = 0, defs = false;
        while (b.content.charCodeAt(p) === 91) { const e = parseRefDef(b.content, p, refs); if (e < 0) break; p = e; defs = true; }
        if (defs) b.content = b.content.slice(p);
        if (blankFrom(b.content, 0)) { const i = above.kids.lastIndexOf(b); if (i >= 0) above.kids.splice(i, 1); }
      } else if (b.type === 'list') {
        const items = b.kids;
        for (let i = 0; i < items.length && b.ld.tight; i++) {
          if (endsBlank(items[i]) && i < items.length - 1) { b.ld.tight = false; break; }
          const sub = items[i].kids;
          for (let j = 0; j < sub.length; j++) if (endsBlank(sub[j]) && (i < items.length - 1 || j < sub.length - 1)) { b.ld.tight = false; break; }
        }
      } else if (b.type === 'code') {
        if (b.fenced) { const nl = b.content.indexOf('\n'); b.info = unescapeStr(trimWS(b.content.slice(0, nl))); b.literal = b.content.slice(nl + 1); }
        else {
          let end = b.content.length;                              // drop blank lines at the end, keep one line break
          for (;;) {
            const ls = end < 2 ? 0 : b.content.lastIndexOf('\n', end - 2) + 1;
            let allSp = true; for (let i = ls; i < end - 1; i++) if (b.content.charCodeAt(i) !== 32) { allSp = false; break; }
            if (allSp && ls > 0 && ls < end) end = ls; else break;
          }
          b.literal = b.content.slice(0, end);
        }
        b.content = '';
      }
      tip = above;
    }

    // --- table helpers ---
    // A row's cells. Pipes at the ends are optional, "\|" is a pipe in the text.
    function splitCells(s) {
      let i = 0, n = s.length;
      while (i < n && isSp(s.charCodeAt(i))) i++;
      while (n > i && isSp(s.charCodeAt(n - 1))) n--;
      if (i < n && s.charCodeAt(i) === 124) i++;
      if (n > i && s.charCodeAt(n - 1) === 124) { let bs = 0; for (let k = n - 2; k >= i && s.charCodeAt(k) === 92; k--) bs++; if (bs % 2 === 0) n--; }
      const cells = [];
      let start = i;
      for (let j = i; j < n; j++) {
        const c = s.charCodeAt(j);
        if (c === 92) j++;
        else if (c === 124) { cells.push(s.slice(start, j)); start = j + 1; }
      }
      cells.push(s.slice(start, n));
      return cells.map(c => trimWS(c).replace(/\\\|/g, '|'));
    }
    // "| --- | :-: |" -> ['', 'center']; null when the line is not a delimiter row.
    function delimRow(s) {
      for (let j = 0; j < s.length; j++) { const c = s.charCodeAt(j); if (c !== 32 && c !== 9 && c !== 124 && c !== 58 && c !== 45) return null; }
      const aligns = [];
      for (const cell of splitCells(s)) {
        const l = cell.charCodeAt(0) === 58, r = cell.charCodeAt(cell.length - 1) === 58 && cell.length > 1;
        const dashes = cell.slice(l ? 1 : 0, r ? -1 : undefined);
        if (!dashes || dashes.replace(/-/g, '') !== '') return null;
        aligns.push(l && r ? 'center' : l ? 'left' : r ? 'right' : '');
      }
      return aligns.length ? aligns : null;
    }

    // --- how each open container takes the next line: 0 it continues, 1 it does not, 2 the line was consumed ---
    function cont(c) {
      switch (c.type) {
        case 'quote':
          if (!indented && ln.charCodeAt(nextNonspace) === 62) {
            advanceNextNonspace(); advanceOffset(1, false);
            if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
            return 0;
          }
          return 1;
        case 'item':
          if (blank) { if (!c.kids.length) return 1; advanceNextNonspace(); }
          else if (indent >= c.ld.markerOffset + c.ld.padding) advanceOffset(c.ld.markerOffset + c.ld.padding, true);
          else return 1;
          return 0;
        case 'heading': case 'hr': return 1;
        case 'para': case 'table': return blank ? 1 : 0;
        case 'code':
          if (c.fenced) {
            if (indent <= 3 && ln.charCodeAt(nextNonspace) === c.fenceChar) {
              let j = nextNonspace; while (ln.charCodeAt(j) === c.fenceChar) j++;
              if (j - nextNonspace >= c.fenceLen && blankFrom(ln, j)) { finalize(c); return 2; }
            }
            for (let i = c.fenceOffset; i > 0 && isSp(ln.charCodeAt(offset)); i--) advanceOffset(1, true);
          } else if (indent >= 4) advanceOffset(4, true);
          else if (blank) advanceNextNonspace();
          else return 1;
          return 0;
        default: return 0;
      }
    }

    // --- the starts of new blocks: 0 no, 1 a container was opened (keep looking), 2 a leaf was opened ---
    function quoteStart(container) {
      if (indented || ln.charCodeAt(nextNonspace) !== 62 || container.depth >= MAX_NEST) return 0;
      advanceNextNonspace(); advanceOffset(1, false);
      if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
      closeUnmatched();
      addChild('quote');
      return 1;
    }
    function atxStart() {
      if (indented) return 0;
      let j = nextNonspace;
      while (ln.charCodeAt(j) === 35) j++;
      const n = j - nextNonspace;
      if (n < 1 || n > 6 || !(j >= ln.length || isSp(ln.charCodeAt(j)))) return 0;
      advanceNextNonspace(); advanceOffset(n, false);
      while (isSp(ln.charCodeAt(offset))) advanceOffset(1, false);
      closeUnmatched();
      const h = addChild('heading');
      h.level = n;
      const rest = ln.slice(offset);
      let e = rest.length; while (e > 0 && isSp(rest.charCodeAt(e - 1))) e--;
      let k = e; while (k > 0 && rest.charCodeAt(k - 1) === 35) k--;
      if (k < e) { if (k === 0) e = 0; else if (isSp(rest.charCodeAt(k - 1))) { e = k - 1; while (e > 0 && isSp(rest.charCodeAt(e - 1))) e--; } }
      h.content = rest.slice(0, e);
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function fenceStart() {
      if (indented) return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 96 && c !== 126) return 0;
      let j = nextNonspace; while (ln.charCodeAt(j) === c) j++;
      const n = j - nextNonspace;
      if (n < 3 || (c === 96 && ln.indexOf('`', j) >= 0)) return 0;
      closeUnmatched();
      const b = addChild('code');
      b.fenced = true; b.fenceLen = n; b.fenceChar = c; b.fenceOffset = indent;
      advanceNextNonspace(); advanceOffset(n, false);
      return 2;
    }
    function setextStart(container) {
      if (indented || container.type !== 'para') return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 61 && c !== 45) return 0;
      let j = nextNonspace; while (ln.charCodeAt(j) === c) j++;
      if (!blankFrom(ln, j)) return 0;
      closeUnmatched();
      let p = 0;
      while (container.content.charCodeAt(p) === 91) { const e = parseRefDef(container.content, p, refs); if (e < 0) break; p = e; }
      container.content = container.content.slice(p);
      if (!container.content.length) return 0;
      const h = mk('heading', container.depth);
      h.level = c === 61 ? 1 : 2; h.content = container.content; h.parent = container.parent; h.line = lineNo;
      container.parent.kids[container.parent.kids.lastIndexOf(container)] = h;
      container.open = false;
      tip = h;
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function hrStart() {
      if (indented) return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 42 && c !== 45 && c !== 95) return 0;
      let n = 0;
      for (let j = nextNonspace; j < ln.length; j++) { const d = ln.charCodeAt(j); if (d === c) n++; else if (!isSp(d)) return 0; }
      if (n < 3) return 0;
      closeUnmatched();
      addChild('hr');
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function listMarker(container) {
      if (indent >= 4) return null;
      const c = ln.charCodeAt(nextNonspace);
      const ld = { type: '', tight: true, bullet: '', start: 0, delim: '', padding: 0, markerOffset: indent };
      let mlen;
      if (c === 42 || c === 43 || c === 45) { ld.type = 'bullet'; ld.bullet = ln[nextNonspace]; mlen = 1; }
      else if (isDigit(c)) {
        let j = nextNonspace; while (j - nextNonspace < 10 && isDigit(ln.charCodeAt(j))) j++;
        const dn = j - nextNonspace, d = ln.charCodeAt(j);
        if (dn > 9 || (d !== 46 && d !== 41)) return null;
        if (container.type === 'para' && !(dn === 1 && c === 49)) return null;
        ld.type = 'ordered'; ld.start = parseInt(ln.substr(nextNonspace, dn), 10); ld.delim = ln[j]; mlen = dn + 1;
      } else return null;
      const nc = ln.charCodeAt(nextNonspace + mlen);
      if (!(nextNonspace + mlen >= ln.length || nc === 9 || nc === 32)) return null;
      if (container.type === 'para' && blankFrom(ln, nextNonspace + mlen)) return null;
      advanceNextNonspace(); advanceOffset(mlen, true);
      const spCol = column, spOff = offset;
      do { advanceOffset(1, true); } while (column - spCol < 5 && isSp(ln.charCodeAt(offset)));
      const blankItem = offset >= ln.length, after = column - spCol;
      if (after >= 5 || after < 1 || blankItem) {
        ld.padding = mlen + 1; column = spCol; offset = spOff;
        if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
      } else ld.padding = mlen + after;
      return ld;
    }
    function itemStart(container) {
      if ((indented && container.type !== 'list') || container.depth >= MAX_NEST) return 0;
      const ld = listMarker(container);
      if (!ld) return 0;
      closeUnmatched();
      if (tip.type !== 'list' || !container.ld || container.ld.type !== ld.type || container.ld.delim !== ld.delim || container.ld.bullet !== ld.bullet) addChild('list').ld = ld;
      addChild('item').ld = ld;
      return 1;
    }
    // A line of delimiters under a line of text makes a table (the text line is the header; earlier lines stay a paragraph).
    function tableStart(container) {
      if (indented || container.type !== 'para') return 0;
      const c0 = ln.charCodeAt(nextNonspace);
      if (c0 !== 124 && c0 !== 58 && c0 !== 45) return 0;
      const aligns = delimRow(ln.slice(nextNonspace));
      if (!aligns) return 0;
      const c = container.content;
      if (c.length < 2) return 0;
      const nl = c.lastIndexOf('\n', c.length - 2), row = c.slice(nl + 1, c.length - 1), head = splitCells(row);
      if (head.length !== aligns.length || trimWS(row) === '|') return 0;       // a lone | is not a row
      closeUnmatched();
      container.content = c.slice(0, nl + 1);
      finalize(container);
      const t = addChild('table');
      t.align = aligns; t.head = head; t.rows = [];
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function codeStart() {
      if (!(indented && tip.type !== 'para' && !blank)) return 0;
      advanceOffset(4, true); closeUnmatched();
      addChild('code').fenced = false;
      return 2;
    }
    const STARTS = [quoteStart, atxStart, fenceStart, setextStart, hrStart, itemStart, tableStart, codeStart];
    const special = c => (c >= 48 && c <= 58) || c === 35 || c === 96 || c === 126 || c === 42 || c === 43 || c === 95 || c === 61 || c === 62 || c === 45 || c === 124;

    function incorporateLine(line) {
      let container = doc;
      oldtip = tip; offset = 0; column = 0; blank = false; partialTab = false; lineNo++;
      ln = line;
      for (let last; (last = container.kids[container.kids.length - 1]) && last.open;) {
        container = last;
        findNextNonspace();
        const r = cont(container);
        if (r === 1) { container = container.parent; break; }
        if (r === 2) return;
      }
      allClosed = container === oldtip;
      lastMatched = container;
      let leaf = container.type === 'code';
      while (!leaf) {
        findNextNonspace();
        if (!indented && !special(ln.charCodeAt(nextNonspace))) { advanceNextNonspace(); break; }
        let i = 0;
        for (; i < STARTS.length; i++) {
          const res = STARTS[i](container);
          if (res === 1) { container = tip; break; }
          if (res === 2) { container = tip; leaf = true; break; }
        }
        if (i === STARTS.length) { advanceNextNonspace(); break; }
      }
      if (!allClosed && !blank && tip.type === 'para') { addLine(); return; }
      closeUnmatched();
      if (blank && container.kids.length) container.kids[container.kids.length - 1].blankEnd = true;
      const t = container.type;
      const lastBlank = blank && !(t === 'quote' || (t === 'code' && container.fenced) || (t === 'item' && !container.kids.length && container.line === lineNo));
      for (let c = container; c; c = c.parent) c.blankEnd = lastBlank;
      if (t === 'code' || t === 'para') addLine();
      else if (offset < ln.length && !blank) {
        if (t === 'table') {
          const cells = splitCells(ln.slice(offset)), n = container.align.length;
          while (cells.length < n) cells.push('');
          container.rows.push(cells.slice(0, n));
        } else { addChild('para'); advanceNextNonspace(); addLine(); }
      }
    }

    for (let i = 0, nl; i <= src.length; i = nl + 1) {
      nl = src.indexOf('\n', i); if (nl < 0) nl = src.length;
      if (nl === src.length && i === nl && i > 0) break;           // the text ended with a line break
      incorporateLine(src.slice(i, nl));
    }
    while (tip) finalize(tip);
    return doc;
  }

  // A task item's first paragraph starts with [ ], [x] or [X], then a space, then more text: { on, len } (len = what to cut off), else null.
  const taskMark = c => {
    if (c.charCodeAt(0) !== 91 || c.charCodeAt(2) !== 93 || !(c[1] === ' ' || c[1] === 'x' || c[1] === 'X')) return null;
    const w = c.charCodeAt(3);
    if (!(isSp(w) || w === 10)) return null;
    let k = 4; while (k < c.length && (isSp(c.charCodeAt(k)) || c.charCodeAt(k) === 10)) k++;
    return k >= c.length ? null : { on: c[1] !== ' ', len: k };
  };
  // Containers and leaves -> blocks of the tree.
  function build(node, refs, ctx) {
    const out = [];
    for (const k of node.kids) {
      switch (k.type) {
        case 'para': { const inline = inlineOf(k.content, refs, ctx); if (inline.length) out.push({ t: 'p', inline }); break; }
        case 'heading': { const h = { t: 'h', level: k.level, inline: inlineOf(k.content, refs, ctx), id: '' }; ctx.heads.push(h); out.push(h); break; }
        case 'hr': out.push({ t: 'hr' }); break;
        case 'code': { const lit = k.literal || '';           // the language is the first word of a fence's info string
          out.push({ t: 'code', lang: k.fenced ? k.info.split(/[ \t]/, 1)[0] : '', text: lit.endsWith('\n') ? lit.slice(0, -1) : lit }); break; }
        case 'quote': out.push({ t: 'quote', blocks: build(k, refs, ctx) }); break;
        case 'list': {
          const items = k.kids.map(it => {
            let checked = null;
            const f = it.kids[0];
            if (f && f.type === 'para' && f.line === it.line) { const m = taskMark(f.content); if (m) { checked = m.on; f.content = f.content.slice(m.len); } }
            return { checked, blocks: build(it, refs, ctx) };
          });
          out.push(k.ld.type === 'ordered' ? { t: 'ol', start: k.ld.start, tight: k.ld.tight, items } : { t: 'ul', tight: k.ld.tight, items });
          break;
        }
        case 'table': { const cell = c => inlineOf(c, refs, ctx); out.push({ t: 'table', align: k.align, head: k.head.map(cell), rows: k.rows.map(r => r.map(cell)) }); break; }
        default: break;
      }
    }
    return out;
  }
  // The text of inline nodes without any marks.
  function textOf(nodes) {
    let s = '';
    for (const x of nodes) {
      if (x.t === 'text' || x.t === 'code') s += x.v;
      else if (x.t === 'img') s += x.alt;
      else if (x.t === 'br') s += ' ';
      else if (x.c) s += textOf(x.c);
    }
    return s;
  }
  // GitHub-style ids: lower case, letters, numbers, - and _ only, spaces become -, a repeat gets -1, -2. In the text,
  // a link to (#some-heading) points at that heading's id.
  const slugify = t => t.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-') || 'section';
  function assignIds(heads, links) {
    const used = new Set(), counts = new Map();
    for (const h of heads) {
      const base = slugify(textOf(h.inline));
      let id = base;
      if (used.has(id)) { let n = counts.get(base) || 0; do { n++; id = base + '-' + n; } while (used.has(id)); counts.set(base, n); }
      used.add(id);
      h.id = 'g-' + id;
    }
    for (const a of links) {
      if (a.href.charCodeAt(0) !== 35) continue;
      let f = a.href.slice(1);
      try { f = decodeURIComponent(f); } catch (e) { /* stays as written */ }
      f = f.toLowerCase();
      if (used.has(f)) a.href = encodeUrl('#g-' + f);
    }
  }
  function parse(md) {
    const src = clean(md);
    try {
      const refs = new Map(), ctx = { urls: 0, links: [], heads: [] };
      const blocks = build(parseBlocks(src, refs), refs, ctx);
      assignIds(ctx.heads, ctx.links);
      return blocks;
    } catch (e) {
      errors++;
      return src ? [{ t: 'p', inline: [{ t: 'text', v: src.slice(0, 5000) }] }] : [];
    }
  }

  // ---------- showing: the tree -> HTML ----------
  // Only these tags are ever written: div h1-h6 p br strong em del code pre blockquote ul ol li span hr table thead
  // tbody tr th td a img. And only these attributes: class (gd, gd-task, gd-box, gd-on, language-x), id (on headings), href data-tip rel
  // target (a), src alt data-tip loading decoding (img), start (ol), role="img" and aria-label (a task's box, a span: Lucida's own
  // check, drawn by CSS, never a browser's checkbox), style="text-align:x" (th, td).
  // No line breaks between tags (only inside pre), so the same text always gives the same HTML.
  // opts.image(src) says whether a picture may show: it returns the address to use or '' to refuse.
  const LANG = /^[A-Za-z0-9_+#-]{1,20}$/;
  function renderer(opts) {
    const custom = opts && typeof opts.image === 'function' ? opts.image : null;
    let pictures = 0;
    function picture(src) {
      if (pictures >= MAX_IMAGES) return '';
      let u = src;
      if (custom) {
        try { u = custom(src); } catch (e) { u = ''; }
        u = typeof u === 'string' && u ? encodeUrl(u) : '';
        if (!imgOk(u)) u = '';
      } else if (!ownImg(src)) u = '';
      if (u) pictures++;
      return u;
    }
    function inline(nodes) {
      let h = '';
      for (const x of nodes) {
        switch (x.t) {
          case 'text': h += esc(x.v); break;
          case 'b': h += '<strong>' + inline(x.c) + '</strong>'; break;
          case 'i': h += '<em>' + inline(x.c) + '</em>'; break;
          case 's': h += '<del>' + inline(x.c) + '</del>'; break;
          case 'code': h += '<code>' + esc(x.v) + '</code>'; break;
          case 'br': h += '<br>'; break;
          case 'a':
            h += linkOk(x.href)
              ? '<a href="' + escA(x.href) + '"' + (x.title ? ' data-tip="' + escA(x.title) + '"' : '') + ' rel="nofollow ugc noopener"' + (x.href.charCodeAt(0) === 35 ? '' : ' target="_blank"') + '>' + inline(x.c) + '</a>'
              : inline(x.c);
            break;
          case 'img': {
            const u = picture(x.src);
            h += u ? '<img src="' + escA(u) + '" alt="' + escA(x.alt) + '"' + (x.title ? ' data-tip="' + escA(x.title) + '"' : '') + ' loading="lazy" decoding="async">' : esc(x.alt);
            break;
          }
          default: break;
        }
      }
      return h;
    }
    function item(it, tight) {
      const task = it.checked === true || it.checked === false;
      const box = '<span class="gd-box' + (it.checked ? ' gd-on' : '') + '" role="img" aria-label="' + (it.checked ? 'Done' : 'Not done') + '"></span>';
      let h = '';
      it.blocks.forEach((b, i) => {
        if (b.t === 'p' && i === 0 && task) h += tight ? box + ' ' + inline(b.inline) : '<p>' + box + ' ' + inline(b.inline) + '</p>';
        else if (b.t === 'p' && tight) h += inline(b.inline);
        else h += (i === 0 && task ? box : '') + block(b, tight);
      });
      if (task && !it.blocks.length) h = box;
      return '<li' + (task ? ' class="gd-task"' : '') + '>' + h + '</li>';
    }
    function block(b) {
      switch (b.t) {
        case 'h': { const n = Math.max(1, Math.min(6, b.level | 0)); return '<h' + n + ' id="' + escA(b.id) + '">' + inline(b.inline) + '</h' + n + '>'; }
        case 'p': { const h = inline(b.inline); return h ? '<p>' + h + '</p>' : ''; }
        case 'code': return '<pre><code' + (LANG.test(b.lang) ? ' class="language-' + escA(b.lang) + '"' : '') + '>' + esc(b.text) + (b.text ? '\n' : '') + '</code></pre>';
        case 'quote': return '<blockquote>' + b.blocks.map(block).join('') + '</blockquote>';
        case 'hr': return '<hr>';
        case 'ul': return '<ul>' + b.items.map(it => item(it, b.tight)).join('') + '</ul>';
        case 'ol': return (b.start !== 1 ? '<ol start="' + (b.start | 0) + '">' : '<ol>') + b.items.map(it => item(it, b.tight)).join('') + '</ol>';
        case 'table': {
          const al = i => (b.align[i] === 'left' || b.align[i] === 'right' || b.align[i] === 'center' ? ' style="text-align:' + b.align[i] + '"' : '');
          return '<table><thead><tr>' + b.head.map((c, i) => '<th' + al(i) + '>' + inline(c) + '</th>').join('') + '</tr></thead>'
            + (b.rows.length ? '<tbody>' + b.rows.map(r => '<tr>' + r.map((c, i) => '<td' + al(i) + '>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody>' : '') + '</table>';
        }
        default: return '';
      }
    }
    return block;
  }
  function render(md, opts) {
    try {
      const block = renderer(opts);
      return '<div class="gd">' + parse(md).map(block).join('') + '</div>';
    } catch (e) {
      errors++;
      return '<div class="gd"><p>' + esc(clean(md).slice(0, 5000)) + '</p></div>';
    }
  }

  // ---------- plain text and outline ----------
  // The words without any marks: a heading, a paragraph, a list item, a code line, a table row each on its own line.
  function plainLines(blocks, out) {
    for (const b of blocks) {
      switch (b.t) {
        case 'h': case 'p': { const t = textOf(b.inline); if (t) out.push(t); break; }
        case 'code': for (const l of b.text.split('\n')) if (l) out.push(l); break;
        case 'quote': plainLines(b.blocks, out); break;
        case 'ul': case 'ol': for (const it of b.items) plainLines(it.blocks, out); break;
        case 'table': for (const r of [b.head, ...b.rows]) { const t = r.map(textOf).filter(Boolean).join(' '); if (t) out.push(t); } break;
        default: break;
      }
    }
    return out;
  }
  function plain(md, n) {
    try {
      let t = plainLines(parse(md), []).join('\n');
      if (typeof n === 'number' && n >= 0 && t.length > n) {
        t = t.slice(0, Math.floor(n));
        const c = t.charCodeAt(t.length - 1);
        if (c >= 0xd800 && c <= 0xdbff) t = t.slice(0, -1);
        t = t.trimEnd();
      }
      return t;
    } catch (e) { errors++; return ''; }
  }
  function headings(md) {
    const out = [];
    const walk = blocks => {
      for (const b of blocks) {
        if (b.t === 'h') out.push({ level: b.level, text: textOf(b.inline), id: b.id });
        else if (b.t === 'quote') walk(b.blocks);
        else if (b.t === 'ul' || b.t === 'ol') b.items.forEach(it => walk(it.blocks));
      }
    };
    try { walk(parse(md)); } catch (e) { errors++; }
    return out;
  }

  // ---------- the toolbar: editing a text field's text ----------
  // Every helper takes the text and the selection (a..b, either way round) and returns { text, a, b }: the new text and
  // the new selection. Nothing here changes anything else, so the page just puts the result back into the field.
  const num = (v, n, d) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(Math.floor(v), n)) : d);
  function range(text, a, b) { const n = text.length, x = num(a, n, n), y = num(b, n, x); return x <= y ? [x, y] : [y, x]; }
  const lineStart = (t, i) => (i <= 0 ? 0 : t.lastIndexOf('\n', i - 1) + 1);
  const lineEnd = (t, i) => { const j = t.indexOf('\n', i); return j < 0 ? t.length : j; };
  const runLen = (t, i, ch, dir) => { let k = 0; while (dir < 0 ? i - 1 - k >= 0 && t[i - 1 - k] === ch : i + k < t.length && t[i + k] === ch) k++; return k; };

  // --- bold, italic, strike, code: wrap the selection, or unwrap it when it is wrapped already ---
  const MARKS = { b: ['**', '*'], i: ['*', '*'], s: ['~~', '~'], c: ['`', '`'] };
  // How many mark characters sit on each side of t[x..y]; 0 when it is not wrapped.
  function around(t, x, y, kind) {
    const ch = MARKS[kind][1], rb = runLen(t, x, ch, -1), ra = runLen(t, y, ch, 1);
    if (kind === 'b' || kind === 's') return rb >= 2 && ra >= 2 ? 2 : 0;
    if (kind === 'i') return rb % 2 === 1 && ra % 2 === 1 ? 1 : 0;
    return rb >= 1 && rb === ra ? rb : 0;
  }
  // How many mark characters t[x..y] itself starts and ends with.
  function inner(seg, kind) {
    const ch = MARKS[kind][1], m = MARKS[kind][0].length;
    let l = 0, r = 0;
    while (l < seg.length && seg[l] === ch) l++;
    while (r < seg.length - l && seg[seg.length - 1 - r] === ch) r++;
    if (kind === 'b' || kind === 's') return l >= 2 && r >= 2 && seg.length >= 2 * m ? 2 : 0;
    if (kind === 'i') return l % 2 === 1 && r % 2 === 1 ? 1 : 0;
    return l >= 1 && l === r ? l : 0;
  }
  // Where a list marker, heading marker or quote marker ends at the start of a line (for wrapping text on each line).
  function prefixEnd(line) {
    let i = 0;
    for (;;) {
      let j = i; while (j < line.length && j - i < 3 && isSp(line.charCodeAt(j))) j++;
      if (line.charCodeAt(j) === 62) { i = j + 1; if (isSp(line.charCodeAt(i))) i++; continue; }
      break;
    }
    const rest = line.slice(i), li = listInfo(rest);
    if (li) return i + li.end;
    const m = /^ {0,3}#{1,6}[ \t]+/.exec(rest);
    return m ? i + m[0].length : i;
  }
  // The pieces of the selection to mark: one per line, without list/heading/quote markers or edge spaces.
  function pieces(t, s, e) {
    const nl = t.indexOf('\n', s), multi = nl >= 0 && nl < e, out = [];
    for (let ls = lineStart(t, s); ls <= e;) {
      const le = lineEnd(t, ls);
      let x = Math.max(ls, s), y = Math.min(le, e);
      if (multi && x === ls) x = Math.min(y, ls + prefixEnd(t.slice(ls, le)));
      while (x < y && isSp(t.charCodeAt(x))) x++;
      while (y > x && isSp(t.charCodeAt(y - 1))) y--;
      if (x < y) out.push([x, y]);
      if (le >= e) break;
      ls = le + 1;
    }
    return out.length ? out : [[s, e]];
  }
  function mark(text, a, b, kind) {
    const t = str(text), [s, e] = range(t, a, b), [open, ch] = MARKS[kind];
    if (s === e) {
      const k = around(t, s, s, kind);
      if (k) return { text: t.slice(0, s - k) + t.slice(s + k), a: s - k, b: s - k };
      return { text: t.slice(0, s) + open + open + t.slice(s), a: s + open.length, b: s + open.length };
    }
    const segs = pieces(t, s, e).map(([x, y]) => ({ x, y, ko: around(t, x, y, kind), ki: inner(t.slice(x, y), kind) }));
    const un = segs.every(g => g.ko || g.ki);
    let out = '', last = 0;
    const spans = [];
    for (const g of segs) {
      let cutStart = g.x, content = t.slice(g.x, g.y), cutEnd = g.y, pre = '', post = '';
      if (un) {
        if (g.ko) { cutStart = g.x - g.ko; cutEnd = g.y + g.ko; } else content = content.slice(g.ki, content.length - g.ki);
      } else if (!g.ko && !g.ki) {
        let f = open;
        if (kind === 'c') {
          let longest = 0; for (let i = 0, r = 0; i < content.length; i++) { r = content[i] === '`' ? r + 1 : 0; if (r > longest) longest = r; }
          f = '`'.repeat(longest + 1);
          if (content[0] === '`' || content[content.length - 1] === '`') { pre = f + ' '; post = ' ' + f; } else { pre = f; post = f; }
        } else { pre = open; post = open; }
      }
      out += t.slice(last, cutStart);
      const o0 = out.length; out += pre;
      const c0 = out.length; out += content;
      const c1 = out.length; out += post;
      spans.push([o0, c0, c1, out.length]);
      last = cutEnd;
    }
    out += t.slice(last);
    // One piece: its words stay selected. Several lines: they are selected whole, marks included, so the same button takes the marks off again.
    const whole = segs.length > 1 && !un, f = spans[0], z = spans[spans.length - 1];
    return { text: out, a: whole ? f[0] : f[1], b: whole ? z[3] : z[2] };
  }
  const bold = (t, a, b) => mark(t, a, b, 'b');
  const italic = (t, a, b) => mark(t, a, b, 'i');
  const strike = (t, a, b) => mark(t, a, b, 's');
  const code = (t, a, b) => mark(t, a, b, 'c');

  // --- line by line: headings, lists, quotes, indenting ---
  // Runs fn on the selected lines (an array of lines). fn answers, for each line, null (no change) or { keep, cut, ins }: keep the
  // first `keep` characters, replace the next `cut` by `ins`, keep the rest. (Or null for "nothing to do at all".) The selection
  // stays on the same words: a position moves with the text on its line, a caret in or at the changed part ends up after the new
  // part, and the start of a selection stays in front of it, so the marks are selected too.
  function applyLines(t, a, b, fn) {
    const [s, e] = range(t, a, b);
    const ls = lineStart(t, s), le = lineEnd(t, e > s && t.charCodeAt(e - 1) === 10 ? e - 1 : e);
    const old = t.slice(ls, le).split('\n'), ch = fn(old);
    if (!ch) return { text: t, a: s, b: e };
    const info = [], out = [];
    let os = ls, ns = ls;
    old.forEach((o, i) => {
      const c = ch[i] || { keep: 0, cut: 0, ins: '' }, n = o.slice(0, c.keep) + c.ins + o.slice(c.keep + c.cut);
      out.push(n);
      info.push({ os, ns, ol: o.length, c });
      os += o.length + 1; ns += n.length + 1;
    });
    const delta = ns - os, caret = s === e;
    const map = p => {
      if (p < ls) return p;
      if (p > le) return p + delta;
      for (const g of info) {
        if (p > g.os + g.ol) continue;
        const col = p - g.os, { keep, cut, ins } = g.c;
        if (col < keep) return g.ns + col;
        if (col <= keep + cut) return g.ns + (caret || col > keep ? keep + ins.length : col);
        return g.ns + col + ins.length - cut;
      }
      return p + delta;
    };
    return { text: t.slice(0, ls) + out.join('\n') + t.slice(le), a: map(s), b: map(e) };
  }
  // Which of the lines a toggle applies to: the ones with text; blank ones too when it is the only line.
  const activeLines = lines => { const act = lines.map(l => l.trim() !== ''); return act.some(Boolean) ? act : lines.map(() => true); };
  const indentLen = l => { let i = 0; while (i < l.length && isSp(l.charCodeAt(i))) i++; return i; };
  // A list line: { indent, kind: 'bullet'|'number', marker, delim, task: null|false|true, end } where end is where the text starts.
  function listInfo(line) {
    const i = indentLen(line), c = line.charCodeAt(i);
    let kind, marker, delim = '', j;
    if (c === 45 || c === 42 || c === 43) { kind = 'bullet'; marker = line[i]; j = i + 1; }
    else if (isDigit(c)) {
      j = i; while (j < line.length && j - i < 10 && isDigit(line.charCodeAt(j))) j++;
      const d = line.charCodeAt(j);
      if (j - i > 9 || (d !== 46 && d !== 41)) return null;
      kind = 'number'; marker = line.slice(i, j); delim = line[j]; j++;
    } else return null;
    if (j < line.length && !isSp(line.charCodeAt(j))) return null;
    let k = j; while (k < line.length && isSp(line.charCodeAt(k))) k++;
    let task = null;
    if (line.charCodeAt(k) === 91 && line.charCodeAt(k + 2) === 93 && (line[k + 1] === ' ' || line[k + 1] === 'x' || line[k + 1] === 'X') && (k + 3 >= line.length || isSp(line.charCodeAt(k + 3)))) {
      task = line[k + 1] !== ' ';
      k += 3; while (k < line.length && isSp(line.charCodeAt(k))) k++;
    }
    return { indent: i, kind, marker, delim, task, end: k };
  }
  const headMark = l => { const m = /^ {0,3}(#{1,6})(?:[ \t]+|$)/.exec(l); return m ? { len: m[0].length, n: m[1].length } : { len: 0, n: 0 }; };
  function heading(text, a, b, level) {
    const t = str(text), lv = Math.max(1, Math.min(6, Math.floor(+level) || 1));
    return applyLines(t, a, b, lines => {
      const act = activeLines(lines), on = lines.every((l, i) => !act[i] || headMark(l).n === lv);
      return lines.map((l, i) => (act[i] ? { keep: 0, cut: headMark(l).len, ins: on ? '' : '#'.repeat(lv) + ' ' } : null));
    });
  }
  function listOp(text, a, b, kind) {
    return applyLines(str(text), a, b, lines => {
      const act = activeLines(lines), infos = lines.map((l, i) => (act[i] ? listInfo(l) : null));
      const fits = g => !!g && (kind === 'bullet' ? g.kind === 'bullet' && g.task === null : kind === 'number' ? g.kind === 'number' : g.kind === 'bullet' && g.task !== null);
      const on = lines.every((l, i) => !act[i] || fits(infos[i]));
      let n = 0;
      return lines.map((l, i) => {
        if (!act[i]) return null;
        const g = infos[i], keep = g ? g.indent : indentLen(l), cut = g ? g.end - g.indent : 0;
        if (on) return { keep, cut, ins: '' };
        n++;
        if (kind === 'bullet') return { keep, cut, ins: '- ' };
        if (kind === 'number') return { keep, cut, ins: n + '. ' };
        return g && g.kind === 'bullet' && g.task !== null ? null : { keep, cut, ins: '- [ ] ' };
      });
    });
  }
  const bullets = (t, a, b) => listOp(t, a, b, 'bullet');
  const numbers = (t, a, b) => listOp(t, a, b, 'number');
  const tasks = (t, a, b) => listOp(t, a, b, 'task');
  function quote(text, a, b) {
    return applyLines(str(text), a, b, lines => {
      const q = l => /^ {0,3}>/.test(l), on = lines.every(q);
      return lines.map(l => {
        if (on) { const m = /^( {0,3})> ?/.exec(l); return { keep: m[1].length, cut: m[0].length - m[1].length, ins: '' }; }
        return q(l) ? null : { keep: 0, cut: 0, ins: l.trim() === '' && lines.length > 1 ? '>' : '> ' };
      });
    });
  }
  // Tab and Shift+Tab on list lines: two spaces in or out. Nothing changes when no selected line is a list line.
  function indentLines(text, a, b, out) {
    return applyLines(str(text), a, b, lines => {
      if (!lines.some(l => listInfo(l))) return null;
      return lines.map(l => {
        if (!l.trim()) return null;
        if (!out) return { keep: 0, cut: 0, ins: '  ' };
        const m = /^(?: {1,2}|\t)/.exec(l);
        return m ? { keep: 0, cut: m[0].length, ins: '' } : null;
      });
    });
  }
  // Enter at pos (a caret) in a list: the next item starts (bullets, numbers going up, tasks unchecked); Enter on an empty
  // item ends the list. null means "do nothing special" (not in a list, caret before the marker, or inside a code block).
  function inFence(t, upto) {
    let fence = null;
    for (let ls = 0; ls < upto;) {
      const le = lineEnd(t, ls), line = t.slice(ls, le);
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) { if (m && m[1][0] === fence.ch && m[1].length >= fence.len && line.slice(m[0].length).trim() === '') fence = null; }
      else if (m && !(m[1][0] === '`' && line.indexOf('`', m[0].length) >= 0)) fence = { ch: m[1][0], len: m[1].length };
      ls = le + 1;
    }
    return !!fence;
  }
  function continueList(text, pos) {
    try {
      const t = str(text), p = num(pos, t.length, t.length);
      const ls = lineStart(t, p), le = lineEnd(t, p), line = t.slice(ls, le), g = listInfo(line);
      if (!g || p - ls < g.end || inFence(t, ls)) return null;
      const markLen = g.kind === 'bullet' ? 1 : g.marker.length + 1;
      if (!isSp(line.charCodeAt(g.indent + markLen))) return null;     // a lone "-" is not an item yet
      if (line.slice(g.end).trim() === '') return { text: t.slice(0, ls) + t.slice(le), pos: ls };
      const mk = g.kind === 'bullet' ? g.marker : (parseInt(g.marker, 10) + 1) + g.delim;
      const ins = '\n' + line.slice(0, g.indent) + mk + ' ' + (g.task !== null ? '[ ] ' : '');
      return { text: t.slice(0, p) + ins + t.slice(p), pos: p + ins.length };
    } catch (e) { errors++; return null; }
  }
  // A link or picture address typed into the toolbar, made safe to put between ( and ).
  const inParens = u => str(u).trim().replace(/[ \t\n\r]/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/</g, '%3C').replace(/>/g, '%3E');
  function link(text, a, b, url) {
    const t = str(text), [s, e] = range(t, a, b), u = inParens(url);
    if (s === e) { const ins = '[text](' + u + ')'; return { text: t.slice(0, s) + ins + t.slice(e), a: s + 1, b: s + 5 }; }
    const ins = '[' + t.slice(s, e) + '](' + u + ')', end = s + ins.length;
    return { text: t.slice(0, s) + ins + t.slice(e), a: u ? end : end - 1, b: u ? end : end - 1 };
  }
  function image(text, a, b, src, alt) {
    const t = str(text), [s, e] = range(t, a, b);
    const label = (alt !== undefined && alt !== null && str(alt) !== '' ? str(alt) : e > s ? t.slice(s, e) : 'image').replace(/\s+/g, ' ').replace(/[\\\[\]]/g, '\\$&');
    const ins = '![' + label + '](' + inParens(src) + ')';
    return { text: t.slice(0, s) + ins + t.slice(e), a: s + ins.length, b: s + ins.length };
  }
  // A block of text put in with blank lines around it, at the end of the selection.
  function insertBlock(t, p, blk) {
    const before = t.slice(0, p), after = t.slice(p);
    const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = !after ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    return { text: before + lead + blk + trail + after, at: p + lead.length, end: p + lead.length + blk.length + trail.length };
  }
  const TABLE = '| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |';
  function table(text, a, b) {
    const t = str(text), [, e] = range(t, a, b), r = insertBlock(t, e, TABLE);
    return { text: r.text, a: r.at + 2, b: r.at + 10 };
  }
  function rule(text, a, b) {
    const t = str(text), [, e] = range(t, a, b), r = insertBlock(t, e, '---');
    return { text: r.text, a: r.end, b: r.end };
  }
  function codeBlock(text, a, b) {
    const t = str(text), [s, e] = range(t, a, b);
    const ls = lineStart(t, s), le = lineEnd(t, e > s && t.charCodeAt(e - 1) === 10 ? e - 1 : e), body = t.slice(ls, le), lines = body.split('\n');
    const isFence = l => /^ {0,3}(`{3,}|~{3,})/.test(l);
    // already fenced (the fences are in the selection, or just around it): take them off
    if (lines.length >= 2 && isFence(lines[0]) && isFence(lines[lines.length - 1])) {
      const inside = lines.slice(1, -1).join('\n');
      return { text: t.slice(0, ls) + inside + t.slice(le), a: ls, b: ls + inside.length };
    }
    const pl = ls > 0 ? lineStart(t, ls - 1) : -1, nl = le < t.length ? lineEnd(t, le + 1) : -1;
    if (pl >= 0 && nl >= 0 && isFence(t.slice(pl, ls - 1)) && isFence(t.slice(le + 1, nl)) && inFence(t, ls)) {
      return { text: t.slice(0, pl) + body + t.slice(nl), a: pl, b: pl + body.length };
    }
    let longest = 0;
    for (let i = 0, r = 0; i < body.length; i++) { r = body[i] === '`' ? r + 1 : 0; if (r > longest) longest = r; }
    const f = '`'.repeat(Math.max(3, longest + 1));
    return { text: t.slice(0, ls) + f + '\n' + body + '\n' + f + t.slice(le), a: ls + f.length + 1, b: ls + f.length + 1 + body.length };
  }

  return {
    MAX, parse, render, plain, headings,
    bold, italic, strike, code, heading, bullets, numbers, tasks, quote, link, codeBlock, table, rule, image, continueList, indent: indentLines,
    // How many unexpected errors were caught and hidden (always 0 unless there is a bug).
    get errors() { return errors; }
  };
})()); }
mockMaterials() {
  const p = this.props, noop = () => {};
  const day = (m, d) => new Date(2026, m, d, 10).getTime();
  const MK = (() => {
    const free = { perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20, audioMB: 25, cards: 100 }, pro = { perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40, audioMB: 25, cards: 100 };
    const base = { step: 'add', kind: '', from: null, on: true, videoOn: true, limits: pro, files: [], text: '', topic: '', url: '', transcript: false, title: '', opts: { count: 'auto', basic: true, cloze: true, audio: false, lang: '', deckId: '', deckName: '' },
      rec: null, progress: { word: '', phase: '', i: 0, n: 1 }, cards: [], notes: null, keepNotes: true, editing: '', error: null, saving: false, ready: false, name: '', job: '' };
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
    const by = {
      'Pick': { step: 'pick' }, 'Upload': { kind: 'file' }, 'Upload (a file added)': { kind: 'file', files: [slides], ready: true },
      'Photos': { kind: 'photo', ready: true, files: ['IMG_2041.jpg', 'IMG_2042.jpg', 'IMG_2043.jpg'].map((name, i) => ({ i, name, size: (1.1 + i * .3).toFixed(1) + ' MB', fam: 'image' })) },
      'Record': { kind: 'record' }, 'Recording': { kind: 'record', rec: { state: 'recording', secs: 754, levels, level: .4, limit: 7200 } }, 'Paused': { kind: 'record', rec: { state: 'paused', secs: 754, levels, level: 0, limit: 7200 } },
      'Paste': { kind: 'paste', ready: true, text: 'The mitochondrion is the powerhouse of the cell. It makes most of the cell’s ATP through the electron transport chain, which pumps protons across the inner membrane.\n\nThe nucleus holds the cell’s DNA, and the ribosomes translate mRNA into protein.' },
      'Paste (a language set)': { kind: 'paste', ready: true, text: 'la casa · the house\nbuenos días · good morning\n¿Dónde está la biblioteca? · Where is the library?\nElla tiene dos hermanos · She has two siblings', opts: { count: 'auto', basic: true, cloze: true, audio: true, lang: 'es', deckId: '', deckName: '' } },
      'Paste (language list)': { kind: 'paste', ready: true, text: 'la casa · the house\nbuenos días · good morning\n¿Dónde está la biblioteca? · Where is the library?\nElla tiene dos hermanos · She has two siblings', opts: { count: 'auto', basic: true, cloze: true, audio: true, lang: 'es', deckId: '', deckName: '' } },
      'YouTube': { kind: 'video', ready: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      'YouTube transcript': { kind: 'video', ready: true, transcript: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', text: '0:00\nWelcome to the lecture on enzymes\n0:20\nAn enzyme lowers the activation energy of a reaction' },
      'Topic': { kind: 'topic', ready: true, topic: 'The Krebs cycle' }, 'More from a source': { kind: 'file', ready: true, from: { deckId: 'cell', id: 'x1', name: 'Lecture 3 slides', kind: 'file' } },
      'Making': { step: 'making', kind: 'file', progress: { word: 'Writing cards…', phase: 'write', i: 3, n: 8 } },
      'Making a recording': { step: 'making', kind: 'record', progress: { word: 'Listening to your recording…', phase: 'read', i: 1, n: 2 } },
      'Review': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes }, 'Review (notes open)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes }, 'Review (notes off)': { step: 'review', kind: 'file', cards, name: 'Lecture 3 slides', notes, keepNotes: false },
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
  const GMODE = p.guide || 'Guide and sources';
  return { make: MK,
    publicGuide: () => (GMODE === 'No guide yet' ? { pages: [], sources: 0 } : { pages: [{ id: 'main', title: 'Guide', text: GD.text }, ...(GMODE === 'Guide pages' ? GD.pages : [])], sources: 5 }),
    guide: () => ({ deckId: 'cell', text: GMODE === 'No guide yet' ? '' : GMODE === 'Long guide' ? GD.text + '\n\n' + GD.text.replace('# Cell Biology: Exam 1', '## More for the exam') : GD.text, at: 0, pages: GMODE === 'Guide pages' ? GD.pages : [], can: GMODE !== 'Studying (read only)', studying: GMODE === 'Studying (read only)' }),
    sources: () => (['No guide yet', 'Studying (read only)'].includes(GMODE) ? [] : GD.sources),
    sourceText: name => (/^sx2/.test(name) || /^sx3/.test(name) ? GD.talk : ''),
    guideHistory: () => Promise.resolve([{ at: day(8, 21), saved: 0, text: GD.text.replace('- [x] The electron transport chain', '- [ ] The electron transport chain') }, { at: day(8, 18), saved: 0, text: '# Cell Biology: Exam 1\n\nEverything for the first exam.' }]),
    saveGuide: () => Promise.resolve({}), addGuidePage: () => Promise.resolve('g9'), renameGuidePage: () => Promise.resolve({}), deleteGuidePage: () => Promise.resolve({}), restoreGuide: () => Promise.resolve({}), deleteSource: () => Promise.resolve({}) };
}

constructor(props) { super(props); this.state = { tab: props.view === 'Preview' ? 'preview' : 'write', histOpen: props.view === 'Older versions', drafts: {}, saving: false, err: '', hist: null }; }
componentWillUnmount() { clearTimeout(this._t); if (this._pending) this._flush(); }
renderVals() { const v = this.renderVals0(); return { ...v, ask: this.askPreview(v.t || this.theme(!!this.props.dark, !!this.props.dim), {"Delete page":{"title":"Delete the page “Lecture 3 summary”?","line":"","action":"Delete page","danger":true}}) }; }
askPreview(t, samples) {
  const q = samples[this.props.ask || ''];
  return q ? { show: true, title: q.title, line: q.line, hasLine: !!q.line, action: q.action, bg: q.danger ? t.againTint : t.inv, fg: q.danger ? t.again : t.invText, yes: () => {}, no: () => {} } : { show: false };
}
renderVals0() {
  const t = this.theme(!!this.props.dark, !!this.props.dim);const db = this.props.db || this.mock(); const chrome = db.chrome();
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
    deletePage: async () => { if (!mock && !(await db.ask({ title: 'Delete the page “' + cur.title + '”?', action: 'Delete page', danger: true }))) return; await am.deleteGuidePage(deckId, pageId); this.setState({ page: 'main', drafts: Object.fromEntries(Object.entries(this.state.drafts).filter(([k]) => k !== key)) }); },
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
    makeLabel: 'Make cards from this ' + (pageId === 'main' ? 'guide' : 'page'),
    makeCards: () => { const el = ta(), sel = el && el.selectionEnd > el.selectionStart ? el.value.slice(el.selectionStart, el.selectionEnd) : ''; if (mock) return; this._flush().then(() => db.make.begin({ kind: 'paste', noNotes: true, text: sel || text, title: sel ? dk.name + ' (selection)' : dk.name + (pageId === 'main' ? ' Guide' : ': ' + cur.title), opts: { deckId } })); },
    histOpen, versions: histNow, noVersions: histOpen && st.hist !== null && !versions.length, histLine: 'Older versions of ' + (pageId === 'main' ? 'the Guide' : cur.title) + '. Restoring one keeps what you have now as a version too.'
  };
}
}
return Component;
  }
};
