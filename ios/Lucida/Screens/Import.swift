// iPhone · Import cards (PhoneImport, and its Dark and Gray twins; `-board PhoneImport -state Pasted` shows any of the canvas's states): the web's
// Import page (WebImport, design/build.mjs importLogic) one for one, as a sheet over the page it came from. Paste cards into the box or choose a
// text file (an Anki or Quizlet export, a CSV), read the way the web reads them (Data/ReadCards.swift), the deck (a name, or one of your decks),
// and Import, which sends data.import (a thousand cards at a time) and opens the deck. It opens from the Library's + and a new
// account's Import cards. What goes wrong is a quiet line in the sheet, never an alert. Each part is a
// small view of its own, so the sheet stays light to lay out.
import SwiftUI
import UniformTypeIdentifiers

// ---------- what it holds and does ----------
/// The Import sheet's state and actions (importLogic): the words in the box, the deck's name, the cards found, and sending them.
@MainActor final class ImportModel: ObservableObject {
  let store: Store, nav: Nav
  /// The deck it was opened with ("" for none): its name starts in the field, and Import goes into it first.
  let here: String
  @Published private(set) var text = ""
  /// The deck's name as typed or picked (nil: the deck it opened with).
  @Published private(set) var deck: String? = nil
  @Published private(set) var cards: [ReadCard] = []
  /// A long text is read off the main thread; until then nothing is said about it.
  @Published private(set) var counting = false
  @Published private(set) var busy = false
  @Published private(set) var error: String? = nil
  /// How many of these cards went in already, and where (a send that stopped part way goes on from there instead of starting over).
  private var sent = 0, sentTo = ""
  private var reading: Task<Void, Never>?

  init(store: Store, nav: Nav, deckId: String) { self.store = store; self.nav = nav; here = deckId }

  var hereDeck: Deck? { here.isEmpty ? nil : store.lib.decks.first { $0.id == here } }
  /// The decks offered as chips (db.decks(), the first six), by name.
  var deckNames: [String] { store.demo ? store.libraryDecks().prefix(6).map(\.name) : store.lib.decks.prefix(6).map(\.name) }
  var deckName: String { deck ?? (store.demo ? "" : hereDeck?.name ?? "") }
  /// "3 cards found", or how to write them when the box has words and none are cards.
  var found: String {
    if counting { return "" }
    if !cards.isEmpty { return Self.plural(cards.count, "card") + " found" }
    return ReadCards.trim(text).isEmpty ? "" : "No cards yet. Put the front and back on one line, split by a tab or comma."
  }
  var label: String { busy ? "Importing…" : cards.isEmpty || counting ? "Import cards" : "Import " + Self.plural(cards.count, "card") }
  var ready: Bool { !cards.isEmpty && !counting && !busy }
  /// rich.js's plural (no thousands comma, like the web's Import page).
  static func plural(_ n: Int, _ w: String) -> String { "\(n) \(w)" + (n == 1 ? "" : "s") }
  /// The same letters (JavaScript's ===, which Swift's == is not for accents written two ways).
  static func same(_ a: String, _ b: String) -> Bool { a.utf16.elementsEqual(b.utf16) }

  func setText(_ t: String) {
    guard !Self.same(t, text) else { return }
    text = t; error = nil; sent = 0
    reading?.cancel()
    if t.utf16.count < 20_000 { cards = Self.read(t); counting = false; return }
    counting = true
    reading = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 150_000_000)
      guard !Task.isCancelled else { return }
      let c = await Task.detached(priority: .userInitiated) { ImportModel.read(t) }.value
      guard !Task.isCancelled, let self, Self.same(self.text, t) else { return }
      self.cards = c; self.counting = false
    }
  }
  nonisolated static func read(_ t: String) -> [ReadCard] { ReadCards.read(t, name: "").flatMap(\.cards) }
  func setDeck(_ name: String) { guard !Self.same(name, deckName) else { return }; deck = name; error = nil; sent = 0 }

  /// A file from the Files picker (or `-importFile`): its words go in the box, as the web's Choose a file does.
  func pick(_ url: URL) {
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
    if size > 20_000_000 { error = "That file is over 20 MB."; return }
    guard let data = try? Data(contentsOf: url), let words = ReadCards.text(data) else { error = "That file couldn’t be read."; return }
    setText(words)
  }

  /// Import (importLogic doImport): into the deck with that name (this deck first), or a new deck when no deck has it; then that deck opens.
  func go() async {
    guard ready, !store.demo else { return }
    Keyboard.hide()
    let typed = ReadCards.trim(deckName), name = typed.isEmpty ? "Imported cards" : typed, decks = store.lib.decks
    let same = hereDeck.flatMap { Self.same($0.name, name) ? $0 : nil } ?? decks.first { Self.same(ReadCards.trim($0.name).lowercased(), name.lowercased()) }
    busy = true; error = nil
    defer { busy = false }
    var deckId = sent > 0 ? sentTo : same?.id ?? "", i = sent
    while i < cards.count {
      let chunk = cards[i..<min(i + 1000, cards.count)].map(\.json)
      do {
        let r = try await store.api.action("data.import", ["deckId": deckId, "deckName": name, "cards": chunk])
        store.accept(r.state)
        deckId = r.result["deckId"] as? String ?? deckId
        i += chunk.count; sent = i; sentTo = deckId
      } catch APIError.signedOut { store.phase = .signedOut; return }
      catch APIError.server(let m) { self.error = API.plain(m); return }
      catch is URLError { self.error = "Couldn’t reach Lucida. Check your connection and try again."; return }
      catch { self.error = "That didn’t work. Try again in a minute."; return }
    }
    Buzz.shared.success("cards imported")
    withAnimation(.out(0.3)) { nav.openDeck(deckId) }
  }

  /// The canvas's states (PhoneImport's Tweak, build.mjs IMPORT_STATES), with its samples.
  func show(_ state: String) {
    let chosen = ["Deck chosen", "Importing", "Error"].contains(state)
    setText(["Empty": "", "A file picked": ImportSample.file, "No cards": "Notes from Tuesday’s lecture"][state] ?? ImportSample.pasted)
    deck = chosen ? "Japanese · JLPT N4" : ""
    busy = state == "Importing"
    error = state == "Error" ? "Couldn’t reach Lucida. Check your connection and try again." : nil
  }
}

enum ImportSample {
  static let pasted = "でんしゃ\ttrain\nねこ\tcat\nみず\twater"
  /// build.mjs IMPORT_FILE: a short Anki export.
  static let file = "#separator:tab\n#html:false\n" + [
    ("What organelle makes most of the cell’s ATP?", "The mitochondria"), ("What do ribosomes do?", "They build proteins"),
    ("Which organelle packages and ships proteins?", "The Golgi apparatus"), ("What surrounds and protects a cell?", "The plasma membrane"), ("What do lysosomes do?", "Break down waste"),
    ("Where does photosynthesis happen?", "In the chloroplasts"), ("What does rough ER have that smooth ER lacks?", "Ribosomes"), ("Where is DNA kept?", "In the nucleus"),
    ("What is the cytoplasm?", "The gel that fills the cell"), ("What do mitochondria have of their own?", "Their own DNA"), ("What is the cytoskeleton?", "A network of protein fibers"),
    ("What do vacuoles store?", "Water, food and waste")].map { $0.0 + "\t" + $0.1 }.joined(separator: "\n")
}

#if DEBUG
enum ImportDebug {
  /// `-importFile <path>`: that file, read as if it was chosen, the first time the sheet opens.
  static var file: String? = Board.arg("-importFile")
}
#endif

// ---------- the sheet ----------
/// The sheet's host (`nav.importCards(deckId:)`): the model is made once, with the app around it.
struct ImportHost: View {
  @StateObject private var model: ImportModel
  init(deckId: String, store: Store, nav: Nav) {
    let m = ImportModel(store: store, nav: nav, deckId: deckId)
    if store.demo { m.show(Board.arg("-state") ?? "Deck chosen") }
    _model = StateObject(wrappedValue: m)
  }
  var body: some View {
    // (The X, a tap outside and a pull down all close it, except while the cards are on their way.)
    SheetOverlay(top: nil, radius: 36, close: { if !model.busy { model.nav.close() } }) { ImportSheet(model: model) }
      .task {
        #if DEBUG
        if let p = ImportDebug.file, !model.store.demo { ImportDebug.file = nil; model.pick(URL(fileURLWithPath: p)) }
        #endif
      }
  }
}

struct ImportSheet: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: ImportModel
  @StateObject private var keyboard = Keyboard()
  @FocusState private var focus: ImportField?
  /// The middle's own height (measured; it starts near what it is, so the sheet doesn't grow as it slides in).
  @State private var middle: CGFloat = 440
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      ImportHeader(model: model)
      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) { ImportMiddle(model: model, focus: $focus) }
          .scrollDismissesKeyboard(.interactively)
          .onScrollGeometryChange(for: CGFloat.self, of: { $0.contentSize.height }) { _, h in if h > 0 { middle = h } }
          .frame(height: min(middle, room))
        // The deck's name comes into view above the keyboard.
        .onChange(of: focus) { _, f in
          guard f == .deck else { return }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.out(0.25)) { proxy.scrollTo(ImportField.deck, anchor: .bottom) } }
        }
      }
      if let e = model.error {
        CSSText(e, 13, lh: 1.4, color: t.again).accessibilityIdentifier("importError").transition(.opacity)
      }
      ImportFooter(model: model)
    }
    .foregroundStyle(t.text)
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 12 : 34)
    .animation(Motion.fade, value: model.error)
  }
  /// The height the middle may take: what's left of the screen above the keyboard, below the status bar, the title and the buttons.
  private var room: CGFloat {
    let screen = UIScreen.main.bounds.height, bottom = keyboard.height > 0 ? keyboard.height + 12 : 34
    return max(120, screen - Screen.safeTop - 12 - 16 - 40 - 16 - (model.error == nil ? 0 : 52) - 52 - 16 - bottom)
  }
}
enum ImportField: Hashable { case deck }

/// The title and the X.
private struct ImportHeader: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: ImportModel
  var body: some View {
    HStack {
      Text("Import cards").css(22, .semibold, ls: -0.02).accessibilityAddTraits(.isHeader)
      Spacer()
      Button { if !model.busy { model.nav.close() } } label: { Icon("close", 16, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
        .buttonStyle(.press).accessibilityLabel("Close")
    }
  }
}

/// The box, Choose a file with what was found, and the deck.
private struct ImportMiddle: View {
  @ObservedObject var model: ImportModel
  var focus: FocusState<ImportField?>.Binding
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      VStack(alignment: .leading, spacing: 8) {
        Text("Cards").css(13, .semibold).accessibilityHidden(true)
        ImportBox(text: Binding(get: { model.text }, set: { model.setText($0) }))
      }
      ImportFileRow(model: model)
      ImportDeckPicker(model: model, focus: focus)
    }
  }
}

/// The box to paste cards into: Geist Mono at 13 points, eight lines of 1.6, scrolling inside itself (the web's textarea).
private struct ImportBox: View {
  @Environment(\.theme) private var t
  @Binding var text: String
  private static let size: CGFloat = 13, line: CGFloat = 13 * 1.6, inset = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
  var body: some View {
    ImportTextView(text: $text, line: Self.line, inset: Self.inset, color: UIColor(t.text))
      .frame(height: 8 * Self.line + Self.inset.top + Self.inset.bottom)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      .overlay(alignment: .topLeading) {
        if text.isEmpty {
          Text("One card per line: front, then back").font(.mono(Self.size)).foregroundStyle(PLACEHOLDER)
            .padding(.top, Self.inset.top + (Self.line - Self.size * GEIST_LINE) / 2).padding(.leading, Self.inset.left)
            .allowsHitTesting(false).accessibilityHidden(true)
        }
      }
  }
}
private struct ImportTextView: UIViewRepresentable {
  @Binding var text: String
  let line: CGFloat, inset: UIEdgeInsets, color: UIColor
  private static let font = GuideFont.mono(13)
  /// A tab is eight spaces wide, as in the browser's textarea (tab-size: 8), so Anki's and Quizlet's columns line up.
  private static let tab = 8 * (" " as NSString).size(withAttributes: [.font: font]).width
  private var attrs: [NSAttributedString.Key: Any] {
    let para = NSMutableParagraphStyle(); para.minimumLineHeight = line; para.maximumLineHeight = line
    para.tabStops = []; para.defaultTabInterval = Self.tab
    // (Half the leading above the words, like CSS, and a point more: measured against the board, the text view sets Geist Mono a point lower than Chrome.)
    return [.font: Self.font, .foregroundColor: color, .paragraphStyle: para, .baselineOffset: (line - 13 * GEIST_LINE) / 2 + 1]
  }
  func makeUIView(context: Context) -> UITextView {
    // (The older text engine keeps every line at the height set for it, as the browser's textarea does.)
    let v = UITextView(usingTextLayoutManager: false)
    v.backgroundColor = .clear; v.textContainerInset = inset; v.textContainer.lineFragmentPadding = 0
    v.showsVerticalScrollIndicator = false; v.delegate = context.coordinator
    // Cards are typed as they are: no capitals, corrections, or curly quotes (a CSV's "" stays "").
    v.autocapitalizationType = .none; v.autocorrectionType = .no; v.spellCheckingType = .no
    v.smartQuotesType = .no; v.smartDashesType = .no; v.smartInsertDeleteType = .no
    v.accessibilityLabel = "Cards"; v.accessibilityIdentifier = "importText"; v.tintColor = color
    v.typingAttributes = attrs; v.attributedText = NSAttributedString(string: text, attributes: attrs)
    return v
  }
  func updateUIView(_ v: UITextView, context: Context) {
    context.coordinator.parent = self
    if v.text != text { v.attributedText = NSAttributedString(string: text, attributes: attrs) }
    v.typingAttributes = attrs; v.tintColor = color
    if v.textColor != color { v.textColor = color }
  }
  func makeCoordinator() -> Coordinator { Coordinator(self) }
  final class Coordinator: NSObject, UITextViewDelegate {
    var parent: ImportTextView
    init(_ p: ImportTextView) { parent = p }
    func textViewDidChange(_ v: UITextView) { if parent.text != v.text { parent.text = v.text } }
  }
}

/// Choose a file (the phone's Files picker: a .txt, .csv or .tsv), and what was found.
private struct ImportFileRow: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: ImportModel
  @State private var choosing = false
  var body: some View {
    HStack(spacing: 12) {
      Button { if !model.store.demo { Keyboard.hide(); choosing = true } } label: {
        HStack(spacing: 6) { Icon("upload", 14, 2); Text("Choose a file").css(13, .semibold).lineLimit(1) }
          .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(t.surf))
      }
      .buttonStyle(.press).fixedSize()
      Text(model.found).css(13, lh: 1.4).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("importFound")
    }
    .background(Color.clear.fileImporter(isPresented: $choosing, allowedContentTypes: [.plainText, .commaSeparatedText, .tabSeparatedText]) { r in
      if case .success(let url) = r { model.pick(url) }
    })
  }
}

/// Into deck: the name (a new deck's, or one of yours), and chips of your decks.
private struct ImportDeckPicker: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: ImportModel
  var focus: FocusState<ImportField?>.Binding
  @State private var picks = 0
  var body: some View {
    let name = model.deckName
    VStack(alignment: .leading, spacing: 8) {
      Text("Into deck").css(13, .semibold).accessibilityHidden(true)
      TextField("", text: Binding(get: { model.deckName }, set: { model.setDeck($0) }), prompt: Text("New deck name").foregroundStyle(PLACEHOLDER))
        .font(.geist(16)).foregroundStyle(t.text).tint(t.text).submitLabel(.done)
        .focused(focus, equals: .deck)
        .padding(.horizontal, 16).frame(height: 40)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        .accessibilityLabel("Into deck").accessibilityIdentifier("importDeck")
        .id(ImportField.deck)
      FlowLayout(spacing: 6, lineSpacing: 6) {
        ForEach(Array(model.deckNames.enumerated()), id: \.offset) { _, d in
          let on = ImportModel.same(d, name)
          Button { picks += 1; model.setDeck(d) } label: {
            Text(d).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press)
          .accessibilityLabel(d).accessibilityAddTraits(on ? .isSelected : []).accessibilityIdentifier("importChip")
        }
      }
      .animation(Motion.knob, value: name)
    }
    .haptic(.selection, on: picks, "import deck")
  }
}

/// Cancel, and Import (black once there are cards).
private struct ImportFooter: View {
  @Environment(\.theme) private var t
  @ObservedObject var model: ImportModel
  var body: some View {
    let lit = model.ready || model.busy
    FlexRow(spacing: 10) {
      Button { if !model.busy { model.nav.close() } } label: {
        Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf))
      }
      .buttonStyle(.press)
      Button { Task { await model.go() } } label: {
        Text(model.label).css(15, .semibold).lineLimit(1).foregroundStyle(lit ? t.invText : t.muted)
          .frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(lit ? t.inv : t.surf2))
      }
      .buttonStyle(.press)
      .accessibilityIdentifier("importGo")
      .grow(2)
    }
  }
}
