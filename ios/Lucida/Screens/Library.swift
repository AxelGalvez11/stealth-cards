// iPhone · Library (PhoneLibrary, PhoneLibraryCards, PhoneLibraryFolder, PhoneDecksEmpty): it was called Decks. Your
// folders and decks, or one folder's decks, with a search and a ⋯ menu on each deck to move it between folders; or
// every card in one list (All cards), to filter by how hard it is, its tags, and its deck or folder.
import SwiftUI

/// A deck in the Library's list (libraryLogic's decks).
struct LibDeck: Identifiable {
  var id = "", name = "", tags: [String] = []
  var mesh: Mesh
  /// Its header photo (not the canvas's placeholder).
  var photo: String? = nil
  var folder: String? = nil
  var due = 0, fresh = 0, totalLabel = "0", ret: Int? = nil, paused = false
  /// "412 cards · 10 new · 91%"
  var line: String { totalLabel + " cards · \(fresh) new" + (ret.map { " · \($0)%" } ?? "") }
}

/// A folder and the decks in it (db.js folders).
struct LibFolder: Identifiable {
  var id = "", name = ""
  var decks: [LibDeck] = []
  /// Cards due in its decks that aren't paused.
  var due: Int { decks.filter { !$0.paused }.reduce(0) { $0 + $1.due } }
  /// "2 decks · 19 due"
  var line: String { plural(decks.count, "deck") + (due > 0 ? " · \(due) due" : "") }
}

/// A card in All cards (db.js allCards): its words, its deck, how hard it is, and when it's next.
struct LibCard: Identifiable {
  var id = "", front = "", back = "", tags: [String] = [], next = "", level = "new"
  var deckId = "", deckName = ""
  var mesh: Mesh
  var folder: String? = nil
}

extension Store {
  /// A sample deck's folder on a design screen: where it was moved, or the sample folder it's in.
  func demoFolderOf(_ id: String) -> String? {
    if let moved = demoMoved[id] { return moved }
    return demoFolders.first { $0.decks.contains(id) }?.id
  }

  /// Every deck with its numbers, in the order they were made.
  func libraryDecks() -> [LibDeck] {
    if demo {
      if props.newUser { return [] }
      let X = Sample.shared
      return X.DECKS.map { d in
        LibDeck(id: d.id, name: d.name, tags: X.TAGS[d.id] ?? [], mesh: Mesh.deck(seed: d.name), folder: demoFolderOf(d.id),
                due: props.caughtUp ? 0 : d.due, fresh: d.fresh, totalLabel: d.total, ret: d.ret)
      }
    }
    return engine.decks.map { d in
      LibDeck(id: d.id, name: d.name, tags: d.tags, mesh: d.mesh, photo: d.image == "mock" ? nil : d.image, folder: d.folder,
              due: d.due, fresh: d.fresh, totalLabel: d.totalLabel, ret: d.ret, paused: d.paused)
    }
  }

  /// The folders, each with its decks.
  func libraryFolders(_ decks: [LibDeck]) -> [LibFolder] {
    let list: [(id: String, name: String)] = demo ? (props.newUser ? [] : demoFolders.map { ($0.id, $0.name) }) : lib.folders.map { ($0.id, $0.name) }
    return list.map { f in LibFolder(id: f.id, name: f.name, decks: decks.filter { $0.folder == f.id }) }
  }

  /// Every card you've kept (not ones waiting for you to check), newest first.
  func libraryCards() -> [LibCard] {
    if demo {
      let X = Sample.shared
      return X.ALL_CARDS.enumerated().map { i, a in
        let name = X.DECKS.first { $0.id == a.deckId }?.name ?? ""
        return LibCard(id: "a\(i)", front: a.front, back: a.back, tags: a.tags, next: a.next, level: a.level, deckId: a.deckId, deckName: name,
                       mesh: Mesh.deck(seed: name), folder: demoFolderOf(a.deckId))
      }
    }
    if let memo = allCardsMemo { return memo }
    let E = engine
    var decks: [String: (deck: Deck, mesh: Mesh)] = [:]
    for d in lib.decks where decks[d.id] == nil { decks[d.id] = (d, Mesh.deck(seed: d.cover.seed ?? d.name, round: d.cover.round, style: d.cover.style)) }
    // Each card's last answer, for decks that don't schedule.
    var last: [String: Int] = [:]
    for l in lib.logs { if let r = l.rating, r > 0 { last[l.cardId] = r } }
    let out = lib.cards.filter { !$0.pending }.reversed().map { c -> LibCard in
      let d = decks[c.deckId]
      return LibCard(id: c.id, front: Store.listFront(c), back: Store.listBack(c), tags: c.tags, next: E.nextLabel(c), level: difficulty(c, deck: d?.deck, last: last[c.id]),
                     deckId: c.deckId, deckName: d?.deck.name ?? "", mesh: d?.mesh ?? Mesh.deck(seed: ""), folder: d?.deck.folder)
    }
    allCardsMemo = out
    return out
  }

  /// A card's answer in a list: its words without formatting (a blank's hidden words, a box's label).
  static func listBack(_ c: Card) -> String {
    if let o = Occ(c) { return o.label.isEmpty ? "—" : o.label }
    return c.kind == "cloze" ? Rich.blanks(c.text, showMath: true).joined(separator: ", ") : Rich.plain(c.back, join: " ", showMath: true)
  }

  /// How hard a card is for you (db.js difficulty): new (never studied), easy, medium, or hard. Spaced repetition knows
  /// each card's difficulty; decks without it go by the card's last answer (1 hard, 2 medium, 3 or 4 easy), and piles by
  /// the card's pile (the first pile is easy, the last is hard).
  func difficulty(_ c: Card, deck: Deck?, last: Int?) -> String {
    if let d = deck, d.grading == "piles" {
      let P = d.piles.map(\.name)
      guard let pile = c.pile, let i = P.firstIndex(of: pile) else { return "new" }
      return i == 0 ? "easy" : i == P.count - 1 ? "hard" : "medium"
    }
    if c.srs.state == "new" && c.srs.reps == 0 { return "new" }
    if isHard(c) || c.srs.d >= 7 { return "hard" }
    if c.srs.d != 0 { return c.srs.d <= 4 ? "easy" : "medium" }
    guard let r = last else { return "new" }
    return r == 1 ? "hard" : r == 2 ? "medium" : "easy"
  }

  /// Decks whose name, tags, or cards have these words (`q` lowercased), like db.js searchDecks: a formula is found by
  /// what it shows (π) or how it was typed (\pi).
  func searchDecks(_ q: String) -> Set<String> {
    if demo { return Set(Sample.shared.DECKS.filter { $0.name.lowercased().contains(q) }.map(\.id)) }
    func words(_ c: Card) -> String {
      ([c.front, c.back, c.note, c.speak, Occ(c)?.label ?? ""].map { Rich.plain($0, join: " ") + " " + Rich.plain($0, join: " ", showMath: true) }
        + [Rich.plain(c.text, cloze: true, join: " "), Rich.plain(c.text, cloze: true, join: " ", showMath: true)] + c.tags).joined(separator: " ").lowercased()
    }
    let hit = Set(lib.cards.filter { words($0).contains(q) }.map(\.deckId))
    return Set(lib.decks.filter { d in d.name.lowercased().contains(q) || d.tags.contains { $0.lowercased().contains(q) } || hit.contains(d.id) }.map(\.id))
  }

  // ---------- folders ----------
  /// Makes a folder (and puts a deck in it, when a deck asked for a new one); returns its id.
  @discardableResult
  func newFolder(_ name: String, deck: String? = nil) async -> String? {
    if demo {
      let id = "f\(demoFolders.count + 1)" + String(Int(Date().timeIntervalSince1970), radix: 36)
      demoFolders.append((id, name, []))
      if let deck { demoMoved[deck] = .some(id) }
      return id
    }
    guard let id = await send("folder.add", ["name": name])["id"] as? String else { return nil }
    if let deck { await send("deck.update", ["id": deck, "patch": ["folder": id]]) }
    return id
  }

  func renameFolder(_ id: String, _ name: String) {
    if demo { if let i = demoFolders.firstIndex(where: { $0.id == id }) { demoFolders[i].name = name }; return }
    if let i = lib.folders.firstIndex(where: { $0.id == id }) { lib.folders[i].name = name }
    Task { await send("folder.update", ["id": id, "patch": ["name": name]]) }
  }

  /// Removes a folder; its decks go back to the Library.
  func deleteFolder(_ id: String) async {
    if demo {
      demoFolders.removeAll { $0.id == id }
      for (k, v) in demoMoved where v == id { demoMoved[k] = .some(nil) }
      return
    }
    lib.folders.removeAll { $0.id == id }
    for i in lib.decks.indices where lib.decks[i].folder == id { lib.decks[i].folder = nil }
    await send("folder.delete", ["id": id])
  }

  /// Into a folder, or out of one (nil).
  func moveDeck(_ id: String, to folder: String?) { updateDeck(id, ["folder": folder ?? NSNull()]) }
}

/// How hard a card is, as a word and its color (New blue, Easy green, Medium amber, Hard red).
enum Level {
  static let all = ["new", "easy", "medium", "hard"]
  static func name(_ k: String) -> String { ["new": "New", "easy": "Easy", "medium": "Medium", "hard": "Hard"][k] ?? "New" }
  static func color(_ k: String, _ t: Theme) -> Color { k == "easy" ? t.good : k == "medium" ? t.hard : k == "hard" ? t.again : t.easy }
}

/// Where the Library's menus open from: a deck's ⋯ button ("move-<deck>"), Tags ("tags"), and the deck picker ("decks").
private struct MenuAnchors: PreferenceKey {
  static let defaultValue: [String: Anchor<CGRect>] = [:]
  static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) { value.merge(nextValue()) { $1 } }
}

struct LibraryScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// One folder's page, or (nil) the Library itself.
  var folderId: String? = nil
  @State private var q = ""
  /// Naming a folder: a new one (maybe for a deck that asked to move into it), or renaming this one.
  enum Naming { case new, rename }
  @State private var naming: Naming? = nil
  @State private var name = ""
  @State private var moveAfter: String? = nil
  @FocusState private var nameFocused: Bool
  /// The open menu (see MenuAnchors), and what's typed in its search.
  @State private var menu: String? = nil
  @State private var menuQ = ""
  // All cards: how hard, the tags every card must have, a deck or folder ("f:<id>"), and how many are shown.
  @State private var level = "all"
  @State private var cardTags: [String] = []
  @State private var pick = ""
  @State private var shown = 60
  @State private var confirmRemove = false

  var body: some View {
    let decks = store.libraryDecks(), folders = store.libraryFolders(decks)
    let folder = folderId.flatMap { id in folders.first { $0.id == id } }
    let cards = nav.libCards && folderId == nil
    Group {
      if folderId != nil && folder == nil { Color.clear.onAppear { nav.back() } }
      // No decks and no folders yet (PhoneDecksEmpty).
      else if folderId == nil && !cards && decks.isEmpty && folders.isEmpty { empty }
      else { page(decks, folders, folder, cards) }
    }
    .toolbar(.hidden, for: .navigationBar)
  }

  // ---------- the page ----------
  private func page(_ decks: [LibDeck], _ folders: [LibFolder], _ folder: LibFolder?, _ cards: Bool) -> some View {
    let ql = q.trimmingCharacters(in: .whitespaces).lowercased()
    return ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 14) {
        if let folder { folderTop(folder) } else { top(cards) }
        if folder == nil {
          Segmented(options: [("decks", "Decks"), ("cards", "All cards")], current: cards ? "cards" : "decks", height: 36, size: 14, gap: 2, hPad: 16) { id in
            menu = nil; nav.libCards = id == "cards"
          }
        }
        search(cards ? "Search all cards" : folder != nil ? "Search this folder" : "Search decks and cards")
        if naming != nil { nameForm }
        if cards { allCards(ql, decks, folders) } else { deckList(ql, decks, folders, folder) }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .scrollDismissesKeyboard(.immediately)
    .ignoresSafeArea(edges: .top)
    .overlayPreferenceValue(MenuAnchors.self) { anchors in menus(anchors, decks, folders) }
    .confirmationDialog("Remove the folder “\(folder?.name ?? "")”?", isPresented: $confirmRemove, titleVisibility: .visible) {
      // Back to the Library (the page also goes back by itself once its folder is gone).
      Button("Remove folder", role: .destructive) { if let id = folderId { Task { await store.deleteFolder(id); if nav.path.last == .folder(id) { nav.back() } } } }
    } message: { Text("Its decks stay in your library.") }
  }

  /// The title with New folder and New deck; in cards mode, just New deck.
  private func top(_ cards: Bool) -> some View {
    HStack(spacing: 8) {
      Text("Library").css(32, .bold, ls: -0.03).foregroundStyle(t.text).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
      if !cards { round("folder", "New folder") { startNaming(.new) } }
      round("plus", "New deck", inv: true) { nav.newDeck() }
    }
    .frame(height: 41)
  }

  /// A folder's page: back, Rename, New deck, then its name.
  private func folderTop(_ f: LibFolder) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 8) {
        round("back", "Library") { nav.back() }
        Spacer(minLength: 0)
        Button { startNaming(.rename, f.name) } label: {
          Text("Rename").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 40).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press)
        round("plus", "New deck", inv: true) { nav.newDeck() }
      }
      // A 41-point line, like the browser's (Geist's rounded ascent and descent).
      Text(f.name).css(32, .bold, ls: -0.03, lh: 41 / 32).foregroundStyle(t.text).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
    }
  }

  /// libRound: a 40-point circle, gray or black.
  private func round(_ icon: String, _ label: String, inv: Bool = false, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Icon(icon, 18, 2).foregroundStyle(inv ? t.invText : t.text).frame(width: 40, height: 40).background(Circle().fill(inv ? t.inv : t.surf))
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }

  private func search(_ hint: String) -> some View {
    HStack(spacing: 10) {
      Icon("search", 16, 1.8).foregroundStyle(t.muted)
      TextField("", text: $q, prompt: Text(hint).foregroundStyle(t.muted))
        .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search)
        .padding(.leading, 2)
        .onChange(of: q) { _, _ in shown = 60 }
    }
    .padding(.horizontal, 16).frame(height: 44)
    .background(Capsule().fill(t.surf))
  }

  // Naming a folder: return saves, Cancel closes.
  private var nameForm: some View {
    HStack(spacing: 8) {
      Icon("folder", 18, 1.8).foregroundStyle(t.muted)
      TextField("", text: $name, prompt: Text("Folder name").foregroundStyle(t.muted))
        .font(.geist(16)).foregroundStyle(t.text).focused($nameFocused).submitLabel(.done).onSubmit(saveName)
        .accessibilityLabel("Folder name")
        .onAppear { nameFocused = true }
      Button(action: closeNaming) { Text("Cancel").css(13, .semibold).foregroundStyle(t.muted).padding(.horizontal, 14).frame(height: 36).contentShape(Capsule()) }
        .buttonStyle(.press)
      Button(action: saveName) {
        Text(naming == .rename ? "Save" : "Create").css(13, .semibold).foregroundStyle(t.invText).padding(.horizontal, 18).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .padding(.leading, 18).padding(.trailing, 6).padding(.vertical, 6)
    .background(Capsule().fill(t.surf))
  }
  private func startNaming(_ n: Naming, _ value: String = "", deck: String? = nil) { menu = nil; naming = n; name = value; moveAfter = deck; nameFocused = true }
  private func closeNaming() { naming = nil; name = ""; moveAfter = nil; nameFocused = false }
  private func saveName() {
    let n = name.trimmingCharacters(in: .whitespaces)
    guard !n.isEmpty else { return }
    if naming == .rename, let id = folderId { store.renameFolder(id, n) }
    else { let deck = moveAfter; Task { await store.newFolder(n, deck: deck) } }
    closeNaming()
  }

  // ---------- decks ----------
  // In a folder, its decks. At the top, the folders and then the decks in none, unless a search looks everywhere.
  @ViewBuilder private func deckList(_ ql: String, _ decks: [LibDeck], _ folders: [LibFolder], _ folder: LibFolder?) -> some View {
    let hits = ql.isEmpty ? nil : store.searchDecks(ql)
    let scope = folder.map { f in decks.filter { $0.folder == f.id } } ?? (hits != nil || folders.isEmpty ? decks : decks.filter { $0.folder == nil })
    let list = scope.filter { hits?.contains($0.id) ?? true }
    if folder == nil && hits == nil && !folders.isEmpty {
      Eyebrow(text: "Folders").padding(.horizontal, 4).padding(.top, 6)
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
        ForEach(folders) { folderTile($0) }
      }
      Eyebrow(text: "Decks").padding(.horizontal, 4).padding(.top, 10)
    }
    VStack(spacing: 0) {
      ForEach(list) { deckRow($0) }
    }
    if folder != nil {
      Button { confirmRemove = true } label: {
        Text("Remove folder").css(14, .semibold).foregroundStyle(t.again).padding(.horizontal, 16).frame(height: 40).contentShape(Capsule())
      }
      .buttonStyle(.press)
      .frame(maxWidth: .infinity)
    }
    if list.isEmpty {
      emptyBox(folder != nil ? "No decks in this folder yet. Use a deck’s ⋯ button to move it here." : "No decks match.")
    }
  }

  /// A folder: its first decks' colors fanned like cards, its name, and how many decks and due cards are in it.
  private func folderTile(_ f: LibFolder) -> some View {
    Button { menu = nil; nav.push(.folder(f.id)) } label: {
      VStack(alignment: .leading, spacing: 0) {
        ZStack(alignment: .topLeading) {
          ForEach(Array(f.decks.prefix(3).enumerated()), id: \.offset) { i, d in
            let fan: (x: CGFloat, y: CGFloat, r: Double) = [(0, 8, -8), (22, 4, 0), (44, 0, 8)][i]
            CSSLinearGradient(angle: d.mesh.angle, stops: d.mesh.stops)
              .frame(width: 60, height: 41)
              .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
              .boxShadow(.black.opacity(0.4), y: 8, blur: 18, spread: -8, radius: 12)
              .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf).padding(-2))
              .rotationEffect(.degrees(fan.r))
              .offset(x: fan.x, y: fan.y)
          }
          if f.decks.isEmpty { Icon("folder", 44, 1.5).foregroundStyle(t.muted).offset(x: -2, y: 2) }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading).frame(height: 49, alignment: .topLeading)
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 3) {
          Text(f.name).css(17, .semibold, ls: -0.01).lineLimit(1)
          Text(f.line).css(13).foregroundStyle(t.muted).lineLimit(1)
        }
      }
      .foregroundStyle(t.text)
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading).frame(height: 132)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    .buttonStyle(.press)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(f.name), \(f.line)")
    .accessibilityAddTraits(.isButton)
  }

  /// A deck: its colors (or photo), name, numbers, what's due, and the ⋯ button that moves it between folders.
  private func deckRow(_ d: LibDeck) -> some View {
    HStack(spacing: 8) {
      Button { menu = nil; nav.push(.deck(d.id)) } label: {
        HStack(spacing: 12) {
          ZStack {
            CSSLinearGradient(angle: d.mesh.angle, stops: d.mesh.stops)
            if let p = d.photo { FillPhoto(url: store.api.mediaURL(p)) }
          }
          .frame(width: 48, height: 48).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
          VStack(alignment: .leading, spacing: 2) {
            Text(d.name).css(16, .medium).foregroundStyle(t.text).lineLimit(1)
            Text(d.line).css(13).foregroundStyle(t.muted).lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          Text(d.due > 0 ? "\(d.due)" : "—").css(15, mono: true).foregroundStyle(d.due > 0 ? t.text : t.muted)
        }
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      let key = "move-" + d.id
      Button { menuQ = ""; menu = menu == key ? nil : key } label: {
        Icon("more", 16, 2).foregroundStyle(t.muted).frame(width: 36, height: 36).contentShape(Circle())
      }
      .buttonStyle(.press)
      .accessibilityLabel("Move \(d.name) to a folder")
      .anchorPreference(key: MenuAnchors.self, value: .bounds) { [key: $0] }
    }
    .frame(minHeight: 68)
    .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
    .padding(.bottom, 1)
  }

  private func emptyBox(_ line: String) -> some View {
    Text(line).css(15, lh: 1.4).foregroundStyle(t.muted).multilineTextAlignment(.center)
      .padding(.horizontal, 20).padding(.vertical, 36).frame(maxWidth: .infinity)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
  }

  // ---------- all cards ----------
  // Filtered by how hard, by tags (a card must have every picked one), by deck or folder, and by the search.
  @ViewBuilder private func allCards(_ ql: String, _ decks: [LibDeck], _ folders: [LibFolder]) -> some View {
    let base = store.libraryCards().filter { c in
      (pick.isEmpty || (pick.hasPrefix("f:") ? c.folder == String(pick.dropFirst(2)) : c.deckId == pick))
        && cardTags.allSatisfy(c.tags.contains)
        && (ql.isEmpty || ([c.front, c.back, c.deckName] + c.tags).joined(separator: " ").lowercased().contains(ql))
    }
    let matched = base.filter { level == "all" || $0.level == level }
    levels(base)
    FlowLayout(spacing: 8, lineSpacing: 8) {
      menuButton("tags", "Tags")
      menuButton("decks", deckOptions(decks, folders).first { $0.id == pick }?.label ?? "All decks")
      ForEach(cardTags, id: \.self) { g in
        let c = Tags.color(g)
        Button { cardTags.removeAll { $0 == g }; shown = 60 } label: {
          HStack(spacing: 6) { Text(g).css(13, .semibold).lineLimit(1); Icon("close", 10, 2.4).opacity(0.7) }
            .foregroundStyle(c.color).padding(.leading, 12).padding(.trailing, 10).frame(height: 32).background(Capsule().fill(c.opacity(0.149).color))
        }
        .buttonStyle(.press)
        .accessibilityLabel("Stop filtering by \(g)")
      }
    }
    Text(grouped(matched.count) + (matched.count == 1 ? " card" : " cards")).css(13).foregroundStyle(t.muted).padding(.horizontal, 4).padding(.top, 2)
    LazyVStack(spacing: 0) {
      ForEach(matched.prefix(shown)) { cardRow($0) }
    }
    if matched.count > shown {
      Button { shown += 40 } label: {
        Text("Show \(min(40, matched.count - shown)) more").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 20).frame(height: 40).background(Capsule().fill(t.surf))
      }
      .buttonStyle(.press)
      .frame(maxWidth: .infinity)
    }
    if matched.isEmpty { emptyBox("No cards match. Try fewer filters.") }
  }

  /// All · New · Easy · Medium · Hard, each with how many cards (levelSeg, tight: they share the row's width).
  private func levels(_ base: [LibCard]) -> some View {
    FlexRow(spacing: 2) {
      ForEach(["all"] + Level.all, id: \.self) { k in
        let on = level == k, n = k == "all" ? base.count : base.filter { $0.level == k }.count
        Button { level = k; shown = 60 } label: {
          HStack(spacing: 4) {
            Circle().fill(k == "all" ? .clear : Level.color(k, t)).frame(width: k == "all" ? 0 : 8, height: 8)
            Text(k == "all" ? "All" : Level.name(k)).css(12, .semibold).lineLimit(1)
            Text("\(n)").css(11, .semibold, mono: true).opacity(0.6)
          }
          .foregroundStyle(on ? t.text : t.muted)
          .padding(.horizontal, 6).frame(maxWidth: .infinity).frame(height: 34)
          .background(Capsule().fill(on ? t.bg : .clear).shadow(color: .black.opacity(on ? 0.14 : 0), radius: 1.5, x: 0, y: 1))
          .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel((k == "all" ? "All" : Level.name(k)) + ", \(n)")
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .padding(4)
    .background(Capsule().fill(t.surf))
  }

  private func menuButton(_ key: String, _ label: String) -> some View {
    Button { menuQ = ""; menu = menu == key ? nil : key } label: {
      HStack(spacing: 6) { Text(label).css(13, .semibold).lineLimit(1); Icon("chevDown", 14, 2) }
        .foregroundStyle(t.text).padding(.leading, 14).padding(.trailing, 12).frame(height: 36).background(Capsule().fill(t.surf))
    }
    .buttonStyle(.press)
    .anchorPreference(key: MenuAnchors.self, value: .bounds) { [key: $0] }
  }

  /// A card: its front (two lines at most), its deck's color and name, how hard it is, and when it's next.
  private func cardRow(_ c: LibCard) -> some View {
    Button { menu = nil; nav.newCard(deckId: c.deckId, cardId: store.demo ? nil : c.id) } label: {
      VStack(alignment: .leading, spacing: 6) {
        LabelText(text: Rich.nsText([Rich.Run(t: c.front, m: "")], size: 15, weight: .medium, lh: 1.35, color: UIColor(t.text), dark: t.dark), lines: 2, clamp: true)
        HStack(spacing: 8) {
          CSSLinearGradient(angle: c.mesh.angle, stops: c.mesh.stops).frame(width: 12, height: 12).clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
          Text(c.deckName).css(13).foregroundStyle(t.muted).lineLimit(1)
          HStack(spacing: 6) { Circle().frame(width: 8, height: 8); Text(Level.name(c.level)).css(13, .semibold) }
            .foregroundStyle(Level.color(c.level, t)).fixedSize()
          Spacer(minLength: 0)
          Text(c.next).css(13).foregroundStyle(t.muted).fixedSize()
        }
      }
      .padding(.vertical, 12)
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
      .padding(.bottom, 1)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }

  // ---------- menus ----------
  /// The deck picker's choices: every deck, every folder ("f:<id>"), or all of them ("").
  private func deckOptions(_ decks: [LibDeck], _ folders: [LibFolder]) -> [(id: String, label: String, dot: AnyShapeStyle)] {
    [("", "All decks", AnyShapeStyle(t.muted))] + folders.map { ("f:" + $0.id, $0.name, AnyShapeStyle(t.text)) }
      + decks.map { d in (d.id, d.name, AnyShapeStyle(LinearGradient(stops: d.mesh.stops.map { .init(color: $0.0.color, location: $0.1) }, startPoint: .topLeading, endPoint: .bottomTrailing))) }
  }

  /// The open menu, just under what opened it (or over it, when there's no room below), over a layer that closes it.
  @ViewBuilder private func menus(_ anchors: [String: Anchor<CGRect>], _ decks: [LibDeck], _ folders: [LibFolder]) -> some View {
    if let m = menu, let a = anchors[m] {
      GeometryReader { g in
        let r = g[a], move = m.hasPrefix("move-"), width: CGFloat = move ? 240 : 300
        let x = move ? r.maxX - width : min(r.minX, g.size.width - width - 16)
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).onTapGesture { menu = nil }
          Group {
            if move, let d = decks.first(where: { "move-" + $0.id == m }) { moveMenu(d, folders) }
            else if m == "tags" { tagMenu() }
            else { deckMenu(decks, folders) }
          }
          .frame(width: width)
          .modifier(PopBox())
          .alignmentGuide(.leading) { _ in -x }
          .alignmentGuide(.top) { d in
            // Below it (like the canvas), unless that runs into the tab bar and there's room above.
            let below = r.maxY + 8 + d.height <= g.size.height - 100 || r.minY - 8 - d.height < Screen.top(60)
            return -(below ? r.maxY + 8 : r.minY - 8 - d.height)
          }
        }
      }
      .transition(.opacity)
    }
  }

  /// Move to: No folder or a folder (ticked where it is), then New folder.
  private func moveMenu(_ d: LibDeck, _ folders: [LibFolder]) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("Move to").css(12, .semibold).foregroundStyle(t.muted).padding(.horizontal, 12).padding(.top, 8).padding(.bottom, 4)
      ForEach([(key: "", id: String?.none, name: "No folder")] + folders.map { (key: $0.id, id: Optional($0.id), name: $0.name) }, id: \.key) { f in
        let on = d.folder == f.id
        Button { store.moveDeck(d.id, to: f.id); menu = nil } label: {
          HStack(spacing: 10) {
            Icon("folder", 16, 1.8).foregroundStyle(t.muted)
            Text(f.name).css(14).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
            if on { Icon("check", 14, 2.4) }
          }
          .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 38).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
      Button { startNaming(.new, deck: d.id) } label: {
        HStack(spacing: 10) { Icon("plus", 13, 2.4); Text("New folder").css(14, .semibold); Spacer(minLength: 0) }
          .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 38)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf))
      }
      .buttonStyle(.plain)
    }
    .padding(8)
  }

  /// Filter by tag: every tag on your cards, most used first; pick several (a card must have them all).
  private func tagMenu() -> some View {
    var uses: [String: Int] = [:]
    for c in store.libraryCards() { for g in c.tags { uses[g, default: 0] += 1 } }
    let mq = menuQ.trimmingCharacters(in: .whitespaces).lowercased()
    let names = uses.keys.sorted { (uses[$0]!, $1) > (uses[$1]!, $0) }.filter { mq.isEmpty || $0.lowercased().contains(mq) }
    return pickerMenu(find: "Find a tag", none: "No tags match", rows: names.map { g in
      (id: g, label: g, dot: AnyShapeStyle(Tags.color(g).color), count: String(uses[g]!), on: cardTags.contains(g), pick: {
        cardTags = cardTags.contains(g) ? cardTags.filter { $0 != g } : cardTags + [g]; shown = 60
      })
    })
  }

  /// Filter by deck or folder.
  private func deckMenu(_ decks: [LibDeck], _ folders: [LibFolder]) -> some View {
    let mq = menuQ.trimmingCharacters(in: .whitespaces).lowercased()
    return pickerMenu(find: "Find a deck or folder", none: "No decks match", rows: deckOptions(decks, folders).filter { mq.isEmpty || $0.label.lowercased().contains(mq) }.map { o in
      (id: o.id, label: o.label, dot: o.dot, count: "", on: o.id == pick, pick: { pick = o.id; menu = nil; shown = 60 })
    })
  }

  /// A menu with a search and rows (a colored dot, the name, a count, and a tick when it's picked).
  private func pickerMenu(find: String, none: String, rows: [(id: String, label: String, dot: AnyShapeStyle, count: String, on: Bool, pick: () -> Void)]) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      SearchField(text: $menuQ, placeholder: find)
      CappedScroll(max: 304) {
        VStack(spacing: 0) {
          ForEach(rows, id: \.id) { o in
            Button(action: o.pick) {
              HStack(spacing: 10) {
                Circle().fill(o.dot).frame(width: 8, height: 8)
                Text(o.label).css(14).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                if !o.count.isEmpty { Text(o.count).css(12, mono: true).foregroundStyle(t.muted) }
                if o.on { Icon("check", 15, 2.4) }
              }
              .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 38).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(o.on ? .isSelected : [])
          }
          if rows.isEmpty { Text(none).css(13).foregroundStyle(t.muted).padding(.horizontal, 12).padding(.vertical, 10).frame(maxWidth: .infinity, alignment: .leading) }
        }
      }
    }
    .padding(8)
  }

  // ---------- no decks yet ----------
  // PhoneDecksEmpty: the page doesn't scroll; the art and the ways to start sit in the middle.
  private var empty: some View {
    VStack(spacing: 14) {
      PageTitle("Library") { RoundButton(icon: "plus", label: "New deck") { nav.newDeck() } }
      EmptyBlock(art: 150, icon: "plus", title: "No decks yet", line: "Make one, bring your cards from Anki or Quizlet, or let your AI make them for you.") {
        EmptyActions(primary: ("New deck", "plus", { nav.newDeck() }), a: ("Import cards", "upload", { nav.importCards() }), b: ("Connect AI", "connect", { nav.pick(.connect) }))
      }
      .padding(.horizontal, 8).padding(.bottom, 20)
      .frame(maxHeight: .infinity)
    }
    .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .ignoresSafeArea()
  }
}

/// A floating menu's box (popBox): the page's color, rounded, with a soft shadow and a thin line around it.
struct PopBox: ViewModifier {
  @Environment(\.theme) private var t
  func body(content: Content) -> some View {
    content
      .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.bg).shadow(color: .black.opacity(0.2), radius: 24, x: 0, y: 18))
      .overlay(RoundedRectangle(cornerRadius: 23, style: .continuous).strokeBorder(t.line, lineWidth: 1).padding(-1))
  }
}
