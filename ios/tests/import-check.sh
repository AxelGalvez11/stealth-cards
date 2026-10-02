#!/bin/zsh
# Import cards on the iPhone (Data/ReadCards.swift) against the web's (design/build.mjs READ_CARDS_JS with web/rich.js, run in Chrome as the web app
# runs it): the same texts must give the same decks and the same cards, in the same order. The texts are the web's own samples, what is easy to get
# wrong (quotes, empty lines, a BOM, CRLF, tabs inside quotes, Anki's headers, cloze, HTML) and 1,200 made-up ones. Then the app's reading of text
# files: UTF-8, UTF-16 (with or without its mark), Latin-1 and Windows-1252, and a file that isn't text. Needs node, swiftc and Google Chrome;
# no simulator.
#   ios/tests/import-check.sh
H=${0:A:h}; REPO=${H:h:h}; W=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}/import; rm -rf $W; mkdir -p $W
swiftc -O -o $W/import $REPO/ios/Lucida/Data/Rich.swift $REPO/ios/Lucida/Data/ReadCards.swift $H/swift/import/main.swift 2>&1 | grep -E "error" && exit 1
node $H/js/import-js.mjs make $W/cases.json || exit 1
node $H/js/import-js.mjs $W/cases.json $W/js.json || exit 1
$W/import $W/cases.json $W/swift.json || exit 1
node -e "
const fs = require('fs'), q = JSON.parse(fs.readFileSync('$W/cases.json')), a = JSON.parse(fs.readFileSync('$W/js.json')), b = JSON.parse(fs.readFileSync('$W/swift.json'));
// Cards as objects with their keys in one order, so only what they hold is compared.
const norm = x => JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const bad = q.map((c, i) => [c, i]).filter(([, i]) => norm(a[i]) !== norm(b[i]));
const cards = a.reduce((n, decks) => n + decks.reduce((m, [, cs]) => m + cs.length, 0), 0);
for (const [c, i] of bad.slice(0, 5)) console.log('differs from the web: ' + c.name + '\n  text:  ' + JSON.stringify(c.text).slice(0, 300) + '\n  web:   ' + norm(a[i]).slice(0, 300) + '\n  phone: ' + norm(b[i]).slice(0, 300));
console.log('Import parity: ' + q.length + ' texts (' + cards + ' cards on the web), ' + bad.length + ' differ');
process.exit(bad.length ? 1 : 0);" || exit 1
$W/import decode
