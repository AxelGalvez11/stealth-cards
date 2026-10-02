// Settings › Studying › Flip animation, end to end in the iPhone app: a switch in Settings, on by default, that turns the flashcard's flip
// off (the other side just appears). It is kept with the person's other study settings on the server, so the web app and every other
// phone follow the same choice. The app is started with `-flipAudit` (debug builds), which puts what the card does in an invisible element
// named flipAudit: "turns" (the 3D turn) or "appears" (no turn).
//   1  The switch: Settings has "Flip animation" in Studying, On to start with; pressing it turns it Off and the server keeps it; in Review
//      the card now just shows its other side ("appears"), and still reads Flip card, then Flip back; opened again, the switch still says Off.
//   2  Another device: the choice made on the web (Off, then On) is what this phone shows, in Settings and in Review.
//   3  Settings' sections: the list is grouped into the same seven sections as the web's Settings page, in the same order (Account, Plan,
//      Studying, Appearance, Connect AI, Privacy, Help & legal), each with its rows.
//   4  Review settings (the owner, 2026-10-02: "add a way for user to toggle flaschard flip animation on or off"): the review's own sheet
//      has the same switch, On to start with; Off there saves it, the card's other side then just appears, and Settings says Off too;
//      On again from the sheet, the card turns.
// Run it with ios/tools/e2e-flip.sh (it starts a fresh server). It only runs when LUCIDA_FLIP is set.
import XCTest

final class FlipTests: AppCase {
  override class var label: String { "Flip" }
  override class var switchName: String { "LUCIDA_FLIP" }

  private func row(_ app: XCUIApplication) -> XCUIElement { button(app, "Flip animation") }
  private func rowValue(_ app: XCUIApplication) -> String { (row(app).value as? String) ?? "?" }
  /// What the card does, from the invisible element (only there once a card is on screen).
  private func audit(_ app: XCUIApplication) -> String {
    (app.descendants(matching: .any).matching(identifier: "flipAudit").firstMatch.value as? String) ?? "?"
  }
  private func saved(_ who: String) -> Bool? { (state(who)["settings"] as? [String: Any])?["flip"] as? Bool }
  private func makeDeck(_ who: String) {
    let deck = act(who, "deck.add", ["name": "Cell Biology"])["id"] as? String ?? ""
    for i in 1...3 { act(who, "card.add", ["deckId": deck, "kind": "basic", "front": "What does the electron transport chain pump? \(i)", "back": "Protons \(i)"]) }
  }
  /// Opens Settings, finds the row, and says what its switch says.
  private func settings(_ who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = launch(as: who, ["-open", "settings"] + extra)
    scrollTo(app, row(app))
    return app
  }
  /// Opens Review and taps the card; the audit says how it was drawn.
  private func review(_ who: String) -> (app: XCUIApplication, mode: String) {
    let app = launch(as: who, ["-open", "review", "-flipAudit"])
    _ = wait(button(app, "Flip card"), 30)
    let mode = eventually(10) { audit(app) != "?" } ? audit(app) : "?"
    return (app, mode)
  }

  // ---------- 1: the switch ----------
  func test1Switch() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "flipa" + run
    name(who, "Flip Fox")
    makeDeck(who)
    check(saved(who) == true, "a new library has Flip animation on")
    var app = settings(who)
    check(wait(row(app)), "Settings has a Flip animation switch")
    check(rowValue(app) == "On", "it starts On")
    tap(row(app), "Flip animation")
    check(eventually(5) { rowValue(app) == "Off" }, "pressing it turns it Off at once")
    check(eventually { saved(who) == false }, "and the server keeps it with the other study settings")
    snap("iphone-settings-flip-off")
    app.terminate()
    var r = review(who)
    check(wait(button(r.app, "Flip card")), "Review opens on a card")
    check(r.mode == "appears", "with it Off, the card’s other side just appears (no turn)")
    snap("iphone-review-flip-off-front")
    tap(button(r.app, "Flip card"), "the card")
    check(wait(button(r.app, "Flip back")) && any(r.app, "Protons").exists, "pressing the card shows the answer, and the button now says Flip back")
    snap("iphone-review-flip-off-back")
    check(audit(r.app) == "appears", "still no turn")
    tap(button(r.app, "Flip back"), "the card")
    check(wait(button(r.app, "Flip card")), "and pressing it again shows the question")
    r.app.terminate()
    app = settings(who)
    check(wait(row(app)) && rowValue(app) == "Off", "opened again, the switch still says Off")
    tap(row(app), "Flip animation")
    check(eventually(5) { rowValue(app) == "On" } && eventually { saved(who) == true }, "pressing it again turns it On and saves")
    app.terminate()
    r = review(who)
    check(r.mode == "turns", "On again, the card turns over")
    r.app.terminate()
  }

  // ---------- 3: Settings' sections ----------
  func test3Sections() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "flipc" + run
    name(who, "Flip Wren")
    let app = launch(as: who, ["-open", "settings"])
    let titles = ["ACCOUNT", "PLAN", "STUDYING", "APPEARANCE", "CONNECT AI", "PRIVACY", "HELP & LEGAL"]
    let rows: [String: [String]] = ["ACCOUNT": ["Edit profile", "Password", "Delete account"], "PLAN": [], "STUDYING": ["Daily reminder", "New cards a day", "Flip animation"],
                                    "APPEARANCE": ["Theme"], "CONNECT AI": ["Connect AI", "Check AI cards first", "Cards to check"], "PRIVACY": ["Blocked people"], "HELP & LEGAL": ["Help", "Terms of Service", "Privacy Policy"]]
    check(wait(text(app, "ACCOUNT"), 30), "Settings opens on its first section, ACCOUNT")
    // Scroll down the list, noting each section's name the first time it is on screen (top to bottom within a screen).
    var seen: [String] = [], found: [String: [String]] = [:]
    for _ in 0..<14 {
      let here = titles.filter { !seen.contains($0) && text(app, $0).exists && text(app, $0).isHittable }.sorted { text(app, $0).frame.minY < text(app, $1).frame.minY }
      seen += here
      for t in titles { for r in rows[t] ?? [] where found[t]?.contains(r) != true && any(app, r).exists && any(app, r).isHittable { found[t, default: []].append(r) } }
      if seen.count == titles.count && titles.allSatisfy({ (found[$0] ?? []).count == (rows[$0] ?? []).count }) { break }
      app.swipeUp(velocity: .slow)
    }
    check(seen == titles, "the sections are " + titles.joined(separator: ", ") + ", in that order (saw: " + seen.joined(separator: ", ") + ")")
    for t in titles { check((found[t] ?? []).count == (rows[t] ?? []).count, t + " has " + (rows[t] ?? []).joined(separator: ", ") + " (saw: " + (found[t] ?? []).joined(separator: ", ") + ")") }
    app.terminate()
  }

  // ---------- 4: the switch in Review settings ----------
  func test4ReviewSettings() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "flipd" + run
    name(who, "Flip Dove")
    makeDeck(who)
    let r = review(who)
    check(r.mode == "turns", "to start with, the card turns over")
    tap(button(r.app, "Review settings"), "Review settings")
    let sw = button(r.app, "Flip animation")
    check(wait(sw) && (sw.value as? String) == "On", "Review settings has the Flip animation switch, On")
    snap("iphone-review-settings-flip-on")
    tap(sw, "Flip animation")
    check(eventually(5) { (sw.value as? String) == "Off" }, "pressing it turns it Off at once")
    check(eventually { saved(who) == false }, "and the server keeps it with the other study settings")
    snap("iphone-review-settings-flip-off")
    tap(button(r.app, "Done"), "Done")
    check(eventually(5) { audit(r.app) == "appears" }, "the sheet closed, the card's other side now just appears (no turn)")
    tap(button(r.app, "Flip card"), "the card")
    check(wait(button(r.app, "Flip back")) && any(r.app, "Protons").exists, "pressing the card shows the answer at once")
    r.app.terminate()
    let app = settings(who)
    check(wait(row(app)) && rowValue(app) == "Off", "Settings › Studying says Off too (it is the same setting)")
    app.terminate()
    let r2 = review(who)
    check(r2.mode == "appears", "opened again, the card still doesn't turn")
    tap(button(r2.app, "Review settings"), "Review settings")
    let sw2 = button(r2.app, "Flip animation")
    check(wait(sw2) && (sw2.value as? String) == "Off", "and the review's switch says Off")
    tap(sw2, "Flip animation")
    check(eventually(5) { (sw2.value as? String) == "On" } && eventually { saved(who) == true }, "pressing it again turns it On and saves")
    tap(button(r2.app, "Done"), "Done")
    check(eventually(5) { audit(r2.app) == "turns" }, "and the card turns over again")
    r2.app.terminate()
  }

  // ---------- 2: another device ----------
  func test2OtherDevice() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "flipb" + run
    name(who, "Flip Finch")
    makeDeck(who)
    // The web app (or another phone) turns it Off: this phone follows.
    act(who, "settings.update", ["patch": ["flip": false]])
    var app = settings(who)
    check(wait(row(app)) && rowValue(app) == "Off", "turned Off on another device, the switch here says Off")
    app.terminate()
    var r = review(who)
    check(r.mode == "appears", "and Review shows the other side with no turn")
    r.app.terminate()
    act(who, "settings.update", ["patch": ["flip": true]])
    app = settings(who)
    check(wait(row(app)) && rowValue(app) == "On", "turned On there, it says On here")
    app.terminate()
    r = review(who)
    check(r.mode == "turns", "and the card turns again")
    r.app.terminate()
  }
}
