// iPhone · Report (on someone else's shared deck, a person's profile, or a suggestion: why, and a line; PhonePublicDeckReport,
// PhoneProfileReport, PhoneSuggestionsReport) and Get verified (Settings › Account: teacher or school, which school, and an email
// or a link that shows you there; PhoneSettingsGetVerified). Each shows what the server says when it didn't work, right in the sheet.
import SwiftUI

/// A round radio row (why you're reporting): a gray row, ringed in black when it's the one picked.
private struct Ringed: ViewModifier {
  @Environment(\.theme) private var t
  let on: Bool, radius: CGFloat
  func body(content: Content) -> some View {
    content
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(t.surf))
      .background(RoundedRectangle(cornerRadius: radius + 2, style: .continuous).fill(on ? t.text : .clear).padding(-2))
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
          IconField(text: $note, placeholder: reason == "other" ? "What’s wrong?" : "A line about it (if you like)", label: "A line about it", max: 280, focus: $focus)
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
          IconField(text: Binding(get: { sch }, set: { school = $0 }), placeholder: "School", label: "School", icon: "cap", max: 80, focus: $focus)
          IconField(text: $contact, placeholder: "School email, or a link that shows you there", label: "School email or link", icon: "link", max: 200, caps: .never)
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
