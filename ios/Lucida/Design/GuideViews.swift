// A Guide's Markdown as the canvas draws it (design/materials.mjs GUIDE_CSS, the `.gd` rules), in SwiftUI. The words are read by GuideEngine (web/guide.js in
// JavaScriptCore); this only draws the tree it gives: headings with their rules, paragraphs, bold, italic, strikethrough, inline code, links (tappable, they
// open in Safari), pictures (only the app's own /media/ ones, loaded with the app's session), bullet, numbered and task lists (nested), quotes, code blocks,
// tables, and rules, in the app's fonts and the theme's colors (light, dark and gray). Nothing in a Guide can run: links are only http(s), mailto and in-page,
// and a picture that isn't allowed is shown as its description.
//
// The CSS is followed rule for rule: a 15 point body at line height 1.6, headings at 1.65, 1.32 and 1.12 times that with their margins in em, blocks set
// apart by collapsing margins (the bigger of the one below the block above and the one above the block below), lists indented 1.5 em, a task list's boxes
// hanging in that indent, quotes with a 3 point rule and the muted color, code in Geist Mono on the page's color, and tables whose columns are sized the way
// a browser sizes them (as wide as their words, squeezed to fit, and only scrolled sideways when they can't be).
import SwiftUI
import UIKit

// ---------- what the CSS says, in points (15 point body) ----------
enum GuideCSS {
  static let em: CGFloat = 15, line: CGFloat = 1.6
  /// A heading's size: h1 1.65 em, h2 1.32 em, h3 1.12 em, the rest 1 em.
  static func headSize(_ level: Int) -> CGFloat { em * (level == 1 ? 1.65 : level == 2 ? 1.32 : level == 3 ? 1.12 : 1) }
  static let para: CGFloat = 0.9 * em, item: CGFloat = 0.25 * em, indent: CGFloat = 1.5 * em, rule: CGFloat = 1.3 * em

  /// The margin a block has above it and below it, as it shows once it has taken in those of its first and last child (a block with no padding or border
  /// above lets the margin of its first child through, and below, its last). `nested`: it's inside a list item (a list there has no margin below it).
  static func top(_ b: GuideBlock) -> CGFloat {
    switch b {
    case .h(let level, _, _): return 1.3 * headSize(level)
    case .hr: return rule
    case .ul, .ol: return item                            // (the first item's margin comes through)
    case .quote(let bs): return bs.first.map(top) ?? 0
    case .p, .code, .table: return 0
    }
  }
  static func bottom(_ b: GuideBlock, nested: Bool = false, tight: Bool = false) -> CGFloat {
    switch b {
    case .h(let level, _, _): return 0.5 * headSize(level)
    case .hr: return rule
    case .p: return tight ? 0 : para
    case .code, .table, .quote: return para
    case .ul(let t, let items): return listBottom(items, tight: t, nested: nested)
    case .ol(_, let t, let items): return listBottom(items, tight: t, nested: nested)
    }
  }
  /// A list leaves 0.9 em below it (nothing, inside a list item), or what its last item leaves, if that is more.
  static func listBottom(_ items: [GuideItem], tight: Bool, nested: Bool) -> CGFloat {
    max(nested ? 0 : para, item, items.last.map { itemBottom($0, tight: tight) } ?? 0)
  }
  /// What a list item leaves below its last block.
  static func itemBottom(_ it: GuideItem, tight: Bool) -> CGFloat { it.blocks.last.map { bottom($0, nested: true, tight: tight) } ?? 0 }
}

// ---------- fonts and the attributed text ----------
extension NSAttributedString.Key { static let guideCode = NSAttributedString.Key("lucida.guideCode") }

/// How a block's words are set: size, weight, line height (a multiple of the size), letter-spacing (em), and colors.
struct GuideFace {
  var size: CGFloat = GuideCSS.em
  var weight: Font.Weight = .regular
  var lh: CGFloat = GuideCSS.line
  var ls: CGFloat = 0
  var color: UIColor
  var code: UIColor
  var align: NSTextAlignment = .left
}

/// One piece of what is inside a block, flattened out of the marks it sits in.
struct GuideMarks: Equatable { var bold = false, italic = false, strike = false, code = false, link: String? = nil }
enum GuideAtom: Equatable {
  case run(String, GuideMarks)
  case br
  case image(src: String, alt: String)
}

enum GuideText {
  /// The inline nodes of a heading, paragraph or table cell, as a flat list of runs, line breaks and pictures.
  static func atoms(_ inline: [GuideInline], _ m: GuideMarks = GuideMarks()) -> [GuideAtom] {
    var out: [GuideAtom] = []
    for n in inline {
      switch n {
      case .text(let v): out.append(.run(v, m))
      case .code(let v): var x = m; x.code = true; out.append(.run(v, x))
      case .b(let c): var x = m; x.bold = true; out += atoms(c, x)
      case .i(let c): var x = m; x.italic = true; out += atoms(c, x)
      case .s(let c): var x = m; x.strike = true; out += atoms(c, x)
      case .a(let href, _, let c): var x = m; if GuideLinks.allowed(href) { x.link = href }; out += atoms(c, x)
      case .img(let src, let alt, _): out.append(.image(src: src, alt: alt))
      case .br: out.append(.br)
      }
    }
    return out
  }

  /// The words of some atoms (a picture that can't be shown is its description).
  static func attributed(_ atoms: [GuideAtom], _ f: GuideFace, image: (String) -> URL?) -> NSAttributedString {
    let L = f.size * f.lh, shift = (L - f.size * GEIST_LINE) / 2
    let para = NSMutableParagraphStyle()
    para.minimumLineHeight = L; para.maximumLineHeight = L; para.alignment = f.align; para.lineBreakMode = .byWordWrapping
    // Break lines like a browser does: no moving a lone last word down with the one before it.
    para.lineBreakStrategy = []
    let out = NSMutableAttributedString()
    func add(_ s: String, _ m: GuideMarks) {
      var a: [NSAttributedString.Key: Any] = [.paragraphStyle: para, .foregroundColor: f.color, .baselineOffset: shift]
      if f.ls != 0 { a[.kern] = f.ls * f.size }
      if m.strike { a[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
      var text = s
      if m.code {
        // Inline code is a rounded box, 0.88 em in Geist Mono, with 0.4 em of room on each side: the room is a space on each end that the box covers, held to the
        // words by word joiners so a line never breaks inside it (GuideLayoutManager draws the box).
        a[.font] = GuideFont.mono(f.size * 0.88, bold: m.bold)
        a[.guideCode] = f.code
        text = "\u{2060}\u{2004}" + s + "\u{2004}\u{2060}"
      } else {
        a[.font] = Rich.uiFont(f.size, f.weight, italic: m.italic, bold: m.bold)
      }
      if let href = m.link, let url = URL(string: href) { a[.link] = url; a[.underlineStyle] = NSUnderlineStyle.single.rawValue }
      out.append(NSAttributedString(string: text, attributes: a))
    }
    for x in atoms {
      switch x {
      case .run(let s, let m): add(s, m)
      case .br: add("\n", GuideMarks())
      case .image(let src, let alt): if image(src) == nil { add(alt, GuideMarks()) }
      }
    }
    // An empty line still has the height of a line.
    if out.length == 0 { add("\u{200B}", GuideMarks()) }
    return out
  }
}

enum GuideFont {
  /// Geist Mono at a size, with its weight axis set outright (UIKit can draw a variable font's named instance at the default weight).
  static func mono(_ size: CGFloat, bold: Bool = false) -> UIFont {
    guard let f = UIFont(name: Fonts.name(bold ? .bold : .regular, mono: true), size: size) else { return .monospacedSystemFont(ofSize: size, weight: bold ? .bold : .regular) }
    let axis = UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)
    return UIFont(descriptor: f.fontDescriptor.addingAttributes([axis: [0x7767_6874: bold ? 700 : 400]]), size: size)
  }
}

enum GuideLinks {
  /// Only these ever open (guide.js writes no other, and this checks again): web pages, mail, and a jump within the page.
  static func allowed(_ href: String) -> Bool {
    let h = href.lowercased()
    return h.hasPrefix("http://") || h.hasPrefix("https://") || h.hasPrefix("mailto:") || h.hasPrefix("#")
  }
  /// A tap on a link: a web page or mail opens outside the app; a jump within the page (#heading) scrolls to that heading (`expand` first opens a Guide that was cut short).
  static func open(_ url: URL, from words: UITextView? = nil, expand: (() -> Void)? = nil) {
    guard let s = url.scheme?.lowercased() else {
      // (A tap is on the main thread.)
      if let id = url.fragment, !id.isEmpty, let words { MainActor.assumeIsolated { GuideAnchors.jump(id, from: words, expand: expand) } }
      return
    }
    guard ["http", "https", "mailto"].contains(s) else { return }
    UIApplication.shared.open(url)
  }
}

/// A paragraph, heading or cell's words as a text view; a heading knows its id, which a link inside the page can jump to.
final class GuideWords: UITextView {
  var anchorID: String?
}

/// A jump from a link inside the page to one of its headings.
@MainActor
enum GuideAnchors {
  /// Scrolls the page the tapped words are on so the heading `id` is at the top of it (a moment later when the Guide first has to open to show it).
  static func jump(_ id: String, from words: UITextView, expand: (() -> Void)?) {
    // The page is the nearest scroll view around the words that holds the heading too and scrolls up and down (not a table's own sideways one).
    var up = words.superview, page: UIScrollView?
    while let v = up {
      if let sv = v as? UIScrollView, sv.contentSize.height > sv.bounds.height + 1, find(id, in: sv) != nil { page = sv; break }
      up = v.superview
    }
    guard let page else { return }
    expand?()
    DispatchQueue.main.asyncAfter(deadline: .now() + (expand == nil ? 0 : 0.45)) { [weak page] in
      guard let page, let target = find(id, in: page) else { return }
      let at = target.convert(target.bounds, to: page).minY
      // (A page that runs under the status bar, like a deck's, keeps the heading clear of it.)
      let under = max(0, (page.window?.safeAreaInsets.top ?? 0) - page.convert(page.bounds, to: nil).minY)
      let low = -page.adjustedContentInset.top, high = max(low, page.contentSize.height - page.bounds.height + page.adjustedContentInset.bottom)
      page.setContentOffset(CGPoint(x: page.contentOffset.x, y: min(max(at - under - 16, low), high)), animated: true)
    }
  }
  private static func find(_ id: String, in root: UIView) -> GuideWords? {
    if let w = root as? GuideWords, w.anchorID == id { return w }
    for v in root.subviews { if let f = find(id, in: v) { return f } }
    return nil
  }
}

private struct GuideExpandKey: EnvironmentKey { static let defaultValue: (() -> Void)? = nil }
extension EnvironmentValues {
  /// Opens the Guide when it is cut short (its Show more), so a link to a heading further down can show it.
  var guideExpand: (() -> Void)? { get { self[GuideExpandKey.self] } set { self[GuideExpandKey.self] = newValue } }
}

enum GuideImages {
  /// The pictures a Guide on your own deck page may show: this app's own files (/media/name.png), nothing from anywhere else.
  static func own(_ src: String) -> URL? {
    src.range(of: #"^/media/[\w-]+\.(?:png|jpe?g|gif|webp)$"#, options: [.regularExpression, .caseInsensitive]) != nil ? API.media(src) : nil
  }
  /// A shared deck's Guide may also show what the app made public with the deck (its public storage), and nothing else.
  static func shared(_ src: String) -> URL? {
    if let u = own(src) { return u }
    return src.range(of: #"^https://[^/]+/storage/v1/object/public/shared/[\w./-]+\.(?:png|jpe?g|gif|webp)$"#, options: [.regularExpression, .caseInsensitive]) != nil ? URL(string: src) : nil
  }
}

// ---------- the text view: wrapping words, with tappable links and rounded code ----------
/// Draws the rounded boxes behind inline code (`.guideCode` runs): the box is the code's own height (0.88 em of font, and 0.15 em above and below), centered
/// in the line, with a 6 point corner.
final class GuideLayoutManager: NSLayoutManager {
  override func drawBackground(forGlyphRange glyphsToShow: NSRange, at origin: CGPoint) {
    super.drawBackground(forGlyphRange: glyphsToShow, at: origin)
    guard let storage = textStorage, let container = textContainers.first else { return }
    let chars = characterRange(forGlyphRange: glyphsToShow, actualGlyphRange: nil)
    storage.enumerateAttribute(.guideCode, in: chars) { value, range, _ in
      guard let color = value as? UIColor, let font = storage.attribute(.font, at: range.location, effectiveRange: nil) as? UIFont else { return }
      let glyphs = glyphRange(forCharacterRange: range, actualCharacterRange: nil)
      enumerateEnclosingRects(forGlyphRange: glyphs, withinSelectedGlyphRange: NSRange(location: NSNotFound, length: 0), in: container) { rect, _ in
        let r = rect.offsetBy(dx: origin.x, dy: origin.y)
        let h = (font.ascender - font.descender) + font.pointSize * 0.3
        let box = CGRect(x: r.minX, y: r.midY - h / 2 + 0.5, width: r.width, height: h)
        color.setFill()
        UIBezierPath(roundedRect: box, cornerRadius: 6).fill()
      }
    }
  }
}

struct GuideTextView: UIViewRepresentable {
  @Environment(\.guideExpand) private var expand
  let text: NSAttributedString
  /// It's a heading (what VoiceOver says, and a test can look for).
  var header = false
  /// The heading's id, which a link inside the page can jump to.
  var anchor: String? = nil
  func makeUIView(context: Context) -> GuideWords {
    // (Its own text system, the older one: that is the one whose backgrounds can be drawn by hand.)
    let storage = NSTextStorage(), lm = GuideLayoutManager(), tc = NSTextContainer(size: CGSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
    storage.addLayoutManager(lm); lm.addTextContainer(tc)
    tc.lineFragmentPadding = 0; tc.widthTracksTextView = true
    let v = GuideWords(frame: .zero, textContainer: tc)
    v.isEditable = false; v.isScrollEnabled = false; v.isSelectable = true
    v.backgroundColor = .clear; v.textContainerInset = .zero
    // The runs say how a link looks (the text's color, underlined): the text view's own blue is left off.
    v.linkTextAttributes = [:]; v.dataDetectorTypes = []
    v.delegate = context.coordinator
    v.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    return v
  }
  func updateUIView(_ v: GuideWords, context: Context) {
    if !v.attributedText.isEqual(to: text) { v.attributedText = text }
    context.coordinator.expand = expand
    v.anchorID = anchor
    // Read out as the words themselves (without the room around inline code), as a heading when it is one.
    v.isAccessibilityElement = true
    v.accessibilityTraits = header ? [.staticText, .header] : .staticText
    v.accessibilityLabel = text.string.replacingOccurrences(of: "\u{2060}", with: "").replacingOccurrences(of: "\u{2004}", with: "").replacingOccurrences(of: "\u{200B}", with: "")
    #if DEBUG
    // (A check reads which words are links, and where they go, from here.)
    var links: [String] = []
    text.enumerateAttribute(.link, in: NSRange(location: 0, length: text.length)) { value, range, _ in
      if let u = value as? URL { links.append((text.string as NSString).substring(with: range).replacingOccurrences(of: "\u{2060}", with: "").replacingOccurrences(of: "\u{2004}", with: "") + " -> " + u.absoluteString) }
    }
    v.accessibilityValue = links.isEmpty ? nil : links.joined(separator: " | ")
    #endif
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: GuideWords, context: Context) -> CGSize? {
    let w = proposal.width ?? 10_000
    let s = uiView.sizeThatFits(CGSize(width: w, height: .greatestFiniteMagnitude))
    return CGSize(width: min(w, ceil(s.width)), height: s.height)
  }
  func makeCoordinator() -> Coordinator { Coordinator() }
  final class Coordinator: NSObject, UITextViewDelegate {
    var expand: (() -> Void)?
    func textView(_ textView: UITextView, primaryActionFor textItem: UITextItem, defaultAction: UIAction) -> UIAction? {
      guard case .link(let url) = textItem.content else { return defaultAction }
      return UIAction { [weak self, weak textView] _ in GuideLinks.open(url, from: textView, expand: self?.expand) }
    }
  }
}

// ---------- the document ----------
/// A Guide's blocks, drawn in `width` points (the room a block has: a table and a code block need to know). `image` says which pictures may show.
struct GuideDoc: View {
  @Environment(\.theme) private var t
  let blocks: [GuideBlock]
  let width: CGFloat
  var image: (String) -> URL? = GuideImages.own
  var body: some View { GuideBlocks(blocks: blocks, width: width, image: image, tight: false, nested: false) }
}

/// A run of blocks one under the other, set apart by the margins of the CSS (the first one has none above it, the last none below it).
struct GuideBlocks: View {
  @Environment(\.theme) private var t
  let blocks: [GuideBlock]
  let width: CGFloat
  let image: (String) -> URL?
  /// Inside a tight list's item: its paragraphs have no margin below them.
  let tight: Bool
  /// Inside a list item: a list has no margin below it there.
  let nested: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(blocks.enumerated()), id: \.offset) { i, b in
        GuideBlockView(block: b, width: width, image: image, tight: tight)
          .padding(.top, i == 0 ? 0 : max(GuideCSS.bottom(blocks[i - 1], nested: nested, tight: tight), GuideCSS.top(b)))
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct GuideBlockView: View {
  @Environment(\.theme) private var t
  let block: GuideBlock
  let width: CGFloat
  let image: (String) -> URL?
  var tight = false

  var body: some View {
    switch block {
    case .h(let level, let inline, let id):
      let size = GuideCSS.headSize(level), pad = level == 1 ? 0.3 * size : level == 2 ? 0.25 * size : 0
      VStack(spacing: 0) {
        GuideInlineView(inline: inline, size: size, weight: .semibold, lh: 1.25, ls: -0.02, muted: level == 6, header: true, anchor: id, width: width, image: image)
        if level <= 2 { Color.clear.frame(height: pad); t.line.frame(height: 1) }
      }
      .id("gd-" + id)
    case .p(let inline):
      GuideInlineView(inline: inline, width: width, image: image)
    case .code(_, let text): GuideCodeBlock(text: text)
    case .quote(let bs):
      HStack(alignment: .top, spacing: 0) {
        t.line.frame(width: 3)
        GuideBlocks(blocks: bs, width: width - 3 - 2 * GuideCSS.em, image: image, tight: false, nested: false)
          .environment(\.guideMuted, true)
          .padding(.horizontal, GuideCSS.em)
      }
      .fixedSize(horizontal: false, vertical: true)
    case .ul(let isTight, let items): GuideList(ordered: false, start: 1, tight: isTight, items: items, width: width, image: image)
    case .ol(let start, let isTight, let items): GuideList(ordered: true, start: start, tight: isTight, items: items, width: width, image: image)
    case .hr: t.line.frame(height: 1)
    case .table(let align, let head, let rows): GuideTable(align: align, head: head, rows: rows, width: width, image: image)
    }
  }
}

private struct GuideMutedKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues { var guideMuted: Bool { get { self[GuideMutedKey.self] } set { self[GuideMutedKey.self] = newValue } } }

/// A paragraph, heading or cell: its words, with its pictures between them (each on a line of its own).
struct GuideInlineView: View {
  @Environment(\.theme) private var t
  @Environment(\.guideMuted) private var inQuote
  let inline: [GuideInline]
  var size: CGFloat = GuideCSS.em
  var weight: Font.Weight = .regular
  var lh: CGFloat = GuideCSS.line
  var ls: CGFloat = 0
  /// The words are in the muted color whatever they sit in (a level 6 heading); inside a quote they are anyway.
  var muted = false
  var align: NSTextAlignment = .left
  var header = false
  /// A heading's id (a link inside the page can jump to it).
  var anchor: String? = nil
  let width: CGFloat
  let image: (String) -> URL?
  var body: some View {
    let f = GuideFace(size: size, weight: weight, lh: lh, ls: ls, color: UIColor(muted || inQuote ? t.muted : t.text), code: UIColor(t.bg), align: align)
    // The atoms in runs of words, split at the pictures that can be shown.
    var groups: [(atoms: [GuideAtom], pic: (String, String)?)] = []
    var cur: [GuideAtom] = []
    for a in GuideText.atoms(inline) {
      if case .image(let src, let alt) = a, image(src) != nil {
        if !cur.isEmpty { groups.append((cur, nil)); cur = [] }
        groups.append(([], (src, alt)))
      } else { cur.append(a) }
    }
    if !cur.isEmpty || groups.isEmpty { groups.append((cur, nil)) }
    return VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(groups.enumerated()), id: \.offset) { _, g in
        if let pic = g.pic, let url = image(pic.0) { GuidePicture(url: url, alt: pic.1, width: width) }
        else { GuideTextView(text: GuideText.attributed(g.atoms, f, image: image), header: header, anchor: anchor) }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// A picture in a Guide: as wide as it is (a browser's `max-width: 100%`: no wider than the page, and no bigger than it really is), with rounded corners; its description
/// while it isn't here, or if it can't be had.
struct GuidePicture: View {
  @Environment(\.theme) private var t
  let url: URL
  let alt: String
  let width: CGFloat
  @State private var image: UIImage?
  @State private var failed = false
  var body: some View {
    Group {
      if let image {
        let w = min(width, image.size.width)
        Image(uiImage: image).resizable().scaledToFit().frame(width: w).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityLabel(alt.isEmpty ? "Picture" : alt).accessibilityAddTraits(.isImage)
      } else if failed {
        Text(alt).css(GuideCSS.em, lh: GuideCSS.line).foregroundStyle(t.text).frame(maxWidth: .infinity, alignment: .leading)
      } else {
        RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.bg).frame(height: 120)
      }
    }
    .padding(.vertical, 2)
    .task(id: url) {
      if let got = await Pictures.load(url.absoluteString) { image = got; failed = false } else { failed = true }
    }
  }
}

// ---------- code ----------
/// A block of code: Geist Mono at 0.85 em on the page's color, 12 by 14 points of room, scrolling sideways when a line is long (nothing wraps).
struct GuideCodeBlock: View {
  @Environment(\.theme) private var t
  @Environment(\.guideMuted) private var inQuote
  let text: String
  var body: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      Text(text.isEmpty ? " " : text)
        .font(Font(GuideFont.mono(GuideCSS.em * 0.85)))
        .lineSpacing(max(0, GuideCSS.em * 0.85 * 1.5 - GuideCSS.em * 0.85 * 1.3))
        .foregroundStyle(inQuote ? t.muted : t.text)
        .fixedSize(horizontal: true, vertical: true)
        .padding(.horizontal, 14).padding(.vertical, 12)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.bg))
    .accessibilityElement(children: .ignore).accessibilityLabel(text).accessibilityAddTraits(.isStaticText)
  }
}

// ---------- lists ----------
struct GuideList: View {
  @Environment(\.theme) private var t
  let ordered: Bool
  let start: Int
  let tight: Bool
  let items: [GuideItem]
  let width: CGFloat
  let image: (String) -> URL?
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(items.enumerated()), id: \.offset) { i, it in
        GuideListItem(ordered: ordered, number: start + i, tight: tight, item: it, width: width, image: image)
          .padding(.top, i == 0 ? 0 : max(GuideCSS.item, GuideCSS.itemBottom(items[i - 1], tight: tight), it.blocks.first.map(GuideCSS.top) ?? 0))
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct GuideListItem: View {
  @Environment(\.theme) private var t
  let ordered: Bool
  let number: Int
  let tight: Bool
  let item: GuideItem
  let width: CGFloat
  let image: (String) -> URL?
  /// A first line's height: the marker sits on it.
  private let lineH = GuideCSS.em * GuideCSS.line
  var body: some View {
    if let checked = item.checked {
      // A task: its box hangs in the indent (the list's own left edge), 0.55 em before the words.
      HStack(alignment: .top, spacing: 0.55 * GuideCSS.em) {
        GuideCheckbox(checked: checked).frame(height: lineH, alignment: .center)
        GuideBlocks(blocks: item.blocks, width: width - 13 - 0.55 * GuideCSS.em, image: image, tight: tight, nested: true)
      }
    } else {
      HStack(alignment: .top, spacing: 0) {
        marker.frame(width: GuideCSS.indent, height: lineH, alignment: .trailing)
        GuideBlocks(blocks: item.blocks, width: width - GuideCSS.indent, image: image, tight: tight, nested: true)
      }
    }
  }
  @ViewBuilder private var marker: some View {
    if ordered {
      // "1." in the text's own type, ending a space before the words.
      Text("\(number).").font(.geist(GuideCSS.em)).foregroundStyle(t.text).padding(.trailing, 0.27 * GuideCSS.em).lineLimit(1).fixedSize()
        .frame(height: lineH)
    } else {
      // A disc 5 points across, its left edge 6 points in from the list's, a little above the middle of the line (measured on the canvas).
      Circle().fill(t.text).frame(width: 5, height: 5).padding(.trailing, GuideCSS.indent - 11).frame(height: lineH).offset(y: -0.25)
    }
  }
}

/// A task's box: Lucida's own check, never a browser's checkbox (design/materials.mjs GUIDE_CSS `.gd-box`): 15 points, a 4.5 point corner, a thin border in the muted
/// color when it's empty; filled in the text's color with a check in the page's color when it's done.
struct GuideCheckbox: View {
  @Environment(\.theme) private var t
  let checked: Bool
  var body: some View {
    ZStack {
      if checked {
        RoundedRectangle(cornerRadius: 4.5, style: .continuous).fill(t.text)
        Path { p in p.move(to: CGPoint(x: 4, y: 7.8)); p.addLine(to: CGPoint(x: 6.6, y: 10.4)); p.addLine(to: CGPoint(x: 11.2, y: 4.6)) }
          .stroke(t.bg, style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
      } else {
        RoundedRectangle(cornerRadius: 4.5, style: .continuous).strokeBorder(t.muted, lineWidth: 1.5)
      }
    }
    .frame(width: 15, height: 15)
    .accessibilityElement(children: .ignore).accessibilityLabel(checked ? "Done" : "Not done")
  }
}

// ---------- tables ----------
/// A table: its columns as wide as their words (a browser's auto layout: when they don't fit, each is squeezed between the width of its longest word and
/// of its longest line, in proportion; when even the longest words don't fit, the table scrolls sideways), a 1 point grid, and a shaded header.
struct GuideTable: View {
  @Environment(\.theme) private var t
  @Environment(\.guideMuted) private var inQuote
  let align: [String]
  let head: [[GuideInline]]
  let rows: [[[GuideInline]]]
  let width: CGFloat
  let image: (String) -> URL?

  private var cols: Int { max(head.count, rows.map(\.count).max() ?? 0) }
  private func face(_ header: Bool, _ c: Int) -> GuideFace {
    GuideFace(size: GuideCSS.em, weight: header ? .semibold : .regular, lh: GuideCSS.line, ls: 0, color: UIColor(inQuote ? t.muted : t.text), code: UIColor(t.bg),
              align: c < align.count ? ["right": .right, "center": .center][align[c]] ?? .left : .left)
  }
  private func cell(_ inline: [GuideInline], _ header: Bool, _ c: Int) -> NSAttributedString { GuideText.attributed(GuideText.atoms(inline), face(header, c), image: { _ in nil }) }

  var body: some View {
    let n = cols
    let grid: [[NSAttributedString]] = ([head] + rows).enumerated().map { r, row in (0..<n).map { c in cell(c < row.count ? row[c] : [], r == 0, c) } }
    // Each column's widest line, and its widest letter (a word can break anywhere): the cell's room (12 on each side and its border) is added.
    var maxW = [CGFloat](repeating: 0, count: n), minW = [CGFloat](repeating: 0, count: n)
    for row in grid {
      for (c, a) in row.enumerated() {
        let one = ceil(a.boundingRect(with: CGSize(width: 100_000, height: 100_000), options: [.usesLineFragmentOrigin], context: nil).width)
        var letter: CGFloat = 0
        let str = a.string
        for idx in str.indices {
          let at = idx.utf16Offset(in: str)
          let font = a.length > 0 ? a.attribute(.font, at: min(at, a.length - 1), effectiveRange: nil) as? UIFont ?? UIFont.systemFont(ofSize: 15) : UIFont.systemFont(ofSize: 15)
          letter = max(letter, (String(str[idx]) as NSString).size(withAttributes: [.font: font]).width)
        }
        maxW[c] = max(maxW[c], one); minW[c] = max(minW[c], ceil(letter))
      }
    }
    let room: CGFloat = 25, widths = GuideTable.columns(min: minW.map { $0 + room }, max: maxW.map { $0 + room }, available: width - 1)
    let total = widths.reduce(0, +) + 1
    let tableView = GuideGrid(cols: n, widths: widths) {
      ForEach(0..<(grid.count * n), id: \.self) { k in
        let r = k / n, c = k % n
        GuideTextView(text: grid[r][c])
          .padding(.horizontal, 13).padding(.vertical, 7)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .background(r == 0 ? t.bg : Color.clear)
          .overlay(Rectangle().strokeBorder(t.line, lineWidth: 1))
      }
    }
    return Group {
      if total > width { ScrollView(.horizontal, showsIndicators: false) { tableView.frame(width: total) } }
      else { tableView.frame(width: total).frame(maxWidth: .infinity, alignment: .leading) }
    }
  }

  /// A browser's automatic table layout: every column gets its longest line if all of them fit; otherwise each is squeezed from its longest line toward its
  /// widest letter, all by the same share; and if even those don't fit, they stay at their widest letter (the table is wider than its room, and scrolls).
  static func columns(min mn: [CGFloat], max mx: [CGFloat], available w: CGFloat) -> [CGFloat] {
    let sumMax = mx.reduce(0, +), sumMin = mn.reduce(0, +)
    if sumMax <= w { return mx }
    if sumMin >= w { return mn }
    let f = (w - sumMin) / (sumMax - sumMin)
    return zip(mn, mx).map { $0 + ($1 - $0) * f }
  }
}

/// Table cells in rows, each column its own width (`widths`: with its border and 12 points of room each side), each row as tall as its tallest cell, and neighbors
/// overlapping by their 1 point border (so the grid is one point wide everywhere).
struct GuideGrid: Layout {
  let cols: Int
  let widths: [CGFloat]
  /// Each row's height: the tallest cell (a cell is one point wider and taller than its step, to share its border with the next).
  private func heights(_ subviews: Subviews) -> [CGFloat] {
    guard cols > 0 else { return [] }
    var out: [CGFloat] = []
    var start = 0
    while start < subviews.count {
      var h: CGFloat = 0
      for c in 0..<cols where start + c < subviews.count {
        let size = subviews[start + c].sizeThatFits(ProposedViewSize(width: widths[c] + 1, height: nil))
        h = max(h, size.height)
      }
      out.append(h)
      start += cols
    }
    return out
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    var h: CGFloat = 1
    for row in heights(subviews) { h += row - 1 }
    return CGSize(width: widths.reduce(0, +) + 1, height: h)
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for (r, h) in heights(subviews).enumerated() {
      var x = bounds.minX
      for c in 0..<cols where r * cols + c < subviews.count {
        subviews[r * cols + c].place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(width: widths[c] + 1, height: h))
        x += widths[c]
      }
      y += h - 1
    }
  }
}

// ---------- a row that wraps, like CSS flex-wrap ----------
/// A row of items that goes on to the next line when one doesn't fit (CSS `display: flex; flex-wrap: wrap; gap`). An item can grow into what's left on its
/// line (`.flexGrow()`, like flex-grow 1: a spacer pushes what follows it to the right), start from nothing instead of its own width (`.flexBasisZero()`, like
/// flex: 1 1 0) and has a smallest width (`.flexMin(130)`). Items sit in the middle of their line, top to bottom.
struct FlexWrap: Layout {
  var gap: CGFloat = 8
  var rowGap: CGFloat? = nil
  var alignment: VerticalAlignment = .center
  struct Grow: LayoutValueKey { static let defaultValue: CGFloat = 0 }
  struct Zero: LayoutValueKey { static let defaultValue = false }
  struct MinW: LayoutValueKey { static let defaultValue: CGFloat = 0 }

  struct Line { var items: [Int] = [], widths: [CGFloat] = [], height: CGFloat = 0 }
  private func lines(_ width: CGFloat?, _ subviews: Subviews) -> [Line] {
    let natural = subviews.map { $0.sizeThatFits(.unspecified).width }
    let hyp = subviews.enumerated().map { i, s in max(s[Zero.self] ? 0 : natural[i], s[MinW.self]) }
    var out: [Line] = [], cur = Line(), used: CGFloat = 0
    for i in subviews.indices {
      let w = width.map { min(hyp[i], $0) } ?? hyp[i]
      if let width, !cur.items.isEmpty, used + gap + w > width + 0.01 { out.append(cur); cur = Line(); used = 0 }
      used += cur.items.isEmpty ? w : gap + w
      cur.items.append(i); cur.widths.append(w)
    }
    if !cur.items.isEmpty { out.append(cur) }
    // What's left on a line goes to the items that grow.
    if let width {
      for k in out.indices {
        let items = out[k].items, grow = items.map { subviews[$0][Grow.self] }, total = grow.reduce(0, +)
        guard total > 0 else { continue }
        let bases = items.map { subviews[$0][Zero.self] ? 0 : natural[$0] }
        let free = width - bases.reduce(0, +) - gap * CGFloat(items.count - 1)
        for (j, i) in items.enumerated() where grow[j] > 0 { out[k].widths[j] = max(subviews[i][MinW.self], bases[j] + max(0, free) * grow[j] / total) }
      }
    }
    for k in out.indices {
      out[k].height = zip(out[k].items, out[k].widths).map { subviews[$0].sizeThatFits(ProposedViewSize(width: $1, height: nil)).height }.max() ?? 0
    }
    return out
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let ls = lines(proposal.width, subviews)
    let w = ls.map { $0.widths.reduce(0, +) + gap * CGFloat(max(0, $0.items.count - 1)) }.max() ?? 0
    return CGSize(width: proposal.width.map { max(w, 0) > $0 ? $0 : w } ?? w, height: ls.map(\.height).reduce(0, +) + (rowGap ?? gap) * CGFloat(max(0, ls.count - 1)))
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for line in lines(bounds.width, subviews) {
      var x = bounds.minX
      for (j, i) in line.items.enumerated() {
        let h = subviews[i].sizeThatFits(ProposedViewSize(width: line.widths[j], height: nil)).height
        let dy = alignment == .top ? 0 : alignment == .bottom ? line.height - h : (line.height - h) / 2
        subviews[i].place(at: CGPoint(x: x, y: y + dy), anchor: .topLeading, proposal: ProposedViewSize(width: line.widths[j], height: h))
        x += line.widths[j] + gap
      }
      y += line.height + (rowGap ?? gap)
    }
  }
}
extension View {
  /// In a FlexWrap: grows into what's left on its line.
  func flexGrow(_ g: CGFloat = 1) -> some View { layoutValue(key: FlexWrap.Grow.self, value: g) }
  /// In a FlexWrap: starts from nothing instead of its own width, like flex: 1 1 0.
  func flexBasisZero() -> some View { layoutValue(key: FlexWrap.Zero.self, value: true) }
  /// In a FlexWrap: its smallest width.
  func flexMin(_ w: CGFloat) -> some View { layoutValue(key: FlexWrap.MinW.self, value: w) }
}
