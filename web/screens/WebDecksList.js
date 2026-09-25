// Made from design/canvas/project/WebDecksList.dc.html by design/to-web.mjs. Change the design, not this file.
export default {
  name: "WebDecksList", title: "Web · Library · list view", w: 1440, h: 900, fill: true,
  props: {},
  imports: ["WebDecks"],
  css: "body{margin:0;font-family:Geist, -apple-system, system-ui, sans-serif}\na{color:inherit;text-decoration:none}a:hover{opacity:.8}\n@keyframes scRise{from{opacity:0;transform:translateY(14px)}}main>*{animation:scRise .5s cubic-bezier(.2,.8,.2,1) backwards}main>*:nth-child(2){animation-delay:0.06s}main>*:nth-child(3){animation-delay:0.12s}main>*:nth-child(4){animation-delay:0.18s}main>*:nth-child(5){animation-delay:0.24s}main>*:nth-child(n+6){animation-delay:.3s}button,.sc-press{transition:transform .1s ease}button:active,.sc-press:active{transform:scale(.96)}.sc-lift{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s cubic-bezier(.2,.8,.2,1)}.sc-lift:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.45)}@keyframes scFloat{50%{transform:translateY(-6px)}}@keyframes scSwayA{50%{transform:rotate(-13deg) translateX(-3px)}}@keyframes scSwayB{50%{transform:rotate(10deg) translateX(3px)}}@keyframes scGlow{50%{opacity:.55}}@keyframes scSheen{0%,58%{transform:translateX(-160%) skewX(-18deg)}86%,100%{transform:translateX(260%) skewX(-18deg)}}.sc-float{animation:scFloat 6s ease-in-out infinite}.sc-sway-a{animation:scSwayA 6s ease-in-out infinite}.sc-sway-b{animation:scSwayB 6s ease-in-out infinite}.sc-glow{animation:scGlow 6s ease-in-out infinite}.sc-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:scSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}@keyframes scDrift{from{transform:scale(1.14) translate(-3%,-2%)}to{transform:scale(1.14) translate(3%,2%)}}.sc-alive>svg:first-of-type{animation:scDrift 16s ease-in-out infinite alternate}@keyframes scDraw{from{stroke-dashoffset:1.02}}.sc-draw{stroke-dasharray:1 2;animation:scDraw .9s cubic-bezier(.2,.8,.2,1) backwards}@keyframes scKnob{from{opacity:0;transform:scale(.3)}}.sc-knob{transform-box:fill-box;transform-origin:center;animation:scKnob .35s .75s cubic-bezier(.34,1.56,.64,1) backwards}@keyframes scGrow{from{transform:scaleY(0)}}.sc-grow{transform-origin:bottom;animation:scGrow .6s cubic-bezier(.2,.8,.2,1) backwards}:nth-child(2)>.sc-grow{animation-delay:0.04s}:nth-child(3)>.sc-grow{animation-delay:0.08s}:nth-child(4)>.sc-grow{animation-delay:0.12s}:nth-child(5)>.sc-grow{animation-delay:0.16s}:nth-child(6)>.sc-grow{animation-delay:0.20s}:nth-child(7)>.sc-grow{animation-delay:0.24s}:nth-child(8)>.sc-grow{animation-delay:0.28s}:nth-child(9)>.sc-grow{animation-delay:0.32s}:nth-child(10)>.sc-grow{animation-delay:0.36s}:nth-child(11)>.sc-grow{animation-delay:0.40s}:nth-child(12)>.sc-grow{animation-delay:0.44s}:nth-child(13)>.sc-grow{animation-delay:0.48s}:nth-child(14)>.sc-grow{animation-delay:0.52s}@media (prefers-reduced-motion:reduce){main>*,.sc-float,.sc-sway-a,.sc-sway-b,.sc-glow,.sc-alive>svg,.sc-draw,.sc-knob,.sc-grow{animation:none!important}.sc-sheen{display:none}button:active,.sc-press:active,.sc-lift:hover{transform:none}}\n.sc-drag{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}.sc-hit:focus-visible{outline:2px solid currentColor;outline-offset:-2px}.sc-row .sc-hit::before{content:\"\";position:absolute;inset:4px -12px;border-radius:14px;background:currentColor;opacity:0;transition:opacity .15s}.sc-row:hover .sc-hit::before{opacity:.05}@keyframes scTray{from{opacity:0;transform:translateY(18px) scale(.98)}}.sc-tray{animation:scTray .3s cubic-bezier(.2,.8,.2,1)}@keyframes scPop{from{opacity:0;transform:translateY(12px) scale(.97)}}.sc-pop{animation:scPop .26s cubic-bezier(.2,.8,.2,1)}@keyframes scFade{from{opacity:0}}.sc-fade{animation:scFade .2s ease}@media (prefers-reduced-motion:reduce){.sc-tray,.sc-pop,.sc-fade{animation:none}}",
  template: "<div style=\"width: 100%; height: 100vh; overflow: hidden;\"><dc-import name=\"WebDecks\" view=\"List\" hint-size=\"1440px,900px\"></dc-import></div>",
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
  const X = {"DECKS":[{"id":"cell","name":"Cell Biology","total":"412","due":28,"overdue":12,"soon":0,"fresh":10,"ret":91,"ai":38},{"id":"jlpt","name":"Japanese · JLPT N4","total":"1,280","due":19,"overdue":5,"soon":0,"fresh":20,"ret":87,"ai":0},{"id":"orgo","name":"Organic Chemistry","total":"236","due":11,"overdue":0,"soon":0,"fresh":5,"ret":84,"ai":0},{"id":"hist","name":"US History","total":"158","due":6,"overdue":0,"soon":0,"fresh":0,"ret":93,"ai":0},{"id":"sys","name":"System Design","total":"74","due":0,"overdue":0,"soon":1,"fresh":8,"ret":89,"ai":0},{"id":"span","name":"Spanish Verbs","total":"310","due":0,"overdue":0,"soon":3,"fresh":0,"ret":95,"ai":0}],"TAGS":{"cell":["Biology","MCAT","Year 1","BIO 201","Fall 2026","Midterm","Final exam","Pre-med","Lab","Cells","Must know"],"jlpt":["Languages"],"orgo":["Chemistry","MCAT","Year 1","Pre-med","Fall 2026"],"hist":["History"],"sys":["Computer science"],"span":["Languages"]},"CARDS":[{"id":"k1","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺)","kind":"Basic","icon":"text","next":"Tomorrow","ai":"","tags":["Energy","Exam 1","Mitochondria","Must know"]},{"id":"k2","front":"The ____ is the powerhouse of the cell.","back":"mitochondrion","kind":"Fill in the blank","icon":"blank","next":"Due now","ai":"Claude","tags":["Organelles","Exam 1"]},{"id":"k3","front":"Name structure 1 on the diagram.","back":"Nucleus","kind":"Image","icon":"image","next":"In 3 days","ai":"Claude","tags":["Organelles","Diagrams"]},{"id":"k4","front":"Which organelle packages proteins for secretion?","back":"Golgi apparatus","kind":"Basic","icon":"text","next":"In 6 days","ai":"","tags":["Organelles"]},{"id":"k5","front":"Say it: ribosome","back":"RY-buh-sohm","kind":"Audio","icon":"audio","next":"Due now","ai":"ChatGPT","tags":["Pronunciation"]},{"id":"k6","front":"What is the role of the ribosome?","back":"Translates mRNA into protein","kind":"Basic","icon":"text","next":"In 12 days","ai":"","tags":["Proteins","Exam 2"]}],"FOLDERS":[{"id":"f1","name":"Languages","decks":["jlpt","span"]},{"id":"f2","name":"Year 1","decks":["orgo","hist"]}],"ALL_CARDS":[["cell","What does the electron transport chain pump across the inner membrane?","Protons (H⁺)","text","Tomorrow","easy",["Energy","Exam 1","Mitochondria","Must know"]],["cell","The ____ is the powerhouse of the cell.","mitochondrion","blank","Due now","hard",["Organelles","Exam 1"]],["jlpt","電車","train (でんしゃ)","text","In 2 days","medium",["Vocabulary"]],["orgo","C₆H₆","Benzene","text","In 5 days","easy",["Aromatics"]],["cell","Name structure 1 on the diagram.","Nucleus","image","In 3 days","medium",["Organelles","Diagrams"]],["hist","Year the Declaration of Independence was signed?","1776","text","In 9 days","easy",["Revolution"]],["span","Yo ____ dos hermanos.","tengo","blank","Due now","hard",["Irregular"]],["sys","What does a load balancer do?","Spreads requests across servers","text","New","new",["Basics"]],["cell","Which organelle packages proteins for secretion?","Golgi apparatus","text","In 6 days","medium",["Organelles"]],["jlpt","学校","school (がっこう)","text","New","new",["Vocabulary"]],["orgo","Markovnikov’s rule says the H goes to…","The carbon with more H’s","text","Due now","hard",["Reactions","Exam 2"]],["cell","Say it: ribosome","RY-buh-sohm","audio","Due now","new",["Pronunciation"]]],"REVIEW":[{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), from the matrix into the intermembrane space.","note":"That gradient powers ATP synthase."},{"kind":"cloze","before":"The","after":"is the powerhouse of the cell.","back":"mitochondrion","note":"It makes most of the cell’s ATP."},{"kind":"image","front":"Name structure 1.","back":"Nucleus","note":"Holds the cell’s DNA.","image":"mock","backLabel":"1 = Nucleus"},{"kind":"audio","front":"What word do you hear?","back":"train","note":"電 electricity + 車 vehicle.","audio":"mock","backBig":"電車","backSub":"でんしゃ · train"}],"DRAFTS":{"Basic":{"kind":"basic","front":"What does the electron transport chain pump across the inner membrane?","back":"Protons (H⁺), into the intermembrane space."},"Blank":{"kind":"cloze","text":"The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].","note":"It makes most of the cell’s ATP."},"Image":{"kind":"image","front":"Name structure 1.","back":"Nucleus","image":"mock"},"Audio":{"kind":"audio","back":"電車 (でんしゃ): train","audio":"mock"}},"DUE_7":{"vals":[32,18,24,12,30,8,16],"labels":["Wed","Thu","Fri","Sat","Sun","Mon","Tue"],"tops":null,"names":["tomorrow","Thursday","Friday","Saturday","Sunday","Monday","Tuesday"]},"DUE_14":{"vals":[32,18,24,12,30,8,16,22,14,26,10,20,6,12],"labels":["23","24","25","26","27","28","29","30","1","2","3","4","5","6"],"tops":["W","T","F","S","S","M","T","W","T","F","S","S","M","T"],"names":["tomorrow","Thu 24","Fri 25","Sat 26","Sun 27","Mon 28","Tue 29","Wed 30","Thu, Oct 1","Fri, Oct 2","Sat, Oct 3","Sun, Oct 4","Mon, Oct 5","Tue, Oct 6"]}};
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
      pickFile: () => Promise.resolve(null), pickText: () => Promise.resolve(null), record: () => Promise.resolve(null),
      addPile: (id, name) => set({ piles: [...deck().piles, { name, n: 0 }] })
    }
  };
}

renderVals() { return {}; }
}
return Component;
  }
};
