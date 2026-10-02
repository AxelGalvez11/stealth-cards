// Lucida's own question and message (design/ui.mjs askMarkup and toastMarkup, phone), never the system's alert or confirmation dialog (the owner,
// 2026-10-01: "i dont want anything that has ios or google default ui"). A question asks before something is deleted or left: a sheet from
// the bottom with a title, at most one short line, Cancel and the action (red when it deletes). A message is a quiet pill that comes in, stays
// a few seconds and goes (a save that failed, a picture that couldn't be used).
import SwiftUI

/// What a screen asks before it deletes or leaves something. `go` runs only when the answer is the action; Cancel, a tap outside and a swipe down
/// do nothing.
struct AskRequest: Identifiable {
  let id = UUID()
  var title: String
  /// At most one short line under the title.
  var line = ""
  var action: String
  /// The action is red (it deletes something).
  var danger = false
  let go: () -> Void
}

/// The question's sheet: a grabber, the title, its line, Cancel and the action.
struct QuestionSheet: View {
  @Environment(\.theme) private var t
  let q: AskRequest
  let close: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Grabber().frame(maxWidth: .infinity).accessibilityHidden(true)
      CSSText(q.title, 22, .semibold, lh: 1.2, color: t.text, ls: -0.02).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
      if !q.line.isEmpty { CSSText(q.line, 15, lh: 1.45, color: t.muted).frame(maxWidth: .infinity, alignment: .leading) }
      HStack(spacing: 10) {
        Button(action: close) {
          Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press).accessibilityIdentifier("question.cancel")
        Button { close(); q.go() } label: {
          Text(q.action).css(15, .semibold).foregroundStyle(q.danger ? t.again : t.invText).frame(maxWidth: .infinity).frame(height: 48)
            .background(Capsule().fill(q.danger ? t.againTint : t.inv))
        }
        .buttonStyle(.press).accessibilityIdentifier("question.go")
      }
      .padding(.top, 6)
    }
    .foregroundStyle(t.text)
    .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
    // VoiceOver reads only the question while it is up.
    .accessibilityElement(children: .contain).accessibilityAddTraits(.isModal)
  }
}

/// The question over everything (MainView): the page dims, the sheet comes up from the bottom, and a tap outside closes it.
struct QuestionHost: View {
  @EnvironmentObject private var nav: Nav
  let request: AskRequest
  var body: some View {
    SheetOverlay(top: nil, radius: 32, close: shut) { QuestionSheet(q: request, close: shut) }
  }
  private func shut() { nav.dismissQuestion() }
}

/// A message over everything (RootView): the store's `error`, in a quiet pill near the bottom, over the tab bar. It stays about five seconds, or until
/// it is tapped; VoiceOver says it when it comes.
struct ToastHost: View {
  @Environment(\.theme) private var t
  let text: String
  let close: () -> Void
  var body: some View {
    VStack {
      Spacer()
      Button(action: close) {
        Text(text).css(14, .medium, lh: 1.35).foregroundStyle(t.invText).multilineTextAlignment(.center)
          .padding(.horizontal, 18).padding(.vertical, 12).frame(maxWidth: 420)
          .background(Capsule().fill(t.inv).shadow(color: .black.opacity(0.22), radius: 14, x: 0, y: 8))
      }
      .buttonStyle(.plain)
      .padding(.horizontal, 16).padding(.bottom, 104)
      .accessibilityLabel(text).accessibilityHint("Dismiss").accessibilityIdentifier("toast")
      .popTransition()
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .task(id: text) {
      UIAccessibility.post(notification: .announcement, argument: text)
      try? await Task.sleep(nanoseconds: 5_200_000_000)
      if !Task.isCancelled { close() }
    }
  }
}

extension Nav {
  /// Asks a question in Lucida's own sheet; `go` runs if the answer is the action.
  func ask(_ title: String, line: String = "", action: String, danger: Bool = false, go: @escaping () -> Void) {
    withAnimation(Motion.sheet) { question = AskRequest(title: title, line: line, action: action, danger: danger, go: go) }
  }
  func dismissQuestion() { withAnimation(Motion.leave) { question = nil } }
}

/// The questions as the boards' `ask` Tweak shows them on a design screen (`-ask "Delete deck"`, design/ui.mjs ASK_SAMPLES): the same words.
enum AskSample {
  static func request(_ name: String) -> AskRequest? {
    let list: [String: (String, String, String, Bool)] = [
      "Delete deck": ("Delete “Cell Biology”?", "Its 412 cards go too. This can’t be undone.", "Delete deck", true),
      "Remove from library": ("Remove “MCAT Biochemistry” from your library?", "Your progress on it goes too.", "Remove", true),
      "Remove folder": ("Remove the folder “Languages”?", "Its decks stay in your library.", "Remove folder", true),
      "Delete card": ("Delete this card?", "", "Delete card", true),
      "Leave without saving": ("Leave anyway?", "Your new card isn’t finished, so it won’t be added.", "Leave", false),
      "Sign out": ("Sign out of Lucida?", "", "Sign out", false),
      "Delete source": ("Delete “Lecture 4 · Sep 21”?", "Its file goes. The 18 cards made from it stay in the deck.", "Delete", true),
      "Delete page": ("Delete the page “Lecture 3 summary”?", "", "Delete page", true),
      "Disconnect app": ("Disconnect Claude?", "It can’t use your decks until you connect it again.", "Disconnect", false),
      "New link": ("Make a new link?", "AI apps using the old one stop working until you give them the new one.", "Make a new link", false),
      "Leave class": ("Leave “BIO 201”?", "The decks you study from it stay in your library.", "Leave class", false),
      "Delete class": ("Delete “BIO 201”?", "Everyone in it keeps the decks they study.", "Delete class", true),
      "Take out of class": ("Take Sam Rivera out of the class?", "", "Take out", false)]
    guard let (title, line, action, danger) = list[name] else { return nil }
    return AskRequest(title: title, line: line, action: action, danger: danger, go: {})
  }
}
