// iPhone · Sign in (PhoneSignIn, PhoneSignInCode): a wall of flashcards drifting over near-black, then Apple, Google,
// or a 6-digit code sent by email.
import SwiftUI

extension Store {
  /// Sends a sign-in code to an email address (the same as the website's sign-in).
  func sendCode(_ email: String) async -> String? {
    if demo { signInEmail = email; return nil }
    do { try await api.sendCode(email); signInEmail = email; return nil }
    catch { return error.localizedDescription }
  }
  /// Checks the code; the session's cookies come back with the answer, then the library loads.
  func verify(_ code: String) async -> String? {
    if demo { return nil }
    do { try await api.verify(signInEmail, code); await load(); return nil }
    catch { return error.localizedDescription }
  }
}

struct SignInScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @State private var email = ""
  @State private var busy = false
  @State private var working = false
  @State private var error = ""
  @FocusState private var typing: Bool

  var body: some View {
    VStack(spacing: 0) {
      CardWall().frame(maxWidth: .infinity, minHeight: 120, maxHeight: .infinity).clipped()
      VStack(spacing: 10) {
        Text("Sign in to Lucida").css(28, .bold, ls: -0.03).multilineTextAlignment(.center).padding(.bottom, 8)
        authButton("Continue with Apple", logo: AnyView(AppleLogo().frame(width: 17, height: 17))) { provider("apple") }
        authButton("Continue with Google", logo: AnyView(GoogleLogo().frame(width: 18, height: 18))) { provider("google") }
        HStack(spacing: 12) { Rectangle().fill(t.line).frame(height: 1); Text("or").css(13).foregroundStyle(t.muted); Rectangle().fill(t.line).frame(height: 1) }
          .padding(.vertical, 4)
        TextField("", text: $email, prompt: Text("Email").foregroundStyle(t.muted))
          .focused($typing)
          .keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
          .submitLabel(.continue).onSubmit(send)
          .font(.geist(16)).foregroundStyle(t.text)
          .padding(.horizontal, 20).frame(height: 50)
          .background(Capsule().fill(t.surf))
          .onChange(of: email) { _, _ in error = "" }
        Button(action: send) {
          Text(busy ? "Sending…" : "Continue").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 50).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        if !error.isEmpty { Text(error).css(14, lh: 1.4).foregroundStyle(t.again).multilineTextAlignment(.center).padding(.top, 2).padding(.horizontal, 4) }
        agree
      }
      .foregroundStyle(t.text)
      .padding(.top, 22).padding(.horizontal, 20).padding(.bottom, 34)
    }
    .background(t.bg)
    .ignoresSafeArea(.container)
  }

  private func authButton(_ label: String, logo: AnyView, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 10) { logo; Text(label).css(15, .semibold) }
        .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 50)
        .background(Capsule().fill(t.bg)).overlay(Capsule().strokeBorder(t.surf2, lineWidth: 1))
    }
    .buttonStyle(.press)
  }

  /// "By continuing, you agree to the Terms and Privacy Policy."
  private var agree: some View {
    var a = AttributedString("By continuing, you agree to the ")
    var terms = AttributedString("Terms"); terms.link = URL(string: "https://lucida.cards/terms"); terms.underlineStyle = .single
    var privacy = AttributedString("Privacy Policy"); privacy.link = URL(string: "https://lucida.cards/privacy"); privacy.underlineStyle = .single
    a += terms; a += AttributedString(" and "); a += privacy; a += AttributedString(".")
    return Text(a).css(12, lh: 1.5).foregroundStyle(t.muted).tint(t.muted).multilineTextAlignment(.center)
      .environment(\.openURL, OpenURLAction { url in UIApplication.shared.open(url); return .handled })
  }

  /// Apple's or Google's own sheet; closing it says nothing.
  private func provider(_ p: String) {
    guard !working else { return }
    working = true; error = ""
    Task {
      let err = await store.signIn(with: p)
      working = false
      if let err, !err.isEmpty { error = err }
    }
  }

  private func send() {
    let e = email.trimmingCharacters(in: .whitespaces)
    guard e.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else { error = "Type your email address."; return }
    guard !busy else { return }
    busy = true; error = ""
    Task {
      let err = await store.sendCode(e)
      busy = false
      if let err { error = err } else { store.signInStep = .code }
    }
  }
}

struct SignInCodeScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  /// The design screen starts with three digits typed (set here: a field writes its own text back over a later change).
  @State private var code: String
  init(start: String = "") { _code = State(initialValue: start) }
  @State private var busy = false
  @State private var error = ""
  @State private var resent = false
  @FocusState private var focused: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      RoundButton(icon: "back", label: "Use another email") { store.signInStep = .email }
      VStack(spacing: 8) {
        Text("Check your email").css(32, .semibold, ls: -0.03)
        (Text("Enter the 6-digit code we sent to ").foregroundStyle(t.muted) + Text(store.signInEmail.isEmpty ? "you@school.edu" : store.signInEmail).font(.geist(15, .medium)).foregroundStyle(t.text))
          .css(15, lh: 1.45)
      }
      .multilineTextAlignment(.center)
      .frame(maxWidth: .infinity)
      ZStack {
        let digits = Array(code).map(String.init) + Array(repeating: "", count: max(0, 6 - code.count))
        HStack(spacing: 0) {
          ForEach(0..<6, id: \.self) { i in
            Text(verbatim: digits[i]).css(22, .semibold)
              .frame(maxWidth: 50).frame(height: 58)
              .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
              .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(t.text, lineWidth: i == min(code.count, 5) && (focused || store.demo) ? 2 : 0))
            if i < 5 { Spacer(minLength: 6) }
          }
        }
        // One real field under the boxes, so typing, pasting, and "code from Mail" all work.
        TextField("", text: $code)
          .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($focused)
          .foregroundStyle(.clear).tint(.clear).frame(height: 58)
          .onChange(of: code) { _, v in
            let d = String(v.filter(\.isNumber).prefix(6))
            if d != v { code = d }
            error = ""
            if d.count == 6 { check(d) }
          }
          .accessibilityLabel("6-digit code")
      }
      .contentShape(Rectangle())
      .onTapGesture { focused = true }
      if !error.isEmpty { Text(error).css(14, lh: 1.4).foregroundStyle(t.again).multilineTextAlignment(.center).frame(maxWidth: .infinity) }
      Spacer(minLength: 0)
      VStack(spacing: 14) {
        Button { code.count < 6 ? (error = "Type the 6-digit code from the email.") : check(code) } label: {
          Text(busy ? "Checking…" : "Continue").css(16, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        Button {
          Task { resent = true; if let e = await store.sendCode(store.signInEmail) { error = e } }
        } label: { Text(resent ? "Sent. Check your email." : "Send a new code").css(15).foregroundStyle(t.muted) }
        .buttonStyle(.plain)
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, Screen.top(64)).padding(.horizontal, 20).padding(.bottom, 34)
    .background(t.bg)
    .ignoresSafeArea(.container)
    .onAppear { if !store.demo { DispatchQueue.main.async { focused = true } } }
  }

  private func check(_ digits: String) {
    guard !busy, !store.demo else { return }
    busy = true; error = ""
    Task {
      if let e = await store.verify(digits) { error = e; code = "" }
      busy = false
    }
  }
}

// ---------- the card wall ----------

/// Flashcards in four tilted columns, each drifting slowly up or down (the next one the other way); some turn over now
/// and then to show their backs, and a blank fills in where it is. With reduced motion it holds still.
struct CardWall: View {
  @Environment(\.accessibilityReduceMotion) private var still
  var cols = 4
  var w: CGFloat = 150, h: CGFloat = 100, gap: CGFloat = 10, r: CGFloat = 16, tilt: Double = -14, k: CGFloat = 150 / 264
  var secs: [Double] = [50, 60, 55, 65]
  /// Every third card turns, once every 28 seconds.
  var loop: Double = 28, every = 3
  private static let start = Date()

  var body: some View {
    let columns = (0..<cols).map { WallColumn(i: $0, k: k, loop: loop, every: every) }
    let set = CGFloat(6) * (h + gap), width = CGFloat(cols) * w + CGFloat(cols - 1) * gap
    Color.clear.overlay { TimelineView(.animation(paused: still)) { tl in
      let now = still ? 0 : tl.date.timeIntervalSince(CardWall.start)
      HStack(alignment: .top, spacing: gap) {
        ForEach(columns) { c in
          let d = secs[c.i % secs.count], up = c.i % 2 == 0, f = [0, 0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875][c.i % 8] / 6
          let p = ((now + (up ? f : 1 - f) * d).truncatingRemainder(dividingBy: d)) / d
          VStack(spacing: gap) {
            ForEach(Array((c.cards + c.cards).enumerated()), id: \.offset) { _, card in
              WallCard(card: card, now: now, w: w, h: h, r: r, k: k, loop: loop).zIndex(card.flips ? 1 : 0)
            }
          }
          .offset(y: -set * (up ? p : 1 - p))
        }
      }
      .frame(width: width, height: set, alignment: .top)
      .rotationEffect(.degrees(tilt))
    } }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .clipped()
    .background(LinearGradient(stops: [.init(color: Color(hex: 0x12141C), location: 0), .init(color: Color(hex: 0x0B0C12), location: 0.55), .init(color: Color(hex: 0x060709), location: 1)], startPoint: .top, endPoint: .bottom))
    .accessibilityHidden(true)
  }
}

private struct WallColumn: Identifiable {
  let i: Int
  let cards: [WallItem]
  var id: Int { i }
  init(i: Int, k: CGFloat, loop: Double, every: Int) {
    self.i = i
    let base = Generated.wallCards[i % 4], turn = 3 * (i / 4), col = Array(base[turn...] + base[..<turn])
    cards = col.enumerated().map { j, c in WallItem(i: i, j: j, deck: c[0], front: c[1], back: c[2], k: k, loop: loop, every: every) }
  }
}

private struct WallItem {
  let mesh: Mesh
  let audio: Bool, code: Bool, blank: Bool, flips: Bool
  let before: String, after: String
  let answer: String, sub: String, answerCode: Bool
  let size: CGFloat, answerSize: CGFloat, subSize: CGFloat
  /// Where in its loop this card starts (seconds).
  let offset: Double
  init(i: Int, j: Int, deck: String, front: String, back: String, k: CGFloat, loop: Double, every: Int) {
    mesh = Mesh.gen(deck, "vivid")
    audio = front == "♪"
    code = front.hasPrefix("`") && front.hasSuffix("`") && front.count > 1
    let s = code ? String(front.dropFirst().dropLast()) : front, parts = s.components(separatedBy: "{}")
    before = parts[0]; after = parts.count > 1 ? parts[1] : ""; blank = parts.count > 1
    answerCode = back.hasPrefix("`") && back.hasSuffix("`") && back.count > 1
    let b = (answerCode ? String(back.dropFirst().dropLast()) : back).components(separatedBy: "\n")
    answer = b[0]; sub = b.count > 1 ? b[1] : ""
    func size(_ t: String) -> CGFloat { ((t.count <= 12 ? 30 : t.count <= 26 ? 23 : 19) * k).rounded() }
    self.size = size(s); answerSize = size(answer); subSize = (16 * k).rounded()
    flips = !blank && ((i + j) % every == 0 || audio)
    offset = Double((i * 37 + j * 17) % 32) / 32 * loop
  }
}

private struct WallCard: View {
  let card: WallItem
  let now: Double
  let w: CGFloat, h: CGFloat, r: CGFloat, k: CGFloat, loop: Double

  var body: some View {
    // The loop: the card turns to its back at L − 6.4 s and turns back at L − 1.12 s; each turn takes half a second.
    let t = (now + card.offset).truncatingRemainder(dividingBy: loop), a = loop - 6.4, c = loop - 1.12
    let (scale, back) = card.flips ? WallCard.turn(t, a, c) : (1, false)
    let reveal = card.blank ? WallCard.reveal(t, a, c) : 0
    ZStack {
      MeshFill(mesh: card.mesh)
      Group { if back { backFace } else { front(reveal) } }
        .foregroundStyle(card.mesh.inkColor)
        .shadow(color: .black.opacity(card.mesh.shadow), radius: 7, y: 1)
        .padding((22 * k).rounded())
    }
    .frame(width: w, height: h)
    .clipShape(RoundedRectangle(cornerRadius: r, style: .continuous))
    .scaleEffect(x: scale, y: 1)
  }

  /// scaleX over a turn: down to 0 (ease in), then back up (ease out); the back shows between the two turns.
  static func turn(_ t: Double, _ a: Double, _ c: Double) -> (CGFloat, Bool) {
    func one(_ at: Double) -> CGFloat? {
      guard t >= at && t < at + 0.5 else { return nil }
      let x = t - at
      if x < 0.25 { let u = x / 0.25; return CGFloat(1 - u * u) }
      let u = (x - 0.25) / 0.25; return CGFloat(1 - (1 - u) * (1 - u))
    }
    let back = t >= a + 0.25 && t < c + 0.25
    return (one(a) ?? one(c) ?? 1, back)
  }
  static func reveal(_ t: Double, _ a: Double, _ c: Double) -> Double {
    if t < a { return 0 }
    if t < a + 0.5 { return (t - a) / 0.5 }
    if t < c { return 1 }
    if t < c + 0.5 { return 1 - (t - c) / 0.5 }
    return 0
  }

  @ViewBuilder private func front(_ reveal: Double) -> some View {
    if card.audio {
      HStack(spacing: (14 * k).rounded()) {
        Icon("play", (24 * k).rounded())
          .frame(width: (46 * k).rounded(), height: (46 * k).rounded())
          .background(Circle().fill(card.mesh.glass.color)).overlay(Circle().strokeBorder(card.mesh.glassLine.color, lineWidth: 1.5))
        HStack(spacing: max(2, (4 * k).rounded())) {
          ForEach([10, 20, 30, 16, 26, 12, 22, 14, 8], id: \.self) { b in
            RoundedRectangle(cornerRadius: 2).frame(width: max(2, (3 * k).rounded()), height: max(2, (CGFloat(b) * k).rounded())).opacity(0.85)
          }
        }
      }
    } else {
      let font: Font = card.code ? .mono(card.size, .medium) : .geist(card.size, .medium)
      if card.blank {
        FlowLayout(spacing: 0, lineSpacing: 0, alignment: .center) {
          if !card.before.isEmpty { Text(card.before).font(font).tracking(-0.02 * card.size) }
          Text(card.answer).font(font).tracking(-0.02 * card.size).opacity(reveal)
            .padding(.horizontal, card.size * 0.4)
            .background(Capsule().fill(card.mesh.glass.color))
            .padding(.horizontal, card.size * 0.1)
          if !card.after.isEmpty { Text(card.after).font(font).tracking(-0.02 * card.size) }
        }
      } else {
        Text(card.before).font(font).tracking(-0.02 * card.size).multilineTextAlignment(.center).lineSpacing(0)
      }
    }
  }

  private var backFace: some View {
    VStack(spacing: 4) {
      Text(card.answer).font(card.answerCode ? .mono(card.answerSize, .semibold) : .geist(card.answerSize, .semibold)).tracking(-0.02 * card.answerSize).multilineTextAlignment(.center)
      if !card.sub.isEmpty { Text(card.sub).font(.geist(card.subSize, .medium)).opacity(0.85) }
    }
  }
}

/// The Apple logo (fill, 24-unit box).
struct AppleLogo: View {
  var body: some View { SVGShapes(svg: Generated.apple, box: 24).accessibilityHidden(true) }
}
/// Google's four-color G (48-unit box).
struct GoogleLogo: View {
  var body: some View { SVGShapes(svg: Generated.google, box: 48).accessibilityHidden(true) }
}

/// Filled SVG paths in their own colors (fill="#…"), or the text color.
struct SVGShapes: View {
  @Environment(\.theme) private var t
  let svg: String
  let box: CGFloat
  var body: some View {
    Canvas { ctx, size in
      ctx.scaleBy(x: size.width / box, y: size.height / box)
      let re = try! NSRegularExpression(pattern: "<path([^>]*)\\sd=\"([^\"]+)\"")
      let ns = svg as NSString
      for m in re.matches(in: svg, range: NSRange(location: 0, length: ns.length)) {
        let attrs = ns.substring(with: m.range(at: 1)), d = ns.substring(with: m.range(at: 2))
        let fill = attrs.range(of: ##"fill="#([0-9A-Fa-f]{6})""##, options: .regularExpression).map { String(attrs[$0].dropFirst(7).dropLast()) }
        let p = CGMutablePath(); SVG.addPath(d, to: p)
        ctx.fill(Path(p), with: .color(fill.map { Color(hex: UInt32($0, radix: 16) ?? 0) } ?? t.text))
      }
    }
  }
}
