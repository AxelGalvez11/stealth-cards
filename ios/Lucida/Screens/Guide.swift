// iPhone · A deck's Guide editor (PhoneGuide: Write, Preview, Older versions, A new page, Nothing written yet, and the Dark and Gray twins): the Guide and its
// extra pages as a page of its own, opened from the deck page's Notes (Edit, Write, Add a guide). Write is Markdown in a text field with a toolbar over it (Heading,
// Bold, Italic, Code, Link, Bulleted list, Numbered list, Task list, Quote, Table, Picture); Preview draws it the way the deck page will; it saves as it's typed
// (a moment after the last key, one save after another: Saving… and Saved at the top); History lists older versions and brings one back; a page of its own has a
// name and can go; Make cards makes cards from the page (or from what is selected); Done goes back to the deck's Notes.
//
// The words are Markdown read by web/guide.js (Data/GuideEngine.swift); what the toolbar makes of the text and the selection, and what Enter in a list does, come
// from that same file, so the iPhone writes exactly what the web does. The memory of the page (what is typed, saving) is GuideEditorModel (Data/GuideData.swift).
import SwiftUI
import PhotosUI

// ---------- the text field ----------
/// The editor's text field: Geist Mono at 14 on a line of 1.65, with the text and the selection in its own hands (so a button can ask what is selected and
/// put the new text back with the new selection).
final class GuideField: UITextView {
  /// 16 points: the web's page makes a phone's text fields at least that big (so a phone's browser doesn't zoom in when one is touched).
  static let size: CGFloat = 16
  /// (The older text system, as the Markdown view uses: the newer one does not keep a line to the height a paragraph asks for, so the lines came out closer than the web's.)
  convenience init() {
    let storage = NSTextStorage(), lm = NSLayoutManager(), tc = NSTextContainer(size: CGSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
    storage.addLayoutManager(lm); lm.addTextContainer(tc)
    tc.widthTracksTextView = true
    self.init(frame: .zero, textContainer: tc)
  }
  var ink = UIColor.label
  var attrs: [NSAttributedString.Key: Any] {
    let L = Self.size * 1.65, shift = (L - Self.size * GEIST_LINE) / 2
    let p = NSMutableParagraphStyle(); p.minimumLineHeight = L; p.maximumLineHeight = L
    return [.font: GuideFont.mono(Self.size), .foregroundColor: ink, .paragraphStyle: p, .baselineOffset: shift]
  }
  /// Puts words in (the field's own text, in its type), keeping the keys that follow in the same type.
  func setGuideText(_ s: String) {
    attributedText = NSAttributedString(string: s, attributes: attrs)
    typingAttributes = attrs
  }
}

/// What the screen's buttons ask of the text field.
@MainActor
final class GuideTextControl: ObservableObject {
  fileprivate weak var view: GuideField?
  /// Called when the words change (typed, or by a button).
  var onChange: (String) -> Void = { _ in }
  var text: String { view?.text ?? "" }
  /// What's selected (nothing: an empty line).
  var selected: String {
    guard let v = view, v.selectedRange.length > 0 else { return "" }
    return (v.text as NSString).substring(with: v.selectedRange)
  }
  /// A button's result goes in: the new text, and the selection in it.
  func apply(_ e: GuideEdit) {
    guard let v = view else { return }
    v.setGuideText(e.text)
    v.selectedRange = NSRange(location: min(max(0, e.a), (e.text as NSString).length), length: max(0, min(e.b, (e.text as NSString).length) - e.a))
    v.scrollRangeToVisible(v.selectedRange)
    onChange(e.text)
  }
  /// One of guide.js's toolbar helpers on the text and the selection: bold, italic, code, bullets, numbers, tasks, quote, table.
  func act(_ fn: String) {
    guard let v = view else { return }
    let sel = v.selectedRange
    if let e = GuideEngine.shared.edit(fn, v.text, sel.location, sel.location + sel.length) { apply(e); v.becomeFirstResponder() }
  }
  func heading(_ level: Int = 2) {
    guard let v = view else { return }
    let sel = v.selectedRange
    if let e = GuideEngine.shared.heading(v.text, sel.location, sel.location + sel.length, level: level) { apply(e); v.becomeFirstResponder() }
  }
  func link() {
    guard let v = view else { return }
    let sel = v.selectedRange
    if let e = GuideEngine.shared.link(v.text, sel.location, sel.location + sel.length, url: "") { apply(e); v.becomeFirstResponder() }
  }
  /// A picture that was uploaded goes in where the caret is.
  func picture(_ src: String) {
    guard let v = view else { return }
    let sel = v.selectedRange
    if let e = GuideEngine.shared.image(v.text, sel.location, sel.location + sel.length, src: src) { apply(e) }
  }
}

struct GuideTextArea: UIViewRepresentable {
  @Environment(\.theme) private var t
  let text: String
  /// Which page's words these are: when it changes the field is filled with the new page's.
  let identity: String
  let control: GuideTextControl
  func makeUIView(context: Context) -> GuideField {
    let v = GuideField()
    v.ink = UIColor(t.text)
    v.backgroundColor = .clear
    v.textContainerInset = UIEdgeInsets(top: 16, left: 18, bottom: 16, right: 18); v.textContainer.lineFragmentPadding = 0
    // Markdown is typed as it is: no curly quotes, long dashes or other tidying.
    v.smartQuotesType = .no; v.smartDashesType = .no; v.smartInsertDeleteType = .no
    v.alwaysBounceVertical = true; v.keyboardDismissMode = .interactive
    v.accessibilityLabel = "Guide, in Markdown"
    v.delegate = context.coordinator
    v.setGuideText(text)
    context.coordinator.identity = identity
    control.view = v
    return v
  }
  func updateUIView(_ v: GuideField, context: Context) {
    context.coordinator.control = control
    control.view = v
    let ink = UIColor(t.text)
    if v.ink != ink { v.ink = ink; v.setGuideText(v.text) }
    if context.coordinator.identity != identity {
      context.coordinator.identity = identity
      v.setGuideText(text); v.selectedRange = NSRange(location: 0, length: 0)
    } else if v.markedTextRange == nil && v.text != text {
      // (Words that came from outside, like an older version brought back.)
      v.setGuideText(text)
    }
  }
  /// It takes the room it is given (a text view would otherwise answer with the height of its words).
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: GuideField, context: Context) -> CGSize? {
    CGSize(width: proposal.width ?? 358, height: proposal.height ?? 300)
  }
  func makeCoordinator() -> Coordinator { Coordinator(control) }
  final class Coordinator: NSObject, UITextViewDelegate {
    var control: GuideTextControl
    var identity = ""
    init(_ c: GuideTextControl) { control = c }
    func textViewDidChange(_ v: UITextView) { control.onChange(v.text) }
    /// Enter in a list goes on to the next item (and on an empty item, ends the list), as guide.js says.
    func textView(_ v: UITextView, shouldChangeTextIn range: NSRange, replacementText t: String) -> Bool {
      guard t == "\n", range.length == 0, v.markedTextRange == nil, let f = v as? GuideField, let r = GuideEngine.shared.continueList(v.text, range.location) else { return true }
      f.setGuideText(r.text)
      f.selectedRange = NSRange(location: r.pos, length: 0)
      f.scrollRangeToVisible(f.selectedRange)
      control.onChange(r.text)
      return false
    }
  }
}

// ---------- the screen ----------
struct GuideScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  @StateObject private var model: GuideEditorModel
  @StateObject private var field = GuideTextControl()
  let deckId: String
  @State private var picking = false
  @State private var name = ""

  @FocusState private var nameFocus: Bool
  /// The design screen's page that doesn't exist yet (A new page).
  private let demoNewPage = MakeGuidePage(id: "gnew", title: "New page")

  init(deckId: String, page: String = "") {
    self.deckId = deckId
    let want = page.isEmpty ? "main" : page
    _model = StateObject(wrappedValue: GuideEditorModel(deckId: deckId, page: want))
  }

  private var demoView: String { store.demo ? store.props.guideView : "" }

  var body: some View {
    let d = store.deck(deckId), g = store.guide(deckId)
    let extra = g.pages + (demoView == "A new page" ? [demoNewPage] : [])
    let want = store.demo && demoView == "A new page" && model.page == "main" ? "gnew" : model.page
    let pageId = extra.contains(where: { $0.id == want }) ? want : "main"
    let cur: (id: String, title: String, text: String) = pageId == "main" ? ("main", "Guide", g.text) : extra.first { $0.id == pageId }.map { ($0.id, $0.title, $0.text) } ?? ("main", "Guide", g.text)
    let text = model.drafts[model.key(pageId)] ?? (demoView == "Nothing written yet" ? "" : cur.text)
    let canAdd = g.can && extra.count < store.lib.make.guidePages
    let hist = model.historyOpen || demoView == "Older versions"
    GeometryReader { geo in
      VStack(spacing: 12) {
        header(d.name, hist: hist)
        pages(extra: extra, pageId: pageId, canAdd: canAdd)
        if g.can && pageId != "main" { pageTools(cur) }
        if !hist {
          VStack(alignment: .leading, spacing: 10) {
            Segmented(options: [("write", "Write"), ("preview", "Preview")], current: previewing ? "preview" : "write", height: 32, size: 13, equal: false, pad: 3, gap: 0, hPad: 16) { model.preview = $0 == "preview" }
              .fixedSize()
            if !previewing { toolbar }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          editor(text: text, pageId: pageId)
          HStack(spacing: 10) {
            pill("Make cards", icon: "sparkle", inv: false) { makeCards(pageId: pageId, deckName: d.name, title: cur.title) }
            pill("Done", inv: true) { Task { await done() } }.accessibilityIdentifier("doneButton")
          }
        } else {
          historyList(pageId: pageId, title: cur.title)
          pill("Back to writing", inv: false) { Task { await model.toggleHistory() } }
        }
      }
      .foregroundStyle(t.text)
      .padding(.top, Screen.top(58)).padding(.horizontal, 16).padding(.bottom, keyboard.height + 22)
      // (The page lays itself out on the whole screen, and makes room for the keyboard with the padding above. With the keyboard up the system stretched this region 70 points
      // above the top of the screen, which put the header under the status bar: so the page is put back where the screen starts, by however far its region has moved.)
      .frame(width: geo.size.width, height: UIScreen.main.bounds.height, alignment: .top)
      .offset(y: -geo.frame(in: .global).minY)
    }
    .ignoresSafeArea(.all, edges: [.top, .bottom])
    .toolbar(.hidden, for: .navigationBar)
    .onAppear { start(pageId); if !store.demo && !g.can { nav.back() } }
    .onChange(of: pageId) { _, p in name = p == "main" ? "" : (extra.first { $0.id == p }?.title ?? "") }
    .photoPicker($picking) { field.picture($0) }
  }

  private var previewing: Bool { model.preview || demoView == "Preview" }

  /// The first time on screen: the model gets its acts from the app (the design screens save nothing), the field its way of saying words changed, and a
  /// design screen its view.
  private func start(_ pageId: String) {
    model.env = GuideEditorModel.Env(
      save: { [store] d, p, text in try await store.guideSave(d, page: p, text: text) },
      addPage: { [store] d, title in try await store.guideAddPage(d, title: title) },
      rename: { [store] d, p, title in try await store.guideRenamePage(d, page: p, title: title) },
      delete: { [store] d, p in try await store.guideDeletePage(d, page: p) },
      restore: { [store] d, p, at in try await store.guideRestore(d, page: p, at: at) },
      history: { [store] d, p in await store.guideHistory(d, page: p) })
    field.onChange = { [model] in model.type($0) }
    if store.demo {
      model.page = demoView == "A new page" ? "gnew" : "main"
      if demoView == "Older versions" { model.versions = GuideSample.versions }
    }
    let g = store.guide(deckId)
    name = pageId == "main" ? "" : g.pages.first { $0.id == pageId }?.title ?? (store.demo && demoView == "A new page" ? "New page" : "")
  }

  // ---------- the top ----------
  private func header(_ deck: String, hist: Bool) -> some View {
    HStack(spacing: 10) {
      Button { Task { await done() } } label: {
        Icon("back", 18, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf))
      }
      .buttonStyle(.press).accessibilityLabel("Done").accessibilityIdentifier("backButton")
      VStack(alignment: .leading, spacing: 1) {
        Text("Guide").css(20, .semibold, ls: -0.02).lineLimit(1).accessibilityAddTraits(.isHeader)
        Text(deck).css(13).foregroundStyle(t.muted).lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Text(model.saveLabel).css(13).foregroundStyle(model.error.isEmpty ? t.muted : t.again).lineLimit(2).multilineTextAlignment(.trailing).fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 190, alignment: .trailing)
        .accessibilityIdentifier("saveLabel")
      Button { Task { await model.toggleHistory() } } label: {
        Icon("history", 15, 2).foregroundStyle(hist ? t.invText : t.text).frame(width: 39, height: 40).background(Capsule().fill(hist ? t.inv : t.surf))
      }
      .buttonStyle(.press).accessibilityLabel("History").accessibilityAddTraits(hist ? .isSelected : [])
    }
  }

  /// A tab for the Guide and each extra page, and Add page.
  private func pages(extra: [MakeGuidePage], pageId: String, canAdd: Bool) -> some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 6) {
        ForEach([MakeGuidePage(id: "main", title: "Guide")] + extra) { x in
          let on = x.id == pageId
          Button { Task { await model.pick(x.id) } } label: {
            Text(x.title).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 34).frame(maxWidth: 220)
              .background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press).accessibilityLabel(x.title).accessibilityAddTraits(on ? .isSelected : [])
        }
        if canAdd {
          Button { Task { await model.addPage() } } label: {
            HStack(spacing: 4) { Icon("plus", 14, 2.2); Text("Add page").css(13, .semibold) }
              .foregroundStyle(t.text).padding(.leading, 10).padding(.trailing, 14).frame(height: 34)
              .overlay(Capsule().strokeBorder(t.line, lineWidth: 1))
          }
          .buttonStyle(.press).accessibilityLabel("Add a page")
        }
      }
    }
    .frame(height: 34)
  }

  /// A page of its own: its name, and Delete page.
  private func pageTools(_ cur: (id: String, title: String, text: String)) -> some View {
    HStack(spacing: 8) {
      TextField("", text: Binding(get: { name }, set: { name = $0; if !store.demo { model.rename($0) } }), prompt: Text("Page name").foregroundStyle(PLACEHOLDER))
        .font(.geist(15, .semibold)).foregroundStyle(t.text).focused($nameFocus).padding(.horizontal, 14).frame(height: 40)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf))
        // (A touch anywhere on the pill, its edges too, writes in it.)
        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous)).onTapGesture { nameFocus = true }
        .accessibilityLabel("Page name")
      Button { nav.ask("Delete the page “\(cur.title)”?", action: "Delete page", danger: true) { Task { await model.deletePage() } } } label: {
        Text("Delete page").css(14, .semibold).foregroundStyle(t.again).padding(.horizontal, 14).frame(height: 40).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf))
      }
      .buttonStyle(.press)
    }
  }

  // ---------- writing ----------
  /// Heading, Bold, Italic, Code | Link, Bulleted list, Numbered list, Task list, Quote, Table, Picture: it scrolls sideways when it's wider than the page.
  private var toolbar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 2) {
        tb("Heading") { field.heading(2) } label: { Text("H").css(14, .semibold) }
        tb("Bold") { field.act("bold") } label: { Text("B").css(14, .bold) }
        tb("Italic") { field.act("italic") } label: { Text("I").font(.custom("Georgia-Italic", fixedSize: 15)).fontWeight(.semibold) }
        tb("Code") { field.act("code") } label: { Text("</>").css(12, .semibold, mono: true) }
        t.line.frame(width: 1, height: 18).padding(.horizontal, 6).accessibilityHidden(true)
        tb("Link") { field.link() } label: { Icon("link", 16, 2) }
        tb("Bulleted list") { field.act("bullets") } label: { Icon("list", 16, 2) }
        tb("Numbered list") { field.act("numbers") } label: { Text("1.").css(12, .semibold, mono: true) }
        tb("Task list") { field.act("tasks") } label: { Icon("check", 16, 2.2) }
        tb("Quote") { field.act("quote") } label: { Text("“").font(.custom("Georgia", fixedSize: 20)).fontWeight(.semibold) }
        tb("Table") { field.act("table") } label: { Icon("grid", 16, 2) }
        tb("Picture") { if store.demo { return }; picking = true } label: { Icon("image", 16, 2) }
      }
    }
    .frame(height: 34)
    .accessibilityElement(children: .contain).accessibilityLabel("Formatting")
  }
  private func tb<L: View>(_ label: String, _ action: @escaping () -> Void, @ViewBuilder label content: () -> L) -> some View {
    Button(action: action) { content().foregroundStyle(t.text).padding(.horizontal, 8).frame(minWidth: 36).frame(height: 34).contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }

  /// The words in a field to write in, or drawn as the deck page will (Preview).
  @ViewBuilder private func editor(text: String, pageId: String) -> some View {
    if previewing {
      ScrollView(showsIndicators: false) {
        let blocks = GuideEngine.shared.tree(text)
        VStack(alignment: .leading, spacing: 0) {
          if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { Text("Nothing to show yet.").css(15).foregroundStyle(t.muted) }
          else { GuideDoc(blocks: blocks, width: UIScreen.main.bounds.width - 32 - 44) }
        }
        .padding(.horizontal, 22).padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      .frame(maxHeight: .infinity)
    } else {
      ZStack(alignment: .topLeading) {
        GuideTextArea(text: text, identity: model.key(pageId), control: field)
        if text.isEmpty {
          Text("Write about this deck in Markdown: a plan, links, a summary, a table of terms.")
            .font(Font(GuideFont.mono(GuideField.size))).lineSpacing(GuideField.size * 1.65 - GuideField.size * 1.3).foregroundStyle(PLACEHOLDER)
            .padding(.horizontal, 18).padding(.vertical, 16).allowsHitTesting(false).accessibilityHidden(true)
        }
      }
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      .frame(maxHeight: .infinity)
    }
  }

  // ---------- History ----------
  @ViewBuilder private func historyList(pageId: String, title: String) -> some View {
    let versions = model.versions
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 10) {
        Text("Older versions of " + (pageId == "main" ? "the Guide" : title) + ". Restoring one keeps what you have now as a version too.").css(14, lh: 1.5).foregroundStyle(t.muted)
        ForEach(versions ?? []) { v in version(v) }
        if let versions, versions.isEmpty { Text("There are no older versions yet. They show up here as you write.").css(15, lh: 1.5).foregroundStyle(t.muted) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxHeight: .infinity)
  }
  private func version(_ v: GuideVersion) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        Text(GuideScreen.when(v.at)).css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        Text(plural((v.text as NSString).length, "character")).css(12).foregroundStyle(t.muted)
        Button { Task { await model.restore(v) } } label: {
          Text("Restore").css(13, .semibold).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 32).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).accessibilityLabel("Restore " + GuideScreen.when(v.at))
      }
      // (Laid out whole and cut off by the frame, as the web cuts it: a Text in a short frame would end its last line with an ellipsis.)
      Text(String(v.text.prefix(220))).css(13, lh: 1.5).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, maxHeight: 84, alignment: .topLeading).clipped()
    }
    .padding(.horizontal, 16).padding(.vertical, 14)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
  }
  /// "Sep 21, 10:00 AM", as the web writes the time a version was made.
  static func when(_ ms: Double) -> String {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "MMM d, h:mm a"
    return f.string(from: Date(timeIntervalSince1970: ms / 1000))
  }

  // ---------- the buttons ----------
  private func pill(_ label: String, icon: String? = nil, inv: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 8) { if let icon { Icon(icon, 16, 2) }; Text(label).css(15, .semibold).lineLimit(1) }
        .foregroundStyle(inv ? t.invText : t.text).padding(.horizontal, 16).frame(maxWidth: .infinity).frame(height: 50).background(Capsule().fill(inv ? t.inv : t.surf))
    }
    .buttonStyle(.press)
  }

  /// Done: what's waiting is saved, and the deck's Notes are on screen again (if it can't be saved, the page says why and stays).
  private func done() async {
    await model.flush()
    guard model.error.isEmpty else { return }
    nav.deckWants = DeckWant(deckId: deckId, tab: "notes")
    if nav.path.dropLast().last == .deck(deckId) { nav.back() } else { nav.tab = .library; nav.path = [.deck(deckId)] }
  }
  /// Make cards from this page, or from what is selected on it.
  private func makeCards(pageId: String, deckName: String, title: String) {
    let sel = field.selected
    Task {
      await model.flush()
      guard model.error.isEmpty else { return }
      if sel.isEmpty { nav.make(deckId: deckId, guide: deckId, page: pageId) }
      else { nav.make(deckId: deckId, text: sel, title: deckName + " (selection)") }
    }
  }
}
