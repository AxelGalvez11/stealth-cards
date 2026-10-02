// Where the ideas of a mind map go: a port of web/diagram.js `layoutTree`, with the same numbers, so the app and the web draw the same map (ios/tests/diagram-check.sh checks them
// against node on trees of every shape). The topic is on the left, its main ideas in the next column, their details in the third; a box sits level with the middle of its children,
// and each branch has room for all its children, so nothing overlaps. Sizes are in points: a box's width comes from its longest line at a fixed width a letter (no font is measured).
// Only Foundation: it builds for the Mac too (the check), and has no idea of SwiftUI.
import Foundation

/// An idea of a mind map and the ideas under it (three levels: the topic, its main ideas, their details).
struct DiagramNode: Decodable, Equatable {
  var text = "", children: [DiagramNode] = []
  enum CodingKeys: String, CodingKey { case text, children }
  init(_ text: String, _ children: [DiagramNode] = []) { self.text = text; self.children = children }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    text = (try? c.decodeIfPresent(String.self, forKey: .text)) ?? ""
    children = (try? c.decodeIfPresent([DiagramNode].self, forKey: .children)) ?? []
  }
  /// How many ideas, this one included.
  var count: Int { 1 + children.reduce(0) { $0 + $1.count } }
}

struct DiagramLayout: Equatable {
  struct Node: Equatable, Identifiable {
    var id: Int, level: Int, branch: Int
    var x: Double, y: Double, w: Double, h: Double
    var lines: [String]
  }
  /// A link from one box's right side to the next one's left (a gentle S): its two ends.
  struct Link: Equatable { var from: Int, to: Int, x1: Double, y1: Double, x2: Double, y2: Double }
  var nodes: [Node] = [], links: [Link] = []
  var width = 0.0, height = 0.0

  static let lineH = 17.0, padX = 14.0, padY = 9.0, gapY = 10.0, gapX = 56.0, minW = 72.0, maxW = 200.0, margin = 16.0, rootPad = 4.0
  static let char: [Double] = [8.4, 7.3, 6.8]
  static let wrapAt = [16, 22, 24]

  /// Words broken into lines of at most `max` letters (a word longer than that is cut), as many lines as it takes. Lengths are UTF-16 units, as the web counts them.
  static func wrap(_ text: String, _ max: Int) -> [String] {
    var out: [String] = [], line = ""
    let words = text.split(whereSeparator: { $0.isWhitespace }).map(String.init)
    for word in words {
      var w = word as NSString
      while w.length > max {
        if !line.isEmpty { out.append(line); line = "" }
        out.append(w.substring(to: max)); w = w.substring(from: max) as NSString
      }
      let s = w as String
      if line.isEmpty { line = s }
      else if (line as NSString).length + 1 + w.length <= max { line += " " + s }
      else { out.append(line); line = s }
    }
    if !line.isEmpty { out.append(line) }
    return out.isEmpty ? [""] : out
  }

  private final class Box {
    let id: Int, level: Int, branch: Int, lines: [String]
    var w = 0.0, h = 0.0, x = 0.0, y = 0.0, span = 0.0
    var kids: [Box] = []
    weak var parent: Box?
    init(id: Int, level: Int, branch: Int, lines: [String], parent: Box?) { self.id = id; self.level = level; self.branch = branch; self.lines = lines; self.parent = parent }
  }

  init(_ tree: DiagramNode) {
    var boxes: [Box] = []
    func make(_ n: DiagramNode, _ level: Int, _ branch: Int, _ parent: Box?) -> Box {
      let k = min(level, 2), lines = DiagramLayout.wrap(n.text, DiagramLayout.wrapAt[k])
      let longest = lines.map { ($0 as NSString).length }.max() ?? 0, pad = level == 0 ? DiagramLayout.padX + DiagramLayout.rootPad : DiagramLayout.padX
      let b = Box(id: boxes.count, level: level, branch: branch, lines: lines, parent: parent)
      b.w = min(DiagramLayout.maxW, max(DiagramLayout.minW, (Double(longest) * DiagramLayout.char[k]).rounded(.up) + pad * 2))
      b.h = Double(lines.count) * DiagramLayout.lineH + DiagramLayout.padY * 2 + (level == 0 ? 4 : 0)
      boxes.append(b)
      for (i, c) in n.children.prefix(12).enumerated() { b.kids.append(make(c, level + 1, level == 0 ? i : branch, b)) }
      return b
    }
    let root = make(tree, 0, -1, nil)
    @discardableResult func span(_ n: Box) -> Double {
      let kids = n.kids.reduce(0.0) { $0 + span($1) } + DiagramLayout.gapY * Double(max(0, n.kids.count - 1))
      n.span = max(n.h, kids)
      return n.span
    }
    span(root)
    func place(_ n: Box, _ top: Double) {
      let kidsH = n.kids.reduce(0.0) { $0 + $1.span } + DiagramLayout.gapY * Double(max(0, n.kids.count - 1))
      if n.kids.isEmpty { n.y = top + (n.span - n.h) / 2; return }
      var y = top + (n.span - kidsH) / 2
      for k in n.kids { place(k, y); y += k.span + DiagramLayout.gapY }
      let first = n.kids[0], last = n.kids[n.kids.count - 1]
      n.y = (first.y + first.h / 2 + last.y + last.h / 2) / 2 - n.h / 2
    }
    place(root, DiagramLayout.margin)
    var colW: [Double] = []
    for n in boxes { while colW.count <= n.level { colW.append(0) }; colW[n.level] = max(colW[n.level], n.w) }
    var colX = [DiagramLayout.margin]
    if colW.count > 1 { for i in 1..<colW.count { colX.append(colX[i - 1] + colW[i - 1] + DiagramLayout.gapX) } }
    for n in boxes { n.x = colX[n.level] }
    for n in boxes {
      guard let p = n.parent else { continue }
      links.append(Link(from: p.id, to: n.id, x1: p.x + p.w, y1: p.y + p.h / 2, x2: n.x, y2: n.y + n.h / 2))
    }
    nodes = boxes.map { Node(id: $0.id, level: $0.level, branch: $0.branch, x: $0.x, y: $0.y, w: $0.w, h: $0.h, lines: $0.lines) }
    width = (colX[colX.count - 1] + colW[colW.count - 1] + DiagramLayout.margin).rounded(.up)
    height = (root.span + DiagramLayout.margin * 2).rounded(.up)
  }
}
