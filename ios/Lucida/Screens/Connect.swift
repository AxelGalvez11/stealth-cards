// iPhone · Connect AI (PhoneConnect): your personal MCP link on the Apricot card, and which AI apps use it.
import SwiftUI

struct ConnectVM {
  var url = ""
  var short = ""
  var clients: [String: Bool] = [:]
}

extension Store {
  func connect() -> ConnectVM {
    if demo { return ConnectVM(url: "https://app.lucida.cards/mcp/lk_5b1f0c6e9a2d4b7f8e3a1c0d9b8a7f6e2Hq9xWrT4kLm1ZpVb8sNc3Yd7Ga0uEfJ", short: "https://app.lucida.cards/mcp/lk_5b1f0c6e…", clients: ["claude": true, "openai": true, "cursor": false, "mcp": false]) }
    let url = API.base.absoluteString + (lib.ai.key.map { "/mcp/" + $0 } ?? "/mcp"), names = Array(lib.ai.clients.keys)
    let known = ["Claude", "ChatGPT", "Cursor"]
    return ConnectVM(url: url, short: String(url.prefix(40)) + (url.count > 40 ? "…" : ""),
                     clients: ["claude": names.contains("Claude"), "openai": names.contains("ChatGPT"), "cursor": names.contains("Cursor"), "mcp": names.contains { !known.contains($0) }])
  }
}

struct ConnectScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @State private var copied = false

  var body: some View {
    let c = store.connect(), hero = Mesh.palette("Apricot")
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        PageTitle("Connect AI")
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
              copied = true
            } label: {
              Text(copied ? "Copied" : "Copy link").css(15, .semibold).foregroundStyle(Color.black).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(Color.white))
            }
            .buttonStyle(.press)
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
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
          }
        }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .ignoresSafeArea()
  }
}

/// An AI app's logo, in its own colors (or the text color, or Cursor's ink).
struct LogoView: View {
  @Environment(\.theme) private var t
  let name: String
  let size: CGFloat
  var body: some View {
    let logo = Generated.logos[name]!, box = logo.box, w = box[2], h = box[3]
    let width = name == "cursor" ? (size * 0.88).rounded() : size
    Canvas { ctx, sz in
      let k = min(sz.width / w, sz.height / h)
      ctx.translateBy(x: (sz.width - w * k) / 2, y: (sz.height - h * k) / 2)
      ctx.scaleBy(x: k, y: k); ctx.translateBy(x: -box[0], y: -box[1])
      for p in logo.paths {
        let path = CGMutablePath(); SVG.addPath(p.d, to: path)
        let color: Color = p.fill == "text" ? t.text : p.fill == "cursor" ? Color(hex: t.dark ? 0xEDECEC : 0x26251E) : Color(hex: UInt32(p.fill.dropFirst(), radix: 16) ?? 0)
        ctx.fill(Path(path), with: .color(color), style: FillStyle(eoFill: p.evenOdd))
      }
    }
    .frame(width: width, height: size)
    .accessibilityHidden(true)
  }
}
