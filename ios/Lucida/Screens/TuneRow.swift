// iPhone · Settings → Studying → Tune to you (PhoneSettings, PhoneSettingsFree): Pro fits the schedule to your own reviews,
// once there are 400 of them. A switch turns it on (or back to the standard schedule); on Free, Go Pro takes its place.
import SwiftUI

struct TuneRow: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  var body: some View {
    let ti = store.tuneInfo(), n2 = { (n: Int) in grouped(n) }
    let ok = ti.pro && !ti.busy && (ti.can || ti.tuned)
    let sub = !ti.pro ? "Fit the schedule to your own reviews"
      : ti.busy ? "Tuning… \(Int(FSRS.jsRound(ti.progress * 100)))%"
      : !ti.error.isEmpty ? ti.error
      : ti.on ? "Tuned to your \(n2(ti.n)) reviews"
      : ti.tuned ? "Off: the standard schedule"
      : ti.can ? "Fit the schedule to your \(n2(ti.reviews)) reviews"
      : "After \(n2(ti.need)) reviews · you have \(n2(ti.reviews))"
    HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 8) { Text("Tune to you").css(16); if !ti.pro { ProBadge() } }
        Text(sub).css(12).foregroundStyle(t.muted)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if ti.pro {
        Toggle48(on: ti.on || ti.busy, enabled: ok, label: "Tune to you") { if ok { store.useTuned(!ti.on) } }
      } else {
        Button { nav.goPro() } label: {
          Text("Go Pro").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
      }
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 16).padding(.vertical, 8)
    .frame(minHeight: 52)
    .accessibilityElement(children: .contain)
  }
}
