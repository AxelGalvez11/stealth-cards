// Image occlusion (design/build.mjs "Image occlusion"): an image card can hide parts of its picture behind boxes, and
// each box is its own card, like each blank of a fill-in-the-blank card. A box's place and size are fractions of the
// picture, so it fits the picture at any size, and its label (what's under it) is the answer. "What to hide": only the
// box being asked, or every box, with one asked.
import SwiftUI

/// Pictures from your library's storage, fetched once (their shape is needed to put boxes on them).
@MainActor
enum Pictures {
  private static let cache = NSCache<NSString, UIImage>()
  static func cached(_ path: String?) -> UIImage? { path.flatMap { cache.object(forKey: $0 as NSString) } }
  static func load(_ path: String?) async -> UIImage? {
    guard let path, path != "mock" else { return nil }
    if let hit = cached(path) { return hit }
    guard let url = API.media(path), let got = try? await URLSession.shared.data(from: url), let img = UIImage(data: got.0) else { return nil }
    cache.setObject(img, forKey: path as NSString)
    return img
  }
  /// The sample diagram's shape (220 x 150).
  static let mockRatio: CGFloat = 220 / 150
}

/// The colors of boxes on a card: the asked box (and its number), a hidden one, and the ring that sets them off the picture.
struct OccColors { var ask, askText, cover, coverText, ring: Color }

/// Boxes over a picture (review and Learn): the asked box filled in with its number; with Hide all, the others gray with
/// theirs. Once the answer shows, the asked box fades to an outline (at once with Reduce Motion; covering a new card's box
/// is always at once, so its answer never shows through).
struct OccBoxes: View {
  @Environment(\.accessibilityReduceMotion) private var still
  let boxes: [OccBox]
  let ask: Int
  let mode: String
  let shown: Bool
  let colors: OccColors
  var size: CGFloat = 12
  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .topLeading) {
        ForEach(Array(boxes.enumerated()), id: \.element.id) { i, b in
          let asked = i == ask
          if asked || mode == "all" {
            let c = colors, fade = asked && shown && !still
            ZStack {
              RoundedRectangle(cornerRadius: 6, style: .circular).fill(asked ? (shown ? .clear : c.ask) : c.cover)
                .animation(fade ? .out(0.45) : nil, value: shown)
              if asked { RoundedRectangle(cornerRadius: 6, style: .circular).strokeBorder(c.ask, lineWidth: 2.5) }
              Text("\(i + 1)").font(.geist(size, .bold)).foregroundStyle(asked ? (shown ? .clear : c.askText) : c.coverText)
                .animation(fade ? .easeOut(duration: 0.3) : nil, value: shown)
            }
            .background(RoundedRectangle(cornerRadius: 8, style: .circular).strokeBorder(c.ring, lineWidth: 2).padding(-2))
            .frame(width: b.w * g.size.width, height: b.h * g.size.height)
            .offset(x: b.x * g.size.width, y: b.y * g.size.height)
            .zIndex(asked ? 2 : 1)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// A picture with its boxes, drawn at the size it's given (its own shape).
struct OccPicture: View {
  let image: String?
  let ui: UIImage?
  let boxes: [OccBox]
  let ask: Int
  let mode: String
  let shown: Bool
  let colors: OccColors
  var size: CGFloat = 12
  var radius: CGFloat = 14
  var body: some View {
    ZStack {
      if image == "mock" { CellDiagram(pointer: false) }
      else if let ui { Image(uiImage: ui).resizable().clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous)) }
      OccBoxes(boxes: boxes, ask: ask, mode: mode, shown: shown, colors: colors, size: size)
    }
  }
}

/// A card's face for a picture with boxes (occFace): the picture as big as it fits, the question under it, and the
/// answer (the box's label), which keeps its place and shows as the box fades to an outline.
struct OccFace: View {
  @Environment(\.theme) private var t
  let card: CardFace
  let revealed: Bool
  var big = false
  @State private var picture: (path: String, image: UIImage)? = nil
  var body: some View {
    let i = card.occIndex ?? 0, b = card.boxes[i], ui = picture?.path == card.image ? picture?.image : Pictures.cached(card.image)
    let ready = card.image == "mock" || ui != nil
    let ratio: CGFloat = card.image == "mock" ? Pictures.mockRatio : ui.map { $0.size.height > 0 ? $0.size.width / $0.size.height : 4 / 3 } ?? 4 / 3
    let ask = Rich.plain(card.front).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "What’s under box \(i + 1)?" : card.front
    OccColumn(gap: big ? 14 : 12, ratio: ratio) {
      OccPicture(image: card.image, ui: ui, boxes: card.boxes, ask: i, mode: card.occ, shown: revealed,
                 colors: OccColors(ask: t.inv, askText: t.invText, cover: t.surf2, coverText: t.muted, ring: t.bg), size: big ? 13 : 12, radius: big ? 16 : 14)
        .opacity(ready ? 1 : 0)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("The picture, with box \(i + 1)" + (revealed ? " showing" : " hidden"))
      RichText(md: ask, size: big ? 22 : 18, weight: .medium, lh: 1.3, align: .center)
      if !b.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        LabelText(text: Rich.nsText([Rich.Run(t: b.label, m: "")], size: big ? 30 : 24, weight: .semibold, ls: -0.02, lh: 1.2, color: UIColor(t.text), dark: t.dark, align: .center))
          .modifier(FadeUp(on: revealed))
          .accessibilityHidden(!revealed)
      }
    }
    // Inside the card's 1-point line, like the canvas's card (its border takes that room).
    .padding(1)
    .task(id: card.image) { if let p = card.image, let img = await Pictures.load(p) { picture = (p, img) } }
  }
}

/// sc-fade-a: shows with a small rise as it fades in; hidden at once (with Reduce Motion, shown at once too).
struct FadeUp: ViewModifier {
  let on: Bool
  @Environment(\.accessibilityReduceMotion) private var still
  func body(content: Content) -> some View {
    content.opacity(on ? 1 : 0).offset(y: on || still ? 0 : 8).animation(on && !still ? .out(0.4) : nil, value: on)
  }
}

/// The picture above its words: the words take what they need, the picture the rest (as big as its shape allows), and the
/// whole group sits in the middle.
struct OccColumn: Layout {
  var gap: CGFloat
  var ratio: CGFloat
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    proposal.replacingUnspecifiedDimensions(by: CGSize(width: 300, height: 300))
  }
  func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let pic = subviews.first else { return }
    let texts = subviews.dropFirst().map { $0.sizeThatFits(ProposedViewSize(width: b.width, height: nil)) }
    let wordsH = texts.reduce(0) { $0 + $1.height + gap }
    let h = max(0, min(b.width / ratio, b.height - wordsH)), w = h * ratio
    var y = b.minY + max(0, (b.height - h - wordsH) / 2)
    pic.place(at: CGPoint(x: b.midX, y: y), anchor: .top, proposal: ProposedViewSize(width: w, height: h))
    y += h
    for (sub, size) in zip(subviews.dropFirst(), texts) {
      y += gap
      sub.place(at: CGPoint(x: b.midX, y: y), anchor: .top, proposal: ProposedViewSize(width: b.width, height: size.height))
      y += size.height
    }
  }
}

/// Learn mode's picture with its boxes (learnImage): as big as it is (at most the width and `maxH` tall), in Learn's colors;
/// the asked box turns to an outline once answered.
struct LearnPicture: View {
  @Environment(\.theme) private var t
  let image: String
  let occ: (boxes: [OccBox], ask: Int, mode: String)
  let shown: Bool
  let look: LearnLook
  var maxH: CGFloat = 180
  @State private var picture: (path: String, image: UIImage)? = nil
  var body: some View {
    let ui = picture?.path == image ? picture?.image : Pictures.cached(image)
    Fitted(natural: ui?.size ?? CGSize(width: maxH * 4 / 3, height: maxH), maxH: maxH) {
      ZStack {
        Group { if let ui { Image(uiImage: ui).resizable() } else { t.surf } }
          .background(t.surf)
          .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        OccBoxes(boxes: occ.boxes, ask: occ.ask, mode: occ.mode, shown: shown, colors: OccColors(ask: look.btn, askText: look.btnFg, cover: look.gray, coverText: look.grayInk, ring: t.bg), size: 13)
          .opacity(ui == nil ? 0 : 1)
      }
    }
    .task(id: image) { if let img = await Pictures.load(image) { picture = (image, img) } }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("The picture, with box \(occ.ask + 1)" + (shown ? " showing" : " hidden"))
  }
}

/// Something with its own size (a picture), made smaller to fit the width it's offered and `maxH` (like max-width: 100%;
/// max-height), at the leading edge.
struct Fitted: Layout {
  var natural: CGSize
  var maxH: CGFloat
  private func size(_ w: CGFloat?) -> CGSize {
    guard natural.width > 0, natural.height > 0 else { return .zero }
    let k = min(1, (w ?? natural.width) / natural.width, maxH / natural.height)
    return CGSize(width: natural.width * k, height: natural.height * k)
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize { size(proposal.width) }
  func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let s = size(b.width)
    for v in subviews { v.place(at: b.origin, proposal: ProposedViewSize(s)) }
  }
}

// ---------- the editor ----------

/// The picture in the card editor, with its boxes (occPicture): drag on it to draw a box; tap a box to pick it, then
/// move it, pull a corner to resize it, or take it away with its ×. A picked box shows its corners and ×, above the rest.
struct OccEditor: View {
  @Environment(\.theme) private var t
  let image: String
  let ui: UIImage?
  @Binding var boxes: [OccBox]
  @Binding var picked: String?
  /// A drag on the picture is under way (the page shouldn't scroll).
  @Binding var busy: Bool
  var height: CGFloat = 240

  private enum Kind { case draw, move, size, del, none }
  private struct Drag { var kind: Kind; var id: String; var corner = ""; var at: CGPoint; var start: [OccBox]; var moved = false; var live: [OccBox]? = nil }
  @State private var drag: Drag? = nil

  var body: some View {
    GeometryReader { g in
      let pic = frame(g.size), shown = drag?.live ?? boxes
      ZStack(alignment: .topLeading) {
        Group {
          if image == "mock" { CellDiagram(pointer: false) }
          else if let ui { Image(uiImage: ui).resizable().clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous)) }
        }
        .frame(width: pic.width, height: pic.height)
        .offset(x: pic.minX, y: pic.minY)
        .accessibilityHidden(true)
        // The picked box sits on top of the others, so its corners can always be reached.
        ForEach(Array(shown.enumerated()), id: \.element.id) { i, b in
          boxView(b, i, pic).zIndex(b.id == picked ? 2 : 1)
        }
      }
      .frame(width: g.size.width, height: g.size.height, alignment: .topLeading)
      .contentShape(Rectangle())
      .gesture(DragGesture(minimumDistance: 0, coordinateSpace: .local)
        .onChanged { v in changed(v, pic) }
        .onEnded { v in ended(v, pic) })
    }
    .frame(height: height)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain)
    .accessibilityLabel("The picture. Drag on it to hide a part behind a box.")
  }

  /// Where the picture sits: its own size, made smaller to fit inside the gray box's 14-point padding (the sample
  /// diagram fills the height).
  private func frame(_ box: CGSize) -> CGRect {
    let aw = max(0, box.width - 28), ah = max(0, height - 28)
    var s: CGSize
    if image == "mock" { let h = min(ah, aw / Pictures.mockRatio); s = CGSize(width: (h * Pictures.mockRatio).rounded(), height: h) }
    else if let ui, ui.size.width > 0, ui.size.height > 0 { let k = min(1, aw / ui.size.width, ah / ui.size.height); s = CGSize(width: ui.size.width * k, height: ui.size.height * k) }
    else { s = CGSize(width: aw, height: ah) }
    return CGRect(x: (box.width - s.width) / 2, y: (height - s.height) / 2, width: s.width, height: s.height)
  }
  private func rect(_ b: OccBox, _ pic: CGRect) -> CGRect {
    CGRect(x: pic.minX + b.x * pic.width, y: pic.minY + b.y * pic.height, width: b.w * pic.width, height: b.h * pic.height)
  }
  /// The ×: above the box's middle, or below it near the picture's top, or inside a box that fills the picture's height.
  private func xCenter(_ b: OccBox, _ r: CGRect) -> CGPoint {
    b.y >= 0.16 ? CGPoint(x: r.midX, y: r.minY - 20) : b.y + b.h <= 0.84 ? CGPoint(x: r.midX, y: r.maxY + 20) : CGPoint(x: r.maxX - 20, y: r.minY + 20)
  }

  @ViewBuilder private func boxView(_ b: OccBox, _ i: Int, _ pic: CGRect) -> some View {
    let on = b.id == picked, r = rect(b, pic)
    let tint = t.dark ? Color.white.opacity(0.14) : Color.black.opacity(0.08)
    ZStack {
      RoundedRectangle(cornerRadius: 6, style: .circular).fill(on ? tint : t.surf2)
      if on { RoundedRectangle(cornerRadius: 6, style: .circular).strokeBorder(t.inv, lineWidth: 2) }
      else { Text("\(i + 1)").font(.geist(12, .bold)).foregroundStyle(t.text) }
    }
    .background(RoundedRectangle(cornerRadius: 8, style: .circular).strokeBorder(t.bg, lineWidth: 2).padding(-2))
    .frame(width: r.width, height: r.height)
    .overlay {
      if on {
        ZStack(alignment: .topLeading) {
          ForEach(["nw", "sw", "se"], id: \.self) { c in
            Circle().fill(t.bg).frame(width: 12, height: 12).background(Circle().fill(t.inv).frame(width: 16, height: 16))
              .position(x: c.contains("w") ? 0 : r.width, y: c.contains("n") ? 0 : r.height)
          }
          let x = xCenter(b, r)
          Icon("close", 10, 2.8).foregroundStyle(t.invText).frame(width: 24, height: 24).background(Circle().fill(t.inv))
            .background(Circle().fill(t.bg).frame(width: 28, height: 28))
            .position(x: x.x - r.minX, y: x.y - r.minY)
        }
        .frame(width: r.width, height: r.height)
      }
    }
    .position(x: r.midX, y: r.midY)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Box \(i + 1)")
    .accessibilityValue(b.label)
    .accessibilityAddTraits(on ? .isSelected : [])
    .accessibilityAction { picked = b.id }
    .accessibilityAction(named: "Remove box \(i + 1)") { remove(b.id) }
  }

  // ---------- dragging ----------
  /// What's under the finger: the picked box's × or a corner (they reach further than they look, mostly outward), a box
  /// (the picked one first), or the picture itself.
  private func target(_ p: CGPoint, _ pic: CGRect) -> (Kind, String, String) {
    if let id = picked, let b = boxes.first(where: { $0.id == id }) {
      let r = rect(b, pic), x = xCenter(b, r)
      if abs(p.x - x.x) <= 22 && abs(p.y - x.y) <= 22 { return (.del, id, "") }
      let corners: [(String, CGPoint, CGRect)] = [
        ("nw", CGPoint(x: r.minX, y: r.minY), CGRect(x: -22, y: -22, width: 31, height: 31)),
        ("sw", CGPoint(x: r.minX, y: r.maxY), CGRect(x: -22, y: -9, width: 31, height: 31)),
        ("se", CGPoint(x: r.maxX, y: r.maxY), CGRect(x: -9, y: -9, width: 31, height: 31))]
      for (c, at, area) in corners where area.offsetBy(dx: at.x, dy: at.y).contains(p) { return (.size, id, c) }
      if r.contains(p) { return (.move, id, "") }
    }
    for b in boxes.reversed() where b.id != picked && rect(b, pic).contains(p) { return (.move, b.id, "") }
    if pic.contains(p) { return (boxes.count < 30 ? .draw : .none, "b" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36) + String(UUID().uuidString.prefix(4)).lowercased(), "") }
    return (.none, "", "")
  }
  private func unit(_ p: CGPoint, _ pic: CGRect) -> CGPoint {
    CGPoint(x: min(1, max(0, (p.x - pic.minX) / max(1, pic.width))), y: min(1, max(0, (p.y - pic.minY) / max(1, pic.height))))
  }
  private func changed(_ v: DragGesture.Value, _ pic: CGRect) {
    if drag == nil {
      let (kind, id, corner) = target(v.startLocation, pic)
      drag = Drag(kind: kind, id: id, corner: corner, at: unit(v.startLocation, pic), start: boxes)
      busy = kind != .none
      // A box is picked as soon as the finger lands on it.
      if kind == .move, picked != id { picked = id }
    }
    guard var d = drag, d.kind != .none, d.kind != .del else { return }
    let p = unit(v.location, pic), dx = p.x - d.at.x, dy = p.y - d.at.y
    if !d.moved && abs(dx * pic.width) < 4 && abs(dy * pic.height) < 4 { return }
    d.moved = true
    let cl = { (x: CGFloat, a: CGFloat, b: CGFloat) in min(b, max(a, x)) }
    switch d.kind {
    case .draw:
      d.live = d.start + [OccBox(id: d.id, x: min(d.at.x, p.x), y: min(d.at.y, p.y), w: abs(dx), h: abs(dy))]
    case .move, .size:
      guard let b = d.start.first(where: { $0.id == d.id }) else { return }
      var n = b
      if d.kind == .move { n.x = cl(b.x + dx, 0, 1 - b.w); n.y = cl(b.y + dy, 0, 1 - b.h) }
      else {
        // Pulling a corner keeps the opposite corner where it is; a box stays at least 14 points across.
        let mw = 14 / max(1, pic.width), mh = 14 / max(1, pic.height)
        var x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h
        if d.corner.contains("w") { x1 = cl(x1 + dx, 0, x2 - mw) } else { x2 = cl(x2 + dx, x1 + mw, 1) }
        if d.corner.contains("n") { y1 = cl(y1 + dy, 0, y2 - mh) } else { y2 = cl(y2 + dy, y1 + mh, 1) }
        n.x = x1; n.y = y1; n.w = x2 - x1; n.h = y2 - y1
      }
      d.live = d.start.map { $0.id == d.id ? n : $0 }
    default: break
    }
    drag = d
  }
  private func ended(_ v: DragGesture.Value, _ pic: CGRect) {
    let d = drag
    drag = nil; busy = false
    guard let d else { return }
    if d.kind == .del {
      // The × takes its box away only when the finger lifts near where it went down.
      if hypot(v.location.x - v.startLocation.x, v.location.y - v.startLocation.y) < 12 { remove(d.id) }
      return
    }
    let drawn = d.kind == .draw ? d.live?.last : nil
    // A tap on the picture, off the boxes, puts the picked box down; so does a drawing too small to be a box.
    if !d.moved || d.live == nil || (drawn.map { $0.w * pic.width < 12 || $0.h * pic.height < 12 } ?? false) {
      if d.kind == .draw { picked = nil }
      return
    }
    boxes = (d.live ?? boxes).map { var b = $0; b.x = (b.x * 10000).rounded() / 10000; b.y = (b.y * 10000).rounded() / 10000; b.w = (b.w * 10000).rounded() / 10000; b.h = (b.h * 10000).rounded() / 10000; return b }
    if let drawn { picked = drawn.id }
  }
  private func remove(_ id: String) {
    boxes.removeAll { $0.id == id }
    if picked == id { picked = nil }
  }
}
