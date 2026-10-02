// Making cards from anything, end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie,
// which the debug-only `-dev <name>` launch argument sets) and the AI stood in for (tests/stub-ai.mjs answers what OpenRouter and Gemini would,
// and logs every question at /__log). The same story as the web's own tests (make-ui, make-api), in flows that each set up their own people:
//   01  pasted text becomes cards; one is edited, one is removed, the rest are kept; what the server saved (the deck, the source, each card's
//       place in it); and nothing on the screens says "AI generated"
//   02  a topic, every card kept
//   03  pictures (a big PNG and an iPhone's HEIC) go up as small JPEGs
//   04  a PDF (its pages), and a Word file
//   05  a recording file
//   06  a YouTube transcript, and the same by tapping the link's switch
//   07  a YouTube link (the video is watched by the stand-in)
//   08  Cancel while it's making gives the make back
//   09  the Free plan's three a day, and what the 4th says
//   10  a file over the plan's size, and the picking rules (one document, one kind)
//   11  the recorder: its timer, Pause, Resume, Stop, Discard
//   12  the recorder stops at the plan's minutes, and a long one is several files (one for every ten minutes)
//   13  when the AI fails, Try again goes on
//   14  the + menus on Today and the Library, the empty deck's button, and a new person's +
//   15  the flow opens like the web's /make link (a kind, a deck, a kept source, a Guide)
//   16  the file picker and the photo picker open
//   17  a long recording picked from Files (70 minutes, 33 MB) is cut into seven parts of ten minutes, goes up as seven files in order, and its
//       words keep running times across them
//   18  caption files (.srt and .vtt) make cards that say the time they came from
//   19  the starter notes beside the cards: asked for with the make, the panel, its switch, reading them, what is saved (and no panel from a Guide page,
//       or without notes)
//   20  audio cards for a language: the Audio kind appears with a language, the cards read aloud with a speaker, edited, and saved with their words and language
//   21  a deck whose Guide has every page it can have has no room for the notes: the panel says so, the switch is off and can't be used, the cards are saved
//       and the Guide is left as it was; with a page deleted the notes have room again
// Run it with ios/tools/e2e-make.sh (it starts a fresh server on port 3934 and the stand-in AI on 3939). It only runs when LUCIDA_MAKE is set, so
// ios/tools/e2e.sh keeps running the study network's checks alone.
import XCTest
import ImageIO
import AVFoundation
import CommonCrypto

final class MakeTests: XCTestCase {
  static let env = ProcessInfo.processInfo.environment
  static let server = env["LUCIDA_SERVER"] ?? "http://127.0.0.1:3934"
  static let stub = env["LUCIDA_STUB"] ?? "http://127.0.0.1:3939"
  static let fixtures = env["LUCIDA_FIXTURES"] ?? ""
  static let gen = env["LUCIDA_GEN"] ?? ""
  /// How much longer to wait than usual: a busy Mac answers slowly, and a wait that is enough on a quiet one runs out (LUCIDA_SLOW=3 waits three
  /// times as long; ios/tools/e2e-make.sh passes SLOW, and 2 when it isn't given). A wait only lasts its whole time when what it waits for isn't there.
  static let slow = Double(env["LUCIDA_SLOW"] ?? "") ?? 2
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_MAKE"] != nil, "Run with ios/tools/e2e-make.sh")
  }
  override class func tearDown() { print("Make: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else {
      Self.failed += 1; print("  FAIL " + name); XCTFail(name)
      snap("make-fail-\(Self.failed)")
    }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  private func fx(_ name: String) -> String { Self.fixtures + "/" + name }
  private func gen(_ name: String) -> String { Self.gen + "/" + name }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12 * Self.slow) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  /// A request as one of the made-up people ("": nobody); the answer's JSON.
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil, base: String? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: (base ?? Self.server) + path)!)
    r.httpMethod = method
    if !who.isEmpty { r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie") }
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body) }
    let done = DispatchSemaphore(value: 0)
    var out: (Int, Any?) = (0, nil)
    URLSession.shared.dataTask(with: r) { data, resp, _ in
      out = ((resp as? HTTPURLResponse)?.statusCode ?? 0, data.flatMap { try? JSONSerialization.jsonObject(with: $0) })
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 30)
    return out
  }
  @discardableResult
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func deck(_ who: String, _ name: String) -> [String: Any]? { decks(who).first { $0["name"] as? String == name } }
  private func cards(_ who: String, in deckId: String) -> [[String: Any]] { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId } }
  private func sources(_ d: [String: Any]?) -> [[String: Any]] { d?["sources"] as? [[String: Any]] ?? [] }
  /// How many makes today's count has (the library's own record).
  private func made(_ who: String) -> Int { ((state(who)["ai"] as? [String: Any])?["made"] as? [String: Any])?["n"] as? Int ?? 0 }
  private func job(_ who: String) -> String { (api(who, "GET", "/api/make/job").json as? [String: Any])?["job"] as? String ?? "?" }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 12, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s * Self.slow)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  /// The stand-in AI: everything it was asked, what it was told to do next, and a clean slate.
  private func stubLog() -> [[String: Any]] { api("", "GET", "/__log", base: Self.stub).json as? [[String: Any]] ?? [] }
  private func stubReset() { api("", "POST", "/__reset", [:], base: Self.stub) }
  private func stubFlags(_ f: [String: Any]) { api("", "POST", "/__flags", f, base: Self.stub) }
  private func asked(_ path: String) -> [[String: Any]] { stubLog().filter { ($0["path"] as? String)?.hasSuffix(path) == true } }
  private func problems() -> [String] { stubLog().flatMap { ($0["problems"] as? [String]) ?? [] } }
  /// A file the person kept with a deck, as the server gives it back (nil when it can't be had).
  private func media(_ who: String, _ name: String) -> Data? {
    var r = URLRequest(url: URL(string: Self.server + "/media/" + name)!)
    r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie")
    let done = DispatchSemaphore(value: 0)
    var out: Data?
    URLSession.shared.dataTask(with: r) { data, resp, _ in out = (resp as? HTTPURLResponse)?.statusCode == 200 ? data : nil; done.signal() }.resume()
    _ = done.wait(timeout: .now() + 30)
    return out
  }
  private func pixels(_ d: Data) -> (w: Int, h: Int)? {
    guard let s = CGImageSourceCreateWithData(d as CFData, nil), let p = CGImageSourceCopyPropertiesAtIndex(s, 0, nil) as? [CFString: Any],
          let w = p[kCGImagePropertyPixelWidth] as? Int, let h = p[kCGImagePropertyPixelHeight] as? Int else { return nil }
    return (w, h)
  }

  private func launch(as who: String, welcomed: Bool = true, _ extra: [String] = []) -> XCUIApplication {
    // (A new library opens on the welcome, over everything, until it's done or skipped: these people have seen it.)
    if welcomed { act(who, "settings.update", ["patch": ["welcomed": true]]) }
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  /// Anything on screen whose label has these words.
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool { e.waitForExistence(timeout: s * Self.slow) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool {
    let end = Date().addingTimeInterval(s * Self.slow)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func typeInto(_ field: XCUIElement, _ text: String, clear: Int = 0) {
    guard wait(field, 10) else { check(false, "found the field to type “\(text)” in"); return }
    // (A sheet still sliding in moves the field: it is tapped once it stays put.)
    var at = field.frame
    for _ in 0..<20 { Thread.sleep(forTimeInterval: 0.15); if field.frame == at { break }; at = field.frame }
    // (To clear what is there, a tap right of the words puts the cursor at the end; tried a little further in if the box
    // didn't take the keyboard.)
    for dx in clear > 0 ? [0.97, 0.75, 0.6] : [0.5] {
      if clear > 0 { field.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: 0.5)).tap() } else { field.tap() }
      if (field.value(forKey: "hasKeyboardFocus") as? Bool) == true { break }
      Thread.sleep(forTimeInterval: 0.4)
    }
    if clear > 0 { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: clear)) }
    field.typeText(text)
  }
  /// Nothing on screen says the cards (or anything else) are "AI generated": the owner doesn't want that label anywhere.
  private func noLabel(_ app: XCUIApplication, _ where_: String) {
    let bad = app.descendants(matching: .any).matching(NSPredicate(format: "label MATCHES[c] %@", ".*(ai[- ]generated|generated (by|with) ai|made with ai|madewithai|aigc).*")).count
    check(bad == 0, where_ + ": nothing says “AI generated”")
  }
  /// The review's cards: their questions, in order (a card's question starts with "Q " in the stand-in's words).
  private func questions(_ app: XCUIApplication) -> [String] { app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Q ")).allElementsBoundByIndex.map(\.label) }
  private func edits(_ app: XCUIApplication) -> XCUIElementQuery { app.buttons.matching(NSPredicate(format: "label == %@", "Edit this card")) }
  private func removes(_ app: XCUIApplication) -> XCUIElementQuery { app.buttons.matching(NSPredicate(format: "label == %@", "Remove this card")) }
  /// Make cards, and the review once it's made (nil when it never came).
  private func makeIt(_ app: XCUIApplication, _ what: String, wait s: TimeInterval = 45) -> Bool {
    tap(button(app, "Make cards"), "Make cards")
    let ok = wait(text(app, "Check your cards"), s)
    check(ok, what + ": it makes cards and shows them to check")
    return ok
  }
  /// The kept cards go into the deck: the button that says how many (and where), and the deck's page after it. Returns the deck's name.
  @discardableResult
  private func save(_ app: XCUIApplication, into name: String? = nil, count: Int? = nil) -> String {
    let b = buttonStarting(app, "Add ")
    check(wait(b), "the review says how many cards go in")
    let label = b.label, deckName = name ?? label.components(separatedBy: " to ").dropFirst().joined(separator: " to ")
    if let count, let name { check(label == "Add \(count) card\(count == 1 ? "" : "s") to \(name)", "and where: “\(label)”") }
    b.tap()
    check(gone(text(app, "Check your cards"), 15) && wait(text(app, deckName), 15), "saving opens the deck “\(deckName)”")
    return deckName
  }

  // ---------- 01: pasted text ----------
  func test01PastedText() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkp" + run, name = "Cell cycle " + run
    stubReset()
    let app = launch(as: who, ["-makeText", fx("plain.txt")])
    check(wait(text(app, "Paste")), "-makeText opens Paste with the file’s words in it")
    check(app.textViews["Text to make cards from"].exists && (app.textViews["Text to make cards from"].value as? String ?? "").contains("Interphase"), "the words are in the box")
    check(button(app, "Make cards").exists && button(app, "Back").exists && button(app, "Close").exists, "with Back, Close and Make cards")
    noLabel(app, "the Paste page")
    check(["Into deck", "How many cards", "Kinds", "Language"].allSatisfy { text(app, $0).exists }, "the options under it: Into deck, How many cards, Kinds, Language")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "pasted text") else { return }
    noLabel(app, "the review")
    let qs = questions(app), n = edits(app).count
    check(n >= 3 && qs.count >= 3, "the review lists the new cards (\(n))")
    check(text(app, "\(n) cards from Lecture notes: the cell cycle").exists, "and where they came from")
    // edit the first card
    edits(app).element(boundBy: 0).tap()
    let q = app.textFields["Question"]
    check(wait(q) && app.textFields["Answer"].exists, "Edit opens the card’s question and answer")
    // The whole gray box is the field: a tap in its padding at the far right must focus it, not fall through to Done editing right beside it.
    q.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
    check(q.exists && app.textFields["Answer"].exists && button(app, "Done editing").exists && q.debugDescription.contains("Keyboard Focused"), "a tap at the far right of the question’s box focuses it, and doesn’t close the editor")
    typeInto(q, "Edited question?", clear: (q.value as? String ?? "").count)
    tap(button(app, "Done editing"), "Done editing")
    check(text(app, "Edited question?").exists, "the edit shows on the card")
    // remove the second
    let removed = qs.count > 1 ? qs[1] : ""
    removes(app).element(boundBy: 1).tap()
    check(wait(button(app, "Put this card back")), "Remove fades the card, with Put it back")
    let keep = n - 1
    save(app, into: name, count: keep)
    // what the server kept
    let d = deck(who, name), cs = cards(who, in: d?["id"] as? String ?? ""), src = sources(d).first
    check(cs.count == keep, "the deck has exactly the cards that were kept (\(cs.count) of \(keep))")
    check(cs.contains { $0["front"] as? String == "Edited question?" }, "the edited card was saved as edited")
    check(!removed.isEmpty && !cs.contains { ("Q " + ($0["front"] as? String ?? "")) == removed || ($0["front"] as? String ?? "") == removed }, "the removed card wasn’t saved")
    check(cs.allSatisfy { $0["source"] as? String == "Lucida" }, "every card is marked as made by Lucida")
    check(sources(d).count == 1 && src?["kind"] as? String == "text" && src?["name"] as? String == "Lecture notes: the cell cycle" && src?["cards"] as? Int == keep, "the deck records one source: its text, with its card count")
    check(cs.allSatisfy { ($0["src"] as? [String: Any])?["id"] as? String == src?["id"] as? String && ($0["src"] as? [String: Any])?["name"] as? String == src?["name"] as? String }, "each card remembers its source")
    check(problems().isEmpty, "every question to the AI had its key, schema, and privacy settings (\(problems().joined(separator: "; ")))")
    check(made(who) == 1, "it counted as one make today")
  }

  // ---------- 02: a topic, every card kept ----------
  func test02ATopic() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkt" + run, topic = "The Krebs cycle " + run
    stubReset()
    let app = launch(as: who, ["-makeTopic", topic])
    check(wait(text(app, "A topic")) && (app.textFields["Topic"].value as? String) == topic, "-makeTopic opens A topic with the words typed")
    check(["The Krebs cycle", "Spanish travel phrases", "The French Revolution", "Linear algebra basics"].allSatisfy { button(app, $0).exists }, "with four topics to start from")
    noLabel(app, "the topic page")
    guard makeIt(app, "a topic") else { return }
    let n = edits(app).count
    check(n >= 5, "a topic gives a handful of cards (\(n))")
    save(app, into: topic, count: n)
    let d = deck(who, topic), cs = cards(who, in: d?["id"] as? String ?? ""), src = sources(d).first
    check(cs.count == n, "every card was kept (\(cs.count))")
    check(src?["kind"] as? String == "topic" && src?["text"] as? String == topic && (src?["files"] as? [Any])?.isEmpty == true, "the deck’s source is the topic, in the person’s words")
    // (Which DeepSeek model the server names changes now and then, so the check is for the cheap text model's maker.)
    let topicModel = ((asked("/chat/completions").first?["body"] as? [String: Any])?["model"] as? String) ?? ""
    check(asked("/chat/completions").count >= 1 && topicModel.hasPrefix("deepseek/"), "a topic goes to the cheap text model (\(topicModel))")
  }

  // ---------- 03: pictures ----------
  func test03Pictures() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkc" + run, name = "Whiteboard " + run
    stubReset()
    let app = launch(as: who, ["-makePhoto", gen("big.png") + "," + gen("photo.heic")])
    check(wait(text(app, "Photos")), "-makePhoto opens Photos with the pictures in")
    check(wait(text(app, "big.jpg")) && text(app, "photo.jpg").exists, "each is listed as the small JPEG it will go up as")
    check(button(app, "Choose photos").exists && text(app, "Up to 50 pictures").exists, "with Choose photos and the plan’s limit")
    check(!button(app, "Take a photo").exists, "no Take a photo on a phone with no camera (the simulator)")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "pictures") else { return }
    save(app, into: name)
    let d = deck(who, name), src = sources(d).first, files = src?["files"] as? [[String: Any]] ?? []
    check(src?["kind"] as? String == "photo" && files.count == 2, "the deck’s source is two photos")
    check(files.allSatisfy { $0["type"] as? String == "image/jpeg" }, "both are kept as JPEG")
    var small = true, jpeg = true
    for f in files {
      let data = media(who, f["name"] as? String ?? "")
      jpeg = jpeg && data.map { $0.count > 3 && $0[0] == 0xFF && $0[1] == 0xD8 && $0[2] == 0xFF } == true
      small = small && data.flatMap(pixels).map { max($0.w, $0.h) <= 1600 } == true
    }
    check(jpeg, "what was sent really is a JPEG (the phone’s HEIC and a PNG were turned into one)")
    check(small, "and none is more than 1600 pixels on a side (the 3000 pixel one was made smaller)")
    let chat = asked("/chat/completions")
    let parts = chat.flatMap { (($0["body"] as? [String: Any])?["messages"] as? [[String: Any]])?.last?["content"] as? [[String: Any]] ?? [] }
    let urls = parts.compactMap { ($0["image_url"] as? [String: Any])?["url"] as? String }
    check(urls.count == 2 && urls.allSatisfy { $0.hasPrefix("data:image/jpeg;base64,") }, "the AI was shown both pictures, as JPEG (\(urls.map { String($0.prefix(24)) }))")
    check(chat.first.flatMap { $0["model"] as? String } == "google/gemini-3.1-flash-lite", "pictures go to the model that can see")
  }

  // ---------- 04: a PDF, and a Word file ----------
  func test04ADocument() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkd" + run, name = "Chrome notes " + run
    stubReset()
    var app = launch(as: who, ["-makeFile", fx("chrome.pdf")])
    check(wait(text(app, "Upload")) && wait(text(app, "chrome.pdf")), "-makeFile opens Upload with the PDF listed")
    check(button(app, "Remove chrome.pdf").exists, "with a way to take it out")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a PDF") else { return }
    check(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "p. ")).count >= 2, "its cards say the page they came from")
    let n = edits(app).count
    save(app, into: name, count: n)
    var d = deck(who, name), src = sources(d).first, file = (src?["files"] as? [[String: Any]])?.first
    check(src?["kind"] as? String == "file" && src?["name"] as? String == "chrome" && src?["pages"] as? Int == 2, "the deck’s source is the PDF, with its page count")
    check(file?["type"] as? String == "application/pdf" && (file?["file"] as? String) == "chrome.pdf", "and the file itself, kept")
    let cs = cards(who, in: d?["id"] as? String ?? "")
    check(cs.allSatisfy { (($0["src"] as? [String: Any])?["at"] as? String ?? "").hasPrefix("p. ") }, "each card keeps its page")
    let kept = media(who, file?["name"] as? String ?? ""), orig = FileManager.default.contents(atPath: fx("chrome.pdf"))
    check(kept != nil && kept == orig, "the kept PDF is the one that was sent, byte for byte")
    // a Word file
    stubReset()
    app = launch(as: who, ["-makeFile", fx("tu.docx"), "-makeRoute", "source=file"])
    check(wait(text(app, "Upload")) && wait(text(app, "tu.docx")), "a Word file is listed too")
    guard makeIt(app, "a Word file") else { return }
    app.buttons["Discard"].firstMatch.tap()
    check(gone(text(app, "Check your cards")), "Discard throws the cards away and closes")
    check(job(who) == "", "and the make is gone from the server")
  }

  // ---------- 05: a recording file ----------
  func test05ARecordingFile() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkr" + run, name = "Lecture file " + run
    stubReset()
    let app = launch(as: who, ["-makeFile", fx("tone3.m4a")])
    check(wait(text(app, "tone3.m4a")), "an audio file is listed")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a recording file") else { return }
    save(app, into: name)
    let d = deck(who, name), src = sources(d).first
    check(src?["kind"] as? String == "recording" && (src?["files"] as? [Any])?.count == 1 && src?["textFile"] != nil, "the deck’s source is a recording (its file, and the words it was written out as)")
    let t = asked("/audio/transcriptions")
    check(t.count == 1 && ((t.first?["body"] as? [String: Any])?["model"] as? String) == "openai/whisper-large-v3-turbo", "the recording went to the speech model, once")
    check(((t.first?["body"] as? [String: Any])?["input_audio"] as? [String: Any])?["format"] as? String == "m4a", "as an m4a")
  }

  // ---------- 06: a YouTube transcript ----------
  func test06ATranscript() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkv" + run, name = "Enzymes " + run, link = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    stubReset()
    var app = launch(as: who, ["-makeVideo", link, "-makeText", fx("transcript.txt")])
    check(wait(text(app, "YouTube")) && (app.textFields["Link to the video"].value as? String) == link, "-makeVideo opens YouTube with the link typed")
    check((app.textViews["The video’s transcript"].value as? String ?? "").contains("Welcome to the lecture on enzymes"), "and the transcript pasted")
    check(button(app, "Use the link instead").exists && text(app, "Lucida watches public videos, up to 120 minutes.").exists, "Use the link instead, and the line about public videos")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a transcript") else { return }
    check(app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "[0-9]+:[0-9]{2}")).count >= 2, "its cards say the time they came from")
    save(app, into: name)
    let src = sources(deck(who, name)).first
    check(src?["kind"] as? String == "video" && src?["url"] as? String == link && src?["textFile"] != nil, "the deck’s source is the video, with its words kept")
    check(asked(":generateContent").isEmpty, "no video was watched: the pasted transcript was used")
    // the switch between the link and the transcript
    stubReset()
    app = launch(as: who, ["-makeVideo", link])
    check(wait(button(app, "Paste the transcript instead")) && !app.textViews["The video’s transcript"].exists, "with only a link, the transcript box is out of the way")
    button(app, "Paste the transcript instead").tap()
    check(wait(app.textViews["The video’s transcript"]) && button(app, "Use the link instead").exists, "Paste the transcript instead shows the box")
    button(app, "Use the link instead").tap()
    check(gone(app.textViews["The video’s transcript"], 5), "and Use the link instead puts it away")
  }

  // ---------- 07: a YouTube link ----------
  func test07ALink() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkl" + run, name = "Watched " + run, link = "https://www.youtube.com/watch?v=shortvid_ab"
    stubReset()
    let app = launch(as: who, ["-makeVideo", link])
    check(wait(text(app, "YouTube")), "-makeVideo opens YouTube")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a YouTube link", wait: 60) else { return }
    save(app, into: name)
    // (Gemini's path ends in ":generateContent", after the model's name: the stand-in logs it as the server asked.)
    let src = sources(deck(who, name)).first, g = asked(":generateContent")
    check(src?["kind"] as? String == "video" && src?["url"] as? String == link, "the deck’s source is the video’s link")
    check(g.count >= 1 && g.allSatisfy { ($0["uri"] as? String) == link }, "the video was watched by the stand-in (\(g.count) windows), at its address")
    check(asked("/audio/transcriptions").isEmpty && !asked("/chat/completions").isEmpty, "its notes were written into cards by the text model")
    check(problems().isEmpty, "every call to it had its key, low picture detail, and JSON (\(problems().joined(separator: "; ")))")
  }

  // ---------- 08: Cancel while it's making ----------
  func test08Cancel() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkx" + run, name = "Cancelled " + run
    // (The AI is slow on purpose: long enough that the page is still making when Cancel is tapped, however slowly the checks before it go.)
    stubReset(); stubFlags(["delay": 120000])
    defer { stubFlags(["delay": 0]) }
    var app = launch(as: who, ["-makeText", fx("plain.txt")])
    check(wait(text(app, "Paste")), "text to make cards from")
    typeInto(app.textFields["Deck name"], name)
    tap(button(app, "Make cards"), "Make cards")
    check(wait(text(app, "Making your cards"), 15), "it’s making (the AI is slow)")
    check(button(app, "Cancel").exists && !button(app, "Close").exists && !button(app, "Back").exists, "only Cancel is offered while it makes")
    check(text(app, "Writing cards…").exists || text(app, "Reading your text…").exists, "in plain words, what it’s doing")
    Thread.sleep(forTimeInterval: 1.5)
    button(app, "Cancel").tap()
    check(wait(text(app, "Paste"), 10) && button(app, "Make cards").exists, "Cancel goes back to the text, ready to try again")
    check(eventually { job(who) == "" }, "the server has no make going")
    check(eventually { made(who) == 0 }, "and today’s make was given back (nothing was written yet)")
    check(deck(who, name) == nil, "no deck was made")
    stubFlags(["delay": 0])
    guard makeIt(app, "after a Cancel") else { return }
    check(made(who) == 1, "making again counts as one")
    app.buttons["Discard"].firstMatch.tap()
  }

  // ---------- 09: the Free plan's three a day ----------
  func test09FreeLimit() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "free" + run
    stubReset()
    for i in 1...3 {
      let topic = "Free topic \(i) " + run
      let app = launch(as: who, ["-makeTopic", topic])
      check(wait(text(app, "A topic")), "make \(i) of 3: the topic is typed")
      guard makeIt(app, "make \(i) of the Free plan’s 3") else { return }
      save(app, into: topic)
    }
    check(made(who) == 3, "three makes are counted")
    let app = launch(as: who, ["-makeTopic", "A fourth " + run])
    check(wait(text(app, "A topic")), "the fourth is typed")
    tap(button(app, "Make cards"), "Make cards")
    let words = "That’s today’s 3 free makes. Go Pro for 30 a day."
    check(wait(text(app, words), 20), "the 4th says the server’s words: “\(words)”")
    check(button(app, "Go Pro").exists && button(app, "Back").exists && !button(app, "Try again").exists, "with Go Pro and Back, and no Try again (it would say the same)")
    noLabel(app, "the limit page")
    check(made(who) == 3, "it wasn’t counted")
    tap(button(app, "Back"), "Back")
    check(wait(text(app, "A topic")) && button(app, "Make cards").exists, "Back goes to the topic again")
  }

  // ---------- 10: a file over the plan's size, and the picking rules ----------
  func test10FileSizeAndRules() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    var app = launch(as: "free" + run + "b", ["-makeFile", gen("big.txt")])
    check(wait(text(app, "Upload")), "a Free person picks a 21 MB file")
    check(wait(text(app, "That file is over 20 MB. Go Pro for up to 40 MB.")), "it says so, and Go Pro for up to 40 MB")
    check(!text(app, "big.txt").exists, "and the file isn’t listed")
    check(text(app, "PDF, slides, Word, captions, text, pictures or audio · up to 20 MB").exists, "the box says what it takes (captions too) and up to 20 MB")
    // the rules: one document at a time, one kind at a time
    app = launch(as: "mkf" + run, ["-makeFile", fx("chrome.pdf") + "," + fx("cups.pdf")])
    check(wait(text(app, "chrome.pdf")) && wait(text(app, "Pick one document at a time.")) && !text(app, "cups.pdf").exists, "a second document is turned away: “Pick one document at a time.”")
    app = launch(as: "mkf" + run, ["-makeFile", fx("tone3.m4a") + "," + fx("a.jpg")])
    check(wait(text(app, "tone3.m4a")) && wait(text(app, "Pick one kind of file at a time: pictures, or a recording, or one document.")) && !text(app, "a.jpg").exists, "so is a picture beside a recording")
    check(text(app, "Make cards").exists, "and Make cards waits for a file")
  }

  // ---------- 11: the recorder ----------
  /// The recorder's time as seconds ("12:34" is 754).
  private func timer(_ app: XCUIApplication) -> Int {
    let v = (app.staticTexts["Time recorded"].value as? String ?? "0:00").split(separator: ":").compactMap { Int($0) }
    return v.reduce(0) { $0 * 60 + $1 }
  }
  func test11TheRecorder() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkm" + run
    stubReset()
    let app = launch(as: who, ["-makeRecording", fx("tone3.m4a"), "-makeRoute", "source=record"])
    check(wait(text(app, "Record a lecture")) && text(app, "Ready").exists && timer(app) == 0, "Record a lecture is ready, at 0:00")
    check(button(app, "Start recording").exists && button(app, "Back").exists, "with Start recording, and Back")
    check(any(app, "an AI service writes it out as text").exists && any(app, "up to 120 minutes at a time").exists, "it says where the audio goes, and for how long")
    noLabel(app, "the recorder")
    // Discard throws it away
    button(app, "Start recording").tap()
    check(wait(text(app, "Recording")) && button(app, "Pause").exists && button(app, "Stop").exists && button(app, "Discard the recording").exists, "Start shows Pause, Stop and Discard")
    check(!button(app, "Back").exists && !button(app, "Close").exists, "Back and Close wait while it records")
    button(app, "Discard the recording").tap()
    check(wait(text(app, "Ready")) && timer(app) == 0 && button(app, "Back").exists, "Discard throws it away: ready again, at 0:00")
    check(asked("/audio/transcriptions").isEmpty && job(who) == "", "nothing was sent")
    // the timer, Pause, Resume, Stop
    button(app, "Start recording").tap()
    check(wait(text(app, "Recording")), "recording again")
    Thread.sleep(forTimeInterval: 2.4)
    let t1 = timer(app)
    check(t1 >= 1 && t1 <= 6, "the timer counts up (0:0\(t1) after a couple of seconds)")
    check(app.staticTexts["Time recorded"].exists, "in plain minutes and seconds")
    button(app, "Pause").tap()
    check(wait(text(app, "Paused")) && button(app, "Resume").exists, "Pause says Paused, and offers Resume")
    let p1 = timer(app); Thread.sleep(forTimeInterval: 1.6); let p2 = timer(app)
    check(p1 == p2, "while paused the time stands still (\(p1) and \(p2))")
    button(app, "Resume").tap()
    check(wait(text(app, "Recording")) && button(app, "Pause").exists, "Resume goes on")
    Thread.sleep(forTimeInterval: 1.4)
    check(timer(app) > p2, "the time counts on from where it stopped (\(timer(app)) after \(p2))")
    button(app, "Stop").tap()
    check(wait(text(app, "Check your cards"), 45), "Stop makes the cards")
    check(any(app, "cards from ").exists, "with a name for the lecture")
    let into = save(app)
    check(into.hasPrefix("Lecture · "), "the deck is named for the lecture: “\(into)”")
    let d = deck(who, into), src = sources(d).first
    check(src?["kind"] as? String == "recording" && (src?["files"] as? [Any])?.count == 1, "its source is the recording, one file")
    check(asked("/audio/transcriptions").count == 1, "which went to be written out once")
  }

  // ---------- 12: the plan's minutes, and a new file every ten ----------
  func test12TheRecorderLimits() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    // Free: 15 minutes (the stand-in's clock runs 150 times faster, so that's 6 seconds)
    var who = "free" + run + "m"
    stubReset()
    var app = launch(as: who, ["-makeRecording", fx("tone3.m4a"), "-makeSpeed", "150", "-makeRoute", "source=record"])
    check(wait(button(app, "Start recording")) && any(app, "up to 15 minutes at a time").exists, "a Free person’s recorder says up to 15 minutes")
    button(app, "Start recording").tap()
    check(wait(text(app, "Check your cards"), 60), "at the plan’s 15 minutes it stops by itself and makes the cards")
    check(text(app, "That’s the 15 minutes limit for one make.").exists, "and says so: “That’s the 15 minutes limit for one make.”")
    check(asked("/audio/transcriptions").count == 2, "ten minutes and the five that followed went as two recordings (\(asked("/audio/transcriptions").count))")
    app.buttons["Discard"].firstMatch.tap()
    // Pro: a new file every ten minutes (900 times faster: ten minutes is two thirds of a second)
    who = "mkn" + run
    stubReset()
    app = launch(as: who, ["-makeRecording", fx("tone3.m4a"), "-makeSpeed", "900", "-makeRoute", "source=record"])
    check(wait(button(app, "Start recording")), "a Pro person’s recorder")
    button(app, "Start recording").tap()
    check(wait(text(app, "Recording")), "recording a long lecture")
    // (How long that takes depends on how busy the Mac is, so wait for the time rather than for a while.)
    check(eventually(60) { timer(app) >= 3000 }, "more than fifty minutes have gone by (\(timer(app)) seconds)")
    let before = timer(app)
    button(app, "Stop").tap()
    check(wait(text(app, "Check your cards"), 60), "Stop makes the cards")
    let t = asked("/audio/transcriptions"), least = before / 600 + 1, most = (before + 2400) / 600 + 1
    check(t.count >= least && t.count <= most, "a new file was started every ten minutes: \(t.count) went to be written out (\(before) seconds or a little more is \(least) to \(most))")
    save(app)
    let src = sources(decks(who).first).first
    check((src?["files"] as? [Any])?.count == t.count && src?["kind"] as? String == "recording", "the deck keeps every file of the lecture (\((src?["files"] as? [Any])?.count ?? 0))")
  }

  // ---------- 13: when the AI fails ----------
  func test13TryAgain() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mke" + run, name = "Second go " + run
    stubReset(); stubFlags(["fail": 500])
    defer { stubFlags(["fail": 0]) }
    let app = launch(as: who, ["-makeTopic", "Resilience " + run])
    check(wait(text(app, "A topic")), "a topic")
    typeInto(app.textFields["Deck name"], name)
    tap(button(app, "Make cards"), "Make cards")
    let words = "The AI didn’t answer. Try again in a moment."
    check(wait(text(app, words), 40), "when the AI fails it says so in plain words: “\(words)”")
    check(button(app, "Try again").exists && button(app, "Back").exists, "with Try again and Back")
    check(asked("/chat/completions").count >= 3, "each part was tried again twice first (\(asked("/chat/completions").count) asks)")
    check(job(who) != "" && job(who) != "?", "what’s made so far is kept on the server")
    noLabel(app, "the error page")
    stubFlags(["fail": 0])
    button(app, "Try again").tap()
    check(wait(text(app, "Check your cards"), 45), "Try again goes on and makes the cards")
    save(app, into: name)
    check(made(who) == 1, "all of it counted as one make")
  }

  // ---------- 14: the ways in ----------
  func test14TheWaysIn() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkw" + run
    let did = act(who, "deck.add", ["name": "Alpha " + run])["id"] as? String ?? ""
    act(who, "card.add", ["deckId": did, "kind": "basic", "front": "One?", "back": "Yes"])
    act(who, "settings.update", ["patch": ["welcomed": true]])
    stubReset()
    // Today's +
    var app = launch(as: who)
    check(wait(button(app, "Add")), "Today has a + (Add)")
    app.buttons["Add"].firstMatch.tap()
    check(wait(button(app, "New card")) && button(app, "Make cards").exists && button(app, "New deck").exists, "Today’s + opens New card, Make cards, New deck")
    button(app, "Make cards").tap()
    check(wait(text(app, "Make cards")) && ["Upload", "Photo", "Record a lecture", "Paste", "YouTube", "A topic"].allSatisfy { button(app, $0).exists }, "Make cards opens the six ways to start")
    noLabel(app, "the list of sources")
    button(app, "Close").tap()
    check(gone(button(app, "Upload")), "the X closes it")
    // the Library's +
    app = launch(as: who, ["-open", "library"])
    check(wait(button(app, "Add")), "the Library has a + (Add)")
    app.buttons["Add"].firstMatch.tap()
    check(wait(button(app, "New deck")) && button(app, "Make cards").exists && button(app, "Import cards").exists, "the Library’s + opens New deck, Make cards, Import cards")
    button(app, "Make cards").tap()
    check(wait(button(app, "A topic")), "Make cards opens the same list")
    // an empty deck's button
    let empty = "Empty one " + run, eid = act(who, "deck.add", ["name": empty])["id"] as? String ?? ""
    app = launch(as: who, ["-open", "deck:" + empty])
    check(wait(text(app, "This deck is empty")) && button(app, "New card").exists && button(app, "Import cards").exists && button(app, "Ask your AI").exists, "an empty deck offers New card, Import cards, Ask your AI")
    check(button(app, "Make cards").exists, "and Make cards")
    button(app, "Make cards").tap()
    check(wait(button(app, "A topic")), "it opens the list")
    button(app, "A topic").tap()
    typeInto(app.textFields["Topic"], "Fun facts")
    check(wait(button(app, empty)) && button(app, empty).isSelected, "the empty deck is picked to put the cards in")
    guard makeIt(app, "into the empty deck") else { return }
    let n = edits(app).count
    save(app, into: empty, count: n)
    check(decks(who).filter { $0["name"] as? String == empty }.count == 1 && cards(who, in: eid).count == n && decks(who).count == 2, "the cards went into that deck (\(n)), and no new deck was made")
    check(sources(deck(who, empty)).first?["kind"] as? String == "topic", "which keeps the topic as its source")
    // a brand-new person's +
    app = launch(as: "mkz" + run)
    check(wait(button(app, "New deck")), "a person with no decks has a + that makes a deck, as the canvas has it")
    app.buttons["New deck"].firstMatch.tap()
    check(wait(text(app, "New deck")) && !button(app, "Make cards").exists, "straight to New deck, with no menu")
  }

  // ---------- 15: opening it like the web's /make link ----------
  func test15TheRoute() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkq" + run, name = "Routes " + run
    stubReset()
    var app = launch(as: who, ["-makeRoute", "source=photo"])
    check(wait(text(app, "Photos")) && button(app, "Choose photos").exists, "source=photo opens Photos")
    app = launch(as: who, ["-makeTopic", "Route test " + run])
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a first make") else { return }
    let n1 = edits(app).count
    save(app, into: name, count: n1)
    let d = deck(who, name), id = d?["id"] as? String ?? "", sid = sources(d).first?["id"] as? String ?? ""
    // more cards from the kept source
    stubReset()
    app = launch(as: who, ["-makeRoute", "deck=\(id)&from=\(sid)"])
    check(wait(text(app, "More cards")) && text(app, "Route test " + run).exists && text(app, "More cards from this source").exists, "from=<a kept source> opens More cards, naming the source")
    // The same words again: the deck has every card Lucida would make from them, and the server says so plainly (no Try again: it would say the same).
    tap(button(app, "Make cards"), "Make cards")
    let have = "Everything Lucida could make from that is already in this deck."
    check(wait(text(app, have), 45), "the same source again says so, in the server’s words: “\(have)”")
    check(button(app, "Back").exists && !button(app, "Try again").exists && !button(app, "Go Pro").exists, "with Back, and no Try again (it would say the same)")
    noLabel(app, "that page")
    // Back goes to the making page, as the web does, and Cancel from there to More cards
    tap(button(app, "Back"), "Back")
    check(wait(button(app, "Cancel")), "Back goes to the making page, with Cancel")
    button(app, "Cancel").tap()
    check(wait(text(app, "More cards")) && button(app, "Make cards").exists, "Cancel goes back to More cards")
    // New words (20 cards asked for, not Auto's 15: the five more are new): cards to check
    tap(button(app, "20"), "20")
    guard makeIt(app, "more from a source (20 cards asked for)") else { return }
    let n2 = edits(app).count
    check(n2 == 5, "only the cards the deck doesn’t have are shown (\(n2) new of 20)")
    save(app, into: name, count: n2)
    let after = deck(who, name)
    check(sources(after).count == 1 && sources(after).first?["id"] as? String == sid && sources(after).first?["cards"] as? Int == n1 + n2, "the new cards joined the same source (\(n1) + \(n2))")
    // a Guide's words
    let guide = "# Cell cycle\n\nInterphase has three parts: G1, S, and G2. During S phase the cell copies its DNA.\n\nMitosis follows interphase."
    act(who, "guide.save", ["deckId": id, "text": guide])
    stubReset()
    app = launch(as: who, ["-makeRoute", "guide=\(id)"])
    check(wait(text(app, "Paste")) && (app.textViews["Text to make cards from"].value as? String ?? "").contains("Interphase has three parts"), "guide=<a deck> opens Paste with the Guide’s words")
    check(button(app, name).isSelected, "and that deck is picked")
    guard makeIt(app, "a Guide") else { return }
    check(any(app, "cards from \(name) Guide").exists, "named for the deck’s Guide")
    app.buttons["Discard"].firstMatch.tap()
  }

  // ---------- 16: the pickers ----------
  func test16ThePickers() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    var app = launch(as: "mkg" + run, ["-makeRoute", "source=file"])
    check(wait(button(app, "Choose a file")), "Upload has Choose a file")
    app.buttons["Choose a file"].firstMatch.tap()
    check(wait(button(app, "Cancel"), 8) || wait(app.otherElements["Recents"], 2) || app.navigationBars.count > 0, "it opens the phone’s file picker")
    if button(app, "Cancel").exists { button(app, "Cancel").tap() }
    check(wait(text(app, "Upload")), "Cancel comes back to Upload")
    app = launch(as: "mkg" + run, ["-makeRoute", "source=photo"])
    check(wait(button(app, "Choose photos")), "Photos has Choose photos")
    app.buttons["Choose photos"].firstMatch.tap()
    check(wait(button(app, "Cancel"), 10) || app.otherElements["PXGGridLayout-Info"].waitForExistence(timeout: 2), "it opens the photo library")
    if button(app, "Cancel").exists { button(app, "Cancel").tap() }
    check(wait(text(app, "Photos")), "Cancel comes back to Photos")
  }
  // ---------- 17: a long recording picked from Files is cut into parts ----------
  /// How long a sound the server kept is, in seconds (0 when it can't be had or read).
  private func length(_ who: String, _ name: String) -> Double {
    guard let data = media(who, name), let player = try? AVAudioPlayer(data: data) else { return 0 }
    return player.duration
  }
  private func sha1(_ data: Data) -> String {
    var out = [UInt8](repeating: 0, count: Int(CC_SHA1_DIGEST_LENGTH))
    data.withUnsafeBytes { _ = CC_SHA1($0.baseAddress, CC_LONG(data.count), &out) }
    return out.map { String(format: "%02x", $0) }.joined()
  }
  func test17ALongRecording() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    try XCTSkipUnless(FileManager.default.fileExists(atPath: gen("long70.m4a")), "No long recording (ios/tools/e2e-make.sh makes one with ffmpeg or afconvert)")
    let who = "mkb" + run, name = "Long lecture " + run
    // (The stand-in reads each recording's real length from its headers, and tags every line a recording says with a mark made from the bytes it was
    // sent, so the order of the parts can be told from the words. It is the stand-in's own idea of both otherwise.)
    stubReset(); stubFlags(["realLength": true, "audioHash": true])
    defer { stubFlags(["realLength": false, "audioHash": false]) }
    // A Free person makes from 15 minutes: the page says so at once, in the server's words, before anything is cut or sent.
    var app = launch(as: "free" + run + "b", ["-makeFile", gen("long70.m4a")])
    let tooLong = "That recording is 70 minutes long. Free makes from up to 15 minutes at a time. Go Pro for up to 120."
    check(wait(text(app, tooLong), 90), "a Free person’s 70 minute recording is turned away at once: “\(tooLong)”")
    check(!any(app, " parts").exists && !any(app, "Getting your recording ready").exists && !text(app, "long70.m4a").exists && asked("/audio/transcriptions").isEmpty, "with nothing cut, listed or sent")
    // A Pro person makes from two hours.
    app = launch(as: who, ["-makeFile", gen("long70.m4a")])
    check(wait(text(app, "Upload")), "-makeFile opens Upload")
    // One row: its name, and its size with its parts (the cutting takes a while: ten minutes of sound at a time).
    let size = app.staticTexts.matching(NSPredicate(format: "label ENDSWITH %@", " · 7 parts")).firstMatch
    check(wait(size, 180) && text(app, "long70.m4a").exists, "a 70 minute recording of 33 MB is one row, “long70.m4a”, that says “… · 7 parts” (\(size.exists ? size.label : "?"))")
    check(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@ AND label ENDSWITH %@", "3", " · 7 parts")).count == 1, "and its size is the 33 MB that goes up")
    check(button(app, "Make cards").exists && button(app, "Remove long70.m4a").exists && !any(app, "Getting your recording ready").exists, "with Make cards and a way to take it out, and no waiting line left")
    noLabel(app, "the Upload page")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a long recording", wait: 300) else { return }
    save(app, into: name)
    let d = deck(who, name), src = sources(d).first, files = src?["files"] as? [[String: Any]] ?? []
    check(src?["kind"] as? String == "recording" && files.count == 7, "the deck’s source is a recording kept as seven files (\(files.count))")
    check(src?["name"] as? String == "long70", "named for the recording itself, not for a part (“\(src?["name"] as? String ?? "")”)")
    let named = (1...7).map { "long70 (part \($0) of 7).m4a" }
    check(files.map { $0["file"] as? String } == named, "named in order: “\(named[0])” to “\(named[6])”")
    var lens: [Double] = []
    for f in files { lens.append(length(who, f["name"] as? String ?? "")) }
    check(lens.count == 7 && lens.allSatisfy { $0 > 590 && $0 <= 600.5 }, "each is ten minutes or less (\(lens.map { Int($0) }))")
    check(abs(lens.reduce(0, +) - 4200) < 7, "and together they are the whole 70 minutes (\(Int(lens.reduce(0, +))) seconds)")
    check(abs(Double(src?["seconds"] as? Int ?? 0) - 4200) <= 7, "the server read each part’s length from the file itself: \(src?["seconds"] as? Int ?? 0) seconds in all")
    let t = asked("/audio/transcriptions")
    check(t.count == 7 && t.allSatisfy { (($0["body"] as? [String: Any])?["input_audio"] as? [String: Any])?["format"] as? String == "m4a" }, "all seven went to be written out, as m4a (\(t.count))")
    // The words, with their times: they run on across the parts, 0:00, 10:00, 20:00, ... (each part is ten minutes), and each part's words come in the
    // order the parts were sent (the mark in a part's lines is made from that part's bytes).
    let textName = (src?["textFile"] as? [String: Any])?["name"] as? String ?? ""
    let words = media(who, textName).flatMap { String(data: $0, encoding: .utf8) } ?? ""
    let labels = words.split(separator: "\n").compactMap { l -> String? in l.hasPrefix("<<") && l.hasSuffix(">>") ? String(l.dropFirst(2).dropLast(2)) : nil }
    func at(_ s: String) -> Int { s.split(separator: ":").compactMap { Int($0) }.reduce(0) { $0 * 60 + $1 } }
    let times = labels.map(at)
    check(times.count > 14 && times == times.sorted() && times.first == 0, "the kept words have times, from 0:00, and they only go forward across the parts (\(labels.count) of them)")
    let starts = (0..<7).map { $0 * 600 }
    check(starts.allSatisfy { e in times.contains { abs($0 - e) <= 2 } }, "each part starts where the one before it ended: 0:00, 10:00, 20:00, 30:00, 40:00, 50:00, 1:00:00 (the labels: \(labels.prefix(1) + labels.filter { at($0) % 600 < 3 }))")
    var marks: [String] = []
    if let rx = try? NSRegularExpression(pattern: "part([0-9a-f]{10})") {
      for m in rx.matches(in: words, range: NSRange(words.startIndex..., in: words)) { if let r = Range(m.range(at: 1), in: words) { let k = String(words[r]); if marks.last != k { marks.append(k) } } }
    }
    var kept: [String] = []
    for f in files { kept.append(media(who, f["name"] as? String ?? "").map { String(sha1($0).prefix(10)) } ?? "?") }
    check(marks == kept, "the parts' words come in the order the parts were sent (\(marks.count) runs of words; the first \(marks.first ?? "?") and \(kept.first ?? "?"))")
    check(problems().isEmpty, "every call to the stand-in had its key, schema, and privacy settings (\(problems().joined(separator: "; ")))")
    check(made(who) == 1, "all of it counted as one make")
  }

  // ---------- 18: caption files ----------
  func test18Captions() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    // (The app only has to send a caption file the way it sends any document: it's the server that reads it. A server that doesn't know the
    // .srt kind yet refuses the upload, and then there's nothing for the app to be checked against.)
    let probe = api("mkscap" + run, "POST", "/api/make/upload", ["name": "probe.srt", "type": "application/x-subrip", "size": 12])
    try XCTSkipIf(probe.status == 415, "This server doesn’t read caption files yet (it says: \((probe.json as? [String: Any])?["error"] as? String ?? "")).")
    for (file, label, letter) in [("lecture.srt", "an .srt file", "a"), ("lecture.vtt", "a .vtt file", "b")] {
      let who = "mks" + run + letter, name = "Captions " + letter + " " + run
      stubReset()
      let app = launch(as: who, ["-makeFile", fx(file)])
      check(wait(text(app, "Upload")) && wait(text(app, file)), label + " is listed on Upload, as a document")
      noLabel(app, "the Upload page")
      typeInto(app.textFields["Deck name"], name)
      guard makeIt(app, label) else { continue }
      check(app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "[0-9]+:[0-9]{2}")).count >= 2, label + ": its cards say the time they came from")
      save(app, into: name)
      let d = deck(who, name), cs = cards(who, in: d?["id"] as? String ?? ""), src = sources(d).first
      check(src?["kind"] as? String == "file" && (src?["files"] as? [[String: Any]])?.first?["file"] as? String == file, "the deck’s source is the file")
      check(!cs.isEmpty && cs.allSatisfy { (($0["src"] as? [String: Any])?["at"] as? String ?? "").range(of: "^[0-9]+:[0-9]{2}(:[0-9]{2})?$", options: .regularExpression) != nil }, "each card keeps the time it came from (\(cs.compactMap { ($0["src"] as? [String: Any])?["at"] as? String }.prefix(4)))")
      check(asked("/audio/transcriptions").isEmpty && asked(":generateContent").isEmpty && !asked("/chat/completions").isEmpty, "no recording or video was involved: the captions’ words went to the text model")
    }
  }
  // ---------- 19: the starter notes beside the cards ----------
  /// The schema of a question to the stand-in's text model: does it ask for notes (and an overview)?
  private func asksForNotes() -> Bool {
    ((((asked("/chat/completions").first?["body"] as? [String: Any])?["response_format"] as? [String: Any])?["json_schema"] as? [String: Any])?["schema"] as? [String: Any]).flatMap { ($0["properties"] as? [String: Any])?["notes"] } != nil
  }
  func test19Notes() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkq2" + run, topic = "Photosynthesis " + run, name = "Plants " + run
    stubReset()
    var app = launch(as: who, ["-makeTopic", topic])
    check(wait(text(app, "A topic")), "a topic")
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "a topic with notes") else { return }
    check(asksForNotes(), "the make asked the AI for notes along with the cards (the app said options.notes: true)")
    check(wait(text(app, "Notes for the deck")) && text(app, "3 notes · saved with the cards").exists, "the review has a “Notes for the deck” panel: “3 notes · saved with the cards”")
    let sw = button(app, "Save these notes with the cards")
    check(sw.exists && (sw.value as? String) == "On" && button(app, "Read the notes").exists, "with its switch (on) and “Read the notes”")
    noLabel(app, "the notes panel")
    check(!text(app, "About " + topic + " 1").exists, "the draft is folded away")
    button(app, "Read the notes").tap()
    check(wait(button(app, "Hide the notes")) && wait(text(app, "About " + topic + " 1")) && text(app, topic).exists, "Read the notes unfolds the draft: its title, and a heading for each note")
    button(app, "Hide the notes").tap()
    check(wait(button(app, "Read the notes")) && !text(app, "About " + topic + " 1").exists, "and Hide the notes folds it again")
    // the cards are still there below it
    check(edits(app).count >= 5, "the cards are listed below the notes (\(edits(app).count))")
    save(app, into: name)
    var d = deck(who, name)
    let guide = ((d?["guide"] as? [String: Any])?["text"] as? String) ?? ""
    check(guide.hasPrefix("# " + topic) && guide.contains("## About " + topic + " 1"), "saved with the cards, a deck with no Guide gets the notes as its Guide (\(guide.prefix(40))…)")
    // the switch off: the cards are saved, the notes aren't
    stubReset()
    let again = "Plants two " + run
    app = launch(as: who, ["-makeTopic", topic + " two"])
    typeInto(app.textFields["Deck name"], again)
    guard makeIt(app, "a second make with notes") else { return }
    check(wait(button(app, "Save these notes with the cards")), "the switch is there again, on")
    button(app, "Save these notes with the cards").tap()
    check(wait(text(app, "3 notes · not saved")) && (button(app, "Save these notes with the cards").value as? String) == "Off", "turning it off says “3 notes · not saved”")
    save(app, into: again)
    d = deck(who, again)
    check(cards(who, in: d?["id"] as? String ?? "").count >= 5 && ((d?["guide"] as? [String: Any])?["text"] as? String ?? "").isEmpty, "the cards are saved and the notes are left out")
    // a make that gets no notes has no panel
    stubReset(); stubFlags(["noNotes": true])
    defer { stubFlags(["noNotes": false]) }
    app = launch(as: who, ["-makeTopic", topic + " three"])
    guard makeIt(app, "a make the AI gave no notes for") else { return }
    check(!text(app, "Notes for the deck").exists && !button(app, "Read the notes").exists && edits(app).count >= 5, "when the AI gives no notes there is no panel, only the cards")
    app.buttons["Discard"].firstMatch.tap()
    stubFlags(["noNotes": false])
    // a make from a Guide page asks for no notes (a Guide page already is notes), and shows no panel
    let did = deck(who, name)?["id"] as? String ?? ""
    act(who, "guide.save", ["deckId": did, "text": "# Plants\n\nChlorophyll takes in light. The light reactions make ATP, and the Calvin cycle makes sugar from carbon dioxide."])
    stubReset()
    app = launch(as: who, ["-makeRoute", "guide=" + did])
    check(wait(text(app, "Paste")), "a Guide’s words open Paste")
    guard makeIt(app, "a make from a Guide") else { return }
    check(!asksForNotes() && !text(app, "Notes for the deck").exists, "it asked for no notes and shows no panel")
    app.buttons["Discard"].firstMatch.tap()
  }

  // ---------- 20: audio cards for a language ----------
  /// Chooses a language in the Language menu.
  private func pickLanguage(_ app: XCUIApplication, _ language: String) {
    let menu = app.buttons["Language of the cards"].firstMatch
    guard wait(menu, 10) else { check(false, "found the Language menu"); return }
    menu.tap()
    let item = app.buttons[language].firstMatch, other = app.menuItems[language].firstMatch
    if wait(item, 4) { item.tap() } else if wait(other, 4) { other.tap() } else { check(false, "found \(language) in the Language menu") }
  }
  func test20AudioCards() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mka2" + run, name = "Spanish words " + run
    stubReset()
    // (Pasted words, not a topic: a topic makes just the number of cards asked for, and the audio cards that the stand-in adds at the end would be thinned out.)
    var app = launch(as: who, ["-makeText", fx("plain.txt")])
    check(wait(text(app, "Paste")), "words to make cards from")
    check(!button(app, "Audio").exists, "there is no Audio kind until a language is set")
    pickLanguage(app, "Spanish")
    check(wait(button(app, "Audio")) && !button(app, "Audio").isSelected && button(app, "Basic").isSelected && button(app, "Fill in the blank").isSelected, "choosing Spanish adds an Audio kind beside Basic and Fill in the blank, off")
    let line = "Words and short phrases in Spanish are read aloud by your device’s voice. The back says what they mean."
    check(!text(app, line).exists, "with no line about it yet")
    button(app, "Audio").tap()
    check(wait(text(app, line)) && button(app, "Audio").isSelected, "turning it on says what it does: “\(line)”")
    noLabel(app, "the options")
    // Language cleared: Audio goes away, and the kinds are as they were
    pickLanguage(app, "Same as the material")
    check(gone(button(app, "Audio"), 6) && !text(app, line).exists && button(app, "Basic").isSelected && button(app, "Fill in the blank").isSelected, "clearing the language puts Audio away again")
    pickLanguage(app, "Spanish")
    check(wait(button(app, "Audio")) && !button(app, "Audio").isSelected, "(and it is off when a language comes back)")
    button(app, "Audio").tap()
    button(app, "50").tap()
    typeInto(app.textFields["Deck name"], name)
    guard makeIt(app, "audio cards") else { return }
    let chat = asked("/chat/completions").first?["body"] as? [String: Any]
    let kindEnum = ((((((chat?["response_format"] as? [String: Any])?["json_schema"] as? [String: Any])?["schema"] as? [String: Any])?["properties"] as? [String: Any])?["cards"] as? [String: Any])?["items"] as? [String: Any])
    let kinds = (((kindEnum?["properties"] as? [String: Any])?["kind"] as? [String: Any])?["enum"] as? [String]) ?? []
    check(Set(kinds) == ["basic", "cloze", "audio"], "the AI was asked for Basic, Fill in the blank and Audio cards (\(kinds))")
    let words = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Palabra ")).allElementsBoundByIndex.map(\.label)
    check(words.count == 2, "two audio cards show the words to say (\(words))")
    check(app.staticTexts.matching(NSPredicate(format: "label == %@", "Read aloud · es-ES")).count == 2, "each says “Read aloud · es-ES” (the language, as a proper code)")
    let hear = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Hear ")).allElementsBoundByIndex
    check(hear.count == 2 && hear.allSatisfy { $0.label.hasPrefix("Hear Palabra ") }, "and a small speaker button (“\(hear.first?.label ?? "")”)")
    if let first = hear.first, first.exists { first.tap() }
    check(app.state == .runningForeground && wait(text(app, "Check your cards")), "pressing it says the words with the device’s voice, and the review stays")
    // the audio cards are the last of the list: edit the first of them
    let edit = edits(app).element(boundBy: edits(app).count - 2)
    edit.tap()
    check(wait(app.textFields["Words to say"]) && app.textFields["What it means"].exists && !app.textFields["Question"].exists, "editing an audio card shows “Words to say” and “What it means”")
    let sayField = app.textFields["Words to say"]
    typeInto(sayField, "la casa nueva", clear: (sayField.value as? String ?? "").count)
    tap(button(app, "Done editing"), "Done editing")
    check(text(app, "la casa nueva").exists && app.buttons["Hear la casa nueva"].exists, "the edit shows: the new words, and a speaker for them")
    noLabel(app, "the audio review")
    save(app, into: name)
    let d = deck(who, name), cs = cards(who, in: d?["id"] as? String ?? ""), audio = cs.filter { $0["kind"] as? String == "audio" }
    check(audio.count == 2 && audio.allSatisfy { ($0["lang"] as? String) == "es-ES" && !(($0["speak"] as? String) ?? "").isEmpty && !(($0["back"] as? String) ?? "").isEmpty }, "the deck keeps two audio cards, each with its words, language and meaning (\(audio.map { $0["speak"] as? String ?? "" }))")
    check(audio.contains { ($0["speak"] as? String) == "la casa nueva" }, "the one that was edited was saved as edited")
    check(cs.contains { $0["kind"] as? String == "basic" }, "next to the Basic cards of the same make")
  }

  // ---------- 21: a deck whose Guide has every page it can have has no room for notes ----------
  func test21NoRoomForNotes() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "mkn3" + run, name = "Crowded " + run, topic = "Respiration " + run
    // a deck with the Guide's own words and all ten extra pages a Guide may have
    let did = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
    act(who, "guide.save", ["deckId": did, "text": "# " + name + "\n\nMy own words about breathing."])
    var pageIds: [String] = []
    for i in 1...10 { pageIds.append(act(who, "guide.page.add", ["deckId": did, "title": "Page \(i)"])["id"] as? String ?? "") }
    func pages() -> [[String: Any]] { (deck(who, name)?["guide"] as? [String: Any])?["pages"] as? [[String: Any]] ?? [] }
    check(did.isEmpty == false && pageIds.allSatisfy { !$0.isEmpty } && pages().count == 10, "a deck whose Guide has its own words and all ten extra pages (\(pages().count))")
    stubReset()
    var app = launch(as: who, ["-makeTopic", topic])
    check(wait(text(app, "A topic")), "a topic")
    tap(button(app, name), name)
    check(button(app, name).isSelected, "going into that deck")
    guard makeIt(app, "a topic for a deck with every Guide page") else { return }
    check(asksForNotes(), "the make still asked for notes (it is the review that says there is no room)")
    let line = "This deck has every page a Guide can have, so these notes can’t be added. Delete a page in its Guide to make room."
    check(wait(text(app, "Notes for the deck")) && wait(text(app, line)), "the review says so: “\(line)”")
    let sw = button(app, "Save these notes with the cards")
    check(sw.exists && (sw.value as? String) == "Off" && !sw.isEnabled, "the switch is off, and can’t be turned on")
    sw.tap()
    check(text(app, line).exists && (sw.value as? String) == "Off", "pressing it changes nothing")
    check(button(app, "Read the notes").exists, "the notes can still be read")
    button(app, "Read the notes").tap()
    check(wait(button(app, "Hide the notes")) && wait(text(app, "About " + topic + " 1")), "(and they open)")
    button(app, "Hide the notes").tap()
    noLabel(app, "the review with no room for notes")
    save(app, into: name)
    let g = deck(who, name)?["guide"] as? [String: Any]
    check(pages().count == 10 && ((g?["text"] as? String) ?? "").contains("My own words about breathing") && !((g?["text"] as? String) ?? "").contains("About " + topic), "the Guide is as it was: its own words, ten pages")
    check(cards(who, in: did).count >= 5, "and the cards were saved (\(cards(who, in: did).count))")
    // a page deleted: the notes have room again
    act(who, "guide.page.delete", ["deckId": did, "page": pageIds[0]])
    // (Other words, not the same ones again: the deck has these cards, and the server leaves out cards it already has.)
    let again = "Digestion " + run
    stubReset()
    app = launch(as: who, ["-makeTopic", again])
    check(wait(text(app, "A topic")), "the same deck, a page fewer: a topic")
    tap(button(app, name), name)
    guard makeIt(app, "a topic for a deck with a page to spare") else { return }
    check(wait(text(app, "3 notes · saved with the cards")) && !text(app, line).exists, "the notes have room: “3 notes · saved with the cards”")
    let on = button(app, "Save these notes with the cards")
    check(on.exists && (on.value as? String) == "On" && on.isEnabled, "the switch is on, and can be used")
    save(app, into: name)
    check(pages().count == 10 && pages().contains { (($0["text"] as? String) ?? "").contains("## About " + again) }, "the notes were saved as a page of the Guide (ten again)")
  }
}
