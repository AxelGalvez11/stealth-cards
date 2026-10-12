// A Mind map's Outline on the iPhone (spec §5.3, §5.5; design/maps.mjs outlineFull, phone): full screen under the page's header, with Map to go
// back. One row per idea, bound to its id (the ids never show), indented by level, with a disclosure triangle that folds (on this phone only),
// how many ideas a folded one holds, its cards and its note. It is the phone's main editor: a tap on a row writes in it, Return adds the next
// idea, and Lucida's key row (⇤ ⇥ ↑ ↓ Done) rides on the keyboard. Rows in a ScrollView with a LazyVStack (never List).
// MapA11y is what VoiceOver gets in place of the drawing: the same ideas as Lucida's own buttons, with Fold, Rename, Reveal, Knew it and Missed.
import SwiftUI

struct MapOutline: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  let canEdit: Bool
  @ObservedObject var keyboard: Keyboard
  @FocusState private var on: String?

  /// The rows showing: every idea whose ideas above are open (on this phone).
  private var rows: [String] {
    var out: [String] = [], st = [m.tree.root]
    while let id = st.popLast() {
      out.append(id)
      if !m.isFolded(id) { st.append(contentsOf: (m.tree[id]?.children ?? []).reversed()) }
    }
    return out.filter { !$0.isEmpty }
  }

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 8) {
        Button { withAnimation(Motion.fade) { m.commitWriting(); m.writing = false; m.toggleOutline() } } label: {
          HStack(spacing: 6) { Icon("back", 14, 2.2); Text("Map").css(14, .semibold) }.foregroundStyle(t.text).padding(.leading, 10).padding(.trailing, 14).frame(height: 36).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press).accessibilityIdentifier("outline.map")
        Text("Outline").css(17, .semibold).frame(maxWidth: .infinity).accessibilityAddTraits(.isHeader)
        Button { m.addIdea(under: m.sel.isEmpty ? m.tree.root : m.sel); on = m.sel } label: { Icon("plus", 18, 2.2).foregroundStyle(t.text).frame(width: 44, height: 44).contentShape(Rectangle()) }
          .buttonStyle(.press).disabled(!canEdit).opacity(canEdit ? 1 : 0).accessibilityLabel("Add an idea")
      }
      .padding(.horizontal, 12).frame(height: 52)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) {
          LazyVStack(alignment: .leading, spacing: 2) {
            ForEach(rows, id: \.self) { id in row(id).id(id) }
          }
          .padding(8).padding(.bottom, 112)
        }
        .scrollDismissesKeyboard(.interactively)
        .onChange(of: m.sel) { _, s in if !s.isEmpty { withAnimation(Motion.fade) { proxy.scrollTo(s, anchor: .center) } } }
      }
      if on != nil && canEdit { keys.padding(.bottom, keyboard.height) }
    }
    .background(t.bg.ignoresSafeArea())
    .onChange(of: m.sel) { _, s in if m.writing && on != nil { on = s } }
    .accessibilityElement(children: .contain).accessibilityLabel("Outline")
  }

  private func row(_ id: String) -> some View {
    let i = m.tree[id], level = i?.level ?? 0, kids = i?.children.count ?? 0, folded = m.isFolded(id), selected = m.sel == id
    let size: CGFloat = level == 0 ? 20 : level == 1 ? 16 : 15, weight: Font.Weight = level < 2 ? .semibold : .regular
    return HStack(alignment: .top, spacing: 6) {
      Button { if kids > 0 { withAnimation(Motion.reveal) { m.fold(id) } } } label: {
        Icon("chev", 13, 2.4).rotationEffect(.degrees(folded ? 0 : 90)).foregroundStyle(t.muted).opacity(kids > 0 ? 1 : 0).frame(width: 40, height: 40).contentShape(Rectangle())
      }
      .buttonStyle(.flat).padding(.leading, -10).disabled(kids == 0).accessibilityLabel(folded ? "Unfold" : "Fold").accessibilityHidden(kids == 0)
      VStack(alignment: .leading, spacing: 3) {
        ViewThatFits(in: .horizontal) {
          HStack(alignment: .firstTextBaseline, spacing: 10) { label(id, size, weight, selected); meta(id, folded, kids) }
          VStack(alignment: .leading, spacing: 3) { label(id, size, weight, selected); meta(id, folded, kids) }
        }
        if let note = i?.note, !note.isEmpty { Text(note).css(14, lh: 1.45).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true) }
      }
      .padding(.top, 9)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
      .onTapGesture {
        m.select(id)
        if canEdit { m.writing = true; DispatchQueue.main.async { on = id } }
      }
    }
    .padding(.vertical, 4).padding(.trailing, 10).padding(.leading, 12 + CGFloat(level) * 22)
    .frame(minHeight: 48, alignment: .top)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(selected ? t.surf : .clear))
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(selected ? .isSelected : [])
    .accessibilityValue("level \(level + 1)" + (kids > 0 ? folded ? ", folded" : ", open" : ""))
  }
  /// A row's words (a field while it's being written in).
  @ViewBuilder private func label(_ id: String, _ size: CGFloat, _ weight: Font.Weight, _ selected: Bool) -> some View {
          if selected && m.writing && canEdit {
            TextField("", text: Binding(get: { m.field }, set: { m.field = $0; m.typed($0) }), prompt: Text(id == m.tree.root ? m.title : "An idea").foregroundStyle(PLACEHOLDER))
              .font(.geist(size, weight)).foregroundStyle(t.text).focused($on, equals: id).submitLabel(.next)
              .onSubmit { m.returnKey() }
          } else {
            Text(m.tree.label(id, title: m.title)).css(size, weight, lh: 1.35).fixedSize(horizontal: false, vertical: true)
          }
  }
  /// How many ideas a folded one holds, and its cards (beside the words when they fit, else under them).
  @ViewBuilder private func meta(_ id: String, _ folded: Bool, _ kids: Int) -> some View {
    if (folded && kids > 0) || (m.tree[id]?.cardIds.count ?? 0) > 0 {
      HStack(spacing: 10) {
        if folded && kids > 0 { Text(plural(kids, "idea") + " inside").css(13).foregroundStyle(t.muted) }
        if let c = m.tree[id]?.cardIds.count, c > 0 { Text(plural(c, "card")).css(13).foregroundStyle(t.muted) }
      }
      .fixedSize()
    }
  }

  /// ⇤ outdent · ⇥ indent · ↑ · ↓ · Done, over the keyboard.
  private var keys: some View {
    HStack(spacing: 6) {
      key("Outdent", "outdent") { m.move("outdent") }
      key("Indent", "indent") { m.move("indent") }
      key("Move up", "up") { m.move("up") }
      key("Move down", "down") { m.move("down") }
      Button { m.doneWriting(); on = nil } label: {
        Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.inv))
      }
      .buttonStyle(.press).layoutPriority(1.3)
    }
    .padding(.horizontal, 12).padding(.vertical, 6)
    .background(MapArt.raised(t.colors).bg.color)
  }
  private func key(_ label: String, _ icon: String, _ go: @escaping () -> Void) -> some View {
    Button(action: go) { Icon(icon, 18, 2).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// The map for VoiceOver (§5.5): every idea showing, as a button ('Electron transport on the inner membrane, level 3, 1 card, weak'), with
/// Fold or Unfold and Rename; during a test a hidden idea reads 'Hidden idea, level 3. Double tap to show.', and Knew it and Missed mark it.
struct MapA11y: View {
  @ObservedObject var m: MapModel
  var body: some View {
    let tones = m.device.weak ? m.tones() : [:]
    VStack {
      ForEach(m.layout?.nodes.map(\.id) ?? [], id: \.self) { id in
        let i = m.tree[id], level = (i?.level ?? 0) + 1, hidden = m.test?.hidden.contains(id) ?? false
        let words = hidden ? "Hidden idea, level \(level). Double tap to show." : m.tree.label(id, title: m.title) + ", level \(level)" + ((i?.cardIds.count ?? 0) > 0 ? ", " + plural(i!.cardIds.count, "card") : "") + (tones[id] == "weak" ? ", weak" : "")
        Button(words) {
          if hidden { if m.test?.show == "map" { m.tapInTest(id) } else if m.test?.current == id { m.showCurrent() } }
          else if m.test == nil { m.select(id) }
        }
        .accessibilityAddTraits(m.sel == id ? .isSelected : [])
        .accessibilityActions {
          if !(i?.children.isEmpty ?? true) && m.test == nil { Button(m.isFolded(id) ? "Unfold" : "Fold") { m.fold(id) } }
          if m.test == nil && m.canEdit { Button("Rename") { m.select(id, write: true) } }
          if m.test?.current == id && m.test?.shown == true { Button("Knew it") { m.mark(true) }; Button("Missed") { m.mark(false) } }
        }
      }
    }
  }
}
