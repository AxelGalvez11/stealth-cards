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
  static var requested: String? {
    let a = ProcessInfo.processInfo.arguments
    guard let i = a.firstIndex(of: "-board"), i + 1 < a.count else { return nil }
    return a[i + 1]
  }
}

struct RootView: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @Environment(\.colorScheme) private var scheme

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
    // What went wrong saving a change or uploading a photo, like the web app's alert.
    .alert(store.error ?? "", isPresented: Binding(get: { store.error != nil && store.phase == .ready }, set: { if !$0 { store.error = nil } })) {
      Button("OK", role: .cancel) {}
    }
    .task {
      if !store.demo {
        await store.load()
        #if DEBUG
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
          case "cards": nav.tab = .library; nav.libCards = true
          case "stats": nav.tab = .stats
          case "connect": nav.tab = .connect
          case "settings": nav.path = [.settings]
          case "learn": nav.tab = .library; nav.path = [.deck(first)]; nav.sheet = .learnStart(first)
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
    case "PhoneConnect": nav.tab = .connect
    case "PhoneSettings": nav.path = [.settings]
    case "PhoneNewDeck": nav.sheet = .newDeck
    case "PhoneEditor": store.props.editorTyping = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneEditorImage": store.props.cardType = "Image"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneEditorAudio": store.props.cardType = "Audio"; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneEditorRecording": store.props.cardType = "Audio"; store.demoRecording = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .newCard(deckId: "cell", cardId: nil)
    case "PhoneReviewImage": store.props.cardIndex = 2; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneReviewAudio": store.props.cardIndex = 3; store.demoPlaying = true; nav.full = .review(deckId: "cell", pile: nil)
    case "PhoneInbox": nav.path = [.settings, .inbox]
    case "PhoneQuizStart": nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .learnStart("cell")
    case "PhoneQuizUpgrade": store.props.upgrade = true; nav.tab = .library; nav.path = [.deck("cell")]; nav.sheet = .learnStart("cell")
    case "PhoneQuiz": nav.full = .learn("cell")
    case "PhoneQuizAnswered": store.demoLearn.pick = 1; nav.full = .learn("cell")
    case "PhoneQuizMatch": store.demoLearn.screen = "match"; nav.full = .learn("cell")
    case "PhoneQuizType": store.demoLearn.screen = "type"; nav.full = .learn("cell")
    case "PhoneQuizDone": store.demoLearn.screen = "done"; nav.full = .learn("cell")
    case "PhoneSignIn": store.phase = .signedOut
    case "PhoneSignInCode": store.phase = .signedOut; store.signInStep = .code
    default: break
    }
  }
}

/// The tabs, with pages pushed on top of them.
struct MainView: View {
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
              }
            }
            .toolbar(.hidden, for: .navigationBar)
            .containerBackground(t.bg, for: .navigation)
          }
      }
      if showsTabBar { TabBar(active: nav.tab, pick: nav.pick) }
      // A deck or card being dragged, over the page and the tab bar; and the Move to tray over it while a card is.
      DragGhost()
      MoveTray()
      if let s = nav.sheet { SheetHost(kind: s).zIndex(5) }
      if let f = nav.full { FullHost(kind: f).zIndex(6).transition(.move(edge: .bottom)) }
    }
    .ignoresSafeArea(edges: .bottom)
  }

  @ViewBuilder private var tabRoot: some View {
    switch nav.tab {
    case .today: TodayScreen()
    case .library: LibraryScreen()
    case .stats: StatsScreen()
    case .connect: ConnectScreen()
    }
  }
  /// Pages the canvas draws without the tab bar: Settings and Check AI cards.
  private var showsTabBar: Bool {
    switch nav.path.last { case .none, .deck, .folder: return true; default: return false }
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
    case .learnStart(let id):
      SheetOverlay(top: nil, radius: 36, close: nav.close) {
        if !store.isPro { LearnUpgradeSheet() } else { LearnStartSheet(deckId: id) }
      }
    case .nameFolder(let rename, let deck, let name): FolderPopup(rename: rename, deck: deck, start: name)
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
    SheetOverlay(top: 56, close: nav.close) {
      DeckSettingsSheet(d: store.deck(id), tab: $tab, tagPicker: $tagPicker, close: nav.close)
    }
    .onAppear { if store.demo { tab = store.props.deckSettings ?? "general"; tagPicker = store.props.tagPicker } }
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
      case .done: DoneScreen()
      case .learn(let id): LearnScreen(deckId: id)
      }
    }
    .background(t.bg.ignoresSafeArea())
  }
}
