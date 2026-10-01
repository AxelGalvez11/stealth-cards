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
  /// The board shows the Free app (its `free` setting): Pro's tools give way to what Pro adds.
  var free = false
  /// Deck settings opened with the goal already stepped up to 95% (the canvas's stepGoal), Stats on this tab, the Library's
  /// All cards on this filter ("leech" or "paused"), the card editor on this card, and the Tune to you row's state.
  var stepGoal = false, statsTab = "Overview", libState = "", editCard: String? = nil, tune = "on"
  /// Settings' plan: "Free", "Pro", "Pro, ending", "Pro, billed by Apple", or "Pro, billed on the web" (the canvas board's `plan`).
  var plan = "Pro"
  /// The Go Pro sheet's state on a design screen (its `state`: Yearly, Monthly, Buying, Error, Not yet, Offline, Loading, or
  /// Pro), the way to pay a tap picked, and whether a tap on Go Pro is going.
  var goPro = "Yearly", goProPick: String? = nil, goProBuying: Bool? = nil
  /// Settings' profile picture (the canvas board's `photo`: Color, Google photo, or Your photo, from `-photo`), as the
  /// canvas keeps it: the choice ("color", "google", or "yours"), the photo you uploaded ("mock", its stand-in), and
  /// the circle's color. The canvas's person signed in with Google, so Google photo is always there.
  var photo = "color", yourPhoto: String? = nil, color = 0
  /// The card editor: which kind of card, and whether you're typing (the keyboard is up).
  var cardType = "Basic"
  var editorTyping = false
  /// Review with the AI's explanation open (PhoneReviewExplain).
  var explainOpen = false
  /// The Library with its New folder popup open, this name typed (PhoneLibraryNewFolder).
  var naming: String? = nil
  /// Learn mode with its settings open (PhoneQuizSettings).
  var learnSettings = false
  /// The onboarding open on this step (PhoneWelcome and its twins: "Pick AI", "Steps", "Connected", "Pick source",
  /// "Source steps", "Found", or "Done").
  var welcomeStep = "Pick AI"
  /// The study network's boards: a page before its answer arrives (`loading`), nothing shared or new yet (`empty`), no
  /// one with that name (`missing`), you follow Maria (`following`), Edit profile open, your profile's tab, and
  /// Discover's search.
  var netLoading = false, netEmpty = false, missing = false, following = false, editOpen = false
  var profileTab = "Decks"
  var q = ""
  /// Discover's filters (the board's Tweaks, as words or ids), a school or level picker open ("Level", "Subject", or "School", with
  /// what's typed in it), and whether the sample person set a school (then "Popular at" it is the first row).
  var level = "", subject = "", school = "", pick = "", pickQ = "", mySchool = true
  /// A page's Report sheet open (the deck page, a profile, a suggestion), and your verification for the boards that show it
  /// ("", "Waiting for review", "Teacher", or "School": a verified teacher sees Check this deck; Settings says so).
  var report = false, verified = ""
  /// Settings' Daily reminder on a design screen: what the row says ("Off" or a time), and the line about allowing notifications.
  var reminder = "9:00 AM", reminderNote = false
  /// The Account group and the AI apps (their Tweaks): Delete account's question open ("Asking", "Deleting", or "Failed"), Password
  /// open, nobody blocked, and no apps allowed.
  var deleteOpen = "", passwordOpen = false, noBlocks = false, noApps = false
  /// Sign-in with a password instead of the code (the board's `passwordMode`).
  var passwordMode = false
  /// Someone else's profile: its ⋯ menu open, its Block question open, and the person blocked (Unblock).
  var moreOpen = false, blockOpen = false, blocked = false
  /// The sample deck's sharing (the deck page's Tweaks): "Link only" or "Public" (yours, shared), or from Maria:
  /// "study" (as it is) or "copy" (with her changes waiting); and the changes' sheet open.
  var shared = "", linked = "", updatesOpen = false
  /// The classes boards (their Tweaks): sharing your progress on, a sheet open ("add" or "assign"), Report and Get verified
  /// open, the New class or Join a class popup open ("new" or "join"), and Today with assignments from your classes.
  var classSharing = false, classPanel = "", classReport = false, classVerify = false, classForm = "", assignments = false
  /// Your theme (the Theme boards' `theme`: a key from web/themes/index.js, "lucida" for the app's own look), whether people
  /// who visit your profile see it, and which theme's page is open (PhoneTheme's `sheet`).
  var theme = "lucida", themeProfile = true, themeSheet = "aero"
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
  @Published var lib = Library() { didSet { allCardsMemo = nil; studyMemo = StudyMemo() } }
  /// Things the Pro study tools work out from the library (deep stats, review histories, a goal's cost), until it changes.
  var studyMemo = StudyMemo()
  /// Tune to you in progress (0 to 1), and what went wrong the last time.
  @Published var tuning: Double? = nil
  @Published var tuneError = ""
  /// The Library's All cards, worked out once per change to the library (see libraryCards).
  var allCardsMemo: [LibCard]? = nil
  @Published var demoDeck = DemoDeck()
  /// Sample cards paused or unpaused on a design screen (the canvas's pausedIds); All cards' Markovnikov card (a10) starts paused.
  @Published var demoPaused: [String: Bool] = [:]
  @Published var demoGraded = 0
  @Published var demoLearn = DemoLearn()
  /// What a design screen changed on the study network (Net.swift), and on a class (Classes.swift).
  @Published var demoNet = DemoNet()
  @Published var demoClass = DemoClass()
  /// The study network's answers (Net.swift, like web/net.js).
  let netCache = NetCache()
  /// What you changed on a profile, shown before the server's answer has it (Profile.swift), by handle.
  @Published var profileOver: [String: ProfileOver] = [:]
  /// When the app went to the background (coming back after ten minutes brings shared decks up to date).
  var away: Date? = nil
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
  /// The card on screen in a review, and when it came up: how long you take to answer it goes with its grade.
  var shown: (id: String, at: Double)?
  /// A deck waiting for "Delete" to be confirmed.
  @Published var confirmDelete: String?
  @Published var phase: Phase = .loading
  /// The welcome after your first sign-in is showing (Welcome.swift): it opens when your library is new (not welcomed
  /// yet, no decks) and stays until you finish or skip it, even once cards come in.
  @Published var welcoming = false
  @Published var error: String?
  let api = API()
  /// Lucida Pro bought with the App Store (Purchases.swift).
  lazy var shop = Shop(store: self)
  private var poll: Task<Void, Never>?
  private var renameTask: Task<Void, Never>?
  /// Changes shown before the server has them (saveNow): each stays on top of any newer copy until it's saved. And the
  /// last of their saves, which the next one waits for.
  private var mine: [(n: Int, apply: (inout Library) -> Void)] = []
  private var mineCount = 0
  private var line: Task<Void, Never>?

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
    return props.plan == "Free" || props.free ? Plan() : Plan(pro: true, every: "year", until: "2027-09-24T12:00:00Z", ending: props.plan == "Pro, ending",
                                                               by: ["Pro, billed by Apple": "apple", "Pro, billed on the web": "stripe"][props.plan] ?? "")
  }
  /// Pro's tools (an exam date, tuning, deep stats): on for Pro. A copy of the server on your own computer has nobody
  /// signed in, and everything is on there unless it runs as the Free app (like db.js isPro()).
  var isPro: Bool { demo ? !props.free && props.plan != "Free" : lib.pro && (lib.me == nil || plan.pro) }

  // ---------- loading and saving ----------
  func load() async {
    guard !demo else { return }
    #if DEBUG
    // `-dev <name>`: one of the made-up people on a copy of the server on this Mac (its lc_dev cookie), for trying the
    // study network as several people.
    if let name = Board.arg("-dev"), name != "none", let host = API.base.host,
       let c = HTTPCookie(properties: [.name: "lc_dev", .value: name, .domain: host, .path: "/", .expires: Date().addingTimeInterval(86400)]) {
      HTTPCookieStorage.shared.setCookie(c)
    }
    #endif
    do {
      // Decks you study from other people take their owners' newest changes as the app opens.
      lib = try await api.syncedState(); phase = .ready; startPolling()
      if !lib.settings.welcomed && lib.decks.isEmpty { welcoming = true }
      // Purchases made with the App Store reach the server (renewals, ones made elsewhere), and any this phone holds that it
      // hasn't heard about yet.
      shop.listen()
      Task {
        // Free: the App Store's prices are asked for now, so an upgrade card has them (and a purchase made elsewhere is found).
        if !plan.pro { await shop.load() }
        await shop.catchUp()
      }
    }
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
  func accept(_ next: Library) { if next.rev >= lib.rev { lib = withMine(next) } }
  /// Back after ten minutes or more away: decks you study from other people get their owners' newest changes, and the
  /// network's answers are asked for again (web/db.js).
  func cameBack() {
    guard !demo, phase == .ready, let a = away else { away = nil; return }
    away = nil
    guard Date().timeIntervalSince(a) > 600 else { return }
    Task { if let next = try? await api.syncedState() { accept(next); netDrop(); objectWillChange.send() } }
  }
  /// A copy of the library with the changes that aren't saved yet on top.
  private func withMine(_ next: Library) -> Library { var l = next; for m in mine { m.apply(&l) }; return l }

  /// One change on the server; the library comes back with it.
  @discardableResult
  func send(_ type: String, _ payload: [String: Any] = [:]) async -> [String: Any] { await sent(type, payload) ?? [:] }
  /// The same, nil when it didn't save (what went wrong shows, like the web app's alert).
  func sent(_ type: String, _ payload: [String: Any]) async -> [String: Any]? {
    guard !demo else { return [:] }
    do { let r = try await api.action(type, payload); accept(r.state); return r.result }
    catch APIError.signedOut { phase = .signedOut; return nil }
    catch { self.error = error.localizedDescription; return nil }
  }

  /// Switches, settings, and a deck's options (db.js saveNow): `local` shows the change here at once, and the saves go
  /// out one at a time, in order (the owner: the switch "looked dead" while the server took up to a second to answer,
  /// then jumped). If one fails, the app goes back to what's saved; offline, it takes the server's copy at the next check.
  @discardableResult
  func saveNow(_ type: String, _ payload: [String: Any], _ local: @escaping (inout Library) -> Void) -> Task<Void, Never> {
    mineCount += 1
    let n = mineCount, before = line
    mine.append((n, local))
    local(&lib)
    let task = Task { [weak self] in
      await before?.value
      guard let self else { return }
      let ok = await self.sent(type, payload) != nil
      self.mine.removeAll { $0.n == n }
      guard !ok else { return }
      if let saved = try? await self.api.state() { self.lib = self.withMine(saved) } else { self.lib.rev = 0 }
    }
    line = task
    return task
  }

  func cardCount(_ id: String) -> Int { demo ? (props.emptyDeck ? 0 : 412) : lib.cards.filter { $0.deckId == id }.count }

  /// A change shown right away, before the server answers (the server's copy replaces it when it comes back).
  func applyLocal(deck id: String, _ patch: [String: Any]) { Store.patch(&lib, deck: id, patch) }
  /// A deck's change (deck.update's patch) made to a copy of the library.
  static func patch(_ lib: inout Library, deck id: String, _ patch: [String: Any]) {
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
      case "exam": d.exam = v as? String
      case "leechAt": d.leechAt = v as? Int ?? d.leechAt
      case "leechAct": d.leechAct = v as? String ?? d.leechAct
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
                     rows: X.DECKS.prefix(4).enumerated().map { i, d in .init(id: d.id, name: d.name, sub: i == 0 ? (Store.demoExam(day: Store.sampleExamDay)?.line ?? "") : "\(d.fresh) new · \(d.total) cards", right: caught ? next[i] : String(d.due), mono: !caught, muted: caught) },
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
      return .init(id: d.id, name: d.name, sub: d.exam?.line ?? "\(d.fresh) new · \(d.totalLabel) cards", right: d.due > 0 ? String(d.due) : later, mono: d.due > 0, muted: d.due == 0)
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
