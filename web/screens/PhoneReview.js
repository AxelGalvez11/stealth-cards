// Made from design/canvas/project/PhoneReview.dc.html by design/to-web.mjs. Change the design, not this file.
export default {
  name: "PhoneReview", title: "iPhone · Review", w: 390, h: 844, fill: true,
  props: {"dark":false,"dim":false,"playing":false,"explainOpen":false,"explained":false,"grading":"Four buttons","card":"Basic","startRevealed":false,"fsrs":true,"progress":"Bar","settingsOpen":false,"newPileOpen":false,"radius":32},
  imports: [],
  css: "body{margin:0;font-family:Geist, -apple-system, system-ui, sans-serif}\na{color:inherit;text-decoration:none}a:hover{opacity:.8}\n@keyframes scRise{from{opacity:0;transform:translateY(14px)}}main>*{animation:scRise .5s cubic-bezier(.2,.8,.2,1) backwards}main>*:nth-child(2){animation-delay:0.06s}main>*:nth-child(3){animation-delay:0.12s}main>*:nth-child(4){animation-delay:0.18s}main>*:nth-child(5){animation-delay:0.24s}main>*:nth-child(n+6){animation-delay:.3s}button,.sc-press{transition:transform .1s ease}button:active,.sc-press:active{transform:scale(.96)}.sc-sw{transition:background-color .3s ease,transform .1s ease}.sc-sw>span{transition:transform .32s cubic-bezier(.34,1.56,.64,1),background-color .3s ease}.sc-lift{transition:transform 1s ease-out,box-shadow 1s ease-out}.sc-lift:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}@keyframes scScrimIn{from{opacity:0}}@keyframes scScrimOut{to{opacity:0}}.sc-scrim{animation:scScrimIn .35s ease backwards}.sc-scrim.sc-gone{animation:scScrimOut .26s ease forwards}@keyframes scPanelIn{from{opacity:0;transform:translateX(calc(100% + 12px))}}@keyframes scPanelOut{to{opacity:0;transform:translateX(calc(100% + 12px))}}.sc-panel{animation:scPanelIn .35s cubic-bezier(.2,.8,.2,1) backwards}.sc-panel.sc-gone{animation:scPanelOut .26s cubic-bezier(.4,0,1,1) forwards}@keyframes scSheetIn{from{transform:translateY(100%)}}@keyframes scSheetOut{to{transform:translateY(100%)}}.sc-sheet{animation:scSheetIn .35s cubic-bezier(.2,.8,.2,1) backwards}.sc-sheet.sc-gone{animation:scSheetOut .26s cubic-bezier(.4,0,1,1) forwards}@keyframes scFloat{50%{transform:translateY(-6px)}}@keyframes scSwayA{50%{transform:rotate(-13deg) translateX(-3px)}}@keyframes scSwayB{50%{transform:rotate(10deg) translateX(3px)}}@keyframes scGlow{50%{opacity:.55}}@keyframes scSheen{0%,58%{transform:translateX(-160%) skewX(-18deg)}86%,100%{transform:translateX(260%) skewX(-18deg)}}.sc-float{animation:scFloat 6s ease-in-out infinite}.sc-sway-a{animation:scSwayA 6s ease-in-out infinite}.sc-sway-b{animation:scSwayB 6s ease-in-out infinite}.sc-glow{animation:scGlow 6s ease-in-out infinite}.sc-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:scSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}@keyframes scDrift{from{transform:scale(1.14) translate(-3%,-2%)}to{transform:scale(1.14) translate(3%,2%)}}.sc-alive>svg:first-of-type{animation:scDrift 16s ease-in-out infinite alternate}@keyframes scDraw{from{stroke-dashoffset:1.02}}.sc-draw{stroke-dasharray:1 2;animation:scDraw .9s cubic-bezier(.2,.8,.2,1) backwards}@keyframes scKnob{from{opacity:0;transform:scale(.3)}}.sc-knob{transform-box:fill-box;transform-origin:center;animation:scKnob .35s .75s cubic-bezier(.34,1.56,.64,1) backwards}@keyframes scGrow{from{transform:scaleY(0)}}.sc-grow{transform-origin:bottom;animation:scGrow .6s cubic-bezier(.2,.8,.2,1) backwards}:nth-child(2)>.sc-grow{animation-delay:0.04s}:nth-child(3)>.sc-grow{animation-delay:0.08s}:nth-child(4)>.sc-grow{animation-delay:0.12s}:nth-child(5)>.sc-grow{animation-delay:0.16s}:nth-child(6)>.sc-grow{animation-delay:0.20s}:nth-child(7)>.sc-grow{animation-delay:0.24s}:nth-child(8)>.sc-grow{animation-delay:0.28s}:nth-child(9)>.sc-grow{animation-delay:0.32s}:nth-child(10)>.sc-grow{animation-delay:0.36s}:nth-child(11)>.sc-grow{animation-delay:0.40s}:nth-child(12)>.sc-grow{animation-delay:0.44s}:nth-child(13)>.sc-grow{animation-delay:0.48s}:nth-child(14)>.sc-grow{animation-delay:0.52s}@media (prefers-reduced-motion:reduce){main>*,.sc-float,.sc-sway-a,.sc-sway-b,.sc-glow,.sc-alive>svg,.sc-draw,.sc-knob,.sc-grow,.sc-scrim,.sc-panel,.sc-sheet{animation:none!important}.sc-sheen{display:none}button:active,.sc-press:active,.sc-lift:hover{transform:none}.sc-sw>span{transition:background-color .3s ease}}\n.sc-wave{outline:0;-webkit-tap-highlight-color:transparent}.sc-wave:focus-visible{box-shadow:0 0 0 2px currentColor;border-radius:8px}.sc-wave span{transition:height .35s cubic-bezier(.2,.8,.2,1)}button:has(.sc-hold:active,.sc-wave:active){transform:none}@keyframes scRecDot{50%{opacity:.25}}.sc-rec-dot{animation:scRecDot 1.2s ease-in-out infinite}@keyframes scPlayed{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@media (prefers-reduced-motion:reduce){.sc-wave span{transition:none}.sc-rec-dot{animation:none}}\n@keyframes scPop{0%{transform:scale(.6) translateY(4px);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:none;opacity:1}}\n@keyframes scFadeA{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n@keyframes scFadeB{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n@keyframes scInA{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}\n@keyframes scInB{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}\n.sc-pop{animation:scPop .5s cubic-bezier(.34,1.56,.64,1) both}\n.sc-fade-a{animation:scFadeA .4s cubic-bezier(.2,.8,.2,1) both}\n.sc-fade-b{animation:scFadeB .4s cubic-bezier(.2,.8,.2,1) both}\n.sc-in-a{animation:scInA .32s cubic-bezier(.2,.8,.2,1) both}\n.sc-in-b{animation:scInB .32s cubic-bezier(.2,.8,.2,1) both}\n@media (prefers-reduced-motion:reduce){.sc-pop,.sc-fade-a,.sc-fade-b,.sc-in-a,.sc-in-b,[data-anim]{animation:none!important}}@media (prefers-reduced-motion:reduce){.sc-occ{transition:none!important}}",
  template: "<div style=\"position: relative; isolation: isolate; width: 100%; height: 100vh; height: 100dvh; min-height: 100%; max-height: 100%; box-sizing: border-box; padding: 60px 16px 34px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; font-family: Geist, -apple-system, system-ui, sans-serif; background: {{t.bg}}; color: {{t.text}};\">\n  <div aria-hidden=\"true\" style=\"position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background: {{t.bg}};\">\n  <sc-if value=\"{{bg.isDeck}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"position: absolute; inset: -4%; background: {{bg.mesh.base}}; filter: {{bg.filter}};\"><svg aria-hidden=\"true\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"none\" width=\"100%\" height=\"100%\" style=\"position: absolute; inset: 0; pointer-events: none;\"><defs><filter id=\"{{bg.mesh.fid}}\" x=\"-60%\" y=\"-60%\" width=\"220%\" height=\"220%\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".018\" numOctaves=\"2\" seed=\"7\" result=\"n\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"n\" scale=\"{{bg.mesh.disp}}\" xChannelSelector=\"R\" yChannelSelector=\"G\"/><feGaussianBlur stdDeviation=\"{{bg.mesh.blur}}\"/></filter><filter id=\"{{bg.mesh.sid}}\" x=\"-60%\" y=\"-60%\" width=\"220%\" height=\"220%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur stdDeviation=\"{{bg.mesh.sblur}}\"/></filter></defs><g filter=\"url(#{{bg.mesh.fid}})\"><ellipse cx=\"{{bg.mesh.b0.x}}\" cy=\"{{bg.mesh.b0.y}}\" rx=\"{{bg.mesh.b0.rx}}\" ry=\"{{bg.mesh.b0.ry}}\" fill=\"{{bg.mesh.b0.c}}\" transform=\"rotate({{bg.mesh.b0.r}} {{bg.mesh.b0.x}} {{bg.mesh.b0.y}})\"/><ellipse cx=\"{{bg.mesh.b1.x}}\" cy=\"{{bg.mesh.b1.y}}\" rx=\"{{bg.mesh.b1.rx}}\" ry=\"{{bg.mesh.b1.ry}}\" fill=\"{{bg.mesh.b1.c}}\" transform=\"rotate({{bg.mesh.b1.r}} {{bg.mesh.b1.x}} {{bg.mesh.b1.y}})\"/><ellipse cx=\"{{bg.mesh.b2.x}}\" cy=\"{{bg.mesh.b2.y}}\" rx=\"{{bg.mesh.b2.rx}}\" ry=\"{{bg.mesh.b2.ry}}\" fill=\"{{bg.mesh.b2.c}}\" transform=\"rotate({{bg.mesh.b2.r}} {{bg.mesh.b2.x}} {{bg.mesh.b2.y}})\"/><ellipse cx=\"{{bg.mesh.b3.x}}\" cy=\"{{bg.mesh.b3.y}}\" rx=\"{{bg.mesh.b3.rx}}\" ry=\"{{bg.mesh.b3.ry}}\" fill=\"{{bg.mesh.b3.c}}\" transform=\"rotate({{bg.mesh.b3.r}} {{bg.mesh.b3.x}} {{bg.mesh.b3.y}})\"/><ellipse cx=\"{{bg.mesh.b4.x}}\" cy=\"{{bg.mesh.b4.y}}\" rx=\"{{bg.mesh.b4.rx}}\" ry=\"{{bg.mesh.b4.ry}}\" fill=\"{{bg.mesh.b4.c}}\" transform=\"rotate({{bg.mesh.b4.r}} {{bg.mesh.b4.x}} {{bg.mesh.b4.y}})\"/><ellipse cx=\"{{bg.mesh.b5.x}}\" cy=\"{{bg.mesh.b5.y}}\" rx=\"{{bg.mesh.b5.rx}}\" ry=\"{{bg.mesh.b5.ry}}\" fill=\"{{bg.mesh.b5.c}}\" transform=\"rotate({{bg.mesh.b5.r}} {{bg.mesh.b5.x}} {{bg.mesh.b5.y}})\"/></g><g filter=\"url(#{{bg.mesh.sid}})\"><ellipse cx=\"{{bg.mesh.s0.x}}\" cy=\"{{bg.mesh.s0.y}}\" rx=\"{{bg.mesh.s0.rx}}\" ry=\"{{bg.mesh.s0.ry}}\" fill=\"{{bg.mesh.s0.c}}\" transform=\"rotate({{bg.mesh.s0.r}} {{bg.mesh.s0.x}} {{bg.mesh.s0.y}})\"/><ellipse cx=\"{{bg.mesh.s1.x}}\" cy=\"{{bg.mesh.s1.y}}\" rx=\"{{bg.mesh.s1.rx}}\" ry=\"{{bg.mesh.s1.ry}}\" fill=\"{{bg.mesh.s1.c}}\" transform=\"rotate({{bg.mesh.s1.r}} {{bg.mesh.s1.x}} {{bg.mesh.s1.y}})\"/></g></svg></div></sc-if>\n  <sc-if value=\"{{bg.isPhoto}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{bg.photo}}\" alt=\"\" style=\"position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;\"></sc-if>\n  <sc-if value=\"{{bg.isSky}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"position: absolute; left: 0; right: 0; top: 0; height: 700px; background: linear-gradient(180deg, {{bg.skyTop}} 0%, {{bg.skyMid}} 30%, {{bg.skyLow}} 55%, {{t.bg}} 100%);\"></div></sc-if>\n  <sc-if value=\"{{bg.isSunset}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"position: absolute; inset: 0; background: {{bg.sunset}};\"></div></sc-if>\n  <div style=\"position: absolute; inset: 0; background: {{bg.veil}};\"></div>\n  <svg aria-hidden=\"true\" width=\"100%\" height=\"100%\" style=\"position: absolute; inset: 0; mix-blend-mode: overlay; opacity: {{bg.grain}}; pointer-events: none;\"><filter id=\"sc-study-grain\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/><feColorMatrix type=\"saturate\" values=\"0\"/><feComponentTransfer><feFuncR type=\"linear\" slope=\"3.4\" intercept=\"-1.2\"/><feFuncG type=\"linear\" slope=\"3.4\" intercept=\"-1.2\"/><feFuncB type=\"linear\" slope=\"3.4\" intercept=\"-1.2\"/></feComponentTransfer></filter><rect width=\"100%\" height=\"100%\" filter=\"url(#sc-study-grain)\"/></svg>\n</div>\n  <div style=\"display: flex; align-items: center; gap: 12px;\">\n    <a href=\"{{endHref}}\" aria-label=\"End review\" style=\"width: 44px; height: 44px; border-radius: 22px; background: {{t.surf}}; display: flex; align-items: center; justify-content: center;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></a>\n    <div style=\"flex-grow: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 10px;\">\n      <sc-if value=\"{{showBar}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"flex-grow: 1; height: 6px; border-radius: 3px; background: {{t.surf}}; overflow: hidden;\"><div style=\"height: 6px; border-radius: 3px; background: {{t.text}}; width: {{progress}}; transition: width .3s cubic-bezier(.2,.8,.2,1);\"></div></div><span style=\"font-family: 'Geist Mono', ui-monospace, monospace; font-size: 13px; color: {{t.muted}};\">{{left}}</span></sc-if>\n      <sc-if value=\"{{showCounts}}\" hint-placeholder-val=\"{{ false }}\"><span role=\"status\" aria-label=\"{{countsLabel}}\" style=\"display: flex; align-items: center; gap: 12px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 15px; font-weight: 600;\"><span style=\"color: {{t.easy}}; text-decoration: {{cNew.u}}; text-decoration-thickness: 2px; text-underline-offset: 5px;\">{{cNew.n}}</span><span style=\"color: {{t.again}}; text-decoration: {{cLearn.u}}; text-decoration-thickness: 2px; text-underline-offset: 5px;\">{{cLearn.n}}</span><span style=\"color: {{t.good}}; text-decoration: {{cRev.u}}; text-decoration-thickness: 2px; text-underline-offset: 5px;\">{{cRev.n}}</span></span></sc-if>\n    </div>\n    <button type=\"button\" onClick=\"{{toggleSettings}}\" aria-label=\"Review settings\" title=\"Review settings\" aria-expanded=\"{{settingsExpanded}}\" style=\"width: 44px; height: 44px; flex-shrink: 0; border: 0; border-radius: 22px; background: {{settingsBtnBg}}; color: {{settingsBtnFg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7h9M17 7h3M4 17h3M11 17h9\"/><circle cx=\"15\" cy=\"7\" r=\"2\"/><circle cx=\"9\" cy=\"17\" r=\"2\"/></svg></button>\n  </div>\n  <div style=\"position: relative; flex-grow: 1; display: flex; flex-direction: column;\"><button type=\"button\" onClick=\"{{reveal}}\" aria-label=\"{{flipLabel}}\" data-key=\"Space\" class=\"{{cardIn}}\" style=\"width: 100%; height: auto; padding: 0; border: 0; background: transparent; perspective: 1600px; font: inherit; color: inherit; cursor: pointer; flex-grow: 1;\">\n  <div style=\"position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: {{flipTrans}}; transform: {{flipTransform}};\">\n    <div style=\"position: absolute; inset: 0; box-sizing: border-box; padding: 26px 22px; display: flex; flex-direction: column; text-align: left; background: {{t.card}}; border: 1px solid {{t.line}}; border-radius: {{radius}}; box-shadow: {{t.shadow}}; backface-visibility: hidden; -webkit-backface-visibility: hidden;\">\n  <div style=\"min-height: 21px;\"></div>\n  <div style=\"position: relative; display: flex; flex-direction: column; justify-content: center; flex-grow: 1;\"><sc-if value=\"{{card.isOcc}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;\">\n  <div style=\"flex: 0 1 auto; min-height: 0; width: 100%; aspect-ratio: {{card.occRatio}}; container-type: size; display: flex; align-items: center; justify-content: center;\">\n    <div role=\"img\" aria-label=\"{{card.occAlt}}\" style=\"position: relative; width: min(100cqw, calc(100cqh * {{card.occRatio}})); aspect-ratio: {{card.occRatio}}; visibility: {{card.occVis}};\">\n      <sc-if value=\"{{card.imageMock}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"100%\" height=\"100%\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"2\" style=\"display: block;\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/></svg></sc-if>\n      <sc-if value=\"{{card.imageUrl}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{card.imageUrl}}\" alt=\"\" draggable=\"false\" style=\"position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 14px;\"></sc-if>\n      <sc-for list=\"{{card.occ}}\" as=\"ob\" hint-placeholder-count=\"3\"><span class=\"sc-occ\" style=\"position: absolute; z-index: {{ob.z}}; left: {{ob.x}}; top: {{ob.y}}; width: {{ob.w}}; height: {{ob.h}}; box-sizing: border-box; border-radius: 6px; background: {{ob.bg}}; color: {{ob.fg}}; box-shadow: {{ob.ring}}; transition: {{ob.tr}}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; line-height: 1;\">{{ob.n}}</span></sc-for>\n    </div>\n  </div>\n  <div style=\"font-size: 18px; font-weight: 500; line-height: 1.3; text-align: center;\"><sc-for list=\"{{card.occAsk}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div>\n  <sc-if value=\"{{card.hasOccLabel}}\" hint-placeholder-val=\"{{ true }}\"><div class=\"{{card.occLabelCls}}\" style=\"visibility: {{card.occLabelVis}}; font-size: 24px; font-weight: 600; letter-spacing: -.02em; line-height: 1.2; text-align: center;\">{{card.occLabel}}</div></sc-if>\n</div></sc-if>\n<sc-if value=\"{{card.isBasic}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"font-size: 28px; font-weight: 500; line-height: 1.25; letter-spacing: -.02em;\"><sc-for list=\"{{card.frontLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div></sc-if>\n<sc-if value=\"{{card.isCloze}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size: 28px; font-weight: 500; line-height: 1.45; letter-spacing: -.02em;\"><sc-for list=\"{{card.lines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"3\"><sc-if value=\"{{rc.plain}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-if><sc-if value=\"{{rc.blank}}\" hint-placeholder-val=\"{{ false }}\"><span class=\"{{blank.cls}}\" style=\"display: inline-block; padding: 0 12px; border-radius: 999px; line-height: 1.3; background: {{blank.bg}}; color: {{blank.fg}}; transition: background-color .3s ease, color .3s ease;\"><sc-for list=\"{{rc.runs}}\" as=\"rr\" hint-placeholder-count=\"1\"><span style=\"{{rr.css}}\">{{rr.t}}</span></sc-for></span></sc-if></sc-for></div></sc-for></div></sc-if>\n<sc-if value=\"{{card.isImage}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; align-items: center; gap: 16px;\"><sc-if value=\"{{card.imageMock}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"260\" height=\"178\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"2\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/><path d=\"M138 60 L186 22\"/><circle cx=\"194\" cy=\"16\" r=\"12\" fill=\"{{t.inv}}\" stroke=\"none\"/><text x=\"194\" y=\"21\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"{{t.invText}}\" stroke=\"none\" font-family=\"Geist, sans-serif\">1</text></svg></sc-if><sc-if value=\"{{card.imageUrl}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{card.imageUrl}}\" alt=\"\" style=\"max-width: 100%; max-height: 200px; border-radius: 16px; object-fit: contain;\"></sc-if><div style=\"font-size: 20px; font-weight: 500;\"><sc-for list=\"{{card.frontLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div></div></sc-if>\n<sc-if value=\"{{card.isAudio}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; align-items: center; gap: 20px;\"><span role=\"button\" aria-label=\"{{snd.label}}\" onClick=\"{{snd.toggle}}\" class=\"sc-hold\" style=\"width: 76px; height: 76px; border-radius: 50%; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center;\"><sc-if value=\"{{snd.off}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"30\" height=\"30\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5v14l11-7z\" fill=\"currentColor\"/></svg></sc-if><sc-if value=\"{{snd.on}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"30\" height=\"30\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/><rect x=\"13.5\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></sc-if></span><div style=\"width: 272px; max-width: 100%; display: flex; flex-direction: column; gap: 8px;\"><div ref=\"{{snd.ref}}\" role=\"slider\" tabindex=\"0\" aria-label=\"Where to play from\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"{{snd.pct}}\" aria-valuetext=\"{{snd.valueText}}\" onClick=\"{{snd.hold}}\" onKeyDown=\"{{snd.keys}}\" class=\"sc-wave\" style=\"position: relative; width: 100%; height: 44px; color: {{t.text}}; cursor: pointer; touch-action: pan-y;\">\n  <div style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 3px; opacity: .22;\"><sc-for list=\"{{snd.bars}}\" as=\"b\" hint-placeholder-count=\"48\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n  <div data-anim=\"1\" style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 3px; clip-path: {{snd.fill}}; animation: {{snd.anim}};\"><sc-for list=\"{{snd.bars}}\" as=\"b\" hint-placeholder-count=\"48\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n</div><sc-if value=\"{{snd.hasTime}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"display: flex; justify-content: space-between; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{t.muted}};\"><span ref=\"{{snd.atRef}}\">{{snd.at}}</span><span>{{snd.total}}</span></div></sc-if></div><div style=\"font-size: 20px; font-weight: 500;\"><sc-for list=\"{{card.frontLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div></div></sc-if></div>\n  <div style=\"font-size: 14px; line-height: 1.5; color: {{t.muted}}; min-height: 21px;\"><sc-if value=\"{{clozeShown}}\" hint-placeholder-val=\"{{ false }}\"><span class=\"sc-fade-a\" style=\"display: block;\"><sc-for list=\"{{card.noteLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></span></sc-if></div>\n</div>\n    <div style=\"position: absolute; inset: 0; box-sizing: border-box; padding: 26px 22px; display: flex; flex-direction: column; text-align: left; background: {{t.card}}; border: 1px solid {{t.line}}; border-radius: {{radius}}; box-shadow: {{t.shadow}}; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);\">\n  <div style=\"min-height: 21px;\"></div>\n  <div style=\"position: relative; display: flex; flex-direction: column; justify-content: center; flex-grow: 1;\">\n<sc-if value=\"{{card.isBasic}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"font-size: 24px; font-weight: 500; line-height: 1.3; letter-spacing: -.015em;\"><sc-for list=\"{{card.backLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div></sc-if>\n<sc-if value=\"{{card.isImage}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; align-items: center; gap: 16px;\"><sc-if value=\"{{card.imageMock}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"260\" height=\"178\" viewBox=\"0 0 220 150\" fill=\"none\" stroke=\"{{t.text}}\" stroke-width=\"2\"><ellipse cx=\"104\" cy=\"80\" rx=\"94\" ry=\"62\"/><circle cx=\"116\" cy=\"74\" r=\"24\" fill=\"{{t.surf}}\"/><circle cx=\"120\" cy=\"70\" r=\"7\" fill=\"{{t.text}}\"/><ellipse cx=\"54\" cy=\"96\" rx=\"16\" ry=\"8\"/><ellipse cx=\"74\" cy=\"46\" rx=\"12\" ry=\"6\"/><ellipse cx=\"158\" cy=\"112\" rx=\"14\" ry=\"7\"/><path d=\"M138 60 L186 22\"/><circle cx=\"194\" cy=\"16\" r=\"12\" fill=\"{{t.inv}}\" stroke=\"none\"/><text x=\"194\" y=\"21\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"{{t.invText}}\" stroke=\"none\" font-family=\"Geist, sans-serif\">1</text></svg></sc-if><sc-if value=\"{{card.imageUrl}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{card.imageUrl}}\" alt=\"\" style=\"max-width: 100%; max-height: 200px; border-radius: 16px; object-fit: contain;\"></sc-if><div style=\"font-size: 26px; font-weight: 600; letter-spacing: -.02em;\"><sc-for list=\"{{card.labelLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div></div></sc-if>\n<sc-if value=\"{{card.isAudio}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; flex-direction: column; align-items: center; gap: 8px;\"><div style=\"font-size: 52px; font-weight: 600; letter-spacing: -.02em;\"><sc-for list=\"{{card.bigLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div><div style=\"font-size: 18px; color: {{t.muted}};\"><sc-for list=\"{{card.subLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div>\n  <div onClick=\"{{sndBack.hold}}\" class=\"sc-hold\" style=\"margin-top: 14px; width: 248px; max-width: 100%; box-sizing: border-box; height: 48px; padding: 0 16px 0 6px; border-radius: 999px; background: {{t.surf}}; display: flex; align-items: center; gap: 12px; cursor: default;\"><span role=\"button\" aria-label=\"{{sndBack.label}}\" onClick=\"{{sndBack.toggle}}\" style=\"width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: {{t.inv}}; color: {{t.invText}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><sc-if value=\"{{sndBack.off}}\" hint-placeholder-val=\"{{ true }}\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5v14l11-7z\" fill=\"currentColor\"/></svg></sc-if><sc-if value=\"{{sndBack.on}}\" hint-placeholder-val=\"{{ false }}\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/><rect x=\"13.5\" y=\"5\" width=\"3.5\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></sc-if></span><div ref=\"{{sndBack.ref}}\" role=\"slider\" tabindex=\"0\" aria-label=\"Where to play from\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"{{sndBack.pct}}\" aria-valuetext=\"{{sndBack.valueText}}\" onClick=\"{{sndBack.hold}}\" onKeyDown=\"{{sndBack.keys}}\" class=\"sc-wave\" style=\"position: relative; flex-grow: 1; min-width: 0; height: 24px; color: {{t.text}}; cursor: pointer; touch-action: pan-y;\">\n  <div style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; opacity: .22;\"><sc-for list=\"{{sndBack.bars}}\" as=\"b\" hint-placeholder-count=\"36\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n  <div data-anim=\"1\" style=\"position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; clip-path: {{sndBack.fill}}; animation: {{sndBack.anim}};\"><sc-for list=\"{{sndBack.bars}}\" as=\"b\" hint-placeholder-count=\"36\"><span style=\"flex: 1 1 0; min-width: 1px; height: {{b.h}}; border-radius: 2px; background: currentColor;\"></span></sc-for></div>\n</div><sc-if value=\"{{sndBack.hasTime}}\" hint-placeholder-val=\"{{ true }}\"><span ref=\"{{sndBack.timeRef}}\" style=\"flex-shrink: 0; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: {{t.muted}};\">{{sndBack.time}}</span></sc-if></div></div></sc-if></div>\n  <div style=\"font-size: 14px; line-height: 1.5; color: {{t.muted}}; min-height: 21px;\"><sc-for list=\"{{card.noteLines}}\" as=\"rl\" hint-placeholder-count=\"1\"><div style=\"{{rl.css}}\"><sc-for list=\"{{rl.items}}\" as=\"rc\" hint-placeholder-count=\"1\"><span style=\"{{rc.css}}\">{{rc.t}}</span></sc-for></div></sc-for></div>\n</div>\n  </div>\n</button><sc-if value=\"{{ex.show}}\" hint-placeholder-val=\"{{ false }}\">\n  <sc-if value=\"{{ex.closed}}\" hint-placeholder-val=\"{{ true }}\"><button type=\"button\" onClick=\"{{ex.ask}}\" class=\"sc-press\" style=\"position: absolute; top: 12px; right: 12px; z-index: 3; height: 34px; padding: 0 14px 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z\"/><path d=\"M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z\"/></svg>{{ex.label}}</button></sc-if>\n  <sc-if value=\"{{ex.open}}\" hint-placeholder-val=\"{{ false }}\"><div role=\"region\" aria-label=\"Explanation\" class=\"sc-quiz-in\" style=\"position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 3; max-height: 72%; overflow-y: auto; box-sizing: border-box; padding: 14px 16px; border-radius: 20px; background: {{t.bg}}; box-shadow: 0 18px 44px -14px rgba(0,0,0,.4), 0 0 0 1px {{t.line}}; display: flex; flex-direction: column; gap: 8px; text-align: left; animation: scQuizIn .25s cubic-bezier(.2,.8,.2,1) both;\">\n    <div style=\"display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: {{t.muted}};\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z\"/><path d=\"M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z\"/></svg><span style=\"flex-grow: 1;\">Explained by AI</span><button type=\"button\" onClick=\"{{ex.close}}\" aria-label=\"Close the explanation\" style=\"width: 28px; height: 28px; border: 0; border-radius: 14px; background: {{t.surf}}; color: {{t.text}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button></div>\n    <sc-if value=\"{{ex.busy}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 15px; color: {{t.muted}};\">Thinking…</span></sc-if>\n    <sc-if value=\"{{ex.hasText}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"font-size: 15px; line-height: 1.5;\">{{ex.text}}</span></sc-if>\n    <sc-if value=\"{{ex.hasError}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 14px; line-height: 1.4; color: {{t.again}};\">{{ex.error}}</span><sc-if value=\"{{ex.goPro}}\" hint-placeholder-val=\"{{ false }}\"><a href=\"{{ex.proHref}}\" style=\"align-self: flex-start; height: 34px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font-size: 13px; font-weight: 600;\">Go Pro</a></sc-if></sc-if>\n    <sc-if value=\"{{ex.hasNote}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size: 12px; color: {{t.muted}};\">{{ex.note}}</span></sc-if>\n  </div></sc-if>\n</sc-if></div>\n  <div style=\"height: 76px; display: flex;\">\n    <sc-if value=\"{{showBinary}}\" hint-placeholder-val=\"{{ false }}\">\n      <div style=\"flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 44px;\">\n    <button type=\"button\" onClick=\"{{missed.pick}}\" aria-label=\"{{missed.label}}\" title=\"{{missed.title}}\" data-key=\"1\" style=\"width: 68px; height: 68px; flex-shrink: 0; border: 0; border-radius: 50%; background: {{t.again}}; color: {{t.bg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button>\n    <button type=\"button\" onClick=\"{{knew.pick}}\" aria-label=\"{{knew.label}}\" title=\"{{knew.title}}\" data-key=\"2\" style=\"width: 68px; height: 68px; flex-shrink: 0; border: 0; border-radius: 50%; background: {{t.good}}; color: {{t.bg}}; display: flex; align-items: center; justify-content: center; cursor: pointer;\"><svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg></button>\n      </div>\n    </sc-if>\n    <sc-if value=\"{{showPiles}}\" hint-placeholder-val=\"{{ false }}\">\n      <div style=\"flex-grow: 1; display: flex; gap: 6px;\">\n    <sc-for list=\"{{piles}}\" as=\"p\" hint-placeholder-count=\"3\">\n      <button type=\"button\" onClick=\"{{p.pick}}\" aria-label=\"Put in {{p.name}}\" data-key=\"{{p.key}}\" style=\"flex: 1 1 0; min-width: 0; position: relative; padding: 0; border: 0; background: transparent; font: inherit; color: inherit; cursor: pointer;\">\n        <span style=\"position: absolute; inset: 0; box-sizing: border-box; border-radius: 20px; background: {{t.surf}}; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; padding: 0 12px;\">\n          <span style=\"font-size: 22px; font-weight: 600; letter-spacing: -.03em; line-height: 1;\">{{p.count}}</span>\n          <span style=\"min-width: 0; max-width: 100%; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{p.name}}</span>\n        </span>\n      </button>\n    </sc-for>\n    <sc-if value=\"{{canAddPile}}\" hint-placeholder-val=\"{{ true }}\">\n      <button type=\"button\" onClick=\"{{openPile}}\" aria-label=\"New pile\" aria-haspopup=\"dialog\" style=\"width: 52px; flex-shrink: 0; box-sizing: border-box; border: 1.5px dashed {{t.muted}}; border-radius: 20px; background: transparent; color: {{t.muted}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg></button>\n    </sc-if>\n      </div>\n    </sc-if>\n    <sc-if value=\"{{showFour}}\" hint-placeholder-val=\"{{ false }}\">\n      <div style=\"flex-grow: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px;\">\n        <sc-for list=\"{{grades}}\" as=\"g\" hint-placeholder-count=\"4\">\n          <button type=\"button\" onClick=\"{{g.pick}}\" style=\"display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; cursor: pointer;\"><span style=\"display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 600;\"><span style=\"width: 7px; height: 7px; border-radius: 4px; background: {{g.color}};\"></span>{{g.label}}</span><span style=\"font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; color: {{t.muted}};\">{{g.interval}}</span></button>\n        </sc-for>\n      </div>\n    </sc-if>\n  </div>\n  <sc-if value=\"{{settingsOpen}}\" hint-placeholder-val=\"{{ false }}\">\n    <div style=\"position: absolute; inset: 0; background: {{t.dim}};\"></div>\n    <div role=\"dialog\" aria-label=\"Review settings\" style=\"position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 10px 20px 34px; border-radius: 32px 32px 0 0; background: {{t.bg}}; display: flex; flex-direction: column; gap: 18px;\">\n      <div style=\"align-self: center; width: 40px; height: 5px; border-radius: 3px; background: {{t.surf2}};\"></div>\n      <div style=\"display: flex; align-items: center; justify-content: space-between;\"><span style=\"font-size: 18px; font-weight: 600;\">Review settings</span><button type=\"button\" onClick=\"{{toggleSettings}}\" style=\"height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Done</button></div>\n      <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Grade with</span><div role=\"group\" aria-label=\"Grading style\" style=\"display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\">\n  <sc-for list=\"{{modes}}\" as=\"m\" hint-placeholder-count=\"3\">\n    <button type=\"button\" onClick=\"{{m.pick}}\" aria-pressed=\"{{m.pressed}}\" title=\"{{m.long}}\" style=\"height: 34px; padding: 0 8px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};\">{{m.label}}</button>\n  </sc-for>\n</div></div>\n      <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">Progress</span><div role=\"group\" aria-label=\"Progress style\" style=\"display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: {{t.surf}};\">\n  <sc-for list=\"{{progs}}\" as=\"m\" hint-placeholder-count=\"3\">\n    <button type=\"button\" onClick=\"{{m.pick}}\" aria-pressed=\"{{m.pressed}}\" style=\"height: 34px; padding: 0 8px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; background: {{m.bg}}; color: {{m.fg}}; box-shadow: {{m.sh}};\">{{m.label}}</button>\n  </sc-for>\n</div><span style=\"font-size: 12px; line-height: 1.4; color: {{t.muted}};\">{{progHint}}</span></div>\n      <div style=\"display: flex; flex-direction: column; gap: 8px;\"><span style=\"font-size: 13px; font-weight: 600;\">{{bgTitle}}</span><span style=\"margin-top: -4px; font-size: 12px; color: {{t.muted}};\">Behind Learn mode, flashcards, and Live</span>\n          <div role=\"radiogroup\" aria-label=\"Background\" style=\"display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px;\"><sc-for list=\"{{bgOptions}}\" as=\"o\" hint-placeholder-count=\"5\"><button type=\"button\" role=\"radio\" aria-checked=\"{{o.pressed}}\" onClick=\"{{o.pick}}\" style=\"min-width: 0; padding: 0; border: 0; background: transparent; color: {{t.text}}; display: flex; flex-direction: column; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;\"><span style=\"position: relative; height: 48px; border-radius: 14px; overflow: hidden; box-shadow: {{o.ring}};\">\n            <sc-if value=\"{{o.isDeck}}\" hint-placeholder-val=\"{{ true }}\"><span style=\"position: absolute; inset: 0; background: {{bgTile.base}};\"></span><span style=\"position: absolute; inset: 0; background: {{bgTile.veil}};\"></span></sc-if>\n            <sc-if value=\"{{o.isPlain}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"position: absolute; inset: 0; background: {{t.bg}};\"></span></sc-if>\n            <sc-if value=\"{{o.isSky}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"position: absolute; inset: 0; background: linear-gradient(180deg, #86BDF3 0%, #C9E2FB 45%, #EDF5FE 100%);\"></span></sc-if>\n            <sc-if value=\"{{o.isSunset}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"position: absolute; inset: 0; background: radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.22), rgba(238,142,98,0) 70%), linear-gradient(180deg, #C3D3E3 0%, #D3DBE6 30%, #E6DDE4 52%, #F2DCD8 72%, #F5CFC2 100%);\"></span></sc-if>\n            <sc-if value=\"{{o.isPhoto}}\" hint-placeholder-val=\"{{ false }}\"><span style=\"position: absolute; inset: 0; background: {{t.surf}}; color: {{t.muted}}; display: flex; align-items: center; justify-content: center;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg></span><sc-if value=\"{{hasBgPhoto}}\" hint-placeholder-val=\"{{ false }}\"><img src=\"{{bgPhoto}}\" alt=\"\" style=\"position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;\"></sc-if></sc-if>\n          </span><span style=\"white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">{{o.label}}</span></button></sc-for></div>\n          <sc-if value=\"{{bgIsPhoto}}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display: flex; gap: 6px;\"><button type=\"button\" onClick=\"{{uploadBg}}\" style=\"height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/></svg>Change photo</button></div></sc-if>\n        </div>\n    </div>\n  </sc-if>\n  <sc-if value=\"{{newPileOpen}}\" hint-placeholder-val=\"{{ false }}\">\n    <div style=\"position: absolute; inset: 0; background: {{t.dim}};\"></div>\n    <div role=\"dialog\" aria-label=\"New pile\" style=\"position: absolute; left: 16px; right: 16px; bottom: 300px; box-sizing: border-box; padding: 20px; border-radius: 28px; background: {{t.bg}}; display: flex; flex-direction: column; gap: 14px;\">\n      <span style=\"font-size: 16px; font-weight: 600;\">New pile</span>\n      <input type=\"text\" value=\"{{pileName}}\" onChange=\"{{setPileName}}\" placeholder=\"Name it, like “Tricky ones”\" aria-label=\"Pile name\" style=\"height: 46px; box-sizing: border-box; padding: 0 16px; border: 0; outline: 0; border-radius: 16px; background: {{t.surf}}; color: {{t.text}}; box-shadow: inset 0 0 0 2px {{t.text}}; font: inherit; font-size: 15px;\">\n      <div style=\"display: flex; gap: 8px;\"><button type=\"button\" onClick=\"{{cancelPile}}\" style=\"flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Cancel</button><button type=\"button\" onClick=\"{{savePile}}\" style=\"flex-grow: 1; height: 44px; border: 0; border-radius: 999px; background: {{t.inv}}; color: {{t.invText}}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;\">Add pile</button></div>\n    </div>\n    <sc-if value=\"{{drawKb}}\" hint-placeholder-val=\"{{ true }}\"><div style=\"position: absolute; left: 0; right: 0; bottom: 0; color: {{kb.ink}}; font-family: -apple-system, system-ui, sans-serif;\"><div aria-hidden=\"true\" style=\"box-sizing: border-box; padding: 10px 5px 0; border-radius: 26px 26px 44px 44px; background: {{kb.panel}}; display: flex; flex-direction: column; gap: 12px;\">\n    <div style=\"display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Q</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">W</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">E</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">R</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">T</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Y</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">U</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">I</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">O</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">P</span></div>\n    <div style=\"display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 6px; padding: 0 18px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">A</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">S</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">D</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">F</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">G</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">H</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">J</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">K</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">L</span></div>\n    <div style=\"display: grid; grid-template-columns: 1.45fr .1fr repeat(7, minmax(0, 1fr)) .1fr 1.45fr; gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 4l8 8h-4.5v7h-7v-7H4z\" fill=\"currentColor\"/></svg></span><span></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">Z</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">X</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">C</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">V</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">B</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">N</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \">M</span><span></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z\"/><path d=\"M12 9l6 6M18 9l-6 6\"/></svg></span></div>\n    <div style=\"display: grid; grid-template-columns: 1.15fr 1.15fr 4.7fr 2.1fr; gap: 6px;\"><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; font-size: 17px;\">123</span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"23\" height=\"23\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.2a4.4 4.4 0 0 0 7 0\"/><circle cx=\"9\" cy=\"9.8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"9.8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"></span><span style=\"height: 42px; border-radius: 9px; background: {{kb.key}}; box-shadow: {{kb.edge}}; display: flex; align-items: center; justify-content: center; font-size: 22px; \"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6v6a3 3 0 0 1-3 3H5\"/><path d=\"M9 11l-4 4 4 4\"/></svg></span></div>\n    <div style=\"height: 58px; box-sizing: border-box; padding: 6px 22px 0; display: flex; justify-content: space-between;\"><svg width=\"27\" height=\"27\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9\"/></svg><svg width=\"27\" height=\"27\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/></svg></div>\n  </div></div></sc-if>\n  </sc-if>\n</div>",
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
  const X = {"DECKS":[{"id":"cell","name":"Cell Biology","total":"412","due":28,"overdue":12,"soon":0,"fresh":10,"ret":91,"ai":38},{"id":"jlpt","name":"Japanese · JLPT N4","total":"1,280","due":19,"overdue":5,"soon":0,"fresh":20,"ret":87,"ai":0},{"id":"orgo","name":"Organic Chemistry","total":"236","due":11,"overdue":0,"soon":0,"fresh":5,"ret":84,"ai":0},{"id":"hist","name":"US History","total":"158","due":6,"overdue":0,"soon":0,"fresh":0,"ret":93,"ai":0},{"id":"sys","name":"System Design","total":"74","due":0,"overdue":0,"soon":1,"fresh":8,"ret":89,"ai":0},{"id":"span","name":"Spanish Verbs","total":"310","due":0,"overdue":0,"soon":3,"fresh":0,"ret":95,"ai":0}],"TAGS":{"cell":["Biology","MCAT","Year 1","BIO 201","Fall 2026","Midterm","Final exam","Pre-med","Lab","Cells","Must know"],"jlpt":["Languages"],"orgo":["Chemistry","MCAT","Year 1","Pre-med","Fall 2026"],"hist":["History"],"sys":["Computer science"],"span":["Languages"]},"CARDS":[{"id":"k1","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","kind":"Basic","icon":"text","next":"Tomorrow","ai":"","tags":["Energy","Exam 1","Mitochondria","Must know"]},{"id":"k2","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","kind":"Fill in the blank","icon":"blank","next":"Due now","ai":"Claude","tags":["Organelles","Exam 1"]},{"id":"k3","front":"Name structure 1 on the diagram.","back":"Nucleus","kind":"Image","icon":"image","next":"In 3 days","ai":"Claude","tags":["Organelles","Diagrams"]},{"id":"k4","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","kind":"Basic","icon":"text","next":"In 6 days","ai":"","tags":["Organelles"]},{"id":"k5","front":"Say it: ribosome","back":"RY-buh-sohm","kind":"Audio","icon":"audio","next":"Due now","ai":"ChatGPT","tags":["Pronunciation"]},{"id":"k6","front":"What is the role of the ribosome?","back":"Translates mRNA into protein","kind":"Basic","icon":"text","next":"In 12 days","ai":"","tags":["Proteins","Exam 2"]}],"FOLDERS":[{"id":"f1","name":"Languages","decks":["jlpt","span"]},{"id":"f2","name":"Year 1","decks":["orgo","hist"]}],"ALL_CARDS":[["cell","What does the electron transport chain pump across the inner membrane?","Protons (H⁺)","text","Tomorrow","easy",["Energy","Exam 1","Mitochondria","Must know"]],["cell","The ____ is the powerhouse of the cell.","mitochondrion","blank","Due now","hard",["Organelles","Exam 1"]],["jlpt","電車","train (でんしゃ)","text","In 2 days","medium",["Vocabulary"]],["orgo","C₆H₆","Benzene","text","In 5 days","easy",["Aromatics"]],["cell","Name structure 1 on the diagram.","Nucleus","image","In 3 days","medium",["Organelles","Diagrams"]],["hist","Year the Declaration of Independence was signed?","1776","text","In 9 days","easy",["Revolution"]],["span","Yo ____ dos hermanos.","tengo","blank","Due now","hard",["Irregular"]],["sys","What does a load balancer do?","Spreads requests across servers","text","New","new",["Basics"]],["cell","Which organelle packages proteins for secretion?","Golgi apparatus","text","In 6 days","medium",["Organelles"]],["jlpt","学校","school (がっこう)","text","New","new",["Vocabulary"]],["orgo","Markovnikov’s rule says the H goes to…","The carbon with more H’s","text","Due now","hard",["Reactions","Exam 2"]],["cell","Say it: ribosome","RY-buh-sohm","audio","Due now","new",["Pronunciation"]]],"REVIEW":[{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), from the matrix into the intermembrane space.","note":"That gradient powers ATP synthase."},{"kind":"cloze","before":"The","after":"is the powerhouse of the cell.","back":"mitochondrion","note":"It makes most of the cell’s ATP."},{"kind":"image","front":"","back":"Nucleus","note":"Holds the cell’s DNA.","image":"mock","boxes":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}],"box":"b1","occ":"all"},{"kind":"audio","front":"What word do you hear?","back":"train","note":"電 electricity + 車 vehicle.","audio":"mock","backBig":"電車","backSub":"でんしゃ · train"}],"DRAFTS":{"Basic":{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), into the intermembrane space."},"Blank":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].","note":"It makes most of the cell’s ATP."},"Image":{"kind":"image","front":"Name the part of the cell.","back":"","image":"mock","boxes":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}],"occ":"one"},"Audio":{"kind":"audio","back":"電車 (でんしゃ): train","audio":"mock"}},"DUE_7":{"vals":[32,18,24,12,30,8,16],"labels":["Wed","Thu","Fri","Sat","Sun","Mon","Tue"],"tops":null,"names":["tomorrow","Thursday","Friday","Saturday","Sunday","Monday","Tuesday"]},"DUE_14":{"vals":[32,18,24,12,30,8,16,22,14,26,10,20,6,12],"labels":["23","24","25","26","27","28","29","30","1","2","3","4","5","6"],"tops":["W","T","F","S","S","M","T","W","T","F","S","S","M","T"],"names":["tomorrow","Thu 24","Fri 25","Sat 26","Sun 27","Mon 28","Tue 29","Wed 30","Thu, Oct 1","Fri, Oct 2","Sat, Oct 3","Sun, Oct 4","Mon, Oct 5","Tue, Oct 6"]},"BOXES":[{"id":"b1","x":0.409,"y":0.32,"w":0.236,"h":0.347,"label":"Nucleus"},{"id":"b2","x":0.164,"y":0.573,"w":0.164,"h":0.133,"label":"Mitochondrion"},{"id":"b3","x":0.645,"y":0.687,"w":0.145,"h":0.12,"label":"Vacuole"}]}, WAVE = [0.05,0.05,0.05,0.07,0.08,0.11,0.1,0.13,0.16,0.22,0.22,0.21,0.3,0.4,0.38,0.34,0.45,0.59,0.55,0.51,0.57,0.74,0.67,0.7,0.65,0.79,0.7,0.87,0.81,0.74,0.7,0.92,0.85,0.64,0.66,0.82,0.76,0.54,0.52,0.62,0.56,0.38,0.34,0.39,0.35,0.26,0.24,0.21,0.19,0.16,0.15,0.14,0.18,0.25,0.32,0.29,0.29,0.43,0.53,0.47,0.43,0.58,0.7,0.59,0.56,0.62,0.73,0.58,0.64,0.53,0.62,0.5,0.6,0.49,0.43,0.4,0.46,0.37,0.26,0.26,0.28,0.22,0.14,0.13,0.14,0.1,0.07,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05];
  const caught = !!p.caughtUp;
  const byName = { 'Four buttons': 'four', 'Check or X': 'binary', 'Piles': 'piles' };
  const ed = m.deck || {};
  const deck = () => ({ id: 'cell', name: ed.name ?? 'Cell Biology', tags: ed.tags || X.TAGS.cell, seed: 'Cell Biology', cover: { style: 'mix', round: 0, image: null, ...(ed.cover || {}) },
    paused: !!ed.paused, grading: ed.grading || byName[p.grading] || 'four', fsrs: ed.fsrs ?? (p.fsrs !== false), goal: ed.goal ?? 90, gapIdx: ed.gapIdx ?? 3, steps: ed.steps || ['1m', '10m'], perDay: ed.perDay ?? 20,
    total: 412, totalLabel: '412', due: 28, fresh: 10, ret: 91, aiCount: 38, forecast: [28, 14, 20, 9, 24, 6, 12], piles: m.piles || [{ name: 'Know it', n: 18 }, { name: 'Almost', n: 6 }, { name: 'No clue', n: 3 }],
    href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html', newCardHref: 'WebEditor.dc.html', folder: null, bg: ed.bg || { kind: 'deck', image: null } });
  const idx = m.idx ?? (({ 'Fill in the blank': 1, Image: 2, Audio: 3 })[p.card] || 0);
  const st = { name: 'Alex Kim', sub: 'Signed in with Google · alex@gmail.com', signedIn: true, google: true, photo: p.photo === 'Google photo' ? 'google' : 'color', color: 0,
    look: 'system', darkMode: p.dim ? 'gray' : 'black', grads: 'mix', prog: ({ Bar: 'bar', Counts: 'counts', None: 'none' })[p.progress] || 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, check: true, reminder: '9:00 AM', ...(m.settings || {}) };
  const perms = { read: true, text: true, media: true, edit: true, check: true, del: false, ...(m.perms || {}) };
  const noop = () => {};
  // Folders you make or change here stay on this board.
  const folders = () => m.folders || X.FOLDERS;
  const folderOf = id => (m.moved && id in m.moved ? m.moved[id] : (folders().find(f => (f.decks || []).includes(id)) || {}).id || null);
  // Decks and cards you drag here keep their new order (and cards their new deck) on this board.
  const order = m.deckOrder || X.DECKS.map(d => d.id), inOrder = () => order.map(id => X.DECKS.find(d => d.id === id));
  const before = (list, id, b) => { const l = list.filter(x => x !== id), at = b ? l.indexOf(b) : -1; l.splice(at < 0 ? l.length : at, 0, id); return l; };
  const cardDeck = m.cardDeck || {}, cardOrder = m.cardOrder || X.CARDS.map(c => c.id);
  return {
    mock: true,
    chrome: () => ({ nav: { today: caught ? '' : '64' }, me: { bg: 'linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', initial: 'A' } }),
    settings: () => st,
    tags: () => [],
    decks: () => inOrder().map(d => ({ d, i: X.DECKS.indexOf(d) })).map(({ d, i }) => ({ ...d, name: d.name, tags: X.TAGS[d.id], seed: d.name, style: null, image: null, totalLabel: d.total, paused: false, folder: folderOf(d.id), bg: { kind: 'deck', image: null },
      due: caught ? 0 : d.due, overdue: caught ? 0 : d.overdue, soon: caught ? (d.soon || [1, 1, 2, 3, 1, 3][i]) : d.soon,
      href: 'WebDeck.dc.html', studyHref: 'WebReview.dc.html', settingsHref: 'WebDeckSettings.dc.html' })),
    deck,
    folders: () => folders().map(f => { const ds = inOrder().filter(d => folderOf(d.id) === f.id);
      return { id: f.id, name: f.name, n: ds.length, due: caught ? 0 : ds.reduce((n, d) => n + d.due, 0), decks: ds.map(d => ({ ...d, seed: d.name, style: null, round: 0 })), href: 'WebLibraryFolder.dc.html' }; }),
    allCards: () => X.ALL_CARDS.map(([was, front, back, icon, next, level, tags], i) => { const deckId = cardDeck['a' + i] || was, d = X.DECKS.find(x => x.id === deckId);
      return { id: 'a' + i, kind: '', icon, front, back, tags, next, level, deckId, deckName: d.name, seed: d.name, style: null, round: 0, folder: folderOf(deckId), href: 'WebEditor.dc.html' }; }),
    searchDecks: q => X.DECKS.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
    cards: () => cardOrder.map(id => X.CARDS.find(r => r.id === id)).filter(r => !cardDeck[r.id] || cardDeck[r.id] === 'cell').map(r => ({ ...r, href: 'WebEditor.dc.html' })),
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
    // Sound: the sample clip, a little way in (paused, or playing on the boards that say so). Play and the waveform work.
    sound: c => ({ key: c && (c.audio || c.speak) ? 'mock' : '', peaks: WAVE, dur: 2.6, speech: !!c && !c.audio, on: m.playing ?? !!p.playing, frac: m.frac ?? .42, busy: false }),
    // The Recording boards: a clip being recorded, 3 seconds in.
    recording: () => ((p.recording && !m.recStop) || m.rec ? { saving: false, levels: Array.from({ length: 70 }, (_, i) => WAVE[(i * 3 + 30) % 96]), level: .55, secs: 3.4 } : null),
    href: kind => ({ decks: 'WebDecks.dc.html', newDeck: 'WebNewDeck.dc.html', import: 'WebImport.dc.html', connect: 'WebConnect.dc.html', today: 'Main.dc.html' })[kind] || 'Main.dc.html',
    act: {
      updateDeck: (id, patch) => set({ deck: { ...ed, ...patch, cover: { ...(ed.cover || {}), ...(patch.cover || {}) } } }),
      grade: () => set({ idx: idx + 1 }),
      pile: (id, name) => set({ idx: idx + 1, piles: deck().piles.map(q => (q.name === name ? { ...q, n: q.n + 1 } : q)) }),
      undo: () => idx > 0 && set({ idx: idx - 1 }),
      setSettings: patch => set({ settings: { ...(m.settings || {}), ...patch } }),
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

constructor(props) { super(props); this.state = { revealed: !!props.startRevealed, settings: null, pileDraft: props.newPileOpen ? 'Tricky ones' : null, exOpen: !!props.explainOpen, exFor: props.explainOpen ? 'r0' : null }; }
renderVals() {
  const t = this.theme(!!this.props.dark, !!this.props.dim);const db = this.props.db || this.mock(); const chrome = db.chrome();
  const kb = this.props.dark
    ? { panel: '#2A2A2D', key: '#48484C', ink: '#FFFFFF', edge: '0 1px 0 rgba(0,0,0,.35)', bar: '#2C2C2F', barInk: '#EBEBF0', barLine: 'rgba(255,255,255,.14)', on: '#45454A', barShadow: '0 8px 28px rgba(0,0,0,.5), 0 0 0 .5px rgba(255,255,255,.1)' }
    : { panel: '#E3E4E9', key: '#FFFFFF', ink: '#000000', edge: '0 1px 0 rgba(0,0,0,.08)', bar: '#FFFFFF', barInk: '#3C3C43', barLine: 'rgba(60,60,67,.16)', on: '#ECECF1', barShadow: '0 8px 28px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.06)' };
  const R = this.rich(), ro = { t, dark: !!this.props.dark };
  const occView = (boxes, ask, mode, shown, c) => (boxes || []).map((b, i) => {
    const asked = i === ask, hide = asked || mode === 'all', pct = v => +(v * 100).toFixed(3) + '%';
    return { n: hide ? String(i + 1) : '', x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h), z: asked ? '2' : '1',
      bg: asked ? (shown ? 'transparent' : c.ask) : hide ? c.cover : 'transparent', fg: asked ? (shown ? 'transparent' : c.askText) : c.coverText,
      ring: asked ? 'inset 0 0 0 2.5px ' + c.ask + ', 0 0 0 2px ' + c.ring : hide ? '0 0 0 2px ' + c.ring : 'none',
      // Only showing the answer fades; covering a new card's box is instant, so its answer never shows through.
      tr: asked && shown ? 'background-color .45s cubic-bezier(.2,.8,.2,1), color .3s ease' : 'none' };
  });
  // A picture's shape (width / height), learned once it loads, so its boxes sit right on it.
  const ratioOf = url => {
    const RT = Component._ratio || (Component._ratio = {});
    if (url === 'mock') return 220 / 150;
    if (!(url in RT)) { RT[url] = 0; const im = new Image(); im.onload = () => { RT[url] = im.naturalWidth / im.naturalHeight || 4 / 3; this.forceUpdate(); }; im.onerror = () => { RT[url] = 4 / 3; this.forceUpdate(); }; im.src = url; }
    return RT[url];
  };
  const cardView = (c, rev) => {
    const show = md => R.view(md || '', ro);
    const text = c.text != null ? c.text : (c.before || '') + ' [[' + (c.back || '') + ']] ' + (c.after || '');
    // A picture with boxes asks one box (c.box); a picture without is a plain image card, as before.
    const oi = c.kind === 'image' && c.image && Array.isArray(c.boxes) ? c.boxes.findIndex(b => b.id === c.box) : -1, ob = oi < 0 ? null : c.boxes[oi], ratio = ob ? ratioOf(c.image) : 0;
    return { ...c, isBasic: c.kind === 'basic', isCloze: c.kind === 'cloze', isImage: c.kind === 'image' && !ob, isOcc: !!ob, isAudio: c.kind === 'audio',
      occ: ob ? occView(c.boxes, oi, c.occ, rev, { ask: t.inv, askText: t.invText, cover: t.surf2, coverText: t.muted, ring: t.bg }) : [],
      occAsk: ob ? show(R.plain(c.front || '').trim() ? c.front : 'What’s under box ' + (oi + 1) + '?') : [], occRatio: String(+(ratio || 4 / 3).toFixed(4)), occVis: ratio ? 'visible' : 'hidden',
      occLabel: ob ? ob.label || '' : '', hasOccLabel: !!(ob && ob.label), occLabelCls: rev ? 'sc-fade-a' : '', occLabelVis: rev ? 'visible' : 'hidden',
      occAlt: ob ? 'The picture, with box ' + (oi + 1) + (rev ? ' showing' : ' hidden') : '',
      lines: c.kind === 'cloze' ? R.view(text, { ...ro, cloze: true, ask: c.cloze == null ? -1 : c.cloze, hide: !rev }) : [],
      frontLines: show(c.front), backLines: show(c.back), noteLines: show(c.note),
      imageMock: c.image === 'mock', imageUrl: c.image && c.image !== 'mock' ? c.image : '',
      labelLines: show(c.backLabel || c.back), bigLines: show(c.backBig || c.back), subLines: show(c.backSub != null ? c.backSub : c.note) };
  };
  const studyBg = (dk, dark, dim) => {
    const b = (dk && dk.bg) || {}, img = b.image || (dk && dk.image) || '';
    const kind = ['deck', 'plain', 'sky', 'sunset', 'photo'].includes(b.kind) && !(b.kind === 'photo' && !img) ? b.kind : 'deck';
    const mesh = this.gen(((dk && dk.seed) || 'Lucida') + (dk && dk.round ? ' #' + dk.round : ''), (dk && dk.style) || 'mix');
    // On the canvas a photo is a placeholder, so it shows the deck's colors at full strength instead.
    const photo = kind === 'photo' && img !== 'mock' ? img : '', sample = kind === 'photo' && !photo, faint = kind === 'deck', gray = dark && dim;
    // In light mode the deck's colors are one pale hue (the owner: "make the background for flashcards and learn be
    // monochrome and lighter/fainter on light mode"): every fold of its gradient in the deck's main color (the middle of
    // the gradient), light and soft, a pastel wash under the words. Dark and gray keep theirs.
    const mono = faint && !dark, hue = parseInt(mesh.base.split('hsl(')[2]) || 0;
    const pale = c => c.replace(/hsl\((\d+) (\d+)% (\d+)%\)/g, (_, h, s, l) => 'hsl(' + hue + ' 50% ' + Math.round(84 + l * .12) + '%)');
    return { isDeck: faint || sample, isPhoto: !!photo, isSky: kind === 'sky', isSunset: kind === 'sunset', photo,
      mesh: mono ? Object.fromEntries(Object.entries(mesh).map(([k, v]) => [k, typeof v === 'string' ? pale(v) : v && v.c ? { ...v, c: pale(v.c) } : v])) : mesh,
      filter: sample || !dark ? 'none' : gray ? 'saturate(.16) brightness(.34)' : 'saturate(.16) brightness(.42)',
      veil: faint ? (gray ? 'rgba(30,30,32,.45)' : dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.35)') : photo || sample ? (gray ? 'rgba(30,30,32,.55)' : dark ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.38)') : 'rgba(0,0,0,0)',
      skyTop: gray ? '#1B2A48' : dark ? '#081733' : '#86BDF3', skyMid: gray ? '#1F2B45' : dark ? '#0D2148' : '#C9E2FB', skyLow: gray ? '#212637' : dark ? '#0A1530' : '#EDF5FE',
      sunset: gray ? "radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.18), rgba(238,142,98,0) 70%), linear-gradient(180deg, #1F2638 0%, #272C40 35%, #332C3F 65%, #3E2E37 100%)" : dark ? "radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.16), rgba(238,142,98,0) 70%), linear-gradient(180deg, #0C1426 0%, #151B31 35%, #231C2E 65%, #2E1D25 100%)" : "radial-gradient(90% 60% at 88% 100%, rgba(238,142,98,.22), rgba(238,142,98,0) 70%), linear-gradient(180deg, #C3D3E3 0%, #D3DBE6 30%, #E6DDE4 52%, #F2DCD8 72%, #F5CFC2 100%)", grain: faint || sample || kind === 'sunset' ? '.55' : '0' };
  };
  const bgPick = dk => {
    const kind = (dk.bg && dk.bg.kind) || 'deck', image = (dk.bg && dk.bg.image) || (dk.cover && dk.cover.image) || '', photo = image && image !== 'mock' ? image : '', tile = studyBg({ ...dk, bg: { kind: 'deck' } }, false);
    return { bgTile: { base: tile.mesh.base, veil: tile.veil }, hasBgPhoto: !!photo, bgPhoto: photo, bgIsPhoto: kind === 'photo', uploadBg: () => db.act.pickBg(dk.id),
      bgOptions: [['deck', 'Colors'], ['plain', 'Plain'], ['sky', 'Sky'], ['sunset', 'Sunset'], ['photo', 'Photo']].map(([id, label]) => { const on = kind === id;
        return { label, pressed: on ? 'true' : 'false', ring: on ? '0 0 0 2px ' + t.text : 'inset 0 0 0 1px ' + t.line, isDeck: id === 'deck', isPlain: id === 'plain', isSky: id === 'sky', isSunset: id === 'sunset', isPhoto: id === 'photo',
          pick: () => (id === 'photo' && !image ? db.act.pickBg(dk.id) : db.act.setBg(dk.id, id)) }; }) };
  };
  const explainView = (exv, id, question, answered, sample) => {
    exv = db.mock ? { on: true, text: this.state.exMock || this.props.explained ? sample : '', note: this.state.exMock || this.props.explained ? '2 free explanations left today' : '' } : exv || { on: false };
    const open = !!this.state.exOpen && this.state.exFor === id;
    return { show: !!(answered && exv.on && id), closed: !open, open, label: exv.text ? 'Explanation' : 'Explain',
      busy: !!exv.busy, hasText: !!exv.text && !exv.busy, text: exv.text || '', hasError: !!exv.error && !exv.busy, error: exv.error || '', goPro: !!exv.goPro,
      proHref: db.mock ? 'Pricing.dc.html' : 'https://lucida.cards/pricing', hasNote: !!exv.note && !!exv.text, note: exv.note || '',
      ask: () => { this.setState({ exOpen: true, exFor: id }); if (db.mock) this.setState({ exMock: true }); else if (!exv.text) db.act.explain(id, question); },
      close: () => this.setState({ exOpen: false }) };
  };
  const rv = db.review(this.props.deckId, this.props.pile);
  const rev = this.state.revealed;
  const ex = explainView(rv.ex, rv.card && rv.card.id, '', rev, "It pumps protons (H⁺) out of the matrix into the space between the two membranes. That builds a gradient, like water held behind a dam, and ATP synthase uses the flow back in to make ATP. Remember it as pump uphill first, then cash in on the way down.");
  // Behind the cards: the background of the deck this card is from.
  const dk = db.deck(rv.deckId), bg = studyBg(dk, !!this.props.dark, !!this.props.dim);
  const c = rv.card || { kind: 'basic', front: '', back: '' };
  const card = cardView(c, rev);
  const after = patch => this.setState({ revealed: false, moved: true, ...(patch || {}) });
  const grade = g => () => { after(); db.act.grade(c.id, g); };
  const seg = (id, cur) => ({ pressed: id === cur ? 'true' : 'false', bg: id === cur ? t.bg : 'transparent', fg: id === cur ? t.text : t.muted, sh: id === cur ? '0 1px 3px rgba(0,0,0,.14)' : 'none' });
  // Grading style: four grades, a simple check / x, or piles the learner names. It's saved with the deck.
  const mode = rv.mode;
  const modes = [['four', 'Forgot · Hard · Good · Easy', '4 grades'], ['binary', 'Check or X', '✓ / ✗'], ['piles', 'Piles', 'Piles']].map(([id, long, short]) => ({ label: short, long, ...seg(id, mode), pick: () => db.act.updateDeck(rv.deckId, { grading: id }) }));
  // FSRS (set per deck in Deck settings) schedules the four grades and check / x; piles only sort cards.
  const fsrsOn = rv.fsrsOn, iv = rv.iv;
  const grades = [['Forgot', 'again', '1'], ['Hard', 'hard', '2'], ['Good', 'good', '3'], ['Easy', 'easy', '4']]
    .map(([label, k, key], i) => ({ label, key, color: t[k], gap: iv[k], interval: fsrsOn ? iv[k] : '', sub: fsrsOn ? iv[k] + ' · ' + key : key, pick: grade(i + 1) }));
  // Piles are named by the learner. They sort cards; they don't schedule them.
  const pileList = rv.piles;
  const piles = pileList.map((p, i) => ({ ...p, count: String(p.n), key: String(i + 1), pick: () => { after(); db.act.pile(c.id, p.name); } }));
  const draft = this.state.pileDraft;
  const done = rv.done, leftN = rv.left, tot = Math.max(1, rv.total);
  const r = this.props.radius ?? 32;
  // Progress style: a bar, Anki-style queue counts (new · learning · review), or nothing at all.
  const prog = rv.prog;
  const settingsOpen = this.state.settings ?? !!this.props.settingsOpen;
  const progs = [['bar', 'Bar'], ['counts', 'Counts'], ['none', 'None']].map(([id, label]) => ({ label, long: label, ...seg(id, prog), pick: () => db.act.setSettings({ prog: id }) }));
  const queue = rv.queue, n = rv.counts;
  const u = q => (queue === q ? 'underline' : 'none');
  // A sound card's player, on the front (big) and the back (small).
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
  const src = card.isAudio ? c : null, snd = soundView(src, 48, 'front'), sndBack = soundView(src, 36, 'back');
  return {
    t, bg, ex, kb, card, grades, piles, modes, progs, snd, sndBack,
    showBar: prog === 'bar', showCounts: prog === 'counts',
    cNew: { n: String(n.new), u: u('new') }, cLearn: { n: String(n.learn), u: u('learn') }, cRev: { n: String(n.rev), u: u('rev') },
    countsLabel: n.new + ' new, ' + n.learn + ' learning, ' + n.rev + ' to review',
    progHint: { bar: 'A thin bar and how many cards are left.', counts: 'New · learning · review, like Anki. The current card’s queue is underlined.', none: 'Nothing on screen but the card.' }[prog],
    settingsOpen, settingsExpanded: settingsOpen ? 'true' : 'false',
    settingsBtnBg: settingsOpen ? t.inv : t.surf, settingsBtnFg: settingsOpen ? t.invText : t.text,
    toggleSettings: () => this.setState({ settings: !settingsOpen }),
    knew: { label: 'Knew it', title: fsrsOn ? 'Knew it · ' + iv.good : 'Knew it', pick: grade(3) }, missed: { label: 'Didn’t know', title: fsrsOn ? 'Didn’t know · ' + iv.again : 'Didn’t know', pick: grade(1) },
    canAddPile: pileList.length < 5,
    // The iPhone's New pile shows a keyboard drawn on the canvas; in the app the phone shows its own.
    newPileOpen: draft != null, pileName: draft || '', drawKb: !!db.mock,
    openPile: () => this.setState({ pileDraft: '' }),
    setPileName: e => this.setState({ pileDraft: e && e.target ? e.target.value : draft }),
    cancelPile: () => this.setState({ pileDraft: null }),
    savePile: () => { this.setState({ pileDraft: null }); db.act.addPile(rv.deckId, (draft || '').trim() || 'Pile ' + (pileList.length + 1)); },
    left: String(leftN), position: String(done),
    progress: Math.round(done / tot * 100) + '%',
    radius: r + 'px',
    revealed: rev,
    showFour: rev && mode === 'four', showBinary: rev && mode === 'binary', showPiles: rev && mode === 'piles',
    // Fill-in-the-blank cards and pictures with boxes stay put: the blank fills in with a pop, or the box fades to an
    // outline, instead of the card flipping.
    flipTransform: rev && !card.isCloze && !card.isOcc ? 'rotateY(180deg)' : 'rotateY(0deg)',
    // After a grade the next card shows up fresh with a small lift, instead of spinning back to its front.
    flipTrans: this.state.moved ? 'none' : 'transform .5s cubic-bezier(.4,0,.2,1)', cardIn: this.state.moved ? (done % 2 ? 'sc-in-a' : 'sc-in-b') : '',
    flipLabel: card.isCloze ? (rev ? 'Hide the answer' : 'Show the blank') : card.isOcc ? (rev ? 'Hide the answer' : 'Show what’s under the box') : (rev ? 'Flip back' : 'Flip card'),
    // The note under a card that stays put (clozeShown: fill in the blank, or a picture with boxes) shows with the answer.
    clozeShown: rev && (card.isCloze || card.isOcc),
    blank: rev ? { text: c.back, bg: t.inv, fg: t.invText, cls: 'sc-pop' } : { text: '\u2003\u2003\u2003\u2003', bg: t.surf2, fg: 'transparent', cls: '' },
    reveal: () => this.setState({ revealed: !rev, moved: false }),
    undo: () => { if (done > 0 || !db.mock) { this.setState({ revealed: true, moved: false }); db.act.undo(); } },
    editHref: rv.editHref, endHref: db.mock ? 'PhoneDeck.dc.html' : rv.endHref,
    // Settings change the background of the deck this card is from; reviewing every deck, it says which deck that is.
    ...bgPick(dk), bgTitle: db.mock || this.props.deckId ? 'Background' : 'Background for ' + dk.name
  };
}
}
return Component;
  }
};
