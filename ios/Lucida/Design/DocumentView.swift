// A file that isn't a PDF, shown with nothing of the system's around it. Quick Look has a bar, a share button and a spinner of its own, and they are the
// system's, so it isn't used: Word, PowerPoint, Excel and Pages files and rich text are drawn by the phone's web engine (the same pages, with none of that),
// plain text and captions are drawn here as text, and while a document loads Lucida's loading mark shows. A file nothing here can draw says so in a few words
// and offers the share sheet (which stays: it opens the file in another app). The cover's own Done button sits in the strip over the top.
import SwiftUI
import WebKit

struct DocumentView: View {
  @Environment(\.theme) private var t
  let url: URL
  @State private var state = DocumentWebView.State.loading
  /// The strip at the top, under the status bar, where the cover's Done button sits.
  static var strip: CGFloat { Screen.safeTop + 52 }

  var body: some View {
    ZStack(alignment: .top) {
      t.bg.ignoresSafeArea()
      if let text = Self.text(url) {
        ScrollView {
          Text(text).css(15, lh: 1.55).foregroundStyle(t.text).frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20).padding(.top, Self.strip).padding(.bottom, 40)
        }
        .accessibilityLabel("The file")
      } else {
        DocumentWebView(url: url, state: $state).padding(.top, Self.strip).ignoresSafeArea()
        switch state {
        case .loading: LoadingMark().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .failed: message
        case .shown: EmptyView()
        }
      }
    }
  }

  /// What a file nothing here can draw says.
  private var message: some View {
    VStack(spacing: 10) {
      Text("This file can’t be shown here").css(20, .semibold, ls: -0.01).foregroundStyle(t.text).multilineTextAlignment(.center).accessibilityAddTraits(.isHeader)
      Text("Share it to open it in another app.").css(14).foregroundStyle(t.muted).multilineTextAlignment(.center)
      Button { ShareSheet.present(title: url.lastPathComponent, url: url) } label: {
        Text("Share").css(15, .semibold).foregroundStyle(t.invText).padding(.horizontal, 22).frame(height: 48).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press).padding(.top, 8)
    }
    .padding(.horizontal, 32).frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  /// Endings of the files drawn here as text.
  static let textEndings: Set<String> = ["txt", "text", "md", "markdown", "srt", "vtt", "csv", "tsv", "log", "json"]
  /// A text file's words (a very long one is cut at 300,000 characters), or nil when it is some other kind of file.
  static func text(_ url: URL) -> String? {
    guard textEndings.contains(url.pathExtension.lowercased()), let data = try? Data(contentsOf: url) else { return nil }
    let s = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) ?? ""
    return s.count > 300_000 ? String(s.prefix(300_000)) + "…" : s
  }
}

/// The phone's web engine drawing a document from a file on the phone (white paper, whatever the theme: a document is a page).
struct DocumentWebView: UIViewRepresentable {
  enum State { case loading, shown, failed }
  let url: URL
  @Binding var state: State
  func makeCoordinator() -> Coordinator { Coordinator($state) }
  func makeUIView(context: Context) -> WKWebView {
    let v = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
    v.navigationDelegate = context.coordinator
    v.isOpaque = true; v.backgroundColor = .white; v.scrollView.backgroundColor = .white
    v.accessibilityIdentifier = "documentView"
    v.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    return v
  }
  func updateUIView(_ v: WKWebView, context: Context) {}
  final class Coordinator: NSObject, WKNavigationDelegate {
    let state: Binding<State>
    init(_ s: Binding<State>) { state = s }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { state.wrappedValue = .shown }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { state.wrappedValue = .failed }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { state.wrappedValue = .failed }
  }
}
