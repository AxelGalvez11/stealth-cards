// iPhone · what the deck page carries besides its cards (PhoneDeck: Cards, Notes and Sources; design/materials.mjs deckBlocks): the row of tabs under the Study
// buttons, the Notes (the deck's Guide and its pages, rendered, with Make cards and Edit for its owner), the Sources (what the deck's cards were made from; only for its
// owner), and a source opened as a sheet (what it holds, the recording to play at the card's time, the file, the photos, the words that were said with the part a
// card pointed at marked; Open, More cards, Delete). The words of a Guide are read by web/guide.js (Data/GuideEngine.swift) and drawn by Design/GuideViews.swift.
import SwiftUI
import AVFoundation
import PDFKit

// ---------- the tabs ----------
/// Plain underlined tabs, a small count after a name that has one: the chosen one is black with a bar under it (one point of black over the hairline, as the canvas shows it). A fourth fits, and the row scrolls sideways when
/// it has to (Cards, Notes, Sources, and room for another).
struct DeckTabs: View {
  @Environment(\.theme) private var t
  struct Item: Identifiable { let id: String; let label: String }
  let items: [Item]
  let selected: String
  let pick: (String) -> Void
  var body: some View {
    ZStack(alignment: .bottom) {
      t.line.frame(height: 1)
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 22) {
          ForEach(items) { x in
            let on = x.id == selected
            Button { pick(x.id) } label: {
              HStack(spacing: 7) {
                Text(x.label).css(15, .semibold).lineLimit(1).fixedSize()
              }
              .foregroundStyle(on ? t.text : t.muted)
              .frame(height: 44)
              // (The canvas's bar is 2 points but the row's scroller cuts the lower one off, over the hairline: what shows is one black point above the hairline.)
              .overlay(alignment: .bottom) { Rectangle().fill(on ? t.text : .clear).frame(height: 1) }
              .frame(height: 45, alignment: .top)
              .contentShape(Rectangle())
            }
            .buttonStyle(.flat)
            .accessibilityLabel(x.label).accessibilityAddTraits(on ? [.isSelected, .isButton] : .isButton)
          }
        }
      }
      .frame(height: 45)
    }
    .frame(height: 45)
    .accessibilityElement(children: .contain).accessibilityLabel("Deck sections")
  }
}

/// A small pill with an icon (the deck page's Make cards, Edit): 34 tall, on the page's color.
private struct LittlePill: View {
  @Environment(\.theme) private var t
  let label: String, icon: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { Icon(icon, 14, 2); Text(label).css(13, .semibold).lineLimit(1).fixedSize() }
        .foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.bg))
    }
    .buttonStyle(.press).accessibilityLabel(label)
  }
}

// ---------- Notes: the Guide ----------
/// The Guide as a card, as its page reads (web/notes.js's reading view: the same rows as the Notes page, its toggles opening and its sections folding, remembered on
/// this phone): its page tabs (when it has pages), Make cards (for its owner, once it has words), and the page. For its owner a tap on the words opens the Notes page
/// there, and an empty Guide is a blank note waiting (a heading and a line). On a shared deck's page (`shared`: the deck's address, which this phone remembers its
/// toggles by) it says NOTES, and a long page is cut short with Show more. The caller says which page is showing (`page`, one of `tabs`) and its words; `images`
/// says which pictures may show (a deck's own, or a shared deck's public ones). At its right, the outline's rail (NotesRail), which stays a little under the top
/// of the screen as the page scrolls by; on a shared deck's page, once the page shows in full (cut short, Show more comes first).
struct GuideCard: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  @EnvironmentObject private var store: Store
  let deckId: String
  let tabs: [(id: String, title: String)]
  @Binding var page: String
  let text: String
  @Binding var open: Bool
  /// Make cards shows, and a tap opens the page to write in: it's the deck's owner's.
  var canEdit = false
  /// The Guide has words or pages already.
  var hasAny = true
  var images: (String) -> URL? = GuideImages.own
  /// A shared deck's page: its address.
  var shared: String? = nil
  @StateObject private var notes = NotesPage()
  @State private var hooks = NotesHooks()
  /// (only the rail watches it: the card isn't drawn again as the page scrolls)
  @State private var outline = NotesOutline()

  var body: some View {
    let hasText = !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    let long = shared != nil && ((text as NSString).length > 640 || text.split(separator: "\n", omittingEmptySubsequences: false).count > 14)
    let heads = notes.outline, railOn = heads.count >= 2 && (!long || open)
    let key = shared.map { "shared|" + $0 + "|" + page } ?? ((store.demo ? "canvas|" : "") + deckId + "|" + page)
    VStack(alignment: .leading, spacing: 12) {
      if shared != nil || !tabs.isEmpty || (canEdit && hasText) { GuideCardBar(tabs: tabs, page: $page, open: $open, label: shared != nil, make: canEdit && hasText ? { nav.make(deckId: deckId) } : nil) }
      // (on a shared deck's page what is cut short starts at the card's edge, so the headings' ▸ in the margin stay in it)
      // (a link inside the page to a heading in the part that is cut off opens the rest first)
      let pageView = NotesView(page: notes, setup: NotesSetup(colors: NotesColors(t, code: t.bg), owner: canEdit, hooks: hooks)).padding(.leading, shared != nil ? 26 : 0)
        .environment(\.guideExpand, long && !open ? { open = true } : nil)
        .environment(\.notesOutline, outline)
        .onGeometryChange(for: CGFloat.self) { $0.frame(in: .named("guide-card")).minY } action: { outline.notes(at: $0) }
      if long && !open {
        pageView.fixedSize(horizontal: false, vertical: true).frame(maxHeight: 230, alignment: .top).clipped()
          .mask(LinearGradient(stops: [.init(color: .black, location: 0.62), .init(color: .clear, location: 1)], startPoint: .top, endPoint: .bottom))
          .padding(.leading, -20)
      } else { pageView.padding(.leading, shared != nil ? -20 : 0) }
      if long {
        Button { open.toggle() } label: { Text(open ? "Show less" : "Show more").css(14, .semibold).underline().foregroundStyle(t.text) }
          .buttonStyle(.flat).accessibilityLabel(open ? "Show less" : "Show more")
      }
    }
    .padding(.top, shared != nil ? 18 : 16).padding(.bottom, shared != nil ? 16 : 18).padding(.leading, shared != nil ? 20 : 24).padding(.trailing, 18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .coordinateSpace(.named("guide-card"))
    .overlay(alignment: .topTrailing) { if railOn { NotesRail(heads: heads, outline: outline, page: notes, sticky: true) } }
    .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { r in outline.stick(card: r, rail: NotesRail.height(heads.count)); outline.refresh(heads, top: Screen.safeTop) }
    .accessibilityElement(children: .contain).accessibilityLabel("Notes")
    .onAppear { load(key) }
    .onChange(of: key) { _, k in load(k) }
    .onChange(of: text) { _, _ in load(key) }
  }
  /// The page's words, read as blocks (an owner's empty Guide is a blank note), and what a tap does.
  private func load(_ key: String) {
    hooks.image = images
    let deck = deckId, pg = page
    if canEdit { hooks.open = { [nav] i, off in nav.guide(deckId: deck, page: pg == "main" ? "" : pg, at: "\(i):\(off)") } } else { hooks.open = nil }
    notes.load(text, key: key, editable: false, blank: canEdit)
  }
}

/// The card's top: NOTES (on a shared deck's page), the pages as tabs, and Make cards.
struct GuideCardBar: View {
  @Environment(\.theme) private var t
  let tabs: [(id: String, title: String)]
  @Binding var page: String
  @Binding var open: Bool
  let label: Bool
  let make: (() -> Void)?
  var body: some View {
    FlexWrap(gap: 10) {
      if label { Text("NOTES").css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).fixedSize().accessibilityAddTraits(.isHeader) }
      if !tabs.isEmpty {
        FlexWrap(gap: 4, rowGap: 4) {
          ForEach(tabs, id: \.id) { x in
            let on = x.id == page
            Button { page = x.id; open = false } label: {
              Text(x.title).css(label ? 12.5 : 13, .semibold).lineLimit(1).foregroundStyle(on ? t.text : t.muted).padding(.horizontal, label ? 12 : 13).frame(height: label ? 28 : 30).frame(maxWidth: label ? 180 : 200)
                .background(Capsule().fill(on ? t.bg : .clear))
            }
            .buttonStyle(.press).accessibilityLabel(x.title).accessibilityAddTraits(on ? .isSelected : [])
          }
        }
      }
      Color.clear.frame(width: 0, height: 0).flexGrow()
      if let make { LittlePill(label: "Make cards", icon: "sparkle", action: make) }
    }
  }
}

// ---------- Sources ----------
/// What the deck's cards were made from, newest first: a name, what it is and how big, how many cards, and when; press one to open it. Make cards is for its owner.
struct SourcesCard: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let deckId: String
  let rows: [SourceVM]
  let can: Bool
  let open: (SourceVM) -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 10) {
        Text("SOURCES").css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).accessibilityAddTraits(.isHeader)
        Text(String(rows.count)).css(12, mono: true).foregroundStyle(t.muted)
        Spacer(minLength: 0)
        if can { LittlePill(label: "Make cards", icon: "sparkle") { nav.make(deckId: deckId) } }
      }
      .frame(minHeight: 34)
      if rows.isEmpty {
        // (Just the one plain line: Make cards beside it says what to do, the owner's rule of no tips.)
        Text("Nothing here yet").css(14).foregroundStyle(t.muted)
          .padding(.top, 14).padding(.bottom, 20)
          .frame(maxWidth: .infinity, alignment: .leading)
          .overlay(alignment: .top) { t.line.frame(height: 1) }
      }
      VStack(spacing: 0) {
        ForEach(rows) { s in
          Button { open(s) } label: {
            HStack(spacing: 12) {
              Icon(s.icon, 17, 1.8).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.bg))
              VStack(alignment: .leading, spacing: 1) {
                Text(s.name).css(14, .semibold).lineLimit(1)
                Text(s.line).css(12).foregroundStyle(t.muted).lineLimit(1)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              Icon("chev", 15, 2).foregroundStyle(t.muted)
            }
            .foregroundStyle(t.text).padding(.vertical, 8).frame(minHeight: 60)
            .overlay(alignment: .top) { t.line.frame(height: 1) }
            .contentShape(Rectangle())
          }
          .buttonStyle(.flat)
          .accessibilityLabel("Open " + s.name).accessibilityValue(s.line)
        }
      }
    }
    .padding(.horizontal, 18).padding(.top, 18).padding(.bottom, 10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain).accessibilityLabel("Sources")
  }
}

// ---------- a source opened ----------
/// The sheet a source opens in, over the page: asks the library for the source each time, so one that was deleted closes it.
struct SourceHost: View {
  @EnvironmentObject private var store: Store
  let deckId: String, id: String, at: String
  var body: some View { SourceSheet(texts: store.sourceTexts, deckId: deckId, id: id, at: at) }
}
private struct SourceSheet: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// (What the sources said comes in here, so the sheet draws again when it does.)
  @ObservedObject var texts: SourceTexts
  let deckId: String, id: String, at: String
  var body: some View {
    SheetOverlay(top: 56, radius: 32, close: nav.close) {
      if let v = store.sourceView(deckId, id, at: at) { SourceViewer(deckId: deckId, view: v) }
      else { Color.clear.frame(height: 200).onAppear { nav.close() } }
    }
  }
}

struct SourceViewer: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String
  let view: SourceView
  @StateObject private var player = SourcePlayer()
  @State private var error = ""
  @State private var showing: ShownFile?
  @State private var photo: Int?
  @State private var seen = ""

  /// A kept file shown full screen: a PDF at its page, or anything else in Lucida's own document viewer (Design/DocumentView.swift).
  struct ShownFile: Identifiable { let id = UUID(); let url: URL; let pdf: Bool; let page: Int }

  var body: some View {
    let s = view.source
    VStack(alignment: .leading, spacing: 16) {
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text(s.name).css(22, .semibold, ls: -0.02).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
          Text(view.line).css(13).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Button { nav.close() } label: { Icon("close", 16, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
          .buttonStyle(.press).accessibilityLabel("Close")
      }
      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) {
          VStack(alignment: .leading, spacing: 14) {
            if view.hasAudio, let f = view.file { audio(f) }
            if !view.photos.isEmpty { photos(view.photos) }
            if let topic = view.topic { Text(topic).css(16, lh: 1.5).padding(.horizontal, 18).padding(.vertical, 16).frame(maxWidth: .infinity, alignment: .leading).background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf)) }
            let parts = view.parts
            if !parts.isEmpty { partsBox(parts) }
            if view.loading { Text("One moment…").css(14).foregroundStyle(t.muted) }
            if view.noText { Text(view.noTextLine).css(14, lh: 1.5).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
            if !error.isEmpty { Text(error).css(13).foregroundStyle(t.again) }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onChange(of: view.parts.map(\.hit)) { _, _ in scrollToHit(proxy) }
        .onAppear { scrollToHit(proxy) }
      }
      actions
    }
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .foregroundStyle(t.text)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .task(id: s.textName) { await store.loadSourceText(s.textName) }
    .fullScreenCover(item: $showing) { f in FileCover(file: f) { showing = nil } }
    .fullScreenCover(isPresented: Binding(get: { photo != nil }, set: { if !$0 { photo = nil } })) { PhotosCover(files: view.photos, start: photo ?? 0) { photo = nil } }
  }

  // ---------- what it holds ----------
  /// The recording: its player, set at the card's place in the part that covers it.
  private func audio(_ f: SourceFile) -> some View {
    let n = view.source.files.count, idx = view.part?.index ?? 0
    return SourcePlayerView(player: player, file: f, start: view.secsIn, label: n > 1 ? "part \(idx + 1) of \(n)" : "")
      .accessibilityIdentifier("recordingPlayer")
  }
  private func photos(_ files: [SourceFile]) -> some View {
    let cols = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
    return LazyVGrid(columns: cols, spacing: 8) {
      ForEach(Array(files.enumerated()), id: \.offset) { i, f in
        Button { photo = i } label: {
          Color.clear.aspectRatio(1, contentMode: .fit)
            .overlay { AsyncImage(url: API.media("/media/" + f.name)) { $0.resizable().scaledToFill() } placeholder: { t.surf } }
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
        }
        .buttonStyle(.flat).accessibilityLabel(f.file.isEmpty ? f.name : f.file)
      }
    }
  }
  /// What was said, in parts with their times; the one a card pointed at is marked.
  private func partsBox(_ parts: [SourcePart]) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      ForEach(parts) { p in
        VStack(alignment: .leading, spacing: 4) {
          if !p.at.isEmpty { Text(p.at).css(12, mono: true).foregroundStyle(p.hit ? t.text : t.muted) }
          Text(p.text).css(14, lh: 1.55).frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(p.hit ? t.bg : .clear))
        .padding(.horizontal, -10).padding(.vertical, -6)
        .id("part-\(p.id)")
        .accessibilityElement(children: .combine).accessibilityLabel((p.at.isEmpty ? "" : p.at + ". ") + p.text).accessibilityValue(p.hit ? "From the card" : "")
      }
    }
    .padding(.horizontal, 18).padding(.vertical, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
  }
  /// The part a card pointed at comes into the middle of the sheet, once.
  private func scrollToHit(_ proxy: ScrollViewProxy) {
    guard let hit = view.parts.first(where: \.hit), seen != view.source.id + "|" + view.at else { return }
    seen = view.source.id + "|" + view.at
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { proxy.scrollTo("part-\(hit.id)", anchor: .center) }
  }

  // ---------- what can be done with it ----------
  private var actions: some View {
    FlexWrap(gap: 8) {
      if view.hasOpen {
        Button { openIt() } label: {
          HStack(spacing: 8) { Icon("link", 16, 2); Text(view.openLabel).css(15, .semibold).lineLimit(1) }
            .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press).flexMin(130).flexBasisZero().flexGrow().accessibilityLabel(view.openLabel).debugValue(view.videoURL?.absoluteString)
      }
      if view.can {
        Button { nav.make(deckId: deckId, from: view.source.id) } label: {
          HStack(spacing: 8) { Icon("sparkle", 16, 2); Text("More cards").css(15, .semibold).lineLimit(1) }
            .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).flexMin(130).flexBasisZero().flexGrow().accessibilityLabel("More cards")
        Button { askDelete() } label: {
          Text("Delete").css(15, .semibold).foregroundStyle(t.again).padding(.horizontal, 20).frame(height: 48).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press).accessibilityLabel("Delete")
      }
    }
  }

  /// Open: a video goes to its own page at the card's time; a recording plays from the card's place; a file opens (a PDF at the page a card pointed at).
  private func openIt() {
    switch view.kind {
    case "video": if let u = view.videoURL { UIApplication.shared.open(u) }
    case "recording": player.play()
    default:
      guard let f = view.file else { return }
      error = ""
      Task {
        do {
          let url = try await store.fetchSourceFile(f)
          let pdf = f.type == "application/pdf" || (f.file as NSString).pathExtension.lowercased() == "pdf" || f.ext.lowercased() == "pdf"
          showing = ShownFile(url: url, pdf: pdf, page: Int(view.pageNo ?? "") ?? 1)
        } catch { self.error = (error as? APIError)?.errorDescription ?? "That file didn’t open. Try again." }
      }
    }
  }
  /// Delete asks first, in Lucida's own question: the file goes, and the cards made from it stay in the deck.
  private func askDelete() {
    let s = view.source
    nav.ask("Delete “\(s.name)”?", line: "Its file goes. The \(plural(s.cards, "card")) made from it stay in the deck.", action: "Delete", danger: true) { Task { await delete() } }
  }
  private func delete() async {
    do { try await store.sourceDelete(deckId, id: view.source.id); nav.close() }
    catch { self.error = (error as? APIError)?.errorDescription ?? "Couldn’t delete it. Try again." }
  }
}

extension Store {
  /// A source's file on this phone (downloaded once, by the name the server keeps it under, with its own ending so the right viewer opens it).
  func fetchSourceFile(_ f: SourceFile) async throws -> URL {
    if demo { throw APIError.server("That file isn’t here.") }
    let ext = (f.file as NSString).pathExtension.isEmpty ? (f.name as NSString).pathExtension : (f.file as NSString).pathExtension
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("lucida-sources", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let local = dir.appendingPathComponent((f.name as NSString).deletingPathExtension + "." + (ext.isEmpty ? "dat" : ext))
    if FileManager.default.fileExists(atPath: local.path) { return local }
    try await api.download("/media/" + f.name, to: local)
    return local
  }
}

// ---------- playing a recording ----------
/// A recording's player: the file for the part that covers the card's time is downloaded, set at the second inside it, and plays on Play (or Open the recording).
@MainActor
final class SourcePlayer: ObservableObject {
  @Published var loading = false
  @Published var playing = false
  @Published var failed = false
  @Published var position: Double = 0
  @Published var length: Double = 0
  @Published var muted = false
  /// How fast it plays (1 is as it was said).
  @Published var rate: Float = 1
  private var player: AVPlayer?
  private var timer: Timer?
  private var loaded = ""
  /// What the test (and the screen) can read: which file, and where it stands.
  var key: String { loaded }
  func load(_ f: SourceFile, start: Double, store: Store) {
    let key = "\(f.name)@\(Int(start))"
    guard key != loaded else { return }
    // A design screen has no file: the player sits at the start, like the canvas's audio control.
    if store.demo { loaded = key; position = 0; length = 0; return }
    loaded = key; loading = true; failed = false; playing = false; position = start
    player?.pause(); player = nil
    Task {
      do {
        let url = try await store.fetchSourceFile(f)
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        let item = AVPlayerItem(url: url), p = AVPlayer(playerItem: item)
        p.isMuted = muted; p.defaultRate = rate
        player = p
        let d = (try? await item.asset.load(.duration).seconds) ?? 0
        length = d.isFinite ? d : max(f.seconds, 0)
        let at = length > 0 ? min(start, length) : start
        await p.seek(to: CMTime(seconds: at, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        position = at; loading = false
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
          Task { @MainActor in
            guard let self, let p = self.player else { return }
            self.position = p.currentTime().seconds.isFinite ? p.currentTime().seconds : self.position
            self.playing = p.timeControlStatus == .playing
            if let it = p.currentItem, it.duration.seconds.isFinite, self.position >= it.duration.seconds - 0.05 { self.playing = false }
          }
        }
      } catch { loading = false; failed = true }
    }
  }
  func play() {
    guard let p = player else { return }
    if length > 0, position >= length - 0.05 { p.seek(to: .zero) }
    p.defaultRate = rate
    p.play(); playing = true
  }
  func pause() { player?.pause(); playing = false }
  func mute(_ on: Bool) { muted = on; player?.isMuted = on }
  func speed(_ r: Float) { rate = r; player?.defaultRate = r; if playing { player?.rate = r } }
  func seek(_ s: Double) { player?.seek(to: CMTime(seconds: s, preferredTimescale: 600)); position = s }
  deinit { timer?.invalidate() }
}

/// Lucida's own player for a source's recording (design/ui.mjs playerMarkup, the web's too), never a system bar: a round play and pause button, the time,
/// a thin track to touch or drag, the length, and the speed (a tap goes 1×, 1.25×, 1.5×, 2×, 0.75×).
struct SourcePlayerView: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @ObservedObject var player: SourcePlayer
  let file: SourceFile
  let start: Double
  /// "part 10 of 13" for a recording kept as several files.
  let label: String
  static let rates: [Float] = [1, 1.25, 1.5, 2, 0.75]

  var body: some View {
    HStack(spacing: 12) {
      Button { player.playing ? player.pause() : player.play() } label: {
        Icon(player.playing ? "pause" : "play", 16, 2).foregroundStyle(t.invText).frame(width: 40, height: 40).background(Circle().fill(t.inv)).opacity(player.loading || player.failed ? 0.5 : 1)
      }
      .buttonStyle(.press).disabled(player.loading || player.failed).accessibilityLabel(player.playing ? "Pause" : "Play")
      if player.failed {
        Text("This recording didn’t open.").css(13).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading)
      } else {
        Text(clock(player.position)).css(12, mono: true).monospacedDigit().foregroundStyle(t.muted).frame(minWidth: 38, alignment: .leading).fixedSize()
        track
        Text(player.length > 0 ? clock(player.length) : "0:00").css(12, mono: true).monospacedDigit().foregroundStyle(t.muted).frame(minWidth: 38, alignment: .trailing).fixedSize()
        Button { player.speed(Self.rates[(Self.rates.firstIndex(of: player.rate).map { $0 + 1 } ?? 0) % Self.rates.count]) } label: {
          Text(rateLabel).css(12, .semibold).monospacedDigit().foregroundStyle(t.text).frame(minWidth: 46).frame(height: 30).background(Capsule().fill(t.bg))
        }
        .buttonStyle(.press).accessibilityLabel("Speed, " + rateLabel)
      }
    }
    .padding(.leading, 8).padding(.trailing, 12).padding(.vertical, 8).frame(minHeight: 56)
    .background(Capsule().fill(t.surf))
    .onAppear { player.load(file, start: start, store: store) }
    .onChange(of: file.name + "@\(Int(start))") { _, _ in player.load(file, start: start, store: store) }
    .accessibilityElement(children: .contain)
    .accessibilityLabel(label.isEmpty ? "Recording" : "Recording, " + label)
    .accessibilityValue(label.isEmpty ? clock(start) : label + ", at " + clock(start))
  }

  /// The thin track: the part played in the text's color, a small knob, a touch or a drag anywhere on it moves there.
  private var track: some View {
    GeometryReader { g in
      let frac = player.length > 0 ? min(1, player.position / player.length) : 0
      ZStack(alignment: .leading) {
        Capsule().fill(t.surf2).frame(height: 4)
        Capsule().fill(t.inv).frame(width: max(4, g.size.width * frac), height: 4)
        Circle().fill(t.inv).frame(width: 12, height: 12).offset(x: max(0, g.size.width * frac - 6))
      }
      .frame(maxHeight: .infinity)
      .contentShape(Rectangle())
      .gesture(DragGesture(minimumDistance: 0).onChanged { v in if player.length > 0 { player.seek(max(0, min(1, v.location.x / g.size.width)) * player.length) } })
    }
    .frame(height: 36)
    .accessibilityElement().accessibilityLabel("Position")
    .accessibilityValue(clock(player.position) + (player.length > 0 ? " of " + clock(player.length) : ""))
    .accessibilityAdjustableAction { dir in
      guard player.length > 0 else { return }
      player.seek(max(0, min(player.length, player.position + (dir == .increment ? 5 : -5))))
    }
  }
  private var rateLabel: String { player.rate == 0.75 ? ".75×" : String(format: "%g", player.rate) + "×" }
  private func clock(_ s: Double) -> String {
    let n = Int(max(0, s)); return n >= 3600 ? String(format: "%d:%02d:%02d", n / 3600, n / 60 % 60, n % 60) : String(format: "%d:%02d", n / 60, n % 60)
  }
}

extension View {
  /// Where a button goes, for a check to read (debug builds only: it isn't something to say aloud).
  @ViewBuilder func debugValue(_ v: String?) -> some View {
    #if DEBUG
    if let v, !v.isEmpty { accessibilityValue(v) } else { self }
    #else
    self
    #endif
  }
}

// ---------- a file or the photos, full screen ----------
struct FileCover: View {
  let file: SourceViewer.ShownFile
  let close: () -> Void
  var body: some View {
    ZStack(alignment: .topTrailing) {
      if file.pdf { PDFPageView(url: file.url, page: file.page).ignoresSafeArea() } else { DocumentView(url: file.url) }
      Button(action: close) {
        Text("Done").font(.geist(15, .semibold)).foregroundStyle(.white).padding(.horizontal, 16).frame(height: 40).background(Capsule().fill(Color.black.opacity(0.7)))
      }
      .padding(.trailing, 16).padding(.top, 8).accessibilityLabel("Close the file")
    }
    .background(Color.black.ignoresSafeArea())
  }
}
/// A PDF that opens on a page: it goes there once it has a size (PDFKit ignores a move made before it is laid out).
final class StartPDFView: PDFView {
  var startPage = 1
  private var moved = false
  override func layoutSubviews() {
    super.layoutSubviews()
    guard !moved, bounds.width > 0, bounds.height > 0, let doc = document, doc.pageCount > 0 else { return }
    moved = true
    if let p = doc.page(at: max(0, min(startPage, doc.pageCount) - 1)) { go(to: p) }
  }
}
struct PDFPageView: UIViewRepresentable {
  let url: URL, page: Int
  func makeUIView(context: Context) -> PDFView {
    let v = StartPDFView()
    v.startPage = page
    v.autoScales = true; v.displayMode = .singlePageContinuous; v.displayDirection = .vertical
    v.document = PDFDocument(url: url)
    v.isAccessibilityElement = true
    v.accessibilityIdentifier = "pdfView"
    v.accessibilityLabel = "The file"
    context.coordinator.watch(v)
    return v
  }
  func updateUIView(_ v: PDFView, context: Context) {}
  func makeCoordinator() -> Coordinator { Coordinator() }
  /// Says which page it is on ("page 3 of 3"), as a person (and a check) can read it.
  final class Coordinator: NSObject {
    private var token: NSObjectProtocol?
    private var timer: Timer?
    func watch(_ v: PDFView) {
      func say() { if let doc = v.document, let p = v.currentPage { v.accessibilityValue = "page \(doc.index(for: p) + 1) of \(doc.pageCount)" } }
      token = NotificationCenter.default.addObserver(forName: .PDFViewPageChanged, object: v, queue: .main) { _ in say() }
      timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { _ in say() }
    }
    deinit { if let t = token { NotificationCenter.default.removeObserver(t) }; timer?.invalidate() }
  }
}
struct PhotosCover: View {
  let files: [SourceFile]
  let start: Int
  let close: () -> Void
  @State private var index = 0
  var body: some View {
    ZStack(alignment: .topTrailing) {
      TabView(selection: $index) {
        ForEach(Array(files.enumerated()), id: \.offset) { i, f in
          AsyncImage(url: API.media("/media/" + f.name)) { $0.resizable().scaledToFit() } placeholder: { LoadingMark(color: .white) }
            .tag(i).accessibilityLabel(f.file.isEmpty ? f.name : f.file)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      // (Lucida's own dots, not the system's.)
      if files.count > 1 {
        HStack(spacing: 8) { ForEach(0..<files.count, id: \.self) { i in Circle().fill(Color.white.opacity(i == index ? 1 : 0.35)).frame(width: 7, height: 7) } }
          .frame(maxHeight: .infinity, alignment: .bottom).padding(.bottom, 34).allowsHitTesting(false)
          .accessibilityElement().accessibilityLabel("Photo \(index + 1) of \(files.count)")
      }
      Button(action: close) {
        Text("Done").font(.geist(15, .semibold)).foregroundStyle(.white).padding(.horizontal, 16).frame(height: 40).background(Capsule().fill(Color.white.opacity(0.18)))
      }
      .padding(.trailing, 16).padding(.top, 8).accessibilityLabel("Close the photo")
    }
    .background(Color.black.ignoresSafeArea())
    .onAppear { index = start }
  }
}
