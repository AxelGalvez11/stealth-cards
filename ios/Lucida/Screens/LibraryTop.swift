// The top of a brand-new account's Library (the board PhoneDecksEmpty): its three ways in. The Library makes no cards itself (the owner,
// 2026-10-02: "remove the library composer, upload buttons, cards due accross all canvas screens", then "remove the 'make cards from
// library'"): cards are made from a deck, on its cover. It's a small view of its own, so the Library's page stays light to lay out.
import SwiftUI

/// A brand-new account's ways in: three plain tiles side by side, New deck, Import cards and Connect AI, and no other words (the boards' startTiles).
struct StartTiles: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  var body: some View {
    HStack(spacing: 8) {
      tile("decks", "New deck") { nav.newDeck() }
      tile("enter", "Import cards") { nav.importCards() }
      tile("connect", "Connect AI") { nav.openConnect() }
    }
  }
  private func tile(_ icon: String, _ title: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 8) {
        Icon(icon, 18, 2).frame(width: 36, height: 36).background(Circle().fill(t.bg))
        Text(title).css(14, .semibold).lineLimit(1).fixedSize()
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 4)
      .frame(maxWidth: .infinity).frame(height: 96)
      .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
      .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
    .buttonStyle(.press)
    .accessibilityLabel(title)
  }
}
