// The Mind map page's own bottom sheets (design/maps.mjs mapPage, phone: SHEET with its grabber), never the system's Menu, popover or Toggle:
//   - Test me: what to hide (Everything, Weak ones (n), This branch) and how to show it (On the map, One at a time: the iPhone's default);
//   - Test done: 'You knew 14 of 18', the missed ideas with their paths (+ Card on one with no card), Test the 4 again, Study their cards;
//   - Cards of an idea: its linked cards (× unlinks), Link a card (best matches first, maps.matchCards, no AI), Study these cards;
//   - the idea's More: Start folded, Test this branch, Delete;
//   - Make a card from an idea, prefilled (its words on the front, what's under it on the back), linked to the idea once it's added.
import SwiftUI

/// A sheet from the bottom: the grabber, then what's in it, on the raised surface (a gray a step above the black page in the dark).
struct MapSheetBox<Content: View>: View {
  @Environment(\.theme) private var t
  var gap: CGFloat = 14
  /// The grabber over it (the boards' Make a card sheet has none).
  var grab = true
  var label: String
  @ViewBuilder let content: Content
  var body: some View {
    let te = MapArt.raised(t.colors)
    VStack(alignment: .leading, spacing: gap) {
      if grab { Capsule().fill(te.line.color).frame(width: 36, height: 5).frame(maxWidth: .infinity).padding(.top, -8).padding(.bottom, -2).accessibilityHidden(true) }
      content
    }
    .padding(.horizontal, 16).padding(.top, 18).padding(.bottom, 34)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 28, topTrailing: 28), style: .continuous).fill(te.bg.color)
      .overlay(UnevenRoundedRectangle(cornerRadii: RectangleCornerRadii(topLeading: 28, topTrailing: 28), style: .continuous).stroke(te.line.color, lineWidth: 1).mask(Rectangle().frame(height: 30).frame(maxHeight: .infinity, alignment: .top)))
      .ignoresSafeArea(edges: .bottom))
    .accessibilityElement(children: .contain).accessibilityLabel(label).accessibilityAddTraits(.isModal)
  }
}

/// Cancel beside the sheet's main button, as the boards lay them out (flex 1 and 2, each with its own padding): Cancel a third of what's
/// left after the padding, plus its own.
struct MapSplit: View {
  let a: AnyView, b: AnyView
  var body: some View {
    let W = UIScreen.main.bounds.width - 32 - 8, x = max(0, (W - 80) / 3)
    HStack(spacing: 8) { a.frame(width: 36 + x); b.frame(width: W - 36 - x) }
  }
}

/// The round close button of a sheet (44 pt).
private struct SheetClose: View {
  @Environment(\.theme) private var t
  let go: () -> Void
  var body: some View {
    Button(action: go) { Icon("close", 14, 2).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(MapArt.raised(t.colors).surf.color)) }
      .buttonStyle(.press).accessibilityLabel("Close")
  }
}

// ---------- Test me ----------
struct MapTestSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  var body: some View {
    let te = MapArt.raised(t.colors), weak = m.testIds("weak").count, label = m.sel.isEmpty ? "" : m.tree.label(m.sel, title: m.title)
    MapSheetBox(label: "Test me") {
      HStack(spacing: 10) {
        Text("Test me").css(20, .semibold, ls: -0.01).frame(maxWidth: .infinity, alignment: .leading)
        SheetClose { m.closeSheet() }
      }
      Text("The words go; say each one before you show it. Lucida keeps what you knew and missed.").css(15, lh: 1.45).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
      group("Hide", [("all", "Everything", false), ("weak", "Weak ones (\(weak))", false), ("branch", label.isEmpty ? "This branch" : "This branch: " + label, label.isEmpty)], m.testHide, te) { m.testHide = $0 }
      group("Show", [("map", "On the map", false), ("one", "One at a time", false)], m.testShow, te) { m.testShow = $0 }
      MapSplit(a: AnyView(Button { m.closeSheet() } label: { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(te.surf.color)) }
          .buttonStyle(.press)),
        b: AnyView(Button { m.startTest() } label: { Text("Start").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv)) }
          .buttonStyle(.press).accessibilityIdentifier("map.start")))
    }
  }
  private func group(_ title: String, _ opts: [(String, String, Bool)], _ on: String, _ te: MapArt.Raised, pick: @escaping (String) -> Void) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).css(13, .semibold)
      VStack(spacing: 6) {
        ForEach(opts, id: \.0) { o in
          let sel = on == o.0 && !o.2
          Button { if !o.2 { withAnimation(Motion.knob) { pick(o.0) } } } label: {
            HStack { Text(o.1).css(15, .semibold).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading); if sel { Icon("check", 16, 2.4) } }
              .foregroundStyle(sel ? t.invText : o.2 ? t.muted : t.text).padding(.horizontal, 16).frame(height: 48)
              .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(sel ? t.inv : te.surf.color))
          }
          .buttonStyle(.press).disabled(o.2).accessibilityAddTraits(sel ? .isSelected : []).accessibilityIdentifier("map.choice." + o.0)
        }
      }
    }
  }
}

// ---------- Test done ----------
struct MapDoneSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  var body: some View {
    let te = MapArt.raised(t.colors), d = m.done ?? MapModel.Done()
    let cards = d.missed.reduce(0) { $0 + (m.tree[$1]?.cardIds.count ?? 0) }
    MapSheetBox(label: "Test done") {
      HStack(alignment: .top, spacing: 10) {
        VStack(alignment: .leading, spacing: 4) {
          Text("You knew \(d.knew) of \(d.total)").css(24, .semibold, ls: -0.02).accessibilityIdentifier("map.doneTitle")
          Text("Saved for this map. The ones you missed show in Weak spots.").css(15).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        SheetClose { m.closeDone() }
      }
      if !d.missed.isEmpty {
        VStack(alignment: .leading, spacing: 0) {
          Text("Missed").css(13, .semibold).padding(.bottom, 6)
          ScrollView {
            VStack(spacing: 0) {
              ForEach(d.missed, id: \.self) { id in
                HStack(spacing: 10) {
                  Circle().strokeBorder(t.again, lineWidth: 2).frame(width: 10, height: 10)
                  VStack(alignment: .leading, spacing: 1) {
                    Text(m.tree.label(id, title: m.title)).css(15, .semibold).lineLimit(2)
                    Text(m.tree.pathLine(id, title: m.title)).css(13).foregroundStyle(t.muted).lineLimit(1)
                  }
                  .frame(maxWidth: .infinity, alignment: .leading)
                  if (m.tree[id]?.cardIds ?? []).isEmpty && m.canEdit {
                    Button { m.closeDone(); m.makeCard(id) } label: {
                      HStack(spacing: 6) { Icon("plus", 12, 2.4); Text("Card").css(13, .semibold) }.foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 44).background(Capsule().fill(te.surf.color))
                    }
                    .buttonStyle(.press).accessibilityLabel("Make a card from " + m.tree.label(id, title: m.title))
                  }
                }
                .padding(.vertical, 6).frame(minHeight: 69)
                .overlay(alignment: .top) { Rectangle().fill(te.line.color).frame(height: 1) }
              }
            }
          }
          .frame(maxHeight: 300).fixedSize(horizontal: false, vertical: d.missed.count <= 4)
        }
      }
      VStack(spacing: 8) {
        if !d.missed.isEmpty {
          Button { m.startTest(d.missed, show: "one") } label: {
            Text("Test the \(d.missed.count) again").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press).accessibilityIdentifier("map.again")
        }
        if cards > 0 {
          Button { m.study(d.missed) } label: {
            HStack(spacing: 6) { Icon("play", 13, 2.2); Text("Study their " + plural(cards, "card")).css(15, .semibold) }
              .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(te.surf.color))
          }
          .buttonStyle(.press)
        }
      }
    }
  }
}

// ---------- Cards of an idea ----------
struct MapCardsSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  @FocusState private var searchOn: Bool
  var body: some View {
    let te = MapArt.raised(t.colors), id = m.sel, linked = m.linked(id), matches = m.matches(id)
    MapSheetBox(gap: 12, label: "Cards of this idea") {
      HStack(alignment: .top, spacing: 10) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Cards of this idea").css(13, .semibold).foregroundStyle(t.muted)
          Text(m.tree.label(id, title: m.title)).css(17, .semibold, lh: 1.35).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading).layoutPriority(1)
        SheetClose { m.closeSheet() }
      }
      ForEach(linked) { c in
        HStack(alignment: .top, spacing: 10) {
          VStack(alignment: .leading, spacing: 3) {
            Text(c.front).css(15, .semibold, lh: 1.35).fixedSize(horizontal: false, vertical: true)
            Text(c.back).css(14, lh: 1.4).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
            if c.weak { Text("Weak spot").css(13, .semibold).foregroundStyle(t.again).padding(.horizontal, 9).frame(height: 22).background(Capsule().fill(t.againTint)).padding(.top, 4) }
          }
          .frame(maxWidth: .infinity, alignment: .leading).layoutPriority(1)
          if m.canEdit {
            Button { m.apply(["op": "unlink", "id": id, "cardId": c.id]) } label: { Icon("close", 14, 2).foregroundStyle(t.muted).frame(width: 44, height: 44).contentShape(Rectangle()) }
              .buttonStyle(.press).padding(.top, -8).padding(.trailing, -8).accessibilityLabel("Unlink this card")
          }
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(te.surf.color))
      }
      if m.canEdit {
        VStack(alignment: .leading, spacing: 8) {
          Text("Link a card").css(13, .semibold)
          HStack(spacing: 8) {
            Icon("search", 15, 2).foregroundStyle(t.muted)
            TextField("", text: $m.cardsQuery, prompt: Text("Search this deck’s cards").foregroundStyle(PLACEHOLDER)).font(.geist(16)).foregroundStyle(t.text).focused($searchOn)
              .accessibilityLabel("Search this deck’s cards")
          }
          .padding(.horizontal, 12).frame(height: 44).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(te.surf.color))
          Text(m.cardsQuery.isEmpty ? "Best matches in " + m.deckName : (matches.isEmpty ? "No card has those words" : "Cards with those words")).css(13).foregroundStyle(t.muted)
          VStack(spacing: 0) {
            ForEach(matches) { c in
              HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 1) {
                  Text(c.front).css(15, .medium).lineLimit(1)
                  Text(c.back).css(13).foregroundStyle(t.muted).lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Button { m.apply(["op": "link", "id": id, "cardId": c.id]) } label: {
                  HStack(spacing: 6) { Icon("plus", 12, 2.4); Text("Link").css(13, .semibold) }.foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 44).background(Capsule().fill(te.surf.color))
                }
                .buttonStyle(.press).accessibilityLabel("Link " + c.front)
              }
              .padding(.leading, 12).padding(.trailing, 4).padding(.vertical, 6).frame(minHeight: 69)
              .overlay(alignment: .top) { Rectangle().fill(te.line.color).frame(height: 1) }
            }
          }
        }
      }
      if !linked.isEmpty {
        Button { m.study([id]) } label: {
          HStack(spacing: 6) { Icon("play", 14, 2.2); Text(linked.count == 1 ? "Study this card" : "Study these \(linked.count) cards").css(15, .semibold) }
            .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
      }
    }
  }
}

// ---------- the idea's More ----------
struct MapMoreSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  let canEdit: Bool
  var body: some View {
    let i = m.tree[m.sel], hasKids = !(i?.children.isEmpty ?? true)
    MapSheetBox(gap: 4, label: "More for this idea") {
      HStack(spacing: 10) {
        Text(m.tree.label(m.sel, title: m.title)).css(17, .semibold).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        SheetClose { m.closeSheet() }
      }
      .padding(.horizontal, 4).padding(.top, 4).padding(.bottom, 8)
      if canEdit && hasKids { item("fold", "Start folded", check: i?.folded == true) { m.apply(["op": "set", "id": m.sel, "folded": !(i?.folded ?? false)]) } }
      if hasKids { item("test", "Test this branch") { m.testHide = "branch"; withAnimation(Motion.sheet) { m.sheet = .test } } }
      if canEdit && i?.parent != nil { item("bin", "Delete", danger: true) { let id = m.sel; m.closeSheet(); m.remove(id) } }
    }
  }
  private func item(_ icon: String, _ label: String, check: Bool = false, danger: Bool = false, _ go: @escaping () -> Void) -> some View {
    Button(action: go) {
      HStack(spacing: 10) { Icon(icon, 16, 2); Text(label).css(16, .medium).frame(maxWidth: .infinity, alignment: .leading); if check { Icon("check", 15, 2.4) } }
        .foregroundStyle(danger ? t.again : t.text).padding(.horizontal, 12).frame(minHeight: 52).contentShape(Rectangle())
    }
    .buttonStyle(.flat).accessibilityLabel(label).accessibilityAddTraits(check ? .isSelected : [])
  }
}

// ---------- Make a card from an idea ----------
struct MapMakeSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var m: MapModel
  @ObservedObject var keyboard: Keyboard
  @State private var front = ""
  @State private var back = ""
  @State private var busy = false
  var body: some View {
    let te = MapArt.raised(t.colors), idea = m.make.map { m.tree.label($0.idea, title: m.title) } ?? ""
    MapSheetBox(gap: 10, grab: false, label: "New card from this idea") {
      Text("New card from this idea").css(17, .semibold)
      field("Front", $front, "A question", lines: 2, te)
      field("Back", $back, "The answer", lines: 4, te)
      Text("It’s linked to “" + idea + "” once it’s added.").css(13).foregroundStyle(t.muted)
      MapSplit(a: AnyView(Button { m.closeMake() } label: { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(te.surf.color)) }
          .buttonStyle(.press)),
        b: AnyView(Button {
          guard !busy else { return }
          busy = true
          Task { await m.addCard(front: front.trimmingCharacters(in: .whitespacesAndNewlines), back: back.trimmingCharacters(in: .whitespacesAndNewlines)); busy = false }
        } label: {
          Text("Add to " + m.deckName).css(15, .semibold).lineLimit(1).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).accessibilityIdentifier("map.addCard")))
    }
    .padding(.bottom, keyboard.height > 0 ? keyboard.height - 34 : 0)
    .onAppear { front = m.make?.front ?? ""; back = m.make?.back ?? "" }
  }
  private func field(_ label: String, _ text: Binding<String>, _ hint: String, lines: Int, _ te: MapArt.Raised) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label).css(13, .semibold).foregroundStyle(t.muted)
      TextField("", text: text, prompt: Text(hint).foregroundStyle(PLACEHOLDER), axis: .vertical).font(.geist(16)).foregroundStyle(t.text).lineLimit(lines...max(lines, 7))
    }
    .padding(.horizontal, 14).padding(.vertical, 10).frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(te.surf.color))
  }
}
