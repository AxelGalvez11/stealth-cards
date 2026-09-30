// Moving between screens, the way the canvas boards link to each other: tabs, pages pushed on top (Settings, a folder, a deck),
// sheets over a page (new card, new deck, deck settings, Learn), and full screens (review, session done, Learn mode).
import SwiftUI

/// Pages pushed on a tab: Settings, a deck, a folder, Check AI cards, someone's profile (`profile("")` is yours), News, a
/// shared deck's page, its suggestions (`suggestions("")`: every deck of yours), its History, and a class (by its code).
enum Route: Hashable { case settings, deck(String), folder(String), inbox, profile(String), news, publicDeck(DeckAddress), suggestions(String), history(DeckAddress), classPage(String) }
enum SheetKind: Identifiable, Equatable {
  case newDeck, newCard(deckId: String?, cardId: String?), deckSettings(String), learnStart(String)
  /// The New folder popup (maybe for a deck that goes in it), or Rename on a folder's page; `name`: what's typed to start.
  case nameFolder(rename: String?, deck: String?, name: String)
  /// Edit profile (on your profile), and a copy's changes from the deck it came from (take or skip each).
  case editProfile, deckUpdates(String)
  /// A shared deck's Make a copy, and its Suggest a change (`start`: the card it opens on, "new", or "1").
  case copyDeck(DeckAddress), suggest(DeckAddress, start: String)
  /// Classes: the New class, Join a class, or Rename popup; a class's Add a deck and Assign sheets (by its code); Report a
  /// deck, a person, or a suggestion (its kind, id, and name); and Get verified.
  case classForm(ClassForm), classAdd(String), classAssign(String), report(kind: String, id: String, name: String), verify
  var id: String {
    switch self {
    case .newDeck: return "newDeck"
    case .newCard(let d, let c): return "card-\(d ?? "")-\(c ?? "")"
    case .deckSettings(let d): return "settings-" + d
    case .learnStart(let d): return "learn-" + d
    case .nameFolder(let f, let d, _): return "folder-\(f ?? "")-\(d ?? "")"
    case .editProfile: return "editProfile"
    case .deckUpdates(let d): return "updates-" + d
    case .copyDeck(let a): return "copy-" + a.key
    case .suggest(let a, _): return "suggest-" + a.key
    case .classForm(let f): return "classForm-" + f.id
    case .classAdd(let c): return "classAdd-" + c
    case .classAssign(let c): return "classAssign-" + c
    case .report(let k, let i, _): return "report-\(k)-\(i)"
    case .verify: return "verify"
    }
  }
}
enum FullKind: Identifiable, Equatable {
  case review(deckId: String?, pile: String?), done, learn(String)
  /// Going over cards picked on the Stats page: "hard", "leech", or "tag:Organelles".
  case reviewSet(String)
  var id: String {
    switch self {
    case .review(let d, let p): return "review-\(d ?? "")-\(p ?? "")"
    case .reviewSet(let s): return "review-set-" + s
    case .done: return "done"
    case .learn(let d): return "learn-" + d
    }
  }
}

@MainActor
final class Nav: ObservableObject {
  @Published var tab: Tab = .today
  /// The Library shows All cards instead of your folders and decks, or (`libClasses`) your classes.
  @Published var libCards = false
  /// A filter for All cards to start on, from the Stats page: "hard", "leech", or "paused".
  var libFilter: String? = nil
  @Published var libClasses = false
  @Published var path: [Route] = []
  @Published var sheet: SheetKind?
  @Published var full: FullKind?
  /// A design screen's full screen, waiting for the page under it to be drawn (see MainView).
  var boardFull: FullKind?
  /// A page hides the tab bar (Suggestions, once one is opened).
  @Published var barHidden = false
  /// Edit profile opens once your profile is showing (Settings → Edit profile).
  var wantsEdit = false

  func push(_ r: Route) { path.append(r) }
  func back() { if !path.isEmpty { path.removeLast() } }
  func study(deckId: String?, pile: String? = nil) { withAnimation(.out(0.35)) { full = .review(deckId: deckId, pile: pile) } }
  /// Studies cards picked on the Stats page (a weak tag, the hardest cards, the ones you keep forgetting).
  func study(set: String) { withAnimation(.out(0.35)) { full = .reviewSet(set) } }
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
  /// Someone's profile (`handle` "": yours).
  func profile(_ handle: String) { push(.profile(handle)) }
  /// A shared deck's page, from the path the server gives (/@maria/mcat-biochemistry or /d/<id>): `suggest` opens Suggest a
  /// change on it (a card's id, or "1"), `copy` opens Make a copy.
  func deckPage(_ path: String, copy: Bool = false, suggest: String = "") {
    guard var a = DeckAddress(path: path) else { return }
    a.copy = copy; a.suggest = suggest
    push(.publicDeck(a))
  }
  /// A shared deck's History, from its page's path.
  func history(_ path: String) { if let a = DeckAddress(path: path)?.plain { push(.history(a)) } }
  /// A deck in your Library (studying or copying one goes to it; so do Edit and Share settings on your own page).
  func openDeck(_ id: String, settings: Bool = false) {
    tab = .library; path = [.deck(id)]
    sheet = settings ? .deckSettings(id) : nil
  }
  /// A class's page, by its code.
  func classPage(_ code: String) { push(.classPage(code)) }
  /// A page on another site (Google Classroom's share page), in Safari.
  func open(_ url: URL?) { if let url { UIApplication.shared.open(url) } }
}
