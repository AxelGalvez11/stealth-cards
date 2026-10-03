// iPhone · A page of notes, as it reads and as it is written in (the canvas's PhoneGuide page and the deck pages' Notes; web/notes.js on the web): always formatted,
// a row for each block, tap and type, no marks to see. The look is design/materials.mjs NOTES_CSS (16 points at a line of 1.6, headings at 1.6, 1.25 and 1.08 times,
// a level in is 26 points, Lucida's own 16-point box, a toggle's ▸, a heading's ▸ in the margin, which is always there on a phone). The page's memory and its rules
// (Enter, Backspace, Tab, the shortcuts, toggles and folds) are NotesPage (Data/Notes.swift); each line's words are a text field of their own (NotesField, the
// older text system, with the words' marks kept as attributes), and Lucida's own bar sits above the keyboard (NotesKeys): Aa (Heading, Subheading, Text), To-do,
// Bullets, Toggle, Picture and the keyboard-down button, and Bold, Italic, Strikethrough, Code and Link while words are selected. Reading (a shared deck's page,
// the deck page's Notes before you tap in) is the same rows without the editing: its toggles open and its sections fold all the same.
import SwiftUI
import UIKit

// ---------- the look (NOTES_CSS) ----------
enum NotesCSS {
  static let size: CGFloat = 16, lh: CGFloat = 1.6, ind: CGFloat = 26
  static var line: CGFloat { size * lh }
  /// A heading's size, its line height and the room above it (none above the first row).
  static func head(_ level: Int) -> (size: CGFloat, lh: CGFloat, top: CGFloat) {
    switch level {
    case 1: return (size * 1.6, 1.25, size * 1.6 * 0.75)
    case 2: return (size * 1.25, 1.3, size * 1.25 * 0.8)
    case 3: return (size * 1.08, 1.4, size * 1.08 * 0.6)
    default: return (size, lh, size * 0.5)
    }
  }
  static let code: CGFloat = 13.5, cell: CGFloat = 15
  /// How far left of a heading's words its ▸ sits on a phone.
  static let fold: CGFloat = 22
  /// The color words show selected in (the canvas's format bar state).
  static let hl = UIColor(red: 0, green: 122 / 255, blue: 1, alpha: 0.22)
}

/// The colors a page is drawn in (NOTES_VARS): its words, quiet words, lines, what code sits on, the page's own color and a gray.
struct NotesColors: Equatable {
  var text, muted, line, code, bg, surf: UIColor
  init(_ t: Theme, code: Color) {
    text = UIColor(t.text); muted = UIColor(t.muted); line = UIColor(t.line); self.code = UIColor(code); bg = UIColor(t.bg); surf = UIColor(t.surf)
  }
  /// The same colors (by what they are, not which object holds them: the page's rows are drawn again only when something they show changed).
  static func == (a: NotesColors, b: NotesColors) -> Bool { a.parts == b.parts }
  private var parts: [CGFloat] {
    [text, muted, line, code, bg, surf].flatMap { c -> [CGFloat] in var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, al: CGFloat = 0; c.getRed(&r, green: &g, blue: &b, alpha: &al); return [r, g, b, al] }
  }
}

extension NSAttributedString.Key {
  /// A line's words keep what they are as attributes of their own, so what is typed can be read back as words: bold, italic, strikethrough, code, a link.
  static let nbB = NSAttributedString.Key("lucida.nb.b"), nbI = NSAttributedString.Key("lucida.nb.i"), nbS = NSAttributedString.Key("lucida.nb.s")
  static let nbC = NSAttributedString.Key("lucida.nb.c"), nbA = NSAttributedString.Key("lucida.nb.a"), nbLt = NSAttributedString.Key("lucida.nb.lt")
}

/// How a line's words are set: size, line height, weight and letter-spacing, and whether it's code or a to-do that is done.
struct NotesLook: Equatable {
  var size = NotesCSS.size, lh = NotesCSS.lh, weight: Font.Weight = .regular, ls: CGFloat = 0
  var mono = false, done = false
  var c: NotesColors
  /// Words shown selected (the canvas's format bar).
  var hl: NSRange? = nil

  static func of(_ b: NoteBlock, _ c: NotesColors, hl: NSRange? = nil) -> NotesLook {
    var l = NotesLook(c: c, hl: hl)
    switch b.k {
    case "h": let h = NotesCSS.head(b.level); l.size = h.size; l.lh = h.lh; l.weight = .semibold; l.ls = -0.02
    case "code": l.size = NotesCSS.code; l.mono = true
    case "todo": l.done = b.on
    default: break
    }
    return l
  }
  /// A table's cell: 15 points at a line of 1.5, its first row in bold.
  static func cell(_ c: NotesColors, head: Bool) -> NotesLook { NotesLook(size: NotesCSS.cell, lh: 1.5, weight: head ? .semibold : .regular, c: c) }

  var height: CGFloat { size * lh }
  private var para: NSParagraphStyle {
    let p = NSMutableParagraphStyle(); p.minimumLineHeight = height; p.maximumLineHeight = height; p.lineBreakMode = .byWordWrapping
    p.lineBreakStrategy = []
    return p
  }
  func attrs(_ run: NoteRun?, ink: UIColor? = nil) -> [NSAttributedString.Key: Any] {
    let r = run ?? NoteRun("")
    var a: [NSAttributedString.Key: Any] = [.paragraphStyle: para, .foregroundColor: ink ?? (done ? c.muted : c.text), .baselineOffset: (height - size * GEIST_LINE) / 2]
    if ls != 0 { a[.kern] = ls * size }
    if mono { a[.font] = GuideFont.mono(size) }
    else if r.c { a[.font] = GuideFont.mono(size * 0.88, bold: r.b); a[.guideCode] = c.code; a[.nbC] = true }
    else { a[.font] = Rich.uiFont(size, r.b ? .semibold : weight, italic: r.i) }
    if r.s || done { a[.strikethroughStyle] = NSUnderlineStyle.single.rawValue; if done && !r.s { a[.strikethroughColor] = c.muted } }
    if let h = r.a, !h.isEmpty { a[.underlineStyle] = NSUnderlineStyle.single.rawValue; a[.nbA] = h; if let lt = r.lt, !lt.isEmpty { a[.nbLt] = lt } }
    if r.b { a[.nbB] = true }
    if r.i { a[.nbI] = true }
    if r.s { a[.nbS] = true }
    return a
  }
  func text(_ rs: [NoteRun]) -> NSAttributedString {
    let out = NSMutableAttributedString()
    for r in rs { out.append(NSAttributedString(string: r.t, attributes: attrs(r))) }
    if let hl, hl.location >= 0, hl.location + hl.length <= out.length { out.addAttribute(.backgroundColor, value: NotesCSS.hl, range: hl) }
    return out
  }
  /// The words a field holds, read back (only Lucida's own marks count: whatever else came in with them is dropped).
  static func runs(_ s: NSAttributedString) -> [NoteRun] {
    var out: [NoteRun] = []
    let ns = s.string as NSString
    s.enumerateAttributes(in: NSRange(location: 0, length: s.length)) { a, range, _ in
      out.append(NoteRun(ns.substring(with: range), b: a[.nbB] != nil, i: a[.nbI] != nil, s: a[.nbS] != nil, c: a[.nbC] != nil, a: a[.nbA] as? String, lt: a[.nbLt] as? String))
    }
    return Notes.tidy(out)
  }
}

// ---------- the page's own icons (web/notes.js SVG) ----------
enum NotesIcons {
  static let svg: [String: String] = [
    "chev": "<path d=\"M9 6l6 6-6 6\"/>", "check": "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>",
    "link": "<path d=\"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1\"/>",
    "list": "<path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\" fill=\"currentColor\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\" fill=\"currentColor\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\" fill=\"currentColor\"/>",
    "todo": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"4\"/><path d=\"M8.5 12.2l2.4 2.4 4.6-5\"/>", "toggle": "<path d=\"M8 6l8 6-8 6z\" fill=\"currentColor\" stroke=\"none\"/>",
    "quote": "<path d=\"M6 7v10M11 9h8M11 15h6\"/>", "hr": "<path d=\"M4 12h16\"/>", "code": "<path d=\"M9 8l-4 4 4 4M15 8l4 4-4 4\"/>",
    "image": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"1.6\"/><path d=\"M5 17l4.5-4.5 3 3L15 13l4 4\"/>",
    "table": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"2.5\"/><path d=\"M3.5 10h17M10 10v9\"/>",
    "down": "<path d=\"M6 9l6 6 6-6\"/>", "close": "<path d=\"M6 6l12 12M18 6L6 18\"/>",
    "num": "<path d=\"M10 6h10M10 12h10M10 18h10\"/><path d=\"M4 5.5l1.5-1V9M3.8 14.2a1.4 1.4 0 1 1 2.2 1.4L4 18h2.4\" stroke-width=\"1.5\"/>",
    "bin": "<path d=\"M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12\"/>"]
  @MainActor private static var cache: [String: [IconArt.Part]] = [:]
  @MainActor static func parts(_ name: String) -> [IconArt.Part] {
    if let hit = cache[name] { return hit }
    let made = SVG.parts(svg[name] ?? ""); cache[name] = made; return made
  }
}
struct NotesIcon: View {
  let name: String
  var size: CGFloat = 16, stroke: CGFloat = 2
  init(_ name: String, _ size: CGFloat = 16, _ stroke: CGFloat = 2) { self.name = name; self.size = size; self.stroke = stroke }
  var body: some View {
    let parts = NotesIcons.parts(name), k = size / 24, w = stroke * k
    Canvas { ctx, _ in
      for p in parts {
        let path = Path(p.path).applying(CGAffineTransform(scaleX: k, y: k))
        if p.fill { ctx.fill(path, with: .foreground) }
        if p.stroke { ctx.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: w, lineCap: .round, lineJoin: .round)) }
      }
    }
    .frame(width: size, height: size).accessibilityHidden(true)
  }
}

// ---------- keeping the caret in sight ----------
/// The page's scroll: where its visible part is on the screen, how far it is scrolled, and a way to scroll it, so a line being written stays above the bar.
@MainActor final class NotesScroll: ObservableObject {
  var viewport: CGRect = .zero
  var offset: CGFloat = 0
  var go: ((CGFloat) -> Void)?
  /// `r` (on the screen) comes into the visible part, with a little room.
  func reveal(_ r: CGRect) {
    guard viewport.height > 0, !r.isNull, !r.isInfinite else { return }
    let top = viewport.minY + 10, bottom = viewport.maxY - 18
    if r.maxY > bottom { go?(offset + r.maxY - bottom) } else if r.minY < top { go?(max(0, offset - (top - r.minY))) }
  }
}
private struct NotesScrollKey: EnvironmentKey { static let defaultValue: NotesScroll? = nil }
extension EnvironmentValues { var notesScroll: NotesScroll? { get { self[NotesScrollKey.self] } set { self[NotesScrollKey.self] = newValue } } }

// ---------- the outline (web/notes.js THE OUTLINE; the owner, 2026-10-02: "add that thing notion has where it shows a rail tree of sections") ----------
/// A page's outline: the heading being read, the one just gone to (it stays the one being read while the page scrolls there), and each heading's line on the
/// screen (its field: to find the one being read, and to scroll to one); on a deck page's card, where its rail sits as the page scrolls by.
@MainActor final class NotesOutline: ObservableObject {
  @Published private(set) var current = ""
  /// The rail's top inside a deck page's card (`stick`).
  @Published private(set) var railY: CGFloat = 0
  /// Where the card's page of notes starts in it (its rail starts there too), the card on the screen, and how tall its rail is.
  private var notesTop: CGFloat = 0, card: CGRect = .zero, rail: CGFloat = 0
  private var pin = "", pinUntil = Date.distantPast
  private let fields = NSMapTable<NSString, UIView>.strongToWeakObjects()
  /// A heading's field, as it is drawn (NotesLine).
  func register(_ v: UIView, _ id: String) { if fields.object(forKey: id as NSString) !== v { fields.setObject(v, forKey: id as NSString) } }
  private func field(_ id: String) -> UIView? { fields.object(forKey: id as NSString).flatMap { $0.window == nil ? nil : $0 } }
  /// The one being read: the last heading whose words have come up to a line just under `top` (the top of what scrolls the page, on the screen), the first before
  /// any has. A scroll that isn't the one going to a heading lets that heading go.
  func refresh(_ heads: [NotesHead], top: CGFloat, scrolled: Bool = true) {
    if scrolled && !pin.isEmpty { if Date() <= pinUntil { pinUntil = Date().addingTimeInterval(0.25) } else { pin = "" } }
    var cur = heads.contains { $0.id == pin } ? pin : ""
    if cur.isEmpty {
      var first = ""
      for h in heads {
        guard let f = field(h.id) else { continue }
        if first.isEmpty { first = h.id }
        if f.convert(f.bounds, to: nil).minY <= top + 48 { cur = h.id } else { break }
      }
      if cur.isEmpty { cur = first.isEmpty ? heads.first?.id ?? "" : first }
    }
    if cur != current { current = cur }
  }
  /// To a heading: what it is folded or closed in opens (and this phone remembers it, as its ▸ does), then the page brings it a little under its top.
  func go(_ id: String, page: NotesPage) {
    let opened = page.revealForJump(id)
    pin = id; pinUntil = Date().addingTimeInterval(0.9); current = id
    DispatchQueue.main.asyncAfter(deadline: .now() + (opened ? 0.3 : 0)) { [weak self] in
      guard let self, let f = self.field(id), let sv = GuideAnchors.page(of: f) else { return }
      self.pinUntil = Date().addingTimeInterval(0.9)
      GuideAnchors.bring(f, in: sv)
    }
  }
  /// A deck page's card: its rail starts at the top of its notes, and once they scroll up past the top of the screen it stays a little under it, to the card's end.
  /// (Placed again whenever the card moves or its notes do, whichever is measured first.)
  func stick(card: CGRect, rail: CGFloat) { self.card = card; self.rail = rail; place() }
  func notes(at top: CGFloat) { notesTop = top; place() }
  private func place() {
    let want = Screen.safeTop + 16 - card.minY, y = min(max(notesTop, want), max(notesTop, card.height - rail - 8))
    if abs(y - railY) > 0.5 { railY = y }
  }
}
private struct NotesOutlineKey: EnvironmentKey { static let defaultValue: NotesOutline? = nil }
extension EnvironmentValues { var notesOutline: NotesOutline? { get { self[NotesOutlineKey.self] } set { self[NotesOutlineKey.self] = newValue } } }

/// The rail at the right of a page of notes, small and quiet: a short line for each heading (a subheading's shorter and further in), the one being read in the
/// words' color (web/notes.js's phone look: 12, 9 and 6 points wide, 2 tall, 6 apart). A tap opens the tree in Lucida's own sheet (PickSheet's `tree`): a heading
/// scrolls there and closes it. `sticky`: on a deck page's card, it moves down the card as the page scrolls (NotesOutline.stick).
struct NotesRail: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let heads: [NotesHead]
  @ObservedObject var outline: NotesOutline
  let page: NotesPage
  var sticky = false
  /// The room between the lines: 6 points, closer past 40 headings so the rail stays about as tall as 40 would make it (web/notes.js's rule).
  static func gap(_ n: Int) -> CGFloat { n > 40 ? max(2, (320 / CGFloat(n)).rounded(.down) - 2) : 6 }
  static func height(_ n: Int) -> CGFloat { CGFloat(n) * 2 + CGFloat(max(0, n - 1)) * gap(n) + 16 }
  var body: some View {
    Button { Self.open(nav: nav, heads: heads, outline: outline, page: page) } label: {
      VStack(alignment: .trailing, spacing: Self.gap(heads.count)) {
        ForEach(heads) { h in
          RoundedRectangle(cornerRadius: 1).fill(h.id == outline.current ? t.text : t.muted.opacity(0.35)).frame(width: [12, 9, 6][min(2, max(0, h.ind))], height: 2)
        }
      }
      .animation(Motion.fade, value: outline.current)
      .padding(.vertical, 8).padding(.horizontal, 4)
      .contentShape(Rectangle().inset(by: -8))
    }
    .buttonStyle(.flat)
    .offset(y: sticky ? outline.railY : 0)
    .accessibilityLabel("Outline").accessibilityIdentifier("notes.outline")
  }
  /// The tree, in Lucida's own sheet: each heading (further in by its level), the one being read in bold.
  static func open(nav: Nav, heads: [NotesHead], outline: NotesOutline, page: NotesPage) {
    let rows = heads.map { PickRow(id: $0.id, words: $0.words, level: $0.ind) }
    withAnimation(Motion.sheet) {
      nav.picker = PickRequest(title: "Outline", rows: rows, value: outline.current, full: heads.count > 8, tree: true) { row in if let row { outline.go(row.id, page: page) } }
    }
  }
}

// ---------- a line's words ----------
/// A line's text field: the older text system (whose backgrounds can be drawn by hand: inline code's rounded box), the page's own Backspace at the start of a line,
/// Tab and Shift+Tab, a paste of more than one line, and a quiet placeholder.
final class NotesField: GuideWords {
  var onBackAtStart: (() -> Void)?
  var onTab: ((Bool) -> Void)?
  var onPaste: ((String) -> Bool)?
  private let hint = UILabel()
  convenience init() {
    let storage = NSTextStorage(), lm = GuideLayoutManager(), tc = NSTextContainer(size: CGSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
    storage.addLayoutManager(lm); lm.addTextContainer(tc)
    tc.lineFragmentPadding = 0; tc.widthTracksTextView = true
    self.init(frame: .zero, textContainer: tc)
    isScrollEnabled = false; backgroundColor = .clear; textContainerInset = .zero
    // (three hyphens make a divider: the keyboard mustn't turn two of them into a dash first)
    smartDashesType = .no
    linkTextAttributes = [:]; dataDetectorTypes = []
    setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    hint.numberOfLines = 1; hint.isUserInteractionEnabled = false; hint.isAccessibilityElement = false
    addSubview(hint)
  }
  var placeholder: NSAttributedString? { didSet { hint.attributedText = placeholder; showHint() } }
  /// An empty line reads out its quiet words ("Title", "Start writing", "List").
  override var accessibilityValue: String? {
    get { textStorage.length == 0 ? placeholder?.string : super.accessibilityValue }
    set { super.accessibilityValue = newValue }
  }
  func showHint() { hint.isHidden = placeholder == nil || textStorage.length > 0 }
  override func layoutSubviews() {
    super.layoutSubviews()
    let i = textContainerInset
    hint.frame = CGRect(x: i.left, y: i.top, width: max(0, bounds.width - i.left - i.right), height: max(0, bounds.height - i.top - i.bottom))
    hint.sizeToFit(); hint.frame.origin = CGPoint(x: i.left, y: i.top)
  }
  override func deleteBackward() {
    if selectedRange.location == 0 && selectedRange.length == 0 && markedTextRange == nil, let f = onBackAtStart { f(); return }
    super.deleteBackward()
  }
  override func paste(_ sender: Any?) {
    guard isEditable, let s = UIPasteboard.general.string else { super.paste(sender); return }
    if s.contains("\n"), let f = onPaste, f(s) { return }
    // (words from elsewhere come in as plain words, in the line's own type)
    insertText(s)
  }
  override var keyCommands: [UIKeyCommand]? {
    guard isEditable, onTab != nil else { return super.keyCommands }
    let k = [UIKeyCommand(input: "\t", modifierFlags: [], action: #selector(tabIn)), UIKeyCommand(input: "\t", modifierFlags: .shift, action: #selector(tabOut))]
    for c in k { c.wantsPriorityOverSystemBehavior = true }
    return k
  }
  @objc private func tabIn() { onTab?(false) }
  @objc private func tabOut() { onTab?(true) }
}

/// A line's words in its text field, kept in step with the page: what is typed goes to the page as words (the field keeps the caret), and what the page changes
/// (a kind, marks, an older version) is put back in the field. `focus`: the page asks for the caret here.
struct NotesLine: UIViewRepresentable {
  @Environment(\.notesScroll) private var scroll
  @Environment(\.notesOutline) private var outline
  let id: String
  var cell: [Int]? = nil
  let kind: String
  let runs: [NoteRun]
  let look: NotesLook
  let editable: Bool
  let focus: NotesFocus?
  let page: NotesPage
  var label = ""
  var placeholder = ""
  /// A code block's room around its words, its color and its corners.
  var inset: UIEdgeInsets = .zero
  var fill: UIColor? = nil
  var radius: CGFloat = 0
  /// Reading the owner's page: a tap opens it to write in, there.
  var tap: ((Int) -> Void)? = nil
  /// A heading's id (guide.js's), which a link inside the page jumps to.
  var anchor: String? = nil
  @Environment(\.guideExpand) private var expand

  func makeUIView(context: Context) -> NotesField {
    let v = NotesField()
    v.delegate = context.coordinator
    let g = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.tapped(_:)))
    g.delegate = context.coordinator
    v.addGestureRecognizer(g)
    context.coordinator.tapper = g
    return v
  }
  func updateUIView(_ v: NotesField, context: Context) {
    let c = context.coordinator
    c.line = self; c.scroll = scroll; c.expand = expand
    v.anchorID = anchor
    // (a heading's line is where the outline finds it)
    if kind == "h" { outline?.register(v, id) }
    if v.isEditable != editable { v.isEditable = editable }
    if v.isSelectable != (editable || tap == nil) { v.isSelectable = editable || tap == nil }
    c.tapper?.isEnabled = !editable
    // (only what changed is set: each of these lays the field out again)
    if v.textContainerInset != inset { v.textContainerInset = inset }
    if v.backgroundColor != (fill ?? .clear) { v.backgroundColor = fill ?? .clear }
    if v.layer.cornerRadius != radius { v.layer.cornerRadius = radius; v.layer.cornerCurve = .continuous }
    v.accessibilityLabel = label
    #if DEBUG
    // (a check reads which words are links, and where they go, from here)
    var links: [String] = []
    for r in runs { if let a = r.a, !a.isEmpty { links.append(r.t + " -> " + a) } }
    v.accessibilityIdentifier = links.isEmpty ? nil : "links: " + links.joined(separator: " | ")
    #endif
    v.onBackAtStart = editable ? { [weak c, weak v] in if let c, let v { c.backAtStart(v) } } : nil
    v.onTab = editable ? { [weak c, weak v] out in if let c, let v { c.tab(out, v) } } : nil
    v.onPaste = editable ? { [weak c, weak v] s in guard let c, let v else { return false }; return c.paste(s, v) } : nil
    v.spellCheckingType = kind == "code" ? .no : .default
    v.autocorrectionType = kind == "code" ? .no : .default
    v.autocapitalizationType = kind == "code" ? .none : .sentences
    if c.shown != runs || c.shownLook != look {
      let sel = v.selectedRange, typingNow = v.isFirstResponder
      v.attributedText = look.text(runs)
      c.shown = runs; c.shownLook = look
      if typingNow { let n = v.textStorage.length, a = min(sel.location, n); v.selectedRange = NSRange(location: a, length: min(sel.length, n - a)) }
      c.typing(v)
      v.undoManager?.removeAllActions()
      v.invalidateIntrinsicContentSize()
    }
    v.placeholder = placeholder.isEmpty ? nil : NSAttributedString(string: placeholder, attributes: look.attrs(nil, ink: look.c.muted.withAlphaComponent(0.75)))
    if let f = focus, editable {
      if c.applied != f {
        c.applied = f
        // (a field that has the keyboard takes its place at once: a letter typed meanwhile must not land before the caret moves)
        if v.isFirstResponder { c.place(f, v); DispatchQueue.main.async { [page] in if page.focus == f { page.focus = nil } } } else { c.take(f, v, tries: 0) }
      }
    } else { c.applied = nil }
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView v: NotesField, context: Context) -> CGSize? {
    guard let w = proposal.width, w.isFinite, w > 0 else { return nil }
    let fit = v.sizeThatFits(CGSize(width: w, height: .greatestFiniteMagnitude)), pad = inset.top + inset.bottom
    return CGSize(width: w, height: max(ceil(fit.height), ceil(look.height + pad)))
  }
  func makeCoordinator() -> Coordinator { Coordinator(self) }

  @MainActor final class Coordinator: NSObject, UITextViewDelegate, UIGestureRecognizerDelegate {
    var line: NotesLine
    var scroll: NotesScroll?
    var expand: (() -> Void)?
    var shown: [NoteRun]? = nil
    var shownLook: NotesLook? = nil
    var applied: NotesFocus? = nil
    weak var tapper: UITapGestureRecognizer?
    /// Marks asked for with nothing selected (Bold, then type): they go with the next letters typed there.
    var pend: (off: Int, m: NoteRun)? = nil
    init(_ l: NotesLine) { line = l }
    private var page: NotesPage { line.page }

    /// The caret goes here (once the field is on the screen).
    func take(_ f: NotesFocus, _ v: NotesField, tries: Int) {
      DispatchQueue.main.asyncAfter(deadline: .now() + (tries == 0 ? 0 : 0.04)) { [weak self, weak v] in
        guard let self, let v else { return }
        if v.window == nil || (!v.isFirstResponder && !v.becomeFirstResponder()) { if tries < 8 { self.take(f, v, tries: tries + 1) }; return }
        self.place(f, v)
        if self.page.focus == f { self.page.focus = nil }
      }
    }
    /// The caret (or what is selected) goes to `f`.
    func place(_ f: NotesFocus, _ v: UITextView) {
      let n = v.textStorage.length, a = min(max(0, f.at), n)
      v.selectedRange = NSRange(location: a, length: min(max(0, f.length), n - a))
      typing(v)
      reveal(v)
    }
    /// Right after the page changed this line because of its own key (Enter, Backspace, a shortcut, a paste, Tab), the field shows what the page has now, and
    /// takes the caret if it's still here, at once: the next letter, typed before the page is drawn again, lands where it should.
    func refresh(_ v: UITextView) {
      guard let b = page.block(line.id), Notes.text.contains(b.k) || b.k == "code" || line.cell != nil else { return }
      let rs = page.words(line.id, cell: line.cell), look = line.cell != nil ? line.look : NotesLook.of(b, line.look.c)
      if rs != shown || look != shownLook { v.attributedText = look.text(rs); shown = rs; shownLook = look; v.undoManager?.removeAllActions(); (v as? NotesField)?.showHint() }
      if let f = page.focus, f.id == line.id, f.cell == line.cell { place(f, v); applied = f }
    }
    /// The marks the next letter takes (web/notes.js typing()), unless Bold or the rest were just asked for here.
    func typing(_ v: UITextView) {
      let at = v.selectedRange.location
      // (what the field shows now: right after a shortcut that is the line's new kind, before the page is drawn again)
      var m = NotesPage.typing(shown ?? line.runs, at)
      if let p = pend, p.off == at { m = p.m } else { pend = nil }
      v.typingAttributes = (shownLook ?? line.look).attrs(m)
    }
    func reveal(_ v: UITextView) {
      guard let scroll, let end = v.selectedTextRange?.end else { return }
      let r = v.caretRect(for: end)
      guard !r.isNull, !r.isInfinite else { return }
      scroll.reveal(v.convert(r, to: nil))
    }

    // the field's own events
    func textViewDidBeginEditing(_ v: UITextView) { page.editing = line.id; page.editingCell = line.cell; page.selection = v.selectedRange; page.pick(nil) }
    func textViewDidEndEditing(_ v: UITextView) { if page.editing == line.id && page.editingCell == line.cell { page.editing = nil; page.editingCell = nil } }
    func textViewDidChangeSelection(_ v: UITextView) {
      guard v.isFirstResponder else { return }
      if page.editing == line.id && page.editingCell == line.cell { page.selection = v.selectedRange }
      if v.selectedRange.length == 0 && v.markedTextRange == nil { typing(v) }
    }
    func textView(_ v: UITextView, shouldChangeTextIn range: NSRange, replacementText t: String) -> Bool {
      guard line.editable else { return false }
      if v.markedTextRange != nil || line.kind == "code" { return true }
      if t == "\n" {
        if let cell = line.cell { page.nextCell(line.id, cell); return false }
        sync(v)
        page.enter(line.id, at: range.location, upTo: range.location + range.length)
        refresh(v)
        return false
      }
      if t.contains("\n") { sync(v); let done = page.paste(t, into: line.id, range: range, cell: line.cell); if done { refresh(v) }; return !done }
      return true
    }
    func textViewDidChange(_ v: UITextView) {
      sync(v)
      (v as? NotesField)?.showHint()
      if v.markedTextRange == nil && line.cell == nil && line.kind == "p" && page.shortcut(line.id, caret: v.selectedRange.location) { refresh(v) }
      reveal(v)
    }
    /// What the field holds now goes to the page.
    private func sync(_ v: UITextView) {
      let rs = NotesLook.runs(v.attributedText)
      shown = rs
      page.setWords(line.id, rs, cell: line.cell)
    }
    func backAtStart(_ v: UITextView) { if line.cell == nil { page.backspaceAtStart(line.id); refresh(v) } }
    func tab(_ out: Bool, _ v: UITextView) { if let cell = line.cell { if !out { page.nextCell(line.id, cell) } } else { page.nest(line.id, out: out); refresh(v) } }
    func paste(_ s: String, _ v: UITextView) -> Bool { sync(v); let done = page.paste(s, into: line.id, range: v.selectedRange, cell: line.cell); if done { refresh(v) }; return done }

    // reading: a tap on a link opens it; on the owner's page a tap anywhere else opens the page to write in, there
    @objc func tapped(_ g: UITapGestureRecognizer) {
      guard let v = g.view as? NotesField else { return }
      var p = g.location(in: v); p.x -= v.textContainerInset.left; p.y -= v.textContainerInset.top
      let lm = v.layoutManager
      var frac: CGFloat = 0
      let i = lm.characterIndex(for: p, in: v.textContainer, fractionOfDistanceBetweenInsertionPoints: &frac)
      if i < v.textStorage.length, let href = v.textStorage.attribute(.nbA, at: i, effectiveRange: nil) as? String,
         lm.boundingRect(forGlyphRange: lm.glyphRange(forCharacterRange: NSRange(location: i, length: 1), actualCharacterRange: nil), in: v.textContainer).insetBy(dx: -4, dy: -4).contains(p) {
        if href.hasPrefix("#") { jump(href, v) } else if GuideLinks.allowed(href), let u = URL(string: href) { GuideLinks.open(u, from: v) }
        return
      }
      line.tap?(min(v.textStorage.length, i + (frac > 0.5 ? 1 : 0)))
    }
    func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }
    /// A link to one of the page's headings: what it's folded in opens, and the page scrolls to it.
    private func jump(_ href: String, _ v: UITextView) {
      let f = (String(href.dropFirst()).removingPercentEncoding ?? String(href.dropFirst())).lowercased()
      guard let (block, id) = page.anchors.first(where: { $0.value == f || $0.value == "g-" + f }).map({ ($0.key, $0.value) }) else { return }
      let opened = page.revealForJump(block)
      DispatchQueue.main.asyncAfter(deadline: .now() + (opened ? 0.3 : 0)) { [weak v, expand] in if let v { GuideAnchors.jump(id, from: v, expand: expand) } }
    }
  }
}

// ---------- the page ----------
/// What a page's rows share: its colors, whether it's being written in, whether it's its owner's page to open by a tap, and its pictures.
struct NotesSetup: Equatable {
  var colors: NotesColors
  var editable = false
  /// Reading the owner's page: a tap opens it to write in (`hooks.open`).
  var owner = false
  var hooks: NotesHooks
  /// How wide the page is (a picture is no wider; a table shares it out).
  var width: CGFloat = 0
  static func == (a: NotesSetup, b: NotesSetup) -> Bool { a.colors == b.colors && a.editable == b.editable && a.owner == b.owner && a.hooks === b.hooks && a.width == b.width }
}
/// What the rows ask of the screen around them.
final class NotesHooks {
  var image: (String) -> URL? = GuideImages.own
  var open: ((Int, Int) -> Void)? = nil
  init(image: @escaping (String) -> URL? = GuideImages.own, open: ((Int, Int) -> Void)? = nil) { self.image = image; self.open = open }
}

/// A page of notes: its rows, one under the other, and (when it's being written in) the room under them, where a tap writes at the end.
struct NotesView: View {
  @ObservedObject var page: NotesPage
  let setup: NotesSetup
  @State private var width: CGFloat = 0
  /// The canvas's words shown selected (block, from, to).
  var hl: (i: Int, a: Int, b: Int)? = nil
  /// The room under the last row that writes at the end when tapped.
  var below: CGFloat = 0
  var body: some View {
    let list = page.entries, f = page.focus, pk = page.picked, ed = page.editing
    var set = setup; set.width = width
    return VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(list.enumerated()), id: \.element.id) { n, e in
        NoteRow(e: e, page: page, setup: set, focus: f?.id == e.block.id ? f : nil, placeholder: page.placeholder(e), picked: pk == e.block.id, first: n == 0,
                hl: hl.flatMap { $0.i == e.index && e.virtualFor == nil ? NSRange(location: $0.a, length: $0.b - $0.a) : nil }, editingHere: ed == e.block.id)
          .equatable()
          .transition(Motion.still ? .identity : .opacity.combined(with: .offset(y: -4)))
      }
      if setup.editable && below > 0 { Color.clear.frame(height: below).contentShape(Rectangle()).onTapGesture { page.writeAtEnd() } }
    }
    .padding(.bottom, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
  }
}

/// One row: the block, at its level, with the room CSS gives it (2 points above and below, more above a heading).
struct NoteRow: View, Equatable {
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let focus: NotesFocus?
  let placeholder: String
  let picked: Bool
  let first: Bool
  let hl: NSRange?
  let editingHere: Bool
  static func == (a: NoteRow, b: NoteRow) -> Bool {
    a.e == b.e && a.setup == b.setup && a.focus == b.focus && a.placeholder == b.placeholder && a.picked == b.picked && a.first == b.first && a.hl == b.hl && a.editingHere == b.editingHere
  }
  var body: some View {
    let b = e.block
    Group {
      if let t = e.virtualFor { NoteEmptyLine(toggle: t, page: page) }
      else {
        switch b.k {
        case "hr": NoteRule(e: e, page: page, setup: setup, picked: picked)
        case "img": NotePicture(e: e, page: page, setup: setup, picked: picked)
        case "table": NoteTable(e: e, page: page, setup: setup, focus: focus, editingHere: editingHere)
        case "code": NoteCode(e: e, page: page, setup: setup, focus: focus)
        default: NoteWords(e: e, page: page, setup: setup, focus: focus, placeholder: placeholder, hl: hl)
        }
      }
    }
    .padding(.leading, CGFloat(b.d) * NotesCSS.ind)
    .padding(.vertical, 2)
    .padding(.top, b.k == "h" && !first ? NotesCSS.head(b.level).top : 0)
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// A line of words (text, a heading, an item, a to-do, a toggle, a quote): its marker in front, and a heading's ▸ in the margin.
struct NoteWords: View {
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let focus: NotesFocus?
  let placeholder: String
  let hl: NSRange?
  private static let names = ["p": "Text", "h": "Heading", "ul": "List", "ol": "List", "todo": "To-do", "toggle": "Toggle", "quote": "Quote"]
  var body: some View {
    let b = e.block, look = NotesLook.of(b, setup.colors, hl: hl)
    let lead: CGFloat = ["ul", "ol", "todo", "toggle"].contains(b.k) ? NotesCSS.ind : b.k == "quote" ? 15 : 0
    let open = setup.hooks.open, i = e.index
    NotesLine(id: b.id, kind: b.k, runs: b.r, look: look, editable: setup.editable, focus: focus, page: page,
              label: b.k == "h" ? (b.level == 1 ? "Heading" : b.level == 2 ? "Subheading" : "Heading \(b.level)") : Self.names[b.k] ?? "Text", placeholder: placeholder,
              tap: setup.owner ? { off in open?(i, off) } : nil, anchor: b.k == "h" ? page.anchors[b.id] : nil)
      .padding(.leading, lead)
      .overlay(alignment: .topLeading) { NoteMarker(e: e, page: page, setup: setup) }
      .overlay(alignment: .topLeading) {
        if b.k == "h" && e.section && (e.folded || !b.isEmpty) { NoteFold(id: b.id, folded: e.folded, page: page).offset(x: -NotesCSS.fold - 6, y: NotesCSS.head(b.level).size * 0.62 - 16) }
      }
      .accessibilityElement(children: .contain)
  }
}

/// What sits in front of a line: an item's dot or number, Lucida's own box, a toggle's ▸, a quote's bar.
struct NoteMarker: View {
  @Environment(\.theme) private var t
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  var body: some View {
    let b = e.block, mid = NotesCSS.line / 2, c = setup.colors
    switch b.k {
    case "ul": Circle().fill(Color(c.text)).frame(width: 5, height: 5).offset(x: 9, y: mid - 2.5).allowsHitTesting(false)
    case "ol":
      Text("\(e.number).").css(NotesCSS.size, lh: NotesCSS.lh).monospacedDigit().foregroundStyle(Color(c.text)).lineLimit(1).fixedSize()
        .frame(width: NotesCSS.ind - 7, alignment: .trailing).allowsHitTesting(false).accessibilityHidden(true)
    case "todo": NoteBox(on: b.on, colors: c, editable: setup.editable) { page.check(b.id) }.offset(x: 1, y: mid - 8)
    case "toggle":
      Button { withAnimation(Motion.pop) { page.flipOpen(b.id) } } label: {
        NotesIcon("toggle", 14, 2).rotationEffect(.degrees(e.open ? 90 : 0)).animation(Motion.knob, value: e.open)
          .foregroundStyle(Color(c.text)).frame(width: 20, height: NotesCSS.line).contentShape(Rectangle().inset(by: -6))
      }
      .buttonStyle(.flat).offset(x: 2)
      .accessibilityLabel(e.open ? "Close" : "Open").accessibilityAddTraits(e.open ? .isSelected : []).accessibilityIdentifier("notes.toggle")
    case "quote":
      RoundedRectangle(cornerRadius: 1.5).fill(Color(c.muted).opacity(0.45)).frame(width: 3).padding(.vertical, 3).allowsHitTesting(false)
    default: EmptyView()
    }
  }
}

/// Lucida's own check box: a 16-point rounded square, filled with a check when it's done.
struct NoteBox: View {
  let on: Bool
  let colors: NotesColors
  let editable: Bool
  let flip: () -> Void
  var body: some View {
    let box = ZStack {
      RoundedRectangle(cornerRadius: 4.5, style: .continuous).fill(on ? Color(colors.text) : .clear)
      RoundedRectangle(cornerRadius: 4.5, style: .continuous).strokeBorder(on ? Color(colors.text) : Color(colors.muted), lineWidth: 1.5)
      if on { NotesIcon("check", 12, 2.6).foregroundStyle(Color(colors.bg)) }
    }
    .frame(width: 16, height: 16)
    if editable {
      Button(action: flip) { box.contentShape(Rectangle().inset(by: -8)) }.buttonStyle(.flat)
        .accessibilityLabel(on ? "Done" : "Not done").accessibilityAddTraits(.isToggle).accessibilityValue(on ? "1" : "0").accessibilityIdentifier("notes.box")
    } else {
      box.accessibilityElement().accessibilityLabel(on ? "Done" : "Not done").accessibilityIdentifier("notes.box").allowsHitTesting(false)
    }
  }
}

/// A heading's ▸: it folds what is under the heading until the next heading of the same or a higher level (always there on a phone).
struct NoteFold: View {
  @Environment(\.theme) private var t
  let id: String
  let folded: Bool
  let page: NotesPage
  var body: some View {
    Button { withAnimation(Motion.pop) { page.flipFold(id) } } label: {
      NotesIcon("chev", 14, 2.4).rotationEffect(.degrees(folded ? 0 : 90)).animation(Motion.knob, value: folded)
        .foregroundStyle(t.muted).frame(width: 32, height: 32).contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityLabel(folded ? "Show this section" : "Fold this section").accessibilityIdentifier("notes.fold")
  }
}

/// The quiet line under an open toggle with nothing in it: a tap writes inside it.
struct NoteEmptyLine: View {
  @Environment(\.theme) private var t
  let toggle: String
  let page: NotesPage
  var body: some View {
    Text("Empty").css(NotesCSS.size, lh: NotesCSS.lh).foregroundStyle(t.muted).opacity(0.6)
      .frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
      .onTapGesture { page.writeInside(toggle) }
      .accessibilityAddTraits(.isButton).accessibilityLabel("Empty")
  }
}

/// A block of code: Geist Mono at 13.5 on the code color, 12 by 14 points of room, rounded.
struct NoteCode: View {
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let focus: NotesFocus?
  var body: some View {
    let b = e.block, open = setup.hooks.open, i = e.index
    NotesLine(id: b.id, kind: "code", runs: b.text.isEmpty ? [] : [NoteRun(b.text)], look: NotesLook.of(b, setup.colors), editable: setup.editable, focus: focus, page: page,
              label: "Code", inset: UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14), fill: setup.colors.code, radius: 12, tap: setup.owner ? { off in open?(i, off) } : nil)
  }
}

/// A divider: a line with 10 points of room above and below (a tap picks it, and Delete takes it away).
struct NoteRule: View {
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let picked: Bool
  var body: some View {
    Color(setup.colors.line).frame(height: 1).padding(.vertical, 10).frame(maxWidth: .infinity)
      .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color(setup.colors.text), lineWidth: 2).padding(.vertical, 2).opacity(picked ? 1 : 0))
      .contentShape(Rectangle())
      .onTapGesture { if setup.editable { page.pick(e.block.id) } else if setup.owner { setup.hooks.open?(e.index, 0) } }
      .overlay(alignment: .topTrailing) { if picked { NoteRemove(page: page).offset(y: -40) } }
      .accessibilityElement().accessibilityLabel("Divider")
  }
}

/// A picture of the Guide's own: as wide as it is (no wider than the page), rounded; a tap picks it, and Delete takes it away.
struct NotePicture: View {
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let picked: Bool
  var body: some View {
    let b = e.block
    Group {
      if let url = setup.hooks.image(b.src) { GuidePicture(url: url, alt: b.alt, width: max(40, setup.width - CGFloat(b.d) * NotesCSS.ind)) }
      else { Text(b.alt.isEmpty ? "Picture" : b.alt).css(NotesCSS.size, lh: NotesCSS.lh).foregroundStyle(Color(setup.colors.muted)).frame(maxWidth: .infinity, alignment: .leading) }
    }
    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color(setup.colors.text), lineWidth: 2).opacity(picked ? 1 : 0))
    .contentShape(Rectangle())
    .onTapGesture { if setup.editable { page.pick(b.id) } else if setup.owner { setup.hooks.open?(e.index, 0) } }
    .overlay(alignment: .topTrailing) { if picked { NoteRemove(page: page).padding(8) } }
  }
}

/// Delete, beside a picture, divider or table that is picked (Lucida's own button: there's no keyboard to press Backspace on).
struct NoteRemove: View {
  @Environment(\.theme) private var t
  let page: NotesPage
  var body: some View {
    Button { withAnimation(Motion.leave) { page.removePicked() } } label: {
      HStack(spacing: 6) { NotesIcon("bin", 15, 2); Text("Delete").css(14, .semibold) }
        .foregroundStyle(t.again).padding(.horizontal, 14).frame(height: 36)
        .background(Capsule().fill(t.bg).shadow(color: .black.opacity(0.16), radius: 14, x: 0, y: 8))
        .overlay(Capsule().strokeBorder(t.line, lineWidth: 1))
    }
    .buttonStyle(.press).popTransition().accessibilityLabel("Delete")
  }
}

/// A table: a line around every cell, its first row in bold on the code color, 15 points at a line of 1.5; it scrolls sideways when it's wider than the page.
/// Being written in, each cell is a field (Enter and Tab go to the next one), with Add a row and Add a column under it.
struct NoteTable: View {
  @Environment(\.theme) private var t
  let e: NotesEntry
  let page: NotesPage
  let setup: NotesSetup
  let focus: NotesFocus?
  let editingHere: Bool
  var body: some View {
    let b = e.block, widths = NotesTableLayout.widths(b, room: max(120, setup.width - CGFloat(b.d) * NotesCSS.ind), colors: setup.colors)
    VStack(alignment: .leading, spacing: 6) {
      ScrollView(.horizontal, showsIndicators: false) {
        Grid(horizontalSpacing: 0, verticalSpacing: 0) {
          ForEach(Array(b.rows.enumerated()), id: \.offset) { r, row in
            GridRow {
              ForEach(Array(row.enumerated()), id: \.offset) { c, cell in
                NoteCell(id: b.id, r: r, c: c, runs: cell, page: page, setup: setup, focus: focus?.cell == [r, c] ? focus : nil, index: e.index)
                  .frame(width: c < widths.count ? widths[c] : 56, alignment: .topLeading)
                  .padding(.vertical, 6).padding(.horizontal, 12)
                  .frame(maxHeight: .infinity, alignment: .topLeading)
                  .background(r == 0 ? Color(setup.colors.code) : .clear)
                  .overlay(Rectangle().strokeBorder(Color(setup.colors.line), lineWidth: 0.5))
              }
            }
          }
        }
        .overlay(Rectangle().strokeBorder(Color(setup.colors.line), lineWidth: 0.5))
      }
      if setup.editable && editingHere {
        HStack(spacing: 14) {
          Button("Add a row") { page.addRow(b.id) }.buttonStyle(.flat)
          Button("Add a column") { page.addColumn(b.id) }.buttonStyle(.flat)
        }
        .font(.geist(13, .medium)).foregroundStyle(t.muted)
      }
    }
  }
}
struct NoteCell: View {
  let id: String
  let r: Int, c: Int
  let runs: [NoteRun]
  let page: NotesPage
  let setup: NotesSetup
  let focus: NotesFocus?
  let index: Int
  var body: some View {
    let open = setup.hooks.open, i = index
    NotesLine(id: id, cell: [r, c], kind: "cell", runs: runs, look: NotesLook.cell(setup.colors, head: r == 0), editable: setup.editable, focus: focus, page: page,
              label: r == 0 ? "Column \(c + 1)" : "Cell", tap: setup.owner ? { _ in open?(i, 0) } : nil)
  }
}
/// A table's column widths as a browser lays out a table: each as wide as its longest line when they all fit, else each its longest word and a share of what's left.
enum NotesTableLayout {
  static func widths(_ b: NoteBlock, room: CGFloat, colors: NotesColors) -> [CGFloat] {
    let cols = b.rows.map(\.count).max() ?? 0
    guard cols > 0 else { return [] }
    var most = Array(repeating: CGFloat(32), count: cols), least = Array(repeating: CGFloat(32), count: cols)
    for (r, row) in b.rows.enumerated() {
      let look = NotesLook.cell(colors, head: r == 0)
      for (c, cell) in row.enumerated() {
        let s = look.text(cell)
        most[c] = max(most[c], ceil(s.boundingRect(with: CGSize(width: 10_000, height: 200), options: [.usesLineFragmentOrigin], context: nil).width))
        for w in Notes.plain(cell).split(whereSeparator: { $0 == " " }) {
          let ws = NSAttributedString(string: String(w), attributes: look.attrs(nil))
          least[c] = max(least[c], ceil(ws.boundingRect(with: CGSize(width: 10_000, height: 200), options: [.usesLineFragmentOrigin], context: nil).width))
        }
      }
    }
    let pad = CGFloat(cols) * 24, total = most.reduce(0, +)
    if total + pad <= room { return most.map { max(32, $0) } }
    let floor = least.reduce(0, +), left = max(0, room - pad - floor), spread = max(1, total - floor)
    return (0..<cols).map { max(32, least[$0] + left * (most[$0] - least[$0]) / spread) }
  }
}

// ---------- the bar above the keyboard ----------
/// Lucida's own bar above the keyboard, as Apple Notes has one: Aa (Heading, Subheading, Text), To-do, Bullets, Toggle, Picture and the keyboard-down button; while
/// words are selected, Bold, Italic, Strikethrough, Code and Link (a field for its address, in the bar).
struct NotesKeys: View {
  @Environment(\.theme) private var t
  @ObservedObject var page: NotesPage
  /// Aa's choices are open (the canvas's Block menu starts with them open).
  @Binding var aa: Bool
  var picture: (() -> Void)? = nil
  @State private var linking: (id: String, range: NSRange, cell: [Int]?, had: Bool)? = nil
  @State private var address = ""
  @State private var bad = false
  @FocusState private var addressOn: Bool
  var body: some View {
    let id = page.editing, sel = page.selection, b = id.flatMap { page.block($0) }, words = sel.length > 0 && id != nil
    HStack(spacing: 2) {
      if linking != nil { linkField }
      else if aa && !words {
        key("Heading", on: b?.k == "h" && b?.level == 1) { Text("Heading").css(15, .semibold) } act: { kind("h", 1) }
        key("Subheading", on: b?.k == "h" && b?.level == 2) { Text("Subheading").css(15, .semibold) } act: { kind("h", 2) }
        key("Text", on: b?.k == "p") { Text("Text").css(15, .semibold) } act: { kind("p", 1) }
        key("Close", on: false) { NotesIcon("close", 15, 2.2) } act: { aa = false }
      } else if words, let id {
        key("Bold", on: page.has(id, sel, "b", cell: page.editingCell)) { Text("B").font(.geist(17, .heavy)) } act: { mark("b") }
        key("Italic", on: page.has(id, sel, "i", cell: page.editingCell)) { Text("I").font(.custom("Georgia-Italic", fixedSize: 18)) } act: { mark("i") }
        key("Strikethrough", on: page.has(id, sel, "s", cell: page.editingCell)) { Text("S").font(.geist(17)).strikethrough() } act: { mark("s") }
        key("Code", on: page.has(id, sel, "c", cell: page.editingCell)) { NotesIcon("code", 17, 2) } act: { mark("c") }
        key("Link", on: page.has(id, sel, "a", cell: page.editingCell)) { NotesIcon("link", 17, 2) } act: { openLink(id, sel) }
        Spacer(minLength: 0)
      } else {
        key("Text style", on: false) { Text("Aa").css(17, .bold, ls: -0.02) } act: { aa = true }
        key("To-do", on: b?.k == "todo") { NotesIcon("todo", 18, 1.9) } act: { kind("todo", 1) }
        key("Bullets", on: b?.k == "ul") { NotesIcon("list", 18, 1.9) } act: { kind("ul", 1) }
        key("Toggle", on: b?.k == "toggle") { NotesIcon("toggle", 13, 2) } act: { kind("toggle", 1) }
        if let picture { key("Picture", on: false) { NotesIcon("image", 18, 1.9) } act: { picture() } }
        Spacer(minLength: 0)
        key("Hide the keyboard", on: false) { NotesIcon("down", 18, 2.2) } act: { aa = false; Keyboard.hide() }
      }
    }
    .padding(.horizontal, 6).frame(height: 50).frame(maxWidth: .infinity)
    .background(t.bg)
    .overlay(alignment: .top) { t.line.frame(height: 1) }
    .foregroundStyle(t.text)
    .accessibilityElement(children: .contain).accessibilityLabel("Formatting")
  }
  private func key<L: View>(_ label: String, on: Bool, @ViewBuilder _ content: () -> L, act: @escaping () -> Void) -> some View {
    Button(action: act) {
      content().padding(.horizontal, 8).frame(minWidth: 46).frame(height: 40)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(on ? t.surf : .clear))
        .contentShape(Rectangle())
    }
    .buttonStyle(.flat).accessibilityLabel(label).accessibilityAddTraits(on ? .isSelected : [])
  }
  /// What the line becomes (asking for what it already is makes it text again); Aa's choices close, as the web's do.
  private func kind(_ k: String, _ level: Int) {
    guard let id = page.editing else { return }
    aa = false
    page.setKind(id, k, level: level)
  }
  private func mark(_ m: String) {
    guard let id = page.editing else { return }
    page.toggleMark(id, page.selection, m, cell: page.editingCell)
  }
  private func openLink(_ id: String, _ sel: NSRange) {
    let cur = page.link(id, sel, cell: page.editingCell)
    linking = (id, sel, page.editingCell, !cur.isEmpty); address = cur; bad = false; page.linking = true
    DispatchQueue.main.async { addressOn = true }
  }
  /// The link's address, in the bar (as the web's format bar has it): ✓ puts it on the words (Enter too), ✕ takes a link that's there off, and leaving the
  /// field leaves the words as they were.
  private var linkField: some View {
    HStack(spacing: 6) {
      TextField("", text: $address, prompt: Text("Paste a link").foregroundStyle(PLACEHOLDER))
        .font(.geist(15)).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.done)
        .focused($addressOn).onSubmit { applyLink() }
        .onChange(of: addressOn) { _, on in if !on && linking != nil { finishLink(nil) } }
        .padding(.horizontal, 12).frame(height: 36)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(t.surf))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color(hex: 0xD92D20), lineWidth: 1.5).opacity(bad ? 1 : 0))
        .accessibilityLabel("Link")
      key("Add the link", on: false) { NotesIcon("check", 15, 2.4) } act: { applyLink() }
      if linking?.had == true { key("Take the link off", on: false) { NotesIcon("close", 14, 2.2) } act: { finishLink("") } }
    }
  }
  private func applyLink() {
    let h = GuideEngine.shared.href(address)
    if h.isEmpty && !address.trimmingCharacters(in: .whitespaces).isEmpty { bad = true; return }
    finishLink(h)
  }
  /// The link goes on (or comes off: ""), and the words are selected again; or nothing changes (nil: the field was left).
  private func finishLink(_ href: String?) {
    guard let l = linking else { return }
    linking = nil; addressOn = false; page.linking = false
    if let href { page.setLink(l.id, l.range, href, cell: l.cell) }
  }
}
