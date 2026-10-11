// A deck's Guide moves into its Pages (step 2 of the Pages plan, the owner's approval of 2026-10-11): the Guide becomes a Note page
// called Guide, and each of its extra pages a Note page, inside the same page as before (inside the Guide, or at the top). It happens
// the first time the deck's pages are asked for (the app's Pages tab, an AI app's page or Guide tools), once per deck; the deck then
// says where its Guide went (`guideMoved`: the Guide's page and each old page's new id). The old Guide stays as it was, unused, so
// an iPhone app from before Pages still shows it; a deck you study from someone keeps its owner's Guide, which is theirs to move.
// `once` (pages.onceFor) keeps a request the library has to try again from making the pages twice; pages a request made before
// (made by Lucida, with the Guide's title) are taken up instead of made again.
import { apply, uidOf } from './store.mjs';
import * as pages from './pages.mjs';

const MOVER = 'Lucida';
const studying = d => !!(d && d.link && d.link.mode === 'study' && !d.link.gone);

export async function moveGuide(d, once = (k, fn) => fn()) {
  if (!d || d.guideMoved || studying(d)) return d ? d.guideMoved || null : null;
  const uid = uidOf(), g = d.guide || {}, list = Array.isArray(g.pages) ? g.pages : [];
  const made = await once('guide-move:' + d.id, async () => {
    if (!String(g.text || '').trim() && !list.length) return { main: '', map: {} };
    const have = await pages.list(uid, 'deck', d.id), earlier = have.find(p => p.by === MOVER && p.title === 'Guide' && !p.parent);
    if (earlier) return { main: earlier.id, map: {} };
    const make = (title, text, parent) => pages.create(uid, { scope: 'deck', scopeId: d.id, kind: 'note', title, data: { markdown: String(text || '') }, parent, who: MOVER, summary: 'Moved from the Guide', pro: true });
    const main = await make('Guide', g.text, ''), map = {};
    // a page goes in after the page it sits inside (old pages nest under the Guide, 'main', or another page)
    let left = list.slice();
    for (let round = 0; left.length && round < 12; round++) {
      for (const p of left.slice()) {
        const par = !p.parent ? '' : p.parent === 'main' ? main.id : map[p.parent];
        if (p.parent && p.parent !== 'main' && !par && list.some(x => x.id === p.parent)) continue;
        map[p.id] = (await make(p.title, p.text, par || '')).id;
        left = left.filter(x => x !== p);
      }
    }
    return { main: main.id, map };
  });
  apply({ type: 'guide.moved', deckId: d.id, main: made.main, map: made.map }, MOVER);
  return d.guideMoved;
}
