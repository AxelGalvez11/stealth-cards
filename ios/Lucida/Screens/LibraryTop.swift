// The top of the Library (the boards PhoneLibrary, PhoneLibraryAssigned and PhoneDecksEmpty): what your classes assigned, and a brand-new
// account's three ways in. The Library makes no cards itself (the owner, 2026-10-02: "remove the library composer, upload buttons, cards due
// accross all canvas screens", then "remove the 'make cards from library'"): cards are made from a deck, on its cover. Each piece is a small
// view of its own, so the Library's page stays light to lay out.
import SwiftUI

/// What your classes assigned (ASSIGNED_PHONE): a calm row each, soonest first: the deck, when it's due and whose class, and what's left for
/// you. A row opens the deck (or the class, until you study it). Only there when you have assignments.
struct AssignedList: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  var body: some View {
    let rows = store.assignmentRows()
    if !rows.isEmpty {
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow(text: "Assigned").padding(.horizontal, 4).padding(.top, 6).padding(.bottom, 4)
        ForEach(rows) { row($0) }
      }
    }
  }
  private func row(_ a: AssignmentRow) -> some View {
    let mesh = Mesh.gen(a.cover.seed ?? a.name, a.cover.style ?? "mix")
    let left = ClassWords.leftWord(goal: a.goal, cards: a.cards, a.progress)
    let sub = ClassWords.dueWord(a.goal, a.due, today: store.classToday) + " · " + a.className
    return Button {
      if let p = a.progress { nav.push(.deck(store.demo ? "cell" : p.deckId)) } else { nav.classPage(a.code) }
    } label: {
      HStack(spacing: 12) {
        CSSLinearGradient(angle: mesh.angle, stops: mesh.stops).frame(width: 10, height: 10).clipShape(Circle())
        VStack(alignment: .leading, spacing: 2) {
          Text(a.name).css(16, .medium).foregroundStyle(a.done ? t.muted : t.text).lineLimit(1).line(16)
          Text(sub).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(left).css(14, .semibold).foregroundStyle(a.done ? t.good : t.text).lineLimit(1).fixedSize().line(14)
      }
      .frame(minHeight: 58)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
      .padding(.bottom, 1)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([a.name, sub, left].joined(separator: ", "))
    .accessibilityAddTraits(.isButton)
  }
}

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
