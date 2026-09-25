// iPhone · Deck page (PhoneDeck, PhoneDeckEmpty, PhoneDeckSettings, PhoneDeckSettingsStudy, PhoneDeckTagPicker): the
// deck's gradient header, its numbers, studying, its cards, and its settings in a sheet.
import SwiftUI
import PhotosUI

struct CardRowVM: Identifiable { let id: String; let front: String; let meta: String; let tags: [String] }

struct DeckVM {
  var id = "", name = "", seed = ""
  var style = "mix", round = 0
  var image: String? = nil
  var lineShort = ""
  var due = 0, fresh = 0, ret: Int? = nil
  /// Flashcards and Learn (the owner: "learn button needs to be 'learn', flashcards need to have flashcards button"):
  /// Flashcards shows how many cards wait today, and Learn picks up a session you left.
  var studyLabel = "Flashcards", studyCount = 0
  var learnLabel = "Learn", resume = false
  var rows: [CardRowVM] = []
  var tags: [String] = []
  var allTags: [String] = []
  var paused = false, grading = "four", fsrs = true, goal = 90, gapIdx = 3, steps = ["1m", "10m"], perDay = 20
  /// Its folder, the Library's folders, and what shows behind studying it.
  var folder: String? = nil
  var folders: [(id: String, name: String)] = []
  var bg = DeckBg()
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
}

extension Store {
  func deck(_ id: String) -> DeckVM {
    if demo {
      let X = Sample.shared, e = demoDeck, empty = props.emptyDeck
      if empty { return DeckVM(id: "pharm", name: "Pharmacology", seed: "Pharmacology", lineShort: "No cards yet") }
      let d = DeckVM(id: "cell", name: e.name ?? "Cell Biology", seed: "Cell Biology", style: e.style ?? "mix", round: e.round, image: e.image,
                     lineShort: "412 cards · 38 from your AI", due: 28, fresh: 10, ret: 91, studyCount: 28,
                     rows: X.CARDS.prefix(6).map { CardRowVM(id: $0.id, front: $0.front, meta: $0.kind + " · " + $0.next, tags: $0.tags) },
                     tags: e.tags ?? X.TAGS["cell"] ?? [], allTags: Array(Generated.tagColors.keys),
                     paused: e.paused, grading: e.grading ?? props.grading, fsrs: e.fsrs, goal: e.goal, gapIdx: e.gapIdx, steps: e.steps, perDay: e.perDay,
                     folder: demoFolderOf("cell"), folders: demoFolders.map { ($0.id, $0.name) }, bg: e.bg)
      return d
    }
    let E = engine
    guard let d = E.deck(id) else { return DeckVM(id: id) }
    let st = E.stat(d), cards = E.cards(of: id).reversed()
    let total = plural(st.total, "card").replacingOccurrences(of: String(st.total), with: grouped(st.total))
    return DeckVM(id: d.id, name: d.name, seed: d.cover.seed ?? d.name, style: d.cover.style ?? "mix", round: d.cover.round, image: d.cover.image,
                  lineShort: total + (st.aiCount > 0 ? " · \(st.aiCount) from your AI" : ""), due: st.due, fresh: st.fresh, ret: st.ret,
                  studyCount: st.due > 0 ? st.due : st.fresh, resume: learnOn(id),
                  rows: cards.map { c in CardRowVM(id: c.id, front: Store.listFront(c), meta: (KIND_LABEL[c.kind] ?? "Basic") + " · " + E.nextLabel(c), tags: c.tags) },
                  tags: d.tags, allTags: E.tags, paused: d.paused, grading: d.grading, fsrs: d.fsrs, goal: d.goal, gapIdx: d.gapIdx, steps: d.steps, perDay: d.perDay,
                  folder: d.folder, folders: lib.folders.map { ($0.id, $0.name) }, bg: d.bg)
  }

  /// How a card reads in a list: its words without formatting; a blank reads "____".
  static func listFront(_ c: Card) -> String {
    if c.kind == "cloze" { return Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true) }
    let f = Rich.plain(c.front, join: " ", showMath: true)
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
        default: break
        }
      }
      demoDeck = e
      return
    }
    applyLocal(deck: id, patch)
    Task { await send("deck.update", ["id": id, "patch": patch]) }
  }

  // ---------- photos ----------
  /// A deck's header photo (cover.image). On a design screen it's the canvas's placeholder.
  func setCover(_ id: String, _ url: String) { updateDeck(id, ["cover": ["image": url]]) }
  /// What shows behind studying a deck (Colors, Plain, Sky, Sunset, Photo); the server keeps its photo when the kind changes.
  func setBg(_ id: String, _ kind: String) { updateDeck(id, ["bg": ["kind": kind]]) }
  /// A photo of your own behind studying a deck.
  func setBgPhoto(_ id: String, _ url: String) { updateDeck(id, ["bg": ["kind": "photo", "image": url]]) }

  /// A picked photo goes to your library's storage as a JPEG (like the card editor's); its link comes back.
  func upload(photo item: PhotosPickerItem) async -> String? {
    guard !demo else { return "mock" }
    guard let data = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: data), let jpg = img.jpegData(compressionQuality: 0.85) else {
      error = "That photo didn’t open. Try another one."; return nil
    }
    do { return try await api.upload(jpg, type: "image/jpeg") }
    catch APIError.signedOut { phase = .signedOut; return nil }
    catch { self.error = error.localizedDescription; return nil }
  }
}

/// Picks a photo and uploads it (`done` gets its link). On a design screen there's no picker: `done` gets the canvas's
/// placeholder right away.
struct PhotoPicker: ViewModifier {
  @EnvironmentObject private var store: Store
  @Binding var isPresented: Bool
  let done: (String) -> Void
  @State private var item: PhotosPickerItem? = nil
  func body(content: Content) -> some View {
    content
      .photosPicker(isPresented: Binding(get: { isPresented && !store.demo }, set: { isPresented = $0 }), selection: $item, matching: .images)
      .onChange(of: isPresented) { _, on in if on && store.demo { isPresented = false; done("mock") } }
      .onChange(of: item) { _, picked in
        guard let picked else { return }
        item = nil
        Task { if let url = await store.upload(photo: picked) { done(url) } }
      }
  }
}
extension View {
  func photoPicker(_ isPresented: Binding<Bool>, done: @escaping (String) -> Void) -> some View { modifier(PhotoPicker(isPresented: isPresented, done: done)) }
}

extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

struct DeckScreen: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let id: String
  var body: some View {
    let d = store.deck(id)
    Group {
      if d.rows.isEmpty && store.cardCount(id) == 0 { empty(d) } else { page(d) }
    }
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { if store.demo && store.props.deckSettings != nil { nav.sheet = .deckSettings(id) } }
  }

  // The header: the deck's gradient (or its photo), with round buttons and its name.
  private func header(_ d: DeckVM, sub: String) -> some View {
    ZStack(alignment: .topLeading) {
      // Parallax: scrolling up, the cover drifts at half speed behind the header; pulled down past the top, it
      // stretches to fill the gap. Reduce Motion keeps it still.
      cover(d)
        .visualEffect { [still] content, proxy in
          let y = still ? 0 : proxy.frame(in: .scrollView(axis: .vertical)).minY, h = max(1, proxy.size.height)
          return content
            .scaleEffect(y > 0 ? (h + y) / h : 1, anchor: .bottom)
            .offset(y: y < 0 ? -y / 2 : 0)
        }
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 8) {
          CoverButton(icon: "back", label: "Back") { nav.back() }
          Spacer()
          CoverButton(icon: "gear", label: "Deck settings") { withAnimation(.out(0.35)) { nav.sheet = .deckSettings(d.id) } }
          if !d.rows.isEmpty { CoverButton(icon: "search", label: "Search") {} }
          CoverButton(icon: "plus", label: "New card") { nav.newCard(deckId: d.id) }
        }
        .padding(.top, Screen.top(54))
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 4) {
          Text(d.name).css(32, .bold, ls: -0.03).lineLimit(1).truncationMode(.tail).lineBox(33.6)
          Text(sub).css(14).opacity(0.8)
        }
        .foregroundStyle(d.hasImage ? .white : d.mesh.inkColor)
        .shadow(color: .black.opacity(d.hasImage ? 0.45 : d.mesh.shadow), radius: 7, x: 0, y: 1)
      }
      .padding(.leading, 20).padding(.trailing, 16).padding(.bottom, 18)
    }
    .frame(height: Screen.top(232))
    .clipShape(BelowClip())
  }

  @ViewBuilder private func cover(_ d: DeckVM) -> some View {
    if let img = d.image, img != "mock", let url = store.api.mediaURL(img) {
      // Cropped to the header (a photo sized to fill on its own would stretch the header's layout).
      FillPhoto(url: url)
    } else if d.image == "mock" {
      ZStack { t.surf; HStack(spacing: 8) { Icon("image", 18, 1.8); Text("[Your header image]").css(14, .medium) }.foregroundStyle(t.muted) }
    } else {
      MeshFill(mesh: d.mesh)
    }
  }

  private func page(_ d: DeckVM) -> some View {
    ScrollView(showsIndicators: false) {
      VStack(spacing: 16) {
        header(d, sub: d.lineShort)
        VStack(spacing: 16) {
          HStack(spacing: 8) {
            tile("Due", String(d.due), t.text)
            tile("New", String(d.fresh), t.text)
            tile("Remembered", d.ret.map { "\($0)%" } ?? "—", d.ret == nil ? t.muted : d.ret! >= d.goal ? t.good : d.ret! >= d.goal - 5 ? t.hard : t.again)
          }
          HStack(spacing: 8) {
            Button { nav.study(deckId: d.id) } label: {
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
            Button { nav.learn(deckId: d.id, resume: store.isPro && d.resume) } label: {
              HStack(spacing: 8) { Icon("sparkle", 17, 2); Text(d.learnLabel).css(17, .semibold).lineLimit(1).fixedSize() }
                .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            .frame(width: learnWidth)
          }
          VStack(spacing: 0) {
            ForEach(d.rows) { r in
              Button { nav.newCard(deckId: d.id, cardId: store.demo ? nil : r.id) } label: { row(r) }.buttonStyle(.plain)
            }
          }
        }
        .padding(.horizontal, 20)
      }
      .padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
  }

  /// The Learn button is half the Study button (flex 2 : 1 with an 8-point gap).
  private var learnWidth: CGFloat { ((UIScreen.main.bounds.width - 40 - 8) / 3).rounded(.down) }

  private func tile(_ label: String, _ value: String, _ color: Color) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(label).css(12, .medium).foregroundStyle(t.muted)
      Spacer(minLength: 0)
      Text(value).css(26, .bold, ls: -0.03).foregroundStyle(color).lineBox(26)
    }
    .padding(.horizontal, 14).padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading).frame(height: 80)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
  }

  private func row(_ r: CardRowVM) -> some View {
    let fit = Tags.fit(r.tags, 2)
    return VStack(alignment: .leading, spacing: 3) {
      Text(r.front).css(15, .medium).lineLimit(1).foregroundStyle(t.text)
      HStack(spacing: 8) {
        Text(r.meta).css(13).foregroundStyle(t.muted).lineLimit(1).fixedSize()
        ForEach(fit.shown, id: \.self) { TagChip(label: $0) }
        if fit.more > 0 { MoreChip(n: fit.more) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .clipped()
    }
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
    .contentShape(Rectangle())
  }

  // PhoneDeckEmpty: the header, then the floating cards and three ways to add some.
  private func empty(_ d: DeckVM) -> some View {
    VStack(spacing: 0) {
      header(d, sub: "No cards yet")
      EmptyBlock(art: 140, icon: "plus", title: "This deck is empty", line: "Add your first card, import some, or ask your AI to make them.") {
        EmptyActions(primary: ("New card", "plus", { nav.newCard(deckId: d.id) }), a: ("Import cards", "upload", { nav.importCards() }), b: ("Ask your AI", "sparkle", { nav.pick(.connect) }))
      }
      .padding(.horizontal, 28)
      .frame(maxHeight: .infinity)
      .padding(.bottom, 120)
    }
    .ignoresSafeArea()
  }
}

/// Deck settings (deckSettingsBody, phone): General (header, name, tags, pause, export, delete) and Studying (grading,
/// FSRS, goal, longest gap, learning steps, new cards a day).
struct DeckSettingsSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let d: DeckVM
  @Binding var tab: String
  @Binding var tagPicker: Bool
  let close: () -> Void
  @State private var name: String? = nil
  @State private var pickingCover = false
  @State private var pickingBg = false
  private let gaps = [(30, "1 mo"), (90, "3 mo"), (180, "6 mo"), (365, "1 yr"), (730, "2 yr"), (1825, "5 yr"), (3650, "10 yr")]
  private let stepPool = ["1m", "10m", "1h", "1d"]

  var body: some View {
    ZStack {
      VStack(alignment: .leading, spacing: 14) {
        HStack {
          Text("Deck settings").css(18, .semibold, ls: -0.01)
          Spacer()
          SheetDone(action: close)
        }
        Segmented(options: [("general", "General"), ("study", "Studying")], current: tab, height: 36, size: 14) { tab = $0 }
        if tab == "general" { general } else { studying }
      }
      .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, 34)
      .foregroundStyle(t.text)
      if tagPicker {
        TagPicker(all: d.allTags, current: d.tags, set: { store.updateDeck(d.id, ["tags": $0]) }, close: { tagPicker = false })
          .background(UnevenRoundedRectangle(topLeadingRadius: 32, topTrailingRadius: 32, style: .continuous).fill(t.bg))
      }
    }
  }

  private func label(_ s: String) -> some View { Text(s).css(13, .semibold) }

  // General scrolls once it's taller than the sheet; Export and Delete stay at the bottom when there's room.
  private var general: some View {
    GeometryReader { g in
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 14) {
          header
          background
          folder
          VStack(alignment: .leading, spacing: 8) {
            label("Name")
            TextField("", text: Binding(get: { name ?? d.name }, set: { name = $0; store.renameDeck(d.id, $0) }))
              .font(.geist(15)).padding(.horizontal, 16).frame(height: 46)
              .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          }
          VStack(alignment: .leading, spacing: 8) {
            label("Tags")
            TagEditor(tags: d.tags, remove: { g in store.updateDeck(d.id, ["tags": d.tags.filter { $0 != g }]) }, add: { tagPicker = true })
          }
          HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
              Text("Pause this deck").css(14, .semibold)
              Text("No reminders, and it leaves Today until you turn it back on.").css(12, lh: 1.35).foregroundStyle(t.muted)
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
            Button { store.confirmDelete = d.id } label: {
              Text("Delete deck").css(14, .semibold).foregroundStyle(t.again).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.againTint))
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
    .background(Color.clear.photoPicker($pickingBg) { store.setBgPhoto(d.id, $0) })
  }

  // The header: its gradient or photo, Shuffle, Upload image, and the gradient's style.
  private var header: some View {
    VStack(alignment: .leading, spacing: 8) {
      label("Header")
      ZStack {
        if let p = d.photo { FillPhoto(url: store.api.mediaURL(p)) }
        else if d.hasImage { ZStack { t.surf; HStack(spacing: 8) { Icon("image", 18, 1.8); Text("[Your header image]").css(14, .medium) }.foregroundStyle(t.muted) } }
        else { MeshFill(mesh: d.mesh) }
      }
      .frame(height: 88).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
      HStack(spacing: 6) {
        SmallButton(label: "Shuffle", icon: "shuffle") { store.updateDeck(d.id, ["cover": ["round": d.round + 1, "image": NSNull()]]) }
        SmallButton(label: "Upload image", icon: "image") { pickingCover = true }
        if d.hasImage { SmallButton(label: "Use gradient") { store.updateDeck(d.id, ["cover": ["image": NSNull()]]) } }
      }
      Segmented(options: [("mix", "Mix"), ("vivid", "Vivid"), ("deep", "Deep")], current: d.style) { store.updateDeck(d.id, ["cover": ["style": $0, "image": NSNull()]]) }
    }
  }

  // What shows behind Learn mode, flashcards, and Live: five tiles, the chosen one ringed. Photo with no picture yet
  // opens the photo picker (the header's photo counts).
  private var background: some View {
    let kind = d.bg.kind, photo = d.bgImage.flatMap { $0 == "mock" ? nil : $0 }
    return VStack(alignment: .leading, spacing: 8) {
      label("Background")
      Text("Behind Learn mode, flashcards, and Live").css(12, lh: 16 / 12).foregroundStyle(t.muted).padding(.top, -4)
      HStack(spacing: 8) {
        ForEach([("deck", "Colors"), ("plain", "Plain"), ("sky", "Sky"), ("sunset", "Sunset"), ("photo", "Photo")], id: \.0) { id, label in
          let on = kind == id
          Button { id == "photo" && d.bgImage == nil ? (pickingBg = true) : store.setBg(d.id, id) } label: {
            VStack(spacing: 6) {
              ZStack {
                switch id {
                case "deck": ZStack { CSSLinearGradient(angle: d.mesh.angle, stops: d.mesh.filtered(saturate: 0.16, brightness: 1.15).stops); Color.white.opacity(0.55) }
                case "plain": t.bg
                case "sky": LinearGradient(stops: [.init(color: Color(hex: 0x86BDF3), location: 0), .init(color: Color(hex: 0xC9E2FB), location: 0.45), .init(color: Color(hex: 0xEDF5FE), location: 1)], startPoint: .top, endPoint: .bottom)
                case "sunset": SunsetFill(dark: false)
                default:
                  ZStack { t.surf; Icon("image", 18, 1.8).foregroundStyle(t.muted) }
                    .overlay { if let photo { FillPhoto(url: store.api.mediaURL(photo)) } }
                }
              }
              .frame(height: 48)
              .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
              .overlay { if on { RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(t.text, lineWidth: 2).padding(-2) } }
              Text(label).css(12, .semibold, lh: 16 / 12).lineLimit(1).foregroundStyle(t.text)
            }
            .frame(maxWidth: .infinity)
          }
          .buttonStyle(.press)
          .accessibilityLabel(label)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      if kind == "photo" { HStack(spacing: 6) { SmallButton(label: "Change photo", icon: "image") { pickingBg = true } } }
    }
  }

  // Its folder: No folder, or one of the Library's.
  private var folder: some View {
    VStack(alignment: .leading, spacing: 8) {
      label("Folder")
      FlowLayout(spacing: 6, lineSpacing: 6) {
        ForEach([(key: "", id: String?.none, name: "No folder")] + d.folders.map { (key: $0.id, id: Optional($0.id), name: $0.name) }, id: \.key) { f in
          let on = d.folder == f.id
          Button { store.updateDeck(d.id, ["folder": f.id ?? NSNull()]) } label: {
            HStack(spacing: 6) { Icon("folder", 14, 1.8); Text(f.name).css(13, .semibold).lineLimit(1) }
              .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      if d.folders.isEmpty { Text("Make folders on the Library page.").css(12).foregroundStyle(t.muted) }
    }
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
          HStack(spacing: 8) {
            StackedStepper(label: "Remember goal", value: "\(d.goal)%", less: { store.updateDeck(d.id, ["goal": max(70, d.goal - 1)]) }, more: { store.updateDeck(d.id, ["goal": min(97, d.goal + 1)]) })
            StackedStepper(label: "Longest gap", value: gaps[min(max(d.gapIdx, 0), 6)].1, less: { store.updateDeck(d.id, ["gapIdx": max(0, d.gapIdx - 1)]) }, more: { store.updateDeck(d.id, ["gapIdx": min(6, d.gapIdx + 1)]) })
          }
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
    }
    .frame(maxHeight: .infinity, alignment: .top)
  }
}

/// smallBtn: a 34-tall gray pill with an icon.
struct SmallButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { if let icon { Icon(icon, 14, 2) }; Text(label).css(13, .semibold) }
        .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(t.surf))
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

/// One black button, then two lighter ones side by side (phoneActionRow), like the web's row of pills.
struct EmptyActions: View {
  @Environment(\.theme) private var t
  let primary: (String, String, () -> Void)
  let a: (String, String, () -> Void)
  let b: (String, String, () -> Void)
  var body: some View {
    VStack(spacing: 10) {
      BigButton(label: primary.0, icon: primary.1, action: primary.2)
      HStack(spacing: 10) { small(a); small(b) }
    }
  }
  private func small(_ x: (String, String, () -> Void)) -> some View {
    Button(action: x.2) {
      HStack(spacing: 7) { Icon(x.1, 16, 2); Text(x.0).css(15, .semibold).lineLimit(1) }
        .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
    }
    .buttonStyle(.press)
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
