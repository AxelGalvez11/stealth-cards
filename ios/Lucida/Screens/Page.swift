// iPhone · a deck's page, a Note (design/pages.mjs pageBoards PhonePage: Writing, Versions, Changed by your AI, Make a card; and its Dark twin), opened from the
// deck page's Pages tab or from another page that shows it. At the top: back to the deck (its name, in a pill), the quiet saving line, the version ("v12", a tap
// shows the Versions beside the page: who saved each, what changed, Restore) and ⋯ (Versions, Delete page). Under it the title, a field of its own, and the Note
// itself in the Notes editor (Design/NotesViews.swift, `titled`): its callouts, chains, tables and toggles, the deck's cards it shows (front and back, a weak one
// marked) and the pages it shows (a tap opens them). "+ Card" on a block makes a card from it (New card from this block). When the person's AI changed the page
// while it was being written, both are kept and a line says so. The page saves as it's typed (Data/Pages.swift, like web/pagesclient.js).
// A page of a kind this build can't show (not in PageKind.ready: a Mind map, a Diagram, or a kind that came later) says it needs a newer Lucida, with Back:
// it is never opened in the Notes editor, and nothing on it is saved from here.
import SwiftUI

struct PageScreen: View {
  @EnvironmentObject private var store: Store
  let id: String
  var body: some View { PageBody(id: id, pages: store.pages) }
}

/// The design screens' states (`-state`): the canvas's PAGE_VIEWS.
enum PageSampleView { static let all = ["Writing", "Versions", "Changed by your AI", "Make a card"] }

private struct PageBody: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let id: String
  @ObservedObject var pages: PagesStore
  @StateObject private var keyboard = Keyboard()
  @StateObject private var notes = NotesPage()
  @StateObject private var scroll = NotesScroll()
  @State private var hooks = NotesHooks()
  @State private var outline = NotesOutline()
  @State private var hist: Bool? = nil
  @State private var more = false
  @State private var make: (front: String, back: String)? = nil
  @State private var title = ""
  @State private var loaded = ""
  @State private var aa = false
  @State private var picking = false
  @State private var pictureAfter: String? = nil
  @FocusState private var titleOn: Bool
  private var view: String { store.demo ? (Board.arg("-state").flatMap { PageSampleView.all.contains($0) ? $0 : nil } ?? "Writing") : "" }

  // ---------- what shows ----------
  private struct Now {
    var page: PageInfo?
    var loading = false, missing = false
    var deckId = "", deckName = "Library", canEdit = false
    var md = ""
    /// Whether this build can show the page's kind (else "Needs an update").
    var ready = true
  }
  private func now() -> Now {
    var n = Now(page: pages.page(id))
    n.missing = n.page == nil && pages.isMissing(id); n.loading = n.page == nil && !n.missing
    if let p = n.page {
      n.deckId = p.scope == "deck" ? (store.demo ? "cell" : p.scopeId) : ""
      n.deckName = n.deckId.isEmpty ? "Library" : store.deck(n.deckId).name
      n.ready = PageKind.canShow(p.kind)
      n.canEdit = n.ready && (store.demo || (!n.deckId.isEmpty && store.guide(n.deckId).can))
      n.md = n.ready ? pages.markdown(id) : ""
    }
    return n
  }

  var body: some View {
    let n = now(), histOpen = hist ?? (view == "Versions")
    let keys = n.canEdit && !histOpen && make == nil && (notes.editing != nil || notes.linking)
    let under = keyboard.height > 0 ? keyboard.height : store.demo ? 0 : GuideScreen.safeBottom
    GeometryReader { geo in
      ZStack(alignment: .bottom) {
        VStack(spacing: 0) {
          header(n, histOpen)
          if let p = n.page { if n.ready { pageArea(n, p, keys: keys) } else { needsUpdate(n, p) } }
          else {
            Text(n.loading ? "One moment…" : "This page isn’t here any more.").css(15).foregroundStyle(t.muted)
              .frame(maxWidth: .infinity).padding(.vertical, 60).frame(maxHeight: .infinity, alignment: .top)
          }
        }
        .padding(.top, Screen.top(52))
        .padding(.bottom, keys ? under + 50 : keyboard.height)
        if histOpen, n.page != nil { versions(n).padding(.top, Screen.top(52) + 52).transition(Motion.still ? .identity : .opacity) }
        if keys { NotesKeys(page: notes, aa: $aa, picture: store.demo ? {} : { pictureAfter = notes.editing; picking = true }).padding(.bottom, under) }
        if more { moreMenu(n) }
        if let m = make { makeSheet(n, m).padding(.bottom, keyboard.height).transition(Motion.still ? .identity : .move(edge: .bottom)).zIndex(3) }
      }
      .foregroundStyle(t.text)
      .background(t.bg)
      .frame(width: geo.size.width, height: UIScreen.main.bounds.height, alignment: .top)
      .offset(y: -geo.frame(in: .global).minY)
    }
    .ignoresSafeArea(.all, edges: [.top, .bottom])
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { start(n) }
    .onChange(of: n.md) { _, _ in load(now()) }
    .onChange(of: n.page?.title) { _, v in if !titleOn, let v, v != title { title = v } }
    .onDisappear { notes.flush(); if !store.demo { Task { await pages.flush(id) } } }
    .photoPicker($picking) { src in notes.insertPicture(after: pictureAfter, src: src) }
  }

  // ---------- the top ----------
  /// Back (the deck's name in a pill), the saving line, the version, and ⋯ (design/pages.mjs header, phone).
  private func header(_ n: Now, _ histOpen: Bool) -> some View {
    let sv = store.demo ? PagesStore.Saving() : pages.saving(id)
    return HStack(spacing: 8) {
      Button { back(n) } label: {
        HStack(spacing: 6) { Icon("back", 14, 2.2); Text(n.deckName).css(13, .semibold).lineLimit(1) }
          .foregroundStyle(t.text).padding(.leading, 10).padding(.trailing, 14).frame(height: 36).frame(maxWidth: 170, alignment: .leading)
          .background(Capsule().fill(t.surf)).fixedSize(horizontal: true, vertical: false)
      }
      .buttonStyle(.press).accessibilityLabel("Back to " + n.deckName).accessibilityIdentifier("backButton")
      Spacer(minLength: 0)
      let label = sv.err.isEmpty ? (sv.busy ? "Saving…" : "") : sv.err.hasPrefix("Your change") ? sv.err : "Not saved: " + sv.err
      if !label.isEmpty { Text(label).css(13).foregroundStyle(sv.err.isEmpty ? t.muted : t.again).lineLimit(1).accessibilityIdentifier("saveLabel") }
      if let p = n.page {
        Button { withAnimation(Motion.pop) { hist = !histOpen; more = false } } label: {
          HStack(spacing: 6) { Icon("history", 14, 2); Text("v\(p.version)").css(13, .semibold).monospacedDigit() }
            .foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 36).background(Capsule().fill(histOpen ? t.surf : .clear))
        }
        .buttonStyle(.press).accessibilityLabel("Versions, version \(p.version)").accessibilityAddTraits(histOpen ? .isSelected : []).accessibilityIdentifier("page.versions")
        if n.canEdit {
          Button { withAnimation(Motion.pop) { more.toggle() } } label: {
            Icon("more", 18, 2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(more ? t.surf : .clear))
          }
          .buttonStyle(.press).accessibilityLabel("More").accessibilityAddTraits(more ? .isSelected : []).accessibilityIdentifier("page.more")
        }
      }
    }
    .padding(.horizontal, 12).frame(height: 52)
  }

  /// ⋯: Versions and Delete page (Lucida's own menu: a tap outside closes it).
  private func moreMenu(_ n: Now) -> some View {
    ZStack(alignment: .topTrailing) {
      Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture { withAnimation(Motion.leave) { more = false } }
      VStack(spacing: 2) {
        menuItem("history", "Versions") { withAnimation(Motion.pop) { more = false; hist = true } }
        menuItem("bin", "Delete page", danger: true) { more = false; askDelete(n) }
      }
      .padding(6).frame(width: 220)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.bg).shadow(color: .black.opacity(0.22), radius: 22, x: 0, y: 18))
      .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.line, lineWidth: 1))
      .padding(.top, Screen.top(52) + 52).padding(.trailing, 12)
      .popTransition()
      .accessibilityElement(children: .contain).accessibilityLabel("More")
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
  }
  private func menuItem(_ icon: String, _ label: String, danger: Bool = false, action: @escaping () -> Void) -> some View {
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

  // ---------- the page ----------
  private func pageArea(_ n: Now, _ p: PageInfo, keys: Bool) -> some View {
    let setup = NotesSetup(colors: NotesColors(t, code: t.surf), editable: n.canEdit, hooks: hooks, refs: refs(n.md))
    let heads = notes.outline, railOn = !keys && keyboard.height == 0 && heads.count >= 2
    return ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 0) {
        conflictLine(n)
        titleField(n)
        NotesView(page: notes, setup: setup, below: n.canEdit ? 32 : 0)
      }
      .padding(.top, 10).padding(.trailing, 20).padding(.leading, 30).padding(.bottom, 120)
      .environment(\.notesScroll, scroll)
      .environment(\.notesOutline, outline)
    }
    .modifier(PageScrolling(scroll: scroll, outline: outline, heads: heads))
    .overlay(alignment: .topTrailing) { if railOn { NotesRail(heads: heads, outline: outline, page: notes).padding(.top, 12).transition(.opacity) } }
    .animation(Motion.fade, value: railOn)
    .scrollDismissesKeyboard(.interactively)
    .frame(maxHeight: .infinity)
  }

  /// A page this build can't show: "This Mind map needs a newer Lucida. Update to open it." and Back (design/pages.mjs, 'Needs an update'). The Notes
  /// editor is never mounted for it, so nothing on it can be saved from here.
  private func needsUpdate(_ n: Now, _ p: PageInfo) -> some View {
    VStack(spacing: 14) {
      Icon(PageKind.icon(p.kind), 22, 2).foregroundStyle(t.text).frame(width: 52, height: 52).background(Circle().fill(t.bg))
      Text("This " + PageKind.name(p.kind) + " needs a newer Lucida. Update to open it.")
        .css(17, .semibold, lh: 1.35).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("page.needsUpdate")
      Button { back(n) } label: {
        Text("Back").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 18).frame(height: 40).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press).accessibilityLabel("Back to " + n.deckName).padding(.top, 4)
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24).padding(.vertical, 40)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
    .padding(.horizontal, 16).padding(.top, 24)
    .frame(maxHeight: .infinity, alignment: .top)
    .accessibilityElement(children: .contain)
  }

  /// The title: a field of its own over the Note (Enter goes on to the Note's first line); reading, the title as a heading.
  @ViewBuilder private func titleField(_ n: Now) -> some View {
    if n.canEdit {
      TextField("", text: $title, prompt: Text("Untitled").foregroundStyle(PLACEHOLDER))
        .font(.geist(28, .semibold)).kerning(-0.84).foregroundStyle(t.text)
        .focused($titleOn).submitLabel(.next)
        .onSubmit { notes.focusAt(0, 0) }
        .onChange(of: title) { _, v in if let p = n.page, v != p.title { pages.edit(id, title: v) } }
        .padding(.bottom, 10)
        .accessibilityLabel("Page title").accessibilityIdentifier("page.title")
    } else {
      Text(title.isEmpty ? "Untitled" : title).font(.geist(28, .semibold)).kerning(-0.84).padding(.bottom, 10).accessibilityAddTraits(.isHeader)
    }
  }

  /// "<who> changed this page while you were writing (vX). Both are kept: what you wrote is on top of it, in vY." with Versions and ×.
  @ViewBuilder private func conflictLine(_ n: Now) -> some View {
    let cf = view == "Changed by your AI" ? PagesStore.Conflict(by: "Claude", ai: true, theirs: 13, mine: 14) : pages.conflict(id)
    if let cf {
      HStack(spacing: 10) {
        Icon("sparkle", 15, 2)
        Text(PageAgo.who(cf.by) + " changed this page while you were writing (v\(cf.theirs)). Both are kept: what you wrote is on top of it, in v\(cf.mine).")
          .css(14, lh: 1.45).fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
        Button { withAnimation(Motion.pop) { hist = true; more = false } } label: {
          Text("Versions").css(12, .semibold).foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(t.bg))
        }
        .buttonStyle(.press)
        Button { withAnimation(Motion.leave) { pages.clearConflict(id) } } label: {
          Icon("close", 14, 2).foregroundStyle(t.muted).frame(width: 30, height: 30).contentShape(Rectangle())
        }
        .buttonStyle(.press).accessibilityLabel("Dismiss")
      }
      .padding(.horizontal, 14).padding(.vertical, 12)
      .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
      .padding(.bottom, 18)
      .accessibilityElement(children: .contain).accessibilityIdentifier("page.conflict")
      .transition(Motion.still ? .identity : .opacity)
    }
  }

  // ---------- Versions ----------
  /// Over the page, under the top (design/pages.mjs versions, phone): each version, who saved it and when, what changed, and Restore on the older ones.
  private func versions(_ n: Now) -> some View {
    let vl = pages.versions(id)
    return ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("Versions").css(17, .semibold).frame(maxWidth: .infinity, alignment: .leading)
          Button { withAnimation(Motion.leave) { hist = false } } label: { Icon("close", 15, 2).foregroundStyle(t.text).frame(width: 32, height: 32).contentShape(Rectangle()) }
            .buttonStyle(.press).accessibilityLabel("Close versions")
        }
        Text("Every save is one. Restoring one keeps what’s there now too.").css(13, lh: 1.45).foregroundStyle(t.muted)
        if vl == nil { Text("One moment…").css(14).foregroundStyle(t.muted) }
        ForEach(Array((vl ?? []).enumerated()), id: \.element.id) { i, v in versionCard(v, old: i > 0, canEdit: n.canEdit) }
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(t.bg)
    .accessibilityElement(children: .contain).accessibilityLabel("Versions").accessibilityIdentifier("page.versionsPanel")
  }
  private func versionCard(_ v: PageVersion, old: Bool, canEdit: Bool) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 8) {
        Text("v\(v.version)").css(14, .semibold)
        if v.ai { Icon("sparkle", 12, 2).foregroundStyle(t.muted) }
        Text(PageAgo.who(v.by) + " · " + PageAgo.of(v.at)).css(13).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        if old && canEdit {
          Button { Task { if store.demo { return }; if await pages.restore(id, v.version) != nil { withAnimation(Motion.leave) { hist = false } } } } label: {
            Text("Restore").css(12, .semibold).foregroundStyle(t.invText).padding(.horizontal, 12).frame(height: 28).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press).accessibilityLabel("Restore version \(v.version)")
        }
      }
      if !v.summary.isEmpty { Text(v.summary).css(13, lh: 1.45).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true) }
    }
    .padding(.horizontal, 14).padding(.vertical, 12)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(old ? t.surf : .clear))
  }

  // ---------- New card from this block ----------
  private func makeSheet(_ n: Now, _ m: (front: String, back: String)) -> some View {
    ZStack(alignment: .bottom) {
      t.dim.opacity(0.5).ignoresSafeArea().onTapGesture { closeMake() }.accessibilityHidden(true)
      PageMakeSheet(front: m.front, back: m.back, deckName: n.deckName, close: closeMake) { front, back in
        guard !n.deckId.isEmpty, !store.demo else { closeMake(); return }
        guard !front.isEmpty, !back.isEmpty else { store.error = "A card needs a front and a back."; return }
        Task {
          if await store.saveCard(nil, deckId: n.deckId, ["kind": "basic", "front": front, "back": back]) {
            closeMake(); store.error = "Added to " + n.deckName + "."
          }
        }
      }
    }
  }
  private func closeMake() { Keyboard.hide(); withAnimation(Motion.leave) { make = nil } }

  // ---------- acts ----------
  private func start(_ n: Now) {
    hooks.image = GuideImages.own
    hooks.card = { [store] cid in PageBody.cardInfo(store, cid) }
    hooks.pageRef = { [pages] pid in
      if store.demo { return .page(title: "The cell at a glance", kind: "Mind map") }
      if pages.isMissing(pid) { return .missing }
      return pages.page(pid).map { .page(title: $0.title, kind: PageKind.name($0.kind)) } ?? .loading
    }
    hooks.openPage = { [nav] pid in if !store.demo { notes.flush(); nav.page(pid) } }
    hooks.openCard = { [nav] cid in if !store.demo, !n.deckId.isEmpty { nav.newCard(deckId: n.deckId, cardId: cid) } }
    if view == "Make a card" { make = (front: "", back: "Glycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.") }
    load(n)
  }
  /// The page's words go into the editor once they're here (and again when they change from somewhere else: an AI app's change, a version brought back).
  private func load(_ n: Now) {
    guard let p = n.page, n.ready else { return }
    hooks.makeCard = n.canEdit && !n.deckId.isEmpty ? { _, md in
      Keyboard.hide()
      withAnimation(Motion.sheet) { make = (front: "", back: PageBody.plain(md)) }
    } : nil
    if loaded == id { notes.reload(n.md); return }
    loaded = id
    title = p.title
    notes.onChange = { [pages, id] md in if n.canEdit && !store.demo { pages.editMarkdown(id, md) } }
    notes.load(n.md, key: (store.demo ? "canvas|" + view + "|" : "page|") + id, editable: n.canEdit, blank: n.canEdit, titled: true)
    // (a page just made opens with the caret in its title)
    if nav.pageFresh == id { nav.pageFresh = ""; DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { titleOn = true } }
  }
  private func back(_ n: Now) {
    notes.flush()
    Task {
      if !store.demo { await pages.flush(id) }
      if n.deckId.isEmpty { nav.back() } else { nav.backToPages(deckId: n.deckId) }
    }
  }
  private func askDelete(_ n: Now) {
    let name = (n.page?.title).flatMap { $0.isEmpty ? nil : $0 } ?? "Untitled"
    nav.ask("Delete the page “\(name)”?", action: "Delete page", danger: true) {
      guard !store.demo else { return }
      Task {
        do { try await pages.remove(id); if n.deckId.isEmpty { nav.back() } else { nav.backToPages(deckId: n.deckId) } }
        catch { store.error = (error as? LocalizedError)?.errorDescription ?? "Couldn’t delete the page." }
      }
    }
  }

  // ---------- what the Note shows ----------
  /// The cards and pages the Note shows, as far as they're known (when one arrives or changes, the rows that show it draw again).
  private func refs(_ md: String) -> String {
    guard !store.demo else { return "" }
    var out: [String] = []
    for line in md.components(separatedBy: "\n") where line.hasPrefix("::card ") || line.hasPrefix("::page ") {
      let rid = String(line.dropFirst(7)).trimmingCharacters(in: .whitespaces)
      if line.hasPrefix("::page ") {
        out.append(rid + ":" + (pages.isMissing(rid) ? "n" : pages.page(rid).map { $0.title } ?? "u"))
      } else if let c = store.lib.cards.first(where: { $0.id == rid }) {
        out.append(rid + ":" + c.front + c.text + c.back + "\(c.srs.lapses)" + c.srs.state)
      } else { out.append(rid + ":n") }
    }
    return out.joined(separator: "|")
  }
  /// A card of the deck as the Note shows it: its front and back as words, and whether it's weak (missed before, or being learned again).
  static func cardInfo(_ store: Store, _ cid: String) -> NoteCardInfo? {
    if store.demo { return NoteCardInfo(front: "Where does the Krebs cycle happen?", back: "The mitochondrial matrix", weak: true) }
    guard let c = store.lib.cards.first(where: { $0.id == cid }) else { return nil }
    return NoteCardInfo(front: plain(c.front.isEmpty ? c.text : c.front), back: plain(c.back), weak: c.srs.lapses > 0 || c.srs.state == "relearning")
  }
  /// Markdown as plain words (design/pages.mjs plain): no :::/::card lines, no heading or list marks, no bold or code marks.
  static func plain(_ s: String) -> String {
    s.components(separatedBy: "\n")
      .filter { $0.range(of: #"^:::|^::(card|page) "#, options: .regularExpression) == nil }
      .map { $0.replacingOccurrences(of: #"^#+\s*|^\s*[-*+]\s+|^\s*\d+\.\s+"#, with: "", options: .regularExpression).replacingOccurrences(of: #"\*\*|__|`"#, with: "", options: .regularExpression) }
      .joined(separator: " ")
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespaces)
  }
}

/// The page's scroll, told where it is (for keeping the caret in sight and for the outline's rail), as the Notes page's (GuidePageArea).
private struct PageScrolling: ViewModifier {
  let scroll: NotesScroll
  let outline: NotesOutline
  let heads: [NotesHead]
  @State private var pos = ScrollPosition(edge: .top)
  func body(content: Content) -> some View {
    content
      .scrollPosition($pos)
      .onScrollGeometryChange(for: CGFloat.self, of: { $0.contentOffset.y + $0.contentInsets.top }) { _, y in scroll.offset = y; outline.refresh(heads, top: scroll.viewport.minY) }
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { scroll.viewport = $0 }
      .onAppear { let p = $pos; scroll.go = { y in p.wrappedValue.scrollTo(y: y) }; DispatchQueue.main.async { outline.refresh(heads, top: scroll.viewport.minY, scrolled: false) } }
      .onChange(of: heads) { _, h in DispatchQueue.main.async { outline.refresh(h, top: scroll.viewport.minY, scrolled: false) } }
  }
}

/// New card from this block (design/pages.mjs makeSheet, phone): a sheet from the bottom with Front (to write) and Back (the block's words), and Add to the deck.
private struct PageMakeSheet: View {
  @Environment(\.theme) private var t
  @State var front: String
  @State var back: String
  let deckName: String
  let close: () -> Void
  let add: (String, String) -> Void
  @FocusState private var frontOn: Bool
  init(front: String, back: String, deckName: String, close: @escaping () -> Void, add: @escaping (String, String) -> Void) {
    _front = State(initialValue: front); _back = State(initialValue: back); self.deckName = deckName; self.close = close; self.add = add
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("New card from this block").css(15, .semibold)
      field("Front", $front, "A question", lines: 2).focused($frontOn).accessibilityIdentifier("make.front")
      field("Back", $back, "The answer", lines: 3).accessibilityIdentifier("make.back")
      Text("Or ask your AI to make cards from this page.").css(12).foregroundStyle(t.muted)
      HStack(spacing: 8) {
        Spacer()
        Button(action: close) { Text("Cancel").css(13, .semibold).foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 36).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press)
        Button { add(front.trimmingCharacters(in: .whitespacesAndNewlines), back.trimmingCharacters(in: .whitespacesAndNewlines)) } label: {
          Text("Add to " + deckName).css(13, .semibold).lineLimit(1).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 36).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).accessibilityIdentifier("make.add")
      }
    }
    .padding(.horizontal, 16).padding(.top, 18).padding(.bottom, 34)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 24, topTrailing: 24), style: .continuous).fill(t.bg)
      .shadow(color: .black.opacity(0.22), radius: 22, x: 0, y: -4).ignoresSafeArea(edges: .bottom))
    .overlay(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 24, topTrailing: 24), style: .continuous).strokeBorder(t.line, lineWidth: 1).ignoresSafeArea(edges: .bottom))
    .accessibilityElement(children: .contain).accessibilityLabel("New card from this block").accessibilityAddTraits(.isModal)
    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { frontOn = true } }
  }
  private func field(_ label: String, _ text: Binding<String>, _ hint: String, lines: Int) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label).css(12, .semibold).foregroundStyle(t.muted)
      TextField("", text: text, prompt: Text(hint).foregroundStyle(PLACEHOLDER), axis: .vertical)
        .font(.geist(15)).foregroundStyle(t.text).lineLimit(lines...max(lines, 6))
    }
    .padding(.horizontal, 14).padding(.vertical, 10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
  }
}
