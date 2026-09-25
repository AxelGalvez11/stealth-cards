// The app's data: your library from Lucida's server, or (for the design screens) the canvas's sample data. Screens ask
// it the same questions the canvas boards ask theirs, and change things through it.
import SwiftUI

/// The canvas's sample data (design/mock.mjs SAMPLE).
struct Sample: Decodable {
  struct D: Decodable { let id: String; let name: String; let total: String; let due: Int; let overdue: Int; let soon: Int; let fresh: Int; let ret: Int; let ai: Int }
  struct C: Decodable { let id: String; let front: String; let back: String; let kind: String; let icon: String; let next: String; let ai: String; let tags: [String] }
  struct Due: Decodable { let vals: [Int]; let labels: [String]; let tops: [String]?; let names: [String] }
  /// A folder and the decks in it.
  struct F: Decodable { let id: String; let name: String; let decks: [String] }
  /// A card in All cards: [deck, front, back, icon, next, how hard, tags].
  struct A: Decodable {
    let deckId: String, front: String, back: String, icon: String, next: String, level: String, tags: [String]
    init(from d: Decoder) throws {
      var c = try d.unkeyedContainer()
      deckId = try c.decode(String.self); front = try c.decode(String.self); back = try c.decode(String.self); icon = try c.decode(String.self)
      next = try c.decode(String.self); level = try c.decode(String.self); tags = try c.decode([String].self)
    }
  }
  let DECKS: [D]
  let TAGS: [String: [String]]
  let CARDS: [C]
  let FOLDERS: [F]
  let ALL_CARDS: [A]
  let DUE_7: Due
  let DUE_14: Due
  /// The sample diagram's parts, hidden by boxes (image occlusion).
  let BOXES: [OccBox]
  static let shared: Sample = try! JSONDecoder().decode(Sample.self, from: Data(Generated.sampleJSON.utf8))
}

/// What a design screen starts with: the board's own settings (its "props" on the canvas).
struct DemoProps {
  var dark = false
  var caughtUp = false
  var newUser = false
  var emptyDeck = false
  var grading = "four"
  /// A deck's settings sheet open on this tab ("general" or "study").
  var deckSettings: String? = nil
  var tagPicker = false
  /// Review: which sample card (0 basic, 1 fill in the blank, 2 image, 3 audio), shown flipped or not, the progress
  /// style, and what's open.
  var cardIndex = 0
  var revealed = false
  var prog = "bar"
  var reviewSettings = false
  var newPile = false
  /// Session done after sorting into piles only; Stats with no reviews yet.
  var onlyPiles = false
  var noStats = false
  /// Settings on the design screen (darkMode: dark mode's look, "gray" on the canvas's Gray boards).
  var look = "system", darkMode = "black", grads = "mix", fsrs = true, check = true
  /// Learn mode on Free: the upgrade card instead of the start sheet.
  var upgrade = false
  /// Settings' plan: "Free", "Pro", or "Pro, ending" (the canvas board's `plan`).
  var plan = "Pro"
  /// The card editor: which kind of card, and whether you're typing (the keyboard is up).
  var cardType = "Basic"
  var editorTyping = false
  /// Review with the AI's explanation open (PhoneReviewExplain).
  var explainOpen = false
  /// The Library with its New folder popup open, this name typed (PhoneLibraryNewFolder).
  var naming: String? = nil
  /// Learn mode with its settings open (PhoneQuizSettings).
  var learnSettings = false
}

struct TodayVM {
  struct Row: Identifiable { let id: String; let name: String; let sub: String; let right: String; let mono: Bool; let muted: Bool }
  var hasDecks = true
  var caught = false
  var nothingNew = false
  var heroMeta = "", heroTitle = "", heroSub = "", heroCta = ""
  var heroSize: CGFloat = 56
  var rows: [Row] = []
  var newCardDeck: String?
}

@MainActor
final class Store: ObservableObject {
  enum Phase { case loading, signedOut, ready }
  /// The design screens: sample data, nothing saved.
  let demo: Bool
  @Published var props = DemoProps()
  @Published var lib = Library() { didSet { allCardsMemo = nil } }
  /// The Library's All cards, worked out once per change to the library (see libraryCards).
  var allCardsMemo: [LibCard]? = nil
  @Published var demoDeck = DemoDeck()
  @Published var demoGraded = 0
  @Published var demoLearn = DemoLearn()
  @Published var demoPiles: [(name: String, n: Int)] = [("Know it", 18), ("Almost", 6), ("No clue", 3)]
  /// The design screens' sample sound: playing or not, how far in, and a recording under way.
  @Published var demoPlaying = false
  @Published var demoFrac = 0.42
  @Published var demoRecording = false
  /// The Library's sample folders, and decks moved in or out of one on a design screen.
  @Published var demoFolders: [(id: String, name: String, decks: [String])] = Sample.shared.FOLDERS.map { ($0.id, $0.name, $0.decks) }
  @Published var demoMoved: [String: String?] = [:]
  /// Decks and cards dragged on a design screen: the Library's deck order, the deck page's card order, and cards moved to
  /// another deck (mock.mjs deckOrder, cardOrder, cardDeck).
  @Published var demoDeckOrder: [String] = Sample.shared.DECKS.map(\.id)
  @Published var demoCardOrder: [String] = Sample.shared.CARDS.map(\.id)
  @Published var demoCardDeck: [String: String] = [:]
  /// AI explanations being written, what went wrong asking for one (and whether Pro would help), by card; and how many
  /// free ones are left today (known once one is written on Free).
  @Published var explaining: Set<String> = []
  @Published var explainErr: [String: (error: String, pro: Bool)] = [:]
  @Published var aiLeftToday: Int? = nil
  /// Signing in: the email a code went to, and which page is showing.
  enum SignInStep { case email, code }
  @Published var signInStep: SignInStep = .email
  @Published var signInEmail = ""
  /// The review in progress (not published: the library changes with every grade anyway).
  var session: ReviewSession?
  /// A deck waiting for "Delete" to be confirmed.
  @Published var confirmDelete: String?
  @Published var phase: Phase = .loading
  @Published var error: String?
  let api = API()
  private var poll: Task<Void, Never>?
  private var renameTask: Task<Void, Never>?

  init(demo: Bool) {
    self.demo = demo
    if demo { phase = .ready; return }
    // A sound's waveform measured on this phone goes with its cards; another card may already have the one a file needs.
    Sound.shared.measured = { [weak self] file, w in self?.saveWave(file, w) }
    Sound.shared.known = { [weak self] file in self?.lib.cards.first { $0.audio == file && $0.wave != nil }?.wave }
  }

  var engine: Engine { Engine(S: lib) }
  var settings: UserSettings { lib.settings }
  /// Lucida Pro: from the server (Stripe), or on the design screens the board's setting.
  var plan: Plan {
    guard demo else { return lib.me?.plan ?? Plan() }
    return props.plan == "Free" ? Plan() : Plan(pro: true, every: "year", until: "2027-09-24T12:00:00Z", ending: props.plan == "Pro, ending")
  }
  /// Learn mode is Pro; on Free its button opens the upgrade card.
  /// A copy of the server on your own computer has nobody signed in, and everything is on there (like db.js pro()).
  var isPro: Bool { demo ? !props.upgrade : lib.me == nil || plan.pro }

  // ---------- loading and saving ----------
  func load() async {
    guard !demo else { return }
    do { lib = try await api.state(); phase = .ready; startPolling() }
    catch APIError.signedOut { phase = .signedOut }
    catch { self.error = error.localizedDescription; if phase == .loading { phase = .signedOut } }
  }

  /// Cards your AI adds over MCP show up without a reload (the web app asks every 2 seconds too).
  private func startPolling() {
    poll?.cancel()
    poll = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        guard let self, self.phase == .ready else { continue }
        if let rev = try? await self.api.rev(), rev > self.lib.rev, let next = try? await self.api.state() { self.accept(next) }
      }
    }
  }
  func accept(_ next: Library) { if next.rev >= lib.rev { lib = next } }

  /// One change on the server; the library comes back with it.
  @discardableResult
  func send(_ type: String, _ payload: [String: Any] = [:]) async -> [String: Any] {
    guard !demo else { return [:] }
    do { let r = try await api.action(type, payload); accept(r.state); return r.result }
    catch APIError.signedOut { phase = .signedOut; return [:] }
    catch { self.error = error.localizedDescription; return [:] }
  }

  func cardCount(_ id: String) -> Int { demo ? (props.emptyDeck ? 0 : 412) : lib.cards.filter { $0.deckId == id }.count }

  /// A change shown right away, before the server answers (the server's copy replaces it when it comes back).
  func applyLocal(deck id: String, _ patch: [String: Any]) {
    guard let i = lib.decks.firstIndex(where: { $0.id == id }) else { return }
    var d = lib.decks[i]
    for (k, v) in patch {
      switch k {
      case "name": d.name = v as? String ?? d.name
      case "tags": d.tags = v as? [String] ?? d.tags
      case "paused": d.paused = v as? Bool ?? d.paused
      case "grading": d.grading = v as? String ?? d.grading
      case "fsrs": d.fsrs = v as? Bool ?? d.fsrs
      case "goal": d.goal = v as? Int ?? d.goal
      case "gapIdx": d.gapIdx = v as? Int ?? d.gapIdx
      case "steps": d.steps = v as? [String] ?? d.steps
      case "perDay": d.perDay = v as? Int ?? d.perDay
      case "piles": d.piles = (v as? [[String: Any]])?.map { Pile(name: $0["name"] as? String ?? "Pile") } ?? d.piles
      case "cover":
        let c = v as? [String: Any] ?? [:]
        if let s = c["style"] as? String { d.cover.style = s }
        if let r = c["round"] as? Int { d.cover.round = r }
        if c.keys.contains("image") { d.cover.image = c["image"] as? String }
      case "folder": d.folder = v as? String
      case "bg":
        let b = v as? [String: Any] ?? [:]
        if let k = b["kind"] as? String { d.bg.kind = k }
        if b.keys.contains("image") { d.bg.image = b["image"] as? String }
      default: break
      }
    }
    lib.decks[i] = d
  }

  /// A name saves a moment after you stop typing.
  func renameDeck(_ id: String, _ name: String) {
    if demo { demoDeck.name = name; return }
    applyLocal(deck: id, ["name": name])
    renameTask?.cancel()
    renameTask = Task { try? await Task.sleep(nanoseconds: 400_000_000); if !Task.isCancelled { await send("deck.update", ["id": id, "patch": ["name": name]]) } }
  }

  func deleteDeck(_ id: String) async {
    guard !demo else { return }
    await send("deck.delete", ["id": id])
  }

  /// Learn mode is going for this deck (and not finished).
  func learnOn(_ id: String) -> Bool { !demo && learnActive(id) }

  /// A waveform measured on this phone is saved with the cards that play its file, quietly (if that fails, it's measured
  /// again next time).
  func saveWave(_ file: String, _ w: Wave) {
    guard !demo else { return }
    for i in lib.cards.indices where lib.cards[i].audio == file && lib.cards[i].wave == nil {
      lib.cards[i].wave = w
      let id = lib.cards[i].id
      Task { if let r = try? await api.action("card.update", ["id": id, "patch": ["wave": w.json]]) { accept(r.state) } }
    }
  }
  func exportDeck(_ id: String) {}

  // ---------- Today ----------
  func today() -> TodayVM {
    if demo {
      let X = Sample.shared, caught = props.caughtUp, next = ["Tomorrow", "Tomorrow", "In 2 days", "In 3 days"]
      if props.newUser { return TodayVM(hasDecks: false) }
      return TodayVM(caught: caught,
                     heroMeta: caught ? "Done for today · 13-day streak" : "Due now · 12-day streak", heroTitle: caught ? "All caught up" : "64 cards",
                     heroSub: caught ? "Next review tomorrow · 32 cards" : "About 11 minutes", heroCta: caught ? "Study 10 new cards" : "Start review",
                     heroSize: caught ? 42 : 56,
                     rows: X.DECKS.prefix(4).enumerated().map { i, d in .init(id: d.id, name: d.name, sub: "\(d.fresh) new · \(d.total) cards", right: caught ? next[i] : String(d.due), mono: !caught, muted: caught) },
                     newCardDeck: "cell")
    }
    let E = engine, td = E.today, caught = td.due == 0
    // Most urgent first: overdue cards, then cards due today, then whatever is due soonest.
    let decks = E.decks.filter { !$0.paused }.sorted { a, b in
      if a.overdue != b.overdue { return a.overdue > b.overdue }
      if a.due != b.due { return a.due > b.due }
      return (a.soon ?? Int.max) < (b.soon ?? Int.max)
    }
    let rows = decks.map { d -> TodayVM.Row in
      let later = d.soon == nil ? (d.fresh > 0 ? "\(d.fresh) new" : "—") : d.soon == 1 ? "Tomorrow" : "In \(d.soon!) days"
      return .init(id: d.id, name: d.name, sub: "\(d.fresh) new · \(d.totalLabel) cards", right: d.due > 0 ? String(d.due) : later, mono: d.due > 0, muted: d.due == 0)
    }
    let streak = td.streak > 0 ? " · \(td.streak)-day streak" : ""
    return TodayVM(hasDecks: !lib.decks.isEmpty, caught: caught, nothingNew: td.fresh == 0,
                   heroMeta: (caught ? "Done for today" : "Due now") + streak,
                   heroTitle: caught ? "All caught up" : plural(td.due, "card"),
                   heroSub: caught ? (td.next.map { "Next review \($0.day) · " + plural($0.n, "card") } ?? "Nothing scheduled yet") : "About " + plural(td.minutes, "minute"),
                   heroCta: caught ? (td.fresh > 0 ? "Study " + plural(td.fresh, "new card") : "Add cards") : "Start review",
                   heroSize: caught ? 42 : 56, rows: rows, newCardDeck: lib.decks.first?.id)
  }
}
