// Themes (Pro) end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie,
// which the debug-only `-dev <name>` launch argument sets). A Pro person opens Settings › Theme, sees Lucida and the 14 themes
// drawn, picks Frutiger Aero on its page, and sees the theme's pictures everywhere it draws them: their profile picture, the
// Library's covers and folder, the deck page's header, New deck's preview, flashcards' background and card, Learn mode's
// background and question; then a dark theme (Terminal) turns the study screen's buttons dark, and going back to Lucida
// draws nothing of a theme. A Free person sees the Theme row with Pro, the picker's upgrade, a theme's page with Go Pro,
// and the server turns a theme down; and a person whose Pro lapsed (their library still has a theme) never draws it.
//
// The app tells the test which themes' pictures are on screen through an invisible element (ThemeAudit, debug builds only);
// a few colors are read off the screen too, so a picture that's drawn is also a picture that's there.
// Run it with ios/tools/e2e-themes.sh (it starts a fresh server, and makes the person whose Pro lapsed).
import XCTest

final class ThemesTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3688"
  private var passed = 0, failed = 0
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private var pro: String { "thm" + run }
  private var free: String { "freethm" + run }
  /// Made by e2e-themes.sh: on the Free plan, with Frutiger Aero in their library from when they had Pro.
  private let lapsed = "freelapse"
  private let themes = ["Lucida", "Rubber hose", "Liquid chrome", "Frutiger Aero", "Liminal hall", "Liminal room", "Dreamcore", "Vapor pool", "Vapor dolphins",
                        "Terminal", "Zine collage", "Frosted glass", "Topographic", "Risograph", "Swiss poster"]
  private let keys = ["hose", "chrome", "aero", "liminal", "liminalroom", "dreamcore", "vaporwave", "vapordolphins", "terminal", "zine", "glass", "topo", "riso", "swiss"]

  override func setUp() { continueAfterFailure = true }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name); XCTFail(name) }
  }
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
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> (status: Int, result: [String: Any], error: String) {
    var b = o; b["type"] = type
    let r = api(who, "POST", "/api/action", b)
    let j = r.json as? [String: Any]
    return (r.status, j?["result"] as? [String: Any] ?? [:], j?["error"] as? String ?? "")
  }
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  private func setting(_ who: String, _ k: String) -> Any? { (state(who)["settings"] as? [String: Any])?[k] }
  /// Waits (up to `secs`) for a setting to be what it should.
  private func settingIs(_ who: String, _ k: String, _ v: String, _ secs: Double = 8) -> Bool {
    let end = Date().addingTimeInterval(secs)
    while Date() < end { if setting(who, k) as? String == v { return true }; Thread.sleep(forTimeInterval: 0.3) }
    return setting(who, k) as? String == v
  }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool { e.waitForExistence(timeout: s) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }

  /// Taps a deck in the Library by its name (its row is one button whose label starts with it); says what's there if it isn't.
  private func openDeck(_ app: XCUIApplication, _ name: String) -> Bool {
    let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
    if wait(row, 10) { row.tap(); return true }
    print("  … no deck \(name); buttons: \(app.buttons.allElementsBoundByIndex.map(\.label).prefix(30))")
    return false
  }

  // What the app says it's drawing (ThemeAudit): "bg=aero;face=aero;…".
  private func audit(_ app: XCUIApplication) -> String { app.otherElements["themeAudit"].firstMatch.value as? String ?? "" }
  /// Waits for the app to be drawing this ("bg=aero"); false if it isn't within `secs`.
  private func drawing(_ app: XCUIApplication, _ what: String, _ secs: Double = 25) -> Bool {
    let end = Date().addingTimeInterval(secs)
    while Date() < end { if audit(app).split(separator: ";").contains(Substring(what)) { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return audit(app).split(separator: ";").contains(Substring(what))
  }
  /// Waits for nothing of this kind ("bg=") to be drawn (a moment after leaving a theme).
  private func notDrawing(_ app: XCUIApplication, _ prefix: String, _ secs: Double = 8) -> Bool {
    let end = Date().addingTimeInterval(secs)
    while Date() < end { if !audit(app).split(separator: ";").contains(where: { $0.hasPrefix(prefix) }) { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return !audit(app).split(separator: ";").contains(where: { $0.hasPrefix(prefix) })
  }
  /// The color at a point of the screen (in points), as 0 to 255.
  private func color(at p: CGPoint) -> (r: Int, g: Int, b: Int) {
    let img = XCUIScreen.main.screenshot().image, s = img.scale
    guard let cg = img.cgImage?.cropping(to: CGRect(x: p.x * s, y: p.y * s, width: 1, height: 1)) else { return (0, 0, 0) }
    var px = [UInt8](repeating: 0, count: 4)
    let ctx = CGContext(data: &px, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: 1, height: 1))
    return (Int(px[0]), Int(px[1]), Int(px[2]))
  }
  /// The screen's left margin, beside a flashcard, where the study background shows (Review and Learn).
  private func margin(_ y: CGFloat = 300) -> (r: Int, g: Int, b: Int) { color(at: CGPoint(x: 6, y: y)) }

  /// A library to try themes on: two decks with a few cards, and a folder with a third.
  private func makeLibrary(_ who: String) -> String {
    act(who, "settings.update", ["patch": ["name": "Alex Kim", "welcomed": true]])
    let bio = act(who, "deck.add", ["name": "Cell Biology", "tags": ["Biology"]]).result["id"] as? String ?? ""
    act(who, "card.add", ["deckId": bio, "kind": "basic", "front": "What does the electron transport chain pump across the inner membrane?", "back": "Protons (H⁺), from the matrix into the intermembrane space."])
    act(who, "card.add", ["deckId": bio, "kind": "basic", "front": "Where does glycolysis happen?", "back": "In the cytoplasm"])
    act(who, "card.add", ["deckId": bio, "kind": "basic", "front": "Which organelle packages proteins for secretion?", "back": "The Golgi apparatus"])
    act(who, "card.add", ["deckId": bio, "kind": "cloze", "text": "The [[mitochondrion]] is the powerhouse of the cell."])
    let es = act(who, "deck.add", ["name": "Spanish Verbs", "tags": ["Languages"]]).result["id"] as? String ?? ""
    for (f, b) in [("tener", "to have"), ("ser", "to be"), ("ir", "to go")] { act(who, "card.add", ["deckId": es, "kind": "basic", "front": f, "back": b]) }
    let oc = act(who, "deck.add", ["name": "Organic Chemistry", "tags": ["Chemistry"]]).result["id"] as? String ?? ""
    for (f, b) in [("What is benzene’s formula?", "C₆H₆"), ("What is an alkene?", "A hydrocarbon with a C=C bond")] { act(who, "card.add", ["deckId": oc, "kind": "basic", "front": f, "back": b]) }
    let folder = act(who, "folder.add", ["name": "Science"]).result["id"] as? String ?? ""
    act(who, "deck.update", ["id": oc, "patch": ["folder": folder]])
    return bio
  }

  /// Today → your picture → Settings.
  private func openSettings(_ app: XCUIApplication) -> Bool {
    guard wait(button(app, "Your profile"), 15) else { return false }
    button(app, "Your profile").tap()
    guard wait(button(app, "Settings")) else { return false }
    button(app, "Settings").tap()
    return wait(app.staticTexts["Settings"])
  }
  /// Settings' Theme row (its label starts with Theme, and has the name of your theme, and Pro on Free).
  private func themeRow(_ app: XCUIApplication) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Theme' AND label != 'Theme'")).firstMatch }
  /// The last button with this label that a finger can reach (on the page in front, not one under it).
  private func front(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex.last { $0.isHittable } ?? app.buttons[label].firstMatch
  }

  // ---------- the test ----------
  func testThemes() throws {
    print("Themes, people: \(pro), \(free), \(lapsed)")
    let bio = makeLibrary(pro)
    _ = makeLibrary(free)
    check(!bio.isEmpty && setting(pro, "theme") as? String == "lucida", "a new library starts on Lucida")

    // ---------- the picker: Lucida and 14 themes, drawn ----------
    var app = launch(as: pro)
    check(openSettings(app), "Today's picture opens the profile, whose gear opens Settings")
    let row = themeRow(app)
    check(wait(row) && row.label.contains("Lucida") && !row.label.contains("Pro"), "Settings › Look shows Theme · Lucida (no Pro badge)")
    check(app.staticTexts["With the Lucida theme"].exists == false, "Card gradients says nothing about themes yet")
    row.tap()
    check(wait(app.staticTexts["Theme"]) && wait(any(app, "Changes your deck covers, flashcards, study")), "the Theme row opens Settings › Theme")
    for name in themes { check(button(app, name).exists, "the picker has \(name)") }
    check(button(app, "Lucida").isSelected, "Lucida is ticked")
    check(!app.staticTexts["Themes are part of Pro"].exists && wait(app.staticTexts["Show my theme on my profile"]), "on Pro it offers to show your theme on your profile, not an upgrade")
    var all = true
    for k in keys where !drawing(app, "tile=" + k, 60) { all = false; print("  … tile \(k) isn't drawn") }
    check(all, "every theme's tile is drawn")

    // ---------- a theme's page, and Use this theme ----------
    button(app, "Frutiger Aero").tap()
    check(wait(app.staticTexts["Frutiger Aero"]) && wait(button(app, "Use this theme")), "a tile opens its theme's page, with Use this theme")
    check(drawing(app, "page-scene=aero") && drawing(app, "page-pagecover=aero") && drawing(app, "page-card=aero") && drawing(app, "page-avatar=aero"),
          "the page draws its background with a card, covers, both sides of the card, and pictures")
    button(app, "Use this theme").tap()
    check(wait(app.staticTexts["In use"]), "Use this theme becomes In use")
    check(settingIs(pro, "theme", "aero"), "the server has the theme saved")
    front(app, "Theme").tap()
    check(wait(app.staticTexts["Show my theme on my profile"]) && button(app, "Frutiger Aero").isSelected && !button(app, "Lucida").isSelected, "back on the picker, Frutiger Aero is ticked")
    front(app, "Back").tap()
    let row2 = themeRow(app)
    check(wait(row2) && row2.label.contains("Frutiger Aero"), "Settings shows Theme · Frutiger Aero")
    check(wait(app.staticTexts["With the Lucida theme"]), "and Card gradients says it's for Lucida's own look")
    check(wait(button(app, "Theme")), "Profile picture's third choice reads Theme")
    check(drawing(app, "avatar=aero"), "your picture on Settings is the theme's")

    // ---------- your picture on Today, the Library, the deck page ----------
    front(app, "Back").tap()
    check(wait(button(app, "Today")), "Settings goes back to the profile")
    button(app, "Today").tap()
    check(drawing(app, "avatar=aero"), "Today's picture is the theme's")
    button(app, "Library").tap()
    check(drawing(app, "thumb=aero"), "the Library's covers are the theme's")
    check(drawing(app, "swatch=aero"), "and so is its folder's fan")
    check(openDeck(app, "Spanish Verbs"), "the Library lists the decks")
    check(wait(button(app, "Deck settings")) && drawing(app, "head=aero"), "a deck page's header is the theme's cover")
    button(app, "Deck settings").tap()
    check(wait(app.staticTexts["Header"]) && drawing(app, "head=aero"), "Deck settings shows the header the theme draws")
    button(app, "Done").tap()
    check(gone(app.staticTexts["Header"]), "Done closes Deck settings")
    Thread.sleep(forTimeInterval: 0.8)   // (the sheet is still sliding away, and a tap goes to it)

    // ---------- flashcards: the background, the card, and grading ----------
    front(app, "Back").tap()
    check(wait(button(app, "New deck")), "back on the Library")
    check(openDeck(app, "Cell Biology"), "Cell Biology opens")
    let study = buttonStarting(app, "Flashcards")
    check(wait(study), "Cell Biology has Flashcards")
    study.tap()
    check(wait(button(app, "Flip card"), 12), "flashcards open")
    check(drawing(app, "bg=aero") && drawing(app, "face=aero"), "the study background and the card are the theme's")
    Thread.sleep(forTimeInterval: 1.0)
    let sky = margin(300)
    check(sky.b > sky.r + 40 && sky.b > 150, "the background beside the card is Frutiger Aero's sky (rgb \(sky))")
    // (a finger on the empty top of the card turns it: the theme's card is a picture behind the words, and the whole card is the button)
    button(app, "Flip card").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)).tap()
    let good = buttonStarting(app, "Good")
    if !wait(good) { print("  … buttons: \(app.buttons.allElementsBoundByIndex.map(\.label).prefix(30))") }
    check(good.exists, "turning the card over (a tap on its empty top) shows the grades")
    buttonStarting(app, "Good").tap()
    check(wait(button(app, "Flip card")), "grading brings the next card")
    check(drawing(app, "bg=aero") && drawing(app, "face=aero"), "the theme stays on the next card")
    button(app, "End review").tap()
    check(wait(button(app, "Learn")), "X goes back to the deck's page")

    // ---------- Learn mode ----------
    button(app, "Learn").tap()
    let start = button(app, "Start learning")
    check(wait(start), "Learn opens its start sheet")
    start.tap()
    check(wait(button(app, "Stop for now"), 12), "Learn mode starts")
    check(drawing(app, "bg=aero"), "Learn's background is the theme's")
    check(drawing(app, "face=aero", 30), "and its question sits on the theme's card")
    button(app, "Stop for now").tap()
    check(wait(button(app, "Learn")), "stopping goes back to the deck's page")

    // ---------- New deck ----------
    button(app, "Back").tap()
    check(wait(button(app, "New deck")), "the Library has New deck")
    button(app, "New deck").tap()
    check(wait(app.staticTexts["New deck"]) && drawing(app, "newcover=aero"), "New deck's preview is the theme's cover")
    button(app, "Cancel").tap()

    // ---------- a dark theme turns the study screen's buttons dark ----------
    act(pro, "settings.update", ["patch": ["theme": "terminal"]])
    app = launch(as: pro, ["-open", "review"])
    check(wait(button(app, "Flip card"), 20) && drawing(app, "bg=terminal") && drawing(app, "face=terminal"), "Terminal draws its background and card")
    Thread.sleep(forTimeInterval: 1.0)
    let night = margin(300)
    check(night.r < 60 && night.g < 60 && night.b < 70, "Terminal's background is dark (rgb \(night))")
    let close = color(at: CGPoint(x: 24, y: 82))   // (inside the round button, beside the X)
    check(close.r < 60 && close.g < 60 && close.b < 60, "on a dark theme the End review button is dark (rgb \(close))")

    // ---------- back to Lucida: nothing is drawn by a theme ----------
    act(pro, "settings.update", ["patch": ["theme": "aero"]])
    app = launch(as: pro)
    check(openSettings(app), "Settings again")
    themeRow(app).tap()
    check(wait(button(app, "Lucida")), "Settings › Theme again")
    button(app, "Lucida").tap()
    check(wait(app.staticTexts["Lucida"]) && wait(button(app, "Use this theme")), "Lucida's page has Use this theme")
    button(app, "Use this theme").tap()
    check(wait(app.staticTexts["In use"]) && settingIs(pro, "theme", "lucida"), "Lucida's page switches back")
    front(app, "Theme").tap(); front(app, "Back").tap(); front(app, "Back").tap()
    button(app, "Library").tap()
    check(wait(any(app, "Spanish Verbs")), "the Library is back")
    check(notDrawing(app, "thumb=") && notDrawing(app, "swatch=") && notDrawing(app, "avatar="), "with Lucida nothing is drawn by a theme")

    // ---------- Free: the Theme row says Pro, the picker upgrades, and no theme can be picked ----------
    app = launch(as: free)
    check(openSettings(app), "a Free person opens Settings")
    let frow = themeRow(app)
    check(wait(frow) && frow.label.contains("Pro") && frow.label.contains("Lucida"), "the Theme row has the Pro badge and says Lucida")
    frow.tap()
    check(wait(app.staticTexts["Themes are part of Pro"]) && button(app, "Go Pro").exists, "the picker shows Themes are part of Pro, with Go Pro")
    check(!app.staticTexts["Show my theme on my profile"].exists, "and doesn't offer the profile switch")
    check(button(app, "Lucida").isSelected, "Lucida is the one ticked")
    button(app, "Frutiger Aero").tap()
    check(wait(app.staticTexts["Frutiger Aero"]) && wait(button(app, "Go Pro")) && !button(app, "Use this theme").exists, "a theme's page on Free has Go Pro, not Use this theme")
    let turned = act(free, "settings.update", ["patch": ["theme": "aero"]])
    check(turned.status >= 400 && turned.error.contains("Pro") && setting(free, "theme") as? String == "lucida", "the server turns a theme down on Free (\(turned.error))")

    // ---------- Free after Pro: the library still says Frutiger Aero, and nothing is drawn ----------
    check(setting(lapsed, "theme") as? String == "aero", "a person whose Pro lapsed still has Frutiger Aero in their library")
    app = launch(as: lapsed, ["-open", "review"])
    check(wait(button(app, "Flip card"), 20), "their flashcards open")
    Thread.sleep(forTimeInterval: 3)
    check(notDrawing(app, "bg=", 4) && notDrawing(app, "face=", 4), "and don't draw the theme")
    let plain = margin(300)
    check(!(plain.b > plain.r + 40 && plain.b > 150), "the background is Lucida's own, not the sky (rgb \(plain))")
    button(app, "End review").tap()
    check(wait(button(app, "Library")), "back on the deck")
    button(app, "Library").tap()
    check(wait(app.staticTexts["Library"]) && notDrawing(app, "thumb=", 4) && notDrawing(app, "avatar=", 4), "the Library and Today's picture are Lucida's own")

    print("Themes: \(passed) passed, \(failed) failed")
    XCTAssertEqual(failed, 0)
  }
}
