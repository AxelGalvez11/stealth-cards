// iPhone · Learn mode (PhoneQuizStart, PhoneQuizUpgrade, PhoneQuiz, PhoneQuizAnswered, PhoneQuizMatch, PhoneQuizType,
// PhoneQuizDone): pick the cards and kinds of questions, then answer until every card is learned.
import SwiftUI

/// The canvas's sample session (the 40 cards tagged Exam 1 in Cell Biology, 18 learned so far).
struct DemoLearn {
  var screen = "choice"       // choice, match, type, done
  var pick: Int? = nil
  var matched = ["0", "3"], sel: String? = "1", wrong: [String]? = nil
  var typed = "golgi body", checked = true
}

extension Store {
  static let demoQuestion = (kind: "Multiple choice", streak: 1, q: "A drug makes the inner mitochondrial membrane leak protons. What happens to the cell’s ATP output?",
                             options: ["It drops", "It rises", "It stays the same", "Only glycolysis stops"], right: 0,
                             why: "ATP synthase runs on the proton gradient the electron transport chain builds. A leak spends that gradient before it can make ATP.",
                             card: ("What does the electron transport chain pump across the inner membrane?", "Protons (H⁺)"))
  static let demoPairs = [("Mitochondrion", "Makes most of the cell’s ATP"), ("Ribosome", "Builds proteins from mRNA"), ("Golgi apparatus", "Packages proteins for export"), ("Nucleus", "Holds the cell’s DNA"), ("Lysosome", "Breaks down waste")]
}

// ---------- starting ----------

/// Learn mode's start: which cards, which kinds of questions, then Start learning (a sheet over the deck).
struct LearnStartSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String
  @State private var set: String? = nil
  @State private var kinds: [String] = ["mc", "match", "tf", "blank"]

  var body: some View {
    let sets = store.learnSets(deckId)
    let cur = sets.first { $0.id == set } ?? (store.demo ? sets[2] : sets.first { $0.n > 0 } ?? sets.last!)
    let n = cur.n, mins = max(1, Int((Double(n) * 0.6).rounded()))
    VStack(alignment: .leading, spacing: 18) {
      // Like the web card (canvas V77): a white title and line on the deep top.
      Grabber(color: .white.opacity(0.45)).frame(maxWidth: .infinity)
      HStack(spacing: 12) {
        HStack(spacing: 10) { Icon("sparkle", 20, 1.8); Text("Learn mode").css(22, .semibold, ls: -0.02) }.foregroundStyle(.white)
        Spacer()
        Button(action: nav.close) {
          Icon("close", 16, 2).foregroundStyle(.white).frame(width: 40, height: 40)
            .background(Circle().fill(.white.opacity(0.14))).overlay(Circle().strokeBorder(.white.opacity(0.3), lineWidth: 1.5))
        }
        .buttonStyle(.press).accessibilityLabel("Close")
      }
      Text("Learn cards until you know every one. Each card is asked a few different ways, and the ones you miss come back.").css(15, lh: 1.5)
        .foregroundStyle(.white.opacity(0.9)).shadow(color: .black.opacity(0.16), radius: 7, x: 0, y: 1)
        .padding(.bottom, 24)
      field("Cards") {
        Segmented(options: sets.map { ($0.id, "\($0.label) · \($0.n)") }, current: cur.id, height: 38, hPad: 6) { set = $0 }
      }
      field("Kinds of questions") {
        FlowLayout(spacing: 8, lineSpacing: 8) {
          ForEach(LearnKinds.all, id: \.id) { k in
            let on = kinds.contains(k.id)
            Button { kinds = on && kinds.count > 1 ? kinds.filter { $0 != k.id } : on ? kinds : kinds + [k.id] } label: {
              HStack(spacing: 6) { if on { Icon("check", 14, 2.4) }; Text(k.label).css(13, .semibold) }
                .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 38).background(Capsule().fill(on ? t.inv : t.surf))
            }
            .buttonStyle(.press)
            .accessibilityAddTraits(on ? .isSelected : [])
          }
        }
      }
      Text(n > 0 ? "Learn all \(plural(n, "card")), about " + (mins >= 90 ? "\(Int((Double(mins) / 60).rounded())) hours over a few sessions" : plural(mins, "minute")) + ". You can stop anytime and pick up where you left off."
           : "This deck has no cards to learn yet. Picture and text cards work; sound cards come later.")
        .css(13).foregroundStyle(t.muted)
      FlexRow(spacing: 10) {
        Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press)
        Button {
          if store.demo || store.startLearn(deckId, set: cur.id, kinds: kinds) { nav.sheet = nil; withAnimation(.out(0.35)) { nav.full = .learn(deckId) } }
        } label: {
          HStack(spacing: 8) { Icon("sparkle", 16, 2); Text("Start learning").css(15, .semibold) }
            .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        .grow(2)
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
    .background(alignment: .top) { DeepTop(height: 354, from: 64) }
  }

  private func field<C: View>(_ label: String, @ViewBuilder _ body: () -> C) -> some View {
    VStack(alignment: .leading, spacing: 8) { Text(label).css(13, .semibold); body() }
  }
}

/// The deep gradient across the top of a start sheet (the site's Midnight), fading out downward on the scrim curve: the
/// canvas's deepTopOf(height, from), where the fade starts `from` points down.
struct DeepTop: View {
  let height: CGFloat, from: CGFloat
  var body: some View {
    MeshFill(mesh: .palette("Midnight"))
      .frame(maxWidth: .infinity).frame(height: height)
      .mask(Scrim.mask(from: Double(from / height)))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// A fade that looks natural (design/build.mjs SCRIM): alpha lets go slowly, faster in the middle, then slowly again, so
/// neither end shows as an edge. `from` is where it starts, as a fraction of the height.
enum Scrim {
  static let curve: [(at: Double, alpha: Double)] = [(0, 1), (0.081, 0.987), (0.155, 0.951), (0.225, 0.896), (0.29, 0.825), (0.353, 0.741), (0.412, 0.648), (0.471, 0.55), (0.529, 0.45), (0.588, 0.352), (0.647, 0.259), (0.71, 0.175), (0.775, 0.104), (0.845, 0.049), (0.919, 0.013), (1, 0)]
  static func mask(from: Double) -> LinearGradient {
    LinearGradient(stops: curve.map { .init(color: .black.opacity($0.alpha), location: from + (1 - from) * $0.at) }, startPoint: .top, endPoint: .bottom)
  }
}

/// On Free (once Pro can be bought), Learn opens this instead: a sky, two matched cards, what Pro adds, the price.
struct LearnUpgradeSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  var body: some View {
    VStack(spacing: 0) {
      SkyTop(height: 200, cardW: 132, cardH: 88)
      VStack(alignment: .leading, spacing: 18) {
        VStack(alignment: .leading, spacing: 8) {
          HStack(spacing: 10) {
            Text("Learn every card").css(26, .semibold, ls: -0.03)
            Text("Pro").css(12, .bold, ls: 0.01).foregroundStyle(.white).padding(.horizontal, 9).frame(height: 22)
              .background(Capsule().fill(LinearGradient(colors: [Color(hex: 0x7E94FB), Color(hex: 0x2CB2EA)], startPoint: .leading, endPoint: .trailing)))
          }
          Text("AI turns your cards into questions of every kind, like matching and typing the answer, and keeps going until you know them all.").css(15, lh: 1.5).foregroundStyle(t.muted)
        }
        VStack(alignment: .leading, spacing: 10) {
          ForEach(["Learn mode with 5 kinds of questions", "Photo covers and your own colors", "Unlimited pictures and sounds"], id: \.self) { x in
            HStack(spacing: 10) {
              Icon("check", 13, 2.6).foregroundStyle(.white).frame(width: 22, height: 22)
                .background(Circle().fill(LinearGradient(colors: [Color(hex: 0x7E94FB), Color(hex: 0x2CB2EA)], startPoint: .topLeading, endPoint: .bottomTrailing)))
              Text(x).css(15)
            }
          }
        }
        // Each price is its own button, so paying never picks yearly for you.
        Text("Yearly works out to $3.25 a month. Cancel anytime.").css(14).foregroundStyle(t.muted)
        FlexRow(spacing: 10) {
          Button { UIApplication.shared.open(API.pro("monthly")) } label: {
            Text("$5.99 a month").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf))
          }.buttonStyle(.press)
          Button { UIApplication.shared.open(API.pro("yearly")) } label: {
            Text("$39 a year").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
          }.buttonStyle(.press)
        }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.bottom, 20).padding(.top, -6)
    }
    .padding(.bottom, 14)
    .overlay(alignment: .topTrailing) {
      Button(action: nav.close) { Icon("close", 16, 2).foregroundStyle(.black).frame(width: 40, height: 40).background(Circle().fill(Color.white.opacity(0.7))) }
        .buttonStyle(.press).accessibilityLabel("Close").padding(16)
    }
  }
}

/// A sky with soft clouds, and two matched cards on it (the upgrade card's top).
struct SkyTop: View {
  @Environment(\.theme) private var t
  let height: CGFloat, cardW: CGFloat, cardH: CGFloat
  var body: some View {
    let sky = t.dark ? (top: 0x081733, mid: 0x0D2148, low: 0x0A1530, cloud: Color(hex: 0x96AAE6, opacity: 0.10)) : (top: 0x86BDF3, mid: 0xC9E2FB, low: 0xEDF5FE, cloud: Color(hex: 0xFFFFFF, opacity: 0.94))
    // Soft clouds: three puffs of three blobs each, and the sky's gradient, drawn in one canvas.
    let stops: [Gradient.Stop] = [.init(color: Color(hex: UInt32(sky.top)), location: 0), .init(color: Color(hex: UInt32(sky.mid)), location: 0.58), .init(color: Color(hex: UInt32(sky.low)), location: 0.82), .init(color: t.bg, location: 1)]
    Canvas { ctx, size in
      ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(Gradient(stops: stops), startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
      for c in [(-8.0, 18.0, 190.0, 70.0), (58, 6, 210, 76), (70, 58, 170, 60)] {
        let ox = size.width * c.0 / 100, oy = size.height * c.1 / 100
        for p in [(0.0, 30.0, 60.0, 70.0), (24, 0, 56, 88), (46, 24, 54, 76)] {
          let r = CGRect(x: ox + c.2 * p.0 / 100, y: oy + c.3 * p.1 / 100, width: c.2 * p.2 / 100, height: c.3 * p.3 / 100)
          ctx.drawLayer { l in
            l.translateBy(x: r.midX, y: r.midY); l.scaleBy(x: r.width / 2, y: r.height / 2)
            l.fill(Path(ellipseIn: CGRect(x: -1, y: -1, width: 2, height: 2)),
                   with: .radialGradient(Gradient(stops: [.init(color: sky.cloud, location: 0.4), .init(color: sky.cloud.opacity(0), location: 1)]), center: .zero, startRadius: 0, endRadius: 1))
          }
        }
      }
    }
    .frame(maxWidth: .infinity).frame(height: height)
    .overlay(alignment: .center) {
      HStack(spacing: 14) {
        MeshCard(mesh: .palette("Iris"), radius: 18) {
          Text("Golgi apparatus").css((cardW / 9.5).rounded(), .semibold, ls: -0.01).multilineTextAlignment(.center).padding(12).frame(width: cardW, height: cardH)
        }
        .rotationEffect(.degrees(-6)).shadow(color: Color(hex: 0x14165A, opacity: 0.45), radius: 8, y: 16)
        Icon("check", 18, 2.6).foregroundStyle(Color(hex: 0x067647)).frame(width: 34, height: 34).background(Circle().fill(.white)).shadow(color: .black.opacity(0.3), radius: 5, y: 6)
        MeshCard(mesh: .palette("Mint"), radius: 18) {
          Text("Packages proteins for export").css((cardW / 11).rounded(), .semibold, lh: 1.25).multilineTextAlignment(.center).padding(12).frame(width: cardW, height: cardH)
        }
        .rotationEffect(.degrees(5)).shadow(color: Color(hex: 0x14165A, opacity: 0.45), radius: 8, y: 16)
      }
      .offset(y: height * 0.04)
    }
    .clipped()
    .accessibilityHidden(true)
  }
}

// ---------- questions ----------

struct LearnScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String
  @State private var typing = ""
  /// The question whose explanation is open, and (on a design screen) whether the sample one was asked for.
  @State private var exFor: String? = nil
  @State private var exMock = false

  var body: some View {
    Group {
      if store.demo { demoBody } else if let v = store.learnView() {
        if v.done { done(total: v.total, summary: "\(v.setName) · \(v.minutes) min · \(v.firstPct)% first time", tries: v.tries) }
        else if v.type == "match" { match(v) } else if v.type == "type" { type(v) } else { choice(v) }
      } else { Color.clear.onAppear { nav.closeFull() } }
    }
    .foregroundStyle(look.ink)
    .background(t.bg)
  }

  /// Learn mode's colors: the sky style (canvas V82), light or at night.
  private var look: LearnLook { LearnLook.of(t.dark) }

  // The canvas's sample screens.
  @ViewBuilder private var demoBody: some View {
    let d = store.demoLearn, Q = Store.demoQuestion
    switch d.screen {
    case "match":
      var v = LearnView(setName: "Exam 1", total: 40, learned: 18, learning: 9, n: 1, type: "match", kind: "Matching")
      let _ = (v.left = Store.demoPairs.enumerated().map { (String($0.offset), $0.element.0) },
               v.rightSide = [3, 0, 4, 2, 1].map { (String($0), Store.demoPairs[$0].1) },
               v.matched = d.matched, v.sel = d.sel, v.wrong = d.wrong)
      match(v, question: "Match each organelle to what it does.")
    case "type":
      let ok = d.typed.lowercased().contains("golg")
      let v = LearnView(setName: "Exam 1", total: 40, learned: d.checked && ok ? 19 : 18, learning: 9, justLearned: d.checked && ok ? 1 : 0, n: 2, type: "type", kind: "Type the answer",
                        id: "typeq", text: "Which organelle packages proteins for secretion?", answer: "Golgi apparatus", streak: d.checked && ok ? 2 : 1, learnedNow: d.checked && ok,
                        typed: d.typed, checked: d.checked, ok: ok)
      type(v, why: ok ? "“\(d.typed.trimmingCharacters(in: .whitespaces))” is close to the Golgi apparatus, so it counts. That was the second time in a row." : "The answer is “Golgi apparatus”. This card comes back in a few questions.")
    case "done":
      done(total: 40, summary: "Exam 1 · 26 min · 88% first time", tries: [("Lysosome", "Breaks down waste", "4 tries"), ("What is the role of the ribosome?", "Translates mRNA into protein", "3 tries")])
    default:
      let ok = d.pick == Q.right
      let v = LearnView(setName: "Exam 1", total: 40, learned: 18, learning: 9, n: 0, type: "choice", kind: Q.kind, id: "q0", text: Q.q, answer: Q.card.1, streak: Q.streak + (d.pick != nil && ok ? 1 : 0),
                        options: Q.options, right: Q.right, pick: d.pick)
      choice(v, why: Q.why + (d.pick == nil ? "" : ok ? " Get it right once more, asked another way, and it’s learned." : " This card comes back in a few questions."), from: Q.card)
    }
  }

  // After an answer, the AI can explain it: Explain, then the explanation in its place (under the line that says why).
  @ViewBuilder private func explain(_ v: LearnView, answered: Bool) -> some View {
    let sample = v.type == "type" ? Store.demoExplain.type : Store.demoExplain.learn
    let ex = store.demo ? ExplainVM(on: true, text: exMock ? sample : "", note: exMock ? "2 free explanations left today" : "") : store.explainOf(v.id)
    if answered && ex.on && !v.id.isEmpty {
      if exFor == v.id {
        ExplainPanel(ex: ex, look: .learn(look)) { withAnimation(.out(0.25)) { exFor = nil } }
          .padding(.vertical, 14).padding(.horizontal, 16)
          .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(look.card).learnShadow(look.shadow))
          .transition(.opacity.combined(with: .offset(y: 6)))
      } else {
        ExplainButton(label: ex.label, look: .learn(look)) {
          withAnimation(.out(0.25)) { exFor = v.id }
          if store.demo { exMock = true } else if ex.text.isEmpty { Task { await store.explain(v.id, question: v.text) } }
        }
      }
    }
  }

  // The top: stop, progress through the set (learned purple, still learning light purple), and the count, on soft
  // glass chips over the sky.
  private func top(_ v: LearnView) -> some View {
    let k = look
    return HStack(spacing: 12) {
      Button { nav.closeFull() } label: { Icon("close", 18, 2).foregroundStyle(k.ink).frame(width: 44, height: 44).background(Circle().fill(k.chip)) }
        .buttonStyle(.press).accessibilityLabel("Stop for now")
      GeometryReader { g in
        HStack(spacing: 0) {
          k.bar.frame(width: g.size.width * CGFloat(v.learned) / CGFloat(max(1, v.total)))
          k.part.frame(width: g.size.width * CGFloat(v.learning) / CGFloat(max(1, v.total)))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(k.track)
        .clipShape(Capsule())
        .animation(.out(0.5), value: v.learned)
      }
      .frame(height: 10)
      (Text("\(v.learned)").fontWeight(.bold) + Text("/\(v.total)")).css(13).foregroundStyle(k.ink)
        .overlay(alignment: .topTrailing) {
          if v.justLearned > 0 { PlusOne(color: k.bar).offset(x: 24, y: -3) }
        }
    }
  }

  // The question alone: the owner dropped the kind of question ("Multiple choice", canvas V73) and the card's two
  // streak dots (V85).
  private func head(_ v: LearnView, question: String? = nil) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      LabelText(text: Rich.nsText([Rich.Run(t: question ?? v.text, m: "")], size: 24, weight: .bold, ls: -0.025, lh: 1.2, color: UIColor(look.ink), dark: t.dark))
      if let img = v.image, let url = store.api.mediaURL(img) {
        AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { t.surf }.frame(maxHeight: 180).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      }
      if !v.claim.isEmpty {
        Text(v.claim).css(18, .bold, lh: 1.35).padding(.horizontal, 20).padding(.vertical, 16).frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(look.card).learnShadow(look.shadow))
      }
    }
    .padding(.top, 8).padding(.horizontal, 4)
  }

  private func why(_ ok: Bool, learnedNow: Bool, _ text: String) -> some View {
    (Text(ok ? (learnedNow ? "Learned." : "Right.") : "Not quite.").fontWeight(.bold).foregroundStyle(ok ? t.good : t.again) + Text(" " + text)).css(16, lh: 1.5)
  }

  private func from(_ front: String, _ back: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("From your card").foregroundStyle(look.ink2)
      (Text(front + " ") + Text("→").foregroundStyle(look.ink2) + Text(" " + back).fontWeight(.bold))
    }
    .css(13, lh: 1.4)
    .padding(.horizontal, 16).padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(look.card).learnShadow(look.shadow))
  }

  private func nextButton(_ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text("Next question").css(17, .semibold).foregroundStyle(look.btnFg).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(look.btn))
    }
    .buttonStyle(.press)
  }

  /// A question page: the top, then the question (it scrolls when it runs long), then Next at the bottom, over the deck's
  /// study background.
  private func page<Top: View, C: View, B: View>(_ spacing: CGFloat = 18, @ViewBuilder top: () -> Top, @ViewBuilder content: () -> C, @ViewBuilder bottom: () -> B) -> some View {
    VStack(alignment: .leading, spacing: spacing) {
      top()
      ScrollView(showsIndicators: false) { content().frame(maxWidth: .infinity, alignment: .leading) }
        .scrollBounceBehavior(.basedOnSize)
      bottom()
    }
    .padding(.top, Screen.top(60)).padding(.horizontal, 16).padding(.bottom, 34)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(StudyBackground(bg: store.studyBg(deckId)))
    .ignoresSafeArea(.container)
  }

  // A choice question (multiple choice, true or false, fill in the blank). A question the learner's AI wrote brings its
  // own why, and a wrong pick names the right option.
  private func choice(_ v: LearnView, why whyText: String? = nil, from card: (String, String)? = nil) -> some View {
    let done = v.pick != nil, ok = v.pick == v.right
    let note = !v.why.isEmpty ? " " + v.why : v.note.isEmpty ? "" : " " + v.note
    let text = whyText ?? (ok ? (v.learnedNow ? "Two right in a row." + note : "Get it right once more, asked another way, and it’s learned." + note)
                              : "The answer is “\(v.aiAnswer.isEmpty ? v.answer : v.aiAnswer)”." + note + " This card comes back in a few questions.")
    return page(top: { top(v) }, content: {
      VStack(alignment: .leading, spacing: 16) {
        head(v)
        // White cards with a colored number; the right one rises and hovers with a green check, a wrong pick gets an ×,
        // and after an answer the others go gray.
        VStack(spacing: 8) {
          ForEach(Array(v.options.enumerated()), id: \.offset) { j, label in
            let right = done && j == v.right, wrong = done && j == v.pick && j != v.right, other = done && !right && !wrong, k = look
            Button { if !done { store.demo ? store.demoAnswer(j) : store.learnAnswer(j) } } label: {
              HStack(spacing: 14) {
                ZStack {
                  if right { Icon("check", 18, 2.6) } else if wrong { Icon("close", 16, 2.6) } else { Text("\(j + 1)").css(15, .bold) }
                }
                .foregroundStyle(other ? k.grayInk : .white)
                .frame(width: 34, height: 34)
                .background(Circle().fill(right ? k.check : wrong ? k.wrong : other ? k.other : Color(hex: LearnLook.colors[j % 4])))
                Text(label).css(16, .semibold).frame(maxWidth: .infinity, alignment: .leading).multilineTextAlignment(.leading)
              }
              .foregroundStyle(wrong || other ? k.grayInk : k.ink)
              .padding(.leading, 12).padding(.trailing, 20).padding(.vertical, 10)
              .frame(minHeight: 54)
              .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(wrong || other ? k.gray : k.card).learnShadow(right ? k.lift : wrong || other ? nil : k.shadow))
              .modifier(Hover(on: right))
              .modifier(Shake(on: wrong))
            }
            .buttonStyle(.flat)
            .disabled(done)
          }
        }
        if done {
          VStack(alignment: .leading, spacing: 12) {
            why(ok, learnedNow: v.learnedNow, text)
            explain(v, answered: done)
            // The card it came from, in its own words (an AI's question words it another way).
            from(card?.0 ?? (v.cardText.isEmpty ? v.text : v.cardText), card?.1 ?? v.answer)
          }
          .padding(.horizontal, 4)
          .transition(.opacity.combined(with: .offset(y: 6)))
        }
      }
    }, bottom: {
      if done { nextButton { exFor = nil; store.demo ? store.demoNext() : store.learnNext() } }
    })
  }

  // Matching: tap a word, then what it means.
  private func match(_ v: LearnView, question: String = "Match each one to its answer.") -> some View {
    let all = v.matched.count == v.left.count, toGo = v.left.count - v.matched.count
    return page(top: { top(v) }, content: {
      VStack(alignment: .leading, spacing: 18) {
        head(v, question: question)
        GeometryReader { g in
          let lw = (g.size.width - 10) / 2.25
          HStack(alignment: .top, spacing: 10) {
            VStack(spacing: 10) { ForEach(v.left, id: \.id) { x in tile(x.label, state(v, x.id, left: true)) { store.demo ? store.demoPick("left", x.id) : store.learnPick("left", x.id) } } }
              .frame(width: lw)
            VStack(spacing: 10) { ForEach(v.rightSide, id: \.id) { x in tile(x.label, state(v, x.id, left: false)) { store.demo ? store.demoPick("right", x.id) : store.learnPick("right", x.id) } } }
          }
        }
        .frame(height: CGFloat(v.left.count) * 74 - 10)
        Text(all ? "All \(v.left.count) matched." : "\(toGo) pair\(toGo == 1 ? "" : "s") to go").css(14).foregroundStyle(look.ink2).padding(.horizontal, 4)
      }
    }, bottom: {
      if all { nextButton { store.demo ? store.demoNext() : store.learnNext() } }
    })
  }
  private func state(_ v: LearnView, _ id: String, left: Bool) -> String {
    if v.matched.contains(id) { return "done" }
    if let w = v.wrong, w[left ? 0 : 1] == id { return "wrong" }
    if left && v.sel == id { return "sel" }
    return "idle"
  }
  private func tile(_ label: String, _ st: String, _ pick: @escaping () -> Void) -> some View {
    Button(action: pick) {
      // White tiles: the picked one rises with a purple ring, a matched pair fades with a green check, a wrong pair goes
      // gray and shakes.
      let k = look, ink = st == "wrong" ? k.grayInk : k.ink
      HStack(spacing: 10) {
        // Wrapped like a browser (SwiftUI's Text moves a lone last word down with the one before it).
        LabelText(text: Rich.nsText([.init(t: label, m: "")], size: 14, weight: .semibold, lh: 1.3, color: UIColor(ink), dark: t.dark))
          .frame(maxWidth: .infinity, alignment: .leading)
        if st == "done" { Icon("check", 16, 2.6).foregroundStyle(k.check) }
      }
      .foregroundStyle(ink)
      .padding(.horizontal, 16).padding(.vertical, 10)
      .frame(maxWidth: .infinity, minHeight: 64)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(st == "wrong" ? k.gray : k.card).learnShadow(st == "sel" ? k.lift : st == "idle" ? k.shadow : nil))
      .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(k.bar, lineWidth: st == "sel" ? 2.5 : 0))
      .offset(y: st == "sel" ? -3 : 0)
      .animation(.spring(response: 0.3, dampingFraction: 0.8), value: st)
      .opacity(st == "done" ? 0.55 : 1)
      .modifier(Shake(on: st == "wrong"))
    }
    .buttonStyle(.flat)
    .disabled(st == "done")
  }

  // Typing the answer: close spelling counts, and "I was right" takes another word for the same thing.
  private func type(_ v: LearnView, why whyText: String? = nil) -> some View {
    let note = v.note.isEmpty ? "" : " " + v.note
    let text = whyText ?? (v.ok ? (v.learnedNow ? "Two right in a row." + note : "Get it right once more, asked another way, and it’s learned." + note) : "The answer is “\(v.answer)”." + note + " This card comes back in a few questions.")
    return page(16, top: { top(v) }, content: {
      VStack(alignment: .leading, spacing: 16) {
        head(v)
        HStack(spacing: 10) {
          TextField("", text: Binding(get: { v.checked ? v.typed : typing }, set: { typing = $0; if store.demo { store.demoLearn.typed = $0; store.demoLearn.checked = false } }),
                    prompt: Text("Type your answer").foregroundStyle(t.muted))
            .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.done)
            .onSubmit { check() }
            .font(.geist(16, .semibold)).foregroundStyle(v.checked && !v.ok ? look.grayInk : look.ink)
            .padding(.horizontal, 20).frame(height: 56)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(v.checked && !v.ok ? look.gray : look.card).learnShadow(!v.checked ? look.shadow : v.ok ? look.lift : nil))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(look.check, lineWidth: v.checked && v.ok ? 2.5 : 0))
            .offset(y: v.checked && v.ok ? -3 : 0)
            .modifier(Shake(on: v.checked && !v.ok))
            .disabled(v.checked)
          if !v.checked {
            Button(action: check) { Text("Check").css(15, .semibold).foregroundStyle(look.btnFg).padding(.horizontal, 26).frame(height: 56).background(Capsule().fill(look.btn)) }
              .buttonStyle(.press)
          }
        }
        Text("Close spelling counts.").css(13).foregroundStyle(look.ink2).padding(.horizontal, 4)
        if v.checked {
          VStack(alignment: .leading, spacing: 12) {
            why(v.ok, learnedNow: v.learnedNow, text)
            if !v.ok {
              Button { store.demo ? store.demoOverride() : store.learnOverride() } label: {
                Text("I was right").css(13, .semibold).foregroundStyle(look.ink).padding(.horizontal, 14).frame(height: 36).background(Capsule().fill(look.card).learnShadow(look.shadow))
              }
              .buttonStyle(.press)
            }
            explain(v, answered: v.checked)
            from(v.text, v.answer)
          }
          .padding(.horizontal, 4)
        }
      }
    }, bottom: {
      if v.checked { nextButton { typing = ""; exFor = nil; store.demo ? store.demoNext() : store.learnNext() } }
    })
    .onChange(of: v.id) { _, _ in typing = "" }
  }
  private func check() {
    if store.demo { if !store.demoLearn.typed.trimmingCharacters(in: .whitespaces).isEmpty { store.demoLearn.checked = true } }
    else { store.learnType(typing) }
  }

  // The end: every card learned, what took the most tries, and that they're in your reviews now, over the deck's study
  // background.
  private func done(total: Int, summary: String, tries: [(front: String, back: String, n: String)]) -> some View {
    VStack(spacing: 20) {
      LearnRing(total: total, size: 156, stroke: 14)
      VStack(spacing: 6) {
        Text(total == 1 ? "You learned it" : "You learned all \(total) cards").css(28, .bold, ls: -0.03)
        Text(summary).css(15).foregroundStyle(t.muted)
      }
      .multilineTextAlignment(.center)
      HStack(spacing: 12) {
        Icon("today", 18, 1.8).frame(width: 36, height: 36).background(Circle().fill(t.bg))
        Text("They’re in your reviews now. Lucida brings each card back right before you’d forget it.").css(14, lh: 1.45).frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 16).padding(.vertical, 14)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
      if !tries.isEmpty {
        VStack(alignment: .leading, spacing: 10) {
          Text("Took the most tries").css(15, .semibold)
          ForEach(Array(tries.enumerated()), id: \.offset) { _, m in
            HStack(spacing: 12) {
              (Text(m.front + " ") + Text("→").foregroundStyle(t.muted) + Text(" " + m.back).fontWeight(.semibold)).css(15, lh: 1.35).frame(maxWidth: .infinity, alignment: .leading)
              Text(m.n).css(13).foregroundStyle(t.muted)
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
          }
        }
      }
      Spacer(minLength: 0)
      FlexRow(spacing: 10) {
        Button { nav.closeFull(); if !store.demo { store.stopLearn() }; nav.sheet = .learnStart(deckId) } label: {
          Text("Learn more").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf))
        }.buttonStyle(.press)
        Button { if !store.demo { store.stopLearn() }; nav.closeFull() } label: {
          Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }.buttonStyle(.press)
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, Screen.top(60)).padding(.horizontal, 20).padding(.bottom, 34)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(StudyBackground(bg: store.studyBg(deckId)))
    .ignoresSafeArea(.container)
  }
}

/// Learn mode's colors, the canvas's sky style (LEARN_K in design/build.mjs): navy words, white cards with colored
/// numbers, purple progress, gray after an answer; at night, near-black cards and the same colors.
struct LearnLook {
  let ink, ink2, card, gray, grayInk, chip, track, btn, btnFg, other, wrong, bar, part, check: Color
  let shadow: LearnShadow, lift: LearnShadow
  /// The answers' number colors (they skip green and red, which mean right and wrong here).
  static let colors: [UInt32] = [0x4F60E6, 0xF2701D, 0x0E8FB0, 0xE5407E]
  static func of(_ dark: Bool) -> LearnLook {
    let navy = Color(hex: 0x0D1542)
    return dark
      ? LearnLook(ink: Color(hex: 0xF2F3F7), ink2: Color(hex: 0xF2F3F7).opacity(0.66), card: Color(hex: 0x1B1D24), gray: Color(hex: 0x2A2D35), grayInk: Color(hex: 0x8E95A3),
                  chip: .white.opacity(0.1), track: .white.opacity(0.14), btn: Color(hex: 0xF2F3F7), btnFg: navy, other: .white.opacity(0.14), wrong: Color(hex: 0x4A4F5C),
                  bar: Color(hex: 0x8C9AFC), part: Color(hex: 0x8C9AFC).opacity(0.4), check: Color(hex: 0x16C64A),
                  shadow: LearnShadow(color: .black.opacity(0.5), radius: 10, y: 8), lift: LearnShadow(color: .black.opacity(0.6), radius: 18, y: 20))
      : LearnLook(ink: navy, ink2: navy.opacity(0.68), card: .white, gray: Color(hex: 0xC4CBD5), grayInk: Color(hex: 0x5D6677),
                  chip: .white.opacity(0.72), track: navy.opacity(0.08), btn: navy, btnFg: .white, other: navy.opacity(0.12), wrong: navy,
                  bar: Color(hex: 0x4F60E6), part: Color(hex: 0x4F60E6).opacity(0.38), check: Color(hex: 0x16C64A),
                  shadow: LearnShadow(color: navy.opacity(0.16), radius: 10, y: 8), lift: LearnShadow(color: navy.opacity(0.3), radius: 18, y: 20))
  }
}
struct LearnShadow { let color: Color; let radius: CGFloat; let y: CGFloat }
extension View {
  /// A card's soft shadow (none when nil).
  func learnShadow(_ s: LearnShadow?) -> some View { shadow(color: s?.color ?? .clear, radius: s?.radius ?? 0, x: 0, y: s?.y ?? 0) }
}

/// The right answer rises, then bobs gently (5 to 9 points up), like it's hovering; with Reduce Motion it just sits raised.
struct Hover: ViewModifier {
  let on: Bool
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var bob = false
  func body(content: Content) -> some View {
    content
      .offset(y: on ? (bob ? -9 : -5) : 0)
      .animation(.spring(response: 0.45, dampingFraction: 0.85), value: on)
      .onAppear { start() }
      .onChange(of: on) { _, _ in start() }
  }
  private func start() {
    guard on, !still else { bob = false; return }
    withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true).delay(0.45)) { bob = true }
  }
}

/// The sky's faint blue fade behind the top of a page (a night sky in dark mode): deep blue up high, paler toward the
/// page (the canvas's skyFade). The owner took the clouds out (canvas V75).
struct SkyLayer: View {
  @Environment(\.theme) private var t
  var height: CGFloat = 600
  var opacity: Double = 1
  var body: some View {
    let sky: (top: UInt32, mid: UInt32, low: UInt32) = t.dark ? (0x081733, 0x0D2148, 0x0A1530) : (0x86BDF3, 0xC9E2FB, 0xEDF5FE)
    LinearGradient(stops: [.init(color: Color(hex: sky.top), location: 0), .init(color: Color(hex: sky.mid), location: 0.30), .init(color: Color(hex: sky.low), location: 0.55), .init(color: t.bg, location: 1)], startPoint: .top, endPoint: .bottom)
      .frame(maxWidth: .infinity).frame(height: height)
      .opacity(opacity)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// The end ring: it draws around while the count goes up to the total.
struct LearnRing: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  let total: Int, size: CGFloat, stroke: CGFloat
  @State private var drawn = false
  @State private var count = 0
  var body: some View {
    ZStack {
      Circle().stroke(t.surf2, lineWidth: stroke).padding(stroke / 2)
      Circle().trim(from: 0, to: drawn ? 1 : 0).stroke(Color(hex: t.dark ? 0x8C9AFC : 0x4353E0), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
        .rotationEffect(.degrees(-90)).padding(stroke / 2)
      VStack(spacing: 4) {
        Text("\(count)/\(total)").css((size / 4.6).rounded(), .semibold, ls: -0.04).monospacedDigit().lineBox((size / 4.6).rounded())
        Text("learned").css(13).foregroundStyle(t.muted)
      }
    }
    .frame(width: size, height: size)
    .onAppear {
      if still { drawn = true; count = total; return }
      withAnimation(.out(0.9)) { drawn = true }
      // The count climbs over about a second.
      let steps = min(total, 40)
      for i in 0...steps { DispatchQueue.main.asyncAfter(deadline: .now() + 0.25 + 1.1 * Double(i) / Double(max(1, steps))) { count = total * i / max(1, steps) } }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(total) of \(total) learned")
  }
}

/// "+1" floats up by the count when a card is learned.
struct PlusOne: View {
  let color: Color
  @State private var up = false
  var body: some View {
    Text("+1").css(13, .bold).foregroundStyle(color)
      .offset(y: up ? -16 : 6).opacity(up ? 0 : 1)
      .onAppear { withAnimation(.easeOut(duration: 1.1)) { up = true } }
      .accessibilityHidden(true)
  }
}

/// A wrong answer shakes.
struct Shake: ViewModifier {
  let on: Bool
  @State private var x: CGFloat = 0
  func body(content: Content) -> some View {
    content.offset(x: x).onChange(of: on) { _, v in
      guard v else { return }
      withAnimation(.easeInOut(duration: 0.09)) { x = -5 }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.09) { withAnimation(.easeInOut(duration: 0.17)) { x = 5 } }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.26) { withAnimation(.easeInOut(duration: 0.09)) { x = 0 } }
    }
  }
}

extension Store {
  // The design screens' sample session moves like the canvas's.
  func demoAnswer(_ j: Int) { demoLearn.pick = j }
  func demoPick(_ side: String, _ id: String) {
    if side == "left" { demoLearn.sel = id; demoLearn.wrong = nil; return }
    guard let sel = demoLearn.sel else { return }
    if id == sel { demoLearn.matched.append(id); demoLearn.sel = nil; demoLearn.wrong = nil }
    else { demoLearn.wrong = [sel, id]; Task { try? await Task.sleep(nanoseconds: 700_000_000); demoLearn.wrong = nil; demoLearn.sel = nil } }
  }
  func demoOverride() { demoLearn.typed = "Golgi apparatus" }
  func demoNext() {
    switch demoLearn.screen {
    case "choice": demoLearn.screen = "match"
    case "match": demoLearn.screen = "type"
    case "type": demoLearn.screen = "done"
    default: break
    }
  }
}
