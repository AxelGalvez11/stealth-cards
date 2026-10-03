// The Guide editor's memory (Data/GuideEditor.swift) against a stand-in for the server, on the Mac with no simulator: what is typed is saved a moment after the last key, once, with the
// last words; saves go one after another and in order; "Saving…" and "Saved" say what is going on; a failed save says why, waits, and goes out again with the next key; switching
// pages, adding one, History, and Done all send what is waiting first; Restore and deleting a page drop what was typed for it; a page's name saves a moment after the last key.
// Prints each check as "  ok   ..." or "  FAIL ..." and a last line "Guide editor: N passed, M failed".
import Foundation

var passed = 0, failed = 0
func check(_ ok: Bool, _ name: String) { if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name) } }
func sleep(_ s: Double) async { try? await Task.sleep(nanoseconds: UInt64(s * 1_000_000_000)) }

struct Down: LocalizedError { var errorDescription: String? { "Couldn’t reach Lucida. Check your connection and try again." } }

/// What the stand-in server saw: every save (deck, page, text, when it began and ended), and how it should behave.
@MainActor final class Spy {
  var saves: [(deck: String, page: String, text: String, began: Double, ended: Double)] = []
  var renames: [(String, String, String)] = [], restores: [(String, String, Double)] = [], deletes: [(String, String)] = [], adds: [String] = [], addParents: [String] = [], histories = 0
  var failNext = 0, saveTime = 0.0
  var t0 = Date()
  var now: Double { Date().timeIntervalSince(t0) }
  func env() -> GuideEditorModel.Env {
    var e = GuideEditorModel.Env()
    e.save = { [unowned self] d, p, text in
      let began = now
      if failNext > 0 { failNext -= 1; throw Down() }
      if saveTime > 0 { await sleep(saveTime) }
      saves.append((d, p, text, began, now))
    }
    e.addPage = { [unowned self] d, title, parent in adds.append(title); addParents.append(parent); return "g9" }
    // (Like a real request, it stops if the task it runs in was cancelled.)
    e.rename = { [unowned self] d, p, title in try Task.checkCancellation(); renames.append((d, p, title)) }
    e.delete = { [unowned self] d, p in deletes.append((d, p)) }
    e.restore = { [unowned self] d, p, at in restores.append((d, p, at)) }
    e.history = { [unowned self] _, _ in histories += 1; return [GuideVersion(at: 2, saved: 2, text: "Second"), GuideVersion(at: 1, saved: 1, text: "First")] }
    return e
  }
}
@MainActor func make(_ spy: Spy, delay: Double = 0.2) -> GuideEditorModel { let m = GuideEditorModel(deckId: "d1", env: spy.env()); m.delay = delay; spy.t0 = Date(); return m }

@MainActor func run() async {
  // typing: saved once, a moment after the last key, with the last words
  do {
    let spy = Spy(), m = make(spy)
    check(m.saveLabel == "" && !m.hasPending, "nothing typed: no label, nothing waiting")
    m.type("a"); await sleep(0.05); m.type("ab"); await sleep(0.05); m.type("abc")
    check(m.saveLabel == "Saved" && spy.saves.isEmpty && m.hasPending, "a key and the page already says Saved (nothing is wrong), and it waits for a moment of quiet")
    await sleep(0.1)
    check(spy.saves.isEmpty, "the wait starts again with every key")
    await sleep(0.3)
    check(spy.saves.count == 1 && spy.saves[0].text == "abc" && spy.saves[0].page == "main" && spy.saves[0].deck == "d1", "then one save, with the last words, for the Guide")
    check(m.saveLabel == "Saved" && !m.hasPending && !m.saving, "and it says Saved")
    check(m.text(saved: "old") == "abc", "the field shows what was typed, not what was saved before")
  }
  // while a save goes out the page says Saving…, and saves go one after another
  do {
    let spy = Spy(); spy.saveTime = 0.4
    let m = make(spy)
    m.type("one"); await sleep(0.35)
    check(m.saving && m.saveLabel == "Saving…", "a save under way says Saving…")
    m.type("two")
    await sleep(0.1)
    check(spy.saves.isEmpty, "a key typed while it goes out waits (nothing has finished, nothing new has begun)")
    await sleep(0.9)
    check(spy.saves.map(\.text) == ["one", "two"], "the saves go one after another, in order: \(spy.saves.map(\.text))")
    check(spy.saves.count == 2 && spy.saves[1].began >= spy.saves[0].ended - 0.001, "the second begins when the first is over")
    check(m.saveLabel == "Saved", "and at the end it says Saved")
  }
  // a failure says why, waits, and goes out with the next key
  do {
    let spy = Spy(); spy.failNext = 1
    let m = make(spy)
    m.type("x"); await sleep(0.5)
    check(m.error == Down().errorDescription! && m.saveLabel == Down().errorDescription!, "a save that fails shows the server’s words where Saved was")
    check(m.hasPending && spy.saves.isEmpty && !m.saving, "what was typed waits to be sent")
    await sleep(0.4)
    check(spy.saves.isEmpty, "it is not tried again until there is a reason")
    m.type("xy"); await sleep(0.5)
    check(spy.saves.map(\.text) == ["xy"] && m.error.isEmpty && m.saveLabel == "Saved", "the next key sends it, and the line says Saved again")
    spy.failNext = 1
    m.type("xyz")
    await m.flush()
    check(!m.error.isEmpty && m.hasPending, "leaving (flush) with a failing save says so and keeps what was typed")
    await m.flush()
    check(m.error.isEmpty && spy.saves.map(\.text) == ["xy", "xyz"], "and the next time it is asked for it is sent")
  }
  // other pages: each has its own words; switching sends what is waiting first
  do {
    let spy = Spy()
    let m = make(spy, delay: 5)
    m.type("guide words")
    await m.pick("g1")
    check(spy.saves.map(\.text) == ["guide words"] && spy.saves[0].page == "main" && m.page == "g1" && !m.hasPending, "another page: what was typed is sent before it shows")
    m.type("page words")
    check(m.text(saved: "") == "page words" && m.drafts["d1|main"] == "guide words" && m.drafts["d1|g1"] == "page words", "each page keeps its own words")
    await m.flush()
    check(spy.saves.map(\.page) == ["main", "g1"], "and each is saved to its own page")
    await m.pick("main")
    check(m.text(saved: "old") == "guide words", "going back to the Guide shows what was typed there")
  }
  // add a page, delete a page, restore, History
  do {
    let spy = Spy()
    let m = make(spy, delay: 5)
    m.type("words")
    await m.addPage(inside: "main")
    check(spy.saves.count == 1 && spy.adds == ["New page"] && spy.addParents == ["main"] && m.page == "g9" && !m.historyOpen, "Add a page inside sends what is waiting, makes the page inside the open one, and writes on it")
    m.type("page"); await m.flush()
    await m.deletePage()
    check(spy.deletes.count == 1 && spy.deletes[0] == ("d1", "g9") && m.page == "main" && m.drafts["d1|g9"] == nil, "deleting a page goes back to the Guide and forgets what was typed for it")
    m.type("typed"); await m.toggleHistory()
    check(m.historyOpen && spy.histories == 1 && m.versions?.map(\.text) == ["Second", "First"] && spy.saves.last?.text == "typed", "History sends what is waiting, then lists the versions, newest first")
    await m.restore(m.versions![1])
    check(spy.restores.count == 1 && spy.restores[0].2 == 1 && !m.historyOpen && m.versions == nil && m.drafts["d1|main"] == nil, "Restore brings the version back, closes History and forgets the typing (the editor shows what the library says now)")
    await m.toggleHistory(); await m.toggleHistory()
    check(!m.historyOpen, "the History button opens it and closes it")
  }
  // a page's name: a moment after the last key, once
  do {
    let spy = Spy()
    let m = make(spy)
    m.page = "g1"
    m.rename("M"); await sleep(0.2); m.rename("Mn"); await sleep(0.2); m.rename("Mnemonics")
    check(spy.renames.isEmpty, "the name waits for a moment of quiet too")
    await sleep(0.9)
    check(spy.renames.count == 1 && spy.renames[0] == ("d1", "g1", "Mnemonics"), "then one rename, with the last name")
  }
  // leaving the page (Done, another page) sends a name that is still waiting, at once
  do {
    let spy = Spy()
    let m = make(spy)
    m.page = "g1"
    m.rename("Mine")
    await m.flush()
    check(spy.renames.count == 1 && spy.renames[0] == ("d1", "g1", "Mine"), "a name still waiting is sent when the page is left")
    await sleep(0.9)
    check(spy.renames.count == 1, "and not sent again a moment later")
  }
  // a page over what a Guide may hold says so and is not sent; once it's shorter again it saves
  do {
    let spy = Spy()
    let m = make(spy, delay: 0.1)
    m.type(String(repeating: "a", count: GuideEditorModel.most + 1))
    await sleep(0.4)
    check(spy.saves.isEmpty && m.error == "This page is full." && m.saveLabel == "This page is full.", "a page that is too long says “This page is full.” and waits")
    m.type("short again")
    await sleep(0.4)
    check(spy.saves.map(\.text) == ["short again"] && m.error.isEmpty && m.saveLabel == "Saved", "and saves once it fits")
  }
  print("Guide editor: \(passed) passed, \(failed) failed")
  exit(failed == 0 ? 0 : 1)
}
Task { await run() }
dispatchMain()
