// Dragging decks and cards (the owner: "allow users to drag decks and cards"): where things land. The app (db.js) works
// it out to show the new order at once, and the server (store.mjs) the same way to save it, so the two always agree.
// The Library lists decks in the library's own order, so moving a deck moves it in that list.

// Puts `item` just before `before` in `list` (at the end when there's no `before`).
export function placeBefore(list, item, before) {
  const at = list.indexOf(item);
  if (at < 0 || item === before) return;
  list.splice(at, 1);
  const to = before ? list.indexOf(before) : -1;
  list.splice(to < 0 ? list.length : to, 0, item);
}

// A deck's cards in the order its page lists them: the order you dragged them into (the deck's cardOrder), with any
// cards added since then first, newest first. A deck you never rearranged lists its newest cards first.
export function deckCards(deck, cards) {
  const at = new Map(((deck && deck.cardOrder) || []).map((id, i) => [id, i]));
  const mine = deck ? cards.filter(c => c.deckId === deck.id) : [];
  return [...mine.filter(c => !at.has(c.id)).reverse(), ...mine.filter(c => at.has(c.id)).sort((a, b) => at.get(a.id) - at.get(b.id))];
}

// Moves a card to just before another card of its deck (to the end without one), and keeps that as the deck's order.
export function cardBefore(deck, cards, card, before) {
  const ids = deckCards(deck, cards).map(c => c.id).filter(x => x !== card.id), at = before ? ids.indexOf(before) : -1;
  ids.splice(at < 0 ? ids.length : at, 0, card.id);
  deck.cardOrder = ids;
}

// Moves a card to another deck, with the other cards made from the same fill-in-the-blank text (they're one card to
// you) and their reviews, so each deck's numbers stay its own. There it lists with the newest cards, by when it was made.
export function cardToDeck(S, card, deckId) {
  const moving = card.group ? S.cards.filter(c => c.group === card.group) : [card], ids = new Set(moving.map(c => c.id));
  for (const d of S.decks) if (d.cardOrder) d.cardOrder = d.cardOrder.filter(x => !ids.has(x));
  moving.forEach(c => { c.deckId = deckId; });
  S.logs.forEach(l => { if (ids.has(l.cardId)) l.deckId = deckId; });
}
