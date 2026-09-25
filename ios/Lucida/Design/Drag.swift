// Dragging decks and cards (design/drag.mjs: one engine for every list; the owner: "allow users to drag decks and
// cards"). Hold a deck or a card still for about a third of a second, then drag it: a swipe still scrolls and a tap
// still opens it. In the Library a deck goes to another spot, onto a folder, or (in a folder) onto the Library button to
// take it out; on a deck's page a card goes to another spot, or onto another deck in the Move to tray that rises while a
// card is dragged (All cards has the tray too). The item lifts and follows your finger, the others slide out of its
// way, the list scrolls near its top and bottom, and after the drop everything glides into place. Nothing changes until
// the drop.
import SwiftUI
import UIKit
import UIKit.UIGestureRecognizerSubclass

/// What a list lets a dragged item do (drag.mjs's options).
struct DragOptions {
  /// Places it can go onto: "folder:" (a folder, or the Library button in a folder) or "deck:" (a deck in the tray).
  var drops: [String] = []
  /// It can move to another spot in the list.
  var reorder = true
  /// The Move to tray's decks, when the tray rises while it's dragged, and its own deck (the tray leaves it out).
  var tray: [TrayDeck]? = nil
  var own: String? = nil
  /// It stays in the list after going onto a place (All cards: only its deck changes).
  var keep = false
  /// How much of the screen's bottom the tab bar covers (the list scrolls above it).
  var bottom: CGFloat = 92
  /// It just lifted (the page closes its menus).
  var start: () -> Void = {}
  /// Where it went: just before another item (nil: last), or onto a place.
  var drop: (_ id: String, _ to: DropTo) -> Void
}
enum DropTo { case before(String?), place(String) }

/// A deck in the Move to tray.
struct TrayDeck: Identifiable { var id: String; var name: String; var mesh: Mesh }

/// The drag going on (there's only ever one), shared by the lists, the places to drop on, and the lifted picture and
/// the Move to tray drawn over the page.
@Observable @MainActor
final class DragCenter {
  // ---------- what the screens draw ----------
  /// The list being dragged in ("<board>/<list>"), its items' order when the drag began, where the item was, and where it
  /// would land (the others slide out of its way).
  private(set) var list: String? = nil
  private(set) var index: [String: Int] = [:]
  private(set) var from = -1
  private(set) var to = -1
  /// The item that lifted: hidden in its list while its picture follows your finger, until it has landed.
  private(set) var hidden: String? = nil
  /// The lifted picture: what it shows, where it was on screen, and how it has moved (offset, scale about `anchor`, fade).
  private(set) var face: AnyView? = nil
  private(set) var box: CGRect = .zero
  private(set) var offset: CGSize = .zero
  private(set) var size: CGFloat = 1
  private(set) var anchor: UnitPoint = .center
  private(set) var fade: Double = 1
  /// The place it's over, lit up ("folder:<id>", "folder:" or "deck:<id>"), and the same with its page ("<board>|<name>",
  /// the tray's are "tray|deck:<id>"); `ring`: lit the way a live drag lights it (raised, a little bigger).
  private(set) var spot: String? = nil
  private(set) var spotKey: String? = nil
  private(set) var ring = true
  /// The Move to tray's decks while it shows, and the deck it leaves out.
  private(set) var tray: [TrayDeck]? = nil
  private(set) var own: String? = nil

  // ---------- bookkeeping (not drawn) ----------
  /// Where each item ("<board>/<list>/<id>") and each place to drop on ("<board>|<name>", the tray's are "tray|deck:<id>")
  /// is on screen, kept up to date by the views; and the tray's box.
  @ObservationIgnored var frames: [String: CGRect] = [:]
  @ObservationIgnored var places: [String: CGRect] = [:]
  @ObservationIgnored var trayFrame: CGRect = .zero
  /// Each page's scroll view (to scroll it near its edges), by board.
  @ObservationIgnored var scrollers: [String: ScrollWatch] = [:]
  @ObservationIgnored private var o: DragOptions? = nil
  @ObservationIgnored private var id: String? = nil
  @ObservationIgnored private var board = ""
  @ObservationIgnored private var ids: [String] = []
  @ObservationIgnored private var slots: [CGRect] = []
  @ObservationIgnored private var p0 = CGPoint.zero
  @ObservationIgnored private var pt = CGPoint.zero
  @ObservationIgnored private var s0: CGFloat = 0
  @ObservationIgnored private var live = false
  @ObservationIgnored private var still = false
  @ObservationIgnored private var link: CADisplayLink? = nil
  /// A drop into a place that hasn't happened yet (it happens once the item has shrunk into the place), and which drag
  /// the timers belong to (a new drag makes the last one's change at once and stops its timers).
  @ObservationIgnored private var pending: (() -> Void)? = nil
  @ObservationIgnored private var gen = 0
  @ObservationIgnored private var calm: Bool { UIAccessibility.isReduceMotionEnabled }

  private var scroller: UIScrollView? { scrollers[board]?.view }
  /// How far the list has scrolled since the drag began.
  private var scrolled: CGFloat { (scroller?.contentOffset.y ?? s0) - s0 }

  /// How far an item in `list` moves out of the lifted one's way (in a list, by the lifted one's height).
  func shift(_ id: String, in list: String) -> CGFloat {
    guard self.list == list, let i = index[id], from >= 0, i != from, to != from, slots.indices.contains(from) else { return 0 }
    let me = slots[from]
    if to > from, i > from, i <= to { return -(me.height + (from + 1 < slots.count ? slots[from + 1].minY - me.maxY : 0)) }
    if to < from, i >= to, i < from { return me.height + (from > 0 ? me.minY - slots[from - 1].maxY : 0) }
    return 0
  }
  func hides(_ id: String, in list: String) -> Bool { hidden == id && self.list == list }

  /// A tap that opens an item, or a hold that lifts it to drag: it goes on the part a finger holds (a deck's row, not
  /// its ⋯ button), in place of a button. `ids` is the list's order, `face` the picture that lifts.
  func hold(_ list: String, _ id: String, tap: @escaping () -> Void, ids: @escaping () -> [String], face: @escaping () -> AnyView,
            options: @escaping () -> DragOptions) -> HoldToDrag {
    let board = String(list.prefix { $0 != "/" })
    return HoldToDrag(tap: tap,
                      began: { [weak self] p in self?.begin(list, id, at: p, ids: ids(), face: face(), options: options()) },
                      moved: { [weak self] p in self?.move(p) },
                      ended: { [weak self] dropped in self?.end(dropped) },
                      scrolling: { [weak self] in self?.scrollers[board]?.moving ?? false })
  }

  // ---------- a drag ----------
  func begin(_ list: String, _ id: String, at p: CGPoint, ids: [String], face: AnyView, options: DragOptions) {
    guard !live else { return }
    if let p = pending { pending = nil; p() }
    landed()
    guard let from = ids.firstIndex(of: id), let r = frames[list + "/" + id] else { return }
    o = options; self.id = id; self.ids = ids; board = String(list.prefix { $0 != "/" })
    slots = ids.map { frames[list + "/" + $0] ?? .zero }
    p0 = p; pt = p; s0 = scroller?.contentOffset.y ?? 0; live = true
    self.list = list; index = Dictionary(ids.enumerated().map { ($1, $0) }, uniquingKeysWith: { a, _ in a })
    self.from = from; to = from; hidden = id
    self.face = face; box = r; offset = .zero; size = 1; fade = 1; spot = nil; ring = true
    anchor = UnitPoint(x: r.width > 0 ? (p.x - r.minX) / r.width : 0.5, y: r.height > 0 ? (p.y - r.minY) / r.height : 0.5)
    tray = options.tray; own = options.own
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    options.start()
    let l = CADisplayLink(target: Ticker(self), selector: #selector(Ticker.tick))
    l.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 60, preferred: 60)
    l.add(to: .main, forMode: .common)
    link = l
    frame()
  }

  func move(_ p: CGPoint) { guard live else { return }; pt = p; frame() }

  /// What's under the finger: a place to drop it, or else a spot in the list.
  private func frame() {
    guard let o, slots.indices.contains(from) else { return }
    let me = slots[from], dx = pt.x - p0.x, dy = pt.y - p0.y
    let hit = place(at: pt)
    let lit = hit.flatMap { h in h.name != "deck:" + (o.own ?? "\u{0}") && o.drops.contains { h.name.hasPrefix($0) } ? h : nil }
    var t = from
    if lit == nil && o.reorder {
      let cy = me.midY + dy + scrolled
      for (i, s) in slots.enumerated() {
        if i > from && cy > s.midY { t = max(t, i) }
        if i < from && cy < s.midY { t = min(t, i) }
      }
    }
    // Over a place to drop it, it shrinks and hangs just below your finger, so the place shows.
    let s: CGFloat = lit != nil ? min(0.45, max(140 / max(1, me.width), 28 / max(1, me.height))) : 1
    if lit?.key != spotKey {
      if lit != nil { UISelectionFeedbackGenerator().selectionChanged() }
      withAnimation(calm ? nil : .out(0.2)) { spot = lit?.name; spotKey = lit?.key; size = s; fade = lit != nil ? 0.9 : 1 }
    }
    if t != to { withAnimation(calm ? nil : .out(0.25)) { to = t } }
    let ox = p0.x - me.minX, oy = p0.y - me.minY
    offset = CGSize(width: dx + (lit != nil ? ox * s + 14 : 0), height: dy + (lit != nil ? oy * s + 14 : 0))
  }

  /// The place under a point: in the Move to tray (only its decks there), or on this page (not under the tab bar).
  private func place(at p: CGPoint) -> (key: String, name: String)? {
    still = false
    if tray != nil && trayFrame.contains(p) {
      still = true
      return places.first { $0.key.hasPrefix("tray|") && $0.value.contains(p) }.map { ($0.key, String($0.key.dropFirst(5))) }
    }
    let screen = UIScreen.main.bounds
    if let o, o.bottom > 0, p.y > screen.height - o.bottom, p.x > 16, p.x < screen.width - 16 { return nil }
    guard let hit = places.first(where: { $0.key.hasPrefix(board + "|") && $0.value.contains(p) }) else { return nil }
    still = true
    return (hit.key, String(hit.key.dropFirst(board.count + 1)))
  }

  /// Near the top or bottom of the page (above the tab bar), the list scrolls, faster nearer the edge; not while it's
  /// over a place to drop it, or over the Move to tray.
  fileprivate func tick(_ l: CADisplayLink) {
    guard live, !still, let sc = scroller, let o, let r = sc.superview?.convert(sc.frame, to: nil) else { return }
    let low = r.maxY - o.bottom, band = min(72, r.height / 5)
    let v = pt.y < r.minY + band ? (pt.y - r.minY - band) / band : pt.y > low - band ? (pt.y - low + band) / band : 0
    guard v != 0 else { return }
    let top = -sc.adjustedContentInset.top, end = max(top, sc.contentSize.height + sc.adjustedContentInset.bottom - sc.bounds.height)
    let y = min(end, max(top, sc.contentOffset.y + (max(-1, min(1, v)) * 16).rounded()))
    if y != sc.contentOffset.y { sc.contentOffset.y = y; frame() }
  }

  private func stop() { link?.invalidate(); link = nil; live = false }

  /// The finger came up (dropped), or the drag was called off.
  func end(_ dropped: Bool) {
    guard live, let o, let id else { return }
    stop()
    guard dropped else { settle(nil, reorder: false); return }
    if let name = spot, !o.keep {
      // Into a folder or another deck: it shrinks into the place, then the rest close up behind it.
      let a = spotKey.flatMap { places[$0] } ?? box
      let me = slots[from], s1: CGFloat = 0.12
      // Where its middle is now (it's scaled by `size` about its anchor), then to the place's middle at the new size.
      let ax = me.width * anchor.x, ay = me.height * anchor.y
      let mid = CGPoint(x: me.minX + offset.width + ax + (me.width / 2 - ax) * size, y: me.minY + offset.height + ay + (me.height / 2 - ay) * size)
      let tx = offset.width + a.midX - mid.x - (me.width / 2 - ax) * (s1 - size), ty = offset.height + a.midY - mid.y - (me.height / 2 - ay) * (s1 - size)
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
      pending = { o.drop(id, .place(name)) }
      withAnimation(calm ? nil : .out(0.22)) { offset = CGSize(width: tx, height: ty); size = s1; fade = 0 }
      after(calm ? 0 : 0.22) { [weak self] in
        guard let self, let p = self.pending else { return }
        self.pending = nil
        withAnimation(self.calm ? nil : .out(0.3)) { p(); self.tray = nil; self.spot = nil; self.spotKey = nil; self.face = nil }
        self.after(self.calm ? 0 : 0.3) { [weak self] in self?.landed() }
      }
    } else if let name = spot {
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
      settle { o.drop(id, .place(name)) }
    } else if to != from {
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
      let before = to > from ? (to + 1 < ids.count ? ids[to + 1] : nil) : ids[to]
      settle({ o.drop(id, .before(before)) }, reorder: true)
    } else {
      settle(nil)
    }
  }

  /// Makes the change (if there is one) at once, the others already sitting where they end up, while the picture glides
  /// to where the item landed (or back where it was); then the item itself shows again.
  private func settle(_ change: (() -> Void)?, reorder: Bool = false) {
    let me = slots[from]
    let top = reorder ? (to > from ? slots[to].maxY - me.height : slots[to].minY) : me.minY
    var quiet = Transaction(); quiet.disablesAnimations = true
    withTransaction(quiet) { change?(); to = from; tray = nil }
    withAnimation(calm ? nil : .out(0.3)) { offset = CGSize(width: 0, height: top - me.minY - scrolled); size = 1; fade = 1; spot = nil; spotKey = nil }
    after(calm ? 0 : 0.3) { [weak self] in self?.landed() }
  }

  /// Everything back to rest: the item shows in its list again.
  private func landed() {
    guard !live else { return }
    gen += 1
    list = nil; index = [:]; from = -1; to = -1; hidden = nil; face = nil; spot = nil; spotKey = nil; tray = nil; own = nil
    o = nil; id = nil; ids = []; slots = []
  }

  /// Runs `f` in `s` seconds, unless another drag has begun by then.
  private func after(_ s: Double, _ f: @escaping () -> Void) {
    let g = gen
    DispatchQueue.main.asyncAfter(deadline: .now() + s) { [weak self] in if self?.gen == g { f() } }
  }

  /// The canvas's Move to tray board (PhoneDeckMoveTray): the tray open with its first deck lit, and nothing lifted.
  func showTray(_ decks: [TrayDeck]) {
    tray = decks; spot = decks.first.map { "deck:" + $0.id }; spotKey = spot.map { "tray|" + $0 }; ring = false
  }
}

/// A CADisplayLink's target (it keeps its target, so the drag isn't held by it).
private final class Ticker: NSObject {
  weak var drag: DragCenter?
  init(_ d: DragCenter) { drag = d }
  @MainActor @objc func tick(_ l: CADisplayLink) { drag?.tick(l) }
}

/// A page's scroll view, and when it last moved (a touch while it's still gliding only stops it).
final class ScrollWatch {
  weak var view: UIScrollView?
  private var watch: NSKeyValueObservation?
  private var movedAt: CFTimeInterval = 0
  init(_ sc: UIScrollView) {
    view = sc
    watch = sc.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in self?.movedAt = CACurrentMediaTime() }
  }
  /// It moved in the last few frames.
  var moving: Bool { CACurrentMediaTime() - movedAt < 0.06 }
}

/// A quick touch taps; a finger held still for about a third of a second lifts the item to drag (drag.mjs: "a finger
/// holds still for a moment first, so a swipe still scrolls and a tap still opens"). A touch that moves first is left to
/// the page, which scrolls. It stands in for a button (a button would keep the hold from starting).
struct HoldToDrag: UIGestureRecognizerRepresentable {
  let tap: () -> Void
  let began: (CGPoint) -> Void
  let moved: (CGPoint) -> Void
  let ended: (Bool) -> Void
  var scrolling: () -> Bool = { false }
  func makeUIGestureRecognizer(context: Context) -> HoldOrTap { let g = HoldOrTap(); g.scrolling = scrolling; return g }
  func updateUIGestureRecognizer(_ g: HoldOrTap, context: Context) { g.scrolling = scrolling }
  func handleUIGestureRecognizerAction(_ g: HoldOrTap, context: Context) {
    let p = context.converter.location(in: .global)
    switch g.state {
    case .began: began(p)
    case .changed: moved(p)
    case .ended: if g.tapped { tap() } else { ended(true) }
    case .cancelled: ended(false)
    default: break
    }
  }
}

/// The touch behind HoldToDrag: a tap when it comes up quickly without moving, a drag (began, changed, ended) once it has
/// been held still for 0.35 seconds, and nothing (it fails) when it moves more than 10 points first.
final class HoldOrTap: UIGestureRecognizer {
  private(set) var tapped = false
  private var touch: UITouch?
  private var start = CGPoint.zero
  private var timer: Timer?

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    // A touch that stops the page while it's still scrolling doesn't tap or lift anything (like a button's).
    if touch == nil && scrolling() { state = .failed; return }
    // One finger: a second one while it's down is ignored.
    for t in touches where t !== touch {
      if touch == nil { touch = t; start = t.location(in: nil) } else { ignore(t, for: event) }
    }
    guard timer == nil, touch != nil else { return }
    timer = Timer.scheduledTimer(withTimeInterval: 0.35, repeats: false) { [weak self] _ in
      MainActor.assumeIsolated { if let self, self.state == .possible { self.state = .began } }
    }
  }
  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
    guard let t = touch, touches.contains(t) else { return }
    if state == .possible {
      let p = t.location(in: nil)
      if hypot(p.x - start.x, p.y - start.y) > 10 { state = .failed }
    } else if state == .began || state == .changed { state = .changed }
  }
  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
    guard let t = touch, touches.contains(t) else { return }
    if state == .possible { tapped = true; state = .ended } else if state == .began || state == .changed { state = .ended }
  }
  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
    guard let t = touch, touches.contains(t) else { return }
    state = state == .possible ? .failed : .cancelled
  }
  override func reset() {
    timer?.invalidate(); timer = nil; touch = nil; tapped = false
    super.reset()
  }
  /// The page is still scrolling (a touch then only stops it).
  var scrolling: () -> Bool = { false }
}

extension View {
  /// An item in a draggable list: it slides out of the lifted one's way, hides while it's lifted, and tells the drag
  /// where it is.
  func dragItem(_ drag: DragCenter, list: String, id: String) -> some View {
    onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { drag.frames[list + "/" + id] = $0 }
      .opacity(drag.hides(id, in: list) ? 0 : 1)
      .offset(y: drag.shift(id, in: list))
  }

  /// A place to drop a dragged item on ("<board>|<name>"), lit up while one is over it: a folder ("tile": raised, with a
  /// ring) or the Library button and the tray's decks ("chip": filled in, drawn by the place itself).
  func dropPlace(_ drag: DragCenter, board: String, name: String, tile radius: CGFloat? = nil) -> some View {
    modifier(DropPlace(drag: drag, key: board + "|" + name, name: name, radius: radius))
  }

  /// Lets the drag scroll this page near its edges (put it inside the page's ScrollView).
  func dragScroller(_ drag: DragCenter, board: String) -> some View {
    background(ScrollFinder { sc in if drag.scrollers[board]?.view !== sc { drag.scrollers[board] = ScrollWatch(sc) } })
  }
}

private struct DropPlace: ViewModifier {
  @Environment(\.theme) private var t
  let drag: DragCenter
  let key: String, name: String
  let radius: CGFloat?
  func body(content: Content) -> some View {
    let lit = drag.spotKey == key && drag.ring && radius != nil
    content
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { drag.places[key] = $0 }
      .onDisappear { drag.places[key] = nil }
      // A folder: translate 0 -4px, scale 1.04, a 2px ring in the words' color and a soft shadow.
      .overlay { if lit, let r = radius { RoundedRectangle(cornerRadius: r + 2, style: .continuous).strokeBorder(t.text, lineWidth: 2).padding(-2) } }
      .boxShadow(lit ? .black.opacity(0.45) : .clear, y: 24, blur: 48, spread: -24, radius: radius ?? 0)
      .scaleEffect(lit ? 1.04 : 1)
      .offset(y: lit ? -4 : 0)
  }
}

/// Finds the UIScrollView a SwiftUI ScrollView is drawn with.
private struct ScrollFinder: UIViewRepresentable {
  let found: (UIScrollView) -> Void
  func makeUIView(context: Context) -> Finder { Finder(found: found) }
  func updateUIView(_ v: Finder, context: Context) { v.found = found }
  final class Finder: UIView {
    var found: (UIScrollView) -> Void
    init(found: @escaping (UIScrollView) -> Void) { self.found = found; super.init(frame: .zero); isUserInteractionEnabled = false }
    required init?(coder: NSCoder) { fatalError() }
    override func didMoveToWindow() {
      super.didMoveToWindow()
      var v = superview
      while let s = v { if let sc = s as? UIScrollView { found(sc); return }; v = s.superview }
    }
  }
}

/// The lifted item, over the page and the tab bar (drag.mjs liftRow): the page's color around it with a thin line, and a
/// soft shadow under it. It follows your finger, shrinks over a place to drop it, and glides to where it lands.
struct DragGhost: View {
  @Environment(DragCenter.self) private var drag
  @Environment(\.theme) private var t
  var body: some View {
    GeometryReader { g in
      if let face = drag.face {
        let o = g.frame(in: .global).origin, b = drag.box
        face
          .frame(width: b.width, height: b.height)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.bg))
          .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.bg).padding(-12))
          .background(RoundedRectangle(cornerRadius: 25, style: .continuous).fill(t.line).padding(-13))
          .boxShadow(.black.opacity(t.dark ? 0.8 : 0.25), y: 24, blur: 48, spread: -12, radius: 12)
          .scaleEffect(drag.size, anchor: drag.anchor)
          .opacity(drag.fade)
          .offset(x: b.minX - o.x + drag.offset.width, y: b.minY - o.y + drag.offset.height)
      }
    }
    .ignoresSafeArea()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// While a card is dragged: the Move to tray, your other decks to drop it on (moveTray, phone). It rises in.
struct MoveTray: View {
  @Environment(DragCenter.self) private var drag
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var shown = false
  var body: some View {
    if let decks = drag.tray {
      VStack(alignment: .leading, spacing: 10) {
        Text("MOVE TO").css(12, .semibold, ls: 0.06).foregroundStyle(t.muted).padding(.horizontal, 4)
        UpTo(height: 184) {
          FlowLayout(spacing: 8, lineSpacing: 8) {
            ForEach(decks.filter { $0.id != drag.own }) { chip($0) }
          }
        }
        .clipped()
      }
      .padding(.top, 14).padding(.horizontal, 14).padding(.bottom, 16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.bg))
      .background(RoundedRectangle(cornerRadius: 29, style: .continuous).fill(t.line).padding(-1))
      .boxShadow(.black.opacity(0.24), y: 24, blur: 64, radius: 28)
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { drag.trayFrame = $0 }
      .opacity(shown ? 1 : 0).scaleEffect(shown ? 1 : 0.98).offset(y: shown ? 0 : 18)
      .padding(.horizontal, 12).padding(.bottom, 24)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
      .ignoresSafeArea()
      .onAppear { withAnimation(still ? nil : .out(0.3)) { shown = true } }
      .accessibilityElement(children: .contain)
      .accessibilityLabel("Move to")
    }
  }

  private func chip(_ d: TrayDeck) -> some View {
    let lit = drag.spotKey == "tray|deck:" + d.id
    return HStack(spacing: 8) {
      CSSLinearGradient(angle: d.mesh.angle, stops: d.mesh.stops).frame(width: 24, height: 24).clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
      Text(d.name).css(14, .semibold).lineLimit(1).truncationMode(.tail)
    }
    .foregroundStyle(lit ? t.bg : t.text)
    .padding(.leading, 8).padding(.trailing, 14).frame(height: 40)
    .background(Capsule().fill(lit ? t.text : t.surf))
    .scaleEffect(lit && drag.ring ? 1.06 : 1)
    .dropPlace(drag, board: "tray", name: "deck:" + d.id)
  }
}

/// Its content at its own height, but no taller than `height` (CSS max-height; the rest is cut off).
private struct UpTo: Layout {
  let height: CGFloat
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let s = subviews.first?.sizeThatFits(ProposedViewSize(width: proposal.width, height: nil)) ?? .zero
    return CGSize(width: proposal.width ?? s.width, height: min(s.height, height))
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: nil))
  }
}
