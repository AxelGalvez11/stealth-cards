// A theme's flashcard: the face (its color, edge, shadow, and what it draws behind the words) is a picture from the painter;
// the words stay the app's own, set the way the theme sets them (its type, weight, spacing, and ink), which the painter reads
// from the theme's own styles. Used by flashcards and by the question in Learn mode.
import SwiftUI

/// How the theme sets one kind of words on a card (the size, weight, spacing, and color the browser works out).
struct TypeStyle {
  var size: CGFloat = 16, weight = 400, ls: CGFloat = 0, ws: CGFloat = 0, lh: CGFloat = 0
  var color: RGBA? = nil
  var italic = false
  var family = ""
  init(_ d: [String: Any]) {
    size = d.num("size"); weight = (d["weight"] as? NSNumber)?.intValue ?? 400; ls = d.num("ls"); ws = d.num("ws"); lh = d.num("lh")
    color = (d["color"] as? String).flatMap { RGBA(css: $0) }
    italic = (d["style"] as? String) == "italic"
    family = d["family"] as? String ?? ""
  }
  /// The weight as SwiftUI names it.
  var fontWeight: Font.Weight { weight >= 700 ? .bold : weight >= 600 ? .semibold : weight >= 500 ? .medium : .regular }
}

/// What a theme says about its flashcard's face and words.
struct FaceSpec {
  var padding = UIEdgeInsets.zero
  var align = "left", family = ""
  var ink = RGBA(0x000000), muted = RGBA(0x666666), paper = RGBA(0xFFFFFF)
  var dark = false
  var fs: CGFloat = 1
  var radius: CGFloat = 0
  /// A blur (and saturation) of what's behind the card, like the web's backdrop-filter.
  var blur: CGFloat = 0, saturate: CGFloat = 1
  var type: [String: TypeStyle] = [:]
  init?(_ d: [String: Any]) {
    guard let p = d["padding"] as? [String: Any] else { return nil }
    padding = UIEdgeInsets(top: p.num("t"), left: p.num("l"), bottom: p.num("b"), right: p.num("r"))
    align = d["align"] as? String ?? "left"; family = d["family"] as? String ?? ""
    ink = (d["ink"] as? String).flatMap { RGBA(css: $0) } ?? ink; muted = (d["muted"] as? String).flatMap { RGBA(css: $0) } ?? muted; paper = (d["paper"] as? String).flatMap { RGBA(css: $0) } ?? paper
    dark = (d["dark"] as? NSNumber)?.boolValue ?? false
    fs = d.num("fs") == 0 ? 1 : d.num("fs"); radius = d.num("radius")
    if let b = d["backdrop"] as? String, !b.isEmpty {
      if let m = b.range(of: #"blur\(([\d.]+)px\)"#, options: .regularExpression) { blur = CGFloat(Double(b[m].dropFirst(5).dropLast(3)) ?? 0) }
      if let m = b.range(of: #"saturate\(([\d.]+)\)"#, options: .regularExpression) { saturate = CGFloat(Double(b[m].dropFirst(9).dropLast(1)) ?? 1) }
    }
    for (k, v) in (d["type"] as? [String: Any]) ?? [:] { if let v = v as? [String: Any] { type[k] = TypeStyle(v) } }
  }
  /// The colors inside the card: Lucida's light (or dark, on a dark card) with the theme's ink and muted color.
  var palette: Theme { Theme(dark: dark, gray: false, colors: (dark ? Generated.dark : Generated.light).with(text: ink, muted: muted)) }
  var textAlign: HorizontalAlignment { align == "center" ? .center : .leading }
}

extension Theme {
  /// The card's shadow as CSS.
  var shadowCSS: String {
    shadow.isEmpty ? "none" : shadow.map { "\($0.x)px \($0.y)px \($0.blur)px \($0.spread)px \($0.color.css)" }.joined(separator: ", ")
  }
  /// The app's own face for the painter (a themed face is drawn over it): the card's color and edge, and its ink.
  var faceBase: [String: Any] { ["card": colors.card.css, "line": colors.line.css, "shadow": shadowCSS, "text": colors.text.css] }
}

extension ThemeJob {
  /// How the app sets words on a card, for the painter to work out in the theme's style: [name, the app's own CSS, the
  /// theme's style goes on top].
  static let wordProbes: [[Any]] = [
    ["front", "font-size: calc(28px * var(--sk-fs, 1)); font-weight: 500; line-height: 1.25; letter-spacing: -.02em;", true],
    ["cloze", "font-size: calc(28px * var(--sk-fs, 1)); font-weight: 500; line-height: 1.45; letter-spacing: -.02em;", true],
    ["back", "font-size: calc(24px * var(--sk-fs, 1)); font-weight: 500; line-height: 1.3; letter-spacing: -.015em;", true],
    ["label", "font-size: 26px; font-weight: 600; letter-spacing: -.02em;", true],
    ["big", "font-size: 52px; font-weight: 600; letter-spacing: -.02em;", true],
    ["question", "font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -.025em;", true],
  ]
  /// What a theme says about its face (its padding, ink, and how it sets words): `at` is the size it's drawn for.
  static func faceSpec(_ theme: String, at: String, size: CGSize, basePad: String, radius: Int) -> ThemeJob {
    ThemeJob(theme: theme, kind: "facespec", fields: ["side": "front", "at": at, "w": Int(size.width.rounded()), "h": Int(size.height.rounded()), "radius": radius, "basePad": basePad,
                                                    "cp": Theme(dark: false).faceBase, "probes": wordProbes])
  }
  /// A face: its picture, with room around it for its shadow (up to `margins`, what's between it and the screen's edge).
  static func face(_ theme: String, side: String, at: String, size: CGSize, basePad: String, radius: Int, dark: Bool, margins: UIEdgeInsets) -> ThemeJob {
    ThemeJob(theme: theme, kind: "face", fields: ["side": side, "at": at, "w": Int(size.width.rounded()), "h": Int(size.height.rounded()), "radius": radius, "basePad": basePad,
                                                "cp": Theme(dark: dark).faceBase, "pad": ["t": Int(margins.top), "l": Int(margins.left), "b": Int(margins.bottom), "r": Int(margins.right)]])
  }
}

/// A face drawn for a theme: its spec, and (once made) its two pictures.
struct CardSkin {
  let skin: ThemeSkin
  let spec: FaceSpec
  let size: CGSize
  let front: ThemePic?, back: ThemePic?
  /// The bare background picture, for the blur behind a see-through card.
  let backdrop: UIImage?
  var pad: EdgeInsets { EdgeInsets(top: spec.padding.top, leading: spec.padding.left, bottom: spec.padding.bottom, trailing: spec.padding.right) }
}

extension ThemeArt {
  /// The theme's flashcard for a screen: how it sets words, and (as they're made) its faces. nil until the theme's details
  /// for it are known.
  func cardSkin(_ skin: ThemeSkin, at: String, size: CGSize, basePad: String, radius: Int, margins: UIEdgeInsets, gray: Bool) -> CardSkin? {
    guard let d = valueOf(.faceSpec(skin.key, at: at, size: size, basePad: basePad, radius: radius)), let spec = FaceSpec(d) else { return nil }
    // Its type has to be on the phone first (a moment the first time; Geist if it can't come).
    if ThemeFonts.shared.state(spec.type["front"]?.family ?? spec.family, spec: skin.spec.fonts) == .loading { return nil }
    let f = picture(.face(skin.key, side: "front", at: at, size: size, basePad: basePad, radius: radius, dark: spec.dark, margins: margins))
    let b = picture(.face(skin.key, side: "back", at: at, size: size, basePad: basePad, radius: radius, dark: spec.dark, margins: margins))
    let bg = spec.blur > 0 ? picture(.studyBg(skin, gray: gray))?.image : nil
    return CardSkin(skin: skin, spec: spec, size: size, front: f, back: b, backdrop: bg)
  }
}

// ---------- drawing a face ----------
/// The card's face behind its words: the picture (with its shadow around it), over a blur of the background when the theme's
/// card is see-through. Sits in a box the size of the card.
struct ThemedFace: View {
  let look: CardSkin
  let back: Bool
  /// Where the box is on the screen, so the blur shows what's behind it.
  let origin: CGPoint
  var body: some View {
    let pic = back ? look.back : look.front
    ZStack(alignment: .topLeading) {
      if let bg = look.backdrop, look.spec.blur > 0 {
        Image(uiImage: bg).resizable().frame(width: ThemeLayout.screen.width, height: ThemeLayout.screen.height)
          .blur(radius: look.spec.blur, opaque: true).saturation(look.spec.saturate)
          .offset(x: -origin.x, y: -origin.y)
          .frame(width: look.size.width, height: look.size.height, alignment: .topLeading)
          .clipShape(RoundedRectangle(cornerRadius: look.spec.radius, style: .continuous))
      }
      if let pic { pic.placed }
    }
    .frame(width: look.size.width, height: look.size.height, alignment: .topLeading)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// ---------- a card that fits its words (Learn mode's question) ----------
private struct NaturalHeight: PreferenceKey {
  static let defaultValue: CGFloat = 0
  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

/// The theme's flashcard behind a block of words that sets its own height (Learn mode's question): the face is made at the
/// block's height, rounded up to a multiple of 8 so one picture serves many questions. `content` gets the card's look (its
/// type, ink, and alignment) once it's known, and nil until then.
struct ThemedCard<Content: View>: View {
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  let skin: ThemeSkin
  var at = "learnPhone"
  var basePad = "20px"
  var radius = 24
  var margins = UIEdgeInsets(top: 90, left: 16, bottom: 60, right: 16)
  @ViewBuilder let content: (FaceSpec?) -> Content
  @State private var natural: CGFloat = 0
  private static var step: CGFloat { 8 }

  var body: some View {
    let _ = art.tick
    let width = ThemeLayout.screen.width - 32
    let spec = art.faceSpec(skin, at: at, basePad: basePad, radius: radius, fontsReady: true)
    let hq = natural > 0 ? (natural / Self.step).rounded(.up) * Self.step : 0
    let pad = spec.map { EdgeInsets(top: $0.padding.top, leading: $0.padding.left, bottom: $0.padding.bottom, trailing: $0.padding.right) } ?? EdgeInsets()
    let pic = spec != nil && hq > 0 ? art.picture(.face(skin.key, side: "front", at: at, size: CGSize(width: width, height: hq), basePad: basePad, radius: radius, dark: spec!.dark, margins: margins)) : nil
    content(spec)
      .padding(pad)
      .background(GeometryReader { g in Color.clear.preference(key: NaturalHeight.self, value: g.size.height) })
      .onPreferenceChange(NaturalHeight.self) { if abs($0 - natural) > 0.5 { natural = $0 } }
      .frame(minHeight: hq)
      .background(alignment: .topLeading) {
        if let pic, let spec {
          GeometryReader { g in
            ThemedFace(look: CardSkin(skin: skin, spec: spec, size: CGSize(width: width, height: hq), front: pic, back: nil, backdrop: nil), back: false, origin: g.frame(in: .global).origin)
          }
        }
      }
  }
}

extension ThemeArt {
  /// What a theme says about its face at a size, if it's kept (a card in Learn mode: its padding, ink, and type).
  func faceSpec(_ skin: ThemeSkin, at: String, basePad: String, radius: Int, fontsReady: Bool = false) -> FaceSpec? {
    guard let d = valueOf(.faceSpec(skin.key, at: at, size: CGSize(width: ThemeLayout.screen.width - 32, height: 200), basePad: basePad, radius: radius)), let spec = FaceSpec(d) else { return nil }
    if fontsReady, ThemeFonts.shared.state(spec.type["question"]?.family ?? spec.family, spec: skin.spec.fonts) == .loading { return nil }
    return spec
  }
}
