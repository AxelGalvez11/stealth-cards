// Card text as the canvas shows it (rich.js view): bold, italic, underline, strikethrough, highlight, math, headings,
// bullets and numbers, and on fill-in-the-blank cards, the blank as a pill in the line.
import SwiftUI

/// How a card's blanks show: the one being asked (-1 for all) as a pill, hidden or filled in.
struct ClozeStyle {
  var ask: Int = -1
  var hide: Bool
  var pad: CGFloat = 12
  var bg: Color
  var fg: Color
  /// The blank pops in when it fills (sc-pop).
  var pop = false
}

struct RichText: View {
  @Environment(\.theme) private var t
  let md: String
  var size: CGFloat
  var weight: Font.Weight = .regular
  var lh: CGFloat = 1.3
  var ls: CGFloat = 0
  var cloze: ClozeStyle? = nil
  var align: HorizontalAlignment = .leading
  /// The text color (the theme's text color when not given).
  var color: Color? = nil

  var body: some View {
    let lines = Rich.parse(md, cloze: cloze != nil)
    var n = 0, blankIndex = -1
    let items: [(Int, Rich.Line, Int)] = lines.enumerated().map { i, l in
      n = l.kind == "ol" ? n + 1 : 0
      let start = blankIndex + 1
      blankIndex += Rich.groups(l.runs).filter(\.blank).count
      return (i, l, start)
    }
    VStack(alignment: align, spacing: 0) {
      ForEach(items, id: \.0) { _, l, firstBlank in line(l, number: numberOf(lines, l), firstBlank: firstBlank) }
    }
  }

  private func numberOf(_ lines: [Rich.Line], _ line: Rich.Line) -> Int {
    guard line.kind == "ol", let i = lines.firstIndex(where: { $0 == line }) else { return 0 }
    var n = 0
    for k in 0...i { n = lines[k].kind == "ol" ? n + 1 : 0 }
    return n
  }

  /// A line's size, weight, line height, and letter-spacing (rich.js LINE).
  private func style(_ kind: String) -> (size: CGFloat, weight: Font.Weight, lh: CGFloat, ls: CGFloat) {
    switch kind {
    case "h1": return (size * 1.35, .bold, 1.25, -0.02)
    case "h2": return (size * 1.18, .bold, 1.3, -0.015)
    case "h3": return (size * 1.05, .semibold, 1.35, ls)
    default: return (size, weight, lh, ls)
    }
  }

  @ViewBuilder private func line(_ l: Rich.Line, number: Int, firstBlank: Int) -> some View {
    let st = style(l.kind)
    let body = Group {
      if let cloze, l.runs.contains(where: { $0.m.contains("k") }) { clozeLine(l, st, cloze, firstBlank) }
      else {
        LabelText(text: Rich.nsText(l.runs.isEmpty ? [Rich.Run(t: "\u{200B}", m: "")] : l.runs, size: st.size, weight: st.weight, ls: st.ls, lh: st.lh,
                                    color: UIColor(color ?? t.text), dark: t.dark, align: align == .center ? .center : .left))
      }
    }
    if l.kind == "li" || l.kind == "ol" {
      HStack(alignment: .firstTextBaseline, spacing: 0) {
        Text(l.kind == "li" ? "•" : "\(number).").font(.geist(st.size, st.weight)).frame(width: st.size * (l.kind == "li" ? 1.15 : 1.5), alignment: .leading)
        body
      }
    } else { body }
  }

  /// A line with a blank: words wrap around the pill, like the canvas's inline-block blank.
  private func clozeLine(_ l: Rich.Line, _ st: (size: CGFloat, weight: Font.Weight, lh: CGFloat, ls: CGFloat), _ c: ClozeStyle, _ firstBlank: Int) -> some View {
    let natural = st.size * GEIST_LINE, gap = max(0, st.size * st.lh - natural)
    var pieces: [(id: Int, blank: Bool, runs: [Rich.Run])] = [], k = firstBlank - 1, id = 0
    for g in Rich.groups(l.runs) {
      if g.blank {
        k += 1
        if c.ask >= 0 && c.ask != k { for r in words(g.runs.map { Rich.Run(t: $0.t, m: $0.m.replacingOccurrences(of: "k", with: "")) }) { pieces.append((id, false, r)); id += 1 } }
        else { pieces.append((id, true, g.runs.map { Rich.Run(t: $0.t, m: $0.m.replacingOccurrences(of: "k", with: "")) })); id += 1 }
      } else { for r in words(g.runs) { pieces.append((id, false, r)); id += 1 } }
    }
    return FlowLayout(spacing: 0, lineSpacing: gap) {
      ForEach(pieces, id: \.id) { p in
        if p.blank {
          Group {
            if c.hide { Color.clear.frame(width: st.size * 4) }
            else { Rich.text(p.runs, size: st.size, weight: st.weight, dark: t.dark).foregroundStyle(c.fg).tracking(st.ls * st.size) }
          }
          .padding(.horizontal, c.pad)
          .frame(height: natural)
          .background(Capsule().fill(c.bg))
          .modifier(PopIn(on: c.pop))
        } else {
          Rich.text(p.runs, size: st.size, weight: st.weight, dark: t.dark).tracking(st.ls * st.size).foregroundStyle(color ?? t.text).fixedSize().frame(height: natural)
        }
      }
    }
    .padding(.vertical, gap / 2)
  }

  /// Runs split into words, each keeping the space after it (the lines break between them).
  private func words(_ runs: [Rich.Run]) -> [[Rich.Run]] {
    var out: [[Rich.Run]] = [], cur: [Rich.Run] = []
    for r in runs {
      var buf = ""
      for ch in r.t {
        buf.append(ch)
        if ch == " " { cur.append(Rich.Run(t: buf, m: r.m)); out.append(cur); cur = []; buf = "" }
      }
      if !buf.isEmpty { cur.append(Rich.Run(t: buf, m: r.m)) }
    }
    if !cur.isEmpty { out.append(cur) }
    return out
  }
}

/// sc-pop: the blank fills in with a small bounce.
struct PopIn: ViewModifier {
  let on: Bool
  @State private var shown = false
  func body(content: Content) -> some View {
    content
      .scaleEffect(on && !shown ? 0.6 : 1).offset(y: on && !shown ? 4 : 0).opacity(on && !shown ? 0 : 1)
      .onAppear { if on { withAnimation(.timingCurve(0.34, 1.56, 0.64, 1, duration: 0.5)) { shown = true } } }
      .onChange(of: on) { _, v in if v { shown = false; withAnimation(.timingCurve(0.34, 1.56, 0.64, 1, duration: 0.5)) { shown = true } } }
  }
}

extension Rich {
  /// Runs as styled text: marks become weight, slant, lines, and highlight; math reads like a formula (Georgia,
  /// letters in italics, raised and lowered parts smaller).
  static func text(_ runs: [Run], size: CGFloat, weight: Font.Weight, dark: Bool) -> Text { Text(attributed(runs, size: size, weight: weight, dark: dark)) }

  static func attributed(_ runs: [Run], size: CGFloat, weight: Font.Weight, dark: Bool) -> AttributedString {
    var out = AttributedString()
    let hl = Color(hex: dark ? 0x2F3D9A : 0xDCE0FD)
    func mark(_ a: inout AttributedString, _ m: String) {
      if m.contains("u") { a.underlineStyle = .single }
      if m.contains("s") { a.strikethroughStyle = .single }
      if m.contains("h") { a.backgroundColor = hl }
    }
    for r in runs {
      if r.m.contains("m") {
        var bits: [MathBit] = []; mathBits(r.t, "", false, &bits)
        for b in bits where !b.t.isEmpty {
          var a = AttributedString(b.t)
          var f = Font.custom("Georgia", fixedSize: b.pos.isEmpty ? size : size * 0.7)
          if b.bold || r.m.contains("b") { f = f.bold() }
          if b.italic || r.m.contains("i") { f = f.italic() }
          a.font = f
          if b.pos == "sup" { a.baselineOffset = size * 0.36 } else if b.pos == "sub" { a.baselineOffset = -size * 0.2 }
          mark(&a, r.m)
          out += a
        }
        continue
      }
      var a = AttributedString(r.t)
      var f = Font.geist(size, r.m.contains("b") ? .bold : weight)
      if r.m.contains("i") { f = f.italic() }
      a.font = f
      mark(&a, r.m)
      out += a
    }
    return out
  }
}

/// Text laid out like CSS: every line exactly `lh` times the size, with the glyphs centered in it (half-leading), which
/// SwiftUI's Text can't do for lines tighter than the font's own.
struct LabelText: UIViewRepresentable {
  let text: NSAttributedString
  var lines = 0
  /// Cut off after `lines` with …, at the lines' exact height (like -webkit-line-clamp): other fonts filling in for
  /// missing letters, like CJK, don't make the lines taller.
  var clamp = false
  func makeUIView(context: Context) -> UILabel {
    let l = UILabel()
    l.numberOfLines = lines; l.lineBreakMode = .byWordWrapping; l.lineBreakStrategy = []; l.backgroundColor = .clear
    l.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    l.setContentHuggingPriority(.defaultHigh, for: .vertical)
    return l
  }
  func updateUIView(_ l: UILabel, context: Context) {
    l.attributedText = text; l.numberOfLines = lines
    if clamp { l.lineBreakMode = .byTruncatingTail }
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UILabel, context: Context) -> CGSize? {
    let w = proposal.width ?? 10_000
    let s = uiView.sizeThatFits(CGSize(width: w, height: .greatestFiniteMagnitude))
    return CGSize(width: min(w, ceil(s.width)), height: clamp ? s.height : ceil(s.height))
  }
}

extension Rich {
  /// Geist (or Georgia for math) as a UIFont; italics lean the letters, like a browser does for a font without them.
  static func uiFont(_ size: CGFloat, _ weight: Font.Weight, italic: Bool = false, math: Bool = false, bold: Bool = false) -> UIFont {
    var f = math ? (UIFont(name: bold ? "Georgia-Bold" : "Georgia", size: size) ?? .systemFont(ofSize: size))
                 : geist(bold ? .bold : weight, size)
    if italic {
      if math, let it = UIFont(name: bold ? "Georgia-BoldItalic" : "Georgia-Italic", size: size) { f = it }
      else { f = UIFont(descriptor: f.fontDescriptor.withMatrix(CGAffineTransform(a: 1, b: 0, c: 0.2, d: 1, tx: 0, ty: 0)), size: size) }
    }
    return f
  }

  /// Geist as a UIFont, with its weight axis set outright (UIKit can draw a variable font's named instance at the
  /// default weight).
  static func geist(_ weight: Font.Weight, _ size: CGFloat) -> UIFont {
    guard let f = UIFont(name: Fonts.name(weight, mono: false), size: size) else { return .systemFont(ofSize: size) }
    let wght: Int = weight == .bold || weight == .heavy || weight == .black ? 700 : weight == .semibold ? 600 : weight == .medium ? 500 : 400
    let axis = UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)
    return UIFont(descriptor: f.fontDescriptor.addingAttributes([axis: [0x7767_6874: wght]]), size: size)
  }

  /// Runs as an attributed string with CSS line height and letter-spacing (ls in em).
  static func nsText(_ runs: [Run], size: CGFloat, weight: Font.Weight, ls: CGFloat = 0, lh: CGFloat, color: UIColor, dark: Bool, align: NSTextAlignment = .left) -> NSAttributedString {
    let L = size * lh, shift = (L - size * GEIST_LINE) / 2
    let para = NSMutableParagraphStyle(); para.minimumLineHeight = L; para.maximumLineHeight = L; para.alignment = align; para.lineBreakMode = .byWordWrapping
    // Break lines like a browser does: no moving a lone last word down with the one before it.
    para.lineBreakStrategy = []
    let hl = UIColor(Color(hex: dark ? 0x2F3D9A : 0xDCE0FD))
    let out = NSMutableAttributedString()
    for r in runs {
      var base: [NSAttributedString.Key: Any] = [.paragraphStyle: para, .foregroundColor: color, .baselineOffset: shift]
      // A kern of 0 would switch off the font's own kerning, which browsers keep.
      if ls != 0 { base[.kern] = ls * size }
      if r.m.contains("u") { base[.underlineStyle] = NSUnderlineStyle.single.rawValue }
      if r.m.contains("s") { base[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
      if r.m.contains("h") { base[.backgroundColor] = hl }
      if r.m.contains("m") {
        var bits: [MathBit] = []; mathBits(r.t, "", false, &bits)
        for b in bits where !b.t.isEmpty {
          var a = base
          let small = !b.pos.isEmpty
          a[.font] = uiFont(small ? size * 0.7 : size, weight, italic: b.italic || r.m.contains("i"), math: true, bold: b.bold || r.m.contains("b"))
          if b.pos == "sup" { a[.baselineOffset] = shift + size * 0.36 } else if b.pos == "sub" { a[.baselineOffset] = shift - size * 0.2 }
          out.append(NSAttributedString(string: b.t, attributes: a))
        }
        continue
      }
      var a = base
      a[.font] = uiFont(size, weight, italic: r.m.contains("i"), bold: r.m.contains("b"))
      out.append(NSAttributedString(string: r.t, attributes: a))
    }
    return out
  }
}
