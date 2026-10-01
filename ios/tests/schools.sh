#!/bin/zsh
# The school search in the iPhone app (Data/Schools.swift) against the web app's (web/school.js): the same few hundred queries (names'
# beginnings, other names, places, odd ones) must find the same schools in the same order. Needs node and swiftc; no simulator.
#   ios/tests/schools.sh
H=${0:A:h}; REPO=${H:h:h}; W=${TMPDIR:-/tmp}/lucida-ios-tests/schools; rm -rf $W; mkdir -p $W
swiftc -O -o $W/schools $REPO/ios/Lucida/Data/Schools.swift $H/swift/schools/main.swift 2>&1 | grep -E "error" && exit 1
node $H/js/schools-js.mjs make $W/queries.json
node $H/js/schools-js.mjs $W/queries.json $W/js.json
$W/schools $REPO/web/schools.json $W/queries.json $W/swift.json
node -e "
const fs = require('fs'), q = JSON.parse(fs.readFileSync('$W/queries.json')), a = JSON.parse(fs.readFileSync('$W/js.json')), b = JSON.parse(fs.readFileSync('$W/swift.json'));
const bad = q.map((x, i) => [x, i]).filter(([x, i]) => JSON.stringify(a[i]) !== JSON.stringify(b[i]));
console.log('schools: ' + q.length + ' queries, ' + bad.length + ' differ' + (bad.length ? ' (e.g. ' + JSON.stringify(bad.slice(0, 3).map(([x]) => x)) + ')' : ''));
process.exit(bad.length ? 1 : 0);"
