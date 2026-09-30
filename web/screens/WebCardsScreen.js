// Made from design/canvas/project/WebCardsScreen.dc.html by design/to-web.mjs. Change the design, not this file.
export default {
  name: "WebCardsScreen", title: "Web · Edit cards (Option B)", w: 1440, h: 900, fill: true,
  props: {"dark":false,"dim":false,"cardType":"Basic","newCard":false,"recording":false,"paused":false},
  imports: [],
  css: "body{margin:0;font-family:Geist, -apple-system, system-ui, sans-serif}\na{color:inherit;text-decoration:none}a:hover{opacity:.8}\n@keyframes scRise{from{opacity:0;transform:translateY(14px)}}main>*{animation:scRise .5s cubic-bezier(.2,.8,.2,1) backwards}main>*:nth-child(2){animation-delay:0.06s}main>*:nth-child(3){animation-delay:0.12s}main>*:nth-child(4){animation-delay:0.18s}main>*:nth-child(5){animation-delay:0.24s}main>*:nth-child(n+6){animation-delay:.3s}button,.sc-press{transition:transform .1s ease}button:active,.sc-press:active{transform:scale(.96)}.sc-sw{transition:background-color .3s ease,transform .1s ease}.sc-sw>span{transition:transform .32s cubic-bezier(.34,1.56,.64,1),background-color .3s ease}.sc-lift{transition:transform 1s ease-out,box-shadow 1s ease-out}.sc-lift:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}.sk-cover{box-shadow:var(--sk-shadow)}.sk-cover.sc-lift:hover{box-shadow:var(--sk-shadow),0 24px 48px -24px rgba(0,0,0,.45)}@keyframes scScrimIn{from{opacity:0}}@keyframes scScrimOut{to{opacity:0}}.sc-scrim{animation:scScrimIn .35s ease backwards}.sc-scrim.sc-gone{animation:scScrimOut .26s ease forwards}@keyframes scPanelIn{from{opacity:0;transform:translateX(calc(100% + 12px))}}@keyframes scPanelOut{to{opacity:0;transform:translateX(calc(100% + 12px))}}.sc-panel{animation:scPanelIn .35s cubic-bezier(.2,.8,.2,1) backwards}.sc-panel.sc-gone{animation:scPanelOut .26s cubic-bezier(.4,0,1,1) forwards}@keyframes scSheetIn{from{transform:translateY(100%)}}@keyframes scSheetOut{to{transform:translateY(100%)}}.sc-sheet{animation:scSheetIn .35s cubic-bezier(.2,.8,.2,1) backwards}.sc-sheet.sc-gone{animation:scSheetOut .26s cubic-bezier(.4,0,1,1) forwards}@keyframes scFloat{50%{transform:translateY(-6px)}}@keyframes scSwayA{50%{transform:rotate(-13deg) translateX(-3px)}}@keyframes scSwayB{50%{transform:rotate(10deg) translateX(3px)}}@keyframes scGlow{50%{opacity:.55}}@keyframes scSheen{0%,58%{transform:translateX(-160%) skewX(-18deg)}86%,100%{transform:translateX(260%) skewX(-18deg)}}.sc-float{animation:scFloat 6s ease-in-out infinite}.sc-sway-a{animation:scSwayA 6s ease-in-out infinite}.sc-sway-b{animation:scSwayB 6s ease-in-out infinite}.sc-glow{animation:scGlow 6s ease-in-out infinite}.sc-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:scSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}@keyframes scDrift{from{transform:scale(1.14) translate(-3%,-2%)}to{transform:scale(1.14) translate(3%,2%)}}.sc-alive>svg:first-of-type{animation:scDrift 16s ease-in-out infinite alternate}@keyframes scDraw{from{stroke-dashoffset:1.02}}.sc-draw{stroke-dasharray:1 2;animation:scDraw .9s cubic-bezier(.2,.8,.2,1) backwards}@keyframes scKnob{from{opacity:0;transform:scale(.3)}}.sc-knob{transform-box:fill-box;transform-origin:center;animation:scKnob .35s .75s cubic-bezier(.34,1.56,.64,1) backwards}@keyframes scGrow{from{transform:scaleY(0)}}.sc-grow{transform-origin:bottom;animation:scGrow .6s cubic-bezier(.2,.8,.2,1) backwards}:nth-child(2)>.sc-grow{animation-delay:0.04s}:nth-child(3)>.sc-grow{animation-delay:0.08s}:nth-child(4)>.sc-grow{animation-delay:0.12s}:nth-child(5)>.sc-grow{animation-delay:0.16s}:nth-child(6)>.sc-grow{animation-delay:0.20s}:nth-child(7)>.sc-grow{animation-delay:0.24s}:nth-child(8)>.sc-grow{animation-delay:0.28s}:nth-child(9)>.sc-grow{animation-delay:0.32s}:nth-child(10)>.sc-grow{animation-delay:0.36s}:nth-child(11)>.sc-grow{animation-delay:0.40s}:nth-child(12)>.sc-grow{animation-delay:0.44s}:nth-child(13)>.sc-grow{animation-delay:0.48s}:nth-child(14)>.sc-grow{animation-delay:0.52s}@media (prefers-reduced-motion:reduce){main>*,.sc-float,.sc-sway-a,.sc-sway-b,.sc-glow,.sc-alive>svg,.sc-draw,.sc-knob,.sc-grow,.sc-scrim,.sc-panel,.sc-sheet{animation:none!important}.sc-sheen{display:none}button:active,.sc-press:active,.sc-lift:hover{transform:none}.sc-sw>span{transition:background-color .3s ease}}\n.sc-rich[data-empty=\"true\"]::before{content:attr(data-ph);position:absolute;color:var(--ph);pointer-events:none}.sc-wave{outline:0;-webkit-tap-highlight-color:transparent}.sc-wave:focus-visible{box-shadow:0 0 0 2px currentColor;border-radius:8px}.sc-wave span{transition:height .35s cubic-bezier(.2,.8,.2,1)}button:has(.sc-hold:active,.sc-wave:active){transform:none}@keyframes scRecDot{50%{opacity:.25}}.sc-rec-dot{animation:scRecDot 1.2s ease-in-out infinite}@keyframes scPlayed{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@media (prefers-reduced-motion:reduce){.sc-wave span{transition:none}.sc-rec-dot{animation:none}}.sc-occ-h::before,.sc-occ-x::before{content:\"\";position:absolute;inset:-5px}@media (pointer:coarse){.sc-occ-h[data-occ-h=nw]::before{inset:-16px -3px -3px -16px}.sc-occ-h[data-occ-h=sw]::before{inset:-3px -3px -16px -16px}.sc-occ-h[data-occ-h=se]::before{inset:-3px -16px -16px -3px}.sc-occ-x::before{inset:-10px}}.sc-occ-pic:focus-visible{outline:2px solid currentColor;outline-offset:5px}.sc-card-row[aria-current=\"false\"]:hover{background-color:color-mix(in srgb,currentColor 4%,transparent)!important}.sc-card-row:active{transform:scale(.985)}@media (prefers-reduced-motion:reduce){.sc-card-row:active{transform:none}}",
  template: "<div style=\"width: 100%; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: Geist, -apple-system, system-ui, sans-serif; background: {{t.bg}}; color: {{t.text}};\">\n  <header style=\"position: relative; height: 64px; flex-shrink: 0; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid {{t.line}};\">\n    <a href=\"{{backHref}}\" onClick=\"{{done}}\" style=\"height: 36px; padding: 0 14px 0 10px; display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; background: {{t.surf}}; font-size: 13px; font-weight: 600;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 18l-6-6 6-6\"/></svg>{{deckName}}</a>\n    <h1 style=\"position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); margin: 0; font-size: 15px; font-weight: 600; white-space: nowrap;\">Edit cards</h1>\n    <a href=\"{{backHref}}\" onClick=\"{{done}}\" style=\"height: 36px; padding: 0 20px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 14px; font-weight: 600;\">{{doneLabel}}</a>\n  </header>\n  <div style=\"flex-grow: 1; min-height: 0; display: flex;\">\n    <section aria-label=\"Cards in {{deckName}}\" style=\"width: 360px; flex-shrink: 0; box-sizing: border-box; border-right: 1px solid {{t.line}}; display: flex; flex-direction: column;\">\n      <div style=\"padding: 20px 16px 8px; display: flex; flex-direction: column; gap: 12px;\">\n        <div style=\"display: flex; gap: 8px;\"><label style=\"flex-grow: 1; min-width: 0; height: 36px; padding: 0 14px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-3.5-3.5\"/></svg><span style=\"position: absolute; left: -9999px;\">Search cards</span><input value=\"{{listQuery}}\" onChange=\"{{setListQuery}}\" placeholder=\"Search cards\" style=\"flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: {{t.text}};\"></label><button type=\"button\" onClick=\"{{newCard}}\" style=\"height: 36px; flex-shrink: 0; padding: 0 16px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>New card</button></div>\n        <div role=\"group\" aria-label=\"Kind of card\" style=\"display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2px; padding: 3px; border-radius: 999px; background: {{t.surf}};\"><sc-for list=\"{{listKinds}}\" as=\"k\" hint-placeholder-count=\"5\"><button type=\"button\" onClick=\"{{k.pick}}\" aria-pressed=\"{{k.pressed}}\" style=\"height: 30px; padding: 0; border: 0; border-radius: 999px; background: {{k.bg}}; color: {{k.fg}}; box-shadow: {{k.sh}}; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;\">{{k.label}}</button></sc-for></div>\n        <span style=\"padding: 0 12px; font-size: 12px; color: {{t.muted}};\">{{countLabel}}</span>\n      </div>\n      <div ref=\"{{listRef}}\" style=\"flex-grow: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; box-sizing: border-box; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 2px;\">\n        <sc-for list=\"{{rows}}\" as=\"r\" hint-placeholder-count=\"6\"><button type=\"button\" onClick=\"{{r.pick}}\" aria-current=\"{{r.current}}\" class=\"sc-card-row\" style=\"flex-shrink: 0; width: 100%; box-sizing: border-box; padding: 12px; display: flex; align-items: flex-start; gap: 12px; border: 0; border-radius: 16px; background: {{r.bg}}; color: {{t.text}}; font: inherit; text-align: left; cursor: pointer;\">\n          <span style=\"width: 32px; height: 32px; flex-shrink: 0; border-radius: 16px; background: {{r.chip}}; display: flex; align-items: center; justify-content: center; font-size: 14px;\">{{r.glyph}}</span>\n          <span style=\"flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;\"><span style=\"font-size: 14px; font-weight: 500; line-height: 1.35; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;\">{{r.title}}</span><span style=\"font-size: 13px; line-height: 1.35; color: {{r.subFg}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{r.sub}}</span><sc-if value=\"{{r.hasTags}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"margin-top: 5px; display: flex; gap: 6px; min-width: 0; overflow: hidden;\"><sc-if value=\"{{r.c1.show}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; background: {{r.c1.bg}}; color: {{r.c1.fg}}; font-size: 11px; font-weight: 600; white-space: nowrap;\">{{r.c1.label}}</span></sc-if><sc-if value=\"{{r.c2.show}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; background: {{r.c2.bg}}; color: {{r.c2.fg}}; font-size: 11px; font-weight: 600; white-space: nowrap;\">{{r.c2.label}}</span></sc-if><sc-if value=\"{{r.cMore.show}}\" hint-placeholder-val=\"{{ false }}\"><span title=\"{{r.cMore.title}}\" style=\"height: 22px; padding: 0 8px; flex-shrink: 0; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}}; font-size: 11px; font-weight: 600; white-space: nowrap;\">{{r.cMore.label}}</span></sc-if></span></sc-if></span>\n          <sc-if value=\"{{r.thumb.show}}\" hint-placeholder-val=\"{{ false }}\"><span aria-hidden=\"true\" style=\"flex-shrink: 0; align-self: center; padding: 4px; border-radius: 10px; background: {{t.bg}}; box-shadow: inset 0 0 0 1px {{t.line}}; line-height: 0;\"><span style=\"position: relative; display: inline-block; line-height: 0; border-radius: 4px; overflow: hidden;\"><sc-if value=\"{{r.thumb.mock}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"48\" height=\"33\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"4\" style=\"display: block;\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/></svg></sc-if><sc-if value=\"{{r.thumb.url}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{r.thumb.url}}\" alt=\"\" style=\"display: block; max-width: 56px; max-height: 40px;\"></sc-if><sc-for list=\"{{r.thumb.boxes}}\" as=\"b\" hint-placeholder-count=\"3\"><span style=\"position: absolute; left: {{b.x}}; top: {{b.y}}; width: {{b.w}}; height: {{b.h}}; box-sizing: border-box; border-radius: 2px; background: {{t.surf2}}; box-shadow: 0 0 0 1px {{t.bg}};\"></span></sc-for></span></span></sc-if>\n        </button></sc-for>\n        <sc-if value=\"{{more.show}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{more.go}}\" style=\"flex-shrink: 0; align-self: center; margin-top: 8px; height: 36px; padding: 0 18px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\">{{more.label}}</button></sc-if>\n        <sc-if value=\"{{none}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"padding: 32px 16px; font-size: 13px; color: {{t.muted}}; text-align: center;\">{{noneLabel}}</span></sc-if>\n      </div>\n    </section>\n    <main style=\"overflow-y: auto; position: relative; flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 24px 28px; display: flex; flex-direction: column; gap: 20px;\">\n      <div style=\"display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px;\"><div style=\"flex: 0 1 380px; min-width: 300px;\"><div style=\"display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\">\n  <sc-for list=\"{{types}}\" as=\"k\" hint-placeholder-count=\"4\">\n    <button type=\"button\" onClick=\"{{k.pick}}\" style=\"height: 36px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; background: {{k.bg}}; color: {{k.fg}}; box-shadow: {{k.sh}};\">{{k.label}}</button>\n  </sc-for>\n</div></div><span style=\"flex-grow: 1;\"></span><div role=\"toolbar\" aria-label=\"Formatting\" style=\"display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px; background: {{t.surf}};\">\n      <button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.b.toggle}}\" aria-pressed=\"{{fmt.b.pressed}}\" aria-label=\"Bold\" title=\"Bold\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.b.webBg}}; box-shadow: {{fmt.b.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 16px; font-weight: 700;\">B</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.i.toggle}}\" aria-pressed=\"{{fmt.i.pressed}}\" aria-label=\"Italic\" title=\"Italic\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.i.webBg}}; box-shadow: {{fmt.i.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 17px; font-style: italic; font-family: Georgia, serif;\">I</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.u.toggle}}\" aria-pressed=\"{{fmt.u.pressed}}\" aria-label=\"Underline\" title=\"Underline\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.u.webBg}}; box-shadow: {{fmt.u.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 16px; text-decoration: underline; text-underline-offset: 3px;\">U</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.s.toggle}}\" aria-pressed=\"{{fmt.s.pressed}}\" aria-label=\"Strikethrough\" title=\"Strikethrough\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.s.webBg}}; box-shadow: {{fmt.s.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><span style=\"font-size: 16px; text-decoration: line-through;\">S</span></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.hl.toggle}}\" aria-pressed=\"{{fmt.hl.pressed}}\" aria-label=\"Highlight\" title=\"Highlight\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.hl.webBg}}; box-shadow: {{fmt.hl.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.5 4.5l5 5L11 18H6v-5z\"/><path d=\"M4 21h9\"/></svg></button><span style=\"width: 1px; height: 20px; margin: 0 4px; flex-shrink: 0; background: {{t.surf2}};\"></span><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.blank.toggle}}\" aria-pressed=\"{{fmt.blank.pressed}}\" aria-label=\"Make a blank\" title=\"Make a blank\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.blank.webBg}}; box-shadow: {{fmt.blank.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 7H5.5A2.5 2.5 0 0 0 3 9.5v5A2.5 2.5 0 0 0 5.5 17H7M17 7h1.5A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H17M9 12h6\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.list.toggle}}\" aria-pressed=\"{{fmt.list.pressed}}\" aria-label=\"List\" title=\"List\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.list.webBg}}; box-shadow: {{fmt.list.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.math.toggle}}\" aria-pressed=\"{{fmt.math.pressed}}\" aria-label=\"Math\" title=\"Math\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.math.webBg}}; box-shadow: {{fmt.math.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 13h2.5l3 6L14 5h7\"/></svg></button><span style=\"width: 1px; height: 20px; margin: 0 4px; flex-shrink: 0; background: {{t.surf2}};\"></span><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.img.toggle}}\" aria-label=\"Add image\" title=\"Add image\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.img.webBg}}; box-shadow: {{fmt.img.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg></button><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.audio.toggle}}\" aria-label=\"Add audio\" title=\"Add audio\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.audio.webBg}}; box-shadow: {{fmt.audio.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg></button><span style=\"flex-grow: 1;\"></span><button type=\"button\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{fmt.undo.toggle}}\" aria-label=\"Undo\" title=\"Undo\" style=\"width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 12px; background: {{fmt.undo.webBg}}; box-shadow: {{fmt.undo.webSh}}; color: {{t.text}}; font: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 14L4 9l5-5\"/><path d=\"M4 9h11a5 5 0 0 1 0 10h-3\"/></svg></button>\n    </div></div>\n      \n<sc-if value=\"{{isBasic}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 28px;\"><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px;\"><div style=\"flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Front</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Front\" spellcheck=\"true\" data-rk=\"front\" data-ph=\"The question\" data-empty=\"{{rich.front.empty}}\" key=\"{{rich.front.key}}\" ref=\"{{rich.front.ref}}\" style=\"position: relative; flex-grow: 1; min-height: 4.35em; overflow-y: auto; border-radius: 20px; padding: 18px 20px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.front.ring}}; outline: 0; font-size: 20px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.front.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></div><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; scrollbar-width: thin;\"><div style=\"flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Back</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Back\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"The answer\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; flex-grow: 1; min-height: 2.9em; overflow-y: auto; border-radius: 20px; padding: 18px 20px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 20px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></div></div></sc-if>\n<sc-if value=\"{{isCloze}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 28px;\"><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px;\"><div style=\"flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Text</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Text\" spellcheck=\"true\" data-rk=\"text\" data-ph=\"Put [[double brackets]] around the words to hide\" data-empty=\"{{rich.text.empty}}\" key=\"{{rich.text.key}}\" ref=\"{{rich.text.ref}}\" style=\"position: relative; flex-grow: 1; min-height: 4.35em; overflow-y: auto; border-radius: 20px; padding: 18px 20px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.text.ring}}; outline: 0; font-size: 20px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.text.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></div><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; scrollbar-width: thin;\">\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Cards to make</span><div role=\"group\" aria-label=\"Cards to make\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\"><sc-for list=\"{{clozeModes}}\" as=\"o\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 34px; padding: 0 10px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}};\">{{o.label}}</button></sc-for></div></div>\n  <div style=\"flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Extra, shown after</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Extra, shown after\" spellcheck=\"true\" data-rk=\"note\" data-ph=\"\" data-empty=\"{{rich.note.empty}}\" key=\"{{rich.note.key}}\" ref=\"{{rich.note.ref}}\" style=\"position: relative; flex-grow: 1; min-height: 1.45em; overflow-y: auto; border-radius: 20px; padding: 18px 20px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.note.ring}}; outline: 0; font-size: 20px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.note.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></div></div></sc-if>\n<sc-if value=\"{{isImage}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 300px; grid-template-rows: minmax(0, 1fr); gap: 28px;\"><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px;\"><sc-if value=\"{{img.some}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"flex: 1 1 0; min-height: 0; container-type: size; box-sizing: border-box; padding: 14px; border-radius: 20px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;\">\n    <div class=\"sc-occ-pic\" ref=\"{{occ.ref}}\" tabindex=\"0\" role=\"group\" aria-label=\"The picture. Drag on it to hide a part behind a box.\" style=\"position: relative; max-width: 100%; line-height: 0; border-radius: 8px; color: {{t.text}}; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: crosshair; outline: 0;\">\n      <sc-if value=\"{{img.mock}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"width: min(100cqw, 100cqh * 22 / 15); aspect-ratio: 22 / 15;\"><svg width=\"100%\" height=\"100%\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"0.9\" style=\"display: block;\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/></svg></div></sc-if>\n      <sc-if value=\"{{img.url}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{img.url}}\" alt=\"\" draggable=\"false\" style=\"display: block; max-width: 100cqw; max-height: 100cqh; border-radius: 8px; pointer-events: none;\"></sc-if>\n      <sc-for list=\"{{occ.boxes}}\" as=\"b\" hint-placeholder-count=\"3\"><div data-occ-box=\"{{b.id}}\" style=\"position: absolute; z-index: {{b.z}}; left: {{b.x}}; top: {{b.y}}; width: {{b.w}}; height: {{b.h}}; box-sizing: border-box; border-radius: 6px; background: {{b.bg}}; color: {{b.fg}}; box-shadow: {{b.ring}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; line-height: 1; cursor: move;\">{{b.num}}<sc-if value=\"{{b.sel}}\" hint-placeholder-val=\"{{ false }}\"><span data-occ-h=\"nw\" class=\"sc-occ-h\" style=\"position: absolute; left: -6px; top: -6px; width: 12px; height: 12px; box-sizing: border-box; border-radius: 6px; background: {{t.bg}}; box-shadow: 0 0 0 2px {{t.inv}}; cursor: nwse-resize;\"></span><span data-occ-h=\"sw\" class=\"sc-occ-h\" style=\"position: absolute; left: -6px; bottom: -6px; width: 12px; height: 12px; box-sizing: border-box; border-radius: 6px; background: {{t.bg}}; box-shadow: 0 0 0 2px {{t.inv}}; cursor: nesw-resize;\"></span><span data-occ-h=\"se\" class=\"sc-occ-h\" style=\"position: absolute; right: -6px; bottom: -6px; width: 12px; height: 12px; box-sizing: border-box; border-radius: 6px; background: {{t.bg}}; box-shadow: 0 0 0 2px {{t.inv}}; cursor: nwse-resize;\"></span><button type=\"button\" data-occ-del=\"1\" class=\"sc-occ-x\" onClick=\"{{b.del}}\" aria-label=\"Remove box {{b.n}}\" title=\"Remove box {{b.n}}\" style=\"position: absolute; {{b.delAt}} width: 24px; height: 24px; padding: 0; border: 0; border-radius: 12px; background: {{t.inv}}; color: {{t.invText}}; box-shadow: 0 0 0 2px {{t.bg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button></sc-if></div></sc-for>\n    </div>\n  </div></sc-if>\n  <sc-if value=\"{{img.none}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{pickImage}}\" style=\"flex: 1 1 0; min-height: 0; border: 1.5px dashed {{t.muted}}; border-radius: 20px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer;\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg>Add an image</button></sc-if>\n  <div style=\"display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\"><button type=\"button\" onClick=\"{{pickImage}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg>Replace image</button><sc-if value=\"{{occ.canAdd}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{addBox}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>Add a box</button></sc-if><sc-if value=\"{{occ.has}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"flex-grow: 1;\"></span><div role=\"group\" aria-label=\"What to hide\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\"><sc-for list=\"{{occModes}}\" as=\"o\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 34px; padding: 0 10px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{o.bg}}; color: {{o.fg}}; box-shadow: {{o.sh}};\">{{o.label}}</button></sc-for></div></sc-if></div></div><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; scrollbar-width: thin;\">\n  <sc-if value=\"{{occ.has}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\">\n    <span style=\"font-size: 13px; font-weight: 600;\">Answers <span style=\"font-weight: 400; color: {{t.muted}};\">· Each box is its own card. {{occ.hint}}</span></span>\n    <div style=\"display: flex; flex-direction: column; gap: 6px;\"><sc-for list=\"{{occ.boxes}}\" as=\"b\" hint-placeholder-count=\"3\"><div style=\"height: 34px; box-sizing: border-box; padding: 0 6px; display: flex; align-items: center; gap: 8px; border-radius: 14px; background: {{t.surf}}; box-shadow: {{b.rowRing}}; transition: box-shadow .15s;\">\n      <button type=\"button\" onClick=\"{{b.pick}}\" aria-label=\"Pick box {{b.n}}\" aria-pressed=\"{{b.pressed}}\" style=\"width: 24px; height: 24px; flex-shrink: 0; padding: 0; border: 0; border-radius: 8px; background: {{b.chip}}; color: {{b.chipFg}}; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;\">{{b.n}}</button>\n      <input type=\"text\" value=\"{{b.label}}\" onChange=\"{{b.setLabel}}\" onFocus=\"{{b.pick}}\" onKeyDown=\"{{b.key}}\" data-occ-label=\"{{b.id}}\" placeholder=\"What’s under box {{b.n}}\" aria-label=\"What’s under box {{b.n}}\" maxlength=\"200\" autocomplete=\"off\" style=\"flex-grow: 1; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 15px;\">\n      <button type=\"button\" onClick=\"{{b.remove}}\" aria-label=\"Remove box {{b.n}}\" title=\"Remove box {{b.n}}\" style=\"width: 28px; height: 28px; flex-shrink: 0; padding: 0; border: 0; border-radius: 14px; background: transparent; color: {{t.muted}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button>\n    </div></sc-for></div>\n  </div></sc-if>\n  <sc-if value=\"{{occ.tip}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 13px; line-height: 1.45; color: {{t.muted}};\">Drag on the picture to hide a part behind a box. Each box becomes its own card, with what’s under it as the answer.</span></sc-if>\n  <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Prompt</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Prompt\" spellcheck=\"true\" data-rk=\"front\" data-ph=\"What should they name?\" data-empty=\"{{rich.front.empty}}\" key=\"{{rich.front.key}}\" ref=\"{{rich.front.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.front.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.front.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div><sc-if value=\"{{occ.none}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Answer</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Answer\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if></div></div></sc-if>\n<sc-if value=\"{{isAudio}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 28px;\"><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px;\"><div style=\"flex: 1 1 0; min-height: 0; box-sizing: border-box; border-radius: 20px; background: {{rec.bg}}; display: flex; align-items: center; gap: 14px; padding: 0 16px; transition: background-color .2s;\">\n  <sc-if value=\"{{rec.show}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{toggleRecord}}\" aria-label=\"{{rec.label}}\" style=\"width: 40px; height: 40px; flex-shrink: 0; padding: 0; border: 0; border-radius: 20px; background: {{rec.btn}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2.5\" fill=\"currentColor\" stroke=\"none\"/></svg></button><div ref=\"{{rec.ref}}\" aria-hidden=\"true\" style=\"flex-grow: 1; min-width: 0; height: 96px; overflow: hidden; display: flex; justify-content: flex-end;\"><div style=\"flex-shrink: 0; height: 100%; display: flex; align-items: center; gap: 2px;\"><sc-for list=\"{{rec.bars}}\" as=\"b\" hint-placeholder-count=\"71\"><span style=\"width: 3px; flex-shrink: 0; height: {{b.h}}; border-radius: 2px; background: {{t.text}};\"></span></sc-for></div></div><span role=\"timer\" aria-label=\"Recording time\" style=\"flex-shrink: 0; display: flex; align-items: center; gap: 6px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{rec.ink}};\"><sc-if value=\"{{rec.on}}\" hint-placeholder-val=\"{{ true }}\"><span class=\"sc-rec-dot\" style=\"width: 7px; height: 7px; border-radius: 4px; background: {{t.again}};\"></span></sc-if><span ref=\"{{rec.timeRef}}\">{{rec.time}}</span></span></sc-if>\n  <sc-if value=\"{{snd.show}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{snd.toggle}}\" aria-label=\"{{snd.label}}\" style=\"width: 40px; height: 40px; flex-shrink: 0; padding: 0; border: 0; border-radius: 20px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><sc-if value=\"{{snd.off}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5v14l11-7z\" fill=\"currentColor\"/></svg></sc-if><sc-if value=\"{{snd.on}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/><rect x=\"13.5\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></sc-if></button><div ref=\"{{snd.ref}}\" role=\"slider\" tabindex=\"0\" aria-label=\"Where to play from\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"{{snd.pct}}\" aria-valuetext=\"{{snd.valueText}}\" onClick=\"{{snd.hold}}\" onKeyDown=\"{{snd.keys}}\" class=\"sc-wave\" style=\"position: relative; flex-grow: 1; min-width: 0; height: 96px; color: {{t.text}}; cursor: pointer; touch-action: pan-y;\">\n  <div style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; opacity: .22;\"><sc-for list=\"{{snd.bars}}\" as=\"b\" hint-placeholder-count=\"56\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n  <div data-anim=\"1\" style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; clip-path: {{snd.fill}}; animation: {{snd.anim}};\"><sc-for list=\"{{snd.bars}}\" as=\"b\" hint-placeholder-count=\"56\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n</div><sc-if value=\"{{snd.hasTime}}\" hint-placeholder-val=\"{{ true }}\"><span ref=\"{{snd.timeRef}}\" style=\"flex-shrink: 0; min-width: 30px; text-align: right; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{t.muted}};\">{{snd.time}}</span></sc-if></sc-if>\n  <sc-if value=\"{{snd.none}}\" hint-placeholder-val=\"{{ false }}\"><span aria-hidden=\"true\" style=\"width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: {{t.surf2}}; color: {{t.muted}}; display: flex; align-items: center; justify-content: center;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5v14l11-7z\" fill=\"currentColor\"/></svg></span><span style=\"flex-grow: 1; min-width: 0; font-size: 14px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">No sound yet. Record one, upload a file, or have it read aloud.</span></sc-if></div>\n  <div style=\"display: flex; gap: 8px; flex-wrap: wrap;\"><button type=\"button\" onClick=\"{{toggleRecord}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg>{{recLabel}}</button><button type=\"button\" onClick=\"{{pickAudio}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 15V4M7 9l5-5 5 5\"/><path d=\"M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3\"/></svg>Upload</button><button type=\"button\" onClick=\"{{toggleSpeak}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2\"/></svg>Read it aloud</button></div>\n  <sc-if value=\"{{speakOn}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Words to read aloud</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Words to read aloud\" spellcheck=\"true\" data-rk=\"speak\" data-ph=\"What the card says out loud\" data-empty=\"{{rich.speak.empty}}\" key=\"{{rich.speak.key}}\" ref=\"{{rich.speak.ref}}\" style=\"position: relative; min-height: 1.45em; max-height: 14.5em; overflow-y: auto; border-radius: 20px; padding: 14px 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.speak.ring}}; outline: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.speak.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div></sc-if></div><div style=\"min-height: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; scrollbar-width: thin;\">\n  <div style=\"flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Answer</span><div class=\"sc-rich\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Answer\" spellcheck=\"true\" data-rk=\"back\" data-ph=\"\" data-empty=\"{{rich.back.empty}}\" key=\"{{rich.back.key}}\" ref=\"{{rich.back.ref}}\" style=\"position: relative; flex-grow: 1; min-height: 1.45em; overflow-y: auto; border-radius: 20px; padding: 18px 20px; background: {{t.surf}}; color: {{t.text}}; box-shadow: {{rich.back.ring}}; outline: 0; font-size: 20px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: break-word; --ph: {{t.muted}}; transition: box-shadow .15s;\"><sc-for list=\"{{rich.back.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span data-edge=\"{{rc.edge}}\" style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span data-edge=\"1\" style=\"padding: 1px 10px; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for><sc-if value=\"{{rl.empty}}\" hint-placeholder-val=\"{{ false }}\"><br></sc-if></div></sc-for></div></div>\n  <div style=\"display: flex; align-items: center; gap: 12px; min-height: 44px;\"><span style=\"flex-grow: 1; display: flex; flex-direction: column; gap: 2px;\"><span style=\"font-size: 14px; font-weight: 600;\">Play on its own</span><span style=\"font-size: 12px; color: {{t.muted}};\">The sound starts when the card comes up</span></span><button type=\"button\" role=\"switch\" aria-checked=\"{{autoSw.checked}}\" aria-disabled=\"{{autoSw.disabled}}\" aria-label=\"Play on its own\" onClick=\"{{toggleAuto}}\" class=\"sc-sw\" style=\"width: 48px; height: 28px; flex-shrink: 0; padding: 3px; box-sizing: border-box; border: 0; border-radius: 14px; background: {{autoSw.track}}; opacity: {{autoSw.op}}; cursor: pointer;\"><span style=\"display: block; width: 22px; height: 22px; border-radius: 11px; background: {{autoSw.knobColor}}; transform: {{autoSw.knob}};\"></span></button></div></div></div></sc-if>\n      <div style=\"display: flex; align-items: center; gap: 12px;\">\n        <div style=\"flex-grow: 1; min-width: 0;\"><div style=\"position: relative; display: flex; flex-wrap: wrap; gap: 6px;\"><sc-for list=\"{{cardTags}}\" as=\"g\" hint-placeholder-count=\"2\"><button type=\"button\" onClick=\"{{g.remove}}\" aria-label=\"Remove tag {{g.label}}\" style=\"height: 32px; padding: 0 10px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{g.bg}}; color: {{g.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\">{{g.label}}<span style=\"display: flex; opacity: .7;\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></span></button></sc-for><button type=\"button\" onClick=\"{{cardPick.toggle}}\" aria-expanded=\"{{cardPick.expanded}}\" style=\"height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: 999px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>Add tag</button><sc-if value=\"{{cardPick.open}}\" hint-placeholder-val=\"{{ false }}\"><div role=\"dialog\" aria-label=\"Add a tag\" data-sc-pop style=\"position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 30; width: 320px; box-sizing: border-box; padding: 8px; border-radius: 22px; background: {{t.bg}}; color: {{t.text}}; box-shadow: 0 18px 48px rgba(0,0,0,.2), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 4px;\"><label style=\"display: flex; align-items: center; gap: 8px; height: 40px; flex-shrink: 0; padding: 0 14px; box-sizing: border-box; border-radius: 999px; background: {{t.surf}}; color: {{t.muted}};\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-3.5-3.5\"/></svg><span style=\"position: absolute; left: -9999px;\">Find or make a tag</span><input value=\"{{cardPick.query}}\" onChange=\"{{cardPick.setQuery}}\" placeholder=\"Find or make a tag\" style=\"flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: {{t.text}};\"></label><div style=\"max-height: 190px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column;\"><sc-if value=\"{{cardPick.canMake}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{cardPick.make}}\" style=\"height: 38px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer;\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>{{cardPick.makeLabel}}</button></sc-if><sc-for list=\"{{cardPick.options}}\" as=\"o\" hint-placeholder-count=\"5\"><button type=\"button\" onClick=\"{{o.pick}}\" aria-pressed=\"{{o.pressed}}\" style=\"height: 38px; flex-shrink: 0; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; text-align: left; cursor: pointer;\"><span style=\"width: 8px; height: 8px; flex-shrink: 0; border-radius: 5px; background: {{o.dot}};\"></span><span style=\"flex-grow: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{o.label}}</span><sc-if value=\"{{o.on}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"display: flex;\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg></span></sc-if></button></sc-for></div></div></sc-if></div></div>\n        <sc-if value=\"{{note.show}}\" hint-placeholder-val=\"{{ true }}\"><span role=\"status\" style=\"margin-right: 4px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: {{t.muted}}; white-space: nowrap;\"><sc-if value=\"{{note.done}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg></sc-if>{{note.label}}</span></sc-if>\n        <sc-if value=\"{{canDelete}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{togglePause}}\" aria-pressed=\"{{pausedNow}}\" style=\"height: 40px; padding: 0 18px 0 14px; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 999px; background: {{pauseBg}}; color: {{pauseFg}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M10 9v6M14 9v6\"/></svg><span>{{pauseLabel}}</span></button><button type=\"button\" onClick=\"{{deleteCard}}\" style=\"height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.againTint}}; color: {{t.again}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Delete</button></sc-if>\n        <sc-if value=\"{{isNew}}\" hint-placeholder-val=\"{{ false }}\"><button type=\"button\" onClick=\"{{discard}}\" style=\"height: 40px; padding: 0 20px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Discard</button><button type=\"button\" onClick=\"{{addCard}}\" data-key=\"mod+enter\" style=\"height: 40px; padding: 0 22px; display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Add card <span style=\"font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; opacity: .6; margin-left: 8px;\">⌘↵</span></button></sc-if>\n      </div>\n      <sc-if value=\"{{slash.on}}\" hint-placeholder-val=\"{{ false }}\"><div role=\"listbox\" aria-label=\"Add to the card\" data-slash=\"1\" onMouseDown=\"{{keepFocus}}\" style=\"position: absolute; left: {{slash.x}}; top: {{slash.y}}; width: 248px; max-height: 420px; overflow-y: auto; box-sizing: border-box; padding: 6px; border-radius: 18px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}}, 0 18px 44px rgba(0,0,0,.22); display: flex; flex-direction: column; gap: 2px; z-index: 30;\"><sc-for list=\"{{slash.items}}\" as=\"it\" hint-placeholder-count=\"6\"><button type=\"button\" role=\"option\" aria-selected=\"{{it.sel}}\" onMouseDown=\"{{keepFocus}}\" onClick=\"{{it.pick}}\" style=\"flex-shrink: 0; height: 40px; padding: 0 8px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: {{it.bg}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;\"><span style=\"width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; background: {{it.chip}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; letter-spacing: -.02em;\"><sc-if value=\"{{it.g}}\" hint-placeholder-val=\"{{ true }}\">{{it.g}}</sc-if><sc-if value=\"{{it.list}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></sc-if><sc-if value=\"{{it.bracket}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 7H5.5A2.5 2.5 0 0 0 3 9.5v5A2.5 2.5 0 0 0 5.5 17H7M17 7h1.5A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H17M9 12h6\"/></svg></sc-if><sc-if value=\"{{it.sqrt}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 13h2.5l3 6L14 5h7\"/></svg></sc-if><sc-if value=\"{{it.image}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg></sc-if><sc-if value=\"{{it.mic}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg></sc-if></span><span style=\"flex-grow: 1;\">{{it.label}}</span><span style=\"font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{t.muted}};\">{{it.hint}}</span></button></sc-for></div></sc-if>\n    </main>\n  </div>\n</div>",
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
  const N = {"P":{"alex":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"maria":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"dev":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"jordan":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"okafor":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"sam":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"ucd":{"handle":"ucdavis.bio","name":"UC Davis Biology","avatar":null,"color":0,"verified":"school","kind":"school"}},"DECKS":{"mcat":{"id":"s1","url":"/@mariasantos/mcat-biochemistry","name":"MCAT Biochemistry","description":"Every enzyme, pathway, and number the exam asks. Suggestions welcome.","tags":["MCAT","Biology"],"cover":{"style":"mix","round":0,"seed":"MCAT Biochemistry","image":null},"cards":640,"stars":4200,"learners":214,"copies":86,"version":14,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":false},"maintained":"creator","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"kanji":{"id":"s2","url":"/@jordanlee/jlpt-n3-kanji","name":"JLPT N3 Kanji","description":"","tags":["Languages","Japanese"],"cover":{"style":"mix","round":0,"seed":"JLPT N3 Kanji","image":null},"cards":1024,"stars":3100,"learners":1860,"copies":372,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"theme":""},"algo":{"id":"s3","url":"/@devp/algorithms","name":"Algorithms","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"Algorithms","image":null},"cards":212,"stars":2700,"learners":1620,"copies":324,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"theme":""},"pharm":{"id":"s4","url":"/@samr/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":388,"stars":1900,"learners":1140,"copies":228,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"theme":""},"bio2a":{"id":"s5","url":"/@drokafor/bio-2a-final","name":"BIO 2A · Final","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"BIO 2A · Final","image":null},"cards":290,"stars":860,"learners":516,"copies":103,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":""},"law":{"id":"s6","url":"/@samr/constitutional-law","name":"Constitutional Law","description":"","tags":["Law"],"cover":{"style":"mix","round":0,"seed":"Constitutional Law","image":null},"cards":174,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"theme":""},"orgo":{"id":"s7","url":"/@drokafor/organic-reactions","name":"Organic Reactions","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"stars":1400,"learners":840,"copies":168,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":""},"spanish":{"id":"s8","url":"/@mariasantos/spanish-b1","name":"Spanish B1","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Spanish B1","image":null},"cards":900,"stars":2200,"learners":1320,"copies":264,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"cell":{"id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"sys":{"id":"s10","url":"/@alexkim/system-design","name":"System Design","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"System Design","image":null},"cards":74,"stars":412,"learners":247,"copies":49,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"jp":{"id":"s11","url":"/@alexkim/japanese-n4","name":"Japanese N4","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Japanese N4","image":null},"cards":820,"stars":2400,"learners":1440,"copies":288,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"orgoA":{"id":"s12","url":"/@alexkim/organic-chemistry","name":"Organic Chemistry","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Chemistry","image":null},"cards":236,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"hist":{"id":"s13","url":"/@alexkim/us-history","name":"US History","description":"","tags":["History"],"cover":{"style":"mix","round":0,"seed":"US History","image":null},"cards":158,"stars":205,"learners":123,"copies":25,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"anat":{"id":"s14","url":"/@alexkim/anatomy","name":"Anatomy","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Anatomy","image":null},"cards":530,"stars":980,"learners":588,"copies":118,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"pharmA":{"id":"s15","url":"/@alexkim/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":188,"stars":320,"learners":192,"copies":38,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""},"psych":{"id":"s16","url":"/@alexkim/psych-soc","name":"Psych & Soc","description":"","tags":["MCAT"],"cover":{"style":"mix","round":0,"seed":"Psych & Soc","image":null},"cards":344,"stars":1100,"learners":660,"copies":132,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":""}},"ALEX_DECKS":[{"id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":true},{"id":"s10","url":"/@alexkim/system-design","name":"System Design","description":"","tags":["Computer science"],"cover":{"style":"mix","round":0,"seed":"System Design","image":null},"cards":74,"stars":412,"learners":247,"copies":49,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":true},{"id":"s11","url":"/@alexkim/japanese-n4","name":"Japanese N4","description":"","tags":["Languages"],"cover":{"style":"mix","round":0,"seed":"Japanese N4","image":null},"cards":820,"stars":2400,"learners":1440,"copies":288,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"id":"s12","url":"/@alexkim/organic-chemistry","name":"Organic Chemistry","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Chemistry","image":null},"cards":236,"stars":640,"learners":384,"copies":77,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"id":"s13","url":"/@alexkim/us-history","name":"US History","description":"","tags":["History"],"cover":{"style":"mix","round":0,"seed":"US History","image":null},"cards":158,"stars":205,"learners":123,"copies":25,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"id":"s14","url":"/@alexkim/anatomy","name":"Anatomy","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Anatomy","image":null},"cards":530,"stars":980,"learners":588,"copies":118,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"id":"s15","url":"/@alexkim/pharmacology","name":"Pharmacology","description":"","tags":["Pre-med"],"cover":{"style":"mix","round":0,"seed":"Pharmacology","image":null},"cards":188,"stars":320,"learners":192,"copies":38,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false},{"id":"s16","url":"/@alexkim/psych-soc","name":"Psych & Soc","description":"","tags":["MCAT"],"cover":{"style":"mix","round":0,"seed":"Psych & Soc","image":null},"cards":344,"stars":1100,"learners":660,"copies":132,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","pinned":false}],"CARDS":[{"id":"c1","kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","tags":["Energy"],"source":"","trail":[{"w":"made","at":1}]},{"id":"c2","kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1)","tags":["Glycolysis"],"source":"","trail":[{"w":"made","at":1},{"w":"edited","by":"Maria Santos","at":2}]},{"id":"c3","kind":"cloze","front":"","back":"","text":"The [[citric acid]] cycle produces NADH and FADH₂.","tags":["Krebs"],"source":"Claude","trail":[{"w":"made","ai":"Claude","at":1}]},{"id":"c4","kind":"image","front":"Name the structure marked 1 on the diagram.","back":"Inner membrane","tags":["Diagrams"],"source":"","trail":[{"w":"made","at":1}]},{"id":"c5","kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"Acetyl-CoA and NADH","tags":[],"source":"","trail":[{"w":"made","at":1},{"w":"edited","by":"Dev Patel","at":2}]},{"id":"c6","kind":"cloze","front":"","back":"","text":"Km is the substrate concentration at [[half]] Vmax.","tags":["Enzymes"],"source":"","trail":[{"w":"made","at":1}]}],"MADE":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Alex Kim","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"n":3},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"n":0},{"version":12,"kind":"suggestion","summary":"Took 2 changes from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"n":2},{"version":9,"kind":"ai","summary":"38 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":38},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":0}],"HISTORY":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Alex Kim","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"n":3,"changes":[{"card":"c2","op":"edit","kind":"answer","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1)"}},{"card":"n1","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate"}},{"card":"c7","op":"edit","kind":"typo","before":{"kind":"basic","front":"Where does the citric acid cycle hapen?","back":"In the mitochondrial matrix"},"after":{"kind":"basic","front":"Where does the citric acid cycle happen?","back":"In the mitochondrial matrix"}}]},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"n":0,"changes":[]},{"version":12,"kind":"suggestion","summary":"Took 2 changes from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"n":2,"changes":[{"card":"c5","op":"edit","kind":"answer","before":{"kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"ATP"},"after":{"kind":"basic","front":"What inhibits pyruvate dehydrogenase?","back":"Acetyl-CoA and NADH"}},{"card":"c8","op":"remove","kind":"remove","before":{"kind":"basic","front":"Glycolysis happens in the mitochondria.","back":"False"},"after":null}]},{"version":9,"kind":"ai","summary":"38 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":38,"changes":[]},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"n":0,"changes":[]}],"CELL_HISTORY":[{"version":14,"kind":"suggestion","summary":"Took 3 changes from Maria Santos","ai":"","at":"2026-09-26T10:00:00Z","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"changes":[{"card":"k7","op":"edit","kind":"answer","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate."}},{"card":"n1","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate."}},{"card":"k8","op":"edit","kind":"typo","before":{"kind":"basic","front":"The citric acid cycle happens in the cytoplasm.","back":""},"after":{"kind":"basic","front":"The citric acid cycle happens in the mitochondrial matrix.","back":""}}]},{"version":13,"kind":"check","summary":"Dr. Okafor checked every card","ai":"","at":"2026-09-21T10:00:00Z","by":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"changes":[]},{"version":12,"kind":"suggestion","summary":"Took 1 change from Dev Patel","ai":"","at":"2026-09-14T10:00:00Z","by":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"changes":[{"card":"k6","op":"edit","kind":"answer","before":{"kind":"basic","front":"What is the role of the ribosome?","back":"Makes lipids"},"after":{"kind":"basic","front":"What is the role of the ribosome?","back":"Translates mRNA into protein"}}]},{"version":9,"kind":"ai","summary":"3 new cards","ai":"Claude","at":"2026-08-30T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"changes":[{"card":"k2","op":"add","kind":"new","before":null,"after":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell."}},{"card":"k3","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"Name structure 1 on the diagram.","back":"Nucleus"}},{"card":"k9","op":"add","kind":"new","before":null,"after":{"kind":"basic","front":"What does ATP synthase make?","back":"ATP, from ADP and phosphate."}}]},{"version":1,"kind":"made","summary":"Shared 220 cards","ai":"ChatGPT","at":"2026-08-12T10:00:00Z","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"changes":[]}],"SUGGESTIONS":[{"id":"g1","shared_id":"s9","author_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"ai":"","message":"Fixed the glycolysis answers from my TA’s review.","status":"open","created_at":"2026-09-28T08:00:00Z","deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"changes":[{"id":"x1","card":"c2","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Hexokinase"},"after":{"kind":"basic","front":"Which enzyme is the rate-limiting step of glycolysis?","back":"Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate."}},{"id":"x2","card":"n1","op":"add","kind":"new","status":"open","before":null,"after":{"kind":"basic","front":"What activates PFK-1?","back":"AMP and fructose-2,6-bisphosphate."}},{"id":"x3","card":"c7","op":"edit","kind":"typo","status":"open","before":{"kind":"basic","front":"The citric acid cycle happens in the cytoplasm.","back":""},"after":{"kind":"basic","front":"The citric acid cycle happens in the mitochondrial matrix.","back":""}}]},{"id":"g2","shared_id":"s9","author_name":"Dev Patel","person":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"ai":"ChatGPT","message":"","status":"open","created_at":"2026-09-25T08:00:00Z","deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"changes":[{"id":"x4","card":"n2","op":"add","kind":"new","status":"open","before":null,"after":{"kind":"basic","front":"What does ATP synthase make?","back":"ATP, from ADP and phosphate."}}]}],"SENT":[{"id":"g11","shared_id":"s1","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"Two answers my class kept missing.","created_at":"2026-09-27T15:00:00Z","status":"open","deck":{"id":"s1","name":"MCAT Biochemistry","url":"/@mariasantos/mcat-biochemistry"},"changes":[{"id":"g11x0","card":"c1","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}},{"id":"g11x1","card":"c2","op":"edit","kind":"answer","status":"open","before":{"kind":"basic","front":"Card 2","back":"Before"},"after":{"kind":"basic","front":"Card 2","back":"After"}}]},{"id":"g12","shared_id":"s4","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"Fixed the doses on the beta blocker cards.","created_at":"2026-09-22T15:00:00Z","status":"done","deck":{"id":"s4","name":"Pharmacology","url":"/@samr/pharmacology"},"changes":[{"id":"g12x0","card":"c1","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}},{"id":"g12x1","card":"c2","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 2","back":"Before"},"after":{"kind":"basic","front":"Card 2","back":"After"}},{"id":"g12x2","card":"c3","op":"edit","kind":"answer","status":"skipped","before":{"kind":"basic","front":"Card 3","back":"Before"},"after":{"kind":"basic","front":"Card 3","back":"After"}}]},{"id":"g13","shared_id":"s3","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"","created_at":"2026-09-18T15:00:00Z","status":"done","deck":{"id":"s3","name":"Algorithms","url":"/@devp/algorithms"},"changes":[{"id":"g13x0","card":"c1","op":"edit","kind":"answer","status":"taken","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}}]},{"id":"g14","shared_id":"s2","author_name":"Alex Kim","person":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"ai":"","message":"One reading was off.","created_at":"2026-09-10T15:00:00Z","status":"done","deck":{"id":"s2","name":"JLPT N3 Kanji","url":"/@jordanlee/jlpt-n3-kanji"},"changes":[{"id":"g14x0","card":"c1","op":"edit","kind":"answer","status":"skipped","before":{"kind":"basic","front":"Card 1","back":"Before"},"after":{"kind":"basic","front":"Card 1","back":"After"}}]}],"NEWS":[{"id":1,"kind":"suggestion","actor_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"deck":{"id":"s9","name":"Cell Biology","url":"/@alexkim/cell-biology"},"data":{"n":3,"message":"Fixed the glycolysis answers from my TA’s review."},"read":false,"created_at":"2026-09-28T08:00:00Z"},{"id":2,"kind":"follow","actor_name":"Jordan Lee","person":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"deck":null,"data":{"handle":"jordanlee"},"read":false,"created_at":"2026-09-28T06:00:00Z"},{"id":3,"kind":"update","actor_name":"Maria Santos","person":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"deck":{"id":"s1","name":"MCAT Biochemistry","url":"/@mariasantos/mcat-biochemistry"},"data":{"summary":"3 new cards, 2 answers fixed","n":5},"read":true,"created_at":"2026-09-26T10:00:00Z"},{"id":4,"kind":"decided","actor_name":"Sam Rivera","person":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"deck":{"id":"s4","name":"Pharmacology","url":"/@samr/pharmacology"},"data":{"took":2,"skipped":1},"read":true,"created_at":"2026-09-24T10:00:00Z"},{"id":6,"kind":"hidden","actor_name":"Lucida","person":null,"deck":{"id":"s13","name":"US History","url":"/@alexkim/us-history"},"data":{"name":"US History"},"read":true,"created_at":"2026-09-23T10:00:00Z"},{"id":5,"kind":"checked","actor_name":"Dr. Okafor","person":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"deck":{"id":"s12","name":"Organic Chemistry","url":"/@alexkim/organic-chemistry"},"data":{},"read":true,"created_at":"2026-09-21T10:00:00Z"},{"id":7,"kind":"verified","actor_name":"Lucida","person":null,"deck":null,"data":{"role":"teacher"},"read":true,"created_at":"2026-09-19T10:00:00Z"}],"CLASSES":{"BIOKTZ":{"id":"k1","code":"BIOKTZ","name":"BIO 201","school":"UC Davis","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"official":false,"people":8,"decks":3,"me":{"role":"owner","share":false,"asked":true},"helpers":["Dev Patel"],"members":[{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","role":"owner","share":false,"joined":"2026-09-01T10:00:00Z","you":true},{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person","role":"helper","share":false,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"priya","name":"Priya Shah","avatar":null,"color":4,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person","role":"member","share":false,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"ninap","name":"Nina Park","avatar":null,"color":5,"verified":"","kind":"person","role":"member","share":true,"joined":"2026-09-01T10:00:00Z","you":false},{"handle":"leom","name":"Leo Martin","avatar":null,"color":1,"verified":"","kind":"person","role":"member","share":false,"joined":"2026-09-01T10:00:00Z","you":false}],"deckList":[{"id":"s21","url":"/@alexkim/cells","name":"Cells","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Cells","image":null},"cards":40,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","addedBy":"alexkim","mine":true},{"id":"s22","url":"/@devp/membranes","name":"Membranes","description":"","tags":["Biology"],"cover":{"style":"mix","round":0,"seed":"Membranes","image":null},"cards":36,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person"},"theme":"","addedBy":"devp","mine":false},{"id":"s9","url":"/@alexkim/cell-biology","name":"Cell Biology","description":"","tags":["Biology","MCAT"],"cover":{"style":"mix","round":0,"seed":"Cell Biology","image":null},"cards":412,"stars":1300,"learners":780,"copies":156,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"theme":"","addedBy":"alexkim","mine":true}],"assignments":[{"id":"a1","sharedId":"s21","goal":"learn","due":"2026-10-02","deck":{"name":"Cells","cover":{"style":"mix","round":0,"seed":"Cells","image":null},"cards":40,"url":"/@alexkim/cells"},"progress":{"mariasantos":{"learned":32,"total":40,"due":3,"remembered":91,"last":"2026-09-28T08:10:00Z","at":"2026-09-28T09:00:00Z"},"samr":{"learned":40,"total":40,"due":0,"remembered":88,"last":"2026-09-27T20:00:00Z","at":"2026-09-28T09:00:00Z"},"priya":{"learned":12,"total":40,"due":5,"remembered":76,"last":"2026-09-25T18:00:00Z","at":"2026-09-28T09:00:00Z"},"ninap":{"learned":0,"total":40,"due":0,"remembered":null,"last":null,"at":"2026-09-28T09:00:00Z"}}},{"id":"a2","sharedId":"s22","goal":"daily","due":"2026-10-09","deck":{"name":"Membranes","cover":{"style":"mix","round":0,"seed":"Membranes","image":null},"cards":36,"url":"/@devp/membranes"},"progress":{"mariasantos":{"learned":20,"total":36,"due":0,"remembered":94,"last":"2026-09-28T08:30:00Z","at":"2026-09-28T09:00:00Z"},"samr":{"learned":18,"total":36,"due":7,"remembered":82,"last":"2026-09-26T21:00:00Z","at":"2026-09-28T09:00:00Z"},"priya":{"learned":9,"total":36,"due":2,"remembered":70,"last":"2026-09-27T17:00:00Z","at":"2026-09-28T09:00:00Z"},"ninap":{"learned":0,"total":36,"due":0,"remembered":null,"last":null,"at":"2026-09-28T09:00:00Z"}}}]},"ORGCHM":{"id":"k2","code":"ORGCHM","name":"Organic Chemistry","school":"UC Davis","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"official":false,"people":7,"decks":2,"me":{"role":"member","share":false,"asked":false},"helpers":[],"members":[{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person","role":"owner","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":true},{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"devp","name":"Dev Patel","avatar":null,"color":2,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"omar","name":"Omar Haddad","avatar":null,"color":2,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"priya","name":"Priya Shah","avatar":null,"color":4,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false},{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person","role":"member","joined":"2026-09-01T10:00:00Z","you":false}],"deckList":[{"id":"s23","url":"/@drokafor/chapter-3","name":"Chapter 3","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"cards":64,"stars":0,"learners":0,"copies":0,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"class","checked":null,"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":"","addedBy":"drokafor","mine":false},{"id":"s7","url":"/@drokafor/organic-reactions","name":"Organic Reactions","description":"","tags":["Chemistry"],"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"stars":1400,"learners":840,"copies":168,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":{"name":"Dr. Okafor","handle":"drokafor","current":true},"maintained":"creator","owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"theme":"","addedBy":"drokafor","mine":false}],"assignments":[{"id":"a3","sharedId":"s23","goal":"learn","due":"2026-10-02","deck":{"name":"Chapter 3","cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"cards":64,"url":"/@drokafor/chapter-3"}},{"id":"a4","sharedId":"s7","goal":"daily","due":"2026-10-06","deck":{"name":"Organic Reactions","cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"cards":256,"url":"/@drokafor/organic-reactions"}}]},"PREMED":{"id":"k3","code":"PREMED","name":"Pre-med study group","school":"UC Davis","owner":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"official":false,"people":12,"decks":4,"invite":true}},"CLASS_LIST":[{"id":"k1","code":"BIOKTZ","name":"BIO 201","school":"UC Davis","role":"owner","share":false,"owner":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"official":false,"people":8,"decks":3,"assignments":2},{"id":"k2","code":"ORGCHM","name":"Organic Chemistry","school":"UC Davis","role":"member","share":false,"owner":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"teacher","kind":"person"},"official":false,"people":7,"decks":2,"assignments":2},{"id":"k4","code":"JPNFRK","name":"Japanese N4 study group","school":"","role":"helper","share":false,"owner":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"official":false,"people":5,"decks":1,"assignments":0}],"MY_PROGRESS":{"s23":{"deckId":"orgo","learned":52,"total":64,"due":6,"remembered":88,"last":"2026-09-28T08:00:00Z"},"s7":{"deckId":"orgo","learned":120,"total":256,"due":4,"remembered":91,"last":"2026-09-27T19:00:00Z"}},"ASSIGNED":[{"id":"a3","classId":"k2","className":"Organic Chemistry","code":"ORGCHM","sharedId":"s23","name":"Chapter 3","goal":"learn","due":"2026-10-02","cards":64,"cover":{"style":"mix","round":0,"seed":"Chapter 3","image":null},"progress":{"deckId":"orgo","learned":52,"total":64,"due":6,"remembered":88,"last":"2026-09-28T08:00:00Z"},"done":false},{"id":"a4","classId":"k2","className":"Organic Chemistry","code":"ORGCHM","sharedId":"s7","name":"Organic Reactions","goal":"daily","due":"2026-10-06","cards":256,"cover":{"style":"mix","round":0,"seed":"Organic Reactions","image":null},"progress":{"deckId":"orgo","learned":120,"total":256,"due":4,"remembered":91,"last":"2026-09-27T19:00:00Z"},"done":false}],"ADMIN":{"requests":[{"id":"v1","role":"teacher","school":"UC Davis","contact":"hokafor@ucdavis.edu","at":"2026-09-27T15:00:00Z","person":{"handle":"drokafor","name":"Dr. Okafor","avatar":null,"color":4,"verified":"","kind":"person"}},{"id":"v2","role":"school","school":"Davis Senior High School","contact":"https://dshs.djusd.net/staff","at":"2026-09-28T07:40:00Z","person":{"handle":"davishigh","name":"Davis Senior High","avatar":null,"color":2,"verified":"","kind":"person"}}],"reports":[{"id":"r1","kind":"deck","name":"USMLE Step 1 (all of it)","deck":{"id":"s30","url":"/@samr/usmle-step-1-all-of-it","name":"USMLE Step 1 (all of it)","description":"","tags":[],"cover":{"style":"mix","round":0,"seed":"USMLE Step 1 (all of it)","image":null},"cards":2400,"stars":90,"learners":54,"copies":11,"version":3,"updated":"2026-09-26T10:00:00Z","visibility":"public","checked":null,"maintained":"creator","owner":{"handle":"kaiw","name":"Kai Wong","avatar":null,"color":3,"verified":"","kind":"person"},"theme":""},"person":null,"suggestion":null,"reports":[{"reason":"stolen","note":"These are my Anki cards, word for word.","by":{"handle":"jordanlee","name":"Jordan Lee","avatar":null,"color":1,"verified":"","kind":"person"},"at":"2026-09-28T06:00:00Z"},{"reason":"wrong","note":"","by":{"handle":"samr","name":"Sam Rivera","avatar":null,"color":5,"verified":"","kind":"person"},"at":"2026-09-27T22:00:00Z"}]},{"id":"r2","kind":"profile","name":"Free Answers (@freeanswers)","deck":null,"person":{"handle":"freeanswers","name":"Free Answers","avatar":null,"color":1,"verified":"","kind":"person"},"suggestion":null,"reports":[{"reason":"spam","note":"Every deck links to a site selling answers.","by":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person"},"at":"2026-09-28T05:00:00Z"}]},{"id":"r3","kind":"suggestion","name":"Leo Martin: check my page","deck":null,"person":null,"suggestion":{"author":"Leo Martin","message":"check my page for more","n":12,"first":"Get every answer at my page — link in bio","open":true},"reports":[{"reason":"spam","note":"","by":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person"},"at":"2026-09-26T12:00:00Z"}]}]},"PROFILE":{"handle":"alexkim","name":"Alex Kim","avatar":null,"color":0,"verified":"","kind":"person","bio":"MCAT decks, made with my AI. Suggestions welcome.","school":"UC Davis","subject":"Pre-med","followers":340,"following":86,"contributions":23,"featured":["s9","s10"],"stars":7360},"OTHER":{"handle":"mariasantos","name":"Maria Santos","avatar":null,"color":3,"verified":"","kind":"person","bio":"Biochem TA. I fix what my students trip on.","school":"UC Davis","subject":"Biochemistry","followers":1280,"following":140,"contributions":212,"featured":["s1"],"stars":6400},"DISCOVER":{"topics":["MCAT","Languages","Computer science","Chemistry","Law","History","Biology"],"sections":[{"id":"popular","title":"Popular this week","decks":["mcat","kanji","algo","pharm"]},{"id":"checked","title":"Checked by teachers","decks":["bio2a","law","orgo","spanish"]},{"id":"new","title":"New","decks":["pharm","algo","spanish","kanji"]}]}};
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
      return { shared: sv !== 'private' && !lk ? { vis: sv, id: 's9', url: '/@alexkim/cell-biology', label: sv === 'public' ? 'Public' : 'Link only' } : null,
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
    // Pro: on for the canvas's boards, off for the ones that show Free (their free or plan setting).
    pro: () => !(p.free || p.plan === 'Free'),
    chrome: () => { const S = skinned(), color = st.photo === 'color';
      return { nav: { today: caught ? '' : '64', news: m.read ? '' : '2', hasNews: !m.read }, me: { bg: S && color ? 'transparent' : 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A', color: color && !S, photo: '', sampleGoogle: st.photo === 'google', sampleYours: st.photo === 'yours',
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
        discover: tag => (wait ? undefined : { topics: N.DISCOVER.topics, tag: tag || '', sections: N.DISCOVER.sections.map(s => ({ ...s, decks: s.decks.map(pick).map(deckCard) })) }),
        search: q => (wait ? undefined : !String(q || '').trim() ? { q: '', decks: [], people: [] } : { q, decks: [D.mcat, D.bio2a, D.cell].map(deckCard), people: [{ ...N.P.maria, bio: 'Biochem TA', school: 'UC Davis', followers: 1280 }, { ...N.P.okafor, bio: '', school: 'UC Davis', followers: 3400 }] }),
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
        mine: () => ({ handle: 'alexkim', profile: N.P.alex, decks: [{ id: 's9', slug: 'cell-biology', visibility: 'public', stars: 1300, learners: 214, copies: 86, version: 14, open: 3 }] }),
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
      shareDeck: (id, o) => { set({ share: { ...(m.share || { vis: p.shared === 'Public' ? 'public' : p.shared === 'Link only' ? 'link' : 'private' }), ...(o.visibility ? { vis: o.visibility } : {}) } }); return Promise.resolve({}); },
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
  this.state = { typing: !!props.keyboard, focus: 'front', styles: !!props.textStyles };
  // The card as you write it: its fields, its type, where the caret is, and what Undo steps back to.
  // It lives outside state so fast typing never builds on an old copy.
  this.ed = { edits: {}, type: null, sel: null, pend: null, past: [], future: [], last: '', lastAt: 0, key: 0, restore: false, sig: '' };
  this.els = {};
  this.refFns = {};
}
componentDidMount() { this.placeCaret(); this.placeSlash(); this.onDocKey = ev => this.boxKey(ev); document.addEventListener('keydown', this.onDocKey); if (this.opened) this.opened(); }
componentDidUpdate() { this.placeCaret(); this.placeSlash(); this.placeLabel(); }
// Leaving the editor while it records throws the recording away. (The cards screen saves what you changed first.)
componentWillUnmount() { if (this.closing) this.closing(); if (this.onSel) document.removeEventListener('selectionchange', this.onSel); if (this.onDocKey) document.removeEventListener('keydown', this.onDocKey); const db = this.props.db; if (db && db.recording()) db.act.stopRecording(true); }
// A saved card opens with what it says; a new one starts empty in the app (the canvas shows a sample).
doc() {
  const db = this.props.db || this.mock(), e = this.ed;
  const saved = this.openCard(db);
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
  if (this.edited) this.edited(e);
}
// A picture or sound that finishes uploading after you've gone on to another card (on the cards screen) goes on the card
// it was picked for.
commitIn(ed, patch) {
  if (ed === this.ed) return this.commit(patch);
  ed.past.push({ edits: ed.edits, type: ed.type, sel: ed.sel }); ed.future = []; ed.last = '';
  ed.edits = { ...ed.edits, ...patch };
  this.forceUpdate();
  if (this.edited) this.edited(ed);
}
step(from, to) {
  const e = this.ed;
  if (!from.length) return;
  to.push({ edits: e.edits, type: e.type, sel: e.sel });
  const p = from.pop();
  e.edits = p.edits; e.type = p.type; e.sel = p.sel; e.restore = !!p.sel; e.pend = null; e.last = '';
  this.forceUpdate();
  if (this.edited) this.edited(e);
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
  else if (!this.props.keyboard && this.state.typing) this.setState({ typing: false });
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
pickImage() { const ed = this.ed; (this.props.db || this.mock()).act.pickFile('image').then(url => url && this.commitIn(ed, { image: url })); }
// What a card still needs before it can be saved: its front or back, a blank, a picture, or a sound ('' once it's ready).
// `boxes`: how many boxes the picture has right now (one being drawn counts).
missingOf(ty, f, boxes) {
  const R = this.rich(), fr = R.plain(f.front || '').trim(), bk = R.plain(f.back || '').trim(), said = R.plain(f.speak || '').trim();
  if (ty === 'Basic') return !fr ? 'front' : !bk ? 'back' : '';
  if (ty === 'Blank') return R.blanks(f.text || '').length ? '' : 'text';
  if (ty === 'Image') return !f.image ? 'image' : (boxes == null ? (f.boxes || []).length : boxes) || bk ? '' : 'back';
  return (f.audio && f.audio !== 'mock') || said ? (bk ? '' : 'back') : 'speak';
}
// The card as Save sends it.
payload(ty, f) {
  const kind = { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' }[ty];
  return { kind, front: f.front, back: f.back, text: f.text, note: f.note, tags: f.tags || [], image: f.image || null, audio: f.audio || null, wave: f.audio ? f.wave || null : null, speak: f.speak || '', auto: f.auto !== false, clozeMode: f.clozeMode || 'each',
    ...(kind === 'image' ? { boxes: f.boxes || [], occ: f.occ === 'all' ? 'all' : 'one' } : {}) };
}
// ---------- Image occlusion ----------
// Drag on the picture to draw a box (or press Add a box). Pick a box to move it, pull a corner to resize it, and take it
// away with its × (or Delete). Undo steps back through all of it. While you drag, the box follows the pointer; letting
// go saves it as one step.
boxes() { const d = this.drag; return d && d.boxes ? d.boxes : this.doc().f.boxes || []; }
newBoxId() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
putBoxes(list, kind) { this.commit({ boxes: list.map(b => ({ ...b, x: +b.x.toFixed(4), y: +b.y.toFixed(4), w: +b.w.toFixed(4), h: +b.h.toFixed(4) })) }, { kind: kind || 'box' }); }
// With a mouse or trackpad, a new box goes straight to its answer; on a phone the keyboard waits until you tap it.
fine() { return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches; }
occRef() {
  return this.refFns.$occ || (this.refFns.$occ = el => {
    if (!el) return;
    this.occEl = el;
    if (el.__occ) return;
    el.__occ = true;
    el.addEventListener('pointerdown', ev => this.occDown(ev));
    el.addEventListener('pointermove', ev => this.occMove(ev));
    el.addEventListener('pointerup', ev => this.occUp(ev, false));
    el.addEventListener('pointercancel', ev => this.occUp(ev, true));
    el.addEventListener('dragstart', ev => ev.preventDefault());
  });
}
occDown(ev) {
  const el = this.occEl;
  // A phone moves a tap onto a button nearby (like a picked box's ×), so what's under the finger decides, and the ×
  // takes a box away only when the finger really went down on it.
  const pt = el && el.ownerDocument.elementFromPoint(ev.clientX, ev.clientY), at = pt && el.contains(pt) ? pt : ev.target;
  this.delDown = !!at.closest('[data-occ-del]');
  if (!el || this.delDown || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  ev.preventDefault();
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const list = this.doc().f.boxes || [], hit = at.closest('[data-occ-h]'), on = at.closest('[data-occ-box]'), sel = this.state.occSel;
  const d = hit && sel ? { kind: 'size', id: sel, corner: hit.getAttribute('data-occ-h') } : on ? { kind: 'move', id: on.getAttribute('data-occ-box') } : { kind: list.length < 30 ? 'draw' : 'none', id: this.newBoxId() };
  this.drag = { ...d, r, at: { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }, start: list, moved: false, pid: ev.pointerId, boxes: null };
  if (d.kind === 'move' && d.id !== sel) this.setState({ occSel: d.id });
  try { el.setPointerCapture(ev.pointerId); } catch (err) { /* the pointer is already gone */ }
}
occMove(ev) {
  const d = this.drag;
  if (!d || ev.pointerId !== d.pid || d.kind === 'none') return;
  const r = d.r, cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const p = { x: cl((ev.clientX - r.left) / r.width, 0, 1), y: cl((ev.clientY - r.top) / r.height, 0, 1) }, dx = p.x - d.at.x, dy = p.y - d.at.y;
  if (!d.moved && Math.abs(dx * r.width) < 4 && Math.abs(dy * r.height) < 4) return;
  d.moved = true;
  if (d.kind === 'draw') d.boxes = [...d.start, { id: d.id, x: Math.min(d.at.x, p.x), y: Math.min(d.at.y, p.y), w: Math.abs(dx), h: Math.abs(dy), label: '' }];
  else {
    const b = d.start.find(x => x.id === d.id);
    if (!b) return;
    let n;
    if (d.kind === 'move') n = { ...b, x: cl(b.x + dx, 0, 1 - b.w), y: cl(b.y + dy, 0, 1 - b.h) };
    else {
      // Pulling a corner keeps the opposite corner where it is; a box stays at least 14 points across.
      const mw = 14 / r.width, mh = 14 / r.height;
      let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      if (d.corner.includes('w')) x1 = cl(x1 + dx, 0, x2 - mw); else x2 = cl(x2 + dx, x1 + mw, 1);
      if (d.corner.includes('n')) y1 = cl(y1 + dy, 0, y2 - mh); else y2 = cl(y2 + dy, y1 + mh, 1);
      n = { ...b, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    d.boxes = d.start.map(x => (x.id === d.id ? n : x));
  }
  this.forceUpdate();
}
occUp(ev, cancel) {
  const d = this.drag;
  if (!d || ev.pointerId !== d.pid) return;
  this.drag = null;
  const drawn = d.kind === 'draw' && d.boxes ? d.boxes[d.boxes.length - 1] : null;
  // A tap on the picture, off the boxes, puts the picked box down; so does a drawing too small to be a box.
  if (cancel || !d.boxes || (drawn && (drawn.w * d.r.width < 12 || drawn.h * d.r.height < 12))) {
    if (!cancel && d.kind === 'draw' && this.state.occSel) this.setState({ occSel: null }); else this.forceUpdate();
    return;
  }
  if (drawn && this.fine()) this.ed.labelFocus = drawn.id;
  this.putBoxes(d.boxes);
  if (drawn) this.setState({ occSel: drawn.id });
}
// Add a box: in the middle, a little lower and to the right of any box already there.
addBox() {
  const list = this.doc().f.boxes || [], w = .26, h = .18;
  if (list.length >= 30) return;
  let x = .37, y = .41;
  while (list.some(b => Math.abs(b.x - x) < .02 && Math.abs(b.y - y) < .02) && y < .78) { x = Math.min(1 - w, x + .04); y += .04; }
  const id = this.newBoxId();
  if (this.fine()) this.ed.labelFocus = id;
  this.putBoxes([...list, { id, x, y, w, h, label: '' }]);
  this.setState({ occSel: id });
}
removeBox(id) {
  this.putBoxes((this.doc().f.boxes || []).filter(b => b.id !== id));
  if (this.state.occSel === id) this.setState({ occSel: null });
}
labelBox(id, label) { this.commit({ boxes: (this.doc().f.boxes || []).map(b => (b.id === id ? { ...b, label: String(label).slice(0, 200) } : b)) }, { kind: 'type:box' + id }); }
focusLabel(id) {
  const el = (this.occEl ? this.occEl.ownerDocument : document).querySelector('[data-occ-label="' + id + '"]');
  if (el) el.focus();
  return !!el;
}
placeLabel() { const id = this.ed.labelFocus; if (id) { this.ed.labelFocus = null; this.focusLabel(id); } }
// Keys for the picked box (not while typing): Delete or Backspace takes it away, the arrows nudge it (Shift for bigger
// steps), Esc puts it down. ⌘Z undoes on the picture too.
boxKey(ev) {
  const tg = ev.target, id = this.state.occSel;
  if (ev.defaultPrevented || ev.isComposing || this.doc().ty !== 'Image' || (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable="true"]'))) return;
  const mod = ev.metaKey || ev.ctrlKey, list = this.doc().f.boxes || [];
  if (mod && /^z$/i.test(ev.key) && (id || tg === this.occEl)) { ev.preventDefault(); return ev.shiftKey ? this.redo() : this.undo(); }
  if (!id || mod || ev.altKey || !list.some(b => b.id === id)) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return this.removeBox(id); }
  if (ev.key === 'Escape') { ev.preventDefault(); return this.setState({ occSel: null }); }
  const st = ev.shiftKey ? .05 : .01, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[ev.key];
  if (!m) return;
  ev.preventDefault();
  this.putBoxes(list.map(b => (b.id === id ? { ...b, x: Math.min(1 - b.w, Math.max(0, b.x + m[0])), y: Math.min(1 - b.h, Math.max(0, b.y + m[1])) } : b)), 'type:nudge' + id);
}
// Record, then Stop: the new clip (its link and its waveform) goes on the card.
toggleRecord() {
  const db = this.props.db || this.mock();
  if (db.recording()) { db.act.record(); return; }
  const ed = this.ed;
  db.act.record().then(clip => { if (clip) this.commitIn(ed, { audio: clip.url, wave: clip.wave }); });
}
renderVals() {
  const t = this.theme(!!this.props.dark, !!this.props.dim);const db = this.props.db || this.mock(); const chrome = db.chrome();
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
  // A saved box's card opens with its box picked (the canvas shows box 1 picked).
  if (!('occSel' in s)) s.occSel = db.mock ? 'b1' : saved && saved.box != null ? saved.box : null;
  const put = patch => this.commit(patch);
  const dk = db.deck(this.props.deckId), tags = f.tags || [];
  const pick2 = (list, cur, set) => list.map(([id, label]) => ({ label, pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => set(id) }));
  // Each field, drawn with its formatting. The ring shows which one you're typing in.
  const ro = { t, dark: !!this.props.dark };
  const field = (k, cloze) => ({ lines: R.editView(f[k] || '', { ...ro, cloze }), empty: String(f[k] || '') === '' ? 'true' : 'false', ref: this.refFor(k), key: k + e.key,
    ring: s.typing && s.focus === k ? 'inset 0 0 0 2px ' + t.text : 'none' });
  const rich = { front: field('front'), back: field('back'), text: field('text', ty === 'Blank'), note: field('note'), speak: field('speak') };
  const nBlanks = R.blanks(f.text || '').length;
  const said = R.plain(f.speak || '').trim();
  // Image occlusion: the boxes as they are now (while one is dragged, where it is), the picked one, and each one's answer.
  // A picture with boxes needs no Answer: each box's label is its card's answer.
  const bx = this.boxes(), picked = bx.some(b => b.id === s.occSel) ? s.occSel : null, pct = v => +(v * 100).toFixed(3) + '%';
  const tint = this.props.dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)';
  const occ = { ref: this.occRef(), has: bx.length > 0, none: !bx.length, canAdd: !!f.image && bx.length < 30, tip: !!f.image && f.image !== 'mock' && !bx.length,
    hint: f.occ === 'all' ? 'Every box stays hidden while one is asked.' : 'Only the box being asked is hidden.',
    // The picked box sits on top of the others, so its corners can always be reached.
    boxes: bx.map((b, i) => { const on = b.id === picked; return { id: b.id, n: String(i + 1), num: on ? '' : String(i + 1), sel: on, pressed: on ? 'true' : 'false', z: on ? '2' : '1',
      x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h), bg: on ? tint : t.surf2, fg: t.text, ring: on ? 'inset 0 0 0 2px ' + t.inv + ', 0 0 0 2px ' + t.bg : '0 0 0 2px ' + t.bg,
      // The × floats over the middle of the box, clear of its corners: above it, or below it near the picture's top
      // (inside a box that fills the picture's height).
      delAt: b.y >= .16 ? 'left: 50%; margin-left: -12px; bottom: calc(100% + 8px);' : b.y + b.h <= .84 ? 'left: 50%; margin-left: -12px; top: calc(100% + 8px);' : 'right: 8px; top: 8px;',
      rowRing: on ? 'inset 0 0 0 2px ' + t.text : 'none', chip: on ? t.inv : t.bg, chipFg: on ? t.invText : t.text, label: b.label || '',
      pick: () => { if (this.state.occSel !== b.id) this.setState({ occSel: b.id }); },
      remove: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); this.removeBox(b.id); },
      del: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (ev && ev.detail > 0 && !this.delDown) return; this.delDown = false; this.removeBox(b.id); },
      setLabel: ev => this.labelBox(b.id, ev && ev.target ? ev.target.value : ''),
      // Return goes on to the next box's answer.
      key: ev => { if (!ev || ev.key !== 'Enter' || ev.isComposing) return; ev.preventDefault(); const nx = bx[i + 1]; if (!nx || !this.focusLabel(nx.id)) ev.target.blur(); } }; }) };
  const missing = this.missingOf(ty, f, bx.length);
  // Back goes where you came from: the review, the Library's All cards, or the deck.
  const backHref = this.props.from === 'review' ? db.href('review', dk.id) : this.props.from === 'library' ? db.href('cards') : this.props.from === 'stats' ? db.href('stats') : dk.href;
  // The sound: its player (a file's waveform, or the words the device reads aloud) or, while recording, the live waveform
  // (the newest bar at the right), how long it's been, and Stop.
  const clock = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  // A clip's length, rounded (a clip under a second still says 0:01).
  const clipLength = d => clock(d > 0 ? Math.max(1, Math.round(d)) : 0);
  const fillTo = f => 'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
  const soundView = (src, n, slot) => {
    const w = db.sound(src), f = w.frac || 0, dur = w.dur || 0, P = w.peaks && w.peaks.length ? w.peaks : [0];
    const bars = Array.from({ length: n }, (_, i) => { const a = Math.floor(i * P.length / n), b = Math.max(a + 1, Math.floor((i + 1) * P.length / n)); let v = 0; for (let j = a; j < b; j++) v = Math.max(v, P[j] || 0); return { h: Math.max(9, Math.round(v * 100)) + '%' }; });
    const all = this.sounds || (this.sounds = {});
    const h = all[slot] || (all[slot] = {
      wave: el => {
        if (!el) return;
        el.__snd = h;
        h.db.act.watchSound(el, h.key, x => { const p = el.lastElementChild; if (p) p.style.clipPath = fillTo(x); });
        if (el.__sndOn) return;
        el.__sndOn = true;
        // Tap or drag: the waveform follows the finger, and letting go moves the sound there.
        let drag = false;
        const at = e => { const r = el.getBoundingClientRect(); return r.width ? Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) : 0; };
        const go = (x, dragging) => { const s = el.__snd; s.db.act.seekSound(s.src, x, dragging); };
        el.addEventListener('pointerdown', e => { if (e.button > 0) return; drag = true; try { el.setPointerCapture(e.pointerId); } catch (err) { /* already let go */ } go(at(e), true); });
        el.addEventListener('pointermove', e => { if (drag) go(at(e), true); });
        el.addEventListener('pointerup', e => { if (drag) { drag = false; go(at(e), false); } });
        el.addEventListener('pointercancel', () => { if (drag) { drag = false; go(null, false); } });
      },
      at: el => { if (el) h.db.act.watchSound(el, h.key, (x, sec) => { el.textContent = clock(sec); }); },
      time: el => { if (el) h.db.act.watchSound(el, h.key, (x, sec, d, on) => { el.textContent = x > 0 || on ? clock(sec) : clipLength(d); }); }
    });
    Object.assign(h, { db, src, key: w.key, dur });
    return { key: w.key, bars, fill: fillTo(f), anim: 'none', on: w.on, off: !w.on, hasTime: !w.speech && dur > 0,
      label: w.on ? 'Pause' : 'Play the sound', word: w.on ? 'Pause' : 'Play',
      at: clock(f * dur), total: clipLength(dur), time: f > 0 || w.on ? clock(f * dur) : clipLength(dur),
      pct: String(Math.round(f * 100)), valueText: w.speech ? Math.round(f * 100) + '%' : clock(f * dur) + ' of ' + clipLength(dur),
      toggle: e => { if (e && e.stopPropagation) e.stopPropagation(); h.db.act.playSound(h.src); },
      hold: e => { if (e && e.stopPropagation) e.stopPropagation(); },
      // ← and → move a second (or a twentieth of the words), Home and End go to either end, Space or Return plays or pauses.
      keys: e => {
        const x = h.db.sound(h.src).frac || 0, step = h.dur ? Math.min(.25, 1 / h.dur) : .05;
        const to = { ArrowLeft: x - step, ArrowRight: x + step, Home: 0, End: 1 }[e.key];
        if (to != null) { e.preventDefault(); h.db.act.seekSound(h.src, Math.min(1, Math.max(0, to)), false); }
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); h.db.act.playSound(h.src); }
      },
      ref: h.wave, atRef: h.at, timeRef: h.time };
  };
  const recNow = db.recording(), src = f.audio ? { audio: f.audio, wave: f.wave || null } : said ? { speak: f.speak, lang: f.lang } : null;
  const snd = { ...soundView(src, 56, 'editor'), show: !!src && !recNow, none: !src && !recNow };
  const mic = this.mic || (this.mic = {
    bars: el => { if (el) mic.db.act.watchMic(el, (levels, level, slide) => {
      const row = el.firstElementChild, bs = row ? row.children : [], n = bs.length;
      for (let i = 0; i < n; i++) bs[i].style.height = Math.max(9, Math.round((i === n - 1 ? level : levels[levels.length - n + 1 + i] || 0) * 100)) + '%';
      if (row) row.style.transform = slide ? 'translateX(' + (-5 * slide).toFixed(2) + 'px)' : '';
    }); },
    time: el => { if (el) mic.db.act.watchMic(el, (levels, level, slide, secs) => { el.textContent = clock(secs); }); }
  });
  mic.db = db;
  const lv = recNow ? recNow.levels : [], saving = !!recNow && recNow.saving;
  const rec = { show: !!recNow, on: !!recNow && !saving, bg: recNow ? t.againTint : t.surf, btn: saving ? t.muted : t.again, ink: saving ? t.muted : t.again,
    label: saving ? 'Saving the recording' : 'Stop recording', time: recNow ? (saving ? 'Saving…' : clock(recNow.secs)) : '0:00',
    bars: Array.from({ length: 71 }, (_, i) => ({ h: Math.max(9, Math.round((i === 70 ? (recNow ? recNow.level : 0) : lv[lv.length - 70 + i] || 0) * 100)) + '%' })),
    ref: mic.bars, timeRef: mic.time };
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
    t, kb, dark: !!this.props.dark, dim: !!this.props.dim, typing: s.typing, deckId: this.props.deckId || '',
    // The iPhone editor's keyboard is drawn on the canvas; in the app the phone shows its own.
    drawKb: s.typing && !!db.mock,
    title: saved ? 'Edit card' : 'New card', deckName: dk.name, backHref, f, rich, slash,
    // On the canvas the iPhone editor goes back to the iPhone deck page.
    phoneBack: db.mock ? 'PhoneDeck.dc.html' : backHref,
    isBasic: ty === 'Basic', isCloze: ty === 'Blank', isImage: ty === 'Image', isAudio: ty === 'Audio',
    // Switching away from Audio while it records throws the recording away.
    types: ['Basic', 'Blank', 'Image', 'Audio'].map(l => ({ label: l, bg: l === ty ? t.bg : 'transparent', fg: l === ty ? t.text : t.muted, sh: l === ty ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => { if (l !== 'Audio' && recNow) db.act.stopRecording(true); this.commit({}, { type: l, kind: 'kind' }); } })),
    hideKeyboard: () => this.setState({ typing: false }),
    // Pressing a formatting button leaves the caret in the field.
    keepFocus: ev => { if (ev && ev.preventDefault) ev.preventDefault(); },
    // Formatting bar over the keyboard. Aa swaps in the text styles.
    fmtMain: !s.styles, fmtStyles: s.styles,
    openStyles: () => this.setState({ styles: true }), closeStyles: () => this.setState({ styles: false }),
    fmt,
    // Fill in the blank: one card per blank, or one card with every blank.
    clozeModes: pick2([['each', 'One card per blank · ' + nBlanks], ['one', 'One card, all blanks']], f.clozeMode || 'each', id => put({ clozeMode: id })),
    // Image cards: hide only the box being asked, or every box.
    occModes: pick2([['one', 'Hide one'], ['all', 'Hide all']], f.occ === 'all' ? 'all' : 'one', id => put({ occ: id })),
    img: { mock: f.image === 'mock', url: f.image && f.image !== 'mock' ? f.image : '', none: !f.image, some: !!f.image },
    occ, addBox: () => this.addBox(),
    pickImage: () => this.pickImage(),
    snd, rec, recLabel: recNow ? 'Stop' : 'Record',
    toggleRecord: () => this.toggleRecord(),
    pickAudio: () => { const ed = this.ed; db.act.pickSound().then(clip => clip && this.commitIn(ed, { audio: clip.url, wave: clip.wave })); },
    speakOn: !!s.speakOpen || !!said, toggleSpeak: () => this.setState({ speakOpen: !s.speakOpen }),
    autoSw: sw(f.auto !== false), toggleAuto: () => put({ auto: f.auto === false }), noop: () => {},
    // A card can have any number of tags.
    cardTags: tags.map(g => ({ ...tagChip(g), remove: () => put({ tags: tags.filter(x => x !== g) }) })),
    // Opening the picker puts the keyboard away.
    cardPick: (() => { const q = tagPicker(tags, next => put({ tags: next }), 'cp', db.mock ? null : db.tags()); return { ...q, toggle: () => this.setState({ cpOpen: !q.open, cpQ: '', typing: false }) }; })(),
    canDelete: !!saved, remove: () => db.act.deleteCard(saved.id, backHref),
    // Pausing a card (every card of its text or picture): it doesn't come up until it's unpaused.
    pausedNow: saved && saved.paused ? 'true' : 'false', pauseLabel: saved && saved.paused ? 'Unpause' : 'Pause', pauseCardLabel: saved && saved.paused ? 'Unpause card' : 'Pause card',
    pauseBg: saved && saved.paused ? t.inv : t.surf, pauseFg: saved && saved.paused ? t.invText : t.text,
    togglePause: () => { if (saved) db.act.pauseCards(db.mock ? [saved.id] : db.group(saved.id).map(c => c.id), !saved.paused); },
    save: ev => {
      if (db.mock) return;
      ev.preventDefault();
      if (missing === 'image') return this.pickImage();
      if (missing) return this.focusField(missing);
      db.act.saveCard(saved ? saved.id : null, dk.id, this.payload(ty, f), backHref);
    },
    ...this.listVals({ db, t, saved, missing, R, tagChip, tagFit, backHref })
  };
}
fresh(o) { return { ...{ edits: {}, type: null, sel: null, pend: null, past: [], future: [], last: '', lastAt: 0, key: 0, restore: false, sig: '' }, ...o }; }
// The sample has no saved cards, so on the canvas each one opens with what its row says (and the sample picture or sound).
sampleCard(db, r) {
  const kind = { text: 'basic', blank: 'cloze', image: 'image', audio: 'audio' }[r.icon], d = db.draft({ basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' }[kind]);
  return { ...d, id: r.id, kind, tags: r.tags, note: '', front: kind === 'cloze' ? '' : r.front, back: kind === 'image' ? '' : r.back, text: kind === 'cloze' ? r.front.replace('____', '[[' + r.back + ']]') : '', paused: !!r.paused };
}
// A card you added that the app is still saving (its row has an id of its own until then).
temp(id) { return (this.added || []).some(c => c.id === id); }
cardOf(db, id) {
  const a = this.added.find(c => c.id === id), r = !a && db.mock && db.cards().find(x => x.id === id);
  return a || (r ? this.sampleCard(db, r) : db.mock ? null : db.card(id));
}
// The deck's cards (their ids and kinds), the ones added here first. The cards made from one text (one per blank) or one
// picture (one per box) are one row, as you wrote them. The row goes by the card you're on or changed (else the first
// of them), so it stays the same row while you edit it.
cardIds(db) {
  const icon = { basic: 'text', cloze: 'blank', image: 'image', audio: 'audio' }, seen = new Set(), rows = [];
  for (const r of db.cards(db.deck(this.props.deckId).id)) {
    if (!r.group) { rows.push(r); continue; }
    if (seen.has(r.group)) continue;
    seen.add(r.group);
    const sibs = db.group(r.id), ids = sibs.map(c => c.id);
    rows.push({ ...r, id: ids.includes(this.pick) ? this.pick : ids.find(x => this.eds[x]) || this.firstOf(sibs).id });
  }
  return [...this.added.map(c => ({ id: c.id, icon: icon[c.kind] })), ...rows].filter(r => !this.gone.includes(r.id));
}
// The first card of a text (its first blank) or of a picture (its first box).
firstOf(sibs) {
  const bx = (sibs[0].boxes || []).map(b => b.id), at = c => (c.box != null ? bx.indexOf(c.box) : c.cloze == null ? 0 : c.cloze);
  return sibs.slice().sort((a, b) => at(a) - at(b))[0];
}
hasWords(c) { const R = this.rich(); return ['front', 'back', 'text', 'note', 'speak'].some(k => R.plain(c[k] || '').trim()) || !!(c.boxes || []).length; }
// The card the editor shows (null for the new card). The canvas opens on the first card of the kind it asks for, or on a
// new card half written, its answer being typed. The app opens on the card you picked (on the deck page, in All cards,
// or Edit in a review), or on a new card with the caret in it.
openCard(db) {
  if (!this.eds) {
    this.added = [];
    this.gone = [];
    this.eds = {};
    this.timers = {};
    this.inflight = new Set();
    const want = { Blank: 'blank', Image: 'image', Audio: 'audio' }[this.props.cardType] || 'text', ids = this.cardIds(db);
    let first = db.mock ? ids.find(r => r.icon === want) || ids[0] : null;
    if (!db.mock && this.props.cardId) { const sibs = db.group(this.props.cardId).map(c => c.id); first = ids.find(r => sibs.includes(r.id)) || ids[0]; }
    this.pick = this.props.newCard || !first ? 'new' : first.id;
    this.eds[this.pick] = this.ed;
    if (this.pick === 'new') {
      this.ed.type = ({ Blank: 'Blank', Image: 'Image', Audio: 'Audio' })[this.props.cardType] || 'Basic';
      this.ed.edits = { front: '', back: '', text: '', note: '', speak: '', boxes: [], ...(db.mock && this.ed.type === 'Basic' ? { front: 'Where in the cell does glycolysis happen?', back: 'In the cytoplasm' } : {}) };
      if (db.mock && this.props.newCard) Object.assign(this.state, { typing: true, focus: 'back' });
    }
  }
  // A card deleted somewhere else (on your phone, say) gives way to the first card, or a new one.
  if (!db.mock && this.pick !== 'new' && !this.cardOf(db, this.pick)) {
    const next = this.cardIds(db)[0];
    this.pick = next ? next.id : 'new';
    this.ed = this.eds[this.pick] || (this.eds[this.pick] = this.fresh(next ? {} : { type: 'Basic', edits: { front: '', back: '', text: '', note: '', speak: '', boxes: [] } }));
  }
  return this.pick === 'new' ? null : this.cardOf(db, this.pick);
}
// Picking a card in the list opens it as you left it, with no box picked and the tag picker shut. The card you leave
// saves first (in the app), and leaving one while it records throws the recording away.
pickCard(id) {
  const db = this.props.db || this.mock();
  if (db.recording()) db.act.stopRecording(true);
  if (id !== this.pick) this.save(this.pick, true);
  this.ed.slash = null;
  if (id === 'new' && this.pick !== 'new') this.back = this.pick;
  this.pick = id;
  this.ed = this.eds[id] || (this.eds[id] = this.fresh());
  const a = document.activeElement;
  if (a && a.hasAttribute && a.hasAttribute('data-rk')) a.blur();
  this.setState({ typing: false, occSel: null, speakOpen: false, cpOpen: false, cpQ: '' });
}
// A new card starts empty (the canvas's sample draft has words in it), of the same kind and with the same tags as the
// card you were on, so a run of cards like it is quick to write.
startNew(type, tags) {
  this.eds.new = this.fresh({ type, edits: { front: '', back: '', text: '', note: '', speak: '', boxes: [], tags } });
  this.pickCard('new');
  this.focusField(this.firstField(type));
  if (this.listEl) this.listEl.scrollTop = 0;
}
// New card: back to the new card if it has words in it, else a new one like the card you're on.
openNew() {
  const n = this.eds.new, d = this.doc();
  if (this.pick !== 'new' && !(n && this.hasWords(n.edits))) return this.startNew(d.ty, d.f.tags || []);
  this.pickCard('new');
  this.focusField(this.firstField(this.doc().ty));
}
// Add card (⌘↵): the card goes in the deck (at the top of the list), and the next one starts like it.
addNew(missing) {
  const { f, ty } = this.doc(), tags = f.tags || [];
  if (missing === 'image') return this.pickImage();
  if (missing) return this.focusField(missing);
  this.addDraft();
  this.startNew(ty, tags);
}
// The new card goes in the deck. Until the app has saved it, its row is the card as you wrote it; if it can't be saved
// (say you're offline), it comes back as the new card, so nothing you wrote is lost.
addDraft() {
  const db = this.props.db || this.mock(), n = this.eds.new, ty = n.type || 'Basic', f = { ...db.draft(ty), ...n.edits };
  const card = { ...f, kind: { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' }[ty], tags: f.tags || [], id: 'n' + Date.now().toString(36) };
  this.added = [card, ...this.added];
  this.addedAt = Date.now();
  if (db.mock) return;
  this.addFailed = false;
  this.track(db.act.addCard(db.deck(this.props.deckId).id, this.payload(ty, f)).then(r => {
    const real = r && r.ids && r.ids[0];
    this.added = this.added.filter(c => c !== card);
    // What you changed on its row while it was saving carries over, and saves.
    if (real) {
      if (this.eds[card.id]) { this.eds[real] = this.eds[card.id]; delete this.eds[card.id]; }
      if (this.pick === card.id) this.pick = real;
      if (this.back === card.id) this.back = real;
      if (this.eds[real]) this.save(real, this.pick !== real);
    }
    this.forceUpdate();
  }, err => {
    this.added = this.added.filter(c => c !== card);
    this.addFailed = true;
    if (err instanceof TypeError) this.offline = true;
    const cur = this.eds.new;
    if (!cur || !this.hasWords(cur.edits)) this.eds.new = this.fresh({ type: ty, edits: { ...n.edits } });
    else if (err instanceof TypeError) alert('You’re offline, so a card you just added didn’t save. Add it again once you’re back online.');
    if (this.pick === 'new' || this.pick === card.id) { this.pick = 'new'; this.ed = this.eds.new; }
    this.forceUpdate();
    throw err;
  }));
}
// Delete: the card goes (every card of its text or picture), and the one under it opens (or the one above, or a new
// card when none are left). Discard: the new card goes, and the card you were on opens again.
dropSaved(ids) {
  const db = this.props.db || this.mock(), id = this.pick;
  if (!db.mock) {
    if (this.temp(id) || !confirm('Delete this card?')) return;
    clearTimeout(this.timers[id]);
    delete this.timers[id];
    this.track(db.act.removeCards(db.group(id).map(c => c.id)).catch(err => { this.gone = this.gone.filter(x => x !== id); this.forceUpdate(); throw err; }));
  }
  const i = ids.indexOf(id), next = ids[i + 1] || ids[i - 1];
  this.gone = [...this.gone, id];
  if (next) this.pickCard(next); else this.startNew('Basic', []);
}
discardNew(ids) {
  delete this.eds.new;
  const back = ids.includes(this.back) ? this.back : ids[0];
  if (back) this.pickCard(back); else this.startNew('Basic', []);
}
// ---------- Saving (the app) ----------
// A saved card saves itself (the owner picked this screen, where going card to card shouldn't ask anything): a moment
// after you stop changing it, and at once when you go to another card or leave. It waits while it's missing something
// (its back, say; the note says what), and a change that would take cards away (a blank or a box gone, or another kind
// of card) waits until you leave the card, so a slip you undo right away costs no reviews.
kindNames() { return { basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' }; }
edited(ed) {
  const db = this.props.db;
  if (!db || db.mock) return;
  const id = Object.keys(this.eds).find(k => this.eds[k] === ed);
  if (!id || id === 'new' || this.temp(id) || this.gone.includes(id)) return;
  clearTimeout(this.timers[id]);
  this.timers[id] = setTimeout(() => { delete this.timers[id]; this.save(id, false); this.forceUpdate(); }, 700);
}
// `leaving`: you're going to another card or off the screen; `closing`: the page itself is closing.
save(id, leaving, closing) {
  const db = this.props.db;
  if (!db || db.mock || !id || id === 'new' || this.temp(id) || this.gone.includes(id)) return;
  clearTimeout(this.timers[id]);
  delete this.timers[id];
  const e = this.eds[id], saved = db.card(id);
  if (!e || !saved) return;
  const was = this.kindNames()[saved.kind], ty = e.type || was, f = { ...saved, ...e.edits }, body = this.payload(ty, f), sig = JSON.stringify(body);
  e.hold = '';
  if (sig === e.sent || sig === JSON.stringify(this.payload(was, saved))) return;
  if (this.missingOf(ty, f)) { e.hold = 'missing'; return; }
  if (!leaving && this.cuts(db, saved, ty, f)) { e.hold = 'cuts'; return; }
  e.sent = sig;
  e.failed = false;
  e.busy = (e.busy || 0) + 1;
  this.track(db.act.updateCard(id, body, closing).catch(err => { if (e.sent === sig) e.sent = ''; e.failed = true; if (err instanceof TypeError) this.offline = true; throw err; })
    .finally(() => { e.busy--; this.forceUpdate(); }));
}
// Whether saving would take cards away: another kind of card, or fewer blanks or boxes than it has cards.
cuts(db, saved, ty, f) {
  if (ty !== this.kindNames()[saved.kind]) return true;
  const sibs = db.group(saved.id);
  if (ty === 'Blank') { const n = this.rich().blanks(f.text || '').length; return ((f.clozeMode || 'each') === 'one' || n < 2 ? 1 : n) < sibs.length; }
  if (ty === 'Image') { const ids = new Set((f.boxes || []).map(b => b.id)); return sibs.some(c => c.box != null && !ids.has(c.box)); }
  return false;
}
track(p) { const x = p.catch(() => {}).finally(() => this.inflight.delete(x)); this.inflight.add(x); }
saveAll(closing) { for (const id of new Set([this.pick, ...Object.keys(this.timers || {})])) this.save(id, true, closing); }
// What leaving now would lose: changes waiting on something their card is missing, and a new card not added yet
// (`draft`: 'ready' to add, or 'unfinished').
unsaved() {
  const db = this.props.db, held = [], n = this.eds && this.eds.new;
  for (const [id, e] of Object.entries(this.eds || {})) {
    const saved = id !== 'new' && !this.temp(id) && !this.gone.includes(id) && db.card(id);
    if (!saved) continue;
    const was = this.kindNames()[saved.kind], ty = e.type || was, f = { ...saved, ...e.edits };
    if (this.missingOf(ty, f) && JSON.stringify(this.payload(ty, f)) !== JSON.stringify(this.payload(was, saved))) held.push(id);
  }
  const ty = n && (n.type || 'Basic'), draft = !n || !this.hasWords(n.edits) ? '' : this.missingOf(ty, { ...db.draft(ty), ...n.edits }) ? 'unfinished' : 'ready';
  return { held, draft };
}
// Done (and the deck's name at the top): what you changed saves, a finished new card is added, and the screen closes
// once they're in. It asks first only if something would be lost.
async leave(href) {
  const db = this.props.db, u = this.unsaved(), cards = u.held.length;
  if (cards || u.draft === 'unfinished') {
    const msg = cards && u.draft === 'unfinished' ? 'Some changes and your new card are missing something, so they won’t be saved. Leave anyway?'
      : cards ? (cards === 1 ? 'A card you changed is missing something, so the change won’t be saved. Leave anyway?' : cards + ' cards you changed are missing something, so the changes won’t be saved. Leave anyway?')
      : 'Your new card isn’t finished, so it won’t be added. Leave anyway?';
    if (!confirm(msg)) return;
  }
  this.saveAll(false);
  if (u.draft === 'ready') this.addDraft();
  this.offline = false;
  this.exiting = true;
  this.forceUpdate();
  while (this.inflight.size) await Promise.all([...this.inflight]);
  this.exiting = false;
  if (this.addFailed || Object.values(this.eds).some(e => e.failed)) {
    this.forceUpdate();
    if (this.offline) alert('You’re offline, so this didn’t save. Try Done again once you’re back online.');
    return;
  }
  db.act.go(href);
}
// Closing the tab or reloading saves what you changed, and the browser asks first if something would be lost.
opened() {
  const db = this.props.db;
  if (!db || db.mock) return;
  this.onLeavePage = ev => { this.saveAll(true); const u = this.unsaved(); if (u.held.length || u.draft) { ev.preventDefault(); ev.returnValue = ''; } };
  addEventListener('beforeunload', this.onLeavePage);
  if (this.pick === 'new') this.focusField(this.firstField(this.doc().ty));
  else if (this.listEl) { const r = this.listEl.querySelector('[aria-current="true"]'); if (r) r.scrollIntoView({ block: 'nearest' }); }
}
closing() {
  if (this.onLeavePage) removeEventListener('beforeunload', this.onLeavePage);
  if (this.eds) this.saveAll(false);
}
listVals(o) {
  const { db, t, saved, missing, R, tagChip, tagFit, backHref } = o, s = this.state, id = this.pick, e = this.ed;
  const cardSlot = (tags, i) => (tags && tags[i] ? { show: true, ...tagChip(tags[i]) } : { show: false, label: '', bg: 'transparent', fg: t.text });
  const cardFit = tags => { const fit = tagFit(tags, 2); return { c1: cardSlot(fit.vis, 0), c2: cardSlot(fit.vis, 1), cMore: { show: fit.more > 0, label: '+' + fit.more, title: (tags || []).slice(fit.vis.length).join(', ') } }; };
  const kinds = { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' }, glyphs = { basic: 'Aa', cloze: '_', image: '▢', audio: '♪' };
  const flat = md => R.plain(md || '', { join: ' ', math: 'show' }), pct = v => +(v * 100).toFixed(3) + '%';
  // What a card's row says, like the deck page's list: its front (a blank card's text, with ____ for its blanks) over
  // its back (a picture's box labels).
  const words = c => (c.kind === 'cloze' ? [R.plain(c.text || '', { cloze: true, blank: '____', join: ' ', math: 'show' }), R.blanks(c.text || '', { math: 'show' }).join(', ')]
    : [flat(c.front) || (c.kind === 'audio' ? flat(c.speak) || 'Audio card' : c.kind === 'image' ? 'Image card' : ''), c.kind === 'image' && (c.boxes || []).length ? c.boxes.map(b => b.label).filter(Boolean).join(', ') : flat(c.back)]);
  // A card as it is now: what's saved, with what you've changed.
  const latest = (rid, base) => { const x = this.eds[rid] || {}; return { ...base, ...(x.edits || {}), ...(x.type ? { kind: kinds[x.type] } : {}) }; };
  // A card you left while it was missing something says so on its row: it isn't saved.
  const needs = { front: 'its front', back: 'its back', text: 'a blank', image: 'a picture', speak: 'a sound' };
  const heldWhy = (rid, c) => { const x = this.eds[rid]; if (!x || x.hold !== 'missing') return ''; const m = this.missingOf({ basic: 'Basic', cloze: 'Blank', image: 'Image', audio: 'Audio' }[c.kind], c); return m ? 'Not saved: needs ' + (m === 'back' && c.kind !== 'basic' ? 'its answer' : needs[m]) : ''; };
  const row = (rid, c, title, sub) => { const on = rid === id, bx = c.kind === 'image' && c.image ? c.boxes || [] : null, why = heldWhy(rid, c);
    return { title, sub: why || (c.paused ? 'Paused' + (sub ? ' · ' + sub : '') : sub), subFg: why ? t.again : t.muted, glyph: glyphs[c.kind], hasTags: !!(c.tags || []).length, ...cardFit(c.tags), current: on ? 'true' : 'false', bg: on ? t.surf : 'transparent', chip: on ? t.bg : t.surf,
      thumb: { show: !!bx, mock: c.image === 'mock', url: bx && c.image !== 'mock' ? c.image : '', boxes: (bx || []).map(b => ({ x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h) })) },
      pick: () => this.pickCard(rid) }; };
  const q = (s.listQ || '').trim().toLowerCase(), kf = s.listKind || 'all';
  const all = this.cardIds(db).map(r => { const c = latest(r.id, this.cardOf(db, r.id)), [front, back] = words(c); return { id: r.id, c, front, back }; });
  const shown = all.filter(x => (kf === 'all' || x.c.kind === kf) && (!q || [x.front, x.back, ...(x.c.tags || [])].join(' ').toLowerCase().includes(q))), ids = shown.map(x => x.id);
  // The new card sits on top while it's open, or while it has words in it.
  const nd = this.eds.new, draft = nd && (id === 'new' || this.hasWords(nd.edits)) ? latest('new', db.draft(nd.type || 'Basic')) : null;
  // Changing a saved card shows Saving… until it's saved, then Saved; adding one shows Added. (The canvas shows Saving…
  // for a moment after each change.) A card missing something says what it needs.
  const since = Date.now() - (e.lastAt || 0), added = !saved && Date.now() - (this.addedAt || 0) < 2400;
  const busy = !!saved && (db.mock ? since < 900 : this.temp(id) || !!this.timers[id] || (e.busy || 0) > 0);
  if ((db.mock && busy) || added) { clearTimeout(this.noteT); this.noteT = setTimeout(() => this.forceUpdate(), busy ? 950 - since : 2450 - Date.now() + this.addedAt); }
  const ask = { front: 'Add the front to save', back: this.doc().ty === 'Basic' ? 'Add the back to save' : 'Add the answer to save', text: 'Add a blank to save', image: 'Add a picture to save', speak: 'Add a sound to save' };
  const held = !busy && !!saved && e.hold === 'missing' && !!missing, waits = !busy && !!saved && e.hold === 'cuts', failed = !busy && !!saved && !!e.failed;
  // A long deck lists 200 cards at a time (always down to the one you're on), so typing stays quick.
  const n = all.length, cap = Math.max(s.listCap || 200, ids.indexOf(id) + 1);
  return {
    rows: [...(draft ? [row('new', draft, 'New card', words(draft)[0] || 'Not added yet')] : []), ...shown.slice(0, cap).map(x => row(x.id, x.c, x.front || 'Empty card', x.back))],
    more: { show: shown.length > cap, label: 'Show ' + Math.min(200, shown.length - cap) + ' more', go: () => this.setState({ listCap: cap + 200 }) },
    none: !shown.length, noneLabel: n ? 'No cards match' : 'No cards yet', countLabel: (shown.length < n ? shown.length + ' of ' : '') + n + (n === 1 ? ' card' : ' cards'),
    listQuery: s.listQ || '', setListQuery: ev => this.setState({ listQ: ev && ev.target ? ev.target.value : '', listCap: 200 }),
    listKinds: [['all', 'All'], ['basic', 'Basic'], ['cloze', 'Blank'], ['image', 'Image'], ['audio', 'Audio']].map(([k, label]) => { const on = k === kf;
      return { label, pressed: on ? 'true' : 'false', bg: on ? t.bg : 'transparent', fg: on ? t.text : t.muted, sh: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', pick: () => this.setState({ listKind: k, listCap: 200 }) }; }),
    listRef: el => { this.listEl = el; },
    note: { show: !!saved || added, done: !busy && !held && !waits && !failed, label: busy ? 'Saving…' : !saved ? 'Added' : held ? ask[missing] : waits ? 'Saves when you leave this card' : failed ? 'Not saved yet' : 'Saved' },
    isNew: !saved, canDelete: !!saved && !this.temp(id), newCard: () => this.openNew(), addCard: ev => { if (ev && ev.preventDefault) ev.preventDefault(); this.addNew(missing); },
    deleteCard: () => this.dropSaved(ids), discard: () => this.discardNew(ids),
    done: ev => { if (db.mock) return; if (ev && ev.preventDefault) ev.preventDefault(); if (!this.exiting) this.leave(backHref); },
    doneLabel: this.exiting ? 'Saving…' : 'Done'
  };
}
}
return Component;
  }
};
