// Settings › Studying › Flip animation, end to end in the iPhone app: a switch in Settings, on by default, that turns the flashcard's flip
// off (the other side just appears). It is kept with the person's other study settings on the server, so the web app and every other
// phone follow the same choice. The app is started with `-flipAudit` (debug builds), which puts what the card does in an invisible element
// named flipAudit: "turns" (the 3D turn) or "appears" (no turn).
//   1  The switch: Settings has "Flip animation" in Studying, On to start with; pressing it turns it Off and the server keeps it; in Review
//      the card now just shows its other side ("appears"), and still reads Flip card, then Flip back; opened again, the switch still says Off.
//   2  Another device: the choice made on the web (Off, then On) is what this phone shows, in Settings and in Review.
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
    app.terminate()
    var r = review(who)
    check(wait(button(r.app, "Flip card")), "Review opens on a card")
    check(r.mode == "appears", "with it Off, the card’s other side just appears (no turn)")
    tap(button(r.app, "Flip card"), "the card")
    check(wait(button(r.app, "Flip back")) && any(r.app, "Protons").exists, "pressing the card shows the answer, and the button now says Flip back")
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
