// The pieces the classes' pages share, as the canvas draws them (design/build.mjs "Classes": CLASS_TILE, GLASS_CHIP, cBtn,
// dangerBtn, closeX, cField, errLine, twoBtns, and the little "not there" and "nothing here" boxes).
import SwiftUI

/// A small badge on a gradient (GLASS_CHIP): 24 tall, dark glass, white 11px words, an optional shield.
struct GlassChip: View {
  let text: String
  var shield = false
  var body: some View {
    HStack(spacing: 5) {
      if shield { Icon("shield", 12, 2) }
      Text(text).css(11, .semibold).lineLimit(1)
    }
    .foregroundStyle(.white)
    .padding(.horizontal, 9).frame(height: 24)
    .background(Capsule().fill(Color.black.opacity(0.28)))
  }
}

/// cBtn: a round button, 36 tall (44 on the class page's own cards), on the page's color (`bg`; the usual gray wouldn't
/// show on a gray card), or black. `wide`: as wide as its column; `grow`: shares its row.
struct ClassButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var inv = false
  var height: CGFloat = 36
  var bg: Color? = nil
  var wide = false
  var enabled = true
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) {
        if let icon { Icon(icon, 15, 2) }
        Text(label).css(height >= 44 ? 15 : 14, .semibold).lineLimit(1)
      }
      .foregroundStyle(inv ? t.invText : t.text)
      .padding(.horizontal, height >= 44 ? 20 : 14)
      .frame(maxWidth: wide ? .infinity : nil)
      .frame(height: height)
      .background(Capsule().fill(inv ? t.inv : bg ?? t.bg))
    }
    .buttonStyle(.press)
    .disabled(!enabled)
  }
}

/// dangerBtn: a 34-tall pink pill with red words (Delete class, Leave class).
struct DangerButton: View {
  @Environment(\.theme) private var t
  let label: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(label).css(13, .semibold).foregroundStyle(t.again).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.againTint))
    }
    .buttonStyle(.press)
  }
}

/// closeX: a 36-point gray circle with an X.
struct CloseX: View {
  @Environment(\.theme) private var t
  let action: () -> Void
  var body: some View {
    Button(action: action) { Icon("close", 14, 2.2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel("Close")
  }
}

/// libRound: a 40-point circle with an 18px icon, gray or black.
struct LibRound: View {
  @Environment(\.theme) private var t
  let icon: String, label: String
  var inv = false
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Icon(icon, 18, 2).foregroundStyle(inv ? t.invText : t.text).frame(width: 40, height: 40).background(Circle().fill(inv ? t.inv : t.surf))
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
}

/// cField: a 50-tall gray field with an icon, for the class popups and sheets (`mono`: the code's big spaced capitals).
struct ClassField: View {
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
      field
        .foregroundStyle(t.text).tint(t.text)
        .textInputAutocapitalization(caps).autocorrectionDisabled()
        .submitLabel(.done).onSubmit(submit)
        .onChange(of: text.wrappedValue) { _, v in if v.utf16.count > max { text.wrappedValue = v.limited(max) } }
        .accessibilityLabel(label)
    }
    .padding(.horizontal, 16).frame(height: 50)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
  }
  @ViewBuilder private var field: some View {
    let f = TextField("", text: text, prompt: Text(placeholder).foregroundStyle(PLACEHOLDER))
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

/// CLASS_ERR: what went wrong on a class's page, in a pink box.
struct ClassErrBox: View {
  @Environment(\.theme) private var t
  let text: String
  var body: some View {
    if !text.isEmpty {
      CSSText(text, 14, color: t.again)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.againTint))
        .accessibilityElement(children: .combine)
    }
  }
}

/// The Library's switch: Decks, All cards, Classes (libModes, 36 tall, 14px, the three sharing the width).
struct LibraryModes: View {
  @EnvironmentObject private var nav: Nav
  let current: String
  /// Something the Library closes when the view changes (an open menu).
  var picked: () -> Void = {}
  var body: some View {
    Segmented(options: [("decks", "Decks"), ("cards", "All cards"), ("classes", "Classes")], current: current, height: 36, size: 14, gap: 2, hPad: 16) { id in
      picked(); nav.libCards = id == "cards"; nav.libClasses = id == "classes"
    }
  }
}
