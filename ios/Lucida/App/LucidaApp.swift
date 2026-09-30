// Lucida for iPhone. Every screen is one of the design canvas's iPhone boards, drawn natively at the same sizes.
// Launch with `-board <Name>` (for example -board PhoneToday) to open a board with the canvas's sample data.
import SwiftUI

@main
struct LucidaApp: App {
  @StateObject private var store: Store
  @StateObject private var nav: Nav
  /// Dragging decks and cards (Drag.swift).
  @State private var drag: DragCenter

  init() {
    Fonts.register()
    let store = Store(demo: Board.requested != nil), nav = Nav(), drag = DragCenter()
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

  var body: some View {
    let look = store.demo ? store.props.look : store.settings.look
    let dark = look == "dark" || (look == "system" && (store.demo ? store.props.dark : scheme == .dark))
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
    .preferredColorScheme(dark ? .dark : .light)
    .onChange(of: store.skinKey) { _, k in if let k, !store.demo { ThemeArt.shared.warm(k, store) } }
    // Back after a while away: decks you study from other people get their owners' newest changes.
    .onChange(of: scenePhase) { _, p in if p == .background { store.away = Date() } else if p == .active { store.cameBack() } }
    // What went wrong saving a change or uploading a photo, like the web app's alert.
    .alert(store.error ?? "", isPresented: Binding(get: { store.error != nil && store.phase == .ready }, set: { if !$0 { store.error = nil } })) {
      Button("OK", role: .cancel) {}
    }
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
        Task { try? await Task.sleep(nanoseconds: 5_000_000_000); await store.retuneWhenDue() }
        #if DEBUG
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
          case "library": nav.tab = .library
          // The New deck sheet, and Settings › Theme (with `-theme <key>` a theme's page).
          case "newdeck": nav.tab = .library; nav.sheet = .newDeck
          // Learn mode on the first deck's questions (multiple choice and true or false), started as Start learning would.
          case "learnq": if store.startLearn(first, set: "all", kinds: ["mc", "tf", "blank"]) { nav.tab = .library; nav.path = [.deck(first)]; nav.full = .learn(first) }
          case "themes": nav.path = [.settings, .themes]
          case let o where o.hasPrefix("theme:"): nav.path = [.settings, .themes, .theme(String(o.dropFirst(6)))]
          case "cards": nav.tab = .library; nav.libCards = true
          case "stats": nav.tab = .stats
          // Stats on one of Pro's tabs: `-open stats -tab Memory` (or Weak spots, Pace).
          case "statsdeep": nav.tab = .stats; store.props.statsTab = Board.arg("-tab") ?? "Memory"
          case "connect": nav.tab = .connect
          case "settings": nav.path = [.settings]
          case "discover": nav.tab = .discover
          case "news": nav.path = [.news]
          case "profile": nav.path = [.profile("")]
          case "learn": nav.tab = .library; nav.path = [.deck(first)]; nav.sheet = .learnStart(first)
          case "decksettings": nav.tab = .library; nav.path = [.deck(first)]; nav.sheet = .deckSettings(first)
          // The welcome after the first sign-in, whether or not this library is new.
          case "welcome": store.welcoming = true
          // `profile:<handle>`: someone's profile; `deck:<name>`: the deck with that name.
          case let o where o.hasPrefix("profile:"): nav.path = [.profile(String(o.dropFirst(8)))]
          case let o where o.hasPrefix("deck:"):
            if let d = store.lib.decks.first(where: { $0.name == String(o.dropFirst(5)) }) { nav.tab = .library; nav.path = [.deck(d.id)] }
          default: break
          }
        }
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
  /// Puts the app where a board is: its sample data, its page, and its sheet.
  @MainActor static func setUp(_ name: String, store: Store, nav: Nav, drag: DragCenter) {
    // A board's dark twin ends in Dark; its gray one (dark mode's gray look) in Gray.
    store.props.dark = name.hasSuffix("Dark") || name.hasSuffix("Gray")
    if name.hasSuffix("Gray") { store.props.darkMode = "gray" }
    switch name.replacingOccurrences(of: "Dark", with: "").replacingOccurrences(of: "Gray", with: "") {
    case "PhoneTodayCaughtUp": store.props.caughtUp = true
    case "PhoneTodayNew": store.props.newUser = true
    case "PhoneDeck": nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckEmpty": store.props.emptyDeck = true; nav.tab = .library; nav.path = [.deck("pharm")]
    case "PhoneDeckSettings": store.props.deckSettings = "general"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckSettingsStudy": store.props.deckSettings = "study"; nav.tab = .library; nav.path = [.deck("cell")]
    // The goal already stepped up to 95% (its cost counts from 90%), and the Free app's Studying (what Pro adds).
    case "PhoneDeckSettingsGoal": store.props.deckSettings = "study"; store.props.stepGoal = true; store.demoDeck.goal = 95; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckSettingsStudyFree": store.props.deckSettings = "study"; store.props.free = true; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckTagPicker": store.props.deckSettings = "general"; store.props.tagPicker = true; nav.tab = .library; nav.path = [.deck("cell")]
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
    // All cards on the ones you keep forgetting (Pause all).
    case "PhoneLibraryLeeches": nav.tab = .library; nav.libCards = true; store.props.libState = "leech"
    case "PhoneLibraryFolder": nav.tab = .library; nav.path = [.folder("f1")]
    // The New folder popup, with a name typed (the phone's own keyboard is up); it opens once the Library is showing.
    case "PhoneLibraryNewFolder": nav.tab = .library; store.props.naming = "Biology"
    // A deck's page while a card is dragged: the Move to tray, with its first deck lit.
    case "PhoneDeckMoveTray":
      nav.tab = .library; nav.path = [.deck("cell")]
      drag.showTray(Sample.shared.DECKS.filter { $0.id != "cell" }.map { TrayDeck(id: $0.id, name: $0.name, mesh: Mesh.deck(seed: $0.name)) })
    case "PhoneReviewExplain": store.props.revealed = true; store.props.explainOpen = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneConnect": nav.tab = .connect
    case "PhoneSettings": nav.path = [.settings]
    case "PhoneSettingsFree": store.props.plan = "Free"; nav.path = [.settings]
    case "PhoneNewDeck": nav.sheet = .newDeck
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
    case "PhoneProfile": nav.path = [.profile("")]
    case "PhoneProfileOther": nav.path = [.profile("mariasantos")]
    case "PhoneProfileFollowing": store.props.following = true; nav.path = [.profile("mariasantos")]
    case "PhoneProfileEdit": store.props.editOpen = true; nav.path = [.profile("")]
    case "PhoneProfileSaved": store.props.profileTab = "Saved"; nav.path = [.profile("")]
    case "PhoneProfileSuggestions": store.props.profileTab = "Suggestions"; nav.path = [.profile("")]
    case "PhoneProfileEmpty": store.props.netEmpty = true; nav.path = [.profile("")]
    case "PhoneProfileLoading": store.props.netLoading = true; nav.path = [.profile("")]
    case "PhoneProfileMissing": store.props.missing = true; nav.path = [.profile("nobody")]
    case "PhoneActivity": nav.path = [.news]
    case "PhoneActivityEmpty": store.props.netEmpty = true; nav.path = [.news]
    case "PhoneDeckStudied": store.props.linked = "study"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckCopy": store.props.linked = "copy"; nav.tab = .library; nav.path = [.deck("cell")]
    case "PhoneDeckUpdates": store.props.linked = "copy"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .deckUpdates("cell")
    case "PhoneDeckSettingsShare": store.props.shared = "Public"; store.props.deckSettings = "share"; nav.tab = .library; nav.path = [.deck("cell")]
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
    // `-theme <key>`: any board in a theme (the Theme boards' `skin`).
    if let k = Board.arg("-theme") { store.props.theme = k }
    // The Settings boards' Tune to you state (their `tune` Tweak): `-tune Off`, `-tune "Not enough reviews"`, or `-tune Tuning`.
    if let k = Board.arg("-tune") { store.props.tune = ["Off": "off", "Not enough reviews": "few", "Tuning": "busy"][k] ?? "on" }
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

/// The tabs, with pages pushed on top of them.
struct MainView: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @Environment(\.theme) private var t

  var body: some View {
    ZStack(alignment: .bottom) {
      NavigationStack(path: $nav.path) {
        tabRoot
          .toolbar(.hidden, for: .navigationBar)
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
              case .themes: ThemePickerScreen()
              case .theme(let key): ThemePageScreen(key: key)
              }
            }
            .toolbar(.hidden, for: .navigationBar)
            .containerBackground(t.bg, for: .navigation)
          }
      }
      // A profile lights up no tab (it's no tab's page).
      if showsTabBar { TabBar(active: { if case .profile = nav.path.last { return nil }; return nav.tab }(), pick: nav.pick) }
      // A deck or card being dragged, over the page and the tab bar; and the Move to tray over it while a card is.
      DragGhost()
      MoveTray()
      if let s = nav.sheet { SheetHost(kind: s).zIndex(5) }
      if let f = nav.full { FullHost(kind: f).zIndex(6).transition(.move(edge: .bottom)) }
      // The welcome after your first sign-in, over everything until it's done or skipped.
      if store.welcoming { WelcomeScreen().zIndex(10).transition(.opacity) }
    }
    .ignoresSafeArea(edges: .bottom)
    // A page of the web app, over the app (the pages the iPhone app doesn't draw yet).
    .sheet(item: $nav.web) { SafariView(url: $0.url).ignoresSafeArea() }
    // A design screen's full screen, over its page once that's drawn (Board.setUp).
    .task { if let f = nav.boardFull { nav.boardFull = nil; try? await Task.sleep(nanoseconds: 100_000_000); nav.full = f } }
  }

  @ViewBuilder private var tabRoot: some View {
    switch nav.tab {
    case .today: TodayScreen()
    case .library: LibraryScreen()
    case .discover: DiscoverScreen()
    case .stats: StatsScreen()
    case .connect: ConnectScreen()
    }
  }
  /// Pages the canvas draws without the tab bar: Settings, Check AI cards, News, and the themes.
  private var showsTabBar: Bool {
    switch nav.path.last { case .none, .deck, .folder, .profile: return true; default: return false }
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
    case .nameFolder(let rename, let deck, let name): FolderPopup(rename: rename, deck: deck, start: name)
    case .editProfile: SheetOverlay(top: 56, radius: 36, close: nav.close) { EditProfileSheet() }
    case .deckUpdates(let id): SheetOverlay(top: 56, close: nav.close) { DeckUpdatesSheet(deckId: id) }
    }
  }
}

struct DeckSettingsHost: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let id: String
  @State private var tab = "general"
  @State private var tagPicker = false
  var body: some View {
    let d = store.deck(id), linked = d.sharing.linked
    // Like the web's confirm: a deck from someone leaves your library (your progress on it goes too); your own is
    // deleted with its cards.
    let ask = linked ? "Remove “\(d.name)” from your library? Your progress on it goes too."
      : "Delete “\(d.name)” and its \(plural(store.cardCount(id), "card"))? This can’t be undone."
    SheetOverlay(top: 56, close: nav.close) {
      DeckSettingsSheet(d: d, tab: $tab, tagPicker: $tagPicker, close: nav.close)
    }
    .onAppear { if store.demo { tab = store.props.deckSettings ?? "general"; tagPicker = store.props.tagPicker } }
    .confirmationDialog(ask, isPresented: Binding(get: { store.confirmDelete == id }, set: { if !$0 { store.confirmDelete = nil } }), titleVisibility: .visible) {
      Button(linked ? "Remove from library" : "Delete deck", role: .destructive) {
        Task { await store.deleteDeck(id); nav.close(); nav.pick(.library) }
      }
    }
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
      }
    }
    .background(t.bg.ignoresSafeArea())
  }
}
