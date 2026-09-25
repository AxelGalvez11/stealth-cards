// Tags have colors (the boards' TAG_JS): known ones have their own, others get one from their letters.
import SwiftUI

enum Tags {
  static func color(_ g: String) -> RGBA {
    if let h = Generated.tagColors[g] { return RGBA(h) }
    // Each code point's first UTF-16 unit, summed, like the boards do.
    let sum = g.unicodeScalars.reduce(0) { a, s in a + Int(s.value > 0xFFFF ? 0xD800 + ((s.value - 0x10000) >> 10) : s.value) }
    return RGBA(Generated.tagPalette[sum % Generated.tagPalette.count])
  }
  /// Show the first few; with more than `max`, the last slot is "+N" (so never "+1").
  static func fit(_ tags: [String], _ max: Int) -> (shown: [String], more: Int) {
    let vis = tags.count > max ? Array(tags.prefix(max - 1)) : tags
    return (vis, tags.count - vis.count)
  }
}

/// A small tag chip (the card rows' cardTag: 22 tall, 11px).
struct TagChip: View {
  let label: String
  var height: CGFloat = 22
  var size: CGFloat = 11
  var pad: CGFloat = 9
  var body: some View {
    let c = Tags.color(label)
    Text(label).css(size, .semibold).lineLimit(1).fixedSize()
      .foregroundStyle(c.color)
      .padding(.horizontal, pad).frame(height: height)
      .background(Capsule().fill(c.opacity(0.149).color))
  }
}

/// "+N" after the tags that fit.
struct MoreChip: View {
  @Environment(\.theme) private var t
  let n: Int
  var body: some View {
    Text("+\(n)").css(11, .semibold).fixedSize().foregroundStyle(t.muted).padding(.horizontal, 8).frame(height: 22).background(Capsule().fill(t.surf))
  }
}

/// Tags you can take off (x), then "Add tag" (TAG_EDIT).
struct TagEditor: View {
  @Environment(\.theme) private var t
  let tags: [String]
  let remove: (String) -> Void
  let add: () -> Void
  var body: some View {
    FlowLayout(spacing: 6, lineSpacing: 6) {
      ForEach(tags, id: \.self) { g in
        let c = Tags.color(g)
        Button { remove(g) } label: {
          HStack(spacing: 6) {
            Text(g).css(13, .semibold).lineLimit(1)
            Icon("close", 10, 2.4).opacity(0.7)
          }
          .foregroundStyle(c.color)
          .padding(.leading, 12).padding(.trailing, 10).frame(height: 32)
          .background(Capsule().fill(c.opacity(0.149).color))
        }
        .buttonStyle(.press)
        .accessibilityLabel("Remove tag \(g)")
      }
      Button(action: add) {
        HStack(spacing: 6) { Icon("plus", 12, 2.4); Text("Add tag").css(13, .semibold) }
          .foregroundStyle(t.muted)
          .padding(.horizontal, 12).frame(height: 32)
          .overlay(Capsule().strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
      }
      .buttonStyle(.press)
    }
  }
}

/// Lays children out in rows, wrapping like CSS flex-wrap.
struct FlowLayout: Layout {
  var spacing: CGFloat = 6
  var lineSpacing: CGFloat = 6
  var alignment: HorizontalAlignment = .leading
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let rows = arrange(proposal.width ?? .infinity, subviews)
    let w = rows.map(\.width).max() ?? 0, h = rows.reduce(0) { $0 + $1.height } + CGFloat(max(0, rows.count - 1)) * lineSpacing
    return CGSize(width: proposal.width ?? w, height: h)
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for row in arrange(bounds.width, subviews) {
      var x = alignment == .center ? bounds.minX + (bounds.width - row.width) / 2 : alignment == .trailing ? bounds.maxX - row.width : bounds.minX
      for (i, size) in zip(row.items, row.sizes) {
        subviews[i].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: ProposedViewSize(size))
        x += size.width + spacing
      }
      y += row.height + lineSpacing
    }
  }
  private struct Row { var items: [Int] = []; var sizes: [CGSize] = []; var width: CGFloat = 0; var height: CGFloat = 0 }
  private func arrange(_ maxW: CGFloat, _ subviews: Subviews) -> [Row] {
    var rows: [Row] = [], cur = Row()
    for (i, v) in subviews.enumerated() {
      let s = v.sizeThatFits(.unspecified)
      let w = min(s.width, maxW)
      if !cur.items.isEmpty && cur.width + spacing + w > maxW { rows.append(cur); cur = Row() }
      cur.width += (cur.items.isEmpty ? 0 : spacing) + w
      cur.items.append(i); cur.sizes.append(CGSize(width: w, height: s.height)); cur.height = max(cur.height, s.height)
    }
    if !cur.items.isEmpty { rows.append(cur) }
    return rows
  }
}

/// The tag picker sheet: find a tag, tick it on or off, or make a new one (TAG_EDIT's phone sheet).
struct TagPicker: View {
  @Environment(\.theme) private var t
  let all: [String]
  let current: [String]
  let set: ([String]) -> Void
  let close: () -> Void
  @State private var q = ""
  var body: some View {
    let ql = q.trimmingCharacters(in: .whitespaces).lowercased()
    let lib = Array(Set(all + current)).sorted { $0.localizedCompare($1) == .orderedAscending }
    let shown = lib.filter { ql.isEmpty || $0.lowercased().contains(ql) }
    let canMake = !ql.isEmpty && !lib.contains { $0.lowercased() == ql }
    VStack(spacing: 12) {
      HStack {
        HStack(spacing: 8) {
          Text("Tags").css(18, .semibold)
          Text("\(current.count)").css(13, .medium, mono: true).foregroundStyle(t.muted)
        }
        Spacer()
        SheetDone(action: close)
      }
      SearchField(text: $q, placeholder: "Find or make a tag", height: 44)
      ScrollView(showsIndicators: false) {
        VStack(spacing: 0) {
          if canMake {
            Button { set(current + [q.trimmingCharacters(in: .whitespaces)]); q = "" } label: {
              HStack(spacing: 10) { Icon("plus", 13, 2.4); Text("Make “\(q.trimmingCharacters(in: .whitespaces))”").css(16, .semibold); Spacer() }
                .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 48)
                .background(RoundedRectangle(cornerRadius: 12).fill(t.surf))
            }
            .buttonStyle(.plain)
          }
          ForEach(shown, id: \.self) { g in
            let on = current.contains(g)
            Button { set(on ? current.filter { $0 != g } : current + [g]) } label: {
              HStack(spacing: 10) {
                Circle().fill(Tags.color(g).color).frame(width: 10, height: 10)
                Text(g).css(16).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                if on { Icon("check", 15, 2.4) }
              }
              .foregroundStyle(t.text)
              .padding(.horizontal, 4).frame(height: 48)
              .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
              .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(on ? .isSelected : [])
          }
        }
      }
    }
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, 34)
  }
}

/// The black "Done" pill on a sheet (36 tall).
struct SheetDone: View {
  @Environment(\.theme) private var t
  var label = "Done"
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(label).css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
    }
    .buttonStyle(.press)
  }
}

/// A gray search pill with a magnifier.
struct SearchField: View {
  @Environment(\.theme) private var t
  @Binding var text: String
  var placeholder: String
  var height: CGFloat = 40
  var body: some View {
    HStack(spacing: 8) {
      Icon("search", 14).foregroundStyle(t.muted)
      TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(t.muted))
        .font(.geist(height > 40 ? 16 : 14)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled()
    }
    .padding(.horizontal, 14).frame(height: height)
    .background(Capsule().fill(t.surf))
  }
}
