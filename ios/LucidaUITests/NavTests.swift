// Profile in the tab bar, and Connect AI inside Settings, end to end in the iPhone app, against a copy of the server on this
// Mac with made-up people (the `lc_dev` cookie that the debug-only `-dev <name>` launch argument sets). The same story as the
// web app's own check (nav-ui.mjs), in three flows that each set up their own people (so any one can run alone):
//   1  The tab bar has Library, Discover, Stats and Profile (no Today, no Connect), and the app opens on the Library, lit. The News bell is
//      in Discover's header. Profile opens your own profile and is lit there. The gear opens Settings, whose row says Connect AI (not
//      Connected apps); the row opens the page, which has a back button and no tab bar; Back goes to Settings, and Back again to your profile.
//   2  Someone else's profile lights no tab.
//   3  Everything else that opens Connect AI opens the same page: the Library's empty state (a new account's Connect AI tile) and launching
//      with `-open connect`; Back goes to Settings first.
//
// Run it with ios/tools/e2e-nav.sh (it starts a fresh server on port 3850). It only runs when LUCIDA_NAV is set, so the other
// scripts keep running their own checks alone.
import XCTest

final class NavTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3850"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private let tabs = ["Library", "Discover", "Stats", "Profile"]

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_NAV"] != nil, "Run with ios/tools/e2e-nav.sh")
  }
  override class func tearDown() { print("Nav: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else {
      Self.failed += 1; print("  FAIL " + name); XCTFail(name)
      snap("nav-fail-\(Self.failed)")
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
  private func handle(_ who: String) -> String { (state(who)["profile"] as? [String: Any])?["handle"] as? String ?? "" }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  /// Anything on screen whose label has these words.
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch }
  /// A button whose label starts with these words (a row's label has its value after it).
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  /// The lowest button whose label starts with these words on screen (a pushed page's own, not the page under it).
  private func lowest(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    let all = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).allElementsBoundByIndex
    return all.max { $0.frame.minY < $1.frame.minY } ?? buttonStarting(app, words)
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 10) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  /// The tab bar is on screen, and which tab is lit (nil: none).
  private func lit(_ app: XCUIApplication) -> String? { tabs.first { button(app, $0).exists && button(app, $0).isSelected } }
  private func tabBarShown(_ app: XCUIApplication) -> Bool { tabs.allSatisfy { button(app, $0).exists } }
  /// Waits for the lit tab to be this one ("" : none lit, with the bar showing).
  private func litIs(_ app: XCUIApplication, _ tab: String, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end {
      if tab.isEmpty ? (tabBarShown(app) && lit(app) == nil) : (lit(app) == tab) { return true }
      Thread.sleep(forTimeInterval: 0.25)
    }
    return tab.isEmpty ? (tabBarShown(app) && lit(app) == nil) : (lit(app) == tab)
  }
  /// A person who has been through the welcome, with a deck of their own (so the Library is the full one, not a new account's).
  private func person(_ who: String, _ name: String, deck: String? = "Biology") {
    act(who, "settings.update", ["patch": ["name": name, "welcomed": true]])
    if let deck {
      let id = act(who, "deck.add", ["name": deck])["id"] as? String ?? ""
      act(who, "card.add", ["deckId": id, "kind": "basic", "front": "What is ATP?", "back": "Energy currency"])
    }
  }
  /// The Connect AI page is showing: its title and its link card, a way back, and no tab bar.
  private func connectPage(_ app: XCUIApplication, _ words: String) {
    check(wait(app.staticTexts["Connect AI"]) && wait(app.staticTexts["YOUR MCP LINK"]), words + ": the Connect AI page opens")
    check(button(app, "Back").exists, words + ": it has a back button")
    check(gone(button(app, "Stats")) && !button(app, "Profile").exists, words + ": and no tab bar")
  }

  // ---------- 1: the tab bar, your profile, Settings › Connect AI ----------
  func test1TabBarProfileAndConnectAI() throws {
    let nina = "nin" + run
    person(nina, "Nina Park")
    let app = launch(as: nina)
    check(wait(button(app, "Stats")) && tabBarShown(app), "the tab bar has \(tabs.joined(separator: ", "))")
    check(!button(app, "Connect").exists && !button(app, "Today").exists, "and no Connect, and no Today")
    check(litIs(app, "Library"), "the app opens on the Library, lit")
    check(!button(app, "News").exists, "the Library has no bell")
    tap(button(app, "Discover"), "the Discover tab")
    check(litIs(app, "Discover") && wait(button(app, "News")), "the News bell is in Discover's header")
    tap(button(app, "News"), "the bell")
    check(wait(app.staticTexts["News"]) && button(app, "Back").exists, "it opens News")
    tap(button(app, "Back"), "Back")
    check(litIs(app, "Discover") && wait(button(app, "News")), "and Back is Discover again")
    // Profile: your own page, lit.
    tap(button(app, "Profile"), "the Profile tab")
    check(wait(button(app, "Edit profile")) && wait(button(app, "Share profile")), "Profile opens your own profile (Edit profile, Share profile)")
    let mine = handle(nina)
    check(!mine.isEmpty && wait(app.staticTexts["@" + mine]), "it says your handle (@\(mine))")
    check(litIs(app, "Profile"), "and the Profile tab is lit")
    check(button(app, "Settings").exists && !button(app, "Back").exists, "with the gear for Settings, and no back button (it's a tab)")
    // The Library has no picture; the tab is the way to your profile.
    tap(button(app, "Library"), "the Library tab")
    check(litIs(app, "Library") && wait(button(app, "Add")), "the Library is lit again")
    check(!button(app, "Your profile").exists, "and has no profile picture")
    tap(button(app, "Profile"), "the Profile tab")
    check(wait(button(app, "Edit profile")) && litIs(app, "Profile"), "the Profile tab opens your profile, with Profile lit")
    // Settings › Connect AI.
    tap(button(app, "Settings"), "the gear")
    check(wait(app.staticTexts["Settings"]) && wait(buttonStarting(app, "Connect AI")), "the gear opens Settings, whose row says Connect AI")
    check(!buttonStarting(app, "Connected apps").exists, "and not Connected apps")
    check(!button(app, "Stats").exists, "Settings has no tab bar")
    tap(buttonStarting(app, "Connect AI"), "the Connect AI row")
    connectPage(app, "Settings › Connect AI")
    tap(button(app, "Back"), "Back")
    check(wait(app.staticTexts["Settings"]) && wait(buttonStarting(app, "Connect AI")), "Back goes to Settings")
    tap(button(app, "Back"), "Back")
    check(wait(button(app, "Edit profile")) && litIs(app, "Profile"), "and Back again goes to your profile, with Profile lit")
    // Settings' View profile and Edit profile rows go to the tab, not to a second copy of your profile.
    tap(button(app, "Settings"), "the gear")
    tap(buttonStarting(app, "@" + mine), "the profile row")
    check(wait(button(app, "Edit profile")) && litIs(app, "Profile") && gone(app.staticTexts["Settings"]), "Settings › View profile goes back to the Profile tab")
    tap(button(app, "Settings"), "the gear")
    check(wait(app.staticTexts["Settings"]), "the gear opens Settings again")
    tap(lowest(app, "Edit profile"), "Edit profile in Settings")
    check(wait(button(app, "Cancel")), "Settings › Edit profile opens the editor over your profile")
  }

  // ---------- 2: someone else's profile lights no tab ----------
  func test2SomeoneElsesProfileLightsNoTab() throws {
    let maria = "mar" + run, bob = "bob" + run
    person(maria, "Maria Santos", deck: nil)
    let deckId = act(maria, "deck.add", ["name": "MCAT Biochemistry", "tags": ["MCAT"]])["id"] as? String ?? ""
    act(maria, "card.add", ["deckId": deckId, "kind": "basic", "front": "What does ATP synthase make?", "back": "ATP"])
    social(maria, "deck.share", ["deckId": deckId, "visibility": "public", "description": "Every enzyme the exam asks."])
    person(bob, "Bob Stone")
    let app = launch(as: bob)
    tap(button(app, "Discover"), "the Discover tab")
    check(litIs(app, "Discover"), "Discover is lit on Discover")
    tap(button(app, "Maria Santos"), "Maria's name under her deck")
    check(wait(button(app, "Follow")) && wait(app.staticTexts["@" + handle(maria)]), "her profile opens")
    check(litIs(app, ""), "someone else's profile lights no tab")
    check(button(app, "Back").exists, "and has a back button")
    tap(button(app, "Back"), "Back")
    check(litIs(app, "Discover"), "Back is on Discover again")
    tap(button(app, "Profile"), "the Profile tab")
    check(wait(button(app, "Edit profile")) && litIs(app, "Profile"), "Profile is your own, and lit")
  }

  // ---------- 3: everything else that opens Connect AI ----------
  func test3OtherWaysToConnectAI() throws {
    let cleo = "cle" + run, eve = "eve" + run
    person(cleo, "Cleo Ruiz", deck: nil)
    person(eve, "Eve Lin")
    // The Library's empty state.
    var app = launch(as: cleo)
    check(litIs(app, "Library"), "a new account opens on the Library")
    tap(buttonStarting(app, "Connect AI"), "the Library's Connect AI tile")
    connectPage(app, "the Library's Connect AI")
    tap(button(app, "Back"), "Back")
    check(wait(app.staticTexts["Settings"]) && wait(buttonStarting(app, "Connect AI")), "Back goes to Settings first")
    tap(button(app, "Back"), "Back")
    check(wait(buttonStarting(app, "Connect AI")) && litIs(app, "Library"), "and then to the Library, where you were")
    app.terminate()
    // Launching straight to the page (debug only): Settings › Connect AI.
    app = launch(as: eve, ["-open", "connect"])
    connectPage(app, "-open connect")
    tap(button(app, "Back"), "Back")
    check(wait(app.staticTexts["Settings"]) && wait(buttonStarting(app, "Connect AI")), "-open connect: Back is Settings")
  }
}
