// What screens use to draw a theme (Pro): whether one applies, and the pictures the painter made for it (ThemeArt.swift),
// put where the boards have the theme's art, behind the app's own words and buttons. Until a picture is kept the screen
// shows Lucida's own look, and a theme already in use is warmed up at launch, so nothing flashes.
import SwiftUI

/// A theme that applies right now, with what it says about itself (its darkness, its lettering).
struct ThemeSkin: Equatable {
  let key: String
  let spec: ThemeSpec
  /// The study screen's colors on this theme: light, or dark with the app's own black or gray.
  func page(gray: Bool) -> Theme { Theme(dark: spec.dark, gray: gray) }
}

extension Store {
  /// The theme you picked ("lucida": the app's own look).
  var themePicked: String { (demo ? props.theme : lib.settings.theme).nilIfEmpty ?? "lucida" }
  /// The theme in use: your pick, on Pro (Lucida's own look is for everyone; Free never draws a theme).
  var skinKey: String? { isPro && themePicked != "lucida" && Generated.themes.contains { $0.key == themePicked } ? themePicked : nil }
  /// The theme in use, once its details are kept (until then screens keep Lucida's look and it's being asked for).
  func skin(_ art: ThemeArt) -> ThemeSkin? {
    guard let k = skinKey, let s = art.spec(k) else { return nil }
    return ThemeSkin(key: k, spec: s)
  }
  /// The name Settings shows for the theme.
  var themeShort: String { Generated.themes.first { $0.key == (isPro ? themePicked : "lucida") }?.short ?? "Lucida" }
  /// Dark mode's gray look is on (it decides how a dark theme's buttons look).
  var appGray: Bool { (demo ? props.darkMode : lib.settings.darkMode) == "gray" }
}

/// What a study screen draws with, set once for the screen: the theme (nil: Lucida's look).
private struct StudySkinKey: EnvironmentKey { static let defaultValue: ThemeSkin? = nil }
extension EnvironmentValues {
  var studySkin: ThemeSkin? { get { self[StudySkinKey.self] } set { self[StudySkinKey.self] = newValue } }
}

// ---------- layout the pictures are made for ----------
enum ThemeLayout {
  static var screen: CGSize { UIScreen.main.bounds.size }
  /// The flashcard on Review (its face), and how far it is from each edge of the screen: 16 in from the sides, under the top
  /// bar, over the grade buttons.
  static var reviewCard: CGSize { CGSize(width: screen.width - 32, height: screen.height - Screen.top(60) - 186) }
  static var reviewMargins: UIEdgeInsets { UIEdgeInsets(top: Screen.top(60) + 60, left: 16, bottom: 126, right: 16) }
}

// ---------- a picture, where it goes ----------
extension ThemePic {
  /// The picture, at its size, reaching out past the box it stands for (a shadow, a ring) by its padding.
  @ViewBuilder var placed: some View {
    Image(uiImage: image).resizable().frame(width: size.width, height: size.height).offset(x: -pad.left, y: -pad.top)
  }
}

/// A picture for a box of a size: it fills the box, and reaches past it by its padding (nothing clips it).
struct ThemePicture: View {
  @ObservedObject private var art = ThemeArt.shared
  let job: ThemeJob
  var low = false
  var body: some View {
    let _ = art.tick
    if let p = art.picture(job, low: low) { Color.clear.overlay(alignment: .topLeading) { p.placed } }
    else { Color.clear }
  }
}

// ---------- the study background ----------
extension ThemeJob {
  /// The theme's study background at the size of the screen, over the page's color on it.
  static func studyBg(_ skin: ThemeSkin, gray: Bool) -> ThemeJob { .bg(skin.key, size: ThemeLayout.screen, base: skin.page(gray: gray).colors.bg) }
}

struct ThemedStudyBackground: View {
  @ObservedObject private var art = ThemeArt.shared
  @EnvironmentObject private var store: Store
  let skin: ThemeSkin
  var body: some View {
    let _ = art.tick
    let t = skin.page(gray: store.appGray)
    // The picture is made at the size of the screen; wherever the page puts it, it fills that (and it's the screen's size).
    ZStack {
      t.bg
      if let p = art.picture(.studyBg(skin, gray: store.appGray)) {
        GeometryReader { g in
          Image(uiImage: p.image).resizable().scaledToFill().frame(width: g.size.width, height: g.size.height).clipped()
        }
        .transition(.opacity)
      }
    }
    .animation(.easeOut(duration: 0.25), value: art.picture(.studyBg(skin, gray: store.appGray)) != nil)
  }
}

// ---------- your profile picture ----------
/// Your circle (AVATAR_ME): Lucida's, or with a theme on, the theme's, or the theme's ring around your photo.
struct MyAvatar: View {
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  let size: CGFloat
  var body: some View {
    let _ = art.tick
    let pic = store.avatar, color = pic == .color
    let plain = Avatar(size: size, initial: store.avatarInitial, color: store.avatarColor, pic: pic)
    if let skin = store.skin(art), let p = art.picture(.avatar(skin.key, size: Int(size), ch: store.avatarLetter, photo: !color)) {
      ZStack {
        if !color { plain }
        Color.clear.overlay(alignment: .topLeading) { p.placed }
      }
      .frame(width: size, height: size)
    } else { plain }
  }
}

extension Store {
  /// Your letter as a theme draws it: one letter or digit, or a dot for a name that starts with something else.
  var avatarLetter: String {
    let c = avatarInitial.first { $0.isLetter || $0.isNumber }
    return c.map { String($0) } ?? "•"
  }
}

// ---------- deck covers ----------
extension DeckVM {
  /// What a theme draws a cover from.
  var look: ThemeDeck { ThemeDeck(name: name, seed: seed.isEmpty ? name : seed, round: round, tags: tags) }
}

extension ThemeJob {
  /// A deck page's header (a deck page's whole top: the picture behind its buttons and name).
  static func head(_ skin: ThemeSkin, deck: ThemeDeck, size: CGSize) -> ThemeJob { .cover(skin.key, deck: deck.dict, shape: "head", fs: 34, size: size, r: 20) }
  /// A deck's small cover on a Library row (48 x 48).
  static func thumb(_ skin: ThemeSkin, deck: ThemeDeck) -> ThemeJob { .cover(skin.key, deck: deck.dict, shape: "square", cs: "wide", fs: 19, size: CGSize(width: 48, height: 48), r: 14) }
  /// A deck on a folder's tile: a small card in the fan.
  static func swatch(_ skin: ThemeSkin, deck: ThemeDeck) -> ThemeJob { .cover(skin.key, deck: deck.dict, shape: "wide", cs: "wide", fs: 12, cr: 12, size: CGSize(width: 60, height: 41), r: 12) }
  /// A deck's name on its page's header, lettered by the theme.
  static func headName(_ skin: ThemeSkin, deck: ThemeDeck, width: CGFloat) -> ThemeJob {
    ThemeJob(theme: skin.key, kind: "name", fields: ["d": deck.dict, "text": deck.name, "mode": "head", "size": 34, "n": 32, "cw": Int(width.rounded()), "inset": "0 16px 0 20px", "pad": 16])
  }
  /// The name on New deck's preview.
  static func newName(_ skin: ThemeSkin, deck: ThemeDeck, width: CGFloat) -> ThemeJob {
    ThemeJob(theme: skin.key, kind: "name", fields: ["d": deck.dict, "text": deck.name, "mode": "new", "size": 26, "n": 22, "cw": Int(width.rounded()), "pad": 16], slot: "newname")
  }
  /// New deck's cover, for the name and colors on show.
  static func newCover(_ skin: ThemeSkin, deck: ThemeDeck, size: CGSize) -> ThemeJob {
    var j = ThemeJob.cover(skin.key, deck: deck.dict, shape: "wide", fs: 26, size: size, r: 20)
    j.slot = "newcover"
    return j
  }
}

/// A deck's name, lettered the way the theme letters it. `keep` is the last one made, shown until the new one is ready (a
/// name being typed).
struct ThemedName: View {
  @ObservedObject private var art = ThemeArt.shared
  let job: ThemeJob
  @State private var last: ThemePic?
  var body: some View {
    let _ = art.tick
    let pic = art.picture(job) ?? last
    Group {
      if let pic {
        let w = pic.info.num("textW"), h = pic.info.num("textH")
        Color.clear.frame(width: w, height: h).overlay(alignment: .topLeading) { pic.placed }
      } else { Color.clear.frame(height: 34) }
    }
    .task(id: art.tick) { if let p = art.picture(job) { last = p } }
  }
}
