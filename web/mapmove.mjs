// The mind maps made from a deck's cards move into its Pages (step 4 §7.1, the owner's answer of 2026-10-11: "yes"): each made
// mind map in the deck's Figures (deck.diagrams, kind 'mindmap') becomes a Mind map page with the same name, made by Lucida, once
// per deck, the first time the deck's pages are asked for (the app's Pages tab, an AI app's list_pages, the Figures routes). The deck
// then says which page each became (`diagramsMoved.map`, and `pageId` on each old record). The old records stay as they were, so an
// iPhone app from before map pages still shows them; tables and pictures stay in Figures.
// A deck copied from someone brings that deck's map pages with it (`d.maps`, social.mjs): they become its own pages here too, their
// cards linked to the copy's cards, and an old record one of them was moved from becomes that page instead of a second one.
// Like guidemove.mjs: `once` (pages.onceFor) keeps a request the library has to try again from making the pages twice, and pages
// an earlier try made (by Lucida, with the same title and kind) are taken up instead of made again. A move never fails on Free's
// page limit (pro: true). It waits until the apps can show mind maps (PAGE_READY), and a deck studied from someone keeps its owner's.
import { apply, uidOf } from './store.mjs';
import * as pages from './pages.mjs';

const MOVER = 'Lucida';
const studying = d => !!(d && d.link && d.link.mode === 'study' && !d.link.gone);
const made = d => (d.diagrams || []).filter(g => g && g.kind === 'mindmap' && g.tree && typeof g.tree === 'object' && /^[\w-]{1,30}$/.test(String(g.id || '')));
const shared = d => (Array.isArray(d.maps) ? d.maps : []).filter(x => x && pages.MAP_KINDS.has(x.kind) && x.data && typeof x.data === 'object' && /^p[a-z0-9]{6,24}$/.test(String(x.id || '')));
const day = t => { const d = new Date(+t || Date.now()); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
// "Moved from Figures (made from 42 cards: All cards and notes, Oct 3)"
const movedWords = g => {
  const what = [g.cards > 0 ? 'made from ' + g.cards + ' card' + (g.cards === 1 ? '' : 's') + (g.from && g.from.label ? ': ' + String(g.from.label).slice(0, 60) : '') : '', day(g.madeAt || g.at)].filter(Boolean).join(', ');
  return 'Moved from Figures (' + what + ')';
};

// Whether a deck has maps waiting to become pages: made mind maps not moved yet (once per deck), or a copy's shared map pages of a kind
// the apps can show (one of a kind that isn't ready yet waits for it).
export const mapsToMove = d => !!d && !studying(d) && pages.PAGE_READY.has('mindmap')
  && ((!d.diagramsMoved && made(d).length > 0) || shared(d).some(x => pages.PAGE_READY.has(x.kind)));

export async function moveMaps(d, once = (k, fn) => fn()) {
  if (!mapsToMove(d)) return d ? d.diagramsMoved || null : null;
  const was = (d.diagramsMoved && d.diagramsMoved.map) || {};
  const maps = pages.mapsEngine();
  if (!maps) return null;
  const uid = uidOf();
  const map = await once('map-move:' + d.id, async () => {
    const have = await pages.list(uid, 'deck', d.id), taken = new Set(), out = {};
    // a page an earlier try made is taken up (by Lucida, the same title and kind, not taken already)
    const earlier = (kind, title) => have.find(p => p.by === MOVER && p.kind === kind && p.title === title && !taken.has(p.id));
    const make = async (kind, title, data, summary) => {
      const before = earlier(kind, title);
      if (before) { taken.add(before.id); return before.id; }
      const p = await pages.create(uid, { scope: 'deck', scopeId: d.id, kind, title, data, who: MOVER, ai: true, summary, pro: true });
      taken.add(p.id);
      return p.id;
    };
    // a copy's shared map pages first (an old record one of them came from becomes that page)
    for (const x of shared(d)) {
      if (!pages.PAGE_READY.has(x.kind)) continue;
      let data;
      try { data = maps.normalize(x.kind, x.data, undefined, { ai: true, title: x.title }).data; } catch { continue; }
      const id = await make(x.kind, String(x.title || '').slice(0, 200) || pages.KIND_NAMES[x.kind], data, 'Copied with the deck');
      if (x.from && /^[\w-]{1,30}$/.test(String(x.from)) && !Object.hasOwn(was, x.from)) out[x.from] = id;
      out[x.id] = id;
    }
    // then each made mind map, oldest first
    for (const g of made(d).sort((a, b) => (+a.at || 0) - (+b.at || 0))) {
      if (Object.hasOwn(out, g.id) || Object.hasOwn(was, g.id) || g.pageId) continue;
      const data = maps.normalizeMindmap({ tree: g.tree }, undefined, { ai: true, title: g.name }).data;
      out[g.id] = await make('mindmap', String(g.name || '').slice(0, 200) || 'Mind map', data, movedWords(g));
    }
    return out;
  });
  apply({ type: 'diagrams.moved', deckId: d.id, map }, MOVER);
  return d.diagramsMoved;
}
