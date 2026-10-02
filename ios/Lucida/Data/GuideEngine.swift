// A deck's Guide in the iPhone app: web/guide.js itself, run in JavaScriptCore. The web, the AI link and the iPhone share this one
// file (design/to-ios.mjs copies it to Resources/guide.js), so what a Guide says is read exactly the same everywhere: the same
// parser, the same safety (nothing in a Guide can run; links are only http(s), mailto and in-page; a picture only from the app's
// own storage), and the same toolbar (Bold, Heading, Enter in a list, ...). Nothing here reads Markdown: `parse` gives back the
// tree web/guide.js writes about at its top ("THE TREE parse() returns"), the views draw it (Design/GuideViews.swift), and the
// editor (Screens/Guide.swift) asks the toolbar's helpers what the text and the selection become.
//
// Positions (`a`, `b`, `pos`) are UTF-16 offsets, which is what JavaScript counts in and what NSRange and UITextView count in, so
// they pass straight through. The engine builds for the Mac too (ios/tests/guide-check.sh runs it against node).
import Foundation
import JavaScriptCore

private extension KeyedDecodingContainer {
  /// A value, or `d` when it's missing, null, or the wrong type.
  func opt<T: Decodable>(_ key: Key, _ d: T) -> T { (try? decodeIfPresent(T.self, forKey: key)) ?? d }
}

// ---------- the tree ----------
/// A block of a Guide (web/guide.js parse(): "A document is an array of blocks").
indirect enum GuideBlock: Decodable, Equatable {
  case h(level: Int, inline: [GuideInline], id: String)
  case p([GuideInline])
  case code(lang: String, text: String)
  case quote([GuideBlock])
  case ul(tight: Bool, items: [GuideItem])
  case ol(start: Int, tight: Bool, items: [GuideItem])
  case hr
  case table(align: [String], head: [[GuideInline]], rows: [[[GuideInline]]])

  private enum K: String, CodingKey { case t, level, inline, id, lang, text, blocks, tight, items, start, align, head, rows }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: K.self)
    switch try c.decode(String.self, forKey: .t) {
    case "h": self = .h(level: try c.decode(Int.self, forKey: .level), inline: try c.decode([GuideInline].self, forKey: .inline), id: c.opt(.id, ""))
    case "p": self = .p(try c.decode([GuideInline].self, forKey: .inline))
    case "code": self = .code(lang: c.opt(.lang, ""), text: c.opt(.text, ""))
    case "quote": self = .quote(try c.decode([GuideBlock].self, forKey: .blocks))
    case "ul": self = .ul(tight: c.opt(.tight, true), items: try c.decode([GuideItem].self, forKey: .items))
    case "ol": self = .ol(start: c.opt(.start, 1), tight: c.opt(.tight, true), items: try c.decode([GuideItem].self, forKey: .items))
    case "hr": self = .hr
    case "table": self = .table(align: c.opt(.align, []), head: try c.decode([[GuideInline]].self, forKey: .head), rows: try c.decode([[[GuideInline]]].self, forKey: .rows))
    default: throw DecodingError.dataCorruptedError(forKey: .t, in: c, debugDescription: "Unknown block")
    }
  }
}

/// A list item: ordinary (`checked` nil) or a task ("- [x] done": true or false), with the blocks inside it.
struct GuideItem: Decodable, Equatable {
  var checked: Bool?
  var blocks: [GuideBlock]
  private enum K: String, CodingKey { case checked, blocks }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: K.self)
    checked = c.opt(.checked, nil); blocks = try c.decode([GuideBlock].self, forKey: .blocks)
  }
}

/// What is inside a heading, paragraph or table cell.
indirect enum GuideInline: Decodable, Equatable {
  case text(String)
  case b([GuideInline]), i([GuideInline]), s([GuideInline])
  case code(String)
  case a(href: String, title: String, [GuideInline])
  case img(src: String, alt: String, title: String)
  case br

  private enum K: String, CodingKey { case t, v, c, href, title, src, alt }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: K.self)
    switch try c.decode(String.self, forKey: .t) {
    case "text": self = .text(c.opt(.v, ""))
    case "b": self = .b(c.opt(.c, []))
    case "i": self = .i(c.opt(.c, []))
    case "s": self = .s(c.opt(.c, []))
    case "code": self = .code(c.opt(.v, ""))
    case "a": self = .a(href: c.opt(.href, ""), title: c.opt(.title, ""), c.opt(.c, []))
    case "img": self = .img(src: c.opt(.src, ""), alt: c.opt(.alt, ""), title: c.opt(.title, ""))
    case "br": self = .br
    default: throw DecodingError.dataCorruptedError(forKey: .t, in: c, debugDescription: "Unknown inline")
    }
  }
}

extension GuideInline {
  /// The words of this inline, with no marks (a picture is its description).
  var plain: String {
    switch self {
    case .text(let s), .code(let s): return s
    case .b(let c), .i(let c), .s(let c), .a(_, _, let c): return c.map(\.plain).joined()
    case .img(_, let alt, _): return alt
    case .br: return " "
    }
  }
}

/// A heading in a Guide's outline (guide.headings()).
struct GuideHeading: Decodable, Equatable { var level: Int, text: String, id: String }
/// What a toolbar button makes of the text: the new text and the selection in it (UTF-16 offsets).
struct GuideEdit: Decodable, Equatable { var text: String, a: Int, b: Int }
/// What Enter in a list makes of the text, and where the caret goes.
struct GuideEnter: Decodable, Equatable { var text: String, pos: Int }

// ---------- the engine ----------
final class GuideEngine {
  private let ctx: JSContext
  private let lock = NSLock()
  /// What went wrong the last time (a missing or broken guide.js, or an error thrown inside a call); empty when nothing did.
  private(set) var failure = ""
  private let cache = NSCache<NSString, TreeBox>()
  private final class TreeBox { let tree: [GuideBlock]; init(_ t: [GuideBlock]) { tree = t } }

  /// guide.js as the app ships it (Resources/guide.js), loaded once.
  static let shared: GuideEngine = {
    let url = Bundle.main.url(forResource: "guide", withExtension: "js")
    let src = url.flatMap { try? String(contentsOf: $0, encoding: .utf8) } ?? ""
    return GuideEngine(source: src)
  }()

  /// `source` is web/guide.js's text: one function (`makeGuide`) and an `export default` after it, which is left off here the way
  /// design/build.mjs leaves it off when it pastes the file into the boards.
  init(source: String) {
    ctx = JSContext()
    cache.countLimit = 40
    var failed = ""
    ctx.exceptionHandler = { _, e in failed = e?.toString() ?? "error" }
    guard let from = source.range(of: "function makeGuide"), let to = source.range(of: "export default", options: .backwards), from.lowerBound < to.lowerBound else {
      failure = "guide.js is missing"
      return
    }
    let body = source[from.lowerBound..<to.lowerBound].trimmingCharacters(in: .whitespacesAndNewlines)
    ctx.evaluateScript("var __guide = (" + body + ")();")
    // One entry for everything: the function's name and its arguments as JSON text in, its answer as JSON text out.
    ctx.evaluateScript("function __call(fn, args) { var r = __guide[fn].apply(__guide, JSON.parse(args)); return JSON.stringify(r === undefined ? null : r); }")
    if !failed.isEmpty { failure = failed }
    ctx.exceptionHandler = { [weak self] _, e in self?.failure = e?.toString() ?? "error" }
  }

  /// Calls guide.js's `fn` with the arguments as JSON text (an array); the answer as JSON text. nil when it threw.
  func callJSON(_ fn: String, _ argsJSON: String) -> String? {
    lock.lock(); defer { lock.unlock() }
    guard let f = ctx.objectForKeyedSubscript("__call"), let r = f.call(withArguments: [fn, argsJSON]), !r.isUndefined else { return nil }
    return r.toString()
  }
  /// The same with Swift values: strings, numbers and bools (and nil for null).
  func call(_ fn: String, _ args: [Any?]) -> String? {
    let arr = args.map { $0 ?? NSNull() }
    guard let data = try? JSONSerialization.data(withJSONObject: arr, options: [.fragmentsAllowed]), let s = String(data: data, encoding: .utf8) else { return nil }
    return callJSON(fn, s)
  }
  private func decode<T: Decodable>(_ type: T.Type, _ fn: String, _ args: [Any?]) -> T? {
    call(fn, args).flatMap { try? JSONDecoder().decode(T.self, from: Data($0.utf8)) }
  }

  // ---------- reading ----------
  /// A Guide's text as blocks (what the views draw).
  func parse(_ md: String) -> [GuideBlock] { decode([GuideBlock].self, "parse", [md]) ?? [] }
  /// The same, kept for the last few texts (the deck page draws one again whenever anything on it changes).
  func tree(_ md: String) -> [GuideBlock] {
    if let hit = cache.object(forKey: md as NSString) { return hit.tree }
    let t = parse(md)
    cache.setObject(TreeBox(t), forKey: md as NSString)
    return t
  }
  /// The page as safe HTML (the web's; the iPhone does not show it, but a check compares it).
  func render(_ md: String) -> String { decode(String.self, "render", [md]) ?? "" }
  /// The words with no marks, at most `n` characters.
  func plain(_ md: String, _ n: Int? = nil) -> String { decode(String.self, "plain", [md, n]) ?? "" }
  func headings(_ md: String) -> [GuideHeading] { decode([GuideHeading].self, "headings", [md]) ?? [] }
  /// How many unexpected errors guide.js caught and hid (0 unless there is a bug).
  var errors: Int {
    lock.lock(); defer { lock.unlock() }
    return Int(ctx.evaluateScript("__guide.errors")?.toInt32() ?? -1)
  }

  // ---------- the toolbar ----------
  /// A formatting button: bold, italic, strike, code, bullets, numbers, tasks, quote, table, rule, codeBlock; the selection is `a`..`b`.
  func edit(_ fn: String, _ text: String, _ a: Int, _ b: Int) -> GuideEdit? { decode(GuideEdit.self, fn, [text, a, b]) }
  func heading(_ text: String, _ a: Int, _ b: Int, level: Int = 2) -> GuideEdit? { decode(GuideEdit.self, "heading", [text, a, b, level]) }
  func link(_ text: String, _ a: Int, _ b: Int, url: String) -> GuideEdit? { decode(GuideEdit.self, "link", [text, a, b, url]) }
  func image(_ text: String, _ a: Int, _ b: Int, src: String, alt: String = "") -> GuideEdit? { decode(GuideEdit.self, "image", [text, a, b, src, alt]) }
  /// Enter at a caret in a list: the next item starts (or an empty item ends the list). nil: nothing special, let the key type a new line.
  func continueList(_ text: String, _ pos: Int) -> GuideEnter? { decode(GuideEnter?.self, "continueList", [text, pos]) ?? nil }
  /// Tab (`out` false) and Shift+Tab on list lines: two spaces in or out (the text comes back as it was when no selected line is a list line).
  func indent(_ text: String, _ a: Int, _ b: Int, out: Bool) -> GuideEdit? { decode(GuideEdit?.self, "indent", [text, a, b, out]) ?? nil }
}
