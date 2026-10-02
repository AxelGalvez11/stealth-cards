// The iPhone's Notes page rules (Data/Notes.swift: NotesPage) on the Mac with no simulator, with web/guide.js in JavaScriptCore reading the Markdown into blocks and
// writing it back: a blank note, the shortcuts that make blocks, Enter and Backspace, Tab, what Aa, To-do, Bullets and Toggle make of a line, Bold and the rest, a link,
// pasting more than one line, toggles and folded sections (what shows, and what this Mac remembers), and that what is saved is the Markdown the web writes.
// The rules are web/notes.js's: the expected Markdown here is what the web's page saves for the same keys.
//   notes-rules        (guide.js beside it, where the app's bundle would have it)
// Prints each check as "  ok   ..." or "  FAIL ..." and a last line "Notes rules: N passed, M failed".
import Foundation

var passed = 0, failed = 0
func check(_ ok: Bool, _ name: String, _ got: @autoclosure () -> String = "") {
  if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name + { let g = got(); return g.isEmpty ? "" : "  → " + g.replacingOccurrences(of: "\n", with: "\\n") }()) }
}
func R(_ t: String) -> [NoteRun] { [NoteRun(t)] }

/// A page with these words, being written in; `md()` sends what changed and says what is saved.
@MainActor final class Page {
  let p = NotesPage()
  private(set) var saved: String
  init(_ md: String, editable: Bool = true, key: String = "rules|main") {
    saved = md
    p.onChange = { [unowned self] in self.saved = $0 }
    p.load(md, key: key, editable: editable, blank: editable)
  }
  func md() -> String { p.flush(); return saved }
  var kinds: [String] { p.blocks.map { $0.k + ($0.k == "h" ? String($0.level) : "") + ($0.d > 0 ? "@\($0.d)" : "") } }
  func id(_ i: Int) -> String { p.blocks[i].id }
  func words(_ i: Int) -> String { Notes.plain(p.blocks[i].words) }
  /// Words typed at the end of line i, as its field would send them, and the shortcut check the field makes.
  func type(_ i: Int, _ t: String) { let b = p.blocks[i]; p.setWords(b.id, Notes.tidy(b.r + R(t))); p.shortcut(b.id, caret: b.length + (t as NSString).length) }
}

@MainActor func run() {
  check(GuideEngine.shared.failure.isEmpty && !GuideEngine.shared.blocks("# a").isEmpty, "guide.js loads (" + GuideEngine.shared.failure + ")")

  // ---------- a blank note ----------
  do {
    let x = Page("")
    check(x.kinds == ["h1", "p"], "a blank note is a heading and an empty line", x.kinds.joined(separator: ","))
    let e = x.p.entries
    check(x.p.placeholder(e[0]) == "Title" && x.p.placeholder(e[1]) == "Start writing", "with “Title” and “Start writing” in quiet words")
    check(x.md() == "", "and nothing is saved while it's empty", x.md())
    x.p.setWords(x.id(0), R("Cell Biology"))
    x.p.enter(x.id(0), at: 12)
    check(x.p.blocks.count == 2 && x.p.focus?.id == x.id(1), "Enter at the end of the title goes to the empty line under it (no new line)")
    x.p.setWords(x.id(1), R("Everything for the exam."))
    check(x.md() == "# Cell Biology\n\nEverything for the exam.\n", "what is saved is Markdown, as the web writes it", x.md())
    check(x.p.placeholder(x.p.entries[1]).isEmpty, "the quiet words go once there are words")
  }

  // ---------- the shortcuts ----------
  for (typed, want) in [("# ", "h1"), ("## ", "h2"), ("### ", "h3"), ("- ", "ul"), ("* ", "ul"), ("+ ", "ul"), ("1. ", "ol"), ("[] ", "todo"), ("[ ] ", "todo"), ("[x] ", "todo"), ("> ", "toggle"), ("```", "code")] {
    let x = Page("x")
    x.p.setWords(x.id(0), R(typed + "words"))
    let changed = x.p.shortcut(x.id(0), caret: (typed as NSString).length)
    check(changed && x.kinds == [want] && x.words(0) == "words" && x.p.focus?.at == 0, "“" + typed + "” at the start of a line makes it " + want + ", and the marks go", x.kinds.joined(separator: ",") + " " + x.words(0))
  }
  do {
    let x = Page("x")
    x.p.setWords(x.id(0), R("[x] done")); x.p.shortcut(x.id(0), caret: 4)
    check(x.p.blocks[0].on, "“[x] ” makes a to-do that's done")
    let y = Page("x")
    y.p.setWords(y.id(0), R("3. third")); y.p.shortcut(y.id(0), caret: 3)
    check(y.p.blocks[0].start == 3 && y.md() == "3. third\n", "“3. ” starts a numbered list at 3", y.md())
    let z = Page("x")
    z.p.setWords(z.id(0), R("---")); z.p.shortcut(z.id(0), caret: 3)
    check(z.kinds == ["hr", "p"] && z.p.focus?.id == z.id(1), "“---” makes a divider, with a line to write on under it", z.kinds.joined(separator: ","))
    let w = Page("x")
    w.p.setWords(w.id(0), R("a # b"));
    check(!w.p.shortcut(w.id(0), caret: 4) && w.kinds == ["p"], "a mark in the middle of a line is just words")
    let h = Page("# Heading")
    h.p.setWords(h.id(0), R("- x"))
    check(!h.p.shortcut(h.id(0), caret: 2) && h.kinds == ["h1"], "and the shortcuts only work on a line of text")
  }

  // ---------- Enter ----------
  do {
    let x = Page("- one")
    x.p.enter(x.id(0), at: 3)
    check(x.kinds == ["ul", "ul"] && x.p.focus?.id == x.id(1), "Enter at the end of an item starts the next item")
    x.p.enter(x.id(1), at: 0)
    check(x.kinds == ["ul", "p"] && x.md() == "- one", "Enter on an empty item turns it back into text (and the page is as it was: its words exactly as written)", x.kinds.joined(separator: ",") + " " + x.md())
    let t = Page("- [x] done")
    t.p.enter(t.id(0), at: 4)
    check(t.kinds == ["todo", "todo"] && !t.p.blocks[1].on, "a new to-do after one that's done starts unchecked")
    let s = Page("hello world")
    s.p.enter(s.id(0), at: 5)
    check(s.words(0) == "hello" && s.words(1) == " world" && s.p.focus == NotesFocus(id: s.id(1), at: 0), "Enter in the middle of a line splits it")
    let a = Page("# Title")
    a.p.enter(a.id(0), at: 0)
    check(a.kinds == ["p", "h1"] && a.p.focus?.id == a.id(1), "Enter at the start of a line with words puts an empty line above it (text above a heading)", a.kinds.joined(separator: ","))
    let hd = Page("# Title")
    hd.p.enter(hd.id(0), at: 5)
    check(hd.kinds == ["h1", "p"], "Enter at the end of a heading goes on as text", hd.kinds.joined(separator: ","))
    let n = Page("- one\n  - two")
    n.p.enter(n.id(1), at: 3); n.p.enter(n.id(2), at: 0); n.p.enter(n.id(2), at: 0)
    check(n.kinds == ["ul", "ul@1", "p"], "an empty line inside goes out a level, then becomes text", n.kinds.joined(separator: ","))
    // toggles
    let o = Page(":::toggle Key idea\n:::")
    check(o.kinds == ["toggle"] && !(o.p.open[o.id(0)] ?? false), "a toggle starts closed on a phone that hasn't opened it")
    o.p.enter(o.id(0), at: 8)
    check(o.kinds == ["toggle", "toggle"], "Enter at the end of a closed toggle makes the next toggle", o.kinds.joined(separator: ","))
    o.p.flipOpen(o.id(0))
    o.p.enter(o.id(0), at: 8)
    check(o.kinds == ["toggle", "p@1", "toggle"] && o.p.focus?.id == o.id(1), "and of an open one, a line inside it", o.kinds.joined(separator: ","))
    o.p.setWords(o.id(1), R("Inside"))
    o.p.backspaceAtStart(o.id(2))
    check(o.md() == ":::toggle Key idea\nInside\n:::\n", "a toggle and what it holds are saved as :::toggle … :::", o.md())
    let c = Page("```\nlet a = 1\n```")
    c.p.enter(c.id(0), at: 9)
    check(c.p.blocks[0].text == "let a = 1\n" && c.kinds == ["code"], "Enter in code is a new line in it", c.p.blocks[0].text)
  }

  // ---------- Backspace at the start ----------
  do {
    let x = Page("- one")
    x.p.backspaceAtStart(x.id(0))
    check(x.kinds == ["p"] && x.words(0) == "one", "Backspace at the start of an item makes it text")
    let y = Page("- a\n  - b")
    y.p.backspaceAtStart(y.id(1)); y.p.backspaceAtStart(y.id(1))
    check(y.kinds == ["ul", "p"], "then it goes out a level", y.kinds.joined(separator: ","))
    let z = Page("first\n\nsecond")
    z.p.backspaceAtStart(z.id(1))
    check(z.kinds == ["p"] && z.words(0) == "firstsecond" && z.p.focus == NotesFocus(id: z.id(0), at: 5), "then it joins the line above, with the caret where they meet")
    let r = Page("---\n\nnext")
    r.p.backspaceAtStart(r.id(1))
    check(r.p.picked == r.id(0) && r.kinds == ["hr", "p"], "a divider above is picked (not joined)")
    r.p.removePicked()
    check(r.kinds == ["p"] && r.md() == "next\n", "and Delete takes it away", r.md())
    let h = Page("# Title")
    h.p.backspaceAtStart(h.id(0))
    check(h.kinds == ["p"] && h.words(0) == "Title", "a heading turns into text")
  }

  // ---------- Tab and Shift+Tab ----------
  do {
    let x = Page("- one\n- two\n- three")
    x.p.nest(x.id(0), out: false)
    check(x.kinds == ["ul", "ul", "ul"], "the first line can't go in a level")
    x.p.nest(x.id(1), out: false)
    check(x.kinds == ["ul", "ul@1", "ul"] && x.md() == "- one\n  - two\n- three\n", "Tab puts a line in a level, under the one above", x.md())
    x.p.nest(x.id(2), out: false); x.p.nest(x.id(2), out: false)
    check(x.kinds == ["ul", "ul@1", "ul@2"], "one level further than the line above at most", x.kinds.joined(separator: ","))
    x.p.nest(x.id(1), out: true)
    check(x.kinds == ["ul", "ul", "ul@1"], "Shift+Tab takes it out a level, with what it holds", x.kinds.joined(separator: ","))
    let t = Page(":::toggle A\n:::\n\nline")
    t.p.nest(t.id(1), out: false)
    check(t.kinds == ["toggle", "p@1"] && (t.p.open[t.id(0)] ?? false), "a line put inside a toggle opens it", t.kinds.joined(separator: ","))
  }

  // ---------- Aa, To-do, Bullets, Toggle ----------
  do {
    let x = Page("words")
    x.p.selection = NSRange(location: 2, length: 0)
    x.p.setKind(x.id(0), "todo"); check(x.kinds == ["todo"] && x.words(0) == "words", "To-do makes the line a to-do, its words kept")
    x.p.setKind(x.id(0), "todo"); check(x.kinds == ["p"], "and again makes it text")
    x.p.setKind(x.id(0), "h", level: 1); check(x.kinds == ["h1"], "Heading")
    x.p.setKind(x.id(0), "h", level: 2); check(x.kinds == ["h2"], "Subheading")
    x.p.setKind(x.id(0), "p"); check(x.kinds == ["p"], "Text")
    x.p.setKind(x.id(0), "toggle"); check(x.kinds == ["toggle"] && (x.p.open[x.id(0)] ?? false) && x.md() == ":::toggle words\n:::\n", "Toggle makes it a toggle, open", x.md())
    x.p.setKind(x.id(0), "ul"); check(x.kinds == ["ul"] && x.md() == "- words\n", "Bullets", x.md())
  }

  // ---------- Bold, Italic, Strikethrough, Code, a link ----------
  do {
    let x = Page("hello world")
    x.p.toggleMark(x.id(0), NSRange(location: 0, length: 5), "b")
    check(x.md() == "**hello** world\n" && x.p.focus?.length == 5, "Bold on the words selected (and they stay selected)", x.md())
    check(x.p.has(x.id(0), NSRange(location: 0, length: 5), "b") && !x.p.has(x.id(0), NSRange(location: 0, length: 7), "b"), "the bar knows when all of what's selected is bold")
    x.p.toggleMark(x.id(0), NSRange(location: 0, length: 5), "b")
    check(x.md() == "hello world", "Bold again takes it off (the words exactly as they were)", x.md())
    for (m, want) in [("i", "*hello* world\n"), ("s", "~~hello~~ world\n"), ("c", "`hello` world\n")] {
      let y = Page("hello world")
      y.p.toggleMark(y.id(0), NSRange(location: 0, length: 5), m)
      check(y.md() == want, m == "i" ? "Italic" : m == "s" ? "Strikethrough" : "Code", y.md())
    }
    let w = Page("hello world")
    w.p.toggleMark(w.id(0), NSRange(location: 2, length: 0), "b")
    check(w.md() == "**hello** world\n", "with nothing selected, Bold takes the word the caret is in", w.md())
    let v = Page("hello ")
    let pend = v.p.toggleMark(v.id(0), NSRange(location: 6, length: 0), "b")
    check(pend?.b == true && v.md() == "hello ", "outside a word it's for what is typed next (nothing changes yet)", v.md())
    let l = Page("see this")
    l.p.setLink(l.id(0), NSRange(location: 4, length: 4), GuideEngine.shared.href("example.com/"))
    check(l.md() == "see [this](https://example.com/)\n", "Link puts an address on the words (example.com/ is https://example.com/)", l.md())
    check(l.p.link(l.id(0), NSRange(location: 5, length: 0)) == "https://example.com/", "a link's address can be read back where the caret is")
    l.p.setLink(l.id(0), NSRange(location: 4, length: 4), "")
    check(l.md() == "see this", "and taken off", l.md())
    check(GuideEngine.shared.href("javascript:alert(1)").isEmpty, "an address that isn't a web page or mail can't be a link")
    // the marks a letter typed takes
    let rs = [NoteRun("bold", b: true), NoteRun(" plain"), NoteRun("code", c: true), NoteRun("link", a: "https://a.b/")]
    check(NotesPage.typing(rs, 4).b && !NotesPage.typing(rs, 5).b, "a letter typed after bold words is bold, after plain words it isn't")
    check(NotesPage.typing(rs, 0).b, "at the start of a line, it takes what comes after")
    check(!NotesPage.typing(rs, 10).c && NotesPage.typing(rs, 12).c, "code only between two letters of code")
    check(NotesPage.typing(rs, 16).a == "https://a.b/" && NotesPage.typing(rs, 18).a == nil, "a link only inside it, not at its end")
    check(NotesPage.word("hello world", 2) == NSRange(location: 0, length: 5) && NotesPage.word("hello world", 5) == nil, "the word around the caret")
  }

  // ---------- pasting ----------
  do {
    let x = Page("abcd")
    check(x.p.paste("x\n- y", into: x.id(0), range: NSRange(location: 2, length: 0)), "more than one line pastes in as blocks")
    check(x.md() == "abx\n\n- y\n\ncd\n", "the first joins the words before the caret, and what came after follows", x.md())
    let y = Page("")
    y.p.paste("one\ntwo", into: y.id(1), range: NSRange(location: 0, length: 0))
    check(y.kinds == ["h1", "p", "p"] && y.words(1) == "one" && y.words(2) == "two", "plain lines become a line of text each, an empty line used up", y.kinds.joined(separator: ","))
    let z = Page("x")
    z.p.paste("# Big\n:::toggle T\nin\n:::", into: z.id(0), range: NSRange(location: 1, length: 0))
    check(z.kinds == ["p", "h1", "toggle", "p@1"], "Markdown from an AI app comes in as its blocks, toggles too", z.kinds.joined(separator: ","))
  }

  // ---------- toggles, sections, and what this Mac remembers ----------
  do {
    let md = "# Cell\n\n## Part one\n\n:::toggle First idea\nWhy it is so.\n:::\n\n:::toggle Second idea\nAnd this.\n:::\n\n## Part two\n\nMore words.\n"
    NotesMemory.set("rules|fold", o: [], f: [])
    let x = Page(md, key: "rules|fold")
    let shown = { x.p.entries.map { Notes.plain($0.block.words) } }
    check(shown() == ["Cell", "Part one", "First idea", "Second idea", "Part two", "More words."], "a toggle shows its line, and what it holds stays hidden until it's opened", shown().joined(separator: "|"))
    x.p.flipOpen(x.id(2))
    check(shown().contains("Why it is so.") && !shown().contains("And this."), "opening one shows what it holds")
    let heads = x.p.entries.filter { $0.block.k == "h" }
    check(heads.map(\.section) == [true, true, true], "each heading with something under it starts a section")
    x.p.flipFold(x.id(1))
    check(shown() == ["Cell", "Part one", "Part two", "More words."], "folding a section hides what's under its heading, up to the next heading of the same level", shown().joined(separator: "|"))
    x.p.flipFold(x.id(0))
    check(shown() == ["Cell"], "a level 1 heading folds everything under it")
    x.p.flipFold(x.id(0))
    let again = Page(md, key: "rules|fold")
    check(again.p.open[again.id(2)] == true && again.p.fold[again.id(1)] == true && again.p.fold[again.id(0)] != true, "this Mac remembers which toggles are open and which sections are folded")
    check(NotesMemory.page("rules|fold").o == ["toggle:First idea#0"] && NotesMemory.page("rules|fold").f == ["h:Part one#0"], "by each one's words (as the web keeps it in localStorage)", NotesMemory.page("rules|fold").o.joined(separator: ",") + " " + NotesMemory.page("rules|fold").f.joined(separator: ","))
    check(again.md() == md && NotesPage.saved(again.p.blocks) == md, "and none of it is part of the note: the words saved are the same", NotesPage.saved(again.p.blocks))
    let reader = Page(md, editable: false, key: "rules|fold")
    check(reader.p.open[reader.id(2)] == true, "a reader's page opens and remembers its toggles the same way")
    // the quiet line under an open empty toggle, and the caret going into a closed part
    let e = Page(":::toggle Empty one\n:::", key: "rules|empty")
    e.p.flipOpen(e.id(0))
    check(e.p.entries.count == 2 && e.p.entries[1].virtualFor == e.id(0) && e.p.placeholder(e.p.entries[1]) == "Empty", "an open toggle with nothing in it has a quiet “Empty” line to write in")
    e.p.writeInside(e.id(0))
    check(e.kinds == ["toggle", "p@1"] && e.p.focus?.id == e.id(1), "a tap on it is a line inside the toggle")
    let f = Page(md, key: "rules|reveal")
    f.p.flipFold(f.id(1))
    f.p.focusAt(3, 2)
    check(f.p.fold[f.id(1)] == false && f.p.focus == NotesFocus(id: f.id(3), at: 2), "the caret going into a folded section or a closed toggle opens them (a tap on the deck page lands there)")
    NotesMemory.set("rules|fold", o: [], f: []); NotesMemory.set("rules|empty", o: [], f: []); NotesMemory.set("rules|reveal", o: [], f: [])
  }

  // ---------- what is saved ----------
  do {
    let samples = [
      "# Cell Biology: Exam 1\n\nEverything for the first exam.\n\n## Checklist\n\n- [x] Organelles\n- [ ] Glycolysis\n\n## The mitochondrion (p. 4 to p. 5)\n\n:::toggle The **mitochondrion** makes most of the cell’s **ATP**\nIt has two membranes.\n:::\n\n| Phase | Remember it as |\n| --- | --- |\n| Prophase | **P**ut your chromosomes in **P**lace |\n\n> A quote.\n\nAsk in [office hours](https://example.edu/oh).\n",
      "Some notes an AI app wrote:\n* one\n* two\n\n1) first\n2) second\n\n```js\nconst a = 1;\n```\n",
      ":::toggle Outer\n:::toggle Inner\nDeep words.\n:::\n:::\n"]
    for (i, md) in samples.enumerated() {
      let x = Page(md, key: "rules|save\(i)")
      let canon = GuideEngine.shared.markdown(GuideEngine.shared.blocks(md))
      check(NotesPage.saved(x.p.blocks) == canon, "page \(i + 1) opens as blocks and is written back as the web writes it", NotesPage.saved(x.p.blocks))
      check(GuideEngine.shared.markdown(GuideEngine.shared.blocks(canon)) == canon, "and that is a fixed point (it reads back the same)")
      let all = x.p.blocks.flatMap { $0.k == "table" ? $0.rows.flatMap { $0.flatMap { $0 } } : $0.words }
      check(Notes.plain(all).filter { !$0.isWhitespace }.count >= GuideEngine.shared.plain(md).filter { !$0.isWhitespace }.count - 2, "no words are lost (\(Notes.plain(all).filter { !$0.isWhitespace }.count) letters)")
    }
    let blank = Page("")
    blank.p.setWords(blank.id(0), R(""))
    check(NotesPage.saved(blank.p.blocks) == "", "a note with every line empty saves as nothing")
    let same = Page("First draft")
    same.p.flush()
    check(same.md() == "First draft", "a page opened and left alone sends nothing (its words stay exactly as written, with no newline added)", same.md())
    same.p.setWords(same.id(0), R("First drafts")); same.p.flush(); same.p.setWords(same.id(0), R("First draft")); same.p.flush()
    check(same.md() == "First draft", "and changed back, it is the words as they were", same.md())
    let tail = Page("words")
    tail.p.enter(tail.id(0), at: 5); tail.p.enter(tail.id(1), at: 0)
    check(tail.md() == "words", "empty lines at the end aren't saved", tail.md())
    tail.p.setWords(tail.id(1), R("more"))
    check(tail.md() == "words\n\nmore\n", "what is written is saved as Markdown", tail.md())
  }

  print("Notes rules: \(passed) passed, \(failed) failed")
  exit(failed == 0 ? 0 : 1)
}
Task { @MainActor in run() }
dispatchMain()
