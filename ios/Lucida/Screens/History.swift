// iPhone · History (PhoneHistory, PhoneHistoryOpen, PhoneHistoryDark): every version of a shared deck, newest first: who made
// it (a person, or the AI app that worked for them), what changed, and when. See changes lists the changes in a version, and
// the owner can go back to any version (it's done as a new version, so going back can be undone too).
import SwiftUI

struct HistoryScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let addr: DeckAddress
  /// The version with its changes showing (-1: none; nil: as the board opens it), and the one being asked about.
  @State private var openV: Int? = nil
  @State private var askV: Int? = nil
  @State private var busy = false
  @State private var err = ""
  @State private var note = ""

  var body: some View {
    let demo = store.demo
    // The address names the deck (/@maria/mcat-biochemistry/history): its page gives its id.
    let pg: NetAnswer<PublicDeckPage>? = demo || !addr.id.isEmpty ? nil : store.netDeckPage(addr)
    let sharedId: String? = demo ? "s9" : addr.id.isEmpty ? pg?.value?.id : addr.id
    let gone = !demo && addr.id.isEmpty && (pg?.isMissing == true || pg?.isOffline == true)
    let answer: NetAnswer<HistoryPage>? = gone ? .missing(status: 404, error: "") : sharedId.flatMap { store.netHistory($0) }
    let h = answer?.value
    let bad = gone || answer?.isMissing == true || answer?.isOffline == true
    let mine = h?.mine ?? false
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("History").css(32, .bold, ls: -0.03).lineLimit(1).line(32).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        }
        .foregroundStyle(t.text)
        if let h {
          let n = h.following
          Text([h.name, n > 0 ? PageText.plural(n, "person", "people") + (n == 1 ? " gets" : " get") + " these updates" : ""].filter { !$0.isEmpty }.joined(separator: " · "))
            .css(14).foregroundStyle(t.muted).line(14).padding(.top, -6)
        }
        if answer == nil && !bad { NetLoading(rows: 3) }
        if bad { NetMissing(title: "This deck isn’t here", line: "It may be private now, or the link is wrong.") { nav.pick(.discover) } }
        if !note.isEmpty { Text(note).css(14).foregroundStyle(t.muted).line(14).accessibilityAddTraits(.isStaticText) }
        if !err.isEmpty { CSSText(err, 13, color: t.again) }
        if let h {
          VStack(spacing: 12) {
            ForEach(Array(h.versions.enumerated()), id: \.offset) { i, v in card(v, latest: i == 0, mine: mine, h: h) }
            if h.versions.isEmpty {
              Text("No versions yet").css(15).foregroundStyle(t.muted).line(15).frame(maxWidth: .infinity).padding(.horizontal, 20).padding(.vertical, 40)
                .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
            }
          }
        }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
  }

  private var opened: Int { openV ?? (store.demo ? store.demoNet.pages.openVersion ?? -1 : -1) }

  /// One version: its picture, what it did, who and when; See changes, and (your own deck) Go back to this version.
  private func card(_ v: VersionRow, latest: Bool, mine: Bool, h: HistoryPage) -> some View {
    let x = PageText.versionView(v, store.demo), list = v.changes ?? [], has = !list.isEmpty
    let isOpen = has && opened == v.version, canBack = mine && !latest, asking = canBack && askV == v.version
    let pill: Color = latest ? t.bg : t.surf
    return VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VersionAvatar(v: x, size: 36)
        VStack(alignment: .leading, spacing: 2) {
          CSSText(x.title, 15, .semibold, lh: 1.3, color: t.text)
          if !x.sub.isEmpty { CSSText(x.sub, 13, lh: 1.3, color: t.muted) }
          Text(x.label + " · " + x.when).css(12).foregroundStyle(t.muted).line(12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      if has {
        GrayPill(label: isOpen ? "Hide changes" : "See changes", bg: pill) { openV = isOpen ? -1 : v.version; askV = nil }
          .accessibilityAddTraits(isOpen ? .isSelected : [])
      }
      if canBack && !asking && !has { GrayPill(label: "Go back to this version", icon: "history", bg: pill) { askV = v.version; err = "" } }
      if isOpen || asking {
        VStack(alignment: .leading, spacing: 12) {
          if isOpen {
            ForEach(Array(list.enumerated()), id: \.offset) { _, c in
              let w = PageText.changeView(c)
              ChangeCardView(label: w.label, context: w.context, before: w.before, after: w.after)
            }
          }
          if canBack && !asking && isOpen { GrayPill(label: "Go back to this version", icon: "history") { askV = v.version; err = "" } }
          if asking { ask(v.version, h: h) }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16).padding(.vertical, 14)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(latest ? t.surf : t.bg))
    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(latest ? .clear : t.line, lineWidth: 1))
    .accessibilityElement(children: .contain)
    .accessibilityLabel(x.title + ", " + x.label + ", " + x.when)
  }

  /// Going back asks first, in the page.
  private func ask(_ version: Int, h: HistoryPage) -> some View {
    FlowLayout(spacing: 10, lineSpacing: 10) {
      Text("Go back to version \(version)?").css(14, .semibold).lineLimit(1).fixedSize()
      Button { askV = nil } label: {
        Text("Cancel").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.bg))
      }
      .buttonStyle(.press)
      Button { goBack(version, h: h) } label: {
        Text(busy ? "Going back…" : "Go back").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .foregroundStyle(t.text)
    .padding(.leading, 16).padding(.trailing, 12).padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain)
  }

  /// Go back to a version: every change since is undone, as a new version.
  private func goBack(_ version: Int, h: HistoryPage) {
    guard !busy else { return }
    busy = true; err = ""; note = ""
    Task {
      do {
        try await store.restoreVersion(h.id, version)
        busy = false; askV = nil; openV = -1; note = "Went back to version \(version)."
      } catch { busy = false; err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
}
