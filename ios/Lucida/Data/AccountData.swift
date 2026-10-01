// Your account, for what Apple asks every app to have inside it: a password to sign in with (for App Review, which can't get an
// email code), the people you blocked, deleting your account, and the AI apps you allowed with Disconnect. The server side is
// web/handler.mjs and web/account.mjs, web/oauth.mjs; the web's client is web/db.js (setPassword, block, deleteAccount) and
// web/connect.js (apps, disconnectApp). Each failure comes back in the server's own plain words.
import Foundation

/// The people you blocked (GET /api/social/blocks), newest first.
struct BlockedList: Decodable {
  var people: [NetPerson] = []
  enum CodingKeys: String, CodingKey { case people }
  init(people: [NetPerson]) { self.people = people }
  init(from d: Decoder) throws { people = try d.container(keyedBy: CodingKeys.self).v(.people, []) }
}

/// An AI app that signed in to Lucida (GET /api/oauth/apps): its name, the site it sends you back to, and when it connected and
/// was last used.
struct ConnectedApp: Decodable, Identifiable, Equatable {
  var id = "", name = "", host = "", connected = "", lastUsed = ""
  enum CodingKeys: String, CodingKey { case id, name, host, connected, lastUsed }
  init(id: String, name: String, host: String, connected: String, lastUsed: String) { self.id = id; self.name = name; self.host = host; self.connected = connected; self.lastUsed = lastUsed }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, Int?.none).map(String.init) ?? c.v(.id, ""); name = c.v(.name, ""); host = c.v(.host, ""); connected = c.v(.connected, ""); lastUsed = c.v(.lastUsed, "")
  }
}
struct ConnectedApps: Decodable {
  var apps: [ConnectedApp] = []
  enum CodingKeys: String, CodingKey { case apps }
  init(apps: [ConnectedApp]) { self.apps = apps }
  init(from d: Decoder) throws { apps = try d.container(keyedBy: CodingKeys.self).v(.apps, []) }
}

extension Store {
  // ---------- who you blocked ----------
  /// Settings → Account → Blocked people. On a design screen: Maria and Dev, or nobody (the board's `noBlocks`).
  func netBlocks() -> NetAnswer<BlockedList>? {
    if demo {
      let X = NetSample.shared
      return .ok(BlockedList(people: props.noBlocks ? [] : [X.P["maria"], X.P["dev"]].compactMap { $0 }.filter { demoNet.blocks[$0.handle] != false }))
    }
    return netGet("api/social/blocks", ttl: 15, BlockedList.self)
  }
  /// Blocks someone (or unblocks them): they can't follow you or suggest to your decks, and you stop seeing their decks.
  func block(_ handle: String, _ on: Bool) async throws {
    if demo { demoNet.blocks[handle] = on; objectWillChange.send(); return }
    try await social("user.block", ["handle": handle, "on": on])
  }

  // ---------- a password ----------
  /// A password to sign in with next to the email code (8 to 72 characters). The server's words come back when it says no.
  func setPassword(_ password: String) async throws {
    if demo { return }
    try await api.setPassword(password)
  }

  // ---------- deleting your account ----------
  /// Deletes your account: your library, everything on the study network, and the sign-in itself; then you're signed out, back at
  /// the sign-in page. A plan billed by Stripe is cancelled with it; one billed by Apple is for you to cancel (the sheet says how).
  func deleteAccount() async throws {
    if demo { return }
    try await api.deleteAccount()
    signedOutNow()
  }
  /// Everything of yours leaves this phone: the cookies, the library, what was drawn for your theme, and any page you were on.
  func signedOutNow() {
    HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    Reminder.shared.remove()
    lib = Library(); session = nil; welcoming = false; signInStep = .email; phase = .signedOut
    netDrop()
  }

  // ---------- the AI apps you allowed ----------
  func netApps() -> NetAnswer<ConnectedApps>? {
    if demo {
      if props.noApps { return .ok(ConnectedApps(apps: [])) }
      let sample = [ConnectedApp(id: "a1", name: "Claude", host: "claude.ai", connected: "2026-09-12T16:20:00Z", lastUsed: "2026-09-29T08:05:00Z"),
                    ConnectedApp(id: "a2", name: "ChatGPT", host: "chatgpt.com", connected: "2026-09-18T19:40:00Z", lastUsed: "2026-09-18T19:40:00Z")]
      return .ok(ConnectedApps(apps: sample.filter { !demoNet.gone.contains($0.id) }))
    }
    return netGet("api/oauth/apps", ttl: 30, ConnectedApps.self)
  }
  /// Disconnect an app: it can't use your decks until you connect it again.
  func disconnectApp(_ id: String) async throws {
    if demo { demoNet.gone.insert(id); objectWillChange.send(); return }
    try await api.disconnectApp(id)
    netDrop()
    objectWillChange.send()
  }
}
