// A deck's Diagrams, in the page (the server side is web/diagrams.mjs): the diagrams found in the lecture files its cards were made from, tables and mind maps made from its cards and
// notes, and pictures people upload. This is the flow's memory and what it does; the deck page (WebDeck and PhoneDeck, boards on the canvas) only draws what `view()` and `rows()` say.
//
//   rows(deckId)    the deck's diagrams, newest first, as the page lists them
//   view(deckId)    what is open: a diagram, the Make diagram sheet (and while it is making, or what went wrong), an upload on its way, a rename or a delete being asked
//   open / close / openSheet / closeSheet / setType / setScope / make / cancel / redo / rename / remove / upload / cards (Make cards)
// Everything a person sees goes through Lucida's own parts (no alert, no confirm, no select): a problem is a line in the sheet or the viewer.

export function createDiagrams({ state, reload, changed, go, shrink, choose, act }) {
  const fresh = deck => ({ deck, seen: '', open: '', sheet: false, type: 'table', scope: { kind: 'all', value: '' }, making: false, error: null, busy: '', msg: '', renaming: false, draft: '', confirm: false, up: null, upErr: '', labels: false });
  let U = fresh(''), run = 0, draft = null;
  const decks = () => (state() || {}).decks || [];
  const deckOf = id => decks().find(d => d.id === id);
  const sync = id => { if (U.deck !== id) U = fresh(id); };

  const call = async (url, body) => {
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store' }); }
    catch { throw Object.assign(new Error('Couldn’t reach Lucida. Check your connection and try again.'), { network: true }); }
    if (r.status === 401) { location.assign('/sign-in?next=' + encodeURIComponent(location.pathname + location.search)); throw new Error('Signed out'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Try again.'), { status: r.status, code: j.code || '', pro: !!j.pro });
    return j;
  };
  const again = e => !e.code || ['ai', 'busy', 'off'].includes(e.code);

  // The diagrams of a deck, newest first: what the page lists (a picture is at /media/<its file>), grouped as Made (tables and mind maps), From your lectures and Uploaded.
  const GROUP = { table: 'Made', mindmap: 'Made', lecture: 'From your lectures', upload: 'Uploaded' };
  function rows(deckId) {
    const d = deckOf(deckId);
    return ((d && d.diagrams) || []).slice().reverse().map(g => ({
      id: g.id, kind: g.kind, name: g.name || 'Untitled', group: GROUP[g.kind] || 'Made', at: g.at || 0, src: g.src || null, picture: g.file ? '/media/' + g.file.name : '', w: g.file ? g.file.w : 0, h: g.file ? g.file.h : 0,
      labels: Array.isArray(g.labels) ? g.labels : null, figure: g.figure || '', table: g.table || null, tree: g.tree || null, from: g.from || null, cards: g.cards || 0, size: g.file ? g.file.size : 0
    }));
  }
  // (`initial`: a diagram the address asks to be open (?diagram=), opened once.)
  function view(deckId, initial) {
    sync(deckId);
    if (initial && U.seen !== initial) { U.seen = initial; U.open = initial; }
    const open = U.open && rows(deckId).some(r => r.id === U.open) ? U.open : '';
    return { open, sheet: U.sheet, type: U.type, scope: U.scope, making: U.making, error: U.error, busy: U.busy, msg: U.msg, renaming: U.renaming, draft: U.draft, confirm: U.confirm, up: U.up, upErr: U.upErr, labels: U.labels };
  }
  const reset = () => { U.busy = ''; U.msg = ''; U.renaming = false; U.confirm = false; U.draft = ''; U.labels = false; };
  const open = (deckId, id) => { sync(deckId); reset(); U.open = id; changed(); };
  const close = () => { reset(); U.open = ''; changed(); };

  // ---------- Make diagram ----------
  const openSheet = deckId => { sync(deckId); U.sheet = true; U.making = false; U.error = null; changed(); };
  const closeSheet = () => { run++; U.sheet = false; U.making = false; U.error = null; changed(); };
  const setType = t => { U.type = t === 'mindmap' ? 'mindmap' : 'table'; U.error = null; changed(); };
  const setScope = (kind, value) => { U.scope = U.scope.kind === kind && U.scope.value === (value || '') ? { kind: 'all', value: '' } : { kind: kind || 'all', value: value || '' }; U.error = null; changed(); };
  async function make(deckId) {
    sync(deckId);
    if (U.making) return;
    const mine = ++run;
    U.making = true; U.error = null; changed();
    try {
      const r = await call('/api/diagrams/make', { deckId, type: U.type, scope: U.scope });
      // (A person who closed the sheet meanwhile still gets the diagram in their list.)
      await reload();
      if (mine !== run) return;
      U.making = false; U.sheet = false; reset(); U.open = r.id; changed();
    } catch (e) {
      if (mine !== run) { reload().catch(() => {}); return; }
      U.making = false; U.error = { message: e.message || 'Something went wrong. Try again.', pro: !!e.pro, code: e.code || '', again: again(e) }; changed();
    }
  }
  // Redo: the same kind from the same cards, written again (it is one more AI step of the day).
  async function redo(deckId, id) {
    sync(deckId);
    if (U.busy) return;
    U.busy = 'redo'; U.msg = ''; changed();
    try { await call('/api/diagrams/make', { deckId, redo: id }); await reload(); U.busy = ''; }
    catch (e) { U.busy = ''; U.msg = e.message || 'Something went wrong. Try again.'; }
    changed();
  }

  // ---------- Rename and Delete (a question and its answer sit in the viewer, in Lucida's own parts) ----------
  const startRename = name => { U.renaming = true; U.confirm = false; U.draft = String(name || ''); U.msg = ''; changed(); };
  const setDraft = v => { U.draft = String(v == null ? '' : v); changed(); };
  const cancelRename = () => { U.renaming = false; U.draft = ''; U.msg = ''; changed(); };
  async function rename(deckId, id) {
    const name = U.draft.replace(/\s+/g, ' ').trim();
    if (!name) { U.msg = 'Give it a name.'; return changed(); }
    U.busy = 'rename'; U.msg = ''; changed();
    try { await act('diagram.rename', { deckId, id, name }); U.renaming = false; U.draft = ''; }
    catch (e) { U.msg = e.message || 'Something went wrong. Try again.'; }
    U.busy = ''; changed();
  }
  const askDelete = () => { U.confirm = true; U.renaming = false; U.msg = ''; changed(); };
  const keep = () => { U.confirm = false; changed(); };
  async function remove(deckId, id) {
    U.busy = 'delete'; U.msg = ''; changed();
    try { await act('diagram.delete', { deckId, id }); U.busy = ''; U.open = ''; U.confirm = false; }
    catch (e) { U.busy = ''; U.msg = e.message || 'Something went wrong. Try again.'; }
    changed();
  }

  // ---------- Upload diagram ----------
  // A picture is made smaller if it is big, then goes up like a file for making cards (a small one through this server, a big one straight to storage), then it is kept in the deck.
  const NOT_PICTURE = 'That isn’t a picture Lucida can show (PNG, JPEG, GIF, or WebP).';
  async function upload(deckId) {
    sync(deckId);
    if (U.up) return;
    const f = await choose('image/*,.png,.jpg,.jpeg,.gif,.webp');
    if (!f) return;
    U.up = { name: f.name || 'Picture' }; U.upErr = ''; changed();
    try {
      const pic = await shrink(f);
      if (!pic) throw new Error(NOT_PICTURE);
      const r = await call('/api/make/upload', { name: f.name || 'picture', type: pic.type, size: pic.size });
      let put;
      try { put = await fetch(r.put.url, { method: 'PUT', headers: r.put.headers, body: pic }); }
      catch { throw Object.assign(new Error('Couldn’t send your picture. Check your connection and try again.'), { network: true }); }
      if (put.status === 401) { location.assign('/sign-in?next=' + encodeURIComponent(location.pathname + location.search)); throw new Error('Signed out'); }
      if (!put.ok) throw new Error(put.status === 413 ? 'That picture is too big to send.' : 'Couldn’t send your picture. Try again.');
      await call('/api/diagrams/keep', { deckId, upload: r.id, name: f.name || '' });
      await reload();
    } catch (e) { U.upErr = e.message || 'Something went wrong. Try again.'; }
    U.up = null; changed();
  }
  const dismissUploadError = () => { U.upErr = ''; changed(); };

  // ---------- Make cards: the picture and its labels go to the card editor ----------
  // The server makes the picture a card's own and says where each label is; the editor opens on a new Image card with those boxes, to check and move before saving.
  async function cards(deckId, id) {
    sync(deckId);
    if (U.busy) return;
    U.busy = 'cards'; U.msg = ''; changed();
    try {
      const r = await call('/api/diagrams/cards', { deckId, id });
      draft = { deckId, id, image: r.image, boxes: r.boxes, name: r.name, w: r.w, h: r.h };
      U.busy = '';
      go('/deck/' + deckId + '/card?diagram=' + encodeURIComponent(id));
    } catch (e) { U.busy = ''; U.msg = e.message || 'Something went wrong. Try again.'; }
    changed();
  }
  // The editor takes what Make cards prepared (once), for the deck it opens on.
  const takeDraft = deckId => { const d = draft && draft.deckId === deckId ? draft : null; if (d) draft = null; return d; };
  const peekDraft = deckId => (draft && draft.deckId === deckId ? draft : null);
  const setLabels = on => { U.labels = !!on; changed(); };

  return { rows, view, open, close, openSheet, closeSheet, setType, setScope, make, redo, startRename, setDraft, cancelRename, rename, askDelete, keep, remove, upload, dismissUploadError, cards, takeDraft, peekDraft, setLabels,
    cancel: closeSheet };
}
