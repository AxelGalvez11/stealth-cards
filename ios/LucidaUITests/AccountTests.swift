// What Apple asks every app with accounts to have inside it, end to end in the iPhone app: a password to sign in with (App Review can't
// get an email code), Block and Unblock, the AI apps you allowed with Disconnect, and Delete account. The app talks to a copy of the
// server on this Mac with made-up people (the lc_dev cookie, which the debug-only `-dev <name>` launch argument sets) through a small
// stand-in (ios/tools/password-proxy.mjs) that does what the real server does online and a copy on this Mac can't: it asks for a
// sign-in when nobody is signed in, and takes a password. Each flow sets up its own people, so any one can run alone.
//   1  Password: a made-up person saves one in Settings › Account (the server's words when it's too short), signs out, and signs in
//      with the email and that password on the sign-in screen (the stand-in's "don't match" words for a wrong one).
//   2  Block from a profile's ⋯: a question first (Cancel changes nothing), then the profile comes without decks and with Unblock
//      where Follow was; Settings › Account › Blocked people lists them with Unblock; the server stops them from following; Unblock on
//      the profile works too.
//   3  Block from a suggestion: the person's suggestion goes, and they can't suggest to the deck again.
//   4  Disconnect an AI app: Settings › Connect AI lists the apps that signed in to Lucida; Disconnect asks first, then the app is gone.
//   5  Delete account: asks first (Cancel keeps everything), then the library, profile and shared deck are gone and the app is back at
//      the sign-in screen.
// Run it with ios/tools/e2e-account.sh (it starts a fresh server and the stand-in). It only runs when LUCIDA_ACCOUNT is set.
import XCTest
import CryptoKit

final class AccountTests: AppCase {
  override class var label: String { "Account" }
  override class var switchName: String { "LUCIDA_ACCOUNT" }

  /// A person with a name, who has a profile (so they have a handle): the made-up name, and their handle.
  private func person(_ who: String, _ display: String) -> String {
    name(who, display)
    return social(who, "profile.ensure")["handle"] as? String ?? ""
  }
  private func blocked(_ who: String) -> [String] {
    ((get(who, "/api/social/blocks")["people"] as? [[String: Any]]) ?? []).compactMap { $0["handle"] as? String }
  }
  /// The red button of a question sheet (Delete account, Block), and its Cancel.
  private func go(_ app: XCUIApplication) -> XCUIElement { app.buttons["danger.go"] }
  /// Opens the ⋯ after Share on someone's profile, to Report and Block (a tap that lands while a sheet is still closing is lost, so
  /// it tries again).
  private func openMore(_ app: XCUIApplication, _ name: String) -> Bool {
    for _ in 0..<3 {
      let more = button(app, "More for " + name)
      if wait(more) { more.tap() }
      if wait(button(app, "Report"), 4) { return true }
    }
    return false
  }
  private func cancel(_ app: XCUIApplication) -> XCUIElement { app.buttons["danger.cancel"] }

  // ---------- 1: a password ----------
  func test1Password() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gus" + run, email = who + "@dev.local", password = "blue heron 42"
    let GH = person(who, "Gus Hall")
    var app = launch(as: who, ["-open", "settings"])
    check(wait(text(app, "Settings")), "Gus opens Settings")
    scrollTo(app, buttonStarting(app, "Password"))
    check(buttonStarting(app, "Password").exists && any(app, "Optional. Sign in without an email code.").exists, "Account has Password, optional, with what it's for")
    tap(buttonStarting(app, "Password"), "Password")
    let field = app.secureTextFields["New password"]
    check(wait(field), "it opens a field for a new password")
    check(any(app, "Sign in with your email and a password instead of a code. You can still use a code any time.").exists, "and says what it does")
    // (Return saves: the keyboard covers Save on this screen, and Done is what a person would press.)
    typeInto(field, "short\n")
    check(wait(text(app, "Use 8 to 72 characters.")), "a short password: “Use 8 to 72 characters.”")
    typeInto(field, password + "\n", clear: 5)
    check(wait(text(app, "Password saved.")), "a good one: “Password saved.”")
    app.terminate()

    // Nobody signed in: the sign-in screen, and the password under “Use a password”.
    app = launch(as: "none")
    check(wait(text(app, "Sign in to Lucida")), "with nobody signed in, the app opens on the sign-in screen")
    check(!button(app, "Profile").exists, "and nothing of anyone's library")
    tap(button(app, "Use a password"), "Use a password")
    snap("account-signin-password")
    check(wait(app.secureTextFields["signIn.password"]) && button(app, "Use an email code instead").exists, "“Use a password” adds the Password field, and a way back to the code")
    typeInto(app.textFields["signIn.email"], email + "\n")
    typeInto(app.secureTextFields["signIn.password"], "not the password\n")
    check(wait(text(app, "That email and password don’t match.")), "a wrong password: “That email and password don’t match.”")
    check(text(app, "Sign in to Lucida").exists, "and still the sign-in screen")
    typeInto(app.secureTextFields["signIn.password"], password + "\n", clear: 16)
    check(wait(button(app, "Profile"), 20), "the right one opens the app")
    check(!text(app, "Sign in to Lucida").exists, "and the sign-in screen is gone")
    // (A tap that comes while the app is still changing screens is lost, so it taps again.)
    var mine = false
    for _ in 0..<4 where !mine {
      Thread.sleep(forTimeInterval: 1)
      if wait(button(app, "Profile")) { button(app, "Profile").tap() }
      mine = wait(any(app, "@" + GH), 6)
    }
    check(mine, "and it's Gus's own library: his profile says @\(GH)")
  }

  // ---------- 2: Block from a profile ----------
  func test2BlockFromProfile() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let maya = "maya" + run, ned = "ned" + run
    _ = person(maya, "Maya Ortiz")
    name(ned, "Ned Ito")
    let deckName = "Ned’s biology " + run
    _ = shareDeck(ned, deckName)
    let NH = handle(ned), MH = handle(maya)
    var app = launch(as: maya, ["-open", "profile:" + NH])
    check(wait(button(app, "Follow")) && wait(any(app, deckName)), "Maya opens Ned's profile: Follow, and his deck")
    check(wait(button(app, "More for Ned Ito")), "it has ⋯ next to Share")
    check(openMore(app, "Ned Ito") && button(app, "Block").exists, "which has Report and Block")
    button(app, "Block").tap()
    check(wait(text(app, "Block Ned Ito?")), "Block asks first: “Block Ned Ito?”")
    check(any(app, "They won’t be able to follow you or suggest changes to your decks, and you won’t see their decks. You can unblock them in Settings.").exists, "in words: what they can't do, what you won't see, and where to undo it")
    tap(cancel(app), "Cancel")
    check(gone(text(app, "Block Ned Ito?")), "Cancel closes it")
    Thread.sleep(forTimeInterval: 0.6)
    check(blocked(maya).isEmpty && button(app, "Follow").exists, "and nothing changed: not blocked, still Follow")
    _ = openMore(app, "Ned Ito")
    tap(button(app, "Block"), "Block")
    tap(go(app), "the red Block")
    check(wait(button(app, "Unblock")), "Block: the page says Unblock where Follow was")
    check(gone(any(app, deckName)) && !button(app, "Follow").exists, "and comes without his decks")
    check(blocked(maya) == [NH], "the server has the block")
    // The server stops them: they can't follow Maya, and Maya can't follow them.
    let follow = api(ned, "POST", "/api/social", ["type": "user.follow", "handle": MH, "on": true])
    check(follow.status == 403 && (follow.json as? [String: Any])?["error"] as? String == "You can’t follow this person.", "Ned can't follow Maya (“\(((follow.json as? [String: Any])?["error"] as? String) ?? "")”)")
    app.terminate()

    // Settings › Account › Blocked people.
    app = launch(as: maya, ["-open", "settings"])
    scrollTo(app, button(app, "Delete account"))
    check(wait(text(app, "Blocked people")) && any(app, "@" + NH).exists, "Settings › Account › Blocked people lists Ned, with his handle")
    check(button(app, "Unblock").exists, "with Unblock")
    snap("account-blocked-list")
    tap(button(app, "Unblock"), "Unblock")
    snap("account-blocked-after")
    check(gone(any(app, "@" + NH)), "Unblock takes him off the list")
    check(eventually { blocked(maya).isEmpty }, "and off the server's")
    check(wait(text(app, "None")), "the row says None")
    app.terminate()

    // On the profile itself: Unblock where Follow was.
    social(maya, "user.block", ["handle": NH, "on": true])
    app = launch(as: maya, ["-open", "profile:" + NH])
    check(wait(button(app, "Unblock")) && !button(app, "Follow").exists, "someone you blocked: their profile says Unblock")
    check(!any(app, deckName).exists, "and has no decks")
    button(app, "Unblock").tap()
    check(wait(button(app, "Follow")) && wait(any(app, deckName)), "Unblock brings Follow and his deck back")
    check(eventually { blocked(maya).isEmpty }, "and the server agrees")
  }

  // ---------- 3: Block from a suggestion ----------
  func test3BlockFromSuggestion() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let alex = "alex" + run, maria = "maria" + run
    name(alex, "Alex Kim")
    let deckName = "Cell Biology " + run
    let d = shareDeck(alex, deckName)
    let MH = person(maria, "Maria Santos"), AH = handle(alex)
    let sg = social(maria, "suggestion.send", ["id": d.id, "message": "Buy my answers", "changes": [["op": "add", "after": ["kind": "basic", "front": "Spam question", "back": "Yes"]]]])
    check(!(sg["id"] as? String ?? "").isEmpty, "Maria suggests a change to Alex's deck")
    let app = launch(as: alex, ["-open", "suggestions"])
    let row = buttonStarting(app, "Maria Santos")
    check(wait(row), "Alex's Suggestions list it")
    row.tap()
    check(wait(text(app, "Maria Santos suggested 1 change")), "opening it shows what she suggested")
    check(wait(button(app, "Block")) && button(app, "Report").exists, "with Report and Block at the end of her words")
    button(app, "Block").tap()
    check(wait(text(app, "Block Maria Santos?")), "Block asks first: “Block Maria Santos?”")
    tap(go(app), "the red Block")
    check(gone(text(app, "Block Maria Santos?")), "Block closes the question")
    check(eventually { blocked(alex) == [MH] }, "the server has the block")
    check(gone(buttonStarting(app, "Maria Santos"), 15) && !text(app, "Maria Santos suggested 1 change").exists, "her suggestion is gone from Alex's list")
    let open = (api(alex, "GET", "/api/social/suggestions?id=" + d.id).json as? [[String: Any]]) ?? []
    check(open.isEmpty, "and from the server")
    let again = api(maria, "POST", "/api/social", ["type": "suggestion.send", "id": d.id, "message": "Again", "changes": [["op": "add", "after": ["kind": "basic", "front": "One more", "back": "Yes"]]]])
    check(again.status == 403 && (again.json as? [String: Any])?["error"] as? String == "You can’t suggest changes to this deck.", "Maria can't suggest to the deck again (“\(((again.json as? [String: Any])?["error"] as? String) ?? "")”)")
    _ = AH
  }

  // ---------- 4: Disconnect an AI app ----------
  func test4DisconnectApp() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "ivy" + run
    name(who, "Ivy Chen")
    check(connectApp(who, "Perplexity"), "Ivy signs in to Lucida from Perplexity (it registers, she says Allow, it trades its code)")
    check(connectApp(who, "Grok"), "and from Grok")
    check(apps(who).count == 2, "the server lists the two apps")
    let app = launch(as: who, ["-open", "connect"])
    check(wait(text(app, "Apps you allowed")), "Settings › Connect AI has Apps you allowed")
    check(wait(text(app, "Perplexity")) && text(app, "Grok").exists && app.buttons.matching(NSPredicate(format: "label == %@", "Disconnect")).count == 2, "each app is there, with Disconnect")
    // Newest first: Grok's row is the first Disconnect.
    app.buttons.matching(NSPredicate(format: "label == %@", "Disconnect")).element(boundBy: 0).tap()
    check(wait(any(app, "Disconnect Grok?")), "Disconnect asks first: “Disconnect Grok?”")
    check(any(app, "It can’t use your decks until you connect it again.").exists, "and says what it means")
    snap("account-disconnect-dialog")
    // The question is a bubble over the page (no Cancel button): tapping anywhere outside it closes it.
    app.otherElements["PopoverDismissRegion"].coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.1)).tap()
    check(gone(any(app, "Disconnect Grok?")), "tapping outside closes it")
    check(text(app, "Grok").exists && apps(who).count == 2, "and Grok is still allowed")
    app.buttons.matching(NSPredicate(format: "label == %@", "Disconnect")).element(boundBy: 0).tap()
    check(wait(any(app, "Disconnect Grok?")), "Disconnect again")
    tap(app.sheets.buttons["Disconnect"].firstMatch, "the red Disconnect")
    check(gone(text(app, "Grok"), 15), "Grok is gone from the list")
    check(eventually { apps(who).map { $0["name"] as? String ?? "" } == ["Perplexity"] }, "and from the server, which still has Perplexity")
    check(text(app, "Perplexity").exists, "Perplexity is still there")
    app.buttons["Disconnect"].firstMatch.tap()
    check(wait(any(app, "Disconnect Perplexity?")), "the last one asks too")
    tap(app.sheets.buttons["Disconnect"].firstMatch, "the red Disconnect")
    check(wait(any(app, "None yet. Add Lucida to your AI app and sign in:"), 15), "with none left it says “None yet. Add Lucida to your AI app and sign in:”")
    check(eventually { apps(who).isEmpty }, "and the server has none")
  }

  // ---------- 5: Delete account ----------
  func test5DeleteAccount() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gina" + run
    let GH = person(who, "Gina Ruiz")
    let deckName = "Gina’s chemistry " + run
    let d = shareDeck(who, deckName, n: 2)
    check(((state(who)["decks"] as? [[String: Any]])?.count ?? 0) == 1 && get("x", "/api/public/deck?id=" + d.id)["name"] as? String == deckName, "Gina has a deck, and shared it")
    var app = launch(as: who, ["-open", "settings"])
    scrollTo(app, button(app, "Delete account"))
    tap(button(app, "Delete account"), "Delete account")
    check(wait(text(app, "Delete your account?")), "Delete account asks first: “Delete your account?”")
    check(any(app, "This deletes your decks, cards, and reviews, your profile, and the decks you shared. It can’t be undone.").exists, "what goes, in words")
    check(any(app, "Your Lucida Pro subscription will be cancelled.").exists, "and, since she has Pro, what happens to it")
    tap(cancel(app), "Cancel")
    check(gone(text(app, "Delete your account?")), "Cancel closes it")
    check(((state(who)["decks"] as? [[String: Any]])?.count ?? 0) == 1 && get("x", "/api/public/deck?id=" + d.id)["name"] as? String == deckName, "and nothing is deleted")
    tap(button(app, "Delete account"), "Delete account")
    check(wait(text(app, "Delete your account?")), "again")
    tap(go(app), "the red Delete account")
    check(wait(text(app, "Sign in to Lucida"), 25), "deleting returns the app to the sign-in screen")
    check(!button(app, "Profile").exists && !text(app, "Delete your account?").exists, "with nothing of hers left on it")
    check(eventually { ((state(who)["decks"] as? [[String: Any]])?.count ?? -1) == 0 }, "her library is empty on the server")
    check(api("x", "GET", "/api/public/deck?id=" + d.id).status == 404, "the deck she shared is gone")
    check(api("x", "GET", "/api/public/profile?h=" + GH).status == 404, "and so is her profile")
    app.terminate()
    // Opening the app again: nobody's signed in.
    app = launch(as: "none")
    check(wait(text(app, "Sign in to Lucida")), "opening the app again: the sign-in screen")
  }

  // ---------- AI apps, the way one signs in (oauth.mjs) ----------
  private static let redirect = "https://client.example/callback"
  private func base64url(_ d: Data) -> String { d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
  /// An AI app that is allowed to use the person's decks: it registers, the person says Allow, and it trades its code (with PKCE) for
  /// tokens. That is what puts it in Settings › Connect AI.
  private func connectApp(_ who: String, _ appName: String) -> Bool {
    let reg = api("", "POST", "/oauth/register", ["redirect_uris": [Self.redirect], "client_name": appName, "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"], "token_endpoint_auth_method": "none"])
    guard let cid = (reg.json as? [String: Any])?["client_id"] as? String else { return false }
    let verifier = base64url(Data((0..<32).map { _ in UInt8.random(in: 0...255) }))
    let challenge = base64url(Data(SHA256.hash(data: Data(verifier.utf8))))
    func enc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? s }
    let query = "response_type=code&client_id=\(cid)&redirect_uri=\(enc(Self.redirect))&code_challenge=\(challenge)&code_challenge_method=S256&state=abc"
    let decided = api(who, "POST", "/api/oauth/decision", ["query": query, "allow": true])
    guard let back = (decided.json as? [String: Any])?["redirect"] as? String, let code = URLComponents(string: back)?.queryItems?.first(where: { $0.name == "code" })?.value else { return false }
    let token = api("", "POST", "/oauth/token", form: "grant_type=authorization_code&code=\(enc(code))&redirect_uri=\(enc(Self.redirect))&code_verifier=\(verifier)&client_id=\(cid)")
    return token.status == 200
  }
  private func apps(_ who: String) -> [[String: Any]] { (get(who, "/api/oauth/apps")["apps"] as? [[String: Any]]) ?? [] }
}
