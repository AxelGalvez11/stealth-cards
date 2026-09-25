// Study backgrounds (design/build.mjs STUDY_BG_JS and studyBgLayer): what shows behind Learn mode and flashcards. By
// default it's the deck's own gradient, nearly gray with a faint hint of its colors (near-black at night, under a gray
// wash in gray dark mode), under film grain; or, picked in the deck's settings, a plain page, the sky, the sunset, or a
// photo, softened so the words stay easy to read.
import SwiftUI

/// A deck's study background, worked out: which kind, the deck's gradient, and its photo.
struct StudyBg {
  var kind = "deck"
  var mesh: Mesh
  var photo: String? = nil
  /// The canvas's placeholder photo: the deck's colors at full strength stand in for it.
  var sample = false
}

extension Store {
  /// What shows behind studying a deck: its own choice, or its colors when there's none (or Photo with no photo). A deck's
  /// header photo counts as its photo.
  func studyBg(_ deckId: String?) -> StudyBg {
    let d: (seed: String, round: Int, style: String?, image: String?, bg: DeckBg)
    if demo { let e = demoDeck; d = ("Cell Biology", e.round, e.style ?? "mix", e.image, e.bg) }
    else if let x = engine.deck(deckId) { d = (x.cover.seed ?? x.name, x.cover.round, x.cover.style, x.cover.image, x.bg) }
    else { d = ("Lucida", 0, "mix", nil, DeckBg()) }
    let img = (d.bg.image ?? d.image).flatMap { $0.isEmpty ? nil : $0 }
    let kind = ["deck", "plain", "sky", "sunset", "photo"].contains(d.bg.kind) && !(d.bg.kind == "photo" && img == nil) ? d.bg.kind : "deck"
    let photo = kind == "photo" && img != "mock" ? img : nil
    return StudyBg(kind: kind, mesh: Mesh.deck(seed: d.seed, round: d.round, style: d.style), photo: photo, sample: kind == "photo" && photo == nil)
  }
}

/// The layer behind everything on a study page, filling the screen.
struct StudyBackground: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  let bg: StudyBg

  var body: some View {
    let faint = bg.kind == "deck"
    ZStack {
      t.bg
      if faint || bg.sample {
        // The gradient reaches a little past the page (inset -4%), like the canvas's.
        MeshFill(mesh: faint ? bg.mesh.filtered(saturate: 0.16, brightness: t.gray ? 0.34 : t.dark ? 0.42 : 1.15) : bg.mesh, grain: 0).scaleEffect(1.08)
      }
      if let p = bg.photo { FillPhoto(url: store.api.mediaURL(p)) }
      if bg.kind == "sky" { SkyLayer(height: 700).frame(maxHeight: .infinity, alignment: .top) }
      if bg.kind == "sunset" { SunsetFill(dark: t.dark, gray: t.gray) }
      veil
      if faint || bg.sample || bg.kind == "sunset" { GrainLayer(opacity: 0.55) }
    }
    .compositingGroup()
    .ignoresSafeArea()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// A white wash (a black one at night, a gray one in gray dark mode) over the colors or the photo.
  private var veil: Color {
    let gray = Color(hex: 0x1E1E20)
    if bg.kind == "deck" { return t.gray ? gray.opacity(0.45) : t.dark ? .black.opacity(0.3) : .white.opacity(0.6) }
    if bg.photo != nil || bg.sample { return t.gray ? gray.opacity(0.55) : t.dark ? .black.opacity(0.5) : .white.opacity(0.38) }
    return .clear
  }
}

/// Film grain over a whole page (the canvas's grain in overlay).
struct GrainLayer: View {
  var opacity: Double
  var body: some View {
    if let g = Grain.image { Image(decorative: g, scale: 3).resizable(resizingMode: .tile).opacity(opacity).blendMode(.overlay) }
  }
}

/// The faint sunset (SUNSET_BG, SUNSET_NIGHT at night, or SUNSET_DUSK in gray dark mode): a soft fade from blue-gray down
/// to peach, with a warm glow low on the right.
struct SunsetFill: View {
  let dark: Bool
  var gray = false
  var body: some View {
    let fade: [(UInt32, Double)] = dark && gray ? [(0x1F2638, 0), (0x272C40, 0.35), (0x332C3F, 0.65), (0x3E2E37, 1)]
                                 : dark ? [(0x0C1426, 0), (0x151B31, 0.35), (0x231C2E, 0.65), (0x2E1D25, 1)]
                                        : [(0xC3D3E3, 0), (0xD3DBE6, 0.30), (0xE6DDE4, 0.52), (0xF2DCD8, 0.72), (0xF5CFC2, 1)]
    let glow = Color(.sRGB, red: 238 / 255, green: 142 / 255, blue: 98 / 255, opacity: dark && gray ? 0.18 : dark ? 0.16 : 0.22)
    Canvas { ctx, size in
      ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(Gradient(stops: fade.map { .init(color: Color(hex: $0.0), location: $0.1) }),
                                                                             startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
      // radial-gradient(90% 60% at 88% 100%, glow, transparent 70%): an ellipse 90% of the width wide and 60% of the height tall.
      let rx = size.width * 0.9, ry = size.height * 0.6
      ctx.translateBy(x: size.width * 0.88, y: size.height)
      ctx.scaleBy(x: 1, y: ry / max(rx, 1))
      ctx.fill(Path(ellipseIn: CGRect(x: -rx, y: -rx, width: rx * 2, height: rx * 2)),
               with: .radialGradient(Gradient(stops: [.init(color: glow, location: 0), .init(color: glow.opacity(0), location: 0.7)]), center: .zero, startRadius: 0, endRadius: rx))
    }
  }
}

/// A photo filling its box, cropped to fit (object-fit: cover).
struct FillPhoto: View {
  @Environment(\.theme) private var t
  let url: URL?
  var body: some View {
    Color.clear.overlay { AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { t.surf } }.clipped()
  }
}

extension Mesh {
  /// The gradient through CSS's filter: saturate(s) brightness(b), done on its colors instead of the drawn card, so its
  /// flow picture is made once, already faded (both steps are linear, so it comes out the same).
  func filtered(saturate s: Double, brightness b: Double) -> Mesh {
    func f(_ c: RGBA) -> RGBA {
      let r = (0.213 + 0.787 * s) * c.r + (0.715 - 0.715 * s) * c.g + (0.072 - 0.072 * s) * c.b
      let g = (0.213 - 0.213 * s) * c.r + (0.715 + 0.285 * s) * c.g + (0.072 - 0.072 * s) * c.b
      let bl = (0.213 - 0.213 * s) * c.r + (0.715 - 0.715 * s) * c.g + (0.072 + 0.928 * s) * c.b
      return RGBA(unit: min(1, max(0, r * b)), min(1, max(0, g * b)), min(1, max(0, bl * b)), c.a)
    }
    var m = self
    m.key = key + "|filter \(s) \(b)"
    m.stops = stops.map { (f($0.0), $0.1) }
    m.blobs = blobs.map { var x = $0; x.c = f(x.c); return x }
    m.streaks = streaks.map { var x = $0; x.c = f(x.c); return x }
    return m
  }
}
