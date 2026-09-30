// The study network's shared pieces, as the canvas draws them (design/build.mjs "Study network: shared pieces"): a
// shared deck's cover tile (NET_TILE), someone's round picture (PERSON_AV), a teacher's or school's check (VERIFIED),
// the loading look, and the gray boxes that say there's nothing here.
import SwiftUI

/// A shared deck as a tile (NET_JS netDeck): its gradient (or photo), a badge (Checked, Pinned, a school's name, or on
/// your profile Link only), its name, saves, and cards.
struct TileVM: Identifiable {
  var id = "", name = "", url = ""
  var mesh: Mesh
  var photo: String? = nil
  var stars = "", cardsLine = ""
  var badge = "", badgeShield = false
  var owner: NetPerson? = nil
  var pinned = false
  init(_ d: NetDeck, pinned: Bool? = nil) {
    let pin = pinned ?? d.pinned
    id = d.id; name = d.name; url = d.url; self.pinned = pin; owner = d.owner
    mesh = Mesh.deck(seed: d.cover.seed ?? (d.name.isEmpty ? "Lucida" : d.name), round: d.cover.round, style: d.cover.style ?? "mix")
    photo = d.cover.image.flatMap { $0 == "mock" || $0.isEmpty ? nil : $0 }
    let school = d.owner.map { $0.kind == "school" || $0.verified == "school" } ?? false
    badge = d.checked != nil ? "Checked" : school ? d.owner?.name ?? "" : pin ? "Pinned" : ""
    badgeShield = d.checked != nil || d.owner?.kind == "school"
    stars = NetFmt.k(d.stars)
    cardsLine = NetFmt.k(d.cards) + (d.cards == 1 ? " card" : " cards")
  }
}

/// NET_TILE: the tile, `height` tall, the name `nameSize` (18 on the iPhone).
struct NetTile: View {
  let d: TileVM
  let height: CGFloat
  var nameSize: CGFloat = 18
  var body: some View {
    ZStack(alignment: .topLeading) {
      MeshFill(mesh: d.mesh)
      if let p = d.photo {
        FillPhoto(url: API.media(p))
        LinearGradient(stops: [.init(color: .black.opacity(0), location: 0.4), .init(color: .black.opacity(0.55), location: 1)], startPoint: .top, endPoint: .bottom)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 0) {
          if !d.badge.isEmpty {
            HStack(spacing: 5) {
              if d.badgeShield { Icon("shield", 12, 2) }
              Text(d.badge).css(11, .semibold).lineLimit(1)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 9).frame(height: 24)
            .background(Capsule().fill(Color.black.opacity(0.28)))
          }
        }
        .frame(minHeight: 24, alignment: .leading)
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 4) {
          LabelText(text: Rich.nsText([.init(t: d.name, m: "")], size: nameSize, weight: .semibold, ls: -0.02, lh: 1.1, color: UIColor(d.mesh.inkColor), dark: false), lines: 2, clamp: true)
          HStack(spacing: 5) {
            Icon("star", 12, 2)
            Text(d.stars).css(12)
            Text(d.cardsLine).css(12).padding(.leading, 6)
          }
          .line(12)
          .lineLimit(1)
          .opacity(0.88)
        }
        .shadow(color: .black.opacity(d.mesh.shadow), radius: d.mesh.shadow > 0 ? 7 : 0, x: 0, y: d.mesh.shadow > 0 ? 1 : 0)
      }
      .foregroundStyle(d.mesh.inkColor)
      .padding(.horizontal, 18).padding(.vertical, 16)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .frame(height: height)
    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([d.name, d.badge, d.stars + " saves", d.cardsLine].filter { !$0.isEmpty }.joined(separator: ", "))
  }
}

/// Words that may wrap, set like the browser sets them: its line breaks (no lone last word moved down), and each line
/// exactly `lh` times the size (normal: the browser's own, normalLine). `parts` can have more than one weight.
struct CSSText: View {
  var parts: [(String, Font.Weight)]
  var size: CGFloat
  var lh: CGFloat? = nil
  var color: Color
  var ls: CGFloat = 0
  var lines = 0
  var align: NSTextAlignment = .left
  /// Struck through (a change's old words).
  var strike = false
  init(_ text: String, _ size: CGFloat, _ weight: Font.Weight = .regular, lh: CGFloat? = nil, color: Color, ls: CGFloat = 0, lines: Int = 0, align: NSTextAlignment = .left, strike: Bool = false) {
    parts = [(text, weight)]; self.size = size; self.lh = lh; self.color = color; self.ls = ls; self.lines = lines; self.align = align; self.strike = strike
  }
  init(parts: [(String, Font.Weight)], _ size: CGFloat, lh: CGFloat? = nil, color: Color) { self.parts = parts; self.size = size; self.lh = lh; self.color = color }
  var body: some View {
    let L = size * (lh ?? normalLine(size) / size), shift = (L - size * GEIST_LINE) / 2
    let para = NSMutableParagraphStyle()
    para.minimumLineHeight = L; para.maximumLineHeight = L; para.lineBreakMode = .byWordWrapping; para.lineBreakStrategy = []; para.alignment = align
    let out = NSMutableAttributedString()
    for (t0, w) in parts {
      // A browser can break a line after a hyphen inside a word (fructose-|2,6-bisphosphate); UIKit doesn't, unless a
      // zero-width space says it may.
      let t = t0.replacingOccurrences(of: "(?<=\\p{L})-(?=[\\p{L}\\p{N}])", with: "-\u{200B}", options: .regularExpression)
      var a: [NSAttributedString.Key: Any] = [.paragraphStyle: para, .foregroundColor: UIColor(color), .baselineOffset: shift, .font: Rich.geist(w, size)]
      // A kern of 0 would switch off the font's own kerning, which browsers keep.
      if ls != 0 { a[.kern] = ls * size }
      if strike { a[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
      out.append(NSAttributedString(string: t, attributes: a))
    }
    return LabelText(text: out, lines: lines, clamp: lines > 0, exact: true)
  }
}

/// PERSON_AV: someone's photo, or their initial on their color (the six colors of your own picture in Settings).
struct PersonAvatar: View {
  let p: NetPerson
  let size: CGFloat
  var body: some View {
    let initial = String((p.name.trimmingCharacters(in: .whitespacesAndNewlines).first.map(String.init) ?? "?")).uppercased()
    Avatar(size: size, initial: initial, color: p.color, pic: p.avatar.flatMap { $0.isEmpty ? nil : AvatarPic.photo(API.media($0)) } ?? .color)
  }
}

/// VERIFIED: the small check a verified teacher or school has next to their name.
struct VerifiedMark: View {
  let p: NetPerson?
  var body: some View {
    if let p, !p.verified.isEmpty { Icon("shield", 14, 2.2).foregroundStyle(Color(hex: 0x3E63DD)).accessibilityLabel("Verified") }
  }
}

/// NET_LOADING: soft gray blocks where the page's parts will be (a 280-wide title, then `rows` blocks 120 tall).
struct NetLoading: View {
  @Environment(\.theme) private var t
  var rows = 3
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.surf).frame(width: 280, height: 34)
      ForEach(0..<rows, id: \.self) { _ in RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf).frame(height: 120) }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading")
  }
}

/// A gray box that says why there's nothing here (on the iPhone: 40 by 20 inside, 22 round, 15px gray words).
struct NetNote: View {
  @Environment(\.theme) private var t
  let text: String
  var radius: CGFloat = 22
  var body: some View {
    CSSText(text, 15, color: t.muted, align: .center)
      .frame(maxWidth: .infinity).padding(.horizontal, 20).padding(.vertical, 40)
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(t.surf))
  }
}

/// NET_MISSING: not there (the owner stopped sharing it, or a mistyped address), and Discover decks.
struct NetMissing: View {
  @Environment(\.theme) private var t
  let title: String, line: String
  let discover: () -> Void
  var body: some View {
    VStack(spacing: 10) {
      Text(title).css(20, .semibold).line(20)
      Text(line).css(14).foregroundStyle(t.muted).line(14)
      Button(action: discover) {
        Text("Discover decks").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
      .padding(.top, 6)
    }
    .foregroundStyle(t.text)
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24).padding(.vertical, 64)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }
}

/// A person's name under a tile (Discover, Saved): their picture, their name, and their check.
struct OwnerLine: View {
  @Environment(\.theme) private var t
  let p: NetPerson
  let open: () -> Void
  var body: some View {
    Button(action: open) {
      HStack(spacing: 6) {
        PersonAvatar(p: p, size: 20)
        Text(p.name).css(12, .semibold).lineLimit(1)
        VerifiedMark(p: p)
      }
      .foregroundStyle(t.text)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityLabel(p.name)
  }
}

/// QUIET_BTN: a text button with no background, last among a page's small actions ("Report"): the page's muted words,
/// `height` tall, with 14 points before it.
struct QuietButton: View {
  @Environment(\.theme) private var t
  let label: String
  var height: CGFloat = 44
  var size: CGFloat = 15
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(label).css(size, .medium).foregroundStyle(t.muted).lineLimit(1).fixedSize().line(size)
        .padding(.leading, 14).frame(height: height)
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
}
