// The canvas's icons (design/build.mjs `I`, copied into Generated.swift), drawn the way the boards' svg() draws them:
// a 24 x 24 grid, stroked in the text color with round ends and corners, `stroke` wide on that grid.
import SwiftUI

struct Icon: View {
  let name: String
  var size: CGFloat
  var stroke: CGFloat
  init(_ name: String, _ size: CGFloat = 18, _ stroke: CGFloat = 1.8) { self.name = name; self.size = size; self.stroke = stroke }

  var body: some View {
    let parts = IconArt.parts(name), k = size / 24, width = stroke * k
    Canvas { ctx, _ in
      let scale = CGAffineTransform(scaleX: k, y: k)
      for part in parts {
        let path = Path(part.path).applying(scale)
        if part.fill { ctx.fill(path, with: .foreground) }
        if part.stroke { ctx.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .round)) }
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// Icon drawings parsed once from their SVG.
enum IconArt {
  struct Part { let path: CGPath; let fill: Bool; let stroke: Bool }
  private static var cache: [String: [Part]] = [:]
  static func parts(_ name: String) -> [Part] {
    if let hit = cache[name] { return hit }
    let made = SVG.parts(Generated.icons[name] ?? "")
    cache[name] = made
    return made
  }
}

/// Just enough SVG for the icons and marks: path, circle, rect, ellipse; fill="currentColor" and stroke="none".
enum SVG {
  static func parts(_ svg: String) -> [IconArt.Part] {
    var out: [IconArt.Part] = []
    let el = try! NSRegularExpression(pattern: "<(path|circle|rect|ellipse)\\b([^>]*)/?>")
    let at = try! NSRegularExpression(pattern: "([a-zA-Z-]+)=\"([^\"]*)\"")
    let ns = svg as NSString
    for m in el.matches(in: svg, range: NSRange(location: 0, length: ns.length)) {
      let tag = ns.substring(with: m.range(at: 1)), attrText = ns.substring(with: m.range(at: 2)) as NSString
      var a: [String: String] = [:]
      for x in at.matches(in: attrText as String, range: NSRange(location: 0, length: attrText.length)) {
        a[attrText.substring(with: x.range(at: 1))] = attrText.substring(with: x.range(at: 2))
      }
      let n = { (k: String) in CGFloat(Double(a[k] ?? "") ?? 0) }
      let p = CGMutablePath()
      switch tag {
      case "circle": p.addEllipse(in: CGRect(x: n("cx") - n("r"), y: n("cy") - n("r"), width: n("r") * 2, height: n("r") * 2))
      case "ellipse": p.addEllipse(in: CGRect(x: n("cx") - n("rx"), y: n("cy") - n("ry"), width: n("rx") * 2, height: n("ry") * 2))
      case "rect":
        let r = CGRect(x: n("x"), y: n("y"), width: n("width"), height: n("height")), rx = min(n("rx"), r.width / 2, r.height / 2)
        if rx > 0 { p.addRoundedRect(in: r, cornerWidth: rx, cornerHeight: rx) } else { p.addRect(r) }
      default: addPath(a["d"] ?? "", to: p)
      }
      out.append(.init(path: p, fill: a["fill"] == "currentColor", stroke: a["stroke"] != "none"))
    }
    return out
  }

  /// SVG path data (every command, relative and absolute; arcs become curves).
  static func addPath(_ d: String, to p: CGMutablePath) {
    let chars = Array(d.utf8)
    var i = 0
    func skip() { while i < chars.count, chars[i] == 32 || chars[i] == 44 || chars[i] == 10 || chars[i] == 9 || chars[i] == 13 { i += 1 } }
    func number() -> CGFloat? {
      skip()
      let start = i
      if i < chars.count, chars[i] == 43 || chars[i] == 45 { i += 1 }
      var digits = false, dot = false
      while i < chars.count {
        let c = chars[i]
        if c >= 48 && c <= 57 { digits = true; i += 1 }
        else if c == 46 && !dot { dot = true; i += 1 }
        else { break }
      }
      if i < chars.count, chars[i] == 101 || chars[i] == 69 {
        var j = i + 1
        if j < chars.count, chars[j] == 43 || chars[j] == 45 { j += 1 }
        if j < chars.count, chars[j] >= 48 && chars[j] <= 57 { i = j; while i < chars.count, chars[i] >= 48 && chars[i] <= 57 { i += 1 } }
      }
      guard digits else { i = start; return nil }
      return CGFloat(Double(String(decoding: chars[start..<i], as: UTF8.self)) ?? 0)
    }
    func flag() -> Bool { skip(); guard i < chars.count else { return false }; let v = chars[i] == 49; i += 1; return v }
    var cur = CGPoint.zero, start = CGPoint.zero, lastCtrl: CGPoint? = nil, lastQuad: CGPoint? = nil
    var cmd: UInt8 = 0
    while true {
      skip()
      if i >= chars.count { break }
      let c = chars[i]
      if (c >= 65 && c <= 90) || (c >= 97 && c <= 122) { cmd = c; i += 1 }
      else if cmd == 0 { break }
      let rel = cmd >= 97, base = rel ? cur : .zero
      switch cmd | 32 {
      case 109: // m
        guard let x = number(), let y = number() else { i = chars.count; break }
        cur = CGPoint(x: base.x + x, y: base.y + y); start = cur; p.move(to: cur)
        cmd = rel ? 108 : 76; lastCtrl = nil; lastQuad = nil
      case 108: // l
        guard let x = number(), let y = number() else { i = chars.count; break }
        cur = CGPoint(x: base.x + x, y: base.y + y); p.addLine(to: cur); lastCtrl = nil; lastQuad = nil
      case 104: // h
        guard let x = number() else { i = chars.count; break }
        cur = CGPoint(x: (rel ? cur.x : 0) + x, y: cur.y); p.addLine(to: cur); lastCtrl = nil; lastQuad = nil
      case 118: // v
        guard let y = number() else { i = chars.count; break }
        cur = CGPoint(x: cur.x, y: (rel ? cur.y : 0) + y); p.addLine(to: cur); lastCtrl = nil; lastQuad = nil
      case 99: // c
        guard let x1 = number(), let y1 = number(), let x2 = number(), let y2 = number(), let x = number(), let y = number() else { i = chars.count; break }
        let c1 = CGPoint(x: base.x + x1, y: base.y + y1), c2 = CGPoint(x: base.x + x2, y: base.y + y2)
        cur = CGPoint(x: base.x + x, y: base.y + y); p.addCurve(to: cur, control1: c1, control2: c2); lastCtrl = c2; lastQuad = nil
      case 115: // s
        guard let x2 = number(), let y2 = number(), let x = number(), let y = number() else { i = chars.count; break }
        let c1 = lastCtrl.map { CGPoint(x: 2 * cur.x - $0.x, y: 2 * cur.y - $0.y) } ?? cur
        let c2 = CGPoint(x: base.x + x2, y: base.y + y2)
        cur = CGPoint(x: base.x + x, y: base.y + y); p.addCurve(to: cur, control1: c1, control2: c2); lastCtrl = c2; lastQuad = nil
      case 113: // q
        guard let x1 = number(), let y1 = number(), let x = number(), let y = number() else { i = chars.count; break }
        let q = CGPoint(x: base.x + x1, y: base.y + y1)
        cur = CGPoint(x: base.x + x, y: base.y + y); p.addQuadCurve(to: cur, control: q); lastQuad = q; lastCtrl = nil
      case 116: // t
        guard let x = number(), let y = number() else { i = chars.count; break }
        let q = lastQuad.map { CGPoint(x: 2 * cur.x - $0.x, y: 2 * cur.y - $0.y) } ?? cur
        cur = CGPoint(x: base.x + x, y: base.y + y); p.addQuadCurve(to: cur, control: q); lastQuad = q; lastCtrl = nil
      case 97: // a
        guard let rx = number(), let ry = number(), let rot = number() else { i = chars.count; break }
        let large = flag(), sweep = flag()
        guard let x = number(), let y = number() else { i = chars.count; break }
        let to = CGPoint(x: base.x + x, y: base.y + y)
        addArc(p, from: cur, to: to, rx: rx, ry: ry, rotation: rot, large: large, sweep: sweep)
        cur = to; lastCtrl = nil; lastQuad = nil
      case 122: // z
        p.closeSubpath(); cur = start; lastCtrl = nil; lastQuad = nil
        cmd = 0
      default: i = chars.count
      }
    }
  }

  /// An SVG arc as cubic curves (the endpoint-to-center conversion in the SVG spec, then up to 90 degrees a piece).
  static func addArc(_ p: CGMutablePath, from p0: CGPoint, to p1: CGPoint, rx rx0: CGFloat, ry ry0: CGFloat, rotation: CGFloat, large: Bool, sweep: Bool) {
    var rx = abs(rx0), ry = abs(ry0)
    if rx == 0 || ry == 0 || p0 == p1 { p.addLine(to: p1); return }
    let phi = rotation * .pi / 180, cosP = cos(phi), sinP = sin(phi)
    let dx = (p0.x - p1.x) / 2, dy = (p0.y - p1.y) / 2
    let x1 = cosP * dx + sinP * dy, y1 = -sinP * dx + cosP * dy
    let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
    if lambda > 1 { rx *= sqrt(lambda); ry *= sqrt(lambda) }
    let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    var k = sqrt(max(0, num / den)); if large == sweep { k = -k }
    let cxp = k * rx * y1 / ry, cyp = -k * ry * x1 / rx
    let cx = cosP * cxp - sinP * cyp + (p0.x + p1.x) / 2, cy = sinP * cxp + cosP * cyp + (p0.y + p1.y) / 2
    func angle(_ ux: CGFloat, _ uy: CGFloat, _ vx: CGFloat, _ vy: CGFloat) -> CGFloat {
      let a = atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a
    }
    let t1 = angle(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
    var dt = angle((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
    if !sweep && dt > 0 { dt -= 2 * .pi } else if sweep && dt < 0 { dt += 2 * .pi }
    let n = max(1, Int(ceil(abs(dt) / (.pi / 2)))), step = dt / CGFloat(n)
    let alpha = 4 / 3 * tan(step / 4)
    func point(_ t: CGFloat) -> CGPoint { CGPoint(x: cx + rx * cos(t) * cosP - ry * sin(t) * sinP, y: cy + rx * cos(t) * sinP + ry * sin(t) * cosP) }
    func deriv(_ t: CGFloat) -> CGPoint { CGPoint(x: -rx * sin(t) * cosP - ry * cos(t) * sinP, y: -rx * sin(t) * sinP + ry * cos(t) * cosP) }
    var t = t1
    for s in 0..<n {
      let a = point(t), da = deriv(t), tb = t + step, b = s == n - 1 ? p1 : point(tb), db = deriv(tb)
      p.addCurve(to: b, control1: CGPoint(x: a.x + alpha * da.x, y: a.y + alpha * da.y), control2: CGPoint(x: b.x - alpha * db.x, y: b.y - alpha * db.y))
      t = tb
    }
  }
}

/// The Lucida mark: three dots, two above and one below (viewBox 33 x 30.5); `h` is its height.
struct Mark: View {
  var h: CGFloat
  var body: some View {
    let k = h / 30.5
    Canvas { ctx, _ in
      for (x, y) in [(7.0, 7.0), (26.0, 7.0), (16.5, 23.45)] {
        ctx.fill(Path(ellipseIn: CGRect(x: (x - 7) * k, y: (y - 7) * k, width: 14 * k, height: 14 * k)), with: .foreground)
      }
    }
    .frame(width: (h * 33 / 30.5).rounded(), height: h)
    .accessibilityHidden(true)
  }
}

/// The logo: the mark and "Lucida" (17px, 600, -.02em).
struct Logo: View {
  var size: CGFloat = 28
  var body: some View {
    HStack(spacing: 9) {
      Mark(h: (size / 2).rounded())
      Text("Lucida").css(17, .semibold, ls: -0.02)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Lucida")
  }
}
