// Reading cards from text, for the onboarding's import (design/build.mjs READ_CARDS_JS, ported). One card per line: a
// tab (Anki, Quizlet), a comma or semicolon (CSV), or " - " splits the front from the back, and a field in "quotes" can
// hold a comma. Anki's plain-text export starts with lines like "#separator:tab" and "#deck column:3" that say how to
// read it: its deck column sorts the cards into their decks (the last part of "Languages::Spanish"), and its note type,
// tags, and ID columns are left out. HTML from Anki (<b>, <br>) becomes card text (Rich.fromHtml), and Anki's
// {{c1::word}} blanks become fill-in-the-blank cards.
import Foundation

/// A card read from text: a front and back, or a fill-in-the-blank card's text (blanks in [[ ]]) and note.
struct ReadCard: Equatable {
  var front = "", back = "", cloze = false, text = "", note = ""
  /// As data.import takes it.
  var json: [String: Any] { cloze ? ["kind": "cloze", "text": text, "note": note] : ["front": front, "back": back] }
}

enum ReadCards {
  /// Splits a line at any of `seps`, keeping a "quoted" field whole ("" inside quotes is one quote).
  static func splitAt(_ l: String, _ seps: Set<Character>) -> [String] {
    var out: [String] = [], cur = "", q = false, start = true
    let chars = Array(l)
    var i = 0
    while i < chars.count {
      let ch = chars[i]
      if q {
        if ch != "\"" { cur.append(ch) } else if i + 1 < chars.count && chars[i + 1] == "\"" { cur.append("\""); i += 1 } else { q = false }
      } else if ch == "\"" && start { q = true; start = false }
      else if seps.contains(ch) { out.append(cur); cur = ""; start = true }
      else { cur.append(ch); start = false }
      i += 1
    }
    out.append(cur)
    return out
  }

  static func cells(_ l: String, _ sep: Character?) -> [String] {
    if let sep { return splitAt(l, [sep]) }
    if l.contains("\t") { return l.components(separatedBy: "\t") }
    if l.contains(" - ") { return l.components(separatedBy: " - ") }
    return splitAt(l, [",", ";"])
  }

  static func cell(_ x: String) -> String { Rich.looksHtml(x) ? Rich.fromHtml(x) : x.trimmingCharacters(in: .whitespacesAndNewlines) }

  private static let clozeTest = try! NSRegularExpression(pattern: "\\{\\{c\\d+::")
  private static let clozeRe = try! NSRegularExpression(pattern: "\\{\\{c\\d+::([\\s\\S]+?)(?:::[^}]*)?\\}\\}")

  static func toCard(_ fields: [String]) -> ReadCard {
    let front = fields.first ?? "", back = fields.dropFirst().filter { !$0.isEmpty }.joined(separator: ", ")
    let r = NSRange(front.startIndex..., in: front)
    if clozeTest.firstMatch(in: front, range: r) != nil {
      return ReadCard(cloze: true, text: clozeRe.stringByReplacingMatches(in: front, range: r, withTemplate: "[[$1]]"), note: back)
    }
    return ReadCard(front: front, back: back)
  }

  private static let headRe = try! NSRegularExpression(pattern: "^#([a-z ]+):(.*)$", options: .caseInsensitive)

  /// Every deck in the text and its cards, in the order they first appear; `name` for cards that name no deck.
  static func read(_ text: String, name: String) -> [(name: String, cards: [ReadCard])] {
    let lines = text.replacingOccurrences(of: "\r\n", with: "\n").components(separatedBy: "\n")
    var head: [String: String] = [:]
    for l in lines {
      let s = l.trimmingCharacters(in: .whitespaces)
      if let m = headRe.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)), let k = Range(m.range(at: 1), in: s), let v = Range(m.range(at: 2), in: s) {
        head[s[k].lowercased()] = s[v].trimmingCharacters(in: .whitespaces)
      }
    }
    let seps: [String: Character] = ["tab": "\t", "comma": ",", "semicolon": ";", "pipe": "|", "colon": ":", "space": " "]
    let sep = seps[(head["separator"] ?? "").lowercased()]
    // parseInt: the number at the start ("3" or "3 "), counted from 1.
    func col(_ k: String) -> Int { Int((head[k + " column"] ?? "").prefix { $0.isNumber }).map { $0 - 1 } ?? -1 }
    let deckCol = col("deck")
    let skip = Set([deckCol, col("notetype"), col("tags"), col("guid")].filter { $0 >= 0 })
    var order: [String] = [], decks: [String: [ReadCard]] = [:]
    for l in lines {
      let s = l.trimmingCharacters(in: .whitespacesAndNewlines)
      if s.isEmpty || s.hasPrefix("#") { continue }
      let cs = cells(sep == "\t" ? l : s, sep)
      let card = toCard(cs.enumerated().filter { !skip.contains($0.offset) }.map { cell($0.element) })
      if card.cloze ? Rich.blanks(card.text).isEmpty : (card.front.isEmpty || card.back.isEmpty) { continue }
      var deck = name
      if deckCol >= 0, deckCol < cs.count {
        let d = (cs[deckCol].components(separatedBy: "::").last ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !d.isEmpty { deck = d }
      }
      if decks[deck] == nil { order.append(deck); decks[deck] = [] }
      decks[deck]!.append(card)
    }
    return order.map { ($0, decks[$0]!) }
  }
}

// ---------- HTML to card text (web/rich.js fromHtml, looksHtml, and write) ----------
extension Rich {
  private static let htmlRe = rx("</?(b|strong|i|em|u|s|del|strike|mark|br|div|p|span|ul|ol|li|sub|sup|font)\\b[^>]*>|&(nbsp|amp|lt|gt|quot|#\\d+);", true)
  /// Text that holds HTML (from Anki or another app).
  static func looksHtml(_ s: String) -> Bool { htmlRe.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil }

  private static let BLOCK: Set<String> = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "blockquote", "pre", "tr", "table", "section", "article", "header", "footer"]
  private static let VOID: Set<String> = ["br", "img", "hr", "input", "meta", "link", "col", "area", "base", "wbr", "source"]
  private static let SKIP: Set<String> = ["script", "style", "head", "title", "template"]
  private static let tagRe = rx("<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(/?)>|<!--[\\s\\S]*?-->")
  private static let attrRe = rx("([a-zA-Z-]+)\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)")

  /// Pasted or imported HTML turned into card text, keeping the styles cards have (bold, italics, underline,
  /// strikethrough, highlight, line breaks, headings, and lists). A simpler reader than the browser's, enough for what
  /// Anki and spreadsheets export.
  static func fromHtml(_ html: String, cloze: Bool = false) -> String {
    var lines = [Line(kind: "", runs: [])]
    func next(_ kind: String) { if !lines[lines.count - 1].runs.isEmpty { lines.append(Line(kind: kind, runs: [])) } else { lines[lines.count - 1].kind = kind } }
    // Open elements: tag, its marks, whether it's a block.
    var stack: [(tag: String, m: String, block: Bool)] = []
    var skipping = 0
    var lastList = ""
    let ns = html as NSString
    var at = 0
    func text(_ raw: String) {
      guard skipping == 0 else { return }
      let t = decode(raw).replacingOccurrences(of: "[\\s\\u00A0]+", with: " ", options: .regularExpression)
      if !t.isEmpty { lines[lines.count - 1].runs.append(Run(t: t, m: norm(stack.last?.m ?? ""))) }
    }
    for m in tagRe.matches(in: html, range: NSRange(location: 0, length: ns.length)) {
      if m.range.location > at { text(ns.substring(with: NSRange(location: at, length: m.range.location - at))) }
      at = m.range.location + m.range.length
      guard m.range(at: 2).location != NSNotFound else { continue }  // a comment
      let closing = ns.substring(with: m.range(at: 1)) == "/", tag = ns.substring(with: m.range(at: 2)).lowercased()
      let attrs = ns.substring(with: m.range(at: 3)), selfClosing = ns.substring(with: m.range(at: 4)) == "/"
      if closing {
        guard let i = stack.lastIndex(where: { $0.tag == tag }) else { continue }
        for e in stack[i...].reversed() { if SKIP.contains(e.tag) { skipping -= 1 }; if e.block { next("") } }
        stack.removeSubrange(i...)
        continue
      }
      if tag == "br" { if skipping == 0 { lines.append(Line(kind: "", runs: [])) }; continue }
      if VOID.contains(tag) { continue }
      var a: [String: String] = [:]
      let an = attrs as NSString
      for x in attrRe.matches(in: attrs, range: NSRange(location: 0, length: an.length)) {
        var v = an.substring(with: x.range(at: 2)); if v.hasPrefix("\"") || v.hasPrefix("'") { v = String(v.dropFirst().dropLast()) }
        a[an.substring(with: x.range(at: 1)).lowercased()] = decode(v)
      }
      let st = style(a["style"] ?? "")
      var mm = stack.last?.m ?? ""
      if let fw = st["font-weight"] { mm = fw == "bold" || fw == "bolder" || (Int(fw) ?? 0) >= 600 ? mm + "b" : mm.replacingOccurrences(of: "b", with: "") }
      else if tag == "b" || tag == "strong" { mm += "b" }
      if let fs = st["font-style"] { mm = fs == "italic" || fs == "oblique" ? mm + "i" : mm.replacingOccurrences(of: "i", with: "") }
      else if tag == "i" || tag == "em" { mm += "i" }
      let dec = (st["text-decoration"] ?? "") + " " + (st["text-decoration-line"] ?? "")
      if tag == "u" || dec.contains("underline") { mm += "u" }
      if ["s", "del", "strike"].contains(tag) || dec.contains("line-through") { mm += "s" }
      let block = BLOCK.contains(tag)
      if tag == "mark" || (!block && isHighlight(st["background-color"] ?? st["background"])) { mm += "h" }
      if a["data-sc"] == "m" { mm += "m" }
      if a["data-sc"] == "k" && cloze { mm += "k" }
      if SKIP.contains(tag) { skipping += 1 }
      if block {
        if tag == "ul" || tag == "ol" { lastList = tag }
        let list = stack.last(where: { $0.tag == "ul" || $0.tag == "ol" })?.tag ?? lastList
        let kind = tag == "li" ? (list == "ol" ? "ol" : "li") : (["h1", "h2", "h3"].contains(tag) ? tag : "")
        next(kind)
      }
      if selfClosing { if block { next("") }; continue }
      stack.append((tag, mm, block))
    }
    if at < ns.length { text(ns.substring(from: at)) }
    // Spaces at the edges of lines go, and so do empty lines at the start and end.
    for i in lines.indices {
      var runs = tidy(lines[i].runs)
      if !runs.isEmpty { runs[0].t = String(runs[0].t.drop { $0.isWhitespace }) }
      if !runs.isEmpty { var z = runs[runs.count - 1].t; while let c = z.last, c.isWhitespace { z.removeLast() }; runs[runs.count - 1].t = z }
      lines[i].runs = tidy(runs)
    }
    while lines.count > 1 && lines[0].runs.isEmpty { lines.removeFirst() }
    while lines.count > 1 && lines[lines.count - 1].runs.isEmpty { lines.removeLast() }
    return write(lines, cloze: cloze)
  }

  private static func style(_ s: String) -> [String: String] {
    var out: [String: String] = [:]
    for part in s.split(separator: ";") {
      let kv = part.split(separator: ":", maxSplits: 1)
      if kv.count == 2 { out[kv[0].trimmingCharacters(in: .whitespaces).lowercased()] = kv[1].trimmingCharacters(in: .whitespaces).lowercased() }
    }
    return out
  }
  /// A background that marks words: not white, and not see-through.
  private static func isHighlight(_ c: String?) -> Bool {
    guard let c = c?.trimmingCharacters(in: .whitespaces), !c.isEmpty else { return false }
    if c.range(of: "transparent|inherit|initial|none", options: .regularExpression) != nil { return false }
    if c.range(of: "^(#fff(fff)?|white)$", options: [.regularExpression, .caseInsensitive]) != nil { return false }
    if c.range(of: "^rgba?\\(\\s*255\\s*,\\s*255\\s*,\\s*255", options: .regularExpression) != nil { return false }
    if c.range(of: "^rgba\\([^,]+,[^,]+,[^,]+,\\s*0(\\.0+)?\\s*\\)$", options: .regularExpression) != nil { return false }
    return true
  }
  private static let NAMED: [String: String] = ["nbsp": "\u{00A0}", "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "#39": "'"]
  private static let entRe = rx("&(#x[0-9a-fA-F]+|#\\d+|[a-zA-Z]+);")
  static func decode(_ s: String) -> String {
    guard s.contains("&") else { return s }
    let ns = s as NSString
    var out = "", at = 0
    for m in entRe.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
      out += ns.substring(with: NSRange(location: at, length: m.range.location - at))
      let e = ns.substring(with: m.range(at: 1))
      var rep: String? = NAMED[e.lowercased()]
      if e.hasPrefix("#x"), let v = UInt32(e.dropFirst(2), radix: 16), let u = Unicode.Scalar(v) { rep = String(Character(u)) }
      else if e.hasPrefix("#"), let v = UInt32(e.dropFirst()), let u = Unicode.Scalar(v) { rep = String(Character(u)) }
      out += rep ?? ns.substring(with: m.range)
      at = m.range.location + m.range.length
    }
    return out + ns.substring(from: at)
  }

  // ---------- writing (web/rich.js write) ----------
  private static let MD: [Character: (String, String)] = ["b": ("**", "**"), "i": ("*", "*"), "s": ("~~", "~~"), "h": ("==", "=="), "u": ("<u>", "</u>"), "k": ("[[", "]]")]
  private static let TAG: [Character: (String, String)] = ["b": ("<b>", "</b>"), "i": ("<i>", "</i>"), "s": ("<s>", "</s>"), "h": ("<mark>", "</mark>"), "u": ("<u>", "</u>"), "k": ("[[", "]]")]
  private static func escText(_ t: String, _ safe: Bool) -> String {
    let s = t.replacingOccurrences(of: "([\\\\*$])", with: "\\\\$1", options: .regularExpression)
    if safe { return s.replacingOccurrences(of: "([~=<\\[\\]])", with: "\\\\$1", options: .regularExpression) }
    return s.replacingOccurrences(of: "~~", with: "\\~\\~").replacingOccurrences(of: "==", with: "\\=\\=")
      .replacingOccurrences(of: "<(?=/?(?:b|strong|i|em|u|s|del|strike|mark)>)", with: "\\\\<", options: [.regularExpression, .caseInsensitive])
  }
  private static func mathOut(_ t: String, _ safe: Bool) -> String {
    !safe && t.range(of: "^[^\\s$](?:[^$]*[^\\s$])?$", options: .regularExpression) != nil ? "$" + t + "$" : "\\(" + t + "\\)"
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
        let tagged = safe || txt.first?.isWhitespace == true || txt.last?.isWhitespace == true
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
    s.replacingOccurrences(of: "^(\\s*)([-+]|#{1,3})(?=\\s)", with: "$1\\\\$2", options: .regularExpression)
      .replacingOccurrences(of: "^(\\s*\\d{1,3})([.)])(?=\\s)", with: "$1\\\\$2", options: .regularExpression)
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
