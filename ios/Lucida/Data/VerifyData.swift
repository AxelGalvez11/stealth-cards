// Verification, reports, and a teacher's check on a shared deck (the server side is web/classes.mjs and web/social.mjs; the web's client is
// web/net.js and web/db.js). A teacher or a school asks to be verified in Settings › Account (Get verified; Lucida's team decides on the
// admin page). A verified teacher or school can check someone's public deck (Check this deck), and has the check by their name. Anyone
// can report someone else's shared deck, a person, or a suggestion.
import Foundation

/// Whether you're verified as a teacher or a school, or waiting to hear (classes.mjs verifyStatus).
struct VerifyStatus: Decodable {
  var verified = "", open = false, declined = false, role = "", school = ""
  enum CodingKeys: String, CodingKey { case verified, open, declined, role, school }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    verified = c.v(.verified, ""); open = c.v(.open, false); declined = c.v(.declined, false); role = c.v(.role, ""); school = c.v(.school, "")
  }
}

extension Store {
  /// Whether you're verified, or waiting (for Get verified). On a design screen it's the board's own setting (`verified`), or a request
  /// sent on that screen.
  func netVerify() -> VerifyStatus {
    if demo {
      var v = VerifyStatus()
      v.verified = ["Teacher": "teacher", "School": "school"][props.verified] ?? ""
      v.open = props.verified == "Waiting for review" || demoVerifySent; v.school = "UC Davis"
      return v
    }
    return netGet("api/verify", ttl: 60, VerifyStatus.self)?.value ?? VerifyStatus()
  }

  // ---------- changes (web/db.js act.*) ----------
  // Each one gives back what the server said; when it didn't work the server's own words come back as the error, and the sheet shows them.
  /// Asks to be verified as a teacher or a school (the admin page decides).
  func askVerify(role: String, school: String, contact: String) async throws {
    if demo { demoVerifySent = true; return }
    try await social("verify.ask", ["role": role, "school": school, "contact": contact])
  }
  /// Reports a deck, a person (`handle`), or a suggestion.
  func sendReport(kind: String, id: String, handle: String? = nil, reason: String, note: String) async throws {
    if demo { return }
    var p: [String: Any] = ["kind": kind, "id": id, "reason": reason, "note": note]
    if let handle { p["handle"] = handle }
    try await social("report.send", p)
  }
  /// A verified teacher checks a deck (deck.check).
  func checkSharedDeck(_ sharedId: String) async throws {
    if demo { demoNet.pages.checked = true; return }
    try await social("deck.check", ["id": sharedId])
  }
}
