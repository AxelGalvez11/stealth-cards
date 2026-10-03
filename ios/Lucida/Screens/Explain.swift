// Explain (PhoneReviewExplain, and under the "why" line in Learn mode): once a card is turned over or a question is
// answered, Lucida's AI can explain the answer. It shows only when the server has AI set up (or the card already has
// an explanation); it's written once and kept on the card, and Free gets a few a day. On a flashcard its button is round,
// in the top bar beside the review's settings (Review.swift), and in Learn mode the same one just after its gear (Learn.swift); the
// practice test's results use ExplainButton on each question.
// Under the explanation, a composer asks about the card (the owner, 2026-10-02: "add a chatcomposer so user can ask question"; the boards'
// design/chat.mjs): "Ask about this card" and a round Send. A question is a short bubble on the right and its answer comes under it in the
// explanation's own text style; each one is one of the day's explanations, and once they're used up the composer is the upgrade line. The
// conversation is never saved: closing the explanation forgets it. While it's being typed in, the composer sits on top of the keyboard (each
// screen makes room the way the Notes bar does: Review.swift, Learn.swift, PracticeTest.swift).
import SwiftUI

/// A card's explanation as a screen shows it (db.js explainOf), with the questions asked about it and, once the day's explanations are used
/// up, what shows in the composer's place.
struct ExplainVM {
  var on = false, text = "", busy = false, error = "", goPro = false, note = ""
  var turns: [ChatTurn] = []
  var limit: ExplainLimit? = nil
  var label: String { text.isEmpty ? "Explain" : "Explanation" }
}

/// One question asked about a card in Explain, and its answer (or what went wrong) once it comes.
struct ChatTurn: Identifiable, Equatable {
  let id = UUID()
  var q: String
  var a = "", busy = false, error = ""
}

/// The server's words for the day's explanations being used up (/api/state's explainLimit, or an answer's `limit`), and whether Go Pro helps.
struct ExplainLimit: Decodable, Equatable {
  var text = "", goPro = false
  enum CodingKeys: String, CodingKey { case text, goPro }
  init(text: String = "", goPro: Bool = false) { self.text = text; self.goPro = goPro }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); text = c.v(.text, ""); goPro = c.v(.goPro, false) }
  init?(_ any: Any?) { guard let o = any as? [String: Any], let t = o["text"] as? String, !t.isEmpty else { return nil }; text = t; goPro = o["goPro"] as? Bool == true }
}

extension Store {
  /// The canvas's sample explanations (design/build.mjs), for the design screens.
  static let demoExplain = (
    review: "It pumps protons (H⁺) out of the matrix into the space between the two membranes. That builds a gradient, like water held behind a dam, and ATP synthase uses the flow back in to make ATP. Remember it as pump uphill first, then cash in on the way down.",
    learn: "It drops. ATP synthase makes ATP only as protons flow back through it, down the gradient the electron transport chain built. A leak lets them slip back another way, so the gradient runs down and far less ATP gets made. Picture a dam with a hole in it: the water still falls, but the turbine barely turns.",
    type: "The Golgi apparatus takes proteins from the rough ER, finishes them with sugar tags, and ships them out in little bubbles called vesicles. Think of it as the cell’s post office: sort, label, send.")

  /// Whether a card can be explained, its explanation (without ** marks), how asking for one is going, and the questions asked about it.
  func explainOf(_ cardId: String) -> ExplainVM {
    guard let c = lib.cards.first(where: { $0.id == cardId }) else { return ExplainVM() }
    let text = (c.explain?.text ?? "").replacingOccurrences(of: "**", with: ""), err = explainErr[cardId]
    let note = text.isEmpty ? "" : aiLeftToday.map { $0 == 1 ? "1 free explanation left today" : "\($0) free explanations left today" } ?? ""
    return ExplainVM(on: lib.aiOn || !text.isEmpty, text: text, busy: explaining.contains(cardId), error: err?.error ?? "", goPro: err?.pro ?? false, note: note,
                     turns: chats[cardId] ?? [], limit: lib.explainLimit)
  }

  /// A design screen's explanation: the canvas's sample once it was asked for, and its sample question when the board shows one asked.
  func demoExplainOf(_ key: String, text: String, asked: Bool) -> ExplainVM {
    ExplainVM(on: true, text: asked ? text : "", note: asked ? "2 free explanations left today" : "", turns: chats[key] ?? [])
  }

  /// Asks Lucida's AI to explain a card (`question`: how Learn mode asked it, if it did). It's kept on the card, and on
  /// the other cards made from the same blanks (each box of a picture has its own answer, so its own explanation).
  func explain(_ cardId: String, question: String) async {
    guard !demo, let c = lib.cards.first(where: { $0.id == cardId }), !explaining.contains(cardId) else { return }
    explaining.insert(cardId); explainErr[cardId] = nil
    defer { explaining.remove(cardId) }
    do {
      let r = try await api.explain(cardId, question: question)
      if (200..<300).contains(r.status), let text = r.body["text"] as? String {
        for i in lib.cards.indices where c.group != nil && c.kind == "cloze" ? lib.cards[i].group == c.group : lib.cards[i].id == cardId {
          lib.cards[i].explain = Explanation(text: text, by: "Lucida")
        }
        aiLeftToday = r.body["free"] as? Bool == true ? r.body["left"] as? Int : nil
        if r.body.keys.contains("limit") { lib.explainLimit = ExplainLimit(r.body["limit"]) }
      } else {
        explainErr[cardId] = ((r.body["error"] as? String) ?? "Something went wrong. Try again.", r.body["pro"] as? Bool == true)
        if r.status == 402 { lib.explainLimit = ExplainLimit(text: explainErr[cardId]?.error ?? "", goPro: r.body["pro"] as? Bool == true) }
      }
    }
    catch APIError.signedOut { phase = .signedOut }
    catch { explainErr[cardId] = ("Couldn’t reach Lucida. Try again.", false) }
  }

  /// A question about a card (`question`: how Learn mode or the test asked it). It shows at once, waiting for its answer; the answer, or what
  /// went wrong, comes in under it. Each one is one of the day's explanations: when they're used up the question goes and the composer shows
  /// the server's words instead. The conversation so far goes with it (web/handler.mjs askReq keeps nothing). A design screen answers with
  /// the canvas's sample (`sample`).
  func followUp(_ cardId: String, q: String, question: String, sample: String = "") async {
    let words = String(q.trimmingCharacters(in: .whitespacesAndNewlines).prefix(500))
    guard !words.isEmpty, !(chats[cardId] ?? []).contains(where: { $0.busy }) else { return }
    if demo { chats[cardId, default: []].append(ChatTurn(q: words, a: sample)); return }
    guard lib.cards.contains(where: { $0.id == cardId }) else { return }
    let turns = (chats[cardId] ?? []).filter { !$0.a.isEmpty }.map { ["q": $0.q, "a": $0.a] }
    let turn = ChatTurn(q: words, busy: true)
    chats[cardId, default: []].append(turn)
    // (closed meanwhile: the answer has nowhere to go)
    func update(_ change: (inout ChatTurn) -> Void) { if let i = chats[cardId]?.firstIndex(where: { $0.id == turn.id }) { change(&chats[cardId]![i]) } }
    do {
      let r = try await api.explainAsk(cardId, q: words, turns: turns, question: question)
      if (200..<300).contains(r.status), let text = r.body["text"] as? String {
        update { $0.a = text.replacingOccurrences(of: "**", with: ""); $0.busy = false }
        aiLeftToday = r.body["free"] as? Bool == true ? r.body["left"] as? Int : nil
        if r.body.keys.contains("limit") { lib.explainLimit = ExplainLimit(r.body["limit"]) }
      } else if r.status == 402 {
        chats[cardId]?.removeAll { $0.id == turn.id }
        lib.explainLimit = ExplainLimit(text: (r.body["error"] as? String) ?? "That’s today’s free explanations.", goPro: r.body["pro"] as? Bool == true)
      } else {
        update { $0.error = (r.body["error"] as? String) ?? "Something went wrong. Try again."; $0.busy = false }
      }
    }
    catch APIError.signedOut { phase = .signedOut }
    catch { update { $0.error = "Couldn’t reach Lucida. Try again."; $0.busy = false } }
  }

  /// Closing the explanation (or the next card coming up, or leaving the page) forgets its conversation.
  func followUpClear(_ cardId: String) { if chats[cardId] != nil { chats[cardId] = nil } }
}

/// How Explain looks where it sits: on a flashcard (plain), or in Learn mode (its white cards with soft shadows). `fill` is the questions'
/// bubbles and the composer's field, `off` its Send button with nothing to send.
struct ExplainLook {
  var bg: Color, ink: Color, ink2: Color, closeBg: Color, btn: Color, btnFg: Color
  var shadow: LearnShadow? = nil
  var closeSize: CGFloat = 28, gap: CGFloat = 8, radius: CGFloat = 20
  var fill: Color = .clear, off: Color = .clear
  /// Review: the page's colors, the panel lifted over the card (at night the panel is the surface color, so the field is a step above it).
  static func card(_ t: Theme) -> ExplainLook {
    ExplainLook(bg: t.bg, ink: t.text, ink2: t.muted, closeBg: t.surf, btn: t.inv, btnFg: t.invText, fill: t.dark ? t.surf2 : t.surf, off: t.dark ? Color.white.opacity(0.12) : t.surf2)
  }
  /// Learn mode: its white cards (near-black at night).
  static func learn(_ k: LearnLook) -> ExplainLook {
    ExplainLook(bg: k.card, ink: k.ink, ink2: k.ink2, closeBg: k.track, btn: k.btn, btnFg: k.btnFg, shadow: k.shadow, closeSize: 26, gap: 6, radius: 18, fill: k.track, off: k.track)
  }
  /// The practice test's results: a light gray box in the question's row.
  static func test(_ t: Theme) -> ExplainLook {
    ExplainLook(bg: t.surf, ink: t.text, ink2: t.muted, closeBg: t.bg, btn: t.inv, btnFg: t.invText, closeSize: 28, gap: 6, radius: 16, fill: t.bg, off: t.surf2)
  }
}

/// The practice test's results' Explain on each question (a sparkle and "Explain", or "Explanation" once there is one).
struct ExplainButton: View {
  @Environment(\.theme) private var t
  let label: String
  var look: ExplainLook? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { Icon("sparkle", 14, 2); Text(label).css(13, .semibold) }
        .foregroundStyle(look?.ink ?? t.text)
        .padding(.leading, 12).padding(.trailing, 14).frame(height: 34)
        .background(Capsule().fill(look?.bg ?? t.surf).learnShadow(look?.shadow))
    }
    .buttonStyle(.press)
  }
}

/// The explanation: "Explained by AI" and a close button, then the text (or "Thinking…", or what went wrong with Go Pro when that would
/// help), the questions asked about it and how many free ones are left today, then the composer (or the upgrade line in its place). `cap`:
/// the most it may be (Review: the explanation and the questions then scroll inside it, the header and the composer staying); `fill`: it
/// takes all of `cap` (Review while a question is typed, so the composer sits on the keyboard); `pad`: its sides and top. `onFocus` says when
/// the composer has the keyboard; `ask` sends a question.
struct ExplainPanel: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let ex: ExplainVM
  let look: ExplainLook
  var size: CGFloat = 15
  var pad: (h: CGFloat, v: CGFloat) = (0, 0)
  var cap: CGFloat? = nil
  var fill = false
  var onFocus: (Bool) -> Void = { _ in }
  let close: () -> Void
  var ask: (String) -> Void = { _ in }
  var body: some View {
    let talk = !ex.text.isEmpty && !ex.busy, side = max(6, pad.h - 10)
    let core = VStack(alignment: .leading, spacing: 0) {
      header.padding(.horizontal, pad.h).padding(.top, pad.v)
      if cap != nil { ExplainScroll(fill: fill, last: ex.turns.last?.id) { words.padding(.horizontal, pad.h).padding(.vertical, look.gap) } }
      else { words.padding(.horizontal, pad.h).padding(.vertical, look.gap) }
      if talk {
        if let l = ex.limit { ExplainLimitLine(limit: l, look: look).padding(.horizontal, pad.h).padding(.bottom, pad.v) }
        else { ExplainComposer(look: look, busy: ex.turns.contains { $0.busy }, onFocus: onFocus, send: ask).padding(.horizontal, side).padding(.bottom, side) }
      } else { Color.clear.frame(height: max(0, pad.v - look.gap)) }
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Explanation")
    Group {
      if let cap, !fill { AtMost(height: cap) { core } }
      else { core.frame(maxHeight: fill ? .infinity : nil, alignment: .top) }
    }
  }

  private var header: some View {
    HStack(spacing: 8) {
      Icon("sparkle", 13, 2)
      Text("Explained by AI").css(12, .semibold).frame(maxWidth: .infinity, alignment: .leading)
      Button(action: close) {
        Icon("close", 10, 2.4).foregroundStyle(look.ink).frame(width: look.closeSize, height: look.closeSize).background(Circle().fill(look.closeBg))
      }
      .buttonStyle(.press)
      .accessibilityLabel("Close the explanation")
    }
    .foregroundStyle(look.ink2)
  }

  /// The explanation and the conversation (what scrolls in Review).
  private var words: some View {
    VStack(alignment: .leading, spacing: look.gap) {
      if ex.busy { Text("Thinking…").css(size).foregroundStyle(look.ink2) }
      if !ex.text.isEmpty && !ex.busy {
        LabelText(text: Rich.nsText([Rich.Run(t: ex.text, m: "")], size: size, weight: .regular, lh: 1.5, color: UIColor(look.ink), dark: t.dark))
      }
      if !ex.error.isEmpty && !ex.busy {
        Text(ex.error).css(14, lh: 1.4).foregroundStyle(t.again).fixedSize(horizontal: false, vertical: true)
        if ex.goPro {
          Button { nav.goPro() } label: {
            Text("Go Pro").css(13, .semibold).foregroundStyle(look.btnFg).padding(.horizontal, 16).frame(height: 34).background(Capsule().fill(look.btn))
          }
          .buttonStyle(.press)
        }
      }
      if !ex.turns.isEmpty { ExplainTurns(turns: ex.turns, look: look, size: size).padding(.top, 2) }
      if !ex.note.isEmpty && !ex.text.isEmpty && ex.limit == nil { Text(ex.note).css(12).foregroundStyle(look.ink2) }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// The explanation and the conversation in Review: as tall as they are, or scrolling in the room the header and the composer leave (all of it
/// while a question is typed), the newest question brought up.
private struct ExplainScroll<Content: View>: View {
  let fill: Bool
  let last: UUID?
  @ViewBuilder var content: Content
  var body: some View {
    ScrollViewReader { proxy in
      Group {
        if fill { ScrollView(showsIndicators: false) { content }.scrollDismissesKeyboard(.interactively) }
        else { ViewThatFits(in: .vertical) { content; ScrollView(showsIndicators: false) { content } } }
      }
      // (also when it opens with questions in it: a design screen, or the room changing while a question is typed)
      .onChange(of: last, initial: true) { _, id in
        guard let id else { return }
        let go = { var tx = Transaction(); tx.disablesAnimations = true; withTransaction(tx) { proxy.scrollTo(id, anchor: .top) } }
        DispatchQueue.main.async(execute: go)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: go)
      }
      .onChange(of: fill) { _, _ in if let id = last { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { var tx = Transaction(); tx.disablesAnimations = true; withTransaction(tx) { proxy.scrollTo(id, anchor: .top) } } } }
    }
  }
}

/// The questions asked and their answers: each question a short bubble on the right, its answer under it in the explanation's text style
/// ("Thinking…" while it's on its way, or what went wrong in Lucida's quiet line).
struct ExplainTurns: View {
  @Environment(\.theme) private var t
  let turns: [ChatTurn]
  let look: ExplainLook
  var size: CGFloat = 15
  var body: some View {
    VStack(alignment: .leading, spacing: look.gap + 6) {
      ForEach(turns) { turn in ExplainTurnRow(turn: turn, look: look, size: size).id(turn.id) }
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("askTurns")
  }
}

private struct ExplainTurnRow: View {
  @Environment(\.theme) private var t
  let turn: ChatTurn
  let look: ExplainLook
  let size: CGFloat
  var body: some View {
    VStack(alignment: .leading, spacing: look.gap) {
      HStack(spacing: 0) {
        Spacer(minLength: 40)
        Text(turn.q).css(15, lh: 1.4).foregroundStyle(look.ink).fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 14).padding(.vertical, 8)
          .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(look.fill))
          .accessibilityIdentifier("askQuestion")
      }
      if turn.busy { Text("Thinking…").css(size).foregroundStyle(look.ink2) }
      else if !turn.error.isEmpty { Text(turn.error).css(14, lh: 1.4).foregroundStyle(t.again).fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("askError") }
      else {
        LabelText(text: Rich.nsText([Rich.Run(t: turn.a, m: "")], size: size, weight: .regular, lh: 1.5, color: UIColor(look.ink), dark: t.dark))
          .accessibilityElement().accessibilityLabel(turn.a).accessibilityIdentifier("askAnswer")
      }
    }
  }
}

/// "Ask about this card" and a round Send (pale until there's a question): Return sends, and on a hardware keyboard Shift+Return is a new
/// line; the field grows to four lines, then scrolls. It keeps the keyboard after sending, for the next question.
struct ExplainComposer: View {
  let look: ExplainLook
  let busy: Bool
  var onFocus: (Bool) -> Void = { _ in }
  let send: (String) -> Void
  @State private var text = ""
  @State private var newline = false
  @FocusState private var focused: Bool
  var body: some View {
    let ready = !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !busy
    HStack(alignment: .bottom, spacing: 8) {
      TextField("", text: $text, prompt: Text("Ask about this card").foregroundStyle(look.ink2), axis: .vertical)
        .font(.geist(16)).foregroundStyle(look.ink).lineLimit(1...4)
        .padding(.vertical, 7)
        .submitLabel(.send)
        .focused($focused)
        .onChange(of: text) { old, new in typed(old, new) }
        .onKeyPress(.return, phases: .down) { press in
          if press.modifiers.contains(.shift) { newline = true; return .ignored }
          go(); return .handled
        }
        .accessibilityLabel("Ask about this card")
        .accessibilityIdentifier("askField")
      Button { go() } label: {
        Icon("arrowUp", 18, 2.2).foregroundStyle(ready ? look.btnFg : look.ink2).frame(width: 36, height: 36).background(Circle().fill(ready ? look.btn : look.off))
      }
      .buttonStyle(.press)
      .disabled(!ready)
      .accessibilityLabel("Send")
      .accessibilityIdentifier("askSend")
      .animation(.out(0.15), value: ready)
    }
    .padding(.leading, 16).padding(.trailing, 4).padding(.vertical, 4)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(look.fill))
    .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    .onTapGesture { focused = true }
    .onChange(of: focused) { _, on in onFocus(on) }
    .onDisappear { if focused { onFocus(false) } }
  }
  /// Return on the phone's keyboard comes in as a new line: it goes, and the question is sent (a new line typed with Shift stays).
  private func typed(_ old: String, _ new: String) {
    defer { newline = false }
    let a = Array(old), b = Array(new)
    guard !newline, b.filter({ $0 == "\n" }).count == a.filter({ $0 == "\n" }).count + 1 else { return }
    var i = 0
    while i < a.count && i < b.count && a[i] == b[i] { i += 1 }
    guard let at = b[i...].firstIndex(of: "\n") else { return }
    var c = b; c.remove(at: at)
    text = String(c)
    go()
  }
  private func go() {
    let words = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !words.isEmpty, !busy else { return }
    text = ""
    send(words)
  }
}

/// The upgrade line in the composer's place once the day's explanations are used up: the server's words, and Go Pro when it would help.
private struct ExplainLimitLine: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let limit: ExplainLimit
  let look: ExplainLook
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(limit.text).css(14, lh: 1.4).foregroundStyle(t.again).fixedSize(horizontal: false, vertical: true)
      if limit.goPro {
        Button { nav.goPro() } label: {
          Text("Go Pro").css(13, .semibold).foregroundStyle(look.btnFg).padding(.horizontal, 16).frame(height: 34).background(Capsule().fill(look.btn))
        }
        .buttonStyle(.press)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("askLimit")
  }
}

/// Its content at its own height, or scrolling once that's taller than `max` (like CSS max-height with overflow: auto).
struct CappedScroll<Content: View>: View {
  let max: CGFloat
  @ViewBuilder var content: Content
  var body: some View {
    AtMost(height: max) {
      ViewThatFits(in: .vertical) {
        content
        ScrollView(showsIndicators: false) { content }
      }
    }
  }
}

/// Offers its content no more than `height` and takes the content's own size (a frame(maxHeight:) would fill it).
private struct AtMost: Layout {
  let height: CGFloat
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    subviews.first?.sizeThatFits(ProposedViewSize(width: proposal.width, height: min(proposal.height ?? height, height))) ?? .zero
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}
