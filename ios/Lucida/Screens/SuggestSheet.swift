// iPhone · Suggest a change (PhonePublicDeckSuggest, PhonePublicDeckSuggestNew): a sheet over a shared deck's page. Pick a
// card (or search the deck) or start a new one, fix its words or take it out, add it to your changes, and send them all to
// the deck's owner with a line saying why (design/build.mjs SUGGEST_BODY).
import SwiftUI

/// What's been written so far, kept while the page is open (closing the sheet doesn't lose your changes), like the web page's own.
@MainActor
final class SuggestModel: ObservableObject {
  /// One change on its way: a card's new words, a card taken out, or a new card.
  struct Draft {
    var op = "edit", card = ""
    var kind: String? = nil, front: String? = nil, back: String? = nil, text: String? = nil
    /// What the server takes (web/social.mjs suggest).
    var json: [String: Any] {
      var after: [String: Any] = [:]
      if let kind { after["kind"] = kind }
      if let front { after["front"] = front }
      if let back { after["back"] = back }
      if let text { after["text"] = text }
      switch op {
      case "remove": return ["op": "remove", "card": card]
      case "add": return ["op": "add", "after": after]
      default: return ["op": "edit", "card": card, "after": after]
      }
    }
  }
  /// Where it is: "pick" (find a card), "card" (fix one), or "new"; nil until it's been moved (a link's ?suggest= starts it).
  @Published var step: String? = nil
  @Published var cardId = ""
  /// What you typed (nil: the card's own words).
  @Published var front: String? = nil
  @Published var back: String? = nil
  @Published var text: String? = nil
  @Published var remove = false
  @Published var kind = "basic"
  /// The changes added so far (nil: none, or the canvas's sample).
  @Published var drafts: [Draft]? = nil
  @Published var why = ""
  @Published var q = ""
  @Published var sent = false
  @Published var taken = false
  @Published var busy = false
  @Published var err = ""

  private static var kept: [String: SuggestModel] = [:]
  static func of(_ key: String) -> SuggestModel {
    if let m = kept[key] { return m }
    let m = SuggestModel(); kept[key] = m; return m
  }
  func resetFields() { front = nil; back = nil; text = nil; remove = false }
  /// Opened from its button (no card yet) or from a card.
  func open(card: String) { step = card.isEmpty ? "pick" : "card"; cardId = card; resetFields(); sent = false; err = "" }
  /// Opened by a link (?suggest=<card>): it starts where the link says, with the changes already added kept.
  func startFresh() { step = nil; cardId = ""; resetFields(); q = ""; sent = false; err = "" }
}

struct SuggestSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  let addr: DeckAddress
  /// Where a link opens it: on this card's id, "new", or "1" (none picked).
  let start: String
  @ObservedObject private var m: SuggestModel

  init(addr: DeckAddress, start: String) {
    self.addr = addr; self.start = start
    _m = ObservedObject(wrappedValue: SuggestModel.of(addr.key))
  }

  var body: some View {
    let p = store.netDeckPage(addr)?.value, list = p?.cardsList ?? []
    let ownerName = p?.deck.owner?.name ?? "", first = PageText.firstName(ownerName)
    // The canvas's sample (a new card, with one change already added).
    let sample = store.demo && start == "new"
    let startCard = findCard(start, list)
    let step = m.step ?? (start == "new" ? "new" : startCard != nil ? "card" : "pick")
    let card: SharedCard? = step == "card" ? (m.cardId.isEmpty ? startCard : list.first { $0.id == m.cardId }) : nil
    // The words a field starts with: the card's, or (the canvas's sample) a new card already begun.
    let f0 = { (pick: (SharedCard) -> String, sampleWords: String) -> String in card.map(pick) ?? (sample && m.step == nil ? sampleWords : "") }
    let front = m.front ?? f0({ $0.front }, "What activates PFK-1?"), back = m.back ?? f0({ $0.back }, "AMP and fructose-2,6-bisphosphate."), text = m.text ?? f0({ $0.text }, "")
    let cloze = card?.kind == "cloze", boxCard = card?.box != nil
    let drafts = m.drafts ?? (sample ? [SuggestModel.Draft(op: "edit", card: "c2", front: "Which enzyme is the rate-limiting step of glycolysis?",
                                                           back: "Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate.")] : [])
    let current = currentChange(step: step, card: card, front: front, back: back, text: text, cloze: cloze, boxCard: boxCard)
    let all = drafts + (current.map { [$0] } ?? [])
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        Text("Suggest a change").css(18, .semibold, ls: -0.01).lineLimit(1).line(18)
        Spacer(minLength: 12)
        Button { m.sent = false; m.err = ""; nav.close() } label: {
          Text("Cancel").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press)
      }
      if m.sent { sentView(first) } else { editing(list, step: step, card: card, front: front, back: back, text: text, cloze: cloze, boxCard: boxCard, drafts: drafts, current: current, all: all, first: first, p: p) }
    }
    .foregroundStyle(t.text)
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 12 : 34)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    // A sheet is all there is while it's up (a screen reader shouldn't go on to the page behind it).
    .accessibilityAddTraits(.isModal)
    .accessibilityElement(children: .contain).accessibilityIdentifier("suggest-sheet")
  }

  /// The card a link points at: a card of this deck, or one in your library that came from it.
  private func findCard(_ id: String, _ list: [SharedCard]) -> SharedCard? {
    guard !id.isEmpty else { return nil }
    if let c = list.first(where: { $0.id == id }) { return c }
    if !store.demo, let own = store.lib.cards.first(where: { $0.id == id }), let o = own.origin { return list.first { $0.id == o } }
    return nil
  }

  /// The change being written: a card's new words, the card taken out, or a new card (a text with blanks needs a [[blank]]).
  private func currentChange(step: String, card: SharedCard?, front: String, back: String, text: String, cloze: Bool, boxCard: Bool) -> SuggestModel.Draft? {
    let same = { (a: String, b: String) in a.trimmingCharacters(in: .whitespacesAndNewlines) == b.trimmingCharacters(in: .whitespacesAndNewlines) }
    if step == "card", let card {
      if m.remove { return .init(op: "remove", card: card.id) }
      let changed = cloze ? !same(text, card.text) : boxCard ? !same(front, card.front) : !same(front, card.front) || !same(back, card.back)
      guard changed else { return nil }
      return cloze ? .init(op: "edit", card: card.id, text: text) : boxCard ? .init(op: "edit", card: card.id, front: front) : .init(op: "edit", card: card.id, front: front, back: back)
    }
    if step == "new" {
      if m.kind == "cloze" { return text.range(of: "\\[\\[[^\\]]+\\]\\]", options: .regularExpression) != nil ? .init(op: "add", kind: "cloze", text: text) : nil }
      return front.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : .init(op: "add", kind: "basic", front: front, back: back)
    }
    return nil
  }

  private func draftWords(_ x: SuggestModel.Draft, _ list: [SharedCard]) -> (label: String, words: String) {
    let c = x.card.isEmpty ? nil : list.first { $0.id == x.card }
    if x.op == "add" {
      var a = SharedCard(); a.kind = x.kind ?? "basic"; a.front = x.front ?? ""; a.back = x.back ?? ""; a.text = x.text ?? ""
      return ("New card", PageText.askOf(a).nilIfEmpty ?? PageText.wordsOf(a))
    }
    if x.op == "remove" { return ("Remove", PageText.askOf(c)) }
    var a = c ?? SharedCard()
    if let v = x.front { a.front = v }; if let v = x.back { a.back = v }; if let v = x.text { a.text = v }
    return (PageText.answerOf(c) != PageText.answerOf(a) ? "Answer" : PageText.askOf(c) != PageText.askOf(a) ? "Question" : "Edit", PageText.askOf(a))
  }

  // ---------- sent ----------
  private func sentView(_ first: String) -> some View {
    VStack(spacing: 14) {
      VStack(spacing: 12) {
        Icon("check", 28, 2.4).foregroundStyle(t.invText).frame(width: 64, height: 64).background(Circle().fill(t.inv))
        Text(m.taken ? "It’s in the deck now." : "Sent. " + first + " will see it.").css(20, .semibold, ls: -0.01).multilineTextAlignment(.center)
          .accessibilityAddTraits(.isStaticText)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      Button { m.sent = false; m.err = ""; nav.close() } label: {
        Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .frame(maxHeight: .infinity)
  }

  // ---------- writing ----------
  @ViewBuilder private func editing(_ list: [SharedCard], step: String, card: SharedCard?, front: String, back: String, text: String, cloze: Bool, boxCard: Bool,
                                    drafts: [SuggestModel.Draft], current: SuggestModel.Draft?, all: [SuggestModel.Draft], first: String, p: PublicDeckPage?) -> some View {
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 14) {
        if step == "pick" || (step == "card" && card == nil) { picking(list) }
        if step == "card", let card { onCard(card, front: front, back: back, text: text, cloze: cloze, boxCard: boxCard, current: current) }
        if step == "new" { onNew(front: front, back: back, text: text, current: current) }
        if !drafts.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("Your changes · \(drafts.count)").css(13, .semibold).line(13)
            ForEach(Array(drafts.enumerated()), id: \.offset) { i, x in
              let v = draftWords(x, list)
              HStack(spacing: 10) {
                Text(v.label).css(12, .semibold).lineLimit(1).fixedSize().padding(.horizontal, 9).frame(height: 24).background(Capsule().fill(t.bg))
                Text(v.words).css(14).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                Button { var d = drafts; d.remove(at: i); m.drafts = d } label: {
                  Icon("close", 12, 2.4).foregroundStyle(t.muted).frame(width: 32, height: 32)
                }
                .buttonStyle(.press).accessibilityLabel("Take this change out")
              }
              .padding(.leading, 12).padding(.trailing, 6).frame(minHeight: 48)
              .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
            }
          }
        }
      }
      .padding(.horizontal, 0).padding(.vertical, 2)
    }
    .scrollDismissesKeyboard(.interactively)
    .frame(maxHeight: .infinity)
    VStack(alignment: .leading, spacing: 10) {
      TextField("", text: Binding(get: { m.why }, set: { m.why = $0.limited(280) }), prompt: Text("Why? (optional)").foregroundStyle(PLACEHOLDER))
        .font(.geist(16)).foregroundStyle(t.text).submitLabel(.done)
        .padding(.horizontal, 16).frame(height: 46).background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        .accessibilityLabel("Why?")
      if !m.err.isEmpty { CSSText(m.err, 13, color: t.again) }
      Button { send(all, p: p) } label: {
        Text(m.busy ? "Sending…" : "Send to " + first).css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48)
          .background(Capsule().fill(t.inv)).compositingGroup().opacity(all.isEmpty ? 0.4 : 1)
      }
      .buttonStyle(.press)
      .disabled(all.isEmpty || m.busy)
      .accessibilityLabel("Send to " + first)
    }
  }

  /// Find a card in the deck, or start a new one.
  private func picking(_ list: [SharedCard]) -> some View {
    let q = m.q.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let found = list.filter { q.isEmpty || (PageText.askOf($0) + " " + PageText.answerOf($0)).lowercased().contains(q) }.prefix(40)
    return VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 8) {
        HStack(spacing: 8) {
          Icon("search", 15).foregroundStyle(t.muted)
          TextField("", text: Binding(get: { m.q }, set: { m.q = $0 }), prompt: Text("Find a card to fix").foregroundStyle(t.muted))
            .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled()
            .accessibilityLabel("Find a card to fix")
        }
        .padding(.horizontal, 14).frame(height: 44).background(Capsule().fill(t.surf))
        Button { m.step = "new"; m.resetFields(); m.kind = "basic" } label: {
          HStack(spacing: 6) { Icon("plus", 15, 2.2); Text("New card").css(14, .semibold) }
            .foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 44).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press)
      }
      VStack(alignment: .leading, spacing: 0) {
        ForEach(Array(found), id: \.id) { c in
          let ask = PageText.askOf(c).nilIfEmpty ?? "Card", kind = PageText.kinds[c.kind] ?? "Card"
          Button { m.step = "card"; m.cardId = c.id; m.resetFields() } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(ask).css(14, .medium).lineLimit(1).line(14)
              Text(kind).css(12).foregroundStyle(t.muted).line(12)
            }
            .foregroundStyle(t.text).padding(.vertical, 11).padding(.horizontal, 2).frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 1)
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
            .contentShape(Rectangle())
          }
          .buttonStyle(.flat)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(ask + ", " + kind)
          .accessibilityAddTraits(.isButton)
        }
        if found.isEmpty { Text("No card has those words.").css(14).foregroundStyle(t.muted).padding(.vertical, 12).padding(.horizontal, 2) }
      }
    }
  }

  /// One card: fix its words, or take it out.
  private func onCard(_ card: SharedCard, front: String, back: String, text: String, cloze: Bool, boxCard: Bool, current: SuggestModel.Draft?) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 8) {
        backButton
        Text(PageText.kinds[card.kind] ?? "Card").css(13).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        Button { m.remove.toggle() } label: {
          Text("Remove this card").css(13, .semibold).lineLimit(1).foregroundStyle(m.remove ? Color.white : t.text)
            .padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(m.remove ? t.again : t.surf))
        }
        .buttonStyle(.press)
        .accessibilityAddTraits(m.remove ? .isSelected : [])
      }
      if m.remove {
        CSSText(PageText.wordsOf(card), 14, lh: 1.45, color: t.dark ? Color(hex: 0xFDA29B) : Color(hex: 0x912018), strike: true).frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16).padding(.vertical, 12)
          .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.againTint))
      } else {
        if cloze { field("Text", Binding(get: { text }, set: { m.text = $0 }), rows: 4) }
        else {
          field("Front", Binding(get: { front }, set: { m.front = $0 }), rows: 2)
          if !boxCard { field("Back", Binding(get: { back }, set: { m.back = $0 }), rows: 3) }
        }
      }
      addButton("Add this change", on: current != nil, add: current)
    }
  }

  /// A new card: basic, or a text with blanks.
  private func onNew(front: String, back: String, text: String, current: SuggestModel.Draft?) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 8) {
        backButton
        Text("New card").css(15, .semibold).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        Segmented(options: [("basic", "Basic"), ("cloze", "Fill in the blank")], current: m.kind, height: 30, size: 13, equal: false, pad: 3, gap: 2, hPad: 12) { m.kind = $0 }
          .fixedSize()
      }
      if m.kind == "cloze" { field("Text", Binding(get: { text }, set: { m.text = $0 }), rows: 4, placeholder: "The [[mitochondrion]] makes most of the cell’s ATP.") }
      else {
        field("Front", Binding(get: { front }, set: { m.front = $0 }), rows: 2, placeholder: "Question")
        field("Back", Binding(get: { back }, set: { m.back = $0 }), rows: 3, placeholder: "Answer")
      }
      addButton("Add this card", on: current != nil, add: current)
    }
  }

  private var backButton: some View {
    Button { m.step = "pick"; m.resetFields() } label: {
      Icon("back", 14, 2.2).foregroundStyle(t.text).frame(width: 32, height: 32).background(Circle().fill(t.surf))
    }
    .buttonStyle(.press).accessibilityLabel("Back to the cards")
  }

  private func addButton(_ label: String, on: Bool, add: SuggestModel.Draft?) -> some View {
    Button {
      guard let add else { return }
      m.drafts = (m.drafts ?? (store.demo && start == "new" ? [SuggestModel.Draft(op: "edit", card: "c2", front: "Which enzyme is the rate-limiting step of glycolysis?",
        back: "Phosphofructokinase-1 (PFK-1). Hexokinase starts glycolysis but does not limit its rate.")] : [])) + [add]
      m.step = "pick"; m.q = ""; m.resetFields()
    } label: {
      HStack(spacing: 8) { Icon("plus", 15, 2.2); Text(label).css(14, .semibold) }
        .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.surf)).compositingGroup().opacity(on ? 1 : 0.4)
    }
    .buttonStyle(.press)
    .disabled(!on)
    .accessibilityLabel(label)
  }

  /// A field for a card's words (SP_FIELD): its name, and a box `rows` lines tall.
  private func field(_ label: String, _ text: Binding<String>, rows: Int, placeholder: String = "") -> some View {
    // A phone's fields are 16px (web/app.html), on lines 1.45 times that.
    let extra = 16 * 1.45 - 16 * GEIST_LINE
    return VStack(alignment: .leading, spacing: 6) {
      Text(label).css(13, .semibold).line(13)
      TextField("", text: text, prompt: Text(placeholder).foregroundStyle(PLACEHOLDER), axis: .vertical)
        .lineLimit(rows, reservesSpace: true)
        .font(.geist(16)).foregroundStyle(t.text).lineSpacing(extra)
        // The box is `rows` lines of the board's 1.45 line height: SwiftUI's reserved lines leave the space between them out.
        .padding(.horizontal, 14).padding(.top, 12 + extra / 2).padding(.bottom, 12 + extra * CGFloat(rows) - extra / 2)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        .accessibilityLabel(label)
    }
  }

  // ---------- sending ----------
  private func send(_ all: [SuggestModel.Draft], p: PublicDeckPage?) {
    guard let p, !all.isEmpty, !m.busy else { return }
    m.busy = true; m.err = ""
    Task {
      do {
        let taken = try await store.sendSuggestion(p.id, all.map(\.json), message: m.why.trimmingCharacters(in: .whitespacesAndNewlines))
        m.busy = false; m.sent = true; m.taken = taken; m.drafts = []; m.step = "pick"; m.q = ""; m.why = ""; m.resetFields()
      } catch { m.busy = false; m.err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
}
