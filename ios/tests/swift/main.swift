// The iPhone app's data ports on a library, written as the same JSON oracle-dump.mjs writes from the web app's own
// database: state.json now out.json. (Also: `tune state.json out.json` fits Tune to you and writes the fit.)
import Foundation

let args = CommandLine.arguments
func load(_ f: String) -> Library { try! JSONDecoder().decode(Library.self, from: try! Data(contentsOf: URL(fileURLWithPath: f))) }
func write(_ o: Any, _ f: String) { try! JSONSerialization.data(withJSONObject: o, options: []).write(to: URL(fileURLWithPath: f)) }
func num(_ x: Double?) -> Any { x.map { $0 as Any } ?? NSNull() }
func int(_ x: Int?) -> Any { x.map { $0 as Any } ?? NSNull() }

if args[1] == "fsrs" {
  // args: fsrs inputs.json out.json
  struct In: Decodable { var card: SRS, now: Double, opt: Opt }
  struct Opt: Decodable { var goal: Double, maxDays: Int, steps: [String], relearn: [String], w: [Double]? }
  let items = try! JSONDecoder().decode([In].self, from: try! Data(contentsOf: URL(fileURLWithPath: args[2])))
  let out = items.map { it -> [String: Any] in
    let pv = FSRS.preview(it.card, now: it.now, goal: it.opt.goal, maxDays: it.opt.maxDays, steps: it.opt.steps, relearn: it.opt.relearn, w: it.opt.w)
    var row: [String: Any] = [:]
    for g in 1...4 { let r = pv[g]!; row[String(g)] = ["state": r.state, "due": r.due, "s": r.s, "d": r.d, "reps": r.reps, "lapses": r.lapses, "last": r.last, "step": r.step, "days": r.days.map { $0 as Any } ?? NSNull(), "label": FSRS.waitLabel(r, it.now)] as [String: Any] }
    return row
  }
  write(out, args[3]); print("previewed", out.count)
  exit(0)
}
if args[1] == "tune" {
  let lib = load(args[2]), t0 = Date()
  let h = Tune.histories(lib)
  var last = 0.0
  let f = Tune.fit(h, w: FSRS.W) { p in last = p }
  write(["w": f.w, "loss": num(f.loss), "base": num(f.base), "gain": f.gain, "n": f.n, "reviews": f.reviews, "items": f.items, "seconds": Date().timeIntervalSince(t0), "progress": last] as [String: Any], args[3])
  print("tuned in", Date().timeIntervalSince(t0), "s")
  exit(0)
}

let lib = load(args[1]), now = Double(args[2])!
var E = Engine(S: lib); E.now = now
var dump: [String: Any] = ["now": now]

dump["decks"] = lib.decks.map { d -> [String: Any] in
  let s = E.stat(d)
  var exam: Any = NSNull()
  if let x = s.exam { exam = ["days": x.status.days, "day": x.day, "when": x.when, "line": x.line, "toReview": x.status.toReview, "total": x.status.total, "seen": x.status.seen, "learned": x.status.learned, "likely": x.status.likely] as [String: Any] }
  return ["id": d.id, "name": d.name, "due": s.due, "overdue": s.overdue, "fresh": s.fresh, "soon": int(s.soon), "total": s.total, "aiCount": s.aiCount, "ret": int(s.ret), "exam": exam]
}
let td = E.today, live = lib.decks.filter { !$0.paused }, fc = E.forecast(7, live)
var next: Any = NSNull()
if let n = td.next { next = ["day": n.day, "short": n.short, "n": n.n] as [String: Any] }
dump["today"] = ["due": td.due, "fresh": td.fresh, "minutes": td.minutes, "streak": td.streak, "best": td.best, "next": next, "week": td.week.map { $0.done },
                 "forecast": ["vals": fc.vals, "labels": fc.labels, "names": fc.names] as [String: Any]] as [String: Any]

// Stats (Overview): the last 30 days.
let st = E.streaks, logs = lib.logs.filter { $0.at >= now - 30 * DAY && Insights.isGrade($0) }
let f14 = E.forecast(14, lib.decks, long: true)
var counts: [Double: Int] = [:]
for l in lib.logs { counts[dayAt(l.at), default: 0] += 1 }
let monday = dayAt(now, -((weekday(now) + 6) % 7)), start = dayAt(monday, -37 * 7)
let vals = (0..<(38 * 7)).map { counts[dayAt(start, $0)] ?? 0 }, top = max(1, vals.max() ?? 1)
let heat = vals.map { $0 == 0 ? 0 : min(4, 1 + Int(3.999 * Double($0) / Double(top))) }
dump["stats"] = ["streak": st.streak, "best": st.best, "reviews": grouped(logs.count), "cards": grouped(lib.cards.count), "remembered": int(Engine.rememberedPct(logs)), "heat": heat,
                 "forecast14": ["vals": f14.vals, "labels": f14.labels, "tops": f14.tops ?? [], "names": f14.names] as [String: Any]] as [String: Any]

func ids(_ q: [QueueItem]) -> [String] { q.map { $0.card.id } }
var sets: [String: Any] = [:]
let tags = Array(Set(lib.cards.flatMap(\.tags))).filter { $0 != "Leech" }
// The web lists tags in the order they first show up; keys don't have an order in JSON, so it doesn't matter here.
for set in ["hard", "leech"] + tags.map({ "tag:" + $0 }) { sets[set] = ids(E.queue(nil, set: set)) }
dump["queue"] = ["all": ids(E.queue(nil)), "perDeck": Dictionary(uniqueKeysWithValues: lib.decks.map { ($0.id, ids(E.queue($0.id))) }), "sets": sets] as [String: Any]

var last: [String: Int] = [:]
for l in lib.logs { if let r = l.rating, r > 0 { last[l.cardId] = r } }
let deckOf = Dictionary(lib.decks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
dump["allCards"] = lib.cards.filter { !$0.pending }.reversed().map { c -> [String: Any] in
  ["id": c.id, "next": E.nextLabel(c), "level": E.difficulty(c, deck: deckOf[c.deckId], last: last[c.id]), "leech": Sched.isLeech(c, deckOf[c.deckId]), "paused": c.paused]
}
dump["workload"] = Dictionary(uniqueKeysWithValues: lib.decks.map { d in (d.id, Dictionary(uniqueKeysWithValues: [70, 80, 85, 90, 95, 97].map { (String($0), E.workload(d.id, $0)) })) })

var ins: [String: Any] = [:]
let enc = JSONEncoder()
for (name, days) in [("Week", 7), ("Month", 30), ("Year", 365)] {
  ins[name] = try! JSONSerialization.jsonObject(with: enc.encode(Insights.compute(lib, now: now, days: days)))
}
dump["insights"] = ins

let h = Tune.histories(lib)
let names = ["new", "learning", "review", "relearning"]
func cardDump(_ c: [Tune.Rev]) -> [[String: Any]] { c.map { ["g": $0.g, "was": names[Int($0.was)], "t": $0.t] } }
dump["histories"] = ["reviews": h.reviews, "items": h.items, "cards": h.data.count, "first": h.data.prefix(3).map(cardDump), "last": Array(h.data.suffix(2)).map(cardDump)] as [String: Any]
let tf = lib.settings.tune
dump["tuneInfo"] = ["reviews": h.reviews, "can": h.reviews >= Tune.MIN && h.items >= Tune.ITEMS, "on": tf?.on == true && !(tf?.w.isEmpty ?? true), "tuned": !(tf?.w.isEmpty ?? true), "n": tf.map { $0.reviews != 0 ? $0.reviews : $0.n } ?? 0] as [String: Any]

dump["deckPage"] = Dictionary(uniqueKeysWithValues: lib.decks.map { d -> (String, Any) in
  let s = E.stat(d)
  return (d.id, ["goal": d.goal, "exam": s.exam.map { $0.line as Any } ?? NSNull(), "examDay": d.exam ?? "", "leechAt": Sched.leechAt(d), "leechAct": Sched.leechAct(d), "forecast": E.forecast(7, [d]).vals] as [String: Any])
})
write(dump, args[3])
print("wrote", args[3])
