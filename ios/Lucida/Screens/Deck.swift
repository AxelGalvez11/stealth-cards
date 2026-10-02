// iPhone · Deck page (PhoneDeck, PhoneDeckEmpty, PhoneDeckSettings, PhoneDeckSettingsStudy,
// PhoneDeckMoveTray): the deck's gradient header, studying, its sections (Sources, Cards, Notes, Diagrams), and its settings in a sheet. Hold a
// card to drag it to another spot, or onto another deck in the Move to tray that rises while you drag (Drag.swift).
import SwiftUI
import PhotosUI

struct CardRowVM: Identifiable {
  /// Its tags aren't drawn in the row (2026-10-02), but Make diagram offers them ("Only the cards tagged …").
  let id: String; let front: String; let meta: String; let tags: [String]
  /// A card of a deck from someone else: the shared card it came from (a fix is suggested on it).
  var origin: String? = nil
}

struct DeckVM {
  var id = "", name = "", seed = ""
  var style = "mix", round = 0
  var image: String? = nil
  var lineShort = ""
  /// Flashcards and Learn (the owner: "learn button needs to be 'learn', flashcards need to have flashcards button"):
  /// Flashcards shows how many cards wait today, and Learn picks up a session you left.
  var studyLabel = "Flashcards", studyCount = 0
  var learnLabel = "Learn", resume = false
  var rows: [CardRowVM] = []
  /// Its tags (the server keeps them; decks show none since 2026-10-02, only cards have tags): a theme reads them to pick its cover's picture.
  var tags: [String] = []
  var paused = false, grading = "four", fsrs = true, goal = 90, gapIdx = 3, steps = ["1m", "10m"], perDay = 20
  /// Its exam (Pro): the day it was set for ("" for none), and its line, like "Exam in 12 days · 84 cards to review first" (nil
  /// without one, and once the day has passed); and the rule for cards you keep forgetting.
  var exam: ExamInfo? = nil, examDay = "", leechAt = 8, leechAct = "tag"
  /// Its folder, the Library's folders, and what shows behind studying it.
  var folder: String? = nil
  var folders: [(id: String, name: String)] = []
  var bg = DeckBg()
  /// Shared by you, or from someone else (the study network).
  var sharing = DeckSharing()
  var mesh: Mesh { Mesh.deck(seed: seed, round: round, style: style) }
  var hasImage: Bool { image != nil }
  /// A photo of your own for the header (not the canvas's placeholder).
  var photo: String? { image == "mock" ? nil : image }
  /// The study background's photo: its own, or the header's.
  var bgImage: String? { bg.image ?? image }
}

/// A deck's changes while on a design screen (like mock.mjs's updateDeck).
struct DemoDeck {
  var name: String? = nil
  var tags: [String]? = nil
  var style: String? = nil
  var round = 0
  var image: String? = nil
  var bg = DeckBg()
  var paused = false, grading: String? = nil, fsrs = true, goal = 90, gapIdx = 3, steps = ["1m", "10m"], perDay = 20
  /// The exam day: untouched (the sample's Sunday, October 4, unless the board is Free), cleared, or one picked here.
  var exam: String?? = .none
  var leechAt = 8, leechAct = "tag"
}

extension Store {
  func deck(_ id: String) -> DeckVM {
    if demo {
      let X = Sample.shared, e = demoDeck, empty = props.emptyDeck
      let examDay: String? = { if case .some(let v) = e.exam { return v }; return props.free ? nil : Store.sampleExamDay }()
      if empty { return DeckVM(id: "pharm", name: "Pharmacology", seed: "Pharmacology", lineShort: "No cards yet") }
      let d = DeckVM(id: "cell", name: e.name ?? "Cell Biology", seed: "Cell Biology", style: e.style ?? "mix", round: e.round, image: e.image,
                     lineShort: "412 cards", studyCount: 28,
                     rows: demoCardOrder.compactMap { id in X.CARDS.first { $0.id == id } }.filter { (demoCardDeck[$0.id] ?? "cell") == "cell" }
                       .map { CardRowVM(id: $0.id, front: $0.front, meta: $0.kind + " · " + (isPaused($0.id) ? "Paused" : $0.next), tags: $0.tags) },
                     tags: e.tags ?? X.TAGS["cell"] ?? [],
                     paused: e.paused, grading: e.grading ?? props.grading, fsrs: e.fsrs, goal: e.goal, gapIdx: e.gapIdx, steps: e.steps, perDay: e.perDay,
                     exam: Store.demoExam(day: examDay), examDay: examDay ?? "", leechAt: e.leechAt, leechAct: e.leechAct,
                     folder: demoFolderOf("cell"), folders: demoFolders.map { ($0.id, $0.name) }, bg: e.bg, sharing: demoSharing())
      return d
    }
    let E = engine
    guard let d = E.deck(id) else { return DeckVM(id: id) }
    // Its cards in the deck's own order (the order you dragged them into; newest first until you do).
    let st = E.stat(d), cards = lib.deckCards(d)
    let total = plural(st.total, "card").replacingOccurrences(of: String(st.total), with: grouped(st.total))
    return DeckVM(id: d.id, name: d.name, seed: d.cover.seed ?? d.name, style: d.cover.style ?? "mix", round: d.cover.round, image: d.cover.image,
                  lineShort: total, studyCount: st.due > 0 ? st.due : st.fresh, resume: learnOn(id),
                  rows: cards.map { c in CardRowVM(id: c.id, front: Store.listFront(c), meta: (KIND_LABEL[c.kind] ?? "Basic") + " · " + E.nextLabel(c), tags: c.tags, origin: c.origin) },
                  tags: d.tags, paused: d.paused, grading: d.grading, fsrs: d.fsrs, goal: d.goal, gapIdx: d.gapIdx, steps: d.steps, perDay: d.perDay,
                  exam: st.exam, examDay: d.exam ?? "", leechAt: Sched.leechAt(d), leechAct: Sched.leechAct(d),
                  folder: d.folder, folders: lib.folders.map { ($0.id, $0.name) }, bg: d.bg, sharing: sharing(d))
  }

  /// How a card reads in a list: its words without formatting; a blank reads "____", and a box of a picture "What’s under
  /// box 2?" (or its prompt, with the box's number).
  static func listFront(_ c: Card) -> String {
    if c.kind == "cloze" { return Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true) }
    let f = Rich.plain(c.front, join: " ", showMath: true)
    if let o = Occ(c) { return f.isEmpty ? "What’s under box \(o.n)?" : f + " (box \(o.n))" }
    return !f.isEmpty ? f : c.kind == "audio" ? (Rich.plain(c.speak, join: " ", showMath: true).nilIfEmpty ?? "Audio card") : "Image card"
  }

  /// Changes a deck: saved on the server (and shown right away), or kept on the design screen.
  func updateDeck(_ id: String, _ patch: [String: Any]) {
    if demo {
      var e = demoDeck
      for (k, v) in patch {
        switch k {
        case "name": e.name = v as? String
        case "tags": e.tags = v as? [String]
        case "paused": e.paused = v as? Bool ?? false
        case "grading": e.grading = v as? String
        case "fsrs": e.fsrs = v as? Bool ?? true
        case "goal": e.goal = v as? Int ?? 90
        case "gapIdx": e.gapIdx = v as? Int ?? 3
        case "steps": e.steps = v as? [String] ?? e.steps
        case "perDay": e.perDay = v as? Int ?? 20
        case "exam": e.exam = .some(v as? String)
        case "leechAt": e.leechAt = v as? Int ?? 8
        case "leechAct": e.leechAct = v as? String ?? "tag"
        case "cover":
          let c = v as? [String: Any] ?? [:]
          if let s = c["style"] as? String { e.style = s }
          if let r = c["round"] as? Int { e.round = r }
          if c.keys.contains("image") { e.image = c["image"] as? String }
        case "folder": demoMoved[id] = .some(v as? String)
        case "bg":
          let b = v as? [String: Any] ?? [:]
          if let k = b["kind"] as? String { e.bg.kind = k }
          if b.keys.contains("image") { e.bg.image = b["image"] as? String }
          if let ch = b["chosen"] as? Bool { e.bg.chosen = ch }
        default: break
        }
      }
      demoDeck = e
      return
    }
    saveNow("deck.update", ["id": id, "patch": patch]) { Store.patch(&$0, deck: id, patch) }
  }

  // ---------- photos ----------
  /// A deck's header photo (cover.image). On a design screen it's the canvas's placeholder.
  func setCover(_ id: String, _ url: String) { updateDeck(id, ["cover": ["image": url]]) }
  /// What shows behind studying a deck (Colors, Plain, Sky, Sunset, Photo); the server keeps its photo when the kind changes. A pick
  /// is `chosen`; `chosen: false` (the theme's tile) puts the deck back to the default: a plain page, or the theme's own.
  func setBg(_ id: String, _ kind: String, chosen: Bool = true) { updateDeck(id, ["bg": ["kind": kind, "chosen": chosen]]) }
  /// A photo of your own behind studying a deck.
  func setBgPhoto(_ id: String, _ url: String) { updateDeck(id, ["bg": ["kind": "photo", "image": url, "chosen": true]]) }

  /// A picked photo goes to your library's storage (a deck's header or background, a card's picture, your profile
  /// photo), made small enough first (Upload.jpeg: at most `side` pixels across); its link comes back.
  func upload(photo item: PhotosPickerItem, side: Int = Upload.side) async -> String? {
    guard !demo else { return "mock" }
    guard let data = try? await item.loadTransferable(type: Data.self) else { error = "That photo didn’t open. Try another one."; return nil }
    return await upload(picture: data, side: side)
  }
  func upload(picture data: Data, side: Int = Upload.side) async -> String? {
    guard let jpg = await Task.detached(priority: .userInitiated, operation: { Upload.jpeg(data, side: side) }).value else {
      error = "That photo didn’t open. Try another one."; return nil
    }
    do { return try await api.upload(jpg, type: "image/jpeg") }
    catch APIError.signedOut { phase = .signedOut; return nil }
    catch { self.error = error.localizedDescription; return nil }
  }
}

/// Picks a photo and uploads it (`done` gets its link), at most `side` pixels across. On a design screen there's no
/// picker: `done` gets the canvas's placeholder right away.
struct PhotoPicker: ViewModifier {
  @EnvironmentObject private var store: Store
  @Binding var isPresented: Bool
  var side = Upload.side
  let done: (String) -> Void
  @State private var item: PhotosPickerItem? = nil
  func body(content: Content) -> some View {
    content
      .photosPicker(isPresented: Binding(get: { isPresented && !store.demo }, set: { isPresented = $0 }), selection: $item, matching: .images)
      .onChange(of: isPresented) { _, on in if on && store.demo { isPresented = false; done("mock") } }
      .onChange(of: item) { _, picked in
        guard let picked else { return }
        item = nil
        Task { if let url = await store.upload(photo: picked, side: side) { done(url) } }
      }
  }
}
extension View {
  func photoPicker(_ isPresented: Binding<Bool>, side: Int = Upload.side, done: @escaping (String) -> Void) -> some View {
    modifier(PhotoPicker(isPresented: isPresented, side: side, done: done))
  }
}

extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

struct DeckScreen: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  @EnvironmentObject private var nav: Nav
  @Environment(DragCenter.self) private var drag
  let id: String
  /// This page, for dragging its cards.
  @State private var board = UUID().uuidString
  /// Which section of the page shows (Sources, Cards, Notes or Diagrams; nil: Cards, unless an address or a board says another), which page of the
  /// Guide, and whether it's unfolded (Show more).
  @State private var tab: String? = nil
  @State private var gpage = "main"
  @State private var gopen = false
  var body: some View {
    let d = store.deck(id), g = store.guide(id), srcs = store.sources(id), dgs = store.diagramRows(id)
    Group {
      // (A deck with no cards but a Guide, Sources or Diagrams has its page, like the web's.)
      if d.rows.isEmpty && store.cardCount(id) == 0 && !g.hasAny && srcs.isEmpty && dgs.isEmpty { empty(d) } else { page(d, g, srcs, dgs) }
    }
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { if store.demo { demoOpen() } }
    // Something asked for a section (the Guide editor's Done: Notes; a card's "Made from" line: Sources, with that source open).
    .onChange(of: nav.deckWants, initial: true) { _, w in
      guard let w, w.deckId == id else { return }
      nav.deckWants = nil
      tab = w.tab
      if !w.source.isEmpty { withAnimation(.out(0.35)) { nav.sheet = .source(deckId: id, id: w.source, at: w.at) } }
    }
  }

  /// A design screen opens as its board's settings say: Notes, Diagrams (a diagram or a sheet open) or Sources, a source open at a card's place, or a deck's settings.
  private func demoOpen() {
    let p = store.props
    if p.deckSettings != nil { nav.sheet = .deckSettings(id) }
    else if p.guideState == "A source open" { tab = "sources"; nav.sheet = .source(deckId: id, id: "x2", at: "1:00") }
    else if !p.sourceOpen.isEmpty { tab = "sources"; nav.sheet = .source(deckId: id, id: p.sourceOpen, at: p.sourceAt) }
    else if DiagramSample.isState(p.guideState) { tab = "diagrams"; DiagramSample.open(p.guideState, deckId: id, flow: store.diagrams, nav: nav) }
    else if let want = ["Notes": "notes", "Diagrams": "diagrams", "Sources": "sources"][p.section] { tab = want }
  }

  // The header: the deck's gradient (or its photo), with round buttons and its name. With a theme on (Pro), the theme's
  // cover and lettering take their place (a deck with a photo of its own keeps it).
  private func header(_ d: DeckVM, sub: String) -> some View {
    let skin = d.image == nil ? store.skin(art) : nil, size = CGSize(width: ThemeLayout.screen.width, height: Screen.top(232))
    let themed = skin.flatMap { s in art.picture(.head(s, deck: d.look, size: size)).map { (s, $0) } }
    let ink = themed.flatMap { RGBA(css: $0.1.string("ink")) }
    return ZStack(alignment: .topLeading) {
      // Parallax: scrolling up, the cover drifts at half speed behind the header; pulled down past the top, it
      // stretches to fill the gap. Reduce Motion keeps it still (Design/Parallax.swift).
      cover(d, themed?.1).coverParallax(still: still)
      VStack(alignment: .leading, spacing: 0) {
        // Top-aligned, like the board's row (its page and Suggest a change are 40, the rest 44).
        HStack(alignment: .top, spacing: 8) {
          CoverButton(icon: "back", label: "Back") { nav.back() }
          Spacer()
          // A deck you share: its page. One you study from someone: Suggest a change instead of New card.
          if let sh = d.sharing.shared { CoverButton(icon: "globe", label: sh.label, size: 40) { nav.deckPage(sh.url) } }
          CoverButton(icon: "gear", label: "Deck settings") { withAnimation(Motion.sheet) { nav.sheet = .deckSettings(d.id) } }
          if !d.rows.isEmpty { CoverButton(icon: "search", label: "Search") {} }
          // Your own deck takes material too: Make cards (from a file, a photo, a recording, a link or a topic, into this deck) and New card.
          if !d.sharing.readOnly {
            CoverButton(icon: "sparkle", label: "Make cards") { nav.make(deckId: d.id) }
            CoverButton(icon: "plus", label: "New card") { nav.newCard(deckId: d.id) }
          }
          if d.sharing.readOnly, let lk = d.sharing.link { CoverButton(icon: "message", label: "Suggest a change", size: 40) { nav.deckPage(lk.url, suggest: "1") } }
        }
        .padding(.top, Screen.top(54))
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 4) {
          if let skin, themed != nil { ThemedName(job: .headName(skin, deck: d.look, width: size.width)).accessibilityLabel(d.name).accessibilityAddTraits(.isHeader) }
          else { Text(d.name).css(32, .bold, ls: -0.03).lineLimit(1).truncationMode(.tail).lineBox(33.6) }
          Text(sub).css(14).opacity(0.8)
        }
        .foregroundStyle(ink?.color ?? (d.hasImage ? .white : d.mesh.inkColor))
        .shadow(color: .black.opacity(themed != nil ? 0 : d.hasImage ? 0.45 : d.mesh.shadow), radius: 7, x: 0, y: 1)
      }
      .padding(.leading, 20).padding(.trailing, 16).padding(.bottom, 18)
    }
    .frame(height: Screen.top(232))
    .clipShape(BelowClip())
  }

  @ViewBuilder private func cover(_ d: DeckVM, _ themed: ThemePic? = nil) -> some View {
    if let themed {
      Color.clear.overlay(alignment: .topLeading) { themed.placed }.themeMark("head", store.skinKey ?? "")
    } else if let img = d.image, img != "mock", let url = store.api.mediaURL(img) {
      // Cropped to the header (a photo sized to fill on its own would stretch the header's layout).
      FillPhoto(url: url)
    } else if d.image == "mock" {
      ZStack { t.surf; HStack(spacing: 8) { Icon("image", 18, 1.8); Text("[Your header image]").css(14, .medium) }.foregroundStyle(t.muted) }
    } else {
      MeshFill(mesh: d.mesh)
    }
  }

  private func page(_ d: DeckVM, _ g: GuideVM, _ srcs: [SourceVM], _ dgs: [DiagramVM]) -> some View {
    // The sections, Sources first (the owner, 2026-10-02: "sources should be the first tab, so sources, cards, notes, diagrams"; the page still opens on
    // Cards): Sources (what the cards were made from: only its owner's), Cards (the cards), Notes (the Guide: its owner's, or one that has words), Diagrams
    // (the diagrams of its lectures and the tables and mind maps made from it: its owner's, or a deck that has some made ones).
    let notesTab = g.hasAny || g.can, diagramsTab = g.can || !dgs.isEmpty, sourcesTab = g.can
    let items = (sourcesTab ? [DeckTabs.Item(id: "sources", label: "Sources", count: srcs.isEmpty ? "" : String(srcs.count))] : [])
      + [DeckTabs.Item(id: "cards", label: "Cards", count: String(d.rows.count))]
      + (notesTab ? [DeckTabs.Item(id: "notes", label: "Notes", count: "")] : [])
      + (diagramsTab ? [DeckTabs.Item(id: "diagrams", label: "Diagrams", count: dgs.isEmpty ? "" : String(dgs.count))] : [])
    let want = tab ?? "cards", section = want == "notes" && notesTab ? "notes" : want == "diagrams" && diagramsTab ? "diagrams" : want == "sources" && sourcesTab ? "sources" : "cards"
    return ScrollViewReader { proxy in ScrollView(showsIndicators: false) {
      VStack(spacing: 16) {
        header(d, sub: d.lineShort)
        VStack(spacing: 16) {
          if d.sharing.linked, let lk = d.sharing.link { fromRow(d, lk) }
          let upd = d.sharing.isCopy ? max(store.deckUpdates(d.id).count, d.sharing.link?.pending ?? 0) : 0
          if upd > 0, let lk = d.sharing.link {
            Button { withAnimation(Motion.sheet) { nav.sheet = .deckUpdates(d.id) } } label: {
              HStack(spacing: 10) {
                Text(lk.owner.name + " changed " + plural(upd, "card")).css(15, .semibold).foregroundStyle(t.text).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                Text("See changes").css(14, .semibold).foregroundStyle(t.muted).fixedSize()
              }
              .padding(.horizontal, 16).frame(height: 56)
              .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
            }
            .buttonStyle(.press)
          }
          HStack(spacing: 8) {
            Button { store.startReview(d.id); nav.study(deckId: d.id) } label: {
              HStack(spacing: 8) {
                Icon("decks", 17, 2)
                Text(d.studyLabel).css(17, .semibold).lineLimit(1).fixedSize()
                if d.studyCount > 0 {
                  Text(String(d.studyCount)).css(13, .semibold, mono: true).padding(.horizontal, 7).frame(minWidth: 24, minHeight: 24).background(Capsule().fill(Color(white: 0.5).opacity(0.32)))
                }
              }
              .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv))
            }
            .buttonStyle(.press)
            .frame(maxWidth: .infinity)
            .layoutPriority(2)
            Button { nav.learn(deckId: d.id, resume: d.resume) } label: {
              HStack(spacing: 8) { Icon("sparkle", 17, 2); Text(d.learnLabel).css(17, .semibold).lineLimit(1).fixedSize() }
                .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            .frame(width: learnWidth)
          }
          if items.count > 1 { DeckTabs(items: items, selected: section) { tab = $0 }.id("deck-tabs") }
          if section == "notes" { notes(d, g) }
          if section == "diagrams" { DiagramsCard(flow: store.diagrams, deckId: d.id, rows: dgs, can: g.can) }
          if section == "sources" { SourcesCard(deckId: d.id, rows: srcs, can: g.can) { s in withAnimation(Motion.sheet) { nav.sheet = .source(deckId: d.id, id: s.id, at: "") } } }
          let list = board + "/cards", ids = d.rows.map(\.id)
          if section == "cards" && d.rows.isEmpty { Text("No cards in this deck yet.").css(14).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
          if section == "cards" { VStack(spacing: 0) {
            ForEach(d.rows) { r in
              // A card of a deck you study as it is opens Suggest a change on it (on its deck's page).
              let open = d.sharing.readOnly && d.sharing.link != nil
                ? { nav.deckPage(d.sharing.link!.url, suggest: r.origin ?? "1") }
                : { nav.newCard(deckId: d.id, cardId: store.demo ? nil : r.id) }
              row(r)
                .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
                .accessibilityElement(children: .combine)
                .accessibilityAddTraits(.isButton)
                .accessibilityAction(.default, open)
                .gesture(drag.hold(list, r.id, tap: open, ids: { ids }, face: { AnyView(row(r)) }, options: { cardDrag(d) }))
                .dragItem(drag, list: list, id: r.id)
            }
          } }
        }
        .padding(.horizontal, 20)
      }
      .padding(.bottom, 120)
      .dragScroller(drag, board: board)
    }
    .ignoresSafeArea(edges: .top)
    .onAppear { boardScroll(proxy) }
    }
  }

  /// A design screen starts scrolled to the tabs (`-scrollTo tabs`), to see what is under them (debug builds only).
  private func boardScroll(_ proxy: ScrollViewProxy) {
    #if DEBUG
    guard store.demo, Board.arg("-scrollTo") == "tabs" else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { proxy.scrollTo("deck-tabs", anchor: UnitPoint(x: 0.5, y: 0.09)) }
    #endif
  }

  /// The Notes: the deck's Guide as a card (its pages as tabs when it has some).
  private func notes(_ d: DeckVM, _ g: GuideVM) -> some View {
    let pageId = g.pages.contains { $0.id == gpage } ? gpage : "main"
    let tabs = g.pages.isEmpty ? [] : [(id: "main", title: "Guide")] + g.pages.map { (id: $0.id, title: $0.title) }
    return GuideCard(deckId: d.id, tabs: tabs, page: Binding(get: { pageId }, set: { gpage = $0 }), text: g.page(pageId).text, open: $gopen, canEdit: g.can, hasAny: g.hasAny)
  }

  /// Whose deck it is: their picture and name (tap: its page).
  private func fromRow(_ d: DeckVM, _ lk: DeckSharing.Linked) -> some View {
    Button { nav.deckPage(lk.url) } label: {
      HStack(spacing: 10) {
        PersonAvatar(p: d.sharing.ownerFace, size: 28)
        Text("From " + lk.owner.name).css(14, .semibold).foregroundStyle(t.text).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        Icon("chev", 16, 2).foregroundStyle(t.muted)
      }
      .frame(minHeight: 44)
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
  }

  /// A card goes to another spot in the deck, or onto another deck in the Move to tray (it leaves this page).
  private func cardDrag(_ d: DeckVM) -> DragOptions {
    let others = store.libraryDecks().filter { $0.id != d.id }.map { TrayDeck(id: $0.id, name: $0.name, mesh: $0.mesh) }
    return DragOptions(drops: ["deck:"], tray: others.isEmpty ? nil : others, drop: { id, to in
      switch to {
      case .before(let b): store.reorderCard(id, before: b)
      case .place(let name): store.moveCard(id, toDeck: String(name.dropFirst("deck:".count)))
      }
    })
  }

  /// The Learn button is half the Study button (flex 2 : 1 with an 8-point gap).
  private var learnWidth: CGFloat { ((UIScreen.main.bounds.width - 40 - 8) / 3).rounded(.down) }

  /// A card's row: its question, then its kind and when it's next (no tag chips since 2026-10-02, like the web's lists).
  private func row(_ r: CardRowVM) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(r.front).css(15, .medium).lineLimit(1).foregroundStyle(t.text)
      Text(r.meta).css(13).foregroundStyle(t.muted).lineLimit(1)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .contentShape(Rectangle())
  }

  // PhoneDeckEmpty (a new deck opens here): the header, with "No cards yet" under the name and Make cards and New card on it, and nothing under it
  // (the owner, 2026-10-02: no Make box or row).
  private func empty(_ d: DeckVM) -> some View {
    ScrollView(showsIndicators: false) {
      header(d, sub: "No cards yet").padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
  }
}

/// Deck settings (deckSettingsBody, phone): General (header, name, background, folder, pause, export, delete), Studying (grading,
/// FSRS, goal, longest gap, learning steps, new cards a day), and Sharing (DeckShare.swift). A deck you study from
/// someone keeps its name and header theirs, and leaves your library instead of being deleted.
struct DeckSettingsSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  @EnvironmentObject private var nav: Nav
  let d: DeckVM
  @Binding var tab: String
  let close: () -> Void
  @State private var name: String? = nil
  @State private var pickingCover = false
  /// The goal the settings opened with (the cost of a goal counts from there).
  @State private var goalFrom: Int? = nil
  private let gaps = [(30, "1 mo"), (90, "3 mo"), (180, "6 mo"), (365, "1 yr"), (730, "2 yr"), (1825, "5 yr"), (3650, "10 yr")]
  private let stepPool = ["1m", "10m", "1h", "1d"]

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        Text("Deck settings").css(18, .semibold, ls: -0.01)
        Spacer()
        SheetDone(action: close)
      }
      Segmented(options: [("general", "General"), ("study", "Studying"), ("share", "Sharing")], current: tab, height: 36, size: 14) { tab = $0 }
      switch tab {
      case "study": studying
      case "share": DeckShareTab(d: d)
      default: general
      }
    }
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, 34)
    .foregroundStyle(t.text)
  }

  private func label(_ s: String) -> some View { Text(s).css(13, .semibold) }

  /// Delete deck, or Remove from library for a deck from someone (your progress on it goes too): it asks first, in Lucida's own question.
  private func askDelete() {
    let id = d.id, n = store.cardCount(id)
    if d.sharing.linked {
      nav.ask("Remove “\(d.name)” from your library?", line: "Your progress on it goes too.", action: "Remove", danger: true) { removeDeck(id) }
    } else {
      nav.ask("Delete “\(d.name)”?", line: (n == 0 ? "" : n == 1 ? "Its card goes too. " : "Its \(n) cards go too. ") + "This can’t be undone.", action: "Delete deck", danger: true) { removeDeck(id) }
    }
  }
  private func removeDeck(_ id: String) {
    Buzz.shared.warning("delete deck")
    Task { await store.deleteDeck(id); nav.close(); nav.pick(.library) }
  }

  // General scrolls once it's taller than the sheet; Export and Delete stay at the bottom when there's room.
  private var general: some View {
    GeometryReader { g in
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 14) {
          // The deck's name sits right under its header (the owner, 2026-10-02: "naming section should be moved below header section").
          if !d.sharing.readOnly {
            header
            nameField
          }
          BgChooser(deckId: d.id)
          folder
          HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
              Text("Pause this deck").css(14, .semibold)
              Text("No reminders, and nothing from it is due until you turn it back on.").css(12, lh: 1.35).foregroundStyle(t.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Toggle48(on: d.paused, label: "Pause this deck") { store.updateDeck(d.id, ["paused": !d.paused]) }
          }
          .frame(minHeight: 44)
          Spacer(minLength: 0)
          HStack(spacing: 8) {
            Button { store.exportDeck(d.id) } label: {
              Text("Export cards").css(14, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            Button { askDelete() } label: {
              Text(d.sharing.linked ? "Remove from library" : "Delete deck").css(14, .semibold).foregroundStyle(t.again).lineLimit(1)
                .frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.againTint))
            }
            .buttonStyle(.press)
          }
        }
        .frame(minHeight: g.size.height, alignment: .top)
      }
      .scrollBounceBehavior(.basedOnSize)
      // Cut off at the sheet's bottom margin, like the canvas (a scroll view would run on under the home indicator).
      .clipped()
    }
    .photoPicker($pickingCover) { store.setCover(d.id, $0) }
  }

  // Its name, saved as it's typed.
  private var nameField: some View {
    VStack(alignment: .leading, spacing: 8) {
      label("Name")
      TextField("", text: Binding(get: { name ?? d.name }, set: { name = $0; store.renameDeck(d.id, $0) }))
        .font(.geist(15)).padding(.horizontal, 16).frame(height: 46)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    }
  }

  // The header: its gradient or photo, Shuffle, Upload image, and the gradient's style.
  private var header: some View {
    VStack(alignment: .leading, spacing: 8) {
      label("Header")
      // With a theme on, the theme draws the header (and a deck with a picture of its own keeps it).
      let skin = store.skin(art), themed = d.hasImage ? nil : skin
      ZStack {
        if let p = d.photo { FillPhoto(url: store.api.mediaURL(p)) }
        else if d.hasImage { ZStack { t.surf; HStack(spacing: 8) { Icon("image", 18, 1.8); Text("[Your header image]").css(14, .medium) }.foregroundStyle(t.muted) } }
        else if let themed, let pic = art.picture(.cover(themed.key, deck: d.look.dict, shape: "head", fs: 34, size: CGSize(width: ThemeLayout.screen.width - 40, height: 88), r: 20)) { Color.clear.overlay(alignment: .topLeading) { pic.placed } }
        else { MeshFill(mesh: d.mesh) }
      }
      .frame(height: 88).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
      HStack(spacing: 6) {
        SmallButton(label: "Shuffle", icon: "shuffle") { store.updateDeck(d.id, ["cover": ["round": d.round + 1, "image": NSNull()]]) }
        SmallButton(label: "Upload image", icon: "image") { pickingCover = true }
        if d.hasImage { SmallButton(label: skin != nil ? "Use theme" : "Use gradient") { store.updateDeck(d.id, ["cover": ["image": NSNull()]]) } }
      }
      // (a theme draws the cover, so the gradient's style only shows with Lucida's own look)
      if themed == nil { Segmented(options: [("mix", "Mix"), ("vivid", "Vivid"), ("deep", "Deep")], current: d.style) { store.updateDeck(d.id, ["cover": ["style": $0, "image": NSNull()]]) } }
    }
  }

  // Its folder: one of the Library's, or Remove from folder (only for a deck that's in one).
  private var folder: some View {
    VStack(alignment: .leading, spacing: 8) {
      label("Folder")
      FlowLayout(spacing: 6, lineSpacing: 6) {
        ForEach((d.folder != nil ? [(key: "", id: String?.none, name: "Remove from folder")] : []) + d.folders.map { (key: $0.id, id: Optional($0.id), name: $0.name) }, id: \.key) { f in
          let on = d.folder == f.id
          Button { store.moveDeck(d.id, to: f.id) } label: {
            HStack(spacing: 6) { Icon("folder", 14, 1.8); Text(f.name).css(13, .semibold).lineLimit(1) }
              .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      if d.folders.isEmpty { Text("Make folders on the Library page.").css(12).foregroundStyle(t.muted) }
    }
    .haptic(.selection, on: d.folder ?? "", "option")
  }

  private var studying: some View {
    let fsrsAllowed = d.grading != "piles", fsrsOn = fsrsAllowed && d.fsrs
    return VStack(alignment: .leading, spacing: 16) {
      VStack(alignment: .leading, spacing: 8) {
        label("Grade with")
        Segmented(options: [("four", "4 grades"), ("binary", "✓ / ✗"), ("piles", "Piles")], current: d.grading, hPad: 8) { store.updateDeck(d.id, ["grading": $0]) }
      }
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Schedule with FSRS").css(14, .semibold)
          Text(!fsrsAllowed ? "Piles only sort cards, so there’s nothing to schedule." : fsrsOn ? "Picks the best day to bring each card back." : "Off: cards don’t get a next review date.")
            .css(12, lh: 1.35).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Toggle48(on: fsrsOn, enabled: fsrsAllowed, label: "Schedule with FSRS") { store.updateDeck(d.id, ["fsrs": !fsrsOn]) }
      }
      if fsrsOn {
        VStack(alignment: .leading, spacing: 12) {
          if store.isPro { GoalPresets(d: d) }
          HStack(spacing: 8) {
            StackedStepper(label: "Remember goal", value: "\(d.goal)%", less: { store.updateDeck(d.id, ["goal": max(70, d.goal - 1)]) }, more: { store.updateDeck(d.id, ["goal": min(97, d.goal + 1)]) })
            StackedStepper(label: "Longest gap", value: gaps[min(max(d.gapIdx, 0), 6)].1, less: { store.updateDeck(d.id, ["gapIdx": max(0, d.gapIdx - 1)]) }, more: { store.updateDeck(d.id, ["gapIdx": min(6, d.gapIdx + 1)]) })
          }
          if store.isPro { WorkloadLine(d: d, from: goalFrom ?? d.goal) }
          HStack(spacing: 6) {
            Text("Learning steps").css(12).foregroundStyle(t.muted).padding(.trailing, 4)
            ForEach(d.steps, id: \.self) { x in
              Button { if d.steps.count > 1 { store.updateDeck(d.id, ["steps": d.steps.filter { $0 != x }]) } } label: {
                HStack(spacing: 6) { Text(x).css(12, .medium, mono: true); Icon("close", 10, 2.4).foregroundStyle(t.muted) }
                  .foregroundStyle(t.text).padding(.leading, 12).padding(.trailing, 10).frame(height: 30).background(Capsule().fill(t.surf))
              }
              .buttonStyle(.press)
              .accessibilityLabel("Remove \(x) step")
            }
            if d.steps.count < stepPool.count {
              Button {
                if let nx = stepPool.first(where: { !d.steps.contains($0) }) { store.updateDeck(d.id, ["steps": stepPool.filter { $0 == nx || d.steps.contains($0) }]) }
              } label: { Icon("plus", 12, 2.4).foregroundStyle(t.text).frame(width: 30, height: 30).background(Circle().fill(t.surf)) }
              .buttonStyle(.press)
              .accessibilityLabel("Add a step")
            }
          }
        }
      }
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text("New cards a day").css(14, .semibold)
          Text("Unseen cards added each day").css(12).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        MiniStepper(value: d.perDay, bg: t.surf, set: { store.updateDeck(d.id, ["perDay": $0]) }, step: 5)
      }
      .frame(minHeight: 44)
      if fsrsOn { StudyPro(d: d) }
    }
    .frame(maxHeight: .infinity, alignment: .top)
    .onAppear { if goalFrom == nil { goalFrom = store.demo && store.props.stepGoal ? 90 : d.goal } }
  }
}

/// smallBtn: a 34-tall gray pill with an icon (on a gray panel, the page's color: `bg`).
struct SmallButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var bg: Color? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { if let icon { Icon(icon, 14, 2) }; Text(label).css(13, .semibold) }
        .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(bg ?? t.surf))
    }
    .buttonStyle(.press)
  }
}

/// stepper(stacked): a gray box with its label, the value, and − + buttons.
struct StackedStepper: View {
  @Environment(\.theme) private var t
  let label: String
  let value: String
  let less: () -> Void
  let more: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label).css(12).foregroundStyle(t.muted).lineLimit(1)
      HStack(spacing: 8) {
        Text(value).css(20, .semibold, ls: -0.02).lineLimit(1)
        Spacer(minLength: 0)
        HStack(spacing: 6) { round("−", "Less", less); round("+", "More", more) }
      }
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 14).padding(.vertical, 12)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
  }
  private func round(_ s: String, _ label: String, _ a: @escaping () -> Void) -> some View {
    Button(action: a) { Text(s).css(18, .semibold).foregroundStyle(t.text).frame(width: 32, height: 32).background(Circle().fill(t.bg)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// miniStep: − value + in a row; the value can be typed (0 to 999).
struct MiniStepper: View {
  @Environment(\.theme) private var t
  let value: Int
  var bg: Color
  let set: (Int) -> Void
  var step = 1
  @State private var draft: String? = nil
  @FocusState private var focused: Bool
  var body: some View {
    HStack(spacing: 8) {
      btn("−", "Less") { set(max(0, value - step)) }
      TextField("", text: Binding(get: { draft ?? String(value) }, set: { v in
        let digits = String(v.filter(\.isNumber).prefix(3)); draft = digits; if let n = Int(digits) { set(n) }
      }))
      .keyboardType(.numberPad).focused($focused).multilineTextAlignment(.center)
      .font(.geist(15, .semibold)).foregroundStyle(t.text)
      .frame(width: 44, height: 30)
      .overlay(Capsule().strokeBorder(focused ? t.text : .clear, lineWidth: 2))
      .onChange(of: focused) { _, f in if !f { draft = nil } }
      btn("+", "More") { set(min(999, value + step)) }
    }
  }
  private func btn(_ s: String, _ label: String, _ a: @escaping () -> Void) -> some View {
    Button(action: a) { Text(s).css(17, .semibold).foregroundStyle(t.text).frame(width: 30, height: 30).background(Circle().fill(bg)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// EMPTY_ART: a small stack of blank gradient cards (Iris on top, Mint and Apricot behind) floating in a soft light;
/// the back cards sway and a shine crosses the top card now and then.
/// An empty state (emptyBlock): the art, a title, a line about it, and what to do.
struct EmptyBlock<Actions: View>: View {
  @Environment(\.theme) private var t
  let art: CGFloat
  let icon: String
  let title: String
  let line: String
  @ViewBuilder var actions: Actions
  var body: some View {
    VStack(spacing: 18) {
      EmptyArt(width: art, icon: icon)
      VStack(spacing: 8) {
        Text(title).css(22, .semibold, ls: -0.02).foregroundStyle(t.text)
        Text(line).css(15, lh: 1.5).foregroundStyle(t.muted)
      }
      .multilineTextAlignment(.center)
      actions.padding(.top, 2)
    }
  }
}

struct EmptyArt: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  let width: CGFloat
  let icon: String
  @State private var phase = false
  var body: some View {
    let h = (width * 0.8).rounded(), r = (width * 0.14).rounded(), cw = width * 0.7, ch = h * 0.68
    ZStack(alignment: .topLeading) {
      RadialGradient(colors: [t.surf, t.surf.opacity(0)], center: .center, startRadius: 0, endRadius: width * 0.95)
        .frame(width: width * 1.9, height: h * 1.9)
        .offset(x: -width * 0.45, y: -h * 0.4)
        .opacity(phase ? 0.55 : 1)
      Group {
        card(.palette("Apricot"), r, cw, ch).shadow(color: .black.opacity(0.35), radius: 12, y: 10)
          .rotationEffect(.degrees(phase ? -13 : -9)).offset(x: width * 0.10 + (phase ? -3 : 0), y: h * 0.18)
        card(.palette("Mint"), r, cw, ch).shadow(color: .black.opacity(0.35), radius: 12, y: 10)
          .rotationEffect(.degrees(phase ? 10 : 6)).offset(x: width * 0.22 + (phase ? 3 : 0), y: h * 0.12)
        card(.palette("Iris"), r, cw, ch)
          .overlay { Icon(icon, (width * 0.2).rounded(), 2).foregroundStyle(Color.black).opacity(0.9) }
          .shadow(color: .black.opacity(0.4), radius: 15, y: 14)
          .offset(x: width * 0.15, y: h * 0.04)
      }
      .offset(y: phase ? -6 : 0)
    }
    .frame(width: width, height: h, alignment: .topLeading)
    .onAppear { if !still { withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { phase = true } } }
    .accessibilityHidden(true)
  }
  private func card(_ m: Mesh, _ r: CGFloat, _ w: CGFloat, _ h: CGFloat) -> some View {
    MeshFill(mesh: m).frame(width: w, height: h).clipShape(RoundedRectangle(cornerRadius: r, style: .continuous))
  }
}

/// Clips below the bottom edge only, so a pulled-down cover can grow up past the header's top.
struct BelowClip: Shape {
  func path(in r: CGRect) -> Path { Path(CGRect(x: r.minX - 2000, y: r.minY - 4000, width: r.width + 4000, height: r.height + 4000)) }
}
