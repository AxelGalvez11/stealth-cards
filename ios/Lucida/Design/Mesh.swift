// Gradient cards, as the canvas draws them (design/surfaces.mjs, design/generator.mjs): a CSS linear gradient under soft
// color blobs that are warped by low-frequency noise and heavily blurred, sharper bands of light on top, and fine film
// grain over it all. A deck's gradient comes from its name, the same way on the web and here.
import SwiftUI
import CoreGraphics

/// An ellipse in the 100 x 100 box that stretches over the card: color, center, radii, rotation in degrees.
struct Blob { var c: RGBA; var x: Double; var y: Double; var rx: Double; var ry: Double; var r: Double }

/// A named palette from surfaces.mjs.
struct Palette {
  var angle: Double; var stops: [(RGBA, Double)]; var blobs: [Blob]; var streaks: [Blob]
  var blur: Double; var sblur: Double; var disp: Double; var darkInk: Bool
}

/// Everything a gradient card needs to be drawn.
struct Mesh {
  var key: String
  var angle: Double
  var stops: [(RGBA, Double)]
  var blobs: [Blob]
  var streaks: [Blob]
  var blur: Double, sblur: Double, disp: Double
  /// Text on it: white or black.
  var ink: RGBA
  var glass: RGBA, glassLine: RGBA
  /// White text gets a soft shadow (0 1px 14px rgba(0,0,0,shadow)); 0 means none.
  var shadow: Double
  var kind: String = ""

  var inkColor: Color { ink.color }
  var darkInk: Bool { ink.r > 0.5 }

  static func palette(_ name: String) -> Mesh {
    let p = Generated.palettes[name] ?? Generated.palettes["Iris"]!
    let dark = p.darkInk
    return Mesh(key: "p-" + name, angle: p.angle, stops: p.stops, blobs: p.blobs, streaks: p.streaks, blur: p.blur, sblur: p.sblur, disp: p.disp,
                ink: dark ? RGBA(0xFFFFFF) : RGBA(0x000000),
                glass: dark ? RGBA(0xFFFFFF, a: 0.12) : RGBA(0xFFFFFF, a: 0.34), glassLine: dark ? RGBA(0xFFFFFF, a: 0.62) : RGBA(0x000000, a: 0.22),
                shadow: dark ? 0.16 : 0)
  }

  /// The generator (design/generator.mjs gen): the same seed always gives the same gradient. `mode` is 'vivid',
  /// 'deep', 'clear', or 'mix' / nil (mostly vivid, some deep).
  static func gen(_ seed: String, _ mode: String? = nil) -> Mesh {
    var h: UInt32 = 2300790937
    for scalar in seed.unicodeScalars {
      // charCodeAt(0) of each code point: its first UTF-16 unit.
      let v = scalar.value, unit = v > 0xFFFF ? 0xD800 + ((v - 0x10000) >> 10) : v
      h ^= unit
      h = h &* 16777619
    }
    var s = h
    func rnd() -> Double {
      s = s &+ 0x6D2B79F5
      var t = (s ^ (s >> 15)) &* (1 | s)
      t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
      return Double(t ^ (t >> 14)) / 4294967296
    }
    func norm(_ x: Double) -> Double { ((x.truncatingRemainder(dividingBy: 360)) + 360).truncatingRemainder(dividingBy: 360) }
    func fixed0(_ x: Double) -> Double { x.rounded(.toNearestOrAwayFromZero) }
    func fixed1(_ x: Double) -> Double { (x * 10).rounded(.toNearestOrAwayFromZero) / 10 }
    // hsl(h s% l%) as the generator writes it (whole numbers, lightness kept within 4...97).
    func hsl(_ hh: Double, _ l: Double, _ ss: Double) -> RGBA { cssHSL(fixed0(norm(hh)), fixed0(ss), fixed0(max(4, min(97, l)))) }
    let key = "g-" + seed + "|" + (mode ?? "mix")
    var kind = mode ?? "mix", c = 0.0
    if kind == "mix" { kind = rnd() < 0.7 ? "vivid" : "deep" }
    c = kind == "clear" ? 0.76 + rnd() * 0.24 : kind == "deep" ? 0.02 + rnd() * 0.26 : 0
    let none = Blob(c: .clear, x: 0, y: 0, rx: 0, ry: 0, r: 0)

    if kind == "vivid" {
      // Families: main, light, dark, accent, second accent (hue, saturation, lightness), fold angle, roundness, accent size.
      let F: [([Double], [Double], [Double], [Double], [Double], Double, Double, Double)] = [
        ([270, 44, 58], [262, 46, 72], [292, 50, 44], [6, 78, 60], [312, 44, 66], 0, 0.1, 1),
        ([20, 88, 54], [27, 94, 62], [10, 50, 25], [282, 16, 50], [8, 82, 48], -38, 0.15, 1),
        ([13, 78, 48], [18, 88, 60], [8, 72, 30], [212, 70, 66], [20, 88, 71], 18, 0.85, 1.5),
        ([199, 82, 46], [195, 80, 58], [210, 86, 29], [348, 76, 82], [350, 70, 76], 58, 0.3, 1.45),
        ([238, 60, 58], [284, 46, 52], [236, 52, 30], [352, 74, 66], [18, 88, 71], 86, 0.55, 1.2),
        ([229, 66, 50], [226, 70, 60], [231, 64, 29], [330, 58, 64], [352, 62, 58], -36, 0.35, 1.4),
        ([318, 58, 46], [326, 64, 60], [290, 52, 26], [24, 92, 58], [18, 88, 72], 12, 0.3, 1.2),
        ([190, 72, 40], [186, 66, 54], [205, 76, 23], [10, 82, 64], [22, 88, 72], -24, 0.45, 1.35),
        ([350, 72, 50], [356, 80, 62], [340, 64, 28], [258, 58, 62], [268, 52, 74], 30, 0.4, 1.3),
        ([248, 54, 48], [252, 60, 63], [246, 56, 26], [20, 90, 70], [8, 78, 62], -12, 0.5, 1.2)
      ]
      let fam = Int(floor(rnd() * Double(F.count)))
      let (dom, lite, dark, acc, acc2, flow0, round, big) = F[fam]
      let dh = (rnd() - 0.5) * 14, fx = rnd() < 0.5, fy = rnd() < 0.4
      func vc(_ c: [Double], _ dl: Double = 0) -> RGBA { hsl(c[0] + dh, c[2] + dl, c[1]) }
      func X(_ x: Double) -> Double { fixed1(fx ? 100 - x : x) }
      func Y(_ y: Double) -> Double { fixed1(fy ? 100 - y : y) }
      let flow = (flow0 + (rnd() - 0.5) * 14) * (fx != fy ? -1 : 1)
      func j() -> Double { (rnd() - 0.5) * 12 }
      func k() -> Double { 0.8 + rnd() * 0.4 }
      func blob(_ cc: RGBA, _ x: Double, _ y: Double, _ w: Double, _ ht: Double) -> Blob {
        let bx = X(x + j()), by = Y(y + j()), rx = fixed1(w * k()), ry = fixed1(ht * k())
        return Blob(c: cc, x: bx, y: by, rx: rx, ry: ry, r: fixed1(flow))
      }
      var a = 225.0; if fx { a = 360 - a }; if fy { a = 180 - a }
      let stops = [(vc(lite), 0.0), (vc(dom), 0.52), (vc(dark, 6), 1.0)]
      let b0 = blob(vc(acc), 6, 94, (26 + 14 * round) * big, (26 + 14 * round) * big)
      let b1 = blob(vc(acc2), 24 * big, 86, (12 + 10 * round) * big, (18 + 8 * round) * big)
      let b2 = blob(vc(dark), 18, 36, 8 + 16 * round, 64 - 30 * round)
      let b3 = blob(vc(lite, 2), 72, 18, 12 + 14 * round, 60 - 24 * round)
      let b4 = blob(vc(dom), 52, 56, 9 + 16 * round, 66 - 30 * round)
      let b5 = blob(vc(dark, 8), 90, 88, 10 + 16 * round, 40 - 10 * round)
      let silk = round < 0.5
      let s0 = silk ? Blob(c: vc(lite, 4), x: X(42 + j()), y: 50, rx: 4.5, ry: 80, r: fixed1(flow)) : none
      let s1 = silk ? Blob(c: vc(dark, 4), x: X(66 + j()), y: 50, rx: 3.5, ry: 80, r: fixed1(flow)) : none
      return Mesh(key: key, angle: fixed0(norm(a)), stops: stops, blobs: [b0, b1, b2, b3, b4, b5], streaks: [s0, s1], blur: 9, sblur: 5.5, disp: 24,
                  ink: RGBA(0xFFFFFF), glass: RGBA(0xFFFFFF, a: 0.14), glassLine: RGBA(0xFFFFFF, a: 0.6), shadow: 0.18, kind: "Vivid")
    }

    func mix(_ a: Double, _ b: Double) -> Double { a + (b - a) * c }
    var hue = rnd() * 360
    // Deep yellows and yellow-greens turn olive and muddy; nudge them to amber or green.
    if c < 0.6 && hue > 46 && hue < 100 { hue = hue < 73 ? 32 + rnd() * 8 : 118 + rnd() * 20 }
    var hue2 = hue + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 30)
    let n2 = norm(hue2)
    if c < 0.6 && n2 > 46 && n2 < 100 { hue2 = n2 < 73 ? 28 : 124 }
    let sat = mix(52, 88), lo = mix(16, 62), hi = mix(70, 90)
    func col(_ hh: Double, _ l: Double, _ ss: Double? = nil) -> RGBA { hsl(hh, l, ss ?? sat) }
    let tilt = (rnd() - 0.5) * 50
    let angle = (rnd() * 360).rounded()
    let lMid = (lo + hi) / 2
    let stops = [(col(hue, hi), 0.0), (col(hue, lMid), 0.45), (col(hue2, mix(lo + 6, lMid)), 1.0)]
    var blobs: [Blob] = []
    for i in 0..<6 {
      let hh = i % 2 == 1 ? hue2 : hue, span = (hi - lo) * 0.45
      let l = rnd() < 0.5 ? lo + rnd() * span : hi - rnd() * span
      let color = col(hh, l)
      let x = fixed1(rnd() * 100), y = fixed1(rnd() * 100)
      let rx = fixed1(mix(34, 11) * (0.7 + rnd() * 0.6)), ry = fixed1(mix(26, 72) * (0.7 + rnd() * 0.6))
      blobs.append(Blob(c: color, x: x, y: y, rx: rx, ry: ry, r: fixed1(tilt * c)))
    }
    var streaks: [Blob] = []
    for _ in 0..<2 {
      if c > 0.45 {
        let color = col(hue, min(95, hi + 4), sat * 0.8), x = fixed1(8 + rnd() * 84), rx = fixed1(1.5 + rnd() * 2 * c)
        streaks.append(Blob(c: color, x: x, y: 50, rx: rx, ry: 80, r: fixed1(tilt)))
      } else { streaks.append(none) }
    }
    // Text color: whichever of black or white reads better on the middle of the card.
    let mid = cssHSL(norm(hue), sat, lMid)
    func lin(_ v: Double) -> Double { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
    let Lm = 0.2126 * lin(mid.r) + 0.7152 * lin(mid.g) + 0.0722 * lin(mid.b)
    let dark = 1.05 / (Lm + 0.05) > (Lm + 0.05) / 0.05
    return Mesh(key: key, angle: angle, stops: stops, blobs: blobs, streaks: streaks, blur: fixed1(mix(9, 6)), sblur: fixed1(mix(4, 3)), disp: fixed0(mix(26, 9)),
                ink: dark ? RGBA(0xFFFFFF) : RGBA(0x000000),
                glass: dark ? RGBA(0xFFFFFF, a: 0.12) : RGBA(0xFFFFFF, a: 0.34), glassLine: dark ? RGBA(0xFFFFFF, a: 0.62) : RGBA(0x000000, a: 0.22),
                shadow: dark ? 0.16 : 0, kind: c < 0.5 ? "Deep" : "Clear")
  }

  /// A deck's cover: its seed (plus the shuffle round) in its style.
  static func deck(seed: String, round: Int = 0, style: String? = nil) -> Mesh {
    gen(seed + (round > 0 ? " #\(round)" : ""), style)
  }
}

/// CSS hsl(): hue in degrees, saturation and lightness in percent.
func cssHSL(_ h: Double, _ s0: Double, _ l0: Double) -> RGBA {
  let s = s0 / 100, l = l0 / 100
  func f(_ n: Double) -> Double {
    let k = (n + h / 30).truncatingRemainder(dividingBy: 12), a = s * min(l, 1 - l)
    return l - a * max(-1, min(k - 3, min(9 - k, 1)))
  }
  return RGBA(unit: f(0), f(8), f(4))
}

// ---------- drawing ----------

/// A CSS linear-gradient(angle, stops) over a box: the gradient line runs through the center at the angle (0 = up,
/// 90 = right) and is long enough that the corners get the first and last colors.
struct CSSLinearGradient: View {
  var angle: Double
  var stops: [(RGBA, Double)]
  var body: some View {
    GeometryReader { g in
      let w = g.size.width, h = g.size.height, a = angle * .pi / 180
      let dx = sin(a), dy = -cos(a), len = abs(w * sin(a)) + abs(h * cos(a))
      let start = UnitPoint(x: 0.5 - dx * len / 2 / max(w, 1), y: 0.5 - dy * len / 2 / max(h, 1))
      let end = UnitPoint(x: 0.5 + dx * len / 2 / max(w, 1), y: 0.5 + dy * len / 2 / max(h, 1))
      LinearGradient(stops: stops.map { Gradient.Stop(color: $0.0.color, location: $0.1) }, startPoint: start, endPoint: end)
    }
  }
}

/// The blobs and bands of light, drawn once per gradient into a picture of the 100 x 100 box (like design/art.mjs
/// does for the website), then stretched over each card.
enum FlowArt {
  /// Pixels per unit of the 100 x 100 box, and how far past it the blur can reach in from.
  static let k = 2.2, pad = 40.0
  private static let cache = NSCache<NSString, CGImage>()
  private static let queue = DispatchQueue(label: "cards.lucida.flow", qos: .userInitiated, attributes: .concurrent)

  static func cached(_ m: Mesh) -> CGImage? { cache.object(forKey: m.key as NSString) }

  static func image(_ m: Mesh) async -> CGImage? {
    if let hit = cached(m) { return hit }
    return await withCheckedContinuation { done in
      queue.async {
        let img = render(m)
        if let img { cache.setObject(img, forKey: m.key as NSString) }
        done.resume(returning: img)
      }
    }
  }

  /// The picture of a gradient's blobs (warped, blurred) and bands of light (blurred), transparent between.
  static func render(_ m: Mesh) -> CGImage? {
    let n = Int((100 + 2 * pad) * k)
    var base = raster(m.blobs, n)
    base = displace(base, n, scale: m.disp)
    Pixels.blur(&base, w: n, h: n, sigma: m.blur * k)
    if m.streaks.contains(where: { $0.c.a > 0 }) {
      var top = raster(m.streaks, n)
      Pixels.blur(&top, w: n, h: n, sigma: m.sblur * k)
      base.withUnsafeMutableBufferPointer { b in
        top.withUnsafeBufferPointer { t in
          var i = 0
          while i < b.count { let a = t[i + 3]; b[i] = t[i] + b[i] * (1 - a); b[i + 1] = t[i + 1] + b[i + 1] * (1 - a); b[i + 2] = t[i + 2] + b[i + 2] * (1 - a); b[i + 3] = a + b[i + 3] * (1 - a); i += 4 }
        }
      }
    }
    // Keep only the 100 x 100 box.
    let from = Int(pad * k), size = Int(100 * k)
    var bytes = [UInt8](repeating: 0, count: size * size * 4)
    for y in 0..<size {
      for x in 0..<size {
        let s = ((y + from) * n + x + from) * 4, d = (y * size + x) * 4
        for c in 0..<4 { bytes[d + c] = UInt8(max(0, min(255, (base[s + c] * 255).rounded()))) }
      }
    }
    return makeImage(bytes, size, size)
  }

  static func makeImage(_ bytes: [UInt8], _ w: Int, _ h: Int) -> CGImage? {
    guard let provider = CGDataProvider(data: Data(bytes) as CFData) else { return nil }
    return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                   bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
  }

  /// Ellipses on a transparent square (with the padding around the box), as premultiplied floats.
  private static func raster(_ shapes: [Blob], _ n: Int) -> [Float] {
    var bytes = [UInt8](repeating: 0, count: n * n * 4)
    bytes.withUnsafeMutableBytes { raw in
      guard let ctx = CGContext(data: raw.baseAddress, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return }
      // SVG's box: y down, 1 unit = k pixels, with the padding around it.
      ctx.translateBy(x: 0, y: CGFloat(n)); ctx.scaleBy(x: 1, y: -1)
      ctx.scaleBy(x: k, y: k); ctx.translateBy(x: pad, y: pad)
      for b in shapes where b.c.a > 0 && b.rx > 0 && b.ry > 0 {
        ctx.saveGState()
        ctx.translateBy(x: b.x, y: b.y); ctx.rotate(by: b.r * .pi / 180)
        ctx.setFillColor(CGColor(srgbRed: b.c.r, green: b.c.g, blue: b.c.b, alpha: b.c.a))
        ctx.fillEllipse(in: CGRect(x: -b.rx, y: -b.ry, width: b.rx * 2, height: b.ry * 2))
        ctx.restoreGState()
      }
    }
    return bytes.map { Float($0) / 255 }
  }

  /// feDisplacementMap over low-frequency fractal noise (baseFrequency .018, 2 octaves, seed 7): each pixel takes the
  /// color from up to half `scale` units away.
  private static func displace(_ src: [Float], _ n: Int, scale: Double) -> [Float] {
    guard scale > 0 else { return src }
    let t = Turbulence(seed: 7)
    var out = [Float](repeating: 0, count: src.count)
    src.withUnsafeBufferPointer { s in
      out.withUnsafeMutableBufferPointer { o in
        for y in 0..<n {
          for x in 0..<n {
            let ux = (Double(x) + 0.5) / k - pad, uy = (Double(y) + 0.5) / k - pad
            let r = t.value(0, x: ux, y: uy, freq: 0.018, 0.018, octaves: 2), g = t.value(1, x: ux, y: uy, freq: 0.018, 0.018, octaves: 2)
            let sx = Double(x) + scale * (r - 0.5) * k, sy = Double(y) + scale * (g - 0.5) * k
            let x0 = Int(floor(sx)), y0 = Int(floor(sy)), fx = Float(sx - Double(x0)), fy = Float(sy - Double(y0))
            let d = (y * n + x) * 4
            for c in 0..<4 {
              func at(_ xx: Int, _ yy: Int) -> Float { xx < 0 || yy < 0 || xx >= n || yy >= n ? 0 : s[(yy * n + xx) * 4 + c] }
              let top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx, bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
              o[d + c] = top * (1 - fy) + bottom * fy
            }
          }
        }
      }
    }
    return out
  }
}

/// The film grain tile (made from the same noise as the canvas's grain; see Pixels.grainTile), 128 points at 3x.
enum Grain {
  static let image: CGImage? = {
    if let url = Bundle.main.url(forResource: "grain", withExtension: "png"), let src = CGImageSourceCreateWithURL(url as CFURL, nil) {
      return CGImageSourceCreateImageAtIndex(src, 0, nil)
    }
    return FlowArt.makeImage(Pixels.grainTile(points: 128, scale: 3), 384, 384)
  }()
}

/// A gradient card's background: the gradient, its blobs and light, then grain in soft light (the boards' grain: 0.7).
struct MeshFill: View {
  let mesh: Mesh
  var grain: Double = 0.7
  @State private var flow: CGImage?

  var body: some View {
    ZStack {
      CSSLinearGradient(angle: mesh.angle, stops: mesh.stops)
      if let img = flow ?? FlowArt.cached(mesh) {
        Image(decorative: img, scale: 1).resizable().interpolation(.high)
      }
      if let g = Grain.image {
        Image(decorative: g, scale: 3).resizable(resizingMode: .tile).opacity(grain).blendMode(.softLight)
      }
    }
    .compositingGroup()
    .task(id: mesh.key) { flow = await FlowArt.image(mesh) }
    .accessibilityHidden(true)
  }
}
