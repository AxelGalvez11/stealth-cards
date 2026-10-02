// The iPhone's Guide engine (Data/GuideEngine.swift: web/guide.js in JavaScriptCore) against node, on the Mac with no simulator.
//   guide-parity <guide.js> <folder made by tests/js/guide-dump.mjs>
// Every call in calls.txt goes to the engine and its answer is compared, character for character, with the one node gave (expected.txt); the
// table's 341 trees are decoded into the Swift types the app draws from and flattened the way node flattens them (sigs.txt); and the typed helpers
// (parse, the toolbar, Enter, Tab) are tried on a few texts. Prints what differs, then "Guide parity: N checks, M differ".
import Foundation

let args = CommandLine.arguments
guard args.count >= 3, let source = try? String(contentsOfFile: args[1], encoding: .utf8) else { print("usage: guide-parity <guide.js> <folder>"); exit(2) }
let dir = args[2]
let engine = GuideEngine(source: source)
var checks = 0, differ = 0
func report(_ ok: Bool, _ what: @autoclosure () -> String) {
  checks += 1
  if !ok { differ += 1; if differ <= 25 { print("  DIFFERS " + what()) } }
}
func lines(_ name: String) -> [String] {
  guard let s = try? String(contentsOfFile: dir + "/" + name, encoding: .utf8) else { print("missing \(name)"); exit(2) }
  var out = s.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
  if out.last == "" { out.removeLast() }
  return out
}
report(engine.failure.isEmpty, "the engine loads: \(engine.failure)")

// ---------- every call, compared with node ----------
let calls = lines("calls.txt"), expected = lines("expected.txt")
report(calls.count == expected.count, "calls and answers are as many (\(calls.count), \(expected.count))")
var byFn: [String: (n: Int, bad: Int)] = [:]
for (i, line) in calls.enumerated() where i < expected.count {
  guard let tab = line.firstIndex(of: "\t") else { continue }
  let fn = String(line[..<tab]), args = String(line[line.index(after: tab)...])
  let got = engine.callJSON(fn, args) ?? "\"__throws\""
  let ok = got == expected[i]
  var e = byFn[fn] ?? (0, 0); e.n += 1; if !ok { e.bad += 1 }; byFn[fn] = e
  report(ok, "\(fn) \(args.prefix(120)) → got \(got.prefix(160)) want \(expected[i].prefix(160))")
}
print("calls: " + byFn.keys.sorted().map { "\($0) \(byFn[$0]!.n)" }.joined(separator: ", "))
report(engine.errors == 0, "the engine hid no unexpected errors (\(engine.errors))")

// ---------- the trees the app draws from ----------
func sig(_ n: GuideInline) -> String {
  switch n {
  case .text(let v): return "T(\(v))"
  case .code(let v): return "C(\(v))"
  case .br: return "BR"
  case .img(let src, let alt, let title): return "IMG(\([src, alt, title].joined(separator: "|")))"
  case .a(let href, let title, let c): return "A(\(href)|\(title))[" + c.map(sig).joined(separator: ",") + "]"
  case .b(let c): return "B[" + c.map(sig).joined(separator: ",") + "]"
  case .i(let c): return "I[" + c.map(sig).joined(separator: ",") + "]"
  case .s(let c): return "S[" + c.map(sig).joined(separator: ",") + "]"
  }
}
func sig(_ bs: [GuideBlock]) -> String { bs.map(sig).joined(separator: ";") }
func sig(_ it: GuideItem) -> String { (it.checked == nil ? "-" : it.checked! ? "x" : "o") + "{" + sig(it.blocks) + "}" }
func sig(_ b: GuideBlock) -> String {
  switch b {
  case .h(let level, let inline, let id): return "H\(level)(\(id))[" + inline.map(sig).joined(separator: ",") + "]"
  case .p(let inline): return "P[" + inline.map(sig).joined(separator: ",") + "]"
  case .code(let lang, let text): return "CODE(\(lang))" + jsonString(text)
  case .quote(let bs): return "Q{" + sig(bs) + "}"
  case .ul(let tight, let items): return "UL(\(tight)){" + items.map(sig).joined() + "}"
  case .ol(let start, let tight, let items): return "OL(\(start),\(tight)){" + items.map(sig).joined() + "}"
  case .hr: return "HR"
  case .table(let align, let head, let rows):
    return "TABLE(" + align.joined(separator: ",") + ")<" + head.map { $0.map(sig).joined(separator: ",") }.joined(separator: "|") + ">"
      + rows.map { "<" + $0.map { $0.map(sig).joined(separator: ",") }.joined(separator: "|") + ">" }.joined()
  }
}
/// A string as JSON text, the way JSON.stringify writes it (only for code blocks, whose text is compared whole).
func jsonString(_ s: String) -> String {
  var o = "\""
  for u in s.unicodeScalars {
    switch u {
    case "\"": o += "\\\""
    case "\\": o += "\\\\"
    case "\n": o += "\\n"
    case "\r": o += "\\r"
    case "\t": o += "\\t"
    case "\u{08}": o += "\\b"
    case "\u{0C}": o += "\\f"
    default: if u.value < 0x20 { o += String(format: "\\u%04x", u.value) } else { o.unicodeScalars.append(u) }
    }
  }
  return o + "\""
}
// The table's texts are the first `parse` calls, in order (the recorded calls come after them).
let sigs = lines("sigs.txt")
let parseCalls = calls.filter { $0.hasPrefix("parse\t") }
var cases = 0
for (i, want) in sigs.enumerated() {
  guard i < parseCalls.count, let tab = parseCalls[i].firstIndex(of: "\t") else { report(false, "case \(i) has a parse call"); continue }
  let argsJSON = String(parseCalls[i][parseCalls[i].index(after: tab)...])
  guard let json = engine.callJSON("parse", argsJSON), let tree = try? JSONDecoder().decode([GuideBlock].self, from: Data(json.utf8)) else { report(false, "case \(i) decodes into the Swift tree"); continue }
  cases += 1
  // (node's line is a JSON string: read it back with the same quoting)
  let wantText = (try? JSONSerialization.jsonObject(with: Data(want.utf8), options: [.fragmentsAllowed])) as? String ?? want
  report(sig(tree) == wantText, "case \(i) tree: got \(sig(tree).prefix(200)) want \(wantText.prefix(200))")
}
print("trees: \(cases) of \(sigs.count) decoded and flattened like node's")

// ---------- the typed helpers ----------
report(engine.parse("# Hi *there*\n\n- [x] done").count == 2, "parse gives blocks")
report(engine.render("# A") == "<div class=\"gd\"><h1 id=\"g-a\">A</h1></div>", "render gives the page's html")
report(engine.plain("**a** [b](https://x.com)") == "a b", "plain")
report(engine.headings("# One\n## Two").map(\.text) == ["One", "Two"], "headings")
report(engine.edit("bold", "hello world", 0, 5) == GuideEdit(text: "**hello** world", a: 2, b: 7), "bold")
report(engine.heading("title", 0, 0, level: 2)?.text == "## title", "heading")
report(engine.link("go", 0, 2, url: "https://x.com")?.text == "[go](https://x.com)", "link")
report(engine.image("", 0, 0, src: "/media/a-1.png")?.text == "![image](/media/a-1.png)", "image")
report(engine.continueList("- a", 3) == GuideEnter(text: "- a\n- ", pos: 6), "Enter in a list")
report(engine.continueList("plain", 5) == nil, "Enter outside a list does nothing special")
report(engine.indent("- a", 0, 3, out: false)?.text == "  - a", "Tab on a list line")
report(engine.indent("plain", 0, 5, out: false)?.text == "plain", "Tab on a plain line changes nothing")
// emoji count as two UTF-16 positions, as in the text field
report(engine.edit("bold", "😀 hi", 3, 5) == GuideEdit(text: "😀 **hi**", a: 5, b: 7), "positions are UTF-16 offsets")

print("Guide parity: \(checks) checks, \(differ) differ")
exit(differ == 0 ? 0 : 1)
