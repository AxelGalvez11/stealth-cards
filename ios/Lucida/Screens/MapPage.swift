// iPhone · a deck's Mind map page (spec step4-maps.md §5.3, §6.1; the approved boards design/maps.mjs mapPage and PhonePageMindmap, one for
// one). The page's header (back, version, ⋯) and the title on one line, then the map edge to edge in one Canvas (Design/MapCanvas.swift) and,
// at the bottom, [Test me] [Weak spots] [Outline] [+]. One finger pans, a pinch zooms, a tap selects, a double tap fits (or zooms to an idea's
// branch). A selected idea brings up the idea bar in place of the bottom bar: its words (typed there, Return adds the next idea), its note, its
// cards, and Idea, Cards, Card, Fold, More; while typing, Lucida's own key row (⇤ ⇥ ↑ ↓ Done) rides on the keyboard. Test me, its Done sheet,
// the Cards sheet, the idea's More and Make a card are Lucida's own sheets (Screens/MapSheets.swift); the Outline is a full-screen editor of
// its own (Design/MapOutline.swift). Only the left edge (24 pt) swipes back: the stage pans.
import SwiftUI

struct MapPageBody: View {
  @Environment(\.theme) private var t
  @Environment(\.dynamicTypeSize) private var dts
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject var m: MapModel
  @ObservedObject var pages: PagesStore
  let page: PageInfo
  @Binding var title: String
  let canEdit: Bool
  let header: AnyView
  let openVersions: () -> Void
  @StateObject private var keyboard = Keyboard()
  @FocusState private var fieldOn: Bool
  @FocusState private var noteOn: Bool
  @FocusState private var titleOn: Bool

  private var te: MapArt.Raised { MapArt.raised(t.colors) }
  private var isNew: Bool { m.tree.order.count <= 1 && (m.tree[m.tree.root]?.label ?? "").isEmpty }

  var body: some View {
    GeometryReader { geo in
      let H = UIScreen.main.bounds.height, W = geo.size.width
      let stageH = max(200, H - Screen.top(52) - 52 - 44 - 88)
      ZStack(alignment: .bottom) {
        VStack(spacing: 0) {
          header
          titleRow
          ZStack(alignment: .top) {
            stage(W, stageH)
            if let live = m.live { liveLine(live) }
            if isNew && m.test == nil && !m.device.outline { fresh(W) }
            if m.device.weak && m.test == nil && !m.failed { legend.padding(.horizontal, 12).frame(height: stageH, alignment: .bottom).padding(.bottom, 12) }
          }
          .frame(width: W, height: stageH)
          .overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) }
          .clipped()
          Color.clear.frame(height: 88)
        }
        .padding(.top, Screen.top(52))
        .frame(maxHeight: .infinity, alignment: .top)
        bottomArea
        if m.device.outline { MapOutline(m: m, canEdit: canEdit, keyboard: keyboard).padding(.top, Screen.top(52)).transition(Motion.still ? .identity : .opacity).zIndex(5) }
        if m.sheet != .none { sheets.zIndex(8) }
        if let s = m.toast { toastView(s).padding(.bottom, 104).zIndex(9) }
      }
      .onAppear {
        let scale = min(1.3, max(1, UIFontMetrics(forTextStyle: .body).scaledValue(for: 17) / 17))
        // (a folder's map: its cards are every deck's in the folder, its name the folder's)
        let folder = page.scope == "folder" ? store.lib.folders.first { $0.id == page.scopeId } : nil
        m.open(page, store: store, pages: pages, nav: nav, scope: page.scope, scopeId: store.demo ? "cell" : page.scopeId,
               deckName: store.demo ? "Cell Biology" : folder?.name ?? store.deck(page.scopeId).name, canEdit: canEdit, demoView: store.demo ? (Board.arg("-state") ?? "Mind map") : "",
               stage: CGSize(width: W, height: stageH), scale: scale)
        if store.demo && m.writing { DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { fieldOn = true } }
        #if DEBUG
        // `-mapDrive "select:etc,cards"`: presses the page's own buttons in turn, a second apart (for checking the screens on real data).
        if !store.demo, let steps = Board.arg("-mapDrive") { drive(steps.split(separator: ",").map(String.init)) }
        #endif
        BackSwipe.edgeOnly = true
      }
      .onDisappear { BackSwipe.edgeOnly = false; m.commitWriting() }
    }
    .onChange(of: page.version) { _, _ in m.sync(page) }
    .onChange(of: page.data) { _, _ in m.sync(page) }
    .onChange(of: pages.conflict(page.id)) { _, c in m.conflict(c) }
    // (the Outline has its own field: the idea bar's, hidden behind it, never takes the keyboard from it)
    .onChange(of: m.writing) { _, w in if w { if !m.device.outline { DispatchQueue.main.async { fieldOn = true } } } else { fieldOn = false; noteOn = false } }
    .onChange(of: m.sel) { _, s in if s.isEmpty { fieldOn = false } }
    // (the idea being written stays above the keyboard, whatever its height)
    .onChange(of: keyboard.height) { _, h in if h > 0 { m.keyboardH = h; if m.writing && !m.sel.isEmpty { m.reveal(m.sel, over: m.writingH - max(0, m.stage.height - 608)) } } }
  }

  #if DEBUG
  private func drive(_ steps: [String]) {
    for (i, st) in steps.enumerated() {
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.5 + Double(i) * 0.9) {
        let p = st.split(separator: ":", maxSplits: 1).map(String.init), a = p.count > 1 ? p[1] : ""
        switch p[0] {
        case "select": tap(a)
        case "fold": m.fold(a)
        case "weak": withAnimation(Motion.pop) { m.toggleWeak() }
        case "outline": withAnimation(Motion.fade) { m.toggleOutline() }
        case "cards": withAnimation(Motion.sheet) { m.sheet = .cards }
        case "more": withAnimation(Motion.sheet) { m.sheet = .more }
        case "make": m.makeCard(m.sel)
        case "testsheet": m.openTest()
        case "test": m.testShow = a.isEmpty ? "one" : a; m.startTest()
        case "show": m.showCurrent()
        case "knew": m.mark(true)
        case "missed": m.mark(false)
        case "reveal": m.tapInTest(a)
        case "end": m.finishTest()
        case "add": m.addIdea(under: a.isEmpty ? m.tree.root : a)
        case "type": m.field = a
        case "done": m.doneWriting()
        case "close": m.closeSheet()
        default: break
        }
      }
    }
  }
  #endif

  // ---------- the title ----------
  // (16 pt, as the boards draw every field on a phone: their input rule is 16px)
  private var titleRow: some View {
    Group {
      if canEdit {
        TextField("", text: $title, prompt: Text("Untitled").foregroundStyle(PLACEHOLDER))
          .font(.geist(16, .semibold)).kerning(-0.32).foregroundStyle(t.text).lineLimit(1).focused($titleOn).submitLabel(.done)
          .onChange(of: title) { _, v in if v != page.title && !store.demo { pages.edit(page.id, title: v) }; m.title = v }
          .accessibilityLabel("Page title").accessibilityIdentifier("page.title")
      } else {
        Text(title.isEmpty ? "Untitled" : title).font(.geist(16, .semibold)).kerning(-0.32).lineLimit(1).accessibilityAddTraits(.isHeader)
      }
    }
    .padding(.horizontal, 20).frame(height: 44, alignment: .leading).frame(maxWidth: .infinity, alignment: .leading)
  }

  // ---------- the stage ----------
  @ViewBuilder private func stage(_ W: CGFloat, _ H: CGFloat) -> some View {
    if m.failed { failedOutline }
    else if m.layout != nil {
      let art = m.art(t.colors, dark: t.dark)
      MapStage(boxes: m.boxes, was: m.fromBoxes, art: art, extras: m.extras(art), glide: m.glide, cam: $m.cam,
               tap: { id in tap(id) }, unfold: { id in if m.test == nil { UISelectionFeedbackGenerator().selectionChanged(); m.fold(id, false) } else { tap(id) } },
               doubleTap: { id in
                 if id.isEmpty { m.userMoved = false; m.fitNow(animated: true) }
                 else { m.frameIdea(id, over: m.sel.isEmpty ? 608 : 468, z: 1.25) }
               }, moved: { m.userMoved = true })
        .frame(width: W, height: H)
        .accessibilityRepresentation { MapA11y(m: m) }
        .accessibilityIdentifier("map.stage")
    } else {
      Color.clear.frame(width: W, height: H)
    }
  }
  private func tap(_ id: String) {
    if m.test != nil {
      if m.test?.show == "map" && !id.isEmpty { m.tapInTest(id) }
      return
    }
    if id.isEmpty { withAnimation(Motion.leave) { m.deselect() }; return }
    UISelectionFeedbackGenerator().selectionChanged()
    titleOn = false
    withAnimation(Motion.pop) { m.select(id) }
  }
  /// The engine failed: the ideas as a plain outline, and the line 'Can’t draw this page right now'. Nothing can be changed here.
  private var failedOutline: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 6) {
        Text("Can’t draw this page right now").css(15, .semibold).padding(.bottom, 8).accessibilityIdentifier("map.failed")
        ForEach(m.tree.order, id: \.self) { id in
          Text(m.tree.label(id, title: m.title)).css(15, (m.tree[id]?.level ?? 0) < 2 ? .semibold : .regular).padding(.leading, CGFloat(m.tree[id]?.level ?? 0) * 18)
        }
      }
      .padding(20).frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  // ---------- over the stage ----------
  /// "Claude added 4 ideas · v4", with Versions and ×.
  private func liveLine(_ s: String) -> some View {
    HStack(spacing: 8) {
      Icon("sparkle", 14, 2)
      Text(s).css(14, lh: 1.35).fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
      Button(action: openVersions) { Text("Versions").css(13, .semibold).foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 44).background(Capsule().fill(te.surf.color)) }
        .buttonStyle(.press)
      Button { withAnimation(Motion.leave) { m.live = nil } } label: { Icon("close", 13, 2).foregroundStyle(t.muted).frame(width: 44, height: 44).contentShape(Rectangle()) }
        .buttonStyle(.press).accessibilityLabel("Dismiss")
    }
    .padding(.leading, 14).padding(.trailing, 6).padding(.vertical, 6)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(te.bg.color).shadow(color: .black.opacity(0.22), radius: 22, x: 0, y: 18))
    .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(te.line.color, lineWidth: 1))
    .padding(.horizontal, 12).padding(.top, 10)
    .popTransition()
    .accessibilityElement(children: .contain).accessibilityIdentifier("map.live")
  }
  /// A new map: the hint under the topic, and From this deck's cards.
  private func fresh(_ W: CGFloat) -> some View {
    let root = m.layout?.node(m.tree.root), y = root.map { m.cam.y + m.cam.z * ($0.y + $0.h) + 22 } ?? 300
    return VStack(spacing: 14) {
      Text("Type the topic, then Tab adds an idea under it. Or ask your AI: “Make a mind map of this deck in Lucida.”")
        .css(15, lh: 1.5).foregroundStyle(t.muted).multilineTextAlignment(.center).frame(maxWidth: 250).fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 10) {
        Icon("sparkle", 15, 2)
        VStack(alignment: .leading, spacing: 0) { Text("From this deck’s cards").css(14, .semibold); Text("Lucida AI (2 left today)").css(13, .medium).foregroundStyle(t.muted) }
      }
      .foregroundStyle(t.text).padding(.leading, 16).padding(.trailing, 20).padding(.vertical, 6).frame(minHeight: 52).background(Capsule().fill(t.surf))
    }
    .padding(.horizontal, 16).frame(width: W).offset(y: y)
  }
  /// The weak spots' legend, in the tints the map uses, with Test the weak ones.
  private var legend: some View {
    let tones = m.tones(), count = { (k: String) in tones.values.filter { $0 == k }.count }
    let rows: [(String, String, Bool)] = [("Weak", "weak", true), ("Getting there", "getting", false), ("Solid", "solid", false), ("Not studied", "new", false)]
    return VStack(spacing: 10) {
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], alignment: .leading, spacing: 6) {
        ForEach(rows, id: \.1) { r in
          let mk = r.1 == "new" ? nil : MapArt.mark(t.colors, r.1)
          HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 5, style: .continuous).fill((mk?.fill ?? t.colors.bg).color)
              .overlay(RoundedRectangle(cornerRadius: 5, style: .continuous).strokeBorder((mk?.stroke ?? t.colors.line).color, lineWidth: 1.5))
              .overlay(alignment: .topTrailing) { if r.2 { Circle().fill(t.again).frame(width: 5, height: 5).padding(2) } }
              .frame(width: 22, height: 14)
            Text(r.0).css(14).frame(maxWidth: .infinity, alignment: .leading)
            Text("\(count(r.1))").css(14, .semibold)
          }
          .accessibilityElement(children: .combine)
        }
      }
      Button { m.testHide = "weak"; m.startTest(m.testIds("weak"), show: "one") } label: {
        Text("Test the weak ones").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press).disabled(count("weak") == 0)
    }
    .padding(.horizontal, 14).padding(.vertical, 12)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(te.bg.color).shadow(color: .black.opacity(0.22), radius: 22, x: 0, y: 18))
    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(te.line.color, lineWidth: 1))
    .popTransition()
    .accessibilityElement(children: .contain).accessibilityLabel("Weak spots")
  }

  // ---------- the bottom ----------
  @ViewBuilder private var bottomArea: some View {
    let x = m.test
    if let x, x.show == "one", m.sheet != .done { onePanel(x).zIndex(3) }
    else if let x, x.show == "map", m.sheet != .done { testBar(x).zIndex(3) }
    else if !m.sel.isEmpty && m.test == nil && !isNewSel && !m.device.outline && m.sheet != .cards && m.sheet != .test && m.sheet != .make { ideaBar.zIndex(4) }
    else if m.test == nil { bottomBar.zIndex(2) }
  }
  private var isNewSel: Bool { isNew && m.sel == m.tree.root && !m.writing }
  /// [Test me] [Weak spots] [Outline] … [+]
  private var bottomBar: some View {
    HStack(spacing: 6) {
      if !isNew {
        Button { m.openTest() } label: {
          HStack(spacing: 6) { Icon("test", 15, 2); Text("Test me").css(14, .semibold) }
            .foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 44).frame(maxWidth: .infinity).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).accessibilityIdentifier("map.testMe")
        toggle("Weak spots", on: m.device.weak) { withAnimation(Motion.pop) { m.toggleWeak() } }.accessibilityIdentifier("map.weak")
      }
      toggle("Outline", on: m.device.outline) { withAnimation(Motion.fade) { m.toggleOutline() } }.accessibilityIdentifier("map.outline")
      Spacer(minLength: 0)
      if canEdit {
        Button { m.addIdea(under: m.sel.isEmpty ? m.tree.root : m.sel) } label: {
          Icon("plus", 18, 2.2).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.surf))
        }
        .buttonStyle(.press).accessibilityLabel("Add an idea").accessibilityIdentifier("map.add")
      }
    }
    .padding(.horizontal, 12).padding(.top, 8).frame(height: 88, alignment: .top)
    .background(t.bg.overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) })
  }
  private func toggle(_ label: String, on: Bool, _ go: @escaping () -> Void) -> some View {
    Button(action: go) {
      HStack(spacing: 4) { if on { Icon("check", 13, 2.6) }; Text(label).css(14, .semibold) }
        .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 44)
        .background(Capsule().fill(on ? t.colors.text.alpha(t.dark ? 0.2 : 0.1).color : t.surf))
        .overlay(Capsule().strokeBorder(on ? t.text : .clear, lineWidth: 1.5))
    }
    .buttonStyle(.press).fixedSize().accessibilityAddTraits(on ? .isSelected : [])
  }
  /// Testing on the map: the progress, End, and Missed / Knew it for the idea just shown.
  private func testBar(_ x: MapModel.Test) -> some View {
    VStack(spacing: 10) {
      testTop(x)
      HStack(spacing: 8) { markButtons(enabled: !x.current.isEmpty && x.shown && x.marks[x.current] == nil) }
    }
    .padding(.horizontal, 16).padding(.top, 10).padding(.bottom, 34)
    .background(t.bg.overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) })
    .accessibilityElement(children: .contain).accessibilityLabel("Did you know it?")
  }
  private func testTop(_ x: MapModel.Test) -> some View {
    HStack(spacing: 8) {
      Text("\(x.marks.count) of \(x.order.count) · \(x.missed) missed").css(15, .semibold).frame(maxWidth: .infinity, alignment: .leading).accessibilityIdentifier("map.progress")
      Button { m.finishTest() } label: { Text("End").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 44).background(Capsule().fill(t.surf)) }
        .buttonStyle(.press).accessibilityIdentifier("map.end")
    }
    .frame(minHeight: 44)
  }
  @ViewBuilder private func markButtons(enabled: Bool = true) -> some View {
    Button { UIImpactFeedbackGenerator(style: .soft).impactOccurred(); m.mark(false) } label: {
      Text("Missed").css(16, .semibold).foregroundStyle(t.again).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.againTint))
    }
    .buttonStyle(.press).disabled(!enabled).accessibilityIdentifier("map.missed")
    Button { UIImpactFeedbackGenerator(style: .soft).impactOccurred(); m.mark(true) } label: {
      Text("Knew it").css(16, .semibold).foregroundStyle(t.good).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.goodTint))
    }
    .buttonStyle(.press).disabled(!enabled).accessibilityIdentifier("map.knew")
  }
  /// One at a time: the breadcrumb ('The cell › Mitochondria › ?'), then Show, then Missed / Knew it.
  private func onePanel(_ x: MapModel.Test) -> some View {
    let crumbs = (m.tree.pathLine(x.current, title: m.title).isEmpty ? [] : [m.tree.pathLine(x.current, title: m.title)]) + [x.shown ? m.tree.label(x.current, title: m.title) : "?"]
    return VStack(spacing: 10) {
      testTop(x)
      Text(crumbs.joined(separator: " › ")).css(16, .semibold).lineLimit(1).truncationMode(.head).frame(maxWidth: .infinity).accessibilityIdentifier("map.crumbs")
      Text("Say it, then show it.").css(13).foregroundStyle(t.muted)
      HStack(spacing: 8) {
        if x.shown { markButtons() }
        else {
          Button { UIImpactFeedbackGenerator(style: .soft).impactOccurred(); m.showCurrent() } label: {
            Text("Show").css(16, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press).accessibilityIdentifier("map.show")
        }
      }
    }
    .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 34)
    .background(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 28, topTrailing: 28), style: .continuous).fill(te.bg.color)
      .overlay(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 28, topTrailing: 28), style: .continuous).stroke(te.line.color, lineWidth: 1).mask(Rectangle().frame(height: 30).frame(maxHeight: .infinity, alignment: .top))))
    .sheetTransition()
  }

  // ---------- the idea bar ----------
  private var ideaBar: some View {
    let i = m.tree[m.sel], cards = i?.cardIds ?? [], weak = m.linked(m.sel).filter(\.weak).count
    let canFold = !(i?.children.isEmpty ?? true)
    return VStack(spacing: 0) {
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 8) {
          TextField("", text: $m.field, prompt: Text(m.sel == m.tree.root ? m.title : "An idea").foregroundStyle(PLACEHOLDER))
            .font(.geist(16, .semibold)).foregroundStyle(t.text).focused($fieldOn).submitLabel(.next).disabled(!canEdit)
            .onChange(of: m.field) { _, v in m.typed(v) }
            .onSubmit { m.returnKey() }
            .onChange(of: fieldOn) { _, on in if on { m.writing = true } }
            .padding(.horizontal, 12).frame(height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf))
            .accessibilityLabel("Idea").accessibilityIdentifier("map.field")
          Button { withAnimation(Motion.leave) { m.deselect() } } label: { Icon("close", 16, 2).foregroundStyle(t.muted).frame(width: 44, height: 44).contentShape(Rectangle()) }
            .buttonStyle(.press).accessibilityLabel("Done with this idea")
        }
        if m.noting {
          TextField("", text: $m.noteField, prompt: Text("Add a note").foregroundStyle(PLACEHOLDER), axis: .vertical)
            .font(.geist(15)).foregroundStyle(t.text).lineLimit(1...6).focused($noteOn)
            .onChange(of: m.noteField) { _, v in m.typedNote(v) }
            .padding(.horizontal, 4).accessibilityIdentifier("map.note")
        } else if let note = i?.note, !note.isEmpty {
          Text(note).css(15, lh: 1.45).foregroundStyle(t.muted).lineLimit(2).padding(.horizontal, 4)
            .onTapGesture { if canEdit { m.noting = true; m.writing = true; DispatchQueue.main.async { noteOn = true } } }
        } else if canEdit {
          Text("Add a note").css(15).foregroundStyle(t.muted).padding(.horizontal, 4)
            .onTapGesture { m.noting = true; m.writing = true; DispatchQueue.main.async { noteOn = true } }
        }
        Text(cards.isEmpty ? "No cards yet" : plural(cards.count, "card") + (weak > 0 ? " · \(weak) weak" : "")).css(13).foregroundStyle(t.muted).padding(.horizontal, 4)
      }
      .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 6)
      if m.writing && canEdit {
        HStack(spacing: 6) {
          key("Outdent", "outdent") { m.move("outdent") }
          key("Indent", "indent") { m.move("indent") }
          key("Move up", "up") { m.move("up") }
          key("Move down", "down") { m.move("down") }
          Button { withAnimation(Motion.leave) { m.doneWriting() } } label: {
            Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.inv))
          }
          .buttonStyle(.press).frame(width: (UIScreen.main.bounds.width - 48) / 5.3 * 1.3).accessibilityIdentifier("map.done")
        }

        .padding(.horizontal, 12).padding(.top, 6).padding(.bottom, 8)
        .accessibilityElement(children: .contain).accessibilityLabel("Move this idea")
      } else {
        HStack(spacing: 0) {
          act("Idea", "ideaAdd", enabled: canEdit) { m.addIdea(under: m.sel) }
          act("Cards", "card") { withAnimation(Motion.sheet) { m.sheet = .cards }; m.reveal(m.sel, over: 124) }
          act("Card", "plus", enabled: canEdit && !store.demo || store.demo) { m.makeCard(m.sel) }
          if canFold { act(m.isFolded(m.sel) ? "Unfold" : "Fold", "fold") { UIImpactFeedbackGenerator(style: .light).impactOccurred(); m.fold(m.sel) } }
          act("More", "more") { withAnimation(Motion.sheet) { m.sheet = .more } }
        }
        .padding(.horizontal, 8).padding(.bottom, 34)
      }
    }
    .padding(.bottom, m.writing ? keyboard.height : 0)
    .background(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 24, topTrailing: 24), style: .continuous).fill(te.bg.color)
      .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: -12)
      .overlay(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 24, topTrailing: 24), style: .continuous).stroke(te.line.color, lineWidth: 1).mask(Rectangle().frame(height: 26).frame(maxHeight: .infinity, alignment: .top)))
      .ignoresSafeArea(edges: .bottom))
    .sheetTransition()
    .accessibilityElement(children: .contain).accessibilityLabel("This idea").accessibilityIdentifier("map.bar")
  }
  private func act(_ label: String, _ icon: String, enabled: Bool = true, _ go: @escaping () -> Void) -> some View {
    Button(action: go) {
      VStack(spacing: 3) { Icon(icon, 19, 2); Text(label).css(13, .medium) }
        .foregroundStyle(enabled ? t.text : t.muted).frame(maxWidth: .infinity).frame(height: 56).contentShape(Rectangle())
    }
    .buttonStyle(.press).disabled(!enabled).accessibilityLabel(label)
  }
  private func key(_ label: String, _ icon: String, _ go: @escaping () -> Void) -> some View {
    Button(action: go) { Icon(icon, 18, 2).foregroundStyle(t.text).frame(width: (UIScreen.main.bounds.width - 48) / 5.3, height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }

  // ---------- sheets ----------
  @ViewBuilder private var sheets: some View {
    ZStack(alignment: .bottom) {
      (m.sheet == .make ? Color.black.opacity(0.001) : t.dim).ignoresSafeArea().onTapGesture { if m.sheet == .done { m.closeDone() } else if m.sheet == .make { m.closeMake() } else { m.closeSheet() } }
        .transition(Motion.still ? .identity : .opacity).accessibilityHidden(true)
      Group {
        switch m.sheet {
        case .test: MapTestSheet(m: m)
        case .done: MapDoneSheet(m: m)
        case .cards: MapCardsSheet(m: m)
        case .more: MapMoreSheet(m: m, canEdit: canEdit)
        case .make: MapMakeSheet(m: m, keyboard: keyboard)
        case .none: EmptyView()
        }
      }
      .sheetTransition()
    }
  }
  private func toastView(_ s: String) -> some View {
    HStack(spacing: 10) {
      Text(s).css(14).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading)
      Button { m.undoLast() } label: { Text("Undo").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 44) }.buttonStyle(.press)
    }
    .foregroundStyle(t.invText).padding(.leading, 16).padding(.trailing, 4)
    .background(Capsule().fill(t.inv)).padding(.horizontal, 16)
    .popTransition().accessibilityElement(children: .contain).accessibilityIdentifier("map.toast")
  }
}
