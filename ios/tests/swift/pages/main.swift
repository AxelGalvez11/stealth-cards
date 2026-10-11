// The iPhone's Pages on the Mac with no simulator (ios/tests/pages-check.sh): web/pageblocks.js in JavaScriptCore beside guide.js (GuideEngine) against node,
// Markdown -> a Note's blocks -> Markdown, ids kept from the note it was written from; and the 409 merge (Data/PageData.swift PageMerge) against
// web/pagesclient.js's own merge on the same cases.
//   pages-check <guide.js> <pageblocks.js> <folder with pages-cases.json>
// Prints each check as "  ok   ..." or "  FAIL ..." and a last line "Pages: N passed, M failed".
import Foundation

var passed = 0, failed = 0
func check(_ ok: Bool, _ name: String, _ got: @autoclosure () -> String = "") {
  if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name + "  → " + got().replacingOccurrences(of: "\n", with: "\\n")) }
}
let a = CommandLine.arguments
let read = { (p: String) in (try? String(contentsOfFile: p, encoding: .utf8)) ?? "" }
let G = GuideEngine(source: read(a[1]), pageBlocks: read(a[2]))
check(G.hasPageBlocks && G.failure.isEmpty, "pageblocks.js loads beside guide.js", G.failure)
let cases = PageJSON.object(read(a[3] + "/pages-cases.json")) as! [String: Any]

/// A note's JSON with the ids left out (`keep`: the ids that stay).
func noIds(_ v: Any, keep: Set<String> = []) -> Any {
  if let d = v as? [String: Any] { var o: [String: Any] = [:]; for (k, x) in d where !(k == "id" && !keep.contains(x as? String ?? "")) { o[k] = noIds(x, keep: keep) }; return o }
  if let l = v as? [Any] { return l.map { noIds($0, keep: keep) } }
  return v
}
func ids(_ v: Any) -> Set<String> {
  if let d = v as? [String: Any] { return d.values.reduce(Set(d["id"].flatMap { $0 as? String }.map { [$0] } ?? [])) { $0.union(ids($1)) } }
  if let l = v as? [Any] { return l.reduce(Set()) { $0.union(ids($1)) } }
  return []
}

for (i, c) in (cases["round"] as! [[String: Any]]).enumerated() {
  let md = c["md"] as! String
  let note = G.markdownToNote(md, previous: nil)
  check(PageJSON.text(noIds(PageJSON.object(note)!)) == PageJSON.text(noIds(c["note"]!)), "Markdown \(i) as blocks, as node reads it", note)
  let back = G.noteToMarkdown(note)
  check(back == c["back"] as! String, "Markdown \(i) written back, as node writes it", back)
  check(G.noteToMarkdown(G.markdownToNote(back, previous: note)) == back, "Markdown \(i) read and written again is the same")
}
let kept = cases["kept"] as! [String: Any], prevIds = ids(kept["previous"]!)
let k = G.markdownToNote(kept["md"] as! String, previous: PageJSON.text(kept["previous"]!))
check(PageJSON.text(noIds(PageJSON.object(k)!, keep: prevIds)) == PageJSON.text(noIds(kept["note"]!, keep: prevIds)), "an edited note keeps the ids of the blocks that didn't change", k)
check(ids(PageJSON.object(k)!).intersection(prevIds).count == ids(kept["note"]!).intersection(prevIds).count && !prevIds.isEmpty, "as many ids kept as node keeps")

for (i, c) in (cases["merges"] as! [[String: Any]]).enumerated() {
  let got = PageMerge.merge(base: PageJSON.text(c["base"]!), mine: PageJSON.text(c["mine"]!), theirs: PageJSON.text(c["theirs"]!))
  check(got == PageJSON.text(c["out"]!), "merge \(i) is pagesclient.js's", got + "  wanted " + PageJSON.text(c["out"]!))
}
print("Pages: \(passed) passed, \(failed) failed")
exit(failed == 0 ? 0 : 1)
