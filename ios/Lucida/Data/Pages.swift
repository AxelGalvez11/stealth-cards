// The app's side of Pages (web/pages.mjs, /api/pages), the iPhone's web/pagesclient.js: each deck's list of pages, the pages opened, their versions, and
// saving them.
//   - Lists and pages are kept here and fetched when first asked for; the screens draw again when they arrive.
//   - /api/rev says when the person's pages last changed (an AI app's change over MCP, another device): Store's check every 3 seconds hands it to onRev,
//     and what's kept is fetched again (a page being written in is left alone; its save merges).
//   - A save goes out a moment after the last change (one at a time per page) from the version the screen showed. When the page changed meanwhile (409), the
//     two are merged block by block (PageMerge): the blocks this person changed (or added, or took out) since that version go onto the newer one, everything
//     else is the newer one's, and that is saved on top. `conflict(id)` then says who changed it and which versions hold what, for the line on the page.
//     The merge goes by the page's kind (PageMerge.of): a kind with none never sends what was written here over the other's; the page shows theirs, and
//     the saving line says what wasn't saved.
//   - Only the kinds this build can show (PageKind.ready) are ever written from here, and only a Note as Markdown.
//   - A Note is edited as Markdown (the Notes editor's): `markdown(id)` is what was typed here while it's being saved (so the editor's words never jump), else
//     the saved blocks as Markdown; `editMarkdown` turns it back into blocks (web/pageblocks.js, which keeps the ids of the blocks that didn't change).
import SwiftUI

@MainActor
final class PagesStore: ObservableObject {
  /// Who changed a page while it was being written, and the versions: theirs, and the one that holds both.
  struct Conflict: Equatable { var by: String, ai: Bool, theirs: Int, mine: Int }
  /// What a page's save is doing: going (or waiting to), what went wrong, and when it last saved.
  struct Saving: Equatable { var busy = false, err = "", saved: Double = 0 }
  private final class Q {
    var base: Int, baseData: String
    var title: String? = nil, data: String? = nil
    var timer: Task<Void, Never>? = nil
    var busy = false, err = "", saved: Double = 0
    init(base: Int, baseData: String) { self.base = base; self.baseData = baseData }
  }

  private let api: API
  let demo: Bool
  /// What went wrong that the person should hear (a restore that failed), in the app's quiet message.
  var say: (String) -> Void = { _ in }
  private var mds: [String: String] = [:]
  private var lists: [String: [PageInfo]] = [:]
  private var byId: [String: PageInfo] = [:]
  private var missing: Set<String> = []
  private var vers: [String: [PageVersion]] = [:]
  private var versAsked: Set<String> = []
  private var asked: Set<String> = []
  private var conflicts: [String: Conflict] = [:]
  /// A Mind map's data put on top of a merge (or theirs, when this change couldn't be), for the open map to take before its next change.
  private var rebased: [String: String] = [:]
  private var queue: [String: Q] = [:]
  /// What went wrong with a page's last save when there's nothing left to send (until the next change).
  private var errs: [String: String] = [:]
  private var rev: Double = 0
  /// How long after the last change a save goes out (pagesclient's 700 ms), and how long after one fails it tries again.
  static var wait: UInt64 = 700_000_000, retry: UInt64 = 4_000_000_000

  init(api: API, demo: Bool) {
    self.api = api; self.demo = demo
    if demo { NotePagesSample.fill(&lists, &byId, &vers) }
  }
  private func changed() { objectWillChange.send() }
  private func key(_ scope: String, _ id: String) -> String { scope + "|" + id }

  // ---------- fetching ----------
  private func fetchList(_ scope: String, _ id: String) {
    let k = key(scope, id)
    guard !demo, !asked.contains("l" + k) else { return }
    asked.insert("l" + k)
    Task {
      defer { asked.remove("l" + k) }
      guard let (st, j) = try? await api.pages("api/pages?scope=" + scope + "&id=" + (id.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? id)), st == 200 else { return }
      lists[k] = ((j["pages"] as? [Any]) ?? []).compactMap { ($0 as? [String: Any]).map(PageInfo.init(json:)) }
      if let r = (j["rev"] as? NSNumber)?.doubleValue, r > rev { rev = r }
      changed()
    }
  }
  private func fetchPage(_ id: String) {
    guard !demo, !asked.contains("p" + id) else { return }
    asked.insert("p" + id)
    Task {
      defer { asked.remove("p" + id) }
      guard let (st, j) = try? await api.pages("api/pages/" + id) else { return }
      if st == 200 {
        let q = queue[id]
        if q == nil || (q!.timer == nil && !q!.busy) { byId[id] = PageInfo(json: j); mds[id] = nil; missing.remove(id) }
        changed()
      } else if st == 404 { byId[id] = nil; missing.insert(id); changed() }
    }
  }
  /// Something changed on the server (/api/rev's `pages`): what's kept is fetched again (a page being written in is left alone; its save merges).
  func onRev(_ r: Double) {
    guard r > rev else { return }
    rev = r
    for k in lists.keys { let p = k.split(separator: "|", maxSplits: 1).map(String.init); if p.count == 2 { fetchList(p[0], p[1]) } }
    for id in byId.keys where queue[id] == nil { fetchPage(id) }
    vers = [:]
  }

  // ---------- what the screens read ----------
  /// The pages of a deck or folder ([] until they arrive; `loaded` says whether they have).
  func list(_ scope: String, _ id: String) -> [PageInfo] {
    let k = key(scope, id)
    if lists[k] == nil { DispatchQueue.main.async { self.fetchList(scope, id) } }
    return lists[k] ?? []
  }
  func loaded(_ scope: String, _ id: String) -> Bool { lists[key(scope, id)] != nil }
  /// One page with its data (nil until it arrives, or when there's no such page: `isMissing`). What's being saved shows as it is here.
  func page(_ id: String) -> PageInfo? {
    if byId[id] == nil && !missing.contains(id) { DispatchQueue.main.async { self.fetchPage(id) } }
    return byId[id]
  }
  func isMissing(_ id: String) -> Bool { missing.contains(id) }
  func saving(_ id: String) -> Saving {
    guard let q = queue[id] else { return Saving(err: errs[id] ?? "") }
    return Saving(busy: q.busy || q.timer != nil, err: q.err, saved: q.saved)
  }
  func conflict(_ id: String) -> Conflict? { conflicts[id] }
  /// The data a merge left a page with while more was waiting here (taken once): the open map shows it and makes its next change on it.
  func takeRebased(_ id: String) -> String? { rebased.removeValue(forKey: id) }
  func clearConflict(_ id: String) { conflicts[id] = nil; changed() }
  /// Its versions, newest first (nil until they arrive).
  func versions(_ id: String) -> [PageVersion]? {
    if vers[id] == nil && !versAsked.contains(id) && !demo {
      versAsked.insert(id)
      Task {
        defer { versAsked.remove(id) }
        if let (st, j) = try? await api.pages("api/pages/" + id + "/versions"), st == 200 {
          vers[id] = ((j["versions"] as? [Any]) ?? []).compactMap { ($0 as? [String: Any]).map(PageVersion.init(json:)) }
          changed()
        }
      }
    }
    return vers[id]
  }
  /// A Note as Markdown, for the editor: what was typed here while it's being saved, else the saved blocks as Markdown.
  func markdown(_ id: String) -> String {
    if let m = mds[id] { return m }
    guard let p = byId[id], p.kind == "note" else { return "" }
    return GuideEngine.shared.noteToMarkdown(p.data)
  }

  // ---------- changes ----------
  func editMarkdown(_ id: String, _ md: String) {
    guard let p = byId[id], p.kind == "note" else { return }
    mds[id] = md
    edit(id, data: GuideEngine.shared.markdownToNote(md, previous: p.data))
  }
  /// A change: shown at once, saved a moment after the last one.
  func edit(_ id: String, title: String? = nil, data: String? = nil) {
    guard var p = byId[id], PageKind.canShow(p.kind) else { return }
    if demo { if let title { p.title = title }; byId[id] = p; changed(); return }
    errs[id] = nil
    let q = queue[id] ?? Q(base: p.version, baseData: p.data)
    queue[id] = q
    if let title { q.title = title; p.title = title }
    if let data { q.data = data; p.data = data }
    byId[id] = p
    q.timer?.cancel()
    // (the save runs in this task: it lets go of `timer` first, so flush doesn't cancel the request it makes)
    q.timer = Task { [weak self] in
      try? await Task.sleep(nanoseconds: PagesStore.wait)
      guard !Task.isCancelled else { return }
      q.timer = nil
      await self?.flush(id)
    }
    changed()
  }
  /// Sends what's waiting for a page now (leaving it, Versions, Restore).
  func flush(_ id: String) async {
    guard let q = queue[id], !q.busy else { return }
    q.timer?.cancel(); q.timer = nil; q.busy = true
    let title = q.title, data = q.data, kind = byId[id]?.kind ?? "note"
    q.title = nil; q.data = nil
    var final = false
    do {
      var body: [String: Any] = ["op": "update", "page": id, "baseVersion": q.base]
      if let title { body["title"] = title }
      if let data { body["data"] = PageJSON.object(data) ?? PageEmpty.of(kind) }
      // (a Mind map's version says what changed: maps.summaryOf(maps.diff(…)), "Added 3 ideas under Mitochondria")
      if let data, kind == "mindmap" { let s = MapEngine.shared.summary(kind, q.baseData, data); if !s.isEmpty && s != "No changes" { body["summary"] = s } }
      var (st, j) = try await api.pages("", body: body)
      var lost = ""
      /// What a merged save sent (what's written here meanwhile was made from it: it's put on top of the merged page below).
      var sentMerged: String? = nil
      if st == 409, j["code"] as? String == "conflict", let curJ = j["current"] as? [String: Any] {
        let cur = PageInfo(json: curJ)
        let how = PageMerge.of(cur.kind)
        let merged: String? = data.flatMap { d in how.flatMap { $0(q.baseData, d, cur.data) } }
        if data != nil && merged == nil {
          // no merge for this kind (or it failed): theirs stays, and nothing written here goes over it
          lost = "Your change wasn’t saved: " + (cur.by.isEmpty ? "someone" : cur.by) + " changed this page (v\(cur.version))."
          q.data = nil; q.title = nil; mds[id] = nil
          if byId[id]?.kind == "mindmap" { rebased[id] = cur.data }
          (st, j) = (200, curJ)
        } else {
          sentMerged = merged != nil ? data : nil
          var again: [String: Any] = ["op": "update", "page": id, "baseVersion": cur.version, "summary": "Kept what you wrote, with " + (cur.by.isEmpty ? "the other" : cur.by) + "’s change"]
          if let title { again["title"] = title }
          if let merged { again["data"] = PageJSON.object(merged) ?? PageEmpty.of(cur.kind) }
          (st, j) = try await api.pages("", body: again)
          if (200..<300).contains(st) {
            conflicts[id] = Conflict(by: cur.by, ai: cur.ai, theirs: cur.version, mine: PageInfo.int(j["version"]))
            if q.data == nil { mds[id] = nil }   // the page shows the merged one
          }
        }
      }
      guard (200..<300).contains(st) else {
        // a kind this build can't write ("ready"), or data that isn't the page's kind ("shape"): trying again won't help
        let code = j["code"] as? String ?? ""
        final = code == "ready" || code == "shape"
        throw APIError.server(j["error"] as? String ?? "Couldn’t save.")
      }
      var p = PageInfo(json: j)
      q.base = p.version; q.baseData = p.data
      if let sent = sentMerged, let waiting = q.data {
        // (typed while the merge went out: on top of the merged page too, or theirs would go with the next save, which meets no conflict)
        if let r = PageMerge.rebase(p.kind, sent: sent, waiting: waiting, merged: p.data) { q.data = r }
        else { q.data = nil; lost = "Your last change wasn’t saved: " + (p.by.isEmpty ? "someone" : p.by) + " changed this page." }
        if p.kind == "note" { mds[id] = nil } else { rebased[id] = q.data ?? p.data }
      }
      if let d = q.data { p.data = d }
      if let t = q.title { p.title = t }
      byId[id] = p
      if lost.isEmpty { q.saved = Date().timeIntervalSince1970 * 1000 }
      q.err = lost
      vers[id] = nil
      for (k, l) in lists where l.contains(where: { $0.id == id }) {
        lists[k] = l.map { x in var y = x; if y.id == id { y.title = p.title; y.version = p.version; y.by = p.by; y.ai = p.ai; y.updated = p.updated }; return y }
      }
    } catch {
      q.err = (error as? LocalizedError)?.errorDescription ?? "Couldn’t save."
      if !final && data != nil && q.data == nil { q.data = data }
      if !final && title != nil && q.title == nil { q.title = title }
    }
    q.busy = false
    changed()
    if q.data != nil || q.title != nil {
      if !q.err.isEmpty {
        q.timer = Task { [weak self] in try? await Task.sleep(nanoseconds: PagesStore.retry); guard !Task.isCancelled else { return }; q.timer = nil; await self?.flush(id) }
      } else { await flush(id) }
    } else if q.err.isEmpty { queue[id] = nil; changed() }
    else if q.timer == nil { errs[id] = q.err; queue[id] = nil; changed() }   // nothing left to send: the line stays until the next change
  }

  /// A new page in a deck (or folder): kept here and put at the end of its list.
  func create(_ scope: String, _ id: String, kind: String = "note", title: String = "") async throws -> PageInfo {
    let (st, j) = try await api.pages("", body: ["op": "create", "scope": scope, "id": id, "kind": kind, "title": title, "parent": ""])
    guard (200..<300).contains(st) else { throw APIError.server(j["error"] as? String ?? "Couldn’t make the page.") }
    let p = PageInfo(json: j)
    byId[p.id] = p; missing.remove(p.id)
    let k = key(scope, p.scopeId.isEmpty ? id : p.scopeId)
    lists[k] = (lists[k] ?? []) + [p]
    changed()
    return p
  }
  func remove(_ pid: String) async throws {
    let (st, j) = try await api.pages("", body: ["op": "delete", "page": pid])
    guard (200..<300).contains(st) else { throw APIError.server(j["error"] as? String ?? "Couldn’t delete the page.") }
    queue[pid]?.timer?.cancel()
    byId[pid] = nil; mds[pid] = nil; queue[pid] = nil; missing.insert(pid)
    for (k, l) in lists { lists[k] = l.filter { $0.id != pid }.map { x in var y = x; if y.parent == pid { y.parent = "" }; return y } }
    changed()
  }
  /// An older version brought back (what's there now stays a version too).
  @discardableResult
  func restore(_ pid: String, _ v: Int) async -> PageInfo? {
    await flush(pid)
    guard let p = byId[pid] else { return nil }
    do {
      let (st, j) = try await api.pages("", body: ["op": "restore", "page": pid, "version": v, "baseVersion": p.version])
      guard (200..<300).contains(st) else { throw APIError.server(j["error"] as? String ?? "Couldn’t restore it.") }
      let got = PageInfo(json: j)
      byId[pid] = got; mds[pid] = nil; vers[pid] = nil
      for (k, l) in lists where l.contains(where: { $0.id == pid }) {
        lists[k] = l.map { x in var y = x; if y.id == pid { y.title = got.title; y.version = got.version; y.by = got.by; y.ai = got.ai; y.updated = got.updated }; return y }
      }
      changed()
      return got
    } catch {
      say((error as? LocalizedError)?.errorDescription ?? "Couldn’t restore it.")
      return nil
    }
  }
  /// Leaving the app sends what's waiting.
  func flushAll() { for id in queue.keys { Task { await flush(id) } } }

  #if DEBUG
  /// (the checks) The page as kept, and what's waiting to be saved.
  func debugState(_ id: String) -> (page: PageInfo?, waiting: Bool) { (byId[id], queue[id] != nil) }
  #endif
}

/// The design screens' sample pages (design/pages.mjs SAMPLE and NOTE_SAMPLE_MD): the deck's list and the Note "Cellular respiration".
enum NotePagesSample {
  static let deck = "cell"
  static let note = "ps1"
  static let md = "# Cellular respiration\n\nCells turn glucose into ATP in three stages. Most of the ATP comes from the last one, on the inner membrane of the mitochondrion.\n\n:::chain\nGlycolysis\nPyruvate\nAcetyl-CoA\nKrebs cycle\nElectron transport\n:::\n\n:::trap\nGlycolysis happens in the cytoplasm, not the mitochondrion, and needs no oxygen.\n:::\n\n:::pearl\nOxygen is the last electron acceptor: no O₂, no electron transport, almost no ATP.\n:::\n\n:::mnemonic\n“Can I Keep Selling Seashells For Money, Officer?”: the Krebs cycle’s steps in order.\n:::\n\n## Where each stage happens\n\n| Stage | Where | ATP made |\n| --- | --- | --- |\n| Glycolysis | Cytoplasm | 2 |\n| Krebs cycle | Matrix | 2 |\n| Electron transport | Inner membrane | ~34 |\n\n:::toggle Why does cyanide stop it?\nIt blocks complex IV, so oxygen can’t take the electrons and the chain stops.\n:::\n\n## The whole picture\n\n::page ps2\n\n## From your cards\n\n::card c1\n"
  static func fill(_ lists: inout [String: [PageInfo]], _ byId: inout [String: PageInfo], _ vers: inout [String: [PageVersion]]) {
    let day = 864e5, now = Date().timeIntervalSince1970 * 1000
    let rows: [(String, String, String, Bool, Int, Bool)] = [
      ("note", "Guide", "Claude", true, 7, false), ("note", "Cellular respiration", "you", false, 12, true), ("mindmap", "The cell at a glance", "Claude", true, 3, true),
      ("slides", "Exam 5 review", "ChatGPT", true, 2, false), ("diagram", "Electron transport chain", "Claude", true, 5, false), ("doc", "Lecture 14 slides.pdf", "you", false, 1, false)]
    var list: [PageInfo] = []
    for (i, r) in rows.enumerated() {
      list.append(PageInfo(id: "ps\(i)", kind: r.0, title: r.1, version: r.4, by: r.2, ai: r.3, updated: now - Double(i) * day - (i == 0 ? day - 120_000 : 0), parent: r.5 ? "ps0" : ""))
    }
    lists["deck|" + deck] = list
    var p = list[1]; p.scopeId = deck; p.data = GuideEngine.shared.markdownToNote(md, previous: nil)
    byId[note] = p
    // the Mind map "The cell at a glance" (design/maps.mjs MAP_SAMPLE), for PhonePageMindmap and the map inside the Note
    var mp = list[2]; mp.scopeId = deck; mp.data = MapDemo.sample.data.text
    byId[mp.id] = mp
    vers[note] = [PageVersion(version: 12, by: "you", ai: false, at: now - day, summary: "Added the table of stages"),
                  PageVersion(version: 11, by: "Claude", ai: true, at: now - 9e7, summary: "Added the trap and the pearl, linked 2 weak cards"),
                  PageVersion(version: 9, by: "ChatGPT", ai: true, at: now - 3e8, summary: "Made the page from Lecture 14 slides.pdf")]
  }
}
