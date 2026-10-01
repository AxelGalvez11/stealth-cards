// iPhone · Today (PhoneToday, PhoneTodayCaughtUp, PhoneTodayNew): the day's review on the Iris card, then your decks. No picture
// at the top left: your profile is the Profile tab.
import SwiftUI

struct TodayScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav

  var body: some View {
    let vm = store.today()
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        // The title sits in the middle of the screen; news (with how many are new) and + on the right (todayTitle). Your
        // profile is the Profile tab: Today has no picture (the owner's notes, 2026-10-01).
        ZStack {
          Text("Today").css(34, .bold, ls: -0.03).foregroundStyle(t.text).accessibilityAddTraits(.isHeader)
          HStack(spacing: 8) {
            Spacer(minLength: 0)
            NewsBell(count: store.netUnread()) { nav.push(.news) }
            RoundButton(icon: "plus", label: vm.hasDecks ? "New card" : "New deck") { vm.hasDecks ? nav.newCard(deckId: vm.newCardDeck) : nav.newDeck() }
          }
        }
        .frame(height: 44)
        if vm.hasDecks { hero(vm); assignments; decks(vm) } else { welcome }
      }
      .padding(.horizontal, 20)
      .padding(.top, Screen.top(64))
      .padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
  }

  // The Iris card: what's due, then one button.
  private func hero(_ vm: TodayVM) -> some View {
    Button { if vm.caught && vm.nothingNew { nav.newCard(deckId: vm.newCardDeck) } else { store.startReview(nil); nav.study(deckId: nil) } } label: {
      MeshCard(mesh: .palette("Iris"), radius: 32) {
        VStack(alignment: .leading, spacing: 18) {
          Color.clear.frame(height: 56)
          VStack(alignment: .leading, spacing: 4) {
            Text(vm.heroMeta).css(14).opacity(0.85)
            Text(vm.heroTitle).css(vm.heroSize, .semibold, ls: -0.045).lineLimit(1).lineBox(vm.heroSize)
            Text(vm.heroSub).css(14).opacity(0.85)
          }
          Text(vm.heroCta).css(16, .semibold)
            .foregroundStyle(Color.black)
            .frame(maxWidth: .infinity).frame(height: 52)
            .background(Capsule().fill(Color.white))
            .shadow(color: .clear, radius: 0)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .buttonStyle(.press)
  }

  /// What your classes assigned (TODAY_ASSIGN_PHONE): a calm row each, soonest first: the deck, when it's due and whose
  /// class, and what's left for you. A row opens the deck (or the class, until you study it).
  @ViewBuilder private var assignments: some View {
    let rows = store.assignmentRows(), today = store.classToday
    if !rows.isEmpty {
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow(text: "Assignments").padding(.horizontal, 4).padding(.top, 6).padding(.bottom, 4)
        ForEach(rows) { a in
          let mesh = Mesh.gen(a.cover.seed ?? a.name, a.cover.style ?? "mix")
          let left = ClassWords.leftWord(goal: a.goal, cards: a.cards, a.progress)
          let sub = ClassWords.dueWord(a.goal, a.due, today: today) + " · " + a.className
          Button {
            if let p = a.progress { nav.push(.deck(store.demo ? "cell" : p.deckId)) } else { nav.classPage(a.code) }
          } label: {
            HStack(spacing: 12) {
              CSSLinearGradient(angle: mesh.angle, stops: mesh.stops).frame(width: 10, height: 10).clipShape(Circle())
              VStack(alignment: .leading, spacing: 2) {
                Text(a.name).css(16, .medium).foregroundStyle(a.done ? t.muted : t.text).lineLimit(1).line(16)
                Text(sub).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              Text(left).css(14, .semibold).foregroundStyle(a.done ? t.good : t.text).lineLimit(1).fixedSize().line(14)
            }
            .frame(minHeight: 58)
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
            .padding(.bottom, 1)
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel([a.name, sub, left].joined(separator: ", "))
          .accessibilityAddTraits(.isButton)
        }
      }
    }
  }

  private func decks(_ vm: TodayVM) -> some View {
    VStack(alignment: .leading, spacing: 18) {
      Eyebrow(text: "Decks").padding(.horizontal, 4).padding(.top, 6)
      VStack(spacing: 0) {
        ForEach(vm.rows) { d in
          Button { nav.push(.deck(d.id)) } label: {
            HStack(spacing: 12) {
              VStack(alignment: .leading, spacing: 2) {
                Text(d.name).css(16, .medium).foregroundStyle(t.text).lineLimit(1)
                Text(d.sub).css(13).foregroundStyle(t.muted).lineLimit(1)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              Text(d.right).css(d.mono ? 15 : 14, mono: d.mono).foregroundStyle(d.muted ? t.muted : t.text)
            }
            .frame(minHeight: 58)
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
            .padding(.bottom, 1)
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  // No decks yet (PhoneTodayNew): the web's welcome, stacked. The date on the Iris card, then Get started (Make a deck
  // across in black, Import and Connect side by side), then this week with no streak yet.
  private var welcome: some View {
    let td = store.demo ? nil : store.engine.today
    return VStack(alignment: .leading, spacing: 18) {
      MeshCard(mesh: .palette("Iris"), radius: 32) {
        VStack(alignment: .leading, spacing: 8) {
          Spacer(minLength: 0)
          Text(td?.date ?? "Tuesday, September 22").css(14).opacity(0.85)
          Text("Welcome").css(44, .semibold, ls: -0.04).lineBox(44)
          Text("Nothing to study yet. Start with a deck.").css(15).opacity(0.85)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 168)
      }
      VStack(alignment: .leading, spacing: 10) {
        Eyebrow(text: "Get started").padding(.horizontal, 4)
        Button { nav.newDeck() } label: {
          HStack(spacing: 14) {
            Icon("plus", 20, 2).frame(width: 40, height: 40).background(Circle().fill(Color(white: 0.5, opacity: 0.28)))
            VStack(alignment: .leading, spacing: 3) {
              Text("Make a deck").css(17, .semibold)
              Text("Start from scratch with your own cards").css(13).opacity(0.7)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Icon("chev", 14, 2.2).opacity(0.7)
          }
          .foregroundStyle(t.invText)
          .padding(18)
          .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.inv))
        }
        .buttonStyle(.press)
        HStack(spacing: 8) {
          startTile(icon: "upload", title: "Import cards", body: "From Anki, Quizlet, or a CSV file.") { nav.importCards() }
          startTile(icon: "connect", title: "Connect your AI", body: "Let Claude or ChatGPT make cards.") { nav.openConnect() }
        }
      }
      VStack(alignment: .leading, spacing: 14) {
        HStack(spacing: 12) {
          Icon("flame", 18, 2).foregroundStyle(t.muted).frame(width: 36, height: 36).background(Circle().fill(t.surf2))
          VStack(alignment: .leading, spacing: 1) {
            Text("No streak yet").css(15, .semibold)
            Text("Study today to start one").css(12).foregroundStyle(t.muted)
          }
        }
        EmptyWeek(today: td?.week.firstIndex(where: \.today) ?? 1)
      }
      .padding(18)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
    }
    .foregroundStyle(t.text)
  }

  /// A Get started tile (phoneStartTile): an icon in a circle, then its name and a line about it at the bottom.
  private func startTile(icon: String, title: String, body: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: 6) {
        Icon(icon, 18, 2).frame(width: 36, height: 36).background(Circle().fill(Color(white: 0.5, opacity: 0.18)))
        Spacer(minLength: 0)
        Text(title).css(16, .semibold)
        Text(body).css(13, lh: 1.4).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
      }
      .foregroundStyle(t.text)
      .padding(18)
      .frame(maxWidth: .infinity, minHeight: 148, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    }
    .buttonStyle(.press)
  }
}

/// This week with nothing studied yet (emptyWeek): seven gray circles, today's ringed.
struct EmptyWeek: View {
  @Environment(\.theme) private var t
  let today: Int
  var body: some View {
    HStack(spacing: 6) {
      ForEach(0..<7, id: \.self) { i in
        VStack(spacing: 6) {
          Circle().fill(t.surf2).frame(width: 28, height: 28)
            .overlay { if i == today { Circle().strokeBorder(t.muted, lineWidth: 2).padding(-4) } }
          Text(["M", "T", "W", "T", "F", "S", "S"][i]).css(11, i == today ? .semibold : .regular).foregroundStyle(i == today ? t.text : t.muted)
        }
        .frame(maxWidth: .infinity)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("No study days yet this week")
  }
}

/// NEWS_BTN: the bell, with how much news is new in a red dot on its corner (99+ past 99).
struct NewsBell: View {
  @Environment(\.theme) private var t
  let count: Int
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Icon("bell", 18, 2).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.surf))
        .overlay(alignment: .topTrailing) {
          if count > 0 {
            Text(count > 99 ? "99+" : String(count)).css(11, .bold).foregroundStyle(.white).lineLimit(1).fixedSize()
              .padding(.horizontal, 5).frame(minWidth: 18, minHeight: 18, maxHeight: 18)
              .background(Capsule().fill(Color(hex: 0xE5484D)))
              .background(Capsule().fill(t.bg).padding(-2))
              .offset(x: 3, y: -3)
          }
        }
    }
    .buttonStyle(.press)
    .accessibilityLabel(count > 0 ? "News, \(count) new" : "News")
  }
}
