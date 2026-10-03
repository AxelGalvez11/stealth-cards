// iPhone · Practice test (PhoneTest, with the board's picker: Set up, Multiple choice, True or false, Fill in the blank, Written,
// Matching, Submit, Leave, Results, Results · missed), and its pieces on a folder's page: the Practice test button and how the last
// one went (a deck's page has none: the owner, 2026-10-02, "remove practice tests"). A calm test like an exam, not a game: numbered questions you can go back through and flag,
// a quiet timer when one is on, nothing said about right or wrong until you submit, then the score with every question. The
// engine is Data/TestEngine.swift (a port of web/db.js's), the words and looks are the board's (design/test-boards.mjs).
import SwiftUI

// ---------- the folder's pieces ----------

/// The Practice test button (a folder's page).
struct TestStartButton: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var nav: Nav
  let scope: TestScope
  var height: CGFloat = 48
  var size: CGFloat = 16
  var body: some View {
    Button { withAnimation(Motion.sheet) { nav.sheet = .testStart(scope) } } label: {
      HStack(spacing: 8) { Icon("file", size, 2); Text("Practice test").css(size, .semibold).lineLimit(1).fixedSize() }
        .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: height).background(Capsule().fill(t.surf))
    }
    .buttonStyle(.press)
  }
}

/// A folder's page: how its last test went, and a button to take one over all its decks.
struct TestFolderBits: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  let folder: LibFolder
  var body: some View {
    let scope = TestScope.folder(folder.id)
    VStack(alignment: .leading, spacing: 14) {
      if !folder.decks.isEmpty { TestStartButton(scope: scope) }
    }
  }
}

// ---------- Set up ----------

/// The start of a test: how many questions, which kinds, a time limit, then Start (a sheet over the deck's or folder's page).
struct TestStartSheet: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let scope: TestScope
  @State private var count: Int? = nil
  @State private var kinds = ["mc", "tf", "type", "match", "blank"]
  @State private var limit = 0

  var body: some View {
    let plan = store.testPlan(scope, kinds), avail = plan.available
    let lens = lengths(avail)
    let want = count ?? 20
    let twenty = avail >= 20 ? lens.first { $0.id == "20" } : nil
    let cur = lens.first { Int($0.id) == want } ?? twenty ?? lens[lens.count - 1]
    let folder = scope.folderId != nil, off = avail == 0
    VStack(alignment: .leading, spacing: 18) {
      Grabber().frame(maxWidth: .infinity)
      HStack(spacing: 12) {
        HStack(spacing: 10) { Icon("file", 20, 1.8); Text("Practice test").css(22, .semibold, ls: -0.02) }
        Spacer()
        Button(action: nav.close) { Icon("close", 16, 2.2).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
          .buttonStyle(.press).accessibilityLabel("Close")
      }
      field("Questions") { Segmented(options: lens, current: cur.id, height: 38, hPad: 6) { count = Int($0) } }
      field("Kinds of questions") {
        FlowLayout(spacing: 8, lineSpacing: 8) {
          ForEach(Store.testChips, id: \.id) { k in
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
      field("Time limit") { Segmented(options: [("0", "Off"), ("10", "10 min"), ("20", "20 min"), ("30", "30 min")], current: String(limit), height: 38, hPad: 6) { limit = Int($0) ?? 0 } }
      if plan.cards == 0 || off {
        Text(plan.cards == 0 ? (folder ? "These decks have no cards to ask yet." : "This deck has no cards to ask yet.") : "These kinds don’t fit your cards. Turn on more.")
          .css(13, lh: 1.5).foregroundStyle(t.muted)
      }
      FlexRow(spacing: 10) {
        Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press)
        Button {
          if off { return }
          if store.startTest(scope, count: Int(cur.id) ?? 0, kinds: kinds, limit: limit) { nav.sheet = nil; withAnimation(Motion.sheet) { nav.full = .test(scope) } }
        } label: {
          Text("Start test").css(15, .semibold).foregroundStyle(off ? t.muted : t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(off ? t.surf2 : t.inv))
        }
        .buttonStyle(.press)
        .grow(2)
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
  }

  private func field<C: View>(_ label: String, @ViewBuilder _ body: () -> C) -> some View {
    VStack(alignment: .leading, spacing: 8) { Text(label).css(13, .semibold); body() }
  }
  /// The lengths on offer: 10, 20 and 30 up to the number of questions there can be, and All.
  private func lengths(_ avail: Int) -> [(id: String, label: String)] {
    var lens: [(id: String, label: String)] = []
    for n in [10, 20, 30] where n < avail { lens.append((String(n), String(n))) }
    lens.append(("0", avail > 0 ? "All · " + grouped(avail) : "All"))
    return lens
  }
}

// ---------- the test ----------

/// The test in progress, or its results.
struct TestScreen: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let scope: TestScope
  /// The question being asked ("" none, "submit", or "leave"), the list of questions, which results show, and the open explanations.
  @State private var confirm = ""
  @State private var list = false
  @State private var only = "all"
  @State private var open: Set<Int> = []
  /// The question whose explanation's composer has the keyboard (its results scroll it into view above the keyboard).
  @State private var asking: Int? = nil
  @FocusState private var typing: Bool
  /// The keyboard's height: this page reaches the bottom of the screen (under the keyboard), so Back and Next are lifted above it.
  @StateObject private var keyboard = Keyboard()
  private let clock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
  /// The page's quick curve (none with Reduce Motion, so a sheet or the next question just appears).
  private func curve(_ d: Double) -> Animation? { still ? nil : .out(d) }

  var body: some View {
    Group {
      if let v = store.testView() { if v.phase == "results" { results(v) } else { question(v) } }
      else { Color.clear.onAppear { nav.closeFull() } }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(t.bg)
    .ignoresSafeArea(.container)
    .onReceive(clock) { _ in store.testTick() }
    #if DEBUG
    // The end-to-end test reads which answers are right from this invisible element (TestAudit).
    .overlay(alignment: .topLeading) {
      if TestAudit.on { Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("testAudit").accessibilityValue(store.testAuditValue()) }
    }
    #endif
    .onAppear {
      if store.demo { confirm = store.demoTest.screen == "Submit" ? "submit" : store.demoTest.screen == "Leave" ? "leave" : ""; only = store.demoTest.screen == "Results · missed" ? "missed" : "all" }
      // (the board's explainOpen and followUp Tweaks: question 3's explanation open, and a question asked about it)
      if store.demo && store.props.explainOpen {
        open.insert(3); store.demoTest.exOn.insert(3)
        if store.props.followUp, let q = Generated.chatSample["test"] { store.chats["test3"] = [ChatTurn(q: q.q, a: q.a)] }
      }
    }
    // Leaving the results forgets the questions asked about them.
    .onDisappear { for r in store.testView()?.rows ?? [] { store.followUpClear(chatKey(r)) } }
    .onChange(of: store.demoTest.screen) { _, s in if store.demo { confirm = s == "Submit" ? "submit" : s == "Leave" ? "leave" : ""; only = s == "Results · missed" ? "missed" : "all" } }
  }

  // ---------- a question ----------
  private func question(_ v: TestView) -> some View {
    ZStack {
      VStack(spacing: 0) {
        VStack(spacing: 12) {
          HStack(spacing: 10) {
            Button { typing = false; withAnimation(curve(0.3)) { confirm = "leave" } } label: { Icon("close", 18, 2).frame(width: 44, height: 44).background(Circle().fill(t.surf)) }
              .buttonStyle(.press).accessibilityLabel("Leave the test")
            Button { typing = false; withAnimation(curve(0.35)) { list = true } } label: {
              HStack(spacing: 4) { Text("\(v.number) of \(v.n)").css(15, .semibold); Icon("chevDown", 16, 2.2) }
                .foregroundStyle(t.text).padding(.leading, 16).padding(.trailing, 14).frame(height: 44).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press).accessibilityLabel("All the questions").accessibilityValue("\(v.number) of \(v.n)")
            Spacer(minLength: 0)
            if !v.clock.isEmpty {
              let low = (v.left ?? 99) <= 60
              HStack(spacing: 6) { Icon("today", 17, 2); Text(v.clock).css(15, low ? .semibold : .medium, mono: true) }
                .foregroundStyle(low ? t.text : t.muted).accessibilityElement(children: .ignore).accessibilityLabel("Time left").accessibilityValue(v.clock)
            }
          }
          Capsule().fill(t.surf).frame(height: 3).overlay(alignment: .leading) {
            GeometryReader { g in Capsule().fill(t.text).frame(width: g.size.width * CGFloat(v.number) / CGFloat(max(1, v.n))).animation(curve(0.3), value: v.number) }
          }
        }
        .padding(.top, Screen.top(58)).padding(.horizontal, 16)
        ScrollViewReader { proxy in
          ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
              HStack(spacing: 10) {
                Text(v.q.kindLabel).css(13, .semibold).foregroundStyle(t.muted)
                Spacer(minLength: 0)
                Button { store.testFlag() } label: {
                  HStack(spacing: 8) { Icon("flag", 17, 2); Text(v.flagged ? "Flagged" : "Flag").css(15, .semibold) }
                    .foregroundStyle(v.flagged ? t.hard : t.text).padding(.horizontal, 16).frame(height: 44).background(Capsule().fill(v.flagged ? t.hardTint : t.surf))
                }
                .buttonStyle(.press).accessibilityAddTraits(v.flagged ? .isSelected : [])
              }
              LabelText(text: Rich.nsText([Rich.Run(t: v.q.text, m: "")], size: 24, weight: .semibold, ls: -0.025, lh: 1.22, color: UIColor(t.text), dark: t.dark))
              if let img = v.q.image, let o = v.q.occ { LearnPicture(image: img, occ: (o.boxes, o.ask, o.mode), shown: false, look: TestLook.of(t)) }
              else if let img = v.q.image, let url = store.api.mediaURL(img) {
                AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { t.surf }.frame(maxHeight: 180).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
              }
              if !v.q.claim.isEmpty {
                wrapped(v.q.claim, 18, .semibold).padding(.horizontal, 18).padding(.vertical, 16)
                  .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
              }
              body(of: v.q, at: v.i)
            }
            .id(v.number)
            .transition(still ? .identity : .opacity)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 8)
          }
          .scrollDismissesKeyboard(.interactively)
          // The box you're writing in stays in sight above the keyboard.
          .onChange(of: keyboard.height) { _, h in
            if h > 0 && typing { DispatchQueue.main.async { withAnimation(curve(0.25)) { proxy.scrollTo("answer", anchor: .bottom) } } }
          }
        }
        HStack(spacing: 10) {
          Button { store.testStep(-1) } label: { Icon("back", 20, 2.2).foregroundStyle(t.text).frame(width: 56, height: 56).background(Circle().fill(t.surf)) }
            .buttonStyle(.press).opacity(v.canBack ? 1 : 0).disabled(!v.canBack).accessibilityLabel("Previous question")
          Button {
            typing = false
            if !v.last { store.testStep(1) } else if v.unanswered > 0 { withAnimation(curve(0.3)) { confirm = "submit" } } else { store.testSubmit() }
          } label: { Text(v.last ? "Submit" : "Next").css(17, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press)
        }
        .padding(.horizontal, 16).padding(.top, 10).padding(.bottom, keyboard.height > 0 ? keyboard.height + 10 : 34)
        .transaction { if still { $0.animation = nil } }
      }
      if list { listSheet(v).zIndex(2) }
      if !confirm.isEmpty { confirmSheet(v).zIndex(3) }
    }
  }

  @ViewBuilder private func body(of q: TestQView, at i: Int) -> some View {
    if q.type == "choice" {
      VStack(spacing: 10) {
        ForEach(Array(q.options.enumerated()), id: \.offset) { j, o in
          Button { store.testChoose(j) } label: {
            HStack(spacing: 14) {
              Text(Store.letters[j]).css(15, .bold).foregroundStyle(o.picked ? t.invText : t.muted).frame(width: 34, height: 34).background(Circle().fill(o.picked ? t.inv : t.surf2))
              wrapped(o.label, 16, .medium)
            }
            .foregroundStyle(t.text).padding(.leading, 12).padding(.trailing, 20).padding(.vertical, 10).frame(minHeight: 56)
            .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.text, lineWidth: o.picked ? 2 : 0))
            .animation(still ? nil : .easeOut(duration: 0.15), value: o.picked)
          }
          .buttonStyle(.flat)
          .accessibilityLabel(o.label).accessibilityAddTraits(o.picked ? .isSelected : [])
        }
      }
    } else if q.type == "type" {
      VStack(alignment: .leading, spacing: 10) {
        TextField("", text: Binding(get: { q.typed }, set: { store.testType($0, at: i) }), prompt: Text("Type your answer").foregroundStyle(PLACEHOLDER))
          .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.done).focused($typing).onSubmit { typing = false }
          .font(.geist(16, .medium)).foregroundStyle(t.text)
          .padding(.horizontal, 20).frame(height: 56)
          .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
          .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.text, lineWidth: typing ? 2 : 0))
          .accessibilityLabel("Your answer")
        Text("Close spelling counts.").css(14).foregroundStyle(t.muted).padding(.horizontal, 4)
      }
      .id("answer")
    } else {
      VStack(alignment: .leading, spacing: 10) {
        ForEach(q.terms) { m in
          VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
              Text("\(m.n)").css(13, .bold).frame(width: 26, height: 26).background(Circle().fill(t.bg))
              wrapped(m.label, 16, .semibold, lh: 1.3)
            }
            HStack(spacing: 8) {
              ForEach(m.chips, id: \.id) { x in
                Button { store.testMatch(m.id, x.id) } label: {
                  Text(x.letter).css(15, .bold).foregroundStyle(x.on ? t.invText : t.muted).frame(maxWidth: .infinity).frame(height: 42).background(Capsule().fill(x.on ? t.inv : t.bg))
                }
                .buttonStyle(.flat).accessibilityLabel("Answer \(x.letter) for \(m.label)").accessibilityAddTraits(x.on ? .isSelected : [])
              }
            }
          }
          .padding(.horizontal, 14).padding(.vertical, 12).frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
        }
        VStack(alignment: .leading, spacing: 4) {
          Text("Answers").css(13, .semibold).foregroundStyle(t.muted)
          ForEach(q.defs) { d in
            HStack(alignment: .top, spacing: 12) {
              Text(d.letter).css(13, .bold).foregroundStyle(d.by > 0 ? t.invText : t.muted).frame(width: 26, height: 26).background(Circle().fill(d.by > 0 ? t.inv : t.surf2))
              wrapped(d.label, 15).padding(.top, 3)
              if d.by > 0 { Text("\(d.by)").css(12, .bold).frame(width: 22, height: 22).background(Circle().fill(t.surf)).padding(.top, 3) }
            }
            .padding(.vertical, 8)
          }
        }
        .padding(.horizontal, 4).padding(.top, 4)
      }
    }
  }

  /// Submit (when some are unanswered) and Leave ask first, in a sheet.
  private func confirmSheet(_ v: TestView) -> some View {
    let leave = confirm == "leave"
    let line = leave ? "Your answers won’t be saved." : (v.unanswered > 0 ? "You haven’t answered \(plural(v.unanswered, "question"))." : "You answered every question.") + (v.flags > 0 ? " \(v.flags) \(v.flags == 1 ? "is" : "are") flagged." : "")
    return SheetOverlay(top: nil, close: { withAnimation(curve(0.3)) { confirm = "" } }) {
      VStack(alignment: .leading, spacing: 14) {
        Grabber().frame(maxWidth: .infinity)
        Text(leave ? "Leave this test?" : "Submit your test?").css(22, .semibold, ls: -0.02)
        Text(line).css(15, lh: 1.5).foregroundStyle(t.muted)
        FlexRow(spacing: 10) {
          Button { withAnimation(curve(0.3)) { confirm = "" } } label: { Text("Keep going").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
            .buttonStyle(.press)
          Button {
            withAnimation(curve(0.3)) { confirm = "" }
            if leave { store.testLeave(); if store.demo { nav.closeFull(); nav.sheet = .testStart(scope) } else { nav.leave(test: scope) } } else { store.testSubmit() }
          } label: { Text(leave ? "Leave" : "Submit").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press)
        }
        .padding(.top, 6)
      }
      .foregroundStyle(t.text).padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
    }
  }

  /// The list of questions: each number, lit when it's the one you're on, filled when answered, with a dot when flagged.
  private func listSheet(_ v: TestView) -> some View {
    SheetOverlay(top: nil, close: { withAnimation(curve(0.3)) { list = false } }) {
      VStack(alignment: .leading, spacing: 16) {
        Grabber().frame(maxWidth: .infinity)
        HStack { Text("Questions").css(20, .semibold, ls: -0.02); Spacer(); SheetDone { withAnimation(curve(0.3)) { list = false } } }
        ScrollView(showsIndicators: false) {
          LazyVGrid(columns: Array(repeating: GridItem(.fixed(48), spacing: 10), count: 6), alignment: .leading, spacing: 10) {
            ForEach(v.nav, id: \.n) { x in
              Button { store.testGo(x.n - 1); withAnimation(curve(0.3)) { list = false } } label: {
                Text("\(x.n)").css(14, .semibold).foregroundStyle(x.current ? t.invText : x.answered ? t.text : t.muted)
                  .frame(width: 48, height: 48)
                  .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(x.current ? t.inv : x.answered ? t.surf : .clear))
                  .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(t.line, lineWidth: x.current || x.answered ? 0 : 1))
                  .overlay(alignment: .topTrailing) { if x.flagged { Circle().fill(t.hard).frame(width: 12, height: 12).overlay(Circle().strokeBorder(t.bg, lineWidth: 2)).offset(x: 3, y: -3) } }
              }
              .buttonStyle(.flat)
              .accessibilityLabel("Question \(x.n)" + (x.answered ? ", answered" : ", not answered") + (x.flagged ? ", flagged" : ""))
              .accessibilityAddTraits(x.current ? .isSelected : [])
            }
          }
          .padding(.top, 4)
        }
        .frame(maxHeight: 360)
        Text("\(v.answered) answered" + (v.flags > 0 ? " · \(v.flags) flagged" : "")).css(13).foregroundStyle(t.muted)
      }
      .foregroundStyle(t.text).padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
    }
  }

  // ---------- the results ----------
  private func results(_ v: TestView) -> some View {
    let rows = only == "missed" ? v.rows.filter { !$0.ok } : v.rows
    return ScrollViewReader { proxy in ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        HStack(spacing: 12) {
          (Text("Practice test").fontWeight(.semibold) + Text(" · " + v.name).foregroundStyle(t.muted)).css(15).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
          Button { done(v) } label: { Text("Done").css(15, .semibold).foregroundStyle(t.text).padding(.horizontal, 22).frame(height: 40).background(Capsule().fill(t.surf)) }
            .buttonStyle(.press)
        }
        VStack(alignment: .leading, spacing: 18) {
          HStack(alignment: .bottom, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
              Text("Your score").css(13, .semibold).foregroundStyle(t.muted)
              Text("\(v.pct)%").css(64, .semibold, ls: -0.045).lineBox(64)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
              Text("\(v.right) of \(v.n)").css(20, .medium)
              Text(v.tookLabel).css(15, mono: true).foregroundStyle(t.muted)
            }
            .padding(.bottom, 6)
          }
          if v.timeUp { Text("The time ran out.").css(14).foregroundStyle(t.muted).padding(.top, -8) }
          VStack(spacing: 10) {
            if v.missed > 0 {
              Button { store.testRetake(); only = "all"; open = [] } label: { Text("Retake the ones I missed").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv)) }
                .buttonStyle(.press)
              Button { study() } label: { Text("Study the missed cards now").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.bg)) }
                .buttonStyle(.press)
            } else { Text("Every question was right.").css(15, lh: 1.5).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
          }
        }
        .padding(24).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.surf))
        HStack(spacing: 12) {
          Text("Questions").css(20, .semibold, ls: -0.02).frame(maxWidth: .infinity, alignment: .leading)
          Segmented(options: [("all", "All \(v.n)"), ("missed", "Missed \(v.missed)")], current: only, height: 32, equal: false, hPad: 14) { only = $0 }
        }
        ForEach(rows) { r in row(r) }
      }
      .padding(.horizontal, 16).padding(.top, Screen.top(58)).padding(.bottom, 40)
    }
    .scrollDismissesKeyboard(.interactively)
    // (while a question is typed the results end at the keyboard, which this page otherwise runs under, and the composer being typed in
    // stays in sight above it, and so does the answer coming in)
    .padding(.bottom, asking != nil ? keyboard.height : 0)
    .onChange(of: keyboard.height) { _, h in if h > 0, let n = asking { showAsk(proxy, n) } }
    .onChange(of: asking) { _, n in if let n, keyboard.height > 0 { showAsk(proxy, n) } }
    .onChange(of: store.chats) { _, _ in if let n = asking { showAsk(proxy, n) } }
    // (a design screen with question 3's explanation open starts there, as the board's Tweak does)
    .onAppear { if store.demo && store.props.explainOpen { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { proxy.scrollTo("ask3", anchor: .bottom) } } }
    }
  }

  private func done(_ v: TestView) {
    store.testLeave()
    if store.demo { nav.closeFull(); nav.sheet = .testStart(scope) } else { nav.leave(test: scope) }
  }
  private func study() {
    guard let set = store.testStudySet() else { return }
    store.startReview(nil, set: set)
    nav.afterSet = .test(scope)
    nav.study(set: set)
  }

  private func mark(_ ok: Bool, _ size: CGFloat, _ icon: CGFloat) -> some View {
    Group { if ok { Icon("check", icon, size > 24 ? 2.6 : 3) } else { Icon("close", icon - 2, size > 24 ? 2.6 : 3) } }
      .foregroundStyle(ok ? t.good : t.again).frame(width: size, height: size).background(Circle().fill(ok ? t.goodTint : t.againTint))
  }

  private func row(_ r: TestRowView) -> some View {
    let ex = r.pairs == nil && !r.card.isEmpty ? store.explainOf(r.card) : (store.demo && r.n == 3 ? store.demoExplainOf("test3", text: TestSample.shared.explain, asked: store.demoTest.exOn.contains(3)) : ExplainVM())
    let showEx = open.contains(r.n) && ex.on
    return VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 12) {
        Text("\(r.n) · \(r.kindLabel)").css(13, .semibold).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading)
        mark(r.ok, 28, 15)
      }
      if !r.q.isEmpty && !(r.kind == "tf" && r.q == "True or false?" && !r.claim.isEmpty) { wrapped(r.q, 16, .semibold) }
      if !r.claim.isEmpty {
        wrapped(r.claim, 15, .semibold).padding(.horizontal, 14).padding(.vertical, 12)
          .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
      }
      if let pairs = r.pairs {
        VStack(alignment: .leading, spacing: 8) {
          ForEach(Array(pairs.enumerated()), id: \.offset) { _, p in
            HStack(alignment: .top, spacing: 10) {
              mark(p.ok, 20, 11).padding(.top, 1)
              VStack(alignment: .leading, spacing: 0) {
                (Text(p.q).fontWeight(.semibold) + Text(" → ").foregroundStyle(t.muted) + Text(p.a.isEmpty ? "No answer" : p.a)).css(15, lh: 1.4)
                if !p.ok { (Text("Right answer: ").foregroundStyle(t.muted) + Text(p.r).fontWeight(.medium)).css(15, lh: 1.4) }
              }
              .frame(maxWidth: .infinity, alignment: .leading)
            }
          }
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          answerLine("Your answer", r.a.isEmpty ? "No answer" : r.a, muted: r.a.isEmpty)
          if !r.ok { answerLine("Right answer", r.r, muted: false) }
        }
      }
      if r.canCount || (ex.on && r.pairs == nil) {
        HStack(spacing: 8) {
          if r.canCount {
            Button { store.testCount(r.n) } label: { Text("Count it as right").css(13, .semibold).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.inv)) }
              .buttonStyle(.press)
          }
          if ex.on && r.pairs == nil && !showEx {
            ExplainButton(label: ex.label) {
              withAnimation(curve(0.25)) { _ = open.insert(r.n) }
              if store.demo { store.demoTest.exOn.insert(r.n) } else if ex.text.isEmpty { Task { await store.explain(r.card, question: r.q) } }
            }
          }
          Spacer(minLength: 0)
        }
      }
      if showEx {
        let key = chatKey(r)
        ExplainPanel(ex: ex, look: .test(t), pad: (16, 14), onFocus: { on in if on { asking = r.n } else if asking == r.n { asking = nil } },
                     close: { withAnimation(curve(0.25)) { _ = open.remove(r.n) }; store.followUpClear(key) },
                     ask: { q in Task { await store.followUp(key, q: q, question: r.q, sample: Generated.chatSample["test"]?.a ?? "") } })
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          .id("ask\(r.n)")
          .transition(still ? .identity : .opacity.combined(with: .offset(y: 6)))
      }
    }
    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.line, lineWidth: 1))
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("testRow\(r.n)")
  }

  /// Brings question `n`'s composer to the bottom of what shows, at once and again once the page has made room for the keyboard.
  private func showAsk(_ proxy: ScrollViewProxy, _ n: Int) {
    let go = { withAnimation(curve(0.25)) { proxy.scrollTo("ask\(n)", anchor: .bottom) } }
    DispatchQueue.main.async(execute: go)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: go)
  }
  /// Where a question's conversation is kept: its card's (the design screen's sample question has no card).
  private func chatKey(_ r: TestRowView) -> String { r.card.isEmpty ? "test\(r.n)" : r.card }

  private func answerLine(_ label: String, _ value: String, muted: Bool) -> some View {
    HStack(alignment: .top, spacing: 12) {
      Text(label).css(15, lh: 1.4).foregroundStyle(t.muted).frame(width: 104, alignment: .leading)
      wrapped(value, 15, .medium, lh: 1.4, color: muted ? t.muted : t.text)
    }
  }
}

extension TestScreen {
  /// Words wrapped the way a browser wraps them (SwiftUI's Text moves a lone last word down with the one before it).
  func wrapped(_ s: String, _ size: CGFloat, _ weight: Font.Weight = .regular, lh: CGFloat = 1.35, color: Color? = nil) -> some View {
    LabelText(text: Rich.nsText([Rich.Run(t: s, m: "")], size: size, weight: weight, lh: lh, color: UIColor(color ?? t.text), dark: t.dark)).frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// The colors a test's picture takes (the asked box filled in, the others covered): the page's own, with nothing lit.
enum TestLook {
  static func of(_ t: Theme) -> LearnLook {
    let none = LearnShadow(color: .clear, radius: 0, y: 0)
    return LearnLook(ink: t.text, ink2: t.muted, card: t.surf, gray: t.surf2, grayInk: t.muted, chip: t.surf, track: t.surf, btn: t.inv, btnFg: t.invText, other: t.surf2, wrong: t.again,
                     bar: t.text, part: t.muted, check: t.good, shadow: none, lift: none)
  }
}
