// What people say about where they study, in words (web/school.js; the lists are Generated.levels, years, and subjects): a person's
// level, optional year, and school, and a public deck's level, subject, and school.
import Foundation

enum SchoolWords {
  static func level(_ id: String) -> String { Generated.levels.first { $0.id == id }?.words ?? "" }
  static func year(_ id: String) -> String { Generated.years.first { $0.id == id }?.words ?? "" }
  static func subject(_ id: String) -> String { Generated.subjects.first { $0.id == id }?.words ?? "" }
  /// A person's line on their profile, from what they chose to show: "Stanford University · College · 3rd year".
  static func line(school: String, level: String, year: String) -> String {
    [school, Self.level(level), Self.year(year)].filter { !$0.isEmpty }.joined(separator: " · ")
  }
  /// A year's short words on its chip: 1st, 2nd, 3rd, 4th, 5th+.
  static func yearChip(_ id: String) -> String { id == "5" ? "5th+" : id + ["st", "nd", "rd", "th"][max(0, min(3, (Int(id) ?? 1) - 1))] }
}
