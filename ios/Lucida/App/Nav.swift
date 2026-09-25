// Moving between screens, the way the canvas boards link to each other: tabs, pages pushed on top (Settings, a folder, a deck),
// sheets over a page (new card, new deck, deck settings, Learn), and full screens (review, session done, Learn mode).
import SwiftUI

enum Route: Hashable { case settings, deck(String), folder(String), inbox }
enum SheetKind: Identifiable, Equatable {
  case newDeck, newCard(deckId: String?, cardId: String?), deckSettings(String), learnStart(String)
  /// The New folder popup (maybe for a deck that goes in it), or Rename on a folder's page; `name`: what's typed to start.
  case nameFolder(rename: String?, deck: String?, name: String)
  var id: String {
    switch self {
    case .newDeck: return "newDeck"
    case .newCard(let d, let c): return "card-\(d ?? "")-\(c ?? "")"
    case .deckSettings(let d): return "settings-" + d
    case .learnStart(let d): return "learn-" + d
    case .nameFolder(let f, let d, _): return "folder-\(f ?? "")-\(d ?? "")"
    }
  }
}
enum FullKind: Identifiable, Equatable {
  case review(deckId: String?, pile: String?), done, learn(String)
  var id: String {
    switch self {
    case .review(let d, let p): return "review-\(d ?? "")-\(p ?? "")"
    case .done: return "done"
    case .learn(let d): return "learn-" + d
    }
  }
}

@MainActor
final class Nav: ObservableObject {
  @Published var tab: Tab = .today
  /// The Library shows All cards instead of your folders and decks.
  @Published var libCards = false
  @Published var path: [Route] = []
  @Published var sheet: SheetKind?
  @Published var full: FullKind?
  /// A design screen's full screen, waiting for the page under it to be drawn (see MainView).
  var boardFull: FullKind?

  func push(_ r: Route) { path.append(r) }
  func back() { if !path.isEmpty { path.removeLast() } }
  func study(deckId: String?, pile: String? = nil) { withAnimation(.out(0.35)) { full = .review(deckId: deckId, pile: pile) } }
  func newCard(deckId: String?, cardId: String? = nil) { withAnimation(.out(0.35)) { sheet = .newCard(deckId: deckId, cardId: cardId) } }
  func newDeck() { withAnimation(.out(0.35)) { sheet = .newDeck } }
  func importCards() { /* Import comes with the card editor. */ }
  /// Learn mode: pick up where you stopped, or start from the sheet.
  func learn(deckId: String, resume: Bool) { withAnimation(.out(0.35)) { if resume { full = .learn(deckId) } else { sheet = .learnStart(deckId) } } }
  func close() { withAnimation(.out(0.3)) { sheet = nil } }
  /// A review that ran out of cards: the session's summary if anything was graded.
  func finishReview(graded: Bool = true) { withAnimation(.out(0.35)) { full = graded ? .done : nil } }
  func closeFull() { withAnimation(.out(0.35)) { full = nil } }
  /// Leaving flashcards or Learn mode (X, or Done on the summary): straight to the deck's page, or to Today after a
  /// review of every deck (the web's endHref and doneHref). Every grade is saved already.
  func leave(to deckId: String?) {
    // Studying starts on the deck's page (or on Today, for every deck), so it's nearly always right there under the full
    // screen already. When it isn't, the page underneath changes first, at once, while the full screen still covers it;
    // then the full screen slides away, a moment later (when both happen in one update, the slide can stall).
    let there = deckId.map { path.last == .deck($0) } ?? (tab == .today && path.isEmpty)
    if there { withAnimation(.out(0.35)) { full = nil }; return }
    var now = Transaction(); now.disablesAnimations = true
    withTransaction(now) { if let id = deckId { path.append(.deck(id)) } else { pick(.today) } }
    DispatchQueue.main.async { withAnimation(.out(0.35)) { self.full = nil } }
  }
  func pick(_ t: Tab) { path = []; tab = t }
}
