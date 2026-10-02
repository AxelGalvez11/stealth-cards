// Reading cards from text, for Import cards and the onboarding's import (design/build.mjs READ_CARDS_JS, ported exactly: ios/tests/import-check.sh
// gives both the same texts). One card per line: a tab (Anki, Quizlet), a comma or semicolon (CSV), or " - " splits the front from the back, and a
// field in "quotes" can hold a comma. Anki's plain-text export starts with lines like "#separator:tab" and "#deck column:3" that say how to read
// it: its deck column sorts the cards into their decks (the last part of "Languages::Spanish"), and its note type, tags, and ID columns are left
// out. HTML from Anki (<b>, <br>) becomes card text (Rich.fromHtml), and Anki's {{c1::word}} blanks become fill-in-the-blank cards.
// Like the web's JavaScript, it reads the text as UTF-16 code units (a comma before an accent that combines with it still splits), trims what
// String.prototype.trim() trims (the BOM too), and keeps decks apart by their exact letters.
import Foundation

/// A card read from text: a front and back, or a fill-in-the-blank card's text (blanks in [[ ]]) and note.
struct ReadCard: Equatable {
  var front = "", back = "", cloze = false, text = "", note = ""
  /// As data.import takes it.
  var json: [String: Any] { cloze ? ["kind": "cloze", "text": text, "note": note] : ["front": front, "back": back] }
}

enum ReadCards {
  /// A text file's words (.txt, .csv, .tsv): UTF-8; else UTF-16 (by its mark, or with none when its zero bytes, the other half of plain letters,
  /// all sit on one side of each pair); else Windows-1252 or Latin-1, which read any byte (what Excel saves a CSV in on Windows). A mark at the
  /// start goes. Nil for a file that isn't text (zero bytes in it).
  static func text(_ d: Data) -> String? {
    let b = [UInt8](d.prefix(4096))
    func ok(_ s: String?) -> String? { s.flatMap { $0.contains("\0") ? nil : $0 } }
    if b.starts(with: [0xEF, 0xBB, 0xBF]), let s = ok(String(data: d.dropFirst(3), encoding: .utf8)) { return s }
    if b.starts(with: [0xFF, 0xFE]), let s = ok(String(data: d.dropFirst(2), encoding: .utf16LittleEndian)) { return s }
    if b.starts(with: [0xFE, 0xFF]), let s = ok(String(data: d.dropFirst(2), encoding: .utf16BigEndian)) { return s }
    if let s = ok(String(data: d, encoding: .utf8)) { return s }
    let pairs = b.count / 2, odd = stride(from: 1, to: pairs * 2, by: 2).filter { b[$0] == 0 }.count, even = stride(from: 0, to: pairs * 2, by: 2).filter { b[$0] == 0 }.count
    if odd > 0 && even * 20 <= odd, let s = ok(String(data: d, encoding: .utf16LittleEndian)) { return s }
    if even > 0 && odd * 20 <= even, let s = ok(String(data: d, encoding: .utf16BigEndian)) { return s }
    return ok(String(data: d, encoding: .windowsCP1252)) ?? ok(String(data: d, encoding: .isoLatin1))
  }

  typealias U = [UInt16]
  private static func str<C: Collection>(_ u: C) -> String where C.Element == UInt16 { String(decoding: u, as: UTF16.self) }

  /// What String.prototype.trim() takes off the ends, which is JavaScript's \s: tab, vertical tab, form feed, the BOM, every space separator, and the line breaks.
  static func space(_ c: UInt16) -> Bool { Rich.space(c) }
  static func trim(_ s: String) -> String {
    let u = U(s.utf16)
    var a = 0, b = u.count
    while a < b && space(u[a]) { a += 1 }
    while b > a && space(u[b - 1]) { b -= 1 }
    return a == 0 && b == u.count ? s : str(u[a..<b])
  }
  /// String.prototype.split with a string: the parts between its matches, left to right, empty ones kept.
  static func split(_ u: U, _ by: U) -> [String] {
    var out: [String] = [], from = 0, i = 0
    while i + by.count <= u.count {
      if u[i..<(i + by.count)].elementsEqual(by) { out.append(str(u[from..<i])); i += by.count; from = i } else { i += 1 }
    }
    out.append(str(u[from..<u.count]))
    return out
  }
  /// The text's lines, as split(/\r?\n/) makes them.
  static func lines(_ text: String) -> [String] {
    let u = U(text.utf16)
    var out: [String] = [], from = 0
    for i in u.indices where u[i] == 10 {
      out.append(str(u[from..<(i > from && u[i - 1] == 13 ? i - 1 : i)]))
      from = i + 1
    }
    out.append(str(u[from..<u.count]))
    return out
  }
  /// parseInt(s, 10): the whole number at the start (after spaces and a sign), or nil (NaN). Kept small: a column past any line is past it.
  static func parseInt(_ s: String?) -> Int? {
    guard let s else { return nil }
    let u = U(trim(s).utf16)
    var i = 0, neg = false, n = 0, any = false
    if i < u.count && (u[i] == 43 || u[i] == 45) { neg = u[i] == 45; i += 1 }
    while i < u.count && (48...57).contains(u[i]) { n = min(n * 10 + Int(u[i] - 48), 1 << 40); any = true; i += 1 }
    return any ? (neg ? -n : n) : nil
  }

  /// Splits a line at any of `seps`, keeping a "quoted" field whole ("" inside quotes is one quote).
  static func splitAt(_ l: String, _ seps: Set<UInt16>) -> [String] {
    let u = U(l.utf16)
    var out: [String] = [], cur: U = [], q = false, start = true, i = 0
    while i < u.count {
      let ch = u[i]
      if q {
        if ch != 34 { cur.append(ch) } else if i + 1 < u.count && u[i + 1] == 34 { cur.append(34); i += 1 } else { q = false }
      } else if ch == 34 && start { q = true; start = false }
      else if seps.contains(ch) { out.append(str(cur)); cur = []; start = true }
      else { cur.append(ch); start = false }
      i += 1
    }
    out.append(str(cur))
    return out
  }

  private static let DASH: U = [32, 45, 32]
  static func cells(_ l: String, _ sep: UInt16?) -> [String] {
    if let sep { return splitAt(l, [sep]) }
    let u = U(l.utf16)
    if u.contains(9) { return split(u, [9]) }
    let parts = split(u, DASH)
    if parts.count > 1 { return parts }
    return splitAt(l, [44, 59])
  }

  static func cell(_ x: String) -> String { Rich.looksHtml(x) ? Rich.fromHtml(x) : trim(x) }

  private static let clozeTest = try! NSRegularExpression(pattern: "\\{\\{c[0-9]+::")
  private static let clozeRe = try! NSRegularExpression(pattern: "\\{\\{c[0-9]+::([\\s\\S]+?)(?:::[^}]*)?\\}\\}")

  static func toCard(_ fields: [String]) -> ReadCard {
    let front = fields.first ?? "", back = fields.dropFirst().filter { !$0.isEmpty }.joined(separator: ", ")
    let r = NSRange(location: 0, length: front.utf16.count)
    if clozeTest.firstMatch(in: front, range: r) != nil {
      return ReadCard(cloze: true, text: clozeRe.stringByReplacingMatches(in: front, range: r, withTemplate: "[[$1]]"), note: back)
    }
    return ReadCard(front: front, back: back)
  }

  /// A line like "#deck column:3" (/^#([a-z ]+):(.*)$/i): what it names, in small letters, and its value.
  static func header(_ s: String) -> (String, String)? {
    let u = U(s.utf16)
    guard u.first == 35 else { return nil }
    var i = 1
    while i < u.count && ((65...90).contains(u[i]) || (97...122).contains(u[i]) || u[i] == 32) { i += 1 }
    guard i > 1, i < u.count, u[i] == 58 else { return nil }
    let rest = u[(i + 1)...]
    // (The pattern's . stops at a line break, and its $ is the end of the line.)
    if rest.contains(where: { $0 == 10 || $0 == 13 || $0 == 0x2028 || $0 == 0x2029 }) { return nil }
    return (str(u[1..<i]).lowercased(), trim(str(rest)))
  }

  /// Every deck in the text and its cards, in the order they first appear; `name` for cards that name no deck.
  static func read(_ text: String, name: String) -> [(name: String, cards: [ReadCard])] {
    let lines = lines(text)
    var head: [String: String] = [:]
    for l in lines { if let (k, v) = header(trim(l)) { head[k] = v } }
    let seps: [String: UInt16] = ["tab": 9, "comma": 44, "semicolon": 59, "pipe": 124, "colon": 58, "space": 32]
    let sep = seps[(head["separator"] ?? "").lowercased()]
    // A column, counted from 1 (none: -1).
    func col(_ k: String) -> Int { (parseInt(head[k + " column"]) ?? 0) - 1 }
    let deckCol = col("deck")
    let skip = Set([deckCol, col("notetype"), col("tags"), col("guid")].filter { $0 >= 0 })
    // (Decks are told apart by their letters, as the web's Map does: "é" and "e" with an accent mark are two decks.)
    var order: [U] = [], decks: [U: (name: String, cards: [ReadCard])] = [:]
    for l in lines {
      let s = trim(l)
      if s.isEmpty || s.utf16.first == 35 { continue }
      let cs = cells(sep == 9 ? l : s, sep)
      let card = toCard(cs.enumerated().filter { !skip.contains($0.offset) }.map { cell($0.element) })
      if card.cloze ? Rich.blanks(card.text).isEmpty : (card.front.isEmpty || card.back.isEmpty) { continue }
      var deck = name
      if deckCol >= 0 && deckCol < cs.count, let d = split(U(cs[deckCol].utf16), [58, 58]).last.map(trim), !d.isEmpty { deck = d }
      let key = U(deck.utf16)
      if decks[key] == nil { order.append(key); decks[key] = (deck, []) }
      decks[key]!.cards.append(card)
    }
    return order.map { decks[$0]! }
  }
}

// ---------- HTML to card text (web/rich.js fromHtml, looksHtml, and write) ----------
extension Rich {
  // (rich.js's pattern, /…\b…\d…/i, reads only the letters A to Z without their case, and its \b and \d are ASCII's: the same here, on a copy with A to Z made small.)
  private static let htmlRe = rx("</?(?:b|strong|i|em|u|s|del|strike|mark|br|div|p|span|ul|ol|li|sub|sup|font)(?![a-z0-9_])[^>]*>|&(?:nbsp|amp|lt|gt|quot|#[0-9]+);")
  /// Text that holds HTML (from Anki or another app).
  static func looksHtml(_ s: String) -> Bool {
    let small = String(decoding: s.utf16.map { (65...90).contains($0) ? $0 + 32 : $0 }, as: UTF16.self)
    return htmlRe.firstMatch(in: small, range: NSRange(location: 0, length: small.utf16.count)) != nil
  }

  /// Pasted or imported HTML turned into card text, keeping the styles cards have (bold, italics, underline, strikethrough, highlight, line
  /// breaks, headings, and lists), as web/rich.js fromHtml does with the browser's DOMParser and a walk over its tree (HtmlReader, below).
  static func fromHtml(_ html: String, cloze: Bool = false) -> String {
    var r = HtmlReader(cloze: cloze)
    var lines = r.read(html)
    // Spaces at the edges of lines go, and so do empty lines at the start and end.
    for i in lines.indices {
      var runs = tidy(lines[i].runs)
      if !runs.isEmpty { runs[0].t = HtmlReader.trim(runs[0].t, start: true) }
      if !runs.isEmpty { runs[runs.count - 1].t = HtmlReader.trim(runs[runs.count - 1].t, start: false) }
      lines[i].runs = tidy(runs)
    }
    while lines.count > 1 && lines[0].runs.isEmpty { lines.removeFirst() }
    while lines.count > 1 && lines[lines.count - 1].runs.isEmpty { lines.removeLast() }
    return write(lines, cloze: cloze)
  }
}

/// web/rich.js fromHtml's walk over the tree the browser's DOMParser builds, done while the HTML is read. What the parser does that changes card
/// text is done the HTML standard's way ("in body"): open tags close at the end; a block that starts closes an open <p>, a new <li> the one
/// before; a </p> with no <p> makes a line; bold and italics left open stay on past a block that closes (the "active formatting elements");
/// an end tag that isn't open, or only beyond a block, is left out; entities (&amp;, &lt without its ;, &#233;, &eacute;); and JavaScript's
/// \s for spaces. Tables, forms and SVG are read as plain elements.
private struct HtmlReader {
  typealias U = [UInt16]
  /// What an element does to its words' marks, in rich.js's order (font-weight, then <b>, font-style, then <i>, underline, strikethrough, highlight).
  struct Fx {
    var weight: String? = nil, style: String? = nil, bold = false, italic = false, under = false, strike = false, high = false, math = false, blank = false
    func apply(_ m: String) -> String {
      var mm = m
      // (rich.js's mm.replace('b', '') takes off the first b only.)
      func drop(_ c: Character) { if let i = mm.firstIndex(of: c) { mm.remove(at: i) } }
      if let w = weight { if w == "bold" || w == "bolder" || (Double(w) ?? 0) >= 600 { mm += "b" } else { drop("b") } } else if bold { mm += "b" }
      if let s = style { if s == "italic" || s == "oblique" { mm += "i" } else { drop("i") } } else if italic { mm += "i" }
      if under { mm += "u" }
      if strike { mm += "s" }
      if high { mm += "h" }
      if math { mm += "m" }
      if blank { mm += "k" }
      return mm
    }
  }
  struct El { var tag: String; var fx: Fx; var block: Bool; var fmt: Int? }

  let cloze: Bool
  var lines = [Rich.Line(kind: "", runs: [])]
  var stack: [El] = []
  /// The formatting elements still in effect (their id, tag and marks), which come back after a block closed over them.
  var active: [(id: Int, tag: String, fx: Fx)] = []
  var ids = 0
  /// The text node being written.
  var text: U = []
  init(cloze: Bool) { self.cloze = cloze }

  // rich.js's BLOCK, and the HTML standard's lists.
  static let BLOCK: Set<String> = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "blockquote", "pre", "tr", "table", "section", "article", "header", "footer"]
  static let VOID: Set<String> = ["area", "base", "basefont", "bgsound", "br", "col", "embed", "hr", "img", "image", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]
  static let FORMAT: Set<String> = ["a", "b", "big", "code", "em", "font", "i", "nobr", "s", "small", "strike", "strong", "tt", "u"]
  static let SPECIAL: Set<String> = ["address", "applet", "area", "article", "aside", "base", "basefont", "bgsound", "blockquote", "body", "br", "button", "caption", "center", "col",
    "colgroup", "dd", "details", "dir", "div", "dl", "dt", "embed", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6",
    "head", "header", "hgroup", "hr", "html", "iframe", "img", "input", "keygen", "li", "link", "listing", "main", "marquee", "menu", "meta", "nav", "noembed", "noframes",
    "noscript", "object", "ol", "p", "param", "plaintext", "pre", "script", "search", "section", "select", "source", "style", "summary", "table", "tbody", "td", "template",
    "textarea", "tfoot", "th", "thead", "title", "tr", "track", "ul", "wbr", "xmp"]
  /// Start tags that close an open <p> (in quirks mode, as DOMParser's documents are, a table doesn't).
  static let CLOSES_P: Set<String> = ["address", "article", "aside", "blockquote", "center", "details", "dialog", "dir", "div", "dl", "fieldset", "figcaption", "figure", "footer",
    "header", "hgroup", "main", "menu", "nav", "ol", "p", "search", "section", "summary", "ul", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "listing", "form", "li", "dd", "dt",
    "plaintext", "hr", "xmp"]
  /// End tags that close their element when it's open (in scope), and only then.
  static let BLOCK_END: Set<String> = ["address", "article", "aside", "blockquote", "button", "center", "details", "dialog", "dir", "div", "dl", "fieldset", "figcaption", "figure",
    "footer", "header", "hgroup", "listing", "main", "menu", "nav", "ol", "pre", "search", "section", "summary", "ul", "form", "applet", "marquee", "object"]
  static let SCOPE: Set<String> = ["applet", "caption", "html", "table", "td", "th", "marquee", "object", "template"]
  static let HEADINGS: Set<String> = ["h1", "h2", "h3", "h4", "h5", "h6"]
  static let TABLE: Set<String> = ["caption", "col", "colgroup", "tbody", "td", "tfoot", "th", "thead", "tr"]
  /// Elements whose words are text until their end tag (and RCDATA ones, whose entities are read); and those rich.js's walk leaves out.
  static let RAW: Set<String> = ["script", "style", "xmp", "iframe", "noembed", "noframes", "textarea", "title", "plaintext"]
  static let RCDATA: Set<String> = ["textarea", "title"]
  static let SKIP: Set<String> = ["script", "style", "head", "title", "meta", "template"]

  static func isSpace(_ c: UInt16) -> Bool { ReadCards.space(c) }
  static func trim(_ s: String, start: Bool) -> String {
    var u = U(s.utf16)
    if start { let n = u.prefix { isSpace($0) }.count; u.removeFirst(n) } else { while let c = u.last, isSpace(c) { u.removeLast() } }
    return String(decoding: u, as: UTF16.self)
  }
  static func letter(_ c: UInt16) -> Bool { (65...90).contains(c) || (97...122).contains(c) }
  static func alnum(_ c: UInt16) -> Bool { letter(c) || (48...57).contains(c) }
  static func small(_ u: ArraySlice<UInt16>) -> String { String(decoding: u.map { (65...90).contains($0) ? $0 + 32 : $0 }, as: UTF16.self) }

  // ---------- the tree ----------
  var hidden: Bool { stack.contains { Self.SKIP.contains($0.tag) } }
  /// rich.js's next(kind): a new line, unless this one has nothing yet (then it just takes the kind).
  mutating func next(_ kind: String) {
    if !lines[lines.count - 1].runs.isEmpty { lines.append(Rich.Line(kind: kind, runs: [])) } else { lines[lines.count - 1].kind = kind }
  }
  var marks: String { stack.reduce("") { $1.fx.apply($0) } }
  /// The text node ends: its spaces as one (nodeValue.replace(/\s+/g, ' ')), with the marks of where it is.
  mutating func flush() {
    guard !text.isEmpty else { return }
    defer { text = [] }
    guard !hidden else { return }
    var out: U = [], sp = false
    for c in text where c != 0 { if Self.isSpace(c) { if !sp { out.append(32) }; sp = true } else { out.append(c); sp = false } }
    if !out.isEmpty { lines[lines.count - 1].runs.append(Rich.Run(t: String(decoding: out, as: UTF16.self), m: Rich.norm(marks))) }
  }
  mutating func chars(_ u: U) {
    guard !u.isEmpty else { return }
    reconstruct()
    text += u
  }
  mutating func insert(_ tag: String, _ a: [String: String]) {
    flush()
    let block = Self.BLOCK.contains(tag), parent = stack.last?.tag
    stack.append(El(tag: tag, fx: fx(tag, a), block: block, fmt: nil))
    if block && !hidden { next(tag == "li" ? (parent == "ol" ? "ol" : "li") : ["h1", "h2", "h3"].contains(tag) ? tag : "") }
  }
  /// Closes the element at `k` and everything opened after it.
  mutating func pop(to k: Int) {
    guard k < stack.count else { return }
    flush()
    while stack.count > k {
      let e = stack.removeLast()
      if e.block && !hidden { next("") }
    }
  }
  func inScope(_ match: (String) -> Bool, button: Bool = false, list: Bool = false) -> Int? {
    for k in stack.indices.reversed() {
      let t = stack[k].tag
      if match(t) { return k }
      if Self.SCOPE.contains(t) || (button && t == "button") || (list && (t == "ol" || t == "ul")) { return nil }
    }
    return nil
  }
  mutating func closeP() { if let k = inScope({ $0 == "p" }, button: true) { pop(to: k) } }
  /// The formatting elements a block closed over come back before the next words (or element) go in.
  mutating func reconstruct() {
    guard let last = active.last, !stack.contains(where: { $0.fmt == last.id }) else { return }
    var k = active.count - 1
    while k > 0 && !stack.contains(where: { $0.fmt == active[k - 1].id }) { k -= 1 }
    flush()
    for j in k..<active.count {
      ids += 1
      active[j].id = ids
      stack.append(El(tag: active[j].tag, fx: active[j].fx, block: false, fmt: ids))
    }
  }

  // ---------- tags ----------
  mutating func start(_ tag: String, _ a: [String: String]) {
    switch tag {
    case "html", "body", "head", "frameset", "frame": return
    default: if Self.TABLE.contains(tag) && !stack.contains(where: { $0.tag == "table" }) { return }
    }
    if tag == "li" {
      for k in stack.indices.reversed() {
        let t = stack[k].tag
        if t == "li" { pop(to: k); break }
        if Self.SPECIAL.contains(t) && !["address", "div", "p"].contains(t) { break }
      }
    }
    if Self.CLOSES_P.contains(tag) { closeP() }
    if Self.HEADINGS.contains(tag), let top = stack.last, Self.HEADINGS.contains(top.tag) { pop(to: stack.count - 1) }
    if Self.VOID.contains(tag) {
      if ["area", "br", "embed", "img", "image", "keygen", "wbr", "input"].contains(tag) { reconstruct() }
      flush()
      if tag == "br" && !hidden { lines.append(Rich.Line(kind: "", runs: [])) }
      return
    }
    if Self.FORMAT.contains(tag) || !Self.SPECIAL.contains(tag) { reconstruct() }
    insert(tag, a)
    if Self.FORMAT.contains(tag) { ids += 1; stack[stack.count - 1].fmt = ids; active.append((ids, tag, stack[stack.count - 1].fx)) }
  }
  mutating func end(_ tag: String) {
    if tag == "p" {
      if inScope({ $0 == "p" }, button: true) == nil { insert("p", [:]) }
      closeP()
    } else if tag == "br" { start("br", [:]) }
    else if tag == "li" { if let k = inScope({ $0 == "li" }, list: true) { pop(to: k) } }
    else if Self.HEADINGS.contains(tag) { if let k = inScope({ Self.HEADINGS.contains($0) }) { pop(to: k) } }
    else if tag == "dd" || tag == "dt" || Self.BLOCK_END.contains(tag) { if let k = inScope({ $0 == tag }) { pop(to: k) } }
    else if tag == "body" || tag == "html" { return }
    else if Self.FORMAT.contains(tag) { adopt(tag) }
    else if tag == "table" || tag == "template" || Self.TABLE.contains(tag) { if let k = stack.lastIndex(where: { $0.tag == tag }) { pop(to: k) } }
    else { other(tag) }
  }
  /// An end tag closes the nearest open element with its name, unless a block is open inside it.
  mutating func other(_ tag: String) {
    for k in stack.indices.reversed() {
      if stack[k].tag == tag { pop(to: k); return }
      if Self.SPECIAL.contains(stack[k].tag) { return }
    }
  }
  /// The end of a formatting element (the standard's "adoption agency"): if a block was opened inside it, the block stays open and the words
  /// after it are without this element's marks; otherwise it closes with what was opened in it, and the formatting elements among those come back.
  mutating func adopt(_ tag: String) {
    guard let ai = active.lastIndex(where: { $0.tag == tag }) else { other(tag); return }
    guard let si = stack.lastIndex(where: { $0.fmt == active[ai].id }) else { active.remove(at: ai); return }
    if stack[(si + 1)...].contains(where: { Self.SCOPE.contains($0.tag) }) { return }
    if stack[(si + 1)...].contains(where: { Self.SPECIAL.contains($0.tag) }) { flush(); stack.remove(at: si) } else { pop(to: si) }
    active.remove(at: ai)
  }

  /// What an element does to marks: its tag, its style (as the browser keeps it: a value it can't read is left out), and data-sc.
  func fx(_ tag: String, _ a: [String: String]) -> Fx {
    var f = Fx(), deco = "", bg = ""
    for part in (a["style"] ?? "").split(separator: ";") {
      let kv = part.split(separator: ":", maxSplits: 1)
      guard kv.count == 2 else { continue }
      let k = kv[0].trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      let v = kv[1].lowercased().replacingOccurrences(of: #"\s*!\s*important\s*$"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
      switch k {
      case "font-weight":
        if ["normal", "bold", "bolder", "lighter"].contains(v) { f.weight = v }
        else if let n = Double(v), v.range(of: #"^[+]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$"#, options: .regularExpression) != nil, n >= 1, n <= 1000 { f.weight = v }
      case "font-style": if ["normal", "italic", "oblique"].contains(v) || v.hasPrefix("oblique ") { f.style = v }
      case "text-decoration", "text-decoration-line": deco += " " + v
      case "background-color": if let c = Self.color(v) { bg = c }
      case "background": bg = v.split(separator: " ").compactMap { Self.color(String($0)) }.first ?? "initial"
      default: break
      }
    }
    f.bold = tag == "b" || tag == "strong"
    f.italic = tag == "i" || tag == "em"
    f.under = tag == "u" || deco.contains("underline")
    f.strike = ["s", "del", "strike"].contains(tag) || deco.contains("line-through")
    f.high = tag == "mark" || (tag != "body" && !Self.BLOCK.contains(tag) && Self.highlights(bg))
    f.math = a["data-sc"] == "m"
    f.blank = a["data-sc"] == "k" && cloze
    return f
  }
  /// A color as the browser writes it back (#ff0 is rgb(255, 255, 0)), or nil when it isn't one.
  static func color(_ v: String) -> String? {
    if v.hasPrefix("#") {
      let h = Array(v.dropFirst()), hex = h.allSatisfy(\.isHexDigit)
      guard hex, [3, 4, 6, 8].contains(h.count) else { return nil }
      let full = h.count <= 4 ? h.flatMap { [$0, $0] } : h
      let n = stride(from: 0, to: full.count, by: 2).map { Int(String(full[$0...$0 + 1]), radix: 16) ?? 0 }
      if n.count == 4 { return "rgba(\(n[0]), \(n[1]), \(n[2]), \(n[3] == 255 ? "1" : String(Double(n[3]) / 255)))" }
      return "rgb(\(n[0]), \(n[1]), \(n[2]))"
    }
    if v.range(of: #"^(rgba?|hsla?)\([^)]*\)$"#, options: .regularExpression) != nil {
      let name = v.prefix { $0 != "(" }, parts = v.dropFirst(name.count + 1).dropLast().split { $0 == "," || $0 == " " || $0 == "/" }.map(String.init)
      // (rgb(255 255 255 / .5) and rgb(255,255,255) are written back as rgba(255, 255, 255, 0.5) and rgb(255, 255, 255).)
      let rgb = name.hasPrefix("rgb"), alpha = parts.count == 4 && parts[3] != "1"
      return (rgb ? (alpha ? "rgba" : "rgb") : String(name)) + "(" + (rgb && !alpha ? Array(parts.prefix(3)) : parts).joined(separator: ", ") + ")"
    }
    return v.range(of: "^[a-z]+$", options: .regularExpression) != nil ? v : nil
  }
  /// rich.js isHl: a background that marks words (not white, and not see-through).
  static func highlights(_ c: String) -> Bool {
    guard !c.isEmpty else { return false }
    let t = c.trimmingCharacters(in: .whitespaces)
    if c.range(of: "transparent|inherit|initial|none", options: .regularExpression) != nil { return false }
    if t.range(of: "^(#fff(fff)?|white)$", options: [.regularExpression, .caseInsensitive]) != nil { return false }
    if c.range(of: #"^rgba?\(\s*255\s*,\s*255\s*,\s*255"#, options: .regularExpression) != nil { return false }
    return t.range(of: #"^rgba\([^,]+,[^,]+,[^,]+,\s*0(\.0+)?\s*\)$"#, options: .regularExpression) == nil
  }

  // ---------- reading ----------
  mutating func read(_ html: String) -> [Rich.Line] {
    // (The parser's first step: CR LF and CR are LF.)
    var s: U = [], cr = false
    for c in html.utf16 { if c == 13 { s.append(10); cr = true } else { if !(c == 10 && cr) { s.append(c) }; cr = false } }
    var i = 0
    while i < s.count {
      if s[i] == 60 { i = tag(s, i); continue }
      if s[i] == 38 { let (u, n) = Self.entity(s, i, attr: false); chars(u); i = n; continue }
      var j = i
      while j < s.count && s[j] != 60 && s[j] != 38 { j += 1 }
      chars(U(s[i..<j])); i = j
    }
    pop(to: 0)
    flush()
    return lines
  }
  /// What starts at a "<": a tag, a comment (or something read as one), or just the letter. Gives where reading goes on.
  mutating func tag(_ s: U, _ i: Int) -> Int {
    let n = s.count
    func at(_ k: Int) -> UInt16? { k < n ? s[k] : nil }
    func until(_ c: UInt16, _ from: Int) -> Int { var k = from; while k < n && s[k] != c { k += 1 }; return min(n, k + 1) }
    guard let c = at(i + 1) else { chars([60]); return n }
    if c == 33 {   // <!
      if at(i + 2) == 45 && at(i + 3) == 45 {
        flush()
        var k = i + 4
        if at(k) == 62 { return k + 1 }
        if at(k) == 45 && at(k + 1) == 62 { return k + 2 }
        while k < n {
          if s[k] == 45 && at(k + 1) == 45 && at(k + 2) == 62 { return k + 3 }
          if s[k] == 45 && at(k + 1) == 45 && at(k + 2) == 33 && at(k + 3) == 62 { return k + 4 }
          k += 1
        }
        return n
      }
      if Self.small(s[(i + 2)..<min(n, i + 9)]) == "doctype" { return until(62, i + 2) }   // ignored where words go
      flush(); return until(62, i + 2)
    }
    if c == 63 { flush(); return until(62, i + 1) }   // <? is a comment
    if c == 47 {   // </
      guard let d = at(i + 2) else { chars([60, 47]); return n }
      if d == 62 { return i + 3 }
      if !Self.letter(d) { flush(); return until(62, i + 2) }
      let (name, _, _, k) = Self.tagParts(s, i + 2)
      guard let k else { return n }
      end(name)
      return k
    }
    guard Self.letter(c) else { chars([60]); return i + 1 }
    let (name, attrs, _, k0) = Self.tagParts(s, i + 1)
    guard var k = k0 else { return n }   // a tag cut off by the end is dropped
    // (A self-closing / means nothing on an element that isn't void.)
    if Self.RAW.contains(name) {
      if name == "xmp" || name == "plaintext" { closeP() }
      if name == "xmp" { reconstruct() }
      if name == "textarea" && at(k) == 10 { k += 1 }
      insert(name, attrs)
      var e = n
      if name != "plaintext" {
        var j = k
        while j + 1 < n {
          if s[j] == 60 && s[j + 1] == 47 && Self.small(s[(j + 2)..<min(n, j + 2 + name.utf16.count)]) == name {
            let after = j + 2 + name.utf16.count
            if after >= n || [9, 10, 12, 32, 47, 62].contains(s[after]) { e = j; break }
          }
          j += 1
        }
      }
      let body = U(s[k..<e])
      text += Self.RCDATA.contains(name) ? Self.decoded(body) : body
      if let si = stack.lastIndex(where: { $0.tag == name }) { pop(to: si) }
      if e >= n { return n }
      let (_, _, _, after) = Self.tagParts(s, e + 2)
      return after ?? n
    }
    start(name, attrs)
    if (name == "pre" || name == "listing") && at(k) == 10 { k += 1 }
    return k
  }
  /// A tag's name (small letters), its attributes (the first of each name), whether it ends in "/>", and where reading goes on (nil: the text
  /// ended inside it).
  static func tagParts(_ s: U, _ from: Int) -> (String, [String: String], Bool, Int?) {
    let n = s.count
    var k = from
    while k < n && ![9, 10, 12, 32, 47, 62].contains(s[k]) { k += 1 }
    let name = small(s[from..<k])
    var attrs: [String: String] = [:]
    while true {
      while k < n && [9, 10, 12, 32].contains(s[k]) { k += 1 }
      guard k < n else { return (name, attrs, false, nil) }
      if s[k] == 62 { return (name, attrs, false, k + 1) }
      if s[k] == 47 { if k + 1 < n && s[k + 1] == 62 { return (name, attrs, true, k + 2) }; k += 1; continue }
      let a = k
      k += 1
      while k < n && ![9, 10, 12, 32, 47, 61, 62].contains(s[k]) { k += 1 }
      let an = small(s[a..<k])
      while k < n && [9, 10, 12, 32].contains(s[k]) { k += 1 }
      var value: U = []
      if k < n && s[k] == 61 {
        k += 1
        while k < n && [9, 10, 12, 32].contains(s[k]) { k += 1 }
        if k < n && (s[k] == 34 || s[k] == 39) {
          let q = s[k], b = k + 1
          k = b
          while k < n && s[k] != q { k += 1 }
          guard k < n else { return (name, attrs, false, nil) }
          value = U(s[b..<k]); k += 1
        } else {
          let b = k
          while k < n && ![9, 10, 12, 32, 62].contains(s[k]) { k += 1 }
          value = U(s[b..<k])
        }
      }
      if attrs[an] == nil { attrs[an] = String(decoding: decoded(value, attr: true), as: UTF16.self) }
    }
  }
  static func decoded(_ u: U, attr: Bool = false) -> U {
    var out: U = [], i = 0
    while i < u.count {
      if u[i] == 38 { let (d, n) = entity(u, i, attr: attr); out += d; i = n } else { out.append(u[i]); i += 1 }
    }
    return out
  }
  static func digit(_ c: UInt16, hex: Bool) -> Int? {
    if (48...57).contains(c) { return Int(c - 48) }
    if hex && (65...70).contains(c) { return Int(c - 55) }
    if hex && (97...102).contains(c) { return Int(c - 87) }
    return nil
  }
  /// An entity at `i` (an "&"): what it stands for and where reading goes on; just the "&" when it isn't one.
  static func entity(_ s: U, _ i: Int, attr: Bool) -> (U, Int) {
    let n = s.count
    var k = i + 1
    if k < n && s[k] == 35 {   // &#
      k += 1
      let hex = k < n && (s[k] == 120 || s[k] == 88)
      if hex { k += 1 }
      let b = k
      var v = 0
      while k < n, let d = digit(s[k], hex: hex) {
        v = min(v * (hex ? 16 : 10) + d, 0x110000); k += 1
      }
      guard k > b else { return ([38], i + 1) }
      if k < n && s[k] == 59 { k += 1 }
      let w = [0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039,
               0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122,
               0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178][v] ?? v
      let scalar = (w == 0 || w > 0x10FFFF || (0xD800...0xDFFF).contains(w)) ? 0xFFFD : w
      return (U(String(Character(UnicodeScalar(UInt32(scalar)) ?? "\u{FFFD}")).utf16), k)
    }
    // A name: the longest one there is in the table, with its ; or (an old one) without.
    var e = k
    while e < n && alnum(s[e]) { e += 1 }
    let word = String(decoding: s[k..<e], as: UTF16.self), semi = e < n && s[e] == 59
    if semi, let v = ENTITIES[word] { return (v.text, e + 1) }
    var len = word.utf16.count
    while len > 0 {
      let w = String(word.prefix(len))
      if let v = ENTITIES[w], v.old {
        let after = k + len
        if attr && after < n && (s[after] == 61 || alnum(s[after])) { return ([38], i + 1) }
        return (v.text, after)
      }
      len -= 1
    }
    return ([38], i + 1)
  }
  /// HTML 4's named entities (and apos), as Chrome reads them; a * marks the old ones that also work without their ;.
  static let ENTITIES: [String: (text: U, old: Bool)] = {
    var out: [String: (text: U, old: Bool)] = [:]
    for item in ENTITY_LIST.split(separator: " ") {
      let kv = item.split(separator: "="), old = kv[0].hasSuffix("*"), name = old ? String(kv[0].dropLast()) : String(kv[0])
      let text = kv[1].split(separator: "+").compactMap { UInt32($0, radix: 16).flatMap(UnicodeScalar.init) }.map { String(Character($0)) }.joined()
      out[name] = (U(text.utf16), old)
    }
    return out
  }()
  static let ENTITY_LIST = "nbsp*=a0 iexcl*=a1 cent*=a2 pound*=a3 curren*=a4 yen*=a5 brvbar*=a6 sect*=a7 uml*=a8 copy*=a9 ordf*=aa laquo*=ab not*=ac shy*=ad reg*=ae macr*=af deg*=b0 plusmn*=b1 sup2*=b2 sup3*=b3 acute*=b4 micro*=b5 para*=b6 middot*=b7 cedil*=b8 sup1*=b9 ordm*=ba raquo*=bb frac14*=bc frac12*=bd frac34*=be iquest*=bf Agrave*=c0 Aacute*=c1 Acirc*=c2 Atilde*=c3 Auml*=c4 Aring*=c5 AElig*=c6 Ccedil*=c7 Egrave*=c8 Eacute*=c9 Ecirc*=ca Euml*=cb Igrave*=cc Iacute*=cd Icirc*=ce Iuml*=cf ETH*=d0 Ntilde*=d1 Ograve*=d2 Oacute*=d3 Ocirc*=d4 Otilde*=d5 Ouml*=d6 times*=d7 Oslash*=d8 Ugrave*=d9 Uacute*=da Ucirc*=db Uuml*=dc Yacute*=dd THORN*=de szlig*=df agrave*=e0 aacute*=e1 acirc*=e2 atilde*=e3 auml*=e4 aring*=e5 aelig*=e6 ccedil*=e7 egrave*=e8 eacute*=e9 ecirc*=ea euml*=eb igrave*=ec iacute*=ed icirc*=ee iuml*=ef eth*=f0 ntilde*=f1 ograve*=f2 oacute*=f3 ocirc*=f4 otilde*=f5 ouml*=f6 divide*=f7 oslash*=f8 ugrave*=f9 uacute*=fa ucirc*=fb uuml*=fc yacute*=fd thorn*=fe yuml*=ff fnof=192 Alpha=391 Beta=392 Gamma=393 Delta=394 Epsilon=395 Zeta=396 Eta=397 Theta=398 Iota=399 Kappa=39a Lambda=39b Mu=39c Nu=39d Xi=39e Omicron=39f Pi=3a0 Rho=3a1 Sigma=3a3 Tau=3a4 Upsilon=3a5 Phi=3a6 Chi=3a7 Psi=3a8 Omega=3a9 alpha=3b1 beta=3b2 gamma=3b3 delta=3b4 epsilon=3b5 zeta=3b6 eta=3b7 theta=3b8 iota=3b9 kappa=3ba lambda=3bb mu=3bc nu=3bd xi=3be omicron=3bf pi=3c0 rho=3c1 sigmaf=3c2 sigma=3c3 tau=3c4 upsilon=3c5 phi=3c6 chi=3c7 psi=3c8 omega=3c9 thetasym=3d1 upsih=3d2 piv=3d6 bull=2022 hellip=2026 prime=2032 Prime=2033 oline=203e frasl=2044 weierp=2118 image=2111 real=211c trade=2122 alefsym=2135 larr=2190 uarr=2191 rarr=2192 darr=2193 harr=2194 crarr=21b5 lArr=21d0 uArr=21d1 rArr=21d2 dArr=21d3 hArr=21d4 forall=2200 part=2202 exist=2203 empty=2205 nabla=2207 isin=2208 notin=2209 ni=220b prod=220f sum=2211 minus=2212 lowast=2217 radic=221a prop=221d infin=221e ang=2220 and=2227 or=2228 cap=2229 cup=222a int=222b there4=2234 sim=223c cong=2245 asymp=2248 ne=2260 equiv=2261 le=2264 ge=2265 sub=2282 sup=2283 nsub=2284 sube=2286 supe=2287 oplus=2295 otimes=2297 perp=22a5 sdot=22c5 lceil=2308 rceil=2309 lfloor=230a rfloor=230b lang=27e8 rang=27e9 loz=25ca spades=2660 clubs=2663 hearts=2665 diams=2666 quot*=22 amp*=26 lt*=3c gt*=3e OElig=152 oelig=153 Scaron=160 scaron=161 Yuml=178 circ=2c6 tilde=2dc ensp=2002 emsp=2003 thinsp=2009 zwnj=200c zwj=200d lrm=200e rlm=200f ndash=2013 mdash=2014 lsquo=2018 rsquo=2019 sbquo=201a ldquo=201c rdquo=201d bdquo=201e dagger=2020 Dagger=2021 permil=2030 lsaquo=2039 rsaquo=203a euro=20ac apos=27 AMP*=26 LT*=3c GT*=3e QUOT*=22 COPY*=a9 REG*=ae"
}

extension Rich {
  // ---------- writing (web/rich.js write) ----------
  /// JavaScript's \s, for the patterns below (ICU's has no vertical tab or BOM, and has none of rich.js's ASCII-only \d).
  private static let JS_S = "\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF"
  private static let MD: [Character: (String, String)] = ["b": ("**", "**"), "i": ("*", "*"), "s": ("~~", "~~"), "h": ("==", "=="), "u": ("<u>", "</u>"), "k": ("[[", "]]")]
  private static let TAG: [Character: (String, String)] = ["b": ("<b>", "</b>"), "i": ("<i>", "</i>"), "s": ("<s>", "</s>"), "h": ("<mark>", "</mark>"), "u": ("<u>", "</u>"), "k": ("[[", "]]")]
  private static func escText(_ t: String, _ safe: Bool) -> String {
    let s = t.replacingOccurrences(of: "([\\\\*$])", with: "\\\\$1", options: .regularExpression)
    if safe { return s.replacingOccurrences(of: "([~=<\\[\\]])", with: "\\\\$1", options: .regularExpression) }
    return s.replacingOccurrences(of: "~~", with: "\\~\\~").replacingOccurrences(of: "==", with: "\\=\\=")
      .replacingOccurrences(of: "<(?=/?(?:b|strong|i|em|u|s|del|strike|mark)>)", with: "\\\\<", options: [.regularExpression, .caseInsensitive])
  }
  private static func mathOut(_ t: String, _ safe: Bool) -> String {
    !safe && t.range(of: "^[^" + JS_S + "$](?:[^$]*[^" + JS_S + "$])?$", options: .regularExpression) != nil ? "$" + t + "$" : "\\(" + t + "\\)"
  }
  private enum Ev { case open(Character), close(Character), run(Run) }
  private static func writeLine(_ l: Line, _ safe: Bool) -> String {
    // Open and close styles around the runs, closing only what has to close; a blank is always outermost.
    var ev: [Ev] = [], stack: [Character] = []
    for r in l.runs {
      let has = Array(r.m.replacingOccurrences(of: "m", with: ""))
      let want = has.filter { $0 == "k" } + stack.filter { $0 != "k" && has.contains($0) } + has.filter { $0 != "k" && !stack.contains($0) }
      var p = 0
      while p < stack.count && p < want.count && stack[p] == want[p] { p += 1 }
      for q in stride(from: stack.count - 1, through: p, by: -1) { ev.append(.close(stack[q])) }
      stack = Array(stack.prefix(p))
      for m in want.dropFirst(p) { ev.append(.open(m)); stack.append(m) }
      ev.append(.run(r))
    }
    for q in stack.indices.reversed() { ev.append(.close(stack[q])) }
    // A style that starts or ends on a space is written as a tag: "**x **" wouldn't read back.
    var form = [Int: [Character: (String, String)]](), opens: [Int] = []
    for (n, e) in ev.enumerated() {
      switch e {
      case .open: opens.append(n)
      case .close:
        let o = opens.removeLast()
        let txt = ev[(o + 1)..<n].compactMap { if case .run(let r) = $0 { return r.t }; return nil }.joined()
        let tagged = safe || txt.utf16.first.map(ReadCards.space) == true || txt.utf16.last.map(ReadCards.space) == true
        form[o] = tagged ? TAG : MD; form[n] = tagged ? TAG : MD
      case .run: break
      }
    }
    return ev.enumerated().map { n, e in
      switch e {
      case .open(let m): return form[n]![m]!.0
      case .close(let m): return form[n]![m]!.1
      case .run(let r): return r.m.contains("m") ? mathOut(r.t, safe) : escText(r.t, safe)
      }
    }.joined()
  }
  private static func plainStart(_ s: String) -> String {
    s.replacingOccurrences(of: "^([" + JS_S + "]*)([-+]|#{1,3})(?=[" + JS_S + "])", with: "$1\\\\$2", options: .regularExpression)
      .replacingOccurrences(of: "^([" + JS_S + "]*[0-9]{1,3})([.)])(?=[" + JS_S + "])", with: "$1\\\\$2", options: .regularExpression)
  }
  static func write(_ lines: [Line], cloze: Bool = false) -> String {
    func go(_ safe: Bool) -> String {
      var n = 0
      return lines.map { l in
        n = l.kind == "ol" ? n + 1 : 0
        let body = writeLine(l, safe)
        let pre = ["h1": "# ", "h2": "## ", "h3": "### ", "li": "- ", "ol": "\(n). "][l.kind] ?? ""
        return l.kind.isEmpty ? plainStart(body) : pre + body
      }.joined(separator: "\n")
    }
    let md = go(false), back = parse(md, cloze: cloze)
    let same = back.count == lines.count && zip(back, lines).allSatisfy { $0.kind == $1.kind && tidy($0.runs) == tidy($1.runs) }
    return same ? md : go(true)
  }
}
