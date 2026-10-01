// iPhone · The questions of Delete account (PhoneSettingsDelete) and Block (PhoneProfileBlock): what it does, in plain words, then
// Cancel and a red answer. If the server says no (Pro to cancel first, say), its words show under the text and the question
// stays; while it works the answer says so and the sheet can't be dismissed.
import SwiftUI

/// A question with a red answer: its title, the words under it, the server's words when it won't, Cancel, and the red button.
struct DangerSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let title: String
  let words: [String]
  let err: String
  let action: String
  let busy: Bool
  let go: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 12) {
        CSSText(title, 22, .semibold, lh: 1.2, color: t.text, ls: -0.02).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        CloseX(action: { if !busy { nav.close() } })
      }
      VStack(alignment: .leading, spacing: 10) {
        ForEach(Array(words.enumerated()), id: \.offset) { _, w in CSSText(w, 14, lh: 1.45, color: t.muted) }
      }
      ErrLine(text: err)
      HStack(spacing: 10) {
        Button(action: { if !busy { nav.close() } }) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press).accessibilityIdentifier("danger.cancel")
        Button(action: { if !busy { go() } }) {
          Text(action).css(15, .semibold).foregroundStyle(busy ? t.muted : t.again).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(busy ? t.surf2 : t.againTint))
        }
        .buttonStyle(.press)
        .accessibilityAddTraits(busy ? .isStaticText : []).accessibilityIdentifier("danger.go")
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
  }
}

/// Delete your account? What goes, what happens to Pro (Stripe's is cancelled with the account; Apple's can only be stopped in
/// iPhone Settings), and a red Delete account.
struct DeleteAccountSheet: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var busy = false
  @State private var err = ""

  /// What it says: what goes, and what happens to Pro (the words follow who bills it).
  private var words: [String] {
    let plan = store.plan
    var w = ["This deletes your decks, cards, and reviews, your profile, and the decks you shared. It can’t be undone."]
    if plan.pro && plan.by != "apple" { w.append("Your Lucida Pro subscription will be cancelled.") }
    if plan.pro && plan.by == "apple" { w.append("You pay for Lucida Pro through Apple, and deleting your account doesn’t cancel it. To stop it, open Settings on your iPhone, tap your name, then Subscriptions.") }
    return w
  }

  var body: some View {
    // (The board's states: waiting, and the server's words when Pro has to be cancelled first.)
    let demo = store.demo, want = store.props.deleteOpen
    let shownBusy = busy || (demo && want == "Deleting")
    let shownErr = !err.isEmpty ? err : demo && want == "Failed" ? "Cancel Pro first: open Manage plan in Settings, cancel, then delete your account." : ""
    DangerSheet(title: "Delete your account?", words: words, err: shownErr, action: shownBusy ? "Deleting…" : "Delete account", busy: shownBusy) { delete() }
      .onChange(of: busy) { _, b in nav.asking = b }
  }

  private func delete() {
    err = ""; busy = true
    Task {
      do { try await store.deleteAccount(); busy = false; nav.close() }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}

/// Block <name>? They can't follow you or suggest changes to your decks, and you won't see their decks.
struct BlockSheet: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let handle: String, name: String
  @State private var busy = false
  @State private var err = ""

  var body: some View {
    DangerSheet(title: "Block \(name)?", words: ["They won’t be able to follow you or suggest changes to your decks, and you won’t see their decks. You can unblock them in Settings."],
                err: err, action: busy ? "Blocking…" : "Block", busy: busy) { block() }
      .onChange(of: busy) { _, b in nav.asking = b }
  }

  /// Blocks them: on their profile it shows at once (their page comes without decks); anywhere else it's the same call.
  private func block() {
    err = ""; busy = true
    Task {
      do {
        try await store.changeProfile(handle.lowercased(), ProfilePatch(following: false, blocked: true, unblocking: false)) { try await store.block(handle, true) }
        busy = false; nav.close()
      } catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}
