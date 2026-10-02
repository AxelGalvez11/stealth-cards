// iPhone · Connect AI (PhoneConnect): Lucida's MCP address on the Apricot card (https://app.lucida.cards/mcp, with no secret in it: an AI app
// signs in to Lucida there), a quiet line that copies your private link for the apps that can't sign in, which AI apps use Lucida, and the
// apps you allowed (each signed in to Lucida, with Disconnect). It's a page inside Settings (its row there says Connect AI): a back button to
// Settings and no tab bar, like Settings › Theme.
import SwiftUI

struct ConnectVM {
  /// The address every app is given, and your own link (online, for the apps that can't sign in; it's never shown).
  var url = "", privateURL = ""
  var clients: [String: Bool] = [:]
}

extension Store {
  func connect() -> ConnectVM {
    if demo { return ConnectVM(url: "https://app.lucida.cards/mcp", privateURL: "https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ", clients: ["claude": true, "openai": true, "cursor": false, "mcp": false]) }
    // (The AI apps that called Lucida, and the ones you allowed to sign in, like the web's db.ai().)
    let base = API.base.absoluteString, names = Array(lib.ai.clients.keys) + (netApps()?.value?.apps.map(\.name) ?? [])
    let known = ["Claude", "ChatGPT", "Cursor"]
    return ConnectVM(url: base + "/mcp", privateURL: lib.ai.key.map { base + "/mcp/" + $0 } ?? "",
                     clients: ["claude": names.contains("Claude"), "openai": names.contains("ChatGPT"), "cursor": names.contains("Cursor"), "mcp": names.contains { !known.contains($0) }])
  }
}

struct ConnectScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// What was copied last: the address ("link") or your private link ("private").
  @State private var copied = ""
  @State private var err = ""

  var body: some View {
    let c = store.connect(), hero = Mesh.palette("Apricot")
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("Connect AI").css(17, .semibold).frame(maxWidth: .infinity)
          Color.clear.frame(width: 44, height: 44)
        }
        Text("Make cards from any chat: text, fill-in-the-blank, images, and audio.").css(15, lh: 1.45).foregroundStyle(t.muted)
        MeshCard(mesh: hero, radius: 32) {
          VStack(alignment: .leading, spacing: 12) {
            Text("YOUR MCP LINK").css(12, .semibold, ls: 0.06).opacity(0.8)
            // The link runs on past the pill to the card's edge, like the canvas. It's drawn over a hidden copy so its
            // full length doesn't widen the page.
            Text(c.url).css(14, mono: true).lineLimit(1).hidden()
              .frame(maxWidth: .infinity, alignment: .leading)
              .overlay(alignment: .leading) { Text(c.url).css(14, mono: true).lineLimit(1).fixedSize() }
              .padding(.horizontal, 16).padding(.vertical, 14)
              .background(Capsule().fill(hero.glass.color))
              .overlay(Capsule().strokeBorder(hero.glassLine.color, lineWidth: 1.5))
            Button {
              UIPasteboard.general.string = c.url
              copied = "link"
            } label: {
              // "Copied" slides in where "Copy link" was, like a toast.
              ZStack { Text(copied == "link" ? "Copied" : "Copy link").css(15, .semibold).foregroundStyle(Color.black).id(copied == "link").popTransition() }
                .animation(Motion.pop, value: copied)
                .frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(Color.white))
            }
            .buttonStyle(.press)
            // Your own link, for the apps that can't sign in: copied, never shown.
            if !c.privateURL.isEmpty {
              Button {
                UIPasteboard.general.string = c.privateURL
                copied = "private"
              } label: {
                Text(copied == "private" ? "Private link copied" : "Private link for apps that can’t sign in").css(13, .medium).opacity(0.8)
                  .frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
              }
              .buttonStyle(.plain)
            }
          }
          .padding(20)
        }
        VStack(spacing: 0) {
          ForEach([("claude", "Claude"), ("openai", "ChatGPT"), ("cursor", "Cursor"), ("mcp", "Any MCP app")], id: \.0) { id, name in
            let on = c.clients[id] ?? false
            HStack(spacing: 12) {
              LogoView(name: id, size: 20).frame(width: 38, height: 38).background(Circle().fill(t.surf))
              Text(name).css(16, .medium).frame(maxWidth: .infinity, alignment: .leading)
              Text(on ? "Connected" : "Connect").css(13, .semibold).foregroundStyle(on ? t.good : t.muted)
            }
            .frame(minHeight: 60)
            // The board's row is 60 tall and then its 1px line (a border adds to min-height).
            .padding(.bottom, 1)
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
          }
        }
        appsAllowed
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    .debugScroll()
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
  }

  // ---------- the apps you allowed ----------
  /// Apps you allowed: each signed in to Lucida (not with your link), with when, and Disconnect.
  private var appsAllowed: some View {
    let list = store.netApps()?.value?.apps ?? []
    return VStack(alignment: .leading, spacing: 4) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Apps you allowed").css(15, .semibold).line(15)
        CSSText("Each one signed in to Lucida and can use your decks.", 13, color: t.muted)
      }
      .padding(.bottom, 8)
      ForEach(list) { a in
        HStack(spacing: 12) {
          LogoView(name: logoName(a.name), size: 22).frame(width: 38, height: 38).background(Circle().fill(t.bg))
          VStack(alignment: .leading, spacing: 2) {
            Text(a.name).css(15, .semibold).lineLimit(1).line(15)
            Text(sub(a)).css(12).foregroundStyle(t.muted).lineLimit(1).line(12)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          SmallButton(label: "Disconnect", bg: t.bg) { nav.ask("Disconnect \(a.name)?", line: "It can’t use your decks until you connect it again.", action: "Disconnect") { disconnect(a) } }
        }
        .frame(minHeight: 58)
        .padding(.top, 1)
        .overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) }
        .accessibilityElement(children: .contain)
      }
      if list.isEmpty && store.netApps() != nil { none }
      if !err.isEmpty { CSSText(err, 13, lh: 1.4, color: t.again).padding(.top, 6) }
    }
    .padding(.horizontal, 18).padding(.vertical, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  /// "None yet. Add Lucida to your AI app and sign in: how." with how opening the page that says how (the sentence wraps the way a
  /// browser wraps it, so the link starts the next line when it doesn't fit).
  private var none: some View {
    VStack(alignment: .leading, spacing: 0) {
      CSSText("None yet. Add Lucida to your AI app and sign in:", 14, lh: 1.4, color: t.muted)
      Button { nav.open(URL(string: "https://lucida.cards/connect")) } label: {
        HStack(spacing: 0) { Text("how").css(14, lh: 1.4).foregroundStyle(t.text).underline(); Text(".").css(14, lh: 1.4).foregroundStyle(t.muted) }
      }
      .buttonStyle(.plain)
      .accessibilityLabel("how").accessibilityAddTraits(.isLink)
    }
    .padding(.top, 10).padding(.bottom, 2)
  }

  private func logoName(_ name: String) -> String {
    let n = name.lowercased()
    return n.hasPrefix("claude") ? "claude" : n.contains("chatgpt") || n.contains("openai") ? "openai" : n.contains("cursor") ? "cursor" : "mcp"
  }
  /// "claude.ai · Connected Sep 12 · Used Sep 29".
  private func sub(_ a: ConnectedApp) -> String {
    let day = { (iso: String) -> String in
      guard let d = NetFmt.date(iso) else { return "" }
      var cal = Calendar(identifier: .gregorian)
      // (The design screens always show the canvas's own days.)
      if store.demo { cal.timeZone = TimeZone(identifier: "UTC")! }
      return NetFmt.months3[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))"
    }
    let c = day(a.connected), u = a.lastUsed.isEmpty ? "" : day(a.lastUsed)
    return [a.host, c.isEmpty ? "" : "Connected " + c, !u.isEmpty && u != c ? "Used " + u : ""].filter { !$0.isEmpty }.joined(separator: " · ")
  }

  private func disconnect(_ a: ConnectedApp) {
    err = ""
    Task {
      do { try await store.disconnectApp(a.id) }
      catch { err = error.localizedDescription.nilIfEmpty ?? "That didn’t work. Try again." }
    }
  }
}

/// An AI app's logo, in its own colors (or the text color, or Cursor's ink).
struct LogoView: View {
  @Environment(\.theme) private var t
  let name: String
  let size: CGFloat
  /// Cursor's ink when it sits on something else (like a black button); its own by default.
  var ink: Color? = nil
  var body: some View {
    let logo = Generated.logos[name]!, box = logo.box, w = box[2], h = box[3]
    let width = name == "cursor" ? (size * 0.88).rounded() : size
    Canvas { ctx, sz in
      let k = min(sz.width / w, sz.height / h)
      ctx.translateBy(x: (sz.width - w * k) / 2, y: (sz.height - h * k) / 2)
      ctx.scaleBy(x: k, y: k); ctx.translateBy(x: -box[0], y: -box[1])
      for p in logo.paths {
        let path = CGMutablePath(); SVG.addPath(p.d, to: path)
        let color: Color = p.fill == "text" ? t.text : p.fill == "cursor" ? ink ?? Color(hex: t.dark ? 0xEDECEC : 0x26251E) : Color(hex: UInt32(p.fill.dropFirst(), radix: 16) ?? 0)
        ctx.fill(Path(path), with: .color(color), style: FillStyle(eoFill: p.evenOdd))
      }
    }
    .frame(width: width, height: size)
    .accessibilityHidden(true)
  }
}
