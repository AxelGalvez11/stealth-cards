// iPhone · Settings › Theme (PhoneThemePicker, PhoneThemePickerFree) and a theme's page (PhoneTheme): every theme as a small
// picture of it, and each one's own page, where you use it (Go Pro on Free). Themes are Pro; Lucida's own look is for
// everyone. A theme changes four things only: the flashcard, the study background, the deck covers, and your profile
// picture. The pictures are the web app's own theme code at work (ThemeRender.swift).
import SwiftUI

/// The words on a theme's sample card (PhoneTheme's SHEET_Q and SHEET_A).
private let SHEET_Q = "What does the electron transport chain pump across the inner membrane?"
private let SHEET_A = "Protons (H⁺), from the matrix into the intermembrane space."

extension ThemeJob {
  /// Settings › Theme's tile for a theme: its background, two covers, a card, and your picture.
  static func tile(_ theme: String, ch: String) -> ThemeJob { ThemeJob(theme: theme, kind: "tile", fields: ["w": 110, "h": 146, "r": 11, "ch": ch]) }
  /// A theme's page: the study screen with a card on it.
  static func scene(_ theme: String, base: RGBA) -> ThemeJob {
    ThemeJob(theme: theme, kind: "scene", fields: ["w": 350, "h": 380, "r": 28, "cw": 282, "ch": 188, "q": SHEET_Q, "fs": 18, "cr": 22, "cpad": "24px 26px", "base": base.css])
  }
  /// One side of a flashcard on a theme's page.
  static func sheetCard(_ theme: String, back: Bool) -> ThemeJob {
    ThemeJob(theme: theme, kind: "card", fields: ["w": 350, "h": 172, "r": 18, "side": back ? "back" : "front", "q": SHEET_Q, "a": back ? SHEET_A : "", "fs": 18, "cpad": "20px 22px", "pad": 48])
  }
  /// A deck's cover on a theme's page, with its name on it.
  static func sheetCover(_ theme: String, deck: [String: Any]) -> ThemeJob {
    ThemeJob(theme: theme, kind: "pagecover", fields: ["d": deck, "w": 110, "h": 146, "r": 14, "cr": 16, "fs": 16, "pad": 48])
  }
}

extension Board {
  /// A Theme board: Theme<Board>ReviewPhone or Theme<Board>ProfilePhone (its theme's key, and which screen it is).
  static func themeBoard(_ name: String) -> (key: String, screen: String)? {
    for t in Generated.themes where !t.board.isEmpty {
      if name == "Theme" + t.board + "ReviewPhone" { return (t.key, "review") }
      if name == "Theme" + t.board + "ProfilePhone" { return (t.key, "settings") }
    }
    return nil
  }
}

/// A deck as a theme draws its cover (db.js deckRow's seed, name, round, and tags).
struct ThemeDeck {
  var name: String, seed: String, round = 0, tags: [String] = []
  var dict: [String: Any] { ["name": name, "seed": seed, "round": round, "tags": tags] }
}

struct ThemePickerScreen: View {
  /// The App Store's offers, watched, so the price line on Free shows once they arrive.
  @ObservedObject var shop: Shop
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject private var art = ThemeArt.shared

  var body: some View {
    let locked = !store.isPro, cur = locked ? "lucida" : store.themePicked
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("Theme").css(17, .semibold).frame(maxWidth: .infinity)
          Color.clear.frame(width: 44, height: 44)
        }
        WebText(text: "Changes your deck covers, flashcards, study background, and profile picture.", size: 14, lh: 1.45, color: t.muted)
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .leading), count: 3), spacing: 18) {
          ForEach(Generated.themes, id: \.key) { x in tile(x.key, x.short, on: x.key == cur, locked: locked && x.key != "lucida") }
        }
        .accessibilityElement(children: .contain).accessibilityLabel("Themes")
        if locked { upgrade } else { onProfile }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    .debugScroll()
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
  }

  /// A theme's tile (110 x 146): its picture, the Pro badge, and under it its name and a tick, an empty circle, or a lock.
  private func tile(_ key: String, _ name: String, on: Bool, locked: Bool) -> some View {
    let ringOff = t.dark ? Color(hex: 0x5A5A5E) : Color(hex: 0xCFCFCF)
    return Button { nav.push(.theme(key)) } label: {
      VStack(alignment: .leading, spacing: 7) {
        ZStack(alignment: .bottomLeading) {
          if key == "lucida" { LucidaTile() }
          else { ThemeTilePicture(key: key) }
          if key != "lucida" { proPill.padding(.leading, 5).padding(.bottom, 5) }
        }
        .frame(width: 110, height: 146)
        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay {
          if on { RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(t.text, lineWidth: 2).padding(-3) }
          else { RoundedRectangle(cornerRadius: 11.5, style: .continuous).stroke(t.line, lineWidth: 1).padding(-0.5) }
        }
        HStack(spacing: 4) {
          Text(name).css(11.5, .semibold).lineLimit(1).truncationMode(.tail)
          Spacer(minLength: 0)
          if on { Icon("check", 9, 2.6).foregroundStyle(t.invText).frame(width: 14, height: 14).background(Circle().fill(t.inv)) }
          else if locked { Icon("lock", 14, 2).foregroundStyle(t.muted) }
          else { Circle().strokeBorder(ringOff, lineWidth: 1.5).frame(width: 14, height: 14) }
        }
        .frame(width: 110)
      }
    }
    .buttonStyle(.press)
    .accessibilityLabel(name)
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  private var proPill: some View {
    Text("Pro").css(10, .bold).foregroundStyle(.white).padding(.horizontal, 7).frame(height: 17).background(Capsule().fill(.black))
  }

  /// On Free: themes are part of Pro, with Go Pro.
  private var upgrade: some View {
    HStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 8) { Text("Themes are part of Pro").css(15, .semibold); ProBadge() }
        // (What a year comes to a month is the App Store's own price, divided; the canvas shows its sample.)
        let line = store.demo ? "Yearly works out to $4.17 a month. Cancel anytime." : shop.yearlyLine
        if !line.isEmpty { WebText(text: line, size: 13, lh: 1.4, color: t.muted) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Button { nav.goPro() } label: {
        Text("Go Pro").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .padding(16)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  /// On Pro: whether people who visit your profile see your theme.
  private var onProfile: some View {
    let on = store.demo ? store.props.themeProfile : store.settings.themeProfile
    return HStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Show my theme on my profile").css(15, .semibold)
        WebText(text: "People who visit see your decks the way you do.", size: 13, lh: 1.4, color: t.muted)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Toggle48(on: on, label: "Show my theme on my profile") { store.setSetting(["themeProfile": !on]) }
    }
    .padding(.horizontal, 16).padding(.vertical, 14)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }
}

/// A theme's tile picture (until it's kept, a gray box).
struct ThemeTilePicture: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  let key: String
  var body: some View {
    let _ = art.tick
    if let p = art.picture(.tile(key, ch: store.avatarLetter)) { Image(uiImage: p.image).resizable().frame(width: 110, height: 146).themeMark("tile", key) }
    else { t.surf }
  }
}

/// Lucida's own tile (luTile): a soft gray, two gradient covers, a white card, and your color's circle.
struct LucidaTile: View {
  @EnvironmentObject private var store: Store
  var body: some View {
    let W = 110.0, H = 146.0, k = W / 208, kv = H / 220
    func px(_ n: Double) -> CGFloat { (n * k).rounded() }
    func py(_ n: Double) -> CGFloat { (n * kv).rounded() }
    let cw = px(76), ch = (cw * 97 / 76).rounded(), fw = px(124), fh = (fw * 80 / 124).rounded(), av = px(34)
    return ZStack(alignment: .topLeading) {
      CSSLinearGradient(angle: 160, stops: [(RGBA(0xEEEEF2), 0), (RGBA(0xDCDDE3), 1)])
      MeshFill(mesh: .palette("Iris")).frame(width: cw, height: ch).clipShape(RoundedRectangle(cornerRadius: px(12), style: .continuous)).offset(x: px(16), y: py(24))
      MeshFill(mesh: .palette("Apricot")).frame(width: cw, height: ch).clipShape(RoundedRectangle(cornerRadius: px(12), style: .continuous)).rotationEffect(.degrees(7)).offset(x: px(60), y: py(40))
      Text("Mitochondria make…").css(max(8, px(12)), .semibold, ls: -0.025, lh: 1.2).foregroundStyle(.black)
        .padding(.horizontal, px(12)).padding(.vertical, px(9))
        .frame(width: fw, height: fh, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: px(12), style: .continuous).fill(.white)
          .shadow(color: .black.opacity(0.04), radius: 1, y: 1).shadow(color: .black.opacity(0.06), radius: 12, y: 8))
        .offset(x: W - px(14) - fw, y: H - py(16) - fh)
      Avatar(size: av, initial: store.avatarInitial, color: store.avatarColor).offset(x: W - px(14) - av, y: px(14))
    }
    .frame(width: W, height: H, alignment: .topLeading)
  }
}

// ---------- a theme's page ----------
struct ThemePageScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject private var art = ThemeArt.shared
  let key: String

  var body: some View {
    let info = Generated.themes.first { $0.key == key } ?? Generated.themes[0]
    let lucida = key == "lucida", pro = !store.isPro
    let locked = pro && !lucida, inUse = (pro ? "lucida" : store.themePicked) == key
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 12) { RoundButton(icon: "back", label: "Theme") { nav.back() }; Spacer(minLength: 0) }
        HStack(spacing: 10) {
          Text(info.name).css(28, .bold, ls: -0.03).accessibilityAddTraits(.isHeader)
          if !lucida { ProBadge() }
        }
        button(locked: locked, inUse: inUse)
        scene(lucida)
        Eyebrow(text: "Deck covers", size: 12)
        covers(lucida)
        Eyebrow(text: "Flashcard, front and back", size: 12)
        VStack(spacing: 10) { card(lucida, back: false); card(lucida, back: true) }
        Eyebrow(text: "Profile picture", size: 12)
        HStack(spacing: 24) { ForEach([84, 56, 36, 28], id: \.self) { avatar($0, lucida) } }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    .debugScroll()
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
  }

  // Use this theme, In use, or Go Pro (on Free).
  @ViewBuilder private func button(locked: Bool, inUse: Bool) -> some View {
    if locked {
      Button { nav.goPro() } label: {
        HStack(spacing: 8) { Icon("lock", 15, 2.2); Text("Go Pro").css(15, .semibold) }
          .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    } else if inUse {
      HStack(spacing: 8) { Icon("check", 16, 2.4); Text("In use").css(15, .semibold) }
        .frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
        .accessibilityElement(children: .combine)
    } else {
      Button { store.setSetting(["theme": key]); if key != "lucida" { ThemeArt.shared.warm(key, store) } } label: {
        Text("Use this theme").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
  }

  /// The study screen with a card on it (sheetScene: 350 x 380, its card 282 x 188).
  @ViewBuilder private func scene(_ lucida: Bool) -> some View {
    ZStack {
      if lucida {
        ZStack { MeshFill(mesh: .palette("Iris")); Color.white.opacity(0.55) }
        LucidaCard(fs: 18, pad: EdgeInsets(top: 28, leading: 30, bottom: 28, trailing: 30), back: false).frame(width: 282, height: 188)
      } else { ThemePictureBox(job: .scene(key, base: Theme(dark: false).colors.bg), size: CGSize(width: 350, height: 380)) }
    }
    .frame(width: 350, height: 380)
    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
  }

  /// Your first decks, in this theme's covers (a new library borrows the samples' names).
  private var decks: [ThemeDeck] {
    let own = store.libraryDecks().map(\.look)
    let samples = ["Cell Biology", "Japanese N4", "Organic Chemistry", "US History"].map { ThemeDeck(name: $0, seed: $0) }
    return Array((own + samples).prefix(3))
  }

  private func covers(_ lucida: Bool) -> some View {
    HStack(spacing: 10) {
      ForEach(Array(decks.enumerated()), id: \.offset) { _, d in
        if lucida {
          MeshCard(mesh: Mesh.deck(seed: d.seed), radius: 14) {
            Text(d.name).css(14, .semibold, ls: -0.015, lh: 1.12).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading).padding(11)
          }
          .frame(width: 110, height: 146)
        } else { ThemePictureBox(job: .sheetCover(key, deck: d.dict), size: CGSize(width: 110, height: 146)) }
      }
    }
  }

  private func card(_ lucida: Bool, back: Bool) -> some View {
    ZStack {
      if lucida { LucidaCard(fs: 17, pad: EdgeInsets(top: 20, leading: 22, bottom: 20, trailing: 22), back: back) }
      else { ThemePictureBox(job: .sheetCard(key, back: back), size: CGSize(width: 350, height: 172)) }
    }
    .frame(width: 350, height: 172)
  }

  private func avatar(_ s: Int, _ lucida: Bool) -> some View {
    ZStack {
      if lucida { Avatar(size: CGFloat(s), initial: store.avatarInitial, color: store.avatarColor) }
      else { ThemePictureBox(job: .avatar(key, size: s, ch: store.avatarLetter, photo: false), size: CGSize(width: s, height: s)) }
    }
    .frame(width: CGFloat(s), height: CGFloat(s))
  }
}

/// A picture that fills a box of a size, reaching past it by its padding (a shadow), and a gray box until it's kept.
struct ThemePictureBox: View {
  @Environment(\.theme) private var t
  @ObservedObject private var art = ThemeArt.shared
  let job: ThemeJob
  let size: CGSize
  var body: some View {
    let _ = art.tick
    Color.clear.frame(width: size.width, height: size.height)
      .overlay(alignment: .topLeading) { if let p = art.picture(job) { p.placed.themeMark("page-" + job.kind, job.theme) } }
  }
}

/// Lucida's own flashcard on a theme's page (luCard): white, with a soft shadow; the back shows the question small, then the answer.
struct LucidaCard: View {
  @Environment(\.theme) private var t
  let fs: CGFloat
  let pad: EdgeInsets
  let back: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if back {
        Text(SHEET_Q).css((fs * 0.5).rounded(), lh: 1.35).foregroundStyle(Color(hex: 0x666666))
        Text(SHEET_A).css(fs, .semibold, ls: -0.02, lh: 1.2)
      } else { Text(SHEET_Q).css(fs, .semibold, ls: -0.02, lh: 1.2) }
    }
    .foregroundStyle(.black)
    .padding(pad)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(.white)
      .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.black.opacity(0.06), lineWidth: 1))
      .boxShadow(.black.opacity(0.04), y: 1, blur: 2, radius: 20)
      .boxShadow(.black.opacity(0.18), y: 18, blur: 44, spread: -18, radius: 20))
  }
}
