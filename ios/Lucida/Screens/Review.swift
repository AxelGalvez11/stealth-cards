// iPhone · Review (PhoneReview and its variants): one card at a time. Tap the card to flip it (a blank fills in
// place instead), then grade it with four grades, check or x, or piles you name.
import SwiftUI

/// A card as review shows it (db.js face).
struct CardFace: Equatable {
  var id = "", kind = "basic"
  var front = "", back = "", note = ""
  /// Fill in the blank: the text with its [[blanks]], and which blank is asked (-1: all).
  var text = "", cloze = -1
  var image: String? = nil, audio: String? = nil, speak = "", lang = ""
  var backLabel = "", backBig = "", backSub = ""
  /// A picture with boxes: every box, the one asked, and whether the others stay hidden ("all") or show ("one").
  var boxes: [OccBox] = [], box: String? = nil, occ = "one"
  /// The sound's saved waveform, and whether it plays on its own when the card comes up.
  var wave: Wave? = nil, auto = true
  /// Which box is asked (nil: not a picture with boxes).
  var occIndex: Int? { kind == "image" && image != nil ? boxes.firstIndex { $0.id == box } : nil }
  var isOcc: Bool { occIndex != nil }
  var clip: Clip { Clip(audio: audio, wave: wave, speak: speak, lang: lang) }
}

struct ReviewVM {
  var empty = false
  var card = CardFace()
  var done = 0, left = 0, total = 0
  var lane = "rev"
  var counts = (new: 0, learn: 0, rev: 0)
  var iv = (again: "", hard: "", good: "", easy: "")
  var mode = "four", fsrsOn = true, prog = "bar"
  var piles: [(name: String, n: Int)] = []
  var deckId = ""
}

/// The review in progress (db.js session): which deck or pile, when it started, and every grade in it.
struct ReviewSession {
  struct Entry { var cardId: String; var rating: Int?; var pile: String?; var was: String; var logId: String? }
  var key: String, deckId: String?, pile: String?
  var started = nowMs()
  var graded: [Entry] = []
}

extension Store {
  /// The canvas's review cards (mock.mjs REVIEW), for the design screens.
  static let demoCards: [CardFace] = [
    CardFace(id: "r0", kind: "basic", front: "What does the electron transport chain pump across the inner membrane?", back: "Protons (H⁺), from the matrix into the intermembrane space.", note: "That gradient powers ATP synthase."),
    CardFace(id: "r1", kind: "cloze", back: "mitochondrion", note: "It makes most of the cell’s ATP.", text: "The [[mitochondrion]] is the powerhouse of the cell.", cloze: -1),
    CardFace(id: "r2", kind: "image", front: "", back: "Nucleus", note: "Holds the cell’s DNA.", image: "mock", boxes: Sample.shared.BOXES, box: "b1", occ: "all"),
    CardFace(id: "r3", kind: "audio", front: "What word do you hear?", back: "train", note: "電 electricity + 車 vehicle.", audio: "mock", backBig: "電車", backSub: "でんしゃ · train")
  ]

  func review(_ deckId: String?, pile: String?) -> ReviewVM {
    if demo {
      let idx = props.cardIndex + demoGraded, c = Store.demoCards[idx % 4], done = 12 + idx, left = 64 - done
      let d = deck("cell"), gaps = GAPS, maxGap = gaps[d.gapIdx]
      let scale = (pow(Double(d.goal) / 100, -2) - 1) / (pow(0.9, -2) - 1)
      func days(_ b: Double) -> Int { min(maxGap, max(1, Int((b * scale).rounded()))) }
      func fmt(_ n: Int) -> String { n < 30 ? "\(n)d" : n < 365 ? FSRS.trim((Double(n) / 3).rounded() / 10) + "mo" : FSRS.trim((Double(n) / 36.5).rounded() / 10) + "y" }
      let hardD = days(2), goodD = min(maxGap, max(hardD + 1, days(4))), easyD = min(maxGap, max(goodD + 1, days(9)))
      return ReviewVM(card: c, done: done, left: left, total: 64, lane: ["basic": "rev", "cloze": "new", "image": "new", "audio": "learn"][c.kind] ?? "rev",
                      counts: (8, 3, max(left - 11, 0)), iv: (d.steps.first ?? "1m", fmt(hardD), fmt(goodD), fmt(easyD)),
                      mode: d.grading, fsrsOn: d.grading != "piles" && d.fsrs, prog: props.prog, piles: demoPiles, deckId: "cell")
    }
    let key = Store.sessionKey(deckId, pile)
    if session == nil || session!.key != key { session = ReviewSession(key: key, deckId: deckId, pile: pile) }
    let E = engine, q = E.queue(deckId, pile: pile, done: Set(session!.graded.map(\.cardId))), done = session!.graded.count
    let cur = q.first, d = cur?.deck ?? E.deck(deckId) ?? lib.decks.first
    var vm = ReviewVM(done: done, left: q.count, total: done + q.count,
                      counts: (q.filter { $0.lane == "new" }.count, q.filter { $0.lane == "learn" }.count, q.filter { $0.lane == "rev" }.count),
                      mode: d?.grading ?? "four", prog: lib.settings.prog, deckId: d?.id ?? "")
    vm.piles = (d?.piles ?? []).map { p in (p.name, E.cards(of: d!.id).filter { $0.pile == p.name }.count) }
    guard let c = cur?.card, let deck = cur?.deck else { vm.empty = true; vm.fsrsOn = false; return vm }
    vm.lane = cur!.lane
    vm.card = Store.face(c)
    if Engine.scheduled(deck) {
      let now = nowMs(), pv = FSRS.preview(c.srs, now: now, goal: Double(deck.goal) / 100, maxDays: GAPS[min(max(deck.gapIdx, 0), 6)], steps: deck.steps)
      vm.iv = (FSRS.waitLabel(pv[1]!, now), FSRS.waitLabel(pv[2]!, now), FSRS.waitLabel(pv[3]!, now), FSRS.waitLabel(pv[4]!, now))
      vm.fsrsOn = true
    } else { vm.fsrsOn = false }
    return vm
  }

  static func sessionKey(_ deckId: String?, _ pile: String?) -> String { (deckId ?? "all") + (pile.map { "|" + $0 } ?? "") }
  /// A review started from a button is a new session, like the web's (X leaves one without the summary, so the next
  /// review of that deck mustn't carry its grades).
  func startReview(_ deckId: String?, pile: String? = nil) {
    guard !demo else { return }
    session = ReviewSession(key: Store.sessionKey(deckId, pile), deckId: deckId, pile: pile)
  }

  /// A card as review shows it; a fill-in-the-blank card asks one blank (cloze) or all of them (-1).
  static func face(_ c: Card) -> CardFace {
    if c.kind == "cloze" {
      let bl = Rich.blanks(c.text), ask = c.cloze ?? -1
      return CardFace(id: c.id, kind: "cloze", back: (ask < 0 ? bl : Array(bl.dropFirst(ask).prefix(1))).joined(separator: ", "), note: c.note, text: c.text, cloze: ask)
    }
    // A picture with boxes brings its boxes, which one it asks, and whether the others stay hidden.
    let o = Occ(c)
    return CardFace(id: c.id, kind: c.kind, front: c.front.isEmpty && c.kind == "audio" ? "What do you hear?" : c.front, back: o?.label ?? c.back, note: c.note,
                    image: c.image, audio: c.audio, speak: c.speak, lang: c.lang, backLabel: c.back, backBig: c.back, backSub: c.note,
                    boxes: o?.boxes ?? [], box: o != nil ? c.box : nil, occ: o?.mode ?? "one", wave: c.wave, auto: c.auto)
  }

  /// Grades a card (1 Forgot … 4 Easy). The next card shows right away; the server saves it and sends back the library.
  func grade(_ cardId: String, _ rating: Int) {
    if demo { demoGraded += 1; return }
    guard let i = lib.cards.firstIndex(where: { $0.id == cardId }), let d = engine.deck(lib.cards[i].deckId) else { return }
    let c = lib.cards[i], now = nowMs()
    session?.graded.append(.init(cardId: cardId, rating: rating, pile: nil, was: c.srs.state, logId: nil))
    let at = (session?.graded.count ?? 1) - 1
    if Engine.scheduled(d) { lib.cards[i].srs = FSRS.preview(c.srs, now: now, goal: Double(d.goal) / 100, maxDays: GAPS[min(max(d.gapIdx, 0), 6)], steps: d.steps)[rating]! }
    else { lib.cards[i].srs.reps += 1; lib.cards[i].srs.last = now }
    Task {
      let r = await send("review.grade", ["cardId": cardId, "rating": rating])
      if let id = r["logId"] as? String, session != nil, at < session!.graded.count { session!.graded[at].logId = id }
    }
  }

  /// Sorts a card into a pile (piles don't schedule).
  func pile(_ cardId: String, _ name: String) {
    if demo { demoGraded += 1; demoPiles = demoPiles.map { $0.name == name ? ($0.name, $0.n + 1) : $0 }; return }
    guard let i = lib.cards.firstIndex(where: { $0.id == cardId }) else { return }
    session?.graded.append(.init(cardId: cardId, rating: nil, pile: name, was: "pile", logId: nil))
    let at = (session?.graded.count ?? 1) - 1
    lib.cards[i].pile = name
    Task {
      let r = await send("review.grade", ["cardId": cardId, "pile": name])
      if let id = r["logId"] as? String, session != nil, at < session!.graded.count { session!.graded[at].logId = id }
    }
  }

  func addPile(_ deckId: String, _ name: String) {
    if demo { demoPiles.append((name, 0)); return }
    guard let d = engine.deck(deckId) else { return }
    updateDeck(deckId, ["piles": d.piles.map { ["name": $0.name] } + [["name": name]]])
  }

  func setProgress(_ prog: String) {
    if demo { props.prog = prog; return }
    lib.settings.prog = prog
    Task { await send("settings.update", ["patch": ["prog": prog]]) }
  }

  func hasQueue(_ deckId: String?, pile: String?) -> Bool { demo || !engine.queue(deckId, pile: pile, done: Set(session?.graded.map(\.cardId) ?? [])).isEmpty }
}

struct ReviewScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String?
  let pile: String?
  @State private var revealed = false
  /// After a grade the next card comes up fresh (a small lift) instead of spinning back.
  @State private var moved = false
  @State private var settingsOpen = false
  @State private var pileDraft: String? = nil
  /// The card whose explanation is open, and (on a design screen) whether the sample one was asked for.
  @State private var exFor: String? = nil
  @State private var exMock = false
  /// The sound card that last played on its own, and its start (a moment after the card comes up).
  @State private var spoken: String? = nil
  @State private var autoplaying: Task<Void, Never>? = nil

  var body: some View {
    let rv = store.review(deckId, pile: pile)
    ZStack {
      VStack(spacing: 16) {
        topBar(rv)
        FlipCard(card: rv.card, revealed: revealed, moved: moved, done: rv.done) { withAnimation(nil) { moved = false }; revealed.toggle() }
          .overlay { explain(rv) }
        grading(rv).frame(height: 76)
      }
      .padding(.top, Screen.top(60)).padding(.horizontal, 16).padding(.bottom, 34)
      .ignoresSafeArea()
      if settingsOpen {
        SheetOverlay(top: nil, close: { withAnimation(.out(0.3)) { settingsOpen = false } }) { settingsSheet(rv) }.zIndex(2)
      }
      if pileDraft != nil { newPile(rv).zIndex(3) }
    }
    // Behind the cards: the background of the deck this card is from.
    .background(StudyBackground(bg: store.studyBg(rv.deckId)))
    .onAppear {
      if store.demo {
        revealed = store.props.revealed; settingsOpen = store.props.reviewSettings; if store.props.newPile { pileDraft = "Tricky ones" }
        if store.props.explainOpen { exFor = rv.card.id; exMock = true }
      }
      // Nothing to study here: back to where you were.
      else if rv.empty { nav.finishReview(graded: !(store.session?.graded.isEmpty ?? true)) }
    }
    .onChange(of: rv.empty) { _, empty in if empty { nav.finishReview() } }
    // A sound card plays on its own when it comes up (unless it's set not to).
    .onChange(of: rv.card.id, initial: true) { _, _ in autoplay(rv.card) }
    .onDisappear { autoplaying?.cancel(); store.stopSound() }
  }

  private func autoplay(_ c: CardFace) {
    guard !store.demo, c.kind == "audio", c.auto, spoken != c.id, !c.clip.key.isEmpty else { return }
    spoken = c.id
    let clip = c.clip
    autoplaying?.cancel()
    autoplaying = Task { try? await Task.sleep(nanoseconds: 350_000_000); if !Task.isCancelled { store.playSound(clip, again: true) } }
  }

  // Once the card is turned over: Explain in its corner, or the explanation over its lower part.
  @ViewBuilder private func explain(_ rv: ReviewVM) -> some View {
    let id = rv.card.id
    let ex = store.demo ? ExplainVM(on: true, text: exMock ? Store.demoExplain.review : "", note: exMock ? "2 free explanations left today" : "") : store.explainOf(id)
    if revealed && ex.on && !id.isEmpty {
      if exFor == id {
        GeometryReader { g in
          CappedScroll(max: g.size.height * 0.72) {
            ExplainPanel(ex: ex, look: .card(t)) { withAnimation(.out(0.25)) { exFor = nil } }
              .padding(.vertical, 14).padding(.horizontal, 16)
          }
          .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.bg))
          .overlay(RoundedRectangle(cornerRadius: 21, style: .continuous).strokeBorder(t.line, lineWidth: 1).padding(-1))
          .boxShadow(.black.opacity(0.4), y: 18, blur: 44, spread: -14, radius: 20)
          .padding(10)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .transition(.opacity.combined(with: .offset(y: 6)))
      } else {
        ExplainButton(label: ex.label) {
          withAnimation(.out(0.25)) { exFor = id }
          if store.demo { exMock = true } else if ex.text.isEmpty { Task { await store.explain(id, question: "") } }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
      }
    }
  }

  private func topBar(_ rv: ReviewVM) -> some View {
    HStack(spacing: 12) {
      // X goes straight back to the deck's page (Today after a review of every deck); every grade is saved already.
      RoundButton(icon: "close", label: "End review") { nav.leave(to: deckId) }
      HStack(spacing: 10) {
        if rv.prog == "bar" {
          GeometryReader { g in
            ZStack(alignment: .leading) {
              Capsule().fill(t.surf)
              Capsule().fill(t.text).frame(width: g.size.width * CGFloat(rv.done) / CGFloat(max(1, rv.total)))
                .animation(.out(0.3), value: rv.done)
            }
          }
          .frame(height: 6)
          Text("\(rv.left)").css(13, mono: true).foregroundStyle(t.muted)
        } else if rv.prog == "counts" {
          HStack(spacing: 12) {
            count(rv.counts.new, t.easy, rv.lane == "new")
            count(rv.counts.learn, t.again, rv.lane == "learn")
            count(rv.counts.rev, t.good, rv.lane == "rev")
          }
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(rv.counts.new) new, \(rv.counts.learn) learning, \(rv.counts.rev) to review")
        }
      }
      .frame(maxWidth: .infinity)
      RoundButton(icon: "sliders", label: "Review settings", bg: settingsOpen ? t.inv : t.surf, fg: settingsOpen ? t.invText : t.text) {
        withAnimation(.out(0.35)) { settingsOpen.toggle() }
      }
    }
  }

  private func count(_ n: Int, _ c: Color, _ on: Bool) -> some View {
    Text("\(n)").css(15, .semibold, mono: true).foregroundStyle(c)
      .overlay(alignment: .bottom) { if on { Rectangle().fill(c).frame(height: 2).offset(y: 3) } }
  }

  @ViewBuilder private func grading(_ rv: ReviewVM) -> some View {
    if revealed {
      switch rv.mode {
      case "binary":
        HStack(spacing: 44) {
          round("close", t.again, "Didn’t know") { next { store.grade(rv.card.id, 1) } }
          round("check", t.good, "Knew it") { next { store.grade(rv.card.id, 3) } }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      case "piles":
        HStack(spacing: 6) {
          ForEach(Array(rv.piles.enumerated()), id: \.offset) { _, p in
            Button { next { store.pile(rv.card.id, p.name) } } label: {
              VStack(alignment: .leading, spacing: 2) {
                Text("\(p.n)").css(22, .semibold, ls: -0.03).lineBox(22)
                Text(p.name).css(13, .semibold).lineLimit(1)
              }
              .foregroundStyle(t.text)
              .padding(.horizontal, 12)
              .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
              .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
            }
            .buttonStyle(.press)
            .accessibilityLabel("Put in \(p.name)")
          }
          if rv.piles.count < 5 {
            Button { pileDraft = "" } label: {
              Icon("plus", 16, 2.2).foregroundStyle(t.muted).frame(width: 52).frame(maxHeight: .infinity)
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
            }
            .buttonStyle(.press)
            .accessibilityLabel("New pile")
          }
        }
      default:
        HStack(spacing: 6) {
          grade("Forgot", t.again, rv.fsrsOn ? rv.iv.again : "") { next { store.grade(rv.card.id, 1) } }
          grade("Hard", t.hard, rv.fsrsOn ? rv.iv.hard : "") { next { store.grade(rv.card.id, 2) } }
          grade("Good", t.good, rv.fsrsOn ? rv.iv.good : "") { next { store.grade(rv.card.id, 3) } }
          grade("Easy", t.easy, rv.fsrsOn ? rv.iv.easy : "") { next { store.grade(rv.card.id, 4) } }
        }
      }
    } else { Color.clear }
  }

  /// After a grade: the next card, fresh and unflipped.
  private func next(_ action: () -> Void) {
    var tx = Transaction(); tx.disablesAnimations = true
    withTransaction(tx) { moved = true; revealed = false }
    action()
  }

  private func grade(_ label: String, _ c: Color, _ interval: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 4) {
        HStack(spacing: 5) { Circle().fill(c).frame(width: 7, height: 7); Text(label).css(14, .semibold) }
        if !interval.isEmpty { Text(interval).css(11, mono: true).foregroundStyle(t.muted) }
      }
      .foregroundStyle(t.text)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Capsule().fill(t.surf))
    }
    .buttonStyle(.press)
  }

  private func round(_ icon: String, _ c: Color, _ label: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) { Icon(icon, 28, 2.8).foregroundStyle(t.bg).frame(width: 68, height: 68).background(Circle().fill(c)) }
      .buttonStyle(.press)
      .accessibilityLabel(label)
  }

  private func settingsSheet(_ rv: ReviewVM) -> some View {
    VStack(alignment: .leading, spacing: 18) {
      Grabber().frame(maxWidth: .infinity)
      HStack { Text("Review settings").css(18, .semibold); Spacer(); SheetDone { withAnimation(.out(0.3)) { settingsOpen = false } } }
      VStack(alignment: .leading, spacing: 8) {
        Text("Grade with").css(13, .semibold)
        Segmented(options: [("four", "4 grades"), ("binary", "✓ / ✗"), ("piles", "Piles")], current: rv.mode, hPad: 8) { store.updateDeck(rv.deckId, ["grading": $0]) }
      }
      VStack(alignment: .leading, spacing: 8) {
        Text("Progress").css(13, .semibold)
        Segmented(options: [("bar", "Bar"), ("counts", "Counts"), ("none", "None")], current: rv.prog, hPad: 8) { store.setProgress($0) }
        Text(["bar": "A thin bar and how many cards are left.", "counts": "New · learning · review, like Anki. The current card’s queue is underlined.", "none": "Nothing on screen but the card."][rv.prog] ?? "")
          .css(12, lh: 1.4).foregroundStyle(t.muted)
      }
      // The background of the deck this card is from; reviewing every deck, it says which deck that is.
      if !rv.deckId.isEmpty {
        BgChooser(deckId: rv.deckId, title: store.demo || deckId != nil ? "Background" : "Background for " + (store.engine.deck(rv.deckId)?.name ?? ""))
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
  }

  /// New pile: name it, then add it (a dialog over the keyboard).
  private func newPile(_ rv: ReviewVM) -> some View {
    PileDialog(name: Binding(get: { pileDraft ?? "" }, set: { pileDraft = $0 }), cancel: { pileDraft = nil }) {
      let n = (pileDraft ?? "").trimmingCharacters(in: .whitespaces)
      store.addPile(rv.deckId, n.isEmpty ? "Pile \(rv.piles.count + 1)" : n)
      pileDraft = nil
    }
  }
}

struct PileDialog: View {
  @Environment(\.theme) private var t
  @Binding var name: String
  let cancel: () -> Void
  let save: () -> Void
  @FocusState private var focused: Bool
  /// The app's pages run under the keyboard (the editor places its own bar), so the dialog lifts itself above it.
  @StateObject private var keyboard = Keyboard()
  var body: some View {
    ZStack(alignment: .bottom) {
      t.dim.ignoresSafeArea().onTapGesture(perform: cancel)
      VStack(alignment: .leading, spacing: 14) {
        Text("New pile").css(16, .semibold)
        TextField("", text: $name, prompt: Text("Name it, like “Tricky ones”").foregroundStyle(t.muted))
          .focused($focused).font(.geist(15)).padding(.horizontal, 16).frame(height: 46)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(t.text, lineWidth: 2))
          .submitLabel(.done).onSubmit(save)
        HStack(spacing: 8) {
          Button(action: cancel) { Text("Cancel").css(14, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.surf)) }.buttonStyle(.press)
          Button(action: save) { Text("Add pile").css(14, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(t.inv)) }.buttonStyle(.press)
        }
      }
      .foregroundStyle(t.text)
      .padding(20)
      .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.bg))
      .padding(.horizontal, 16).padding(.bottom, 16 + keyboard.height)
    }
    .onAppear { focused = true }
  }
}

/// The card: two faces on a turning card (a 3D flip over half a second). A fill-in-the-blank card doesn't turn; its
/// blank fills in with a pop and the note fades in below.
struct FlipCard: View {
  @Environment(\.theme) private var t
  let card: CardFace
  let revealed: Bool
  let moved: Bool
  let done: Int
  let tap: () -> Void
  var radius: CGFloat = 32
  var pad = EdgeInsets(top: 26, leading: 22, bottom: 26, trailing: 22)
  var big = false

  var body: some View {
    // Fill-in-the-blank cards and pictures with boxes stay put: the blank fills in, or the box fades to an outline.
    let turned = revealed && card.kind != "cloze" && !card.isOcc
    Button(action: tap) {
      ZStack {
        CardFaceView(card: card, back: false, revealed: revealed, big: big).padding(pad).cardFace(radius).modifier(FaceShown(angle: turned ? 180 : 0, front: true))
        CardFaceView(card: card, back: true, revealed: revealed, big: big).padding(pad).cardFace(radius)
          .rotation3DEffect(.degrees(180), axis: (0, 1, 0)).modifier(FaceShown(angle: turned ? 180 : 0, front: false))
      }
      .modifier(Turn(angle: turned ? 180 : 0))
      .animation(moved ? nil : .std(0.5), value: turned)
      .id(moved ? card.id : "")
      .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: 14)).combined(with: .scale(scale: 0.98)), removal: .identity))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(card.kind == "cloze" ? (revealed ? "Hide the answer" : "Show the blank") : card.isOcc ? (revealed ? "Hide the answer" : "Show what’s under the box") : (revealed ? "Flip back" : "Flip card"))
    .animation(.out(0.32), value: moved ? card.id : "")
  }
}

/// Turns the card around its vertical axis with a perspective like the canvas's (1600px away).
private struct Turn: ViewModifier, Animatable {
  var angle: Double
  var animatableData: Double { get { angle } set { angle = newValue } }
  func body(content: Content) -> some View { content.rotation3DEffect(.degrees(angle), axis: (0, 1, 0), perspective: 0.22) }
}
/// Shows a face only while it points at you (backface-visibility: hidden).
private struct FaceShown: ViewModifier, Animatable {
  var angle: Double
  let front: Bool
  var animatableData: Double { get { angle } set { angle = newValue } }
  func body(content: Content) -> some View { content.opacity((angle < 90) == front ? 1 : 0) }
}

extension View {
  /// A card face: white (or dark gray), a thin line, rounded, with the theme's soft shadow.
  func cardFace(_ radius: CGFloat) -> some View { modifier(CardFaceStyle(radius: radius)) }
  /// A CSS box-shadow under a rounded rectangle: offset y, blur, and spread (negative shrinks it).
  func boxShadow(_ color: Color, y: CGFloat, blur: CGFloat, spread: CGFloat = 0, radius r: CGFloat) -> some View {
    background(RoundedRectangle(cornerRadius: max(0, r + spread), style: .continuous).fill(color).padding(-spread).blur(radius: blur / 2).offset(y: y))
  }
  /// The theme's shadow (t.shadow, up to two layers) under a rounded rectangle.
  func themeShadow(_ s: [Shadow], radius r: CGFloat) -> some View {
    let a = s.first, b = s.count > 1 ? s[1] : nil
    return boxShadow(a?.color.color ?? .clear, y: a?.y ?? 0, blur: a?.blur ?? 0, spread: a?.spread ?? 0, radius: r)
      .boxShadow(b?.color.color ?? .clear, y: b?.y ?? 0, blur: b?.blur ?? 0, spread: b?.spread ?? 0, radius: r)
  }
}
private struct CardFaceStyle: ViewModifier {
  @Environment(\.theme) private var t
  let radius: CGFloat
  func body(content: Content) -> some View {
    content
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(t.card))
      .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(t.line, lineWidth: 1))
      .themeShadow(t.shadow, radius: radius)
  }
}

/// One side of a card (FACE: an empty top line, the content in the middle, the note at the bottom).
struct CardFaceView: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  /// Sound cards follow their clip (it starts, pauses, ends).
  @ObservedObject private var sound = Sound.shared
  let card: CardFace
  let back: Bool
  let revealed: Bool
  var big = false

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Color.clear.frame(height: 21)
      // The face turned away can't be reached: its buttons (like a sound's) stay out of the way, and out of VoiceOver.
      middle.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .allowsHitTesting(facing).accessibilityHidden(!facing)
      // The note line keeps its height when it's empty. Under a card that stays put (a blank, or a picture with boxes),
      // it shows with the answer.
      ZStack(alignment: .topLeading) {
        Color.clear.frame(height: 21)
        if back { note }
        else if card.kind == "cloze" || card.isOcc { note.modifier(FadeUp(on: revealed)).accessibilityHidden(!revealed) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .foregroundStyle(t.text)
  }

  private var note: some View { RichText(md: card.note, size: 14, lh: 1.5, color: t.muted) }
  /// This face is the one showing (a blank or a picture with boxes never turns).
  private var facing: Bool { card.kind == "cloze" || card.isOcc ? !back : back == revealed }

  @ViewBuilder private var middle: some View {
    switch (card.kind, back) {
    case ("cloze", _):
      RichText(md: card.text, size: big ? 38 : 28, weight: .medium, lh: 1.45, ls: -0.02,
               cloze: ClozeStyle(ask: card.cloze, hide: !revealed, pad: big ? 16 : 12, bg: revealed ? t.inv : t.surf2, fg: revealed ? t.invText : .clear, pop: revealed))
    case ("image", false) where card.isOcc:
      OccFace(card: card, revealed: revealed, big: big)
    case ("image", true) where card.isOcc:
      Color.clear
    case ("image", _):
      VStack(spacing: 16) {
        picture
        if back { RichText(md: card.backLabel.isEmpty ? card.back : card.backLabel, size: big ? 32 : 26, weight: .semibold, ls: -0.02) }
        else { RichText(md: card.front, size: big ? 24 : 20, weight: .medium) }
      }
      .frame(maxWidth: .infinity)
    case ("audio", false):
      // The sound: play or pause, its waveform (tap or drag it to jump), and where it's at of how long it is.
      let clip = card.clip, vm = store.sound(clip)
      VStack(spacing: big ? 24 : 20) {
        PlayButton(clip: clip, vm: vm, size: big ? 88 : 76, glyph: 30)
        VStack(spacing: 8) {
          WaveRow(clip: clip, vm: vm, bars: 48, gap: big ? 4 : 3).frame(height: big ? 52 : 44)
          if vm.hasTime {
            HStack(spacing: 0) { ClipTime(vm: vm, at: true); Spacer(minLength: 0); Text(vm.total) }.css(12, mono: true).foregroundStyle(t.muted)
          }
        }
        .frame(maxWidth: big ? 400 : 272)
        RichText(md: card.front, size: big ? 24 : 20, weight: .medium)
      }
      .frame(maxWidth: .infinity)
    case ("audio", true):
      let clip = card.clip, vm = store.sound(clip)
      VStack(spacing: 8) {
        RichText(md: card.backBig.isEmpty ? card.back : card.backBig, size: big ? 64 : 52, weight: .semibold, ls: -0.02)
        RichText(md: card.backSub, size: big ? 22 : 18, color: t.muted)
        // The sound again, small, to hear it with the answer (pressing it doesn't turn the card).
        HStack(spacing: 12) {
          PlayButton(clip: clip, vm: vm, size: 36, glyph: 14)
          WaveRow(clip: clip, vm: vm, bars: 36, gap: 2).frame(height: 24)
          if vm.hasTime { ClipTime(vm: vm).css(12, mono: true).foregroundStyle(t.muted) }
        }
        .padding(.leading, 6).padding(.trailing, 16)
        .frame(maxWidth: big ? 300 : 248).frame(height: 48)
        .background(Capsule().fill(t.surf))
        .contentShape(Capsule())
        .onTapGesture {}
        .padding(.top, big ? 18 : 14)
      }
      .frame(maxWidth: .infinity)
    case (_, false): RichText(md: card.front, size: big ? 38 : 28, weight: .medium, lh: 1.25, ls: -0.02)
    default: RichText(md: card.back, size: big ? 32 : 24, weight: .medium, lh: 1.3, ls: -0.015)
    }
  }

  @ViewBuilder private var picture: some View {
    if card.image == "mock" { CellDiagram().frame(width: big ? 330 : 260, height: big ? 225 : 178) }
    else if let img = card.image, let url = store.api.mediaURL(img) {
      AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { t.surf }
        .frame(maxHeight: big ? 250 : 200).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
  }
}

/// The canvas's sample diagram (CELL): a cell with its nucleus, organelles, and label 1 (`pointer`; a picture with boxes
/// has none).
struct CellDiagram: View {
  @Environment(\.theme) private var t
  var pointer = true
  var body: some View {
    Canvas { ctx, size in
      ctx.scaleBy(x: size.width / 220, y: size.height / 150)
      let line = StrokeStyle(lineWidth: 2)
      ctx.stroke(Path(ellipseIn: CGRect(x: 10, y: 18, width: 188, height: 124)), with: .color(t.text), style: line)
      let nucleus = Path(ellipseIn: CGRect(x: 92, y: 50, width: 48, height: 48))
      ctx.fill(nucleus, with: .color(t.surf)); ctx.stroke(nucleus, with: .color(t.text), style: line)
      // The nucleolus has the drawing's outline too (the svg's stroke), like on the canvas.
      let nucleolus = Path(ellipseIn: CGRect(x: 113, y: 63, width: 14, height: 14))
      ctx.fill(nucleolus, with: .color(t.text)); ctx.stroke(nucleolus, with: .color(t.text), style: line)
      for (x, y, rx, ry) in [(54.0, 96.0, 16.0, 8.0), (74, 46, 12, 6), (158, 112, 14, 7)] {
        ctx.stroke(Path(ellipseIn: CGRect(x: x - rx, y: y - ry, width: rx * 2, height: ry * 2)), with: .color(t.text), style: line)
      }
      guard pointer else { return }
      var p = Path(); p.move(to: CGPoint(x: 138, y: 60)); p.addLine(to: CGPoint(x: 186, y: 22))
      ctx.stroke(p, with: .color(t.text), style: line)
      ctx.fill(Path(ellipseIn: CGRect(x: 182, y: 4, width: 24, height: 24)), with: .color(t.inv))
      ctx.draw(Text("1").font(.geist(13, .bold)).foregroundStyle(t.invText), at: CGPoint(x: 194, y: 16))
    }
    .accessibilityLabel("Diagram of a cell")
  }
}
