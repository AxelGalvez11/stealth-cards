// The web sidebar's collapsed rail (design/build.mjs `sidebar`; the owner: "allow lucida left sidebar to be collapsable"). A small icon
// button at the top of the sidebar collapses it to a narrow rail of icons, like ChatGPT's left rail, and the same button opens it again.
// The choice is kept on this device. localStorage can throw or be empty (a private window, blocked site data): then the sidebar is
// open, and the button still works until the page is closed.
export const SIDE_KEY = 'lucida.sidebar';
// Each place's name, which the rail shows as a tooltip (title) and gives the icon as its accessible name.
export const SIDE_TIPS = { library: 'Library', discover: 'Discover', stats: 'Stats', profile: 'Profile', news: 'News', settings: 'Settings' };
export const readSide = () => { try { return localStorage.getItem(SIDE_KEY) === 'collapsed'; } catch { return false; } };
export const writeSide = collapsed => { try { localStorage.setItem(SIDE_KEY, collapsed ? 'collapsed' : 'expanded'); } catch { /* blocked: the choice lasts until the page closes */ } };
// The sidebar's holes for a screen (`nav` in the boards' chrome): whether it's collapsed ('true' or 'false', for the CSS), the button's
// name and state, the rail's tooltips (none while it's open, where the words are on screen), and what the button does.
// (Its source is also what the canvas's sample data uses, design/mock.mjs, with SIDE_TIPS in scope, so this must stay one self-contained arrow function.)
export const sideView = (collapsed, toggle) => ({ collapsed: collapsed ? 'true' : 'false', sideOpen: collapsed ? 'false' : 'true', sideLabel: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
  tip: collapsed ? SIDE_TIPS : Object.fromEntries(Object.keys(SIDE_TIPS).map(k => [k, ''])), toggleSide: toggle });
