// How the app asks for its library when it opens (API.syncedState), against js/sync-server.mjs: the sync gets 8 seconds,
// then the app takes the plain library; a 401 (signed out) is signed out, at once when the sync says so. Run by
// ios/tests/sync-check.sh with -server <the stand-in's address>.
import Foundation

var passed = 0, failed = 0
func check(_ ok: Bool, _ name: String) { if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name) } }

/// One way the server can go: who asks (the cookie), what came back (the library's rev, or what went wrong), and how long it took.
func ask(_ who: String) async -> (answer: String, seconds: Double) {
  let c = HTTPCookie(properties: [.name: "lc_dev", .value: who, .domain: "127.0.0.1", .path: "/", .expires: Date().addingTimeInterval(3600)])!
  HTTPCookieStorage.shared.setCookie(c)
  let t0 = Date()
  do { let lib = try await API().syncedState(); return ("rev \(lib.rev)", Date().timeIntervalSince(t0)) }
  catch APIError.signedOut { return ("signed out", Date().timeIntervalSince(t0)) }
  catch { return ("error: \(error.localizedDescription)", Date().timeIntervalSince(t0)) }
}
func log() async -> [[String: Any]] {
  let (data, _) = (try? await URLSession.shared.data(from: URL(string: API.base.absoluteString + "/__log")!)) ?? (Data(), URLResponse())
  return (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] ?? []
}
func asked(_ who: String) async -> [String] { (await log()).filter { $0["who"] as? String == who }.compactMap { $0["url"] as? String } }

var r = await ask("fast")
check(r.answer == "rev 3" && r.seconds < 2, "a server that answers the sync at once: the library with the sync (rev 3, \(String(format: "%.1f", r.seconds)) s)")
check(await asked("fast") == ["/api/state?sync=1"], "and the plain library isn't asked for")

r = await ask("slow")
check(r.answer == "rev 2" && r.seconds > 7.5 && r.seconds < 10, "a sync held for 12 seconds: after 8 seconds the plain library (rev 2, \(String(format: "%.1f", r.seconds)) s)")
check(await asked("slow") == ["/api/state?sync=1", "/api/state"], "it asked for the sync, then the plain library")

r = await ask("dribble")
check(r.answer == "rev 2" && r.seconds > 7.5 && r.seconds < 10, "a sync that keeps trickling in (so never quiet) is given up on after 8 seconds too (rev 2, \(String(format: "%.1f", r.seconds)) s)")

r = await ask("broken")
check(r.answer == "rev 2" && r.seconds < 2, "a sync that answers 500: the plain library at once (rev 2, \(String(format: "%.1f", r.seconds)) s)")
r = await ask("dropped")
check(r.answer == "rev 2" && r.seconds < 2, "a sync whose connection is cut: the plain library at once (rev 2, \(String(format: "%.1f", r.seconds)) s)")

r = await ask("signedout")
check(r.answer == "signed out" && r.seconds < 2, "a 401 on the sync is signed out, at once (\(String(format: "%.1f", r.seconds)) s)")
check(await asked("signedout") == ["/api/state?sync=1"], "without asking again")
r = await ask("plainsignedout")
check(r.answer == "signed out" && r.seconds > 7.5 && r.seconds < 10, "a slow sync, then a 401 on the plain library: signed out (\(String(format: "%.1f", r.seconds)) s)")

print("Sync: \(passed) passed, \(failed) failed")
exit(failed == 0 ? 0 : 1)
