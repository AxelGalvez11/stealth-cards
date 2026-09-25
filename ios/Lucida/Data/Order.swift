// Dragging decks and cards (the owner: "allow users to drag decks and cards"): where things land, as web/order.js works
// it out. The app shows the new order at once and the server (deck.move and card.move) does the same math to save it,
// so the two agree. The Library lists decks in the library's own order; a deck's page lists its cards in its own order.
import Foundation

extension Library {
  /// Puts a deck just before another one (last without one), like order.js placeBefore.
  mutating func placeDeck(_ id: String, before: String?) {
    guard let at = decks.firstIndex(where: { $0.id == id }), id != before else { return }
    let d = decks.remove(at: at)
    decks.insert(d, at: before.flatMap { b in decks.firstIndex { $0.id == b } } ?? decks.count)
  }

  /// A deck's cards in the order its page lists them (deckCards): the order you dragged them into (its cardOrder), with
  /// any cards added since then first, newest first. A deck you never rearranged lists its newest cards first.
  func deckCards(_ deck: Deck?) -> [Card] {
    guard let deck else { return [] }
    var at: [String: Int] = [:]
    for (i, id) in (deck.cardOrder ?? []).enumerated() where at[id] == nil { at[id] = i }
    let mine = cards.filter { $0.deckId == deck.id }
    return mine.filter { at[$0.id] == nil }.reversed() + mine.filter { at[$0.id] != nil }.sorted { at[$0.id]! < at[$1.id]! }
  }

  /// Moves a card to just before another card of its deck (last without one), and keeps that as the deck's order
  /// (cardBefore).
  mutating func placeCard(_ id: String, before: String?) {
    guard let c = cards.first(where: { $0.id == id }), let di = decks.firstIndex(where: { $0.id == c.deckId }) else { return }
    var ids = deckCards(decks[di]).map(\.id).filter { $0 != id }
    ids.insert(id, at: before.flatMap { ids.firstIndex(of: $0) } ?? ids.count)
    decks[di].cardOrder = ids
  }

  /// Moves a card to another deck, with the other cards made from the same fill-in-the-blank text (they're one card to
  /// you) and their reviews, so each deck's numbers stay its own (cardToDeck). There it lists with the newest cards.
  mutating func moveCard(_ id: String, toDeck deckId: String) {
    guard let c = cards.first(where: { $0.id == id }) else { return }
    let moving = Set(c.group.map { g in cards.filter { $0.group == g }.map(\.id) } ?? [id])
    for i in decks.indices { if let o = decks[i].cardOrder { decks[i].cardOrder = o.filter { !moving.contains($0) } } }
    for i in cards.indices where moving.contains(cards[i].id) { cards[i].deckId = deckId }
    for i in logs.indices where moving.contains(logs[i].cardId) { logs[i].deckId = deckId }
  }
}

extension Store {
  /// `id` moved to just before `before` in a list (last without one), like mock.mjs's before().
  static func placing(_ list: [String], _ id: String, before: String?) -> [String] {
    var l = list.filter { $0 != id }
    l.insert(id, at: before.flatMap { l.firstIndex(of: $0) } ?? l.count)
    return l
  }

  /// Dragging a deck in the Library: to another spot, just before the deck `before` (last when it's nil).
  func reorderDeck(_ id: String, before: String?) {
    if demo { demoDeckOrder = Store.placing(demoDeckOrder, id, before: before); return }
    guard lib.decks.contains(where: { $0.id == id }) else { return }
    var l = lib; l.placeDeck(id, before: before); lib = l
    saveMove("deck.move", ["id": id, "before": before ?? NSNull()])
  }

  /// Into a folder, or out of one (nil): it goes last there (a deck's ⋯ menu, or dropping it on a folder or on Library).
  func moveDeck(_ id: String, to folder: String?) {
    if demo {
      guard demoFolderOf(id) != folder else { return }
      demoMoved[id] = .some(folder)
      demoDeckOrder = Store.placing(demoDeckOrder, id, before: nil)
      return
    }
    guard let i = lib.decks.firstIndex(where: { $0.id == id }), lib.decks[i].folder != folder else { return }
    var l = lib; l.decks[i].folder = folder; l.placeDeck(id, before: nil); lib = l
    saveMove("deck.move", ["id": id, "folder": folder ?? NSNull(), "before": NSNull()])
  }

  /// A card dragged on its deck's page: just before the card `before` (last when it's nil).
  func reorderCard(_ id: String, before: String?) {
    if demo { demoCardOrder = Store.placing(demoCardOrder, id, before: before); return }
    guard lib.cards.contains(where: { $0.id == id }) else { return }
    var l = lib; l.placeCard(id, before: before); lib = l
    saveMove("card.move", ["id": id, "before": before ?? NSNull()])
  }

  /// A card dropped on another deck in the Move to tray (its reviews go with it).
  func moveCard(_ id: String, toDeck deckId: String) {
    if demo { demoCardDeck[id] = deckId; return }
    guard let c = lib.cards.first(where: { $0.id == id }), c.deckId != deckId, lib.decks.contains(where: { $0.id == deckId }) else { return }
    var l = lib; l.moveCard(id, toDeck: deckId); lib = l
    saveMove("card.move", ["id": id, "deckId": deckId])
  }

  /// A drag is shown at once and saved after; if saving fails, the app goes back to what's saved.
  private func saveMove(_ type: String, _ payload: [String: Any]) {
    Task {
      do { accept(try await api.action(type, payload).state) }
      catch APIError.signedOut { phase = .signedOut }
      catch {
        self.error = error.localizedDescription
        if let saved = try? await api.state() { lib = saved }
      }
    }
  }
}
