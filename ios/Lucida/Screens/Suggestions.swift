// iPhone · Suggestions (PhoneSuggestions, PhoneSuggestionsOpen, PhoneSuggestionsEmpty, PhoneSuggestionsDark): for one of your
// shared decks, or all of them: who suggested what (and the cards your own AI made, waiting for you first), and the picked
// one's changes, each to take or skip (Take all / Skip all for the lot; Keep and Toss for your AI's cards). A person's
// suggestion, once it's opened, also has Report (a sheet) and Block (a question: they can't suggest to your decks again, and
// their suggestions go); the cards your own AI made have neither.
import SwiftUI

/// A row in the list: someone's suggestion, or the cards one of your AI apps made that wait for you.
private struct SugItem: Identifiable {
  var id: String
  var isAI = false
  var who: Who
  var title = "", line = "", when = "", head = "", message = ""
  var takeAll = "", skipAll = ""
  var many = false
  var takeAllAction: () -> Void = {}, skipAllAction: () -> Void = {}
  var changes: [SugChange] = []
  /// Someone's suggestion can be reported (its id, and whose it is) and its sender blocked (their handle and name); the cards
  /// your own AI made can't.
  var reportId: String? = nil, reportName = "", blockHandle: String? = nil, blockName = ""
}
private struct SugChange: Identifiable {
  var id: String
  var label = "", context = "", before = "", after = ""
  var open = true, good = false
  var state = "", takeLabel = "", skipLabel = ""
  var take: () -> Void = {}, skip: () -> Void = {}
}

struct SuggestionsScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// One of your decks' suggestions, or ("") every deck's.
  let deckId: String
  /// The one opened (its key), if any; "" closes it.
  @State private var sel: String? = nil
  /// Changes decided a moment ago show that way until the server's answer comes back.
  @State private var local: [String: String] = [:]
  @State private var aiDone: [String: String] = [:]
  @State private var busy = false
  @State private var err = ""
  @State private var note = ""

  var body: some View {
    let demo = store.demo
    let dk: Deck? = deckId.isEmpty || demo ? nil : store.lib.decks.first { $0.id == deckId }
    let sid = demo && !deckId.isEmpty ? "s9" : dk?.share?.id ?? ""
    // Nothing waits (or there's no such deck): an empty list; otherwise what the server has for one deck, or for all.
    let answer: NetAnswer<[SuggestionRow]>? = demo && store.demoNet.pages.noSuggestions ? .ok([]) : deckId.isEmpty ? store.netInbox() : sid.isEmpty ? .ok([]) : store.netSuggestions(sid)
    let list = answer?.value ?? []
    let items = build(list, dk: dk)
    let want = sel ?? (demo ? store.demoNet.pages.pickItem : "")
    let cur = items.first { $0.id == want } ?? (want == "ai" ? items.first { $0.isAI } : nil)
    let loading = answer == nil
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        if let cur { detail(cur) } else { listView(items, loading: loading, deckName: demo && !deckId.isEmpty ? store.deck(deckId).name : dk?.name ?? "") }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
    .onChange(of: cur != nil, initial: true) { _, open in
      nav.barHidden = open
      // The Report board has its sheet open, on the suggestion that's opened.
      if open, store.demo, store.props.report, let cur, let id = cur.reportId, nav.sheet == nil {
        store.props.report = false
        nav.sheet = .report(kind: "suggestion", id: id, name: cur.reportName)
      }
      // The board with Block's question open, on the suggestion that's opened.
      if open, store.demo, store.props.blockOpen, let cur, let h = cur.blockHandle, nav.sheet == nil {
        store.props.blockOpen = false
        nav.sheet = .block(handle: h, name: cur.blockName)
      }
    }
    .onDisappear { nav.barHidden = false }
  }

  // ---------- what's waiting ----------
  private func statusOf(_ c: ChangeRow) -> String { local[c.id] ?? c.status.nilIfEmpty ?? "open" }

  private func build(_ list: [SuggestionRow], dk: Deck?) -> [SugItem] {
    let demo = store.demo
    let now = { (iso: String) in PageText.brief(iso, demo) }
    var items: [SugItem] = []
    // Cards your AI made wait for you first (Settings → Check AI cards first): by deck and by app.
    for x in aiCards(dk: dk) {
      let ids = x.groups.flatMap(\.ids), n = x.groups.count
      var it = SugItem(id: x.key, isAI: true, who: .ai(x.ai))
      it.title = x.ai + ", through your link"
      it.line = PageText.plural(n, "new card") + (deckId.isEmpty ? " · " + x.deckName : "")
      it.when = x.at > 0 ? now(ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: x.at / 1000))) : ""
      it.head = x.ai + " added " + PageText.plural(n, "card")
      it.message = "Through your link" + (deckId.isEmpty ? " · " + x.deckName : "")
      it.takeAll = "Keep all \(n)"; it.skipAll = "Toss all"; it.many = n > 1
      it.takeAllAction = { keep(ids, true) }; it.skipAllAction = { keep(ids, false) }
      it.changes = x.groups.map { g in
        var c = SugChange(id: g.ids.first ?? UUID().uuidString, label: "New card", context: g.kind, after: g.back.isEmpty ? g.front : "Q: " + g.front + " A: " + g.back)
        c.takeLabel = "Keep"; c.skipLabel = "Toss"
        c.take = { keep(g.ids, true) }; c.skip = { keep(g.ids, false) }
        return c
      }
      items.append(it)
    }
    for s in list {
      let open = s.changes.filter { statusOf($0) == "open" }
      guard !open.isEmpty else { continue }
      let byAI = !s.ai.isEmpty
      let who = byAI ? s.ai + ", through " + PageText.firstName(s.authorName) + "’s link" : s.authorName.nilIfEmpty ?? "Someone"
      let deckName = s.deck?.name.nilIfEmpty ?? store.lib.decks.first { $0.share?.id == s.sharedId }?.name ?? ""
      var it = SugItem(id: s.id, who: byAI ? .ai(s.ai) : .person(s.person ?? NetPerson(name: s.authorName)))
      it.title = who
      it.line = PageText.plural(open.count, "change") + (!deckId.isEmpty || deckName.isEmpty ? "" : " · " + deckName)
      it.when = now(s.createdAt)
      it.head = who + " suggested " + PageText.plural(open.count, "change")
      it.message = s.message.isEmpty ? (!deckId.isEmpty || deckName.isEmpty ? "" : deckName) : "“" + s.message + "”"
      it.takeAll = "Take all \(open.count)"; it.skipAll = "Skip all"; it.many = open.count > 1
      it.takeAllAction = { decide(s, ["$all": "take"]) }; it.skipAllAction = { decide(s, ["$all": "skip"]) }
      it.reportId = s.id; it.reportName = s.authorName.nilIfEmpty ?? "Someone"
      if let h = s.person?.handle.nilIfEmpty { it.blockHandle = h; it.blockName = s.person?.name.nilIfEmpty ?? s.authorName.nilIfEmpty ?? "this person" }
      it.changes = s.changes.map { c in
        let x = statusOf(c), v = PageText.changeView(c)
        var ch = SugChange(id: c.id, label: v.label, context: v.context, before: v.before, after: v.after)
        ch.open = x == "open"; ch.good = x == "taken"
        ch.state = ["taken": "Taken", "skipped": "Skipped", "gone": "That card is gone"][x] ?? ""
        ch.takeLabel = "Take it"; ch.skipLabel = "Skip"
        ch.take = { decide(s, [c.id: "take"]) }; ch.skip = { decide(s, [c.id: "skip"]) }
        return ch
      }
      items.append(it)
    }
    return items
  }

  /// Your AI's cards waiting for you, by deck and by app (a text with blanks, or a picture with boxes, is several cards made
  /// together: it's kept or tossed as one).
  private struct AIGroup { var ids: [String]; var kind: String; var front: String; var back: String }
  private struct AIWait { var key: String; var ai: String; var deckName: String; var groups: [AIGroup]; var at: Double }
  private func aiCards(dk: Deck?) -> [AIWait] {
    var out: [AIWait] = []
    if store.demo {
      // The canvas's sample cards from an AI app, waiting (or not: the Empty board).
      let X = Sample.shared
      guard store.demoNet.pages.aiWaiting, !store.demoNet.pages.noSuggestions else { return [] }
      var order: [String] = [], by: [String: [Sample.C]] = [:]
      for c in X.CARDS where !c.ai.isEmpty && (aiDone[c.id] ?? store.demoNet.pages.aiDone[c.id]) == nil { if by[c.ai] == nil { order.append(c.ai) }; by[c.ai, default: []].append(c) }
      for ai in order { out.append(AIWait(key: "ai:cell:" + ai, ai: ai, deckName: "Cell Biology", groups: by[ai]!.map { AIGroup(ids: [$0.id], kind: $0.kind, front: $0.front, back: $0.back) }, at: 0)) }
      return out
    }
    for d in (deckId.isEmpty ? store.lib.decks : dk.map { [$0] } ?? []) {
      var order: [String] = [], by: [String: [Card]] = [:]
      for c in store.lib.deckCards(d) where c.pending && aiDone[c.id] == nil {
        let ai = Engine.byAI(c) && c.source != "shared" ? c.source : "Your AI"
        if by[ai] == nil { order.append(ai) }
        by[ai, default: []].append(c)
      }
      for ai in order {
        var groups: [AIGroup] = [], at: [String: Int] = [:]
        for c in by[ai]! {
          let g = c.group ?? c.id
          if let i = at[g] { groups[i].ids.append(c.id) }
          else { at[g] = groups.count; groups.append(AIGroup(ids: [c.id], kind: PageText.kinds[c.kind] ?? "Card", front: Store.listFront(c), back: Store.listBack(c))) }
        }
        out.append(AIWait(key: "ai:" + d.id + ":" + ai, ai: ai, deckName: d.name, groups: groups, at: by[ai]!.map(\.created).max() ?? 0))
      }
    }
    return out
  }

  // ---------- the list ----------
  @ViewBuilder private func listView(_ items: [SugItem], loading: Bool, deckName: String) -> some View {
    HStack(spacing: 12) {
      if !deckId.isEmpty { RoundButton(icon: "back", label: "Back") { nav.back() } }
      Text("Suggestions").css(32, .bold, ls: -0.03).lineLimit(1).line(32).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
      if !items.isEmpty { Text(String(items.count)).css(15, mono: true).foregroundStyle(t.muted) }
    }
    .foregroundStyle(t.text)
    if !deckId.isEmpty { Text(deckName).css(15).foregroundStyle(t.muted).lineLimit(1).line(15).padding(.top, -8) }
    if loading && items.isEmpty { NetLoading(rows: 2) }
    if !loading && items.isEmpty {
      Text("No suggestions right now").css(15).foregroundStyle(t.muted).line(15).frame(maxWidth: .infinity).padding(.horizontal, 20).padding(.vertical, 48)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    }
    if !note.isEmpty { Text(note).css(14).foregroundStyle(t.muted).line(14).accessibilityAddTraits(.isStaticText) }
    VStack(spacing: 0) {
      ForEach(items) { i in
        Button { sel = i.id; err = ""; note = "" } label: {
          HStack(spacing: 12) {
            WhoAvatar(who: i.who, size: 44)
            VStack(alignment: .leading, spacing: 2) {
              Text(i.title).css(16, .semibold).lineLimit(1).line(16)
              Text(i.line).css(14).foregroundStyle(t.muted).lineLimit(1).line(14)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(i.when).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
          }
          .foregroundStyle(t.text)
          .frame(maxWidth: .infinity, minHeight: 71)
          .padding(.bottom, 1)
          .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(i.title + ", " + i.line + (i.when.isEmpty ? "" : ", " + i.when))
        .accessibilityAddTraits(.isButton)
      }
    }
  }

  // ---------- one picked ----------
  @ViewBuilder private func detail(_ c: SugItem) -> some View {
    HStack(spacing: 12) {
      Button { sel = ""; err = ""; note = "" } label: {
        Icon("back", 18, 2).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.surf))
      }
      .buttonStyle(.press).accessibilityLabel("Back to suggestions")
      WhoAvatar(who: c.who, size: 40)
      // (The browser rounds these lines 20 high, 16 across, a point higher than UIKit does: measured against the board.)
      CSSText(c.head, 16, .semibold, lh: 1.25, color: t.text).frame(maxWidth: .infinity, alignment: .leading).offset(y: -1)
    }
    // What they said, and quietly at its end Report and Block (a person's suggestion only).
    if !c.message.isEmpty || c.reportId != nil || c.blockHandle != nil {
      HStack(spacing: 12) {
        if !c.message.isEmpty { CSSText(c.message, 15, lh: 1.4, color: t.muted).frame(maxWidth: .infinity, alignment: .leading) } else { Spacer(minLength: 0) }
        HStack(spacing: 0) {
          if let id = c.reportId { QuietButton(label: "Report", height: 36) { withAnimation(Motion.sheet) { nav.sheet = .report(kind: "suggestion", id: id, name: c.reportName) } } }
          if let h = c.blockHandle { QuietButton(label: "Block", height: 36) { withAnimation(Motion.sheet) { nav.sheet = .block(handle: h, name: c.blockName) } } }
        }
        .fixedSize()
      }
      .frame(minHeight: 36)
    }
    if c.many {
      TakeSkipButtons(skip: c.skipAll, take: c.takeAll, height: 48, gap: 7, skipAction: c.skipAllAction, takeAction: c.takeAllAction)
    }
    if !err.isEmpty { CSSText(err, 13, color: t.again) }
    VStack(spacing: 12) {
      ForEach(c.changes) { ch in
        ChangeCardView(label: ch.label, context: ch.context, before: ch.before, after: ch.after, state: ch.open ? "" : ch.state, good: ch.good, opacity: ch.open ? 1 : 0.55,
                       decide: ch.open ? (ch.skipLabel, ch.takeLabel, ch.skip, ch.take) : nil)
      }
    }
    .opacity(busy ? 0.6 : 1)
  }

  // ---------- what the buttons do ----------
  private func fail(_ e: Error) -> String { e.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }

  /// Take or skip changes of a suggestion. They show as decided at once; if it doesn't work, they go back.
  private func decide(_ s: SuggestionRow, _ picks: [String: String]) {
    let ids = s.changes.filter { statusOf($0) == "open" && (picks["$all"] != nil || picks[$0.id] != nil) }.map(\.id)
    guard !ids.isEmpty, !busy else { return }
    var after = local
    for id in ids { after[id] = (picks[id] ?? picks["$all"]) == "take" ? "taken" : "skipped" }
    let now = { (c: ChangeRow) in after[c.id] ?? c.status.nilIfEmpty ?? "open" }
    let left = s.changes.filter { now($0) == "open" }.count, took = s.changes.filter { now($0) == "taken" }.count
    busy = true; err = ""; note = ""; local = after
    Task {
      do {
        try await store.decideSuggestion(s.id, picks)
        busy = false
        note = left > 0 ? "" : took > 0 ? "Took " + PageText.plural(took, "change") + " from " + (s.authorName.nilIfEmpty ?? "them") + "." : "Skipped " + (s.authorName.nilIfEmpty ?? "their") + "’s changes."
      } catch {
        for id in ids { local[id] = nil }
        busy = false; err = fail(error)
      }
    }
  }

  /// Keep or toss cards your AI made.
  private func keep(_ ids: [String], _ keep: Bool) {
    guard !ids.isEmpty, !busy else { return }
    busy = true; err = ""
    for id in ids { aiDone[id] = keep ? "kept" : "tossed" }
    Task {
      do { try await store.keepCards(ids, keep: keep); busy = false }
      catch { for id in ids { aiDone[id] = nil }; busy = false; err = fail(error) }
    }
  }
}
