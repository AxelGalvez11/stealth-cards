// Sharing a link, for the boards' logic (the owner's TestFlight notes, 2026-10-01: "users cannot 'share' profile, it just
// says 'link copied' i was expecting a share popup"). Where the browser has a share sheet (phones, Safari) the link goes to
// it; without one the link is copied and the page says so ("Link copied", "Copied"), as it always did. The iPhone app always
// opens the phone's own share sheet (Design/PageViews.swift ShareSheet). Copying stays for the links people paste into
// another app (Connect AI, the welcome).
//   this.shareOrCopy(title, url, copied)  share it, or copy it and call `copied()`; closing the sheet does nothing
//   this.sharing()                        whether links share here (the labels say "Share link" then, "Copy link" otherwise)
// It has to run inside the click that asked for it (a browser only opens its share sheet for a tap). On the canvas there's
// no browser sheet to show, so a board there copies, and its labels say "Share" like the iPhone app's.
export const SHARE_METHOD = `
sharing() { return !this.props.db || (typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }
shareOrCopy(title, url, copied) {
  const db = this.props.db, copy = () => {
    try { const r = db && db.act && db.act.copy ? db.act.copy(url) : navigator.clipboard && navigator.clipboard.writeText(url); if (r && r.catch) r.catch(() => {}); } catch (e) { /* no clipboard here */ }
    copied();
  };
  if (db && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try { navigator.share({ title, url }).catch(e => { if (!e || e.name !== 'AbortError') copy(); }); return; } catch (e) { /* not allowed here: copy it */ }
  }
  copy();
}`;
