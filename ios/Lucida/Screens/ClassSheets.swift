// iPhone · The class page's sheets: Add a deck (PhoneClassAddDeck: your own decks, each with Add), Assign a deck
// (PhoneClassAssign: one of the class's decks, a goal, and a date), Report (PhoneClassReport: why, and a line) and Get
// verified (PhoneClassVerify: teacher or school, which school, and an email or a link that shows you there). Each shows
// what the server says when it didn't work, right in the sheet.
import SwiftUI

/// A round radio row (the deck to assign, or why you're reporting): a gray row, ringed in black when it's the one picked.
private struct Ringed: ViewModifier {
  @Environment(\.theme) private var t
  let on: Bool, radius: CGFloat
  func body(content: Content) -> some View {
    content
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(t.surf))
      .background(RoundedRectangle(cornerRadius: radius + 2, style: .continuous).fill(on ? t.text : .clear).padding(-2))
  }
}

// ---------- Add a deck ----------
struct ClassAddSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let code: String
  @State private var err = ""
  /// Decks added while the sheet is open (before the class page has them).
  @State private var added: Set<String> = []

  private struct Row: Identifiable { var id = "", name = "", line = ""; var mesh: Mesh; var on = false }

  var body: some View {
    let k = store.netClass(code.uppercased())?.value
    let inIt = Set((k?.deckList ?? []).map(\.id)), names = Set((k?.deckList ?? []).map(\.deck.name))
    let rows: [Row] = store.libraryDecks().compactMap { d in
      let deck = store.lib.decks.first { $0.id == d.id }
      // Decks you study from someone else aren't yours to add (the web filters them out).
      if let deck, store.sharing(deck).readOnly { return nil }
      let shareId = deck?.share.flatMap { $0.vis == "private" ? nil : $0.id }
      let on = added.contains(d.id) || store.demoClass.added.contains(d.id) || (shareId.map(inIt.contains) ?? false) || (store.demo && names.contains(d.name))
      return Row(id: d.id, name: d.name, line: d.total == 1 ? "1 card" : d.totalLabel + " cards", mesh: d.mesh, on: on)
    }
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text("Add a deck").css(18, .semibold, ls: -0.01).line(18).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        CloseX(action: nav.close)
      }
      ScrollView(showsIndicators: false) {
        VStack(spacing: 0) {
          ForEach(rows) { r in
            HStack(spacing: 12) {
              CSSLinearGradient(angle: r.mesh.angle, stops: r.mesh.stops).frame(width: 40, height: 40).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
              VStack(alignment: .leading, spacing: 2) {
                Text(r.name).css(15, .semibold).lineLimit(1).line(15)
                Text(r.line).css(13).foregroundStyle(t.muted).line(13)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              if r.on {
                HStack(spacing: 6) { Icon("check", 14, 2.4); Text("Added").css(13, .semibold) }.foregroundStyle(t.muted).fixedSize()
              } else {
                SmallButton(label: "Add", icon: "plus") { add(k, r.id) }.accessibilityLabel("Add " + r.name)
              }
            }
            .foregroundStyle(t.text)
            .frame(minHeight: 64)
            .padding(.bottom, 1)
            .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
            .accessibilityElement(children: .contain)
          }
          if rows.isEmpty { Text("No decks of yours yet.").css(14).foregroundStyle(t.muted).frame(maxWidth: .infinity).padding(.horizontal, 8).padding(.vertical, 32) }
        }
      }
      ClassErrBox(text: err)
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
  }

  private func add(_ k: ClassPage?, _ deckId: String) {
    guard let k else { return }
    err = ""
    Task {
      do { try await store.addClassDeck(k.id, deckId: deckId); added.insert(deckId) }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
}

// ---------- Assign a deck ----------
struct ClassAssignSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let code: String
  @State private var pick: String? = nil
  @State private var goal = "learn"
  @State private var due: String? = nil
  @State private var err = ""
  @State private var busy = false
  /// Where the date's row is on the screen: the calendar opens under it.
  @State private var dateFrame = CGRect.zero

  var body: some View {
    let k = store.netClass(code.uppercased())?.value, decks = k?.deckList ?? []
    let pickId = decks.contains { $0.id == pick } ? pick ?? "" : decks.first?.id ?? ""
    let today = store.classToday, cal = ClassWords.cal
    let plus = { (n: Int) in cal.date(byAdding: .day, value: n, to: today) ?? today }
    // The next Friday (a week from today, when today is one).
    let toFriday = (5 - (cal.component(.weekday, from: today) - 1) + 7) % 7
    let dueV = due ?? ClassWords.isoDay(plus(7)), ok = !pickId.isEmpty && !dueV.isEmpty && !busy
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text("Assign a deck").css(18, .semibold, ls: -0.01).line(18).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        CloseX(action: nav.close)
      }
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 18) {
          VStack(alignment: .leading, spacing: 8) {
            label("Deck")
            VStack(spacing: 6) { ForEach(decks) { d in deckRow(d, on: d.id == pickId) } }
            if decks.isEmpty { Text("Add a deck to the class first.").css(13).foregroundStyle(t.muted).line(13) }
          }
          VStack(alignment: .leading, spacing: 8) {
            label("Goal")
            Segmented(options: [("learn", "Learn every card"), ("daily", "Review what’s due")], current: goal, height: 34, size: 13, gap: 4, hPad: 10) { goal = $0 }
          }
          VStack(alignment: .leading, spacing: 8) {
            label(goal == "daily" ? "Until" : "Due")
            FlowLayout(spacing: 6, lineSpacing: 6) {
              ForEach([("Tomorrow", plus(1)), ("Friday", plus(toFriday == 0 ? 7 : toFriday)), ("In a week", plus(7)), ("In 2 weeks", plus(14))], id: \.0) { name, day in
                let on = ClassWords.isoDay(day) == dueV
                Button { due = ClassWords.isoDay(day) } label: {
                  Text(name).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 34)
                    .background(Capsule().fill(on ? t.inv : t.surf))
                }
                .buttonStyle(.press)
                .accessibilityAddTraits(on ? .isSelected : [])
              }
            }
            dateField(dueV, min: today)
          }
        }
      }
      ClassErrBox(text: err)
      Button(action: { assign(k, pickId, dueV) }) {
        Text("Assign").css(16, .semibold).foregroundStyle(ok ? t.invText : t.muted).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(ok ? t.inv : t.surf2))
      }
      .buttonStyle(.press)
      .accessibilityAddTraits(ok ? [] : .isStaticText)
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .haptic(.selection, on: pick, "option")
    .haptic(.selection, on: due, "option")
  }

  private func label(_ s: String) -> some View { Text(s).css(13, .semibold).line(13) }

  private func deckRow(_ d: ClassDeck, on: Bool) -> some View {
    let tile = TileVM(d.deck)
    return Button { pick = d.id } label: {
      HStack(spacing: 12) {
        CSSLinearGradient(angle: tile.mesh.angle, stops: tile.mesh.stops).frame(width: 40, height: 40).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        VStack(alignment: .leading, spacing: 2) {
          Text(d.deck.name).css(15, .semibold).lineLimit(1).line(15)
          Text(tile.cardsLine).css(13).foregroundStyle(t.muted).line(13)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if on { Icon("check", 16, 2.4) }
      }
      .foregroundStyle(t.text)
      .padding(.leading, 8).padding(.trailing, 14).padding(.vertical, 8).frame(minHeight: 56)
      .modifier(Ringed(on: on, radius: 16))
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(d.deck.name + ", " + tile.cardsLine)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }

  /// The date: a row with a calendar mark and the day (like the web's), which opens Lucida's own calendar under it.
  private func dateField(_ v: String, min: Date) -> some View {
    let minIso = ClassWords.isoDay(min)
    return Button {
      nav.openCalendar(CalendarRequest(anchor: dateFrame, trailing: false, title: "Due date", value: v, min: minIso, today: minIso) { iso in due = iso })
    } label: {
      HStack(spacing: 10) {
        Icon("calendar", 18, 1.8).foregroundStyle(t.muted)
        Text(CalDay.short(v)).css(15).foregroundStyle(t.text).frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 16).frame(height: 48)
      .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
      .contentShape(Rectangle())
      .screenFrame($dateFrame)
    }
    .buttonStyle(.flat)
    .accessibilityLabel("Date")
    .accessibilityValue(CalDay.short(v))
    #if DEBUG
    // `-calendar "Due date"`: the calendar open as soon as the sheet is up (a board's Calendar Tweak, for looking at it).
    .task { if Board.arg("-calendar") == "Due date" { try? await Task.sleep(nanoseconds: 1_200_000_000); nav.openCalendar(CalendarRequest(anchor: dateFrame, trailing: false, title: "Due date", value: v, min: minIso, today: minIso) { iso in due = iso }) } }
    #endif
  }

  private func assign(_ k: ClassPage?, _ pickId: String, _ dueV: String) {
    guard let k, !pickId.isEmpty, !busy else { return }
    busy = true; err = ""
    Task {
      do { try await store.assign(k.id, sharedId: pickId, goal: goal, due: dueV); busy = false; nav.close() }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}

// ---------- Report ----------
struct ReportSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  let kind: String, id: String, name: String
  @State private var reason = ""
  @State private var note = ""
  @State private var sent = false
  @State private var err = ""
  @State private var busy = false
  @FocusState private var focus: Bool

  var body: some View {
    let ok = !reason.isEmpty && (reason != "other" || !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    let title = ["deck": "Report this deck", "profile": "Report this person", "suggestion": "Report this suggestion"][kind] ?? "Report"
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          Text(title).css(22, .semibold, ls: -0.02).line(22).accessibilityAddTraits(.isHeader)
          Text(name).css(14).foregroundStyle(t.muted).lineLimit(1).line(14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        CloseX(action: nav.close)
      }
      if !sent {
        VStack(alignment: .leading, spacing: 12) {
          VStack(spacing: 6) {
            ForEach([("wrong", "Wrong or harmful"), ("spam", "Spam"), ("stolen", "Someone else’s work"), ("other", "Other")], id: \.0) { id, label in
              let on = id == reason
              Button { reason = id; err = "" } label: {
                HStack(spacing: 12) {
                  Circle().strokeBorder(on ? t.text : t.muted, lineWidth: on ? 6 : 2).frame(width: 18, height: 18)
                  Text(label).css(15, .medium).line(15)
                  Spacer(minLength: 0)
                }
                .foregroundStyle(t.text)
                .padding(.horizontal, 16).frame(height: 50)
                .modifier(Ringed(on: on, radius: 16))
                .contentShape(Rectangle())
              }
              .buttonStyle(.flat)
              .accessibilityElement(children: .ignore)
              .accessibilityLabel(label)
              .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
            }
          }
          .haptic(.selection, on: reason, "option")
          ClassField(text: $note, placeholder: reason == "other" ? "What’s wrong?" : "A line about it (if you like)", label: "A line about it", max: 280, focus: $focus)
          ErrLine(text: err)
          HStack(spacing: 10) {
            Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf)) }
              .buttonStyle(.press)
            Button(action: send) {
              Text("Send").css(15, .semibold).foregroundStyle(ok ? t.invText : t.muted).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(ok ? t.inv : t.surf2))
            }
            .buttonStyle(.press)
            .accessibilityAddTraits(ok ? [] : .isStaticText)
          }
        }
      } else {
        VStack(spacing: 14) {
          HStack(spacing: 12) { Icon("check", 20, 2.4); Text("Thanks. We’ll take a look.").css(15, .semibold).line(15); Spacer(minLength: 0) }
            .padding(18).background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
          Button(action: nav.close) { Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press)
        }
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 14 : 34)
  }

  private func send() {
    let n = note.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !reason.isEmpty, reason != "other" || !n.isEmpty, !busy else { return }
    busy = true; err = ""; focus = false
    Task {
      do { try await store.sendReport(kind: kind, id: id, handle: kind == "profile" ? id : nil, reason: reason, note: n); sent = true; busy = false }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}

// ---------- Get verified ----------
struct VerifySheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  @State private var role = "teacher"
  @State private var school: String? = nil
  @State private var contact = ""
  @State private var sent = false
  @State private var err = ""
  @State private var busy = false
  @FocusState private var focus: Bool

  var body: some View {
    let vst = store.netVerify(), sch = school ?? vst.school
    let ok = sch.trimmingCharacters(in: .whitespaces).count > 1 && !contact.trimmingCharacters(in: .whitespaces).isEmpty
    let waiting = vst.open || sent
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text("Get verified").css(22, .semibold, ls: -0.02).line(22).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        CloseX(action: nav.close)
      }
      if !waiting {
        VStack(alignment: .leading, spacing: 12) {
          Segmented(options: [("teacher", "I’m a teacher"), ("school", "We’re a school")], current: role, height: 34, size: 13, gap: 4, hPad: 10) { role = $0 }
          ClassField(text: Binding(get: { sch }, set: { school = $0 }), placeholder: "School", label: "School", icon: "cap", max: 80, focus: $focus)
          ClassField(text: $contact, placeholder: "School email, or a link that shows you there", label: "School email or link", icon: "link", max: 200, caps: .never)
            .onChange(of: contact) { _, _ in err = "" }
          ErrLine(text: err)
          HStack(spacing: 10) {
            Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf)) }
              .buttonStyle(.press)
            Button { send(sch) } label: {
              Text("Send").css(15, .semibold).foregroundStyle(ok ? t.invText : t.muted).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(ok ? t.inv : t.surf2))
            }
            .buttonStyle(.press)
            .accessibilityAddTraits(ok ? [] : .isStaticText)
          }
        }
      } else {
        VStack(spacing: 14) {
          HStack(spacing: 12) {
            Icon("shield", 22, 2).foregroundStyle(Color(hex: 0x3E63DD))
            VStack(alignment: .leading, spacing: 2) {
              Text("Waiting for review").css(15, .semibold).line(15)
              Text("We’ll let you know.").css(13).foregroundStyle(t.muted).line(13)
            }
            Spacer(minLength: 0)
          }
          .padding(18).background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
          Button(action: nav.close) { Text("Done").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press)
        }
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 14 : 34)
  }

  private func send(_ sch: String) {
    guard !busy else { return }
    busy = true; err = ""; focus = false
    Task {
      do { try await store.askVerify(role: role, school: sch.trimmingCharacters(in: .whitespaces), contact: contact.trimmingCharacters(in: .whitespaces)); sent = true; busy = false }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}
