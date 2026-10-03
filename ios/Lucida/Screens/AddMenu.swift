// Lucida's own small menu (design/materials.mjs addMenu, design/build.mjs STUDY_MENU and ADD_MENU): the Library's + (New deck, Import cards), and a deck page's
// Study (Flashcards, Learn) and + (New card, Make cards, Source, Notes, Upload diagram, Make diagram). A small menu under its button, over everything, with a layer
// behind it that closes it: a round icon and a name on each row, and a line about it where the row has one (a row with no line is its icon and its name, and
// can say something short at its right, like Flashcards' "28 due"). The button is marked with `.addMenuAnchor(id)`, and the screen draws the menu with
// `.addMenu(open:rows:id:)` (one screen can have several, each with its own id); `fill` makes it as wide as its button, under it.
import SwiftUI

struct AddMenuRow: Identifiable {
  var id: String { title }
  let icon: String, title: String, line: String
  /// What the row says at its right (Flashcards: "28 due"), on a row with no line.
  var note = ""
  let action: () -> Void
}

private struct AddMenuAnchor: PreferenceKey {
  static let defaultValue: [String: Anchor<CGRect>] = [:]
  static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) { value.merge(nextValue()) { $1 } }
}

extension View {
  /// The button the menu `id` opens from.
  func addMenuAnchor(_ id: String = "add") -> some View { anchorPreference(key: AddMenuAnchor.self, value: .bounds) { [id: $0] } }
  /// The menu, while `open`: its right edge on its button's, 8 points under it (`fill`: its button's width).
  func addMenu(open: Binding<Bool>, rows: [AddMenuRow], id: String = "add", width: CGFloat = 300, fill: Bool = false, label: String = "Add cards") -> some View {
    overlayPreferenceValue(AddMenuAnchor.self) { anchors in AddMenuPopup(open: open, rows: rows, anchor: anchors[id], width: width, fill: fill, label: label) }
      #if DEBUG
      // `-menu open`: the + menu is open when the screen is (to set it beside its board).
      .onAppear { if id == "add" && Board.arg("-menu") == "open" { open.wrappedValue = true } }
      #endif
  }
}

private struct AddMenuPopup: View {
  @Environment(\.theme) private var t
  @Binding var open: Bool
  let rows: [AddMenuRow]
  let anchor: Anchor<CGRect>?
  let width: CGFloat
  let fill: Bool
  let label: String
  var body: some View {
    GeometryReader { g in
      if open, let anchor {
        let r = g[anchor], w = fill ? r.width : width
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture { open = false }.accessibilityHidden(true)
          VStack(spacing: 2) {
            ForEach(rows) { row in
              Button { open = false; row.action() } label: { rowView(row) }
                .buttonStyle(.press)
                .accessibilityLabel(row.title)
                .accessibilityValue(row.note)
                .accessibilityHint(row.line)
                .accessibilityIdentifier("menu." + row.title)
            }
          }
          .padding(8).frame(width: w)
          .modifier(PopBox())
          .accessibilityElement(children: .contain).accessibilityLabel(label)
          .offset(x: r.maxX - w, y: r.maxY + 8)
        }
        .transition(.opacity)
      }
    }
  }
  /// A row: its icon in a circle, its name, and its line (none on More's rows, which are just the kind's icon and name).
  @ViewBuilder private func rowView(_ row: AddMenuRow) -> some View {
    if row.line.isEmpty {
      HStack(spacing: 12) {
        Icon(row.icon, 17, 2).foregroundStyle(t.muted).frame(width: 20)
        Text(row.title).css(14, .semibold).foregroundStyle(t.text).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        if !row.note.isEmpty { Text(row.note).css(13, .medium).foregroundStyle(t.muted).monospacedDigit().fixedSize() }
      }
      .padding(.horizontal, 12).frame(height: 44)
      .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    } else {
      HStack(spacing: 12) {
        Icon(row.icon, 15, 2).foregroundStyle(t.text).frame(width: 32, height: 32).background(Circle().fill(t.surf))
        VStack(alignment: .leading, spacing: 1) {
          Text(row.title).css(14, .semibold, lh: 1.25).foregroundStyle(t.text)
          Text(row.line).css(12).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 12).padding(.vertical, 8).frame(minHeight: 52)
      .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
  }
}
