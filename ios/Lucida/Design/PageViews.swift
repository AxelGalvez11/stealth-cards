// Pieces a shared deck's page, its Suggestions, and its History share (design/build.mjs: WHO_AV, VER_AV, CHANGE_CARD, and
// the buttons under them): a round picture for a person or an AI app, a change with its words before and after, and the
// phone's share sheet.
import SwiftUI

/// WHO_AV: a person's round picture, or an AI app's spark (Claude's in its orange, the others in the page's black).
struct WhoAvatar: View {
  @Environment(\.theme) private var t
  let who: Who
  let size: CGFloat
  var body: some View {
    switch who {
    case .person(let p): PersonAvatar(p: p, size: size)
    case .ai(let name):
      let claude = PageText.isClaude(name)
      Icon("sparkle", (size * 0.56).rounded(), 2).foregroundStyle(claude ? Color.white : t.invText)
        .frame(width: size, height: size).background(Circle().fill(claude ? Color(hex: 0xD97757) : t.inv))
        .accessibilityElement(children: .ignore).accessibilityLabel(name)
    }
  }
}

/// VER_AV: a version's picture; one made with an AI app has that app's spark in its corner too.
struct VersionAvatar: View {
  @Environment(\.theme) private var t
  let v: PageText.Version
  let size: CGFloat
  var body: some View {
    let claude = PageText.isClaude(v.ai), s = size, b = (s * 0.58).rounded()
    ZStack(alignment: .bottomTrailing) {
      WhoAvatar(who: v.who, size: s)
      if v.withAI {
        Icon("sparkle", (s * 0.34).rounded(), 2.2).foregroundStyle(claude ? Color.white : t.invText)
          .frame(width: b, height: b).background(Circle().fill(claude ? Color(hex: 0xD97757) : t.inv))
          .overlay(Circle().strokeBorder(t.bg, lineWidth: 2).padding(-2))
          .offset(x: (s * 0.28).rounded(), y: 3)
      }
    }
  }
}

/// The two buttons under a change or a suggestion: Skip (gray) and Take it (black, with a check), each half the row.
struct TakeSkipButtons: View {
  @Environment(\.theme) private var t
  let skip: String, take: String
  var height: CGFloat = 44
  var size: CGFloat = 15
  /// The space between the check and Take it.
  var gap: CGFloat = 6
  let skipAction: () -> Void, takeAction: () -> Void
  var body: some View {
    HStack(spacing: 8) {
      Button(action: skipAction) {
        Text(skip).css(size, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: height).background(Capsule().fill(t.surf))
      }
      .buttonStyle(.press)
      Button(action: takeAction) {
        HStack(spacing: gap) { Icon("check", 16, 2.4); Text(take).css(size, .semibold) }
          .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: height).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
  }
}

/// CHANGE_CARD (phone): one change to a card: its kind, the card it's on, the words before (struck through, on light red)
/// and after (on light green), and, where someone decides, Skip and Take it (Toss and Keep for their AI's cards), or what
/// became of it.
struct ChangeCardView: View {
  @Environment(\.theme) private var t
  let label: String, context: String, before: String, after: String
  var state = ""
  var good = false
  var opacity = 1.0
  var decide: (skip: String, take: String, skipAction: () -> Void, takeAction: () -> Void)? = nil
  var body: some View {
    // The words' colors (the boards' `ink`), lighter in the dark.
    let bad = t.dark ? Color(hex: 0xFDA29B) : Color(hex: 0x912018), fine = t.dark ? Color(hex: 0x75E0A7) : Color(hex: 0x085D3A)
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 10) {
        Text(label).css(12, .semibold).lineLimit(1).fixedSize().padding(.horizontal, 9).frame(height: 24).background(Capsule().fill(t.surf))
        Text(context).css(13).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        if !state.isEmpty { Text(state).css(13, .semibold).foregroundStyle(good ? t.good : t.muted).lineLimit(1).fixedSize() }
      }
      .frame(minHeight: 32)
      if !before.isEmpty {
        CSSText(before, 14, lh: 1.45, color: bad, strike: true).frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16).padding(.vertical, 12)
          .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.againTint))
      }
      if !after.isEmpty {
        CSSText(after, 14, lh: 1.45, color: fine).frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16).padding(.vertical, 12)
          .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.goodTint))
      }
      if let d = decide { TakeSkipButtons(skip: d.skip, take: d.take, skipAction: d.skipAction, takeAction: d.takeAction) }
    }
    .padding(.horizontal, 16).padding(.vertical, 14)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.bg))
    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.line, lineWidth: 1))
    .opacity(opacity)
    .accessibilityElement(children: .contain)
  }
}

/// A gray pill (36 tall, 14px) that says what it does: See all, Show more, Go back to this version.
struct GrayPill: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var bg: Color? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) { if let icon { Icon(icon, 15, 2) }; Text(label).css(14, .semibold).lineLimit(1) }
        .foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(bg ?? t.surf))
    }
    .buttonStyle(.press)
  }
}

/// The phone's own share sheet (what the web's Share button opens on a phone).
enum ShareSheet {
  @MainActor static func present(title: String, url: URL?) {
    var items: [Any] = [title]
    if let url { items.append(url) }
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    guard var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController else { return }
    while let next = top.presentedViewController { top = next }
    let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
    vc.popoverPresentationController?.sourceView = top.view
    vc.popoverPresentationController?.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.maxY - 80, width: 1, height: 1)
    top.present(vc, animated: true)
  }
}
