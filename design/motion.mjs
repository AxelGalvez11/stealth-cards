// One set of motion timings for the web app, the canvas and the iPhone app (the owner, 2026-10-01: "add slide in animations
// to app components, like menu popup, button toggle etc."). Quick, eased out, a short slide plus a fade, and nothing that
// bounces: the owner's rule is that motion is super subtle.
//   - design/build.mjs writes these into the boards' motion CSS (MOTION_CSS below).
//   - design/to-ios.mjs writes the same numbers into Generated.swift (`Generated.motion`), and the iPhone app's animations
//     (Design/Motion.swift) use only those.
// Change a number here and both apps follow (run `node design/build.mjs && node design/to-web.mjs && node design/to-ios.mjs`).
// Reduce Motion (iPhone) and prefers-reduced-motion (web) turn all of it off.
export const MOTION = {
  // cubic-bezier: starts fast, settles gently, and never overshoots (the y values stay between 0 and 1)
  ease: [0.2, 0.8, 0.2, 1],
  // How far a menu, pop-up, dropdown or toast slides in (points on the phone, px on the web), with a fade
  slide: 10,
  // Seconds: menus, pop-ups, dropdowns and toasts come in
  pop: 0.22,
  // ... sheets and side panels slide in
  sheet: 0.25,
  // ... and anything going away
  leave: 0.18,
  // ... a switch's knob and a segmented control's selected pill slide
  knob: 0.2,
  // ... a dimmed backdrop fades
  fade: 0.18
};

// The web app only (a phone has no pointer, so this isn't in MOTION and the iPhone app never sees it): deck, folder and class tiles
// lift 4 px with a bigger shadow under the pointer, in this many seconds, easing off (the owner, 2026-10-01: "yes hover 0.2 seconds").
export const TILE_HOVER = 0.2;
const s = n => String(+n.toFixed(3)).replace(/^0\./, '.') + 's';
export const EASE = 'cubic-bezier(' + MOTION.ease.join(',') + ')';
// The way out is eased in (it starts slowly and leaves), the mirror of the way in.
export const EASE_OUT = 'cubic-bezier(.4,0,1,1)';

// The boards' motion for components. Every pop-up, menu and dropdown comes in the same way (.sc-pop, and [data-sc-pop] on the
// menus the app places itself), a tray and a toast too; sheets, panels and their backdrops have their own durations; a switch's
// knob and a segmented control's pill slide at one speed. (A revealed blank in a flashcard pops with its own class, sc-blank.)
export const MOTION_CSS = [
  `@keyframes scPopIn{from{opacity:0;transform:translateY(${MOTION.slide}px)}}`,
  `.sc-pop,[data-sc-pop],.sc-tray{animation:scPopIn ${s(MOTION.pop)} ${EASE} backwards}`,
  `@keyframes scFade{from{opacity:0}}.sc-fade{animation:scFade ${s(MOTION.fade)} ease-out backwards}`,
  `@keyframes scScrimIn{from{opacity:0}}@keyframes scScrimOut{to{opacity:0}}.sc-scrim{animation:scScrimIn ${s(MOTION.sheet)} ease backwards}.sc-scrim.sc-gone{animation:scScrimOut ${s(MOTION.leave)} ease forwards}`,
  `@keyframes scPanelIn{from{opacity:0;transform:translateX(calc(100% + 12px))}}@keyframes scPanelOut{to{opacity:0;transform:translateX(calc(100% + 12px))}}.sc-panel{animation:scPanelIn ${s(MOTION.sheet)} ${EASE} backwards}.sc-panel.sc-gone{animation:scPanelOut ${s(MOTION.leave)} ${EASE_OUT} forwards}`,
  `@keyframes scSheetIn{from{transform:translateY(100%)}}@keyframes scSheetOut{to{transform:translateY(100%)}}.sc-sheet{animation:scSheetIn ${s(MOTION.sheet)} ${EASE} backwards}.sc-sheet.sc-gone{animation:scSheetOut ${s(MOTION.leave)} ${EASE_OUT} forwards}`,
  // Switches: the knob slides across while the colors fade (no overshoot).
  `.sc-sw{transition:background-color ${s(MOTION.knob)} ease,transform .1s ease}.sc-sw>span{transition:transform ${s(MOTION.knob)} ${EASE},background-color ${s(MOTION.knob)} ease}`,
  // Segmented controls: the words change color as the pill slides (web/motion.js slides the pill itself).
  `[role="group"]>button,[role="tablist"]>button{transition:color ${s(MOTION.knob)} ease,transform .1s ease}`,
  '@media (prefers-reduced-motion:reduce){.sc-pop,[data-sc-pop],.sc-tray,.sc-fade,.sc-scrim,.sc-panel,.sc-sheet{animation:none!important}.sc-sw>span,[role="group"]>button,[role="tablist"]>button{transition:none}.sc-sw{transition:background-color .2s ease}}'
].join('');
