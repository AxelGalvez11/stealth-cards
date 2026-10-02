// Settings › Studying › Daily reminder, end to end in the iPhone app (Data/Reminder.swift): a notice a day at the time you pick, saying
// "Time to review your cards", scheduled by the phone itself. The app is started with `-reminderAudit` (debug builds), which puts what the
// phone has scheduled in an invisible element for the test to read. Each flow needs a phone that has never been asked about notices, so
// ios/tools/e2e-reminder.sh takes the app off the simulator before each one.
//   1  Allowed: the row starts Off and the app opens without asking; picking a time asks to send notices (then, not before) and sets one
//      notice at that time; another time sets it again (still one notice, no second question); it is still there after the app is opened
//      again; opening it with no network (which shows the sign-in screen) leaves it; Off removes it, and a time sets it again without asking;
//      signing out removes it.
//   2  Refused: saying no leaves the row Off with one line on how to allow notices in iPhone Settings, nothing scheduled and no time saved;
//      picking again doesn't ask again.
//   3  The notice itself (one set to come a few seconds after launch, `-reminderIn`), tapped on the home screen: the app comes back on the
//      Library (it opened Today until there was no Today), with its top and what's due, though it was on Stats.
// Run it with ios/tools/e2e-reminder.sh (it starts a fresh server). It only runs when LUCIDA_REMINDER is set.
import XCTest

final class ReminderTests: AppCase {
  override class var label: String { "Reminder" }
  override class var switchName: String { "LUCIDA_REMINDER" }
  private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
  private let line = "Allow notifications for Lucida in iPhone Settings."
  private let words = "Time to review your cards"

  /// The phone's question about sending notices, if it comes up: its button ("Allow" or "Don’t Allow").
  private func question(_ button: String, within seconds: TimeInterval = 20) -> XCUIElement? {
    let alert = springboard.alerts.firstMatch
    guard alert.waitForExistence(timeout: seconds) else { return nil }
    return alert.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", button)).firstMatch
  }
  private func asked() -> Bool { springboard.alerts.count > 0 }
  private func row(_ app: XCUIApplication) -> XCUIElement { buttonStarting(app, "Daily reminder") }
  /// What the app says is scheduled (the invisible element), "none" or a line for each notice.
  private func audit(_ app: XCUIApplication) -> String {
    (app.descendants(matching: .any).matching(identifier: "reminderAudit").firstMatch.value as? String) ?? "?"
  }
  private func auditHas(_ app: XCUIApplication, _ text: String) -> Bool { eventually(15) { audit(app).contains(text) } }
  private func rowSays(_ app: XCUIApplication, _ text: String) -> Bool { eventually(15) { row(app).exists && row(app).label.contains(text) } }
  /// Opens the row's list and picks one. A tap that lands while the screen is still moving is lost (the list stays open, or the row never
  /// changes), so after each tap it looks, and tries again. `takes: false` is for picks that aren't meant to change the row, or that bring up
  /// the phone's question, which the test answers itself.
  private func pick(_ app: XCUIApplication, _ option: String, takes: Bool = true) {
    for _ in 0..<4 {
      if !app.buttons[option].exists {
        scrollTo(app, row(app))
        if wait(row(app), 10) { row(app).tap() }
      }
      let item = app.buttons[option]
      guard item.waitForExistence(timeout: 4) else { continue }
      item.tap()
      // The list closes when a pick lands (or the phone's question comes up over it).
      if eventually(5, { !app.buttons[option].exists || asked() }) {
        if !takes || asked() { return }
        if eventually(6, { row(app).exists && row(app).label.contains(option) }) { return }
      }
    }
    check(false, "found “\(option)” in the Daily reminder list")
  }
  private func savedTime(_ who: String) -> String { (state(who)["settings"] as? [String: Any])?["reminder"] as? String ?? "" }

  // ---------- 1: allowed ----------
  func test1Allowed() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "rema" + run
    name(who, "Remy Fox")
    var app = launch(as: who, ["-open", "settings", "-reminderAudit"])
    scrollTo(app, row(app))
    check(wait(row(app)) && row(app).label.contains("Off"), "Daily reminder starts Off")
    check(!asked(), "the app opened without asking about notices")
    check(audit(app) == "none", "and nothing is scheduled")
    check(!any(app, line).exists, "and there's no line about allowing them")
    pick(app, "8:00 AM", takes: false)
    guard let allow = question("Allow") else { check(false, "picking a time asks the phone to send notices"); return }
    check(true, "picking a time asks to send notices then")
    allow.tap()
    check(rowSays(app, "8:00 AM"), "the row says 8:00 AM")
    check(auditHas(app, "daily 8:00 AM every day “\(words)”") && !audit(app).contains(";"), "one notice is scheduled: every day at 8:00 AM, saying “\(words)”")
    check(eventually { savedTime(who) == "8:00 AM" }, "the time is kept with the settings")
    pick(app, "6:00 PM")
    check(rowSays(app, "6:00 PM") && !asked(), "another time sets it again, without asking again")
    check(auditHas(app, "daily 6:00 PM every day “\(words)”") && !audit(app).contains("8:00 AM") && !audit(app).contains(";"), "still one notice, now at 6:00 PM")
    check(eventually { savedTime(who) == "6:00 PM" }, "and the new time is kept")
    app.terminate()
    app = launch(as: who, ["-open", "settings", "-reminderAudit"])
    scrollTo(app, row(app))
    check(rowSays(app, "6:00 PM") && !asked(), "opened again: still 6:00 PM, and no question")
    pick(app, "Off")
    check(rowSays(app, "Off") && auditHas(app, "none"), "Off removes it")
    check(eventually { savedTime(who) == "6:00 PM" }, "(the time stays as it was for next time)")
    pick(app, "12:00 PM")
    check(rowSays(app, "12:00 PM") && !asked(), "a time turns it on again, without asking")
    check(auditHas(app, "daily 12:00 PM every day “\(words)”"), "one notice, at 12:00 PM")
    // Opening the app with no network shows the sign-in screen, but that isn't signing out: the reminder stays.
    app.terminate()
    app = launch(as: who, ["-reminderAudit"], server: "http://127.0.0.1:1")
    check(wait(text(app, "Sign in to Lucida"), 30), "opened with no network, the app shows the sign-in screen")
    check(auditHas(app, "daily 12:00 PM every day “\(words)”"), "and the reminder is still there (that isn’t signing out)")
    app.terminate()
    app = launch(as: who, ["-open", "settings", "-reminderAudit"])
    scrollTo(app, row(app))
    check(rowSays(app, "12:00 PM"), "back on the network, the row still says 12:00 PM")
    // Signing out leaves nothing of theirs to go off on this phone.
    let account = buttonStarting(app, "Your account")
    for _ in 0..<8 where !(account.exists && account.isHittable) { app.swipeDown(velocity: .fast) }
    tap(account, "Your account")
    check(wait(any(app, "Sign out of Lucida?")) && app.alerts.count == 0 && app.sheets.count == 0, "Sign out asks in Lucida’s own question")
    tap(app.buttons["question.go"], "Sign out")
    check(wait(text(app, "Sign in to Lucida"), 20), "signing out goes to the sign-in screen")
    check(auditHas(app, "none"), "and takes the reminder off the phone")
  }

  // ---------- 2: refused ----------
  func test2Refused() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "remb" + run
    name(who, "Remi Fox")
    let before = savedTime(who)
    let app = launch(as: who, ["-open", "settings", "-reminderAudit"])
    scrollTo(app, row(app))
    check(wait(row(app)) && row(app).label.contains("Off") && !asked(), "Daily reminder starts Off, and nothing was asked")
    check(!any(app, line).exists, "with no line under it")
    pick(app, "9:00 AM", takes: false)
    guard let no = question("Don") else { check(false, "picking a time asks the phone to send notices"); return }
    no.tap()
    check(rowSays(app, "Off"), "no: the row stays Off")
    check(wait(any(app, line), 15), "and says how to allow notices: “\(line)”")
    check(audit(app) == "none", "nothing is scheduled")
    check(savedTime(who) == before, "and no time is saved")
    pick(app, "7:00 AM", takes: false)
    Thread.sleep(forTimeInterval: 1.5)
    check(!asked() && rowSays(app, "Off") && any(app, line).exists && audit(app) == "none", "picking again doesn’t ask again: still Off, with the line, and nothing scheduled")
  }

  // ---------- 3: the notice opens the Library ----------
  func test3NoticeOpensTheLibrary() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "remc" + run
    name(who, "Remo Fox")
    let deck = act(who, "deck.add", ["name": "Bones", "fsrs": false])["id"] as? String ?? ""
    act(who, "card.add", ["deckId": deck, "kind": "basic", "front": "Longest bone?", "back": "Femur"])
    let app = launch(as: who, ["-open", "stats", "-reminderIn", "8"])
    if let allow = question("Allow", within: 12) { allow.tap() }
    check(wait(app.buttons["Stats"]) && eventually(5) { app.buttons["Stats"].isSelected }, "the app is on Stats")
    XCUIDevice.shared.press(.home)
    // The notice comes a few seconds later, as a banner over the home screen.
    let banner = springboard.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
    check(banner.waitForExistence(timeout: 40), "the notice comes: “\(words)”")
    banner.tap()
    check(app.wait(for: .runningForeground, timeout: 15), "tapping it opens the app")
    check(eventually(10) { app.buttons["Library"].isSelected }, "on the Library")
    check(wait(any(app, "What do you want to study?")) && wait(any(app, "1 card due")), "its top, with what’s due")
  }
}
