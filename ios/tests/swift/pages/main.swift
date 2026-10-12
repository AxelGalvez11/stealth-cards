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
// A Mind map's merge goes by its kind, through web/maps.js in JavaScriptCore (a 4th argument: the app's maps.js).
if a.count > 4 {
  MapEngine.shared = MapEngine(source: read(a[4]))
  check(MapEngine.shared.ok, "maps.js loads for the merge", MapEngine.shared.failure)
  let how = PageMerge.of("mindmap")
  check(how != nil && PageMerge.of("diagram") == nil && PageMerge.of("slides") == nil, "a merge for notes and mind maps, none for a kind with none (theirs stays)")
  for (i, c) in (cases["mapMerges"] as? [[String: Any]] ?? []).enumerated() {
    let got = (how?(PageJSON.text(c["base"]!), PageJSON.text(c["mine"]!), PageJSON.text(c["theirs"]!)) ?? nil) ?? ""
    check(PageJSON.text(PageJSON.object(got) ?? [:]) == PageJSON.text(c["out"]!), "mind map merge \(i) is maps.merge's", got + "  wanted " + PageJSON.text(c["out"]!))
  }
  check(PageEmpty.of("mindmap")["root"] != nil && PageEmpty.of("note")["blocks"] != nil, "a kind's own empty data, never a Note's blocks on a map")
  // What was typed while a merged save went out goes on top of the merged page (Data/Pages.swift flush), as web/pagesclient.js does it.
  for c in cases["rebases"] as? [[String: Any]] ?? [] {
    let kind = c["kind"] as! String
    let got = PageMerge.rebase(kind, sent: PageJSON.text(c["sent"]!), waiting: PageJSON.text(c["waiting"]!), merged: PageJSON.text(c["merged"]!)) ?? ""
    check(PageJSON.text(PageJSON.object(got) ?? [:]) == PageJSON.text(c["out"]!), "a " + kind + " typed in during a merge keeps the other writer's change, as pagesclient.js", got + "  wanted " + PageJSON.text(c["out"]!))
  }
  check((cases["rebases"] as? [Any])?.count == 2, "node wrote the cases of typing during a merge")
  // A Mind map merge that fails answers nil (Data/Pages.swift: "Your change wasn't saved"), never theirs passed off as both kept.
  let src = read(a[4])
  MapEngine.shared = MapEngine(source: src.replacingOccurrences(of: "function mergeMind(base, mine, theirs, prefer) {", with: "function mergeMind(base, mine, theirs, prefer) { throw new Error('broken');"))
  let mm = (cases["mapMerges"] as? [[String: Any]] ?? []).first!
  let broken = PageMerge.of("mindmap")
  check(broken != nil && (broken!(PageJSON.text(mm["base"]!), PageJSON.text(mm["mine"]!), PageJSON.text(mm["theirs"]!)) ?? nil) == nil && MapEngine.shared.ok,
        "a mind map merge that fails says so (nil), and the engine stays ok")
  check(PageMerge.rebase("mindmap", sent: PageJSON.text(mm["base"]!), waiting: PageJSON.text(mm["mine"]!), merged: PageJSON.text(mm["theirs"]!)) == nil, "…and so does putting a waiting change on top")
  MapEngine.shared = MapEngine(source: src)
}
print("Pages: \(passed) passed, \(failed) failed")
exit(failed == 0 ? 0 : 1)
