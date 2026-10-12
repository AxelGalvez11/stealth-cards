// A Mind map drawn on the iPhone (spec step4-maps.md §4.7-4.8, §5.3): web/maps.js lays it out (Data/MapEngine.swift) and this draws its numbers in
// one SwiftUI Canvas, the way the approved boards draw them (design/maps.mjs mapArt: draw, boxesOf, extrasOf, markOf), in the theme's own colors:
//   - the topic inverted, main ideas on surf2, deeper ideas outlined; links as the engine's S curves;
//   - a folded idea's "+N" chip; what hangs off a box (its note and cards badge, "✦ New" on what the other writer added, "N weak" on a folded
//     branch) in one row placed where it touches no other box;
//   - the weak-spots tints and dot, Test me's hidden ideas (dashed, "?") and its marks (red or green), the selection ring.
// The camera (zoom z, and where the map's origin sits) only changes a transform: a pan or a pinch never lays the map out again. The camera and
// a new layout both animate through Animatable values (MapDrawing), so a fold, an unfold or a new idea glides (0.16 s, ease .2,.8,.2,1) and the
// camera moves over 0.25 s; with Reduce Motion they just change. A frame only draws: the boxes as drawn, what hangs off them and the tones are
// worked out once by the page's model (Screens/MapModel.swift) and handed in, each word's width is measured once, and while a finger pans or
// pinches the camera lives in the stage alone, the page told only when the gesture ends.
//   - `.page`: the page's stage, with one-finger pan, pinch (50% to 250%, anchored between the fingers), tap to select (through the inverse
//     transform; every box and fold chip has at least a 44 pt target), and a double tap (empty space fits, an idea zooms to its branch).
//   - `.preview`: a map inside a Note (MapPreviewView), static: no pan, so scrolling the Note is never caught.
import SwiftUI

// ---------- the camera ----------
/// Where the map sits on the stage: zoom `z`, and the stage point the map's origin is at.
struct MapCam: Equatable { var z: Double = 1, x: Double = 0, y: Double = 0 }

/// A box as drawn (MapArt.boxes): the engine's box with its lines balanced, a leaf as wide as those lines need.
struct MapBox: Equatable {
  var id: String, level: Int, side: Int, parent: String?
  var x: Double, y: Double, w: Double, h: Double
  var lines: [String], folded: Bool, hidden: Int, kids: Int, open: Bool
  var rect: CGRect { CGRect(x: x, y: y, width: w, height: h) }
}
/// What hangs off a box, placed (MapArt.extras): its rectangle in map points and the items in it.
struct MapExtra: Equatable {
  enum Item: Equatable { case fresh, badge(note: Bool, cards: Int), weak(Int) }
  var rect: CGRect
  var items: [(Item, CGFloat)]
  static func == (a: MapExtra, b: MapExtra) -> Bool { a.rect == b.rect && a.items.map { $0.0 } == b.items.map { $0.0 } }
}

/// The map's look in a state: its colors, and what marks each box (all optional).
struct MapArt {
  var t: ThemeColors
  var dark: Bool
  /// The weak-spots tones, when the overlay is on (id -> 'weak', 'getting', 'solid', 'new').
  var tones: [String: String]? = nil
  var sel = ""
  var hidden: Set<String> = []
  /// Test me's marks (id -> 'knew' or 'missed').
  var marks: [String: String] = [:]
  /// Ideas the other writer just added.
  var changed: Set<String> = []
  /// How many weak ideas a folded branch hides.
  var weakIn: [String: Int] = [:]
  /// Ideas drawn pale (not in the test).
  var faded: Set<String> = []
  /// The badge's and the chips' text size (12.5 on a phone).
  var small: CGFloat = 12.5, chip: CGFloat = 12.5
  /// Each idea's note and card links (from the page's data).
  var tree = MapTree("")
  var title = ""

  static let SIZE: [CGFloat] = [15, 13.5, 12.5], WEIGHT: [Font.Weight] = [.semibold, .semibold, .medium], PAD_X = 14.0, PAD_Y = 9.0, CHIP = 26.0
  static let CHAR = [8.6, 7.4, 6.9]

  // ---------- colors (design/maps.mjs markOf, raisedOf) ----------
  static func isDark(_ t: ThemeColors) -> Bool { (t.bg.r * 0.299 + t.bg.g * 0.587 + t.bg.b * 0.114) * 255 < 128 }
  struct Mark { var fill: RGBA, stroke: RGBA, ink: RGBA, width: Double }
  /// How a box is marked (a weak-spots tone, a Test me mark, or an idea the other writer added): a tint and a border of the same color, in the
  /// dark the accent at 26% so each reads lighter than the black canvas.
  static func mark(_ t: ThemeColors, _ kind: String) -> Mark {
    let acc: RGBA = ["weak": t.again, "getting": t.hard, "solid": t.good, "missed": t.again, "knew": t.good, "fresh": t.easy][kind] ?? t.text
    let dark = isDark(t)
    let tint: RGBA? = ["weak": t.againTint, "missed": t.againTint, "getting": t.hardTint, "solid": t.goodTint, "knew": t.goodTint][kind]
    let fill = dark ? acc.alpha(kind == "fresh" ? 0.22 : 0.26) : kind == "fresh" ? acc.alpha(0.1) : tint ?? acc.alpha(0.12)
    return Mark(fill: fill, stroke: acc.alpha(dark ? 0.9 : 0.6), ink: acc, width: kind == "missed" || kind == "knew" ? 2 : 1.5)
  }
  /// What's raised over the page (sheets, the idea bar): the page's own colors in the light; in the dark a gray a step above the black page.
  struct Raised { var bg, surf, surf2, line: RGBA }
  static func raised(_ t: ThemeColors) -> Raised {
    guard isDark(t) else { return Raised(bg: t.bg, surf: t.surf, surf2: t.surf2, line: t.line) }
    func up(_ a: Double) -> RGBA { let f = { (v: Double) in (v * 255 + (255 - v * 255) * a).rounded() / 255 }; return RGBA(unit: f(t.bg.r), f(t.bg.g), f(t.bg.b), 1) }
    return Raised(bg: up(0.1), surf: up(0.19), surf2: up(0.26), line: up(0.2))
  }

  // ---------- the boxes as drawn (boxesOf) ----------
  /// A label's lines, balanced: the same number of lines, broken where the longest is shortest (a script without spaces keeps the engine's).
  static func balanced(_ lines: [String]) -> [String] {
    guard lines.count >= 2 else { return lines }
    let words = lines.joined(separator: " ").split(separator: " ").map(String.init), n = lines.count
    guard words.count >= n, words.count <= 24 else { return lines }
    var best: [String]? = nil, bestU = Double.infinity
    func go(_ from: Int, _ left: Int, _ acc: [String]) {
      if left == 1 {
        let l = acc + [words[from...].joined(separator: " ")], u = l.map(MapText.units).max() ?? 0
        if u < bestU { bestU = u; best = l }
        return
      }
      guard from + 1 <= words.count - left + 1 else { return }
      for i in (from + 1)...(words.count - left + 1) { go(i, left - 1, acc + [words[from..<i].joined(separator: " ")]) }
    }
    go(0, n, [])
    return best ?? lines
  }
  static func boxes(_ L: MapLayout) -> [MapBox] {
    L.nodes.map { n in
      let lv = min(n.level, 2), lines = balanced(n.lines), open = n.kids > 0 && !n.folded
      var w = n.w, dx = 0.0
      if !open && n.level > 0 && lines != n.lines {
        let need = max(64, (lines.map(MapText.units).max()! * CHAR[lv]).rounded(.up) + 2 * PAD_X) + (n.folded ? CHIP : 0)
        if need < w { if n.side < 0 { dx = w - need }; w = need }
      }
      return MapBox(id: n.id, level: n.level, side: n.side, parent: n.parent, x: ((n.x + dx) * 10).rounded() / 10, y: n.y, w: w, h: n.h, lines: lines, folded: n.folded, hidden: n.hidden, kids: n.kids, open: open)
    }
  }

  // ---------- what hangs off a box (extrasOf) ----------
  func extras(_ B: [MapBox]) -> [String: MapExtra] {
    var out: [String: MapExtra] = [:], placed: [CGRect] = []
    let fs = small, k = fs / 10, h = ((fs + 6) * 10).rounded() / 10, fz = chip, hw = ((fz + 6) * 10).rounded() / 10
    func hits(_ r: CGRect, _ me: String) -> Bool {
      B.contains { m in m.id != me && r.minX < m.x + m.w + 3 && m.x - 3 < r.maxX && r.minY < m.y + m.h + 3 && m.y - 3 < r.maxY }
        || placed.contains { p in r.minX < p.maxX + 2 && p.minX - 2 < r.maxX && r.minY < p.maxY + 2 && p.minY - 2 < r.maxY }
    }
    for n in B {
      if hidden.contains(n.id) { continue }
      var items: [(MapExtra.Item, CGFloat, CGFloat)] = []
      if changed.contains(n.id) { items.append((.fresh, ((3.3 * fz + 10) * 10).rounded() / 10, hw)) }
      let idea = tree[n.id], nc = idea?.cardIds.count ?? 0, hasNote = !(idea?.note.isEmpty ?? true)
      if nc > 0 || hasNote {
        let gw = 7 * k, cw = nc > 0 ? 6.5 * k + 3 * k + CGFloat(String(nc).count) * 6.2 * k : 0
        items.append((.badge(note: hasNote, cards: nc), ((10 * k + (hasNote ? gw : 0) + (hasNote && nc > 0 ? 5 * k : 0) + cw) * 10).rounded() / 10, h))
      }
      if let inside = weakIn[n.id], inside > 0 {
        let label = "\(inside) weak"
        items.append((.weak(inside), ((12 + CGFloat(label.count) * fz * 0.58) * 10).rounded() / 10, hw))
      }
      if items.isEmpty { continue }
      let W = items.reduce(0) { $0 + $1.1 } + 4 * CGFloat(items.count - 1), H = items.map(\.2).max()!, right = n.side >= 0
      let end = right ? n.w - 6 - W - (n.folded ? MapArt.CHIP : 0) : 6 + (n.folded ? MapArt.CHIP : 0)
      var tries: [(Double, Double)] = []
      if !n.open { tries.append((right ? n.w + 7 : -7 - W, n.h / 2 - H / 2)) }
      tries += [(end, n.h + 7), (end, -H - 7), (end, n.h - H / 2), (end, -H / 2)]
      var at = tries[0]
      for p in tries where !hits(CGRect(x: n.x + p.0, y: n.y + p.1, width: W, height: H), n.id) { at = p; break }
      let r = CGRect(x: ((n.x + at.0) * 10).rounded() / 10, y: ((n.y + at.1) * 10).rounded() / 10, width: (W * 10).rounded() / 10, height: (H * 10).rounded() / 10)
      placed.append(r)
      out[n.id] = MapExtra(rect: r, items: items.map { ($0.0, $0.1) })
    }
    return out
  }
  /// Each box grown by what hangs off it (what the camera frames, so a badge is never cut by the stage's edge).
  func framed(_ B: [MapBox]) -> [MapBox] {
    let X = extras(B)
    return B.map { n in
      guard let r = X[n.id]?.rect else { return n }
      var m = n
      let x0 = min(n.x, r.minX), y0 = min(n.y, r.minY)
      m.w = max(n.x + n.w, r.maxX) - x0; m.h = max(n.y + n.h, r.maxY) - y0; m.x = x0; m.y = y0
      return m
    }
  }
}

extension RGBA {
  /// The same color at `a` (design/maps.mjs alpha: its r, g, b at that opacity).
  func alpha(_ a: Double) -> RGBA { RGBA(unit: r, g, b, a) }
}

// ---------- where the camera goes (design/maps.mjs fitIn, frame, and the phone's shot) ----------
enum MapCamera {
  struct Area { var x: Double, y: Double, w: Double, h: Double }
  private static func r1(_ v: Double) -> Double { (v * 10).rounded() / 10 }
  private static func bounds(_ l: [MapBox]) -> (x: Double, y: Double, w: Double, h: Double) {
    let x0 = l.map(\.x).min() ?? 0, y0 = l.map(\.y).min() ?? 0
    return (x0, y0, (l.map { $0.x + $0.w }.max() ?? 0) - x0, (l.map { $0.y + $0.h }.max() ?? 0) - y0)
  }
  /// The whole map inside an area: fitted (from zmin to zmax) or, when it can't fit at zmin, at zmin centred on the topic (a one-sided map:
  /// the topic and its main ideas centred across, the topic centred down).
  static func fit(_ B: [MapBox], _ area: Area, inset i: Double = 16, zmin: Double = 1.04, zmax: Double = 1.25) -> MapCam {
    guard let root = B.first else { return MapCam() }
    let b = bounds(B)
    let fit = min((area.w - 2 * i) / (b.w + 16), (area.h - 2 * i) / (b.h + 16))
    if fit >= zmin {
      let z = min(zmax, fit)
      return MapCam(z: (z * 1000).rounded() / 1000, x: r1(area.x + area.w / 2 - z * (b.x + b.w / 2)), y: r1(area.y + area.h / 2 - z * (b.y + b.h / 2)))
    }
    let z = zmin, one = B.allSatisfy { $0.side >= 0 }, top = bounds(B.filter { $0.level <= 1 })
    let cx = one ? top.x + top.w / 2 : root.x + root.w / 2
    var x = area.x + area.w / 2 - z * cx
    if one && z * (top.w + 16) > area.w - 2 * i { x = area.x + i - z * (root.x - 8) }
    return MapCam(z: z, x: r1(x), y: r1(area.y + area.h / 2 - z * (root.y + root.h / 2)))
  }
  /// The camera that shows the ideas `ids` inside `area`, `inset` from its edges, at most at `z` (and zmax), never under zmin; the first of
  /// them (the idea in focus) is kept whole. `pad`: room around each box for what hangs off it.
  static func frame(_ B: [MapBox], _ ids: [String], _ area: Area, inset i: Double = 16, zmin: Double, zmax: Double = 1.25, z want: Double? = nil, pad: Double = 6) -> MapCam {
    var ns = ids.compactMap { id in B.first { $0.id == id } }
    if ns.isEmpty, let r = B.first { ns = [r] }
    guard !ns.isEmpty else { return MapCam() }
    let x0 = ns.map(\.x).min()! - pad, y0 = ns.map(\.y).min()! - pad, x1 = ns.map { $0.x + $0.w }.max()! + pad, y1 = ns.map { $0.y + $0.h }.max()! + pad
    let z = max(zmin, min(want ?? zmax, zmax, (area.w - 2 * i) / (x1 - x0), (area.h - 2 * i) / (y1 - y0)))
    var x = area.x + area.w / 2 - z * (x0 + x1) / 2, y = area.y + area.h / 2 - z * (y0 + y1) / 2
    let f = ns[0], R = area.x + area.w - i, Bt = area.y + area.h - i
    if x + z * (f.x + f.w + pad) > R { x = R - z * (f.x + f.w + pad) }
    if x + z * (f.x - pad) < area.x + i { x = area.x + i - z * (f.x - pad) }
    if y + z * (f.y + f.h + pad) > Bt { y = Bt - z * (f.y + f.h + pad) }
    if y + z * (f.y - pad) < area.y + i { y = area.y + i - z * (f.y - pad) }
    return MapCam(z: (z * 1000).rounded() / 1000, x: r1(x), y: r1(y))
  }
  /// A branch on an upright phone, in groups (the idea, then its children, its parent, its brothers and sisters): as many whole groups as fit
  /// with no word under 13 pt (104%), else as many as fit at 92% or more, else the idea on its own.
  static func shot(_ B: [MapBox], _ groups: [[String]], _ area: Area, z: Double) -> MapCam {
    var tries: [MapCam] = []
    if groups.count >= 2 { for k in stride(from: groups.count, through: 2, by: -1) { tries.append(frame(B, Array(groups.prefix(k).joined()), area, zmin: 0.01, z: z)) } }
    return tries.first { $0.z >= 1.04 } ?? tries.first { $0.z >= 0.92 } ?? frame(B, groups.first ?? [], area, zmin: 0.92, z: z)
  }
  /// An idea and what's around it: [the idea], its children, [its parent], its brothers and sisters.
  static func groups(_ B: [MapBox], _ id: String, kids: Bool = true, parent: Bool = true, sibs: Bool = false) -> [[String]] {
    let me = B.first { $0.id == id }
    var g: [[String]] = [[id]]
    if kids { let k = B.filter { $0.parent == id }.map(\.id); if !k.isEmpty { g.append(k) } }
    if parent, let p = me?.parent { g.append([p]) }
    if sibs, let p = me?.parent { let s = B.filter { $0.parent == p && $0.id != id }.map(\.id); if !s.isEmpty { g.append(s) } }
    return g
  }
}

// ---------- the drawing ----------
/// Draws a layout at a camera. Animatable: `cam` and `glide` (0 to 1, from the layout before to this one) move frame by frame inside an
/// animation, so the map glides and the camera eases without anything being laid out again.
struct MapDrawing: View, Animatable {
  /// The boxes as drawn (MapArt.boxes of the layout), and the ones before (they glide from there), or nil.
  var boxes: [MapBox]
  var was: [MapBox]?
  var art: MapArt
  /// What hangs off the boxes (art.extras(boxes)).
  var extras: [String: MapExtra]
  var cam: MapCam
  var glide: Double

  var animatableData: AnimatablePair<Double, AnimatablePair<Double, AnimatablePair<Double, Double>>> {
    get { AnimatablePair(glide, AnimatablePair(cam.z, AnimatablePair(cam.x, cam.y))) }
    set { glide = newValue.first; cam.z = newValue.second.first; cam.x = newValue.second.second.first; cam.y = newValue.second.second.second }
  }

  var body: some View {
    Canvas(rendersAsynchronously: false) { ctx, _ in
      MapDrawing.paint(&ctx, boxes: boxes, was: was, art: art, extras: extras, cam: cam, glide: glide)
    }
  }

  /// The ease of a glide (.2, .8, .2, 1) at `p`.
  static func eased(_ p: Double) -> Double {
    guard p > 0, p < 1 else { return max(0, min(1, p)) }
    // (a cubic-bezier's y at x = p, by bisection on its x)
    func bez(_ t: Double, _ a: Double, _ b: Double) -> Double { let u = 1 - t; return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t }
    var lo = 0.0, hi = 1.0
    for _ in 0..<24 { let m = (lo + hi) / 2; if bez(m, 0.2, 0.2) < p { lo = m } else { hi = m } }
    return bez((lo + hi) / 2, 0.8, 1)
  }

  static func paint(_ ctx: inout GraphicsContext, boxes: [MapBox], was from: [MapBox]?, art: MapArt, extras: [String: MapExtra], cam: MapCam, glide: Double) {
    let t = art.t
    var B = boxes
    // (during a glide each box moves from where it was; a new one fades in out of its parent)
    var alphaOf: [String: Double] = [:]
    let e = eased(glide)
    if let from, e < 1 {
      let was = Dictionary(from.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
      let now = Dictionary(B.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
      B = B.map { b in
        var m = b
        if let o = was[b.id] { m.x = o.x + (b.x - o.x) * e; m.y = o.y + (b.y - o.y) * e; m.w = o.w + (b.w - o.w) * e; m.h = o.h + (b.h - o.h) * e }
        else {
          // out of its parent (where the parent was)
          var p = b.parent; while let id = p, was[id] == nil { p = now[id]?.parent }
          if let id = p, let o = was[id] { m.x = o.x + (b.x - o.x) * e; m.y = o.y + o.h / 2 - b.h / 2 + (b.y - (o.y + o.h / 2 - b.h / 2)) * e }
          alphaOf[b.id] = e
        }
        return m
      }
    }
    let by = Dictionary(B.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    let X = e < 1 ? [:] : extras
    ctx.translateBy(x: cam.x, y: cam.y)
    ctx.scaleBy(x: cam.z, y: cam.z)
    // links: from the parent's outer edge to the child's inner edge (the engine's curve, from the boxes as they are now)
    var links = Path()
    for b in B {
      guard let pid = b.parent, let p = by[pid] else { continue }
      let x1 = b.side > 0 ? p.x + p.w : p.x, y1 = p.y + p.h / 2, x2 = b.side > 0 ? b.x : b.x + b.w, y2 = b.y + b.h / 2, m = (x1 + x2) / 2
      links.move(to: CGPoint(x: x1, y: y1)); links.addCurve(to: CGPoint(x: x2, y: y2), control1: CGPoint(x: m, y: y1), control2: CGPoint(x: m, y: y2))
    }
    ctx.stroke(links, with: .color(t.line.color), style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
    for b in B { box(&ctx, b, art, alpha: alphaOf[b.id] ?? 1) }
    for b in B { if let x = X[b.id] { extra(&ctx, x, art) } }
  }

  /// A line's width as the font draws it, measured once per level and words (the Canvas draws on the main thread).
  private static var widths: [String: CGFloat] = [:]
  private static func width(_ r: GraphicsContext.ResolvedText, _ key: String) -> CGFloat {
    if let w = widths[key] { return w }
    if widths.count > 4000 { widths = [:] }
    let w = r.measure(in: CGSize(width: 2000, height: 100)).width
    widths[key] = w
    return w
  }

  private static func box(_ ctx: inout GraphicsContext, _ n: MapBox, _ art: MapArt, alpha: Double) {
    let t = art.t, lv = min(n.level, 2), hidden = art.hidden.contains(n.id), tone = art.tones?[n.id], left = n.side < 0
    let m: MapArt.Mark? = hidden ? nil : art.marks[n.id].map { MapArt.mark(t, $0) } ?? (tone.flatMap { ["weak", "getting", "solid"].contains($0) ? MapArt.mark(t, $0) : nil }) ?? (art.changed.contains(n.id) ? MapArt.mark(t, "fresh") : nil)
    let inv = n.level == 0 && m == nil && !hidden, rx = n.level == 0 ? min(16, (n.h / 2 * 10).rounded() / 10) : 10
    let fill = hidden ? t.surf : m?.fill ?? (inv ? t.inv : n.level == 1 ? t.surf2 : t.bg), ink = inv ? t.invText : t.text
    var c = ctx
    c.translateBy(x: n.x, y: n.y)
    c.opacity = alpha * (art.faded.contains(n.id) ? 0.45 : 1)
    let sw = hidden ? 1.5 : m?.width ?? (n.level >= 2 ? 1.5 : 0), ins = m != nil ? sw / 2 : 0
    let shape = Path(roundedRect: CGRect(x: ins, y: ins, width: n.w - 2 * ins, height: n.h - 2 * ins), cornerRadius: rx - ins, style: .circular)
    c.fill(shape, with: .color(fill.color))
    if hidden { c.stroke(shape, with: .color(t.line.color), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])) }
    else if let m { c.stroke(shape, with: .color(m.stroke.color), lineWidth: m.width) }
    else if sw > 0 { c.stroke(shape, with: .color(t.line.color), lineWidth: 1.5) }
    let tw = n.folded ? n.w - MapArt.CHIP : n.w, tx = n.folded && left ? MapArt.CHIP + tw / 2 : tw / 2
    if hidden {
      c.draw(Text("?").font(.geist(16, .semibold)).foregroundColor(t.muted.color), at: CGPoint(x: tx, y: n.h / 2), anchor: .center)
    } else {
      let size = MapArt.SIZE[lv], lh = (n.h - 2 * MapArt.PAD_Y - (n.level == 0 ? 6 : 0)) / Double(max(1, n.lines.count)), top = n.h / 2 - Double(n.lines.count - 1) * lh / 2
      let room = tw - 2 * MapArt.PAD_X + 4
      for (i, s) in n.lines.enumerated() {
        let label = n.level == 0 && s.isEmpty ? art.title : s
        let r = c.resolve(Text(label).font(.geist(size, MapArt.WEIGHT[lv])).foregroundColor(ink.color))
        let w = MapDrawing.width(r, "\(lv)|" + label)
        let p = CGPoint(x: tx, y: top + Double(i) * lh)
        // (a line the font draws wider than its box is squeezed, by 8% at most: §4.2)
        if w > room && room > 0 {
          var s2 = c; s2.translateBy(x: p.x, y: p.y); s2.scaleBy(x: max(0.92, room / w), y: 1); s2.draw(r, at: .zero, anchor: .center)
        } else { c.draw(r, at: p, anchor: .center) }
      }
    }
    if n.folded {
      let cx = left ? 4 : n.w - MapArt.CHIP + 2
      c.fill(Path(roundedRect: CGRect(x: cx, y: n.h / 2 - 9, width: MapArt.CHIP - 6, height: 18), cornerRadius: 9), with: .color((m != nil ? t.bg : t.surf).color))
      c.draw(Text("+\(n.hidden)").font(.geist(11, .semibold)).foregroundColor(t.muted.color), at: CGPoint(x: cx + (MapArt.CHIP - 6) / 2, y: n.h / 2), anchor: .center)
    }
    if !hidden && tone == "weak" { c.fill(Path(ellipseIn: CGRect(x: n.w - 9 - 3.5, y: 9 - 3.5, width: 7, height: 7)), with: .color(t.again.color)) }
    if art.sel == n.id {
      c.opacity = alpha
      c.stroke(Path(roundedRect: CGRect(x: -4, y: -4, width: n.w + 8, height: n.h + 8), cornerRadius: n.level == 0 ? min(20, n.h / 2 + 4) : 13, style: .circular), with: .color(t.text.color), lineWidth: 2)
    }
  }

  private static func extra(_ ctx: inout GraphicsContext, _ x: MapExtra, _ art: MapArt) {
    let t = art.t, fs = art.small, k = fs / 10, fz = art.chip, H = x.rect.height
    var cx = x.rect.minX
    for (item, w) in x.items {
      switch item {
      case .fresh:
        let hw = (fz + 6), y0 = x.rect.minY + (H - hw) / 2, m = MapArt.mark(t, "fresh")
        let r = Path(roundedRect: CGRect(x: cx, y: y0, width: w, height: hw), cornerRadius: hw / 2)
        ctx.fill(r, with: .color((MapArt.isDark(t) ? m.ink.alpha(0.3) : t.bg).color)); ctx.stroke(r, with: .color(m.stroke.color), lineWidth: 1)
        ctx.draw(Text("✦ New").font(.geist(fz, .semibold)).foregroundColor(m.ink.color), at: CGPoint(x: cx + w / 2, y: y0 + hw / 2), anchor: .center)
      case .badge(let note, let cards):
        let h = fs + 6, y0 = x.rect.minY + (H - h) / 2, cy = y0 + h / 2
        let r = Path(roundedRect: CGRect(x: cx, y: y0, width: w, height: h), cornerRadius: h / 2)
        ctx.fill(r, with: .color(t.bg.color)); ctx.stroke(r, with: .color(t.line.color), lineWidth: 1)
        var xx = cx + 5 * k
        if note {
          let gw = 7 * k
          var p = Path(); p.move(to: CGPoint(x: xx, y: cy - 2 * k)); p.addLine(to: CGPoint(x: xx + gw, y: cy - 2 * k)); p.move(to: CGPoint(x: xx, y: cy + 1.5 * k)); p.addLine(to: CGPoint(x: xx + gw * 0.65, y: cy + 1.5 * k))
          ctx.stroke(p, with: .color(t.muted.color), style: StrokeStyle(lineWidth: 1.3 * k, lineCap: .round))
          xx += gw + 5 * k
        }
        if cards > 0 {
          ctx.stroke(Path(roundedRect: CGRect(x: xx, y: cy - 4.2 * k, width: 6.5 * k, height: 8.4 * k), cornerRadius: 1.5 * k), with: .color(t.muted.color), lineWidth: 1.2 * k)
          ctx.draw(Text("\(cards)").font(.geist(fs, .semibold)).foregroundColor(t.muted.color), at: CGPoint(x: xx + 9.5 * k, y: cy), anchor: .leading)
        }
      case .weak(let n):
        let hw = fz + 6, y0 = x.rect.minY + (H - hw) / 2, m = MapArt.mark(t, "weak")
        let r = Path(roundedRect: CGRect(x: cx, y: y0, width: w, height: hw), cornerRadius: hw / 2)
        ctx.fill(r, with: .color(m.fill.color)); ctx.stroke(r, with: .color(m.stroke.color), lineWidth: 1)
        ctx.draw(Text("\(n) weak").font(.geist(fz, .semibold)).foregroundColor(m.ink.color), at: CGPoint(x: cx + w / 2, y: y0 + hw / 2), anchor: .center)
      }
      cx += w + 4
    }
  }
}

// ---------- the page's stage ----------
/// The map on the page: drawn at the camera, with its gestures. Everything it does is told to its owner (Screens/MapPage.swift), which keeps the
/// state; the stage keeps only what a gesture is in the middle of.
struct MapStage: View {
  var boxes: [MapBox]
  var was: [MapBox]?
  var art: MapArt
  var extras: [String: MapExtra]
  var glide: Double
  /// The page's camera: written when a pan or a pinch ends (or is cancelled), not with every move of the finger.
  @Binding var cam: MapCam
  /// A tap on an idea (its id; "" on empty space), on a folded idea's "+N" chip, and a double tap (an idea's id, or "" for empty space).
  var tap: (String) -> Void
  var unfold: (String) -> Void
  var doubleTap: (String) -> Void
  /// The camera was moved by hand (a pan or a pinch).
  var moved: () -> Void = {}
  @State private var start: MapCam? = nil
  @State private var pinch: (cam: MapCam, at: CGPoint)? = nil
  @State private var lastTap: (at: Date, p: CGPoint)? = nil
  /// The camera while a finger moves it (nil otherwise): only the stage draws again, frame by frame.
  @State private var live: MapCam? = nil
  /// A pan or a pinch is going on (false again when it ends or is cancelled: the camera then goes to the page).
  @GestureState private var moving = false
  private var shown: MapCam { live ?? cam }

  var body: some View {
    MapDrawing(boxes: boxes, was: was, art: art, extras: extras, cam: shown, glide: glide)
      .contentShape(Rectangle())
      .gesture(
        DragGesture(minimumDistance: 4)
          .onChanged { v in
            guard pinch == nil else { return }
            if start == nil { start = shown; moved() }
            let s = start!
            var tx = Transaction(); tx.disablesAnimations = true
            withTransaction(tx) { live = MapCam(z: s.z, x: s.x + v.translation.width, y: s.y + v.translation.height) }
          }
          .simultaneously(with: MagnifyGesture()
            .onChanged { v in
              if pinch == nil { pinch = (shown, v.startLocation); moved() }
              let p = pinch!, z = max(0.5, min(2.5, p.cam.z * v.magnification)), a = p.at
              var tx = Transaction(); tx.disablesAnimations = true
              withTransaction(tx) { live = MapCam(z: z, x: a.x - (a.x - p.cam.x) * z / p.cam.z, y: a.y - (a.y - p.cam.y) * z / p.cam.z) }
            }
            .onEnded { _ in pinch = nil; start = nil })
          .updating($moving) { _, on, _ in on = true }
      )
      .onChange(of: moving) { _, on in if !on { settle() } }
      .simultaneousGesture(SpatialTapGesture().onEnded { v in hit(v.location) })
  }
  /// The gesture is over: the page gets the camera it left.
  private func settle() {
    start = nil; pinch = nil
    guard let l = live else { return }
    var tx = Transaction(); tx.disablesAnimations = true
    withTransaction(tx) { cam = l; live = nil }
  }

  /// A tap, through the inverse of the camera: the box under it (its whole box, and at least 44 pt of it), or a fold chip.
  private func hit(_ p: CGPoint) {
    let cam = shown
    let mx = (p.x - cam.x) / cam.z, my = (p.y - cam.y) / cam.z, slop = max(0, 22 / cam.z)
    let B = boxes
    // (a folded idea's chip first: 44 pt around it)
    for b in B where b.folded {
      let cx = b.side < 0 ? b.x + 4 + 10 : b.x + b.w - MapArt.CHIP + 2 + 10, cy = b.y + b.h / 2
      if abs(mx - cx) <= max(13, slop) && abs(my - cy) <= max(9, slop) && !art.hidden.contains(b.id) { unfold(b.id); return }
    }
    let inside = B.filter { $0.rect.contains(CGPoint(x: mx, y: my)) }
    let near = inside.first ?? B.filter { b in
      let r = b.rect.insetBy(dx: -max(0, (44 / cam.z - b.w) / 2), dy: -max(0, (44 / cam.z - b.h) / 2))
      return r.contains(CGPoint(x: mx, y: my))
    }.min { a, b in hypot(a.rect.midX - mx, a.rect.midY - my) < hypot(b.rect.midX - mx, b.rect.midY - my) }
    let id = near?.id ?? ""
    let now = Date()
    if let l = lastTap, now.timeIntervalSince(l.at) < 0.3, hypot(l.p.x - p.x, l.p.y - p.y) < 30 { lastTap = nil; doubleTap(id); return }
    lastTap = (now, p)
    tap(id)
  }
}

// ---------- a map inside a Note ----------
/// A map shown inside a Note (§9.1): maps.previewOf's model, with the weak-spots tints and no rings, knobs or blanks; nothing moves under a
/// finger, so scrolling the Note is never caught. Its box's color is `bg`.
struct MapPreviewView: View {
  @Environment(\.theme) private var t
  let preview: MapPreview
  /// The box's own color (the cut edges fade into it).
  var bg: Color? = nil
  var body: some View {
    Canvas { ctx, size in
      let P = preview, s = P.scale, tc = t.colors
      // (the model is P.w wide; the box may be another width: it is centred, cut at the sides)
      ctx.translateBy(x: (size.width - P.w) / 2, y: (size.height - P.h) / 2)
      var links = Path()
      for c in P.curves { links.move(to: CGPoint(x: c[0], y: c[1])); links.addCurve(to: CGPoint(x: c[6], y: c[7]), control1: CGPoint(x: c[2], y: c[3]), control2: CGPoint(x: c[4], y: c[5])) }
      ctx.stroke(links, with: .color(tc.line.color), style: StrokeStyle(lineWidth: (1.5 * max(s, 0.6) * 10).rounded() / 10, lineCap: .round))
      for n in P.nodes {
        let lv = min(n.level, 2), m = n.tone.flatMap { ["weak", "getting", "solid"].contains($0) ? MapArt.mark(tc, $0) : nil }
        let inv = n.level == 0 && m == nil, fs = (MapArt.SIZE[lv] * s * 10).rounded() / 10
        let fill = m?.fill ?? (inv ? tc.inv : n.level == 1 ? tc.surf2 : tc.bg), ink = inv ? tc.invText : tc.text
        var c = ctx; c.translateBy(x: n.x, y: n.y)
        let shape = Path(roundedRect: CGRect(x: 0, y: 0, width: n.w, height: n.h), cornerRadius: (n.level == 0 ? min(16, n.h / max(s, 0.01) / 2) : 10) * s)
        c.fill(shape, with: .color(fill.color))
        if let m { c.stroke(shape, with: .color(m.stroke.color), lineWidth: 1.5 * s) } else if n.level >= 2 { c.stroke(shape, with: .color(tc.line.color), lineWidth: (1.5 * max(s, 0.6) * 10).rounded() / 10) }
        let cw = MapArt.CHIP * s, tw = n.folded ? n.w - cw : n.w, left = n.side < 0, tx = n.folded && left ? cw + tw / 2 : tw / 2
        let lh = n.lines.isEmpty ? 0 : (n.h - 2 * MapArt.PAD_Y * s - (n.level == 0 ? 6 * s : 0)) / Double(n.lines.count), top = n.h / 2 - Double(n.lines.count - 1) * lh / 2
        for (i, l) in n.lines.enumerated() { c.draw(Text(l).font(.geist(fs, MapArt.WEIGHT[lv])).foregroundColor(ink.color), at: CGPoint(x: tx, y: top + Double(i) * lh), anchor: .center) }
        if n.folded {
          let cx = left ? 4 * s : n.w - cw + 2 * s
          c.fill(Path(roundedRect: CGRect(x: cx, y: n.h / 2 - 9 * s, width: (MapArt.CHIP - 6) * s, height: 18 * s), cornerRadius: 9 * s), with: .color(tc.surf.color))
          c.draw(Text("+\(n.hidden)").font(.geist(11 * s, .semibold)).foregroundColor(tc.muted.color), at: CGPoint(x: cx + (MapArt.CHIP - 6) * s / 2, y: n.h / 2), anchor: .center)
        }
        if n.tone == "weak" { let r = 3.5 * max(s, 0.7); c.fill(Path(ellipseIn: CGRect(x: n.w - 9 * s - r, y: 9 * s - r, width: 2 * r, height: 2 * r)), with: .color(tc.again.color)) }
      }
      // (a cut edge fades into the box)
      let B = bg ?? tc.surf.color, F = 36.0
      func fade(_ r: CGRect, _ from: UnitPoint, _ to: UnitPoint) {
        ctx.fill(Path(r), with: .linearGradient(Gradient(colors: [B, B.opacity(0)]), startPoint: CGPoint(x: r.minX + from.x * r.width, y: r.minY + from.y * r.height), endPoint: CGPoint(x: r.minX + to.x * r.width, y: r.minY + to.y * r.height)))
      }
      let W = max(P.w, size.width), x0 = -(size.width - P.w) / 2
      if P.cut.left { fade(CGRect(x: x0, y: 0, width: F + (size.width - P.w) / 2, height: P.h), .leading, .trailing) }
      if P.cut.right { fade(CGRect(x: P.w - F, y: 0, width: F + (size.width - P.w) / 2, height: P.h), .trailing, .leading) }
      if P.cut.top { fade(CGRect(x: x0, y: 0, width: W, height: 28), .top, .bottom) }
      if P.cut.bottom { fade(CGRect(x: x0, y: P.h - 28, width: W, height: 28), .bottom, .top) }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
