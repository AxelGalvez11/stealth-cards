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

  func push(_ r: Route) { path.append(r) }
  func back() { if !path.isEmpty { path.removeLast() } }
  func study(deckId: String?, pile: String? = nil) { withAnimation(.out(0.35)) { full = .review(deckId: deckId, pile: pile) } }
  func newCard(deckId: String?, cardId: String? = nil) { withAnimation(.out(0.35)) { sheet = .newCard(deckId: deckId, cardId: cardId) } }
  func newDeck() { withAnimation(.out(0.35)) { sheet = .newDeck } }
  func importCards() { /* Import comes with the card editor. */ }
  /// Learn mode: pick up where you stopped, or start from the sheet.
  func learn(deckId: String, resume: Bool) { withAnimation(.out(0.35)) { if resume { full = .learn(deckId) } else { sheet = .learnStart(deckId) } } }
  func close() { withAnimation(.out(0.3)) { sheet = nil } }
  /// Ending a review: the session's summary if anything was graded.
  func finishReview(graded: Bool = true) { withAnimation(.out(0.35)) { full = graded ? .done : nil } }
  func closeFull() { withAnimation(.out(0.35)) { full = nil } }
  /// Done on the summary: back to where you were.
  func endSession() { withAnimation(.out(0.35)) { full = nil } }
  func pick(_ t: Tab) { path = []; tab = t }
}
