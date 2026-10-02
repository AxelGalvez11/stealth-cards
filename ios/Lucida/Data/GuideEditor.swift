// The Guide editor's memory (the logic of design/materials.mjs guideBoards `logic`): what is typed for each page (drafts), saved a moment after the last key (700 ms), one save
// after another, with "Saving…" / "Saved" / what went wrong in the page; pages, their names, History and Restore. The screen (Screens/Guide.swift) draws it; the text field's own text
// and selection go through GuideEngine. It builds for the Mac too (ios/tests/guide-check.sh runs it against a stand-in for the server: the timing, the order, a failure and a retry).
import Foundation
import Combine

private extension KeyedDecodingContainer {
  /// A value, or `d` when it's missing, null, or the wrong type.
  func opt<T: Decodable>(_ key: Key, _ d: T) -> T { (try? decodeIfPresent(T.self, forKey: key)) ?? d }
}

/// An older version of a page (the server's /api/guide/history): when its words were written, when it was kept, and the words.
struct GuideVersion: Decodable, Equatable, Identifiable {
  var at: Double = 0, saved: Double = 0, text = ""
  var id: Double { at }
  enum CodingKeys: String, CodingKey { case at, saved, text }
  init(at: Double, saved: Double, text: String) { self.at = at; self.saved = saved; self.text = text }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); at = c.opt(.at, 0); saved = c.opt(.saved, 0); text = c.opt(.text, "") }
}

/// One Guide's editor.
@MainActor
final class GuideEditorModel: ObservableObject {
  /// What the editor asks of the app around it (the Store's acts, or a stand-in for a check).
  struct Env {
    var save: (String, String, String) async throws -> Void = { _, _, _ in }
    var addPage: (String, String) async throws -> String = { _, _ in "" }
    var rename: (String, String, String) async throws -> Void = { _, _, _ in }
    var delete: (String, String) async throws -> Void = { _, _ in }
    var restore: (String, String, Double) async throws -> Void = { _, _, _ in }
    var history: (String, String) async -> [GuideVersion] = { _, _ in [] }
  }
  struct Job { var deckId: String, page: String, text: String }

  let deckId: String
  var env: Env
  /// How long after the last key a save goes out.
  var delay: TimeInterval = 0.7
  /// The most a page holds (the server's limit too).
  static let most = 40000
  @Published var page: String
  @Published var historyOpen = false
  /// What is typed, by deck and page (the key `deck|page`): it shows instead of what's saved until the page is left, restored or deleted.
  @Published var drafts: [String: String] = [:]
  @Published var saving = false
  @Published var error = ""
  /// A save went through (or something was typed): "Saved" shows.
  @Published var savedOnce = false
  /// The older versions of the page, once they come (nil while they're on their way).
  @Published var versions: [GuideVersion]?
  private var pending: [String: Job] = [:]
  private var timer: Task<Void, Never>?
  private var running: Task<Bool, Never>?
  private var renameTask: Task<Void, Never>?
  /// A name that is typed and not yet sent (a page's id and its new name).
  private var renaming: (page: String, title: String)?

  init(deckId: String, page: String = "main", env: Env = Env()) { self.deckId = deckId; self.page = page; self.env = env }
  deinit { timer?.cancel(); renameTask?.cancel() }

  func key(_ page: String) -> String { deckId + "|" + page }
  /// What an error says (the server's own words when it gave some), or `fallback`.
  static func words(_ error: Error, _ fallback: String) -> String { (error as? LocalizedError)?.errorDescription.flatMap { $0.isEmpty ? nil : $0 } ?? fallback }
  var hasPending: Bool { !pending.isEmpty }
  /// The line at the top right: what went wrong, "Saving…", or "Saved" (once anything is typed or saved).
  var saveLabel: String { !error.isEmpty ? error : saving ? "Saving…" : savedOnce || !drafts.isEmpty ? "Saved" : "" }

  /// A key was typed: remember it for this page and save a moment after the last one.
  func type(_ text: String) {
    let k = key(page)
    drafts[k] = text; error = ""
    // (a page over what a Guide may hold says so, and waits)
    if (text as NSString).length > Self.most { pending[k] = nil; timer?.cancel(); error = "This page is full."; return }
    pending[k] = Job(deckId: deckId, page: page, text: text)
    timer?.cancel()
    timer = Task { [weak self, delay] in
      try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
      if !Task.isCancelled { await self?.flush() }
    }
  }
  /// Sends what's waiting, one save after another (and waits for a save already going). If one fails, they all wait to be tried again and the page says what
  /// went wrong: it isn't tried again until the next key, or the next time this is asked for (Done, another page, History).
  func flush() async {
    timer?.cancel()
    renameTask?.cancel()
    await sendRename()
    while true {
      if let t = running { _ = await t.value; if !error.isEmpty { return }; continue }
      guard !pending.isEmpty else { return }
      let t = Task { [self] () -> Bool in let ok = await send(); running = nil; return ok }
      running = t
      if !(await t.value) { return }
    }
  }
  private func send() async -> Bool {
    let jobs = Array(pending.values)
    pending = [:]
    saving = true; error = ""
    do {
      for j in jobs { try await env.save(j.deckId, j.page, j.text) }
      saving = false; savedOnce = true
      return true
    } catch {
      for j in jobs where pending[key(j.page)] == nil { pending[key(j.page)] = j }
      saving = false; self.error = GuideEditorModel.words(error, "Couldn’t save. Try again.")
      return false
    }
  }

  /// The words of the page being shown: what is typed, or what's saved.
  func text(saved: String) -> String { drafts[key(page)] ?? saved }

  func pick(_ id: String) async { await flush(); page = id; historyOpen = false; versions = nil }
  func addPage() async {
    await flush()
    do { let id = try await env.addPage(deckId, "New page"); page = id; historyOpen = false; versions = nil }
    catch { self.error = GuideEditorModel.words(error, "Couldn’t add a page. Try again.") }
  }
  /// A page's name changes 600 ms after the last key, or at once when the page is left (Done, another page: like the web's field, which sends its name when it loses
  /// focus). A failure is left alone: the old name stays.
  func rename(_ title: String) {
    renaming = (page, title)
    renameTask?.cancel()
    renameTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 600_000_000)
      if Task.isCancelled { return }
      await self?.sendRename()
    }
  }
  /// Sends the name that is waiting, if there is one. (In a task of its own, so that being asked from a task that was cancelled, the timer's, doesn't cancel the request.)
  private func sendRename() async {
    guard let r = renaming else { return }
    renaming = nil
    let env = self.env, deckId = self.deckId
    await Task { try? await env.rename(deckId, r.page, r.title) }.value
  }
  func deletePage() async {
    let id = page
    do { try await env.delete(deckId, id); drafts[key(id)] = nil; pending[key(id)] = nil; if renaming?.page == id { renaming = nil }; page = "main"; versions = nil }
    catch { self.error = GuideEditorModel.words(error, "Couldn’t delete the page. Try again.") }
  }

  func toggleHistory() async {
    if historyOpen { historyOpen = false; return }
    historyOpen = true; versions = nil
    await flush()
    let list = await env.history(deckId, page)
    if historyOpen { versions = list }
  }
  func restore(_ v: GuideVersion) async {
    let id = page
    do { try await env.restore(deckId, id, v.at); drafts[key(id)] = nil; pending[key(id)] = nil; historyOpen = false; versions = nil }
    catch { self.error = GuideEditorModel.words(error, "Couldn’t restore it. Try again.") }
  }
}
