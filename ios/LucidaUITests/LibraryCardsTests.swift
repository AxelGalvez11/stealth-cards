// The owner's canvas comments of 2026-10-02 on the iPhone app, end to end (the web's Cards screen has no iPhone twin):
//   1  All cards ("remove the 4 grades"): no Difficulty control (All · New · Easy · Medium · Hard) any more; Tags, All decks and the search
//      still filter, together; each card's row still says how hard it is.
//   2  Stats → Weak spots: Hardest cards has Study these and no See all (it opened All cards on Hard); Keep forgetting's See them still opens
//      All cards on Keep forgetting.
//   3  Deck settings → General ("naming section should be moved below header section"): Name is right under the Header section, then
//      Background and Folder; decks have no tags any more ("remove 'tags' from decks, only cards have tags"); the name still renames the deck.
//   4  New deck: no Name, Tags or Grade with; the name is typed on the cover ("allow users to directly edit the name in the box above"); the
//      deck it makes has that name, no tags, and Settings' grading. Dark mode too.
//   5  The card editor's Add tag offers the tags your cards have, and not a deck's old ones; the deck page's card rows show no tag chips.
// Run it with ios/tools/e2e-libcards.sh (it starts a fresh server). It only runs when LUCIDA_LIBCARDS is set.
import XCTest

final class LibraryCardsTests: AppCase {
  override class var label: String { "LibraryCards" }
  override class var switchName: String { "LUCIDA_LIBCARDS" }

  /// A deck with tagged cards, and one card forgotten eight times (a card you keep forgetting, and the hardest).
  private func seed(_ who: String) -> String {
    name(who, "Lib Cards")
    let deck = act(who, "deck.add", ["name": "Cell Biology"])["id"] as? String ?? ""
    let cards: [(String, String, [String])] = [
      ("What does the electron transport chain pump?", "Protons", ["Energy", "Mitochondria"]),
      ("Which organelle packages proteins?", "Golgi apparatus", ["Organelles"]),
      ("What holds the cell's DNA?", "The nucleus", ["Organelles"]),
      ("What is the role of the ribosome?", "Builds proteins", ["Proteins"]),
      ("What does ATP stand for?", "Adenosine triphosphate", [])]
    var ids: [String] = []
    for c in cards { ids += (act(who, "card.add", ["deckId": deck, "kind": "basic", "front": c.0, "back": c.1, "tags": c.2])["ids"] as? [String]) ?? [] }
    // Easy (into review), then Forgot, eight times: eight forgets make it a card you keep forgetting.
    if let leech = ids.last { for _ in 0..<8 { act(who, "review.grade", ["cardId": leech, "rating": 4, "ms": 3000]); act(who, "review.grade", ["cardId": leech, "rating": 1, "ms": 3000]) } }
    return deck
  }
  private func gradeButtons(_ app: XCUIApplication) -> Int {
    app.buttons.matching(NSPredicate(format: "label MATCHES %@", "^(All|New|Easy|Medium|Hard), [0-9]+$")).count
  }

  // ---------- 1: All cards ----------
  func test1AllCards() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "lca" + run
    _ = seed(who)
    let app = launch(as: who, ["-open", "cards"])
    check(wait(buttonStarting(app, "Tags")) && buttonStarting(app, "All decks").exists, "All cards has Tags and All decks")
    check(wait(text(app, "5 cards")), "and lists every card (5 cards)")
    check(gradeButtons(app) == 0, "with no Difficulty control (no All · New · Easy · Medium · Hard)")
    check(!any(app, "Difficulty").exists, "and nothing called Difficulty")
    check(any(app, "Hard").exists && any(app, "New").exists, "each row still says how hard its card is (New, Hard)")
    check(wait(buttonStarting(app, "Keep forgetting")), "Keep forgetting is there, for the card forgotten eight times")
    snap("libcards-all")
    tap(buttonStarting(app, "Tags"), "Tags")
    check(wait(buttonStarting(app, "Organelles")) && buttonStarting(app, "Energy").exists, "Tags opens the menu of tags")
    tap(buttonStarting(app, "Organelles"), "Organelles")
    // (the menu stays open for more tags; a touch on the page's top, outside it, closes it: the tab bar at the bottom would change tabs)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
    check(gone(buttonStarting(app, "Energy"), 5), "a touch outside closes the menu")
    check(wait(text(app, "2 cards")) && button(app, "Stop filtering by Organelles").exists, "a tag narrows the list (Organelles: 2 cards), shown as a chip to take it off")
    let field = app.textFields["Search all cards"].firstMatch
    typeInto(field, "golgi")
    check(wait(text(app, "1 card")), "and the search narrows it with the tag (Organelles and “golgi”: 1 card)")
    check(gradeButtons(app) == 0, "still no Difficulty control")
    snap("libcards-filtered")
    tap(button(app, "Stop filtering by Organelles"), "the Organelles chip")
    typeInto(field, "", clear: 8)
    check(wait(text(app, "5 cards")), "taking them off brings every card back")
  }

  // ---------- 2: Stats ----------
  func test2StatsHardest() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "lcs" + run
    _ = seed(who)
    let app = launch(as: who, ["-open", "statsdeep", "-tab", "Weak spots"])
    check(wait(text(app, "Hardest cards"), 30), "Stats opens on Weak spots, with Hardest cards")
    scrollTo(app, button(app, "Study these"))
    check(wait(button(app, "Study these")), "Hardest cards has Study these")
    check(!button(app, "See all").exists, "and no See all (there is no Difficulty filter for it to open)")
    snap("libcards-stats")
    scrollTo(app, button(app, "See them"))
    check(wait(button(app, "See them")), "Cards you keep forgetting still has See them")
    tap(button(app, "See them"), "See them")
    let chip = buttonStarting(app, "Keep forgetting")
    check(wait(chip) && chip.isSelected, "which opens All cards on Keep forgetting")
    check(wait(text(app, "1 card")) && gradeButtons(app) == 0, "showing the card you keep forgetting, and no Difficulty control")
  }

  // ---------- 3: Deck settings ----------
  func test3DeckSettingsName() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "lcd" + run
    let deck = seed(who)
    act(who, "deck.update", ["id": deck, "patch": ["tags": ["MCAT", "Year 1"]]])   // (an older deck's tags, which the server keeps)
    func deckName() -> String? { (state(who)["decks"] as? [[String: Any]])?.first(where: { $0["id"] as? String == deck })?["name"] as? String }
    for dark in [false, true] {
      if dark { act(who, "settings.update", ["patch": ["look": "dark"]]) }
      let app = launch(as: who, ["-open", "decksettings"])
      check(wait(text(app, "Deck settings")), "Deck settings opens" + (dark ? " (dark)" : ""))
      let header = text(app, "Header"), name = text(app, "Name"), bg = text(app, "Background"), folder = text(app, "Folder"), pause = text(app, "Pause this deck")
      check(wait(header) && name.exists && bg.exists && folder.exists && pause.exists, "General has Header, Name, Background, Folder and Pause this deck")
      check(header.frame.minY < name.frame.minY && name.frame.minY < bg.frame.minY && bg.frame.minY < folder.frame.minY && folder.frame.minY < pause.frame.minY,
            "in that order: Name is right under the Header section" + (dark ? " (dark)" : ""))
      check(!text(app, "Tags").exists && !button(app, "Add tag").exists && !any(app, "MCAT").exists, "and the deck has no Tags (no section, no Add tag, not its old tags)")
      let field = app.textFields.matching(NSPredicate(format: "value == %@", "Cell Biology")).firstMatch
      check(wait(field) && field.frame.minY > name.frame.maxY - 1 && field.frame.maxY < bg.frame.minY, "with the deck's name in its field, between Name and Background")
      snap(dark ? "libcards-decksettings-dark" : "libcards-decksettings")
      if !dark {
        typeInto(field, " 2")
        check(eventually { deckName() == "Cell Biology 2" }, "typing there renames the deck")
        // (found by how its words start, which stays true while they change)
        typeInto(app.textFields.matching(NSPredicate(format: "value BEGINSWITH %@", "Cell Biology")).firstMatch, "", clear: 2)
        check(eventually { deckName() == "Cell Biology" }, "and back")
        check(((state(who)["decks"] as? [[String: Any]])?.first(where: { $0["id"] as? String == deck })?["tags"] as? [String]) == ["MCAT", "Year 1"], "the tags the server kept are left as they are")
      }
      app.terminate()
    }
  }

  // ---------- 4: New deck ----------
  func test4NewDeck() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "lcn" + run
    _ = seed(who)
    act(who, "settings.update", ["patch": ["grading": "binary"]])
    var app = launch(as: who, ["-open", "newdeck"])
    check(wait(button(app, "Create deck")), "New deck opens")
    let field = app.textFields["Deck name"].firstMatch
    check(wait(field), "its name is a field on the cover (Deck name)")
    check(!text(app, "Name").exists && !text(app, "Tags").exists && !button(app, "Add tag").exists && !text(app, "Grade with").exists && !button(app, "4 grades").exists,
          "with no Name, Tags or Grade with section")
    check(!text(app, "New cards a day").exists && !text(app, "Remember goal").exists, "no New cards a day or Remember goal (a new deck takes Settings')")
    check((field.placeholderValue ?? "") == "Untitled deck", "the field says Untitled deck until you type")
    check(app.keyboards.count == 0, "and waits for a tap (no keyboard over the sheet)")
    snap("libcards-newdeck")
    field.tap()
    field.typeText("Neuroscience " + run)
    let done = app.keyboards.buttons.matching(NSPredicate(format: "label IN {'Done','done','return','Return'}")).firstMatch
    if done.exists { done.tap(); Thread.sleep(forTimeInterval: 2.4) }
    snap("libcards-newdeck-typed")
    tap(button(app, "Create deck"), "Create deck")
    check(wait(text(app, "Neuroscience " + run)) && wait(text(app, "No cards yet")), "Create deck opens the deck, called what was typed on the cover")
    let made = (state(who)["decks"] as? [[String: Any]])?.first { $0["name"] as? String == "Neuroscience " + run }
    check(made != nil && (made?["tags"] as? [String] ?? ["?"]).isEmpty && made?["grading"] as? String == "binary", "with no tags, grading the way Settings says")
    app.terminate()
    act(who, "settings.update", ["patch": ["look": "dark"]])
    app = launch(as: who, ["-open", "newdeck"])
    check(wait(app.textFields["Deck name"].firstMatch), "New deck in dark mode")
    snap("libcards-newdeck-dark")
    app.terminate()
  }

  // ---------- 5: the card editor's Add tag ----------
  func test5CardTagsOnly() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "lct" + run
    let deck = seed(who)
    act(who, "deck.update", ["id": deck, "patch": ["tags": ["MCAT", "Year 1"]]])   // (an older deck's tags, which the server keeps)
    let app = launch(as: who, ["-open", "cards"])
    let row = buttonStarting(app, "Which organelle packages proteins?")
    tap(row, "a card's row")
    check(wait(button(app, "Add tag")), "the card editor opens, with its tags and Add tag")
    tap(button(app, "Add tag"), "Add tag")
    check(wait(app.textFields["Find or make a tag"].firstMatch), "Add tag opens its sheet")
    check(buttonStarting(app, "Energy").exists && buttonStarting(app, "Proteins").exists, "it offers the tags your cards have")
    check(!buttonStarting(app, "MCAT").exists && !buttonStarting(app, "Year 1").exists, "and not a deck's old tags (only cards have tags)")
    snap("libcards-cardtags")
    app.terminate()
    // The deck page's card rows: the card (its question, kind and when it's next), with no tag chips, like the web's.
    let deckPage = launch(as: who, ["-open", "deck:Cell Biology"])
    check(wait(any(deckPage, "Which organelle packages proteins?")), "the deck page lists its cards")
    check(!any(deckPage, "Energy").exists && !any(deckPage, "Organelles").exists && !any(deckPage, "Mitochondria").exists && !any(deckPage, "Proteins").exists,
          "and its rows show no tag chips")
    snap("libcards-deckrows")
    deckPage.terminate()
  }
}
