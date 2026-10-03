// Lucida for iPhone. Every screen is one of the design canvas's iPhone boards, drawn natively at the same sizes.
// Launch with `-board <Name>` (for example -board PhoneLibrary) to open a board with the canvas's sample data.
import SwiftUI
import UserNotifications

@main
struct LucidaApp: App {
  @StateObject private var store: Store
  @StateObject private var nav: Nav
  /// Dragging decks and cards (Drag.swift).
  @State private var drag: DragCenter

  init() {
    Fonts.register()
    #if DEBUG && targetEnvironment(simulator)
    StoreKitTesting.startIfAsked()
    #endif
    let store = Store(demo: Board.requested != nil), nav = Nav(), drag = DragCenter()
    nav.mine = { [weak store] in store?.myHandle ?? "" }
    // The daily reminder's notice opens the Library (Data/Reminder.swift), from a cold start too, so the phone hears about taps from here on.
    ReminderTap.shared.open = { [weak nav] in guard let nav else { return }; nav.libCards = false; nav.pick(.library) }
    UNUserNotificationCenter.current().delegate = ReminderTap.shared
    // A design screen starts where its board is, before anything draws.
    if let b = Board.requested { Board.setUp(b, store: store, nav: nav, drag: drag) }
    _store = StateObject(wrappedValue: store)
    _nav = StateObject(wrappedValue: nav)
    _drag = State(initialValue: drag)
  }

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(store)
        .environmentObject(nav)
        .environment(drag)
    }
  }
}

/// A canvas board to open straight away (design screens), from the launch arguments.
enum Board {
  static var requested: String? { arg("-board") }
  /// The launch argument after `name`.
  static func arg(_ name: String) -> String? {
    let a = ProcessInfo.processInfo.arguments
    guard let i = a.firstIndex(of: name), i + 1 < a.count else { return nil }
    return a[i + 1]
  }
}

struct RootView: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @Environment(\.colorScheme) private var scheme
  @Environment(\.scenePhase) private var scenePhase
  /// A study screen with a theme sets the window's light or dark itself (StudyChrome, for the status bar and keyboard); the
  /// phone's own is kept here until it lets go, so it isn't mistaken for the phone's setting.
  @ObservedObject private var chrome = StudyChrome.shared
  @State private var system: ColorScheme? = nil
  /// The theme's light or dark, while its study screen is up (not once it starts to slide away).
  private var over: ColorScheme? { nav.full != nil || nav.camera != nil ? chrome.scheme : nil }

  var body: some View {
    let look = store.demo ? store.props.look : store.settings.look
    let dark = look == "dark" || (look == "system" && (store.demo ? store.props.dark : (system ?? scheme) == .dark))
    // Dark mode's look (Settings → Dark mode): gray or black.
    let t = Theme(dark: dark, gray: (store.demo ? store.props.darkMode : store.settings.darkMode) == "gray")
    ZStack {
      t.bg.ignoresSafeArea()
      switch store.phase {
      case .loading: Color.clear
      case .signedOut: if store.signInStep == .code { SignInCodeScreen(start: store.demo ? "482" : "") } else { SignInScreen() }
      case .ready: MainView()
      }
    }
    .environment(\.theme, t)
    .environment(\.flipsOn, store.flipOn)
    .preferredColorScheme(over ?? (dark ? .dark : .light))
    .onChange(of: scheme, initial: true) { _, s in if over == nil { system = s } }
    #if DEBUG
    // The reminder's end-to-end test reads what is scheduled from this invisible element (`-reminderAudit`).
    .overlay(alignment: .bottomLeading) { if ProcessInfo.processInfo.arguments.contains("-reminderAudit") { ReminderAuditView() } }
    // The end-to-end test reads which themes' pictures are on screen from this invisible element (ThemeAudit).
    .overlay(alignment: .topLeading) {
      if ThemeAudit.on {
        TimelineView(.periodic(from: .now, by: 0.25)) { _ in
          Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("themeAudit").accessibilityValue(ThemeAudit.shared.summary)
        }
      }
    }
    // The haptics that fired (`-hapticAudit`) and what the deck cover is doing (`-parallaxAudit`), read the same way.
    .overlay(alignment: .topLeading) { if HapticLog.on { HapticAudit() } }
    .overlay(alignment: .topLeading) { if ParallaxAudit.on { ParallaxReadout() } }
    .overlay(alignment: .topLeading) { if PopAudit.on { PopReadout() } }
    #endif
    .onChange(of: store.skinKey) { _, k in if let k, !store.demo { ThemeArt.shared.warm(k, store) } }
    // Signed out (or the account deleted): nothing of the last person's is left open for the next.
    .onChange(of: store.phase) { _, p in if p == .signedOut && !store.demo { nav.reset() } }
    // Back after a while away: decks you study from other people get their owners' newest changes.
    .onChange(of: scenePhase) { _, p in if p == .background { store.away = Date() } else if p == .active { store.cameBack() } }
    // What went wrong saving a change or uploading a photo, in a quiet message (the web app's too), never the system's alert.
    .overlay { if let e = store.error, store.phase == .ready { ToastHost(text: e) { withAnimation(Motion.leave) { store.error = nil } }.id(e) } }
    .animation(Motion.pop, value: store.error)
    .task {
      #if DEBUG
      // `-themeProbe <theme> -probeOut <folder>`: paints a few pieces of a theme and saves them (ThemeProbe.swift).
      if let key = ThemeProbe.requested { try? await Task.sleep(nanoseconds: 800_000_000); await ThemeProbe.run(key) }
      #endif
      if !store.demo {
        DevSignIn.apply()
        await store.load()
        // A theme in use is warmed up (its details, background, card faces, pictures, and covers), so nothing flashes.
        if let k = store.skinKey { ThemeArt.shared.warm(k, store) }
        // A practice test that was open when the app closed is open again, where it was (its deck's or folder's page under it).
        if let T = store.testing {
          nav.tab = .library; nav.path = [T.scope.folderId.map { Route.folder($0) } ?? .deck(T.deckId ?? "")]; nav.full = .test(T.scope)
        }
        Task { try? await Task.sleep(nanoseconds: 5_000_000_000); await store.retuneWhenDue() }
        #if DEBUG
        // `-reminderIn <seconds>`: the daily reminder's notice, once, that many seconds from now (for the test that taps it).
        if let s = Board.arg("-reminderIn").flatMap(Double.init) { Task { await Reminder.shared.soon(s) } }
        // `-check pause|exam|grade|learn|tune|free`: an end-to-end check of the Pro tools against the server (DebugChecks.swift).
        if let name = DebugChecks.requested { await DebugChecks.run(name, store) }
        // `-open review`, `-open deck`, `-open stats`, ...: go straight to a page (for checking screens with real data).
        let a = ProcessInfo.processInfo.arguments
        if let i = a.firstIndex(of: "-open"), i + 1 < a.count {
          let first = store.lib.decks.first?.id ?? ""
          switch a[i + 1] {
          case "review":
            nav.full = .review(deckId: nil, pile: nil)
            // `-grade 3`: grade the first card (checks saving without tapping).
            if let g = a.firstIndex(of: "-grade"), g + 1 < a.count, let rating = Int(a[g + 1]) {
              try? await Task.sleep(nanoseconds: 1_500_000_000)
              let rv = store.review(nil, pile: nil)
              if !rv.empty { store.grade(rv.card.id, rating) }
            }
          case "deck": nav.tab = .library; nav.path = [.deck(first)]
          // A deck's Guide editor: the first deck's, or `guide:<deck name>` (and `guide:<deck name>:<page id>`).
          case "guide": nav.tab = .library; nav.path = [.deck(first), .guide(first, "")]
          case let o where o.hasPrefix("guide:"):
            let x = String(o.dropFirst(6)).split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
            if let d = store.lib.decks.first(where: { $0.name == x[0] }) { nav.tab = .library; nav.path = [.deck(d.id), .guide(d.id, x.count > 1 ? x[1] : "")] }
          // The Library (the app's first page; `today` is the old Today page's name for it).
          case "library", "today": nav.tab = .library
          // The New deck sheet, and Settings › Theme (with `-theme <key>` a theme's page).
          case "newdeck": nav.tab = .library; nav.sheet = .newDeck
          // Make cards from anything (`-makeFile`, `-makePhoto`, `-makeRecording`, `-makeTopic`, `-makeText`, `-makeVideo` open it with that already in).
          case "make": nav.sheet = .make(MakeStart())
          // Import cards (`-importFile <path>` reads that file into it as if it was chosen), or `import:<deck name>` over that deck, with it chosen.
          case "import": nav.tab = .library; nav.sheet = .importCards("")
          case let o where o.hasPrefix("import:"):
            if let d = store.lib.decks.first(where: { $0.name == String(o.dropFirst(7)) }) { nav.tab = .library; nav.path = [.deck(d.id)]; nav.sheet = .importCards(d.id) }
          // Learn mode on the first deck's questions (multiple choice and true or false), started as Start learning would.
          case "learnq": if store.startLearn(first, set: "all", kinds: ["mc", "tf", "blank"]) { nav.tab = .library; nav.path = [.deck(first)]; nav.full = .learn(first) }
          case "themes": nav.path = [.settings, .themes]
          case let o where o.hasPrefix("theme:"): nav.path = [.settings, .themes, .theme(String(o.dropFirst(6)))]
          case "cards": nav.tab = .library; nav.libCards = true
          case "stats": nav.tab = .stats
          // Stats on one of Pro's tabs: `-open stats -tab Memory` (or Weak spots, Pace).
          case "statsdeep": nav.tab = .stats; store.props.statsTab = Board.arg("-tab") ?? "Memory"
          // Connect AI is a page inside Settings: Settings › Connect AI.
          case "connect": nav.path = [.settings, .connect]
          case "settings": nav.path = [.settings]
          // Get verified, over Settings (the web's /verify).
          case "verify": nav.path = [.settings]; nav.sheet = .verify
          // The Go Pro sheet over the page you're on.
          case "gopro": nav.goPro()
          case "discover": nav.tab = .discover
          case "news": nav.path = [.news]
          case "profile": nav.tab = .profile
          // `deckpage:<path>`: a shared deck's page (/@maria/mcat-biochemistry); `history:<path>`: its History;
          // `suggestions`: every deck's suggestions.
          case let o where o.hasPrefix("deckpage:"): if let a = DeckAddress(path: String(o.dropFirst(9))) { nav.tab = .discover; nav.path = [.publicDeck(a)] }
          case let o where o.hasPrefix("history:"): if let a = DeckAddress(path: String(o.dropFirst(8)))?.plain { nav.tab = .discover; nav.path = [.history(a)] }
          case "suggestions": nav.tab = .library; nav.path = [.suggestions("")]
          // `report:<deck|profile|suggestion>:<id>[:<name>]`: the Report sheet for that deck (its shared id), person (their
          // handle), or suggestion, even where its page wouldn't offer it (for checking what the server says when it says no).
          case let o where o.hasPrefix("report:"):
            let x = o.split(separator: ":", maxSplits: 3, omittingEmptySubsequences: false).map(String.init)
            if x.count >= 3 { nav.sheet = .report(kind: x[1], id: x[2], name: x.count > 3 ? x[3] : x[2]) }
          case let o where o.hasPrefix("suggestions:"):
            if let d = store.lib.decks.first(where: { $0.name == String(o.dropFirst(12)) }) { nav.tab = .library; nav.path = [.suggestions(d.id)] }
          case "learn": nav.tab = .library; nav.path = [.deck(first)]; nav.sheet = .learnStart(first)
          case "decksettings": nav.tab = .library; nav.path = [.deck(first)]; nav.sheet = .deckSettings(first)
          // The welcome after the first sign-in, whether or not this library is new.
          case "welcome": store.welcoming = true
          // `profile:<handle>`: someone's profile; `deck:<name>`: the deck with that name.
          case let o where o.hasPrefix("profile:"): nav.path = [.profile(String(o.dropFirst(8)))]
          case let o where o.hasPrefix("deck:"):
            if let d = store.lib.decks.first(where: { $0.name == String(o.dropFirst(5)) }) { nav.tab = .library; nav.path = [.deck(d.id)] }
          // `folder:<name>`: the folder with that name.
          case let o where o.hasPrefix("folder:"):
            if let f = store.lib.folders.first(where: { $0.name == String(o.dropFirst(7)) }) { nav.tab = .library; nav.path = [.folder(f.id)] }
          default: break
          }
        }
        if let s = MakeDebug.start { nav.sheet = .make(s) }
        if ImportDebug.file != nil && nav.sheet == nil { nav.sheet = .importCards("") }
        // `-deckTab notes|sources` (with `-deckSource <id>` and `-deckAt "p. 4"`): the deck page that is open asks for that section, and a source open at that place (like the web's
        // /deck/<id>?tab=sources&source=<id>&at=p.%204).
        if let tab = Board.arg("-deckTab"), case .deck(let did)? = nav.path.last { nav.deckWants = DeckWant(deckId: did, tab: tab, source: Board.arg("-deckSource") ?? "", at: Board.arg("-deckAt") ?? "") }
        // `-upload profile|cover|bg <file>`: that picture goes up as a picked photo would (your profile photo, or the first
        // deck's header or background); `-sound <file>`: that sound, as the card editor's Upload would.
        if let i = a.firstIndex(of: "-upload"), i + 2 < a.count, let data = FileManager.default.contents(atPath: a[i + 2]) {
          let kind = a[i + 1], first = store.lib.decks.first?.id ?? ""
          if let url = await store.upload(picture: data, side: kind == "profile" ? Upload.profileSide : Upload.side) {
            switch kind {
            case "profile": store.setYourPhoto(url)
            case "cover": store.setCover(first, url)
            default: store.setBgPhoto(first, url)
            }
          }
        }
        if let i = a.firstIndex(of: "-sound"), i + 1 < a.count { _ = await store.pickSound(URL(fileURLWithPath: a[i + 1])) }
        // `-diagramUpload <file>`: that picture goes up as a diagram of the deck that is open, as Upload's picker would send it (the simulator has no photos to pick).
        if let i = a.firstIndex(of: "-diagramUpload"), i + 1 < a.count, case .deck(let did)? = nav.path.last {
          await store.diagrams.upload(store, deckId: did, file: URL(fileURLWithPath: a[i + 1]))
        }
        // `-tap fsrs|check|pause|remove-photo`: taps that switch (or Remove on your photo) 2 seconds in, doing what the
        // button does (checks a switch moves before the server answers).
        if let i = a.firstIndex(of: "-tap"), i + 1 < a.count {
          try? await Task.sleep(nanoseconds: 2_000_000_000)
          switch a[i + 1] {
          case "fsrs": store.setSetting(["fsrs": !store.settings.fsrs])
          case "check": store.setCheck(!store.lib.ai.perms.check)
          case "pause": if let d = store.lib.decks.first { store.updateDeck(d.id, ["paused": !d.paused]) }
          case "remove-photo": store.removePhoto()
          default: break
          }
        }
        #endif
      }
    }
  }
}

extension Board {
  /// The shared deck the boards show: Maria Santos's MCAT Biochemistry.
  static func sampleDeck(copy: Bool = false, suggest: String = "") -> DeckAddress { DeckAddress(handle: "mariasantos", slug: "mcat-biochemistry", copy: copy, suggest: suggest) }
  /// Puts the app where a board is: its sample data, its page, and its sheet.
  @MainActor static func setUp(_ name: String, store: Store, nav: Nav, drag: DragCenter) {
    // A board's dark twin ends in Dark; its gray one (dark mode's gray look) in Gray.
    store.props.dark = name.hasSuffix("Dark") || name.hasSuffix("Gray")
    if name.hasSuffix("Gray") { store.props.darkMode = "gray" }
    switch name.replacingOccurrences(of: "Dark", with: "").replacingOccurrences(of: "Gray", with: "") {
    case "PhoneDeck": nav.tab = .library; nav.path = [.deck("cell")]
    // A deck's Notes page (its view: -state Writing, "Block menu", "Format bar", "Toggle open", "Toggle closed", "Section folded", "Blank note",
    // "Reading on a shared deck", "Older versions" or "A new page").
    case "PhoneGuide": nav.tab = .library; nav.path = [.guide(Board.sampleDeckId, "")]
    case "PhoneDeckEmpty": store.props.emptyDeck = true; nav.tab = .library; nav.path = [.deck("pharm")]
    case "PhoneDeckSettings": store.props.deckSettings = "general"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckSettingsStudy": store.props.deckSettings = "study"; nav.tab = .library; nav.path = [.deck("cell")]
    // The goal already stepped up to 95% (its cost counts from 90%), and the Free app's Studying (what Pro adds).
    case "PhoneDeckSettingsStudyFree": store.props.deckSettings = "study"; store.props.free = true; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneReview": nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewFour": store.props.revealed = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewCheck": store.props.revealed = true; store.props.grading = "binary"; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewPiles": store.props.revealed = true; store.props.grading = "piles"; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewNewPile": store.props.revealed = true; store.props.grading = "piles"; store.props.newPile = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewBlank": store.props.cardIndex = 1; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewSettings": store.props.reviewSettings = true; store.props.prog = "counts"; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneDone": nav.full = .done
    case "PhoneDonePiles": store.props.onlyPiles = true; nav.full = .done
    case "PhoneStats": nav.tab = .stats
    case "PhoneStatsMemory": store.props.statsTab = "Memory"; nav.tab = .stats
    case "PhoneStatsWeak": store.props.statsTab = "Weak spots"; nav.tab = .stats
    case "PhoneStatsPace": store.props.statsTab = "Pace"; nav.tab = .stats
    case "PhoneStatsUpgrade": store.props.free = true; store.props.statsTab = "Weak spots"; nav.tab = .stats
    case "PhoneStatsEmpty": store.props.noStats = true; nav.tab = .stats
    case "PhoneDecksEmpty": store.props.newUser = true; nav.tab = .library
    case "PhoneLibrary": nav.tab = .library
    case "PhoneLibraryCards": nav.tab = .library; nav.libCards = true
    case "PhoneLibraryFolder": nav.tab = .library; nav.path = [.folder("f1")]
    // The New folder popup, with a name typed (the phone's own keyboard is up); it opens once the Library is showing.
    case "PhoneLibraryNewFolder": nav.tab = .library; store.props.naming = "Biology"
    // A deck's page while a card is dragged: the Move to tray, with its first deck lit.
    case "PhoneDeckMoveTray":
      nav.tab = .library; nav.path = [.deck("cell")]
      drag.showTray(Sample.shared.DECKS.filter { $0.id != "cell" }.map { TrayDeck(id: $0.id, name: $0.name, mesh: Mesh.deck(seed: $0.name)) })
    case "PhoneReviewExplain": store.props.revealed = true; store.props.explainOpen = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneConnect": nav.path = [.settings, .connect]
    case "PhoneSettings": nav.path = [.settings]
    case "PhoneSettingsFree": store.props.plan = "Free"; nav.path = [.settings]
    // The Go Pro sheet over Settings on Free (its states with `-goPro Monthly|Buying|Error|"Not yet"|Offline|Loading|Pro`), and before the subscriptions are on the App Store.
    case "PhoneGoPro": store.props.plan = "Free"; nav.path = [.settings]; nav.sheet = .goPro
    case "PhoneGoProSoon": store.props.plan = "Free"; store.props.goPro = "Not yet"; nav.path = [.settings]; nav.sheet = .goPro
    // A verified teacher's Settings: Get verified says Verified teacher (the board's `verified`: -verified "Waiting for review" or School).
    case "PhoneSettingsVerified": store.props.verified = "Teacher"; nav.path = [.settings]
    // Get verified's sheet over Settings (the canvas's PhoneSettingsGetVerified; -verified "Waiting for review" shows it sent).
    case "PhoneSettingsGetVerified": nav.path = [.settings]; nav.sheet = .verify
    case "PhoneNewDeck": nav.sheet = .newDeck
    // Import cards over the Library, in one of the canvas's states (`-state Pasted`, "A file picked", "No cards", Empty, Importing, Error; "Deck chosen" when it's left out).
    case "PhoneImport": nav.tab = .library; nav.sheet = .importCards("")
    // Make cards over the Library, on one of the canvas's steps (`-state Review`, or any name in MakeSample.steps; Pick when it's left out).
    case "PhoneMake": nav.tab = .library; nav.sheet = .make(MakeStart(demo: MakeSample.name(Board.arg("-state"))))
    case "PhoneEditor": store.props.editorTyping = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    // Editing a card that's paused (Unpause card), from the sample's first card.
    case "PhoneEditorPaused": store.props.editCard = "k1"; store.demoPaused["k1"] = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: "k1")
    case "PhoneEditorImage": store.props.cardType = "Image"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneEditorAudio": store.props.cardType = "Audio"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneEditorRecording": store.props.cardType = "Audio"; store.demoRecording = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneReviewImage": store.props.cardIndex = 2; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewAudio": store.props.cardIndex = 3; store.demoPlaying = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneInbox": nav.path = [.settings, .inbox]
    case "PhoneQuizStart": nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .learnStart("cell")
    case "PhoneQuiz": nav.full = .learn("cell")
    case "PhoneQuizAnswered": store.demoLearn.pick = 1; nav.full = .learn("cell")
    case "PhoneQuizMatch": store.demoLearn.screen = "match"; nav.full = .learn("cell")
    case "PhoneQuizType": store.demoLearn.screen = "type"; nav.full = .learn("cell")
    case "PhoneQuizDone": store.demoLearn.screen = "done"; nav.full = .learn("cell")
    case "PhoneQuizSettings": store.props.learnSettings = true; nav.full = .learn("cell")
    // The practice test: its screen is the board's `screen` Tweak (-screen "Results · missed", -screen Matching, ...), and its timer the
    // `timed` Tweak (-timed false).
    case "PhoneTest":
      store.props.testScreen = Board.arg("-screen") ?? "Set up"; store.props.testTimed = Board.arg("-timed") != "false"; store.demoTest.screen = store.props.testScreen
      nav.tab = .library; nav.path = [.deck("cell")]
      if store.props.testScreen == "Set up" { nav.sheet = .testStart(.deck("cell")) } else { nav.full = .test(.deck("cell")) }
    // The onboarding, open on one of its steps (the canvas's PhoneWelcome with its `step`).
    case "PhoneWelcome": store.welcoming = true
    case "PhoneWelcomeClaude": store.welcoming = true; store.props.welcomeStep = "Steps"
    case "PhoneWelcomeConnected": store.welcoming = true; store.props.welcomeStep = "Connected"
    case "PhoneWelcomeImport": store.welcoming = true; store.props.welcomeStep = "Pick source"
    case "PhoneWelcomeAnki": store.welcoming = true; store.props.welcomeStep = "Source steps"
    case "PhoneWelcomeFound": store.welcoming = true; store.props.welcomeStep = "Found"
    case "PhoneWelcomeDone": store.welcoming = true; store.props.welcomeStep = "Done"
    // The study network: Discover, profiles (yours and Maria's), News, and the sample deck shared or from Maria.
    case "PhoneDiscover": nav.tab = .discover
    case "PhoneDiscoverSearch": nav.tab = .discover; store.props.q = "bio"
    case "PhoneProfile": nav.tab = .profile
    case "PhoneProfileOther": nav.path = [.profile("mariasantos")]
    case "PhoneProfileFollowing": store.props.following = true; nav.path = [.profile("mariasantos")]
    case "PhoneProfileEdit": store.props.editOpen = true; nav.tab = .profile
    case "PhoneProfileSaved": store.props.profileTab = "Saved"; nav.tab = .profile
    case "PhoneProfileSuggestions": store.props.profileTab = "Suggestions"; nav.tab = .profile
    case "PhoneProfileEmpty": store.props.netEmpty = true; nav.tab = .profile
    case "PhoneProfileLoading": store.props.netLoading = true; nav.tab = .profile
    case "PhoneProfileMissing": store.props.missing = true; nav.path = [.profile("nobody")]
    case "PhoneProfileReport": store.props.report = true; nav.path = [.profile("mariasantos")]
    // Someone else's ⋯ menu (`-moreOpen`), its Block question, and someone you blocked (Unblock).
    case "PhoneProfileBlock": store.props.blockOpen = true; nav.path = [.profile("mariasantos")]
    case "PhoneProfileBlocked": store.props.blocked = true; nav.path = [.profile("mariasantos")]
    // Settings with Delete account's question open.
    case "PhoneSettingsDelete": store.props.deleteOpen = "Asking"; nav.path = [.settings]
    case "PhoneActivity": nav.path = [.news]
    case "PhoneActivityEmpty": store.props.netEmpty = true; nav.path = [.news]
    case "PhoneDeckStudied": store.props.linked = "study"; nav.tab = .library; nav.path = [.deck("cell")]
    // The deck page with its Study menu (Flashcards, Learn) or its + menu (New card, Make cards, Source, Notes, Upload diagram, Make diagram) open.
    case "PhoneDeckStudyMenu": store.props.deckMenu = "Study"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckAddMenu": store.props.deckMenu = "Add"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckCopy": store.props.linked = "copy"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckUpdates": store.props.linked = "copy"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .deckUpdates("cell")
    case "PhoneDeckSettingsShare": store.props.shared = "Public"; store.props.deckSettings = "share"; nav.tab = .library; nav.path = [.deck("cell")]
    // A shared deck's page (Maria's MCAT Biochemistry): as a learner, studying it, as its owner, with Make a copy or Suggest a
    // change open; its suggestions (yours: Cell Biology), and its History.
    case "PhonePublicDeck": nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck())]
    case "PhonePublicDeckStudying": store.demoNet.pages.studying = true; nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck())]
    case "PhonePublicDeckOwner": store.demoNet.pages.owner = true; nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck())]
    case "PhonePublicDeckCopy": nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck(copy: true))]
    case "PhonePublicDeckSuggest": nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck(suggest: "c2"))]
    case "PhonePublicDeckSuggestNew": nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck(suggest: "new"))]
    // Report on the deck's page (its sheet open), and a verified teacher's view of it (Check this deck).
    case "PhonePublicDeckReport": store.props.report = true; nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck())]
    case "PhonePublicDeckCheck": store.props.verified = "Teacher"; nav.tab = .discover; nav.path = [.publicDeck(Board.sampleDeck())]
    case "PhoneSuggestions":
      // The dark board shows one opened.
      if name.hasSuffix("Dark") { store.demoNet.pages.pickItem = "g1" }
      nav.tab = .library; nav.path = [.suggestions("cell")]
    case "PhoneSuggestionsOpen": store.demoNet.pages.pickItem = "g1"; nav.tab = .library; nav.path = [.suggestions("cell")]
    case "PhoneSuggestionsReport": store.props.report = true; store.demoNet.pages.pickItem = "g1"; nav.tab = .library; nav.path = [.suggestions("cell")]
    case "PhoneSuggestionsEmpty": store.demoNet.pages.noSuggestions = true; store.demoNet.pages.aiWaiting = false; nav.tab = .library; nav.path = [.suggestions("cell")]
    case "PhoneHistory":
      if name.hasSuffix("Dark") { store.demoNet.pages.openVersion = 14 }
      nav.tab = .library; nav.path = [.history(Board.sampleDeck().plain)]
    case "PhoneHistoryOpen": store.demoNet.pages.openVersion = 14; nav.tab = .library; nav.path = [.history(Board.sampleDeck().plain)]
    case "PhoneSignIn": store.phase = .signedOut
    case "PhoneSignInCode": store.phase = .signedOut; store.signInStep = .code
    // Settings › Theme (on Pro with Rubber hose in use, and on Free), and a theme's page (Frutiger Aero, not yet in use).
    case "PhoneThemePicker": store.props.theme = "hose"; nav.path = [.settings, .themes]
    case "PhoneThemePickerFree": store.props.plan = "Free"; nav.path = [.settings, .themes]
    case "PhoneTheme": nav.path = [.settings, .themes, .theme(Board.arg("-sheet") ?? "aero")]
    default:
      // A theme on the real screens: Theme<Board>ReviewPhone (flashcards, turned over) and Theme<Board>ProfilePhone (Settings).
      if let b = Board.themeBoard(name) {
        store.props.theme = b.key
        if b.screen == "review" { store.props.revealed = true; nav.full = .review(deckId: "cell", pile: nil) } else { nav.path = [.settings] }
      }
    }
    if let k = Board.arg("-goPro") { store.props.goPro = k }
    // The Library boards' Tweak: `-caughtUp` (nothing due).
    if ProcessInfo.processInfo.arguments.contains("-caughtUp") { store.props.caughtUp = true }
    // Settings' Flip animation on a design screen: `-flip Off` (on when it's left out).
    if Board.arg("-flip") == "Off" { store.props.flip = false }
    // Settings' Daily reminder: `-reminder Off|"6:00 PM"|...`, and `-reminderNote` (Off, with the line about allowing notifications).
    if let k = Board.arg("-reminder") { store.props.reminder = k }
    if ProcessInfo.processInfo.arguments.contains("-reminderNote") { store.props.reminderNote = true; store.props.reminder = "Off" }
    // The Settings, Profile, Connect AI, and sign-in boards' Tweaks: `-plan "Pro, billed by Apple"`, `-deleteOpen Asking|Deleting|Failed`,
    // `-passwordOpen`, `-noBlocks`, `-noApps`, `-moreOpen`, `-blocked`, `-passwordMode`.
    if let k = Board.arg("-plan") { store.props.plan = k }
    if let k = Board.arg("-deleteOpen") { store.props.deleteOpen = k }
    let flags = ProcessInfo.processInfo.arguments
    if flags.contains("-passwordOpen") { store.props.passwordOpen = true }
    if flags.contains("-noBlocks") { store.props.noBlocks = true }
    if flags.contains("-noApps") { store.props.noApps = true }
    if flags.contains("-moreOpen") { store.props.moreOpen = true }
    if flags.contains("-blockOpen") { store.props.blockOpen = true }
    if flags.contains("-blocked") { store.props.blocked = true }
    if flags.contains("-passwordMode") { store.props.passwordMode = true }
    // `-theme <key>`: any board in a theme (the Theme boards' `skin`).
    if let k = Board.arg("-theme") { store.props.theme = k }
    // The Guide and Sources boards' settings (their Tweaks): `-state <value>` is whichever setting the board has (the Guide editor's view; the deck page's section or what its
    // Guide and Sources hold; the shared deck page's Guide), or by name: `-section Notes`, `-guide "Guide pages"`, `-sourceOpen x4`, `-sourceAt "p. 4"`, `-madeFrom no`.
    guideSettings(name, store: store)
    // The Settings boards' Tune to you state (their `tune` Tweak): `-tune Off`, `-tune "Not enough reviews"`, or `-tune Tuning`.
    if let k = Board.arg("-tune") { store.props.tune = ["Off": "off", "Not enough reviews": "few", "Tuning": "busy"][k] ?? "on" }
    // Discover's filters and pickers (their Tweaks): `-level College`, `-subject Biology`, `-school "University of California-Davis"`,
    // `-pick School` (or Level, Subject) with `-pickQ davis` typed in it, and `-mySchool false` for someone with no school.
    if let v = Board.arg("-level") { store.props.level = v }
    if let v = Board.arg("-subject") { store.props.subject = v }
    if let v = Board.arg("-school") { store.props.school = v }
    if let v = Board.arg("-pick") { store.props.pick = v }
    if let v = Board.arg("-pickQ") { store.props.pickQ = v }
    if Board.arg("-mySchool") == "false" { store.props.mySchool = false }
    // The boards that show your verification (their `verified` Tweak): `-verified "Waiting for review"`, `Teacher`, or `School`.
    if let v = Board.arg("-verified") { store.props.verified = v }
    // The Settings boards' photo setting (their Tweak on the canvas): `-photo "Google photo"` or `-photo "Your photo"`
    // (Color when it's left out), with the canvas's stand-in for the photo.
    switch Board.arg("-photo") {
    case "Google photo": store.props.photo = "google"
    case "Your photo": store.props.photo = "yours"; store.props.yourPhoto = "mock"
    default: break
    }
    // A full screen (review, session done, Learn mode) opens once the page under it is drawn: a page drawn under one from
    // the start stays blank after it closes, so X or Done would land on an empty page.
    if let f = nav.full { nav.boardFull = f; nav.full = nil }
  }
}

extension Board {
  /// The sample deck's id (Cell Biology) the boards use.
  static let sampleDeckId = "cell"
  /// The launch arguments that set the Guide and Sources boards (see setUp).
  @MainActor static func guideSettings(_ board: String, store: Store) {
    let st = arg("-state") ?? ""
    if board.hasPrefix("PhoneGuide") { store.props.guideView = GuideSample.views.contains(st) ? st : "Writing" }
    else if ["Cards", "Notes", "Diagrams", "Sources"].contains(st) { store.props.section = st }
    else if GuideSample.states.contains(st) || DiagramSample.isState(st) { store.props.guideState = st }
    if let v = arg("-section") { store.props.section = v }
    if let v = arg("-guide") { store.props.guideState = v }
    if let v = arg("-sourceOpen") { store.props.sourceOpen = v }
    if let v = arg("-sourceAt") { store.props.sourceAt = v }
    if let v = arg("-madeFrom") { store.props.madeFrom = !["no", "false", "off", "0"].contains(v.lowercased()) }
  }
}

/// The tabs, with pages pushed on top of them.
struct MainView: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @Environment(\.theme) private var t
  @Environment(DragCenter.self) private var drag
  /// Tabs the person changed (a tap on the tab bar, or a swipe): each gives a selection haptic.
  @State private var tabTicks = 0
  /// Haptics for what happens as a sheet closes or a deck goes (Buzz).
  @ObservedObject private var buzz = Buzz.shared

  /// A swipe between tabs can start: a tab's first page is showing, and nothing is over it.
  private var swipesBetweenTabs: Bool { nav.path.isEmpty && nav.sheet == nil && nav.full == nil && !store.welcoming && drag.list == nil }

  var body: some View {
    // A question, a calendar or the camera is over everything: VoiceOver reads only that, so the page under it is hidden from it. (Only the views that
    // have something to read get the modifier: it would also make the empty drag layer a thing on screen, one the tests' taps would land on.)
    let behind = nav.question != nil || nav.calendar != nil || nav.camera != nil
    // (A sheet that covers the page, like Make cards or a diagram opened, hides it the same way: a deck cover's own Make cards is under it, and
    // only the sheet's should be found.)
    let page = behind || covering
    return ZStack(alignment: .bottom) {
      NavigationStack(path: $nav.path) {
        // A swipe left or right on a tab's first page moves to the next tab or the one before (Design/Swipe.swift).
        TabPager(tab: $nav.tab, enabled: swipesBetweenTabs, changed: { tabTicks += 1 }) { tab in tabRoot(tab) }
          .toolbar(.hidden, for: .navigationBar)
          // A swipe from the left edge goes back on every pushed page (the pages draw their own Back button, which turns UIKit's off).
          .background(BackSwipe(canPop: { nav.sheet == nil && nav.full == nil && drag.list == nil }))
          // Every page on the theme's page color (the stack's own is the system's white or black, not dark mode's gray).
          .containerBackground(t.bg, for: .navigation)
          .navigationDestination(for: Route.self) { route in
            Group {
              switch route {
              case .settings: SettingsScreen()
              case .deck(let id): DeckScreen(id: id)
              case .folder(let id): LibraryScreen(folderId: id)
              case .inbox: InboxScreen()
              case .profile(let h): ProfileScreen(handle: h)
              case .news: NewsScreen()
              case .publicDeck(let a): PublicDeckScreen(addr: a)
              case .suggestions(let id): SuggestionsScreen(deckId: id)
              case .history(let a): HistoryScreen(addr: a)
              case .themes: ThemePickerScreen(shop: store.shop)
              case .theme(let key): ThemePageScreen(key: key)
              case .connect: ConnectScreen()
              case .guide(let id, let page): GuideScreen(deckId: id, page: page)
              }
            }
            .toolbar(.hidden, for: .navigationBar)
            .background(BackSwipe(canPop: { nav.sheet == nil && nav.full == nil && drag.list == nil }))
            .containerBackground(t.bg, for: .navigation)
          }
      }
      .accessibilityHidden(page)
      if showsTabBar { TabBar(active: lit, pick: { tab in if tab != nav.tab { tabTicks += 1 }; nav.pick(tab) }).accessibilityHidden(page) }
      // A deck or card being dragged, over the page and the tab bar; and the Move to tray over it while a card is.
      DragGhost()
      MoveTray()
      if let s = nav.sheet { SheetHost(kind: s).accessibilityHidden(behind).zIndex(s == .goPro ? 8 : 5) }
      if let f = nav.full { FullHost(kind: f).accessibilityHidden(behind).zIndex(6).sheetTransition() }
      // A list to pick from (a filter, a school, a label), over a page or a sheet.
      if let p = nav.picker { PickHost(request: p).accessibilityHidden(behind).id(p.id).zIndex(7) }
      // The welcome after your first sign-in, over everything until it's done or skipped.
      if store.welcoming { WelcomeScreen().accessibilityHidden(behind).zIndex(10).transition(.opacity) }
      // A calendar under the button that opened it (an exam date, a due date), over a page or a sheet.
      if let c = nav.calendar { CalendarHost(request: c).id(c.id).zIndex(9) }
      // A question (Delete deck, Sign out, ...), over everything: Lucida's own sheet, never the system's confirmation dialog.
      if let q = nav.question { QuestionHost(request: q).id(q.id).zIndex(11) }
      // Lucida's own camera (Take a photo in Make cards), over everything.
      if let c = nav.camera { CameraHost(request: c).id(c.id).zIndex(12).sheetTransition() }
    }
    .ignoresSafeArea(edges: .bottom)
    // What opens over everything puts the keyboard away first (a list with a search of its own, the school list, keeps it for that).
    .onChange(of: nav.question?.id) { _, id in if id != nil { Keyboard.hide() } }
    .onChange(of: nav.calendar?.id) { _, id in if id != nil { Keyboard.hide() } }
    .onChange(of: nav.camera?.id) { _, id in if id != nil { Keyboard.hide() } }
    .onChange(of: nav.picker?.id) { _, id in if id != nil, nav.picker?.find == nil { Keyboard.hide() } }
    .haptic(.selection, on: tabTicks, "tab")
    .sensoryFeedback(.impact(weight: .light), trigger: buzz.lights)
    .sensoryFeedback(.success, trigger: buzz.successes)
    .sensoryFeedback(.warning, trigger: buzz.warnings)
    // A design screen's full screen, over its page once that's drawn (Board.setUp).
    .task { if let f = nav.boardFull { nav.boardFull = nil; try? await Task.sleep(nanoseconds: 100_000_000); nav.full = f } }
    // A design screen's open question (the boards' `ask` Tweak: `-ask "Delete deck"`, the same words the app asks), over the page once that's drawn.
    .task {
      guard store.demo, let name = Board.arg("-ask"), let q = AskSample.request(name) else { return }
      try? await Task.sleep(nanoseconds: 700_000_000)
      withAnimation(Motion.sheet) { nav.question = q }
    }
  }

  /// A sheet over the whole page (Make cards, a source or a diagram opened, Make diagram): the page under it is hidden from VoiceOver.
  private var covering: Bool {
    guard let s = nav.sheet else { return false }
    switch s {
    case .make, .importCards, .source, .diagram, .makeDiagram, .publicDiagram: return true
    default: return false
    }
  }

  /// A tab's first page.
  @ViewBuilder private func tabRoot(_ tab: Tab) -> some View {
    switch tab {
    case .library: LibraryScreen()
    case .discover: DiscoverScreen()
    case .stats: StatsScreen()
    case .profile: ProfileScreen(handle: "")
    }
  }
  /// Pages the canvas draws without the tab bar: Settings, Check AI cards, News (and a suggestion once it's opened), the
  /// themes, Connect AI (a page inside Settings), and everything inside a deck: its page, a shared deck's page, its History
  /// and its Suggestions (the owner, 2026-10-02: "inside a deck remove this here").
  private var showsTabBar: Bool {
    switch nav.path.last {
    case .none, .folder, .profile: return true
    case .suggestions(let deckId): return deckId.isEmpty && !nav.barHidden
    default: return false
    }
  }
  /// The tab that's lit: your own profile lights Profile and someone else's lights none (it's no tab's page); a shared deck's
  /// page lights Discover; its History lights the Library for a deck of yours (Discover for someone's), and Suggestions the
  /// Library.
  private var lit: Tab? {
    switch nav.path.last {
    case .profile(let h): return h.isEmpty || h.lowercased() == store.myHandle.lowercased() ? .profile : nil
    case .publicDeck: return .discover
    case .suggestions: return .library
    case .history(let a): return store.ownsAddress(a) ? .library : .discover
    default: return nav.tab
    }
  }
}

/// Sheets over the page (and over the tab bar), like the canvas draws them.
struct SheetHost: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let kind: SheetKind
  var body: some View {
    switch kind {
    case .deckSettings(let id): DeckSettingsHost(id: id)
    case .newDeck: SheetOverlay(top: nil, radius: 36, close: nav.close) { NewDeckSheet(demo: store.demo) }
    case .newCard(let deckId, let cardId): SheetOverlay(top: 56, radius: 36, close: nav.close) { EditorSheet(deckId: deckId ?? store.lib.decks.first?.id, cardId: cardId) }
    // Learn mode is free for everyone (the owner, 2026-09-29).
    case .learnStart(let id): SheetOverlay(top: nil, radius: 36, close: nav.close) { LearnStartSheet(deckId: id) }
    case .testStart(let s): SheetOverlay(top: nil, radius: 32, close: nav.close) { TestStartSheet(scope: s) }
    case .nameFolder(let rename, let deck, let name): FolderPopup(rename: rename, deck: deck, start: name)
    case .editProfile: SheetOverlay(top: 56, radius: 36, close: nav.close) { EditProfileSheet() }
    case .deckUpdates(let id): SheetOverlay(top: 56, close: nav.close) { DeckUpdatesSheet(deckId: id) }
    case .copyDeck(let a): SheetOverlay(top: nil, radius: 32, close: nav.close) { CopyDeckSheet(addr: a) }
    case .suggest(let a, let start): SheetOverlay(top: 56, radius: 32, close: nav.close) { SuggestSheet(addr: a, start: start) }
    case .report(let kind, let id, let name): SheetOverlay(top: nil, close: nav.close) { ReportSheet(kind: kind, id: id, name: name) }
    case .verify: SheetOverlay(top: nil, close: nav.close) { VerifySheet() }
    case .goPro: SheetOverlay(top: 56, radius: 32, close: nav.close) { GoProSheet(shop: store.shop) }
    case .deleteAccount: SheetOverlay(top: nil, close: { if !nav.asking { nav.close() } }) { DeleteAccountSheet() }
    case .block(let handle, let name): SheetOverlay(top: nil, close: { if !nav.asking { nav.close() } }) { BlockSheet(handle: handle, name: name) }
    case .make(let s): MakeHost(start: s, store: store, nav: nav)
    case .importCards(let d): ImportHost(deckId: d, store: store, nav: nav)
    case .source(let d, let i, let at): SourceHost(deckId: d, id: i, at: at)
    case .diagram(let d, let i): DiagramHost(deckId: d, id: i)
    case .makeDiagram(let d): MakeDiagramHost(deckId: d)
    case .publicDiagram(let a, let i): PublicDiagramHost(addr: a, id: i)
    }
  }
}

struct DeckSettingsHost: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let id: String
  @State private var tab = "general"
  var body: some View {
    let d = store.deck(id)
    SheetOverlay(top: 56, close: nav.close) {
      DeckSettingsSheet(d: d, tab: $tab, close: nav.close)
    }
    .onAppear { if store.demo { tab = store.props.deckSettings ?? "general" } }
  }
}

/// Full screens: a review, its summary, Learn mode.
struct FullHost: View {
  @Environment(\.theme) private var t
  let kind: FullKind
  var body: some View {
    Group {
      switch kind {
      case .review(let d, let p): ReviewScreen(deckId: d, pile: p)
      case .reviewSet(let set): ReviewScreen(deckId: nil, pile: nil, set: set)
      case .done: DoneScreen()
      case .learn(let id): LearnScreen(deckId: id)
      case .test(let s): TestScreen(scope: s)
      }
    }
    .background(t.bg.ignoresSafeArea())
  }
}
