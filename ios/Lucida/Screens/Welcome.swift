// iPhone · Onboarding (PhoneWelcome and its twins PhoneWelcomeClaude, Connected, Import, Anki, Found, Done): the welcome
// after your first sign-in. Two steps, and either can be skipped: connect your AI, then bring your cards. It looks like
// studying: each step asks a question on the front of one big card, with the answers under it where the grade buttons
// go; picking one turns the card over to its back (how to do it), and the next question turns it over again, so the card
// keeps flipping forward. Same steps and logic as the web (design/build.mjs OB_LOGIC).
import SwiftUI
import UniformTypeIdentifiers

/// The flow's screens, in order.
enum WelcomeStep: String, CaseIterable {
  case pickAI = "Pick AI", steps = "Steps", connected = "Connected", pickSource = "Pick source", sourceSteps = "Source steps", found = "Found", done = "Done"
  /// How far the card has turned: half a turn per side, always forward.
  var turn: Double { [0, 180, 180, 360, 540, 540, 720][index] }
  /// The bar on top, in percent.
  var progress: Double { [4, 18, 34, 50, 66, 82, 100][index] }
  var index: Int { WelcomeStep.allCases.firstIndex(of: self)! }
  /// The screens drawn on the card's front (the others are on its back).
  var front: Bool { turn.truncatingRemainder(dividingBy: 360) == 0 }
}

/// [id, name, short name]: the ids are Connect's (ConnectVM.clients).
private let AIS: [(id: String, name: String, short: String)] = [("claude", "Claude", "Claude"), ("openai", "ChatGPT", "ChatGPT"), ("cursor", "Cursor", "Cursor"), ("mcp", "Other app", "Other")]
private let SOURCES: [(id: String, name: String, icon: String)] = [("anki", "Anki", "obStar"), ("quizlet", "Quizlet", "decks"), ("sheet", "Spreadsheet", "sheet"), ("paste", "Paste text", "paste")]
private let ASK = "Make 5 flashcards about the Krebs cycle."
/// The canvas's made-up file for Anki and a spreadsheet: [deck, cards].
private let FILES: [String: (String, [(String, Int)])] = ["anki": ("Biology.txt", [("Cell Biology", 142), ("Genetics", 64), ("Ecology", 42)]), "sheet": ("vocab.csv", [("Vocab", 120)])]

struct WelcomeScreen: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  /// Settings › Studying › Flip animation: off, and the card doesn't turn between steps.
  @Environment(\.flipsOn) private var flips
  @Environment(\.openURL) private var openURL
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav

  /// The step you're on (nil: where it opens, the board's own step on a design screen).
  @State private var moved: WelcomeStep?
  private var step: WelcomeStep { moved ?? (store.demo ? WelcomeStep(rawValue: store.props.welcomeStep) ?? .pickAI : .pickAI) }
  /// The AI and the source picked (nil: none yet, the board's own on a design screen).
  @State private var ai: String?
  @State private var src: String?
  @State private var skippedAI = false
  @State private var copied = false
  @State private var asked = false
  @State private var paste: String?
  /// What was read from a file or the box: its name, and [deck, its cards].
  @State private var file: (name: String, decks: [(name: String, cards: [ReadCard])])?
  /// Decks unticked on Found.
  @State private var off: Set<String> = []
  @State private var busy = false
  @State private var choosing = false
  /// On a design screen the AI "connects" a moment after you copy the link or open the app.
  @State private var soon: Task<Void, Never>?

  private var live: Bool { !store.demo }
  private var aiId: String { ai ?? "claude" }
  private var srcId: String { src ?? "anki" }
  private var aiName: String { AIS.first { $0.id == aiId }!.name }
  /// How the lines name it: "Claude", or "your app" for another MCP app.
  private var who: String { aiId == "mcp" ? "your app" : aiName }
  private var Who: String { aiId == "mcp" ? "Your app" : aiName }
  /// In the app the AI counts as connected once it has called your link (the MCP link keeps who called).
  private var shown: WelcomeStep { step == .steps && live && store.connect().clients[aiId] == true ? .connected : step }

  // ---------- what was read ----------
  private var pasteText: String {
    paste ?? (live ? "" : srcId == "quizlet" ? "hablar\tto speak\ncomer\tto eat\nvivir\tto live\ntener\tto have\nhacer\tto do" : "Capital of Peru, Lima\nLargest ocean, Pacific\nH₂O, Water")
  }
  private var pasteName: String { srcId == "quizlet" ? (live ? "Quizlet set" : "Spanish verbs") : "My cards" }
  private var pasted: [(name: String, cards: [ReadCard])] { ReadCards.read(pasteText, name: pasteName) }
  private var pastedCount: Int { pasted.reduce(0) { $0 + $1.cards.count } }
  private var read: [(name: String, cards: [ReadCard])]? { live ? file?.decks : nil }
  private var fileName: String { live && file != nil ? file!.name : FILES[srcId]?.0 ?? (srcId == "quizlet" ? "Copied from Quizlet" : "Pasted text") }
  private var fileDecks: [(String, Int)] {
    if let read { return read.map { ($0.name, $0.cards.count) } }
    return FILES[srcId]?.1 ?? [(pasteName, pastedCount)]
  }
  private var kept: [(String, Int)] { fileDecks.filter { !off.contains($0.0) } }
  private var total: Int { kept.reduce(0) { $0 + $1.1 } }
  private var fileTotal: Int { fileDecks.reduce(0) { $0 + $1.1 } }

  var body: some View {
    let a = Aura.of(t), now = shown
    ZStack {
      t.bg.ignoresSafeArea()
      AuraBackground(aura: a, bare: Welcome.bare)
      if !Welcome.bare {
        VStack(spacing: 16) {
          topBar(now, a).frame(height: 40)
          card(now, a)
          bottom(now).frame(maxWidth: .infinity)
        }
        .foregroundStyle(t.text)
        .padding(.top, Screen.top(60))
        .padding(.horizontal, 16)
        .padding(.bottom, 34)
      }
    }
    // The keyboard (for the paste box) lifts the button above it; the card gives up the room.
    .ignoresSafeArea(.container)
    .onAppear { if !store.demo { debugStart() } }
    // While it waits for the AI, it asks for your library every 2 seconds (the web app does too).
    .task(id: shown == .steps && live) {
      guard shown == .steps && live else { return }
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        if Task.isCancelled { break }
        if let next = try? await store.api.state() { store.accept(next) }
      }
    }
    .fileImporter(isPresented: $choosing, allowedContentTypes: [.plainText, .commaSeparatedText, .tabSeparatedText, .text, .utf8PlainText]) { result in
      if case .success(let url) = result { readFile(url) }
    }
  }

  // ---------- top: Back, the progress bar, Skip ----------
  private func topBar(_ now: WelcomeStep, _ a: Aura) -> some View {
    HStack(spacing: 12) {
      ZStack {
        if [.steps, .pickSource, .sourceSteps, .found].contains(now) {
          Button(action: back) {
            Icon("back", 16, 2.2).frame(width: 40, height: 40).background(Circle().fill(t.bg)).shadows(a.card, radius: 20)
          }
          .buttonStyle(.press).accessibilityLabel("Back")
        }
      }
      .frame(width: 40, height: 40)
      GeometryReader { g in
        ZStack(alignment: .leading) {
          Capsule().fill(t.surf2)
          Capsule().fill(t.text).frame(width: g.size.width * now.progress / 100)
        }
        .clipShape(Capsule())
        .animation(still ? nil : .out(0.5), value: now)
      }
      .frame(height: 6)
      .accessibilityElement().accessibilityLabel("Setup").accessibilityValue("\(Int(now.progress)) percent")
      HStack(spacing: 0) {
        if now == .pickAI || now == .steps || now == .pickSource || now == .sourceSteps || now == .found {
          Button { if now == .pickAI || now == .steps { go(.pickSource) { skippedAI = true } } else { finish() } } label: {
            Text("Skip").css(14, .semibold).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.bg)).shadows(a.card, radius: 18)
          }
          .buttonStyle(.press)
        }
      }
      .frame(minWidth: 40, alignment: .trailing)
    }
  }

  // ---------- the card ----------
  private func card(_ now: WelcomeStep, _ a: Aura) -> some View {
    GeometryReader { g in
      ZStack {
        face(a) { if now.front { frontContent(now).id(now) } }
          .modifier(FaceVisible(angle: now.turn, front: true))
        face(a) { if !now.front { backContent(now).id(now) } }
          .rotation3DEffect(.degrees(180), axis: (0, 1, 0))
          .modifier(FaceVisible(angle: now.turn, front: false))
      }
      .modifier(CardTurn(angle: now.turn, perspective: max(g.size.width, g.size.height) / 1600))
      .animation(still || !flips ? nil : .std(0.7), value: now.turn)
    }
    .frame(maxHeight: .infinity)
  }

  private func face<C: View>(_ a: Aura, @ViewBuilder _ content: () -> C) -> some View {
    VStack(alignment: .leading, spacing: 0) { content() }
      .padding(.horizontal, 20).padding(.vertical, 24)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(RoundedRectangle(cornerRadius: 32, style: .continuous).fill(t.bg))
      .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
      .shadows(a.card, radius: 32)
  }

  @ViewBuilder private func frontContent(_ now: WelcomeStep) -> some View {
    switch now {
    case .pickAI: question("Step 1 of 2", "Which AI do you use?", "Connect it once, then just ask it for flashcards.")
    case .pickSource: question("Step 2 of 2", "Where are your flashcards now?", "Already have flashcards? Bring them with you.")
    case .done: doneScreen.obIn()
    default: EmptyView()
    }
  }

  @ViewBuilder private func backContent(_ now: WelcomeStep) -> some View {
    switch now {
    case .steps:
      VStack(alignment: .leading, spacing: 20) {
        head("Step 1 of 2", aiId == "mcp" ? "Connect your app" : "Connect " + aiName)
        aiSteps
      }
      .frame(maxHeight: .infinity, alignment: .top).obIn()
    case .connected: connectedScreen.obIn()
    case .sourceSteps:
      VStack(alignment: .leading, spacing: 16) {
        head("Step 2 of 2", ["anki": "From Anki", "quizlet": "From Quizlet", "sheet": "From a spreadsheet", "paste": "Paste your cards"][srcId]!)
        sourceHow
        if srcId == "quizlet" || srcId == "paste" { pasteBox }
      }
      .frame(maxHeight: .infinity, alignment: .top).obIn()
    case .found:
      VStack(alignment: .leading, spacing: 20) {
        head("Step 2 of 2", counted(fileTotal, "card") + " found")
        foundList
      }
      .frame(maxHeight: .infinity, alignment: .top).obIn()
    default: EmptyView()
    }
  }

  /// "Step 1 of 2" over each title.
  private func eyebrow(_ label: String) -> some View {
    Text(label).css(14, .medium).foregroundStyle(t.muted).frame(minHeight: 28, alignment: .leading)
  }
  private func head(_ eye: String, _ title: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      eyebrow(eye)
      Text(title).title(28).accessibilityAddTraits(.isHeader)
    }
  }
  /// A question, big, in the middle of the card's front, like a card's front in a review.
  private func question(_ eye: String, _ q: String, _ sub: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(eye)
      VStack(alignment: .leading, spacing: 10) {
        Text(q).title(30).accessibilityAddTraits(.isHeader)
        Text(sub).css(15, lh: 1.45).foregroundStyle(t.muted)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .padding(.bottom, 28)
    }
    .obIn()
  }

  // ---------- step 1: connect your AI ----------
  /// Lucida's address, with no secret in it (the app signs in to Lucida there).
  private var link: String { store.connect().url }

  @ViewBuilder private var aiSteps: some View {
    VStack(alignment: .leading, spacing: 20) {
      switch aiId {
      case "cursor":
        numbered(1, "Add Lucida to Cursor") { cursorButton }
        numbered(2, "Click Install") { how([("Cursor opens and asks once. That’s all.", false)]) }
      case "openai":
        numbered(1, "Copy your link") { linkField }
        numbered(2, "Add it to ChatGPT") {
          how([("In ", false), ("Settings › Apps", true), (", turn on ", false), ("Developer mode", true), (", click ", false), ("Create", true), (", and paste the link. It needs a paid ChatGPT plan.", false)])
          openButton("Open ChatGPT")
        }
      case "mcp":
        numbered(1, "Copy your link") { linkField }
        numbered(2, "Paste it in your app") { how([("Any app that works with MCP can use it.", false)]) }
      default:
        numbered(1, "Copy your link") { linkField }
        numbered(2, "Add it to Claude") {
          how([("In ", false), ("Customize › Connectors", true), (", add a custom connector and paste the link.", false)])
          openButton("Open Claude")
        }
      }
    }
  }

  private func numbered<C: View>(_ n: Int, _ title: String, @ViewBuilder _ body: () -> C) -> some View {
    HStack(alignment: .top, spacing: 14) {
      Text(String(n)).css(13, .semibold).frame(width: 26, height: 26).background(Circle().fill(t.surf))
      VStack(alignment: .leading, spacing: 10) {
        Text(title).css(15, .semibold)
        body()
      }
      .padding(.top, 3)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  /// A line on where to click, with the menu names in bold.
  private func how(_ parts: [(String, Bool)]) -> some View {
    var s = AttributedString()
    for (text, bold) in parts {
      var p = AttributedString(text)
      p.font = .geist(14, bold ? .semibold : .regular)
      p.foregroundColor = bold ? t.text : t.muted
      s += p
    }
    return Text(s).css(14, lh: 1.5).fixedSize(horizontal: false, vertical: true)
  }

  private var linkField: some View {
    HStack(spacing: 8) {
      Text(link.replacingOccurrences(of: "^https?://", with: "", options: .regularExpression)).css(13, mono: true).lineLimit(1).truncationMode(.tail)
        .frame(maxWidth: .infinity, alignment: .leading)
      Button {
        UIPasteboard.general.string = link
        copied = true
        connectSoon()
      } label: {
        ZStack { Text(copied ? "Copied" : "Copy").css(13, .semibold).foregroundStyle(t.invText).id(copied).popTransition() }
          .animation(Motion.pop, value: copied)
          .padding(.horizontal, 16).frame(height: 40).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .padding(.leading, 18).padding(.trailing, 5)
    .frame(height: 50)
    .background(Capsule().fill(t.surf))
  }

  /// Claude's and ChatGPT's own pages.
  private func openButton(_ label: String) -> some View {
    Button {
      if live, let u = URL(string: ["claude": "https://claude.ai/customize/connectors", "openai": "https://chatgpt.com/#settings"][aiId] ?? link) { openURL(u) } else { connectSoon() }
    } label: {
      HStack(spacing: 8) { Text(label).css(14, .semibold); Icon("out", 14, 2) }
        .padding(.leading, 16).padding(.trailing, 14).frame(height: 44)
        .background(Capsule().fill(t.bg)).overlay(Capsule().strokeBorder(t.surf2, lineWidth: 1))
    }
    .buttonStyle(.press)
  }

  /// Cursor installs from a link in one tap, so it has no link to copy. Cursor can't sign in to Lucida, so what it installs is your private
  /// link (never shown; a server with no sign-in has none, and its address works as it is).
  private var cursorButton: some View {
    Button {
      let url = store.connect().privateURL.nilIfEmpty ?? link
      let config = (try? JSONSerialization.data(withJSONObject: ["url": url], options: [.withoutEscapingSlashes]))?.base64EncodedString() ?? ""
      var c = URLComponents(string: "cursor://anysphere.cursor-deeplink/mcp/install")!
      c.queryItems = [URLQueryItem(name: "name", value: "lucida"), URLQueryItem(name: "config", value: config)]
      if live, let u = c.url { openURL(u) } else { connectSoon() }
    } label: {
      HStack(spacing: 9) { LogoView(name: "cursor", size: 17, ink: t.invText); Text("Add to Cursor").css(14, .semibold) }
        .foregroundStyle(t.invText)
        .padding(.leading, 14).padding(.trailing, 18).frame(height: 48)
        .background(Capsule().fill(t.inv))
    }
    .buttonStyle(.press)
  }

  private var connectedScreen: some View {
    VStack(spacing: 12) {
      CheckPop {
        Icon("check", 30, 2.8).foregroundStyle(Color.white).frame(width: 64, height: 64).background(Circle().fill(t.good))
      }
      .padding(.bottom, 6)
      Text(Who + " is connected").title(28).multilineTextAlignment(.center)
      Text("It can make cards for you now.").css(15, lh: 1.45).foregroundStyle(t.muted).multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // ---------- step 2: bring your cards ----------
  @ViewBuilder private var sourceHow: some View {
    switch srcId {
    case "quizlet": how([("On quizlet.com, open your set. Click ", false), ("⋯", true), (", then ", false), ("Export", true), (" and ", false), ("Copy text", true), (".", false)])
    case "sheet": how([("Fronts in the first column, backs in the second. Save it as ", false), ("CSV", true), (".", false)])
    case "paste": how([("One card per line: the front, a comma, then the back.", false)])
    default: how([("In Anki, click the gear next to a deck, then ", false), ("Export", true), (". Pick ", false), ("Notes in Plain Text", true), (".", false)])
    }
  }

  /// Quizlet's copied text or your own lines, in a box (16pt, so the phone doesn't zoom), and how many cards it holds.
  private var pasteBox: some View {
    let text = pasteText, n = pastedCount
    return VStack(alignment: .leading, spacing: 12) {
      ZStack(alignment: .topLeading) {
        if text.isEmpty {
          Text(srcId == "quizlet" ? "Paste what Quizlet copied" : "Front, back").css(16, lh: 1.6, mono: true).foregroundStyle(t.muted)
            .padding(.horizontal, 16).padding(.vertical, 14).allowsHitTesting(false)
        }
        TextEditor(text: Binding(get: { pasteText }, set: { paste = $0 }))
          .font(.mono(16)).lineSpacing(16 * 0.3)
          .scrollContentBackground(.hidden)
          .textInputAutocapitalization(.never).autocorrectionDisabled()
          .padding(.horizontal, 11).padding(.vertical, 6)
          .accessibilityLabel("Your cards")
      }
      .frame(height: 156)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      Text(n > 0 ? counted(n, "card") + " found" : text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "" : "Put the front and back on one line, split by a comma.")
        .css(13).foregroundStyle(t.muted).frame(minHeight: 18, alignment: .topLeading)
    }
  }

  /// What the file holds: its decks, each on by default; untick one to leave it out.
  private var foundList: some View {
    VStack(spacing: 4) {
      HStack(spacing: 12) {
        Icon("file", 17, 1.9).frame(width: 36, height: 36).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.bg))
        VStack(alignment: .leading, spacing: 1) {
          Text(fileName).css(15, .semibold).lineLimit(1)
          Text(counted(fileDecks.count, "deck")).css(13).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Button { go(.sourceSteps) } label: { Icon("close", 14, 2.2).foregroundStyle(t.muted).frame(width: 32, height: 32) }
          .buttonStyle(.press).accessibilityLabel("Choose another file")
      }
      .padding(.leading, 10).padding(.trailing, 6).frame(height: 56)
      ForEach(fileDecks, id: \.0) { name, n in
        let on = !off.contains(name)
        Button { if on { off.insert(name) } else { off.remove(name) } } label: {
          HStack(spacing: 12) {
            let m = Mesh.gen(name, "vivid")
            CSSLinearGradient(angle: m.angle, stops: m.stops).frame(width: 30, height: 22)
              .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous)).opacity(on ? 1 : 0.35)
            Text(name).css(15, .medium).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
            Text(n.formatted()).css(13, mono: true).foregroundStyle(t.muted)
            ZStack {
              RoundedRectangle(cornerRadius: 7, style: .continuous).fill(on ? t.inv : .clear)
              if !on { RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(t.muted, lineWidth: 1.5) }
              Icon("check", 13, 3).foregroundStyle(t.invText).opacity(on ? 1 : 0)
            }
            .frame(width: 22, height: 22)
          }
          .foregroundStyle(t.text)
          .padding(.leading, 12).padding(.trailing, 14).frame(height: 52)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.bg))
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityLabel(name).accessibilityValue(on ? "Checked" : "Not checked").accessibilityAddTraits(.isButton)
      }
    }
    .padding(6)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
  }

  // ---------- all set ----------
  private var doneScreen: some View {
    let shownDecks = (kept.isEmpty ? fileDecks : kept).prefix(3)
    return VStack(alignment: .leading, spacing: 20) {
      // Up to three of the decks, fanned out.
      ZStack(alignment: .topLeading) {
        ForEach(Array(shownDecks.enumerated()), id: \.offset) { i, d in
          FanCard(name: d.0, index: i)
        }
      }
      .frame(maxWidth: .infinity, alignment: .topLeading)
      .frame(height: 110, alignment: .topLeading)
      .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 8) {
        Text("You’re all set").title(28).accessibilityAddTraits(.isHeader)
        Text("Everything is in your Library, ready to study.").css(15, lh: 1.45).foregroundStyle(t.muted)
      }
      VStack(spacing: 0) {
        if !skippedAI { doneRow(first: true, logo: aiId, label: Who, value: "Connected", color: t.good) }
        doneRow(first: skippedAI, logo: nil, label: counted(total, "card"), value: "In " + counted(kept.count, "deck"), color: t.muted)
      }
      .padding(.horizontal, 16).padding(.vertical, 2)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      if !skippedAI { askBox }
    }
    .frame(maxHeight: .infinity, alignment: .top)
  }

  private func doneRow(first: Bool, logo: String?, label: String, value: String, color: Color) -> some View {
    HStack(spacing: 12) {
      Group { if let logo { LogoView(name: logo, size: 18) } else { Icon("decks", 17, 1.9) } }
        .frame(width: 34, height: 34).background(Circle().fill(t.bg))
      Text(label).css(15, .semibold).frame(maxWidth: .infinity, alignment: .leading)
      Text(value).css(14, .medium).foregroundStyle(color)
    }
    .frame(height: 56)
    .overlay(alignment: .top) { if !first { Rectangle().fill(t.line).frame(height: 1) } }
  }

  /// A first thing to ask the AI for, copied with one tap.
  private var askBox: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Try asking " + who).css(14, .semibold)
      HStack(alignment: .top, spacing: 12) {
        Text(ASK).css(16, .medium, lh: 1.4).padding(.vertical, 6).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
        Button {
          if live { UIPasteboard.general.string = ASK }
          asked = true
        } label: {
          Icon(asked ? "check" : "obCopy", 15, asked ? 2.4 : 2).frame(width: 34, height: 34).background(Circle().fill(t.bg))
        }
        .buttonStyle(.press).accessibilityLabel(asked ? "Copied" : "Copy")
      }
      .padding(.vertical, 12).padding(.leading, 18).padding(.trailing, 12)
      .background(UnevenRoundedRectangle(topLeadingRadius: 22, bottomLeadingRadius: 22, bottomTrailingRadius: 6, topTrailingRadius: 22, style: .continuous).fill(t.surf))
    }
  }

  // ---------- under the card ----------
  @ViewBuilder private func bottom(_ now: WelcomeStep) -> some View {
    switch now {
    case .pickAI:
      pills(AIS.map { a in (a.id, a.name, AnyView(LogoView(name: a.id, size: 20))) }, current: aiId, picked: ai != nil) { id in go(.steps) { ai = id; copied = false } }
    case .steps:
      HStack(spacing: 12) {
        PulseDot(color: t.easy)
        Text("Waiting for " + who + "…").css(14, .medium)
      }
      .foregroundStyle(t.muted)
      .padding(.horizontal, 18).frame(maxWidth: .infinity).frame(height: 50)
      .background(Capsule().fill(t.surf))
      .accessibilityElement(children: .combine)
    case .connected: goButton("Continue") { go(.pickSource) }
    case .pickSource:
      pills(SOURCES.map { s in (s.id, s.name, AnyView(Icon(s.icon, 18, 1.9))) }, current: srcId, picked: src != nil) { id in go(.sourceSteps) { src = id } }
    case .sourceSteps:
      if srcId == "anki" || srcId == "sheet" {
        goButton(srcId == "anki" ? "Choose your Anki file" : "Choose your CSV file", icon: "upload") { if live { choosing = true } else { go(.found) { off = [] } } }
      } else {
        let ok = pastedCount > 0
        goButton("Continue", on: ok) {
          guard ok else { return }
          if live { let decks = pasted; go(.found) { off = []; file = (srcId == "quizlet" ? "Copied from Quizlet" : "Pasted text", decks) } } else { go(.found) { off = [] } }
        }
      }
    case .found:
      goButton(busy ? "Importing…" : total > 0 ? "Import " + counted(total, "card") : fileTotal > 0 ? "Pick a deck" : "No cards found", on: total > 0) {
        guard total > 0 else { return }
        if live { Task { await importAll() } } else { go(.done) }
      }
    case .done: goButton("Start studying") { finish() }
    }
  }

  /// The answers under the card: round like the grade buttons, a logo or icon and a name.
  private func pills(_ items: [(String, String, AnyView)], current: String, picked: Bool, pick: @escaping (String) -> Void) -> some View {
    Grid(horizontalSpacing: 8, verticalSpacing: 8) {
      ForEach(0..<2) { row in
        GridRow {
          ForEach(items[(row * 2)..<(row * 2 + 2)], id: \.0) { id, name, glyph in
            let ring = id == current && picked
            Button { pick(id) } label: {
              HStack(spacing: 8) { glyph; Text(name).css(15, .semibold).lineLimit(1) }
                .padding(.horizontal, 14).frame(maxWidth: .infinity).frame(height: 56)
                .background(Capsule().fill(t.bg))
                .overlay(Capsule().strokeBorder(ring ? t.text : t.surf2, lineWidth: ring ? 2 : 1))
                .boxShadow(.black.opacity(0.45), y: 8, blur: 20, spread: -14, radius: 28)
            }
            .buttonStyle(.press)
            .accessibilityAddTraits(ring ? .isSelected : [])
          }
        }
      }
    }
  }

  /// The main button at the bottom: black (white in dark mode), or gray while it can't go.
  private func goButton(_ label: String, icon: String? = nil, on: Bool = true, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 8) {
        if let icon { Icon(icon, 17, 2) }
        Text(label).css(16, .semibold)
      }
      .foregroundStyle(on ? t.invText : t.muted)
      .frame(maxWidth: .infinity).frame(height: 50)
      .background(Capsule().fill(on ? t.inv : t.surf2))
    }
    .buttonStyle(.press)
  }

  // ---------- moving through it ----------
  private func go(_ to: WelcomeStep, _ more: () -> Void = {}) {
    soon?.cancel()
    more()
    moved = to
  }
  private func back() {
    switch shown {
    case .found: go(.sourceSteps)
    case .sourceSteps: go(.pickSource)
    default: go(shown != .steps && ai != nil && !skippedAI ? .connected : .pickAI)
    }
  }
  private func connectSoon() {
    guard !live else { return }
    soon?.cancel()
    soon = Task { try? await Task.sleep(nanoseconds: 2_400_000_000); if !Task.isCancelled { moved = .connected } }
  }
  /// Done or skipped: the Library, and the welcome doesn't come back.
  private func finish() {
    if live { store.setSetting(["welcomed": true]) }
    nav.pick(.library)
    withAnimation(Motion.sheet) { store.welcoming = false }
  }

  /// A file you picked: its cards, into decks named for the file (vocab.csv makes "vocab") unless it names its own.
  private func readFile(_ url: URL) {
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    // (UTF-8, UTF-16 or Latin-1, as Import cards reads a file: ReadCards.text.)
    guard let data = try? Data(contentsOf: url), let text = ReadCards.text(data) else { store.error = "That file couldn’t be read."; return }
    let base = url.deletingPathExtension().lastPathComponent
    let decks = ReadCards.read(text, name: base.isEmpty ? "My cards" : base)
    go(.found) { off = []; file = (url.lastPathComponent, decks) }
  }

  /// Each deck you kept goes into your Library (into a deck of the same name if you have one), a thousand cards at a time.
  private func importAll() async {
    guard !busy, let read else { return }
    busy = true
    defer { busy = false }
    for (name, cards) in read where !off.contains(name) {
      let key = name.trimmingCharacters(in: .whitespaces).lowercased()
      var deckId = store.lib.decks.first { $0.name.trimmingCharacters(in: .whitespaces).lowercased() == key }?.id ?? ""
      for i in stride(from: 0, to: cards.count, by: 1000) {
        let chunk = cards[i..<min(i + 1000, cards.count)].map(\.json)
        guard let r = await store.sent("data.import", ["deckId": deckId, "deckName": name, "cards": chunk]) else { return }
        deckId = r["deckId"] as? String ?? deckId
      }
    }
    store.setSetting(["welcomed": true])
    go(.done)
  }

  /// Debug builds: `-welcomeAI claude` opens on that AI's steps; `-welcomeFile <path>` reads that file as if it was
  /// picked (a .csv as a spreadsheet, anything else as Anki), and `-welcomeImport` then imports it (for checking the flow
  /// against a local server without tapping).
  private func debugStart() {
    #if DEBUG
    if let id = Board.arg("-welcomeAI") { go(.steps) { ai = id } }
    if let path = Board.arg("-welcomeFile") {
      let url = URL(fileURLWithPath: path)
      go(.sourceSteps) { src = url.pathExtension.lowercased() == "csv" ? "sheet" : "anki" }
      readFile(url)
      if ProcessInfo.processInfo.arguments.contains("-welcomeImport") { Task { try? await Task.sleep(nanoseconds: 1_500_000_000); await importAll() } }
    }
    #endif
  }
}

/// "1,280 cards" (with the thousands comma, like the web).
enum Welcome {
  /// Debug builds: `-auraOnly` shows only the background's folds, held still (for comparing them with the canvas).
  static let bare: Bool = {
    #if DEBUG
    return ProcessInfo.processInfo.arguments.contains("-auraOnly")
    #else
    return false
    #endif
  }()
}

private func counted(_ n: Int, _ w: String) -> String { n.formatted() + " " + w + (n == 1 ? "" : "s") }

/// One of the decks on the last screen: its gradient card, fanned out, dealt in one after another.
private struct FanCard: View {
  let name: String
  let index: Int
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var dealt = false
  var body: some View {
    let x: [CGFloat] = [0, 93, 186], y: [CGFloat] = [14, 0, 16], r: [Double] = [-6, 1, 7]
    MeshCard(mesh: Mesh.gen(name, "vivid"), radius: 16) {
      Text(name).css(13, .semibold, ls: -0.01).lineLimit(1)
        .padding(.horizontal, 14).padding(.vertical, 12)
        .frame(width: 132, height: 88, alignment: .bottomLeading)
    }
    .boxShadow(.black.opacity(0.6), y: 18, blur: 36, spread: -20, radius: 16)
    .rotationEffect(.degrees(dealt ? r[index] : 0))
    .offset(x: x[index], y: y[index] + (dealt ? 0 : 16))
    .opacity(dealt ? 1 : 0)
    .onAppear {
      if still { dealt = true } else { withAnimation(.out(0.7).delay(0.1 + Double(index) * 0.12)) { dealt = true } }
    }
  }
}

/// The check on Connected pops in.
private struct CheckPop<C: View>: View {
  @ViewBuilder var content: C
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var on = false
  var body: some View {
    content.scaleEffect(on ? 1 : 0.3).opacity(on ? 1 : 0)
      .onAppear { if still { on = true } else { withAnimation(.timingCurve(0.34, 1.56, 0.64, 1, duration: 0.5).delay(0.12)) { on = true } } }
  }
}

/// The waiting dot, with a ring that swells and fades.
private struct PulseDot: View {
  let color: Color
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var go = false
  var body: some View {
    ZStack {
      Circle().fill(color).scaleEffect(go ? 3 : 1).opacity(go ? 0 : 0.5)
      Circle().fill(color)
    }
    .frame(width: 9, height: 9)
    .onAppear { if !still { withAnimation(.out(1.6).repeatForever(autoreverses: false)) { go = true } } }
  }
}

/// A screen on the card fades in as it comes up.
private struct ObIn: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var on = false
  func body(content: Content) -> some View {
    content.opacity(on ? 1 : 0).offset(y: on ? 0 : 6)
      .onAppear { if still { on = true } else { withAnimation(.out(0.35)) { on = true } } }
  }
}
private extension View { func obIn() -> some View { modifier(ObIn()) } }

private extension Text {
  /// A title: bold, tight (line-height 1.12). Lines closer than the font's own spacing need iOS 26; before that a title
  /// that wraps keeps the font's spacing.
  @ViewBuilder func title(_ size: CGFloat) -> some View {
    if #available(iOS 26, *) {
      // The lines are packed from the top, where CSS takes the difference half above and half below: up by that half.
      font(.geist(size, .bold)).tracking(-0.03 * size).lineHeight(.exact(points: size * 1.12)).offset(y: -size * (GEIST_LINE - 1.12) / 2)
    } else {
      css(size, .bold, ls: -0.03, lh: 1.12)
    }
  }
}

/// The card turning around its vertical axis, 1600 points away like the canvas.
private struct CardTurn: ViewModifier, Animatable {
  var angle: Double
  let perspective: CGFloat
  var animatableData: Double { get { angle } set { angle = newValue } }
  func body(content: Content) -> some View { content.rotation3DEffect(.degrees(angle), axis: (0, 1, 0), perspective: perspective) }
}
/// A face shows only while it points at you (backface-visibility: hidden).
private struct FaceVisible: ViewModifier, Animatable {
  var angle: Double
  let front: Bool
  var animatableData: Double { get { angle } set { angle = newValue } }
  func body(content: Content) -> some View { content.opacity((cos(angle * .pi / 180) > 0) == front ? 1 : 0) }
}
