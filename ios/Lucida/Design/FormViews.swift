// Small pieces the sheets share (Report, Get verified, Delete account, Go Pro), as the canvas draws them (design/build.mjs closeX, cField,
// errLine), and the Library's switch (libModes).
import SwiftUI

/// closeX: a 36-point gray circle with an X.
struct CloseX: View {
  @Environment(\.theme) private var t
  let action: () -> Void
  var body: some View {
    Button(action: action) { Icon("close", 14, 2.2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel("Close")
  }
}

/// cField: a 50-tall gray field with an icon, for the sheets (`mono`: big spaced capitals). A hint that's longer than the field is
/// cut off at its edge, like the browser cuts it (not ended with …).
struct IconField: View {
  @Environment(\.theme) private var t
  let text: Binding<String>
  let placeholder: String
  let label: String
  var icon: String? = nil
  var mono = false
  var max = 200
  var caps: TextInputAutocapitalization = .sentences
  var focus: FocusState<Bool>.Binding? = nil
  var submit: () -> Void = {}
  var body: some View {
    HStack(spacing: 10) {
      if let icon { Icon(icon, 18, 1.8).foregroundStyle(t.muted) }
      // The browser's input has 2 points of its own on the sides. The hint is drawn over the field, and cut at its edge (a
      // long one drawn in the layout would widen the page).
      field
        .padding(.horizontal, 2)
        .overlay {
          if text.wrappedValue.isEmpty {
            Color.clear.overlay(alignment: .leading) {
              Text(placeholder).font(mono ? .mono(20) : .geist(16)).tracking(mono ? 0.18 * 20 : 0).foregroundStyle(PLACEHOLDER)
                .lineLimit(1).fixedSize(horizontal: true, vertical: false).padding(.leading, 2)
            }
            .mask(Rectangle().padding(.trailing, 2)).allowsHitTesting(false).accessibilityHidden(true)
          }
        }
        .foregroundStyle(t.text).tint(t.text)
    }
    .padding(.horizontal, 16).frame(height: 50)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
  }
  @ViewBuilder private var field: some View {
    let f = TextField("", text: text)
      .textInputAutocapitalization(caps).autocorrectionDisabled()
      .submitLabel(.done).onSubmit(submit)
      .onChange(of: text.wrappedValue) { _, v in if v.utf16.count > max { text.wrappedValue = v.limited(max) } }
      .accessibilityLabel(label)
    let styled = mono ? f.font(.mono(20)).tracking(0.18 * 20) : f.font(.geist(16)).tracking(0)
    if let focus { styled.focused(focus) } else { styled }
  }
}

/// errLine: a problem in the server's own words (13px, red).
struct ErrLine: View {
  @Environment(\.theme) private var t
  let text: String
  var body: some View {
    if !text.isEmpty { CSSText(text, 13, lh: 1.4, color: t.again).accessibilityAddTraits(.isStaticText) }
  }
}

/// The Library's switch: Decks and All cards (libModes, 36 tall, 14px, the two sharing the width).
struct LibraryModes: View {
  @EnvironmentObject private var nav: Nav
  let current: String
  /// Something the Library closes when the view changes (an open menu).
  var picked: () -> Void = {}
  var body: some View {
    Segmented(options: [("decks", "Decks"), ("cards", "All cards")], current: current, height: 36, size: 14, gap: 2, hPad: 16) { id in
      picked(); nav.libCards = id == "cards"
    }
  }
}
