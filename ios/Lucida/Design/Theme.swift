// The look the canvas boards use: two themes (light and dark), Geist and Geist Mono, and a few helpers that let
// SwiftUI text sit the way CSS text does, so every screen can copy its board's sizes one for one.
import SwiftUI
import CoreText

/// An sRGB color, as the boards write them (#RRGGBB or rgba()).
struct RGBA: Hashable {
  var r: Double, g: Double, b: Double, a: Double
  init(_ hex: UInt32, a: Double = 1) {
    r = Double(hex >> 16 & 255) / 255; g = Double(hex >> 8 & 255) / 255; b = Double(hex & 255) / 255; self.a = a
  }
  /// rgba(r, g, b, a) with channels 0-255.
  init(r: Double, g: Double, b: Double, a: Double) { self.r = r / 255; self.g = g / 255; self.b = b / 255; self.a = a }
  init(unit r: Double, _ g: Double, _ b: Double, _ a: Double = 1) { self.r = r; self.g = g; self.b = b; self.a = a }
  static let clear = RGBA(unit: 0, 0, 0, 0)
  var color: Color { Color(.sRGB, red: r, green: g, blue: b, opacity: a) }
  func opacity(_ o: Double) -> RGBA { RGBA(unit: r, g, b, a * o) }
}

extension Color {
  init(hex: UInt32, opacity: Double = 1) { self = RGBA(hex, a: opacity).color }
}

/// The boards' theme(d): every color a screen uses.
struct ThemeColors {
  let bg, surf, surf2, line, text, muted, inv, invText, card: RGBA
  let again, hard, good, easy, againTint, goodTint, hardTint, dim: RGBA
}

/// The theme a screen draws with: `t.bg` is a Color, `t.dark` says which one.
@dynamicMemberLookup
struct Theme {
  let dark: Bool
  let colors: ThemeColors
  init(dark: Bool) { self.dark = dark; colors = dark ? Generated.dark : Generated.light }
  subscript(dynamicMember key: KeyPath<ThemeColors, RGBA>) -> Color { colors[keyPath: key].color }
  static let light = Theme(dark: false), darkTheme = Theme(dark: true)
}

private struct ThemeKey: EnvironmentKey { static let defaultValue = Theme.light }
extension EnvironmentValues {
  var theme: Theme { get { self[ThemeKey.self] } set { self[ThemeKey.self] = newValue } }
}

// ---------- type ----------
enum Fonts {
  /// Geist and Geist Mono ship with the app (SIL Open Font License, see Resources/Fonts/OFL.txt).
  static func register() {
    for name in ["Geist", "GeistMono"] {
      if let url = Bundle.main.url(forResource: name, withExtension: "ttf") { CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil) }
    }
  }
  static func name(_ weight: Font.Weight, mono: Bool) -> String {
    let w: String
    switch weight {
    case .bold, .heavy, .black: w = "Bold"
    case .semibold: w = "SemiBold"
    case .medium: w = "Medium"
    default: w = "Regular"
    }
    return (mono ? "GeistMono-" : "Geist-") + w
  }
}

extension Font {
  /// Geist at a fixed size, like the boards (px on the canvas = points here).
  static func geist(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .custom(Fonts.name(weight, mono: false), fixedSize: size) }
  static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .custom(Fonts.name(weight, mono: true), fixedSize: size) }
}

/// CSS weights as the boards write them.
extension Font.Weight {
  static func css(_ w: Int) -> Font.Weight { w >= 700 ? .bold : w >= 600 ? .semibold : w >= 500 ? .medium : .regular }
}

/// Geist's own line height: ascent 1.005 + descent 0.295 of the size (CSS "normal").
let GEIST_LINE: CGFloat = 1.3

extension View {
  /// Text set like CSS: `size` px Geist with letter-spacing in em and a line-height (a multiple of the size), including
  /// the half-leading CSS puts above the first line and below the last.
  func css(_ size: CGFloat, _ weight: Font.Weight = .regular, ls: CGFloat = 0, lh: CGFloat? = nil, mono: Bool = false) -> some View {
    let extra = lh.map { size * $0 - size * GEIST_LINE } ?? 0
    return self
      .font(mono ? .mono(size, weight) : .geist(size, weight))
      .tracking(ls * size)
      .lineSpacing(max(0, extra))
      .padding(.vertical, extra / 2)
  }
}

extension View {
  /// One line whose CSS line-height is `h` points (like line-height: 1): the text keeps its size, centered in that height.
  func lineBox(_ h: CGFloat) -> some View { fixedSize(horizontal: false, vertical: true).frame(height: h) }
}

extension Text {
  /// Letter-spacing in em, like the boards' letter-spacing.
  func em(_ ls: CGFloat, _ size: CGFloat) -> Text { tracking(ls * size) }
}

// ---------- motion ----------
/// Buttons press in to 96%, like the boards' `button:active` and `.sc-press`.
struct PressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.96 : 1)
      .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
      .contentShape(Rectangle())
  }
}
extension ButtonStyle where Self == PressStyle { static var press: PressStyle { PressStyle() } }

/// A button that looks exactly like its label, even when it's switched off (.plain fades a disabled button, which the
/// boards don't: an answered option or a matched tile keeps its own look).
struct FlatStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View { configuration.label.contentShape(Rectangle()) }
}
extension ButtonStyle where Self == FlatStyle { static var flat: FlatStyle { FlatStyle() } }

/// The boards' easings.
extension Animation {
  /// cubic-bezier(.2, .8, .2, 1)
  static func out(_ d: Double) -> Animation { .timingCurve(0.2, 0.8, 0.2, 1, duration: d) }
  /// cubic-bezier(.4, 0, .2, 1)
  static func std(_ d: Double) -> Animation { .timingCurve(0.4, 0, 0.2, 1, duration: d) }
}
