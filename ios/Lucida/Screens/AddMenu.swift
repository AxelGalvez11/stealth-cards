// The + menus (design/materials.mjs addMenu): Today's + (New card, Make cards, New deck), the Library's + (New deck, Make cards, Import cards),
// and a deck's Add cards. A small menu under the button, over everything, with a layer behind it that closes it: three rows, each with a round
// icon, a name, and a line about it. The button is marked with `.addMenuAnchor()`, and the screen draws the menu with `.addMenu(open:rows:)`.
import SwiftUI

struct AddMenuRow: Identifiable {
  var id: String { title }
  let icon: String, title: String, line: String
  let action: () -> Void
}

private struct AddMenuAnchor: PreferenceKey {
  static let defaultValue: Anchor<CGRect>? = nil
  static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) { value = nextValue() ?? value }
}

extension View {
  /// The button the menu opens from.
  func addMenuAnchor() -> some View { anchorPreference(key: AddMenuAnchor.self, value: .bounds) { $0 } }
  /// The menu, while `open`: its right edge on the button's, 8 points under it.
  func addMenu(open: Binding<Bool>, rows: [AddMenuRow]) -> some View {
    overlayPreferenceValue(AddMenuAnchor.self) { anchor in AddMenuPopup(open: open, rows: rows, anchor: anchor) }
      #if DEBUG
      // `-menu open`: the menu is open when the screen is (to set it beside its board).
      .onAppear { if Board.arg("-menu") == "open" { open.wrappedValue = true } }
      #endif
  }
}

private struct AddMenuPopup: View {
  @Environment(\.theme) private var t
  @Binding var open: Bool
  let rows: [AddMenuRow]
  let anchor: Anchor<CGRect>?
  var body: some View {
    GeometryReader { g in
      if open, let anchor {
        let r = g[anchor], width: CGFloat = 300
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture { open = false }.accessibilityHidden(true)
          VStack(spacing: 2) {
            ForEach(rows) { row in
              Button { open = false; row.action() } label: {
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
              .buttonStyle(.press)
              .accessibilityLabel(row.title).accessibilityHint(row.line)
            }
          }
          .padding(8).frame(width: width)
          .modifier(PopBox())
          .accessibilityElement(children: .contain).accessibilityLabel("Add cards")
          .offset(x: r.maxX - width, y: r.maxY + 8)
        }
        .transition(.opacity)
      }
    }
  }
}
