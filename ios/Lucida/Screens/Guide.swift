// iPhone · A deck's Notes page (PhoneGuide: Writing, Block menu, Format bar, Toggle open, Toggle closed, Section folded, Blank note, Reading on a shared deck,
// Older versions, A new page, and the Dark and Gray twins): the Guide and its extra pages as one page that is always formatted, where you tap and type
// (Design/NotesViews.swift; its rules in Data/Notes.swift), opened from the deck page's Notes (a tap on the words opens it there). At the top: back, the deck's
// name, the quiet saving line and ⋯ (Make cards from this page, New page, Older versions, Rename page, Delete page); under it the pages as pills once there
// are two or more (no Guide pill on its own: the owner, 2026-10-02). At the page's right, the outline's rail (NotesRail: a line for each heading, a tap opens their
// tree in Lucida's own sheet), hidden while a line is written.
// It saves as it's typed (a moment after the last key, one save after another: GuideEditorModel), and Done (the back arrow) sends what is waiting first.
// What is saved is Markdown, written from the page's blocks by web/guide.js itself (GuideEngine), so the iPhone keeps exactly what the web keeps.
import SwiftUI

/// The page on show: the deck's name, the extra pages, which page, its name and words, and what can be done.
struct GuideNow {
  var deckName = "", pages: [MakeGuidePage] = [], pageId = "main", title = "Guide", text = ""
  var canEdit = false, reading = false, canAdd = false, hist = false, view = ""
  var key: String { pageId }
  var tabs: [MakeGuidePage] { [MakeGuidePage(id: "main", title: "Guide")] + pages }
}

struct GuideScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  @StateObject private var model: GuideEditorModel
  @StateObject private var notes = NotesPage()
  @StateObject private var scroll = NotesScroll()
  @State private var hooks = NotesHooks()
  /// (only the rail watches it: the page isn't drawn again as the heading being read changes)
  @State private var outline = NotesOutline()
  let deckId: String
  @State private var picking = false
  @State private var pictureAfter: String? = nil
  @State private var more = false
  @State private var renaming = false
  @State private var aa = false
  /// The name a new page took from its first heading (it goes on following it until the page is renamed).
  @State private var named = ""
  /// The design screen's page that doesn't exist yet (A new page).
  private let demoNewPage = MakeGuidePage(id: "gnew", title: "New page")

  init(deckId: String, page: String = "") {
    self.deckId = deckId
    _model = StateObject(wrappedValue: GuideEditorModel(deckId: deckId, page: page.isEmpty ? "main" : page))
  }

  private func now() -> GuideNow {
    let g = store.guide(deckId), view = store.demo ? store.props.guideView : ""
    var n = GuideNow(deckName: store.deck(deckId).name, view: view)
    n.pages = g.pages + (view == "A new page" ? [demoNewPage] : [])
    let want = store.demo && view == "A new page" && model.page == "main" ? "gnew" : model.page
    n.pageId = n.pages.contains { $0.id == want } ? want : "main"
    let page = n.pageId == "main" ? nil : n.pages.first { $0.id == n.pageId }
    let cur: (title: String, text: String) = page.map { (title: $0.title, text: $0.text) } ?? (title: "Guide", text: g.text)
    n.title = cur.title
    n.text = model.drafts[model.key(n.pageId)] ?? (view == "Blank note" ? "" : cur.text)
    n.reading = view == "Reading on a shared deck"
    n.canEdit = g.can && !n.reading
    n.canAdd = n.canEdit && n.pages.count < store.lib.make.guidePages
    n.hist = model.historyOpen || view == "Older versions"
    return n
  }

  var body: some View {
    let n = now()
    // (the bar shows while a line is written in: above the keyboard, or at the bottom with a hardware keyboard)
    let keys = n.canEdit && !n.hist && !renaming && (notes.editing != nil || notes.linking || (store.demo && (NotesDemo.of(n.view)?.keys ?? false)))
    let under = keyboard.height > 0 ? keyboard.height : store.demo ? 0 : Self.safeBottom
    GeometryReader { geo in
      ZStack(alignment: .bottom) {
        VStack(spacing: 0) {
          GuideTopBar(model: model, name: n.deckName, canEdit: n.canEdit, reading: n.reading, more: $more) { Task { await done() } }
          if n.tabs.count > 1 { GuidePagesRow(tabs: n.tabs, pageId: n.pageId, pick: pick) }
          if n.hist { GuideHistory(model: model, title: "Older versions of " + (n.pageId == "main" ? "the Guide" : n.title)) { Task { await model.toggleHistory() } } }
          else {
            GuidePageArea(notes: notes, scroll: scroll, outline: outline, rail: !keys && !renaming && keyboard.height == 0, setup: setup(n), renaming: $renaming, title: n.title,
                          hl: store.demo ? NotesDemo.of(n.view)?.bar : nil) { model.rename($0) }
          }
        }
        .padding(.top, Screen.top(52))
        .padding(.bottom, keys ? under + 50 : keyboard.height)
        if keys { NotesKeys(page: notes, aa: $aa, picture: store.demo ? {} : { pictureAfter = notes.editing; picking = true }).padding(.bottom, under) }
        if more { GuideMoreMenu(n: n, close: { withAnimation(Motion.leave) { more = false } }, make: { makeCards(n) }, add: { more = false; addPage() }, history: { more = false; Task { await model.toggleHistory() } },
                                rename: { more = false; renaming = true }, delete: { more = false; askDelete(n) }) }
      }
      .foregroundStyle(t.text)
      .background(t.bg)
      // (The page lays itself out on the whole screen and makes room for the keyboard itself; the system would otherwise move it up under the status bar.)
      .frame(width: geo.size.width, height: UIScreen.main.bounds.height, alignment: .top)
      .offset(y: -geo.frame(in: .global).minY)
    }
    .ignoresSafeArea(.all, edges: [.top, .bottom])
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { start(n) }
    .onChange(of: n.pageId) { _, _ in load(now()) }
    .onChange(of: n.text) { _, md in notes.reload(md) }
    .onDisappear { notes.flush(); Task { await model.flush() } }
    .photoPicker($picking) { src in notes.insertPicture(after: pictureAfter, src: src) }
  }

  /// The room the phone keeps at the bottom of the screen (the home indicator).
  static var safeBottom: CGFloat { (UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.bottom) ?? 0 }
  private func setup(_ n: GuideNow) -> NotesSetup { NotesSetup(colors: NotesColors(t, code: t.surf), editable: n.canEdit, hooks: hooks) }

  /// The first time on screen: the model gets its acts from the app (the design screens save nothing), the page its words, and the caret its place.
  private func start(_ n: GuideNow) {
    model.env = GuideEditorModel.Env(
      save: { [store] d, p, text in try await store.guideSave(d, page: p, text: text) },
      addPage: { [store] d, title in try await store.guideAddPage(d, title: title) },
      rename: { [store] d, p, title in try await store.guideRenamePage(d, page: p, title: title) },
      delete: { [store] d, p in try await store.guideDeletePage(d, page: p) },
      restore: { [store] d, p, at in try await store.guideRestore(d, page: p, at: at) },
      history: { [store] d, p in await store.guideHistory(d, page: p) })
    hooks.image = GuideImages.own
    if store.demo {
      if n.view == "A new page" { model.page = "gnew" }
      if n.view == "Older versions" { model.versions = GuideSample.versions }
      aa = NotesDemo.of(n.view)?.aa ?? false
    }
    // (the canvas's Outline open: the outline's sheet over the page)
    if store.demo && n.view == "Outline open" {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [notes, outline, scroll, nav] in
        outline.refresh(notes.outline, top: scroll.viewport.minY, scrolled: false)
        NotesRail.open(nav: nav, heads: notes.outline, outline: outline, page: notes)
      }
    }
    if !store.demo && !store.guide(deckId).can { nav.back(); return }
    load(n)
    // the caret where the page was tapped on the deck page, or at the end of what is written (the deck page's + › Notes)
    let want = nav.guideAt, at = want.split(separator: ":").compactMap { Int($0) }
    nav.guideAt = ""
    if n.canEdit && !store.demo && at.count == 2 { notes.focusAt(at[0], at[1]) }
    else if n.canEdit && !store.demo && want == "end" && !n.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { notes.focusEnd() }
  }
  /// The page's words go in (a design screen's state picks which toggles are open, what is folded and what is selected).
  private func load(_ n: GuideNow) {
    let key = (store.demo ? "canvas|" + n.view + "|" : "") + deckId + "|" + n.pageId
    notes.onChange = { [weak model] md in model?.type(md); nameFrom(md) }
    notes.load(n.text, key: key, editable: n.canEdit, blank: n.canEdit, demo: store.demo ? NotesDemo.of(n.view) : nil)
    // a blank note starts with the caret in its title
    if n.canEdit && !store.demo && n.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { notes.focusAt(0, 0) }
  }
  /// A new page is called by its title (its first line, when that's a heading) until it is renamed.
  private func nameFrom(_ md: String) {
    let n = now()
    guard n.pageId != "main", n.title == "New page" || n.title == named, let first = md.components(separatedBy: "\n").first,
          first.range(of: #"^#{1,6} +\S"#, options: .regularExpression) != nil else { return }
    let name = String(GuideEngine.shared.plain(first).components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ").prefix(80))
    if !name.isEmpty && name != n.title { named = name; model.rename(name) }
  }

  private func pick(_ id: String) { notes.flush(); renaming = false; Task { await model.pick(id) } }
  private func addPage() { notes.flush(); renaming = false; Task { await model.addPage() } }

  /// Done: what's waiting is saved, and the deck's Notes are on screen again (if it can't be saved, the page says why and stays).
  private func done() async {
    notes.flush()
    await model.flush()
    guard model.error.isEmpty else { return }
    nav.deckWants = DeckWant(deckId: deckId, tab: "notes")
    if nav.path.dropLast().last == .deck(deckId) { nav.back() } else { nav.tab = .library; nav.path = [.deck(deckId)] }
  }
  /// Make cards from this page, or from what is selected on it.
  private func makeCards(_ n: GuideNow) {
    let sel = notes.selectedText
    more = false
    Task {
      notes.flush()
      await model.flush()
      guard model.error.isEmpty else { return }
      if sel.isEmpty { nav.make(deckId: deckId, guide: deckId, page: n.pageId) } else { nav.make(deckId: deckId, text: sel, title: n.deckName + " (selection)") }
    }
  }
  private func askDelete(_ n: GuideNow) {
    nav.ask("Delete the page “\(n.title)”?", action: "Delete page", danger: true) { Task { notes.flush(); await model.deletePage() } }
  }
}

// ---------- the top ----------
/// Back (Done), the deck's name, the quiet saving line and ⋯.
struct GuideTopBar: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: GuideEditorModel
  let name: String
  let canEdit: Bool
  let reading: Bool
  @Binding var more: Bool
  let done: () -> Void
  var body: some View {
    HStack(spacing: 8) {
      Button(action: done) { Icon("back", 20, 2).foregroundStyle(t.text).frame(width: 40, height: 40).contentShape(Circle()) }
        .buttonStyle(.press).accessibilityLabel("Done").accessibilityIdentifier("backButton")
      Text(name).css(15, .semibold).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
      if !reading {
        Text(model.saveLabel).css(13).foregroundStyle(model.error.isEmpty ? t.muted : t.again).lineLimit(1).fixedSize()
          .accessibilityIdentifier("saveLabel")
      }
      if canEdit {
        Button { withAnimation(Motion.pop) { more.toggle() } } label: {
          Icon("more", 18, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(more ? t.surf : .clear))
        }
        .buttonStyle(.press).accessibilityLabel("More").accessibilityAddTraits(more ? .isSelected : [])
      }
    }
    .padding(.horizontal, 12).frame(height: 52)
  }
}

/// A pill for the Guide and for each extra page, once there are two or more (New page is in ⋯).
struct GuidePagesRow: View {
  @Environment(\.theme) private var t
  let tabs: [MakeGuidePage]
  let pageId: String
  let pick: (String) -> Void
  var body: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 4) {
        ForEach(tabs) { x in
          let on = x.id == pageId
          Button { pick(x.id) } label: {
            Text(x.title).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.text : t.muted).padding(.horizontal, 13).frame(height: 32).frame(maxWidth: 220)
              .background(Capsule().fill(on ? t.surf : .clear))
          }
          .buttonStyle(.press).accessibilityLabel(x.title).accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      .padding(.horizontal, 16)
    }
    .frame(height: 32).padding(.bottom, 4)
  }
}

/// ⋯: what else a page can do (Lucida's own menu: a tap outside closes it).
struct GuideMoreMenu: View {
  @Environment(\.theme) private var t
  let n: GuideNow
  let close: () -> Void
  let make: () -> Void
  let add: () -> Void
  let history: () -> Void
  let rename: () -> Void
  let delete: () -> Void
  var body: some View {
    ZStack(alignment: .topTrailing) {
      Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture(perform: close)
      VStack(spacing: 2) {
        item("sparkle", "Make cards from this " + (n.pageId == "main" ? "guide" : "page"), action: make)
        if n.canAdd { item("plus", "New page", action: add) }
        item("history", "Older versions", action: history)
        if n.pageId != "main" {
          item("pencil", "Rename page", action: rename)
          item("bin", "Delete page", danger: true, action: delete)
        }
      }
      .padding(6).frame(width: 252)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.bg).shadow(color: .black.opacity(0.22), radius: 22, x: 0, y: 18))
      .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.line, lineWidth: 1))
      .padding(.top, Screen.top(52) + 52).padding(.trailing, 12)
      .popTransition()
      .accessibilityElement(children: .contain).accessibilityLabel("More")
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
  }
  private func item(_ icon: String, _ label: String, danger: Bool = false, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 10) {
        if icon == "bin" { NotesIcon("bin", 16, 2) } else { Icon(icon, 16, 2) }
        Text(label).css(14, .medium).lineLimit(1)
        Spacer(minLength: 0)
      }
      .foregroundStyle(danger ? t.again : t.text).padding(.horizontal, 10).frame(height: 40).contentShape(Rectangle())
    }
    .buttonStyle(.flat).accessibilityLabel(label)
  }
}

// ---------- the page ----------
/// The page itself (and, for an extra page being renamed, its name above it), scrolling, with the caret kept above the bar, and the outline's rail at its right
/// (`rail`: not while the keyboard is up, so it never covers what is being written), 12 points under its top as it scrolls.
struct GuidePageArea: View {
  @Environment(\.theme) private var t
  @ObservedObject var notes: NotesPage
  @ObservedObject var scroll: NotesScroll
  let outline: NotesOutline
  let rail: Bool
  let setup: NotesSetup
  @Binding var renaming: Bool
  let title: String
  let hl: (i: Int, a: Int, b: Int)?
  let rename: (String) -> Void
  @State private var pos = ScrollPosition(edge: .top)
  @State private var name = ""
  @FocusState private var nameOn: Bool
  var body: some View {
    let heads = notes.outline, railOn = rail && heads.count >= 2
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 0) {
        if renaming {
          TextField("", text: $name, prompt: Text("Page name").foregroundStyle(PLACEHOLDER))
            .font(.geist(16, .semibold)).foregroundStyle(t.text).focused($nameOn).submitLabel(.done)
            .onSubmit { renaming = false }
            .onChange(of: name) { _, v in rename(v) }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf))
            .padding(.bottom, 14)
            .accessibilityLabel("Page name")
            .onAppear { name = title; nameOn = true }
        }
        NotesView(page: notes, setup: setup, hl: hl, below: setup.editable ? 120 : 0)
      }
      .padding(.top, 10).padding(.trailing, 20).padding(.leading, 30).padding(.bottom, setup.editable ? 0 : 120)
      .environment(\.notesScroll, scroll)
      .environment(\.notesOutline, outline)
    }
    .scrollPosition($pos)
    .onScrollGeometryChange(for: CGFloat.self, of: { $0.contentOffset.y + $0.contentInsets.top }) { _, y in scroll.offset = y; outline.refresh(heads, top: scroll.viewport.minY) }
    .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { scroll.viewport = $0 }
    .overlay(alignment: .topTrailing) { if railOn { NotesRail(heads: heads, outline: outline, page: notes).padding(.top, 12).transition(.opacity) } }
    .animation(Motion.fade, value: railOn)
    .onAppear { let p = $pos; scroll.go = { y in p.wrappedValue.scrollTo(y: y) }; DispatchQueue.main.async { outline.refresh(heads, top: scroll.viewport.minY, scrolled: false) } }
    .onChange(of: heads) { _, h in DispatchQueue.main.async { outline.refresh(h, top: scroll.viewport.minY, scrolled: false) } }
    .scrollDismissesKeyboard(.interactively)
    .frame(maxHeight: .infinity)
  }
}

// ---------- Older versions ----------
/// In place of the page: each older version with when it was written, how long it is, the start of it, and Restore.
struct GuideHistory: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: GuideEditorModel
  let title: String
  let close: () -> Void
  var body: some View {
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 10) {
        HStack(spacing: 10) {
          Text(title).css(17, .semibold, ls: -0.01).frame(maxWidth: .infinity, alignment: .leading)
          Button(action: close) { Text("Back to the page").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.surf)) }
            .buttonStyle(.press)
        }
        Text("Restoring one keeps what you have now as a version too.").css(14, lh: 1.45).foregroundStyle(t.muted)
        ForEach(model.versions ?? []) { v in GuideVersionCard(v: v) { Task { await model.restore(v) } } }
        if let v = model.versions, v.isEmpty { Text("There are no older versions yet. They show up here as you write.").css(15).foregroundStyle(t.muted) }
      }
      .padding(.top, 10).padding(.horizontal, 16).padding(.bottom, 30)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxHeight: .infinity)
  }
}
struct GuideVersionCard: View {
  @Environment(\.theme) private var t
  let v: GuideVersion
  let restore: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        Text(GuideVersionCard.when(v.at)).css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        Text(plural((v.text as NSString).length, "character")).css(12).foregroundStyle(t.muted)
        Button(action: restore) { Text("Restore").css(13, .semibold).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 32).background(Capsule().fill(t.inv)) }
          .buttonStyle(.press).accessibilityLabel("Restore " + GuideVersionCard.when(v.at))
      }
      // (Laid out whole and cut off by the frame, as the web cuts it: a Text in a short frame would end its last line with an ellipsis.)
      Text(GuideEngine.shared.plain(v.text, 220)).css(13, lh: 1.5).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, maxHeight: 84, alignment: .topLeading).clipped()
    }
    .padding(.horizontal, 16).padding(.vertical, 14)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
  }
  /// "Sep 21, 10:00 AM", as the web writes the time a version was made.
  static func when(_ ms: Double) -> String {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "MMM d, h:mm a"
    return f.string(from: Date(timeIntervalSince1970: ms / 1000))
  }
}
