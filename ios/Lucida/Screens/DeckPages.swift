// iPhone · the deck page's Pages tab (design/pages.mjs deckPagesBlock, phone; the canvas's PhoneDeck section=Pages): New page (its menu of kinds is the deck
// page's own: Screens/Deck.swift newPageRows), "No pages yet" before there are any, and each page as a row: its kind's icon, its title and kind, ✦ when an AI
// app changed it last, and its version. A page inside another sits under it, 20 points further in. A row opens the page (Screens/Page.swift).
import SwiftUI

/// Draws `content` again whenever `object` changes (a screen that reads a store it doesn't otherwise watch: the deck page and its Pages).
struct Observing<O: ObservableObject, C: View>: View {
  @ObservedObject var object: O
  let content: () -> C
  init(_ object: O, @ViewBuilder content: @escaping () -> C) { self.object = object; self.content = content }
  var body: some View { content() }
}

struct DeckPagesList: View {
  @Environment(\.theme) private var t
  let rows: [PageInfo]
  /// It's the person's own deck: New page shows.
  let can: Bool
  /// The list arrived and has nothing in it.
  let none: Bool
  let menuOpen: Bool
  let toggleMenu: () -> Void
  let open: (PageInfo) -> Void

  /// The pages in order, each after the page it's inside (design/pages.mjs deckPagesJs: walk), and how far in.
  static func ordered(_ list: [PageInfo]) -> [(p: PageInfo, depth: Int)] {
    let by = Dictionary(list.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    func depth(_ x: PageInfo) -> Int { var d = 0, q: PageInfo? = x; while let c = q, !c.parent.isEmpty, let up = by[c.parent], d < 6 { d += 1; q = up }; return d }
    var out: [(PageInfo, Int)] = [], seen = Set<String>()
    func walk(_ x: PageInfo) { guard seen.insert(x.id).inserted else { return }; out.append((x, depth(x))); list.filter { $0.parent == x.id }.forEach(walk) }
    list.filter { $0.parent.isEmpty || by[$0.parent] == nil }.forEach(walk)
    return out
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if can {
        HStack {
          Spacer()
          Button(action: toggleMenu) {
            HStack(spacing: 6) { Icon("plus", 14, 2.4); Text("New page").css(13, .semibold).lineLimit(1).fixedSize() }
              .foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press)
          .accessibilityLabel("New page").accessibilityAddTraits(menuOpen ? .isSelected : []).accessibilityIdentifier("pages.new")
          .addMenuAnchor("deck-newpage")
        }
        .padding(.vertical, 10)
      }
      if none {
        VStack(spacing: 8) {
          Text("No pages yet").css(16, .semibold)
          Text("Notes beside the cards, with traps, pearls, chains and the deck’s own cards. Make one here, or ask your AI: “Make a page of notes for this deck in Lucida.”")
            .css(14, lh: 1.5).foregroundStyle(t.muted).multilineTextAlignment(.center).frame(maxWidth: 420)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 24).padding(.horizontal, 18)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
        .accessibilityElement(children: .combine).accessibilityIdentifier("pages.none")
      }
      VStack(spacing: 0) {
        ForEach(Self.ordered(rows), id: \.p.id) { x in row(x.p, x.depth) }
      }
      .overlay(alignment: .top) { if !rows.isEmpty { t.line.frame(height: 1) } }
      .padding(.top, none ? 0 : 0)
    }
    .accessibilityElement(children: .contain).accessibilityLabel("Pages")
  }

  private func row(_ p: PageInfo, _ depth: Int) -> some View {
    let title = p.title.isEmpty ? "Untitled" : p.title, kind = PageKind.name(p.kind)
    return Button { open(p) } label: {
      HStack(spacing: 12) {
        Icon(PageKind.icon(p.kind), 16, 2).foregroundStyle(t.text).frame(width: 34, height: 34).background(Circle().fill(t.surf))
        VStack(alignment: .leading, spacing: 2) {
          Text(title).css(15, .semibold).lineLimit(1).foregroundStyle(t.text)
          Text(kind).css(13).lineLimit(1).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        HStack(spacing: 8) {
          if p.ai { Icon("sparkle", 13, 2).foregroundStyle(t.muted).accessibilityLabel("by an AI app") }
          Text("v\(p.version)").css(12, .semibold).foregroundStyle(t.text).padding(.horizontal, 8).frame(height: 22).background(Capsule().fill(t.surf))
        }
        .fixedSize()
      }
      .padding(.vertical, 8).padding(.leading, CGFloat(depth) * 20).frame(minHeight: 64)
      .contentShape(Rectangle())
      .overlay(alignment: .bottom) { t.line.frame(height: 1) }
    }
    .buttonStyle(.flat)
    .accessibilityLabel(title)
    .accessibilityValue(kind + ", version \(p.version), " + PageAgo.who(p.by) + (p.ai ? " (an AI app)" : "") + ", " + PageAgo.of(p.updated))
    .accessibilityIdentifier("pages.row")
  }
}
