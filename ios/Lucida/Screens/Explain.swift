// Explain (PhoneReviewExplain, and under the "why" line in Learn mode): once a card is turned over or a question is
// answered, Lucida's AI can explain the answer. It shows only when the server has AI set up (or the card already has
// an explanation); it's written once and kept on the card, and Free gets a few a day.
import SwiftUI

/// A card's explanation as a screen shows it (db.js explainOf).
struct ExplainVM {
  var on = false, text = "", busy = false, error = "", goPro = false, note = ""
  var label: String { text.isEmpty ? "Explain" : "Explanation" }
}

extension Store {
  /// The canvas's sample explanations (design/build.mjs), for the design screens.
  static let demoExplain = (
    review: "It pumps protons (H⁺) out of the matrix into the space between the two membranes. That builds a gradient, like water held behind a dam, and ATP synthase uses the flow back in to make ATP. Remember it as pump uphill first, then cash in on the way down.",
    learn: "It drops. ATP synthase makes ATP only as protons flow back through it, down the gradient the electron transport chain built. A leak lets them slip back another way, so the gradient runs down and far less ATP gets made. Picture a dam with a hole in it: the water still falls, but the turbine barely turns.",
    type: "The Golgi apparatus takes proteins from the rough ER, finishes them with sugar tags, and ships them out in little bubbles called vesicles. Think of it as the cell’s post office: sort, label, send.")

  /// Whether a card can be explained, its explanation (without ** marks), and how asking for one is going.
  func explainOf(_ cardId: String) -> ExplainVM {
    guard let c = lib.cards.first(where: { $0.id == cardId }) else { return ExplainVM() }
    let text = (c.explain?.text ?? "").replacingOccurrences(of: "**", with: ""), err = explainErr[cardId]
    let note = text.isEmpty ? "" : aiLeftToday.map { $0 == 1 ? "1 free explanation left today" : "\($0) free explanations left today" } ?? ""
    return ExplainVM(on: lib.aiOn || !text.isEmpty, text: text, busy: explaining.contains(cardId), error: err?.error ?? "", goPro: err?.pro ?? false, note: note)
  }

  /// Asks Lucida's AI to explain a card (`question`: how Learn mode asked it, if it did). It's kept on the card, and on
  /// the other cards made from the same blanks.
  func explain(_ cardId: String, question: String) async {
    guard !demo, let c = lib.cards.first(where: { $0.id == cardId }), !explaining.contains(cardId) else { return }
    explaining.insert(cardId); explainErr[cardId] = nil
    defer { explaining.remove(cardId) }
    do {
      let r = try await api.explain(cardId, question: question)
      if (200..<300).contains(r.status), let text = r.body["text"] as? String {
        for i in lib.cards.indices where c.group != nil ? lib.cards[i].group == c.group : lib.cards[i].id == cardId {
          lib.cards[i].explain = Explanation(text: text, by: "Lucida")
        }
        aiLeftToday = r.body["free"] as? Bool == true ? r.body["left"] as? Int : nil
      } else {
        explainErr[cardId] = ((r.body["error"] as? String) ?? "Something went wrong. Try again.", r.body["pro"] as? Bool == true)
      }
    }
    catch APIError.signedOut { phase = .signedOut }
    catch { explainErr[cardId] = ("Couldn’t reach Lucida. Try again.", false) }
  }
}

/// How Explain looks where it sits: on a flashcard (plain), or in Learn mode (its white cards with soft shadows).
struct ExplainLook {
  var bg: Color, ink: Color, ink2: Color, closeBg: Color, btn: Color, btnFg: Color
  var shadow: LearnShadow? = nil
  var closeSize: CGFloat = 28, gap: CGFloat = 8, radius: CGFloat = 20
  /// Review: the page's colors, the panel lifted over the card.
  static func card(_ t: Theme) -> ExplainLook { ExplainLook(bg: t.bg, ink: t.text, ink2: t.muted, closeBg: t.surf, btn: t.inv, btnFg: t.invText) }
  /// Learn mode: its white cards (near-black at night).
  static func learn(_ k: LearnLook) -> ExplainLook {
    ExplainLook(bg: k.card, ink: k.ink, ink2: k.ink2, closeBg: k.track, btn: k.btn, btnFg: k.btnFg, shadow: k.shadow, closeSize: 26, gap: 6, radius: 18)
  }
}

/// The Explain button (a sparkle and "Explain", or "Explanation" once there is one).
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

/// The explanation: "Explained by AI" and a close button, then the text (or "Thinking…", or what went wrong with Go Pro
/// when that would help), and how many free ones are left today.
struct ExplainPanel: View {
  @Environment(\.theme) private var t
  let ex: ExplainVM
  let look: ExplainLook
  var size: CGFloat = 15
  let close: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: look.gap) {
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
      if ex.busy { Text("Thinking…").css(size).foregroundStyle(look.ink2) }
      if !ex.text.isEmpty && !ex.busy {
        LabelText(text: Rich.nsText([Rich.Run(t: ex.text, m: "")], size: size, weight: .regular, lh: 1.5, color: UIColor(look.ink), dark: t.dark))
      }
      if !ex.error.isEmpty && !ex.busy {
        Text(ex.error).css(14, lh: 1.4).foregroundStyle(t.again).fixedSize(horizontal: false, vertical: true)
        if ex.goPro {
          Button { UIApplication.shared.open(API.pro) } label: {
            Text("Go Pro").css(13, .semibold).foregroundStyle(look.btnFg).padding(.horizontal, 16).frame(height: 34).background(Capsule().fill(look.btn))
          }
          .buttonStyle(.press)
        }
      }
      if !ex.note.isEmpty && !ex.text.isEmpty { Text(ex.note).css(12).foregroundStyle(look.ink2) }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Explanation")
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
