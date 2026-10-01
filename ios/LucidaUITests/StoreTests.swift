// Go Pro with the App Store, end to end in the iPhone app: the app buys with StoreKit's local test store (Lucida.storekit, the same
// file Xcode's StoreKit configuration uses, started by the app itself: see App/StoreKitTesting.swift) and tells a copy of the server
// on this Mac, which takes the test store's purchases only because it was started to (LUCIDA_APPLE_TEST_XCODE=1, web/apple.mjs).
//   1  A Free person opens Go Pro from Settings and sees the App Store's own prices (never ones Lucida wrote), picks Monthly, and
//      buys: Pro is on, Settings says Billed by Apple with Manage plan, the server agrees, and Delete account's question tells
//      them how to stop an Apple subscription.
//   2  Restore purchases: a purchase this Apple Account made elsewhere (no Lucida account on it) is theirs once they restore it; and
//      another person on the same phone restoring gets the server's "belongs to another Lucida account", and stays Free. (This one runs
//      against a server of its own, which ios/tools/e2e-store.sh starts: the test store counts its purchases from 0 again after every
//      clearing, and the server keeps one row for each original purchase, so a second "purchase 0" would count as Amy's.)
//   3  Pro bought on the web says Billed on the web, with no Manage plan, no Cancel Pro, and nothing to buy.
//   4  Before the subscriptions are on the App Store (a store with no products) Go Pro says so plainly, with Restore purchases.
//   5  Every Go Pro opens the same sheet: Stats' upgrade card (with the App Store's prices on its buttons) and Settings › Theme.
// Run it with ios/tools/e2e-store.sh (it starts a fresh server with the test mode on). It only runs when LUCIDA_STORE is set.
import XCTest

final class StoreTests: AppCase {
  override class var label: String { "Store" }
  override class var switchName: String { "LUCIDA_STORE" }
  static var storekit: String { ProcessInfo.processInfo.environment["LUCIDA_STOREKIT"] ?? "" }
  static var emptyStore: String { ProcessInfo.processInfo.environment["LUCIDA_STOREKIT_EMPTY"] ?? "" }

  /// The app with StoreKit's test store on: the products of `file`, what was bought before kept (`reset` clears it), and the folder of
  /// the test frameworks the store needs from the runner.
  private func storeLaunch(_ who: String, _ extra: [String] = [], file: String = StoreTests.storekit, reset: Bool = false) -> XCUIApplication {
    var more = ["-storekit", file] + (reset ? ["-storekitReset"] : []) + extra
    if more.isEmpty { more = [] }
    return launch(as: who, more, env: ["DYLD_FRAMEWORK_PATH": ProcessInfo.processInfo.environment["DYLD_FRAMEWORK_PATH"] ?? ""])
  }
  /// The paywall's price as it shows, "$49.99 a year".
  private func shown(_ app: XCUIApplication) -> String {
    (app.staticTexts["goPro.price"].exists ? app.staticTexts["goPro.price"].label : "") + (app.staticTexts["goPro.per"].exists ? " " + app.staticTexts["goPro.per"].label : "")
  }

  // ---------- 1: buying monthly ----------
  func test1BuyMonthly() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "freeamy" + run
    name(who, "Amy Lee")
    check(plan(who)["pro"] as? Bool == false, "Amy starts on the Free plan")
    let app = storeLaunch(who, ["-open", "settings"], reset: true)
    check(wait(button(app, "Go Pro")) && wait(text(app, "Free")), "Settings offers Go Pro on Free")
    check(!button(app, "Manage plan").exists, "with no plan to manage")
    button(app, "Go Pro").tap()
    check(wait(app.staticTexts["goPro.title"]) && app.staticTexts["goPro.title"].label == "Go Pro", "Go Pro opens as a sheet over Settings")
    check(wait(app.staticTexts["goPro.price"], 20), "the App Store's prices arrive")
    check(shown(app) == "$49.99 a year", "the yearly one first: the price is the App Store’s (“\(shown(app))”)")
    check(app.staticTexts["goPro.note"].label == "That’s $4.17 a month, paid once a year.", "with what it comes to a month, worked out from it")
    check(app.buttons["goPro.pick.yearly"].label.contains("Save 30%"), "and what Yearly saves, worked out too")
    check(app.buttons["goPro.pick.yearly"].isSelected && !app.buttons["goPro.pick.monthly"].isSelected, "Yearly is the one picked")
    check(text(app, "Exam dates: ready in time for the test").exists && text(app, "More AI explanations").exists, "the pricing page’s Pro list is there")
    check(button(app, "Restore purchases").exists && any(app, "Terms").exists && any(app, "Privacy").exists, "with Restore purchases, Terms, and Privacy")
    check(app.staticTexts["goPro.legal"].label == "Billed to your Apple Account. Renews every year until you cancel it, in iPhone Settings under Subscriptions.", "and how it renews, and where to cancel")
    app.buttons["goPro.pick.monthly"].tap()
    check(wait(app.staticTexts["goPro.note"]) && shown(app) == "$5.99 a month", "Monthly shows its own price (“\(shown(app))”)")
    check(app.staticTexts["goPro.note"].label == "Paid monthly. Cancel anytime." && app.staticTexts["goPro.legal"].label.contains("every month"), "and its own words")
    snap("store-1-monthly")
    app.buttons["goPro.buy"].tap()
    check(gone(app.staticTexts["goPro.title"], 30), "buying closes the sheet")
    check(wait(any(app, "Billed by Apple"), 20), "Settings says Billed by Apple")
    check(wait(button(app, "Manage plan")) && button(app, "Cancel Pro").exists, "with Manage plan and Cancel Pro")
    check(!button(app, "Go Pro").exists, "and nothing left to buy")
    check(any(app, "Monthly · renews").exists, "the plan line says Monthly and when it renews")
    let p = plan(who)
    check(p["pro"] as? Bool == true && p["by"] as? String == "apple" && p["every"] as? String == "month", "the server has it: Pro, monthly, billed by Apple")
    // What it asked the server with: the purchase was made for Amy's own id.
    check(((state(who)["me"] as? [String: Any])?["appAccountToken"] as? String)?.count == 36, "bought with Amy’s own id")
    // Delete account tells an Apple subscriber how to stop paying.
    scrollTo(app, button(app, "Delete account"))
    tap(button(app, "Delete account"), "Delete account")
    check(wait(text(app, "Delete your account?")), "Delete account asks first")
    check(any(app, "You pay for Lucida Pro through Apple").exists && any(app, "tap your name, then Subscriptions").exists, "and says Apple’s subscription goes on until she stops it in iPhone Settings")
    check(!any(app, "will be cancelled").exists, "(not that Lucida will cancel it)")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(text(app, "Delete your account?")), "Cancel closes it")
  }

  // ---------- 2: Restore purchases ----------
  func test2Restore() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let bea = "freebea" + run, cal = "freecal" + run
    name(bea, "Bea Ortiz"); name(cal, "Cal Park")
    // The Apple Account bought it somewhere else, before any Lucida account had it; the app is told not to look by itself.
    var app = storeLaunch(bea, ["-open", "settings", "-storekitBuy", "cards.lucida.pro.monthly", "-noPurchaseSync"], reset: true)
    check(wait(button(app, "Go Pro")), "Bea opens Settings on Free")
    Thread.sleep(forTimeInterval: 3)
    check(plan(bea)["pro"] as? Bool == false, "Lucida hasn’t heard of the purchase")
    button(app, "Go Pro").tap()
    check(wait(app.buttons["goPro.restore"], 20), "Go Pro has Restore purchases")
    app.buttons["goPro.restore"].tap()
    check(gone(app.staticTexts["goPro.title"], 30), "restoring finds it and closes the sheet")
    check(wait(any(app, "Billed by Apple"), 20), "Settings says Billed by Apple")
    check(plan(bea)["pro"] as? Bool == true && plan(bea)["by"] as? String == "apple", "the server has it: Pro, billed by Apple")
    // Someone else on the same phone restores: that purchase is Bea's now.
    app.terminate()
    app = storeLaunch(cal, ["-open", "settings", "-noPurchaseSync"])
    check(wait(button(app, "Go Pro")), "Cal opens Settings on Free (same Apple Account, same phone)")
    button(app, "Go Pro").tap()
    check(wait(app.buttons["goPro.restore"], 20), "Go Pro has Restore purchases")
    app.buttons["goPro.restore"].tap()
    check(wait(app.staticTexts["goPro.line"], 20) && app.staticTexts["goPro.line"].label == "This purchase belongs to another Lucida account.", "Restore says in the server’s words that it’s someone else’s (“\(app.staticTexts["goPro.line"].label)”)")
    check(app.staticTexts["goPro.title"].exists, "and the sheet stays")
    check(plan(cal)["pro"] as? Bool == false, "Cal stays on Free")
  }

  // ---------- 3: Pro bought on the web ----------
  func test3BilledOnTheWeb() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "dana" + run
    name(who, "Dana Cruz")
    check(plan(who)["pro"] as? Bool == true && plan(who)["by"] == nil, "Dana is Pro with no Apple purchase (as if she paid on the web)")
    let app = launch(as: who, ["-open", "settings"])
    check(wait(any(app, "Billed on the web")), "Settings says Billed on the web")
    check(text(app, "Lucida").exists, "with her plan")
    check(!button(app, "Manage plan").exists && !button(app, "Cancel Pro").exists && !button(app, "Keep Pro").exists, "and no Manage plan, Cancel Pro, or Keep Pro (nothing that opens Stripe)")
    check(!button(app, "Go Pro").exists, "and nothing to buy")
    app.terminate()
    // Even if the sheet is opened anyway, there's nothing to buy.
    let again = launch(as: who, ["-open", "gopro"])
    check(wait(again.staticTexts["goPro.title"]) && again.staticTexts["goPro.title"].label == "Lucida Pro", "opened anyway, the sheet is just “Lucida Pro”")
    check(wait(text(again, "You’re on Pro")) && any(again, "Billed on the web").exists, "it says she’s on Pro, billed on the web")
    check(!again.buttons["goPro.buy"].exists && !again.buttons["goPro.restore"].exists && again.buttons["goPro.done"].exists, "with Done, and nothing to buy")
    again.buttons["goPro.done"].tap()
    check(gone(again.staticTexts["goPro.title"]), "Done closes it")
  }

  // ---------- 4: before the subscriptions are on the App Store ----------
  func test4NotYet() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    try XCTSkipIf(Self.emptyStore.isEmpty, "No empty store file")
    let who = "freedee" + run
    name(who, "Dee Fox")
    let app = storeLaunch(who, ["-open", "gopro"], file: Self.emptyStore, reset: true)
    check(wait(app.staticTexts["goPro.title"]), "Go Pro opens")
    check(wait(text(app, "Pro isn’t available on iPhone yet"), 20), "with no subscriptions on the App Store it says “Pro isn’t available on iPhone yet”")
    check(!app.buttons["goPro.buy"].exists && !app.staticTexts["goPro.price"].exists, "no price and nothing to buy")
    check(app.buttons["goPro.restore"].exists && text(app, "Everything in Free, plus:").exists, "Restore purchases and the Pro list are there")
    check(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "$")).count == 0, "and no price anywhere (Lucida never writes one itself)")
    app.buttons["Close"].firstMatch.tap()
    check(gone(app.staticTexts["goPro.title"]), "Close closes it")
  }

  // ---------- 5: every Go Pro opens the same sheet ----------
  func test5OtherGoPros() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "freeeli" + run
    name(who, "Eli Moss")
    // Eli has studied a card (before that, Stats is its empty page, with no tabs).
    let deck = act(who, "deck.add", ["name": "Biology"])["id"] as? String ?? ""
    for id in act(who, "card.add", ["deckId": deck, "kind": "basic", "front": "What does the mitochondrion make?", "back": "ATP"])["ids"] as? [String] ?? [] {
      act(who, "review.grade", ["cardId": id, "rating": 3])
    }
    var app = storeLaunch(who, ["-open", "statsdeep", "-tab", "Weak spots"], reset: true)
    check(wait(text(app, "See what you’re weak at"), 20), "Stats’ Weak spots on Free shows its upgrade card")
    check(wait(buttonStarting(app, "$5.99")) && buttonStarting(app, "$49.99").exists, "its two buttons show the App Store’s prices")
    check(buttonStarting(app, "$5.99").label == "$5.99 a month" && buttonStarting(app, "$49.99").label == "$49.99 a year", "(“\(buttonStarting(app, "$5.99").label)” and “\(buttonStarting(app, "$49.99").label)”)")
    check(any(app, "Yearly works out to $4.17 a month. Cancel anytime.").exists, "and what a year comes to a month")
    buttonStarting(app, "$5.99").tap()
    check(wait(app.staticTexts["goPro.title"]) && wait(app.staticTexts["goPro.price"], 20), "the monthly price opens Go Pro")
    check(app.buttons["goPro.pick.monthly"].isSelected && shown(app) == "$5.99 a month", "with Monthly picked")
    app.buttons["Close"].firstMatch.tap()
    check(gone(app.staticTexts["goPro.title"]), "Close closes it")
    app.terminate()
    app = storeLaunch(who, ["-open", "themes"])
    check(wait(text(app, "Themes are part of Pro")), "Settings › Theme on Free says themes are part of Pro")
    check(any(app, "Yearly works out to $4.17 a month").exists, "with the App Store’s price worked out")
    tap(button(app, "Go Pro"), "Go Pro")
    check(wait(app.staticTexts["goPro.title"]), "its Go Pro opens the same sheet")
  }
}
