// iPhone · Check AI cards (PhoneInbox): cards your AI made while "Check AI cards first" is on. Tap one to see its answer,
// then keep it or toss it.
import SwiftUI

extension Store {
  /// Cards waiting to be checked, with the deck each is in.
  func inbox() -> [(card: CardFace, deck: String)] {
    if demo {
      return [(Store.demoCards[1], "Cell Biology"), (Store.demoCards[3], "Japanese · JLPT N4"), (Store.demoCards[2], "Cell Biology")]
    }
    return lib.cards.filter(\.pending).map { c in (Store.face(c), engine.deck(c.deckId)?.name ?? "") }
  }
  func keep(_ id: String) { if !demo { applyLocalCard(id) { $0.pending = false }; Task { await send("card.update", ["id": id, "patch": ["pending": false]]) } } }
  func toss(_ id: String) { if !demo { lib.cards.removeAll { $0.id == id }; Task { await send("card.delete", ["id": id]) } } }
  func applyLocalCard(_ id: String, _ change: (inout Card) -> Void) { if let i = lib.cards.firstIndex(where: { $0.id == id }) { change(&lib.cards[i]) } }
}

struct InboxScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var handled: [String: String] = [:]
  @State private var revealed = false
  @State private var moved = false
  @State private var total: Int? = nil

  var body: some View {
    let items = store.inbox().filter { handled[$0.card.id] == nil }, all = total ?? items.count
    let c = items.first
    VStack(spacing: 18) {
      HStack(spacing: 12) {
        RoundButton(icon: "back", label: "Back") { nav.back() }
        VStack(spacing: 1) {
          Text("Check AI cards").css(17, .semibold)
          Text(c?.deck ?? "").css(12).foregroundStyle(t.muted).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        Text(c == nil ? "" : "\(all - items.count + 1)/\(all)").css(13, mono: true).foregroundStyle(t.muted).frame(width: 44, alignment: .trailing)
      }
      if let c {
        ZStack {
          RoundedRectangle(cornerRadius: 36, style: .continuous).fill(t.surf).scaleEffect(0.94).offset(y: 16)
          FlipCard(card: c.card, revealed: revealed, moved: moved, done: handled.count, tap: { moved = false; revealed.toggle() }, radius: 36,
                   pad: EdgeInsets(top: 28, leading: 24, bottom: 28, trailing: 24))
        }
        .frame(maxHeight: .infinity)
        HStack(spacing: 12) {
          Button { handle(c.card.id, "tossed") } label: {
            Text("Toss").css(17, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 60).background(Capsule().fill(t.surf))
          }.buttonStyle(.press)
          Button { handle(c.card.id, "kept") } label: {
            Text("Keep").css(17, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 60).background(Capsule().fill(t.inv))
          }.buttonStyle(.press)
        }
        .padding(.top, 8)
      } else {
        VStack(spacing: 10) {
          Icon("check", 30, 2.4).foregroundStyle(t.invText).frame(width: 72, height: 72).background(Circle().fill(t.inv))
          Text("All checked").css(24, .semibold)
          Text("\(handled.values.filter { $0 == "kept" }.count) kept, \(handled.values.filter { $0 == "tossed" }.count) tossed").css(15).foregroundStyle(t.muted)
        }
        .frame(maxHeight: .infinity)
        BigButton(label: "Done", height: 60, size: 17) { nav.back() }
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, Screen.top(64)).padding(.horizontal, 20).padding(.bottom, 40)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(t.bg)
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { if total == nil { total = store.inbox().count } }
  }

  private func handle(_ id: String, _ v: String) {
    var tx = Transaction(); tx.disablesAnimations = true
    withTransaction(tx) { revealed = false; moved = true }
    handled[id] = v
    v == "kept" ? store.keep(id) : store.toss(id)
  }
}
