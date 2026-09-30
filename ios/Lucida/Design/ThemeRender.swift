// Themes (Pro) are drawn by the web app's own theme code. An offscreen web view loads a small page (Resources/ThemePage.html)
// that imports the theme's module from Lucida's server (/themes/…, so the phone and the web stay in step), has it draw one
// piece (a study background, a card's face, a deck's cover, a profile picture, …) into a box, and the app takes a picture
// of it. The pictures are kept (ThemeArt.swift), and the screens put them behind their own words and buttons.
import SwiftUI
import WebKit

/// One picture to paint: the theme, what kind of piece, and the sizes and words it needs.
struct ThemeJob {
  let theme: String
  let kind: String
  var fields: [String: Any] = [:]
  /// A job that a newer one takes the place of (a name being typed): the older one waiting is dropped.
  var slot: String? = nil
  /// What the page is sent.
  var json: [String: Any] { fields.merging(["theme": theme, "kind": kind]) { $1 } }
  /// Says which picture this is (the same job always gives the same picture).
  var key: String {
    let data = (try? JSONSerialization.data(withJSONObject: json, options: [.sortedKeys, .fragmentsAllowed])) ?? Data()
    return theme + "|" + kind + "|" + String(decoding: data, as: UTF8.self)
  }
}

/// What a job gave back: what the page said about it (its size, its padding, its colors), and its picture (a job that asks
/// only for values has none).
struct ThemeMade {
  var info: [String: Any]
  var image: UIImage?
}

@MainActor
final class ThemeRenderer: NSObject, WKScriptMessageHandler {
  static let shared = ThemeRenderer()
  private var web: WKWebView?
  private var pageReady: CheckedContinuation<Void, Error>?
  private var loading: Task<Void, Error>?
  /// The jobs go through one at a time.
  private var chain: Task<Void, Never> = Task {}

  enum Failure: Error { case noWindow, noPage, page(String), noPicture }

  /// Jobs waiting or running; and the web view's turn to go once it's been idle a while (it's a whole page in memory).
  private var active = 0
  private var idle: Task<Void, Never>?

  /// Paints a job. `picture: false` only asks the page for values (a theme's own details, how a card sets its words).
  func make(_ job: ThemeJob, picture: Bool = true) async throws -> ThemeMade {
    idle?.cancel(); active += 1
    defer {
      active -= 1
      if active == 0 { idle = Task { try? await Task.sleep(nanoseconds: 90_000_000_000); if !Task.isCancelled, active == 0 { close() } } }
    }
    let before = chain
    let task = Task { () -> Result<ThemeMade, Error> in
      await before.value
      do { return .success(try await self.run(job, picture: picture)) } catch { return .failure(error) }
    }
    chain = Task { _ = await task.value }
    return try await task.value.get()
  }

  /// The web view goes (the next job makes it again).
  private func close() {
    web?.removeFromSuperview(); web = nil; loading = nil
  }

  // ---------- the page ----------
  private func start() async throws {
    if let loading { return try await loading.value }
    let t = Task { () -> Void in
      // (a debug build can be pointed at another copy of the page: `-themePage <file>`)
      var file = Bundle.main.url(forResource: "ThemePage", withExtension: "html")
      #if DEBUG
      if let p = Board.arg("-themePage") { file = URL(fileURLWithPath: p) }
      #endif
      guard let url = file, let html = try? String(contentsOf: url, encoding: .utf8) else { throw Failure.noPage }
      let cfg = WKWebViewConfiguration()
      cfg.userContentController.add(self, name: "lt")
      let w = WKWebView(frame: CGRect(x: 0, y: 0, width: 500, height: 1000), configuration: cfg)
      w.isOpaque = false; w.backgroundColor = .clear
      w.scrollView.backgroundColor = .clear; w.scrollView.isScrollEnabled = false; w.scrollView.contentInsetAdjustmentBehavior = .never
      #if DEBUG
      w.isInspectable = true
      #endif
      // Behind the app, in its window: a web view has to be in a window to draw, and the app covers it.
      guard let window = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).flatMap(\.windows).first else { throw Failure.noWindow }
      window.insertSubview(w, at: 0)
      web = w
      try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
        pageReady = c
        w.loadHTMLString(html, baseURL: API.base)
        Task { try? await Task.sleep(nanoseconds: 15_000_000_000); if let c = self.pageReady { self.pageReady = nil; c.resume(throwing: Failure.page("The theme page didn’t load.")) } }
      }
    }
    loading = t
    do { try await t.value } catch { loading = nil; web?.removeFromSuperview(); web = nil; throw error }
  }

  nonisolated func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
    Task { @MainActor in
      if let c = self.pageReady { self.pageReady = nil; c.resume() }
    }
  }

  // ---------- one job ----------
  private func run(_ job: ThemeJob, picture: Bool) async throws -> ThemeMade {
    try await start()
    guard let web else { throw Failure.noPage }
    let raw = try await web.callAsyncJavaScript("return await LT.render(job);", arguments: ["job": job.json], in: nil, contentWorld: .page)
    let info = raw as? [String: Any] ?? [:]
    guard picture else { return ThemeMade(info: info, image: nil) }
    let w = (info["w"] as? Double) ?? 0, h = (info["h"] as? Double) ?? 0
    guard w >= 1, h >= 1 else { throw Failure.noPicture }
    // The page is as big as the picture, and has drawn it; a moment for it to settle, then the picture.
    web.frame = CGRect(x: 0, y: 0, width: max(w, 100), height: max(h, 100))
    _ = try? await web.callAsyncJavaScript("await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return 1;", arguments: [:], in: nil, contentWorld: .page)
    let cfg = WKSnapshotConfiguration()
    cfg.rect = CGRect(x: 0, y: 0, width: w, height: h)
    cfg.snapshotWidth = NSNumber(value: w)
    cfg.afterScreenUpdates = true
    let img = try await web.takeSnapshot(configuration: cfg)
    return ThemeMade(info: info, image: img)
  }
}
