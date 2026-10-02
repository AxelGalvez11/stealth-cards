// The owner's first TestFlight notes (2026-10-01), end to end in the iPhone app, against a copy of the server on this Mac with
// made-up people (the `lc_dev` cookie that the debug-only `-dev <name>` launch argument sets). Each flow sets up its own people,
// so any one can run alone (ONLY=PolishTests/test3ShareOpensTheShareSheet ios/tools/e2e-polish.sh):
//   1  The first page (the Library: there is no Today) has no profile picture; its + stays on the right, and the Profile tab is the way in.
//   2  "Remove from folder": a deck's ⋯ menu and Deck settings have it only for a deck that's in a folder, and it takes the deck
//      out; a copy of someone's deck picks "Library", not "No folder".
//   3  Share opens the phone's share sheet: Share profile, a deck's Share link, a class's Share invite link. Connect AI's link
//      still copies.
//   4  Swiping: from the left edge goes back on every pushed page; a swipe on a tab's first page moves to the next tab or the one
//      before (and not at either end, not from a row that scrolls sideways, not while studying).
//   5  Haptics: the ones that matter fire (a tab, a segmented control, a switch, flipping and grading a card, a right and a wrong
//      answer, a deck made, a delete), read from the debug-only audit (`-hapticAudit`, Design/Haptics.swift).
//   6  The deck cover's parallax: half the scroll, still with Reduce Motion, on a deck and on a shared deck's page (`-parallaxAudit`).
//      (Pulled down past the top it stretches: that was already there and its bounce is over before a test can ask.)
//   7  Explain on a flashcard (the owner, later that day: "in ios just make it open below questions and flashcards"): the explanation
//      opens UNDER the card, which gets a little shorter and stays whole; closing puts it back; a saved one shows again without
//      asking the AI; a failing AI says so; Free's fourth of the day offers Go Pro. The AI is a stand-in (ios/tools/explain-stub.mjs).
//   8  Explain in Learn mode: under the answers and the line that says why, in view, for a choice question and a typed answer.
//
// Run it with ios/tools/e2e-polish.sh (it starts a fresh server on port 3914). It only runs when LUCIDA_POLISH is set, so the other
// scripts keep running their own checks alone.
import XCTest

final class PolishTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3914"
  /// The stand-in for the AI that writes explanations (ios/tools/explain-stub.mjs): it counts how many it has been asked for.
  static let ai = ProcessInfo.processInfo.environment["LUCIDA_AI"] ?? "http://127.0.0.1:3916"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private let tabs = ["Library", "Discover", "Stats", "Profile"]

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_POLISH"] != nil, "Run with ios/tools/e2e-polish.sh")
  }
  override class func tearDown() { print("Polish: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else {
      Self.failed += 1; print("  FAIL " + name); XCTFail(name)
      snap("polish-fail-\(Self.failed)")
    }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  /// Taps something and waits for what it opens; if that doesn't come (a tap just as the page redraws can be lost on a busy Mac),
  /// taps again, up to three times.
  private func tapOpening(_ e: XCUIElement, _ opens: XCUIElement, _ what: String) {
    for _ in 0..<3 {
      guard e.waitForExistence(timeout: 12) else { check(false, "found " + what + " to tap"); return }
      e.tap()
      if opens.waitForExistence(timeout: 5) { return }
    }
  }
  /// A request as one of the made-up people; the answer's JSON.
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: Self.server + path)!)
    r.httpMethod = method
    r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie")
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body) }
    let done = DispatchSemaphore(value: 0)
    var out: (Int, Any?) = (0, nil)
    URLSession.shared.dataTask(with: r) { data, resp, _ in
      out = ((resp as? HTTPURLResponse)?.statusCode ?? 0, data.flatMap { try? JSONSerialization.jsonObject(with: $0) })
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 20)
    return out
  }
  @discardableResult
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  @discardableResult
  private func social(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/social", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  private func deckFolder(_ who: String, _ id: String) -> String? {
    ((state(who)["decks"] as? [[String: Any]])?.first { $0["id"] as? String == id })?["folder"] as? String
  }
  /// Waits (up to `secs`) for a deck to be in a folder (nil: none).
  private func deckIn(_ who: String, _ id: String, _ folder: String?, _ secs: Double = 8) -> Bool {
    let end = Date().addingTimeInterval(secs)
    while Date() < end { if deckFolder(who, id) == folder { return true }; Thread.sleep(forTimeInterval: 0.3) }
    return deckFolder(who, id) == folder
  }
  private func deckExists(_ who: String, _ id: String) -> Bool { (state(who)["decks"] as? [[String: Any]])?.contains { $0["id"] as? String == id } ?? false }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  /// A design screen (the canvas's sample data), opened straight away.
  private func launchBoard(_ board: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-board", board] + extra
    app.launch()
    return app
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  private func buttonHaving(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  /// The last button with this label that a finger can reach (the one in front, not one under it).
  private func front(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex.last { $0.isHittable } ?? app.buttons[label].firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 10) -> Bool { e.waitForExistence(timeout: s) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func lit(_ app: XCUIApplication) -> String? { tabs.first { button(app, $0).exists && button(app, $0).isSelected } }
  private func litIs(_ app: XCUIApplication, _ tab: String, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if lit(app) == tab { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return lit(app) == tab
  }
  /// A person who has been through the welcome, with a deck of their own (so the Library is the full one).
  private func person(_ who: String, _ name: String, deck: String? = "Biology", cards: Int = 2) {
    act(who, "settings.update", ["patch": ["name": name, "welcomed": true]])
    if let deck {
      let id = act(who, "deck.add", ["name": deck])["id"] as? String ?? ""
      for i in 1...cards { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "What is ATP \(i)?", "back": "Energy currency \(i)"]) }
    }
  }
  private func makeDeck(_ who: String, _ name: String, cards: Int = 3, folder: String? = nil) -> String {
    let id = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
    for i in 1...cards { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "\(name) question \(i)", "back": "Answer \(i)"]) }
    if let folder { act(who, "deck.update", ["id": id, "patch": ["folder": folder]]) }
    return id
  }

  /// The phone's share sheet is up (the system's activity view; it has Copy among its actions).
  private func sheetUp(_ app: XCUIApplication) -> Bool {
    app.otherElements["ActivityListView"].exists || app.collectionViews["ActivityListView"].exists || app.otherElements["ActivityContentView"].exists
      || app.navigationBars["UIActivityContentView"].exists || app.buttons["Copy"].exists || app.staticTexts["Copy"].exists
  }
  private func shareSheetShown(_ app: XCUIApplication, _ s: TimeInterval = 10) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if sheetUp(app) { return true }; Thread.sleep(forTimeInterval: 0.3) }
    return sheetUp(app)
  }
  /// Puts the share sheet away the way a person does: a tap on the page above it (a tap up in the status bar does nothing).
  private func closeShareSheet(_ app: XCUIApplication) {
    for _ in 0..<3 {
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
      let end = Date().addingTimeInterval(3)
      while Date() < end && sheetUp(app) { Thread.sleep(forTimeInterval: 0.25) }
      if !sheetUp(app) { break }
    }
    Thread.sleep(forTimeInterval: 0.8)
  }

  /// A swipe from one side to the other along `y` (0...1 of the screen), quick like a flick.
  private func flick(_ app: XCUIApplication, from: CGFloat, to: CGFloat, y: CGFloat = 0.62) {
    let a = app.coordinate(withNormalizedOffset: CGVector(dx: from, dy: y)), b = app.coordinate(withNormalizedOffset: CGVector(dx: to, dy: y))
    a.press(forDuration: 0.02, thenDragTo: b, withVelocity: .fast, thenHoldForDuration: 0)
  }
  /// The edge swipe: from the very left, across (once the page that just came in has settled: nothing goes back mid-push). It
  /// goes at an ordinary pace and stops there a moment before letting go, so a busy Mac can't make it too quick to be seen.
  private func edgeBack(_ app: XCUIApplication) {
    Thread.sleep(forTimeInterval: 0.8)
    let a = app.coordinate(withNormalizedOffset: CGVector(dx: 0.005, dy: 0.5)), b = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5))
    a.press(forDuration: 0.05, thenDragTo: b, withVelocity: .default, thenHoldForDuration: 0.15)
    print("  · what the edge swipe decided so far: " + audit(app, "popAudit"))
  }
  private func audit(_ app: XCUIApplication, _ id: String = "hapticAudit") -> String {
    let e = app.otherElements[id].firstMatch
    return e.exists ? (e.value as? String ?? "") : ""
  }
  /// Waits for the audit to say something happened (the haptics that fired, like "selection:tab").
  private func buzzed(_ app: XCUIApplication, _ what: String, _ s: TimeInterval = 6) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if audit(app).contains(what) { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return audit(app).contains(what)
  }
  private func number(_ audit: String, _ key: String) -> Double {
    audit.split(separator: " ").compactMap { p -> Double? in p.hasPrefix(key + "=") ? Double(p.dropFirst(key.count + 1)) : nil }.first ?? -1
  }

  // ---------- 1: the first page ----------
  func test1FirstPageHasNoProfilePicture() throws {
    let pia = "pia" + run
    person(pia, "Pia Polish")
    let app = launch(as: pia)
    check(wait(button(app, "Add")) && litIs(app, "Library"), "the app opens on the Library, with its + on the right (a menu: Add)")
    check(button(app, "Your profile").exists == false, "it has no profile picture button")
    check(!app.buttons.matching(NSPredicate(format: "label CONTAINS 'profile'")).firstMatch.exists, "nor any button about a profile (the Profile tab is the way in)")
    let title = app.staticTexts.matching(NSPredicate(format: "label == 'Library'")).allElementsBoundByIndex.first { $0.frame.minY < 200 }
    check(title != nil && abs(title!.frame.minX - (app.frame.minX + 20)) <= 2, "the title is on the left")
    let plus = button(app, "Add")
    check(abs(plus.frame.maxX - (app.frame.maxX - 20)) <= 1, "the + is 20 from the right edge")
    check(button(app, "Profile").exists && !button(app, "Today").exists, "the Profile tab is in the tab bar (and there is no Today)")
    tap(button(app, "Profile"), "the Profile tab")
    check(wait(button(app, "Edit profile")) && litIs(app, "Profile"), "and it opens your own profile")
  }

  // ---------- 2: Remove from folder ----------
  func test2RemoveFromFolder() throws {
    let rae = "rae" + run
    person(rae, "Rae Folder", deck: nil)
    let folder = act(rae, "folder.add", ["name": "Languages"])["id"] as? String ?? ""
    let spanish = makeDeck(rae, "Spanish Verbs", folder: folder)
    let japanese = makeDeck(rae, "Japanese Words", folder: folder)
    let biology = makeDeck(rae, "Biology Basics")
    let app = launch(as: rae, ["-open", "library"])
    // In a folder: the menu has it, first, and the folder is ticked.
    tapOpening(buttonHaving(app, "Languages"), button(app, "Move Spanish Verbs to a folder"), "the Languages folder")
    let more = button(app, "Move Spanish Verbs to a folder")
    tap(more, "⋯ on Spanish Verbs")
    check(wait(button(app, "Remove from folder")), "a deck in a folder: its menu has Remove from folder")
    check(!button(app, "No folder").exists, "and no “No folder”")
    check(button(app, "Remove from folder").frame.minY < buttonStarting(app, "Languages").frame.minY, "it comes first, above the folders")
    check(button(app, "Remove from folder").isSelected == false, "it isn't ticked (the folder the deck is in is)")
    button(app, "Remove from folder").tap()
    check(deckIn(rae, spanish, nil), "Remove from folder takes the deck out of its folder")
    check(gone(button(app, "Move Spanish Verbs to a folder")), "and the deck leaves the folder's page")
    check(deckIn(rae, japanese, folder), "(the folder's other deck stays)")
    // Out of a folder: no such choice.
    tap(button(app, "Library"), "the Library tab")
    let top = button(app, "Move Biology Basics to a folder")
    tap(top, "⋯ on Biology Basics")
    check(wait(buttonStarting(app, "Languages")) && !button(app, "Remove from folder").exists && !button(app, "No folder").exists, "a deck in no folder: no Remove from folder, and no “No folder”")
    check(deckFolder(rae, biology) == nil, "(and it stays where it is)")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
    // Deck settings: the Folder chips.
    let app2 = launch(as: rae, ["-open", "deck:Japanese Words"])
    tap(button(app2, "Deck settings"), "Deck settings")
    check(wait(button(app2, "Remove from folder")), "Deck settings: a deck in a folder has the Remove from folder chip")
    check(!button(app2, "No folder").exists, "and no “No folder” chip")
    button(app2, "Remove from folder").tap()
    check(deckIn(rae, japanese, nil), "the chip takes the deck out")
    check(gone(button(app2, "Remove from folder")), "and then the deck has no such chip")
    // A copy of someone's deck: the top level of your library is "Library".
    let sam = "sam" + run
    person(sam, "Sam Owner", deck: nil)
    let shared = makeDeck(sam, "Shared Chemistry")
    let sh = social(sam, "deck.share", ["deckId": shared, "visibility": "public"])
    let samHandle = social(sam, "profile.ensure")["handle"] as? String ?? ""
    let app3 = launch(as: rae, ["-open", "deckpage:/@\(samHandle)/\(sh["slug"] as? String ?? "")?copy=1"])
    check(wait(button(app3, "Folder: Library")), "copying a shared deck: the folder starts as Library, not “No folder”")
    check(!button(app3, "Folder: No folder").exists, "(nothing says “No folder”)")
  }

  // ---------- 3: Share ----------
  func test3ShareOpensTheShareSheet() throws {
    let uma = "uma" + run
    person(uma, "Uma Share", deck: nil)
    let deck = makeDeck(uma, "Shared Biology")
    social(uma, "deck.share", ["deckId": deck, "visibility": "public"])
    let app = launch(as: uma)
    tap(button(app, "Profile"), "the Profile tab")
    check(wait(button(app, "Share profile")), "your profile has Share profile")
    button(app, "Share profile").tap()
    check(shareSheetShown(app), "Share profile opens the phone's share sheet")
    check(!button(app, "Link copied").exists, "and doesn't just say Link copied")
    closeShareSheet(app)
    check(!sheetUp(app) && wait(button(app, "Share profile")) && !button(app, "Link copied").exists, "closing the sheet leaves the page as it was")
    // The round Share beside the handle does the same.
    let shares = app.buttons.matching(NSPredicate(format: "label == 'Share profile'")).allElementsBoundByIndex
    check(shares.count >= 2, "there are two Share buttons (the round one at the top, and the wide one), " + shares.map { "\($0.frame) hittable=\($0.isHittable)" }.joined(separator: " "))
    if let top = shares.min(by: { $0.frame.minY < $1.frame.minY }), top.isHittable { top.tap() }
    check(shareSheetShown(app), "so does the Share button at the top")
    closeShareSheet(app)
    // A deck's Sharing link.
    tap(button(app, "Library"), "the Library tab")
    tap(buttonHaving(app, "Public"), "the shared deck")
    tap(button(app, "Deck settings"), "Deck settings")
    tap(app.buttons["Sharing"].firstMatch, "the Sharing tab")
    check(wait(button(app, "Share link")) && !button(app, "Copy link").exists, "Sharing: the link's button says Share link")
    button(app, "Share link").tap()
    check(shareSheetShown(app), "and opens the share sheet")
    closeShareSheet(app)
    // A class's invite.
    let code = social(uma, "class.make", ["name": "Bio " + run, "school": "UC"])["code"] as? String ?? ""
    let app2 = launch(as: uma, ["-open", "class:" + code])
    check(wait(button(app2, "Share invite link")) && !button(app2, "Copy invite link").exists, "a class's invite says Share invite link")
    button(app2, "Share invite link").tap()
    check(shareSheetShown(app2), "and opens the share sheet")
    closeShareSheet(app2)
    // Connect AI's link is for pasting: it still copies.
    let app3 = launch(as: uma, ["-open", "connect"])
    tap(button(app3, "Copy link"), "Connect AI's Copy link")
    check(wait(button(app3, "Copied")), "Connect AI's link still copies (Copied)")
    check(!app3.otherElements["ActivityListView"].exists, "and opens no share sheet")
  }

  // ---------- 4: Swipes ----------
  func test4SwipeToChangePages() throws {
    let ivy = "ivy" + run
    person(ivy, "Ivy Swipe", cards: 3)
    let other = "oli" + run
    person(other, "Oli Other", deck: nil)
    let otherHandle = social(other, "profile.ensure")["handle"] as? String ?? ""
    let shared = makeDeck(other, "Oli Shared")
    let sh = social(other, "deck.share", ["deckId": shared, "visibility": "public"])
    let folder = act(ivy, "folder.add", ["name": "Languages"])["id"] as? String ?? ""
    _ = makeDeck(ivy, "Spanish Verbs", folder: folder)
    let app = launch(as: ivy, ["-popAudit"])
    check(wait(button(app, "New folder")) && litIs(app, "Library"), "the Library is showing")

    // ----- between tabs -----
    flick(app, from: 0.9, to: 0.1)
    check(litIs(app, "Discover") && wait(button(app, "News")), "a swipe left on the Library moves to Discover (and the tab bar follows)")
    // A row of chips that scrolls sideways keeps its own swipe.
    let chip = buttonStarting(app, "For you")
    if wait(chip, 8) {
      let y = (chip.frame.midY / app.frame.height)
      flick(app, from: 0.85, to: 0.15, y: y)
      check(lit(app) == "Discover", "a swipe that starts on the topic chips scrolls them (it doesn't change tab)")
    } else { check(false, "found the topic chips") }
    flick(app, from: 0.9, to: 0.1, y: 0.8)
    check(litIs(app, "Stats"), "a swipe left elsewhere moves on to Stats")
    flick(app, from: 0.9, to: 0.1)
    check(litIs(app, "Profile") && wait(button(app, "Edit profile")), "and to Profile")
    flick(app, from: 0.9, to: 0.1)
    Thread.sleep(forTimeInterval: 0.8)
    check(lit(app) == "Profile" && button(app, "Edit profile").exists, "at the last tab a swipe left does nothing (no bounce, no jump)")
    flick(app, from: 0.1, to: 0.9)
    check(litIs(app, "Stats"), "a swipe right goes back, to Stats")
    flick(app, from: 0.1, to: 0.9)
    flick(app, from: 0.1, to: 0.9)
    check(litIs(app, "Library") && wait(button(app, "New folder")), "and back to the Library")
    flick(app, from: 0.1, to: 0.9)
    Thread.sleep(forTimeInterval: 0.8)
    check(lit(app) == "Library" && button(app, "New folder").exists, "at the first tab a swipe right does nothing")
    // A page that is in the middle of the way is never left there: stop half-way and let go.
    let a = app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.62)), b = app.coordinate(withNormalizedOffset: CGVector(dx: 0.78, dy: 0.62))
    a.press(forDuration: 0.05, thenDragTo: b, withVelocity: .slow, thenHoldForDuration: 0.1)
    Thread.sleep(forTimeInterval: 0.8)
    check(lit(app) == "Library" && button(app, "New folder").isHittable, "a short drag that is let go goes back (the page isn't left half over)")

    // ----- not while studying -----
    tap(buttonStarting(app, "Biology"), "the Biology deck")
    tap(buttonStarting(app, "Flashcards"), "Flashcards")
    check(wait(button(app, "End review")), "a review opens over everything")
    flick(app, from: 0.9, to: 0.1, y: 0.45)
    check(button(app, "End review").exists, "a swipe on the study card doesn't change tab")
    button(app, "End review").tap()
    check(wait(button(app, "Deck settings")) && litIs(app, "Library"), "(and leaving the review lands on the deck, the Library still lit)")

    // ----- back, from the left edge, on every pushed page -----
    edgeBack(app)
    check(wait(button(app, "New folder")) && gone(button(app, "Deck settings")), "a deck's page: the edge swipe goes back")
    tap(buttonHaving(app, "Languages"), "the Languages folder")
    check(wait(button(app, "Rename")), "a folder's page opens")
    edgeBack(app)
    check(gone(button(app, "Rename")) && wait(button(app, "New folder")), "a folder's page: the edge swipe goes back")
    tap(button(app, "Profile"), "the Profile tab")
    tap(button(app, "Settings"), "the gear")
    check(wait(app.staticTexts["Settings"]), "Settings opens")
    edgeBack(app)
    check(gone(app.staticTexts["Settings"]) && wait(button(app, "Share profile")), "Settings: the edge swipe goes back to your profile")
    tap(button(app, "Settings"), "the gear")
    tap(buttonStarting(app, "Connect AI"), "the Connect AI row")
    check(wait(app.staticTexts["YOUR MCP LINK"]), "Settings › Connect AI opens")
    edgeBack(app)
    check(gone(app.staticTexts["YOUR MCP LINK"]) && wait(buttonStarting(app, "Connect AI")), "Connect AI: the edge swipe goes back to Settings")
    edgeBack(app)
    check(wait(button(app, "Share profile")), "and once more to your profile")
    tap(button(app, "Discover"), "the Discover tab")
    tap(button(app, "News"), "the bell")
    check(wait(app.staticTexts["News"]) || wait(button(app, "Back")), "News opens")
    edgeBack(app)
    check(wait(button(app, "News")) && gone(button(app, "Back")), "News: the edge swipe goes back (to Discover)")
    let app2 = launch(as: ivy, ["-open", "profile:" + otherHandle, "-popAudit"])
    check(wait(app2.staticTexts["@" + otherHandle]) && wait(button(app2, "Back")), "someone else's profile opens")
    edgeBack(app2)
    check(gone(app2.staticTexts["@" + otherHandle]) && wait(button(app2, "New folder")), "someone else's profile: the edge swipe goes back")
    let app3 = launch(as: ivy, ["-open", "deckpage:/@\(otherHandle)/\(sh["slug"] as? String ?? "")", "-popAudit"])
    check(wait(button(app3, "Study")) && wait(button(app3, "Back")), "a shared deck's page opens")
    edgeBack(app3)
    check(gone(button(app3, "Study")) && litIs(app3, "Discover"), "a shared deck's page: the edge swipe goes back (to Discover, where it was opened from)")
    // Nothing to go back to on a tab's first page: a swipe from the edge there moves to the tab before, or nothing.
    let app4 = launch(as: ivy)
    check(wait(button(app4, "New folder")), "the Library again")
    edgeBack(app4)
    Thread.sleep(forTimeInterval: 0.8)
    check(lit(app4) == "Library" && button(app4, "New folder").exists, "the edge swipe on the Library's first page does nothing")
  }

  // ---------- 5: Haptics ----------
  func test5Haptics() throws {
    let hal = "hal" + run
    person(hal, "Hal Buzz", deck: nil)
    let deck = makeDeck(hal, "Haptics Deck", cards: 4)
    let app = launch(as: hal, ["-hapticAudit"])
    check(wait(button(app, "New folder")) && audit(app) == "", "nothing has buzzed yet")
    tap(button(app, "Stats"), "the Stats tab")
    check(buzzed(app, "selection:tab"), "a tab switch gives a selection tap")
    let before = audit(app).components(separatedBy: ",").filter { $0 == "selection:tab" }.count
    tap(button(app, "Stats"), "the lit tab")
    Thread.sleep(forTimeInterval: 0.6)
    check(audit(app).components(separatedBy: ",").filter { $0 == "selection:tab" }.count == before, "a tap on the tab you're on gives none")
    tap(button(app, "Library"), "the Library tab")
    tap(button(app, "All cards"), "All cards")
    check(buzzed(app, "selection:segmented"), "a segmented control (Decks, All cards, Classes) gives a selection tap")
    tap(button(app, "Decks"), "Decks")
    // a tap on a plain row buzzes nothing
    let n0 = audit(app).components(separatedBy: ",").count
    tap(buttonStarting(app, "Haptics Deck"), "the deck row")
    check(wait(button(app, "Deck settings")), "a deck opens")
    Thread.sleep(forTimeInterval: 0.6)
    check(audit(app).components(separatedBy: ",").count == n0, "opening a deck from a row gives no haptic")
    // a switch
    tap(button(app, "Deck settings"), "Deck settings")
    tap(app.buttons["Studying"].firstMatch, "the Studying tab")
    check(buzzed(app, "selection:segmented"), "(Deck settings' tabs are segmented controls too)")
    let sw = button(app, "Schedule with FSRS")
    tap(sw, "the FSRS switch")
    check(buzzed(app, "selection:toggle"), "a switch gives a selection tap")
    tap(button(app, "Done"), "Done")
    // flipping and grading a card
    tap(buttonStarting(app, "Flashcards"), "Flashcards")
    check(wait(button(app, "End review")), "the review opens")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4)).tap()
    check(buzzed(app, "light:flip"), "flipping a card gives a light tap")
    tap(buttonStarting(app, "Good"), "Good")
    check(buzzed(app, "light:grade"), "a grade button gives a light tap")
    button(app, "End review").tap()
    // a deck made, and a delete
    _ = wait(button(app, "Deck settings"))
    tap(button(app, "Library"), "the Library tab")
    // (The Library's + is a menu: New deck is one of its rows.)
    tap(button(app, "Add"), "the Library's + menu")
    tap(button(app, "New deck"), "New deck")
    let name = app.textFields.firstMatch
    if wait(name, 8) { name.tap(); name.typeText("Buzz two") } else { check(false, "found the deck's name field") }
    // (the keyboard covers the button: Done puts it away)
    let done = app.keyboards.buttons.matching(NSPredicate(format: "label IN {'Done','done','return','Return'}")).firstMatch
    if done.exists { done.tap(); Thread.sleep(forTimeInterval: 0.6) }
    tap(button(app, "Create deck"), "Create deck")
    check(buzzed(app, "success:deck made", 10), "a deck made gives a success")
    tap(button(app, "Deck settings"), "Deck settings")
    tap(button(app, "Delete deck"), "Delete deck")
    Thread.sleep(forTimeInterval: 1.0)
    // (It asks in Lucida's own question sheet: its answer is the one button with this identifier.)
    tap(app.buttons["question.go"], "the question's Delete deck")
    check(buzzed(app, "warning:delete deck", 10), "confirming a delete gives a warning")
    _ = deck
    // the sample Learn question: a right answer, then (on its own run) a wrong one
    let right = launchBoard("PhoneQuiz", ["-hapticAudit"])
    tap(buttonHaving(right, "It drops"), "the right option")
    check(buzzed(right, "success:right answer"), "a right answer in Learn mode gives a success")
    let wrong = launchBoard("PhoneQuiz", ["-hapticAudit"])
    tap(buttonHaving(wrong, "It rises"), "a wrong option")
    check(buzzed(wrong, "warning:wrong answer"), "a wrong answer gives a warning")
  }

  // ---------- 6: the deck cover's parallax ----------
  func test6CoverParallax() throws {
    let pam = "pam" + run
    person(pam, "Pam Cover", deck: nil)
    _ = makeDeck(pam, "Tall Deck", cards: 24)
    let app = launch(as: pam, ["-open", "deck", "-parallaxAudit"])
    check(wait(button(app, "Deck settings")), "the deck opens")
    Thread.sleep(forTimeInterval: 0.8)
    let a0 = audit(app, "parallaxAudit")
    check(number(a0, "scroll") == 0 && number(a0, "cover") == 0 && number(a0, "still") == 0, "at the top the cover is where it is", a0)
    let a = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75)), b = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.62))
    a.press(forDuration: 0.05, thenDragTo: b, withVelocity: .slow, thenHoldForDuration: 0.6)
    Thread.sleep(forTimeInterval: 0.6)
    let a1 = audit(app, "parallaxAudit"), scroll = number(a1, "scroll"), cover = number(a1, "cover")
    check(scroll > 40 && abs(cover - scroll / 2) <= 1.5, "scrolling up, the cover has moved half as far as the page", a1)
    // Reduce Motion keeps it still
    let still = launch(as: pam, ["-open", "deck", "-parallaxAudit", "-still", "1"])
    check(wait(button(still, "Deck settings")), "the deck opens (Reduce Motion)")
    let s0 = still.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75)), s1 = still.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.62))
    s0.press(forDuration: 0.05, thenDragTo: s1, withVelocity: .slow, thenHoldForDuration: 0.6)
    Thread.sleep(forTimeInterval: 0.6)
    let r = audit(still, "parallaxAudit")
    check(number(r, "scroll") > 40 && number(r, "cover") == 0 && number(r, "still") == 1, "with Reduce Motion the cover stays still while the page scrolls", r)
    // a shared deck's page has it too
    let other = "ola" + run
    person(other, "Ola Owner", deck: nil)
    let shared = makeDeck(other, "Ola Shared", cards: 24)
    let sh = social(other, "deck.share", ["deckId": shared, "visibility": "public"])
    let handle = social(other, "profile.ensure")["handle"] as? String ?? ""
    let page = launch(as: pam, ["-open", "deckpage:/@\(handle)/\(sh["slug"] as? String ?? "")", "-parallaxAudit"])
    check(wait(button(page, "Study")), "a shared deck's page opens")
    _ = wait(page.staticTexts["Ola Shared question 1"], 15)   // (its cards have come, so the page is long enough to scroll)
    Thread.sleep(forTimeInterval: 0.6)
    let p0 = page.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8)), p1 = page.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.62))
    p0.press(forDuration: 0.05, thenDragTo: p1, withVelocity: .slow, thenHoldForDuration: 0.6)
    Thread.sleep(forTimeInterval: 0.6)
    let pa = audit(page, "parallaxAudit")
    check(number(pa, "scroll") > 30 && abs(number(pa, "cover") - number(pa, "scroll") / 2) <= 1.5, "and so does a shared deck's page (half the scroll)", pa)
  }

  // ---------- 7: Explain on a flashcard ----------
  /// How many explanations the stand-in AI has been asked for (a saved one isn't asked for again).
  private func asked() -> Int {
    var n = -1
    let done = DispatchSemaphore(value: 0)
    URLSession.shared.dataTask(with: URL(string: Self.ai + "/__count")!) { d, _, _ in
      n = (d.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any])?["count"] as? Int ?? -1
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 10)
    return n
  }
  private func explanation(_ app: XCUIApplication) -> XCUIElement { app.otherElements["Explanation"].firstMatch }
  private func words(_ app: XCUIApplication, _ w: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", w)).firstMatch }
  /// Turns a flashcard over (the card is the "Flip card" button, and "Flip back" once it's turned).
  private func flip(_ app: XCUIApplication) -> Bool { tap(button(app, "Flip card"), "the card"); return wait(button(app, "Flip back")) }

  func test7ExplainOpensUnderTheCard() throws {
    let eve = "eve" + run
    person(eve, "Eve Explain", deck: nil)
    _ = makeDeck(eve, "Explain Ok", cards: 1)
    let app = launch(as: eve, ["-open", "review"])
    check(wait(button(app, "Flip card")), "a flashcard comes up")
    check(!button(app, "Explain").exists, "before it is turned over, there is no Explain")
    check(flip(app) && wait(button(app, "Explain")), "once it is turned over, Explain is in its corner")
    let screen = app.frame, card0 = button(app, "Flip back").frame
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app)) && wait(words(app, "Because Answer 1")), "the explanation opens, with its words")
    let card = button(app, "Flip back").frame, panel = explanation(app).frame, grade = buttonStarting(app, "Good").frame
    check(panel.minY >= card.maxY, "it is UNDER the card, not over it", "card \(card) panel \(panel)")
    check(card.height >= 250 && card.height < card0.height && abs(card.minY - card0.minY) <= 1, "the card is a little shorter (\(Int(card0.height)) to \(Int(card.height))) and still whole", "\(card0) \(card)")
    check(card.minY >= 0 && panel.maxY <= screen.maxY && grade.minY >= panel.maxY, "the card, the explanation and the grade buttons all fit, in that order", "card \(card) panel \(panel) grade \(grade)")
    check(abs(panel.minX - card.minX) <= 30 && panel.width >= card.width - 70, "the explanation is as wide as the card", "card \(card) panel \(panel)")
    check(!button(app, "Explain").exists && button(app, "Close the explanation").exists, "Explain gives way to the panel, which has its close button")
    snap("explain-review-open")
    tap(button(app, "Close the explanation"), "Close")
    check(gone(explanation(app)) && wait(button(app, "Explanation")), "closing it takes the panel away, and the button now says Explanation")
    check(abs(button(app, "Flip back").frame.height - card0.height) <= 1, "and the card has its whole height back", "\(button(app, "Flip back").frame) \(card0)")
    // saved: it shows again at once, and the AI isn't asked again
    let before = asked()
    tap(button(app, "Explanation"), "Explanation")
    check(wait(explanation(app), 4) && wait(words(app, "Because Answer 1"), 4) && asked() == before, "a saved explanation shows again, and the AI isn’t asked again", "asked \(before) then \(asked())")
    check(!words(app, "**").exists, "its words have no ** marks")

    // the AI fails
    let bad = "bad" + run
    person(bad, "Bea Bad", deck: nil)
    _ = makeDeck(bad, "FAILAI Fail", cards: 1)
    let app2 = launch(as: bad, ["-open", "review"])
    check(flip(app2) && wait(button(app2, "Explain")), "another card, turned over")
    tap(button(app2, "Explain"), "Explain")
    check(wait(words(app2, "didn’t answer"), 15) && wait(explanation(app2), 4), "the AI fails: the panel says so")
    check(!button(app2, "Go Pro").exists, "and offers no Go Pro (a Pro person)")
    tap(button(app2, "Close the explanation"), "Close")
    check(wait(button(app2, "Explain")), "the button still says Explain: nothing was saved")

    // Free: three a day, then Go Pro
    let fre = "free" + run
    person(fre, "Fran Free", deck: nil)
    _ = makeDeck(fre, "Free Explain", cards: 4)
    let app3 = launch(as: fre, ["-open", "review"])
    for i in 1...4 {
      check(flip(app3) && wait(button(app3, "Explain")), "Free, card \(i): turned over")
      tap(button(app3, "Explain"), "Explain")
      if i < 4 { check(wait(words(app3, "\(3 - i) free explanation"), 15), "Free, explanation \(i): the panel says \(3 - i) left today") }
      else {
        check(wait(words(app3, "free explanations"), 15) && wait(button(app3, "Go Pro"), 4), "Free’s fourth is turned away, with Go Pro")
        snap("explain-review-gopro")
      }
      if i < 4 { tap(buttonStarting(app3, "Good"), "Good"); Thread.sleep(forTimeInterval: 0.8) }
    }
  }

  // ---------- 8: Explain in Learn mode ----------
  func test8ExplainInLearnMode() throws {
    // The canvas's sample question (no server): answered, then Explain.
    let b = launchBoard("PhoneQuizAnswered")
    tap(button(b, "Explain"), "Explain")
    check(wait(explanation(b)) && wait(words(b, "It drops. ATP synthase")), "Learn: the explanation opens")
    let panel = explanation(b).frame, last = buttonHaving(b, "Only glycolysis").frame, why = words(b, "Not quite").frame, next = button(b, "Next question").frame
    check(panel.minY >= last.maxY && panel.minY >= why.maxY, "it is under the answers and under the line that says why", "answers \(last) why \(why) panel \(panel)")
    check(panel.minY >= 0 && panel.maxY <= next.minY + 1, "and it is in view, above Next question", "panel \(panel) next \(next)")
    snap("explain-learn-open")
    tap(button(b, "Close the explanation"), "Close")
    check(gone(explanation(b)) && wait(button(b, "Explanation")), "closing it brings the button back (it says Explanation: there is one to read)")
    // a typed answer, for real: any answer is checked, and Explain is offered
    let lea = "lea" + run
    person(lea, "Lea Learn", deck: nil)
    _ = makeDeck(lea, "Learn Explain", cards: 3)
    let app = launch(as: lea, ["-open", "learn"])
    check(wait(button(app, "Start learning")), "Learn mode’s start sheet opens")
    tap(button(app, "Type the answer"), "Type the answer")
    for kind in ["Multiple choice", "Matching", "True or false", "Fill in the blank"] where button(app, kind).exists && button(app, kind).isSelected { button(app, kind).tap() }
    tap(button(app, "Start learning"), "Start learning")
    let field = app.textFields.firstMatch
    if wait(field, 15) { field.tap(); field.typeText("zzz") } else { check(false, "found the answer box") }
    tap(button(app, "Check"), "Check")
    check(wait(button(app, "Explain"), 10), "a checked answer: Explain is offered under the line that says why")
    let asked0 = asked()
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app), 15) && wait(words(app, "Because Answer"), 15), "the explanation opens, with its words")
    let p = explanation(app).frame, box = field.frame, nxt = button(app, "Next question").frame
    check(p.minY >= box.maxY && p.minY >= 0 && p.maxY <= nxt.minY + 1, "under the answer box, in view", "box \(box) panel \(p) next \(nxt)")
    check(asked() == asked0 + 1, "the AI was asked once", "\(asked0) then \(asked())")
    tap(button(app, "Close the explanation"), "Close")
    check(wait(button(app, "Explanation")), "closed: the button says Explanation now (there is one to read)")
    let again = asked()
    tap(button(app, "Explanation"), "Explanation")
    check(wait(explanation(app), 4) && asked() == again, "saved: it shows again, and the AI isn’t asked again")
    // the next question starts with it closed
    tap(button(app, "Next question"), "Next question")
    check(gone(explanation(app)), "the next question starts with the explanation closed")
  }

  private func check(_ ok: Bool, _ name: String, _ extra: String) { check(ok, ok ? name : name + "  → " + extra) }
}
