// Moving between screens, the way the canvas boards link to each other: tabs, pages pushed on top (Settings, a folder, a deck),
// sheets over a page (new card, new deck, deck settings, Learn), and full screens (review, session done, Learn mode).
import SwiftUI

/// Pages pushed on a tab: Settings, a deck, a folder, Check AI cards, someone's profile (yours is the Profile tab, not a
/// page: see `profile`), News, a shared deck's page, its suggestions (`suggestions("")`: every deck of yours), its History,
/// a class (by its code), Settings › Theme with a theme's page (its key), Settings › Connect AI, and a deck's Guide editor
/// (its deck, and the page it opens on: "" for the Guide itself).
enum Route: Hashable { case settings, deck(String), folder(String), inbox, profile(String), news, publicDeck(DeckAddress), suggestions(String), history(DeckAddress), classPage(String), themes, theme(String), connect, guide(String, String) }
enum SheetKind: Identifiable, Equatable {
  case newDeck, newCard(deckId: String?, cardId: String?), deckSettings(String), learnStart(String)
  /// The start of a practice test, over a deck's page or a folder's.
  case testStart(TestScope)
  /// The New folder popup (maybe for a deck that goes in it), or Rename on a folder's page; `name`: what's typed to start.
  case nameFolder(rename: String?, deck: String?, name: String)
  /// Edit profile (on your profile), and a copy's changes from the deck it came from (take or skip each).
  case editProfile, deckUpdates(String)
  /// A shared deck's Make a copy, and its Suggest a change (`start`: the card it opens on, "new", or "1").
  case copyDeck(DeckAddress), suggest(DeckAddress, start: String)
  /// Classes: the New class, Join a class, or Rename popup; a class's Add a deck and Assign sheets (by its code); Report a
  /// deck, a person, or a suggestion (its kind, id, and name); and Get verified.
  case classForm(ClassForm), classAdd(String), classAssign(String), report(kind: String, id: String, name: String), verify
  /// Go Pro (the paywall: Lucida Pro with the App Store), over any page or full screen.
  case goPro
  /// Delete account's question (Settings → Account), and Block's (someone's handle and name).
  case deleteAccount, block(handle: String, name: String)
  /// Make cards from a file, pictures, a recording, text, a link, or a topic (Screens/Make.swift), starting where the MakeStart says.
  case make(MakeStart)
  /// A deck's source opened (Screens/DeckMaterials.swift): the deck, the source, and the place in it a card pointed at ("p. 4", "12:40", or "").
  case source(deckId: String, id: String, at: String)
  var id: String {
    switch self {
    case .newDeck: return "newDeck"
    case .newCard(let d, let c): return "card-\(d ?? "")-\(c ?? "")"
    case .deckSettings(let d): return "settings-" + d
    case .learnStart(let d): return "learn-" + d
    case .testStart(let s): return "test-" + s.key
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
    case .goPro: return "goPro"
    case .deleteAccount: return "deleteAccount"
    case .block(let h, _): return "block-" + h
    case .make: return "make"
    case .source(let d, let i, _): return "source-\(d)-\(i)"
    }
  }
}
enum FullKind: Identifiable, Equatable {
  case review(deckId: String?, pile: String?), done, learn(String)
  /// A practice test (or its results), of a deck or a folder.
  case test(TestScope)
  /// Going over cards picked on the Stats page: "hard", "leech", or "tag:Organelles".
  case reviewSet(String)
  var id: String {
    switch self {
    case .review(let d, let p): return "review-\(d ?? "")-\(p ?? "")"
    case .reviewSet(let s): return "review-set-" + s
    case .done: return "done"
    case .learn(let d): return "learn-" + d
    case .test(let s): return "test-" + s.key
    }
  }
}

/// What the deck page is asked to show: a section ("cards", "notes" or "sources"), and in Sources a source (its id) open at a place in it ("p. 4", "12:40").
struct DeckWant: Equatable {
  var deckId: String, tab: String
  var source = "", at = ""
  var token = UUID()
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
  /// A list to pick from, over everything (Discover's filters, Edit profile's school, a deck's labels): see PickSheet.swift.
  @Published var picker: PickRequest?
  @Published var full: FullKind?
  /// A design screen's full screen, waiting for the page under it to be drawn (see MainView).
  var boardFull: FullKind?
  /// Where a review of the cards missed in a practice test goes when it ends: back to the test's results.
  var afterSet: FullKind?
  /// A page hides the tab bar (Suggestions, once one is opened).
  @Published var barHidden = false
  /// Edit profile opens once your profile is showing (Settings → Edit profile).
  var wantsEdit = false
  /// A deck page asked to show a section (and maybe a source): the Guide editor's Done asks for Notes, a card's "Made from" line for Sources with that source
  /// open. The deck's page takes it as soon as it's on screen.
  @Published var deckWants: DeckWant?

  /// A question is waiting for its answer from the server (Delete account, Block): its sheet stays until it comes.
  @Published var asking = false
  /// Back to Today with nothing open (signed out, or the account is gone).
  func reset() { sheet = nil; full = nil; boardFull = nil; path = []; tab = .today; libCards = false; libClasses = false; asking = false; barHidden = false }
  func push(_ r: Route) { path.append(r) }
  func back() { if !path.isEmpty { path.removeLast() } }
  func study(deckId: String?, pile: String? = nil) { withAnimation(Motion.sheet) { full = .review(deckId: deckId, pile: pile) } }
  /// Studies cards picked on the Stats page (a weak tag, the hardest cards, the ones you keep forgetting).
  func study(set: String) { withAnimation(Motion.sheet) { full = .reviewSet(set) } }
  func newCard(deckId: String?, cardId: String? = nil) { withAnimation(Motion.sheet) { sheet = .newCard(deckId: deckId, cardId: cardId) } }
  func newDeck() { withAnimation(Motion.sheet) { sheet = .newDeck } }
  /// Go Pro: the paywall opens over whatever is showing.
  func goPro() { withAnimation(Motion.sheet) { sheet = .goPro } }
  func importCards() { /* Import comes with the card editor. */ }
  /// Make cards from anything (the web's /make?source=&deck=&from=&guide=&page=): `kind` opens one kind's page (file, photo, record, paste,
  /// video, or topic; "" for the list), `deckId` is where the cards go, `from` is a kept source (its id) to make more cards from, and
  /// `guide` (a deck's id, with its `page`: "" or "main" for the Guide itself) is a Guide to make cards from. `text` starts it on Paste
  /// with those words (a Guide's selection), named `title`.
  func make(kind: String = "", deckId: String = "", from: String = "", guide: String = "", page: String = "", text: String = "", title: String = "") {
    withAnimation(.out(0.35)) { sheet = .make(MakeStart(kind: kind, deckId: deckId, from: from, guide: guide, page: page, text: text, title: title)) }
  }
  /// Learn mode: pick up where you stopped, or start from the sheet.
  func learn(deckId: String, resume: Bool) { withAnimation(Motion.sheet) { if resume { full = .learn(deckId) } else { sheet = .learnStart(deckId) } } }
  func close() { withAnimation(Motion.leave) { sheet = nil } }
  /// A review that ran out of cards: the session's summary if anything was graded.
  func finishReview(graded: Bool = true) { withAnimation(Motion.sheet) { full = graded ? .done : nil } }
  func closeFull() { withAnimation(Motion.sheet) { full = nil } }
  /// The end of a review of a set of cards: the page it was started from, or (cards missed in a test) the test's results.
  func endSet() { let back = afterSet; afterSet = nil; withAnimation(Motion.sheet) { full = back } }
  /// Leaving flashcards or Learn mode (X, or Done on the summary): straight to the deck's page, or to Today after a
  /// review of every deck (the web's endHref and doneHref). Every grade is saved already.
  func leave(to deckId: String?) {
    // Studying starts on the deck's page (or on Today, for every deck), so it's nearly always right there under the full
    // screen already. When it isn't, the page underneath changes first, at once, while the full screen still covers it;
    // then the full screen slides away, a moment later (when both happen in one update, the slide can stall).
    let there = deckId.map { path.last == .deck($0) } ?? (tab == .today && path.isEmpty)
    if there { withAnimation(Motion.sheet) { full = nil }; return }
    var now = Transaction(); now.disablesAnimations = true
    withTransaction(now) { if let id = deckId { path.append(.deck(id)) } else { pick(.today) } }
    DispatchQueue.main.async { withAnimation(Motion.sheet) { self.full = nil } }
  }
  /// Leaving a practice test (Leave, or Done on its results): the page it was started from, a deck's or a folder's.
  func leave(test scope: TestScope) {
    switch scope {
    case .deck(let id): leave(to: id)
    case .folder(let id):
      if path.last == .folder(id) { withAnimation(Motion.sheet) { full = nil }; return }
      var now = Transaction(); now.disablesAnimations = true
      withTransaction(now) { tab = .library; path = [.folder(id)] }
      DispatchQueue.main.async { withAnimation(Motion.sheet) { self.full = nil } }
    }
  }
  func pick(_ t: Tab) { path = []; tab = t }
  /// Someone's profile (`handle` "": yours). Yours is the Profile tab (`mine` says your handle), so opening it goes there
  /// instead of stacking a second copy of it on the page you're on.
  var mine: () -> String = { "" }
  func profile(_ handle: String) {
    if handle.isEmpty || handle.lowercased() == mine().lowercased() { pick(.profile) } else { push(.profile(handle)) }
  }
  /// Connect AI, which is a page inside Settings (its row in Settings opens it the same way): Settings is put under it, so
  /// its back button goes to Settings, and Settings' goes to where you were.
  func openConnect() {
    if path.last == .settings { push(.connect) } else { path += [.settings, .connect] }
  }
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
  /// A deck's source opened where a card came from: the deck's page on Sources, with the source open at that place (the card editor's "Made from" line).
  func openSource(deckId: String, id: String, at: String) {
    sheet = nil
    deckWants = DeckWant(deckId: deckId, tab: "sources", source: id, at: at)
    if path.last != .deck(deckId) { tab = .library; path = [.deck(deckId)] }
  }
  /// A deck's Guide editor, on a page of it ("" for the Guide itself).
  func guide(deckId: String, page: String = "") { push(.guide(deckId, page)) }
  /// A class's page, by its code.
  func classPage(_ code: String) { push(.classPage(code)) }
  /// A page on another site (Google Classroom's share page), in Safari.
  func open(_ url: URL?) { if let url { UIApplication.shared.open(url) } }
}
