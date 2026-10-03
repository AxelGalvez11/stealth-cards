// A deck's Notes as the iPhone shows them (the canvas's PhoneGuide and the deck pages' Notes; web/notes.js on the web): one page that is always formatted, a row for each
// block. The page's Markdown is read into blocks and written back by web/guide.js itself (GuideEngine: blocks(), markdown()), so the iPhone keeps exactly what the web
// keeps. This is the page's memory and its rules, the same as the web's:
//   - what shows: what a closed toggle holds and what a folded heading's section holds are hidden; numbered items count; a heading has a section when something is under it
//     (until the next heading of the same or a higher level);
//   - which toggles are open and which sections are folded is how this phone shows the page, not part of the note: UserDefaults (`lucida.notes.view`, by deck and page, and
//     by the toggle's or heading's words, as the web keeps it);
//   - Enter starts a line of the same kind (an empty item turns into text, empty text goes out a level; at the end of an open toggle a line inside it), Backspace at the start
//     of a line turns it into text, then out a level, then joins it to the line above, Tab and Shift+Tab (a hardware keyboard) nest and un-nest; "# " "## " "- " "1. " "[] "
//     "> " "```" and "---" typed at the start of a line make that kind of line.
// The words of a line are edited by its text field (Design/NotesViews.swift); this keeps the blocks.
import Foundation
import Combine

private extension KeyedDecodingContainer {
  func opt<T: Decodable>(_ key: Key, _ d: T) -> T { (try? decodeIfPresent(T.self, forKey: key)) ?? d }
}

// ---------- the blocks (guide.js "blocks") ----------
/// Words and what they are: bold, italic, strikethrough, code, and a link's address and title.
struct NoteRun: Codable, Equatable {
  var t: String
  var b = false, i = false, s = false, c = false
  var a: String? = nil, lt: String? = nil
  init(_ t: String, b: Bool = false, i: Bool = false, s: Bool = false, c: Bool = false, a: String? = nil, lt: String? = nil) { self.t = t; self.b = b; self.i = i; self.s = s; self.c = c; self.a = a; self.lt = lt }
  private enum K: String, CodingKey { case t, b, i, s, c, a, lt }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: K.self)
    t = c.opt(.t, ""); b = c.opt(.b, false); i = c.opt(.i, false); s = c.opt(.s, false); self.c = c.opt(.c, false); a = c.opt(.a, nil); lt = c.opt(.lt, nil)
  }
  func encode(to e: Encoder) throws {
    var c = e.container(keyedBy: K.self)
    try c.encode(t, forKey: .t)
    if b { try c.encode(true, forKey: .b) }; if i { try c.encode(true, forKey: .i) }; if s { try c.encode(true, forKey: .s) }; if self.c { try c.encode(true, forKey: .c) }
    if let a, !a.isEmpty { try c.encode(a, forKey: .a); if let lt, !lt.isEmpty { try c.encode(lt, forKey: .lt) } }
  }
  func sameMarks(_ o: NoteRun) -> Bool { b == o.b && i == o.i && s == o.s && c == o.c && (a ?? "") == (o.a ?? "") && (lt ?? "") == (o.lt ?? "") }
  func with(_ t: String) -> NoteRun { var r = self; r.t = t; return r }
}

/// One line of the page: text, a heading, an item, a to-do, a toggle, a quote, code, a divider, a picture or a table. What an item, a toggle or a quote holds follows it
/// one level in (`d`).
struct NoteBlock: Codable, Equatable, Identifiable {
  var id = UUID().uuidString
  var k: String
  var d = 0
  var r: [NoteRun] = []
  var level = 1
  var on = false
  var start: Int? = nil
  var lang = "", text = ""
  var src = "", alt = "", title = ""
  var align: [String] = []
  var rows: [[[NoteRun]]] = []
  init(_ k: String, d: Int = 0, r: [NoteRun] = [], level: Int = 1) { self.k = k; self.d = d; self.r = r; self.level = level }
  private enum K: String, CodingKey { case k, d, r, level, on, start, lang, text, src, alt, title, align, rows }
  init(from dec: Decoder) throws {
    let c = try dec.container(keyedBy: K.self)
    k = c.opt(.k, "p"); d = c.opt(.d, 0); r = c.opt(.r, []); level = c.opt(.level, 1); on = c.opt(.on, false); start = c.opt(.start, nil)
    lang = c.opt(.lang, ""); text = c.opt(.text, ""); src = c.opt(.src, ""); alt = c.opt(.alt, ""); title = c.opt(.title, ""); align = c.opt(.align, []); rows = c.opt(.rows, [])
  }
  func encode(to e: Encoder) throws {
    var c = e.container(keyedBy: K.self)
    try c.encode(k, forKey: .k); try c.encode(d, forKey: .d)
    if Notes.text.contains(k) { try c.encode(r, forKey: .r) }
    if k == "h" { try c.encode(level, forKey: .level) }
    if k == "todo" { try c.encode(on, forKey: .on) }
    if k == "ol", let start { try c.encode(start, forKey: .start) }
    if k == "code" { try c.encode(lang, forKey: .lang); try c.encode(text, forKey: .text) }
    if k == "img" { try c.encode(src, forKey: .src); try c.encode(alt, forKey: .alt); try c.encode(title, forKey: .title) }
    if k == "table" { try c.encode(align, forKey: .align); try c.encode(rows, forKey: .rows) }
  }
  static func == (a: NoteBlock, b: NoteBlock) -> Bool {
    a.id == b.id && a.k == b.k && a.d == b.d && a.r == b.r && a.level == b.level && a.on == b.on && a.start == b.start && a.lang == b.lang && a.text == b.text && a.src == b.src && a.alt == b.alt && a.title == b.title && a.align == b.align && a.rows == b.rows
  }
  /// Its words (code is its text).
  var words: [NoteRun] { Notes.text.contains(k) ? r : k == "code" ? (text.isEmpty ? [] : [NoteRun(text)]) : [] }
  var length: Int { Notes.len(words) }
  var isEmpty: Bool { Notes.text.contains(k) ? r.allSatisfy { $0.t.isEmpty } : k == "code" ? text.isEmpty : false }
}

// ---------- runs ----------
enum Notes {
  static let text: Set<String> = ["p", "h", "ul", "ol", "todo", "toggle", "quote"], holds: Set<String> = ["ul", "ol", "todo", "toggle", "quote"], oneLine: Set<String> = ["h", "toggle"]
  static let atom: Set<String> = ["hr", "img", "table"]
  static let maxDepth = 8
  /// Neighbours with the same marks joined, nothing empty.
  static func tidy(_ rs: [NoteRun]) -> [NoteRun] {
    var out: [NoteRun] = []
    for x in rs where !x.t.isEmpty { if let p = out.last, p.sameMarks(x) { out[out.count - 1].t += x.t } else { out.append(x) } }
    return out
  }
  /// Lengths are UTF-16 units, what NSRange and JavaScript count.
  static func len(_ rs: [NoteRun]) -> Int { rs.reduce(0) { $0 + ($1.t as NSString).length } }
  static func plain(_ rs: [NoteRun]) -> String { rs.map(\.t).joined() }
  static func cut(_ rs: [NoteRun], _ a: Int, _ b: Int) -> [NoteRun] {
    var out: [NoteRun] = [], at = 0
    for x in rs {
      let n = (x.t as NSString).length, s = at, e = at + n; at = e
      let f = max(a, s), t = min(b, e)
      if f < t { out.append(x.with((x.t as NSString).substring(with: NSRange(location: f - s, length: t - f)))) }
    }
    return out
  }
  static func splice(_ rs: [NoteRun], _ a: Int, _ b: Int, _ ins: [NoteRun]) -> [NoteRun] { tidy(cut(rs, 0, a) + ins + cut(rs, b, len(rs))) }
  static func oneLine(_ rs: [NoteRun]) -> [NoteRun] { tidy(rs.map { $0.with($0.t.replacingOccurrences(of: "\n", with: " ")) }) }
}

// ---------- what shows ----------
/// A row of the page as it shows: the block, where it is in the page, its number (a numbered item), whether it holds anything, and, for a heading, whether it has a
/// section and whether that is folded. `virtualFor`: an open toggle with nothing in it gets a quiet line to write in.
struct NotesEntry: Identifiable, Equatable {
  var block: NoteBlock
  var index: Int
  var number = 0
  var kids = false
  var section = false
  var open = false
  var folded = false
  var virtualFor: String? = nil
  var id: String { virtualFor.map { "v" + $0 } ?? block.id }
}

/// Where the caret is asked to go: a block (and a table cell), and a place in its words.
struct NotesFocus: Equatable { var id: String; var at: Int; var cell: [Int]? = nil; var length = 0 }

// ---------- the page ----------
@MainActor
final class NotesPage: ObservableObject {
  @Published private(set) var blocks: [NoteBlock] = []
  @Published private(set) var open: [String: Bool] = [:]
  @Published private(set) var fold: [String: Bool] = [:]
  /// Where the caret should go next (a field that sees its id takes it).
  @Published var focus: NotesFocus? = nil
  /// The block whose words are being edited, and what is selected in them.
  @Published var editing: String? = nil
  @Published var selection = NSRange(location: 0, length: 0)
  @Published var editingCell: [Int]? = nil
  /// A picture, divider or table that is picked (a ring shows it; Delete takes it away).
  @Published var picked: String? = nil
  /// The bar's link field is open (the bar stays while its address is typed).
  @Published var linking = false
  /// Each heading's id as guide.js names it (a link "#cell-biology" in the page goes to it): block id → "g-cell-biology".
  private(set) var anchors: [String: String] = [:]
  /// What changed, as Markdown (a moment after a change, and right away when asked: flush()).
  var onChange: (String) -> Void = { _ in }
  private(set) var key = ""
  private(set) var markdown = ""
  private var sent = ""
  /// The words as they came, and what the page writes for them before anything is changed: while it still writes that, the words stay exactly as they came.
  private var original = "", base = ""
  private var emit: Task<Void, Never>?
  var editable = false

  // ---------- reading Markdown ----------
  /// The page's Markdown (`md`) for `key` (deck|page). A blank note (nothing written) is a heading and an empty line. `demo`: the canvas's state for toggles and folds.
  func load(_ md: String, key: String, editable: Bool, blank: Bool, demo: NotesDemo? = nil) {
    self.key = key; self.editable = editable; markdown = md; sent = md; original = md
    var list = GuideEngine.shared.blocks(md)
    if list.isEmpty && (editable || blank) { list = [NoteBlock("h", level: 1), NoteBlock("p")] }
    blocks = Self.settle(list)
    base = Self.saved(blocks)
    picked = nil; focus = nil; editing = nil
    let heads = GuideEngine.shared.headings(md)
    var an: [String: String] = [:], hk = 0
    for b in blocks where b.k == "h" { if hk < heads.count { an[b.id] = heads[hk].id }; hk += 1 }
    anchors = an
    let mem = NotesMemory.page(key), keys = Self.viewKeys(blocks)
    var o: [String: Bool] = [:], f: [String: Bool] = [:], tn = 0, hn = 0
    for b in blocks {
      let k = keys[b.id] ?? ""
      if b.k == "toggle" { o[b.id] = demo.map { $0.open == "all" ? true : $0.open == "none" ? false : tn == 0 } ?? mem.o.contains(k); tn += 1 }
      if b.k == "h" { f[b.id] = demo.map { $0.fold.contains(hn) } ?? mem.f.contains(k); hn += 1 }
    }
    open = o; fold = f
    // (the canvas's states: words shown selected, or the caret on a line, for the bar above the keyboard)
    if let d = demo, editable {
      if let x = d.bar, x.i < blocks.count { editing = blocks[x.i].id; selection = NSRange(location: x.a, length: max(0, x.b - x.a)) }
      else if let c = d.caret, c < blocks.count { editing = blocks[c].id; selection = NSRange(location: blocks[c].length, length: 0) }
    }
  }
  /// The caret at the end of the page's last line of words (the deck page's + › Notes: ready to type at the end).
  func focusEnd() { if let i = blocks.lastIndex(where: { Notes.text.contains($0.k) || $0.k == "code" }) { focusAt(i, blocks[i].length) } }
  /// The caret goes to block i, at `off` (a press on the reading page opened it there; a blank note starts on its title).
  func focusAt(_ i: Int, _ off: Int) {
    guard !blocks.isEmpty else { return }
    let b = blocks[max(0, min(i, blocks.count - 1))]
    guard Notes.text.contains(b.k) || b.k == "code" else { return }
    reveal(b.id)
    focus = NotesFocus(id: b.id, at: max(0, min(off, b.length)))
  }
  /// The same page read again only when its words changed from somewhere else (an older version brought back).
  func reload(_ md: String) { if md != sent && md != markdown { load(md, key: key, editable: editable, blank: false) } }

  // ---------- what shows ----------
  var entries: [NotesEntry] {
    var out: [NotesEntry] = [], cnt: [Int?] = [], hide: (toggle: Bool, d: Int, level: Int)? = nil
    for (i, b) in blocks.enumerated() {
      if cnt.count > b.d + 1 { cnt.removeLast(cnt.count - b.d - 1) }
      while cnt.count < b.d + 1 { cnt.append(nil) }
      if b.k == "ol" { cnt[b.d] = cnt[b.d].map { $0 + 1 } ?? (b.start ?? 1) } else { cnt[b.d] = nil }
      let n = b.k == "ol" ? cnt[b.d] ?? 1 : 0
      if let h = hide {
        let ends = h.toggle ? b.d <= h.d : (b.d < h.d || (b.d == h.d && b.k == "h" && b.level <= h.level))
        if !ends { continue }
        hide = nil
      }
      let next = i + 1 < blocks.count ? blocks[i + 1] : nil, kids = next.map { $0.d > b.d } ?? false
      let section = b.k == "h" && next.map { !($0.d < b.d || ($0.d == b.d && $0.k == "h" && $0.level <= b.level)) } ?? false
      let isOpen = b.k == "toggle" && (open[b.id] ?? false), folded = section && (fold[b.id] ?? false)
      out.append(NotesEntry(block: b, index: i, number: n, kids: kids, section: section, open: isOpen, folded: folded))
      if b.k == "toggle" && !isOpen && kids { hide = (true, b.d, 0) }
      else if folded { hide = (false, b.d, b.level) }
      if b.k == "toggle" && isOpen && !kids && editable { var vb = NoteBlock("p", d: b.d + 1); vb.id = "v" + b.id; var v = NotesEntry(block: vb, index: i); v.virtualFor = b.id; out.append(v) }
    }
    return out
  }
  func index(_ id: String) -> Int? { blocks.firstIndex { $0.id == id } }
  func block(_ id: String) -> NoteBlock? { index(id).map { blocks[$0] } }
  /// The index after block i and what it holds.
  func end(of i: Int) -> Int { var j = i + 1; while j < blocks.count && blocks[j].d > blocks[i].d { j += 1 }; return j }
  /// Is block i inside the toggle `id`, or in the section of the heading `id`?
  func isInside(_ i: Int, _ id: String) -> Bool {
    guard let j = index(id), i > j else { return false }
    let b = blocks[j]
    if b.k == "toggle" { return i < end(of: j) }
    for k in (j + 1)...i { let x = blocks[k]; if x.d < b.d || (x.d == b.d && x.k == "h" && x.level <= b.level) { return false } }
    return true
  }
  /// A quiet word on an empty line: a blank note's "Title" and "Start writing", and on the line being written in, what kind of line it is.
  func placeholder(_ e: NotesEntry) -> String {
    let b = e.block
    guard Notes.text.contains(b.k), b.isEmpty, e.virtualFor == nil else { return e.virtualFor != nil ? "Empty" : "" }
    let blank = blocks.count <= 2 && blocks.allSatisfy { Notes.text.contains($0.k) && $0.isEmpty }
    if blank && e.index == 0 && b.k == "h" { return "Title" }
    if blank && e.index == 1 && b.k == "p" && blocks.first?.k == "h" { return "Start writing" }
    guard editable, editing == b.id else { return "" }
    switch b.k { case "h": return b.level == 1 ? "Heading" : b.level == 2 ? "Subheading" : "Heading"; case "ul", "ol": return "List"; case "todo": return "To-do"; case "toggle": return "Toggle"; case "quote": return "Quote"; default: return "" }
  }

  // ---------- changes ----------
  private func commit(_ list: [NoteBlock], focus f: NotesFocus? = nil) {
    blocks = Self.settle(list)
    picked = nil
    if let f { reveal(f.id); focus = f }
    changed()
    rememberSoon()
  }
  /// The words of a line, as its field has them now (typing): no redraw of the field, but the page says it changed.
  func setWords(_ id: String, _ rs: [NoteRun], cell: [Int]? = nil) {
    guard let i = index(id) else { return }
    var b = blocks[i]
    if let cell, b.k == "table", cell[0] < b.rows.count, cell[1] < b.rows[cell[0]].count { b.rows[cell[0]][cell[1]] = Notes.oneLine(rs) }
    else if b.k == "code" { b.text = Notes.plain(rs) }
    else if Notes.text.contains(b.k) { b.r = Notes.oneLine.contains(b.k) ? Notes.oneLine(rs) : Notes.tidy(rs) }
    else { return }
    if b == blocks[i] { return }
    blocks[i] = b
    changed(); rememberSoon()
  }
  func changed() {
    emit?.cancel()
    emit = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 250_000_000)
      if !Task.isCancelled { self?.send() }
    }
  }
  /// Sends what changed now (Done, another page, Make cards).
  func flush() { emit?.cancel(); send(); remember() }
  private func send() {
    var md = Self.saved(blocks)
    // (nothing changed, or it was changed back: a page opened and left is never saved again in other words)
    if md == base { md = original }
    markdown = md
    if md == sent { return }
    sent = md
    onChange(md)
  }
  /// What is saved: no empty lines at the end, and nothing when every line is empty.
  static func saved(_ list: [NoteBlock]) -> String {
    var n = list.count
    while n > 0 && list[n - 1].k == "p" && list[n - 1].d == 0 && list[n - 1].isEmpty { n -= 1 }
    let keep = Array(list.prefix(n))
    return keep.allSatisfy { Notes.text.contains($0.k) && $0.isEmpty } ? "" : GuideEngine.shared.markdown(keep)
  }
  /// Depths as Markdown can hold them: never more than one level further in than the block before can hold.
  static func settle(_ list: [NoteBlock]) -> [NoteBlock] {
    var prev: NoteBlock? = nil
    return list.map { b in
      let most = prev.map { $0.d + (Notes.holds.contains($0.k) ? 1 : 0) } ?? 0
      var x = b; x.d = max(0, min(b.d, most, Notes.maxDepth)); prev = x; return x
    }
  }
  /// The line at i shows: the toggles it is in open, the sections it is in unfold.
  func reveal(_ id: String) {
    guard let i = index(id) else { return }
    var j = i - 1
    while j >= 0 {
      let x = blocks[j]
      if x.k == "toggle" && !(open[x.id] ?? false) && i < end(of: j) { open[x.id] = true }
      if x.k == "h" && (fold[x.id] ?? false) && isInside(i, x.id) { fold[x.id] = false }
      j -= 1
    }
  }

  // ---------- the rules ----------
  /// Typing changed a line's words: "# " and the rest at the start of a line of text make that kind of line. Returns true when the line changed kind (the field is drawn again).
  @discardableResult
  func shortcut(_ id: String, caret: Int) -> Bool {
    guard let i = index(id), blocks[i].k == "p" else { return false }
    var b = blocks[i]
    let t = Notes.plain(b.r), before = String((t as NSString).substring(to: min(caret, (t as NSString).length)))
    var to: (k: String, level: Int, on: Bool, start: Int?, cut: Int)? = nil
    if let m = before.range(of: #"^#{1,3} $"#, options: .regularExpression) { to = ("h", before[m].count - 1, false, nil, before[m].count) }
    else if before.range(of: #"^[-*+] $"#, options: .regularExpression) != nil { to = ("ul", 1, false, nil, 2) }
    else if let m = before.range(of: #"^\d{1,9}[.)] $"#, options: .regularExpression) { let n = Int(before[m].dropLast(2)) ?? 1; to = ("ol", 1, false, n == 1 ? nil : n, before[m].count) }
    else if before == "[] " || before == "[ ] " { to = ("todo", 1, false, nil, before.count) }
    else if before == "[x] " || before == "[X] " { to = ("todo", 1, true, nil, 4) }
    else if before == "> " { to = ("toggle", 1, false, nil, 2) }
    else if before == "```" { to = ("code", 1, false, nil, 3) }
    else if before == "---" && t == "---" {
      var list = blocks
      let p = NoteBlock("p", d: b.d)
      list[i] = NoteBlock("hr", d: b.d); list[i].id = b.id
      list.insert(p, at: i + 1)
      commit(list, focus: NotesFocus(id: p.id, at: 0))
      return true
    }
    guard let x = to else { return false }
    let rest = Notes.splice(b.r, 0, x.cut, [])
    if x.k == "code" { var c = NoteBlock("code", d: b.d); c.id = b.id; c.text = Notes.plain(rest); var list = blocks; list[i] = c; commit(list, focus: NotesFocus(id: b.id, at: 0)); return true }
    b.k = x.k; b.level = x.level; b.on = x.on; b.start = x.start; b.r = rest
    if x.k == "toggle" { open[b.id] = true }
    var list = blocks; list[i] = b
    commit(list, focus: NotesFocus(id: b.id, at: max(0, caret - x.cut)))
    return true
  }
  /// Return in a line, with the caret at `at` (what was selected, `upTo`, goes first).
  func enter(_ id: String, at: Int, upTo: Int? = nil) {
    guard let i = index(id) else { return }
    var list = blocks, b = list[i]
    if let z = upTo, z > at { b.r = Notes.splice(b.r, at, z, []); list[i] = b }
    if b.k == "code" { b.text = (b.text as NSString).replacingCharacters(in: NSRange(location: at, length: 0), with: "\n"); list[i] = b; return commit(list, focus: NotesFocus(id: b.id, at: at + 1)) }
    guard Notes.text.contains(b.k) else { return }
    let len = Notes.len(b.r)
    if b.isEmpty && b.k != "p" && b.k != "h" { var p = NoteBlock("p", d: b.d); p.id = b.id; list[i] = p; return commit(list, focus: NotesFocus(id: b.id, at: 0)) }
    if b.isEmpty && b.k == "p" && b.d > 0 { return commit(outdent(list, i), focus: NotesFocus(id: b.id, at: 0)) }
    if b.k == "toggle" && at == len {
      if open[b.id] ?? false { let p = NoteBlock("p", d: b.d + 1); list.insert(p, at: i + 1); return commit(list, focus: NotesFocus(id: p.id, at: 0)) }
      let t = NoteBlock("toggle", d: b.d); open[t.id] = true; list.insert(t, at: end(of: i)); return commit(list, focus: NotesFocus(id: t.id, at: 0))
    }
    // at the end of a heading with an empty line under it (a blank note's second line): the caret goes there
    if b.k == "h" && at == len, i + 1 < list.count, list[i + 1].k == "p", list[i + 1].d == b.d, list[i + 1].isEmpty { return commit(list, focus: NotesFocus(id: list[i + 1].id, at: 0)) }
    if at == 0 && len > 0 {
      var above = NoteBlock(b.k == "h" ? "p" : b.k, d: b.d)
      if above.k == "todo" { above.on = false }
      list.insert(above, at: i)
      return commit(list, focus: NotesFocus(id: b.id, at: 0))
    }
    let nb = NoteBlock(b.k == "h" ? "p" : b.k, d: b.d, r: Notes.cut(b.r, at, len))
    if nb.k == "toggle" { open[nb.id] = true }
    b.r = Notes.cut(b.r, 0, at); list[i] = b
    list.insert(nb, at: i + 1)
    commit(list, focus: NotesFocus(id: nb.id, at: 0))
  }
  /// Backspace at the very start of a line: it becomes text, then goes out a level, then joins the line above (a picture, divider or table above is picked).
  func backspaceAtStart(_ id: String) {
    guard let i = index(id) else { return }
    var list = blocks
    let b = list[i]
    if b.k == "code" { var p = NoteBlock("p", d: b.d, r: b.text.isEmpty ? [] : [NoteRun(b.text)]); p.id = b.id; list[i] = p; return commit(list, focus: NotesFocus(id: b.id, at: 0)) }
    if b.k != "p" { var p = NoteBlock("p", d: b.d, r: b.r); p.id = b.id; list[i] = p; return commit(list, focus: NotesFocus(id: b.id, at: 0)) }
    if b.d > 0 { return commit(outdent(list, i), focus: NotesFocus(id: b.id, at: 0)) }
    let vis = entries.filter { $0.virtualFor == nil }
    guard let at = vis.firstIndex(where: { $0.block.id == b.id }), at > 0 else { return }
    let pv = vis[at - 1].block
    guard let j = index(pv.id) else { return }
    if Notes.atom.contains(pv.k) { if b.isEmpty { list.remove(at: i); commit(list) }; picked = pv.id; focus = nil; return }
    if pv.k == "code" { var x = list[j]; let off = (x.text as NSString).length; x.text += Notes.plain(b.r); list[j] = x; list.remove(at: i); return commit(list, focus: NotesFocus(id: pv.id, at: off)) }
    var x = list[j]
    let off = Notes.len(x.r)
    x.r = Notes.tidy(x.r + (Notes.oneLine.contains(x.k) ? Notes.oneLine(b.r) : b.r))
    list[j] = x; list.remove(at: i)
    commit(list, focus: NotesFocus(id: pv.id, at: off))
  }
  func outdent(_ list: [NoteBlock], _ i: Int) -> [NoteBlock] {
    var out = list
    let j = end(of: i)
    for k in i..<j { out[k].d = max(0, out[k].d - 1) }
    return out
  }
  /// Tab (`out` false) and Shift+Tab: the line, and what it holds, in or out a level (in only under something that can hold it).
  func nest(_ id: String, out: Bool) {
    guard let i = index(id) else { return }
    var list = blocks
    let x = list[i], j = end(of: i)
    if out { guard x.d > 0 else { return }; for k in i..<j { list[k].d -= 1 }; return commit(list, focus: focus ?? NotesFocus(id: id, at: selection.location)) }
    let vis = entries.filter { $0.virtualFor == nil }
    guard let at = vis.firstIndex(where: { $0.block.id == id }), at > 0 else { return }
    let pv = vis[at - 1].block
    guard x.d + 1 <= pv.d + (Notes.holds.contains(pv.k) ? 1 : 0), x.d + 1 <= Notes.maxDepth else { return }
    for k in i..<j { list[k].d += 1 }
    var up = index(pv.id) ?? -1
    while up >= 0 && list[up].d >= x.d + 1 { up -= 1 }
    if up >= 0 && list[up].k == "toggle" { open[list[up].id] = true }
    commit(list, focus: NotesFocus(id: id, at: selection.location))
  }
  /// What a line becomes (Aa, To-do, Bullets, Toggle): its words stay. Asking for what it already is makes it text again.
  func setKind(_ id: String, _ kind: String, level: Int = 1) {
    guard let i = index(id) else { return }
    var list = blocks
    let b = list[i]
    guard Notes.text.contains(b.k) || b.k == "code" else { return }
    let same = b.k == kind && (kind != "h" || b.level == level)
    let to = same && kind != "p" ? "p" : kind
    var nb = NoteBlock(to, d: b.d)
    nb.id = b.id
    let r = b.k == "code" ? (b.text.isEmpty ? [] : [NoteRun(b.text)]) : b.r
    if to == "code" { nb.text = Notes.plain(r) } else { nb.r = Notes.oneLine.contains(to) ? Notes.oneLine(r) : r }
    if to == "h" { nb.level = level }
    if to == "todo" { nb.on = b.k == "todo" ? b.on : false }
    if to == "toggle" { open[b.id] = true }
    list[i] = nb
    commit(list, focus: NotesFocus(id: b.id, at: min(selection.location, nb.length)))
  }
  /// A picture after a line (an empty line is used for it).
  func insertPicture(after id: String?, src: String) {
    var list = blocks
    let i = id.flatMap(index) ?? (list.count - 1)
    let d = i >= 0 && i < list.count ? list[i].d : 0
    let pic: NoteBlock = { var p = NoteBlock("img", d: d); p.src = src; return p }()
    let p = NoteBlock("p", d: d)
    if i >= 0 && i < list.count && Notes.text.contains(list[i].k) && list[i].isEmpty { list[i] = pic; list.insert(p, at: i + 1) }
    else { let j = i >= 0 && i < list.count ? end(of: i) : list.count; list.insert(contentsOf: [pic, p], at: j) }
    commit(list, focus: NotesFocus(id: p.id, at: 0))
  }
  func check(_ id: String) { guard let i = index(id) else { return }; var list = blocks; list[i].on.toggle(); commit(list) }
  func removePicked() {
    guard let id = picked, let i = index(id) else { return }
    var list = blocks
    list.remove(at: i)
    if list.isEmpty { list = [NoteBlock("p")] }
    let n = list[min(i, list.count - 1)]
    commit(list, focus: Notes.text.contains(n.k) || n.k == "code" ? NotesFocus(id: n.id, at: 0) : nil)
  }
  /// The quiet line under an open toggle with nothing in it: a line inside it.
  func writeInside(_ toggleId: String) {
    guard let i = index(toggleId) else { return }
    var list = blocks
    let p = NoteBlock("p", d: list[i].d + 1)
    list.insert(p, at: i + 1)
    commit(list, focus: NotesFocus(id: p.id, at: 0))
  }
  /// Tables: the next cell (a new row after the last), a row more, a column more.
  func nextCell(_ id: String, _ cell: [Int]) {
    guard let i = index(id) else { return }
    var b = blocks[i]
    let R = b.rows.count, C = b.rows.first?.count ?? 1
    var r = cell[0], c = cell[1] + 1
    if c >= C { c = 0; r += 1 }
    if r >= R { b.rows.append(Array(repeating: [], count: C)); var list = blocks; list[i] = b; return commit(list, focus: NotesFocus(id: id, at: 0, cell: [r, 0])) }
    focus = NotesFocus(id: id, at: Notes.len(b.rows[r][c]), cell: [r, c])
  }
  func addRow(_ id: String) { guard let i = index(id) else { return }; var list = blocks; let C = list[i].rows.first?.count ?? 1; list[i].rows.append(Array(repeating: [], count: C)); commit(list, focus: NotesFocus(id: id, at: 0, cell: [list[i].rows.count - 1, 0])) }
  func addColumn(_ id: String) { guard let i = index(id) else { return }; var list = blocks; list[i].rows = list[i].rows.map { $0 + [[]] }; list[i].align.append(""); commit(list, focus: NotesFocus(id: id, at: 0, cell: [0, list[i].rows[0].count - 1])) }

  // ---------- words: bold, italic, strikethrough, code, links ----------
  /// The marks a letter typed at i takes (web/notes.js typing()): bold, italic and strikethrough from the letter before it (or after it, at the start); code
  /// only between two letters of code; a link only inside one.
  static func typing(_ rs: [NoteRun], _ i: Int) -> NoteRun {
    func at(_ k: Int) -> NoteRun? {
      var n = 0
      for r in rs { let l = (r.t as NSString).length; if k < n + l { return r }; n += l }
      return nil
    }
    let before = i > 0 ? at(i - 1) : nil, after = at(i), from = before ?? after
    var m = NoteRun("")
    if let f = from { m.b = f.b; m.i = f.i; m.s = f.s }
    if let x = before, let y = after, x.c && y.c { m.c = true }
    if let x = before, let y = after, let a = x.a, !a.isEmpty, y.a == a { m.a = a; m.lt = x.lt }
    return m
  }
  /// The words of a line, or of a table's cell.
  func words(_ id: String, cell: [Int]? = nil) -> [NoteRun] {
    guard let b = block(id) else { return [] }
    if let cell, b.k == "table", cell[0] < b.rows.count, cell[1] < b.rows[cell[0]].count { return b.rows[cell[0]][cell[1]] }
    return b.words
  }
  private func put(_ id: String, cell: [Int]?, _ rs: [NoteRun]) -> [NoteBlock]? {
    guard let i = index(id) else { return nil }
    var list = blocks, b = list[i]
    if let cell, b.k == "table", cell[0] < b.rows.count, cell[1] < b.rows[cell[0]].count { b.rows[cell[0]][cell[1]] = Notes.oneLine(rs) }
    else if Notes.text.contains(b.k) { b.r = Notes.oneLine.contains(b.k) ? Notes.oneLine(rs) : Notes.tidy(rs) }
    else { return nil }
    list[i] = b
    return list
  }
  /// The word around `off` (nothing when it isn't inside one).
  static func word(_ t: String, _ off: Int) -> NSRange? {
    let s = t as NSString, isWord = { (k: Int) -> Bool in k >= 0 && k < s.length && (s.substring(with: NSRange(location: k, length: 1)).rangeOfCharacter(from: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "'’_-"))) != nil) }
    guard isWord(off - 1) && isWord(off) else { return nil }
    var a = off, z = off
    while isWord(a - 1) { a -= 1 }
    while isWord(z) { z += 1 }
    return NSRange(location: a, length: z - a)
  }
  /// Is every letter in `range` marked `m` ("b", "i", "s", "c" or "a" for a link)?
  func has(_ id: String, _ range: NSRange, _ m: String, cell: [Int]? = nil) -> Bool {
    guard range.length > 0 else { return false }
    let part = Notes.cut(words(id, cell: cell), range.location, range.location + range.length)
    return !part.isEmpty && part.allSatisfy { r in m == "b" ? r.b : m == "i" ? r.i : m == "s" ? r.s : m == "c" ? r.c : !(r.a ?? "").isEmpty }
  }
  /// Bold, Italic, Strikethrough or Code on what is selected (on again: off). With nothing selected, on the word the caret is in; elsewhere it returns the marks
  /// the next letters take (the caller keeps them for the caret).
  @discardableResult
  func toggleMark(_ id: String, _ range: NSRange, _ m: String, cell: [Int]? = nil) -> NoteRun? {
    var r = range
    let rs = words(id, cell: cell)
    if r.length == 0 {
      guard let w = Self.word(Notes.plain(rs), r.location) else { var x = Self.typing(rs, r.location); switch m { case "b": x.b.toggle(); case "i": x.i.toggle(); case "s": x.s.toggle(); default: x.c.toggle() }; return x }
      r = w
    }
    let on = !has(id, r, m, cell: cell), a = r.location, z = r.location + r.length
    let mid = Notes.cut(rs, a, z).map { x -> NoteRun in var y = x; switch m { case "b": y.b = on; case "i": y.i = on; case "s": y.s = on; default: y.c = on }; return y }
    guard let list = put(id, cell: cell, Notes.cut(rs, 0, a) + mid + Notes.cut(rs, z, Notes.len(rs))) else { return nil }
    commit(list, focus: NotesFocus(id: id, at: range.length == 0 ? range.location : a, cell: cell, length: range.length == 0 ? 0 : z - a))
    return nil
  }
  /// A link on what is selected (its address, as guide.js's href() made it; "" takes the link away).
  func setLink(_ id: String, _ range: NSRange, _ href: String, cell: [Int]? = nil) {
    let rs = words(id, cell: cell), a = range.location, z = range.location + range.length
    guard z > a else { return }
    let mid = Notes.cut(rs, a, z).map { x -> NoteRun in var y = x; y.a = href.isEmpty ? nil : href; y.lt = nil; return y }
    guard let list = put(id, cell: cell, Notes.cut(rs, 0, a) + mid + Notes.cut(rs, z, Notes.len(rs))) else { return }
    commit(list, focus: NotesFocus(id: id, at: a, cell: cell, length: z - a))
  }
  /// The address of the first link in `range`, if there is one.
  func link(_ id: String, _ range: NSRange, cell: [Int]? = nil) -> String {
    Notes.cut(words(id, cell: cell), range.location, range.location + max(1, range.length)).compactMap(\.a).first ?? ""
  }
  /// What is selected in the line being written, as words (Make cards from just that).
  var selectedText: String {
    guard let id = editing, selection.length > 0 else { return "" }
    return Notes.plain(Notes.cut(words(id, cell: editingCell), selection.location, selection.location + selection.length))
  }

  /// Pasted words with more than one line (or Markdown) go in as blocks, as the web pastes them (web/notes.js insertBlocks): one line of text joins the line;
  /// more lines: an empty line is used up, plain text joins the words before the caret, and what came after the caret follows the last line pasted.
  /// Returns false when there was nothing to put in.
  @discardableResult
  func paste(_ raw: String, into id: String, range: NSRange, cell: [Int]? = nil) -> Bool {
    let t = String(raw.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").prefix(200_000))
    let looksMd = t.range(of: #"(?m)^(?: {0,3}(?:#{1,6} |[-*+] |\d{1,9}[.)] |> |```|~~~|:::toggle|\|)|.*(?:\*\*|__|~~|`|\]\())"#, options: .regularExpression) != nil
    let pasted: [NoteBlock] = looksMd ? GuideEngine.shared.blocks(t) : t.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.map { NoteBlock("p", r: [NoteRun($0)]) }
    guard !pasted.isEmpty, let i = index(id) else { return false }
    var list = blocks
    let b = list[i], a = range.location, z = range.location + range.length
    let one = pasted.count == 1 && Notes.text.contains(pasted[0].k) ? pasted[0].r : nil
    if cell != nil {
      let r = Notes.oneLine(one ?? pasted.flatMap { $0.words + [NoteRun(" ")] })
      let rs = words(id, cell: cell)
      guard let l = put(id, cell: cell, Notes.splice(rs, a, z, r)) else { return false }
      commit(l, focus: NotesFocus(id: id, at: a + Notes.len(r), cell: cell)); return true
    }
    if b.k == "code" {
      let add = one.map(Notes.plain) ?? GuideEngine.shared.plain(GuideEngine.shared.markdown(pasted))
      var x = b; x.text = (b.text as NSString).replacingCharacters(in: NSRange(location: a, length: z - a), with: add); list[i] = x
      commit(list, focus: NotesFocus(id: id, at: a + (add as NSString).length)); return true
    }
    guard Notes.text.contains(b.k) else { return false }
    if let one {
      let r = Notes.oneLine.contains(b.k) ? Notes.oneLine(one) : one
      var x = b; x.r = Notes.splice(b.r, a, z, r); list[i] = x
      commit(list, focus: NotesFocus(id: id, at: a + Notes.len(r))); return true
    }
    let words = Notes.splice(b.r, a, z, []), len = Notes.len(words)
    let add = pasted.map { p -> NoteBlock in var y = p; y.id = UUID().uuidString; y.d = min(Notes.maxDepth, p.d + b.d); return y }
    let left = Notes.cut(words, 0, a), right = Notes.cut(words, a, len)
    var out = Array(list.prefix(i))
    func caret(_ x: NoteBlock) -> NotesFocus? { Notes.text.contains(x.k) ? NotesFocus(id: x.id, at: x.length) : x.k == "code" ? NotesFocus(id: x.id, at: (x.text as NSString).length) : nil }
    if left.isEmpty && !right.isEmpty {
      var keep = b; keep.r = right
      out += add + [keep] + list.suffix(from: i + 1)
      commit(out, focus: caret(add[add.count - 1]) ?? NotesFocus(id: b.id, at: 0)); return true
    }
    var rest = add
    if !left.isEmpty && rest[0].k == "p" { var x = b; x.r = Notes.tidy(left + rest[0].r); out.append(x); rest.removeFirst() }
    else if !left.isEmpty { var x = b; x.r = left; out.append(x) }
    out += rest
    var f: NotesFocus? = nil
    if !right.isEmpty {
      if !rest.isEmpty, var tail = out.last, tail.k == "p" { let off = tail.length; tail.r = Notes.tidy(tail.r + right); out[out.count - 1] = tail; f = NotesFocus(id: tail.id, at: off) }
      else { let p = NoteBlock(b.k == "h" ? "p" : b.k, d: b.d, r: right); out.append(p); f = NotesFocus(id: p.id, at: 0) }
    } else if let tail = out.last { f = caret(tail) }
    commit(out + list.suffix(from: i + 1), focus: f)
    return true
  }
  /// A press below the last line: the caret goes to the end (on a new line, when the last one isn't empty text).
  func writeAtEnd() {
    if let last = blocks.last, last.k == "p", last.d == 0, last.isEmpty { reveal(last.id); focus = NotesFocus(id: last.id, at: 0); return }
    let p = NoteBlock("p")
    commit(blocks + [p], focus: NotesFocus(id: p.id, at: 0))
  }
  /// The line above or below `id` that has words to write in (the arrow keys of a keyboard go there).
  func neighbor(_ id: String, up: Bool) -> String? {
    let vis = entries.filter { $0.virtualFor == nil && (Notes.text.contains($0.block.k) || $0.block.k == "code") }
    guard let at = vis.firstIndex(where: { $0.block.id == id }) else { return nil }
    let j = up ? at - 1 : at + 1
    return j >= 0 && j < vis.count ? vis[j].block.id : nil
  }
  /// A link jumps to the heading `id`: the toggles and sections it is in open. Says whether anything had to.
  func revealForJump(_ id: String) -> Bool {
    let o = open, f = fold
    reveal(id)
    if o == open && f == fold { return false }
    remember()
    return true
  }
  /// A picture, divider or table is picked (Delete takes it away).
  func pick(_ id: String?) { picked = id; if id != nil { focus = nil } }

  // ---------- toggles and sections ----------
  func flipOpen(_ id: String) { open[id] = !(open[id] ?? false); remember() }
  func flipFold(_ id: String) {
    let was = fold[id] ?? false
    fold[id] = !was
    if !was, let e = editing, let i = index(e), isInside(i, id) { editing = nil; focus = nil }
    remember()
  }

  // ---------- what this phone remembers ----------
  /// A toggle's or a heading's name on this phone: its words, and which of the ones with the same words it is (web/notes.js viewKeys).
  static func viewKeys(_ list: [NoteBlock]) -> [String: String] {
    var seen: [String: Int] = [:], out: [String: String] = [:]
    for b in list where b.k == "toggle" || b.k == "h" {
      let w = b.k + ":" + String(Notes.plain(b.r).trimmingCharacters(in: .whitespacesAndNewlines).prefix(160)), n = seen[w] ?? 0
      seen[w] = n + 1; out[b.id] = w + "#" + String(n)
    }
    return out
  }
  private var rememberTask: Task<Void, Never>?
  private func rememberSoon() { rememberTask?.cancel(); rememberTask = Task { [weak self] in try? await Task.sleep(nanoseconds: 800_000_000); if !Task.isCancelled { self?.remember() } } }
  func remember() {
    guard !key.isEmpty, !key.hasPrefix("canvas|") else { return }
    let keys = Self.viewKeys(blocks)
    NotesMemory.set(key, o: blocks.filter { $0.k == "toggle" && (open[$0.id] ?? false) }.compactMap { keys[$0.id] }, f: blocks.filter { $0.k == "h" && (fold[$0.id] ?? false) }.compactMap { keys[$0.id] })
  }
}

/// The canvas's states for a page (design/materials.mjs GUIDE_DEMOS): which toggles are open, which headings folded, words shown selected, the keyboard's bar.
struct NotesDemo: Equatable {
  var open = "first"
  var fold: [Int] = []
  var bar: (i: Int, a: Int, b: Int)? = nil
  var keys = false
  var aa = false
  /// The line the caret is on (the Aa choices say what it is).
  var caret: Int? = nil
  static func == (x: NotesDemo, y: NotesDemo) -> Bool { x.open == y.open && x.fold == y.fold && x.keys == y.keys && x.aa == y.aa && x.caret == y.caret && x.bar?.i == y.bar?.i && x.bar?.a == y.bar?.a && x.bar?.b == y.bar?.b }
  /// PhoneGuide's `view` (GUIDE_VIEWS).
  static func of(_ view: String) -> NotesDemo? {
    switch view {
    case "Writing": return NotesDemo(open: "first", keys: true)
    case "Block menu": return NotesDemo(open: "first", keys: true, aa: true, caret: 1)
    case "Format bar": return NotesDemo(open: "first", bar: (1, 19, 29), keys: true)
    case "Toggle open": return NotesDemo(open: "all")
    case "Toggle closed": return NotesDemo(open: "none")
    case "Section folded": return NotesDemo(open: "none", fold: [2])
    case "Blank note", "A new page": return NotesDemo(open: "first", keys: true)
    case "Reading on a shared deck": return NotesDemo(open: "first")
    default: return nil
    }
  }
}

/// Which toggles are open and which sections folded, on this phone (UserDefaults `lucida.notes.view`, the same shape the web keeps in localStorage).
enum NotesMemory {
  static let key = "lucida.notes.view"
  struct Page: Codable { var o: [String] = [], f: [String] = [], t: Double = 0 }
  struct All: Codable { var pages: [String: Page] = [:] }
  static func all() -> All { (UserDefaults.standard.data(forKey: key)).flatMap { try? JSONDecoder().decode(All.self, from: $0) } ?? All() }
  static func page(_ k: String) -> Page { all().pages[k] ?? Page() }
  static func set(_ k: String, o: [String], f: [String]) {
    var a = all()
    if o.isEmpty && f.isEmpty { a.pages[k] = nil } else { a.pages[k] = Page(o: Array(o.prefix(400)), f: Array(f.prefix(400)), t: Date().timeIntervalSince1970 * 1000) }
    if a.pages.count > 80 { for n in a.pages.sorted(by: { $0.value.t < $1.value.t }).prefix(a.pages.count - 80).map(\.key) { a.pages[n] = nil } }
    if let d = try? JSONEncoder().encode(a) { UserDefaults.standard.set(d, forKey: key) }
  }
}
