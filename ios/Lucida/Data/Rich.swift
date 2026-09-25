// Card text (web/rich.js, ported): short markdown that AI apps can read and write.
//   **bold**  *italic*  <u>underline</u>  ~~strikethrough~~  ==highlight==  $math$ or \(math\)
//   [[blank]] on fill-in-the-blank cards; a line can start with "# " (also ## and ###), "- ", or "1. ".
// Lines are runs of text with marks, in this order: k blank, h highlight, s strikethrough, u underline, i italic,
// b bold, m math.
import Foundation

enum Rich {
  struct Run: Equatable { var t: String; var m: String }
  struct Line: Equatable { var kind: String; var runs: [Run] }
  struct Group { var blank: Bool; var runs: [Run]; var text: String }

  static let ORDER: [Character] = Array("khsuibm")
  static func norm(_ m: String) -> String {
    var seen = Set<Character>()
    return String(m.filter { ORDER.contains($0) && seen.insert($0).inserted }.sorted { ORDER.firstIndex(of: $0)! < ORDER.firstIndex(of: $1)! })
  }
  static func tidy(_ runs: [Run]) -> [Run] {
    var out: [Run] = []
    for r in runs where !r.t.isEmpty {
      if let p = out.last, p.m == r.m { out[out.count - 1].t += r.t } else { out.append(r) }
    }
    return out
  }

  // ---------- reading ----------
  private static let TAGS: [(Character, NSRegularExpression, NSRegularExpression)] = [
    ("b", rx("^<(?:b|strong)>", true), rx("^</(?:b|strong)>", true)), ("i", rx("^<(?:i|em)>", true), rx("^</(?:i|em)>", true)),
    ("u", rx("^<u>", true), rx("^</u>", true)), ("s", rx("^<(?:s|del|strike)>", true), rx("^</(?:s|del|strike)>", true)),
    ("h", rx("^<mark>", true), rx("^</mark>", true))
  ]
  static func rx(_ p: String, _ ci: Bool = false) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: ci ? [.caseInsensitive] : []) }
  private static func matchAt(_ re: NSRegularExpression, _ s: String) -> String? {
    let ns = s as NSString
    guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) else { return nil }
    return ns.substring(with: m.range)
  }
  private static func isPunct(_ c: Character) -> Bool {
    guard let a = c.asciiValue else { return false }
    return (33...47).contains(a) || (58...64).contains(a) || (91...96).contains(a) || (123...126).contains(a)
  }

  /// $x$ is math when the $ hugs the formula: "$5 and $6" stays money.
  private static func mathEnd(_ s: [Character], _ i: Int) -> Int {
    guard i + 1 < s.count, !s[i + 1].isWhitespace, s[i + 1] != "$" else { return -1 }
    var j = i + 1
    while j < s.count {
      if s[j] == "\\" { j += 2; continue }
      if s[j] == "$" && !s[j - 1].isWhitespace && !(j + 1 < s.count && s[j + 1].isNumber) { return j }
      j += 1
    }
    return -1
  }

  private struct Tok { var k: Character; var v = ""; var m: Character = " "; var role = ""; var raw = ""; var pre: Character? = nil; var post: Character? = nil; var on = false }

  static func inline(_ str: String, cloze: Bool) -> [Run] {
    let s = Array(str)
    var toks: [Tok] = [], buf = "", i = 0
    func flush() { if !buf.isEmpty { toks.append(Tok(k: "x", v: buf)) }; buf = "" }
    while i < s.count {
      let c = s[i], two = i + 1 < s.count ? String(s[i...i + 1]) : String(c)
      if two == "\\(" {
        var j = i + 2, found = -1
        while j + 1 < s.count { if s[j] == "\\" && s[j + 1] == ")" { found = j; break }; j += 1 }
        if found > i + 2 { flush(); toks.append(Tok(k: "m", v: String(s[(i + 2)..<found]))); i = found + 2; continue }
      }
      if c == "\\" && i + 1 < s.count && isPunct(s[i + 1]) { buf.append(s[i + 1]); i += 2; continue }
      if c == "$" {
        let j = mathEnd(s, i)
        if j > 0 { flush(); toks.append(Tok(k: "m", v: String(s[(i + 1)..<j]).replacingOccurrences(of: "\\$", with: "$"))); i = j + 1; continue }
      }
      if c == "<" {
        let rest = String(s[i...])
        var hit: Tok? = nil
        for (m, o, cl) in TAGS {
          if let r = matchAt(o, rest) { hit = Tok(k: "d", m: m, role: "open", raw: r); break }
          if let r = matchAt(cl, rest) { hit = Tok(k: "d", m: m, role: "close", raw: r); break }
        }
        if let hit { flush(); toks.append(hit); i += hit.raw.count; continue }
      }
      if cloze && (two == "[[" || two == "]]") { flush(); toks.append(Tok(k: "d", m: "k", role: two == "[[" ? "open" : "close", raw: two)); i += 2; continue }
      let d: Character? = two == "**" ? "b" : two == "~~" ? "s" : two == "==" ? "h" : c == "*" ? "i" : nil
      if let d {
        let n = d == "i" ? 1 : 2
        flush()
        toks.append(Tok(k: "d", m: d, role: "tog", raw: String(s[i..<(i + n)]), pre: i > 0 ? s[i - 1] : nil, post: i + n < s.count ? s[i + n] : nil))
        i += n; continue
      }
      buf.append(c); i += 1
    }
    flush()
    // Pair each style's start with its end. A start with no end is just text ("5 * 3").
    var open: [Character: Int] = [:]
    for n in toks.indices where toks[n].k == "d" {
      let t = toks[n], o = open[t.m]
      if t.role == "open" { if o == nil { open[t.m] = n }; continue }
      if t.role == "close" { if let o { toks[n].on = true; toks[o].on = true; open[t.m] = nil }; continue }
      if o == nil { if let p = t.post, !p.isWhitespace { open[t.m] = n } }
      else if let p = t.pre, !p.isWhitespace { toks[n].on = true; toks[o!].on = true; open[t.m] = nil }
    }
    var runs: [Run] = [], on: [Character] = []
    for t in toks {
      let m = String(on)
      if t.k == "x" { runs.append(Run(t: t.v, m: norm(m))) }
      else if t.k == "m" { runs.append(Run(t: t.v, m: norm(m + "m"))) }
      else if !t.on { runs.append(Run(t: t.raw, m: norm(m))) }
      else if let at = on.firstIndex(of: t.m) { on.remove(at: at) }
      else { on.append(t.m) }
    }
    return tidy(runs)
  }

  private static let LEAD: [(NSRegularExpression, String)] = [(rx("^#\\s+"), "h1"), (rx("^##\\s+"), "h2"), (rx("^###\\s+"), "h3"), (rx("^\\s*[-*+]\\s+"), "li"), (rx("^\\s*\\d{1,3}[.)]\\s+"), "ol")]
  static func parse(_ md: String?, cloze: Bool = false) -> [Line] {
    let text = (md ?? "").replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
    return text.components(separatedBy: "\n").map { line in
      for (re, kind) in LEAD {
        if let b = matchAt(re, line) { return Line(kind: kind, runs: inline(String(line.dropFirst(b.count)), cloze: cloze)) }
      }
      return Line(kind: "", runs: inline(line, cloze: cloze))
    }
  }

  // ---------- plain text ----------
  static func groups(_ runs: [Run]) -> [Group] {
    var out: [Group] = []
    for r in runs {
      let k = r.m.contains("k")
      if let p = out.last, p.blank == k { out[out.count - 1].runs.append(r); out[out.count - 1].text += r.t } else { out.append(Group(blank: k, runs: [r], text: r.t)) }
    }
    return out
  }
  private static func runText(_ r: Run, _ showMath: Bool) -> String { showMath && r.m.contains("m") ? mathText(r.t) : r.t }
  /// The words without formatting. `blank` replaces each blank (like "____"); `join` joins the lines; `showMath`
  /// writes formulas as they look (π r²) instead of as typed (\pi r^2).
  static func plain(_ md: String?, cloze: Bool = false, blank: String? = nil, join: String = "\n", showMath: Bool = false) -> String {
    parse(md, cloze: cloze).map { l in groups(l.runs).map { g in g.blank && blank != nil ? blank! : g.runs.map { runText($0, showMath) }.joined() }.joined() }.joined(separator: join)
  }
  /// The words hidden in a fill-in-the-blank card's blanks.
  static func blanks(_ md: String?, showMath: Bool = false) -> [String] {
    parse(md, cloze: true).flatMap { l in groups(l.runs).filter(\.blank).map { g in g.runs.map { runText($0, showMath) }.joined() } }
  }

  // ---------- math ----------
  struct MathBit { var t: String; var pos: String; var over: Bool; var italic = false; var bold = false }
  private static let SYM: [String: String] = ["alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "varepsilon": "ε", "zeta": "ζ", "eta": "η", "theta": "θ",
    "vartheta": "ϑ", "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ", "nu": "ν", "xi": "ξ", "pi": "π", "rho": "ρ", "sigma": "σ", "tau": "τ", "upsilon": "υ", "phi": "φ",
    "varphi": "φ", "chi": "χ", "psi": "ψ", "omega": "ω", "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ", "Pi": "Π", "Sigma": "Σ", "Upsilon": "Υ",
    "Phi": "Φ", "Psi": "Ψ", "Omega": "Ω", "times": "×", "div": "÷", "cdot": "·", "pm": "±", "mp": "∓", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥", "ne": "≠", "neq": "≠",
    "approx": "≈", "equiv": "≡", "sim": "∼", "propto": "∝", "infty": "∞", "partial": "∂", "nabla": "∇", "sum": "∑", "prod": "∏", "int": "∫", "oint": "∮", "to": "→",
    "rightarrow": "→", "leftarrow": "←", "gets": "←", "Rightarrow": "⇒", "Leftarrow": "⇐", "leftrightarrow": "↔", "Leftrightarrow": "⇔", "implies": "⇒", "iff": "⇔",
    "in": "∈", "notin": "∉", "ni": "∋", "subset": "⊂", "subseteq": "⊆", "supset": "⊃", "supseteq": "⊇", "cup": "∪", "cap": "∩", "emptyset": "∅", "varnothing": "∅",
    "forall": "∀", "exists": "∃", "neg": "¬", "land": "∧", "wedge": "∧", "lor": "∨", "vee": "∨", "angle": "∠", "circ": "∘", "degree": "°", "perp": "⊥", "parallel": "∥",
    "ldots": "…", "cdots": "⋯", "dots": "…", "prime": "′", "hbar": "ℏ", "ell": "ℓ", "aleph": "ℵ", "langle": "⟨", "rangle": "⟩", "mid": "∣", "star": "⋆", "oplus": "⊕",
    "otimes": "⊗", "quad": "\u{2003}", "qquad": "\u{2003}\u{2003}", ",": "\u{2009}", ";": "\u{2005}", ":": "\u{2005}", " ": " ", "!": "", "{": "{", "}": "}", "%": "%",
    "$": "$", "#": "#", "&": "&", "_": "_", "\\": "\\"]
  private static let WORDS: Set<String> = ["sin", "cos", "tan", "log", "ln", "exp", "lim", "min", "max", "det", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "gcd", "mod"]
  private static let ASCII: [String: String] = ["<=": "≤", ">=": "≥", "!=": "≠", "->": "→", "<-": "←", "=>": "⇒", "+-": "±"]

  static func mathBits(_ str: String, _ pos: String = "", _ over: Bool = false, _ out: inout [MathBit]) {
    let s = Array(str)
    var i = 0
    func command() -> String {
      // \name or \x
      var j = i + 1
      if j < s.count, s[j].isLetter, s[j].isASCII { while j < s.count, s[j].isLetter, s[j].isASCII { j += 1 } } else { j = min(j + 1, s.count) }
      let name = String(s[(i + 1)..<j]); i = j; return name
    }
    func arg() -> String {
      while i < s.count, s[i] == " " { i += 1 }
      guard i < s.count else { return "" }
      if s[i] == "{" {
        var d = 1, j = i + 1
        while j < s.count && d > 0 { d += s[j] == "{" ? 1 : s[j] == "}" ? -1 : 0; j += 1 }
        let r = String(s[(i + 1)..<(d > 0 ? j : j - 1)]); i = j; return r
      }
      if s[i] == "\\" { let start = i; _ = command(); return String(s[start..<i]) }
      let c = String(s[i]); i += 1; return c
    }
    while i < s.count {
      let c = s[i]
      if c == "^" || c == "_" { i += 1; mathBits(arg(), pos.isEmpty ? (c == "^" ? "sup" : "sub") : pos, over, &out); continue }
      if c == "{" || c == "}" { i += 1; continue }
      if c == "\\" {
        let n = command()
        if n == "sqrt" { out.append(MathBit(t: "√", pos: pos, over: over)); mathBits(arg(), pos, true, &out); continue }
        if n == "frac" { let a = arg(), b = arg(); mathBits(a, pos.isEmpty ? "sup" : pos, over, &out); out.append(MathBit(t: "⁄", pos: pos, over: over)); mathBits(b, pos.isEmpty ? "sub" : pos, over, &out); continue }
        if ["text", "mathrm", "textrm", "operatorname"].contains(n) { out.append(MathBit(t: arg(), pos: pos, over: over)); continue }
        if ["mathbf", "textbf", "boldsymbol"].contains(n) { let from = out.count; mathBits(arg(), pos, over, &out); for q in from..<out.count { out[q].bold = true }; continue }
        if ["left", "right", "displaystyle", "big", "Big"].contains(n) { continue }
        if let sym = SYM[n] { out.append(MathBit(t: sym, pos: pos, over: over)); continue }
        if WORDS.contains(n) { out.append(MathBit(t: n, pos: pos, over: over)); continue }
        out.append(MathBit(t: "\\" + n, pos: pos, over: over)); continue
      }
      let two = i + 1 < s.count ? String(s[i...i + 1]) : ""
      if let a = ASCII[two] { out.append(MathBit(t: a, pos: pos, over: over)); i += 2; continue }
      if c == "*" { out.append(MathBit(t: "×", pos: pos, over: over)); i += 1; continue }
      if c == "-" { out.append(MathBit(t: "−", pos: pos, over: over)); i += 1; continue }
      out.append(MathBit(t: String(c), pos: pos, over: over, italic: c.isLetter && c.isASCII))
      i += 1
    }
  }
  private static let SUP: [Character: Character] = ["0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "−": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", "n": "ⁿ", "i": "ⁱ"]
  private static let SUB: [Character: Character] = ["0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "−": "₋", "=": "₌", "(": "₍", ")": "₎"]
  /// A formula as plain text, with ² and ₂ where there are such letters.
  static func mathText(_ src: String) -> String {
    var bits: [MathBit] = []; mathBits(src, "", false, &bits)
    var parts: [(pos: String, t: String)] = []
    for x in bits { if let p = parts.last, p.pos == x.pos { parts[parts.count - 1].t += x.t } else { parts.append((x.pos, x.t)) } }
    return parts.map { x in
      if x.pos.isEmpty { return x.t }
      let map = x.pos == "sup" ? SUP : SUB
      if x.t.allSatisfy({ map[$0] != nil }) { return String(x.t.map { map[$0]! }) }
      return (x.pos == "sup" ? "^" : "_") + (x.t.count > 1 ? "(" + x.t + ")" : x.t)
    }.joined()
  }
}
